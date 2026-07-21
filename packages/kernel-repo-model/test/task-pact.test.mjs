import assert from "node:assert/strict";
import test from "node:test";

import { createTaskPact, validateTaskPact } from "../dist/index.js";

const contractRef = { type: "SystemContract", id: "system-1", schemaVersion: "1.0.0" };

function taskPactInput() {
  return {
    header: {
      artifactType: "TaskPact",
      artifactId: "task-pact-1",
      schemaVersion: "1.0.0",
      generatedAt: "2026-07-20T20:00:00.000Z",
      subject: { repoId: "example", paths: ["src/index.ts"] },
      producer: { id: "@rekon/capability-model", version: "1.0.0" },
      inputRefs: [contractRef],
      freshness: { status: "fresh" },
    },
    task: { text: "Change the entry point.", paths: ["src/index.ts"] },
    contracts: [{
      contractType: "SystemContract",
      contractId: "system",
      authority: "adopted",
      confidence: 1,
      freshness: "fresh",
      ref: contractRef,
    }],
    requiredContextPaths: ["src/contracts.ts", "src/contracts.ts"],
    constraints: [{
      id: "system.invariant.one",
      kind: "invariant",
      statement: "Preserve the entry contract.",
      paths: ["src/**"],
      contractRef,
      authority: "adopted",
      confidence: 1,
    }],
    impactObligations: [{
      id: "verify:system",
      kind: "verify",
      statement: "Run the required system check.",
      paths: ["src/index.ts"],
      requiredChecks: ["npm test"],
      contractRefs: [contractRef],
    }],
    requiredChecks: ["npm test", "npm test"],
    warnings: [],
  };
}

test("TaskPact normalizes task-scoped law and computes its summary", () => {
  const pact = createTaskPact(taskPactInput());

  assert.deepEqual(pact.requiredContextPaths, ["src/contracts.ts"]);
  assert.deepEqual(pact.requiredChecks, ["npm test"]);
  assert.deepEqual(pact.summary, {
    contracts: 1,
    constraints: 1,
    impactObligations: 1,
    requiredContextPaths: 1,
    requiredChecks: 1,
  });
  assert.equal(validateTaskPact(pact).ok, true);
});

test("TaskPact rejects invalid authority and mismatched summaries", () => {
  const pact = createTaskPact(taskPactInput());
  const result = validateTaskPact({
    ...pact,
    contracts: [{ ...pact.contracts[0], authority: "guessed" }],
    summary: { ...pact.summary, contracts: 2 },
  });

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.path === "$.contracts[0].authority"));
  assert.ok(result.issues.some((issue) => issue.path === "$.summary.contracts"));
});
