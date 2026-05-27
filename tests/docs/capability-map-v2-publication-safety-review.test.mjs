// Docs tests for the CapabilityMap v2 Publication
// Safety Review (thirty-first slice on the
// capability-ontology track). Pins the verbatim
// guarantees the safety review must carry so the
// next slice (`CapabilityContract` architecture
// decision) can cite this review as the gate.

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
  = "docs/strategy/capability-map-v2-publication-safety-review.md";

// ---------- 1: safety review doc exists ----------

test("safety review doc exists at expected path", async () => {
  const text = await read(memoPath);
  assert.ok(text.length > 1500, "safety review must be substantial");
  assert.ok(
    text.includes("# CapabilityMap v2 Publication Safety Review"),
    "memo must have the expected heading",
  );
});

// ---------- 2: required headings ----------

test("doc contains all required headings", async () => {
  const text = await read(memoPath);
  const required = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Publication Surfaces Reviewed",
    "## Read-Only Guarantee",
    "## Boundary Statement Review",
    "## Agent Contract Do Not Do Review",
    "## Proof Report Deferral",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(text.includes(heading), `memo must include ${heading}`);
  }
});

// ---------- 3: publication surfacing is read-only visibility ----------

test("doc says CapabilityMap v2 publication surfacing is read-only visibility", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "capabilitymap v2 publication surfacing is read-only visibility",
    ),
    "memo must pin publication surfacing is read-only visibility",
  );
});

// ---------- 4: projection context, not CapabilityContract policy ----------

test("doc says phrase-backed capabilities are projection context, not CapabilityContract policy", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "capabilitymap v2 phrase-backed capabilities are projection context, not capabilitycontract policy",
    ),
    "memo must pin phrase-backed capabilities are projection context, not CapabilityContract policy",
  );
});

// ---------- 5: do not imply routing / linting / verification / writes / resolution ----------

test("doc says phrase-backed capabilities do not imply resolver routing, architecture linting, verification planning, source-write permission, or finding resolution", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "capabilitymap v2 phrase-backed capabilities do not imply resolver routing, architecture linting, verification planning, source-write permission, or finding resolution",
    ),
    "memo must pin the full negative-properties list including finding resolution",
  );
});

// ---------- 6: proof report deferral ----------

test("doc says proof report surfacing remains deferred", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "proof report surfacing remains deferred because capabilitymap v2 is semantic projection, not verification proof",
    ),
    "memo must pin proof report surfacing remains deferred (semantic projection, not proof)",
  );
});

// ---------- 7: CapabilityContract decision may begin ----------

test("doc says CapabilityContract decision work may begin after this safety review", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes(
      "capabilitycontract decision work may begin after this safety review if no blockers are found",
    ),
    "memo must pin CapabilityContract decision may begin after this safety review",
  );
});

// ---------- 8: selects CapabilityContract architecture decision next ----------

test("doc selects CapabilityContract architecture decision next", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitycontract architecture decision"),
    "memo must mention CapabilityContract architecture decision",
  );
  assert.ok(
    text.includes("recommended next slice: capabilitycontract architecture decision")
      || text.includes("next slice: capabilitycontract architecture decision")
      || text.includes("capabilitycontract decision next | selected")
      || text.includes("ship capabilitycontract architecture decision as the next slice"),
    "memo must select CapabilityContract architecture decision as the next slice",
  );
});

// ---------- 9: surface table ----------

test("doc includes the surface table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Surface | Status | Boundary |"));
  const plain = plainText(text);
  assert.ok(plain.includes("architecture summary"));
  assert.ok(plain.includes("agent contract"));
  assert.ok(plain.includes("proof report"));
  assert.ok(plain.includes("deferred"));
});

// ---------- 10: boundary table ----------

test("doc includes the boundary table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Overclaim Risk | Guardrail |"));
  const plain = plainText(text);
  assert.ok(plain.includes("capabilitycontract policy"));
  assert.ok(plain.includes("resolver routing"));
  assert.ok(plain.includes("architecture lint"));
  assert.ok(plain.includes("verification requirement"));
  assert.ok(plain.includes("source-write permission"));
});

// ---------- 11: option table ----------

test("doc includes the option table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Option | Decision | Reason |"));
  const plain = plainText(text);
  assert.ok(plain.includes("declare surfacing safe/stable"));
  assert.ok(plain.includes("capabilitycontract decision next"));
  assert.ok(plain.includes("more publication polish first"));
  assert.ok(plain.includes("resolver routing next"));
});

// ---------- 12: CHANGELOG mention ----------

test("CHANGELOG mentions CapabilityMap v2 publication safety review", async () => {
  const changelog = plainText(await read("CHANGELOG.md"));
  assert.ok(
    changelog.includes("capabilitymap v2 publication safety review"),
    "CHANGELOG must mention the CapabilityMap v2 publication safety review",
  );
});

// ---------- 13: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/capability-map-v2-publication-safety-review.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  const plain = plainText(packet);
  assert.ok(
    plain.includes("capabilitymap v2 publication safety review")
      || plain.includes("capability-map-v2-publication-safety-review"),
    "review packet must name the publication safety review slice",
  );
});
