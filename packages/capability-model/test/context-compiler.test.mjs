import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTEXT_BUDGETS,
  compileTaskContext,
  estimateModelContextDeliveryTokens,
  projectModelContext,
  projectModelContextDelivery,
  renderTaskContextMarkdown,
} from "../dist/index.js";

function graphWithFiles(count) {
  const nodes = [];
  const claims = [];
  for (let index = 0; index < count; index += 1) {
    const path = `src/feature-${index}.ts`;
    nodes.push({ kind: "file", id: path });
    claims.push({
      id: `claim-${index}`,
      subject: { kind: "file", id: path },
      predicate: "imports",
      object: { kind: "file", id: `src/shared-${index}.ts` },
      source: "ast",
      evidenceRefs: [`EvidenceGraph:evidence-${index}`],
    });
  }
  return { nodes, claims, capabilities: [] };
}

test("compact context is budgeted and explains excluded items", () => {
  const paths = Array.from({ length: 20 }, (_, index) => `src/feature-${index}.ts`);
  const { packet } = compileTaskContext({
    taskText: "Change the feature implementations and run npm test.",
    paths,
    graph: graphWithFiles(20),
    profile: "compact",
    generatedAt: "2026-07-17T00:00:00.000Z",
  });

  assert.equal(packet.profile, "compact");
  assert.deepEqual(packet.budget, CONTEXT_BUDGETS.compact);
  assert.ok(packet.coreContext.length <= CONTEXT_BUDGETS.compact.maxCoreItems);
  assert.ok(packet.estimatedTokens <= CONTEXT_BUDGETS.compact.maxTokens);
  assert.ok(packet.contextTrace.length <= CONTEXT_BUDGETS.compact.maxTraceItems);
  assert.equal(packet.truncated, true);
  assert.ok(packet.contextTrace.some((entry) => entry.decision === "excluded"));
  assert.ok(packet.verificationHints.some((hint) => hint.command === "npm test"));
});

test("selection trace stays bounded when the graph contains many candidates", () => {
  const paths = Array.from({ length: 200 }, (_, index) => `src/feature-${index}.ts`);
  const { packet } = compileTaskContext({
    taskText: "Change the selected features.",
    paths,
    graph: graphWithFiles(200),
    profile: "compact",
    generatedAt: "2026-07-17T00:00:00.000Z",
  });

  assert.ok(packet.contextTrace.length <= CONTEXT_BUDGETS.compact.maxTraceItems);
  assert.ok(packet.estimatedTokens <= CONTEXT_BUDGETS.compact.maxTokens);
  assert.equal(packet.truncated, true);
});

test("operator and deterministic context retain distinct trust classes", () => {
  const { packet } = compileTaskContext({
    taskText: "Change src/index.ts but do not change the public API.",
    paths: ["src/index.ts"],
    graph: {
      nodes: [{ kind: "file", id: "src/index.ts" }],
      claims: [{
        id: "claim-import",
        subject: { kind: "file", id: "src/index.ts" },
        predicate: "imports",
        object: { kind: "file", id: "src/runtime.ts" },
        source: "ast",
        evidenceRefs: ["EvidenceGraph:evidence"],
      }],
    },
    generatedAt: "2026-07-17T00:00:00.000Z",
  });

  assert.ok(packet.coreContext.some((item) => item.source === "operator_input" && item.trust === "operator"));
  assert.ok(packet.coreContext.some((item) => item.source === "deterministic_graph" && item.trust === "deterministic"));
  assert.ok(packet.coreContext.some((item) => item.ref === "src/runtime.ts" && item.path === "src/runtime.ts"));
  assert.ok(packet.contextTrace.some((entry) => entry.ref === "src/runtime.ts" && entry.decision === "included"));
  assert.ok(packet.doNotTouch.every((zone) => zone.trust === "operator" && zone.enforced === false));
});

