# Graph-Aware Import Evidence Operator Review Refresh

> Strategy memo only. **No runtime behavior changes ship in
> this slice.** Refreshes the
> [prior operator review](graph-aware-import-evidence-operator-review.md)
> against the three deterministic regression fixtures
> shipped at `702afbf`, re-evaluates the four migration
> triggers from the
> [import fact subject-shape decision memo](import-fact-subject-shape-decision.md)
> against the now-measured fixture data, and confirms
> whether **Option C** (helper compatibility now; producer
> migration deferred) still holds for alpha.
>
> **Superseded by the
> [graph-aware fixture coverage operator review v2](graph-aware-fixture-coverage-operator-review-v2.md)
> for the now-complete six-fixture diagnostic surface.**
> The refresh's conclusion (Option C; no producer
> migration) is unchanged; the v2 review extends it with
> per-reason artifact-strength analysis and identifies
> `factory-file-creates-deps` +
> `module-gate-verified-caller` as the next
> evidence-strengthening candidates.

## Decision Summary

**Recommendation: Option C remains the alpha decision.**

> **The deterministic fixtures prove EvidenceGraph-backed
> graph-aware filtering works through helper
> compatibility.**
>
> **No import fact producer migration in alpha unless a
> trigger is met.**

Every measured fixture produces the expected
EvidenceGraph-attributed graph-aware match end-to-end —
`route-handler-with-service`, `external-api-comment-only`,
and `nextjs-route-convention` all fire via the
EvidenceGraph branch, with evidence strings naming the
artifact source, `FindingFilterReport.header.inputRefs`
citing `EvidenceGraph`, `FindingFilterHealthSummary.graphAwareByEvidenceSource.EvidenceGraph === 1`,
`graphAwareReasonEvidenceSources[<reason>].EvidenceGraph === 1`,
and architecture summary + agent contract publications
rendering the `EvidenceGraph` attribution surfaces. The
prior memo's sparse-data caveat no longer applies; the
new data confirms the same architectural conclusion.

## Why This Refresh Exists

The prior operator review at `2d6dc50` recorded that **no
available local fixture exercised the EvidenceGraph
branches** of any graph-aware filter. Three local
fixtures were run (`examples/simple-js-ts` — 0 findings;
`examples/import-boundary-rule-pack/fixtures/bad-imports`
— 1 finding, 0 filtered; `examples/custom-capability` —
1 finding, 1 filtered as `test-file` via `BuiltIn` path
heuristic). Across all three, `graphAwareByEvidenceSource`
was empty. The memo concluded **Option C** (defer
producer migration) based on architectural reasoning and
the absence of any of the four migration triggers, with
the explicit instruction: "If fixtures produce zero
graph-aware filtered findings, say that clearly. Do not
overinterpret."

The graph-aware filtering fixture expansion at `702afbf`
shipped three new deterministic regression fixtures
designed to exercise the EvidenceGraph branches:

- `tests/fixtures/graph-aware-filters/route-handler/`
- `tests/fixtures/graph-aware-filters/external-comment/`
- `tests/fixtures/graph-aware-filters/nextjs-route/`

With those fixtures available, this refresh re-runs the
prior memo's data-gathering protocol and produces
measured diagnostic data backed by real
source-driven `EvidenceGraph` output rather than
synthetic test fixtures or architectural reasoning.

## Fixtures Reviewed

Three fixtures, each a small JS/TS source tree under
`tests/fixtures/graph-aware-filters/`. Each was copied
to a `mkdtemp` tmpdir for this review so the committed
fixtures stay untouched (mirroring the contract test's
`withFixtureCopy` helper).

| Fixture | Source files | Expected graph-aware match |
| --- | --- | --- |
| `route-handler` | `src/api/widgets/route.ts` (imports `./handler`), `src/api/widgets/handler.ts` | `route-handler-with-service` via EvidenceGraph |
| `external-comment` | `src/api/util.ts` (imports `leftpad` only, mentions "openai" in comment) | `external-api-comment-only` via EvidenceGraph |
| `nextjs-route` | `src/app/api/route.ts` (exports `GET` + `runtime` + `dynamic`) | `nextjs-route-convention` via EvidenceGraph |

