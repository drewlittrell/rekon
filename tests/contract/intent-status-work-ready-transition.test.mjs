// Contract: Intent Status Work-Ready Transition (slice 126).
//
// `rekon intent status transition` reads an approved PreparedIntentPlan plus a
// previous IntentStatusReport, rechecks freshness / runtime drift / status
// context, and writes exactly ONE new work-ready IntentStatusReport revision. It
// never mutates the previous IntentStatusReport or the approved plan, creates no
// WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes
// no commands, writes no source, runs no Circe, and does not implement intent:go.
// The work-ready revision ENABLES (does not create) the downstream handoffs.
//
// This suite mixes pure helper-gate assertions (via the built capability-model
// helper) with end-to-end CLI assertions on a real fresh-repo pipeline.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildWorkReadyIntentStatusReport,
  INTENT_STATUS_TRANSITION_TARGETS,
} from "../../packages/capability-model/dist/index.js";

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
const cats = (r) => (r?.blockers ?? []).map((b) => b.category);

// ---------------------------------------------------------------------------
// Pure helper fixtures (no filesystem)
// ---------------------------------------------------------------------------
const REF = (type, id) => ({ type, id, path: `.rekon/artifacts/actions/${type}-${id}.json`, digest: "d".repeat(64), schemaVersion: "0.1.0" });
const planRef = REF("PreparedIntentPlan", "p1");
const prevRef = REF("IntentStatusReport", "s1");

function makeHeader() {
  return {
    artifactType: "IntentStatusReport",
    artifactId: "intent-status-report-test",
    schemaVersion: "0.1.0",
    generatedAt: "2026-06-01T00:00:00.000Z",
    subject: { repoId: "/tmp/x" },
    producer: { id: "test", version: "0.0.0" },
    inputRefs: [planRef, prevRef],
    freshness: { status: "fresh" },
    provenance: { confidence: 0.7 },
  };
}
function makePlan(overrides = {}) {
  return {
    header: { artifactId: "prepared-intent-plan-p1" },
    request: { goal: "Add a marker export to src/index.ts.", kind: "feature" },
    status: { value: "prepared", recommendedNextAction: "create-work-order" },
    approval: {
      status: "approved",
      reasons: ["verification-proof-missing", "runtime-drift-unresolved", "explicit-operator-approval", "manual-risk-acceptance"],
      acceptedRisks: [{ id: "accepted:verification-proof-missing", category: "verification-proof-missing", message: "m", acceptedAt: "2026-06-01T00:00:00.000Z", reason: "r", sourceRefs: [] }],
      proof: { downstreamHandoff: { workOrderAllowed: true, verificationPlanAllowed: true, sourceWriteAllowed: false } },
    },
    phases: [{ id: "phase-1", title: "P1", status: "prepared" }],
    obligations: [{}, {}],
    verificationRequirements: [{}],
    ...overrides,
  };
}
function makePrev(overrides = {}) {
  return {
    request: { goal: "Add a marker export to src/index.ts.", kind: "feature" },
    status: { value: "needs-review", recommendedNextAction: "create-work-order" },
    source: { intentAssessmentReportRef: REF("IntentAssessmentReport", "a1") },
    blockers: [],
    ...overrides,
  };
}
function build(overrides = {}) {
  return buildWorkReadyIntentStatusReport({
    header: makeHeader(),
    approvedPreparedIntentPlan: makePlan(),
    approvedPreparedIntentPlanRef: planRef,
    previousIntentStatusReport: makePrev(),
    previousIntentStatusReportRef: prevRef,
    reason: "ship it",
    ...overrides,
  });
}

const happy = build();

// ---- Helper: happy path ----
test("1. happy path returns status work-ready", () => assert.equal(happy.status, "work-ready"));
test("2. work-ready report status.value is work-ready", () => assert.equal(happy.intentStatusReport.status.value, "work-ready"));
test("3. work-ready recommendedNextAction is create-work-order", () =>
  assert.equal(happy.intentStatusReport.status.recommendedNextAction, "create-work-order"));
