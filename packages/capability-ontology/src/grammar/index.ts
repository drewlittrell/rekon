// Architecture grammar: packs, overrides, and the effective-grammar
// compiler (WO-4).
//
// Follows the capability vocabulary's pack + overlay + override pattern:
// Rekon ships canonical packs, operator overrides extend canon (and
// supersede on key collision, recorded as such), invalid config fails
// loudly, and Rekon never creates or mutates operator files. Enforcement
// (detectors / lint rules consuming the compiled grammar) belongs to the
// Phase 1 queue per docs/strategy/detection-design-decisions.md; this
// module is declared law plus its audit trail.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ArchitectureGrammarPackSchema,
  type ArchitectureGrammarPack,
  type ArchitectureGrammarPackInput,
  type GrammarAntiPattern,
  type GrammarFileType,
  type GrammarLayer,
  type GrammarPattern,
  type GrammarSequentialPattern,
  type GrammarVerbCategory,
} from "./schema.js";
import { grammarBasePack } from "./packs/grammar-base.js";
import { grammarProjectOverlayExample } from "./packs/grammar-project-overlay-example.js";
import { grammarArchetypeFullstackLayered } from "./packs/grammar-archetype-fullstack-layered.js";
import { grammarArchetypeServiceLayered } from "./packs/grammar-archetype-service-layered.js";
import { grammarArchetypeBackendLayered } from "./packs/grammar-archetype-backend-layered.js";
import { grammarArchetypeDomainLibrary } from "./packs/grammar-archetype-domain-library.js";

export * from "./schema.js";
export {
  grammarBasePack,
  grammarProjectOverlayExample,
  grammarArchetypeFullstackLayered,
  grammarArchetypeServiceLayered,
  grammarArchetypeBackendLayered,
  grammarArchetypeDomainLibrary,
};

/** The four archetype packs seeded from classic's BUILTIN_TOPOLOGY_TEMPLATES (WO-4.1). */
export const BUILTIN_GRAMMAR_ARCHETYPE_PACKS: ReadonlyArray<ArchitectureGrammarPackInput> = Object.freeze([
  grammarArchetypeFullstackLayered,
  grammarArchetypeServiceLayered,
  grammarArchetypeBackendLayered,
  grammarArchetypeDomainLibrary,
]);

/** Jurisdiction tier; absent tier resolves from kind for pre-amendment packs. */
export function resolveGrammarPackTier(pack: { tier?: "base" | "archetype" | "overlay"; kind: "base" | "overlay" }): "base" | "archetype" | "overlay" {
  return pack.tier ?? (pack.kind === "base" ? "base" : "overlay");
}

export const ARCHITECTURE_GRAMMAR_OVERRIDES_PATH = ".rekon/architecture-grammar.overrides.json";

export const BUILTIN_GRAMMAR_PACKS: ReadonlyArray<ArchitectureGrammarPackInput> = Object.freeze([
  grammarBasePack,
  grammarProjectOverlayExample,
  ...BUILTIN_GRAMMAR_ARCHETYPE_PACKS,
]);

export function getBuiltinGrammarPack(id: string): ArchitectureGrammarPackInput | undefined {
  return BUILTIN_GRAMMAR_PACKS.find((pack) => pack.id === id);
}

export function validateGrammarPack(pack: unknown): ArchitectureGrammarPack {
  return ArchitectureGrammarPackSchema.parse(pack);
}

export type GrammarOverrideNote = {
  section: string;
  id: string;
  packId: string;
  action: "extended" | "superseded";
};

export type EffectiveArchitectureGrammar = {
  source: {
    basePackId: string;
    overlayPackIds: string[];
    archetypePackIds: string[];
    overridesPath: string | null;
  };
  /**
   * Activation per WO-4.1: declared grammar always wins; ratified
   * archetypes compile in and may back findings; unratified archetypes
   * never enter the effective grammar in default mode (advisory compiles
   * include them but findingsEligiblePackIds still excludes them). The
   * inferred-as-proposal layer is reserved for the actuator-track
   * bootstrapping port and not implemented here.
   */
  activation: {
    ratifiedArchetypeIds: string[];
    unratifiedArchetypeIds: string[];
    advisory: boolean;
  };
  /** Packs whose content may back findings. Lint consumers must respect this. */
  findingsEligiblePackIds: string[];
  topologies: Map<string, NonNullable<ArchitectureGrammarPack["topology"]>>;
  layers: Map<string, GrammarLayer>;
  verbCategories: Map<string, GrammarVerbCategory>;
  fileTypes: Map<string, GrammarFileType>;
  forbiddenTypes: Map<string, ArchitectureGrammarPack["forbiddenTypes"][number]>;
  patterns: Map<string, GrammarPattern>;
  antiPatterns: Map<string, GrammarAntiPattern>;
  sequentialPatterns: Map<string, GrammarSequentialPattern>;
  hubClassification: ArchitectureGrammarPack["hubClassification"];
  naming: ArchitectureGrammarPack["naming"];
  notes: GrammarOverrideNote[];
};

