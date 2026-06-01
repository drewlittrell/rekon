// Docs tests for Intent Bundle Phase-Level Verification Policy / Implementation (slice 115).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const bundleDoc = norm(read("docs/concepts/intent-plan-bundle.md"));
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/intent-bundle-phase-level-verification.md");

// ---------- 1 ----------
test("docs say every phase has explicit verification posture", () => {
  assert.ok(bundleDoc.includes("Every phase has an explicit verification posture."));
});

// ---------- 2 ----------
test("docs say phase-modify gets executable verification when possible", () => {
  assert.ok(bundleDoc.includes("phase-modify gets executable verification when possible."));
});

// ---------- 3 ----------
test("docs say phase-verify carries final verification", () => {
  assert.ok(bundleDoc.includes("phase-verify carries final verification."));
});

// ---------- 4 ----------
test("docs say phase-investigate and phase-review may be manual / reviewer-gated", () => {
  assert.ok(bundleDoc.includes("phase-investigate and phase-review may be manual / reviewer-gated."));
});

// ---------- 5 ----------
test("docs say manual-only phases are explicit so skipped verification does not look like proof", () => {
  assert.ok(bundleDoc.includes("Manual-only phases are marked explicitly so skipped verification does not look like proof."));
});

// ---------- 6 ----------
test("docs say a phase without executable verification is never silently treated as verified", () => {
  assert.ok(bundleDoc.includes("A phase without executable verification is never silently treated as verified."));
});

// ---------- 7 ----------
test("CHANGELOG mentions Intent Bundle Phase-Level Verification Policy / Implementation", () => {
  assert.ok(changelog.includes("Intent Bundle Phase-Level Verification Policy / Implementation"));
});

// ---------- 8 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});
