// Graph-aware import evidence operator review — docs
// contract tests. Pins the memo's structure + key
// assertions so future contributors cannot quietly drop a
// required section, flip the recommendation, or skip a
// migration-trigger evaluation.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const strategyDir = join(repoRoot, "docs", "strategy");
const conceptsDir = join(repoRoot, "docs", "concepts");
const artifactsDir = join(repoRoot, "docs", "artifacts");
const memoPath = join(strategyDir, "graph-aware-import-evidence-operator-review.md");
const decisionMemoPath = join(strategyDir, "import-fact-subject-shape-decision.md");
const conceptPath = join(conceptsDir, "graph-aware-finding-filters.md");
const artifactPath = join(artifactsDir, "evidence-graph.md");
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "graph-aware-import-evidence-operator-review.md",
);

const REQUIRED_HEADINGS = [
  "## Decision Summary",
  "## Background",
  "## Evidence Gathered",
  "## Observed Diagnostics",
  "## Option A: Producer Migration",
  "## Option B: Helper Compatibility",
  "## Option C: Hybrid",
  "## Recommendation",
  "## Migration Triggers",
  "## Decision For Alpha",
  "## Follow-Up Work",
];

// ---------- Test 1: memo file exists ----------

test("graph-aware-import-evidence-operator-review.md exists", () => {
  assert.ok(existsSync(memoPath), `expected operator review memo at ${memoPath}`);
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

// ---------- Test 3: recommendation chooses Option C for alpha ----------

test("memo recommends Option C for alpha", async () => {
  const text = await readFile(memoPath, "utf8");
  // Strip markdown bold/italic so the regex doesn't care
  // about formatting flavor.
  const stripped = text.replace(/\*\*/g, "").replace(/`/g, "");
  // Decision Summary must explicitly recommend Option C.
  const summary = sectionBody(stripped, "## Decision Summary");
  assert.match(
    summary,
    /(recommendation|recommend)[\s\S]{0,200}option\s*c/i,
    "Decision Summary must recommend Option C",
  );
  // The Recommendation section itself must also choose
  // Option C.
  const recommendation = sectionBody(stripped, "## Recommendation");
  assert.match(
    recommendation,
    /option\s*c/i,
    "Recommendation section must choose Option C",
  );
});

// ---------- Test 4: "no import fact producer migration in alpha unless a trigger is met" ----------

test("memo says no import fact producer migration in alpha unless a trigger is met", async () => {
  const text = await readFile(memoPath, "utf8");
  // The work order requires this sentence to be explicit.
  // Collapse runs of whitespace (including blockquote
  // `> ` markers and newlines that wrap the sentence
  // across lines) before matching so the assertion
  // doesn't care about wrap position or markdown
  // formatting.
  const collapsed = text.replace(/[\s>*`]+/g, " ");
  assert.match(
    collapsed,
    /no import fact producer migration in alpha unless a trigger is met/i,
    "memo must contain the explicit no-migration statement",
  );
});

// ---------- Test 5: all four migration triggers evaluated ----------

test("memo evaluates all four migration triggers", async () => {
  const text = await readFile(memoPath, "utf8");
  // The four triggers (from the prior decision memo)
  // must all appear in the Migration Triggers section.
  const triggers = sectionBody(text, "## Migration Triggers");
  const fragments = [
    /helper compatibility[\s\S]{0,80}callsites/i,
    /schema[Vv]ersion bump/,
    /external (capability )?authors? (report|confusion)/i,
    /publication-facing/i,
  ];
  for (const fragment of fragments) {
    assert.match(
      triggers,
      fragment,
      `Migration Triggers section must evaluate '${fragment}'`,
    );
  }
});

// ---------- Test 6: mentions graphAwareByEvidenceSource ----------

test("memo mentions graphAwareByEvidenceSource", async () => {
  const text = await readFile(memoPath, "utf8");
  assert.match(
    text,
    /graphAwareByEvidenceSource/,
    "memo must mention the graphAwareByEvidenceSource field",
  );
});

// ---------- Test 7: mentions graphAwareReasonEvidenceSources ----------

test("memo mentions graphAwareReasonEvidenceSources", async () => {
  const text = await readFile(memoPath, "utf8");
  assert.match(
    text,
    /graphAwareReasonEvidenceSources/,
    "memo must mention the graphAwareReasonEvidenceSources field",
  );
});

// ---------- Test 8: mentions EvidenceGraph ----------

test("memo mentions EvidenceGraph", async () => {
  const text = await readFile(memoPath, "utf8");
  assert.match(text, /EvidenceGraph/, "memo must name EvidenceGraph");
});

// ---------- Test 9: mentions DetectorDetails ----------

test("memo mentions DetectorDetails", async () => {
  const text = await readFile(memoPath, "utf8");
  assert.match(
    text,
    /DetectorDetails/,
    "memo must name DetectorDetails (the fallback evidence source label)",
  );
});

// ---------- Test 10: mentions ObservedRepo ----------

test("memo mentions ObservedRepo", async () => {
  const text = await readFile(memoPath, "utf8");
  assert.match(
    text,
    /ObservedRepo/,
    "memo must name ObservedRepo (the sibling-file evidence source label)",
  );
});

// ---------- Test 11: import-fact subject-shape decision references the operator review ----------

test("import-fact subject-shape decision doc references this review", async () => {
  const text = await readFile(decisionMemoPath, "utf8");
  assert.match(
    text,
    /graph-aware-import-evidence-operator-review/,
    "import-fact subject-shape decision memo must link the operator review",
  );
});

// ---------- Test 12: graph-aware-finding-filters concept references the review ----------

test("graph-aware-finding-filters concept references this review", async () => {
  const text = await readFile(conceptPath, "utf8");
  assert.match(
    text,
    /graph-aware-import-evidence-operator-review/,
    "graph-aware-finding-filters concept must link the operator review",
  );
});

// ---------- Test 13: EvidenceGraph artifact doc references the review ----------

test("EvidenceGraph artifact doc references this review", async () => {
  const text = await readFile(artifactPath, "utf8");
  assert.match(
    text,
    /graph-aware-import-evidence-operator-review/,
    "EvidenceGraph artifact doc must link the operator review",
  );
});

// ---------- Test 14: CHANGELOG mentions the review ----------

test("CHANGELOG mentions the operator review", async () => {
  const text = await readFile(changelogPath, "utf8");
  assert.match(
    text,
    /graph-aware import evidence operator review|graph-aware-import-evidence-operator-review/i,
    "CHANGELOG must include the operator review entry",
  );
});

// ---------- Test 15: review packet exists with PURPOSE PRESERVATION CHECK ----------

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
