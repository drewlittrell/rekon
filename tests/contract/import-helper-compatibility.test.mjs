// Import helper compatibility — contract tests for the
// Option B implementation from the import-fact subject-shape
// decision memo
// (docs/strategy/import-fact-subject-shape-decision.md).
//
// `@rekon/kernel-findings.listImportTargetsForFile` and
// `fileImportsTargetMatching` now recognize both legacy
// import fact shapes
// (`subject = "<file>:<target>"`, `value: { source, target }`)
// AND future file-subject shapes
// (`subject = file path`, `value: { target, ... }`). The
// producer (`@rekon/capability-js-ts`) is unchanged.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  applyFindingGraphFilters,
  fileImportsTargetMatching,
  listExportsForFile,
  listImportTargetsForFile,
  listSymbolsForFile,
} from "../../packages/kernel-findings/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- Helpers to construct synthetic graphs ----------

function legacyImportFact(file, target) {
  // The `@rekon/capability-js-ts` producer shape today:
  // subject = "${file}:${target}", value = { source, target,
  // line }.
  return {
    kind: "import",
    subject: `${file}:${target}`,
    value: { source: file, target, line: 1 },
  };
}

function futureImportFact(file, target) {
  // The future file-subject shape recommended by the decision
  // memo's Option A: subject = file, value = { source, target,
  // kind? }.
  return {
    kind: "import",
    subject: file,
    value: { source: file, target },
  };
}

function graphContext(...facts) {
  return { evidenceGraph: { facts } };
}

// ---------- Test 1: legacy subject "<file>:<target>" ----------

test("listImportTargetsForFile returns target from legacy subject \"<file>:<target>\"", () => {
  const ctx = graphContext(
    legacyImportFact("src/route.ts", "./handler"),
    legacyImportFact("src/route.ts", "/infra/http/middleware"),
  );
  assert.deepEqual(
    listImportTargetsForFile(ctx, "src/route.ts"),
    ["./handler", "/infra/http/middleware"],
  );
});

// ---------- Test 2: future file-subject shape ----------

test("listImportTargetsForFile returns target from future file-subject shape", () => {
  const ctx = graphContext(
    futureImportFact("src/route.ts", "./handler"),
    futureImportFact("src/route.ts", "leftpad"),
  );
  assert.deepEqual(
    listImportTargetsForFile(ctx, "src/route.ts"),
    ["./handler", "leftpad"],
  );
});

// ---------- Test 3: value.source authoritative when subject is legacy-different ----------

test("listImportTargetsForFile uses value.source even when subject is legacy / different", () => {
  // A defensive case: a fact whose subject does NOT have the
  // standard "<file>:<target>" prefix but whose value.source
  // is the authoritative file path. The helper must trust
  // value.source.
  const ctx = graphContext({
    kind: "import",
    subject: "some-unusual-subject:foo",
    value: { source: "src/route.ts", target: "react" },
  });
  assert.deepEqual(
    listImportTargetsForFile(ctx, "src/route.ts"),
    ["react"],
  );
});

// ---------- Test 4: mixed shapes dedupe identical target ----------

test("mixed legacy + future shapes dedupe repeated target", () => {
  const ctx = graphContext(
    legacyImportFact("src/route.ts", "./handler"),
    futureImportFact("src/route.ts", "./handler"),
    legacyImportFact("src/route.ts", "leftpad"),
  );
  const targets = listImportTargetsForFile(ctx, "src/route.ts");
  // Sorted ASCII: "./handler" < "leftpad" (period < l).
  assert.deepEqual(targets, ["./handler", "leftpad"]);
  // Confirm dedupe specifically — only two distinct targets.
  assert.equal(new Set(targets).size, targets.length);
});

// ---------- Test 5: returned targets are sorted ----------

test("returned targets are sorted", () => {
  const ctx = graphContext(
    futureImportFact("src/route.ts", "zeta"),
    futureImportFact("src/route.ts", "alpha"),
    futureImportFact("src/route.ts", "middle"),
  );
  assert.deepEqual(
    listImportTargetsForFile(ctx, "src/route.ts"),
    ["alpha", "middle", "zeta"],
  );
});

// ---------- Test 6: "./src/foo.ts" and "src/foo.ts" normalize to same file ----------

