import { createHash } from "node:crypto";

import {
  compileTaskContext,
  estimateModelContextDeliveryTokens,
  projectModelContext,
  projectModelContextDelivery,
} from "@rekon/capability-model";

const DEFAULT_GENERATED_AT = "2026-07-17T00:00:00.000Z";

export function evaluateModelInterfaceFixture(fixture, options = {}) {
  const graph = fixture.graph ?? { nodes: [], claims: [], capabilities: [] };
  const cases = fixture.cases.map((entry) => evaluateModelInterfaceCase(entry, graph, options));
  const passed = cases.every((entry) => entry.passed);
  return {
    passed,
    summary: {
      schemaVersion: fixture.schemaVersion,
      modelCalls: 0,
      cases: cases.length,
      passed: cases.filter((entry) => entry.passed).length,
      failed: cases.filter((entry) => !entry.passed).length,
      taskShapes: [...new Set(cases.map((entry) => entry.shape))].sort(),
      averageEvidenceRecall: average(cases.map((entry) => entry.metrics.evidenceRecall)),
      averagePathRecall: average(cases.map((entry) => entry.metrics.pathRecall)),
      averagePathPrecision: average(cases.map((entry) => entry.metrics.pathPrecision)),
      averageIrrelevantPathRate: average(cases.map((entry) => entry.metrics.irrelevantPathRate)),
      averageCommandRecall: average(cases.map((entry) => entry.metrics.commandRecall)),
      averageArtifactCheckRecall: average(cases.map((entry) => entry.metrics.artifactCheckRecall)),
      averageConstraintRecall: average(cases.map((entry) => entry.metrics.constraintRecall)),
      averageWarningRecall: average(cases.map((entry) => entry.metrics.warningRecall)),
      averageProjectedTokens: average(cases.map((entry) => entry.metrics.projectedTokens)),
      maxEstimatedTokens: Math.max(...cases.map((entry) => entry.metrics.estimatedTokens), 0),
      maxProjectedTokens: Math.max(...cases.map((entry) => entry.metrics.projectedTokens), 0),
    },
    cases,
  };
}

