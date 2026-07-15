import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  buildRuntimeGraphObservationReport,
  parseIstanbulCoverage,
  parseLcovCoverage,
} from "../../packages/capability-model/dist/index.js";
import { validateRuntimeGraphObservationReport } from "../../packages/kernel-repo-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

function coverageEntry(path, counts) {
  return {
    path,
    statementMap: counts.statementMap ?? {},
    fnMap: counts.functionMap ?? {},
    branchMap: {},
    s: counts.statements ?? {},
    f: counts.functions ?? {},
    b: counts.branches ?? {},
  };
}

function parse(overrides = {}) {
  return parseIstanbulCoverage({
    coverage: {
      "src/service.ts": coverageEntry("src/service.ts", { statements: { 0: 2 } }),
    },
    repoRoot: "/repo",
    coveragePath: "coverage/coverage-final.json",
    coverageDigest: "a".repeat(64),
    testPath: "tests/service.test.ts",
    targetPaths: ["src/service.ts"],
    isolated: true,
    ...overrides,
  });
}

test("Istanbul coverage becomes one explicitly attributed execution observation", () => {
  const result = parse({
    coverage: {
      "/repo/src/service.ts": coverageEntry("/repo/src/service.ts", { statements: { 0: 2, 1: 0 } }),
      "src/helper.ts": coverageEntry("src/helper.ts", {
        functions: { 0: 1, 1: 0 },
        functionMap: {
          0: functionMapEntry("used", 2, 5),
          1: functionMapEntry("unused", 7, 9),
        },
      }),
      "src/branch.ts": coverageEntry("src/branch.ts", { branches: { 0: [0, 1] } }),
      "src/uncovered.ts": coverageEntry("src/uncovered.ts", { statements: { 0: 0 } }),
    },
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.observation.sourcePaths, ["src/branch.ts", "src/helper.ts", "src/service.ts"]);
  assert.equal(result.observation.testPath, "tests/service.test.ts");
  assert.equal(result.observation.source, "istanbul-coverage");
  assert.deepEqual(result.summary, {
    totalFiles: 4,
    observedFiles: 3,
    uncoveredFiles: 1,
    ignoredFiles: 0,
  });
  assert.equal(result.coverageSource.isolated, true);
  assert.deepEqual(result.coverageSource.targetPaths, ["src/service.ts"]);
  const helper = result.coverageSource.fileCoverage.find((file) => file.path === "src/helper.ts");
  assert.deepEqual(helper.functions, { total: 2, covered: 1 });
  assert.deepEqual(helper.functionRanges, [
    { name: "used", startLine: 2, endLine: 5, executionCount: 1 },
    { name: "unused", startLine: 7, endLine: 9, executionCount: 0 },
  ]);
});

test("coverage parser excludes outside paths, malformed entries, and the attributed test itself", () => {
  const result = parse({
    coverage: {
      "src/service.ts": coverageEntry("src/service.ts", { statements: { 0: 1 } }),
      "/outside/secret.ts": coverageEntry("/outside/secret.ts", { statements: { 0: 1 } }),
      "tests/service.test.ts": coverageEntry("tests/service.test.ts", { statements: { 0: 1 } }),
      "src/malformed.ts": { path: "src/malformed.ts" },
    },
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.observation.sourcePaths, ["src/service.ts"]);
  assert.equal(result.summary.ignoredFiles, 3);
  assert.equal(result.issues.some((issue) => issue.code === "istanbul.file.outside_repo"), true);
  assert.equal(result.issues.some((issue) => issue.code === "istanbul.file.counters_missing"), true);
});

test("coverage parser rejects missing or unsafe test attribution", () => {
  assert.equal(parse({ testPath: "../outside.test.ts" }).valid, false);
  assert.equal(parse({ testPath: "/repo/tests/service.test.ts" }).valid, false);
  assert.equal(parse({ targetPaths: ["../outside.ts"] }).valid, false);
  assert.equal(parse({ coverageDigest: "not-sha256" }).valid, false);
  assert.equal(parse({ coverage: [] }).valid, false);
});

test("zero-count coverage remains provenance without claiming observed execution", () => {
  const result = parse({
    coverage: {
      "src/service.ts": coverageEntry("src/service.ts", { statements: { 0: 0 } }),
    },
  });
  assert.equal(result.valid, true);
  assert.equal(result.observation, undefined);
  assert.equal(result.coverageSource.observedFiles, 0);
  assert.equal(result.issues.some((issue) => issue.code === "istanbul.coverage.no_observed_files"), true);
});

test("runtime observation report retains Istanbul source provenance", () => {
  const parsed = parse();
  const report = buildRuntimeGraphObservationReport({
    header: {
      artifactType: "RuntimeGraphObservationReport",
      artifactId: "runtime-observation-istanbul",
      schemaVersion: "0.1.0",
      generatedAt: "2026-07-11T00:00:00.000Z",
      subject: { repoId: "repo" },
      producer: { id: "test", version: "1.0.0" },
      inputRefs: [],
      provenance: { confidence: 0.85 },
    },
    executionObservations: [parsed.observation],
    coverageSources: [parsed.coverageSource],
  });

  assert.equal(validateRuntimeGraphObservationReport(report).ok, true);
  assert.equal(report.summary.executionObservations, 1);
  assert.equal(report.source.coverageSources[0].format, "istanbul");
  assert.equal(report.source.coverageSources[0].testPath, "tests/service.test.ts");
  assert.equal(report.edges[0].kind, "observed-execution");
});

test("LCOV becomes the same explicitly attributed coverage contract", () => {
  const result = parseLcovCoverage({
    lcov: [
      "TN:",
      "SF:/repo/src/service.ts",
      "FN:2,service",
      "FNDA:1,service",
      "DA:2,1",
      "DA:3,0",
      "BRDA:3,0,0,-",
      "BRDA:3,0,1,1",
      "end_of_record",
      "SF:/outside/private.ts",
      "DA:1,1",
      "end_of_record",
    ].join("\n"),
    repoRoot: "/repo",
    coveragePath: "coverage/lcov.info",
    coverageDigest: "b".repeat(64),
    testPath: "tests/service.test.ts",
    targetPaths: ["src/service.ts"],
    isolated: true,
  });

  assert.equal(result.valid, true);
  assert.equal(result.coverageSource.format, "lcov");
  assert.deepEqual(result.observation.sourcePaths, ["src/service.ts"]);
  assert.deepEqual(result.coverageSource.fileCoverage[0].statements, { total: 2, covered: 1 });
  assert.deepEqual(result.coverageSource.fileCoverage[0].functions, { total: 1, covered: 1 });
  assert.deepEqual(result.coverageSource.fileCoverage[0].branches, { total: 2, covered: 1 });
  assert.equal(result.summary.ignoredFiles, 1);

  const report = buildRuntimeGraphObservationReport({
    header: {
      artifactType: "RuntimeGraphObservationReport",
      artifactId: "runtime-observation-lcov",
      schemaVersion: "0.1.0",
      generatedAt: "2026-07-11T00:00:00.000Z",
      subject: { repoId: "repo" },
      producer: { id: "test", version: "1.0.0" },
      inputRefs: [],
    },
    executionObservations: [result.observation],
    coverageSources: [result.coverageSource],
  });
  assert.equal(validateRuntimeGraphObservationReport(report).ok, true);
});

test("runtime observation validation rejects inconsistent coverage source counts", () => {
  const parsed = parse();
  const report = buildRuntimeGraphObservationReport({
    header: {
      artifactType: "RuntimeGraphObservationReport",
      artifactId: "runtime-observation-invalid-source",
      schemaVersion: "0.1.0",
      generatedAt: "2026-07-11T00:00:00.000Z",
      subject: { repoId: "repo" },
      producer: { id: "test", version: "1.0.0" },
      inputRefs: [],
    },
    executionObservations: [parsed.observation],
    coverageSources: [parsed.coverageSource],
  });
  report.source.coverageSources[0].totalFiles = 0;
  assert.equal(validateRuntimeGraphObservationReport(report).ok, false);
});

test("runtime observation validation rejects duplicate coverage targets", () => {
  const parsed = parse();
  const report = buildRuntimeGraphObservationReport({
    header: {
      artifactType: "RuntimeGraphObservationReport",
      artifactId: "runtime-observation-duplicate-target",
      schemaVersion: "0.1.0",
      generatedAt: "2026-07-11T00:00:00.000Z",
      subject: { repoId: "repo" },
      producer: { id: "test", version: "1.0.0" },
      inputRefs: [],
    },
    executionObservations: [parsed.observation],
    coverageSources: [parsed.coverageSource],
  });
  report.source.coverageSources[0].targetPaths = ["src/service.ts", "src/service.ts"];
  assert.equal(validateRuntimeGraphObservationReport(report).ok, false);
});

test("runtime observation validation rejects malformed function coverage ranges", () => {
  const parsed = parse({
    coverage: {
      "src/service.ts": coverageEntry("src/service.ts", {
        functions: { 0: 1 },
        functionMap: { 0: functionMapEntry("service", 2, 5) },
      }),
    },
  });
  const report = buildRuntimeGraphObservationReport({
    header: {
      artifactType: "RuntimeGraphObservationReport",
      artifactId: "runtime-observation-invalid-function-range",
      schemaVersion: "0.1.0",
      generatedAt: "2026-07-11T00:00:00.000Z",
      subject: { repoId: "repo" },
      producer: { id: "test", version: "1.0.0" },
      inputRefs: [],
    },
    executionObservations: [parsed.observation],
    coverageSources: [parsed.coverageSource],
  });
  report.source.coverageSources[0].fileCoverage[0].functionRanges[0].endLine = 1;
  assert.equal(validateRuntimeGraphObservationReport(report).ok, false);
});

test("runtime observation validation requires VerificationRun provenance in header inputs", () => {
  const parsed = parse();
  const report = buildRuntimeGraphObservationReport({
    header: {
      artifactType: "RuntimeGraphObservationReport",
      artifactId: "runtime-observation-missing-run-input",
      schemaVersion: "0.1.0",
      generatedAt: "2026-07-11T00:00:00.000Z",
      subject: { repoId: "repo" },
      producer: { id: "test", version: "1.0.0" },
      inputRefs: [],
    },
    executionObservations: [parsed.observation],
    coverageSources: [parsed.coverageSource],
  });
  report.source.coverageSources[0] = {
    ...report.source.coverageSources[0],
    verificationRunRef: {
      type: "VerificationRun",
      id: "verification-run-1",
      schemaVersion: "0.1.0",
    },
    commandId: "command-1",
    commandStatus: "passed",
  };

  const validation = validateRuntimeGraphObservationReport(report);
  assert.equal(validation.ok, false);
  assert.equal(
    validation.issues.some((issue) => issue.message.includes("header.inputRefs")),
    true,
  );
});

test("CLI ingests a repository-local Istanbul report with explicit test attribution", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-istanbul-cli-"));
  try {
    await mkdir(join(root, "tests"), { recursive: true });
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(join(root, "coverage"), { recursive: true });
    await writeFile(join(root, "tests/service.test.ts"), "export {};\n", "utf8");
    await writeFile(join(root, "src/service.ts"), "export const value = 1;\n", "utf8");
    const coverage = {
      [join(root, "src/service.ts")]: coverageEntry(join(root, "src/service.ts"), { statements: { 0: 1 } }),
    };
    await writeFile(join(root, "coverage/coverage-final.json"), JSON.stringify(coverage), "utf8");

    runCli(root, ["init"]);
    const result = runCli(root, [
      "runtime", "graph", "observe",
      "--istanbul-coverage", "coverage/coverage-final.json",
      "--test-path", "tests/service.test.ts",
      "--source-path", "src/service.ts",
      "--json",
    ]);
    const output = JSON.parse(result.stdout);
    assert.equal(output.coverage.summary.observedFiles, 1);
    assert.equal(output.summary.executionObservations, 1);
    assert.equal(output.source.coverageSources[0].path, "coverage/coverage-final.json");

    const index = JSON.parse(await readFile(join(root, ".rekon/registry/artifacts.index.json"), "utf8"));
    const entry = index.find((candidate) => candidate.id === output.artifact.id);
    const report = JSON.parse(await readFile(join(root, entry.path), "utf8"));
    assert.equal(report.nodes.some((node) => node.label === "src/service.ts"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI ingests repository-local LCOV with explicit test attribution", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-lcov-cli-"));
  try {
    await mkdir(join(root, "tests"), { recursive: true });
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(join(root, "coverage"), { recursive: true });
    await writeFile(join(root, "tests/service.test.ts"), "export {};\n", "utf8");
    await writeFile(join(root, "src/service.ts"), "export const value = 1;\n", "utf8");
    await writeFile(join(root, "coverage/lcov.info"), `SF:${join(root, "src/service.ts")}\nDA:1,1\nend_of_record\n`, "utf8");
    runCli(root, ["init"]);
    const result = runCli(root, [
      "runtime", "graph", "observe",
      "--lcov-coverage", "coverage/lcov.info",
      "--test-path", "tests/service.test.ts",
      "--json",
    ]);
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.coverage.summary.observedFiles, 1);
    assert.equal(output.source.coverageSources[0].format, "lcov");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI requires paired attribution and refuses coverage files outside the repository", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-istanbul-safe-"));
  const outside = await mkdtemp(join(tmpdir(), "rekon-istanbul-outside-"));
  try {
    await mkdir(join(root, "tests"), { recursive: true });
    await writeFile(join(root, "tests/service.test.ts"), "export {};\n", "utf8");
    await writeFile(join(outside, "coverage-final.json"), "{}", "utf8");
    runCli(root, ["init"]);

    const missingAttribution = runCli(root, [
      "runtime", "graph", "observe",
      "--istanbul-coverage", "coverage/coverage-final.json",
      "--json",
    ], true);
    assert.notEqual(missingAttribution.status, 0);
    assert.match(missingAttribution.stderr, /requires a coverage report and --test-path together/);

    const outsideRead = runCli(root, [
      "runtime", "graph", "observe",
      "--istanbul-coverage", join(outside, "coverage-final.json"),
      "--test-path", "tests/service.test.ts",
      "--json",
    ], true);
    assert.notEqual(outsideRead.status, 0);
    assert.match(outsideRead.stderr, /refuses to read paths outside --root/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("verify run binds Istanbul coverage to the command that explicitly names the test", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-istanbul-verify-"));
  try {
    await writeCoverageVerificationFixture(root);
    runCli(root, ["init"]);

    const result = runCli(root, [
      "verify", "run",
      "--plan-file", "verification-plan.json",
      "--execute",
      "--istanbul-coverage", "coverage/coverage-final.json",
      "--test-path", "tests/service.test.ts",
      "--json",
    ]);
    const output = JSON.parse(result.stdout);

    assert.equal(output.verificationRun.status, "passed");
    assert.equal(output.runtimeObservation.artifact.type, "RuntimeGraphObservationReport");
    const coverageSource = output.runtimeObservation.source.coverageSources[0];
    assert.equal(coverageSource.verificationRunRef.id, output.artifact.id);
    assert.equal(coverageSource.commandId, output.verificationRun.commands[0].id);
    assert.equal(coverageSource.commandStatus, "passed");

    const index = JSON.parse(await readFile(join(root, ".rekon/registry/artifacts.index.json"), "utf8"));
    const reportEntry = index.find((candidate) => candidate.id === output.runtimeObservation.artifact.id);
    const report = JSON.parse(await readFile(join(root, reportEntry.path), "utf8"));
    assert.equal(
      report.header.inputRefs.some((ref) => ref.type === "VerificationRun" && ref.id === output.artifact.id),
      true,
    );
    assert.equal(validateRuntimeGraphObservationReport(report).ok, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("runtime graph observe can bind existing coverage to a completed VerificationRun", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-istanbul-existing-run-"));
  try {
    await writeCoverageVerificationFixture(root);
    runCli(root, ["init"]);
    const verification = JSON.parse(runCli(root, [
      "verify", "run",
      "--plan-file", "verification-plan.json",
      "--execute",
      "--json",
    ]).stdout);

    const observation = JSON.parse(runCli(root, [
      "runtime", "graph", "observe",
      "--istanbul-coverage", "coverage/coverage-final.json",
      "--test-path", "tests/service.test.ts",
      "--verification-run", verification.artifact.id,
      "--json",
    ]).stdout);
    const source = observation.source.coverageSources[0];
    assert.equal(source.verificationRunRef.id, verification.artifact.id);
    assert.equal(source.commandStatus, "passed");

    await writeFile(join(root, "tests/other.test.ts"), "export {};\n", "utf8");
    const mismatch = runCli(root, [
      "runtime", "graph", "observe",
      "--istanbul-coverage", "coverage/coverage-final.json",
      "--test-path", "tests/other.test.ts",
      "--verification-run", verification.artifact.id,
      "--json",
    ], true);
    assert.notEqual(mismatch.status, 0);
    assert.match(mismatch.stderr, /no passed or failed command explicitly named tests\/other\.test\.ts/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("verify run refuses coverage observation in dry-run mode", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-istanbul-dry-run-"));
  try {
    await writeCoverageVerificationFixture(root);
    runCli(root, ["init"]);
    const result = runCli(root, [
      "verify", "run",
      "--plan-file", "verification-plan.json",
      "--dry-run",
      "--istanbul-coverage", "coverage/coverage-final.json",
      "--test-path", "tests/service.test.ts",
      "--json",
    ], true);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /cannot observe Istanbul coverage during --dry-run/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Vitest coverage planner executes through VerificationRun and binds automatically", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-vitest-coverage-plan-"));
  try {
    await writeFrameworkCoverageFixture(root, "vitest");
    runCli(root, ["init"]);
    const plan = JSON.parse(runCli(root, [
      "verify", "coverage", "plan",
      "--framework", "vitest",
      "--test-path", "tests/service.test.ts",
      "--source-path", "src/service.ts",
      "--config", "vitest.config.ts",
      "--json",
    ]).stdout);
    assert.equal(plan.framework, "vitest");
    assert.equal(plan.provider, "v8");
    assert.deepEqual(plan.targetPaths, ["src/service.ts"]);
    assert.equal(plan.configPath, "vitest.config.ts");
    assert.match(plan.command, /--config vitest\.config\.ts/);
    assert.equal(plan.boundaries.executedCommands, false);
    assert.equal(plan.boundaries.installedPackages, false);
    assert.match(plan.coveragePath, /^\.rekon\/cache\/coverage\/vitest\//);

    const preview = JSON.parse(runCli(root, [
      "verify", "run",
      "--plan", plan.artifact.id,
      "--dry-run",
      "--json",
    ]).stdout);
    assert.equal(preview.executed, false);
    assert.equal(preview.runtimeObservation, undefined);

    const mismatched = runCli(root, [
      "verify", "run",
      "--plan", plan.artifact.id,
      "--execute",
      "--istanbul-coverage", "coverage/other.json",
      "--test-path", "tests/service.test.ts",
      "--json",
    ], true);
    assert.notEqual(mismatched.status, 0);
    assert.match(mismatched.stderr, /coverage flags do not match/);

    const execution = JSON.parse(runCli(root, [
      "verify", "run",
      "--plan", plan.artifact.id,
      "--execute",
      "--json",
    ]).stdout);
    assert.equal(execution.verificationRun.status, "passed");
    assert.equal(execution.runtimeObservation.source.coverageSources[0].verificationRunRef.id, execution.artifact.id);
    assert.equal(execution.runtimeObservation.source.coverageSources[0].testPath, "tests/service.test.ts");
    assert.equal(execution.runtimeObservation.source.coverageSources[0].isolated, true);
    assert.deepEqual(execution.runtimeObservation.source.coverageSources[0].targetPaths, ["src/service.ts"]);
    assert.equal(execution.runtimeObservation.source.coverageSources[0].fileCoverage[0].functionRanges[0].name, "service");

    const validation = JSON.parse(runCli(root, ["artifacts", "validate", "--json"]).stdout);
    assert.equal(validation.valid, true, JSON.stringify(validation.issues));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Jest coverage planner runs one exact path and binds its coverage", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-jest-coverage-plan-"));
  try {
    await writeFrameworkCoverageFixture(root, "jest");
    runCli(root, ["init"]);
    const plan = JSON.parse(runCli(root, [
      "verify", "coverage", "plan",
      "--framework", "jest",
      "--test-path", "tests/service.test.ts",
      "--source-path", "src/service.ts",
      "--provider", "v8",
      "--json",
    ]).stdout);
    assert.equal(plan.framework, "jest");
    assert.equal(plan.provider, "v8");
    assert.match(plan.command, /--runTestsByPath tests\/service\.test\.ts/);

    const execution = JSON.parse(runCli(root, [
      "verify", "run",
      "--plan", plan.artifact.id,
      "--execute",
      "--json",
    ]).stdout);
    assert.equal(execution.verificationRun.status, "passed");
    assert.equal(
      execution.runtimeObservation.coverage.summary.observedFiles,
      1,
      JSON.stringify(execution.runtimeObservation.coverage),
    );
    assert.equal(execution.runtimeObservation.source.coverageSources[0].commandStatus, "passed");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("coverage planner refuses missing runners and missing Vitest coverage providers", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-coverage-plan-missing-"));
  try {
    await mkdir(join(root, "tests"), { recursive: true });
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "tests/service.test.ts"), "export {};\n", "utf8");
    await writeFile(join(root, "src/service.ts"), "export {};\n", "utf8");
    runCli(root, ["init"]);
    const missingSourceTarget = runCli(root, [
      "verify", "coverage", "plan",
      "--framework", "vitest",
      "--test-path", "tests/service.test.ts",
      "--json",
    ], true);
    assert.notEqual(missingSourceTarget.status, 0);
    assert.match(missingSourceTarget.stderr, /requires at least one --source-path/);
    const missingRunner = runCli(root, [
      "verify", "coverage", "plan",
      "--framework", "vitest",
      "--test-path", "tests/service.test.ts",
      "--source-path", "src/service.ts",
      "--json",
    ], true);
    assert.notEqual(missingRunner.status, 0);
    assert.match(missingRunner.stderr, /requires vitest to be installed/);

    await writeFakeFrameworkPackage(root, "vitest", false);
    const missingProvider = runCli(root, [
      "verify", "coverage", "plan",
      "--framework", "vitest",
      "--test-path", "tests/service.test.ts",
      "--source-path", "src/service.ts",
      "--json",
    ], true);
    assert.notEqual(missingProvider.status, 0);
    assert.match(missingProvider.stderr, /requires @vitest\/coverage-v8 or @vitest\/coverage-istanbul/);

    const index = JSON.parse(await readFile(join(root, ".rekon/registry/artifacts.index.json"), "utf8"));
    assert.equal(index.some((entry) => entry.type === "VerificationPlan"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI help documents supported coverage formats and explicit test attribution", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /--istanbul-coverage <coverage-final\.json>/);
  assert.match(result.stdout, /--lcov-coverage <lcov\.info>/);
  assert.match(result.stdout, /--test-path <test-file>/);
  assert.match(result.stdout, /--verification-run <VerificationRun:id>/);
  assert.match(result.stdout, /verify coverage plan --framework vitest\|jest/);
  assert.match(result.stdout, /--source-path <source-file>/);
});

async function writeFrameworkCoverageFixture(root, framework) {
  await mkdir(join(root, "tests"), { recursive: true });
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "tests/service.test.ts"), "export {};\n", "utf8");
  await writeFile(join(root, "src/service.ts"), "export function service() { return 1; }\n", "utf8");
  if (framework === "vitest") {
    await writeFile(join(root, "vitest.config.ts"), "export default {};\n", "utf8");
  }
  await writeFakeFrameworkPackage(root, framework, true);
}

async function writeFakeFrameworkPackage(root, framework, includeProvider) {
  const packageRoot = join(root, "node_modules", framework);
  await mkdir(packageRoot, { recursive: true });
  const binaryPath = framework === "vitest" ? "vitest.mjs" : "bin/jest.js";
  await mkdir(join(packageRoot, "bin"), { recursive: true });
  await writeFile(join(packageRoot, "package.json"), `${JSON.stringify({
    name: framework,
    version: "1.0.0-test",
    bin: { [framework]: binaryPath },
  }, null, 2)}\n`, "utf8");
  await writeFile(
    join(packageRoot, binaryPath),
    `import { mkdir, writeFile } from "node:fs/promises";\n`
      + `import { resolve } from "node:path";\n`
      + `const args = process.argv.slice(2);\n`
      + `const testIndex = args.indexOf("--runTestsByPath");\n`
      + `const testPath = testIndex >= 0 ? args[testIndex + 1] : args[1];\n`
      + `if (testPath !== "tests/service.test.ts") process.exit(2);\n`
      + `const directoryArg = args.find((arg) => arg.startsWith("--coverage.reportsDirectory=") || arg.startsWith("--coverageDirectory="));\n`
      + `if (!directoryArg) process.exit(3);\n`
      + `const directory = directoryArg.slice(directoryArg.indexOf("=") + 1);\n`
      + `const source = resolve("src/service.ts");\n`
      + `await mkdir(directory, { recursive: true });\n`
      + `await writeFile(resolve(directory, "coverage-final.json"), JSON.stringify({\n`
      + `  [source]: { path: source, statementMap: {}, fnMap: { 0: { name: "service", decl: { start: { line: 1 }, end: { line: 1 } }, loc: { start: { line: 1 }, end: { line: 1 } } } }, branchMap: {}, s: { 0: 1 }, f: { 0: 1 }, b: {} },\n`
      + `}));\n`,
    "utf8",
  );
  if (framework === "vitest" && includeProvider) {
    const providerRoot = join(root, "node_modules", "@vitest", "coverage-v8");
    await mkdir(providerRoot, { recursive: true });
    await writeFile(join(providerRoot, "package.json"), `${JSON.stringify({
      name: "@vitest/coverage-v8",
      version: "1.0.0-test",
    }, null, 2)}\n`, "utf8");
  }
}

async function writeCoverageVerificationFixture(root) {
  await mkdir(join(root, "tests"), { recursive: true });
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "tests/service.test.ts"), "export {};\n", "utf8");
  await writeFile(join(root, "src/service.ts"), "export const value = 1;\n", "utf8");
  await writeFile(
    join(root, "write-coverage.mjs"),
    `import { mkdir, writeFile } from "node:fs/promises";\n`
      + `import { resolve } from "node:path";\n`
      + `const source = resolve("src/service.ts");\n`
      + `await mkdir("coverage", { recursive: true });\n`
      + `await writeFile("coverage/coverage-final.json", JSON.stringify({\n`
      + `  [source]: { path: source, statementMap: {}, fnMap: {}, branchMap: {}, s: { 0: 1 }, f: {}, b: {} },\n`
      + `}));\n`,
    "utf8",
  );
  await writeFile(
    join(root, "verification-plan.json"),
    `${JSON.stringify({
      header: {
        artifactType: "VerificationPlan",
        artifactId: "verification-plan-istanbul",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-11T00:00:00.000Z",
        subject: { repoId: root },
        producer: { id: "test", version: "1.0.0" },
        inputRefs: [],
      },
      commands: ["node write-coverage.mjs tests/service.test.ts"],
    }, null, 2)}\n`,
    "utf8",
  );
}

function runCli(cwd, args, allowFailure = false) {
  const result = spawnSync(process.execPath, [cliPath, "--root", cwd, ...args], {
    cwd,
    encoding: "utf8",
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`CLI failed: ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}

function functionMapEntry(name, startLine, endLine) {
  return {
    name,
    decl: { start: { line: startLine }, end: { line: startLine } },
    loc: { start: { line: startLine }, end: { line: endLine } },
  };
}
