// Docs test for the Capability Ontology Canon + Override
// Model Decision. Pins the canonical product posture so
// future edits cannot silently revert to "manual config
// authoring is the steady-state model" or skip the
// canon-pack commitment.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

async function read(relative) {
  return readFile(resolve(repoRoot, relative), "utf8");
}

const memoPath =
  "docs/strategy/capability-ontology-canon-override-model-decision.md";

// ---------- 1: decision memo exists ----------

test("canon + override decision memo exists", async () => {
  const text = await read(memoPath);
  assert.ok(
    text.includes("# Capability Ontology Canon + Override Model Decision"),
  );
});

// ---------- 2: manual config authoring rejected ----------

test("memo says manual config authoring is rejected", async () => {
  const text = await read(memoPath);
  const collapsed = text.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("Manual config authoring | Rejected")
    || collapsed.includes("Manual config authoring | rejected")
    || collapsed.includes("manual config authoring is rejected"),
    "memo must reject manual config authoring",
  );
});

// ---------- 3: Rekon should ship canonical ontology packs ----------

test("memo says Rekon will ship built-in canonical ontology packs", async () => {
  const text = await read(memoPath);
  const collapsed = text.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("Rekon will ship built-in canonical ontology packs")
    || collapsed.includes("Rekon ships a built-in canonical ontology baseline")
    || collapsed.includes("Rekon will ship a built-in canonical ontology baseline"),
    "memo must commit to shipping canonical ontology packs",
  );
});

// ---------- 4: overrides supersede or extend canon ----------

test("memo says repo-local overrides supersede or extend canon", async () => {
  const text = await read(memoPath);
  const collapsed = text.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("Repo-local overrides supersede or extend the canonical set")
    || collapsed.includes("repo-local overrides supersede or extend"),
    "memo must say repo-local overrides supersede or extend canon",
  );
});

// ---------- 5: recommended canon packs + overrides ----------

test("memo recommends canon packs + overrides", async () => {
  const text = await read(memoPath);
  const collapsed = text.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("Canon packs + repo overrides | Selected")
    || collapsed.includes("Canon packs + repo overrides | selected")
    || collapsed.includes("canon packs + repo overrides"),
    "memo must select canon packs + repo overrides",
  );
});

// ---------- 6: override file name ----------

test("memo names the override file `.rekon/capability-ontology.overrides.json`", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes(".rekon/capability-ontology.overrides.json"));
});

// ---------- 7: suggestions become override patch previews ----------

test("memo says suggestions should become override patch previews", async () => {
  const text = await read(memoPath);
  const collapsed = text.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("OverridePatchPreview")
    || collapsed.includes("propose patches to .rekon/capability-ontology.overrides.json")
    || collapsed.includes("propose patches to `.rekon/capability-ontology.overrides.json`")
    || collapsed.includes("suggestion report renders its preview.patch against"),
    "memo must say suggestions become override patch previews",
  );
});

// ---------- 8: auto-apply deferred ----------

test("memo says auto-apply is deferred", async () => {
  const text = await read(memoPath);
  const collapsed = text.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("Auto-apply suggestions into overrides | Deferred")
    || collapsed.includes("Auto-apply suggestions into overrides | deferred")
    || collapsed.includes("Apply remains deferred")
    || collapsed.includes("apply remains deferred"),
    "memo must defer auto-apply",
  );
});

// ---------- 9: LLM-generated ontology rejected ----------

test("memo says LLM-generated ontology is rejected", async () => {
  const text = await read(memoPath);
  const collapsed = text.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("LLM-generated ontology | Rejected")
    || collapsed.includes("LLM-generated ontology | rejected")
    || collapsed.includes("LLM-only normalization is not truth"),
    "memo must reject LLM-generated ontology",
  );
});

// ---------- 10: option table ----------

test("memo includes the option table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Option | Decision | Reason |"));
  assert.ok(text.includes("Manual config authoring"));
  assert.ok(text.includes("Canon packs + repo overrides"));
  assert.ok(text.includes("Auto-apply suggestions"));
  assert.ok(text.includes("LLM-generated ontology"));
});

// ---------- 11: canon pack table ----------

test("memo includes the canon pack table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Pack | Purpose |"));
  assert.ok(text.includes("`base`"));
  assert.ok(text.includes("`nextjs-app`"));
  assert.ok(text.includes("`backend-api`"));
  assert.ok(text.includes("`library-package`"));
  assert.ok(text.includes("`monorepo`"));
});

// ---------- 12: override table ----------

test("memo includes the override table", async () => {
  const text = await read(memoPath);
  assert.ok(text.includes("| Override Area | Behavior |"));
  assert.ok(text.includes("`extends`"));
  assert.ok(text.includes("canonical terms"));
  assert.ok(text.includes("aliases"));
  assert.ok(text.includes("noise"));
});

// ---------- 13: CHANGELOG mentions canon + override model decision ----------

test("CHANGELOG mentions the canon + override model decision", async () => {
  const text = await read("CHANGELOG.md");
  const collapsed = text.replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("Capability Ontology Canon + Override Model Decision")
    || collapsed.includes("capability ontology canon + override model decision"),
    "CHANGELOG must mention the canon + override model decision",
  );
});

// ---------- 14: review packet exists + PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const text = await read(
    ".rekon-dev/review-packets/capability-ontology-canon-override-model-decision.md",
  );
  assert.ok(text.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(text.includes("CANON PACK MODEL"));
  assert.ok(text.includes("OVERRIDE MODEL"));
});
