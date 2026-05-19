# Graph-Aware Import Evidence Operator Review

> Strategy memo only. **No runtime behavior changes ship in
> this slice.** The memo reviews the new evidence-source
> diagnostics shipped at `499d096` against real fixture
> data, evaluates whether any of the four migration
> triggers from the
> [import fact subject-shape decision memo](import-fact-subject-shape-decision.md)
> have been met, and decides whether Rekon should pursue
> Option A (producer migration to `subject = file path`)
> or keep Option B (helper compatibility) for the rest of
> alpha.

## Decision Summary

**Recommendation: Option C (Hybrid) for alpha.**

> **No import fact producer migration in alpha unless a
> trigger is met.**

Keep helper compatibility (`listImportTargetsForFile`'s
three-branch `matchesFileSubject` predicate) as the
canonical solution for now. Treat producer migration to
`subject = file path` as a future schema-bump decision
gated on the four explicit triggers below. The available
diagnostic data is too sparse to justify a producer
migration today: zero graph-aware filter decisions fire
in any in-repo fixture, so there is no measured pain to
relieve. The helper compatibility path is implemented,
tested (15 contract tests at
`tests/contract/import-helper-compatibility.test.mjs`),
and documented; producer migration would require
regenerating every existing `EvidenceGraph` artifact and
risks breaking external consumers without a
corresponding product benefit.

## Background

The
[import fact subject-shape decision memo](import-fact-subject-shape-decision.md)
(shipped at `2139663`) chose **Option B** — helper
compatibility now, Option A preserved as a future
trigger. The implementation slice shipped at `cce837f`:
`listImportTargetsForFile` and `fileImportsTargetMatching`
now recognize both the legacy producer shape
(`subject = "<file>:<target>"`, `value: { source, target,
line }`) and the future file-subject shape
(`subject = filePath`, `value: { target, ... }`) via a
shared `matchesFileSubject` predicate.

The graph-aware import-fact consumers v4 slice (shipped
at `8a4d4b1`) updated the three import-consuming
graph-aware filters
(`route-handler-with-service`,
`route-http-middleware-only`,
`external-api-comment-only`) to deliberately prefer
EvidenceGraph import facts over `Finding.details.imports`
and to emit evidence strings that name the source.

The graph-aware import evidence publication diagnostics
slice (shipped at `499d096`) added the per-`FilteredFinding`
`evidenceSource` field, the
`FindingFilterHealthSummary.byEvidenceSource` /
`graphAwareByEvidenceSource` /
`graphAwareReasonEvidenceSources` /
`dominantGraphAwareEvidenceSource` summary fields, three
new fallback-dominance alerts, and architecture summary
+ agent contract publication rendering of the evidence-
source breakdown. **This memo consumes the diagnostic
data those changes expose.**

This memo's job: review observed diagnostics, evaluate
the four migration triggers, and decide whether the
producer migration cost (Option A) is justified now or
deferred (Option C).

## Evidence Gathered

The work order's "Required Data Gathering" section names
fixtures to run. The following ran cleanly against the
current `8a4d4b1`+`499d096` build (all CLI commands
issued with `--json`):

```sh
# Fixture 1: examples/simple-js-ts
node packages/cli/dist/index.js refresh        --root examples/simple-js-ts --json
node packages/cli/dist/index.js findings filter --root examples/simple-js-ts --json
node packages/cli/dist/index.js findings filter-health --root examples/simple-js-ts --json

# Fixture 2: examples/import-boundary-rule-pack/fixtures/bad-imports
node packages/cli/dist/index.js refresh        --root examples/import-boundary-rule-pack/fixtures/bad-imports --json
node packages/cli/dist/index.js findings filter --root examples/import-boundary-rule-pack/fixtures/bad-imports --json
node packages/cli/dist/index.js findings filter-health --root examples/import-boundary-rule-pack/fixtures/bad-imports --json

# Fixture 3: examples/custom-capability
node packages/cli/dist/index.js refresh        --root examples/custom-capability --json
node packages/cli/dist/index.js findings filter --root examples/custom-capability --json
node packages/cli/dist/index.js findings filter-health --root examples/custom-capability --json
```

The contract test suite for the v4 + diagnostics work
(`tests/contract/graph-aware-import-fact-consumers.test.mjs`,
`tests/contract/graph-aware-import-evidence-diagnostics.test.mjs`,
`tests/contract/graph-aware-finding-filters-v2.test.mjs`,
`tests/contract/import-helper-compatibility.test.mjs`)
covers every code path with synthetic fixtures, but
those tests assert behavior, not real-world data
prevalence — the diagnostic question this memo answers
needs the CLI smoke output.

