import {
  type ArtifactHeader,
  type ArtifactRef,
  type ArtifactSchema,
  createArtifactHeader,
  createArtifactRef,
  createSourceStateBinding,
  type SourceStateBinding,
  type ValidationIssue,
  type ValidationResult,
  validateArtifactHeader,
  validateArtifactRef,
  validateSourceStateBinding,
} from "@rekon/kernel-artifacts";

export type PlacementVerificationVerdict = "supported" | "refuted" | "unresolved";

export type PlacementVerificationSourceEvidence = {
  path: string;
  sha256: string;
  lineStart: number;
  lineEnd: number;
  excerpt: string;
};

export type PlacementVerificationReport = {
  header: ArtifactHeader;
  task: {
    text: string;
    paths: string[];
  };
  obligation: {
    id: string;
    assertion: string;
    contractRef: ArtifactRef;
    flowId: string;
    stageId: string;
    stagePaths: string[];
    changedSourcePaths: string[];
  };
  sourceState: SourceStateBinding;
  sourceEvidence: PlacementVerificationSourceEvidence[];
  verdict: PlacementVerificationVerdict;
  explanation: string;
  verifier: {
    kind: "model" | "service";
    id: string;
    version: string;
    independentOf: string[];
  };
};

const VERDICTS = new Set<PlacementVerificationVerdict>([
  "supported",
  "refuted",
  "unresolved",
]);
const VERIFIER_KINDS = new Set<PlacementVerificationReport["verifier"]["kind"]>([
  "model",
  "service",
]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_EXCERPT_LENGTH = 6_000;

export function createPlacementVerificationReport(
  input: PlacementVerificationReport,
): PlacementVerificationReport {
  return assertPlacementVerificationReport({
    header: createArtifactHeader(input.header),
    task: {
      text: input.task.text.trim(),
      paths: unique(input.task.paths),
    },
    obligation: {
      id: input.obligation.id.trim(),
      assertion: input.obligation.assertion.trim(),
      contractRef: createArtifactRef(input.obligation.contractRef),
      flowId: input.obligation.flowId.trim(),
      stageId: input.obligation.stageId.trim(),
      stagePaths: unique(input.obligation.stagePaths),
      changedSourcePaths: unique(input.obligation.changedSourcePaths),
    },
    sourceState: createSourceStateBinding(input.sourceState),
    sourceEvidence: input.sourceEvidence
      .map((entry) => ({
        path: entry.path.trim(),
        sha256: entry.sha256,
        lineStart: entry.lineStart,
        lineEnd: entry.lineEnd,
        excerpt: entry.excerpt,
      }))
      .sort((left, right) =>
        left.path.localeCompare(right.path)
        || left.lineStart - right.lineStart
        || left.lineEnd - right.lineEnd),
    verdict: input.verdict,
    explanation: input.explanation.trim(),
    verifier: {
      kind: input.verifier.kind,
      id: input.verifier.id.trim(),
      version: input.verifier.version.trim(),
      independentOf: unique(input.verifier.independentOf),
    },
  });
}

export function validatePlacementVerificationReport(
  value: unknown,
): ValidationResult<PlacementVerificationReport> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [{ path: "$", message: "Expected an object." }],
    };
  }

  append(issues, validateArtifactHeader(value.header).issues, "$.header");
  if (isRecord(value.header)) {
    if (value.header.artifactType !== "PlacementVerificationReport") {
      issues.push({
        path: "$.header.artifactType",
        message: 'Expected "PlacementVerificationReport".',
      });
    }
    if (!isRecord(value.header.freshness)) {
      issues.push({ path: "$.header.freshness", message: "Expected freshness metadata." });
    }
    if (!isRecord(value.header.provenance)) {
      issues.push({ path: "$.header.provenance", message: "Expected provenance metadata." });
    }
  }

  let taskPaths: string[] = [];
  if (!isRecord(value.task)) {
    issues.push({ path: "$.task", message: "Expected an object." });
  } else {
    requiredString(issues, value.task.text, "$.task.text");
    taskPaths = stringArray(issues, value.task.paths, "$.task.paths", true);
  }

  let contractRef: ArtifactRef | undefined;
  let changedSourcePaths: string[] = [];
  if (!isRecord(value.obligation)) {
    issues.push({ path: "$.obligation", message: "Expected an object." });
  } else {
    requiredString(issues, value.obligation.id, "$.obligation.id");
    requiredString(issues, value.obligation.assertion, "$.obligation.assertion");
    append(issues, validateArtifactRef(value.obligation.contractRef).issues, "$.obligation.contractRef");
    if (isRecord(value.obligation.contractRef)) {
      contractRef = value.obligation.contractRef as ArtifactRef;
      if (contractRef.type !== "FlowContract") {
        issues.push({
          path: "$.obligation.contractRef.type",
          message: 'Expected "FlowContract".',
        });
      }
    }
    requiredString(issues, value.obligation.flowId, "$.obligation.flowId");
    requiredString(issues, value.obligation.stageId, "$.obligation.stageId");
    stringArray(issues, value.obligation.stagePaths, "$.obligation.stagePaths", true);
    changedSourcePaths = stringArray(
      issues,
      value.obligation.changedSourcePaths,
      "$.obligation.changedSourcePaths",
      true,
    );
  }

  append(issues, validateSourceStateBinding(value.sourceState).issues, "$.sourceState");
  const sourceState = isRecord(value.sourceState)
    && Array.isArray(value.sourceState.files)
    ? value.sourceState as unknown as SourceStateBinding
    : undefined;

  const evidencePaths = new Set<string>();
  const evidenceKeys = new Set<string>();
  if (!Array.isArray(value.sourceEvidence) || value.sourceEvidence.length === 0) {
    issues.push({ path: "$.sourceEvidence", message: "Expected at least one source evidence entry." });
  } else {
    value.sourceEvidence.forEach((entry, index) => {
      const path = `$.sourceEvidence[${index}]`;
      if (!isRecord(entry)) {
        issues.push({ path, message: "Expected an object." });
        return;
      }
      const evidencePath = requiredString(issues, entry.path, `${path}.path`);
      if (typeof entry.sha256 !== "string" || !SHA256_PATTERN.test(entry.sha256)) {
        issues.push({ path: `${path}.sha256`, message: "Expected a lowercase SHA-256 digest." });
      }
      positiveInteger(issues, entry.lineStart, `${path}.lineStart`);
      positiveInteger(issues, entry.lineEnd, `${path}.lineEnd`);
      if (
        Number.isInteger(entry.lineStart)
        && Number.isInteger(entry.lineEnd)
        && Number(entry.lineEnd) < Number(entry.lineStart)
      ) {
        issues.push({ path: `${path}.lineEnd`, message: "Expected lineEnd at or after lineStart." });
      }
      const excerpt = requiredString(issues, entry.excerpt, `${path}.excerpt`);
      if (excerpt.length > MAX_EXCERPT_LENGTH) {
        issues.push({
          path: `${path}.excerpt`,
          message: `Expected at most ${MAX_EXCERPT_LENGTH} characters.`,
        });
      }
      if (evidencePath) {
        evidencePaths.add(evidencePath);
        const key = `${evidencePath}:${String(entry.lineStart)}:${String(entry.lineEnd)}`;
        if (evidenceKeys.has(key)) {
          issues.push({ path, message: "Duplicate source evidence span." });
        }
        evidenceKeys.add(key);

        const stateFile = sourceState?.files.find((file) => file.path === evidencePath);
        if (!stateFile) {
          issues.push({
            path: `${path}.path`,
            message: "Expected source evidence to reference a source-state file.",
          });
        } else {
          const expectedDigest = stateFile.afterSha256 ?? stateFile.beforeSha256;
          if (expectedDigest && entry.sha256 !== expectedDigest) {
            issues.push({
              path: `${path}.sha256`,
              message: "Expected the current source-state file digest.",
            });
          }
        }
      }
    });
  }

  if (!VERDICTS.has(value.verdict as PlacementVerificationVerdict)) {
    issues.push({
      path: "$.verdict",
      message: "Expected supported, refuted, or unresolved.",
    });
  }
  requiredString(issues, value.explanation, "$.explanation");

  if (!isRecord(value.verifier)) {
    issues.push({ path: "$.verifier", message: "Expected an object." });
  } else {
    if (!VERIFIER_KINDS.has(value.verifier.kind as PlacementVerificationReport["verifier"]["kind"])) {
      issues.push({ path: "$.verifier.kind", message: "Expected model or service." });
    }
    const verifierId = requiredString(issues, value.verifier.id, "$.verifier.id");
    requiredString(issues, value.verifier.version, "$.verifier.version");
    const independentOf = stringArray(
      issues,
      value.verifier.independentOf,
      "$.verifier.independentOf",
      true,
    );
    if (verifierId && independentOf.includes(verifierId)) {
      issues.push({
        path: "$.verifier.independentOf",
        message: "A verifier cannot be independent of itself.",
      });
    }
  }

  if (sourceState) {
    const sourceStatePaths = sourceState.files.map((file) => file.path);
    if (!sameStrings(taskPaths, sourceStatePaths)) {
      issues.push({
        path: "$.task.paths",
        message: "Expected task paths to match the bound source-state paths.",
      });
    }
  }
  for (const path of changedSourcePaths) {
    if (!taskPaths.includes(path)) {
      issues.push({
        path: "$.obligation.changedSourcePaths",
        message: `Changed source path is not bound by the task source state: ${path}.`,
      });
    }
    if (!evidencePaths.has(path)) {
      issues.push({
        path: "$.sourceEvidence",
        message: `Expected source evidence for changed source path ${path}.`,
      });
    }
  }
  if (isRecord(value.header)) {
    const headerPaths = isRecord(value.header.subject) && Array.isArray(value.header.subject.paths)
      ? value.header.subject.paths.filter((entry): entry is string => typeof entry === "string")
      : [];
    if (!sameStrings(taskPaths, headerPaths)) {
      issues.push({
        path: "$.header.subject.paths",
        message: "Expected header subject paths to match task paths.",
      });
    }
    if (
      contractRef
      && Array.isArray(value.header.inputRefs)
      && !value.header.inputRefs.some((ref) =>
        isRecord(ref)
        && ref.type === contractRef?.type
        && ref.id === contractRef?.id
        && ref.schemaVersion === contractRef?.schemaVersion)
    ) {
      issues.push({
        path: "$.header.inputRefs",
        message: "Expected the reviewed FlowContract ref.",
      });
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    value: value as PlacementVerificationReport,
    issues: [],
  };
}

