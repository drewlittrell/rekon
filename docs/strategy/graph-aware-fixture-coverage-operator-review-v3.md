# Graph-Aware Fixture Coverage Operator Review v3

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> Strategy memo only. **No runtime behavior changes ship in
> this slice.** Re-runs the
> [v2 operator review](graph-aware-fixture-coverage-operator-review-v2.md)
> protocol against the **post-strengthening fixture
> attribution profile** (after the
> [factory / module-gate evidence strengthening v1](factory-module-gate-evidence-strengthening.md)
> slice shipped at `a2a2d25`), re-evaluates the four
> migration triggers from the
> [import fact subject-shape decision memo](import-fact-subject-shape-decision.md)
> against the now-complete artifact-backed coverage, and
> decides whether the **graph-aware v1 / v2 / v3 arc is
> alpha-complete**.

## Decision Summary

**Recommendation: Option C remains the alpha decision.
The graph-aware v1 / v2 / v3 arc is alpha-complete.**

> **All six graph-aware reasons attribute as
> `EvidenceGraph` against the committed fixtures.** No
> filtered case in the fixture suite still rests on
> `DetectorDetails` or `ObservedRepo` fallback. Path /
> CapabilityMap / OwnershipMap fallback branches remain
> in the filter implementation for repos with
> non-canonical names, but they are no longer the
> fixture baseline.
>
> **No import fact producer migration in alpha unless a
> trigger is met.** All four triggers re-evaluated
> against the post-strengthening data — none met.
>
> **Factory / module-gate artifact evidence
> strengthening closes the last known
> fixture-attribution gap.** The two reasons the v2
> review identified as candidates for evidence
> strengthening
> (`factory-file-creates-deps`,
> `module-gate-verified-caller`) now attribute as
> `EvidenceGraph` end-to-end.
>
> **The graph-aware v1 / v2 / v3 arc is
> alpha-complete.** Every shipped graph-aware reason
> has deterministic fixture coverage; every fixture
> positive is `EvidenceGraph`-backed; the diagnostic
> surface (publications + `evidenceSource` + per-reason
> matrix) is in place; and no remaining graph-aware
> reason requires further strengthening before alpha.

The next implementation slice should return to the
deferred issue-governance trust gap —
**issue merge decision freshness guardrails** — now
that filtering / graph-aware parity is no longer
blocking that work.

## Why This Review Exists

Three batches of graph-aware work landed since the v2
review at `4240ebd`:

- **`b2f74b8`** — graph-aware filter fixture coverage v2.
  Added the three remaining fixtures
  (`route-http-middleware-only` positive + negative,
  `factory-file`, `module-gate`) so every graph-aware
  reason had deterministic end-to-end coverage.
- **`4240ebd`** — graph-aware fixture coverage operator
  review v2. Re-confirmed Option C against the now-six
  fixtures; recorded `EvidenceGraph: 4 /
  DetectorDetails: 2 / ObservedRepo: 0` baseline;
  identified `factory-file-creates-deps` and
  `module-gate-verified-caller` as the next
  evidence-strengthening candidates.
- **`a2a2d25`** — factory / module-gate artifact evidence
  strengthening v1. Added top-priority `EvidenceGraph`
  symbol/export branches to both filters; preserved
  path / CapabilityMap / OwnershipMap fallback; shifted
  fixture attribution to `EvidenceGraph: 6 /
  DetectorDetails: 0 / ObservedRepo: 0`.

This memo re-runs the operator-review protocol against
the new baseline and decides whether the graph-aware
arc is **alpha-complete** — i.e. whether any remaining
graph-aware reason needs further strengthening before
shipping the alpha, or whether the next batch should
return to deferred non-graph-aware work (governance
trust gaps, freshness guardrails, persistent exclusion
lists, etc.).

## Fixture Coverage Reviewed

Six fixtures under
[`tests/fixtures/graph-aware-filters/`](../../tests/fixtures/graph-aware-filters/),
identical to the v2 review's set:

