import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { createVerificationRun } from "@rekon/capability-intent";
import { createRuntimeGraphObservationReport } from "@rekon/kernel-repo-model";
import { createLocalArtifactStore } from "@rekon/runtime";

const cli = resolve("packages/cli/dist/index.js");
const env = { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", REKON_SEMANTIC: "off" };

test("contract discovery derives an exact handoff verifier from validated isolated coverage", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-contract-verifier-discovery-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(join(root, "test"), { recursive: true });
    await writeFile(join(root, "package.json"), `${JSON.stringify({
      name: "contract-verifier-discovery-fixture",
      private: true,
      type: "module",
      scripts: { "test:checkout": "node --test test/checkout.test.mjs" },
    }, null, 2)}\n`);
    await writeFile(join(root, "src/controller.ts"), "export const controller = true;\n");
    await writeFile(join(root, "src/service.ts"), "export const service = true;\n");
    await writeFile(join(root, "test/checkout.test.mjs"), "// checkout edge test\n");
    run(["init", "--root", root, "--json"]);

    const store = createLocalArtifactStore(root);
    const graphRef = await store.write({
      header: header(root, "GraphSlice", "checkout-flow-graph"),
      sliceType: "behavior-graph",
      nodes: [
        { kind: "route", id: "POST /checkout" },
        { kind: "file", id: "src/controller.ts" },
        { kind: "file", id: "src/service.ts" },
        { kind: "response", id: "checkout-response" },
      ],
      edges: [
        { source: "POST /checkout", target: "src/controller.ts", kind: "calls", evidence: [{ source: "ast", confidence: 1 }] },
        { source: "src/controller.ts", target: "src/service.ts", kind: "calls", evidence: [{ source: "ast", confidence: 1 }] },
        { source: "src/service.ts", target: "checkout-response", kind: "produces", evidence: [{ source: "ast", confidence: 1 }] },
      ],
    }, { category: "graphs" });
    const verificationRun = createVerificationRun({
      header: header(root, "VerificationRun", "checkout-verification-run"),
      status: "passed",
      verificationPlanRef: { type: "VerificationPlan", id: "checkout-plan", schemaVersion: "1.0.0" },
      commands: [{
        id: "checkout-edge-test",
        command: "npm run test:checkout -- test/checkout.test.mjs",
        argv: ["npm", "run", "test:checkout", "--", "test/checkout.test.mjs"],
        status: "passed",
        exitCode: 0,
      }],
      runner: { id: "@rekon/test.contract-verifier", version: "1.0.0" },
    });
    const runRef = await store.write(verificationRun, { category: "actions" });
    const observation = createRuntimeGraphObservationReport({
      header: header(root, "RuntimeGraphObservationReport", "checkout-coverage", [graphRef, runRef]),
      source: {
        coverageSources: [{
          format: "istanbul",
          path: "coverage/coverage-final.json",
          digest: "c".repeat(64),
          testPath: "test/checkout.test.mjs",
          targetPaths: ["src/controller.ts", "src/service.ts"],
          isolated: true,
          totalFiles: 2,
          observedFiles: 2,
          ignoredFiles: 0,
          fileCoverage: ["src/controller.ts", "src/service.ts"].map((path) => ({
            path,
            statements: { total: 1, covered: 1 },
            functions: { total: 0, covered: 0 },
            branches: { total: 0, covered: 0 },
            functionRanges: [],
          })),
          verificationRunRef: runRef,
          commandId: "checkout-edge-test",
          commandStatus: "passed",
        }],
      },
      summary: { observedNodes: 0, observedEdges: 0, handoffEvents: 0, ignoredRows: 0, parseErrors: 0 },
      nodes: [],
      edges: [],
    });
    const observationRef = await store.write(observation, { category: "graphs" });

    const output = run(["contracts", "discover", "--root", root, "--json"]);
    const report = JSON.parse(await readFile(resolve(root, output.artifact.path), "utf8"));
    const flow = report.candidates.find((candidate) =>
      candidate.kind === "flow"
      && candidate.proposed.paths.includes("src/controller.ts")
      && candidate.proposed.paths.includes("src/service.ts"));
    assert.ok(flow);
    const stageById = new Map(flow.proposed.stages.map((stage) => [stage.id, stage]));
    const handoff = flow.proposed.handoffs.find((entry) =>
      stageById.get(entry.fromStageId)?.paths?.includes("src/controller.ts")
      && stageById.get(entry.toStageId)?.paths?.includes("src/service.ts"));
    assert.deepEqual(handoff.verification, {
      acceptedMethods: ["test"],
      acceptancePolicy: "all-required",
      requiredChecks: ["npm run test:checkout -- test/checkout.test.mjs"],
    });
    assert.ok(report.header.inputRefs.some((ref) => ref.id === runRef.id));
    assert.ok(report.header.inputRefs.some((ref) => ref.id === observationRef.id));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function run(args) {
  return JSON.parse(execFileSync(process.execPath, [cli, ...args], { encoding: "utf8", env }));
}

function header(repoId, artifactType, artifactId, inputRefs = []) {
  return {
    artifactType,
    artifactId,
    schemaVersion: "1.0.0",
    generatedAt: "2026-07-22T17:00:00.000Z",
    subject: { repoId },
    producer: { id: "@rekon/test", version: "1.0.0" },
    inputRefs,
    freshness: { status: "fresh" },
    provenance: { confidence: 1 },
  };
}
