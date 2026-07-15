// WO-9 behavioral tests: jurisdiction is absolute, every finding carries
// its law, the FP gauntlet shapes (classic's named suppression reasons)
// stay silent by design, non-production scope is excluded (classic
// isNonProductionPath parity), and each divergence axis fires on its
// declared-and-violated case.

import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const policy = await import(join(repoRoot, "packages/capability-policy/dist/index.js"));
const ontology = await import(join(repoRoot, "packages/capability-ontology/dist/index.js"));

// A minimal layered archetype used for declared law in these tests.
const TEST_ARCHETYPE = {
  id: "grammar-archetype-test-layered",
  version: "1.0.0",
  kind: "overlay",
  tier: "archetype",
  description: "test layered school",
  provenance: { migratedFrom: "test" },
  topology: {
    archetype: "test_layered",
    description: "route -> service -> domain",
    requiredLayers: ["route", "service", "domain", "infra"],
    layerEdges: [
      { fromLayer: "route", toLayer: "service", required: true, forbidden: false },
      { fromLayer: "service", toLayer: "domain", required: true, forbidden: false },
      { fromLayer: "route", toLayer: "domain", required: false, forbidden: true },
      { fromLayer: "domain", toLayer: "service", required: false, forbidden: true },
      { fromLayer: "service", toLayer: "infra", required: true, forbidden: false },
      { fromLayer: "route", toLayer: "infra", required: false, forbidden: true },
    ],
    source: "topology-contract-inference.ts#test",
  },
  layers: [
    { id: "route", name: "Route", description: "", position: 0, paths: ["app/api/**"], source: "layers.ontology.yaml#layers.route" },
    { id: "service", name: "Service", description: "", position: 1, paths: ["services/**"], source: "layers.ontology.yaml#layers.service" },
    { id: "domain", name: "Domain", description: "", position: 2, paths: ["domain/**"], cannotImport: ["service"], source: "layers.ontology.yaml#layers.domain" },
    { id: "infra", name: "Infra", description: "", position: 3, paths: ["infra/**"], source: "layers.ontology.yaml#layers.infra" },
  ],
};

const file = (path) => ({ kind: "file", subject: path, value: { path } });
const edge = (source, resolvedTarget, extra = {}) => ({
  kind: "import_specifier",
  subject: `${source}:${resolvedTarget}:x`,
  value: { source, target: resolvedTarget, name: "x", local: "x", specifierKind: "named", resolvedTarget, ...extra },
});
const call = (source, targetFile, targetSymbol) => ({
  kind: "call",
  subject: `${source}:${targetFile}:${targetSymbol}`,
  value: { source, targetFile, targetSymbol, callKind: "call", resolution: "import-binding" },
});

function grammarWith(ratified) {
  return ontology.compileEffectiveGrammar({
    archetypes: [TEST_ARCHETYPE],
    ratifiedArchetypeIds: ratified ? [TEST_ARCHETYPE.id] : [],
  });
}

const BASE_FACTS = [
  file("app/api/users/route.ts"),
  file("services/userService.ts"),
  file("domain/user.ts"),
  edge("app/api/users/route.ts", "services/userService.ts"),
  edge("services/userService.ts", "domain/user.ts"),
];

test("jurisdiction is absolute: a would-be violation emits nothing without ratification", () => {
  const facts = [...BASE_FACTS, edge("app/api/users/route.ts", "domain/user.ts")];
  const findings = policy.evaluateGrammarDivergence({ facts, grammar: grammarWith(false) });

  assert.deepEqual(findings, []);
});

test("ratification flips the same evaluation on, and the finding carries its law", () => {
  const facts = [...BASE_FACTS, edge("app/api/users/route.ts", "domain/user.ts")];
  const findings = policy.evaluateGrammarDivergence({ facts, grammar: grammarWith(true) });

  assert.equal(findings.length, 1);
  const [found] = findings;

  assert.equal(found.ruleId, "grammar.divergence");
  // route->domain is forbidden AND has the declared canonical path
  // route->service->domain: this is a bypass, classic's canonical family.
  assert.equal(found.payload.law.axis, "canonical_bypass");
  assert.equal(found.payload.law.packId, TEST_ARCHETYPE.id);
  assert.equal(found.payload.law.tier, "archetype");
  assert.match(found.payload.law.declaration, /topology-contract-inference\.ts#test/);
  assert.deepEqual(found.files, ["app/api/users/route.ts"]);
});

test("layer_import (no canonical alternative) classifies as plain layer law", () => {
  // domain -> service is forbidden with no declared 2-step path back.
  const facts = [...BASE_FACTS, edge("domain/user.ts", "services/userService.ts")];
  const findings = policy.evaluateGrammarDivergence({ facts, grammar: grammarWith(true) });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].payload.law.axis, "layer_import");
});

