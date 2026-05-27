// Docs tests for CapabilityContract v1.
//
// Pins the verbatim guarantees the new artifact doc +
// concept doc + supporting docs must carry so future
// implementers cannot drift away from the policy / layer
// boundary the architecture decision established.

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

const artifactDocPath = "docs/artifacts/capability-contract.md";
const conceptDocPath = "docs/concepts/capability-contracts.md";
const decisionMemoPath = "docs/strategy/capability-contract-architecture-decision.md";
const capabilityMapArtifactPath = "docs/artifacts/capability-map.md";
const phraseReportArtifactPath = "docs/artifacts/capability-phrase-report.md";
const ontologyConceptPath = "docs/concepts/capability-ontology.md";
const archSummaryConceptPath = "docs/concepts/architecture-summary-publication.md";
const agentContractConceptPath = "docs/concepts/agent-operating-contract.md";
const roadmapPath = "docs/strategy/roadmap.md";
const classicRoadmapPath = "docs/strategy/classic-behavior-roadmap.md";
const readmePath = "README.md";
const changelogPath = "CHANGELOG.md";

// ---------- 1: artifact doc exists ----------

test("artifact doc exists at expected path", async () => {
  const text = await read(artifactDocPath);
  assert.ok(text.length > 500, "artifact doc must be substantial");
  assert.ok(text.includes("# `CapabilityContract` Artifact"));
});

// ---------- 2: concept doc exists ----------

test("concept doc exists at expected path", async () => {
  const text = await read(conceptDocPath);
  assert.ok(text.length > 500, "concept doc must be substantial");
  assert.ok(text.includes("# CapabilityContract"));
});

// ---------- 3: artifact doc declares CapabilityContract is policy ----------

test("artifact doc declares CapabilityContract is policy, not projection", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("capabilitycontract is policy"),
    "artifact doc must state CapabilityContract is policy (not projection)",
  );
});

// ---------- 4: artifact doc says CapabilityMap is projection ----------

test("artifact doc says CapabilityMap remains projection (must not grow policy fields)", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("capabilitymap v2 remains projection")
    || artifact.includes("capabilitymap remains projection"),
    "artifact doc must restate the CapabilityMap projection-only pin",
  );
});

// ---------- 5: artifact doc pins v1 emits configured + unmatched only ----------

test("artifact doc pins v1 emits configured + unmatched only", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("configured")
    && artifact.includes("unmatched"),
    "artifact doc must describe both configured and unmatched statuses",
  );
  assert.ok(
    artifact.includes("suggested")
    && (
      artifact.includes("reserved")
      || artifact.includes("not emit")
      || artifact.includes("future")
    ),
    "artifact doc must reserve `suggested` for future use",
  );
});

// ---------- 6: artifact doc pins matching is conjunctive ----------

test("artifact doc pins matching is conjunctive (exact verb+noun + optional domain/pattern/layer)", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("conjunctive"),
    "artifact doc must call out conjunctive matching",
  );
  assert.ok(
    artifact.includes("most-specific"),
    "artifact doc must describe most-specific match wins",
  );
});

// ---------- 7: artifact doc carries the citation chain ----------

test("artifact doc describes the citation chain (CapabilityContract → CapabilityMap → CapabilityPhrase → EvidenceGraph)", async () => {
  const artifact = await read(artifactDocPath);
  assert.ok(
    artifact.includes("CapabilityMap")
    && artifact.includes("CapabilityPhrase")
    && artifact.includes("EvidenceGraph"),
    "artifact doc must thread the citation chain",
  );
});

// ---------- 8: artifact doc pins no source / config mutation ----------

test("artifact doc pins no source mutation, no config mutation, no LLM inference", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("no source")
    || artifact.includes("never writes the config")
    || artifact.includes("does not mutate"),
    "artifact doc must restate the no-mutation invariants",
  );
});

// ---------- 9: artifact doc says no architecture linting in v1 ----------

test("artifact doc says no architecture linting / no resolver routing / no verification planning in v1", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("no architecture linting")
    || artifact.includes("does not lint"),
    "artifact doc must restate that v1 does not lint architecture",
  );
});

// ---------- 10: artifact doc cites the architecture decision memo ----------

