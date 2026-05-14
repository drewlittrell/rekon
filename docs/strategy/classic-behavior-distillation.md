# Classic Behavior Distillation

This document distills the behavior of `codebase-intel-classic` into a Rekon-
native form. It is a preservation/refactor planning pass, not a copy/port
pass.

The classic repo is the hard-fought reference implementation. Rekon should
preserve the wins — not the file structure, service sprawl, or one-off glue
that accumulated along the way.

See also:

- [classic-wins.md](classic-wins.md) — the durable principles.
- [classic-to-rekon-translation.md](classic-to-rekon-translation.md) —
  translation patterns and examples.
- [classic-refactor-principles.md](classic-refactor-principles.md) — rules
  for how to port.
- [classic-behavior-roadmap.md](classic-behavior-roadmap.md) — phased
  migration plan.
- [classic-alignment-map.md](classic-alignment-map.md) — quick lookup table.
- [codebase-intel-classic-migration.md](codebase-intel-classic-migration.md) —
  the durable role-mapping rules.

## How To Read A Behavior Card

Each card has the same shape:

- **Classic capability** — what `codebase-intel-classic` does.
- **Classic source areas** — relevant files/directories.
- **Goal** — what user/system problem the behavior solves.
- **What is good** — the hard-won win.
- **What is accidental** — old implementation shape Rekon should not
  preserve.
- **Rekon reinterpretation** — role(s), consumes, produces, artifact types,
  permissions, freshness, provenance.
- **Keep / Simplify / Defer / Do not port** — what to do.
- **Migration path** — minimal public form, next maturity step, full
  maturity target.

The cards are intentionally repetitive. Repetition keeps every behavior
held to the same standard.

---

## 1. Evidence And Repo Observation

Classic capability:

- Walks the repo with language and repo packs, emits typed evidence facts,
  derives an observed-repo model, and writes both to disk.

Classic source areas:

- `packages/product-codebase-intel/src/replatform/replatform-observe.ts`
- `packages/kernel-evidence/**`
- `packages/kernel-repo-model/**`
- `packages/pack-language-*/**`
- `packages/pack-repo-*/**`
- `services/AnalysisService.ts`
- `services/analysis/**`

Goal:

- Turn a working copy into a typed, inspectable, provenance-bearing
  description of the repository.

What is good:

- Evidence facts carry provenance to source.
- Packs (per-language, per-repo-shape) keep extractors small and composable.
- Observed-repo state is a derived artifact, not a side effect.
- Deterministic extraction first; everything else is built on top.
- Incremental observation is a first-class concept.
- Facts can carry confidence; consumers can choose how to trust them.

What is accidental:

- `AnalysisService` is the central monolith with many cross-cutting
  responsibilities (caches, tiers, embeddings, taxonomy, prompts).
- Path aliases and process caches tie extractors to internal repository
  layout.
- Cache directories at `.codebase-intel/cache/**` leak into many consumers.

Rekon reinterpretation:

- Role(s): `evidence-provider` for raw facts; `projector` for derived
  models.
- Consumes: `SourceFile`.
- Produces: `EvidenceGraph`, `ObservedRepo`, `OwnershipMap`,
  `CapabilityMap`.
- Permissions: `read:source`, `write:artifacts`.
- Freshness/invalidation: `source.changed` rules per language; future
  watcher consumes them.
- Provenance: every fact and every derived model entry points back to the
  evidence ref(s) that produced it.

Keep:

- Evidence facts with provenance.
- Provider packs (language and repo shape).
- Observed-repo as a projection.
- Deterministic-first extraction.
- Incremental observation.
- Confidence-bearing facts.

Simplify:

- One small evidence-provider per pack; no shared monolithic analysis
  service.
- Caches stay package-private inside `@rekon/runtime`'s artifact store; do
  not surface a `.codebase-intel/cache` equivalent.

Defer:

- Embedding/taxonomy/scoring repositories (analysis-service helpers).
- Tier selection and prompt budget management — only return when a semantic
  augmentation role is real.

Do not port:

- The cross-cutting analysis-service orchestrator.
- Internal path-alias coupling.

