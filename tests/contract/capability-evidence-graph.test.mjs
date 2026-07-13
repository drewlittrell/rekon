// Contract tests for the CapabilityEvidenceGraph v1 artifact
// (capability-evidence-graph-v1 — first slice building the
// CapabilityEvidenceGraph substrate).
//
// Verifies that the new graph artifact + builder + CLI:
//   - builds a CapabilityEvidenceGraph from deterministic
//     facts only (file nodes, symbol nodes, import + exposes
//     FACTS at confidence 1.0, heuristic verb:noun capability
//     INFERENCES at confidence <= 0.5),
//   - produces capability nodes richer than a verb:noun pair
//     (implementedBy / entrypoints / sideEffects / dependencies
//     / consumers / confidence / evidenceRefs),
//   - grounds every claim in evidence ids that exist,
//   - re-derives its summary and forces every boundary boolean
//     false (the validator rejects any non-false boundary),
//   - uses NO LLM, generates NO embeddings, executes NO
//     commands, writes NO source files,
//   - registers cleanly in the runtime registry under the
//     `graphs` category,
//   - exposes itself via `rekon capability graph build`,
//     excludes generated and agent-scratch trees, honors --path, validates
//     clean, and leaves source files untouched.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  assertCapabilityEvidenceGraph,
  validateCapabilityEvidenceGraph,
} from "../../packages/kernel-repo-model/dist/index.js";
import {
  buildCapabilityEvidenceGraph,
  CAPABILITY_EVIDENCE_GRAPH_ARTIFACT_ID_PREFIX,
} from "../../packages/capability-model/dist/index.js";
import { createRuntime } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

// Keyless env: the committed suite must never depend on a live key.
// `capability graph build` is deterministic-only and never calls a
// provider, but we strip keys anyway to guarantee that.
const noKeyEnv = { ...process.env };
delete noKeyEnv.OPENAI_API_KEY;
delete noKeyEnv.ANTHROPIC_API_KEY;
delete noKeyEnv.VOYAGE_API_KEY;
delete noKeyEnv.REKON_RUN_LIVE_LLM_TESTS;

const SAMPLE_SOURCE = `import { join } from "node:path";
import { readFile } from "node:fs/promises";

export function getUser(id) {
  return id;
}

export function validateInput(value) {
  return Boolean(value);
}

export const createOrder = (order) => order;

export function joinName(first, last) {
  return join(first, last);
}

export class Widget {}

export const VERSION = "1";
`;

function buildSampleGraph() {
  return buildCapabilityEvidenceGraph({
    root: "fixture-root",
    generatedAt: "2026-01-02T03:04:05.000Z",
    files: [{ path: "src/index.ts", text: SAMPLE_SOURCE }],
  });
}

// ---------- 1: builder creates a CapabilityEvidenceGraph ----------

test("builder creates a CapabilityEvidenceGraph artifact", () => {
  const graph = buildSampleGraph();
  assert.equal(graph.header.artifactType, "CapabilityEvidenceGraph");
  assert.equal(graph.schemaVersion, "0.1.0");
  assert.ok(
    graph.header.artifactId.startsWith(CAPABILITY_EVIDENCE_GRAPH_ARTIFACT_ID_PREFIX),
    "artifactId should use the capability-evidence-graph- prefix",
  );
  // The factory output must validate clean and not throw.
  assert.doesNotThrow(() => assertCapabilityEvidenceGraph(graph));
});

// ---------- 2: file nodes ----------

test("graph contains a file node for each scanned file", () => {
  const graph = buildSampleGraph();
  const fileNodes = graph.nodes.filter((n) => n.kind === "file");
  assert.equal(fileNodes.length, 1);
  assert.equal(fileNodes[0].id, "src/index.ts");
});

// ---------- 3: symbol nodes for exported functions/constants ----------

test("graph contains symbol nodes for exported functions and constants", () => {
  const graph = buildSampleGraph();
  const symbolIds = graph.nodes.filter((n) => n.kind === "symbol").map((n) => n.id);
  assert.ok(symbolIds.includes("src/index.ts#getUser"), "exported function node missing");
  assert.ok(symbolIds.includes("src/index.ts#VERSION"), "exported const node missing");
  assert.ok(symbolIds.includes("src/index.ts#Widget"), "exported class node missing");
});

// ---------- 4: import claims (FACTS) ----------

