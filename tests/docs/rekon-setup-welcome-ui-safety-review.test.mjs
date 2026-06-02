// Docs tests for the Rekon Setup / Welcome UI Safety Review (slice 119).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const memoRaw = read("docs/strategy/rekon-setup-welcome-ui-safety-review.md");
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/rekon-setup-welcome-ui-safety-review.md");

// ---------- 1 ----------
test("safety review doc exists with title", () => {
  assert.match(memoRaw, /# Rekon Setup \/ Welcome UI Safety Review/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const headings = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Implementation Reviewed",
    "## Welcome Command Review",
    "## Setup Command Review",
    "## Output Mode Review",
    "## Help Surface Review",
    "## Boundary Review",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const h of headings) assert.ok(memoRaw.includes(h), `missing heading: ${h}`);
});

// ---------- 3 ----------
test("doc says rekon welcome is explanatory, not action-taking", () => {
  assert.ok(memo.includes("rekon welcome is explanatory, not action-taking."));
});

// ---------- 4 ----------
test("doc says rekon setup is deterministic and non-interactive", () => {
  assert.ok(memo.includes("rekon setup is deterministic and non-interactive."));
});

// ---------- 5 ----------
test("doc says rekon setup does not run scan", () => {
  assert.ok(memo.includes("rekon setup does not run scan."));
});

// ---------- 6 ----------
test("doc says rekon setup does not create .rekon/ before scan", () => {
  assert.ok(memo.includes("rekon setup does not create .rekon/ before scan."));
});

// ---------- 7 ----------
test("doc says rekon setup does not generate docs, agent handoff, CI, or VerificationPlan", () => {
  assert.ok(memo.includes("rekon setup does not generate docs, agent handoff, CI, or VerificationPlan."));
});

// ---------- 8 ----------
test("doc says ASCII art never appears in --json output", () => {
  assert.ok(memo.includes("ASCII art never appears in --json output."));
});

// ---------- 9 ----------
test("doc says REKON_NO_BANNER suppresses banner output", () => {
  assert.ok(memo.includes("REKON_NO_BANNER suppresses banner output."));
});

// ---------- 10 ----------
test("doc says NO_COLOR suppresses ANSI color", () => {
  assert.ok(memo.includes("NO_COLOR suppresses ANSI color."));
});

// ---------- 11 ----------
test("doc says Non-TTY setup does not prompt", () => {
  assert.ok(memo.includes("Non-TTY setup does not prompt."));
});

// ---------- 12 ----------
test("doc says onboarding does not imply Rekon runs Circe", () => {
  assert.ok(memo.includes("Onboarding does not imply Rekon runs Circe."));
});

// ---------- 13 ----------
test("doc says onboarding does not imply Rekon executes commands or writes source files", () => {
  assert.ok(memo.includes("Onboarding does not imply Rekon executes commands or writes source files."));
});

// ---------- 14 ----------
test("doc says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred."));
});

// ---------- 15 ----------
test("doc includes the surface table", () => {
  assert.match(memoRaw, /\| Surface \| Status \| Safety Finding \|/);
});

// ---------- 16 ----------
test("doc includes the boundary table", () => {
  assert.match(memoRaw, /\| Boundary \| Decision \|/);
});

// ---------- 17 ----------
test("doc includes the output-mode table", () => {
  assert.match(memoRaw, /\| Mode \| V1 Behavior \|/);
});

// ---------- 18 ----------
test("doc includes the option table", () => {
  assert.match(memoRaw, /\| Option \| Decision \| Reason \|/);
});

// ---------- 19 ----------
test("CHANGELOG mentions Rekon Setup / Welcome UI Safety Review", () => {
  assert.ok(changelog.includes("Rekon Setup / Welcome UI Safety Review"));
});

// ---------- 20 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});
