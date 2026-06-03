// Documentation coverage for the Semantic File Understanding Safety Review (slice 145).
// Pins the required headings, boundary statements, the four tables, the CHANGELOG entry,
// and the review packet's PURPOSE PRESERVATION CHECK.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");

const DOC = "docs/strategy/semantic-file-understanding-safety-review.md";
const PACKET = ".rekon-dev/review-packets/semantic-file-understanding-safety-review.md";
const doc = norm(read(DOC));
const changelog = read("CHANGELOG.md");

test("1. safety review doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, DOC)));
});

test("2. doc contains all required headings", () => {
  const headings = [
    "# semantic file understanding safety review",
    "## decision summary",
    "## why this review exists",
    "## implementation reviewed",
    "## artifact model review",
    "## deterministic extraction review",
    "## semantic provider review",
    "## cli review",
    "## boundary review",
    "## options considered",
    "## recommendation",
    "## what this does not do",
    "## follow-up work",
  ];
  for (const h of headings) assert.ok(doc.includes(h), `missing heading: ${h}`);
});

test("3. says semantic file understanding is proposal/context, not proof", () => {
  assert.ok(doc.includes("semantic file understanding is proposal/context, not proof"));
});

test("4. says deterministic structural facts remain authoritative for imports and public exports", () => {
  assert.ok(doc.includes("deterministic structural facts remain authoritative for imports and public exports"));
});

test("5. says provider output is schema-validated and deterministically rechecked", () => {
  assert.ok(doc.includes("provider output is schema-validated and deterministically rechecked"));
});

test("6. says source files are read, not modified", () => {
  assert.ok(doc.includes("source files are read, not modified"));
});

test("7. says semantic file understanding executes no commands", () => {
  assert.ok(doc.includes("semantic file understanding executes no commands"));
});

test("8. says semantic file understanding writes no source files", () => {
  assert.ok(doc.includes("semantic file understanding writes no source files"));
});

test("9. says semantic file understanding generates no embeddings", () => {
  assert.ok(doc.includes("semantic file understanding generates no embeddings"));
});

test("10. says semantic file understanding creates no PreparedIntentPlan", () => {
  assert.ok(doc.includes("semantic file understanding creates no preparedintentplan"));
});

test("11. says semantic file understanding creates no WorkOrder", () => {
  assert.ok(doc.includes("semantic file understanding creates no workorder"));
});

test("12. says semantic file understanding creates no VerificationPlan", () => {
  assert.ok(doc.includes("semantic file understanding creates no verificationplan"));
});

test("13. says semantic file understanding creates no VerificationRun or VerificationResult", () => {
  assert.ok(doc.includes("semantic file understanding creates no verificationrun or verificationresult"));
});

test("14. says semantic file understanding runs no Circe", () => {
  assert.ok(doc.includes("semantic file understanding runs no circe"));
});

test("15. says intent:go remains deferred", () => {
  assert.ok(doc.includes("intent:go remains deferred"));
});

test("16. says scan integration remains deferred", () => {
  assert.ok(doc.includes("scan integration remains deferred"));
});

test("17. says embeddings remain deferred to a separate track", () => {
  assert.ok(doc.includes("embeddings remain deferred to a separate track"));
});

test("18. includes the surface table", () => {
  assert.ok(doc.includes("semanticfileunderstandingreport | shipped | proposal/context only"));
  assert.ok(doc.includes("scan integration | absent | deferred"));
});

test("19. includes the boundary table", () => {
  assert.ok(doc.includes("semantic output vs proof | proposal/context only"));
  assert.ok(doc.includes("deterministic facts vs semantic claims | deterministic facts win"));
});

test("20. includes the mode table", () => {
  assert.ok(doc.includes("auto with unavailable provider | deterministic fallback with warning"));
  assert.ok(doc.includes("required with unavailable provider | non-zero / no report"));
});

test("21. includes the option table", () => {
  assert.ok(doc.includes("declare semantic file understanding v1 safe/stable | selected | report-only boundary holds"));
  assert.ok(doc.includes("auto-run during scan now | rejected | surprise/cost/privacy risk"));
});

test("22. CHANGELOG mentions Semantic File Understanding Safety Review", () => {
  assert.match(changelog, /Semantic File Understanding Safety Review/);
});

test("23. review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, PACKET)));
  assert.match(read(PACKET), /PURPOSE PRESERVATION CHECK/);
});
