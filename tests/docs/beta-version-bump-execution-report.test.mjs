// Docs contract tests for the Beta Version Bump
// Execution Report — applies 0.1.0-beta.0 coherently and
// records the post-bump verification results.

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
  "beta-version-bump-execution-report.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "beta-version-bump.md",
);

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function readMemoFlat() {
  const content = await readFile(memoPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: report doc exists ----------

test("beta version bump execution report exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("execution report contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "## Decision Summary",
    "## Starting State",
    "## Version Applied",
    "## Package Version Matrix",
    "## Mandatory Verification Results",
    "## CLI Smoke Matrix Results",
    "## Publish Posture",
    "## Known Limitations",
    "## Release Work Order Preview",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `execution report missing required heading: ${heading}`,
    );
  }
});

// ---------- 3: 0.1.0-beta.0 applied ----------

test("report says 0.1.0-beta.0 has been applied", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Version `?0\.1\.0-beta\.0`? has been applied/i,
  );
});

// ---------- 4: workspace packages coherent ----------

test("report says all workspace packages are coherent at 0.1.0-beta.0", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /workspace packages \(20\)\s*\|\s*`?0\.1\.0-beta\.0`?\s*\|\s*pass/i,
  );
});

// ---------- 5: package-lock coherent ----------

test("report says package-lock is coherent at 0.1.0-beta.0", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /package-lock\s*\|\s*`?0\.1\.0-beta\.0`?\s*\|\s*pass/i,
  );
});

// ---------- 6: does not publish to npm ----------

test("report says this batch does not publish to npm", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /This batch does not publish to npm/i);
});

// ---------- 7: does not create a git tag ----------

test("report says this batch does not create a git tag", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /This batch does not create a git tag/i);
});

// ---------- 8: does not create a GitHub Release ----------

test("report says this batch does not create a GitHub Release", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /This batch does not create a GitHub Release/i);
});

// ---------- 9: next publish step requires explicit operator authorization ----------

test("report says next publish step requires explicit operator authorization", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /next publish step requires explicit operator authorization/i,
  );
});

// ---------- 10: git state table ----------

test("report includes the git state table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Ref\s*\|\s*SHA\s*\|/,
    /\|\s*starting HEAD\s*\|/i,
    /\|\s*bumped HEAD\s*\|/i,
    /\|\s*main\s*\|/i,
    /\|\s*origin\/main\s*\|/i,
  ]) {
    assert.match(content, row, `git state table missing row matching ${row}`);
  }
});

// ---------- 11: package version table ----------

test("report includes the package version table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Scope\s*\|\s*Version\s*\|\s*Status\s*\|/,
    /root package\s*\|\s*`?0\.1\.0-beta\.0`?\s*\|\s*pass/i,
    /workspace packages \(20\)\s*\|\s*`?0\.1\.0-beta\.0`?\s*\|\s*pass/i,
    /package-lock\s*\|\s*`?0\.1\.0-beta\.0`?\s*\|\s*pass/i,
  ]) {
    assert.match(
      content,
      row,
      `package version table missing row matching ${row}`,
    );
  }
});

// ---------- 12: mandatory verification table ----------

test("report includes the mandatory verification table", async () => {
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
      `mandatory verification table missing row matching ${row}`,
    );
  }
});

// ---------- 13: CLI smoke matrix table ----------

test("report includes the CLI smoke matrix table", async () => {
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

// ---------- 14: lists npm run typecheck ----------

test("report lists npm run typecheck", async () => {
  const content = await readMemo();
  assert.match(content, /npm run typecheck/);
});

// ---------- 15: lists publish-dry-run ----------

test("report lists publish-dry-run", async () => {
  const content = await readMemo();
  assert.match(content, /publish-dry-run/);
});

// ---------- 16: lists install-tarball-smoke ----------

test("report lists install-tarball-smoke", async () => {
  const content = await readMemo();
  assert.match(content, /install-tarball-smoke/);
});

// ---------- 17: CHANGELOG mention ----------

test("CHANGELOG mentions the beta version bump", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(beta-version-bump|Beta Version Bump|beta version bump)/i,
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
