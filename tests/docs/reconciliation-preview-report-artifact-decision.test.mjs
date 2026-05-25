// Docs contract tests for the
// ReconciliationPreviewReport artifact decision
// memo. The decision is Option A — reserve the
// name, defer registration. This batch ships no
// runtime change.

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
  "reconciliation-preview-report-artifact-decision.md",
);
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "reconciliation-preview-report-artifact-decision.md",
);
const previewV1MemoPath = join(
  repoRoot,
  "docs",
  "strategy",
  "reconciliation-preview-v1.md",
);
const previewConceptPath = join(
  repoRoot,
  "docs",
  "concepts",
  "reconciliation-preview.md",
);
const sourceWritePolicyPath = join(
  repoRoot,
  "docs",
  "strategy",
  "source-write-reconciliation-policy-decision.md",
);
const reconciliationPlansConceptPath = join(
  repoRoot,
  "docs",
  "concepts",
  "reconciliation-plans.md",
);
const reconciliationPlanArtifactPath = join(
  repoRoot,
  "docs",
  "artifacts",
  "reconciliation-plan.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function flatMemo() {
  return (await readFile(memoPath, "utf8")).replace(/\s+/g, " ");
}

// ---------- 1: memo exists ----------

test("ReconciliationPreviewReport artifact decision memo exists", () => {
  assert.ok(existsSync(memoPath), `expected ${memoPath}`);
});

// ---------- 2: required headings ----------

test("memo contains all required headings", async () => {
  const content = await readMemo();
  for (const heading of [
    "# ReconciliationPreviewReport Artifact Decision",
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Current State",
    "## Options Considered",
    "## Recommendation",
    "## Conditions For Future Registration",
    "## Reserved Vocabulary",
    "## What This Decision Does Not Do",
    "## Cross-References",
    "## Status",
    "## Follow-Up",
  ]) {
    assert.ok(
      content.includes(heading),
      `memo missing heading: ${heading}`,
    );
  }
});

// ---------- 3: artifact not registered pin ----------

test("memo says ReconciliationPreviewReport is not registered in this slice", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes(
      "ReconciliationPreviewReport is not registered as a Rekon artifact in this slice.",
    ),
    "memo missing 'ReconciliationPreviewReport is not registered as a Rekon artifact in this slice.' pin",
  );
});

// ---------- 4: name reserved pin ----------

test("memo says the artifact name is reserved", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes(
      "The artifact name `ReconciliationPreviewReport` is reserved.",
    ),
    "memo missing 'The artifact name `ReconciliationPreviewReport` is reserved.' pin",
  );
});

// ---------- 5: no validator/writer/category pin ----------

test("memo says no validator, writer, or category is added", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes(
      "No `ReconciliationPreviewReport` validator, writer, or category is added.",
    ),
    "memo missing 'No `ReconciliationPreviewReport` validator, writer, or category is added.' pin",
  );
});

// ---------- 6: preview v1 remains in-memory pin ----------

test("memo says Reconciliation Preview v1 remains a read-only, in-memory projection", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes(
      "Reconciliation Preview v1 remains a read-only, in-memory projection of `ReconciliationPlan`.",
    ),
    "memo missing 'Reconciliation Preview v1 remains a read-only, in-memory projection of `ReconciliationPlan`.' pin",
  );
});

// ---------- 7: source-write apply unavailable pin ----------

test("memo says source-write apply remains unavailable", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes("Source-write apply remains unavailable."),
    "memo missing 'Source-write apply remains unavailable.' pin",
  );
});

// ---------- 8: options considered ----------

test("memo records all three options considered", async () => {
  const content = await readMemo();
  assert.ok(
    /###\s+Option A\s+/m.test(content),
    "memo missing Option A subheading",
  );
  assert.ok(
    /###\s+Option B\s+/m.test(content),
    "memo missing Option B subheading",
  );
  assert.ok(
    /###\s+Option C\s+/m.test(content),
    "memo missing Option C subheading",
  );
});

// ---------- 9: recommended option = A ----------

test("memo recommends Option A", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes("**Adopt Option A.**"),
    "memo must explicitly recommend Option A",
  );
});

// ---------- 10: future registration conditions ----------

