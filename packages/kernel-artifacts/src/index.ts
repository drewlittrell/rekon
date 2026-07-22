import { createHash } from "node:crypto";

export type ArtifactRef = {
  type: string;
  id: string;
  path?: string;
  digest?: string;
  schemaVersion: string;
};

export type ArtifactInvalidationInput = {
  kind: "source" | "config";
  path: string;
  digest: string;
};

export type ArtifactInvalidationProducer = {
  id: string;
  version: string;
};

export type ArtifactInvalidationBaseline = {
  inputs?: ArtifactInvalidationInput[];
  producers?: ArtifactInvalidationProducer[];
};

export type ArtifactSupersessionIdentity = {
  key: string;
};

export type SourceStateFileStatus = "added" | "modified" | "deleted" | "unchanged";

export type SourceStateFile = {
  path: string;
  status: SourceStateFileStatus;
  beforeSha256?: string;
  afterSha256?: string;
};

export type SourceState = {
  baseRef: string;
  files: SourceStateFile[];
};

export type SourceStateBinding = SourceState & {
  digest: string;
};

export type ArtifactHeader = {
  artifactType: string;
  artifactId: string;
  schemaVersion: string;
  generatedAt: string;
  snapshotId?: string;
  subject: {
    repoId: string;
    ref?: string;
    commit?: string;
    paths?: string[];
    systems?: string[];
  };
  producer: {
    id: string;
    version: string;
  };
  inputRefs: ArtifactRef[];
  invalidation?: ArtifactInvalidationBaseline;
  supersession?: ArtifactSupersessionIdentity;
  freshness?: {
    status: "fresh" | "stale" | "partial" | "unknown";
    invalidatedBy?: string[];
  };
  provenance?: {
    confidence?: number;
    notes?: string[];
  };
};

export type JsonArtifact<TData = unknown> = {
  header: ArtifactHeader;
  data: TData;
};

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ValidationResult<T> =
  | {
      ok: true;
      value: T;
      issues: [];
    }
  | {
      ok: false;
      issues: ValidationIssue[];
    };

export type ArtifactSchema<T> = {
  validate(value: unknown): ValidationResult<T>;
  parse(value: unknown): T;
};

const FRESHNESS_STATUSES = new Set(["fresh", "stale", "partial", "unknown"]);
const SOURCE_STATE_FILE_STATUSES = new Set<SourceStateFileStatus>([
  "added",
  "modified",
  "deleted",
  "unchanged",
]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isIsoDateString(value: string): boolean {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function pushRequiredStringIssue(
  issues: ValidationIssue[],
  value: unknown,
  path: string,
): void {
  if (!isNonEmptyString(value)) {
    issues.push({ path, message: "Expected a non-empty string." });
  }
}

function assertValid<T>(result: ValidationResult<T>, typeName: string): T {
  if (result.ok) {
    return result.value;
  }

  const details = result.issues
    .map((issue) => `${issue.path}: ${issue.message}`)
    .join("; ");

  throw new TypeError(`${typeName} validation failed: ${details}`);
}

export function validateArtifactRef(value: unknown): ValidationResult<ArtifactRef> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [{ path: "$", message: "Expected an object." }],
    };
  }

  pushRequiredStringIssue(issues, value.type, "$.type");
  pushRequiredStringIssue(issues, value.id, "$.id");
  pushRequiredStringIssue(issues, value.schemaVersion, "$.schemaVersion");

  if (value.path !== undefined && typeof value.path !== "string") {
    issues.push({ path: "$.path", message: "Expected a string when present." });
  }

  if (value.digest !== undefined && typeof value.digest !== "string") {
    issues.push({ path: "$.digest", message: "Expected a string when present." });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, value: value as ArtifactRef, issues: [] };
}

export function assertArtifactRef(value: unknown): ArtifactRef {
  return assertValid(validateArtifactRef(value), "ArtifactRef");
}

export const artifactRefSchema: ArtifactSchema<ArtifactRef> = {
  validate: validateArtifactRef,
  parse: assertArtifactRef,
};

