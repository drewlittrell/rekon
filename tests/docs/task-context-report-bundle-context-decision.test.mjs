// Docs tests for the TaskContextReport Bundle Context Decision (slice 182).
// Locks in the decision: intent bundles may carry optional TaskContextReport refs
// + Rekon-side sidecars (Option B + E), with the Circe handoff schema unchanged
// and every proof / approval / gate / execution / source-write / intent:go
// boundary preserved.

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

const MEMO = "docs/strategy/task-context-report-bundle-context-decision.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-bundle-context-decision.md";

const memoRaw = read(MEMO);
const memo = norm(memoRaw);
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

const REQUIRED_HEADINGS = [
  "# TaskContextReport Bundle Context Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Current Bundle Surface",
  "## Options Considered",
  "## Recommendation",
  "## Bundle Context Model",
  "## Handoff And Circe Boundary",
  "## Consumer Model",
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
test("doc says TaskContextReport may be included in bundles only as optional context, not proof", () => {
  assert.ok(memo.includes("taskcontextreport may be included in bundles only as optional context, not proof"));
});

// 4
test("doc says TaskContextReport must not be required to write an intent bundle", () => {
  assert.ok(memo.includes("taskcontextreport must not be required to write an intent bundle"));
});

// 5
test("doc says TaskContextReport must not approve plans", () => {
  assert.ok(memo.includes("taskcontextreport must not approve plans"));
});

// 6
test("doc says TaskContextReport must not satisfy WorkOrder or VerificationPlan gates", () => {
  assert.ok(memo.includes("taskcontextreport must not satisfy workorder or verificationplan gates"));
});

// 7
test("doc says TaskContextReport must not change phase gates", () => {
  assert.ok(memo.includes("taskcontextreport must not change phase gates"));
});

// 8
test("doc says TaskContextReport must not execute commands", () => {
  assert.ok(memo.includes("taskcontextreport must not execute commands"));
});

// 9
test("doc says TaskContextReport must not write source files", () => {
  assert.ok(memo.includes("taskcontextreport must not write source files"));
});

// 10
test("doc says TaskContextReport must not run Circe", () => {
  assert.ok(memo.includes("taskcontextreport must not run circe"));
});

// 11
test("doc says verification hints remain hints, not executed commands", () => {
  assert.ok(memo.includes("verification hints remain hints, not executed commands"));
});

// 12
test("doc says do-not-touch zones remain guidance/context, not enforcement", () => {
  assert.ok(memo.includes("do-not-touch zones remain guidance/context, not enforcement"));
});

// 13
test("doc says Circe should not be required to know TaskContextReport internals in v1", () => {
  assert.ok(memo.includes("circe should not be required to know taskcontextreport internals in v1"));
});

// 14
test("doc says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 15
test("doc includes option table", () => {
  assert.ok(memoRaw.includes("| Option | Decision | Reason |"));
});

// 16
test("doc includes bundle table", () => {
  assert.ok(memoRaw.includes("| Bundle Surface | Decision |"));
});

// 17
test("doc includes boundary table", () => {
  assert.ok(memoRaw.includes("| Boundary | Decision |"));
});

// 18
test("doc includes consumer table", () => {
  assert.ok(memoRaw.includes("| Consumer | Use |"));
});

// 19
test("CHANGELOG mentions TaskContextReport Bundle Context Decision", () => {
  assert.ok(changelog.includes("taskcontextreport bundle context decision"));
});

// 20
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});
