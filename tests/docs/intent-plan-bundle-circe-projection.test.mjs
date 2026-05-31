// Docs tests for the Intent Plan Bundle → Circe Handoff Projection Implementation
// (slice 99).
//
// Gate the concept-doc statements about the Circe projection, the CHANGELOG entry,
// and the review packet. The CHANGELOG / packet assertions fail until the bulk doc
// update lands.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const concept = norm(read("docs/concepts/intent-plan-bundle.md"));
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/intent-plan-bundle-circe-handoff-projection-v1.md");

// ---------- 1 ----------
test("docs say the bundle includes a Circe projection under circe/", () => {
  assert.match(concept, /Circe projection under .?circe\//);
});

// ---------- 2 ----------
test("docs say Circe handoff projection is an import adapter, not a new planning system", () => {
  assert.match(concept, /Circe handoff projection is an import adapter, not a new planning system/);
});

// ---------- 3 ----------
test("docs say Rekon does not run Circe commands during bundle generation", () => {
  assert.match(concept, /Rekon does not run Circe commands during bundle generation/);
});

// ---------- 4 ----------
test("docs say Rekon does not execute the Circe handoff", () => {
  assert.match(concept, /Rekon does not execute the Circe handoff/);
});

// ---------- 5 ----------
test("docs say Rekon does not write source files", () => {
  assert.match(concept, /Rekon does not write source files/);
});

// ---------- 6 ----------
test("docs say canonical Rekon truth remains .rekon/artifacts/", () => {
  assert.match(concept, /[Cc]anonical (Rekon )?truth remains \.rekon\/artifacts\//);
});

// ---------- 7 ----------
test("docs say Circe owns orchestration after import", () => {
  assert.match(concept, /Circe owns orchestration after import/);
});

// ---------- 8 ----------
test("docs say intent:go remains deferred", () => {
  assert.match(concept, /intent:go remains deferred/);
});

// ---------- 9 ----------
test("CHANGELOG mentions the Circe Handoff Projection Implementation", () => {
  assert.match(changelog, /Circe Handoff Projection Implementation/);
});

// ---------- 10 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});
