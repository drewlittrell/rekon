// Contract test for the TaskContextReport Intent Dogfood (slice 173).
//
// Replays the full operator path keyless against the built CLI:
//   context task --path → intent assess --task-context-ref → intent plan review
//   --task-context-ref → plan answer → prepare → status → approve → status
//   transition → work-order generate → verification-plan generate → bundle write →
//   artifacts validate, asserting that task context enriches matchedContext /
//   revisionPrompt without weakening any readiness / actionability / approval / status
//   gate, that prepare stays lineage-only, that the handoff artifacts only generate
//   after explicit approve + work-ready, and that no source/plan file is written.
//
// Scenario B exercises retrieval-assisted context with the mock provider and asserts
// the report still records do-not-touch / verification hints and a clear
// retrieval-low-signal warning. Keyless: no live provider is contacted.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const CLI = resolve(repoRoot, "packages/cli/dist/index.js");

const KEYLESS_ENV = { ...process.env };
for (const key of [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "VOYAGE_API_KEY",
  "REKON_RUN_LIVE_LLM_TESTS",
  "REKON_RUN_LIVE_EMBEDDING_TESTS",
]) {
  delete KEYLESS_ENV[key];
}

function runCli(args, { cwd, allowFail = false } = {}) {
  try {
    const stdout = execFileSync("node", [CLI, ...args], {
      cwd: cwd ?? repoRoot,
      env: KEYLESS_ENV,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { stdout, status: 0 };
  } catch (error) {
    if (allowFail) return { stdout: error.stdout ?? "", stderr: error.stderr ?? "", status: error.status ?? 1 };
    throw new Error(`CLI failed: rekon ${args.join(" ")}\n${error.stdout ?? ""}\n${error.stderr ?? ""}`);
  }
}

const json = (text) => JSON.parse(text);
function latest(root, type) {
  return runCli(["artifacts", "latest", "--root", root, "--type", type, "--id-only"]).stdout.trim();
}
// Returns "" when no artifact of the type exists (the CLI exits non-zero in that case).
function latestOrEmpty(root, type) {
  const result = runCli(["artifacts", "latest", "--root", root, "--type", type, "--id-only"], { allowFail: true });
  if (result.status !== 0) return "";
  return result.stdout.trim();
}
function gitInit(root) {
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["-c", "user.email=t@e.x", "-c", "user.name=t", "add", "-A"], { cwd: root });
  execFileSync("git", ["-c", "user.email=t@e.x", "-c", "user.name=t", "commit", "-qm", "init"], { cwd: root });
}
function porcelain(root, paths) {
  return execFileSync("git", ["status", "--porcelain", "--", ...paths], { cwd: root, encoding: "utf8" }).trim();
}
function readArtifact(root, ref) {
  const [type, id] = ref.split(":");
  // actions category holds intent-spine artifacts.
  const candidate = join(root, ".rekon", "artifacts", "actions", `${type}-${id}.json`);
  if (existsSync(candidate)) return json(readFileSync(candidate, "utf8"));
  const base = join(root, ".rekon", "artifacts");
  for (const cat of readdirSync(base)) {
    const f = join(base, cat, `${type}-${id}.json`);
    if (existsSync(f)) return json(readFileSync(f, "utf8"));
  }
  throw new Error(`artifact not found on disk: ${ref}`);
}

// ---------------------------------------------------------------------------
// Scenario A — full operator path with explicit task context.
// ---------------------------------------------------------------------------
function runScenarioA() {
  const root = mkdtempSync(join(tmpdir(), "tcid-a-"));
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "plans"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify(
      { name: "tcid-a", version: "0.0.0", type: "module", scripts: { typecheck: "tsc --noEmit", test: "node --test", build: "echo build" } },
      null,
      2,
    ),
  );
  writeFileSync(join(root, "src", "index.ts"), 'export const existing = "ok";\n\nexport function greet(name: string): string {\n  return `hello ${name}`;\n}\n');
  writeFileSync(join(root, "plans", "rough.md"), "# Add marker export\n\nAdd a marker export to src/index.ts.\n\nDo not change greet behavior.\n\nVerify marker behavior.\n");
  gitInit(root);

  // Build the intent-readiness context (scan → intent context prepare) so the
  // assessment is needs-review rather than blocked, matching the operator path.
  runCli(["scan", "--root", root, "--json"]);
  runCli(["intent", "context", "prepare", "--root", root, "--json"]);
  runCli(["capability", "graph", "build", "--root", root, "--json"]);
  const taskOut = json(
    runCli([
      "context", "task", "--root", root,
      "--task", "Add a marker export to src/index.ts. Do not change greet behavior. Verify marker behavior.",
      "--path", "src/index.ts", "--json",
    ]).stdout,
  );
  const taskRef = latest(root, "TaskContextReport");

  const assess = json(
    runCli([
      "intent", "assess", "--root", root, "--goal", "Add a marker export to src/index.ts.",
      "--kind", "feature", "--path", "src/index.ts", "--task-context-ref", taskRef, "--json",
    ]).stdout,
  );
  const review = json(
    runCli([
      "intent", "plan", "review", "--root", root, "--plan", join(root, "plans", "rough.md"),
      "--goal", "Add a marker export to src/index.ts.", "--semantic", "off", "--task-context-ref", taskRef, "--json",
    ]).stdout,
  );

  const reportRef = latest(root, "IntentPlanActionabilityReport");
  const reportArtifact = readArtifact(root, reportRef);
  const revisionPrompt = reportArtifact.revisionPrompt?.prompt ?? "";
  const questions = (reportArtifact.elicitationQuestions ?? []).map((q) => q.id);

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
  const answer = json(runCli(["intent", "plan", "answer", "--root", root, "--report", reportRef, ...answerArgs, "--json"]).stdout);

  const answeredReportRef = latest(root, "IntentPlanActionabilityReport");
  const assessRef = latest(root, "IntentAssessmentReport");
  const prepare = json(runCli(["intent", "prepare", "--root", root, "--assessment", assessRef, "--actionability-report", answeredReportRef, "--json"]).stdout);

  const preparedRef = latest(root, "PreparedIntentPlan");
  const preparedArtifact = readArtifact(root, preparedRef);
  const acceptedRisks = preparedArtifact.approval?.reasons ?? ["verification-proof-missing", "runtime-drift-unresolved"];

  runCli(["intent", "status", "--root", root, "--prepared-plan", preparedRef, "--json"]);
  const statusRef = latest(root, "IntentStatusReport");

  // Approve without --accept must NOT approve (gate holds).
  const approveNoAccept = runCli(
    ["intent", "approve", "--root", root, "--prepared-plan", preparedRef, "--intent-status", statusRef, "--reason", "x", "--accepted-by", "y", "--json"],
    { allowFail: true },
  );
  let approveNoAcceptStatus = "blocked";
  try {
    approveNoAcceptStatus = json(approveNoAccept.stdout).status ?? "blocked";
  } catch {
    approveNoAcceptStatus = "blocked";
  }

  const acceptArgs = acceptedRisks.flatMap((r) => ["--accept", r]);
  const approve = json(
    runCli([
      "intent", "approve", "--root", root, "--prepared-plan", preparedRef, "--intent-status", statusRef,
      ...acceptArgs, "--reason", "Dogfood accepted known proof gaps for non-executing handoff test.", "--accepted-by", "dogfood", "--json",
    ]).stdout,
  );
  const approvedRef = latest(root, "PreparedIntentPlan");

  const transition = json(
    runCli([
      "intent", "status", "transition", "--root", root, "--prepared-plan", approvedRef, "--previous-status", statusRef,
      "--to", "work-ready", "--reason", "Dogfood operator accepted proof gaps; ready to generate handoff artifacts.", "--json",
    ]).stdout,
  );
  const workReadyStatusRef = latest(root, "IntentStatusReport");

  const workOrder = json(runCli(["intent", "work-order", "generate", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef, "--json"]).stdout);
  const verificationPlan = json(runCli(["intent", "verification-plan", "generate", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef, "--json"]).stdout);
  const bundle = json(runCli(["intent", "bundle", "write", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef, "--json"]).stdout);
  const validate = json(runCli(["artifacts", "validate", "--root", root, "--json"]).stdout);

  const dirty = porcelain(root, ["src/index.ts", "plans/rough.md"]);

  return {
    root, taskOut, taskRef, assess, review, reportArtifact, revisionPrompt, questions,
    answer, prepare, preparedArtifact, statusRef, approveNoAcceptStatus, approve, transition,
    workOrder, verificationPlan, bundle, validate, dirty, preparedRef, approvedRef,
  };
}

