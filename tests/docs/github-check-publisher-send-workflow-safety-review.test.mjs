// Docs contract tests for the GitHub Check publisher send
// workflow safety review (step 6e of the CI / GitHub adapter
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
  "github-check-publisher-send-workflow-safety-review.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "github-check-publisher-send-workflow-safety-review.md",
);

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function readMemoFlat() {
  const content = await readFile(memoPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: memo exists ----------

test("safety review doc exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("safety review doc contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Components Reviewed",
    "## Pinned Safety Facts",
    "## Workflow Template Review",
    "## Validator Profile Review",
    "## Send CLI Review",
    "## Token And Permission Review",
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

// ---------- 3: recommends beta-ready opt-in ----------

test("safety review recommends beta-ready opt-in GitHub Check send", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /beta-ready/i);
  assert.match(flat, /opt-in/i);
});

// ---------- 4: read-only templates remain alpha default ----------

test("safety review says read-only templates remain alpha default", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /read-only[\s\S]{0,80}(alpha default|alpha-default|alpha)/i);
});

// ---------- 5: canonical-truth language ----------

test("safety review says GitHub status is not canonical truth", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /GitHub status is not canonical truth/i);
});

// ---------- 6: Rekon artifacts canonical ----------

test("safety review says Rekon artifacts remain canonical", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /Rekon artifacts remain canonical/i);
});

// ---------- 7: forked PRs blocked by default ----------

test("safety review says forked PRs remain blocked by default", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Forked.{0,80}(blocked|deny|denied|refus|not.{0,20}trusted).{0,40}default/i,
  );
});

// ---------- 8: pull_request_target blocked ----------

test("safety review says pull_request_target remains blocked", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /pull_request_target.{0,80}(blocked|deny|denied|refus|unconditional)/i,
  );
});

// ---------- 9: PR comments deferred ----------

test("safety review says PR comments remain deferred", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /PR comments[\s\S]{0,80}(defer|deferred)/i);
});

// ---------- 10: references dry-run CLI ----------

test("safety review references the dry-run CLI", async () => {
  const content = await readMemo();
  assert.match(content, /rekon publish github-check\s+--dry-run/);
});

// ---------- 11: references send CLI ----------

test("safety review references the send CLI", async () => {
  const content = await readMemo();
  assert.match(content, /rekon publish github-check\s+--send/);
});

// ---------- 12: references validator profiles ----------

test("safety review references the validator profiles", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /--profile\s+read-only/);
  assert.match(flat, /--profile\s+github-check-send|github-check-send/);
});

// ---------- 13: references opt-in checks-write workflow ----------

test("safety review references the checks-write opt-in workflow", async () => {
  const content = await readMemo();
  assert.match(content, /rekon-verification-check-send\.yml/);
  assert.match(content, /checks:\s*write/i);
});

// ---------- 14: no automatic finding resolution ----------

test("safety review says no automatic finding resolution is implied", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /No automatic finding resolution[\s\S]{0,80}(implied|imply)|never.{0,60}(resolves|auto-resolve).{0,80}findings/i,
  );
});

// ---------- 15: CHANGELOG mentions the safety review ----------

test("CHANGELOG mentions the safety review", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(github-check-publisher-send-workflow-safety-review|GitHub Check publisher send workflow safety review|safety review)/i,
    "CHANGELOG must mention the safety review",
  );
});

// ---------- 16: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const content = await readFile(reviewPacketPath, "utf8");
  assert.match(content, /## PURPOSE PRESERVATION CHECK/);
});
