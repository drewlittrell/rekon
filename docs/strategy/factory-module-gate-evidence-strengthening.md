# Factory / Module-Gate Evidence Strengthening

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> Combined strategy + implementation memo. Strengthens
> the two remaining `DetectorDetails`-attributed
> graph-aware checks — `factory-file-creates-deps` and
> `module-gate-verified-caller` — by adding
> `EvidenceGraph` symbol/export branches at the top of
> each filter while preserving path-evidence fallback.

## Decision Summary

**Add `EvidenceGraph` symbol/export branches at the top
of `graphFilterFactoryFileCreatesDeps` and
`graphFilterModuleGateVerifiedCaller`. Keep all existing
path / CapabilityMap / ObservedSystem branches as
fallback. Defer projector-side `ObservedSystem.kind`
population to a later slice.**

The decision flows directly from the
[graph-aware fixture coverage operator review v2](graph-aware-fixture-coverage-operator-review-v2.md):

- Option C still holds for alpha (no import producer
  migration).
- `factory-file-creates-deps` and
  `module-gate-verified-caller` are the two
  `DetectorDetails`-attributed reasons and the
  identified next evidence-strengthening candidates.
- The classic guarantee is "strongest available
  deterministic evidence wins" — adding an
  artifact-backed branch above the existing
  path-evidence branch satisfies that guarantee for
  files whose names follow the canonical factory /
  gate-evaluator conventions, while keeping path /
  capability evidence as a fallback for files whose
  names don't.

Why projector `ObservedSystem.kind` population is
deferred:

- The capability-model projector currently emits one
  `ObservedSystem` per first path segment (`src`,
  `tests`, etc.) via
  `ownerFromPath(path) = path.split("/")[0]`.
- Annotating the `src` system with `kind: "module"`
  would be wrong (it isn't a module).
- Synthesizing per-module `ObservedSystem`s (one per
  `src/modules/<name>/` root) would also require
  re-routing OwnershipMap entries from `src` to the
  module system, which is broad enough churn that the
  v2 operator-review memo recommended deferring it.
- The work order explicitly allows this deferral: "If
  populating `ObservedSystem.kind` creates broad
  churn, defer and rely on EvidenceGraph symbol/export
  facts."

The existing `module-gate-verified-caller`
`ObservedSystem.kind === "module"` branch in
`graphFilterModuleGateVerifiedCaller` (which sets
`usedArtifacts: ["OwnershipMap", "ObservedRepo"]`) is
unchanged. It remains the future entry point for a
deferred projector slice that will give factory /
module-gate files structural system evidence.

## Current Baseline

Per the
[graph-aware fixture coverage operator review v2](graph-aware-fixture-coverage-operator-review-v2.md)
measured against `b2f74b8`:

| Fixture | Reason | `evidenceSource` | EvidenceGraph InputRef |
| --- | --- | --- | --- |
| `factory-file` | `factory-file-creates-deps` | `DetectorDetails` | no |
| `module-gate` | `module-gate-verified-caller` | `DetectorDetails` | no |

Both fixtures already produce the EvidenceGraph
`symbol` and `export` facts that the new branches will
consume — confirmed by an out-of-band smoke against the
committed fixtures at `b2f74b8`:

- `factory-file` →
  `EvidenceGraph.facts` includes a `symbol` and an
  `export` fact for `createWidgetService` (a
  `function`, `exported: true`) under subject
  `src/core/services/widgets/WidgetFactory.ts`.
- `module-gate` →
  `EvidenceGraph.facts` includes a `symbol` and an
  `export` fact for `evaluatePaymentGate` (a
  `function`, `exported: true`) under subject
  `src/modules/payments/PaymentGateEvaluator.ts`.

The substrate is already in place; the change is
filter-side only.

## Problem

The two `DetectorDetails` attributions document
that the current decisions rest on path evidence
alone — `usedArtifacts: []` per current filter
design — even though the EvidenceGraph carries
artifact facts that name the file's role (the
`Factory`-named class / `createWidgetService`
function for the factory fixture; the
`evaluatePaymentGate` function under
`PaymentGateEvaluator.ts` for the module-gate
fixture).

