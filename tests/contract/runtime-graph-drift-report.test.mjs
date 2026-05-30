// Contract tests for RuntimeGraphDriftReport v1 (seventy-fourth slice on
// the capability-ontology track).
//
// RuntimeGraphDriftReport v1 compares the four materialized graph artifacts
// (StepCapabilityGraph, HandoffContract, HandoffCoverageReport,
// RuntimeGraphObservationReport) into expected-vs-observed runtime graph
// drift rows. It reads no raw event logs, re-evaluates no coverage, mutates
// nothing, and creates no WorkOrder / VerificationPlan.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  buildRuntimeGraphDriftReport,
} from "../../packages/capability-model/dist/index.js";
import {
  validateRuntimeGraphDriftReport,
} from "../../packages/kernel-repo-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "tests/fixtures/js-ts-ast-evidence");

const REFS = {
  step: { type: "StepCapabilityGraph", id: "scg-1", schemaVersion: "0.1.0" },
  contract: { type: "HandoffContract", id: "hc-1", schemaVersion: "0.1.0" },
  coverage: { type: "HandoffCoverageReport", id: "hcr-1", schemaVersion: "0.1.0" },
  observation: { type: "RuntimeGraphObservationReport", id: "rgo-1", schemaVersion: "0.1.0" },
};

