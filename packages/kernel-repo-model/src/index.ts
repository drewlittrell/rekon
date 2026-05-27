import {
  type ArtifactHeader,
  type ArtifactRef,
  type ArtifactSchema,
  type ValidationIssue,
  type ValidationResult,
  assertArtifactHeader,
  assertArtifactRef,
  validateArtifactHeader,
  validateArtifactRef,
} from "@rekon/kernel-artifacts";

export type ObservedSystem = {
  id: string;
  name?: string;
  purpose?: string;
  paths: string[];
  layers: string[];
  capabilities: string[];
  confidence: number;
  evidence: ArtifactRef[];
  /**
   * Optional structural kind of this observed system. Used by
   * graph-aware finding filters (e.g.
   * `module-gate-verified-caller`) to confirm a finding's
   * owning system is module-kind without iterating naming
   * conventions. Common values: `"module"`, `"service"`,
   * `"route"`, `"ui"`, `"infra"`, `"unknown"`. Additive
   * optional; older artifacts and projectors that don't
   * surface kind continue to work.
   */
  kind?: string;
};

export type ObservedRepo = {
  header: ArtifactHeader;
  repository: {
    id: string;
    root: string;
    branch?: string;
    commit?: string;
  };
  systems: ObservedSystem[];
  layers: string[];
  capabilities: string[];
  /**
   * Optional flat file index. Sorted ascending,
   * repo-relative, no absolute paths, no `.rekon/`
   * artifact paths. Populated when the upstream projector
   * has enough evidence (e.g. `file` evidence facts) to
   * surface it. Consumed by graph-aware finding filters
   * (e.g. `route-handler-with-service`) for sibling-file
   * existence checks without scraping the filesystem.
   * Additive optional; older artifacts and projectors that
   * don't surface a file index continue to work.
   */
  files?: string[];
};

export type OwnershipMap = {
  header: ArtifactHeader;
  entries: Array<{
    path: string;
    ownerSystem: string;
    layer?: string;
    confidence: number;
    evidence: ArtifactRef[];
  }>;
};

/**
 * Phrase-backed capability entry (CapabilityMap v2,
 * additive). Projected from a single stable
 * high-confidence `CapabilityPhrase`. v2 entries
 * never replace or invalidate v1 `entries[]`;
 * existing consumers reading `entries[]` continue
 * to work unchanged.
 *
 * Eligibility (enforced by the producer, not by
 * this type): phrase `status === "stable"` AND
 * `confidence === "high"` AND `verb` / `noun`
 * non-empty AND `evidenceRefs` non-empty AND
 * `sourceCandidateIds` non-empty. Partial / low-
 * confidence phrases never appear here. Raw
 * `CapabilityNormalizationReport` rows never appear
 * here. See
 * `docs/strategy/capability-map-v2-high-confidence-decision.md`.
 */
export type CapabilityMapPhraseBackedCapability = {
  /** Deterministic identifier; stable across runs. */
  id: string;
  /** Citation back to the source CapabilityPhrase. */
  phraseRef: {
    report: ArtifactRef;
    phraseId: string;
  };
  verb: string;
  noun: string;
  qualifier?: string[];
  domain?: string;
  pattern?: string;
  layer?: string;
  /** Citations carried from the source phrase. */
  evidenceRefs: ArtifactRef[];
  /** Source normalization-report candidate ids. */
  sourceCandidateIds: string[];
  /** Literal — eligibility filter guarantees it. */
  confidence: "high";
  /** Literal — eligibility filter guarantees it. */
  status: "stable";
};

export type CapabilityMapPhraseBackedSummary = {
  total: number;
  /** Deterministic sorted-key record by canonical verb. */
  byVerb: Record<string, number>;
  /** Deterministic sorted-key record by canonical noun. */
  byNoun: Record<string, number>;
  withDomain: number;
  withPattern: number;
  withLayer: number;
};

export type CapabilityMap = {
  header: ArtifactHeader;
  entries: Array<{
    capability: string;
    subjects: string[];
    systems: string[];
    confidence: number;
    evidence: ArtifactRef[];
  }>;
  /**
   * Optional v2 additions. Populated only when the
   * producer consumed a `CapabilityPhraseReport`.
   * Existing v1 consumers ignore these fields safely.
   */
  phraseBackedCapabilities?: CapabilityMapPhraseBackedCapability[];
  phraseBackedSummary?: CapabilityMapPhraseBackedSummary;
  phraseSourceRef?: ArtifactRef;
};

