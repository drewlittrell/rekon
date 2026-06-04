// Contract tests for TaskContextReport v1 (slice 166). Exercises the pure
// `buildTaskContextReport` helper, the factory/validator boundary rules, and the
// `rekon context task` CLI end-to-end. Task-shaped context is proposal/context,
// not proof: deterministic graph facts outrank embedding similarity, ignored
// neighbors are excluded, evidence refs are preserved, verification hints are
// hints (never executed), and no source is written / no command executed / no
// PreparedIntentPlan / WorkOrder / VerificationPlan created.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import test from "node:test";

import {
  buildTaskContextReport,
  TASK_CONTEXT_REPORT_ARTIFACT_ID_PREFIX,
} from "@rekon/capability-model";
import {
  createTaskContextReport,
  validateTaskContextReport,
} from "@rekon/kernel-repo-model";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const CLI = resolve(repoRoot, "packages/cli/dist/index.js");

const GRAPH_FIXTURE = {
  nodes: [
    { kind: "file", id: "src/index.ts" },
    { kind: "symbol", id: "src/index.ts#greet" },
    { kind: "file", id: "src/users/get-user.ts" },
    { kind: "capability", id: "cap:get:user" },
  ],
  claims: [
    {
      id: "claim-exposes",
      subject: { kind: "file", id: "src/index.ts" },
      predicate: "exposes",
      object: { kind: "symbol", id: "src/index.ts#greet" },
      source: "deterministic",
      confidence: 1,
      evidenceRefs: ["ev-1"],
      status: "accepted",
    },
    {
      id: "claim-semantic",
      subject: { kind: "file", id: "src/users/get-user.ts" },
      predicate: "summarized-as",
      object: "looks up a user by id",
      source: "llm",
      confidence: 0.6,
      evidenceRefs: ["sem-ev-1"],
      status: "accepted",
    },
  ],
  capabilities: [
    {
      id: "cap:get:user",
      verb: "get",
      noun: "user",
      implementedBy: [{ kind: "symbol", id: "src/users/get-user.ts#getUser" }],
      evidenceRefs: ["ev-cap-1"],
    },
  ],
};

const AT = "2026-01-01T00:00:00.000Z";
const TASK = "Add a marker export to src/index.ts. Do not change greet behavior. Verify with typecheck.";

const baseReport = buildTaskContextReport({
  taskText: TASK,
  paths: ["src/index.ts"],
  graph: GRAPH_FIXTURE,
  retrievalResults: [],
  generatedAt: AT,
  repoId: ".",
});

const rankedReport = buildTaskContextReport({
  taskText: "find user lookup code",
  paths: [],
  graph: GRAPH_FIXTURE,
  retrievalResults: [
    { score: 0.85, chunkId: "c-strong", kind: "file_summary", path: "src/strong.ts", chunk: { id: "c-strong", kind: "file_summary", path: "src/strong.ts" } },
    { score: 0.7, chunkId: "c-useful", kind: "file_summary", path: "src/useful.ts", chunk: { id: "c-useful", kind: "file_summary", path: "src/useful.ts" } },
    { score: 0.3, chunkId: "c-ignored", kind: "file_summary", path: "src/ignored.ts", chunk: { id: "c-ignored", kind: "file_summary", path: "src/ignored.ts" } },
  ],
  generatedAt: AT,
  repoId: ".",
});

// 1
test("builder creates a TaskContextReport", () => {
  assert.equal(baseReport.header.artifactType, "TaskContextReport");
  assert.equal(baseReport.schemaVersion, "0.1.0");
  assert.ok(baseReport.header.artifactId.startsWith(TASK_CONTEXT_REPORT_ARTIFACT_ID_PREFIX));
});

// 2
test("factory forces all boundaries false", () => {
  const forced = createTaskContextReport({
    ...baseReport,
    boundaries: { ...baseReport.boundaries, retrievalIsProof: true, executedCommands: true },
  });
  assert.ok(Object.values(forced.boundaries).every((value) => value === false));
});