Migration path:

1. Minimal public form: today's `@rekon/capability-js-ts` evidence provider
   + `@rekon/capability-model` projector.
2. Next maturity: ports of `pack-language-python`, `pack-language-go`,
   `pack-language-rust`, etc., each as standalone evidence-provider
   capabilities.
3. Full maturity: repo-shape packs (web app, mobile app, services, IaC) as
   projector capabilities, plus an optional `semantic-provider` role for
   LLM-augmented evidence behind explicit permission.

---

## 2. Deterministic + LLM Hybrid Analysis

Classic capability:

- Tries deterministic extraction first; escalates to LLM augmentation only
  when deterministic signals are insufficient.

Classic source areas:

- `services/analysis/DeterministicHybridPipeline.ts`
- `services/analysis/DeterministicHybridPrimary.ts`
- `services/analysis/DeterministicHybridFallback.ts`
- `domain/analysis/assessDeterministicViability.ts`
- `services/analysis/EvidenceContext.ts`
- `services/analysis/EvidenceContextOps.ts`

Goal:

- Use cheap, repeatable, auditable extraction when it works. Use models
  only when deterministic signals fail.

What is good:

- Deterministic-first as a policy, not an aspiration.
- Explicit deterministic-viability assessment with named signals.
- Fallback is visible in the output — consumers know when they got
  augmented data.
- Confidence and reason are recorded.

What is accidental:

- LLM prompts, tier selection, embedding/taxonomy coupling.
- Cache-heavy execution state and prompt cache state types.

Rekon reinterpretation:

- Role(s): `evidence-provider` (deterministic), `projector` (deterministic
  semantics derived from evidence), future optional
  `semantic-provider`/`evaluator` for LLM augmentation.
- Consumes: `SourceFile`, `EvidenceGraph`.
- Produces: `EvidenceGraph` (deterministic), later `EvidenceGraph` enriched
  with `semantic:*` facts via a separate capability under explicit
  permission.
- Permissions: deterministic stays at `read:source`/`write:artifacts`;
  augmentation requires explicit `network:outbound` if it calls an LLM.
- Provenance: deterministic facts have file/range provenance; augmented
  facts must declare model/version + inputs they consumed.

Keep:

- Deterministic-first policy.
- Explicit assessment of when deterministic signals are insufficient.
- Visible fallback trace.
- Augmentation results never silently overwrite deterministic facts; they
  add new facts with their own provenance.

Simplify:

- Drop the cache/state machinery. Use the runtime artifact store.

Defer:

- All semantic augmentation. Until a real Rekon capability needs it, the
  semantic-provider role is described, not shipped.

Do not port:

- LLM prompt orchestration.
- Embedding/taxonomy plumbing.

Migration path:

1. Minimal public form: deterministic-only `EvidenceGraph` (current).
2. Next maturity: explicit `deterministic.viability` evidence facts so
   downstream capabilities can see when deterministic coverage was thin.
3. Full maturity: optional `semantic-provider` capability with permissioned
   augmentation, recording model id and inputs in artifact provenance.

---

## 3. Graph Intelligence

Classic capability:

- Builds many graph slices (import, runtime, call, route, op-mapping,
  step-capability, state-access, component, event-flow, error-propagation,
  provider-invocation, DDE-scope, co-change) as separate producers off a
  shared analysis-with-meta input.

Classic source areas:

- `services/GraphBuildProvider.ts`
- `services/GraphBuildHandler.ts`
- `domain/graph/producers/**`
- `schemas/graph-core.schema.ts`
- `lib/graph-store.ts`

Goal:

- Codebase understanding is relational, not just file summaries.
  Different consumers need different slices.

What is good:

- One typed `GraphSlice` shape with consistent node/edge schema.
- Many small producers, each owning one relationship type.
- Slices can be saved, validated, and selectively rebuilt.
- Slices are decoupled from each other.

What is accidental:

- A single `GraphBuildProvider` knows about every producer.
- `getOrBuildImportGraph` and other singletons cache at process level.
- Building every slice eagerly even when no consumer asks for it.

Rekon reinterpretation:

