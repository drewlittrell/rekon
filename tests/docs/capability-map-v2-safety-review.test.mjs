// Docs tests for the CapabilityMap v2 Safety Review
// (twenty-ninth slice on the capability-ontology
// track). Pins the verbatim guarantees the safety
// review must carry so the next slice (publication
// surfacing) can cite this review as the gate.

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

const memoPath = "docs/strategy/capability-map-v2-safety-review.md";

// ---------- 1: safety review doc exists ----------

test("safety review doc exists at expected path", async () => {
  const text = await read(memoPath);
  assert.ok(text.length > 1500, "safety review must be substantial");
  assert.ok(
    text.includes("# CapabilityMap v2 Safety Review"),
    "memo must have the expected heading",
  );
});

// ---------- 2: required headings ----------

test("doc contains all required headings", async () => {
  const text = await read(memoPath);
  const required = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Projection Path Reviewed",
    "## Eligibility Rule Review",
    "## Additive Shape Review",
    "## Citation And Freshness Review",
    "## Boundary Review",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(text.includes(heading), `memo must include ${heading}`);
  }
});

// ---------- 3: v2 is additive ----------

test("memo says CapabilityMap v2 is additive and existing entries[] remain valid", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "capabilitymap v2 is additive; existing entries[] remain valid",
    )
      || text.includes(
        "capabilitymap v2 is additive and existing entries[] remain valid",
      ),
    "memo must pin v2 as additive (existing entries[] remain valid)",
  );
});

// ---------- 4: v2 consumes phrase report, not raw normalization rows ----------

test("memo says CapabilityMap v2 consumes CapabilityPhraseReport, not raw CapabilityNormalizationReport rows", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "capabilitymap v2 consumes capabilityphrasereport, not raw capabilitynormalizationreport rows",
    ),
    "memo must pin v2 consumes CapabilityPhraseReport, not raw CapabilityNormalizationReport rows",
  );
});

// ---------- 5: partial phrases excluded ----------

test("memo says partial phrases are excluded from phraseBackedCapabilities", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("partial phrases are excluded from phrasebackedcapabilities"),
    "memo must pin partial phrases are excluded from phraseBackedCapabilities",
  );
});

// ---------- 6: v2 is not CapabilityContract ----------

test("memo says CapabilityMap v2 is not CapabilityContract", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitymap v2 is not capabilitycontract"),
    "memo must pin CapabilityMap v2 is not CapabilityContract",
  );
});

// ---------- 7: v2 does not imply policy / routing / linting / writes ----------

test("memo says CapabilityMap v2 does not imply placement policy, ownership policy, resolver routing, architecture linting, verification planning, or source writes", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "capabilitymap v2 does not imply placement policy, ownership policy, resolver routing, architecture linting, verification planning, or source writes",
    ),
    "memo must pin v2 does not imply policy / routing / linting / writes",
  );
});

// ---------- 8: publication surfacing selected next ----------

test("memo says publication surfacing is selected next", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("publication surfacing"),
    "memo must mention publication surfacing",
  );
  assert.ok(
    text.includes("publication surfacing next | selected")
      || text.includes("publication surfacing | selected")
      || text.includes("ship publication surfacing as the next slice")
      || text.includes("recommended next slice: capabilitymap v2 publication surfacing"),
    "memo must select publication surfacing as the next slice",
  );
});

// ---------- 9: projection path table ----------

test("memo includes the projection path table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Step | Artifact / Helper | Role | Boundary |"));
  const plain = plainText(text);
  assert.ok(plain.includes("phrase project"));
  assert.ok(plain.includes("capabilityphrasereport"));
  assert.ok(plain.includes("buildphrasebackedcapabilitymapadditions"));
  assert.ok(plain.includes("capabilitymap"));
});

// ---------- 10: eligibility table ----------

test("memo includes the eligibility table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Rule | Required |"));
  const plain = plainText(text);
  assert.ok(plain.includes("status"));
  assert.ok(plain.includes("stable"));
  assert.ok(plain.includes("confidence"));
  assert.ok(plain.includes("high"));
  assert.ok(plain.includes("evidencerefs"));
  assert.ok(plain.includes("sourcecandidateids"));
});

// ---------- 11: boundary table ----------

test("memo includes the boundary table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Boundary | Decision |"));
  const plain = plainText(text);
  assert.ok(plain.includes("v1 entries[] compatibility"));
  assert.ok(plain.includes("preserved"));
  assert.ok(plain.includes("policy boundary preserved")
    || plain.includes("policy boundary"));
  assert.ok(plain.includes("no writes"));
});

// ---------- 12: option table ----------

test("memo includes the option table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Option | Decision | Reason |"));
  const plain = plainText(text);
  assert.ok(plain.includes("declare v2 safe/stable projection"));
  assert.ok(plain.includes("publication surfacing next"));
  assert.ok(plain.includes("capabilitycontract next"));
  assert.ok(plain.includes("resolver routing next"));
  assert.ok(plain.includes("more dogfood before surfacing"));
});

// ---------- 13: CHANGELOG mention ----------

test("CHANGELOG mentions CapabilityMap v2 safety review", async () => {
  const changelog = plainText(await read("CHANGELOG.md"));
  assert.ok(
    changelog.includes("capabilitymap v2 safety review")
      || changelog.includes("capabilitymap v2 high-confidence-only safety review"),
    "CHANGELOG must mention the CapabilityMap v2 safety review",
  );
});

// ---------- 14: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/capability-map-v2-safety-review.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  const plain = plainText(packet);
  assert.ok(
    plain.includes("capabilitymap v2 safety review")
      || plain.includes("capability-map-v2-safety-review"),
    "review packet must name the safety review slice",
  );
});
