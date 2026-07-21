import { createHash } from "node:crypto";

import {
  buildRepositoryContractProjection,
  buildTaskPact,
  compileTaskContext,
  estimateModelContextDeliveryTokens,
  projectModelContext,
  projectModelContextDelivery,
  selectTaskContractGuidance,
} from "@rekon/capability-model";

const DEFAULT_GENERATED_AT = "2026-07-20T00:00:00.000Z";

export function evaluateRepositoryLawContextFixture(fixture, options = {}) {
  const generatedAt = options.generatedAt ?? DEFAULT_GENERATED_AT;
  const sources = (fixture.repositoryContractSources ?? []).map((source) => ({
    ...source,
    digest: source.digest ?? digest(source.document),
  }));
  const projection = buildRepositoryContractProjection({
    repoId: options.repoId ?? "repository-law-context-eval",
    generatedAt,
    sources,
  });
  const registryRef = artifactRef(projection.registry.header);
  const cases = fixture.cases.map((entry) => evaluateCase({
    entry,
    graph: fixture.graph,
    projection,
    registryRef,
    generatedAt,
    repoId: options.repoId ?? "repository-law-context-eval",
  }));

  return {
    passed: cases.every((entry) => entry.passed),
    summary: {
      schemaVersion: fixture.schemaVersion,
      modelCalls: 0,
      cases: cases.length,
      passed: cases.filter((entry) => entry.passed).length,
      failed: cases.filter((entry) => !entry.passed).length,
      averageBaselinePathRecall: average(cases.map((entry) => entry.metrics.baselinePathRecall)),
      averageRekonPathRecall: average(cases.map((entry) => entry.metrics.rekonPathRecall)),
      averagePathRecallLift: average(cases.map((entry) => entry.metrics.pathRecallLift)),
      averageRekonPathPrecision: average(cases.map((entry) => entry.metrics.rekonPathPrecision)),
      averageConstraintRecallLift: average(cases.map((entry) => entry.metrics.constraintRecallLift)),
      maxProjectedTokens: Math.max(...cases.map((entry) => entry.metrics.projectedTokens), 0),
    },
    cases,
  };
}

