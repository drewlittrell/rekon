// Docs tests for Phrase Enrichment v1.
//
// Pins the verbatim guarantees the enrichment slice must
// carry: stable threshold unchanged, partial phrases are
// semantic context (not CapabilityMap-ready placement
// policy), deterministic enrichment sources only,
// sideEffects/inputs/outputs deferred, CapabilityMap
// integration still deferred.

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

const memoPath = "docs/strategy/capability-phrase-enrichment-v1.md";

// ---------- 1: docs mention phrase enrichment v1 ----------

test("docs mention phrase enrichment v1", async () => {
  const text = await read(memoPath);
  assert.ok(text.length > 1000, "memo must be substantial");
  assert.ok(
    text.includes("# CapabilityPhraseReport Phrase Enrichment v1")
      || text.includes("Phrase Enrichment v1"),
  );
});

// ---------- 2: stable threshold is unchanged ----------

test("docs say the stable threshold is unchanged", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("the stable threshold is unchanged")
      || text.includes("stable threshold is unchanged"),
  );
});

// ---------- 3: partial phrases are semantic context, not CapabilityMap-ready placement policy ----------

test("docs say partial phrases are semantic context, not CapabilityMap-ready placement or ownership policy", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "partial phrases are semantic context, not capabilitymap-ready placement or ownership policy",
    ),
    "memo must pin partial phrases as semantic context, not CapabilityMap-ready placement policy",
  );
});

// ---------- 4: deterministic domain enrichment ----------

test("docs mention deterministic domain enrichment", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(text.includes("domain"));
  assert.ok(
    text.includes("ownershipmap") && text.includes("ownersystem"),
    "memo must describe OwnershipMap.ownerSystem as the domain source",
  );
});

// ---------- 5: deterministic pattern enrichment ----------

test("docs mention deterministic pattern enrichment from ObservedRepo system kind", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(text.includes("pattern"));
  assert.ok(
    text.includes("observedrepo") && text.includes("kind"),
    "memo must describe ObservedRepo.systems[].kind as the pattern source",
  );
});

// ---------- 6: deterministic layer enrichment ----------

test("docs mention deterministic layer enrichment", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(text.includes("layer"));
  assert.ok(
    text.includes("ownershipmap") || text.includes("observedrepo"),
    "memo must source layer enrichment from OwnershipMap or ObservedRepo",
  );
});

// ---------- 7: sideEffects / inputs / outputs remain deferred ----------

test("docs say sideEffects / inputs / outputs remain deferred", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("sideeffects / inputs / outputs remain deferred")
      || text.includes("sideeffects/inputs/outputs remain deferred"),
    "memo must pin sideEffects/inputs/outputs as deferred",
  );
});

// ---------- 8: CapabilityMap integration remains deferred ----------

test("docs say CapabilityMap integration remains deferred", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitymap integration remains deferred"),
    "memo must pin CapabilityMap integration as still deferred",
  );
});

// ---------- 9: CHANGELOG mentions Phrase Enrichment v1 ----------

test("CHANGELOG mentions CapabilityPhraseReport phrase enrichment v1", async () => {
  const changelog = (await read("CHANGELOG.md")).toLowerCase();
  assert.ok(
    changelog.includes("capabilityphrasereport")
      && changelog.includes("phrase enrichment v1"),
    "CHANGELOG must mention the CapabilityPhraseReport phrase enrichment v1 batch",
  );
});

// ---------- 10: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/capability-phrase-enrichment-v1.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(packet.includes("CapabilityPhraseReport"));
  assert.ok(packet.includes("phrase enrichment") || packet.includes("Phrase Enrichment"));
});
