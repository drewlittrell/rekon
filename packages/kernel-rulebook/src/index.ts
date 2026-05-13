import {
  type ArtifactHeader,
  type ArtifactSchema,
  type ValidationIssue,
  type ValidationResult,
  validateArtifactHeader,
} from "@rekon/kernel-artifacts";

export type RuleSeverity = "critical" | "high" | "medium" | "low";

export type Rule = {
  id: string;
  severity: RuleSeverity;
  message: string;
  source: string;
  appliesTo: string[];
  evaluator?: string;
  enabled?: boolean;
  options?: Record<string, unknown>;
};

export type Rulebook = {
  header: ArtifactHeader;
  rules: Rule[];
};

const SEVERITIES = new Set<RuleSeverity>(["critical", "high", "medium", "low"]);

export function createRulebook(input: Rulebook): Rulebook {
  return assertRulebook({
    header: input.header,
    rules: [...dedupeBy(input.rules, (rule) => rule.id).values()]
      .map((rule) => ({
        ...rule,
        appliesTo: uniqueSorted(rule.appliesTo),
        enabled: rule.enabled ?? true,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  });
}

export function validateRulebook(value: unknown): ValidationResult<Rulebook> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  const header = validateArtifactHeader(value.header);

  if (!header.ok) {
    issues.push(...prefixIssues(header.issues, "$.header"));
  } else if (header.value.artifactType !== "Rulebook") {
    issues.push({ path: "$.header.artifactType", message: "Expected artifactType to be Rulebook." });
  }

  if (!Array.isArray(value.rules)) {
    issues.push({ path: "$.rules", message: "Expected an array." });
  } else {
    value.rules.forEach((rule, index) => validateRule(rule, `$.rules[${index}]`, issues));
  }

  return issues.length > 0 ? { ok: false, issues } : { ok: true, value: value as Rulebook, issues: [] };
}

export function assertRulebook(value: unknown): Rulebook {
  const result = validateRulebook(value);

  if (result.ok) {
    return result.value;
  }

  throw new TypeError(`Rulebook validation failed: ${result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
}

export const rulebookSchema: ArtifactSchema<Rulebook> = {
  validate: validateRulebook,
  parse: assertRulebook,
};

function validateRule(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  requiredString(value.id, `${path}.id`, issues);
  requiredString(value.message, `${path}.message`, issues);
  requiredString(value.source, `${path}.source`, issues);

  if (!SEVERITIES.has(value.severity as RuleSeverity)) {
    issues.push({ path: `${path}.severity`, message: "Expected critical, high, medium, or low." });
  }

  if (!Array.isArray(value.appliesTo) || !value.appliesTo.every((item) => typeof item === "string")) {
    issues.push({ path: `${path}.appliesTo`, message: "Expected an array of strings." });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path, message: "Expected a non-empty string." });
  }
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function dedupeBy<T>(values: T[], key: (value: T) => string): Map<string, T> {
  return values.reduce((map, value) => map.set(key(value), value), new Map<string, T>());
}

function prefixIssues(issues: ValidationIssue[], prefix: string): ValidationIssue[] {
  return issues.map((issue) => ({ path: issue.path.replace("$", prefix), message: issue.message }));
}
