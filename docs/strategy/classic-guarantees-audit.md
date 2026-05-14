# Classic Guarantees Audit

## Why This Doc Exists

`codebase-intel-classic` is not "messy old code" to replace. It is a
hard-fought reference implementation whose shape encodes workflow
guarantees. Rekon should not copy the shape wholesale, but it must
preserve the problems solved and the operational guarantees provided.

Treat the distinction as load-bearing:

- **Implementation coupling may be simplified.**
- **Workflow guarantees must be preserved or explicitly deferred.**

This audit walks the major classic subsystems as problem-solution
artifacts. For each one it identifies the original failure mode, the
workflow guarantee the classic implementation provided, what Rekon
currently preserves, what Rekon may be discounting, and the
regression test needed to prove the original problem is still solved.

This audit is the anchor for future implementation slices. Before
proposing capability, resolver, publisher, actuator, memory, freshness,
issue, or orchestration work, contributors should re-read the relevant
subsystem entry here and confirm their proposal preserves (or
explicitly defers) the documented guarantee.

## How To Read A Subsystem Entry

Each entry below uses this structure:

```
Original problem:
Classic workflow guarantee:
Classic shape that provided the guarantee:
What Rekon already preserves:
What Rekon may be discounting:
Current gap:
Rekon equivalent guarantee:
Regression test needed:
Priority:
Next implementation slice:
```

"Priority" reflects how much remaining gap matters before serious
external users land. P0 means the original problem is not adequately
solved yet; P1 means partial coverage and a real gap; P2 means the
gap is acknowledged and intentionally deferred.

For the operational test plan see
[classic-guarantee-regression-plan.md](classic-guarantee-regression-plan.md).
For a quick-reference table see
[classic-subsystem-purpose-map.md](classic-subsystem-purpose-map.md).

---

## 1. Full Scan / Refresh Orchestration

Original problem:
- A repo intelligence run that calls observation, projection,
  snapshot, evaluation, lifecycle, coherency delta, publication,
  validation, and freshness as **separate** commands accumulates
  partial-state failures. An operator who runs five of nine phases
  and forgets the rest produces stale snapshots, missing findings,
  stale publications, and unbuildable proof loops.
- Without a single command that owns the whole sequence, agents and
  humans drift into inconsistent state and waste reviews chasing
  freshness, not real drift.

Classic workflow guarantee:
- One invocation of `FullScanHandler.run(...)` produced a coherent
  repo-intelligence state: every required artifact was rebuilt in
  the correct order, every downstream consumer saw a fresh
  upstream, and the run wrote a checkpoint per phase so a partial
  failure could be inspected and resumed.
- Cache discipline, evidence-before-issues ordering, issue
  detection only after the model was built, docs/graphs/status
  regenerated after source changes — all guaranteed.

Classic shape that provided the guarantee:
- `services/FullScanHandler.ts` runs the phased pipeline and writes
  a checkpoint per phase via `recordCheckpoint(runId, phase,
  status, details)` so partial failures are inspectable.
- Supporting orchestration: `services/AnalysisService.ts`,
  `services/GraphBuildProvider.ts`,
  `services/RuleCompilationHandler.ts`, the model + graph + issue +
  docs handlers, and the cache lifecycle in `lib/cache/**`.

What Rekon already preserves:
- **`rekon refresh` (shipped).** Orchestrates all nine phases —
  `init` (heals only a missing config; leaves a malformed config
  for `config.validate` to report), `config.validate`, `observe`,
  `project`, `snapshot`, `evaluate`, `findings.lifecycle`,
  `coherency.delta`, `publish.architecture`,
  `artifacts.validate`, `artifacts.freshness` — in the documented
  order, stops on the first failure, and writes a structured
  report with per-step status and artifact refs.
- Each phase is also its own CLI verb (`rekon observe`, `project`,
  `snapshot`, `evaluate`, `findings lifecycle`, `coherency delta`,
  `intent remediation`, `reconcile suggest`, `verify record`,
  `publish architecture`, `publish proof`) for incremental flows.
- Readiness helpers (`ensureSnapshotReady`,
  `ensureCoherencyDeltaReady`, `ensurePreflight`) still cover the
  most common per-command chains.
- Generic `runEvaluate`, `runResolve`, `runPublish`, `runAct` accept
  an explicit handler id so the same phases can be driven
  programmatically.
- The artifact store with `header.inputRefs` + freshness validator
  detects mismatched state; `rekon refresh` applies a **latest-
  major** interpretation that ignores `newer-input-exists` issues
  pointing to historical inputs (e.g. the `FindingLifecycleReport`
  intentionally cites every prior `FindingReport`).

