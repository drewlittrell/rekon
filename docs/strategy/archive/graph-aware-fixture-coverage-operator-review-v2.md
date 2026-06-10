# Graph-Aware Fixture Coverage Operator Review v2

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> Strategy memo only. **No runtime behavior changes ship in
> this slice.** Re-runs the
> [graph-aware import evidence operator review refresh](graph-aware-import-evidence-operator-review-refresh.md)
> now that **all six graph-aware reasons have deterministic
> fixture coverage** (shipped at `b2f74b8`), re-evaluates
> the four migration triggers from the
> [import fact subject-shape decision memo](import-fact-subject-shape-decision.md)
> against the now-six-fixture diagnostic surface, and
> confirms whether **Option C** (helper compatibility now;
> producer migration deferred) still holds for alpha.
>
> **Updated by the
> [factory / module-gate evidence strengthening](factory-module-gate-evidence-strengthening.md)
> implementation slice.** The diagnostic snapshot below
> records the baseline attribution at `4240ebd`
> (`EvidenceGraph: 4`, `DetectorDetails: 2`); the
> follow-up slice strengthens the two `DetectorDetails`
> reasons to `EvidenceGraph` via symbol/export branches.
> The v2 review's central recommendation — Option C; no
> import producer migration — is unchanged.
>
> **Superseded by the
> [graph-aware fixture coverage operator review v3](graph-aware-fixture-coverage-operator-review-v3.md)
> for the post-strengthening baseline.** The v3 review
> re-ran the protocol against the
> `EvidenceGraph: 6 / DetectorDetails: 0 / ObservedRepo: 0`
> attribution profile, re-confirmed Option C, and
> recorded the graph-aware v1 / v2 / v3 arc as
> **alpha-complete**.

## Decision Summary

**Recommendation: Option C remains the alpha decision.**

> **The deterministic fixtures now cover every graph-aware
> reason. Four of six fire via `EvidenceGraph` attribution
> end-to-end; two of six fire via `DetectorDetails`
> attribution by current design.**
>
> **No import fact producer migration in alpha unless a
> trigger is met.**
>
> **`factory-file-creates-deps` and
> `module-gate-verified-caller` are the next
> evidence-strengthening candidates, not import producer
> migration.**

The v1 refresh's central finding holds: EvidenceGraph-backed
graph-aware filtering works through helper compatibility,
none of the four import-fact-producer migration triggers is
met, and Option C is correct for alpha. The v2 fixtures add
nuance — two graph-aware reasons
(`factory-file-creates-deps`,
`module-gate-verified-caller`) attribute as
`DetectorDetails` today because their current filter
branches set `usedArtifacts: []` (path-evidence only),
which the evidence-source classifier maps to
`DetectorDetails`. That is acceptable fallback for alpha,
but it is the next slice's target — strengthen those two
reasons with artifact-backed role / kind / ownership
evidence so they attribute as `EvidenceGraph` or
`ObservedRepo` naturally, without forcing attribution from
within the filter pipeline.

## Why This Review Exists

The
[graph-aware import evidence operator review refresh](graph-aware-import-evidence-operator-review-refresh.md)
at `d3a94b3` confirmed that the three deterministic fixtures
shipped at `702afbf` (`route-handler`, `external-comment`,
`nextjs-route`) all produce EvidenceGraph-backed graph-aware
matches end-to-end. It recommended Option C for alpha and
identified one explicit follow-up: **add three more
deterministic fixtures to cover the remaining graph-aware
reasons** (`route-http-middleware-only`,
`factory-file-creates-deps`,
`module-gate-verified-caller`). That batch shipped at
`b2f74b8`. Coverage is now complete across all six
graph-aware reasons.

This memo re-runs the prior memo's data-gathering protocol
against the **now-six-fixture** diagnostic surface and
re-confirms (or refutes) Option C against measured data
that includes both EvidenceGraph and DetectorDetails
attribution. It also adds an explicit per-reason
artifact-strength review so the next implementation slice
has a clear target.

A core constraint carried forward from the v2 fixture work
order: **do not force EvidenceGraph attribution from within
the test/memo if the current filter does not use graph
evidence.** This memo records measured attribution
accurately and recommends evidence-strengthening at the
producer / artifact projection layer if and when the
roadmap calls for it — not via filter rewrites that mask
the current attribution baseline.

## Fixture Coverage Reviewed

