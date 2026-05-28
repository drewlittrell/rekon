// Docs tests for the CapabilityContract publication
// surfacing slice (thirty-fifth slice on the
// capability-ontology track).
//
// Pins the verbatim guarantees the publication-surfacing
// docs must carry so future implementers cannot drift
// away from the read-only-visibility model the slice
// committed to.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

async function read(path) {
  return await readFile(`${repoRoot}/${path}`, "utf8");
}

const artifactDocPath = "docs/artifacts/capability-contract.md";
const conceptDocPath = "docs/concepts/capability-contracts.md";
const archSummaryConceptPath = "docs/concepts/architecture-summary-publication.md";
const archSummaryArtifactPath = "docs/artifacts/architecture-summary-publication.md";
const agentContractConceptPath = "docs/concepts/agent-operating-contract.md";
const agentContractArtifactPath = "docs/artifacts/agent-contract-publication.md";
const proofReportConceptPath = "docs/concepts/proof-report-publication.md";
const proofReportArtifactPath = "docs/artifacts/proof-report-publication.md";
const safetyReviewPath = "docs/strategy/capability-contract-v1-safety-review.md";
const changelogPath = "CHANGELOG.md";
const reviewPacketPath = ".rekon-dev/review-packets/capability-contract-publications.md";

// ---------- 1: docs mention architecture summary surfacing ----------

test("docs mention architecture summary CapabilityContract surfacing", async () => {
  const text = await read(archSummaryConceptPath);
  assert.ok(
    text.includes("CapabilityContract")
    && /Capability Contracts/i.test(text),
    "architecture summary publication concept doc must mention the new Capability Contracts section",
  );
});

// ---------- 2: docs mention agent contract surfacing ----------

test("docs mention agent contract CapabilityContract surfacing", async () => {
  const text = await read(agentContractConceptPath);
  assert.ok(
    text.includes("CapabilityContract")
    && /Capability Contracts/i.test(text),
    "agent operating contract concept doc must mention the new Capability Contracts section",
  );
});

// ---------- 3: docs say proof report surfacing is deferred ----------

test("docs say CapabilityContract proof-report surfacing is deferred", async () => {
  const candidatePaths = [
    proofReportConceptPath,
    proofReportArtifactPath,
    conceptDocPath,
    archSummaryConceptPath,
    safetyReviewPath,
  ];
  let foundDeferral = false;
  for (const path of candidatePaths) {
    let text;
    try {
      text = await read(path);
    } catch {
      continue;
    }
    if (
      /proof[-\s]?report.*defer|defer.*proof[-\s]?report/i.test(text)
      && /CapabilityContract/.test(text)
    ) {
      foundDeferral = true;
      break;
    }
  }
  assert.ok(
    foundDeferral,
    "at least one publication-surfacing doc must explicitly defer proof-report surfacing of CapabilityContract",
  );
});

// ---------- 4: docs say publications read latest CapabilityContract ----------

test("docs say publications read latest CapabilityContract", async () => {
  const archConcept = await read(archSummaryConceptPath);
  assert.ok(
    /latest CapabilityContract|latest `CapabilityContract`|read.*CapabilityContract/i.test(archConcept),
    "architecture summary concept doc must say publications read the latest CapabilityContract",
  );
});

// ---------- 5: docs say publications do not generate CapabilityContract ----------

test("docs say publications do not generate CapabilityContract", async () => {
  const archConcept = await read(archSummaryConceptPath);
  const agentConcept = await read(agentContractConceptPath);
  // Strip newlines + collapse whitespace so cross-line
  // phrasing like "never runs\n`rekon capability
  // contract generate`" still matches.
  const normalise = (text) => text.replace(/\s+/g, " ").toLowerCase();
  const candidate = `${normalise(archConcept)} ${normalise(agentConcept)}`;
  assert.ok(
    /never runs? `?rekon capability contract generate`?/.test(candidate)
    || /(publications?|publisher) (do not|never|does not) (run|generate|invoke|call)[^.]*capabilitycontract/.test(candidate)
    || /does not generate[^.]*capabilitycontract/.test(candidate),
    "publication-surfacing docs must say publications never generate CapabilityContract",
  );
});

// ---------- 6: docs say publications do not mutate the config file ----------

test("docs say publications do not mutate .rekon/capability-contracts.json", async () => {
  const archConcept = await read(archSummaryConceptPath);
  const agentConcept = await read(agentContractConceptPath);
  const candidate = `${archConcept}\n${agentConcept}`;
  assert.ok(
    /\.rekon\/capability-contracts\.json/.test(candidate)
    && /(never|do not|don't).*(mutate|write|modify)/i.test(candidate),
    "publication-surfacing docs must say the config file is never mutated",
  );
});

// ---------- 7: docs say CapabilityContract surfacing is visibility only ----------

test("docs say CapabilityContract publication surfacing is visibility only", async () => {
  const archConcept = await read(archSummaryConceptPath);
  const agentConcept = await read(agentContractConceptPath);
  const candidate = `${archConcept}\n${agentConcept}`;
  assert.ok(
    /visibility only|read-only visibility|policy visibility only/i.test(candidate),
    "publication-surfacing docs must say surfacing is visibility only",
  );
});

// ---------- 8: docs say surfacing does not enforce ----------

test("docs say CapabilityContract surfacing does not enforce architecture linting, resolver routing, verification planning, source writes, or finding resolution", async () => {
  const archConcept = await read(archSummaryConceptPath);
  const agentConcept = await read(agentContractConceptPath);
  const candidate = `${archConcept}\n${agentConcept}`;
  assert.ok(/architecture linting/i.test(candidate));
  assert.ok(/resolver routing/i.test(candidate));
  assert.ok(/verification planning/i.test(candidate));
  assert.ok(/source[\s-]?writes?/i.test(candidate));
  assert.ok(/finding resolution|finding lifecycle/i.test(candidate));
});

// ---------- 9: CHANGELOG mentions CapabilityContract publication surfacing ----------

test("CHANGELOG mentions CapabilityContract publication surfacing slice", async () => {
  const text = await read(changelogPath);
  assert.ok(
    /CapabilityContract publication surfacing/i.test(text),
    "CHANGELOG must record the CapabilityContract publication surfacing slice",
  );
});

// ---------- 10: review packet exists + PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const text = await read(reviewPacketPath);
  assert.ok(text.length > 200, "review packet must be substantial");
  assert.ok(
    text.includes("PURPOSE PRESERVATION CHECK"),
    "review packet must include PURPOSE PRESERVATION CHECK section",
  );
});

// ---------- 11: artifact doc + concept doc cross-link publication surfacing ----------

test("artifact + concept docs cross-link the publication surfacing surfaces", async () => {
  const artifact = await read(artifactDocPath);
  const concept = await read(conceptDocPath);
  assert.ok(/architecture summary/i.test(artifact + concept));
  assert.ok(/agent (operating )?contract|agent-contract/i.test(artifact + concept));
});
