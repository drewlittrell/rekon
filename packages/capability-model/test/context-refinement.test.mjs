import assert from "node:assert/strict";
import test from "node:test";

import { selectTaskContextRefinement } from "../dist/index.js";

const graph = {
  nodes: [
    { kind: "file", id: "src/service.ts" },
    { kind: "file", id: "src/repository.ts" },
    { kind: "file", id: "src/controller.ts" },
    { kind: "file", id: "tests/service.test.ts" },
    { kind: "file", id: "contracts/event.json" },
    { kind: "file", id: "src/event-consumer.ts" },
    { kind: "file", id: "src/alternate-service.ts" },
    { kind: "symbol", id: "src/service.ts#runService" },
  ],
  claims: [
    {
      id: "claim-service-repository",
      subject: { kind: "file", id: "src/service.ts" },
      predicate: "imports",
      object: { kind: "file", id: "src/repository.ts" },
      source: "ast",
      evidenceRefs: ["EvidenceGraph:service-repository"],
    },
    {
      id: "claim-controller-service",
      subject: { kind: "file", id: "src/controller.ts" },
      predicate: "calls",
      object: { kind: "file", id: "src/service.ts" },
      source: "ast",
    },
    {
      id: "claim-test-service",
      subject: { kind: "file", id: "tests/service.test.ts" },
      predicate: "verifies",
      object: { kind: "file", id: "src/service.ts" },
      source: "test",
    },
    {
      id: "claim-service-contract",
      subject: { kind: "file", id: "src/service.ts" },
      predicate: "produces_contract",
      object: { kind: "file", id: "contracts/event.json" },
      source: "configured",
    },
    {
      id: "claim-consumer-contract",
      subject: { kind: "file", id: "src/event-consumer.ts" },
      predicate: "consumes_contract",
      object: { kind: "file", id: "contracts/event.json" },
      source: "configured",
    },
    {
      id: "claim-model-only",
      subject: { kind: "file", id: "src/service.ts" },
      predicate: "imports",
      object: { kind: "file", id: "src/event-consumer.ts" },
      source: "llm",
    },
  ],
  capabilities: [{
    id: "capability:run:service",
    verb: "run",
    noun: "service",
    implementedBy: [
      { kind: "file", id: "src/service.ts" },
      { kind: "file", id: "src/alternate-service.ts" },
    ],
    evidenceRefs: ["CapabilityMap:run-service"],
  }],
};

test("refinement returns only the requested outgoing relationship", () => {
  const result = selectTaskContextRefinement({
    question: "Which dependency persists the result?",
    relationship: "dependency",
    anchorPath: "src/service.ts",
    graph,
  });

  assert.deepEqual(result.readNext.map((entry) => entry.path), [
    "contracts/event.json",
    "src/repository.ts",
  ]);
  assert.ok(result.readNext.every((entry) => entry.direction === "outgoing"));
  assert.ok(!result.readNext.some((entry) => entry.path === "src/controller.ts"));
  assert.ok(!result.readNext.some((entry) => entry.path === "src/event-consumer.ts"));
  assert.equal(result.unresolved, false);
});

test("refinement distinguishes dependents, tests, and contract hops", () => {
  const dependent = selectTaskContextRefinement({
    question: "Which caller depends on this service?",
    relationship: "dependent",
    anchorPath: "src/service.ts",
    graph,
  });
  assert.deepEqual(dependent.readNext.map((entry) => entry.path), ["src/controller.ts"]);

  const tests = selectTaskContextRefinement({
    question: "Which test proves this behavior?",
    relationship: "test",
    anchorPath: "src/service.ts",
    graph,
  });
  assert.deepEqual(tests.readNext.map((entry) => entry.path), ["tests/service.test.ts"]);

  const contract = selectTaskContextRefinement({
    question: "Which consumer shares this contract?",
    relationship: "contract",
    anchorPath: "contracts/event.json",
    alreadyRead: ["src/service.ts"],
    graph,
  });
  assert.deepEqual(contract.readNext.map((entry) => entry.path), ["src/event-consumer.ts"]);

  const consumer = selectTaskContextRefinement({
    question: "Which consumer reads this contract?",
    relationship: "consumer",
    anchorPath: "contracts/event.json",
    alreadyRead: ["src/service.ts"],
    graph,
  });
  assert.deepEqual(consumer.readNext.map((entry) => entry.path), ["src/event-consumer.ts"]);

  const producer = selectTaskContextRefinement({
    question: "Which producer writes this contract?",
    relationship: "producer",
    anchorPath: "contracts/event.json",
    alreadyRead: ["src/event-consumer.ts"],
    graph,
  });
  assert.deepEqual(producer.readNext.map((entry) => entry.path), ["src/service.ts"]);
});

test("refinement excludes already-read paths and supports symbol anchors", () => {
  const result = selectTaskContextRefinement({
    question: "Which dependency does this symbol use?",
    relationship: "dependency",
    anchorSymbol: "src/service.ts#runService",
    alreadyRead: ["src/repository.ts", "contracts/event.json"],
    graph,
  });

  assert.deepEqual(result.readNext, []);
  assert.equal(result.unresolved, true);
  assert.ok(result.trace.some((entry) => entry.path === "src/repository.ts" && /already-read/.test(entry.reason)));
});

test("implementation refinement returns graph-declared co-implementations", () => {
  const result = selectTaskContextRefinement({
    question: "Where is the alternate implementation?",
    relationship: "implementation",
    anchorPath: "src/service.ts",
    graph,
  });

  assert.deepEqual(result.readNext.map((entry) => entry.path), ["src/alternate-service.ts"]);
  assert.equal(result.readNext[0].direction, "co-implementation");
});

test("refinement fails closed for unknown anchors and never promotes model claims", () => {
  const missing = selectTaskContextRefinement({
    question: "Which dependency matters?",
    relationship: "dependency",
    anchorPath: "src/missing.ts",
    graph,
  });
  assert.equal(missing.unresolved, true);
  assert.match(missing.reason, /not present/);

  const deterministic = selectTaskContextRefinement({
    question: "Which dependency matters?",
    relationship: "dependency",
    anchorPath: "src/service.ts",
    alreadyRead: ["src/repository.ts", "contracts/event.json"],
    graph,
  });
  assert.equal(deterministic.unresolved, true);
  assert.ok(deterministic.trace.some((entry) => entry.sourceId === "claim-model-only" && /outside/.test(entry.reason)));
});