export function validateArtifactHeader(value: unknown): ValidationResult<ArtifactHeader> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [{ path: "$", message: "Expected an object." }],
    };
  }

  pushRequiredStringIssue(issues, value.artifactType, "$.artifactType");
  pushRequiredStringIssue(issues, value.artifactId, "$.artifactId");
  pushRequiredStringIssue(issues, value.schemaVersion, "$.schemaVersion");

  if (!isNonEmptyString(value.generatedAt)) {
    issues.push({ path: "$.generatedAt", message: "Expected a non-empty ISO timestamp string." });
  } else if (!isIsoDateString(value.generatedAt)) {
    issues.push({ path: "$.generatedAt", message: "Expected an ISO timestamp string." });
  }

  if (value.snapshotId !== undefined && typeof value.snapshotId !== "string") {
    issues.push({ path: "$.snapshotId", message: "Expected a string when present." });
  }

  if (!isRecord(value.subject)) {
    issues.push({ path: "$.subject", message: "Expected an object." });
  } else {
    pushRequiredStringIssue(issues, value.subject.repoId, "$.subject.repoId");

    if (value.subject.ref !== undefined && typeof value.subject.ref !== "string") {
      issues.push({ path: "$.subject.ref", message: "Expected a string when present." });
    }

    if (value.subject.commit !== undefined && typeof value.subject.commit !== "string") {
      issues.push({ path: "$.subject.commit", message: "Expected a string when present." });
    }

    if (value.subject.paths !== undefined && !isStringArray(value.subject.paths)) {
      issues.push({ path: "$.subject.paths", message: "Expected an array of strings when present." });
    }

    if (value.subject.systems !== undefined && !isStringArray(value.subject.systems)) {
      issues.push({ path: "$.subject.systems", message: "Expected an array of strings when present." });
    }
  }

  if (!isRecord(value.producer)) {
    issues.push({ path: "$.producer", message: "Expected an object." });
  } else {
    pushRequiredStringIssue(issues, value.producer.id, "$.producer.id");
    pushRequiredStringIssue(issues, value.producer.version, "$.producer.version");
  }

  if (!Array.isArray(value.inputRefs)) {
    issues.push({ path: "$.inputRefs", message: "Expected an array." });
  } else {
    value.inputRefs.forEach((inputRef, index) => {
      const result = validateArtifactRef(inputRef);

      if (!result.ok) {
        for (const issue of result.issues) {
          issues.push({
            path: issue.path.replace("$", `$.inputRefs[${index}]`),
            message: issue.message,
          });
        }
      }
    });
  }

  if (value.invalidation !== undefined) {
    if (!isRecord(value.invalidation)) {
      issues.push({ path: "$.invalidation", message: "Expected an object when present." });
    } else {
      if (value.invalidation.inputs !== undefined) {
        if (!Array.isArray(value.invalidation.inputs)) {
          issues.push({ path: "$.invalidation.inputs", message: "Expected an array when present." });
        } else {
          value.invalidation.inputs.forEach((input, index) => {
            const path = `$.invalidation.inputs[${index}]`;
            if (!isRecord(input)) {
              issues.push({ path, message: "Expected an object." });
              return;
            }
            if (input.kind !== "source" && input.kind !== "config") {
              issues.push({ path: `${path}.kind`, message: "Expected source or config." });
            }
            pushRequiredStringIssue(issues, input.path, `${path}.path`);
            pushRequiredStringIssue(issues, input.digest, `${path}.digest`);
          });
        }
      }

      if (value.invalidation.producers !== undefined) {
        if (!Array.isArray(value.invalidation.producers)) {
          issues.push({ path: "$.invalidation.producers", message: "Expected an array when present." });
        } else {
          value.invalidation.producers.forEach((producer, index) => {
            const path = `$.invalidation.producers[${index}]`;
            if (!isRecord(producer)) {
              issues.push({ path, message: "Expected an object." });
              return;
            }
            pushRequiredStringIssue(issues, producer.id, `${path}.id`);
            pushRequiredStringIssue(issues, producer.version, `${path}.version`);
          });
        }
      }
    }
  }

  if (value.supersession !== undefined) {
    if (!isRecord(value.supersession)) {
      issues.push({ path: "$.supersession", message: "Expected an object when present." });
    } else {
      pushRequiredStringIssue(issues, value.supersession.key, "$.supersession.key");
    }
  }

  if (value.freshness !== undefined) {
    if (!isRecord(value.freshness)) {
      issues.push({ path: "$.freshness", message: "Expected an object when present." });
    } else {
      if (!FRESHNESS_STATUSES.has(String(value.freshness.status))) {
        issues.push({
          path: "$.freshness.status",
          message: "Expected one of fresh, stale, partial, or unknown.",
        });
      }

      if (
        value.freshness.invalidatedBy !== undefined &&
        !isStringArray(value.freshness.invalidatedBy)
      ) {
        issues.push({
          path: "$.freshness.invalidatedBy",
          message: "Expected an array of strings when present.",
        });
      }
    }
  }

  if (value.provenance !== undefined) {
    if (!isRecord(value.provenance)) {
      issues.push({ path: "$.provenance", message: "Expected an object when present." });
    } else {
      if (
        value.provenance.confidence !== undefined &&
        (typeof value.provenance.confidence !== "number" ||
          value.provenance.confidence < 0 ||
          value.provenance.confidence > 1)
      ) {
        issues.push({
          path: "$.provenance.confidence",
          message: "Expected a number between 0 and 1 when present.",
        });
      }

      if (value.provenance.notes !== undefined && !isStringArray(value.provenance.notes)) {
        issues.push({
          path: "$.provenance.notes",
          message: "Expected an array of strings when present.",
        });
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, value: value as ArtifactHeader, issues: [] };
}

export function assertArtifactHeader(value: unknown): ArtifactHeader {
  return assertValid(validateArtifactHeader(value), "ArtifactHeader");
}

export const artifactHeaderSchema: ArtifactSchema<ArtifactHeader> = {
  validate: validateArtifactHeader,
  parse: assertArtifactHeader,
};

export function validateJsonArtifact<TData = unknown>(
  value: unknown,
): ValidationResult<JsonArtifact<TData>> {
  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [{ path: "$", message: "Expected an object." }],
    };
  }

  const headerResult = validateArtifactHeader(value.header);

  if (!headerResult.ok) {
    return {
      ok: false,
      issues: headerResult.issues.map((issue) => ({
        path: issue.path.replace("$", "$.header"),
        message: issue.message,
      })),
    };
  }

  if (!Object.hasOwn(value, "data")) {
    return {
      ok: false,
      issues: [{ path: "$.data", message: "Expected a data property." }],
    };
  }

  return {
    ok: true,
    value: {
      header: headerResult.value,
      data: value.data as TData,
    },
    issues: [],
  };
}

