// Docs contract tests for the Beta Readiness / Remaining
// Classic-Parity Review (post-step-10 strategy review).

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
  "beta-readiness-classic-parity-review.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "beta-readiness-classic-parity-review.md",
);

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function readMemoFlat() {
  const content = await readFile(memoPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: memo exists ----------

test("beta readiness / classic-parity review memo exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("beta readiness memo contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Current Rekon Product Loop",
    "## Classic Goals Reviewed",
    "## Subsystem Readiness Matrix",
    "## Beta-Ready Areas",
    "## Beta Blockers",
    "## Post-Beta Work",
    "## Source-Write Reconciliation Gap",
    "## Watcher And Path Freshness Gap",
    "## Packaging And Release Readiness Gap",
    "## Remaining Classic-Parity Delta",
    "## Recommendation",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `beta readiness memo missing required heading: ${heading}`,
    );
  }
});

// ---------- 3: beta-close but not beta-ready ----------

test("memo says Rekon is beta-close but not beta-ready", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /beta-close but not beta-ready/i);
});

// ---------- 4: beta readiness is not full classic parity ----------

test("memo says beta readiness is not the same as full classic parity", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Beta readiness is not the same as full classic parity/i,
  );
});

// ---------- 5: no more GitHub review surfaces before beta ----------

test("memo says Rekon should not add more GitHub review surfaces before beta", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Rekon should not add more GitHub review surfaces before beta/i,
  );
});

// ---------- 6: policy/guardrail oriented ----------

test("memo says remaining pre-beta work is policy / guardrail oriented", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /remaining pre-beta work is policy ?\/ ?guardrail oriented/i,
  );
});

// ---------- 7: source-write reconciliation as beta blocker ----------

test("memo identifies source-write reconciliation as a beta blocker", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /Source-write reconciliation/i);
  assert.match(
    flat,
    /Source-write reconciliation[\s\S]{0,200}beta blocker|source-write reconciliation policy[\s\S]{0,80}beta blocker/i,
  );
});

// ---------- 8: watcher/path freshness as beta blocker ----------

test("memo identifies watcher / path freshness as a beta blocker", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Watcher ?\/ ?path freshness|Watcher\/path freshness/i,
  );
});

// ---------- 9: release readiness checklist as beta blocker ----------

test("memo identifies release readiness checklist as a beta blocker", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /(release readiness checklist|Beta release readiness checklist|Packaging\/release)/i,
  );
});

// ---------- 10: verification runner beta-ready ----------

test("memo marks the verification runner beta-ready", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /Verification runner[\s\S]{0,80}beta-ready/i,
  );
});

// ---------- 11: GitHub review surfaces beta-ready ----------

test("memo marks GitHub review surfaces beta-ready", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /GitHub review surfaces[\s\S]{0,80}beta-ready/i,
  );
});

// ---------- 12: finding filters beta-ready ----------

test("memo marks finding filters beta-ready", async () => {
  const content = await readMemo();
  assert.match(content, /Finding filters[\s\S]{0,80}beta-ready/i);
});

// ---------- 13: graph-aware filtering beta-ready ----------

test("memo marks graph-aware filtering beta-ready", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /Graph-aware filtering[\s\S]{0,80}beta-ready/i,
  );
});

// ---------- 14: issue governance beta-ready ----------

test("memo marks issue governance beta-ready", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /Issue governance[\s\S]{0,80}beta-ready/i,
  );
});

// ---------- 15: subsystem matrix ----------

test("memo includes the subsystem readiness matrix", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Subsystem\s*\|\s*Current Status\s*\|\s*Beta Decision\s*\|\s*Notes\s*\|/,
    /Verification runner[\s\S]{0,80}strong/i,
    /GitHub review surfaces[\s\S]{0,80}strong/i,
    /Finding filters[\s\S]{0,80}strong/i,
    /Graph-aware filtering[\s\S]{0,80}strong/i,
    /Issue governance[\s\S]{0,80}strong/i,
    /Source-write reconciliation[\s\S]{0,80}incomplete/i,
    /Watcher ?\/ ?path freshness[\s\S]{0,80}incomplete/i,
    /Packaging ?\/ ?release[\s\S]{0,80}incomplete/i,
  ]) {
    assert.match(content, row, `subsystem matrix missing row matching ${row}`);
  }
});

// ---------- 16: beta blocker table ----------

test("memo includes the beta blocker table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Blocker\s*\|\s*Why It Blocks Beta\s*\|\s*Recommended Next Slice\s*\|/,
    /Source-write reconciliation policy[\s\S]{0,200}clear boundary/i,
    /Watcher ?\/ ?path freshness policy[\s\S]{0,200}stale local artifacts/i,
    /Release readiness checklist[\s\S]{0,200}packaging/i,
  ]) {
    assert.match(content, row, `beta blocker table missing row matching ${row}`);
  }
});

// ---------- 17: post-beta table ----------

test("memo includes the post-beta table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Area\s*\|\s*Why Post-Beta\s*\|/,
    /Hosted GitHub App/i,
    /deeper rule catalog/i,
    /memory promotion ?\/ ?supersession/i,
    /Windows process-tree kill/i,
    /PR comment refinements/i,
  ]) {
    assert.match(content, row, `post-beta table missing row matching ${row}`);
  }
});

// ---------- 18: CHANGELOG mention ----------

test("CHANGELOG mentions the beta readiness review", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(beta-readiness-classic-parity-review|Beta Readiness ?\/ ?(Remaining )?Classic-Parity Review|beta readiness review)/i,
  );
});

// ---------- 19: review packet PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const content = await readFile(reviewPacketPath, "utf8");
  assert.match(content, /## PURPOSE PRESERVATION CHECK/);
});