export function createObservedRepo(input: ObservedRepo): ObservedRepo {
  const systems = normalizeSystems(input.systems);
  // Normalize files to a sorted unique list of repo-relative
  // paths. Absolute paths and `.rekon/` artifact paths are
  // dropped at the boundary so consumers can rely on the shape
  // without re-filtering.
  const files = Array.isArray(input.files)
    ? uniqueSorted(
        input.files
          .filter((path): path is string => typeof path === "string" && path.length > 0)
          .map((path) => path.replace(/^\.\//, ""))
          .filter((path) => !path.startsWith("/"))
          .filter((path) => {
            const segments = path.split("/");
            return !segments.includes(".rekon");
          }),
      )
    : undefined;

  const observed: ObservedRepo = {
    header: input.header,
    repository: { ...input.repository },
    systems,
    layers: uniqueSorted([
      ...input.layers,
      ...systems.flatMap((system) => system.layers),
    ]),
    capabilities: uniqueSorted([
      ...input.capabilities,
      ...systems.flatMap((system) => system.capabilities),
    ]),
  };
  if (files && files.length > 0) {
    observed.files = files;
  }
  return assertObservedRepo(observed);
}

export function createOwnershipMap(input: OwnershipMap): OwnershipMap {
  return assertOwnershipMap({
    header: input.header,
    entries: [...dedupeBy(input.entries, (entry) => `${entry.path}:${entry.ownerSystem}:${entry.layer ?? ""}`).values()]
      .map((entry) => ({
        ...entry,
        evidence: normalizeRefs(entry.evidence),
      }))
      .sort((left, right) => `${left.path}:${left.ownerSystem}`.localeCompare(`${right.path}:${right.ownerSystem}`)),
  });
}

export function createCapabilityMap(input: CapabilityMap): CapabilityMap {
  const normalized: CapabilityMap = {
    header: input.header,
    entries: [...dedupeBy(input.entries, (entry) => entry.capability).values()]
      .map((entry) => ({
        ...entry,
        subjects: uniqueSorted(entry.subjects),
        systems: uniqueSorted(entry.systems),
        evidence: normalizeRefs(entry.evidence),
      }))
      .sort((left, right) => left.capability.localeCompare(right.capability)),
  };

  // ---- v2 additive fields ----
  if (Array.isArray(input.phraseBackedCapabilities)) {
    const phraseBacked = [...input.phraseBackedCapabilities]
      .map((entry) => normalizePhraseBackedCapability(entry))
      .sort(comparePhraseBackedCapability);
    if (phraseBacked.length > 0 || input.phraseBackedSummary || input.phraseSourceRef) {
      normalized.phraseBackedCapabilities = phraseBacked;
    }
  }
  if (input.phraseBackedSummary) {
    normalized.phraseBackedSummary = normalizePhraseBackedSummary(
      input.phraseBackedSummary,
    );
  }
  if (input.phraseSourceRef) {
    normalized.phraseSourceRef = assertArtifactRef(input.phraseSourceRef);
  }

  return assertCapabilityMap(normalized);
}

function normalizePhraseBackedCapability(
  entry: CapabilityMapPhraseBackedCapability,
): CapabilityMapPhraseBackedCapability {
  const out: CapabilityMapPhraseBackedCapability = {
    id: entry.id,
    phraseRef: {
      report: assertArtifactRef(entry.phraseRef.report),
      phraseId: entry.phraseRef.phraseId,
    },
    verb: entry.verb,
    noun: entry.noun,
    evidenceRefs: normalizeRefs(entry.evidenceRefs),
    sourceCandidateIds: uniqueSorted(entry.sourceCandidateIds),
    confidence: "high",
    status: "stable",
  };
  if (entry.qualifier && entry.qualifier.length > 0) {
    out.qualifier = uniqueSorted(entry.qualifier);
  }
  if (entry.domain) out.domain = entry.domain;
  if (entry.pattern) out.pattern = entry.pattern;
  if (entry.layer) out.layer = entry.layer;
  return out;
}

function comparePhraseBackedCapability(
  left: CapabilityMapPhraseBackedCapability,
  right: CapabilityMapPhraseBackedCapability,
): number {
  if (left.verb !== right.verb) return left.verb.localeCompare(right.verb);
  if (left.noun !== right.noun) return left.noun.localeCompare(right.noun);
  return left.id.localeCompare(right.id);
}

function normalizePhraseBackedSummary(
  summary: CapabilityMapPhraseBackedSummary,
): CapabilityMapPhraseBackedSummary {
  return {
    total: summary.total,
    byVerb: sortRecord(summary.byVerb ?? {}),
    byNoun: sortRecord(summary.byNoun ?? {}),
    withDomain: summary.withDomain,
    withPattern: summary.withPattern,
    withLayer: summary.withLayer,
  };
}

function sortRecord(record: Record<string, number>): Record<string, number> {
  const sorted: Record<string, number> = {};
  for (const key of Object.keys(record).sort()) {
    sorted[key] = record[key]!;
  }
  return sorted;
}

export function validateObservedRepo(value: unknown): ValidationResult<ObservedRepo> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  validateModelHeader(value.header, "ObservedRepo", "$.header", issues);
  validateRepository(value.repository, "$.repository", issues);

  if (!Array.isArray(value.systems)) {
    issues.push({ path: "$.systems", message: "Expected an array." });
  } else {
    value.systems.forEach((system, index) => validateObservedSystem(system, `$.systems[${index}]`, issues));
  }

  if (!isStringArray(value.layers)) {
    issues.push({ path: "$.layers", message: "Expected an array of strings." });
  }

  if (!isStringArray(value.capabilities)) {
    issues.push({ path: "$.capabilities", message: "Expected an array of strings." });
  }

  if (value.files !== undefined && !isStringArray(value.files)) {
    issues.push({ path: "$.files", message: "Expected an array of strings when present." });
  }

  return validationResult(value as ObservedRepo, issues);
}

export function validateOwnershipMap(value: unknown): ValidationResult<OwnershipMap> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  validateModelHeader(value.header, "OwnershipMap", "$.header", issues);

  if (!Array.isArray(value.entries)) {
    issues.push({ path: "$.entries", message: "Expected an array." });
  } else {
    value.entries.forEach((entry, index) => validateOwnershipEntry(entry, `$.entries[${index}]`, issues));
  }

  return validationResult(value as OwnershipMap, issues);
}

