// Docs contract tests for the Watcher / Path Freshness
// Policy Decision Memo — second of three beta blockers
// identified by the beta-readiness review.

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
  "watcher-path-freshness-policy-decision.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "watcher-path-freshness-policy-decision.md",
);

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function readMemoFlat() {
  const content = await readFile(memoPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: memo exists ----------

test("watcher / path freshness policy decision memo exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("watcher memo contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Current Refresh Model",
    "## Classic Goal Reviewed",
    "## Options Considered",
    "## Recommendation",
    "## Beta Default",
    "## Source Change Policy",
    "## Path Freshness Model",
    "## Agent Contract Policy",
    "## Watcher Future",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `watcher memo missing required heading: ${heading}`,
    );
  }
});

// ---------- 3: Option C is recommended ----------

test("memo recommends Option C (watcher-lite / path freshness policy for beta)", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /Option C[\s\S]{0,400}recommended/i,
  );
  assert.match(
    content,
    /Recommendation:[\s\S]{0,400}Option C/i,
  );
});

// ---------- 4: watcher daemon not required for beta ----------

test("memo pins: watcher daemon is not required for beta", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /Watcher daemon is not required for beta/i);
});

// ---------- 5: path/source freshness policy required for beta ----------

test("memo pins: path/source freshness policy is required for beta", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Path ?\/ ?source freshness policy is required for beta/i,
  );
});

// ---------- 6: no background refresh by default ----------

test("memo pins: no background refresh by default", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /Background refresh\s*\|\s*not allowed by default/i,
  );
});

// ---------- 7: rekon refresh remains explicit operator action ----------

test("memo pins: rekon refresh remains explicit operator action", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /Refresh command\s*\|\s*explicit operator action/i,
  );
});

// ---------- 8: agents should treat artifacts as stale after source edits until rekon refresh ----------

test("memo pins: agents should treat artifacts as stale after source edits until rekon refresh has run", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Agents should treat artifacts as stale after source edits until `rekon refresh` has run/i,
  );
});

// ---------- 9: artifact lineage freshness is not working-tree freshness ----------

test("memo pins: artifact lineage freshness is not the same as working-tree freshness", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Artifact lineage freshness is not the same as working-tree freshness/i,
  );
});

// ---------- 10: file mtimes alone are not sufficient ----------

test("memo pins: file mtimes alone are not sufficient as canonical freshness evidence", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /File mtimes alone are not sufficient as canonical freshness evidence/i,
  );
});

// ---------- 11: PathFreshnessReport reserved ----------

test("memo reserves the PathFreshnessReport artifact name", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Reserved artifact name[\s\S]{0,80}PathFreshnessReport/i,
  );
});

// ---------- 12: watcher daemon remains post-beta or experimental ----------

test("memo pins: watcher daemon remains post-beta or experimental", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Watcher daemon remains post-beta or experimental/i,
  );
});

// ---------- 13: policy table ----------

test("memo includes the policy diagnostic table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Policy Area\s*\|\s*Decision\s*\|/,
    /Beta watcher daemon\s*\|\s*not required/i,
    /Background refresh\s*\|\s*not allowed by default/i,
    /Refresh command\s*\|\s*explicit operator action/i,
    /Source edits\s*\|\s*require refresh before trusting artifacts/i,
    /Path freshness evidence\s*\|\s*content ?\/ ?hash ?\/ ?git state preferred/i,
    /File mtimes\s*\|\s*advisory only/i,
    /Future artifact\s*\|\s*PathFreshnessReport reserved/i,
    /Agent guidance\s*\|\s*recommend refresh after edits/i,
  ]) {
    assert.match(
      content,
      row,
      `policy diagnostic table missing row matching ${row}`,
    );
  }
});

// ---------- 14: option table ----------

test("memo includes the option diagnostic table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Option\s*\|\s*Decision\s*\|\s*Notes\s*\|/,
    /manual refresh only\s*\|\s*insufficient alone/i,
    /full watcher daemon\s*\|\s*post-beta/i,
    /watcher-lite ?\/ ?path policy\s*\|\s*selected/i,
    /opt-in daemon\s*\|\s*future experimental/i,
  ]) {
    assert.match(
      content,
      row,
      `option diagnostic table missing row matching ${row}`,
    );
  }
});

// ---------- 15: risk table ----------

test("memo includes the risk diagnostic table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Risk\s*\|\s*Guardrail\s*\|/,
    /stale source context\s*\|\s*refresh-after-edit policy/i,
    /hidden artifact mutation\s*\|\s*no background writes/i,
    /mtime unreliability\s*\|\s*prefer content hashes ?\/ ?git state/i,
    /agent stale inference\s*\|\s*agent contract refresh instruction/i,
    /daemon lifecycle complexity\s*\|\s*watcher deferred/i,
  ]) {
    assert.match(
      content,
      row,
      `risk diagnostic table missing row matching ${row}`,
    );
  }
});

// ---------- 16: CHANGELOG mention ----------

test("CHANGELOG mentions the watcher / path freshness policy decision", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(watcher-path-freshness-policy-decision|Watcher ?\/ ?Path Freshness Policy Decision|watcher ?\/ ?path freshness policy)/i,
  );
});

// ---------- 17: review packet PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const content = await readFile(reviewPacketPath, "utf8");
  assert.match(content, /## PURPOSE PRESERVATION CHECK/);
});
