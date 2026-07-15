import { posix } from "node:path";

export const DEFECT_PAIR_STATUSES = [
  "finding-captured",
  "assessment-captured",
  "signal-persistent",
  "introduced-after",
  "uncaptured",
];

const PROOF_KINDS = [
  "upstream-regression-test",
  "upstream-reproduction",
  "upstream-issue",
];

const CLAIM_VERDICTS = ["valid", "invalid", "insufficient-evidence"];
const COVERAGE_VERDICTS = ["captured", "unrelated-signal", "not-captured", "insufficient-evidence"];
const RECOMMENDED_ACTIONS = [
  "emitter-candidate",
  "calibrate-emitter",
  "evidence-source",
  "semantic-analysis",
  "no-general-detector",
];

export function validateDefectPairCatalog(catalog) {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    throw new Error("defect-pair catalog: expected an object.");
  }
  if (catalog.version !== "1.0.0") {
    throw new Error('defect-pair catalog: version must be "1.0.0".');
  }
  if (!Array.isArray(catalog.repositories) || catalog.repositories.length === 0) {
    throw new Error("defect-pair catalog: repositories must be a non-empty array.");
  }
  if (!Array.isArray(catalog.pairs) || catalog.pairs.length === 0) {
    throw new Error("defect-pair catalog: pairs must be a non-empty array.");
  }

  const repositoryIds = new Set();
  for (const repository of catalog.repositories) {
    requireIdentifier(repository.id, "repository id");
    if (repositoryIds.has(repository.id)) {
      throw new Error(`defect-pair catalog: duplicate repository id "${repository.id}".`);
    }
    repositoryIds.add(repository.id);
    requireRelativePath(repository.directory, `repository ${repository.id} directory`);
    requireGithubUrl(repository.url, `repository ${repository.id} url`);
    requireText(repository.license, `repository ${repository.id} license`);
  }

  const pairIds = new Set();
  for (const pair of catalog.pairs) {
    requireIdentifier(pair.id, "pair id");
    if (pairIds.has(pair.id)) {
      throw new Error(`defect-pair catalog: duplicate pair id "${pair.id}".`);
    }
    pairIds.add(pair.id);
    if (!repositoryIds.has(pair.repository)) {
      throw new Error(`defect-pair catalog: pair "${pair.id}" references unknown repository "${pair.repository}".`);
    }
    requireCommit(pair.buggyCommit, `pair ${pair.id} buggyCommit`);
    requireCommit(pair.fixedCommit, `pair ${pair.id} fixedCommit`);
    if (pair.buggyCommit === pair.fixedCommit) {
      throw new Error(`defect-pair catalog: pair "${pair.id}" must use different revisions.`);
    }
    requireGithubUrl(pair.upstream?.fixUrl, `pair ${pair.id} upstream.fixUrl`);
    requireText(pair.upstream?.summary, `pair ${pair.id} upstream.summary`);
    if (
      pair.upstream.proofUrls !== undefined
      && (!Array.isArray(pair.upstream.proofUrls)
        || pair.upstream.proofUrls.some((url) => !isHttpsUrl(url)))
    ) {
      throw new Error(`defect-pair catalog: pair "${pair.id}" upstream.proofUrls must contain HTTPS URLs.`);
    }
    requireText(pair.claim?.category, `pair ${pair.id} claim.category`);
    requireText(pair.claim?.summary, `pair ${pair.id} claim.summary`);
    if (!PROOF_KINDS.includes(pair.claim?.proof)) {
      throw new Error(
        `defect-pair catalog: pair "${pair.id}" claim.proof must be one of ${PROOF_KINDS.join(", ")}.`,
      );
    }
    requirePathList(pair.affectedPaths, `pair ${pair.id} affectedPaths`, { allowEmpty: false });
    requirePathList(pair.evidencePaths ?? [], `pair ${pair.id} evidencePaths`, { allowEmpty: true });
    requirePathList(pair.testPaths ?? [], `pair ${pair.id} testPaths`, { allowEmpty: true });
  }

  return catalog;
}

