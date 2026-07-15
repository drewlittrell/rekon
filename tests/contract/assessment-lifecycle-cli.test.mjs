import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { createAssessmentReport } from "../../packages/kernel-assessments/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const evidence = { type: "EvidenceGraph", id: "evidence", schemaVersion: "0.1.0" };

test("assessments list exposes and filters lifecycle state", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-assessment-state-"));
  try {
    const store = createLocalArtifactStore(root);
    await store.init();
    await store.write(createAssessmentReport({
      header: {
        artifactType: "AssessmentReport",
        artifactId: "assessment-state-report",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-11T00:00:00.000Z",
        subject: { repoId: "fixture" },
        producer: { id: "test", version: "1.0.0" },
        inputRefs: [evidence],
      },
      assessments: [
        assessment("model", "semantic_claim", "semantic", "unverified"),
        assessment("tool", "risk", "mixed", "corroborated"),
        assessment("independent", "risk", "mixed", "independently_confirmed"),
      ],
    }), { category: "findings" });

    const result = spawnSync(process.execPath, [
      cliPath,
      "assessments",
      "list",
      "--state",
      "independently_confirmed",
      "--root",
      root,
      "--json",
    ], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.summary.byState.model_proposed, 1);
    assert.equal(payload.summary.byState.tool_corroborated, 1);
    assert.equal(payload.summary.byState.independently_confirmed, 1);
    assert.equal(payload.rendered, 1);
    assert.equal(payload.assessments[0].id, "independent");
    assert.equal(payload.assessments[0].state, "independently_confirmed");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function assessment(id, kind, basis, verification) {
  return {
    id,
    kind,
    type: "fixture",
    impact: "medium",
    title: id,
    description: id,
    subjects: ["src/index.ts"],
    files: ["src/index.ts"],
    evidence: [evidence],
    rootCauseKey: `fixture:${id}`,
    confidence: { score: 0.7, basis, verification },
  };
}
