// Documentation coverage for Semantic File Understanding Scan Integration
// (slice 147). Pins the product guarantees in the strategy doc, the CHANGELOG
// mention, and the review packet's PURPOSE PRESERVATION CHECK.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");

const DOC = "docs/strategy/semantic-file-understanding-scan-integration.md";
const PACKET = ".rekon-dev/review-packets/semantic-file-understanding-scan-integration.md";
const doc = norm(read(DOC));
const changelog = read("CHANGELOG.md");

test("1. docs say scan remains deterministic by default", () => {
  assert.ok(doc.includes("scan remains deterministic by default"));
});

test("2. docs say semantic file understanding in scan is explicit opt-in", () => {
  assert.ok(doc.includes("semantic file understanding in scan is explicit opt-in"));
});

test("3. docs say provider calls are never surprising defaults", () => {
  assert.ok(doc.includes("provider calls are never surprising defaults"));
});

test("4. docs say source text is not sent to providers by default", () => {
  assert.ok(doc.includes("source text is not sent to providers by default"));
});

test("5. docs say SemanticFileUnderstandingReport is proposal/context, not proof", () => {
  assert.ok(doc.includes("proposal/context, not proof"));
});

test("6. docs say semantic file understanding does not approve plans", () => {
  assert.ok(doc.includes("does not approve plans"));
});

test("7. docs say semantic file understanding does not execute commands", () => {
  assert.ok(doc.includes("does not execute commands"));
});

test("8. docs say semantic file understanding does not write source files", () => {
  assert.ok(doc.includes("does not write source files"));
});

test("9. docs say semantic file understanding does not generate embeddings", () => {
  assert.ok(doc.includes("does not generate embeddings"));
});

test("10. docs say embeddings remain deferred to a separate track", () => {
  assert.ok(doc.includes("embeddings remain deferred to a separate track"));
});

test("11. docs say intent:go remains deferred", () => {
  assert.ok(doc.includes("intent:go remains deferred"));
});

test("12. CHANGELOG mentions Semantic File Understanding Scan Integration", () => {
  assert.ok(changelog.includes("Semantic File Understanding Scan Integration"));
  assert.ok(changelog.includes("--semantic-files"), "CHANGELOG mentions the new scan flag");
});

test("13. review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, PACKET)), "review packet exists");
  assert.ok(read(PACKET).includes("PURPOSE PRESERVATION CHECK"));
});
