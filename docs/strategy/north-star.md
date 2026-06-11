---
freshness:
  paths:
    - docs/strategy/roadmap.md
    - README.md
---
# NorthStar

> **LIVING DOCUMENT.** Maintained as current state; governed by the Documentation authority section in AGENTS.md.

Rekon is an open-source intelligence substrate for codebases: evidence in,
typed artifacts out, extensible capabilities around a shared repository
intelligence snapshot.

This is the durable plan. It explains why Rekon exists, what Rekon is and is
not, the lifecycle Rekon implements, the artifact hierarchy that ties the
lifecycle together, and the architectural rules that protect those layers. It
is a publication document, not a declaration of speed. Code, tests, and
artifact contracts remain the source of truth; this NorthStar protects their
shape.

Treat the NorthStar as the long-lived spec. Roadmap, sequencing, and migration
specifics live in sibling documents and are expected to change more often.

## Why Rekon Exists

Agents and humans need durable, inspectable, extensible codebase context.
Without it:

- Agents redo expensive analyses on every prompt.
- Reviews are based on opinions instead of evidence.
- Ownership, architecture, and policy decisions live in private heads and
  scattered docs that drift from the code.
- Generated outputs (docs, dashboards, AI suggestions) get treated as truth
  even when they have no provenance.

Rekon makes codebase intelligence explicit:

- Evidence facts keep provenance to source.
- Derived artifacts point back to the evidence they came from.
- Capabilities declare what they consume, produce, and require.
- Resolver packets explain where their answers came from.
- Reconciliation is permissioned and artifact-first, not magical.

Rekon is open-source from the first commit because a public substrate is the
only honest way to build trustworthy codebase intelligence. Closed substrates
hide their provenance and become the kind of opaque oracle Rekon is designed
to replace.

## What Rekon Is

Rekon is a local-first intelligence substrate composed of:

- **Kernels.** Pure TypeScript contracts for artifacts, evidence, snapshots,
  graph slices, repository models, rulebooks, and findings. Kernels carry no
  side effects and no runtime state.
- **A public SDK.** `@rekon/sdk` lets built-in and community capabilities
  declare manifests, register handlers, and pass conformance.
- **A local runtime.** `@rekon/runtime` initializes the `.rekon/` workspace,
  writes typed artifacts, indexes them, validates their integrity, and
  executes lifecycle phases against registered capabilities.
- **A CLI.** `rekon` exposes the local lifecycle to operators.
- **Built-in capabilities.** JS/TS observation, model and graph projection,
  policy evaluation, resolver preflight, docs publication, memory, intent,
  and reconciliation are all SDK-conformant capabilities.
- **An artifact-first contract.** Every artifact carries a header with
  schema version, generated time, producer metadata, input refs, freshness,
  and provenance. Every consumer can audit every producer.

Naming is part of the public contract:

- Product/system: **Rekon**
- CLI: **rekon**
- Workspace directory: **`.rekon/`**
- Environment prefix: **`REKON_`**
- Package scope: **`@rekon/*`**

## What Rekon Is Not

Rekon is not, in this alpha:

- A SaaS product or hosted dashboard.
- A package marketplace or extension discovery layer.
- A watcher daemon or full file-change freshness engine.
- A source-rewriting auto-fixer. Source writes require explicit reconciliation
  and permission gates.
- A port or repackaging of `codebase-intel-classic`. The classic repo is a
  reference, dogfood target, and migration source only; Rekon does not import
  from it.
- A schema or validation library. Schema work stays intentionally lightweight
  and dependency-free for the alpha.
- A truth oracle. Published docs and learned memory are useful surfaces, not
  canonical architecture truth.

## Lifecycle

The full Rekon lifecycle is:

`Observe -> Normalize -> Model -> Govern -> Resolve -> Publish -> Act -> Learn -> Reconcile`

Phases:

- **Observe.** Evidence providers turn source into `EvidenceFact` records and
  emit an `EvidenceGraph`.
- **Normalize.** Evidence is deduplicated and unified before projection.
- **Model.** Projectors derive `ObservedRepo`, `OwnershipMap`, `CapabilityMap`,
  and `GraphSlice` artifacts from evidence.
- **Govern.** Evaluators apply `Rulebook` rules and emit `FindingReport`
  artifacts.
- **Resolve.** Resolvers consume the `IntelligenceSnapshot` and emit
  `ResolverPacket` artifacts with a full `resolutionTrace`.
- **Publish.** Publishers emit `Publication` artifacts (e.g., agent guides,
  documentation) derived from snapshot data.
- **Act.** Actuators create `WorkOrder`, `VerificationPlan`, and
  `ReconciliationPlan` artifacts; risky operations stay permission-gated.
- **Learn.** Learners record `OperatorFeedbackEntry` and `MemoryEvent`
  artifacts and produce `MemorySelection` enrichment for resolvers.
- **Reconcile.** Reconciliation produces `ReconciliationPlan` and
  `ReconciliationLog` artifacts; reconciliation may apply accepted changes
  only through explicit permissioned operations.

The alpha implements `Observe -> Project -> Snapshot -> Evaluate -> Resolve ->
Publish -> Learn -> Act`, plus artifact-first `Reconcile`. The full
nine-phase lifecycle is the NorthStar; the alpha is the spine.

## Artifact Hierarchy

Rekon artifacts form a layered hierarchy. Every layer cites the layer below
through `inputRefs` and producer metadata.

1. **Canonical inputs.** `EvidenceFact` and `EvidenceGraph`.
2. **Derived models.** `ObservedRepo`, `OwnershipMap`, `CapabilityMap`,
   `GraphSlice`, and `IntelligenceSnapshot`.
