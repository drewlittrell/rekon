import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { collectFocusedSnapshotCandidates } from "./defect-pair-run-core.mjs";

export function materializeFocusedSnapshot({
  sourceRoot,
  snapshotRoot,
  commit,
  pair,
}) {
  const materializedPaths = [];
  for (const path of collectFocusedSnapshotCandidates(pair)) {
    if (!gitPathExists(sourceRoot, commit, path)) continue;
    const content = execFileSync("git", ["show", `${commit}:${path}`], {
      cwd: sourceRoot,
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const outputPath = join(snapshotRoot, ...path.split("/"));
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, content);
    materializedPaths.push(path);
  }
  return materializedPaths;
}

function gitPathExists(sourceRoot, commit, path) {
  try {
    execFileSync("git", ["cat-file", "-e", `${commit}:${path}`], {
      cwd: sourceRoot,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}
