// Dogfood contract tests for TaskContextReport (slice 168). Exercises the
// `rekon context task` CLI on two realistic scenarios — an explicit-path local
// edit and an embedding-retrieval + graph-expansion task — and asserts the
// dogfood invariants: task-shaped context stays proposal/context (never proof),
// do-not-touch zones are guidance, verification hints are hints (never executed),
// evidence refs are preserved, and the command writes no source / runs no command
// / creates no PreparedIntentPlan, WorkOrder, or VerificationPlan / runs no Circe /
// never invokes intent:go.
//
// Honest retrieval finding (locked in by these tests): the lexical mock provider
// scores below the useful band on these fixtures, so pure retrieval (no --path)
// selects zero embedding context items and records a `retrieval-low-signal`
// warning. The reliable baseline is explicit paths + deterministic graph
// expansion; a real embedding provider is needed for semantic retrieval.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const CLI = resolve(repoRoot, "packages/cli/dist/index.js");

function runCli(args, { cwd } = {}) {
  try {
    const stdout = execFileSync("node", [CLI, ...args], {
      cwd: cwd ?? repoRoot,
      encoding: "utf8",
      env: { ...process.env, VOYAGE_API_KEY: "", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
    });
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    return { status: error.status ?? 1, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

function writeFixtureFile(root, relativePath, contents) {
  const full = join(root, relativePath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, contents);
}

function gitInit(root) {
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["-c", "user.email=t@e.x", "-c", "user.name=t", "add", "-A"], { cwd: root });
  execFileSync("git", ["-c", "user.email=t@e.x", "-c", "user.name=t", "commit", "-qm", "init"], { cwd: root });
}

function rekonArtifactTypes(root) {
  const types = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".json")) {
        try {
          const parsed = JSON.parse(readFileSync(full, "utf8"));
          const type = parsed?.header?.artifactType;
          if (typeof type === "string") types.add(type);
        } catch {
          /* ignore non-artifact json */
        }
      }
    }
  };
  const rekonDir = join(root, ".rekon");
  if (existsSync(rekonDir)) walk(rekonDir);
  return types;
}

function sourceChanged(root) {
  return execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" })
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.includes(".rekon/"));
}

// ---- Scenario A: explicit path / local edit context ----

const EXPLICIT_TASK =
  "Add a marker export to src/index.ts. Do not change greet behavior. Verify with typecheck and tests.";

function setupExplicitPathFixture() {
  const dir = mkdtempSync(join(tmpdir(), "rekon-task-context-dogfood-path-"));
  const root = join(dir, "fixture");
  mkdirSync(root, { recursive: true });
  writeFixtureFile(
    root,
    "package.json",
    JSON.stringify(
      {
        name: "task-context-path",
        version: "0.0.0",
        type: "module",
        scripts: { typecheck: "tsc --noEmit", test: "node --test", build: "echo build" },
      },
      null,
      2,
    ),
  );
  writeFixtureFile(
    root,
    "src/index.ts",
    [
      'export const existing = "ok";',
      "",
      "export function greet(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
      "export function marker(): string {",
      '  return "marker";',
      "}",
      "",
    ].join("\n"),
  );
  writeFixtureFile(
    root,
    "test/index.test.ts",
    [
      'import assert from "node:assert/strict";',
      'import test from "node:test";',
      'import { greet } from "../src/index.js";',
      "",
      'test("greet returns message", () => {',
      '  assert.equal(greet("rekon"), "hello rekon");',
      "});",
      "",
    ].join("\n"),
  );
  gitInit(root);
  runCli(["capability", "graph", "build", "--root", root, "--json"]);
  return root;
}

const explicitRoot = setupExplicitPathFixture();
const explicitJson = JSON.parse(
  runCli(["context", "task", "--root", explicitRoot, "--task", EXPLICIT_TASK, "--path", "src/index.ts", "--json"]).stdout,
);
const explicitHuman = runCli(["context", "task", "--root", explicitRoot, "--task", EXPLICIT_TASK, "--path", "src/index.ts"]).stdout;
const explicitTypes = rekonArtifactTypes(explicitRoot);

// ---- Scenario B: embedding retrieval + graph expansion ----

const RETRIEVAL_TASK =
  "Update inbound SMS routing while preserving outbound SMS formatting. Do not change user profile or order creation code. Verify routing behavior.";

