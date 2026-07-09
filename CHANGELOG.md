# Changelog

All notable changes to Rekon are documented here.

## Unreleased

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
