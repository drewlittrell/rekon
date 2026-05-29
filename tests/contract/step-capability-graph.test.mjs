// Contract tests for StepCapabilityGraph v1 (sixty-second slice on the
// capability-ontology track).
//
// StepCapabilityGraph v1 projects an EXPECTED WORKFLOW TOPOLOGY graph
// from EvidenceGraph + CapabilityMap v2 + CapabilityPhraseReport + an
// optional `.rekon/step-capability-map.json`. It models no runtime
// truth, no handoff coverage, and no drift; it declares no handoffs and
// mutates nothing.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  buildStepCapabilityGraph,
  parseStepCapabilityGraphConfig,
} from "../../packages/capability-model/dist/index.js";
import {
  validateStepCapabilityGraph,
} from "../../packages/kernel-repo-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "tests/fixtures/js-ts-ast-evidence");

const EVIDENCE_REF = { type: "EvidenceGraph", id: "eg-1", schemaVersion: "0.1.0" };

function header() {
  return {
    artifactType: "StepCapabilityGraph",
    artifactId: "step-capability-graph-test-1",
    schemaVersion: "0.1.0",
    generatedAt: "2026-05-29T00:00:00.000Z",
    subject: { repoId: "test" },
    producer: { id: "@rekon/test", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
    provenance: { confidence: 0.85 },
  };
}

function sampleMap() {
  return {
    entries: [
      { capability: "create user", subjects: ["src/users/create.ts"], systems: ["users"], evidence: [EVIDENCE_REF] },
      { capability: "delete user", subjects: ["src/users/delete.ts"], systems: ["users"], evidence: [EVIDENCE_REF] },
    ],
    phraseBackedCapabilities: [
      { id: "capability-phrase:create-user", verb: "create", noun: "user", domain: "users", evidenceRefs: [EVIDENCE_REF] },
      { id: "capability-phrase:delete-user", verb: "delete", noun: "user", domain: "users", evidenceRefs: [EVIDENCE_REF] },
      { id: "capability-phrase:send-email", verb: "send", noun: "email", domain: "notifications", evidenceRefs: [EVIDENCE_REF] },
      { id: "capability-phrase:do-thing", verb: "do", noun: "thing", evidenceRefs: [EVIDENCE_REF] },
    ],
  };
}

// ---------- 1: validates ----------

test("StepCapabilityGraph validates", () => {
  const graph = buildStepCapabilityGraph({ header: header(), capabilityMap: sampleMap() });
  assert.equal(validateStepCapabilityGraph(graph).ok, true);
});

// ---------- 2: missing config is valid ----------

test("missing config is valid", () => {
  const graph = buildStepCapabilityGraph({ header: header(), capabilityMap: sampleMap() });
  assert.equal(validateStepCapabilityGraph(graph).ok, true);
  assert.equal(graph.source.configPath, undefined);
});

// ---------- 3: invalid config fails clearly ----------

test("invalid config fails clearly", () => {
  assert.throws(() => parseStepCapabilityGraphConfig({ version: "9.9.9" }), /version/);
  assert.throws(() => parseStepCapabilityGraphConfig({ version: "0.1.0", steps: [{}] }), /id/);
  assert.throws(() => parseStepCapabilityGraphConfig("nope"), /object/);
  // A valid config parses.
  const ok = parseStepCapabilityGraphConfig({ version: "0.1.0", steps: [{ id: "a" }] });
  assert.equal(ok.version, "0.1.0");
});

// ---------- 4: no phrase-backed capabilities -> valid, zero counts ----------

test("graph with no phrase-backed capabilities is valid and has zero counts", () => {
  const graph = buildStepCapabilityGraph({ header: header() });
  assert.equal(validateStepCapabilityGraph(graph).ok, true);
  assert.deepEqual(graph.summary, {
    steps: 0,
    capabilityEdges: 0,
    fileEdges: 0,
    systemEdges: 0,
    unresolvedCapabilities: 0,
    handoffPlaceholders: 0,
  });
});

// ---------- 5: configured step source = configured ----------

test("configured step is emitted with source configured", () => {
  const config = { version: "0.1.0", steps: [{ id: "create-flow", capabilities: [{ verb: "create", noun: "user" }] }] };
  const graph = buildStepCapabilityGraph({ header: header(), capabilityMap: sampleMap(), config });
  const step = graph.steps.find((s) => s.id === "create-flow");
  assert.ok(step, "create-flow step exists");
  assert.equal(step.source, "configured");
});

// ---------- 6: derived step when no config matches ----------

test("derived step is emitted when no config matches", () => {
  const graph = buildStepCapabilityGraph({ header: header(), capabilityMap: sampleMap() });
  const derived = graph.steps.filter((s) => s.source === "derived");
  assert.ok(derived.length >= 1, "at least one derived step");
  assert.ok(derived.some((s) => s.id === "step:domain:users"));
});

// ---------- 7: mixed step when config + derived both contribute ----------

test("mixed step is emitted when config and derived evidence both contribute", () => {
  const config = {
    version: "0.1.0",
    steps: [{ id: "users-flow", capabilities: [{ verb: "create", noun: "user" }], paths: ["src/users/"] }],
  };
  const graph = buildStepCapabilityGraph({ header: header(), capabilityMap: sampleMap(), config });
  const step = graph.steps.find((s) => s.id === "users-flow");
  assert.ok(step);
  // create-user matched by declared capability; delete-user matched by
  // path (src/users/delete.ts startsWith src/users/) -> mixed.
  assert.equal(step.source, "mixed");
});

// ---------- 8: capability match uses verb+noun ----------

test("capability match uses verb+noun", () => {
  const config = { version: "0.1.0", steps: [{ id: "s", capabilities: [{ verb: "create", noun: "user" }] }] };
  const graph = buildStepCapabilityGraph({ header: header(), capabilityMap: sampleMap(), config });
  const edge = graph.capabilityEdges.find((e) => e.stepId === "s" && e.phraseCapabilityId === "capability-phrase:create-user");
  assert.ok(edge, "create-user edge attached to configured step");
  assert.equal(edge.source, "config");
});

// ---------- 9: capability match optionally uses domain ----------

test("capability match optionally uses domain", () => {
  const matching = { version: "0.1.0", steps: [{ id: "s", capabilities: [{ verb: "create", noun: "user", domain: "users" }] }] };
  const g1 = buildStepCapabilityGraph({ header: header(), capabilityMap: sampleMap(), config: matching });
  assert.ok(g1.capabilityEdges.some((e) => e.stepId === "s" && e.phraseCapabilityId === "capability-phrase:create-user" && e.source === "config"));

  const mismatching = { version: "0.1.0", steps: [{ id: "s", capabilities: [{ verb: "create", noun: "user", domain: "WRONG" }] }] };
  const g2 = buildStepCapabilityGraph({ header: header(), capabilityMap: sampleMap(), config: mismatching });
  // domain mismatch -> not a declared (config) match for that step.
  assert.ok(!g2.capabilityEdges.some((e) => e.stepId === "s" && e.phraseCapabilityId === "capability-phrase:create-user" && e.source === "config"));
});

// ---------- 10: path match attaches file edge ----------

test("path match attaches file edge", () => {
  const config = { version: "0.1.0", steps: [{ id: "s", paths: ["src/users/"] }] };
  const graph = buildStepCapabilityGraph({ header: header(), capabilityMap: sampleMap(), config });
  // delete-user maps to v1 entry "delete user" subjects ["src/users/delete.ts"].
  const fileEdge = graph.fileEdges.find((e) => e.stepId === "s" && e.path === "src/users/delete.ts");
  assert.ok(fileEdge, "file edge attached via path match");
  assert.equal(fileEdge.source, "evidence");
});

// ---------- 11: system match attaches system edge ----------

test("system match attaches system edge", () => {
  const config = { version: "0.1.0", steps: [{ id: "s", systems: ["users"] }] };
  const graph = buildStepCapabilityGraph({ header: header(), capabilityMap: sampleMap(), config });
  const sysEdge = graph.systemEdges.find((e) => e.stepId === "s" && e.system === "users");
  assert.ok(sysEdge, "system edge attached");
});

// ---------- 12: deterministic order capability > path > system ----------

test("deterministic matching order prefers capability over path over system", () => {
  const config = {
    version: "0.1.0",
    steps: [
      { id: "byPath", paths: ["src/users/"] },
      { id: "byCapability", capabilities: [{ verb: "create", noun: "user" }] },
    ],
  };
  const graph = buildStepCapabilityGraph({ header: header(), capabilityMap: sampleMap(), config });
  // create-user could match byPath (src/users/create.ts) or byCapability;
  // capability (rank 3) wins.
  const edge = graph.capabilityEdges.find((e) => e.phraseCapabilityId === "capability-phrase:create-user");
  assert.ok(edge);
  assert.equal(edge.stepId, "byCapability");
});

// ---------- 13: ties resolve deterministically ----------

test("ties resolve deterministically", () => {
  const config = {
    version: "0.1.0",
    steps: [
      { id: "first", capabilities: [{ verb: "create", noun: "user" }] },
      { id: "second", capabilities: [{ verb: "create", noun: "user" }] },
    ],
  };
  const graph = buildStepCapabilityGraph({ header: header(), capabilityMap: sampleMap(), config });
  const edge = graph.capabilityEdges.find((e) => e.phraseCapabilityId === "capability-phrase:create-user");
  assert.ok(edge);
  assert.equal(edge.stepId, "first");
});

// ---------- 14: capability edges cite evidence refs ----------

test("capability edges cite evidence refs", () => {
  const graph = buildStepCapabilityGraph({ header: header(), capabilityMap: sampleMap() });
  assert.ok(graph.capabilityEdges.length > 0);
  for (const edge of graph.capabilityEdges) {
    assert.ok(edge.evidenceRefs.length >= 1, `edge ${edge.id} cites evidence`);
  }
});

// ---------- 15: file edges cite evidence refs or config source ----------

test("file edges cite evidence refs or config source", () => {
  const config = { version: "0.1.0", steps: [{ id: "s", capabilities: [{ verb: "create", noun: "user" }], paths: ["src/users/"] }] };
  const graph = buildStepCapabilityGraph({ header: header(), capabilityMap: sampleMap(), config });
  assert.ok(graph.fileEdges.length > 0);
  for (const edge of graph.fileEdges) {
    assert.ok(edge.source === "config" || edge.evidenceRefs.length >= 1, `file edge ${edge.id} cites evidence or is config-sourced`);
  }
});

// ---------- 16: system edges cite evidence refs or config source ----------

test("system edges cite evidence refs or config source", () => {
  const config = { version: "0.1.0", steps: [{ id: "s", capabilities: [{ verb: "create", noun: "user" }], systems: ["users"] }] };
  const graph = buildStepCapabilityGraph({ header: header(), capabilityMap: sampleMap(), config });
  assert.ok(graph.systemEdges.length > 0);
  for (const edge of graph.systemEdges) {
    assert.ok(edge.source === "config" || edge.evidenceRefs.length >= 1, `system edge ${edge.id} cites evidence or is config-sourced`);
  }
});

// ---------- 17: unresolved capability when assignment unsafe ----------

test("unresolved capability emitted when assignment unsafe", () => {
  const graph = buildStepCapabilityGraph({ header: header(), capabilityMap: sampleMap() });
  // do-thing has no domain and no config -> cannot be safely assigned.
  assert.ok(graph.unresolvedCapabilities.some((u) => u.phraseCapabilityId === "capability-phrase:do-thing"));
});

// ---------- 18: handoffPlaceholders exists but no declared handoff ----------

test("handoffPlaceholders exists but no declared handoff is emitted in v1", () => {
  const graph = buildStepCapabilityGraph({ header: header(), capabilityMap: sampleMap() });
  assert.ok(Array.isArray(graph.handoffPlaceholders));
  assert.equal(graph.handoffPlaceholders.length, 0);
  assert.equal(graph.summary.handoffPlaceholders, 0);
});

// ---------- CLI integration (19-28) ----------

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
  const work = await mkdtemp(join(tmpdir(), "rekon-scg-"));
  await cp(exampleRoot, work, { recursive: true });
  await rm(join(work, ".rekon"), { recursive: true, force: true });
  runCli(work, ["init"]);
  runCli(work, ["refresh", "--json"]);
  runCli(work, ["capability", "ontology", "normalize", "--json"]);
  const nref = runCli(work, ["artifacts", "latest", "--type", "CapabilityNormalizationReport", "--id-only"]).stdout.trim();
  runCli(work, ["capability", "phrase", "project", "--report", nref, "--json"]);
  runCli(work, ["refresh", "--json"]);

  await mkdir(join(work, ".rekon"), { recursive: true });
  const configPath = join(work, ".rekon/step-capability-map.json");
  const configContent = JSON.stringify({
    version: "0.1.0",
    steps: [{ id: "fixture.create-user", label: "Create User", capabilities: [{ verb: "create", noun: "user" }], paths: ["src/"], systems: ["fixture"] }],
  }, null, 2);
  await writeFile(configPath, configContent, "utf8");

  const indexPath = join(work, ".rekon/registry/artifacts.index.json");
  const beforeIndex = await readFile(indexPath, "utf8");
  const configBefore = await readFile(configPath, "utf8");

  const mapRef = runCli(work, ["artifacts", "latest", "--type", "CapabilityMap", "--id-only"]).stdout.trim();
  const buildResult = runCli(work, ["step", "graph", "build", "--capability-map", mapRef, "--json"]);

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

test("CLI writes StepCapabilityGraph", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.buildJson.artifact.type, "StepCapabilityGraph");
  assert.ok(indexSnapshot(ws.afterIndex, "StepCapabilityGraph").length >= 1);
});

