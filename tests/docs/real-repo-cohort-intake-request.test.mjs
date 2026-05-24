// Docs contract tests for the Real-Repo Dogfood
// Cohort Intake Request — triggered when the operator
// did not supply concrete cohort repos.

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
  "real-repo-cohort-intake-request.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "real-repo-cohort-intake-request.md",
);

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function readMemoFlat() {
  const content = await readFile(memoPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: intake request memo exists ----------

test("real-repo dogfood cohort intake request memo exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("intake request memo contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "## Decision Summary",
    "## Why This Intake Request Exists",
    "## Pre-Cohort Verification",
    "## What The Operator Needs To Supply",
    "## Operator Selection Guidance",
    "## Anonymization Posture",
    "## What Happens Next",
    "## What This Does Not Do",
    "## Implementation Sequence",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `intake request memo missing required heading: ${heading}`,
    );
  }
});

// ---------- 3: intake table with all five archetype placeholders ----------

test("intake request includes the intake table with all five archetype placeholders", async () => {
  const content = await readMemo();
  for (const placeholder of [
    /`?<small-ts-package>`?/i,
    /`?<medium-monorepo>`?/i,
    /`?<nextjs-app>`?/i,
    /`?<mixed-js-ts-repo>`?/i,
    /`?<github-workflows-repo>`?/i,
  ]) {
    assert.match(
      content,
      placeholder,
      `intake request missing archetype placeholder: ${placeholder}`,
    );
  }
});

// ---------- 4: do not invent repo names verbatim ----------

test("intake request pins: do not invent repo names", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /[Dd]o not invent repo names/i);
});

// ---------- 5: no cohort target may be Rekon itself ----------

test("intake request pins: no cohort target may be Rekon itself", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /No cohort target may be Rekon itself/i);
});

// ---------- 6: this batch does not run the cohort ----------

test("intake request pins: this batch does not run the cohort", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /(this batch does not run the cohort|cohort was not run in this batch|The cohort was not run)/i,
  );
});

// ---------- 7: cohort execution blocked on operator intake ----------

test("intake request says cohort execution is blocked on operator intake", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /(cohort execution.{0,80}blocked on operator intake|blocked on operator intake|Blocked on operator intake)/i,
  );
});

// ---------- 8: pre-cohort verification recorded ----------

test("intake request records pre-cohort verification", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Command\s*\|\s*Result\s*\|/,
    /`npm run typecheck`\s*\|\s*pass/i,
    /`npm run test`\s*\|\s*pass/i,
    /`npm run build`\s*\|\s*pass/i,
    /`node scripts\/publish-dry-run\.mjs`\s*\|\s*pass/i,
    /`node scripts\/install-tarball-smoke\.mjs`\s*\|\s*pass/i,
  ]) {
    assert.match(
      content,
      row,
      `pre-cohort verification table missing row matching ${row}`,
    );
  }
});

// ---------- 9: CHANGELOG mention ----------

test("CHANGELOG mentions the real-repo cohort intake request", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(real-repo-cohort-intake-request|Real-Repo Dogfood Cohort Intake Request|real-repo dogfood cohort intake request|intake request)/i,
  );
});

// ---------- 10: review packet PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const content = await readFile(reviewPacketPath, "utf8");
  assert.match(content, /## PURPOSE PRESERVATION CHECK/);
});
