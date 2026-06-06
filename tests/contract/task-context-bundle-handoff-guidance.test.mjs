// Contract test for TaskContextReport Bundle Handoff Guidance Implementation (slice 188).
//
// Implements the slice-187 broader handoff decision: when a TaskContextReport is
// attached to an intent plan bundle, the agent-facing files promote the optional
// context sidecars. This test replays the full public operator path keyless against
// the built CLI and asserts:
//   - agent/instructions.md + agent/handoff.md gain a "## Task context" section that
//     points at the sidecars, frames context as not-proof, and keeps gates authoritative;
//   - agent/context.json gains additive taskContext metadata (proof: false,
//     role: optional-agent-context);
//   - a without-context bundle omits all task-context guidance + sidecars;
//   - the Circe handoff trio is unchanged and free of task context;
//   - no source/plan write, no VerificationRun/VerificationResult, no intent:go.
// Keyless: no live provider is contacted.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const CLI = resolve(repoRoot, "packages/cli/dist/index.js");

const KEYLESS_ENV = { ...process.env };
for (const key of ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "VOYAGE_API_KEY", "REKON_RUN_LIVE_LLM_TESTS", "REKON_RUN_LIVE_EMBEDDING_TESTS"]) {
  delete KEYLESS_ENV[key];
}
function runCli(args, { allowFail = false } = {}) {
  try {
    return { stdout: execFileSync("node", [CLI, ...args], { cwd: repoRoot, env: KEYLESS_ENV, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }), status: 0 };
  } catch (error) {
    if (allowFail) return { stdout: error.stdout ?? "", stderr: error.stderr ?? "", status: error.status ?? 1 };
    throw new Error(`CLI failed: rekon ${args.join(" ")}\n${error.stdout ?? ""}\n${error.stderr ?? ""}`);
  }
}
const json = (text) => JSON.parse(text);
const latest = (root, type) => runCli(["artifacts", "latest", "--root", root, "--type", type, "--id-only"]).stdout.trim();
function latestOrEmpty(root, type) {
  const r = runCli(["artifacts", "latest", "--root", root, "--type", type, "--id-only"], { allowFail: true });
  return r.status !== 0 ? "" : r.stdout.trim();
}
function gitInit(root) {
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["-c", "user.email=t@e.x", "-c", "user.name=t", "add", "-A"], { cwd: root });
  execFileSync("git", ["-c", "user.email=t@e.x", "-c", "user.name=t", "commit", "-qm", "init"], { cwd: root });
}
const porcelain = (root, paths) => execFileSync("git", ["status", "--porcelain", "--", ...paths], { cwd: root, encoding: "utf8" }).trim();
function readArtifact(root, ref) {
  const [type, id] = ref.split(":");
  const base = join(root, ".rekon", "artifacts");
  for (const cat of readdirSync(base)) {
    const f = join(base, cat, `${type}-${id}.json`);
    if (existsSync(f)) return json(readFileSync(f, "utf8"));
  }
  throw new Error(`artifact not found: ${ref}`);
}

