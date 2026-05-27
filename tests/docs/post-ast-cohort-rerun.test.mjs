// Docs tests for the Post-AST Cohort Re-Run
// (twenty-sixth slice on the capability-ontology
// track). Pins the verbatim guarantees the memo must
// carry so future implementers do not regress.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

async function read(path) {
  return await readFile(`${repoRoot}/${path}`, "utf8");
}

function plainText(text) {
  return text.replace(/\s+/g, " ").toLowerCase().replace(/`/g, "");
}

const memoPath = "docs/strategy/post-ast-cohort-rerun.md";

// ---------- 1: review doc exists ----------

test("review doc exists at expected path", async () => {
  const text = await read(memoPath);
  assert.ok(text.length > 1000, "memo must be substantial");
  assert.ok(text.includes("# Post-AST Cohort Re-Run"));
});

// ---------- 2: required headings ----------

test("memo contains all 12 required headings", async () => {
  const text = await read(memoPath);
  const required = [
    "## Decision Summary",
    "## Why This Re-Run Exists",
    "## Targets Reviewed",
    "## Command Matrix",
    "## EvidenceGraph AST Results",
    "## Normalization Results",
    "## Phrase Results",
    "## Pre-AST / Post-AST Comparison",
    "## Fixture Comparison",
    "## Publication Usefulness",
    "## CapabilityMap Readiness",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(text.includes(heading), `memo must include ${heading}`);
  }
});

// ---------- 3: doc says real cohort targets were re-run ----------

test("memo says real cohort targets were re-run", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("real cohort targets were re-run"),
    "memo must pin that real cohort targets were re-run",
  );
});

// ---------- 4: doc records whether AST improved stable phrase density on real repos ----------

test("memo records whether AST improved stable phrase density on real repos", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("ast improved stable phrase density on a real repo"),
    "memo must record AST improved stable phrase density on a real repo",
  );
});

// ---------- 5: CapabilityMap v2 is evidence-gated ----------

test("memo says CapabilityMap v2 is evidence-gated", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitymap v2 is evidence-gated"),
    "memo must pin CapabilityMap v2 as evidence-gated",
  );
});

// ---------- 6: partial phrases alone do not justify CapabilityMap v2 ----------

test("memo says partial phrases alone do not justify CapabilityMap v2", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("partial phrases alone do not justify capabilitymap v2"),
    "memo must pin that partial phrases alone do not justify CapabilityMap v2",
  );
});

// ---------- 7: target table ----------

test("memo includes the target table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Target | Archetype | Source | Result |"));
  const plain = plainText(text);
  assert.ok(plain.includes("target-1"));
  assert.ok(plain.includes("target-2"));
});

// ---------- 8: EvidenceGraph table ----------

test("memo includes the EvidenceGraph table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Target | Total Facts | AST Facts | Regex Fallback Facts |"));
});

// ---------- 9: normalization table ----------

test("memo includes the normalization table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Target | Total Candidates | Normalized |"));
});

// ---------- 10: phrase table ----------

test("memo includes the phrase table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Target | Total Phrases | Stable | Partial | Low Confidence |"));
});

// ---------- 11: pre/post comparison table ----------

test("memo includes the pre/post comparison table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Target | Metric | Pre-AST | Post-AST | Decision |"));
  const plain = plainText(text);
  assert.ok(plain.includes("9,110"));
  assert.ok(plain.includes("9,327"));
});

// ---------- 12: readiness table ----------

test("memo includes the readiness table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Gate | Result | Notes |"));
  const plain = plainText(text);
  assert.ok(plain.includes("stable evidence refs present"));
});

// ---------- 13: option table ----------

test("memo includes the option table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Option | Decision | Reason |"));
  const plain = plainText(text);
  assert.ok(plain.includes("capabilitymap v2 high-confidence-only"));
});

// ---------- 14: CHANGELOG mentions Post-AST Cohort Re-Run ----------

test("CHANGELOG mentions the Post-AST Cohort Re-Run", async () => {
  const changelog = plainText(await read("CHANGELOG.md"));
  assert.ok(
    changelog.includes("post-ast cohort re-run"),
    "CHANGELOG must mention the Post-AST Cohort Re-Run",
  );
});

// ---------- 15: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/post-ast-cohort-rerun.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(
    packet.includes("Post-AST Cohort Re-Run")
      || packet.includes("post-ast-cohort-rerun"),
  );
});