function header() {
  return {
    artifactType: "RuntimeGraphDriftReport",
    artifactId: "runtime-graph-drift-report-test-1",
    schemaVersion: "0.1.0",
    generatedAt: "2026-05-29T00:00:00.000Z",
    subject: { repoId: "test" },
    producer: { id: "@rekon/test", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
    provenance: { confidence: 0.85 },
  };
}

const observationPresent = (overrides = {}) => ({ summary: { observedNodes: 5, observedEdges: 2 }, edges: [], ...overrides });

function build({ stepGraph, contract, coverage, observation } = {}) {
  return buildRuntimeGraphDriftReport({
    header: header(),
    stepCapabilityGraph: stepGraph,
    stepCapabilityGraphRef: stepGraph ? REFS.step : undefined,
    handoffContract: contract,
    handoffContractRef: contract ? REFS.contract : undefined,
    handoffCoverageReport: coverage,
    handoffCoverageReportRef: coverage ? REFS.coverage : undefined,
    runtimeGraphObservationReport: observation,
    runtimeGraphObservationReportRef: observation ? REFS.observation : undefined,
  });
}

const rowsWith = (r, status) => r.rows.filter((row) => row.status === status);

// ---------- 1 ----------
test("RuntimeGraphDriftReport validates", () => {
  const r = build({
    coverage: { rows: [{ id: "c1", handoffId: "h1", status: "covered" }] },
    observation: observationPresent(),
  });
  assert.equal(validateRuntimeGraphDriftReport(r).ok, true);
});

// ---------- 2 ----------
test("covered coverage row becomes in-sync drift row", () => {
  const r = build({ coverage: { rows: [{ id: "c1", handoffId: "h1", status: "covered" }] }, observation: observationPresent() });
  assert.equal(rowsWith(r, "in-sync").length, 1);
  assert.equal(rowsWith(r, "in-sync")[0].coverageRowId, "c1");
});

// ---------- 3 ----------
test("uncovered coverage row becomes uncovered-handoff drift row", () => {
  const r = build({ coverage: { rows: [{ id: "c1", handoffId: "h1", status: "uncovered" }] }, observation: observationPresent() });
  assert.equal(rowsWith(r, "uncovered-handoff").length, 1);
});

// ---------- 4 ----------
test("unresolved-contract coverage row becomes unresolved-contract drift row", () => {
  const r = build({ coverage: { rows: [{ id: "c1", handoffId: "h1", status: "unresolved-contract" }] }, observation: observationPresent() });
  assert.equal(rowsWith(r, "unresolved-contract").length, 1);
});

// ---------- 5 ----------
test("added-observed coverage row becomes added-observed drift row", () => {
  const r = build({ coverage: { rows: [{ id: "c1", status: "added-observed", eventName: "x", fromStepId: "a", toStepId: "b" }] }, observation: observationPresent() });
  assert.ok(rowsWith(r, "added-observed").length >= 1);
});

// ---------- 6 ----------
test("not-evaluated coverage row becomes not-evaluated drift row", () => {
  const r = build({ coverage: { rows: [{ id: "c1", handoffId: "h1", status: "not-evaluated" }] }, observation: observationPresent() });
  assert.equal(rowsWith(r, "not-evaluated").length, 1);
});

// ---------- 7 ----------
test("RuntimeGraphObservationReport absent emits observation-missing rather than false drift", () => {
  const r = build({ coverage: { rows: [{ id: "c1", handoffId: "h1", status: "covered" }] } });
  assert.equal(rowsWith(r, "observation-missing").length, 1);
  assert.equal(rowsWith(r, "missing-expected").length, 0);
});

// ---------- 8 ----------
test("RuntimeGraphObservationReport empty emits observation-missing rather than false drift", () => {
  const r = build({
    coverage: { rows: [{ id: "c1", handoffId: "h1", status: "covered" }] },
    observation: { summary: { observedNodes: 0, observedEdges: 0 }, edges: [] },
  });
  assert.equal(rowsWith(r, "observation-missing").length, 1);
  assert.equal(rowsWith(r, "missing-expected").length, 0);
});

// ---------- 9 ----------
test("observed handoff edge absent from HandoffContract becomes added-observed if not already represented by coverage", () => {
  const r = build({
    contract: { handoffs: [] },
    coverage: { rows: [] },
    observation: { summary: { observedNodes: 2, observedEdges: 1 }, edges: [{ id: "handoff:x:y", kind: "handoff", fromNodeId: "step:x", toNodeId: "step:y" }] },
  });
  const added = rowsWith(r, "added-observed");
  assert.equal(added.length, 1);
  assert.equal(added[0].kind, "handoff");
  assert.equal(added[0].observedEdgeId, "handoff:x:y");
});

// ---------- 10 ----------
test("severity mapping follows policy", () => {
  const r = build({
    coverage: {
      rows: [
        { id: "c1", handoffId: "h1", status: "covered" },
        { id: "c2", handoffId: "h2", status: "uncovered" },
        { id: "c3", handoffId: "h3", status: "unresolved-contract" },
      ],
    },
    observation: observationPresent(),
  });
  const sev = (status) => rowsWith(r, status)[0].severity;
  assert.equal(sev("in-sync"), "low");
  assert.equal(sev("uncovered-handoff"), "high");
  assert.equal(sev("unresolved-contract"), "medium");
});

// ---------- 11 ----------
test("summary counts total / status buckets / bySeverity", () => {
  const r = build({
    coverage: {
      rows: [
        { id: "c1", handoffId: "h1", status: "covered" },
        { id: "c2", handoffId: "h2", status: "uncovered" },
        { id: "c3", handoffId: "h3", status: "unresolved-contract" },
        { id: "c4", status: "added-observed", fromStepId: "a", toStepId: "b" },
      ],
    },
    observation: observationPresent(),
  });
  assert.equal(r.summary.total, 4);
  assert.equal(r.summary.inSync, 1);
  assert.equal(r.summary.uncoveredHandoff, 1);
  assert.equal(r.summary.unresolvedContract, 1);
  assert.equal(r.summary.addedObserved, 1);
  assert.deepEqual(r.summary.bySeverity, { low: 1, medium: 2, high: 1 });
  assert.equal(validateRuntimeGraphDriftReport(r).ok, true);
});

// ---------- 12 ----------
test("deterministic row ordering (by kind, status, id)", () => {
  const coverage = {
    rows: [
      { id: "z1", handoffId: "h1", status: "covered" },
      { id: "a1", handoffId: "h2", status: "uncovered" },
    ],
  };
  const a = build({ coverage, observation: observationPresent() });
  const b = build({ coverage, observation: observationPresent() });
  assert.deepEqual(a.rows.map((row) => row.id), b.rows.map((row) => row.id));
});

// ---------- 13 ----------
test("source refs preserved", () => {
  const r = build({
    stepGraph: { steps: [] },
    contract: { handoffs: [] },
    coverage: { rows: [{ id: "c1", handoffId: "h1", status: "covered" }] },
    observation: observationPresent(),
  });
  assert.equal(r.source.stepCapabilityGraphRef.id, "scg-1");
  assert.equal(r.source.handoffContractRef.id, "hc-1");
  assert.equal(r.source.handoffCoverageReportRef.id, "hcr-1");
  assert.equal(r.source.runtimeGraphObservationReportRef.id, "rgo-1");
});

// ---------- 14 ----------
test("helper does not read raw event logs (consumes only values; missing inputs -> not-evaluated)", () => {
  const r = build({});
  assert.equal(validateRuntimeGraphDriftReport(r).ok, true);
  assert.equal(rowsWith(r, "observation-missing").length, 1);
  assert.equal(rowsWith(r, "not-evaluated").length, 1);
  assert.ok(!("eventLogPath" in r.source));
});

// ---------- CLI integration (15-21) ----------

let cachedWorkspace;

function runCli(cwd, args, { allowFailure = false } = {}) {
  const result = spawnSync(process.execPath, [cliPath, "--root", cwd, ...args], { cwd, encoding: "utf8" });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`CLI failed: ${args.join(" ")}\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`);
  }
  return result;
}