| Fixture | Source files | Expected graph-aware reason |
| --- | --- | --- |
| [`route-handler`](../../tests/fixtures/graph-aware-filters/route-handler/) | `src/api/widgets/route.ts` (imports `./handler`), `src/api/widgets/handler.ts` | `route-handler-with-service` |
| [`external-comment`](../../tests/fixtures/graph-aware-filters/external-comment/) | `src/api/util.ts` (imports `leftpad`; mentions `"openai"` in a comment) | `external-api-comment-only` |
| [`nextjs-route`](../../tests/fixtures/graph-aware-filters/nextjs-route/) | `src/app/dashboard/page.tsx` (`DashboardPage` named export) | `nextjs-route-convention` |
| [`route-http-middleware-only`](../../tests/fixtures/graph-aware-filters/route-http-middleware-only/) positive | `src/api/session/route.ts` (imports only `/infra/http/` + `/infra/Identity/`) | `route-http-middleware-only` |
| [`route-http-middleware-only`](../../tests/fixtures/graph-aware-filters/route-http-middleware-only/) negative | `src/api/bad/route.ts` (imports `/infra/Database/...`) | none — finding must remain KEPT |
| [`factory-file`](../../tests/fixtures/graph-aware-filters/factory-file/) | `src/core/services/widgets/WidgetFactory.ts` (`createWidgetService` export) | `factory-file-creates-deps` |
| [`module-gate`](../../tests/fixtures/graph-aware-filters/module-gate/) | `src/modules/payments/PaymentGateEvaluator.ts` (`evaluatePaymentGate` export) | `module-gate-verified-caller` |

Each fixture is copied to a `mkdtemp` temp directory by
its contract test
([`graph-aware-filter-fixtures.test.mjs`](../../tests/contract/graph-aware-filter-fixtures.test.mjs),
[`graph-aware-filter-fixtures-v2.test.mjs`](../../tests/contract/graph-aware-filter-fixtures-v2.test.mjs),
[`factory-module-gate-artifact-evidence.test.mjs`](../../tests/contract/factory-module-gate-artifact-evidence.test.mjs))
before `rekon refresh` runs, so committed fixture
directories stay untouched. The three contract tests
together (25 assertions) pass on `main` at `a2a2d25`,
so the diagnostic data recorded below is current.

## Diagnostic Results

### Per-Fixture Diagnostic Table

| Fixture | Reason | Filtered? | Evidence Source | EvidenceGraph InputRef | Publication Surfaced |
| --- | --- | --- | --- | --- | --- |
| `route-handler` | `route-handler-with-service` | yes | `EvidenceGraph` | yes | yes |
| `external-comment` | `external-api-comment-only` | yes | `EvidenceGraph` | yes | yes |
| `nextjs-route` | `nextjs-route-convention` | yes | `EvidenceGraph` | yes | yes |
| `route-http-middleware-only` positive | `route-http-middleware-only` | yes | `EvidenceGraph` | yes | yes |
| `route-http-middleware-only` negative | n/a (KEPT) | no | n/a | n/a | n/a |
| `factory-file` | `factory-file-creates-deps` | yes | `EvidenceGraph` | yes | yes |
| `module-gate` | `module-gate-verified-caller` | yes | `EvidenceGraph` | yes | yes |

### Aggregate Evidence-Source Counts

Across the six filtered cases (the negative
`route-http-middleware-only` case is correctly KEPT
and contributes no graph-aware row):

| Evidence Source | Count |
| --- | ---: |
| `EvidenceGraph` | 6 |
| `DetectorDetails` | 0 |
| `ObservedRepo` | 0 |

### Attribution Delta vs the v2 Baseline

| Reason | v2 baseline (`4240ebd`) | v3 baseline (`a2a2d25`) |
| --- | --- | --- |
| `route-handler-with-service` | `EvidenceGraph` | `EvidenceGraph` |
| `route-http-middleware-only` | `EvidenceGraph` | `EvidenceGraph` |
| `external-api-comment-only` | `EvidenceGraph` | `EvidenceGraph` |
| `nextjs-route-convention` | `EvidenceGraph` | `EvidenceGraph` |
| `factory-file-creates-deps` | `DetectorDetails` | `EvidenceGraph` |
| `module-gate-verified-caller` | `DetectorDetails` | `EvidenceGraph` |

The shift is exactly the one the v2 review predicted
the factory / module-gate strengthening would deliver:
the two `DetectorDetails`-attributed reasons lift to
`EvidenceGraph` without changing which findings the
filter suppresses against the committed fixtures.

### Per-Fixture Health Summary

`FindingFilterHealthSummary.graphAwareByEvidenceSource`
per fixture (measured by the contract tests):

- `route-handler` → `{ EvidenceGraph: 1 }`
- `external-comment` → `{ EvidenceGraph: 1 }`
- `nextjs-route` → `{ EvidenceGraph: 1 }`
- `route-http-middleware-only` positive →
  `{ EvidenceGraph: 1 }`