// ---------------------------------------------------------------------------
// Scenario B — retrieval-assisted context with the mock provider.
// ---------------------------------------------------------------------------
function runScenarioB() {
  const root = mkdtempSync(join(tmpdir(), "tcid-b-"));
  mkdirSync(join(root, "src", "users"), { recursive: true });
  mkdirSync(join(root, "src", "sms"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "tcid-b", version: "0.0.0", type: "module" }, null, 2));
  writeFileSync(join(root, "src", "users", "profile.ts"), "export function buildProfileLabel(email: string): string {\n  return email;\n}\n");
  writeFileSync(
    join(root, "src", "sms", "route-message.ts"),
    "export type SmsMessage = { from: string; body: string };\n\nexport function routeInboundSms(message: SmsMessage): string {\n  if (message.body.includes(\"support\")) {\n    return \"support\";\n  }\n  return \"default\";\n}\n",
  );
  gitInit(root);

  runCli(["capability", "graph", "build", "--root", root, "--json"]);
  runCli(["embeddings", "index", "--root", root, "--all", "--provider", "mock", "--model", "mock-embedding", "--json"]);
  const task = json(
    runCli([
      "context", "task", "--root", root,
      "--task", "Update inbound SMS routing. Do not change profile label behavior. Verify routing behavior.",
      "--provider", "mock", "--model", "mock-embedding", "--json",
    ]).stdout,
  );
  const dirty = porcelain(root, ["src"]);
  return { root, task, dirty };
}

