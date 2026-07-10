// @rekon/llm-provider — shared LLM provider routing foundation.
//
// This package provides the provider/embedding interfaces, a task-routed
// RekonLlmRouter with deterministic fallback, mock providers for tests, and
// LIVE adapters: createOpenAiLlmProvider (chat) and createVoyageEmbeddingProvider
// (embeddings). The live adapters call the network ONLY when constructed with
// an API key; model use is on by default when keys are present (operator
// ruling, 2026-07-09), with an explicit opt-out at the callers. Provider output is
// a PROPOSAL, not proof: callers must schema-validate and deterministically
// re-check every result before trusting it. Providers may read / transform /
// critique text only — they never approve plans, execute commands, write source
// files, run Circe, or implement intent:go. Those boundaries are enforced by the
// callers (CLI / capability builders), which keep provider output behind the
// existing non-executing plan-compiler gates.

// ---------------------------------------------------------------------------
// Completion provider interfaces
// ---------------------------------------------------------------------------

export type RekonLlmTask =
  | "plan.semantic-normalize"
  | "plan.answer-merge"
  | "plan.critique"
  | "plan.revision-prompt"
  | "artifact.summary"
  | "policy.debt-judgment"
  | "intent.classify";

export type RekonLlmProviderInput = {
  task: RekonLlmTask;
  schemaName: string;
  prompt: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  metadata?: Record<string, unknown>;
};

export type RekonLlmProviderUsage = {
  inputTokens?: number;
  outputTokens?: number;
};

export type RekonLlmProviderResult =
  | {
      ok: true;
      data: unknown;
      provider: string;
      model?: string;
      usage?: RekonLlmProviderUsage;
      warnings?: string[];
    }
  | {
      ok: false;
      provider: string;
      model?: string;
      error: string;
      warnings?: string[];
    };

export type RekonLlmProvider = {
  id: string;
  completeJson(input: RekonLlmProviderInput): Promise<RekonLlmProviderResult>;
};

// ---------------------------------------------------------------------------
// Embedding provider interfaces (separate from completions on purpose)
// ---------------------------------------------------------------------------

export type RekonEmbeddingTask = "code.embedding" | "plan.similarity" | "artifact.retrieval";

export type RekonEmbeddingProviderInput = {
  task: RekonEmbeddingTask;
  texts: string[];
  model?: string;
  metadata?: Record<string, unknown>;
};

export type RekonEmbeddingProviderResult =
  | {
      ok: true;
      vectors: number[][];
      provider: string;
      model?: string;
      usage?: unknown;
      warnings?: string[];
    }
  | {
      ok: false;
      provider: string;
      model?: string;
      error: string;
      warnings?: string[];
    };

export type RekonEmbeddingProvider = {
  id: string;
  embed(input: RekonEmbeddingProviderInput): Promise<RekonEmbeddingProviderResult>;
};

// ---------------------------------------------------------------------------
// Router model
// ---------------------------------------------------------------------------

export type RekonLlmMode = "off" | "auto" | "required";

export type RekonLlmRoute = {
  provider: string;
  model?: string;
  mode?: RekonLlmMode;
};

export type RekonLlmRouterConfig = {
  enabled?: boolean;
  defaultRoute?: RekonLlmRoute;
  routes?: Partial<Record<RekonLlmTask, RekonLlmRoute>>;
};

export type RekonLlmRouterOptions = {
  config?: RekonLlmRouterConfig;
  providers?: RekonLlmProvider[];
};

export type RekonLlmRouteOverride = {
  provider?: string;
  model?: string;
  mode?: RekonLlmMode;
};

export type RekonLlmResolvedRoute = {
  provider?: string;
  model?: string;
  mode: RekonLlmMode;
  task: RekonLlmTask;
};

