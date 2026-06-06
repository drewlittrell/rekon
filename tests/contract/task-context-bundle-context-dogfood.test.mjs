// Contract test for the TaskContextReport Bundle Context Dogfood (slice 185).
//
// Replays the full public operator path keyless against the built CLI, writing the
// bundle WITH an explicit --task-context-ref, and asserts the optional context
// surfaces are discoverable and useful while every boundary holds: the manifest
// context section, the three context/ sidecars, the bundle README task-context
// section (slice-185 discoverability fix), the unchanged Circe handoff trio, the
// unchanged WorkOrder / VerificationPlan files, no source/plan write, no
// VerificationRun / VerificationResult, no intent:go, and a clean fresh bundle
// WITHOUT task context. Keyless: no live provider is contacted.

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
    const stdout = execFileSync("node", [CLI, ...args], { cwd: repoRoot, env: KEYLESS_ENV, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { stdout, status: 0 };
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

function runDogfood() {
  const root = mkdtempSync(join(tmpdir(), "tcbcd-")) + "/task-context-bundle-dogfood";
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "plans"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "task-context-bundle-dogfood", version: "0.0.0", type: "module", scripts: { typecheck: "tsc --noEmit", test: "node --test", build: "echo build" } }, null, 2));
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
  const answerArgs = questions.flatMap((id) => ["--answer", `${id}=${answerFor(id)}`]);
  runCli(["intent", "plan", "answer", "--root", root, "--report", reportRef, ...answerArgs, "--json"]);
  const answeredReportRef = latest(root, "IntentPlanActionabilityReport");
  const assessRef = latest(root, "IntentAssessmentReport");
  runCli(["intent", "prepare", "--root", root, "--assessment", assessRef, "--actionability-report", answeredReportRef, "--json"]);
  const preparedRef = latest(root, "PreparedIntentPlan");
  const acceptedRisks = readArtifact(root, preparedRef).approval?.reasons ?? ["verification-proof-missing", "runtime-drift-unresolved"];
  runCli(["intent", "status", "--root", root, "--prepared-plan", preparedRef, "--json"]);
  const statusRef = latest(root, "IntentStatusReport");
  const acceptArgs = acceptedRisks.flatMap((r) => ["--accept", r]);
  const approve = json(runCli(["intent", "approve", "--root", root, "--prepared-plan", preparedRef, "--intent-status", statusRef, ...acceptArgs, "--reason", "Dogfood accepted known proof gaps for non-executing handoff test.", "--accepted-by", "dogfood", "--json"]).stdout);
  const approvedRef = latest(root, "PreparedIntentPlan");
  const transition = json(runCli(["intent", "status", "transition", "--root", root, "--prepared-plan", approvedRef, "--previous-status", statusRef, "--to", "work-ready", "--reason", "Dogfood operator accepted proof gaps; ready to generate handoff artifacts.", "--json"]).stdout);
  const workReadyStatusRef = latest(root, "IntentStatusReport");
  const workOrder = json(runCli(["intent", "work-order", "generate", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef, "--json"]).stdout);
  const verificationPlan = json(runCli(["intent", "verification-plan", "generate", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef, "--json"]).stdout);
  const bundle = json(runCli(["intent", "bundle", "write", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef, "--task-context-ref", taskRef, "--json"]).stdout);
  const validate = json(runCli(["artifacts", "validate", "--root", root, "--json"]).stdout);
  const dirty = porcelain(root, ["src/index.ts", "plans/rough.md"]);

  const bundleDir = join(root, bundle.bundlePath);
  const read = (rel) => readFileSync(join(bundleDir, rel), "utf8");
  return {
    root, taskRef, approve, transition, workOrder, verificationPlan, bundle, validate, dirty, bundleDir,
    manifest: json(read("manifest.json")),
    markdown: read("context/task-context.md"),
    agentJson: json(read("context/task-context.agent.json")),
    refsJson: json(read("context/task-context.refs.json")),
    circeHandoff: read("circe/handoff.json"),
    readme: read("README.md"),
  };
}

function runWithout() {
  const root = mkdtempSync(join(tmpdir(), "tcbcd-none-")) + "/none";
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "none", version: "0.0.0", type: "module" }, null, 2));
  writeFileSync(join(root, "src", "index.ts"), "export const x = 1;\n");
  gitInit(root);
  runCli(["capability", "graph", "build", "--root", root, "--json"]);
  const bundle = json(runCli(["intent", "bundle", "write", "--root", root, "--intent-id", "ctx-none", "--json"]).stdout);
  const bundleDir = join(root, bundle.bundlePath);
  return { root, bundle, bundleDir, manifest: json(readFileSync(join(bundleDir, "manifest.json"), "utf8")), readme: readFileSync(join(bundleDir, "README.md"), "utf8") };
}

const D = runDogfood();
const N = runWithout();