export function compareDefectPairEmissions({
  pair,
  beforeFindings = [],
  beforeAssessments = [],
  afterFindings = [],
  afterAssessments = [],
}) {
  const before = scopedRecords(pair, beforeFindings, beforeAssessments);
  const after = scopedRecords(pair, afterFindings, afterAssessments);
  const afterByKey = indexRecords(after);
  const beforeByKey = indexRecords(before);

  const resolved = before.filter((record) => !afterByKey.has(record.comparisonKey));
  const persistent = before.filter((record) => afterByKey.has(record.comparisonKey));
  const introduced = after.filter((record) => !beforeByKey.has(record.comparisonKey));

  let status = "uncaptured";
  if (resolved.some((record) => record.recordType === "finding")) {
    status = "finding-captured";
  } else if (resolved.some((record) => record.recordType === "assessment")) {
    status = "assessment-captured";
  } else if (persistent.length > 0) {
    status = "signal-persistent";
  } else if (introduced.length > 0) {
    status = "introduced-after";
  }

  return {
    pairId: pair.id,
    repository: pair.repository,
    status,
    claim: pair.claim,
    affectedPaths: pair.affectedPaths,
    before: summarizeRecords(before),
    after: summarizeRecords(after),
    resolved: resolved.map(publicRecord),
    persistent: persistent.map(publicRecord),
    introduced: introduced.map(publicRecord),
    requiresAdjudication: true,
  };
}

export function buildDefectPairSummary(rows) {
  const byStatus = Object.fromEntries(DEFECT_PAIR_STATUSES.map((status) => [status, 0]));
  for (const row of rows) {
    if (!(row.status in byStatus)) {
      throw new Error(`defect-pair report: unknown status "${row.status}".`);
    }
    byStatus[row.status] += 1;
  }
  const adjudicated = rows.filter((row) => row.adjudication).length;
  const byCoverage = Object.fromEntries(COVERAGE_VERDICTS.map((status) => [status, 0]));
  const byRecommendedAction = Object.fromEntries(RECOMMENDED_ACTIONS.map((action) => [action, 0]));
  for (const row of rows) {
    if (!row.adjudication) continue;
    byCoverage[row.adjudication.coverage] += 1;
    byRecommendedAction[row.adjudication.recommendedAction] += 1;
  }
  return {
    total: rows.length,
    byStatus,
    captured: byStatus["finding-captured"] + byStatus["assessment-captured"],
    adjudicated,
    adjudicationRequired: rows.length - adjudicated,
    byCoverage,
    byRecommendedAction,
  };
}

export function validateDefectPairAdjudications(input, catalog) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("defect-pair adjudications: expected an object.");
  }
  if (input.schemaVersion !== "1.0.0" || !Array.isArray(input.records)) {
    throw new Error('defect-pair adjudications: schemaVersion must be "1.0.0" and records must be an array.');
  }
  const knownPairs = new Set(catalog.pairs.map((pair) => pair.id));
  const seen = new Set();
  for (const record of input.records) {
    if (!knownPairs.has(record.pairId)) {
      throw new Error(`defect-pair adjudications: unknown pair "${record.pairId}".`);
    }
    if (seen.has(record.pairId)) {
      throw new Error(`defect-pair adjudications: duplicate pair "${record.pairId}".`);
    }
    seen.add(record.pairId);
    if (!CLAIM_VERDICTS.includes(record.claimVerdict)) {
      throw new Error(`defect-pair adjudications: invalid claimVerdict for "${record.pairId}".`);
    }
    if (!COVERAGE_VERDICTS.includes(record.coverage)) {
      throw new Error(`defect-pair adjudications: invalid coverage for "${record.pairId}".`);
    }
    if (!RECOMMENDED_ACTIONS.includes(record.recommendedAction)) {
      throw new Error(`defect-pair adjudications: invalid recommendedAction for "${record.pairId}".`);
    }
    requireText(record.rationale, `adjudication ${record.pairId} rationale`);
  }
  return input;
}

