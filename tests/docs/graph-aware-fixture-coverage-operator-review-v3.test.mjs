// Graph-aware fixture coverage operator review v3 —
// docs contract tests. Pins the v3 memo's structure +
// key assertions so future contributors cannot quietly
// drop a required section, flip the recommendation,
// skip a migration-trigger evaluation, lose the
// alpha-complete decision, or lose a cross-reference
// from a supporting doc.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const strategyDir = join(repoRoot, "docs", "strategy");
const conceptsDir = join(repoRoot, "docs", "concepts");
const artifactsDir = join(repoRoot, "docs", "artifacts");
const reviewPath = join(
  strategyDir,
  "graph-aware-fixture-coverage-operator-review-v3.md",
);
const decisionMemoPath = join(
  strategyDir,
  "import-fact-subject-shape-decision.md",
);
const conceptPath = join(conceptsDir, "graph-aware-finding-filters.md");
const artifactPath = join(artifactsDir, "evidence-graph.md");
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "graph-aware-fixture-coverage-operator-review-v3.md",
);

const REQUIRED_HEADINGS = [
  "## Decision Summary",
  "## Why This Review Exists",
  "## Fixture Coverage Reviewed",
  "## Diagnostic Results",
  "## Migration Trigger Review",
  "## Artifact-Strength Review By Reason",
  "## Alpha-Completeness Decision",
  "## Option A: Import Producer Migration",
  "## Option B: Helper Compatibility",
  "## Option C: Hybrid",
  "## Recommendation",
  "## Decision For Alpha",
  "## Follow-Up Work",
];

// ---------- Test 1: review doc exists ----------

test("graph-aware-fixture-coverage-operator-review-v3.md exists", () => {
  assert.ok(existsSync(reviewPath), `expected v3 memo at ${reviewPath}`);
});

// ---------- Test 2: required headings in order ----------

test("v3 memo contains every required heading in order", async () => {
  const text = await readFile(reviewPath, "utf8");
  let cursor = 0;
  for (const heading of REQUIRED_HEADINGS) {
    const idx = text.indexOf(heading, cursor);
    assert.notEqual(
      idx,
      -1,
      `expected heading '${heading}' after position ${cursor} in ${reviewPath}`,
    );
    cursor = idx + heading.length;
  }
});

// ---------- Test 3: recommendation chooses Option C for alpha ----------

