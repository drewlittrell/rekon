import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  assertProofGateReport,
  createEffectiveContractRegistry,
  createFlowContract,
  createOwnershipMap,
  createSystemContract,
  createTaskPact,
} from "@rekon/kernel-repo-model";
import { createLocalArtifactStore } from "@rekon/runtime";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const selectedCheck = "npm run test:proof";
const taskText = "Preserve the bootstrap handoff";

test("change completion is proof-gated and a recorded gate cannot survive another edit", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-proof-gate-loop-"));

  try {
    await createFixture(root);
    const initial = runCliJson([
      "context", "validate-change",
      "--task", taskText,
      "--changed-path", "src/index.ts",
      "--base-ref", "HEAD",
      "--root", root,
      "--json",
    ]);

    assert.equal(initial.status, "needs-judgment");
    assert.equal(initial.proofGate.evaluation.status, "incomplete");
    assert.ok(initial.requiredChecks.includes(selectedCheck));
    assert.ok(!initial.requiredChecks.includes("npm run stale-check"));
    assert.ok(initial.proofGate.obligations.some((entry) => entry.id.endsWith(":edge")));

    const refused = runCliFailure([
      "context", "validate-change",
      "--task", taskText,
      "--changed-path", "src/index.ts",
      "--base-ref", "HEAD",
      "--record-proof",
      "--root", root,
      "--json",
    ]);
    assert.equal(JSON.parse(refused.stdout).status, "needs-judgment");

    const store = createLocalArtifactStore(root);
    assert.equal((await store.list("ProofGateReport")).length, 0);
    const prepared = runCliJson([
      "context", "validate-change",
      "--task", taskText,
      "--changed-path", "src/index.ts",
      "--base-ref", "HEAD",
      "--prepare-verification",
      "--root", root,
      "--json",
    ]);
    assert.equal(prepared.verificationPlan.type, "VerificationPlan");
    assert.match(prepared.next[0], /rekon verify run/u);
    const preparedPlan = await store.read(prepared.verificationPlan);
    assert.deepEqual(preparedPlan.commands, [selectedCheck]);
    assert.ok(preparedPlan.proofObligationIds.some((id) => id.endsWith(":edge")));

    const run = runCliJson([
      "verify", "run",
      "--plan", `${prepared.verificationPlan.type}:${prepared.verificationPlan.id}`,
      "--execute",
      "--root", root,
      "--json",
    ]);
    assert.equal(run.verificationRun.status, "passed");

    const verification = runCliJson([
      "verify", "result", "from-run",
      "--run", `${run.artifact.type}:${run.artifact.id}`,
      "--root", root,
      "--json",
    ]);
    assert.equal(verification.verificationResult.status, "passed");

    const judgments = initial.proofGate.obligations
      .filter((entry) => entry.required)
      .filter((entry) => entry.requiredEvidence.includes("model-judgment"))
      .filter((entry) => !entry.id.endsWith(":edge"))
      .map((entry) => ({
        obligationId: entry.id,
        verdict: "supported",
        explanation: `Inspected the changed source and confirmed: ${entry.assertion}`,
      }));
    assert.ok(judgments.length > 0);

    const completed = runCliJson([
      "context", "validate-change",
      "--task", taskText,
      "--changed-path", "src/index.ts",
      "--base-ref", "HEAD",
      "--verification-result", `${verification.artifact.type}:${verification.artifact.id}`,
      "--judgment-json", JSON.stringify(judgments),
      "--record-proof",
      "--root", root,
      "--json",
    ]);

    assert.equal(completed.status, "passed");
    assert.equal(completed.proofGate.evaluation.status, "satisfied");
    assert.equal(completed.proofGate.evaluation.summary.blocked, 0);
    assert.equal(completed.proofGate.evaluation.summary.unresolved, 0);
    assert.equal(completed.proofArtifact.type, "ProofGateReport");

    const edgeObligation = completed.proofGate.obligations.find((entry) => entry.id.endsWith(":edge"));
    assert.ok(edgeObligation);
    assert.ok(completed.proofGate.results.some((entry) =>
      entry.obligationId === edgeObligation.id
      && entry.method === "test"
      && entry.verdict === "supported"));

    const report = assertProofGateReport(await store.read(completed.proofArtifact));
    assert.equal(report.evaluation.status, "satisfied");
    assert.equal(report.sourceState.files[0].path, "src/index.ts");
    assert.ok(report.sourceState.files[0].afterSha256);
    assert.ok(report.header.inputRefs.some((entry) =>
      entry.type === "VerificationResult" && entry.id === verification.artifact.id));

    const foreignReport = structuredClone(report);
    foreignReport.header.artifactId = "proof-gate-foreign-repository";
    foreignReport.header.subject.repoId = resolve(root, "../foreign-repository");
    const foreignRef = await store.write(foreignReport, { category: "actions" });
    const foreignRefresh = runCliFailure([
      "refresh",
      "--proof-gate", `${foreignRef.type}:${foreignRef.id}`,
      "--root", root,
      "--json",
    ]);
    assert.match(foreignRefresh.stderr, /belongs to repository/iu);

    const refresh = runCliJson([
      "refresh",
      "--proof-gate", `${completed.proofArtifact.type}:${completed.proofArtifact.id}`,
      "--root", root,
      "--json",
    ]);
    assert.ok(refresh.artifacts.some((entry) => entry.type === "ProofGateReport"));

    await writeFile(
      join(root, "src/index.ts"),
      `${await readFile(join(root, "src/index.ts"), "utf8")}export const afterProof = true;\n`,
      "utf8",
    );
    const stale = runCliFailure([
      "refresh",
      "--proof-gate", `${completed.proofArtifact.type}:${completed.proofArtifact.id}`,
      "--root", root,
      "--json",
    ]);
    assert.match(stale.stderr, /source state changed after validation/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createFixture(root) {
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "package.json"), `${JSON.stringify({
    name: "rekon-proof-gate-fixture",
    version: "1.0.0",
    private: true,
    type: "module",
    scripts: { "test:proof": "node -e \"process.exit(0)\"" },
  }, null, 2)}\n`, "utf8");
  await writeFile(join(root, "src/index.ts"), "export const bootstrap = 'stable';\n", "utf8");
  await writeFile(join(root, "src/runtime.ts"), "export const runtime = 'stable';\n", "utf8");

  const store = createLocalArtifactStore(root);
  await store.init();
  const source = { path: "rekon/contracts/proof.json", digest: "a".repeat(64), sourceId: "proof-loop" };
  const clause = (id, statement) => ({
    id,
    statement,
    authority: "adopted",
    confidence: 1,
    sourceRefs: [source],
    evidenceRefs: [],
  });
  const system = createSystemContract({
    header: artifactHeader(root, "SystemContract", "proof-system-contract"),
    contractId: "proof-system-contract",
    authority: "adopted",
    confidence: 1,
    source,
    system: { id: "proof-system", paths: ["src/**"] },
    purpose: "Preserve the proof fixture's bootstrap behavior.",
    userOutcomes: ["Bootstrap remains usable."],
    invariants: [clause("bootstrap-stable", "Keep bootstrap behavior stable.")],
    prohibitedChanges: [],
    requiredContextPaths: ["src/runtime.ts"],
    requiredChecks: [selectedCheck],
  });
  const systemRef = await store.write(system, { category: "actions" });
  const flow = createFlowContract({
    header: artifactHeader(root, "FlowContract", "proof-flow-contract", [systemRef]),
    contractId: "proof-flow",
    authority: "adopted",
    confidence: 1,
    source,
    name: "Bootstrap to runtime",
    criticality: "high",
    purpose: "Carry bootstrap configuration into runtime initialization.",
    userOutcomes: ["The selected runtime starts."],
    entryConditions: [],
    completionConditions: ["Runtime initialization completes."],
    systems: ["proof-system"],
    paths: ["src/**"],
    invariants: [clause("runtime-identity", "Preserve runtime identity end to end.")],
    stages: [
      { id: "bootstrap", systemId: "proof-system", paths: ["src/index.ts"], evidenceRefs: [] },
      { id: "runtime", systemId: "proof-system", paths: ["src/runtime.ts"], evidenceRefs: [] },
    ],
    handoffs: [{
      id: "bootstrap-runtime",
      fromStageId: "bootstrap",
      toStageId: "runtime",
      payload: { requiredFields: ["runtime"] },
      guarantees: ["The selected runtime reaches initialization."],
      failureSemantics: "A missing runtime must fail explicitly.",
      evidenceRefs: [],
    }],
    requiredChecks: [selectedCheck],
  });
  const flowRef = await store.write(flow, { category: "actions" });
  const registry = createEffectiveContractRegistry({
    header: artifactHeader(root, "EffectiveContractRegistry", "proof-contract-registry", [systemRef, flowRef]),
    entries: [
      {
        contractType: "SystemContract",
        contractId: system.contractId,
        authority: "adopted",
        confidence: 1,
        ref: systemRef,
        systems: ["proof-system"],
        paths: ["src/**"],
        flowIds: [],
        clauseIds: ["bootstrap-stable"],
      },
      {
        contractType: "FlowContract",
        contractId: flow.contractId,
        authority: "adopted",
        confidence: 1,
        ref: flowRef,
        systems: ["proof-system"],
        paths: ["src/**"],
        flowIds: [flow.contractId],
        clauseIds: ["runtime-identity"],
      },
    ],
  });
  await store.write(registry, { category: "actions" });
  await store.write(createOwnershipMap({
    header: artifactHeader(root, "OwnershipMap", "proof-ownership", [systemRef]),
    entries: [
      { path: "src/index.ts", ownerSystem: "proof-system", basis: "declared", confidence: 1, evidence: [systemRef] },
      { path: "src/runtime.ts", ownerSystem: "proof-system", basis: "declared", confidence: 1, evidence: [systemRef] },
    ],
  }), { category: "projections" });
  await store.write(createTaskPact({
    header: artifactHeader(root, "TaskPact", "stale-same-text-pact"),
    task: { text: taskText, paths: ["src/unrelated.ts"] },
    contracts: [],
    requiredContextPaths: [],
    constraints: [],
    impactObligations: [],
    requiredChecks: ["npm run stale-check"],
    warnings: [],
  }), { category: "actions" });

  for (const args of [
    ["init", "-q"],
    ["add", "package.json", "src"],
    ["-c", "user.email=rekon@example.test", "-c", "user.name=Rekon Test", "commit", "-qm", "fixture baseline"],
  ]) {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  }
  await writeFile(join(root, "src/index.ts"), "export const bootstrap = 'preserved';\n", "utf8");
}

function artifactHeader(root, type, id, inputRefs = []) {
  return {
    artifactType: type,
    artifactId: id,
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    subject: { repoId: root, paths: ["src/index.ts"] },
    producer: { id: "@rekon/test.proof-gate-loop", version: "1.0.0" },
    inputRefs,
    freshness: { status: "fresh" },
    provenance: { confidence: 1, notes: ["proof-gated change-loop fixture"] },
  };
}

function runCliJson(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 120_000,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function runCliFailure(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 120_000,
  });
  assert.notEqual(result.status, 0, `expected failure; stdout: ${result.stdout}`);
  return result;
}