Six fixtures under
[`tests/fixtures/graph-aware-filters/`](../../tests/fixtures/graph-aware-filters/),
each a small JS/TS source tree exercising exactly one
graph-aware reason (with the `route-http-middleware-only`
fixture exercising both the positive and negative case in
one root):

| Fixture | Source files | Expected graph-aware reason |
| --- | --- | --- |
| [`route-handler`](../../tests/fixtures/graph-aware-filters/route-handler/) | `src/api/widgets/route.ts` (imports `./handler`), `src/api/widgets/handler.ts` | `route-handler-with-service` |
| [`external-comment`](../../tests/fixtures/graph-aware-filters/external-comment/) | `src/api/util.ts` (imports `leftpad`; mentions `"openai"` in a comment) | `external-api-comment-only` |
| [`nextjs-route`](../../tests/fixtures/graph-aware-filters/nextjs-route/) | `src/app/dashboard/page.tsx` (named `DashboardPage` export with allowed Next.js shape) | `nextjs-route-convention` |
| [`route-http-middleware-only`](../../tests/fixtures/graph-aware-filters/route-http-middleware-only/) positive | `src/api/session/route.ts` (imports only `/infra/http/` + `/infra/Identity/`) | `route-http-middleware-only` |
| [`route-http-middleware-only`](../../tests/fixtures/graph-aware-filters/route-http-middleware-only/) negative | `src/api/bad/route.ts` (imports `/infra/Database/...`) | none — finding must remain KEPT |
| [`factory-file`](../../tests/fixtures/graph-aware-filters/factory-file/) | `src/core/services/widgets/WidgetFactory.ts` | `factory-file-creates-deps` |
| [`module-gate`](../../tests/fixtures/graph-aware-filters/module-gate/) | `src/modules/payments/PaymentGateEvaluator.ts` | `module-gate-verified-caller` |

Each fixture is copied into a `mkdtemp` temp directory by
the contract tests
([`tests/contract/graph-aware-filter-fixtures.test.mjs`](../../tests/contract/graph-aware-filter-fixtures.test.mjs)
and
[`tests/contract/graph-aware-filter-fixtures-v2.test.mjs`](../../tests/contract/graph-aware-filter-fixtures-v2.test.mjs))
before `rekon refresh` runs, so the committed fixture
directories stay untouched. This memo uses the contract
tests' measured behavior as its diagnostic source — the
tests pass on `main` at `b2f74b8`, so the measured
attribution profile below is current.

## Diagnostic Results

### Per-Fixture Diagnostic Table

| Fixture | Reason | Filtered? | Evidence Source | EvidenceGraph InputRef | Publication Surfaced |
| --- | --- | --- | --- | --- | --- |
| `route-handler` | `route-handler-with-service` | yes | `EvidenceGraph` | yes | yes |
| `external-comment` | `external-api-comment-only` | yes | `EvidenceGraph` | yes | yes |
| `nextjs-route` | `nextjs-route-convention` | yes | `EvidenceGraph` | yes | yes |
| `route-http-middleware-only` positive | `route-http-middleware-only` | yes | `EvidenceGraph` | yes | yes |
| `route-http-middleware-only` negative | n/a (KEPT) | no | n/a | n/a | n/a |
| `factory-file` | `factory-file-creates-deps` | yes | `DetectorDetails` | no | yes |
| `module-gate` | `module-gate-verified-caller` | yes | `DetectorDetails` | no | yes |

### Aggregate Evidence-Source Counts

Across the six filtered cases (the negative
`route-http-middleware-only` case is correctly KEPT and
therefore contributes no graph-aware filter row):

| Evidence Source | Count |
| --- | ---: |
| `EvidenceGraph` | 4 |
| `DetectorDetails` | 2 |
| `ObservedRepo` | 0 |

`FindingFilterHealthSummary.graphAwareByEvidenceSource`
per fixture (measured by the contract tests):

- `route-handler` → `{ EvidenceGraph: 1 }`
- `external-comment` → `{ EvidenceGraph: 1 }`
- `nextjs-route` → `{ EvidenceGraph: 1 }`
- `route-http-middleware-only` positive →
  `{ EvidenceGraph: 1 }`
- `route-http-middleware-only` negative → `{}`
- `factory-file` → `{ DetectorDetails: 1 }`
- `module-gate` → `{ DetectorDetails: 1 }`

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
  `{ "factory-file-creates-deps": { DetectorDetails: 1 } }`
