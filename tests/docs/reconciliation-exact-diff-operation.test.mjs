// Docs contract tests for the
// reconciliation-exact-diff-operation-v1 slice.

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
  "reconciliation-exact-diff-operation-v1.md",
);
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "reconciliation-exact-diff-operation-v1.md",
);
const previewConceptPath = join(
  repoRoot,
  "docs",
  "concepts",
  "reconciliation-preview.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function flatMemo() {
  return (await readFile(memoPath, "utf8")).replace(/\s+/g, " ");
}

// ---------- 1: strategy memo exists ----------

test("reconciliation exact-diff operation v1 strategy memo exists", () => {
  assert.ok(existsSync(memoPath), `expected ${memoPath}`);
});

// ---------- 2: docs mention optional beforeText / afterText ----------

test("docs mention optional beforeText / afterText fields", async () => {
  const memo = await readMemo();
  for (const token of ["beforeText", "afterText", "diffKind"]) {
    assert.ok(
      memo.includes(token),
      `memo must mention ${token}`,
    );
  }
  const flat = await flatMemo();
  assert.ok(
    flat.includes("additive") && flat.includes("optional"),
    "memo must explain that fields are additive and optional",
  );
  const concept = await readFile(previewConceptPath, "utf8");
  assert.ok(
    concept.includes("exact_text_replacement") ||
      concept.includes("Exact-Diff Operation v1"),
    "preview concept doc must reference the exact-diff operation",
  );
});

// ---------- 3: docs say exact diff is generated only when deterministic ----------

test("docs say exact diff is generated only when deterministic", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes("Exact diff is generated only when deterministic.") ||
      flat.includes("exact diff is generated only when deterministic"),
    "memo must pin 'Exact diff is generated only when deterministic.'",
  );
  assert.ok(
    /eight[\s-]*precondition/i.test(flat),
    "memo must describe the eight-precondition safety gate",
  );
});

// ---------- 4: docs say source-write apply remains unavailable ----------

test("docs say source-write apply remains unavailable", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes("Source-write apply remains unavailable."),
    "memo must pin 'Source-write apply remains unavailable.'",
  );
});

// ---------- 5: docs say preview does not resolve findings ----------

test("docs say a previewable diff does not resolve findings", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes("Previewable diff does not resolve findings.") ||
      flat.includes("previewable diff does not resolve findings"),
    "memo must pin that a previewable diff does not resolve findings",
  );
});

// ---------- 6: CHANGELOG mentions exact-diff operation v1 ----------

test("CHANGELOG mentions exact-diff operation v1", async () => {
  const changelog = await readFile(changelogPath, "utf8");
  const flat = changelog.replace(/\s+/g, " ").toLowerCase();
  assert.ok(
    flat.includes("exact-diff operation v1") ||
      flat.includes("reconciliation exact-diff operation") ||
      changelog.includes(
        "docs/strategy/reconciliation-exact-diff-operation-v1.md",
      ),
    "CHANGELOG missing exact-diff operation v1 entry",
  );
});

// ---------- 7: review packet exists with PURPOSE PRESERVATION CHECK ----------

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
    "## OPERATION CLASS SELECTED",
    "## EXACT DIFF MODEL",
    "## PREVIEW BEHAVIOR",
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