- Role(s): `projector` per slice type.
- Consumes: `EvidenceGraph`, `ObservedRepo`.
- Produces: `GraphSlice`.
- Permissions: `read:artifacts`, `write:artifacts`.
- Freshness: each slice declares its invalidation rule (`source.changed`
  for import; `runtime.changed` later).
- Provenance: each node/edge cites the evidence/projection it came from.

Keep:

- One graph slice contract.
- One producer per relationship.
- Validation per slice.

Simplify:

- No central `GraphBuildProvider` orchestrator. Each projector is a Rekon
  capability the runtime calls on demand.
- No process-level graph cache. Artifact store + freshness rules are the
  cache.

Defer:

- Most slice types beyond import/symbol/ownership. Add a slice only when
  a consuming resolver/evaluator/publisher actually needs it.

Do not port:

- Eager full-graph builds.
- Producer-internal coupling to `FileAnalysisWithMeta`.

Migration path:

1. Minimal public form: today's `@rekon/capability-graph` import, symbol,
   and ownership slices.
2. Next maturity: route, call, and runtime slices when a resolver/evaluator
   needs them.
3. Full maturity: co-change, state-access, error-propagation, provider-
   invocation slices, gated by real consumers.

---

## 4. Rule Engine And Governance

Classic capability:

- Compiles architecture invariant rules from YAML, registers evaluators by
  key, runs each evaluator against the analysis index, and produces a
  CompiledRulesReport.

Classic source areas:

- `domain/issues/RulesResolver.ts`
- `domain/issues/evaluators/**`
- `domain/issues/evaluators/RuleEvaluatorProvider.ts`
- `services/RuleCompilationHandler.ts`
- `lib/analysis/RuleCompilationRunner.ts`
- `services/InvariantsCompilationHandler.ts`
- `config/architecture/schemas/compiled-rules.schema.ts`

Goal:

- Make architecture policy executable. Move rules out of prose and into a
  runtime.

What is good:

- Stable rule IDs.
- Evaluator keys decouple rule definition from evaluator implementation.
- Severity levels (`high` / `medium` / `low`).
- Status semantics (`pass` / `fail` / `skipped` / `unimplemented` /
  `error`).
- Source references on every finding.
- Enforced vs documented distinction.

What is accidental:

- A single `RULE_EVALUATORS` map.
- Invariants compiled from YAML in a service handler.
- Tight coupling between rule compilation, contract policy, and label
  overrides.

Rekon reinterpretation:

- Role(s): `evaluator`.
- Consumes: `EvidenceGraph`, `ObservedRepo`, `GraphSlice`, `Rulebook`.
- Produces: `Finding`, `FindingReport`.
- Permissions: `read:artifacts`, `write:artifacts`.
- Freshness: per-rulebook `inputs.changed`.
- Provenance: every `Finding` cites the rule id + the evidence/projection
  refs that triggered it.

Keep:

- Stable rule IDs.
- Evaluator keys.
- Severity.
- pass/fail/skipped/unimplemented/error semantics.
- Source references on findings.

Simplify:

- Start with evaluator packages (community rule packs) instead of compiled
  YAML invariants. The first community example will be an import-boundary
  rule pack.
- Defer compiled invariant YAML; the lightweight `Rulebook` contract can
  represent the same intent.

Defer:

- Full contract-policy plumbing.
- Label override layer.

Do not port:

- The central `RULE_EVALUATORS` registry. The Rekon registry is the
  capability runtime; rule evaluator capabilities slot in like any other.

Migration path:

1. Minimal public form: `@rekon/capability-policy` with the current rules.
2. Next maturity: external rule-pack capabilities (e.g., import boundary).
3. Full maturity: optional compiled-invariant capability that reads YAML
   rules and registers them dynamically.

---

## 5. Issue Detection And Coherency Delta

Classic capability:

- Detects architectural and ownership issues across many phases, computes a
  coherency delta against expected architecture, supports filtering, and
  merges with prior issue runs.

Classic source areas:

- `services/IssueDetectionService.ts`
- `services/issues/**`
- `packages/product-codebase-intel/src/replatform/replatform-delta.ts`
- `domain/issues/**`

