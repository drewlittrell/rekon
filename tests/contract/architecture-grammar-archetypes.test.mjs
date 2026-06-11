// WO-4.1 behavioral tests: the three-tier model, the activation rule
// (unratified archetypes never back findings; ratification flips them on),
// topology fidelity to classic's templates, the dual completeness
// inventories, and the advisory evaluator.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const pkgRoot = join(repoRoot, "packages/capability-ontology");

const grammar = await import(join(pkgRoot, "dist/grammar/index.js"));
const manifest = JSON.parse(readFileSync(join(pkgRoot, "grammar-port-manifest.json"), "utf8"));
const topologyKeys = JSON.parse(readFileSync(join(pkgRoot, "classic-topology-keys.json"), "utf8"));

test("the three tiers resolve: base, five archetypes, overlay", () => {
  assert.equal(grammar.resolveGrammarPackTier(grammar.grammarBasePack), "base");
  assert.equal(grammar.resolveGrammarPackTier(grammar.grammarProjectOverlayExample), "overlay");
  // Four ported packs (WO-4.1) + package-platform, the first net-new pack
  // (WO-18 operator ruling).
  assert.equal(grammar.BUILTIN_GRAMMAR_ARCHETYPE_PACKS.length, 5);

  for (const pack of grammar.BUILTIN_GRAMMAR_ARCHETYPE_PACKS) {
    assert.equal(grammar.resolveGrammarPackTier(pack), "archetype");
    assert.ok(pack.topology, `${pack.id} must carry topology law`);
  }
});

test("base tier shrank to argued content only", () => {
  assert.equal(grammar.grammarBasePack.layers.length, 0);
  assert.equal(grammar.grammarBasePack.verbCategories.length, 0);
  assert.equal(grammar.grammarBasePack.patterns.length, 0);
  assert.equal(grammar.grammarBasePack.sequentialPatterns.length, 0);
  assert.deepEqual(
    grammar.grammarBasePack.antiPatterns.map((entry) => entry.id).sort(),
    ["ambiguousSuffix", "consoleLogging", "deleteFeatureDuringRefactor"],
  );
  assert.equal(grammar.grammarBasePack.forbiddenTypes.length, 7);
  assert.ok(grammar.grammarBasePack.hubClassification);
  assert.equal(grammar.grammarBasePack.naming, undefined);
});

test("topology fidelity: classic's fullstack template ported verbatim", () => {
  const topology = grammar.grammarArchetypeFullstackLayered.topology;

  assert.deepEqual(topology.requiredLayers, ["ui", "route", "service", "domain", "infra"]);
  assert.equal(topology.layerEdges.length, 8);
  assert.ok(
    topology.layerEdges.some(
      (edge) => edge.fromLayer === "route" && edge.toLayer === "infra" && edge.forbidden === true,
    ),
  );
  assert.ok(
    topology.layerEdges.some(
      (edge) => edge.fromLayer === "route" && edge.toLayer === "service" && edge.required === true,
    ),
  );
  assert.equal(topology.source, "topology-contract-inference.ts#fullstack_layered");
});

test("unratified archetypes never enter the effective grammar (no findings possible)", () => {
  const effective = grammar.compileEffectiveGrammar();

  assert.equal(effective.layers.size, 0, "school layers must not compile in without ratification");
  assert.equal(effective.patterns.has("orchestration"), false);
  assert.equal(effective.activation.unratifiedArchetypeIds.length, 5);
  assert.deepEqual(effective.activation.ratifiedArchetypeIds, []);
  assert.deepEqual(effective.findingsEligiblePackIds, ["grammar-base"]);
});

test("ratification in repo config flips the same evaluation on", () => {
  const effective = grammar.compileEffectiveGrammar({
    overrides: { archetypes: ["grammar-archetype-service-layered"] },
    overridesPath: grammar.ARCHITECTURE_GRAMMAR_OVERRIDES_PATH,
  });

  assert.deepEqual(effective.activation.ratifiedArchetypeIds, ["grammar-archetype-service-layered"]);
  assert.equal(effective.layers.size, 5);
  assert.equal(effective.patterns.has("orchestration"), true);
  assert.ok(effective.findingsEligiblePackIds.includes("grammar-archetype-service-layered"));
  assert.ok(!effective.findingsEligiblePackIds.includes("grammar-archetype-fullstack-layered"));
  assert.ok(effective.topologies.has("grammar-archetype-service-layered"));
});

