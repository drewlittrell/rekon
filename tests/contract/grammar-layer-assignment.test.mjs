// WO-11 behavioral tests: most-specific-match layer assignment - the
// overlap case (a file-scoped overlay layer beats a parent's broad glob),
// the tie-break ladder (segments, then pattern length, then declaration
// order), and the no-competition regression (single-pattern assignment
// unchanged from first-match).

import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const ontology = await import(join(repoRoot, "packages/capability-ontology/dist/grammar/index.js"));

const layer = (id, paths, extra = {}) => ({
  id,
  name: id,
  description: "",
  position: 0,
  paths,
  source: "layers.ontology.yaml#layers.route",
  ...extra,
});

function compile(layers) {
  return ontology.compileEffectiveGrammar({
    archetypes: [{
      id: "t",
      version: "1.0.0",
      kind: "overlay",
      tier: "archetype",
      description: "t",
      provenance: { migratedFrom: "test" },
      layers,
    }],
    ratifiedArchetypeIds: ["t"],
  });
}

test("overlap: a file-scoped pattern beats the parent layer's broad glob", () => {
  const grammar = compile([
    layer("infra", ["infra/**"]),
    layer("http-middleware", ["infra/http/withBatonContext.ts"]),
  ]);

  assert.equal(ontology.assignGrammarLayer(grammar, "infra/http/withBatonContext.ts"), "http-middleware");
  assert.equal(ontology.assignGrammarLayer(grammar, "infra/http/RequestContext.ts"), "infra");
  assert.equal(ontology.assignGrammarLayer(grammar, "infra/Errors.ts"), "infra");
});

test("overlay order is irrelevant: specificity wins even when the broad layer is declared last", () => {
  const grammar = compile([
    layer("http-middleware", ["infra/http/withBatonContext.ts"]),
    layer("infra", ["infra/**"]),
  ]);

  assert.equal(ontology.assignGrammarLayer(grammar, "infra/http/withBatonContext.ts"), "http-middleware");
});

test("tie on segments: the longer pattern wins", () => {
  const grammar = compile([
    layer("short", ["src/a/*"]),
    layer("long", ["src/a/file*"]),
  ]);

  // Both patterns have 3 segments and match; "src/a/file*" is longer.
  assert.equal(ontology.assignGrammarLayer(grammar, "src/a/file1.ts"), "long");
});

test("full tie: declaration order wins (first declared)", () => {
  const grammar = compile([
    layer("first", ["src/x/*.ts"]),
    layer("second", ["src/*/a.ts"]),
  ]);

  // Same segment count (3) and same length (11) - first declared wins.
  assert.equal(ontology.assignGrammarLayer(grammar, "src/x/a.ts"), "first");
});

test("no-competition regression: single-pattern assignment is unchanged", () => {
  const grammar = compile([
    layer("route", ["app/api/**"]),
    layer("service", ["services/**"]),
    layer("domain", ["domain/**"]),
  ]);

  assert.equal(ontology.assignGrammarLayer(grammar, "app/api/users/route.ts"), "route");
  assert.equal(ontology.assignGrammarLayer(grammar, "services/userService.ts"), "service");
  assert.equal(ontology.assignGrammarLayer(grammar, "domain/user.ts"), "domain");
  assert.equal(ontology.assignGrammarLayer(grammar, "elsewhere/x.ts"), undefined);
});

test("overrides-defined layers participate: the mentor ruling shape end-to-end", () => {
  const grammar = ontology.compileEffectiveGrammar({
    archetypes: [{
      id: "t",
      version: "1.0.0",
      kind: "overlay",
      tier: "archetype",
      description: "t",
      provenance: { migratedFrom: "test" },
      topology: {
        archetype: "t",
        description: "",
        requiredLayers: ["route", "infra"],
        layerEdges: [{ fromLayer: "route", toLayer: "infra", required: false, forbidden: true }],
        source: "topology-contract-inference.ts#test",
      },
      layers: [layer("route", ["app/api/**"]), layer("infra", ["infra/**"])],
    }],
    ratifiedArchetypeIds: ["t"],
    overrides: {
      layers: [layer("http-middleware", ["infra/http/withBatonContext.ts"])],
    },
  });

  // The override layer wins assignment for its file; the forbidden
  // route->infra edge no longer applies to route->http-middleware (no
  // topology edge references the new layer - legal by construction).
  assert.equal(ontology.assignGrammarLayer(grammar, "infra/http/withBatonContext.ts"), "http-middleware");
  assert.equal(ontology.assignGrammarLayer(grammar, "infra/other.ts"), "infra");
});
