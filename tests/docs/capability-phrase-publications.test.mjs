// Docs tests for the CapabilityPhraseReport publication
// surfacing slice. Pins the verbatim guarantees the
// architecture-summary + agent-contract docs must carry so
// future implementers cannot drift the read-only contract
// or the CapabilityMap-deferred pin.

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

// ---------- 1: docs mention architecture summary surfacing ----------

test("docs mention architecture summary surfacing of CapabilityPhraseReport", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("architecture summary"),
    "artifact doc must mention the architecture summary publisher",
  );
});

// ---------- 2: docs mention agent contract surfacing ----------

test("docs mention agent contract surfacing of CapabilityPhraseReport", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("agent contract"),
    "artifact doc must mention the agent contract publisher",
  );
});

// ---------- 3: proof report surfacing deferred ----------

test("docs say proof report surfacing is deferred", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("proof report surfacing is deferred")
      || artifact.includes("proof-report surfacing is deferred")
      || artifact.includes("proof report surfacing remains deferred"),
    "artifact doc must say proof report surfacing is deferred",
  );
});

// ---------- 4: publications read latest CapabilityPhraseReport ----------

test("docs say publications read the latest CapabilityPhraseReport", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("read the latest capabilityphrasereport")
      || artifact.includes("read latest capabilityphrasereport")
      || artifact.includes("read the latest"),
    "artifact doc must say publications read the latest CapabilityPhraseReport",
  );
});

// ---------- 5: publications do not run projection ----------

test("docs say publications do not run projection", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("never runs the phrase projection cli")
      || artifact.includes("never runs phrase projection")
      || artifact.includes("do not run projection")
      || artifact.includes("does not run projection"),
    "artifact doc must say publications never run phrase projection",
  );
});

// ---------- 6: publications do not mutate CapabilityMap ----------

test("docs say publications do not mutate CapabilityMap", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("never mutates capabilitymap")
      || artifact.includes("do not mutate capabilitymap")
      || artifact.includes("does not mutate capabilitymap"),
    "artifact doc must say publications never mutate CapabilityMap",
  );
});

// ---------- 7: phrase report is semantic purpose projection ----------

test("docs say CapabilityPhraseReport is semantic purpose projection", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("semantic purpose projection"),
    "artifact doc must describe CapabilityPhraseReport as the semantic purpose projection",
  );
});

// ---------- 8: normalization report remains translation audit ----------

test("docs say CapabilityNormalizationReport remains the translation audit", async () => {
  const artifact = plainText(await read(artifactDocPath));
  assert.ok(
    artifact.includes("translation audit"),
    "artifact doc must say CapabilityNormalizationReport remains the translation audit",
  );
});

// ---------- 9: CHANGELOG mentions publication surfacing ----------

test("CHANGELOG mentions CapabilityPhraseReport publication surfacing", async () => {
  const changelog = (await read("CHANGELOG.md")).toLowerCase();
  assert.ok(
    changelog.includes("capabilityphrasereport")
      && (changelog.includes("publication surfacing")
        || changelog.includes("publication surfac")),
    "CHANGELOG must mention CapabilityPhraseReport publication surfacing",
  );
});

// ---------- 10: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/capability-phrase-publications.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(packet.includes("CapabilityPhraseReport"));
  assert.ok(packet.includes("architecture-summary") || packet.includes("architecture summary"));
});