test("\"./src/foo.ts\" and \"src/foo.ts\" normalize to the same file", () => {
  const ctx = graphContext(
    legacyImportFact("src/foo.ts", "react"),
    futureImportFact("src/foo.ts", "lodash"),
  );
  const a = listImportTargetsForFile(ctx, "./src/foo.ts");
  const b = listImportTargetsForFile(ctx, "src/foo.ts");
  assert.deepEqual(a, ["lodash", "react"]);
  assert.deepEqual(a, b);
});

// ---------- Test 7: backslash paths normalize ----------

test("backslash paths normalize", () => {
  const ctx = graphContext(legacyImportFact("src/foo.ts", "react"));
  // Caller passes a Windows-style path.
  assert.deepEqual(
    listImportTargetsForFile(ctx, "src\\foo.ts"),
    ["react"],
  );
});

// ---------- Test 8: anchored prefix matching — no false matches across files ----------

test("anchored prefix matching does not match 'src/foo.tsx' for 'src/foo.ts'", () => {
  const ctx = graphContext(
    legacyImportFact("src/foo.tsx", "react"),
    legacyImportFact("src/foo.ts-extra", "lodash"),
    legacyImportFact("src/foo.ts", "leftpad"),
  );
  assert.deepEqual(
    listImportTargetsForFile(ctx, "src/foo.ts"),
    ["leftpad"],
  );
  // And the inverse — `src/foo.ts` should not match
  // `src/foo.tsx`.
  assert.deepEqual(
    listImportTargetsForFile(ctx, "src/foo.tsx"),
    ["react"],
  );
});

// ---------- Test 9: fact with matching file but missing target is ignored ----------

test("fact with matching file but missing target is ignored", () => {
  const ctx = graphContext(
    {
      kind: "import",
      subject: "src/route.ts",
      value: { source: "src/route.ts" }, // no target
    },
    legacyImportFact("src/route.ts", "react"),
  );
  assert.deepEqual(
    listImportTargetsForFile(ctx, "src/route.ts"),
    ["react"],
  );
});

// ---------- Test 10: listExportsForFile behavior unchanged ----------

test("listExportsForFile behavior remains unchanged (compatibility branch does not affect exports)", () => {
  const ctx = {
    evidenceGraph: {
      facts: [
        { kind: "export", subject: "src/file.ts", value: { name: "handle", kind: "function" } },
        { kind: "export", subject: "src/file.ts", value: { name: "default", kind: "default", default: true } },
        // Legacy-shape import facts must NOT leak into export
        // lookups.
        legacyImportFact("src/file.ts", "react"),
      ],
    },
  };
  assert.deepEqual(
    listExportsForFile(ctx, "src/file.ts"),
    [
      { name: "default", kind: "default", default: true },
      { name: "handle", kind: "function" },
    ],
  );
});

// ---------- Test 11: listSymbolsForFile behavior unchanged ----------

test("listSymbolsForFile behavior remains unchanged (compatibility branch does not affect symbols)", () => {
  const ctx = {
    evidenceGraph: {
      facts: [
        { kind: "symbol", subject: "src/file.ts", value: { name: "handle", kind: "function", exported: true } },
        legacyImportFact("src/file.ts", "react"),
      ],
    },
  };
  assert.deepEqual(
    listSymbolsForFile(ctx, "src/file.ts"),
    [{ name: "handle", kind: "function", exported: true }],
  );
});

// ---------- Test 12: fileImportsTargetMatching shares compatibility ----------

test("fileImportsTargetMatching uses the same compatibility logic as listImportTargetsForFile", () => {
  const ctx = graphContext(
    legacyImportFact("src/route.ts", "./handler"),
    futureImportFact("src/route.ts", "openai"),
    legacyImportFact("src/route.ts", "leftpad"),
  );
  // Both helpers must see all three facts (across the two
  // shapes); the predicate then filters.
  assert.deepEqual(
    fileImportsTargetMatching(ctx, "src/route.ts", (target) => target.startsWith("./")),
    ["./handler"],
  );
  assert.deepEqual(
    fileImportsTargetMatching(ctx, "src/route.ts", (target) => target === "openai"),
    ["openai"],
  );
});

// ---------- Test 13: production JS/TS provider still emits legacy import-fact subject shape ----------

