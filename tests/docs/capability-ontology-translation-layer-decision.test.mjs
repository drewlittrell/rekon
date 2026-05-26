// Docs contract tests for the
// capability-ontology-translation-layer-decision
// memo. Strategy / decision only — no runtime
// change, no schema change.

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
  "capability-ontology-translation-layer-decision.md",
);
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "capability-ontology-translation-layer-decision.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function flatMemo() {
  return (await readFile(memoPath, "utf8")).replace(/\s+/g, " ");
}

// ---------- 1: memo exists ----------

test("capability ontology translation layer decision memo exists", () => {
  assert.ok(existsSync(memoPath), `expected ${memoPath}`);
});

// ---------- 2: required headings ----------

test("memo contains all required headings", async () => {
  const content = await readMemo();
  for (const heading of [
    "# Capability Ontology Translation Layer Decision",
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Architecture Boundary From Prior Review",
    "## Classic Layered Ontology Structure",
    "## Rekon Layered Ontology Model",
    "## Options Considered",
    "## Recommendation",
    "## CapabilityOntology Config Model",
    "## EffectiveCapabilityOntology Model",
    "## CapabilityNormalizationReport Model",
    "## Owning Package",
    "## V1 Inputs And Outputs",
    "## Unknown Term Workflow",
    "## CapabilityMap Integration",
    "## RefactorPreservationContract Connection",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ]) {
    assert.ok(
      content.includes(heading),
      `memo missing heading: ${heading}`,
    );
  }
});

// ---------- 3: memo selects layered config-first ontology + artifact-backed normalization report ----------

test("memo selects layered config-first ontology + artifact-backed normalization report", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes(
      "Option C — layered config-first ontology + artifact-backed normalization report",
    ) ||
      flat.includes(
        "layered config-first ontology + artifact-backed normalization report",
      ),
    "memo must explicitly select 'layered config-first ontology + artifact-backed normalization report'",
  );
  assert.ok(
    flat.includes("**Adopt Option C") || flat.includes("Adopt Option C"),
    "memo must explicitly recommend adopting Option C",
  );
});

// ---------- 4: CapabilityOntology starts as config / source vocabulary ----------

test("memo says CapabilityOntology starts as config / source vocabulary", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes(
      "`CapabilityOntology` **starts as config / source vocabulary**",
    ) ||
      flat.includes("CapabilityOntology starts as config / source vocabulary"),
    "memo must pin '`CapabilityOntology` starts as config / source vocabulary'",
  );
});

// ---------- 5: EffectiveCapabilityOntology is internal in v1 ----------

test("memo says EffectiveCapabilityOntology is internal in v1", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes("`EffectiveCapabilityOntology` **is internal in v1**") ||
      flat.includes("EffectiveCapabilityOntology is internal in v1"),
    "memo must pin '`EffectiveCapabilityOntology` is internal in v1'",
  );
});

// ---------- 6: CapabilityNormalizationReport is first registered artifact ----------

test("memo says CapabilityNormalizationReport is the first registered artifact", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes(
      "`CapabilityNormalizationReport` is the **first registered artifact**",
    ) ||
      flat.includes(
        "CapabilityNormalizationReport is the first registered artifact",
      ),
    "memo must pin '`CapabilityNormalizationReport` is the first registered artifact'",
  );
});

// ---------- 7: CapabilityMap integration deferred to v2 ----------

test("memo says CapabilityMap integration is deferred to v2", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes("`CapabilityMap` **integration is deferred to v2**") ||
      flat.includes("CapabilityMap integration is deferred to v2"),
    "memo must pin '`CapabilityMap` integration is deferred to v2'",
  );
});

// ---------- 8: EvidenceGraph raw facts are unchanged ----------

test("memo says EvidenceGraph raw facts are unchanged", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes("`EvidenceGraph` **raw facts are unchanged**") ||
      flat.includes("EvidenceGraph raw facts are unchanged"),
    "memo must pin '`EvidenceGraph` raw facts are unchanged'",
  );
});

// ---------- 9: unknown verbs / nouns must surface to operators ----------

test("memo says unknown verbs / nouns must surface to operators", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes(
      "**Unknown verbs / nouns must surface to operators**",
    ) || flat.includes("Unknown verbs / nouns must surface to operators"),
    "memo must pin 'Unknown verbs / nouns must surface to operators'",
  );
});

