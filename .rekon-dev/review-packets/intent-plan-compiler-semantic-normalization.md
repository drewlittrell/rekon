# Review Packet — Intent Plan Compiler Semantic Normalization / Dogfood (slice 139)

Base: `8d1171a`. Product capability / dogfood batch. Wires the first real
completion provider behind the shared `RekonLlmRouter` and dogfoods the
plan-compiler semantic path, preserving every Rekon boundary.

## CHANGES MADE

- `@rekon/llm-provider`: added `createOpenAiLlmProvider(...)` — a fetch-based,
  **no-SDK** OpenAI-compatible completion provider, plus the small
  `RekonFetchLike` / `RekonHttpResponseLike` / `CreateOpenAiLlmProviderOptions`
  types. The package stays pure (zero dependencies).
- `@rekon/cli`: `createPlanSemanticNormalizationAdapter` now registers the
  OpenAI provider behind the router, treats an explicit provider selection as
  enabling the router, reads the API key from the environment, and sends a
  bounded `plan.semantic-normalize` prompt.
- Tests: extended the package test (+10 assertions), added the contract test
  `tests/contract/intent-plan-review-semantic-normalization.test.mjs` (13) and
  the docs test `tests/docs/intent-plan-semantic-normalization.test.mjs` (15).
- Docs: new `docs/strategy/intent-plan-compiler-semantic-normalization-dogfood.md`,
  this review packet, and updates to 9 supporting docs + CHANGELOG.

## PUBLIC API CHANGES

- New export from `@rekon/llm-provider`: `createOpenAiLlmProvider`,
  `CreateOpenAiLlmProviderOptions`, `RekonFetchLike`, `RekonHttpResponseLike`.
  Additive only — all slice-138 exports are unchanged.
- No CLI flag changes: `--semantic`, `--llm-provider`, `--llm-model` already
  exist; their behavior is now backed by a real (key-gated) provider.
- No kernel artifact, schema, or validator changes.

## PURPOSE PRESERVATION CHECK

- **Original problem:** the deterministic plan compiler is operator-usable, but
  classic codebase-intel had semantic normalization for rough/prose plans. Rekon
  had provider routing (slice 138) but no real adapter behind it.
- **This slice:** proves the seam works with a real provider without
  compromising the prepare / prove / package boundary. Semantic normalization can
  improve phase drafts for rough plans; model output stays proposal, not proof;
  the deterministic re-check stays authoritative; provider routing is explicit /
  configurable; off/auto/required stay clear; and there are no source writes,
  command execution, Circe runs, or `intent:go`.

## SOURCE REVIEW

Read before implementing: `packages/llm-provider/src/index.ts` (router +
interfaces + `coercePhaseDrafts`), `packages/llm-provider/package.json` (pure,
zero deps), the slice-138 `createPlanSemanticNormalizationAdapter` in
`packages/cli/src/index.ts`, `packages/capability-model/src/intent-plan-actionability-report.ts`
(adapter type + `normalizationTrace` semantics), the slice-138 contract test,
`tsconfig.base.json` (ES2022 / NodeNext), and the package/audit/license scripts.
The audit auto-discovers packages and enforces per-package contracts; no SDK
dependency is added, so there is no broad audit/license churn.

## PROVIDER ADAPTER

`createOpenAiLlmProvider({ apiKey?, baseUrl?, id?, defaultModel?, timeoutMs?, fetchImpl? })`:

- Built on the global `fetch` (accessed via a lib-independent `globalThis` cast)
  — **no provider SDK**, so `@rekon/llm-provider` keeps zero dependencies.
- POSTs to `${baseUrl}/chat/completions` (default OpenAI v1 base) with a JSON
  `response_format`, a bounded system message, and the caller's prompt.
- The API key is a constructor argument supplied by the CLI from env; the package
  never reads the environment and never stores a key.
- Never throws a raw error: with no key it returns `missing-api-key` and makes
  **no network call**; HTTP / parse / abort failures return `{ ok: false, error }`
  (`http-<status>`, `invalid-response-json`, `no-content`, `content-not-json`,
  `timeout`, `request-failed`). Output `data` is `unknown` until the caller
  schema-gates it.

## CLI ROUTING

`createPlanSemanticNormalizationAdapter` registers the OpenAI provider in the
router. Resolution: `--llm-provider <id>` wins, then `REKON_LLM_PROVIDER`;
`--llm-model` / `REKON_LLM_MODEL` set the model; `REKON_LLM_ENABLED` enables a
configured default route. An explicit provider selection also enables the router
for that call. The key comes from `OPENAI_API_KEY` (and an optional
`REKON_LLM_BASE_URL`), read only here in the orchestration layer.