test("CLI supports pinned input refs", async () => {
  const ws = await getWorkspace();
  // The build was invoked with --capability-map <ref>; it produced a graph.
  assert.ok(ws.buildJson.source.capabilityMapRef);
  assert.equal(ws.buildJson.source.capabilityMapRef.type, "CapabilityMap");
});

test("CLI does not mutate .rekon/step-capability-map.json", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.configAfter, ws.configBefore);
});

test("CLI does not mutate EvidenceGraph", async () => {
  const ws = await getWorkspace();
  assert.deepEqual(indexSnapshot(ws.afterIndex, "EvidenceGraph"), indexSnapshot(ws.beforeIndex, "EvidenceGraph"));
});

test("CLI does not mutate CapabilityMap", async () => {
  const ws = await getWorkspace();
  assert.deepEqual(indexSnapshot(ws.afterIndex, "CapabilityMap"), indexSnapshot(ws.beforeIndex, "CapabilityMap"));
});

test("CLI does not mutate CapabilityPhraseReport", async () => {
  const ws = await getWorkspace();
  assert.deepEqual(indexSnapshot(ws.afterIndex, "CapabilityPhraseReport"), indexSnapshot(ws.beforeIndex, "CapabilityPhraseReport"));
});

test("CLI does not create HandoffContract", async () => {
  const ws = await getWorkspace();
  assert.equal(indexSnapshot(ws.afterIndex, "HandoffContract").length, 0);
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
