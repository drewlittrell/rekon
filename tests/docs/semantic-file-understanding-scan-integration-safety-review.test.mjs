// Documentation coverage for the Semantic File Understanding Scan Integration
// Safety Review (slice 148). Pins required headings, the 25 required statements,
// the four tables, the CHANGELOG mention, and the review packet's PURPOSE
// PRESERVATION CHECK.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");

const DOC = "docs/strategy/semantic-file-understanding-scan-integration-safety-review.md";
const PACKET = ".rekon-dev/review-packets/semantic-file-understanding-scan-integration-safety-review.md";
const doc = norm(read(DOC));
const changelog = read("CHANGELOG.md");

test("1. safety review doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, DOC)));
});

test("2. doc contains all required headings", () => {
  const headings = [
    "# semantic file understanding scan integration safety review",
    "## decision summary",
    "## why this review exists",
    "## implementation reviewed",
    "## scan default review",
    "## semantic mode review",
    "## file selection review",
    "## reuse and staleness review",
    "## artifact identity review",
    "## cli review",
    "## boundary review",
    "## options considered",
    "## recommendation",
    "## what this does not do",
    "## follow-up work",
  ];
  for (const h of headings) assert.ok(doc.includes(h), `missing heading: ${h}`);
});

test("3. says plain `rekon scan` remains deterministic", () => {
  assert.ok(doc.includes("plain rekon scan remains deterministic"));
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

test("7. says `--semantic-files off` writes no SemanticFileUnderstandingReport", () => {
  assert.ok(doc.includes("--semantic-files off writes no semanticfileunderstandingreport"));
});

test("8. says `--semantic-files auto` falls back safely when provider is unavailable", () => {
  assert.ok(doc.includes("--semantic-files auto falls back safely when provider is unavailable"));
});

test("9. says `--semantic-files required` fails cleanly without partial report writes when provider is unavailable", () => {
  assert.ok(
    doc.includes(
      "--semantic-files required fails cleanly without partial report writes when provider is unavailable",
    ),
  );
});

test("10. says semantic scan skips ignored, generated, binary, large, and lock files", () => {
  assert.ok(doc.includes("semantic scan skips ignored, generated, binary, large, and lock files"));
});

test("11. says semantic scan supports `--semantic-file-limit`", () => {
  assert.ok(doc.includes("semantic scan supports --semantic-file-limit"));
});

test("12. says semantic scan supports `--semantic-file-path`", () => {
  assert.ok(doc.includes("semantic scan supports --semantic-file-path"));
});

test("13. says semantic scan supports `--semantic-changed-only`", () => {
  assert.ok(doc.includes("semantic scan supports --semantic-changed-only"));
});

test("14. says semantic scan reuses reports by file sha256 plus provider/model/mode policy", () => {
  assert.ok(doc.includes("semantic scan reuses reports by file sha256 plus provider/model/mode policy"));
});

test("15. says semantic scan regenerates reports when file sha256 or provider/model policy changes", () => {
  assert.ok(doc.includes("semantic scan regenerates reports when file sha256 or provider/model policy changes"));
});

test("16. says batch SemanticFileUnderstandingReport artifact IDs are unique", () => {
  assert.ok(doc.includes("batch semanticfileunderstandingreport artifact ids are unique"));
});

test("17. says deterministic imports and public exports remain authoritative", () => {
  assert.ok(doc.includes("deterministic imports and public exports remain authoritative"));
});

test("18. says source files are read, not modified", () => {
  assert.ok(doc.includes("source files are read, not modified"));
});

test("19. says semantic scan executes no commands", () => {
  assert.ok(doc.includes("semantic scan executes no commands"));
});

test("20. says semantic scan generates no embeddings", () => {
  assert.ok(doc.includes("semantic scan generates no embeddings"));
});

test("21. says semantic scan creates no PreparedIntentPlan", () => {
  assert.ok(doc.includes("semantic scan creates no preparedintentplan"));
});

test("22. says semantic scan creates no WorkOrder", () => {
  assert.ok(doc.includes("semantic scan creates no workorder"));
});

test("23. says semantic scan creates no VerificationPlan", () => {
  assert.ok(doc.includes("semantic scan creates no verificationplan"));
});

test("24. says semantic scan creates no VerificationRun or VerificationResult", () => {
  assert.ok(doc.includes("semantic scan creates no verificationrun or verificationresult"));
});

test("25. says semantic scan runs no Circe", () => {
  assert.ok(doc.includes("semantic scan runs no circe"));
});

test("26. says intent:go remains deferred", () => {
  assert.ok(doc.includes("intent:go remains deferred"));
});

test("27. says semantic file understanding is not yet consumed automatically by intent context", () => {
  assert.ok(doc.includes("semantic file understanding is not yet consumed automatically by intent context"));
});

test("28. doc includes surface table", () => {
  assert.ok(doc.includes("| plain scan | shipped | deterministic / unchanged |"));
});

test("29. doc includes mode table", () => {
  assert.ok(doc.includes("| required | provider required, no partial reports |"));
});

test("30. doc includes boundary table", () => {
  assert.ok(doc.includes("| circe | not run |"));
});

test("31. doc includes option table", () => {
  assert.ok(doc.includes("| embeddings next | deferred | separate track |"));
});

test("32. CHANGELOG mentions Semantic File Understanding Scan Integration Safety Review", () => {
  assert.ok(changelog.includes("Semantic File Understanding Scan Integration Safety Review"));
});

test("33. review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, PACKET)), "review packet exists");
  assert.ok(read(PACKET).includes("PURPOSE PRESERVATION CHECK"));
});
