// Docs tests for the CapabilityMap v2 High-Confidence-Only
// Decision (twenty-seventh slice on the capability-
// ontology track). Pins the verbatim guarantees the
// memo must carry so future implementers do not
// regress.

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

const memoPath
  = "docs/strategy/capability-map-v2-high-confidence-decision.md";

// ---------- 1: decision memo exists ----------

test("decision memo exists at expected path", async () => {
  const text = await read(memoPath);
  assert.ok(text.length > 1000, "memo must be substantial");
  assert.ok(
    text.includes("# CapabilityMap v2 High-Confidence-Only Decision"),
  );
});

// ---------- 2: required headings ----------

test("memo contains all 11 required headings", async () => {
  const text = await read(memoPath);
  const required = [
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Current CapabilityMap Boundary",
    "## Evidence From Post-AST Cohort Re-Run",
    "## Options Considered",
    "## Recommendation",
    "## Eligibility Rules",
    "## Additive Shape",
    "## Freshness And Citations",
    "## CapabilityContract Boundary",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  for (const heading of required) {
    assert.ok(text.includes(heading), `memo must include ${heading}`);
  }
});

// ---------- 3: selects additive stable-phrase v2 ----------

test("memo selects additive stable-phrase CapabilityMap v2 (Option B)", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "additive capabilitymap v2 projection from stable high-confidence capabilityphrasereport claims only",
    )
      || text.includes("option b — additive capabilitymap v2"),
    "memo must select additive stable-phrase CapabilityMap v2",
  );
});

// ---------- 4: consumes phrases, not normalization rows ----------

test("memo says CapabilityMap v2 consumes CapabilityPhraseReport, not raw CapabilityNormalizationReport rows", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "capabilitymap v2 consumes capabilityphrasereport, not raw capabilitynormalizationreport rows",
    ),
    "memo must pin CapabilityMap v2 consumes CapabilityPhraseReport, not raw CapabilityNormalizationReport rows",
  );
});

// ---------- 5: only stable high-confidence are eligible ----------

test("memo says only stable high-confidence CapabilityPhrase claims are eligible", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "only stable high-confidence capabilityphrase claims are eligible for capabilitymap v2",
    ),
    "memo must pin stable high-confidence eligibility",
  );
});

// ---------- 6: partial phrases excluded ----------

test("memo says partial phrases are excluded (remain semantic context)", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "partial phrases remain semantic context and are not capabilitymap-ready ownership or placement policy",
    ),
    "memo must pin partial phrases as excluded / semantic context only",
  );
});

// ---------- 7: raw normalization rows excluded ----------

test("memo says raw normalization rows are excluded", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("raw capabilitynormalizationreport rows | **excluded**")
      || text.includes("raw normalization rows | **excluded**")
      || text.includes("excluded** | translation audit"),
    "memo must explicitly exclude raw normalization rows from v2",
  );
});

// ---------- 8: CapabilityMap v2 is not CapabilityContract ----------

test("memo says CapabilityMap v2 is not CapabilityContract", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitymap v2 is not capabilitycontract"),
    "memo must pin CapabilityMap v2 is not CapabilityContract",
  );
});

// ---------- 9: v2 is additive ----------

test("memo says v2 is additive and existing CapabilityMap fields remain valid", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "capabilitymap v2 is additive and existing capabilitymap fields remain valid",
    ),
    "memo must pin v2 as additive (existing CapabilityMap fields remain valid)",
  );
});

// ---------- 10: stale when CapabilityPhraseReport changes ----------

test("memo says CapabilityMap should be stale when the consumed CapabilityPhraseReport changes", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "capabilitymap should be stale when the consumed capabilityphrasereport changes",
    ),
    "memo must pin freshness invalidation when CapabilityPhraseReport changes",
  );
});

// ---------- 11: evidence table ----------

test("memo includes the evidence table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Target | Pre-AST Stable | Post-AST Stable | Decision |"));
  const plain = plainText(text);
  assert.ok(plain.includes("target-1"));
  assert.ok(plain.includes("target-2"));
});

// ---------- 12: option table ----------

test("memo includes the option table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Option | Decision | Reason |"));
  const plain = plainText(text);
  assert.ok(plain.includes("keep capabilitymap v1 only")
    || plain.includes("keep `capabilitymap` v1 only")
    || plain.includes("option a"));
  assert.ok(plain.includes("additive stable-phrase"));
});

// ---------- 13: eligibility table ----------

test("memo includes the eligibility table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Rule | Decision |"));
  const plain = plainText(text);
  assert.ok(plain.includes("phrase status"));
  assert.ok(plain.includes("phrase confidence"));
  assert.ok(plain.includes("evidencerefs"));
});

// ---------- 14: boundary table ----------

test("memo includes the boundary table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Layer | Responsibility |"));
  const plain = plainText(text);
  assert.ok(plain.includes("capabilitynormalizationreport"));
  assert.ok(plain.includes("capabilityphrasereport"));
  assert.ok(plain.includes("capabilitymap v2"));
  assert.ok(plain.includes("capabilitycontract"));
});

// ---------- 15: CHANGELOG mention ----------

test("CHANGELOG mentions the CapabilityMap v2 high-confidence decision", async () => {
  const changelog = plainText(await read("CHANGELOG.md"));
  assert.ok(
    changelog.includes("capabilitymap v2 high-confidence")
      || changelog.includes("capabilitymap v2 high-confidence-only decision"),
    "CHANGELOG must mention the CapabilityMap v2 high-confidence decision",
  );
});

// ---------- 16: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/capability-map-v2-high-confidence-decision.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(
    packet.includes("CapabilityMap v2 High-Confidence-Only Decision")
      || packet.includes("capability-map-v2-high-confidence-decision"),
  );
});
