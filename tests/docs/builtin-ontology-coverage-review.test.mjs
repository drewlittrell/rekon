// Docs test for the Built-In Baseline Ontology Coverage
// Review (step 4 of the capability-ontology track
// implementation sequence). Pins the canonical guidance the
// memo must carry so future edits cannot silently drop the
// v1 constraints (no CapabilityMap projection, no source-write
// apply, no LLM normalization, no baseline vocabulary change).

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

async function read(relative) {
  return readFile(resolve(repoRoot, relative), "utf8");
}

const memoPath = "docs/strategy/builtin-ontology-coverage-review.md";

// ---------- 1: review doc exists ----------

test("built-in ontology coverage review doc exists", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("# Built-In Baseline Ontology Coverage Review"));
});

// ---------- 2: doc contains all required headings ----------

test("memo contains every required heading", async () => {
  const text = await read(memoPath);
  for (const heading of [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Targets Reviewed",
    "## Normalization Results",
    "## Unknown Term Analysis",
    "## Low-Confidence Analysis",
    "## Baseline Sufficiency Decision",
    "## CapabilityMap Readiness",
    "## Options Considered",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ]) {
    assert.ok(text.includes(heading), `memo missing required heading ${heading}`);
  }
});

// ---------- 3: doc pins CapabilityNormalizationReport is audit-only in v1 ----------

test("memo pins CapabilityNormalizationReport is audit-only in v1", async () => {
  const text = await read(memoPath);
  const collapsed = text.replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("acceptable for audit-only v1")
    || collapsed.includes("audit-only v1"),
    "memo must pin audit-only v1",
  );
  assert.ok(text.includes("`CapabilityNormalizationReport`"));
});

// ---------- 4: doc says CapabilityMap integration remains deferred ----------

test("memo says CapabilityMap integration remains deferred", async () => {
  const text = await read(memoPath);
  const collapsed = text.replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("`CapabilityMap` v2 remains deferred")
    || collapsed.includes("CapabilityMap v2 remains deferred")
    || collapsed.includes("CapabilityMap v2 (Option B) remains deferred"),
    "memo must say CapabilityMap v2 remains deferred",
  );
});

// ---------- 5: doc says unknown/low-confidence are not projected downstream ----------

test("memo pins that unknown / low-confidence rows do not project downstream", async () => {
  const text = await read(memoPath);
  const collapsed = text.replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("No downstream projection"),
    "memo must pin 'No downstream projection.'",
  );
  assert.ok(
    collapsed.includes("not sufficient yet")
    || collapsed.includes("not sufficient"),
    "memo must say baseline is not yet sufficient for CapabilityMap v2",
  );
});

// ---------- 6: doc includes target table ----------

test("memo includes the target table", async () => {
  const text = await read(memoPath);
  // The target table header column set is the pin.
  assert.ok(text.includes("| Target | Archetype | Source | Result |"));
  assert.ok(text.includes("simple-js-ts"));
  assert.ok(text.includes("target-1"));
});

// ---------- 7: doc includes the summary table ----------

test("memo includes the normalization summary table", async () => {
  const text = await read(memoPath);
  assert.ok(
    text.includes(
      "| Target | Total | Normalized | Unknown Verb | Unknown Noun | Unknown | Ignored | Alias Applied | Low Confidence |",
    ),
    "memo must include the normalization summary table header",
  );
});

// ---------- 8: doc includes the cause table ----------

test("memo includes the cause table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Cause | Evidence on `target-1` | Decision |"));
  assert.ok(text.includes("Vocabulary gap"));
  assert.ok(text.includes("Poor lexical split"));
  assert.ok(text.includes("Symbol noise"));
});

// ---------- 9: doc includes the option table ----------

test("memo includes the option-considered table with selected/deferred decisions", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Option | Decision | Reason |"));
  assert.ok(text.includes("Expand the built-in baseline vocabulary"));
  assert.ok(text.includes("`CapabilityMap` v2"));
  assert.ok(text.includes("unknown-term operator review surface"));
  assert.ok(text.includes("Recommended next slice"));
});

// ---------- 10: CHANGELOG mentions the coverage review ----------

test("CHANGELOG mentions the built-in ontology coverage review", async () => {
  const text = await read("CHANGELOG.md");
  assert.ok(text.includes("Built-In Baseline Ontology Coverage Review"));
  assert.ok(text.includes("Option C"));
});

// ---------- 11: review packet exists + contains PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const text = await read(
    ".rekon-dev/review-packets/builtin-ontology-coverage-review.md",
  );
  assert.ok(text.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(text.includes("BASELINE SUFFICIENCY DECISION"));
  assert.ok(text.includes("CAPABILITYMAP READINESS"));
});
