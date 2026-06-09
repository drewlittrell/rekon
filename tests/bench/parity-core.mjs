// Pure classification core for the classic-parity-bench (Phase 0). No I/O.
//
// Classifies every normalized classic finding against Rekon's FindingReport /
// FindingFilterReport for the same repo:
//
//   matched              - a ported rule's Rekon finding matches on
//                          (rekonRuleId, normalized file), falling back to
//                          (rekonRuleId, subject) when classic carries no file.
//   missed-gap           - no match and no citable justification. This is the
//                          Phase 1 queue.
//   missed-intentional   - citable divergence ONLY: (a) the mapped finding was
//                          suppressed by a FindingFilterReport entry (citation
//                          carries the filter reason and policy id), or (b) the
//                          rule-map row is `rejected` and carries a citation to
//                          a named decision doc. Anything else stays a gap -
//                          this is the anti-gaming spine of the scoreboard.
//   new                  - Rekon findings classic never produced.
//
// Weighted recall = sum fireCount(matched + missed-intentional) / sum
// fireCount(all classic findings). Matching is deterministic key equality (no
// semantic / fuzzy / embedding matching), consistent with the issue-governance
// ADR posture.

import { normalizePath } from "./normalize-classic.mjs";

export const RULE_STATUSES = ["ported", "unported", "rejected"];

/** Validate the classic-rule disposition table. Throws on malformed rows. */
export function validateRuleMap(ruleMap) {
  if (!ruleMap || typeof ruleMap !== "object" || Array.isArray(ruleMap)) {
    throw new Error("rule-map: expected an object keyed by classic rule id.");
  }

  for (const [classicRuleId, row] of Object.entries(ruleMap)) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`rule-map: row for "${classicRuleId}" must be an object.`);
    }

    if (!RULE_STATUSES.includes(row.status)) {
      throw new Error(
        `rule-map: "${classicRuleId}" has unknown status "${row.status}". Use one of: ${RULE_STATUSES.join(", ")}.`,
      );
    }

    if (row.status === "ported" && (typeof row.rekonRuleId !== "string" || row.rekonRuleId.length === 0)) {
      throw new Error(`rule-map: ported rule "${classicRuleId}" must carry a non-empty rekonRuleId.`);
    }

    if (row.status === "rejected" && (typeof row.citation !== "string" || row.citation.length === 0)) {
      throw new Error(
        `rule-map: rejected rule "${classicRuleId}" must carry a citation (a named decision doc, e.g. docs/strategy/... or docs/adr/...). ` +
          "Intentional divergence without a citation is not allowed.",
      );
    }
  }

  return ruleMap;
}

function rekonRuleKeys(finding) {
  return [...new Set([finding.ruleId, finding.type].filter((value) => typeof value === "string" && value.length > 0))];
}

function fileKey(rule, file) {
  return `${rule} :: file :: ${file}`;
}

function subjectKey(rule, subject) {
  return `${rule} :: subject :: ${subject}`;
}

function pushKey(index, key, value) {
  const existing = index.get(key);

  if (existing) {
    existing.push(value);
  } else {
    index.set(key, [value]);
  }
}

function buildRekonIndex(rekonFindings) {
  const index = new Map();

  rekonFindings.forEach((finding, position) => {
    for (const rule of rekonRuleKeys(finding)) {
      for (const file of finding.files ?? []) {
        const normalized = normalizePath(file);

        if (normalized) {
          pushKey(index, fileKey(rule, normalized), position);
        }
      }

      for (const subject of finding.subjects ?? []) {
        if (typeof subject === "string" && subject.length > 0) {
          pushKey(index, subjectKey(rule, subject), position);
        }
      }
    }
  });

  return index;
}

function classicFiles(classic) {
  return (classic.files ?? []).map(normalizePath).filter((file) => file.length > 0);
}

function classicMatchKeys(rekonRuleId, classic) {
  const files = classicFiles(classic);

  if (files.length > 0) {
    return files.map((file) => fileKey(rekonRuleId, file));
  }

  // Fall back to subject matching only when the classic finding carries no file.
  return (classic.subjects ?? []).map((subject) => subjectKey(rekonRuleId, subject));
}

