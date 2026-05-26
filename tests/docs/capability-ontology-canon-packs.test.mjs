// Docs tests for capability ontology canon packs v1.
//
// Pins documentation aligned with the canon + override model
// decision: Rekon ships canonical packs (`base` + archetype
// overlays), repo-local overrides extend or supersede them,
// suggestions propose override-file changes, and Rekon never
// mutates the override file automatically.

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

// ---------- 1: docs mention built-in canon packs ----------

test("docs mention built-in canon packs", async () => {
  const concept = await read("docs/concepts/capability-ontology.md");
  const collapsed = collapseWhitespace(concept).toLowerCase();
  assert.ok(
    collapsed.includes("canon pack") || collapsed.includes("canonical pack"),
    "concept doc must mention canon / canonical packs",
  );
});

// ---------- 2: docs mention base pack ----------

test("docs mention the base pack", async () => {
  const concept = await read("docs/concepts/capability-ontology.md");
  assert.ok(concept.includes("`base`"));
});

// ---------- 3: docs mention nextjs-app pack ----------

test("docs mention the nextjs-app overlay pack", async () => {
  const concept = await read("docs/concepts/capability-ontology.md");
  assert.ok(concept.includes("`nextjs-app`"));
});

// ---------- 4: docs mention library-package pack ----------

test("docs mention the library-package overlay pack", async () => {
  const concept = await read("docs/concepts/capability-ontology.md");
  assert.ok(concept.includes("`library-package`"));
});

// ---------- 5: docs mention monorepo pack ----------

test("docs mention the monorepo overlay pack", async () => {
  const concept = await read("docs/concepts/capability-ontology.md");
  assert.ok(concept.includes("`monorepo`"));
});

// ---------- 6: docs mention overrides file path ----------

test("docs mention `.rekon/capability-ontology.overrides.json`", async () => {
  const concept = await read("docs/concepts/capability-ontology.md");
  const artifactDoc = await read("docs/artifacts/capability-normalization-report.md");
  assert.ok(concept.includes(".rekon/capability-ontology.overrides.json"));
  assert.ok(artifactDoc.includes(".rekon/capability-ontology.overrides.json"));
});

// ---------- 7: legacy path documented as legacy-compat ----------

test("docs say `.rekon/capability-ontology.json` is legacy compatibility only", async () => {
  const concept = await read("docs/concepts/capability-ontology.md");
  const collapsed = collapseWhitespace(concept).toLowerCase();
  assert.ok(
    collapsed.includes("legacy compat")
      || collapsed.includes("legacy-compat")
      || collapsed.includes("legacy compatibility"),
    "concept doc must describe `.rekon/capability-ontology.json` as legacy compatibility",
  );
});

// ---------- 8: overrides extend / supersede canon ----------

test("docs say overrides extend / supersede canon", async () => {
  const concept = await read("docs/concepts/capability-ontology.md");
  const collapsed = collapseWhitespace(concept).toLowerCase();
  assert.ok(
    collapsed.includes("extend") && collapsed.includes("supersede"),
    "concept doc must say overrides extend AND supersede canon",
  );
});

// ---------- 9: suggestions propose override-file changes ----------

test("docs say suggestions propose override-file changes (not canon edits)", async () => {
  const suggestionDoc = await read(
    "docs/artifacts/capability-ontology-suggestion-report.md",
  );
  const collapsed = collapseWhitespace(suggestionDoc).toLowerCase();
  assert.ok(
    collapsed.includes("override-file") || collapsed.includes("override file"),
    "suggestion-report doc must mention override-file proposals",
  );
});

// ---------- 10: config is never mutated automatically ----------

test("docs say config is never mutated automatically", async () => {
  const concept = await read("docs/concepts/capability-ontology.md");
  const collapsed = collapseWhitespace(concept).toLowerCase();
  assert.ok(
    collapsed.includes("never creates or mutates") || collapsed.includes("not mutated automatically"),
    "concept doc must pin that Rekon never mutates the override file automatically",
  );
});

// ---------- 11: CapabilityMap integration remains deferred ----------

test("docs say CapabilityMap integration remains deferred", async () => {
  const concept = await read("docs/concepts/capability-ontology.md");
  const collapsed = collapseWhitespace(concept).toLowerCase().replace(/`/g, "");
  assert.ok(
    collapsed.includes("capabilitymap integration remains deferred")
      || collapsed.includes("capabilitymap integration is deferred")
      || collapsed.includes("capabilitymap remains deferred"),
    "concept doc must pin that CapabilityMap integration remains deferred",
  );
});

// ---------- 12: CHANGELOG mentions canon packs v1 ----------

test("CHANGELOG mentions capability ontology canon packs v1", async () => {
  const changelog = await read("CHANGELOG.md");
  const collapsed = collapseWhitespace(changelog).toLowerCase();
  assert.ok(
    collapsed.includes("canon packs v1") || collapsed.includes("canon-packs-v1") || collapsed.includes("canon packs"),
    "CHANGELOG must mention capability ontology canon packs v1",
  );
});

// ---------- 13: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/capability-ontology-canon-packs-v1.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(packet.includes("canon"));
  assert.ok(packet.includes("override"));
});