// 1
test("full dogfood path produces a TaskContextReport", () => { assert.match(D.taskRef, /^TaskContextReport:/); });
// 2
test("full dogfood path produces an approved prepared plan", () => { assert.equal(D.approve.status, "approved"); });
// 3
test("full dogfood path produces work-ready status", () => { assert.equal(D.transition.status, "work-ready"); });
// 4
test("work-order generate succeeds after approve/status", () => { assert.equal(D.workOrder.status, "generated"); });
// 5
test("verification-plan generate succeeds after approve/status", () => { assert.equal(D.verificationPlan.status, "generated"); });
// 6
test("bundle write with task context succeeds", () => { assert.equal(D.bundle.ok, true); });
// 7
test("bundle JSON reports taskContext.included true", () => { assert.equal(D.bundle.taskContext.included, true); });
// 8
test("bundle JSON reports context sidecars", () => {
  assert.deepEqual(D.bundle.taskContext.sidecars, ["context/task-context.md", "context/task-context.agent.json", "context/task-context.refs.json"]);
  assert.equal(D.bundle.taskContext.proof, false);
});
// 9
test("manifest includes context.taskContextReports", () => {
  assert.ok(Array.isArray(D.manifest.context?.taskContextReports));
  assert.equal(D.manifest.context.taskContextReports.length, 1);
});
// 10
test("manifest context entry proof false", () => { assert.equal(D.manifest.context.taskContextReports[0].proof, false); });
// 11
test("manifest context entry role optional-agent-context", () => { assert.equal(D.manifest.context.taskContextReports[0].role, "optional-agent-context"); });
// 12
test("context/task-context.md exists", () => { assert.ok(existsSync(join(D.bundleDir, "context/task-context.md"))); });
// 13
test("context/task-context.md says optional guidance / not proof", () => { assert.match(D.markdown, /optional guidance, not proof/i); });
// 14
test("context/task-context.agent.json exists", () => { assert.ok(existsSync(join(D.bundleDir, "context/task-context.agent.json"))); });
// 15
test("agent sidecar contains agentContext / taskContextReports structure", () => {
  assert.ok(Array.isArray(D.agentJson.taskContextReports));
  assert.ok(D.agentJson.taskContextReports[0].agentContext);
});
// 16
test("agent sidecar boundaries all false", () => {
  assert.deepEqual(D.agentJson.boundaries, { proof: false, approvesPlans: false, executesCommands: false, writesSourceFiles: false, runsCirce: false, implementsIntentGo: false });
});
// 17
test("context/task-context.refs.json exists", () => { assert.ok(existsSync(join(D.bundleDir, "context/task-context.refs.json"))); });
// 18
test("refs sidecar includes the TaskContextReport ref", () => {
  assert.equal(D.refsJson.taskContextReports[0].ref.type, "TaskContextReport");
  assert.equal(`${D.refsJson.taskContextReports[0].ref.type}:${D.refsJson.taskContextReports[0].ref.id}`, D.taskRef);
});
// 19
test("refs sidecar proof false", () => { assert.equal(D.refsJson.taskContextReports[0].proof, false); });
// 20
test("circe/handoff.json exists and has no required task-context dependency", () => {
  assert.ok(existsSync(join(D.bundleDir, "circe/handoff.json")));
  const masked = D.circeHandoff.split(D.root).join("<root>");
  assert.ok(!/task-?context/i.test(masked), "Circe handoff references task context");
});
// 21
test("circe/phase-plan.json exists", () => { assert.ok(existsSync(join(D.bundleDir, "circe/phase-plan.json"))); });
// 22
test("circe/rekon-proof.json exists", () => { assert.ok(existsSync(join(D.bundleDir, "circe/rekon-proof.json"))); });
// 23
test("WorkOrder / VerificationPlan files exist", () => {
  assert.ok(existsSync(join(D.bundleDir, "work-order.md")));
  assert.ok(existsSync(join(D.bundleDir, "verification-plan.md")));
});
// 24
test("source file unchanged", () => { assert.ok(!D.dirty.includes("src/index.ts"), `dirty: ${D.dirty}`); });
// 25
test("plan file unchanged", () => { assert.ok(!D.dirty.includes("plans/rough.md"), `dirty: ${D.dirty}`); });
// 26
test("no VerificationRun created", () => { assert.equal(latestOrEmpty(D.root, "VerificationRun"), ""); });
// 27
test("no VerificationResult created", () => { assert.equal(latestOrEmpty(D.root, "VerificationResult"), ""); });
// 28
test("no commands executed (no VerificationRun, working tree clean)", () => {
  assert.equal(latestOrEmpty(D.root, "VerificationRun"), "");
  assert.equal(D.dirty, "");
});
// 29
test("intent:go not invoked", () => { assert.equal(latestOrEmpty(D.root, "IntentGoReport"), ""); });
// 30
test("artifacts validate clean", () => { assert.equal(D.validate.valid ?? D.validate.ok, true); });
// 31
test("bundle write without task context still succeeds", () => {
  assert.equal(N.bundle.ok, true);
  assert.equal(N.bundle.taskContext.included, false);
});
// 32
test("bundle write without task context has no context sidecars", () => {
  assert.ok(!existsSync(join(N.bundleDir, "context")), "context/ dir present without a ref");
  assert.equal(N.manifest.context, undefined);
});
// 33 — slice-185 README discoverability fix (narrow, additive, covered here)
test("bundle README lists the task-context sidecars only when context is attached", () => {
  assert.match(D.readme, /## Task context/);
  assert.match(D.readme, /context\/task-context\.md/);
  assert.match(D.readme, /guidance, not proof/i);
  assert.ok(D.readme.includes(D.taskRef), "README does not list the TaskContextReport ref");
  assert.ok(!/## Task context/.test(N.readme), "README without context should not have a Task context section");
});
