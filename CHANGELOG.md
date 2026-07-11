# Changelog

All notable changes to Rekon are documented here.

## Unreleased

- Added a token-aware semantic-debt model evaluator with a labeled corpus,
  repeat stability, quality metrics, latency, detailed token usage, current and
  steady-state cost, and a cost/quality frontier.
- Added experimental OpenAI Responses and Anthropic Messages adapters with
  structured JSON output and provider-native effort controls. Existing OpenAI
  Chat Completions behavior is unchanged.
- Moved scan-time semantic-debt judgment to OpenAI Responses and pinned the
  evaluated production profiles: `gpt-5.6-luna` at `low` effort by default and
  `gpt-5.4-nano` at `none` as the economy override. Added
  debt-specific model and effort overrides through CLI flags and environment
  variables.
- Added WO-25 Semantic Debt Overlay: `SemanticDebtJudgmentReport` artifacts,
  the `debt.semantic` policy rule, and `rekon scan --semantic-debt
  off|auto|required`.
- Added scan-time semantic debt report reuse keyed by provider, model, effort,
  prompt version, and full-file SHA-256. The report records model provenance
  and a confidence score; judgments are proposals, not proof.
- Added the pure semantic debt judgment law in `@rekon/capability-model`,
  including the tech-debt concern filter, pattern tagger, and adapter-result
  coercion. The judge model and reasoning effort remain overrideable.
- Extended parity bench rule mapping with optional `rekonRuleIds` so `tech_debt`
  can be served by both `debt.markers` and `debt.semantic` without changing
  exact-match scoring semantics.
- Semantic scan is now on by default: `rekon scan` runs the semantic file
  layer in `auto` mode whenever `OPENAI_API_KEY` is present, without any
  flag. Opt out with `--no-semantic`, `REKON_SEMANTIC=off`, or
  `.rekon/config.json` `{"semantic": {"mode": "off"}}`. Keyless runs degrade
  to the deterministic scan with a one-line notice and report
  `semanticFiles.providerAvailable: false`. An explicit
  `--semantic-files auto` keeps the documented keyless behavior (per-file
  deterministic fallback reports with warnings); `--semantic-files required`
  still fails clearly without a key.
- LLM enablement flipped from opt-in to opt-out: a present key enables the
  provider unless `REKON_LLM_ENABLED` is `0`/`false`/`off`
  (`REKON_LLM_ENABLED=1` is no longer needed).
- `@rekon/llm-provider`'s package description and module header now
  accurately describe the shipped live OpenAI and Voyage adapters (they
  previously claimed the package made no network calls).

## 1.0.0

- Shipped the public Rekon repository as a local-first codebase intelligence
  substrate with typed artifacts, a capability SDK, runtime, CLI, and built-in
  capabilities.
- Added repository scanning, model projection, graph projection, policy
  evaluation, resolver packets with trace, publications, memory, intent
  artifacts, verification recording, reconciliation planning, and artifact
  validation.
- Added public docs for artifacts, extensions, strategy, and local usage.
- Cleaned the public product surface by removing internal work orders, review
  packets, generated freshness indexes, alpha/beta planning docs, and strategy
  snapshot logs from the tracked docs tree.
- Reframed README, docs index, contributing, security, and strategy docs around
  the current product surface rather than internal build process.
- Hardened local capability and artifact trust boundaries: unsafe external
  capability package specifiers are rejected before import, artifact reads verify
  containment/header/digest data, handler artifact access requires declared
  permissions, source-file inputs must resolve inside the repository, and
  GitHub Check payloads no longer report success when verification proof-chain
  warnings are present.
