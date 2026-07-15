// @rekon/llm-provider unit tests. Provider/router/mock behavior, no network.

import assert from "node:assert/strict";
import test from "node:test";
import {
  RekonLlmRouter,
  createMockLlmProvider,
  createMockEmbeddingProvider,
  createDisabledLlmRouter,
  coercePhaseDrafts,
  createAnthropicLlmProvider,
  createOpenAiLlmProvider,
  createOpenAiResponsesLlmProvider,
  createVoyageEmbeddingProvider,
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

test("21. OpenAI Responses adapter sends schema and effort and captures detailed usage", async () => {
  let request;
  const provider = createOpenAiResponsesLlmProvider({
    apiKey: "k",
    fetchImpl: async (url, init) => {
      request = { url, init, body: JSON.parse(init.body) };
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            model: "gpt-5.4-nano-2026-03-17",
            output: [{ type: "message", content: [{ type: "output_text", text: '{"concerns":[]}' }] }],
            usage: {
              input_tokens: 41,
              output_tokens: 13,
              input_tokens_details: { cached_tokens: 5, cache_write_tokens: 2 },
              output_tokens_details: { reasoning_tokens: 7 },
            },
          });
        },
      };
    },
  });
  const result = await provider.completeJson({
    ...input("policy.debt-judgment"),
    schemaName: "Semantic Debt Result",
    effort: "low",
    maxOutputTokens: 1200,
    jsonSchema: { type: "object", properties: { concerns: { type: "array" } }, required: ["concerns"] },
  });
  assert.equal(result.ok, true);
  assert.equal(request.url, "https://api.openai.com/v1/responses");
  assert.equal(request.body.reasoning.effort, "low");
  assert.equal(request.body.text.format.type, "json_schema");
  assert.equal(request.body.text.format.name, "Semantic_Debt_Result");
  assert.equal(request.body.temperature, undefined);
  assert.deepEqual(result.data, { concerns: [] });
  assert.deepEqual(result.usage, {
    inputTokens: 41,
    outputTokens: 13,
    reasoningTokens: 7,
    cachedInputTokens: 5,
    cacheWriteInputTokens: 2,
  });
});

test("22. Anthropic adapter uses Messages structured output without temperature", async () => {
  let request;
  const provider = createAnthropicLlmProvider({
    apiKey: "k",
    fetchImpl: async (url, init) => {
      request = { url, init, body: JSON.parse(init.body) };
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            model: "claude-sonnet-5",
            content: [{ type: "text", text: '{"concerns":[]}' }],
            usage: {
              input_tokens: 53,
              output_tokens: 11,
              cache_read_input_tokens: 3,
              cache_creation_input_tokens: 2,
            },
          });
        },
      };
    },
  });
  const jsonSchema = {
    type: "object",
    properties: {
      concerns: { type: "array" },
      confidence: { type: "number", minimum: 0, maximum: 1 },
    },
    required: ["concerns"],
  };
  const result = await provider.completeJson({
    ...input("policy.debt-judgment"),
    model: "claude-sonnet-5",
    temperature: 0,
    effort: "low",
    maxOutputTokens: 1200,
    jsonSchema,
  });
  assert.equal(result.ok, true);
  assert.equal(request.url, "https://api.anthropic.com/v1/messages");
  assert.equal(request.init.headers["anthropic-version"], "2023-06-01");
  assert.equal(request.body.temperature, undefined);
  assert.equal(request.body.output_config.effort, "low");
  assert.equal(request.body.output_config.format.type, "json_schema");
  assert.deepEqual(request.body.output_config.format.schema.properties.confidence, { type: "number" });
  assert.deepEqual(jsonSchema.properties.confidence, { type: "number", minimum: 0, maximum: 1 });
  assert.deepEqual(result.data, { concerns: [] });
  assert.deepEqual(result.usage, {
    inputTokens: 53,
    outputTokens: 11,
    cachedInputTokens: 3,
    cacheWriteInputTokens: 2,
  });
});

test("23. Anthropic adapter blocks cleanly without a key", async () => {
  let called = false;
  const provider = createAnthropicLlmProvider({
    fetchImpl: async () => {
      called = true;
      throw new Error("must not call");
    },
  });
  const result = await provider.completeJson(input());
  assert.equal(result.ok, false);
  assert.equal(result.error, "missing-api-key");
  assert.equal(called, false);
});

test("24. Voyage adapter batches large embedding inputs and preserves vector order", async () => {
  const requestSizes = [];
  const provider = createVoyageEmbeddingProvider({
    apiKey: "k",
    dimensions: 2,
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(init.body);
      requestSizes.push(body.input.length);
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            model: "voyage-4",
            data: body.input.map((text, index) => ({
              embedding: [Number(text.slice(1)), index],
            })),
            usage: { total_tokens: body.input.length },
          });
        },
      };
    },
  });
  const texts = Array.from({ length: 1_001 }, (_, index) => `t${index}`);

  const result = await provider.embed({ task: "code.embedding", texts, dimensions: 2 });

  assert.equal(result.ok, true);
  assert.deepEqual(requestSizes, [1_000, 1]);
  assert.equal(result.vectors.length, texts.length);
  assert.equal(result.vectors[0][0], 0);
  assert.equal(result.vectors.at(-1)[0], 1_000);
  assert.deepEqual(result.usage, { totalTokens: 1_001 });
});

test("25. Voyage adapter also bounds aggregate UTF-8 payload size", async () => {
  const requestSizes = [];
  const provider = createVoyageEmbeddingProvider({
    apiKey: "k",
    dimensions: 1,
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(init.body);
      requestSizes.push(body.input.length);
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            data: body.input.map(() => ({ embedding: [1] })),
          });
        },
      };
    },
  });

  const result = await provider.embed({
    task: "code.embedding",
    texts: ["a".repeat(60_000), "b".repeat(60_000)],
    dimensions: 1,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(requestSizes, [1, 1]);
  assert.deepEqual(result.vectors, [[1], [1]]);
});

test("26. Voyage adapter returns no partial vectors when a later batch fails", async () => {
  let calls = 0;
  const provider = createVoyageEmbeddingProvider({
    apiKey: "k",
    dimensions: 1,
    fetchImpl: async (_url, init) => {
      calls += 1;
      const body = JSON.parse(init.body);
      if (calls === 2) {
        return { ok: false, status: 429, async text() { return "rate limited"; } };
      }
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({ data: body.input.map(() => ({ embedding: [1] })) });
        },
      };
    },
  });

  const result = await provider.embed({
    task: "code.embedding",
    texts: Array.from({ length: 1_001 }, (_, index) => `t${index}`),
    dimensions: 1,
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "http-429");
  assert.equal(calls, 2);
  assert.match(result.warnings[0], /batch 2\/2 failed/i);
});
