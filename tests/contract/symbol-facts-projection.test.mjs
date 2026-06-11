// WO-8 behavioral tests: import-specifier and re-export facts from the
// AST path, regex-fallback parity on the same fixtures, the deterministic
// relative-target resolver, and the extract() determinism deep-equal
// (the WO-2 guard extended to the new fact kinds).

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, test } from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const pkg = await import(join(repoRoot, "packages/capability-js-ts/dist/index.js"));
const { extractAstRecords } = await import(join(repoRoot, "packages/capability-js-ts/dist/ast-extractor.js"));

const FIXTURE = [
  'import def from "./lib/util";',
  'import { alpha, beta as localBeta, type Gamma } from "../shared/types";',
  'import * as ns from "pkg-external";',
  'import "./side-effect";',
  'export { alpha as exportedAlpha } from "../shared/types";',
  'export * from "./lib/util";',
  'export * as grouped from "./lib/util";',
  "export const own = 1;",
].join("\n");

const edge = (fact) => `${fact.value.target}|${fact.value.name}|${fact.value.specifierKind ?? fact.value.reexportKind}`;

test("AST path: import specifiers cover default, named, alias, type-only, namespace, side-effect", () => {
  const result = extractAstRecords({ path: "src/app/main.ts", content: FIXTURE });
  const specs = result.importSpecifiers.map((s) => `${s.target}|${s.name}|${s.local}|${s.specifierKind}|${s.typeOnly}`);

  assert.deepEqual(specs.sort(), [
    "../shared/types|Gamma|Gamma|named|true",
    "../shared/types|alpha|alpha|named|false",
    "../shared/types|beta|localBeta|named|false",
    "./lib/util|default|def|default|false",
    "./side-effect|*|*|side-effect|false",
    "pkg-external|*|ns|namespace|false",
  ]);
});

test("AST path: re-export chains cover named-alias, star, namespace forms", () => {
  const result = extractAstRecords({ path: "src/app/main.ts", content: FIXTURE });
  const chains = result.reexports.map((r) => `${r.target}|${r.name}|${r.exportedAs}|${r.reexportKind}`);

  assert.deepEqual(chains.sort(), [
    "../shared/types|alpha|exportedAlpha|named",
    "./lib/util|*|*|star",
    "./lib/util|*|grouped|namespace",
  ]);
});

test("regex fallback parity: the same symbol-level edge set as the AST path", () => {
  const fileSet = new Set(["src/lib/util.ts", "src/shared/types.ts", "src/side-effect.ts", "src/app/main.ts"]);
  const fallbackFacts = pkg.__extractRegexFallbackFactsForTesting("src/app/main.ts", FIXTURE, fileSet);

  const astResult = extractAstRecords({ path: "src/app/main.ts", content: FIXTURE });
  const astSpecEdges = astResult.importSpecifiers.map((s) => `${s.target}|${s.name}|${s.specifierKind}`).sort();
  const astReexportEdges = astResult.reexports.map((r) => `${r.target}|${r.name}|${r.exportedAs}|${r.reexportKind}`).sort();

  const fbSpecEdges = fallbackFacts
    .filter((fact) => fact.kind === "import_specifier")
    .map((fact) => `${fact.value.target}|${fact.value.name}|${fact.value.specifierKind}`)
    .sort();
  const fbReexportEdges = fallbackFacts
    .filter((fact) => fact.kind === "reexport")
    .map((fact) => `${fact.value.target}|${fact.value.name}|${fact.value.exportedAs}|${fact.value.reexportKind}`)
    .sort();

  assert.deepEqual(fbSpecEdges, astSpecEdges);
  assert.deepEqual(fbReexportEdges, astReexportEdges);

  for (const fact of fallbackFacts.filter((f) => f.kind === "import_specifier" || f.kind === "reexport")) {
    assert.equal(fact.value.extractionMethod, "regex-fallback");
    assert.equal(fact.value.confidence, "medium");
  }
});

test("resolver: deterministic relative resolution, never a guess", () => {
  const fileSet = new Set([
    "src/lib/util.ts",
    "src/lib/dir/index.tsx",
    "src/esm/target.ts",
    "src/exact.js",
  ]);

  assert.equal(pkg.resolveRelativeTarget("src/app/main.ts", "../lib/util", fileSet), "src/lib/util.ts");
  assert.equal(pkg.resolveRelativeTarget("src/app/main.ts", "../lib/dir", fileSet), "src/lib/dir/index.tsx");
  assert.equal(pkg.resolveRelativeTarget("src/app/main.ts", "../esm/target.js", fileSet), "src/esm/target.ts");
  assert.equal(pkg.resolveRelativeTarget("src/app/main.ts", "../exact.js", fileSet), "src/exact.js");
  assert.equal(pkg.resolveRelativeTarget("src/app/main.ts", "pkg-external", fileSet), undefined);
  assert.equal(pkg.resolveRelativeTarget("src/app/main.ts", "./missing", fileSet), undefined);
  assert.equal(pkg.resolveRelativeTarget("a.ts", "../../escapes-root", fileSet), undefined);
});

// --- provider-level: resolvedTarget + determinism on a real fixture -------

