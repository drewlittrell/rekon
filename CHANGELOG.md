# Changelog

All notable changes to Rekon are documented here.

## Unreleased

- Added WO-25 Semantic Debt Overlay: `SemanticDebtJudgmentReport` artifacts,
  the `debt.semantic` policy rule, and `rekon scan --semantic-debt
  off|auto|required`.
- Added scan-time semantic debt report reuse keyed by provider, model, prompt
  version, and full-file SHA-256. The report records model provenance and a
  confidence score; judgments are proposals, not proof.
- Added the pure semantic debt judgment law in `@rekon/capability-model`,
  including the tech-debt concern filter, pattern tagger, and adapter-result
  coercion. The default judge model remains overrideable and should be replaced
  only after operator-path evaluation.
- Extended parity bench rule mapping with optional `rekonRuleIds` so `tech_debt`
  can be served by both `debt.markers` and `debt.semantic` without changing
  exact-match scoring semantics.

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