test("canonical_gap fires only where declared and unsatisfied, never undeclared", () => {
  // Both layers populated, required edge route->service NOT observed.
  const facts = [
    file("app/api/users/route.ts"),
    file("services/userService.ts"),
    file("domain/user.ts"),
    edge("services/userService.ts", "domain/user.ts"),
  ];
  const findings = policy.evaluateGrammarDivergence({ facts, grammar: grammarWith(true) });
  const gaps = findings.filter((f) => f.payload.law.axis === "canonical_gap");

  assert.equal(gaps.length, 1);
  assert.deepEqual(gaps[0].subjects, ["route->service"]);

  // No declaration, no finding: unratified -> zero gaps.
  assert.deepEqual(policy.evaluateGrammarDivergence({ facts, grammar: grammarWith(false) }), []);

  // An empty layer never gaps (nothing to connect).
  const noRouteFiles = facts.filter((f) => !f.subject.startsWith("app/"));
  const quiet = policy.evaluateGrammarDivergence({ facts: noRouteFiles, grammar: grammarWith(true) });
  assert.equal(quiet.filter((f) => f.payload.law.axis === "canonical_gap").length, 0);
});

// ---- FP gauntlet: classic's named suppression shapes stay silent ---------

test("gauntlet type_only_file: type-only imports never fire (erased at build)", () => {
  const facts = [...BASE_FACTS, edge("app/api/users/route.ts", "domain/user.ts", { typeOnly: true })];
  const findings = policy.evaluateGrammarDivergence({ facts, grammar: grammarWith(true) });

  assert.deepEqual(findings, []);
});

test("gauntlet route_handler_with_service: the allowed canonical edge is silent", () => {
  const findings = policy.evaluateGrammarDivergence({ facts: BASE_FACTS, grammar: grammarWith(true) });

  assert.deepEqual(findings, []);
});

test("gauntlet factory_file_creates_deps: fan-out inside allowed edges is silent", () => {
  const facts = [
    ...BASE_FACTS,
    file("services/factory.ts"),
    edge("services/factory.ts", "domain/user.ts"),
    edge("services/factory.ts", "services/userService.ts"),
  ];
  const findings = policy.evaluateGrammarDivergence({ facts, grammar: grammarWith(true) });

  assert.deepEqual(findings, []);
});

test("gauntlet empty_constructor_stub: file shape alone never fires", () => {
  // A stub file with no imports at all - the detector only ever fires on
  // declared-vs-observed divergence, never on file shape.
  const facts = [...BASE_FACTS, file("services/stub.ts")];
  const findings = policy.evaluateGrammarDivergence({ facts, grammar: grammarWith(true) });

  assert.deepEqual(findings, []);
});

test("composition seams do not count as route-to-infra bypasses", () => {
  const route = "app/api/users/route.ts";
  const builder = "app/api/users/buildProviders.ts";
  const facts = [
    ...BASE_FACTS,
    file("infra/http/withRequestContext.ts"),
    edge(route, "infra/http/withRequestContext.ts", { name: "withRequestContext" }),
    call(route, "infra/http/withRequestContext.ts", "withRequestContext"),
    file("infra/assemblies/main.ts"),
    edge(route, "infra/assemblies/main.ts", { name: "getUserService" }),
    call(route, "infra/assemblies/main.ts", "getUserService"),
    file(builder),
    { kind: "symbol", subject: builder, value: { name: "buildProviders", exported: true } },
    file("infra/capabilities/buildBindings.ts"),
    edge(builder, "infra/capabilities/buildBindings.ts", { name: "buildBindings" }),
    call(builder, "infra/capabilities/buildBindings.ts", "buildBindings"),
  ];

  const bypasses = policy.evaluateGrammarDivergence({ facts, grammar: grammarWith(true) })
    .filter((finding) => finding.payload.law.axis === "canonical_bypass");

  assert.deepEqual(bypasses, []);
});

test("direct repository construction remains a route-to-infra bypass", () => {
  const source = "app/api/users/auth.ts";
  const target = "infra/repositories/UserRepository.ts";
  const facts = [
    ...BASE_FACTS,
    file(source),
    file(target),
    edge(source, target, { name: "UserRepository" }),
    { ...call(source, target, "UserRepository"), value: { ...call(source, target, "UserRepository").value, callKind: "construct" } },
  ];

  const bypasses = policy.evaluateGrammarDivergence({ facts, grammar: grammarWith(true) })
    .filter((finding) => finding.payload.law.axis === "canonical_bypass");

  assert.equal(bypasses.length, 1);
  assert.deepEqual(bypasses[0].files, [source]);
});

