// Docs tests for the TaskContextReport Dogfood Review (slice 168). Locks in the
// dogfood narrative: task-shaped context was exercised on explicit-path and
// retrieval scenarios, it remains proposal/context (not proof), do-not-touch
// zones are guidance, verification hints are hints (not executed), evidence refs
// were inspected, and no WorkOrder / VerificationPlan / source write / Circe run /
// intent:go was performed.

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

const MEMO = "docs/strategy/task-context-report-dogfood-review.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-dogfood-review.md";
const CHANGELOG = "CHANGELOG.md";

const memo = norm(read(MEMO));
const packet = read(PACKET); // packet headings checked case-sensitively
const changelog = norm(read(CHANGELOG));

// 1
test("dogfood review doc exists and is titled", () => {
  assert.ok(read(MEMO).length > 0);
  assert.ok(memo.includes("taskcontextreport dogfood review"));
});

// 2
test("docs say it was dogfooded on explicit-path and retrieval scenarios", () => {
  assert.ok(memo.includes("taskcontextreport was dogfooded on explicit-path and retrieval scenarios"));
});

// 3
test("docs say task-shaped context is proposal/context, not proof", () => {
  assert.ok(memo.includes("task-shaped context is proposal/context, not proof"));
});

// 4
test("docs say do-not-touch zones are guidance/context, not enforcement", () => {
  assert.ok(memo.includes("do-not-touch zones are guidance/context, not enforcement"));
});

// 5
test("docs say verification hints are hints, not executed commands", () => {
  assert.ok(memo.includes("verification hints are hints, not executed commands"));
});

// 6
test("docs say human markdown usefulness was reviewed", () => {
  assert.ok(memo.includes("human markdown usefulness was reviewed"));
});

// 7
test("docs say agent JSON usefulness was reviewed", () => {
  assert.ok(memo.includes("agent json usefulness was reviewed"));
});

// 8
test("docs say evidenceRefs were inspected", () => {
  assert.ok(memo.includes("evidencerefs were inspected"));
});

// 9
test("docs say no WorkOrder or VerificationPlan was created", () => {
  assert.ok(memo.includes("no workorder or verificationplan was created"));
});

// 10
test("docs say no source files were written", () => {
  assert.ok(memo.includes("no source files were written"));
});

// 11
test("docs say no Circe was run", () => {
  assert.ok(memo.includes("no circe was run"));
});

// 12
test("docs say intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 13
test("CHANGELOG mentions TaskContextReport Dogfood Review", () => {
  assert.ok(changelog.includes("taskcontextreport dogfood review"));
});

// 14
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});
