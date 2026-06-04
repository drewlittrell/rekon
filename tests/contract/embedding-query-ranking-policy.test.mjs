// Contract tests for the Embedding Query Input-Type / Ranking Policy
// Implementation (slice 164). Verifies the slice-163 decision is implemented:
//   - Voyage indexing embeds with input_type=document; queries with input_type=query.
//   - `embeddings query` default top-k is 8, capped at 20; invalid top-k fails cleanly.
//   - every result carries a score band (strong/useful/weak/ignored) — policy
//     labels, not proof — plus an explanation (provider/model/policyVersion/preview).
//   - query JSON exposes query.{requestedTopK,effectiveTopK,inputType} + boundaries.
//   - graph embedding-similarity still validates with generatedEmbeddings/usedLlm false.
//   - no source writes, no command execution, no WorkOrder/VerificationPlan, intent:go deferred.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { after, test } from "node:test";
import { join, resolve } from "node:path";
import { classifyEmbeddingSimilarityScore } from "@rekon/capability-model";
import { createVoyageEmbeddingProvider } from "@rekon/llm-provider";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

const noKeyEnv = { ...process.env };
delete noKeyEnv.OPENAI_API_KEY;
delete noKeyEnv.ANTHROPIC_API_KEY;
delete noKeyEnv.VOYAGE_API_KEY;
delete noKeyEnv.REKON_RUN_LIVE_LLM_TESTS;
delete noKeyEnv.REKON_RUN_LIVE_EMBEDDING_TESTS;

const FILES = {
  "package.json": `${JSON.stringify({ name: "embedding-ranking-policy", version: "0.0.0", type: "module" }, null, 2)}\n`,
  "src/users/get-user.ts": `export type User = { id: string; email: string; };
export function getUser(id: string): User { return { id, email: \`\${id}@example.com\` }; }
export function findUserByEmail(email: string): User { return { id: email.split("@")[0] ?? "unknown", email }; }
`,
  "src/users/user-profile.ts": `import type { User } from "./get-user.js";
export function buildUserProfile(user: User): { id: string; displayName: string } { return { id: user.id, displayName: user.email }; }
`,
  "src/orders/create-order.ts": `export type Order = { id: string; userId: string; };
export function createOrder(userId: string): Order { return { id: \`order-\${userId}\`, userId }; }
export function validateOrder(order: Order): boolean { return order.id.length > 0 && order.userId.length > 0; }
`,
  "src/sms/route-message.ts": `export type SmsMessage = { from: string; body: string; };
export function routeInboundSms(message: SmsMessage): string { if (message.body.includes("support")) { return "support"; } return "default"; }
`,
  "src/unrelated/colors.ts": `export const colors = ["red", "green", "blue"];
export function pickColor(index: number): string { return colors[index % colors.length] ?? "red"; }
`,
};

function runCli(args, cwdRoot) {
  return spawnSync("node", [cliPath, ...args], { encoding: "utf8", env: noKeyEnv, cwd: cwdRoot });
}
const mock = ["--provider", "mock", "--model", "mock-embedding"];

let work;
async function prep() {
  if (work) return work.state;
  const root = await mkdtemp(join(tmpdir(), "rekon-embed-ranking-"));
  for (const [rel, content] of Object.entries(FILES)) {
    await mkdir(join(root, rel, ".."), { recursive: true });
    await writeFile(join(root, rel), content, "utf8");
  }
  const git = (...a) => spawnSync("git", a, { cwd: root, encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@example.com");
  git("config", "user.name", "t");
  git("add", "-A");
  git("commit", "-qm", "init");

  runCli(["capability", "graph", "build", "--root", root, "--json"], root);
  const index = runCli(["embeddings", "index", "--root", root, "--all", ...mock, "--json"], root);
  const queryDefault = runCli(["embeddings", "query", "--root", root, "--text", "user lookup and profile data", ...mock, "--json"], root);
  const queryClamp = runCli(["embeddings", "query", "--root", root, "--text", "user lookup and profile data", ...mock, "--top-k", "999", "--json"], root);
  const queryZero = runCli(["embeddings", "query", "--root", root, "--text", "x", ...mock, "--top-k", "0", "--json"], root);
  const queryHuman = runCli(["embeddings", "query", "--root", root, "--text", "user lookup and profile data", ...mock], root);
  const simGraph = runCli(["capability", "graph", "build", "--root", root, "--embedding-similarity", "latest", "--json"], root);
  const validate = runCli(["artifacts", "validate", "--root", root, "--json"], root);
  const help = runCli(["--help"], root);
  const srcDiff = spawnSync("git", ["diff", "--quiet", "--", "src"], { cwd: root });

  const state = { root, index, queryDefault, queryClamp, queryZero, queryHuman, simGraph, validate, help, srcDiffStatus: srcDiff.status };
  work = { state };
  return state;
}
after(async () => {
  if (work) await rm(work.state.root, { recursive: true, force: true });
});

function parse(res) {
  assert.equal(res.status, 0, res.stderr || res.stdout);
  return JSON.parse(res.stdout);
}

// A fetchImpl that captures the request body's input_type and returns one
// embedding per input text (read via response.text(), as the adapter does).
function capturingFetch(captured) {
  return async (_url, init) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    captured.inputType = body.input_type;
    const n = Array.isArray(body.input) ? body.input.length : 1;
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({ data: Array.from({ length: n }, () => ({ embedding: [0.1, 0.2, 0.3, 0.4] })) });
      },
    };
  };
}

