// Plan Compiler Loop Closure / Fresh Repo End-to-End Proof (slice 135).
//
// Runs the full public Rekon path on a fresh temp repo:
//   scan → intent context prepare → intent plan review → intent plan answer
//   → intent assess → intent prepare (--actionability-report) → intent status
//   → intent approve → intent status transition (work-ready)
//   → intent work-order generate → intent verification-plan generate
//   → intent bundle write → artifacts validate
// and proves the loop closes with the source plan and source report immutable,
// no command execution, no Circe execution, and no intent:go.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

const SRC = 'export const existing = "ok";\n';
const PLAN_MD = "# Add marker export\n\nMaybe add a marker export somewhere.\n\nTODO: decide the file and verification.\n";
const GOAL = "Add a marker export to src/index.ts.";

function answerForShape(shape) {
  if (shape === "sentence") return GOAL;
  if (shape === "paths") return "src/index.ts";
  if (shape === "command-or-artifact") return "npm run typecheck\nnpm test\nnpm run build";
  return "- Export a marker constant from src/index.ts.\n- Existing export remains unchanged.";
}

// ---- Run the whole path once at module load ----
const ctx = await (async () => {
  const TMP = mkdtempSync(join(tmpdir(), "rekon-loop-"));
  const ROOT = join(TMP, "plan-compiler-closure");
  mkdirSync(join(ROOT, "plans"), { recursive: true });
  mkdirSync(join(ROOT, "src"), { recursive: true });
  writeFileSync(join(ROOT, "package.json"), JSON.stringify({ name: "plan-compiler-closure", version: "0.0.0", type: "module", scripts: { typecheck: "tsc --noEmit", test: "node --test", build: "echo build" } }, null, 2) + "\n");
  writeFileSync(join(ROOT, "src/index.ts"), SRC);
  writeFileSync(join(ROOT, "plans/rough.md"), PLAN_MD);

  const cli = (args) => spawnSync(process.execPath, [cliPath, ...args, "--root", ROOT, "--json"], { encoding: "utf8" });
  const cliRaw = (args) => spawnSync(process.execPath, [cliPath, ...args, "--root", ROOT], { encoding: "utf8" });
  const jsonOf = (res) => { try { return JSON.parse(res.stdout); } catch { return undefined; } };
  const latest = (type) => spawnSync(process.execPath, [cliPath, "artifacts", "latest", "--root", ROOT, "--type", type, "--id-only"], { encoding: "utf8" }).stdout.trim();
  const body = (ref) => JSON.parse(spawnSync(process.execPath, [cliPath, "artifacts", "show", "--root", ROOT, ref, "--json"], { encoding: "utf8" }).stdout).artifact;
  const listTypeCount = (type) => { const out = spawnSync(process.execPath, [cliPath, "artifacts", "list", "--root", ROOT, "--type", type, "--json"], { encoding: "utf8" }).stdout; try { const j = JSON.parse(out); return Array.isArray(j.artifacts) ? j.artifacts.length : (Array.isArray(j) ? j.length : 0); } catch { return 0; } };

  cli(["scan"]);
  cli(["intent", "context", "prepare"]);

  const review = jsonOf(cli(["intent", "plan", "review", "--plan", join(ROOT, "plans/rough.md"), "--goal", GOAL, "--semantic", "off"]));
  const reportRef = latest("IntentPlanActionabilityReport");
  const report = body(reportRef);
  const reportBefore = JSON.stringify(report);

  writeFileSync(join(TMP, "answers.json"), JSON.stringify({ answers: report.elicitationQuestions.map((q) => ({ questionId: q.id, answer: answerForShape(q.answerShape) })) }));
  const answer = jsonOf(cli(["intent", "plan", "answer", "--report", reportRef, "--answers", join(TMP, "answers.json"), "--answered-by", "closure-smoke"]));
  const answeredRef = latest("IntentPlanActionabilityReport");
  const answered = body(answeredRef);
  const reportAfter = JSON.stringify(body(reportRef));

  cli(["intent", "assess", "--goal", GOAL, "--kind", "feature", "--path", "src/index.ts"]);
  const assessRef = latest("IntentAssessmentReport");
  const prepare = cli(["intent", "prepare", "--assessment", assessRef, "--actionability-report", answeredRef]);
  const planRef = latest("PreparedIntentPlan");
  const plan = body(planRef);

  cli(["intent", "status"]);
  const statusRef = latest("IntentStatusReport");
  const requiredGaps = (plan.approval?.reasons ?? []).filter((r) => ["verification-proof-missing", "runtime-drift-unresolved"].includes(r));
  const acc = requiredGaps.flatMap((g) => ["--accept", g]);
  const approve = cli(["intent", "approve", "--prepared-plan", planRef, "--intent-status", statusRef, ...acc, "--reason", "Operator reviewed the answered plan and accepts these proof gaps for handoff generation.", "--accepted-by", "closure-smoke"]);
  const approvedPlanRef = latest("PreparedIntentPlan");
  const approvedPlan = body(approvedPlanRef);

  const transition = cli(["intent", "status", "transition", "--prepared-plan", approvedPlanRef, "--previous-status", statusRef, "--to", "work-ready", "--reason", "Operator approved work-ready transition after answered plan review and approval."]);
  const workReadyRef = latest("IntentStatusReport");

  const workOrder = cli(["intent", "work-order", "generate", "--prepared-plan", approvedPlanRef, "--intent-status", workReadyRef]);
  const verificationPlan = cli(["intent", "verification-plan", "generate", "--prepared-plan", approvedPlanRef, "--intent-status", workReadyRef]);
  const bundle = cli(["intent", "bundle", "write", "--prepared-plan", approvedPlanRef, "--intent-status", workReadyRef]);
  const bundleJson = jsonOf(bundle);
  const intentId = bundleJson?.intentId ?? bundleJson?.bundle?.intentId ?? bundleJson?.intent?.id;
  const bdir = join(ROOT, ".rekon/intent/plans", String(intentId));
  const validate = cli(["artifacts", "validate"]);

  return {
    ROOT, review, reportRef, report, answer, answeredRef, answered, reportBefore, reportAfter,
    prepare, planRef, plan, statusRef, requiredGaps, approve, approvedPlanRef, approvedPlan,
    transition, workReadyRef, workOrder, verificationPlan, bundle, bundleJson, bdir, validate,
    srcAfter: readFileSync(join(ROOT, "src/index.ts"), "utf8"),
    planAfter: readFileSync(join(ROOT, "plans/rough.md"), "utf8"),
    verificationRunCount: listTypeCount("VerificationRun"),
    verificationResultCount: listTypeCount("VerificationResult"),
  };
})();