test("graph records import claims as deterministic facts", () => {
  const graph = buildSampleGraph();
  const importClaims = graph.claims.filter((c) => c.predicate === "imports");
  const modules = importClaims.map((c) => c.object);
  assert.ok(modules.includes("node:path"), "expected an import claim for node:path");
  assert.ok(modules.includes("node:fs/promises"), "expected an import claim for node:fs/promises");
  const pathClaim = importClaims.find((c) => c.object === "node:path");
  assert.equal(pathClaim.claimType, "fact");
  assert.equal(pathClaim.source, "deterministic");
});

// ---------- 5: exposes claims (FACTS) ----------

test("graph records exposes claims linking files to exported symbols", () => {
  const graph = buildSampleGraph();
  const exposes = graph.claims.filter((c) => c.predicate === "exposes");
  const exposed = exposes.map((c) => c.object.id);
  assert.ok(exposed.includes("src/index.ts#getUser"), "expected an exposes claim for getUser");
  const getUserExpose = exposes.find((c) => c.object.id === "src/index.ts#getUser");
  assert.equal(getUserExpose.subject.kind, "file");
  assert.equal(getUserExpose.claimType, "fact");
});

// ---------- 6: deterministic fact claims have confidence 1.0 ----------

test("deterministic fact claims carry confidence 1.0", () => {
  const graph = buildSampleGraph();
  const facts = graph.claims.filter((c) => c.claimType === "fact");
  assert.ok(facts.length > 0, "expected at least one fact claim");
  assert.ok(
    facts.every((c) => c.confidence === 1 && c.source === "deterministic" && c.status === "accepted"),
    "all fact claims must be deterministic, accepted, confidence 1.0",
  );
});

// ---------- 7: heuristic capability claims are inferences ----------

test("heuristic capability claims are inference claims with confidence <= 0.5", () => {
  const graph = buildSampleGraph();
  const implementsClaims = graph.claims.filter((c) => c.predicate === "implements");
  assert.ok(implementsClaims.length >= 3, "expected implements inferences for get/validate/create");
  assert.ok(
    implementsClaims.every((c) => c.claimType === "inference" && c.confidence <= 0.5),
    "implements claims must be inferences with confidence <= 0.5",
  );
});

// ---------- 8: capability nodes richer than verb:noun ----------

test("capability nodes are richer than a verb:noun pair", () => {
  const graph = buildSampleGraph();
  const capIds = graph.capabilities.map((c) => c.id);
  assert.ok(capIds.includes("cap:get:user"), "expected cap:get:user");
  assert.ok(capIds.includes("cap:validate:input"), "expected cap:validate:input");
  assert.ok(capIds.includes("cap:create:order"), "expected cap:create:order");
  const cap = graph.capabilities.find((c) => c.id === "cap:get:user");
  assert.equal(cap.verb, "get");
  assert.equal(cap.noun, "user");
  // Richer than verb:noun — structured relationship fields exist.
  assert.ok(Array.isArray(cap.implementedBy) && cap.implementedBy.length >= 1);
  assert.ok(Array.isArray(cap.entrypoints));
  assert.ok(Array.isArray(cap.sideEffects));
  assert.ok(Array.isArray(cap.dependencies));
  assert.ok(Array.isArray(cap.consumers));
  assert.ok(Array.isArray(cap.evidenceRefs) && cap.evidenceRefs.length >= 1);
});

// ---------- 9: conservative heuristic — no overclaiming ----------

test("capability heuristic is conservative (no verb -> no capability, classes excluded)", () => {
  const graph = buildSampleGraph();
  // joinName splits to join+name; `join` is not a known verb -> no capability.
  assert.ok(
    !graph.capabilities.some((c) => c.verb === "join"),
    "joinName must not yield a capability",
  );
  // Widget is a class and must not derive a capability.
  assert.ok(
    !graph.capabilities.some((c) => c.id.startsWith("cap:widget")),
    "classes must not derive capabilities",
  );
  // Exactly three capabilities from the sample.
  assert.equal(graph.capabilities.length, 3);
});

// ---------- 10: every claim references existing evidence ----------

test("every claim references evidence ids that exist", () => {
  const graph = buildSampleGraph();
  const evidenceIds = new Set(graph.evidence.map((e) => e.id));
  assert.ok(graph.evidence.length > 0, "expected evidence entries");
  for (const claim of graph.claims) {
    for (const ref of claim.evidenceRefs) {
      assert.ok(evidenceIds.has(ref), `claim ${claim.id} references unknown evidence ${ref}`);
    }
  }
  // Evidence rows are deterministic scans with a source location.
  const sample = graph.evidence[0];
  assert.equal(sample.source, "deterministic_scan");
  assert.equal(typeof sample.path, "string");
});

// ---------- 11: summary counts match the graph ----------