Goal:

- Issues are governance artifacts, not throwaway lint output. They feed
  health, docs, remediation, and watcher alerts.

What is good:

- A typed `Issue` with severity, category, source refs, and merge
  semantics.
- Status and freshness over time.
- Filtering reasons recorded with the issue.
- Coherency delta as a separate artifact.

What is accidental:

- Multi-phase detection pipeline with phase-specific filtering.
- LLM-backed deep reasoning embedded in the detection service.

Rekon reinterpretation:

- Role(s): `evaluator` for detection, future `projector` for coherency
  delta and health.
- Consumes: `EvidenceGraph`, `ObservedRepo`, `GraphSlice`, `Rulebook`.
- Produces: `Finding`, `FindingReport`, later `CoherencyDelta`,
  `HealthProjection`, `RemediationPlan`.
- Permissions: `read:artifacts`, `write:artifacts`.
- Provenance: every finding cites rule + inputs.

Keep:

- Issue contract with status/freshness.
- Issue-to-remediation relationship.
- False-positive handling (later).

Simplify:

- Single-pass evaluation per evaluator capability.
- Coherency delta as a separate optional projector.

Defer:

- Full multi-phase issue pipeline.
- LLM issue review.
- Sophisticated status merge.

Do not port:

- Phase-coupled detection orchestration.

Migration path:

1. Minimal public form: `FindingReport` from `@rekon/capability-policy`
   today.
2. Next maturity: external evaluator rule packs + optional
   `CoherencyDelta` projector.
3. Full maturity: `HealthProjection` and `RemediationPlan` publishers.

---

## 6. Resolver And Preflight Context

Classic capability:

- Resolves owner, risk tier, routing concerns, required checks, protected
  paths, scope matches, and next required context before any code change.

Classic source areas:

- `lib/context/resolver.ts`
- `services/ContextHandler.ts`
- `handlers/context.handler.ts`
- `handlers/RealTimeContextHandler.ts`

Goal:

- Before changing code, give the operator (human or agent) an explainable
  answer: who owns it, what is risky, what checks apply, where to look
  next.

What is good:

- A typed packet with owner systems, risk, routing, check requirements,
  protected paths, scope, and next steps.
- Phases: preflight → route → seam → issue, each with its own resolver.
- Resolution trace explains where each answer came from.
- Operator feedback can flow back into resolver context.

What is accidental:

- Resolver logic reads many files directly through repo helpers.
- ContextHandler glue blends resolver, freshness, watcher, agent docs.

Rekon reinterpretation:

- Role(s): `resolver`.
- Consumes: `IntelligenceSnapshot`, `ObservedRepo`, `OwnershipMap`,
  `GraphSlice`, `FindingReport`, `MemorySelection`.
- Produces: `ResolverPacket` with `resolutionTrace`.
- Permissions: `read:artifacts`, `write:artifacts`.
- Provenance: trace entries cite the input artifacts they consulted.

Keep:

- Ownership resolution with explicit precedence
  (`OwnershipMap` → `ObservedRepo` → ownership `GraphSlice` →
  `EvidenceGraph` ownership hint).
- Resolver phases (preflight first; route/seam/issue later).
- Risk tier.
- Required checks.
- Next resolver / next context concept.
- Traceable rationale.

Simplify:

- Resolvers consume snapshot artifacts, not source files.
- The CLI `rekon resolve list` / `rekon resolve run <id>` already exposes
  this pattern generically.

Defer:

- Route, seam, and issue resolvers as separate capability handlers (one
  per phase) when needed.

Do not port:

- Direct repo-file reads inside resolvers.

Migration path:

1. Minimal public form: today's `resolve.preflight` with `resolutionTrace`.
2. Next maturity: `resolve.route` and `resolve.seam` as separate resolver
   handlers within `@rekon/capability-resolver` or community packs.
3. Full maturity: `resolve.issue` and `resolve.next` resolvers, plus
   resolver chaining when one packet declares the next required resolver.

---

## 7. Publications And Generated Docs

Classic capability:

- Generates AGENTS.md, architecture docs, system docs, and freshness
  markers from current repo intelligence.