What Rekon may be discounting:
- `FullScanHandler` looks like heavy orchestration weight, but the
  weight is actually the workflow guarantee. The phased checkpoint
  writer encodes: "every phase ran in order, here is the evidence
  trail." `rekon refresh` reproduces the operational guarantee
  without porting the cache or per-phase checkpoint artifacts;
  Rekon's `inputRefs` + `artifacts.validate` + `artifacts.freshness`
  cover what those checkpoints recorded.

Current gap:
- Closed for the current scope. Path/event freshness (P1.4) and a
  long-running watcher daemon (P2.2) remain explicit future
  guarantees.

Rekon equivalent guarantee:
- `rekon refresh` exists. It orchestrates the lifecycle in the
  documented order; latest-major artifacts of each required type
  resolve to `fresh` after a clean run; `rekon artifacts validate`
  returns `{ valid: true, issues: [] }`; a second back-to-back
  refresh still passes because historical artifacts no longer
  pollute the latest-major verdict.

Regression test needed:
- Shipped in `tests/contract/refresh-command.test.mjs` (11 tests):
  clean-fixture produces every required artifact family; steps
  run in documented order; status `passed` when latest-major is
  fresh; malformed config fails before observe; `--skip-publish`
  and `--skip-freshness` are honored and recorded; a second
  refresh still passes; existing commands continue to work after
  refresh; the import-boundary fixture integration surfaces
  active findings in the produced architecture summary.

Priority: **P0 (preserved)**

Next implementation slice: path/event freshness (P1.4) when the
operator demand for live invalidation is concrete. Until then,
`rekon refresh` is the canonical way to produce a current state.

---

## 2. Evidence And Repo Observation

Original problem:
- Static analysis answers are only as good as the evidence they
  rest on. A pipeline that mixes deterministic facts with opinions,
  or that loses provenance when files change, produces results
  agents and humans cannot trust.

Classic workflow guarantee:
- Evidence was recorded as discrete facts with a provider, a
  subject (file, symbol, capability, etc.), a kind, and provenance
  (which adapter/pack produced it). Re-running observation produced
  the same evidence given the same files (deterministic). Evidence
  was the single canonical input that every downstream layer cited.

Classic shape that provided the guarantee:
- `packages/product-codebase-intel/src/replatform/replatform-observe.ts`,
  `packages/pack-language-*/**`,
  `services/AnalysisService.ts` (deterministic side),
  evidence-fact schemas and dedupe helpers.

What Rekon already preserves:
- `@rekon/kernel-evidence` provides `EvidenceFact` / `EvidenceGraph`
  / `ProviderContext` / dedupe helpers.
- `@rekon/capability-js-ts` is the first built-in evidence
  provider; community packs (e.g. `examples/import-boundary-rule-pack`)
  use the same contract.
- `rekon observe` produces an `EvidenceGraph` with full provenance
  per fact.

What Rekon may be discounting:
- Classic evidence accumulated *language pack* providers in one
  place so cross-language correlations stayed consistent. Rekon's
  community-extension model assumes capability authors will produce
  language packs as needed — that is fine, but the operational
  guarantee (one repo-wide evidence graph with consistent provenance)
  depends on the runtime listing every active provider, which is
  still implicit.

Current gap:
- The deterministic foundation is in place. Cross-language
  correlation (e.g. shared symbol identity across language packs)
  is not yet exercised by a multi-language fixture.

Rekon equivalent guarantee:
- `rekon observe` always produces an `EvidenceGraph` whose facts
  cite a provider id, a subject, and a kind, and re-running against
  the same source produces the same facts (modulo
  generatedAt/digest). Multi-pack runs preserve provenance per
  fact.

Regression test needed:
- Run `rekon observe` twice against `examples/simple-js-ts` and
  assert that the produced `EvidenceGraph` facts are deeply equal
  modulo `generatedAt` and digests. (Existing tests partially cover
  this; an explicit determinism assertion is missing.)
- A self-skipping multi-pack fixture asserts that two evidence
  providers in the same workspace produce facts with distinct
  provider ids and no silent overwrites.

Priority: **P1**

Next implementation slice: multi-pack evidence determinism test
fixture; consider it when the second built-in evidence provider
lands.

---

## 3. Deterministic + Semantic Analysis

Original problem:
- Pure LLM analysis is non-deterministic and unauditable. Pure
  deterministic analysis misses semantic nuance. A pipeline that
  silently mixes them produces results that look reproducible but
  aren't.

Classic workflow guarantee:
- Deterministic analysis ran first and was the source of truth.
  Semantic/LLM analysis was opt-in, recorded its model+version in
  provenance, and never silently overrode deterministic facts.
  `services/analysis/DeterministicHybridPipeline.ts` enforced the
  ordering;
  `domain/analysis/assessDeterministicViability.ts` decided when
  semantic was actually needed.