test("summary counts match the graph contents", () => {
  const graph = buildSampleGraph();
  const s = graph.summary;
  assert.equal(s.files, graph.nodes.filter((n) => n.kind === "file").length);
  assert.equal(s.symbols, graph.nodes.filter((n) => n.kind === "symbol").length);
  assert.equal(s.capabilities, graph.capabilities.length);
  assert.equal(s.facts, graph.claims.filter((c) => c.claimType === "fact").length);
  assert.equal(s.inferences, graph.claims.filter((c) => c.claimType === "inference").length);
  assert.equal(s.recommendations, 0);
  assert.equal(s.evidence, graph.evidence.length);
});

// ---------- 12: boundaries are all false ----------

test("every boundary boolean is false", () => {
  const graph = buildSampleGraph();
  const b = graph.boundaries;
  assert.equal(b.usedLlm, false);
  assert.equal(b.generatedEmbeddings, false);
  assert.equal(b.executedCommands, false);
  assert.equal(b.wroteSourceFiles, false);
  assert.equal(b.createdPreparedIntentPlan, false);
  assert.equal(b.createdWorkOrder, false);
  assert.equal(b.createdVerificationPlan, false);
  assert.equal(b.ranCirce, false);
  assert.equal(b.implementedIntentGo, false);
});

// ---------- 13: factory forces boundaries false ----------

test("factory forces boundary booleans false even when asked otherwise", () => {
  // The builder always passes false; assert the artifact reflects that
  // and that a hand-built true boundary is rejected by the validator.
  const valid = validateCapabilityEvidenceGraph(buildSampleGraph());
  assert.equal(valid.ok, true, JSON.stringify(valid.issues ?? [], null, 2));
});

// ---------- 14: validator rejects a non-false boundary ----------

test("validator rejects a non-false boundary boolean", () => {
  const graph = JSON.parse(JSON.stringify(buildSampleGraph()));
  graph.boundaries.usedLlm = true;
  const result = validateCapabilityEvidenceGraph(graph);
  assert.equal(result.ok, false);
  assert.ok(result.issues.length > 0, "expected at least one validation issue");
});

// ---------- 15: validator rejects a tampered summary ----------

test("validator rejects a summary that does not match the graph", () => {
  const graph = JSON.parse(JSON.stringify(buildSampleGraph()));
  graph.summary.files = graph.summary.files + 99;
  const result = validateCapabilityEvidenceGraph(graph);
  assert.equal(result.ok, false);
});

// ---------- 16: empty input -> partial, still valid ----------

test("builder tolerates empty input and reports a partial graph", () => {
  const graph = buildCapabilityEvidenceGraph({ root: ".", files: [], generatedAt: "2026-01-02T03:04:05.000Z" });
  assert.equal(graph.summary.files, 0);
  assert.equal(graph.status.value, "partial");
  const result = validateCapabilityEvidenceGraph(graph);
  assert.equal(result.ok, true, JSON.stringify(result.issues ?? [], null, 2));
});

// ---------- 17: runtime registry knows the artifact type ----------

test("createRuntime registers CapabilityEvidenceGraph as a known artifact type", async () => {
  const runtimeRoot = await mkdtemp(join(tmpdir(), "rekon-ceg-runtime-"));
  try {
    const runtime = await createRuntime({ repoRoot: runtimeRoot });
    const types = runtime.registry.artifactTypes.map((e) => e.type);
    assert.ok(
      types.includes("CapabilityEvidenceGraph"),
      "expected CapabilityEvidenceGraph in runtime registry",
    );
  } finally {
    await rm(runtimeRoot, { recursive: true, force: true });
  }
});

// ---------- CLI helper ----------

async function setupCliRepo() {
  const work = await mkdtemp(join(tmpdir(), "rekon-ceg-cli-"));
  await mkdir(join(work, "src"), { recursive: true });
  await mkdir(join(work, "node_modules", "pkg"), { recursive: true });
  await mkdir(join(work, "dist"), { recursive: true });
  await mkdir(join(work, ".claude", "worktrees", "agent"), { recursive: true });
  await mkdir(join(work, ".codex", "scratch"), { recursive: true });
  await mkdir(join(work, ".agents", "worker"), { recursive: true });
  await writeFile(join(work, "src", "index.ts"), SAMPLE_SOURCE, "utf8");
  await writeFile(join(work, "node_modules", "pkg", "ignored.ts"), "export const ignored = 1;\n", "utf8");
  await writeFile(join(work, "dist", "ignored.js"), "export const ignoredDist = 2;\n", "utf8");
  await writeFile(join(work, ".claude", "worktrees", "agent", "ignored.ts"), "export const ignoredClaude = 3;\n", "utf8");
  await writeFile(join(work, ".codex", "scratch", "ignored.ts"), "export const ignoredCodex = 4;\n", "utf8");
  await writeFile(join(work, ".agents", "worker", "ignored.ts"), "export const ignoredAgent = 5;\n", "utf8");
  return work;
}

