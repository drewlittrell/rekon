# Classic Wins

These are the durable principles distilled from `codebase-intel-classic`.
They are the answer to "what should Rekon preserve, no matter how the
implementation evolves?"

This is the short, opinionated version. Behavior cards live in
[classic-behavior-distillation.md](classic-behavior-distillation.md).

## 1. Evidence Before Opinion

- Classic source: `packages/product-codebase-intel/src/replatform/replatform-observe.ts`,
  `packages/kernel-evidence/**`, `services/AnalysisService.ts`.
- Why it matters: opinions drift; evidence with provenance survives
  re-runs and reviewers.
- Rekon expression: every artifact is derived from an `EvidenceGraph` (or
  another artifact that cites one), and every fact has a source ref.

## 2. Deterministic Before Semantic

- Classic source: `services/analysis/DeterministicHybridPipeline.ts`,
  `domain/analysis/assessDeterministicViability.ts`.
- Why it matters: deterministic extraction is cheap, repeatable, and
  auditable. LLM augmentation is the last resort, not the first.
- Rekon expression: `evidence-provider` capabilities run deterministic
  extraction by default. Future semantic augmentation is opt-in, behind
  explicit permission, with its model id and inputs recorded in artifact
  provenance.

## 3. Provenance On Every Claim

- Classic source: every analysis/issue/context artifact records the
  source files/lines/inputs it depends on.
- Why it matters: without provenance, claims become opinion. With
  provenance, every downstream consumer can audit the chain.
- Rekon expression: `ArtifactHeader` requires `producer`, `inputRefs`, and
  `provenance`. Resolver packets ship a `resolutionTrace`.

## 4. Generated Docs Are Publications, Not Truth

- Classic source: `services/ArchitectureDocsHandler.ts`,
  `lib/agent-docs.ts`, generated `docs/architecture/**`.
- Why it matters: when docs become canonical truth, the system stops
  trusting its own evidence and starts trusting paragraphs.
- Rekon expression: `Publication` artifacts cite the snapshot/resolver/
  finding inputs that produced them. Publications never feed back into
  evidence. The architecture rule is enforced by contract.

## 5. Rules Should Be Executable, Not Just Prose

- Classic source: `domain/issues/RulesResolver.ts`,
  `domain/issues/evaluators/**`,
  `services/RuleCompilationHandler.ts`.
- Why it matters: prose rules drift from reality. Executable rules with
  stable IDs and pass/fail/skipped/unimplemented/error semantics keep
  policy honest.
- Rekon expression: `Rulebook` + `evaluator` capabilities + `Finding` /
  `FindingReport` artifacts. Community rule packs are first-class.

## 6. Issues Are Governance Artifacts, Not Lint Noise

- Classic source: `services/IssueDetectionService.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`.
- Why it matters: issues should be durable, mergeable, filterable, and
  routable to remediation — not ephemeral console output.
- Rekon expression: `Finding` and `FindingReport` are typed artifacts
  with severity, source refs, and headers. Future `CoherencyDelta`,
  `HealthProjection`, and `RemediationPlan` layer on top.

## 7. Graphs Reveal Relationships That File Summaries Miss

- Classic source: `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`.
- Why it matters: ownership, risk, change impact, and architecture
  coherence are relational properties.
- Rekon expression: `GraphSlice` artifacts produced by per-relationship
  `projector` capabilities. Consumers pull only the slices they need.

## 8. Resolver Output Should Explain Itself

- Classic source: `lib/context/resolver.ts`, `services/ContextHandler.ts`.
- Why it matters: an answer without a trace is indistinguishable from a
  guess. Operators (human or agent) need to know which inputs led to the
  conclusion.
- Rekon expression: `ResolverPacket` ships a `resolutionTrace` covering
  source precedence, fallbacks, finding/memory checks, and risk rules.

## 9. Memory Must Be Scoped, Verified, And Fresh

- Classic source: `lib/operator-feedback.ts`, `lib/memory/**`,
  `schemas/memory-kind-taxonomy.schema.ts`.
- Why it matters: untyped, unscoped, unverified memory becomes legend
  instead of evidence and contaminates resolver output.
- Rekon expression: `OperatorFeedbackEntry`, `MemoryEvent`, and
  `MemorySelection` artifacts. Memory enriches resolver output; it never
  rewrites ownership/rule facts.

## 10. Agents Need Proof Gates, Not Confidence Narratives

- Classic source: `packages/product-codebase-intel/src/intent/**`,
  `services/IntentPreparationService.ts`.
- Why it matters: agents will narrate completion when they should be
  proving it. Objective gates close that gap.
- Rekon expression: `IntentMap` and `WorkOrder` artifacts plus
  `VerificationPlan` (today) and `VerificationResult` (future) with
  evidence classes (behavior, semantic, artifact).

## 11. Reconciliation Should Be Deterministic-First And Defer Risky Operations

- Classic source:
  `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`,
  `packages/product-codebase-intel/src/reconcile/**`.
- Why it matters: reconciliation that applies risky changes by default
  becomes feared and bypassed. Reconciliation that applies only safe
  changes becomes trusted.
- Rekon expression: `ReconciliationPlan` and `ReconciliationLog`
  artifacts. Source-writing and command execution stay deferred until a
  later permissioned actuator phase.

## 12. Freshness Must Be Explicit

- Classic source: `services/WatchHandler.ts`, `lib/context-freshness.ts`,
  `lib/watcher-lifecycle.ts`.
- Why it matters: stale context masquerading as current context is worse
  than no context.
- Rekon expression: capability manifests declare `invalidatedBy` rules;
  the runtime tracks artifact freshness; a future watcher engine
  consumes both.

## 13. Capabilities Should Declare Inputs, Outputs, Permissions, And Invalidation

- Classic source: implicit across packs, providers, and rule evaluators.
- Why it matters: extensibility without declared contracts becomes
  spaghetti.
- Rekon expression: `CapabilityManifest` (`consumes`, `produces`,
  `permissions`, `invalidatedBy`, `compatibility`) plus
  `validateCapability()` and `assertCapabilityConforms()` enforcement.

---

These thirteen principles are the durable plan. They are independent of
file structure and independent of the alpha implementation. If a future
port can preserve all thirteen, it has preserved the win.

Cross-references:

- [classic-behavior-distillation.md](classic-behavior-distillation.md)
- [classic-to-rekon-translation.md](classic-to-rekon-translation.md)
- [classic-refactor-principles.md](classic-refactor-principles.md)
- [classic-behavior-roadmap.md](classic-behavior-roadmap.md)
- [classic-guarantees-audit.md](classic-guarantees-audit.md)
- [classic-guarantee-regression-plan.md](classic-guarantee-regression-plan.md)
- [classic-subsystem-purpose-map.md](classic-subsystem-purpose-map.md)
- [north-star.md](north-star.md)
