// Contract tests for IntentAssessmentReport v1 (seventy-eighth slice on the
// capability-ontology track).
//
// IntentAssessmentReport v1 is a read-only readiness assessment of a user
// request against the existing Rekon context spine. It is assessment, not
// WorkOrder: it creates no WorkOrder / VerificationPlan, executes no commands,
// writes no source, and mutates nothing.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { buildIntentAssessmentReport } from "../../packages/capability-model/dist/index.js";
import {
  createIntentAssessmentReport,
  validateIntentAssessmentReport,
} from "../../packages/kernel-repo-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

function baseHeader() {
  return {
    artifactType: "IntentAssessmentReport",
    artifactId: "intent-assessment-report-test-1",
    schemaVersion: "0.1.0",
    generatedAt: "2026-05-30T00:00:00.000Z",
    subject: { repoId: "test" },
    producer: { id: "@rekon/test", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
    provenance: { confidence: 0.7 },
  };
}

const REF = (type, id) => ({ type, id, schemaVersion: "0.1.0" });

function build(opts = {}) {
  return buildIntentAssessmentReport({
    header: baseHeader(),
    request: { goal: "Do the thing", kind: "bug" },
    ...opts,
  });
}

const ids = (list) => list.map((entry) => entry.id);
const has = (list, predicate) => list.some(predicate);

// ---------- 1 ----------
test("IntentAssessmentReport validates", () => {
  const report = build({
    stepCapabilityGraph: { steps: [] },
    stepCapabilityGraphRef: REF("StepCapabilityGraph", "s"),
    runtimeGraphDriftReport: { rows: [] },
    runtimeGraphDriftReportRef: REF("RuntimeGraphDriftReport", "d"),
  });
  assert.equal(validateIntentAssessmentReport(report).ok, true);
});

// ---------- 2 ----------
test("missing goal fails clearly", () => {
  assert.throws(() => build({ request: { goal: "", kind: "bug" } }), /IntentAssessmentReport/);
  const invalid = validateIntentAssessmentReport({
    header: baseHeader(),
    request: { goal: "", kind: "bug" },
    source: {},
    readiness: { status: "blocked", recommendedNextAction: "resolve-blockers" },
    matchedContext: { systems: [], capabilities: [], steps: [], paths: [] },
    blockers: [],
    warnings: [],
    missingContext: [],
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.issues.some((issue) => issue.path === "$.request.goal"));
});

// ---------- 3 ----------
test("minimal assessment with goal and no context validates", () => {
  const report = build({ allowMissingSpine: true });
  assert.equal(validateIntentAssessmentReport(report).ok, true);
  assert.equal(report.request.goal, "Do the thing");
});

// ---------- 4 ----------
test("missing StepCapabilityGraph emits a missing-artifact blocker", () => {
  const report = build({
    runtimeGraphDriftReport: { rows: [] },
    runtimeGraphDriftReportRef: REF("RuntimeGraphDriftReport", "d"),
  });
  assert.ok(has(report.blockers, (b) => b.id === "missing:step-capability-graph" && b.category === "missing-artifact" && b.severity === "high"));
});

// ---------- 5 ----------
test("missing RuntimeGraphDriftReport emits a missing-artifact blocker", () => {
  const report = build({
    stepCapabilityGraph: { steps: [] },
    stepCapabilityGraphRef: REF("StepCapabilityGraph", "s"),
  });
  assert.ok(has(report.blockers, (b) => b.id === "missing:runtime-graph-drift-report" && b.category === "missing-artifact"));
});

// ---------- 6 ----------
test("high severity runtime drift emits a runtime-drift blocker", () => {
  const report = build({
    allowMissingSpine: true,
    runtimeGraphDriftReport: { rows: [{ id: "d1", status: "uncovered-handoff", severity: "high", message: "declared handoff not observed" }] },
    runtimeGraphDriftReportRef: REF("RuntimeGraphDriftReport", "d"),
  });
  assert.ok(has(report.blockers, (b) => b.category === "runtime-drift" && b.severity === "high" && b.id === "drift:d1"));
});

// ---------- 7 ----------
test("added-observed medium drift emits a runtime-drift warning", () => {
  const report = build({
    allowMissingSpine: true,
    runtimeGraphDriftReport: { rows: [{ id: "d2", status: "added-observed", severity: "medium", message: "observed-only edge" }] },
    runtimeGraphDriftReportRef: REF("RuntimeGraphDriftReport", "d"),
  });
  assert.ok(has(report.warnings, (w) => w.category === "runtime-drift" && w.id === "drift:d2"));
  assert.equal(has(report.blockers, (b) => b.id === "drift:d2"), false);
});

// ---------- 8 ----------
test("HandoffCoverageReport uncovered emits a handoff-coverage warning", () => {
  const report = build({
    allowMissingSpine: true,
    handoffCoverageReport: { summary: { uncovered: 2, unresolvedContract: 0, parseErrors: 0, notEvaluated: 0 } },
    handoffCoverageReportRef: REF("HandoffCoverageReport", "c"),
  });
  assert.ok(has(report.warnings, (w) => w.id === "coverage:uncovered" && w.category === "handoff-coverage"));
});

// ---------- 9 ----------
test("HandoffCoverageReport unresolvedContract emits a blocker", () => {
  const report = build({
    allowMissingSpine: true,
    handoffCoverageReport: { summary: { uncovered: 0, unresolvedContract: 1, parseErrors: 0, notEvaluated: 0 } },
    handoffCoverageReportRef: REF("HandoffCoverageReport", "c"),
  });
  assert.ok(has(report.blockers, (b) => b.id === "coverage:unresolved-contract" && b.category === "handoff-coverage" && b.severity === "high"));
});

// ---------- 10 ----------
test("HandoffCoverageReport parseErrors emits a warning", () => {
  const report = build({
    allowMissingSpine: true,
    handoffCoverageReport: { summary: { uncovered: 0, unresolvedContract: 0, parseErrors: 3, notEvaluated: 0 } },
    handoffCoverageReportRef: REF("HandoffCoverageReport", "c"),
  });
  assert.ok(has(report.warnings, (w) => w.id === "coverage:parse-errors" && w.category === "handoff-coverage"));
});

// ---------- 11 ----------
test("stale PathFreshnessReport relevant to scope yields stale-context readiness", () => {
  const report = build({
    allowMissingSpine: true,
    request: { goal: "Edit src", kind: "refactor", scope: { paths: ["src/"] } },
    pathFreshnessReport: { status: "stale", entries: [{ path: "src/app.ts", status: "changed" }] },
    pathFreshnessReportRef: REF("PathFreshnessReport", "f"),
  });
  assert.equal(report.readiness.status, "stale-context");
  assert.ok(has(report.blockers, (b) => b.category === "stale-context"));
});

// ---------- 12 ----------
test("missing VerificationResult emits a proof-missing warning", () => {
  const report = build({ allowMissingSpine: true });
  assert.ok(has(report.warnings, (w) => w.id === "proof:missing" && w.category === "proof-missing"));
});

// ---------- 13 ----------
test("failed VerificationResult emits a proof-missing blocker", () => {
  const report = build({
    allowMissingSpine: true,
    verificationResult: { status: "failed" },
    verificationResultRef: REF("VerificationResult", "v"),
  });
  assert.ok(has(report.blockers, (b) => b.id === "proof:failed" && b.category === "proof-missing"));
});

// ---------- 14 ----------
test("request scope paths appear in matchedContext.paths", () => {
  const report = build({ allowMissingSpine: true, request: { goal: "g", kind: "bug", scope: { paths: ["src/app.ts"] } } });
  assert.ok(report.matchedContext.paths.includes("src/app.ts"));
});

// ---------- 15 ----------
test("request scope systems appear in matchedContext.systems", () => {
  const report = build({ allowMissingSpine: true, request: { goal: "g", kind: "bug", scope: { systems: ["billing"] } } });
  assert.ok(report.matchedContext.systems.includes("billing"));
});

// ---------- 16 ----------
test("request scope capabilities appear in matchedContext.capabilities", () => {
  const report = build({ allowMissingSpine: true, request: { goal: "g", kind: "bug", scope: { capabilities: ["create user"] } } });
  assert.ok(report.matchedContext.capabilities.includes("create user"));
});

// ---------- 17 ----------
test("request scope steps appear in matchedContext.steps", () => {
  const report = build({ allowMissingSpine: true, request: { goal: "g", kind: "bug", scope: { steps: ["step.create"] } } });
  assert.ok(report.matchedContext.steps.includes("step.create"));
});

// ---------- 18 ----------
test("readiness precedence: stale > blocked > insufficient-context > needs-review > ready-for-prepare", () => {
  // stale beats blocked (missing spine high blocker + relevant stale path).
  const stale = build({
    request: { goal: "g", kind: "bug", scope: { paths: ["src/"] } },
    pathFreshnessReport: { status: "stale", entries: [{ path: "src/x.ts", status: "changed" }] },
    pathFreshnessReportRef: REF("PathFreshnessReport", "f"),
  });
  assert.equal(stale.readiness.status, "stale-context");

  // blocked beats insufficient-context (high blocker, empty scope).
  const blocked = build({ request: { goal: "g", kind: "bug" } });
  assert.equal(blocked.readiness.status, "blocked");

  // insufficient-context beats needs-review (no high blocker, empty scope, medium warning).
  const insufficient = build({ allowMissingSpine: true, request: { goal: "g", kind: "bug" } });
  assert.equal(insufficient.readiness.status, "insufficient-context");

  // needs-review (no high blocker, scope present, medium warning present).
  const needsReview = build({ allowMissingSpine: true, request: { goal: "g", kind: "bug", scope: { steps: ["s1"] } } });
  assert.equal(needsReview.readiness.status, "needs-review");

  // ready-for-prepare (no blockers, scope present, no medium warning).
  const ready = build({
    request: { goal: "g", kind: "feature", scope: { steps: ["s1"] } },
    stepCapabilityGraph: { steps: [{ id: "s1", systems: ["sys"], paths: ["src/"] }] },
    stepCapabilityGraphRef: REF("StepCapabilityGraph", "sg"),
    runtimeGraphDriftReport: { rows: [] },
    runtimeGraphDriftReportRef: REF("RuntimeGraphDriftReport", "d"),
    handoffCoverageReport: { summary: { uncovered: 0, unresolvedContract: 0, parseErrors: 0, notEvaluated: 0 } },
    handoffCoverageReportRef: REF("HandoffCoverageReport", "c"),
    runtimeGraphObservationReportRef: REF("RuntimeGraphObservationReport", "o"),
    capabilityMap: { entries: [] },
    capabilityMapRef: REF("CapabilityMap", "m"),
    verificationResult: { status: "passed" },
    verificationResultRef: REF("VerificationResult", "v"),
  });
  assert.equal(ready.readiness.status, "ready-for-prepare");
});

// ---------- 19 ----------
test("recommendedNextAction matches readiness", () => {
  const expected = {
    "stale-context": "refresh-context",
    blocked: "resolve-blockers",
    "insufficient-context": "ask-clarifying-question",
    "needs-review": "human-review",
    "ready-for-prepare": "prepare-intent",
  };
  const blocked = build({ request: { goal: "g", kind: "bug" } });
  assert.equal(blocked.readiness.recommendedNextAction, expected[blocked.readiness.status]);
  const insufficient = build({ allowMissingSpine: true, request: { goal: "g", kind: "bug" } });
  assert.equal(insufficient.readiness.recommendedNextAction, expected[insufficient.readiness.status]);
});

// ---------- factory determinism ----------
test("factory sorts blockers by severity then category then id", () => {
  const report = createIntentAssessmentReport({
    header: baseHeader(),
    request: { goal: "g", kind: "bug" },
    source: {},
    readiness: { status: "blocked", recommendedNextAction: "resolve-blockers" },
    matchedContext: { systems: [], capabilities: [], steps: [], paths: [] },
    blockers: [
      { id: "z-low", category: "proof-missing", severity: "low", message: "m" },
      { id: "a-high", category: "runtime-drift", severity: "high", message: "m" },
      { id: "b-high", category: "missing-artifact", severity: "high", message: "m" },
    ],
    warnings: [],
    missingContext: [],
  });
  assert.deepEqual(ids(report.blockers), ["b-high", "a-high", "z-low"]);
});

// ---------- CLI ----------
const cliRoot = await mkdtemp(join(tmpdir(), "rekon-intent-assess-"));
await mkdir(join(cliRoot, "src"), { recursive: true });
await writeFile(join(cliRoot, "src", "app.ts"), "export const app = 1;\n", "utf8");

function runCli(args) {
  return spawnSync("node", [cliPath, ...args], { encoding: "utf8" });
}

// ---------- 20 ----------
test("CLI writes an IntentAssessmentReport", () => {
  const result = runCli(["intent", "assess", "--root", cliRoot, "--goal", "Fix the bug", "--json"]);
  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.artifact.type, "IntentAssessmentReport");
  assert.ok(payload.readiness.status);
  assert.equal(typeof payload.blockers, "number");
  assert.equal(typeof payload.warnings, "number");
  assert.equal(typeof payload.missingContext, "number");
});

// ---------- 21 ----------
test("CLI requires --goal", () => {
  const result = runCli(["intent", "assess", "--root", cliRoot]);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /requires --goal/);
});

