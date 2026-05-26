// Docs tests for the CapabilityPhraseReport decision
// (strategy / docs / tests-only batch). Pins the verbatim
// guarantees so the next implementation slice cannot
// silently drift away from the layer boundary the
// architecture decision required.

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

const memoPath = "docs/strategy/capability-phrase-report-decision.md";

// ---------- 1: decision memo exists ----------

test("decision memo exists at expected path", async () => {
  const text = await read(memoPath);
  assert.ok(text.length > 1000, "memo must be substantial");
  assert.ok(text.includes("# CapabilityPhraseReport Decision"));
});

// ---------- 2: memo contains all required headings ----------

test("memo contains all required headings", async () => {
  const text = await read(memoPath);
  const required = [
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Current Layered Ontology State",
    "## Options Considered",
    "## Recommendation",
    "## CapabilityPhraseReport Model",
    "## V1 Field Policy",
    "## Repo-Agnostic Evidence Model",
    "## CapabilityMap Boundary",
    "## CapabilityContract Boundary",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  for (const heading of required) {
    assert.ok(
      text.includes(heading),
      `memo must contain heading "${heading}"`,
    );
  }
});

// ---------- 3: memo selects CapabilityPhraseReport ----------

test("memo selects CapabilityPhraseReport (Option B)", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("selected: option b")
      || text.includes("selected: **option b**")
      || text.includes("select option b")
      || text.includes("select **option b**"),
    "memo must explicitly select Option B (CapabilityPhraseReport)",
  );
});

// ---------- 4: memo rejects enriching CapabilityNormalizationReport ----------

test("memo rejects enriching CapabilityNormalizationReport for v1", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("rejected for v1")
      || text.includes("option a — enrich capabilitynormalizationreport"),
    "memo must reject Option A (enriching the normalization report)",
  );
});

// ---------- 5: normalization report is translation audit ----------

test("memo says CapabilityNormalizationReport is translation audit", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitynormalizationreport is a translation audit")
      || text.includes("capabilitynormalizationreport is a **translation audit**"),
    "memo must pin CapabilityNormalizationReport as a translation audit",
  );
});

// ---------- 6: phrase report is semantic purpose projection ----------

test("memo says CapabilityPhraseReport is semantic purpose projection", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilityphrasereport is a semantic purpose projection")
      || text.includes("capabilityphrasereport is a **semantic purpose projection**"),
    "memo must pin CapabilityPhraseReport as a semantic purpose projection",
  );
});

// ---------- 7: CapabilityMap v2 should consume CapabilityPhraseReport ----------

test("memo says CapabilityMap v2 should consume CapabilityPhraseReport", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitymap v2 should consume capabilityphrasereport")
      || text.includes("capabilitymap v2 should consume **capabilityphrasereport**"),
    "memo must pin that CapabilityMap v2 consumes CapabilityPhraseReport (not raw normalization rows)",
  );
});

// ---------- 8: only high-confidence / stable claims eligible ----------

test("memo says only high-confidence / stable claims are eligible for CapabilityMap v2", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("only high-confidence / stable capabilityphrase claims are eligible for capabilitymap v2")
      || text.includes("only high-confidence / stable")
      || text.includes("only **high-confidence / stable**"),
    "memo must pin that only high-confidence / stable phrase claims are eligible for CapabilityMap v2",
  );
});

// ---------- 9: CapabilityContract is future policy / preservation layer ----------

test("memo says CapabilityContract is the future policy / preservation layer", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitycontract is the future policy / preservation layer")
      || text.includes("capabilitycontract is the future policy/preservation layer")
      || text.includes("capabilitycontract is the **future policy / preservation layer**"),
    "memo must pin CapabilityContract as the future policy / preservation layer",
  );
});

// ---------- 10: AST is optional enrichment, not foundational truth ----------

test("memo says AST/typechecker evidence is optional enrichment, not foundational truth", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("ast / typechecker evidence is optional enrichment, not foundational truth")
      || text.includes("ast/typechecker evidence is optional enrichment, not foundational truth")
      || text.includes("ast / typechecker evidence is **optional enrichment, not foundational truth**"),
    "memo must pin AST/typechecker evidence as optional enrichment, not foundational truth",
  );
});

// ---------- 11: option table present ----------

test("memo includes the option table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("### Option A — Enrich `CapabilityNormalizationReport`"));
  assert.ok(text.includes("### Option B — Create `CapabilityPhraseReport`"));
  assert.ok(text.includes("### Option C — Wait / defer"));
});

// ---------- 12: field policy table present ----------

test("memo includes the field policy table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Field | V1 Status | Evidence Source |"));
  assert.ok(text.includes("| `verb` |"));
  assert.ok(text.includes("| `noun` |"));
  assert.ok(text.includes("| `confidence` |"));
  assert.ok(text.includes("| `evidenceRefs` |"));
  assert.ok(text.includes("| `sourceCandidateIds` |"));
  assert.ok(text.includes("| `status` |"));
  assert.ok(text.includes("| `domain` |"));
  assert.ok(text.includes("| `pattern` |"));
  assert.ok(text.includes("| `layer` |"));
  assert.ok(text.includes("| `sideEffects` |"));
  assert.ok(text.includes("| `inputs` / `outputs` |"));
});

// ---------- 13: boundary table present ----------

test("memo includes the layer / boundary table", async () => {
  const text = await read(memoPath);
  // The boundary appears as the "Current Layered Ontology
  // State" table; assert each layer line.
  assert.ok(text.includes("| `CapabilityNormalizationReport` | shipped (translation audit) |"));
  assert.ok(text.includes("| `CapabilityPhraseReport` (semantic purpose projection) |"));
  assert.ok(text.includes("| `CapabilityMap` v2 |"));
  assert.ok(text.includes("| `CapabilityContract` |"));
  assert.ok(text.includes("| `RefactorPreservationContract` |"));
});

// ---------- 14: CHANGELOG mentions decision ----------

test("CHANGELOG mentions the CapabilityPhraseReport decision", async () => {
  const changelog = (await read("CHANGELOG.md")).toLowerCase();
  assert.ok(
    changelog.includes("capabilityphrasereport")
      && changelog.includes("decision"),
    "CHANGELOG must mention the CapabilityPhraseReport decision",
  );
});

// ---------- 15: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/capability-phrase-report-decision.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(packet.includes("CapabilityPhraseReport"));
  assert.ok(packet.includes("Option B"));
});