No external operator data is available (Rekon is
pre-publish alpha; no users are running it against
production repos). The memo deliberately does not invent
data.

## Observed Diagnostics

| Fixture | `totalFindings` | `totalFiltered` | `graphAwareFiltered` | `byEvidenceSource` | `graphAwareByEvidenceSource` | Alerts | EvidenceGraph in inputRefs? |
| --- | ---: | ---: | ---: | --- | --- | --- | --- |
| `examples/simple-js-ts` | 0 | 0 | 0 | `{}` | `{}` | none | n/a (no filter run input refs) |
| `examples/import-boundary-rule-pack/fixtures/bad-imports` | 1 | 0 | 0 | `{}` | `{}` | none | n/a |
| `examples/custom-capability` | 1 | 1 | 0 | `{ "BuiltIn": 1 }` | `{}` | none | n/a (BuiltIn path filter, not graph-aware) |

**Across all three available fixtures:**

- **Zero graph-aware filter decisions fire.** No fixture
  exercises the EvidenceGraph / DetectorDetails /
  ObservedRepo branches of any graph-aware check.
- **`graphAwareByEvidenceSource` is empty everywhere.**
- **`graphAwareReasonEvidenceSources` is empty
  everywhere.**
- **None of the three new fallback-dominance alerts
  (`graph-aware-details-fallback-dominance`,
  `graph-aware-observedrepo-fallback-dominance`,
  `graph-aware-evidencegraph-low-usage`) fires** — all
  three gate on `graphAwareFiltered >= 5`, which no
  fixture reaches.
- **`byEvidenceSource` IS populated correctly when
  non-graph-aware filters fire.** The `custom-capability`
  fixture's single `test-file` BuiltIn filter
  attributes correctly to
  `byEvidenceSource: { BuiltIn: 1 }`. This confirms the
  attribution machinery works end-to-end; the lack of
  graph-aware data is a fixture-coverage gap, not a
  diagnostic-surface bug.
- **`FindingFilterReport.header.inputRefs` does not
  cite `EvidenceGraph` in any of the three fixtures**
  because no decision in any fixture consumes
  EvidenceGraph import facts.

**This is sparse data.** The work order anticipates this
case and instructs explicitly: "If fixtures produce zero
graph-aware filtered findings, say that clearly. Do not
overinterpret." The memo's conclusions below rest on
*architectural reasoning* and the absence of triggers,
not on observed distributions.

## Option A: Producer Migration

Migrate `@rekon/capability-js-ts.extractImportFacts` to
emit:

```ts
{
  kind: "import",
  subject: "<repo-relative-file-path>",
  value: {
    source: "<repo-relative-file-path>",
    target: "<import-target>",
    kind?: "static" | "dynamic" | "type" | "unknown"
  }
}
```

**Pros (restated from the prior memo, unchanged):**

- Consistent fact shape across `import` / `export` /
  `symbol` facts — `subject = file path` is the
  convention five of six built-in kinds use.
- Simpler mental model for external capability authors.
- Removes the compatibility branch from
  `listImportTargetsForFile`.

**Cons (restated, now with diagnostic evidence):**

- Every existing `EvidenceGraph` artifact on disk in
  user repos contains legacy import subjects. Migration
  requires regeneration via `rekon refresh`. The memo
  cannot quantify the user impact because no external
  user data exists yet.
- May require an `EvidenceGraph` `schemaVersion`
  discussion — additive optional fields don't trigger a
  bump, but a producer shape change to an EXISTING
  field is more invasive. The current decision memo
  classifies this as a "future schema-bump"-class
  decision; the operator review confirms the bump is
  not justified yet.
- Could break external consumers that read raw import
  fact subjects. The decision memo's compatibility
  contract says they shouldn't, but adoption of that
  contract by external authors cannot be verified
  pre-publish.

**Evidence-source observability of the Option A
benefit.** If Option A were adopted, the
`listImportTargetsForFile` helper would no longer need
the legacy `subject` prefix branch. With current
diagnostic data (zero graph-aware matches against
production-shaped legacy import facts in fixtures), the
benefit is not measurable today. The benefit IS visible
in the import-helper-compatibility test suite's Test 15
(end-to-end graph-aware filter case proving the
EvidenceGraph branch fires against legacy data); but
that's a synthetic test, not operator-observed
behavior.

## Option B: Helper Compatibility