export type CompileEffectiveGrammarInput = {
  /** Overlay packs to apply on top of the base canon (opt-in, never automatic). */
  overlays?: ReadonlyArray<ArchitectureGrammarPackInput>;
  /** Archetype packs present for consideration (default: the builtin four). */
  archetypes?: ReadonlyArray<ArchitectureGrammarPackInput>;
  /**
   * Archetypes the repo has ratified. Merged with the "archetypes" array in
   * the overrides file (the same operator surface).
   */
  ratifiedArchetypeIds?: ReadonlyArray<string>;
  /** Advisory evaluation: include unratified archetypes WITHOUT findings eligibility. */
  advisory?: boolean;
  /** Pre-loaded operator overrides (partial pack shape; may carry "archetypes"). */
  overrides?: unknown;
  overridesPath?: string | null;
};

function mergeSection<T extends { id: string }>(
  target: Map<string, T>,
  entries: ReadonlyArray<T> | undefined,
  packId: string,
  section: string,
  notes: GrammarOverrideNote[],
): void {
  for (const entry of entries ?? []) {
    notes.push({
      section,
      id: entry.id,
      packId,
      action: target.has(entry.id) ? "superseded" : "extended",
    });
    target.set(entry.id, entry);
  }
}

/**
 * Compile base canon + overlays + operator overrides into the effective
 * grammar. Overlays and overrides extend canon; on id collision the later
 * layer supersedes and the collision is recorded in notes (same rules as
 * the vocabulary compiler). Throws on invalid pack or override shapes.
 */
export function compileEffectiveGrammar(
  input: CompileEffectiveGrammarInput = {},
): EffectiveArchitectureGrammar {
  const base = validateGrammarPack(grammarBasePack);
  const overlays = (input.overlays ?? []).map((overlay) => validateGrammarPack(overlay));
  const candidates = (input.archetypes ?? BUILTIN_GRAMMAR_ARCHETYPE_PACKS).map((pack) =>
    validateGrammarPack(pack),
  );
  const overrideRecord =
    input.overrides && typeof input.overrides === "object" ? (input.overrides as Record<string, unknown>) : undefined;
  const configRatified = Array.isArray(overrideRecord?.archetypes)
    ? (overrideRecord.archetypes as unknown[]).filter((value): value is string => typeof value === "string")
    : [];
  const ratifiedIds = new Set([...(input.ratifiedArchetypeIds ?? []), ...configRatified]);
  const ratified = candidates.filter((pack) => ratifiedIds.has(pack.id));
  const unratified = candidates.filter((pack) => !ratifiedIds.has(pack.id));
  const advisory = input.advisory === true;
  const advisoryPacks = advisory ? unratified : [];

  const notes: GrammarOverrideNote[] = [];
  const effective: EffectiveArchitectureGrammar = {
    source: {
      basePackId: base.id,
      overlayPackIds: overlays.map((overlay) => overlay.id),
      archetypePackIds: [...ratified, ...advisoryPacks].map((pack) => pack.id),
      overridesPath: input.overridesPath ?? null,
    },
    activation: {
      ratifiedArchetypeIds: ratified.map((pack) => pack.id),
      unratifiedArchetypeIds: unratified.map((pack) => pack.id),
      advisory,
    },
    findingsEligiblePackIds: [],
    topologies: new Map(),
    layers: new Map(),
    verbCategories: new Map(),
    fileTypes: new Map(),
    forbiddenTypes: new Map(),
    patterns: new Map(),
    antiPatterns: new Map(),
    sequentialPatterns: new Map(),
    hubClassification: base.hubClassification,
    naming: base.naming,
    notes,
  };

  const applyPack = (pack: ArchitectureGrammarPack) => {
    mergeSection(effective.layers, pack.layers, pack.id, "layers", notes);
    mergeSection(effective.verbCategories, pack.verbCategories, pack.id, "verbCategories", notes);
    mergeSection(effective.fileTypes, pack.fileTypes, pack.id, "fileTypes", notes);
    mergeSection(effective.forbiddenTypes, pack.forbiddenTypes, pack.id, "forbiddenTypes", notes);
    mergeSection(effective.patterns, pack.patterns, pack.id, "patterns", notes);
    mergeSection(effective.antiPatterns, pack.antiPatterns, pack.id, "antiPatterns", notes);
    mergeSection(
      effective.sequentialPatterns,
      pack.sequentialPatterns,
      pack.id,
      "sequentialPatterns",
      notes,
    );

    if (pack.hubClassification) {
      effective.hubClassification = pack.hubClassification;
    }

    if (pack.naming) {
      effective.naming = pack.naming;
    }
  };

  applyPack(base);

  for (const pack of [...ratified, ...advisoryPacks]) {
    applyPack(pack);

    if (pack.topology) {
      effective.topologies.set(pack.id, pack.topology);
    }
  }

  for (const overlay of overlays) {
    applyPack(overlay);
  }

  effective.findingsEligiblePackIds = [
    base.id,
    ...ratified.map((pack) => pack.id),
    ...overlays.map((overlay) => overlay.id),
  ];

  if (input.overrides !== undefined && input.overrides !== null) {
    const overridePack = validateGrammarPack({
      id: "operator-overrides",
      version: "0",
      description: "Operator overrides loaded from " + ARCHITECTURE_GRAMMAR_OVERRIDES_PATH,
      kind: "overlay",
      provenance: { migratedFrom: "operator" },
      ...(input.overrides as Record<string, unknown>),
    });
    applyPack(overridePack);
    effective.findingsEligiblePackIds.push(overridePack.id);
  }

  const issues = resolveGrammarReferences(effective);

  if (issues.length > 0) {
    throw new Error(
      `architecture-grammar: effective grammar failed cross-reference resolution:\n- ${issues.join("\n- ")}`,
    );
  }

  return effective;
}

