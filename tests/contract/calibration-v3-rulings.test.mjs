// WO-16 behavioral tests: barrel scope v2.1 (living conduits stay exempt,
// dead barrels fire, the counters distinguish the two) and the naming
// batch semantics (bare declared-role names satisfy the contract, role
// satisfactions counted).

import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const policy = await import(join(repoRoot, "packages/capability-policy/dist/index.js"));
const ontology = await import(join(repoRoot, "packages/capability-ontology/dist/grammar/index.js"));

const file = (path) => ({ kind: "file", subject: path, value: {} });
const exp = (path, name) => ({ kind: "export", subject: path, value: { name, kind: "const" } });
const reex = (source, target, name) => ({
  kind: "reexport",
  subject: `${source}:${target}:${name}`,
  value: { source, target: "./x", name, exportedAs: name, reexportKind: "named", resolvedTarget: target },
});
const newStats = () => ({ typeOnlyReferences: 0, barrelExemptions: 0, generatedExemptions: 0, factoryExemptions: 0, deadBarrels: 0 });

test("barrel v2.1: the living conduit stays exempt; the dead barrel fires; counters distinguish", () => {
  const stats = newStats();
  const facts = [
    file("src/living.ts"),
    file("src/dead.ts"),
    file("src/consumer.ts"),
    // Both are barrel-shaped (all exports are re-exports).
    exp("src/living.ts", "a"),
    reex("src/living.ts", "src/a.ts", "a"),
    exp("src/dead.ts", "b"),
    reex("src/dead.ts", "src/b.ts", "b"),
    // Only the living one has a resolved importer.
    {
      kind: "import_specifier",
      subject: "src/consumer.ts:src/living.ts:a",
      value: { source: "src/consumer.ts", target: "./living", name: "a", local: "a", specifierKind: "named", resolvedTarget: "src/living.ts" },
    },
  ];
  const findings = policy.evaluateDeadCode({ facts, roots: [], stats });

  assert.deepEqual(findings.map((f) => f.files[0]), ["src/dead.ts"]);
  assert.equal(stats.barrelExemptions, 1, "living conduit counted as exemption");
  assert.equal(stats.deadBarrels, 1, "dead barrel counted separately and fires");
});

test("naming batch semantics: a bare declared-role name satisfies the contract, counted", () => {
  const grammar = ontology.compileEffectiveGrammar({
    ratifiedArchetypeIds: ontology.BUILTIN_GRAMMAR_ARCHETYPE_PACKS.map((p) => p.id),
  });
  const stats = { vocabularyExemptions: 0, roleSatisfactions: 0 };
  const findings = policy.evaluateNamingContract({
    facts: [
      file("domain/core/Registry.ts"), // bare ported role: satisfies (WO-16 semantics)
      file("src/UserService.ts"), // suffixed role: satisfies
      file("app/components/AdminNav.tsx"), // .tsx satisfies Component file type
      file("services/Admin.ts"),
      { kind: "symbol", subject: "services/Admin.ts", value: { name: "AdminService", exported: true, symbolKind: "class" } },
    ],
    grammar,
    stats,
  });

  assert.deepEqual(findings.map((f) => f.files[0]), ["services/Admin.ts"]);
  assert.equal(stats.roleSatisfactions, 3);
});
