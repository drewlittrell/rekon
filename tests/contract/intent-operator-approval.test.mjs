// Contract: Intent Operator Approval / Proof Acceptance (slice 123).
//
// `rekon intent approve` reads a needs-review PreparedIntentPlan, verifies the
// operator explicitly accepted the plan's known proof gaps, rechecks freshness /
// runtime drift / status context, and writes exactly ONE new approved
// PreparedIntentPlan revision. It never mutates the source draft, creates no
// WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes
// no commands, and writes no source. Approval ENABLES (does not create) the
// downstream WorkOrder / VerificationPlan handoffs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(new URL("../../packages/cli/dist/index.js", import.meta.url));

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], { encoding: "utf8" });
}

function artifactsDir(dir) {
  return join(dir, ".rekon", "artifacts");
}

function listArtifactFiles(dir, type) {
  const root = artifactsDir(dir);
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.startsWith(`${type}-`) && name.endsWith(".json")) out.push(full);
    }
  };
  if (existsSync(root)) walk(root);
  out.sort();
  return out;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function parse(out) {
  try {
    return JSON.parse(out);
  } catch {
    return null;
  }
}

// ---- Fresh-repo pipeline (run once) ----
const dir = mkdtempSync(join(tmpdir(), "rekon-operator-approval-"));
mkdirSync(join(dir, "src"), { recursive: true });
mkdirSync(join(dir, "plans"), { recursive: true });
writeFileSync(
  join(dir, "package.json"),
  JSON.stringify(
    {
      name: "fresh-rekon-approve",
      version: "0.0.0",
      type: "module",
      scripts: { typecheck: "tsc --noEmit", test: "node --test", build: "echo build" },
      devDependencies: { typescript: "^5.0.0" },
    },
    null,
    2,
  ),
);
const SRC = 'export const existing = "ok";\n';
writeFileSync(join(dir, "src", "index.ts"), SRC);
writeFileSync(join(dir, "plans", "add.md"), "# Add marker export\n\nAdd a marker export to src/index.ts.\n");

const scan = runCli(["scan", "--root", dir, "--json"]);
const ctx = runCli(["intent", "context", "prepare", "--root", dir, "--json"]);
const assess = runCli(["intent", "assess", "--root", dir, "--goal", "Add a marker export to src/index.ts.", "--kind", "feature", "--path", "src/index.ts", "--json"]);
const assessmentRef = runCli(["artifacts", "latest", "--root", dir, "--type", "IntentAssessmentReport", "--id-only"]).stdout.trim();
const prepare = runCli(["intent", "prepare", "--root", dir, "--assessment", assessmentRef, "--json"]);
const prepareJson = parse(prepare.stdout);
const draftRef = runCli(["artifacts", "latest", "--root", dir, "--type", "PreparedIntentPlan", "--id-only"]).stdout.trim();
const draftFile = listArtifactFiles(dir, "PreparedIntentPlan")[0];
const draftShaBefore = sha256(draftFile);
const status = runCli(["intent", "status", "--root", dir, "--json"]);
const statusRef = runCli(["artifacts", "latest", "--root", dir, "--type", "IntentStatusReport", "--id-only"]).stdout.trim();

// ---- Blocked approvals (no new plan must be written) ----
const planCountBeforeApprove = listArtifactFiles(dir, "PreparedIntentPlan").length;

// (a) no --accept, no --reason
const blockedEmpty = runCli(["intent", "approve", "--root", dir, "--prepared-plan", draftRef, "--intent-status", statusRef, "--json"]);
const blockedEmptyJson = parse(blockedEmpty.stdout);

// (b) accept only one required gap (missing runtime-drift-unresolved)
const blockedPartial = runCli(["intent", "approve", "--root", dir, "--prepared-plan", draftRef, "--intent-status", statusRef, "--accept", "verification-proof-missing", "--reason", "partial", "--json"]);
const blockedPartialJson = parse(blockedPartial.stdout);

// (c) accept an unknown gap
const blockedUnknown = runCli(["intent", "approve", "--root", dir, "--prepared-plan", draftRef, "--intent-status", statusRef, "--accept", "verification-proof-missing", "--accept", "runtime-drift-unresolved", "--accept", "totally-made-up", "--reason", "x", "--json"]);
const blockedUnknownJson = parse(blockedUnknown.stdout);

// (d) accept both required gaps but omit --reason
const blockedNoReason = runCli(["intent", "approve", "--root", dir, "--prepared-plan", draftRef, "--intent-status", statusRef, "--accept", "verification-proof-missing", "--accept", "runtime-drift-unresolved", "--json"]);
const blockedNoReasonJson = parse(blockedNoReason.stdout);