export function validateCapabilityMap(value: unknown): ValidationResult<CapabilityMap> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  validateModelHeader(value.header, "CapabilityMap", "$.header", issues);

  if (!Array.isArray(value.entries)) {
    issues.push({ path: "$.entries", message: "Expected an array." });
  } else {
    value.entries.forEach((entry, index) => validateCapabilityEntry(entry, `$.entries[${index}]`, issues));
  }

  // v2 additive fields. All optional; absence is fine.
  if (value.phraseBackedCapabilities !== undefined) {
    if (!Array.isArray(value.phraseBackedCapabilities)) {
      issues.push({
        path: "$.phraseBackedCapabilities",
        message: "Expected an array when present.",
      });
    } else {
      value.phraseBackedCapabilities.forEach((entry, index) =>
        validatePhraseBackedCapability(entry, `$.phraseBackedCapabilities[${index}]`, issues),
      );
    }
  }
  if (value.phraseBackedSummary !== undefined) {
    validatePhraseBackedSummary(value.phraseBackedSummary, "$.phraseBackedSummary", issues);
  }
  if (value.phraseSourceRef !== undefined) {
    const result = validateArtifactRef(value.phraseSourceRef);
    if (!result.ok) {
      issues.push(...prefixIssues(result.issues, "$.phraseSourceRef"));
    }
  }

  return validationResult(value as CapabilityMap, issues);
}

export function assertObservedRepo(value: unknown): ObservedRepo {
  return assertValid(validateObservedRepo(value), "ObservedRepo");
}

export function assertOwnershipMap(value: unknown): OwnershipMap {
  return assertValid(validateOwnershipMap(value), "OwnershipMap");
}

export function assertCapabilityMap(value: unknown): CapabilityMap {
  return assertValid(validateCapabilityMap(value), "CapabilityMap");
}

export const observedRepoSchema: ArtifactSchema<ObservedRepo> = {
  validate: validateObservedRepo,
  parse: assertObservedRepo,
};

export const ownershipMapSchema: ArtifactSchema<OwnershipMap> = {
  validate: validateOwnershipMap,
  parse: assertOwnershipMap,
};

