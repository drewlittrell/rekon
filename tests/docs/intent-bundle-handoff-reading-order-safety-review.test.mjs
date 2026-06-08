// Docs test for the Intent Bundle Handoff Reading Order Safety Review (slice 194).
// Locks the review's headings, required statements, tables, CHANGELOG entry, and packet.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const MEMO = resolve(repoRoot, "docs/strategy/intent-bundle-handoff-reading-order-safety-review.md");
const PACKET = resolve(repoRoot, ".rekon-dev/review-packets/intent-bundle-handoff-reading-order-safety-review.md");
const CHANGELOG = resolve(repoRoot, "CHANGELOG.md");

const norm = (text) => text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");
const memo = norm(readFileSync(existsSync(MEMO) ? MEMO : CHANGELOG, "utf8"));
const changelog = norm(readFileSync(CHANGELOG, "utf8"));
const has = (text, needle) => assert.ok(text.includes(needle), `missing: ${needle}`);

const HEADINGS = [
  "## decision summary",
  "## why this review exists",
  "## implementation reviewed",
  "## readme reading order review",
  "## agent instructions review",
  "## agent handoff review",
  "## agent context metadata review",
  "## authority layer review",
  "## circe and actor contract review",
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
test("humans inspect README first", () => { has(memo, "humans should inspect readme.md first, then context/task-context.md when present."); });
// 5
test("agents inspect instructions first", () => { has(memo, "agents should inspect agent/instructions.md first, then agent/handoff.md, then agent/context.json, and then context/task-context.agent.json when present."); });
// 6
test("sidecars optional context not proof", () => { has(memo, "taskcontextreport sidecars are optional context, not proof."); });
// 7
test("WorkOrder/VerificationPlan authoritative gates", () => { has(memo, "workorder and verificationplan remain the authoritative work and verification gates."); });
// 8
test("agent/verification.json authoritative", () => { has(memo, "agent/verification.json remains authoritative for verification posture."); });
// 9
test("agent/source-refs.json authoritative", () => { has(memo, "agent/source-refs.json remains authoritative for source refs."); });
// 10
test("source-change posture belongs to authority layer", () => { has(memo, "phase source-change posture belongs to the authoritative source / verification layer, not the task-context layer."); });
// 11
test("source-change posture evidence not approval", () => { has(memo, "source-change posture is handoff evidence, not approval."); });
// 12
test("sidecars must not override sourceChange", () => { has(memo, "taskcontextreport sidecars must not override sourcechange posture."); });
// 13
test("Circe handoff JSON machine contract", () => { has(memo, "circe handoff json remains the machine handoff contract."); });
// 14
test("actor contracts guidance not executed workers", () => { has(memo, "actor contracts are role/return-shape guidance, not executed workers."); });
// 15
test("operator command boundary operator-only", () => { has(memo, "the operator command boundary is operator-only inspection guidance, not worker execution guidance."); });
// 16
test("worker requests to run operator commands are plan-quality", () => { has(memo, "worker requests to run operator-only circe commands are plan-quality concerns."); });
// 17
test("sidecars must not approve plans", () => { has(memo, "taskcontextreport sidecars must not approve plans."); });
// 18
test("sidecars must not execute commands", () => { has(memo, "taskcontextreport sidecars must not execute commands."); });
// 19
test("sidecars must not write source files", () => { has(memo, "taskcontextreport sidecars must not write source files."); });
// 20
test("verification hints remain hints", () => { has(memo, "verification hints remain hints, not executed commands."); });
// 21
test("do-not-touch zones guidance not enforcement", () => { has(memo, "do-not-touch zones remain guidance/context, not enforcement."); });
// 22
test("handoffReadingOrder additive preserves fields", () => { has(memo, "handoffreadingorder metadata is additive and preserves existing agent/context.json fields."); });
// 23
test("intent:go remains deferred", () => { has(memo, "intent:go remains deferred."); });
// 24
test("surface table", () => { has(memo, "| surface | status | safety finding |"); });
// 25
test("authority table", () => { has(memo, "| surface | authority |"); });
// 26
test("boundary table", () => { has(memo, "| boundary | review finding |"); });
// 27
test("option table", () => { has(memo, "| option | decision | reason |"); });
// 28
test("CHANGELOG mentions safety review", () => { has(changelog, "intent bundle handoff reading order safety review"); });
// 29
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(PACKET));
  assert.ok(readFileSync(PACKET, "utf8").includes("PURPOSE PRESERVATION CHECK"));
});