test("packet selection keeps declared routes ahead of duplicate graph routes", () => {
  const { packet, report } = compileTaskContext({
    taskText: "Change the request flow.",
    paths: ["src/request.ts"],
    declaredContextPaths: [{
      path: "src/handler.ts",
      reason: "matched TaskPact requires this repository context",
      evidenceRefs: ["TaskPact:pact-1"],
      freshness: "fresh",
    }],
    graph: {
      nodes: [
        { kind: "file", id: "src/request.ts" },
        { kind: "file", id: "src/handler.ts" },
      ],
      claims: [
        {
          id: "claim-request-handler",
          subject: { kind: "file", id: "src/request.ts" },
          predicate: "imports",
          object: { kind: "file", id: "src/handler.ts" },
          source: "ast",
          evidenceRefs: ["EvidenceGraph:request-handler"],
        },
        {
          id: "claim-handler-request",
          subject: { kind: "file", id: "src/handler.ts" },
          predicate: "handles",
          object: { kind: "file", id: "src/request.ts" },
          source: "configured",
          evidenceRefs: ["EvidenceGraph:handler-request"],
        },
      ],
    },
    generatedAt: "2026-07-17T00:00:00.000Z",
  });

  assert.ok(report.contextItems.filter((item) => item.path === "src/handler.ts").length > 1);
  assert.deepEqual(packet.coreContext.filter((item) => item.ref === "src/handler.ts").map((item) => item.reason), [
    "matched TaskPact requires this repository context",
  ]);
  assert.deepEqual(packet.coreContext.find((item) => item.ref === "src/handler.ts")?.evidenceRefs, [
    "TaskPact:pact-1",
    "EvidenceGraph:request-handler",
    "claim-request-handler",
    "EvidenceGraph:handler-request",
    "claim-handler-request",
  ]);
});

test("capability packet items use capability identity instead of implementation path", () => {
  const { packet } = compileTaskContext({
    taskText: "Change src/index.ts.",
    paths: ["src/index.ts"],
    graph: {
      nodes: [{ kind: "file", id: "src/index.ts" }],
      capabilities: [{
        id: "capability:bootstrap",
        verb: "start",
        noun: "application",
        implementedBy: [{ kind: "file", id: "src/index.ts" }],
      }],
    },
    generatedAt: "2026-07-17T00:00:00.000Z",
  });

  const capability = packet.coreContext.find((item) => item.kind === "capability");
  assert.equal(capability?.ref, "capability:bootstrap");
  assert.equal(capability?.path, "src/index.ts");
  assert.equal(capability?.capabilityId, "capability:bootstrap");
});

