// Docs contract tests for the Beta Release Readiness
// Checklist Memo — third (and final) of three beta
// blockers identified by the beta-readiness review.

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
  "beta-release-readiness-checklist.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "beta-release-readiness-checklist.md",
);

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function readMemoFlat() {
  const content = await readFile(memoPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: checklist doc exists ----------

test("beta release readiness checklist memo exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("checklist memo contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "## Decision Summary",
    "## Why This Checklist Exists",
    "## Current Beta Blocker Status",
    "## Release Scope",
    "## Versioning Policy",
    "## NPM Publish Policy",
    "## Mandatory Verification Commands",
    "## CLI Smoke Matrix",
    "## Documentation Completeness",
    "## Known Beta Limitations",
    "## Release Stop Conditions",
    "## Beta Readiness Decision",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `checklist memo missing required heading: ${heading}`,
    );
  }
});

// ---------- 3: beta readiness is a checklist state, not an npm publish event ----------

test("memo pins: beta readiness is a checklist state, not an npm publish event", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Beta readiness is a checklist state, not an npm publish event/i,
  );
});

// ---------- 4: npm publish requires separate explicit release work order ----------

test("memo pins: npm publish requires a separate explicit release work order", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /npm publish requires a separate explicit release work order/i,
  );
});

// ---------- 5: no version bump in checklist batch ----------

test("memo pins: no version bump occurs in this checklist batch", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /No version bump occurs in this checklist batch/i);
});

// ---------- 6: known beta limitations must be documented ----------

test("memo pins: known beta limitations must be documented before beta is announced", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Known beta limitations must be documented before beta is announced/i,
  );
});

// ---------- 7: source-write reconciliation policy resolved ----------

test("memo marks source-write reconciliation policy as resolved", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /Source-write reconciliation policy\s*\|\s*resolved/i,
  );
});

// ---------- 8: watcher / path freshness policy resolved ----------

test("memo marks watcher / path freshness policy as resolved", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /Watcher ?\/ ?path freshness policy\s*\|\s*resolved/i,
  );
});

// ---------- 9: release readiness checklist resolved by this memo ----------

test("memo marks release readiness checklist as resolved by this memo", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /Release readiness checklist\s*\|\s*resolved by this memo/i,
  );
});

// ---------- 10: mandatory verification commands ----------

test("memo lists the mandatory verification commands", async () => {
  const content = await readMemo();
  for (const cmd of [
    /npm run typecheck/,
    /npm run test/,
    /npm run build/,
    /git diff --check/,
    /node scripts\/audit-package-exports\.mjs/,
    /node scripts\/audit-license\.mjs/,
    /node scripts\/publish-dry-run\.mjs/,
    /node scripts\/install-smoke\.mjs/,
    /node scripts\/install-tarball-smoke\.mjs/,
  ]) {
    assert.match(
      content,
      cmd,
      `mandatory verification command missing: ${cmd}`,
    );
  }
});

// ---------- 11: CLI smoke matrix ----------

test("memo lists the CLI smoke matrix", async () => {
  const content = await readMemo();
  for (const cmd of [
    /rekon refresh/,
    /rekon verify run --dry-run/,
    /rekon verify run --execute/,
    /rekon verify result from-run/,
    /rekon publish proof/,
    /rekon publish architecture/,
    /rekon publish agent-contract/,
    /rekon publish github-check --dry-run/,
    /rekon publish pr-comment --dry-run/,
    /rekon verify github-workflow validate.+read-only/,
    /rekon verify github-workflow validate.+github-check-send/,
    /rekon verify github-workflow validate.+github-pr-comment-send/,
    /rekon artifacts validate/,
    /rekon artifacts freshness/,
  ]) {
    assert.match(content, cmd, `CLI smoke matrix missing: ${cmd}`);
  }
});

// ---------- 12: no source-write apply ----------

test("memo discloses: no source-write apply (beta posture)", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /source-write apply\s*\|\s*not available/i,
  );
});

