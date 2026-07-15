// Cluster-A divergence detector v1 (WO-9, Phase 1 queue slot 1).
//
// Declared-vs-observed divergence against the COMPILED grammar, riding the
// policy evaluator's FindingReport (the same refresh route as every policy
// rule). Pinned constraints (docs/work-orders/
// wo-9-cluster-a-divergence-detector.md):
//   - Jurisdiction is absolute: law derives only from packs in
//     findingsEligiblePackIds (base + declared + ratified archetypes).
//     Unratified archetype law never reaches a finding.
//   - Every finding carries its law: the `law` payload cites the
//     declaration diverged from, with pack id and tier.
//   - Non-production paths are excluded (classic isNonProductionPath
//     parity - the WO-4.1 follow-up folded in here).
//   - Precision comes from detector design against the FP gauntlet
//     (classic's named suppression shapes), never from filters.
//
// Decision memo: docs/strategy/cluster-a-divergence-detector-decision.md.

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import {
  type EffectiveArchitectureGrammar,
  assignGrammarLayer,
  matchForbiddenTypeSuffixes,
} from "@rekon/capability-ontology";
import type { Finding } from "@rekon/kernel-findings";

/** WO-18: the package-boundary axis belongs to the package-platform school;
 * it fires only when this pack is findings-eligible (jurisdiction absolute). */
const PACKAGE_PLATFORM_PACK_ID = "grammar-archetype-package-platform";

export type WorkspacePackageRef = { name: string; dir: string };

/** Workspace packages (name + dir) from manifests, read fail-soft as data
 * (the WO-14 B loadDeclaredRoots pattern). The package-boundary axis uses
 * these to tell a public-surface import from a deep import. */