Classic shape that provided the guarantee:
- `services/analysis/DeterministicHybridPipeline.ts`,
  `domain/analysis/assessDeterministicViability.ts`, plus the
  shared evidence schema that recorded `provider` and
  `confidence` for every fact.

What Rekon already preserves:
- The current alpha has only deterministic evidence providers.
- The capability model reserves a `semantic-provider` role for
  future LLM evidence providers behind explicit
  `network:outbound` permission.
- `Rekon does not currently allow semantic overrides.`

What Rekon may be discounting:
- The viability assessment step in classic was itself a guarantee:
  "we ran the deterministic path first, and we only fell back to
  semantic when the deterministic answer was structurally
  incomplete." Without that gate, future Rekon semantic providers
  could silently become the default analysis path.

Current gap:
- No semantic provider exists yet, so the gate doesn't need to
  exist yet. But the strategy doc should keep the gate as an
  explicit requirement before any semantic provider ships.

Rekon equivalent guarantee:
- When (and only when) a semantic provider lands, it must declare
  `network:outbound`, record `model`+`version` in provenance, and
  pass through an explicit `assessDeterministicViability`-style
  hook before contributing facts. Deterministic facts must always
  be reported first; semantic facts must be marked.

Regression test needed:
- A future test asserts no semantic provider runs without
  `network:outbound` permission AND that any `EvidenceFact` whose
  provider is marked semantic carries `provenance.model` and
  `provenance.version`. Pre-conditional on the first semantic
  provider landing.

Priority: **P2** (no semantic provider yet)

Next implementation slice: defer; document the gate before the
first semantic provider proposal lands.

---

## 4. Graph Intelligence