Keep `listImportTargetsForFile` as the canonical helper
for file-scoped import lookup. The helper's
`matchesFileSubject` predicate already handles both
producer shapes; the producer stays on the legacy
`subject = "<file>:<target>"` shape.

**Pros (restated, validated by the diagnostic data):**

- Already implemented at `cce837f`. Already tested (15
  contract tests pass). Already documented.
- Production legacy artifacts continue working.
- No schema churn. Zero migration cost.
- Consumers using the helper APIs are insulated from
  producer-shape evolution.

**Cons (restated):**

- Import fact shape remains inconsistent with
  export/symbol fact shape.
- Compatibility logic remains in
  `matchesFileSubject` indefinitely.
- External authors might copy raw `fact.subject`
  matching and miss the compatibility contract. The
  decision memo's
  [Compatibility Contract](import-fact-subject-shape-decision.md#compatibility-contract)
  section documents the rule; nothing enforces it
  beyond review.

**Observed callsite count.** The single
`matchesFileSubject` predicate serves
`listImportTargetsForFile` and (via delegation)
`fileImportsTargetMatching`. **One implementation site,
two helper consumers.** Well under the "more than ~3
callsites" trigger documented in the prior decision
memo.

## Option C: Hybrid

Adopt Option B for alpha. Defer Option A indefinitely;
revisit only when one of the four documented triggers
fires.

**Pros:**

- Lowest immediate cost. Option B is already shipped.
- Preserves architectural flexibility. The compatibility
  predicate continues to work after a future producer
  migration (it would just become dead code for new
  artifacts, plus a deprecation path for old ones).
- Defers a schema-impact decision until evidence
  warrants it. Avoids alpha-stage churn.
- The four triggers documented in the prior memo are
  concrete and falsifiable. Decision can be revisited
  with new data.

**Cons:**

- The decision is conservative. If trigger conditions
  start firing during alpha (e.g. external authors
  arrive and report confusion), Rekon will need to
  ship the migration mid-alpha rather than
  pre-emptively. The memo accepts this tradeoff: the
  preferred path is small, evidence-driven decisions
  rather than speculative refactors.

## Recommendation

**Option C: Hybrid (defer producer migration; keep
helper compatibility).**

The diagnostic data is sparse but the architectural
case is clear:

1. **The compatibility predicate is one function in one
   helper.** The "helper sprawl" failure mode does not
   exist today (one implementation, two consumers via
   delegation).
2. **None of the four migration triggers is met.** See
   the explicit evaluation in the next section.
3. **Option B is already paid for.** Code, tests, and
   docs all shipped at `cce837f` and `499d096`.
   Switching to Option A would add migration cost on
   top of the work already done, with no measured
   user-facing benefit.
4. **The publication diagnostics shipped at `499d096`
   are the right lever, not a producer migration.** If
   real operator data later shows the EvidenceGraph
   path firing rarely against production repos, the
   migration triggers will fire and Option A becomes a
   data-driven decision rather than a speculative one.

**No import fact producer migration in alpha unless a
trigger is met.**

## Migration Triggers

Each trigger restated from
[import-fact-subject-shape-decision.md](import-fact-subject-shape-decision.md#future-migration-trigger),
evaluated against current state:

### 1. Helper compatibility logic exceeds ~3 callsites

- **Current status:** Not met.
- **Evidence:** Exactly one `matchesFileSubject`
  implementation; two helper consumers
  (`listImportTargetsForFile` directly,
  `fileImportsTargetMatching` via delegation). No
  graph-aware filter or external rule pack inlines
  raw `fact.subject` matching for import facts.
- **Decision impact:** Trigger does not justify
  Option A. Revisit if a future graph-aware check
  needs its own file-scoped import lookup branch
  beyond `listImportTargetsForFile`.

### 2. EvidenceGraph schemaVersion bump planned for unrelated reasons

- **Current status:** Not met.
- **Evidence:** `EvidenceGraph.schemaVersion` has not
  changed since artifact contracts shipped. No ADR or
  roadmap item proposes a bump. Recent additive
  optional fields
  (`ObservedRepo.files`,
  `ObservedSystem.kind`, `kind: "export"` /
  `kind: "symbol"` facts, `evidenceSource`) have all
  shipped without bumps.
- **Decision impact:** Trigger does not justify
  Option A. Bundle the producer-shape migration into
  any future bump if one is planned for an unrelated
  reason.

### 3. External capability authors report confusion

- **Current status:** Unknown (no external authors
  exist yet).
- **Evidence:** Rekon is pre-publish alpha. The
  [Compatibility Contract](import-fact-subject-shape-decision.md#compatibility-contract)
  section of the decision memo documents the
  helper-only contract; external authors will
  encounter it when they read those docs. No
  community PRs or issues exist.
- **Decision impact:** Trigger cannot fire pre-publish.
  Revisit after alpha → beta promotion when external
  authors materialize.

### 4. Import facts become publication-facing artifacts

- **Current status:** Not met.
- **Evidence:** No publication kind exposes import
  facts directly. The architecture summary's
  Graph-Aware Evidence Sources table surfaces
  *aggregated counts* of how often EvidenceGraph
  import facts were consulted; it does not surface
  individual import facts. The agent contract
  similarly aggregates.
- **Decision impact:** Trigger does not justify
  Option A. Revisit only if a future publication
  renders raw import-fact data
  (e.g. "Repository imports" surface in architecture
  summary).

**Summary: zero of four triggers met. Option C remains
appropriate for alpha.**

## Decision For Alpha

> **No import fact producer migration in alpha unless a
> trigger is met.**

The decision is durable for the entire alpha window. It
becomes revisitable when:

- Any of the four triggers above transitions to "Met";
- Operator data from real repos (smoke runs against
  third-party codebases, dogfood data, community
  reports) shows that `graphAwareByEvidenceSource`
  systematically favors `DetectorDetails` /
  `ObservedRepo` over `EvidenceGraph` despite
  graph-aware checks being designed to consume import
  facts;
- A schema-bump decision for an unrelated reason opens
  a coordination window.

Until then, the
[Compatibility Contract](import-fact-subject-shape-decision.md#compatibility-contract)
holds and the import-helper-compatibility
implementation remains canonical.

## Follow-Up Work

The recommended next implementation slice (which has
since **shipped**) is *not* producer migration. It is
fixture expansion so the new diagnostic surfaces have
useful real data during development:

> **Graph-aware filtering fixture expansion.**
>
> Add deterministic fixtures (under
> `examples/` or `tests/fixtures/`) that produce
> EvidenceGraph-backed graph-aware filter matches, so
> the new evidence-source diagnostics have non-empty
> data to render during smoke runs. Candidate fixtures:
> a route + handler sibling pair that fires
> `route-handler-with-service` via EvidenceGraph; an
> external-API finding with no SDK import that fires
> `external-api-comment-only` via EvidenceGraph; a
> Next.js route file with segment-config exports that
> fires `nextjs-route-convention`. Each fixture
> exercises one branch of one graph-aware check end to
> end. Fixtures should be deterministic, regeneration-
> friendly (`rekon refresh` rebuilds them from
> scratch), and small.

The decision memo's data-gathering section will become
materially richer once the fixture-expansion slice
lands; the next time a producer-migration question
arises, the memo can review actual evidence-source
distributions rather than synthetic test data.

**Fixture expansion status:** shipped. Three
deterministic fixtures live under
`tests/fixtures/graph-aware-filters/`
(`route-handler`, `external-comment`,
`nextjs-route`). Each fixture is a small JS/TS
source tree that `rekon refresh` projects into an
`EvidenceGraph` carrying the expected import / export
facts; a seeded `FindingReport` then drives the
graph-aware filter pipeline so the EvidenceGraph
branch fires with `evidenceSource: "EvidenceGraph"`.
The contract test
`tests/contract/graph-aware-filter-fixtures.test.mjs`
pins this end-to-end and also asserts that the
architecture-summary and agent-contract publications
surface the EvidenceGraph attribution. Tests use
temp copies so committed fixtures are never mutated.
These are regression fixtures, not user-facing
examples — they live under `tests/fixtures/`, not
`examples/`.

A future operator review can re-run this memo's
data-gathering commands against the fixture
directories (after temp-copying + refresh) and
record actual `graphAwareByEvidenceSource` /
`graphAwareReasonEvidenceSources` distributions
backed by real source-driven EvidenceGraph data.

**Refresh shipped.** See the
[graph-aware import evidence operator review refresh](graph-aware-import-evidence-operator-review-refresh.md)
— it runs the three fixtures through the temp-copy
flow, records measured diagnostics
(EvidenceGraph: 3 across the three fixtures;
DetectorDetails: 0; ObservedRepo: 0; all
fallback-dominance alerts silent), re-evaluates the
four migration triggers against measured data, and
confirms Option C remains the alpha decision.

Other future work documented elsewhere remains queued:

- Merge-decision freshness guardrails (issue governance
  ADR step 25).
- Persistent exclusion lists.
- Additional product-extension expansion.

## Cross-References

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
