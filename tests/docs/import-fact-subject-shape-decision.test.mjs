// Import fact subject-shape cleanup decision memo — docs
// contract tests. Pins the memo's structure + key
// assertions so future contributors don't quietly drop a
// required section, flip the recommendation, or lose the
// future-migration trigger discipline.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const strategyDir = join(repoRoot, "docs", "strategy");
const conceptsDir = join(repoRoot, "docs", "concepts");
const artifactsDir = join(repoRoot, "docs", "artifacts");
const memoPath = join(strategyDir, "import-fact-subject-shape-decision.md");
const conceptPath = join(conceptsDir, "graph-aware-finding-filters.md");
const artifactPath = join(artifactsDir, "evidence-graph.md");
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "import-fact-subject-shape-decision.md",
);

const REQUIRED_HEADINGS = [
  "## Decision Summary",
  "## Current Fact Shapes",
  "## Problem",
  "## Option A: Migrate Import Facts To File Subject",
  "## Option B: Compatibility-Aware Import Helpers",
  "## Option C: Leave As-Is",
  "## Recommendation",
  "## Consequences",
  "## Implementation Plan If Accepted",
  "## Compatibility Contract",
  "## Future Migration Trigger",
  "## Tests Required For Implementation",
];

// ---------- Test 1: memo file exists ----------

test("import-fact-subject-shape-decision.md exists", () => {
  assert.ok(existsSync(memoPath), `expected decision memo at ${memoPath}`);
});

// ---------- Test 2: required headings in order ----------

test("memo contains every required heading in order", async () => {
  const text = await readFile(memoPath, "utf8");
  let cursor = 0;
  for (const heading of REQUIRED_HEADINGS) {
    const idx = text.indexOf(heading, cursor);
    assert.notEqual(
      idx,
      -1,
      `expected heading '${heading}' after position ${cursor} in ${memoPath}`,
    );
    cursor = idx + heading.length;
  }
});

// ---------- Test 3: recommendation chooses Option B now ----------

test("memo recommends Option B now", async () => {
  const text = await readFile(memoPath, "utf8");
  const recommendation = sectionBody(text, "## Recommendation");
  assert.match(
    recommendation,
    /(choose|recommended).*option\s*b/i,
    "Recommendation section must explicitly choose Option B",
  );
  const summary = sectionBody(text, "## Decision Summary");
  assert.match(
    summary,
    /option\s*b/i,
    "Decision Summary must name Option B as the recommended choice",
  );
});

// ---------- Test 4: Option A preserved as future migration ----------

test("memo explicitly mentions Option A as future migration", async () => {
  const text = await readFile(memoPath, "utf8");
  // The recommendation should preserve Option A as a
  // future trigger, not endorse it now.
  assert.match(
    text,
    /option\s*a[\s\S]{0,400}(future|trigger|later)/i,
    "memo must preserve Option A as a future migration path",
  );
  const trigger = sectionBody(text, "## Future Migration Trigger");
  assert.match(
    trigger,
    /option\s*a/i,
    "Future Migration Trigger section must name Option A as the migration target",
  );
});

// ---------- Test 5: mentions export-fact subject shape ----------

test("memo mentions export facts subject = file path", async () => {
  const text = await readFile(memoPath, "utf8");
  // Strip backticks so the assertion doesn't care about
  // markdown formatting.
  const stripped = text.replace(/`/g, "");
  assert.ok(
    /export[\s\S]{0,300}subject\s*=\s*(file|repo-relative)/i.test(stripped)
    || /export.*facts[\s\S]{0,80}subject[\s\S]{0,80}file path/i.test(stripped),
    "memo must state export facts use subject = file path",
  );
});

// ---------- Test 6: mentions symbol-fact subject shape ----------

test("memo mentions symbol facts subject = file path", async () => {
  const text = await readFile(memoPath, "utf8");
  const stripped = text.replace(/`/g, "");
  assert.ok(
    /symbol[\s\S]{0,300}subject\s*=\s*(file|repo-relative)/i.test(stripped)
    || /symbol.*facts[\s\S]{0,80}subject[\s\S]{0,80}file path/i.test(stripped),
    "memo must state symbol facts use subject = file path",
  );
});

