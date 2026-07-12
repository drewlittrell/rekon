const FINDING_JUDGMENTS = new Set(["valid", "invalid"]);
const ASSESSMENT_JUDGMENTS = new Set(["useful", "not_useful"]);
const SEVERITY_JUDGMENTS = new Set(["accurate", "overstated", "understated"]);

function countBy(values, keyOf) {
  const counts = {};
  for (const value of values) {
    const key = keyOf(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function ratio(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

export function validateQualityAdjudications(value) {
  if (!value || value.schemaVersion !== "1.0.0" || !Array.isArray(value.records)) {
    throw new Error("quality adjudications must use schemaVersion 1.0.0 and contain a records array.");
  }

  const keys = new Set();
  for (const [index, record] of value.records.entries()) {
    const label = `quality adjudication ${index}`;
    for (const field of ["repoId", "recordType", "recordId", "ruleId", "judgment"]) {
      if (typeof record?.[field] !== "string" || record[field].length === 0) {
        throw new Error(`${label} is missing ${field}.`);
      }
    }
    if (record.recordType !== "finding" && record.recordType !== "assessment") {
      throw new Error(`${label} has unsupported recordType ${record.recordType}.`);
    }
    const allowed = record.recordType === "finding" ? FINDING_JUDGMENTS : ASSESSMENT_JUDGMENTS;
    if (!allowed.has(record.judgment)) {
      throw new Error(`${label} has judgment ${record.judgment}, which is invalid for ${record.recordType}.`);
    }
    if (record.severity !== undefined && !SEVERITY_JUDGMENTS.has(record.severity)) {
      throw new Error(`${label} has unsupported severity judgment ${record.severity}.`);
    }
    if (record.identityStable !== undefined && typeof record.identityStable !== "boolean") {
      throw new Error(`${label}.identityStable must be boolean when provided.`);
    }
    const key = `${record.repoId}:${record.recordType}:${record.recordId}`;
    if (keys.has(key)) throw new Error(`duplicate quality adjudication for ${key}.`);
    keys.add(key);
  }
  return value.records;
}

export function validateQualityThresholds(value, ruleIds = []) {
  if (!value || value.schemaVersion !== "1.0.0" || !value.rules || typeof value.rules !== "object") {
    throw new Error("quality thresholds must use schemaVersion 1.0.0 and contain a rules object.");
  }
  for (const ruleId of ruleIds) {
    if (!value.rules[ruleId]) throw new Error(`quality thresholds missing rule ${ruleId}.`);
  }
  for (const [ruleId, override] of Object.entries(value.rules)) {
    const threshold = { ...(value.defaults ?? {}), ...override };
    if (!threshold || !Number.isInteger(threshold.minimumAdjudications) || threshold.minimumAdjudications < 1) {
      throw new Error(`${ruleId}.minimumAdjudications must be a positive integer.`);
    }
    for (const field of ["minimumPrecision", "minimumUsefulness", "minimumEvidenceCompleteness", "minimumIdentityStability"]) {
      if (threshold[field] !== undefined && (!Number.isFinite(threshold[field]) || threshold[field] < 0 || threshold[field] > 1)) {
        throw new Error(`${ruleId}.${field} must be between 0 and 1.`);
      }
    }
    if (threshold.maximumDuplicateRemediationRate !== undefined
      && (!Number.isFinite(threshold.maximumDuplicateRemediationRate)
        || threshold.maximumDuplicateRemediationRate < 0
        || threshold.maximumDuplicateRemediationRate > 1)) {
      throw new Error(`${ruleId}.maximumDuplicateRemediationRate must be between 0 and 1.`);
    }
  }
  return value;
}

export function buildQualitySummary({ repos, adjudications = [], thresholds }) {
  const adjudicationByRecord = new Map(adjudications.map((record) => [
    `${record.repoId}:${record.recordType}:${record.recordId}`,
    record,
  ]));
  const records = [];

  for (const repo of repos) {
    for (const finding of repo.rekonFindings ?? []) {
      records.push({
        repoId: repo.id,
        recordType: "finding",
        recordId: finding.id,
        ruleId: finding.ruleId ?? finding.type,
        hasEvidence: Array.isArray(finding.evidence) && finding.evidence.length > 0,
        hasLaw: typeof finding.ruleId === "string" && finding.ruleId.length > 0,
        rootCauseKey: finding.rootCauseKey,
      });
    }
    for (const assessment of repo.assessments ?? []) {
      records.push({
        repoId: repo.id,
        recordType: "assessment",
        recordId: assessment.id,
        ruleId: assessment.ruleId ?? assessment.type,
        kind: assessment.kind,
        hasEvidence: Array.isArray(assessment.evidence) && assessment.evidence.length > 0,
        hasLaw: Boolean(assessment.applicableLaw),
        rootCauseKey: assessment.rootCauseKey,
      });
    }
  }

  const recordKeys = new Set(records.map((record) => `${record.repoId}:${record.recordType}:${record.recordId}`));
  for (const record of adjudications) {
    const key = `${record.repoId}:${record.recordType}:${record.recordId}`;
    if (!recordKeys.has(key)) throw new Error(`quality adjudication references unknown record ${key}.`);
  }

  const rules = {};
  const allRuleIds = new Set([
    ...records.map((record) => record.ruleId),
    ...Object.keys(thresholds?.rules ?? {}),
  ]);

  for (const ruleId of [...allRuleIds].sort()) {
    const ruleRecords = records.filter((record) => record.ruleId === ruleId);
    const findingRecords = ruleRecords.filter((record) => record.recordType === "finding");
    const assessmentRecords = ruleRecords.filter((record) => record.recordType === "assessment");
    const labels = ruleRecords
      .map((record) => adjudicationByRecord.get(`${record.repoId}:${record.recordType}:${record.recordId}`))
      .filter(Boolean);
    const findingLabels = labels.filter((record) => record.recordType === "finding");
    const assessmentLabels = labels.filter((record) => record.recordType === "assessment");
    const severityLabels = labels.filter((record) => record.severity !== undefined);
    const identityLabels = labels.filter((record) => record.identityStable !== undefined);
    const roots = ruleRecords.map((record) => record.rootCauseKey).filter((key) => typeof key === "string" && key.length > 0);
    const duplicateCount = roots.length - new Set(roots).size;
    const precision = ratio(findingLabels.filter((record) => record.judgment === "valid").length, findingLabels.length);
    const usefulness = ratio(assessmentLabels.filter((record) => record.judgment === "useful").length, assessmentLabels.length);
    const evidenceCompleteness = ratio(ruleRecords.filter((record) => record.hasEvidence).length, ruleRecords.length) ?? 1;
    const identityStability = ratio(identityLabels.filter((record) => record.identityStable).length, identityLabels.length);
    const threshold = thresholds?.rules?.[ruleId]
      ? { ...(thresholds.defaults ?? {}), ...thresholds.rules[ruleId] }
      : undefined;
    const failures = [];
    const minimum = threshold?.minimumAdjudications ?? 1;

    if (threshold?.minimumPrecision !== undefined) {
      if (findingLabels.length < minimum) failures.push("finding-precision-insufficient-evidence");
      else if (precision < threshold.minimumPrecision) failures.push("finding-precision-below-threshold");
    }
    if (threshold?.minimumUsefulness !== undefined) {
      if (assessmentLabels.length < minimum) failures.push("assessment-usefulness-insufficient-evidence");
      else if (usefulness < threshold.minimumUsefulness) failures.push("assessment-usefulness-below-threshold");
    }
    if (threshold?.minimumEvidenceCompleteness !== undefined && evidenceCompleteness < threshold.minimumEvidenceCompleteness) {
      failures.push("evidence-completeness-below-threshold");
    }
    const duplicateRate = ratio(duplicateCount, ruleRecords.length) ?? 0;
    if (threshold?.maximumDuplicateRemediationRate !== undefined && duplicateRate > threshold.maximumDuplicateRemediationRate) {
      failures.push("duplicate-remediation-rate-above-threshold");
    }
    if (threshold?.minimumIdentityStability !== undefined) {
      if (identityLabels.length < minimum) failures.push("identity-stability-insufficient-evidence");
      else if (identityStability < threshold.minimumIdentityStability) failures.push("identity-stability-below-threshold");
    }

    rules[ruleId] = {
      thresholdConfigured: Boolean(threshold),
      records: ruleRecords.length,
      findings: findingRecords.length,
      assessments: assessmentRecords.length,
      findingAdjudications: findingLabels.length,
      findingPrecision: precision,
      assessmentAdjudications: assessmentLabels.length,
      assessmentUsefulness: usefulness,
      evidenceCompleteness,
      lawAttributionCompleteness: ratio(ruleRecords.filter((record) => record.hasLaw).length, ruleRecords.length) ?? 1,
      duplicateRemediationCount: duplicateCount,
      duplicateRemediationRate: duplicateRate,
      severityCalibration: {
        adjudicated: severityLabels.length,
        byJudgment: countBy(severityLabels, (record) => record.severity),
      },
      identityStability,
      thresholdStatus: failures.length === 0 ? "passed" : failures.every((failure) => failure.endsWith("insufficient-evidence")) ? "insufficient-evidence" : "failed",
      thresholdFailures: failures,
    };
  }

  const findings = records.filter((record) => record.recordType === "finding");
  const assessments = records.filter((record) => record.recordType === "assessment");
  const findingLabels = adjudications.filter((record) => record.recordType === "finding");
  const assessmentLabels = adjudications.filter((record) => record.recordType === "assessment");
  const roots = records.map((record) => record.rootCauseKey).filter((key) => typeof key === "string" && key.length > 0);

  return {
    records: records.length,
    findingQuality: {
      emitted: findings.length,
      adjudicated: findingLabels.length,
      precision: ratio(findingLabels.filter((record) => record.judgment === "valid").length, findingLabels.length),
    },
    assessmentUtility: {
      emitted: assessments.length,
      byKind: countBy(assessments, (record) => record.kind),
      adjudicated: assessmentLabels.length,
      usefulness: ratio(assessmentLabels.filter((record) => record.judgment === "useful").length, assessmentLabels.length),
    },
    evidenceCompleteness: ratio(records.filter((record) => record.hasEvidence).length, records.length) ?? 1,
    lawAttributionCompleteness: ratio(records.filter((record) => record.hasLaw).length, records.length) ?? 1,
    duplicateRemediationRate: ratio(roots.length - new Set(roots).size, records.length) ?? 0,
    rules,
  };
}

export function buildSanitizedBenchReport(report, quality) {
  const summarizeQueue = (entries) => ({
    rules: entries.length,
    fireCount: entries.reduce((sum, entry) => sum + entry.fireCount, 0),
  });
  const configuredRules = Object.fromEntries(
    Object.entries(quality.rules).filter(([, entry]) => entry.thresholdConfigured),
  );
  const sanitizedQuality = {
    ...quality,
    rules: configuredRules,
    unconfiguredRuleCount: Object.keys(quality.rules).length - Object.keys(configuredRules).length,
  };

  return {
    bench: report.bench,
    version: report.version,
    generatedAt: report.generatedAt,
    repositoryCount: report.repos.length,
    aggregate: report.aggregate,
    findingRecall: {
      weighted: report.aggregate.recall,
      creditedWeight: report.aggregate.creditedWeight,
      totalWeight: report.aggregate.totalWeight,
    },
    quality: sanitizedQuality,
    gapQueue: summarizeQueue(report.gapQueue),
    redesignQueue: summarizeQueue(report.redesignQueue),
    deferred: summarizeQueue(report.deferred),
    rejected: summarizeQueue(report.rejected),
    coverage: {
      rules: report.coverage.length,
      classicFiles: report.coverage.reduce((sum, entry) => sum + entry.classicFiles, 0),
      coveredFiles: report.coverage.reduce((sum, entry) => sum + entry.coveredFiles, 0),
    },
    precisionAgainstSuppressed: {
      rules: report.precision.length,
      suppressedTotal: report.precision.reduce((sum, entry) => sum + entry.suppressedTotal, 0),
      firedOnSuppressed: report.precision.reduce((sum, entry) => sum + entry.firedOnSuppressed, 0),
    },
  };
}
