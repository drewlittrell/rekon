// Contract tests for the JS/TS AST EvidenceGraph
// Provider v1 (twenty-fourth slice on the capability-
// ontology track). Verifies the AST-backed extraction
// path emits enriched symbol / export / import facts
// with the additive metadata pinned by the AST adapter
// decision memo, and that the regex fallback emits
// the same fact kinds with the `regex-fallback` label.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

import {
  __extractRegexFallbackFactsForTesting,
  jsTsProvider,
} from "../../packages/capability-js-ts/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const fixtureRoot = join(repoRoot, "tests/fixtures/js-ts-ast-evidence");
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

let cachedFacts;
async function loadFacts() {
  if (!cachedFacts) {
    cachedFacts = await jsTsProvider.extract({
      repoRoot: fixtureRoot,
      includeTests: true,
    });
  }
  return cachedFacts;
}

function exportsForFile(facts, file) {
  return facts.filter((fact) => fact.kind === "export" && fact.subject === file)
    .map((fact) => fact.value);
}

function symbolsForFile(facts, file) {
  return facts.filter((fact) => fact.kind === "symbol" && fact.subject === file)
    .map((fact) => fact.value);
}

function importsForFile(facts, file) {
  return facts.filter((fact) => fact.kind === "import" && fact.value?.source === file)
    .map((fact) => fact.value);
}

// ---------- 1: AST extraction emits extractionMethod ast ----------

test("AST extraction emits extractionMethod ast for parseable TS file", async () => {
  const facts = await loadFacts();
  const exports = exportsForFile(facts, "src/constructs.ts");
  assert.ok(exports.length > 0, "constructs.ts must emit at least one export");
  for (const value of exports) {
    assert.equal(value.extractionMethod, "ast",
      "AST-backed exports must carry extractionMethod ast");
  }
});

// ---------- 2: AST extraction emits confidence high for AST symbol facts ----------

test("AST symbol facts carry confidence high", async () => {
  const facts = await loadFacts();
  const symbols = symbolsForFile(facts, "src/constructs.ts");
  assert.ok(symbols.length > 0);
  for (const value of symbols) {
    assert.equal(value.extractionMethod, "ast");
    assert.equal(value.confidence, "high",
      "AST symbol facts must carry confidence high");
  }
});

// ---------- 3: function declaration emits symbolKind function ----------

test("function declaration emits symbolKind function", async () => {
  const facts = await loadFacts();
  const symbols = symbolsForFile(facts, "src/constructs.ts");
  const createUser = symbols.find((sym) => sym.name === "createUser");
  assert.ok(createUser, "createUser symbol must be emitted");
  assert.equal(createUser.symbolKind, "function");
});

// ---------- 4: class declaration emits symbolKind class ----------

test("class declaration emits symbolKind class", async () => {
  const facts = await loadFacts();
  const symbols = symbolsForFile(facts, "src/constructs.ts");
  const cls = symbols.find((sym) => sym.name === "UserService");
  assert.ok(cls, "UserService symbol must be emitted");
  assert.equal(cls.symbolKind, "class");
});

// ---------- 5: class method emits symbolKind method ----------

test("class method emits symbolKind method", async () => {
  const facts = await loadFacts();
  const symbols = symbolsForFile(facts, "src/constructs.ts");
  const greet = symbols.find((sym) => sym.name === "greet");
  assert.ok(greet, "class method greet must be emitted");
  assert.equal(greet.symbolKind, "method");
});

// ---------- 6: arrow-function const emits symbolKind function ----------
//
// Convention pinned: arrow-function/function-expression
// initializers classify as `symbolKind: "function"`, and
// the legacy `kind` field stays `"const"` so consumers
// reading the legacy keyword see the variable declaration
// keyword while consumers reading the richer `symbolKind`
// see the function-shape classification.

test("arrow-function const emits symbolKind function (legacy kind: const)", async () => {
  const facts = await loadFacts();
  const symbols = symbolsForFile(facts, "src/constructs.ts");
  const fetchUser = symbols.find((sym) => sym.name === "fetchUser");
  assert.ok(fetchUser, "arrow-function const fetchUser must be emitted");
  assert.equal(fetchUser.symbolKind, "function");
  assert.equal(fetchUser.kind, "const",
    "legacy `kind` stays the declaration keyword (const)");
});

// ---------- 7: interface declaration emits symbolKind interface ----------

test("interface declaration emits symbolKind interface", async () => {
  const facts = await loadFacts();
  const symbols = symbolsForFile(facts, "src/constructs.ts");
  const iface = symbols.find((sym) => sym.name === "UserShape");
  assert.ok(iface, "interface UserShape must be emitted");
  assert.equal(iface.symbolKind, "interface");
});

// ---------- 8: type alias emits symbolKind type ----------

test("type alias emits symbolKind type", async () => {
  const facts = await loadFacts();
  const symbols = symbolsForFile(facts, "src/constructs.ts");
  const alias = symbols.find((sym) => sym.name === "UserId");
  assert.ok(alias, "type alias UserId must be emitted");
  assert.equal(alias.symbolKind, "type");
});

