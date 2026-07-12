import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";

export type ComplexityCoverageFunction = {
  name?: string;
  startLine: number;
  endLine: number;
  executionCount: number;
};

export type ComplexityCoverageFile = {
  path: string;
  functions: ComplexityCoverageFunction[];
};

export type ComplexityCoverageRun = {
  reportRef: ArtifactRef;
  verificationRunRef: ArtifactRef;
  testPath: string;
  targetPaths?: string[];
  commandStatus: "passed" | "failed";
  generatedAt: string;
  files: ComplexityCoverageFile[];
};

type CoverageReportLike = {
  header?: {
    generatedAt?: string;
    subject?: { commit?: string };
  };
  source?: {
    coverageSources?: Array<{
      isolated?: boolean;
      testPath?: string;
      targetPaths?: string[];
      commandStatus?: "passed" | "failed";
      verificationRunRef?: ArtifactRef;
      fileCoverage?: Array<{
        path?: string;
        functionRanges?: ComplexityCoverageFunction[];
      }>;
    }>;
  };
};

export async function loadFreshComplexityCoverage(
  artifacts: {
    list(type?: string): Promise<ArtifactRef[]>;
    read(ref: ArtifactRef): Promise<unknown>;
  },
  evidenceHeader: ArtifactHeader,
): Promise<ComplexityCoverageRun[]> {
  const latestByTest = new Map<string, { timestamp: number; run: ComplexityCoverageRun }>();
  for (const reportRef of await artifacts.list("RuntimeGraphObservationReport")) {
    const report = await artifacts.read(reportRef) as CoverageReportLike;
    if (!coverageMatchesEvidence(report, evidenceHeader)) continue;
    const generatedAt = report.header?.generatedAt;
    const timestamp = Date.parse(generatedAt ?? "");
    if (!generatedAt || !Number.isFinite(timestamp)) continue;

    for (const source of report.source?.coverageSources ?? []) {
      if (source.isolated !== true
        || (source.commandStatus !== "passed" && source.commandStatus !== "failed")
        || typeof source.testPath !== "string"
        || source.testPath.length === 0
        || !isVerificationRunRef(source.verificationRunRef)) continue;
      const files = (source.fileCoverage ?? []).flatMap((file) => {
        if (typeof file.path !== "string" || file.path.length === 0 || !Array.isArray(file.functionRanges)) return [];
        const functions = file.functionRanges.filter(isCoverageFunction);
        return functions.length > 0 ? [{ path: file.path, functions }] : [];
      });
      const run: ComplexityCoverageRun = {
        reportRef,
        verificationRunRef: source.verificationRunRef,
        testPath: source.testPath,
        targetPaths: Array.isArray(source.targetPaths)
          ? [...new Set(source.targetPaths.filter((targetPath): targetPath is string =>
            typeof targetPath === "string" && targetPath.length > 0))].sort()
          : [],
        commandStatus: source.commandStatus,
        generatedAt,
        files,
      };
      const current = latestByTest.get(source.testPath);
      if (!current || timestamp > current.timestamp || (timestamp === current.timestamp && reportRef.id > current.run.reportRef.id)) {
        latestByTest.set(source.testPath, { timestamp, run });
      }
    }
  }
  return [...latestByTest.values()]
    .map((entry) => entry.run)
    .sort((left, right) => left.testPath.localeCompare(right.testPath));
}

function coverageMatchesEvidence(report: CoverageReportLike, evidenceHeader: ArtifactHeader): boolean {
  const reportCommit = report.header?.subject?.commit;
  const evidenceCommit = evidenceHeader.subject.commit;
  if (reportCommit && evidenceCommit && reportCommit !== evidenceCommit) return false;
  const reportTime = Date.parse(report.header?.generatedAt ?? "");
  const evidenceTime = Date.parse(evidenceHeader.generatedAt);
  return Number.isFinite(reportTime) && Number.isFinite(evidenceTime) && reportTime >= evidenceTime;
}

function isVerificationRunRef(value: unknown): value is ArtifactRef {
  return Boolean(value)
    && typeof value === "object"
    && (value as ArtifactRef).type === "VerificationRun"
    && typeof (value as ArtifactRef).id === "string"
    && (value as ArtifactRef).id.length > 0
    && typeof (value as ArtifactRef).schemaVersion === "string"
    && (value as ArtifactRef).schemaVersion.length > 0;
}

function isCoverageFunction(value: unknown): value is ComplexityCoverageFunction {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ComplexityCoverageFunction>;
  return typeof candidate.startLine === "number"
    && Number.isInteger(candidate.startLine)
    && candidate.startLine >= 1
    && typeof candidate.endLine === "number"
    && Number.isInteger(candidate.endLine)
    && candidate.endLine >= candidate.startLine
    && typeof candidate.executionCount === "number"
    && Number.isInteger(candidate.executionCount)
    && candidate.executionCount >= 0;
}