test("human rendering consumes the same compiled packet", () => {
  const { packet, report } = compileTaskContext({
    taskText: "Modify src/index.ts and verify npm run typecheck.",
    paths: ["src/index.ts"],
    graph: { nodes: [{ kind: "file", id: "src/index.ts" }] },
    generatedAt: "2026-07-17T00:00:00.000Z",
  });
  const markdown = renderTaskContextMarkdown(packet, report.header.artifactId);

  assert.match(markdown, /## Core Context/);
  assert.match(markdown, /src\/index\.ts/);
  assert.match(markdown, /\[required; task-target\]/);
  assert.match(markdown, /explicitly named this path as task scope\./);
  assert.match(markdown, /Context profile: compact/);
  assert.match(markdown, new RegExp(report.header.artifactId));
});

test("model projection preserves action context while omitting audit-heavy fields", () => {
  const { packet } = compileTaskContext({
    taskText: "Change src/index.ts without changing its public API. Run npm test.",
    paths: ["src/index.ts"],
    graph: {
      nodes: [
        { kind: "file", id: "src/index.ts" },
        { kind: "file", id: "src/runtime.ts" },
      ],
      claims: [{
        id: "claim-import",
        subject: { kind: "file", id: "src/index.ts" },
        predicate: "imports",
        object: { kind: "file", id: "src/runtime.ts" },
        source: "ast",
        evidenceRefs: ["EvidenceGraph:evidence"],
      }],
    },
    generatedAt: "2026-07-17T00:00:00.000Z",
  });
  const projection = projectModelContext(packet);

  assert.match(projection.instruction, /do not search for analogues/iu);
  assert.deepEqual(projection.readFirst, ["src/index.ts", "src/runtime.ts"]);
  assert.deepEqual(projection.boundaryPaths, []);
  assert.deepEqual(projection.coreContext.map((item) => item.ref), ["src/index.ts", "src/runtime.ts"]);
  assert.ok(projection.constraints.some((entry) => /public API/i.test(entry.statement)));
  assert.deepEqual(projection.checks, [{ command: "npm test" }]);
  assert.ok(projection.selection.projectedTokens < packet.estimatedTokens);
  assert.ok(!("evidence" in projection));
  assert.ok(!("contextTrace" in projection));
  assert.ok(!("boundaries" in projection));
});

test("model delivery removes repeated audit metadata while retaining routes and pacts", () => {
  const { packet } = compileTaskContext({
    taskText: "Change src/index.ts without changing its public API. Run npm test.",
    paths: ["src/index.ts"],
    graph: {
      nodes: [
        { kind: "file", id: "src/index.ts" },
        { kind: "file", id: "src/runtime.ts" },
        { kind: "file", id: "src/api.ts" },
      ],
      claims: [
        {
          id: "claim-runtime",
          subject: { kind: "file", id: "src/index.ts" },
          predicate: "imports",
          object: { kind: "file", id: "src/runtime.ts" },
          source: "ast",
        },
        {
          id: "claim-api",
          subject: { kind: "file", id: "src/api.ts" },
          predicate: "imports",
          object: { kind: "file", id: "src/index.ts" },
          source: "ast",
        },
      ],
    },
    generatedAt: "2026-07-17T00:00:00.000Z",
  });
  const projection = projectModelContext(packet);
  const delivery = projectModelContextDelivery(projection);

  assert.deepEqual(delivery.readFirst, ["src/index.ts", "src/runtime.ts"]);
  assert.deepEqual(delivery.boundaryPaths, ["src/api.ts"]);
  assert.deepEqual(delivery.constraints, ["Change src/index.ts without changing its public API."]);
  assert.deepEqual(delivery.checks, ["npm test"]);
  assert.ok(estimateModelContextDeliveryTokens(delivery) < projection.selection.projectedTokens);
  assert.equal("coreContext" in delivery, false);
  assert.equal("selection" in delivery, false);
});

test("tiered model delivery keeps task seams mandatory and defers bounded contract context", () => {
  const projection = {
    schemaVersion: "1.0.0",
    instruction: "Read context.",
    paths: ["src/index.ts"],
    readFirst: [
      "src/index.ts",
      "src/runtime.ts",
      "src/jobs/cleanup-expired-sessions.ts",
      "tests/index.test.ts",
    ],
    boundaryPaths: [],
    coreContext: [
      { ref: "src/index.ts", kind: "file", trust: "operator", freshness: "fresh", reason: "operator-provided path" },
      { ref: "src/runtime.ts", kind: "file", trust: "deterministic", freshness: "fresh", reason: "matched TaskPact requires this repository context" },
      { ref: "src/jobs/cleanup-expired-sessions.ts", kind: "file", trust: "deterministic", freshness: "fresh", reason: "task-signaled implementation of graph capability cleanup" },
      { ref: "tests/index.test.ts", kind: "file", trust: "deterministic", freshness: "fresh", reason: "graph claim: file:tests/index.test.ts verifies file:src/index.ts" },
    ],
    supportingContext: [
      { ref: "docs/operations.md", kind: "file", trust: "inference", freshness: "fresh", reason: "useful embedding neighbor" },
    ],
    constraints: [{ statement: "Preserve cleanup semantics." }],
    checks: [{ command: "npm test" }],
    warnings: [],
    selection: { profile: "compact", sourcePacketTokens: 500, projectedTokens: 250, truncated: false },
  };

  const full = projectModelContextDelivery(projection);
  const tiered = projectModelContextDelivery(projection, { policy: "tiered" });

  assert.deepEqual(full.readFirst, projection.readFirst);
  assert.deepEqual(tiered.readFirst, [
    "src/index.ts",
    "src/jobs/cleanup-expired-sessions.ts",
    "tests/index.test.ts",
  ]);
  assert.deepEqual(tiered.supportingContext.map((item) => item.ref), [
    "src/runtime.ts",
    "docs/operations.md",
  ]);
  assert.deepEqual(tiered.constraints, ["Preserve cleanup semantics."]);
  assert.deepEqual(tiered.checks, ["npm test"]);
  assert.match(tiered.instruction, /Do not batch-read supportingContext/u);
  assert.match(tiered.supportingContext[0].reason, /conditional route selected from matched TaskPact/u);
});

test("compact unanchored placement delivery does not invite compatibility-only reads", () => {
  const { packet } = compileTaskContext({
    taskText: "Route high-risk payments to manual review.",
    paths: [],
    lexicalContextPaths: ["apps/risk-worker/src/review-coordinator.ts"],
    graph: {
      nodes: [
        { kind: "file", id: "apps/risk-worker/src/review-coordinator.ts" },
        { kind: "file", id: "src/api/payment-controller.ts" },
      ],
      claims: [{
        id: "claim-controller",
        subject: { kind: "file", id: "src/api/payment-controller.ts" },
        predicate: "imports",
        object: { kind: "file", id: "apps/risk-worker/src/review-coordinator.ts" },
        source: "ast",
      }],
    },
    generatedAt: "2026-07-17T00:00:00.000Z",
  });
  const projection = projectModelContext(packet);
  const delivery = projectModelContextDelivery(projection);

  assert.deepEqual(projection.boundaryPaths, ["src/api/payment-controller.ts"]);
  assert.equal("boundaryPaths" in delivery, false);
  assert.deepEqual(delivery.readFirst, ["apps/risk-worker/src/review-coordinator.ts"]);
});

test("bounded graph expansion keeps task-specific, test, and outgoing edges ahead of incidental callers", () => {
  const selected = "src/domain/user-service.ts";
  const nodes = [
    selected,
    "src/api/user-controller.ts",
    "src/data/user-repository.ts",
    "src/policy/user-policy.ts",
    "tests/user-service.test.ts",
    ...Array.from({ length: 6 }, (_, index) => `src/incidental/caller-${index}.ts`),
  ].map((id) => ({ kind: "file", id }));
  const incidental = Array.from({ length: 6 }, (_, index) => ({
    id: `claim-0-incidental-${index}`,
    subject: { kind: "file", id: `src/incidental/caller-${index}.ts` },
    predicate: "imports",
    object: { kind: "file", id: selected },
    source: "ast",
  }));
  const { packet } = compileTaskContext({
    taskText: "Add deactivation without changing the controller contract. Preserve authorization and persistence. Run npm test.",
    paths: [selected],
    graph: {
      nodes,
      claims: [
        ...incidental,
        {
          id: "claim-z-controller",
          subject: { kind: "file", id: "src/api/user-controller.ts" },
          predicate: "imports",
          object: { kind: "file", id: selected },
          source: "ast",
        },
        {
          id: "claim-z-repository",
          subject: { kind: "file", id: selected },
          predicate: "imports",
          object: { kind: "file", id: "src/data/user-repository.ts" },
          source: "ast",
        },
        {
          id: "claim-z-policy",
          subject: { kind: "file", id: selected },
          predicate: "imports",
          object: { kind: "file", id: "src/policy/user-policy.ts" },
          source: "ast",
        },
        {
          id: "claim-z-test",
          subject: { kind: "file", id: "tests/user-service.test.ts" },
          predicate: "verifies",
          object: { kind: "file", id: selected },
          source: "test",
        },
      ],
    },
    generatedAt: "2026-07-17T00:00:00.000Z",
  });

  const refs = new Set(packet.coreContext.map((item) => item.ref));
  assert.ok(refs.has("src/api/user-controller.ts"));
  assert.ok(refs.has("src/data/user-repository.ts"));
  assert.ok(refs.has("src/policy/user-policy.ts"));
  assert.ok(refs.has("tests/user-service.test.ts"));
  assert.equal(packet.coreContext.filter((item) => item.ref.includes("src/incidental/")).length, 0);
});

test("model projection prioritizes implementation evidence and separates incoming callers", () => {
  const selected = "src/domain/user-service.ts";
  const { packet } = compileTaskContext({
    taskText: "Change user lifecycle behavior without changing the controller contract.",
    paths: [selected],
    graph: {
      nodes: [
        { kind: "file", id: selected },
        { kind: "file", id: "src/data/user-repository.ts" },
        { kind: "file", id: "tests/user-service.test.ts" },
        { kind: "file", id: "src/api/user-controller.ts" },
      ],
      claims: [
        {
          id: "claim-repository",
          subject: { kind: "file", id: selected },
          predicate: "imports",
          object: { kind: "file", id: "src/data/user-repository.ts" },
          source: "ast",
        },
        {
          id: "claim-test",
          subject: { kind: "file", id: "tests/user-service.test.ts" },
          predicate: "verifies",
          object: { kind: "file", id: selected },
          source: "test",
        },
        {
          id: "claim-controller",
          subject: { kind: "file", id: "src/api/user-controller.ts" },
          predicate: "imports",
          object: { kind: "file", id: selected },
          source: "ast",
        },
      ],
    },
    generatedAt: "2026-07-17T00:00:00.000Z",
  });

  const projection = projectModelContext(packet);
  assert.deepEqual(projection.readFirst, [
    selected,
    "tests/user-service.test.ts",
    "src/data/user-repository.ts",
  ]);
  assert.deepEqual(projection.boundaryPaths, ["src/api/user-controller.ts"]);
});

test("model projection assigns deterministic route roles and necessity", () => {
  const selected = "src/domain/user-service.ts";
  const projection = projectModelContext(compileTaskContext({
    taskText: "Change user lifecycle behavior without changing the controller contract.",
    paths: [selected],
    graph: {
      nodes: [
        { kind: "file", id: selected },
        { kind: "file", id: "src/data/user-repository.ts" },
        { kind: "file", id: "tests/user-service.test.ts" },
        { kind: "file", id: "src/api/user-controller.ts" },
      ],
      claims: [
        {
          id: "claim-repository",
          subject: { kind: "file", id: selected },
          predicate: "imports",
          object: { kind: "file", id: "src/data/user-repository.ts" },
          source: "ast",
        },
        {
          id: "claim-test",
          subject: { kind: "file", id: "tests/user-service.test.ts" },
          predicate: "verifies",
          object: { kind: "file", id: selected },
          source: "test",
        },
        {
          id: "claim-controller",
          subject: { kind: "file", id: "src/api/user-controller.ts" },
          predicate: "imports",
          object: { kind: "file", id: selected },
          source: "ast",
        },
      ],
    },
    generatedAt: "2026-07-20T00:00:00.000Z",
  }).packet);
  const byRef = new Map(projection.coreContext.map((item) => [item.ref, item]));

  assert.deepEqual(
    [byRef.get(selected)?.routeRole, byRef.get(selected)?.necessity],
    ["task-target", "required"],
  );
  assert.deepEqual(
    [byRef.get("tests/user-service.test.ts")?.routeRole, byRef.get("tests/user-service.test.ts")?.necessity],
    ["verification", "required"],
  );
  assert.deepEqual(
    [byRef.get("src/data/user-repository.ts")?.routeRole, byRef.get("src/data/user-repository.ts")?.necessity],
    ["dependency", "conditional"],
  );
  assert.deepEqual(
    [byRef.get("src/api/user-controller.ts")?.routeRole, byRef.get("src/api/user-controller.ts")?.necessity],
    ["compatibility", "conditional"],
  );
});

test("role-aware delivery reads required routes and explains conditional dependencies and callers", () => {
  const selected = "src/domain/user-service.ts";
  const projection = projectModelContext(compileTaskContext({
    taskText: "Change user lifecycle behavior without changing the controller contract.",
    paths: [selected],
    graph: {
      nodes: [
        { kind: "file", id: selected },
        { kind: "file", id: "src/data/user-repository.ts" },
        { kind: "file", id: "tests/user-service.test.ts" },
        { kind: "file", id: "src/api/user-controller.ts" },
      ],
      claims: [
        {
          id: "claim-repository",
          subject: { kind: "file", id: selected },
          predicate: "imports",
          object: { kind: "file", id: "src/data/user-repository.ts" },
          source: "ast",
        },
        {
          id: "claim-test",
          subject: { kind: "file", id: "tests/user-service.test.ts" },
          predicate: "verifies",
          object: { kind: "file", id: selected },
          source: "test",
        },
        {
          id: "claim-controller",
          subject: { kind: "file", id: "src/api/user-controller.ts" },
          predicate: "imports",
          object: { kind: "file", id: selected },
          source: "ast",
        },
      ],
    },
    generatedAt: "2026-07-20T00:00:00.000Z",
  }).packet);
  const delivery = projectModelContextDelivery(projection, { policy: "role-aware" });

  assert.deepEqual(delivery.readFirst, [selected, "tests/user-service.test.ts"]);
  assert.equal("boundaryPaths" in delivery, false);
  assert.deepEqual(delivery.supportingContext.map((item) => item.ref), [
    "src/data/user-repository.ts",
    "src/api/user-controller.ts",
  ]);
  assert.deepEqual(delivery.supportingContext.map((item) => [item.routeRole, item.necessity]), [
    ["dependency", "conditional"],
    ["compatibility", "conditional"],
  ]);
  assert.ok(delivery.supportingContext.every((item) => item.necessityReason.length > 0));
  assert.match(delivery.instruction, /Conditional routes include a routeRole and necessityReason/u);
});

test("summary-aware delivery replaces conditional file paths with bounded relationship summaries", () => {
  const selected = "src/domain/user-service.ts";
  const dependency = "src/data/user-repository.ts";
  const caller = "src/api/user-controller.ts";
  const projection = projectModelContext(compileTaskContext({
    taskText: "Add a helper without changing existing behavior or exports.",
    paths: [selected],
    graph: {
      nodes: [
        { kind: "file", id: selected },
        { kind: "file", id: dependency },
        { kind: "file", id: "tests/user-service.test.ts" },
        { kind: "file", id: caller },
      ],
      claims: [
        {
          id: "claim-repository",
          subject: { kind: "file", id: selected },
          predicate: "imports",
          object: { kind: "file", id: dependency },
          source: "ast",
        },
        {
          id: "claim-test",
          subject: { kind: "file", id: "tests/user-service.test.ts" },
          predicate: "verifies",
          object: { kind: "file", id: selected },
          source: "test",
        },
        {
          id: "claim-controller",
          subject: { kind: "file", id: caller },
          predicate: "imports",
          object: { kind: "file", id: selected },
          source: "ast",
        },
      ],
    },
    generatedAt: "2026-07-20T00:00:00.000Z",
  }).packet);
  const delivery = projectModelContextDelivery(projection, { policy: "summary-aware" });

  assert.deepEqual(delivery.readFirst, [selected, "tests/user-service.test.ts"]);
  assert.equal("boundaryPaths" in delivery, false);
  assert.equal("supportingContext" in delivery, false);
  assert.deepEqual(delivery.routeSummaries.map((summary) => [
    summary.routeRole,
    summary.routeCount,
    summary.trust,
  ]), [
    ["dependency", 1, "deterministic"],
    ["compatibility", 1, "deterministic"],
  ]);
  assert.match(delivery.routeSummaries[0].summary, /existing dependency/u);
  assert.match(delivery.routeSummaries[1].inspectWhen, /existing export/u);
  assert.ok(delivery.routeSummaries.every((summary) =>
    summary.resolution === "condition-not-triggered"
    && summary.readDisposition === "skip-unless-triggered"));
  assert.match(delivery.instruction, /do not inspect, search for, or report omitted routes/iu);
  const encodedSummaries = JSON.stringify(delivery.routeSummaries);
  assert.equal(encodedSummaries.includes(dependency), false);
  assert.equal(encodedSummaries.includes(caller), false);
});

test("navigation-only delivery retains required paths and inference without exposing conditional routes", () => {
  const selected = "src/domain/user-service.ts";
  const dependency = "src/data/user-repository.ts";
  const caller = "src/api/user-controller.ts";
  const projection = {
    schemaVersion: "1.0.0",
    instruction: "Read context.",
    paths: [selected],
    readFirst: [selected, dependency, "tests/user-service.test.ts"],
    boundaryPaths: [caller],
    coreContext: [
      { ref: selected, kind: "file", trust: "operator", freshness: "fresh", reason: "operator-provided path" },
      {
        ref: dependency,
        kind: "file",
        trust: "deterministic",
        freshness: "fresh",
        reason: `graph claim: file:${selected} imports file:${dependency}`,
      },
      {
        ref: "tests/user-service.test.ts",
        kind: "file",
        trust: "deterministic",
        freshness: "fresh",
        reason: `graph claim: file:tests/user-service.test.ts verifies file:${selected}`,
      },
    ],
    supportingContext: [
      {
        ref: "docs/user-lifecycle.md",
        kind: "file",
        trust: "inference",
        freshness: "fresh",
        reason: "scored semantic neighbor",
      },
    ],
    constraints: [{ statement: "Preserve existing lifecycle behavior." }],
    checks: [{ command: "npm test" }],
    warnings: [],
    selection: { profile: "compact", sourcePacketTokens: 500, projectedTokens: 250, truncated: false },
  };
  const delivery = projectModelContextDelivery(projection, { policy: "navigation-only" });

  assert.deepEqual(delivery.readFirst, [selected, "tests/user-service.test.ts"]);
  assert.equal("boundaryPaths" in delivery, false);
  assert.deepEqual(delivery.supportingContext?.map((item) => item.ref), ["docs/user-lifecycle.md"]);
  assert.equal("routeSummaries" in delivery, false);
  assert.deepEqual(delivery.constraints, ["Preserve existing lifecycle behavior."]);
  assert.deepEqual(delivery.checks, ["npm test"]);
  assert.equal(JSON.stringify(delivery).includes(dependency), false);
  assert.equal(JSON.stringify(delivery).includes(caller), false);
  assert.equal(
    delivery.instruction,
    "Read every readFirst path before editing. Preserve constraints. Expand only for a task-required unresolved symbol. Run checks.",
  );
});

test("role-aware delivery keeps adopted repository-law and task-signaled handoff routes required", () => {
  const projection = projectModelContext(compileTaskContext({
    taskText: "Add optional campaign metadata to the checkout message and carry it to the worker.",
    paths: ["src/checkout/message.ts"],
    declaredContextPaths: [{
      path: "src/checkout/service.ts",
      reason: "matched TaskPact requires this repository context",
      evidenceRefs: ["TaskPact:checkout"],
      routeRole: "repository-law",
      necessity: "required",
      necessityReason: "Matched checkout law requires service context.",
    }],
    graph: {
      nodes: [
        { kind: "file", id: "src/checkout/message.ts" },
        { kind: "file", id: "src/checkout/service.ts" },
        { kind: "file", id: "src/worker/checkout-worker.ts" },
      ],
      claims: [{
        id: "claim-worker-message",
        subject: { kind: "file", id: "src/worker/checkout-worker.ts" },
        predicate: "consumes_contract",
        object: { kind: "file", id: "src/checkout/message.ts" },
        source: "configured",
      }],
    },
    generatedAt: "2026-07-20T00:00:00.000Z",
  }).packet);
  const delivery = projectModelContextDelivery(projection, { policy: "role-aware" });

  assert.deepEqual(delivery.readFirst, [
    "src/checkout/message.ts",
    "src/checkout/service.ts",
    "src/worker/checkout-worker.ts",
  ]);
  assert.deepEqual(delivery.supportingContext ?? [], []);
});

test("model projection collapses repeated refs before estimating its token budget", () => {
  const { packet } = compileTaskContext({
    taskText: "Change src/index.ts.",
    paths: ["src/index.ts"],
    declaredContextPaths: [{
      path: "src/runtime.ts",
      reason: "repository contract requires the runtime",
      evidenceRefs: ["CapabilityContract:runtime"],
    }],
    graph: {
      nodes: [
        { kind: "file", id: "src/index.ts" },
        { kind: "file", id: "src/runtime.ts" },
      ],
      claims: [{
        id: "claim-runtime",
        subject: { kind: "file", id: "src/index.ts" },
        predicate: "imports",
        object: { kind: "file", id: "src/runtime.ts" },
        source: "ast",
      }],
    },
    generatedAt: "2026-07-17T00:00:00.000Z",
  });

  const projection = projectModelContext(packet);
  assert.deepEqual(projection.readFirst, ["src/index.ts", "src/runtime.ts"]);
  assert.equal(projection.coreContext.filter((item) => item.ref === "src/runtime.ts").length, 1);
});

test("model projection proactively routes a task-signaled capability implementation", () => {
  const { packet } = compileTaskContext({
    taskText: "Make the cleanup expired sessions job registered here return the remaining sessions.",
    paths: ["src/jobs/job-registry.ts"],
    graph: {
      nodes: [
        { kind: "file", id: "src/jobs/job-registry.ts" },
        { kind: "file", id: "src/jobs/cleanup-expired-sessions.ts" },
        { kind: "file", id: "src/jobs/unrelated-job.ts" },
      ],
      capabilities: [{
        id: "capability:cleanup-expired-sessions-job",
        verb: "run",
        noun: "cleanup expired sessions job",
        implementedBy: [
          { kind: "file", id: "src/jobs/job-registry.ts" },
          { kind: "file", id: "src/jobs/cleanup-expired-sessions.ts" },
        ],
        evidenceRefs: ["CapabilityMap:cleanup-job"],
      }],
    },
    generatedAt: "2026-07-18T00:00:00.000Z",
  });

  const projection = projectModelContext(packet);
  assert.ok(projection.readFirst.includes("src/jobs/cleanup-expired-sessions.ts"));
  assert.ok(projection.coreContext.some((item) =>
    item.ref === "src/jobs/cleanup-expired-sessions.ts"
    && /task-signaled implementation/u.test(item.reason)));
  assert.ok(!projection.readFirst.includes("src/jobs/unrelated-job.ts"));
});

test("proactive capability routing does not cross an unrequested language boundary", () => {
  const graph = {
    nodes: [
      { kind: "file", id: "python/service.py" },
      { kind: "file", id: "go/internal/service/service.go" },
    ],
    capabilities: [{
      id: "capability:user-deactivation",
      verb: "deactivate",
      noun: "user",
      implementedBy: [
        { kind: "file", id: "python/service.py" },
        { kind: "file", id: "go/internal/service/service.go" },
      ],
    }],
  };

  const pythonOnly = projectModelContext(compileTaskContext({
    taskText: "Add user deactivation in python/service.py. Run pytest.",
    paths: ["python/service.py"],
    graph,
    generatedAt: "2026-07-18T00:00:00.000Z",
  }).packet);
  assert.ok(!pythonOnly.readFirst.includes("go/internal/service/service.go"));

  const crossLanguage = projectModelContext(compileTaskContext({
    taskText: "Keep the Python and Go user deactivation implementations aligned.",
    paths: ["python/service.py"],
    graph,
    generatedAt: "2026-07-18T00:00:00.000Z",
  }).packet);
  assert.ok(crossLanguage.readFirst.includes("go/internal/service/service.go"));
});

test("model projection proactively routes the task-signaled side of a shared contract", () => {
  const graph = {
    nodes: [
      { kind: "file", id: "src/users/user-event-publisher.ts" },
      { kind: "file", id: "src/users/user-event-contract.ts" },
      { kind: "file", id: "src/profiles/profile-event-consumer.ts" },
      { kind: "file", id: "src/audit/audit-event-consumer.ts" },
    ],
    claims: [
      {
        id: "publisher-contract",
        subject: { kind: "file", id: "src/users/user-event-publisher.ts" },
        predicate: "imports_contract",
        object: { kind: "file", id: "src/users/user-event-contract.ts" },
        source: "ast",
      },
      {
        id: "profile-consumer",
        subject: { kind: "file", id: "src/profiles/profile-event-consumer.ts" },
        predicate: "consumes_contract",
        object: { kind: "file", id: "src/users/user-event-contract.ts" },
        source: "ast",
      },
      {
        id: "audit-consumer",
        subject: { kind: "file", id: "src/audit/audit-event-consumer.ts" },
        predicate: "consumes_contract",
        object: { kind: "file", id: "src/users/user-event-contract.ts" },
        source: "ast",
      },
    ],
  };
  const { packet } = compileTaskContext({
    taskText: "Add a display name to user events and use it as the profile label.",
    paths: ["src/users/user-event-publisher.ts"],
    graph,
    generatedAt: "2026-07-18T00:00:00.000Z",
  });

  const projection = projectModelContext(packet);
  assert.ok(projection.readFirst.includes("src/profiles/profile-event-consumer.ts"));
  assert.ok(!projection.readFirst.includes("src/audit/audit-event-consumer.ts"));

  const unrelated = projectModelContext(compileTaskContext({
    taskText: "Rename a local variable in the user event publisher.",
    paths: ["src/users/user-event-publisher.ts"],
    graph,
    generatedAt: "2026-07-18T00:00:00.000Z",
  }).packet);
  assert.ok(!unrelated.readFirst.includes("src/profiles/profile-event-consumer.ts"));
  assert.ok(!unrelated.readFirst.includes("src/audit/audit-event-consumer.ts"));
});

test("model projection recognizes a camel-case producer symbol as a contract route", () => {
  const { packet } = compileTaskContext({
    taskText: "ReportExportInput must accept generatedBy and exportReport must copy it.",
    paths: ["src/reports/report-view.ts"],
    graph: {
      nodes: [
        { kind: "file", id: "src/reports/report-view.ts" },
        { kind: "file", id: "src/reports/report-contract.ts" },
        { kind: "file", id: "src/reports/report-exporter.ts" },
      ],
      claims: [
        {
          id: "view-contract",
          subject: { kind: "file", id: "src/reports/report-view.ts" },
          predicate: "consumes_contract",
          object: { kind: "file", id: "src/reports/report-contract.ts" },
          source: "ast",
        },
        {
          id: "exporter-contract",
          subject: { kind: "file", id: "src/reports/report-exporter.ts" },
          predicate: "produces_contract",
          object: { kind: "file", id: "src/reports/report-contract.ts" },
          source: "ast",
        },
      ],
    },
    generatedAt: "2026-07-18T00:00:00.000Z",
  });

  const projection = projectModelContext(packet);
  assert.ok(projection.readFirst.includes("src/reports/report-exporter.ts"));
});
