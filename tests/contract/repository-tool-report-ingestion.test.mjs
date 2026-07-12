import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { parseEslintJsonReport, parseJUnitReport } from "../../packages/capability-model/dist/index.js";
import { validateLintReport, validateTestReport } from "../../packages/kernel-repo-model/dist/index.js";

const workspaceRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(workspaceRoot, "packages/cli/dist/index.js");

test("JUnit XML normalization preserves test identity and redacts failure messages", () => {
  const parsed = parseJUnitReport({
    ...parserInput("TestReport", "reports/junit.xml"),
    xml: `<?xml version="1.0"?><testsuites><testsuite name="service">
      <testcase name="passes" classname="Service" file="tests/service.test.ts" line="4" time="0.012" />
      <testcase name="fails" classname="Service" file="tests/service.test.ts" line="8"><failure message="password=hunter2 expected true" /></testcase>
      <testcase name="skips" classname="Service"><skipped message="not supported" /></testcase>
    </testsuite></testsuites>`,
  });

  assert.equal(parsed.valid, true);
  assert.equal(validateTestReport(parsed.report).ok, true);
  assert.deepEqual(parsed.report.summary, { tests: 3, passed: 1, failures: 1, errors: 0, skipped: 1 });
  assert.equal(parsed.report.cases.find((entry) => entry.name === "passes").durationMs, 12);
  assert.equal(parsed.report.cases.find((entry) => entry.name === "fails").message.includes("hunter2"), false);
  assert.equal(JSON.stringify(parsed.report).includes("expected true"), true);

  const reordered = parseJUnitReport({
    ...parserInput("TestReport", "reports/junit.xml"),
    xml: `<testsuite name="service"><testcase name="new case" /><testcase name="fails" classname="Service" file="tests/service.test.ts" line="8"><failure message="wording changed" /></testcase></testsuite>`,
  });
  assert.equal(
    reordered.report.cases.find((entry) => entry.name === "fails").id,
    parsed.report.cases.find((entry) => entry.name === "fails").id,
  );
});

test("JUnit XML rejects malformed input and omits outside-repository paths", () => {
  const malformed = parseJUnitReport({ ...parserInput("TestReport", "reports/junit.xml"), xml: "<testsuite><testcase></testsuite>" });
  assert.equal(malformed.valid, false);
  assert.equal(malformed.issues[0].code, "junit.xml_invalid");

  const outside = parseJUnitReport({
    ...parserInput("TestReport", "reports/junit.xml"),
    xml: `<testsuite name="suite"><testcase name="case" file="../private.test.ts"><failure message="failed" /></testcase></testsuite>`,
  });
  assert.equal(outside.valid, true);
  assert.equal(outside.report.status.complete, false);
  assert.equal(outside.report.cases[0].file, undefined);
});

test("ESLint JSON normalization retains native diagnostics without raw payload fields", () => {
  const report = [{
    filePath: "/repo/src/index.ts",
    messages: [{ ruleId: "no-eval", severity: 2, message: "api_key=secret-value eval is forbidden", line: 3, column: 2, endLine: 3, endColumn: 8, suggestions: [{ desc: "raw-secret" }] }],
    suppressedMessages: [{ ruleId: "no-console", message: "suppressed raw-secret" }],
    source: "const rawSecret = 'raw-secret';",
  }];
  const first = parseEslintJsonReport({ ...parserInput("LintReport", "reports/eslint.json"), report });
  const second = parseEslintJsonReport({ ...parserInput("LintReport", "reports/eslint.json"), report: structuredClone(report) });

  assert.equal(first.valid, true);
  assert.equal(validateLintReport(first.report).ok, true);
  assert.deepEqual(first.report.summary, { files: 1, diagnostics: 1, errors: 1, warnings: 0, suppressed: 1 });
  assert.equal(first.report.diagnostics[0].message.includes("secret-value"), false);
  assert.equal(first.report.diagnostics[0].id, second.report.diagnostics[0].id);
  assert.equal(JSON.stringify(first.report).includes("suggestions"), false);
  assert.equal(JSON.stringify(first.report).includes("raw-secret"), false);
});

