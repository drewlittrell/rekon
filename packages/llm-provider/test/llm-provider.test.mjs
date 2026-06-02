// @rekon/llm-provider unit tests. Provider/router/mock behavior, no network.

import assert from "node:assert/strict";
import test from "node:test";
import {
  RekonLlmRouter,
  createMockLlmProvider,
  createMockEmbeddingProvider,
  createDisabledLlmRouter,
  coercePhaseDrafts,
} from "../dist/index.js";

const input = (task = "plan.semantic-normalize") => ({ task, schemaName: "Test", prompt: "x" });

test("1. mock provider returns configured data", async () => {
  const provider = createMockLlmProvider({ id: "m", data: { phases: [{ id: "a" }] } });
  const result = await provider.completeJson(input());
  assert.equal(result.ok, true);
  assert.equal(result.provider, "m");
  assert.deepEqual(result.data, { phases: [{ id: "a" }] });
});

test("2. mock provider returns configured error", async () => {
  const provider = createMockLlmProvider({ id: "m", error: "boom" });
  const result = await provider.completeJson(input());
  assert.equal(result.ok, false);
  assert.equal(result.error, "boom");
});

test("3. router resolves CLI override provider before task route/default", async () => {
  const router = new RekonLlmRouter({
    config: { defaultRoute: { provider: "def" }, routes: { "plan.critique": { provider: "task" } } },
    providers: [
      createMockLlmProvider({ id: "override", data: { ok: 1 } }),
      createMockLlmProvider({ id: "task" }),
      createMockLlmProvider({ id: "def" }),
    ],
  });
  const result = await router.completeJson(input("plan.critique"), { provider: "override", mode: "auto" });
  assert.equal(result.ok, true);
  assert.equal(result.route.provider, "override");
});

test("4. router resolves task route before default", async () => {
  const router = new RekonLlmRouter({
    config: { defaultRoute: { provider: "def" }, routes: { "plan.critique": { provider: "task" } } },
    providers: [createMockLlmProvider({ id: "task" }), createMockLlmProvider({ id: "def" })],
  });
  const result = await router.completeJson(input("plan.critique"), { mode: "auto" });
  assert.equal(result.ok, true);
  assert.equal(result.route.provider, "task");
});

test("5. router returns fallback warning when mode auto has no provider", async () => {
  const router = new RekonLlmRouter();
  const result = await router.completeJson(input("artifact.summary"), { mode: "auto" });
  assert.equal(result.ok, false);
  assert.equal(result.route.mode, "auto");
  assert.ok(result.warnings.length > 0);
  assert.equal(result.error, "no-provider");
});

test("6. router returns hard error when mode required has no provider", async () => {
  const router = new RekonLlmRouter();
  const result = await router.completeJson(input(), { mode: "required" });
  assert.equal(result.ok, false);
  assert.equal(result.route.mode, "required");
  assert.equal(result.error, "semantic-required-no-provider");
});

test("7. router returns off/fallback when mode off", async () => {
  const router = createDisabledLlmRouter();
  const result = await router.completeJson(input(), { mode: "off" });
  assert.equal(result.ok, false);
  assert.equal(result.route.mode, "off");
  assert.equal(result.error, "semantic-off");
});

test("8. unknown provider blocks", async () => {
  const router = new RekonLlmRouter({ providers: [createMockLlmProvider({ id: "known" })] });
  const result = await router.completeJson(input(), { provider: "missing", mode: "auto" });
  assert.equal(result.ok, false);
  assert.ok(result.error.startsWith("unknown-provider:"));
});

test("9. provider ok:false propagates error", async () => {
  const router = new RekonLlmRouter({ providers: [createMockLlmProvider({ id: "err", error: "downstream" })] });
  const result = await router.completeJson(input(), { provider: "err", mode: "auto" });
  assert.equal(result.ok, false);
  assert.equal(result.error, "downstream");
});

test("10. embedding provider is separate and shape-compilable; coercePhaseDrafts gates output", async () => {
  const embedder = createMockEmbeddingProvider({ id: "e", vectors: [[1, 2], [3, 4]] });
  const embedded = await embedder.embed({ task: "plan.similarity", texts: ["a", "b"] });
  assert.equal(embedded.ok, true);
  assert.deepEqual(embedded.vectors, [[1, 2], [3, 4]]);
  // coercePhaseDrafts: accepts a non-empty array of objects, rejects everything else.
  assert.deepEqual(coercePhaseDrafts({ phases: [{ id: "p1" }] }), [{ id: "p1" }]);
  assert.equal(coercePhaseDrafts({ phases: [] }), null);
  assert.equal(coercePhaseDrafts({ phases: "nope" }), null);
  assert.equal(coercePhaseDrafts({ phases: [1, 2] }), null);
  assert.equal(coercePhaseDrafts(null), null);
});
