// Docs contract tests for the No-NPM Beta Distribution
// Policy memo — replaces the previously-planned publish
// authorization work order; pins the no-NPM beta posture.

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
  "no-npm-beta-distribution-policy.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const readmePath = join(repoRoot, "README.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "no-npm-beta-distribution-policy.md",
);

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function readMemoFlat() {
  const content = await readFile(memoPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: doc exists ----------

test("no-NPM beta distribution policy memo exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("no-NPM policy memo contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Dogfood Status",
    "## Beta Distribution Model",
    "## NPM Publish Policy",
    "## Version Policy",
    "## Install / Run Model During Beta",
    "## Known Limitations",
    "## What This Does Not Do",
    "## Implementation Sequence",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `no-NPM policy memo missing required heading: ${heading}`,
    );
  }
});

// ---------- 3: Rekon beta will not be published to npm ----------

test("memo pins: Rekon beta will not be published to npm", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /Rekon beta will not be published to npm/i);
});

// ---------- 4: npm publish is deferred until after beta ----------

test("memo pins: npm publish is deferred until after beta", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /npm publish is deferred until after beta/i,
  );
});

// ---------- 5: beta readiness is a product/checklist state, not an npm-published state ----------

test("memo pins: beta readiness is a product/checklist state, not an npm-published state", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Beta readiness is a product ?\/ ?checklist state, not an npm-published state/i,
  );
});

// ---------- 6: no npm publish should be attempted during beta ----------

test("memo pins: no npm publish should be attempted during beta", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /No npm publish should be attempted during beta/i,
  );
});

// ---------- 7: real-repo dogfood passed ----------

test("memo records: real-repo dogfood passed", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Real-repo dogfood passed/i,
  );
});

// ---------- 8: beta distribution is source-controlled / local-build / tarball-smoke based ----------

test("memo pins: beta distribution is source-controlled / local-build / tarball-smoke based", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Beta distribution is source-controlled ?\/ ?local-build ?\/ ?tarball-smoke based/i,
  );
});

// ---------- 9: 0.1.0-beta.0 remains the internal beta version ----------

test("memo pins: 0.1.0-beta.0 remains the internal beta version", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /`?0\.1\.0-beta\.0`? remains the internal ?\/ ?repo version for beta validation/i,
  );
});

// ---------- 10: distribution table ----------

test("memo includes the distribution table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Distribution Path\s*\|\s*Beta Status\s*\|\s*Notes\s*\|/,
    /source checkout\s*\|\s*allowed/i,
    /local build\s*\|\s*allowed/i,
    /local tarball smoke\s*\|\s*allowed/i,
    /GitHub workflow templates\s*\|\s*allowed/i,
    /npm registry\s*\|\s*\*?\*?deferred\*?\*?/i,
    /GitHub Release\s*\|\s*\*?\*?deferred\*?\*?/i,
  ]) {
    assert.match(
      content,
      row,
      `distribution table missing row matching ${row}`,
    );
  }
});

// ---------- 11: policy table ----------

test("memo includes the policy table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Policy Area\s*\|\s*Decision\s*\|/,
    /npm publish during beta\s*\|\s*\*?\*?deferred\*?\*?/i,
    /version bump\s*\|\s*already[\s\S]{0,40}`?0\.1\.0-beta\.0`?/i,
    /public registry install\s*\|\s*not supported during beta/i,
    /source checkout install\s*\|\s*supported/i,
    /more real-repo dogfood\s*\|\s*required before/i,
    /publish authorization work order\s*\|\s*\*?\*?replaced\*?\*?/i,
  ]) {
    assert.match(
      content,
      row,
      `policy table missing row matching ${row}`,
    );
  }
});

// ---------- 12: dogfood table ----------

test("memo includes the dogfood table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Dogfood Target\s*\|\s*Result\s*\|\s*Notes\s*\|/,
    /Rekon repo (temp copy|temporary copy)[\s\S]{0,80}(pass|pass-with-known-limitations)/i,
  ]) {
    assert.match(
      content,
      row,
      `dogfood table missing row matching ${row}`,
    );
  }
});

// ---------- 13: README mentions no-NPM beta posture ----------

test("README mentions the no-NPM beta posture", async () => {
  const content = await readFile(readmePath, "utf8");
  assert.match(
    content,
    /(no-NPM beta|no npm beta|beta will not be published to npm|no npm publish during beta|no-npm-beta-distribution-policy)/i,
  );
});

// ---------- 14: CHANGELOG mention ----------

test("CHANGELOG mentions the no-NPM beta distribution policy", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(no-npm-beta-distribution-policy|No-NPM Beta Distribution Policy|no-NPM beta distribution policy|no npm beta distribution)/i,
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
