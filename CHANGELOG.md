# Changelog

All notable changes to Rekon are documented here.

## Unreleased

- Added deterministic callable, entry-point reachability, and behavior graphs.
  Dead-code reachability now includes evidence-backed roots and dynamic imports,
  while preflight exposes graph impact context without changing risk tiers.
- Added typed JUnit XML and ESLint JSON ingestion with bounded, redacted report
  artifacts and the existing two-report reproducibility requirement. Added
  LCOV support to isolated runtime coverage observations.
- Added native pnpm 11 audit, Yarn audit NDJSON, and OSV-Scanner JSON adapters
  to dependency-vulnerability ingestion. All adapters preserve only normalized
  advisory, version, scope, and source-path evidence and remain assessment-only.
- Added typed npm audit v2 ingestion with lockfile-backed installed versions,
  dependency paths, production/development scope, stable advisory identity,
  partial-input warnings, and assessment-only dependency vulnerability policy.
- Hardened the parity benchmark with external-only operator adjudications,
  per-rule quality thresholds, separate finding precision and assessment
  usefulness, and a sanitized aggregate report that excludes corpus roots,
  repository ids, record ids, and file paths.
- Added repository-local SARIF 2.1 security ingestion with typed
  `SecurityScanReport` artifacts, stable scanner-result identity, outside-root
  path rejection, and current-evidence policy risks. Generic lint SARIF remains
  provenance only, and scanner output does not auto-promote to findings.

- Added neutral JS/TS function metrics and a multi-signal maintainability risk
  that requires at least two independent complexity thresholds. Single-signal
  functions, tests, and generated code remain excluded, and static complexity
  never becomes a finding automatically.
- Corrected import graph projection to connect resolved repository file paths
  and added one architecture risk per runtime import cycle. Type-only and
  non-production cycles are excluded.
- Added dependency-hub risks for production modules with high incoming and
  outgoing resolved value or type import pressure. One-sided facades and leaf
  modules remain quiet.
- Extended isolated Istanbul provenance with normalized function ranges and
  execution counts. Fresh coverage bound to a `VerificationRun` now enriches
  the existing complexity risk while keeping passing, failing, and scoped zero
  execution distinct.
- Added explicit source targets to generated isolated coverage plans. A passing
  run can now identify a scoped complexity coverage gap only when the target was
  declared and the instrumented function recorded zero execution.
- Added `@rekon/kernel-assessments` with typed risk, opportunity, semantic
  claim, and model-diagnostic contracts, root-cause fusion, and conservative
  finding-promotion rules.
- Reclassified semantic debt, debt markers, capability overlap, unresolved
  ownership, and uncertain dead-code output so they no longer enter
  `FindingReport` without sufficient proof or applicable law.
- Added a detection-quality charter and a machine-checked built-in emitter
  inventory.
- Preserved architecture, dead-code, lint, and stub model concerns as typed
  semantic claims instead of discarding them at the model boundary.
- Added conservative TypeScript compiler evidence and governed findings for
  reproducible file-local syntax and stable type errors.
- Added AST-backed source-quality risks for type escapes, error suppression,
  and explicit placeholder implementations, fused by file and construct rather
  than emitted once per occurrence.
- Added conservative async-control-flow risks for unshadowed async Promise
  executors and async callbacks passed to synchronous methods on statically
  recognized arrays.
- Added embedding-backed duplicate implementation opportunities from explicit
  `CapabilityEvidenceGraph` similarity claims, with reciprocal and self-pair
  deduplication and no automatic finding promotion.
- Expanded JS/TS evidence with package manifests, lifecycle build targets,
  Next.js route and screen conventions, and test-file framework metadata.
- Added a deterministic application graph slice for routes, screens, tests,
  packages, and lifecycle build targets without inferring runtime flow or test
  coverage.
- Added static test context to the application graph: resolved import
  dependencies use `depends_on`, while routes, screens, and capability hints
  sharing those dependencies use `related_to`. Repeated test failures surface
  this context and cite the graph without treating it as coverage or promotion
  evidence.
- Extended runtime graph observation with safe `execution_observation` events.
  Application graphs expose instrumented test-to-file and test-to-route
  relationships as `observed` edges, and repository check diagnostics surface
  that context separately without treating execution as assertion coverage or
  promotion evidence.
- Added an Istanbul coverage adapter for isolated test runs. The CLI requires
  explicit `--test-path` attribution, records coverage digest and file-count
  provenance, rejects outside-root inputs, and emits only observed source
  context rather than assertion-coverage claims.
- Added optional `VerificationRun` binding for isolated Istanbul coverage.
  Rekon records the exact completed command behind the attribution, rejects
  stale or mismatched coverage, and can execute and bind through
  `rekon verify run --execute` without introducing another command runner.
- Added deterministic Vitest and Jest isolated-coverage planning. Rekon resolves
  installed local binaries, writes typed `VerificationPlan` coverage metadata,
  and lets the existing verification runner execute and bind the report without
  implicit package installation.
- Added repository-native lint, test, typecheck, and build diagnostics from
  completed `VerificationRun` artifacts. One-off and operational failures remain
  risks; only the same normalized failure reproduced twice on the current
  evidence state promotes automatically. Source-quality promotion additionally
  requires an exact location and signal-specific diagnostic match. Added stable
  per-diagnostic parsing for ESLint, TypeScript, Vitest/Jest-style failures,
  Node TAP blocks, and file-located build errors, while retaining normalized
  raw-output fallback for unsupported formats.
- Added bounded resolved-import blast radius to file-local repository-check
  diagnostics. Only import graphs tied to current evidence are used, and graph
  context does not alter severity or finding promotion.
- Added assessment-aware preflight, work-order, and agent-guidance context
  without promoting assessments into findings.
- Added an end-to-end adjudicated detection-quality fixture covering finding
  classification, assessment classification, evidence completeness, root-cause
  completeness, and duplicate remediation rate.

- Added a token-aware Voyage embedding evaluator covering retrieval quality,
  repeat stability, latency, token cost, dimensions, and vector storage.
- Changed the default embedding profile from `voyage-code-3` at 1024
  dimensions to `voyage-4` at 512 dimensions. `voyage-4-lite` is the evaluated
  economy model.
- Added embedding usage reporting, enforced requested output dimensions, and
  blocked queries against incompatible cached model spaces with an actionable
  reindex message.
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
- Added the semantic debt overlay: `SemanticDebtJudgmentReport` artifacts,
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