## SEMANTIC PROMPT / SCHEMA

The `plan.semantic-normalize` prompt includes the plan text, goal, and kind, and
instructs the model to return one `{ "phases": [...] }` JSON object, to preserve
meaning, to **not invent file paths or commands or acceptance criteria**, and to
leave unknown fields empty. The phase fields requested match
`coercePhaseDrafts` + `IntentPlanPhaseDraft` (id, order, title, kind, objective,
deliverables[], acceptanceCriteria[], touchedPaths[], verificationCommands[],
evidenceArtifacts[], constraints[], sourceEvidence[]).

## DETERMINISTIC RECHECK

Provider output is gated by `coercePhaseDrafts` (a non-empty array of objects)
and then re-run through the same `evaluatePlanPhases` actionability evaluator the
deterministic path uses. Invalid output yields a `deterministic-fallback`
(`auto`) or a hard failure (`required`). The model never sets the report status
directly; the deterministic engine does.

## NO-KEY DOGFOOD

Default behavior with the provider registered but **no `OPENAI_API_KEY`** (the
test suite + the WO CLI smoke enforce this):

- `scan` → exit 0.
- `intent plan review --semantic off` → deterministic report written.
- `--semantic auto --llm-provider openai` → `deterministic-fallback` report with
  a warning; exit 0.
- `--semantic required --llm-provider openai` → non-zero exit, **no** report.
- `artifacts validate` → clean.
- plan + source files unchanged; no `PreparedIntentPlan` / `WorkOrder` /
  `VerificationPlan` / `VerificationRun` / `VerificationResult`.

## LIVE DOGFOOD

The live path runs only when an operator opts in (`REKON_RUN_LIVE_LLM_TESTS=1`
**and** a provider key present); it is skipped by default and never required by
the test suite. With a key, `required` produces a `semantic-llm`
`normalizationTrace` (provider/model recorded) and the report is still
deterministically re-checked. In this environment no live key is configured, so
the live path was not exercised; the router/integration is ready for an
operator-provided provider. The real adapter's end-to-end integration into a
`semantic-llm` trace is proven offline via an injected `fetchImpl` (contract test
#6) — no network.

## BOUNDARY MODEL

- LLM output is **proposal, not proof**; schema-validated + deterministically
  re-checked.
- Providers may read / transform / critique text only.
- No approval, no command execution, no source writes, no Circe run, no
  `intent:go`; no downstream artifacts created.
- API keys are read from env by the CLI only, never stored in repo config, never
  read inside `capability-model`.
- `capability-model` stays pure: no env reads, no network.

## TESTS / VERIFICATION

- `packages/llm-provider/test/llm-provider.test.mjs` — 20 assertions (10 new):
  factory, clean missing-key refusal (no network, no throw), router
  registration, `auto` / `required` with a missing-key provider, and offline
  success / HTTP-error / non-JSON parsing via injected fetch.
- `tests/contract/intent-plan-review-semantic-normalization.test.mjs` — 13:
  CLI off / auto-fallback / required-hard with the real provider and no key,
  `--llm-provider`/`--llm-model` honored, a helper-level `semantic-llm` trace
  from the real `createOpenAiLlmProvider`, the deterministic re-check,
  invalid-output fallback (auto) / block (required), and the no-downstream /
  no-source-write boundary.
- `tests/docs/intent-plan-semantic-normalization.test.mjs` — 15.
- Full 9-command gate green; the WO no-key CLI smoke matrix run at gate time.

## INTENTIONALLY UNTOUCHED

- No embedding implementation, no second provider adapter, no live default.
- No approval semantics, no auto-approve, no executor, no Circe run, no
  `intent:go`.
- No kernel/SDK/runtime artifact changes; no version bump; no npm publish; no
  branch.
- `intent plan answer` is not yet routed through the provider (route
  `plan.answer-merge` remains a later slice).

## RISKS / FOLLOW-UP

- The OpenAI adapter is exercised offline via injected fetch; a real hosted call
  is operator-gated and unverified in CI by design. Follow-up: an operator live
  dogfood once a key is available.
- `response_format: json_object` assumes an OpenAI-compatible JSON mode; other
  providers may need their own adapters (out of scope this slice).
- Routing `intent plan answer` (and summarizers) through the same router is the
  natural next consumer.

## NEXT STEP

**Fresh Repo Intent Handoff / Circe Dogfood Review** — run the operator-facing
path against a real-ish repo and Circe environment using semantic normalization
where available, record usability gaps, and decide what remains before npm
publish / broader v1 release. If this slice exposes a blocker, do a single
blocker-specific fix slice only. Do not restart a long architecture sequence. Do
not start without a new confirmed Work Order against the new SHA.
