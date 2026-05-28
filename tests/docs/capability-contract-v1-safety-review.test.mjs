// Docs tests for the CapabilityContract v1 safety
// review (thirty-fourth slice on the capability-ontology
// track). Pins the verbatim guarantees the safety review
// memo + supporting docs must carry so future
// implementers cannot drift away from the read-only-audit
// model the slice committed to.

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

const memoPath = "docs/strategy/capability-contract-v1-safety-review.md";
const reviewPacketPath = ".rekon-dev/review-packets/capability-contract-v1-safety-review.md";
const changelogPath = "CHANGELOG.md";

// ---------- 1: safety review doc exists ----------

test("safety review doc exists at expected path", async () => {
  const text = await read(memoPath);
  assert.ok(text.length > 500, "safety review must be substantial");
  assert.ok(text.includes("# CapabilityContract v1 Safety Review"));
});

// ---------- 2: doc contains all required headings ----------

test("safety review carries all 11 required headings", async () => {
  const text = await read(memoPath);
  const required = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Artifact And Config Reviewed",
    "## Matching Rule Review",
    "## Validator Review",
    "## CLI Boundary Review",
    "## Projection / Policy Boundary Review",
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

// ---------- 3: CapabilityContract is policy, not projection ----------

test("safety review says CapabilityContract is policy, not projection", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitycontract is policy, not projection"),
    "safety review must restate that CapabilityContract is policy, not projection",
  );
});

// ---------- 4: CapabilityMap v2 remains projection ----------

test("safety review says CapabilityMap v2 remains projection", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitymap v2 remains projection"),
    "safety review must restate that CapabilityMap v2 remains projection",
  );
});

// ---------- 5: configured + unmatched only; suggested reserved ----------

test("safety review pins configured + unmatched only; suggested reserved", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("configured and unmatched rows only")
    && text.includes("suggested remains reserved"),
    "safety review must pin v1 emits configured + unmatched only with suggested reserved",
  );
});

// ---------- 6: deferred consumer pins ----------

test("safety review enumerates deferred consumers", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("does not implement architecture linting"),
    "must defer architecture linting",
  );
  assert.ok(
    text.includes("resolver routing"),
    "must defer resolver routing",
  );
  assert.ok(
    text.includes("verification planning"),
    "must defer verification planning",
  );
  assert.ok(
    text.includes("source writes"),
    "must defer source writes",
  );
  assert.ok(
    text.includes("refactorpreservationcontract"),
    "must defer RefactorPreservationContract",
  );
});

// ---------- 7: next-slice statement ----------

test("safety review says next slice may surface CapabilityContract but must not create enforcement", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("next slice may surface capabilitycontract in publications"),
    "memo must say next slice may surface CapabilityContract in publications",
  );
  assert.ok(
    text.includes("must not create policy enforcement"),
    "memo must say next slice must not create policy enforcement",
  );
});

// ---------- 8: surface table ----------

test("safety review carries the surface table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Surface | Status | Boundary |"));
  assert.ok(text.includes("`CapabilityContract` artifact"));
  assert.ok(text.includes(".rekon/capability-contracts.json"));
  assert.ok(text.includes("publication surfacing"));
});

// ---------- 9: matching table ----------

test("safety review carries the matching table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Rule | Decision |"));
  assert.ok(text.includes("exact verb+noun"));
  assert.ok(text.includes("most-specific-wins"));
  assert.ok(text.includes("suggested rows"));
});

// ---------- 10: boundary table ----------

test("safety review carries the boundary table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Boundary | Decision |"));
  assert.ok(text.includes("`CapabilityMap` vs `CapabilityContract`"));
  assert.ok(text.includes("`CapabilityContract` vs linting"));
  assert.ok(text.includes("`CapabilityContract` vs resolver routing"));
  assert.ok(text.includes("`CapabilityContract` vs verification planning"));
  assert.ok(text.includes("`CapabilityContract` vs source writes"));
  assert.ok(text.includes("`CapabilityContract` vs `RefactorPreservationContract`"));
});

// ---------- 11: option table ----------

test("safety review carries the option table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Option | Decision | Reason |"));
  assert.ok(text.includes("declare v1 safe / stable policy artifact"));
  assert.ok(text.includes("publication surfacing next"));
  assert.ok(text.includes("add enforcement next"));
  assert.ok(text.includes("more dogfood before surfacing"));
});

// ---------- 12: CHANGELOG mentions CapabilityContract v1 safety review ----------

test("CHANGELOG mentions the CapabilityContract v1 safety review slice", async () => {
  const text = await read(changelogPath);
  assert.ok(
    text.includes("CapabilityContract v1 safety review")
    || text.includes("CapabilityContract v1 Safety Review"),
    "CHANGELOG must record the CapabilityContract v1 safety review slice",
  );
});

// ---------- 13: review packet exists + PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const text = await read(reviewPacketPath);
  assert.ok(text.length > 200, "review packet must be substantial");
  assert.ok(
    text.includes("PURPOSE PRESERVATION CHECK"),
    "review packet must include PURPOSE PRESERVATION CHECK section",
  );
});
