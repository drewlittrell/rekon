import { resolve } from "node:path";

import { measureDetectionQuality } from "../packages/kernel-assessments/dist/index.js";
import { createLocalArtifactStore } from "../packages/runtime/dist/index.js";

const rootIndex = process.argv.indexOf("--root");
const root = resolve(rootIndex >= 0 && process.argv[rootIndex + 1] ? process.argv[rootIndex + 1] : process.cwd());
const store = createLocalArtifactStore(root);
await store.init();

async function latest(type) {
  const refs = await store.list(type);
  const ref = refs.slice().sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
  return ref ? store.read(ref) : undefined;
}

const findingReport = await latest("FindingReport");
const assessmentReport = await latest("AssessmentReport");
const metrics = measureDetectionQuality({
  findings: findingReport?.findings ?? [],
  assessments: assessmentReport?.assessments ?? [],
});

process.stdout.write(`${JSON.stringify({
  root,
  metrics,
  assessmentsByKind: assessmentReport?.summary?.byKind ?? {},
  findingsByType: findingReport?.summary?.byType ?? {},
}, null, 2)}\n`);
