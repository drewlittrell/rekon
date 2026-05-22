// Docs contract tests for the Verification / GitHub
// Trust-Boundary Safety Review (step 10 of the CI / GitHub
// adapter implementation sequence pinned by
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
  "verification-github-trust-boundary-safety-review.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "verification-github-trust-boundary-safety-review.md",
);

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function readMemoFlat() {
  const content = await readFile(memoPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: memo exists ----------

test("verification / GitHub trust-boundary safety review memo exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("safety review memo contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Hardening Reviewed",
    "## Proof-Chain Coherence Review",
    "## Execution Output Bounds Review",
    "## Timeout Semantics Review",
    "## Environment Policy Review",
    "## GitHub API Error Bounds Review",
    "## Pull Request Head SHA Review",
    "## Canonical Artifact Boundary",
    "## Beta Stability Decision",
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

// ---------- 3: trust boundary is beta-stable after hardening ----------

test("memo says the verification / GitHub trust boundary is beta-stable after hardening", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /(verification \/ GitHub )?trust boundary is beta-stable( after the hardening)?/i,
  );
});

// ---------- 4: GitHub status and comments are not canonical truth ----------

test("memo says GitHub status and comments are not canonical truth", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /GitHub status and comments are not canonical truth/i,
  );
});

// ---------- 5: Rekon artifacts remain canonical ----------

test("memo says Rekon artifacts remain canonical", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /Rekon artifacts remain canonical/i);
});

// ---------- 6: VerificationResult and VerificationRun must remain chain-coherent ----------

test("memo says VerificationResult and VerificationRun must remain chain-coherent", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /VerificationResult and VerificationRun must remain chain-coherent/i,
  );
});

// ---------- 7: bounded stdout/stderr streaming capture ----------

test("memo references bounded stdout/stderr streaming capture", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /(bounded (stdout\/stderr|output) streaming capture|bounded streaming|bounded excerpt buffer|bounded sink)/i,
  );
});

// ---------- 8: POSIX process-tree kill ----------

test("memo references POSIX process-tree kill", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /(POSIX process-tree kill|POSIX process-group kill|process\.kill\(-pid)/i,
  );
});

// ---------- 9: Windows direct-child-only behavior ----------

test("memo references Windows direct-child-only behavior", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Windows .{0,40}direct-child-only|Windows timeout behavior is direct-child-only/i,
  );
});

// ---------- 10: NODE_OPTIONS removal ----------

test("memo references NODE_OPTIONS removal", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /NODE_OPTIONS (is |has been )?removed/i);
});

// ---------- 11: bounded GitHub API error-body reads ----------

test("memo references bounded GitHub API error-body reads", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /bounded GitHub API error.body|bounded error.body|64 KiB bounded/i,
  );
});

// ---------- 12: pull_request explicit head SHA ----------

test("memo references pull_request explicit head SHA", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /pull_request.{0,40}(explicit head SHA|requires (an? )?explicit head SHA|--head-sha|GITHUB_HEAD_SHA)/i,
  );
});

// ---------- 13: no auto-resolution language ----------

test("memo says a successful Check / comment does not imply findings are resolved", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /A successful GitHub Check or PR comment publish does not imply findings are resolved/i,
  );
});

// ---------- 14: hardening table ----------

test("memo includes the hardening diagnostic table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Fix\s*\|\s*Status\s*\|\s*Evidence\s*\|\s*Remaining Follow-Up\s*\|/,
    /Proof-chain coherence[\s\S]{0,80}shipped/i,
    /Bounded output capture[\s\S]{0,80}shipped/i,
    /Timeout semantics[\s\S]{0,80}shipped/i,
    /Environment policy[\s\S]{0,80}shipped/i,
    /GitHub error bounds[\s\S]{0,80}shipped/i,
    /PR head SHA policy[\s\S]{0,80}shipped/i,
  ]) {
    assert.match(content, row, `hardening table missing row matching ${row}`);
  }
});

// ---------- 15: risk table ----------

test("memo includes the risk diagnostic table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Risk\s*\|\s*Current Guardrail\s*\|\s*Remaining Follow-Up\s*\|/,
    /mixed proof chain/i,
    /memory exhaustion via output/i,
    /orphan child process/i,
    /env-based Node injection/i,
    /huge GitHub error body/i,
    /wrong PR SHA/i,
  ]) {
    assert.match(content, row, `risk table missing row matching ${row}`);
  }
});

// ---------- 16: beta decision table ----------

test("memo includes the beta decision diagnostic table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Criterion\s*\|\s*Result\s*\|/,
    /Coherent proof chain[\s\S]{0,40}pass/i,
    /Bounded execution logs[\s\S]{0,40}pass/i,
    /Token\/log safety[\s\S]{0,40}pass/i,
    /Timeout semantics documented[\s\S]{0,40}pass/i,
    /PR SHA policy safe[\s\S]{0,40}pass/i,
    /Canonical artifact boundary preserved[\s\S]{0,40}pass/i,
    /No auto-resolution[\s\S]{0,40}pass/i,
  ]) {
    assert.match(content, row, `beta decision table missing row matching ${row}`);
  }
});

// ---------- 17: CHANGELOG mention ----------

test("CHANGELOG mentions the verification / GitHub trust-boundary safety review", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(verification-github-trust-boundary-safety-review|verification \/ GitHub trust-boundary safety review|trust-boundary safety review)/i,
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