test("memo lists future registration conditions", async () => {
  const content = await readMemo();
  // Look for an ordered list of 4 numbered conditions inside the
  // *Conditions For Future Registration* section.
  const conditionsMatch = content.match(
    /##\s+Conditions For Future Registration[\s\S]+?(?=\n##\s)/,
  );
  assert.ok(
    conditionsMatch,
    "memo missing 'Conditions For Future Registration' section body",
  );
  const conditionsBody = conditionsMatch[0];
  for (const num of ["1.", "2.", "3.", "4."]) {
    assert.ok(
      conditionsBody.includes(num),
      `conditions section missing condition ${num}`,
    );
  }
  // Must include the canonical 'at least two of the following are true' phrasing.
  assert.ok(
    /at least\s+\*\*two\*\*/i.test(conditionsBody) ||
      /at least two of/i.test(conditionsBody),
    "conditions section must require at least two conditions before registration",
  );
});

// ---------- 11: reserved vocabulary table ----------

test("memo includes the reserved vocabulary table", async () => {
  const content = await readMemo();
  assert.ok(
    /##\s+Reserved Vocabulary/m.test(content),
    "memo missing Reserved Vocabulary heading",
  );
  // Reserved names should be present in the table.
  for (const name of [
    "ReconciliationPreviewReport",
    "writeReconciliationPreviewReport",
    "rekon reconcile preview --write",
  ]) {
    assert.ok(
      content.includes(name),
      `reserved vocabulary section missing ${name}`,
    );
  }
});

// ---------- 12: cross-link to Preview v1 memo ----------

test("memo cross-links the Reconciliation Preview v1 memo", async () => {
  const content = await readMemo();
  assert.ok(
    existsSync(previewV1MemoPath),
    "preview v1 memo should exist",
  );
  assert.ok(
    content.includes("reconciliation-preview-v1.md"),
    "memo missing cross-link to reconciliation-preview-v1.md",
  );
});

// ---------- 13: cross-link to source-write policy decision ----------

test("memo cross-links the source-write reconciliation policy decision", async () => {
  const content = await readMemo();
  assert.ok(
    existsSync(sourceWritePolicyPath),
    "source-write policy decision should exist",
  );
  assert.ok(
    content.includes("source-write-reconciliation-policy-decision.md"),
    "memo missing cross-link to source-write-reconciliation-policy-decision.md",
  );
});

// ---------- 14: preview v1 memo points back at this decision ----------

test("Reconciliation Preview v1 memo points back at this decision", async () => {
  const content = await readFile(previewV1MemoPath, "utf8");
  assert.ok(
    content.includes(
      "reconciliation-preview-report-artifact-decision.md",
    ),
    "preview v1 memo missing cross-link to this decision memo",
  );
});

// ---------- 15: preview concept doc points at this decision ----------

test("Reconciliation preview concept doc points at this decision", async () => {
  const content = await readFile(previewConceptPath, "utf8");
  assert.ok(
    content.includes(
      "reconciliation-preview-report-artifact-decision.md",
    ),
    "preview concept doc missing cross-link to this decision memo",
  );
});

// ---------- 16: CHANGELOG mention ----------

test("CHANGELOG mentions the ReconciliationPreviewReport artifact decision", async () => {
  const changelog = await readFile(changelogPath, "utf8");
  const flat = changelog.replace(/\s+/g, " ").toLowerCase();
  assert.ok(
    flat.includes("reconciliationpreviewreport") ||
      flat.includes("reconciliationpreviewreport artifact decision") ||
      changelog.includes(
        "docs/strategy/reconciliation-preview-report-artifact-decision.md",
      ),
    "CHANGELOG missing ReconciliationPreviewReport artifact decision entry",
  );
});

// ---------- 17: review packet exists with PURPOSE PRESERVATION CHECK ----------

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
    "## DECISION MODEL",
    "## RESERVED VOCABULARY",
    "## CONDITIONS FOR FUTURE REGISTRATION",
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
  // Sanity-check cross-link presence to the artifact reference + plans concept.
  assert.ok(
    existsSync(reconciliationPlansConceptPath),
    "reconciliation-plans concept should exist",
  );
  assert.ok(
    existsSync(reconciliationPlanArtifactPath),
    "reconciliation-plan artifact reference should exist",
  );
});
