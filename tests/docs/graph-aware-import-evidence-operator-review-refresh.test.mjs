// Graph-aware import evidence operator review refresh —
// docs contract tests. Pins the refresh memo's structure +
// key assertions so future contributors cannot quietly drop
// a required section, flip the recommendation, or skip a
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
const refreshPath = join(strategyDir, "graph-aware-import-evidence-operator-review-refresh.md");
const decisionMemoPath = join(strategyDir, "import-fact-subject-shape-decision.md");
const conceptPath = join(conceptsDir, "graph-aware-finding-filters.md");
const artifactPath = join(artifactsDir, "evidence-graph.md");
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "graph-aware-import-evidence-operator-review-refresh.md",
);

const REQUIRED_HEADINGS = [
  "## Decision Summary",
  "## Why This Refresh Exists",
  "## Fixtures Reviewed",
  "## Evidence Gathered",
  "## Diagnostic Results",
  "## Migration Trigger Review",
  "## Option A: Producer Migration",
  "## Option B: Helper Compatibility",
  "## Option C: Hybrid",
  "## Recommendation",
  "## Decision For Alpha",
  "## Follow-Up Work",
];

// ---------- Test 1: refresh memo exists ----------

test("graph-aware-import-evidence-operator-review-refresh.md exists", () => {
  assert.ok(existsSync(refreshPath), `expected refresh memo at ${refreshPath}`);
});

// ---------- Test 2: required headings in order ----------

test("refresh memo contains every required heading in order", async () => {
  const text = await readFile(refreshPath, "utf8");
  let cursor = 0;
  for (const heading of REQUIRED_HEADINGS) {
    const idx = text.indexOf(heading, cursor);
    assert.notEqual(
      idx,
      -1,
      `expected heading '${heading}' after position ${cursor} in ${refreshPath}`,
    );
    cursor = idx + heading.length;
  }
});

// ---------- Test 3: recommendation chooses Option C for alpha ----------

test("refresh memo recommends Option C for alpha", async () => {
  const text = await readFile(refreshPath, "utf8");
  const stripped = text.replace(/\*\*/g, "").replace(/`/g, "");
  const summary = sectionBody(stripped, "## Decision Summary");
  assert.match(
    summary,
    /option\s*c/i,
    "Decision Summary must reference Option C",
  );
  const recommendation = sectionBody(stripped, "## Recommendation");
  assert.match(
    recommendation,
    /option\s*c/i,
    "Recommendation section must choose Option C",
  );
});

// ---------- Test 4: explicit "no import fact producer migration in alpha unless a trigger is met" ----------

test("refresh memo says no import fact producer migration in alpha unless a trigger is met", async () => {
  const text = await readFile(refreshPath, "utf8");
  const collapsed = text.replace(/[\s>*`]+/g, " ");
  assert.match(
    collapsed,
    /no import fact producer migration in alpha unless a trigger is met/i,
    "refresh memo must contain the explicit no-migration statement",
  );
});

// ---------- Test 5: deterministic fixtures prove EvidenceGraph-backed filtering works ----------

test("refresh memo says deterministic fixtures prove EvidenceGraph-backed graph-aware filtering works through helper compatibility", async () => {
  const text = await readFile(refreshPath, "utf8");
  const collapsed = text.replace(/[\s>*`]+/g, " ");
  assert.match(
    collapsed,
    /deterministic fixtures prove EvidenceGraph-backed graph-aware filtering works through helper compatibility/i,
    "refresh memo must contain the explicit fixtures-prove statement",
  );
});

// ---------- Test 6-8: references each fixture by name ----------

test("refresh memo references route-handler fixture", async () => {
  const text = await readFile(refreshPath, "utf8");
  assert.match(text, /route-handler/, "memo must reference the route-handler fixture");
});

test("refresh memo references external-comment fixture", async () => {
  const text = await readFile(refreshPath, "utf8");
  assert.match(text, /external-comment/, "memo must reference the external-comment fixture");
});

test("refresh memo references nextjs-route fixture", async () => {
  const text = await readFile(refreshPath, "utf8");
  assert.match(text, /nextjs-route/, "memo must reference the nextjs-route fixture");
});

// ---------- Test 9-10: references graphAwareByEvidenceSource + graphAwareReasonEvidenceSources ----------

test("refresh memo references graphAwareByEvidenceSource", async () => {
  const text = await readFile(refreshPath, "utf8");
  assert.match(
    text,
    /graphAwareByEvidenceSource/,
    "memo must reference the graphAwareByEvidenceSource diagnostic field",
  );
});

test("refresh memo references graphAwareReasonEvidenceSources", async () => {
  const text = await readFile(refreshPath, "utf8");
  assert.match(
    text,
    /graphAwareReasonEvidenceSources/,
    "memo must reference the graphAwareReasonEvidenceSources diagnostic field",
  );
});

// ---------- Test 11: migration trigger review section ----------

test("refresh memo includes the migration trigger review", async () => {
  const text = await readFile(refreshPath, "utf8");
  const triggers = sectionBody(text, "## Migration Trigger Review");
  assert.ok(triggers.length > 0, "Migration Trigger Review section must be non-empty");
  // The four triggers from the prior decision memo must
  // all appear.
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
      `Migration Trigger Review must evaluate '${fragment}'`,
    );
  }
});

// ---------- Test 12-14: cross-references in supporting docs ----------

test("import-fact subject-shape decision doc references this refresh", async () => {
  const text = await readFile(decisionMemoPath, "utf8");
  assert.match(
    text,
    /graph-aware-import-evidence-operator-review-refresh/,
    "decision memo must link the refresh",
  );
});

test("graph-aware-finding-filters concept references this refresh", async () => {
  const text = await readFile(conceptPath, "utf8");
  assert.match(
    text,
    /graph-aware-import-evidence-operator-review-refresh/,
    "graph-aware-finding-filters concept must link the refresh",
  );
});

test("EvidenceGraph artifact doc references this refresh", async () => {
  const text = await readFile(artifactPath, "utf8");
  assert.match(
    text,
    /graph-aware-import-evidence-operator-review-refresh/,
    "EvidenceGraph artifact doc must link the refresh",
  );
});

// ---------- Test 15: CHANGELOG mentions the refresh ----------

test("CHANGELOG mentions the refresh", async () => {
  const text = await readFile(changelogPath, "utf8");
  assert.match(
    text,
    /graph-aware import evidence operator review refresh|graph-aware-import-evidence-operator-review-refresh/i,
    "CHANGELOG must include the refresh entry",
  );
});

// ---------- Test 16: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("refresh review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const text = await readFile(reviewPacketPath, "utf8");
  assert.match(
    text,
    /## PURPOSE PRESERVATION CHECK/,
    "refresh review packet must include the PURPOSE PRESERVATION CHECK heading",
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
