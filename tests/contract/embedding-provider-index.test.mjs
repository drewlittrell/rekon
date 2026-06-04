// Contract tests for Embedding Provider / Index v1 (slice 159).
//
// Verifies the first Rekon embedding provider + cache/index capability:
//   - the Voyage embedding provider adapter exists, refuses cleanly with no
//     API key (ok:false, no network, no throw), and works with an injected
//     fetch (success + failure) — never throwing a raw provider error,
//   - the mock embedding provider returns vectors for offline/test use,
//   - DERIVED embedding chunks have stable ids and a content identity
//     (path + kind + sha256 of derived text — never raw whole-file source),
//   - the cache/index classifies new / stale (sha change) / policy-changed
//     (provider/model/dimensions/policy change) and reuses the rest, so a
//     stale embedding is NEVER used silently,
//   - `rekon embeddings index` writes ONLY under `.rekon/cache/embeddings`,
//     fails cleanly on a missing key (no false success, no vectors), and
//     reuses unchanged chunks,
//   - `rekon embeddings query` returns nearest cached chunks as
//     proposal/context (not proof),
//   - `rekon capability graph build --embedding-similarity latest` folds
//     cached neighbors in as `embedding_similarity` evidence + `embedding`
//     claims while keeping every boundary (incl. generatedEmbeddings) false;
//     a default graph build has NONE,
//   - the embeddings commands execute NO commands, write NO source files,
//     and create NO PreparedIntentPlan / WorkOrder / VerificationPlan / Circe
//     artifacts; all written artifacts validate clean.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  createVoyageEmbeddingProvider,
  createMockEmbeddingProvider,
  VOYAGE_DEFAULT_MODEL,
  VOYAGE_DEFAULT_DIMENSIONS,
} from "../../packages/llm-provider/dist/index.js";
import {
  buildCapabilityEvidenceGraph,
  buildEmbeddingChunks,
  classifyEmbeddingChunks,
  computeEmbeddingIndexKey,
  embeddingVectorRef,
  embeddingChunkGraphRef,
  cosineSimilarity,
  EMBEDDING_POLICY_VERSION,
} from "../../packages/capability-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

// Keyless env: the committed suite must NEVER depend on a live key.
const noKeyEnv = { ...process.env };
delete noKeyEnv.OPENAI_API_KEY;
delete noKeyEnv.ANTHROPIC_API_KEY;
delete noKeyEnv.VOYAGE_API_KEY;
delete noKeyEnv.REKON_RUN_LIVE_LLM_TESTS;
delete noKeyEnv.REKON_RUN_LIVE_EMBEDDING_TESTS;

const SAMPLE_SOURCE = `export function getUser(id) {
  return { id };
}

export function createOrder(userId, total) {
  return { userId, total };
}
`;

function sampleGraph(source = SAMPLE_SOURCE) {
  return buildCapabilityEvidenceGraph({
    root: "fixture-root",
    generatedAt: "2026-01-02T03:04:05.000Z",
    files: [{ path: "src/index.ts", text: source }],
  });
}

function fakeFetchOk(dimensions = 4) {
  return async (_url, init) => {
    const body = JSON.parse(init.body);
    const data = body.input.map((_text, i) => ({ embedding: Array.from({ length: dimensions }, (_v, j) => (i + j) / 10) }));
    return { ok: true, status: 200, async text() { return JSON.stringify({ data, model: body.model }); } };
  };
}

function fakeFetchHttpError(status = 500) {
  return async () => ({ ok: false, status, async text() { return "provider exploded"; } });
}

function runCli(args, cwdRoot) {
  return spawnSync("node", [cliPath, ...args], { encoding: "utf8", env: noKeyEnv, cwd: cwdRoot });
}

async function setupRepo() {
  const work = await mkdtemp(join(tmpdir(), "rekon-embed-"));
  await mkdir(join(work, "src"), { recursive: true });
  await writeFile(join(work, "package.json"), `${JSON.stringify({ name: "embed-fixture", version: "0.0.0", type: "module" }, null, 2)}\n`, "utf8");
  await writeFile(join(work, "src", "index.js"), SAMPLE_SOURCE, "utf8");
  return work;
}

// ---------- 1: Voyage provider factory exists ----------
test("createVoyageEmbeddingProvider returns a provider with id + embed()", () => {
  const provider = createVoyageEmbeddingProvider();
  assert.equal(provider.id, "voyage");
  assert.equal(typeof provider.embed, "function");
  assert.equal(VOYAGE_DEFAULT_MODEL, "voyage-code-3");
  assert.equal(VOYAGE_DEFAULT_DIMENSIONS, 1024);
});