export type RekonLlmRouterResult =
  | {
      ok: true;
      result: Extract<RekonLlmProviderResult, { ok: true }>;
      route: RekonLlmResolvedRoute & { provider: string };
    }
  | {
      ok: false;
      route: RekonLlmResolvedRoute;
      error: string;
      warnings: string[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Task-routed LLM router. Resolves a task to a provider/model/mode using the
 * priority order: CLI override → task-specific route → default route → fallback.
 * Provider output is never trusted directly; callers re-check it.
 */
export class RekonLlmRouter {
  private readonly config: RekonLlmRouterConfig;
  private readonly providers: Map<string, RekonLlmProvider>;

  constructor(options: RekonLlmRouterOptions = {}) {
    this.config = options.config ?? {};
    this.providers = new Map();
    for (const provider of options.providers ?? []) {
      if (provider && typeof provider.id === "string" && typeof provider.completeJson === "function") {
        this.providers.set(provider.id, provider);
      }
    }
  }

  resolveRoute(task: RekonLlmTask, override: RekonLlmRouteOverride = {}): RekonLlmResolvedRoute {
    const taskRoute = this.config.routes?.[task];
    const defaultRoute = this.config.defaultRoute;
    const provider = override.provider ?? taskRoute?.provider ?? defaultRoute?.provider;
    const model = override.model ?? taskRoute?.model ?? defaultRoute?.model;
    const mode = override.mode ?? taskRoute?.mode ?? defaultRoute?.mode ?? "auto";
    return { task, mode, ...(provider ? { provider } : {}), ...(model ? { model } : {}) };
  }

  async completeJson(input: RekonLlmProviderInput, override: RekonLlmRouteOverride = {}): Promise<RekonLlmRouterResult> {
    const route = this.resolveRoute(input.task, override);
    const { mode } = route;

    if (mode === "off") {
      return {
        ok: false,
        route,
        error: "semantic-off",
        warnings: ["Semantic normalization is off; using the deterministic path."],
      };
    }

    // A disabled router (config.enabled === false) behaves as if no provider is
    // available, regardless of route, so callers fall back / fail per mode.
    const disabled = this.config.enabled === false;
    const providerId = disabled ? undefined : route.provider;

    if (!providerId) {
      if (mode === "required") {
        return {
          ok: false,
          route,
          error: "semantic-required-no-provider",
          warnings: ["Semantic normalization is required but no provider route is available."],
        };
      }
      return {
        ok: false,
        route,
        error: "no-provider",
        warnings: ["Semantic normalization requested but no provider route was available; deterministic fallback."],
      };
    }

    const provider = this.providers.get(providerId);
    if (!provider) {
      const warning = `Unknown LLM provider "${providerId}".`;
      return {
        ok: false,
        route,
        error: `unknown-provider:${providerId}`,
        warnings: mode === "required" ? [warning] : [warning, "Deterministic fallback."],
      };
    }

    let result: RekonLlmProviderResult;
    try {
      result = await provider.completeJson({ ...input, model: route.model ?? input.model });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, route, error: `provider-threw:${message}`, warnings: [message] };
    }

    if (!result.ok) {
      return { ok: false, route, error: result.error, warnings: result.warnings ?? [] };
    }

    return { ok: true, result, route: { ...route, provider: providerId } };
  }
}

// ---------------------------------------------------------------------------
// Mock + disabled helpers (tests and the no-provider default)
// ---------------------------------------------------------------------------

export function createMockLlmProvider(options: {
  id?: string;
  model?: string;
  data?: unknown;
  error?: string;
  warnings?: string[];
} = {}): RekonLlmProvider {
  const id = options.id ?? "mock";
  return {
    id,
    async completeJson(input: RekonLlmProviderInput): Promise<RekonLlmProviderResult> {
      const model = input.model ?? options.model;
      if (typeof options.error === "string" && options.error.length > 0) {
        return {
          ok: false,
          provider: id,
          ...(model ? { model } : {}),
          error: options.error,
          ...(options.warnings ? { warnings: options.warnings } : {}),
        };
      }
      return {
        ok: true,
        provider: id,
        ...(model ? { model } : {}),
        data: options.data ?? null,
        ...(options.warnings ? { warnings: options.warnings } : {}),
      };
    },
  };
}

export function createMockEmbeddingProvider(options: {
  id?: string;
  model?: string;
  vectors?: number[][];
  error?: string;
} = {}): RekonEmbeddingProvider {
  const id = options.id ?? "mock-embedding";
  return {
    id,
    async embed(input: RekonEmbeddingProviderInput): Promise<RekonEmbeddingProviderResult> {
      const model = input.model ?? options.model;
      if (typeof options.error === "string" && options.error.length > 0) {
        return { ok: false, provider: id, ...(model ? { model } : {}), error: options.error };
      }
      const vectors = options.vectors ?? input.texts.map(() => [0]);
      return { ok: true, provider: id, ...(model ? { model } : {}), vectors };
    },
  };
}

/** A router that is permanently disabled — every route falls back / fails per mode. */
export function createDisabledLlmRouter(): RekonLlmRouter {
  return new RekonLlmRouter({ config: { enabled: false } });
}

/**
 * Coerce arbitrary provider output into a non-empty array of phase-draft
 * records. Returns null when the payload is not a usable `{ phases: object[] }`
 * shape. Callers use this as the schema gate before passing provider output to
 * a deterministic builder; the builder then re-checks each phase. This helper
 * is intentionally structural (no coupling to capability-model's phase type).
 */
export function coercePhaseDrafts(data: unknown): Record<string, unknown>[] | null {
  if (!isRecord(data)) return null;
  const phases = (data as { phases?: unknown }).phases;
  if (!Array.isArray(phases) || phases.length === 0) return null;
  if (!phases.every((phase) => isRecord(phase))) return null;
  return phases as Record<string, unknown>[];
}

// ---------------------------------------------------------------------------
// OpenAI-compatible provider adapter (fetch-based; no SDK dependency)
// ---------------------------------------------------------------------------
//
// This is the first real completion provider. It is built on the global `fetch`
// so this package keeps ZERO dependencies (no provider SDK, no audit/license
// churn). It targets the OpenAI-compatible Chat Completions API with a JSON
// response. The API key is supplied by the caller — the CLI / orchestration
// layer reads it from the environment and passes it in. This package never reads
// the environment and never stores a key. The provider's output is a PROPOSAL,
// not proof: callers schema-gate it (`coercePhaseDrafts`) and deterministically
// re-check it. Every failure path returns `{ ok: false, error }` — it never
// throws a raw error — so the router can fall back / fail per mode. With no API
// key it refuses cleanly (`missing-api-key`) and makes NO network call.

/** Minimal HTTP response shape this package relies on (a subset of fetch's Response). */
export type RekonHttpResponseLike = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
};

