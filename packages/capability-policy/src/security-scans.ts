import type { ArtifactRef } from "@rekon/kernel-artifacts";
import type { Assessment, AssessmentImpact } from "@rekon/kernel-assessments";
import type { SecurityScanReport, SecurityScanResult, SecurityScanSeverity } from "@rekon/kernel-repo-model";
import type { ArtifactReader } from "@rekon/sdk";

export const SECURITY_SCANNER_RESULT_RULE_ID = "security.scannerResult";

export async function evaluateSecurityScanReports(
  artifacts: ArtifactReader,
  evidenceRef: ArtifactRef,
): Promise<{ assessments: Assessment[]; inputRefs: ArtifactRef[] }> {
  const refs = await artifacts.list("SecurityScanReport");
  const current: Array<{ ref: ArtifactRef; report: SecurityScanReport }> = [];
  for (const ref of refs) {
    const report = await artifacts.read(ref) as SecurityScanReport;
    if (!citesRef(report.header?.inputRefs, evidenceRef)) continue;
    current.push({ ref, report });
  }

  const groups = new Map<string, Array<{ ref: ArtifactRef; result: SecurityScanResult; tool: string }>>();
  for (const entry of current) {
    for (const run of entry.report.runs) {
      for (const result of run.results) {
        if (!result.securityRelevant) continue;
        const group = groups.get(result.id) ?? [];
        group.push({ ref: entry.ref, result, tool: run.tool.name });
        groups.set(result.id, group);
      }
    }
  }

  const assessments = [...groups.entries()].map(([resultId, group]) => {
    const ordered = [...group].sort((left, right) => {
      const severity = severityRank(right.result.severity) - severityRank(left.result.severity);
      return severity !== 0 ? severity : left.ref.id.localeCompare(right.ref.id);
    });
    const primary = ordered[0]!;
    const evidence = uniqueRefs(ordered.map((entry) => entry.ref));
    const locations = unique(ordered.flatMap((entry) => entry.result.locations.map((location) => location.path)));
    const tools = unique(ordered.map((entry) => entry.tool));
    const rules = unique(ordered.map((entry) => entry.result.ruleId));
    const tags = unique(ordered.flatMap((entry) => entry.result.tags));
    const highestSeverity = primary.result.severity;

    return {
      id: `security-risk-${resultId.replace(/^security-scan-result-/u, "")}`,
      kind: "risk" as const,
      type: "security_scanner_result",
      impact: impactForSeverity(highestSeverity),
      title: `Security scanner reported ${primary.result.ruleId}`,
      description: primary.result.message,
      subjects: locations.length > 0 ? locations : unique(ordered.map((entry) => `${entry.tool}:${entry.result.ruleId}`)),
      ...(locations.length > 0 ? { files: locations } : {}),
      ruleId: SECURITY_SCANNER_RESULT_RULE_ID,
      suggestedAction: "Review the scanner evidence, confirm repository applicability, and remediate or explicitly disposition the result.",
      evidence,
      rootCauseKey: `${SECURITY_SCANNER_RESULT_RULE_ID}:${resultId}`,
      confidence: {
        score: Math.max(...ordered.map((entry) => precisionConfidence(entry.result.precision))),
        basis: "deterministic" as const,
        verification: "corroborated" as const,
        rationale: "A repository-native scanner produced a normalized security result. Scanner output alone does not prove exploitability or automatic finding promotion.",
      },
      applicableLaw: {
        id: `scanner:${primary.tool}:${primary.result.ruleId}`,
        description: primary.result.helpUri
          ? `Scanner rule documentation: ${primary.result.helpUri}`
          : `Rule declared by ${primary.tool}.`,
      },
      supportingSignals: ordered.map((entry) => ({
        producer: entry.tool,
        signalType: "security_scan_result",
        evidence: [entry.ref],
        details: {
          scannerRuleId: entry.result.ruleId,
          severity: entry.result.severity,
          precision: entry.result.precision,
          locations: entry.result.locations,
        },
      })),
      details: {
        scannerResultId: resultId,
        scannerRuleIds: rules,
        tools,
        scannerSeverity: highestSeverity,
        reportCount: evidence.length,
        tags,
        reproducible: false,
      },
    } satisfies Assessment;
  }).sort((left, right) => left.id.localeCompare(right.id));

  return { assessments, inputRefs: uniqueRefs(current.map((entry) => entry.ref)) };
}

function impactForSeverity(severity: SecurityScanSeverity): AssessmentImpact {
  return severity === "unknown" ? "low" : severity;
}

function precisionConfidence(precision: string | undefined): number {
  switch (precision?.toLowerCase()) {
    case "very-high":
    case "very_high":
    case "high": return 0.9;
    case "medium": return 0.8;
    case "low": return 0.65;
    default: return 0.75;
  }
}

function severityRank(severity: SecurityScanSeverity): number {
  return { unknown: 0, low: 1, medium: 2, high: 3, critical: 4 }[severity];
}

function citesRef(refs: ArtifactRef[] | undefined, target: ArtifactRef): boolean {
  return Array.isArray(refs) && refs.some((ref) => ref.type === target.type && ref.id === target.id);
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function uniqueRefs(refs: ArtifactRef[]): ArtifactRef[] {
  return [...new Map(refs.map((ref) => [`${ref.type}:${ref.id}`, ref])).values()]
    .sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`));
}
