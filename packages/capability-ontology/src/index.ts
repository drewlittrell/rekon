import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve as resolvePath } from "node:path";
import {
  type ArtifactHeader,
  type ArtifactRef,
} from "@rekon/kernel-artifacts";
import {
  type EvidenceFact,
  type EvidenceGraph,
} from "@rekon/kernel-evidence";
import {
  type ArtifactReader,
  type ArtifactWriter,
  type Projector,
  defineCapability,
} from "@rekon/sdk";

// ---------- Capability identity ----------

export const CAPABILITY_ONTOLOGY_CAPABILITY_ID = "@rekon/capability-ontology";
export const CAPABILITY_ONTOLOGY_PROJECTOR_ID =
  "@rekon/capability-ontology.normalization-projector";
export const CAPABILITY_ONTOLOGY_VERSION = "0.1.0";

// ---------- Layer 1: built-in baseline ontology ----------
//
// The built-in baseline is the read-only seed vocabulary every
// Rekon repo starts from. It is layered with optional config (see
// `loadCapabilityOntologyConfig`) and a tiny "system seed" set
// inside `compileEffectiveCapabilityOntology`. The translation
// layer model lives in the ontology decision memo; do not
// flatten this into a single config / report layer.

export type CapabilityVerbCategory =
  | "read"
  | "write"
  | "create"
  | "delete"
  | "transform"
  | "validate"
  | "navigate"
  | "communicate"
  | "system";

export type CapabilityNounCategory =
  | "domain"
  | "infrastructure"
  | "ui"
  | "process"
  | "data"
  | "system";

export type CapabilityOntologyConfig = {
  /** Schema version of the operator-supplied config (must equal "0.1.0" in v1). */
  version: string;
  verbs?: {
    canonical?: string[];
    aliases?: Record<string, string>;
    categories?: Record<string, CapabilityVerbCategory>;
    includeSystemVerbs?: boolean;
  };
  nouns?: {
    canonical?: string[];
    aliases?: Record<string, string>;
    categories?: Record<string, CapabilityNounCategory>;
    thresholds?: { autoMap?: number };
    includeSystemNouns?: boolean;
  };
  roles?: { canonical?: string[]; aliases?: Record<string, string> };
  patterns?: { canonical?: string[]; aliases?: Record<string, string> };
};

export type EffectiveCapabilityOntology = {
  version: string;
  source: {
    builtinVersion: string;
    configPath?: string;
    configHash?: string;
    systemSeedCount: number;
  };
  verbs: {
    canonical: string[];
    aliasToCanonical: Record<string, string>;
    categoryByCanonical: Record<string, CapabilityVerbCategory>;
  };
  nouns: {
    canonical: string[];
    aliasToCanonical: Record<string, string>;
    categoryByCanonical: Record<string, CapabilityNounCategory>;
    autoMapThreshold: number;
  };
  roles: { canonical: string[]; aliasToCanonical: Record<string, string> };
  patterns: { canonical: string[]; aliasToCanonical: Record<string, string> };
  effectiveHash: string;
};

const BUILTIN_VERBS: ReadonlyArray<{
  canonical: string;
  category: CapabilityVerbCategory;
  aliases?: string[];
}> = [
  { canonical: "get", category: "read", aliases: ["fetch", "load", "find", "lookup", "read"] },
  { canonical: "list", category: "read", aliases: ["all", "index", "enumerate"] },
  { canonical: "set", category: "write", aliases: ["assign", "store"] },
  { canonical: "save", category: "write", aliases: ["persist", "write"] },
  { canonical: "update", category: "write", aliases: ["modify", "patch", "edit", "change"] },
  { canonical: "create", category: "create", aliases: ["make", "build", "add", "new", "construct"] },
  { canonical: "delete", category: "delete", aliases: ["remove", "destroy", "drop"] },
  { canonical: "validate", category: "validate", aliases: ["verify", "check", "assert"] },
  { canonical: "render", category: "transform", aliases: ["draw", "paint", "display"] },
  { canonical: "parse", category: "transform", aliases: ["decode", "interpret"] },
  { canonical: "serialize", category: "transform", aliases: ["encode", "stringify"] },
  { canonical: "navigate", category: "navigate", aliases: ["route", "redirect", "goto"] },
  { canonical: "send", category: "communicate", aliases: ["dispatch", "emit", "publish", "post"] },
  { canonical: "receive", category: "communicate", aliases: ["subscribe", "listen", "consume"] },
];

const BUILTIN_NOUNS: ReadonlyArray<{
  canonical: string;
  category: CapabilityNounCategory;
  aliases?: string[];
}> = [
  { canonical: "user", category: "domain", aliases: ["account", "person", "member"] },
  { canonical: "session", category: "domain", aliases: ["login"] },
  { canonical: "token", category: "infrastructure", aliases: ["secret", "credential", "apikey"] },
  { canonical: "request", category: "infrastructure", aliases: ["req"] },
  { canonical: "response", category: "infrastructure", aliases: ["res", "reply"] },
  { canonical: "route", category: "infrastructure", aliases: ["endpoint", "url", "path"] },
  { canonical: "config", category: "infrastructure", aliases: ["configuration", "settings", "options"] },
  { canonical: "view", category: "ui", aliases: ["screen", "page"] },
  { canonical: "component", category: "ui", aliases: ["widget", "control"] },
  { canonical: "form", category: "ui", aliases: [] },
  { canonical: "report", category: "process", aliases: ["summary", "digest"] },
  { canonical: "job", category: "process", aliases: ["task", "worker"] },
  { canonical: "record", category: "data", aliases: ["row", "entity", "item", "doc", "document"] },
  { canonical: "list", category: "data", aliases: ["collection", "set", "array"] },
];

const BUILTIN_ROLES: ReadonlyArray<{ canonical: string; aliases?: string[] }> = [
  { canonical: "controller" },
  { canonical: "service", aliases: ["manager"] },
  { canonical: "repository", aliases: ["repo", "store", "dao"] },
  { canonical: "view" },
  { canonical: "handler", aliases: ["listener"] },
];

const BUILTIN_PATTERNS: ReadonlyArray<{ canonical: string; aliases?: string[] }> = [
  { canonical: "crud" },
  { canonical: "rest-route", aliases: ["restful", "rest"] },
  { canonical: "background-job", aliases: ["worker", "queue"] },
  { canonical: "validator" },
];

const SYSTEM_SEED_VERBS = ["build", "deploy", "test", "lint"] as const;

const BUILTIN_ONTOLOGY_VERSION = "0.1.0";

export const BUILTIN_CAPABILITY_ONTOLOGY = Object.freeze({
  version: BUILTIN_ONTOLOGY_VERSION,
  verbs: BUILTIN_VERBS,
  nouns: BUILTIN_NOUNS,
  roles: BUILTIN_ROLES,
  patterns: BUILTIN_PATTERNS,
  systemSeedVerbs: SYSTEM_SEED_VERBS,
});

// ---------- Config loading ----------