test("v3 memo recommends Option C for alpha", async () => {
  const text = await readFile(reviewPath, "utf8");
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

// ---------- Test 4: explicit no-migration statement ----------

test("v3 memo says no import fact producer migration in alpha unless a trigger is met", async () => {
  const text = await readFile(reviewPath, "utf8");
  const collapsed = text.replace(/[\s>*`]+/g, " ");
  assert.match(
    collapsed,
    /no import fact producer migration in alpha unless a trigger is met/i,
    "v3 memo must contain the explicit no-migration statement",
  );
});

// ---------- Test 5: factory/module-gate closes last known gap ----------

test("v3 memo says factory / module-gate artifact evidence strengthening closes the last known fixture-attribution gap", async () => {
  const text = await readFile(reviewPath, "utf8");
  const collapsed = text.replace(/[\s>*`]+/g, " ");
  assert.match(
    collapsed,
    /factory\s*\/\s*module-gate artifact evidence strengthening closes the last known fixture-attribution gap/i,
    "v3 memo must contain the explicit last-known-gap statement",
  );
});

// ---------- Test 6: graph-aware v1/v2/v3 arc is alpha-complete ----------

test("v3 memo says the graph-aware v1 / v2 / v3 arc is alpha-complete", async () => {
  const text = await readFile(reviewPath, "utf8");
  const collapsed = text.replace(/[\s>*`]+/g, " ");
  assert.match(
    collapsed,
    /graph-aware v1\s*\/\s*v2\s*\/\s*v3 arc is alpha-complete/i,
    "v3 memo must contain the explicit alpha-complete statement",
  );
});

// ---------- Test 7-12: references each fixture ----------

test("v3 memo references route-handler fixture", async () => {
  const text = await readFile(reviewPath, "utf8");
  assert.match(text, /route-handler/, "memo must reference the route-handler fixture");
});

test("v3 memo references external-comment fixture", async () => {
  const text = await readFile(reviewPath, "utf8");
  assert.match(text, /external-comment/, "memo must reference the external-comment fixture");
});

test("v3 memo references nextjs-route fixture", async () => {
  const text = await readFile(reviewPath, "utf8");
  assert.match(text, /nextjs-route/, "memo must reference the nextjs-route fixture");
});

test("v3 memo references route-http-middleware-only fixture", async () => {
  const text = await readFile(reviewPath, "utf8");
  assert.match(
    text,
    /route-http-middleware-only/,
    "memo must reference the route-http-middleware-only fixture",
  );
});

test("v3 memo references factory-file fixture", async () => {
  const text = await readFile(reviewPath, "utf8");
  assert.match(text, /factory-file/, "memo must reference the factory-file fixture");
});

test("v3 memo references module-gate fixture", async () => {
  const text = await readFile(reviewPath, "utf8");
  assert.match(text, /module-gate/, "memo must reference the module-gate fixture");
});

// ---------- Test 13-14: references EvidenceGraph + DetectorDetails ----------

test("v3 memo references EvidenceGraph", async () => {
  const text = await readFile(reviewPath, "utf8");
  assert.match(text, /EvidenceGraph/, "memo must reference EvidenceGraph");
});

test("v3 memo references DetectorDetails", async () => {
  const text = await readFile(reviewPath, "utf8");
  assert.match(text, /DetectorDetails/, "memo must reference DetectorDetails");
});

// ---------- Test 15: references graphAwareByEvidenceSource ----------

test("v3 memo references graphAwareByEvidenceSource", async () => {
  const text = await readFile(reviewPath, "utf8");
  assert.match(
    text,
    /graphAwareByEvidenceSource/,
    "memo must reference the graphAwareByEvidenceSource diagnostic field",
  );
});

// ---------- Test 16: migration trigger review evaluates all four triggers ----------

test("v3 memo evaluates all four migration triggers", async () => {
  const text = await readFile(reviewPath, "utf8");
  const triggers = sectionBody(text, "## Migration Trigger Review");
  assert.ok(
    triggers.length > 0,
    "Migration Trigger Review section must be non-empty",
  );
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

// ---------- Test 17-19: cross-references in supporting docs ----------

test("import-fact subject-shape decision doc references the v3 review", async () => {
  const text = await readFile(decisionMemoPath, "utf8");
  assert.match(
    text,
    /graph-aware-fixture-coverage-operator-review-v3/,
    "decision memo must link the v3 review",
  );
});

test("graph-aware-finding-filters concept references the v3 review", async () => {
  const text = await readFile(conceptPath, "utf8");
  assert.match(
    text,
    /graph-aware-fixture-coverage-operator-review-v3/,
    "graph-aware-finding-filters concept must link the v3 review",
  );
});

test("EvidenceGraph artifact doc references the v3 review", async () => {
  const text = await readFile(artifactPath, "utf8");
  assert.match(
    text,
    /graph-aware-fixture-coverage-operator-review-v3/,
    "EvidenceGraph artifact doc must link the v3 review",
  );
});

// ---------- Test 20: CHANGELOG mentions the v3 review ----------

test("CHANGELOG mentions the v3 review", async () => {
  const text = await readFile(changelogPath, "utf8");
  assert.match(
    text,
    /graph-aware fixture coverage operator review v3|graph-aware-fixture-coverage-operator-review-v3/i,
    "CHANGELOG must include the v3 review entry",
  );
});

// ---------- Test 21: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("v3 review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const text = await readFile(reviewPacketPath, "utf8");
  assert.match(
    text,
    /## PURPOSE PRESERVATION CHECK/,
    "v3 review packet must include the PURPOSE PRESERVATION CHECK heading",
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