export async function loadWorkspacePackages(repoRoot: string): Promise<WorkspacePackageRef[]> {
  const packages: WorkspacePackageRef[] = [];
  const collect = async (dir: string): Promise<void> => {
    try {
      const pkg = JSON.parse(await readFile(join(repoRoot, dir, "package.json"), "utf8")) as {
        name?: string;
        workspaces?: string[] | { packages?: string[] };
      };

      if (dir !== "" && typeof pkg.name === "string" && pkg.name) {
        packages.push({ name: pkg.name, dir });
      }

      if (dir === "") {
        const globs = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces?.packages ?? [];

        for (const glob of globs) {
          if (glob.endsWith("/*")) {
            const parent = glob.slice(0, -2);

            try {
              const children = await readdir(join(repoRoot, parent), { withFileTypes: true });

              for (const child of children.filter((c) => c.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
                await collect(`${parent}/${child.name}`);
              }
            } catch {
              // Missing workspace parent - skip.
            }
          } else if (!glob.includes("*")) {
            await collect(glob);
          }
        }
      }
    } catch {
      // No manifest at this level - fine.
    }
  };

  await collect("");

  return packages.sort((a, b) => a.dir.localeCompare(b.dir));
}

export const GRAMMAR_DIVERGENCE_RULE_ID = "grammar.divergence";

export type GrammarDivergenceAxis =
  | "layer_import"
  | "canonical_gap"
  | "canonical_bypass"
  | "ownership"
  | "placement"
  | "package_boundary";

export type GrammarDivergenceLaw = {
  axis: GrammarDivergenceAxis;
  packId: string;
  tier: "base" | "archetype" | "overlay" | "declared";
  /** The declaration diverged from (edge, rule id, contract row, ...). */
  declaration: string;
};

type FactLike = {
  kind: string;
  subject: string;
  value: Record<string, unknown>;
};

export type GrammarDivergenceInput = {
  facts: ReadonlyArray<FactLike>;
  grammar: EffectiveArchitectureGrammar;
  /** OwnershipMap entries (path -> ownerSystem), when the artifact exists. */
  ownershipEntries?: ReadonlyArray<{ path: string; ownerSystem: string }>;
  /** Lowercased canonical nouns from the repo's compiled vocabulary (WO-13; nouns only). */
  vocabularyNouns?: ReadonlySet<string>;
  /** Transparency counter: vocabulary-exempted suffix suppressions are counted, never silent (WO-13). */
  stats?: { vocabularyExemptions: number };
  /** Workspace packages (WO-18 package-boundary axis; archetype-tier). */
  workspacePackages?: ReadonlyArray<WorkspacePackageRef>;
  /** CapabilityContract rows, when the artifact exists. */
  contractEntries?: ReadonlyArray<{
    id: string;
    status?: string;
    allowedSystems?: string[];
    forbiddenSystems?: string[];
    capabilityRef?: { subjects?: string[] };
  }>;
};

/**
 * Classic `isNonProductionPath` parity (lib/path-filters.ts, read as
 * reference): tests, mocks, generated, tools, devtools, dev/debug
 * segments, canary markers. Production scope only - the FP class classic
 * suppressed wholesale.
 */
export function isNonProductionPath(filePath: string): boolean {
  const normalized = filePath.replaceAll("\\", "/").replace(/^\.\//, "");
  const lower = normalized.toLowerCase();

  if (
    lower.includes("/__tests__/")
    || lower.includes("/test/")
    || lower.includes("/tests/")
    || lower.includes(".test.")
    || lower.includes(".spec.")
  ) {
    return true;
  }

  if (lower.includes("/__mocks__/") || lower.includes("/mocks/") || lower.includes(".mock.")) {
    return true;
  }

  const base = lower.split("/").at(-1) ?? "";

  if (base.startsWith("mock")) {
    return true;
  }

  if (
    lower.includes("/generated/")
    || lower.includes(".generated.")
    || lower.includes(".snapshot.")
    || lower.includes(".g.ts")
    || lower.endsWith(".d.ts")
  ) {
    return true;
  }

  // WO-12: a top-level tests/ directory is non-production; the segment
  // list carried only the slash-prefixed form ("/tests/"), which a
  // repo-root tests/ tree never matches.
  if (lower.startsWith("tests/")) {
    return true;
  }

  if (
    lower.startsWith("test/")
    || lower.startsWith("integration/")
    || lower.startsWith("sample/")
    || lower.startsWith("samples/")
    || lower.startsWith("playground/")
    || lower.startsWith("docs/")
    || lower.startsWith("bench/")
    || lower.startsWith("benchmark/")
    || lower.startsWith("benchmarks/")
    || lower.startsWith(".yarn/")
  ) {
    return true;
  }

  if (lower.startsWith("tools/") || lower.includes("/devtools/")) {
    return true;
  }

  if (lower.includes("__canary_violation__")) {
    return true;
  }

  const parts = lower.split("/").filter(Boolean);

  if (parts.includes("dev") || parts.includes("debug") || parts.includes("__dev__")) {
    return true;
  }

  // Rekon additions in the same spirit: fixtures and example trees are
  // not production surfaces either.
  if (
    parts.includes("fixtures")
    || parts.includes("fixture")
    || parts.includes("__fixtures__")
    || parts.includes("__testfixtures__")
    || parts.includes("__tests_dts__")
    || parts.includes("testfixtures")
    || parts.includes("test-d")
    || parts.includes("type-tests")
    || parts.includes("examples")
    || parts.includes("scripts")
    || parts.includes("templates")
    || parts.slice(0, -1).some((part) => part.startsWith("template-"))
  ) {
    return true;
  }

  return false;
}

/** Map every effective-grammar entry back to the pack that supplied it. */
function packOf(grammar: EffectiveArchitectureGrammar, section: string, id: string): string {
  for (let index = grammar.notes.length - 1; index >= 0; index -= 1) {
    const note = grammar.notes[index]!;

    if (note.section === section && note.id === id) {
      return note.packId;
    }
  }

  return grammar.source.basePackId;
}

function tierOf(grammar: EffectiveArchitectureGrammar, packId: string): GrammarDivergenceLaw["tier"] {
  if (packId === grammar.source.basePackId) {
    return "base";
  }

  if (grammar.activation.ratifiedArchetypeIds.includes(packId)) {
    return "archetype";
  }

  if (packId === "operator-overrides") {
    return "declared";
  }

  return "overlay";
}

function finding(args: {
  axis: GrammarDivergenceAxis;
  law: GrammarDivergenceLaw;
  idDetail: string;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  files: string[];
  subjects: string[];
}): Finding {
  return {
    id: `${GRAMMAR_DIVERGENCE_RULE_ID}:${args.axis}:${args.idDetail}`,
    ruleId: GRAMMAR_DIVERGENCE_RULE_ID,
    type: "architecture",
    severity: args.severity,
    title: args.title,
    description: args.description,
    files: args.files,
    subjects: args.subjects,
    payload: { law: args.law },
  } as unknown as Finding;
}

function isCompositionSeamCall(
  facts: ReadonlyArray<FactLike>,
  source: string,
  resolvedTarget: string,
): boolean {
  const calls = facts.filter((fact) =>
    fact.kind === "call"
    && fact.value.source === source
    && fact.value.targetFile === resolvedTarget
    && fact.value.resolution === "import-binding"
    && typeof fact.value.targetSymbol === "string",
  );

  if (calls.length === 0) {
    return false;
  }

  const targetSymbols = calls.map((fact) => fact.value.targetSymbol as string);
  if (/(^|\/)infra\/(?:http|middleware|telemetry)(\/|$)/u.test(resolvedTarget)
    && targetSymbols.some((symbol) => /^with[A-Z]/u.test(symbol))) {
    return true;
  }

  if (/(^|\/)(?:assemblies|composition)(\/|$)/u.test(resolvedTarget)
    && targetSymbols.some((symbol) => /^(?:get|create|build)[A-Z].*(?:Service|Handler|Resolver)$/u.test(symbol))) {
    return true;
  }

  const sourceBuilds = facts.some((fact) =>
    fact.kind === "symbol"
    && fact.subject === source
    && fact.value.exported === true
    && typeof fact.value.name === "string"
    && /^build[A-Z]/u.test(fact.value.name),
  );
  return sourceBuilds && targetSymbols.every((symbol) => /^build[A-Z]/u.test(symbol));
}

/**
 * Evaluate declared-vs-observed divergence. Pure over its inputs; the
 * policy evaluator supplies facts from the latest EvidenceGraph and the
 * grammar compiled WITH the repo's own overrides (so ratification - and
 * therefore jurisdiction - is decided by the repo, never by this code).
 */
export function evaluateGrammarDivergence(input: GrammarDivergenceInput): Finding[] {
  const { facts, grammar } = input;
  const findings: Finding[] = [];

  // Layer assignment over production files only.
  const layerOf = new Map<string, string | undefined>();
  const layerFor = (file: string): string | undefined => {
    if (!layerOf.has(file)) {
      layerOf.set(file, assignGrammarLayer(grammar, file));
    }

    return layerOf.get(file);
  };

  const productionFilesByLayer = new Map<string, number>();

  for (const fact of facts) {
    if (fact.kind !== "file") {
      continue;
    }

    const path = fact.subject;

    if (isNonProductionPath(path)) {
      continue;
    }

    const layer = layerFor(path);

    if (layer) {
      productionFilesByLayer.set(layer, (productionFilesByLayer.get(layer) ?? 0) + 1);
    }
  }

  // Declared topology law from RATIFIED packs only (the topologies map is
  // populated exclusively from packs that entered the effective grammar).
  const forbiddenEdges = new Map<string, { packId: string; declaration: string }>();
  const requiredEdges = new Map<string, { packId: string; declaration: string }>();

  const eligibleTopologyPacks = new Set(grammar.findingsEligiblePackIds ?? []);

  for (const [packId, topology] of grammar.topologies) {
    // WO-15: only findings-eligible packs' topology backs findings (the
    // map can now carry overlay/override topology, and could carry
    // advisory topology - eligibility is the one gate).
    if (!eligibleTopologyPacks.has(packId)) {
      continue;
    }

    for (const edge of topology.layerEdges) {
      const key = `${edge.fromLayer}->${edge.toLayer}`;
      const declaration = `${topology.source} layerEdges ${key}`;

      if (edge.forbidden) {
        forbiddenEdges.set(key, { packId, declaration });
      }

      if (edge.required) {
        requiredEdges.set(key, { packId, declaration });
      }
    }
  }

  // ---- Axis: layer imports (symbol-level) + canonical bypass ------------
  // FP-gauntlet shapes handled by design, not filters:
  //   - type_only_file: type-only specifiers never fire (erased at build).
  //   - route_handler_with_service: allowed edges are simply not forbidden.
  //   - factory_file_creates_deps / empty_constructor_stub: no import-law
  //     violation means no finding; the detector never fires on file shape.
  const observedEdges = new Map<string, number>();
  const seenViolations = new Set<string>();

  for (const fact of facts) {
    if (fact.kind !== "import_specifier") {
      continue;
    }

    const source = String(fact.value.source ?? fact.subject.split(":")[0] ?? "");
    const resolvedTarget = typeof fact.value.resolvedTarget === "string" ? fact.value.resolvedTarget : undefined;

    if (!resolvedTarget || fact.value.typeOnly === true) {
      continue;
    }

    if (isNonProductionPath(source) || isNonProductionPath(resolvedTarget)) {
      continue;
    }

    const fromLayer = layerFor(source);
    const toLayer = layerFor(resolvedTarget);

    if (!fromLayer || !toLayer || fromLayer === toLayer) {
      continue;
    }

    observedEdges.set(`${fromLayer}->${toLayer}`, (observedEdges.get(`${fromLayer}->${toLayer}`) ?? 0) + 1);

    const edgeKey = `${fromLayer}->${toLayer}`;
    const forbidden = forbiddenEdges.get(edgeKey);
    const fromDefinition = grammar.layers.get(fromLayer);
    const cannotImport = fromDefinition?.cannotImport.includes(toLayer) === true;

    if (!forbidden && !cannotImport) {
      continue;
    }

    if (isCompositionSeamCall(facts, source, resolvedTarget)) {
      continue;
    }

    const violationKey = `${source}->${resolvedTarget}`;

    if (seenViolations.has(violationKey)) {
      continue;
    }

    seenViolations.add(violationKey);

    // Bypass: the forbidden edge has a declared canonical 2-step path
    // through an intermediate layer (e.g. route->domain forbidden while
    // route->service and service->domain are required) - the import
    // circumvents a DECLARED canonical path. No declaration, no bypass.
    let bypassVia: string | undefined;

    for (const intermediate of grammar.layers.keys()) {
      if (
        requiredEdges.has(`${fromLayer}->${intermediate}`)
        && requiredEdges.has(`${intermediate}->${toLayer}`)
      ) {
        bypassVia = intermediate;
        break;
      }
    }

    const packId = forbidden?.packId ?? packOf(grammar, "layers", fromLayer);
    const declaration = forbidden?.declaration
      ?? `${fromDefinition?.source ?? "layers"} cannotImport ${toLayer}`;

    if (bypassVia) {
      findings.push(finding({
        axis: "canonical_bypass",
        law: { axis: "canonical_bypass", packId, tier: tierOf(grammar, packId), declaration },
        idDetail: `${source}:${resolvedTarget}`,
        severity: "high",
        title: `${fromLayer} bypasses the canonical ${fromLayer}->${bypassVia}->${toLayer} path`,
        description: `${source} imports ${resolvedTarget} (${fromLayer}->${toLayer}); the ratified topology forbids the direct edge and declares the canonical path through ${bypassVia}.`,
        files: [source],
        subjects: [`${source}:${resolvedTarget}`],
      }));
      continue;
    }

    findings.push(finding({
      axis: "layer_import",
      law: { axis: "layer_import", packId, tier: tierOf(grammar, packId), declaration },
      idDetail: `${source}:${resolvedTarget}`,
      severity: "high",
      title: `${fromLayer} imports ${toLayer} against ratified layer law`,
      description: `${source} imports ${resolvedTarget} (${fromLayer}->${toLayer}); the ratified grammar forbids this edge.`,
      files: [source],
      subjects: [`${source}:${resolvedTarget}`],
    }));
  }

  // ---- Axis: canonical gap ----------------------------------------------
  // A gap fires ONLY where a canonical path is DECLARED (required edge in
  // a ratified topology) and unsatisfied while both layers are populated.
  for (const [edgeKey, law] of requiredEdges) {
    const [fromLayer, toLayer] = edgeKey.split("->") as [string, string];

    if ((productionFilesByLayer.get(fromLayer) ?? 0) === 0 || (productionFilesByLayer.get(toLayer) ?? 0) === 0) {
      continue;
    }

    if ((observedEdges.get(edgeKey) ?? 0) > 0) {
      continue;
    }

    findings.push(finding({
      axis: "canonical_gap",
      law: { axis: "canonical_gap", packId: law.packId, tier: tierOf(grammar, law.packId), declaration: law.declaration },
      idDetail: edgeKey,
      severity: "medium",
      title: `Declared canonical edge ${edgeKey} is unsatisfied`,
      description: `The ratified topology requires ${fromLayer} to reach ${toLayer}; both layers are populated but no production import realizes the edge.`,
      files: [],
      subjects: [edgeKey],
    }));
  }

  // ---- Axis: placement (file-type / forbidden-type law) ------------------
  for (const fact of facts) {
    if (fact.kind !== "file") {
      continue;
    }

    const path = fact.subject;

    if (isNonProductionPath(path)) {
      continue;
    }

    // WO-18: a declared generated layer is exempt from placement law (the
    // WO-15 generated class as a layer; keyed on layer id, the Factory-role
    // pattern).
    if (assignGrammarLayer(grammar, path) === "generated") {
      continue;
    }

    for (const match of matchForbiddenTypeSuffixes(grammar, path, input.vocabularyNouns)) {
      if (match.vocabularyExempted) {
        // WO-13: the suffix token is a declared canonical noun in this
        // repo's vocabulary. Counted, never silent - a declaration can't
        // swallow a hygiene class invisibly.
        if (input.stats) {
          input.stats.vocabularyExemptions += 1;
        }

        continue;
      }

      const forbidden = match.forbidden;
      const packId = packOf(grammar, "forbiddenTypes", forbidden.id);

      findings.push(finding({
        axis: "placement",
        law: {
          axis: "placement",
          packId,
          tier: tierOf(grammar, packId),
          declaration: `${forbidden.source} forbiddenTypes.${forbidden.id}`,
        },
        idDetail: `${path}:${forbidden.id}`,
        severity: "medium",
        title: `File name uses forbidden type "${forbidden.id}"`,
        description: `${path} ends with "${forbidden.id}": ${forbidden.reason}`,
        files: [path],
        subjects: [path],
      }));
    }
  }

  // ---- Axis: ownership (declared contracts x OwnershipMap) ---------------
  const ownerOf = new Map<string, string>();

  for (const entry of input.ownershipEntries ?? []) {
    ownerOf.set(entry.path.replace(/^\.\//, ""), entry.ownerSystem);
  }

  for (const contract of input.contractEntries ?? []) {
    if (contract.status && contract.status !== "configured") {
      continue;
    }

    const allowed = contract.allowedSystems ?? [];
    const forbiddenSystems = contract.forbiddenSystems ?? [];

    if (allowed.length === 0 && forbiddenSystems.length === 0) {
      continue;
    }

    for (const subject of contract.capabilityRef?.subjects ?? []) {
      if (isNonProductionPath(subject)) {
        continue;
      }

      const owner = ownerOf.get(subject.replace(/^\.\//, ""));

      if (!owner) {
        continue;
      }

      const violatesAllowed = allowed.length > 0 && !allowed.includes(owner);
      const violatesForbidden = forbiddenSystems.includes(owner);

      if (!violatesAllowed && !violatesForbidden) {
        continue;
      }

      findings.push(finding({
        axis: "ownership",
        law: {
          axis: "ownership",
          packId: "capability-contract",
          tier: "declared",
          declaration: `CapabilityContract ${contract.id} ${violatesForbidden ? "forbiddenSystems" : "allowedSystems"}`,
        },
        idDetail: `${contract.id}:${subject}`,
        severity: "high",
        title: `Capability subject owned by "${owner}" violates contract ${contract.id}`,
        description: violatesForbidden
          ? `${subject} is owned by ${owner}, which the contract forbids.`
          : `${subject} is owned by ${owner}; the contract allows [${allowed.join(", ")}].`,
        files: [subject],
        subjects: [subject],
      }));
    }
  }

  // ---- Axis: package_boundary (WO-18; cross-package imports go through
  // the package's public surface). Symbol-level law the topology schema
  // can't express: an import_specifier whose resolvedTarget lies inside
  // another workspace package but was not reached through that package's
  // name is a deep-import violation. Purpose claim (operator:wo-18#
  // package-boundary): deep imports rot the public surface until its
  // barrels die (the WO-16 forty-dead-barrels discovery is this law's
  // evidence); the public surface is where package contracts live.
  const boundaryEligible = (grammar.findingsEligiblePackIds ?? []).includes(PACKAGE_PLATFORM_PACK_ID);

  if (boundaryEligible && input.workspacePackages?.length) {
    const byDirLength = [...input.workspacePackages].sort((a, b) => b.dir.length - a.dir.length);
    const packageOf = (path: string): WorkspacePackageRef | undefined =>
      byDirLength.find((pkg) => path === pkg.dir || path.startsWith(`${pkg.dir}/`));
    const seen = new Set<string>();

    for (const fact of facts) {
      if (fact.kind !== "import_specifier") {
        continue;
      }

      const source = typeof fact.value.source === "string" ? fact.value.source : "";
      const resolved = typeof fact.value.resolvedTarget === "string" ? fact.value.resolvedTarget : "";
      const specifier = typeof fact.value.target === "string" ? fact.value.target : "";

      if (!source || !resolved || isNonProductionPath(source)) {
        continue;
      }

      const targetPackage = packageOf(resolved);

      if (!targetPackage) {
        continue;
      }

      const sourcePackage = packageOf(source);

      if (sourcePackage?.dir === targetPackage.dir) {
        continue;
      }

      if (specifier === targetPackage.name || specifier.startsWith(`${targetPackage.name}/`)) {
        // Reached through the public surface - the contract held.
        continue;
      }

      const key = `${source}->${resolved}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      findings.push(finding({
        axis: "package_boundary",
        law: {
          axis: "package_boundary",
          packId: PACKAGE_PLATFORM_PACK_ID,
          tier: "archetype",
          declaration: "operator:wo-18#package-boundary",
        },
        idDetail: `${source}->${resolved}`,
        severity: "medium",
        title: `Deep import into ${targetPackage.name}`,
        description: `${source} imports ${resolved} via "${specifier}" instead of through ${targetPackage.name}'s public surface. Deep imports rot the public surface until its barrels die; the public surface is where package contracts live.`,
        files: [source],
        subjects: [source, resolved],
      }));
    }
  }

  return findings;
}