test("advisory mode loads unratified content but keeps it findings-ineligible", () => {
  const effective = grammar.compileEffectiveGrammar({
    advisory: true,
  });

  assert.equal(effective.activation.advisory, true);
  assert.ok(effective.layers.size > 0, "advisory compile includes archetype content");
  assert.deepEqual(effective.findingsEligiblePackIds, ["grammar-base"]);
});

test("declared grammar wins: operator overrides apply after ratified archetypes", () => {
  const effective = grammar.compileEffectiveGrammar({
    ratifiedArchetypeIds: ["grammar-archetype-fullstack-layered"],
    overrides: {
      patterns: [
        {
          id: "orchestration",
          name: "Orchestration (declared)",
          definition: "operator-declared refinement",
          source: "patterns.ontology.yaml#patterns.orchestration",
        },
      ],
    },
  });

  assert.equal(effective.patterns.get("orchestration").name, "Orchestration (declared)");
});

test("manifest reconciles: the 116 default-canon rows are all re-dispositioned", () => {
  const archetypeRows = manifest.rows.filter(
    (row) => row.disposition === "archetype" && !row.classicSource.startsWith("topology-contract-inference"),
  );
  const baseRows = manifest.rows.filter((row) => row.disposition === "default-canon");

  assert.equal(archetypeRows.length + baseRows.length, 116);
  assert.equal(baseRows.length, 11);

  for (const row of baseRows) {
    assert.ok(row.baseArgument, `${row.classicSource} stayed base without an argument`);
    assert.equal(row.reDisposition, "docs/strategy/architecture-grammar-archetype-amendment.md");
  }

  for (const row of archetypeRows) {
    assert.ok(Array.isArray(row.archetypes) && row.archetypes.length > 0, `${row.classicSource} names no archetypes`);
  }
});

test("topology completeness: every classic template key has a manifest row", () => {
  const rows = new Set(manifest.rows.map((row) => row.classicSource));

  for (const [template, fields] of Object.entries(topologyKeys.templates)) {
    for (const field of fields) {
      assert.ok(
        rows.has(`topology-contract-inference.ts#${template}.${field}`),
        `manifest missing topology row for ${template}.${field}`,
      );
    }
  }
});

test("advisory evaluator flags forbidden edges and forbidden suffixes, advisories only", () => {
  const customArchetype = {
    id: "grammar-archetype-test",
    version: "1.0.0",
    kind: "overlay",
    tier: "archetype",
    description: "test archetype",
    provenance: { migratedFrom: "test" },
    topology: {
      archetype: "test",
      description: "alpha/beta",
      requiredLayers: ["alpha", "beta"],
      layerEdges: [{ fromLayer: "alpha", toLayer: "beta", required: false, forbidden: true }],
      source: "topology-contract-inference.ts#test",
    },
    layers: [
      { id: "alpha", name: "Alpha", description: "", position: 0, paths: ["alpha/**"], source: "layers.ontology.yaml#layers.route" },
      { id: "beta", name: "Beta", description: "", position: 1, paths: ["beta/**"], cannotImport: ["alpha"], source: "layers.ontology.yaml#layers.infra" },
    ],
  };

  const effective = grammar.compileEffectiveGrammar({
    archetypes: [customArchetype],
    ratifiedArchetypeIds: ["grammar-archetype-test"],
  });

  const advisories = grammar.evaluateGrammarAdvisory(effective, {
    files: ["alpha/one.ts", "beta/two.ts", "src/DataManager.ts"],
    imports: [
      { from: "alpha/one.ts", to: "beta/two.ts" },
      { from: "beta/two.ts", to: "alpha/one.ts" },
    ],
  });

  assert.ok(advisories.some((entry) => entry.rule === "forbidden-layer-edge" && entry.file === "alpha/one.ts"));
  assert.ok(advisories.some((entry) => entry.rule === "layer-cannot-import" && entry.file === "beta/two.ts"));
  assert.ok(advisories.some((entry) => entry.rule === "forbidden-type-suffix" && entry.file === "src/DataManager.ts"));
});