Classic source areas:

- `services/ArchitectureDocsHandler.ts`
- `services/ContextHandler.ts`
- `lib/agent-docs.ts`
- `tools/agent-docs/generator.ts`
- `docs/architecture/**`

Goal:

- Make current repo intelligence consumable by agents and humans without
  forcing them to query Rekon directly every time.

What is good:

- Docs are derived from typed inputs, not hand-maintained.
- Freshness markers tell readers when docs may be stale.
- Input refs are recorded so readers can audit derivations.

What is accidental:

- `ContextHandler` mixing resolver, freshness, watcher heartbeat, and doc
  generation in one place.

Rekon reinterpretation:

- Role(s): `publisher`.
- Consumes: `IntelligenceSnapshot`, `ResolverPacket`, `FindingReport`,
  `MemorySelection`.
- Produces: `Publication`.
- Permissions: `read:artifacts`, `write:artifacts`.
- Provenance: `Publication` headers cite the snapshot/resolver/finding
  refs that produced them.

Keep:

- Generated agent docs.
- Architecture / system docs.
- Freshness markers on every publication.
- Input refs in the publication header.
- Treat publications as outputs, never canonical truth.

Simplify:

- One publisher capability per surface (agents, architecture, system).
- No mixed-responsibility handler.

Defer:

- PR-comment, dashboard, and notebook publishers.

Do not port:

- Publications becoming the source of architecture truth.

Migration path:

1. Minimal public form: `@rekon/capability-docs` with `publish agents`.
2. Next maturity: an architecture-summary publisher; a findings-summary
   publisher.
3. Full maturity: PR-comment / GitHub-check publishers; dashboard exports.

---

## 8. Operator Feedback And Memory

Classic capability:

- Stores typed operator feedback entries with kind, scope, evidence,
  status, freshness, verification, and promotion semantics. Selects
  context-relevant memory at resolve time and records usage.

Classic source areas:

- `lib/operator-feedback.ts`
- `lib/memory/**`
- `commands/memory/**`
- `schemas/operator-feedback.schema.ts`
- `schemas/memory-kind-taxonomy.schema.ts`

Goal:

- User/operator lessons should become scoped, ranked, evidence-backed
  guidance that resolvers can apply.

What is good:

- Strongly typed feedback entries with `kind`, `scope`, `evidence`,
  `status`, `freshness`, `verification`.
- Scope-aware matching for context use.
- Freshness per kind (e.g., temporary corrections vs durable preferences).
- Verification evidence requirements.
- Promotion/curation concept (memory → rulebook entry).
- Context usage tracking so heavily-used memory rises.

What is accidental:

- Many memory kinds with complex normalization fallbacks.
- Storage in YAML files alongside other workspace caches.

Rekon reinterpretation:

- Role(s): `learner`.
- Consumes: `IntelligenceSnapshot`, `ResolverPacket`,
  `OperatorFeedbackEntry`.
- Produces: `OperatorFeedbackEntry`, `MemoryEvent`, `MemorySelection`.
- Permissions: `read:artifacts`, `write:artifacts`.
- Provenance: every memory entry cites its source evidence and target
  scope; selection refs cite the entries it chose.

Keep:

- Scope-aware matching.
- Freshness per memory kind.
- Verification fields.
- Evidence requirement on durable memory.
- Promotion concept (memory enriches resolver output but does not rewrite
  ownership/rule facts; promotion to rulebook is an explicit step).
- Context usage tracking.

Simplify:

- Start with `add` / `list` / `select` commands today.
- One canonical memory kind set; collapse legacy normalization.

Defer:

- Automatic promotion engine.
- Curation heuristics.

Do not port:

- Memory as authoritative architecture truth. It enriches resolver output;
  it does not overwrite ownership, rules, or findings.

Migration path:

1. Minimal public form: today's `@rekon/capability-memory` with explicit
   memory commands.
2. Next maturity: scope-matching improvements; verification field
   enforcement on resolvers consuming memory.
3. Full maturity: promotion workflow that turns durable memory into
   `Rulebook` entries through a permissioned actuator.

