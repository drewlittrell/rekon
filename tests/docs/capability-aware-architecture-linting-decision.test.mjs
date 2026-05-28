// Docs tests for the capability-aware architecture
// linting decision (thirty-seventh slice on the
// capability-ontology track).
//
// Pins the verbatim guarantees the decision memo +
// CHANGELOG + review packet must carry so future
// implementers cannot drift away from the
// no-enforcement / no-finding-mutation model the slice
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

const memoPath = "docs/strategy/capability-aware-architecture-linting-decision.md";
const reviewPacketPath = ".rekon-dev/review-packets/capability-aware-architecture-linting-decision.md";
const changelogPath = "CHANGELOG.md";

// ---------- 1: memo exists ----------

test("decision memo exists at expected path", async () => {
  const text = await read(memoPath);
  assert.ok(text.length > 500, "decision memo must be substantial");
  assert.ok(text.includes("# Capability-Aware Architecture Linting Decision"));
});

// ---------- 2: all required headings ----------

test("decision memo carries all 12 required headings", async () => {
  const text = await read(memoPath);
  const required = [
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Current Boundary",
    "## Options Considered",
    "## Recommendation",
    "## Lint Artifact Model",
    "## V1 Scope",
    "## Severity And Confidence Policy",
    "## Finding Bridge Boundary",
    "## Future Consumers",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  for (const heading of required) {
    assert.ok(
      text.includes(heading),
      `decision memo must include heading: ${heading}`,
    );
  }
});

// ---------- 3: selects separate lint report artifact ----------

test("decision memo selects separate CapabilityArchitectureLintReport artifact", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilityarchitecturelintreport"),
    "decision memo must name the new CapabilityArchitectureLintReport artifact",
  );
  assert.ok(
    text.includes("select option b"),
    "decision memo must select Option B",
  );
});

// ---------- 4: v1 scope (allowed/forbidden Layers/Systems) ----------

test("decision memo includes allowedLayers / forbiddenLayers / allowedSystems / forbiddenSystems in v1 scope", async () => {
  const raw = await read(memoPath);
  const text = plainText(raw);
  assert.ok(text.includes("allowedlayers"), "must include allowedLayers");
  assert.ok(text.includes("forbiddenlayers"), "must include forbiddenLayers");
  assert.ok(text.includes("allowedsystems"), "must include allowedSystems");
  assert.ok(text.includes("forbiddensystems"), "must include forbiddenSystems");
  // Scope table marks each as "included".
  assert.ok(raw.includes("| allowedLayers | included |"));
  assert.ok(raw.includes("| forbiddenLayers | included |"));
  assert.ok(raw.includes("| allowedSystems | included |"));
  assert.ok(raw.includes("| forbiddenSystems | included |"));
});

// ---------- 5: deferred (neighbors, preservation) ----------

test("decision memo defers requiredNeighbors / forbiddenNeighbors / preservationRules", async () => {
  const raw = await read(memoPath);
  assert.ok(raw.includes("| requiredNeighbors | deferred |"));
  assert.ok(raw.includes("| forbiddenNeighbors | deferred |"));
  assert.ok(raw.includes("| preservationRules | deferred |"));
});

// ---------- 6: not FindingReport in v1 ----------

test("decision memo says CapabilityArchitectureLintReport is not FindingReport in v1", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilityarchitecturelintreport is not findingreport in v1"),
    "decision memo must restate the FindingReport boundary verbatim",
  );
});

// ---------- 7: no mutation of finding lifecycle / coherency delta ----------

test("decision memo says it does not mutate FindingLifecycleReport or CoherencyDelta", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("does not mutate findinglifecyclereport or coherencydelta"),
    "decision memo must restate the lifecycle / coherency boundary verbatim",
  );
});

// ---------- 8: no resolver routing / verification planning ----------

test("decision memo says it does not implement resolver routing or verification planning", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("does not implement resolver routing or verification planning"),
    "decision memo must restate the routing / planning boundary verbatim",
  );
});

// ---------- 9: only later explicit bridge promotes ----------

test("decision memo says only a later explicit bridge may promote lint rows into governed findings", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("only a later explicit bridge may promote lint rows into governed findings"),
    "decision memo must restate the future-bridge gate verbatim",
  );
});

// ---------- 10: option table ----------

test("decision memo carries the option table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Option | Decision | Reason |"));
  assert.ok(text.includes("no architecture linting"));
  assert.ok(text.includes("separate lint report first"));
  assert.ok(text.includes("emit FindingReport directly"));
  assert.ok(text.includes("emit CoherencyDelta directly"));
  assert.ok(text.includes("resolver routing first"));
});

// ---------- 11: scope table ----------

test("decision memo carries the scope table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Rule | V1 Decision |"));
  assert.ok(text.includes("| requiredChecks |"));
});

// ---------- 12: boundary table ----------

test("decision memo carries the boundary table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Boundary | Decision |"));
  assert.ok(text.includes("lint report vs source mutation"));
  assert.ok(text.includes("lint report vs FindingReport"));
  assert.ok(text.includes("lint report vs FindingLifecycleReport"));
  assert.ok(text.includes("lint report vs CoherencyDelta"));
  assert.ok(text.includes("lint report vs resolver routing"));
  assert.ok(text.includes("lint report vs verification planning"));
});

// ---------- 13: future bridge table ----------

test("decision memo carries the future bridge table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Future Bridge | Requirement |"));
  assert.ok(text.includes("lint row → FindingReport"));
  assert.ok(text.includes("lint row → WorkOrder"));
  assert.ok(text.includes("lint row → VerificationPlan"));
  assert.ok(text.includes("lint row → resolver routing"));
});

// ---------- 14: CHANGELOG ----------

test("CHANGELOG mentions the capability-aware architecture linting decision", async () => {
  const raw = await read(changelogPath);
  // Collapse whitespace so line-wrapped phrasing still matches.
  const text = raw.replace(/\s+/g, " ");
  assert.ok(
    /capability-aware architecture linting decision/i.test(text),
    "CHANGELOG must record the capability-aware architecture linting decision slice",
  );
});

// ---------- 15: review packet exists + PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const text = await read(reviewPacketPath);
  assert.ok(text.length > 200, "review packet must be substantial");
  assert.ok(
    text.includes("PURPOSE PRESERVATION CHECK"),
    "review packet must include PURPOSE PRESERVATION CHECK section",
  );
});
