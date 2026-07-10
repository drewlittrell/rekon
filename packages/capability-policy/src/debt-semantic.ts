import type { ArtifactRef } from "@rekon/kernel-artifacts";
import type { Finding, FindingSeverity } from "@rekon/kernel-findings";

import { isNonProductionPath } from "./grammar-divergence.js";

export const DEBT_SEMANTIC_RULE_ID = "debt.semantic";

type Severity = "low" | "medium" | "high";

type SemanticDebtConcernLike = {
  severity?: unknown;
  description?: unknown;
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
  severity: Severity;
  description: string;
  pattern?: string;
}> {
  if (!Array.isArray(entry.concerns)) return [];
  const out: Array<{ severity: Severity; description: string; pattern?: string }> = [];

  for (const concern of entry.concerns as SemanticDebtConcernLike[]) {
    if (!concern || concern.included !== true || !isSeverity(concern.severity)) continue;
    const description = typeof concern.description === "string" ? concern.description.trim() : "";
    if (description.length === 0) continue;
    out.push({
      severity: concern.severity,
      description,
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
