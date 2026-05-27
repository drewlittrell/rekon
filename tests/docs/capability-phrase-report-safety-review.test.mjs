// Docs tests for the CapabilityPhraseReport safety review.
//
// Pins the verbatim guarantees the safety review must
// carry so future implementers cannot drift away from
// the deferred-CapabilityMap gate or treat phrases as
// placement policy.

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

const memoPath = "docs/strategy/capability-phrase-report-safety-review.md";

// ---------- 1: safety review exists ----------

test("safety review memo exists at expected path", async () => {
  const text = await read(memoPath);
  assert.ok(text.length > 1000, "memo must be a substantial document");
  assert.ok(text.includes("# CapabilityPhraseReport Safety Review"));
});

// ---------- 2: memo contains all required headings ----------

test("memo contains all required headings", async () => {
  const text = await read(memoPath);
  const required = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Projection Path Reviewed",
    "## Artifact Boundary Review",
    "## Publication Surfacing Review",
    "## Input Refs And Citations",
    "## No-Mutation Guarantee",
    "## Proof Report Deferral",
    "## CapabilityMap Boundary",
    "## CapabilityContract Boundary",
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

// ---------- 3: CapabilityPhraseReport is semantic purpose projection, not ownership or placement policy ----------

test("memo says CapabilityPhraseReport is semantic purpose projection, not ownership or placement policy", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilityphrasereport is semantic purpose projection, not ownership or placement policy")
      || text.includes("semantic purpose projection, not ownership or placement policy"),
    "memo must pin CapabilityPhraseReport as semantic purpose projection, not ownership or placement policy",
  );
});

// ---------- 4: CapabilityNormalizationReport remains translation audit ----------

test("memo says CapabilityNormalizationReport remains the translation audit", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitynormalizationreport remains the translation audit"),
    "memo must pin that CapabilityNormalizationReport remains the translation audit",
  );
});

// ---------- 5: CapabilityMap integration remains deferred until phrase coverage measured ----------

test("memo says CapabilityMap integration remains deferred until phrase coverage is measured on real repos", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitymap integration remains deferred until phrase coverage is measured on real repos"),
    "memo must pin CapabilityMap deferral until phrase coverage is measured on real repos",
  );
});

// ---------- 6: proof report surfacing deferred ----------

test("memo says proof report surfacing remains deferred", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("proof report surfacing remains deferred"),
    "memo must say proof report surfacing remains deferred",
  );
});

// ---------- 7: only stable high-confidence phrases eligible for v2 ----------

test("memo says only stable high-confidence phrases are eligible for future CapabilityMap v2", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("only stable high-confidence phrases are eligible for future capabilitymap v2"),
    "memo must say only stable high-confidence phrases are eligible for future CapabilityMap v2",
  );
});

// ---------- 8: projection path table ----------

test("memo includes the projection path table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Step | Artifact / Command | Role | Boundary |"));
  assert.ok(text.includes("| normalize |"));
  assert.ok(text.includes("| phrase project |"));
  assert.ok(text.includes("| architecture summary |"));
  assert.ok(text.includes("| agent contract |"));
});

// ---------- 9: option table ----------

test("memo includes the options table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Option | Decision | Reason |"));
  assert.ok(text.includes("`CapabilityMap` v2") || text.includes("CapabilityMap v2"));
  assert.ok(text.includes("Phrase coverage review"));
  assert.ok(text.includes("Add phrase enrichment first"));
  assert.ok(text.includes("`CapabilityContract`") || text.includes("CapabilityContract"));
});

// ---------- 10: boundary table ----------

test("memo includes the boundary table", async () => {
  const text = await read(memoPath);
  // Look for entries showing all four boundary rows
  const plain = plainText(text);
  assert.ok(
    plain.includes("translation audit"),
    "boundary table must reference translation audit boundary",
  );
  assert.ok(
    plain.includes("semantic projection") || plain.includes("semantic purpose projection"),
    "boundary table must reference semantic projection boundary",
  );
  assert.ok(
    plain.includes("capabilitymap"),
    "boundary table must reference CapabilityMap boundary",
  );
  assert.ok(
    plain.includes("capabilitycontract"),
    "boundary table must reference CapabilityContract boundary",
  );
});

// ---------- 11: CHANGELOG mentions safety review ----------

test("CHANGELOG mentions CapabilityPhraseReport safety review", async () => {
  const changelog = (await read("CHANGELOG.md")).toLowerCase();
  assert.ok(
    changelog.includes("capabilityphrasereport")
      && changelog.includes("safety review"),
    "CHANGELOG must mention the CapabilityPhraseReport safety review",
  );
});

// ---------- 12: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/capability-phrase-report-safety-review.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(packet.includes("CapabilityPhraseReport"));
  assert.ok(packet.includes("safety review") || packet.includes("Safety Review"));
});
