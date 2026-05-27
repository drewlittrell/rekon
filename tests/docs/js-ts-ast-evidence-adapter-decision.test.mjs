// Docs tests for the JS/TS AST Evidence Adapter Decision
// memo. Pins the verbatim guarantees the memo must carry
// so future implementers do not regress.

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

const memoPath = "docs/strategy/js-ts-ast-evidence-adapter-decision.md";

// ---------- 1: decision memo exists ----------

test("decision memo exists at expected path", async () => {
  const text = await read(memoPath);
  assert.ok(text.length > 1000, "memo must be substantial");
  assert.ok(text.includes("# JS/TS AST Evidence Adapter Decision"));
});

// ---------- 2: memo contains all required headings ----------

test("memo contains all 14 required headings", async () => {
  const text = await read(memoPath);
  const required = [
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Classic Scanner Prior Art",
    "## Current Rekon JS/TS Extraction",
    "## Options Considered",
    "## Recommendation",
    "## Parser Choice",
    "## Parser-Only V1 Boundary",
    "## EvidenceGraph Fact Model",
    "## Construct Coverage",
    "## Regex Fallback Policy",
    "## Downstream Ontology Impact",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  for (const heading of required) {
    assert.ok(text.includes(heading), `memo must include ${heading}`);
  }
});

// ---------- 3: memo selects TypeScript parser API ----------

test("memo selects TypeScript compiler parser API", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("the selected parser is the typescript compiler parser api"),
    "memo must pin TypeScript compiler parser API as the v1 parser",
  );
});

// ---------- 4: memo says parser-only v1 ----------

test("memo says parser-only v1 (no typechecker semantics)", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("v1 is parser-only; typechecker semantics are deferred"),
    "memo must pin parser-only v1",
  );
});

// ---------- 5: memo says regex is fallback only ----------

test("memo says regex extraction is fallback only", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("regex extraction is fallback only"),
    "memo must pin regex as fallback only",
  );
});

// ---------- 6: memo says AST facts use extractionMethod: "ast" ----------

test("memo says AST facts use extractionMethod ast", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes('ast facts use extractionmethod: "ast"'),
    "memo must pin AST facts use extractionMethod ast",
  );
});

// ---------- 7: memo says fallback facts use extractionMethod: "regex-fallback" ----------

test("memo says fallback facts use extractionMethod regex-fallback", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes('fallback facts use extractionmethod: "regex-fallback"'),
    "memo must pin fallback facts use extractionMethod regex-fallback",
  );
});

// ---------- 8: memo says typechecker semantics are deferred ----------

test("memo says typechecker semantics are deferred", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("typechecker semantics are deferred"),
    "memo must pin typechecker semantics as deferred",
  );
});

// ---------- 9: memo says call graph is deferred ----------

test("memo says call graph is deferred", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("call graph is deferred"),
    "memo must pin call graph as deferred",
  );
});

// ---------- 10: memo says EvidenceGraph remains repo-agnostic protocol ----------

test("memo says EvidenceGraph remains the repo-agnostic protocol", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("evidencegraph remains the repo-agnostic protocol"),
    "memo must pin EvidenceGraph as repo-agnostic protocol",
  );
});

// ---------- 11: AST v1 should improve CapabilityNormalizationReport candidate quality ----------

test("memo says AST v1 should improve CapabilityNormalizationReport candidate quality", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "ast v1 should improve capabilitynormalizationreport candidate quality",
    ),
    "memo must pin AST v1 improves CapabilityNormalizationReport candidate quality",
  );
});

// ---------- 12: AST v1 should improve CapabilityPhraseReport stable phrase density ----------

test("memo says AST v1 should improve CapabilityPhraseReport stable phrase density", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "ast v1 should improve capabilityphrasereport stable phrase density",
    ),
    "memo must pin AST v1 improves CapabilityPhraseReport stable phrase density",
  );
});

// ---------- 13: AST v1 does not mutate CapabilityMap ----------

test("memo says AST v1 does not mutate CapabilityMap", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("ast v1 does not mutate capabilitymap"),
    "memo must pin that AST v1 does not mutate CapabilityMap",
  );
});

// ---------- 14: option table ----------

test("memo includes the option table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Option | Decision | Reason |"));
  const plain = plainText(text);
  assert.ok(plain.includes("typescript parser api"));
  assert.ok(plain.includes("keep regex primary"));
  assert.ok(plain.includes("typechecker-backed v1"));
});

// ---------- 15: construct coverage table ----------

test("memo includes the construct coverage table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Construct | V1 Decision |"));
  const plain = plainText(text);
  assert.ok(plain.includes("function declarations"));
  assert.ok(plain.includes("class methods"));
  assert.ok(plain.includes("call graph"));
});

// ---------- 16: fallback table ----------

test("memo includes the fallback table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Case | Behavior |"));
  const plain = plainText(text);
  assert.ok(plain.includes("ast parse succeeds"));
  assert.ok(plain.includes("ast parse fails"));
  assert.ok(plain.includes("type-only import"));
});

// ---------- 17: CHANGELOG mentions JS/TS AST Evidence Adapter Decision ----------

test("CHANGELOG mentions the JS/TS AST Evidence Adapter Decision", async () => {
  const changelog = plainText(await read("CHANGELOG.md"));
  assert.ok(
    changelog.includes("js/ts ast evidence adapter decision"),
    "CHANGELOG must mention the JS/TS AST Evidence Adapter Decision",
  );
});

// ---------- 18: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/js-ts-ast-evidence-adapter-decision.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(
    packet.includes("JS/TS AST Evidence Adapter Decision")
      || packet.includes("js-ts-ast-evidence-adapter-decision"),
  );
});
