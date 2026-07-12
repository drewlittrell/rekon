import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import policyCapability from "../../packages/capability-policy/dist/index.js";
import { createRuntime } from "../../packages/runtime/dist/index.js";

const logger = { info() {}, warn() {}, error() {} };
const COMMIT = "0123456789abcdef";

test("one repository lint failure corroborates source risk without promoting it", async () => {
  await withPolicyRuntime(async ({ runtime }) => {
    await writeEvidence(runtime, { commit: COMMIT, sourceQuality: true });
    await writeRun(runtime, {
      id: "lint-once",
      commit: COMMIT,
      command: "npm run lint",
      output: lintOutput(),
    });

    const { findings, assessments } = await evaluate(runtime);
    assert.equal(findings.findings.length, 0);
    assert.equal(assessments.assessments.length, 1);
    const risk = assessments.assessments[0];
    assert.equal(risk.ruleId, "typescript.typeEscape");
    assert.equal(risk.rootCauseKey, "typescript.typeEscape:src/unsafe.ts:as_any_assertion");
    assert.equal(risk.confidence.basis, "mixed");
    assert.equal(risk.confidence.verification, "corroborated");
    assert.equal(risk.details.reproducible, false);
    assert.equal(risk.evidence.some((ref) => ref.type === "VerificationRun"), true);
  });
});

test("the same location-specific failure on the current commit promotes source risk", async () => {
  await withPolicyRuntime(async ({ runtime }) => {
    await writeEvidence(runtime, { commit: COMMIT, sourceQuality: true });
    await writeRun(runtime, { id: "lint-first", commit: COMMIT, command: "npm run lint", output: lintOutput("12ms") });
    await writeRun(runtime, { id: "lint-second", commit: COMMIT, command: "npm run lint", output: lintOutput("48ms") });

    const { findings, assessments } = await evaluate(runtime);
    assert.equal(findings.findings.length, 1);
    const finding = findings.findings[0];
    assert.equal(finding.ruleId, "typescript.typeEscape");
    assert.equal(finding.rootCauseKey, "typescript.typeEscape:src/unsafe.ts:as_any_assertion");
    assert.equal(finding.details.reproducible, true);
    assert.equal(finding.details.runCount, 2);
    assert.equal(finding.evidence.filter((ref) => ref.type === "VerificationRun").length, 2);
    assert.equal(assessments.assessments.some((assessment) => assessment.rootCauseKey === finding.rootCauseKey), false);
  });
});

test("stale and environment-shaped failures remain assessments", async () => {
  await withPolicyRuntime(async ({ runtime }) => {
    await writeEvidence(runtime, { commit: COMMIT, sourceQuality: false });
    await writeRun(runtime, {
      id: "build-stale-1",
      commit: "older-commit",
      command: "npm run build",
      output: "src/index.ts:4:2 build failed",
    });
    await writeRun(runtime, {
      id: "build-stale-2",
      commit: "older-commit",
      command: "npm run build",
      output: "src/index.ts:4:2 build failed",
    });
    await writeRun(runtime, {
      id: "test-env-1",
      commit: COMMIT,
      command: "npm test",
      output: "Error: spawn test-runner ENOENT",
    });
    await writeRun(runtime, {
      id: "test-env-2",
      commit: COMMIT,
      command: "npm test",
      output: "Error: spawn test-runner ENOENT",
    });

    const { findings, assessments } = await evaluate(runtime);
    assert.equal(findings.findings.length, 0);
    assert.equal(assessments.assessments.length, 2);
    assert.equal(assessments.assessments.every((assessment) => assessment.ruleId === "repository.checkFailure"), true);
    assert.equal(assessments.assessments.every((assessment) => assessment.details.reproducible === false), true);
  });
});

