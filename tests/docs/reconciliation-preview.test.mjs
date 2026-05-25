// Docs contract tests for Reconciliation Preview v1.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const conceptPath = join(repoRoot, "docs", "concepts", "reconciliation-preview.md");
const memoPath = join(repoRoot, "docs", "strategy", "reconciliation-preview-v1.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "reconciliation-preview-v1.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");

async function flat(path) {
  return (await readFile(path, "utf8")).replace(/\s+/g, " ");
}

// ---------- 1: concept doc exists ----------

test("reconciliation preview concept doc exists", () => {
  assert.ok(existsSync(conceptPath), `expected ${conceptPath}`);
});

// ---------- 2: strategy memo exists ----------

test("reconciliation preview v1 strategy memo exists", () => {
  assert.ok(existsSync(memoPath), `expected ${memoPath}`);
});

// ---------- 3: docs say source-write apply is not available ----------

test("docs say source-write apply is not available", async () => {
  const conceptFlat = await flat(conceptPath);
  const memoFlat = await flat(memoPath);
  assert.ok(
    conceptFlat.includes("Source-write apply is not available.") ||
      conceptFlat.includes("Source-write apply does not exist."),
    "concept doc must say source-write apply is not available",
  );
  assert.ok(
    memoFlat.includes("Source-write apply remains unavailable.") ||
      memoFlat.includes("Source-write apply is not available."),
    "memo must say source-write apply is not available",
  );
});

// ---------- 4: docs say exact diff is mandatory before apply ----------

test("docs say exact diff is mandatory before apply", async () => {
  const memoFlat = await flat(memoPath);
  assert.ok(
    memoFlat.includes("Exact diff preview is mandatory before any apply implementation."),
    "memo must pin 'Exact diff preview is mandatory before any apply implementation.'",
  );
});

// ---------- 5: docs say non-previewable operations are explicit ----------

test("docs say non-previewable operations are explicit", async () => {
  const conceptContent = await readFile(conceptPath, "utf8");
  assert.ok(
    /##\s+Non-Previewable Operations Are Explicit/.test(conceptContent),
    "concept doc must include 'Non-Previewable Operations Are Explicit' section",
  );
  const conceptFlat = conceptContent.replace(/\s+/g, " ");
  assert.ok(
    conceptFlat.includes("previewable: false") &&
      conceptFlat.includes("ReconciliationPlan does not include exact patch data"),
    "concept doc must spell out the explicit reason for non-previewable operations",
  );
});

// ---------- 6: docs say preview does not resolve findings ----------

test("docs say preview does not resolve findings", async () => {
  const conceptFlat = await flat(conceptPath);
  const memoFlat = await flat(memoPath);
  const conceptOk =
    conceptFlat.includes("The preview does not resolve findings.") ||
    conceptFlat.includes("Successful Preview Does Not Resolve Findings");
  const memoOk =
    memoFlat.includes("auto-resolve findings") ||
    memoFlat.includes("does not resolve findings");
  assert.ok(conceptOk, "concept doc must say preview does not resolve findings");
  assert.ok(memoOk, "memo must say preview does not auto-resolve findings");
});

// ---------- 7: CHANGELOG mentions reconciliation preview ----------

test("CHANGELOG mentions reconciliation preview", async () => {
  const changelog = await readFile(changelogPath, "utf8");
  const flatLog = changelog.replace(/\s+/g, " ").toLowerCase();
  assert.ok(
    flatLog.includes("reconciliation preview"),
    "CHANGELOG missing reconciliation preview entry",
  );
});

// ---------- 8: review packet exists with PURPOSE PRESERVATION CHECK ----------

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
    "## PREVIEW MODEL",
    "## DIFF MODEL",
    "## CLI SURFACE",
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
