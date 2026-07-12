import type { ArtifactRef } from "@rekon/kernel-artifacts";
import { type Assessment } from "@rekon/kernel-assessments";
import type { Finding, FindingSeverity } from "@rekon/kernel-findings";
import { digestJson } from "@rekon/kernel-artifacts";

import { isNonProductionPath } from "./grammar-divergence.js";

export const DEBT_SEMANTIC_RULE_ID = "debt.semantic";

type Severity = "low" | "medium" | "high";

type SemanticDebtConcernLike = {
  type?: unknown;
  severity?: unknown;
  description?: unknown;
  line?: unknown;
  pattern?: unknown;
  included?: unknown;
};

type SemanticDebtEntryLike = {
  path?: unknown;
  verdict?: unknown;
  concerns?: unknown;
};

type SemanticDebtReportLike = {
  policy?: {
    provider?: unknown;
    model?: unknown;
    promptVersion?: unknown;
  };
  entries?: unknown;
};

const SEVERITY_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2 };

function isSeverity(value: unknown): value is Severity {
  return value === "low" || value === "medium" || value === "high";
}

function maxSeverity(concerns: Array<{ severity: Severity }>): FindingSeverity {
  const max = concerns.reduce<Severity>((current, concern) => {
    return SEVERITY_RANK[concern.severity] > SEVERITY_RANK[current] ? concern.severity : current;
  }, "low");
  return max;
}

function includedConcerns(entry: SemanticDebtEntryLike): Array<{
  type: string;
  severity: Severity;
  description: string;
  line?: number;
  pattern?: string;
}> {
  if (!Array.isArray(entry.concerns)) return [];
  const out: Array<{ type: string; severity: Severity; description: string; line?: number; pattern?: string }> = [];

  for (const concern of entry.concerns as SemanticDebtConcernLike[]) {
    if (!concern || concern.included !== true || !isSeverity(concern.severity)) continue;
    const description = typeof concern.description === "string" ? concern.description.trim() : "";
    if (description.length === 0) continue;
    out.push({
      type: typeof concern.type === "string" && concern.type.length > 0 ? concern.type : "tech_debt",
      severity: concern.severity,
      description,
      ...(typeof concern.line === "number" && Number.isInteger(concern.line) && concern.line > 0
        ? { line: concern.line }
        : {}),
      ...(typeof concern.pattern === "string" && concern.pattern.length > 0 ? { pattern: concern.pattern } : {}),
    });
  }

  return out;
}

export function evaluateSemanticDebt(reportLike: unknown, reportRef?: ArtifactRef): Finding[] {
  if (!reportLike || typeof reportLike !== "object" || Array.isArray(reportLike)) return [];
  const report = reportLike as SemanticDebtReportLike;
  if (!Array.isArray(report.entries)) return [];

  const provider = typeof report.policy?.provider === "string" ? report.policy.provider : "";
  const model = typeof report.policy?.model === "string" ? report.policy.model : "";
  const promptVersion = typeof report.policy?.promptVersion === "string" ? report.policy.promptVersion : "";
  const findings: Finding[] = [];

  const entries = (report.entries as SemanticDebtEntryLike[])
    .filter((entry) => entry && typeof entry === "object")
    .sort((left, right) => String(left.path ?? "").localeCompare(String(right.path ?? "")));

  for (const entry of entries) {
    const file = typeof entry.path === "string" ? entry.path : "";
    if (entry.verdict !== "debt" || file.length === 0 || isNonProductionPath(file)) continue;
    const concerns = includedConcerns(entry);
    if (concerns.length === 0) continue;

    findings.push({
      id: `${DEBT_SEMANTIC_RULE_ID}:${file}`,
      type: "tech_debt",
      severity: maxSeverity(concerns),
      title: `Semantic tech debt in ${file}`,
      description: concerns.map((concern) => concern.description).join(" "),
      subjects: [file],
      files: [file],
      ruleId: DEBT_SEMANTIC_RULE_ID,
      ...(reportRef ? { evidence: [reportRef] } : {}),
      details: {
        provenance: "semantic-llm",
        provider,
        model,
        promptVersion,
        concerns,
      },
    });
  }

  return findings;
}

/**
 * Semantic judgment is useful evidence, but it is not proof. Emit one claim
 * per concern so downstream corroboration can promote individual claims
 * without promoting every concern found in the same file.
 */
export function evaluateSemanticDebtClaims(reportLike: unknown, reportRef?: ArtifactRef): Assessment[] {
  if (!reportLike || typeof reportLike !== "object" || Array.isArray(reportLike) || !reportRef) return [];
  const report = reportLike as SemanticDebtReportLike;
  if (!Array.isArray(report.entries)) return [];

  const provider = typeof report.policy?.provider === "string" ? report.policy.provider : "";
  const model = typeof report.policy?.model === "string" ? report.policy.model : "";
  const promptVersion = typeof report.policy?.promptVersion === "string" ? report.policy.promptVersion : "";
  const claims: Assessment[] = [];

  const entries = (report.entries as SemanticDebtEntryLike[])
    .filter((entry) => entry && typeof entry === "object")
    .sort((left, right) => String(left.path ?? "").localeCompare(String(right.path ?? "")));

  for (const entry of entries) {
    const file = typeof entry.path === "string" ? entry.path : "";
    if (entry.verdict !== "debt" || file.length === 0 || isNonProductionPath(file)) continue;

    for (const concern of includedConcerns(entry)) {
      const fingerprint = digestJson({
        file,
        type: concern.type,
        description: concern.description,
        line: concern.line,
        pattern: concern.pattern,
      }).slice(0, 12);
      const rootCause = concern.pattern ?? fingerprint;
      claims.push({
        id: `${DEBT_SEMANTIC_RULE_ID}:${file}:${fingerprint}`,
        kind: "semantic_claim",
        type: concern.type,
        impact: concern.severity,
        title: `Possible ${semanticConcernLabel(concern.type)} in ${file}`,
        description: concern.description,
        subjects: [file],
        files: [file],
        ruleId: DEBT_SEMANTIC_RULE_ID,
        suggestedAction: "Corroborate this claim with code, graph, runtime, or operator evidence before treating it as a finding.",
        evidence: [reportRef],
        rootCauseKey: `${concern.type}:${file}:${rootCause}`,
        confidence: {
          score: 0.6,
          basis: "semantic",
          verification: "unverified",
          rationale: "Produced by semantic model judgment without deterministic corroboration.",
        },
        details: {
          provider,
          model,
          promptVersion,
          concernType: concern.type,
          ...(concern.line ? { line: concern.line } : {}),
          ...(concern.pattern ? { pattern: concern.pattern } : {}),
        },
      });
    }
  }

  return claims.sort((left, right) => left.id.localeCompare(right.id));
}

function semanticConcernLabel(type: string): string {
  return type.replaceAll("_", " ");
}