export const capabilityMapSchema: ArtifactSchema<CapabilityMap> = {
  validate: validateCapabilityMap,
  parse: assertCapabilityMap,
};

export function normalizeSystems(systems: ObservedSystem[]): ObservedSystem[] {
  const byId = new Map<string, ObservedSystem>();

  for (const system of systems) {
    const existing = byId.get(system.id);
    const normalized = {
      ...system,
      paths: uniqueSorted(system.paths),
      layers: uniqueSorted(system.layers),
      capabilities: uniqueSorted(system.capabilities),
      evidence: normalizeRefs(system.evidence),
    };

    if (!existing) {
      byId.set(system.id, normalized);
      continue;
    }

    byId.set(system.id, {
      ...existing,
      name: existing.name ?? normalized.name,
      purpose: existing.purpose ?? normalized.purpose,
      kind: existing.kind ?? normalized.kind,
      paths: uniqueSorted([...existing.paths, ...normalized.paths]),
      layers: uniqueSorted([...existing.layers, ...normalized.layers]),
      capabilities: uniqueSorted([...existing.capabilities, ...normalized.capabilities]),
      confidence: Math.max(existing.confidence, normalized.confidence),
      evidence: normalizeRefs([...existing.evidence, ...normalized.evidence]),
    });
  }

  return [...byId.values()]
    .map(stripUndefinedObjectValues)
    .sort((left, right) => left.id.localeCompare(right.id));
}

function validateModelHeader(value: unknown, artifactType: string, path: string, issues: ValidationIssue[]): void {
  const result = validateArtifactHeader(value);

  if (!result.ok) {
    issues.push(...prefixIssues(result.issues, path));
    return;
  }

  if (result.value.artifactType !== artifactType) {
    issues.push({ path: `${path}.artifactType`, message: `Expected artifactType to be ${artifactType}.` });
  }
}

function validateRepository(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  pushRequiredStringIssue(issues, value.id, `${path}.id`);
  pushRequiredStringIssue(issues, value.root, `${path}.root`);
}

function validateObservedSystem(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  pushRequiredStringIssue(issues, value.id, `${path}.id`);

  if (!isStringArray(value.paths)) {
    issues.push({ path: `${path}.paths`, message: "Expected an array of strings." });
  }

  if (!isStringArray(value.layers)) {
    issues.push({ path: `${path}.layers`, message: "Expected an array of strings." });
  }

  if (!isStringArray(value.capabilities)) {
    issues.push({ path: `${path}.capabilities`, message: "Expected an array of strings." });
  }

  if (value.kind !== undefined && (typeof value.kind !== "string" || value.kind.length === 0)) {
    issues.push({ path: `${path}.kind`, message: "Expected a non-empty string when present." });
  }

  validateConfidence(value.confidence, `${path}.confidence`, issues);
  validateRefs(value.evidence, `${path}.evidence`, issues);
}

function validateOwnershipEntry(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  pushRequiredStringIssue(issues, value.path, `${path}.path`);
  pushRequiredStringIssue(issues, value.ownerSystem, `${path}.ownerSystem`);
  validateConfidence(value.confidence, `${path}.confidence`, issues);
  validateRefs(value.evidence, `${path}.evidence`, issues);
}

function validateCapabilityEntry(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  pushRequiredStringIssue(issues, value.capability, `${path}.capability`);

  if (!isStringArray(value.subjects)) {
    issues.push({ path: `${path}.subjects`, message: "Expected an array of strings." });
  }

  if (!isStringArray(value.systems)) {
    issues.push({ path: `${path}.systems`, message: "Expected an array of strings." });
  }

  validateConfidence(value.confidence, `${path}.confidence`, issues);
  validateRefs(value.evidence, `${path}.evidence`, issues);
}

function validateConfidence(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    issues.push({ path, message: "Expected a finite number between 0 and 1." });
  }
}