export function assertPlacementVerificationReport(
  value: unknown,
): PlacementVerificationReport {
  const result = validatePlacementVerificationReport(value);
  if (result.ok) return result.value;
  throw new TypeError(
    `PlacementVerificationReport validation failed: ${result.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("; ")}`,
  );
}

export const placementVerificationReportSchema: ArtifactSchema<PlacementVerificationReport> = {
  validate: validatePlacementVerificationReport,
  parse: assertPlacementVerificationReport,
};

function stringArray(
  issues: ValidationIssue[],
  value: unknown,
  path: string,
  requireNonEmpty: boolean,
): string[] {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array." });
    return [];
  }
  const output: string[] = [];
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    const normalized = requiredString(issues, entry, `${path}[${index}]`);
    if (!normalized) return;
    if (seen.has(normalized)) {
      issues.push({ path: `${path}[${index}]`, message: `Duplicate value ${normalized}.` });
      return;
    }
    seen.add(normalized);
    output.push(normalized);
  });
  if (requireNonEmpty && output.length === 0) {
    issues.push({ path, message: "Expected at least one entry." });
  }
  return output;
}

function requiredString(issues: ValidationIssue[], value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path, message: "Expected a non-empty string." });
    return "";
  }
  return value.trim();
}

function positiveInteger(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!Number.isInteger(value) || Number(value) < 1) {
    issues.push({ path, message: "Expected a positive integer." });
  }
}

function append(output: ValidationIssue[], issues: ValidationIssue[], prefix: string): void {
  for (const issue of issues) {
    output.push({
      ...issue,
      path: `${prefix}${issue.path === "$" ? "" : issue.path.slice(1)}`,
    });
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function sameStrings(left: string[], right: string[]): boolean {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
