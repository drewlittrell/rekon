import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { measureDetectionQuality } from "../../packages/kernel-assessments/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const fixture = join(import.meta.dirname, "../evals/detection-quality/fixture-repo");
const cli = join(import.meta.dirname, "../../packages/cli/dist/index.js");

test("full scan meets the adjudicated detection-quality contract", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-detection-e2e-"));
  try {
    await cp(fixture, root, { recursive: true });
    const expected = JSON.parse(await readFile(join(root, "expected.json"), "utf8"));

    execFileSync(process.execPath, [cli, "scan", "--root", root, "--no-semantic", "--json"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    const store = createLocalArtifactStore(root);
    await store.init();
    const findingReport = await latest(store, "FindingReport");
    const assessmentReport = await latest(store, "AssessmentReport");
    const findingRules = [...new Set(findingReport.findings.map((finding) => finding.ruleId))].sort();
    const assessmentKinds = [...new Set(assessmentReport.assessments.map((assessment) => assessment.kind))].sort();
    const metrics = measureDetectionQuality({
      findings: findingReport.findings,
      assessments: assessmentReport.assessments,
    });

    assert.deepEqual(findingRules, expected.findingRules.slice().sort());
    assert.deepEqual(assessmentKinds, expected.assessmentKinds.slice().sort());
    assert.ok(metrics.evidenceCompleteness >= expected.minimumEvidenceCompleteness);
    assert.ok(metrics.rootCauseCompleteness >= expected.minimumRootCauseCompleteness);
    assert.ok(metrics.duplicateRemediationRate <= expected.maximumDuplicateRemediationRate);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function latest(store, type) {
  const refs = await store.list(type);
  assert.ok(refs.length > 0, `${type} should be written`);
  const ref = refs.slice().sort((left, right) => left.writtenAt.localeCompare(right.writtenAt)).at(-1);
  return store.read(ref);
}