export function evaluateModelInterfaceCase(entry, graph, options = {}) {
  const { packet } = compileTaskContext({
    taskText: entry.task,
    paths: entry.paths,
    lexicalContextPaths: entry.lexicalContextPaths,
    profile: entry.profile,
    graph,
    warnings: entry.warnings,
    generatedAt: options.generatedAt ?? DEFAULT_GENERATED_AT,
    repoId: options.repoId ?? "model-interface-eval",
  });
  const projection = projectModelContext(packet);
  const delivery = projectModelContextDelivery(projection);
  const evidence = new Set(packet.evidence);
  const selectedPaths = unique([
    ...delivery.readFirst,
    ...(delivery.boundaryPaths ?? []),
    ...(delivery.supportingContext ?? [])
      .filter((item) => item.kind === "file")
      .map((item) => item.ref),
  ]);
  const commands = new Set(delivery.checks.filter((check) => !check.startsWith("artifact: ")));
  const artifacts = new Set(delivery.checks
    .filter((check) => check.startsWith("artifact: "))
    .map((check) => check.slice("artifact: ".length)));
  const constraints = delivery.constraints.map((zone) => zone.toLowerCase());
  const warnings = (delivery.warnings ?? []).map((warning) => warning.toLowerCase());
  const expectedEvidence = entry.expect.evidenceRefs ?? [];
  const expectedPaths = entry.expect.contextPaths ?? [];
  const allowedPaths = entry.expect.allowedContextPaths ?? expectedPaths;
  const expectedCommands = entry.expect.commands ?? [];
  const expectedArtifacts = entry.expect.verificationArtifacts ?? [];
  const expectedConstraints = entry.expect.constraintFragments ?? [];
  const expectedWarnings = entry.expect.warningFragments ?? [];
  const evidenceRecall = recall(expectedEvidence, (value) => evidence.has(value));
  const pathRecall = recall(expectedPaths, (value) => selectedPaths.includes(value));
  const pathPrecision = precision(selectedPaths, (value) => allowedPaths.includes(value));
  const irrelevantPaths = selectedPaths.filter((path) => !allowedPaths.includes(path));
  const irrelevantPathRate = selectedPaths.length === 0 ? 0 : irrelevantPaths.length / selectedPaths.length;
  const commandRecall = recall(expectedCommands, (value) => commands.has(value));
  const artifactCheckRecall = recall(expectedArtifacts, (value) => artifacts.has(value));
  const constraintRecall = recall(
    expectedConstraints,
    (value) => constraints.some((reason) => reason.includes(value.toLowerCase())),
  );
  const warningRecall = recall(
    expectedWarnings,
    (value) => warnings.some((warning) => warning.includes(value.toLowerCase())),
  );
  const trustViolations = [
    ...packet.coreContext.filter((item) => item.trust !== "operator" && item.trust !== "deterministic"),
    ...packet.supportingContext.filter((item) => item.trust !== "inference" && item.trust !== "memory"),
  ].length;
  const minPathPrecision = entry.expect.minPathPrecision ?? 1;
  const maxIrrelevantPaths = entry.expect.maxIrrelevantPaths ?? 0;
  const deliveryTokens = estimateModelContextDeliveryTokens(delivery);
  const maxProjectedTokens = entry.expect.maxProjectedTokens ?? packet.budget.maxTokens;
  const checks = {
    evidence: evidenceRecall === 1,
    contextPaths: pathRecall === 1,
    pathPrecision: pathPrecision >= minPathPrecision,
    irrelevantPaths: irrelevantPaths.length <= maxIrrelevantPaths,
    commands: commandRecall === 1,
    verificationArtifacts: artifactCheckRecall === 1,
    constraints: constraintRecall === 1,
    warnings: warningRecall === 1,
    tokenBudget: packet.estimatedTokens <= packet.budget.maxTokens,
    projectedTokenBudget: deliveryTokens <= maxProjectedTokens,
    coreItemLimit: packet.coreContext.length <= entry.expect.maxCoreItems,
    traceCoverage: packet.contextTrace.length >= packet.coreContext.length,
    trustBoundary: trustViolations === 0,
  };
  const selectedRefs = unique([
    ...delivery.readFirst,
    ...(delivery.boundaryPaths ?? []),
    ...(delivery.supportingContext ?? []).map((item) => item.ref),
  ]);

  return {
    id: entry.id,
    shape: entry.shape ?? entry.id,
    passed: Object.values(checks).every(Boolean),
    checks,
    selectionDigest: digestSelection(delivery),
    selection: {
      selectedRefs,
      selectedPaths,
      irrelevantPaths,
    },
    metrics: {
      evidenceRecall: round(evidenceRecall),
      pathRecall: round(pathRecall),
      pathPrecision: round(pathPrecision),
      irrelevantPathRate: round(irrelevantPathRate),
      commandRecall: round(commandRecall),
      artifactCheckRecall: round(artifactCheckRecall),
      constraintRecall: round(constraintRecall),
      warningRecall: round(warningRecall),
      estimatedTokens: packet.estimatedTokens,
      projectedTokens: deliveryTokens,
      tokenBudget: packet.budget.maxTokens,
      coreItems: packet.coreContext.length,
      supportingItems: packet.supportingContext.length,
      traceEntries: packet.contextTrace.length,
      trustViolations,
    },
  };
}

function digestSelection(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function recall(expected, predicate) {
  if (expected.length === 0) return 1;
  return expected.filter(predicate).length / expected.length;
}

function precision(actual, predicate) {
  if (actual.length === 0) return 1;
  return actual.filter(predicate).length / actual.length;
}

function unique(values) {
  return [...new Set(values)];
}

function average(values) {
  if (values.length === 0) return 0;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function round(value, places = 4) {
  const scale = 10 ** places;
  return Math.round((value + Number.EPSILON) * scale) / scale;
}