function findFilterHit(filteredFindings, rekonRuleId, classic) {
  for (const filtered of filteredFindings) {
    const finding = filtered?.finding;

    if (!finding || !rekonRuleKeys(finding).includes(rekonRuleId)) {
      continue;
    }

    const filteredFiles = [...(finding.files ?? []), filtered.filePath]
      .filter((file) => typeof file === "string")
      .map(normalizePath)
      .filter((file) => file.length > 0);
    const files = classicFiles(classic);

    if (files.length > 0) {
      // Strict when both sides carry files: require overlap. A file-less
      // suppression never credits a file-bearing classic finding - bias
      // toward gap on ambiguity.
      if (filteredFiles.length > 0 && files.some((file) => filteredFiles.includes(file))) {
        return filtered;
      }

      continue;
    }

    return filtered;
  }

  return undefined;
}

/**
 * Classify every classic finding and surface unmatched Rekon findings as new.
 * Throws when the corpus observes a classic rule id with no rule-map row -
 * the bench fails loudly rather than silently scoring unmapped rules.
 */
export function classifyParity({ classicFindings, rekonFindings = [], filteredFindings = [], ruleMap }) {
  validateRuleMap(ruleMap);

  const unmapped = [...new Set(classicFindings.map((finding) => finding.ruleId).filter((ruleId) => !(ruleId in ruleMap)))];

  if (unmapped.length > 0) {
    throw new Error(
      `classic-parity-bench: unmapped classic rule id(s): ${unmapped.sort().join(", ")}. ` +
        "Add a row for each to the rule map (status ported | unported | rejected).",
    );
  }

  const index = buildRekonIndex(rekonFindings);
  const matchedRekon = new Set();

  const rows = classicFindings.map((classic) => {
    const disposition = ruleMap[classic.ruleId];

    if (disposition.status === "rejected") {
      return { classic, classification: "missed-intentional", citation: disposition.citation };
    }

    if (disposition.status === "unported") {
      return { classic, classification: "missed-gap" };
    }

    for (const key of classicMatchKeys(disposition.rekonRuleId, classic)) {
      const hits = index.get(key);

      if (hits && hits.length > 0) {
        for (const position of hits) {
          matchedRekon.add(position);
        }

        return {
          classic,
          classification: "matched",
          matchedRekonIds: hits.map((position) => rekonFindings[position].id),
        };
      }
    }

    const filterHit = findFilterHit(filteredFindings, disposition.rekonRuleId, classic);

    if (filterHit) {
      const citation = filterHit.policyId
        ? `FindingFilterReport:${filterHit.reason}:policy=${filterHit.policyId}`
        : `FindingFilterReport:${filterHit.reason}`;

      return { classic, classification: "missed-intentional", citation };
    }

    return { classic, classification: "missed-gap" };
  });

  const newFindings = rekonFindings.filter((_, position) => !matchedRekon.has(position));

  return { rows, newFindings };
}

/** Weighted recall over classification rows. Empty input scores 1 (vacuous). */
export function computeWeightedRecall(rows) {
  let totalWeight = 0;
  let creditedWeight = 0;

  for (const row of rows) {
    const weight = Number.isFinite(row.classic.fireCount) && row.classic.fireCount > 0 ? row.classic.fireCount : 1;
    totalWeight += weight;

    if (row.classification === "matched" || row.classification === "missed-intentional") {
      creditedWeight += weight;
    }
  }

  return {
    totalWeight,
    creditedWeight,
    recall: totalWeight === 0 ? 1 : creditedWeight / totalWeight,
  };
}