test("a repeated generic repository test failure becomes one governed finding", async () => {
  await withPolicyRuntime(async ({ runtime }) => {
    await writeEvidence(runtime, { commit: COMMIT, sourceQuality: false });
    const output = "FAIL src/service.test.ts: expected 2, received 1";
    await writeRun(runtime, { id: "test-first", commit: COMMIT, command: "npm test", output });
    await writeRun(runtime, { id: "test-second", commit: COMMIT, command: "npm test", output });

    const { findings, assessments } = await evaluate(runtime);
    assert.equal(findings.findings.length, 1);
    assert.equal(findings.findings[0].ruleId, "repository.checkFailure");
    assert.equal(findings.findings[0].type, "repository_check_failure");
    assert.equal(findings.findings[0].details.checkCategory, "test");
    assert.equal(findings.findings[0].details.runCount, 2);
    assert.equal(assessments.assessments.length, 0);
  });
});

test("fresh runs after an evidence observation can promote when commit metadata is unavailable", async () => {
  await withPolicyRuntime(async ({ runtime }) => {
    await writeEvidence(runtime, { commit: undefined, sourceQuality: false });
    const output = "FAIL src/service.test.ts: expected 2, received 1";
    await writeRun(runtime, { id: "commitless-first", commit: undefined, command: "npm test", output });
    await writeRun(runtime, { id: "commitless-second", commit: undefined, command: "npm test", output });

    const { findings, assessments } = await evaluate(runtime);
    assert.equal(findings.findings.length, 1);
    assert.equal(findings.findings[0].ruleId, "repository.checkFailure");
    assert.deepEqual(findings.findings[0].details.coherence, ["observed_after_evidence"]);
    assert.equal(assessments.assessments.length, 0);
  });
});

test("structured diagnostics remain separate and stable across summary noise", async () => {
  await withPolicyRuntime(async ({ runtime }) => {
    await writeEvidence(runtime, {
      commit: COMMIT,
      sourceQuality: true,
      extraFiles: ["src/other.ts"],
    });
    await writeRun(runtime, {
      id: "multi-lint-first",
      commit: COMMIT,
      command: "npm run lint",
      output: multiLintOutput("12ms", "2 problems"),
    });
    await writeRun(runtime, {
      id: "multi-lint-second",
      commit: COMMIT,
      command: "npm run lint",
      output: multiLintOutput("49ms", "lint complete with 2 problems"),
    });

    const { findings, assessments } = await evaluate(runtime);
    assert.equal(findings.findings.length, 2);
    assert.deepEqual(findings.findings.map((finding) => finding.ruleId).sort(), [
      "repository.checkFailure",
      "typescript.typeEscape",
    ]);
    assert.equal(findings.findings.every((finding) => finding.details.runCount === 2), true);
    assert.equal(findings.findings.every((finding) => finding.details.diagnostic.parser === "eslint"), true);
    assert.equal(new Set(findings.findings.map((finding) => finding.rootCauseKey)).size, 2);
    assert.equal(assessments.assessments.length, 0);
  });
});

test("test failures carry graph-backed route, screen, and capability context without weakening promotion", async () => {
  await withPolicyRuntime(async ({ runtime }) => {
    await writeEvidence(runtime, {
      commit: COMMIT,
      sourceQuality: false,
      extraFiles: [
        "tests/user.test.ts",
        "src/user-service.ts",
        "app/api/users/route.ts",
        "app/users/page.tsx",
      ],
    });
    await writeApplicationGraph(runtime);
    const output = [
      "FAIL tests/user.test.ts > users returns a profile",
      "AssertionError: expected 500 to be 200",
      "    at tests/user.test.ts:10:4",
    ].join("\n");
    await writeRun(runtime, { id: "user-test-first", commit: COMMIT, command: "npm test", output });

    const first = await evaluate(runtime);
    assert.equal(first.findings.findings.length, 0);
    assert.equal(first.assessments.assessments.length, 1);
    assert.equal(first.assessments.assessments[0].details.relatedContext.routes[0].routePath, "/api/users");
    assert.deepEqual(first.assessments.assessments[0].details.relatedContext.observedFiles, ["src/user-service.ts"]);
    assert.equal(first.assessments.assessments[0].details.relatedContext.observedRoutes[0].routePath, "/api/users");
    assert.equal(first.assessments.assessments[0].details.reproducible, false);

    await writeRun(runtime, { id: "user-test-second", commit: COMMIT, command: "npm test", output });
    const second = await evaluate(runtime);
    assert.equal(second.findings.findings.length, 1);
    const finding = second.findings.findings[0];
    assert.deepEqual(finding.details.relatedContext.dependencyFiles, ["src/user-service.ts"]);
    assert.equal(finding.details.relatedContext.routes[0].routePath, "/api/users");
    assert.equal(finding.details.relatedContext.routes[0].relationship, "shared-dependency");
    assert.equal(finding.details.relatedContext.screens[0].routePath, "/users");
    assert.equal(finding.details.relatedContext.capabilities[0].capability, "users");
    assert.equal(finding.evidence.some((ref) => ref.type === "GraphSlice"), true);
  });
});

