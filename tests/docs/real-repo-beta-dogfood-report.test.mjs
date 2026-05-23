// Docs contract tests for the Real-Repo Beta Dogfood
// Report — executes the CLI against a temp copy of the
// Rekon repository itself and records the results.

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
  "real-repo-beta-dogfood-report.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "real-repo-beta-dogfood.md",
);

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function readMemoFlat() {
  const content = await readFile(memoPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: report doc exists ----------

test("real-repo beta dogfood report exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("dogfood report contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "## Decision Summary",
    "## Target Repository",
    "## Pre-Dogfood Verification",
    "## Dogfood Command Matrix",
    "## Artifact Results",
    "## Finding And Issue Results",
    "## Verification Results",
    "## Publication Results",
    "## GitHub Review Dry-Runs",
    "## Workflow Validator Results",
    "## Known Limitations Observed",
    "## Dogfood Decision",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `dogfood report missing required heading: ${heading}`,
    );
  }
});

// ---------- 3: does not publish to npm ----------

test("report says this batch does not publish to npm", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /This batch does not publish to npm/i);
});

// ---------- 4: does not change package versions ----------

test("report says this batch does not change package versions", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /This batch does not change package versions/i);
});

// ---------- 5: does not create a git tag ----------

test("report says this batch does not create a git tag", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /This batch does not create a git tag/i);
});

// ---------- 6: does not create a GitHub Release ----------

test("report says this batch does not create a GitHub Release", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /This batch does not create a GitHub Release/i);
});

// ---------- 7: dogfood used temp copy of a real repository ----------

test("report says dogfood used temp copy of a real repository", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /dogfood run used a temp copy of a real repository/i,
  );
});

// ---------- 8: next publish step requires explicit operator authorization ----------

test("report says next publish step requires explicit operator authorization", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /next publish step (still )?requires explicit operator authorization/i,
  );
});

// ---------- 9: pre-dogfood verification table ----------

test("report includes the pre-dogfood verification table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Command\s*\|\s*Result\s*\|/,
    /`npm run typecheck`\s*\|\s*pass/i,
    /`npm run test`\s*\|\s*pass/i,
    /`npm run build`\s*\|\s*pass/i,
    /`git diff --check`\s*\|\s*pass/i,
    /`node scripts\/audit-package-exports\.mjs`\s*\|\s*pass/i,
    /`node scripts\/audit-license\.mjs`\s*\|\s*pass/i,
    /`node scripts\/publish-dry-run\.mjs`\s*\|\s*pass/i,
    /`node scripts\/install-smoke\.mjs`\s*\|\s*pass/i,
    /`node scripts\/install-tarball-smoke\.mjs`\s*\|\s*pass/i,
  ]) {
    assert.match(
      content,
      row,
      `pre-dogfood verification table missing row matching ${row}`,
    );
  }
});

// ---------- 10: dogfood command table ----------

test("report includes the dogfood command table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Command ?\/ ?Flow\s*\|\s*Result\s*\|\s*Notes\s*\|/i,
    /`init`/,
    /`refresh`/,
    /`artifacts validate`/,
    /`findings filter`/,
    /`issues adjudicate`/,
    /`coherency delta`/,
    /`publish proof`/,
    /`publish architecture`/,
    /`publish agent-contract`/,
    /`resolve preflight/,
    /`intent work-order/,
    /`verify run --dry-run`/,
    /\*\*`verify run --execute`\*\*/,
    /`verify result from-run`/,
    /\*\*`publish github-check --dry-run`\*\*/,
    /`publish pr-comment --dry-run`/,
    /`verify github-workflow validate.+read-only`/,
    /`verify github-workflow validate.+github-check-send`/,
    /`verify github-workflow validate.+github-pr-comment-send`/,
  ]) {
    assert.match(
      content,
      row,
      `dogfood command table missing row matching ${row}`,
    );
  }
});

// ---------- 11: artifact summary table ----------

test("report includes the artifact summary table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Artifact Family ?\/ ?Type\s*\|\s*Count\s*\|\s*Notes\s*\|/i,
    /`EvidenceGraph`\s*\|\s*\d+/,
    /`FindingReport`\s*\|\s*\d+/,
    /`VerificationRun`\s*\|\s*\d+/,
    /`VerificationResult`\s*\|\s*\d+/,
    /`Publication`\s*\|\s*\d+/,
  ]) {
    assert.match(
      content,
      row,
      `artifact summary table missing row matching ${row}`,
    );
  }
});

// ---------- 12: known limitations table ----------

test("report includes the known limitations table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Limitation\s*\|\s*Observed\?\s*\|\s*Notes\s*\|/i,
    /source-write apply unavailable/i,
    /watcher daemon unavailable/i,
    /GitHub writes opt-in only/i,
    /aggregate freshness historical stale entries/i,
  ]) {
    assert.match(
      content,
      row,
      `known limitations table missing row matching ${row}`,
    );
  }
});

// ---------- 13: Dogfood Decision recorded ----------

test("report records the Dogfood Decision", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /(Dogfood Decision: )?(Classification: )?`?(pass|pass-with-known-limitations|blocked)`?/i,
  );
  // Also confirm the explicit decision summary states one of the three classifications
  assert.match(
    flat,
    /pass-with-known-limitations|pass|blocked/i,
  );
});

// ---------- 14: CHANGELOG mention ----------

test("CHANGELOG mentions the real-repo dogfood", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(real-repo-beta-dogfood|Real-Repo Beta Dogfood|real-repo dogfood|real-repo beta dogfood)/i,
  );
});

// ---------- 15: review packet PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const content = await readFile(reviewPacketPath, "utf8");
  assert.match(content, /## PURPOSE PRESERVATION CHECK/);
});