---

## 9. Intent And Work Orders

Classic capability:

- Prepares an intent map and work orders from migration plans, with
  semantic triage, applicable contract warnings, elicitation state, gate
  evidence, anti-gaming verification, and execution graphs.

Classic source areas:

- `packages/product-codebase-intel/src/intent/**`
- `services/IntentPreparationService.ts`
- `lib/intent-preparation/**`

Goal:

- Agents must prove completion against objective gates, not narrate
  confidence. Make verification harder to game than it is to satisfy.

What is good:

- Multiple evidence classes (behavior, semantic, artifact).
- Gate/outcome mapping.
- Anti-gaming constraints (e.g., do not let an agent assert "done"
  without producing evidence).
- Work-unit structure with phases and assertions.
- Elicitation when the plan is underspecified.

What is accidental:

- Tight coupling to migration-plan structure.
- Phase preparation pipelines specific to migrations.

Rekon reinterpretation:

- Role(s): `actuator` (artifact-emitting) and future `governor`.
- Consumes: `ResolverPacket`, `FindingReport`, `MemorySelection`.
- Produces: `IntentMap`, `WorkOrder`, `VerificationPlan`,
  `VerificationResult`.
- Permissions: `read:artifacts`, `write:artifacts`. Source/command-write
  permissions stay deferred.
- Provenance: every work order cites the resolver packet / findings it was
  built from.

Keep:

- Multiple evidence classes for gates.
- Outcome mapping.
- Anti-gaming constraints.
- Work-unit structure (when needed).

Simplify:

- Today's `@rekon/capability-intent` produces minimal work orders.
- Defer migration-plan-specific phase preparation.

Defer:

- Phase preparation pipelines.
- Semantic triage / elicitation prompts.

Do not port:

- Plan-structure-specific assumptions baked into intent shape.

Migration path:

1. Minimal public form: today's `@rekon/capability-intent` work order +
   verification plan.
2. Next maturity: explicit anti-gaming gate types (behavior, semantic,
   artifact).
3. Full maturity: a permissioned actuator that produces and verifies
   work-unit phases with gate evidence.

---

## 10. Reconciliation

Classic capability:

- Selects deterministic operations from a reconciliation plan, applies
  safe ones, defers risky ones, and logs everything.

Classic source areas:

- `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`
- `packages/product-codebase-intel/src/reconcile/**`

Goal:

- Apply only operations that are obviously safe and auditable. Defer
  anything else.

What is good:

- Deterministic-first execution.
- Dry-run as a real mode.
- Deferred-operation list separate from applied operations.
- Logged operations with applied/skipped/deferred status.

What is accidental:

- Inline coupling to several `.codebase-intel/cache/reconciliation/*`
  paths.
- Service handlers that own multiple unrelated reconciliation surfaces.

Rekon reinterpretation:

- Role(s): `actuator`.
- Consumes: `ResolverPacket`, `FindingReport`, `WorkOrder`.
- Produces: `ReconciliationPlan`, `ReconciliationLog`, `ActionLog`.
- Permissions: `read:artifacts`, `write:artifacts` by default;
  `write:source` is opt-in per operation and never the default.
- Provenance: every applied/deferred operation cites the plan entry it
  came from.

Keep:

- Dry-run mode.
- Deterministic-only default.
- Deferred operations recorded separately.
- Applied log written even when no change occurs.

Defer:

- Source-writing operations.
- Command execution.
- Auto-fix workflows.

Do not port:

- Cache-path coupling.
- Multi-surface service handlers.

Migration path:

1. Minimal public form: today's `@rekon/capability-reconcile` artifact-
   only reconciliation.
2. Next maturity: explicit "this would write source if `write:source` were
   granted" entries in the log.
3. Full maturity: permissioned source-writing reconciliation behind
   `write:source`, gated by explicit operator approval per operation.

---

## 11. Watcher And Freshness

Classic capability:

- Watches the repository, debounces file changes, runs analysis batches,
  records heartbeats, checks freshness, and exposes the freshness state
  through context surfaces.

Classic source areas:

