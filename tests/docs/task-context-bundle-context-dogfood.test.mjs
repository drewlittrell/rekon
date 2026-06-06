// Docs tests for the TaskContextReport Bundle Context Dogfood (slice 185).
// Locks the dogfood findings: the optional bundle-context sidecars are useful and
// discoverable, and every boundary held (Circe unchanged, gates unchanged, no
// source write / command / VerificationRun / VerificationResult / Circe / intent:go).

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

const MEMO = "docs/strategy/task-context-report-bundle-context-dogfood.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-bundle-context-dogfood.md";

const memoRaw = read(MEMO);
const memo = norm(memoRaw);
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

// 1
test("dogfood review doc exists", () => {
  assert.ok(memoRaw.length > 0);
});

// 2
test("docs say bundle write succeeded with --task-context-ref", () => {
  assert.ok(memo.includes("bundle write succeeded with --task-context-ref"));
});

// 3
test("docs say manifest.context.taskContextReports was discoverable", () => {
  assert.ok(memo.includes("manifest.context.taskcontextreports was discoverable"));
});

// 4
test("docs say context/task-context.md was useful to a human operator", () => {
  assert.ok(memo.includes("context/task-context.md was useful to a human operator"));
});

// 5
test("docs say context/task-context.agent.json was useful to an agent", () => {
  assert.ok(memo.includes("context/task-context.agent.json was useful to an agent"));
});

// 6
test("docs say context/task-context.refs.json was useful for traceability", () => {
  assert.ok(memo.includes("context/task-context.refs.json was useful for traceability"));
});

// 7
test("docs say bundle JSON reported taskContext sidecars", () => {
  assert.ok(memo.includes("bundle json reported taskcontext sidecars"));
});

// 8
test("docs say Circe handoff JSON remains unchanged / not dependent on task context", () => {
  assert.ok(memo.includes("circe handoff json remains unchanged / not dependent on task context"));
});

// 9
test("docs say WorkOrder / VerificationPlan gates remain unchanged", () => {
  assert.ok(memo.includes("workorder / verificationplan gates remain unchanged"));
});

// 10
test("docs say phase gates remain unchanged", () => {
  assert.ok(memo.includes("phase gates remain unchanged"));
});

// 11
test("docs say source and plan files were unchanged", () => {
  assert.ok(memo.includes("source and plan files were unchanged"));
});

// 12
test("docs say no commands were executed", () => {
  assert.ok(memo.includes("no commands were executed"));
});

// 13
test("docs say no VerificationRun or VerificationResult was created", () => {
  assert.ok(memo.includes("no verificationrun or verificationresult was created"));
});

// 14
test("docs say Rekon did not run Circe", () => {
  assert.ok(memo.includes("rekon did not run circe"));
});

// 15
test("docs say intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 16
test("CHANGELOG mentions TaskContextReport Bundle Context Dogfood", () => {
  assert.ok(changelog.includes("taskcontextreport bundle context dogfood"));
});

// 17
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});
