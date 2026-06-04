// Docs tests for the TaskContextReport Safety Review (slice 167). Pins the memo's
// required headings, verbatim boundary/safety statements, the four review tables,
// the CHANGELOG mention, and the review packet's PURPOSE PRESERVATION CHECK — so
// task-shaped context stays proposal/context, not proof, and the context-only
// boundary is documented before any consumer is built.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

const MEMO = resolve(repoRoot, "docs/strategy/task-context-report-safety-review.md");
const REVIEW_PACKET = resolve(repoRoot, ".rekon-dev/review-packets/task-context-report-safety-review.md");
const CHANGELOG = resolve(repoRoot, "CHANGELOG.md");

const norm = (text) =>
  text
    .replace(/^>\s?/gm, "")
    .toLowerCase()
    .replace(/[`*]/g, "")
    .replace(/\s+/g, " ");

function read(path) {
  return existsSync(path) ? norm(readFileSync(path, "utf8")) : "";
}

const memo = read(MEMO);
const packet = read(REVIEW_PACKET);
const changelog = read(CHANGELOG);

const HEADINGS = [
  "# TaskContextReport Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Implementation Reviewed",
  "## Artifact Model Review",
  "## Builder Review",
  "## CLI Review",
  "## Human And Agent Output Review",
  "## Boundary Review",
  "## Options Considered",
  "## Recommendation",
  "## What This Does Not Do",
  "## Follow-Up Work",
];

const STATEMENTS = [
  "TaskContextReport is proposal/context, not proof.",
  "Embedding retrieval is proposal/context, not proof.",
  "CapabilityEvidenceGraph remains the evidence substrate.",
  "Deterministic graph facts outrank embedding similarity.",
  "TaskContextReport boundaries are forced false by the factory.",
  "The validator rejects non-false boundaries.",
  "The validator rejects empty task text.",
  "The validator rejects reasonless context items.",
  "Summary counts are recomputed by the factory.",
  "buildTaskContextReport is pure.",
  "buildTaskContextReport calls no providers.",
  "buildTaskContextReport executes no commands.",
  "buildTaskContextReport writes no source files.",
  "buildTaskContextReport creates no PreparedIntentPlan.",
  "buildTaskContextReport creates no WorkOrder.",
  "buildTaskContextReport creates no VerificationPlan.",
  "Do-not-touch zones are guidance/context, not enforcement.",
  "Verification hints are hints, not executed commands.",
  "TaskContextReport creates no WorkOrder or VerificationPlan.",
  "TaskContextReport runs no Circe.",
  "Duplicate detection remains deferred.",
  "Canonical recommendations remain deferred.",
  "intent:go remains deferred.",
];

const TABLES = [
  { name: "surface table", needles: ["| surface | status | safety finding |", "forces boundaries / recomputes summary"] },
  { name: "boundary table", needles: ["| boundary | decision |", "task context vs preparedintentplan"] },
  { name: "selection table", needles: ["| selection source | review finding |", "admitted regardless of score"] },
  { name: "option table", needles: ["| option | decision | reason |", "declare taskcontextreport safe/stable"] },
];

// 1
test("safety review doc exists", () => {
  assert.ok(existsSync(MEMO), "expected docs/strategy/task-context-report-safety-review.md");
});

// 2
test("memo contains all required headings", () => {
  for (const heading of HEADINGS) {
    assert.ok(memo.includes(norm(heading)), `memo missing heading: "${heading}"`);
  }
});

// 3-25
for (const statement of STATEMENTS) {
  test(`memo states verbatim: ${statement}`, () => {
    assert.ok(memo.includes(norm(statement)), `memo missing verbatim statement: "${statement}"`);
  });
}

// 26-29
for (const { name, needles } of TABLES) {
  test(`memo includes ${name}`, () => {
    for (const needle of needles) {
      assert.ok(memo.includes(norm(needle)), `memo ${name} missing: "${needle}"`);
    }
  });
}

// 30
test("CHANGELOG mentions TaskContextReport Safety Review", () => {
  assert.ok(changelog.includes(norm("TaskContextReport Safety Review")));
});

// 31
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(REVIEW_PACKET), "review packet should exist");
  assert.ok(packet.includes(norm("PURPOSE PRESERVATION CHECK")));
});