test("file-local check diagnostics carry bounded current import blast radius without changing promotion", async () => {
  await withPolicyRuntime(async ({ runtime }) => {
    const evidenceRef = await writeEvidence(runtime, {
      commit: COMMIT,
      sourceQuality: false,
      extraFiles: [
        "src/broken.ts",
        "src/direct.ts",
        "src/type-user.ts",
        "src/top.ts",
        "src/dependency.ts",
      ],
    });
    const graphRef = await writeImportGraph(runtime, evidenceRef);
    await writeRun(runtime, {
      id: "build-with-impact",
      commit: COMMIT,
      command: "npm run build",
      output: "src/broken.ts:14:6: ERROR: Could not resolve './missing.js'",
    });

    const { findings, assessments } = await evaluate(runtime);
    assert.equal(findings.findings.length, 0);
    assert.equal(assessments.assessments.length, 1);
    const risk = assessments.assessments[0];
    assert.equal(risk.ruleId, "repository.checkFailure");
    assert.equal(risk.details.reproducible, false);
    assert.deepEqual(risk.details.blastRadius.directDependents, [
      { path: "src/direct.ts", relationship: "value" },
      { path: "src/type-user.ts", relationship: "type" },
    ]);
    assert.deepEqual(risk.details.blastRadius.directDependencies, [
      { path: "src/dependency.ts", relationship: "value" },
    ]);
    assert.deepEqual(risk.details.blastRadius.transitiveDependents, [
      { path: "src/top.ts", distance: 2 },
    ]);
    assert.equal(risk.details.blastRadius.totalDirectDependentCount, 2);
    assert.equal(risk.details.blastRadius.totalTransitiveDependentCount, 1);
    assert.equal(risk.details.blastRadius.truncated, false);
    assert.equal(risk.evidence.some((ref) => ref.id === graphRef.id), true);
    assert.equal(risk.supportingSignals.some((signal) => signal.signalType === "import_blast_radius"), true);
  });
});

test("repository diagnostics ignore import graphs that do not cite current evidence", async () => {
  await withPolicyRuntime(async ({ runtime }) => {
    await writeEvidence(runtime, {
      commit: COMMIT,
      sourceQuality: false,
      extraFiles: ["src/broken.ts", "src/direct.ts", "src/dependency.ts"],
    });
    await writeImportGraph(runtime, { type: "EvidenceGraph", id: "older-evidence", schemaVersion: "0.1.0" });
    await writeRun(runtime, {
      id: "build-with-stale-graph",
      commit: COMMIT,
      command: "npm run build",
      output: "src/broken.ts:14:6: ERROR: Could not resolve './missing.js'",
    });

    const { assessments } = await evaluate(runtime);
    assert.equal(assessments.assessments.length, 1);
    assert.equal(assessments.assessments[0].details.blastRadius, undefined);
    assert.equal(
      assessments.assessments[0].supportingSignals.some((signal) => signal.signalType === "import_blast_radius"),
      false,
    );
  });
});

