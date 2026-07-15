const IMPACT_ORDER = new Map([
  ["critical", 0],
  ["high", 1],
  ["medium", 2],
  ["low", 3],
]);

function rank(record) {
  return IMPACT_ORDER.get(record.severity ?? record.impact) ?? 4;
}

function compareRecords(left, right) {
  return rank(left.record) - rank(right.record)
    || left.repoId.localeCompare(right.repoId)
    || left.record.id.localeCompare(right.record.id);
}

function roundRobinByRepository(records, limit) {
  const byRepo = new Map();
  for (const record of records.sort(compareRecords)) {
    const values = byRepo.get(record.repoId) ?? [];
    values.push(record);
    byRepo.set(record.repoId, values);
  }

  const repoIds = [...byRepo.keys()].sort();
  const selected = [];
  while (selected.length < limit) {
    let added = false;
    for (const repoId of repoIds) {
      const next = byRepo.get(repoId)?.shift();
      if (!next) continue;
      selected.push(next);
      added = true;
      if (selected.length === limit) break;
    }
    if (!added) break;
  }
  return selected;
}

export function identityHistoryKey(record) {
  const rootCauseKey = typeof record?.rootCauseKey === "string" ? record.rootCauseKey : "";
  const identityVersion = typeof record?.details?.identityVersion === "string"
    ? record.details.identityVersion
    : "legacy";
  return `${rootCauseKey}\0${identityVersion}`;
}

export function selectManifestRepositoriesForReport(manifestRepos, reportRepos) {
  const selectedIds = new Set((reportRepos ?? []).map((repo) => repo.id));
  const selected = (manifestRepos ?? []).filter((entry) => selectedIds.has(entry.id));
  const foundIds = new Set(selected.map((entry) => entry.id));
  const missing = [...selectedIds].filter((id) => !foundIds.has(id)).sort();
  if (missing.length > 0) {
    throw new Error(`quality review report references repositories missing from the corpus manifest: ${missing.join(", ")}.`);
  }
  return selected;
}

export function selectQualityReviewCandidates({ repos, perRule = 5 }) {
  if (!Number.isInteger(perRule) || perRule < 1) {
    throw new Error("quality review perRule must be a positive integer.");
  }

  const groups = new Map();
  for (const repo of repos) {
    for (const [recordType, records] of [
      ["finding", repo.findings ?? []],
      ["assessment", repo.assessments ?? []],
    ]) {
      for (const record of records) {
        const ruleId = record.ruleId ?? record.type;
        if (typeof record.id !== "string" || typeof ruleId !== "string") continue;
        const key = `${ruleId}\0${recordType}`;
        const values = groups.get(key) ?? [];
        values.push({ repoId: repo.id, recordType, ruleId, record });
        groups.set(key, values);
      }
    }
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([, records]) => roundRobinByRepository(records, perRule));
}