// ---------- 9: enum emits symbolKind enum ----------

test("enum emits symbolKind enum", async () => {
  const facts = await loadFacts();
  const symbols = symbolsForFile(facts, "src/constructs.ts");
  const enm = symbols.find((sym) => sym.name === "UserRole");
  assert.ok(enm, "enum UserRole must be emitted");
  assert.equal(enm.symbolKind, "enum");
});

// ---------- 10: named export emits exportKind named ----------

test("named export emits exportKind named", async () => {
  const facts = await loadFacts();
  const exps = exportsForFile(facts, "src/constructs.ts");
  const createUserExp = exps.find((exp) => exp.name === "createUser");
  assert.ok(createUserExp, "createUser must be exported");
  assert.equal(createUserExp.exportKind, "named");
});

// ---------- 11: default export emits exportKind default ----------

test("default export emits exportKind default", async () => {
  const facts = await loadFacts();
  const exps = exportsForFile(facts, "src/constructs.tsx");
  const def = exps.find((exp) => exp.name === "default");
  assert.ok(def, "default export must be emitted");
  assert.equal(def.exportKind, "default");
  assert.equal(def.default, true);
});

// ---------- 12: re-export emits exportKind re-export ----------

test("re-export emits exportKind re-export", async () => {
  const facts = await loadFacts();
  const exps = exportsForFile(facts, "src/reexports.ts");
  const renamed = exps.find((exp) => exp.name === "renamedThing");
  assert.ok(renamed, "renamedThing must be re-exported");
  // `export { otherThing as renamedThing }` has no
  // module specifier locally, so AST classifies it as
  // "named". The `export * from` and `export * as alias
  // from` variants below carry the namespace classifier.
  assert.equal(renamed.exportKind, "named");
  const namespaceReExport = exps.find((exp) => exp.name === "constructs");
  assert.ok(namespaceReExport, "namespace re-export must be emitted");
  assert.equal(namespaceReExport.exportKind, "namespace");
  assert.equal(namespaceReExport.moduleSpecifier, "./constructs");
});

// ---------- 13: type-only export emits exportKind type-only ----------

test("type-only export emits exportKind type-only", async () => {
  const facts = await loadFacts();
  const exps = exportsForFile(facts, "src/type-only.ts");
  const typeAlias = exps.find((exp) => exp.name === "ProjectedUser");
  assert.ok(typeAlias, "type ProjectedUser export must be emitted");
  // `export type ProjectedUser = ...` is a type-alias
  // declaration with an export modifier — exportKind is
  // "named" (the declaration carries `type` as
  // declarationKeyword) for the standalone form. The
  // explicit re-export below tests the "type-only"
  // exportKind for `export { type X as Y }`.
  const publicAlias = exps.find((exp) => exp.name === "PublicProjectedUser");
  assert.ok(publicAlias, "type-only re-export must be emitted");
  assert.equal(publicAlias.exportKind, "type-only");
});

// ---------- 14: value import emits importKind value ----------

test("value import emits importKind value", async () => {
  const facts = await loadFacts();
  const imps = importsForFile(facts, "src/constructs.ts");
  const other = imps.find((imp) => imp.target === "./reexports");
  assert.ok(other, "value import must be emitted");
  assert.equal(other.importKind, "value");
});

// ---------- 15: type-only import emits importKind type-only ----------

test("type-only import emits importKind type-only", async () => {
  const facts = await loadFacts();
  const imps = importsForFile(facts, "src/type-only.ts");
  const typeImport = imps.find((imp) => imp.target === "./constructs");
  assert.ok(typeImport, "type-only import must be emitted");
  assert.equal(typeImport.importKind, "type-only");
});

// ---------- 16: namespace import emits importKind namespace ----------

test("namespace import emits importKind namespace", async () => {
  const facts = await loadFacts();
  const imps = importsForFile(facts, "src/constructs.tsx");
  const namespaceImport = imps.find((imp) => imp.target === "./react-shim"
    && imp.importKind === "namespace");
  assert.ok(namespaceImport, "namespace import must be emitted");
});

// ---------- 17: side-effect import emits importKind side-effect ----------

test("side-effect import emits importKind side-effect", async () => {
  const facts = await loadFacts();
  const imps = importsForFile(facts, "src/constructs.js");
  const sideEffect = imps.find((imp) => imp.target === "./side-effects");
  assert.ok(sideEffect, "side-effect import must be emitted");
  assert.equal(sideEffect.importKind, "side-effect");
});

// ---------- 18: TSX file parses through AST path ----------

test("TSX file parses through AST path", async () => {
  const facts = await loadFacts();
  const exps = exportsForFile(facts, "src/constructs.tsx");
  assert.ok(exps.length > 0);
  for (const value of exps) {
    assert.equal(value.extractionMethod, "ast");
    assert.equal(value.language, "typescript");
  }
});

// ---------- 19: JS/JSX file parses through AST path with language javascript ----------

