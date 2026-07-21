import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTEXT_BUDGETS,
  buildCapabilityEvidenceGraph,
  compileTaskContext,
  projectModelContext,
  projectModelContextDelivery,
} from "@rekon/capability-model";

test("compact model context selects exact source-backed spans without a provider call", () => {
  const sources = new Map([
    ["src/bootstrap.ts", [
      "import { startRuntime } from './runtime.js';",
      "",
      "export function bootstrapApplication() {",
      "  return startRuntime();",
      "}",
    ].join("\n")],
    ["src/runtime.ts", [
      "export function startRuntime() {",
      "  return { ready: true };",
      "}",
    ].join("\n")],
  ]);
  const graph = buildCapabilityEvidenceGraph({
    root: "source-span-fixture",
    generatedAt: "2026-07-21T00:00:00.000Z",
    files: [...sources].map(([path, text]) => ({ path, text })),
  });
  const { packet } = compileTaskContext({
    taskText: "Modify bootstrap application runtime behavior.",
    paths: [...sources.keys()],
    graph,
    profile: "compact",
    generatedAt: "2026-07-21T00:00:01.000Z",
  });
  const delivery = projectModelContextDelivery(projectModelContext(packet));

  assert.equal(delivery.sourceSpans?.length, 2);
  assert.ok(delivery.sourceSpans.every((span) => delivery.readFirst.includes(span.path)));
  assert.ok(delivery.sourceSpans.every((span) => sources.get(span.path)?.includes(span.excerpt)));
  assert.ok(delivery.sourceSpans.every((span) => span.lineStart > 0 && span.lineEnd >= span.lineStart));
  assert.ok(delivery.sourceSpans.every((span) => span.freshness === "fresh"));
  assert.ok(delivery.sourceSpans.reduce((total, span) => total + span.excerpt.length, 0)
    <= CONTEXT_BUDGETS.compact.maxSourceSpanCharacters);
  assert.ok(packet.estimatedTokens <= CONTEXT_BUDGETS.compact.maxTokens);
});

test("compact source-span selection stays bounded across a broad required path set", () => {
  const files = Array.from({ length: 10 }, (_, index) => ({
    path: `src/feature-${index}.ts`,
    text: `export function updateFeature${index}() { return ${index}; }`,
  }));
  const graph = buildCapabilityEvidenceGraph({
    root: "source-span-bounds",
    generatedAt: "2026-07-21T00:00:00.000Z",
    files,
  });
  const { packet } = compileTaskContext({
    taskText: "Update the selected features.",
    paths: files.map((file) => file.path),
    graph,
    profile: "compact",
    generatedAt: "2026-07-21T00:00:01.000Z",
  });
  const delivery = projectModelContextDelivery(projectModelContext(packet));

  assert.ok((delivery.sourceSpans?.length ?? 0) <= CONTEXT_BUDGETS.compact.maxSourceSpans);
  assert.ok((delivery.sourceSpans ?? []).reduce((total, span) => total + span.excerpt.length, 0)
    <= CONTEXT_BUDGETS.compact.maxSourceSpanCharacters);
  assert.ok(packet.estimatedTokens <= CONTEXT_BUDGETS.compact.maxTokens);
});
