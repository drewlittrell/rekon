// Pure classification core for the classic-parity-bench (Phase 0). No I/O.
//
// Classifies every normalized classic finding against Rekon's FindingReport /
// FindingFilterReport for the same repo:
//
//   matched              - a ported (or redesigned-with-rekonRuleId) rule's
//                          Rekon finding matches on (rekonRuleId, normalized
//                          file), falling back to (rekonRuleId, subject) when
//                          classic carries no file.
//   missed-gap           - no match and no citable justification. This is the
//                          undecided queue (empty once every rule carries a
//                          pinned disposition).
//   missed-intentional   - citable suppression ONLY: the mapped finding was
//                          suppressed by a FindingFilterReport entry (citation
//                          carries the filter reason and policy id). Credited.
//   missed-redesigned    - the rule's disposition is `redesigned` (decision
//                          pinned in the design doc, detector not yet landed/
//                          matched). In the denominator, NOT credited; carries
//                          the design-doc citation.
//   missed-deferred      - the rule's disposition is `deferred` (real goal,
//                          missing substrate, named re-entry condition). In
//                          the denominator, NOT credited; cited; excluded from
//                          the Phase 1 gap queue.
//   rejected             - the goal is not Rekon's to serve (cited decision).
//                          EXCLUDED from the denominator entirely - per WO-3,
//                          the denominator shrinks only through rejected rows
//                          with rationale.
//   new                  - Rekon findings classic never produced.
//
// Weighted recall = sum fireCount(matched + missed-intentional) / sum
// fireCount(all non-rejected classic findings). Matching is deterministic key
// equality (no semantic / fuzzy / embedding matching), consistent with the
// issue-governance ADR posture. Disposition semantics are authorized by
// docs/strategy/detection-design-decisions.md (Bench scoring policy).

import { normalizePath } from "./normalize-classic.mjs";

export const RULE_STATUSES = ["ported", "unported", "rejected", "redesigned", "deferred"];

/** WO-14 A (bench policy item 2): per-rule scoring mode. */
export const RULE_SCORING_MODES = ["identity", "coverage"];

