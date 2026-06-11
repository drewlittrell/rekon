// WO-18 behavioral tests: the package-platform archetype (the first
// net-new pack), the package-boundary axis (deep-import fires,
// package-name import silent, unratified silent), the generated-layer
// exemption from naming and placement law, and the deprecated-location
// overlay compile.

import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const policy = await import(join(repoRoot, "packages/capability-policy/dist/index.js"));
const ontology = await import(join(repoRoot, "packages/capability-ontology/dist/grammar/index.js"));

const PP = "grammar-archetype-package-platform";
const file = (path) => ({ kind: "file", subject: path, value: {} });
const spec = (source, target, resolvedTarget, name = "x") => ({
  kind: "import_specifier",
  subject: `${source}:${resolvedTarget}:${name}`,
  value: { source, target, name, local: name, specifierKind: "named", resolvedTarget },
});
const WORKSPACES = [
  { name: "@x/kernel-core", dir: "packages/kernel-core" },
  { name: "@x/capability-a", dir: "packages/capability-a" },
];

test("the fifth pack validates and compiles with the existing four", () => {
  const pack = ontology.BUILTIN_GRAMMAR_ARCHETYPE_PACKS.find((p) => p.id === PP);

  assert.ok(pack, "package-platform joins the registry");
  assert.equal(pack.provenance.migratedFrom, "operator");
  assert.equal(ontology.BUILTIN_GRAMMAR_ARCHETYPE_PACKS.length, 5);

  const all = ontology.compileEffectiveGrammar({
    ratifiedArchetypeIds: ontology.BUILTIN_GRAMMAR_ARCHETYPE_PACKS.map((p) => p.id),
  });

  // Topologies key on pack id (the WO-15 compile convention).
  assert.ok(all.topologies.get(PP), "topology compiles");
  assert.deepEqual(all.topologies.get(PP).requiredLayers, ["kernel", "surface"]);

  // Jurisdiction: unratified -> none of the pack's law is eligible.
  const bare = ontology.compileEffectiveGrammar({});

  assert.ok(!bare.findingsEligiblePackIds.includes(PP));
});

test("package-boundary axis: deep import fires, package-name import silent, same-package silent", () => {
  const grammar = ontology.compileEffectiveGrammar({ ratifiedArchetypeIds: [PP] });
  const findings = policy.evaluateGrammarDivergence({
    facts: [
      // Deep import across packages: fires.
      spec("packages/capability-a/src/index.ts", "../../kernel-core/src/internal.js", "packages/kernel-core/src/internal.ts"),
      // Through the public surface (bare name + subpath): silent.
      spec("packages/capability-a/src/other.ts", "@x/kernel-core", "packages/kernel-core/src/index.ts"),
      spec("packages/capability-a/src/sub.ts", "@x/kernel-core/grammar", "packages/kernel-core/src/grammar/index.ts"),
      // Within the same package: silent.
      spec("packages/kernel-core/src/a.ts", "./b.js", "packages/kernel-core/src/b.ts"),
    ],
    grammar,
    workspacePackages: WORKSPACES,
  });
  const boundary = findings.filter((f) => f.payload.law.axis === "package_boundary");

  assert.equal(boundary.length, 1);
  assert.equal(boundary[0].files[0], "packages/capability-a/src/index.ts");
  assert.equal(boundary[0].payload.law.declaration, "operator:wo-18#package-boundary");
  assert.match(boundary[0].description, /public surface/);
});

test("package-boundary jurisdiction: unratified repo stays silent on the same facts", () => {
  const grammar = ontology.compileEffectiveGrammar({});
  const findings = policy.evaluateGrammarDivergence({
    facts: [spec("packages/capability-a/src/index.ts", "../../kernel-core/src/internal.js", "packages/kernel-core/src/internal.ts")],
    grammar,
    workspacePackages: WORKSPACES,
  });

  assert.deepEqual(findings.filter((f) => f.payload.law.axis === "package_boundary"), []);
});

test("generated layer: exempt from naming and placement law; config stays in scope", () => {
  const grammar = ontology.compileEffectiveGrammar({
    ratifiedArchetypeIds: [PP],
    overrides: {
      fileTypes: [{ id: "Service", name: "Service", description: "", source: "operator:wo-18#test" }],
      forbiddenTypes: [{ id: "Manager", name: "Manager", reason: "test", source: "operator:wo-18#test" }],
    },
  });

  // Naming: the generated file never fires; the equivalent source file does.
  const naming = policy.evaluateNamingContract({
    facts: [file("generated/api/PaymentsClient.ts"), file("core/payments/PaymentsClient.ts")],
    grammar,
  });

  assert.deepEqual(naming.map((f) => f.files[0]), ["core/payments/PaymentsClient.ts"]);

  // Placement: the forbidden suffix is skipped inside generated/.
  const placement = policy.evaluateGrammarDivergence({
    facts: [file("generated/api/SyncManager.ts"), file("core/payments/SyncManager.ts")],
    grammar,
  }).filter((f) => f.payload.law.axis === "placement");

  assert.deepEqual(placement.map((f) => f.files[0]), ["core/payments/SyncManager.ts"]);
});

test("deprecated-location overlay: product-pack/** assigns product via the supersede, notes recorded", () => {
  const grammar = ontology.compileEffectiveGrammar({
    ratifiedArchetypeIds: [PP],
    overrides: {
      layers: [{
        id: "product",
        name: "Product",
        description: "Deprecated location: canonical is product-packs/.",
        position: 3,
        paths: ["product-packs/**", "product-pack/**"],
        source: "operator:wo-18#product-pack-deprecated",
      }],
    },
  });

  assert.equal(ontology.assignGrammarLayer(grammar, "product-pack/bxrx/engine.ts"), "product");
  assert.equal(ontology.assignGrammarLayer(grammar, "product-packs/newer/x.ts"), "product");
  assert.equal(grammar.layers.get("product").source, "operator:wo-18#product-pack-deprecated");
});

test("forbidden topology: a kernel file importing a surface file fires layer_import", () => {
  const grammar = ontology.compileEffectiveGrammar({ ratifiedArchetypeIds: [PP] });
  const findings = policy.evaluateGrammarDivergence({
    facts: [
      file("kernel/store.ts"),
      file("web/server/dev.ts"),
      spec("kernel/store.ts", "../web/server/dev.js", "web/server/dev.ts"),
    ],
    grammar,
  }).filter((f) => f.payload.law.axis === "layer_import");

  assert.equal(findings.length, 1);
  assert.equal(findings[0].payload.law.packId, PP);
  assert.match(findings[0].payload.law.declaration, /operator:wo-18#package-platform/);
});
