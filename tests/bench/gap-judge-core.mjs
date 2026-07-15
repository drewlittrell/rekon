import { createHash } from "node:crypto";

export const GAP_JUDGMENT_VERDICTS = [
  "valid-missed-signal",
  "valid-different-class",
  "covered-different-identity",
  "classic-noise",
  "insufficient-evidence",
];

export const GAP_JUDGMENT_ACTIONS = [
  "emitter-gap",
  "evidence-gap",
  "matching-gap",
  "classification-gap",
  "no-change",
  "defer",
];

const VERDICT_ACTIONS = {
  "valid-missed-signal": new Set(["emitter-gap", "evidence-gap"]),
  "valid-different-class": new Set(["classification-gap", "no-change"]),
  "covered-different-identity": new Set(["matching-gap"]),
  "classic-noise": new Set(["no-change"]),
  "insufficient-evidence": new Set(["defer"]),
};

const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 };

function stableKey(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function gapReviewId(repoId, classicId) {
  return `gap-${stableKey(`${repoId}\u0000${classicId}`).slice(0, 16)}`;
}

function issueIndex(issues) {
  return new Map((issues ?? []).map((issue) => [issue.id, issue]));
}

function candidateOrder(left, right) {
  const severity = (SEVERITY_RANK[right.classic.severity] ?? 0) - (SEVERITY_RANK[left.classic.severity] ?? 0);
  if (severity !== 0) return severity;
  return stableKey(left.reviewId).localeCompare(stableKey(right.reviewId));
}

function sampleAcrossRepos(candidates, limit) {
  const byRepo = new Map();

  for (const candidate of candidates) {
    const records = byRepo.get(candidate.repoId) ?? [];
    records.push(candidate);
    byRepo.set(candidate.repoId, records);
  }

  for (const records of byRepo.values()) records.sort(candidateOrder);

  const repoIds = [...byRepo.keys()].sort();
  const selected = [];
  let position = 0;

  while (selected.length < limit) {
    let added = false;

    for (const repoId of repoIds) {
      const candidate = byRepo.get(repoId)?.[position];
      if (!candidate) continue;
      selected.push(candidate);
      added = true;
      if (selected.length === limit) break;
    }

    if (!added) break;
    position += 1;
  }

  return selected;
}

/** Select a deterministic, repository-stratified sample from parity misses. */
export function selectGapReviewCandidates({
  report,
  issuesByRepo,
  ruleMap,
  perRule = 3,
  classifications = ["missed-redesigned"],
}) {
  if (!Number.isInteger(perRule) || perRule < 1) {
    throw new Error("gap review perRule must be a positive integer.");
  }

  const allowedClassifications = new Set(classifications);
  const byRule = new Map();

  for (const repo of report?.repos ?? []) {
    const issues = issueIndex(issuesByRepo[repo.id]);

    for (const row of repo.rows ?? []) {
      if (!allowedClassifications.has(row.classification)) continue;

      const issue = issues.get(row.classicId);
      if (!issue) {
        throw new Error(`gap review could not find classic issue ${repo.id}:${row.classicId}.`);
      }

      const disposition = ruleMap[row.ruleId];
      if (!disposition) {
        throw new Error(`gap review has no rule-map row for ${row.ruleId}.`);
      }

      const candidate = {
        reviewId: gapReviewId(repo.id, row.classicId),
        repoId: repo.id,
        classification: row.classification,
        citation: row.citation,
        fireCount: Number.isFinite(row.fireCount) && row.fireCount > 0 ? row.fireCount : 1,
        disposition,
        classic: {
          id: issue.id,
          ruleId: issue.type,
          severity: typeof issue.severity === "string" ? issue.severity : "unknown",
          system: typeof issue.system === "string" ? issue.system : undefined,
          files: Array.isArray(issue.files) ? issue.files : [],
          description: typeof issue.description === "string" ? issue.description : "",
          details: issue.details && typeof issue.details === "object" ? issue.details : {},
          suggestedAction: typeof issue.suggestedAction === "string" ? issue.suggestedAction : undefined,
        },
      };

      const records = byRule.get(row.ruleId) ?? [];
      records.push(candidate);
      byRule.set(row.ruleId, records);
    }
  }

  return [...byRule.entries()]
    .sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0]))
    .flatMap(([, candidates]) => sampleAcrossRepos(candidates, Math.min(perRule, candidates.length)));
}

