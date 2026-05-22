// Docs contract tests for the GitHub Review Surfaces Parity
// Review (step 8 of the CI / GitHub adapter implementation
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
  "github-review-surfaces-parity-review.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "github-review-surfaces-parity-review.md",
);

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function readMemoFlat() {
  const content = await readFile(memoPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: memo exists ----------

test("GitHub review surfaces parity review memo exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("parity review memo contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Surfaces Reviewed",
    "## Workflow Template Review",
    "## Validator Profile Review",
    "## GitHub Check Surface Review",
    "## PR Comment Surface Review",
    "## Publication And Artifact Review",
    "## Fork Token And Permission Review",
    "## Canonical Artifact Boundary",
    "## Beta Completeness Decision",
    "## Remaining Risks",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `parity review memo missing required heading: ${heading}`,
    );
  }
});

// ---------- 3: GitHub review surface is beta-complete as opt-in ----------

test("memo says GitHub review surface is beta-complete as an opt-in surface", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /(GitHub review surface is beta-complete|beta-complete as an opt-in surface)/i,
  );
});

// ---------- 4: read-only templates remain alpha default ----------

test("memo says read-only templates remain the alpha default", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Read-only (templates|workflows) (remain|are) the (recommended )?alpha default|Read-only workflows remain the recommended starting point/i,
  );
});

// ---------- 5: GitHub Checks remain primary status surface ----------

test("memo says GitHub Checks remain the primary status surface", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /GitHub Checks? remain the primary status surface/i,
  );
});

// ---------- 6: PR comments are narrative companion surface ----------

test("memo says PR comments are the narrative companion surface", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /PR comments (remain|are) the narrative companion surface|narrative companion surface/i,
  );
});

// ---------- 7: GitHub status and comments are not canonical truth ----------

test("memo says GitHub status and comments are not canonical truth", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /GitHub status and comments are not canonical truth/i,
  );
});

// ---------- 8: Rekon artifacts remain canonical ----------

test("memo says Rekon artifacts remain canonical", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /Rekon artifacts remain canonical/i);
});

// ---------- 9: no auto-resolution / reconciliation apply ----------

test("memo says a successful Check / comment does not imply findings are resolved", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /A successful GitHub Check or PR comment publish does not imply findings are resolved/i,
  );
});

// ---------- 10: forked PRs blocked by default ----------

test("memo says forked PRs remain blocked by default", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Forked PRs (and `?pull_request_target`? )?remain blocked by default/i,
  );
});

// ---------- 11: references read-only workflow templates ----------

test("memo references the read-only workflow templates", async () => {
  const content = await readMemo();
  assert.match(content, /rekon-verification-dry-run\.yml/);
  assert.match(content, /rekon-verification\.yml/);
});

// ---------- 12: references GitHub Check workflow ----------

test("memo references the GitHub Check workflow template", async () => {
  const content = await readMemo();
  assert.match(content, /rekon-verification-check-send\.yml/);
});

// ---------- 13: references PR comment workflow ----------

test("memo references the PR comment workflow template", async () => {
  const content = await readMemo();
  assert.match(content, /rekon-pr-comment-send\.yml/);
});

// ---------- 14: references validator profiles ----------

test("memo references all three validator profiles", async () => {
  const content = await readMemo();
  assert.match(content, /\bread-only\b/i);
  assert.match(content, /github-check-send/);
  assert.match(content, /github-pr-comment-send/);
});

// ---------- 15: references uploaded .rekon/artifacts ----------

test("memo references uploaded `.rekon/artifacts`", async () => {
  const content = await readMemo();
  assert.match(content, /\.rekon\/artifacts/);
});

// ---------- 16: surface table ----------

test("memo includes the surface diagnostic table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Surface\s*\|\s*Role\s*\|\s*Status\s*\|\s*Notes\s*\|/,
    /read-only dry-run workflow[\s\S]{0,80}alpha default/i,
    /read-only execute workflow[\s\S]{0,80}alpha default/i,
    /GitHub Check workflow[\s\S]{0,80}beta opt-in/i,
    /PR comment workflow[\s\S]{0,80}beta opt-in/i,
    /uploaded artifacts[\s\S]{0,80}canonical/i,
    /job summary[\s\S]{0,80}(downstream|CI summary)/i,
  ]) {
    assert.match(content, row, `surface table missing row matching ${row}`);
  }
});

// ---------- 17: risk table ----------

test("memo includes the risk diagnostic table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Risk\s*\|\s*Current Guardrail\s*\|\s*Remaining Follow-Up\s*\|/,
    /GitHub status treated as truth/i,
    /comment noise/i,
    /fork token misuse/i,
    /stale proof/i,
    /raw log leakage/i,
  ]) {
    assert.match(content, row, `risk table missing row matching ${row}`);
  }
});

// ---------- 18: beta decision table ----------

test("memo includes the beta decision diagnostic table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Criterion\s*\|\s*Result\s*\|/,
    /Canonical artifacts preserved[\s\S]{0,40}pass/i,
    /Check status surface exists[\s\S]{0,40}pass/i,
    /Narrative PR surface exists[\s\S]{0,40}pass/i,
    /Read-only adoption path exists[\s\S]{0,40}pass/i,
    /Workflow safety validation exists[\s\S]{0,40}pass/i,
    /Fork.{0,40}posture preserved[\s\S]{0,40}pass/i,
    /Automatic resolution avoided[\s\S]{0,40}pass/i,
  ]) {
    assert.match(content, row, `beta decision table missing row matching ${row}`);
  }
});

// ---------- 19: CHANGELOG mention ----------

test("CHANGELOG mentions the GitHub review surfaces parity review", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(github-review-surfaces-parity-review|GitHub review surfaces parity review|GitHub review surface.{0,40}parity review)/i,
  );
});

// ---------- 20: review packet PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const content = await readFile(reviewPacketPath, "utf8");
  assert.match(content, /## PURPOSE PRESERVATION CHECK/);
});
