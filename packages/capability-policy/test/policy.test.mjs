import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import policyCapability, {
  SEMANTIC_CACHE_INTEGRITY_RULE_ID,
  SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID,
  SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID,
  SEMANTIC_ERROR_PROPAGATION_RULE_ID,
  SEMANTIC_OPTION_PROPAGATION_RULE_ID,
  SEMANTIC_SCOPE_RESOLUTION_RULE_ID,
  SEMANTIC_RESOURCE_LIFETIME_RULE_ID,
  SEMANTIC_PROBLEM_CANDIDATE_RULE_ID,
  applyAssessmentJudgments,
  evaluateCacheIntegritySignals,
  evaluateCleanupCompletenessSignals,
  evaluateDependencyAuditReports,
  evaluateDependencyResolutionSignals,
  evaluateErrorPropagationSignals,
  evaluateOptionPropagationSignals,
  evaluateSemanticFileCandidates,
  evaluateResourceLifetimeSignals,
} from "../dist/index.js";
import {
  assessmentJudgmentSignature,
  createAssessmentJudgmentReport,
} from "@rekon/kernel-assessments";
import { createRuntime } from "@rekon/runtime";

const silentLogger = { info() {}, warn() {}, error() {} };

test("policy evaluator emits a FindingReport from EvidenceGraph", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-policy-"));

  try {
    const runtime = await createRuntime({ repoRoot: root, repoId: "fixture", capabilities: [policyCapability], logger: silentLogger });
    await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "evidence-test",
        schemaVersion: "0.1.0",
        generatedAt: "2026-05-13T17:00:00.000Z",
        subject: { repoId: "fixture" },
        producer: { id: "test", version: "0.1.0" },
        inputRefs: [],
      },
      facts: [
        {
          kind: "typescript:diagnostic",
          subject: "src/index.ts:2322:1:14",
          value: { path: "src/index.ts", code: 2322, category: "error", phase: "semantic", message: "Type 'number' is not assignable to type 'string'.", line: 1, column: 14 },
          confidence: 1,
        },
        {
          kind: "file",
          subject: "src/index.ts",
          value: { path: "src/index.ts" },
          confidence: 1,
        },
        {
          kind: "import",
          subject: "src/index.ts:../dist/index.js",
          value: { source: "src/index.ts", target: "../dist/index.js" },
          confidence: 0.9,
        },
        {
          kind: "import",
          subject: "src/index.ts:../node_modules/legacy-package",
          value: { source: "src/index.ts", target: "../node_modules/legacy-package" },
          confidence: 0.9,
        },
        {
          kind: "import",
          subject: "tests/fixture.test.ts:../node_modules/fixture-package",
          value: { source: "tests/fixture.test.ts", target: "../node_modules/fixture-package" },
          confidence: 0.9,
        },
        {
          kind: "ownership_hint",
          subject: "src/index.ts",
          value: { path: "src/index.ts", system: "unknown" },
          confidence: 0.5,
        },
        {
          kind: "content_signal",
          subject: "src/log.ts",
          value: { signal: "consoleLogging" },
          confidence: 1,
        },
        {
          kind: "file",
          subject: "src/StringUtils.ts",
          value: { path: "src/StringUtils.ts" },
          confidence: 1,
        },
      ],
    });

    const refs = await runtime.runEvaluate();
    const report = await runtime.artifacts.read(refs.find((ref) => ref.type === "FindingReport"));
    const assessments = await runtime.artifacts.read(refs.find((ref) => ref.type === "AssessmentReport"));

    assert.equal(report.header.artifactType, "FindingReport");
    assert.equal(report.summary.total, 3);
    assert.deepEqual(report.findings.map((finding) => finding.ruleId).sort(), [
      "imports.noDistImports",
      "imports.noNodeModulesRelativeImports",
      "typescript.compilerDiagnostic",
    ]);
    assert.equal(assessments.header.artifactType, "AssessmentReport");
    assert.equal(assessments.summary.total, 1);
    assert.deepEqual(
      assessments.assessments.map((assessment) => [assessment.ruleId, assessment.kind]).sort(),
      [
        ["architecture.noUnknownSystemForSourceFile", "model_diagnostic"],
      ],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("policy evaluator gates cross-file resource lifetime on EvidenceGraph completeness", async () => {
  const resourceFact = {
    kind: "resource_flow",
    subject: "lib/route.js:socket._meta:retain",
    value: {
      source: "lib/route.js",
      caller: "routeHandler",
      action: "retain",
      resource: "socket._meta",
      target: "request.raw.socket._meta",
      ownerKind: "socket",
      retainedNames: ["request", "reply"],
      line: 589,
    },
    confidence: 1,
  };
  const evaluateStatus = async (status) => {
    const root = await mkdtemp(join(tmpdir(), `rekon-policy-resource-lifetime-${status}-`));
    try {
      const runtime = await createRuntime({ repoRoot: root, repoId: "fixture", capabilities: [policyCapability], logger: silentLogger });
      await runtime.artifacts.write({
        header: {
          artifactType: "EvidenceGraph",
          artifactId: `evidence-${status}`,
          schemaVersion: "0.1.0",
          generatedAt: "2026-07-15T17:00:00.000Z",
          subject: { repoId: "fixture" },
          producer: { id: "test", version: "0.1.0" },
          inputRefs: [],
          freshness: { status },
        },
        facts: [resourceFact],
      });
      const refs = await runtime.runEvaluate();
      const report = await runtime.artifacts.read(refs.find((ref) => ref.type === "AssessmentReport"));
      return report.assessments.some((entry) => entry.ruleId === SEMANTIC_RESOURCE_LIFETIME_RULE_ID);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  };

  assert.equal(await evaluateStatus("partial"), false);
  assert.equal(await evaluateStatus("fresh"), true);
});

test("dependency advisory impact preserves scanner severity while accounting for repository exposure", async () => {
  const evidenceRef = { type: "EvidenceGraph", id: "evidence-current", schemaVersion: "0.1.0" };
  const reportRef = { type: "DependencyAuditReport", id: "audit-current", schemaVersion: "0.1.0" };
  const vulnerability = (id, scope, direct) => ({
    id: `dependency-vulnerability-${id}`,
    packageName: `package-${id}`,
    severity: "critical",
    affectedRange: "<2.0.0",
    advisories: [{ id: `GHSA-${id}` }],
    paths: [{
      nodePath: `node_modules/package-${id}`,
      dependencyPath: direct ? [`package-${id}`] : ["tooling", `package-${id}`],
      installedVersion: "1.0.0",
      scope,
      direct,
    }],
    fixAvailable: true,
  });
  const report = {
    header: { inputRefs: [evidenceRef] },
    status: { complete: true },
    vulnerabilities: [
      vulnerability("production", "production", false),
      vulnerability("dev-direct", "development", true),
      vulnerability("dev-transitive", "development", false),
      vulnerability("unknown", "unknown", false),
      { ...vulnerability("umbrella", "production", true), advisories: [] },
    ],
  };
  const artifacts = {
    async list(type) {
      return type === "DependencyAuditReport" ? [reportRef] : [];
    },
    async read(ref) {
      assert.deepEqual(ref, reportRef);
      return report;
    },
  };

  const result = await evaluateDependencyAuditReports(artifacts, evidenceRef);
  const byPackage = new Map(result.assessments.map((assessment) => [assessment.details.packageName, assessment]));

  assert.equal(byPackage.get("package-production").impact, "critical");
  assert.equal(byPackage.get("package-dev-direct").impact, "high");
  assert.equal(byPackage.get("package-dev-transitive").impact, "medium");
  assert.equal(byPackage.get("package-unknown").impact, "high");
  assert.equal(byPackage.get("package-dev-transitive").details.advisorySeverity, "critical");
  assert.equal(byPackage.get("package-dev-transitive").details.direct, false);
  assert.equal(byPackage.get("package-dev-transitive").details.developmentOnly, true);
  assert.match(byPackage.get("package-dev-transitive").confidence.rationale, /caps repository impact at medium/);
  assert.equal(byPackage.has("package-umbrella"), false, "an umbrella row without its own advisory is evidence, not another risk");
});

test("semantic file findings become candidates only when their digest and excerpts match current source", () => {
  const text = "export function valid(value) {\n  return value.length > 0;\n}\n";
  const source = {
    path: "src/valid.ts",
    text,
    sha256: createHash("sha256").update(text).digest("hex"),
  };
  const ref = { type: "SemanticFileUnderstandingReport", id: "semantic-current", schemaVersion: "0.1.0" };
  const report = {
    header: { generatedAt: "2026-07-15T00:00:00.000Z" },
    file: { path: source.path, sha256: source.sha256 },
    normalizationTrace: { method: "semantic-llm", provider: "mock", model: "mock-model" },
    findings: [{
      id: "possible-empty-input",
      severity: "medium",
      message: "The function assumes value has a length property.",
      sourceEvidence: ["return value.length > 0;"],
      suggestedFollowUp: "Verify the caller contract.",
    }],
  };

  const assessments = evaluateSemanticFileCandidates(report, ref, source);
  assert.equal(assessments.length, 1);
  assert.equal(assessments[0].kind, "semantic_claim");
  assert.equal(assessments[0].details.sourceEvidence[0].lineStart, 2);
  assert.equal(evaluateSemanticFileCandidates({ ...report, file: { ...report.file, sha256: "stale" } }, ref, source).length, 0);
  assert.equal(evaluateSemanticFileCandidates({
    ...report,
    findings: [{ ...report.findings[0], sourceEvidence: ["invented source"] }],
  }, ref, source).length, 0);
});

test("semantic problem classes map to stable assessment rules without changing generic fallback", () => {
  const text = [
    "for (const provider of providers) {",
    "  selected = provider;",
    "}",
    "const cachedCode = readFileSync(codePath, 'utf8');",
    "await Promise.all(cleanupHandlers);",
    "if (conditionFailed || signal.aborted) throw { name: 'ConditionError' };",
    "return withOtpHandling({ operation: otp => publish({ ...publishOptions, otp }) });",
    "const blockNodeTypeRE = /^BlockStatement$/;",
    "return cachedCode;",
  ].join("\n");
  const source = {
    path: "src/resolution.ts",
    text,
    sha256: createHash("sha256").update(text).digest("hex"),
  };
  const ref = { type: "SemanticFileUnderstandingReport", id: "semantic-classes", schemaVersion: "0.1.0" };
  const baseFinding = {
    severity: "high",
    message: "Candidate requires independent judgment.",
  };
  const report = {
    header: { generatedAt: "2026-07-15T00:00:00.000Z" },
    file: { path: source.path, sha256: source.sha256 },
    normalizationTrace: { method: "semantic-llm", provider: "mock", model: "mock-model" },
    findings: [
      {
        ...baseFinding,
        id: "dependency-precedence",
        problemClass: "dependency-resolution",
        sourceEvidence: ["selected = provider;"],
      },
      {
        ...baseFinding,
        id: "cache-read",
        problemClass: "cache-integrity",
        sourceEvidence: ["const cachedCode = readFileSync(codePath, 'utf8');"],
      },
      {
        ...baseFinding,
        id: "cleanup-fail-fast",
        problemClass: "cleanup-completeness",
        sourceEvidence: ["await Promise.all(cleanupHandlers);"],
      },
      {
        ...baseFinding,
        id: "merged-error-identity",
        problemClass: "error-propagation",
        sourceEvidence: ["if (conditionFailed || signal.aborted) throw { name: 'ConditionError' };"],
      },
      {
        ...baseFinding,
        id: "dropped-option",
        problemClass: "option-propagation",
        sourceEvidence: ["return withOtpHandling({ operation: otp => publish({ ...publishOptions, otp }) });"],
      },
      {
        ...baseFinding,
        id: "incorrect-scope-model",
        problemClass: "scope-resolution",
        sourceEvidence: ["const blockNodeTypeRE = /^BlockStatement$/;"],
      },
      {
        ...baseFinding,
        id: "other",
        problemClass: "other",
        sourceEvidence: ["return cachedCode;"],
      },
    ],
  };

  const assessments = evaluateSemanticFileCandidates(report, ref, source);
  assert.deepEqual(assessments.map((assessment) => assessment.ruleId).sort(), [
    SEMANTIC_CACHE_INTEGRITY_RULE_ID,
    SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID,
    SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID,
    SEMANTIC_ERROR_PROPAGATION_RULE_ID,
    SEMANTIC_OPTION_PROPAGATION_RULE_ID,
    SEMANTIC_SCOPE_RESOLUTION_RULE_ID,
    SEMANTIC_PROBLEM_CANDIDATE_RULE_ID,
  ].sort());
  assert.equal(
    assessments.find((assessment) => assessment.ruleId === SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID).details.problemClass,
    "dependency-resolution",
  );
  assert.equal(
    assessments.find((assessment) => assessment.ruleId === SEMANTIC_CACHE_INTEGRITY_RULE_ID).type,
    SEMANTIC_CACHE_INTEGRITY_RULE_ID,
  );
  assert.equal(
    assessments.find((assessment) => assessment.ruleId === SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID).type,
    SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID,
  );
  assert.equal(
    assessments.find((assessment) => assessment.ruleId === SEMANTIC_ERROR_PROPAGATION_RULE_ID).type,
    SEMANTIC_ERROR_PROPAGATION_RULE_ID,
  );
  assert.equal(
    assessments.find((assessment) => assessment.ruleId === SEMANTIC_OPTION_PROPAGATION_RULE_ID).type,
    SEMANTIC_OPTION_PROPAGATION_RULE_ID,
  );
  assert.equal(
    assessments.find((assessment) => assessment.ruleId === SEMANTIC_SCOPE_RESOLUTION_RULE_ID).type,
    SEMANTIC_SCOPE_RESOLUTION_RULE_ID,
  );
});

test("resource lifetime requires complete cross-file retention evidence without a matching release", () => {
  const ref = { type: "EvidenceGraph", id: "resource-evidence", schemaVersion: "0.1.0" };
  const retain = {
    kind: "resource_flow",
    subject: "lib/route.js:socket._meta:retain",
    value: {
      source: "lib/route.js",
      caller: "routeHandler",
      action: "retain",
      resource: "socket._meta",
      target: "request.raw.socket._meta",
      ownerKind: "socket",
      retainedNames: ["request", "reply"],
      line: 589,
    },
  };
  const release = {
    kind: "resource_flow",
    subject: "lib/reply.js:socket._meta:release",
    value: {
      source: "lib/reply.js",
      caller: "onResFinished",
      action: "release",
      resource: "socket._meta",
      target: "socket._meta",
      ownerKind: "socket",
      line: 968,
    },
  };

  const buggy = evaluateResourceLifetimeSignals([retain], ref, { evidenceComplete: true });
  assert.equal(buggy.length, 1);
  assert.equal(buggy[0].ruleId, SEMANTIC_RESOURCE_LIFETIME_RULE_ID);
  assert.equal(buggy[0].kind, "semantic_claim");
  assert.deepEqual(buggy[0].files, ["lib/route.js"]);
  assert.equal(buggy[0].details.releaseMatch, "absent-in-complete-evidence");
  assert.deepEqual(buggy[0].details.retainedNames, ["reply", "request"]);

  assert.equal(evaluateResourceLifetimeSignals([retain, release], ref, { evidenceComplete: true }).length, 0);
  assert.equal(evaluateResourceLifetimeSignals([{
    ...retain,
    value: { ...retain.value, source: "packages/api/lib/route.js" },
  }, {
    ...release,
    value: { ...release.value, source: "packages/worker/lib/reply.js" },
  }], ref, { evidenceComplete: true }).length, 1);
  assert.equal(evaluateResourceLifetimeSignals([retain], ref, { evidenceComplete: false }).length, 0);
  assert.equal(evaluateResourceLifetimeSignals([{
    ...retain,
    value: { ...retain.value, source: "test/route.test.js" },
  }], ref, { evidenceComplete: true }).length, 0);
});

test("structured error propagation requires a merged guard and distinct mapped identities", () => {
  const ref = { type: "EvidenceGraph", id: "error-flow", schemaVersion: "0.1.0" };
  const mappings = [
    { identity: "AbortError", property: "aborted", expression: "error?.name === 'AbortError'", location: { line: 10, column: 14 } },
    { identity: "ConditionError", property: "condition", expression: "error?.name === 'ConditionError'", location: { line: 11, column: 16 } },
  ];
  const facts = [{
    kind: "error_flow",
    value: {
      source: "src/thunk.ts",
      caller: "run",
      errorIdentity: "ConditionError",
      guards: [{
        expression: "conditionResult === false || signal.aborted",
        operator: "or",
        terms: ["conditionResult === false", "signal.aborted"],
        location: { line: 40, column: 3 },
      }],
      identityMappings: mappings,
    },
  }];

  const assessments = evaluateErrorPropagationSignals(facts, ref);
  assert.equal(assessments.length, 1);
  assert.equal(assessments[0].ruleId, SEMANTIC_ERROR_PROPAGATION_RULE_ID);
  assert.equal(assessments[0].details.structuredMechanism, "merged-error-identity");
  assert.deepEqual(assessments[0].details.identityMappings.map((mapping) => mapping.identity), [
    "AbortError",
    "ConditionError",
  ]);
  assert.deepEqual(evaluateErrorPropagationSignals([{
    ...facts[0],
    value: {
      ...facts[0].value,
      guards: [{ expression: "conditionResult === false", operator: "single", terms: ["conditionResult === false"], location: { line: 40, column: 3 } }],
    },
  }], ref), []);
});

test("structured error propagation identifies a cause hidden by a default message", () => {
  const ref = { type: "EvidenceGraph", id: "error-reason", schemaVersion: "0.1.0" };
  const fact = {
    kind: "error_flow",
    value: {
      source: "src/dispatcher.ts",
      caller: "DispatcherConnection.dispatch",
      action: "construct",
      mechanism: "cause-with-default-message",
      errorIdentity: "AbortError",
      messageExpression: "undefined",
      causeExpression: "params.reason",
      location: { line: 313, column: 78 },
      messageLocation: { line: 313, column: 93 },
      causeLocation: { line: 313, column: 113 },
    },
  };

  const assessments = evaluateErrorPropagationSignals([fact], ref);
  assert.equal(assessments.length, 1);
  assert.equal(assessments[0].ruleId, SEMANTIC_ERROR_PROPAGATION_RULE_ID);
  assert.equal(assessments[0].details.structuredMechanism, "cause-with-default-message");
  assert.equal(assessments[0].details.causeExpression, "params.reason");
  assert.deepEqual(assessments[0].details.sourceEvidence, [{
    path: "src/dispatcher.ts",
    lineStart: 313,
    lineEnd: 313,
  }]);
  assert.deepEqual(evaluateErrorPropagationSignals([{
    ...fact,
    value: { ...fact.value, messageExpression: "params.reason" },
  }], ref), []);
  assert.deepEqual(evaluateErrorPropagationSignals([{
    ...fact,
    value: { ...fact.value, errorIdentity: "Envelope" },
  }], ref), []);
  assert.deepEqual(evaluateErrorPropagationSignals([{
    ...fact,
    value: { ...fact.value, source: "tests/dispatcher.test.ts" },
  }], ref), []);
});

test("structured dependency resolution requires conditional exit and post-loop selection", () => {
  const ref = { type: "EvidenceGraph", id: "dependency-flow", schemaVersion: "0.1.0" };
  const fact = {
    kind: "dependency_flow",
    value: {
      source: "src/injector.ts",
      caller: "lookup",
      selectedBinding: "selected",
      candidateExpression: "providers.get(name)",
      collectionExpression: "children",
      exitKind: "conditional-break",
      exitCondition: "!selected.pending",
      returnedAfterLoop: true,
      selectionLocation: { line: 20, column: 5 },
      exitLocation: { line: 21, column: 28 },
    },
  };

  const assessments = evaluateDependencyResolutionSignals([fact], ref);
  assert.equal(assessments.length, 1);
  assert.equal(assessments[0].ruleId, SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID);
  assert.equal(assessments[0].details.structuredMechanism, "conditional-candidate-overwrite");
  assert.deepEqual(evaluateDependencyResolutionSignals([{
    ...fact,
    value: { ...fact.value, exitKind: "unconditional-break", exitCondition: undefined },
  }], ref), []);
  assert.deepEqual(evaluateDependencyResolutionSignals([{
    ...fact,
    value: { ...fact.value, returnedAfterLoop: false },
  }], ref), []);
});

test("structured dependency resolution identifies an iterated candidate bypass", () => {
  const ref = { type: "EvidenceGraph", id: "dependency-bypass", schemaVersion: "0.1.0" };
  const fact = {
    kind: "dependency_flow",
    value: {
      source: "src/abstract-resolver.ts",
      caller: "resolvePerContext",
      resolver: "pluckInstance",
      mechanism: "iterated-candidate-bypass",
      candidateParameter: "instanceLink",
      candidateBindings: ["instanceLink", "wrapperRef"],
      collectionExpression: "instanceLinkOrArray",
      bypassExpression: "this.get(typeOrToken, { strict: options?.strict })",
      selectorExpressions: ["typeOrToken", "{ strict: options?.strict }"],
      guardExpression: "wrapperRef.isDependencyTreeStatic() && !wrapperRef.isTransient",
      location: { line: 58, column: 27 },
      guardLocation: { line: 60, column: 11 },
      bypassLocation: { line: 61, column: 16 },
      iterationLocation: { line: 76, column: 9 },
    },
  };

  const assessments = evaluateDependencyResolutionSignals([fact], ref);
  assert.equal(assessments.length, 1);
  assert.equal(assessments[0].ruleId, SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID);
  assert.equal(assessments[0].details.structuredMechanism, "iterated-candidate-bypass");
  assert.equal(assessments[0].details.bypassExpression, fact.value.bypassExpression);
  assert.deepEqual(assessments[0].details.sourceEvidence.map((entry) => entry.lineStart), [60, 61, 76]);
  assert.deepEqual(evaluateDependencyResolutionSignals([{
    ...fact,
    value: { ...fact.value, candidateBindings: ["wrapperRef"] },
  }], ref), []);
  assert.deepEqual(evaluateDependencyResolutionSignals([{
    ...fact,
    value: { ...fact.value, selectorExpressions: [] },
  }], ref), []);
  assert.deepEqual(evaluateDependencyResolutionSignals([{
    ...fact,
    value: { ...fact.value, source: "tests/abstract-resolver.test.ts" },
  }], ref), []);
});

test("structured option propagation identifies truthy defaults that override false", () => {
  const ref = { type: "EvidenceGraph", id: "option-falsy-default", schemaVersion: "0.1.0" };
  const fact = {
    kind: "option_flow",
    value: {
      source: "src/plugin.js",
      caller: "ProgressPlugin.constructor",
      mechanism: "truthy-default-overrides-falsy",
      property: "modules",
      optionContainer: "options",
      optionExpression: "options.modules",
      defaultExpression: "DEFAULT_OPTIONS.modules",
      defaultSource: "DEFAULT_OPTIONS",
      defaultValue: true,
      location: { line: 181, column: 24 },
      optionLocation: { line: 181, column: 24 },
      defaultLocation: { line: 181, column: 43 },
    },
  };

  const assessments = evaluateOptionPropagationSignals([fact], ref);
  assert.equal(assessments.length, 1);
  assert.equal(assessments[0].ruleId, SEMANTIC_OPTION_PROPAGATION_RULE_ID);
  assert.equal(assessments[0].details.structuredMechanism, "truthy-default-overrides-falsy");
  assert.equal(assessments[0].details.optionExpression, fact.value.optionExpression);
  assert.deepEqual(assessments[0].details.sourceEvidence, [
    { path: "src/plugin.js", lineStart: 181, lineEnd: 181 },
  ]);
  assert.deepEqual(evaluateOptionPropagationSignals([{
    ...fact,
    value: { ...fact.value, defaultValue: false },
  }], ref), []);
  assert.deepEqual(evaluateOptionPropagationSignals([{
    ...fact,
    value: { ...fact.value, mechanism: "logical-or-fallback" },
  }], ref), []);
  assert.deepEqual(evaluateOptionPropagationSignals([{
    ...fact,
    value: { ...fact.value, source: "test/plugin.test.js" },
  }], ref), []);
});

test("cache integrity requires a result parameter omitted from the cache key", () => {
  const ref = { type: "EvidenceGraph", id: "evidence-cache", schemaVersion: "0.1.0" };
  const fact = {
    kind: "cache_flow",
    value: {
      source: "src/metadata.ts",
      caller: "loadMetadata",
      factory: "miscUtils.getFactoryWithDefault",
      cacheBinding: "METADATA_CACHE",
      keyExpression: "ident.hash",
      keyParameters: ["ident"],
      omittedResultParameters: ["version"],
      guardExpression: "cached && version && cached.versions[version]",
      guardedReturnExpression: "cached",
      fallbackReturnExpression: "await readNetwork(ident)",
      location: { line: 3, column: 16 },
      guardLocation: { line: 5, column: 9 },
      fallbackLocation: { line: 7, column: 5 },
    },
  };

  const assessments = evaluateCacheIntegritySignals([fact], ref);
  assert.equal(assessments.length, 1);
  assert.equal(assessments[0].ruleId, SEMANTIC_CACHE_INTEGRITY_RULE_ID);
  assert.equal(assessments[0].details.structuredMechanism, "result-parameter-omitted-from-cache-key");
  assert.deepEqual(assessments[0].details.sourceEvidence.map((entry) => entry.lineStart), [3, 5, 7]);
  assert.deepEqual(evaluateCacheIntegritySignals([{
    ...fact,
    value: { ...fact.value, keyParameters: ["ident", "version"] },
  }], ref), []);
  assert.equal(evaluateCacheIntegritySignals([{
    ...fact,
    value: { ...fact.value, factory: "getFactoryWithDefault" },
  }], ref).length, 1);
  assert.deepEqual(evaluateCacheIntegritySignals([{
    ...fact,
    value: { ...fact.value, factory: "unrelated.callback" },
  }], ref), []);
});

test("cleanup completeness requires multiple visible lifecycle obligations", () => {
  const ref = { type: "EvidenceGraph", id: "evidence-cleanup", schemaVersion: "0.1.0" };
  const fact = {
    kind: "cleanup_flow",
    value: {
      source: "src/server.ts",
      caller: "close",
      mechanism: "fail-fast-aggregate",
      obligations: ["watcher.close()", "socket.close()", "closeHttpServer()"],
      location: { line: 42, column: 13 },
      obligationLocations: [
        { line: 43, column: 9 },
        { line: 44, column: 9 },
        { line: 45, column: 9 },
      ],
    },
  };

  const assessments = evaluateCleanupCompletenessSignals([fact], ref);
  assert.equal(assessments.length, 1);
  assert.equal(assessments[0].ruleId, SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID);
  assert.equal(assessments[0].details.structuredMechanism, "fail-fast-aggregate");
  assert.deepEqual(assessments[0].details.sourceEvidence.map((entry) => entry.lineStart), [42, 43, 44, 45]);
  assert.equal(evaluateCleanupCompletenessSignals([{
    ...fact,
    value: { ...fact.value, mechanism: "sequential-unhandled-awaits" },
  }], ref).length, 1);
  assert.deepEqual(evaluateCleanupCompletenessSignals([{
    ...fact,
    value: { ...fact.value, obligations: ["watcher.close()"] },
  }], ref), []);
  assert.deepEqual(evaluateCleanupCompletenessSignals([{
    ...fact,
    value: { ...fact.value, source: "tests/server.test.ts" },
  }], ref), []);
  assert.deepEqual(evaluateCleanupCompletenessSignals([{
    ...fact,
    value: { ...fact.value, mechanism: "all-settled" },
  }], ref), []);
  assert.deepEqual(evaluateCleanupCompletenessSignals([{
    ...fact,
    value: { ...fact.value, caller: "run" },
  }], ref), []);
});

test("current high-confidence judgments confirm or reject matching candidates without mutating unrelated assessments", () => {
  const evidence = { type: "EvidenceGraph", id: "evidence-1", schemaVersion: "0.1.0" };
  const sourceAssessmentRef = { type: "AssessmentReport", id: "assessment-source", schemaVersion: "0.1.0" };
  const judgmentRef = { type: "AssessmentJudgmentReport", id: "judgment-1", schemaVersion: "0.1.0" };
  const base = {
    kind: "risk",
    type: "events.inverseListenerDelegation",
    impact: "high",
    title: "Cleanup registers another listener",
    description: "The cleanup wrapper calls the registration API.",
    subjects: ["src/listener.ts"],
    files: ["src/listener.ts"],
    evidence: [evidence],
    confidence: { score: 0.8, basis: "deterministic", verification: "unverified" },
  };
  const confirmed = { ...base, id: "risk:confirmed", rootCauseKey: "events:confirmed" };
  const rejected = { ...base, id: "risk:rejected", rootCauseKey: "events:rejected" };
  const unrelated = { ...base, id: "risk:unrelated", rootCauseKey: "events:unrelated" };
  const sourceEvidence = {
    path: "src/listener.ts",
    sha256: "abc123",
    lineStart: 4,
    lineEnd: 4,
    excerpt: "target.addEventListener(type, listener);",
  };
  const report = createAssessmentJudgmentReport({
    header: {
      artifactType: "AssessmentJudgmentReport",
      artifactId: judgmentRef.id,
      schemaVersion: "0.1.0",
      generatedAt: "2026-07-15T00:00:00.000Z",
      subject: { repoId: "fixture" },
      producer: { id: "mock.judge", version: "1.0.0" },
      inputRefs: [sourceAssessmentRef, evidence],
      freshness: { status: "fresh" },
      provenance: { confidence: 0.9 },
    },
    sourceAssessmentRef,
    policy: {
      mode: "auto",
      provider: "mock",
      model: "mock-model",
      promptVersion: "assessment-judge-v6",
      coercionVersion: "assessment-judgment-v2",
      maxCandidates: 3,
      maxSourceChars: 24000,
    },
    summary: {
      candidates: 3,
      selected: 2,
      confirmed: 1,
      rejected: 1,
      insufficientEvidence: 0,
      verificationRequired: 0,
      failed: 0,
      skipped: 1,
    },
    judgments: [
      {
        assessmentId: confirmed.id,
        assessmentSignature: assessmentJudgmentSignature(confirmed),
        rootCauseKey: confirmed.rootCauseKey,
        verdict: "confirmed",
        rationale: "The inverse operation calls addEventListener.",
        confidence: 0.96,
        evidence: [sourceEvidence],
      },
      {
        assessmentId: rejected.id,
        assessmentSignature: assessmentJudgmentSignature(rejected),
        rootCauseKey: rejected.rootCauseKey,
        verdict: "rejected",
        rationale: "The wrapper is a registration helper, not cleanup.",
        confidence: 0.92,
        evidence: [sourceEvidence],
      },
    ],
  });

  const applied = applyAssessmentJudgments([confirmed, rejected, unrelated], report, judgmentRef);
  assert.deepEqual(applied.applied, [confirmed.id]);
  assert.deepEqual(applied.rejected, [rejected.id]);
  assert.equal(applied.assessments.length, 2);
  assert.equal(applied.assessments.find((entry) => entry.id === confirmed.id).confidence.verification, "independently_confirmed");
  assert.equal(applied.assessments.find((entry) => entry.id === unrelated.id).confidence.verification, "unverified");

  const changed = { ...confirmed, description: "Changed candidate meaning." };
  const stale = applyAssessmentJudgments([changed], report, judgmentRef);
  assert.equal(stale.assessments[0].confidence.verification, "unverified");
  assert.deepEqual(stale.ignored, [confirmed.id]);
});
