// Docs tests for the Intent Plan Bundle → Circe Proof/Gate Projection Enrichment
// (slice 101).
//
// Gate the concept-doc statements about the rekon-proof.json sidecar, the CHANGELOG
// entry, and the review packet.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const concept = norm(read("docs/concepts/intent-plan-bundle.md"));
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/intent-plan-bundle-circe-proof-gate-projection-v1.md");

// ---------- 1 ----------
test("docs say circe/rekon-proof.json is emitted", () => {
  assert.match(concept, /circe\/rekon-proof\.json/);
});

// ---------- 2 ----------
test("docs say the proof sidecar carries PreparedIntentPlan approval/proof", () => {
  assert.match(concept, /carries the PreparedIntentPlan approval\/proof/);
});

// ---------- 3 ----------
test("docs say the proof sidecar carries IntentStatusReport gate state", () => {
  assert.match(concept, /IntentStatusReport gate state/);
});

// ---------- 4 ----------
test("docs say the proof sidecar carries freshness/drift refs", () => {
  assert.match(concept, /freshness\/drift refs/);
});

// ---------- 5 ----------
test("docs say the proof sidecar carries phase-level gate metadata", () => {
  assert.match(concept, /phase-level gate metadata/);
});

// ---------- 6 ----------
test("docs say sourceWriteAllowed remains false", () => {
  assert.match(concept, /sourceWriteAllowed remains false/);
});

// ---------- 7 ----------
test("docs say commandsExecuted remains false", () => {
  assert.match(concept, /commandsExecuted remains false/);
});

// ---------- 8 ----------
test("docs say intentGoDeferred remains true", () => {
  assert.match(concept, /intentGoDeferred remains true/);
});

// ---------- 9 ----------
test("docs say Circe schema validation remains intact", () => {
  assert.match(concept, /Circe schema validation remains intact/);
});

// ---------- 10 ----------
test("CHANGELOG mentions the Circe Proof/Gate Projection Enrichment", () => {
  assert.match(changelog, /Circe Proof\/Gate Projection Enrichment/);
});

// ---------- 11 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});
