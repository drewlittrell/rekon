import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildGroundedContextOutcomeEvaluation,
  createMemoryCurationReport,
  deriveMemoryCuration,
  default as memoryCapability,
  readGroundedMemoryForTask,
  selectGroundedMemoryForTask,
} from "../dist/index.js";
import {
  createContextOutcomeEvaluationReport,
  createContextTaskIdentity,
  createContextUsageEvent,
  createOutcomeEvent,
} from "@rekon/kernel-repo-model";
import { createLocalArtifactStore, createRuntime } from "@rekon/runtime";

test("grounded curation counts shared proof once and lets counterevidence dominate", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-grounded-memory-"));
  try {
    const store = createLocalArtifactStore(root);
    await store.init();
    const memoryEntryId = "memory-entry-1";
    const task = createContextTaskIdentity("change bootstrap", ["src/index.ts"]);
    const reportRef = ref("TaskContextReport", "context-1");
    const usage = createContextUsageEvent({
      header: header("ContextUsageEvent", "usage-1", root, [reportRef]),
      task,
      contextReportRef: reportRef,
      delivery: {
        channel: "mcp",
        deliveredAt: "2026-01-01T00:00:00.000Z",
        profile: "compact",
        projectionDigest: "projection-1",
        itemIds: [`memory:${memoryEntryId}`],
        sourceSpanKeys: [],
        constraintDigests: [],
        checkDigests: [],
        truncated: false,
      },
      claims: [],
    });
    const usageRef = await store.write(usage, { category: "actions" });

    const firstProofRoot = await store.write(
      { header: header("VerificationRun", "run-1", root, []) },
      { category: "actions" },
    );
    const firstVerification = await store.write(
      { header: header("VerificationResult", "result-1", root, [firstProofRoot]) },
      { category: "actions" },
    );
    await store.write(outcome({
      id: "verified-1",
      root,
      task,
      usageRef,
      status: "verified",
      verificationRefs: [firstVerification],
    }), { category: "actions" });
    await store.write(outcome({
      id: "accepted-same-proof",
      root,
      task,
      usageRef,
      status: "accepted",
      verificationRefs: [firstVerification],
    }), { category: "actions" });

    let evaluation = await buildGroundedContextOutcomeEvaluation({ artifacts: store, repoId: root });
    let item = evaluation.items.find((candidate) => candidate.subject.id === memoryEntryId);
    assert.equal(item.status, "suggestive");
    assert.equal(item.supportingRootKeys.length, 1);
    assert.equal(deriveMemoryCuration([memoryEntry(memoryEntryId, root)], [], evaluation)[0].recommendation, "keep");

    const secondProofRoot = await store.write(
      { header: header("RuntimeGraphObservationReport", "runtime-1", root, []) },
      { category: "actions" },
    );
    await store.write(outcome({
      id: "accepted-independent-runtime",
      root,
      task,
      usageRef,
      status: "accepted",
      runtimeObservationRefs: [secondProofRoot],
    }), { category: "actions" });

    evaluation = await buildGroundedContextOutcomeEvaluation({ artifacts: store, repoId: root });
    item = evaluation.items.find((candidate) => candidate.subject.id === memoryEntryId);
    assert.equal(item.status, "corroborated");
    assert.equal(item.supportingRootKeys.length, 2);
    assert.equal(deriveMemoryCuration([memoryEntry(memoryEntryId, root)], [], evaluation)[0].recommendation, "reinforce");

    const counterRoot = await store.write(
      { header: header("VerificationRun", "run-refuted", root, []) },
      { category: "actions" },
    );
    const failedVerification = await store.write(
      { header: header("VerificationResult", "result-refuted", root, [counterRoot]) },
      { category: "actions" },
    );
    await store.write(outcome({
      id: "blocked-1",
      root,
      task,
      usageRef,
      status: "blocked",
      verificationRefs: [failedVerification],
    }), { category: "actions" });

    evaluation = await buildGroundedContextOutcomeEvaluation({ artifacts: store, repoId: root });
    item = evaluation.items.find((candidate) => candidate.subject.id === memoryEntryId);
    assert.equal(item.status, "refuted");
    assert.equal(item.refutingRootKeys.length, 1);
    assert.equal(deriveMemoryCuration([memoryEntry(memoryEntryId, root)], [], evaluation)[0].recommendation, "deprecate");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("grounded curation collapses partially overlapping proof lineage across outcomes", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-grounded-overlap-"));
  try {
    const store = createLocalArtifactStore(root);
    await store.init();
    const task = createContextTaskIdentity("change bootstrap", ["src/index.ts"]);
    const reportRef = ref("TaskContextReport", "context-overlap");
    const usageRef = await store.write(createContextUsageEvent({
      header: header("ContextUsageEvent", "usage-overlap", root, [reportRef]),
      task,
      contextReportRef: reportRef,
      delivery: {
        channel: "cli",
        deliveredAt: "2026-01-01T00:00:00.000Z",
        profile: "compact",
        projectionDigest: "projection-overlap",
        itemIds: ["memory:memory-overlap"],
        sourceSpanKeys: [],
        constraintDigests: [],
        checkDigests: [],
        truncated: false,
      },
      claims: [],
    }), { category: "actions" });
    const sharedRoot = await store.write(
      { header: header("VerificationRun", "run-shared", root, []) },
      { category: "actions" },
    );
    const leftRoot = await store.write(
      { header: header("VerificationRun", "run-left", root, []) },
      { category: "actions" },
    );
    const rightRoot = await store.write(
      { header: header("VerificationRun", "run-right", root, []) },
      { category: "actions" },
    );
    const leftResult = await store.write(
      { header: header("VerificationResult", "result-left", root, [sharedRoot, leftRoot]) },
      { category: "actions" },
    );
    const rightResult = await store.write(
      { header: header("VerificationResult", "result-right", root, [sharedRoot, rightRoot]) },
      { category: "actions" },
    );
    await store.write(outcome({
      id: "outcome-left",
      root,
      task,
      usageRef,
      status: "verified",
      verificationRefs: [leftResult],
    }), { category: "actions" });
    await store.write(outcome({
      id: "outcome-right",
      root,
      task,
      usageRef,
      status: "verified",
      verificationRefs: [rightResult],
    }), { category: "actions" });

    const evaluation = await buildGroundedContextOutcomeEvaluation({ artifacts: store, repoId: root });
    const item = evaluation.items.find((candidate) => candidate.subject.id === "memory-overlap");
    assert.equal(item.status, "suggestive");
    assert.equal(item.supportingRootKeys.length, 1);
    assert.match(item.supportingRootKeys[0], /^lineage-group:/u);
    assert.deepEqual(evaluation.lineage.sharedRootKeys, ["VerificationRun:run-shared:0.1.0"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("self-reported outcomes cannot reinforce delivered memory", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-self-reported-memory-"));
  try {
    const store = createLocalArtifactStore(root);
    await store.init();
    const task = createContextTaskIdentity("change bootstrap", ["src/index.ts"]);
    const reportRef = ref("TaskContextReport", "context-1");
    const usageRef = await store.write(createContextUsageEvent({
      header: header("ContextUsageEvent", "usage-self", root, [reportRef]),
      task,
      contextReportRef: reportRef,
      delivery: {
        channel: "cli",
        deliveredAt: "2026-01-01T00:00:00.000Z",
        profile: "compact",
        projectionDigest: "projection-self",
        itemIds: ["memory:memory-entry-1"],
        sourceSpanKeys: [],
        constraintDigests: [],
        checkDigests: [],
        truncated: false,
      },
      claims: [],
    }), { category: "actions" });
    const event = createOutcomeEvent({
      header: header("OutcomeEvent", "self-report-1", root, [usageRef]),
      task,
      phase: "external-follow-up",
      status: "accepted",
      grounding: "self-report",
      observationKey: "self-report-1",
      contextUsageRefs: [usageRef],
      verificationRefs: [],
      runtimeObservationRefs: [],
      externalEvidenceRefs: [],
      summary: {
        requiredObligations: 0,
        satisfied: 0,
        blocked: 0,
        unresolved: 0,
        contractViolations: 0,
        reworkAttempt: 0,
      },
      notes: ["claimed helpful"],
    });
    await store.write(event, { category: "actions" });

    const evaluation = await buildGroundedContextOutcomeEvaluation({ artifacts: store, repoId: root });
    assert.equal(evaluation.items[0].status, "associated");
    assert.deepEqual(evaluation.items[0].supportingRootKeys, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("grounded evaluation marks a bounded event window partial", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-grounded-window-"));
  try {
    const store = createLocalArtifactStore(root);
    await store.init();
    const task = createContextTaskIdentity("change bootstrap", ["src/index.ts"]);
    for (const id of ["usage-old", "usage-new"]) {
      const reportRef = ref("TaskContextReport", `context-${id}`);
      await store.write(createContextUsageEvent({
        header: header("ContextUsageEvent", id, root, [reportRef]),
        task,
        contextReportRef: reportRef,
        delivery: {
          channel: "cli",
          deliveredAt: "2026-01-01T00:00:00.000Z",
          profile: "compact",
          projectionDigest: id,
          itemIds: [`memory:${id}`],
          sourceSpanKeys: [],
          constraintDigests: [],
          checkDigests: [],
          truncated: false,
        },
        claims: [],
      }), { category: "actions" });
      if (id === "usage-old") {
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 5));
      }
    }

    const evaluation = await buildGroundedContextOutcomeEvaluation({
      artifacts: store,
      repoId: root,
      maxEvents: 1,
    });
    assert.equal(evaluation.lineage.complete, false);
    assert.ok(evaluation.lineage.issueCodes.includes("event-window-truncated"));
    assert.equal(evaluation.header.freshness.status, "partial");
    assert.equal(evaluation.items.length, 1);
    assert.equal(evaluation.items[0].subject.id, "usage-new");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a later incomplete lineage downgrades earlier supporting associations", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-grounded-partial-lineage-"));
  try {
    const store = createLocalArtifactStore(root);
    await store.init();
    const task = createContextTaskIdentity("change bootstrap", ["src/index.ts"]);

    const supportedReportRef = ref("TaskContextReport", "context-supported");
    const supportedUsageRef = await store.write(createContextUsageEvent({
      header: header("ContextUsageEvent", "usage-a-supported", root, [supportedReportRef]),
      task,
      contextReportRef: supportedReportRef,
      delivery: {
        channel: "cli",
        deliveredAt: "2026-01-01T00:00:00.000Z",
        profile: "compact",
        projectionDigest: "projection-supported",
        itemIds: ["memory:memory-supported"],
        sourceSpanKeys: [],
        constraintDigests: [],
        checkDigests: [],
        truncated: false,
      },
      claims: [],
    }), { category: "actions" });
    const proofRoot = await store.write(
      { header: header("VerificationRun", "run-supported", root, []) },
      { category: "actions" },
    );
    const verificationRef = await store.write(
      { header: header("VerificationResult", "result-supported", root, [proofRoot]) },
      { category: "actions" },
    );
    await store.write(outcome({
      id: "outcome-supported",
      root,
      task,
      usageRef: supportedUsageRef,
      status: "verified",
      verificationRefs: [verificationRef],
    }), { category: "actions" });

    const incompleteReportRef = ref("TaskContextReport", "context-incomplete");
    const incompleteUsageRef = await store.write(createContextUsageEvent({
      header: header("ContextUsageEvent", "usage-z-incomplete", root, [incompleteReportRef]),
      task,
      contextReportRef: incompleteReportRef,
      delivery: {
        channel: "cli",
        deliveredAt: "2026-01-01T00:00:01.000Z",
        profile: "compact",
        projectionDigest: "projection-incomplete",
        itemIds: ["memory:memory-incomplete"],
        sourceSpanKeys: [],
        constraintDigests: [],
        checkDigests: [],
        truncated: false,
      },
      claims: [],
    }), { category: "actions" });
    await store.write(outcome({
      id: "outcome-incomplete",
      root,
      task,
      usageRef: incompleteUsageRef,
      status: "accepted",
      verificationRefs: [ref("VerificationResult", "result-missing")],
    }), { category: "actions" });

    const evaluation = await buildGroundedContextOutcomeEvaluation({ artifacts: store, repoId: root });
    const supported = evaluation.items.find((item) => item.subject.id === "memory-supported");
    assert.equal(evaluation.lineage.complete, false);
    assert.ok(evaluation.lineage.issueCodes.includes("artifact-read-failed"));
    assert.equal(supported.status, "associated");
    assert.ok(supported.reasons.includes("artifact-lineage-incomplete"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("memory selection rejects entries deprecated by grounded curation", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-grounded-selection-"));
  try {
    const runtime = await createRuntime({ repoRoot: root, capabilities: [memoryCapability] });
    const [entryRef] = await runtime.runLearn({
      input: {
        mode: "add",
        instruction: "Preserve the bootstrap contract.",
        path: "src",
      },
    });
    const entry = await runtime.artifacts.read(entryRef);
    const evaluation = createContextOutcomeEvaluationReport({
      header: header("ContextOutcomeEvaluationReport", "evaluation-refuted", root, []),
      policyVersion: "grounded-context-outcomes.v1",
      items: [{
        subject: { kind: "memory-entry", id: entryRef.id },
        status: "refuted",
        contextUsageRefs: [],
        outcomeRefs: [],
        supportingRootKeys: [],
        refutingRootKeys: ["VerificationRun:run-refuted:0.1.0"],
        reasons: ["counterevidence-dominates"],
      }],
      lineage: { complete: true, sharedRootKeys: [], issueCodes: [] },
    });
    const evaluationRef = await runtime.artifacts.write(evaluation, { category: "publications" });
    const curation = createMemoryCurationReport({
      repoId: root,
      entries: [entry],
      events: [],
      evaluation,
      evaluationRef,
      inputRefs: [entryRef, evaluationRef],
    });
    await runtime.artifacts.write(curation, { category: "publications" });

    const [selectionRef] = await runtime.runLearn({
      input: { mode: "select", path: "src/index.ts", goal: "change bootstrap" },
    });
    const selection = await runtime.artifacts.read(selectionRef);
    assert.deepEqual(selection.selected, []);
    assert.deepEqual(selection.rejected, [{
      id: entryRef.id,
      reasons: ["grounded-curation-deprecate"],
    }]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("task context repeats only scoped memory with grounded support", () => {
  const repoId = "repo";
  const entries = [
    memoryEntry("memory-corroborated", repoId),
    memoryEntry("memory-suggestive", repoId),
    memoryEntry("memory-refuted", repoId),
    {
      ...memoryEntry("memory-wrong-goal", repoId),
      scope: { paths: ["src"], goal: "replace database schema" },
    },
  ];
  const evaluation = createContextOutcomeEvaluationReport({
    header: header("ContextOutcomeEvaluationReport", "evaluation-1", repoId, []),
    policyVersion: "grounded-context-outcomes.v1",
    items: [
      evaluationItem("memory-corroborated", "corroborated", ["root-1", "root-2"], []),
      evaluationItem("memory-suggestive", "suggestive", ["root-1"], []),
      evaluationItem("memory-refuted", "refuted", [], ["root-refuted"]),
      evaluationItem("memory-wrong-goal", "corroborated", ["root-1", "root-2"], []),
    ],
    lineage: { complete: true, sharedRootKeys: [], issueCodes: [] },
  });
  const curationRef = ref("MemoryCurationReport", "curation-1");
  const evaluationRef = ref("ContextOutcomeEvaluationReport", "evaluation-1");
  const curation = createMemoryCurationReport({
    repoId,
    entries,
    events: [],
    evaluation,
    evaluationRef,
    inputRefs: [evaluationRef],
  });
  const selection = selectGroundedMemoryForTask({
    entries: entries.map((entry) => ({
      ref: ref("OperatorFeedbackEntry", entry.header.artifactId),
      entry,
    })),
    curation,
    curationRef,
    paths: ["src/index.ts"],
    goal: "modify bootstrap",
    limit: 5,
  });

  assert.deepEqual(selection.items.map((item) => item.id), [
    "memory-corroborated",
    "memory-suggestive",
  ]);
  assert.deepEqual(selection.items.map((item) => item.groundedStatus), [
    "corroborated",
    "suggestive",
  ]);
  assert.ok(selection.inputRefs.some((candidate) => candidate.id === "curation-1"));
  assert.ok(selection.inputRefs.some((candidate) => candidate.id === "evaluation-1"));
});

test("task context admits one matching unobserved memory entry once", () => {
  const repoId = "repo";
  const first = memoryEntry("memory-first", repoId);
  const second = memoryEntry("memory-second", repoId);
  const records = [first, second].map((entry) => ({
    ref: ref("OperatorFeedbackEntry", entry.header.artifactId),
    entry,
  }));

  const initial = selectGroundedMemoryForTask({
    entries: records,
    paths: ["src/index.ts"],
    goal: "modify bootstrap",
    limit: 5,
  });

  assert.equal(initial.items.length, 1);
  assert.equal(initial.items[0].groundedStatus, "unobserved");
  assert.match(initial.items[0].reason, /selected once/iu);

  const repeated = selectGroundedMemoryForTask({
    entries: records,
    paths: ["src/index.ts"],
    goal: "modify bootstrap",
    limit: 5,
    deliveredMemoryIds: [initial.items[0].id],
  });

  assert.equal(repeated.items.length, 1);
  assert.notEqual(repeated.items[0].id, initial.items[0].id);
  const exhausted = selectGroundedMemoryForTask({
    entries: records,
    paths: ["src/index.ts"],
    goal: "modify bootstrap",
    limit: 5,
    deliveredMemoryIds: records.map((record) => record.entry.header.artifactId),
  });
  assert.deepEqual(exhausted.items, []);
});

test("task context uses the newest curation by index write time", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-grounded-latest-curation-"));
  try {
    const store = createLocalArtifactStore(root);
    await store.init();
    const entry = memoryEntry("memory-latest-curation", root);
    const entryRef = await store.write(entry, { category: "actions" });

    const oldEvaluation = createContextOutcomeEvaluationReport({
      header: header("ContextOutcomeEvaluationReport", "evaluation-old", root, []),
      policyVersion: "grounded-context-outcomes.v1",
      items: [evaluationItem(entryRef.id, "refuted", [], ["root-refuted"])],
      lineage: { complete: true, sharedRootKeys: [], issueCodes: [] },
    });
    const oldEvaluationRef = await store.write(oldEvaluation, { category: "publications" });
    const oldCuration = createMemoryCurationReport({
      repoId: root,
      entries: [entry],
      events: [],
      evaluation: oldEvaluation,
      evaluationRef: oldEvaluationRef,
      inputRefs: [entryRef, oldEvaluationRef],
    });
    oldCuration.header.artifactId = "memory-curation-z-old";
    await store.write(oldCuration, { category: "publications" });
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5));

    const newEvaluation = createContextOutcomeEvaluationReport({
      header: header("ContextOutcomeEvaluationReport", "evaluation-new", root, []),
      policyVersion: "grounded-context-outcomes.v1",
      items: [evaluationItem(entryRef.id, "suggestive", ["root-supported"], [])],
      lineage: { complete: true, sharedRootKeys: [], issueCodes: [] },
    });
    const newEvaluationRef = await store.write(newEvaluation, { category: "publications" });
    const newCuration = createMemoryCurationReport({
      repoId: root,
      entries: [entry],
      events: [],
      evaluation: newEvaluation,
      evaluationRef: newEvaluationRef,
      inputRefs: [entryRef, newEvaluationRef],
    });
    newCuration.header.artifactId = "memory-curation-a-new";
    await store.write(newCuration, { category: "publications" });

    const selection = await readGroundedMemoryForTask(store, {
      paths: ["src/index.ts"],
      goal: "modify bootstrap",
    });
    assert.deepEqual(selection.items.map((item) => item.id), [entryRef.id]);
    assert.equal(selection.items[0].groundedStatus, "suggestive");
    assert.ok(selection.inputRefs.some((candidate) => candidate.id === "memory-curation-a-new"));
    assert.ok(!selection.inputRefs.some((candidate) => candidate.id === "memory-curation-z-old"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function outcome(input) {
  return createOutcomeEvent({
    header: header("OutcomeEvent", input.id, input.root, [
      input.usageRef,
      ...(input.verificationRefs ?? []),
      ...(input.runtimeObservationRefs ?? []),
    ]),
    task: input.task,
    phase: input.status === "accepted" ? "proof-gated-refresh" : "validation-attempt",
    status: input.status,
    grounding: input.runtimeObservationRefs?.length ? "runtime-observation" : "repository-proof",
    observationKey: input.id,
    contextUsageRefs: [input.usageRef],
    verificationRefs: input.verificationRefs ?? [],
    runtimeObservationRefs: input.runtimeObservationRefs ?? [],
    externalEvidenceRefs: [],
    summary: {
      requiredObligations: 1,
      satisfied: input.status === "blocked" ? 0 : 1,
      blocked: input.status === "blocked" ? 1 : 0,
      unresolved: 0,
      contractViolations: input.status === "blocked" ? 1 : 0,
      reworkAttempt: 0,
    },
    notes: [],
  });
}

function memoryEntry(id, repoId) {
  return {
    header: header("OperatorFeedbackEntry", id, repoId, []),
    instruction: "Preserve the bootstrap contract.",
    scope: { paths: ["src"] },
    confidence: 1,
  };
}

function evaluationItem(id, status, supportingRootKeys, refutingRootKeys) {
  return {
    subject: { kind: "memory-entry", id },
    status,
    contextUsageRefs: [],
    outcomeRefs: [],
    supportingRootKeys,
    refutingRootKeys,
    reasons: [],
  };
}

function header(type, id, repoId, inputRefs) {
  return {
    artifactType: type,
    artifactId: id,
    schemaVersion: "0.1.0",
    generatedAt: "2026-01-01T00:00:00.000Z",
    subject: { repoId },
    producer: { id: "test", version: "1.0.0" },
    inputRefs,
    freshness: { status: "fresh" },
    provenance: { confidence: 1 },
  };
}

function ref(type, id) {
  return { type, id, schemaVersion: "0.1.0" };
}
