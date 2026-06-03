// Documentation coverage for Intent Plan Semantic Normalization Quality
// Hardening (slice 142). Pins the strategy doc's guarantees + the CHANGELOG
// entry + the review packet's PURPOSE PRESERVATION CHECK.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");

const DOC_PATH = "docs/strategy/intent-plan-semantic-quality-hardening.md";
const PACKET_PATH = ".rekon-dev/review-packets/intent-plan-semantic-quality-hardening.md";
const doc = norm(read(DOC_PATH));
const changelog = read("CHANGELOG.md");
const packet = read(PACKET_PATH);

test("1. hardening doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, DOC_PATH)));
});

test("2. doc says semantic output remains a proposal, not proof", () => {
  assert.ok(doc.includes("semantic output remains a proposal, not proof"));
});

test("3. doc says unsupported paths become warnings/findings", () => {
  assert.ok(doc.includes("unsupported paths become warnings/findings"));
});

test("4. doc says unsupported commands become warnings/findings", () => {
  assert.ok(doc.includes("unsupported commands become warnings/findings"));
});

test("5. doc says non-goals must be preserved or warned", () => {
  assert.ok(doc.includes("non-goals must be preserved or warned"));
});

test("6. doc says semantic output cannot make a weak plan actionable merely by filling fields without source support", () => {
  assert.ok(doc.includes("semantic output cannot make a weak plan actionable merely by filling fields without source support"));
});

test("7. doc says deterministic recheck remains authoritative", () => {
  assert.ok(doc.includes("deterministic recheck remains authoritative"));
});

test("8. doc says semantic normalization executes no commands", () => {
  assert.ok(doc.includes("semantic normalization executes no commands"));
});

test("9. doc says semantic normalization writes no source files", () => {
  assert.ok(doc.includes("semantic normalization writes no source files"));
});

test("10. doc says semantic normalization runs no Circe", () => {
  assert.ok(doc.includes("semantic normalization runs no circe"));
});

test("11. doc says intent:go remains deferred", () => {
  assert.ok(doc.includes("intent:go remains deferred"));
});

test("12. CHANGELOG mentions Intent Plan Semantic Quality Hardening", () => {
  assert.match(changelog, /Intent Plan Semantic Quality Hardening/);
});

test("13. review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});
