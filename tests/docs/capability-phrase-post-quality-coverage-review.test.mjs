// Docs tests for the CapabilityPhraseReport post-quality
// coverage review.

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

const memoPath = "docs/strategy/capability-phrase-post-quality-coverage-review.md";

// ---------- 1: review doc exists ----------

test("post-quality coverage review memo exists at expected path", async () => {
  const text = await read(memoPath);
  assert.ok(text.length > 1000, "memo must be substantial");
  assert.ok(text.includes("# CapabilityPhraseReport Post-Quality Coverage Review"));
});

// ---------- 2: memo contains all required headings ----------

test("memo contains all required headings", async () => {
  const text = await read(memoPath);
  const required = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Targets Reviewed",
    "## Command Matrix",
    "## Pack Detection Results",
    "## Normalization Results",
    "## Phrase Results",
    "## Before / After Comparison",
    "## Evidence Ref Distribution",
    "## Publication Usefulness",
    "## CapabilityMap Readiness",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(text.includes(heading), `memo must contain heading "${heading}"`);
  }
});

// ---------- 3: candidate-quality reduced unknown noise ----------

test("memo says candidate-quality improvements reduced unknown noise", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("candidate-quality improvements reduced unknown noise"),
    "memo must pin candidate-quality improvements reduced unknown noise",
  );
});

// ---------- 4: stable phrase count remained unchanged ----------

test("memo says stable phrase count remained unchanged", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("stable phrase count remained unchanged"),
    "memo must pin stable phrase count remained unchanged",
  );
});

// ---------- 5: CapabilityMap v2 is evidence-gated ----------

test("memo says CapabilityMap v2 is evidence-gated", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitymap v2 is evidence-gated"),
    "memo must pin CapabilityMap v2 is evidence-gated",
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
  assert.ok(text.includes("`examples/simple-js-ts`"));
  assert.ok(text.includes("`target-1`"));
  assert.ok(text.includes("`target-2`"));
});

// ---------- 8: pack table ----------

test("memo includes the pack table", async () => {
  const text = await read(memoPath);
  assert.ok(
    text.includes("| Target | Base Pack | Overlay Packs | Override Path | Override Kind |"),
  );
});

// ---------- 9: normalization table ----------

test("memo includes the normalization table", async () => {
  const text = await read(memoPath);
  assert.ok(
    text.includes(
      "| Target | Total Candidates | Normalized | Unknown Verb | Unknown Noun | Unknown | Ignored | Alias Applied | Low Confidence |",
    ),
  );
  // both real-repo rows must be present
  assert.ok(text.includes("| `target-1` | 9,110 |"));
  assert.ok(text.includes("| `target-2` | 408 |"));
});

// ---------- 10: phrase table ----------

test("memo includes the phrase table", async () => {
  const text = await read(memoPath);
  assert.ok(
    text.includes(
      "| Target | Total Phrases | Stable | Partial | Low Confidence | With Domain | With Pattern | With Layer |",
    ),
  );
});

// ---------- 11: before / after table ----------

test("memo includes the before / after table", async () => {
  const text = await read(memoPath);
  assert.ok(
    text.includes(
      "| Metric | Pre-Enrichment | Post-Enrichment | Post-Quality | Decision |",
    ),
    "before/after table header must be present",
  );
});

// ---------- 12: readiness table ----------

test("memo includes the readiness table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Gate | Result | Notes |"));
  const plain = plainText(text);
  assert.ok(plain.includes("real repo non-trivial stable phrases"));
  assert.ok(plain.includes("stable evidence refs present"));
  assert.ok(plain.includes("stable terms meaningful"));
  assert.ok(plain.includes("stable density sufficient"));
  assert.ok(plain.includes("partials not used for capabilitymap"));
  assert.ok(plain.includes("publications understandable"));
  assert.ok(plain.includes("artifacts validate clean"));
});

// ---------- 13: option table ----------

test("memo includes the option table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Option | Decision | Reason |"));
  assert.ok(
    text.includes("`CapabilityMap` v2 high-confidence-only")
      || text.includes("CapabilityMap v2 high-confidence-only"),
  );
  assert.ok(text.includes("Phrase enrichment v2"));
  assert.ok(text.includes("Candidate extraction improvements"));
  assert.ok(text.includes("Canon-pack expansion v2"));
  assert.ok(text.includes("Repo-agnostic purpose understanding architecture review"));
  assert.ok(text.includes("More dogfood"));
});

// ---------- 14: CHANGELOG mentions post-quality coverage review ----------

test("CHANGELOG mentions post-quality coverage review", async () => {
  const changelog = plainText(await read("CHANGELOG.md"));
  assert.ok(
    changelog.includes("post-quality coverage review"),
    "CHANGELOG must mention the post-quality coverage review",
  );
});

// ---------- 15: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/capability-phrase-post-quality-coverage-review.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(packet.includes("post-quality") || packet.includes("Post-Quality"));
});