- `module-gate` →
  `{ "module-gate-verified-caller": { DetectorDetails: 1 } }`

### Publication Surface

Both publication renderers surface the diagnostic for every
filtered fixture (publication-rendering contract tests pin
this for the `route-http-middleware-only` positive case;
the renderer logic in
[`packages/capability-docs/src/index.ts`](../../packages/capability-docs/src/index.ts)
emits the section unconditionally whenever
`summary.graphAwareFiltered > 0` or
`graphAwareByEvidenceSource` is non-empty, so DetectorDetails
fixtures surface too):

- **Architecture summary** —
  `### Graph-Aware Evidence Sources` table with rows for
  every evidence source present (e.g. `| EvidenceGraph |
  1 |`, `| DetectorDetails | 1 |`), plus a per-reason ×
  per-source matrix (`Reason | EvidenceGraph |
  Detector Details | ObservedRepo | Other`).
- **Agent contract** — `Graph-aware evidence sources:`
  line followed by `<source>: <count>` entries.

The agent-contract operator-guidance text in
[`packages/capability-docs/src/index.ts`](../../packages/capability-docs/src/index.ts)
already tells reviewers to "review `DetectorDetails`
entries more critically than `EvidenceGraph` entries — the
detector's claim was not corroborated by artifact evidence."
That guidance is already in place for the v2 attribution
profile.

### Negative-Case Verification

The `route-http-middleware-only` negative case
(`src/api/bad/route.ts` importing `/infra/Database/client`)
is correctly kept in `FindingFilterReport.keptFindings` and
absent from `FindingFilterReport.filteredFindings`. The
contract test additionally asserts that **no filtered entry
anywhere in the report carries the
`route-http-middleware-only` reason** when only the
disallowed Database import is present. This belt-and-suspenders
assertion catches both under-suppression (route incorrectly
kept when allowed) and over-suppression (route incorrectly
filtered when disallowed) regressions in the same diff.

## Migration Trigger Review

Re-evaluating the four triggers from the
[import fact subject-shape decision memo](import-fact-subject-shape-decision.md)
against the now-six-fixture diagnostic surface:

### 1. Helper compatibility logic exceeds ~3 callsites

**Not met.** `listImportTargetsForFile` remains the sole
helper carrying the `value.source` ↔ subject-prefix
compatibility branch. The four EvidenceGraph-attributed
fixtures (`route-handler`, `external-comment`,
`nextjs-route`, `route-http-middleware-only` positive) all
fire via that single helper. No additional helper or
surface needed the same fallback during the v2 fixture
batch.

The two DetectorDetails-attributed fixtures
(`factory-file`, `module-gate`) **do not consume imports
at all** — they take path-evidence branches and never
touch `listImportTargetsForFile`. So even when the next
implementation slice strengthens their evidence, it would
likely add **new artifact projections** (role / kind /
ownership tags) rather than new import-helper callsites.
Helper compatibility cost stays bounded.

### 2. EvidenceGraph schemaVersion bump planned for unrelated reasons

**Not met.** No unrelated `EvidenceGraph` schema bump is
queued. The v2 fixture batch shipped **no schema bump**;
`b2f74b8` adds only fixtures, tests, and docs. The next
implementation slice (factory / module-gate evidence
strengthening) is expected to add new fact `kind`s or
projections without changing existing fact shapes, so it
should also avoid a schema bump.

If a future slice does bump `schemaVersion` — e.g. to
add a first-class `role` or `kind` fact for service-shaped
files — bundling the import-fact subject-shape migration
into the same bump would be reasonable. That decision can
wait until the bump is concrete.

### 3. External capability authors report confusion

**Not met.** No community capability author has filed an
issue or PR about the import-fact subject shape during the
fixture-coverage batches. The capability-author surfaces
(`@rekon/capability-js-ts`, the capability template
package, the capability docs) continue to use the helper —
not raw subject strings — and have not surfaced confusion
during the v2 expansion.

### 4. Import facts become a publication-facing artifact projection

**Not met.** Import facts remain an internal `EvidenceGraph`
shape consumed by graph-aware filters and capability docs.
No "Repository imports" publication surface has been
proposed during the fixture-coverage batches. The
publication-facing graph-aware diagnostic uses the
evidence-source attribution
(`graphAwareByEvidenceSource`) and the per-reason matrix,
neither of which exposes raw import fact subjects to
operators or LLM agents.

### Trigger Review Conclusion

**No trigger is met. Option C remains correct for alpha.**