const planCountAfterBlocked = listArtifactFiles(dir, "PreparedIntentPlan").length;
const draftShaAfterBlocked = sha256(draftFile);

// ---- Approved approval ----
const approved = runCli([
  "intent", "approve", "--root", dir,
  "--prepared-plan", draftRef,
  "--intent-status", statusRef,
  "--accept", "verification-proof-missing",
  "--accept", "runtime-drift-unresolved",
  "--reason", "Operator accepts missing proof and unresolved drift for the v1 marker change",
  "--accepted-by", "drew",
  "--json",
]);
const approvedJson = parse(approved.stdout);
const planFilesAfter = listArtifactFiles(dir, "PreparedIntentPlan");
const approvedFile = planFilesAfter.find((f) => !f.includes(draftFile.split("/").at(-1)));
const approvedPlan = approvedFile ? readJson(approvedFile) : null;
const draftAfterApproval = readJson(draftFile);
const draftShaAfterApproval = sha256(draftFile);

// ---- Downstream gates on the approved revision ----
const approvedRef = runCli(["artifacts", "latest", "--root", dir, "--type", "PreparedIntentPlan", "--id-only"]).stdout.trim();
const workOrder = runCli(["intent", "work-order", "generate", "--root", dir, "--prepared-plan", approvedRef, "--json"]);
const woJson = parse(workOrder.stdout);
const verificationPlan = runCli(["intent", "verification-plan", "generate", "--root", dir, "--prepared-plan", approvedRef, "--json"]);
const vpJson = parse(verificationPlan.stdout);
const validate = runCli(["artifacts", "validate", "--root", dir, "--json"]);
const validateJson = parse(validate.stdout);

const blockerIds = (j) => (j?.blockers ?? []).map((b) => b.id);
const blockerCats = (j) => (j?.blockers ?? []).map((b) => b.category);

// ---- Pipeline setup ----
test("1. fresh repo scan succeeds", () => assert.equal(scan.status, 0));
test("2. intent context prepare succeeds", () => assert.equal(ctx.status, 0));
test("3. intent assess has zero hard blockers", () => {
  assert.equal(assess.status, 0);
  assert.equal(parse(assess.stdout).blockers, 0);
});
test("4. intent prepare yields a needs-review draft", () => {
  assert.equal(prepare.status, 0);
  assert.equal(prepareJson.status.value, "needs-review");
  assert.equal(prepareJson.approval.status, "needs-review");
});
test("5. intent status succeeds", () => assert.equal(status.status, 0));

// ---- Blocked approval: missing required accepted gaps ----
test("6. approve with no accepted gaps is blocked (non-zero exit)", () => assert.notEqual(blockedEmpty.status, 0));
test("7. empty approve reports status blocked", () => assert.equal(blockedEmptyJson.status, "blocked"));
test("8. empty approve blocks on missing-required-accepted-gap", () =>
  assert.ok(blockerCats(blockedEmptyJson).includes("missing-required-accepted-gap")));
test("9. empty approve also blocks on missing-approval-reason", () =>
  assert.ok(blockerCats(blockedEmptyJson).includes("missing-approval-reason")));
test("10. partial-accept approve is blocked", () => assert.notEqual(blockedPartial.status, 0));
test("11. partial-accept blocks on the unmet runtime-drift-unresolved gap", () =>
  assert.ok(blockerIds(blockedPartialJson).includes("missing-required-accepted-gap:runtime-drift-unresolved")));
test("12. partial-accept records requiredGaps", () =>
  assert.deepEqual([...blockedPartialJson.requiredGaps].sort(), ["runtime-drift-unresolved", "verification-proof-missing"]));
test("13. partial-accept records acceptedGaps", () =>
  assert.deepEqual(blockedPartialJson.acceptedGaps, ["verification-proof-missing"]));

// ---- Blocked approval: unknown gap + missing reason ----
test("14. unknown accepted gap is blocked", () => assert.notEqual(blockedUnknown.status, 0));
test("15. unknown accepted gap blocks on unknown-accepted-gap", () =>
  assert.ok(blockerCats(blockedUnknownJson).includes("unknown-accepted-gap")));
test("16. accepting both gaps without --reason is blocked", () => assert.notEqual(blockedNoReason.status, 0));
test("17. missing --reason blocks on missing-approval-reason", () =>
  assert.ok(blockerCats(blockedNoReasonJson).includes("missing-approval-reason")));

