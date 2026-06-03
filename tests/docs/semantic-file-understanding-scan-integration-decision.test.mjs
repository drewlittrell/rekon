// Documentation coverage for the Semantic File Understanding Scan Integration Decision
// (slice 146). Pins the required headings, boundary statements, the four tables, the
// CHANGELOG entry, and the review packet's PURPOSE PRESERVATION CHECK.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");

const DOC = "docs/strategy/semantic-file-understanding-scan-integration-decision.md";
const PACKET = ".rekon-dev/review-packets/semantic-file-understanding-scan-integration-decision.md";
const doc = norm(read(DOC));
const changelog = read("CHANGELOG.md");

test("1. decision memo exists", () => {
  assert.ok(existsSync(resolve(repoRoot, DOC)));
});

test("2. doc contains all required headings", () => {
  const headings = [
    "# semantic file understanding scan integration decision",
    "## decision summary",
    "## why this decision exists",
    "## current scan surface",
    "## options considered",
    "## recommendation",
    "## batch command model",
    "## scan flag model",
    "## cache and staleness model",
    "## source text privacy model",
    "## intent context relationship",
    "## boundary model",
    "## what this does not do",
    "## implementation sequence",
  ];
  for (const h of headings) assert.ok(doc.includes(h), `missing heading: ${h}`);
});

test("3. says scan remains deterministic by default", () => {
  assert.ok(doc.includes("scan remains deterministic by default"));
});

test("4. says semantic file understanding during scan is explicit opt-in only", () => {
  assert.ok(doc.includes("semantic file understanding during scan is explicit opt-in only"));
});

test("5. says provider calls are never surprising defaults", () => {
  assert.ok(doc.includes("provider calls are never surprising defaults"));
});

test("6. says source text is not sent to providers by default", () => {
  assert.ok(doc.includes("source text is not sent to providers by default"));
});

test("7. says SemanticFileUnderstandingReport is proposal/context, not proof", () => {
  assert.ok(doc.includes("semanticfileunderstandingreport is proposal/context, not proof"));
});

test("8. says semantic file understanding does not approve plans", () => {
  assert.ok(doc.includes("semantic file understanding does not approve plans"));
});

test("9. says semantic file understanding does not execute commands", () => {
  assert.ok(doc.includes("semantic file understanding does not execute commands"));
});

test("10. says semantic file understanding does not write source files", () => {
  assert.ok(doc.includes("semantic file understanding does not write source files"));
});

test("11. says semantic file understanding does not generate embeddings", () => {
  assert.ok(doc.includes("semantic file understanding does not generate embeddings"));
});

test("12. says embeddings remain deferred to a separate track", () => {
  assert.ok(doc.includes("embeddings remain deferred to a separate track"));
});

test("13. says intent:go remains deferred", () => {
  assert.ok(doc.includes("intent:go remains deferred"));
});

test("14. includes the option table", () => {
  assert.ok(doc.includes("explicit batch command before scan flag | selected | repo-scale without surprising scan"));
  assert.ok(doc.includes("automatic during scan | rejected | cost/privacy/surprise risk"));
});

test("15. includes the command table", () => {
  assert.ok(doc.includes("semantic files understand --changed | selected next"));
  assert.ok(doc.includes("scan default behavior | deterministic"));
});

test("16. includes the staleness table", () => {
  assert.ok(doc.includes("file hash unchanged | reuse report"));
  assert.ok(doc.includes("file hash changed | stale / regenerate"));
});

test("17. includes the boundary table", () => {
  assert.ok(doc.includes("scan default | deterministic"));
  assert.ok(doc.includes("source text privacy | not sent by default"));
});

test("18. CHANGELOG mentions Semantic File Understanding Scan Integration Decision", () => {
  assert.match(changelog, /Semantic File Understanding Scan Integration Decision/);
});

test("19. review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, PACKET)));
  assert.match(read(PACKET), /PURPOSE PRESERVATION CHECK/);
});
