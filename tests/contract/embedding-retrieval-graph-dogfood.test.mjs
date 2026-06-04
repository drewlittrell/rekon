// Contract tests for the Embedding Retrieval / Graph Dogfood Review (slice 161).
//
// Dogfoods the shipped embedding index, retrieval, and graph embedding-similarity
// path on a realistic multi-domain fixture (users / orders / sms / unrelated):
//   - `embeddings index --provider mock` indexes derived chunks,
//   - `embeddings query --text` ranks same-domain chunks above the unrelated
//     `colors.ts` for both a user query and an SMS-routing query,
//   - raw vectors live under `.rekon/cache/embeddings` (cache/index), never as
//     canonical artifacts,
//   - `capability graph build --embedding-similarity latest` emits
//     `embedding_similarity` evidence + `embedding` / `inference` claims while
//     `generatedEmbeddings` / `usedLlm` stay false,
//   - source files are unchanged and no PreparedIntentPlan / WorkOrder /
//     VerificationPlan / VerificationRun is produced (no commands, no intent:go),
//   - all written artifacts validate clean.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { after, test } from "node:test";
import { join, resolve } from "node:path";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

const noKeyEnv = { ...process.env };
delete noKeyEnv.OPENAI_API_KEY;
delete noKeyEnv.ANTHROPIC_API_KEY;
delete noKeyEnv.VOYAGE_API_KEY;
delete noKeyEnv.REKON_RUN_LIVE_LLM_TESTS;
delete noKeyEnv.REKON_RUN_LIVE_EMBEDDING_TESTS;

