// Docs tests for the TaskContextReport Bundle Context Dogfood Safety Review (slice 186).
// Locks the review conclusion + boundary language for the slice-185 dogfood and the
// narrow bundle-README discoverability fix: optional context, not proof; sidecars
// useful + discoverable; README points to sidecars (guidance only) when context is
// attached and is omitted otherwise; Circe / gates unchanged; no source write /
// command / VerificationRun / VerificationResult / Circe / intent:go.

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

const MEMO = "docs/strategy/task-context-report-bundle-context-dogfood-safety-review.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-bundle-context-dogfood-safety-review.md";

const memoRaw = read(MEMO);
const memo = norm(memoRaw);
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

const REQUIRED_HEADINGS = [
  "# TaskContextReport Bundle Context Dogfood Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Dogfood Reviewed",
  "## Manifest Review",
  "## Sidecar Review",
  "## README Discoverability Review",
  "## Circe Handoff Review",
  "## Gate Review",
  "## Boundary Review",
  "## Options Considered",
  "## Recommendation",
  "## What This Does Not Do",
  "## Follow-Up Work",
];

// 1
test("safety review doc exists", () => {
  assert.ok(memoRaw.length > 0);
});

// 2
test("doc contains all required headings", () => {
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(memoRaw.includes(heading), `missing heading: ${heading}`);
  }
});

// 3
test("doc says TaskContextReport bundle context is optional context, not proof", () => {
  assert.ok(memo.includes("taskcontextreport bundle context is optional context, not proof"));
});

// 4
test("doc says the full bundle-context dogfood path completed successfully", () => {
  assert.ok(memo.includes("the full bundle-context dogfood path completed successfully"));
});

// 5
test("doc says manifest.context.taskContextReports was discoverable", () => {
  assert.ok(memo.includes("manifest.context.taskcontextreports was discoverable"));
});

// 6
test("doc says manifest.context.taskContextReports marks proof:false", () => {
  assert.ok(memo.includes("manifest.context.taskcontextreports marks proof:false"));
});

// 7
test("doc says manifest.context.taskContextReports marks role optional-agent-context", () => {
  assert.ok(memo.includes("manifest.context.taskcontextreports marks role optional-agent-context"));
});

// 8
test("doc says context/task-context.md was useful to a human operator", () => {
  assert.ok(memo.includes("context/task-context.md was useful to a human operator"));
});

// 9
test("doc says context/task-context.agent.json was useful to an agent", () => {
  assert.ok(memo.includes("context/task-context.agent.json was useful to an agent"));
});

// 10
test("doc says context/task-context.refs.json was useful for traceability", () => {
  assert.ok(memo.includes("context/task-context.refs.json was useful for traceability"));
});

// 11
test("doc says bundle JSON reported taskContext sidecars", () => {
  assert.ok(memo.includes("bundle json reported taskcontext sidecars"));
});

// 12
test("doc says the bundle README now points to the task-context sidecars when context is attached", () => {
  assert.ok(memo.includes("the bundle readme now points to the task-context sidecars when context is attached"));
});

// 13
test("doc says the README task-context section is guidance, not proof", () => {
  assert.ok(memo.includes("the readme task-context section is guidance, not proof"));
});

// 14
test("doc says the README task-context section is omitted when no TaskContextReport is attached", () => {
  assert.ok(memo.includes("the readme task-context section is omitted when no taskcontextreport is attached"));
});

// 15
test("doc says Circe handoff JSON remains unchanged / not dependent on task context", () => {
  assert.ok(memo.includes("circe handoff json remains unchanged / not dependent on task context"));
});

// 16
test("doc says WorkOrder / VerificationPlan gates remain unchanged", () => {
  assert.ok(memo.includes("workorder / verificationplan gates remain unchanged"));
});

// 17
test("doc says phase gates remain unchanged", () => {
  assert.ok(memo.includes("phase gates remain unchanged"));
});

// 18
test("doc says source and plan files were unchanged", () => {
  assert.ok(memo.includes("source and plan files were unchanged"));
});

// 19
test("doc says no commands were executed", () => {
  assert.ok(memo.includes("no commands were executed"));
});

// 20
test("doc says no VerificationRun or VerificationResult was created", () => {
  assert.ok(memo.includes("no verificationrun or verificationresult was created"));
});

// 21
test("doc says Rekon did not run Circe", () => {
  assert.ok(memo.includes("rekon did not run circe"));
});

// 22
test("doc says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 23
test("doc includes surface table", () => {
  assert.ok(memoRaw.includes("| Surface | Dogfood Finding | Safety Finding |"));
});

// 24
test("doc includes boundary table", () => {
  assert.ok(memoRaw.includes("| Boundary | Review Finding |"));
});

// 25
test("doc includes finding table", () => {
  assert.ok(memoRaw.includes("| Finding | Severity | Resolution |"));
});

// 26
test("doc includes option table", () => {
  assert.ok(memoRaw.includes("| Option | Decision | Reason |"));
});

// 27
test("CHANGELOG mentions TaskContextReport Bundle Context Dogfood Safety Review", () => {
  assert.ok(changelog.includes("taskcontextreport bundle context dogfood safety review"));
});

// 28
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});
