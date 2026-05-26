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