// ---------- Test 7: mentions legacy import-fact subject shape ----------

test("memo mentions legacy import facts subject = \"<file>:<target>\"", async () => {
  const text = await readFile(memoPath, "utf8");
  assert.match(
    text,
    /<file>\s*:\s*<target>|"<file>:<target>"/i,
    'memo must name the legacy import subject shape "<file>:<target>"',
  );
});

// ---------- Test 8: mentions listImportTargetsForFile ----------

test("memo mentions listImportTargetsForFile", async () => {
  const text = await readFile(memoPath, "utf8");
  assert.match(
    text,
    /listImportTargetsForFile/,
    "memo must name the listImportTargetsForFile helper",
  );
});

// ---------- Test 9: mentions listExportsForFile ----------

test("memo mentions listExportsForFile", async () => {
  const text = await readFile(memoPath, "utf8");
  assert.match(
    text,
    /listExportsForFile/,
    "memo must name the listExportsForFile helper",
  );
});

// ---------- Test 10: mentions listSymbolsForFile ----------

test("memo mentions listSymbolsForFile", async () => {
  const text = await readFile(memoPath, "utf8");
  assert.match(
    text,
    /listSymbolsForFile/,
    "memo must name the listSymbolsForFile helper",
  );
});

// ---------- Test 11: consumers must use helpers, not raw subject ----------

test("memo says consumers should not match raw fact.subject for file-scoped lookups", async () => {
  const text = await readFile(memoPath, "utf8");
  // Strip backticks so subject vs `subject` and
  // fact.subject vs `fact.subject` both match.
  const stripped = text.replace(/`/g, "");
  // The contract should appear in either the
  // Compatibility Contract section or the recommendation.
  const contract = sectionBody(stripped, "## Compatibility Contract");
  assert.match(
    contract,
    /(must not|should not|do not).*(raw|match)[\s\S]{0,80}fact\.subject/i,
    "Compatibility Contract section must forbid raw fact.subject matching for file-scoped lookups",
  );
});

// ---------- Test 12: graph-aware-finding-filters concept references the decision ----------

test("graph-aware-finding-filters concept references the import-fact subject-shape decision memo", async () => {
  const text = await readFile(conceptPath, "utf8");
  assert.match(
    text,
    /import-fact-subject-shape-decision/,
    "concept doc must link the decision memo",
  );
});

// ---------- Test 13: EvidenceGraph artifact doc references the decision ----------

test("EvidenceGraph artifact doc references the import-fact subject-shape decision memo", async () => {
  const text = await readFile(artifactPath, "utf8");
  assert.match(
    text,
    /import-fact-subject-shape-decision/,
    "EvidenceGraph artifact doc must link the decision memo",
  );
});

// ---------- Test 14: CHANGELOG mentions the decision ----------

test("CHANGELOG mentions the import-fact subject-shape decision memo", async () => {
  const text = await readFile(changelogPath, "utf8");
  assert.match(
    text,
    /import-fact subject-shape[\s\S]{0,400}decision memo|import-fact-subject-shape-decision/i,
    "CHANGELOG must include the decision memo entry",
  );
});

// ---------- Test 15: review packet exists + has PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const text = await readFile(reviewPacketPath, "utf8");
  assert.match(
    text,
    /## PURPOSE PRESERVATION CHECK/,
    "review packet must include the PURPOSE PRESERVATION CHECK heading",
  );
});

// ---------- helpers ----------

function sectionBody(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) return "";
  const afterHeading = start + heading.length;
  const nextHeadingMatch = text.slice(afterHeading).search(/\n## [^\n]/);
  if (nextHeadingMatch === -1) return text.slice(afterHeading);
  return text.slice(afterHeading, afterHeading + nextHeadingMatch);
}
