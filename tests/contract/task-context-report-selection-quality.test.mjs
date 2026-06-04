// Selection-quality contract tests for TaskContextReport (slice 169). Covers the
// two quality fixes from the dogfood review:
//   1. free-form verification intent ("Verify routing behavior") now creates a
//      NON-command verification hint without inventing a shell command, while
//      explicit command mentions still create command hints;
//   2. weak-band embedding neighbors are included as labelled SUPPORTING context
//      only when no strong/useful neighbor exists, and `retrieval-low-signal`
//      stays visible (all-ignored or all-weak retrieval).
// Task-shaped context remains proposal/context, never proof: no command is
// executed, no source is written, and no PreparedIntentPlan / WorkOrder /
// VerificationPlan is created.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";
import test from "node:test";

import { buildTaskContextReport } from "@rekon/capability-model";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const CLI = resolve(repoRoot, "packages/cli/dist/index.js");
const AT = "2026-01-01T00:00:00.000Z";
const EMPTY_GRAPH = { nodes: [], claims: [], capabilities: [] };

const liveEnabled = process.env.REKON_RUN_LIVE_EMBEDDING_TESTS === "1" && Boolean(process.env.VOYAGE_API_KEY);

function build(taskText, retrievalResults) {
  return buildTaskContextReport({
    taskText,
    graph: EMPTY_GRAPH,
    generatedAt: AT,
    repoId: ".",
    ...(retrievalResults ? { retrievalResults } : {}),
  });
}

function emb(score, name) {
  return { score, chunkId: name, path: `src/${name}.ts`, chunk: { id: name, path: `src/${name}.ts` } };
}

// ---- 1-9, 11-13: pure builder ----

// 1
test("free-form 'Verify routing behavior' creates a verification hint", () => {
  const hints = build("Verify routing behavior.").verificationHints;
  assert.ok(hints.some((h) => h.artifact === "manual-verification" && /verify/i.test(h.reason)));
});

// 2
test("free-form verification hint does not invent an executable command", () => {
  const hint = build("Verify routing behavior.").verificationHints.find((h) => h.artifact === "manual-verification");
  assert.ok(hint);
  assert.equal(hint.command, undefined);
  assert.deepEqual(hint.evidenceRefs, []);
});

// 3
test("'Make sure inbound SMS routing still works' creates a non-command hint", () => {
  const hints = build("Make sure inbound SMS routing still works.").verificationHints;
  assert.ok(hints.some((h) => h.artifact === "manual-verification" && h.command === undefined));
  assert.ok(!hints.some((h) => typeof h.command === "string"));
});

// 4
test("'Confirm greet behavior' creates a non-command hint", () => {
  const hints = build("Confirm greet behavior.").verificationHints;
  assert.ok(hints.some((h) => h.artifact === "manual-verification" && h.command === undefined));
});

// 5
test("explicit 'npm test' still creates a command hint", () => {
  const hints = build("Run npm test.").verificationHints;
  assert.ok(hints.some((h) => h.command === "npm test"));
});

// 6
test("explicit 'npm run build' still creates a command hint", () => {
  const hints = build("Use npm run build.").verificationHints;
  assert.ok(hints.some((h) => h.command === "npm run build"));
});

// 7
test("explicit 'typecheck' still creates a typecheck command hint", () => {
  const hints = build("Verify with typecheck.").verificationHints;
  assert.ok(hints.some((h) => h.command === "npm run typecheck"));
  // The 'Verify with typecheck.' clause maps to a command, so it must NOT also
  // emit a redundant free-form hint.
  assert.ok(!hints.some((h) => h.artifact === "manual-verification"));
});

// 8
test("verification hints remain hints only; boundaries show no execution", () => {
  const report = build("Verify routing behavior. Run npm test.");
  assert.equal(report.boundaries.executedCommands, false);
  assert.equal(report.boundaries.ranCirce, false);
  for (const hint of report.verificationHints) {
    assert.deepEqual(hint.evidenceRefs, []);
  }
});

// 9
test("do-not-touch extraction still works", () => {
  const report = build("Add a feature. Do not change the auth module. Verify routing behavior.");
  assert.ok(report.doNotTouch.some((z) => /do not change/i.test(z.reason)));
});

// 11
test("weak neighbor appears as supporting context when no strong/useful exists", () => {
  const items = build("t", [emb(0.55, "weak"), emb(0.3, "ignored")]).contextItems.filter(
    (i) => i.source === "embedding_retrieval",
  );
  assert.ok(items.some((i) => i.path === "src/weak.ts" && i.scoreBand === "weak"));
});

// 12
test("weak-supporting context is labelled weak/supporting", () => {
  const weak = build("t", [emb(0.55, "weak")]).contextItems.find((i) => i.source === "embedding_retrieval");
  assert.ok(weak);
  assert.equal(weak.scoreBand, "weak");
  assert.match(weak.reason, /supporting/i);
});

// 12b — weak is dropped when a strong/useful neighbor exists (gated supporting context)
test("weak neighbor is excluded when a strong/useful neighbor exists", () => {
  const items = build("t", [emb(0.85, "strong"), emb(0.55, "weak")]).contextItems.filter(
    (i) => i.source === "embedding_retrieval",
  );
  assert.ok(items.some((i) => i.path === "src/strong.ts"));
  assert.ok(!items.some((i) => i.path === "src/weak.ts"));
});

// 13
test("ignored-score neighbor remains excluded", () => {
  const items = build("t", [emb(0.85, "strong"), emb(0.3, "ignored")]).contextItems.filter(
    (i) => i.source === "embedding_retrieval",
  );
  assert.ok(!items.some((i) => i.path === "src/ignored.ts"));
});

