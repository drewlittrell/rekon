// Documentation coverage for Fresh Repo Intent Handoff / Circe Dogfood Review
// (Semantic Re-run, slice 140). Distinct from the slice-136 docs test; reads the
// `-semantic` strategy doc + review packet.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
// Strip line-leading blockquote markers (`> `) before collapsing whitespace, so
// quoted statements join cleanly; keep `->` arrows intact (those `>` are mid-line).
const norm = (text) => text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");

const DOC_PATH = "docs/strategy/fresh-repo-intent-handoff-circe-dogfood-review-semantic.md";
const PACKET_PATH = ".rekon-dev/review-packets/fresh-repo-intent-handoff-circe-dogfood-review-semantic.md";
const doc = norm(read(DOC_PATH));
const changelog = read("CHANGELOG.md");
const packet = read(PACKET_PATH);

test("1. dogfood review doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, DOC_PATH)));
});

test("2. doc says the fresh repo rough-plan path works through review -> answer -> prepare -> approval -> status -> handoff -> bundle", () => {
  assert.ok(doc.includes("fresh repo rough-plan path works through review -> answer -> prepare -> approval -> status -> handoff -> bundle"));
});

test("3. doc says semantic auto fallback is proven when provider is unavailable", () => {
  assert.ok(doc.includes("semantic auto fallback is proven when provider is unavailable"));
});

test("4. doc says semantic required fails cleanly when provider is unavailable", () => {
  assert.ok(doc.includes("semantic required fails cleanly when provider is unavailable"));
});

test("5. doc says Rekon does not execute verification commands", () => {
  assert.ok(doc.includes("rekon does not execute verification commands"));
});

test("6. doc says Rekon does not write source files or plan files", () => {
  assert.ok(doc.includes("rekon does not write source files or plan files"));
});

test("7. doc says Rekon does not run Circe during bundle generation", () => {
  assert.ok(doc.includes("rekon does not run circe during bundle generation"));
});

test("8. doc says Circe projection is emitted", () => {
  assert.ok(doc.includes("circe projection is emitted"));
});

test("9. doc says proof sidecar carries or references approval/proof state", () => {
  assert.ok(doc.includes("proof sidecar carries or references approval/proof state"));
});

test("10. doc says phase verification posture is explicit", () => {
  assert.ok(doc.includes("phase verification posture is explicit"));
});

test("11. doc says intent:go remains deferred", () => {
  assert.ok(doc.includes("intent:go remains deferred"));
});

test("12. doc says the dogfood review does not introduce a new boundary; it reviews the already-shipped path", () => {
  assert.ok(doc.includes("the dogfood review does not introduce a new execution/source-write/circe boundary; it reviews the already-shipped public path end-to-end"));
});

test("13. CHANGELOG mentions Fresh Repo Intent Handoff / Circe Dogfood Review", () => {
  assert.match(changelog, /Fresh Repo Intent Handoff \/ Circe Dogfood Review/);
});

test("14. review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});