function indexSnapshot(rawIndex, type) {
  return JSON.parse(rawIndex)
    .filter((e) => e.type === type)
    .map((e) => ({ id: e.id, digest: e.digest }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function getWorkspace() {
  if (cachedWorkspace) return cachedWorkspace;
  const work = await mkdtemp(join(tmpdir(), "rekon-rgd-"));
  await cp(exampleRoot, work, { recursive: true });
  await rm(join(work, ".rekon"), { recursive: true, force: true });
  runCli(work, ["init"]);
  runCli(work, ["refresh", "--json"]);
  runCli(work, ["capability", "ontology", "normalize", "--json"]);
  const nref = runCli(work, ["artifacts", "latest", "--type", "CapabilityNormalizationReport", "--id-only"]).stdout.trim();
  runCli(work, ["capability", "phrase", "project", "--report", nref, "--json"]);
  runCli(work, ["refresh", "--json"]);

  await mkdir(join(work, ".rekon"), { recursive: true });
  await writeFile(join(work, ".rekon/step-capability-map.json"), JSON.stringify({
    version: "0.1.0",
    steps: [
      { id: "fixture.create-user", label: "Create User", capabilities: [{ verb: "create", noun: "user" }], paths: ["src/"], systems: ["fixture"] },
      { id: "fixture.persist-user", label: "Persist User", capabilities: [{ verb: "save", noun: "user" }], paths: ["src/"], systems: ["fixture"] },
    ],
  }, null, 2), "utf8");
  runCli(work, ["step", "graph", "build", "--json"]);

  await writeFile(join(work, ".rekon/handoff-contracts.json"), JSON.stringify({
    version: "0.1.0",
    handoffs: [
      { id: "fixture.create-to-persist", fromStepId: "fixture.create-user", toStepId: "fixture.persist-user", feature: "fixture-user", event: { name: "fixture.user.persist", kind: "handoff_event" } },
      { id: "fixture.create-to-missing", fromStepId: "fixture.create-user", toStepId: "missing.step", feature: "fixture-missing" },
      { id: "fixture.uncovered", fromStepId: "fixture.persist-user", toStepId: "fixture.create-user", feature: "fixture-uncovered" },
    ],
  }, null, 2), "utf8");
  runCli(work, ["handoff", "contract", "build", "--json"]);

  const eventLogPath = join(work, ".rekon/handoff-events.jsonl");
  await writeFile(eventLogPath, [
    JSON.stringify({ kind: "handoff_event", name: "fixture.user.persist", feature: "fixture-user", fromStepId: "fixture.create-user", toStepId: "fixture.persist-user", timestamp: "2026-05-30T00:00:00.000Z", source: "smoke" }),
    JSON.stringify({ kind: "handoff_event", name: "fixture.extra", feature: "fixture-extra", fromStepId: "fixture.extra-from", toStepId: "fixture.extra-to", timestamp: "2026-05-30T00:00:01.000Z", source: "smoke" }),
    JSON.stringify({ kind: "other_event", name: "ignored" }),
    "{bad json",
  ].join("\n") + "\n", "utf8");

  runCli(work, ["handoff", "coverage", "report", "--json"]);
  runCli(work, ["runtime", "graph", "observe", "--json"]);

  const indexPath = join(work, ".rekon/registry/artifacts.index.json");
  const beforeIndex = await readFile(indexPath, "utf8");
  const eventLogBefore = await readFile(eventLogPath, "utf8");

  const driftResult = runCli(work, ["runtime", "graph", "drift", "--json"]);

  const afterIndex = await readFile(indexPath, "utf8");
  const eventLogAfter = await readFile(eventLogPath, "utf8");
  const validateResult = runCli(work, ["artifacts", "validate", "--json"]);

  cachedWorkspace = {
    work,
    driftJson: JSON.parse(driftResult.stdout),
    beforeIndex,
    afterIndex,
    eventLogBefore,
    eventLogAfter,
    validateJson: JSON.parse(validateResult.stdout),
  };
  return cachedWorkspace;
}

test("CLI writes RuntimeGraphDriftReport", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.driftJson.artifact.type, "RuntimeGraphDriftReport");
  assert.ok(indexSnapshot(ws.afterIndex, "RuntimeGraphDriftReport").length >= 1);
  // expected-vs-observed drift rows present
  assert.equal(ws.driftJson.summary.inSync, 1);
  assert.equal(ws.driftJson.summary.uncoveredHandoff, 1);
  assert.equal(ws.driftJson.summary.unresolvedContract, 1);
  assert.equal(ws.driftJson.summary.addedObserved, 1);
});

test("CLI supports pinned refs (source refs preserved)", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.driftJson.source.handoffCoverageReportRef.type, "HandoffCoverageReport");
  assert.equal(ws.driftJson.source.runtimeGraphObservationReportRef.type, "RuntimeGraphObservationReport");
  assert.equal(ws.driftJson.source.handoffContractRef.type, "HandoffContract");
  assert.equal(ws.driftJson.source.stepCapabilityGraphRef.type, "StepCapabilityGraph");
});

test("CLI does not create WorkOrder", async () => {
  const ws = await getWorkspace();
  assert.equal(indexSnapshot(ws.afterIndex, "WorkOrder").length, 0);
});

test("CLI does not create VerificationPlan", async () => {
  const ws = await getWorkspace();
  assert.equal(indexSnapshot(ws.afterIndex, "VerificationPlan").length, 0);
});

test("CLI does not mutate source artifacts", async () => {
  const ws = await getWorkspace();
  for (const type of ["StepCapabilityGraph", "HandoffContract", "HandoffCoverageReport", "RuntimeGraphObservationReport"]) {
    assert.deepEqual(indexSnapshot(ws.afterIndex, type), indexSnapshot(ws.beforeIndex, type));
  }
});

test("CLI does not read .rekon/handoff-events.jsonl directly", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.eventLogAfter, ws.eventLogBefore);
  assert.ok(!("eventLogPath" in ws.driftJson.source));
});

test("artifacts validate remains clean", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.validateJson.valid, true);
  assert.equal((ws.validateJson.issues || []).length, 0);
  await rm(ws.work, { recursive: true, force: true });
});
