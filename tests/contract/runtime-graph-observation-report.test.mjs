// Contract tests for RuntimeGraphObservationReport v1 (seventy-first slice
// on the capability-ontology track).
//
// RuntimeGraphObservationReport v1 generates an observed runtime graph from
// an optional raw handoff event log (.rekon/handoff-events.jsonl). Observed
// handoff_event rows fold into observed nodes (step/feature/event/source)
// and edges (handoff/emitted-by). It is observed runtime graph, NOT declared
// topology, and NOT HandoffCoverageReport: it evaluates no coverage, compares
// against no declared artifact, detects no drift, and mutates nothing.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  buildRuntimeGraphObservationReport,
  parseRuntimeGraphObservationEventLog,
} from "../../packages/capability-model/dist/index.js";
import {
  validateRuntimeGraphObservationReport,
} from "../../packages/kernel-repo-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "tests/fixtures/js-ts-ast-evidence");

function header() {
  return {
    artifactType: "RuntimeGraphObservationReport",
    artifactId: "runtime-graph-observation-report-test-1",
    schemaVersion: "0.1.0",
    generatedAt: "2026-05-29T00:00:00.000Z",
    subject: { repoId: "test" },
    producer: { id: "@rekon/test", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
    provenance: { confidence: 0.85 },
  };
}

function jsonl(...lines) {
  return lines.join("\n") + "\n";
}

function ev(overrides = {}) {
  return JSON.stringify({
    kind: "handoff_event",
    name: "e.persist",
    feature: "feat",
    fromStepId: "a.create",
    toStepId: "b.persist",
    timestamp: "2026-05-30T00:00:00.000Z",
    source: "smoke",
    payloadType: "P",
    ...overrides,
  });
}

function executionObservation(overrides = {}) {
  return JSON.stringify({
    kind: "execution_observation",
    testPath: "tests/user.test.ts",
    sourcePaths: ["src/user-service.ts"],
    routePaths: ["/api/users"],
    timestamp: "2026-05-30T00:00:02.000Z",
    source: "vitest-instrumentation",
    ...overrides,
  });
}

function build({ eventLog, eventLogPath, eventLogHash, handoffCoverageReportRef, handoffContractRef, stepCapabilityGraphRef } = {}) {
  return buildRuntimeGraphObservationReport({
    header: header(),
    eventLog,
    eventLogPath,
    eventLogHash,
    handoffCoverageReportRef,
    handoffContractRef,
    stepCapabilityGraphRef,
  });
}

const nodeById = (r, id) => r.nodes.find((n) => n.id === id);
const edgeById = (r, id) => r.edges.find((e) => e.id === id);

// ---------- 1 ----------
test("RuntimeGraphObservationReport validates", () => {
  const r = build({ eventLog: jsonl(ev()), eventLogPath: ".rekon/handoff-events.jsonl", eventLogHash: "deadbeef" });
  assert.equal(validateRuntimeGraphObservationReport(r).ok, true);
  assert.match(r.header.supersession.key, /^runtime-observation:[a-f0-9]{64}$/);
});

// ---------- 2 ----------
test("missing event log emits zero nodes / zero edges", () => {
  const r = build({});
  assert.equal(r.nodes.length, 0);
  assert.equal(r.edges.length, 0);
  assert.equal(r.summary.observedNodes, 0);
  assert.equal(r.summary.observedEdges, 0);
  assert.equal(validateRuntimeGraphObservationReport(r).ok, true);
});

// ---------- 3 ----------
test("valid handoff_event creates from/to step nodes", () => {
  const r = build({ eventLog: jsonl(ev()) });
  assert.equal(nodeById(r, "step:a.create").kind, "step");
  assert.equal(nodeById(r, "step:b.persist").kind, "step");
});

// ---------- 4 ----------
test("valid handoff_event creates feature node when feature exists", () => {
  const r = build({ eventLog: jsonl(ev()) });
  assert.equal(nodeById(r, "feature:feat").kind, "feature");
});

// ---------- 5 ----------
test("valid handoff_event creates event node when name exists", () => {
  const r = build({ eventLog: jsonl(ev()) });
  assert.equal(nodeById(r, "event:e.persist").kind, "event");
});

// ---------- 6 ----------
test("valid handoff_event creates source node when source exists", () => {
  const r = build({ eventLog: jsonl(ev()) });
  assert.equal(nodeById(r, "source:smoke").kind, "source");
});

// ---------- 7 ----------
test("valid handoff_event creates handoff edge when fromStepId and toStepId exist", () => {
  const r = build({ eventLog: jsonl(ev()) });
  const edge = edgeById(r, "handoff:a.create:b.persist");
  assert.equal(edge.kind, "handoff");
  assert.equal(edge.fromNodeId, "step:a.create");
  assert.equal(edge.toNodeId, "step:b.persist");
});

// ---------- 8 ----------
test("repeated event increments node observedCount", () => {
  const r = build({ eventLog: jsonl(ev(), ev()) });
  assert.equal(nodeById(r, "step:a.create").observedCount, 2);
  assert.equal(nodeById(r, "step:a.create").evidenceRefs.length, 2);
});

// ---------- 9 ----------
test("repeated event increments edge observedCount", () => {
  const r = build({ eventLog: jsonl(ev(), ev()) });
  assert.equal(edgeById(r, "handoff:a.create:b.persist").observedCount, 2);
});

// ---------- 10 ----------
test("firstObservedAt / lastObservedAt derived from timestamps", () => {
  const r = build({
    eventLog: jsonl(
      ev({ timestamp: "2026-05-30T00:00:00.000Z" }),
      ev({ timestamp: "2026-05-30T00:00:05.000Z" }),
    ),
  });
  const node = nodeById(r, "step:a.create");
  assert.equal(node.firstObservedAt, "2026-05-30T00:00:00.000Z");
  assert.equal(node.lastObservedAt, "2026-05-30T00:00:05.000Z");
});

// ---------- 11 ----------
test("non-handoff JSON row increments ignoredRows", () => {
  const r = build({ eventLog: jsonl(JSON.stringify({ kind: "other_event", name: "x" })) });
  assert.equal(r.summary.ignoredRows, 1);
  assert.equal(r.summary.observedNodes, 0);
  assert.equal(r.summary.parseErrors, 0);
});

// ---------- 12 ----------
test("invalid JSON line increments parseErrors and does not crash", () => {
  const r = build({ eventLog: jsonl("{bad json", ev()) });
  assert.equal(r.summary.parseErrors, 1);
  assert.equal(r.summary.handoffEvents, 1);
  const parsed = parseRuntimeGraphObservationEventLog({ eventLog: jsonl("{bad", "also bad", JSON.stringify({ kind: "nope" })) });
  assert.equal(parsed.parseErrors, 2);
  assert.equal(parsed.ignoredRows, 1);
});

// ---------- 13 ----------
test("event log hash / source path recorded", () => {
  const r = build({ eventLog: jsonl(ev()), eventLogPath: ".rekon/handoff-events.jsonl", eventLogHash: "abc123" });
  assert.equal(r.source.eventLogPath, ".rekon/handoff-events.jsonl");
  assert.equal(r.source.eventLogHash, "abc123");
});

// ---------- 14 ----------
test("optional upstream refs recorded when supplied", () => {
  const r = build({
    eventLog: jsonl(ev()),
    handoffCoverageReportRef: { type: "HandoffCoverageReport", id: "hcr-1", schemaVersion: "0.1.0" },
    handoffContractRef: { type: "HandoffContract", id: "hc-1", schemaVersion: "0.1.0" },
    stepCapabilityGraphRef: { type: "StepCapabilityGraph", id: "scg-1", schemaVersion: "0.1.0" },
  });
  assert.equal(r.source.handoffCoverageReportRef.id, "hcr-1");
  assert.equal(r.source.handoffContractRef.id, "hc-1");
  assert.equal(r.source.stepCapabilityGraphRef.id, "scg-1");
});

// ---------- 15 ----------
test("summary counts observedNodes / observedEdges / handoffEvents / ignoredRows / parseErrors", () => {
  const r = build({
    eventLog: jsonl(ev(), ev(), JSON.stringify({ kind: "other_event" }), "{bad json"),
  });
  assert.deepEqual(r.summary, {
    observedNodes: 5,
    observedEdges: 2,
    handoffEvents: 2,
    ignoredRows: 1,
    parseErrors: 1,
  });
  assert.equal(validateRuntimeGraphObservationReport(r).ok, true);
});

test("execution_observation creates evidence-bearing test, file, route, and observed edges", () => {
  const r = build({ eventLog: jsonl(executionObservation()) });
  assert.equal(validateRuntimeGraphObservationReport(r).ok, true);
  assert.equal(r.summary.executionObservations, 1);
  assert.equal(nodeById(r, "test:tests/user.test.ts").source, "runtime-event-log");
  assert.equal(nodeById(r, "file:src/user-service.ts").kind, "file");
  assert.equal(nodeById(r, "route:/api/users").kind, "route");
  assert.equal(
    edgeById(r, "observed-execution:test:tests/user.test.ts:file:src/user-service.ts").kind,
    "observed-execution",
  );
  assert.equal(
    edgeById(r, "observed-execution:test:tests/user.test.ts:route:/api/users").observedCount,
    1,
  );
});

test("execution observations dedupe targets and reject paths outside the repository", () => {
  const r = build({
    eventLog: jsonl(
      executionObservation({ sourcePaths: ["src/user-service.ts", "./src/user-service.ts"] }),
      executionObservation({ testPath: "../outside.test.ts", sourcePath: "../secret.ts", sourcePaths: [] }),
      executionObservation({ testPath: "/tmp/outside.test.ts", routePath: "https://example.com", routePaths: [] }),
    ),
  });
  assert.equal(r.summary.executionObservations, 1);
  assert.equal(r.summary.ignoredRows, 2);
  assert.equal(r.edges.filter((edge) => edge.kind === "observed-execution").length, 2);
  assert.equal(r.nodes.some((node) => node.label.includes("outside")), false);
});

// ---------- 16 ----------
test("deterministic node ordering (by kind, then id)", () => {
  const log = jsonl(ev(), ev({ fromStepId: "z.last", toStepId: "a.first" }));
  const a = build({ eventLog: log });
  const b = build({ eventLog: log });
  assert.deepEqual(a.nodes.map((n) => n.id), b.nodes.map((n) => n.id));
  // kinds are non-decreasing (event < feature < source < step alphabetically)
  const kinds = a.nodes.map((n) => n.kind);
  const sorted = [...kinds].sort();
  assert.deepEqual(kinds, sorted);
});

// ---------- 17 ----------
test("deterministic edge ordering (by kind, then from/to/id)", () => {
  const log = jsonl(ev(), ev({ name: "z.event", source: "alt" }));
  const a = build({ eventLog: log });
  const b = build({ eventLog: log });
  assert.deepEqual(a.edges.map((e) => e.id), b.edges.map((e) => e.id));
});

// ---------- CLI integration (18-25) ----------

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
  const work = await mkdtemp(join(tmpdir(), "rekon-rgo-"));
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
    ],
  }, null, 2), "utf8");
  runCli(work, ["handoff", "contract", "build", "--json"]);

  const eventLogPath = join(work, ".rekon/handoff-events.jsonl");
  const eventLogContent = [
    JSON.stringify({ kind: "handoff_event", name: "fixture.user.persist", feature: "fixture-user", fromStepId: "fixture.create-user", toStepId: "fixture.persist-user", timestamp: "2026-05-30T00:00:00.000Z", source: "smoke", payloadType: "FixtureUserPersisted" }),
    JSON.stringify({ kind: "handoff_event", name: "fixture.user.persist", feature: "fixture-user", fromStepId: "fixture.create-user", toStepId: "fixture.persist-user", timestamp: "2026-05-30T00:00:01.000Z", source: "smoke", payloadType: "FixtureUserPersisted" }),
    JSON.stringify({ kind: "other_event", name: "ignored" }),
    "{bad json",
  ].join("\n") + "\n";
  await writeFile(eventLogPath, eventLogContent, "utf8");

  runCli(work, ["handoff", "coverage", "report", "--json"]);

  const stepGraphRef = runCli(work, ["artifacts", "latest", "--type", "StepCapabilityGraph", "--id-only"]).stdout.trim();
  const contractRef = runCli(work, ["artifacts", "latest", "--type", "HandoffContract", "--id-only"]).stdout.trim();
  const coverageRef = runCli(work, ["artifacts", "latest", "--type", "HandoffCoverageReport", "--id-only"]).stdout.trim();

  const indexPath = join(work, ".rekon/registry/artifacts.index.json");
  const beforeIndex = await readFile(indexPath, "utf8");
  const eventLogBefore = await readFile(eventLogPath, "utf8");

  const observeResult = runCli(work, [
    "runtime", "graph", "observe",
    "--event-log", ".rekon/handoff-events.jsonl",
    "--step-graph", stepGraphRef,
    "--handoff-contract", contractRef,
    "--handoff-coverage-report", coverageRef,
    "--json",
  ]);

  const afterIndex = await readFile(indexPath, "utf8");
  const eventLogAfter = await readFile(eventLogPath, "utf8");
  const validateResult = runCli(work, ["artifacts", "validate", "--json"]);

  cachedWorkspace = {
    work,
    observeJson: JSON.parse(observeResult.stdout),
    beforeIndex,
    afterIndex,
    eventLogBefore,
    eventLogAfter,
    validateJson: JSON.parse(validateResult.stdout),
  };
  return cachedWorkspace;
}

