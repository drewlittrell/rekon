// Docs test for the capability ontology unknown-term operator
// review surface (CapabilityNormalizationReviewLedger). Pins
// the canonical guidance docs + cross-link surface so future
// edits cannot silently drop the v1 constraints (append-only,
// no automatic ontology config mutation, no CapabilityMap
// mutation, no LLM normalization).

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

async function read(relative) {
  return readFile(resolve(repoRoot, relative), "utf8");
}

const artifactDocPath =
  "docs/artifacts/capability-normalization-review-ledger.md";

// ---------- 1: artifact doc exists ----------

test("review-ledger artifact reference exists", async () => {
  const text = await read(artifactDocPath);
  assert.ok(text.includes("# `CapabilityNormalizationReviewLedger` Artifact"));
});

// ---------- 2: concept doc mentions the review ledger ----------

test("concept doc mentions CapabilityNormalizationReviewLedger", async () => {
  const text = await read("docs/concepts/capability-ontology.md");
  assert.ok(text.includes("CapabilityNormalizationReviewLedger"));
});

// ---------- 3: docs say the ledger is append-only ----------

test("docs say the ledger is append-only", async () => {
  const artifactDoc = await read(artifactDocPath);
  const concept = await read("docs/concepts/capability-ontology.md");
  assert.ok(
    artifactDoc.includes("append-only"),
    "artifact reference must say the ledger is append-only",
  );
  assert.ok(
    concept.includes("append-only"),
    "concept doc must say the ledger is append-only",
  );
});

// ---------- 4: docs say decisions are operator-supplied ----------

test("docs say decisions are operator-supplied", async () => {
  const text = await read(artifactDocPath);
  const collapsed = text.replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("explicit operator CLI invocations")
    || collapsed.includes("operator decisions")
    || collapsed.includes("operator-supplied"),
    "artifact reference must say decisions come from the operator",
  );
});

// ---------- 5: docs say ontology config is not automatically mutated ----------

test("docs say ontology config is not automatically mutated", async () => {
  const text = await read(artifactDocPath);
  // Strip markdown bold (`**not**` → `not`) before substring
  // matching so the pin survives stylistic edits that bold the
  // negation.
  const plain = text.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(text.includes(".rekon/capability-ontology.json"));
  assert.ok(
    plain.includes("does not mutate `.rekon/capability-ontology.json`")
    || plain.includes("not mutate `.rekon/capability-ontology.json`")
    || plain.includes("not an automatic ontology editor"),
    "artifact reference must explicitly pin the no-config-mutation rule",
  );
});

// ---------- 6: docs say CapabilityMap integration remains deferred ----------

test("docs say CapabilityMap integration remains deferred", async () => {
  const text = await read(artifactDocPath);
  const collapsed = text.replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("`CapabilityMap` integration (Layer 6) remains deferred")
    || collapsed.includes("`CapabilityMap` integration remains deferred")
    || collapsed.includes("CapabilityMap integration remains deferred"),
    "artifact reference must say CapabilityMap integration remains deferred",
  );
});

// ---------- 7: docs mention extend-ontology ----------

test("artifact reference documents extend-ontology", async () => {
  const text = await read(artifactDocPath);
  assert.ok(text.includes("extend-ontology"));
});

// ---------- 8: docs mention rename-symbol ----------

test("artifact reference documents rename-symbol", async () => {
  const text = await read(artifactDocPath);
  assert.ok(text.includes("rename-symbol"));
});

// ---------- 9: docs mention noise-filter ----------

test("artifact reference documents noise-filter", async () => {
  const text = await read(artifactDocPath);
  assert.ok(text.includes("noise-filter"));
});

// ---------- 10: docs mention defer ----------

test("artifact reference documents the defer decision", async () => {
  const text = await read(artifactDocPath);
  // Match a row that talks about defer as a decision label.
  assert.ok(text.includes("`defer`"));
});

// ---------- 11: CHANGELOG mentions CapabilityNormalizationReviewLedger ----------

test("CHANGELOG mentions CapabilityNormalizationReviewLedger", async () => {
  const text = await read("CHANGELOG.md");
  assert.ok(text.includes("CapabilityNormalizationReviewLedger"));
  assert.ok(text.includes("rekon capability ontology review"));
});

// ---------- 12: review packet exists + contains PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const text = await read(
    ".rekon-dev/review-packets/capability-normalization-review-ledger.md",
  );
  assert.ok(text.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(text.includes("OPERATOR DECISION MODEL"));
});