// 3
test("validator rejects a non-false boundary", () => {
  const bad = structuredClone(baseReport);
  bad.boundaries.retrievalIsProof = true;
  assert.equal(validateTaskContextReport(bad).ok, false);
});

// 4
test("empty task text is invalid", () => {
  const bad = structuredClone(baseReport);
  bad.task.text = "";
  assert.equal(validateTaskContextReport(bad).ok, false);
});

// 5
test("operator-provided path becomes a context item", () => {
  assert.ok(
    baseReport.contextItems.some((item) => item.source === "operator_input" && item.path === "src/index.ts"),
  );
});

// 6
test("strong embedding neighbor becomes a context item", () => {
  assert.ok(
    rankedReport.contextItems.some(
      (item) => item.source === "embedding_retrieval" && item.path === "src/strong.ts" && item.scoreBand === "strong",
    ),
  );
});

// 7
test("useful embedding neighbor becomes a context item", () => {
  assert.ok(
    rankedReport.contextItems.some(
      (item) => item.source === "embedding_retrieval" && item.path === "src/useful.ts" && item.scoreBand === "useful",
    ),
  );
});

// 8
test("ignored embedding neighbor is excluded by default", () => {
  assert.ok(!rankedReport.contextItems.some((item) => item.path === "src/ignored.ts"));
});

// 9
test("deterministic graph facts appear in context when connected", () => {
  assert.ok(
    baseReport.contextItems.some((item) => item.source === "deterministic_graph" && item.path === "src/index.ts"),
  );
});

// 10
test("evidence refs are preserved", () => {
  const det = baseReport.contextItems.find((item) => item.source === "deterministic_graph");
  assert.ok(det && det.evidenceRefs.includes("claim-exposes"));
  const strong = rankedReport.contextItems.find((item) => item.path === "src/strong.ts");
  assert.ok(strong && strong.evidenceRefs.includes("c-strong"));
});

// 11
test("do-not-touch zone is created from an explicit task constraint", () => {
  assert.ok(baseReport.doNotTouch.some((zone) => /do not change greet/i.test(zone.reason)));
});

// 12
test("verification hint is created as a hint only", () => {
  const hint = baseReport.verificationHints.find((entry) => entry.command === "npm run typecheck");
  assert.ok(hint, "expected an npm run typecheck verification hint");
  assert.deepEqual(hint.evidenceRefs, []);
  assert.equal(baseReport.boundaries.executedCommands, false);
});

// ---- CLI end-to-end ----

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

function setupFixture() {
  const dir = mkdtempSync(join(tmpdir(), "rekon-task-context-"));
  const root = join(dir, "fixture");
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "fixture", version: "0.0.0", type: "module" }, null, 2));
  writeFileSync(
    join(root, "src", "index.ts"),
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
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["-c", "user.email=t@e.x", "-c", "user.name=t", "add", "-A"], { cwd: root });
  execFileSync("git", ["-c", "user.email=t@e.x", "-c", "user.name=t", "commit", "-qm", "init"], { cwd: root });
  runCli(["capability", "graph", "build", "--root", root, "--json"]);
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

const cliRoot = setupFixture();
const cliJson = (() => {
  const result = runCli(["context", "task", "--root", cliRoot, "--task", TASK, "--path", "src/index.ts", "--json"]);
  return JSON.parse(result.stdout);
})();
const storeTypes = rekonArtifactTypes(cliRoot);

// 13
test("TaskContextReport creates no PreparedIntentPlan", () => {
  assert.equal(cliJson.boundaries.createdPreparedIntentPlan, false);
  assert.ok(!storeTypes.has("PreparedIntentPlan"));
});

// 14
test("TaskContextReport creates no WorkOrder", () => {
  assert.equal(cliJson.boundaries.createdWorkOrder, false);
  assert.ok(!storeTypes.has("WorkOrder"));
});