test("CLI writes RuntimeGraphObservationReport", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.observeJson.artifact.type, "RuntimeGraphObservationReport");
  assert.ok(indexSnapshot(ws.afterIndex, "RuntimeGraphObservationReport").length >= 1);
  assert.deepEqual(ws.observeJson.summary, {
    observedNodes: 5,
    observedEdges: 2,
    handoffEvents: 2,
    ignoredRows: 1,
    parseErrors: 1,
  });
});

test("CLI supports explicit --event-log", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.observeJson.source.eventLogPath, ".rekon/handoff-events.jsonl");
  assert.ok(typeof ws.observeJson.source.eventLogHash === "string" && ws.observeJson.source.eventLogHash.length > 0);
});

test("CLI supports optional upstream refs", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.observeJson.source.stepCapabilityGraphRef.type, "StepCapabilityGraph");
  assert.equal(ws.observeJson.source.handoffContractRef.type, "HandoffContract");
  assert.equal(ws.observeJson.source.handoffCoverageReportRef.type, "HandoffCoverageReport");
});

test("CLI accepts execution observations and writes their graph relationships", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-rgo-execution-"));
  try {
    runCli(work, ["init"]);
    await writeFile(
      join(work, ".rekon/handoff-events.jsonl"),
      jsonl(executionObservation()),
      "utf8",
    );
    const result = runCli(work, ["runtime", "graph", "observe", "--json"]);
    const output = JSON.parse(result.stdout);
    assert.equal(output.summary.executionObservations, 1);
    assert.equal(output.summary.observedEdges, 2);

    const index = JSON.parse(await readFile(join(work, ".rekon/registry/artifacts.index.json"), "utf8"));
    const entry = index.find((candidate) => candidate.id === output.artifact.id);
    const report = JSON.parse(await readFile(join(work, entry.path), "utf8"));
    assert.equal(report.edges.every((edge) => edge.kind === "observed-execution"), true);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

test("CLI does not mutate .rekon/handoff-events.jsonl", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.eventLogAfter, ws.eventLogBefore);
});

test("CLI does not create RuntimeGraphDriftReport", async () => {
  const ws = await getWorkspace();
  assert.equal(indexSnapshot(ws.afterIndex, "RuntimeGraphDriftReport").length, 0);
});

test("CLI does not create WorkOrder", async () => {
  const ws = await getWorkspace();
  assert.equal(indexSnapshot(ws.afterIndex, "WorkOrder").length, 0);
});

test("CLI does not create VerificationPlan", async () => {
  const ws = await getWorkspace();
  assert.equal(indexSnapshot(ws.afterIndex, "VerificationPlan").length, 0);
});

test("artifacts validate remains clean", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.validateJson.valid, true);
  assert.equal((ws.validateJson.issues || []).length, 0);
  await rm(ws.work, { recursive: true, force: true });
});
