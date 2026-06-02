// Fresh Repo Intent Handoff / Circe Dogfood Review (slice 136).
//
// Dogfoods the closed public Rekon plan-compiler + intent-handoff path on a
// *realistic* fresh repo: a small TypeScript package (existing export + greet()
// + a test + a rough plan with a TODO and Non-goals). It runs the full public
// sequence with public commands only:
//   scan → intent context prepare → intent plan review → intent plan answer
//   → intent assess (2 paths + 2 constraints) → intent prepare
//   (--actionability-report) → intent status → intent approve
//   → intent status transition (work-ready) → intent work-order generate
//   → intent verification-plan generate → intent bundle write → artifacts validate
//
// and proves the fresh-repo operator reaches a Circe-importable handoff bundle
// with every proof gate explicit and WITHOUT Rekon executing verification
// commands, writing source/plan files, running Circe, or implementing intent:go.
//
// This is a review/proof artifact: it asserts the already-shipped public path,
// it does not exercise any new capability. The optional `circe import
// rekon-phase-plan` / `rekon-work-order` validation is recorded in the strategy
// doc and review packet (it requires an external Circe checkout); this test is
// hermetic and depends only on the built Rekon CLI.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

const SRC = 'export const existing = "ok";\n\nexport function greet(name: string): string {\n  return `hello ${name}`;\n}\n';
const TST = 'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { greet } from "../src/index.js";\n\ntest("greet returns message", () => {\n  assert.equal(greet("rekon"), "hello rekon");\n});\n';
const PLAN_MD = "# Add marker export\n\nMaybe add a marker export to the package.\n\nTODO: decide exact file, export name, acceptance criteria, and verification.\n\nNon-goals:\n- Do not change greet behavior.\n- Do not add runtime dependencies.\n";
const GOAL = "Add a marker export to src/index.ts without changing greet behavior.";

function answerForShape(shape) {
  if (shape === "sentence") return "Add a named marker export to src/index.ts while preserving existing greet behavior.";
  if (shape === "paths") return "src/index.ts\ntest/index.test.ts";
  if (shape === "command-or-artifact") return "npm run typecheck\nnpm test\nnpm run build";
  return "- Export a marker constant from src/index.ts.\n- Add or preserve test coverage for existing greet behavior.\n- Do not add dependencies.";
}

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const readText = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const dirCount = (p) => { try { return readdirSync(p).filter((f) => f.endsWith(".json")).length; } catch { return 0; } };

