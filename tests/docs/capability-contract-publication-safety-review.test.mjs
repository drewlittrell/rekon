// Docs tests for the CapabilityContract publication
// safety review (thirty-sixth slice on the
// capability-ontology track).
//
// Pins the verbatim guarantees the safety review memo +
// CHANGELOG + review packet must carry so future
// implementers cannot drift away from the
// read-only-visibility / no-enforcement model the slice
// committed to.

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

const memoPath = "docs/strategy/capability-contract-publication-safety-review.md";
const reviewPacketPath = ".rekon-dev/review-packets/capability-contract-publication-safety-review.md";
const changelogPath = "CHANGELOG.md";

// ---------- 1: safety review doc exists ----------

test("safety review doc exists at expected path", async () => {
  const text = await read(memoPath);
  assert.ok(text.length > 500, "safety review must be substantial");
  assert.ok(text.includes("# CapabilityContract Publication Safety Review"));
});

// ---------- 2: all required headings ----------

test("safety review carries all 11 required headings", async () => {
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
    assert.ok(
      text.includes(heading),
      `safety review must include heading: ${heading}`,
    );
  }
});

// ---------- 3: read-only visibility ----------

test("safety review says CapabilityContract publication surfacing is read-only visibility", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitycontract publication surfacing is read-only visibility"),
    "memo must restate that publication surfacing is read-only visibility",
  );
});

// ---------- 4: policy, not projection or enforcement ----------

test("safety review says CapabilityContract is policy, not projection or enforcement", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitycontract is policy, not projection or enforcement"),
    "memo must restate that CapabilityContract is policy, not projection or enforcement",
  );
});

// ---------- 5: no implication of enforcement consumers ----------

test("safety review pins all six overclaim risks (linting / routing / planning / resolution / refactor / source writes)", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(text.includes("architecture linting"), "must name architecture linting");
  assert.ok(text.includes("resolver routing"), "must name resolver routing");
  assert.ok(text.includes("verification planning"), "must name verification planning");
  assert.ok(text.includes("finding resolution"), "must name finding resolution");
  assert.ok(
    text.includes("refactorpreservationcontract"),
    "must name RefactorPreservationContract",
  );
  assert.ok(text.includes("source-write permission") || text.includes("source writes"),
    "must name source-write permission / source writes");
});

// ---------- 6: publications read, never generate ----------

test("safety review says publications read the latest CapabilityContract and never generate it", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("publications read the latest capabilitycontract; they never generate it"),
    "memo must say publications read the latest CapabilityContract; they never generate it",
  );
});

// ---------- 7: proof report deferred ----------

test("safety review says proof report surfacing remains deferred", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("proof report surfacing remains deferred because capabilitycontract is policy context, not verification proof"),
    "memo must restate that proof report surfacing remains deferred because CapabilityContract is policy context, not verification proof",
  );
});

// ---------- 8: architecture linting decision next ----------

test("safety review says architecture linting decision work may begin after this safety review", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("architecture linting decision work may begin after this safety review"),
    "memo must say architecture linting decision work may begin after this safety review",
  );
});

// ---------- 9: surface table ----------

test("safety review carries the surface table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Surface | Status | Boundary |"));
  assert.ok(text.includes("architecture summary"));
  assert.ok(text.includes("agent contract"));
  assert.ok(text.includes("proof report"));
});

// ---------- 10: boundary table ----------

test("safety review carries the boundary table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Overclaim Risk | Guardrail |"));
  assert.ok(text.includes("treated as architecture linting"));
  assert.ok(text.includes("treated as resolver routing"));
  assert.ok(text.includes("treated as verification planning"));
  assert.ok(text.includes("treated as finding resolution"));
  assert.ok(text.includes("treated as RefactorPreservationContract"));
  assert.ok(text.includes("treated as source-write permission"));
});

// ---------- 11: option table ----------

test("safety review carries the option table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Option | Decision | Reason |"));
  assert.ok(text.includes("declare surfacing safe/stable"));
  assert.ok(text.includes("architecture linting decision next"));
  assert.ok(text.includes("more publication polish first"));
  assert.ok(text.includes("resolver routing next"));
  assert.ok(text.includes("verification planning next"));
});

// ---------- 12: CHANGELOG ----------

test("CHANGELOG mentions the CapabilityContract publication safety review slice", async () => {
  const raw = await read(changelogPath);
  // Collapse whitespace so line-wrapped phrasing
  // ("publication safety\n  review") still matches.
  const text = raw.replace(/\s+/g, " ");
  assert.ok(
    /CapabilityContract publication safety review/i.test(text),
    "CHANGELOG must record the CapabilityContract publication safety review slice",
  );
});

// ---------- 13: review packet ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const text = await read(reviewPacketPath);
  assert.ok(text.length > 200, "review packet must be substantial");
  assert.ok(
    text.includes("PURPOSE PRESERVATION CHECK"),
    "review packet must include PURPOSE PRESERVATION CHECK section",
  );
});
