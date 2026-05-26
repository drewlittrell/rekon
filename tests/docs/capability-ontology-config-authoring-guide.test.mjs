// Docs test for the capability ontology config authoring
// guide + review-loop quickstart. Pins the operator-facing
// guidance so future edits cannot weaken the preview-only
// contract or imply that suggestions are applied
// automatically.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

async function read(relative) {
  return readFile(resolve(repoRoot, relative), "utf8");
}

const guidePath = "docs/beta/capability-ontology-config-authoring-guide.md";
const quickstartPath =
  "docs/beta/capability-ontology-review-loop-quickstart.md";

// ---------- 1: authoring guide exists ----------

test("authoring guide doc exists", async () => {
  const text = await read(guidePath);
  assert.ok(text.includes("# Capability Ontology Config Authoring Guide"));
});

// ---------- 2: quickstart exists ----------

test("review-loop quickstart doc exists", async () => {
  const text = await read(quickstartPath);
  assert.ok(text.includes("# Capability Ontology Review-Loop Quickstart"));
});

// ---------- 3: authoring guide headings ----------

test("authoring guide contains every required heading", async () => {
  const text = await read(guidePath);
  for (const heading of [
    "## Purpose",
    "## What The Ontology Config Is",
    "## Where The Config Lives",
    "## Config Shape",
    "## Canonical Verbs",
    "## Verb Aliases",
    "## Canonical Nouns",
    "## Noun Aliases",
    "## Categories And Thresholds",
    "## Manual Editing Workflow",
    "## Validation Loop",
    "## What Suggestions Mean",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ]) {
    assert.ok(text.includes(heading), `authoring guide missing heading ${heading}`);
  }
});

// ---------- 4: quickstart headings ----------

test("review-loop quickstart contains every required heading", async () => {
  const text = await read(quickstartPath);
  for (const heading of [
    "## Who This Is For",
    "## Prerequisites",
    "## Step 1: Normalize",
    "## Step 2: Review Suggestions",
    "## Step 3: Decide Unknown Terms",
    "## Step 4: Generate Ontology Suggestions",
    "## Step 5: Inspect Publications",
    "## Step 6: Manually Edit Ontology Config",
    "## Step 7: Rerun Normalize",
    "## Interpreting Results",
    "## What This Does Not Do",
    "## Next Steps",
  ]) {
    assert.ok(text.includes(heading), `quickstart missing heading ${heading}`);
  }
});

// ---------- 5: docs mention the config file ----------

test("docs mention .rekon/capability-ontology.json", async () => {
  const guide = await read(guidePath);
  const quickstart = await read(quickstartPath);
  assert.ok(guide.includes(".rekon/capability-ontology.json"));
  assert.ok(quickstart.includes(".rekon/capability-ontology.json"));
});

// ---------- 6: docs say file is optional ----------

test("docs say the config file is optional", async () => {
  const guide = await read(guidePath);
  const quickstart = await read(quickstartPath);
  const collapsedGuide = guide.replace(/\*\*/g, "").replace(/\s+/g, " ");
  const collapsedQuickstart = quickstart.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    collapsedGuide.includes("The file is optional"),
    "authoring guide must say the file is optional",
  );
  assert.ok(
    collapsedQuickstart.includes("The file is optional"),
    "quickstart must repeat that the file is optional",
  );
});

// ---------- 7: docs say Rekon never creates or mutates config automatically ----------

test("docs say Rekon never creates or mutates the config automatically", async () => {
  const guide = await read(guidePath);
  const quickstart = await read(quickstartPath);
  const collapsedGuide = guide.replace(/\*\*/g, "").replace(/\s+/g, " ");
  const collapsedQuickstart = quickstart.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    collapsedGuide.includes("Rekon never creates or mutates this file automatically"),
    "authoring guide must pin Rekon-never-creates-or-mutates verbatim",
  );
  assert.ok(
    collapsedQuickstart.includes("Rekon never creates or mutates this file automatically"),
    "quickstart must repeat the same pin",
  );
});