// ---------- 2: missing key -> clean ok:false, no throw, no network ----------
test("Voyage with no API key returns ok:false missing-api-key and never calls fetch", async () => {
  let called = false;
  const provider = createVoyageEmbeddingProvider({ apiKey: "", fetchImpl: async () => { called = true; throw new Error("should not be called"); } });
  const result = await provider.embed({ task: "code.embedding", texts: ["hello"] });
  assert.equal(result.ok, false);
  assert.equal(result.error, "missing-api-key");
  assert.equal(called, false, "missing key must short-circuit before any network call");
});

// ---------- 3: injected fetch success ----------
test("Voyage with injected fetch returns vectors on success", async () => {
  const provider = createVoyageEmbeddingProvider({ apiKey: "k", fetchImpl: fakeFetchOk(4) });
  const result = await provider.embed({ task: "code.embedding", texts: ["a", "b"] });
  assert.equal(result.ok, true);
  assert.equal(result.vectors.length, 2);
  assert.equal(result.vectors[0].length, 4);
});

// ---------- 4: injected fetch failure -> clean ok:false, no throw ----------
test("Voyage with injected HTTP error returns ok:false http-<status> without throwing", async () => {
  const provider = createVoyageEmbeddingProvider({ apiKey: "k", fetchImpl: fakeFetchHttpError(503) });
  const result = await provider.embed({ task: "code.embedding", texts: ["a"] });
  assert.equal(result.ok, false);
  assert.equal(result.error, "http-503");
});

// ---------- 5: empty texts -> ok:true with empty vectors ----------
test("Voyage with empty texts returns ok:true vectors:[] without a network call", async () => {
  let called = false;
  const provider = createVoyageEmbeddingProvider({ apiKey: "k", fetchImpl: async () => { called = true; return { ok: true, status: 200, async text() { return "{}"; } }; } });
  const result = await provider.embed({ task: "code.embedding", texts: [] });
  assert.equal(result.ok, true);
  assert.deepEqual(result.vectors, []);
  assert.equal(called, false);
});

// ---------- 6: mock provider works ----------
test("createMockEmbeddingProvider returns provided vectors", async () => {
  const provider = createMockEmbeddingProvider({ id: "mock", vectors: [[1, 2, 3]] });
  const result = await provider.embed({ task: "code.embedding", texts: ["x"] });
  assert.equal(result.ok, true);
  assert.deepEqual(result.vectors, [[1, 2, 3]]);
});

// ---------- 7: chunk stable ids ----------
test("buildEmbeddingChunks emits stable, kind-prefixed chunk ids", () => {
  const chunks = buildEmbeddingChunks({ graph: sampleGraph() });
  const ids = chunks.map((c) => c.id);
  assert.ok(ids.includes("file_summary:src/index.ts"));
  assert.ok(ids.includes("structural_feature_bag:src/index.ts"));
  assert.ok(ids.some((id) => id.startsWith("signature:src/index.ts#getUser")));
  assert.ok(ids.some((id) => id.startsWith("capability_text:")));
});

// ---------- 8: chunk content identity (path + kind + sha256 of derived text) ----------
test("each chunk has a content identity = sha256 of its derived text", () => {
  const chunks = buildEmbeddingChunks({ graph: sampleGraph() });
  for (const chunk of chunks) {
    assert.equal(typeof chunk.path, "string");
    assert.equal(typeof chunk.kind, "string");
    assert.equal(chunk.sha256, createHash("sha256").update(chunk.text).digest("hex"));
  }
  // Determinism: rebuilding the same graph yields identical chunk shas.
  const again = buildEmbeddingChunks({ graph: sampleGraph() });
  assert.deepEqual(again.map((c) => c.sha256).sort(), chunks.map((c) => c.sha256).sort());
});

// ---------- 9: chunk -> graph ref mapping ----------
test("embeddingChunkGraphRef maps signature->symbol, capability_text->capability, else->file", () => {
  const chunks = buildEmbeddingChunks({ graph: sampleGraph() });
  const sig = chunks.find((c) => c.kind === "signature");
  const cap = chunks.find((c) => c.kind === "capability_text");
  const file = chunks.find((c) => c.kind === "file_summary");
  assert.equal(embeddingChunkGraphRef(sig).kind, "symbol");
  assert.equal(embeddingChunkGraphRef(cap).kind, "capability");
  assert.equal(embeddingChunkGraphRef(file).kind, "file");
});

