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

export type CapabilityMap = {
  header: ArtifactHeader;
  entries: Array<{
    capability: string;
    subjects: string[];
    systems: string[];
    confidence: number;
    evidence: ArtifactRef[];
  }>;
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
  return assertCapabilityMap({
    header: input.header,
    entries: [...dedupeBy(input.entries, (entry) => entry.capability).values()]
      .map((entry) => ({
        ...entry,
        subjects: uniqueSorted(entry.subjects),
        systems: uniqueSorted(entry.systems),
        evidence: normalizeRefs(entry.evidence),
      }))
      .sort((left, right) => left.capability.localeCompare(right.capability)),
  });
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
