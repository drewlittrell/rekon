// Docs tests for TaskContextReport Human/Agent Context Export (slice 177).
// Locks in the presentation contract and every boundary: the TaskContextReport
// artifact is canonical, the human markdown is a rendered view, the agent JSON
// agentContext block is the structured source of truth, and no approval /
// execution / source-write / WorkOrder / VerificationPlan / Circe boundary is
// crossed. intent:go stays deferred.

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

const MEMO = "docs/strategy/task-context-human-agent-export.md";
const PACKET = ".rekon-dev/review-packets/task-context-human-agent-export.md";

const memoRaw = read(MEMO);
const memo = norm(memoRaw);
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

const REQUIRED_HEADINGS = [
  "# TaskContextReport Human/Agent Context Export",
  "## Summary",
  "## Why This Exists",
  "## What Shipped",
  "## Human Markdown View",
  "## Agent JSON View",
  "## Boundary Model",
  "## Evidence Preservation",
  "## What This Does Not Do",
  "## Deferred Options",
  "## Verification",
  "## Next Step",
];

const PACKET_SECTIONS = [
  "## CHANGES MADE",
  "## PUBLIC API CHANGES",
  "## PURPOSE PRESERVATION CHECK",
  "## SOURCE REVIEW",
  "## HUMAN MARKDOWN OUTPUT",
  "## AGENT JSON OUTPUT",
  "## EVIDENCE REF PRESERVATION",
  "## BOUNDARY MODEL",
  "## CLI SMOKE",
  "## TESTS / VERIFICATION",
  "## INTENTIONALLY UNTOUCHED",
  "## RISKS / FOLLOW-UP",
  "## NEXT STEP",
];

// 1
test("memo exists", () => {
  assert.ok(memoRaw.length > 0);
});

// 2
test("memo contains all required headings", () => {
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(memoRaw.includes(heading), `missing heading: ${heading}`);
  }
});

// 3
test("memo says the TaskContextReport artifact is canonical", () => {
  assert.ok(memo.includes("the taskcontextreport artifact is canonical"));
});

// 4
test("memo says the human markdown is a rendered view", () => {
  assert.ok(memo.includes("the human markdown is a rendered view"));
});

// 5
test("memo says the agent JSON agentContext block is the structured source of truth", () => {
  assert.ok(memo.includes("the agent json agentcontext block is the structured source of truth"));
});

// 6
test("memo includes the 'Read this before editing.' notice", () => {
  assert.ok(memo.includes("read this before editing."));
});

// 7
test("memo says verification hints are hints, not executed commands", () => {
  assert.ok(memo.includes("verification hints are hints, not executed commands"));
});

// 8
test("memo says do-not-touch zones are guidance and context, not enforcement", () => {
  assert.ok(memo.includes("do-not-touch zones are guidance and context, not enforcement"));
});

// 9
test("memo says evidence refs are preserved", () => {
  assert.ok(memo.includes("evidence refs are preserved"));
});

// 10
test("memo says TaskContextReport must not approve plans", () => {
  assert.ok(memo.includes("taskcontextreport must not approve plans"));
});

// 11
test("memo says no commands are executed and no source files are written", () => {
  assert.ok(memo.includes("no commands are executed"));
  assert.ok(memo.includes("no source files are written"));
});

// 12
test("memo says no WorkOrder or VerificationPlan is created and no Circe is run", () => {
  assert.ok(memo.includes("no workorder or verificationplan is created"));
  assert.ok(memo.includes("no circe is run"));
});

// 13
test("memo says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 14
test("memo records that the --format flag and export command are deferred", () => {
  assert.ok(memo.includes("--format"));
  assert.ok(memo.includes("deferred"));
});

// 15
test("review packet exists with all 13 required sections", () => {
  assert.ok(packet.length > 0);
  for (const section of PACKET_SECTIONS) {
    assert.ok(packet.includes(section), `missing packet section: ${section}`);
  }
});

// 16
test("CHANGELOG references the human/agent context export", () => {
  assert.ok(changelog.includes("human/agent context export"));
});