// ---------- 10: index key + vector ref are deterministic ----------
test("computeEmbeddingIndexKey and embeddingVectorRef are deterministic", () => {
  const chunk = { id: "file_summary:src/index.ts", sha256: "abc" };
  const ctx = { provider: "voyage", model: "voyage-code-3", dimensions: 1024, policyVersion: EMBEDDING_POLICY_VERSION };
  const key = computeEmbeddingIndexKey(chunk, ctx);
  assert.equal(key, computeEmbeddingIndexKey(chunk, ctx));
  const ref = embeddingVectorRef(key);
  assert.match(ref, /^vectors\/[0-9a-f]{40}\.json$/);
  assert.equal(ref, embeddingVectorRef(key));
});

// ---------- 11: classify new ----------
test("classifyEmbeddingChunks marks brand-new chunks as new", () => {
  const chunks = buildEmbeddingChunks({ graph: sampleGraph() });
  const result = classifyEmbeddingChunks({ chunks, existing: [], provider: "mock", model: "m", dimensions: 8, policyVersion: EMBEDDING_POLICY_VERSION });
  assert.equal(result.reused.length, 0);
  assert.equal(result.toEmbed.length, chunks.length);
  assert.ok(result.toEmbed.every((e) => e.reason === "new"));
});

function recordsFor(chunks, { provider = "mock", model = "m", dimensions = 8 } = {}) {
  return chunks.map((chunk) => ({
    chunk,
    provider,
    model,
    dimensions,
    policyVersion: EMBEDDING_POLICY_VERSION,
    vectorRef: embeddingVectorRef(computeEmbeddingIndexKey(chunk, { provider, model, dimensions, policyVersion: EMBEDDING_POLICY_VERSION })),
    vectorSha256: "deadbeef",
    createdAt: "2026-01-02T00:00:00.000Z",
  }));
}

// ---------- 12: classify reuses unchanged ----------
test("classifyEmbeddingChunks reuses unchanged chunks (no re-embed)", () => {
  const chunks = buildEmbeddingChunks({ graph: sampleGraph() });
  const existing = recordsFor(chunks);
  const result = classifyEmbeddingChunks({ chunks, existing, provider: "mock", model: "m", dimensions: 8, policyVersion: EMBEDDING_POLICY_VERSION });
  assert.equal(result.toEmbed.length, 0);
  assert.equal(result.reused.length, chunks.length);
});

// ---------- 13: sha change -> stale ----------
test("classifyEmbeddingChunks marks a chunk stale when its sha256 changes", () => {
  const chunks = buildEmbeddingChunks({ graph: sampleGraph() });
  const existing = recordsFor(chunks).map((r) => ({ ...r, chunk: { ...r.chunk, sha256: "changed" } }));
  const result = classifyEmbeddingChunks({ chunks, existing, provider: "mock", model: "m", dimensions: 8, policyVersion: EMBEDDING_POLICY_VERSION });
  assert.equal(result.toEmbed.length, chunks.length);
  assert.ok(result.toEmbed.every((e) => e.reason === "stale"));
});

// ---------- 14: provider/model/dimensions/policy change -> policy-changed ----------
test("classifyEmbeddingChunks marks chunks policy-changed when provider/model/dimensions differ", () => {
  const chunks = buildEmbeddingChunks({ graph: sampleGraph() });
  const existing = recordsFor(chunks, { model: "old-model" });
  const result = classifyEmbeddingChunks({ chunks, existing, provider: "mock", model: "new-model", dimensions: 8, policyVersion: EMBEDDING_POLICY_VERSION });
  assert.ok(result.toEmbed.every((e) => e.reason === "policy-changed"));
  assert.equal(result.reused.length, 0);
});

// ---------- 15: cosine similarity ----------
test("cosineSimilarity is correct for aligned vectors and 0 for degenerate", () => {
  assert.ok(Math.abs(cosineSimilarity([1, 0], [2, 0]) - 1) < 1e-9);
  assert.ok(Math.abs(cosineSimilarity([1, 0], [0, 1])) < 1e-9);
  assert.equal(cosineSimilarity([0, 0], [1, 1]), 0);
  assert.equal(cosineSimilarity([1, 2, 3], [1, 2]), 0);
});