function validatePhraseBackedCapability(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  pushRequiredStringIssue(issues, value.id, `${path}.id`);
  pushRequiredStringIssue(issues, value.verb, `${path}.verb`);
  pushRequiredStringIssue(issues, value.noun, `${path}.noun`);

  if (!isRecord(value.phraseRef)) {
    issues.push({ path: `${path}.phraseRef`, message: "Expected an object." });
  } else {
    pushRequiredStringIssue(issues, value.phraseRef.phraseId, `${path}.phraseRef.phraseId`);
    const refResult = validateArtifactRef(value.phraseRef.report);
    if (!refResult.ok) {
      issues.push(...prefixIssues(refResult.issues, `${path}.phraseRef.report`));
    }
  }

  validateRefs(value.evidenceRefs, `${path}.evidenceRefs`, issues);
  if (Array.isArray(value.evidenceRefs) && value.evidenceRefs.length === 0) {
    issues.push({
      path: `${path}.evidenceRefs`,
      message: "Expected at least one evidence ref (eligibility rule).",
    });
  }

  if (!isStringArray(value.sourceCandidateIds)) {
    issues.push({
      path: `${path}.sourceCandidateIds`,
      message: "Expected an array of strings.",
    });
  } else if (value.sourceCandidateIds.length === 0) {
    issues.push({
      path: `${path}.sourceCandidateIds`,
      message: "Expected at least one source candidate id (eligibility rule).",
    });
  }

  if (value.confidence !== "high") {
    issues.push({
      path: `${path}.confidence`,
      message: 'Expected literal "high" (eligibility rule).',
    });
  }
  if (value.status !== "stable") {
    issues.push({
      path: `${path}.status`,
      message: 'Expected literal "stable" (eligibility rule).',
    });
  }

  if (value.qualifier !== undefined && !isStringArray(value.qualifier)) {
    issues.push({
      path: `${path}.qualifier`,
      message: "Expected an array of strings when present.",
    });
  }
  for (const field of ["domain", "pattern", "layer"] as const) {
    const fieldValue = (value as Record<string, unknown>)[field];
    if (fieldValue !== undefined && typeof fieldValue !== "string") {
      issues.push({
        path: `${path}.${field}`,
        message: "Expected a string when present.",
      });
    }
  }
}

function validatePhraseBackedSummary(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  for (const field of ["total", "withDomain", "withPattern", "withLayer"] as const) {
    if (typeof value[field] !== "number" || !Number.isInteger(value[field] as number) || (value[field] as number) < 0) {
      issues.push({
        path: `${path}.${field}`,
        message: "Expected a non-negative integer.",
      });
    }
  }
  for (const field of ["byVerb", "byNoun"] as const) {
    const recordValue = value[field];
    if (!isRecord(recordValue)) {
      issues.push({
        path: `${path}.${field}`,
        message: "Expected an object.",
      });
      continue;
    }
    for (const [key, count] of Object.entries(recordValue)) {
      if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
        issues.push({
          path: `${path}.${field}.${key}`,
          message: "Expected a non-negative integer.",
        });
      }
    }
  }
}

function validateRefs(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array of artifact refs." });
    return;
  }

  value.forEach((ref, index) => {
    const result = validateArtifactRef(ref);

    if (!result.ok) {
      issues.push(...prefixIssues(result.issues, `${path}[${index}]`));
    }
  });
}

function normalizeRefs(refs: ArtifactRef[]): ArtifactRef[] {
  return [...dedupeBy(refs.map(assertArtifactRef), (ref) => `${ref.type}:${ref.id}:${ref.path ?? ""}`).values()]
    .sort((left, right) => `${left.type}:${left.id}:${left.path ?? ""}`.localeCompare(`${right.type}:${right.id}:${right.path ?? ""}`));
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort();
}

function dedupeBy<T>(values: T[], keyForValue: (value: T) => string): Map<string, T> {
  const byKey = new Map<string, T>();

  for (const value of values) {
    byKey.set(keyForValue(value), value);
  }

  return byKey;
}

function validationResult<T>(value: T, issues: ValidationIssue[]): ValidationResult<T> {
  return issues.length > 0 ? { ok: false, issues } : { ok: true, value, issues: [] };
}

