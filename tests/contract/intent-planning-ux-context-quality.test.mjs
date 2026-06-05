// Contract tests for the Intent Planning UX / Context Quality Fix (slice 175).
//
// The one carried ergonomics issue from the TaskContextReport intent dogfood:
// `rekon context task` with an existing embeddings index, no --path, and an
// IMPLICITLY-defaulted provider (`voyage`) whose API key is missing used to exit
// non-zero. This fix degrades gracefully to a graph + lexical context fallback in
// that case, while keeping EXPLICIT provider failures strict. Task-shaped context
// stays proposal/context, not proof: no source is written, no command executed, no
// PreparedIntentPlan / WorkOrder / VerificationPlan created, no Circe run.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import test from "node:test";

import { selectLexicalGraphContextPaths } from "@rekon/capability-model";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const CLI = resolve(repoRoot, "packages/cli/dist/index.js");

// Empty VOYAGE_API_KEY makes the implicitly-defaulted `voyage` provider fail with
// `missing-api-key` and makes NO network call — the exact dogfood scenario.
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

function setupIndexedFixture() {
  const dir = mkdtempSync(join(tmpdir(), "rekon-intent-ux-"));
  const root = join(dir, "context-provider-fallback");
  mkdirSync(join(root, "src", "sms"), { recursive: true });
  mkdirSync(join(root, "src", "users"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "context-provider-fallback", version: "0.0.0", type: "module" }, null, 2),
  );
  writeFileSync(
    join(root, "src", "sms", "route-message.ts"),
    [
      "export type SmsMessage = { from: string; body: string };",
      "",
      "export function routeInboundSms(message: SmsMessage): string {",
      '  if (message.body.includes("support")) {',
      '    return "support";',
      "  }",
      '  return "default";',
      "}",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(root, "src", "users", "profile.ts"),
    ["export function buildProfileLabel(email: string): string {", "  return email;", "}", ""].join("\n"),
  );
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["-c", "user.email=t@e.x", "-c", "user.name=t", "add", "-A"], { cwd: root });
  execFileSync("git", ["-c", "user.email=t@e.x", "-c", "user.name=t", "commit", "-qm", "init"], { cwd: root });
  runCli(["capability", "graph", "build", "--root", root, "--json"]);
  runCli(["embeddings", "index", "--root", root, "--all", "--provider", "mock", "--model", "mock-embedding", "--json"]);
  return root;
}

