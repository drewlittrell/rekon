import type { ArtifactRef } from "@rekon/kernel-artifacts";
import type { Assessment, AssessmentImpact } from "@rekon/kernel-assessments";
import type { DependencyAuditReport, DependencyAuditSeverity, DependencyAuditVulnerability } from "@rekon/kernel-repo-model";
import type { ArtifactReader } from "@rekon/sdk";

export const DEPENDENCY_VULNERABILITY_RULE_ID = "security.dependencyVulnerability";

export async function evaluateDependencyAuditReports(
  artifacts: ArtifactReader,
  evidenceRef: ArtifactRef,
): Promise<{ assessments: Assessment[]; inputRefs: ArtifactRef[] }> {
  const refs = await artifacts.list("DependencyAuditReport");
  const current: Array<{ ref: ArtifactRef; report: DependencyAuditReport }> = [];
  for (const ref of refs) {
    const report = await artifacts.read(ref) as DependencyAuditReport;
    if (report.header.inputRefs.some((input) => input.type === evidenceRef.type && input.id === evidenceRef.id)) {
      current.push({ ref, report });
    }
  }

  const grouped = new Map<string, Array<{ ref: ArtifactRef; report: DependencyAuditReport; vulnerability: DependencyAuditVulnerability }>>();
  for (const entry of current) {
    for (const vulnerability of entry.report.vulnerabilities) {
      const key = `${vulnerability.packageName}:${vulnerability.affectedRange}:${vulnerability.advisories.map((advisory) => advisory.id).sort().join("+")}`;
      const group = grouped.get(key) ?? [];
      group.push({ ...entry, vulnerability });
      grouped.set(key, group);
    }
  }

  const assessments = [...grouped.entries()].map(([rootKey, entries]) => {
    const ordered = entries.slice().sort((left, right) => severityRank(right.vulnerability.severity) - severityRank(left.vulnerability.severity));
    const primary = ordered[0]!;
    const paths = unique(ordered.flatMap((entry) => entry.vulnerability.paths.map((path) => path.nodePath ?? path.dependencyPath.join(" > "))));
    const versions = unique(ordered.flatMap((entry) => entry.vulnerability.paths.map((path) => path.installedVersion).filter((value): value is string => Boolean(value))));
    const advisories = unique(ordered.flatMap((entry) => entry.vulnerability.advisories.map((advisory) => advisory.id)));
    const production = ordered.some((entry) => entry.vulnerability.paths.some((path) => path.scope === "production"));
    const complete = ordered.every((entry) => entry.report.status.complete);
    const refs = uniqueRefs(ordered.map((entry) => entry.ref));

    return {
      id: `dependency-risk-${primary.vulnerability.id.replace(/^dependency-vulnerability-/u, "")}`,
      kind: "risk" as const,
      type: "dependency_vulnerability",
      impact: impactForSeverity(primary.vulnerability.severity),
      title: `Dependency advisory affects ${primary.vulnerability.packageName}`,
      description: `${primary.vulnerability.packageName} ${primary.vulnerability.affectedRange} is covered by ${advisories.length} normalized advisory record(s).`,
      subjects: [primary.vulnerability.packageName, ...paths],
      ruleId: DEPENDENCY_VULNERABILITY_RULE_ID,
      suggestedAction: "Confirm the installed dependency path, review advisory applicability, and update, override, or explicitly disposition the dependency.",
      evidence: refs,
      rootCauseKey: `${DEPENDENCY_VULNERABILITY_RULE_ID}:${rootKey}`,
      confidence: {
        score: complete ? 0.85 : 0.65,
        basis: "deterministic" as const,
        verification: complete ? "corroborated" as const : "unverified" as const,
        rationale: complete
          ? "npm audit evidence was normalized with installed lockfile paths. Advisory output alone does not prove exploitability."
          : "The audit report was partial; installed version or dependency scope evidence is incomplete.",
      },
      applicableLaw: {
        id: `dependency-advisory:${advisories.join("+") || "unidentified"}`,
        description: "Repository package-manager vulnerability advisory evidence.",
      },
      supportingSignals: ordered.map((entry) => ({
        producer: "npm-audit",
        signalType: "dependency_vulnerability",
        evidence: [entry.ref],
        details: {
          packageName: entry.vulnerability.packageName,
          affectedRange: entry.vulnerability.affectedRange,
          installedVersions: unique(entry.vulnerability.paths.map((path) => path.installedVersion).filter((value): value is string => Boolean(value))),
          dependencyPaths: entry.vulnerability.paths.map((path) => path.dependencyPath),
        },
      })),
      details: {
        packageName: primary.vulnerability.packageName,
        affectedRange: primary.vulnerability.affectedRange,
        installedVersions: versions,
        dependencyPaths: ordered.flatMap((entry) => entry.vulnerability.paths.map((path) => path.dependencyPath)),
        production,
        complete,
        advisories,
        fixAvailable: ordered.some((entry) => entry.vulnerability.fixAvailable),
        reproducible: false,
      },
    } satisfies Assessment;
  }).sort((left, right) => left.id.localeCompare(right.id));

  return { assessments, inputRefs: uniqueRefs(current.map((entry) => entry.ref)) };
}

function impactForSeverity(severity: DependencyAuditSeverity): AssessmentImpact {
  return severity === "unknown" ? "low" : severity;
}

function severityRank(severity: DependencyAuditSeverity): number {
  return { unknown: 0, low: 1, medium: 2, high: 3, critical: 4 }[severity];
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function uniqueRefs(refs: ArtifactRef[]): ArtifactRef[] {
  return [...new Map(refs.map((ref) => [`${ref.type}:${ref.id}`, ref])).values()]
    .sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`));
}
