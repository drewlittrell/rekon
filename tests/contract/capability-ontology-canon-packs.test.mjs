// Contract tests for capability ontology canon packs v1.
//
// Rekon now ships built-in canon packs (base + archetype overlays)
// instead of treating `.rekon/capability-ontology.json` as a
// user-authored baseline. Repo-local overrides extend or supersede
// canon; the canonical override path is
// `.rekon/capability-ontology.overrides.json`. Legacy
// `.rekon/capability-ontology.json` is accepted as compatibility
// when overrides is absent.
//
// Tests pin:
//   1.  base pack exists.
//   2.  nextjs-app pack exists.
//   3.  library-package pack exists.
//   4.  monorepo pack exists.
//   5.  built-in packs compile deterministically.
//   6.  base pack includes expected common verbs.
//   7.  base pack includes expected common nouns.
//   8.  override aliases supersede built-in aliases.
//   9.  override canonical terms extend built-in canon.
//   10. override noise terms are preserved in effective ontology.
//   11. missing override file is accepted.
//   12. `.rekon/capability-ontology.overrides.json` is preferred
//       over legacy `.rekon/capability-ontology.json`.
//   13. legacy `.rekon/capability-ontology.json` is accepted when
//       overrides file is absent.
//   14. unknown pack id fails clearly.
//   15. config `extends` selects overlay packs.
//   16. duplicate pack ids dedupe.
//   17. suggestion report preview targets
//       `.rekon/capability-ontology.overrides.json`.
//   18. CapabilityNormalizationReport includes basePack /
//       overlayPacks / overridePath metadata.
//   19. CapabilityMap is not mutated.
//   20. EvidenceGraph is not mutated.
//   21. artifacts validate remains clean.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  BASE_PACK_ID,
  BUILTIN_CANON_PACKS,
  basePack,
  buildCapabilityOntologySuggestionReport,
  compileEffectiveCapabilityOntology,
  detectOverlayPacks,
  getBuiltinCanonPack,
  libraryPackagePack,
  listBuiltinCanonPackIds,
  loadCapabilityOntologyConfig,
  monorepoPack,
  nextjsAppPack,
  resolvePacks,
} from "../../packages/capability-ontology/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- 1-4: pack existence ----------

test("base canon pack exists", () => {
  assert.equal(basePack.id, "base");
  assert.equal(basePack.isBase, true);
  assert.equal(getBuiltinCanonPack("base"), basePack);
});

test("nextjs-app overlay pack exists", () => {
  assert.equal(nextjsAppPack.id, "nextjs-app");
  assert.equal(getBuiltinCanonPack("nextjs-app"), nextjsAppPack);
});

test("library-package overlay pack exists", () => {
  assert.equal(libraryPackagePack.id, "library-package");
  assert.equal(getBuiltinCanonPack("library-package"), libraryPackagePack);
});

test("monorepo overlay pack exists", () => {
  assert.equal(monorepoPack.id, "monorepo");
  assert.equal(getBuiltinCanonPack("monorepo"), monorepoPack);
});

// ---------- 5: deterministic compilation ----------

test("built-in canon packs compile deterministically (same hash twice)", () => {
  const a = compileEffectiveCapabilityOntology({
    overlayPackIds: ["nextjs-app", "library-package", "monorepo"],
  });
  const b = compileEffectiveCapabilityOntology({
    overlayPackIds: ["nextjs-app", "library-package", "monorepo"],
  });
  assert.equal(a.effectiveHash, b.effectiveHash);
  assert.deepEqual(a.verbs.canonical, b.verbs.canonical);
  assert.deepEqual(a.nouns.canonical, b.nouns.canonical);
  assert.deepEqual(a.source.overlayPacks, ["nextjs-app", "library-package", "monorepo"]);
  assert.equal(a.source.basePack, BASE_PACK_ID);
});

// ---------- 6: base canonical verbs ----------

test("base pack includes expected common verbs", () => {
  const ontology = compileEffectiveCapabilityOntology();
  const expected = [
    "get",
    "set",
    "create",
    "update",
    "delete",
    "fetch",
    "validate",
    "render",
    "parse",
    "publish",
  ];
  for (const verb of expected) {
    assert.ok(
      ontology.verbs.canonical.includes(verb),
      `expected base canonical verb '${verb}' to be present, got: ${ontology.verbs.canonical.join(", ")}`,
    );
  }
});