export function assertJsonArtifact<TData = unknown>(value: unknown): JsonArtifact<TData> {
  return assertValid(validateJsonArtifact<TData>(value), "JsonArtifact");
}

export const jsonArtifactSchema: ArtifactSchema<JsonArtifact> = {
  validate: validateJsonArtifact,
  parse: assertJsonArtifact,
};

export function createArtifactRef(input: ArtifactRef): ArtifactRef {
  return assertArtifactRef({ ...input });
}

export function createArtifactHeader(input: ArtifactHeader): ArtifactHeader {
  return assertArtifactHeader(stripUndefinedObjectValues({
    ...input,
    subject: { ...input.subject },
    producer: { ...input.producer },
    inputRefs: input.inputRefs.map((inputRef) => ({ ...inputRef })),
    invalidation: input.invalidation
      ? {
          inputs: input.invalidation.inputs?.map((entry) => ({ ...entry })),
          producers: input.invalidation.producers?.map((entry) => ({ ...entry })),
        }
      : undefined,
    supersession: input.supersession ? { ...input.supersession } : undefined,
    freshness: input.freshness
      ? {
          ...input.freshness,
          invalidatedBy: input.freshness.invalidatedBy
            ? [...input.freshness.invalidatedBy]
            : undefined,
        }
      : undefined,
    provenance: input.provenance
      ? {
          ...input.provenance,
          notes: input.provenance.notes ? [...input.provenance.notes] : undefined,
      }
      : undefined,
  }));
}

export function createSourceStateBinding(input: SourceState): SourceStateBinding {
  const sourceState: SourceState = {
    baseRef: input.baseRef,
    files: input.files
      .map((file) => ({ ...file }))
      .sort((left, right) => left.path.localeCompare(right.path)),
  };
  const validated = assertValid(validateSourceState(sourceState), "SourceState");
  return {
    ...validated,
    digest: digestJson(validated),
  };
}

export function validateSourceState(value: unknown): ValidationResult<SourceState> {
  const issues: ValidationIssue[] = [];
  validateSourceStateValue(value, issues);
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: value as SourceState, issues: [] };
}

export function validateSourceStateBinding(value: unknown): ValidationResult<SourceStateBinding> {
  const issues: ValidationIssue[] = [];
  validateSourceStateValue(value, issues);
  if (!isRecord(value)) return { ok: false, issues };
  if (typeof value.digest !== "string" || !SHA256_PATTERN.test(value.digest)) {
    issues.push({ path: "$.digest", message: "Expected a lowercase SHA-256 digest." });
  } else if (issues.length === 0) {
    const files = (value.files as SourceStateFile[]).map((file) => ({ ...file }));
    const normalizedFiles = [...files].sort((left, right) => left.path.localeCompare(right.path));
    if (files.some((file, index) => file.path !== normalizedFiles[index]?.path)) {
      issues.push({ path: "$.files", message: "Expected source files sorted by repository-relative path." });
    }
    const expected = digestJson({ baseRef: value.baseRef, files: normalizedFiles });
    if (value.digest !== expected) {
      issues.push({ path: "$.digest", message: "Expected the digest of the normalized source state." });
    }
  }
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: value as SourceStateBinding, issues: [] };
}

export function assertSourceState(value: unknown): SourceState {
  return assertValid(validateSourceState(value), "SourceState");
}

