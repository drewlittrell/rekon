# Intent Plan Compiler Semantic Normalization / Dogfood

Status: implemented (slice 139). Base: `8d1171a`. Follows
[`rekon-llm-provider-routing-implementation.md`](./rekon-llm-provider-routing-implementation.md)
(the shared router) and the
[provider routing decision](./rekon-llm-provider-routing-semantic-normalization-decision.md).

This slice wires the **first real completion provider** behind the shared
`RekonLlmRouter` and dogfoods the plan-compiler semantic path.

> **Re-dogfooded end-to-end (slice 140):** semantic mode was re-run through the
> full fresh-repo operator path (review → answer → prepare → approve → status →
> handoff → bundle) and the bundle imported into a local Circe checkout — see
> [`fresh-repo-intent-handoff-circe-dogfood-review-semantic.md`](./fresh-repo-intent-handoff-circe-dogfood-review-semantic.md). It proves the
provider-router seam can carry real semantic normalization **without weakening
any Rekon boundary**: the model proposes phase drafts; the deterministic
actionability engine remains the authority.

## What shipped

- A real, **fetch-based OpenAI-compatible provider** —
  `createOpenAiLlmProvider(...)` in `@rekon/llm-provider`. It uses the global
  `fetch` and adds **no SDK dependency**, so `@rekon/llm-provider` stays a pure,
  zero-dependency package. It targets the Chat Completions API with a JSON
  response.
- CLI provider registration in `rekon intent plan review`: the OpenAI provider
  is registered behind the router, and the API key is read **from the
  environment by the CLI/orchestration layer only** — never inside
  `@rekon/capability-model`, and never stored in repo config.
- A bounded `plan.semantic-normalize` prompt that includes the plan text, goal,
  and kind, and instructs the model to preserve meaning, to not invent file
  paths or commands, and to leave unknown fields empty.

## How to select a provider

Semantic normalization can use a routed provider. Provider selection uses
`--llm-provider` / `--llm-model`, and the equivalent environment variables can
select provider/model:

```bash
# Flags (these win):
rekon intent plan review --plan ./plans/rough.md --goal "..." \
  --semantic auto|required --llm-provider openai --llm-model <model>

# Environment (the CLI reads these):
export REKON_LLM_PROVIDER=openai
export REKON_LLM_MODEL=<model>
export REKON_LLM_ENABLED=1        # enables a configured default route
export OPENAI_API_KEY=<secret>    # the key — read from env, never repo config
export REKON_LLM_BASE_URL=<url>   # optional OpenAI-compatible gateway
```

Selecting a provider explicitly (`--llm-provider` / `REKON_LLM_PROVIDER`) enables
the router for that call; `REKON_LLM_ENABLED` enables a configured default route.
**API keys are not stored in repo config** — repo config holds only provider ids,
model names, and route policy. The artifact records the resolved provider/model,
never the key.

## Semantic modes

- `--semantic off` is deterministic — no provider is consulted.
- `--semantic auto` falls back when unavailable — if no provider/key is
  configured (or the result is unusable), it records a `deterministic-fallback`
  warning and uses deterministic parsing, and still writes a report.
- `--semantic required` fails when unavailable — if no usable provider result is
  available, the build rejects, the CLI exits non-zero, and **no report is
  written** (the write happens only after a successful build).

## Safety model (unchanged)

The boundary is identical to the decision and the slice-138 implementation:

- **LLM output is proposal, not proof.**
- **LLM output is schema-validated and deterministically re-checked** — provider
  output is gated by `coercePhaseDrafts` and then re-run through the same
  `evaluatePlanPhases` actionability evaluator the deterministic path uses.
- Semantic normalization **executes no commands**.
- Semantic normalization **writes no source files**.
- Semantic normalization **runs no Circe**.
- `intent:go` remains deferred.
- The provider may read / transform / critique text only; it never approves
  plans, creates a `PreparedIntentPlan` / `WorkOrder` / `VerificationPlan` /
  `VerificationRun` / `VerificationResult`, or implements `intent:go`.

The provider itself is defensive: with no API key it refuses cleanly
(`missing-api-key`) and makes **no network call**; every failure path returns
`{ ok: false, error }` rather than throwing, so the router falls back (`auto`) or
fails (`required`) per mode.

## No-key dogfood

On a fresh repo with a rough plan, with the OpenAI provider registered but **no
`OPENAI_API_KEY`**:

| Command | Result |
| --- | --- |
| `scan` | exit 0 |
| `intent plan review --semantic off` | deterministic report written |
| `intent plan review --semantic auto --llm-provider openai` | `deterministic-fallback` report written, with a warning |
| `intent plan review --semantic required --llm-provider openai` | non-zero exit, **no** report written |
| `artifacts validate` | clean |
| plan + source files | unchanged |

No `PreparedIntentPlan` / `WorkOrder` / `VerificationPlan` / `VerificationRun` /
`VerificationResult` is produced. This is the default, key-free behavior and is
what the test suite enforces.

## Live dogfood

The live path (a real provider call) runs only when an operator explicitly opts
in: `REKON_RUN_LIVE_LLM_TESTS=1` **and** a provider key present. In that case
`--semantic required --llm-provider openai` produces a `semantic-llm`
`normalizationTrace` (with the resolved provider/model), and the report is still
deterministically re-checked into the same actionability findings — the model
never bypasses validation. Tests never require a key and never make a network
call by default.

## Tests / verification

- `packages/llm-provider/test/llm-provider.test.mjs` — the provider factory, the
  clean missing-key refusal (no network), router registration, and `auto` /
  `required` behavior with a missing-key provider; plus offline success / HTTP
  error / non-JSON parsing via an injected fetch.
- `tests/contract/intent-plan-review-semantic-normalization.test.mjs` — the CLI
  off / auto-fallback / required-hard matrix with the real provider but no key,
  a helper-level `semantic-llm` trace from `createOpenAiLlmProvider` (injected
  fetch), the deterministic re-check, invalid-output fallback/block, and the
  no-downstream / no-source-write boundary.
- `tests/docs/intent-plan-semantic-normalization.test.mjs` — pins the documented
  selection, modes, and boundary.

## Is semantic normalization now usable with routed providers?

Yes. The router seam carries a real provider end-to-end into the plan compiler.
With a key, semantic normalization improves phase drafts for rough plans; with no
key it falls back or fails cleanly per mode. In every case the deterministic
re-check stays authoritative and the prepare / prove / package boundary is
preserved.

## Next step

The recommended follow-on is **Fresh Repo Intent Handoff / Circe Dogfood
Review** — run the operator-facing path against a real-ish repo and Circe
environment using semantic normalization where available, record usability gaps,
and decide what remains before npm publish / broader v1 release. Do not start it
without a new confirmed Work Order against the new SHA.

## Related

- Router implementation: [`rekon-llm-provider-routing-implementation.md`](./rekon-llm-provider-routing-implementation.md)
- Decision: [`rekon-llm-provider-routing-semantic-normalization-decision.md`](./rekon-llm-provider-routing-semantic-normalization-decision.md)
- Concept: [`../concepts/rekon-llm-provider-routing.md`](../concepts/rekon-llm-provider-routing.md),
  [`../concepts/intent-plan-compiler.md`](../concepts/intent-plan-compiler.md)
- Artifact: [`../artifacts/intent-plan-actionability-report.md`](../artifacts/intent-plan-actionability-report.md)
- Review packet: [`../../.rekon-dev/review-packets/intent-plan-compiler-semantic-normalization.md`](../../.rekon-dev/review-packets/intent-plan-compiler-semantic-normalization.md)
