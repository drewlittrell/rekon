// Fresh Repo Intent Handoff / Circe Dogfood Review (slice 140).
//
// Distinct from the slice-136 `fresh-repo-intent-handoff-dogfood.test.mjs`
// (which predates semantic normalization). This drives the full operator path
// on a fresh, real-ish repo through public Rekon commands, exercising semantic
// mode and the Circe projection: scan -> intent context prepare -> intent plan
// review (off / auto / required) -> intent plan answer -> intent assess ->
// intent prepare (--actionability-report) -> intent status -> intent approve ->
// intent status transition -> intent work-order generate -> intent
// verification-plan generate -> intent bundle write -> artifacts validate. Then
// it inspects the bundle / Circe projection and proves the boundaries: source +
// plan files are unchanged, no commands are executed, no Circe is run, and
// intent:go is deferred.
//
// The whole flow runs once at module load; each test asserts one slice of it.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

const SRC = 'export const existing = "ok";\n\nexport function greet(name: string): string {\n  return `hello ${name}`;\n}\n';
const TST = 'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { greet } from "../src/index.js";\n\ntest("greet returns message", () => {\n  assert.equal(greet("rekon"), "hello rekon");\n});\n';
const PLAN = "# Add marker export\n\nMaybe add a marker export to the package.\n\nTODO: decide exact file, export name, acceptance criteria, and verification.\n\nNon-goals:\n- Do not change greet behavior.\n- Do not add runtime dependencies.\n";
const GOAL = "Add a marker export to src/index.ts without changing greet behavior.";

const cli = (ROOT, args) => spawnSync(process.execPath, [cliPath, ...args, "--root", ROOT], { encoding: "utf8" });
const idOnly = (ROOT, type) => cli(ROOT, ["artifacts", "latest", "--type", type, "--id-only"]).stdout.trim();
const count = (ROOT, type) => {
  const out = cli(ROOT, ["artifacts", "list", "--type", type, "--json"]).stdout;
  try { const j = JSON.parse(out); return Array.isArray(j.artifacts) ? j.artifacts.length : 0; } catch { return 0; }
};
const showArtifact = (ROOT, ref) => JSON.parse(cli(ROOT, ["artifacts", "show", ref, "--json"]).stdout).artifact;
const digest = (text) => createHash("sha256").update(text).digest("hex");