// ---- 10, 14-19: CLI end-to-end ----

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
          /* ignore */
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

function setupRetrievalFixture() {
  const dir = mkdtempSync(join(tmpdir(), "rekon-task-context-quality-"));
  const root = join(dir, "fixture");
  mkdirSync(root, { recursive: true });
  writeFixtureFile(root, "package.json", JSON.stringify({ name: "fx", version: "0.0.0", type: "module" }, null, 2));
  writeFixtureFile(root, "src/users/get-user.ts", "export function getUser(id){ return { id }; }\n");
  writeFixtureFile(root, "src/users/user-profile.ts", "export function buildUserProfile(u){ return u; }\n");
  writeFixtureFile(root, "src/orders/create-order.ts", "export function createOrder(userId){ return { userId }; }\n");
  writeFixtureFile(root, "src/sms/route-message.ts", "export function routeInboundSms(b){ return b.includes('support') ? 'support' : 'default'; }\n");
  writeFixtureFile(root, "src/sms/send-message.ts", "export function sendSms(to, body){ return { to, body }; }\n");
  writeFixtureFile(root, "src/unrelated/colors.ts", "export const colors = ['red','green','blue'];\n");
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["-c", "user.email=t@e.x", "-c", "user.name=t", "add", "-A"], { cwd: root });
  execFileSync("git", ["-c", "user.email=t@e.x", "-c", "user.name=t", "commit", "-qm", "init"], { cwd: root });
  runCli(["capability", "graph", "build", "--root", root, "--json"]);
  runCli(["embeddings", "index", "--root", root, "--all", "--provider", "mock", "--model", "mock-embedding", "--json"]);
  return root;
}

const SMS_TASK =
  "Update inbound SMS routing while preserving outbound SMS formatting. Do not change user profile or order creation code. Verify routing behavior.";
const cliRoot = setupRetrievalFixture();
const cliJson = JSON.parse(
  runCli(["context", "task", "--root", cliRoot, "--task", SMS_TASK, "--provider", "mock", "--model", "mock-embedding", "--json"]).stdout,
);
const cliTypes = rekonArtifactTypes(cliRoot);

// 10
test("retrieval-low-signal warning appears when all neighbors are ignored/weak", () => {
  // The lexical mock scores this fixture below the useful band, so no useful
  // embedding context is selected — the low-signal warning must be visible.
  assert.ok(cliJson.warnings.some((w) => w.includes("retrieval-low-signal")));
});

// 10b — the SMS free-form verification intent now produces a hint via the CLI too
test("CLI surfaces the free-form verification hint for the routing task", () => {
  assert.ok(cliJson.verificationHints.some((h) => h.artifact === "manual-verification" && /routing/i.test(h.reason)));
});

// 14
test("source files unchanged", () => {
  assert.deepEqual(sourceChanged(cliRoot), []);
});

// 15
test("no commands executed", () => {
  assert.equal(cliJson.boundaries.executedCommands, false);
  assert.equal(cliJson.boundaries.ranCirce, false);
});

// 16
test("no PreparedIntentPlan created", () => {
  assert.equal(cliJson.boundaries.createdPreparedIntentPlan, false);
  assert.ok(!cliTypes.has("PreparedIntentPlan"));
});

// 17
test("no WorkOrder created", () => {
  assert.equal(cliJson.boundaries.createdWorkOrder, false);
  assert.ok(!cliTypes.has("WorkOrder"));
});

// 18
test("no VerificationPlan created", () => {
  assert.equal(cliJson.boundaries.createdVerificationPlan, false);
  assert.ok(!cliTypes.has("VerificationPlan"));
});

// 19
test("artifacts validate clean", () => {
  const validate = JSON.parse(runCli(["artifacts", "validate", "--root", cliRoot, "--json"]).stdout);
  assert.equal(validate.valid, true);
});

// ---- 20-23: live Voyage (skipped unless explicitly enabled) ----

const liveState = (() => {
  if (!liveEnabled) return null;
  const root = setupRetrievalFixture();
  // Re-index with the live provider over the same fixture.
  runCli(["embeddings", "index", "--root", root, "--all", "--provider", "voyage", "--model", "voyage-code-3", "--json"]);
  const json = JSON.parse(
    runCli([
      "context", "task", "--root", root, "--task",
      "How should I change inbound text routing while preserving outbound messaging behavior? Verify routing behavior.",
      "--provider", "voyage", "--model", "voyage-code-3", "--json",
    ]).stdout,
  );
  return { root, json };
})();

// 20
test("live Voyage retrieval returns at least one SMS-related context item", { skip: !liveEnabled }, () => {
  assert.ok(liveState.json.contextItems.some((i) => String(i.path ?? i.symbolId ?? "").includes("sms")));
});

// 21
test("live Voyage retrieval does not rank unrelated colors as core context", { skip: !liveEnabled }, () => {
  const core = liveState.json.contextItems.filter(
    (i) => i.source === "operator_input" || i.source === "deterministic_graph",
  );
  assert.ok(!core.some((i) => String(i.path ?? "").includes("colors")));
});

// 22
test("live Voyage task context preserves do-not-touch zones", { skip: !liveEnabled }, () => {
  assert.ok(liveState.json.doNotTouch.some((z) => /user profile|order creation/i.test(z.reason)));
});

// 23
test("live Voyage task context creates a verification hint for routing behavior", { skip: !liveEnabled }, () => {
  assert.ok(liveState.json.verificationHints.some((h) => h.artifact === "manual-verification" && /routing/i.test(h.reason)));
});