/** Minimal fetch shape this package relies on (a subset of the global fetch). */
export type RekonFetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: unknown },
) => Promise<RekonHttpResponseLike>;

export type CreateOpenAiLlmProviderOptions = {
  /** API key. Supplied by the CLI/orchestration layer from env; never stored in repo config. */
  apiKey?: string;
  /** API base URL (e.g. an OpenAI-compatible gateway). Defaults to the OpenAI v1 base. */
  baseUrl?: string;
  /** Provider id used for routing (defaults to "openai"). */
  id?: string;
  /** Model used when neither the route nor the input specifies one. */
  defaultModel?: string;
  /** Per-request timeout in milliseconds (defaults to 30000). */
  timeoutMs?: number;
  /** Inject a fetch implementation (tests). Defaults to globalThis.fetch. */
  fetchImpl?: RekonFetchLike;
};

type LlmGlobalLike = {
  fetch?: RekonFetchLike;
  AbortController?: new () => { signal: unknown; abort(): void };
  setTimeout?: (fn: () => void, ms: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
};

function truncateText(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function extractMessageContent(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0];
  if (!isRecord(first)) return null;
  const message = (first as { message?: unknown }).message;
  if (!isRecord(message)) return null;
  const content = (message as { content?: unknown }).content;
  return typeof content === "string" ? content : null;
}

function extractUsage(payload: unknown): RekonLlmProviderUsage | undefined {
  if (!isRecord(payload)) return undefined;
  const usage = (payload as { usage?: unknown }).usage;
  if (!isRecord(usage)) return undefined;
  const input = (usage as { prompt_tokens?: unknown }).prompt_tokens;
  const output = (usage as { completion_tokens?: unknown }).completion_tokens;
  const result: RekonLlmProviderUsage = {};
  if (typeof input === "number") result.inputTokens = input;
  if (typeof output === "number") result.outputTokens = output;
  return result.inputTokens === undefined && result.outputTokens === undefined ? undefined : result;
}

function extractModel(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;
  const model = (payload as { model?: unknown }).model;
  return typeof model === "string" && model.length > 0 ? model : undefined;
}

export function createOpenAiLlmProvider(options: CreateOpenAiLlmProviderOptions = {}): RekonLlmProvider {
  const id = options.id ?? "openai";
  const baseUrl = (
    typeof options.baseUrl === "string" && options.baseUrl.length > 0 ? options.baseUrl : "https://api.openai.com/v1"
  ).replace(/\/+$/, "");
  const apiKey = typeof options.apiKey === "string" ? options.apiKey.trim() : "";
  const timeoutMs = typeof options.timeoutMs === "number" && options.timeoutMs > 0 ? options.timeoutMs : 30000;

  return {
    id,
    async completeJson(input: RekonLlmProviderInput): Promise<RekonLlmProviderResult> {
      const model = input.model ?? options.defaultModel;
      const withModel = model ? { model } : {};

      // Boundary: no key → clean refusal, and NO network call.
      if (apiKey.length === 0) {
        return {
          ok: false,
          provider: id,
          ...withModel,
          error: "missing-api-key",
          warnings: [
            `No API key configured for provider "${id}"; set it via the CLI/orchestration env (it is never stored in repo config).`,
          ],
        };
      }

      const g = globalThis as unknown as LlmGlobalLike;
      const fetchImpl = options.fetchImpl ?? g.fetch;
      if (typeof fetchImpl !== "function") {
        return {
          ok: false,
          provider: id,
          ...withModel,
          error: "fetch-unavailable",
          warnings: ["No global fetch is available in this runtime."],
        };
      }

      const requestBody = JSON.stringify({
        model: model ?? "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You normalize rough software plans into structured phase drafts. Return only valid JSON for the requested schema. Preserve the author's meaning. Never invent file paths, commands, or acceptance criteria; leave unknown fields empty.",
          },
          { role: "user", content: input.prompt },
        ],
        temperature: typeof input.temperature === "number" ? input.temperature : 0,
        response_format: { type: "json_object" },
        ...(typeof input.maxOutputTokens === "number" ? { max_tokens: input.maxOutputTokens } : {}),
      });

      let controller: { signal: unknown; abort(): void } | undefined;
      let timer: unknown;
      try {
        if (typeof g.AbortController === "function" && typeof g.setTimeout === "function") {
          controller = new g.AbortController();
          timer = g.setTimeout(() => controller?.abort(), timeoutMs);
        }

        const response = await fetchImpl(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: requestBody,
          ...(controller ? { signal: controller.signal } : {}),
        });

        if (!response.ok) {
          let detail = "";
          try {
            detail = truncateText(await response.text(), 500);
          } catch {
            detail = "";
          }
          return {
            ok: false,
            provider: id,
            ...withModel,
            error: `http-${response.status}`,
            warnings: detail ? [detail] : [],
          };
        }

        let rawText: string;
        try {
          rawText = await response.text();
        } catch (error) {
          return {
            ok: false,
            provider: id,
            ...withModel,
            error: "response-read-failed",
            warnings: [error instanceof Error ? error.message : String(error)],
          };
        }

        let envelope: unknown;
        try {
          envelope = JSON.parse(rawText);
        } catch {
          return {
            ok: false,
            provider: id,
            ...withModel,
            error: "invalid-response-json",
            warnings: ["Provider response was not valid JSON."],
          };
        }

        const content = extractMessageContent(envelope);
        if (content === null) {
          return {
            ok: false,
            provider: id,
            ...withModel,
            error: "no-content",
            warnings: ["Provider response contained no message content."],
          };
        }

        let data: unknown;
        try {
          data = JSON.parse(content);
        } catch {
          return {
            ok: false,
            provider: id,
            ...withModel,
            error: "content-not-json",
            warnings: ["Provider message content was not valid JSON."],
          };
        }

        const resolvedModel = extractModel(envelope) ?? model;
        const usage = extractUsage(envelope);
        return {
          ok: true,
          provider: id,
          ...(resolvedModel ? { model: resolvedModel } : {}),
          data,
          ...(usage ? { usage } : {}),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const aborted = error instanceof Error && (error.name === "AbortError" || message.toLowerCase().includes("abort"));
        return {
          ok: false,
          provider: id,
          ...withModel,
          error: aborted ? "timeout" : "request-failed",
          warnings: [message],
        };
      } finally {
        if (timer !== undefined && typeof g.clearTimeout === "function") {
          g.clearTimeout(timer);
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Voyage embedding provider adapter (fetch-based; no SDK dependency)
// ---------------------------------------------------------------------------
//
// The first real embedding provider (Embedding Provider / Index Decision —
// Voyage selected for code-retrieval strength / legacy retrieval parity).
// Built on the injectable `RekonFetchLike` so this package keeps ZERO
// dependencies. It targets the Voyage `/embeddings` API. The API key is supplied
// by the caller (the CLI reads it from the environment and passes it in); this
// package never reads the environment and never stores a key. Embeddings are
// PROPOSAL/CONTEXT, not proof. Every failure path returns `{ ok: false, error }`
// — it never throws a raw provider error. With no API key it refuses cleanly
// (`missing-api-key`) and makes NO network call.

export type CreateVoyageEmbeddingProviderOptions = {
  /** API key. Supplied by the CLI/orchestration layer from env; never stored in repo config. */
  apiKey?: string;
  /** API base URL. Defaults to the Voyage v1 base. */
  baseUrl?: string;
  /** Provider id used for routing (defaults to "voyage"). */
  id?: string;
  /** Model used when the input does not specify one (defaults to voyage-code-3). */
  defaultModel?: string;
  /** Embedding dimensions hint (defaults to 1024); informational for the caller. */
  dimensions?: number;
  /** Voyage `input_type` (defaults to "document"). */
  inputType?: "document" | "query";
  /** Per-request timeout in milliseconds (defaults to 30000). */
  timeoutMs?: number;
  /** Inject a fetch implementation (tests). Defaults to globalThis.fetch. */
  fetchImpl?: RekonFetchLike;
};

export const VOYAGE_DEFAULT_MODEL = "voyage-code-3";
export const VOYAGE_DEFAULT_DIMENSIONS = 1024;

function extractEmbeddingVectors(payload: unknown): number[][] | null {
  if (!isRecord(payload)) return null;
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return null;
  const vectors: number[][] = [];
  for (const entry of data) {
    if (!isRecord(entry)) return null;
    const embedding = (entry as { embedding?: unknown }).embedding;
    if (!Array.isArray(embedding) || !embedding.every((value) => typeof value === "number")) return null;
    vectors.push(embedding as number[]);
  }
  return vectors;
}

export function createVoyageEmbeddingProvider(
  options: CreateVoyageEmbeddingProviderOptions = {},
): RekonEmbeddingProvider {
  const id = options.id ?? "voyage";
  const baseUrl = (
    typeof options.baseUrl === "string" && options.baseUrl.length > 0 ? options.baseUrl : "https://api.voyageai.com/v1"
  ).replace(/\/+$/, "");
  const apiKey = typeof options.apiKey === "string" ? options.apiKey.trim() : "";
  const timeoutMs = typeof options.timeoutMs === "number" && options.timeoutMs > 0 ? options.timeoutMs : 30000;
  const inputType = options.inputType ?? "document";

  return {
    id,
    async embed(input: RekonEmbeddingProviderInput): Promise<RekonEmbeddingProviderResult> {
      const model = input.model ?? options.defaultModel ?? VOYAGE_DEFAULT_MODEL;
      const withModel = { model };

      // Boundary: no key → clean refusal, and NO network call.
      if (apiKey.length === 0) {
        return {
          ok: false,
          provider: id,
          ...withModel,
          error: "missing-api-key",
          warnings: [
            `No API key configured for provider "${id}"; set it via the CLI/orchestration env (it is never stored in repo config).`,
          ],
        };
      }

      const texts = Array.isArray(input.texts) ? input.texts.filter((text) => typeof text === "string") : [];
      if (texts.length === 0) {
        return { ok: true, provider: id, ...withModel, vectors: [] };
      }

      const g = globalThis as unknown as LlmGlobalLike;
      const fetchImpl = options.fetchImpl ?? g.fetch;
      if (typeof fetchImpl !== "function") {
        return {
          ok: false,
          provider: id,
          ...withModel,
          error: "fetch-unavailable",
          warnings: ["No global fetch is available in this runtime."],
        };
      }

      const requestBody = JSON.stringify({ model, input: texts, input_type: inputType });

      let controller: { signal: unknown; abort(): void } | undefined;
      let timer: unknown;
      try {
        if (typeof g.AbortController === "function" && typeof g.setTimeout === "function") {
          controller = new g.AbortController();
          timer = g.setTimeout(() => controller?.abort(), timeoutMs);
        }

        const response = await fetchImpl(`${baseUrl}/embeddings`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: requestBody,
          ...(controller ? { signal: controller.signal } : {}),
        });

        if (!response.ok) {
          let detail = "";
          try {
            detail = truncateText(await response.text(), 500);
          } catch {
            detail = "";
          }
          return { ok: false, provider: id, ...withModel, error: `http-${response.status}`, warnings: detail ? [detail] : [] };
        }

        let rawText: string;
        try {
          rawText = await response.text();
        } catch (error) {
          return {
            ok: false,
            provider: id,
            ...withModel,
            error: "response-read-failed",
            warnings: [error instanceof Error ? error.message : String(error)],
          };
        }

        let envelope: unknown;
        try {
          envelope = JSON.parse(rawText);
        } catch {
          return { ok: false, provider: id, ...withModel, error: "invalid-response-json", warnings: ["Provider response was not valid JSON."] };
        }

        const vectors = extractEmbeddingVectors(envelope);
        if (vectors === null) {
          return { ok: false, provider: id, ...withModel, error: "no-embeddings", warnings: ["Provider response contained no usable embeddings."] };
        }
        if (vectors.length !== texts.length) {
          return {
            ok: false,
            provider: id,
            ...withModel,
            error: "embedding-count-mismatch",
            warnings: [`Expected ${texts.length} embeddings, received ${vectors.length}.`],
          };
        }

        const resolvedModel = extractModel(envelope) ?? model;
        return { ok: true, provider: id, model: resolvedModel, vectors };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const aborted = error instanceof Error && (error.name === "AbortError" || message.toLowerCase().includes("abort"));
        return { ok: false, provider: id, ...withModel, error: aborted ? "timeout" : "request-failed", warnings: [message] };
      } finally {
        if (timer !== undefined && typeof g.clearTimeout === "function") {
          g.clearTimeout(timer);
        }
      }
    },
  };
}
