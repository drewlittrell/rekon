// EvidenceGraph export/symbol facts projection v1 — contract
// tests. Substrate slice: the JS/TS evidence provider now
// emits `kind: "export"` and `kind: "symbol"` facts with
// `{ name, kind, default?/exported? }` shape on `value`, and
// `@rekon/kernel-findings` exports `listExportsForFile` /
// `listSymbolsForFile` helpers for future graph-aware checks.
//
// This batch is substrate only: NO graph-aware filter behavior
// changes here. The final test below pins that contract.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { jsTsProvider } from "../../packages/capability-js-ts/dist/index.js";
import {
  applyFindingFilters,
  applyFindingGraphFilters,
  listExportsForFile,
  listSymbolsForFile,
} from "../../packages/kernel-findings/dist/index.js";
import { assertEvidenceGraph, createEvidenceGraph } from "../../packages/kernel-evidence/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- Helper: run the JS/TS provider against a temp dir ----------

async function withProviderFacts(files, callback) {
  // `files` is an object mapping relative paths to file
  // contents. Writes them to a temp dir, then runs the
  // jsTsProvider against that dir and collects every emitted
  // EvidenceFact.
  const root = await mkdtemp(join(tmpdir(), "rekon-export-symbol-v1-"));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const abs = join(root, rel);
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, content, "utf8");
    }
    const facts = await jsTsProvider.extract({
      repoRoot: root,
      includeTests: true,
    });
    await callback({ root, facts });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function exportsForFile(facts, file) {
  return facts
    .filter((fact) => fact.kind === "export" && fact.subject === file)
    .map((fact) => fact.value);
}

function symbolsForFile(facts, file) {
  return facts
    .filter((fact) => fact.kind === "symbol" && fact.subject === file)
    .map((fact) => fact.value);
}

// ---------- Test 1: named declaration exports ----------

test("JS/TS provider emits export facts for exported functions / classes / consts / type / interface / namespace", async () => {
  await withProviderFacts(
    {
      "src/named.ts":
        "export function alpha() {}\n"
        + "export async function alphaAsync() {}\n"
        + "export class Beta {}\n"
        + "export const gamma = 1;\n"
        + "export let delta = 2;\n"
        + "export var epsilon = 3;\n"
        + "export type Zeta = string;\n"
        + "export interface Eta {}\n"
        + "export namespace Theta {}\n",
    },
    ({ facts }) => {
      const exp = exportsForFile(facts, "src/named.ts");
      const byName = Object.fromEntries(exp.map((entry) => [entry.name, entry]));
      assert.equal(byName.alpha?.kind, "function");
      assert.equal(byName.alphaAsync?.kind, "function");
      assert.equal(byName.Beta?.kind, "class");
      assert.equal(byName.gamma?.kind, "const");
      assert.equal(byName.delta?.kind, "let");
      assert.equal(byName.epsilon?.kind, "var");
      assert.equal(byName.Zeta?.kind, "type");
      assert.equal(byName.Eta?.kind, "interface");
      assert.equal(byName.Theta?.kind, "namespace");
      // None of these are default exports.
      for (const entry of exp) assert.notEqual(entry.default, true);
    },
  );
});

// ---------- Test 2: default exports ----------

test("JS/TS provider emits export fact for `export default function|class|expression`", async () => {
  await withProviderFacts(
    {
      "src/default-fn.tsx": "export default function Page() { return null; }\n",
      "src/default-class.ts": "export default class Service {}\n",
      "src/default-expr.ts": "const handler = () => {};\nexport default handler;\n",
    },
    ({ facts }) => {
      const fn = exportsForFile(facts, "src/default-fn.tsx");
      const cls = exportsForFile(facts, "src/default-class.ts");
      const expr = exportsForFile(facts, "src/default-expr.ts");
      assert.deepEqual(
        fn.filter((e) => e.name === "default"),
        [{ name: "default", kind: "default", default: true }],
      );
      assert.deepEqual(
        cls.filter((e) => e.name === "default"),
        [{ name: "default", kind: "default", default: true }],
      );
      assert.deepEqual(
        expr.filter((e) => e.name === "default"),
        [{ name: "default", kind: "default", default: true }],
      );
    },
  );
});

