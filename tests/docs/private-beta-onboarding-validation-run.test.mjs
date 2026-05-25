// Docs contract tests for the Private Beta
// Onboarding Validation Run. The post-intake
// validation has run end-to-end against a
// temp copy of one non-Rekon target (referred
// to anonymously as `target-1`), producing
// the canonical
// docs/beta/private-beta-onboarding-validation-report.md.
// The intake-request memo from the prior
// intake-blocked batch is preserved as a
// historical record.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const reportPath = join(
  repoRoot,
  "docs",
  "beta",
  "private-beta-onboarding-validation-report.md",
);
const intakePath = join(
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
const changelogPath = join(repoRoot, "CHANGELOG.md");

async function readReport() {
  return readFile(reportPath, "utf8");
}

async function flatReport() {
  return (await readFile(reportPath, "utf8")).replace(/\s+/g, " ");
}

// ---------- 1: validation report exists ----------

test("validation report exists", () => {
  assert.ok(existsSync(reportPath), `expected report at ${reportPath}`);
});

// ---------- 2: required headings ----------

test("report contains all required headings", async () => {
  const content = await readReport();
  const required = [
    "# Private Beta Onboarding Validation Report",
    "## Decision Summary",
    "## Target Repository",
    "## Commands Run",
    "## Output Summary",
    "## Artifact Results",
    "## Path Freshness Results",
    "## Verification Results",
    "## GitHub Dry-Run Results",
    "## Quickstart Gaps",
    "## Support Template Gaps",
    "## Blockers",
    "## Outcome Classification",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `report missing heading: ${heading}`,
    );
  }
});

// ---------- 3: no npm publish ----------

test("report says this batch does not publish to npm", async () => {
  const flat = await flatReport();
  assert.ok(
    flat.includes("This batch does not publish to npm."),
    "report missing 'This batch does not publish to npm.' pin",
  );
});

// ---------- 4: no version change ----------

test("report says this batch does not change package versions", async () => {
  const flat = await flatReport();
  assert.ok(
    flat.includes("This batch does not change package versions."),
    "report missing 'This batch does not change package versions.' pin",
  );
});

// ---------- 5: no git tag ----------

test("report says this batch does not create a git tag", async () => {
  const flat = await flatReport();
  assert.ok(
    flat.includes("This batch does not create a git tag."),
    "report missing 'This batch does not create a git tag.' pin",
  );
});

// ---------- 6: no GitHub Release ----------

test("report says this batch does not create a GitHub Release", async () => {
  const flat = await flatReport();
  assert.ok(
    flat.includes("This batch does not create a GitHub Release."),
    "report missing 'This batch does not create a GitHub Release.' pin",
  );
});

// ---------- 7: temp copy of non-Rekon repo ----------

test("report says validation used temp copy of non-Rekon repo", async () => {
  const flat = await flatReport();
  assert.ok(
    flat.includes(
      "The validation run used a temp copy of a non-Rekon repository.",
    ),
    "report missing 'The validation run used a temp copy of a non-Rekon repository.' pin",
  );
});

// ---------- 8: Rekon artifacts canonical ----------

test("report says Rekon artifacts remain canonical", async () => {
  const flat = await flatReport();
  assert.ok(
    flat.includes(
      "Rekon artifacts remain canonical; GitHub dry-runs are downstream previews.",
    ),
    "report missing 'Rekon artifacts remain canonical; GitHub dry-runs are downstream previews.' pin",
  );
});

// ---------- 9: GitHub dry-runs are downstream previews ----------

test("report says GitHub dry-runs are downstream previews", async () => {
  const flat = await flatReport();
  assert.ok(
    flat.includes("GitHub dry-runs are downstream previews."),
    "report missing 'GitHub dry-runs are downstream previews.' pin",
  );
});

// ---------- 10: command matrix table ----------