function evaluateCase({ entry, graph, projection, registryRef, generatedAt, repoId }) {
  const pact = buildTaskPact({
    repoId,
    taskText: entry.task,
    paths: entry.paths,
    generatedAt,
    registry: projection.registry,
    registryRef,
    systemContracts: projection.systemContracts,
    flowContracts: projection.flowContracts,
  });
  const guidance = selectTaskContractGuidance({
    paths: entry.paths,
    graph,
    taskPact: pact,
  });
  const baseline = compileDelivery({ entry, graph, generatedAt });
  const rekon = compileDelivery({
    entry,
    graph,
    generatedAt,
    inputRefs: pact.header.inputRefs,
    declaredContextPaths: guidance.requiredContextPaths,
    declaredConstraints: guidance.constraints,
    declaredVerificationHints: guidance.verificationHints,
    warnings: guidance.warnings,
  });
  const expectedPaths = entry.expect.contextPaths ?? [];
  const allowedPaths = entry.expect.allowedContextPaths ?? expectedPaths;
  const expectedConstraints = entry.expect.constraintFragments ?? [];
  const forbiddenConstraints = entry.expect.forbiddenConstraintFragments ?? [];
  const expectedCommands = entry.expect.commands ?? [];
  const baselinePaths = selectedPaths(baseline);
  const rekonPaths = selectedPaths(rekon);
  const baselinePathRecall = recall(expectedPaths, (path) => baselinePaths.includes(path));
  const rekonPathRecall = recall(expectedPaths, (path) => rekonPaths.includes(path));
  const rekonPathPrecision = precision(rekonPaths, (path) => allowedPaths.includes(path));
  const baselineConstraintRecall = fragmentRecall(expectedConstraints, baseline.constraints);
  const rekonConstraintRecall = fragmentRecall(expectedConstraints, rekon.constraints);
  const commandRecall = recall(expectedCommands, (command) => rekon.checks.includes(command));
  const warningRecall = fragmentRecall(entry.expect.warningFragments ?? [], rekon.warnings ?? []);
  const pathRecallLift = round(rekonPathRecall - baselinePathRecall);
  const constraintRecallLift = round(rekonConstraintRecall - baselineConstraintRecall);
  const projectedTokens = estimateModelContextDeliveryTokens(rekon);
  const checks = {
    systemContracts: sameMembers(guidance.matchedSystemContractIds, entry.expect.systemContractIds ?? []),
    flowContracts: sameMembers(guidance.matchedFlowContractIds, entry.expect.flowContractIds ?? []),
    contextPaths: rekonPathRecall === 1,
    pathPrecision: rekonPathPrecision >= (entry.expect.minPathPrecision ?? 1),
    pathRecallLift: pathRecallLift >= (entry.expect.minPathRecallLift ?? 0),
    constraints: rekonConstraintRecall === 1,
    constraintRecallLift: constraintRecallLift >= (entry.expect.minConstraintRecallLift ?? 0),
    forbiddenConstraints: forbiddenConstraints.every((fragment) =>
      rekon.constraints.every((constraint) => !constraint.toLowerCase().includes(fragment.toLowerCase()))),
    commands: commandRecall === 1,
    warnings: warningRecall === 1,
    tokenBudget: projectedTokens <= (entry.expect.maxProjectedTokens ?? 700),
  };

  return {
    id: entry.id,
    shape: entry.shape,
    passed: Object.values(checks).every(Boolean),
    selectionDigest: digest({
      contracts: {
        systems: guidance.matchedSystemContractIds,
        flows: guidance.matchedFlowContractIds,
      },
      delivery: rekon,
    }),
    checks,
    contracts: {
      systems: guidance.matchedSystemContractIds,
      flows: guidance.matchedFlowContractIds,
      impactObligations: guidance.impactObligations.map((obligation) => obligation.id),
    },
    selection: {
      baselinePaths,
      rekonPaths,
      addedPaths: rekonPaths.filter((path) => !baselinePaths.includes(path)),
      irrelevantPaths: rekonPaths.filter((path) => !allowedPaths.includes(path)),
    },
    metrics: {
      baselinePathRecall: round(baselinePathRecall),
      rekonPathRecall: round(rekonPathRecall),
      pathRecallLift,
      rekonPathPrecision: round(rekonPathPrecision),
      baselineConstraintRecall: round(baselineConstraintRecall),
      rekonConstraintRecall: round(rekonConstraintRecall),
      constraintRecallLift,
      commandRecall: round(commandRecall),
      warningRecall: round(warningRecall),
      projectedTokens,
    },
  };
}

function compileDelivery(input) {
  const { packet } = compileTaskContext({
    taskText: input.entry.task,
    paths: input.entry.paths,
    profile: input.entry.profile ?? "compact",
    graph: input.graph,
    generatedAt: input.generatedAt,
    repoId: "repository-law-context-eval",
    ...(input.inputRefs ? { inputRefs: input.inputRefs } : {}),
    ...(input.declaredContextPaths ? { declaredContextPaths: input.declaredContextPaths } : {}),
    ...(input.declaredConstraints ? { declaredConstraints: input.declaredConstraints } : {}),
    ...(input.declaredVerificationHints ? { declaredVerificationHints: input.declaredVerificationHints } : {}),
    ...(input.warnings ? { warnings: input.warnings } : {}),
  });
  return projectModelContextDelivery(projectModelContext(packet));
}

function selectedPaths(delivery) {
  return unique([
    ...delivery.readFirst,
    ...(delivery.boundaryPaths ?? []),
    ...(delivery.supportingContext ?? [])
      .filter((entry) => entry.kind === "file")
      .map((entry) => entry.ref),
  ]);
}

function artifactRef(header) {
  return { type: header.artifactType, id: header.artifactId, schemaVersion: header.schemaVersion };
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function fragmentRecall(expected, actual) {
  const normalized = actual.map((value) => value.toLowerCase());
  return recall(expected, (fragment) => normalized.some((value) => value.includes(fragment.toLowerCase())));
}

function recall(expected, predicate) {
  if (expected.length === 0) return 1;
  return expected.filter(predicate).length / expected.length;
}

function precision(actual, predicate) {
  if (actual.length === 0) return 1;
  return actual.filter(predicate).length / actual.length;
}

function sameMembers(actual, expected) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
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
