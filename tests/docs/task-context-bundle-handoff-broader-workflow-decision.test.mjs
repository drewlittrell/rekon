// Docs tests for the TaskContextReport Bundle Handoff Broader Workflow Decision (slice 192,
// base e91dc087). Locks the decision: an explicit bundle reading-order policy, with the
// phase source-change posture placed in the authoritative source / verification layer
// (not the task-context layer), and every boundary preserved.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (relativePath) => readFileSync(resolve(repoRoot, relativePath), "utf8");
const norm = (text) =>
  text
    .replace(/^>\s?/gm, "")
    .toLowerCase()
    .replace(/[`*]/g, "")
    .replace(/\s+/g, " ");

const MEMO = "docs/strategy/task-context-report-bundle-handoff-broader-workflow-decision.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-bundle-handoff-broader-workflow-decision.md";

const memoRaw = read(MEMO);
const memo = norm(memoRaw);
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

// 1
test("decision memo exists", () => {
  assert.ok(memoRaw.length > 0);
});

// 2
test("doc contains all required headings", () => {
  const headings = [
    "## decision summary",
    "## why this decision exists",
    "## current handoff surface",
    "## options considered",
    "## recommendation",
    "## broader handoff model",
    "## human handoff policy",
    "## agent handoff policy",
    "## circe and actor contract policy",
    "## boundary model",
    "## what this does not do",
    "## implementation sequence",
  ];
  for (const h of headings) assert.ok(memo.includes(h), `missing heading: ${h}`);
});

// 3
test("doc says TaskContextReport sidecars are optional context, not proof", () => {
  assert.ok(memo.includes("taskcontextreport sidecars are optional context, not proof"));
});

// 4
test("doc says humans should inspect README.md first, then context/task-context.md when present", () => {
  assert.ok(memo.includes("humans should inspect readme.md first, then context/task-context.md when present"));
});

// 5
test("doc says agents should inspect agent/instructions.md first, then handoff, then context.json, then agent.json", () => {
  assert.ok(memo.includes("agents should inspect agent/instructions.md first, then agent/handoff.md, then agent/context.json, and then context/task-context.agent.json when present"));
});

// 6
test("doc says WorkOrder and VerificationPlan remain the authoritative work and verification gates", () => {
  assert.ok(memo.includes("workorder and verificationplan remain the authoritative work and verification gates"));
});

// 7
test("doc says agent/verification.json remains authoritative for verification posture", () => {
  assert.ok(memo.includes("agent/verification.json remains authoritative for verification posture"));
});

// 8
test("doc says agent/source-refs.json remains authoritative for source refs", () => {
  assert.ok(memo.includes("agent/source-refs.json remains authoritative for source refs"));
});

// 9
test("doc says Circe handoff JSON remains the machine handoff contract", () => {
  assert.ok(memo.includes("circe handoff json remains the machine handoff contract"));
});

// 10
test("doc says actor contracts are role/return-shape guidance, not executed workers", () => {
  assert.ok(memo.includes("actor contracts are role/return-shape guidance, not executed workers"));
});

// 11
test("doc says the Operator Command Boundary is operator-only inspection guidance, not worker execution guidance", () => {
  assert.ok(memo.includes("the operator command boundary is operator-only inspection guidance, not worker execution guidance"));
});

// 12
test("doc says worker requests to run operator-only Circe commands are plan-quality concerns", () => {
  assert.ok(memo.includes("worker requests to run operator-only circe commands are plan-quality concerns"));
});

// 13
test("doc says TaskContextReport sidecars must not approve plans", () => {
  assert.ok(memo.includes("taskcontextreport sidecars must not approve plans"));
});

// 14
test("doc says TaskContextReport sidecars must not execute commands", () => {
  assert.ok(memo.includes("taskcontextreport sidecars must not execute commands"));
});

// 15
test("doc says TaskContextReport sidecars must not write source files", () => {
  assert.ok(memo.includes("taskcontextreport sidecars must not write source files"));
});

// 16
test("doc says verification hints remain hints, not executed commands", () => {
  assert.ok(memo.includes("verification hints remain hints, not executed commands"));
});

// 17
test("doc says do-not-touch zones remain guidance/context, not enforcement", () => {
  assert.ok(memo.includes("do-not-touch zones remain guidance/context, not enforcement"));
});

// 18
test("doc says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 19
test("doc says Phase source-change posture belongs to the authoritative source / verification layer, not the task-context layer", () => {
  assert.ok(memo.includes("phase source-change posture belongs to the authoritative source / verification layer, not the task-context layer"));
});

// 20
test("doc says source-change posture is handoff evidence, not approval", () => {
  assert.ok(memo.includes("source-change posture is handoff evidence, not approval"));
});

// 21
test("doc says TaskContextReport sidecars must not override sourceChange posture", () => {
  assert.ok(memo.includes("taskcontextreport sidecars must not override sourcechange posture"));
});

// 22
test("doc includes option table", () => {
  assert.ok(memo.includes("option | decision | reason"));
});

// 23
test("doc includes handoff layer table", () => {
  assert.ok(memo.includes("layer | surfaces | purpose"));
});

// 24
test("doc includes consumer table", () => {
  assert.ok(memo.includes("consumer | first reads"));
});

// 25
test("doc includes boundary table", () => {
  assert.ok(memo.includes("boundary | decision"));
});

// 26
test("CHANGELOG mentions TaskContextReport Bundle Handoff Broader Workflow Decision", () => {
  assert.ok(changelog.includes("taskcontextreport bundle handoff broader workflow decision"));
});

// 27
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(packet.includes("CODEBASE-INTEL ALIGNMENT"));
});
