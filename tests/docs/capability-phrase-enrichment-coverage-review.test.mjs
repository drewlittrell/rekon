// Docs tests for the CapabilityPhraseReport enrichment
// coverage review.
//
// Pins the verbatim guarantees the coverage review must
// carry: enrichment materially improved coverage; stable
// threshold remains unchanged; partial phrases alone do
// not justify CapabilityMap v2; CapabilityMap v2 is
// evidence-gated.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

async function read(path) {
  return await readFile(`${repoRoot}/${path}`, "utf8");
}

function collapseWhitespace(text) {
  return text.replace(/\s+/g, " ");
}

function plainText(text) {
  return collapseWhitespace(text).toLowerCase().replace(/`/g, "");
}

const memoPath = "docs/strategy/capability-phrase-enrichment-coverage-review.md";

// ---------- 1: review doc exists ----------

test("enrichment coverage review memo exists at expected path", async () => {
  const text = await read(memoPath);
  assert.ok(text.length > 1000, "memo must be a substantial document");
  assert.ok(text.includes("# CapabilityPhraseReport Enrichment Coverage Review"));
});

// ---------- 2: memo contains all required headings ----------

test("memo contains all required headings", async () => {
  const text = await read(memoPath);
  const required = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Targets Reviewed",
    "## Command Matrix",
    "## Normalization Results",
    "## Phrase Results",
    "## Enrichment Coverage",
    "## Evidence Ref Distribution",
    "## Publication Usefulness",
    "## CapabilityMap Readiness",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(
      text.includes(heading),
      `memo must contain heading "${heading}"`,
    );
  }
});

// ---------- 3: phrase enrichment materially improved coverage ----------

test("memo says phrase enrichment materially improved coverage", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("phrase enrichment materially improved coverage")
      || text.includes("phrase enrichment v1 materially improved coverage"),
    "memo must say phrase enrichment materially improved coverage",
  );
});

// ---------- 4: stable threshold remains unchanged ----------

test("memo says the stable threshold remains unchanged", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("the stable threshold remains unchanged")
      || text.includes("stable threshold remains unchanged"),
    "memo must say the stable threshold remains unchanged",
  );
});

// ---------- 5: partial phrases alone do not justify CapabilityMap v2 ----------

test("memo says partial phrases alone do not justify CapabilityMap v2", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("partial phrases alone do not justify capabilitymap v2"),
    "memo must pin that partial phrases alone do not justify CapabilityMap v2",
  );
});

// ---------- 6: CapabilityMap v2 is evidence-gated ----------

test("memo says CapabilityMap v2 is evidence-gated", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitymap v2 is evidence-gated"),
    "memo must pin that CapabilityMap v2 is evidence-gated",
  );
});

// ---------- 7: target table ----------

test("memo includes the target table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Target | Archetype | Source | Result |"));
  assert.ok(text.includes("`examples/simple-js-ts`"));
  assert.ok(text.includes("`target-1`"));
  assert.ok(text.includes("Next.js TypeScript"));
});

// ---------- 8: normalization table ----------

test("memo includes the normalization table", async () => {
  const text = await read(memoPath);
  assert.ok(
    text.includes(
      "| Target | Total Candidates | Normalized | Unknown Verb | Unknown Noun | Unknown | Ignored | Alias Applied | Low Confidence |",
    ),
  );
  assert.ok(text.includes("| `target-1` | 9,110 |"));
});

// ---------- 9: phrase table ----------

test("memo includes the phrase table", async () => {
  const text = await read(memoPath);
  assert.ok(
    text.includes(
      "| Target | Total Phrases | Stable | Partial | Low Confidence | With Domain | With Pattern | With Layer |",
    ),
  );
  assert.ok(text.includes("**239**"));
  assert.ok(text.includes("**16**"));
  assert.ok(text.includes("**223**"));
});

// ---------- 10: enrichment table ----------

test("memo includes the enrichment table", async () => {
  const text = await read(memoPath);
  assert.ok(
    text.includes(
      "| Target | Stable Ratio | Total Phrase Ratio | Domain Coverage | Pattern Coverage | Layer Coverage |",
    ),
  );
});

// ---------- 11: readiness table ----------

test("memo includes the readiness table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Gate | Result | Notes |"));
  const plain = plainText(text);
  assert.ok(
    plain.includes("real repo non-trivial stable phrases"),
    "readiness table must include the real-repo gate",
  );
  assert.ok(
    plain.includes("stable evidence refs present"),
    "readiness table must include the stable evidence-refs gate",
  );
  assert.ok(
    plain.includes("stable terms meaningful"),
    "readiness table must include the stable terms gate",
  );
  assert.ok(
    plain.includes("partials not used for capabilitymap"),
    "readiness table must include the partial-exclusion gate",
  );
  assert.ok(
    plain.includes("publications understandable"),
    "readiness table must include the publication-usefulness gate",
  );
  assert.ok(
    plain.includes("artifacts validate clean"),
    "readiness table must include the artifact-validation gate",
  );
});

// ---------- 12: option table ----------

test("memo includes the options table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Option | Decision | Reason |"));
  assert.ok(
    text.includes("`CapabilityMap` v2 high-confidence-only")
      || text.includes("CapabilityMap v2 high-confidence-only"),
  );
  assert.ok(text.includes("Phrase enrichment v2"));
  assert.ok(text.includes("Candidate-quality improvements"));
  assert.ok(text.includes("More dogfood"));
});

// ---------- 13: CHANGELOG mentions enrichment coverage review ----------

test("CHANGELOG mentions phrase enrichment coverage review", async () => {
  const changelog = (await read("CHANGELOG.md")).toLowerCase();
  assert.ok(
    changelog.includes("capabilityphrasereport")
      && changelog.includes("enrichment coverage review"),
    "CHANGELOG must mention the CapabilityPhraseReport enrichment coverage review",
  );
});

// ---------- 14: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/capability-phrase-enrichment-coverage-review.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(packet.includes("CapabilityPhraseReport"));
  assert.ok(packet.includes("enrichment coverage") || packet.includes("Enrichment Coverage"));
});
