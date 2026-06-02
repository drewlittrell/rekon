// Documentation coverage for Fresh Repo Intent Handoff / Circe Dogfood Review (slice 136).

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const path = (rel) => resolve(repoRoot, rel);
const read = (rel) => readFileSync(path(rel), "utf8");
const norm = (rel) => read(rel).replace(/[`*]/g, "").replace(/\s+/g, " ").toLowerCase();

const DOC = "docs/strategy/fresh-repo-intent-handoff-circe-dogfood-review.md";
const PACKET = ".rekon-dev/review-packets/fresh-repo-intent-handoff-circe-dogfood-review.md";
const CHANGELOG = "CHANGELOG.md";

test("1. dogfood review doc exists", () => {
  assert.ok(existsSync(path(DOC)));
});
test("2. doc says the operator reaches a Circe-importable handoff from a rough plan", () => {
  assert.ok(norm(DOC).includes("from a rough plan to a circe-importable handoff"));
});
test("3. doc states the full path review → answer → prepare → approval → status → … → bundle", () => {
  assert.ok(norm(DOC).includes("review → answer → prepare → approval → status"));
});
test("4. doc says Rekon does not execute verification commands", () => {
  assert.ok(norm(DOC).includes("does not execute verification commands"));
});
test("5. doc says Rekon does not write source or plan files", () => {
  assert.ok(norm(DOC).includes("does not write source or plan files"));
});
test("6. doc says Rekon does not run Circe during bundle generation", () => {
  assert.ok(norm(DOC).includes("does not run circe during bundle generation"));
});
test("7. doc says the Circe projection is emitted by Rekon", () => {
  assert.ok(norm(DOC).includes("the bundle is a projection rekon emits"));
});
test("8. doc says the proof sidecar carries the approval/proof state", () => {
  assert.ok(norm(DOC).includes("sidecar carries the approval envelope"));
});
test("9. doc says phase verification posture is explicit", () => {
  assert.ok(norm(DOC).includes("phase verification posture is explicit"));
});
test("10. doc says intent:go remains deferred", () => {
  assert.ok(norm(DOC).includes("remains deferred behind its existing gate"));
});
test("11. doc carries the embedded safety-review sentence verbatim", () => {
  assert.ok(norm(DOC).includes("the dogfood review does not introduce a new execution/source-write/circe boundary; it reviews the already-shipped public path end-to-end."));
});
test("12. review packet exists and CHANGELOG names the dogfood review", () => {
  assert.ok(existsSync(path(PACKET)));
  assert.ok(norm(PACKET).includes("embedded safety review"));
  assert.ok(read(CHANGELOG).includes("Fresh Repo Intent Handoff / Circe Dogfood Review"));
});