// ---------- Test 3: named export list with alias ----------

test("JS/TS provider emits export facts for `export { foo, bar as baz }`", async () => {
  await withProviderFacts(
    {
      "src/list.ts":
        "function foo() {}\nfunction bar() {}\nexport { foo, bar as baz };\n",
    },
    ({ facts }) => {
      const exp = exportsForFile(facts, "src/list.ts");
      const byName = Object.fromEntries(exp.map((entry) => [entry.name, entry]));
      // The work order spec: for `export { foo, bar as baz }`,
      // emit `[{ name: "foo", kind: "unknown" }, { name: "baz",
      // kind: "unknown" }]`. We do NOT emit `bar`.
      assert.equal(byName.foo?.kind, "unknown");
      assert.equal(byName.baz?.kind, "unknown");
      assert.equal(byName.bar, undefined, "renamed source `bar` must not be exported");
    },
  );
});

// ---------- Test 4: export * (namespace re-export) ----------

test("JS/TS provider emits export fact for `export * from \"...\"` as namespace and `export * as alias from \"...\"`", async () => {
  await withProviderFacts(
    {
      "src/star.ts": 'export * from "./other";\nexport * as helpers from "./helpers";\n',
    },
    ({ facts }) => {
      const exp = exportsForFile(facts, "src/star.ts");
      const byName = Object.fromEntries(exp.map((entry) => [entry.name, entry]));
      assert.equal(byName["*"]?.kind, "namespace");
      assert.equal(byName.helpers?.kind, "namespace");
    },
  );
});

// ---------- Test 5: symbol facts for local declarations ----------

test("JS/TS provider emits symbol facts for local functions / classes / consts / interfaces", async () => {
  await withProviderFacts(
    {
      "src/syms.ts":
        "function localHelper() {}\n"
        + "class LocalService {}\n"
        + "const LOCAL_FLAG = true;\n"
        + "interface LocalShape {}\n"
        + "type LocalType = string;\n",
    },
    ({ facts }) => {
      const syms = symbolsForFile(facts, "src/syms.ts");
      const byName = Object.fromEntries(syms.map((entry) => [entry.name, entry]));
      assert.equal(byName.localHelper?.kind, "function");
      assert.equal(byName.localHelper?.exported, false);
      assert.equal(byName.LocalService?.kind, "class");
      assert.equal(byName.LocalService?.exported, false);
      assert.equal(byName.LOCAL_FLAG?.kind, "const");
      assert.equal(byName.LOCAL_FLAG?.exported, false);
      assert.equal(byName.LocalShape?.kind, "interface");
      assert.equal(byName.LocalShape?.exported, false);
      assert.equal(byName.LocalType?.kind, "type");
      assert.equal(byName.LocalType?.exported, false);
    },
  );
});

// ---------- Test 6: exported symbols have exported: true ----------

test("exported symbols carry exported: true (declared with leading `export`)", async () => {
  await withProviderFacts(
    {
      "src/route.ts":
        'export const runtime = "edge";\n'
        + "export function handle() {}\n"
        + "function privateHelper() {}\n",
    },
    ({ facts }) => {
      const syms = symbolsForFile(facts, "src/route.ts");
      const byName = Object.fromEntries(syms.map((entry) => [entry.name, entry]));
      assert.equal(byName.runtime?.exported, true);
      assert.equal(byName.handle?.exported, true);
      assert.equal(byName.privateHelper?.exported, false);
    },
  );
});

// ---------- Test 7: deterministic + deduped ----------

test("facts are deterministic and deduped across multiple extractions", async () => {
  await withProviderFacts(
    {
      "src/dup.ts": "export function alpha() {}\nexport function alpha() {}\n",
    },
    async ({ root }) => {
      const first = await jsTsProvider.extract({ repoRoot: root, includeTests: true });
      const second = await jsTsProvider.extract({ repoRoot: root, includeTests: true });
      const firstExports = exportsForFile(first, "src/dup.ts");
      const secondExports = exportsForFile(second, "src/dup.ts");
      // Same input → same fact list (deduped + sorted by the
      // kernel-evidence dedupe key).
      assert.deepEqual(firstExports, secondExports);
      // The two identical `export function alpha()`
      // declarations dedupe to a single export fact via
      // kind + subject + value + provenance canonical key.
      assert.equal(
        firstExports.filter((entry) => entry.name === "alpha").length,
        1,
        "duplicate exported declarations must dedupe",
      );
    },
  );
});