const A = runScenarioA();
const B = runScenarioB();

// 1
test("context task writes a TaskContextReport", () => {
  assert.match(A.taskRef, /^TaskContextReport:/);
});

// 2
test("intent assess with task context succeeds", () => {
  assert.ok(A.assess.artifact);
});

// 3
test("intent assess JSON reports taskContext.used = 1", () => {
  assert.equal(A.assess.taskContext.used, 1);
});

// 4
test("intent assess matchedContext includes the task context path", () => {
  assert.ok((A.assess.matchedContext?.paths ?? []).includes("src/index.ts"));
});

// 5
test("intent assess readiness is not made ready solely by task context", () => {
  assert.notEqual(A.assess.readiness.status, "ready-for-prepare");
  assert.notEqual(A.assess.readiness.status, "ready");
});

// 6
test("intent plan review with task context succeeds", () => {
  assert.ok(A.review.artifact);
});

// 7
test("intent plan review JSON reports taskContext.used = 1", () => {
  assert.equal(A.review.taskContext.used, 1);
});

// 8
test("revisionPrompt includes do-not-touch guidance", () => {
  assert.match(A.revisionPrompt, /do-not-touch/i);
  assert.match(A.revisionPrompt, /greet/i);
});

// 9
test("revisionPrompt includes verification-hint guidance", () => {
  assert.match(A.revisionPrompt, /verification hint/i);
  assert.match(A.revisionPrompt, /hint, not an executed command/i);
});

// 10
test("plan answer produces an actionable report", () => {
  const status = typeof A.answer.status === "string" ? A.answer.status : A.answer.status?.value;
  assert.equal(status, "actionable");
});

// 11
test("prepare creates implementation-bearing phases", () => {
  const phases = A.preparedArtifact.phases ?? [];
  assert.ok(phases.length >= 1, "prepared plan has no phases");
  assert.ok(phases.some((p) => Array.isArray(p.paths) && p.paths.length > 0), "no phase carries touched paths");
});

// 12
test("prepare approval remains needs-review before explicit approve", () => {
  assert.equal(A.preparedArtifact.approval.status, "needs-review");
  assert.equal(A.approveNoAcceptStatus, "blocked");
});

// 13
test("approve writes a new approved PreparedIntentPlan", () => {
  assert.equal(A.approve.status, "approved");
  assert.notEqual(A.approvedRef, A.preparedRef);
});

// 14
test("status transition writes a work-ready report", () => {
  assert.equal(A.transition.status, "work-ready");
});

// 15
test("work-order generate succeeds after approve/status", () => {
  assert.equal(A.workOrder.status, "generated");
});

// 16
test("verification-plan generate succeeds after approve/status", () => {
  assert.equal(A.verificationPlan.status, "generated");
});

// 17
test("bundle write succeeds", () => {
  assert.equal(A.bundle.ok, true);
});

// 18
test("bundle JSON reports handoff paths", () => {
  assert.equal(typeof A.bundle.handoffPath, "string");
  assert.ok(A.bundle.handoffPath.length > 0);
  assert.ok(typeof A.bundle.bundlePath === "string" && A.bundle.bundlePath.length > 0);
});

// 19
test("artifacts validate clean", () => {
  assert.equal(A.validate.valid ?? A.validate.ok, true);
});

// 20
test("source file unchanged", () => {
  assert.ok(!A.dirty.includes("src/index.ts"), `source changed: ${A.dirty}`);
});

// 21
test("plan file unchanged", () => {
  assert.ok(!A.dirty.includes("plans/rough.md"), `plan changed: ${A.dirty}`);
});

// 22
test("no commands executed (no VerificationRun produced by the path)", () => {
  assert.equal(latestOrEmpty(A.root, "VerificationRun"), "");
});

// 23
test("no source writes (working tree clean for tracked source)", () => {
  assert.equal(A.dirty, "");
});

// 24
test("intent:go not invoked (no IntentGo artifact exists)", () => {
  assert.equal(latestOrEmpty(A.root, "IntentGoReport"), "");
});

// 25
test("retrieval scenario records useful context or explicit low-signal warning", () => {
  const warnings = B.task.warnings ?? [];
  assert.ok(warnings.some((w) => /retrieval-low-signal/i.test(w)), `warnings: ${JSON.stringify(warnings)}`);
});

// 26
test("retrieval scenario preserves do-not-touch / verification hints", () => {
  const dnt = (B.task.doNotTouch ?? []).map((d) => d.reason ?? d);
  assert.ok(dnt.some((r) => /profile label/i.test(r)), `doNotTouch: ${JSON.stringify(dnt)}`);
  assert.ok((B.task.verificationHints ?? []).length >= 1);
  assert.equal(B.dirty, "");
});