Path evidence is acceptable fallback (the
fixture names follow Rekon's canonical
conventions), but **the strongest available
deterministic evidence is artifact-backed**. The
classic codebase-intel guarantee says the
strongest evidence should be cited. The
publication / agent-contract surfaces already
distinguish `EvidenceGraph` from `DetectorDetails`
attribution and ask reviewers to weight
`DetectorDetails` more critically — so even
without behavior change, lifting attribution from
`DetectorDetails` to `EvidenceGraph` improves the
audit signal.

## Candidate Projection Targets

The work order asked which projection target should
back the strengthening. Each is evaluated against
how much it would change today.

### Option 1: EvidenceGraph symbol/export facts

**Selected.**

- Already produced by `@rekon/capability-js-ts` for
  every TypeScript / JavaScript source file.
- The factory + module-gate fixtures already
  produce the right facts (confirmed by smoke).
- Filter-side change is purely additive: insert a
  new branch at the top of each filter; preserve
  existing branches as fallback.
- `usedArtifacts: ["EvidenceGraph"]` → attribution
  surfaces as `EvidenceGraph`.
- No producer change. No schema bump. No projector
  churn.

### Option 2: `ObservedSystem.kind === "module"`

**Deferred.**

- Already present in the filter as branch B of
  `graphFilterModuleGateVerifiedCaller` (with
  `usedArtifacts: ["OwnershipMap", "ObservedRepo"]`)
  but never fires from real fixtures today because
  the capability-model projector produces
  first-segment-only owner systems (`src`, `tests`,
  …), not per-module systems.
- Populating it correctly requires either:
  (a) modifying `@rekon/capability-js-ts` to emit
  `ownership_hint` facts that route
  `src/modules/<name>/` paths to per-module
  systems (broad producer change);
  (b) modifying the `@rekon/capability-model`
  projector to synthesize per-module systems
  post-hoc (model-projection churn).
- Branch B's code path stays intact for the
  follow-up slice that takes either of those
  approaches.

### Option 3: CapabilityMap role tags

**Deferred (existing scaffolding stays).**

- `graphFilterFactoryFileCreatesDeps` already has
  a CapabilityMap fallback (`FACTORY_CAPABILITY_HINTS`
  = `["factory", "init", "bootstrap"]`) that fires
  when a capability whose name contains one of those
  hints covers the file. It sets
  `usedArtifacts: ["CapabilityMap"]`.
- Adding a first-class `role: "factory"` /
  `role: "module-gate"` field to `CapabilityMap`
  entries would need a CapabilityMap schema change
  and a producer pass — defer until the substrate
  is justified.

### Option 4: New artifact type

**Rejected.**

The v3 operator-review memo and the
GraphOntologyValidator-lite audit both explicitly
reject "add a broad new artifact type" for this kind
of strengthening. Symbol / export facts already
exist; the projection target is already there.

## Decision

**Selected projection target: EvidenceGraph
symbol/export facts.**

Implementation shape:

1. Add a new top-priority branch to
   `graphFilterFactoryFileCreatesDeps`:
   - **High confidence** when any symbol/export name
     for the file's path includes `Factory`.
   - **Medium confidence** when any symbol/export
     name starts with `create` AND the file path
     includes `Factory` / `factory`.
   - `usedArtifacts: ["EvidenceGraph"]`.
   - Evidence string explicitly names the symbol /
     export that triggered the match and identifies
     EvidenceGraph as the source.
2. Add a new top-priority branch to
   `graphFilterModuleGateVerifiedCaller`:
   - **High confidence** when any symbol/export name
     for the file's path includes `GateEvaluator`.
   - **Medium confidence** when any symbol/export
     name starts with `evaluate` AND contains
     `Gate` (case-sensitive; matches
     `evaluatePaymentGate`,
     `evaluateFeatureGate`, etc.).
   - `usedArtifacts: ["EvidenceGraph"]`.
   - Evidence string explicitly names the symbol /
     export that triggered the match and identifies
     EvidenceGraph as the source.

Both branches sit ABOVE the existing path /
ObservedSystem.kind / CapabilityMap branches so
that artifact-backed evidence wins over
path-evidence when both are present.

## Implementation Shape

### Factory filter (`graphFilterFactoryFileCreatesDeps`)

New order of precedence:

1. **A0 (new).** EvidenceGraph symbol/export facts.
   `usedArtifacts: ["EvidenceGraph"]` →
   `evidenceSource: "EvidenceGraph"`.