// ---------- 22 ----------
test("CLI supports --kind", () => {
  const result = runCli(["intent", "assess", "--root", cliRoot, "--goal", "Add a feature", "--kind", "feature"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Kind: feature/);
});

// ---------- 23 ----------
test("CLI supports scope flags", () => {
  const result = runCli(["intent", "assess", "--root", cliRoot, "--goal", "Edit", "--path", "src/app.ts", "--step", "step.create", "--json"]);
  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.ok(payload.matchedContext.paths.includes("src/app.ts"));
  assert.ok(payload.matchedContext.steps.includes("step.create"));
});

// ---------- 24 ----------
test("CLI does not create a WorkOrder", () => {
  runCli(["intent", "assess", "--root", cliRoot, "--goal", "No work order"]);
  const result = runCli(["artifacts", "latest", "--root", cliRoot, "--type", "WorkOrder", "--allow-missing", "--json"]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).artifact, null);
});

// ---------- 25 ----------
test("CLI does not create a VerificationPlan", () => {
  const result = runCli(["artifacts", "latest", "--root", cliRoot, "--type", "VerificationPlan", "--allow-missing", "--json"]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).artifact, null);
});

// ---------- 26 ----------
test("CLI does not create a VerificationRun", () => {
  const result = runCli(["artifacts", "latest", "--root", cliRoot, "--type", "VerificationRun", "--allow-missing", "--json"]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).artifact, null);
});

// ---------- 27 ----------
test("CLI does not write source files", async () => {
  const before = await readFile(join(cliRoot, "src", "app.ts"), "utf8");
  runCli(["intent", "assess", "--root", cliRoot, "--goal", "Do not touch source", "--path", "src/app.ts"]);
  const after = await readFile(join(cliRoot, "src", "app.ts"), "utf8");
  assert.equal(after, before);
});

// ---------- 28 ----------
test("artifacts validate remains clean after intent assess", () => {
  runCli(["intent", "assess", "--root", cliRoot, "--goal", "Validate me"]);
  const result = runCli(["artifacts", "validate", "--root", cliRoot, "--json"]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).valid, true);
});
