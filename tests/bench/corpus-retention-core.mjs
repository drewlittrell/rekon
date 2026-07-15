import { isAbsolute, relative, resolve } from "node:path";

export function selectCatalogEntries(entries, selectors, label) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`${label}: catalog must contain entries.`);
  }
  if (!Array.isArray(selectors) || selectors.length === 0) return entries;

  const selected = entries.filter((entry) => selectors.includes(entry.id));
  const known = new Set(entries.map((entry) => entry.id));
  const missing = selectors.filter((selector) => !known.has(selector));
  if (missing.length > 0) {
    throw new Error(`${label}: unknown selector(s): ${missing.join(", ")}.`);
  }
  return selected;
}

export function assertPublicCalibrationRecords(records, publicRepoIds, label) {
  for (const record of records) {
    if (!publicRepoIds.has(record.repoId)) {
      throw new Error(`${label}: record references non-public repository "${record.repoId}".`);
    }
    const serialized = JSON.stringify(record);
    if (serialized.includes("/Users/") || serialized.includes("file://")) {
      throw new Error(`${label}: record contains a local absolute path.`);
    }
  }
  return records;
}

export function assertOutputOutsideTemporaryRoot(output, temporaryRoot, label) {
  const resolvedOutput = resolve(output);
  const resolvedRoot = resolve(temporaryRoot);
  const relativeOutput = relative(resolvedRoot, resolvedOutput);
  if (relativeOutput === "" || (!relativeOutput.startsWith("..") && !isAbsolute(relativeOutput))) {
    throw new Error(`${label}: output must be outside the temporary corpus root.`);
  }
  return resolvedOutput;
}

export function aggregateCalibrationHistory(records) {
  const rules = new Map();
  for (const record of records) {
    const current = rules.get(record.ruleId) ?? {
      records: 0,
      byRecordType: {},
      byJudgment: {},
      bySeverity: {},
      identityStable: { true: 0, false: 0, unspecified: 0 },
    };
    current.records += 1;
    increment(current.byRecordType, record.recordType);
    increment(current.byJudgment, record.judgment);
    increment(current.bySeverity, record.severity ?? "unspecified");
    increment(current.identityStable, record.identityStable === undefined ? "unspecified" : String(record.identityStable));
    rules.set(record.ruleId, current);
  }

  return {
    schemaVersion: "1.0.0",
    sourceRecords: records.length,
    rules: Object.fromEntries([...rules.entries()].sort(([left], [right]) => left.localeCompare(right))),
  };
}

export function scopeQualityAdjudicationsToPinnedSources(records, manifestRepos, catalogRepos) {
  const catalogById = new Map(catalogRepos.map((entry) => [entry.id, entry]));
  const eligibleRepoIds = new Set(manifestRepos.flatMap((entry) => {
    const catalogEntry = catalogById.get(entry.id);
    return catalogEntry
      && normalizeGitUrl(entry.source?.url) === normalizeGitUrl(catalogEntry.url)
      && entry.source?.commit === catalogEntry.commit
      ? [entry.id]
      : [];
  }));
  return records.filter((record) => eligibleRepoIds.has(record.repoId));
}

export function scopeDefectAdjudicationsToPinnedPairs(records, manifestPairs, catalogPairs) {
  const catalogById = new Map(catalogPairs.map((entry) => [entry.id, entry]));
  const eligiblePairIds = new Set(manifestPairs.flatMap((entry) => {
    const catalogEntry = catalogById.get(entry.id);
    return catalogEntry
      && entry.repository === catalogEntry.repository
      && entry.buggyCommit === catalogEntry.buggyCommit
      && entry.fixedCommit === catalogEntry.fixedCommit
      ? [entry.id]
      : [];
  }));
  return records.filter((record) => eligiblePairIds.has(record.pairId));
}

function increment(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

function normalizeGitUrl(value) {
  return typeof value === "string" ? value.replace(/\.git$/u, "") : value;
}
