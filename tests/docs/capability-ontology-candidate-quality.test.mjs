// Docs tests for capability ontology candidate-quality
// improvements v1.

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

const memoPath = "docs/strategy/capability-ontology-candidate-quality-v1.md";

// ---------- 1: docs mention candidate-quality improvements v1 ----------

test("docs mention candidate-quality improvements v1", async () => {
  const text = await read(memoPath);
  assert.ok(text.length > 1000, "memo must be substantial");
  assert.ok(
    text.includes("Capability Ontology Candidate-Quality Improvements v1")
      || text.includes("candidate-quality improvements v1"),
  );
});

// ---------- 2: docs mention canon-pack expansion ----------

test("docs mention canon-pack expansion / coverage", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("canon-pack") || text.includes("canon pack"),
    "memo must discuss the canon pack",
  );
});

// ---------- 3: docs mention lexical splitter sharpening ----------

test("docs mention lexical splitter sharpening", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("lexical splitter sharpening"),
    "memo must mention lexical splitter sharpening",
  );
});

// ---------- 4: docs say stable phrase threshold is unchanged ----------

test("docs say stable phrase threshold remains unchanged", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("stable phrase threshold remains unchanged")
      || text.includes("stable threshold remains unchanged")
      || text.includes("stable phrase threshold is unchanged"),
  );
});

// ---------- 5: docs say noun-only candidates do not become phrases ----------

test("docs say noun-only candidates do not become phrases", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("noun-only candidates do not become phrases"),
    "memo must pin noun-only candidates do not become phrases",
  );
});

// ---------- 6: docs say path-shaped candidates are ignored/noise-classified ----------

test("docs say path-shaped candidates are ignored", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("path-shaped") && text.includes("ignored"),
    "memo must mention path-shaped candidates being ignored",
  );
});

// ---------- 7: docs say CapabilityMap integration remains deferred ----------

test("docs say CapabilityMap integration remains deferred", async () => {
  const text = plainText(await read(memoPath));
  assert.ok(
    text.includes("capabilitymap integration remains deferred"),
    "memo must pin CapabilityMap deferral",
  );
});

// ---------- 8: CHANGELOG mentions candidate-quality improvements v1 ----------

test("CHANGELOG mentions candidate-quality improvements v1", async () => {
  const changelog = plainText(await read("CHANGELOG.md"));
  assert.ok(
    changelog.includes("candidate-quality improvements v1"),
    "CHANGELOG must mention candidate-quality improvements v1",
  );
});

// ---------- 9: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const packet = await read(
    ".rekon-dev/review-packets/capability-ontology-candidate-quality-v1.md",
  );
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(packet.includes("candidate-quality") || packet.includes("Candidate-Quality"));
});
