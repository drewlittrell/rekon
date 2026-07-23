import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, generateKeyPairSync } from "node:crypto";
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
  createPlacementVerificationReport,
  createRuntimeGraphObservationReport,
  createSystemContract,
  createTaskPact,
  signPlacementVerificationReport,
  assertOutcomeEvent,
} from "@rekon/kernel-repo-model";
import { createSourceStateBinding, digestJson } from "@rekon/kernel-artifacts";
import { createLocalArtifactStore } from "@rekon/runtime";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const selectedCheck = "npm run test:proof";
const taskText = "Preserve the bootstrap handoff";

test("change completion is proof-gated and a recorded gate cannot survive another edit", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-proof-gate-loop-"));

  try {
    await createFixture(root);
    const addedMemory = runCliJson([
      "memory", "add",
      "--instruction", "Keep the bootstrap handoff stable.",
      "--path", "src/index.ts",
      "--goal", taskText,
      "--root", root,
      "--json",
    ]);
    const memoryRef = addedMemory.artifacts.find((entry) => entry.type === "OperatorFeedbackEntry");
    assert.ok(memoryRef);
    const delivered = runCliJson([
      "context", "task",
      "--task", taskText,
      "--path", "src/index.ts",
      "--provider", "mock",
      "--root", root,
      "--json",
    ]);
    assert.equal(delivered.contextUsage.type, "ContextUsageEvent");
    const trialMemory = delivered.agentContext.supportingContext.find((entry) =>
      entry.ref === `memory:${memoryRef.id}`);
    assert.ok(trialMemory);
    assert.equal(trialMemory.groundedStatus, "unobserved");
    assert.equal(trialMemory.admission, "unresolved");
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
      "--context-usage", `${delivered.contextUsage.type}:${delivered.contextUsage.id}`,
      "--context-claims-json", JSON.stringify({ [`memory:${memoryRef.id}`]: "applied" }),
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
    assert.equal(completed.outcomeArtifact.type, "OutcomeEvent");
    assert.equal(completed.contextClaimReceipt.type, "ContextUsageEvent");

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
    const verifiedOutcome = assertOutcomeEvent(await store.read(completed.outcomeArtifact));
    assert.equal(verifiedOutcome.phase, "validation-attempt");
    assert.equal(verifiedOutcome.status, "verified");
    assert.equal(verifiedOutcome.proofGateRef.id, completed.proofArtifact.id);
    assert.equal(verifiedOutcome.sourceState.digest, report.sourceState.digest);
    assert.deepEqual(
      verifiedOutcome.contextUsageRefs.map((entry) => `${entry.type}:${entry.id}`),
      [`${completed.contextClaimReceipt.type}:${completed.contextClaimReceipt.id}`],
    );

    const currentSnapshotRef = (await store.list("IntelligenceSnapshot"))
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
    assert.ok(currentSnapshotRef);
    const staleResolverRef = await store.write({
      header: {
        artifactType: "ResolverPacket",
        artifactId: "preflight-zz-stale-lineage",
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: { repoId: root, paths: ["src/index.ts"] },
        producer: { id: "@rekon/test.stale-lineage", version: "1.0.0" },
        inputRefs: [currentSnapshotRef],
        supersession: { key: "stale-lineage" },
        freshness: { status: "fresh" },
        provenance: { confidence: 1 },
      },
      relevantFindings: [],
      relevantAssessments: [],
    }, { category: "resolver-packets" });
    const staleWorkOrderRef = await store.write({
      header: {
        artifactType: "WorkOrder",
        artifactId: "work-order-zz-stale-lineage",
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: { repoId: root, paths: ["src/index.ts"] },
        producer: { id: "@rekon/test.stale-lineage", version: "1.0.0" },
        inputRefs: [staleResolverRef],
        supersession: { key: "stale-lineage" },
        freshness: { status: "fresh" },
        provenance: { confidence: 1 },
      },
      goal: "Historical task-local work",
      paths: ["src/index.ts"],
      ownerSystems: ["src"],
      source: "resolver",
    }, { category: "actions" });

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
    assert.equal(refresh.freshness.latestMajor.every((entry) => entry.status === "fresh"), true);
    assert.ok(refresh.artifacts.some((entry) => entry.type === "ProofGateReport"));
    const preacceptStep = refresh.steps.find((step) => step.id === "proof-gate.preaccept");
    assert.equal(preacceptStep?.status, "passed");
    assert.equal(refresh.steps.find((step) => step.id === "proof-gate.revalidate")?.status, "passed");
    const outcomeStep = refresh.steps.find((step) => step.id === "outcome.record");
    assert.equal(outcomeStep?.status, "passed");
    const acceptedOutcome = assertOutcomeEvent(await store.read(outcomeStep.artifacts[0]));
    assert.equal(acceptedOutcome.phase, "proof-gated-refresh");
    assert.equal(acceptedOutcome.status, "accepted");
    assert.equal(acceptedOutcome.proofGateRef.id, completed.proofArtifact.id);
    assert.equal(acceptedOutcome.header.inputRefs.some((entry) =>
      entry.type === "IntelligenceSnapshot" || entry.type === "Publication"), false);
    assert.ok(acceptedOutcome.header.inputRefs.some((entry) =>
      entry.type === "OutcomeEvent" && entry.id === completed.outcomeArtifact.id));
    const memoryStep = refresh.steps.find((step) => step.id === "memory.curate");
    assert.equal(memoryStep?.status, "passed");
    assert.ok(memoryStep.artifacts.some((entry) => entry.type === "MemoryCurationReport"));
    const evaluationRef = memoryStep.artifacts.find((entry) => entry.type === "ContextOutcomeEvaluationReport");
    assert.ok(evaluationRef);
    const evaluation = await store.read(evaluationRef);
    assert.ok(evaluation.header.inputRefs.some((entry) =>
      entry.type === "OutcomeEvent" && entry.id === acceptedOutcome.header.artifactId));
    const evaluatedMemory = evaluation.items.find((entry) =>
      entry.subject.kind === "memory-entry" && entry.subject.id === memoryRef.id);
    assert.equal(evaluatedMemory?.status, "suggestive");
    assert.equal(evaluatedMemory?.supportingRootKeys.length, 1);
    const curationRef = memoryStep.artifacts.find((entry) => entry.type === "MemoryCurationReport");
    assert.ok(curationRef);
    const curation = await store.read(curationRef);
    const curatedMemory = curation.items.find((entry) => entry.memoryEntryId === memoryRef.id);
    assert.equal(curatedMemory?.recommendation, "keep");
    assert.equal(curatedMemory?.groundedStatus, "suggestive");
    assert.ok(refresh.steps.indexOf(preacceptStep) < refresh.steps.indexOf(outcomeStep));
    assert.ok(refresh.steps.indexOf(outcomeStep) < refresh.steps.indexOf(memoryStep));
    const snapshotStep = refresh.steps.find((step) => step.id === "snapshot");
    const firstPublicationStep = refresh.steps.find((step) => step.id === "publish.guidance");
    const freshnessStep = refresh.steps.find((step) => step.id === "artifacts.freshness");
    const finalGateStep = refresh.steps.find((step) => step.id === "proof-gate.revalidate");
    assert.ok(refresh.steps.indexOf(memoryStep) < refresh.steps.indexOf(snapshotStep));
    assert.ok(refresh.steps.indexOf(snapshotStep) < refresh.steps.indexOf(firstPublicationStep));
    assert.ok(refresh.steps.indexOf(freshnessStep) < refresh.steps.indexOf(finalGateStep));
    assert.ok(
      refresh.steps.indexOf(refresh.steps.find((step) => step.id === "agent-instructions.sync"))
        < refresh.steps.indexOf(refresh.steps.find((step) => step.id === "observe")),
    );

    const repeatedContext = runCliJson([
      "context", "task",
      "--task", taskText,
      "--path", "src/index.ts",
      "--provider", "mock",
      "--root", root,
      "--json",
    ]);
    const repeatedMemory = repeatedContext.agentContext.supportingContext.find((entry) =>
      entry.ref === `memory:${memoryRef.id}`);
    assert.ok(repeatedMemory);
    assert.equal(repeatedMemory.groundedStatus, "suggestive");
    assert.equal(repeatedMemory.admission, "unresolved");

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
      assert.equal(publication.header.inputRefs.some((entry) =>
        (entry.type === staleResolverRef.type && entry.id === staleResolverRef.id)
        || (entry.type === staleWorkOrderRef.type && entry.id === staleWorkOrderRef.id)), false);
      if (publication.kind === "proof-report") {
        assert.ok(publication.header.inputRefs.some((entry) =>
          entry.type === completed.proofArtifact.type && entry.id === completed.proofArtifact.id));
        assert.match(publication.content, /## Change Proof Gate/u);
      }
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

test("proof-gated change validation requires current-diff regression evidence declared by a handoff", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-proof-evidence-path-"));
  const evidencePath = "test/bootstrap.test.mjs";

  try {
    await createFixture(root, {
      stageResponsibilities: ["Normalize bootstrap input before runtime dispatch."],
      requiredEvidencePaths: [evidencePath],
    });
    const initial = runCliJson([
      "context", "validate-change",
      "--task", taskText,
      "--changed-path", "src/index.ts",
      "--base-ref", "HEAD",
      "--judgment-json", JSON.stringify([{
        obligationId: "handoff:proof-flow:bootstrap-runtime:evidence-path",
        verdict: "supported",
        explanation: "The model considers the regression evidence sufficient.",
      }]),
      "--root", root,
      "--json",
    ]);

    const responsibilityId = "constraint:proof-flow.stage.bootstrap.responsibility.1";
    const evidencePathId = "handoff:proof-flow:bootstrap-runtime:evidence-path";
    assert.deepEqual(
      initial.proofGate.obligations.find((entry) =>
        entry.id === responsibilityId)?.requiredEvidence,
      ["test", "model-judgment"],
    );
    assert.deepEqual(
      initial.proofGate.obligations.find((entry) =>
        entry.id === evidencePathId)?.requiredEvidence,
      ["static"],
    );
    assert.ok(initial.proofGate.warnings.includes(
      `model-judgment-not-accepted: ${evidencePathId}`,
    ));
    assert.ok(initial.proofGate.warnings.some((warning) =>
      warning.startsWith(`handoff-evidence-path-missing: ${evidencePathId}`)));
    assert.ok(!initial.proofGate.results.some((entry) =>
      entry.obligationId === evidencePathId));

    await writeFile(
      join(root, evidencePath),
      "import assert from 'node:assert/strict';\nassert.equal('preserved', 'preserved');\n",
      "utf8",
    );
    const withEvidence = runCliJson([
      "context", "validate-change",
      "--task", taskText,
      "--changed-path", "src/index.ts",
      "--changed-path", evidencePath,
      "--base-ref", "HEAD",
      "--prepare-verification",
      "--root", root,
      "--json",
    ]);

    assert.ok(withEvidence.proofGate.results.some((entry) =>
      entry.obligationId === evidencePathId
      && entry.method === "static"
      && entry.verdict === "supported"));
    assert.ok(!withEvidence.proofGate.warnings.some((warning) =>
      warning.startsWith(`handoff-evidence-path-missing: ${evidencePathId}`)));
    const plannedCheck = withEvidence.checkSelection.checks.find((entry) =>
      entry.command === selectedCheck);
    assert.ok(plannedCheck.requirements.some((entry) =>
      entry.paths.includes(evidencePath)));
    assert.ok(plannedCheck.proofObligationIds.includes(responsibilityId));
    const store = createLocalArtifactStore(root);
    const plan = await store.read(withEvidence.verificationPlan);
    assert.ok(plan.proofObligationIds.includes(responsibilityId));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI stage placement cannot be self-certified and requires current independent source review", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-placement-review-"));
  const evidencePath = "test/bootstrap.test.mjs";
  const verifierId = "codex-independent-placement-judge";
  const keyId = "placement-judge-1";
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const signingKey = {
    algorithm: "ed25519",
    keyId,
    privateKeyPkcs8: privateKey.export({ format: "der", type: "pkcs8" }).toString("base64"),
  };
  const trustedKey = {
    algorithm: "ed25519",
    keyId,
    verifierId,
    publicKeySpki: publicKey.export({ format: "der", type: "spki" }).toString("base64"),
  };

  try {
    const fixture = await createFixture(root, {
      stageResponsibilities: ["Normalize bootstrap input before runtime dispatch."],
      requiredEvidencePaths: [evidencePath],
      trustedPlacementVerificationKeys: [trustedKey],
    });
    await writeFile(
      join(root, evidencePath),
      "import assert from 'node:assert/strict';\nassert.equal('placement', 'placement');\n",
      "utf8",
    );

    const prepared = runCliJson([
      "context", "validate-change",
      "--task", taskText,
      "--changed-path", "src/index.ts",
      "--changed-path", evidencePath,
      "--base-ref", "HEAD",
      "--prepare-verification",
      "--root", root,
      "--json",
    ]);
    const responsibility = prepared.proofGate.obligations.find((entry) =>
      entry.id === "constraint:proof-flow.stage.bootstrap.responsibility.1");
    assert.ok(responsibility);

    const verificationRun = runCliJson([
      "verify", "run",
      "--plan", `${prepared.verificationPlan.type}:${prepared.verificationPlan.id}`,
      "--execute",
      "--root", root,
      "--json",
    ]);
    const verification = runCliJson([
      "verify", "result", "from-run",
      "--run", `${verificationRun.artifact.type}:${verificationRun.artifact.id}`,
      "--root", root,
      "--json",
    ]);

    const genericJudgments = prepared.proofGate.obligations
      .filter((entry) => entry.required)
      .filter((entry) => entry.requiredEvidence.includes("model-judgment"))
      .filter((entry) => entry.id !== responsibility.id)
      .filter((entry) => !entry.id.endsWith(":edge"))
      .map((entry) => ({
        obligationId: entry.id,
        verdict: "supported",
        explanation: `Independent placement is not required for this generic semantic clause: ${entry.assertion}`,
      }));
    const selfCertified = runCliJson([
      "context", "validate-change",
      "--task", taskText,
      "--changed-path", "src/index.ts",
      "--changed-path", evidencePath,
      "--base-ref", "HEAD",
      "--verification-result", `${verification.artifact.type}:${verification.artifact.id}`,
      "--judgment-json", JSON.stringify([{
        obligationId: responsibility.id,
        verdict: "supported",
        explanation: "The acting agent considers its own placement correct.",
      }, ...genericJudgments]),
      "--root", root,
      "--json",
    ]);
    assert.equal(selfCertified.status, "needs-judgment");
    assert.ok(selfCertified.proofGate.warnings.includes(
      `model-judgment-self-certification-rejected: ${responsibility.id}`,
    ));

    const baseRef = runGit(root, ["rev-parse", "HEAD"]).trim();
    const changedPaths = ["src/index.ts", evidencePath];
    const sourceState = createSourceStateBinding({
      baseRef,
      files: await Promise.all(changedPaths.map(async (path) => {
        const before = runGit(root, ["show", `HEAD:${path}`]);
        const after = await readFile(join(root, path), "utf8");
        return {
          path,
          status: "modified",
          beforeSha256: sha256(before),
          afterSha256: sha256(after),
        };
      })),
    });
    const changedSource = await readFile(join(root, "src/index.ts"), "utf8");
    const placementReport = createPlacementVerificationReport({
      header: {
        artifactType: "PlacementVerificationReport",
        artifactId: "placement-review-bootstrap",
        schemaVersion: "1.0.0",
        generatedAt: new Date().toISOString(),
        subject: { repoId: root, paths: changedPaths },
        producer: { id: "@rekon/test.independent-placement-judge", version: "1.0.0" },
        inputRefs: [fixture.flowRef],
        freshness: { status: "fresh" },
        provenance: { confidence: 1, notes: ["Independent source-backed placement review."] },
      },
      task: { text: taskText, paths: changedPaths },
      obligation: {
        id: responsibility.id,
        assertion: responsibility.assertion,
        contractRef: fixture.flowRef,
        flowId: "proof-flow",
        stageId: "bootstrap",
        stagePaths: ["src/index.ts"],
        changedSourcePaths: ["src/index.ts"],
      },
      sourceState,
      sourceEvidence: [{
        path: "src/index.ts",
        sha256: sourceState.files.find((file) => file.path === "src/index.ts").afterSha256,
        lineStart: 1,
        lineEnd: 1,
        excerpt: changedSource.trim(),
      }],
      verdict: "supported",
      explanation: "The bootstrap change remains in the stage that owns normalization before runtime dispatch.",
      verifier: {
        kind: "model",
        id: verifierId,
        version: "1.0.0",
        independentOf: ["rekon-managed-agent"],
      },
    });
    const store = createLocalArtifactStore(root);
    const unsignedRef = await store.write(placementReport, { category: "actions" });

    const unsigned = runCliJson([
      "context", "validate-change",
      "--task", taskText,
      "--changed-path", "src/index.ts",
      "--changed-path", evidencePath,
      "--base-ref", "HEAD",
      "--verification-result", `${verification.artifact.type}:${verification.artifact.id}`,
      "--placement-verification", `${unsignedRef.type}:${unsignedRef.id}`,
      "--judgment-json", JSON.stringify(genericJudgments),
      "--root", root,
      "--json",
    ]);
    assert.equal(unsigned.status, "needs-judgment");
    assert.ok(unsigned.proofGate.warnings.some((warning) =>
      warning.includes("attestation is untrusted (attestation-missing)")));

    const signedPlacementReport = signPlacementVerificationReport({
      ...placementReport,
      header: {
        ...placementReport.header,
        artifactId: "placement-review-bootstrap-signed",
      },
    }, signingKey);
    const placementRef = await store.write(signedPlacementReport, { category: "actions" });

    const completed = runCliJson([
      "context", "validate-change",
      "--task", taskText,
      "--changed-path", "src/index.ts",
      "--changed-path", evidencePath,
      "--base-ref", "HEAD",
      "--verification-result", `${verification.artifact.type}:${verification.artifact.id}`,
      "--placement-verification", `${placementRef.type}:${placementRef.id}`,
      "--judgment-json", JSON.stringify(genericJudgments),
      "--record-proof",
      "--root", root,
      "--json",
    ]);
    assert.equal(completed.status, "passed");
    assert.equal(completed.proofGate.evaluation.status, "satisfied");
    assert.ok(completed.proofGate.results.some((entry) =>
      entry.obligationId === responsibility.id
      && entry.verdict === "supported"
      && entry.evidenceRefs.some((ref) =>
        ref.type === "PlacementVerificationReport" && ref.id === placementRef.id)));
    assert.ok(completed.proofArtifact);

    await writeFile(join(root, "src/index.ts"), `${changedSource}export const later = true;\n`, "utf8");
    const stale = runCliJson([
      "context", "validate-change",
      "--task", taskText,
      "--changed-path", "src/index.ts",
      "--changed-path", evidencePath,
      "--base-ref", "HEAD",
      "--verification-result", `${verification.artifact.type}:${verification.artifact.id}`,
      "--placement-verification", `${placementRef.type}:${placementRef.id}`,
      "--judgment-json", JSON.stringify(genericJudgments),
      "--root", root,
      "--json",
    ]);
    assert.equal(stale.status, "needs-judgment");
    assert.ok(stale.proofGate.warnings.some((warning) =>
      warning.includes("placement-verification-rejected")
      && warning.includes("source state differs")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createFixture(root, options = {}) {
  const requiredChecks = options.requiredChecks ?? [selectedCheck];
  const stageResponsibilities = options.stageResponsibilities ?? [];
  const requiredEvidencePaths = options.requiredEvidencePaths ?? [];
  const trustedPlacementVerificationKeys = options.trustedPlacementVerificationKeys ?? [];
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, "rekon", "contracts"), { recursive: true });
  if (requiredEvidencePaths.length > 0) {
    await mkdir(join(root, "test"), { recursive: true });
  }
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
  if (trustedPlacementVerificationKeys.length > 0) {
    await writeFile(
      join(root, "rekon.config.json"),
      `${JSON.stringify({
        placementVerification: {
          trustedKeys: trustedPlacementVerificationKeys,
        },
      }, null, 2)}\n`,
      "utf8",
    );
  }
  for (const path of requiredEvidencePaths) {
    await writeFile(
      join(root, path),
      "import assert from 'node:assert/strict';\nassert.equal('stable', 'stable');\n",
      "utf8",
    );
  }

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
        {
          id: "bootstrap",
          systemId: "proof-system",
          ...(stageResponsibilities.length > 0 ? { responsibilities: stageResponsibilities } : {}),
          paths: ["src/index.ts"],
        },
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
          ...(requiredEvidencePaths.length > 0 ? { requiredEvidencePaths } : {}),
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
      {
        id: "bootstrap",
        systemId: "proof-system",
        ...(stageResponsibilities.length > 0 ? { responsibilities: stageResponsibilities } : {}),
        paths: ["src/index.ts"],
        evidenceRefs: [],
      },
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
        ...(requiredEvidencePaths.length > 0 ? { requiredEvidencePaths } : {}),
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
      ...requiredEvidencePaths.map((path) => ({
        path,
        ownerSystem: "proof-system",
        basis: "declared",
        confidence: 1,
        evidence: [systemRef],
      })),
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

  const baselinePaths = ["package.json", "src", "rekon/contracts"];
  if (requiredEvidencePaths.length > 0) baselinePaths.push("test");
  if (trustedPlacementVerificationKeys.length > 0) baselinePaths.push("rekon.config.json");
  for (const args of [
    ["init", "-q"],
    ["add", ...baselinePaths],
    ["-c", "user.email=rekon@example.test", "-c", "user.name=Rekon Test", "commit", "-qm", "fixture baseline"],
  ]) {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  }
  await writeFile(join(root, "src/index.ts"), "export const bootstrap = 'preserved';\n", "utf8");
  return { systemRef, flowRef };
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

function runGit(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
