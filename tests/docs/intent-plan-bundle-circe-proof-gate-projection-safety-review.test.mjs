// Docs tests for the Intent Plan Bundle → Circe Proof/Gate Projection Safety Review
// (expanded with the external Circe serve-loop execution proof + the stale-help gap).
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

const memoRaw = read("docs/strategy/intent-plan-bundle-circe-proof-gate-projection-safety-review.md");
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/intent-plan-bundle-circe-proof-gate-projection-safety-review.md");

// ---------- 1 ----------
test("safety review doc exists with title", () => {
  assert.match(memoRaw, /# Intent Plan Bundle → Circe Proof\/Gate Projection Safety Review/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const headings = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Helper And CLI Reviewed",
    "## Proof Sidecar Review",
    "## Gate State Review",
    "## Phase Gate Review",
    "## WorkOrder / VerificationPlan Traceability Review",
    "## Circe Compatibility Review",
    "## External Rekon / Circe Execution Proof",
    "## CLI Help Discoverability Gap",
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
test("doc says rekon-proof.json carries PreparedIntentPlan approval/proof into the projection", () => {
  assert.match(memo, /circe\/rekon-proof\.json carries PreparedIntentPlan approval\/proof into the Circe projection/);
});

// ---------- 4 ----------
test("doc says rekon-proof.json carries IntentStatusReport gate state", () => {
  assert.match(memo, /circe\/rekon-proof\.json carries IntentStatusReport gate state/);
});

// ---------- 5 ----------
test("doc says rekon-proof.json carries freshness and runtime drift refs", () => {
  assert.match(memo, /circe\/rekon-proof\.json carries freshness and runtime drift refs/);
});

// ---------- 6 ----------
test("doc says rekon-proof.json carries phase-level gate metadata", () => {
  assert.match(memo, /circe\/rekon-proof\.json carries phase-level gate metadata/);
});

// ---------- 7 ----------
test("doc says sourceWriteAllowed remains false", () => {
  assert.match(memo, /sourceWriteAllowed remains false/);
});

// ---------- 8 ----------
test("doc says commandsExecuted remains false", () => {
  assert.match(memo, /commandsExecuted remains false/);
});

// ---------- 9 ----------
test("doc says intentGoDeferred remains true", () => {
  assert.match(memo, /intentGoDeferred remains true/);
});

// ---------- 10 ----------
test("doc says the projection must not claim approval/readiness the source does not support", () => {
  assert.match(memo, /The Circe projection must not claim approval\/readiness the source artifacts do not support/);
});

// ---------- 11 ----------
test("doc says the enriched projection remains compatible with Circe", () => {
  assert.match(memo, /The enriched projection remains compatible with Circe/);
});

// ---------- 12 ----------
test("doc says the current built Rekon CLI passed the Circe validate/routes/import/serve-loop proof", () => {
  assert.match(memo, /The current built Rekon CLI passed the Circe validate\/routes\/import\/serve-loop proof/);
});

// ---------- 13 ----------
test("doc says Rekon does not run Circe commands during bundle generation", () => {
  assert.match(memo, /Rekon does not run Circe commands during bundle generation/);
});

// ---------- 14 ----------
test("doc says Rekon does not execute commands", () => {
  assert.match(memo, /Rekon does not execute commands/);
});

// ---------- 15 ----------
test("doc says Rekon does not write source files", () => {
  assert.match(memo, /Rekon does not write source files/);
});

// ---------- 16 ----------
test("doc says intent:go remains deferred", () => {
  assert.match(memo, /intent:go remains deferred/);
});

// ---------- 17 ----------
test("doc says top-level Rekon help is stale and must be aligned before V1/operator-ready release", () => {
  assert.match(memo, /Top-level Rekon help is stale and must be aligned before V1\/operator-ready release/);
});

// ---------- 18 ----------
test("doc includes the surface table", () => {
  assert.match(memoRaw, /\| Surface \| Status \| Boundary \|/);
});

// ---------- 19 ----------
test("doc includes the proof/gate table", () => {
  assert.match(memoRaw, /\| Proof \/ Gate Surface \| Review Finding \|/);
});

// ---------- 20 ----------
test("doc includes the Circe proof table", () => {
  assert.match(memoRaw, /\| Circe Step \| Result \|/);
});

// ---------- 21 ----------
test("doc includes the boundary table", () => {
  assert.match(memoRaw, /\| Boundary \| Decision \|/);
});

// ---------- 22 ----------
test("doc includes the option table", () => {
  assert.match(memoRaw, /\| Option \| Decision \| Reason \|/);
});

// ---------- 23 ----------
test("CHANGELOG mentions the Circe Proof/Gate Projection Safety Review", () => {
  assert.match(changelog, /Circe Proof\/Gate Projection Safety Review/);
});

// ---------- 24 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});
