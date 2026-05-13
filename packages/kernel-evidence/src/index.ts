import {
  type ArtifactHeader,
  type ArtifactSchema,
  type ValidationIssue,
  type ValidationResult,
  assertArtifactHeader,
  canonicalJson,
  validateArtifactHeader,
} from "@rekon/kernel-artifacts";

export const BUILT_IN_EVIDENCE_FACT_KINDS = [
  "file",
  "symbol",
  "import",
  "export",
  "manifest",
  "build_target",
  "route",
  "screen",
  "test",
  "capability_hint",
  "ownership_hint",
  "runtime_link",
] as const;

export type BuiltInEvidenceFactKind = (typeof BUILT_IN_EVIDENCE_FACT_KINDS)[number];

export type EvidenceFactKind = BuiltInEvidenceFactKind | string;

export type EvidenceFact = {
  id: string;
  kind: EvidenceFactKind;
  subject: string;
  value: Record<string, unknown>;
  confidence: number;
  provenance: {
    source: string;
    pack: string;
    file?: string;
    line?: number;
    extractorVersion: string;
  };
};

export type EvidenceGraph = {
  header: ArtifactHeader;
  facts: EvidenceFact[];
};

export type ProviderContext = {
  repoRoot: string;
  includeTests: boolean;
  changedFiles?: string[];
  changedSince?: string | null;
  incremental?: boolean;
};

export interface EvidenceProvider {
  id: string;
  kind: "universal" | "language" | "framework" | "repo" | "runtime" | "semantic";
  supports(ctx: ProviderContext): boolean;
  extract(ctx: ProviderContext): Promise<EvidenceFact[]>;
}

export type DedupeEvidenceFactsOptions = {
  key?: (fact: EvidenceFact) => string;
};

const BUILT_IN_EVIDENCE_FACT_KIND_SET = new Set<string>(BUILT_IN_EVIDENCE_FACT_KINDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
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

export function isBuiltInEvidenceFactKind(kind: string): kind is BuiltInEvidenceFactKind {
  return BUILT_IN_EVIDENCE_FACT_KIND_SET.has(kind);
}

export function isNamespacedEvidenceFactKind(kind: string): boolean {
  return /^[a-z0-9][a-z0-9._-]*[/:][a-z0-9][a-z0-9._-]*$/i.test(kind);
}

export function getEvidenceFactKindGuidance(kind: string): string | null {
  if (isBuiltInEvidenceFactKind(kind) || isNamespacedEvidenceFactKind(kind)) {
    return null;
  }

  return "Unknown evidence fact kinds are allowed, but community kinds should be namespaced such as package:kind.";
}

export function validateConfidence(value: unknown, path = "$.confidence"): ValidationIssue[] {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    return [{ path, message: "Expected a finite number between 0 and 1." }];
  }

  return [];
}

export function validateEvidenceFact(value: unknown): ValidationResult<EvidenceFact> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [{ path: "$", message: "Expected an object." }],
    };
  }

  pushRequiredStringIssue(issues, value.id, "$.id");
  pushRequiredStringIssue(issues, value.kind, "$.kind");
  pushRequiredStringIssue(issues, value.subject, "$.subject");

  if (!isRecord(value.value)) {
    issues.push({ path: "$.value", message: "Expected an object." });
  }

  issues.push(...validateConfidence(value.confidence));

  if (!isRecord(value.provenance)) {
    issues.push({ path: "$.provenance", message: "Expected an object." });
  } else {
    pushRequiredStringIssue(issues, value.provenance.source, "$.provenance.source");
    pushRequiredStringIssue(issues, value.provenance.pack, "$.provenance.pack");
    pushRequiredStringIssue(
      issues,
      value.provenance.extractorVersion,
      "$.provenance.extractorVersion",
    );

    if (value.provenance.file !== undefined && typeof value.provenance.file !== "string") {
      issues.push({ path: "$.provenance.file", message: "Expected a string when present." });
    }

    const provenanceLine = value.provenance.line;

    if (
      provenanceLine !== undefined &&
      (typeof provenanceLine !== "number" ||
        !Number.isInteger(provenanceLine) ||
        provenanceLine < 1)
    ) {
      issues.push({ path: "$.provenance.line", message: "Expected a positive integer when present." });
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, value: value as EvidenceFact, issues: [] };
}

export function assertEvidenceFact(value: unknown): EvidenceFact {
  return assertValid(validateEvidenceFact(value), "EvidenceFact");
}

