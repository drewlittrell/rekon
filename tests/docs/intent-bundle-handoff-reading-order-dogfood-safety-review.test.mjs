// Docs test for the Intent Bundle Handoff Reading Order Dogfood Safety Review (slice 196,
// rebased onto d975d3e). Locks the review's headings, required statements (incl. the safe
// executable verification-command projection), tables, CHANGELOG entry, and packet.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const MEMO = resolve(repoRoot, "docs/strategy/intent-bundle-handoff-reading-order-dogfood-safety-review.md");
const PACKET = resolve(repoRoot, ".rekon-dev/review-packets/intent-bundle-handoff-reading-order-dogfood-safety-review.md");
const CHANGELOG = resolve(repoRoot, "CHANGELOG.md");

const norm = (text) => text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");
const memo = norm(readFileSync(existsSync(MEMO) ? MEMO : CHANGELOG, "utf8"));
const changelog = norm(readFileSync(CHANGELOG, "utf8"));
const has = (text, needle) => assert.ok(text.includes(needle), `missing: ${needle}`);

const HEADINGS = [
  "## decision summary",
  "## why this review exists",
  "## dogfood reviewed",
  "## human reading order review",
  "## agent reading order review",
  "## agent context metadata review",
  "## source-change posture review",
  "## verification command projection review",
  "## actor contract review",
  "## without-context review",
  "## boundary review",
  "## options considered",
  "## recommendation",
  "## what this does not do",
  "## follow-up work",
];

// 1
test("safety review doc exists", () => { assert.ok(existsSync(MEMO)); });
// 2
test("doc contains all required headings", () => { for (const h of HEADINGS) has(memo, h); });
// 3
test("guidance not automation", () => { has(memo, "intent bundle handoff reading order is guidance, not automation."); });
// 4
test("full dogfood path completed", () => { has(memo, "the full reading-order dogfood path completed successfully."); });
// 5
test("README exposed useful reading order", () => { has(memo, "readme.md exposed a useful handoff reading order."); });
// 6
test("human reading order practical", () => { has(memo, "the human reading order was practical."); });
// 7
test("README points to task-context.md only as optional", () => { has(memo, "readme.md pointed to context/task-context.md only as optional context."); });
// 8
test("agent/instructions useful reading order", () => { has(memo, "agent/instructions.md exposed a useful reading order."); });
// 9
test("agent/handoff useful reading order", () => { has(memo, "agent/handoff.md exposed a useful reading order."); });
// 10
test("handoffReadingOrder helped agents", () => { has(memo, "agent/context.json.handoffreadingorder helped agents consume the bundle."); });
// 11
test("handoffReadingOrder preserved fields", () => { has(memo, "handoffreadingorder preserved existing agent/context.json fields."); });
// 12
test("handoffReadingOrder distinguished context from authority", () => { has(memo, "handoffreadingorder distinguished context from authority."); });
// 13
test("source-change posture in authority layer", () => { has(memo, "source-change posture remained in the authority layer."); });
// 14
test("TaskContextReport optional context", () => { has(memo, "taskcontextreport remained optional context."); });
// 15
test("WorkOrder/VerificationPlan authoritative", () => { has(memo, "workorder / verificationplan remained authoritative."); });
// 16
test("agent/verification.json authoritative", () => { has(memo, "agent/verification.json remained authoritative."); });
// 17
test("agent/source-refs.json authoritative", () => { has(memo, "agent/source-refs.json remained authoritative."); });
// 18
test("safe executable projection is handoff data not execution", () => { has(memo, "safe executable verification-command projection is handoff data, not execution."); });
// 19
test("isSafeExecutableVerificationCommand bounded safe subset", () => { has(memo, "issafeexecutableverificationcommand preserves only a bounded safe subset for circe-facing verification command projection."); });
// 20
test("shell-metacharacter command strings rejected", () => { has(memo, "shell-metacharacter command strings are rejected from the executable verification-command projection."); });
// 21
test("circe/phase-plan.json describes but not executes", () => { has(memo, "circe/phase-plan.json may describe verification commands, but rekon does not execute them."); });
// 22
test("circe/rekon-proof.json keeps commandsExecuted:false", () => { has(memo, "circe/rekon-proof.json keeps commandsexecuted:false."); });
// 23
test("actor contracts role/return guidance", () => { has(memo, "actor contracts remained role/return guidance."); });
// 24
test("Operator Command Boundary operator-only", () => { has(memo, "the operator command boundary remained operator-only."); });
// 25
test("without-context bundle clean and accurate", () => { has(memo, "the without-context bundle remained clean and accurate."); });
// 26
test("source and plan unchanged", () => { has(memo, "source and plan files were unchanged."); });
// 27
test("no commands executed", () => { has(memo, "no commands were executed."); });
// 28
test("no VerificationRun or VerificationResult", () => { has(memo, "no verificationrun or verificationresult was created."); });
// 29
test("Rekon did not run Circe", () => { has(memo, "rekon did not run circe."); });
// 30
test("intent:go remains deferred", () => { has(memo, "intent:go remains deferred."); });
// 31
test("surface table", () => { has(memo, "| surface | dogfood finding | safety finding |"); });
// 32
test("authority table", () => { has(memo, "| surface | review finding |"); });
// 33
test("boundary table", () => { has(memo, "| boundary | review finding |"); });
// 34
test("finding table", () => { has(memo, "| finding | severity | resolution |"); });
// 35
test("option table", () => { has(memo, "| option | decision | reason |"); });
// 36
test("CHANGELOG mentions dogfood safety review", () => { has(changelog, "intent bundle handoff reading order dogfood safety review"); });
// 37
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(PACKET));
  assert.ok(readFileSync(PACKET, "utf8").includes("PURPOSE PRESERVATION CHECK"));
});
