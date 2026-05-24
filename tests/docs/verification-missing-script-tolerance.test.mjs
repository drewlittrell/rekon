// Docs contract tests for the VerificationPlan
// Missing-Script Tolerance memo — the first post-beta
// polish slice surfaced by the real-repo cohort.

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
  "verification-missing-script-tolerance.md",
);
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "verification-missing-script-tolerance.md",
);
const conceptPath = join(
  repoRoot,
  "docs",
  "concepts",
  "verification-runs.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const readmePath = join(repoRoot, "README.md");

async function readMemo() {
  return readFile(memoPath, "utf8");
}

// ---------- 1: memo exists ----------

test("missing-script tolerance memo exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("memo contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "# VerificationPlan Missing-Script Tolerance",
    "## Why",
    "## What Ships",
    "## Out Of Scope",
    "## Safety",
    "## Tests",
    "## Decision Log",
    "## Cross-References",
    "## Status",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `expected heading: ${heading}`,
    );
  }
});

// ---------- 3: status banner ----------

test("memo declares shipped status with cohort attribution", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /Status:\*\*\s*shipped/i,
    "expected shipped status banner",
  );
  assert.match(
    content,
    /cohort/i,
    "expected attribution to the real-repo cohort",
  );
});

// ---------- 4: cites the cohort summary ----------

test("memo cross-references the cohort summary", async () => {
  const content = await readMemo();
  assert.ok(
    content.includes("real-repo-cohort-summary.md"),
    "expected link to real-repo-cohort-summary.md",
  );
});

// ---------- 5: names the surfaced repos ----------

test("memo names the two surfaced cohort repos", async () => {
  const content = await readMemo();
  assert.ok(
    content.includes("structured-evals"),
    "expected mention of structured-evals (missing build)",
  );
  assert.ok(
    content.includes("figma-ds"),
    "expected mention of figma-ds (missing test)",
  );
});

// ---------- 6: pins package managers covered ----------

test("memo lists the supported package managers", async () => {
  const content = await readMemo();
  for (const pm of ["npm", "pnpm", "yarn"]) {
    assert.ok(
      content.includes(pm),
      `expected coverage of package manager: ${pm}`,
    );
  }
});

// ---------- 7: explicitly out-of-scope items ----------

test("memo enumerates out-of-scope items", async () => {
  const content = await readMemo();
  assert.ok(
    /auto-fix|plan-rewrite|edit the .*VerificationPlan/i.test(content),
    "expected an explicit no-auto-fix clause",
  );
  assert.ok(
    /workspace resolution|monorepo|directory walk/i.test(content),
    "expected an out-of-scope clause for workspace walks",
  );
});

// ---------- 8: pins the safety contract ----------

test("memo pins the safety contract", async () => {
  const content = await readMemo();
  // Flatten to tolerate intra-paragraph line wraps.
  const flat = content.replace(/\s+/g, " ");
  assert.ok(
    /no new permission/i.test(flat),
    "expected: no new permission",
  );
  assert.ok(
    /no source writes/i.test(flat),
    "expected: no source writes",
  );
  assert.ok(
    /no network/i.test(flat),
    "expected: no network I/O",
  );
});

// ---------- 9: names the helper and the wire-in ----------

test("memo names the helper and the wire-in surface", async () => {
  const content = await readMemo();
  assert.ok(
    content.includes("detectMissingScriptCommands"),
    "expected helper name detectMissingScriptCommands",
  );
  assert.ok(
    content.includes("executeVerificationRun"),
    "expected wire-in surface executeVerificationRun",
  );
});

// ---------- 10: review packet exists and aligns ----------

test("review packet exists and shares the slice name", async () => {
  assert.ok(existsSync(reviewPacketPath), `expected review packet at ${reviewPacketPath}`);
  const packet = await readFile(reviewPacketPath, "utf8");
  assert.ok(
    packet.includes("verification-missing-script-tolerance"),
    "expected slice name in review packet",
  );
  assert.ok(
    packet.includes("detectMissingScriptCommands"),
    "expected helper name in review packet",
  );
  assert.ok(
    packet.includes("executeVerificationRun"),
    "expected wire-in surface in review packet",
  );
});

// ---------- 11: concept doc updated ----------

test("verification-runs concept doc mentions missing-script tolerance", async () => {
  const content = await readFile(conceptPath, "utf8");
  assert.ok(
    /missing-script/i.test(content),
    "expected verification-runs.md to mention missing-script tolerance",
  );
});

// ---------- 12: CHANGELOG + README record the slice ----------

test("CHANGELOG records the missing-script tolerance slice", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.ok(
    /missing-script/i.test(content),
    "expected CHANGELOG entry for missing-script tolerance",
  );
});

test("README references the missing-script tolerance memo", async () => {
  const content = await readFile(readmePath, "utf8");
  assert.ok(
    content.includes("verification-missing-script-tolerance"),
    "expected README link to the memo",
  );
});