// ---------- 8: docs say JSON only in v1 ----------

test("docs say JSON only in v1, no YAML", async () => {
  const guide = await read(guidePath);
  const quickstart = await read(quickstartPath);
  const collapsedGuide = guide.replace(/\*\*/g, "").replace(/\s+/g, " ");
  const collapsedQuickstart = quickstart.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    collapsedGuide.includes("JSON only in v1. YAML is not supported."),
    "authoring guide must say JSON only in v1; YAML not supported",
  );
  assert.ok(
    collapsedQuickstart.includes("JSON only in v1. YAML is not supported."),
    "quickstart must repeat the JSON-only pin",
  );
});

// ---------- 9: docs include JSON example ----------

test("authoring guide includes the canonical config JSON example", async () => {
  const text = await read(guidePath);
  assert.ok(text.includes("```json"));
  assert.ok(text.includes(`"version": "0.1.0"`));
  assert.ok(text.includes(`"canonical": ["validate", "render"]`));
  assert.ok(text.includes(`"ensure": "validate"`));
  assert.ok(text.includes(`"canonical": ["schema", "view"]`));
  assert.ok(text.includes(`"screen": "view"`));
  assert.ok(text.includes(`"autoMap": 0.8`));
  assert.ok(text.includes(`"includeSystemVerbs": true`));
  assert.ok(text.includes(`"includeSystemNouns": true`));
});

// ---------- 10: extend-ontology definition ----------

test("docs explain extend-ontology", async () => {
  const guide = await read(guidePath);
  const quickstart = await read(quickstartPath);
  for (const text of [guide, quickstart]) {
    const collapsed = text.replace(/\*\*/g, "").replace(/\s+/g, " ");
    assert.ok(
      collapsed.includes("extend-ontology") && collapsed.includes("real vocabulary gap"),
      "docs must explain extend-ontology as a real vocabulary gap",
    );
  }
});

// ---------- 11: rename-symbol definition ----------

test("docs explain rename-symbol", async () => {
  const guide = await read(guidePath);
  const quickstart = await read(quickstartPath);
  for (const text of [guide, quickstart]) {
    const collapsed = text.replace(/\*\*/g, "").replace(/\s+/g, " ");
    assert.ok(
      collapsed.includes("rename-symbol")
      && (collapsed.includes("source repo naming should change")
        || collapsed.includes("repo naming should change")),
      "docs must explain rename-symbol as a source rename, not an ontology change",
    );
  }
});

// ---------- 12: noise-filter definition ----------

test("docs explain noise-filter", async () => {
  const guide = await read(guidePath);
  const quickstart = await read(quickstartPath);
  for (const text of [guide, quickstart]) {
    const collapsed = text.replace(/\*\*/g, "").replace(/\s+/g, " ");
    assert.ok(
      collapsed.includes("noise-filter")
      && collapsed.includes("not a capability signal"),
      "docs must explain noise-filter as non-capability",
    );
  }
});

// ---------- 13: defer definition ----------

test("docs explain defer", async () => {
  const guide = await read(guidePath);
  const quickstart = await read(quickstartPath);
  for (const text of [guide, quickstart]) {
    const collapsed = text.replace(/\*\*/g, "").replace(/\s+/g, " ");
    assert.ok(
      collapsed.includes("defer")
      && (collapsed.includes("needs more context")
        || collapsed.includes("operator needs more context")),
      "docs must explain defer as needing more context",
    );
  }
});

// ---------- 14: suggestion preview-only verbatim statement ----------