// ---------- 16: CLI index writes only under .rekon/cache/embeddings, source untouched ----------
test("`embeddings index --provider mock` writes only under .rekon/cache/embeddings", async () => {
  const work = await setupRepo();
  try {
    assert.equal(runCli(["capability", "graph", "build", "--root", work, "--json"], work).status, 0);
    const before = await readFile(join(work, "src", "index.js"), "utf8");
    const res = runCli(["embeddings", "index", "--all", "--provider", "mock", "--root", work, "--json"], work);
    assert.equal(res.status, 0, res.stderr || res.stdout);
    const payload = JSON.parse(res.stdout);
    assert.equal(payload.status, "indexed");
    assert.ok(payload.summary.indexed > 0);
    // index.json + at least one vector file land under the cache dir.
    const cacheDir = join(work, ".rekon", "cache", "embeddings");
    assert.ok((await readdir(cacheDir)).includes("index.json"));
    assert.ok((await readdir(join(cacheDir, "vectors"))).length > 0);
    // Source file is byte-for-byte unchanged.
    assert.equal(await readFile(join(work, "src", "index.js"), "utf8"), before);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 17: missing key fails cleanly without false success ----------
test("`embeddings index --provider voyage` with no key fails cleanly, writes no vectors", async () => {
  const work = await setupRepo();
  try {
    assert.equal(runCli(["capability", "graph", "build", "--root", work, "--json"], work).status, 0);
    const res = runCli(["embeddings", "index", "--all", "--provider", "voyage", "--model", "voyage-code-3", "--root", work, "--json"], work);
    assert.notEqual(res.status, 0, "missing key must be a non-zero exit");
    const payload = JSON.parse(res.stdout);
    assert.equal(payload.status, "failed");
    assert.equal(payload.error, "missing-api-key");
    assert.equal(payload.summary.indexed, 0, "no chunk may be falsely reported as indexed");
    // No cache vectors were written.
    let vectorCount = 0;
    try {
      vectorCount = (await readdir(join(work, ".rekon", "cache", "embeddings", "vectors"))).length;
    } catch {
      vectorCount = 0;
    }
    assert.equal(vectorCount, 0);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 18: reindex reuses unchanged ----------
test("re-running `embeddings index` reuses unchanged chunks", async () => {
  const work = await setupRepo();
  try {
    assert.equal(runCli(["capability", "graph", "build", "--root", work, "--json"], work).status, 0);
    assert.equal(runCli(["embeddings", "index", "--all", "--provider", "mock", "--root", work, "--json"], work).status, 0);
    const res = runCli(["embeddings", "index", "--provider", "mock", "--root", work, "--json"], work);
    const payload = JSON.parse(res.stdout);
    assert.equal(payload.summary.indexed, 0);
    assert.ok(payload.summary.reused > 0);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 19: query returns nearest as proposal/context ----------
test("`embeddings query` returns nearest cached chunks as proposal/context", async () => {
  const work = await setupRepo();
  try {
    assert.equal(runCli(["capability", "graph", "build", "--root", work, "--json"], work).status, 0);
    assert.equal(runCli(["embeddings", "index", "--all", "--provider", "mock", "--root", work, "--json"], work).status, 0);
    const res = runCli(["embeddings", "query", "--text", "user lookup logic", "--provider", "mock", "--root", work, "--json"], work);
    assert.equal(res.status, 0, res.stderr || res.stdout);
    const payload = JSON.parse(res.stdout);
    assert.equal(payload.status, "ok");
    assert.ok(Array.isArray(payload.matches) && payload.matches.length > 0);
    // Sorted by descending score.
    for (let i = 1; i < payload.matches.length; i += 1) {
      assert.ok(payload.matches[i - 1].score >= payload.matches[i].score);
    }
    assert.match(payload.note, /proposal\/context, not proof/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 20: query with empty cache does not fabricate results ----------
test("`embeddings query` with no cache reports empty without throwing", async () => {
  const work = await setupRepo();
  try {
    const res = runCli(["embeddings", "query", "--text", "anything", "--provider", "mock", "--root", work, "--json"], work);
    assert.equal(res.status, 0, res.stderr || res.stdout);
    const payload = JSON.parse(res.stdout);
    assert.equal(payload.status, "empty");
    assert.deepEqual(payload.matches, []);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 21: graph build --embedding-similarity emits embedding_similarity evidence ----------
test("`capability graph build --embedding-similarity latest` folds in embedding evidence, boundaries stay false", async () => {
  const work = await setupRepo();
  try {
    assert.equal(runCli(["capability", "graph", "build", "--root", work, "--json"], work).status, 0);
    assert.equal(runCli(["embeddings", "index", "--all", "--provider", "mock", "--root", work, "--json"], work).status, 0);
    const res = runCli(["capability", "graph", "build", "--embedding-similarity", "latest", "--root", work, "--json"], work);
    assert.equal(res.status, 0, res.stderr || res.stdout);
    const payload = JSON.parse(res.stdout);
    assert.ok(payload.embeddingSimilarity && payload.embeddingSimilarity.pairs > 0, "expected embedding similarity pairs");
    assert.equal(payload.boundaries.generatedEmbeddings, false);
    assert.equal(payload.boundaries.usedLlm, false);
    // Read the written graph and confirm an embedding_similarity evidence row + embedding claim.
    const graphsDir = join(work, ".rekon", "artifacts", "graphs");
    const files = (await readdir(graphsDir)).filter((f) => f.startsWith("CapabilityEvidenceGraph-")).sort();
    const graph = JSON.parse(await readFile(join(graphsDir, files[files.length - 1]), "utf8"));
    assert.ok(graph.evidence.some((e) => e.source === "embedding_similarity"));
    assert.ok(graph.claims.some((c) => c.source === "embedding" && (c.predicate === "similar_to" || c.predicate === "duplicate_candidate")));
    // Embedding claims are accepted but never reach the deterministic-fact confidence of 1.0.
    for (const claim of graph.claims.filter((c) => c.source === "embedding")) {
      assert.ok(claim.confidence < 1, "embedding similarity must never claim deterministic certainty");
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 22: default graph build has NO embedding evidence ----------
test("default `capability graph build` produces no embedding_similarity evidence", async () => {
  const work = await setupRepo();
  try {
    const res = runCli(["capability", "graph", "build", "--root", work, "--json"], work);
    assert.equal(res.status, 0, res.stderr || res.stdout);
    const payload = JSON.parse(res.stdout);
    assert.equal(payload.embeddingSimilarity, undefined);
    const graphsDir = join(work, ".rekon", "artifacts", "graphs");
    const files = (await readdir(graphsDir)).filter((f) => f.startsWith("CapabilityEvidenceGraph-"));
    const graph = JSON.parse(await readFile(join(graphsDir, files[0]), "utf8"));
    assert.ok(!graph.evidence.some((e) => e.source === "embedding_similarity"));
    assert.ok(!graph.claims.some((c) => c.source === "embedding"));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 23: embeddings commands create no plan/work-order/verification/circe artifacts ----------
test("embeddings commands write no source, run no commands, create no intent/verification artifacts", async () => {
  const work = await setupRepo();
  try {
    assert.equal(runCli(["capability", "graph", "build", "--root", work, "--json"], work).status, 0);
    assert.equal(runCli(["embeddings", "index", "--all", "--provider", "mock", "--root", work, "--json"], work).status, 0);
    assert.equal(runCli(["embeddings", "query", "--text", "x", "--provider", "mock", "--root", work, "--json"], work).status, 0);
    // No forbidden artifact types anywhere under .rekon/artifacts.
    const artifactsDir = join(work, ".rekon", "artifacts");
    const forbidden = ["PreparedIntentPlan", "WorkOrder", "VerificationPlan", "VerificationRun"];
    async function walk(dir) {
      const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const ent of entries) {
        const abs = join(dir, ent.name);
        if (ent.isDirectory()) await walk(abs);
        else for (const type of forbidden) assert.ok(!ent.name.startsWith(`${type}-`), `unexpected ${type} artifact: ${ent.name}`);
      }
    }
    await walk(artifactsDir);
    // No Circe handoff directory was produced by the embeddings commands.
    assert.ok(!(await readdir(work)).includes("circe"));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 24: all written artifacts validate clean ----------
test("`artifacts validate` is clean after indexing + similarity graph build", async () => {
  const work = await setupRepo();
  try {
    assert.equal(runCli(["capability", "graph", "build", "--root", work, "--json"], work).status, 0);
    assert.equal(runCli(["embeddings", "index", "--all", "--provider", "mock", "--root", work, "--json"], work).status, 0);
    assert.equal(runCli(["capability", "graph", "build", "--embedding-similarity", "latest", "--root", work, "--json"], work).status, 0);
    const res = runCli(["artifacts", "validate", "--root", work, "--json"], work);
    assert.equal(res.status, 0, res.stderr || res.stdout);
    const payload = JSON.parse(res.stdout);
    assert.equal(payload.valid, true, JSON.stringify(payload.issues));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});