export function assertSourceStateBinding(value: unknown): SourceStateBinding {
  return assertValid(validateSourceStateBinding(value), "SourceStateBinding");
}

export function sourceStateBindingsMatch(
  left: SourceStateBinding,
  right: SourceStateBinding,
): boolean {
  return left.digest === right.digest;
}

export function createJsonArtifact<TData>(input: JsonArtifact<TData>): JsonArtifact<TData> {
  return assertJsonArtifact<TData>({
    header: createArtifactHeader(input.header),
    data: input.data,
  });
}

export function toArtifactRef(header: ArtifactHeader, input?: { path?: string; digest?: string }): ArtifactRef {
  return createArtifactRef({
    type: header.artifactType,
    id: header.artifactId,
    path: input?.path,
    digest: input?.digest,
    schemaVersion: header.schemaVersion,
  });
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalizeForDigest(value));
}

export function digestJson(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function digestJsonArtifact(value: JsonArtifact): string {
  return digestJson(createJsonArtifact(value));
}

function normalizeForDigest(value: unknown): unknown {
  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeForDigest(item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (isRecord(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((normalized, key) => {
        const item = value[key];

        if (item !== undefined) {
          normalized[key] = normalizeForDigest(item);
        }

        return normalized;
      }, {});
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value === undefined) {
    return undefined;
  }

  throw new TypeError(`Cannot create a JSON digest for value of type ${typeof value}.`);
}

function validateSourceStateValue(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path: "$", message: "Expected an object." });
    return;
  }
  pushRequiredStringIssue(issues, value.baseRef, "$.baseRef");
  if (!Array.isArray(value.files) || value.files.length === 0) {
    issues.push({ path: "$.files", message: "Expected a non-empty array." });
    return;
  }

  const seen = new Set<string>();
  value.files.forEach((candidate, index) => {
    const path = `$.files[${index}]`;
    if (!isRecord(candidate)) {
      issues.push({ path, message: "Expected an object." });
      return;
    }
    pushRequiredStringIssue(issues, candidate.path, `${path}.path`);
    if (typeof candidate.path === "string") {
      if (!isSafeSourcePath(candidate.path)) {
        issues.push({ path: `${path}.path`, message: "Expected a safe repository-relative source path." });
      }
      if (seen.has(candidate.path)) {
        issues.push({ path: `${path}.path`, message: `Duplicate source path ${candidate.path}.` });
      }
      seen.add(candidate.path);
    }
    if (!SOURCE_STATE_FILE_STATUSES.has(candidate.status as SourceStateFileStatus)) {
      issues.push({ path: `${path}.status`, message: "Expected added, modified, deleted, or unchanged." });
    }
    validateOptionalSha256(candidate.beforeSha256, `${path}.beforeSha256`, issues);
    validateOptionalSha256(candidate.afterSha256, `${path}.afterSha256`, issues);

    if (candidate.status === "added") {
      if (candidate.beforeSha256 !== undefined) {
        issues.push({ path: `${path}.beforeSha256`, message: "Added files cannot have a before digest." });
      }
      if (candidate.afterSha256 === undefined) {
        issues.push({ path: `${path}.afterSha256`, message: "Added files require an after digest." });
      }
    } else if (candidate.status === "deleted") {
      if (candidate.beforeSha256 === undefined) {
        issues.push({ path: `${path}.beforeSha256`, message: "Deleted files require a before digest." });
      }
      if (candidate.afterSha256 !== undefined) {
        issues.push({ path: `${path}.afterSha256`, message: "Deleted files cannot have an after digest." });
      }
    } else if (candidate.status === "modified") {
      if (candidate.beforeSha256 === undefined || candidate.afterSha256 === undefined) {
        issues.push({ path, message: "Modified files require before and after digests." });
      } else if (candidate.beforeSha256 === candidate.afterSha256) {
        issues.push({ path, message: "Modified files require different before and after digests." });
      }
    } else if (candidate.status === "unchanged") {
      if (candidate.beforeSha256 === undefined || candidate.afterSha256 === undefined) {
        issues.push({ path, message: "Unchanged files require before and after digests." });
      } else if (candidate.beforeSha256 !== candidate.afterSha256) {
        issues.push({ path, message: "Unchanged files require matching before and after digests." });
      }
    }
  });
}

function validateOptionalSha256(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value !== undefined && (typeof value !== "string" || !SHA256_PATTERN.test(value))) {
    issues.push({ path, message: "Expected a lowercase SHA-256 digest." });
  }
}

function isSafeSourcePath(value: string): boolean {
  return value.length > 0
    && !value.startsWith("/")
    && !value.startsWith("./")
    && !/^[A-Za-z]:\//u.test(value)
    && !value.includes("\\")
    && !value.split("/").includes("..")
    && value !== ".rekon"
    && !value.startsWith(".rekon/");
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