The supporting non-trigger diagnostic also strengthens
since the refresh memo: the deterministic fixtures now
cover every graph-aware reason, and the EvidenceGraph
branch fires through helper compatibility in every fixture
where the current filter design consults graph evidence.
**The fixture suite proves helper compatibility is
sufficient for the import-backed graph-aware checks
currently shipped.**

## Artifact-Strength Review By Reason

For each graph-aware reason, what evidence backs the
filter today, where the fixture pins that attribution, and
whether the alpha attribution is acceptable or the next
slice should strengthen it.

### `route-handler-with-service`

- **Current `evidenceSource`:** `EvidenceGraph`.
- **Current fixture:** `route-handler` —
  `src/api/widgets/route.ts` imports `./handler`; the
  graph-aware branch consumes the EvidenceGraph import
  fact via `listImportTargetsForFile` (plus the sibling-file
  index for the handler file).
- **Strength:** **strong artifact-backed.** The
  EvidenceGraph branch consults real import facts plus
  sibling-file evidence; `FindingFilterReport.header.inputRefs`
  cites `EvidenceGraph`; `usedArtifacts` includes
  `EvidenceGraph`.
- **Recommended action:** **None.** Keep as-is for alpha
  and beyond. This is the canonical artifact-backed
  graph-aware shape.

### `route-http-middleware-only`

- **Current `evidenceSource`:** `EvidenceGraph` (positive
  case); n/a — KEPT (negative case).
- **Current fixture:** `route-http-middleware-only` —
  positive case (`src/api/session/route.ts` imports only
  `/infra/http/` + `/infra/Identity/`); negative case
  (`src/api/bad/route.ts` imports `/infra/Database/...`).
- **Strength:** **strong artifact-backed.** The v4
  EvidenceGraph branch reads
  `listImportTargetsForFile` to confirm every import goes
  to allowed `/infra/http/...` or `/infra/Identity/...`
  paths; one disallowed import (the Database client in
  the negative case) prevents the filter from firing.
- **Recommended action:** **None.** Keep as-is for alpha
  and beyond. Same canonical shape as
  `route-handler-with-service`, plus negative-case coverage.

### `external-api-comment-only`

- **Current `evidenceSource`:** `EvidenceGraph`.
- **Current fixture:** `external-comment` — `src/api/util.ts`
  imports only `leftpad`; the EvidenceGraph branch
  consumes import facts to confirm no actual import targets
  any external-API package (e.g. `openai`, `anthropic`,
  `stripe`), so a comment-only mention is safe to filter.
- **Strength:** **strong artifact-backed.** The
  EvidenceGraph branch consults real import facts;
  `FindingFilterReport.header.inputRefs` cites
  `EvidenceGraph`.
- **Recommended action:** **None.** Keep as-is for alpha
  and beyond.

### `nextjs-route-convention`

- **Current `evidenceSource`:** `EvidenceGraph`.
- **Current fixture:** `nextjs-route` —
  `src/app/dashboard/page.tsx` with a named
  `DashboardPage` export under the Next.js
  `app/<segment>/page.tsx` convention; the graph-aware
  branch consumes EvidenceGraph **export facts** to
  confirm the file exports the expected page shape.
- **Strength:** **strong artifact-backed.** Uses
  EvidenceGraph export facts (not just import facts) —
  the same artifact substrate, a different fact kind.
- **Recommended action:** **None.** Keep as-is for alpha
  and beyond.

### `factory-file-creates-deps`

- **Current `evidenceSource`:** `DetectorDetails`.
- **Current fixture:** `factory-file` —
  `src/core/services/widgets/WidgetFactory.ts`. The current
  graph-aware branch fires on **path heuristics only**
  (`Factory.ts`, `factory.ts`, or
  `core/services/**/init/**`). The decision sets
  `usedArtifacts: []`, which
  `evidenceSourceFromGraphArtifacts([])` maps to
  `DetectorDetails`. Evidence text mentions `path-evidence`.
- **Strength:** **acceptable fallback for alpha, but
  candidate for stronger artifact projection.** The path
  signal is high-precision for the canonical factory
  naming convention, but it does not consult any graph
  artifact — a future producer could attach a
  first-class `role: "factory"` or
  `kind: "factory-service"` fact to the file (e.g. via a
  CapabilityMap role projection, an ObservedSystem
  `kind === "factory"` entry, or a EvidenceGraph
  `factoryRole` fact). Once that fact exists, the filter
  could set `usedArtifacts: ["EvidenceGraph"]` (or
  `["CapabilityMap"]`, depending on where the projection
  lives) and the attribution would shift to
  `EvidenceGraph` / `ObservedRepo` naturally — no filter
  logic change required.