let fixtureRoot;

before(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), "rekon-symbol-facts-"));
  mkdirSync(join(fixtureRoot, "src/lib"), { recursive: true });
  writeFileSync(join(fixtureRoot, "src/lib/util.ts"), "export const alpha = 1;\nexport default function run() {}\n");
  writeFileSync(
    join(fixtureRoot, "src/main.ts"),
    'import run, { alpha } from "./lib/util";\nexport { alpha } from "./lib/util";\nexport const main = () => run(alpha);\n',
  );
});

after(() => rmSync(fixtureRoot, { recursive: true, force: true }));

test("provider: import_specifier and reexport facts carry resolvedTarget for relative edges", async () => {
  const facts = await pkg.jsTsProvider.extract({ repoRoot: fixtureRoot });
  const specs = facts.filter((fact) => fact.kind === "import_specifier" && fact.value.source === "src/main.ts");
  const reexports = facts.filter((fact) => fact.kind === "reexport" && fact.value.source === "src/main.ts");

  assert.equal(specs.length, 2);
  for (const spec of specs) {
    assert.equal(spec.value.resolvedTarget, "src/lib/util.ts");
    assert.equal(spec.value.extractionMethod, "ast");
  }
  assert.deepEqual(specs.map((s) => s.value.name).sort(), ["alpha", "default"]);

  assert.equal(reexports.length, 1);
  assert.equal(reexports[0].value.name, "alpha");
  assert.equal(reexports[0].value.resolvedTarget, "src/lib/util.ts");
});

test("determinism: extract() twice on an unchanged fixture is deep-equal, ordering stable", async () => {
  const first = await pkg.jsTsProvider.extract({ repoRoot: fixtureRoot });
  const second = await pkg.jsTsProvider.extract({ repoRoot: fixtureRoot });

  assert.deepEqual(first, second);
  assert.ok(first.some((fact) => fact.kind === "import_specifier"));
  assert.ok(first.some((fact) => fact.kind === "reexport"));
});

test("dedupe: repeated identical imports collapse to one specifier fact", async () => {
  const dupRoot = mkdtempSync(join(tmpdir(), "rekon-symbol-dup-"));
  try {
    mkdirSync(join(dupRoot, "src"), { recursive: true });
    writeFileSync(join(dupRoot, "src/a.ts"), "export const x = 1;\n");
    writeFileSync(
      join(dupRoot, "src/b.ts"),
      'import { x } from "./a";\nimport { x as again } from "./a";\nimport { x } from "./a";\nexport const y = x;\n',
    );
    const facts = await pkg.jsTsProvider.extract({ repoRoot: dupRoot });
    const xEdges = facts.filter(
      (fact) => fact.kind === "import_specifier" && fact.value.name === "x" && fact.value.local === "x",
    );
    const aliasEdges = facts.filter(
      (fact) => fact.kind === "import_specifier" && fact.value.local === "again",
    );

    assert.equal(xEdges.length, 1, "identical specifier facts dedupe");
    assert.equal(aliasEdges.length, 1, "aliased binding is a distinct fact");
  } finally {
    rmSync(dupRoot, { recursive: true, force: true });
  }
});

test("resolver: tsconfig path aliases resolve declared prefixes, never undeclared ones", () => {
  const fileSet = new Set(["src/components/button.tsx", "lib/core/index.ts"]);
  const aliases = [
    { prefix: "@/", targets: ["src/"], wildcard: true },
    { prefix: "#core", targets: ["lib/core"], wildcard: false },
  ];

  assert.equal(
    pkg.resolveRelativeTarget("src/app/page.tsx", "@/components/button", fileSet, aliases),
    "src/components/button.tsx",
  );
  assert.equal(pkg.resolveRelativeTarget("src/app/page.tsx", "#core", fileSet, aliases), "lib/core/index.ts");
  assert.equal(pkg.resolveRelativeTarget("src/app/page.tsx", "~/components/button", fileSet, aliases), undefined);
  assert.equal(pkg.resolveRelativeTarget("src/app/page.tsx", "react", fileSet, aliases), undefined);
});

test("loadTsconfigPathAliases: JSONC-tolerant, fail-soft, deterministic order", async () => {
  const aliasRoot = mkdtempSync(join(tmpdir(), "rekon-alias-"));
  try {
    writeFileSync(
      join(aliasRoot, "tsconfig.json"),
      '{\n  // comment\n  "compilerOptions": {\n    "baseUrl": ".",\n    "paths": {\n      "@/*": ["./src/*"],\n      "@deep/*": ["./src/deep/*"],\n    },\n  },\n}\n',
    );
    const aliases = await pkg.loadTsconfigPathAliases(aliasRoot);

    assert.deepEqual(aliases.map((a) => a.prefix), ["@deep/", "@/"]);
    assert.deepEqual(aliases[1].targets, ["src/"]);

    rmSync(join(aliasRoot, "tsconfig.json"));
    assert.deepEqual(await pkg.loadTsconfigPathAliases(aliasRoot), []);
  } finally {
    rmSync(aliasRoot, { recursive: true, force: true });
  }
});