// ---------- 10: LLM suggestions are not truth in v1 ----------

test("memo says LLM suggestions are not truth in v1", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes("**LLM suggestions are not truth in v1**") ||
      flat.includes("LLM suggestions are not truth in v1"),
    "memo must pin 'LLM suggestions are not truth in v1'",
  );
});

// ---------- 11: do not flatten the ontology into a single config/report layer ----------

test("memo says do not flatten the ontology into a single config / report layer", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes(
      "**Do not flatten the ontology into a single config / report layer.**",
    ) ||
      flat.includes(
        "Do not flatten the ontology into a single config / report layer.",
      ),
    "memo must pin 'Do not flatten the ontology into a single config / report layer.'",
  );
});

// ---------- 12: option table ----------

test("memo includes the option diagnostic table", async () => {
  const content = await readMemo();
  // The canonical Option table header.
  assert.ok(
    /\|\s*Option\s*\|\s*Decision\s*\|\s*Reason\s*\|/.test(content),
    "memo missing option table header",
  );
  // Required option rows.
  for (const opt of [
    "Flat config-only ontology",
    "Artifact-only ontology",
    "Layered config-first + normalization report",
    "CapabilityMap-only normalization",
    "Monolithic GraphOntologyValidator revival",
  ]) {
    assert.ok(
      content.includes(opt),
      `option table missing entry: ${opt}`,
    );
  }
  // The selected option is recorded explicitly.
  assert.ok(
    /selected/.test(content),
    "option table must mark the selected option",
  );
});

// ---------- 13: layer table ----------

test("memo includes the layer diagnostic table", async () => {
  const content = await readMemo();
  assert.ok(
    /\|\s*Layer\s*\|\s*Responsibility\s*\|\s*V1 Status\s*\|/.test(content),
    "memo missing layer table header",
  );
  for (const layer of [
    "EvidenceGraph",
    "CapabilityCandidateSet",
    "CapabilityLexicalSplit",
    "CapabilityOntology",
    "EffectiveCapabilityOntology",
    "CapabilityNormalizationReport",
    "CapabilityMap",
    "RefactorPreservationContract",
  ]) {
    assert.ok(
      content.includes(layer),
      `layer table missing layer: ${layer}`,
    );
  }
});

// ---------- 14: unknown term table ----------

test("memo includes the unknown term diagnostic table", async () => {
  const content = await readMemo();
  assert.ok(
    /\|\s*Unknown Type\s*\|\s*V1 Behavior\s*\|/.test(content),
    "memo missing unknown term table header",
  );
  for (const entry of [
    "unknown verb",
    "unknown noun",
    "alias candidate",
    "low confidence split",
  ]) {
    assert.ok(
      content.includes(entry),
      `unknown term table missing entry: ${entry}`,
    );
  }
});

// ---------- 15: CHANGELOG mention ----------

test("CHANGELOG mentions capability ontology translation layer decision", async () => {
  const changelog = await readFile(changelogPath, "utf8");
  const flat = changelog.replace(/\s+/g, " ").toLowerCase();
  assert.ok(
    flat.includes("capability ontology translation layer decision") ||
      changelog.includes(
        "docs/strategy/capability-ontology-translation-layer-decision.md",
      ),
    "CHANGELOG missing capability ontology translation layer decision entry",
  );
});

// ---------- 16: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const packet = await readFile(reviewPacketPath, "utf8");
  assert.ok(
    /^##\s+PURPOSE PRESERVATION CHECK\s*$/m.test(packet),
    "review packet missing PURPOSE PRESERVATION CHECK heading",
  );
  for (const heading of [
    "## CHANGES MADE",
    "## PUBLIC API CHANGES",
    "## PURPOSE PRESERVATION CHECK",
    "## CODEBASE-INTEL ALIGNMENT",
    "## OPTIONS CONSIDERED",
    "## RECOMMENDATION",
    "## LAYERED ONTOLOGY MODEL",
    "## BOUNDARY MODEL",
    "## V1 IMPLEMENTATION SHAPE",
    "## TESTS / VERIFICATION",
    "## INTENTIONALLY UNTOUCHED",
    "## RISKS / FOLLOW-UP",
    "## NEXT STEP",
  ]) {
    assert.ok(
      packet.includes(heading),
      `review packet missing heading: ${heading}`,
    );
  }
});