- `route-http-middleware-only` negative → `{}`
- `factory-file` → `{ EvidenceGraph: 1 }`
- `module-gate` → `{ EvidenceGraph: 1 }`

`FindingFilterHealthSummary.graphAwareReasonEvidenceSources`
per fixture:

- `route-handler` →
  `{ "route-handler-with-service": { EvidenceGraph: 1 } }`
- `external-comment` →
  `{ "external-api-comment-only": { EvidenceGraph: 1 } }`
- `nextjs-route` →
  `{ "nextjs-route-convention": { EvidenceGraph: 1 } }`
- `route-http-middleware-only` positive →
  `{ "route-http-middleware-only": { EvidenceGraph: 1 } }`
- `route-http-middleware-only` negative → `{}`
- `factory-file` →
  `{ "factory-file-creates-deps": { EvidenceGraph: 1 } }`
- `module-gate` →
  `{ "module-gate-verified-caller": { EvidenceGraph: 1 } }`

### Publication Surface

Both publication renderers continue to surface the
diagnostic for every filtered fixture (publication
contract tests pin this for the
`route-http-middleware-only` positive case; the
renderer in
[`packages/capability-docs/src/index.ts`](../../packages/capability-docs/src/index.ts)
emits the section whenever
`summary.graphAwareFiltered > 0` or
`graphAwareByEvidenceSource` is non-empty):

- **Architecture summary** —
  `### Graph-Aware Evidence Sources` table with an
  `EvidenceGraph` row plus the per-reason × per-source
  matrix.
