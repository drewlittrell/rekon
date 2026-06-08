// Contract test for the Intent Bundle Handoff Reading Order Implementation (slice 193).
//
// Drives the full public operator path keyless against the built CLI, writes the bundle
// WITH task context and (from the same approved plan, to a separate intent id) a
// without-context bundle, and asserts the always-on handoff reading-order guidance in
// README.md / agent/instructions.md / agent/handoff.md + the additive
// agent/context.json.handoffReadingOrder metadata. Confirms the reading order grants no
// authority: gates, source-change posture, Circe files, and boundaries are unchanged.

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

function run() {
  const root = mkdtempSync(join(tmpdir(), "ibhro-")) + "/intent-bundle-handoff-reading-order";
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "plans"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "intent-bundle-handoff-reading-order", version: "0.0.0", type: "module", scripts: { typecheck: "tsc --noEmit", test: "node --test", build: "echo build" } }, null, 2));
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
  runCli(["intent", "approve", "--root", root, "--prepared-plan", preparedRef, "--intent-status", statusRef, ...acceptedRisks.flatMap((r) => ["--accept", r]), "--reason", "Reading-order smoke accepted known proof gaps.", "--accepted-by", "smoke", "--json"]);
  const approvedRef = latest(root, "PreparedIntentPlan");
  runCli(["intent", "status", "transition", "--root", root, "--prepared-plan", approvedRef, "--previous-status", statusRef, "--to", "work-ready", "--reason", "Ready for handoff.", "--json"]);
  const workReadyStatusRef = latest(root, "IntentStatusReport");
  runCli(["intent", "work-order", "generate", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef, "--json"]);
  runCli(["intent", "verification-plan", "generate", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef, "--json"]);

  const bundle = json(runCli(["intent", "bundle", "write", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef, "--task-context-ref", taskRef, "--intent-id", "ctx-bundle", "--json"]).stdout);
  const noctxBundle = json(runCli(["intent", "bundle", "write", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef, "--intent-id", "noctx-bundle", "--json"]).stdout);
  const validate = json(runCli(["artifacts", "validate", "--root", root, "--json"]).stdout);
  const dirty = porcelain(root, ["src/index.ts", "plans/rough.md"]);

  const bundleDir = join(root, bundle.bundlePath);
  const noctxDir = join(root, noctxBundle.bundlePath);
  const read = (dir, rel) => readFileSync(join(dir, rel), "utf8");
  return {
    root, bundle, noctxBundle, validate, dirty, bundleDir, noctxDir,
    readme: read(bundleDir, "README.md"),
    instructions: read(bundleDir, "agent/instructions.md"),
    handoff: read(bundleDir, "agent/handoff.md"),
    agentContext: json(read(bundleDir, "agent/context.json")),
    verification: json(read(bundleDir, "agent/verification.json")),
    rekonProof: json(read(bundleDir, "circe/rekon-proof.json")),
    circeHandoff: read(bundleDir, "circe/handoff.json"),
    nReadme: read(noctxDir, "README.md"),
    nInstructions: read(noctxDir, "agent/instructions.md"),
    nContext: json(read(noctxDir, "agent/context.json")),
  };
}

const W = run();
const masked = (s) => s.split(W.root).join("<root>");

