# Review Packet — Intent Plan Compiler Semantic Normalization Quality Dogfood (slice 141)

Base SHA: `a3dce46`. Branch: none (push to main after the gate). Path B.

## CHANGES MADE

- `packages/capability-docs/...` — none.
- `packages/cli/src/index.ts` — additive: `rekon intent plan review --json` now
  emits a `normalization` block (`method`, `invokedSemanticNormalization`,
  optional `provider`/`model`, `warnings`) sourced from the already-computed
  `report.normalizationTrace`. Read-only; no existing field changed.
- `tests/contract/intent-plan-semantic-quality-dogfood.test.mjs` — new. 11
  no-key-safe tests + 9 live-gated tests (`REKON_RUN_LIVE_LLM_TESTS=1` +
  `OPENAI_API_KEY`).
- `tests/docs/intent-plan-semantic-quality-dogfood.test.mjs` — new (13 assertions).
- `docs/strategy/intent-plan-semantic-quality-dogfood.md` — new.
- `.rekon-dev/review-packets/intent-plan-semantic-quality-dogfood.md` — new (this).
- Doc updates: 2 strategy + 2 concepts + 1 artifact + 2 release + README + CHANGELOG.

## PUBLIC API CHANGES

One additive CLI JSON field on `rekon intent plan review --json`:
`normalization: { method, invokedSemanticNormalization, provider?, model?, warnings }`.
No flags added or removed; no human-output change; no other command touched.

## PURPOSE PRESERVATION CHECK

Original concern: Rekon rebuilt deterministic plan review and the full handoff
path, but the old codebase-intel had *semantic* normalization for rough/prose
plans, and provider routing existed without proof that real LLM-backed
normalization actually helps. This batch proves it does — live — while keeping the
proposal-not-proof guarantees: LLM output is a proposal, schema-validated, and
deterministically rechecked; unsupported claims become findings/questions, not
approval; source and plan files stay unchanged; no Rekon command executes
verification commands. Purpose preserved and advanced.

## SOURCE REVIEW

Grounded in the shipped code at `a3dce46`:
- `packages/llm-provider/src/index.ts` — `RekonLlmRouter.completeJson` (off →
  `semantic-off`; disabled/no-provider → `no-provider` / hard
  `semantic-required-no-provider`; unknown → `unknown-provider:<id>`; provider
  ok:false propagated), `createOpenAiLlmProvider` (fetch-based, **no SDK**,
  no-key → `missing-api-key` with **no network call**, bounded error reads, 30s
  timeout), `coercePhaseDrafts` (`{ phases: object[] }` gate).
- `packages/cli/src/index.ts` — `createPlanSemanticNormalizationAdapter`: the CLI
  is the **only** env-key reader (`OPENAI_API_KEY`, optional `REKON_LLM_BASE_URL`);
  `required` throws (no report) and `auto` returns `{ phases: [] }` on failure.
- `packages/capability-model/src/intent-plan-actionability-report.ts` —
  `buildIntentPlanActionabilityReport` parses deterministically first, calls the
  adapter when `mode !== off`, and either tags `semantic-llm` (confidence 0.6) or
  `deterministic-fallback`; the `required` throw propagates uncaught to the CLI
  (no report). `normalizationTrace = { method, invokedSemanticNormalization,
  rationale, provenance, warnings, model?, provider? }`. The same `evaluatePhase`
  recheck governs both paths.

No name differences from the WO were found.

## DOGFOOD SCENARIOS

Six rough-plan shapes (brain dump, messy bullets, implicit phases, missing
verification, non-goals preservation, old source-plan style), each in a fresh temp
repo with real `package.json` scripts + `src/index.ts`, run through
`--semantic off` and `--semantic required --llm-provider openai --llm-model
gpt-4o-mini`. Two model-switch cross-checks on `gpt-4.1-mini`.

## OFF VS SEMANTIC COMPARISON

| Fixture | off (det) | semantic-llm | extraction obj/del/acc/path/ver |
| --- | --- | --- | --- |
| brain dump | 1 ph / 6 f | 1 ph / **4 f** | 1/1/0/1/0 |
| messy bullets | 1 ph / 8 f | 1 ph / **4 f** | 1/1/0/1/0 (+non-goal preserved) |
| implicit phases | 1 ph / 7 f | **4 ph** / 24 f | 4/0/0/0/0 |
| missing verification | 1 ph / 6 f | 1 ph / **2 f** | 1/1/1/1/0 |
| non-goals | 1 ph / 6 f | 1 ph / **4 f** | 1/1/0/1/0 (+3 non-goals preserved) |
| source-plan style | 2 ph / 12 f | 2 ph / **4 f** | 2/2/1/2/1 (+real commands) |