async function noArtifactOfType(root, prefix) {
  const dir = join(root, ".rekon", "artifacts");
  let found = false;
  async function walk(d) {
    for (const ent of await readdir(d, { withFileTypes: true }).catch(() => [])) {
      const abs = join(d, ent.name);
      if (ent.isDirectory()) await walk(abs);
      else if (ent.name.startsWith(`${prefix}-`)) found = true;
    }
  }
  await walk(dir);
  return !found;
}

// ---------- 1 ----------
test("Voyage index path sends input_type=document", async () => {
  const captured = {};
  const provider = createVoyageEmbeddingProvider({ apiKey: "k", inputType: "document", fetchImpl: capturingFetch(captured) });
  const res = await provider.embed({ task: "code.embedding", texts: ["chunk text"], model: "voyage-code-3" });
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(captured.inputType, "document");
});

// ---------- 2 ----------
test("Voyage query path sends input_type=query", async () => {
  const captured = {};
  const provider = createVoyageEmbeddingProvider({ apiKey: "k", inputType: "query", fetchImpl: capturingFetch(captured) });
  const res = await provider.embed({ task: "artifact.retrieval", texts: ["query text"], model: "voyage-code-3" });
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(captured.inputType, "query");
});

// ---------- 3 ----------
test("`embeddings query` default effectiveTopK is 8", async () => {
  const { queryDefault } = await prep();
  const payload = parse(queryDefault);
  assert.equal(payload.effectiveTopK, 8);
  assert.equal(payload.query.effectiveTopK, 8);
  assert.equal(payload.query.requestedTopK, 8);
});

// ---------- 4 ----------
test("`embeddings query` clamps requested top-k above 20 to effectiveTopK 20", async () => {
  const { queryClamp } = await prep();
  const payload = parse(queryClamp);
  assert.equal(payload.requestedTopK, 999);
  assert.equal(payload.effectiveTopK, 20);
});

// ---------- 5 ----------
test("invalid (non-positive) top-k fails cleanly", async () => {
  const { queryZero } = await prep();
  assert.notEqual(queryZero.status, 0);
  assert.match(queryZero.stderr, /top-k must be a positive integer/);
});

// ---------- 6-9: score band classification ----------
test("score >= 0.78 classifies as strong", () => {
  assert.equal(classifyEmbeddingSimilarityScore(0.9), "strong");
  assert.equal(classifyEmbeddingSimilarityScore(0.78), "strong");
});
test("0.65 <= score < 0.78 classifies as useful", () => {
  assert.equal(classifyEmbeddingSimilarityScore(0.7), "useful");
  assert.equal(classifyEmbeddingSimilarityScore(0.65), "useful");
  assert.equal(classifyEmbeddingSimilarityScore(0.7799), "useful");
});
test("0.50 <= score < 0.65 classifies as weak", () => {
  assert.equal(classifyEmbeddingSimilarityScore(0.55), "weak");
  assert.equal(classifyEmbeddingSimilarityScore(0.5), "weak");
  assert.equal(classifyEmbeddingSimilarityScore(0.6499), "weak");
});
test("score < 0.50 classifies as ignored", () => {
  assert.equal(classifyEmbeddingSimilarityScore(0.49), "ignored");
  assert.equal(classifyEmbeddingSimilarityScore(0), "ignored");
  assert.equal(classifyEmbeddingSimilarityScore(Number.NaN), "ignored");
});

