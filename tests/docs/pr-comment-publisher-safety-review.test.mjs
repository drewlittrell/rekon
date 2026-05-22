// Docs contract tests for the PR Comment Publisher Safety
// Review (step 7g of the CI / GitHub adapter implementation
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
  "pr-comment-publisher-safety-review.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "pr-comment-publisher-safety-review.md",
);

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function readMemoFlat() {
  const content = await readFile(memoPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: memo exists ----------

test("PR comment publisher safety review memo exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("safety review memo contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Components Reviewed",
    "## Pinned Safety Facts",
    "## Workflow Template Review",
    "## Validator Profile Review",
    "## Send CLI Review",
    "## API Writer Review",
    "## Idempotency And Noise Review",
    "## Token And Error Safety Review",
    "## Fork And Event Safety Review",
    "## Canonical Artifact Boundary",
    "## Beta Readiness Decision",
    "## Remaining Risks",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `safety review memo missing required heading: ${heading}`,
    );
  }
});

// ---------- 3: recommends beta-ready opt-in PR comment send ----------

test("memo recommends beta-ready opt-in PR comment send", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /beta-ready as an opt-in[\s\S]{0,80}(trusted-context|review surface|update-in-place)/i,
  );
});

// ---------- 4: GitHub Checks remain the primary status surface ----------

test("memo says GitHub Checks remain the primary status surface", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /GitHub Checks? remain the (primary )?(status )?surface|GitHub Checks? remain the primary status surface/i,
  );
});

// ---------- 5: PR comments are a narrative companion surface ----------

test("memo says PR comments are a narrative companion surface", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /(PR comments are (the |a )?narrative companion surface|narrative companion surface)/i,
  );
});

// ---------- 6: PR comments are not canonical truth ----------

test("memo says PR comments are not canonical truth", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /PR comments are not canonical truth|GitHub comments are not canonical truth/i,
  );
});

// ---------- 7: Rekon artifacts remain canonical ----------

test("memo says Rekon artifacts remain canonical", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /Rekon artifacts remain canonical/i);
});

// ---------- 8: idempotency marker is not proof ----------

test("memo says the idempotency marker is not proof", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /(idempotency )?marker is not proof|marker.{0,60}not proof/i,
  );
});

// ---------- 9: forked PRs remain blocked by default ----------

test("memo says forked PRs remain blocked by default", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Forked PRs (and pull_request_target )?remain (blocked|denied) by default/i,
  );
});

// ---------- 10: pull_request_target remains blocked ----------

test("memo says pull_request_target remains blocked", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /pull_request_target.{0,60}(remains (blocked|denied)|blocked unconditionally|denied unconditionally|unconditional-deny|unconditionally)/i,
  );
});

// ---------- 11: no automatic finding resolution or reconciliation apply ----------

test("memo says no automatic finding resolution or reconciliation apply", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /No automatic finding resolution or reconciliation apply/i,
  );
});

// ---------- 12: references publishPrCommentRun ----------

test("memo references `publishPrCommentRun`", async () => {
  const content = await readMemo();
  assert.match(content, /publishPrCommentRun/);
});

// ---------- 13: references publish pr-comment --send ----------

test("memo references `publish pr-comment --send`", async () => {
  const content = await readMemo();
  assert.match(content, /publish pr-comment[\s\S]{0,40}--send/);
});

// ---------- 14: references github-pr-comment-send ----------

test("memo references `github-pr-comment-send`", async () => {
  const content = await readMemo();
  assert.match(content, /github-pr-comment-send/);
});

// ---------- 15: component table ----------

test("memo includes the component diagnostic table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Surface\s*\|\s*Status\s*\|\s*Notes\s*\|/,
    /body helper[\s\S]{0,80}shipped/i,
    /readiness helper[\s\S]{0,80}shipped/i,
    /dry-run CLI[\s\S]{0,80}(safe preview|no token)/i,
    /send CLI[\s\S]{0,80}(beta|readiness)/i,
    /API writer[\s\S]{0,80}shipped/i,
    /workflow template[\s\S]{0,80}(beta|workflow_dispatch)/i,
    /validator profile[\s\S]{0,80}(shipped|github-pr-comment-send)/i,
  ]) {
    assert.match(content, row, `component table missing row matching ${row}`);
  }
});

// ---------- 16: risk table ----------

test("memo includes the risk diagnostic table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Risk\s*\|\s*Current Guardrail\s*\|\s*Remaining Follow-Up\s*\|/,
    /duplicate comments/i,
    /stale comments/i,
    /fork token misuse/i,
    /token leakage/i,
    /comment treated as proof/i,
  ]) {
    assert.match(content, row, `risk table missing row matching ${row}`);
  }
});

// ---------- 17: CHANGELOG mention ----------

test("CHANGELOG mentions the PR comment publisher safety review", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(pr-comment-publisher-safety-review|PR comment publisher safety review|PR comment.{0,40}safety review)/i,
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
