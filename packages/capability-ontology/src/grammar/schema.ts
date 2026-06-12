// Architecture grammar pack schema (WO-4).
//
// The grammar is the prescriptive half of the declared layer: layers with
// import rules, file types with tiers and hub thresholds, naming grammar,
// patterns with structural signals, sequential step recipes, and
// anti-patterns with corrections. Content is ported from
// codebase-intel-classic's ontology directory as migration-source data
// (AGENTS.md rule 4: data ports, code never imports); every entry carries
// its classic source reference, and packages/capability-ontology/
// grammar-port-manifest.json carries the row-by-row audit.
//
// Carrier decision: docs/strategy/architecture-grammar-pack-decision.md.
// Grammar verb categories are a STRUCTURAL axis (what a verb's presence
// implies about a file's role in a layer); the capability vocabulary's
// CapabilityVerbCategory is a SEMANTIC axis (what a phrase means). Each
// grammar category bridges to the vocabulary axis via vocabularyCategory
// instead of forking the canon.

import { z } from "zod";

/** Opaque ported law data: classic YAML values may be records or arrays. */
const LawDataSchema = z.union([z.record(z.unknown()), z.array(z.unknown())]);

/** Classic provenance reference: "<file>#<key>" under classic's ontology/. */
// WO-13: operator rulings get an honest provenance form alongside the
// classic-shaped refs (the WO-11 wart, retired).
export const GrammarSourceRefSchema = z
  .string()
  .regex(/^(?:[a-z0-9-]+\.(?:ontology\.yaml|ts)#[A-Za-z0-9_.-]+|operator:[a-z0-9-]+(?:#[A-Za-z0-9_.-]+)?)$/, {
    message: "grammar provenance must be '<classic-file>#<key>' or 'operator:<ruling-ref>'",
  });

export const GrammarLayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  // Classic uses -1 for layers outside the import stack (e.g. config).
  position: z.number().int(),
  paths: z.array(z.string()).default([]),
  allowedTypes: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  forbidden: z.array(z.string()).default([]),
  canImport: z.array(z.string()).default([]),
  cannotImport: z.array(z.string()).default([]),
  allowedVerbCategories: z.array(z.string()).default([]),
  source: GrammarSourceRefSchema,
});

export const GrammarVerbCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  canonicalVerbs: z.array(z.string()).default([]),
  allowedInLayers: z.array(z.string()).default([]),
  forbiddenInLayers: z.array(z.string()).default([]),
  structuralImplications: LawDataSchema.default({}),
  /**
   * Bridge to the capability vocabulary's semantic CapabilityVerbCategory.
   * The grammar references vocabulary canon; it never forks it.
   */
  vocabularyCategory: z.enum([
    "read",
    "write",
    "create",
    "delete",
    "transform",
    "validate",
    "navigate",
    "communicate",
    "system",
  ]),
  source: GrammarSourceRefSchema,
});

export const GrammarHubClassificationSchema = z.object({
  definiteHubPercentile: z.number(),
  probableHubPercentile: z.number(),
  probableHubRatio: z.number(),
  minDefiniteHubFanIn: z.number(),
  minProbableHubFanIn: z.number().optional(),
  source: GrammarSourceRefSchema,
});

export const GrammarFileTypeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  // A file type may belong to one layer or several (classic uses both shapes).
  layer: z.union([z.string(), z.array(z.string())]).optional(),
  tier: z.string().optional(),
  elevatedFrom: z.array(z.string()).optional(),
  grammar: LawDataSchema.default({}),
  behavior: LawDataSchema.optional(),
  detection: LawDataSchema.optional(),
  source: GrammarSourceRefSchema,
});

export const GrammarForbiddenTypeSchema = z.object({
  id: z.string().min(1),
  reason: z.string(),
  alternatives: z.array(z.string()).default([]),
  source: GrammarSourceRefSchema,
});

export const GrammarPatternSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  definition: z.string(),
  structuralSignals: z.array(z.string()).default([]),
  allowedLocations: z.array(z.string()).optional(),
  forbiddenLocations: z.array(z.string()).optional(),
  details: LawDataSchema.default({}),
  source: GrammarSourceRefSchema,
});

export const GrammarAntiPatternSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  dont: z.string().optional(),
  do: z.string().optional(),
  reason: z.string(),
  // Examples may be single snippets or lists of snippets in classic.
  examples: z.record(z.union([z.string(), z.array(z.string())])).optional(),
  details: LawDataSchema.default({}),
  source: GrammarSourceRefSchema,
});

