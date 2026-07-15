import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { jsTsProvider } from "../../packages/capability-js-ts/dist/index.js";
import {
  FUNCTION_COMPLEXITY_RULE_ID,
  evaluateFunctionComplexity,
  loadFreshComplexityCoverage,
} from "../../packages/capability-policy/dist/index.js";
import policyCapability from "../../packages/capability-policy/dist/index.js";
import { createRuntime } from "../../packages/runtime/dist/index.js";

const evidenceRef = { type: "EvidenceGraph", id: "complexity-evidence", schemaVersion: "0.1.0" };
const coverageReportRef = { type: "RuntimeGraphObservationReport", id: "coverage-report", schemaVersion: "0.1.0" };
const verificationRunRef = { type: "VerificationRun", id: "verification-run", schemaVersion: "0.1.0" };
const logger = { info() {}, warn() {}, error() {} };

function metricsFact(path, functionId, metrics) {
  return {
    kind: "typescript:function-metrics",
    subject: `${path}:${functionId}`,
    value: { path, functionId, name: functionId, ...metrics },
  };
}

test("requires multiple complexity signals and excludes non-production paths", () => {
  const assessments = evaluateFunctionComplexity([
    metricsFact("src/large.ts", "large", { lines: 200, statements: 100, cyclomatic: 2, maxNesting: 1, fanOut: 2 }),
    metricsFact("src/branchy.ts", "branchy", { lines: 60, statements: 40, cyclomatic: 22, maxNesting: 2, fanOut: 3 }),
    metricsFact("src/hotspot.ts", "hotspot", { lines: 90, statements: 55, cyclomatic: 24, maxNesting: 6, fanOut: 18, line: 5, endLine: 94 }),
    metricsFact("src/hotspot.ts", "hotspot", { lines: 88, statements: 52, cyclomatic: 23, maxNesting: 6, fanOut: 16, line: 5, endLine: 92 }),
    metricsFact("tests/hotspot.test.ts", "testHotspot", { lines: 200, statements: 100, cyclomatic: 30, maxNesting: 8, fanOut: 20 }),
    { kind: "content_signal", subject: "src/generated.ts", value: { signal: "generatedFile" } },
    metricsFact("src/generated.ts", "generatedHotspot", { lines: 200, statements: 100, cyclomatic: 30, maxNesting: 8, fanOut: 20 }),
  ], evidenceRef);

  assert.equal(assessments.length, 1);
  assert.equal(assessments[0].ruleId, FUNCTION_COMPLEXITY_RULE_ID);
  assert.equal(assessments[0].kind, "risk");
  assert.equal(assessments[0].impact, "high");
  assert.deepEqual(assessments[0].details.exceededSignals, ["cyclomatic", "maxNesting", "fanOut"]);
  assert.equal(assessments[0].rootCauseKey, "typescript.functionComplexity:src/hotspot.ts:hotspot");
});

test("keeps a two-signal hotspot at medium impact", () => {
  const [assessment] = evaluateFunctionComplexity([
    metricsFact("src/orchestrator.ts", "orchestrate", {
      lines: 70,
      statements: 45,
      cyclomatic: 24,
      maxNesting: 3,
      fanOut: 18,
    }),
  ], evidenceRef);

  assert.equal(assessment.impact, "medium");
  assert.deepEqual(assessment.details.exceededSignals, ["cyclomatic", "fanOut"]);
});