function runFlow() {
  const TMP = mkdtempSync(join(tmpdir(), "rekon-fresh-handoff-"));
  const ROOT = join(TMP, "repo");
  mkdirSync(join(ROOT, "src"), { recursive: true });
  mkdirSync(join(ROOT, "test"), { recursive: true });
  mkdirSync(join(ROOT, "plans"), { recursive: true });
  writeFileSync(join(ROOT, "package.json"), JSON.stringify({ name: "fresh", version: "0.0.0", type: "module", scripts: { typecheck: "tsc --noEmit", test: "node --test", build: "echo build" } }, null, 2) + "\n");
  writeFileSync(join(ROOT, "src/index.ts"), SRC);
  writeFileSync(join(ROOT, "test/index.test.ts"), TST);
  writeFileSync(join(ROOT, "plans/rough.md"), PLAN);
  const planPath = join(ROOT, "plans/rough.md");

  const env = { ...process.env };
  delete env.OPENAI_API_KEY; delete env.REKON_LLM_ENABLED; delete env.REKON_RUN_LIVE_LLM_TESTS;
  const r = (args) => spawnSync(process.execPath, [cliPath, ...args, "--root", ROOT], { encoding: "utf8", env });

  const o = {};
  o.scan = r(["scan", "--json"]);
  o.ctx = r(["intent", "context", "prepare", "--json"]);
  const review = (mode, extra = []) => r(["intent", "plan", "review", "--plan", planPath, "--goal", GOAL, "--semantic", mode, ...extra, "--json"]);
  o.off = review("off");
  o.auto = review("auto", ["--llm-provider", "openai", "--llm-model", "test-model"]);
  o.reportsBeforeRequired = count(ROOT, "IntentPlanActionabilityReport");
  o.required = review("required", ["--llm-provider", "openai", "--llm-model", "test-model"]);
  o.reportsAfterRequired = count(ROOT, "IntentPlanActionabilityReport");

  o.reportRef = idOnly(ROOT, "IntentPlanActionabilityReport");
  o.report = showArtifact(ROOT, o.reportRef);
  o.sourceReportBefore = digest(JSON.stringify(showArtifact(ROOT, o.reportRef)));

  const answers = o.report.elicitationQuestions.map((q) => {
    if (q.answerShape === "sentence") return { questionId: q.id, answer: "Add a named marker export to src/index.ts while preserving existing greet behavior." };
    if (q.answerShape === "paths") return { questionId: q.id, answer: "src/index.ts\ntest/index.test.ts" };
    if (q.answerShape === "command-or-artifact") return { questionId: q.id, answer: "npm run typecheck\nnpm test\nnpm run build" };
    return { questionId: q.id, answer: "- Export a marker constant from src/index.ts.\n- Preserve test coverage for greet.\n- Do not add dependencies." };
  });
  const answersPath = join(TMP, "answers.json");
  writeFileSync(answersPath, JSON.stringify({ answers }, null, 2));
  o.answer = r(["intent", "plan", "answer", "--report", o.reportRef, "--answers", answersPath, "--answered-by", "dogfood", "--json"]);
  o.sourceReportAfter = digest(JSON.stringify(showArtifact(ROOT, o.reportRef)));
  o.answeredRef = idOnly(ROOT, "IntentPlanActionabilityReport");
  o.answered = showArtifact(ROOT, o.answeredRef);

  o.assess = r(["intent", "assess", "--goal", GOAL, "--kind", "feature", "--path", "src/index.ts", "--path", "test/index.test.ts", "--constraint", "Do not add runtime dependencies.", "--constraint", "Do not change greet behavior.", "--json"]);
  o.assessmentRef = idOnly(ROOT, "IntentAssessmentReport");
  o.prepare = r(["intent", "prepare", "--assessment", o.assessmentRef, "--actionability-report", o.answeredRef, "--json"]);
  o.planRef = idOnly(ROOT, "PreparedIntentPlan");
  o.preparedBeforeApprove = showArtifact(ROOT, o.planRef);
  o.status = r(["intent", "status", "--json"]);
  o.statusRef = idOnly(ROOT, "IntentStatusReport");
  o.approve = r(["intent", "approve", "--prepared-plan", o.planRef, "--intent-status", o.statusRef, "--accept", "verification-proof-missing", "--accept", "runtime-drift-unresolved", "--reason", "Operator reviewed the answered plan and accepts these proof gaps for handoff generation.", "--accepted-by", "dogfood", "--json"]);
  o.approvedRef = idOnly(ROOT, "PreparedIntentPlan");
  o.transition = r(["intent", "status", "transition", "--prepared-plan", o.approvedRef, "--previous-status", o.statusRef, "--to", "work-ready", "--reason", "Operator approved work-ready transition.", "--json"]);
  o.wrStatusRef = idOnly(ROOT, "IntentStatusReport");
  o.workOrder = r(["intent", "work-order", "generate", "--prepared-plan", o.approvedRef, "--intent-status", o.wrStatusRef, "--json"]);
  o.verifPlan = r(["intent", "verification-plan", "generate", "--prepared-plan", o.approvedRef, "--intent-status", o.wrStatusRef, "--json"]);
  o.bundle = r(["intent", "bundle", "write", "--prepared-plan", o.approvedRef, "--intent-status", o.wrStatusRef, "--json"]);
  o.validate = r(["artifacts", "validate", "--json"]);

  const bundleParent = join(ROOT, ".rekon/intent/plans");
  const bundleDirName = existsSync(bundleParent) ? readdirSync(bundleParent).find((d) => existsSync(join(bundleParent, d, "circe/handoff.json"))) : undefined;
  o.bundleDir = bundleDirName ? join(bundleParent, bundleDirName) : "";
  const readBundle = (rel) => (o.bundleDir && existsSync(join(o.bundleDir, rel)) ? readFileSync(join(o.bundleDir, rel), "utf8") : "");
  o.handoffExists = Boolean(o.bundleDir) && existsSync(join(o.bundleDir, "circe/handoff.json"));
  o.phasePlanExists = Boolean(o.bundleDir) && existsSync(join(o.bundleDir, "circe/phase-plan.json"));
  o.proofExists = Boolean(o.bundleDir) && existsSync(join(o.bundleDir, "circe/rekon-proof.json"));
  o.workOrderFiles = o.bundleDir && existsSync(join(o.bundleDir, "circe/work-orders")) ? readdirSync(join(o.bundleDir, "circe/work-orders")) : [];
  o.verifPlanFiles = o.bundleDir && existsSync(join(o.bundleDir, "circe/verification-plans")) ? readdirSync(join(o.bundleDir, "circe/verification-plans")) : [];
  o.proof = o.proofExists ? JSON.parse(readBundle("circe/rekon-proof.json")) : {};
  o.phasePlanText = readBundle("circe/phase-plan.json");
  o.agentVerification = readBundle("agent/verification.json") ? JSON.parse(readBundle("agent/verification.json")) : {};

  o.srcUnchanged = readFileSync(join(ROOT, "src/index.ts"), "utf8") === SRC && readFileSync(join(ROOT, "test/index.test.ts"), "utf8") === TST;
  o.planUnchanged = readFileSync(join(ROOT, "plans/rough.md"), "utf8") === PLAN;
  o.ROOT = ROOT;
  return o;
}

