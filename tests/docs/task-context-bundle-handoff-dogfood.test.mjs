// Docs tests for the TaskContextReport Bundle Handoff Dogfood (slice 190, rebased to
// 4cc34b73). Locks the dogfood findings: the promoted handoff guidance is discoverable
// and useful from both the human-operator and the agent perspective; the new
// circe/actor-contracts artifacts are present and non-executing; and every boundary
// held (authoritative agent/verification.json + agent/source-refs.json, stable Circe
// handoff + gates, no source write / command / VerificationRun / VerificationResult /
// Circe / intent:go).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (relativePath) => readFileSync(resolve(repoRoot, relativePath), "utf8");
const norm = (text) =>
  text
    .replace(/^>\s?/gm, "")
    .toLowerCase()
    .replace(/[`*]/g, "")
    .replace(/\s+/g, " ");

const MEMO = "docs/strategy/task-context-report-bundle-handoff-dogfood.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-bundle-handoff-dogfood.md";

const memoRaw = read(MEMO);
const memo = norm(memoRaw);
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

// 1
test("dogfood review doc exists", () => {
  assert.ok(memoRaw.length > 0);
});

// 2
test("docs say a human can discover task context from README.md", () => {
  assert.ok(memo.includes("a human can discover task context from readme.md"));
});

// 3
test("docs say context/task-context.md was useful for a human operator", () => {
  assert.ok(memo.includes("context/task-context.md was useful for a human operator"));
});

// 4
test("docs say context/task-context.refs.json was useful for traceability", () => {
  assert.ok(memo.includes("context/task-context.refs.json was useful for traceability"));
});

// 5
test("docs say an agent can discover task context from agent/instructions.md", () => {
  assert.ok(memo.includes("an agent can discover task context from agent/instructions.md"));
});

// 6
test("docs say an agent can discover task context from agent/handoff.md", () => {
  assert.ok(memo.includes("an agent can discover task context from agent/handoff.md"));
});

// 7
test("docs say agent/context.json taskContext metadata was useful", () => {
  assert.ok(memo.includes("agent/context.json taskcontext metadata was useful"));
});

// 8
test("docs say context/task-context.agent.json was useful to an agent", () => {
  assert.ok(memo.includes("context/task-context.agent.json was useful to an agent"));
});

// 9
test("docs say agent/verification.json remains authoritative for verification posture", () => {
  assert.ok(memo.includes("agent/verification.json remains authoritative for verification posture"));
});

// 10
test("docs say agent/source-refs.json remains authoritative for source refs", () => {
  assert.ok(memo.includes("agent/source-refs.json remains authoritative for source refs"));
});

// 11
test("docs say Circe handoff JSON remains stable and independent of TaskContextReport", () => {
  assert.ok(memo.includes("circe handoff json remains stable and independent of taskcontextreport"));
});

// 12
test("docs say Circe actor-contract artifacts were present and non-executing", () => {
  assert.ok(memo.includes("circe actor-contract artifacts were present and non-executing"));
});

// 13
test("docs say WorkOrder / VerificationPlan gates remain authoritative", () => {
  assert.ok(memo.includes("workorder / verificationplan gates remain authoritative"));
});

// 14
test("docs say phase gates remain authoritative", () => {
  assert.ok(memo.includes("phase gates remain authoritative"));
});

// 15
test("docs say source and plan files were unchanged", () => {
  assert.ok(memo.includes("source and plan files were unchanged"));
});

// 16
test("docs say no commands were executed", () => {
  assert.ok(memo.includes("no commands were executed"));
});

// 17
test("docs say no VerificationRun or VerificationResult was created", () => {
  assert.ok(memo.includes("no verificationrun or verificationresult was created"));
});

// 18
test("docs say Rekon did not run Circe", () => {
  assert.ok(memo.includes("rekon did not run circe"));
});

// 19
test("docs say intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 20
test("CHANGELOG mentions TaskContextReport Bundle Handoff Dogfood", () => {
  assert.ok(changelog.includes("taskcontextreport bundle handoff dogfood"));
});

// 21
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(packet.includes("ACTOR CONTRACT REVIEW"));
});
