// Contract tests for TaskContextReport Human/Agent Context Export (slice 177).
// Exercises how `rekon context task` PRESENTS the existing TaskContextReport to
// the two consumers: a human "read this before editing" markdown brief and an
// additive `agentContext` block on the --json payload. The TaskContextReport
// artifact stays canonical; this slice changes presentation only — no new
// artifact, no command executed, no source written, no PreparedIntentPlan /
// WorkOrder / VerificationPlan created. Task-shaped context is proposal/context,
// not proof: deterministic graph facts outrank embedding similarity, do-not-touch
// zones are guidance (not enforced), verification hints are hints (never
// executed), and evidence refs are preserved.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const CLI = resolve(repoRoot, "packages/cli/dist/index.js");

const TASK =
  "Add marker export to src/index.ts. Do not change greet behavior. Verify with typecheck and tests.";

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
  const dir = mkdtempSync(join(tmpdir(), "rekon-task-export-"));
  const root = join(dir, "fixture");
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "fixture", version: "0.0.0", type: "module" }, null, 2),
  );
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

const root = setupFixture();
const human = runCli(["context", "task", "--root", root, "--task", TASK, "--path", "src/index.ts"]).stdout;
const json = JSON.parse(
  runCli(["context", "task", "--root", root, "--task", TASK, "--path", "src/index.ts", "--json"]).stdout,
);
const agent = json.agentContext;
const storeTypes = rekonArtifactTypes(root);

const CORE_SOURCES = new Set(["operator_input", "deterministic_graph"]);
const SUPPORTING_SOURCES = new Set(["embedding_retrieval", "semantic_file_understanding"]);

// ---- Human "read this before editing" brief ----

// 1
test("human brief keeps the # Task Context heading (backward compatible)", () => {
  assert.ok(human.includes("# Task Context"));
});

// 2
test("human brief leads with 'Read this before editing.'", () => {
  assert.ok(human.includes("Read this before editing."));
});

// 3
test("human brief has a Core Context section", () => {
  assert.ok(human.includes("## Core Context"));
});

// 4
test("human brief has a Related / Supporting Context section", () => {
  assert.ok(human.includes("## Related / Supporting Context"));
});

// 5
test("human Do Not Touch section marks zones as guidance, not enforced", () => {
  assert.ok(human.includes("## Do Not Touch"));
  assert.ok(human.includes("(guidance, not enforced)"));
});

// 6
test("human Verification Hints section marks hints as not executed", () => {
  assert.ok(human.includes("## Verification Hints"));
  assert.ok(human.includes("(hint, not executed)"));
});

// 7
test("human brief has an Evidence section", () => {
  assert.ok(human.includes("## Evidence"));
});

// 8
test("human Core Context lists the operator-provided path", () => {
  const section = human.slice(human.indexOf("## Core Context"));
  assert.ok(/-\s+src\/index\.ts\b/.test(section));
});

// 9
test("human Do Not Touch surfaces the explicit greet constraint", () => {
  assert.ok(/Do not change greet/i.test(human));
});

// 10
test("human footer points to the structured --json agentContext form", () => {
  assert.ok(human.includes("--json"));
  assert.ok(human.toLowerCase().includes("agentcontext"));
});

// ---- Agent structured view (--json agentContext) ----

// 11
test("JSON carries an agentContext block with the expected keys", () => {
  assert.ok(agent && typeof agent === "object");
  for (const key of [
    "readBeforeEditing",
    "task",
    "coreContext",
    "supportingContext",
    "doNotTouch",
    "verificationHints",
    "warnings",
    "evidence",
    "boundaries",
  ]) {
    assert.ok(key in agent, `agentContext missing key: ${key}`);
  }
});

// 12
test("agentContext.readBeforeEditing leads with the read-before-editing notice", () => {
  assert.ok(typeof agent.readBeforeEditing === "string");
  assert.ok(agent.readBeforeEditing.startsWith("Read this before editing."));
});

// 13
test("agentContext.task echoes the task text and operator paths", () => {
  assert.equal(agent.task.text, TASK);
  assert.ok(agent.task.paths.includes("src/index.ts"));
});

