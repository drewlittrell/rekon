// Docs contract tests for the Private Beta
// Onboarding Validation Run — intake-blocked
// mode. The operator did not supply a target
// repo, so this batch ships a short intake
// request memo per the work order's stop
// condition. The docs test asserts the 16
// work-order-required assertions adapted to
// intake-blocked mode (the canonical artifact
// this batch produces is the intake-request
// memo, not the full validation report).

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const memoPath = join(
  repoRoot,
  "docs",
  "beta",
  "private-beta-onboarding-validation-intake-request.md",
);
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "private-beta-onboarding-validation-run.md",
);
const quickstartPath = join(
  repoRoot,
  "docs",
  "beta",
  "private-beta-onboarding-quickstart.md",
);
const playbookPath = join(
  repoRoot,
  "docs",
  "beta",
  "private-beta-support-playbook.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function flatMemo() {
  return (await readFile(memoPath, "utf8")).replace(/\s+/g, " ");
}

// ---------- 1: intake request memo exists ----------

test("onboarding validation intake request memo exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("memo contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "# Private Beta Onboarding Validation Intake Request",
    "## Decision Summary",
    "## Why This Intake Request Exists",
    "## Pre-Validation Gate",
    "## What The Operator Needs To Supply",
    "### Intake Questionnaire",
    "## Operator Selection Guidance",
    "## Anonymization Posture",
    "## What Happens Next",
    "## Outcome Classification",
    "## What This Does Not Do",
    "## Follow-Up Work",
    "## Cross-References",
    "## Status",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `memo missing heading: ${heading}`,
    );
  }
});

// ---------- 3: no npm publish ----------

test("memo says this batch does not publish to npm", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes("This batch does not publish to npm."),
    "memo missing 'This batch does not publish to npm.' pin",
  );
});

// ---------- 4: no version change ----------

test("memo says this batch does not change package versions", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes("This batch does not change package versions."),
    "memo missing 'This batch does not change package versions.' pin",
  );
});

// ---------- 5: no git tag ----------

test("memo says this batch does not create a git tag", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes("This batch does not create a git tag."),
    "memo missing 'This batch does not create a git tag.' pin",
  );
});

// ---------- 6: no GitHub Release ----------

test("memo says this batch does not create a GitHub Release", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes("This batch does not create a GitHub Release."),
    "memo missing 'This batch does not create a GitHub Release.' pin",
  );
});

// ---------- 7: temp copy of non-Rekon repo ----------

test("memo says validation uses temp copy of non-Rekon repo", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes(
      "The validation run, when executed, used a temp copy of a non-Rekon repository.",
    ),
    "memo missing temp-copy-of-non-Rekon-repo pin",
  );
});

// ---------- 8: Rekon artifacts canonical ----------

test("memo says Rekon artifacts remain canonical", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes(
      "Rekon artifacts remain canonical; GitHub dry-runs are downstream previews.",
    ),
    "memo missing 'Rekon artifacts remain canonical; GitHub dry-runs are downstream previews.' pin",
  );
});

// ---------- 9: GitHub dry-runs are downstream previews ----------

test("memo says GitHub dry-runs are downstream previews", async () => {
  const flat = await flatMemo();
  // Covered by assertion 8 verbatim, but assert the second clause exists on
  // its own too so any future rewording keeps both halves.
  assert.ok(
    flat.includes("GitHub dry-runs are downstream previews."),
    "memo missing 'GitHub dry-runs are downstream previews.' pin",
  );
});

// ---------- 10: intake questionnaire (all five fields) ----------

test("memo includes intake questionnaire with all five required fields", async () => {
  const content = await readMemo();
  for (const field of [
    "Target repo path:",
    "Representative path inside target:",
    "Target repo description:",
    "Any expected install/build command:",
    "Any sensitive paths or artifacts that must be anonymized:",
  ]) {
    assert.ok(
      content.includes(field),
      `memo missing intake questionnaire field: ${field}`,
    );
  }
});

