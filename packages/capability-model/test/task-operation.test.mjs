import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyTaskOperation,
  compileTaskContext,
  projectModelContext,
  projectModelContextDelivery,
} from "../dist/index.js";

const completeRisk = {
  tier: "low",
  reasons: [],
  evidenceRefs: ["OwnershipMap:current"],
};

test("local complete work stays compact and direct", () => {
  const operation = classifyTaskOperation({
    taskText: "Update the local formatter.",
    paths: ["src/formatter.ts"],
    ownerSystems: ["formatting"],
    risk: completeRisk,
    evidence: { status: "complete" },
  });

  assert.equal(operation.taskClass, "local");
  assert.equal(operation.risk.tier, "low");
  assert.equal(operation.context.profile, "compact");
  assert.equal(operation.context.escalated, false);
  assert.deepEqual(operation.intent, {
    mode: "direct",
    required: false,
    reason: "The task can proceed directly under the returned pact and verification checks.",
  });
});

test("cross-file medium-risk work stays compact when evidence is complete", () => {
  const operation = classifyTaskOperation({
    taskText: "Update the formatter and its focused test.",
    paths: ["src/formatter.ts", "test/formatter.test.ts"],
    ownerSystems: ["formatting"],
    risk: { tier: "medium", reasons: ["Multiple paths were requested."] },
    evidence: { status: "complete" },
  });

  assert.equal(operation.taskClass, "cross-file");
  assert.equal(operation.context.profile, "compact");
  assert.equal(operation.intent.required, false);
});

test("cross-system work becomes high risk and requires the existing work-order flow", () => {
  const operation = classifyTaskOperation({
    taskText: "Preserve the handoff while updating both systems.",
    paths: ["apps/api.ts", "packages/runtime.ts"],
    ownerSystems: ["api", "runtime"],
    risk: completeRisk,
    evidence: { status: "complete" },
  });

  assert.equal(operation.taskClass, "cross-system");
  assert.equal(operation.risk.tier, "high");
  assert.equal(operation.context.profile, "compact");
  assert.equal(operation.intent.mode, "work-order");
  assert.equal(operation.intent.command, "rekon intent work-order --path <path> --goal <goal> --json");
});

test("migration, contract-changing, and critical-flow work require work orders", () => {
  const migration = classifyTaskOperation({
    taskText: "Migrate stored records to the new layout.",
    paths: ["src/migrate.ts"],
    risk: completeRisk,
    evidence: { status: "complete" },
  });
  const contract = classifyTaskOperation({
    taskText: "Extend the request payload schema.",
    paths: ["src/request.ts"],
    risk: completeRisk,
    evidence: { status: "complete" },
  });
  const critical = classifyTaskOperation({
    taskText: "Correct the checkout implementation.",
    paths: ["src/checkout.ts"],
    risk: completeRisk,
    evidence: { status: "complete" },
    flows: [{ id: "checkout", criticality: "critical", systems: ["web", "payments"] }],
  });

  assert.equal(migration.taskClass, "migration");
  assert.equal(contract.taskClass, "contract-changing");
  assert.equal(critical.taskClass, "critical-flow");
  assert.ok([migration, contract, critical].every((operation) => operation.intent.required));
});

test("incomplete evidence raises context only to standard", () => {
  const operation = classifyTaskOperation({
    taskText: "Update the local formatter.",
    paths: ["src/formatter.ts"],
    risk: { tier: "medium", reasons: ["Ownership unresolved."] },
    evidence: { status: "partial", reasons: ["Ownership is unresolved for src/formatter.ts."] },
    requestedProfile: "compact",
  });

  assert.equal(operation.context.profile, "standard");
  assert.equal(operation.context.requestedProfile, "compact");
  assert.equal(operation.context.escalated, true);
  assert.equal(operation.intent.required, false);
});

test("a validation failure raises context to deep without changing task intent", () => {
  const operation = classifyTaskOperation({
    taskText: "Update the local formatter.",
    paths: ["src/formatter.ts"],
    risk: completeRisk,
    evidence: { status: "complete" },
    requestedProfile: "standard",
    escalation: "validation-failed",
  });

  assert.equal(operation.context.profile, "deep");
  assert.equal(operation.context.escalated, true);
  assert.equal(operation.intent.mode, "direct");
});

test("compiled and model context retain the same operation decision", () => {
  const operation = classifyTaskOperation({
    taskText: "Extend the response schema.",
    paths: ["src/response.ts"],
    risk: completeRisk,
    evidence: { status: "complete" },
  });
  const { packet } = compileTaskContext({
    taskText: "Extend the response schema.",
    paths: ["src/response.ts"],
    graph: { nodes: [{ kind: "file", id: "src/response.ts" }] },
    profile: operation.context.profile,
    operation,
    generatedAt: "2026-07-21T00:00:00.000Z",
  });
  const projection = projectModelContext(packet);
  const delivery = projectModelContextDelivery(projection);

  assert.deepEqual(packet.operation, operation);
  assert.deepEqual(projection.operation, operation);
  assert.deepEqual(delivery.operation, operation);
});
