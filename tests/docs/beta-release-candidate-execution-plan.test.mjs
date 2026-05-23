// Docs contract tests for the Beta Release Candidate
// Execution Plan — executes the pinned checklist against
// main and records the results.

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
  "beta-release-candidate-execution-plan.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "beta-release-candidate-execution-plan.md",
);

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function readMemoFlat() {
  const content = await readFile(memoPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: execution plan doc exists ----------

test("beta release candidate execution plan memo exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("execution plan memo contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "## Decision Summary",
    "## Release Candidate SHA",
    "## Package And Version State",
    "## Mandatory Verification Results",
    "## CLI Smoke Matrix Results",
    "## Known Beta Limitations",
    "## Release Stop Conditions",
    "## Beta Version Recommendation",
    "## Release Work Order Preview",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `execution plan memo missing required heading: ${heading}`,
    );
  }
});

// ---------- 3: release candidate qualifies ----------

test("memo says current main SHA qualifies as a beta release candidate", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /current `?main`? SHA qualifies as a beta release candidate/i,
  );
});

// ---------- 4: this batch does not publish to npm ----------

test("memo says this batch does not publish to npm", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /does not publish to npm/i);
});

// ---------- 5: this batch does not bump versions ----------

test("memo says this batch does not bump versions", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /does not bump versions/i);
});

// ---------- 6: this batch does not tag a release ----------

test("memo says this batch does not tag a release", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /does not tag a release/i);
});

// ---------- 7: recommends beta version ----------

test("memo recommends beta version 0.1.0-beta.0", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Recommended beta version[\s\S]{0,80}0\.1\.0-beta\.0/i,
  );
});

// ---------- 8: git state table ----------

test("memo includes the git state table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Ref\s*\|\s*SHA\s*\|/,
    /\|\s*HEAD\s*\|\s*[0-9a-f]{40}\s*\|/i,
    /\|\s*main\s*\|\s*[0-9a-f]{40}\s*\|/i,
    /\|\s*origin\/main\s*\|\s*[0-9a-f]{40}\s*\|/i,
  ]) {
    assert.match(content, row, `git state table missing row matching ${row}`);
  }
});

// ---------- 9: mandatory verification table ----------

test("memo includes the mandatory verification table", async () => {
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
    assert.match(content, row, `mandatory verification table missing row matching ${row}`);
  }
});

// ---------- 10: CLI smoke matrix table ----------

test("memo includes the CLI smoke matrix table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Smoke\s*\|\s*Result\s*\|\s*Notes\s*\|/,
    /`refresh`/,
    /`verify run --dry-run`/,
    /`verify run --execute`/,
    /`verify result from-run`/,
    /`publish proof`/,
    /`publish architecture`/,
    /`publish agent-contract`/,
    /`publish github-check --dry-run`/,
    /`publish pr-comment --dry-run`/,
    /`verify github-workflow validate.*read-only`/,
    /`verify github-workflow validate.*github-check-send`/,
    /`verify github-workflow validate.*github-pr-comment-send`/,
    /`artifacts validate`/,
    /`artifacts freshness`/,
  ]) {
    assert.match(content, row, `CLI smoke matrix missing row matching ${row}`);
  }
});

// ---------- 11: known limitations table ----------

test("memo includes the known limitations table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Limitation\s*\|\s*Status\s*\|/,
    /source-write apply\s*\|\s*not available/i,
    /watcher daemon\s*\|\s*not available/i,
    /hosted GitHub App\s*\|\s*not available/i,
    /active workflows\s*\|\s*not installed automatically/i,
    /GitHub writes\s*\|\s*opt-in only/i,
    /Windows process-tree kill\s*\|\s*direct-child-only/i,
    /full classic parity\s*\|\s*not claimed/i,
  ]) {
    assert.match(content, row, `known limitations table missing row matching ${row}`);
  }
});

// ---------- 12: doc lists npm run typecheck ----------

test("memo lists npm run typecheck", async () => {
  const content = await readMemo();
  assert.match(content, /npm run typecheck/);
});

// ---------- 13: doc lists npm run test ----------

test("memo lists npm run test", async () => {
  const content = await readMemo();
  assert.match(content, /npm run test/);
});

// ---------- 14: doc lists npm run build ----------

test("memo lists npm run build", async () => {
  const content = await readMemo();
  assert.match(content, /npm run build/);
});

// ---------- 15: doc lists publish-dry-run ----------

test("memo lists publish-dry-run", async () => {
  const content = await readMemo();
  assert.match(content, /publish-dry-run/);
});

// ---------- 16: doc lists install-tarball-smoke ----------

test("memo lists install-tarball-smoke", async () => {
  const content = await readMemo();
  assert.match(content, /install-tarball-smoke/);
});

// ---------- 17: CHANGELOG mention ----------

test("CHANGELOG mentions the release candidate execution plan", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(beta-release-candidate-execution-plan|Beta Release Candidate Execution Plan|release candidate execution plan)/i,
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