// ---- Blocked approvals write no plan, mutate nothing ----
test("18. blocked approvals write no new PreparedIntentPlan", () =>
  assert.equal(planCountAfterBlocked, planCountBeforeApprove));
test("19. blocked approvals leave the source draft byte-identical", () =>
  assert.equal(draftShaAfterBlocked, draftShaBefore));

// ---- Approved approval ----
test("20. approve accepting both gaps succeeds (exit 0)", () => {
  assert.equal(approved.status, 0);
  assert.equal(approvedJson.status, "approved");
});
test("21. approval writes exactly one new PreparedIntentPlan", () =>
  assert.equal(planFilesAfter.length, planCountBeforeApprove + 1));
test("22. approved revision status.value is prepared", () =>
  assert.equal(approvedPlan.status.value, "prepared"));
test("23. approved revision recommendedNextAction is create-work-order", () =>
  assert.equal(approvedPlan.status.recommendedNextAction, "create-work-order"));
test("24. approved revision approval.status is approved", () =>
  assert.equal(approvedPlan.approval.status, "approved"));
test("25. approval.reasons include explicit-operator-approval", () =>
  assert.ok(approvedPlan.approval.reasons.includes("explicit-operator-approval")));
test("26. approval.reasons include manual-risk-acceptance", () =>
  assert.ok(approvedPlan.approval.reasons.includes("manual-risk-acceptance")));
test("27. approval.reasons preserve the source draft reasons", () =>
  assert.ok(approvedPlan.approval.reasons.includes("verification-proof-missing") &&
    approvedPlan.approval.reasons.includes("runtime-drift-unresolved")));
test("28. approval.acceptedRisks records both accepted gaps", () => {
  const ids = approvedPlan.approval.acceptedRisks.map((r) => r.id).sort();
  assert.deepEqual(ids, ["accepted:runtime-drift-unresolved", "accepted:verification-proof-missing"]);
});
test("29. each acceptedRisk carries category, acceptedAt, reason, sourceRefs", () => {
  for (const r of approvedPlan.approval.acceptedRisks) {
    assert.ok(["verification-proof-missing", "runtime-drift-unresolved"].includes(r.category));
    assert.ok(typeof r.acceptedAt === "string" && r.acceptedAt.length > 0);
    assert.ok(typeof r.reason === "string" && r.reason.length > 0);
    assert.ok(Array.isArray(r.sourceRefs) && r.sourceRefs.length > 0);
  }
});
test("30. acceptedRisks record acceptedBy when supplied", () =>
  assert.ok(approvedPlan.approval.acceptedRisks.every((r) => r.acceptedBy === "drew")));
test("31. downstream handoff is enabled on the approved revision", () => {
  const d = approvedPlan.approval.proof.downstreamHandoff;
  assert.equal(d.workOrderAllowed, true);
  assert.equal(d.verificationPlanAllowed, true);
  assert.equal(d.sourceWriteAllowed, false);
});
test("32. approved JSON reports acceptedRisks count and gaps", () => {
  assert.equal(approvedJson.acceptedRisks, 2);
  assert.deepEqual([...approvedJson.acceptedGaps].sort(), ["runtime-drift-unresolved", "verification-proof-missing"]);
});

// ---- Immutability + boundary ----
test("33. the source draft remains needs-review (not mutated in place)", () =>
  assert.equal(draftAfterApproval.approval.status, "needs-review"));
test("34. the source draft file is byte-identical after approval", () =>
  assert.equal(draftShaAfterApproval, draftShaBefore));
test("35. approval creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult", () => {
  assert.equal(listArtifactFiles(dir, "WorkOrder").length, 0);
  assert.equal(listArtifactFiles(dir, "VerificationPlan").length, 0);
  assert.equal(listArtifactFiles(dir, "VerificationRun").length, 0);
  assert.equal(listArtifactFiles(dir, "VerificationResult").length, 0);
});

// ---- Downstream gates no longer block on approval ----
test("36. after approval, downstream gates clear plan-not-approved and artifacts validate", () => {
  assert.ok(!blockerIds(woJson).includes("plan-not-approved"), "work-order plan-not-approved cleared");
  assert.ok(!blockerIds(vpJson).includes("plan-not-approved"), "verification-plan plan-not-approved cleared");
  assert.equal(validate.status, 0);
  assert.ok(validateJson.valid === true || validateJson.ok === true);
  assert.equal(readFileSync(join(dir, "src", "index.ts"), "utf8"), SRC);
});
