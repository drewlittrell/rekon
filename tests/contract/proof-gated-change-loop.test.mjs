import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  createVerificationRun,
} from "@rekon/capability-intent";
import {
  assertProofGateReport,
  createEffectiveContractRegistry,
  createFlowContract,
  createOwnershipMap,
  createRuntimeGraphObservationReport,
  createSystemContract,
  createTaskPact,
} from "@rekon/kernel-repo-model";
import { digestJson } from "@rekon/kernel-artifacts";
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
    assert.equal(initial.checkSelection.checks[0].selection, "declared");
    assert.ok(initial.checkSelection.checks[0].requirements.some((entry) =>
      entry.sourceType === "flow-handoff" && entry.sourceId === "proof-flow:bootstrap-runtime"));
    assert.deepEqual(
      initial.proofGate.obligations.find((entry) => entry.id.endsWith(":edge"))?.requiredEvidence,
      ["test"],
    );
    assert.equal(initial.correctiveContext.entries[0].kind, "missing-check");

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
    assert.equal(preparedPlan.checkSelection.checks[0].selection, "declared");
    assert.ok(preparedPlan.checkSelection.checks[0].proofObligationIds.some((id) => id.endsWith(":edge")));
    assert.ok(!preparedPlan.checkSelection.checks[0].proofObligationIds.some((id) => id.includes(":guarantee:")));

    const run = runCliJson([
      "verify", "run",
      "--plan", `${prepared.verificationPlan.type}:${prepared.verificationPlan.id}`,
      "--execute",
      "--root", root,
      "--json",
    ]);
    assert.equal(run.verificationRun.status, "passed");
    assert.equal(run.verificationRun.sourceState.status, "stable");
    assert.equal(run.verificationRun.sourceState.beforeDigest, run.verificationRun.sourceState.afterDigest);

    const verification = runCliJson([
      "verify", "result", "from-run",
      "--run", `${run.artifact.type}:${run.artifact.id}`,
      "--root", root,
      "--json",
    ]);
    assert.equal(verification.verificationResult.status, "passed");
    assert.equal(verification.verificationResult.sourceStateDigest, run.verificationRun.sourceState.afterDigest);
    const futureVerification = structuredClone(await store.read(verification.artifact));
    futureVerification.header.artifactId = "verification-result-future-bound-old-source";
    futureVerification.header.generatedAt = "2099-01-01T00:00:00.000Z";
    futureVerification.recordedAt = "2099-01-01T00:00:00.000Z";
    for (const command of futureVerification.commandResults) {
      command.completedAt = "2099-01-01T00:00:00.000Z";
    }
    const futureVerificationRef = await store.write(futureVerification, { category: "actions" });

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

    const verifiedSource = await readFile(join(root, "src/index.ts"), "utf8");
    await writeFile(join(root, "src/index.ts"), `${verifiedSource}export const unverified = true;\n`, "utf8");
    const staleVerification = runCliJson([
      "context", "validate-change",
      "--task", taskText,
      "--changed-path", "src/index.ts",
      "--base-ref", "HEAD",
      "--verification-result", `${futureVerificationRef.type}:${futureVerificationRef.id}`,
      "--judgment-json", JSON.stringify(judgments),
      "--root", root,
      "--json",
    ]);
    assert.equal(staleVerification.status, "needs-judgment");
    assert.ok(staleVerification.proofGate.warnings.some((warning) =>
      warning.includes("verification-evidence-stale")));
    assert.equal(staleVerification.correctiveContext.entries[0].kind, "stale-check");
    assert.equal(staleVerification.correctiveContext.entries[0].command, selectedCheck);
    await writeFile(join(root, "src/index.ts"), verifiedSource, "utf8");

    const completed = runCliJson([
      "context", "validate-change",
      "--task", taskText,
      "--changed-path", "src/index.ts",
      "--base-ref", "HEAD",
      "--verification-result", `${futureVerificationRef.type}:${futureVerificationRef.id}`,
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
    assert.equal(report.sourceState.digest, verification.verificationResult.sourceStateDigest);
    assert.ok(report.header.inputRefs.some((entry) =>
      entry.type === "VerificationResult" && entry.id === futureVerificationRef.id));

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

    for (const skippedPhase of ["--skip-publish", "--skip-freshness"]) {
      const incompleteRefresh = runCliFailure([
        "refresh",
        "--proof-gate", `${completed.proofArtifact.type}:${completed.proofArtifact.id}`,
        skippedPhase,
        "--root", root,
        "--json",
      ]);
      assert.match(incompleteRefresh.stderr, /accepted knowledge requires complete maintenance/iu);
    }

    const refresh = runCliJson([
      "refresh",
      "--proof-gate", `${completed.proofArtifact.type}:${completed.proofArtifact.id}`,
      "--root", root,
      "--json",
    ]);
    assert.equal(refresh.status, "passed");
    assert.ok(refresh.artifacts.some((entry) => entry.type === "ProofGateReport"));
    assert.equal(refresh.steps.find((step) => step.id === "proof-gate.revalidate")?.status, "passed");

    const observeStep = refresh.steps.find((step) => step.id === "observe");
    const evidenceRef = observeStep?.artifacts?.[0];
    assert.ok(evidenceRef);
    const evidence = await store.read(evidenceRef);
    assert.ok(evidence.header.inputRefs.some((entry) =>
      entry.type === "ProofGateReport" && entry.id === completed.proofArtifact.id));
    assert.ok(evidence.facts.some((fact) =>
      fact.subject === "src/runtime.ts" || fact.provenance?.file === "src/runtime.ts"),
    "incremental proof refresh should retain unaffected source evidence");

    const projectedRef = refresh.steps.find((step) => step.id === "project")?.artifacts
      ?.find((entry) => entry.type === "ObservedRepo");
    assert.ok(projectedRef);
    const projected = await store.read(projectedRef);
    assert.ok(projected.header.inputRefs.some((entry) =>
      entry.type === evidenceRef.type && entry.id === evidenceRef.id));

    const snapshotRef = refresh.steps.find((step) => step.id === "snapshot")?.artifacts?.[0];
    assert.ok(snapshotRef);
    const snapshot = await store.read(snapshotRef);
    assert.ok(snapshot.header.inputRefs.some((entry) =>
      entry.type === evidenceRef.type && entry.id === evidenceRef.id));

    const publicationRefs = refresh.steps
      .filter((step) => step.id.startsWith("publish."))
      .flatMap((step) => step.artifacts ?? []);
    const publicationKinds = new Set();
    for (const publicationRef of publicationRefs) {
      const publication = await store.read(publicationRef);
      publicationKinds.add(publication.kind);
      assert.ok(publication.header.inputRefs.some((entry) =>
        entry.type === snapshotRef.type && entry.id === snapshotRef.id));
    }
    assert.deepEqual(
      [...publicationKinds].sort(),
      ["agent-contract", "agents", "architecture-summary", "proof-report", "repo-summary"],
    );

    const contractSourcePath = join(root, "rekon/contracts/proof.json");
    const contractSource = await readFile(contractSourcePath, "utf8");
    await writeFile(contractSourcePath, `${contractSource.trimEnd()}\n\n`, "utf8");
    const driftedRefresh = runCliFailure([
      "refresh",
      "--proof-gate", `${completed.proofArtifact.type}:${completed.proofArtifact.id}`,
      "--root", root,
      "--json",
    ]);
    const driftedResult = JSON.parse(driftedRefresh.stdout);
    const driftedStep = driftedResult.steps.find((step) => step.id === "contracts.reconcile");
    assert.equal(driftedStep.status, "failed");
    assert.ok(driftedStep.issues.some((issue) => issue.code === "contract.source_changed"));
    await writeFile(contractSourcePath, contractSource, "utf8");

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

test("failed verification returns bounded redacted context for the exact edge", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-proof-gate-failure-"));

  try {
    await createFixture(root, {
      scripts: {
        "test:proof": "node -e \"console.error('EDGE_DIAGNOSTIC API_KEY=fixture-secret'); process.exit(1)\"",
      },
    });
    const prepared = runCliJson([
      "context", "validate-change",
      "--task", taskText,
      "--changed-path", "src/index.ts",
      "--base-ref", "HEAD",
      "--prepare-verification",
      "--root", root,
      "--json",
    ]);
    const failedRun = runCliFailure([
      "verify", "run",
      "--plan", `${prepared.verificationPlan.type}:${prepared.verificationPlan.id}`,
      "--execute",
      "--root", root,
      "--json",
    ]);
    const runOutput = JSON.parse(failedRun.stdout);
    assert.equal(runOutput.verificationRun.status, "failed");
    const verification = runCliJson([
      "verify", "result", "from-run",
      "--run", `${runOutput.artifact.type}:${runOutput.artifact.id}`,
      "--root", root,
      "--json",
    ]);
    const validationFailure = runCliFailure([
      "context", "validate-change",
      "--task", taskText,
      "--changed-path", "src/index.ts",
      "--base-ref", "HEAD",
      "--verification-result", `${verification.artifact.type}:${verification.artifact.id}`,
      "--root", root,
      "--json",
    ]);
    const validation = JSON.parse(validationFailure.stdout);
    const correction = validation.correctiveContext.entries.find((entry) => entry.kind === "failed-check");
    assert.ok(correction);
    assert.equal(correction.command, selectedCheck);
    assert.deepEqual(correction.paths, ["src/index.ts"]);
    assert.ok(correction.obligationIds.some((id) => id.endsWith(":edge")));
    assert.ok(!correction.obligationIds.some((id) => id.includes(":guarantee:")));
    assert.equal(correction.diagnostic.stream, "stderr");
    assert.match(correction.diagnostic.excerpt, /EDGE_DIAGNOSTIC/u);
    assert.match(correction.diagnostic.excerpt, /API_KEY=\[REDACTED\]/u);
    assert.ok(!correction.diagnostic.excerpt.includes("fixture-secret"));
    assert.ok(correction.evidenceRefs.some((entry) => entry.startsWith("VerificationResult:")));
    assert.ok(correction.evidenceRefs.some((entry) => entry.startsWith("VerificationRun:")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("prior isolated coverage fills a changed-source test gap without acting as current proof", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-proof-gate-coverage-selection-"));

  try {
    await createFixture(root, {
      requiredChecks: ["npm run typecheck:proof"],
      scripts: {
        "typecheck:proof": "node -e \"process.exit(0)\"",
        "test:focused": "node -e \"process.exit(0)\"",
      },
    });
    await mkdir(join(root, "test"), { recursive: true });
    await writeFile(join(root, "test/focused.test.mjs"), "// focused coverage fixture\n", "utf8");
    const store = createLocalArtifactStore(root);
    const run = createVerificationRun({
      header: artifactHeader(root, "VerificationRun", "coverage-verification-run"),
      status: "passed",
      verificationPlanRef: { type: "VerificationPlan", id: "coverage-plan", schemaVersion: "1.0.0" },
      commands: [{
        id: "focused-test",
        command: "npm run test:focused -- test/focused.test.mjs",
        argv: ["npm", "run", "test:focused", "--", "test/focused.test.mjs"],
        status: "passed",
        exitCode: 0,
      }],
      runner: { id: "@rekon/test.coverage-selector", version: "1.0.0" },
    });
    const runRef = await store.write(run, { category: "actions" });
    const observation = createRuntimeGraphObservationReport({
      header: artifactHeader(root, "RuntimeGraphObservationReport", "coverage-observation", [runRef]),
      source: {
        coverageSources: [{
          format: "istanbul",
          path: "coverage/coverage-final.json",
          digest: "c".repeat(64),
          testPath: "test/focused.test.mjs",
          targetPaths: ["src/index.ts"],
          isolated: true,
          totalFiles: 1,
          observedFiles: 1,
          ignoredFiles: 0,
          fileCoverage: [{
            path: "src/index.ts",
            statements: { total: 1, covered: 1 },
            functions: { total: 0, covered: 0 },
            branches: { total: 0, covered: 0 },
            functionRanges: [],
          }],
          verificationRunRef: runRef,
          commandId: "focused-test",
          commandStatus: "passed",
        }],
      },
      summary: { observedNodes: 0, observedEdges: 0, handoffEvents: 0, ignoredRows: 0, parseErrors: 0 },
      nodes: [],
      edges: [],
    });
    const observationRef = await store.write(observation, { category: "graphs" });

    const validation = runCliJson([
      "context", "validate-change",
      "--task", taskText,
      "--changed-path", "src/index.ts",
      "--base-ref", "HEAD",
      "--prepare-verification",
      "--root", root,
      "--json",
    ]);
    assert.deepEqual(validation.requiredChecks, [
      "npm run typecheck:proof",
      "npm run test:focused -- test/focused.test.mjs",
    ]);
    assert.equal(validation.checkSelection.evidenceCandidatesConsidered, 1);
    assert.equal(validation.checkSelection.evidenceBackedChecks, 1);
    assert.equal(validation.proofGate.evaluation.status, "incomplete");
    const focused = validation.checkSelection.checks.find((check) =>
      check.command === "npm run test:focused -- test/focused.test.mjs");
    assert.equal(focused.selection, "evidence-backed");
    assert.ok(focused.requirements[0].evidenceRefs.includes(`RuntimeGraphObservationReport:${observationRef.id}`));
    assert.ok(focused.requirements[0].evidenceRefs.includes(`VerificationRun:${runRef.id}`));

    const plan = await store.read(validation.verificationPlan);
    const plannedFocused = plan.checkSelection.checks.find((check) =>
      check.command === "npm run test:focused -- test/focused.test.mjs");
    assert.equal(plannedFocused.selection, "evidence-backed");
    assert.ok(plan.header.inputRefs.some((entry) => entry.type === "RuntimeGraphObservationReport" && entry.id === observationRef.id));
    assert.ok(plan.header.inputRefs.some((entry) => entry.type === "VerificationRun" && entry.id === runRef.id));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createFixture(root, options = {}) {
  const requiredChecks = options.requiredChecks ?? [selectedCheck];
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, "rekon", "contracts"), { recursive: true });
  await writeFile(join(root, "package.json"), `${JSON.stringify({
    name: "rekon-proof-gate-fixture",
    version: "1.0.0",
    private: true,
    type: "module",
    scripts: {
      "test:proof": "node -e \"process.exit(0)\"",
      ...(options.scripts ?? {}),
    },
  }, null, 2)}\n`, "utf8");
  await writeFile(join(root, "src/index.ts"), "export const bootstrap = 'stable';\n", "utf8");
  await writeFile(join(root, "src/runtime.ts"), "export const runtime = 'stable';\n", "utf8");

  const contractSourceDocument = {
    version: "1.0.0",
    sourceId: "proof-loop",
    systems: [{
      id: "proof-system-contract",
      systemId: "proof-system",
      scope: { paths: ["src/**"] },
      purpose: "Preserve the proof fixture's bootstrap behavior.",
      userOutcomes: ["Bootstrap remains usable."],
      invariants: [{ id: "bootstrap-stable", statement: "Keep bootstrap behavior stable." }],
      requiredContextPaths: ["src/runtime.ts"],
      requiredChecks,
    }],
    flows: [{
      id: "proof-flow",
      name: "Bootstrap to runtime",
      criticality: "high",
      purpose: "Carry bootstrap configuration into runtime initialization.",
      userOutcomes: ["The selected runtime starts."],
      completionConditions: ["Runtime initialization completes."],
      systems: ["proof-system"],
      paths: ["src/**"],
      invariants: [{ id: "runtime-identity", statement: "Preserve runtime identity end to end." }],
      stages: [
        { id: "bootstrap", systemId: "proof-system", paths: ["src/index.ts"] },
        { id: "runtime", systemId: "proof-system", paths: ["src/runtime.ts"] },
      ],
      handoffs: [{
        id: "bootstrap-runtime",
        fromStageId: "bootstrap",
        toStageId: "runtime",
        payload: { requiredFields: ["runtime"] },
        guarantees: ["The selected runtime reaches initialization."],
        failureSemantics: "A missing runtime must fail explicitly.",
        verification: {
          acceptedMethods: ["test"],
          requiredChecks,
        },
      }],
      requiredChecks,
    }],
  };
  const contractSourceText = `${JSON.stringify(contractSourceDocument, null, 2)}\n`;
  await writeFile(join(root, "rekon/contracts/proof.json"), contractSourceText, "utf8");

  const store = createLocalArtifactStore(root);
  await store.init();
  const source = {
    path: "rekon/contracts/proof.json",
    digest: digestJson(contractSourceText),
    sourceId: "proof-loop",
  };
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
    requiredChecks,
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
      verification: {
        acceptedMethods: ["test"],
        requiredChecks,
      },
      evidenceRefs: [],
    }],
    requiredChecks,
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
    ["add", "package.json", "src", "rekon/contracts"],
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
