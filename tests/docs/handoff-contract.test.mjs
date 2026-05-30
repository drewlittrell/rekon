// Docs tests for HandoffContract v1 (sixty-fifth slice on the
// capability-ontology track).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

function read(rel) {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

function normalize(text) {
  return text.replace(/[`*]/g, "").replace(/\s+/g, " ");
}

const artifactDoc = "docs/artifacts/handoff-contract.md";
const conceptDoc = "docs/concepts/handoff-contract.md";
const reviewPacket = ".rekon-dev/review-packets/handoff-contract-v1.md";

test("artifact doc exists", () => {
  assert.match(read(artifactDoc), /#\s*HandoffContract/);
});

test("concept doc exists", () => {
  assert.match(read(conceptDoc), /handoff contract/i);
});

test("docs say HandoffContract is declared baton policy", () => {
  assert.match(normalize(read(artifactDoc)), /HandoffContract is declared baton policy/);
});

test("docs say HandoffContract is not StepCapabilityGraph topology", () => {
  assert.match(normalize(read(artifactDoc)), /HandoffContract is not StepCapabilityGraph topology/);
});

test("docs say HandoffContract v1 does not evaluate coverage", () => {
  assert.match(normalize(read(artifactDoc)), /HandoffContract v1 does not evaluate coverage/);
});

test("docs say HandoffContract v1 does not read runtime events", () => {
  assert.match(normalize(read(artifactDoc)), /HandoffContract v1 does not read runtime events/);
});

test("docs say HandoffContract v1 does not detect runtime graph drift", () => {
  assert.match(normalize(read(artifactDoc)), /HandoffContract v1 does not detect runtime graph drift/);
});

test("docs say HandoffContract v1 does not create WorkOrder / VerificationPlan", () => {
  assert.match(normalize(read(artifactDoc)), /HandoffContract v1 does not create WorkOrder \/ VerificationPlan/);
});

test("docs say config is optional and never mutated", () => {
  assert.match(normalize(read(artifactDoc)), /Config is optional and never mutated/);
});

test("CHANGELOG mentions HandoffContract v1", () => {
  assert.match(normalize(read("CHANGELOG.md")), /HandoffContract v1/);
});

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});