test("import blast radius retains complete counts while bounding path lists", async () => {
  await withPolicyRuntime(async ({ runtime }) => {
    const directFiles = Array.from({ length: 30 }, (_, index) => `src/direct-${index}.ts`);
    const transitiveFiles = Array.from({ length: 55 }, (_, index) => `src/transitive-${index}.ts`);
    const evidenceRef = await writeEvidence(runtime, {
      commit: COMMIT,
      sourceQuality: false,
      extraFiles: ["src/broken.ts", "src/dependency.ts", ...directFiles, ...transitiveFiles],
    });
    await writeImportGraph(runtime, evidenceRef, { directFiles, transitiveFiles });
    await writeRun(runtime, {
      id: "build-with-wide-impact",
      commit: COMMIT,
      command: "npm run build",
      output: "src/broken.ts:14:6: ERROR: Could not resolve './missing.js'",
    });

    const { assessments } = await evaluate(runtime);
    const blastRadius = assessments.assessments[0].details.blastRadius;
    assert.equal(blastRadius.directDependents.length, 25);
    assert.equal(blastRadius.transitiveDependents.length, 50);
    assert.equal(blastRadius.totalDirectDependentCount, 32);
    assert.equal(blastRadius.totalTransitiveDependentCount, 56);
    assert.equal(blastRadius.truncated, true);
  });
});