function runWith() {
  const root = mkdtempSync(join(tmpdir(), "tcbhg-")) + "/handoff-guidance";
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "plans"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "handoff-guidance", version: "0.0.0", type: "module", scripts: { typecheck: "tsc --noEmit", test: "node --test", build: "echo build" } }, null, 2));
  writeFileSync(join(root, "src", "index.ts"), 'export const existing = "ok";\n\nexport function greet(name: string): string {\n  return `hello ${name}`;\n}\n');
  writeFileSync(join(root, "plans", "rough.md"), "# Add marker export\n\nAdd a marker export to src/index.ts.\n\nDo not change greet behavior.\n\nVerify marker behavior.\n");
  gitInit(root);

  runCli(["scan", "--root", root, "--json"]);
  runCli(["intent", "context", "prepare", "--root", root, "--json"]);
  runCli(["capability", "graph", "build", "--root", root, "--json"]);
  runCli(["context", "task", "--root", root, "--task", "Add a marker export to src/index.ts. Do not change greet behavior. Verify marker behavior.", "--path", "src/index.ts", "--json"]);
  const taskRef = latest(root, "TaskContextReport");
  runCli(["intent", "assess", "--root", root, "--goal", "Add a marker export to src/index.ts.", "--kind", "feature", "--path", "src/index.ts", "--task-context-ref", taskRef, "--json"]);
  runCli(["intent", "plan", "review", "--root", root, "--plan", join(root, "plans", "rough.md"), "--goal", "Add a marker export to src/index.ts.", "--semantic", "off", "--task-context-ref", taskRef, "--json"]);
  const reportRef = latest(root, "IntentPlanActionabilityReport");
  const questions = (readArtifact(root, reportRef).elicitationQuestions ?? []).map((q) => q.id);
  const answerFor = (id) => {
    if (id.includes("objective")) return "Add an exported marker constant from src/index.ts.";
    if (id.includes("deliverables")) return "Exported marker constant; existing greet behavior preserved.";
    if (id.includes("acceptance")) return "Marker is exported from src/index.ts; greet output unchanged.";
    if (id.includes("verification")) return "npm run typecheck; npm test; npm run build.";
    if (id.includes("contract")) return "Objective: add marker export. Deliverables: marker constant. Acceptance: marker exported and greet unchanged.";
    if (id.includes("evidence")) return "Typecheck and tests pass and the marker export is present in src/index.ts.";
    return "Addressed.";
  };
  runCli(["intent", "plan", "answer", "--root", root, "--report", reportRef, ...questions.flatMap((id) => ["--answer", `${id}=${answerFor(id)}`]), "--json"]);
  const answeredReportRef = latest(root, "IntentPlanActionabilityReport");
  const assessRef = latest(root, "IntentAssessmentReport");
  runCli(["intent", "prepare", "--root", root, "--assessment", assessRef, "--actionability-report", answeredReportRef, "--json"]);
  const preparedRef = latest(root, "PreparedIntentPlan");
  const acceptedRisks = readArtifact(root, preparedRef).approval?.reasons ?? ["verification-proof-missing", "runtime-drift-unresolved"];
  runCli(["intent", "status", "--root", root, "--prepared-plan", preparedRef, "--json"]);
  const statusRef = latest(root, "IntentStatusReport");
  runCli(["intent", "approve", "--root", root, "--prepared-plan", preparedRef, "--intent-status", statusRef, ...acceptedRisks.flatMap((r) => ["--accept", r]), "--reason", "Guidance test accepted known proof gaps.", "--accepted-by", "test", "--json"]);
  const approvedRef = latest(root, "PreparedIntentPlan");
  runCli(["intent", "status", "transition", "--root", root, "--prepared-plan", approvedRef, "--previous-status", statusRef, "--to", "work-ready", "--reason", "Ready for handoff.", "--json"]);
  const workReadyStatusRef = latest(root, "IntentStatusReport");
  runCli(["intent", "work-order", "generate", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef, "--json"]);
  runCli(["intent", "verification-plan", "generate", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef, "--json"]);
  const bundle = json(runCli(["intent", "bundle", "write", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef, "--task-context-ref", taskRef, "--json"]).stdout);
  const validate = json(runCli(["artifacts", "validate", "--root", root, "--json"]).stdout);
  const dirty = porcelain(root, ["src/index.ts", "plans/rough.md"]);
  const bundleDir = join(root, bundle.bundlePath);
  const read = (rel) => readFileSync(join(bundleDir, rel), "utf8");
  return {
    root, taskRef, bundle, validate, dirty, bundleDir,
    instructions: read("agent/instructions.md"),
    handoff: read("agent/handoff.md"),
    context: json(read("agent/context.json")),
    circeHandoff: read("circe/handoff.json"),
  };
}

function runWithout() {
  const root = mkdtempSync(join(tmpdir(), "tcbhg-none-")) + "/none";
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "none", version: "0.0.0", type: "module" }, null, 2));
  writeFileSync(join(root, "src", "index.ts"), "export const x = 1;\n");
  gitInit(root);
  runCli(["capability", "graph", "build", "--root", root, "--json"]);
  const bundle = json(runCli(["intent", "bundle", "write", "--root", root, "--intent-id", "ctx-none", "--json"]).stdout);
  const bundleDir = join(root, bundle.bundlePath);
  const read = (rel) => readFileSync(join(bundleDir, rel), "utf8");
  return { root, bundle, bundleDir, instructions: read("agent/instructions.md"), handoff: read("agent/handoff.md"), context: json(read("agent/context.json")) };
}