// ---------- 13: no watcher daemon ----------

test("memo discloses: no watcher daemon (beta posture)", async () => {
  const content = await readMemo();
  assert.match(content, /watcher daemon\s*\|\s*not available/i);
});

// ---------- 14: no hosted GitHub App ----------

test("memo discloses: no hosted GitHub App (beta posture)", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /hosted GitHub App\s*\|\s*not available/i,
  );
});

// ---------- 15: GitHub writes are opt-in only ----------

test("memo discloses: GitHub writes are opt-in only", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /GitHub writes\s*\|\s*opt-in only/i,
  );
});

// ---------- 16: beta is not full classic parity ----------

test("memo discloses: full classic parity not claimed", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /full classic parity\s*\|\s*not claimed/i,
  );
});

// ---------- 17: beta blocker table ----------

test("memo includes the beta blocker table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Blocker\s*\|\s*Status\s*\|\s*Evidence\s*\|/,
    /Source-write reconciliation policy\s*\|\s*resolved/i,
    /Watcher ?\/ ?path freshness policy\s*\|\s*resolved/i,
    /Release readiness checklist\s*\|\s*resolved by this memo/i,
  ]) {
    assert.match(
      content,
      row,
      `beta blocker table missing row matching ${row}`,
    );
  }
});

// ---------- 18: verification command table ----------

test("memo includes the verification command table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Command\s*\|\s*Required Before Beta\s*\|/,
    /`npm run typecheck`\s*\|\s*yes/i,
    /`npm run test`\s*\|\s*yes/i,
    /`npm run build`\s*\|\s*yes/i,
    /`git diff --check`\s*\|\s*yes/i,
    /`node scripts\/audit-package-exports\.mjs`\s*\|\s*yes/i,
    /`node scripts\/audit-license\.mjs`\s*\|\s*yes/i,
    /`node scripts\/publish-dry-run\.mjs`\s*\|\s*yes/i,
    /`node scripts\/install-smoke\.mjs`\s*\|\s*yes/i,
    /`node scripts\/install-tarball-smoke\.mjs`\s*\|\s*yes/i,
  ]) {
    assert.match(
      content,
      row,
      `verification command table missing row matching ${row}`,
    );
  }
});

// ---------- 19: known limitations table ----------

test("memo includes the known limitations table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Limitation\s*\|\s*Beta Posture\s*\|/,
    /source-write apply\s*\|\s*not available/i,
    /watcher daemon\s*\|\s*not available/i,
    /hosted GitHub App\s*\|\s*not available/i,
    /active workflows\s*\|\s*not installed automatically/i,
    /GitHub writes\s*\|\s*opt-in only/i,
    /Windows process-tree kill\s*\|\s*direct-child-only/i,
    /full classic parity\s*\|\s*not claimed/i,
  ]) {
    assert.match(
      content,
      row,
      `known limitations table missing row matching ${row}`,
    );
  }
});

// ---------- 20: release stop-condition table ----------

test("memo includes the release stop-condition table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Stop Condition\s*\|\s*Outcome\s*\|/,
    /any required audit fails\s*\|\s*do not release/i,
    /any required smoke fails\s*\|\s*do not release/i,
    /version bump missing in release slice\s*\|\s*do not publish/i,
    /known limitations not documented\s*\|\s*do not announce beta/i,
    /accidental npm publish\s*\|\s*stop and document incident/i,
  ]) {
    assert.match(
      content,
      row,
      `release stop-condition table missing row matching ${row}`,
    );
  }
});

// ---------- 21: CHANGELOG mention ----------

test("CHANGELOG mentions the beta release readiness checklist", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(beta-release-readiness-checklist|Beta Release Readiness Checklist|beta release readiness checklist)/i,
  );
});

// ---------- 22: review packet PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const content = await readFile(reviewPacketPath, "utf8");
  assert.match(content, /## PURPOSE PRESERVATION CHECK/);
});