export type LoadOntologyConfigResult =
  | { found: false; configPath?: undefined; configHash?: undefined; config?: undefined }
  | { found: true; configPath: string; configHash: string; config: CapabilityOntologyConfig };

const DEFAULT_CONFIG_RELATIVE_PATH = ".rekon/capability-ontology.json";

export async function loadCapabilityOntologyConfig(
  repoRoot: string,
  relativePath: string = DEFAULT_CONFIG_RELATIVE_PATH,
): Promise<LoadOntologyConfigResult> {
  const absolute = join(resolvePath(repoRoot), relativePath);

  let raw: string;
  try {
    raw = await readFile(absolute, "utf8");
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return { found: false };
    }
    throw new Error(
      `Failed to read capability ontology config at ${relativePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `capability ontology config at ${relativePath} is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const config = assertCapabilityOntologyConfig(parsed, relativePath);
  const configHash = hashString(raw);

  return { found: true, configPath: relativePath, configHash, config };
}

function assertCapabilityOntologyConfig(
  value: unknown,
  origin: string,
): CapabilityOntologyConfig {
  if (!isRecord(value)) {
    throw new Error(`capability ontology config at ${origin} must be a JSON object.`);
  }

  if (value.version !== BUILTIN_ONTOLOGY_VERSION) {
    throw new Error(
      `capability ontology config at ${origin} declares unsupported version ${
        typeof value.version === "string" ? value.version : "<missing>"
      }. v1 supports only ${BUILTIN_ONTOLOGY_VERSION}.`,
    );
  }

  validateOntologyConfigSection(value.verbs, "verbs", origin, true);
  validateOntologyConfigSection(value.nouns, "nouns", origin, true);
  validateOntologyConfigSection(value.roles, "roles", origin, false);
  validateOntologyConfigSection(value.patterns, "patterns", origin, false);

  return value as CapabilityOntologyConfig;
}

function validateOntologyConfigSection(
  value: unknown,
  field: "verbs" | "nouns" | "roles" | "patterns",
  origin: string,
  allowCategories: boolean,
): void {
  if (value === undefined) {
    return;
  }
  if (!isRecord(value)) {
    throw new Error(
      `capability ontology config at ${origin}: ${field} must be an object when present.`,
    );
  }
  if (value.canonical !== undefined && !isStringArray(value.canonical)) {
    throw new Error(
      `capability ontology config at ${origin}: ${field}.canonical must be a string[] when present.`,
    );
  }
  if (value.aliases !== undefined && !isStringStringRecord(value.aliases)) {
    throw new Error(
      `capability ontology config at ${origin}: ${field}.aliases must be a Record<string, string> when present.`,
    );
  }
  if (allowCategories && value.categories !== undefined && !isStringStringRecord(value.categories)) {
    throw new Error(
      `capability ontology config at ${origin}: ${field}.categories must be a Record<string, string> when present.`,
    );
  }
  if (field === "nouns" && isRecord(value.thresholds)) {
    if (
      value.thresholds.autoMap !== undefined
      && (typeof value.thresholds.autoMap !== "number"
        || !Number.isFinite(value.thresholds.autoMap)
        || value.thresholds.autoMap < 0
        || value.thresholds.autoMap > 1)
    ) {
      throw new Error(
        `capability ontology config at ${origin}: nouns.thresholds.autoMap must be a number between 0 and 1 when present.`,
      );
    }
  }
}

// ---------- Effective ontology compiler ----------

export type CompileEffectiveCapabilityOntologyInput = {
  config?: CapabilityOntologyConfig;
  configPath?: string;
  configHash?: string;
};

const DEFAULT_NOUN_AUTOMAP_THRESHOLD = 0.65;

export function compileEffectiveCapabilityOntology(
  input: CompileEffectiveCapabilityOntologyInput = {},
): EffectiveCapabilityOntology {
  const config = input.config;
  const includeSystemVerbs = config?.verbs?.includeSystemVerbs !== false;
  const includeSystemNouns = config?.nouns?.includeSystemNouns !== false;

  const verbCanonical = new Set<string>();
  const verbAliases: Record<string, string> = {};
  const verbCategories: Record<string, CapabilityVerbCategory> = {};

  for (const entry of BUILTIN_VERBS) {
    verbCanonical.add(entry.canonical);
    verbCategories[entry.canonical] = entry.category;
    for (const alias of entry.aliases ?? []) {
      verbAliases[alias.toLowerCase()] = entry.canonical;
    }
  }

  let systemSeedCount = 0;
  if (includeSystemVerbs) {
    for (const verb of SYSTEM_SEED_VERBS) {
      if (!verbCanonical.has(verb)) {
        verbCanonical.add(verb);
        verbCategories[verb] = "system";
        systemSeedCount += 1;
      }
    }
  }

  if (config?.verbs?.canonical) {
    for (const canonical of config.verbs.canonical) {
      verbCanonical.add(canonical.toLowerCase());
    }
  }
  if (config?.verbs?.aliases) {
    for (const [alias, canonical] of Object.entries(config.verbs.aliases)) {
      verbAliases[alias.toLowerCase()] = canonical.toLowerCase();
    }
  }
  if (config?.verbs?.categories) {
    for (const [canonical, category] of Object.entries(config.verbs.categories)) {
      if (isVerbCategory(category)) {
        verbCategories[canonical.toLowerCase()] = category;
      }
    }
  }

  const nounCanonical = new Set<string>();
  const nounAliases: Record<string, string> = {};
  const nounCategories: Record<string, CapabilityNounCategory> = {};

  for (const entry of BUILTIN_NOUNS) {
    nounCanonical.add(entry.canonical);
    nounCategories[entry.canonical] = entry.category;
    for (const alias of entry.aliases ?? []) {
      nounAliases[alias.toLowerCase()] = entry.canonical;
    }
  }

  if (!includeSystemNouns) {
    // System nouns are not currently distinct from domain nouns
    // in the built-in baseline; the toggle is preserved for
    // forward-compat with future "system" noun seeds.
  }

  if (config?.nouns?.canonical) {
    for (const canonical of config.nouns.canonical) {
      nounCanonical.add(canonical.toLowerCase());
    }
  }
  if (config?.nouns?.aliases) {
    for (const [alias, canonical] of Object.entries(config.nouns.aliases)) {
      nounAliases[alias.toLowerCase()] = canonical.toLowerCase();
    }
  }
  if (config?.nouns?.categories) {
    for (const [canonical, category] of Object.entries(config.nouns.categories)) {
      if (isNounCategory(category)) {
        nounCategories[canonical.toLowerCase()] = category;
      }
    }
  }

  const autoMapThreshold = config?.nouns?.thresholds?.autoMap ?? DEFAULT_NOUN_AUTOMAP_THRESHOLD;

  const roleCanonical = new Set<string>(BUILTIN_ROLES.map((entry) => entry.canonical));
  const roleAliases: Record<string, string> = {};
  for (const entry of BUILTIN_ROLES) {
    for (const alias of entry.aliases ?? []) {
      roleAliases[alias.toLowerCase()] = entry.canonical;
    }
  }
  if (config?.roles?.canonical) {
    for (const canonical of config.roles.canonical) {
      roleCanonical.add(canonical.toLowerCase());
    }
  }
  if (config?.roles?.aliases) {
    for (const [alias, canonical] of Object.entries(config.roles.aliases)) {
      roleAliases[alias.toLowerCase()] = canonical.toLowerCase();
    }
  }

  const patternCanonical = new Set<string>(BUILTIN_PATTERNS.map((entry) => entry.canonical));
  const patternAliases: Record<string, string> = {};
  for (const entry of BUILTIN_PATTERNS) {
    for (const alias of entry.aliases ?? []) {
      patternAliases[alias.toLowerCase()] = entry.canonical;
    }
  }
  if (config?.patterns?.canonical) {
    for (const canonical of config.patterns.canonical) {
      patternCanonical.add(canonical.toLowerCase());
    }
  }
  if (config?.patterns?.aliases) {
    for (const [alias, canonical] of Object.entries(config.patterns.aliases)) {
      patternAliases[alias.toLowerCase()] = canonical.toLowerCase();
    }
  }

  const ontology: Omit<EffectiveCapabilityOntology, "effectiveHash"> = {
    version: BUILTIN_ONTOLOGY_VERSION,
    source: {
      builtinVersion: BUILTIN_ONTOLOGY_VERSION,
      configPath: input.configPath,
      configHash: input.configHash,
      systemSeedCount,
    },
    verbs: {
      canonical: sortUnique(verbCanonical),
      aliasToCanonical: sortRecord(verbAliases),
      categoryByCanonical: sortRecord(verbCategories) as Record<string, CapabilityVerbCategory>,
    },
    nouns: {
      canonical: sortUnique(nounCanonical),
      aliasToCanonical: sortRecord(nounAliases),
      categoryByCanonical: sortRecord(nounCategories) as Record<string, CapabilityNounCategory>,
      autoMapThreshold,
    },
    roles: {
      canonical: sortUnique(roleCanonical),
      aliasToCanonical: sortRecord(roleAliases),
    },
    patterns: {
      canonical: sortUnique(patternCanonical),
      aliasToCanonical: sortRecord(patternAliases),
    },
  };

  const effectiveHash = hashString(JSON.stringify(ontology));
  return { ...ontology, effectiveHash };
}

// ---------- Lexical splitter ----------

export type CapabilitySplitConfidence = "high" | "medium" | "low";

export type CapabilityNameSplit = {
  tokens: string[];
  verb?: string;
  noun?: string;
  confidence: CapabilitySplitConfidence;
};

const SPLIT_TOKEN_RE = /[a-z]+|[A-Z]+(?=[A-Z][a-z])|[A-Z][a-z]+|[A-Z]+|[0-9]+/g;

export function splitCapabilityName(name: string): CapabilityNameSplit {
  const cleaned = (name ?? "").trim();
  if (cleaned.length === 0) {
    return { tokens: [], confidence: "low" };
  }

  // Replace non-word delimiters (snake_case, kebab-case, dots) with a
  // single space so the camelCase regex can still split sub-tokens.
  const delimited = cleaned.replace(/[._\-\s]+/g, " ");

  const tokens: string[] = [];
  for (const piece of delimited.split(" ")) {
    if (piece.length === 0) continue;
    const matches = piece.match(SPLIT_TOKEN_RE);
    if (matches) {
      for (const match of matches) {
        tokens.push(match.toLowerCase());
      }
    } else {
      tokens.push(piece.toLowerCase());
    }
  }

  if (tokens.length === 0) {
    return { tokens: [], confidence: "low" };
  }

  if (tokens.length === 1) {
    // Single-token name: ambiguous — could be verb-only or noun-only.
    return { tokens, verb: tokens[0], confidence: "low" };
  }

  const verb = tokens[0];
  const noun = tokens[tokens.length - 1];
  const confidence: CapabilitySplitConfidence = tokens.length === 2 ? "high" : "medium";

  return { tokens, verb, noun, confidence };
}

// ---------- Candidate extraction ----------

export type CapabilityCandidateKind =
  | "symbol"
  | "export"
  | "capability_hint"
  | "ownership_hint"
  | "system_seed";

export type CapabilityCandidateSource = {
  factId?: string;
  factKind?: string;
  path?: string;
  symbol?: string;
  exportName?: string;
  kind: CapabilityCandidateKind;
};

export type CapabilityCandidate = {
  id: string;
  raw: {
    name: string;
    verb?: string;
    noun?: string;
    splitConfidence: CapabilitySplitConfidence;
  };
  source: CapabilityCandidateSource;
};

export function extractCapabilityCandidates(graph: EvidenceGraph): CapabilityCandidate[] {
  const collected: CapabilityCandidate[] = [];
  let counter = 0;
  const seen = new Set<string>();

  for (const fact of graph.facts ?? []) {
    const candidate = candidateFromFact(fact, counter);
    if (!candidate) continue;
    const dedupeKey = `${candidate.source.kind}:${candidate.raw.name}:${candidate.source.path ?? ""}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    collected.push(candidate);
    counter += 1;
  }

  return collected;
}

function candidateFromFact(fact: EvidenceFact, index: number): CapabilityCandidate | null {
  const value = isRecord(fact.value) ? fact.value : {};
  const path = fact.subject;
  const baseId = `candidate-${index.toString(10).padStart(4, "0")}`;

  if (fact.kind === "symbol") {
    const symbol = stringFrom(value.name);
    if (!symbol) return null;
    const split = splitCapabilityName(symbol);
    return {
      id: baseId,
      raw: {
        name: symbol,
        verb: split.verb,
        noun: split.noun,
        splitConfidence: split.confidence,
      },
      source: { factId: fact.id, factKind: fact.kind, path, symbol, kind: "symbol" },
    };
  }

  if (fact.kind === "export") {
    const exportName = stringFrom(value.name);
    if (!exportName || exportName === "default") return null;
    const split = splitCapabilityName(exportName);
    return {
      id: baseId,
      raw: {
        name: exportName,
        verb: split.verb,
        noun: split.noun,
        splitConfidence: split.confidence,
      },
      source: { factId: fact.id, factKind: fact.kind, path, exportName, kind: "export" },
    };
  }

  if (fact.kind === "capability_hint") {
    const hintName = stringFrom(value.hint) ?? stringFrom(value.name) ?? path;
    const split = splitCapabilityName(hintName);
    return {
      id: baseId,
      raw: {
        name: hintName,
        verb: split.verb,
        noun: split.noun,
        splitConfidence: split.confidence,
      },
      source: { factId: fact.id, factKind: fact.kind, path, kind: "capability_hint" },
    };
  }

  if (fact.kind === "ownership_hint") {
    const ownerName = stringFrom(value.system) ?? path;
    const split = splitCapabilityName(ownerName);
    return {
      id: baseId,
      raw: {
        name: ownerName,
        verb: split.verb,
        noun: split.noun,
        splitConfidence: split.confidence,
      },
      source: { factId: fact.id, factKind: fact.kind, path, kind: "ownership_hint" },
    };
  }

  return null;
}

// ---------- Normalization ----------

export type CapabilityNormalizationStatus =
  | "normalized"
  | "unknown-verb"
  | "unknown-noun"
  | "unknown"
  | "ignored"
  | "low-confidence";

export type CapabilityNormalizationOutcome = {
  candidate: CapabilityCandidate;
  status: CapabilityNormalizationStatus;
  confidence: CapabilitySplitConfidence;
  message?: string;
  normalized?: {
    verb: string;
    noun: string;
    verbAliasApplied?: string;
    nounAliasApplied?: string;
    verbCategory?: CapabilityVerbCategory;
    nounCategory?: CapabilityNounCategory;
  };
};

export function normalizeCapabilityCandidates(input: {
  candidates: CapabilityCandidate[];
  ontology: EffectiveCapabilityOntology;
}): CapabilityNormalizationOutcome[] {
  return input.candidates.map((candidate) =>
    normalizeOneCandidate(candidate, input.ontology),
  );
}

function normalizeOneCandidate(
  candidate: CapabilityCandidate,
  ontology: EffectiveCapabilityOntology,
): CapabilityNormalizationOutcome {
  if (candidate.source.kind === "ownership_hint") {
    // Ownership hints are kept as candidates but classified
    // `ignored` so the report can audit them without claiming a
    // verb/noun pairing. Future slices may project ownership
    // into a separate role-level surface.
    return {
      candidate,
      status: "ignored",
      confidence: candidate.raw.splitConfidence,
      message: "ownership_hint candidate; not normalized in v1.",
    };
  }

  const verbRaw = candidate.raw.verb?.toLowerCase();
  const nounRaw = candidate.raw.noun?.toLowerCase();

  if (!verbRaw || !nounRaw) {
    return {
      candidate,
      status: "low-confidence",
      confidence: "low",
      message: "Lexical split did not yield both a verb and a noun.",
    };
  }

  const verbResult = lookupVerb(verbRaw, ontology);
  const nounResult = lookupNoun(nounRaw, ontology);

  if (verbResult && nounResult) {
    return {
      candidate,
      status: "normalized",
      confidence: candidate.raw.splitConfidence,
      normalized: {
        verb: verbResult.canonical,
        noun: nounResult.canonical,
        verbAliasApplied: verbResult.aliasApplied,
        nounAliasApplied: nounResult.aliasApplied,
        verbCategory: ontology.verbs.categoryByCanonical[verbResult.canonical],
        nounCategory: ontology.nouns.categoryByCanonical[nounResult.canonical],
      },
    };
  }

  if (!verbResult && !nounResult) {
    return {
      candidate,
      status: "unknown",
      confidence: candidate.raw.splitConfidence,
      message: `Verb "${verbRaw}" and noun "${nounRaw}" are not in the effective ontology.`,
    };
  }

  if (!verbResult) {
    return {
      candidate,
      status: "unknown-verb",
      confidence: candidate.raw.splitConfidence,
      message: `Verb "${verbRaw}" is not in the effective ontology.`,
      normalized: nounResult
        ? {
            verb: verbRaw,
            noun: nounResult.canonical,
            nounAliasApplied: nounResult.aliasApplied,
            nounCategory: ontology.nouns.categoryByCanonical[nounResult.canonical],
          }
        : undefined,
    };
  }

  return {
    candidate,
    status: "unknown-noun",
    confidence: candidate.raw.splitConfidence,
    message: `Noun "${nounRaw}" is not in the effective ontology.`,
    normalized: {
      verb: verbResult.canonical,
      noun: nounRaw,
      verbAliasApplied: verbResult.aliasApplied,
      verbCategory: ontology.verbs.categoryByCanonical[verbResult.canonical],
    },
  };
}

function lookupVerb(
  raw: string,
  ontology: EffectiveCapabilityOntology,
): { canonical: string; aliasApplied?: string } | null {
  if (ontology.verbs.canonical.includes(raw)) {
    return { canonical: raw };
  }
  const aliased = ontology.verbs.aliasToCanonical[raw];
  if (aliased) {
    return { canonical: aliased, aliasApplied: raw };
  }
  return null;
}

function lookupNoun(
  raw: string,
  ontology: EffectiveCapabilityOntology,
): { canonical: string; aliasApplied?: string } | null {
  if (ontology.nouns.canonical.includes(raw)) {
    return { canonical: raw };
  }
  const aliased = ontology.nouns.aliasToCanonical[raw];
  if (aliased) {
    return { canonical: aliased, aliasApplied: raw };
  }
  return null;
}

// ---------- CapabilityNormalizationReport ----------

export type CapabilityNormalizationReportSummary = {
  totalCandidates: number;
  normalized: number;
  unknownVerb: number;
  unknownNoun: number;
  unknown: number;
  ignored: number;
  aliasApplied: number;
  lowConfidence: number;
};

export type CapabilityNormalizationReportCandidate = {
  id: string;
  source: {
    artifactRef?: ArtifactRef;
    factId?: string;
    path?: string;
    symbol?: string;
    exportName?: string;
    kind: CapabilityCandidateKind;
  };
  raw: {
    name: string;
    verb?: string;
    noun?: string;
    splitConfidence: CapabilitySplitConfidence;
  };
  normalized?: {
    verb: string;
    noun: string;
    verbAliasApplied?: string;
    nounAliasApplied?: string;
    verbCategory?: CapabilityVerbCategory;
    nounCategory?: CapabilityNounCategory;
  };
  confidence: CapabilitySplitConfidence;
  status: CapabilityNormalizationStatus;
  message?: string;
};

export type CapabilityNormalizationReport = {
  header: ArtifactHeader;
  ontology: {
    source: "builtin" | "config" | "builtin+config";
    configPath?: string;
    configHash?: string;
    effectiveHash: string;
  };
  summary: CapabilityNormalizationReportSummary;
  candidates: CapabilityNormalizationReportCandidate[];
};

export type BuildCapabilityNormalizationReportInput = {
  header: ArtifactHeader;
  ontology: EffectiveCapabilityOntology;
  graph: EvidenceGraph;
  graphRef?: ArtifactRef;
};

export function buildCapabilityNormalizationReport(
  input: BuildCapabilityNormalizationReportInput,
): CapabilityNormalizationReport {
  const candidates = extractCapabilityCandidates(input.graph);
  const outcomes = normalizeCapabilityCandidates({
    candidates,
    ontology: input.ontology,
  });

  const reportCandidates: CapabilityNormalizationReportCandidate[] = outcomes.map((outcome) => ({
    id: outcome.candidate.id,
    source: {
      ...(input.graphRef ? { artifactRef: input.graphRef } : {}),
      factId: outcome.candidate.source.factId,
      path: outcome.candidate.source.path,
      symbol: outcome.candidate.source.symbol,
      exportName: outcome.candidate.source.exportName,
      kind: outcome.candidate.source.kind,
    },
    raw: outcome.candidate.raw,
    normalized: outcome.normalized,
    confidence: outcome.confidence,
    status: outcome.status,
    ...(outcome.message ? { message: outcome.message } : {}),
  }));

  const summary = summarize(reportCandidates);

  const ontologySource: CapabilityNormalizationReport["ontology"]["source"] = input.ontology.source
    .configPath
    ? "builtin+config"
    : "builtin";

  return {
    header: input.header,
    ontology: {
      source: ontologySource,
      configPath: input.ontology.source.configPath,
      configHash: input.ontology.source.configHash,
      effectiveHash: input.ontology.effectiveHash,
    },
    summary,
    candidates: reportCandidates,
  };
}

function summarize(
  candidates: CapabilityNormalizationReportCandidate[],
): CapabilityNormalizationReportSummary {
  let normalized = 0;
  let unknownVerb = 0;
  let unknownNoun = 0;
  let unknown = 0;
  let ignored = 0;
  let aliasApplied = 0;
  let lowConfidence = 0;

  for (const entry of candidates) {
    switch (entry.status) {
      case "normalized":
        normalized += 1;
        break;
      case "unknown-verb":
        unknownVerb += 1;
        break;
      case "unknown-noun":
        unknownNoun += 1;
        break;
      case "unknown":
        unknown += 1;
        break;
      case "ignored":
        ignored += 1;
        break;
      case "low-confidence":
        lowConfidence += 1;
        break;
    }

    if (entry.normalized?.verbAliasApplied || entry.normalized?.nounAliasApplied) {
      aliasApplied += 1;
    }
  }

  return {
    totalCandidates: candidates.length,
    normalized,
    unknownVerb,
    unknownNoun,
    unknown,
    ignored,
    aliasApplied,
    lowConfidence,
  };
}

// ---------- CapabilityNormalizationReviewLedger ----------
//
// Operator-facing review surface for the unknown / low-
// confidence terms produced by CapabilityNormalizationReport.
// The ledger is **append-only** and captures explicit operator
// decisions; it never mutates the ontology config, never
// touches CapabilityMap, and never re-runs the normalizer.

export type CapabilityNormalizationReviewDecision =
  | "extend-ontology"
  | "rename-symbol"
  | "noise-filter"
  | "defer";

export type CapabilityNormalizationReviewTermKind = "verb" | "noun" | "candidate";

export type CapabilityNormalizationReviewEntry = {
  id: string;
  term: string;
  termKind: CapabilityNormalizationReviewTermKind;
  decision: CapabilityNormalizationReviewDecision;
  reason: string;
  createdAt: string;
  createdBy?: string;
  sourceReportRef?: ArtifactRef;
  sourceCandidateId?: string;
  suggestedCanonical?: string;
};

export type CapabilityNormalizationReviewLedgerSummary = {
  total: number;
  extendOntology: number;
  renameSymbol: number;
  noiseFilter: number;
  defer: number;
};

export type CapabilityNormalizationReviewLedger = {
  header: ArtifactHeader;
  entries: CapabilityNormalizationReviewEntry[];
  summary: CapabilityNormalizationReviewLedgerSummary;
};

const VALID_REVIEW_DECISIONS: ReadonlySet<string> = new Set([
  "extend-ontology",
  "rename-symbol",
  "noise-filter",
  "defer",
]);

const VALID_REVIEW_TERM_KINDS: ReadonlySet<string> = new Set([
  "verb",
  "noun",
  "candidate",
]);

export function isCapabilityNormalizationReviewDecision(
  value: unknown,
): value is CapabilityNormalizationReviewDecision {
  return typeof value === "string" && VALID_REVIEW_DECISIONS.has(value);
}

export function isCapabilityNormalizationReviewTermKind(
  value: unknown,
): value is CapabilityNormalizationReviewTermKind {
  return typeof value === "string" && VALID_REVIEW_TERM_KINDS.has(value);
}

export function summarizeCapabilityNormalizationReviewLedger(
  entries: CapabilityNormalizationReviewEntry[],
): CapabilityNormalizationReviewLedgerSummary {
  let extendOntology = 0;
  let renameSymbol = 0;
  let noiseFilter = 0;
  let defer = 0;

  for (const entry of entries) {
    switch (entry.decision) {
      case "extend-ontology":
        extendOntology += 1;
        break;
      case "rename-symbol":
        renameSymbol += 1;
        break;
      case "noise-filter":
        noiseFilter += 1;
        break;
      case "defer":
        defer += 1;
        break;
    }
  }

  return {
    total: entries.length,
    extendOntology,
    renameSymbol,
    noiseFilter,
    defer,
  };
}

export function validateCapabilityNormalizationReviewLedger(
  value: unknown,
): { ok: true; ledger: CapabilityNormalizationReviewLedger } | { ok: false; reason: string } {
  if (!isRecord(value)) {
    return { ok: false, reason: "ledger must be an object" };
  }
  if (!isRecord(value.header)) {
    return { ok: false, reason: "ledger.header must be an object" };
  }
  const header = value.header as ArtifactHeader;
  if (header.artifactType !== "CapabilityNormalizationReviewLedger") {
    return {
      ok: false,
      reason: `ledger.header.artifactType must be "CapabilityNormalizationReviewLedger", got ${String(header.artifactType)}`,
    };
  }
  if (!Array.isArray((value as { entries?: unknown }).entries)) {
    return { ok: false, reason: "ledger.entries must be an array" };
  }
  const entriesRaw = (value as { entries: unknown[] }).entries;
  for (const entry of entriesRaw) {
    if (!isRecord(entry)) {
      return { ok: false, reason: "ledger.entries[*] must be objects" };
    }
    if (!isNonEmpty(entry.id)) {
      return { ok: false, reason: "ledger.entries[*].id must be a non-empty string" };
    }
    if (!isNonEmpty(entry.term)) {
      return { ok: false, reason: "ledger.entries[*].term must be a non-empty string" };
    }
    if (!isCapabilityNormalizationReviewTermKind(entry.termKind)) {
      return {
        ok: false,
        reason: "ledger.entries[*].termKind must be verb|noun|candidate",
      };
    }
    if (!isCapabilityNormalizationReviewDecision(entry.decision)) {
      return {
        ok: false,
        reason:
          "ledger.entries[*].decision must be extend-ontology|rename-symbol|noise-filter|defer",
      };
    }
    if (!isNonEmpty(entry.reason)) {
      return { ok: false, reason: "ledger.entries[*].reason must be a non-empty string" };
    }
    if (!isNonEmpty(entry.createdAt)) {
      return { ok: false, reason: "ledger.entries[*].createdAt must be a non-empty string" };
    }
  }
  const summary = isRecord((value as { summary?: unknown }).summary)
    ? (value as { summary: CapabilityNormalizationReviewLedgerSummary }).summary
    : summarizeCapabilityNormalizationReviewLedger(
      entriesRaw as CapabilityNormalizationReviewEntry[],
    );

  return {
    ok: true,
    ledger: {
      header,
      entries: entriesRaw as CapabilityNormalizationReviewEntry[],
      summary,
    },
  };
}

export type AppendCapabilityNormalizationReviewDecisionInput = {
  ledger?: CapabilityNormalizationReviewLedger;
  header: ArtifactHeader;
  entry: Omit<CapabilityNormalizationReviewEntry, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  };
};

export function appendCapabilityNormalizationReviewDecision(
  input: AppendCapabilityNormalizationReviewDecisionInput,
): CapabilityNormalizationReviewLedger {
  if (!isCapabilityNormalizationReviewDecision(input.entry.decision)) {
    throw new Error(
      `capability ontology review: decision must be one of extend-ontology|rename-symbol|noise-filter|defer; got ${String(input.entry.decision)}`,
    );
  }
  if (!isCapabilityNormalizationReviewTermKind(input.entry.termKind)) {
    throw new Error(
      `capability ontology review: termKind must be one of verb|noun|candidate; got ${String(input.entry.termKind)}`,
    );
  }
  if (!isNonEmpty(input.entry.term)) {
    throw new Error("capability ontology review: term must be a non-empty string.");
  }
  if (!isNonEmpty(input.entry.reason)) {
    throw new Error("capability ontology review: reason must be a non-empty string.");
  }

  const createdAt = input.entry.createdAt ?? new Date().toISOString();
  const entryId =
    input.entry.id
    ?? `review-${createdAt.replace(/[:.]/g, "-")}-${input.entry.termKind}-${slug(input.entry.term)}`;

  const newEntry: CapabilityNormalizationReviewEntry = {
    id: entryId,
    term: input.entry.term,
    termKind: input.entry.termKind,
    decision: input.entry.decision,
    reason: input.entry.reason,
    createdAt,
    ...(input.entry.createdBy ? { createdBy: input.entry.createdBy } : {}),
    ...(input.entry.sourceReportRef ? { sourceReportRef: input.entry.sourceReportRef } : {}),
    ...(input.entry.sourceCandidateId ? { sourceCandidateId: input.entry.sourceCandidateId } : {}),
    ...(input.entry.suggestedCanonical
      ? { suggestedCanonical: input.entry.suggestedCanonical }
      : {}),
  };

  const priorEntries = input.ledger?.entries ?? [];
  const entries: CapabilityNormalizationReviewEntry[] = [...priorEntries, newEntry];

  return {
    header: input.header,
    entries,
    summary: summarizeCapabilityNormalizationReviewLedger(entries),
  };
}

// ---------- Suggestion aggregation ----------

export type CapabilityNormalizationReviewSuggestion = {
  term: string;
  termKind: CapabilityNormalizationReviewTermKind;
  count: number;
  statuses: CapabilityNormalizationStatus[];
  exampleCandidateIds: string[];
};

export type SuggestUnknownTermsOptions = {
  /** Maximum number of suggestions to return. Default: 20. */
  limit?: number;
  /** Optional set of `${termKind}:${term}` keys already decided in the ledger. */
  excludeDecidedKeys?: ReadonlySet<string>;
};

export const DEFAULT_REVIEW_SUGGESTION_LIMIT = 20;

export function suggestUnknownTerms(
  report: CapabilityNormalizationReport,
  options: SuggestUnknownTermsOptions = {},
): CapabilityNormalizationReviewSuggestion[] {
  const limit = options.limit ?? DEFAULT_REVIEW_SUGGESTION_LIMIT;
  const excluded = options.excludeDecidedKeys ?? new Set<string>();

  const aggregates = new Map<
    string,
    {
      term: string;
      termKind: CapabilityNormalizationReviewTermKind;
      count: number;
      statuses: Set<CapabilityNormalizationStatus>;
      exampleCandidateIds: string[];
    }
  >();

  function ensure(
    term: string,
    termKind: CapabilityNormalizationReviewTermKind,
    status: CapabilityNormalizationStatus,
    candidateId: string,
  ): void {
    if (!term) return;
    const key = `${termKind}:${term}`;
    if (excluded.has(key)) return;
    let bucket = aggregates.get(key);
    if (!bucket) {
      bucket = {
        term,
        termKind,
        count: 0,
        statuses: new Set<CapabilityNormalizationStatus>(),
        exampleCandidateIds: [],
      };
      aggregates.set(key, bucket);
    }
    bucket.count += 1;
    bucket.statuses.add(status);
    if (bucket.exampleCandidateIds.length < 3) {
      bucket.exampleCandidateIds.push(candidateId);
    }
  }

  for (const candidate of report.candidates ?? []) {
    switch (candidate.status) {
      case "unknown-verb": {
        const verb = candidate.raw.verb;
        if (verb) ensure(verb, "verb", candidate.status, candidate.id);
        break;
      }
      case "unknown-noun": {
        const noun = candidate.raw.noun;
        if (noun) ensure(noun, "noun", candidate.status, candidate.id);
        break;
      }
      case "unknown": {
        const verb = candidate.raw.verb;
        const noun = candidate.raw.noun;
        if (verb) ensure(verb, "verb", candidate.status, candidate.id);
        if (noun) ensure(noun, "noun", candidate.status, candidate.id);
        break;
      }
      case "low-confidence": {
        ensure(candidate.raw.name, "candidate", candidate.status, candidate.id);
        break;
      }
      // normalized / ignored: nothing to suggest.
      default:
        break;
    }
  }

  return [...aggregates.values()]
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.termKind !== b.termKind) return a.termKind.localeCompare(b.termKind);
      return a.term.localeCompare(b.term);
    })
    .slice(0, limit)
    .map((entry) => ({
      term: entry.term,
      termKind: entry.termKind,
      count: entry.count,
      statuses: [...entry.statuses].sort(),
      exampleCandidateIds: entry.exampleCandidateIds,
    }));
}

export function buildDecidedKeySet(
  ledger: CapabilityNormalizationReviewLedger | undefined,
): Set<string> {
  const set = new Set<string>();
  if (!ledger) return set;
  for (const entry of ledger.entries) {
    set.add(`${entry.termKind}:${entry.term}`);
  }
  return set;
}

// ---------- CapabilityOntologySuggestionReport ----------
//
// Preview-only translation of `extend-ontology` decisions in
// the latest `CapabilityNormalizationReviewLedger` into a
// proposed `.rekon/capability-ontology.json` patch. This
// helper **does not** read or write the config file directly.
// The CLI reads the config (if present), passes it in, and
// the helper builds an audit-only report with `before` /
// `after` JSON strings. Source-write apply remains
// unavailable.

export type CapabilityOntologySuggestionKind =
  | "add-canonical-verb"
  | "add-canonical-noun"
  | "add-verb-alias"
  | "add-noun-alias";

export type CapabilityOntologySuggestion = {
  id: string;
  kind: CapabilityOntologySuggestionKind;
  term: string;
  canonical?: string;
  sourceDecisionId: string;
  sourceLedgerRef: ArtifactRef;
  reason: string;
  status: "proposed";
};

export type CapabilityOntologySuggestionSkipped = {
  decisionId: string;
  term: string;
  termKind: CapabilityNormalizationReviewTermKind;
  reason: string;
};

export type CapabilityOntologySuggestionSummary = {
  total: number;
  addCanonicalVerb: number;
  addCanonicalNoun: number;
  addVerbAlias: number;
  addNounAlias: number;
  skipped: number;
};

export type CapabilityOntologySuggestionPreview = {
  configPath: ".rekon/capability-ontology.json";
  patch?: {
    format: "json";
    before: string;
    after: string;
  };
  message: string;
};

export type CapabilityOntologySuggestionReport = {
  header: ArtifactHeader;
  summary: CapabilityOntologySuggestionSummary;
  suggestions: CapabilityOntologySuggestion[];
  skipped: CapabilityOntologySuggestionSkipped[];
  preview: CapabilityOntologySuggestionPreview;
};

export type BuildCapabilityOntologySuggestionReportInput = {
  header: ArtifactHeader;
  ledger: CapabilityNormalizationReviewLedger;
  ledgerRef: ArtifactRef;
  /** Existing config contents (parsed JSON); undefined if the file does not exist. */
  existingConfig?: CapabilityOntologyConfig;
};

const CANDIDATE_SKIPPED_REASON =
  "candidate-level decisions require manual ontology editing.";

export function buildCapabilityOntologySuggestionReport(
  input: BuildCapabilityOntologySuggestionReportInput,
): CapabilityOntologySuggestionReport {
  const suggestions: CapabilityOntologySuggestion[] = [];
  const skipped: CapabilityOntologySuggestionSkipped[] = [];
  const seenSuggestionKeys = new Set<string>();
  const seenSkippedKeys = new Set<string>();

  for (const entry of input.ledger.entries) {
    if (entry.decision !== "extend-ontology") {
      continue; // non-extend decisions are intentionally ignored.
    }

    if (entry.termKind === "candidate") {
      const skipKey = `${entry.id}:${entry.term}`;
      if (!seenSkippedKeys.has(skipKey)) {
        skipped.push({
          decisionId: entry.id,
          term: entry.term,
          termKind: entry.termKind,
          reason: CANDIDATE_SKIPPED_REASON,
        });
        seenSkippedKeys.add(skipKey);
      }
      continue;
    }

    const kind = resolveSuggestionKind(entry.termKind, entry.suggestedCanonical);
    if (!kind) {
      // Defensive — `extend-ontology` requires a known termKind.
      continue;
    }

    const dedupeKey = entry.suggestedCanonical
      ? `${kind}:${normalizeTerm(entry.term)}:${normalizeTerm(entry.suggestedCanonical)}`
      : `${kind}:${normalizeTerm(entry.term)}`;
    if (seenSuggestionKeys.has(dedupeKey)) {
      continue;
    }
    seenSuggestionKeys.add(dedupeKey);

    suggestions.push({
      id: `suggestion-${suggestions.length.toString(10).padStart(4, "0")}-${kind}`,
      kind,
      term: entry.term,
      ...(entry.suggestedCanonical ? { canonical: entry.suggestedCanonical } : {}),
      sourceDecisionId: entry.id,
      sourceLedgerRef: input.ledgerRef,
      reason: entry.reason,
      status: "proposed",
    });
  }

  const summary = summarizeOntologySuggestions(suggestions, skipped);
  const preview = buildSuggestionPreview(suggestions, input.existingConfig);

  return {
    header: input.header,
    summary,
    suggestions,
    skipped,
    preview,
  };
}

function resolveSuggestionKind(
  termKind: CapabilityNormalizationReviewTermKind,
  suggestedCanonical: string | undefined,
): CapabilityOntologySuggestionKind | null {
  if (termKind === "verb") {
    return suggestedCanonical ? "add-verb-alias" : "add-canonical-verb";
  }
  if (termKind === "noun") {
    return suggestedCanonical ? "add-noun-alias" : "add-canonical-noun";
  }
  return null;
}

function summarizeOntologySuggestions(
  suggestions: CapabilityOntologySuggestion[],
  skipped: CapabilityOntologySuggestionSkipped[],
): CapabilityOntologySuggestionSummary {
  let addCanonicalVerb = 0;
  let addCanonicalNoun = 0;
  let addVerbAlias = 0;
  let addNounAlias = 0;
  for (const entry of suggestions) {
    switch (entry.kind) {
      case "add-canonical-verb":
        addCanonicalVerb += 1;
        break;
      case "add-canonical-noun":
        addCanonicalNoun += 1;
        break;
      case "add-verb-alias":
        addVerbAlias += 1;
        break;
      case "add-noun-alias":
        addNounAlias += 1;
        break;
    }
  }
  return {
    total: suggestions.length,
    addCanonicalVerb,
    addCanonicalNoun,
    addVerbAlias,
    addNounAlias,
    skipped: skipped.length,
  };
}

function buildSuggestionPreview(
  suggestions: CapabilityOntologySuggestion[],
  existingConfig: CapabilityOntologyConfig | undefined,
): CapabilityOntologySuggestionPreview {
  const message =
    "Preview-only proposal. `.rekon/capability-ontology.json` is **not** mutated by this report. Apply the proposed config manually if desired.";

  if (suggestions.length === 0) {
    return {
      configPath: ".rekon/capability-ontology.json",
      message,
    };
  }

  const beforeConfig: CapabilityOntologyConfig = existingConfig
    ? deepCloneConfig(existingConfig)
    : { version: "0.1.0" };
  const afterConfig = deepCloneConfig(beforeConfig);

  for (const suggestion of suggestions) {
    applySuggestionToConfig(afterConfig, suggestion);
  }

  return {
    configPath: ".rekon/capability-ontology.json",
    patch: {
      format: "json",
      before: JSON.stringify(beforeConfig, null, 2),
      after: JSON.stringify(afterConfig, null, 2),
    },
    message,
  };
}

function applySuggestionToConfig(
  config: CapabilityOntologyConfig,
  suggestion: CapabilityOntologySuggestion,
): void {
  switch (suggestion.kind) {
    case "add-canonical-verb": {
      const section = ensureSection(config, "verbs");
      addCanonical(section, suggestion.term);
      break;
    }
    case "add-canonical-noun": {
      const section = ensureSection(config, "nouns");
      addCanonical(section, suggestion.term);
      break;
    }
    case "add-verb-alias": {
      const section = ensureSection(config, "verbs");
      addAlias(section, suggestion.term, suggestion.canonical ?? suggestion.term);
      break;
    }
    case "add-noun-alias": {
      const section = ensureSection(config, "nouns");
      addAlias(section, suggestion.term, suggestion.canonical ?? suggestion.term);
      break;
    }
  }
}

function ensureSection(
  config: CapabilityOntologyConfig,
  key: "verbs" | "nouns",
): { canonical?: string[]; aliases?: Record<string, string> } {
  const existing = config[key];
  if (!existing) {
    const created: { canonical?: string[]; aliases?: Record<string, string> } = {};
    (config as { verbs?: typeof created; nouns?: typeof created })[key] = created;
    return created;
  }
  return existing as { canonical?: string[]; aliases?: Record<string, string> };
}

function addCanonical(
  section: { canonical?: string[] },
  term: string,
): void {
  const list = section.canonical ?? [];
  const normalized = term.toLowerCase();
  if (!list.includes(normalized)) {
    list.push(normalized);
    list.sort((a, b) => a.localeCompare(b));
  }
  section.canonical = list;
}

function addAlias(
  section: { aliases?: Record<string, string> },
  alias: string,
  canonical: string,
): void {
  const aliases = section.aliases ?? {};
  aliases[alias.toLowerCase()] = canonical.toLowerCase();
  section.aliases = sortRecord(aliases);
}

function deepCloneConfig(config: CapabilityOntologyConfig): CapabilityOntologyConfig {
  return JSON.parse(JSON.stringify(config)) as CapabilityOntologyConfig;
}

function normalizeTerm(term: string): string {
  return term.trim().toLowerCase();
}

export function validateCapabilityOntologySuggestionReport(
  value: unknown,
): { ok: true; report: CapabilityOntologySuggestionReport } | { ok: false; reason: string } {
  if (!isRecord(value)) {
    return { ok: false, reason: "report must be an object" };
  }
  if (!isRecord(value.header)) {
    return { ok: false, reason: "report.header must be an object" };
  }
  const header = value.header as ArtifactHeader;
  if (header.artifactType !== "CapabilityOntologySuggestionReport") {
    return {
      ok: false,
      reason: `report.header.artifactType must be "CapabilityOntologySuggestionReport", got ${String(header.artifactType)}`,
    };
  }
  if (!isRecord(value.summary)) {
    return { ok: false, reason: "report.summary must be an object" };
  }
  if (!Array.isArray((value as { suggestions?: unknown }).suggestions)) {
    return { ok: false, reason: "report.suggestions must be an array" };
  }
  if (!Array.isArray((value as { skipped?: unknown }).skipped)) {
    return { ok: false, reason: "report.skipped must be an array" };
  }
  if (!isRecord(value.preview)) {
    return { ok: false, reason: "report.preview must be an object" };
  }
  return { ok: true, report: value as CapabilityOntologySuggestionReport };
}

// ---------- Capability manifest + projector ----------

export const normalizationProjector: Projector = {
  id: CAPABILITY_ONTOLOGY_PROJECTOR_ID,
  produces: ["CapabilityNormalizationReport"],
  async project({ artifacts, input }) {
    const repoRoot = typeof input?.repoRoot === "string" ? input.repoRoot : process.cwd();
    const explicitGraphRef =
      input && isRecord(input.evidenceGraphRef) ? (input.evidenceGraphRef as ArtifactRef) : undefined;

    const { graph, ref } = await resolveEvidenceGraph(artifacts, explicitGraphRef);
    const configResult = await loadCapabilityOntologyConfig(repoRoot);
    const ontology = compileEffectiveCapabilityOntology({
      config: configResult.found ? configResult.config : undefined,
      configPath: configResult.found ? configResult.configPath : undefined,
      configHash: configResult.found ? configResult.configHash : undefined,
    });

    const generatedAt = new Date().toISOString();
    const artifactId = `capability-normalization-${generatedAt.replace(/[:.]/g, "-")}`;

    const header: ArtifactHeader = {
      artifactType: "CapabilityNormalizationReport",
      artifactId,
      schemaVersion: "0.1.0",
      generatedAt,
      subject: { repoId: repoRoot },
      producer: {
        id: CAPABILITY_ONTOLOGY_PROJECTOR_ID,
        version: CAPABILITY_ONTOLOGY_VERSION,
      },
      inputRefs: ref ? [ref] : [],
      freshness: { status: "fresh" },
    };

    const report = buildCapabilityNormalizationReport({
      header,
      ontology,
      graph,
      graphRef: ref,
    });

    const written = await artifacts.write("CapabilityNormalizationReport", report);
    return [written];
  },
};

async function resolveEvidenceGraph(
  artifacts: ArtifactReader & ArtifactWriter,
  explicitRef?: ArtifactRef,
): Promise<{ graph: EvidenceGraph; ref?: ArtifactRef }> {
  if (explicitRef) {
    const value = (await artifacts.read(explicitRef)) as EvidenceGraph;
    return { graph: value, ref: explicitRef };
  }

  const entries = await artifacts.list("EvidenceGraph");
  if (entries.length === 0) {
    throw new Error(
      "capability ontology normalize requires an existing EvidenceGraph artifact. Run `rekon refresh` (or `rekon observe`) before normalizing.",
    );
  }
  const latest = entries.at(-1) as ArtifactRef;
  const value = (await artifacts.read(latest)) as EvidenceGraph;
  return { graph: value, ref: latest };
}

export default defineCapability({
  manifest: {
    id: CAPABILITY_ONTOLOGY_CAPABILITY_ID,
    name: "Capability Ontology Translation Layer",
    version: CAPABILITY_ONTOLOGY_VERSION,
    roles: ["projector"],
    consumes: ["EvidenceGraph"],
    produces: ["CapabilityNormalizationReport"],
    permissions: ["read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "evidence.changed",
        description:
          "Capability normalization reports are invalid when the upstream EvidenceGraph changes.",
        inputs: ["EvidenceGraph"],
      },
    ],
    compatibility: { rekon: "^0.1.0" },
  },
  register(registry) {
    registry.projector(normalizationProjector);
  },
});

// ---------- Helpers ----------

function isFileNotFoundError(value: unknown): boolean {
  return isRecord(value) && (value as { code?: string }).code === "ENOENT";
}

function hashString(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isStringStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) return false;
  for (const entry of Object.values(value)) {
    if (typeof entry !== "string") return false;
  }
  return true;
}

function isVerbCategory(value: unknown): value is CapabilityVerbCategory {
  return typeof value === "string"
    && ["read", "write", "create", "delete", "transform", "validate", "navigate", "communicate", "system"].includes(
      value,
    );
}

function isNounCategory(value: unknown): value is CapabilityNounCategory {
  return typeof value === "string"
    && ["domain", "infrastructure", "ui", "process", "data", "system"].includes(value);
}

function stringFrom(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function sortUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function sortRecord<T>(record: Record<string, T>): Record<string, T> {
  const sorted: Record<string, T> = {};
  for (const key of Object.keys(record).sort((a, b) => a.localeCompare(b))) {
    sorted[key] = record[key] as T;
  }
  return sorted;
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40)
    || "term";
}