// ---------- 7: base canonical nouns ----------

test("base pack includes expected common nouns", () => {
  const ontology = compileEffectiveCapabilityOntology();
  const expected = [
    "user",
    "session",
    "token",
    "config",
    "file",
    "route",
    "service",
    "report",
    "artifact",
    "data",
  ];
  for (const noun of expected) {
    assert.ok(
      ontology.nouns.canonical.includes(noun),
      `expected base canonical noun '${noun}' to be present, got: ${ontology.nouns.canonical.join(", ")}`,
    );
  }
});

// ---------- 8: override aliases supersede built-in aliases ----------

test("override aliases supersede built-in aliases on key collision", () => {
  // `retrieve` -> `get` is a built-in base alias. Override remaps
  // `retrieve` -> `fetch` (also canonical) and we expect the
  // override to win.
  const ontology = compileEffectiveCapabilityOntology({
    config: {
      version: "0.1.0",
      verbs: { aliases: { retrieve: "fetch" } },
    },
  });
  assert.equal(ontology.verbs.aliasToCanonical.retrieve, "fetch");
});

// ---------- 9: override canonical terms extend built-in canon ----------

test("override canonical terms extend built-in canon", () => {
  const ontology = compileEffectiveCapabilityOntology({
    config: {
      version: "0.1.0",
      verbs: { canonical: ["dispatch"] },
      nouns: { canonical: ["invoice"] },
    },
  });
  assert.ok(ontology.verbs.canonical.includes("get"), "built-in canon preserved");
  assert.ok(ontology.verbs.canonical.includes("dispatch"), "override canonical added");
  assert.ok(ontology.nouns.canonical.includes("user"), "built-in canon preserved");
  assert.ok(ontology.nouns.canonical.includes("invoice"), "override canonical added");
});

// ---------- 10: override noise terms preserved ----------

test("override noise terms are preserved in effective ontology", () => {
  const ontology = compileEffectiveCapabilityOntology({
    config: {
      version: "0.1.0",
      verbs: { noise: ["maybe"] },
      nouns: { noise: ["thing"] },
      noise: { verbs: ["legacy-noise-verb"], nouns: ["legacy-noise-noun"] },
    },
  });
  assert.ok(ontology.verbs.noise.includes("maybe"));
  assert.ok(ontology.verbs.noise.includes("legacy-noise-verb"));
  assert.ok(ontology.nouns.noise.includes("thing"));
  assert.ok(ontology.nouns.noise.includes("legacy-noise-noun"));
});

// ---------- 11: missing override file is accepted ----------

