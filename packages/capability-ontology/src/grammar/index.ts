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

export * from "./schema.js";
export { grammarBasePack, grammarProjectOverlayExample };

export const ARCHITECTURE_GRAMMAR_OVERRIDES_PATH = ".rekon/architecture-grammar.overrides.json";

export const BUILTIN_GRAMMAR_PACKS: ReadonlyArray<ArchitectureGrammarPackInput> = Object.freeze([
  grammarBasePack,
  grammarProjectOverlayExample,
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
    overridesPath: string | null;
  };
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
  /** Pre-loaded operator overrides (partial pack shape). */
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

  const notes: GrammarOverrideNote[] = [];
  const effective: EffectiveArchitectureGrammar = {
    source: {
      basePackId: base.id,
      overlayPackIds: overlays.map((overlay) => overlay.id),
      overridesPath: input.overridesPath ?? null,
    },
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

  for (const overlay of overlays) {
    applyPack(overlay);
  }

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