// 1
test("bundle write succeeds with task context", () => { assert.equal(W.bundle.ok, true); assert.equal(W.bundle.taskContext.included, true); });
// 2
test("README.md includes handoff reading order", () => { assert.match(W.readme, /## Handoff reading order/); });
// 3
test("README.md says humans read README first", () => { assert.match(W.readme, /Read this README/i); });
// 4
test("README.md points to context/task-context.md when present", () => { assert.ok(W.readme.includes("If present, read `context/task-context.md`")); });
// 5
test("README.md says TaskContextReport is optional context, not proof", () => { assert.ok(W.readme.includes("Task context is optional context, not proof.")); });
// 6
test("README.md says WorkOrder / VerificationPlan remain authoritative", () => { assert.ok(W.readme.includes("WorkOrder / VerificationPlan remain authoritative.")); });
// 7
test("README.md says phase source-change posture is handoff evidence, not approval", () => { assert.ok(W.readme.includes("Phase source-change posture is handoff evidence, not approval.")); });
// 8
test("README.md says actor contracts are guidance / not executed workers", () => { assert.ok(W.readme.includes("Actor contracts are role/return-shape guidance, not executed workers.")); });
// 9
test("agent/instructions.md includes agent reading order", () => { assert.match(W.instructions, /## Reading order/); assert.ok(W.instructions.includes("Read these before acting:")); });
// 10
test("agent/instructions.md points to agent/handoff.md", () => { assert.ok(W.instructions.includes("agent/handoff.md")); });
// 11
test("agent/instructions.md points to agent/context.json", () => { assert.ok(W.instructions.includes("agent/context.json")); });
// 12
test("agent/instructions.md points to context/task-context.agent.json when present", () => { assert.ok(W.instructions.includes("`context/task-context.agent.json` when present")); });
// 13
test("agent/instructions.md points to agent/source-refs.json", () => { assert.ok(W.instructions.includes("agent/source-refs.json")); });
// 14
test("agent/instructions.md points to agent/verification.json", () => { assert.ok(W.instructions.includes("agent/verification.json")); });
// 15
test("agent/instructions.md says operator-only Circe commands must not be run as worker verification", () => { assert.ok(W.instructions.includes("Operator-only Circe commands must not be run as worker verification.")); });
// 16
test("agent/handoff.md includes reading-order guidance", () => { assert.match(W.handoff, /## Reading order/); });
// 17
test("agent/handoff.md points to task context when present", () => { assert.ok(W.handoff.includes("`context/task-context.agent.json`")); assert.match(W.handoff, /If present/i); });
// 18
test("agent/handoff.md says gates remain authoritative", () => { assert.ok(W.handoff.includes("WorkOrder / VerificationPlan / phase gates remain authoritative.")); });
// 19
test("agent/context.json includes handoffReadingOrder metadata", () => {
  assert.ok(Array.isArray(W.agentContext.handoffReadingOrder?.agent));
  assert.equal(W.agentContext.handoffReadingOrder.authority.sourceChangePosture, "handoff-evidence-not-approval");
});
// 20
test("without-context bundle remains valid", () => { assert.equal(W.noctxBundle.ok, true); });
// 21
test("without-context bundle does not create context sidecars", () => { assert.ok(!existsSync(join(W.noctxDir, "context"))); });
// 22
test("without-context guidance does not claim task context is available", () => {
  assert.equal(W.nContext.taskContext, undefined);
  assert.ok(!/## Task context/.test(W.nReadme));
  assert.match(W.nReadme, /## Handoff reading order/); // reading order still present, but "if present"
  assert.ok(W.nReadme.includes("If present, read `context/task-context.md`"));
});
// 23
test("circe/handoff.json exists and is not changed to require TaskContextReport", () => {
  assert.ok(existsSync(join(W.bundleDir, "circe/handoff.json")));
  assert.ok(!/task-?context/i.test(masked(W.circeHandoff)));
});
// 24
test("circe/actor-contracts exist", () => {
  for (const rel of ["circe/actor-contracts/implementer.md", "circe/actor-contracts/reviewer.md", "circe/actor-contracts/planner-verifier.md"]) {
    assert.ok(existsSync(join(W.bundleDir, rel)), `missing ${rel}`);
  }
});
// 25
test("WorkOrder / VerificationPlan files exist", () => {
  assert.ok(existsSync(join(W.bundleDir, "work-order.md")));
  assert.ok(existsSync(join(W.bundleDir, "verification-plan.md")));
});
// 26
test("phase source-change posture remains present", () => {
  assert.ok(Array.isArray(W.verification.phases));
  assert.ok(W.verification.phases.every((p) => typeof p.sourceChange === "string" && p.sourceChange.length > 0));
});
// 27
test("sourceWriteAllowed false", () => { assert.equal(W.rekonProof.gates.sourceWriteAllowed, false); });
// 28
test("commandsExecuted false", () => { assert.equal(W.rekonProof.gates.commandsExecuted, false); });
// 29
test("runsCirce false", () => { assert.equal(W.rekonProof.gates.runsCirce, false); });
// 30
test("intentGoDeferred true", () => { assert.equal(W.rekonProof.gates.intentGoDeferred, true); });
// 31
test("source files unchanged", () => { assert.ok(!W.dirty.includes("src/index.ts") && !W.dirty.includes("plans/rough.md"), `dirty: ${W.dirty}`); });
// 32
test("no commands executed", () => { assert.equal(W.verification.executesCommands, false); });
// 33
test("no VerificationRun created", () => { assert.equal(latestOrEmpty(W.root, "VerificationRun"), ""); });
// 34
test("no VerificationResult created", () => { assert.equal(latestOrEmpty(W.root, "VerificationResult"), ""); });
// 35
test("artifacts validate clean", () => { assert.equal(W.validate.valid ?? W.validate.ok, true); });