// 15
test("TaskContextReport creates no VerificationPlan", () => {
  assert.equal(cliJson.boundaries.createdVerificationPlan, false);
  assert.ok(!storeTypes.has("VerificationPlan"));
});

// 16
test("TaskContextReport executes no commands", () => {
  assert.equal(cliJson.boundaries.executedCommands, false);
  assert.equal(cliJson.boundaries.ranCirce, false);
});

// 17
test("TaskContextReport writes no source files", () => {
  assert.equal(cliJson.boundaries.wroteSourceFiles, false);
  const diff = execFileSync("git", ["status", "--porcelain", "src/index.ts"], { cwd: cliRoot, encoding: "utf8" });
  assert.equal(diff.trim(), "");
});

// 18
test("CLI context task --path writes a TaskContextReport when the graph exists", () => {
  assert.equal(cliJson.artifact.type, "TaskContextReport");
  assert.ok(typeof cliJson.artifact.id === "string" && cliJson.artifact.id.length > 0);
  assert.ok(storeTypes.has("TaskContextReport"));
});

// 19
test("CLI JSON includes contextItems", () => {
  assert.ok(Array.isArray(cliJson.contextItems) && cliJson.contextItems.length > 0);
  assert.ok(cliJson.contextItems.every((item) => typeof item.reason === "string" && item.reason.length > 0));
});

// 20
test("CLI JSON includes doNotTouch", () => {
  assert.ok(Array.isArray(cliJson.doNotTouch));
  assert.ok(cliJson.doNotTouch.some((zone) => /do not change greet/i.test(zone.reason)));
});

// 21
test("CLI JSON includes verificationHints", () => {
  assert.ok(Array.isArray(cliJson.verificationHints));
  assert.ok(cliJson.verificationHints.some((hint) => hint.command === "npm run typecheck"));
});

// 22
test("CLI human output includes Task Context", () => {
  const human = runCli(["context", "task", "--root", cliRoot, "--task", TASK, "--path", "src/index.ts"]);
  assert.ok(human.stdout.includes("Task Context"));
});

// 23
test("CLI help lists context task", () => {
  const help = runCli(["--help"]);
  assert.ok(help.stdout.includes("context task"));
});

// 24
test("artifacts validate clean", () => {
  const validate = JSON.parse(runCli(["artifacts", "validate", "--root", cliRoot, "--json"]).stdout);
  assert.equal(validate.valid, true);
});

// 25
test("source files unchanged", () => {
  // The command writes its artifact to the `.rekon/` store (its intended output
  // location); a fresh fixture repo does not gitignore it. The assertion is that
  // no SOURCE files changed — so filter the artifact store out.
  const changed = execFileSync("git", ["status", "--porcelain"], { cwd: cliRoot, encoding: "utf8" })
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.includes(".rekon/"));
  assert.deepEqual(changed, []);
});

// 26
test("CLI uses cached embedding neighbors when present", () => {
  runCli(["embeddings", "index", "--root", cliRoot, "--all", "--provider", "mock", "--model", "mock-embedding", "--json"]);
  const withCache = JSON.parse(
    runCli(["context", "task", "--root", cliRoot, "--task", "look up the user", "--provider", "mock", "--model", "mock-embedding", "--json"]).stdout,
  );
  // Retrieval was consulted: no retrieval-unavailable warning when the cache exists
  // and the provider can embed.
  assert.ok(!withCache.warnings.some((warning) => warning.includes("retrieval-unavailable")));
});

// 27
test("CLI missing provider with no explicit paths fails cleanly", () => {
  const freshRoot = setupFixture();
  const result = runCli(["context", "task", "--root", freshRoot, "--task", "do something", "--json"]);
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "failed");
  assert.equal(payload.error, "context-retrieval-unavailable");
});
