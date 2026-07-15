// WO-17 behavioral tests: glob-capable anti-pattern exceptions
// (fires-outside / silent-inside / per-repo jurisdiction), the
// conditionalHooks scope, and the Part 6 scope completions.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const policy = await import(join(repoRoot, "packages/capability-policy/dist/index.js"));
const ontology = await import(join(repoRoot, "packages/capability-ontology/dist/grammar/index.js"));
const jsts = await import(join(repoRoot, "packages/capability-js-ts/dist/index.js"));

const signal = (file, id = "consoleLogging") => ({ kind: "content_signal", subject: file, value: { signal: id } });
const file = (path) => ({ kind: "file", subject: path, value: {} });

function grammarWithExceptions(extraExceptions) {
  const base = [...ontology.compileEffectiveGrammar({}).antiPatterns.values()].find((a) => a.id === "consoleLogging");

  return ontology.compileEffectiveGrammar({
    overrides: {
      antiPatterns: [{
        ...base,
        details: { ...base.details, exceptions: [...(base.details.exceptions ?? []), ...extraExceptions] },
        source: "operator:wo-17#logging-seam",
      }],
    },
  });
}

test("row-scoped exceptions: silent inside the seam, fires outside, glob-capable", () => {
  const grammar = grammarWithExceptions([
    { path: "infra/console-seam/**", reason: "the seam" },
    { path: "run-*.ts", reason: "command surface" },
  ]);
  const findings = policy.evaluateAntiPatterns({
    facts: [
      signal("infra/console-seam/ConsoleWriter.ts"), // seam: silent
      signal("run-bench.ts"), // mid-wildcard glob: silent
      signal("core/services/chat.ts"), // outside: fires
    ],
    grammar,
  });

  assert.deepEqual(findings.map((f) => f.files[0]), ["core/services/chat.ts"]);
  assert.match(findings[0].payload.law.declaration, /operator:wo-17#logging-seam/);
});

test("per-repo jurisdiction: a repo without the overlay exception keeps firing on the same path", () => {
  const bare = ontology.compileEffectiveGrammar({});
  const findings = policy.evaluateAntiPatterns({
    facts: [signal("infra/console-seam/ConsoleWriter.ts")],
    grammar: bare,
  });

  assert.equal(findings.length, 1);
});

test("conditionalHooks scope: ui layer, .tsx, and hook files only", () => {
  // conditionalHooks is an archetype row; supersede it through the
  // operator overrides so it is findings-eligible in this fixture (the
  // same mechanism the per-repo rulings use).
  const hooksRow = [...ontology.compileEffectiveGrammar({
    ratifiedArchetypeIds: ontology.BUILTIN_GRAMMAR_ARCHETYPE_PACKS.map((p) => p.id),
  }).antiPatterns.values()].find((a) => a.id === "conditionalHooks");
  const grammar = ontology.compileEffectiveGrammar({
    overrides: {
      antiPatterns: [{ ...hooksRow, source: "operator:wo-17#ui-layer" }],
      layers: [{ id: "ui", name: "UI", description: "", position: 5, paths: ["surfaces/**"], source: "operator:wo-17#ui-layer" }],
    },
  });
  const facts = [
    file("core/types/Foo.types.ts"),
    file("surfaces/panel/Panel.ts"),
    file("app/Widget.tsx"),
    file("core/hooks/useThing.ts"),
    file("infra/repositories/UserRepository.ts"),
    signal("core/types/Foo.types.ts", "conditionalHooks"), // FP class: retires
    signal("infra/repositories/UserRepository.ts", "conditionalHooks"), // FP class: retires
    signal("surfaces/panel/Panel.ts", "conditionalHooks"), // ui layer: stands
    signal("app/Widget.tsx", "conditionalHooks"), // .tsx: stands
    signal("core/hooks/useThing.ts", "conditionalHooks"), // hook file: stands
  ];
  const findings = policy.evaluateAntiPatterns({ facts, grammar });

  assert.deepEqual(findings.map((f) => f.files[0]).sort(), ["app/Widget.tsx", "core/hooks/useThing.ts", "surfaces/panel/Panel.ts"]);
});

test("Part 6 scope completions: .agents scratch, .dist ignore, root .tmp-* files", async () => {
  assert.deepEqual([...jsts.DEFAULT_AGENT_SCRATCH_SEGMENTS], [".claude", ".codex", ".agents"]);

  const root = mkdtempSync(join(tmpdir(), "rekon-wo17-scope-"));

  try {
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src/app.ts"), "export const real = 1;\n");
    mkdirSync(join(root, ".agents/worker"), { recursive: true });
    writeFileSync(join(root, ".agents/worker/dup.ts"), "export const dup = 1;\n");
    mkdirSync(join(root, ".dist"), { recursive: true });
    writeFileSync(join(root, ".dist/bundle.ts"), "export const built = 1;\n");
    writeFileSync(join(root, ".tmp-scratch.ts"), "export const tmp = 1;\n");

    const facts = await jsts.jsTsProvider.extract({ repoRoot: root });
    const subjects = facts.filter((f) => f.kind === "file").map((f) => f.subject);

    assert.deepEqual(subjects, ["src/app.ts"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