// ---------- Test 8: older EvidenceGraph fixture still validates ----------

test("older EvidenceGraph fixture without export/symbol facts still validates (additive optional facts)", async () => {
  // A v1-shape EvidenceGraph that pre-dates the new export
  // shape. Only file + import facts. `assertEvidenceGraph`
  // must accept it unchanged.
  const fixture = createEvidenceGraph({
    header: {
      artifactType: "EvidenceGraph",
      artifactId: `legacy-${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: "legacy" },
      producer: { id: "test-harness", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    facts: [
      {
        id: "legacy-file-1",
        kind: "file",
        subject: "src/index.ts",
        value: { path: "src/index.ts", language: "typescript" },
        confidence: 0.9,
        provenance: {
          source: "repo",
          pack: "legacy-pack",
          file: "src/index.ts",
          extractorVersion: "0.1.0",
        },
      },
      {
        id: "legacy-import-1",
        kind: "import",
        subject: "src/index.ts:./helper",
        value: { source: "src/index.ts", target: "./helper" },
        confidence: 0.9,
        provenance: {
          source: "repo",
          pack: "legacy-pack",
          file: "src/index.ts",
          extractorVersion: "0.1.0",
        },
      },
    ],
  });
  const round = assertEvidenceGraph(JSON.parse(JSON.stringify(fixture)));
  assert.equal(round.facts.length, 2);
  assert.equal(round.facts[0].kind, "file");
  assert.equal(round.facts[1].kind, "import");
});

// ---------- Test 9: listExportsForFile helper ----------

test("listExportsForFile returns sorted export summaries for a file", () => {
  const context = {
    evidenceGraph: {
      facts: [
        { kind: "export", subject: "src/file.ts", value: { name: "handle", kind: "function" } },
        { kind: "export", subject: "src/file.ts", value: { name: "default", kind: "default", default: true } },
        { kind: "export", subject: "src/file.ts", value: { name: "runtime", kind: "const" } },
        { kind: "export", subject: "src/other.ts", value: { name: "ignored", kind: "function" } },
      ],
    },
  };
  const result = listExportsForFile(context, "src/file.ts");
  // Sorted by name then kind.
  assert.deepEqual(result, [
    { name: "default", kind: "default", default: true },
    { name: "handle", kind: "function" },
    { name: "runtime", kind: "const" },
  ]);
  // Path normalization works for `./` prefix.
  assert.deepEqual(listExportsForFile(context, "./src/file.ts"), result);
  // Empty graph → empty array.
  assert.deepEqual(listExportsForFile({}, "src/file.ts"), []);
});

// ---------- Test 10: listSymbolsForFile helper ----------

test("listSymbolsForFile returns sorted symbol summaries for a file (with exported flag)", () => {
  const context = {
    evidenceGraph: {
      facts: [
        { kind: "symbol", subject: "src/file.ts", value: { name: "handle", kind: "function", exported: true } },
        { kind: "symbol", subject: "src/file.ts", value: { name: "privateHelper", kind: "function", exported: false } },
        { kind: "symbol", subject: "src/other.ts", value: { name: "elsewhere", kind: "class", exported: false } },
      ],
    },
  };
  const result = listSymbolsForFile(context, "src/file.ts");
  assert.deepEqual(result, [
    { name: "handle", kind: "function", exported: true },
    { name: "privateHelper", kind: "function", exported: false },
  ]);
  assert.deepEqual(listSymbolsForFile({}, "src/file.ts"), []);
});

// ---------- Test 11: existing import facts unchanged ----------

test("existing import facts emit unchanged subject shape (`path:target`) — per work order", async () => {
  await withProviderFacts(
    {
      "src/with-imports.ts":
        'import { foo } from "./helper";\nimport leftpad from "leftpad";\nconst dyn = await import("./dyn");\n',
    },
    ({ facts }) => {
      const importFacts = facts.filter(
        (fact) => fact.kind === "import" && fact.provenance?.file === "src/with-imports.ts",
      );
      assert.ok(importFacts.length >= 2, "must emit at least the two import facts");
      // Subject keeps the legacy `${path}:${target}` shape so
      // we do not break existing consumers in this substrate
      // slice. (The shape mismatch with v2 helpers is a known
      // follow-up; the work order explicitly excludes import
      // facts from this batch.)
      for (const fact of importFacts) {
        assert.match(fact.subject, /^src\/with-imports\.ts:/);
        assert.equal(fact.value?.source, "src/with-imports.ts");
        assert.equal(typeof fact.value?.target, "string");
      }
    },
  );
});

// ---------- Test 12: graph-aware filter behavior unchanged ----------

test("graph-aware filter behavior is unchanged in this substrate batch", () => {
  // A finding that the v1/v2 graph-aware provider would
  // (correctly) suppress as `route-handler-with-service` given
  // a sibling handler. Run the filter with a context that
  // contains the new export + symbol facts AND the existing
  // ObservedRepo sibling — the decision should still cite
  // `ObservedRepo` and not be affected by the new export
  // facts (the substrate is not consumed by any filter yet).
  const finding = {
    id: "rh-substrate",
    type: "architecture",
    severity: "medium",
    title: "Route should construct deps",
    description: "Route construct and inject deps rule fired.",
    subjects: ["src/api/widgets/route.ts"],
    files: ["src/api/widgets/route.ts"],
    ruleId: "routes.construct_and_inject_deps",
    details: {},
  };
  const graphContext = {
    observedRepo: {
      files: ["src/api/widgets/handler.ts", "src/api/widgets/route.ts"],
    },
    evidenceGraph: {
      facts: [
        // New export/symbol facts in the graph — proves the
        // substrate doesn't get consumed by any filter yet.
        { kind: "export", subject: "src/api/widgets/handler.ts", value: { name: "handle", kind: "function" } },
        { kind: "symbol", subject: "src/api/widgets/handler.ts", value: { name: "handle", kind: "function", exported: true } },
      ],
    },
  };
  const decision = applyFindingGraphFilters({ finding, graphContext });
  assert.ok(decision, "graph-aware filter must still fire");
  assert.equal(decision.reason, "route-handler-with-service");
  assert.deepEqual(decision.usedArtifacts, ["ObservedRepo"]);
  // applyFindingFilters collects graphArtifactsUsed for the run.
  const result = applyFindingFilters({ findings: [finding], graphContext });
  assert.equal(result.filteredFindings.length, 1);
  assert.deepEqual(result.graphArtifactsUsed, ["ObservedRepo"]);
});

// ---------- Test 13: end-to-end CLI smoke ----------

test("rekon refresh + artifacts validate stays clean after substrate update", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-export-symbol-cli-"));
  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    runCli(["init", "--root", root, "--json"]);
    runCli(["refresh", "--root", root, "--json"]);

    // The latest EvidenceGraph should now contain export +
    // symbol facts with the new `value.kind` shape.
    const graph = await readLatestArtifactJson(root, "EvidenceGraph");
    assert.ok(graph, "EvidenceGraph must exist");
    const exportFact = graph.facts.find(
      (fact) => fact.kind === "export" && typeof fact.value?.kind === "string",
    );
    assert.ok(
      exportFact,
      "EvidenceGraph must contain at least one export fact with the new value.kind field",
    );
    assert.equal(typeof exportFact.value.name, "string");

    const validate = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validate.valid, true);
    assert.deepEqual(validate.issues ?? [], []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---------- helpers ----------

async function readLatestArtifactJson(root, artifactType) {
  const artifactsDir = join(root, ".rekon", "artifacts");
  const matches = [];
  await walkDir(artifactsDir, matches, artifactType);
  if (matches.length === 0) return undefined;
  matches.sort();
  return JSON.parse(await readFile(matches[matches.length - 1], "utf8"));
}

async function walkDir(dir, matches, artifactType) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDir(path, matches, artifactType);
    } else if (
      entry.isFile()
      && entry.name.startsWith(`${artifactType}-`)
      && entry.name.endsWith(".json")
    ) {
      matches.push(path);
    }
  }
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