const W = runWith();
const N = runWithout();

// 1
test("bundle write with task context succeeds", () => { assert.equal(W.bundle.ok, true); });
// 2
test("agent/instructions.md mentions optional task context when sidecars exist", () => { assert.match(W.instructions, /## Task context/); });
// 3
test("agent/instructions.md points to context/task-context.agent.json", () => { assert.ok(W.instructions.includes("context/task-context.agent.json")); });
// 4
test("agent/instructions.md says task context is not proof", () => { assert.match(W.instructions, /not proof/i); });
// 5
test("agent/instructions.md says verification hints are hints / not executed commands", () => { assert.match(W.instructions, /verification hints are hints, not executed commands/i); });
// 6
test("agent/handoff.md mentions optional task context when sidecars exist", () => { assert.match(W.handoff, /## Task context/); });
// 7
test("agent/handoff.md points to context/task-context.agent.json", () => { assert.ok(W.handoff.includes("context/task-context.agent.json")); });
// 8
test("agent/handoff.md says handoff gates remain unchanged by task context", () => {
  assert.match(W.handoff, /not proof/i);
  assert.match(W.handoff, /does not change the handoff gates/i);
});
// 9
test("agent/context.json includes taskContext metadata", () => {
  assert.equal(W.context.taskContext?.available, true);
  assert.ok(Array.isArray(W.context.taskContext?.reports) && W.context.taskContext.reports.length >= 1);
  // additive: existing fields preserved
  assert.ok(W.context.intentId !== undefined && W.context.goal !== undefined && Array.isArray(W.context.phases));
});
// 10
test("taskContext metadata proof is false", () => { assert.equal(W.context.taskContext.reports[0].proof, false); });
// 11
test("taskContext metadata role is optional-agent-context", () => { assert.equal(W.context.taskContext.reports[0].role, "optional-agent-context"); });
// 12
test("without-context bundle does not mention task context in agent/instructions.md", () => { assert.ok(!/## Task context/.test(N.instructions)); });
// 13
test("without-context bundle does not mention task context in agent/handoff.md", () => { assert.ok(!/## Task context/.test(N.handoff)); });
// 14
test("without-context bundle has no context/ sidecars and no taskContext metadata", () => {
  assert.ok(!existsSync(join(N.bundleDir, "context")));
  assert.equal(N.context.taskContext, undefined);
});
// 15
test("circe/handoff.json has no task-context requirement", () => {
  const masked = W.circeHandoff.split(W.root).join("<root>");
  assert.ok(!/task-?context/i.test(masked), "Circe handoff references task context");
});
// 16
test("circe/phase-plan.json exists", () => { assert.ok(existsSync(join(W.bundleDir, "circe/phase-plan.json"))); });
// 17
test("circe/rekon-proof.json exists", () => { assert.ok(existsSync(join(W.bundleDir, "circe/rekon-proof.json"))); });
// 18
test("WorkOrder / VerificationPlan files exist", () => {
  assert.ok(existsSync(join(W.bundleDir, "work-order.md")));
  assert.ok(existsSync(join(W.bundleDir, "verification-plan.md")));
});
// 19
test("source and plan files unchanged", () => { assert.equal(W.dirty, ""); });
// 20
test("no VerificationRun created", () => { assert.equal(latestOrEmpty(W.root, "VerificationRun"), ""); });
// 21
test("no VerificationResult created", () => { assert.equal(latestOrEmpty(W.root, "VerificationResult"), ""); });
// 22
test("no commands executed (no VerificationRun, working tree clean)", () => {
  assert.equal(latestOrEmpty(W.root, "VerificationRun"), "");
  assert.equal(W.dirty, "");
});
// 23
test("intent:go not invoked", () => { assert.equal(latestOrEmpty(W.root, "IntentGoReport"), ""); });
// 24
test("artifacts validate clean", () => { assert.equal(W.validate.valid ?? W.validate.ok, true); });