test("artifact doc cites the architecture decision memo", async () => {
  const artifact = await read(artifactDocPath);
  assert.ok(
    artifact.includes("capability-contract-architecture-decision.md"),
    "artifact doc must cite the architecture decision memo",
  );
});

// ---------- 11: concept doc cross-references CapabilityMap + CapabilityPhrase ----------

test("concept doc cross-references CapabilityMap + CapabilityPhraseReport + Capability Ontology", async () => {
  const concept = await read(conceptDocPath);
  assert.ok(concept.includes("CapabilityMap"));
  assert.ok(concept.includes("CapabilityPhrase"));
  assert.ok(concept.includes("capability-ontology") || concept.includes("Capability Ontology"));
});

// ---------- 12: capability-map artifact doc reserves policy layer ----------

test("capability-map artifact doc points to CapabilityContract as the policy layer", async () => {
  const map = await read(capabilityMapArtifactPath);
  assert.ok(
    map.includes("CapabilityContract"),
    "capability-map artifact doc must reference CapabilityContract as the policy layer",
  );
});

// ---------- 13: phrase-report artifact doc references CapabilityContract ----------

test("phrase-report artifact doc references CapabilityContract as downstream policy", async () => {
  const phrase = await read(phraseReportArtifactPath);
  assert.ok(
    phrase.includes("CapabilityContract"),
    "phrase-report artifact doc must reference CapabilityContract as downstream policy",
  );
});

// ---------- 14: ontology concept doc mentions CapabilityContract ----------

test("ontology concept doc mentions CapabilityContract", async () => {
  const ontology = await read(ontologyConceptPath);
  assert.ok(
    ontology.includes("CapabilityContract"),
    "ontology concept doc must mention CapabilityContract in the layer ladder",
  );
});

// ---------- 15: architecture summary publication concept references CapabilityContract ----------

test("architecture summary publication concept doc mentions CapabilityContract", async () => {
  const summary = await read(archSummaryConceptPath);
  assert.ok(
    summary.includes("CapabilityContract"),
    "architecture summary publication doc must reference CapabilityContract",
  );
});

// ---------- 16: agent operating contract concept references CapabilityContract ----------

test("agent operating contract concept doc mentions CapabilityContract", async () => {
  const agent = await read(agentContractConceptPath);
  assert.ok(
    agent.includes("CapabilityContract"),
    "agent operating contract doc must reference CapabilityContract",
  );
});

// ---------- 17: roadmap entry exists ----------

test("roadmap mentions CapabilityContract v1 slice as shipped or planned", async () => {
  const roadmap = await read(roadmapPath);
  assert.ok(roadmap.includes("CapabilityContract"));
});

// ---------- 18: classic roadmap entry exists ----------

test("classic-behavior roadmap mentions CapabilityContract", async () => {
  const classic = await read(classicRoadmapPath);
  assert.ok(classic.includes("CapabilityContract"));
});

// ---------- 19: CLI command appears in README ----------

test("README documents the rekon capability contract generate command", async () => {
  const readme = await read(readmePath);
  assert.ok(
    readme.includes("rekon capability contract generate")
    || readme.includes("capability contract generate"),
    "README must document the new CLI command",
  );
});

// ---------- 20: CHANGELOG carries an entry ----------

test("CHANGELOG mentions CapabilityContract v1 implementation", async () => {
  const changelog = await read(changelogPath);
  assert.ok(
    changelog.includes("CapabilityContract"),
    "CHANGELOG must record the CapabilityContract v1 slice",
  );
});

// ---------- 21: decision memo's Implementation Sequence marks step 3 shipped ----------

test("architecture decision memo Implementation Sequence updates step 3 to shipped", async () => {
  const memo = await read(decisionMemoPath);
  // The exact phrasing the implementer chooses is flexible,
  // but the memo MUST mark `CapabilityContract` v1
  // implementation as shipped (i.e. cease to call it
  // "next slice").
  assert.ok(
    memo.includes("CapabilityContract")
    && memo.includes("v1 implementation"),
    "decision memo must reference CapabilityContract v1 implementation",
  );
  assert.ok(
    /(?:✅|Shipped|shipped)/.test(memo),
    "decision memo must mark step 3 as shipped",
  );
});