test("4. source carries approvedPreparedIntentPlanRef", () =>
  assert.equal(happy.intentStatusReport.source.approvedPreparedIntentPlanRef.id, "p1"));
test("5. source carries previousIntentStatusReportRef", () =>
  assert.equal(happy.intentStatusReport.source.previousIntentStatusReportRef.id, "s1"));
test("6. proof.preparation carries acceptedRisks from the approved plan", () => {
  assert.ok(Array.isArray(happy.intentStatusReport.proof.preparation.acceptedRisks));
  assert.equal(happy.intentStatusReport.proof.preparation.acceptedRisks.length, 1);
  assert.equal(happy.intentStatusReport.proof.preparation.approvalStatus, "approved");
});
test("7. work-ready report has no blockers or warnings", () => {
  assert.equal(happy.blockers.length, 0);
  assert.equal(happy.intentStatusReport.blockers.length, 0);
  assert.equal(happy.intentStatusReport.warnings.length, 0);
});
test("8. INTENT_STATUS_TRANSITION_TARGETS is exactly [work-ready]", () =>
  assert.deepEqual([...INTENT_STATUS_TRANSITION_TARGETS], ["work-ready"]));

// ---- Helper: gate blocks ----
test("9. missing approved plan blocks (missing-approved-plan)", () =>
  assert.ok(cats(build({ approvedPreparedIntentPlan: undefined })).includes("missing-approved-plan")));
test("10. missing plan ref blocks (missing-approved-plan-ref)", () =>
  assert.ok(cats(build({ approvedPreparedIntentPlanRef: undefined })).includes("missing-approved-plan-ref")));
test("11. plan not approved blocks (plan-not-approved)", () =>
  assert.ok(cats(build({ approvedPreparedIntentPlan: makePlan({ approval: { ...makePlan().approval, status: "needs-review" } }) })).includes("plan-not-approved")));
test("12. plan not prepared blocks (plan-not-prepared)", () =>
  assert.ok(cats(build({ approvedPreparedIntentPlan: makePlan({ status: { value: "needs-review" } }) })).includes("plan-not-prepared")));
test("13. accepted gaps without acceptedRisks blocks (missing-accepted-risks)", () =>
  assert.ok(cats(build({ approvedPreparedIntentPlan: makePlan({ approval: { ...makePlan().approval, acceptedRisks: [] } }) })).includes("missing-accepted-risks")));
test("14. workOrderAllowed false blocks (handoff-not-allowed)", () =>
  assert.ok(cats(build({ approvedPreparedIntentPlan: makePlan({ approval: { ...makePlan().approval, proof: { downstreamHandoff: { workOrderAllowed: false, verificationPlanAllowed: true, sourceWriteAllowed: false } } } }) })).includes("handoff-not-allowed")));
test("15. verificationPlanAllowed false blocks (handoff-not-allowed)", () =>
  assert.ok(cats(build({ approvedPreparedIntentPlan: makePlan({ approval: { ...makePlan().approval, proof: { downstreamHandoff: { workOrderAllowed: true, verificationPlanAllowed: false, sourceWriteAllowed: false } } } }) })).includes("handoff-not-allowed")));
test("16. sourceWriteAllowed true blocks (source-write-boundary)", () =>
  assert.ok(cats(build({ approvedPreparedIntentPlan: makePlan({ approval: { ...makePlan().approval, proof: { downstreamHandoff: { workOrderAllowed: true, verificationPlanAllowed: true, sourceWriteAllowed: true } } } }) })).includes("source-write-boundary")));
test("17. missing previous status blocks (missing-previous-status)", () =>
  assert.ok(cats(build({ previousIntentStatusReport: undefined })).includes("missing-previous-status")));
test("18. missing previous status ref blocks (missing-previous-status-ref)", () =>
  assert.ok(cats(build({ previousIntentStatusReportRef: undefined })).includes("missing-previous-status-ref")));
test("19. goal mismatch blocks (previous-status-not-traceable)", () =>
  assert.ok(cats(build({ previousIntentStatusReport: makePrev({ request: { goal: "A totally different goal" } }) })).includes("previous-status-not-traceable")));
