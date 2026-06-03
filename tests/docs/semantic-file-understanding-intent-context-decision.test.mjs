// Documentation coverage for the Semantic File Understanding Intent Context
// Decision (slice 149). Pins required headings, the 12 boundary statements, the
// four tables, the CHANGELOG mention, and the review packet's PURPOSE
// PRESERVATION CHECK.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");

const DOC = "docs/strategy/semantic-file-understanding-intent-context-decision.md";
const PACKET = ".rekon-dev/review-packets/semantic-file-understanding-intent-context-decision.md";
const doc = norm(read(DOC));
const changelog = read("CHANGELOG.md");

test("1. decision memo exists", () => {
  assert.ok(existsSync(resolve(repoRoot, DOC)));
});

test("2. doc contains all required headings", () => {
  const headings = [
    "# semantic file understanding intent context decision",
    "## decision summary",
    "## why this decision exists",
    "## current semantic file surface",
    "## options considered",
    "## recommendation",
    "## intentassessmentreport consumption",
    "## intentplanactionabilityreport consumption",
    "## staleness and relevance model",
    "## cli surface",
    "## boundary model",
    "## what this does not do",
    "## implementation sequence",
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

test("8. says semantic context must not execute commands", () => {
  assert.ok(doc.includes("semantic context must not execute commands"));
});

test("9. says semantic context must not write source files", () => {
  assert.ok(doc.includes("semantic context must not write source files"));
});

test("10. says semantic context must not create WorkOrder or VerificationPlan", () => {
  assert.ok(doc.includes("semantic context must not create workorder or verificationplan"));
});

test("11. says semantic context must not run Circe", () => {
  assert.ok(doc.includes("semantic context must not run circe"));
});

test("12. says stale semantic reports must not be consumed silently", () => {
  assert.ok(doc.includes("stale semantic reports must not be consumed silently"));
});

test("13. says embeddings remain deferred to a separate track", () => {
  assert.ok(doc.includes("embeddings remain deferred to a separate track"));
});

test("14. says intent:go remains deferred", () => {
  assert.ok(doc.includes("intent:go remains deferred"));
});

test("15. doc includes option table", () => {
  assert.ok(doc.includes("| explicit semantic context consumption | selected | useful without surprise/proof confusion |"));
});

test("16. doc includes consumption table", () => {
  assert.ok(doc.includes("| intentassessmentreport | matchedcontext enrichment / warnings |"));
});

test("17. doc includes staleness table", () => {
  assert.ok(doc.includes("| path + sha256 match | usable as context |"));
});

test("18. doc includes boundary table", () => {
  assert.ok(doc.includes("| semantic context vs proof | proposal/context |"));
});

test("19. CHANGELOG mentions Semantic File Understanding Intent Context Decision", () => {
  assert.ok(changelog.includes("Semantic File Understanding Intent Context Decision"));
});

test("20. review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, PACKET)), "review packet exists");
  assert.ok(read(PACKET).includes("PURPOSE PRESERVATION CHECK"));
});
