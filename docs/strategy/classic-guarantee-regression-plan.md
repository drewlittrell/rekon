# Classic Guarantee Regression Plan

## Purpose

This plan turns the workflow guarantees identified in
[classic-guarantees-audit.md](classic-guarantees-audit.md) into
concrete regression tests. Each entry names the guarantee, points to
the classic source that originally provided it, names the current
Rekon coverage, identifies the missing coverage, and proposes a
regression test plus the implementation batch that should ship it.

The plan is priority-ordered:

- **P0** — must preserve before serious external users land. A gap
  here means the original problem the classic system solved is not
  yet adequately solved by Rekon.
- **P1** — should preserve before beta. Partial Rekon coverage with
  a real gap.
- **P2** — later maturity. Gap is acknowledged and intentionally
  deferred (often Phase C or Phase D).

Tests should live under `tests/contract/`, `tests/docs/`, or a new
`tests/guarantees/` directory at the contributor's discretion. Each
guarantee should have at least one named test that fails if the
guarantee regresses.

For each entry below:

```
Guarantee:
Classic source:
Current Rekon coverage:
Missing coverage:
Proposed regression test:
Implementation batch:
```

## P0 Guarantees

These are the must-preserve guarantees. A failure here means the
original problem the classic system solved is not yet solved by
Rekon.

### P0.1 One command can produce a coherent repo-intelligence state

Guarantee:
- A single command runs observe → project → snapshot → evaluate →
  findings lifecycle → coherency delta → publish architecture →
  artifacts validate → artifacts freshness in the correct order and
  leaves no `stale` artifacts and no `valid: false` issues.

Classic source:
- `services/FullScanHandler.ts` (574 lines), supporting handlers in
  `services/AnalysisService.ts`,
  `services/GraphBuildProvider.ts`,
  `services/RuleCompilationHandler.ts`.

Current Rekon coverage:
- **Closed.** `rekon refresh` orchestrates the full lifecycle in
  the documented order via `runRefresh(root, options)` in the CLI
  helper layer. See
  [../concepts/refresh.md](../concepts/refresh.md).
- Per-command readiness helpers (`ensureSnapshotReady`,
  `ensureCoherencyDeltaReady`, `ensurePreflight`) and per-phase CLI
  verbs remain available for incremental flows.
- `tests/contract/refresh-command.test.mjs` (11 tests) covers
  end-to-end orchestration, expected artifact families, step order,
  malformed-config failure, `--skip-publish`, `--skip-freshness`,
  the repeat-run / historical-stale scenario, the import-boundary
  fixture integration, and that existing commands still work.
- `tests/contract/artifact-freshness.test.mjs` continues to cover
  per-pair staleness.

Missing coverage:
- None for the current scope. Optional follow-ups (path/event
  freshness, watcher daemon) are listed in P1.4 and P2.2.

Proposed regression test:
- Already shipped — `tests/contract/refresh-command.test.mjs`
  exercises: clean fixture run produces every required artifact
  family; `artifacts validate` returns `{ valid: true, issues:
  [] }`; the latest major artifact of each type resolves to
  `fresh` after filtering historical `newer-input-exists` issues;
  a second back-to-back refresh still passes; malformed config
  fails before observe; `--skip-publish` and `--skip-freshness`
  are honored and recorded.

Implementation batch:
- "`rekon refresh` — coherent repo-intelligence state" (shipped).

### P0.2 Findings preserve lifecycle and status across runs

Guarantee:
- An operator decision (accepted / ignored / resolved) survives
  re-running `rekon evaluate` and `rekon findings lifecycle`.
  Findings are not lint noise that re-fires on every run.

Classic source:
- `services/IssueDetectionService.ts` (568 lines),
  `domain/issues/mergeIssues.ts`.

Current Rekon coverage:
- `@rekon/kernel-findings.FindingStatusLedger` and
  `FindingLifecycleReport` artifacts.
- `rekon findings status set` writes a ledger decision.
- `tests/contract/finding-lifecycle.test.mjs` and
  `tests/contract/coherency-delta.test.mjs` cover round-trip
  preservation.

Missing coverage:
- Cross-pack dedupe is partial; if two rule packs emit a finding
  with the same subject, both surface today.
- No explicit false-positive scoring beyond operator marking.

Proposed regression test:
- The existing tests cover the round-trip. A dedup test should be
  added with the issue-adjudication batch (P1.1).

Implementation batch:
- Already preserved at the per-pack level. Cross-pack dedupe is
  P1.1.

### P0.3 Resolver / preflight can explain ownership and next steps

Guarantee:
- Every `ResolverPacket` is explainable: a `resolutionTrace`
  records which source was checked, which source won, why fallback
  happened, and which next resolver is recommended. An operator
  who reads the packet can reconstruct the reasoning.