test("20. uncovered high-severity previous blocker blocks (previous-status-high-blocker)", () =>
  assert.ok(cats(build({ previousIntentStatusReport: makePrev({ blockers: [{ id: "x", category: "verification-missing", severity: "high", message: "m" }] }) })).includes("previous-status-high-blocker")));
test("21. an approval-covered high blocker does NOT block the transition", () => {
  const r = build({ previousIntentStatusReport: makePrev({ blockers: [{ id: "x", category: "preparation-not-approved", severity: "high", message: "m" }] }) });
  assert.equal(r.status, "work-ready");
});
test("22. stale freshness blocks (freshness-stale)", () =>
  assert.ok(cats(build({ pathFreshnessReport: { status: "stale" }, pathFreshnessReportRef: REF("PathFreshnessReport", "f1") })).includes("freshness-stale")));
test("23. new high runtime drift blocks (new-high-runtime-drift)", () =>
  assert.ok(cats(build({ runtimeGraphDriftReport: { rows: [{ severity: "high", status: "added" }] }, runtimeGraphDriftReportRef: REF("RuntimeGraphDriftReport", "d1") })).includes("new-high-runtime-drift")));
test("24. empty reason blocks (missing-transition-reason)", () =>
  assert.ok(cats(build({ reason: "   " })).includes("missing-transition-reason")));
test("25. a blocked result returns no intentStatusReport", () => {
  const r = build({ reason: "" });
  assert.equal(r.status, "blocked");
  assert.equal(r.intentStatusReport, undefined);
});

// ---------------------------------------------------------------------------
// End-to-end CLI pipeline (fresh repo)
// ---------------------------------------------------------------------------
const dir = mkdtempSync(join(tmpdir(), "rekon-status-transition-"));
mkdirSync(join(dir, "src"), { recursive: true });
mkdirSync(join(dir, "plans"), { recursive: true });
writeFileSync(
  join(dir, "package.json"),
  JSON.stringify({ name: "fresh-rekon-transition", version: "0.0.0", type: "module", scripts: { typecheck: "tsc --noEmit", test: "node --test", build: "echo build" }, devDependencies: { typescript: "^5.0.0" } }, null, 2),
);
const SRC = 'export const existing = "ok";\n';
writeFileSync(join(dir, "src", "index.ts"), SRC);
writeFileSync(join(dir, "plans", "add.md"), "# Add marker export\n\nAdd a marker export to src/index.ts.\n");

runCli(["scan", "--root", dir, "--json"]);
runCli(["intent", "context", "prepare", "--root", dir, "--json"]);
runCli(["intent", "assess", "--root", dir, "--goal", "Add a marker export to src/index.ts.", "--kind", "feature", "--path", "src/index.ts", "--json"]);
const assessmentRef = runCli(["artifacts", "latest", "--root", dir, "--type", "IntentAssessmentReport", "--id-only"]).stdout.trim();
runCli(["intent", "prepare", "--root", dir, "--assessment", assessmentRef, "--json"]);
const draftRef = runCli(["artifacts", "latest", "--root", dir, "--type", "PreparedIntentPlan", "--id-only"]).stdout.trim();
runCli(["intent", "status", "--root", dir, "--json"]);
const statusRef = runCli(["artifacts", "latest", "--root", dir, "--type", "IntentStatusReport", "--id-only"]).stdout.trim();
const prevStatusFile = listArtifactFiles(dir, "IntentStatusReport")[0];
const prevStatusShaBefore = sha256(prevStatusFile);
runCli([
  "intent", "approve", "--root", dir,
  "--prepared-plan", draftRef, "--intent-status", statusRef,
  "--accept", "verification-proof-missing", "--accept", "runtime-drift-unresolved",
  "--reason", "Operator accepts gaps for the v1 marker change", "--accepted-by", "drew", "--json",
]);
const approvedRef = runCli(["artifacts", "latest", "--root", dir, "--type", "PreparedIntentPlan", "--id-only"]).stdout.trim();
const approvedFile = listArtifactFiles(dir, "PreparedIntentPlan").find((f) => f.includes(approvedRef.split(":")[1]));
const approvedShaBefore = sha256(approvedFile);