async function withPolicyRuntime(run) {
  const root = await mkdtemp(join(tmpdir(), "rekon-repository-checks-"));
  try {
    const runtime = await createRuntime({
      repoRoot: root,
      repoId: "check-fixture",
      capabilities: [policyCapability],
      logger,
    });
    await run({ root, runtime });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writeEvidence(runtime, { commit, sourceQuality, extraFiles = [] }) {
  const facts = [
    {
      kind: "file",
      subject: "src/unsafe.ts",
      value: { path: "src/unsafe.ts" },
      confidence: 1,
    },
    ...extraFiles.map((path) => ({
      kind: "file",
      subject: path,
      value: { path },
      confidence: 1,
    })),
  ];
  if (sourceQuality) {
    facts.push({
      kind: "typescript:source-quality",
      subject: "src/unsafe.ts:as_any_assertion:3:15",
      value: { path: "src/unsafe.ts", signal: "as_any_assertion", line: 3, column: 15 },
      confidence: 1,
    });
  }
  return runtime.artifacts.write({
    header: header("EvidenceGraph", "evidence-current", commit, []),
    facts,
  });
}

async function writeImportGraph(runtime, evidenceRef, { directFiles = [], transitiveFiles = [] } = {}) {
  const evidence = [{ source: "test", extractorVersion: "1.0.0", computedAt: "2026-07-10T00:00:00.000Z", confidence: 1 }];
  const extraEdges = [
    ...directFiles.map((source) => ({ source, target: "src/broken.ts", kind: "imports", metadata: { resolved: true }, evidence })),
    ...transitiveFiles.map((source) => ({ source, target: "src/direct.ts", kind: "imports", metadata: { resolved: true }, evidence })),
  ];
  return runtime.artifacts.write({
    header: header("GraphSlice", `import-graph-${evidenceRef.id}`, COMMIT, [evidenceRef]),
    producer: "@rekon/capability-graph",
    nodes: [
      "src/broken.ts",
      "src/direct.ts",
      "src/type-user.ts",
      "src/top.ts",
      "src/dependency.ts",
      ...directFiles,
      ...transitiveFiles,
    ].map((id) => ({ id, kind: "file" })),
    edges: [
      { source: "src/direct.ts", target: "src/broken.ts", kind: "imports", metadata: { resolved: true }, evidence },
      { source: "src/type-user.ts", target: "src/broken.ts", kind: "imports", metadata: { resolved: true, typeOnly: true }, evidence },
      { source: "src/top.ts", target: "src/direct.ts", kind: "imports", metadata: { resolved: true }, evidence },
      { source: "src/broken.ts", target: "src/dependency.ts", kind: "imports", metadata: { resolved: true }, evidence },
      ...extraEdges,
    ],
  });
}

async function writeRun(runtime, { id, commit, command, output }) {
  const planRef = { type: "VerificationPlan", id: `plan-${id}`, schemaVersion: "0.1.0" };
  await runtime.artifacts.write({
    header: header("VerificationRun", id, commit, [planRef]),
    status: "failed",
    verificationPlanRef: planRef,
    commands: [{
      id: "cmd-1",
      command,
      argv: command.split(" "),
      status: "failed",
      exitCode: 1,
      stdoutDigest: `stdout-${id}`,
      stderrDigest: `stderr-${id}`,
      stdoutExcerpt: { text: "", redacted: false, truncated: false },
      stderrExcerpt: { text: output, redacted: false, truncated: false },
    }],
    summary: { total: 1, passed: 0, failed: 1, skipped: 0, notRun: 0, timeout: 0, killed: 0 },
    runner: { id: "test", capabilityId: "@rekon/capability-verify" },
  });
}

async function writeApplicationGraph(runtime) {
  const evidence = [{ source: "test", extractorVersion: "1.0.0", computedAt: "2026-07-10T00:00:00.000Z", confidence: 1 }];
  await runtime.artifacts.write({
    header: header("GraphSlice", "application-graph-test", COMMIT, []),
    producer: "@rekon/capability-graph",
    nodes: [
      { id: "test:tests/user.test.ts", kind: "test", metadata: { path: "tests/user.test.ts" } },
      { id: "src/user-service.ts", kind: "file" },
      { id: "route:nextjs-app-router:/api/users", kind: "route", metadata: { path: "app/api/users/route.ts", routePath: "/api/users" } },
      { id: "screen:nextjs-app-router:/users", kind: "screen", metadata: { path: "app/users/page.tsx", routePath: "/users" } },
      { id: "capability:users", kind: "capability", metadata: { capability: "users" } },
    ],
    edges: [
      { source: "test:tests/user.test.ts", target: "src/user-service.ts", kind: "depends_on", weight: 1, metadata: { relationship: "test-import", distance: 1 }, evidence },
      { source: "test:tests/user.test.ts", target: "route:nextjs-app-router:/api/users", kind: "related_to", weight: 0.7, metadata: { relationship: "shared-dependency", sharedFiles: ["src/user-service.ts"] }, evidence },
      { source: "test:tests/user.test.ts", target: "screen:nextjs-app-router:/users", kind: "related_to", weight: 0.7, metadata: { relationship: "shared-dependency", sharedFiles: ["src/user-service.ts"] }, evidence },
      { source: "test:tests/user.test.ts", target: "capability:users", kind: "related_to", weight: 0.8, metadata: { relationship: "imported-capability-subject", sourcePaths: ["src/user-service.ts"] }, evidence },
      { source: "test:tests/user.test.ts", target: "src/user-service.ts", kind: "observed", weight: 0.9, metadata: { relationship: "observed-execution", observedCount: 1 }, evidence },
      { source: "test:tests/user.test.ts", target: "route:nextjs-app-router:/api/users", kind: "observed", weight: 0.9, metadata: { relationship: "observed-execution", observedCount: 1 }, evidence },
    ],
  });
}

async function evaluate(runtime) {
  const refs = await runtime.runEvaluate();
  return {
    findings: await runtime.artifacts.read(refs.find((ref) => ref.type === "FindingReport")),
    assessments: await runtime.artifacts.read(refs.find((ref) => ref.type === "AssessmentReport")),
  };
}

function header(type, id, commit, inputRefs) {
  return {
    artifactType: type,
    artifactId: id,
    schemaVersion: "0.1.0",
    generatedAt: "2026-07-10T00:00:00.000Z",
    subject: { repoId: "check-fixture", commit },
    producer: { id: "test", version: "1.0.0" },
    inputRefs,
    freshness: { status: "fresh" },
    provenance: { confidence: 1 },
  };
}

function lintOutput(duration = "12ms") {
  return [
    "src/unsafe.ts",
    "  3:15  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any",
    `lint failed in ${duration}`,
  ].join("\n");
}

function multiLintOutput(duration, summary) {
  return [
    "src/unsafe.ts",
    "  3:15  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any",
    "src/other.ts",
    "  8:2  error  'unused' is assigned but never used  @typescript-eslint/no-unused-vars",
    `${summary} in ${duration}`,
  ].join("\n");
}
