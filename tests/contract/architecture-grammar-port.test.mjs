// Behavioral tests for the WO-4 architecture grammar port: shipped packs
// validate, the compiled effective grammar resolves cross-references, the
// porting manifest is complete against the checked-in classic-keys
// inventory, and representative entries round-trip classic's values
// faithfully (spot-check expectations captured from classic at port time).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const pkgRoot = join(repoRoot, "packages/capability-ontology");

const grammar = await import(join(pkgRoot, "dist/grammar/index.js"));
const manifest = JSON.parse(readFileSync(join(pkgRoot, "grammar-port-manifest.json"), "utf8"));
const inventory = JSON.parse(readFileSync(join(pkgRoot, "classic-ontology-keys.json"), "utf8"));

test("both shipped grammar packs validate against the schema", () => {
  for (const pack of grammar.BUILTIN_GRAMMAR_PACKS) {
    const parsed = grammar.validateGrammarPack(pack);
    assert.equal(parsed.id, pack.id);
  }

  assert.equal(grammar.grammarBasePack.kind, "base");
  assert.equal(grammar.grammarProjectOverlayExample.kind, "overlay");
});

test("every ported entry carries classic provenance", () => {
  for (const pack of grammar.BUILTIN_GRAMMAR_PACKS) {
    for (const section of ["layers", "verbCategories", "fileTypes", "forbiddenTypes", "patterns", "antiPatterns", "sequentialPatterns"]) {
      for (const entry of pack[section] ?? []) {
        assert.match(
          entry.source,
          /^[a-z0-9-]+\.ontology\.yaml#/,
          `${pack.id} ${section} "${entry.id}" must carry a classic source ref`,
        );
      }
    }
  }
});

test("compiled effective grammar resolves layer and verb-category cross-references", () => {
  // Post-WO-4.1 the school lives in archetype tier; ratify fullstack to
  // exercise the full cross-reference surface.
  const effective = grammar.compileEffectiveGrammar({
    ratifiedArchetypeIds: ["grammar-archetype-fullstack-layered"],
  });

  assert.equal(grammar.resolveGrammarReferences(effective).length, 0);
  assert.equal(effective.layers.size, 6);
  assert.equal(effective.verbCategories.size, 16);
  assert.equal(effective.source.basePackId, "grammar-base");
  assert.deepEqual(effective.source.overlayPackIds, []);

  for (const category of effective.verbCategories.values()) {
    assert.ok(
      ["read", "write", "create", "delete", "transform", "validate", "navigate", "communicate", "system"].includes(
        category.vocabularyCategory,
      ),
      `grammar category "${category.id}" must bridge to a vocabulary category`,
    );
  }
});

test("the overlay example is opt-in: never applied without being passed", () => {
  const withoutOverlay = grammar.compileEffectiveGrammar();

  assert.equal(withoutOverlay.patterns.has("declarative_gate"), false);
  assert.equal(withoutOverlay.antiPatterns.has("manualDDEInstantiation"), false);

  const withOverlay = grammar.compileEffectiveGrammar({
    overlays: [grammar.grammarProjectOverlayExample],
  });

  assert.equal(withOverlay.patterns.has("declarative_gate"), true);
  assert.equal(withOverlay.antiPatterns.has("dbWriteDuringStream"), true);
  assert.equal(withOverlay.sequentialPatterns.has("structuredPayload"), true);
});

test("operator overrides extend canon and supersede on collision, recorded in notes", () => {
  const effective = grammar.compileEffectiveGrammar({
    // Ratify the archetype that carries `orchestration` so the override
    // collides with existing canon (post-WO-4.1 the default compile is
    // minimal base only).
    ratifiedArchetypeIds: ["grammar-archetype-fullstack-layered"],
    overrides: {
      patterns: [
        {
          id: "orchestration",
          name: "Orchestration (repo override)",
          definition: "repo-specific refinement",
          structuralSignals: [],
          details: {},
          source: "patterns.ontology.yaml#patterns.orchestration",
        },
      ],
    },
    overridesPath: grammar.ARCHITECTURE_GRAMMAR_OVERRIDES_PATH,
  });

  assert.equal(effective.patterns.get("orchestration").name, "Orchestration (repo override)");
  assert.ok(
    effective.notes.some(
      (note) => note.section === "patterns" && note.id === "orchestration" && note.action === "superseded",
    ),
  );

  assert.throws(
    () => grammar.compileEffectiveGrammar({ overrides: { patterns: [{ id: "" }] } }),
    /architecture-grammar|invalid|Required|expected/i,
    "invalid override shapes must fail loudly",
  );
});