2. **A (existing).** Path evidence (`Factory.ts`,
   `factory.ts`, `core/services/**/init/**`).
   `usedArtifacts: []` →
   `evidenceSource: "DetectorDetails"`.
3. **B (existing).** CapabilityMap hint (`factory`
   / `init` / `bootstrap` capability covers the
   file). `usedArtifacts: ["CapabilityMap"]` →
   `evidenceSource: "DetectorDetails"` (CapabilityMap
   is not in the EvidenceGraph > ObservedRepo
   precedence chain today; that classification is
   out of scope for this batch and tracked as
   follow-up).

### Module-gate filter (`graphFilterModuleGateVerifiedCaller`)

New order of precedence:

1. **A0 (new).** EvidenceGraph symbol/export facts.
   `usedArtifacts: ["EvidenceGraph"]` →
   `evidenceSource: "EvidenceGraph"`.
2. **A (existing).** GateEvaluator path signal.
   `usedArtifacts: []` →
   `evidenceSource: "DetectorDetails"`.
3. **B (existing).** ObservedSystem.kind === "module"
   via OwnershipMap.
   `usedArtifacts: ["OwnershipMap", "ObservedRepo"]`
   → `evidenceSource: "ObservedRepo"`.
4. **C (existing).** `/modules/` path fallback.
   `usedArtifacts: []` →
   `evidenceSource: "DetectorDetails"`.

### Attribution precedence summary

| Branch | Filter | `usedArtifacts` | `evidenceSource` |
| --- | --- | --- | --- |
| Factory A0 (new) | factory-file | `["EvidenceGraph"]` | `EvidenceGraph` |
| Factory A | factory-file | `[]` | `DetectorDetails` |
| Factory B | factory-file | `["CapabilityMap"]` | `DetectorDetails` |
| Module-gate A0 (new) | module-gate | `["EvidenceGraph"]` | `EvidenceGraph` |
| Module-gate A | module-gate | `[]` | `DetectorDetails` |
| Module-gate B | module-gate | `["OwnershipMap", "ObservedRepo"]` | `ObservedRepo` |
| Module-gate C | module-gate | `[]` | `DetectorDetails` |

If both A0 and A would match for the same file (the
canonical case — a `WidgetFactory.ts` file with a
`createWidgetService` export), **A0 wins** because it
runs first. Attribution shifts from `DetectorDetails`
to `EvidenceGraph` without changing which findings
are filtered.

If A0 fires for a file whose path does NOT match A
(e.g. a `FooFactory` class in `src/services/foo.ts`),
that IS a new filtered case — artifact-backed
evidence now suppresses where path heuristics did
not. This is the intended behavior of
artifact-backed strengthening per the work order's
per-section guidance. The expanded coverage is
documented and pinned by tests so future operators
can audit it.

## Fallback Policy

**Path fallback survives.** If the EvidenceGraph is
missing, empty, or carries no symbol/export facts for
the file, the existing path-evidence branches fire
exactly as before. Repos that haven't yet produced an
EvidenceGraph (or have one with incomplete fact
coverage) continue to filter the same set of findings
with `DetectorDetails` attribution.

**CapabilityMap fallback survives.** The factory
filter's CapabilityMap hint branch still fires when
neither EvidenceGraph nor path evidence matches but a
configured capability covers the file. `usedArtifacts:
["CapabilityMap"]`.

**OwnershipMap / ObservedSystem.kind branch
survives.** The module-gate filter's
`ObservedSystem.kind === "module"` branch (B) stays
in place. It does not fire from the current fixture
because the projector doesn't emit per-module
systems; once the projector is updated in a future
slice, it will fire automatically and attribution
will surface as `ObservedRepo`.

## Tests Required

The contract test at
`tests/contract/factory-module-gate-artifact-evidence.test.mjs`
must pin (against `4240ebd` + this slice):

1. `factory-file` fixture run end-to-end →
   `evidenceSource: "EvidenceGraph"`.
2. `factory-file` evidence string names the
   `WidgetFactory` symbol / `createWidgetService`
   export.
3. `factory-file` with EvidenceGraph cleared (symbols
   stripped) → path fallback fires →
   `evidenceSource: "DetectorDetails"`.
4. `module-gate` fixture run end-to-end →
   `evidenceSource: "EvidenceGraph"`.