/**
 * Cross-reference resolution: layer verb-category references and verb
 * category layer references must resolve inside the effective grammar.
 * Returns human-readable issues (empty = resolved).
 */
export function resolveGrammarReferences(grammar: EffectiveArchitectureGrammar): string[] {
  const issues: string[] = [];
  const layerIds = new Set(grammar.layers.keys());
  const categoryIds = new Set(grammar.verbCategories.keys());

  for (const layer of grammar.layers.values()) {
    for (const category of layer.allowedVerbCategories) {
      if (!categoryIds.has(category)) {
        issues.push(`layer "${layer.id}" allows unknown verb category "${category}"`);
      }
    }
  }

  for (const category of grammar.verbCategories.values()) {
    for (const layer of [...category.allowedInLayers, ...category.forbiddenInLayers]) {
      if (!layerIds.has(layer)) {
        issues.push(`verb category "${category.id}" references unknown layer "${layer}"`);
      }
    }
  }

  return issues;
}

export type LoadGrammarOverridesResult = {
  overrides: unknown | null;
  path: string | null;
};

/**
 * Load operator grammar overrides from the repo workspace. Missing file is
 * fine (null); unparseable JSON fails loudly. Rekon never creates or
 * mutates this file.
 */
export function loadGrammarOverrides(repoRoot: string): LoadGrammarOverridesResult {
  const path = join(repoRoot, ARCHITECTURE_GRAMMAR_OVERRIDES_PATH);
  let raw: string;

  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { overrides: null, path: null };
    }

    throw error;
  }

  try {
    return { overrides: JSON.parse(raw), path: ARCHITECTURE_GRAMMAR_OVERRIDES_PATH };
  } catch (error) {
    throw new Error(
      `architecture-grammar: invalid JSON in ${ARCHITECTURE_GRAMMAR_OVERRIDES_PATH}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// ---------------------------------------------------------------------------
// Advisory evaluation (WO-4.1). Deterministic, layer-anchored checks usable
// before the Phase 1 detectors land: layer assignment by declared paths,
// forbidden topology edges over import pairs, and forbidden-type suffixes.
// Output is advisory ONLY - never findings; the lint chain gates emission on
// findingsEligiblePackIds and ratification.

export type GrammarAdvisoryInput = {
  /** Repo-relative file paths. */
  files: ReadonlyArray<string>;
  /** Import pairs (from file, to file), repo-relative. */
  imports?: ReadonlyArray<{ from: string; to: string }>;
  /** Lowercased canonical nouns from the repo's compiled vocabulary (WO-13). */
  vocabularyNouns?: ReadonlySet<string>;
};

export type GrammarAdvisory = {
  rule: "forbidden-layer-edge" | "layer-cannot-import" | "forbidden-type-suffix";
  file: string;
  detail: string;
  packId: string;
};

function globToRegExp(glob: string): RegExp {
  // Placeholder tokens keep the replace chain from re-processing its own
  // output (a bare `**` -> `.*` emits a `*` the next step would mangle
  // into `[^/]*`, silently limiting globstars to one path segment - found
  // by WO-9's layer-assignment tests).
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\//g, "\u0000")
    .replace(/\*\*/g, "\u0001")
    .replace(/\*/g, "[^/]*")
    .replaceAll("\u0000", "(?:.*/)?")
    .replaceAll("\u0001", ".*");

  return new RegExp(`^${escaped}$|/${escaped}$`);
}

/**
 * Most-specific-match-wins layer assignment (WO-11). The matching pattern
 * with the most path segments wins; ties break to the longest pattern;
 * remaining ties break to declaration order (Map insertion, then paths
 * order). This makes file-scoped sublayers expressible: an operator
 * overlay can carve "infra/http/withBatonContext.ts" out of "infra/**"
 * without the parent's broad glob always winning. With no competing
 * specific pattern, assignment is unchanged from first-match.
 */
export function assignGrammarLayer(
  grammar: EffectiveArchitectureGrammar,
  file: string,
): string | undefined {
  let best:
    | { layerId: string; segments: number; length: number; order: number }
    | undefined;
  let order = 0;

  for (const layer of grammar.layers.values()) {
    for (const pattern of layer.paths) {
      order += 1;

      if (!globToRegExp(pattern).test(file)) {
        continue;
      }

      const segments = pattern.split("/").filter(Boolean).length;
      const length = pattern.length;

      if (
        !best
        || segments > best.segments
        || (segments === best.segments && length > best.length)
      ) {
        best = { layerId: layer.id, segments, length, order };
      }
    }
  }

  return best?.layerId;
}

/**
 * The ONE forbidden-type suffix check (WO-13 unification; the placement
 * axis and the advisory evaluator both call this). Vocabulary-aware: a
 * matched suffix whose token, lowercased, is a canonical noun in the
 * repo's compiled vocabulary is marked exempted instead of firing -
 * nouns only; verbs and aliases never exempt. Callers count exemptions
 * so a vocabulary declaration can never silently swallow a hygiene
 * class.
 */
export type ForbiddenTypeSuffixMatch = {
  forbidden: { id: string; reason: string; source: string };
  vocabularyExempted: boolean;
};

export function matchForbiddenTypeSuffixes(
  grammar: EffectiveArchitectureGrammar,
  filePath: string,
  vocabularyNouns?: ReadonlySet<string>,
): ForbiddenTypeSuffixMatch[] {
  const stem = (filePath.split("/").at(-1) ?? "").replace(/\.[a-z]+$/i, "");
  const matches: ForbiddenTypeSuffixMatch[] = [];

  for (const forbidden of grammar.forbiddenTypes.values()) {
    if (!stem.endsWith(forbidden.id)) {
      continue;
    }

    matches.push({
      forbidden,
      vocabularyExempted: vocabularyNouns?.has(forbidden.id.toLowerCase()) ?? false,
    });
  }

  return matches;
}

/**
 * Evaluate the compiled grammar against observed files/imports and return
 * advisories. Pure and read-only; writes nothing and emits no findings.
 */
export function evaluateGrammarAdvisory(
  grammar: EffectiveArchitectureGrammar,
  input: GrammarAdvisoryInput,
): GrammarAdvisory[] {
  const advisories: GrammarAdvisory[] = [];
  const layerOf = new Map<string, string | undefined>();
  const layerFor = (file: string) => {
    if (!layerOf.has(file)) {
      layerOf.set(file, assignGrammarLayer(grammar, file));
    }

    return layerOf.get(file);
  };

  for (const file of input.files) {
    for (const match of matchForbiddenTypeSuffixes(grammar, file, input.vocabularyNouns)) {
      if (match.vocabularyExempted) {
        continue;
      }

      advisories.push({
        rule: "forbidden-type-suffix",
        file,
        detail: `file name uses forbidden type "${match.forbidden.id}": ${match.forbidden.reason}`,
        packId: "grammar-base",
      });
    }
  }

  const forbiddenEdges = new Map<string, string>();

  for (const [packId, topology] of grammar.topologies) {
    for (const edge of topology.layerEdges) {
      if (edge.forbidden) {
        forbiddenEdges.set(`${edge.fromLayer}->${edge.toLayer}`, packId);
      }
    }
  }

  for (const { from, to } of input.imports ?? []) {
    const fromLayer = layerFor(from);
    const toLayer = layerFor(to);

    if (!fromLayer || !toLayer || fromLayer === toLayer) {
      continue;
    }

    const edgePack = forbiddenEdges.get(`${fromLayer}->${toLayer}`);

    if (edgePack) {
      advisories.push({
        rule: "forbidden-layer-edge",
        file: from,
        detail: `${fromLayer} imports ${toLayer} (${to}) - forbidden by topology`,
        packId: edgePack,
      });
    }

    const fromDefinition = grammar.layers.get(fromLayer);

    if (fromDefinition?.cannotImport.includes(toLayer)) {
      advisories.push({
        rule: "layer-cannot-import",
        file: from,
        detail: `${fromLayer} imports ${toLayer} (${to}) - layer law forbids it`,
        packId: "grammar",
      });
    }
  }

  return advisories;
}