3. **Evaluations.** `Rulebook`, `Finding`, and `FindingReport`.
4. **Resolved outputs.** `ResolverPacket` with `resolutionTrace`.
5. **Publications.** `Publication` artifacts such as agents docs, summaries,
   or generated guides.
6. **Actions.** `WorkOrder`, `VerificationPlan`, `IntentMap`,
   `OperatorFeedbackEntry`, `MemoryEvent`, `MemorySelection`,
   `ReconciliationPlan`, `ReconciliationLog`, `ActionLog`.

Every artifact has an `ArtifactHeader` with:

- `artifactType` and `artifactId`
- `schemaVersion`
- `generatedAt`
- `subject` repository metadata
- `producer` id and version
- `inputRefs` (typed refs back to inputs)
- `freshness` status and reason
- optional `provenance` metadata

The artifact index (`.rekon/registry/artifacts.index.json`) stores file paths
and deterministic digests for every artifact in the workspace.

## Architecture Rule

> Lower layers may feed upper layers. Upper layers may not silently become
> lower-layer truth.

Concretely:

- Evidence feeds models. Models do not rewrite evidence.
- Models feed evaluations and resolvers. Resolvers do not rewrite models.
- Resolvers and evaluations feed publications. Publications do not become
  canonical architecture truth.
- Memory and feedback feed resolver enrichment. They do not rewrite ownership,
  rules, or findings.
- Reconciliation acts on artifacts (and, with explicit permission, on source);
  it does not bypass the artifact trail.

## Open-Source-From-Start Principles

- Public packages, artifact shapes, CLI commands, and documentation are
  product surfaces. Treat them with care from day one.
- Built-ins use the same SDK as community capabilities. There is no special
  internal API for first-party packages.
- Generated artifacts must include schema version, producer metadata, input
  refs, and provenance.
- Capabilities must declare consumes, produces, permissions, invalidation
  rules, and Rekon compatibility before they ship.
- Naming and workspace conventions are public contracts and must not drift.
- Process is transparent: governance, security, contributing, and AGENTS docs
  are baseline artifacts.

## Docs Are Publications

Generated docs are publications, not canonical truth. A `Publication`
artifact is the output of a publisher capability that read the snapshot. The
inputs win. Publications must be regenerable from artifacts.

## Memory Enriches; It Does Not Overwrite

Memory may enrich resolver output, surface operator preferences, and feed
selection. It must not rewrite ownership, rules, findings, or architecture
facts. A `MemorySelection` is a resolver enrichment, not a substitute for
evidence.

## Reconciliation Is Permissioned And Artifact-First

Reconciliation produces plans and logs as artifacts. Permission-gated source
writes happen only through explicit reconciliation operations and only with
the appropriate `write:source` permission declared and granted. Reconciliation
must remain auditable through artifact history.

## Current Alpha Scope

The alpha is a credible spine, not a finished product. It implements:

- Kernel packages for artifacts, evidence, snapshot, graph, repo model,
  rulebook, and findings.
- A public SDK with manifest, registry, validation, and conformance helpers.
- A local runtime with `.rekon/` workspace, typed artifact store, index
  validation, and lifecycle execution.
- A CLI exposing init, capabilities, observe, project, snapshot, evaluate,
  resolve preflight, publish, memory, intent, reconcile, and artifacts
  inspection/validation.
- Built-in capabilities for JS/TS evidence, model, graph, policy, resolver,
  docs, memory, intent, and reconciliation.
- A `resolve.preflight` `ResolverPacket` with explainable `resolutionTrace`.
- A custom-capability example.

The alpha does not yet implement watcher-driven freshness, package
marketplace surfaces, a hosted dashboard, a GitHub app, full classic-repo
behavioral parity, source-writing reconciliation by default, or a schema
library.

## Future Direction

The post-alpha direction is captured in
[docs/strategy/roadmap.md](roadmap.md). The capability roles and contract
are captured in [docs/strategy/capability-model.md](capability-model.md).
Migration from `codebase-intel-classic` is captured in
[docs/strategy/codebase-intel-classic-migration.md](codebase-intel-classic-migration.md),
and the durable distillation of hard-won classic behavior lives in
[docs/strategy/classic-behavior-distillation.md](classic-behavior-distillation.md),
[docs/strategy/classic-wins.md](classic-wins.md),
[docs/strategy/classic-to-rekon-translation.md](classic-to-rekon-translation.md),
[docs/strategy/classic-refactor-principles.md](classic-refactor-principles.md),
[docs/strategy/classic-behavior-roadmap.md](classic-behavior-roadmap.md),
[docs/strategy/classic-alignment-map.md](classic-alignment-map.md),
[docs/strategy/classic-guarantees-audit.md](classic-guarantees-audit.md),
[docs/strategy/classic-guarantee-regression-plan.md](classic-guarantee-regression-plan.md),
and [docs/strategy/classic-subsystem-purpose-map.md](classic-subsystem-purpose-map.md).

The guarantees-audit triple is the anchor for purpose preservation:
treat each classic subsystem as a problem-solution artifact, not as
"weight to remove." Implementation coupling may be simplified;
workflow guarantees must be preserved or explicitly deferred.

The intent is consistent: more capability roles, more language and framework
packs, richer runtime truth, a freshness engine, more publication surfaces,
memory curation and promotion, intent and reconciliation maturity, and (much
later) optional hosted surfaces. All of these should remain compatible with
the artifact hierarchy and the architecture rule above. Each should also
trace back to a classic-behavior distillation rather than appear as an
unanchored speculative feature.

If a future capability or surface would violate the NorthStar, update this
document explicitly before shipping that change.
