// Documentation coverage for the Semantic File Understanding Intent Context
// Safety Review (slice 151). Pins required headings, the 19 boundary statements,
// the four tables, the CHANGELOG mention, and the review packet's PURPOSE
// PRESERVATION CHECK.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");

const DOC = "docs/strategy/semantic-file-understanding-intent-context-safety-review.md";
const PACKET = ".rekon-dev/review-packets/semantic-file-understanding-intent-context-safety-review.md";
const doc = norm(read(DOC));
const changelog = read("CHANGELOG.md");

test("1. safety review doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, DOC)));
});

test("2. doc contains all required headings", () => {
  const headings = [
    "# semantic file understanding intent context safety review",
    "## decision summary",
    "## why this review exists",
    "## implementation reviewed",
    "## selection model review",
    "## intent assessment review",
    "## plan actionability review",
    "## stale context review",
    "## cli review",
    "## boundary review",
    "## options considered",
    "## recommendation",
    "## what this does not do",
    "## follow-up work",
  ];
  for (const h of headings) assert.ok(doc.includes(h), `missing heading: ${h}`);
});

test("3. says SemanticFileUnderstandingReport is proposal/context, not proof", () => {
  assert.ok(doc.includes("semanticfileunderstandingreport is proposal/context, not proof"));
});

test("4. says semantic context consumption is explicit, not automatic", () => {
  assert.ok(doc.includes("semantic context consumption is explicit, not automatic"));
});

test("5. says semantic context must not approve plans", () => {
  assert.ok(doc.includes("semantic context must not approve plans"));
});

test("6. says semantic context must not satisfy proof gates by itself", () => {
  assert.ok(doc.includes("semantic context must not satisfy proof gates by itself"));
});

test("7. says semantic context must not replace deterministic evidence artifacts", () => {
  assert.ok(doc.includes("semantic context must not replace deterministic evidence artifacts"));
});

test("8. says stale semantic reports are not consumed silently", () => {
  assert.ok(doc.includes("stale semantic reports are not consumed silently"));
});

test("9. says missing explicit semantic-context refs fail cleanly", () => {
  assert.ok(doc.includes("missing explicit semantic-context refs fail cleanly"));
});

test("10. says latest semantic context is path-filtered", () => {
  assert.ok(doc.includes("latest semantic context is path-filtered"));
});

test("11. says IntentAssessmentReport readiness remains governed by existing gates", () => {
  assert.ok(doc.includes("intentassessmentreport readiness remains governed by existing gates"));
});

test("12. says IntentPlanActionabilityReport status remains governed by actionability, not semantic context alone", () => {
  assert.ok(
    doc.includes(
      "intentplanactionabilityreport status remains governed by actionability, not semantic context alone",
    ),
  );
});

test("13. says semantic context creates no PreparedIntentPlan", () => {
  assert.ok(doc.includes("semantic context creates no preparedintentplan"));
});

test("14. says semantic context creates no WorkOrder", () => {
  assert.ok(doc.includes("semantic context creates no workorder"));
});

test("15. says semantic context creates no VerificationPlan", () => {
  assert.ok(doc.includes("semantic context creates no verificationplan"));
});

test("16. says semantic context creates no VerificationRun or VerificationResult", () => {
  assert.ok(doc.includes("semantic context creates no verificationrun or verificationresult"));
});

test("17. says semantic context executes no commands", () => {
  assert.ok(doc.includes("semantic context executes no commands"));
});

test("18. says semantic context writes no source files", () => {
  assert.ok(doc.includes("semantic context writes no source files"));
});

test("19. says semantic context runs no Circe", () => {
  assert.ok(doc.includes("semantic context runs no circe"));
});

test("20. says embeddings remain deferred to a separate track", () => {
  assert.ok(doc.includes("embeddings remain deferred to a separate track"));
});

test("21. says intent:go remains deferred", () => {
  assert.ok(doc.includes("intent:go remains deferred"));
});

test("22. doc includes surface table", () => {
  assert.ok(doc.includes("| --semantic-context latest | shipped | explicit opt-in |"));
});

test("23. doc includes consumption table", () => {
  assert.ok(doc.includes("| intentassessmentreport | matchedcontext enrichment / warnings only |"));
});

test("24. doc includes boundary table", () => {
  assert.ok(doc.includes("| semantic context vs proof | proposal/context |"));
});

test("25. doc includes option table", () => {
  assert.ok(doc.includes("| declare intent-context integration safe/stable | selected | explicit/context-only boundary holds |"));
});

test("26. CHANGELOG mentions Semantic File Understanding Intent Context Safety Review", () => {
  assert.ok(changelog.includes("Semantic File Understanding Intent Context Safety Review"));
});

test("27. review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, PACKET)), "review packet exists");
  assert.ok(read(PACKET).includes("PURPOSE PRESERVATION CHECK"));
});
