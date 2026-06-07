// Contract test for the TaskContextReport Bundle Handoff Dogfood (slice 190, rebased
// to 4cc34b73 — "feat: emit target-specific Circe actor contracts").
//
// Replays the full public operator path keyless against the built CLI, writes the
// bundle WITH task context and (from the same approved plan, to a separate intent id) a
// without-context comparison bundle, and inspects both from the human-operator and the
// agent perspective: README + context/task-context.md + refs for the human; the
// agent/* surfaces + context/task-context.agent.json for the agent; the unchanged
// agent/verification.json + agent/source-refs.json; the Circe handoff trio + its
// rekon-proof gate booleans; and the new circe/actor-contracts artifacts (present and
// non-executing, independent of task context).

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
  const root = mkdtempSync(join(tmpdir(), "tcbhd-")) + "/task-context-bundle-handoff-dogfood";
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "plans"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "task-context-bundle-handoff-dogfood", version: "0.0.0", type: "module", scripts: { typecheck: "tsc --noEmit", test: "node --test", build: "echo build" } }, null, 2));
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
  runCli(["intent", "approve", "--root", root, "--prepared-plan", preparedRef, "--intent-status", statusRef, ...acceptedRisks.flatMap((r) => ["--accept", r]), "--reason", "Dogfood accepted known proof gaps for non-executing handoff test.", "--accepted-by", "dogfood", "--json"]);
  const approvedRef = latest(root, "PreparedIntentPlan");
  runCli(["intent", "status", "transition", "--root", root, "--prepared-plan", approvedRef, "--previous-status", statusRef, "--to", "work-ready", "--reason", "Ready for handoff.", "--json"]);
  const workReadyStatusRef = latest(root, "IntentStatusReport");
  runCli(["intent", "work-order", "generate", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef, "--json"]);
  runCli(["intent", "verification-plan", "generate", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef, "--json"]);

  // WITH task context (separate intent id), and WITHOUT (same approved plan, separate id).
  const bundle = json(runCli(["intent", "bundle", "write", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef, "--task-context-ref", taskRef, "--intent-id", "ctx-bundle", "--json"]).stdout);
  const noctxBundle = json(runCli(["intent", "bundle", "write", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef, "--intent-id", "noctx-bundle", "--json"]).stdout);
  const validate = json(runCli(["artifacts", "validate", "--root", root, "--json"]).stdout);
  const dirty = porcelain(root, ["src/index.ts", "plans/rough.md"]);

  const bundleDir = join(root, bundle.bundlePath);
  const noctxDir = join(root, noctxBundle.bundlePath);
  const read = (dir, rel) => readFileSync(join(dir, rel), "utf8");
  return {
    root, taskRef, bundle, noctxBundle, validate, dirty, bundleDir, noctxDir,
    readme: read(bundleDir, "README.md"),
    contextMd: read(bundleDir, "context/task-context.md"),
    refs: json(read(bundleDir, "context/task-context.refs.json")),
    instructions: read(bundleDir, "agent/instructions.md"),
    handoff: read(bundleDir, "agent/handoff.md"),
    agentContext: json(read(bundleDir, "agent/context.json")),
    agentSidecar: json(read(bundleDir, "context/task-context.agent.json")),
    verification: json(read(bundleDir, "agent/verification.json")),
    sourceRefs: json(read(bundleDir, "agent/source-refs.json")),
    circeHandoff: read(bundleDir, "circe/handoff.json"),
    circeHandoffObj: json(read(bundleDir, "circe/handoff.json")),
    circePhasePlan: read(bundleDir, "circe/phase-plan.json"),
    rekonProof: json(read(bundleDir, "circe/rekon-proof.json")),
    manifest: json(read(bundleDir, "manifest.json")),
    implementerContract: read(bundleDir, "circe/actor-contracts/implementer.md"),
    implementerSchema: json(read(bundleDir, "circe/actor-contracts/implementation-handoff.schema.json")),
    // without-context surfaces
    nReadme: read(noctxDir, "README.md"),
    nInstructions: read(noctxDir, "agent/instructions.md"),
    nHandoff: read(noctxDir, "agent/handoff.md"),
    nContext: json(read(noctxDir, "agent/context.json")),
    nManifest: json(read(noctxDir, "manifest.json")),
  };
}

