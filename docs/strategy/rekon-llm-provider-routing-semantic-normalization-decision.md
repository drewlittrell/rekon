# Rekon LLM Provider Routing / Semantic Normalization Decision

Status: decision (strategy/architecture). Decision-only — no provider
implementation in this batch.

> **Implemented (slice 138):** the shared router shipped as `@rekon/llm-provider`
> (interfaces, `RekonLlmRouter`, mock, `coercePhaseDrafts`) and is wired into
> `rekon intent plan review` via `--llm-provider` / `--llm-model` — no live
> provider yet, providers stay proposal-not-proof — see
> [`rekon-llm-provider-routing-implementation.md`](./rekon-llm-provider-routing-implementation.md).

## Context

The [classic intent plan compiler / elicitation parity decision](./classic-intent-plan-compiler-elicitation-parity-decision.md)
put LLM-backed semantic normalization **in scope** but shipped only an
**injectable, provenance-tagged semantic-normalization adapter with provider
wiring deferred**. That was the right tactical move: it let Rekon ship a
deterministic-first plan compiler (`rekon intent plan review`,
`rekon intent plan answer`) without dragging in a model/provider subsystem.

We now know semantic parsing is needed in **several** places, not one. Wiring a
live model directly into `IntentPlanActionabilityReport` logic would bolt a
one-off provider onto a single command and repeat that wiring everywhere
semantic help is needed. Instead, provider routing should become a **shared
Rekon capability**, with the model's output staying inside the same
non-executing plan-compiler boundary.

This document decides that shared architecture. It does **not** implement
providers; implementation is the recommended follow-on.

## Decision

**Selected: Option B — a shared provider router with task-specific routes and
injected adapters.**

Direct LLM calls do **not** go inside `IntentPlanActionabilityReport` logic (or
any capability builder). A small provider/routing layer sits above the pure
builders:

```
CLI / orchestration layer
→ provider router            (resolves task → route → provider)
→ selected model provider    (openai / anthropic / google / local / mock)
→ schema-constrained semantic result
→ deterministic validator / actionability engine   (re-checks everything)
→ artifact report
```

The model helps with **interpretation, normalization, critique, question
generation, and summarization**. The model is **never** the source of truth for
**approval, proof, execution, source writes, handoff gates, or `intent:go`**.

## Why now

Semantic parsing is needed in multiple places. At minimum:

1. **`intent plan review`** — rough/prose plan → phase drafts, findings,
   questions, revision prompt.
2. **`intent plan answer`** — messy answers → objective / paths / commands /
   acceptance criteria / clarifications.
3. **prepare integration** — preserve semantic provenance when an answered
   report feeds `PreparedIntentPlan`.
4. **plan / bundle docs** — human-readable summaries and agent-handoff copy.
5. **release / migration / architecture doc generation** — summarization, not
   proof.

Potentially later: **embeddings / semantic retrieval** (codebase-intel used
embeddings; audited separately, but routing should leave room for embedding
providers), **intent triage** (classify feature / bug / refactor / migration /
documentation), and **source-evidence summarization** (summarize snippets
without inventing touched paths or proof).

Dogfooding the final operator path on real rough plans while knowingly using a
deterministic-only compiler would fail on exactly the inputs operators bring.
The next quality jump is semantic normalization with switchable providers — so
the provider decision comes first.

## Boundaries

These are non-negotiable and carry forward every existing plan-compiler
boundary:

- LLM providers **may** read / transform / critique text.
- LLM providers **may not** approve plans.
- LLM providers **may not** execute commands.
- LLM providers **may not** write source files.
- LLM providers **may not** run Circe.
- LLM providers **may not** implement `intent:go`.
- **LLM output is proposal, not proof.**
- **LLM output must be schema-validated and deterministically re-checked.**

## Provider model

Completion providers and embedding providers are **separate** — they have
different safety, caching, cost, and storage implications and must not be mixed.