export function validateGapJudgments(value, packet) {
  if (!value || value.schemaVersion !== "1.0.0" || !Array.isArray(value.records)) {
    throw new Error("gap judgments must use schemaVersion 1.0.0 and contain a records array.");
  }

  const packetById = new Map((packet?.records ?? []).map((record) => [record.reviewId, record]));
  const seen = new Set();

  for (const [position, record] of value.records.entries()) {
    const label = `gap judgment records[${position}]`;

    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error(`${label} must be an object.`);
    }
    if (typeof record.reviewId !== "string" || !packetById.has(record.reviewId)) {
      throw new Error(`${label} references unknown reviewId ${record.reviewId}.`);
    }
    if (seen.has(record.reviewId)) throw new Error(`duplicate gap judgment for ${record.reviewId}.`);
    seen.add(record.reviewId);

    if (!GAP_JUDGMENT_VERDICTS.includes(record.verdict)) {
      throw new Error(`${label} has unsupported verdict ${record.verdict}.`);
    }
    if (!GAP_JUDGMENT_ACTIONS.includes(record.action)) {
      throw new Error(`${label} has unsupported action ${record.action}.`);
    }
    if (!VERDICT_ACTIONS[record.verdict].has(record.action)) {
      throw new Error(`${label} cannot pair verdict ${record.verdict} with action ${record.action}.`);
    }
    if (!Number.isFinite(record.confidence) || record.confidence < 0 || record.confidence > 1) {
      throw new Error(`${label}.confidence must be between 0 and 1.`);
    }
    if (typeof record.rationale !== "string" || record.rationale.trim().length < 12) {
      throw new Error(`${label}.rationale must contain a specific explanation.`);
    }
    if (!Array.isArray(record.sourceRefs) || record.sourceRefs.length === 0
      || record.sourceRefs.some((ref) => typeof ref !== "string" || ref.length === 0)) {
      throw new Error(`${label}.sourceRefs must contain at least one source or artifact reference.`);
    }
  }

  return value.records;
}

function countBy(records, keyOf) {
  return Object.fromEntries(
    [...records.reduce((counts, record) => {
      const key = keyOf(record);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts;
    }, new Map()).entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function buildGapJudgmentSummary(packet, judgments) {
  const records = validateGapJudgments(judgments, packet);
  const judgmentById = new Map(records.map((record) => [record.reviewId, record]));
  const joined = (packet.records ?? []).map((review) => ({ review, judgment: judgmentById.get(review.reviewId) }));
  const adjudicated = joined.filter((entry) => entry.judgment);
  const byRule = {};

  for (const { review, judgment } of adjudicated) {
    const rule = byRule[review.classic.ruleId] ?? { sampled: 0, fireCount: 0, verdicts: {}, actions: {} };
    rule.sampled += 1;
    rule.fireCount += review.fireCount ?? 1;
    rule.verdicts[judgment.verdict] = (rule.verdicts[judgment.verdict] ?? 0) + 1;
    rule.actions[judgment.action] = (rule.actions[judgment.action] ?? 0) + 1;
    byRule[review.classic.ruleId] = rule;
  }

  return {
    schemaVersion: "1.0.0",
    packetGeneratedAt: packet.generatedAt,
    sampled: packet.records?.length ?? 0,
    adjudicated: adjudicated.length,
    unresolved: joined.filter((entry) => !entry.judgment).map((entry) => entry.review.reviewId),
    verdicts: countBy(records, (record) => record.verdict),
    actions: countBy(records, (record) => record.action),
    byRule: Object.fromEntries(Object.entries(byRule).sort(([left], [right]) => left.localeCompare(right))),
  };
}

export function renderGapJudgmentSummary(summary) {
  const lines = [
    "# Redesign Gap Judgment Summary",
    "",
    `Sampled: ${summary.sampled} - Adjudicated: ${summary.adjudicated} - Unresolved: ${summary.unresolved.length}`,
    "",
    "## Recommended action",
    "",
  ];

  for (const [action, count] of Object.entries(summary.actions)) lines.push(`- ${action}: ${count}`);

  lines.push("", "## Verdict", "");
  for (const [verdict, count] of Object.entries(summary.verdicts)) lines.push(`- ${verdict}: ${count}`);

  lines.push("", "## By classic rule", "", "| Rule | Sampled | Actions |", "| --- | ---: | --- |");
  for (const [ruleId, entry] of Object.entries(summary.byRule)) {
    const actions = Object.entries(entry.actions).map(([action, count]) => `${action}=${count}`).join(", ");
    lines.push(`| ${ruleId} | ${entry.sampled} | ${actions} |`);
  }

  if (summary.unresolved.length > 0) {
    lines.push("", "## Unresolved", "", ...summary.unresolved.map((id) => `- ${id}`));
  }

  return `${lines.join("\n")}\n`;
}