const W = run();
const masked = (s) => s.split(W.root).join("<root>");
const ACTOR_FILES = [
  "circe/actor-contracts/implementer.md",
  "circe/actor-contracts/reviewer.md",
  "circe/actor-contracts/planner-verifier.md",
  "circe/actor-contracts/implementation-handoff.schema.json",
  "circe/actor-contracts/review-verdict.schema.json",
  "circe/actor-contracts/planner-decision.schema.json",
];

// 1
test("full dogfood path produces bundle with task context", () => {
  assert.equal(W.bundle.ok, true);
  assert.equal(W.bundle.taskContext.included, true);
});
// 2
test("README.md makes task context discoverable", () => { assert.match(W.readme, /## Task context/); });
// 3
test("README.md says task context is guidance / not proof", () => { assert.match(W.readme, /not proof/i); });
// 4
test("context/task-context.md exists and is useful", () => {
  assert.ok(existsSync(join(W.bundleDir, "context/task-context.md")));
  assert.match(W.contextMd, /optional guidance, not proof/i);
});
// 5
test("context/task-context.refs.json exists and includes the TaskContextReport ref", () => {
  assert.equal(W.refs.taskContextReports[0].ref.type, "TaskContextReport");
  assert.equal(`${W.refs.taskContextReports[0].ref.type}:${W.refs.taskContextReports[0].ref.id}`, W.taskRef);
});
// 6
test("agent/instructions.md tells agents to read optional task context", () => {
  assert.match(W.instructions, /## Task context/);
  assert.ok(W.instructions.includes("context/task-context.agent.json"));
});
// 7
test("agent/instructions.md says task context is not proof", () => { assert.match(W.instructions, /not proof/i); });
// 8
test("agent/instructions.md keeps verification hints as hints", () => { assert.match(W.instructions, /hints, not executed commands/i); });
// 9
test("agent/handoff.md points agents to optional task context", () => {
  assert.match(W.handoff, /## Task context/);
  assert.ok(W.handoff.includes("context/task-context.agent.json"));
});
// 10
test("agent/handoff.md says handoff gates remain unchanged", () => { assert.match(W.handoff, /does not change the handoff gates/i); });
// 11
test("agent/context.json exposes taskContext metadata", () => { assert.equal(W.agentContext.taskContext?.available, true); });
// 12
test("taskContext metadata proof false", () => { assert.equal(W.agentContext.taskContext.reports[0].proof, false); });
// 13
test("taskContext metadata role optional-agent-context", () => { assert.equal(W.agentContext.taskContext.reports[0].role, "optional-agent-context"); });
// 14
test("context/task-context.agent.json exists and includes agent context", () => {
  assert.ok(existsSync(join(W.bundleDir, "context/task-context.agent.json")));
  assert.ok(W.agentSidecar.taskContextReports[0].agentContext);
});
// 15
test("agent/verification.json exists and remains separate from task context", () => {
  assert.ok(existsSync(join(W.bundleDir, "agent/verification.json")));
  assert.equal(W.verification.executesCommands, false);
  assert.ok(!/task-?context/i.test(JSON.stringify(W.verification)));
});
// 16
test("agent/source-refs.json exists and remains separate from task context", () => {
  assert.ok(existsSync(join(W.bundleDir, "agent/source-refs.json")));
  assert.ok(!/task-?context/i.test(JSON.stringify(W.sourceRefs)));
});
// 17
test("circe/handoff.json exists and has no required task-context dependency", () => {
  assert.ok(existsSync(join(W.bundleDir, "circe/handoff.json")));
  assert.ok(!/task-?context/i.test(masked(W.circeHandoff)));
});
// 18
test("circe/phase-plan.json exists and has no required task-context dependency", () => {
  assert.ok(existsSync(join(W.bundleDir, "circe/phase-plan.json")));
  assert.ok(!/task-?context/i.test(masked(W.circePhasePlan)));
});
// 19
test("circe/rekon-proof.json exists and treats task context as non-proof or omits it", () => {
  assert.ok(existsSync(join(W.bundleDir, "circe/rekon-proof.json")));
  assert.ok(!/task-?context/i.test(masked(JSON.stringify(W.rekonProof))));
});
// 20
test("circe/actor-contracts exist (generated by the current circe target)", () => {
  for (const rel of ACTOR_FILES) assert.ok(existsSync(join(W.bundleDir, rel)), `missing ${rel}`);
});
// 21
test("actor contracts are not execution results", () => {
  // The implementer contract describes the fields a Circe actor must RETURN; it is a
  // contract document + JSON Schema, never a VerificationRun/Result or command output.
  assert.match(W.implementerContract, /Completion Handoff/i);
  assert.match(W.implementerContract, /Leave changes uncommitted for Circe/i);
  assert.equal(W.implementerSchema.type, "object");
  assert.ok(Array.isArray(W.implementerSchema.required));
  assert.equal(latestOrEmpty(W.root, "VerificationRun"), "");
  assert.equal(latestOrEmpty(W.root, "VerificationResult"), "");
});
// 22
test("WorkOrder / VerificationPlan files exist", () => {
  assert.ok(existsSync(join(W.bundleDir, "work-order.md")));
  assert.ok(existsSync(join(W.bundleDir, "verification-plan.md")));
});
// 23
test("phase gates remain unchanged", () => {
  assert.ok(W.rekonProof.gates, "rekon-proof gates missing");
  assert.ok(Array.isArray(W.rekonProof.phaseGates) || W.rekonProof.phaseGates === undefined);
});
// 24
test("sourceWriteAllowed false", () => { assert.equal(W.rekonProof.gates.sourceWriteAllowed, false); });
// 25
test("commandsExecuted false", () => { assert.equal(W.rekonProof.gates.commandsExecuted, false); });
// 26
test("runsCirce false", () => { assert.equal(W.rekonProof.gates.runsCirce, false); });
// 27
test("intentGoDeferred true", () => { assert.equal(W.rekonProof.gates.intentGoDeferred, true); });
// 28
test("no VerificationRun created", () => { assert.equal(latestOrEmpty(W.root, "VerificationRun"), ""); });
// 29
test("no VerificationResult created", () => { assert.equal(latestOrEmpty(W.root, "VerificationResult"), ""); });
// 30
test("source file unchanged", () => { assert.ok(!W.dirty.includes("src/index.ts"), `dirty: ${W.dirty}`); });
// 31
test("plan file unchanged", () => { assert.ok(!W.dirty.includes("plans/rough.md"), `dirty: ${W.dirty}`); });
// 32
test("without-context bundle omits task context guidance/metadata/sidecars", () => {
  assert.equal(W.noctxBundle.ok, true);
  assert.ok(!/## Task context/.test(W.nReadme));
  assert.ok(!/## Task context/.test(W.nInstructions));
  assert.ok(!/## Task context/.test(W.nHandoff));
  assert.equal(W.nContext.taskContext, undefined);
  assert.equal(W.nManifest.context, undefined);
  assert.ok(!existsSync(join(W.noctxDir, "context")));
});
// 33
test("artifacts validate clean", () => { assert.equal(W.validate.valid ?? W.validate.ok, true); });
// 34
test("intent:go not invoked", () => { assert.equal(latestOrEmpty(W.root, "IntentGoReport"), ""); });
// 35
test("circe/handoff.json references the actor contracts", () => {
  assert.ok(W.circeHandoffObj.actorContracts, "handoff.actorContracts missing");
  assert.equal(W.circeHandoffObj.actorContracts.implementer.path, "actor-contracts/implementer.md");
});
// 36
test("manifest.circe references the actor contracts", () => {
  assert.equal(W.manifest.circe.actorContractsDir, "circe/actor-contracts");
  assert.equal(W.manifest.circe.actorContracts.implementer, "circe/actor-contracts/implementer.md");
});
// 37
test("without-context bundle still carries the actor contracts (target-default, not task-context)", () => {
  for (const rel of ACTOR_FILES) assert.ok(existsSync(join(W.noctxDir, rel)), `missing ${rel} in without-context bundle`);
});