- **Recommended action:** **Strengthen in the next
  implementation slice.** Add a role / kind / capability
  projection so the branch can cite an artifact when one
  is available; keep the path-evidence fallback for files
  outside the projection's coverage. The classic
  guarantee remains preserved as long as suppression
  remains auditable — and the DetectorDetails attribution
  IS auditable today via `evidenceSource` exposure in the
  filter report and publications.

### `module-gate-verified-caller`

- **Current `evidenceSource`:** `DetectorDetails`.
- **Current fixture:** `module-gate` —
  `src/modules/payments/PaymentGateEvaluator.ts`. The
  current graph-aware branch fires on **GateEvaluator
  path signal or `/modules/` path heuristic**. The
  decision sets `usedArtifacts: []`, which maps to
  `DetectorDetails`. Evidence text mentions
  `GateEvaluator`.

  Note: the same filter has a separate branch that DOES
  set `usedArtifacts: ["OwnershipMap", "ObservedRepo"]`
  when an `OwnershipMap` plus an `ObservedSystem` with
  `kind === "module"` is present. That branch is exercised
  by synthetic test cases in
  [`tests/contract/graph-aware-finding-filters-v2.test.mjs`](../../tests/contract/graph-aware-finding-filters-v2.test.mjs).
  The `module-gate` fixture pins the **GateEvaluator path
  signal** specifically because it is the strongest single
  signal in the absence of an OwnershipMap projection.
- **Strength:** **acceptable fallback for alpha, but
  candidate for stronger artifact projection.** The
  GateEvaluator path heuristic is high-precision for the
  canonical gate-evaluator naming convention, but it does
  not consult a graph artifact in the fixture path. A
  future producer could:
  - emit an `ObservedSystem.kind === "module"` projection
    for `/modules/<name>/` directory roots (today the
    repo does not produce these for arbitrary
    `src/modules/<name>/` paths);
  - or attach a CapabilityMap role / kind tag for
    gate-evaluator files (e.g. `role: "module-gate"`).
- **Recommended action:** **Strengthen in the next
  implementation slice — same target as
  `factory-file-creates-deps`.** Add an artifact
  projection (ObservedSystem `kind === "module"` or
  CapabilityMap role tag) so the branch can cite an
  artifact when one is available; keep the path-evidence
  fallback for repos outside the projection's coverage.
  The classic guarantee remains preserved.

### Summary Table

| Reason | Current source | Strength | Next-slice action |
| --- | --- | --- | --- |
| `route-handler-with-service` | `EvidenceGraph` | strong | none |
| `route-http-middleware-only` | `EvidenceGraph` | strong | none |
| `external-api-comment-only` | `EvidenceGraph` | strong | none |
| `nextjs-route-convention` | `EvidenceGraph` | strong | none |
| `factory-file-creates-deps` | `DetectorDetails` | acceptable fallback | strengthen via role / kind / capability projection |
| `module-gate-verified-caller` | `DetectorDetails` | acceptable fallback | strengthen via ObservedSystem.kind / OwnershipMap projection |

## Option A: Import Producer Migration

(Carried forward from the
[import fact subject-shape decision memo](import-fact-subject-shape-decision.md)
for completeness.)

Migrate `extractImportFacts` so import facts use
`subject = "<file path>"` and let consumers read
`value.target` directly. Removes the helper-compatibility
branch. Cost: one producer change, one
EvidenceGraph regeneration in fixtures and examples, one
documentation pass.

**Status:** **Still not justified.** No trigger met. The
v2 fixtures do not strengthen Option A's case at all —
the four EvidenceGraph-attributed checks already work
through helper compatibility, and the two DetectorDetails
checks do not consume imports.

## Option B: Helper Compatibility

(Shipped as the alpha approach.)

Keep the current
`{ kind: "import", subject: "<file>:<target>",
value: { source, target } }` shape; consumers read import
targets via
`listImportTargetsForFile(ctx, file)` which dedupes
across legacy `value.source` and new file-subject shapes.

**Status:** **Working.** The v2 fixtures prove the helper
serves every EvidenceGraph-backed import-consuming check
end-to-end with no missing targets and no false positives.

