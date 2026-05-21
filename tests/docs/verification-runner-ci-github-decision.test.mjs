// Verification runner CI / GitHub adapter
// decision memo — docs contract tests. Pins the
// memo's structure + the anchor invariants so
// future contributors cannot silently weaken the
// fork-safety boundary, lose the permission
// contract, drop the artifact upload restrictions,
// or pretend GitHub status is canonical truth.

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
  "verification-runner-ci-github-decision.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "verification-runner-ci-github-decision.md",
);

const REQUIRED_HEADINGS = [
  "# Verification Runner CI / GitHub Adapter Decision",
  "## Decision Summary",
  "## Problem",
  "## Current Rekon Proof Loop",
  "## Options Considered",
  "## Recommendation",
  "## Alpha Workflow Shape",
  "## GitHub Permissions And Fork Safety",
  "## Artifact Upload And Retention",
  "## Job Summary Surface",
  "## What This Does Not Do",
  "## Implementation Sequence",
  "## Future GitHub Check Publisher",
];

// ---------- Test 1: memo exists ----------

test("verification-runner-ci-github-decision.md exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- Test 2: memo contains every required heading in order ----------

test("memo contains every required heading in order", async () => {
  const content = await readFile(memoPath, "utf8");
  let cursor = 0;

  for (const heading of REQUIRED_HEADINGS) {
    const index = content.indexOf(heading, cursor);

    assert.notEqual(index, -1, `missing or out-of-order heading: ${heading}`);
    cursor = index + heading.length;
  }
});

// ---------- Test 3: memo recommends Option D ----------

test("memo recommends Option D (hybrid staged)", async () => {
  const content = await readFile(memoPath, "utf8");
  assert.match(
    content,
    /Option D/,
    "memo must recommend Option D explicitly",
  );
  assert.match(
    content,
    /staged|hybrid|local-first/i,
    "memo must describe the staged approach",
  );
});

// ---------- Test 4: memo says local-first runner ----------

test("memo says verification execution is local-first for alpha", async () => {
  const content = await readFile(memoPath, "utf8");
  assert.match(
    content,
    /local[- ]first/i,
    "memo must say local-first",
  );
});

// ---------- Test 5: memo says GitHub Actions workflow template for alpha ----------

test("memo says alpha ships a documented GitHub Actions workflow template", async () => {
  const content = await readFile(memoPath, "utf8");
  assert.match(
    content,
    /GitHub Actions workflow template/i,
    "memo must mention the workflow template",
  );
});

// ---------- Test 6: memo says GitHub Check / PR publisher deferred ----------

test("memo defers the GitHub Check / PR publisher to beta", async () => {
  const content = await readFile(memoPath, "utf8");
  assert.match(
    content,
    /deferred? to beta/i,
    "memo must say Check / PR publisher is deferred to beta",
  );
  assert.match(
    content,
    /GitHub Check.*publisher|Check.*PR.*publisher/i,
    "memo must reference the Check / PR publisher",
  );
});

// ---------- Test 7: memo says GitHub status is not canonical truth ----------

test("memo says GitHub status is not canonical truth", async () => {
  const content = await readFile(memoPath, "utf8");
  assert.match(
    content,
    /GitHub status is not canonical truth/i,
    "memo must explicitly state GitHub status is not canonical truth",
  );
});

// ---------- Test 8: memo says Rekon artifacts remain canonical ----------

test("memo says Rekon artifacts remain canonical", async () => {
  const content = await readFile(memoPath, "utf8");
  // Collapse newlines so the assertion matches phrasing that
  // wraps across multiple lines.
  const flat = content.replace(/\s+/g, " ");
  assert.match(
    flat,
    /Rekon.{0,80}artifacts.{0,40}(remain|are).{0,40}canonical/i,
    "memo must say Rekon artifacts remain canonical",
  );
});

// ---------- Test 9: memo says forked PRs must not receive secret-bearing execution by default ----------

test("memo says forked PRs must not receive secret-bearing execution by default", async () => {
  const content = await readFile(memoPath, "utf8");
  assert.match(
    content,
    /Forked PRs must not receive[\s\S]*?secret-bearing execution[\s\S]*?by default/i,
    "memo must explicitly forbid secret-bearing execution by default on forked PRs",
  );
});

// ---------- Test 10: memo includes `permissions: contents: read` ----------

test("memo pins permissions: contents: read", async () => {
  const content = await readFile(memoPath, "utf8");
  assert.match(
    content,
    /contents: read/,
    "memo must pin permissions: contents: read",
  );
});

// ---------- Test 11: memo mentions uploaded `.rekon/artifacts` ----------

test("memo mentions uploaded .rekon/artifacts", async () => {
  const content = await readFile(memoPath, "utf8");
  assert.match(
    content,
    /\.rekon\/artifacts/,
    "memo must mention .rekon/artifacts upload",
  );
});

// ---------- Test 12: memo says raw command logs should not be uploaded ----------

test("memo says raw command logs should not be uploaded", async () => {
  const content = await readFile(memoPath, "utf8");
  assert.match(
    content,
    /(raw|unredacted).*(logs|log|stdout|stderr)|log files.*excluded|\.log.*excluded/i,
    "memo must forbid uploading raw command logs",
  );
});

// ---------- Test 13: memo mentions job summary ----------

test("memo mentions GitHub Actions job summary", async () => {
  const content = await readFile(memoPath, "utf8");
  assert.match(
    content,
    /job summary|GITHUB_STEP_SUMMARY/i,
    "memo must mention job summary / GITHUB_STEP_SUMMARY",
  );
});

// ---------- Test 14: memo lists implementation sequence ----------

test("memo lists a numbered implementation sequence", async () => {
  const content = await readFile(memoPath, "utf8");
  const section = content.split(/^## Implementation Sequence/m)[1] ?? "";

  assert.match(section, /\b1\./, "implementation sequence must list step 1");
  assert.match(section, /\b2\./, "implementation sequence must list step 2");
  assert.match(section, /\b3\./, "implementation sequence must list step 3");
});

// ---------- Test 15: CHANGELOG mentions the decision ----------

test("CHANGELOG mentions the CI / GitHub decision memo", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /verification[- ]?runner[- ]?ci[- ]?github[- ]?decision|CI \/ GitHub adapter/i,
    "CHANGELOG must mention the CI / GitHub adapter decision",
  );
});

// ---------- Test 16: review packet exists and contains PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(existsSync(reviewPacketPath), `expected review packet at ${reviewPacketPath}`);

  const content = await readFile(reviewPacketPath, "utf8");
  assert.match(
    content,
    /## PURPOSE PRESERVATION CHECK/,
    "review packet must contain PURPOSE PRESERVATION CHECK section",
  );
});
