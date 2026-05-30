// Contract tests for HandoffContract v1 (sixty-fifth slice on the
// capability-ontology track).
//
// HandoffContract v1 materializes declared baton policy from an optional
// .rekon/handoff-contracts.json over the current StepCapabilityGraph,
// emitting declared / unresolved-step rows only. It evaluates no
// coverage, reads no runtime events, detects no drift, and mutates
// nothing.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  buildHandoffContract,
  parseHandoffContractConfig,
} from "../../packages/capability-model/dist/index.js";
import {
  validateHandoffContract,
} from "../../packages/kernel-repo-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "tests/fixtures/js-ts-ast-evidence");

const EVID = { type: "EvidenceGraph", id: "eg-1", schemaVersion: "0.1.0" };
const GRAPH_REF = { type: "StepCapabilityGraph", id: "scg-1", schemaVersion: "0.1.0" };

function graph() {
  return {
    steps: [
      { id: "a.create", evidenceRefs: [EVID] },
      { id: "b.persist", evidenceRefs: [EVID] },
    ],
  };
}

function header() {
  return {
    artifactType: "HandoffContract",
    artifactId: "handoff-contract-test-1",
    schemaVersion: "0.1.0",
    generatedAt: "2026-05-29T00:00:00.000Z",
    subject: { repoId: "test" },
    producer: { id: "@rekon/test", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
    provenance: { confidence: 0.85 },
  };
}

function build(handoffs) {
  return buildHandoffContract({
    header: header(),
    stepCapabilityGraph: graph(),
    stepCapabilityGraphRef: GRAPH_REF,
    config: handoffs ? { version: "0.1.0", handoffs } : undefined,
    configPath: handoffs ? ".rekon/handoff-contracts.json" : undefined,
  });
}

// ---------- 1: validates ----------
test("HandoffContract validates", () => {
  const c = build([{ fromStepId: "a.create", toStepId: "b.persist" }]);
  assert.equal(validateHandoffContract(c).ok, true);
});

// ---------- 2: missing config -> zero handoffs ----------
test("missing config emits zero handoffs", () => {
  const c = build(undefined);
  assert.equal(validateHandoffContract(c).ok, true);
  assert.equal(c.handoffs.length, 0);
  assert.deepEqual(c.summary, { total: 0, declared: 0, unresolvedStep: 0, needsReview: 0 });
});

// ---------- 3: invalid config fails clearly ----------
test("invalid config fails clearly", () => {
  assert.throws(() => parseHandoffContractConfig({ version: "9.9.9" }), /version/);
  assert.throws(() => parseHandoffContractConfig({ version: "0.1.0", handoffs: [{ fromStepId: "a" }] }), /toStepId/);
  assert.throws(() => parseHandoffContractConfig({ version: "0.1.0", handoffs: [{ toStepId: "b" }] }), /fromStepId/);
  assert.throws(() => parseHandoffContractConfig("nope"), /object/);
  const ok = parseHandoffContractConfig({ version: "0.1.0", handoffs: [{ fromStepId: "a", toStepId: "b" }] });
  assert.equal(ok.version, "0.1.0");
});

// ---------- 4: declared ----------
test("configured handoff with existing from/to steps emits declared", () => {
  const c = build([{ fromStepId: "a.create", toStepId: "b.persist" }]);
  assert.equal(c.handoffs.length, 1);
  assert.equal(c.handoffs[0].status, "declared");
});

// ---------- 5: missing fromStepId -> unresolved ----------
test("missing fromStepId emits unresolved-step", () => {
  const c = build([{ fromStepId: "nope", toStepId: "b.persist" }]);
  assert.equal(c.handoffs[0].status, "unresolved-step");
});

// ---------- 6: missing toStepId -> unresolved ----------
test("missing toStepId emits unresolved-step", () => {
  const c = build([{ fromStepId: "a.create", toStepId: "nope" }]);
  assert.equal(c.handoffs[0].status, "unresolved-step");
});

// ---------- 7: missing both -> unresolved ----------
test("missing both steps emits unresolved-step", () => {
  const c = build([{ fromStepId: "x", toStepId: "y" }]);
  assert.equal(c.handoffs[0].status, "unresolved-step");
});

// ---------- 8: unresolved rows include messages ----------
test("unresolved-step rows include messages", () => {
  const c = build([{ fromStepId: "x", toStepId: "y" }]);
  assert.ok(Array.isArray(c.handoffs[0].messages));
  assert.ok(c.handoffs[0].messages.length >= 1);
});

// ---------- 9: explicit id preserved ----------
test("explicit id is preserved", () => {
  const c = build([{ id: "my-id", fromStepId: "a.create", toStepId: "b.persist" }]);
  assert.ok(c.handoffs.some((h) => h.id === "my-id"));
});

// ---------- 10: derived id ----------
test("missing id derives deterministic slug-safe id", () => {
  const c1 = build([{ fromStepId: "a.create", toStepId: "b.persist", feature: "fix user" }]);
  const c2 = build([{ fromStepId: "a.create", toStepId: "b.persist", feature: "fix user" }]);
  const id = c1.handoffs[0].id;
  assert.equal(id, c2.handoffs[0].id, "deterministic");
  assert.match(id, /^handoff:a\.create:b\.persist:/);
  assert.doesNotMatch(id, /\s/, "slug-safe (no spaces)");
});

// ---------- 11: capability metadata ----------
test("capability metadata is preserved", () => {
  const c = build([{ fromStepId: "a.create", toStepId: "b.persist", capability: { verb: "save", noun: "user", domain: "d" } }]);
  assert.deepEqual(c.handoffs[0].capability, { verb: "save", noun: "user", domain: "d" });
});

// ---------- 12: event metadata ----------
test("event metadata is preserved", () => {
  const c = build([{ fromStepId: "a.create", toStepId: "b.persist", event: { name: "e", kind: "handoff_event" } }]);
  assert.deepEqual(c.handoffs[0].event, { name: "e", kind: "handoff_event" });
});

// ---------- 13: payload metadata ----------
test("payload metadata is preserved", () => {
  const c = build([{ fromStepId: "a.create", toStepId: "b.persist", payload: { schemaHint: "H" } }]);
  assert.equal(c.handoffs[0].payload.schemaHint, "H");
});

// ---------- 14: declared rows cite step evidence refs ----------
test("declared rows cite step evidence refs when available", () => {
  const c = build([{ fromStepId: "a.create", toStepId: "b.persist" }]);
  assert.ok(c.handoffs[0].evidenceRefs.some((r) => r.type === "EvidenceGraph" && r.id === "eg-1"));
});

// ---------- 15: summary counts ----------
test("summary counts total/declared/unresolvedStep/needsReview", () => {
  const c = build([
    { fromStepId: "a.create", toStepId: "b.persist" },
    { fromStepId: "a.create", toStepId: "missing" },
  ]);
  assert.deepEqual(c.summary, { total: 2, declared: 1, unresolvedStep: 1, needsReview: 0 });
});

// ---------- 16: deterministic ordering ----------
test("deterministic ordering (declared before unresolved-step)", () => {
  const c = build([
    { id: "z-unresolved", fromStepId: "a.create", toStepId: "missing" },
    { id: "a-declared", fromStepId: "a.create", toStepId: "b.persist" },
  ]);
  assert.equal(c.handoffs[0].status, "declared");
  assert.equal(c.handoffs[1].status, "unresolved-step");
});

// ---------- CLI integration (17-27) ----------

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
  const work = await mkdtemp(join(tmpdir(), "rekon-hc-"));
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

  const configPath = join(work, ".rekon/handoff-contracts.json");
  const configContent = JSON.stringify({
    version: "0.1.0",
    handoffs: [
      { id: "fixture.create-to-persist", fromStepId: "fixture.create-user", toStepId: "fixture.persist-user", feature: "fixture-user" },
      { fromStepId: "fixture.create-user", toStepId: "missing.step", feature: "fixture-missing" },
    ],
  }, null, 2);
  await writeFile(configPath, configContent, "utf8");

  const indexPath = join(work, ".rekon/registry/artifacts.index.json");
  const beforeIndex = await readFile(indexPath, "utf8");
  const configBefore = await readFile(configPath, "utf8");

  const graphRef = runCli(work, ["artifacts", "latest", "--type", "StepCapabilityGraph", "--id-only"]).stdout.trim();
  const buildResult = runCli(work, ["handoff", "contract", "build", "--step-graph", graphRef, "--json"]);

  const afterIndex = await readFile(indexPath, "utf8");
  const configAfter = await readFile(configPath, "utf8");
  const validateResult = runCli(work, ["artifacts", "validate", "--json"]);

  cachedWorkspace = {
    work,
    buildJson: JSON.parse(buildResult.stdout),
    beforeIndex,
    afterIndex,
    configBefore,
    configAfter,
    validateJson: JSON.parse(validateResult.stdout),
  };
  return cachedWorkspace;
}