// ---------- 11: pre-validation gate result table ----------

test("memo includes pre-validation gate result table with all 9 commands", async () => {
  const content = await readMemo();
  for (const cmd of [
    "`npm run typecheck`",
    "`npm test`",
    "`npm run build`",
    "`git diff --check`",
    "`node scripts/audit-package-exports.mjs`",
    "`node scripts/audit-license.mjs`",
    "`node scripts/publish-dry-run.mjs`",
    "`node scripts/install-smoke.mjs`",
    "`node scripts/install-tarball-smoke.mjs`",
  ]) {
    assert.ok(
      content.includes(cmd),
      `memo missing pre-validation gate command: ${cmd}`,
    );
  }
  // Sanity-check the table renders at least 9 pipe rows.
  const tableRows = content.match(/^\|.+\|.+\|$/gm) ?? [];
  assert.ok(
    tableRows.length >= 9,
    `expected at least 9 pre-validation gate rows, got ${tableRows.length}`,
  );
});

// ---------- 12: outcome classification = intake-blocked ----------

test("memo records outcome classification as intake-blocked", async () => {
  const content = await readMemo();
  assert.ok(
    /^##\s+Outcome Classification\s*$/m.test(content),
    "memo missing Outcome Classification heading",
  );
  const flat = await flatMemo();
  assert.ok(
    flat.toLowerCase().includes("intake-blocked"),
    "memo should record outcome classification as 'intake-blocked'",
  );
});

// ---------- 13: quickstart cross-link ----------

test("memo cross-links the Private Beta Onboarding Quickstart", async () => {
  const content = await readMemo();
  assert.ok(
    existsSync(quickstartPath),
    "quickstart should exist",
  );
  assert.ok(
    content.includes("private-beta-onboarding-quickstart.md"),
    "memo missing cross-link to private-beta-onboarding-quickstart.md",
  );
});

// ---------- 14: support playbook cross-link ----------

test("memo cross-links the Private Beta Support Playbook", async () => {
  const content = await readMemo();
  assert.ok(
    existsSync(playbookPath),
    "support playbook should exist",
  );
  assert.ok(
    content.includes("private-beta-support-playbook.md"),
    "memo missing cross-link to private-beta-support-playbook.md",
  );
});

// ---------- 15: CHANGELOG mentions onboarding validation run ----------

test("CHANGELOG mentions the onboarding validation run / intake request", async () => {
  const changelog = await readFile(changelogPath, "utf8");
  const flat = changelog.replace(/\s+/g, " ").toLowerCase();
  assert.ok(
    flat.includes("onboarding validation") ||
      changelog.includes(
        "docs/beta/private-beta-onboarding-validation-intake-request.md",
      ),
    "CHANGELOG missing private beta onboarding validation entry",
  );
});

// ---------- 16: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const packet = await readFile(reviewPacketPath, "utf8");
  assert.ok(
    /^##\s+PURPOSE PRESERVATION CHECK\s*$/m.test(packet),
    "review packet missing PURPOSE PRESERVATION CHECK heading",
  );
  for (const heading of [
    "## CHANGES MADE",
    "## PUBLIC API CHANGES",
    "## PURPOSE PRESERVATION CHECK",
    "## CODEBASE-INTEL ALIGNMENT",
    "## TARGET REPOSITORY",
    "## COMMAND MATRIX",
    "## OUTPUT SUMMARY",
    "## QUICKSTART GAPS",
    "## SUPPORT TEMPLATE GAPS",
    "## OUTCOME CLASSIFICATION",
    "## TESTS / VERIFICATION",
    "## INTENTIONALLY UNTOUCHED",
    "## RISKS / FOLLOW-UP",
    "## NEXT STEP",
  ]) {
    assert.ok(
      packet.includes(heading),
      `review packet missing heading: ${heading}`,
    );
  }
});
