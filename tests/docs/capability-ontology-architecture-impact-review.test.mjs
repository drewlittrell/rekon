// Docs contract tests for the
// capability-ontology-architecture-impact-review
// memo. Architecture review only — no runtime
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
  "capability-ontology-architecture-impact-review.md",
);
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "capability-ontology-architecture-impact-review.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function flatMemo() {
  return (await readFile(memoPath, "utf8")).replace(/\s+/g, " ");
}

// ---------- 1: review exists ----------

test("capability ontology architecture impact review memo exists", () => {
  assert.ok(existsSync(memoPath), `expected ${memoPath}`);
});

// ---------- 2: review says ontology is a translation layer ----------

test("review says ontology is a translation layer", async () => {
  const flat = await flatMemo();
  // The Decision Summary opens with the translation-layer pin.
  assert.ok(
    flat.includes("The ontology system is a translation layer:") ||
      flat.includes("ontology system is a translation layer"),
    "memo must pin 'The ontology system is a translation layer'",
  );
});

// ---------- 3: review says Rekon still needs the ontology function ----------

test("review says Rekon still needs the ontology function", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes("Rekon still needs the ontology function."),
    "memo must pin decision #1: 'Rekon still needs the ontology function.'",
  );
});

// ---------- 4: review says do not port GraphOntologyValidator wholesale ----------

test("review says do not port GraphOntologyValidator wholesale", async () => {
  const flat = await flatMemo();
  assert.ok(
    /classic\s+`GraphOntologyValidator`[\s\S]{0,200}wholesale/i.test(flat) ||
      flat.includes(
        "Do not port GraphOntologyValidator wholesale",
      ) ||
      flat.includes(
        "Does not port the classic `GraphOntologyValidator` wholesale",
      ),
    "memo must pin that the classic GraphOntologyValidator must not be ported wholesale",
  );
});

// ---------- 5: review says raw evidence remains separate from normalized purpose ----------

test("review says raw evidence remains separate from normalized purpose", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes(
      "Raw evidence must remain separate from normalized purpose.",
    ) ||
      flat.includes(
        "Raw evidence stays raw. Normalized purpose becomes an auditable derived artifact.",
      ),
    "memo must pin the raw-evidence vs normalized-purpose boundary",
  );
});

// ---------- 6: review says normalization decisions need an audit artifact ----------

test("review says normalization decisions need an audit artifact", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes("Normalization decisions need an audit artifact."),
    "memo must pin decision #4: 'Normalization decisions need an audit artifact.'",
  );
});

// ---------- 7: review references CapabilityMap ----------

test("review references CapabilityMap", async () => {
  const memo = await readMemo();
  // Must appear several times across decisions, impact table, boundary table,
  // consumer impact review, and follow-up phases.
  const matches = memo.match(/CapabilityMap/g) ?? [];
  assert.ok(
    matches.length >= 3,
    `memo must reference CapabilityMap multiple times; got ${matches.length}`,
  );
});

// ---------- 8: review references RefactorPreservationContract ----------

test("review references RefactorPreservationContract", async () => {
  const memo = await readMemo();
  assert.ok(
    memo.includes("RefactorPreservationContract"),
    "memo must reference RefactorPreservationContract",
  );
});

// ---------- 9: review says LLM-only normalization is not acceptable as truth ----------

test("review says LLM-only normalization is not acceptable as truth", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes("LLM-only normalization is not acceptable as truth."),
    "memo must pin decision #7: 'LLM-only normalization is not acceptable as truth.'",
  );
});

// ---------- 10: review says unknown verbs/nouns must surface to operators ----------

test("review says unknown verbs / nouns must surface to operators", async () => {
  const flat = await flatMemo();
  assert.ok(
    flat.includes("Unknown verbs / nouns must surface to operators."),
    "memo must pin decision #8: 'Unknown verbs / nouns must surface to operators.'",
  );
});

// ---------- 11: architecture impact table ----------

test("memo includes the architecture impact diagnostic table", async () => {
  const content = await readMemo();
  // The canonical seven-row table inside Architecture Impact Map.
  assert.ok(
    /\|\s*Area\s*\|\s*Existing Role\s*\|\s*Ontology Impact\s*\|/.test(content),
    "memo missing architecture impact table header",
  );
  // Spot-check a few rows that are required by the work order.
  for (const row of [
    "EvidenceGraph",
    "CapabilityMap",
    "FindingFilterReport",
    "CoherencyDelta",
    "ReconciliationPlan",
    "Memory",
    "Agent contract",
  ]) {
    assert.ok(
      content.includes(row),
      `architecture impact table missing row for: ${row}`,
    );
  }
});

// ---------- 12: boundary table ----------

test("memo includes the boundary diagnostic table", async () => {
  const content = await readMemo();
  assert.ok(
    /\|\s*Layer\s*\|\s*Responsibility\s*\|/.test(content),
    "memo missing boundary table header",
  );
  for (const layer of [
    "EvidenceGraph",
    "CapabilityOntology",
    "CapabilityNormalizationReport",
    "CapabilityMap",
    "RefactorPreservationContract",
  ]) {
    assert.ok(
      content.includes(layer),
      `boundary table missing layer: ${layer}`,
    );
  }
});

// ---------- 13: risk table ----------

test("memo includes the risk diagnostic table", async () => {
  const content = await readMemo();
  assert.ok(
    /\|\s*Risk\s*\|\s*Guardrail\s*\|/.test(content),
    "memo missing risk table header",
  );
  for (const risk of [
    "hidden semantic guessing",
    "ontology mutates raw evidence",
    "monolithic validator returns",
    "unknown terms hidden",
    "premature drift claims",
  ]) {
    assert.ok(
      content.includes(risk),
      `risk table missing entry: ${risk}`,
    );
  }
});

// ---------- 14: CHANGELOG mention ----------

test("CHANGELOG mentions capability ontology architecture impact review", async () => {
  const changelog = await readFile(changelogPath, "utf8");
  const flat = changelog.replace(/\s+/g, " ").toLowerCase();
  assert.ok(
    flat.includes("capability ontology architecture impact review") ||
      changelog.includes(
        "docs/strategy/capability-ontology-architecture-impact-review.md",
      ),
    "CHANGELOG missing capability ontology architecture impact review entry",
  );
});

// ---------- 15: review packet exists with PURPOSE PRESERVATION CHECK ----------

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
    "## CLASSIC ONTOLOGY INTENT",
    "## ARCHITECTURE IMPACT",
    "## BOUNDARY MODEL",
    "## RECOMMENDATION",
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