Classic source:
- `lib/context/resolver.ts`,
  `services/ContextHandler.ts`,
  `handlers/RealTimeContextHandler.ts`,
  `lib/issue-context.ts`.

Current Rekon coverage:
- All four resolvers (`resolve.route`, `resolve.seam`,
  `resolve.preflight`, `resolve.issue`) emit `resolutionTrace`.
- `tests/contract/route-seam-issue-resolvers.test.mjs` covers
  ownership-source precedence, risk rules, and trace shape.
- `tests/contract/verification-aware-issue-remediation.test.mjs`
  covers the new `issue.verification` trace step.

Missing coverage:
- No structural test that asserts "every registered resolver
  produces a packet with a non-empty `resolutionTrace`."

Proposed regression test:
- `tests/contract/resolver-trace-structural.test.mjs`: for every
  resolver returned by `rekon resolve list`, dispatch the
  resolver with minimal inputs and assert the resulting packet
  has `resolutionTrace.length > 0` and every entry has `step`,
  `sourceType`, `status`, and `message`.

Implementation batch:
- Optional small follow-up. Existing per-resolver tests cover the
  practical case.

### P0.4 Publications cite inputs and do not become canonical truth

Guarantee:
- Every published artifact (`Publication`) cites the artifacts it
  was generated from in `header.inputRefs`. The publication
  preface says publications are not canonical truth. Downstream
  consumers cite the underlying artifacts, not the publication.

Classic source:
- `services/ArchitectureDocsHandler.ts`,
  `lib/agent-docs.ts`,
  the assistant-doc projections.

Current Rekon coverage:
- `tests/contract/architecture-summary-publisher.test.mjs`,
  `tests/contract/architecture-summary-proof-loop.test.mjs`,
  `tests/contract/proof-report-publisher.test.mjs` all assert
  `header.inputRefs` content.
- Every publisher's preface text says "publications, not canonical
  truth."

Missing coverage:
- No structural test that walks every `Publication` artifact in a
  workspace and asserts `header.inputRefs.length > 0`.

Proposed regression test:
- `tests/contract/publication-inputrefs-structural.test.mjs`:
  after a clean fixture run that produces all three publications
  (`agents`, `architecture-summary`, `proof-report`), assert each
  one has a non-empty `header.inputRefs`.

Implementation batch:
- Optional small follow-up.

### P0.5 Work orders require proof and anti-gaming guardrails

Guarantee:
- Every `WorkOrder` (resolver-based and remediation-based) lists
  required checks and an anti-gaming guardrail. The paired
  `VerificationPlan` lists the same commands. The paired
  `VerificationResult` records outcomes; failed / partial /
  not-run are first-class. Passing verification does not
  auto-resolve findings.

Classic source:
- `services/IntentPreparationService.ts` (1823 lines),
  `lib/intent-preparation/**`,
  `packages/product-codebase-intel/src/intent/**`.

Current Rekon coverage:
- `tests/contract/remediation-work-order.test.mjs` and
  `tests/contract/verification-result.test.mjs` cover the
  artifact shapes and the status derivation logic.
- `tests/contract/verification-aware-issue-remediation.test.mjs`
  pins the "passing verification does not auto-resolve" invariant.