5. `module-gate` evidence string names the
   `PaymentGateEvaluator` symbol /
   `evaluatePaymentGate` export.
6. `module-gate` with EvidenceGraph cleared AND a
   synthetic `OwnershipMap` + `ObservedRepo` with
   `kind: "module"` seeded → branch B fires →
   `evidenceSource: "ObservedRepo"`.
7. `module-gate` with both EvidenceGraph and
   ObservedSystem.kind evidence absent → path
   fallback fires → `evidenceSource:
   "DetectorDetails"`.
8. Path / CapabilityMap fallback decisions do NOT
   cite EvidenceGraph in
   `FindingFilterReport.header.inputRefs`.
9. EvidenceGraph-backed factory / module-gate
   decisions DO cite EvidenceGraph in
   `FindingFilterReport.header.inputRefs`.
10. ObservedRepo-backed module-gate decisions DO
    cite ObservedRepo in
    `FindingFilterReport.header.inputRefs`.
11. Raw `FindingReport` remains byte-preserved for
    every scenario (artifact-first invariant).
12. Lifecycle / adjudication / coherency exclude
    artifact-backed filtered findings (no live
    finding leaks into governance).
13. `FindingFilterHealthSummary.graphAwareByEvidenceSource`
    reflects the correct attribution split per
    scenario.
14. `rekon artifacts validate` returns
    `{ valid: true, issues: [] }` for every
    scenario.

## Deferred Work

- **Per-module `ObservedSystem` projection** —
  modify the `@rekon/capability-model` projector
  (or upstream `@rekon/capability-js-ts`
  `ownership_hint` emitter) to detect
  `src/modules/<name>/...` paths and synthesize
  `ObservedSystem`s with `kind: "module"`. Once that
  ships, branch B of
  `graphFilterModuleGateVerifiedCaller` fires
  automatically from real fixtures and attribution
  surfaces as `ObservedRepo`. Tracked as the next
  follow-up after this batch.
- **CapabilityMap `role` field** — add a first-class
  `role` / `kind` field to `CapabilityMap.entries[]`
  so capability authors can declare role-level
  intent (`role: "factory"`, `role: "module-gate"`)
  instead of relying on capability-name string
  matching. Defer until the substrate is justified
  by multiple consumers.
- **`evidenceSourceFromGraphArtifacts`
  CapabilityMap precedence** — today the classifier
  recognizes `EvidenceGraph` and `ObservedRepo` but
  not `CapabilityMap`; CapabilityMap-only matches
  classify as `DetectorDetails`. A small follow-up
  could add `CapabilityMap` to the precedence chain
  (likely between `ObservedRepo` and
  `DetectorDetails`); not in scope for this batch.
- **Graph-aware fixture coverage operator review v3
  — shipped.** The
  [v3 operator review](graph-aware-fixture-coverage-operator-review-v3.md)
  re-ran the operator-review protocol against the
  post-strengthening attribution profile, confirmed
  Option C, and recorded the graph-aware v1 / v2 / v3
  arc as **alpha-complete**. The recommended next
  slice is to return to **issue merge decision
  freshness guardrails** (previously deferred until
  filtering / graph-aware parity was stronger; that
  condition is now satisfied).

## Cross-References

- [Graph-aware fixture coverage operator review v2](graph-aware-fixture-coverage-operator-review-v2.md)
- [Graph-aware fixture coverage operator review v3](graph-aware-fixture-coverage-operator-review-v3.md)
- [Graph-aware import evidence operator review refresh](graph-aware-import-evidence-operator-review-refresh.md)
- [Import fact subject-shape decision memo](import-fact-subject-shape-decision.md)
- [GraphOntologyValidator-lite audit](graph-ontology-validator-lite-audit.md)
- [Graph-aware filter provider v3 decision memo](graph-aware-filter-provider-v3-decision.md)
- [Issue governance ADR](issue-governance-architecture-decision.md)
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [Finding filters concept](../concepts/finding-filters.md)
- [EvidenceGraph artifact](../artifacts/evidence-graph.md)
- [FindingFilterReport artifact](../artifacts/finding-filter-report.md)
- [FindingFilterHealthReport artifact](../artifacts/finding-filter-health-report.md)
- [Classic guarantee regression plan](classic-guarantee-regression-plan.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
- [Roadmap](roadmap.md)