const FILES = {
  "package.json": `${JSON.stringify({ name: "embedding-dogfood", version: "0.0.0", type: "module" }, null, 2)}\n`,
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
  "src/orders/order-summary.ts": `import type { Order } from "./create-order.js";
export function summarizeOrder(order: Order): string { return \`\${order.id} for \${order.userId}\`; }
`,
  "src/sms/route-message.ts": `export type SmsMessage = { from: string; body: string; };
export function routeInboundSms(message: SmsMessage): string { if (message.body.includes("support")) { return "support"; } return "default"; }
export function normalizePhoneNumber(value: string): string { return value.replace(/\\D/g, ""); }
`,
  "src/sms/send-message.ts": `export function sendSms(to: string, body: string): { to: string; body: string; queued: boolean } { return { to, body, queued: true }; }
export function formatOutboundSms(body: string): string { return body.trim(); }
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

async function dogfood() {
  if (work) return work.state;
  const root = await mkdtemp(join(tmpdir(), "rekon-embed-dogfood-"));
  for (const [rel, content] of Object.entries(FILES)) {
    await mkdir(join(root, rel, ".."), { recursive: true });
    await writeFile(join(root, rel), content, "utf8");
  }
  // git init so source immutability is checkable by git.
  const git = (...a) => spawnSync("git", a, { cwd: root, encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@example.com");
  git("config", "user.name", "t");
  git("add", "-A");
  git("commit", "-qm", "init");

  const graph = runCli(["capability", "graph", "build", "--root", root, "--json"], root);
  const index = runCli(["embeddings", "index", "--root", root, "--all", ...mock, "--json"], root);
  const userQuery = runCli(["embeddings", "query", "--root", root, "--text", "user lookup and profile data", ...mock, "--top-k", "5", "--json"], root);
  const smsQuery = runCli(["embeddings", "query", "--root", root, "--text", "route inbound SMS message to support or default experience", ...mock, "--top-k", "5", "--json"], root);
  const simGraph = runCli(["capability", "graph", "build", "--root", root, "--embedding-similarity", "latest", "--json"], root);
  const validate = runCli(["artifacts", "validate", "--root", root, "--json"], root);
  const srcDiff = spawnSync("git", ["diff", "--quiet", "--", "src"], { cwd: root });

  const state = { root, graph, index, userQuery, smsQuery, simGraph, validate, srcDiffStatus: srcDiff.status };
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

async function latestGraph(root) {
  const dir = join(root, ".rekon", "artifacts", "graphs");
  const files = (await readdir(dir)).filter((f) => f.startsWith("CapabilityEvidenceGraph-")).sort();
  return JSON.parse(await readFile(join(dir, files[files.length - 1]), "utf8"));
}

// ---------- 1 ----------
test("embeddings index succeeds with the mock provider", async () => {
  const { index } = await dogfood();
  const payload = parse(index);
  assert.equal(payload.status, "indexed");
  assert.ok(payload.summary.indexed > 0);
});

// ---------- 2 ----------
test("embeddings query returns results", async () => {
  const { userQuery } = await dogfood();
  const payload = parse(userQuery);
  assert.ok(Array.isArray(payload.matches) && payload.matches.length > 0);
});

// ---------- 3 ----------
test("user query returns at least one user-related chunk in the top 3", async () => {
  const { userQuery } = await dogfood();
  const top3 = parse(userQuery).matches.slice(0, 3);
  assert.ok(top3.some((m) => m.path.includes("src/users/")), JSON.stringify(top3));
});

// ---------- 4 ----------
test("sms query returns at least one sms-related chunk in the top 3", async () => {
  const { smsQuery } = await dogfood();
  const top3 = parse(smsQuery).matches.slice(0, 3);
  assert.ok(top3.some((m) => m.path.includes("src/sms/")), JSON.stringify(top3));
});

// ---------- 5 ----------
test("unrelated colors are not ranked first for the user query", async () => {
  const { userQuery } = await dogfood();
  assert.ok(!parse(userQuery).matches[0].path.includes("unrelated/colors"));
});

// ---------- 6 ----------
test("unrelated colors are not ranked first for the sms query", async () => {
  const { smsQuery } = await dogfood();
  assert.ok(!parse(smsQuery).matches[0].path.includes("unrelated/colors"));
});

// ---------- 7 ----------
test("the embedding cache index exists", async () => {
  const { root } = await dogfood();
  const cacheDir = join(root, ".rekon", "cache", "embeddings");
  assert.ok((await readdir(cacheDir)).includes("index.json"));
});

// ---------- 8 ----------
test("vector files exist under .rekon/cache/embeddings", async () => {
  const { root } = await dogfood();
  const vectors = await readdir(join(root, ".rekon", "cache", "embeddings", "vectors"));
  assert.ok(vectors.length > 0);
});

// ---------- 9 ----------
test("raw vectors are not canonical artifacts", async () => {
  const { root } = await dogfood();
  // No artifact file is a bare vector, and nothing under .rekon/artifacts is an embedding vector type.
  const artifactsDir = join(root, ".rekon", "artifacts");
  async function walk(dir) {
    for (const ent of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const abs = join(dir, ent.name);
      if (ent.isDirectory()) await walk(abs);
      else {
        assert.ok(!ent.name.toLowerCase().includes("vector"), `unexpected vector artifact: ${ent.name}`);
        const parsed = JSON.parse(await readFile(abs, "utf8"));
        assert.ok(!Array.isArray(parsed), `artifact ${ent.name} is a bare array (raw vector?)`);
      }
    }
  }
  await walk(artifactsDir);
  // index.json stores records, not inline vectors.
  const index = JSON.parse(await readFile(join(root, ".rekon", "cache", "embeddings", "index.json"), "utf8"));
  for (const record of index.records) assert.ok(!("vector" in record) && !("embedding" in record));
});

// ---------- 10 ----------
test("graph build --embedding-similarity latest succeeds", async () => {
  const { simGraph } = await dogfood();
  const payload = parse(simGraph);
  assert.ok(payload.embeddingSimilarity && payload.embeddingSimilarity.pairs > 0);
});

// ---------- 11 ----------
test("the graph contains embedding_similarity evidence", async () => {
  const { root } = await dogfood();
  const graph = await latestGraph(root);
  assert.ok(graph.evidence.some((e) => e.source === "embedding_similarity"));
});

// ---------- 12 ----------
test("the graph contains embedding inference claims (not facts)", async () => {
  const { root } = await dogfood();
  const graph = await latestGraph(root);
  const embeddingClaims = graph.claims.filter((c) => c.source === "embedding");
  assert.ok(embeddingClaims.length > 0);
  assert.ok(embeddingClaims.every((c) => c.claimType === "inference"));
  assert.ok(embeddingClaims.every((c) => c.confidence < 1), "embedding confidence must stay below the deterministic 1.0");
});

// ---------- 13 ----------
test("graph generatedEmbeddings remains false", async () => {
  const { simGraph } = await dogfood();
  assert.equal(parse(simGraph).boundaries.generatedEmbeddings, false);
});

// ---------- 14 ----------
test("graph usedLlm remains false", async () => {
  const { simGraph } = await dogfood();
  assert.equal(parse(simGraph).boundaries.usedLlm, false);
});

// ---------- 15 ----------
test("artifacts validate clean", async () => {
  const { validate } = await dogfood();
  assert.equal(parse(validate).valid, true);
});

// ---------- 16 ----------
test("source files are unchanged", async () => {
  const { srcDiffStatus } = await dogfood();
  assert.equal(srcDiffStatus, 0, "git diff on src should be clean");
});

async function noArtifactOfType(root, prefix) {
  const artifactsDir = join(root, ".rekon", "artifacts");
  let found = false;
  async function walk(dir) {
    for (const ent of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const abs = join(dir, ent.name);
      if (ent.isDirectory()) await walk(abs);
      else if (ent.name.startsWith(`${prefix}-`)) found = true;
    }
  }
  await walk(artifactsDir);
  return !found;
}

// ---------- 17 ----------
test("no WorkOrder artifact is created", async () => {
  const { root } = await dogfood();
  assert.ok(await noArtifactOfType(root, "WorkOrder"));
});

// ---------- 18 ----------
test("no VerificationPlan artifact is created", async () => {
  const { root } = await dogfood();
  assert.ok(await noArtifactOfType(root, "VerificationPlan"));
});

// ---------- 19 ----------
test("no command execution is represented", async () => {
  const { root, simGraph } = await dogfood();
  // No VerificationRun (the only artifact that represents executed commands) and the graph executed none.
  assert.ok(await noArtifactOfType(root, "VerificationRun"));
  assert.equal(parse(simGraph).boundaries.executedCommands, false);
});

// ---------- 20 ----------
test("intent:go is not invoked", async () => {
  const { root, simGraph } = await dogfood();
  assert.ok(await noArtifactOfType(root, "PreparedIntentPlan"));
  assert.equal(parse(simGraph).boundaries.implementedIntentGo, false);
});