const F = runFlow();

test("1. scan succeeds", () => assert.equal(F.scan.status, 0, F.scan.stderr));
test("2. intent context prepare succeeds", () => assert.equal(F.ctx.status, 0, F.ctx.stderr));
test("3. semantic off writes a report", () => assert.equal(F.off.status, 0, F.off.stderr));
test("4. semantic auto with no key writes a deterministic-fallback report", () => {
  assert.equal(F.auto.status, 0, F.auto.stderr);
  assert.equal(F.reportsBeforeRequired, 2);
});
test("5. semantic required with no key exits non-zero and writes no report", () => {
  assert.notEqual(F.required.status, 0);
  assert.equal(F.reportsAfterRequired, 2);
});
test("6. rough plan review is non-actionable and has elicitation questions", () => {
  assert.ok(["blocked", "needs-revision"].includes(F.report.status.value));
  assert.ok(F.report.elicitationQuestions.length > 0);
});
test("7. plan answer writes a new report", () => {
  assert.equal(F.answer.status, 0, F.answer.stderr);
  assert.notEqual(F.answeredRef, F.reportRef);
});
test("8. answered report is actionable", () => assert.equal(F.answered.status.value, "actionable"));
test("9. source report remains byte-unchanged after answer", () => assert.equal(F.sourceReportBefore, F.sourceReportAfter));
test("10. source plan file remains unchanged", () => assert.equal(F.planUnchanged, true));
test("11. assess succeeds with no hard missing-spine blockers", () => {
  assert.equal(F.assess.status, 0, F.assess.stderr);
  assert.ok(F.assessmentRef.startsWith("IntentAssessmentReport:"));
});
test("12. prepare succeeds from the answered report", () => {
  assert.equal(F.prepare.status, 0, F.prepare.stderr);
  assert.ok(F.planRef.startsWith("PreparedIntentPlan:"));
});
test("13. prepare does not auto-approve", () => {
  const status = F.preparedBeforeApprove?.approval?.status ?? F.preparedBeforeApprove?.approvalStatus;
  assert.notEqual(status, "approved");
});
test("14. approve succeeds after accepted gaps", () => assert.equal(F.approve.status, 0, F.approve.stderr));
test("15. status transition to work-ready succeeds", () => assert.equal(F.transition.status, 0, F.transition.stderr));
test("16. WorkOrder generation succeeds", () => assert.equal(F.workOrder.status, 0, F.workOrder.stderr));
test("17. VerificationPlan generation succeeds", () => assert.equal(F.verifPlan.status, 0, F.verifPlan.stderr));
test("18. bundle write succeeds", () => assert.equal(F.bundle.status, 0, F.bundle.stderr));
test("19. bundle emits circe/handoff.json", () => assert.equal(F.handoffExists, true));
test("20. bundle emits circe/phase-plan.json", () => assert.equal(F.phasePlanExists, true));
test("21. bundle emits circe/rekon-proof.json", () => assert.equal(F.proofExists, true));
test("22. bundle emits at least one per-phase WorkOrder", () => assert.ok(F.workOrderFiles.length >= 1));
test("23. bundle emits VerificationPlan(s)", () => assert.ok(F.verifPlanFiles.length >= 1));
test("24. proof sidecar carries approval / accepted-risk traceability", () => {
  const reasons = (F.proof.approval?.reasons ?? []).join(",");
  assert.ok(reasons.includes("verification-proof-missing"));
  assert.ok(reasons.includes("runtime-drift-unresolved"));
});
test("25. phase verification posture is explicit", () => {
  assert.match(F.phasePlanText, /posture/i);
  assert.match(F.phasePlanText, /needs-review|manual|reviewer/i);
});
test("26. proof gates: sourceWriteAllowed is false", () => assert.equal(F.proof.gates.sourceWriteAllowed, false));
test("27. proof gates: runsCirce is false", () => assert.equal(F.proof.gates.runsCirce, false));
test("28. artifacts validate is clean", () => assert.equal(F.validate.status, 0, F.validate.stderr));
test("29. source files are unchanged end-to-end", () => assert.equal(F.srcUnchanged, true));
test("30. plan file is unchanged end-to-end", () => assert.equal(F.planUnchanged, true));
test("31. no Rekon command executed verification commands", () => {
  assert.equal(F.agentVerification.executesCommands, false);
  assert.equal(F.proof.gates.commandsExecuted, false);
});
test("32. intent:go is deferred (no go semantics invoked)", () => assert.equal(F.proof.gates.intentGoDeferred, true));