```ts
type RekonLlmTask =
  | "plan.semantic-normalize"
  | "plan.answer-merge"
  | "plan.critique"
  | "plan.revision-prompt"
  | "artifact.summary"
  | "intent.classify";

type RekonLlmProvider = {
  id: string;
  completeJson(input: {
    task: RekonLlmTask;
    schemaName: string;
    prompt: string;
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
    metadata?: Record<string, unknown>;
  }): Promise<{
    ok: boolean;
    data?: unknown;          // schema-validated by the caller; proposal, not proof
    provider: string;
    model?: string;
    usage?: { inputTokens?: number; outputTokens?: number };
    error?: string;
  }>;
};

type RekonEmbeddingProvider = {
  id: string;
  embed(input: {
    task: "code.search" | "plan.similarity" | "artifact.retrieval";
    texts: string[];
    model?: string;
  }): Promise<{
    vectors: number[][];
    provider: string;
    model?: string;
    usage?: unknown;
  }>;
};
```

A `RekonLlmRouter` resolves a `RekonLlmTask` to a configured route, selects the
provider, and returns a provider-bound call. The router — not any builder — owns
provider selection, fallback, and provenance logging.

## Task routes

Routes are configured per task, not hard-coded. Minimum (completion) routes:

```
plan.semantic-normalize
plan.answer-merge
plan.critique
plan.revision-prompt
artifact.summary
intent.classify
```

Later (embedding / retrieval) routes:

```
code.embedding
plan.similarity
artifact.retrieval
```

## Provider routing and config

Routing priority is **CLI flags → repo config → environment defaults →
built-in disabled/fallback**.

Repo config stores only provider IDs, model names, and route policy. **Secrets
never live in repo config**; API keys come from environment variables.

```json
{
  "llm": {
    "enabled": false,
    "defaultRoute": "local",
    "routes": {
      "plan.semantic-normalize": { "provider": "anthropic", "model": "configured-in-env", "mode": "explicit" },
      "plan.answer-merge":       { "provider": "openai",    "model": "configured-in-env", "mode": "explicit" },
      "artifact.summary":        { "provider": "local",     "model": "configured-in-env", "mode": "auto" }
    },
    "privacy": {
      "sendSourceFiles": false,
      "sendPlanText": true,
      "sendArtifactSummaries": true
    }
  }
}
```

The artifact records the **resolved** provider/model, never secrets.

## CLI controls

Per-command overrides extend the existing `--semantic` flag:

```bash
rekon intent plan review \
  --plan ./plans/foo.md \
  --semantic off|auto|required \
  --llm-provider openai|anthropic|google|local \
  --llm-model <model> \
  --json

rekon intent plan answer \
  --report <ref> \
  --answers answers.json \
  --semantic off|auto|required \
  --llm-provider <provider> \
  --json
```

Semantic-mode behavior:

- `--semantic off` — deterministic only.
- `--semantic auto` — use the provider only if configured and allowed; otherwise
  fall back to deterministic with a recorded warning.
- `--semantic required` — fail clearly if the provider is unavailable or schema
  validation fails.

## Safety model

Provider output is treated as a **proposal**, never proof. Every LLM result is:

- **schema-validated** against the named schema,
- **provenance-tagged** (method / provider / model),
- **source-evidence-linked** when possible,
- **deterministically re-checked** by the same actionability/validator engine
  the deterministic path uses,
- **blocked** if it invents paths / commands / acceptance criteria without
  support.

The report records provenance on `normalizationTrace`. When a provider runs:

```json
{
  "normalizationTrace": {
    "method": "semantic-llm",
    "provider": "openai",
    "model": "configured-model",
    "provenance": "semantic-llm",
    "warnings": [
      "Model output was schema-validated.",
      "No commands were executed.",
      "No source files were written."
    ]
  }
}
```

When no provider route is available (and mode is not `required`):

```json
{
  "normalizationTrace": {
    "method": "deterministic-fallback",
    "invokedSemanticNormalization": false,
    "warnings": [
      "Semantic normalization requested but no provider route was available."
    ]
  }
}
```

## Package placement

Providers do **not** live in `capability-model`. The split keeps the core pure
and testable:

```
packages/llm-provider
  provider interface (RekonLlmProvider, RekonEmbeddingProvider)
  RekonLlmRouter + route resolution
  config normalization
  fake / mock provider (for tests)
  provider adapters (added incrementally)

packages/capability-model
  pure builders
  accepts an optional injected semantic adapter
  no environment reads, no network calls

packages/cli
  reads config / env
  chooses the provider via the router
  injects a router-bound adapter into the builder
```