function assertValid<T>(result: ValidationResult<T>, typeName: string): T {
  if (result.ok) {
    return result.value;
  }

  throw new TypeError(`${typeName} validation failed: ${result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function pushRequiredStringIssue(issues: ValidationIssue[], value: unknown, path: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path, message: "Expected a non-empty string." });
  }
}

function prefixIssues(issues: ValidationIssue[], prefix: string): ValidationIssue[] {
  return issues.map((issue) => ({
    path: issue.path.replace("$", prefix),
    message: issue.message,
  }));
}

function stripUndefinedObjectValues<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedObjectValues(item)) as T;
  }

  if (isRecord(value)) {
    return Object.entries(value).reduce<Record<string, unknown>>((stripped, [key, item]) => {
      if (item !== undefined) {
        stripped[key] = stripUndefinedObjectValues(item);
      }

      return stripped;
    }, {}) as T;
  }

  return value;
}

// ---------- Source-state fingerprint (P1.1 path-freshness-report) ----------
//
// Pure (well, IO-only) helper used by the
// `rekon paths freshness` CLI to capture a bounded,
// deterministic snapshot of the working tree's source
// state. Hashes content with sha256; never stores file
// contents. Treats file mtimes as **advisory only** —
// hashes are the canonical evidence.
//
// Safety contract:
// - **No source mutation.** Read-only.
// - **No network.**
// - **No directory walk outside the supplied repoRoot.**
// - Default ignore set excludes machine-generated
//   directories (`.git`, `.rekon`, `node_modules`,
//   `dist`, `coverage`, `.next`, `.turbo`, `.cache`)
//   so the fingerprint reflects intentional source
//   only.
// - Path entries are sorted lexically; the `rootHash`
//   is a sha256 over the canonical JSON of `{path,
//   hash, size, exists}` entries so two runs over the
//   same tree produce byte-identical fingerprints.

import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";

/**
 * The default set of relative path segments that the
 * source-state walk ignores. Operators can extend this
 * via `ignoreGlobs` (currently treated as path-segment
 * names; full glob support is deferred).
 */
export const DEFAULT_SOURCE_FINGERPRINT_IGNORE: ReadonlyArray<string> = [
  ".git",
  ".rekon",
  "node_modules",
  "dist",
  "coverage",
  ".next",
  ".turbo",
  ".cache",
];

export type SourcePathFingerprintEntry = {
  path: string;
  hash?: string;
  size?: number;
  exists: boolean;
  mtimeAdvisory?: string;
};

export type SourceStateFingerprintData = {
  algorithm: "sha256";
  rootHash: string;
  paths: SourcePathFingerprintEntry[];
  generatedAt: string;
  ignoredGlobs?: string[];
};

export type BuildSourceStateFingerprintInput = {
  repoRoot: string;
  /**
   * When provided, only these repo-relative paths are
   * fingerprinted. When omitted, a conservative walk
   * starting at `repoRoot` is performed; the walk
   * skips any path whose segment matches any entry in
   * `ignoreGlobs ?? DEFAULT_SOURCE_FINGERPRINT_IGNORE`.
   */
  paths?: ReadonlyArray<string>;
  /**
   * Replacement ignore set (segment names). When
   * omitted, `DEFAULT_SOURCE_FINGERPRINT_IGNORE` is
   * used.
   */
  ignoreGlobs?: ReadonlyArray<string>;
  /**
   * When `true`, the fingerprint includes the file's
   * mtime as **advisory** metadata. The mtime is
   * **never** used as canonical freshness evidence
   * during comparison; hashes are. Defaults to
   * `false` so two clones with identical content
   * produce identical fingerprints.
   */
  includeMtimeAdvisory?: boolean;
  /**
   * Override for the `generatedAt` ISO timestamp.
   * Tests use this to keep snapshots deterministic.
   */
  generatedAt?: string;
};

const MAX_FILE_BYTES_FOR_HASH = 32 * 1024 * 1024; // 32 MiB safety cap

export async function buildSourceStateFingerprint(
  input: BuildSourceStateFingerprintInput,
): Promise<SourceStateFingerprintData> {
  if (!input || typeof input !== "object") {
    throw new TypeError("buildSourceStateFingerprint requires an input object.");
  }
  if (typeof input.repoRoot !== "string" || input.repoRoot.length === 0) {
    throw new TypeError("buildSourceStateFingerprint requires input.repoRoot.");
  }
  if (!isAbsolute(input.repoRoot)) {
    throw new TypeError("buildSourceStateFingerprint repoRoot must be absolute.");
  }

  const ignoreGlobs = [
    ...(input.ignoreGlobs ?? DEFAULT_SOURCE_FINGERPRINT_IGNORE),
  ];
  const ignoreSet = new Set(ignoreGlobs);
  const includeMtimeAdvisory = input.includeMtimeAdvisory === true;
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  let candidatePaths: string[];
  if (Array.isArray(input.paths) && input.paths.length > 0) {
    candidatePaths = [...input.paths]
      .map((entry) => normalizeRepoRelativePath(entry))
      .filter((entry) => entry.length > 0);
  } else {
    candidatePaths = await walkRepo(input.repoRoot, ignoreSet);
  }

  // De-duplicate + sort for determinism.
  const uniquePaths = [...new Set(candidatePaths)].sort();

  const entries: SourcePathFingerprintEntry[] = [];
  for (const relativePath of uniquePaths) {
    if (containsIgnoredSegment(relativePath, ignoreSet)) {
      continue;
    }
    const absolutePath = join(input.repoRoot, relativePath);
    const entry = await fingerprintPath(absolutePath, relativePath, {
      includeMtimeAdvisory,
    });
    entries.push(entry);
  }

  const rootHash = computeRootHash(entries);

  const result: SourceStateFingerprintData = {
    algorithm: "sha256",
    rootHash,
    paths: entries,
    generatedAt,
  };
  if (ignoreGlobs.length > 0) {
    result.ignoredGlobs = ignoreGlobs;
  }
  return result;
}

function normalizeRepoRelativePath(value: string): string {
  if (typeof value !== "string") return "";
  // Normalise path separators to forward slashes for
  // determinism across platforms. Leading "./" trimmed.
  let normalized = value.replace(/\\/g, "/").replace(/\/+/g, "/");
  if (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }
  if (normalized.startsWith("/")) {
    normalized = normalized.slice(1);
  }
  return normalized;
}

function containsIgnoredSegment(
  relativePath: string,
  ignoreSet: Set<string>,
): boolean {
  if (ignoreSet.size === 0) return false;
  const segments = relativePath.split("/");
  for (const segment of segments) {
    if (ignoreSet.has(segment)) return true;
  }
  return false;
}

async function fingerprintPath(
  absolutePath: string,
  relativePath: string,
  options: { includeMtimeAdvisory: boolean },
): Promise<SourcePathFingerprintEntry> {
  let stats;
  try {
    stats = await stat(absolutePath);
  } catch {
    return { path: relativePath, exists: false };
  }
  if (!stats.isFile()) {
    return { path: relativePath, exists: false };
  }
  if (stats.size > MAX_FILE_BYTES_FOR_HASH) {
    // Above the safety cap: record existence + size but
    // not a hash. Comparators will treat hash absence as
    // unknown content and fall back to size + exists.
    const result: SourcePathFingerprintEntry = {
      path: relativePath,
      exists: true,
      size: stats.size,
    };
    if (options.includeMtimeAdvisory) {
      result.mtimeAdvisory = stats.mtime.toISOString();
    }
    return result;
  }
  const contents = await readFile(absolutePath);
  const hash = createHash("sha256").update(contents).digest("hex");
  const result: SourcePathFingerprintEntry = {
    path: relativePath,
    exists: true,
    size: stats.size,
    hash,
  };
  if (options.includeMtimeAdvisory) {
    result.mtimeAdvisory = stats.mtime.toISOString();
  }
  return result;
}

function computeRootHash(entries: SourcePathFingerprintEntry[]): string {
  const canonical = entries.map((entry) => ({
    path: entry.path,
    hash: entry.hash ?? null,
    size: typeof entry.size === "number" ? entry.size : null,
    exists: entry.exists,
  }));
  return createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");
}

async function walkRepo(
  repoRoot: string,
  ignoreSet: Set<string>,
): Promise<string[]> {
  const results: string[] = [];
  await walkRepoInner(repoRoot, repoRoot, ignoreSet, results);
  return results;
}

async function walkRepoInner(
  repoRoot: string,
  currentDir: string,
  ignoreSet: Set<string>,
  results: string[],
): Promise<void> {
  let dirEntries;
  try {
    dirEntries = await readdir(currentDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const dirEntry of dirEntries) {
    if (ignoreSet.has(dirEntry.name)) continue;
    const absolutePath = join(currentDir, dirEntry.name);
    if (dirEntry.isDirectory()) {
      await walkRepoInner(repoRoot, absolutePath, ignoreSet, results);
      continue;
    }
    if (!dirEntry.isFile()) continue;
    const relativeFromRoot = relative(repoRoot, absolutePath).split(sep).join("/");
    if (relativeFromRoot.length === 0) continue;
    results.push(relativeFromRoot);
  }
}
