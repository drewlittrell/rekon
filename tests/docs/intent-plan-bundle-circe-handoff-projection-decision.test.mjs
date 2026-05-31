// Docs tests for the Intent Plan Bundle → Circe Handoff Projection Decision
// (slice 98).
//
// Gate the decision memo's headings, selection, boundary statements, and tables,
// plus the CHANGELOG entry and review packet. The CHANGELOG assertion fails until
// the bulk doc update lands the real entry.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const memoRaw = read("docs/strategy/intent-plan-bundle-circe-handoff-projection-decision.md");
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/intent-plan-bundle-circe-handoff-projection-decision.md");

// ---------- 1 ----------
test("decision memo exists with title", () => {
  assert.match(memoRaw, /# Intent Plan Bundle → Circe Handoff Projection Decision/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const headings = [
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Circe Source Reviewed",
    "## Current Boundary",
    "## Options Considered",
    "## Recommendation",
    "## Circe Projection Directory",
    "## Handoff Manifest Model",
    "## Phase Plan Model",
    "## WorkOrder Projection Model",
    "## VerificationPlan Projection Model",
    "## Routing / Implementer Profile Model",
    "## Validation Model",
    "## Boundary Model",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  for (const heading of headings) assert.ok(memoRaw.includes(heading), `missing heading: ${heading}`);
});

// ---------- 3 ----------
test("doc says Circe handoff projection is an import adapter, not a new planning system", () => {
  assert.match(memo, /Circe handoff projection is an import adapter, not a new planning system/);
});

// ---------- 4 ----------
test("doc says canonical Rekon truth remains .rekon/artifacts/", () => {
  assert.match(memo, /Canonical Rekon truth remains \.rekon\/artifacts\//);
});

// ---------- 5 ----------
test("doc says projection lives under .rekon/intent/plans/<intent-id>/circe/", () => {
  assert.match(memo, /\.rekon\/intent\/plans\/<intent-id>\/circe\//);
});

// ---------- 6 ----------
test("doc says Rekon does not execute the Circe handoff", () => {
  assert.match(memo, /Rekon does not execute the Circe handoff/);
});

// ---------- 7 ----------
test("doc says Rekon does not run Circe commands during bundle generation", () => {
  assert.match(memo, /Rekon does not run Circe commands during bundle generation/);
});

// ---------- 8 ----------
test("doc says Rekon does not write source files", () => {
  assert.match(memo, /Rekon does not write source files/);
});

// ---------- 9 ----------
test("doc says Circe owns orchestration after import", () => {
  assert.match(memo, /Circe owns orchestration after import/);
});

// ---------- 10 ----------
test("doc says intent:go remains deferred", () => {
  assert.match(memo, /intent:go remains deferred/);
});

// ---------- 11 ----------
test("doc includes the option table", () => {
  assert.match(memoRaw, /\| Option \| Decision \| Reason \|/);
});

// ---------- 12 ----------
test("doc includes the mapping table", () => {
  assert.match(memoRaw, /\| Rekon Source \| Circe Projection \|/);
});

// ---------- 13 ----------
test("doc includes the boundary table", () => {
  assert.match(memoRaw, /\| Boundary \| Decision \|/);
});

// ---------- 14 ----------
test("doc includes the validation table", () => {
  assert.match(memoRaw, /\| Circe Command \| Role \|/);
});

// ---------- 15 ----------
test("CHANGELOG mentions the Circe Handoff Projection Decision", () => {
  assert.match(changelog, /Circe Handoff Projection Decision/);
});

// ---------- 16 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});
