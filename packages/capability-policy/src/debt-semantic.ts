import type { ArtifactRef } from "@rekon/kernel-artifacts";
import { type Assessment } from "@rekon/kernel-assessments";
import type { Finding, FindingSeverity } from "@rekon/kernel-findings";
import { digestJson } from "@rekon/kernel-artifacts";

import { isNonProductionPath } from "./grammar-divergence.js";

export const DEBT_SEMANTIC_RULE_ID = "debt.semantic";
const SEMANTIC_CLAIM_IDENTITY_VERSION = "semantic-claim-v2";
const SUPPORTED_SEMANTIC_DEBT_PROMPT_VERSIONS = new Set(["debt-judge-v3"]);
const SUPPORTED_SEMANTIC_DEBT_COERCION_VERSIONS = new Set(["debt-coercion-v3"]);

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
    coercionVersion?: unknown;
  };
  entries?: unknown;
};

type EvidenceFactLike = {
  kind: string;
  subject: string;
  value: Record<string, unknown>;
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
    if (concern.type === "lint") continue;
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
  if (!SUPPORTED_SEMANTIC_DEBT_PROMPT_VERSIONS.has(String(report.policy?.promptVersion ?? ""))) return [];
  if (!SUPPORTED_SEMANTIC_DEBT_COERCION_VERSIONS.has(String(report.policy?.coercionVersion ?? ""))) return [];

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
  if (!SUPPORTED_SEMANTIC_DEBT_PROMPT_VERSIONS.has(String(report.policy?.promptVersion ?? ""))) return [];
  if (!SUPPORTED_SEMANTIC_DEBT_COERCION_VERSIONS.has(String(report.policy?.coercionVersion ?? ""))) return [];

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
      const identityAnchor = concern.pattern
        ? { pattern: concern.pattern, line: concern.line }
        : concern.line
          ? { line: concern.line }
          : { description: concern.description };
      const fingerprint = digestJson({
        file,
        type: concern.type,
        ...identityAnchor,
      }).slice(0, 12);
      const rootCause = concern.pattern ?? (concern.line ? `line:${concern.line}` : fingerprint);
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
          identityVersion: SEMANTIC_CLAIM_IDENTITY_VERSION,
          concernType: concern.type,
          ...(concern.line ? { line: concern.line } : {}),
          ...(concern.pattern ? { pattern: concern.pattern } : {}),
        },
      });
    }
  }

  return claims.sort((left, right) => left.id.localeCompare(right.id));
}

/**
 * Attach deterministic support to model claims without promoting them. This is
 * a distinct corroboration stage: only exact, declared signal families match,
 * and finding promotion still requires law, reproducibility, or confirmation.
 */
export function corroborateSemanticDebtClaims(
  claims: readonly Assessment[],
  facts: readonly EvidenceFactLike[],
  evidenceRef: ArtifactRef,
): Assessment[] {
  return claims.map((claim) => {
    const file = claim.files?.[0];
    if (!file) return claim;
    const pattern = typeof claim.details?.pattern === "string" ? claim.details.pattern : undefined;
    const line = typeof claim.details?.line === "number" ? claim.details.line : undefined;
    const matched = facts.filter((fact) => semanticCorroborationMatch({ fact, file, pattern, type: claim.type, line }));
    if (matched.length === 0) return claim;
    const signalTypes = [...new Set(matched.map((fact) => deterministicSignalType(fact)))].sort();
    return {
      ...claim,
      evidence: [...claim.evidence, evidenceRef],
      confidence: {
        score: Math.max(claim.confidence.score, 0.8),
        basis: "mixed",
        verification: "corroborated",
        rationale: "Semantic judgment is supported by a matching deterministic source signal; promotion requirements remain unchanged.",
      },
      supportingSignals: [
        ...(claim.supportingSignals ?? []),
        {
          producer: "@rekon/capability-js-ts",
          signalType: signalTypes.join(","),
          evidence: [evidenceRef],
          details: { file, signals: signalTypes },
        },
      ],
      details: {
        ...(claim.details ?? {}),
        corroboration: { stage: "deterministic-source", signals: signalTypes },
      },
    };
  });
}

function semanticCorroborationMatch(input: {
  fact: EvidenceFactLike;
  file: string;
  pattern?: string;
  type: string;
  line?: number;
}): boolean {
  const factFile = typeof input.fact.value.path === "string" ? input.fact.value.path : input.fact.subject;
  if (factFile !== input.file) return false;
  const factLine = typeof input.fact.value.line === "number" ? input.fact.value.line : undefined;
  if (input.line !== undefined && factLine !== undefined && input.line !== factLine) return false;
  const signal = typeof input.fact.value.signal === "string" ? input.fact.value.signal : "";
  const marker = typeof input.fact.value.marker === "string" ? input.fact.value.marker : "";
  if (input.pattern === "type_assertion") {
    return signal === "as_any_assertion"
      || signal === "explicit_any_annotation"
      || signal === "non_null_assertion";
  }
  if (input.pattern === "error_handling") return signal === "empty_catch" || signal === "catch_only_logs";
  if (input.pattern === "todo_comments") return input.fact.kind === "debt_marker" && ["todo", "fixme", "hack"].includes(marker);
  if (input.pattern === "deprecated") return input.fact.kind === "debt_marker" && marker === "deprecated";
  if (input.type === "stub") return signal === "placeholder_throw" || signal === "explicit_noop_contract";
  return false;
}

function deterministicSignalType(fact: EvidenceFactLike): string {
  if (typeof fact.value.signal === "string") return fact.value.signal;
  if (typeof fact.value.marker === "string") return `debt_marker:${fact.value.marker}`;
  return fact.kind;
}

function semanticConcernLabel(type: string): string {
  return type.replaceAll("_", " ");
}