const CITATION_REQUIRED = new Set(["rejected", "redesigned", "deferred"]);

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

    if (row.scoring !== undefined && !RULE_SCORING_MODES.includes(row.scoring)) {
      throw new Error(
        `rule-map: "${classicRuleId}" has unknown scoring "${row.scoring}". Use one of: ${RULE_SCORING_MODES.join(", ")} (bench policy item 2).`,
      );
    }

    if (CITATION_REQUIRED.has(row.status) && (typeof row.citation !== "string" || row.citation.length === 0)) {
      throw new Error(
        `rule-map: ${row.status} rule "${classicRuleId}" must carry a citation (a named decision doc, e.g. docs/strategy/... or docs/adr/...). ` +
          "Intentional divergence without a citation is not allowed.",
      );
    }

    if (
      row.status === "redesigned" &&
      row.rekonRuleId !== undefined &&
      (typeof row.rekonRuleId !== "string" || row.rekonRuleId.length === 0)
    ) {
      throw new Error(`rule-map: redesigned rule "${classicRuleId}" rekonRuleId, when present, must be a non-empty string.`);
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
export function classifyParity({ classicFindings, rekonFindings = [], filteredFindings = [], ruleMap, overruled = [], suppressedFindings = [] }) {
  validateRuleMap(ruleMap);

  // WO-12: per-finding operator overrules. Keyed by classic finding id;
  // checked before rule-level dispositions because a ruling retires the
  // specific finding it contradicts, never the rule.
  const overruledById = new Map(overruled.map((entry) => [entry.classicId, entry]));

  const unmapped = [...new Set(classicFindings.map((finding) => finding.ruleId).filter((ruleId) => !(ruleId in ruleMap)))];

  if (unmapped.length > 0) {
    throw new Error(
      `classic-parity-bench: unmapped classic rule id(s): ${unmapped.sort().join(", ")}. ` +
        `Add a row for each to the rule map (status ${RULE_STATUSES.join(" | ")}).`,
    );
  }

  const index = buildRekonIndex(rekonFindings);
  const matchedRekon = new Set();

  const rows = classicFindings.map((classic) => {
    const disposition = ruleMap[classic.ruleId];
    const overruling = overruledById.get(classic.id);

    if (overruling) {
      // Out of the denominator: the operator ruled classic wrong here.
      // Citation is the rulingRef into a committed law artifact (WO-12).
      return {
        classic,
        classification: "overruled",
        citation: overruling.rulingRef,
        ...(overruling.note ? { note: overruling.note } : {}),
      };
    }

    if (disposition.status === "rejected") {
      // Out of the denominator entirely - per WO-3, the denominator shrinks
      // only through cited rejected rows.
      return { classic, classification: "rejected", citation: disposition.citation };
    }

    if (disposition.status === "unported") {
      return { classic, classification: "missed-gap" };
    }

    if (disposition.status === "deferred") {
      return { classic, classification: "missed-deferred", citation: disposition.citation };
    }

    // ported always carries a rekonRuleId; redesigned may, once its detector
    // lands - matching works the same for both.
    if (disposition.rekonRuleId) {
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
    }

    if (disposition.status === "redesigned") {
      return { classic, classification: "missed-redesigned", citation: disposition.citation };
    }

    return { classic, classification: "missed-gap" };
  });

  const newFindings = rekonFindings.filter((_, position) => !matchedRekon.has(position));

  // WO-14 A (bench policy item 2): goal-level file-set coverage for
  // LLM-origin clusters. Credit mechanics are unchanged (file overlap);
  // this measures how much of the classic goal's FILE SET the redesigned
  // detector touches, reported per coverage-scored rule.
  const coverageByRule = new Map();

  for (let position = 0; position < rows.length; position += 1) {
    const row = rows[position];
    const disposition = ruleMap[row.classic.ruleId];

    if (disposition?.scoring !== "coverage" || row.classification === "rejected" || row.classification === "overruled") {
      continue;
    }

    const entry = coverageByRule.get(row.classic.ruleId) ?? { classicFiles: new Set(), coveredFiles: new Set() };

    for (const file of row.classic.files ?? []) {
      entry.classicFiles.add(file);

      if (row.classification === "matched") {
        entry.coveredFiles.add(file);
      }
    }

    coverageByRule.set(row.classic.ruleId, entry);
  }

  const coverage = [...coverageByRule.entries()].map(([ruleId, entry]) => ({
    ruleId,
    rekonRuleId: ruleMap[ruleId]?.rekonRuleId ?? null,
    classicFiles: entry.classicFiles.size,
    coveredFiles: entry.coveredFiles.size,
    coverage: entry.classicFiles.size === 0 ? 0 : entry.coveredFiles.size / entry.classicFiles.size,
  })).sort((a, b) => a.ruleId.localeCompare(b.ruleId));

  // WO-14 C (bench policy item 3): precision against the labeled-negative
  // set. Fire on kept, silent on suppressed. A suppressed finding whose
  // file also carries a KEPT classic finding of the same rule cannot
  // condemn a fire (the ambiguous-file guard, counted separately).
  const precisionByRule = new Map();

  if (suppressedFindings.length > 0) {
    const keptFilesByRule = new Map();

    for (const classic of classicFindings) {
      const set = keptFilesByRule.get(classic.ruleId) ?? new Set();

      for (const file of classic.files ?? []) {
        set.add(file);
      }

      keptFilesByRule.set(classic.ruleId, set);
    }

    for (const suppressed of suppressedFindings) {
      const disposition = ruleMap[suppressed.ruleId];

      if (!disposition?.rekonRuleId) {
        continue;
      }

      const entry = precisionByRule.get(disposition.rekonRuleId)
        ?? { suppressedTotal: 0, ambiguousSkipped: 0, firedOnSuppressed: 0 };

      entry.suppressedTotal += 1;

      const keptFiles = keptFilesByRule.get(suppressed.ruleId) ?? new Set();
      const files = suppressed.files ?? [];

      if (files.some((file) => keptFiles.has(file))) {
        entry.ambiguousSkipped += 1;
      } else {
        const fired = classicMatchKeys(disposition.rekonRuleId, suppressed).some((key) => {
          const hits = index.get(key);

          return hits && hits.length > 0;
        });

        if (fired) {
          entry.firedOnSuppressed += 1;
        }
      }

      precisionByRule.set(disposition.rekonRuleId, entry);
    }
  }

  const precision = [...precisionByRule.entries()].map(([rekonRuleId, entry]) => ({
    rekonRuleId,
    ...entry,
    silentOnSuppressed: entry.suppressedTotal - entry.ambiguousSkipped - entry.firedOnSuppressed,
  })).sort((a, b) => a.rekonRuleId.localeCompare(b.rekonRuleId));

  return { rows, newFindings, coverage, precision };
}

/**
 * Weighted recall over classification rows. Empty input scores 1 (vacuous).
 * Rejected rows are excluded from the denominator (and reported in
 * rejectedWeight); redesigned/deferred misses stay in the denominator,
 * uncredited.
 */
export function computeWeightedRecall(rows) {
  let totalWeight = 0;
  let creditedWeight = 0;
  let rejectedWeight = 0;
  let overruledWeight = 0;

  for (const row of rows) {
    const weight = Number.isFinite(row.classic.fireCount) && row.classic.fireCount > 0 ? row.classic.fireCount : 1;

    if (row.classification === "rejected") {
      rejectedWeight += weight;
      continue;
    }

    if (row.classification === "overruled") {
      overruledWeight += weight;
      continue;
    }

    totalWeight += weight;

    if (row.classification === "matched" || row.classification === "missed-intentional") {
      creditedWeight += weight;
    }
  }

  return {
    totalWeight,
    creditedWeight,
    rejectedWeight,
    overruledWeight,
    recall: totalWeight === 0 ? 1 : creditedWeight / totalWeight,
  };
}

/**
 * WO-12 guard: only operator rulings overrule. Every entry must cite a
 * resolvable rulingRef of the form `<repo-path>#<fragment>` where the file
 * is a committed law artifact and the fragment appears in its content
 * (an overlay entry id or ruling memo section). Agents may not add
 * entries on their own judgment - the bench README pins this beside the
 * anti-gaming rules. Per-finding by construction: entries key on
 * classicId, never on a rule id.
 */
export function validateOverruledList(entries, readFileOrNull) {
  if (!Array.isArray(entries)) {
    throw new Error("classic-parity-bench: overruled list must be an array of {classicId, rulingRef, note} entries.");
  }

  for (const entry of entries) {
    if (typeof entry.classicId !== "string" || entry.classicId.length === 0) {
      throw new Error("classic-parity-bench: overruled entry missing classicId (per-finding, never per-rule).");
    }

    if (typeof entry.rulingRef !== "string" || !entry.rulingRef.includes("#")) {
      throw new Error(
        `classic-parity-bench: overruled entry ${entry.classicId} needs a rulingRef of the form <path>#<fragment>.`,
      );
    }

    const [path, fragment] = [entry.rulingRef.slice(0, entry.rulingRef.indexOf("#")), entry.rulingRef.slice(entry.rulingRef.indexOf("#") + 1)];
    const content = readFileOrNull(path);

    if (content === null) {
      throw new Error(
        `classic-parity-bench: overruled entry ${entry.classicId} cites ${path}, which is not a committed law artifact in this repository.`,
      );
    }

    if (fragment.length === 0 || !content.includes(fragment)) {
      throw new Error(
        `classic-parity-bench: overruled entry ${entry.classicId} cites fragment "#${fragment}" not found in ${path} - the ruling must exist before the finding leaves the denominator.`,
      );
    }
  }

  return entries;
}

/** Merge per-repo keyed entries (coverage / precision rows) into one list. */
function aggregateKeyed(repos, field, keyOf, merge) {
  const byKey = new Map();

  for (const repo of repos) {
    for (const entry of repo[field] ?? []) {
      byKey.set(keyOf(entry), merge(byKey.get(keyOf(entry)), entry));
    }
  }

  return [...byKey.values()].sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
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
  const redesignedByRule = new Map();
  const deferredByRule = new Map();
  const rejectedByRule = new Map();
  const intentional = [];
  const overruledRows = [];

  const accumulate = (map, repo, row, weight) => {
    const entry = map.get(row.classic.ruleId) ?? {
      ruleId: row.classic.ruleId,
      fireCount: 0,
      repos: new Set(),
      citation: row.citation,
    };
    entry.fireCount += weight;
    entry.repos.add(repo.id);
    map.set(row.classic.ruleId, entry);
  };

  for (const repo of repos) {
    for (const row of repo.rows) {
      const weight = row.classic.fireCount ?? 1;

      if (row.classification === "missed-gap") {
        accumulate(gapByRule, repo, row, weight);
      } else if (row.classification === "missed-redesigned") {
        accumulate(redesignedByRule, repo, row, weight);
      } else if (row.classification === "missed-deferred") {
        accumulate(deferredByRule, repo, row, weight);
      } else if (row.classification === "rejected") {
        accumulate(rejectedByRule, repo, row, weight);
      } else if (row.classification === "missed-intentional") {
        intentional.push({ repo: repo.id, ruleId: row.classic.ruleId, fireCount: weight, citation: row.citation });
      } else if (row.classification === "overruled") {
        overruledRows.push({
          repo: repo.id,
          classicId: row.classic.id,
          ruleId: row.classic.ruleId,
          files: row.classic.files ?? [],
          fireCount: weight,
          rulingRef: row.citation,
          ...(row.note ? { note: row.note } : {}),
        });
      }
    }
  }

  const toQueue = (map) =>
    [...map.values()]
      .map((entry) => ({
        ruleId: entry.ruleId,
        fireCount: entry.fireCount,
        repos: [...entry.repos].sort(),
        ...(entry.citation ? { citation: entry.citation } : {}),
      }))
      .sort((left, right) => right.fireCount - left.fireCount || left.ruleId.localeCompare(right.ruleId));

  const gapQueue = toQueue(gapByRule);
  const redesignQueue = toQueue(redesignedByRule);
  const deferred = toQueue(deferredByRule);
  const rejected = toQueue(rejectedByRule);

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
    redesignQueue,
    deferred,
    rejected,
    intentional,
    overruled: overruledRows,
    coverage: aggregateKeyed(repos, "coverage", (entry) => `${entry.ruleId}`, (acc, entry) => ({
      ruleId: entry.ruleId,
      rekonRuleId: entry.rekonRuleId,
      classicFiles: (acc?.classicFiles ?? 0) + entry.classicFiles,
      coveredFiles: (acc?.coveredFiles ?? 0) + entry.coveredFiles,
    })).map((entry) => ({
      ...entry,
      coverage: entry.classicFiles === 0 ? 0 : entry.coveredFiles / entry.classicFiles,
    })),
    precision: aggregateKeyed(repos, "precision", (entry) => entry.rekonRuleId, (acc, entry) => ({
      rekonRuleId: entry.rekonRuleId,
      suppressedTotal: (acc?.suppressedTotal ?? 0) + entry.suppressedTotal,
      ambiguousSkipped: (acc?.ambiguousSkipped ?? 0) + entry.ambiguousSkipped,
      firedOnSuppressed: (acc?.firedOnSuppressed ?? 0) + entry.firedOnSuppressed,
    })).map((entry) => ({
      ...entry,
      silentOnSuppressed: entry.suppressedTotal - entry.ambiguousSkipped - entry.firedOnSuppressed,
    })),
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

  if (report.aggregate.rejectedWeight > 0) {
    lines.push(
      `Denominator excludes rejected rules: ${report.aggregate.rejectedWeight} weighted (see Rejected below for citations).`,
    );
    lines.push("");
  }

  if (report.aggregate.overruledWeight > 0) {
    lines.push(
      `Denominator excludes operator-overruled findings: ${report.aggregate.overruledWeight} weighted (see Overruled below for per-finding citations).`,
    );
    lines.push("");
  }

  lines.push(
    `Classified: ${Object.entries(report.aggregate.classified)
      .map(([key, count]) => `${key}=${count}`)
      .join(", ") || "none"} - new Rekon findings: ${report.aggregate.newFindings}`,
  );
  lines.push("");
  lines.push("## Gap queue (undecided, by fireCount)");
  lines.push("");

  if (report.gapQueue.length === 0) {
    lines.push("No undecided gaps. Every classic rule carries a pinned disposition.");
  } else {
    lines.push("| Classic rule | fireCount | Repos |");
    lines.push("| --- | --- | --- |");

    for (const entry of report.gapQueue) {
      lines.push(`| ${entry.ruleId} | ${entry.fireCount} | ${entry.repos.join(", ")} |`);
    }
  }

  lines.push("");
  lines.push("## Redesign queue (Phase 1 - decision pinned, detector pending)");
  lines.push("");

  if (report.redesignQueue.length === 0) {
    lines.push("None.");
  } else {
    lines.push("| Classic rule | fireCount | Repos | Citation |");
    lines.push("| --- | --- | --- | --- |");

    for (const entry of report.redesignQueue) {
      lines.push(`| ${entry.ruleId} | ${entry.fireCount} | ${entry.repos.join(", ")} | ${entry.citation ?? ""} |`);
    }
  }

  lines.push("");
  lines.push("## Deferred (re-entry conditions cited)");
  lines.push("");

  if (report.deferred.length === 0) {
    lines.push("None.");
  } else {
    lines.push("| Classic rule | fireCount | Repos | Citation |");
    lines.push("| --- | --- | --- | --- |");

    for (const entry of report.deferred) {
      lines.push(`| ${entry.ruleId} | ${entry.fireCount} | ${entry.repos.join(", ")} | ${entry.citation ?? ""} |`);
    }
  }

  lines.push("");
  lines.push("## Rejected (out of denominator, with citations)");
  lines.push("");

  if (report.rejected.length === 0) {
    lines.push("None.");
  } else {
    lines.push("| Classic rule | fireCount excluded | Repos | Citation |");
    lines.push("| --- | --- | --- | --- |");

    for (const entry of report.rejected) {
      lines.push(`| ${entry.ruleId} | ${entry.fireCount} | ${entry.repos.join(", ")} | ${entry.citation ?? ""} |`);
    }
  }

  lines.push("");
  lines.push("## Overruled by operator ruling (out of denominator, per-finding)");
  lines.push("");

  if ((report.overruled ?? []).length === 0) {
    lines.push("None.");
  } else {
    lines.push("| Classic finding | Rule | Repo | File(s) | Weight | Ruling |");
    lines.push("| --- | --- | --- | --- | --- | --- |");

    for (const entry of report.overruled) {
      lines.push(
        `| ${entry.classicId} | ${entry.ruleId} | ${entry.repo} | ${entry.files.join(", ")} | ${entry.fireCount} | ${entry.rulingRef} |`,
      );
    }
  }

  lines.push("");
  lines.push("## Coverage-scored rules (LLM-origin baselines, file-set coverage)");
  lines.push("");

  if ((report.coverage ?? []).length === 0) {
    lines.push("None.");
  } else {
    lines.push("| Classic rule | Rekon rule | Classic files | Covered | Coverage |");
    lines.push("| --- | --- | --- | --- | --- |");

    for (const entry of report.coverage) {
      lines.push(
        `| ${entry.ruleId} | ${entry.rekonRuleId ?? "-"} | ${entry.classicFiles} | ${entry.coveredFiles} | ${(entry.coverage * 100).toFixed(1)}% |`,
      );
    }
  }

  lines.push("");
  lines.push("## Precision vs suppressed set (fire on kept, silent on suppressed)");
  lines.push("");

  if ((report.precision ?? []).length === 0) {
    lines.push("No suppressed set loaded (corpus suppressed.json absent).");
  } else {
    lines.push("| Rekon rule | Suppressed | Fired on suppressed | Silent | Ambiguous (kept sibling) |");
    lines.push("| --- | --- | --- | --- | --- |");

    for (const entry of report.precision) {
      lines.push(
        `| ${entry.rekonRuleId} | ${entry.suppressedTotal} | ${entry.firedOnSuppressed} | ${entry.silentOnSuppressed} | ${entry.ambiguousSkipped} |`,
      );
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
