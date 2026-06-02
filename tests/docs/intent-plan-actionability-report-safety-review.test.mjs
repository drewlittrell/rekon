// Docs tests for the Intent Plan Actionability Report Safety Review (strategy /
// safety-review batch). Confirms the memo declares the plan-compiler layer
// safe/stable as a read / transform / report-only capability, with the required
// headings, boundary statements, and tables.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

function read(rel) {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

function normalize(text) {
  return text.replace(/[`*]/g, "").replace(/\s+/g, " ");
}

const memoPath = "docs/strategy/intent-plan-actionability-report-safety-review.md";
const reviewPacket = ".rekon-dev/review-packets/intent-plan-actionability-report-safety-review.md";
const changelog = "CHANGELOG.md";

const memo = () => normalize(read(memoPath));

// ---------- 1 ----------
test("safety review doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, memoPath)));
  assert.match(read(memoPath), /#\s*Intent Plan Actionability Report Safety Review/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const raw = read(memoPath);
  const headings = [
    "Decision Summary",
    "Why This Review Exists",
    "Implementation Reviewed",
    "Artifact Model Review",
    "Parser And Normalization Review",
    "Actionability Review",
    "Elicitation Question Review",
    "Revision Prompt Review",
    "Semantic Boundary Review",
    "CLI Review",
    "Boundary Review",
    "Options Considered",
    "Recommendation",
    "What This Does Not Do",
    "Follow-Up Work",
  ];
  for (const h of headings) {
    assert.ok(new RegExp(`##\\s+${h.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}`).test(raw), `missing heading: ${h}`);
  }
});

// ---------- 3 ----------
test("doc says raw plans are reviewed before approval", () => {
  assert.ok(memo().includes("Raw plans are reviewed before approval."));
});

// ---------- 4 ----------
test("doc says the report normalizes plans into phase drafts", () => {
  assert.ok(memo().includes("IntentPlanActionabilityReport normalizes plans into phase drafts."));
});

// ---------- 5 ----------
test("doc says missing requirements become findings and questions", () => {
  assert.ok(memo().includes("Missing requirements become findings and questions."));
});

// ---------- 6 ----------
test("doc says revisionPrompt gives LLM/operator feedback", () => {
  assert.ok(memo().includes("revisionPrompt gives LLM/operator feedback."));
});

// ---------- 7 ----------
test("doc says semantic normalization is bounded to read/transform/critique", () => {
  assert.ok(memo().includes("LLM-backed semantic normalization is bounded to read/transform/critique."));
});

// ---------- 8 ----------
test("doc says semantic normalization executes nothing", () => {
  assert.ok(memo().includes("Semantic normalization executes nothing."));
});

// ---------- 9 ----------
test("doc says semantic normalization writes no source files", () => {
  assert.ok(memo().includes("Semantic normalization writes no source files."));
});

// ---------- 10 ----------
test("doc says plan review creates no PreparedIntentPlan", () => {
  assert.ok(memo().includes("Plan review creates no PreparedIntentPlan."));
});

// ---------- 11 ----------
test("doc says plan review creates no WorkOrder", () => {
  assert.ok(memo().includes("Plan review creates no WorkOrder."));
});

// ---------- 12 ----------
test("doc says plan review creates no VerificationPlan", () => {
  assert.ok(memo().includes("Plan review creates no VerificationPlan."));
});

// ---------- 13 ----------
test("doc says plan review creates no VerificationRun or VerificationResult", () => {
  assert.ok(memo().includes("Plan review creates no VerificationRun or VerificationResult."));
});

// ---------- 14 ----------
test("doc says plan review executes no commands", () => {
  assert.ok(memo().includes("Plan review executes no commands."));
});

// ---------- 15 ----------
test("doc says plan review writes no source files", () => {
  assert.ok(memo().includes("Plan review writes no source files."));
});

// ---------- 16 ----------
test("doc says plan review runs no Circe", () => {
  assert.ok(memo().includes("Plan review runs no Circe."));
});

// ---------- 17 ----------
test("doc says intent:go remains deferred", () => {
  assert.ok(memo().includes("intent:go remains deferred."));
});

// ---------- 18 ----------
test("doc says actionability review is report-only until the prepare integration slice", () => {
  assert.ok(memo().includes("Actionability review is report-only until the prepare integration slice."));
});

// ---------- 19 ----------
test("doc includes surface table", () => {
  assert.ok(memo().includes("| Surface | Status | Safety Finding |"));
});

// ---------- 20 ----------
test("doc includes boundary table", () => {
  assert.ok(memo().includes("| Boundary | Decision |"));
});

// ---------- 21 ----------
test("doc includes semantic boundary table", () => {
  assert.ok(memo().includes("| Surface | Decision |"));
});

// ---------- 22 ----------
test("doc includes option table", () => {
  assert.ok(memo().includes("| Option | Decision | Reason |"));
});

// ---------- 23 ----------
test("CHANGELOG mentions Intent Plan Actionability Report Safety Review", () => {
  assert.ok(normalize(read(changelog)).includes("Intent Plan Actionability Report Safety Review"));
});

// ---------- 24 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});