- `services/WatchHandler.ts`
- `services/WatchBatchRuntime.ts`
- `lib/context-freshness.ts`
- `lib/watcher-lifecycle.ts`
- `infra/providers/WatchProvider.ts`

Goal:

- Generated context goes stale. The system should know when freshness is
  unproven and say so.

What is good:

- Explicit staleness detection.
- Heartbeat / proof concept.
- Regenerate-on-change without rebuilding everything.
- Watch options (include/exclude, debounce, await-write-finish).

What is accidental:

- Daemon/process lifecycle management embedded in service handlers.
- Watcher-specific batch runtime tightly coupled to analysis service.

Rekon reinterpretation:

- Role(s): future runtime lifecycle / freshness engine. Not a single
  capability — closer to a runtime feature consumed by every artifact
  producer.
- Consumes: artifact index, capability invalidation rules, file-system
  events.
- Produces: updated artifact freshness, optionally `WatcherProof`
  artifacts.
- Permissions: requires file-system event access; opt-in.
- Provenance: each proof cites the artifact ref and the change(s) that
  validated or invalidated it.

Keep:

- Staleness detection.
- Heartbeat / proof concept.
- Regenerate-on-change.
- Capability-declared invalidation as the contract the engine follows.

Simplify:

- Today's runtime exposes `validateArtifactIndex()` for integrity. A
  future engine adds change-event freshness on top.

Defer:

- The full watcher lifecycle.
- Daemon/process management.

Do not port:

- Watcher logic baked into analysis handlers.

Migration path:

1. Minimal public form: integrity validation today; capabilities declare
   `invalidatedBy` rules.
2. Next maturity: a runtime watcher option that updates artifact freshness
   on change events.
3. Full maturity: heartbeat proofs and a `rekon watch` long-running
   subcommand.

---

## 12. GitHub / SaaS / Surfaces

Classic capability:

- Hosted SaaS commands and GitHub governance/action payloads that surface
  repository intelligence into PRs, checks, and workflows.

Classic source areas:

- `commands/saas.ts`
- `packages/product-codebase-intel/src/saas/**`
- GitHub governance/action payload modules

Goal:

- Repository intelligence should reach humans where they already work:
  pull requests, checks, dashboards.

What is good:

- The same artifacts (findings, resolver packets, publications) can drive
  many surfaces.
- GitHub check semantics already align with `FindingReport` severities.

What is accidental:

- A hosted SaaS surface in the same repo as the local substrate.
- Tight coupling between command runners and hosted endpoints.

Rekon reinterpretation:

- Role(s): future `publisher` and surface integrations. Not part of the
  alpha substrate.

Keep:

- The substrate's artifact and capability model already supports new
  surfaces without modification.

Defer:

- GitHub app.
- Dashboard.
- Hosted SaaS.

Do not port:

- Hosted-service code into the local substrate.

Migration path:

1. Minimal public form: nothing in alpha; surfaces are out of scope.
2. Next maturity: a GitHub-check publisher capability that reads
   `FindingReport` artifacts.
3. Full maturity: optional hosted surfaces, separate from the local
   substrate, consuming `@rekon/*` packages as published.

---

## Cross-Cutting Lessons

Across the twelve behavior families, the same lessons keep showing up:

- Evidence-first beats opinion-first.
- Deterministic-first beats semantic-first.
- Provenance is required, not optional.
- Generated outputs are publications, not truth.
- Rules belong in a runtime, not in prose.
- Issues are durable governance artifacts.
- Relationships matter as much as files.
- Resolvers must explain themselves.
- Memory must be scoped, fresh, and verifiable.
- Agents need proof gates, not narratives.
- Reconciliation is deterministic-first.
- Freshness is explicit.
- Capabilities declare consumes, produces, permissions, and invalidation.

Those lessons are the durable plan. See
[classic-wins.md](classic-wins.md) for the concise principle list.

## Limitations

This document is informed by direct inspection of the classic source
checkout at the time of writing. Each behavior family was sampled, but the
classic repo is large; some details may be more nuanced than this
distillation reflects. When a future port reveals additional behavior
worth preserving, update the relevant card and link the discovery in the
review packet.
