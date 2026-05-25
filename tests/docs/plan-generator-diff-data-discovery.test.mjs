// Docs contract tests for the
// Plan-Generator Diff Data Discovery memo.
// Discovery + decision only — no runtime
// change, no schema change, no CLI change.

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
  "plan-generator-diff-data-discovery.md",
);
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "plan-generator-diff-data-discovery.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function flatMemo() {
  return (await readFile(memoPath, "utf8")).replace(/\s+/g, " ");
}

// ---------- 1: discovery memo exists ----------

test("plan-generator diff data discovery memo exists", () => {
  assert.ok(existsSync(memoPath), `expected ${memoPath}`);
});

// ---------- 2: required headings ----------

test("memo contains all required headings", async () => {
  const content = await readMemo();
  for (const heading of [
    "# Plan-Generator Diff Data Discovery",
    "## Decision Summary",
    "## Why This Discovery Exists",
    "## Current Plan Generation Paths",
    "## Current Operation Shapes",
    "## Diff-Ready Operation Classes",
    "## Gaps",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ]) {
    assert.ok(
      content.includes(heading),
      `memo missing heading: ${heading}`,
    );
  }
});

// ---------- 3: memo reviews current plan generation paths ----------

test("memo reviews current plan generation paths", async () => {
  const content = await readMemo();
  assert.ok(
    content.includes("runLegacyMode") &&
      content.includes("runSuggestionMode"),
    "memo must name both runLegacyMode and runSuggestionMode generation paths",
  );
  assert.ok(
    content.includes(
      "packages/capability-reconcile/src/index.ts",
    ),
    "memo must cite the capability-reconcile source file",
  );
  // resolve.issue should be explicitly excluded as not a plan generation path.
  const flat = await flatMemo();
  assert.ok(
    flat.includes("`resolve.issue`") &&
      flat.includes("ResolverPacket"),
    "memo must name resolve.issue + ResolverPacket as not a plan-generation path",
  );
});

// ---------- 4: memo reviews current operation shapes ----------

test("memo reviews current operation shapes", async () => {
  const content = await readMemo();
  assert.ok(
    content.includes("CoherencyRemediationStep") &&
      content.includes("classifyRemediationItem"),
    "memo must name the upstream CoherencyRemediationStep + classifyRemediationItem mapping",
  );
  // All seven operation kinds must appear in the memo.
  for (const op of [
    "docs_regeneration",
    "finding_baseline_write",
    "label_override_write",
    "safe_import_rewrite",
    "generated_scaffold_write",
    "verification_command_run",
    "manual_review",
  ]) {
    assert.ok(
      content.includes(op),
      `memo missing operation kind: ${op}`,
    );
  }
  // The four operation classes must appear.
  for (const cls of [
    "artifact-only",
    "source-write-deferred",
    "command-deferred",
    "manual-review",
  ]) {
    assert.ok(
      content.includes(cls),
      `memo missing operation class: ${cls}`,
    );
  }
});

// ---------- 5: memo classifies diff-readiness ----------

test("memo identifies whether diff-ready operation classes exist today", async () => {
  const content = await readMemo();
  // The Diff-Ready Operation Classes section must exist.
  assert.ok(
    /##\s+Diff-Ready Operation Classes/.test(content),
    "memo missing 'Diff-Ready Operation Classes' section",
  );
  // The Decision Summary or section body must state plainly that no
  // generator emits exact patch data today.
  const flat = await flatMemo();
  assert.ok(
    flat.includes(
      "no current plan generator emits exact patch data",
    ) ||
      flat.includes(
        "No current plan generator emits exact patch data",
      ),
    "memo must plainly state that no current plan generator emits exact patch data",
  );
});

// ---------- 6: source-write apply remains unavailable ----------

test("memo says source-write apply remains unavailable", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes("Source-write apply remains unavailable."),
    "memo missing 'Source-write apply remains unavailable.' pin",
  );
});

// ---------- 7: ReconciliationPreviewReport remains unregistered ----------

test("memo says ReconciliationPreviewReport remains unregistered", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes("ReconciliationPreviewReport remains unregistered"),
    "memo must say ReconciliationPreviewReport remains unregistered",
  );
});

// ---------- 8: memo recommends a next implementation slice ----------

test("memo recommends a next implementation slice", async () => {
  const content = await readMemo();
  // The Recommendation section must exist.
  assert.ok(
    /##\s+Recommendation/.test(content),
    "memo missing Recommendation section",
  );
  const flat = await flatMemo();
  // Must explicitly recommend Option B (narrow exact-diff operation v1).
  assert.ok(
    flat.includes("**Adopt Option B.**") ||
      flat.includes("Adopt Option B."),
    "memo must explicitly recommend Option B",
  );
  // Must name the recommended next slice by title.
  assert.ok(
    flat.includes("Narrow ReconciliationPlan exact-diff operation v1") ||
      flat.includes("narrow ReconciliationPlan exact-diff operation v1"),
    "memo must name 'narrow ReconciliationPlan exact-diff operation v1' as the recommended next slice",
  );
  // Must also name the fallback slice.
  assert.ok(
    flat.includes("ReconciliationPlan operation-shape strengthening decision"),
    "memo must name the fallback slice (ReconciliationPlan operation-shape strengthening decision)",
  );
});

// ---------- 9: CHANGELOG mentions plan-generator diff data discovery ----------

test("CHANGELOG mentions plan-generator diff data discovery", async () => {
  const changelog = await readFile(changelogPath, "utf8");
  const flat = changelog.replace(/\s+/g, " ").toLowerCase();
  assert.ok(
    flat.includes("plan-generator diff data discovery") ||
      changelog.includes(
        "docs/strategy/plan-generator-diff-data-discovery.md",
      ),
    "CHANGELOG missing plan-generator diff data discovery entry",
  );
});

// ---------- 10: review packet exists with PURPOSE PRESERVATION CHECK ----------

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
    "## PLAN GENERATION PATHS",
    "## OPERATION SHAPES",
    "## RECOMMENDATION",
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