test("CLI ingests structured reports and requires repeated current evidence before promotion", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-tool-reports-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(join(root, "tests"), { recursive: true });
    await mkdir(join(root, "reports"), { recursive: true });
    await writeFile(join(root, "package.json"), JSON.stringify({ name: "tool-report-fixture", type: "module" }));
    await writeFile(join(root, "src/index.ts"), "export const value = 1;\n");
    await writeFile(join(root, "tests/index.test.ts"), "export {};\n");
    const eslint = [{ filePath: join(root, "src/index.ts"), messages: [{ ruleId: "no-eval", severity: 2, message: "Unexpected eval.", line: 1, column: 1 }] }];
    await writeFile(join(root, "reports/eslint-1.json"), JSON.stringify(eslint));
    await writeFile(join(root, "reports/eslint-2.json"), JSON.stringify([{ ...eslint[0], usedDeprecatedRules: ["changed-source-digest"] }]));
    await writeFile(join(root, "reports/junit.xml"), `<testsuite name="index"><testcase name="fails" file="tests/index.test.ts" line="1"><failure message="Expected one value" /></testcase></testsuite>`);

    runCli(root, ["init"]);
    runCli(root, ["observe", "--json"]);
    const junit = runCli(root, ["checks", "ingest", "--junit", "reports/junit.xml", "--json"]);
    assert.equal(junit.status, 0, junit.stderr);
    assert.equal(JSON.parse(junit.stdout).summary.failures, 1);
    const lint = runCli(root, ["checks", "ingest", "--eslint-json", "reports/eslint-1.json", "--json"]);
    assert.equal(lint.status, 0, lint.stderr);
    runCli(root, ["evaluate", "--json"]);
    let index = JSON.parse(await readFile(join(root, ".rekon/registry/artifacts.index.json"), "utf8"));
    let assessments = await latestArtifact(root, index, "AssessmentReport");
    let findings = await latestArtifact(root, index, "FindingReport");
    assert.equal(assessments.assessments.some((entry) => entry.details?.diagnostic?.parser === "junit"), true);
    assert.equal(assessments.assessments.some((entry) => entry.details?.diagnostic?.parser === "eslint-json"), true);
    assert.equal(findings.findings.some((entry) => entry.details?.diagnostic?.parser === "eslint-json"), false);

    runCli(root, ["checks", "ingest", "--eslint-json", "reports/eslint-2.json", "--json"]);
    runCli(root, ["evaluate", "--json"]);
    index = JSON.parse(await readFile(join(root, ".rekon/registry/artifacts.index.json"), "utf8"));
    assessments = await latestArtifact(root, index, "AssessmentReport");
    findings = await latestArtifact(root, index, "FindingReport");
    assert.equal(findings.findings.some((entry) => entry.details?.diagnostic?.parser === "eslint-json"), true);
    assert.equal(assessments.assessments.some((entry) => entry.details?.diagnostic?.parser === "eslint-json"), false);

    const validation = runCli(root, ["artifacts", "validate", "--json"]);
    assert.equal(validation.status, 0, validation.stderr);
    assert.equal(JSON.parse(validation.stdout).valid, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI help documents structured report ingestion", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /checks ingest \(--junit <report\.xml> \| --eslint-json <report\.json>\)/);
});

function parserInput(artifactType, sourcePath) {
  return {
    repoRoot: "/repo",
    sourcePath,
    sourceDigest: "a".repeat(64),
    header: {
      artifactType,
      artifactId: `${artifactType.toLowerCase()}-test`,
      schemaVersion: "0.1.0",
      generatedAt: "2026-07-11T00:00:00.000Z",
      subject: { repoId: "repo" },
      producer: { id: "test", version: "1.0.0" },
      inputRefs: [{ type: "EvidenceGraph", id: "evidence", schemaVersion: "0.1.0" }],
      freshness: { status: "fresh" },
      provenance: { confidence: 1 },
    },
  };
}

function runCli(root, args) {
  return spawnSync(process.execPath, [cliPath, ...args, "--root", root], { cwd: workspaceRoot, encoding: "utf8" });
}

async function latestArtifact(root, index, type) {
  const entries = index.filter((entry) => entry.type === type);
  assert.ok(entries.length > 0, `missing ${type}`);
  const latest = entries.sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
  return JSON.parse(await readFile(join(root, latest.path), "utf8"));
}
