import { posix } from "node:path";

const ROOT_METADATA_PATHS = [
  "package.json",
  "tsconfig.json",
  "jsconfig.json",
  "pnpm-workspace.yaml",
  "lerna.json",
  "nx.json",
  "turbo.json",
  "vercel.json",
];

const ANCESTOR_METADATA_NAMES = [
  "package.json",
  "tsconfig.json",
  "jsconfig.json",
];

export function collectDefectPairPaths(pair) {
  return [...new Set([
    ...pair.affectedPaths,
    ...(pair.evidencePaths ?? []),
    ...(pair.testPaths ?? []),
  ])].sort();
}

export function collectFocusedSnapshotCandidates(pair) {
  const paths = new Set([
    ...ROOT_METADATA_PATHS,
    ...collectDefectPairPaths(pair),
  ]);

  for (const path of collectDefectPairPaths(pair)) {
    let directory = posix.dirname(path);
    while (directory !== ".") {
      for (const name of ANCESTOR_METADATA_NAMES) {
        paths.add(posix.join(directory, name));
      }
      directory = posix.dirname(directory);
    }
  }

  return [...paths].sort();
}

export function buildDefectPairCommandArgs({
  temporaryRoot,
  output,
  pairs = [],
  full = false,
}) {
  const setupArgs = ["--root", temporaryRoot];
  const benchArgs = ["--corpus", temporaryRoot, "--output", output];
  for (const pair of pairs) {
    setupArgs.push("--pair", pair);
    benchArgs.push("--pair", pair);
  }
  if (full) {
    setupArgs.push("--full");
    benchArgs.push("--full");
  }
  return { setupArgs, benchArgs };
}

export function isAcceptableRefreshResult(result, parsed) {
  return !result.error && (result.status === 0 || parsed?.status === "partial");
}

export function parseCliJson(stdout, label, result) {
  const output = typeof stdout === "string" ? stdout : "";
  try {
    return JSON.parse(output);
  } catch (directError) {
    const start = output.indexOf("{");
    const end = output.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(output.slice(start, end + 1));
      } catch {
        // Report the process context below instead of the nested parser error.
      }
    }
    const cause = directError instanceof Error ? directError.message : String(directError);
    throw new Error(
      `defect-pair-bench: could not parse JSON output for ${label}: ${cause}.\n`
      + formatProcessDiagnostics(result),
    );
  }
}

export function formatProcessDiagnostics(result, limit = 3000) {
  if (!result) return "Process diagnostics unavailable.";
  const lines = [
    `Process status: ${result.status ?? "none"}`,
    `Process signal: ${result.signal ?? "none"}`,
  ];
  if (result.error) {
    const code = typeof result.error.code === "string" ? ` (${result.error.code})` : "";
    lines.push(`Process error${code}: ${result.error.message ?? String(result.error)}`);
  }
  lines.push(`stderr tail:\n${boundedTail(result.stderr, limit) || "<empty>"}`);
  lines.push(`stdout tail:\n${boundedTail(result.stdout, limit) || "<empty>"}`);
  return lines.join("\n");
}

export function boundedTail(value, limit = 3000) {
  const text = typeof value === "string" ? value : "";
  if (text.length <= limit) return text;
  return `[truncated ${text.length - limit} chars]\n${text.slice(-limit)}`;
}
