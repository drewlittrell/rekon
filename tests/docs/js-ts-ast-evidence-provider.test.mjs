// Docs tests for the JS/TS AST EvidenceGraph Provider v1
// runtime slice (twenty-fourth slice on the
// capability-ontology track). Pins the verbatim
// guarantees the documentation must carry so future
// implementers do not regress.

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

const evidenceGraphPath = "docs/artifacts/evidence-graph.md";
const normalizationReportPath
  = "docs/artifacts/capability-normalization-report.md";
const phraseReportPath = "docs/artifacts/capability-phrase-report.md";

// ---------- 1: EvidenceGraph doc mentions AST-backed JS/TS extraction ----------

test("EvidenceGraph artifact doc mentions AST-backed JS/TS extraction", async () => {
  const text = plainText(await read(evidenceGraphPath));
  assert.ok(
    text.includes("ast-backed js/ts extraction"),
    "EvidenceGraph doc must mention AST-backed JS/TS extraction",
  );
});

// ---------- 2: EvidenceGraph doc says regex is fallback only for JS/TS ----------

test("EvidenceGraph artifact doc says regex is fallback only for JS/TS", async () => {
  const text = plainText(await read(evidenceGraphPath));
  assert.ok(
    text.includes("regex is fallback only for js/ts")
      || text.includes("regex extraction is fallback only"),
    "EvidenceGraph doc must pin regex as fallback only for JS/TS",
  );
});

// ---------- 3: EvidenceGraph doc mentions extractionMethod ast ----------

test("EvidenceGraph artifact doc mentions extractionMethod ast", async () => {
  const text = plainText(await read(evidenceGraphPath));
  assert.ok(
    text.includes('extractionmethod: "ast"') || text.includes("extractionmethod ast"),
    "EvidenceGraph doc must mention extractionMethod ast",
  );
});

// ---------- 4: EvidenceGraph doc mentions extractionMethod regex-fallback ----------

test("EvidenceGraph artifact doc mentions extractionMethod regex-fallback", async () => {
  const text = plainText(await read(evidenceGraphPath));
  assert.ok(
    text.includes('extractionmethod: "regex-fallback"')
      || text.includes("extractionmethod regex-fallback"),
    "EvidenceGraph doc must mention extractionMethod regex-fallback",
  );
});

// ---------- 5: EvidenceGraph doc says typechecker semantics are deferred ----------

test("EvidenceGraph artifact doc says typechecker semantics are deferred", async () => {
  const text = plainText(await read(evidenceGraphPath));
  assert.ok(
    text.includes("typechecker semantics are deferred")
      || text.includes("no typechecker semantics")
      || text.includes("no type-checker dependency"),
    "EvidenceGraph doc must say typechecker semantics are deferred",
  );
});

// ---------- 6: CapabilityNormalizationReport docs say AST facts improve candidate quality ----------

test("CapabilityNormalizationReport doc says AST facts improve candidate quality", async () => {
  const text = plainText(await read(normalizationReportPath));
  assert.ok(
    text.includes("ast facts improve candidate quality")
      || text.includes("ast facts should improve candidate quality")
      || text.includes("ast v1 is expected to improve candidate quality"),
    "CapabilityNormalizationReport doc must say AST facts improve candidate quality",
  );
});

// ---------- 7: CapabilityPhraseReport docs say AST facts may improve stable phrase density ----------

test("CapabilityPhraseReport doc says AST facts may improve stable phrase density", async () => {
  const text = plainText(await read(phraseReportPath));
  assert.ok(
    text.includes("ast facts may improve stable phrase density")
      || text.includes("ast v1 is expected to improve stable phrase density"),
    "CapabilityPhraseReport doc must say AST facts may improve stable phrase density",
  );
});

// ---------- 8: CHANGELOG mentions JS/TS AST EvidenceGraph Provider v1 ----------

test("CHANGELOG mentions the JS/TS AST EvidenceGraph Provider v1", async () => {
  const changelog = plainText(await read("CHANGELOG.md"));
  assert.ok(
    changelog.includes("js/ts ast evidencegraph provider v1"),
    "CHANGELOG must mention the JS/TS AST EvidenceGraph Provider v1",
  );
});

// ---------- 9: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/js-ts-ast-evidence-provider-v1.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(
    packet.includes("JS/TS AST EvidenceGraph Provider v1")
      || packet.includes("js-ts-ast-evidence-provider-v1"),
  );
});