test("distinguishes passing, failing, and bounded zero-execution coverage", () => {
  const fact = metricsFact("src/hotspot.ts", "hotspot", {
    lines: 90,
    statements: 55,
    cyclomatic: 24,
    maxNesting: 6,
    fanOut: 18,
    line: 5,
    endLine: 94,
  });
  const run = (testPath, commandStatus, executionCount, targetPaths = []) => ({
    reportRef: { ...coverageReportRef, id: `coverage-${testPath}` },
    verificationRunRef: { ...verificationRunRef, id: `run-${testPath}` },
    testPath,
    targetPaths,
    commandStatus,
    generatedAt: "2026-07-11T00:01:00.000Z",
    files: [{
      path: "src/hotspot.ts",
      functions: [{ name: "hotspot", startLine: 5, endLine: 94, executionCount }],
    }],
  });

  const [passing] = evaluateFunctionComplexity([fact], evidenceRef, [run("tests/passing.test.ts", "passed", 2)]);
  assert.equal(passing.details.coverage.status, "observed-passing");
  assert.equal(passing.evidence.length, 3);
  assert.match(passing.description, /does not prove assertion coverage/);

  const [failing] = evaluateFunctionComplexity([fact], evidenceRef, [run("tests/failing.test.ts", "failed", 1)]);
  assert.equal(failing.details.coverage.status, "observed-failing");
  assert.match(failing.description, /only during a failed test/);

  const [notObserved] = evaluateFunctionComplexity([fact], evidenceRef, [run("tests/other.test.ts", "passed", 0)]);
  assert.equal(notObserved.details.coverage.status, "not-observed");
  assert.match(notObserved.description, /not a global coverage claim/);
  assert.equal(notObserved.impact, "high");
  assert.equal(notObserved.rootCauseKey, passing.rootCauseKey);

  const [targetGap] = evaluateFunctionComplexity([
    fact,
  ], evidenceRef, [run("tests/targeted.test.ts", "passed", 0, ["src/hotspot.ts"])]);
  assert.equal(targetGap.details.coverage.status, "target-not-observed");
  assert.equal(targetGap.details.coverage.observations[0].targetDeclared, true);
  assert.match(targetGap.description, /explicitly targeted this source file/);
  assert.match(targetGap.suggestedAction, /Fix the declared isolated test target/);
  assert.equal(targetGap.rootCauseKey, passing.rootCauseKey);

  const [unrelatedZero] = evaluateFunctionComplexity([
    fact,
  ], evidenceRef, [run("tests/unrelated.test.ts", "passed", 0, ["src/other.ts"])]);
  assert.equal(unrelatedZero.details.coverage.status, "not-observed");
  assert.equal(unrelatedZero.details.coverage.observations[0].targetDeclared, false);
});

test("loads only fresh isolated coverage and keeps the latest run per test", async () => {
  const evidenceHeader = {
    artifactType: "EvidenceGraph",
    artifactId: "complexity-evidence",
    schemaVersion: "0.1.0",
    generatedAt: "2026-07-11T00:00:00.000Z",
    subject: { repoId: "fixture", commit: "current" },
    producer: { id: "test", version: "1.0.0" },
    inputRefs: [],
  };
  const refs = [
    { ...coverageReportRef, id: "stale" },
    { ...coverageReportRef, id: "manual" },
    { ...coverageReportRef, id: "fresh-old" },
    { ...coverageReportRef, id: "fresh-new" },
    { ...coverageReportRef, id: "fresh-empty" },
    { ...coverageReportRef, id: "wrong-commit" },
  ];
  const report = (generatedAt, isolated, count, commit) => ({
    header: { generatedAt, subject: commit ? { commit } : {} },
    source: {
      coverageSources: [{
        isolated,
        testPath: "tests/hotspot.test.ts",
        targetPaths: ["src/hotspot.ts"],
        commandStatus: "passed",
        verificationRunRef,
        fileCoverage: count === undefined ? [] : [{
          path: "src/hotspot.ts",
          functionRanges: [{ name: "hotspot", startLine: 5, endLine: 94, executionCount: count }],
        }],
      }],
    },
  });
  const reports = new Map([
    ["stale", report("2026-07-10T23:59:00.000Z", true, 9)],
    ["manual", report("2026-07-11T00:04:00.000Z", false, 8)],
    ["fresh-old", report("2026-07-11T00:01:00.000Z", true, 1)],
    ["fresh-new", report("2026-07-11T00:02:00.000Z", true, 2)],
    ["fresh-empty", report("2026-07-11T00:03:00.000Z", true, undefined)],
    ["wrong-commit", report("2026-07-11T00:05:00.000Z", true, 10, "other")],
  ]);
  const runs = await loadFreshComplexityCoverage({
    async list() { return refs; },
    async read(ref) { return reports.get(ref.id); },
  }, evidenceHeader);

  assert.equal(runs.length, 1);
  assert.equal(runs[0].reportRef.id, "fresh-empty");
  assert.deepEqual(runs[0].targetPaths, ["src/hotspot.ts"]);
  assert.deepEqual(runs[0].files, []);
});

