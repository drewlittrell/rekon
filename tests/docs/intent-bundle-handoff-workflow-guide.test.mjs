// Docs test for the Intent Bundle Handoff Workflow Guide (slice 198).
// Locks the two reader guides + the implementation note: boundary statements, 3 tables,
// CHANGELOG entry, and review packet. Statements/tables may live in any of the three docs;
// the test searches the concatenation.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const WORKFLOW = resolve(repoRoot, "docs/guides/intent-bundle-handoff-workflow.md");
const AGENT = resolve(repoRoot, "docs/guides/intent-bundle-agent-reading-order.md");
const NOTE = resolve(repoRoot, "docs/strategy/intent-bundle-handoff-workflow-guide.md");
const PACKET = resolve(repoRoot, ".rekon-dev/review-packets/intent-bundle-handoff-workflow-guide.md");
const CHANGELOG = resolve(repoRoot, "CHANGELOG.md");

const norm = (text) => text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");
const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const corpus = norm([WORKFLOW, AGENT, NOTE].map(read).join("\n\n"));
const changelog = norm(read(CHANGELOG));
const has = (text, needle) => assert.ok(text.includes(needle), `missing: ${needle}`);

// 1-3
test("intent bundle handoff workflow guide exists", () => { assert.ok(existsSync(WORKFLOW)); });
test("intent bundle agent reading order guide exists", () => { assert.ok(existsSync(AGENT)); });
test("implementation note exists", () => { assert.ok(existsSync(NOTE)); });
// 4
test("guidance not automation", () => { has(corpus, "intent bundle handoff reading order is guidance, not automation."); });
// 5
test("recommend not require as proof", () => { has(corpus, "broader workflows should recommend the handoff reading order, not require it as proof."); });
// 6
test("humans inspect README first", () => { has(corpus, "humans should inspect readme.md first, then context/task-context.md when present."); });
// 7
test("agents inspect instructions first", () => { has(corpus, "agents should inspect agent/instructions.md first, then agent/handoff.md, then agent/context.json, and then context/task-context.agent.json when present."); });
// 8
test("sidecars optional context not proof", () => { has(corpus, "taskcontextreport sidecars are optional context, not proof."); });
// 9
test("WorkOrder/VerificationPlan authoritative gates", () => { has(corpus, "workorder and verificationplan remain the authoritative work and verification gates."); });
// 10
test("agent/verification.json authoritative", () => { has(corpus, "agent/verification.json remains authoritative for verification posture."); });
// 11
test("agent/source-refs.json authoritative", () => { has(corpus, "agent/source-refs.json remains authoritative for source refs."); });
// 12
test("source-change posture in authority layer", () => { has(corpus, "phase source-change posture belongs to the authoritative source / verification layer, not the task-context layer."); });
// 13
test("source-change posture evidence not approval", () => { has(corpus, "source-change posture is handoff evidence, not approval."); });
// 14
test("safe projection handoff data not execution", () => { has(corpus, "safe executable verification-command projection is handoff data, not execution."); });
// 15
test("circe/phase-plan.json describes but not executes", () => { has(corpus, "circe/phase-plan.json may describe verification commands, but rekon does not execute them."); });
// 16
test("circe/rekon-proof.json keeps commandsExecuted:false", () => { has(corpus, "circe/rekon-proof.json keeps commandsexecuted:false."); });
// 17
test("actor contracts role/return guidance", () => { has(corpus, "actor contracts are role/return-shape guidance, not executed workers."); });
// 18
test("operator command boundary operator-only", () => { has(corpus, "the operator command boundary is operator-only inspection guidance, not worker execution guidance."); });
// 19
test("worker requests plan-quality concerns", () => { has(corpus, "worker requests to run operator-only circe commands are plan-quality concerns."); });
// 20
test("sidecars must not approve plans", () => { has(corpus, "taskcontextreport sidecars must not approve plans."); });
// 21
test("sidecars must not execute commands", () => { has(corpus, "taskcontextreport sidecars must not execute commands."); });
// 22
test("sidecars must not write source files", () => { has(corpus, "taskcontextreport sidecars must not write source files."); });
// 23
test("verification hints remain hints", () => { has(corpus, "verification hints remain hints, not executed commands."); });
// 24
test("do-not-touch zones guidance not enforcement", () => { has(corpus, "do-not-touch zones remain guidance/context, not enforcement."); });
// 25
test("intent:go remains deferred", () => { has(corpus, "intent:go remains deferred."); });
// 26
test("workflow table", () => { has(corpus, "| consumer | recommended reads |"); });
// 27
test("authority table", () => { has(corpus, "| surface | authority |"); });
// 28
test("boundary table", () => { has(corpus, "| boundary | decision |"); });
// 29
test("CHANGELOG mentions workflow guide", () => { has(changelog, "intent bundle handoff workflow guide"); });
// 30
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(PACKET));
  assert.ok(read(PACKET).includes("PURPOSE PRESERVATION CHECK"));
});