function rekonArtifactTypes(root) {
  const types = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".json")) {
        try {
          const type = JSON.parse(readFileSync(full, "utf8"))?.header?.artifactType;
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

function sourceDiff(root) {
  return execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" })
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.includes(".rekon/"));
}

const FALLBACK_TASK =
  "Update inbound SMS routing. Do not change profile label behavior. Verify routing behavior.";

const root = setupIndexedFixture();

// Implicit provider (no --provider), existing index, missing key, no --path.
const fallbackResult = runCli(["context", "task", "--root", root, "--task", FALLBACK_TASK, "--json"]);
const fallbackJson = JSON.parse(fallbackResult.stdout);
const fallbackHuman = runCli(["context", "task", "--root", root, "--task", FALLBACK_TASK]).stdout;

// Explicit --provider voyage with missing key (must stay strict).
const explicitVoyage = runCli([
  "context", "task", "--root", root, "--task", "Update inbound SMS routing.", "--provider", "voyage", "--json",
]);

// --provider mock still works; --path still works without provider.
const mockNoPath = runCli([
  "context", "task", "--root", root, "--task", FALLBACK_TASK, "--provider", "mock", "--model", "mock-embedding", "--json",
]);
const lowSignal = runCli([
  "context", "task", "--root", root, "--task", "investigate quux frobnicate widget", "--provider", "mock", "--model", "mock-embedding", "--json",
]);
const pathOnly = runCli([
  "context", "task", "--root", root, "--task", FALLBACK_TASK, "--path", "src/sms/route-message.ts", "--json",
]);

const storeTypes = rekonArtifactTypes(root);

// 1
test("implicit provider + existing index + missing key + no --path does not exit non-zero", () => {
  assert.equal(fallbackResult.status, 0);
  assert.notEqual(fallbackJson.status, "failed");
  assert.equal(fallbackJson.providerExplicit, false);
});

// 2
test("graph/lexical fallback writes a TaskContextReport with graph context", () => {
  assert.ok(fallbackJson.artifact && fallbackJson.artifact.type === "TaskContextReport");
  const paths = (fallbackJson.contextItems ?? []).map((item) => item.path).filter(Boolean);
  assert.ok(paths.includes("src/sms/route-message.ts"), "expected route-message.ts from lexical match on 'sms'");
  assert.ok(
    (fallbackJson.contextItems ?? []).some(
      (item) => item.source === "deterministic_graph" && /lexically matched/i.test(item.reason ?? ""),
    ),
    "expected a graph+lexical fallback context item",
  );
});

// 3
test("JSON includes a provider-unavailable warning", () => {
  assert.ok((fallbackJson.warnings ?? []).some((w) => w.includes("provider-unavailable")));
});

// 4
test("JSON indicates graph/lexical fallback retrieval status", () => {
  assert.equal(fallbackJson.retrieval?.status, "fallback");
  assert.equal(fallbackJson.retrieval?.fallback, "graph-lexical");
  assert.ok((fallbackJson.warnings ?? []).some((w) => w.includes("graph-lexical-fallback")));
});

// 5
test("human output includes the fallback warning", () => {
  assert.match(fallbackHuman, /graph \+ lexical context fallback/i);
});

// 6
test("explicit --provider voyage with missing key still fails cleanly", () => {
  assert.equal(explicitVoyage.status, 1);
  const payload = JSON.parse(explicitVoyage.stdout);
  assert.equal(payload.status, "failed");
  assert.equal(payload.error, "context-retrieval-unavailable");
  assert.equal(payload.providerExplicit, true);
});

// 7
test("--provider mock still works (ranked retrieval, exit 0)", () => {
  assert.equal(mockNoPath.status, 0);
  const payload = JSON.parse(mockNoPath.stdout);
  assert.notEqual(payload.status, "failed");
  assert.notEqual(payload.retrieval?.status, "fallback");
  assert.ok(payload.artifact && payload.artifact.type === "TaskContextReport");
});

// 8
test("--path still works without a provider", () => {
  assert.equal(pathOnly.status, 0);
  const payload = JSON.parse(pathOnly.stdout);
  assert.notEqual(payload.status, "failed");
  assert.ok(
    (payload.contextItems ?? []).some(
      (item) => item.source === "operator_input" && item.path === "src/sms/route-message.ts",
    ),
  );
});

// 9
test("retrieval-low-signal stays visible for low-signal mock retrieval", () => {
  const payload = JSON.parse(lowSignal.stdout);
  assert.equal(lowSignal.status, 0);
  assert.ok((payload.warnings ?? []).some((w) => w.includes("retrieval-low-signal")));
});

// 10
test("manual-verification hints still work", () => {
  assert.ok(
    (fallbackJson.verificationHints ?? []).some((hint) => hint.artifact === "manual-verification"),
    "expected a manual-verification hint from the free-form 'Verify routing behavior' clause",
  );
});

// 11
test("do-not-touch extraction still works", () => {
  assert.ok(
    (fallbackJson.doNotTouch ?? []).some((zone) => /do not change profile label/i.test(zone.reason ?? "")),
  );
});

// 12
test("no PreparedIntentPlan is created", () => {
  assert.equal(fallbackJson.boundaries.createdPreparedIntentPlan, false);
  assert.ok(!storeTypes.has("PreparedIntentPlan"));
});

// 13
test("no WorkOrder is created", () => {
  assert.ok(!storeTypes.has("WorkOrder"));
});

// 14
test("no VerificationPlan is created", () => {
  assert.ok(!storeTypes.has("VerificationPlan"));
  assert.ok(!storeTypes.has("VerificationRun"));
});

// 15
test("no commands are executed", () => {
  assert.equal(fallbackJson.boundaries.executedCommands, false);
});

// 16
test("no source files are written", () => {
  assert.deepEqual(sourceDiff(root), []);
});

// 17
test("artifacts validate clean", () => {
  const validate = JSON.parse(runCli(["artifacts", "validate", "--root", root, "--json"]).stdout);
  assert.equal(validate.valid, true);
  assert.deepEqual(validate.issues, []);
});

// 18
test("graph + lexical fallback is user-visible in CLI output", () => {
  // The fallback path surfaces a `graph-lexical-fallback` warning string and a
  // `retrieval.fallback` field — both user-visible, so an operator/agent can tell
  // a degraded context apart from ranked embedding retrieval.
  assert.ok((fallbackJson.warnings ?? []).some((w) => /graph \+ lexical|graph-lexical/i.test(w)));
  assert.equal(fallbackJson.retrieval?.fallback, "graph-lexical");
});

// 19 (bonus) — pure helper is deterministic and selects only real graph nodes.
test("selectLexicalGraphContextPaths is pure and matches graph file nodes", () => {
  const graph = {
    nodes: [
      { kind: "file", id: "src/sms/route-message.ts" },
      { kind: "file", id: "src/users/profile.ts" },
      { kind: "file", id: "src/unrelated/widget.ts" },
    ],
    claims: [],
    capabilities: [],
  };
  const picks = selectLexicalGraphContextPaths("update inbound sms routing", graph);
  assert.ok(picks.includes("src/sms/route-message.ts"));
  assert.ok(!picks.includes("src/users/profile.ts"));
  // Deterministic: same inputs → same output.
  assert.deepEqual(picks, selectLexicalGraphContextPaths("update inbound sms routing", graph));
  // No match → empty (never fabricates context).
  assert.deepEqual(selectLexicalGraphContextPaths("zzz qqq", graph), []);
});