Semantic reduced ambiguity where decomposition was constant, decomposed implicit
phases, and extracted structured fields; source/plan unchanged on every run.

## LIVE PROVIDER RESULT

Live OpenAI dogfood ran. `intent plan review --semantic required --llm-provider
openai --llm-model gpt-4o-mini` returned `method: semantic-llm`, provider `openai`,
model `gpt-4o-mini-2024-07-18`, exit 0, a usable phase, source/plan unchanged. The
9 env-gated live contract tests passed (20/20 with the key; 11/20 + 9 skipped
without it).

## NO-KEY FALLBACK RESULT

Re-proven fresh: `off` deterministic; `auto` (+openai, no key) → fallback report
with warning; `required` (+openai, no key) → exit 1, `missing-api-key`, **no report
written**; `artifacts validate` clean; source/plan unchanged. This is safety
behavior, not quality proof.

## QUALITY FINDINGS

- Useful: objective extraction (all), deliverables, acceptance (fixtures 4/6),
  touched paths (5/6), verification commands (fixture 6), non-goal preservation
  (fixtures 2/5), genuine phase decomposition (fixture 3), ambiguity reduction.
- Caveat: implicit-phases decomposed into four thin phases → more honest gaps
  surfaced (not hallucination). Deterministic recheck governs; no fix warranted.

## HALLUCINATION / INVENTION REVIEW

**Zero invented paths and zero invented commands** across six fixtures + two
model-switch cross-checks. Only `src/index.ts` (real) appeared as a path; only
plan-stated, real package scripts appeared as commands. The provider's system
prompt + per-task rules ("do NOT invent file paths / commands / acceptance
criteria; leave unknown fields empty") held under both models.

## EMBEDDED SAFETY REVIEW

> This semantic quality dogfood does not introduce a new execution/source-write/Circe boundary; it evaluates provider-backed text transformation under the already-shipped proposal-not-proof model.

The only code delta exposes an already-computed `normalizationTrace` in JSON. No
new execution, source-write, or Circe surface. Reviewed: provider-selection,
schema-validation, deterministic-recheck, hallucination/invention,
no-source-write, and no-command-execution boundaries — all unchanged.

## PROVIDER BOUNDARY

Provider output is consumed only as a text transformation routed by
`RekonLlmRouter`; the provider never approves, executes, writes source, or runs
Circe. The CLI is the sole reader of the API key from the environment; the key is
never stored in repo config and never logged.

## SCHEMA VALIDATION BOUNDARY

Provider output must pass `coercePhaseDrafts` (`{ phases: object[] }`, non-empty,
all records) before it can replace deterministic phases. Invalid output falls back
(auto) or blocks (required) — verified with both a mock provider and the real
provider with an injected fetch returning a non-conforming payload.

## DETERMINISTIC RECHECK BOUNDARY

Whatever phases survive the schema gate are re-evaluated by the same deterministic
`evaluatePhase` requirements (objective, deliverables, acceptance, scope,
verification-evidence, ambiguity, phase-contract, evidence-gates). Status is
derived from findings; semantic output is never auto-`actionable`. A thin semantic
phase still produces findings — asserted directly in the contract test.

## BOUNDARY MODEL

`off` deterministic · `auto` falls back · `required` hard-fails with no report ·
schema-gated · deterministically rechecked · no source/plan writes · no command
execution · no downstream artifacts · no Circe run · intent:go deferred.

## TESTS / VERIFICATION

- Contract: 20 tests (11 no-key + 9 live). No-key: 11 pass / 9 skip. Live (key
  set): 20 pass / 0 fail.
- Docs: 13 assertions.
- Full 9-command gate: green (live tests skip in the gate — reproducible, no paid
  calls).
- CLI smoke: no-key matrix + live `--json` normalization block verified.

## INTENTIONALLY UNTOUCHED

No provider architecture change; no new provider family; no embeddings (the
project's Voyage key was available but embeddings are out of scope); no Anthropic
adapter (the project's direct Anthropic key was a 1-char placeholder; Claude there
is routed via OpenRouter); no approval/handoff/status-gate changes; no source
writes; no command execution; no Circe execution; no intent:go; no version bump;
no branch.

## RISKS / FOLLOW-UP

- Live quality depends on the model; the committed gate stays deterministic
  (live tests skip without a key). A future provider/model change uses the same
  routing flags with no architecture change.
- Optional follow-up: a Claude cross-check via `REKON_LLM_BASE_URL=…openrouter…`
  (no code change) if multi-provider quality comparison is wanted.

## NEXT STEP

Semantic quality is proven live → **V1 Publish Readiness Reconciliation / npm
Release Decision** (do not start without a confirmed Work Order against the new
SHA).
