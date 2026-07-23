import assert from "node:assert/strict";
import test from "node:test";

import { buildContextUsageEvent } from "../dist/index.js";

const reportRef = { type: "TaskContextReport", id: "context-1", schemaVersion: "0.1.0" };
const taskPactRef = { type: "TaskPact", id: "pact-1", schemaVersion: "0.1.0" };

test("context usage records the exact bounded delivery without claiming model use", () => {
  const delivery = {
    schemaVersion: "1.0.0",
    instruction: "Read the selected context.",
    readFirst: ["src/index.ts"],
    supportingContext: [{
      ref: "support:test.ts",
      kind: "file",
      trust: "deterministic",
      freshness: "fresh",
      reason: "covers target",
    }],
    sourceSpans: [{
      path: "src/index.ts",
      sourceSha256: "a".repeat(64),
      lineStart: 1,
      lineEnd: 5,
      excerpt: "export const value = true;",
      evidenceRef: "EvidenceGraph:evidence-1",
      reason: "task target",
      freshness: "fresh",
    }],
    constraints: ["Preserve behavior."],
    checks: ["npm test"],
  };
  const event = buildContextUsageEvent({
    repoId: "rekon",
    report: { task: { text: "modify bootstrap", paths: ["src/index.ts"] } },
    reportRef,
    taskPactRef,
    packet: { profile: "compact", truncated: false },
    projection: {
      coreContext: [{
        ref: "target:src/index.ts",
        kind: "file",
        trust: "deterministic",
        freshness: "fresh",
        reason: "task target",
      }, {
        ref: "omitted:src/internal.ts",
        kind: "file",
        trust: "deterministic",
        freshness: "fresh",
        reason: "not included by the delivery policy",
      }],
    },
    delivery,
    channel: "mcp",
    deliveredAt: "2026-07-22T20:00:00.000Z",
  });

  assert.equal(event.delivery.channel, "mcp");
  assert.deepEqual(event.delivery.itemIds, ["src/index.ts", "support:test.ts"]);
  assert.ok(!event.delivery.itemIds.includes("omitted:src/internal.ts"));
  assert.deepEqual(event.claims, []);
  assert.deepEqual(event.header.inputRefs, [reportRef, taskPactRef]);
  assert.equal(event.delivery.sourceSpanKeys[0], `src/index.ts:${"a".repeat(64)}:1-5`);
});
