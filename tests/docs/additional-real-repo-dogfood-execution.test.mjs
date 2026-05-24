// Docs contract tests for the Additional Real-Repo
// Dogfood Execution cohort summary + per-target reports.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const summaryPath = join(
  repoRoot,
  "docs",
  "strategy",
  "real-repo-cohort-summary.md",
);
const cohortDir = join(repoRoot, "docs", "strategy", "real-repo-cohort");
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "additional-real-repo-dogfood-execution.md",
);

async function readSummary() {
  return readFile(summaryPath, "utf8");
}

async function readSummaryFlat() {
  const content = await readFile(summaryPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: cohort summary exists ----------

test("cohort summary memo exists", () => {
  assert.ok(existsSync(summaryPath), `expected summary at ${summaryPath}`);
});

// ---------- 2: required headings ----------

test("cohort summary contains all required headings", async () => {
  const content = await readSummary();
  const required = [
    "## Decision Summary",
    "## Cohort Targets",
    "## Pre-Cohort Verification",
    "## Workflow Validator Results",
    "## Per-Target Results",
    "## Cross-Target Findings",
    "## Release Blockers",
    "## Known Limitations Observed",
    "## Dogfood Decision",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `cohort summary missing required heading: ${heading}`,
    );
  }
});

// ---------- 3: no npm publish occurred ----------

test("cohort summary says no npm publish occurred", async () => {
  const flat = await readSummaryFlat();
  assert.match(
    flat,
    /(does not publish to npm|no npm publish occurred|does not publish.{0,40}npm)/i,
  );
});

// ---------- 4: no version bump occurred ----------

test("cohort summary says no version bump occurred", async () => {
  const flat = await readSummaryFlat();
  assert.match(
    flat,
    /(does not change package versions|no version bump|does not bump versions)/i,
  );
});

// ---------- 5: no git tag was created ----------

test("cohort summary says no git tag was created", async () => {
  const flat = await readSummaryFlat();
  assert.match(
    flat,
    /(does not create a git tag|no git tag was created|no git tag)/i,
  );
});

// ---------- 6: targets ran from temp copies ----------

test("cohort summary says targets ran from temp copies", async () => {
  const flat = await readSummaryFlat();
  assert.match(
    flat,
    /(temp `?mktemp -d`? copy|ran from a? temp|temp directories)/i,
  );
});

// ---------- 7: cohort target table ----------

test("cohort summary includes the cohort target table", async () => {
  const content = await readSummary();
  for (const row of [
    /\|\s*Archetype\s*\|\s*Target\s*\|\s*Representative Path\s*\|\s*Outcome\s*\|/i,
    /`boundary-contracts`/,
    /`structured-evals`/,
    /`figma-ds`/,
  ]) {
    assert.match(content, row, `cohort target table missing row matching ${row}`);
  }
});

// ---------- 8: per-target summary table ----------

test("cohort summary includes the per-target summary table", async () => {
  const content = await readSummary();
  for (const row of [
    /\|\s*Target\s*\|\s*Outcome\s*\|\s*Refresh\s*\|\s*Validate\s*\|/i,
    /`boundary-contracts`.{0,80}pass/i,
    /`structured-evals`.{0,80}pass-with-known-limitations/i,
    /`figma-ds`.{0,80}pass-with-known-limitations/i,
  ]) {
    assert.match(
      content,
      row,
      `per-target summary table missing row matching ${row}`,
    );
  }
});

// ---------- 9: blocker table or says no release blockers found ----------

test("cohort summary includes blocker table or says no release blockers found", async () => {
  const content = await readSummary();
  const hasTable = /\|\s*Target\s*\|\s*Blocker\s*\|\s*Severity\s*\|\s*Follow-Up\s*\|/i.test(content);
  const hasNoneStatement = /[Nn]o release blockers found/.test(content);
  assert.ok(
    hasTable || hasNoneStatement,
    "cohort summary must include a blocker table OR 'No release blockers found' statement",
  );
});

// ---------- 10: Dogfood Decision recorded ----------

test("cohort summary records the Dogfood Decision", async () => {
  const flat = await readSummaryFlat();
  assert.match(
    flat,
    /Dogfood Decision[\s\S]{0,200}(`pass`|`pass-with-known-limitations`|`blocked`)/i,
  );
});

// ---------- 11: at least three per-target reports exist ----------

test("at least three per-target reports exist", async () => {
  assert.ok(existsSync(cohortDir), `expected cohort dir at ${cohortDir}`);
  const entries = await readdir(cohortDir);
  const reports = entries.filter((e) => e.endsWith(".md"));
  assert.ok(
    reports.length >= 3,
    `expected at least 3 per-target reports, found ${reports.length}: ${reports.join(", ")}`,
  );
});

// ---------- 12: each per-target report contains all required headings ----------

test("each per-target report contains all required headings", async () => {
  const required = [
    "## Target Summary",
    "## Setup Results",
    "## Core Matrix Results",
    "## Representative Path Results",
    "## Artifact Metrics",
    "## Finding And Issue Metrics",
    "## Verification Metrics",
    "## Publication Metrics",
    "## GitHub Dry-Run Metrics",
    "## Outcome Classification",
    "## Follow-Up Work",
  ];
  const entries = await readdir(cohortDir);
  const reports = entries.filter((e) => e.endsWith(".md"));
  for (const report of reports) {
    const content = await readFile(join(cohortDir, report), "utf8");
    for (const heading of required) {
      assert.ok(
        content.includes(heading),
        `per-target report ${report} missing required heading: ${heading}`,
      );
    }
  }
});

// ---------- 13: each per-target report includes metrics table ----------

test("each per-target report includes metrics table", async () => {
  const entries = await readdir(cohortDir);
  const reports = entries.filter((e) => e.endsWith(".md"));
  for (const report of reports) {
    const content = await readFile(join(cohortDir, report), "utf8");
    assert.match(
      content,
      /\|\s*Metric\s*\|\s*Value\s*\|/i,
      `per-target report ${report} missing the artifact metrics table`,
    );
  }
});

// ---------- 14: CHANGELOG mention ----------

test("CHANGELOG mentions the additional real-repo dogfood execution", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(additional-real-repo-dogfood-execution|Additional Real-Repo Dogfood Execution|additional real-repo dogfood execution|real-repo cohort summary)/i,
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