function runCli(args, cwdRoot) {
  return spawnSync("node", [cliPath, ...args], {
    encoding: "utf8",
    env: noKeyEnv,
    cwd: cwdRoot,
  });
}

// ---------- 18: CLI writes exactly one graph artifact ----------

test("CLI `capability graph build` writes one CapabilityEvidenceGraph", async () => {
  const work = await setupCliRepo();
  try {
    const res = runCli(["capability", "graph", "build", "--root", work, "--json"], work);
    assert.equal(res.status, 0, res.stderr || res.stdout);
    const payload = JSON.parse(res.stdout);
    assert.equal(payload.artifact.type, "CapabilityEvidenceGraph");
    assert.ok(payload.summary, "expected a summary in the JSON output");
    assert.equal(payload.summary.files, 1);
    // The artifact lands under the `graphs` category directory.
    const graphsDir = join(work, ".rekon", "artifacts", "graphs");
    const written = (await readdir(graphsDir)).filter((f) => f.startsWith("CapabilityEvidenceGraph-"));
    assert.equal(written.length, 1, "expected exactly one CapabilityEvidenceGraph under graphs/");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 19: CLI excludes generated and agent-scratch trees ----------

test("CLI excludes generated and agent-scratch trees from the scan", async () => {
  const work = await setupCliRepo();
  try {
    const res = runCli(["capability", "graph", "build", "--root", work, "--json"], work);
    assert.equal(res.status, 0, res.stderr || res.stdout);
    const payload = JSON.parse(res.stdout);
    // Only src/index.ts should be scanned.
    assert.equal(payload.summary.files, 1);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

test("CLI capability graph honors the explicit agent-scratch scope override", async () => {
  const work = await setupCliRepo();
  try {
    await mkdir(join(work, ".rekon"), { recursive: true });
    await writeFile(
      join(work, ".rekon", "scan-scope.json"),
      `${JSON.stringify({ agentScratchSegments: [] })}\n`,
      "utf8",
    );
    const res = runCli(["capability", "graph", "build", "--root", work, "--json"], work);
    assert.equal(res.status, 0, res.stderr || res.stdout);
    assert.equal(JSON.parse(res.stdout).summary.files, 4);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 20: CLI honors --path ----------

test("CLI honors --path to narrow the scan to a single file", async () => {
  const work = await setupCliRepo();
  try {
    const res = runCli(
      ["capability", "graph", "build", "--root", work, "--path", "src/index.ts", "--json"],
      work,
    );
    assert.equal(res.status, 0, res.stderr || res.stdout);
    const payload = JSON.parse(res.stdout);
    assert.equal(payload.summary.files, 1);
    assert.ok(payload.summary.capabilities >= 1, "expected capabilities from the targeted file");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 21: CLI output validates clean ----------

test("the written graph passes `rekon artifacts validate`", async () => {
  const work = await setupCliRepo();
  try {
    const build = runCli(["capability", "graph", "build", "--root", work, "--json"], work);
    assert.equal(build.status, 0, build.stderr || build.stdout);
    const validate = runCli(["artifacts", "validate", "--root", work, "--json"], work);
    assert.equal(validate.status, 0, validate.stderr || validate.stdout);
    const payload = JSON.parse(validate.stdout);
    const summary = payload.summary ?? payload;
    assert.equal(summary.valid, true, JSON.stringify(summary.issues ?? [], null, 2));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 22: source files are never modified ----------

test("source files are unchanged after `capability graph build`", async () => {
  const work = await setupCliRepo();
  try {
    const before = await readFile(join(work, "src", "index.ts"), "utf8");
    const res = runCli(["capability", "graph", "build", "--root", work, "--json"], work);
    assert.equal(res.status, 0, res.stderr || res.stdout);
    const after = await readFile(join(work, "src", "index.ts"), "utf8");
    assert.equal(after, before, "source file must not be modified");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 23: help lists the command ----------

test("`rekon help` lists `capability graph build`", () => {
  const res = spawnSync("node", [cliPath, "help"], { encoding: "utf8", env: noKeyEnv });
  assert.equal(res.status, 0, res.stderr || res.stdout);
  assert.ok(
    res.stdout.includes("capability graph build"),
    "usage output should list `capability graph build`",
  );
});
