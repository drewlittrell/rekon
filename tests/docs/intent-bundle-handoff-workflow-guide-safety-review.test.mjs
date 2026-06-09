// Docs test for the Intent Bundle Handoff Workflow Guide Safety Review (slice 199).
// Locks the review's headings, boundary statements, 4 tables, CHANGELOG entry, and packet.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const MEMO = resolve(repoRoot, "docs/strategy/intent-bundle-handoff-workflow-guide-safety-review.md");
const PACKET = resolve(repoRoot, ".rekon-dev/review-packets/intent-bundle-handoff-workflow-guide-safety-review.md");
const CHANGELOG = resolve(repoRoot, "CHANGELOG.md");

const norm = (text) => text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");
const memo = norm(readFileSync(existsSync(MEMO) ? MEMO : CHANGELOG, "utf8"));
const changelog = norm(readFileSync(CHANGELOG, "utf8"));
const has = (text, needle) => assert.ok(text.includes(needle), `missing: ${needle}`);

const HEADINGS = [
  "## decision summary",
  "## why this review exists",
  "## documentation reviewed",
  "## human workflow review",
  "## agent workflow review",
  "## authority model review",
  "## safe verification command projection review",
  "## actor contract and operator command boundary review",
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
test("recommend not require as proof", () => { has(memo, "broader workflows should recommend the handoff reading order, not require it as proof."); });
// 5
test("humans inspect README first", () => { has(memo, "humans should inspect readme.md first, then context/task-context.md when present."); });
// 6
test("agents inspect instructions first", () => { has(memo, "agents should inspect agent/instructions.md first, then agent/handoff.md, then agent/context.json, and then context/task-context.agent.json when present."); });
// 7
test("sidecars optional context not proof", () => { has(memo, "taskcontextreport sidecars are optional context, not proof."); });
// 8
test("WorkOrder/VerificationPlan authoritative gates", () => { has(memo, "workorder and verificationplan remain the authoritative work and verification gates."); });
// 9
test("agent/verification.json authoritative", () => { has(memo, "agent/verification.json remains authoritative for verification posture."); });
// 10
test("agent/source-refs.json authoritative", () => { has(memo, "agent/source-refs.json remains authoritative for source refs."); });
// 11
test("source-change posture in authority layer", () => { has(memo, "phase source-change posture belongs to the authoritative source / verification layer, not the task-context layer."); });
// 12
test("source-change posture evidence not approval", () => { has(memo, "source-change posture is handoff evidence, not approval."); });
// 13
test("safe projection handoff data not execution", () => { has(memo, "safe executable verification-command projection is handoff data, not execution."); });
// 14
test("circe/phase-plan.json describes but not executes", () => { has(memo, "circe/phase-plan.json may describe verification commands, but rekon does not execute them."); });
// 15
test("circe/rekon-proof.json keeps commandsExecuted:false", () => { has(memo, "circe/rekon-proof.json keeps commandsexecuted:false."); });
// 16
test("actor contracts role/return guidance", () => { has(memo, "actor contracts are role/return-shape guidance, not executed workers."); });
// 17
test("operator command boundary operator-only", () => { has(memo, "the operator command boundary is operator-only inspection guidance, not worker execution guidance."); });
// 18
test("worker requests plan-quality concerns", () => { has(memo, "worker requests to run operator-only circe commands are plan-quality concerns."); });
// 19
test("sidecars must not approve plans", () => { has(memo, "taskcontextreport sidecars must not approve plans."); });
// 20
test("sidecars must not execute commands", () => { has(memo, "taskcontextreport sidecars must not execute commands."); });
// 21
test("sidecars must not write source files", () => { has(memo, "taskcontextreport sidecars must not write source files."); });
// 22
test("verification hints remain hints", () => { has(memo, "verification hints remain hints, not executed commands."); });
// 23
test("do-not-touch zones guidance not enforcement", () => { has(memo, "do-not-touch zones remain guidance/context, not enforcement."); });
// 24
test("guide introduces no runtime behavior changes", () => { has(memo, "the workflow guide introduces no runtime behavior changes."); });
// 25
test("intent:go remains deferred", () => { has(memo, "intent:go remains deferred."); });
// 26
test("surface table", () => { has(memo, "| surface | status | safety finding |"); });
// 27
test("authority table", () => { has(memo, "| surface | review finding |"); });
// 28
test("boundary table", () => { has(memo, "| boundary | decision |"); });
// 29
test("option table", () => { has(memo, "| option | decision | reason |"); });
// 30
test("CHANGELOG mentions workflow guide safety review", () => { has(changelog, "intent bundle handoff workflow guide safety review"); });
// 31
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(PACKET));
  assert.ok(readFileSync(PACKET, "utf8").includes("PURPOSE PRESERVATION CHECK"));
});