function setupRetrievalFixture() {
  const dir = mkdtempSync(join(tmpdir(), "rekon-task-context-dogfood-retrieval-"));
  const root = join(dir, "fixture");
  mkdirSync(root, { recursive: true });
  writeFixtureFile(root, "package.json", JSON.stringify({ name: "task-context-retrieval", version: "0.0.0", type: "module" }, null, 2));
  writeFixtureFile(
    root,
    "src/users/get-user.ts",
    [
      "export type User = { id: string; email: string };",
      "export function getUser(id: string): User { return { id, email: `${id}@example.com` }; }",
      'export function findUserByEmail(email: string): User { return { id: email.split("@")[0] ?? "unknown", email }; }',
      "",
    ].join("\n"),
  );
  writeFixtureFile(
    root,
    "src/users/user-profile.ts",
    [
      'import type { User } from "./get-user.js";',
      "export function buildUserProfile(user: User): { id: string; displayName: string } { return { id: user.id, displayName: user.email }; }",
      "",
    ].join("\n"),
  );
  writeFixtureFile(
    root,
    "src/orders/create-order.ts",
    [
      "export type Order = { id: string; userId: string };",
      "export function createOrder(userId: string): Order { return { id: `order-${userId}`, userId }; }",
      "export function validateOrder(order: Order): boolean { return order.id.length > 0 && order.userId.length > 0; }",
      "",
    ].join("\n"),
  );
  writeFixtureFile(
    root,
    "src/sms/route-message.ts",
    [
      "export type SmsMessage = { from: string; body: string };",
      'export function routeInboundSms(message: SmsMessage): string { if (message.body.includes("support")) { return "support"; } return "default"; }',
      'export function normalizePhoneNumber(value: string): string { return value.replace(/\\D/g, ""); }',
      "",
    ].join("\n"),
  );
  writeFixtureFile(
    root,
    "src/sms/send-message.ts",
    [
      "export function sendSms(to: string, body: string): { to: string; body: string; queued: boolean } { return { to, body, queued: true }; }",
      "export function formatOutboundSms(body: string): string { return body.trim(); }",
      "",
    ].join("\n"),
  );
  writeFixtureFile(
    root,
    "src/unrelated/colors.ts",
    [
      'export const colors = ["red", "green", "blue"];',
      'export function pickColor(index: number): string { return colors[index % colors.length] ?? "red"; }',
      "",
    ].join("\n"),
  );
  gitInit(root);
  runCli(["capability", "graph", "build", "--root", root, "--json"]);
  runCli(["embeddings", "index", "--root", root, "--all", "--provider", "mock", "--model", "mock-embedding", "--json"]);
  return root;
}

const retrievalRoot = setupRetrievalFixture();
// Robust probe: retrieval + explicit SMS path + deterministic graph expansion.
const retrievalJson = JSON.parse(
  runCli([
    "context", "task", "--root", retrievalRoot, "--task", RETRIEVAL_TASK,
    "--path", "src/sms/route-message.ts", "--provider", "mock", "--model", "mock-embedding", "--json",
  ]).stdout,
);
// Honest pure-retrieval probe: no --path, so the report depends entirely on the
// lexical mock provider, which scores below the useful band here.
const pureRetrievalJson = JSON.parse(
  runCli([
    "context", "task", "--root", retrievalRoot, "--task", RETRIEVAL_TASK,
    "--provider", "mock", "--model", "mock-embedding", "--json",
  ]).stdout,
);
const retrievalTypes = rekonArtifactTypes(retrievalRoot);

// ---- Scenario A assertions ----

// 1
test("explicit-path scenario writes a TaskContextReport", () => {
  assert.equal(explicitJson.artifact.type, "TaskContextReport");
  assert.ok(typeof explicitJson.artifact.id === "string" && explicitJson.artifact.id.length > 0);
  assert.ok(explicitTypes.has("TaskContextReport"));
});

// 2
test("explicit-path context includes src/index.ts", () => {
  assert.ok(explicitJson.contextItems.some((item) => item.path === "src/index.ts"));
});

// 3
test("explicit-path doNotTouch includes greet behavior", () => {
  assert.ok(explicitJson.doNotTouch.some((zone) => /do not change greet/i.test(zone.reason)));
});

// 4
test("explicit-path verificationHints include a typecheck/test hint", () => {
  assert.ok(
    explicitJson.verificationHints.some((hint) => hint.command === "npm run typecheck" || hint.command === "npm test"),
  );
});

// 5
test("explicit-path human output includes the Task Context heading", () => {
  assert.ok(explicitHuman.includes("# Task Context"));
});

// 6
test("explicit-path JSON includes contextItems", () => {
  assert.ok(Array.isArray(explicitJson.contextItems) && explicitJson.contextItems.length > 0);
  assert.ok(explicitJson.contextItems.every((item) => typeof item.reason === "string" && item.reason.length > 0));
});

// 7
test("explicit-path JSON includes doNotTouch", () => {
  assert.ok(Array.isArray(explicitJson.doNotTouch) && explicitJson.doNotTouch.length > 0);
});

// 8
test("explicit-path JSON includes verificationHints", () => {
  assert.ok(Array.isArray(explicitJson.verificationHints) && explicitJson.verificationHints.length > 0);
});

// 9
test("explicit-path source files unchanged", () => {
  assert.deepEqual(sourceChanged(explicitRoot), []);
});

// ---- Scenario B assertions ----