// 14
test("agentContext.coreContext entries carry ref/source/reason/evidenceRefs", () => {
  assert.ok(Array.isArray(agent.coreContext) && agent.coreContext.length > 0);
  for (const item of agent.coreContext) {
    assert.ok(typeof item.ref === "string" && item.ref.length > 0);
    assert.ok(typeof item.source === "string");
    assert.ok(typeof item.reason === "string" && item.reason.length > 0);
    assert.ok(Array.isArray(item.evidenceRefs));
  }
});

// 15
test("agentContext.coreContext is only operator input + deterministic graph", () => {
  assert.ok(agent.coreContext.every((item) => CORE_SOURCES.has(item.source)));
});

// 16
test("agentContext.supportingContext is an array of embedding/semantic items only", () => {
  assert.ok(Array.isArray(agent.supportingContext));
  assert.ok(agent.supportingContext.every((item) => SUPPORTING_SOURCES.has(item.source)));
});

// 17
test("agentContext.doNotTouch zones are guidance (enforced:false) with the greet constraint", () => {
  assert.ok(Array.isArray(agent.doNotTouch) && agent.doNotTouch.length > 0);
  assert.ok(agent.doNotTouch.every((zone) => zone.enforced === false));
  assert.ok(agent.doNotTouch.some((zone) => /do not change greet/i.test(zone.reason)));
});

// 18
test("agentContext.verificationHints are hints (executed:false)", () => {
  assert.ok(Array.isArray(agent.verificationHints) && agent.verificationHints.length > 0);
  assert.ok(agent.verificationHints.every((hint) => hint.executed === false));
});

// 19
test("agentContext.verificationHints include the typecheck command hint", () => {
  assert.ok(agent.verificationHints.some((hint) => hint.command === "npm run typecheck"));
});

// 20
test("agentContext.evidence preserves evidence refs, deduped and sorted", () => {
  assert.ok(Array.isArray(agent.evidence) && agent.evidence.length > 0);
  assert.ok(agent.evidence.every((ref) => typeof ref === "string"));
  assert.equal(new Set(agent.evidence).size, agent.evidence.length);
  assert.deepEqual(agent.evidence, [...agent.evidence].sort());
});

// 21
test("agentContext.boundaries are all false, including approvedPlans + implementedIntentGo", () => {
  assert.ok(Object.values(agent.boundaries).every((value) => value === false));
  assert.equal(agent.boundaries.approvedPlans, false);
  assert.equal(agent.boundaries.implementedIntentGo, false);
});

// ---- Backward compatibility + boundaries ----

// 22
test("existing --json fields are preserved (additive change only)", () => {
  for (const key of [
    "command",
    "status",
    "provider",
    "providerExplicit",
    "model",
    "retrieval",
    "artifact",
    "task",
    "selection",
    "summary",
    "contextItems",
    "graphNeighborhood",
    "doNotTouch",
    "verificationHints",
    "warnings",
    "boundaries",
    "note",
  ]) {
    assert.ok(key in json, `top-level JSON missing pre-existing key: ${key}`);
  }
  assert.equal(json.command, "context task");
});

// 23
test("no PreparedIntentPlan / WorkOrder / VerificationPlan artifact is written", () => {
  assert.ok(!storeTypes.has("PreparedIntentPlan"));
  assert.ok(!storeTypes.has("WorkOrder"));
  assert.ok(!storeTypes.has("VerificationPlan"));
  assert.ok(storeTypes.has("TaskContextReport"));
});

// 24
test("no source files are written and boundaries confirm it", () => {
  assert.equal(json.boundaries.wroteSourceFiles, false);
  assert.equal(json.boundaries.executedCommands, false);
  const changed = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" })
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.includes(".rekon/"));
  assert.deepEqual(changed, []);
});

// 25
test("--help lists context task and describes the agentContext behavior", () => {
  const help = runCli(["--help"]);
  assert.ok(help.stdout.includes("context task"));
  assert.ok(help.stdout.toLowerCase().includes("agentcontext"));
});

// 26
test("strict no-index, no-path path still fails cleanly (unchanged)", () => {
  const freshRoot = setupFixture();
  const result = runCli(["context", "task", "--root", freshRoot, "--task", "do something", "--json"]);
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "failed");
  assert.equal(payload.error, "context-retrieval-unavailable");
});
