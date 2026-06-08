// Docs test for the Intent Bundle Handoff Reading Order Implementation (slice 193).
// Locks the reading-order and boundary language in the implementation memo, the CHANGELOG
// entry, and the review packet.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const MEMO = resolve(repoRoot, "docs/strategy/intent-bundle-handoff-reading-order-implementation.md");
const PACKET = resolve(repoRoot, ".rekon-dev/review-packets/intent-bundle-handoff-reading-order-v1.md");
const CHANGELOG = resolve(repoRoot, "CHANGELOG.md");

const norm = (text) => text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");
const memo = norm(readFileSync(MEMO, "utf8"));
const changelog = norm(readFileSync(CHANGELOG, "utf8"));
const has = (text, needle) => assert.ok(text.includes(needle), `missing: ${needle}`);

// 1
test("implementation doc exists", () => { assert.ok(existsSync(MEMO)); });
// 2
test("docs say humans should inspect README.md first, then context/task-context.md when present", () => {
  has(memo, "humans should inspect readme.md first, then context/task-context.md when present");
});
// 3
test("docs say agents should inspect agent/instructions.md first, then handoff, then context, then task-context.agent.json when present", () => {
  has(memo, "agents should inspect agent/instructions.md first, then agent/handoff.md, then agent/context.json, and then context/task-context.agent.json when present");
});
// 4
test("docs say TaskContextReport sidecars are optional context, not proof", () => {
  has(memo, "taskcontextreport sidecars are optional context, not proof.");
});
// 5
test("docs say WorkOrder and VerificationPlan remain the authoritative work and verification gates", () => {
  has(memo, "workorder and verificationplan remain the authoritative work and verification gates.");
});
// 6
test("docs say agent/verification.json remains authoritative for verification posture", () => {
  has(memo, "agent/verification.json remains authoritative for verification posture.");
});
// 7
test("docs say agent/source-refs.json remains authoritative for source refs", () => {
  has(memo, "agent/source-refs.json remains authoritative for source refs.");
});
// 8
test("docs say phase source-change posture belongs to the authoritative source / verification layer, not the task-context layer", () => {
  has(memo, "phase source-change posture belongs to the authoritative source / verification layer, not the task-context layer.");
});
// 9
test("docs say source-change posture is handoff evidence, not approval", () => {
  has(memo, "source-change posture is handoff evidence, not approval.");
});
// 10
test("docs say TaskContextReport sidecars must not override sourceChange posture", () => {
  has(memo, "taskcontextreport sidecars must not override sourcechange posture.");
});
// 11
test("docs say Circe handoff JSON remains the machine handoff contract", () => {
  has(memo, "circe handoff json remains the machine handoff contract.");
});
// 12
test("docs say actor contracts are role/return-shape guidance, not executed workers", () => {
  has(memo, "actor contracts are role/return-shape guidance, not executed workers.");
});
// 13
test("docs say the Operator Command Boundary is operator-only inspection guidance, not worker execution guidance", () => {
  has(memo, "the operator command boundary is operator-only inspection guidance, not worker execution guidance.");
});
// 14
test("docs say worker requests to run operator-only Circe commands are plan-quality concerns", () => {
  has(memo, "worker requests to run operator-only circe commands are plan-quality concerns.");
});
// 15
test("docs say TaskContextReport sidecars must not approve plans", () => {
  has(memo, "taskcontextreport sidecars must not approve plans.");
});
// 16
test("docs say TaskContextReport sidecars must not execute commands", () => {
  has(memo, "taskcontextreport sidecars must not execute commands.");
});
// 17
test("docs say TaskContextReport sidecars must not write source files", () => {
  has(memo, "taskcontextreport sidecars must not write source files.");
});
// 18
test("docs say verification hints remain hints, not executed commands", () => {
  has(memo, "verification hints remain hints, not executed commands.");
});
// 19
test("docs say do-not-touch zones remain guidance/context, not enforcement", () => {
  has(memo, "do-not-touch zones remain guidance/context, not enforcement.");
});
// 20
test("docs say intent:go remains deferred", () => {
  has(memo, "intent:go remains deferred.");
});
// 21
test("CHANGELOG mentions Intent Bundle Handoff Reading Order Implementation", () => {
  has(changelog, "intent bundle handoff reading order implementation");
});
// 22
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(PACKET));
  assert.ok(readFileSync(PACKET, "utf8").includes("PURPOSE PRESERVATION CHECK"));
});