test("CLI writes HandoffContract", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.buildJson.artifact.type, "HandoffContract");
  assert.ok(indexSnapshot(ws.afterIndex, "HandoffContract").length >= 1);
  assert.deepEqual(ws.buildJson.summary, { total: 2, declared: 1, unresolvedStep: 1, needsReview: 0 });
});

test("CLI supports pinned StepCapabilityGraph", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.buildJson.source.stepCapabilityGraphRef.type, "StepCapabilityGraph");
});

test("CLI does not mutate .rekon/handoff-contracts.json", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.configAfter, ws.configBefore);
});

test("CLI does not mutate StepCapabilityGraph", async () => {
  const ws = await getWorkspace();
  assert.deepEqual(indexSnapshot(ws.afterIndex, "StepCapabilityGraph"), indexSnapshot(ws.beforeIndex, "StepCapabilityGraph"));
});

test("CLI does not create HandoffCoverageReport", async () => {
  const ws = await getWorkspace();
  assert.equal(indexSnapshot(ws.afterIndex, "HandoffCoverageReport").length, 0);
});

test("CLI does not create RuntimeGraphObservationReport", async () => {
  const ws = await getWorkspace();
  assert.equal(indexSnapshot(ws.afterIndex, "RuntimeGraphObservationReport").length, 0);
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

test("CLI does not read runtime events (source cites only graph + config)", async () => {
  const ws = await getWorkspace();
  const allowed = new Set(["stepCapabilityGraphRef", "configPath", "configHash"]);
  for (const key of Object.keys(ws.buildJson.source)) {
    assert.ok(allowed.has(key), `unexpected source key: ${key}`);
  }
  assert.ok(ws.buildJson.source.stepCapabilityGraphRef, "cites the step graph");
});

test("artifacts validate remains clean", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.validateJson.valid, true);
  assert.equal((ws.validateJson.issues || []).length, 0);
  await rm(ws.work, { recursive: true, force: true });
});
