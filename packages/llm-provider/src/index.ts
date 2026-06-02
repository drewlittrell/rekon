// @rekon/llm-provider — shared LLM provider routing foundation.
//
// This package provides the provider/embedding interfaces, a task-routed
// RekonLlmRouter with deterministic fallback, and a mock provider for tests.
// It contains NO live providers and makes NO network calls. Provider output is
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
