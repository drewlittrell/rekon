import assert from "node:assert/strict";
import test from "node:test";

import {
  buildClaimedContextUsageEvent,
  buildContextUsageEvent,
} from "../dist/index.js";

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

test("context usage claims derive an immutable receipt from delivered items", () => {
  const original = buildContextUsageEvent({
    repoId: "rekon",
    report: { task: { text: "modify bootstrap", paths: ["src/index.ts"] } },
    reportRef,
    packet: { profile: "compact", truncated: false },
    projection: { coreContext: [] },
    delivery: {
      schemaVersion: "1.0.0",
      instruction: "Read the selected context.",
      readFirst: ["src/index.ts"],
      supportingContext: [{
        ref: "memory:bootstrap",
        kind: "memory",
        trust: "memory",
        freshness: "fresh",
        reason: "scoped guidance",
      }],
      constraints: [],
      checks: [],
    },
    channel: "mcp",
    deliveredAt: "2026-07-22T20:00:00.000Z",
  });
  const originalRef = {
    type: "ContextUsageEvent",
    id: original.header.artifactId,
    schemaVersion: original.header.schemaVersion,
  };
  const receipt = buildClaimedContextUsageEvent({
    usage: original,
    usageRef: originalRef,
    assertedBy: "rekon-mcp-client",
    assertedAt: "2026-07-22T20:10:00.000Z",
    claims: [
      { itemId: "src/index.ts", disposition: "read" },
      { itemId: "memory:bootstrap", disposition: "applied" },
    ],
  });

  assert.deepEqual(original.claims, []);
  assert.equal(receipt.header.producer.id, "@rekon/capability-model.context-usage-claim");
  assert.deepEqual(receipt.header.inputRefs, [originalRef]);
  assert.deepEqual(receipt.delivery, original.delivery);
  assert.deepEqual(receipt.claims.map((claim) => [claim.itemId, claim.disposition]), [
    ["memory:bootstrap", "applied"],
    ["src/index.ts", "read"],
  ]);
  assert.throws(
    () => buildClaimedContextUsageEvent({
      usage: original,
      usageRef: originalRef,
      assertedBy: "rekon-mcp-client",
      claims: [{ itemId: "src/undelivered.ts", disposition: "applied" }],
    }),
    /undelivered item/u,
  );
  assert.throws(
    () => buildClaimedContextUsageEvent({
      usage: original,
      usageRef: { ...originalRef, id: "wrong-event" },
      assertedBy: "rekon-mcp-client",
      claims: [{ itemId: "src/index.ts", disposition: "applied" }],
    }),
    /exact ref/u,
  );
  assert.throws(
    () => buildClaimedContextUsageEvent({
      usage: original,
      usageRef: originalRef,
      assertedBy: "rekon-mcp-client",
      claims: [],
    }),
    /at least one/u,
  );
});