Missing coverage:
- No test asserts that modifying a `VerificationPlan` to drop a
  command (gaming the gate) is detected. The proof report shows
  the latest plan id; a regression test could assert that a plan
  with fewer commands than the prior plan triggers an
  identifiable signal (stale-plan callout, or a future "plan
  shrunk" warning).

Proposed regression test:
- `tests/contract/verification-plan-shrink-detection.test.mjs`:
  generate a `VerificationPlan` with 3 commands, record a passing
  result, generate a new `VerificationPlan` with 1 command, run
  `publish proof`, and assert the publication does not say
  `passed` for the new plan without a new `VerificationResult`.

Implementation batch:
- The current proof-report publisher already handles this case
  (status is `not-run` for the new plan if no new result exists).
  An explicit test would harden the behavior.

### P0.6 Reconciliation suggestions do not silently source-write

Guarantee:
- `rekon reconcile suggest` classifies every remediation item.
  `source-write-deferred` / `command-deferred` / `manual-review`
  operations are never applied. `--apply` only affects
  `artifact-only` operations. The legacy
  `rekon reconcile --operation <name>` path still denies non-
  artifact-only operations.

Classic source:
- `packages/product-codebase-intel/src/reconcile/PlanHandler.ts`,
  `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`.

Current Rekon coverage:
- `tests/contract/reconciliation-suggestions.test.mjs` covers
  every operation class and the `--apply` interaction.

Missing coverage:
- None for the current scope. Source-write apply is Phase C and
  requires its own gate before it ships (P2.1).

Proposed regression test:
- Already covered.

Implementation batch:
- Already preserved. Source-write apply gate is P2.1.

### P0.7 Freshness distinguishes valid from current

Guarantee:
- `rekon artifacts validate` reports structural validity
  (`{ valid: true | false, issues }`). `rekon artifacts freshness`
  reports lineage currency (`fresh` / `stale` / `partial` /
  `unknown`). A `valid` artifact can be `stale`. The two checks
  are independent and both must run.

Classic source:
- `lib/context-freshness.ts`,
  `services/WatchHandler.ts`,
  artifact-store integrity helpers.

Current Rekon coverage:
- `tests/contract/artifact-freshness.test.mjs` covers status
  transitions; every batch that adds an artifact type adds a
  newer-input staleness test for it.

Missing coverage:
- No path/event-level freshness (P1.4) yet.

Proposed regression test:
- Already covered by the per-batch newer-input tests.
- Optional: a structural test asserts that every artifact type in
  the runtime's `ARTIFACT_CATEGORY_BY_TYPE` map has at least one
  freshness test. Hard to express without a registry; deferred.

Implementation batch:
- Already preserved.

## P1 Guarantees

These are real gaps with partial coverage. They should be closed
before a beta announcement.

### P1.1 Issue adjudication / dedupe / false-positive handling

Guarantee:
- Findings reach humans / agents only after adjudication: dedupe
  across rule packs, false-positive filtering, ownership
  hydration. Findings are signal, not lint noise.

Classic source:
- `services/IssueDetectionService.ts`,
  `domain/issues/mergeIssues.ts`.

Current Rekon coverage:
- Per-pack lifecycle and status preservation.
- Coherency delta rollup excludes accepted/ignored/resolved.

Missing coverage:
- Cross-pack dedupe.
- False-positive scoring beyond operator marking.
- Ownership hydration happens at coherency-delta time, not at
  lifecycle time.

Proposed regression test:
- `tests/contract/finding-dedupe.test.mjs`: synthetic two-pack
  fixture where both packs emit a finding with the same
  `subjects[0]`; assert the `CoherencyDelta` has one active item.

Implementation batch:
- "Issue adjudication maturity" batch, post-audit.

### P1.2 Memory ranking / curation

Guarantee:
- Memory selection ranks entries by an explainable score that
  combines scope match, freshness, and operator-marked
  reliability. Curation can promote durable memory to rulebook
  entries through a permissioned actuator.

Classic source:
- `lib/operator-feedback.ts`,
  `lib/memory/**`,
  `schemas/memory-kind-taxonomy.schema.ts`.

Current Rekon coverage:
- Basic capture / list / select.

Missing coverage:
- Ranking; freshness decay; reliability weighting; curation /
  promotion.

Proposed regression test:
- `tests/contract/memory-ranking.test.mjs`: multiple memory
  entries at the same scope; assert deterministic ranking; assert
  an unreliable memory falls out of selection.

Implementation batch:
- "Memory ranking / curation v1" — explicitly named in the
  classic-behavior roadmap.

### P1.3 Agent-operating-contract publication

Guarantee:
- A publication exists that tells an agent the operating contract
  before it edits: required checks, anti-gaming guardrails, the
  expected next command, owner systems for the changed paths.

Classic source:
- `services/ArchitectureDocsHandler.ts`,
  `lib/agent-docs.ts`,
  `tools/agent-docs/generator.ts`,
  `services/ContextHandler.ts`.

Current Rekon coverage:
- `agents`, `repo-summary`, `architecture-summary`, `proof-report`
  publications.

Missing coverage:
- The `agents` publication is currently a thin summary; it does
  not yet carry an opinionated operating-contract section.

Proposed regression test:
- `tests/contract/agent-operating-contract.test.mjs`: after
  `rekon publish agents` (or a successor publisher), assert the
  publication content contains explicit bullets for required
  checks, anti-gaming guardrails, and the expected next command.

Implementation batch:
- "Agent operating contract publication" — extension of
  `@rekon/capability-docs.publisher` or a new fourth publisher.

### P1.4 Path / event freshness

Guarantee:
- When a tracked source file changes, every artifact whose lineage
  cites that file is marked `stale` without requiring a full
  re-observe.

Classic source:
- `services/WatchHandler.ts`,
  `lib/context-freshness.ts`,
  `lib/watcher-lifecycle.ts`.

Current Rekon coverage:
- Lineage-based freshness (newer indexed input).

Missing coverage:
- File-path / git-event freshness.

Proposed regression test:
- `tests/contract/path-freshness.test.mjs`: after a clean run,
  modify a tracked source file, run `rekon artifacts freshness`,
  assert that artifacts whose lineage cites that file are
  reported as `stale` or `partial`.

Implementation batch:
- "Path / event freshness" batch when file-system events are
  acceptable to track.

### P1.5 Richer graph slices when consumed

Guarantee:
- Every `GraphSlice` artifact cites its evidence inputs and is
  reproducible from those inputs alone. Slices that downstream
  consumers actually need (route, call) ship before the consumer.

Classic source:
- `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`.

Current Rekon coverage:
- Import / symbol / ownership slices.

Missing coverage:
- Route / call / runtime slices.

Proposed regression test:
- `tests/contract/graph-slice-citation.test.mjs`: assert every
  `GraphSlice` artifact's `header.inputRefs` resolves to an
  `EvidenceGraph` (and optionally an `ObservedRepo`).

Implementation batch:
- When the first consumer demands them.

### P1.6 Rulebook / compiled invariant migration

Guarantee:
- Every `Finding.ruleId` resolves to a rulebook entry whose
  severity, scope, and action template can be inspected. Rule
  packs publish both rules and the evaluator that interprets
  them; the rule definition is the contract.

Classic source:
- `services/RuleCompilationHandler.ts`,
  `services/InvariantsCompilationHandler.ts`,
  `lib/analysis/RuleCompilationRunner.ts`.

Current Rekon coverage:
- `@rekon/kernel-rulebook` shape; `@rekon/capability-policy`
  evaluator; first migrated external pack
  (`examples/import-boundary-rule-pack`).

Missing coverage:
- No YAML-compiled rulebook path; community rule packs ship
  hand-written evaluators.

Proposed regression test:
- `tests/contract/finding-ruleid-resolves.test.mjs`: after a
  fixture run, every `Finding` artifact has a non-empty `ruleId`
  AND the rulebook contains a matching entry.

Implementation batch:
- Compiled-rulebook capability when a second community pack
  needs the shared compilation path.

## P2 Guarantees

These are explicitly deferred. Document them so the original problem
isn't quietly lost when the deferred batch lands.

### P2.1 Deterministic source-write reconciliation

Guarantee:
- Source-write reconciliation requires explicit per-operation
  `write:source` permission, dry-run remains the default, and
  every applied operation requires a passing `VerificationResult`
  before promotion.

Classic source:
- `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`.

Current Rekon coverage:
- Source-write operations are always deferred today.

Missing coverage:
- The apply path itself is deferred to Phase C.

Proposed regression test:
- Pre-conditional on the apply path landing: assert that
  promoting a deferred operation to `applied` requires a passing
  `VerificationResult` for the work order it belongs to.

Implementation batch:
- Phase C — explicit user demand and a permission policy.

### P2.2 Watcher daemon

Guarantee:
- A long-running `rekon watch` process keeps freshness live and
  invalidates dependent artifacts in response to file-system or
  git events.

Classic source:
- `services/WatchHandler.ts`,
  `lib/watcher-lifecycle.ts`.

Current Rekon coverage:
- Lineage-based freshness only.

Missing coverage:
- Daemon, events, live invalidation.

Proposed regression test:
- Pre-conditional on the daemon shipping.

Implementation batch:
- Phase C.

### P2.3 GitHub / CI surfaces

Guarantee:
- CI / check-run publishers consume `VerificationResult` directly
  and mark checks failing when status is `failed` / `partial` /
  `not-run`.

Classic source:
- `commands/saas.ts`,
  `packages/product-codebase-intel/src/saas/**`.

Current Rekon coverage:
- None (Phase D).

Missing coverage:
- The CI surface itself.

Proposed regression test:
- Pre-conditional on the first CI publisher.

Implementation batch:
- Phase D.

### P2.4 SaaS / dashboard

Guarantee:
- Hosted surfaces consume existing Rekon artifacts; they do not
  introduce new canonical artifact types.

Classic source:
- `commands/saas.ts`.

Current Rekon coverage:
- None (Phase D).

Missing coverage:
- The hosted surface itself.

Proposed regression test:
- Pre-conditional.

Implementation batch:
- Phase D.

### P2.5 Semantic augmentation / LLM review layers

Guarantee:
- Semantic providers run under explicit `network:outbound`
  permission; deterministic facts always run first; semantic facts
  carry `model` + `version` in provenance; semantic never silently
  overrides deterministic.

Classic source:
- `services/analysis/DeterministicHybridPipeline.ts`.

Current Rekon coverage:
- None (no semantic provider yet).

Missing coverage:
- The whole semantic provider path.

Proposed regression test:
- Pre-conditional on the first semantic provider.

Implementation batch:
- Phase C.

## How To Use This Plan

- Before adding a new test that asserts a workflow guarantee,
  check this plan to see if the guarantee is named and assign
  the test to its entry.
- When closing a P0 or P1 gap, the implementation batch should
  ship the proposed regression test (or a stronger one) and
  update this plan to mark the gap as covered.
- When deferring a guarantee, update the audit entry and this
  plan; do not silently drop coverage.
