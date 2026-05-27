// Docs tests for CapabilityPhraseReport v1.
//
// Pins the verbatim guarantees the new artifact doc + supporting
// docs must carry so future implementers cannot drift away from
// the layer boundary the architecture + carrier decisions
// established.

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

const artifactDocPath = "docs/artifacts/capability-phrase-report.md";
const conceptDocPath = "docs/concepts/capability-ontology.md";

// ---------- 1: artifact doc exists ----------

test("artifact doc exists at expected path", async () => {
  const text = await read(artifactDocPath);
  assert.ok(text.length > 500, "artifact doc must be substantial");
  assert.ok(text.includes("# `CapabilityPhraseReport` Artifact"));
});

// ---------- 2: concept doc mentions CapabilityPhraseReport ----------

test("concept doc mentions CapabilityPhraseReport", async () => {
  const concept = await read(conceptDocPath);
  assert.ok(concept.includes("`CapabilityPhraseReport`"));
});

// ---------- 3: semantic purpose projection ----------

test("docs say CapabilityPhraseReport is the semantic purpose projection", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("semantic purpose projection"),
    "artifact doc must describe CapabilityPhraseReport as the semantic purpose projection",
  );
});

// ---------- 4: normalization report remains translation audit ----------

test("docs say CapabilityNormalizationReport remains the translation audit", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("translation audit"),
    "artifact doc must describe CapabilityNormalizationReport as the translation audit",
  );
});

// ---------- 5: phrase report consumes normalization report ----------

test("docs say CapabilityPhraseReport consumes CapabilityNormalizationReport", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("consumes capabilitynormalizationreport")
      || artifact.includes("consumes the capabilitynormalizationreport")
      || artifact.includes("consumes the latest capabilitynormalizationreport")
      || artifact.includes("source capabilitynormalizationreport"),
    "artifact doc must say CapabilityPhraseReport consumes CapabilityNormalizationReport",
  );
});

// ---------- 6: only stable / high-confidence in v1 ----------

test("docs say only stable / high-confidence normalized claims project in v1", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("only high-confidence")
      || artifact.includes("only stable / high-confidence")
      || artifact.includes("only stable/high-confidence")
      || artifact.includes("high-confidence normalized"),
    "artifact doc must say only stable / high-confidence claims project in v1",
  );
});

// ---------- 7: CapabilityMap integration remains deferred ----------

test("docs say CapabilityMap integration remains deferred", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("capabilitymap integration remains deferred")
      || artifact.includes("capabilitymap remains deferred")
      || artifact.includes("capabilitymap integration is deferred"),
    "artifact doc must pin that CapabilityMap integration remains deferred",
  );
});

// ---------- 8: no AST evidence required ----------

test("docs say no AST/typechecker evidence is required", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("ast / typechecker evidence is optional")
      || artifact.includes("ast/typechecker evidence is optional")
      || artifact.includes("no ast / typechecker evidence")
      || artifact.includes("optional enrichment, not foundational truth"),
    "artifact doc must pin AST/typechecker evidence as optional enrichment",
  );
});

// ---------- 9: no LLM-only inference ----------

test("docs say no LLM-only inference is used", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("no llm-only inference")
      || artifact.includes("not llm output")
      || artifact.includes("no llm")
      || artifact.includes("llm-only"),
    "artifact doc must pin that no LLM-only inference is used",
  );
});

// ---------- 10: CHANGELOG mentions CapabilityPhraseReport v1 ----------

test("CHANGELOG mentions CapabilityPhraseReport v1", async () => {
  const changelog = (await read("CHANGELOG.md")).toLowerCase();
  assert.ok(
    changelog.includes("capabilityphrasereport")
      && (changelog.includes("v1") || changelog.includes("ship") || changelog.includes("register")),
    "CHANGELOG must mention CapabilityPhraseReport v1",
  );
});

// ---------- 11: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/capability-phrase-report-v1.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(packet.includes("CapabilityPhraseReport"));
});
