// Docs tests for the Intent Plan Bundle → Circe Handoff Projection Safety Review
// (slice 100).
//
// Gate the safety-review memo's headings, required statements, and tables, plus the
// CHANGELOG entry and review packet.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const memoRaw = read("docs/strategy/intent-plan-bundle-circe-handoff-projection-safety-review.md");
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/intent-plan-bundle-circe-handoff-projection-safety-review.md");

// ---------- 1 ----------
test("safety review doc exists with title", () => {
  assert.match(memoRaw, /# Intent Plan Bundle → Circe Handoff Projection Safety Review/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const headings = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Helper And CLI Reviewed",
    "## Circe Schema Validation Review",
    "## Projection Surface Review",
    "## Proof / Gate Traceability Review",
    "## Path Safety Review",
    "## Rekon / Circe Boundary Review",
    "## Command / Source-Write Boundary Review",
    "## Intent Go Boundary Review",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
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
test("doc says Rekon does not run Circe commands during bundle generation", () => {
  assert.match(memo, /Rekon does not run Circe commands during bundle generation/);
});

// ---------- 7 ----------
test("doc says Rekon does not execute the Circe handoff", () => {
  assert.match(memo, /Rekon does not execute the Circe handoff/);
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
test("doc says Circe projection must preserve Rekon's proof/gate traceability", () => {
  assert.match(memo, /Circe projection must preserve Rekon's proof\/gate traceability/);
});

// ---------- 12 ----------
test("doc says if proof/gate traceability is incomplete, intent:go must remain blocked", () => {
  assert.match(memo, /If proof\/gate traceability is incomplete, intent:go must remain blocked/);
});

// ---------- 13 ----------
test("doc includes the surface table", () => {
  assert.match(memoRaw, /\| Surface \| Status \| Boundary \|/);
});

// ---------- 14 ----------
test("doc includes the schema validation table", () => {
  assert.match(memoRaw, /\| Circe Validator \/ Fixture \| Result \|/);
});

// ---------- 15 ----------
test("doc includes the proof/gate traceability table", () => {
  assert.match(memoRaw, /\| Rekon Proof Surface \| Circe Projection Location \|/);
});

// ---------- 16 ----------
test("doc includes the boundary table", () => {
  assert.match(memoRaw, /\| Boundary \| Decision \|/);
});

// ---------- 17 ----------
test("doc includes the option table", () => {
  assert.match(memoRaw, /\| Option \| Decision \| Reason \|/);
});

// ---------- 18 ----------
test("CHANGELOG mentions the Circe Handoff Projection Safety Review", () => {
  assert.match(changelog, /Circe Handoff Projection Safety Review/);
});

// ---------- 19 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});
