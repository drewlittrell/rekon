// Docs tests for the TaskContextReport Bundle Broader Handoff Decision (slice 187).
// Locks the decision: promote the optional bundle-context sidecars in human/agent
// handoff guidance (Option B), recommended not required, with every proof / gate /
// execution / source-write / Circe / intent:go boundary preserved.

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

const MEMO = "docs/strategy/task-context-report-bundle-broader-handoff-decision.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-bundle-broader-handoff-decision.md";

const memoRaw = read(MEMO);
const memo = norm(memoRaw);
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

const REQUIRED_HEADINGS = [
  "# TaskContextReport Bundle Broader Handoff Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Current Bundle Context Surface",
  "## Options Considered",
  "## Recommendation",
  "## Broader Handoff Model",
  "## Human Handoff Policy",
  "## Agent Handoff Policy",
  "## Circe Boundary",
  "## Boundary Model",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

// 1
test("decision memo exists", () => {
  assert.ok(memoRaw.length > 0);
});

// 2
test("doc contains all required headings", () => {
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(memoRaw.includes(heading), `missing heading: ${heading}`);
  }
});

// 3
test("doc says TaskContextReport sidecars are optional context, not proof", () => {
  assert.ok(memo.includes("taskcontextreport sidecars are optional context, not proof"));
});

// 4
test("doc says TaskContextReport sidecars must not be required to write an intent bundle", () => {
  assert.ok(memo.includes("taskcontextreport sidecars must not be required to write an intent bundle"));
});

// 5
test("doc says humans should inspect context/task-context.md when it is present in a bundle", () => {
  assert.ok(memo.includes("humans should inspect context/task-context.md when it is present in a bundle"));
});

// 6
test("doc says agents should read context/task-context.agent.json when it is present in a bundle", () => {
  assert.ok(memo.includes("agents should read context/task-context.agent.json when it is present in a bundle"));
});

// 7
test("doc says verification hints remain hints, not executed commands", () => {
  assert.ok(memo.includes("verification hints remain hints, not executed commands"));
});

// 8
test("doc says do-not-touch zones remain guidance/context, not enforcement", () => {
  assert.ok(memo.includes("do-not-touch zones remain guidance/context, not enforcement"));
});

// 9
test("doc says WorkOrder and VerificationPlan gates remain authoritative", () => {
  assert.ok(memo.includes("workorder and verificationplan gates remain authoritative"));
});

// 10
test("doc says phase gates remain authoritative", () => {
  assert.ok(memo.includes("phase gates remain authoritative"));
});

// 11
test("doc says Circe handoff JSON remains the machine handoff contract", () => {
  assert.ok(memo.includes("circe handoff json remains the machine handoff contract"));
});

// 12
test("doc says Circe should not be required to understand TaskContextReport internals", () => {
  assert.ok(memo.includes("circe should not be required to understand taskcontextreport internals"));
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
test("doc says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 17
test("doc includes option table", () => {
  assert.ok(memoRaw.includes("| Option | Decision | Reason |"));
});

// 18
test("doc includes consumer table", () => {
  assert.ok(memoRaw.includes("| Consumer | Policy |"));
});

// 19
test("doc includes bundle-surface table", () => {
  assert.ok(memoRaw.includes("| Surface | Future Role |"));
});

// 20
test("doc includes boundary table", () => {
  assert.ok(memoRaw.includes("| Boundary | Decision |"));
});

// 21
test("CHANGELOG mentions TaskContextReport Bundle Broader Handoff Decision", () => {
  assert.ok(changelog.includes("taskcontextreport bundle broader handoff decision"));
});

// 22
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});
