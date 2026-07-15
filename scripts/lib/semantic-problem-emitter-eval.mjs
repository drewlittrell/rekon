export const MIN_DEFECT_EVIDENCE_CHANGED_LINE_COVERAGE = 0.2;

export function changedLineNumbers(currentText, counterpartText) {
  const current = currentText.split(/\r?\n/u);
  const counterpart = counterpartText.split(/\r?\n/u);
  const cells = (current.length + 1) * (counterpart.length + 1);
  if (cells > 4_000_000) return boundedChangedLineFallback(current, counterpart);

  const matrix = Array.from(
    { length: current.length + 1 },
    () => new Uint32Array(counterpart.length + 1),
  );
  for (let left = current.length - 1; left >= 0; left -= 1) {
    for (let right = counterpart.length - 1; right >= 0; right -= 1) {
      matrix[left][right] = current[left] === counterpart[right]
        ? matrix[left + 1][right + 1] + 1
        : Math.max(matrix[left + 1][right], matrix[left][right + 1]);
    }
  }

  const changed = new Set();
  let left = 0;
  let right = 0;
  while (left < current.length && right < counterpart.length) {
    if (current[left] === counterpart[right]) {
      left += 1;
      right += 1;
    } else if (matrix[left + 1][right] >= matrix[left][right + 1]) {
      changed.add(left + 1);
      left += 1;
    } else {
      right += 1;
    }
  }
  while (left < current.length) {
    changed.add(left + 1);
    left += 1;
  }
  return changed;
}

export function assessmentOverlapsChangedLines(assessment, changedLines) {
  return assessmentChangedLineCoverage(assessment, changedLines) > 0;
}

export function assessmentChangedLineCoverage(assessment, changedLines) {
  const evidence = assessment?.details?.sourceEvidence;
  if (!Array.isArray(evidence) || changedLines.size === 0) return 0;
  const citedLines = new Set();
  for (const entry of evidence) {
    if (!entry || typeof entry.lineStart !== "number") continue;
    const start = entry.lineStart;
    const end = typeof entry.lineEnd === "number" ? entry.lineEnd : start;
    for (let line = start; line <= end; line += 1) citedLines.add(line);
  }
  if (citedLines.size === 0) return 0;
  let changedCitations = 0;
  for (const line of citedLines) if (changedLines.has(line)) changedCitations += 1;
  return changedCitations / citedLines.size;
}

export function assessmentMatchesDefectEvidence(input) {
  if (assessmentChangedLineCoverage(input.assessment, input.changedLines)
    >= MIN_DEFECT_EVIDENCE_CHANGED_LINE_COVERAGE) {
    return true;
  }
  if (input.problemClass === "resource-lifetime") {
    return input.assessment?.details?.problemClass === "resource-lifetime"
      && Array.isArray(input.assessment?.details?.retentionEvidence)
      && input.assessment.details.retentionEvidence.length > 0;
  }
  if (input.problemClass !== "error-propagation") return false;
  const anchorLines = new Set(
    (input.errorControlFlow ?? [])
      .filter((entry) => entry.errorIdentity && entry.guards.some((guard) => guard.terms.length > 1))
      .flatMap((entry) => entry.guards)
      .filter((guard) => guard.terms.length > 1)
      .map((guard) => guard.location.line)
      .filter((line) => input.changedLines.has(line)),
  );
  return anchorLines.size > 0 && assessmentOverlapsChangedLines(input.assessment, anchorLines);
}

export function summarizePairEmission(pair, runs) {
  const pairRuns = runs.filter((run) => run.pairId === pair.id && run.status === "ok");
  const requiredPaths = new Set(pair.affectedPaths);
  const buggyDefectPaths = new Set(
    pairRuns
      .filter((run) => run.revision === "buggy" && run.defectEmitted)
      .map((run) => run.path),
  );
  const fixedDefectPaths = new Set(
    pairRuns
      .filter((run) => run.revision === "fixed" && run.defectEmitted)
      .map((run) => run.path),
  );
  const fixedEvaluatedPaths = new Set(
    pairRuns
      .filter((run) => run.revision === "fixed")
      .map((run) => run.path),
  );
  const buggyRetainedPaths = new Set(
    pairRuns
      .filter((run) => run.revision === "buggy" && run.defectRetained)
      .map((run) => run.path),
  );
  const fixedUnclearedPaths = new Set(
    pairRuns
      .filter((run) => run.revision === "fixed" && !run.defectCleared)
      .map((run) => run.path),
  );
  const buggyEmitted = requiredPaths.size > 0
    && [...requiredPaths].every((path) => buggyDefectPaths.has(path));
  const fixedEmitted = fixedDefectPaths.size > 0;
  const buggyRetained = requiredPaths.size > 0
    && [...requiredPaths].every((path) => buggyRetainedPaths.has(path));
  const fixedCleared = requiredPaths.size > 0
    && [...requiredPaths].every((path) => fixedEvaluatedPaths.has(path))
    && fixedUnclearedPaths.size === 0;
  return {
    pairId: pair.id,
    problemClass: pair.claim.category,
    requiredBuggyPaths: requiredPaths.size,
    buggyDefectPaths: buggyDefectPaths.size,
    buggyRetainedPaths: buggyRetainedPaths.size,
    fixedEvaluatedPaths: fixedEvaluatedPaths.size,
    fixedDefectPaths: fixedDefectPaths.size,
    fixedUnclearedPaths: fixedUnclearedPaths.size,
    fixedSameClassCandidate: pairRuns.some(
      (run) => run.revision === "fixed" && run.classCandidateEmitted,
    ),
    buggyEmitted,
    fixedEmitted,
    buggyRetained,
    fixedCleared,
    passed: buggyEmitted && buggyRetained && fixedCleared,
  };
}

function boundedChangedLineFallback(current, counterpart) {
  let prefix = 0;
  while (prefix < current.length && prefix < counterpart.length && current[prefix] === counterpart[prefix]) {
    prefix += 1;
  }
  let suffix = 0;
  while (
    suffix < current.length - prefix
    && suffix < counterpart.length - prefix
    && current[current.length - 1 - suffix] === counterpart[counterpart.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  const changed = new Set();
  for (let index = prefix; index < current.length - suffix; index += 1) changed.add(index + 1);
  return changed;
}