export const evidenceFactSchema: ArtifactSchema<EvidenceFact> = {
  validate: validateEvidenceFact,
  parse: assertEvidenceFact,
};

export function validateEvidenceGraph(value: unknown): ValidationResult<EvidenceGraph> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [{ path: "$", message: "Expected an object." }],
    };
  }

  const headerResult = validateArtifactHeader(value.header);

  if (!headerResult.ok) {
    issues.push(
      ...headerResult.issues.map((issue) => ({
        path: issue.path.replace("$", "$.header"),
        message: issue.message,
      })),
    );
  } else if (headerResult.value.artifactType !== "EvidenceGraph") {
    issues.push({
      path: "$.header.artifactType",
      message: "Expected artifactType to be EvidenceGraph.",
    });
  }

  if (!Array.isArray(value.facts)) {
    issues.push({ path: "$.facts", message: "Expected an array." });
  } else {
    value.facts.forEach((fact, index) => {
      const result = validateEvidenceFact(fact);

      if (!result.ok) {
        issues.push(
          ...result.issues.map((issue) => ({
            path: issue.path.replace("$", `$.facts[${index}]`),
            message: issue.message,
          })),
        );
      }
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      header: assertArtifactHeader(value.header),
      facts: value.facts as EvidenceFact[],
    },
    issues: [],
  };
}

export function assertEvidenceGraph(value: unknown): EvidenceGraph {
  return assertValid(validateEvidenceGraph(value), "EvidenceGraph");
}

export const evidenceGraphSchema: ArtifactSchema<EvidenceGraph> = {
  validate: validateEvidenceGraph,
  parse: assertEvidenceGraph,
};

export function validateProviderContext(value: unknown): ValidationResult<ProviderContext> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [{ path: "$", message: "Expected an object." }],
    };
  }

  pushRequiredStringIssue(issues, value.repoRoot, "$.repoRoot");

  if (typeof value.includeTests !== "boolean") {
    issues.push({ path: "$.includeTests", message: "Expected a boolean." });
  }

  if (value.changedFiles !== undefined && !isStringArray(value.changedFiles)) {
    issues.push({ path: "$.changedFiles", message: "Expected an array of strings when present." });
  }

  if (
    value.changedSince !== undefined &&
    value.changedSince !== null &&
    typeof value.changedSince !== "string"
  ) {
    issues.push({ path: "$.changedSince", message: "Expected a string, null, or undefined." });
  }

  if (value.incremental !== undefined && typeof value.incremental !== "boolean") {
    issues.push({ path: "$.incremental", message: "Expected a boolean when present." });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, value: value as ProviderContext, issues: [] };
}

export function assertProviderContext(value: unknown): ProviderContext {
  return assertValid(validateProviderContext(value), "ProviderContext");
}

export const providerContextSchema: ArtifactSchema<ProviderContext> = {
  validate: validateProviderContext,
  parse: assertProviderContext,
};

export function createEvidenceFact(input: EvidenceFact): EvidenceFact {
  return assertEvidenceFact({
    ...input,
    value: { ...input.value },
    provenance: { ...input.provenance },
  });
}

export function createEvidenceGraph(input: EvidenceGraph): EvidenceGraph {
  return assertEvidenceGraph({
    header: { ...input.header },
    facts: input.facts.map((fact) => createEvidenceFact(fact)),
  });
}

export function defaultEvidenceFactDedupeKey(fact: EvidenceFact): string {
  const normalizedFact = createEvidenceFact(fact);

  return canonicalJson({
    kind: normalizedFact.kind,
    subject: normalizedFact.subject,
    value: normalizedFact.value,
    provenance: normalizedFact.provenance,
  });
}

export function dedupeEvidenceFacts(
  facts: EvidenceFact[],
  options: DedupeEvidenceFactsOptions = {},
): EvidenceFact[] {
  const keyForFact = options.key ?? defaultEvidenceFactDedupeKey;
  const byKey = new Map<string, EvidenceFact>();

  for (const fact of facts) {
    const validatedFact = createEvidenceFact(fact);
    const key = keyForFact(validatedFact);
    const existingFact = byKey.get(key);

    if (!existingFact || compareEvidenceFacts(validatedFact, existingFact) < 0) {
      byKey.set(key, validatedFact);
    }
  }

  return [...byKey.values()].sort(compareEvidenceFacts);
}

function compareEvidenceFacts(left: EvidenceFact, right: EvidenceFact): number {
  if (left.confidence !== right.confidence) {
    return right.confidence - left.confidence;
  }

  return left.id.localeCompare(right.id);
}
