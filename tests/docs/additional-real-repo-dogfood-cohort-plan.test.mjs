// Docs contract tests for the Additional Real-Repo
// Dogfood Cohort Plan — defines the next dogfood cohort
// for Rekon's private/local beta.

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
  "additional-real-repo-dogfood-cohort-plan.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "additional-real-repo-dogfood-cohort-plan.md",
);

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function readMemoFlat() {
  const content = await readFile(memoPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: cohort plan doc exists ----------

test("additional real-repo dogfood cohort plan memo exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("cohort plan memo contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "## Decision Summary",
    "## Why This Plan Exists",
    "## Current Beta Distribution Posture",
    "## Cohort Archetypes",
    "## Command Matrix",
    "## Metrics To Record",
    "## Success Criteria",
    "## Release Blocker Taxonomy",
    "## Reporting Format",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `cohort plan memo missing required heading: ${heading}`,
    );
  }
});

// ---------- 3: no npm publish during beta ----------

test("memo pins: no npm publish during beta", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /No npm publish during beta/i);
});

// ---------- 4: beta is private/local/repo-based ----------

test("memo pins: beta is private / local / repo-based", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Beta is private ?\/ ?local ?\/ ?repo-based/i,
  );
});

// ---------- 5: all five archetypes ----------

test("memo includes all five archetypes", async () => {
  const flat = await readMemoFlat();
  for (const archetype of [
    /Small TypeScript package/i,
    /Medium monorepo/i,
    /Next\.js ?\/ ?React app/i,
    /Mixed JS ?\/ ?TS repo/i,
    /Existing GitHub workflows repo/i,
  ]) {
    assert.match(flat, archetype, `cohort archetype missing: ${archetype}`);
  }
});

// ---------- 6: at least three distinct real repositories ----------

test("memo says at least three distinct real repositories", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /at least three distinct real repositories/i,
  );
});

// ---------- 7: command matrix ----------

test("memo includes the command matrix", async () => {
  const content = await readMemo();
  for (const command of [
    /node "\$CLI" init/,
    /node "\$CLI" refresh/,
    /node "\$CLI" artifacts validate/,
    /node "\$CLI" artifacts freshness/,
    /node "\$CLI" findings filter/,
    /node "\$CLI" issues adjudicate/,
    /node "\$CLI" publish proof/,
    /node "\$CLI" publish architecture/,
    /node "\$CLI" publish agent-contract/,
    /node "\$CLI" resolve preflight/,
    /node "\$CLI" intent work-order/,
    /node "\$CLI" verify run --root "\$ROOT" --plan "\$PLAN_REF" --dry-run/,
    /node "\$CLI" verify run --root "\$ROOT" --plan "\$PLAN_REF" --execute/,
    /node "\$CLI" verify result from-run/,
    /node "\$CLI" publish github-check --root "\$ROOT" --dry-run/,
    /node "\$CLI" publish pr-comment --root "\$ROOT" --dry-run/,
  ]) {
    assert.match(content, command, `command matrix missing: ${command}`);
  }
});

// ---------- 8: metrics to record ----------

test("memo includes the metrics to record", async () => {
  const content = await readMemo();
  for (const metric of [
    /Target repo archetype/i,
    /`?EvidenceGraph`? fact count/i,
    /`?FindingReport`? finding count/i,
    /`?VerificationRun`?.{0,100}status/i,
    /`?VerificationResult`?.{0,100}status/i,
    /GitHub Check dry-run.{0,100}conclusion/i,
    /PR comment dry-run.{0,100}readiness/i,
  ]) {
    assert.match(content, metric, `metric missing: ${metric}`);
  }
});

// ---------- 9: success criteria ----------

test("memo includes the success criteria", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /refresh.{0,40}completes/i);
  assert.match(flat, /artifacts validate.{0,40}(returns|clean|valid: true|valid:true)/i);
  assert.match(flat, /publications render/i);
  assert.match(flat, /GitHub dry-runs render/i);
});

// ---------- 10: release blocker taxonomy ----------

test("memo includes the release blocker taxonomy", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /release blocker/i);
  assert.match(flat, /`?refresh`?.{0,5}crash/i);
  assert.match(flat, /`?artifacts validate`?.{0,40}(returns|invalid)/i);
  assert.match(flat, /CLI crash/i);
  assert.match(flat, /Token ?\/ ?log leak/i);
});

// ---------- 11: findings are acceptable outcomes ----------

test("memo says findings are acceptable outcomes", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /Findings exist.{0,80}acceptable/i);
});

// ---------- 12: failed verification can be acceptable ----------

test("memo says failed verification can be acceptable if recorded honestly", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Failed `?verify run --execute`?.{0,80}acceptable/i,
  );
});

// ---------- 13: artifacts validate invalid is a release blocker ----------

test("memo says artifacts validate invalid is a release blocker", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /`?artifacts validate`?.{0,80}(returns `valid: false`|invalid)[\s\S]{0,80}release blocker/i,
  );
});

// ---------- 14: cohort archetype table ----------

test("memo includes the cohort archetype table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Archetype\s*\|\s*Placeholder\s*\|\s*Why It Matters\s*\|/i,
    /Small TypeScript package\s*\|\s*`?<small-ts-package>`?/i,
    /Medium monorepo\s*\|\s*`?<medium-monorepo>`?/i,
    /Next\.js ?\/ ?React app\s*\|\s*`?<nextjs-app>`?/i,
    /Mixed JS ?\/ ?TS repo\s*\|\s*`?<mixed-js-ts-repo>`?/i,
    /Existing GitHub workflows repo\s*\|\s*`?<github-workflows-repo>`?/i,
  ]) {
    assert.match(
      content,
      row,
      `cohort archetype table missing row matching ${row}`,
    );
  }
});

// ---------- 15: success/blocker table ----------

test("memo includes the success/blocker table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Outcome\s*\|\s*Classification\s*\|/i,
    /`?refresh`? completes\s*\|\s*success/i,
    /`?artifacts validate`? clean\s*\|\s*success/i,
    /[Ff]indings exist\s*\|\s*acceptable/i,
    /[Ff]ailed `?verify run --execute`?.{0,80}\|\s*acceptable/i,
    /`?refresh`? crash\s*\|\s*\*?\*?release blocker\*?\*?/i,
    /CLI crash[\s\S]{0,160}\|\s*\*?\*?release blocker\*?\*?/i,
  ]) {
    assert.match(
      content,
      row,
      `success/blocker table missing row matching ${row}`,
    );
  }
});

// ---------- 16: metrics table ----------

test("memo includes the metrics table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Metric\s*\|\s*Required\s*\|/i,
    /`?EvidenceGraph`? fact count\s*\|\s*yes/i,
    /`?FindingReport`? finding count\s*\|\s*yes/i,
    /`?VerificationRun`?[\s\S]{0,80}\|\s*yes/i,
    /`?VerificationResult`? status[\s\S]{0,80}\|\s*yes/i,
    /GitHub Check dry-run[\s\S]{0,80}\|\s*yes/i,
    /PR comment dry-run[\s\S]{0,80}\|\s*yes/i,
  ]) {
    assert.match(
      content,
      row,
      `metrics table missing row matching ${row}`,
    );
  }
});

// ---------- 17: CHANGELOG mention ----------

test("CHANGELOG mentions the dogfood cohort plan", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(additional-real-repo-dogfood-cohort-plan|Additional Real-Repo Dogfood Cohort Plan|dogfood cohort plan)/i,
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