test("missing override file is accepted (returns found: false)", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-canon-packs-missing-"));
  try {
    await mkdir(join(work, ".rekon"), { recursive: true });
    const result = await loadCapabilityOntologyConfig(work);
    assert.equal(result.found, false);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 12: overrides preferred over legacy ----------

test("`.rekon/capability-ontology.overrides.json` is preferred over legacy", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-canon-packs-prefer-"));
  try {
    await mkdir(join(work, ".rekon"), { recursive: true });
    await writeFile(
      join(work, ".rekon/capability-ontology.overrides.json"),
      JSON.stringify({ version: "0.1.0", nouns: { canonical: ["preferred-noun"] } }, null, 2),
    );
    await writeFile(
      join(work, ".rekon/capability-ontology.json"),
      JSON.stringify({ version: "0.1.0", nouns: { canonical: ["legacy-noun"] } }, null, 2),
    );
    const result = await loadCapabilityOntologyConfig(work);
    assert.equal(result.found, true);
    assert.equal(result.configPath, ".rekon/capability-ontology.overrides.json");
    assert.equal(result.overrideKind, "canonical-override");
    assert.equal(result.legacyOverrideIgnored, true);
    assert.deepEqual(result.config?.nouns?.canonical, ["preferred-noun"]);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 13: legacy fallback ----------

test("legacy `.rekon/capability-ontology.json` is accepted when overrides absent", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-canon-packs-legacy-"));
  try {
    await mkdir(join(work, ".rekon"), { recursive: true });
    await writeFile(
      join(work, ".rekon/capability-ontology.json"),
      JSON.stringify({ version: "0.1.0", nouns: { canonical: ["legacy-noun"] } }, null, 2),
    );
    const result = await loadCapabilityOntologyConfig(work);
    assert.equal(result.found, true);
    assert.equal(result.configPath, ".rekon/capability-ontology.json");
    assert.equal(result.overrideKind, "legacy-compat");
    assert.equal(result.legacyOverrideIgnored, undefined);
    assert.deepEqual(result.config?.nouns?.canonical, ["legacy-noun"]);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 14: unknown pack id fails clearly ----------

test("unknown pack id fails clearly", () => {
  assert.throws(
    () => resolvePacks(["unknown-pack-id"]),
    /Unknown capability ontology pack: unknown-pack-id/,
  );
});

// ---------- 15: config extends selects overlay packs ----------

test("config `extends` selects overlay packs (overrides caller-supplied auto-detection)", () => {
  const ontology = compileEffectiveCapabilityOntology({
    config: {
      version: "0.1.0",
      extends: ["base", "library-package"],
    },
    overlayPackIds: ["nextjs-app"], // ignored because config.extends wins
  });
  assert.deepEqual(ontology.source.overlayPacks, ["library-package"]);
  // library-package canonical noun should be present
  assert.ok(ontology.nouns.canonical.includes("sdk"));
  // nextjs-app canonical noun should NOT be present
  assert.ok(!ontology.nouns.canonical.includes("page"));
});

// ---------- 16: duplicate pack ids dedupe ----------

test("duplicate pack ids dedupe deterministically", () => {
  const packs = resolvePacks(["nextjs-app", "nextjs-app", "library-package", "nextjs-app"]);
  const ids = packs.map((p) => p.id);
  assert.deepEqual(ids, ["base", "nextjs-app", "library-package"]);
});

// ---------- 17: suggestion preview targets overrides path ----------

test("suggestion report preview targets `.rekon/capability-ontology.overrides.json`", () => {
  const ledgerHeader = {
    artifactType: "CapabilityNormalizationReviewLedger",
    artifactId: "ledger-test",
    schemaVersion: "0.1.0",
    generatedAt: "2026-05-26T00:00:00.000Z",
    subject: { repoId: "test" },
    producer: { id: "test", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
  };
  const ledger = {
    header: ledgerHeader,
    entries: [
      {
        id: "entry-1",
        term: "demo",
        termKind: "noun",
        decision: "extend-ontology",
        reason: "test",
        createdAt: "2026-05-26T00:00:00.000Z",
      },
    ],
    summary: { total: 1, extendOntology: 1, renameSymbol: 0, noiseFilter: 0, defer: 0 },
  };
  const report = buildCapabilityOntologySuggestionReport({
    header: {
      artifactType: "CapabilityOntologySuggestionReport",
      artifactId: "report-test",
      schemaVersion: "0.1.0",
      generatedAt: "2026-05-26T00:00:00.000Z",
      subject: { repoId: "test" },
      producer: { id: "test", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    ledger,
    ledgerRef: {
      type: "CapabilityNormalizationReviewLedger",
      id: "ledger-test",
      path: ".rekon/artifacts/actions/ledger-test.json",
      digest: "fake-digest",
      schemaVersion: "0.1.0",
    },
  });
  assert.equal(report.preview.configPath, ".rekon/capability-ontology.overrides.json");
});

// ---------- 18: report includes source metadata ----------

test("CapabilityNormalizationReport includes basePack / overlayPacks / overridePath metadata", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-canon-packs-meta-"));
  try {
    await cp(exampleRoot, work, { recursive: true });
    spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    spawnSync("node", [cliPath, "capability", "ontology", "normalize", "--root", work, "--json"], {
      encoding: "utf8",
    });

    const projDir = join(work, ".rekon/artifacts/projections");
    const files = await readdir(projDir);
    const reportFile = files.find((f) => f.startsWith("CapabilityNormalizationReport-"));
    assert.ok(reportFile, "expected a CapabilityNormalizationReport artifact");
    const report = JSON.parse(await readFile(join(projDir, reportFile), "utf8"));

    assert.equal(report.ontology.basePack, "base");
    assert.ok(Array.isArray(report.ontology.overlayPacks));
    assert.equal(report.ontology.overridePath, undefined);
    assert.equal(report.ontology.systemSeedCount >= 0, true);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 19: CapabilityMap not mutated ----------

test("normalization does not mutate CapabilityMap", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-canon-packs-capmap-"));
  try {
    await cp(exampleRoot, work, { recursive: true });
    spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });

    const capMapDir = join(work, ".rekon/artifacts/projections");
    const beforeFiles = (await readdir(capMapDir)).filter((f) => f.startsWith("CapabilityMap-"));
    const beforeContents = await Promise.all(
      beforeFiles.map((f) => readFile(join(capMapDir, f), "utf8")),
    );

    spawnSync("node", [cliPath, "capability", "ontology", "normalize", "--root", work, "--json"], {
      encoding: "utf8",
    });

    const afterFiles = (await readdir(capMapDir)).filter((f) => f.startsWith("CapabilityMap-"));
    const afterContents = await Promise.all(
      afterFiles.map((f) => readFile(join(capMapDir, f), "utf8")),
    );

    assert.deepEqual(afterFiles, beforeFiles, "no new CapabilityMap artifacts");
    assert.deepEqual(afterContents, beforeContents, "CapabilityMap contents unchanged");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 20: EvidenceGraph not mutated ----------

test("normalization does not mutate EvidenceGraph", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-canon-packs-evidence-"));
  try {
    await cp(exampleRoot, work, { recursive: true });
    spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });

    const evidenceDir = join(work, ".rekon/artifacts/evidence");
    const beforeFiles = await readdir(evidenceDir);
    const beforeContents = await Promise.all(
      beforeFiles.map((f) => readFile(join(evidenceDir, f), "utf8")),
    );

    spawnSync("node", [cliPath, "capability", "ontology", "normalize", "--root", work, "--json"], {
      encoding: "utf8",
    });

    const afterFiles = await readdir(evidenceDir);
    const afterContents = await Promise.all(
      afterFiles.map((f) => readFile(join(evidenceDir, f), "utf8")),
    );

    assert.deepEqual(afterFiles, beforeFiles, "no new EvidenceGraph artifacts");
    assert.deepEqual(afterContents, beforeContents, "EvidenceGraph contents unchanged");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 21: artifacts validate stays clean ----------

test("rekon artifacts validate stays clean after a normalize run with override file", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-canon-packs-validate-"));
  try {
    await cp(exampleRoot, work, { recursive: true });
    spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });

    // Write an override file using new path.
    await mkdir(join(work, ".rekon"), { recursive: true });
    await writeFile(
      join(work, ".rekon/capability-ontology.overrides.json"),
      JSON.stringify(
        {
          version: "0.1.0",
          extends: ["base", "library-package"],
          nouns: { canonical: ["demo"] },
        },
        null,
        2,
      ),
    );

    spawnSync("node", [cliPath, "capability", "ontology", "normalize", "--root", work, "--json"], {
      encoding: "utf8",
    });

    const validateResult = spawnSync(
      "node",
      [cliPath, "artifacts", "validate", "--root", work, "--json"],
      { encoding: "utf8" },
    );

    assert.equal(validateResult.status, 0, validateResult.stderr || "validate failed");
    const validate = JSON.parse(validateResult.stdout);
    assert.equal(validate.valid, true, `validate not ok: ${JSON.stringify(validate.issues ?? [])}`);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- bonus: built-in pack list ----------

test("listBuiltinCanonPackIds returns the v1 ship set", () => {
  assert.deepEqual(listBuiltinCanonPackIds(), ["base", "nextjs-app", "library-package", "monorepo"]);
  assert.equal(BUILTIN_CANON_PACKS.length, 4);
});

// ---------- bonus: detectOverlayPacks returns conservative defaults ----------

test("detectOverlayPacks returns conservative defaults on empty repo", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-canon-packs-detect-"));
  try {
    const detection = await detectOverlayPacks(work);
    assert.deepEqual(detection.packIds, []);
    assert.equal(detection.signals.hasNextDep, false);
    assert.equal(detection.signals.hasAppDir, false);
    assert.equal(detection.signals.hasLibraryExports, false);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});
