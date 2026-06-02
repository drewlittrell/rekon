// @rekon/llm-provider unit tests. Provider/router/mock behavior, no network.

import assert from "node:assert/strict";
import test from "node:test";
import {
  RekonLlmRouter,
  createMockLlmProvider,
  createMockEmbeddingProvider,
  createDisabledLlmRouter,
  coercePhaseDrafts,
  createOpenAiLlmProvider,
} from "../dist/index.js";

const input = (task = "plan.semantic-normalize") => ({ task, schemaName: "Test", prompt: "x" });

// A fake fetch returning a canned OpenAI chat-completions envelope (no network).
const okEnvelope = (data, model = "gpt-test") => ({
  ok: true,
  status: 200,
  async text() {
    return JSON.stringify({
      model,
      choices: [{ message: { content: JSON.stringify(data) } }],
      usage: { prompt_tokens: 5, completion_tokens: 7 },
    });
  },
});
const statusEnvelope = (status) => ({ ok: false, status, async text() { return "error body"; } });
const fakeFetch = (response) => async () => response;

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

// --- Real provider: OpenAI-compatible fetch adapter (slice 139, no network) ---

test("11. createOpenAiLlmProvider factory exists and defaults its id to openai", () => {
  assert.equal(typeof createOpenAiLlmProvider, "function");
  assert.equal(createOpenAiLlmProvider().id, "openai");
  assert.equal(createOpenAiLlmProvider({ id: "openai-compat" }).id, "openai-compat");
});

test("12. provider blocks cleanly with no API key and makes no network call", async () => {
  const provider = createOpenAiLlmProvider({
    fetchImpl: () => {
      throw new Error("fetch must not be called without a key");
    },
  });
  const result = await provider.completeJson(input());
  assert.equal(result.ok, false); // resolved, did not throw, never fetched
});

test("13. missing-key result error is missing-api-key", async () => {
  const result = await createOpenAiLlmProvider({}).completeJson(input());
  assert.equal(result.ok, false);
  assert.equal(result.error, "missing-api-key");
});

test("14. provider does not throw a raw error for a missing key", async () => {
  await assert.doesNotReject(() => createOpenAiLlmProvider({}).completeJson(input()));
});

test("15. provider is registerable in the router by id and routes a keyed call", async () => {
  const provider = createOpenAiLlmProvider({ apiKey: "k", fetchImpl: fakeFetch(okEnvelope({ phases: [{ id: "p" }] })) });
  const router = new RekonLlmRouter({ providers: [provider] });
  const result = await router.completeJson(input(), { provider: "openai", mode: "auto" });
  assert.equal(result.ok, true);
  assert.equal(result.route.provider, "openai");
});

test("16. router required mode with a missing-key provider fails cleanly", async () => {
  const router = new RekonLlmRouter({ providers: [createOpenAiLlmProvider({})] });
  const result = await router.completeJson(input(), { provider: "openai", mode: "required" });
  assert.equal(result.ok, false);
  assert.equal(result.error, "missing-api-key");
});

test("17. router auto mode with a missing-key provider falls back cleanly", async () => {
  const router = new RekonLlmRouter({ providers: [createOpenAiLlmProvider({})] });
  const result = await router.completeJson(input(), { provider: "openai", mode: "auto" });
  assert.equal(result.ok, false);
  assert.equal(result.error, "missing-api-key");
});

test("18. keyed provider parses a JSON-object completion into usable data", async () => {
  const provider = createOpenAiLlmProvider({ apiKey: "k", fetchImpl: fakeFetch(okEnvelope({ phases: [{ id: "p1" }, { id: "p2" }] }, "gpt-x")) });
  const result = await provider.completeJson(input());
  assert.equal(result.ok, true);
  assert.equal(result.model, "gpt-x");
  assert.deepEqual(coercePhaseDrafts(result.data), [{ id: "p1" }, { id: "p2" }]);
  assert.equal(result.usage.inputTokens, 5);
  assert.equal(result.usage.outputTokens, 7);
});

test("19. keyed provider returns a clean http-<status> error, never throwing", async () => {
  const provider = createOpenAiLlmProvider({ apiKey: "k", fetchImpl: fakeFetch(statusEnvelope(500)) });
  const result = await provider.completeJson(input());
  assert.equal(result.ok, false);
  assert.equal(result.error, "http-500");
});

test("20. keyed provider returns content-not-json when the message body is not JSON", async () => {
  const badEnvelope = { ok: true, status: 200, async text() { return JSON.stringify({ choices: [{ message: { content: "not json" } }] }); } };
  const provider = createOpenAiLlmProvider({ apiKey: "k", fetchImpl: fakeFetch(badEnvelope) });
  const result = await provider.completeJson(input());
  assert.equal(result.ok, false);
  assert.equal(result.error, "content-not-json");
});