// ---------- 10 ----------
test("query JSON includes a score band on every result", async () => {
  const { queryDefault } = await prep();
  const payload = parse(queryDefault);
  assert.ok(Array.isArray(payload.results) && payload.results.length > 0);
  const bands = new Set(["strong", "useful", "weak", "ignored"]);
  for (const r of payload.results) assert.ok(bands.has(r.scoreBand), `bad band: ${r.scoreBand}`);
});

// ---------- 11 ----------
test("query JSON includes requestedTopK and effectiveTopK", async () => {
  const payload = parse((await prep()).queryDefault);
  assert.equal(typeof payload.requestedTopK, "number");
  assert.equal(typeof payload.effectiveTopK, "number");
});

// ---------- 12 ----------
test("query JSON includes provider/model/inputType; index reports input_type=document", async () => {
  const { queryDefault, index } = await prep();
  const q = parse(queryDefault);
  assert.equal(q.query.provider, "mock");
  assert.equal(q.query.model, "mock-embedding");
  assert.equal(q.query.inputType, "query");
  assert.equal(q.inputType, "query");
  assert.equal(parse(index).summary.inputType, "document");
});

// ---------- 13 ----------
test("query JSON includes result explanation fields", async () => {
  const payload = parse((await prep()).queryDefault);
  const e = payload.results[0].explanation;
  assert.equal(typeof e.provider, "string");
  assert.equal(typeof e.model, "string");
  assert.equal(typeof e.policyVersion, "string");
  assert.equal(typeof e.textPreview, "string");
});

// ---------- 14 ----------
test("human query output includes a score band", async () => {
  const { queryHuman } = await prep();
  assert.equal(queryHuman.status, 0, queryHuman.stderr);
  assert.match(queryHuman.stdout, /\b(strong|useful|weak|ignored)\b/);
});

// ---------- 15 ----------
test("ignored-score behavior: bands labeled and retained (documented); retrieval is proposal/context", async () => {
  const payload = parse((await prep()).queryDefault);
  // Every result carries a band (ignored results are labeled, not silently dropped this slice).
  for (const r of payload.results) assert.equal(typeof r.scoreBand, "string");
  assert.match(payload.note, /proposal\/context, not proof/);
  assert.match(payload.note, /policy labels, not proof/);
});

// ---------- 16 ----------
test("graph build with embedding similarity still validates", async () => {
  const { simGraph, validate } = await prep();
  const payload = parse(simGraph);
  assert.ok(payload.embeddingSimilarity && payload.embeddingSimilarity.pairs > 0, JSON.stringify(payload.embeddingSimilarity));
  assert.equal(parse(validate).valid, true);
});

// ---------- 17 ----------
test("graph generatedEmbeddings remains false", async () => {
  assert.equal(parse((await prep()).simGraph).boundaries.generatedEmbeddings, false);
});

// ---------- 18 ----------
test("graph usedLlm remains false", async () => {
  assert.equal(parse((await prep()).simGraph).boundaries.usedLlm, false);
});

// ---------- 19 ----------
test("no WorkOrder artifact is created", async () => {
  assert.ok(await noArtifactOfType((await prep()).root, "WorkOrder"));
});

// ---------- 20 ----------
test("no VerificationPlan artifact is created", async () => {
  assert.ok(await noArtifactOfType((await prep()).root, "VerificationPlan"));
});

// ---------- 21 ----------
test("no command execution is represented", async () => {
  const { root, simGraph } = await prep();
  assert.ok(await noArtifactOfType(root, "VerificationRun"));
  assert.equal(parse(simGraph).boundaries.executedCommands, false);
});

// ---------- 22 ----------
test("source files are unchanged", async () => {
  assert.equal((await prep()).srcDiffStatus, 0, "git diff on src should be clean");
});

// ---------- 23 ----------
test("artifacts validate clean", async () => {
  assert.equal(parse((await prep()).validate).valid, true);
});

// ---------- 24 ----------
test("help mentions the top-k policy", async () => {
  const { help } = await prep();
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /default top-k 8, max 20|input_type=query/);
});
