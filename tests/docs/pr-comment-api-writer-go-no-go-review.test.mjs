// Docs contract tests for the PR Comment API Writer Go/No-Go
// Review (step 7e of the CI / GitHub adapter implementation
// sequence pinned by
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
  "pr-comment-api-writer-go-no-go-review.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "pr-comment-api-writer-go-no-go-review.md",
);

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function readMemoFlat() {
  const content = await readFile(memoPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: memo exists ----------

test("PR comment API writer go/no-go review memo exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("go/no-go review memo contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Components Reviewed",
    "## Permission Model Review",
    "## Endpoint Model Review",
    "## Idempotency And Noise Review",
    "## Fork And Event Safety Review",
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
      `go/no-go review memo missing required heading: ${heading}`,
    );
  }
});

// ---------- 3: recommends Go / Option B ----------

test("go/no-go review recommends Go (Option B)", async () => {
  const content = await readMemo();
  const flat = await readMemoFlat();
  assert.match(content, /Option B/);
  assert.match(
    flat,
    /(Go.{0,20}adopt Option B|Recommendation: Go|Adopt Option B)/i,
  );
});

// ---------- 4: endpoint pinned to issue-comment endpoints ----------

test("memo pins the endpoint to GitHub issue-comment endpoints", async () => {
  const content = await readMemo();
  assert.match(content, /issue[- ]comment/i);
  assert.match(
    content,
    /\/repos\/\{owner\}\/\{repo\}\/issues\/\{[^}]+\}\/comments/,
  );
});

// ---------- 5: permission pinned to pull-requests: write ----------

test("memo pins the permission to `pull-requests: write`", async () => {
  const content = await readMemo();
  assert.match(content, /pull-requests:\s*write/i);
});

// ---------- 6: marker pinned ----------

test("memo pins the idempotency marker `<!-- rekon:pr-comment:v1 -->`", async () => {
  const content = await readMemo();
  assert.match(content, /<!--\s*rekon:pr-comment:v1\s*-->/);
});

// ---------- 7: canonical-truth language ----------

test("memo says PR comments are not canonical truth and artifacts remain canonical", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /PR comments are not canonical truth|GitHub comments are not canonical truth/i,
  );
  assert.match(flat, /Rekon artifacts remain canonical/i);
});

// ---------- 8: marker is not proof ----------

test("memo says the idempotency marker is not proof", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /(idempotency )?marker is not proof|marker.{0,60}not proof|not proof[;,].{0,80}update-in-place handle/i,
  );
});

// ---------- 9: forked PRs denied by default ----------

test("memo says forked PRs remain denied by default", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /Forked PRs remain denied by default/i);
});

// ---------- 10: pull_request_target denied unconditionally ----------

test("memo says pull_request_target remains denied unconditionally", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /pull_request_target.{0,40}(remains denied unconditionally|denied unconditionally|unconditional-deny|unconditionally denied)/i,
  );
});

// ---------- 11: no --send implementation in this batch ----------

test("memo says this batch does NOT implement publish pr-comment --send", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /(does not|do not|Does NOT).{0,80}(Implement|implement).{0,40}publish pr-comment --send|Implement.{0,40}rekon publish pr-comment --send.{0,200}(does not|future|future slice|next slice|step 7f)/i,
  );
});

// ---------- 12: no GitHub API call in this batch ----------

test("memo says this batch makes no GitHub API call", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /No GitHub API call|no GitHub API call|Add.{0,30}any GitHub API call|does not.{0,60}GitHub API/i,
  );
});

// ---------- 13: references the prior PR comment slices ----------

test("memo references the prior PR comment slices (7a/7b/7d) by name", async () => {
  const content = await readMemo();
  assert.match(content, /buildPrCommentBody/);
  assert.match(content, /assessPrCommentPublisherReadiness/);
  assert.match(content, /publish pr-comment\s+--dry-run/i);
  assert.match(
    content,
    /rekon-pr-comment-send\.yml|docs\/examples\/workflows\/rekon-pr-comment-send/,
  );
  assert.match(content, /github-pr-comment-send/i);
});

// ---------- 14: component status table ----------

test("memo includes the component status table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Step\s*\|\s*Slice\s*\|\s*Status\s*\|/,
    /7a[\s\S]{0,80}(Decision memo|decision memo)[\s\S]{0,40}Shipped/i,
    /7b[\s\S]{0,80}(Dry-run|dry-run)[\s\S]{0,40}Shipped/i,
    /7d[\s\S]{0,80}(Workflow|workflow|validator)[\s\S]{0,80}Shipped/i,
    /7e[\s\S]{0,80}(Go\/no-go|review)[\s\S]{0,80}Shipped/i,
    /7f[\s\S]{0,80}(API writer|publish pr-comment --send)/i,
  ]) {
    assert.match(content, row, `component status table missing row matching ${row}`);
  }
});

// ---------- 15: permission table ----------

test("memo includes the permission diagnostic table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Surface\s*\|\s*Permission\s*\|\s*Status\s*\|/,
    /GitHub Check[\s\S]{0,40}checks:\s*write/i,
    /PR comment[\s\S]{0,80}pull-requests:\s*write/i,
    /(Existing read-only|read-only).{0,80}contents:\s*read/i,
  ]) {
    assert.match(content, row, `permission table missing row matching ${row}`);
  }
});

// ---------- 16: risk table ----------

test("memo includes the risk diagnostic table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Risk\s*\|\s*Current Guardrail\s*\|\s*Remaining Follow-Up\s*\|/,
    /comment spam/i,
    /stale comment/i,
    /fork token misuse/i,
    /endpoint permission mismatch/i,
  ]) {
    assert.match(content, row, `risk table missing row matching ${row}`);
  }
});

// ---------- 17: CHANGELOG mention ----------

test("CHANGELOG mentions the PR comment API writer go/no-go review", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(pr-comment-api-writer-go-no-go-review|PR comment API writer go\/no-go review|PR comment.{0,40}go\/no-go review)/i,
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