// ---- Blocked transition: no --previous-status ----
const statusCountBefore = listArtifactFiles(dir, "IntentStatusReport").length;
const blocked = runCli(["intent", "status", "transition", "--root", dir, "--prepared-plan", approvedRef, "--to", "work-ready", "--reason", "ship it", "--json"]);
const blockedJson = parse(blocked.stdout);
const statusCountAfterBlocked = listArtifactFiles(dir, "IntentStatusReport").length;

// ---- Bad target ----
const badTarget = runCli(["intent", "status", "transition", "--root", dir, "--prepared-plan", approvedRef, "--previous-status", statusRef, "--to", "prepared", "--reason", "x", "--json"]);

// ---- Work-ready transition: with --previous-status ----
const ready = runCli(["intent", "status", "transition", "--root", dir, "--prepared-plan", approvedRef, "--previous-status", statusRef, "--to", "work-ready", "--reason", "ship it", "--json"]);
const readyJson = parse(ready.stdout);
const statusFilesAfter = listArtifactFiles(dir, "IntentStatusReport");
const newReportFile = statusFilesAfter.find((f) => f.includes(readyJson?.artifact?.id ?? "____none____"));
const newReport = newReportFile ? readJson(newReportFile) : null;
const validate = runCli(["artifacts", "validate", "--root", dir, "--json"]);
const validateJson = parse(validate.stdout);
const prevStatusShaAfter = sha256(prevStatusFile);
const approvedShaAfter = sha256(approvedFile);

test("26. pipeline through approve yields an approved plan", () => assert.ok(approvedRef.startsWith("PreparedIntentPlan:")));
test("27. transition without --previous-status exits non-zero", () => assert.notEqual(blocked.status, 0));
test("28. transition without --previous-status reports status blocked", () => assert.equal(blockedJson.status, "blocked"));
test("29. transition without --previous-status blocks on missing-previous-status", () =>
  assert.ok(cats(blockedJson).includes("missing-previous-status")));
test("30. blocked transition writes no new IntentStatusReport", () =>
  assert.equal(statusCountAfterBlocked, statusCountBefore));
test("31. --to anything but work-ready exits non-zero", () => assert.notEqual(badTarget.status, 0));
test("32. work-ready transition exits 0 with status work-ready", () => {
  assert.equal(ready.status, 0);
  assert.equal(readyJson.status, "work-ready");
});
test("33. work-ready transition writes exactly one new IntentStatusReport", () =>
  assert.equal(statusFilesAfter.length, statusCountBefore + 1));
test("34. work-ready JSON reports all boundaries false", () => {
  const b = readyJson.boundaries;
  assert.equal(b.createdWorkOrder, false);
  assert.equal(b.createdVerificationPlan, false);
  assert.equal(b.createdVerificationRun, false);
  assert.equal(b.createdVerificationResult, false);
  assert.equal(b.executedCommands, false);
  assert.equal(b.wroteSourceFiles, false);
  assert.equal(b.ranCirce, false);
  assert.equal(b.implementedIntentGo, false);
});
test("35. the new report validates, is work-ready, and leaves prev/plan/source/handoffs untouched", () => {
  assert.equal(newReport.status.value, "work-ready");
  assert.equal(validate.status, 0);
  assert.ok(validateJson.valid === true || validateJson.ok === true);
  // previous IntentStatusReport + approved plan are byte-identical (not mutated)
  assert.equal(prevStatusShaAfter, prevStatusShaBefore);
  assert.equal(approvedShaAfter, approvedShaBefore);
  // the transition itself created no WorkOrder / VerificationPlan and wrote no source
  assert.equal(listArtifactFiles(dir, "WorkOrder").length, 0);
  assert.equal(listArtifactFiles(dir, "VerificationPlan").length, 0);
  assert.equal(readFileSync(join(dir, "src", "index.ts"), "utf8"), SRC);
});
