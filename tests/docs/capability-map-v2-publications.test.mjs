// Docs tests for the CapabilityMap v2 publication
// surfacing slice (thirtieth slice on the capability-
// ontology track). Pins the verbatim guarantees the
// publication-surfacing layer carries across the
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

const DOC_PATHS = [
  "docs/artifacts/capability-map.md",
  "docs/artifacts/architecture-summary-publication.md",
  "docs/artifacts/agent-contract-publication.md",
];

async function readDocs() {
  return Promise.all(DOC_PATHS.map((path) => read(path)));
}

// ---------- 1: architecture-summary surfacing mentioned ----------

test("docs mention architecture summary surfacing of CapabilityMap v2", async () => {
  const docs = (await readDocs()).map(plainText).join("\n---\n");
  assert.ok(
    docs.includes("architecture summary")
    && docs.includes("capabilitymap v2"),
    "supporting docs must mention architecture summary surfacing for CapabilityMap v2",
  );
  // The architecture-summary doc specifically must
  // reference the v2 surfacing.
  const arch = plainText(
    await read("docs/artifacts/architecture-summary-publication.md"),
  );
  assert.ok(
    arch.includes("capabilitymap v2 phrase-backed capabilities")
      || arch.includes("capabilitymap v2"),
    "architecture-summary publication doc must reference CapabilityMap v2",
  );
});

// ---------- 2: agent contract surfacing mentioned ----------

test("docs mention agent contract surfacing of CapabilityMap v2", async () => {
  const agent = plainText(
    await read("docs/artifacts/agent-contract-publication.md"),
  );
  assert.ok(
    agent.includes("capabilitymap v2 phrase-backed capabilities")
      || agent.includes("capabilitymap v2"),
    "agent-contract publication doc must reference CapabilityMap v2",
  );
});

// ---------- 3: proof report surfacing deferred ----------

test("docs say proof report surfacing of CapabilityMap v2 is deferred", async () => {
  const proof = plainText(
    await read("docs/artifacts/proof-report-publication.md"),
  );
  assert.ok(
    proof.includes(
      "proof-report surfacing of capabilitymap v2 is deferred",
    )
      || proof.includes(
        "capabilitymap v2 proof-report surfacing is deferred",
      )
      || proof.includes(
        "capabilitymap v2 surfacing in the proof report is deferred",
      ),
    "proof-report publication doc must state v2 surfacing is deferred",
  );
});

// ---------- 4: docs say publications read v2 fields ----------

test("docs say publications read CapabilityMap v2 fields", async () => {
  const docs = (await readDocs()).map(plainText).join("\n---\n");
  assert.ok(
    docs.includes("phrasebackedcapabilities")
    && docs.includes("phrasebackedsummary")
    && docs.includes("phrasesourceref"),
    "supporting docs must enumerate the three v2 fields publications read",
  );
});

// ---------- 5: docs say publications do not mutate CapabilityMap ----------

test("docs say publications do not mutate CapabilityMap", async () => {
  const docs = (await readDocs()).map(plainText).join("\n---\n");
  assert.ok(
    docs.includes("publications do not mutate capabilitymap")
      || docs.includes("publications never mutate capabilitymap")
      || docs.includes("never mutate capabilitymap")
      || docs.includes("never mutates capabilitymap"),
    "docs must pin publications never mutate CapabilityMap",
  );
});

// ---------- 6: docs say projection context, not CapabilityContract policy ----------

test("docs say phrase-backed capabilities are projection context, not CapabilityContract policy", async () => {
  const docs = (await readDocs()).map(plainText).join("\n---\n");
  assert.ok(
    docs.includes("projection context, not capabilitycontract placement policy")
      || docs.includes("projection context, not capabilitycontract policy"),
    "docs must pin v2 entries are projection context, not CapabilityContract policy",
  );
});

// ---------- 7: docs say v2 does not imply routing / linting / verification / writes ----------

test("docs say phrase-backed capabilities do not imply resolver routing, architecture linting, verification planning, or source writes", async () => {
  const docs = (await readDocs()).map(plainText).join("\n---\n");
  assert.ok(
    docs.includes(
      "does not imply placement policy, ownership policy, resolver routing, architecture linting, verification planning, or source writes",
    )
      || (
        docs.includes("resolver routing")
        && docs.includes("architecture linting")
        && docs.includes("verification planning")
        && docs.includes("source writes")
      ),
    "docs must pin the full negative-properties list for v2 surfacing",
  );
});

// ---------- 8: CHANGELOG mention ----------

test("CHANGELOG mentions CapabilityMap v2 publication surfacing", async () => {
  const changelog = plainText(await read("CHANGELOG.md"));
  assert.ok(
    changelog.includes("capabilitymap v2 publication surfacing"),
    "CHANGELOG must mention the CapabilityMap v2 publication surfacing slice",
  );
});

// ---------- 9: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/capability-map-v2-publications.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  const plain = plainText(packet);
  assert.ok(
    plain.includes("capabilitymap v2 publication surfacing")
      || plain.includes("capability-map-v2-publications"),
    "review packet must name the v2 publication surfacing slice",
  );
});