## Evidence Gathered

The work order's "Required Data Gathering" section names
the CLI flow to run per fixture. The following ran
cleanly against the current `702afbf` build (each
fixture in its own temp-copy):

```sh
node packages/cli/dist/index.js refresh        --root <tmp-fixture> --json
# Seed a synthetic FindingReport whose header.inputRefs
# cites the freshly-produced EvidenceGraph (matches the
# contract test's seedFindingReport helper).
node packages/cli/dist/index.js findings filter        --root <tmp-fixture> --json
node packages/cli/dist/index.js findings filter-health --root <tmp-fixture> --json
node packages/cli/dist/index.js publish architecture   --root <tmp-fixture> --json
node packages/cli/dist/index.js publish agent-contract --root <tmp-fixture> --json
node packages/cli/dist/index.js artifacts validate     --root <tmp-fixture> --json
```

Per fixture the captured fields:

- `FindingFilterReport.filteredFindings[]`: presence of
  the seeded finding id, `reason`, `evidenceSource`,
  `evidence`.
- `FindingFilterReport.header.inputRefs[]`: whether
  `EvidenceGraph` is cited.
- `FindingFilterHealthReport.summary`: `graphAwareFiltered`,
  `byEvidenceSource`,
  `graphAwareByEvidenceSource`,
  `graphAwareReasonEvidenceSources`.
- `FindingFilterHealthReport.alerts[]`: any alert codes.
- Architecture summary publication content: presence of
  `### Graph-Aware Evidence Sources` section.
- Agent contract publication content: presence of
  `Graph-aware evidence sources:` list.
- `rekon artifacts validate` return value.

The contract test
`tests/contract/graph-aware-filter-fixtures.test.mjs`
pins these same assertions independently, so the
measurement protocol is repeatable and continuously
validated.

## Diagnostic Results

**Per-fixture summary** (measured against `702afbf`):

| Fixture | Expected Reason | Evidence Source | graphAwareFiltered | EvidenceGraph InputRef | Publication Surfaced |
| --- | --- | --- | ---: | --- | --- |
| route-handler | route-handler-with-service | EvidenceGraph | 1 | yes | yes (architecture + agent contract) |
| external-comment | external-api-comment-only | EvidenceGraph | 1 | yes | yes (architecture + agent contract) |
| nextjs-route | nextjs-route-convention | EvidenceGraph | 1 | yes | yes (architecture + agent contract) |

**Aggregate evidence-source counts** (sum across the
three fixtures, treating each fixture's filter run
independently):

| Evidence Source | Count |
| --- | ---: |
| EvidenceGraph | 3 |
| DetectorDetails | 0 |
| ObservedRepo | 0 |
| BuiltIn | 0 |
| Policy | 0 |
| ResultFilter | 0 |

Each fixture's `byEvidenceSource` and
`graphAwareByEvidenceSource` were
`{ EvidenceGraph: 1 }`. Each fixture's
`graphAwareReasonEvidenceSources` carried exactly the
fixture's expected reason with `EvidenceGraph: 1`.

**Evidence strings** (verbatim from each fixture's
`FilteredFinding.evidence`):

- `route-handler`: `EvidenceGraph import facts show
  route delegates to handler: './handler'.`
- `external-comment`: `EvidenceGraph import facts
  contain no external API package imports (openai /
  openrouter / @openai/*) for 'src/api/util.ts':
  leftpad.`
- `nextjs-route`: `Route's non-handler named exports
  are all Next.js segment-config values (per
  EvidenceGraph export facts): dynamic, runtime.`

Each evidence string explicitly names the artifact-
backed signal — the v4 evidence-source labels and the
substrate-v1 export-fact labels both flow through to
the audit trail unchanged.

**Alerts.** Each fixture's `FindingFilterHealthReport`
emitted a single `high-filter-rate` alert. That alert
is a side-effect of single-finding fixtures (`filterRate
= 1.0`, above the default `0.8` threshold); it does
**not** indicate a graph-aware fallback problem. None
of the three new fallback-dominance alerts fired in any
fixture:

- `graph-aware-details-fallback-dominance` — did NOT
  fire (DetectorDetails attribution is 0 in every
  fixture).
