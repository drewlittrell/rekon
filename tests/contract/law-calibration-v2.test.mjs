// WO-13 behavioral tests: the operator provenance form (Part 1) and
// vocabulary-aware forbidden-type suffix matching (Part 4) - one unified
// code path for the placement axis and the advisory evaluator, nouns
// only, per-repo jurisdiction, with the exemption counter that keeps a
// vocabulary declaration from silently swallowing a hygiene class.

import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const grammar = await import(join(repoRoot, "packages/capability-ontology/dist/grammar/index.js"));
const schema = await import(join(repoRoot, "packages/capability-ontology/dist/grammar/schema.js"));
const policy = await import(join(repoRoot, "packages/capability-policy/dist/index.js"));

test("provenance: classic and operator forms validate; arbitrary strings fail", () => {
  for (const valid of [
    "layers.ontology.yaml#layers.route",
    "topology-contract-inference.ts#fullstack",
    "operator:wo-13#instrumentation",
    "operator:wo-13#boundary-contracts",
    "operator:wo-11",
  ]) {
    assert.equal(schema.GrammarSourceRefSchema.safeParse(valid).success, true, `${valid} must validate`);
  }

  for (const invalid of ["just a string", "operator:", "operator:WO 13", "wo-13#x", "http://example.com#x"]) {
    assert.equal(schema.GrammarSourceRefSchema.safeParse(invalid).success, false, `${invalid} must fail`);
  }
});

// ---- Part 4: vocabulary-aware suffix matching -----------------------------

const FILES = [
  { kind: "file", subject: "core/domain/state/derived/deriveAllBase.ts", value: {} },
  { kind: "file", subject: "core/services/Helpers.ts", value: {} },
];

const baseGrammar = grammar.compileEffectiveGrammar({});

test("a declared canonical noun exempts its suffix; non-nouns still fire", () => {
  const stats = { vocabularyExemptions: 0 };
  const findings = policy.evaluateGrammarDivergence({
    facts: FILES,
    grammar: baseGrammar,
    vocabularyNouns: new Set(["base"]),
    stats,
  });
  const placements = findings.filter((f) => f.payload.law.axis === "placement");

  // deriveAllBase.ts stops firing ("base" is a declared noun)...
  assert.ok(!placements.some((f) => f.files.includes("core/domain/state/derived/deriveAllBase.ts")));
  // ...while Helpers.ts still fires (not a noun in this vocabulary).
  assert.ok(placements.some((f) => f.files.includes("core/services/Helpers.ts")));
  // The exemption is counted, never silent.
  assert.equal(stats.vocabularyExemptions, 1);
});

test("vocabulary jurisdiction is per-repo: without the declaration the same file fires", () => {
  const findings = policy.evaluateGrammarDivergence({ facts: FILES, grammar: baseGrammar });
  const placements = findings.filter((f) => f.payload.law.axis === "placement");

  assert.ok(placements.some((f) => f.files.includes("core/domain/state/derived/deriveAllBase.ts")));
  assert.ok(placements.some((f) => f.files.includes("core/services/Helpers.ts")));
});

test("exemption counter scales with the swallowed class (the manager-amnesty tripwire)", () => {
  const stats = { vocabularyExemptions: 0 };
  const facts = [
    { kind: "file", subject: "src/UserManager.ts", value: {} },
    { kind: "file", subject: "src/DataManager.ts", value: {} },
    { kind: "file", subject: "src/SessionManager.ts", value: {} },
  ];
  const findings = policy.evaluateGrammarDivergence({
    facts,
    grammar: baseGrammar,
    vocabularyNouns: new Set(["manager"]),
    stats,
  });

  // An operator declaring "manager" a noun shows up as an exemption
  // spike - three suppressions counted, zero placement findings.
  assert.equal(stats.vocabularyExemptions, 3);
  assert.equal(findings.filter((f) => f.payload.law.axis === "placement").length, 0);
});

test("one code path: the advisory evaluator honors the same vocabulary, nouns only", () => {
  const advisoriesWithout = grammar.evaluateGrammarAdvisory(baseGrammar, {
    files: ["core/domain/state/derived/deriveAllBase.ts", "core/services/Helpers.ts"],
  });
  const advisoriesWith = grammar.evaluateGrammarAdvisory(baseGrammar, {
    files: ["core/domain/state/derived/deriveAllBase.ts", "core/services/Helpers.ts"],
    vocabularyNouns: new Set(["base"]),
  });
  const suffixFiles = (rows) => rows.filter((a) => a.rule === "forbidden-type-suffix").map((a) => a.file);

  assert.ok(suffixFiles(advisoriesWithout).includes("core/domain/state/derived/deriveAllBase.ts"));
  assert.ok(!suffixFiles(advisoriesWith).includes("core/domain/state/derived/deriveAllBase.ts"));
  assert.ok(suffixFiles(advisoriesWith).includes("core/services/Helpers.ts"));

  // The shared matcher is the single source of both behaviors.
  const matches = grammar.matchForbiddenTypeSuffixes(baseGrammar, "core/domain/state/derived/deriveAllBase.ts", new Set(["base"]));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].vocabularyExempted, true);
});