export function applyDefectPairAdjudications(rows, adjudications) {
  const byPair = new Map(adjudications.records.map((record) => [record.pairId, record]));
  return rows.map((row) => {
    const adjudication = byPair.get(row.pairId);
    return adjudication
      ? { ...row, adjudication, requiresAdjudication: false }
      : row;
  });
}

function scopedRecords(pair, findings, assessments) {
  return [
    ...findings.map((record) => normalizeRecord(record, "finding", pair.affectedPaths)),
    ...assessments.map((record) => normalizeRecord(record, "assessment", pair.affectedPaths)),
  ].filter(Boolean);
}

function normalizeRecord(record, recordType, affectedPaths) {
  const paths = recordPaths(record);
  const matchedPaths = affectedPaths.filter((affected) => paths.some((path) => pathsOverlap(path, affected)));
  if (matchedPaths.length === 0) return undefined;

  const ruleId = textOr(record.ruleId, record.type, "unknown");
  const rootCauseKey = textOr(record.rootCauseKey, record.payload?.rootCauseKey);
  const comparisonKey = rootCauseKey
    ? `${recordType}:root:${rootCauseKey}`
    : `${recordType}:rule:${ruleId}:paths:${matchedPaths.sort().join(",")}`;

  return {
    recordType,
    id: textOr(record.id, "unknown"),
    ruleId,
    kind: textOr(record.kind, record.type, "unknown"),
    severity: textOr(record.severity),
    matchedPaths: [...new Set(matchedPaths)].sort(),
    comparisonKey,
  };
}

function recordPaths(record) {
  const values = [
    ...(Array.isArray(record.files) ? record.files : []),
    ...(Array.isArray(record.subjects) ? record.subjects : []),
    record.file,
    record.path,
    record.payload?.file,
    record.payload?.path,
  ];
  return [...new Set(values.filter((value) => typeof value === "string").map(normalizePath).filter(Boolean))];
}

function pathsOverlap(left, right) {
  const a = normalizePath(left);
  const b = normalizePath(right);
  return a === b || a.endsWith(`/${b}`) || b.endsWith(`/${a}`);
}

function normalizePath(value) {
  return posix.normalize(String(value).replaceAll("\\", "/").replace(/^\.\//, ""));
}

function indexRecords(records) {
  const index = new Map();
  for (const record of records) {
    const list = index.get(record.comparisonKey) ?? [];
    list.push(record);
    index.set(record.comparisonKey, list);
  }
  return index;
}

function summarizeRecords(records) {
  return {
    total: records.length,
    findings: records.filter((record) => record.recordType === "finding").length,
    assessments: records.filter((record) => record.recordType === "assessment").length,
    records: records.map(publicRecord),
  };
}

function publicRecord(record) {
  const { comparisonKey: _comparisonKey, ...output } = record;
  return output;
}

function requireIdentifier(value, label) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(value)) {
    throw new Error(`defect-pair catalog: ${label} must be a lowercase kebab-case identifier.`);
  }
}

function requireCommit(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value)) {
    throw new Error(`defect-pair catalog: ${label} must be a full lowercase Git SHA.`);
  }
}

function requireGithubUrl(value, label) {
  if (typeof value !== "string" || !/^https:\/\/github\.com\//.test(value)) {
    throw new Error(`defect-pair catalog: ${label} must be an HTTPS GitHub URL.`);
  }
}

function requireText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`defect-pair catalog: ${label} must be non-empty text.`);
  }
}

function requirePathList(value, label, { allowEmpty }) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new Error(`defect-pair catalog: ${label} must be ${allowEmpty ? "an" : "a non-empty"} array.`);
  }
  for (const path of value) requireRelativePath(path, label);
}

function requireRelativePath(value, label) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.startsWith("/")
    || value.includes("\\")
    || normalizePath(value).startsWith("../")
    || normalizePath(value) === ".."
  ) {
    throw new Error(`defect-pair catalog: ${label} must contain repository-relative POSIX paths.`);
  }
}

function isHttpsUrl(value) {
  return typeof value === "string" && value.startsWith("https://");
}

function textOr(...values) {
  return values.find((value) => typeof value === "string" && value.length > 0);
}