test("report includes command matrix table", async () => {
  const content = await readReport();
  assert.ok(
    /###\s+Command Matrix/.test(content),
    "report missing Command Matrix subheading",
  );
  // The command matrix uses a markdown table with at least the columns
  // Step | Command | Result | Notes — assert that the column header row appears.
  assert.ok(
    /\|\s*Step\s*\|\s*Command\s*\|\s*Result\s*\|\s*Notes\s*\|/.test(content),
    "report missing command matrix table header",
  );
  // The table must contain entries for the canonical first-scan commands.
  for (const cmd of [
    "init",
    "refresh",
    "paths freshness",
    "artifacts validate",
    "publish architecture",
    "publish agent-contract",
    "publish proof",
    "verify run",
  ]) {
    assert.ok(
      content.includes(cmd),
      `command matrix missing command: ${cmd}`,
    );
  }
});

// ---------- 11: output summary table ----------

test("report includes output summary table", async () => {
  const content = await readReport();
  assert.ok(
    /###\s+Output Summary Table/.test(content),
    "report missing Output Summary Table subheading",
  );
  // The output table should list at least architecture summary, agent
  // contract, proof report, and PathFreshnessReport.
  for (const output of [
    "Architecture summary",
    "Agent contract",
    "Proof report",
    "PathFreshnessReport",
  ]) {
    assert.ok(
      content.includes(output),
      `output summary missing output: ${output}`,
    );
  }
});

// ---------- 12: gap table or "no quickstart gaps found" ----------

test("report includes gap table or says no quickstart gaps found", async () => {
  const content = await readReport();
  // Either a gap table with the Gap / Severity / Recommended Fix header
  // OR the explicit "No quickstart gaps found." statement.
  const hasGapTable = /\|\s*Gap\s*\|\s*Severity\s*\|\s*Recommended Fix\s*\|/.test(
    content,
  );
  const hasNoGapPhrase = /No quickstart gaps found\./i.test(content);
  assert.ok(
    hasGapTable || hasNoGapPhrase,
    "report must include a gap table OR the 'No quickstart gaps found.' phrase",
  );
});

// ---------- 13: blocker table or "no onboarding blockers found" ----------

test("report includes blocker table or says no onboarding blockers found", async () => {
  const content = await readReport();
  const hasBlockerTable = /\|\s*Blocker\s*\|\s*Status\s*\|\s*Notes\s*\|/.test(
    content,
  );
  const hasNoBlockerPhrase = /No onboarding blockers found\./i.test(content);
  assert.ok(
    hasBlockerTable || hasNoBlockerPhrase,
    "report must include a blocker table OR the 'No onboarding blockers found.' phrase",
  );
});

// ---------- 14: outcome classification recorded ----------

test("report records outcome classification", async () => {
  const content = await readReport();
  assert.ok(
    /^##\s+Outcome Classification\s*$/m.test(content),
    "report missing Outcome Classification heading",
  );
  const flat = (await flatReport()).toLowerCase();
  const validClassifications = [
    "pass-with-known-limitations",
    "`pass`",
    "blocked",
  ];
  const hasClassification = validClassifications.some((c) =>
    flat.includes(c.toLowerCase()),
  );
  assert.ok(
    hasClassification,
    "report must record an explicit outcome classification (pass / pass-with-known-limitations / blocked)",
  );
});

// ---------- 15: CHANGELOG mentions onboarding validation run ----------

test("CHANGELOG mentions the onboarding validation run", async () => {
  const changelog = await readFile(changelogPath, "utf8");
  const flat = changelog.replace(/\s+/g, " ").toLowerCase();
  assert.ok(
    flat.includes("onboarding validation") ||
      changelog.includes(
        "docs/beta/private-beta-onboarding-validation-report.md",
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

// ---------- 17: intake memo preserved as historical record ----------

test("intake-request memo is preserved as historical record", () => {
  assert.ok(
    existsSync(intakePath),
    "the prior intake-request memo should remain as a historical record",
  );
});
