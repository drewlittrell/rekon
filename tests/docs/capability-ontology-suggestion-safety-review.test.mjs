// Docs test for the capability ontology suggestion safety
// review. Pins the verbatim mutation-boundary statements
// + the required diagnostic tables + the deferral language
// so future edits cannot silently weaken the preview-only
// control surface.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

async function read(relative) {
  return readFile(resolve(repoRoot, relative), "utf8");
}

const memoPath =
  "docs/strategy/capability-ontology-suggestion-safety-review.md";

// ---------- 1: safety review doc exists ----------

test("capability ontology suggestion safety review doc exists", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("# Capability Ontology Suggestion Safety Review"));
});

// ---------- 2: doc contains all required headings ----------

test("memo contains every required heading", async () => {
  const text = await read(memoPath);
  for (const heading of [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Workflow Reviewed",
    "## Component Safety Review",
    "## Mutation Boundary Review",
    "## Publication Surfacing Review",
    "## Proof Report Deferral",
    "## CapabilityMap Deferral",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ]) {
    assert.ok(text.includes(heading), `memo missing required heading ${heading}`);
  }
});

// ---------- 3: doc says workflow is safe/stable as preview-only ----------

test("memo says the suggestion workflow is safe/stable as preview-only", async () => {
  const text = await read(memoPath);
  const collapsed = text.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("safe and stable as a preview-only loop")
    || collapsed.includes("safe and stable as preview-only")
    || collapsed.includes("safe / stable as a preview-only"),
    "memo must say the workflow is safe and stable as preview-only",
  );
});

// ---------- 4: preview-only verbatim statement ----------

test("memo pins CapabilityOntologySuggestionReport entries are preview-only and not applied vocabulary", async () => {
  const text = await read(memoPath);
  const collapsed = text.replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes(
      "`CapabilityOntologySuggestionReport` entries are preview-only and not applied vocabulary.",
    ),
    "memo must include the verbatim 'CapabilityOntologySuggestionReport entries are preview-only and not applied vocabulary.' statement",
  );
});

// ---------- 5: no config mutation verbatim statement ----------

test("memo pins no current ontology suggestion path mutates .rekon/capability-ontology.json", async () => {
  const text = await read(memoPath);
  const collapsed = text.replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes(
      "No current ontology suggestion path mutates `.rekon/capability-ontology.json`.",
    ),
    "memo must include the verbatim 'No current ontology suggestion path mutates `.rekon/capability-ontology.json`.' statement",
  );
});

// ---------- 6: no CapabilityMap mutation verbatim statement ----------

test("memo pins no current ontology suggestion path mutates CapabilityMap", async () => {
  const text = await read(memoPath);
  const collapsed = text.replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes(
      "No current ontology suggestion path mutates `CapabilityMap`.",
    ),
    "memo must include the verbatim 'No current ontology suggestion path mutates `CapabilityMap`.' statement",
  );
});

// ---------- 7: proof report deferral verbatim statement ----------

test("memo pins the proof report deferral verbatim", async () => {
  const text = await read(memoPath);
  const collapsed = text.replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes(
      "Proof report surfacing remains deferred because ontology suggestions are vocabulary/config proposals, not verification proof.",
    ),
    "memo must include the verbatim proof report deferral statement",
  );
});

// ---------- 8: CapabilityMap deferral verbatim statement ----------

test("memo pins the CapabilityMap deferral verbatim", async () => {
  const text = await read(memoPath);
  const collapsed = text.replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes(
      "CapabilityMap integration remains deferred until reviewed terms produce stable high-confidence normalized claims.",
    ),
    "memo must include the verbatim CapabilityMap deferral statement",
  );
});

// ---------- 9: doc recommends manual config editing for now ----------

test("memo recommends manual config editing for now", async () => {
  const text = await read(memoPath);
  const collapsed = text.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("Manual editing of `.rekon/capability-ontology.json` remains the operator-control boundary")
    || collapsed.includes("Manual editing of .rekon/capability-ontology.json remains the operator-control boundary"),
    "memo must say manual editing remains the operator-control boundary",
  );
  assert.ok(
    collapsed.includes("Do not add an operator-approved config apply command")
    || collapsed.includes("Do not add a config apply command")
    || collapsed.includes("No config apply command ships in this batch"),
    "memo must say do not add a config apply command in this batch",
  );
});

// ---------- 10: workflow table ----------

test("memo includes the workflow safety table", async () => {
  const text = await read(memoPath);
  assert.ok(
    text.includes(
      "| Step | Artifact / Command | Writes | Mutates Config? | Mutates CapabilityMap? |",
    ),
    "memo must include the workflow safety table header",
  );
  assert.ok(text.includes("normalize"));
  assert.ok(text.includes("review decide"));
  assert.ok(text.includes("suggestions"));
  assert.ok(text.includes("publish architecture"));
  assert.ok(text.includes("publish agent-contract"));
});

// ---------- 11: option table ----------

test("memo includes the option-considered table with decisions and reasons", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Option | Decision | Reason |"));
  assert.ok(text.includes("Manual `.rekon/capability-ontology.json` editing"));
  assert.ok(text.includes("Operator-approved apply command"));
  assert.ok(text.includes("Automatic config mutation"));
  assert.ok(text.includes("`CapabilityMap` v2 now"));
});

// ---------- 12: risk table ----------

test("memo includes the risk table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Risk | Guardrail |"));
  assert.ok(text.includes("Suggestions mistaken as applied vocabulary"));
  assert.ok(text.includes("Hidden config mutation"));
  assert.ok(text.includes("Premature `CapabilityMap` projection"));
  assert.ok(text.includes("Proof report confusion"));
});

// ---------- 13: CHANGELOG mentions the safety review ----------

test("CHANGELOG mentions the capability ontology suggestion safety review", async () => {
  const text = await read("CHANGELOG.md");
  const collapsed = text.replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("Capability ontology suggestion safety review"),
    "CHANGELOG must mention the safety review",
  );
});

// ---------- 14: review packet exists + contains PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const text = await read(
    ".rekon-dev/review-packets/capability-ontology-suggestion-safety-review.md",
  );
  assert.ok(text.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(text.includes("MUTATION BOUNDARY"));
  assert.ok(text.includes("RECOMMENDATION"));
});
