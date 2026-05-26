// Docs test for the CapabilityNormalizationReport v1 slice
// (the first runtime implementation on the capability-ontology
// track). Pins the canonical guidance docs + the cross-link
// surface that operators rely on. The test asserts verbatim
// substrings so future edits cannot silently drop the v1
// constraints (no source-write apply, no LLM normalization,
// no CapabilityMap integration, no finding mutation).

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

async function read(relative) {
  return readFile(resolve(repoRoot, relative), "utf8");
}

// ---------- 1: artifact reference exists and pins the producer ----------

test("artifact reference exists and pins the producer + category", async () => {
  const text = await read("docs/artifacts/capability-normalization-report.md");
  assert.ok(text.includes("**Producer:** `@rekon/capability-ontology`"));
  assert.ok(text.includes("**Category:** `projections`"));
});

// ---------- 2: artifact reference pins audit-only constraints ----------

test("artifact reference pins the audit-only constraints verbatim", async () => {
  const text = await read("docs/artifacts/capability-normalization-report.md");
  assert.ok(text.includes("It does **not** mutate `EvidenceGraph` raw facts."));
  assert.ok(text.includes("It does **not** modify `CapabilityMap`"));
  assert.ok(text.includes("It does **not** resolve, mute, or change any finding."));
  assert.ok(text.includes("It does **not** invoke an LLM."));
});

// ---------- 3: artifact reference documents all 6 statuses ----------

test("artifact reference documents every CapabilityNormalizationStatus", async () => {
  const text = await read("docs/artifacts/capability-normalization-report.md");
  for (const status of [
    `"normalized"`,
    `"unknown-verb"`,
    `"unknown-noun"`,
    `"unknown"`,
    `"ignored"`,
    `"low-confidence"`,
  ]) {
    assert.ok(text.includes(status), `artifact reference missing status ${status}`);
  }
});

// ---------- 4: concept doc preserves the layered model ----------

test("concept doc preserves the layered ontology model", async () => {
  const text = await read("docs/concepts/capability-ontology.md");
  // Pinned verbatim — the prior decision memo forbids flattening
  // the ontology into a single config / report layer. The concept
  // doc must echo this constraint exactly. Whitespace-collapsed
  // match so line-wrap edits don't accidentally break the pin.
  const collapsed = text.replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("Do not flatten the ontology into a single config / report layer."),
    "concept doc must explicitly forbid flattening the ontology",
  );
  assert.ok(text.includes("eight-layer"));
  assert.ok(collapsed.includes("CapabilityMap"));
  assert.ok(text.includes("deferred to v2"));
});

// ---------- 5: concept doc documents the v1 non-goals ----------

test("concept doc enumerates v1 non-goals verbatim", async () => {
  const text = await read("docs/concepts/capability-ontology.md");
  assert.ok(text.includes("No `CapabilityMap` integration."));
  assert.ok(text.includes("No LLM normalization."));
  assert.ok(text.includes("No source-write apply."));
  assert.ok(text.includes("No finding mutation."));
});

// ---------- 6: concept doc documents the operator config rules ----------

test("concept doc documents the operator config + invalid-config behaviour", async () => {
  const text = await read("docs/concepts/capability-ontology.md");
  const collapsed = text.replace(/\s+/g, " ");
  assert.ok(text.includes(".rekon/capability-ontology.json"));
  assert.ok(text.includes("Invalid config (bad JSON, wrong version, wrong shape)"));
  assert.ok(collapsed.includes("fails the CLI command clearly"));
});

// ---------- 7: roadmap references the new artifact ----------

test("roadmap references CapabilityNormalizationReport v1", async () => {
  const text = await read("docs/strategy/roadmap.md");
  assert.ok(text.includes("CapabilityNormalizationReport"));
  assert.ok(text.includes("capability-ontology"));
});

// ---------- 8: README references the new CLI command ----------

test("README references the new CLI command", async () => {
  const text = await read("README.md");
  assert.ok(text.includes("rekon capability ontology normalize"));
});

// ---------- 9: CHANGELOG records the new artifact + CLI ----------

test("CHANGELOG records CapabilityNormalizationReport v1 + CLI", async () => {
  const text = await read("CHANGELOG.md");
  assert.ok(text.includes("CapabilityNormalizationReport"));
  assert.ok(text.includes("rekon capability ontology normalize"));
});

// ---------- 10: cross-links between new docs + translation-layer memo ----------

test("translation-layer decision memo cross-links the new docs", async () => {
  const memo = await read(
    "docs/strategy/capability-ontology-translation-layer-decision.md",
  );
  assert.ok(memo.includes("capability-normalization-report.md"));
  // The decision memo lives under docs/strategy/ and uses a
  // relative `../concepts/capability-ontology.md` link to the
  // concept doc — match either the root-relative form or the
  // strategy-doc-relative form.
  assert.ok(
    memo.includes("docs/concepts/capability-ontology.md")
    || memo.includes("../concepts/capability-ontology.md"),
    "translation-layer memo must cross-link the concept doc",
  );
});
