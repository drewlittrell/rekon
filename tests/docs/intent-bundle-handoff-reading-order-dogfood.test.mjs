// Docs test for the Intent Bundle Handoff Reading Order Dogfood (slice 195).
// Locks the dogfood memo's findings, the CHANGELOG entry, and the review packet.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const MEMO = resolve(repoRoot, "docs/strategy/intent-bundle-handoff-reading-order-dogfood.md");
const PACKET = resolve(repoRoot, ".rekon-dev/review-packets/intent-bundle-handoff-reading-order-dogfood.md");
const CHANGELOG = resolve(repoRoot, "CHANGELOG.md");

const norm = (text) => text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");
const memo = norm(readFileSync(existsSync(MEMO) ? MEMO : CHANGELOG, "utf8"));
const changelog = norm(readFileSync(CHANGELOG, "utf8"));
const has = (text, needle) => assert.ok(text.includes(needle), `missing: ${needle}`);

// 1
test("dogfood review doc exists", () => { assert.ok(existsSync(MEMO)); });
// 2
test("README exposed a useful handoff reading order", () => { has(memo, "readme.md exposed a useful handoff reading order."); });
// 3
test("human reading order was practical", () => { has(memo, "the human reading order was practical."); });
// 4
test("README pointed to context/task-context.md only as optional context", () => { has(memo, "readme.md pointed to context/task-context.md only as optional context."); });
// 5
test("agent/instructions.md exposed a useful reading order", () => { has(memo, "agent/instructions.md exposed a useful reading order."); });
// 6
test("agent/handoff.md exposed a useful reading order", () => { has(memo, "agent/handoff.md exposed a useful reading order."); });
// 7
test("handoffReadingOrder helped agents consume the bundle", () => { has(memo, "agent/context.json.handoffreadingorder helped agents consume the bundle."); });
// 8
test("handoffReadingOrder preserved existing fields", () => { has(memo, "handoffreadingorder preserved existing agent/context.json fields."); });
// 9
test("handoffReadingOrder distinguished context from authority", () => { has(memo, "handoffreadingorder distinguished context from authority."); });
// 10
test("source-change posture remained in the authority layer", () => { has(memo, "source-change posture remained in the authority layer."); });
// 11
test("TaskContextReport remained optional context", () => { has(memo, "taskcontextreport remained optional context."); });
// 12
test("WorkOrder / VerificationPlan remained authoritative", () => { has(memo, "workorder / verificationplan remained authoritative."); });
// 13
test("agent/verification.json remained authoritative", () => { has(memo, "agent/verification.json remained authoritative."); });
// 14
test("agent/source-refs.json remained authoritative", () => { has(memo, "agent/source-refs.json remained authoritative."); });
// 15
test("actor contracts remained role/return guidance", () => { has(memo, "actor contracts remained role/return guidance."); });
// 16
test("Operator Command Boundary remained operator-only", () => { has(memo, "the operator command boundary remained operator-only."); });
// 17
test("without-context bundle remained clean and accurate", () => { has(memo, "the without-context bundle remained clean and accurate."); });
// 18
test("source and plan files were unchanged", () => { has(memo, "source and plan files were unchanged."); });
// 19
test("no commands were executed", () => { has(memo, "no commands were executed."); });
// 20
test("no VerificationRun or VerificationResult was created", () => { has(memo, "no verificationrun or verificationresult was created."); });
// 21
test("Rekon did not run Circe", () => { has(memo, "rekon did not run circe."); });
// 22
test("intent:go remains deferred", () => { has(memo, "intent:go remains deferred."); });
// 23
test("CHANGELOG mentions Intent Bundle Handoff Reading Order Dogfood", () => { has(changelog, "intent bundle handoff reading order dogfood"); });
// 24
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(PACKET));
  assert.ok(readFileSync(PACKET, "utf8").includes("PURPOSE PRESERVATION CHECK"));
});