test("docs say CapabilityOntologySuggestionReport is preview-only and not applied vocabulary", async () => {
  const guide = await read(guidePath);
  const quickstart = await read(quickstartPath);
  const collapsedGuide = guide.replace(/\*\*/g, "").replace(/\s+/g, " ");
  const collapsedQuickstart = quickstart.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    collapsedGuide.includes(
      "`CapabilityOntologySuggestionReport` is preview-only and not applied vocabulary",
    ),
    "authoring guide must include the verbatim preview-only / not applied vocabulary statement",
  );
  assert.ok(
    collapsedQuickstart.includes(
      "`CapabilityOntologySuggestionReport` is preview-only and not applied vocabulary",
    ),
    "quickstart must include the verbatim preview-only / not applied vocabulary statement",
  );
});

// ---------- 15: CapabilityMap integration remains deferred ----------

test("docs say CapabilityMap integration remains deferred", async () => {
  const guide = await read(guidePath);
  const quickstart = await read(quickstartPath);
  for (const text of [guide, quickstart]) {
    const collapsed = text.replace(/\*\*/g, "").replace(/\s+/g, " ");
    assert.ok(
      collapsed.includes("`CapabilityMap` integration remains deferred")
      || collapsed.includes("CapabilityMap integration remains deferred"),
      "docs must say CapabilityMap integration remains deferred",
    );
  }
});

// ---------- 16: suggestions do not mutate config ----------

test("docs say suggestions do not mutate the ontology config", async () => {
  const guide = await read(guidePath);
  const collapsed = guide.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("Suggestions do not mutate `.rekon/capability-ontology.json`"),
    "authoring guide must pin no-config-mutation by suggestions",
  );
});

// ---------- 17: suggestions do not mutate CapabilityMap ----------

test("docs say suggestions do not mutate CapabilityMap", async () => {
  const guide = await read(guidePath);
  const collapsed = guide.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("Suggestions do not mutate `CapabilityMap`"),
    "authoring guide must pin no-CapabilityMap-mutation by suggestions",
  );
});

// ---------- 18: decision table ----------

test("docs include the decision table", async () => {
  const guide = await read(guidePath);
  const quickstart = await read(quickstartPath);
  for (const text of [guide, quickstart]) {
    assert.ok(text.includes("| Decision | Meaning | Typical Follow-Up |"));
    assert.ok(text.includes("extend-ontology"));
    assert.ok(text.includes("rename-symbol"));
    assert.ok(text.includes("noise-filter"));
    assert.ok(text.includes("defer"));
  }
});

// ---------- 19: config section table ----------

test("authoring guide includes the config section table", async () => {
  const text = await read(guidePath);
  assert.ok(text.includes("| Section | Purpose |"));
  assert.ok(text.includes("`verbs.canonical`"));
  assert.ok(text.includes("`verbs.aliases`"));
  assert.ok(text.includes("`nouns.canonical`"));
  assert.ok(text.includes("`nouns.aliases`"));
  assert.ok(text.includes("`nouns.thresholds.autoMap`"));
});

// ---------- 20: loop table ----------

test("docs include the loop table", async () => {
  const quickstart = await read(quickstartPath);
  assert.ok(quickstart.includes("| Step | Command / Action |"));
  assert.ok(quickstart.includes("normalize"));
  assert.ok(quickstart.includes("review"));
  assert.ok(quickstart.includes("decide"));
  assert.ok(quickstart.includes("suggest"));
  assert.ok(quickstart.includes("edit"));
  assert.ok(quickstart.includes("rerun"));
});

// ---------- 21: CHANGELOG mentions the authoring guide ----------

test("CHANGELOG mentions the capability ontology config authoring guide", async () => {
  const text = await read("CHANGELOG.md");
  const collapsed = text.replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("Capability ontology config authoring guide")
    || collapsed.includes("capability ontology config authoring guide"),
    "CHANGELOG must mention the authoring guide",
  );
});

// ---------- 22: review packet exists + contains PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const text = await read(
    ".rekon-dev/review-packets/capability-ontology-config-authoring-guide.md",
  );
  assert.ok(text.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(text.includes("MANUAL EDITING BOUNDARY"));
});
