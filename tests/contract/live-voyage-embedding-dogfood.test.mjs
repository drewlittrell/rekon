// Gated live-provider contract test for the Live Voyage Embedding Dogfood (slice 162).
//
// This suite preserves the prior `voyage-code-3`, 1024-dimension baseline and
// is therefore GATED: every live assertion skips unless BOTH
//   - `VOYAGE_API_KEY` is set in the environment, and
//   - `REKON_RUN_LIVE_EMBEDDING_TESTS=1`
// are present. The committed test suite runs keyless (the project gate strips
// those env vars), so under the keyless gate these tests report as *skipped*,
// never failed — the live run is captured as evidence in the slice-162 memo.
//
// The API key is consumed from the environment only. It is never written to
// disk, never embedded in a fixture, and never printed. Query/index JSON shows
// scores and paths, not the key.
//
// When run live, it asserts:
//   - `embeddings index --provider voyage` indexes the fixture (status indexed,
//     dimensions 1024, zero failures),
//   - raw vectors live under `.rekon/cache/embeddings` as 1024-length arrays,
//     never inlined into the index record,
//   - a PARAPHRASE user query (no shared vocabulary) ranks a `src/users/` chunk
//     in the top 3, and a paraphrase sms query ranks a `src/sms/` chunk top 3 —
//     the semantic robustness the lexical mock cannot prove,
//   - `capability graph build --embedding-similarity latest` emits
//     `embedding_similarity` evidence + `embedding` / `inference` claims with
//     confidence below the deterministic 1.0, while `generatedEmbeddings` /
//     `usedLlm` stay false,
//   - source files are unchanged.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { after, test } from "node:test";
import { join, resolve } from "node:path";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

// Live gate: both the key and the explicit opt-in env var must be present.
const LIVE =
  process.env.REKON_RUN_LIVE_EMBEDDING_TESTS === "1" &&
  typeof process.env.VOYAGE_API_KEY === "string" &&
  process.env.VOYAGE_API_KEY.length > 0;

const FILES = {
  "package.json": `${JSON.stringify({ name: "live-voyage-dogfood", version: "0.0.0", type: "module" }, null, 2)}\n`,
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

// Live runs use the real environment so the child process inherits VOYAGE_API_KEY.
function runCli(args, cwdRoot) {
  return spawnSync("node", [cliPath, ...args], { encoding: "utf8", env: process.env, cwd: cwdRoot });
}

const voyage = ["--provider", "voyage", "--model", "voyage-code-3"];

let work;

async function dogfood() {
  if (work) return work.state;
  const root = await mkdtemp(join(tmpdir(), "rekon-voyage-dogfood-"));
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
  const index = runCli(["embeddings", "index", "--root", root, "--all", ...voyage, "--json"], root);
  const userQuery = runCli(["embeddings", "query", "--root", root, "--text", "look up the person who owns an account", ...voyage, "--top-k", "5", "--json"], root);
  const smsQuery = runCli(["embeddings", "query", "--root", root, "--text", "decide which channel an incoming text should be forwarded to", ...voyage, "--top-k", "5", "--json"], root);
  const simGraph = runCli(["capability", "graph", "build", "--root", root, "--embedding-similarity", "latest", "--json"], root);
  const validate = runCli(["artifacts", "validate", "--root", root, "--json"], root);
  const srcDiff = spawnSync("git", ["diff", "--quiet", "--", "src"], { cwd: root });

  const state = { root, index, userQuery, smsQuery, simGraph, validate, srcDiffStatus: srcDiff.status };
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

// ---------- always runs (keyless) ----------
test("live Voyage suite is gated by environment variables", () => {
  // Documents the gate: with no key / no opt-in, the live assertions below skip.
  assert.equal(typeof LIVE, "boolean");
  if (!LIVE) {
    assert.ok(
      !(process.env.REKON_RUN_LIVE_EMBEDDING_TESTS === "1" && process.env.VOYAGE_API_KEY),
      "LIVE should be false only without both the key and the opt-in flag",
    );
  }
});

// ---------- live only ----------
test("live voyage index succeeds at 1024 dimensions", { skip: !LIVE }, async () => {
  const { index } = await dogfood();
  const payload = parse(index);
  assert.equal(payload.status, "indexed");
  assert.ok(payload.summary.indexed > 0);
  assert.equal(payload.summary.failed, 0);
  assert.equal(payload.summary.dimensions, 1024);
});

test("live voyage vectors are 1024-length cache files, never inlined", { skip: !LIVE }, async () => {
  const { root } = await dogfood();
  const cacheDir = join(root, ".rekon", "cache", "embeddings");
  const index = JSON.parse(await readFile(join(cacheDir, "index.json"), "utf8"));
  for (const record of index.records) {
    assert.ok(!("vector" in record) && !("embedding" in record), "raw vector must not be inlined into the record");
  }
  const first = index.records[0];
  const vector = JSON.parse(await readFile(join(cacheDir, first.vectorRef), "utf8"));
  assert.equal(vector.length, 1024);
});

test("paraphrase user query ranks a users chunk in the top 3 (semantic)", { skip: !LIVE }, async () => {
  const { userQuery } = await dogfood();
  const top3 = parse(userQuery).matches.slice(0, 3);
  assert.ok(top3.some((m) => m.path.includes("src/users/")), JSON.stringify(top3));
});

test("paraphrase sms query ranks an sms chunk in the top 3 (semantic)", { skip: !LIVE }, async () => {
  const { smsQuery } = await dogfood();
  const top3 = parse(smsQuery).matches.slice(0, 3);
  assert.ok(top3.some((m) => m.path.includes("src/sms/")), JSON.stringify(top3));
});

test("unrelated colors are not ranked first for either paraphrase query", { skip: !LIVE }, async () => {
  const { userQuery, smsQuery } = await dogfood();
  assert.ok(!parse(userQuery).matches[0].path.includes("unrelated/colors"));
  assert.ok(!parse(smsQuery).matches[0].path.includes("unrelated/colors"));
});

test("graph build --embedding-similarity latest emits live embedding evidence", { skip: !LIVE }, async () => {
  const { root, simGraph } = await dogfood();
  const payload = parse(simGraph);
  assert.ok(payload.embeddingSimilarity && payload.embeddingSimilarity.pairs > 0);
  const graph = await latestGraph(root);
  assert.ok(graph.evidence.some((e) => e.source === "embedding_similarity"));
  const embeddingClaims = graph.claims.filter((c) => c.source === "embedding");
  assert.ok(embeddingClaims.length > 0);
  assert.ok(embeddingClaims.every((c) => c.claimType === "inference"));
  assert.ok(embeddingClaims.every((c) => c.confidence < 1), "embedding confidence must stay below the deterministic 1.0");
});

test("graph build over the live cache keeps generatedEmbeddings and usedLlm false", { skip: !LIVE }, async () => {
  const { simGraph } = await dogfood();
  const boundaries = parse(simGraph).boundaries;
  assert.equal(boundaries.generatedEmbeddings, false);
  assert.equal(boundaries.usedLlm, false);
});

test("artifacts validate clean and source is unchanged after the live dogfood", { skip: !LIVE }, async () => {
  const { validate, srcDiffStatus } = await dogfood();
  assert.equal(parse(validate).valid, true);
  assert.equal(srcDiffStatus, 0, "git diff on src should be clean");
});