- **Agent contract** — `Graph-aware evidence sources:`
  line plus the operator-guidance reminder that
  `DetectorDetails` entries should be reviewed more
  critically than `EvidenceGraph` entries (still
  shipped; relevant when real repos surface
  `DetectorDetails` fallback even though the committed
  fixtures don't).

### Negative-Case Verification

The `route-http-middleware-only` negative case
(`src/api/bad/route.ts` importing
`/infra/Database/client`) still appears in
`FindingFilterReport.keptFindings` and is absent from
`FindingFilterReport.filteredFindings`. No filtered
entry anywhere in the report carries the
`route-http-middleware-only` reason — the
belt-and-suspenders assertion from the v2 batch still
holds.

### Fallback Path Pinning

The v3 factory / module-gate contract test
([`tests/contract/factory-module-gate-artifact-evidence.test.mjs`](../../tests/contract/factory-module-gate-artifact-evidence.test.mjs))
also pins that the existing fallback branches still
fire when artifact evidence is absent:

- **Factory path fallback (`DetectorDetails`)** —
  factory-file fixture with `WidgetFactory.ts` source
  overwritten so the symbol is `helper` (no `Factory`
  in the name); the path heuristic
  (`Factory.ts`) fires; `usedArtifacts: []` →
  `DetectorDetails`.
- **Module-gate ObservedRepo branch (`ObservedRepo`)** —
  module-gate fixture with a renamed file
  (`src/modules/payments/handler.ts`) plus a synthetic
  `OwnershipMap` + `ObservedRepo` with
  `kind: "module"` seeded; branch B fires;
  `usedArtifacts: ["OwnershipMap", "ObservedRepo"]` →
  `ObservedRepo`. `FindingFilterReport.header.inputRefs`
  cites `ObservedRepo`.
- **Module-gate path fallback (`DetectorDetails`)** —
  module-gate fixture with both artifact + ObservedRepo
  evidence missing; `/modules/` path fallback fires;
  `usedArtifacts: []` → `DetectorDetails`.

These three scenarios are intentionally **not** part
of the aggregate diagnostic table above (which counts
the committed fixtures as-is). They prove the fallback
branches stay in place for real repos with
non-canonical names — the strengthening is additive,
not replacement.

## Migration Trigger Review

Re-evaluating the four triggers from the
[import fact subject-shape decision memo](import-fact-subject-shape-decision.md)
against the now-complete post-strengthening data:

### 1. Helper compatibility logic exceeds ~3 callsites

**Not met.** `listImportTargetsForFile` remains the
sole helper carrying the legacy ↔ new shape branch.
The four EvidenceGraph-attributed import-consuming
fixtures (`route-handler`, `external-comment`,
`nextjs-route`, `route-http-middleware-only` positive)
all fire via that single helper. The two
**now**-EvidenceGraph-attributed fixtures
(`factory-file`, `module-gate`) consume
`listSymbolsForFile` + `listExportsForFile` (export /
symbol facts), not import facts at all — the v3
strengthening did **not** add any new
import-helper callsites.

### 2. EvidenceGraph schemaVersion bump planned for unrelated reasons

**Not met.** No unrelated `EvidenceGraph` schema bump
is queued. The v3 strengthening shipped **no schema
bump**; the change was filter-side only.

### 3. External capability authors report confusion

**Not met.** No community capability author has filed
an issue or PR about the import-fact subject shape
since the v2 review. The capability-author surfaces
continue to use the helper rather than raw subject
strings.

### 4. Import facts become a publication-facing artifact projection

**Not met.** Import facts remain an internal
`EvidenceGraph` shape consumed by graph-aware filters
and capability docs. The publication-facing
graph-aware diagnostic continues to use the
`evidenceSource` attribution and the per-reason
matrix, not raw import-fact subjects.

### Trigger Review Conclusion

**No trigger is met. Option C remains correct for
alpha.**

**The fixture suite now proves every shipped
graph-aware reason can be supported by artifact-backed
EvidenceGraph evidence in committed regression data.**
That is the strongest possible non-trigger diagnostic
in favor of Option C: the helper-compatibility shape
not only works for every import-consuming check, the
artifact substrate around it (export / symbol facts,
OwnershipMap, ObservedSystem.kind, CapabilityMap) is
also sufficient to back every non-import-consuming
graph-aware check.

## Artifact-Strength Review By Reason

For each graph-aware reason, what evidence backs the
filter today, where the fixture pins that attribution,
and whether the next slice should target it.

### `route-handler-with-service`

- **Current `evidenceSource`:** `EvidenceGraph`.
- **Current fixture:** `route-handler` —
  `src/api/widgets/route.ts` imports `./handler`; the
  EvidenceGraph branch consumes the import fact via
  `listImportTargetsForFile`.
- **Strength:** **strong artifact-backed.**
- **Recommended action:** **None.** Keep as-is.

### `route-http-middleware-only`

- **Current `evidenceSource`:** `EvidenceGraph`
  (positive case); n/a — KEPT (negative case).
- **Current fixture:** `route-http-middleware-only` —
  positive + negative cases in one root.
- **Strength:** **strong artifact-backed.**
- **Recommended action:** **None.** Keep as-is.

### `external-api-comment-only`

- **Current `evidenceSource`:** `EvidenceGraph`.
- **Current fixture:** `external-comment` —
  `src/api/util.ts` imports only `leftpad`; the
  EvidenceGraph branch consumes import facts to
  confirm no actual import targets any external-API
  package.
- **Strength:** **strong artifact-backed.**
- **Recommended action:** **None.** Keep as-is.

### `nextjs-route-convention`

- **Current `evidenceSource`:** `EvidenceGraph`.
- **Current fixture:** `nextjs-route` —
  `src/app/dashboard/page.tsx`; the EvidenceGraph
  branch consumes export facts.
- **Strength:** **strong artifact-backed.**
- **Recommended action:** **None.** Keep as-is.

### `factory-file-creates-deps`

- **Current `evidenceSource`:** `EvidenceGraph`.
- **Current fixture:** `factory-file` —
  `src/core/services/widgets/WidgetFactory.ts`
  (`createWidgetService` export). The v3 strengthening
  added a top-priority `EvidenceGraph` symbol/export
  branch to `graphFilterFactoryFileCreatesDeps`
  (high confidence when any name includes `"Factory"`;
  medium when name starts with `"create"` AND file
  path includes `"Factory"`).
  `usedArtifacts: ["EvidenceGraph"]`.
- **Strength:** **now strong artifact-backed in
  committed fixtures via EvidenceGraph symbol/export
  facts.** Path fallback survives for non-canonical
  names — confirmed by the v3 contract test's path
  fallback scenario.
- **Recommended action:** **Keep path fallback for
  non-canonical names. Optional future:** role / kind
  projection (CapabilityMap `role` field, or
  ObservedSystem `kind: "factory"`) if real repos
  show DetectorDetails fallback dominance in
  filter-health surfaces. Not required for alpha.

### `module-gate-verified-caller`

- **Current `evidenceSource`:** `EvidenceGraph`.
- **Current fixture:** `module-gate` —
  `src/modules/payments/PaymentGateEvaluator.ts`
  (`evaluatePaymentGate` export). The v3 strengthening
  added a top-priority `EvidenceGraph` symbol/export
  branch to `graphFilterModuleGateVerifiedCaller`
  (high confidence when any name includes
  `"GateEvaluator"`; medium when any name matches
  `/^evaluate.*Gate/`).
  `usedArtifacts: ["EvidenceGraph"]`. The existing
  `OwnershipMap` + `ObservedSystem.kind === "module"`
  branch (`usedArtifacts: ["OwnershipMap",
  "ObservedRepo"]` → `ObservedRepo`) remains in
  place and is exercised by the v3 contract test
  via a synthetic OwnershipMap + ObservedRepo.
- **Strength:** **now strong artifact-backed in
  committed fixtures via EvidenceGraph symbol/export
  facts.** Path fallback + ObservedSystem.kind branch
  survive — confirmed by the v3 contract test's
  fallback scenarios.
- **Recommended action:** **Keep path fallback for
  non-canonical names. Optional future:**
  per-module `ObservedSystem` projection (the
  deferred substrate from the factory / module-gate
  v1 memo) — would let branch B of
  `graphFilterModuleGateVerifiedCaller` fire from real
  fixtures, not only from synthetic contract test
  contexts. Not required for alpha.

### Summary Table

| Reason | Current source | Strength | Next-slice action |
| --- | --- | --- | --- |
| `route-handler-with-service` | `EvidenceGraph` | strong artifact-backed | none |
| `route-http-middleware-only` | `EvidenceGraph` | strong artifact-backed | none |
| `external-api-comment-only` | `EvidenceGraph` | strong artifact-backed | none |
| `nextjs-route-convention` | `EvidenceGraph` | strong artifact-backed | none |
| `factory-file-creates-deps` | `EvidenceGraph` | strong artifact-backed (committed fixtures) | optional future role/kind projection |
| `module-gate-verified-caller` | `EvidenceGraph` | strong artifact-backed (committed fixtures) | optional future ObservedSystem.kind / OwnershipMap projection |

**No reason requires further strengthening before
alpha.**

## Alpha-Completeness Decision

**The graph-aware v1 / v2 / v3 arc is alpha-complete.**

Criteria evaluated:

1. **Every shipped graph-aware reason has
   deterministic fixture coverage.** Six fixtures
   under `tests/fixtures/graph-aware-filters/`
   cover all six reasons end-to-end. ✓
2. **Every fixture positive is artifact-backed in
   committed regression data.** Aggregate diagnostic
   `EvidenceGraph: 6 / DetectorDetails: 0 /
   ObservedRepo: 0` across the filtered cases. ✓
3. **Path / CapabilityMap / OwnershipMap fallback
   branches remain in the implementation and are
   pinned by contract tests.** The v3 contract test
   exercises the factory path fallback, the
   module-gate ObservedRepo branch (via synthetic
   OwnershipMap + ObservedRepo), and the module-gate
   path fallback. ✓
4. **The publication-facing diagnostic surface
   distinguishes evidence sources and asks
   reviewers to weight `DetectorDetails` more
   critically.** Architecture summary + agent
   contract render the per-source matrix; the
   agent-contract "Do Not Do" reminder is in
   place. ✓
5. **The negative case is pinned.**
   `route-http-middleware-only` negative correctly
   KEEPS the finding when only a disallowed
   `/infra/Database/...` import is present. ✓
6. **Import producer migration is not required.**
   None of the four migration triggers is met. ✓
7. **No remaining graph-aware reason needs further
   strengthening before alpha.** The
   artifact-strength review above classifies every
   reason as `strong artifact-backed`. ✓

**The next implementation slice should return to
deferred non-graph-aware work**, specifically the
**issue merge decision freshness guardrails** that
were previously deferred until filtering /
graph-aware parity was stronger. That condition is
now satisfied.

## Option A: Import Producer Migration

(Carried forward from the
[import fact subject-shape decision memo](import-fact-subject-shape-decision.md)
for completeness.)

Migrate `extractImportFacts` so import facts use
`subject = "<file path>"` and let consumers read
`value.target` directly.

**Status:** **Still not justified.** No trigger met.
The v3 strengthening did not add any import-helper
callsites (factory / module-gate consume export /
symbol facts), so the helper-compatibility cost
remains bounded.

## Option B: Helper Compatibility

(Shipped as the alpha approach.)

Keep the current legacy import-fact subject shape;
consumers read via `listImportTargetsForFile` which
dedupes across legacy `value.source` and new
file-subject shapes.

**Status:** **Working.** Every EvidenceGraph-backed
import-consuming check still fires through the single
helper.

## Option C: Hybrid

(The alpha decision recorded across the prior memos
and re-affirmed here.)

Ship Option B (helper compatibility) for alpha;
migrate to Option A only when a trigger is met.

**Status:** **Confirmed for alpha.** The v3 baseline
neither strengthens any migration trigger nor weakens
the helper-compatibility approach.

## Recommendation

**Option C remains the alpha decision:**

- **Keep helper compatibility.** Every
  import-consuming graph-aware check still reads
  through `listImportTargetsForFile`.
- **Do not migrate the import producer during alpha.**
  None of the four migration triggers is met.
- **Revisit only if a migration trigger is met.**

**Graph-aware v1 / v2 / v3 arc is alpha-complete:**

- **All shipped graph-aware reasons have deterministic
  fixture coverage.**
- **All committed fixture positives are
  EvidenceGraph-backed after `a2a2d25`.**
- **Fallback paths remain for compatibility but are
  no longer the fixture baseline.**

**Explicitly:**

- **No import fact producer migration in alpha unless
  a trigger is met.**
- **Factory / module-gate artifact evidence
  strengthening closes the last known
  fixture-attribution gap.**

## Decision For Alpha

| Decision | Status |
| --- | --- |
| Option C (helper compatibility; producer migration deferred) | **Confirmed** |
| Import fact producer migration | **Not in alpha** |
| Graph-aware v1 / v2 / v3 arc complete for alpha | **Yes** |
| Fixture coverage complete across all six graph-aware reasons | **Yes** |
| Aggregate fixture attribution `EvidenceGraph: 6 / DetectorDetails: 0 / ObservedRepo: 0` | **Confirmed** |
| Schema bump in this batch | **None** |
| Filter behavior change in this batch | **None** |
| Producer change in this batch | **None** |
| Next implementation slice | **Issue merge decision freshness guardrails** |

## Follow-Up Work

The graph-aware arc is alpha-complete. The recommended
next implementation slice returns to the previously
deferred issue-governance trust gap:

> **Issue merge decision freshness guardrails.**
>
> If `CoherencyDelta` roll-ups are based on a stale
> `IssueMergeDecisionLedger` or a stale
> `IssueAdjudicationReport`, publications and
> `resolve.issue` should warn clearly. This was
> deferred until filtering / graph-aware parity was
> stronger — that condition is now satisfied.

Other follow-ups remain queued (carried forward from
the v2 review + factory / module-gate strengthening
memo):

- **Per-module `ObservedSystem` projection** — modify
  the `@rekon/capability-model` projector (or the
  upstream `@rekon/capability-js-ts`
  `ownership_hint` emitter) to synthesize per-module
  `ObservedSystem` entries for `src/modules/<name>/`
  roots with `kind: "module"`. Would let branch B of
  `graphFilterModuleGateVerifiedCaller` fire from
  real fixtures instead of only synthetic test
  contexts.
- **CapabilityMap `role` field** — first-class
  `role: "factory"` / `role: "module-gate"`
  declaration so capability authors can express role
  intent directly.
- **`evidenceSourceFromGraphArtifacts` CapabilityMap
  precedence** — today CapabilityMap-only matches
  classify as `DetectorDetails`; a small follow-up
  could add `CapabilityMap` between `ObservedRepo`
  and `DetectorDetails` in the precedence chain.
- **Persistent exclusion lists.**
- **Additional product-extension expansion.**

If at any point a migration trigger fires, the
follow-up should pivot to:

> **Import fact producer migration plan.**
>
> Plan Option A explicitly with compatibility,
> regeneration, and schema-version strategy. Defer
> implementation until the migration plan is reviewed
> and approved.

## Cross-References

- [Prior operator review](graph-aware-import-evidence-operator-review.md)
- [Operator review refresh](graph-aware-import-evidence-operator-review-refresh.md)
- [Operator review v2](graph-aware-fixture-coverage-operator-review-v2.md)
- [Factory / module-gate evidence strengthening](factory-module-gate-evidence-strengthening.md)
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
- [Graph-aware filter fixtures review packet](../../.rekon-dev/review-packets/graph-aware-filter-fixtures.md)
- [Graph-aware filter fixtures v2 review packet](../../.rekon-dev/review-packets/graph-aware-filter-fixtures-v2.md)
- [Operator review v2 review packet](../../.rekon-dev/review-packets/graph-aware-fixture-coverage-operator-review-v2.md)
- [Factory / module-gate strengthening review packet](../../.rekon-dev/review-packets/factory-module-gate-evidence-strengthening.md)