test("production JS/TS provider still emits legacy import-fact subject shape", async () => {
  // Confirm the producer is unchanged per the decision memo:
  // import-fact subject is `"<file>:<target>"`, value has
  // `source` + `target`. The fixture is the example repo's
  // EvidenceGraph after a fresh refresh — but it has no
  // imports, so we run the provider directly against a temp
  // dir.
  const root = await mkdtemp(join(tmpdir(), "rekon-import-helper-compat-"));
  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    runCli(["init", "--root", root, "--json"]);
    // Add a small source file with imports so the provider
    // has something to extract.
    const sourcePath = join(root, "src/example-imports.ts");
    await (await import("node:fs/promises")).writeFile(
      sourcePath,
      "import { foo } from './helper';\nimport leftpad from 'leftpad';\nexport function go() {}\n",
      "utf8",
    );
    runCli(["refresh", "--root", root, "--json"]);

    const graphPath = await findLatestEvidenceGraphFile(root);
    assert.ok(graphPath, "EvidenceGraph artifact must exist");
    const graph = JSON.parse(await readFile(graphPath, "utf8"));
    const importFacts = (graph.facts ?? []).filter(
      (fact) => fact.kind === "import" && fact.provenance?.file === "src/example-imports.ts",
    );
    assert.ok(
      importFacts.length >= 2,
      `expected at least 2 import facts; got ${importFacts.length}`,
    );
    // The producer is unchanged — legacy subject shape
    // `"<file>:<target>"`. The helper handles it.
    for (const fact of importFacts) {
      assert.match(fact.subject, /^src\/example-imports\.ts:/);
      assert.equal(fact.value?.source, "src/example-imports.ts");
      assert.equal(typeof fact.value?.target, "string");
    }
    // And the helper reads those targets correctly against
    // production data.
    const ctx = { evidenceGraph: graph };
    const targets = listImportTargetsForFile(ctx, "src/example-imports.ts");
    assert.ok(
      targets.includes("./helper") && targets.includes("leftpad"),
      `helper must read production import targets, got ${JSON.stringify(targets)}`,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---------- Test 14: artifacts validate remains clean after helper update ----------

test("rekon artifacts validate remains clean after helper update", async () => {
  // Use the example repo directly — the helper change is
  // consumer-only, so an existing refresh + validate against
  // examples/simple-js-ts must still pass.
  const root = await mkdtemp(join(tmpdir(), "rekon-import-helper-validate-"));
  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    runCli(["init", "--root", root, "--json"]);
    runCli(["refresh", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(result.valid, true);
    assert.deepEqual(result.issues ?? [], []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---------- Test 15 (BONUS): graph-aware filter consumes production import facts via the helper ----------

test("graph-aware filter consumes production import facts via the compatibility-aware helper", () => {
  // End-to-end at the kernel level: a route-handler-with-
  // service finding whose details lack `imports`, but the
  // EvidenceGraph carries a legacy-shape import fact for
  // the route file pointing at `*/handler`. The
  // graph-aware filter's EvidenceGraph branch must now
  // fire (previously fell through to ObservedRepo siblings
  // because the helper missed legacy facts against
  // production-shaped data).
  const file = "src/api/widgets/route.ts";
  const finding = {
    id: "rh-legacy-graph",
    type: "architecture",
    severity: "medium",
    title: "Route should construct deps",
    description: "Route construct and inject deps rule fired.",
    subjects: [file],
    files: [file],
    ruleId: "routes.construct_and_inject_deps",
    details: {},
  };
  const ctx = {
    evidenceGraph: {
      facts: [legacyImportFact(file, "./handler")],
    },
  };
  const decision = applyFindingGraphFilters({ finding, graphContext: ctx });
  assert.ok(decision, "graph-aware filter must fire via EvidenceGraph branch");
  assert.equal(decision.reason, "route-handler-with-service");
  assert.equal(decision.confidence, "high");
  assert.deepEqual(decision.usedArtifacts, ["EvidenceGraph"]);
});

// ---------- helpers ----------

async function findLatestEvidenceGraphFile(root) {
  const dir = join(root, ".rekon", "artifacts", "evidence");
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    return undefined;
  }
  const matches = entries
    .filter((name) => name.startsWith("EvidenceGraph-") && name.endsWith(".json"))
    .sort();
  if (matches.length === 0) return undefined;
  return join(dir, matches[matches.length - 1]);
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