// 10
test("retrieval scenario writes a TaskContextReport", () => {
  assert.equal(retrievalJson.artifact.type, "TaskContextReport");
  assert.ok(retrievalTypes.has("TaskContextReport"));
});

// 11
test("retrieval scenario has contextItems", () => {
  assert.ok(Array.isArray(retrievalJson.contextItems) && retrievalJson.contextItems.length > 0);
});

// 12
test("retrieval scenario includes an SMS-related item or records a weak/unavailable warning", () => {
  const smsItem = retrievalJson.contextItems.some((item) => String(item.path ?? item.symbolId ?? "").includes("sms"));
  const weakWarning = pureRetrievalJson.warnings.some(
    (warning) => warning.includes("retrieval-low-signal") || warning.includes("retrieval-unavailable"),
  );
  assert.ok(smsItem || weakWarning);
  // Honest finding: pure mock retrieval (no --path) selects no embedding context
  // items and records the low-signal warning instead of a silent empty result.
  assert.ok(weakWarning, "expected a retrieval-low-signal warning on the pure-retrieval probe");
  assert.equal(pureRetrievalJson.summary.embeddingNeighbors, 0);
});

// 13
test("unrelated colors is not the only top context item", () => {
  const colorsOnly =
    retrievalJson.contextItems.length > 0 &&
    retrievalJson.contextItems.every((item) => String(item.path ?? "").includes("colors"));
  assert.ok(!colorsOnly);
});

// 14
test("doNotTouch captures the user/order constraint", () => {
  assert.ok(
    retrievalJson.doNotTouch.some((zone) => /user profile|order creation/i.test(zone.reason)),
    "expected the explicit user-profile/order-creation constraint to be extracted",
  );
});

// 15
test("verification hints are hints, not executed commands", () => {
  assert.equal(retrievalJson.boundaries.executedCommands, false);
  assert.equal(retrievalJson.boundaries.ranCirce, false);
  for (const hint of retrievalJson.verificationHints) {
    assert.deepEqual(hint.evidenceRefs, []);
  }
  // Scenario A produces hints, and those are also hints (empty evidence refs).
  for (const hint of explicitJson.verificationHints) {
    assert.deepEqual(hint.evidenceRefs, []);
  }
});

// 16
test("graphNeighborhood has nodes or claims", () => {
  const { nodes, claims } = retrievalJson.graphNeighborhood;
  assert.ok(nodes.length > 0 || claims.length > 0);
});

// 17
test("evidence refs are present on graph-derived context", () => {
  assert.ok(
    retrievalJson.contextItems.some((item) => Array.isArray(item.evidenceRefs) && item.evidenceRefs.length > 0),
    "expected at least one context item to preserve evidence refs",
  );
});

// 18
test("artifacts validate clean in both scenarios", () => {
  const a = JSON.parse(runCli(["artifacts", "validate", "--root", explicitRoot, "--json"]).stdout);
  const b = JSON.parse(runCli(["artifacts", "validate", "--root", retrievalRoot, "--json"]).stdout);
  assert.equal(a.valid, true);
  assert.equal(b.valid, true);
});

// 19
test("no PreparedIntentPlan created", () => {
  assert.equal(explicitJson.boundaries.createdPreparedIntentPlan, false);
  assert.equal(retrievalJson.boundaries.createdPreparedIntentPlan, false);
  assert.ok(!explicitTypes.has("PreparedIntentPlan"));
  assert.ok(!retrievalTypes.has("PreparedIntentPlan"));
});

// 20
test("no WorkOrder created", () => {
  assert.equal(explicitJson.boundaries.createdWorkOrder, false);
  assert.equal(retrievalJson.boundaries.createdWorkOrder, false);
  assert.ok(!explicitTypes.has("WorkOrder"));
  assert.ok(!retrievalTypes.has("WorkOrder"));
});

// 21
test("no VerificationPlan created", () => {
  assert.equal(explicitJson.boundaries.createdVerificationPlan, false);
  assert.equal(retrievalJson.boundaries.createdVerificationPlan, false);
  assert.ok(!explicitTypes.has("VerificationPlan"));
  assert.ok(!retrievalTypes.has("VerificationPlan"));
});

// 22
test("no commands executed", () => {
  assert.equal(explicitJson.boundaries.executedCommands, false);
  assert.equal(retrievalJson.boundaries.executedCommands, false);
});

// 23
test("no source files written in either scenario", () => {
  assert.equal(explicitJson.boundaries.wroteSourceFiles, false);
  assert.equal(retrievalJson.boundaries.wroteSourceFiles, false);
  assert.deepEqual(sourceChanged(retrievalRoot), []);
});

// 24
test("no Circe run", () => {
  assert.equal(explicitJson.boundaries.ranCirce, false);
  assert.equal(retrievalJson.boundaries.ranCirce, false);
});

// 25
test("intent:go not invoked", () => {
  assert.equal(explicitJson.boundaries.implementedIntentGo, false);
  assert.equal(retrievalJson.boundaries.implementedIntentGo, false);
});