// ---- Run the whole public path once at module load ----
const ctx = await (async () => {
  const TMP = mkdtempSync(join(tmpdir(), "rekon-dogfood-"));
  const ROOT = join(TMP, "rekon-circe-dogfood");
  mkdirSync(join(ROOT, "src"), { recursive: true });
  mkdirSync(join(ROOT, "test"), { recursive: true });
  mkdirSync(join(ROOT, "plans"), { recursive: true });
  writeFileSync(join(ROOT, "package.json"), JSON.stringify({ name: "rekon-circe-dogfood", version: "0.0.0", type: "module", scripts: { typecheck: "tsc --noEmit", test: "node --test", build: "echo build" }, devDependencies: { typescript: "^5.0.0" } }, null, 2) + "\n");
  writeFileSync(join(ROOT, "tsconfig.json"), JSON.stringify({ compilerOptions: { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", strict: true, noEmit: true }, include: ["src/**/*.ts", "test/**/*.ts"] }, null, 2) + "\n");
  writeFileSync(join(ROOT, "src/index.ts"), SRC);
  writeFileSync(join(ROOT, "test/index.test.ts"), TST);
  writeFileSync(join(ROOT, "plans/add-marker-rough.md"), PLAN_MD);

  const cli = (args) => spawnSync(process.execPath, [cliPath, ...args, "--root", ROOT, "--json"], { encoding: "utf8" });
  const jsonOf = (res) => { try { return JSON.parse(res.stdout); } catch { return undefined; } };
  const latest = (type) => spawnSync(process.execPath, [cliPath, "artifacts", "latest", "--root", ROOT, "--type", type, "--id-only"], { encoding: "utf8" }).stdout.trim();
  const body = (ref) => JSON.parse(spawnSync(process.execPath, [cliPath, "artifacts", "show", "--root", ROOT, ref, "--json"], { encoding: "utf8" }).stdout).artifact;
  const listTypeCount = (type) => { const out = spawnSync(process.execPath, [cliPath, "artifacts", "list", "--root", ROOT, "--type", type, "--json"], { encoding: "utf8" }).stdout; try { const j = JSON.parse(out); return Array.isArray(j.artifacts) ? j.artifacts.length : (Array.isArray(j) ? j.length : 0); } catch { return 0; } };

  cli(["scan"]);
  cli(["intent", "context", "prepare"]);

  const review = jsonOf(cli(["intent", "plan", "review", "--plan", join(ROOT, "plans/add-marker-rough.md"), "--goal", GOAL, "--semantic", "off"]));
  const reportRef = latest("IntentPlanActionabilityReport");
  const report = body(reportRef);
  const reportBefore = JSON.stringify(report);

  writeFileSync(join(TMP, "answers.json"), JSON.stringify({ answers: report.elicitationQuestions.map((q) => ({ questionId: q.id, answer: answerForShape(q.answerShape) })) }));
  const answer = jsonOf(cli(["intent", "plan", "answer", "--report", reportRef, "--answers", join(TMP, "answers.json"), "--answered-by", "dogfood"]));
  const answeredRef = latest("IntentPlanActionabilityReport");
  const answered = body(answeredRef);
  const reportAfter = JSON.stringify(body(reportRef));

  const assessRes = cli(["intent", "assess", "--goal", GOAL, "--kind", "feature", "--path", "src/index.ts", "--path", "test/index.test.ts", "--constraint", "Do not add runtime dependencies.", "--constraint", "Do not change greet behavior."]);
  const assessRef = latest("IntentAssessmentReport");
  const assessStr = JSON.stringify(body(assessRef));

  const prepare = cli(["intent", "prepare", "--assessment", assessRef, "--actionability-report", answeredRef]);
  const planRef = latest("PreparedIntentPlan");
  const plan = body(planRef);

  cli(["intent", "status"]);
  const statusRef = latest("IntentStatusReport");
  const requiredGaps = (plan.approval?.reasons ?? []).filter((r) => ["verification-proof-missing", "runtime-drift-unresolved"].includes(r));
  const acc = requiredGaps.flatMap((g) => ["--accept", g]);
  const approve = cli(["intent", "approve", "--prepared-plan", planRef, "--intent-status", statusRef, ...acc, "--reason", "Operator reviewed the answered plan and accepts these proof gaps for handoff generation.", "--accepted-by", "dogfood"]);
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

  const manifest = existsSync(join(bdir, "manifest.json")) ? readJson(join(bdir, "manifest.json")) : undefined;
  const handoff = existsSync(join(bdir, "circe/handoff.json")) ? readJson(join(bdir, "circe/handoff.json")) : undefined;
  const proof = existsSync(join(bdir, "circe/rekon-proof.json")) ? readJson(join(bdir, "circe/rekon-proof.json")) : undefined;
  const agentVerification = existsSync(join(bdir, "agent/verification.json")) ? readJson(join(bdir, "agent/verification.json")) : undefined;
  const projectionText = readText(join(bdir, "manifest.json")) + readText(join(bdir, "circe/rekon-proof.json")) + readText(join(bdir, "circe/handoff.json"));

  return {
    ROOT, review, reportRef, report, reportBefore, reportAfter, answer, answeredRef, answered,
    assessRes, assessRef, assessStr, prepare, planRef, plan, statusRef, requiredGaps, approve,
    approvedPlanRef, approvedPlan, transition, workReadyRef, workOrder, verificationPlan, bundle,
    bundleJson, intentId, bdir, validate, manifest, handoff, proof, agentVerification, projectionText,
    woCount: dirCount(join(bdir, "circe/work-orders")),
    vpCount: dirCount(join(bdir, "circe/verification-plans")),
    srcAfter: readFileSync(join(ROOT, "src/index.ts"), "utf8"),
    testAfter: readFileSync(join(ROOT, "test/index.test.ts"), "utf8"),
    planAfter: readFileSync(join(ROOT, "plans/add-marker-rough.md"), "utf8"),
    verificationRunCount: listTypeCount("VerificationRun"),
    verificationResultCount: listTypeCount("VerificationResult"),
  };
})();

const woStr = JSON.stringify(ctx.workOrder.stdout || "");
const vpStr = JSON.stringify(ctx.verificationPlan.stdout || "");

// ---- Path / answer-merge-back (1-6) ----
test("1. a rough plan reviews as non-actionable", () => {
  assert.ok(ctx.review);
  assert.notEqual(ctx.review.status, "actionable");
});
test("2. the review surfaces elicitation questions", () => {
  assert.ok(Array.isArray(ctx.report.elicitationQuestions) && ctx.report.elicitationQuestions.length > 0);
});
test("3. answering merges back into a new actionable report revision", () => {
  assert.equal(ctx.answer.status, "actionable");
  assert.equal(ctx.answered.status.value, "actionable");
  assert.notEqual(ctx.answeredRef, ctx.reportRef);
});
test("4. the source report is not mutated by answer", () => {
  assert.equal(ctx.reportAfter, ctx.reportBefore);
});
test("5. the answered report carries a deterministic answerTrace", () => {
  assert.ok(ctx.answered.answerTrace);
  assert.equal(ctx.answered.answerTrace.method, "deterministic");
});
test("6. the source plan file is never written by the review/answer loop", () => {
  assert.equal(ctx.planAfter, PLAN_MD);
});

// ---- Assess / prepare / approve (7-12) ----
test("7. assess accepts multiple --path and --constraint flags", () => {
  assert.equal(ctx.assessRes.status, 0, ctx.assessRes.stderr);
});
test("8. the assessment records both paths and both constraints", () => {
  assert.ok(ctx.assessStr.includes("src/index.ts"));
  assert.ok(ctx.assessStr.includes("test/index.test.ts"));
  assert.ok(ctx.assessStr.includes("runtime dependencies"));
  assert.ok(ctx.assessStr.includes("greet behavior"));
});
test("9. prepare from the answered report writes a PreparedIntentPlan", () => {
  assert.equal(ctx.prepare.status, 0, ctx.prepare.stderr);
  assert.equal(ctx.plan.header.artifactType, "PreparedIntentPlan");
});
test("10. prepare does not auto-approve (needs-review with required gaps)", () => {
  assert.notEqual(ctx.plan.approval.status, "approved");
  assert.ok(ctx.requiredGaps.length > 0);
});
test("11. the prepared plan carries an implementation phase and a verify phase", () => {
  const kinds = ctx.plan.phases.map((p) => p.kind);
  assert.ok(kinds.some((k) => k === "modify" || k === "refactor"), `expected an implementation phase, got ${kinds.join(",")}`);
  assert.ok(kinds.includes("verify"), `expected a verify phase, got ${kinds.join(",")}`);
});
test("12. approval succeeds once the operator accepts the required gaps", () => {
  assert.equal(ctx.approve.status, 0, ctx.approve.stderr);
  assert.equal(ctx.approvedPlan.approval.status, "approved");
});

// ---- Status / gated handoff generation (13-16) ----
test("13. status transitions to work-ready", () => {
  assert.equal(ctx.transition.status, 0, ctx.transition.stderr);
  assert.notEqual(ctx.workReadyRef, ctx.statusRef);
});
test("14. work-order generation runs without plan-not-approved / status-not-work-ready blockers", () => {
  assert.equal(ctx.workOrder.status, 0, ctx.workOrder.stderr);
  assert.ok(!woStr.includes("plan-not-approved"));
  assert.ok(!woStr.includes("status-not-work-ready"));
});
test("15. verification-plan generation runs without plan-not-approved / status-not-work-ready blockers", () => {
  assert.equal(ctx.verificationPlan.status, 0, ctx.verificationPlan.stderr);
  assert.ok(!vpStr.includes("plan-not-approved"));
  assert.ok(!vpStr.includes("status-not-work-ready"));
});
test("16. bundle write succeeds", () => {
  assert.equal(ctx.bundle.status, 0, ctx.bundle.stderr);
  assert.ok(ctx.intentId);
});

// ---- Bundle / Circe projection (17-21) ----
test("17. the agent-handoff files are present", () => {
  for (const rel of ["manifest.json", "prepared-plan.md", "verification-plan.md", "agent/verification.json"]) {
    assert.ok(existsSync(join(ctx.bdir, rel)), `missing ${rel}`);
  }
});
test("18. the circe/ projection files are present", () => {
  for (const rel of ["circe/handoff.json", "circe/phase-plan.json", "circe/rekon-proof.json"]) {
    assert.ok(existsSync(join(ctx.bdir, rel)), `missing ${rel}`);
  }
});
test("19. per-phase WorkOrders and VerificationPlans are projected", () => {
  assert.ok(ctx.woCount >= 1, `expected >=1 work-order, got ${ctx.woCount}`);
  assert.ok(ctx.vpCount >= 1, `expected >=1 verification-plan, got ${ctx.vpCount}`);
});
test("20. the handoff references each projected WorkOrder by path and artifactId", () => {
  const wos = ctx.handoff?.artifacts?.workOrders;
  assert.ok(Array.isArray(wos) && wos.length === ctx.woCount);
  for (const wo of wos) {
    assert.ok(typeof wo.path === "string" && wo.path.length > 0);
    assert.ok(typeof wo.artifactId === "string" && wo.artifactId.length > 0);
  }
});
test("21. the handoff is produced by Rekon", () => {
  assert.equal(ctx.handoff?.producer?.system, "rekon");
});

// ---- Boundaries: no execution, no source write, no Circe run, intent:go deferred (22-25) ----
test("22. manifest boundaries assert no execution / no source write / no intent:go", () => {
  assert.equal(ctx.manifest.boundaries.executesCommands, false);
  assert.equal(ctx.manifest.boundaries.writesSourceFiles, false);
  assert.equal(ctx.manifest.boundaries.implementsIntentGo, false);
});
test("23. the proof sidecar gates assert sourceWriteAllowed=false, commandsExecuted=false, intentGoDeferred=true", () => {
  assert.equal(ctx.proof.gates.sourceWriteAllowed, false);
  assert.equal(ctx.proof.gates.commandsExecuted, false);
  assert.equal(ctx.proof.gates.intentGoDeferred, true);
});
test("24. the agent verification handoff lists commands as text and does not execute them", () => {
  assert.equal(ctx.agentVerification.executesCommands, false);
});
test("25. Rekon does not run Circe during bundle generation (no Circe-run record)", () => {
  // The bundle is a projection; the no-Circe-run boundary is expressed via the
  // Rekon producer + commandsExecuted=false + the absence of any Circe-run record.
  assert.ok(!ctx.projectionText.includes("ranCirce"));
  assert.ok(!ctx.projectionText.includes("runsCirce"));
  assert.ok(!ctx.projectionText.includes("circeExecuted"));
  assert.ok(!ctx.projectionText.includes("importedAt"));
});

// ---- Phase posture + proof traceability (26-27) ----
test("26. phase verification posture is explicit", () => {
  assert.ok(Array.isArray(ctx.proof.phaseGates) && ctx.proof.phaseGates.length > 0);
  for (const g of ctx.proof.phaseGates) {
    assert.equal(typeof g.verificationPosture, "string");
    assert.equal(typeof g.manualGate, "boolean");
    assert.equal(typeof g.needsReview, "boolean");
  }
  const pv = ctx.manifest.circe.phaseVerification;
  for (const k of ["executable", "manualReview", "finalVerification", "needsReview"]) {
    assert.equal(typeof pv[k], "number", `phaseVerification.${k} should be numeric`);
  }
});
test("27. accepted proof gaps are traceable in the proof sidecar", () => {
  assert.ok(ctx.proof.approval, "proof should carry approval state");
  assert.equal(ctx.proof.proof.runtimeDrift.accepted, true);
  assert.ok(ctx.proof.proof.runtimeDrift.ref, "runtime drift should reference its source report");
});

// ---- Immutability + no execution (28-29) ----
test("28. source files and plan file are byte-identical after the full path", () => {
  assert.equal(ctx.srcAfter, SRC);
  assert.equal(ctx.testAfter, TST);
  assert.equal(ctx.planAfter, PLAN_MD);
});
test("29. no verification was executed and artifacts validate clean", () => {
  assert.equal(ctx.verificationRunCount, 0);
  assert.equal(ctx.verificationResultCount, 0);
  assert.equal(ctx.validate.status, 0, ctx.validate.stderr);
});