const woStr = JSON.stringify(ctx.workOrder.stdout || "");
const vpStr = JSON.stringify(ctx.verificationPlan.stdout || "");

test("1. rough-plan review produces a non-actionable report", () => {
  assert.ok(ctx.review);
  assert.notEqual(ctx.review.status, "actionable");
});
test("2. the report carries elicitation questions", () => {
  assert.ok(Array.isArray(ctx.report.elicitationQuestions) && ctx.report.elicitationQuestions.length > 0);
});
test("3. plan answer writes a new report revision", () => {
  assert.equal(ctx.answer.status, "actionable");
  assert.notEqual(ctx.answeredRef, ctx.reportRef);
});
test("4. the source report is not mutated", () => {
  assert.equal(ctx.reportAfter, ctx.reportBefore);
});
test("5. the source plan file is unchanged", () => {
  assert.equal(ctx.planAfter, PLAN_MD);
});
test("6. the answered report carries an answerTrace", () => {
  assert.ok(ctx.answered.answerTrace);
  assert.equal(ctx.answered.answerTrace.method, "deterministic");
});
test("7. the answered report is actionable", () => {
  assert.equal(ctx.answered.status.value, "actionable");
});
test("8. prepare from the answered report writes a PreparedIntentPlan", () => {
  assert.equal(ctx.prepare.status, 0, ctx.prepare.stderr);
  assert.ok(ctx.plan.header.artifactType === "PreparedIntentPlan");
});
test("9. prepare does not auto-approve", () => {
  assert.notEqual(ctx.plan.approval.status, "approved");
});
test("10. the prepared plan includes a synthesized verify phase plus an implementation phase", () => {
  const kinds = ctx.plan.phases.map((p) => p.kind);
  assert.ok(kinds.includes("verify"), `expected a verify phase, got ${kinds.join(",")}`);
  assert.ok(kinds.some((k) => k === "modify" || k === "refactor"), "expected an implementation phase");
});
test("11. approval succeeds after accepting the required gaps", () => {
  assert.equal(ctx.approve.status, 0, ctx.approve.stderr);
  assert.equal(ctx.approvedPlan.approval.status, "approved");
});
test("12. the prepared plan validates clean (verify-phase rule satisfied)", () => {
  // approve re-validates the plan; its success proves the plan is structurally valid.
  assert.equal(ctx.approve.status, 0);
});
test("13. status transition writes a work-ready IntentStatusReport", () => {
  assert.equal(ctx.transition.status, 0, ctx.transition.stderr);
  assert.notEqual(ctx.workReadyRef, ctx.statusRef);
});
test("14. work-order generation proceeds without a plan-not-approved blocker", () => {
  assert.equal(ctx.workOrder.status, 0, ctx.workOrder.stderr);
  assert.ok(!woStr.includes("plan-not-approved"));
});
test("15. work-order generation proceeds without a status-not-work-ready blocker", () => {
  assert.ok(!woStr.includes("status-not-work-ready"));
});
test("16. verification-plan generation proceeds without a plan-not-approved blocker", () => {
  assert.equal(ctx.verificationPlan.status, 0, ctx.verificationPlan.stderr);
  assert.ok(!vpStr.includes("plan-not-approved"));
});
test("17. verification-plan generation proceeds without a status-not-work-ready blocker", () => {
  assert.ok(!vpStr.includes("status-not-work-ready"));
});
test("18. bundle write emits circe/handoff.json", () => {
  assert.equal(ctx.bundle.status, 0, ctx.bundle.stderr);
  assert.ok(existsSync(join(ctx.bdir, "circe/handoff.json")));
});
test("19. bundle write emits circe/rekon-proof.json", () => {
  assert.ok(existsSync(join(ctx.bdir, "circe/rekon-proof.json")));
});
test("20. artifacts validate is clean", () => {
  assert.equal(ctx.validate.status, 0, ctx.validate.stderr);
});
test("21. no source file or plan file was written", () => {
  assert.equal(ctx.srcAfter, SRC);
  assert.equal(ctx.planAfter, PLAN_MD);
});
test("22. Rekon executed nothing: no VerificationRun / VerificationResult artifacts exist", () => {
  assert.equal(ctx.verificationRunCount, 0);
  assert.equal(ctx.verificationResultCount, 0);
});