test("JS/TS evidence produces one complexity risk and no finding", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-function-complexity-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    const nestedOpen = Array.from({ length: 6 }, (_, index) => `${"  ".repeat(index + 1)}if (input > ${index}) {`);
    const nestedClose = Array.from({ length: 6 }, (_, index) => `${"  ".repeat(6 - index)}}`);
    const branches = Array.from({ length: 20 }, (_, index) => `  if (input > ${index + 10}) call${index}();`);
    await writeFile(join(root, "src", "hotspot.ts"), [
      "export function inspect(input: number) {",
      ...nestedOpen,
      "              nested();",
      ...nestedClose,
      ...branches,
      "}",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const metricFacts = facts.filter((fact) => fact.kind === "typescript:function-metrics");
    assert.equal(metricFacts.length, 1);
    assert.equal(metricFacts[0].value.functionId, "inspect");

    const runtime = await createRuntime({ repoRoot: root, repoId: "complexity-fixture", capabilities: [policyCapability], logger });
    await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "complexity-evidence",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-11T00:00:00.000Z",
        subject: { repoId: "complexity-fixture" },
        producer: { id: "@rekon/capability-js-ts", version: "1.0.0" },
        inputRefs: [],
        freshness: { status: "fresh" },
        provenance: { confidence: 1 },
      },
      facts,
    });
    const runRef = await runtime.artifacts.write({
      header: {
        artifactType: "VerificationRun",
        artifactId: "complexity-verification-run",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-11T00:01:00.000Z",
        subject: { repoId: "complexity-fixture" },
        producer: { id: "test", version: "1.0.0" },
        inputRefs: [],
      },
    });
    const metric = metricFacts[0].value;
    const observationRef = await runtime.artifacts.write({
      header: {
        artifactType: "RuntimeGraphObservationReport",
        artifactId: "complexity-coverage-report",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-11T00:02:00.000Z",
        subject: { repoId: "complexity-fixture" },
        producer: { id: "test", version: "1.0.0" },
        inputRefs: [runRef],
      },
      source: {
        coverageSources: [{
          format: "istanbul",
          path: ".rekon/cache/coverage/coverage-final.json",
          digest: "a".repeat(64),
          testPath: "tests/hotspot.test.ts",
          targetPaths: ["src/hotspot.ts"],
          isolated: true,
          totalFiles: 1,
          observedFiles: 1,
          ignoredFiles: 0,
          verificationRunRef: runRef,
          commandId: "test-command",
          commandStatus: "passed",
          fileCoverage: [{
            path: "src/hotspot.ts",
            statements: { total: 1, covered: 1 },
            functions: { total: 1, covered: 1 },
            branches: { total: 0, covered: 0 },
            functionRanges: [{
              name: "inspect",
              startLine: metric.line,
              endLine: metric.endLine,
              executionCount: 1,
            }],
          }],
        }],
      },
      summary: { observedNodes: 0, observedEdges: 0, handoffEvents: 0, ignoredRows: 0, parseErrors: 0 },
      nodes: [],
      edges: [],
    });

    const refs = await runtime.runEvaluate();
    const findings = await runtime.artifacts.read(refs.find((ref) => ref.type === "FindingReport"));
    const report = await runtime.artifacts.read(refs.find((ref) => ref.type === "AssessmentReport"));
    const risks = report.assessments.filter((assessment) => assessment.ruleId === FUNCTION_COMPLEXITY_RULE_ID);

    assert.equal(findings.summary.total, 0);
    assert.equal(risks.length, 1);
    assert.equal(risks[0].kind, "risk");
    assert.equal(risks[0].confidence.verification, "corroborated");
    assert.equal(risks[0].evidence.length, 3);
    assert.equal(risks[0].details.coverage.status, "observed-passing");
    assert.equal(risks[0].details.coverage.observations[0].targetDeclared, true);
    assert.equal(report.header.inputRefs.some((ref) => ref.id === observationRef.id), true);
    assert.equal(report.header.inputRefs.some((ref) => ref.id === runRef.id), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