Original problem:
- Many useful questions ("who calls this?", "what imports this
  module?", "which routes touch this owner?") are graph questions.
  Reasoning about them from raw evidence requires re-deriving
  edges every time, which is slow and silently inconsistent.

Classic workflow guarantee:
- Graph projections were derived from evidence, never invented,
  and shipped as named slices (import graph, symbol graph,
  ownership graph, route graph, call graph). Each slice cited its
  input evidence and could be regenerated deterministically.

Classic shape that provided the guarantee:
- `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**`,
  `packages/product-codebase-intel/src/graph/**`.

What Rekon already preserves:
- `@rekon/kernel-graph` defines `GraphSlice`, edges, nodes, and
  per-slice metadata.
- `@rekon/capability-graph` projects import / symbol / ownership
  slices today; the architecture allows per-slice projectors to be
  added.
- `rekon project` emits the configured slices through the standard
  artifact store with full input refs.

What Rekon may be discounting:
- Classic had richer slices (route, call, runtime). Rekon's alpha
  ships a useful subset; missing slices are *capabilities the
  community can add*, but the operational guarantee — "every
  GraphSlice cites its evidence" — must hold for those future
  slices too.

Current gap:
- Route, call, and runtime slices are deferred; that's documented
  in the roadmap and explicitly acceptable for alpha.

Rekon equivalent guarantee:
- Every `GraphSlice` artifact cites its evidence inputs and is
  reproducible from those inputs alone. Consumers (resolvers,
  publishers) cite the slice they used.

Regression test needed:
- `rekon project --json` against `examples/simple-js-ts` produces
  `GraphSlice` artifacts whose `header.inputRefs` resolve to
  `EvidenceGraph` and (where appropriate) `ObservedRepo`. Re-run
  produces deeply-equal slices modulo timestamps/digests. (Some
  freshness coverage already exists; an explicit slice-citation
  test is the addition.)

Priority: **P1**

Next implementation slice: route / call slice projectors when the
first real consumer (e.g. a richer route-resolver feature) needs
them.

---

## 5. Rule Engine / Compiled Invariants

Original problem:
- Hand-written analyses scattered across services produce
  inconsistent severities, duplicate logic, and silent drift when
  a rule changes. Without a rulebook contract, agents and humans
  cannot tell why a finding fired or whether the same rule still
  fires the same way next week.

Classic workflow guarantee:
- Rules compiled from declarative YAML / TS into `Rulebook` entries
  with stable ids, severities, scopes, and action templates. Every
  finding cited the `ruleId` that produced it; the rulebook was
  the contract between evaluators and downstream consumers.

Classic shape that provided the guarantee:
- `domain/issues/RulesResolver.ts`,
  `domain/issues/evaluators/**`,
  `services/RuleCompilationHandler.ts`,
  `services/InvariantsCompilationHandler.ts`,
  `lib/analysis/RuleCompilationRunner.ts`.

What Rekon already preserves:
- `@rekon/kernel-rulebook` defines `Rulebook` and rule shape.
- `@rekon/capability-policy` runs the default evaluator and
  consumes a rulebook.
- `examples/import-boundary-rule-pack` is the first migrated
  external rule pack; it ships rules, an evaluator, and a self-
  installing test.
- Findings carry `ruleId` and an explicit severity from the
  rulebook entry.

What Rekon may be discounting:
- Classic had compilation: YAML or declarative TS → compiled rule
  table → evaluator dispatch. Rekon currently expects rule packs
  to ship their own evaluator code directly; that's simpler but
  loses the "single source-of-rule-truth" guarantee.

Current gap:
- No YAML-compiled rulebook entry path. Community rule packs ship
  hand-written evaluators today.

Rekon equivalent guarantee:
- Every `Finding.ruleId` resolves to a rulebook entry whose
  severity, scope, and action template can be inspected. A rule
  pack publishes both rules and the evaluator that interprets
  them; the rule definition is the contract.

Regression test needed:
- `rekon evaluate` produces findings whose `ruleId` is non-empty
  AND whose `severity` matches the rulebook entry. The
  import-boundary fixture exercises this today; lift it to a
  named test.

Priority: **P1**

Next implementation slice: compiled-rulebook capability + YAML
schema, when a second community rule pack demands the shared
compilation path.

---

## 6. Issue Detection And Adjudication

Original problem:
- Raw evaluator output is not actionable. The same defect can fire
  five times across five rules; false positives accumulate; status
  decisions get lost between runs; ownership annotations are
  missing; the result is lint noise, not governance signal.

Classic workflow guarantee:
- `IssueDetectionService` did not just *detect*; it *adjudicated*.
  It ran multi-phase adjudication (dedupe, false-positive
  filtering, ownership hydration, status preservation), then
  produced a coherency delta with prioritized remediation steps and
  a filtered audit trail. Findings reaching humans/agents had
  already survived adjudication.

Classic shape that provided the guarantee:
- `services/IssueDetectionService.ts` (568 lines),
  `domain/issues/mergeIssues.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`,
  plus the lifecycle helpers and dedupe logic in
  `domain/issues/**`.

What Rekon already preserves:
- `@rekon/kernel-findings` defines `Finding`, `FindingReport`,
  `FindingStatusLedger`, `FindingLifecycleReport`, `CoherencyDelta`,
  and the lifecycle derivation logic.
- `rekon findings lifecycle` and `rekon coherency delta` produce
  the lifecycle and delta artifacts.
- `rekon findings status set` preserves accepted / ignored /
  resolved decisions across runs.
- Active counts exclude accepted/ignored/resolved; remediation
  priority maps from severity.

What Rekon may be discounting:
- The `IssueDetectionService` shape is 568 lines because
  adjudication, dedupe, false-positive filtering, and ownership
  hydration are not free. Rekon today does lifecycle/status
  preservation and coherency rollup; explicit dedupe and
  false-positive filtering are partial (mostly relying on rules
  not emitting duplicates).

Current gap:
- No explicit dedupe pass across rule packs.
- No false-positive scoring (beyond operator marking).
- No ownership hydration step that runs against findings *before*
  the report is consumed by lifecycle (today the ownership
  attribution happens at coherency-delta time).

Rekon equivalent guarantee:
- After `rekon evaluate → findings lifecycle → coherency delta`,
  every active finding has ownership attribution, a status that
  respects prior operator decisions, and no duplicate from a
  cross-pack collision.

Regression test needed:
- Synthetic two-pack fixture where both packs emit findings with
  the same subject; assert the produced `CoherencyDelta` contains
  one active item, not two (or, if duplicate detection is
  intentionally deferred, document that and skip).
- Round-trip test: evaluate → set status accepted → re-evaluate →
  lifecycle → assert finding remains accepted (already partially
  covered).

Priority: **P1**

Next implementation slice: cross-pack dedupe + false-positive
scoring pass on `FindingLifecycleReport`. Pair with the rulebook
compilation work so dedupe operates on stable rule ids.

---

## 7. Coherency Delta And Remediation Roll-Up

Original problem:
- Even with adjudicated findings, an agent or human looking at
  drift needs *one* artifact that says: here is the active set,
  here are the priorities, here is what to fix next.

Classic workflow guarantee:
- A single artifact rolled up active vs accepted/ignored/resolved
  counts, severity/system/type breakdowns, top affected paths, and
  an ordered remediation queue. Consumers (publications, intent,
  reconciliation) read from this single artifact, not the raw
  finding report.

Classic shape that provided the guarantee:
- `packages/product-codebase-intel/src/replatform/replatform-delta.ts`
  and `replatform-delta-projections.ts`.

What Rekon already preserves:
- `@rekon/kernel-findings.CoherencyDelta` with summary, items,
  remediation queue.
- `rekon coherency delta` builds it from the latest lifecycle
  report.
- `@rekon/capability-docs.architecture-summary` and the new
  `.proof-report` publisher consume it.
- `@rekon/capability-intent.remediation-work-order` and
  `@rekon/capability-reconcile.actuator` (suggestion mode) consume
  the remediation queue.

What Rekon may be discounting:
- Classic deltas included trend information (changes between
  consecutive deltas). Rekon's alpha does not yet compute trend.

Current gap:
- No delta-over-delta trend; no health score; no per-system
  priority weighting.

Rekon equivalent guarantee:
- The latest `CoherencyDelta` represents the active governance
  state and is the canonical input for the proof loop. Every
  downstream consumer cites it in `inputRefs`.

Regression test needed:
- Already covered by the existing coherency-delta and
  architecture-summary contract tests. A trend test should land
  with the trend implementation.

Priority: **P0 (already preserved)** / P1 (trend)

Next implementation slice: optional `CoherencyDeltaHistory` /
trend projection, when a real consumer demands it.

---

## 8. Resolver / Context / Preflight

Original problem:
- An agent asked "I need to change X" must know: who owns X,
  whether the change is cross-owner, what relevant findings touch
  X, what memory applies, what the risk tier is, and what the next
  required step is. Without that, agents edit blind.

Classic workflow guarantee:
- `ContextHandler` + the route/seam/preflight resolver flow
  produced a context packet with ownership, relevant findings,
  applicable memory, risk tier, required checks, and an explicit
  next-step recommendation. Every answer was explainable: the
  resolver trace recorded which source won, which fell back, and
  why.

Classic shape that provided the guarantee:
- `lib/context/resolver.ts`,
  `services/ContextHandler.ts`,
  `handlers/RealTimeContextHandler.ts`,
  `lib/issue-context.ts`,
  `lib/issue-context/**`.

What Rekon already preserves:
- `@rekon/capability-resolver` ships `resolve.route`, `resolve.seam`,
  `resolve.preflight`, and `resolve.issue`.
- Every `ResolverPacket` includes `resolutionTrace` recording
  source precedence (OwnershipMap → ObservedRepo → GraphSlice →
  EvidenceGraph fallback), risk rules, finding annotations, memory
  selection, and the next-required-resolver decision.
- `resolve.issue` recently gained verification-aware context
  (`IssuePacket.verification` summary + warnings + trace step).

What Rekon may be discounting:
- Classic's `RealTimeContextHandler` was a live updating context
  layer; Rekon's resolver is request-response with artifact
  freshness rather than live invalidation. That's intentional but
  worth flagging.
- Memory integration in classic spanned scope-aware ranking;
  Rekon's memory selection is simpler today.

Current gap:
- Live invalidation / streaming context is deferred.
- Resolver chaining (a packet that automatically triggers the
  next packet) is intentionally not done; the next-step is
  recommended, not executed.

Rekon equivalent guarantee:
- Every `ResolverPacket` is explainable, cites every artifact it
  consulted, and recommends a single next step. Passing
  verification informs but does not auto-resolve findings.

Regression test needed:
- `resolutionTrace` step coverage tests already exist for
  ownership / risk / memory / verification.
- A future test could assert "every published resolver handler
  produces a packet with a non-empty `resolutionTrace` and at
  least one used/fallback/warning step" — a structural invariant.

Priority: **P0 (already preserved)** / P2 (live invalidation)

Next implementation slice: live-context / streaming invalidation
is Phase C; not needed for alpha.

---

## 9. Generated Docs / Agent Docs

Original problem:
- An agent that has not been told the operating contract of the
  repo (required checks, ownership boundaries, generated-doc
  policy, anti-gaming rules) will guess. Reading raw artifacts is
  too expensive at action-time.

Classic workflow guarantee:
- Generated docs were the agent's operating contract: required
  checks, owner systems, ownership policy, generated-doc policy,
  and the proof expectations were surfaced *before* the agent
  edited code, in a medium agents reliably read.

Classic shape that provided the guarantee:
- `services/ArchitectureDocsHandler.ts`,
  `services/ContextHandler.ts`,
  `lib/agent-docs.ts`,
  `tools/agent-docs/generator.ts`,
  plus the assistant-doc projections in
  `packages/product-codebase-intel/src/replatform/replatform-delta-projections.ts`.

What Rekon already preserves:
- `@rekon/capability-docs` ships three publishers today:
  - `.publisher` — `agents` + `repo-summary` publications.
  - `.architecture-summary` — full governance + proof-loop
    publication (Work Orders, Reconciliation Plans, Verification
    Status, Proof Loop sections).
  - `.proof-report` — focused proof readout for the latest
    plan/result triple.
- Every publication cites `header.inputRefs`; preface text says
  publications are not canonical truth.

What Rekon may be discounting:
- Classic's *agent operating contract* doc was opinionated:
  "these are the checks that must pass, these are the owners,
  these are the rules you must not bypass." Rekon's `agents.md`
  publication today is a thin summary of indexed intelligence; it
  does not yet carry the same opinionated operating-contract
  weight (required checks list, anti-gaming policy, "do not edit
  X without preflight" rules).

Current gap:
- The `agents` publication is a useful summary but is not yet a
  full operating contract. Anti-gaming language lives in
  remediation work orders and the proof report, not in the
  agent-facing publication that an agent reads *before* it edits.

Rekon equivalent guarantee:
- A publication exists that explicitly tells an agent: "before
  you edit code, run preflight; the required checks are X; the
  governance rules are Y; do not modify tests, validators, or
  rules to make a gate appear green." Cited from artifacts, not
  hard-coded.

Regression test needed:
- After `rekon publish agents` (or a future `rekon publish
  agent-contract`), the produced publication contains explicit
  bullets for: required checks, anti-gaming guardrails, and the
  expected next command before code edits. Currently the agents
  publication has the indexed-intelligence summary; the operating
  contract content is the gap.

Priority: **P1**

Next implementation slice: extend `@rekon/capability-docs.publisher`
(the `agents` kind) to render an operating-contract section, or add
a fourth `agent-contract` publisher. Either way it must consume
the same artifacts (CoherencyDelta, WorkOrder, anti-gaming text)
and never become canonical truth itself.

---

## 10. Operator Feedback And Memory

Original problem:
- Useful repo-specific knowledge — "this file is generated, do
  not edit", "always run the migration before X", "treat
  warning Y as advisory" — accumulates faster than rules can
  encode it. Without a memory layer, every agent run loses that
  knowledge.

Classic workflow guarantee:
- Operator feedback was captured, scoped (file/path/system),
  scored for reliability/freshness/specificity, ranked at recall
  time, and promoted to durable knowledge when consistently
  validated. Memory was not just notes — it was a quality-managed
  knowledge base with explicit recall and curation paths.

Classic shape that provided the guarantee:
- `lib/operator-feedback.ts`,
  `lib/memory/**`,
  `schemas/memory-kind-taxonomy.schema.ts`.

What Rekon already preserves:
- `@rekon/capability-memory` registers a learner.
- `rekon memory add`, `rekon memory list`, and `rekon memory
  select` cover capture and basic scope-based recall.
- `MemorySelection` artifacts are written and consumed by
  resolvers.

What Rekon may be discounting:
- Classic memory was a *quality* system: reliability scoring,
  freshness decay, specificity weighting, promotion to durable
  knowledge. Rekon's alpha memory is more "operator-supplied
  notes that the resolver may pull in." That's a real gap
  because as memory volume grows, recall quality becomes the
  whole game.

Current gap:
- No ranking by reliability / freshness / specificity.
- No curation / promotion to `Rulebook` entries.
- No context-usage feedback loop ("memory X was selected but
  unused N times → demote").

Rekon equivalent guarantee:
- `MemorySelection` artifacts are ranked by an explainable score
  that combines scope match, freshness, and operator-marked
  reliability. Curation can promote durable memory into rulebook
  entries through a permissioned actuator.

Regression test needed:
- Multiple memory entries at the same scope rank deterministically;
  a memory marked unreliable falls out of selection.

Priority: **P1**

Next implementation slice: Memory ranking / curation v1 — the next
batch identified in the previous review packet.

---

## 11. Intent Preparation / Proof Gates

Original problem:
- Agents tend to declare work complete via narrative confidence
  rather than objective proof. Without intent preparation that
  separates objective from verification and binds verification to
  artifact evidence, agents game gates: delete failing tests,
  weaken validators, or run checks selectively.

Classic workflow guarantee:
- `IntentPreparationService` (1823 lines) was anti-agent-gaming
  infrastructure, not just task planning. Guarantees:
  - implementation objective is separated from verification
    artifact (you cannot "complete" the work by writing the
    verification);
  - gates prove work, they do not become work (modifying tests
    does not satisfy the gate);
  - actionability and phase constraints are explicit (an agent
    cannot claim Phase 3 done without producing Phase 2 proof);
  - completion evidence is required and must be artifact-cited.

Classic shape that provided the guarantee:
- `services/IntentPreparationService.ts` (1823 lines),
  `lib/intent-preparation/**`,
  `packages/product-codebase-intel/src/intent/**`.

What Rekon already preserves:
- `@rekon/capability-intent` produces `IntentMap`, `WorkOrder`,
  `VerificationPlan`, `VerificationResult` artifacts.
- Resolver-based and CoherencyDelta-based work orders both ship.
- Anti-gaming language is in the work-order markdown and the
  proof-report publication.
- `VerificationResult` distinguishes passed/failed/partial/not-run;
  passing verification does not auto-resolve findings.
- `resolve.issue` and `intent remediation --skip-verified` consume
  verification evidence without mutating findings.

What Rekon may be discounting:
- 1823 lines of classic intent service is not arbitrary weight.
  It encodes phase parsing, actionability assessment, gate
  quality scoring, elicitation state, and parallel work-unit
  scheduling. Rekon ports the *artifact shape* (objective, scope,
  checks, guardrails, evidence) but does not yet port the
  *adjudication logic* (which gates are gameable in which way,
  which phases require which prior proof).

Current gap:
- No phase parser / phase artifact renderer.
- No actionability question engine.
- No gate-quality classifier ("this gate is structural, that gate
  is narrative").
- No elicitation state for ambiguous intents.
- No parallel work-unit scheduling.

Rekon equivalent guarantee:
- Every `WorkOrder` cites the resolver/delta it derives from;
  every `VerificationPlan` cites its `WorkOrder`; every
  `VerificationResult` cites its `VerificationPlan`. Anti-gaming
  guardrails are visible in both the work order and the proof
  report. Passing verification never auto-resolves a finding.

Regression test needed:
- The "passed verification does not flip finding status" test
  already exists in
  `tests/contract/verification-aware-issue-remediation.test.mjs`.
- A future test should assert that modifying a `VerificationPlan`
  to remove a command (gaming the gate) is visible: the resulting
  proof report and architecture summary must show that the latest
  plan differs from the prior plan and call it out.

Priority: **P1** (artifact shape preserved; adjudication logic
deferred)

Next implementation slice: phase artifact / actionability engine
when the alpha graduates to a workflow that needs them.

---

## 12. Reconciliation / Deterministic Operations

Original problem:
- "Auto-fix" pipelines that silently rewrite source produce
  invisible regressions. A reconciliation step that promises
  deterministic apply without explicit permission and evidence
  becomes a foot-gun.

Classic workflow guarantee:
- Reconciliation was deterministic-first and dry-run by default.
  Source-write operations required explicit permission and
  evidence. Deferred operations were first-class — recording what
  *could* be done but wasn't, with the reason. Plans cited their
  inputs; logs cited the plan; action logs cited everything.

Classic shape that provided the guarantee:
- `packages/product-codebase-intel/src/reconcile/PlanHandler.ts`,
  `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`,
  `packages/product-codebase-intel/src/reconcile/**`.

What Rekon already preserves:
- `@rekon/capability-reconcile.actuator` runs in two modes:
  manual (`--operation docs_regeneration`) and suggestion
  (`rekon reconcile suggest`).
- Suggestion mode classifies each remediation item into one of
  five operation classes (`artifact-only`,
  `source-write-deferred`, `command-deferred`, `manual-review`,
  `deterministic-deferred`) with `requiresPermission`.
- Source-write and command-execution operations are *always*
  deferred regardless of `--apply`; the artifact-only path
  preserves the original alpha behavior.
- Plans / logs / action logs cite every input.

What Rekon may be discounting:
- Classic had per-operation verification hooks
  (`PlanExecutorService` ran a check after each apply). Rekon
  doesn't yet have that because Rekon doesn't yet apply
  source-writing operations. When it does, the post-apply
  verification gate must be a *requirement*, not optional.

Current gap:
- No source-write apply path (intentionally deferred to Phase C).
- No per-operation verification hook scaffold.

Rekon equivalent guarantee:
- Reconciliation plans classify and defer all non-artifact-only
  operations. `--apply` is only meaningful for `artifact-only`
  operations. The artifact lineage from `CoherencyDelta` →
  `WorkOrder` → `ReconciliationPlan` → `VerificationPlan` →
  `VerificationResult` is unbroken.

Regression test needed:
- The "source-write-deferred operations are not applied even
  with --apply" test already exists in
  `tests/contract/reconciliation-suggestions.test.mjs`.
- A future test should assert that a Phase-C deterministic
  source-write apply requires a passing `VerificationResult`
  before promotion from `deferred` to `applied`.

Priority: **P0 (current scope preserved)** / P2 (source-write
apply when it lands)

Next implementation slice: deterministic source-write apply with
post-apply verification gate is Phase C.

---

## 13. Watcher / Freshness / Live Context Trust

Original problem:
- Static analysis answers go stale as source changes. Without a
  freshness signal, an agent operates on yesterday's context and
  doesn't know it.

Classic workflow guarantee:
- A watcher could prove freshness or invalidate context in
  response to file-system or git events. Agents and humans could
  trust that the answer they read still applied to the current
  source.

Classic shape that provided the guarantee:
- `services/WatchHandler.ts`,
  `lib/context-freshness.ts`,
  `lib/watcher-lifecycle.ts`.

What Rekon already preserves:
- `@rekon/runtime.validateArtifactFreshness` walks artifact
  `inputRefs` and marks an artifact `stale` when any cited input
  has a newer indexed sibling.
- `rekon artifacts freshness --json` reports per-artifact status
  with explicit `issues` (e.g. `newer-input-exists`).
- Every batch since freshness landed has added invalidation
  rules for new artifact types (`coherency.changed`,
  `proof-loop.changed`, `verification.changed`).

What Rekon may be discounting:
- Classic watcher was *event-driven*. Rekon's freshness is
  *lineage-driven* and runs on demand. That's correct for alpha
  but means an agent who never runs `rekon artifacts freshness`
  doesn't see staleness until they do.

Current gap:
- No daemon / watcher.
- No path/event-level freshness (e.g. "since this file changed
  at HEAD, every artifact that cites it is stale").

Rekon equivalent guarantee:
- `rekon artifacts freshness` reports per-artifact status across
  every artifact type Rekon ships, and the lineage graph is
  complete (every artifact cites the inputs it actually consumed).

Regression test needed:
- After every batch's "newer X marks Y stale" test pattern, the
  lineage is provably complete. The audit should call out that
  *every new artifact type added must come with a freshness
  test*. The new `proof-report-publisher.test.mjs` follows this
  pattern.

Priority: **P1** (lineage freshness works; path/event freshness
deferred)

Next implementation slice: a future `rekon watch` daemon, when
external users need live invalidation; deferred to Phase C.

---

## 14. GitHub / CI / PR Surfaces

Original problem:
- An intelligence pipeline that only runs locally never reaches
  PR review. Without a CI/check surface, governance signal lives
  in nobody's workflow.

Classic workflow guarantee:
- GitHub governance payloads mapped `FindingReport` severities
  onto PR check semantics; PR/check publishers turned the proof
  loop into a status surface that blocked merge when verification
  failed.

Classic shape that provided the guarantee:
- `commands/saas.ts`,
  `packages/product-codebase-intel/src/saas/**`,
  classic GitHub governance payloads.

What Rekon already preserves:
- Nothing yet. This is explicitly Phase D — out of the local
  substrate.

What Rekon may be discounting:
- The CI surface is intentionally deferred; the strategy is
  consistent. The risk is that a downstream contributor builds
  GitHub integration without preserving the proof-loop discipline
  (e.g. a check that turns green on confidence narrative rather
  than `VerificationResult`).

Current gap:
- No CI / check-run publisher.

Rekon equivalent guarantee:
- When a CI publisher ships, it must consume
  `VerificationResult` directly (not synthesize success) and must
  mark checks failing when `status` is `failed`, `partial`, or
  `not-run`.

Regression test needed:
- Pre-conditional on the first CI publisher landing: assert that
  a `VerificationResult` with status `partial` causes the
  publisher to emit a `failure` check, not `success`.

Priority: **P2** (Phase D)

Next implementation slice: deferred; document the guarantee
before the first CI integration proposal.

---

## 15. SaaS / Dashboard Surfaces

Original problem:
- Without an aggregated view across repos, organizations lose
  governance signal at the team/org level.

Classic workflow guarantee:
- SaaS surfaces consumed the same artifact contracts the local
  runtime produced; the dashboard read `Publication` and
  `FindingReport` artifacts as-is. The promise: nothing in the
  local intelligence pipeline depended on the dashboard, and the
  dashboard added no new ground truth.

Classic shape that provided the guarantee:
- `commands/saas.ts`,
  `packages/product-codebase-intel/src/saas/**`.

What Rekon already preserves:
- Nothing. Phase D scope.

What Rekon may be discounting:
- The hard-fought lesson — "the dashboard is a consumer, not a
  source of truth" — must be preserved when SaaS work lands.

Current gap:
- No SaaS / dashboard surface.

Rekon equivalent guarantee:
- Any future SaaS surface reads existing Rekon artifacts and
  introduces no new canonical artifact types without going
  through the kernel + capability process.

Regression test needed:
- Pre-conditional on a SaaS surface landing.

Priority: **P2** (Phase D, out of substrate scope)

Next implementation slice: deferred; document the guarantee
before the first hosted-surface proposal.

---

## How To Use This Audit

1. Before proposing a new capability, resolver, publisher,
   actuator, memory, freshness, issue, or orchestration batch,
   read the relevant subsystem entry above.
2. Identify which workflow guarantee your work must preserve (or
   explicitly defer). Quote it in the work order.
3. Include a `PURPOSE PRESERVATION CHECK` section in the review
   packet that names the original problem, the classic guarantee,
   what Rekon currently preserves, what your batch adds, and the
   regression test that would prove the original problem is still
   solved.
4. If your batch defers a guarantee, say so explicitly. Do not
   call the classic shape "weight" unless you identify which
   guarantee is preserved elsewhere.

For the operational test plan, see
[classic-guarantee-regression-plan.md](classic-guarantee-regression-plan.md).
For the quick-reference table, see
[classic-subsystem-purpose-map.md](classic-subsystem-purpose-map.md).