## Option C: Hybrid

(The alpha decision recorded at the refresh memo and
preserved here.)

Ship Option B now (helper compatibility); migrate to
Option A only when a trigger is met.

**Status:** **Confirmed for alpha.** The v2 fixtures
neither strengthen any trigger nor introduce new ones.
Option C remains correct.

## Recommendation

**Option C remains the alpha decision:**

- **Keep helper compatibility.** The single-helper
  fallback (`listImportTargetsForFile`) serves every
  import-consuming graph-aware check that today reads
  EvidenceGraph facts.
- **Do not migrate the import producer during alpha.**
  None of the four migration triggers is met.
- **Revisit only if a migration trigger is met.**

**Next implementation slice: strengthen
`factory-file-creates-deps` and
`module-gate-verified-caller` with artifact-backed role /
kind / ownership evidence.** Add producer-side projections
(CapabilityMap role tags, ObservedSystem `kind` entries,
or first-class `factoryRole` / `moduleGateRole`
EvidenceGraph facts) so the existing path-evidence
branches can cite an artifact when one is available. Keep
the path-evidence fallback so repos without the projection
continue to filter the same set of findings — the
attribution surface (`DetectorDetails`) will simply shift
to `EvidenceGraph` / `ObservedRepo` for repos where the
projection produces a fact.

**Explicitly:**

- **No import fact producer migration in alpha unless a
  trigger is met.**
- **Factory / module-gate are the next
  evidence-strengthening candidates, not import producer
  migration.**

## Decision For Alpha

| Decision | Status |
| --- | --- |
| Option C (helper compatibility now; producer migration deferred) | **Confirmed** |
| Import fact producer migration | **Not in alpha** |
| Next evidence-strengthening target | **`factory-file-creates-deps` + `module-gate-verified-caller`** |
| Schema bump in this batch | **None** |
| Filter behavior change in this batch | **None** |
| Producer change in this batch | **None** |

## Follow-Up Work

**Factory / module-gate artifact evidence strengthening
has now shipped.** See the
[factory / module-gate evidence strengthening](factory-module-gate-evidence-strengthening.md)
memo for the implementation slice and the
[review packet](../../.rekon-dev/review-packets/factory-module-gate-evidence-strengthening.md).
After that slice landed, all six graph-aware reasons
that the fixtures exercise now attribute as
`EvidenceGraph`. The deferred work in that memo
(ObservedSystem.kind projector population,
CapabilityMap role field) remains queued for future
slices.

The original follow-up framing (preserved for
traceability) was:

> **Factory / module-gate artifact evidence strengthening.**
>
> Move `factory-file-creates-deps` and
> `module-gate-verified-caller` from
> `DetectorDetails` / path fallback toward stronger
> artifact-backed evidence. Likely substrate:
>
> - `ObservedSystem.kind === "module"` for
>   `src/modules/<name>/` roots (or wherever
>   capability authors declare module gates);
> - CapabilityMap role / kind tags
>   (`role: "factory"`, `role: "module-gate"`);
> - EvidenceGraph symbol / export facts for factory
>   and gate-evaluator names.
>
> Still **no source reads**, **no
> `GraphOntologyValidator` port**, **no producer
> migration** for import facts.
>
> Required up-front decisions:
> - Where does the projection live (EvidenceGraph,
>   CapabilityMap, ObservedSystem, or all three)?
> - How is the projection produced (capability-author
>   declaration vs. inferred from path / export shape)?
> - What does the filter branch do when both
>   path-evidence and the new projection agree?
>   (Recommended: prefer the artifact-backed branch via
>   `evidenceSourceFromGraphArtifacts` precedence —
>   path-evidence remains a fallback for repos without
>   the projection.)

Other documented follow-ups remain queued (carried
forward from the refresh memo):

- Merge-decision freshness guardrails
  (issue-governance ADR step 28+).
- Persistent exclusion lists.
- Additional product-extension expansion.

If at any point a migration trigger fires, the next slice
should pivot to:

> **Import fact producer migration plan.**
>
> Plan Option A explicitly with compatibility,
> regeneration, and schema-version strategy. Defer
> implementation until the migration plan is reviewed
> and approved.

## Cross-References

- [Prior operator review](graph-aware-import-evidence-operator-review.md)
- [Operator review refresh](graph-aware-import-evidence-operator-review-refresh.md)
- [Operator review v3](graph-aware-fixture-coverage-operator-review-v3.md)
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