test("manifest is complete against the checked-in classic-keys inventory", () => {
  const rows = new Set(manifest.rows.map((row) => row.classicSource));

  for (const [file, record] of Object.entries(inventory)) {
    for (const key of record.topLevelKeys) {
      const collectionPaths = Object.keys(record.collections ?? {});
      const isCollectionRoot = collectionPaths.some((path) => path === key || path.startsWith(`${key}.`));

      if (!isCollectionRoot) {
        assert.ok(rows.has(`${file}#${key}`), `manifest missing row for ${file}#${key}`);
      }
    }

    for (const [path, ids] of Object.entries(record.collections ?? {})) {
      for (const id of ids) {
        assert.ok(rows.has(`${file}#${path}.${id}`), `manifest missing row for ${file}#${path}.${id}`);
      }
    }
  }
});

test("every non-default disposition carries a citation (archetype rows cite the amendment)", () => {
  for (const row of manifest.rows) {
    if (["overlay-example", "rejected", "deferred"].includes(row.disposition)) {
      assert.ok(row.citation, `${row.classicSource} (${row.disposition}) must carry a citation`);
    }

    if (row.disposition === "archetype") {
      assert.ok(
        row.citation || row.reDisposition,
        `${row.classicSource} (archetype) must cite the WO-4.1 amendment`,
      );
    }

    if (row.disposition === "default-canon" && row.tier === "base") {
      assert.ok(row.baseArgument, `${row.classicSource} kept base tier without a written argument`);
    }
  }
});

test("round-trip fidelity: hub thresholds match classic's values", () => {
  const hub = grammar.grammarBasePack.hubClassification;

  assert.equal(hub.definiteHubPercentile, 95);
  assert.equal(hub.probableHubPercentile, 80);
  assert.equal(hub.probableHubRatio, 1);
  assert.equal(hub.minDefiniteHubFanIn, 3);
  assert.equal(hub.source, "file-types.ontology.yaml#hubClassification");
});

test("round-trip fidelity: route layer carries classic's position and allowed types", () => {
  const route = grammar.grammarArchetypeFullstackLayered.layers.find((layer) => layer.id === "route");

  assert.equal(route.position, 0);
  assert.ok(route.allowedTypes.includes("Handler"));
  assert.ok(route.allowedTypes.includes("Schema"));
  assert.ok(route.paths.includes("**/api/**"));
});

test("round-trip fidelity: consoleLogging anti-pattern keeps its correction pair", () => {
  const anti = grammar.grammarBasePack.antiPatterns.find((entry) => entry.id === "consoleLogging");

  assert.equal(anti.category, "observability");
  assert.equal(anti.dont, "console.log(debug)");
  assert.equal(anti.do, "Use telemetry system");
  assert.match(anti.reason, /telemetry/i);
});

test("round-trip fidelity: routeHandler sequential pattern keeps its mandatory first step", () => {
  const seq = grammar.grammarArchetypeFullstackLayered.sequentialPatterns.find((entry) => entry.id === "routeHandler");

  assert.equal(seq.steps[0].step, 1);
  assert.equal(seq.steps[0].name, "Validate");
  assert.equal(seq.steps[0].verbCategory, "validation");
  assert.equal(seq.steps[0].mustHappen, true);
});

test("round-trip fidelity: orchestration pattern keeps its structural signals", () => {
  const pattern = grammar.grammarArchetypeFullstackLayered.patterns.find((entry) => entry.id === "orchestration");

  assert.equal(pattern.category, "coordination");
  assert.ok(pattern.structuralSignals.some((signal) => /Multi-component coordination/.test(signal)));
});

test("the split matches the ratified assignments", () => {
  const overlayPatternIds = grammar.grammarProjectOverlayExample.patterns.map((entry) => entry.id).sort();
  const overlayAntiIds = grammar.grammarProjectOverlayExample.antiPatterns.map((entry) => entry.id).sort();

  assert.deepEqual(overlayPatternIds, ["declarative_gate", "idempotent_turn", "rule_versioning", "streaming_invariant"]);
  assert.deepEqual(overlayAntiIds, ["coreImportsModule", "dbWriteDuringStream", "directDerivedAccess", "manualDDEInstantiation"]);
  assert.ok(grammar.grammarArchetypeFullstackLayered.patterns.every((entry) => !overlayPatternIds.includes(entry.id)));
});
