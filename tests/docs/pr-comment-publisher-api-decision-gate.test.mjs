// Docs contract tests for the PR Comment Publisher API
// Decision Gate (step 7c of the CI / GitHub adapter
// implementation sequence pinned by
// docs/strategy/verification-runner-ci-github-decision.md).

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const memoPath = join(
  repoRoot,
  "docs",
  "strategy",
  "pr-comment-publisher-api-decision-gate.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "pr-comment-publisher-api-decision-gate.md",
);

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function readMemoFlat() {
  const content = await readFile(memoPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: memo exists ----------

test("PR comment API decision gate doc exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("decision gate memo contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "## Decision Summary",
    "## Why This Gate Exists",
    "## Current PR Comment Dry-Run State",
    "## Permission Model Review",
    "## Fork And Event Safety Review",
    "## Comment Body Review",
    "## Idempotency And Noise Review",
    "## Options Considered",
    "## Recommendation",
    "## Canonical Artifact Boundary",
    "## What This Does Not Do",
    "## Implementation Sequence",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `decision gate memo missing required heading: ${heading}`,
    );
  }
});

// ---------- 3: recommends Option C ----------

test("decision gate memo recommends Option C", async () => {
  const content = await readMemo();
  assert.match(content, /Option C/);
  assert.match(
    content,
    /(Recommendation: Option C|Adopt Option C|Option C[^a-zA-Z].{0,200}(Recommended|\*\*Recommended\*\*))/i,
  );
});

// ---------- 4: actual posting deferred ----------

test("memo says actual PR comment posting remains deferred", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Actual PR comment posting remains deferred/i,
  );
});

// ---------- 5: profile before API writer ----------

test("memo says workflow/validator profile comes before API writer", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /(boundary first|profile gate first|profile.{0,60}before.{0,60}API|workflow.{0,60}before.{0,60}API|profile.{0,40}next.{0,200}API writer.{0,200}later)/i,
  );
});

// ---------- 6: comments not canonical truth ----------

test("memo says PR comments are not canonical truth", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /PR comments are not canonical truth|GitHub comments are not canonical truth/i,
  );
});

// ---------- 7: artifacts canonical ----------

test("memo says Rekon artifacts remain canonical", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /Rekon artifacts remain canonical/i);
});

// ---------- 8: marker is not proof ----------

test("memo says the idempotency marker is not proof", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /(idempotency )?marker is not proof|marker.{0,40}not proof/i);
});

// ---------- 9: references buildPrCommentBody ----------

test("memo references buildPrCommentBody", async () => {
  const content = await readMemo();
  assert.match(content, /buildPrCommentBody/);
});

// ---------- 10: references assessPrCommentPublisherReadiness ----------

test("memo references assessPrCommentPublisherReadiness", async () => {
  const content = await readMemo();
  assert.match(content, /assessPrCommentPublisherReadiness/);
});

// ---------- 11: references publish pr-comment --dry-run ----------

test("memo references `publish pr-comment --dry-run`", async () => {
  const content = await readMemo();
  assert.match(content, /publish pr-comment\s+--dry-run/i);
});

// ---------- 12: references issues: write ----------

test("memo references `issues: write`", async () => {
  const content = await readMemo();
  assert.match(content, /issues:\s*write/i);
});

// ---------- 13: references pull-requests: write ----------

test("memo references `pull-requests: write`", async () => {
  const content = await readMemo();
  assert.match(content, /pull-requests:\s*write/i);
});

// ---------- 14: forked PRs default-deny ----------

test("memo says forked PRs must not receive secret-bearing comment publishing by default", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Forked PRs must not receive secret-bearing comment publishing by default/i,
  );
});

// ---------- 15: component table ----------

test("memo includes the component status table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Component\s*\|\s*Status\s*\|\s*Notes\s*\|/,
    /buildPrCommentBody[\s\S]{0,80}shipped/,
    /assessPrCommentPublisherReadiness[\s\S]{0,80}shipped/,
    /publish pr-comment --dry-run[\s\S]{0,80}shipped/,
    /API writer[\s\S]{0,80}not shipped/,
    /workflow.{0,40}validator profile[\s\S]{0,80}not shipped/i,
  ]) {
    assert.match(content, row, `component table missing row matching ${row}`);
  }
});

// ---------- 16: risk table ----------

test("memo includes the risk table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Risk\s*\|\s*Current Guardrail\s*\|\s*Remaining Follow-Up\s*\|/,
    /comment spam/i,
    /stale comment/i,
    /fork token misuse/i,
    /comment treated as proof/i,
  ]) {
    assert.match(content, row, `risk table missing row matching ${row}`);
  }
});

// ---------- 17: CHANGELOG mention ----------

test("CHANGELOG mentions the PR comment publisher API decision gate", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(pr-comment-publisher-api-decision-gate|PR comment publisher API decision gate|API decision gate)/i,
  );
});

// ---------- 18: review packet PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const content = await readFile(reviewPacketPath, "utf8");
  assert.match(content, /## PURPOSE PRESERVATION CHECK/);
});