function countBy(rows, classify) {
  const counts = new Map();

  for (const row of rows) {
    const key = classify(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

/** Aggregate per-repo results into the bench report (data for json + md). */
export function buildBenchReport({ generatedAt, corpusRoot, repos }) {
  const allRows = repos.flatMap((repo) => repo.rows);
  const aggregate = computeWeightedRecall(allRows);
  const gapByRule = new Map();
  const intentional = [];

  for (const repo of repos) {
    for (const row of repo.rows) {
      const weight = row.classic.fireCount ?? 1;

      if (row.classification === "missed-gap") {
        const entry = gapByRule.get(row.classic.ruleId) ?? { ruleId: row.classic.ruleId, fireCount: 0, repos: new Set() };
        entry.fireCount += weight;
        entry.repos.add(repo.id);
        gapByRule.set(row.classic.ruleId, entry);
      }

      if (row.classification === "missed-intentional") {
        intentional.push({ repo: repo.id, ruleId: row.classic.ruleId, fireCount: weight, citation: row.citation });
      }
    }
  }

  const gapQueue = [...gapByRule.values()]
    .map((entry) => ({ ruleId: entry.ruleId, fireCount: entry.fireCount, repos: [...entry.repos].sort() }))
    .sort((left, right) => right.fireCount - left.fireCount || left.ruleId.localeCompare(right.ruleId));

  return {
    bench: "classic-parity-bench",
    version: 1,
    generatedAt,
    corpusRoot,
    aggregate: {
      ...aggregate,
      classified: Object.fromEntries(countBy(allRows, (row) => row.classification)),
      newFindings: repos.reduce((sum, repo) => sum + repo.newFindings.length, 0),
    },
    gapQueue,
    intentional,
    repos: repos.map((repo) => ({
      id: repo.id,
      refresh: repo.refresh,
      classicFindings: repo.rows.length,
      rekonFindings: repo.rekonFindingCount,
      recall: computeWeightedRecall(repo.rows),
      classified: Object.fromEntries(countBy(repo.rows, (row) => row.classification)),
      newFindings: repo.newFindings.length,
      rows: repo.rows.map((row) => ({
        classicId: row.classic.id,
        ruleId: row.classic.ruleId,
        files: row.classic.files,
        fireCount: row.classic.fireCount,
        classification: row.classification,
        ...(row.citation ? { citation: row.citation } : {}),
        ...(row.matchedRekonIds ? { matchedRekonIds: row.matchedRekonIds } : {}),
      })),
    })),
  };
}

function formatRecall(recall) {
  return `${(recall.recall * 100).toFixed(1)}% (${recall.creditedWeight}/${recall.totalWeight} weighted)`;
}

/** Render the operator-facing Markdown summary. Rule ids and counts only. */
export function renderMarkdownReport(report) {
  const lines = [];

  lines.push("# Classic Parity Bench Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt} - Corpus: ${report.corpusRoot} - Repos: ${report.repos.length}`);
  lines.push("");
  lines.push(`## Weighted recall: ${formatRecall(report.aggregate)}`);
  lines.push("");
  lines.push(
    `Classified: ${Object.entries(report.aggregate.classified)
      .map(([key, count]) => `${key}=${count}`)
      .join(", ") || "none"} - new Rekon findings: ${report.aggregate.newFindings}`,
  );
  lines.push("");
  lines.push("## Gap queue (Phase 1, by fireCount)");
  lines.push("");

  if (report.gapQueue.length === 0) {
    lines.push("No gaps. Every classic finding is matched or intentionally diverged with a citation.");
  } else {
    lines.push("| Classic rule | fireCount | Repos |");
    lines.push("| --- | --- | --- |");

    for (const entry of report.gapQueue) {
      lines.push(`| ${entry.ruleId} | ${entry.fireCount} | ${entry.repos.join(", ")} |`);
    }
  }

  lines.push("");
  lines.push("## Intentional divergences (every entry must carry its citation)");
  lines.push("");

  if (report.intentional.length === 0) {
    lines.push("None.");
  } else {
    lines.push("| Repo | Classic rule | fireCount | Citation |");
    lines.push("| --- | --- | --- | --- |");

    for (const entry of report.intentional) {
      lines.push(`| ${entry.repo} | ${entry.ruleId} | ${entry.fireCount} | ${entry.citation} |`);
    }
  }

  lines.push("");
  lines.push("## Per-repo");
  lines.push("");
  lines.push("| Repo | Classic findings | Rekon findings | Recall | New |");
  lines.push("| --- | --- | --- | --- | --- |");

  for (const repo of report.repos) {
    lines.push(
      `| ${repo.id} | ${repo.classicFindings} | ${repo.rekonFindings} | ${formatRecall(repo.recall)} | ${repo.newFindings} |`,
    );
  }

  lines.push("");

  return lines.join("\n");
}