export const GrammarSequentialStepSchema = z.object({
  step: z.number().int().min(1),
  name: z.string(),
  action: z.string(),
  example: z.string().optional(),
  verbCategory: z.string().optional(),
  // Classic mixes booleans with annotated strings (e.g. "conditional").
  mustHappen: z.union([z.boolean(), z.string()]).optional(),
});

export const GrammarSequentialPatternSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  steps: z.array(GrammarSequentialStepSchema).default([]),
  details: LawDataSchema.default({}),
  source: GrammarSourceRefSchema,
});

export const GrammarNamingSchema = z.object({
  principles: LawDataSchema.default({}),
  pathNaming: LawDataSchema.optional(),
  directoryNaming: LawDataSchema.optional(),
  fileNamingByExtension: LawDataSchema.optional(),
  fileNaming: LawDataSchema.optional(),
  artifacts: LawDataSchema.optional(),
  exports: LawDataSchema.optional(),
  capabilityNaming: LawDataSchema.optional(),
  layerRoleCompatibility: LawDataSchema.optional(),
  roleCollision: LawDataSchema.optional(),
  namingExceptions: LawDataSchema.optional(),
  sources: z.array(GrammarSourceRefSchema).default([]),
});

export const GrammarTopologyEdgeSchema = z.object({
  fromLayer: z.string().min(1),
  toLayer: z.string().min(1),
  required: z.boolean(),
  forbidden: z.boolean(),
  source: GrammarSourceRefSchema.optional(),
});

/** Topology law ported from classic's BUILTIN_TOPOLOGY_TEMPLATES (WO-4.1). */
export const GrammarTopologySchema = z.object({
  archetype: z.string().min(1),
  description: z.string(),
  requiredLayers: z.array(z.string().min(1)),
  layerEdges: z.array(GrammarTopologyEdgeSchema).default([]),
  source: GrammarSourceRefSchema,
});

export const ArchitectureGrammarPackSchema = z.object({
  /** Stable pack identifier, e.g. "grammar-base". */
  id: z.string().min(1),
  version: z.string().min(1),
  description: z.string(),
  /** Base canon vs operator-facing overlay example. */
  kind: z.enum(["base", "overlay"]),
  /**
   * Jurisdiction tier (WO-4.1): base law applies everywhere; archetype law
   * backs findings only when the repo ratifies the archetype in config;
   * overlays are operator-owned. Absent tier resolves from kind
   * (base -> "base", overlay -> "overlay") for pre-amendment packs.
   */
  tier: z.enum(["base", "archetype", "overlay"]).optional(),
  /** Topology law for archetype packs (required layers + layer edges). */
  topology: GrammarTopologySchema.optional(),
  /** Classic migration provenance for the pack as a whole. */
  provenance: z.object({
    migratedFrom: z.string(),
    note: z.string().optional(),
  }),
  layers: z.array(GrammarLayerSchema).default([]),
  verbCategories: z.array(GrammarVerbCategorySchema).default([]),
  hubClassification: GrammarHubClassificationSchema.optional(),
  fileTypes: z.array(GrammarFileTypeSchema).default([]),
  forbiddenTypes: z.array(GrammarForbiddenTypeSchema).default([]),
  patterns: z.array(GrammarPatternSchema).default([]),
  antiPatterns: z.array(GrammarAntiPatternSchema).default([]),
  sequentialPatterns: z.array(GrammarSequentialPatternSchema).default([]),
  naming: GrammarNamingSchema.optional(),
});

export type ArchitectureGrammarPack = z.infer<typeof ArchitectureGrammarPackSchema>;
/** Authoring shape: fields with defaults are optional on input. */
export type ArchitectureGrammarPackInput = z.input<typeof ArchitectureGrammarPackSchema>;
export type GrammarLayer = z.infer<typeof GrammarLayerSchema>;
export type GrammarVerbCategory = z.infer<typeof GrammarVerbCategorySchema>;
export type GrammarPattern = z.infer<typeof GrammarPatternSchema>;
export type GrammarAntiPattern = z.infer<typeof GrammarAntiPatternSchema>;
export type GrammarSequentialPattern = z.infer<typeof GrammarSequentialPatternSchema>;
export type GrammarFileType = z.infer<typeof GrammarFileTypeSchema>;
export type GrammarTopology = z.infer<typeof GrammarTopologySchema>;
export type GrammarTopologyEdge = z.infer<typeof GrammarTopologyEdgeSchema>;