- `graph-aware-observedrepo-fallback-dominance` — did
  NOT fire (ObservedRepo attribution is 0 in every
  fixture).
- `graph-aware-evidencegraph-low-usage` — did NOT fire
  (EvidenceGraph attribution is the sole graph-aware
  source; would only fire below 25 %, but fixtures are
  100 %).

Note: all three fallback-dominance alerts gate on
`graphAwareFiltered >= 5`; even if a fixture skewed
toward fallback, the single-finding gate would suppress
the alert. The contract test exercises higher-count
scenarios with synthetic data.

**`rekon artifacts validate`.** Returned
`{ valid: true, issues: [] }` for every fixture.

## Migration Trigger Review

Each trigger from
[import-fact-subject-shape-decision.md](import-fact-subject-shape-decision.md#future-migration-trigger),
re-evaluated against measured fixture data:

### 1. Helper compatibility logic exceeds ~3 callsites

- **Current status:** Not met.
- **Evidence:** One `matchesFileSubject` implementation
  in `@rekon/kernel-findings`; two consumers
  (`listImportTargetsForFile` directly,
  `fileImportsTargetMatching` via delegation). The
  three fixtures exercise the helper through both
  consumers without any new compatibility branch.
- **Decision impact:** No change. The helper-sprawl
  failure mode does not exist.

### 2. EvidenceGraph schemaVersion bump planned for unrelated reasons

- **Current status:** Not met.
- **Evidence:** `EvidenceGraph.schemaVersion` has not
  changed since artifact contracts shipped. No ADR or
  roadmap item proposes a bump. Recent additive
  optional fields (`ObservedRepo.files`,
  `ObservedSystem.kind`, `kind: "export"` /
  `kind: "symbol"` facts, `evidenceSource`) have all
  shipped without bumps.
- **Decision impact:** No change. Coordination window
  for bundling a producer migration with a
  `schemaVersion` bump remains future.

### 3. External capability authors report confusion

- **Current status:** Unknown (no external authors
  exist yet).
- **Evidence:** Rekon is pre-publish alpha. The
  [Compatibility Contract](import-fact-subject-shape-decision.md#compatibility-contract)
  section of the decision memo documents the
  helper-only contract; external authors will
  encounter it when they read those docs. No
  community PRs or issues exist. The new fixtures do
  not change this status.
- **Decision impact:** No change. Trigger cannot fire
  pre-publish.

### 4. Import facts become publication-facing artifacts

- **Current status:** Not met.
- **Evidence:** The architecture summary's
  `Graph-Aware Evidence Sources` and per-reason
  evidence-source tables aggregate counts only —
  they do not surface individual import facts. The
  agent contract's `Graph-aware evidence sources:`
  list aggregates similarly. The three fixtures
  prove this rendering works against real data
  without exposing import-fact internals.
- **Decision impact:** No change.

**Summary:** zero of four triggers met. Option C
remains appropriate for alpha. The diagnostic surface
shipped at `499d096` now has measured backing from
three deterministic regression fixtures.

### Supporting non-trigger diagnostic

> **EvidenceGraph-backed graph-aware filters now work
> in deterministic fixtures.**

This is not a migration trigger — it is a positive
confirmation that the helper-compatibility approach
(Option B implementation at `cce837f`) and the v4
import-fact consumers' precedence (at `8a4d4b1`)
together produce correct EvidenceGraph attribution
end-to-end against real source-driven data. The
helpers are doing their job; producer migration is
not required for filter correctness today. This is
the strongest available evidence in favor of Option C.

## Option A: Producer Migration

Restated from
[the prior memo](graph-aware-import-evidence-operator-review.md#option-a-producer-migration):
migrate `@rekon/capability-js-ts.extractImportFacts` to
emit `subject = file path` with `value: { source,
target, kind? }`.

**Re-evaluated against fixture data:**

- The legacy producer shape works against the new
  fixtures via the compatibility-aware helper. Each
  fixture produces `subject = "<file>:<target>"`
  import facts; the helper extracts them correctly;
  the graph-aware filter fires with EvidenceGraph
  attribution. **The fixture data does not surface a
  product-visible problem with the legacy shape.**
- Producer migration would regenerate import facts in
  all existing user repos. No fixture demonstrates a
  user-facing benefit that this churn would unlock.
- A potential future benefit — removing the
  `matchesFileSubject` predicate's legacy branch — is
  a code-cleanliness concern, not a product concern.
  The trigger criteria explicitly require evidence
  of compatibility-sprawl or external author
  confusion before pursuing migration on those
  grounds.

**Conclusion:** Option A remains deferred.

## Option B: Helper Compatibility

Restated from
[the prior memo](graph-aware-import-evidence-operator-review.md#option-b-helper-compatibility):
keep `listImportTargetsForFile`'s compatibility-aware
predicate; producer shape unchanged.

**Re-evaluated against fixture data:**

- The fixture results are exactly what Option B was
  designed to deliver: `EvidenceGraph: 3` across
  three filter runs, with no DetectorDetails or
  ObservedRepo fallback firing in any case where
  EvidenceGraph evidence is sufficient.
- The compatibility predicate handles both producer
  shapes; the fixture data uses the legacy shape (as
  the production producer does) and the EvidenceGraph
  branch still fires.
- No external authors yet exist to be confused by the
  helper-only contract.

**Conclusion:** Option B is working in practice.

## Option C: Hybrid

Adopt Option B for alpha. Defer Option A indefinitely;
revisit only when one of the four documented triggers
fires.

**Re-evaluated against fixture data:**

- Zero of four triggers met (see Migration Trigger
  Review above).
- The supporting diagnostic — fixtures prove
  EvidenceGraph-backed graph-aware filtering works —
  is now measured rather than architectural.
- The decision window (the entire alpha period)
  remains open; trigger conditions can still fire and
  prompt a migration mid-alpha.

**Conclusion:** Option C remains the right choice.

## Recommendation

**Option C: keep helper compatibility for alpha. Do
not migrate the import-fact producer.**

The three deterministic regression fixtures shipped
at `702afbf` together with the contract test at
`tests/contract/graph-aware-filter-fixtures.test.mjs`
provide ongoing validation that EvidenceGraph-backed
graph-aware filtering works through helper
compatibility. Any future producer-migration discussion
should consume this measured evidence (or operator
data from real third-party repos when it becomes
available) rather than re-litigating from
architectural reasoning alone.

## Decision For Alpha

> **No import fact producer migration in alpha unless
> a trigger is met.**

The decision is durable for the entire alpha window.
It becomes revisitable when:

- Any of the four documented triggers transitions to
  "Met";
- Operator data from real repos (smoke runs against
  third-party codebases, dogfood data, community
  reports) materially changes the diagnostic picture
  — e.g. EvidenceGraph attribution systematically
  drops below 25 % despite filters being designed to
  consume import facts;
- A schema-bump decision for an unrelated reason
  opens a coordination window.

Until then, the
[Compatibility Contract](import-fact-subject-shape-decision.md#compatibility-contract)
holds; the helper-compatibility implementation
remains canonical; the fixture expansion shipped at
`702afbf` continues to provide regression coverage.

## Follow-Up Work

**Graph-aware filter fixture coverage v2 has now
shipped.** Three additional regression fixtures
under `tests/fixtures/graph-aware-filters/`
(`route-http-middleware-only/`, `factory-file/`,
`module-gate/`) plus the positive/negative
contract test at
`tests/contract/graph-aware-filter-fixtures-v2.test.mjs`
now cover the remaining three graph-aware checks
(`route-http-middleware-only`,
`factory-file-creates-deps`,
`module-gate-verified-caller`).

Measured attribution for the new fixtures:
- `route-http-middleware-only` positive → fires as
  `route-http-middleware-only` with `evidenceSource:
  "EvidenceGraph"` (route imports only allowed
  `/infra/http/` + `/infra/Identity/` modules; the
  v4 EvidenceGraph branch reads
  `listImportTargetsForFile` against the legacy
  producer shape).
- `route-http-middleware-only` negative → KEPT
  (the route imports `/infra/Database/...`; the
  graph-aware filter correctly does NOT fire).
- `factory-file-creates-deps` → fires with
  `evidenceSource: "DetectorDetails"` (path-evidence
  branch; `usedArtifacts: []` per current v2 design
  maps to DetectorDetails). Evidence text mentions
  `path-evidence`.
- `module-gate-verified-caller` → fires with
  `evidenceSource: "DetectorDetails"` (GateEvaluator
  path signal; `usedArtifacts: []`). Evidence text
  mentions `GateEvaluator`.

The v2 review's strongest takeaway holds: the
deterministic fixtures prove EvidenceGraph-backed
graph-aware filtering works through helper
compatibility *for the import-consuming checks*, and
the path-evidence checks
(`factory-file-creates-deps`,
`module-gate-verified-caller`) continue to attribute
as DetectorDetails by current design (the v3 memo
classified deeper graph-aware shape for these as
"defer until artifact substrate justifies it"; this
remains true). Producer migration is still not
required for filter correctness today.

**The next pass has now shipped: see the
[graph-aware fixture coverage operator review v2](graph-aware-fixture-coverage-operator-review-v2.md).**
The v2 review re-ran this memo's data-gathering
protocol against the now-six deterministic fixtures
and re-confirmed Option C: helper compatibility holds;
no import producer migration in alpha; none of the
four migration triggers is met. The v2 review also
extends this memo with an explicit per-reason
artifact-strength review and identifies
`factory-file-creates-deps` and
`module-gate-verified-caller` as the next
evidence-strengthening candidates (not import producer
migration). See "Next Step After This Batch" in the
[graph-aware filter fixtures v2 review packet](../../.rekon-dev/review-packets/graph-aware-filter-fixtures-v2.md)
for the prior batch's framing.

---

The original follow-up text (now superseded by the
shipped v2 batch) is preserved below for
traceability:

> **Graph-aware filter fixture coverage v2.**
>
> Add three more deterministic fixtures under
> `tests/fixtures/graph-aware-filters/`:
>
> - **`route-http-middleware-only/`** — a `route.ts`
>   importing only `/infra/http/middleware/...` and
>   `/infra/Identity/...` modules (plus a contrast
>   case with a mixed disallowed `/infra/Database/...`
>   import that the test asserts does NOT filter).
> - **`factory-file-creates-deps/`** — a
>   `core/services/<name>/init/<file>.ts` or a
>   `Factory.ts` file (with a contrast case that
>   would normally trip the DI rule but is exempted
>   because of the factory location).
> - **`module-gate-verified-caller/`** — a
>   `GateEvaluator.ts` file plus an `ObservedSystem`
>   with `kind === "module"` (seeded if necessary)
>   to drive both the GateEvaluator and the
>   ObservedSystem-kind paths.
>
> Extend the contract test
> `tests/contract/graph-aware-filter-fixtures.test.mjs`
> to cover these three additional fixtures with the
> same end-to-end assertion suite.

Other documented follow-ups remain queued:

- Merge-decision freshness guardrails (issue
  governance ADR step 27).
- Persistent exclusion lists.
- Additional product-extension expansion.

If at any point a migration trigger fires, the next
slice should pivot to:

> **Import fact producer migration plan.**
>
> Plan Option A explicitly with compatibility,
> regeneration, and schema-version strategy. Defer
> implementation until the migration plan is reviewed
> and approved.

## Cross-References

- [Prior operator review](graph-aware-import-evidence-operator-review.md)
- [Graph-aware fixture coverage operator review v2](graph-aware-fixture-coverage-operator-review-v2.md)
- [Import fact subject-shape decision memo](import-fact-subject-shape-decision.md)
- [GraphOntologyValidator-lite audit](graph-ontology-validator-lite-audit.md)
- [Graph-aware filter provider v3 decision memo](graph-aware-filter-provider-v3-decision.md)
- [Issue governance ADR](issue-governance-architecture-decision.md)
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [EvidenceGraph artifact](../artifacts/evidence-graph.md)
- [FindingFilterReport artifact](../artifacts/finding-filter-report.md)
- [FindingFilterHealthReport artifact](../artifacts/finding-filter-health-report.md)
- [Classic guarantee regression plan](classic-guarantee-regression-plan.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
- [Roadmap](roadmap.md)
- [Graph-aware filter fixtures review packet](../../.rekon-dev/review-packets/graph-aware-filter-fixtures.md)