The builder API is unchanged in spirit:

```ts
buildIntentPlanActionabilityReport({
  planText,
  semanticMode,
  semanticNormalization: optionalAdapter   // injected by the CLI / provider router
})
```

## Relationship to what already ships

The injectable seam already exists and is **preserved**, not replaced:

- `@rekon/capability-model` already exports
  `IntentPlanSemanticNormalizationAdapter`
  (`(input: { planText, goal?, kind? }) → { phases, warnings?, model?, provider? }`),
  `IntentPlanSemanticMode` (`off | auto | required`), and a `normalizationTrace`
  with provenance + deterministic fallback. `buildIntentPlanActionabilityReport`
  already accepts `semanticNormalization` + `semanticMode`.
- `rekon intent plan review` already exposes `--semantic off|auto|required` and
  falls back to deterministic parsing with a warning when no provider is wired.

What is **new** in this decision: the shared `RekonLlmRouter` + provider/embedding
interfaces, the task-route config + env + `--llm-provider` / `--llm-model`
resolution, and the rule that `intent plan answer` (and future summarizers)
consume the **same** router rather than each growing its own adapter. The
existing single-task adapter becomes one router-bound consumer among several.

## Provider candidates and implementation order

Evaluate `openai`, `anthropic`, `google`, `local`, and `mock/fake`. Do **not**
build five untested adapters to feel flexible. Implementation order:

1. provider interface + mock/fake provider,
2. one real hosted provider adapter (whichever is actually used in dogfood),
3. a second provider adapter,
4. a local adapter if useful,
5. the embedding provider interface.

## Options considered

- **Option A — one-off LLM call inside `intent plan review`.** Rejected:
  repeats provider wiring per command, couples a builder to env/network, and
  makes the core impure and hard to test.
- **Option B — shared provider router with task routes + injected adapters.**
  **Selected.** One routing capability; pure builders; switchable providers;
  uniform provenance and safety.
- **Option C — LLM-first normalization (no deterministic baseline).** Rejected
  (carried from the classic decision): non-determinism without a cheap
  deterministic check; output must always be re-validated deterministically.
- **Option D — embeddings folded into the completion provider.** Rejected:
  different safety/caching/cost/storage; embeddings get a separate interface.

## What this changes in the roadmap

Provider routing is **infrastructure**, but provider output stays inside the
same non-executing plan-compiler boundary. To avoid a long micro-slice tail, the
revised sequence is three slices, not ten:

1. **Rekon LLM Provider Routing / Semantic Normalization Decision** (this batch).
2. **Rekon LLM Provider Routing Implementation** — provider interfaces, router,
   mock provider, config/env/CLI override model, and provider injection into
   plan review and plan answer, with no change to safety boundaries.
3. **Intent Plan Compiler Semantic Normalization Integration / Dogfood** — prove
   the semantic path end-to-end (and re-run the fresh-repo / Circe dogfood on
   real rough plans).

## Recommended next

**Rekon LLM Provider Routing Implementation** — add the provider/embedding
interfaces, the `RekonLlmRouter`, a mock provider, the config/env/CLI override
model, and router-bound adapter injection into `intent plan review` and
`intent plan answer` — without changing any safety boundary. Do not start it
without a new confirmed Work Order against the new SHA.

## Related

- Revisits: [classic-intent-plan-compiler-elicitation-parity-decision.md](./classic-intent-plan-compiler-elicitation-parity-decision.md)
  (the "provider wiring deferred" decision).
- Consumers: [intent-plan-actionability-report-implementation.md](./intent-plan-actionability-report-implementation.md),
  [plan-actionability-answer-merge-back-implementation.md](./plan-actionability-answer-merge-back-implementation.md).
- Concepts: [intent-plan-compiler.md](../concepts/intent-plan-compiler.md).
- Artifact: [intent-plan-actionability-report.md](../artifacts/intent-plan-actionability-report.md).
- Review packet: [rekon-llm-provider-routing-semantic-normalization-decision.md](../../.rekon-dev/review-packets/rekon-llm-provider-routing-semantic-normalization-decision.md).
