# Classic Alignment Map

A quick-lookup table that maps `codebase-intel-classic` source areas to
the Rekon capability/artifact they distill to. Use this when proposing
a port to make sure the alignment is obvious and the destination is
honest.

For the full reasoning behind each row, see
[classic-behavior-distillation.md](classic-behavior-distillation.md).

## Map

| Classic Area | Classic Source (representative) | Rekon Role | Rekon Artifact(s) | Rekon Package(s) | Phase |
| --- | --- | --- | --- | --- | --- |
| Repo observation | `packages/product-codebase-intel/src/replatform/replatform-observe.ts`, `packages/pack-language-*/**`, `services/AnalysisService.ts` | `evidence-provider` | `EvidenceGraph` | `@rekon/capability-js-ts` (+ future language packs), `@rekon/kernel-evidence` | A |
| Repo model derivation | `packages/kernel-repo-model/**`, observed-repo schemas | `projector` | `ObservedRepo`, `OwnershipMap`, `CapabilityMap` | `@rekon/capability-model`, `@rekon/kernel-repo-model` | A |
| Deterministic + LLM analysis | `services/analysis/DeterministicHybridPipeline.ts`, `domain/analysis/assessDeterministicViability.ts` | `evidence-provider` (deterministic today); future opt-in `semantic-provider` | `EvidenceGraph` (deterministic facts today); future `semantic:*` facts | `@rekon/capability-js-ts` today; semantic-provider deferred | A (deterministic) / C (semantic) |
| Graph slices | `services/GraphBuildProvider.ts`, `domain/graph/producers/**` | `projector` per slice | `GraphSlice` | `@rekon/capability-graph`, `@rekon/kernel-graph` | A (import/symbol/ownership) / B (route/call/runtime) |
| Rule engine and governance | `domain/issues/RulesResolver.ts`, `domain/issues/evaluators/**`, `services/RuleCompilationHandler.ts` | `evaluator` | `Finding`, `FindingReport` | `@rekon/capability-policy`, `@rekon/kernel-rulebook`, `@rekon/kernel-findings`; `examples/import-boundary-rule-pack` (first migrated external rule pack); future community rule packs | A (initial) / B (rule packs — import boundary now lives in `examples/`) / C (compiled YAML) |
| Issue detection / coherency delta | `services/IssueDetectionService.ts`, `packages/product-codebase-intel/src/replatform/replatform-delta.ts`, `domain/issues/mergeIssues.ts` | `evaluator`, `projector` (runtime helper today) | `FindingReport`, `FindingStatusLedger`, `FindingLifecycleReport`, `CoherencyDelta` (today); future `HealthProjection`, `RemediationPlan` | `@rekon/capability-policy`, `@rekon/kernel-findings`, `@rekon/runtime` today | A (basic findings) / B (lifecycle/status + coherency delta lite shipped) / C (health score, trend, assistant-doc projection, remediation plan / auto-apply) |
| Resolver / preflight context | `lib/context/resolver.ts`, `services/ContextHandler.ts`, `handlers/RealTimeContextHandler.ts`, `lib/issue-context.ts`, `lib/issue-context/**` | `resolver` | `ResolverPacket` (with `resolutionTrace`) for `resolve.route` / `resolve.seam` / `resolve.preflight` / `resolve.issue` | `@rekon/capability-resolver`, `@rekon/kernel-snapshot` | A (preflight) / B (route, seam, issue shipped) / C (resolver chaining + protected-area approvals) |
| Generated docs / publications | `services/ArchitectureDocsHandler.ts`, `lib/agent-docs.ts`, `tools/agent-docs/generator.ts` | `publisher` | `Publication` | `@rekon/capability-docs` | A (agents) / B (architecture summary) / C (PR/check publishers) |
| Operator feedback / memory | `lib/operator-feedback.ts`, `lib/memory/**`, `schemas/memory-kind-taxonomy.schema.ts` | `learner` | `OperatorFeedbackEntry`, `MemoryEvent`, `MemorySelection` | `@rekon/capability-memory` | A (add/list/select) / B (scope/verification) / C (promotion) |
| Intent and work orders | `packages/product-codebase-intel/src/intent/**`, `services/IntentPreparationService.ts` | `actuator` (today); future `governor` | `IntentMap`, `WorkOrder`, `VerificationPlan`, future `VerificationResult` | `@rekon/capability-intent` | A (basic) / C (anti-gaming gates, phase prep) |
| Reconciliation | `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`, `packages/product-codebase-intel/src/reconcile/**` | `actuator` | `ReconciliationPlan`, `ReconciliationLog`, `ActionLog` | `@rekon/capability-reconcile` | A (artifact-only) / C (deterministic source writes behind `write:source`) |
| Watcher / freshness | `services/WatchHandler.ts`, `lib/context-freshness.ts`, `lib/watcher-lifecycle.ts` | runtime lifecycle / freshness engine | artifact `freshness` updates; future `WatcherProof` | `@rekon/runtime` (today: `validateArtifactIndex`); future freshness engine | A (integrity) / B (change-event freshness) / C (watcher) |
| GitHub / SaaS / surfaces | `commands/saas.ts`, `packages/product-codebase-intel/src/saas/**`, GitHub governance payloads | future `publisher` / surface integrations | future `Publication` shapes for PRs/checks/dashboards | Out of substrate scope | D |

## How To Use The Map

1. Identify the classic behavior you intend to port.
2. Find the row that covers it.
3. Read the relevant card in
   [classic-behavior-distillation.md](classic-behavior-distillation.md).
4. Check the rules in
   [classic-refactor-principles.md](classic-refactor-principles.md).
5. State the Rekon role, artifact, consumes/produces, permissions, and
   freshness/invalidation up front.
6. Confirm the phase in
   [classic-behavior-roadmap.md](classic-behavior-roadmap.md).
7. Include a `CODEBASE-INTEL ALIGNMENT` section in the work order
   (`AGENTS.md` requires it).

If the classic area is not in the map, add a row before proposing the
port. If the row exists but the destination is hand-wavy, refine the
distillation first.

Cross-references:

- [classic-behavior-distillation.md](classic-behavior-distillation.md)
- [classic-wins.md](classic-wins.md)
- [classic-to-rekon-translation.md](classic-to-rekon-translation.md)
- [classic-refactor-principles.md](classic-refactor-principles.md)
- [classic-behavior-roadmap.md](classic-behavior-roadmap.md)
- [codebase-intel-classic-migration.md](codebase-intel-classic-migration.md)
