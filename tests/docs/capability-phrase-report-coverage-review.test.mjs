// Docs tests for the CapabilityPhraseReport real-repo
// coverage review.
//
// Pins the verbatim guarantees the coverage review must
// carry so future implementers cannot drift away from the
// CapabilityMap v2 evidence gate or from the
// stable-high-confidence-only consumption rule.

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

const memoPath = "docs/strategy/capability-phrase-report-coverage-review.md";

// ---------- 1: review doc exists ----------

test("coverage review memo exists at expected path", async () => {
  const text = await read(memoPath);
  assert.ok(text.length > 1000, "memo must be a substantial document");
  assert.ok(text.includes("# CapabilityPhraseReport Real-Repo Coverage Review"));
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

// ---------- 3: CapabilityMap v2 is evidence-gated ----------

test("memo says CapabilityMap v2 is evidence-gated", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitymap v2 is evidence-gated")
      || text.includes("capabilitymap v2 remains evidence-gated"),
    "memo must pin that CapabilityMap v2 is evidence-gated",
  );
});

// ---------- 4: stable high-confidence phrases measured on a real repo ----------

test("memo says stable high-confidence phrases were measured on a real repo", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("stable high-confidence phrases were measured on a real repo"),
    "memo must pin that stable high-confidence phrases were measured on a real repo",
  );
});

// ---------- 5: unknown / low-confidence rows excluded ----------

test("memo says unknown / low-confidence rows remain excluded", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("unknown / low-confidence rows remain excluded")
      || text.includes("unknown/low-confidence rows remain excluded"),
    "memo must pin that unknown / low-confidence rows remain excluded",
  );
});

// ---------- 6: target table ----------

test("memo includes the target table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Target | Archetype | Source | Result |"));
  assert.ok(text.includes("`examples/simple-js-ts`"));
  assert.ok(text.includes("`target-1`"));
  assert.ok(text.includes("Next.js TypeScript"));
});

// ---------- 7: normalization table ----------

test("memo includes the normalization table", async () => {
  const text = await read(memoPath);
  assert.ok(
    text.includes(
      "| Target | Total Candidates | Normalized | Unknown Verb | Unknown Noun | Unknown | Ignored | Alias Applied | Low Confidence |",
    ),
  );
  // confirm the row for target-1 carries the measured counts
  assert.ok(text.includes("| `target-1` | 9,110 |"));
});

// ---------- 8: phrase table ----------

test("memo includes the phrase table", async () => {
  const text = await read(memoPath);
  assert.ok(
    text.includes(
      "| Target | Total Phrases | Stable | Partial | Low Confidence | With Domain | With Pattern | With Layer |",
    ),
  );
  // confirm the row for target-1 reports the 16 stable phrases
  assert.ok(text.includes("| **16** | **16** | 0 | 0 | 0 | 0 | 0 |"));
});

// ---------- 9: readiness table ----------

test("memo includes the readiness table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Gate | Result | Notes |"));
  const plain = plainText(text);
  assert.ok(
    plain.includes("real repo non-trivial stable phrases"),
    "readiness table must include the real-repo gate",
  );
  assert.ok(
    plain.includes("evidence refs present"),
    "readiness table must include the evidence-refs gate",
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

// ---------- 10: option table ----------

test("memo includes the options table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Option | Decision | Reason |"));
  assert.ok(
    text.includes("`CapabilityMap` v2 high-confidence-only")
      || text.includes("CapabilityMap v2 high-confidence-only"),
  );
  assert.ok(text.includes("Phrase enrichment v1"));
  assert.ok(text.includes("Candidate-quality improvements"));
  assert.ok(text.includes("Canon pack expansion"));
  assert.ok(text.includes("More dogfood"));
});

// ---------- 11: CHANGELOG mentions coverage review ----------

test("CHANGELOG mentions CapabilityPhraseReport real-repo coverage review", async () => {
  const changelog = (await read("CHANGELOG.md")).toLowerCase();
  assert.ok(
    changelog.includes("capabilityphrasereport")
      && changelog.includes("coverage review")
      && changelog.includes("real-repo"),
    "CHANGELOG must mention the CapabilityPhraseReport real-repo coverage review",
  );
});

// ---------- 12: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/capability-phrase-report-coverage-review.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(packet.includes("CapabilityPhraseReport"));
  assert.ok(packet.includes("coverage review") || packet.includes("Coverage Review"));
});
