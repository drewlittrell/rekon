// Docs tests for the CapabilityMap v2 high-confidence-only
// implementation (twenty-eighth slice on the capability-
// ontology track). Pins the verbatim guarantees the new
// artifact reference doc must carry, plus the cross-doc
// stamping of the v2 implementation across the
// supporting docs.

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

const artifactDoc = "docs/artifacts/capability-map.md";

// ---------- 1: artifact reference doc exists ----------

test("docs/artifacts/capability-map.md exists and is substantial", async () => {
  const text = await read(artifactDoc);
  assert.ok(text.length > 1500, "artifact doc must be substantial");
  assert.ok(text.includes("# `CapabilityMap` Artifact"));
});

// ---------- 2: artifact doc carries the six verbatim pins ----------

test("docs/artifacts/capability-map.md pins the six v2 guarantees", async () => {
  const text = plainText(await read(artifactDoc));
  const pins = [
    "capabilitymap v2 consumes capabilityphrasereport, not raw capabilitynormalizationreport rows",
    "only stable high-confidence capabilityphrase claims are eligible for capabilitymap v2",
    "partial phrases remain semantic context and are not capabilitymap-ready ownership or placement policy",
    "capabilitymap v2 is not capabilitycontract",
    "capabilitymap v2 is additive and existing capabilitymap fields remain valid",
    "capabilitymap should be stale when the consumed capabilityphrasereport changes",
  ];
  for (const pin of pins) {
    assert.ok(
      text.includes(pin),
      `capability-map.md must contain pin: ${pin}`,
    );
  }
});

// ---------- 3: artifact doc carries the eligibility table ----------

test("docs/artifacts/capability-map.md carries the eligibility table", async () => {
  const text = await read(artifactDoc);
  assert.ok(text.includes("| Rule | Required value |"));
  const plain = plainText(text);
  assert.ok(plain.includes("phrase.status"));
  assert.ok(plain.includes("phrase.confidence"));
  assert.ok(plain.includes("phrase.evidencerefs"));
  assert.ok(plain.includes("phrase.sourcecandidateids"));
});

// ---------- 4: artifact doc enumerates the additive v2 fields ----------

test("docs/artifacts/capability-map.md enumerates the three additive v2 fields", async () => {
  const text = plainText(await read(artifactDoc));
  assert.ok(text.includes("phrasebackedcapabilities"));
  assert.ok(text.includes("phrasebackedsummary"));
  assert.ok(text.includes("phrasesourceref"));
});

// ---------- 5: artifact doc states deterministic ordering ----------

test("docs/artifacts/capability-map.md states deterministic ordering rule", async () => {
  const text = plainText(await read(artifactDoc));
  assert.ok(text.includes("verb ascending"));
  assert.ok(text.includes("noun ascending"));
  assert.ok(text.includes("id ascending"));
});

// ---------- 6: artifact doc carries the layer/role table ----------

test("docs/artifacts/capability-map.md carries the layer / role table", async () => {
  const text = await read(artifactDoc);
  assert.ok(text.includes("| Layer | Artifact | Role |"));
  const plain = plainText(text);
  assert.ok(plain.includes("capabilitynormalizationreport"));
  assert.ok(plain.includes("capabilityphrasereport"));
  assert.ok(plain.includes("capabilitymap v1 + v2")
    || plain.includes("capabilitymap v1 and v2"));
  assert.ok(plain.includes("capabilitycontract"));
});

// ---------- 7: capability-phrase-report.md links to the new doc ----------

test("capability-phrase-report.md links to capability-map.md and notes v2 consumption", async () => {
  const text = await read("docs/artifacts/capability-phrase-report.md");
  const plain = plainText(text);
  assert.ok(
    text.includes("capability-map.md")
      || plain.includes("docs/artifacts/capability-map.md"),
    "phrase report doc must link to capability-map.md",
  );
  assert.ok(
    plain.includes(
      "capabilitymap v2 will consume capabilityphrasereport, not raw normalization rows",
    )
      || plain.includes(
        "capabilitymap v2 consumes capabilityphrasereport, not raw capabilitynormalizationreport rows",
      ),
    "phrase report doc must reaffirm v2 consumes phrase report, not raw rows",
  );
});

// ---------- 8: capability-normalization-report.md notes v2 boundary ----------

test("capability-normalization-report.md notes the v2 boundary (raw rows are not consumed by CapabilityMap v2)", async () => {
  const text = plainText(
    await read("docs/artifacts/capability-normalization-report.md"),
  );
  assert.ok(
    text.includes(
      "capabilitymap v2 consumes capabilityphrasereport, not raw capabilitynormalizationreport rows",
    )
      || text.includes(
        "raw capabilitynormalizationreport rows are not consumed by capabilitymap v2",
      ),
    "normalization report doc must restate the v2 boundary",
  );
});

// ---------- 9: capability-ontology concept doc lists v2 ----------

test("concepts/capability-ontology.md references CapabilityMap v2 and the new artifact doc", async () => {
  const text = await read("docs/concepts/capability-ontology.md");
  const plain = plainText(text);
  assert.ok(
    plain.includes("capabilitymap v2"),
    "ontology concept doc must reference CapabilityMap v2",
  );
  assert.ok(
    text.includes("artifacts/capability-map.md"),
    "ontology concept doc must link to the new artifact reference",
  );
});

// ---------- 10: CHANGELOG mentions the v2 implementation ----------

test("CHANGELOG mentions the CapabilityMap v2 high-confidence-only implementation", async () => {
  const changelog = plainText(await read("CHANGELOG.md"));
  assert.ok(
    changelog.includes("capabilitymap v2 high-confidence-only implementation")
      || changelog.includes("capabilitymap v2 high-confidence implementation")
      || (changelog.includes("capabilitymap v2") && changelog.includes("implementation")),
    "CHANGELOG must mention the CapabilityMap v2 implementation",
  );
});

// ---------- 11: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/capability-map-v2-high-confidence-implementation.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  const plain = plainText(packet);
  assert.ok(
    plain.includes("capabilitymap v2 high-confidence-only implementation")
      || plain.includes("capabilitymap v2 high-confidence implementation")
      || plain.includes("capability-map-v2-high-confidence-implementation"),
    "review packet must name the CapabilityMap v2 implementation slice",
  );
});
