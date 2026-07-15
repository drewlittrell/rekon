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
  const evidence = assessment?.details?.sourceEvidence;
  if (!Array.isArray(evidence) || changedLines.size === 0) return false;
  return evidence.some((entry) => {
    if (!entry || typeof entry.lineStart !== "number") return false;
    const start = entry.lineStart;
    const end = typeof entry.lineEnd === "number" ? entry.lineEnd : start;
    for (let line = start; line <= end; line += 1) {
      if (changedLines.has(line)) return true;
    }
    return false;
  });
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