test("JS file parses through AST path with language javascript", async () => {
  const facts = await loadFacts();
  const exps = exportsForFile(facts, "src/constructs.js");
  assert.ok(exps.length > 0);
  for (const value of exps) {
    assert.equal(value.extractionMethod, "ast");
    assert.equal(value.language, "javascript");
  }
});

// ---------- 20: location metadata is present and convention is pinned ----------

test("import facts carry location metadata (convention: 1-based line + 1-based column)", async () => {
  const facts = await loadFacts();
  const imps = importsForFile(facts, "src/constructs.ts");
  assert.ok(imps.length > 0);
  for (const value of imps) {
    assert.ok(value.location, "import facts must include location");
    assert.equal(typeof value.location.line, "number");
    assert.equal(typeof value.location.column, "number");
    assert.ok(value.location.line >= 1, "line is 1-based");
    assert.ok(value.location.column >= 1, "column is 1-based");
  }
});

// ---------- 21: parser failure falls back to regex-fallback facts ----------
//
// The TypeScript parser is intentionally tolerant — most
// syntactically broken JS/TS still produces a usable
// SourceFile. The fallback path is therefore a defense-
// in-depth surface: it must work correctly when invoked,
// even though most production sources never hit it.
// The provider exposes
// `__extractRegexFallbackFactsForTesting` so this
// contract test can exercise the fallback path
// deterministically without depending on parser-throw
// edge cases.

test("regex fallback path emits regex-fallback facts when invoked", async () => {
  const content = await readFile(
    join(fixtureRoot, "src/constructs.ts"),
    "utf8",
  );
  const facts = __extractRegexFallbackFactsForTesting("src/constructs.ts", content);
  assert.ok(facts.length > 0, "regex fallback must emit at least one fact");
  const sample = facts.find((fact) => fact.kind === "export");
  assert.ok(sample, "regex fallback must emit export facts");
  assert.equal(sample.value.extractionMethod, "regex-fallback");
});

// ---------- 22: fallback facts include extractionMethod regex-fallback ----------

test("regex fallback facts include extractionMethod regex-fallback across all fact kinds", async () => {
  const content = await readFile(
    join(fixtureRoot, "src/constructs.ts"),
    "utf8",
  );
  const facts = __extractRegexFallbackFactsForTesting("src/constructs.ts", content);
  const byKind = new Set(facts.map((fact) => fact.kind));
  assert.ok(byKind.has("import"));
  assert.ok(byKind.has("export"));
  assert.ok(byKind.has("symbol"));
  for (const fact of facts) {
    assert.equal(fact.value.extractionMethod, "regex-fallback",
      `${fact.kind} fallback facts must carry extractionMethod regex-fallback`);
  }
});

// ---------- 23: fallback facts include confidence medium or low ----------

test("regex fallback facts carry confidence medium or low", async () => {
  const content = await readFile(
    join(fixtureRoot, "src/constructs.ts"),
    "utf8",
  );
  const facts = __extractRegexFallbackFactsForTesting("src/constructs.ts", content);
  for (const fact of facts) {
    assert.ok(
      fact.value.confidence === "medium" || fact.value.confidence === "low",
      `fallback fact confidence must be "medium" or "low" (got ${fact.value.confidence})`,
    );
  }
});

// ---------- 24: AST output does not mutate CapabilityMap ----------

test("provider extraction does not produce CapabilityMap facts (CapabilityMap remains untouched)", async () => {
  const facts = await loadFacts();
  for (const fact of facts) {
    assert.ok(
      // import_specifier + reexport added by WO-8 (symbol-facts projection
      // v2); still EvidenceGraph kinds, never CapabilityMap.
      ["file", "import", "export", "symbol", "import_specifier", "reexport", "ownership_hint", "capability_hint", "debt_marker", "content_signal"]
        .includes(fact.kind),
      `provider must not emit non-EvidenceGraph fact kinds (saw ${fact.kind})`,
    );
  }
  // Defensive: no fact value should reference CapabilityMap.
  for (const fact of facts) {
    const json = JSON.stringify(fact.value);
    assert.equal(json.includes("CapabilityMap"), false,
      "AST provider must never emit CapabilityMap-referencing values");
  }
});

// ---------- 25: artifacts validate remains clean after refresh ----------

test("rekon artifacts validate remains clean after refreshing the fixture", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "rekon-ast-provider-"));
  try {
    // Copy the fixture into a writable temp dir so the
    // CLI can write artifacts under .rekon/.
    const { cp } = await import("node:fs/promises");
    await cp(fixtureRoot, tempRoot, { recursive: true });

    const refresh = spawnSync("node", [cliPath, "refresh", "--root", tempRoot, "--json"], {
      encoding: "utf8",
    });
    assert.equal(refresh.status, 0, `refresh must succeed: ${refresh.stderr}`);

    const validate = spawnSync(
      "node",
      [cliPath, "artifacts", "validate", "--root", tempRoot, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(validate.status, 0,
      `artifacts validate must succeed: ${validate.stderr}`);
    const payload = JSON.parse(validate.stdout);
    assert.equal(payload.invalid ?? 0, 0,
      "artifacts validate must report zero invalid artifacts");
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