test("non-production scope: the same violation in a test tree is excluded (classic parity)", () => {
  const facts = [
    ...BASE_FACTS,
    file("app/api/users/__tests__/route.test.ts"),
    edge("app/api/users/__tests__/route.test.ts", "domain/user.ts"),
  ];
  const findings = policy.evaluateGrammarDivergence({ facts, grammar: grammarWith(true) });

  assert.deepEqual(findings, []);

  for (const nonProd of [
    "src/__tests__/x.ts",
    "src/a.test.ts",
    "src/a.spec.ts",
    "src/__mocks__/m.ts",
    "src/mockUser.ts",
    "src/generated/g.ts",
    "types/x.d.ts",
    "tools/t.ts",
    "src/devtools/d.ts",
    "src/dev/d.ts",
    "tests/fixtures/f.ts",
    "packages/tool/__testfixtures__/input.ts",
    "packages/tool/__tests_dts__/public-api.ts",
    "packages/tool/testfixtures/output.ts",
    "packages/tool/test-d/public-api.ts",
    "packages/tool/type-tests/public-api.ts",
    "examples/e.ts",
    // WO-12: a top-level tests/ tree is non-production; the prior list
    // only matched the slash-prefixed "/tests/" form.
    "tests/visual/framework/VisualTestBase.ts",
    "test/types/api.tst.ts",
    "integration/http/server.ts",
    "sample/01-app/src/main.ts",
    "packages/create/template-react/src/main.tsx",
    "templates/service/src/index.ts",
    "playground/hmr/main.ts",
    "docs/examples/config.js",
    "bench/parser/index.ts",
    "benchmarks/parser/index.ts",
    ".yarn/releases/yarn.cjs",
  ]) {
    assert.equal(policy.isNonProductionPath(nonProd), true, `${nonProd} must be non-production`);
  }

  assert.equal(policy.isNonProductionPath("services/userService.ts"), false);
  assert.equal(policy.isNonProductionPath("src/template-engine.ts"), false);
  assert.equal(policy.isFrameworkEntryPath("website/sidebars.ts"), true);
  assert.equal(policy.isFrameworkEntryPath("website/src/theme/DocPage/index.tsx"), true);
});

test("placement axis: base forbidden-type law fires on production files, not test files", () => {
  const facts = [file("services/DataManager.ts"), file("services/__tests__/DataManager.test.ts")];
  const findings = policy.evaluateGrammarDivergence({ facts, grammar: grammarWith(false) });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].payload.law.axis, "placement");
  assert.equal(findings[0].payload.law.tier, "base");
  assert.match(findings[0].payload.law.declaration, /forbiddenTypes\.Manager/);
  assert.deepEqual(findings[0].files, ["services/DataManager.ts"]);
});

test("ownership axis: declared contract systems against OwnershipMap placement", () => {
  const findings = policy.evaluateGrammarDivergence({
    facts: [file("services/userService.ts")],
    grammar: grammarWith(false),
    ownershipEntries: [{ path: "services/userService.ts", ownerSystem: "billing" }],
    contractEntries: [
      {
        id: "contract-1",
        status: "configured",
        allowedSystems: ["identity"],
        capabilityRef: { subjects: ["services/userService.ts"] },
      },
    ],
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].payload.law.axis, "ownership");
  assert.equal(findings[0].payload.law.tier, "declared");
  assert.match(findings[0].payload.law.declaration, /contract-1 allowedSystems/);

  // No declaration, no finding: a contract without system rules is silent.
  const silent = policy.evaluateGrammarDivergence({
    facts: [file("services/userService.ts")],
    grammar: grammarWith(false),
    ownershipEntries: [{ path: "services/userService.ts", ownerSystem: "billing" }],
    contractEntries: [{ id: "contract-2", status: "configured", capabilityRef: { subjects: ["services/userService.ts"] } }],
  });
  assert.deepEqual(silent, []);
});

test("identical violations dedupe to one finding per source->target pair", () => {
  const facts = [
    ...BASE_FACTS,
    edge("app/api/users/route.ts", "domain/user.ts"),
    { ...edge("app/api/users/route.ts", "domain/user.ts"), subject: "dup" },
  ];
  const findings = policy.evaluateGrammarDivergence({ facts, grammar: grammarWith(true) });

  assert.equal(findings.length, 1);
});
