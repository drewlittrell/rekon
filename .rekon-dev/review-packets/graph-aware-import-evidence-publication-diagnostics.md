# Review Packet: Graph-Aware Import Evidence Publication Diagnostics

Slice: P1.1 (Issue Adjudication),
graph-aware-import-evidence-publication-diagnostics
slice.
Implements step 23 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to
`(shipped)`).

Surfaces per-decision evidence-source attribution
across `FindingFilterReport`,
`FindingFilterHealthReport`, the architecture summary
publication, and the agent contract publication.
**Diagnostic surface only** — filter pipeline behavior
is unchanged from the v4 work. Operators and agents can
now see whether graph-aware filter decisions were
backed by artifact-strong EvidenceGraph evidence,
sibling-file ObservedRepo evidence, or weaker detector
details. This is the data source the future Option A
import-fact producer-migration decision needs.

## CHANGES MADE

### `packages/kernel-findings/src/index.ts`

**New exports:**

- `FindingFilterEvidenceSource` type
  (`"EvidenceGraph"` | `"ObservedRepo"` |
  `"DetectorDetails"` | `"Policy"` | `"BuiltIn"` |
  `"ResultFilter"` | `"Unknown"`).
- `FilteredFinding.evidenceSource?:
  FindingFilterEvidenceSource` — additive optional.

**Internal helpers:**

- `evidenceSourceFromGraphArtifacts(artifacts):
  FindingFilterEvidenceSource` — classifies a
  graph-aware decision's `usedArtifacts` list into a
  single source label. Precedence: EvidenceGraph >
  ObservedRepo > DetectorDetails.
- `FINDING_FILTER_EVIDENCE_SOURCES` validator set.

**`applyFindingFilters` attribution:**

- Policy stage matches set `evidenceSource: "Policy"`
  at the push site.
- Graph-aware stage matches set `evidenceSource =
  evidenceSourceFromGraphArtifacts(decision.usedArtifacts
  ?? [])`. Decisions with an empty `usedArtifacts`
  (e.g. the detector-imports fallback inside
  `graphFilterRouteHandlerWithService`) attribute as
  `DetectorDetails`.
- Classic content stage matches set `evidenceSource =
  GRAPH_AWARE_FILTER_REASONS.has(decision.reason) ?
  "DetectorDetails" : "BuiltIn"` — the six shared
  graph-aware reason codes attribute as
  `DetectorDetails` (classic content reads
  `details.imports`); other classic content reasons
  attribute as `BuiltIn`.
- Built-in path stage attaches `evidenceSource:
  "BuiltIn"` via the candidate spread.
- Result-filter stage matches set `evidenceSource:
  "ResultFilter"`.
- Push site always falls back to `match.evidenceSource
  ?? "Unknown"` so the FilteredFinding never carries
  an undefined source. Policy matches override to
  `"Policy"` regardless of any inner attribution.

**Validator:**

- `validateFilteredFinding` accepts the new optional
  field. Rejects unknown source labels with a clear
  error message naming the seven valid values.

**`FindingFilterHealthSummary` extensions:**

- `byEvidenceSource?: Record<string, number>` — counts
  across every filtered finding.
- `graphAwareByEvidenceSource?: Record<string, number>`
  — counts restricted to `isGraphAwareFiltered`
  entries.
- `graphAwareReasonEvidenceSources?: Record<string,
  Record<string, number>>` — per-reason × per-source
  matrix.
- `dominantGraphAwareEvidenceSource?: { source, count,
  rate }` — alphabetic tiebreak; `rate = count /
  graphAwareFiltered` rounded to four decimals.

**Three new alerts (all advisory, gated on
`graphAwareFiltered >= 5`):**

- `graph-aware-details-fallback-dominance` —
  DetectorDetails >= 50%.
- `graph-aware-observedrepo-fallback-dominance` —
  ObservedRepo >= 50%.
- `graph-aware-evidencegraph-low-usage` —
  EvidenceGraph < 25% (threshold const
  `EVIDENCEGRAPH_LOW_USAGE_THRESHOLD = 0.25`).

Each alert message names the counts, the percent, and
the implication. The low-usage alert specifically
points operators at the Option A producer-migration
decision in
`docs/strategy/import-fact-subject-shape-decision.md`.

### `packages/capability-docs/src/index.ts`

**Architecture summary publication:**

- New `### Graph-Aware Evidence Sources` section
  rendered when at least one graph-aware filtered
  finding exists or the source map is non-empty.
- Per-source counts table sourced from
  `graphAwareByEvidenceSource`.
- Per-reason × per-source breakdown table (columns:
  `EvidenceGraph` / `Detector Details` /
  `ObservedRepo` / `Other`) sourced from
  `graphAwareReasonEvidenceSources`.
- Audit pointer paragraph: "EvidenceGraph-backed
  entries are artifact-backed structural suppressions.
  DetectorDetails fallback entries are weaker (the
  detector's claim is taken at face value); review
  them when they dominate. ObservedRepo entries are
  sibling-file evidence — structurally strong but
  lower-detail than import-graph evidence."

**Agent contract publication:**

- New compact `Graph-aware evidence sources:` list
  under the existing Finding Filter Health subsection.
  Renders when `summary.graphAwareFiltered > 0`.
  Sorted alphabetically.
- New `Do Not Do` entry (after the existing graph-aware
  Do Not Do): "Do not treat detector-detail fallback
  filtering as equivalent to EvidenceGraph-backed
  structural evidence. When `Graph-aware evidence
  sources` shows `DetectorDetails` entries, review
  them more critically than `EvidenceGraph` entries —
  the detector's claim was not corroborated by
  artifact evidence."

### `tests/contract/graph-aware-import-evidence-diagnostics.test.mjs`

19 new contract tests:

1–6. Per-source attribution for each pipeline stage
(`EvidenceGraph` / `DetectorDetails` / `ObservedRepo` /
`Policy` / `ResultFilter` / `BuiltIn`).
7. `byEvidenceSource` aggregation across the run.
8. `graphAwareByEvidenceSource` restricted to
graph-aware bucket.
9. `graphAwareReasonEvidenceSources` per-reason ×
per-source matrix.
10. `dominantGraphAwareEvidenceSource` is
deterministic; alphabetic tiebreak.
11–13. Three new fallback-dominance alerts each fire
when threshold + corpus conditions are met.
14. Architecture summary renders `Graph-Aware Evidence
Sources` table.
15. Architecture summary renders the per-reason ×
per-source breakdown table.
16. Agent contract renders the compact `Graph-aware
evidence sources:` list.
17. Agent contract `Do Not Do` includes the new
detector-detail fallback warning.
18. Raw `FindingReport` remains byte-identical.
19. `rekon artifacts validate` stays clean.

Tests 14–17 use a seeded `withSeededEvidenceSourceFixture`
that writes a synthetic ObservedRepo + EvidenceGraph
(carrying a legacy-shape import fact for
`leftpad` — no external API SDK) + FindingReport
(`external_apis.calls_go_through_providers` finding
pointed at the same file). The graph-aware
`external-api-comment-only` check fires via the
EvidenceGraph branch, attributing the FilteredFinding
to `EvidenceGraph`. Publication-kind-specific helpers
(`readLatestArchitectureSummary`,
`readLatestAgentContract`) prevent the test from
mistakenly reading the proof-report publication that
`refresh` also produces.

## PUBLIC API CHANGES

**New exports from `@rekon/kernel-findings`:**

- `FindingFilterEvidenceSource` (type alias).

**Modified types (additive optional fields):**

- `FilteredFinding.evidenceSource?:
  FindingFilterEvidenceSource`.
- `FindingFilterHealthSummary.byEvidenceSource?:
  Record<string, number>`.
- `FindingFilterHealthSummary.graphAwareByEvidenceSource?:
  Record<string, number>`.
- `FindingFilterHealthSummary.graphAwareReasonEvidenceSources?:
  Record<string, Record<string, number>>`.
- `FindingFilterHealthSummary.dominantGraphAwareEvidenceSource?:
  { source: string; count: number; rate: number }`.

**Modified validators:**

- `validateFilteredFinding` accepts the new optional
  field; rejects invalid string values.

No artifact `schemaVersion` bump (additive optional
field; older artifacts continue to validate). No new
artifact type. No new capability role. No new CLI
subcommand or flag. No new reason codes. No producer
change. No version bump. No npm publish.

## PURPOSE PRESERVATION CHECK

**Original problem.** Graph-aware filters are now able
to use production EvidenceGraph import facts (via the
helper-compatibility implementation at `cce837f` and
the v4 import-fact consumers at `8a4d4b1`), but users
cannot easily tell how often the strong evidence path
is actually used. Without source attribution,
graph-aware filtering may appear equally trustworthy
whether it used EvidenceGraph, detector details, or
ObservedRepo sibling-file evidence. The future
import-fact producer migration decision needs real
operator data: are EvidenceGraph branches actually
firing in real repos?

**Classic shape preserved.** codebase-intel-classic's
graph/ontology filtering used structural repo evidence
to suppress false positives — the important guarantee
was not merely suppressing findings but suppressing
them with inspectable structural justification. Rekon
preserves this by labeling every suppression with its
evidence source and surfacing the distribution in
publications.

**Rekon equivalent guarantee (newly visible to
operators):**

- Graph-aware filter decisions record `usedArtifacts`
  (v2) and now also `evidenceSource` (publication
  diagnostics).
- `FindingFilterReport` preserves
  per-filtered-finding `evidenceSource`.
- `FindingFilterHealthReport` summarizes
  evidence-source attribution
  (`byEvidenceSource`, `graphAwareByEvidenceSource`,
  per-reason matrix, dominant source).
- Architecture summary and agent contract show
  whether graph-aware filtering was backed by
  EvidenceGraph or fallback evidence.
- Filtered findings remain auditable in
  `FindingFilterReport`.

**Regression for original problem (verified by tests
we shipped):**

- Tests 1–6 prove each pipeline stage attributes its
  filtered findings to the correct source label.
- Tests 7–10 prove summary-level aggregations carry
  the data.
- Tests 11–13 prove the three new alerts fire under
  the right corpus/ratio conditions.
- Tests 14–17 prove publication surfaces render the
  data end-to-end.
- Tests 18–19 prove no regression in raw artifact
  integrity.

**What would mean we failed (prevented by tests):**

- Publications hide whether EvidenceGraph or fallback
  was used → prevented by Tests 14–17.
- Operators cannot tell whether import helper
  compatibility affects production runs → prevented by
  Tests 14–17 against a seeded production-shaped
  fixture.
- EvidenceGraph-backed and details-backed decisions
  presented as equally strong → prevented by Test 17
  (new Do Not Do entry) + audit pointer in
  architecture summary.
- Diagnostics require manually opening each filtered
  finding → prevented by Tests 7–10 (summary-level
  aggregations exposed by health report).

## CODEBASE-INTEL ALIGNMENT

**Classic capability:** graph/ontology-informed
false-positive filtering with inspectable structural
evidence.

**Relevant classic files / systems aligned to:**

- `infra/validation/GraphOntologyValidator.ts`
- `services/IssueDetectionService.ts`
- `services/issues/content-filter-ruleid.ts`
- `services/issues/filter-health.ts`
- `services/GraphBuildProvider.ts`
- `domain/graph/producers/**`

**What Rekon keeps:**

- Structural filtering must cite evidence.
- EvidenceGraph-backed filtering is stronger than
  detector-detail fallback.
- Filtered findings remain auditable.
- Filter health explains suppression behavior.
- Publications surface trust signals where users and
  agents act.

**What Rekon simplifies:**

- Evidence-source counts only (no new graph checks).
- No source reads.
- No producer migration.
- No schema bump.
- No dashboard / PR / CI surface.

**What Rekon does not port yet:**

- Full `GraphOntologyValidator` suite.
- Runtime truth graph.
- Framework exception catalog.
- Source-reading validator service.
- Import-fact producer migration to
  `subject = file path` (preserved as Option A in the
  decision memo).

## EVIDENCE SOURCE MODEL

```
FindingFilterEvidenceSource =
  | "EvidenceGraph"       // artifact-strong; graph-aware decision consulted EvidenceGraph
  | "ObservedRepo"        // sibling-file evidence; graph-aware decision consulted ObservedRepo.files
  | "DetectorDetails"     // weaker; graph-aware decision fell back to Finding.details.imports
  | "Policy"              // operator policy rule (source === "policy")
  | "BuiltIn"             // built-in path heuristic or non-graph-aware classic content
  | "ResultFilter"        // operator result filter
  | "Unknown"             // older artifact without the field
```

**Precedence within a single graph-aware decision**
(`evidenceSourceFromGraphArtifacts`):
`EvidenceGraph > ObservedRepo > DetectorDetails`. A
decision whose `usedArtifacts` list contains multiple
graph artifacts gets the strongest label.

**Validator semantics.** Older `FindingFilterReport`
artifacts on disk continue to validate (the field is
additive optional). The validator rejects unknown
string values to prevent silent data drift.

## FILTER HEALTH DIAGNOSTICS

```
byEvidenceSource:
  every filtered finding by evidenceSource (all stages)

graphAwareByEvidenceSource:
  graph-aware filtered findings by evidenceSource only

graphAwareReasonEvidenceSources:
  per-reason × per-source matrix
  example:
    {
      "route-handler-with-service": {
        "EvidenceGraph": 3,
        "DetectorDetails": 1,
        "ObservedRepo": 2
      }
    }

dominantGraphAwareEvidenceSource:
  source with highest count among graph-aware findings
  rate = count / graphAwareFiltered
  alphabetic tiebreak
```

Three advisory alerts:

```
graph-aware-details-fallback-dominance:
  DetectorDetails / graphAwareFiltered >= 0.5
  AND graphAwareFiltered >= 5

graph-aware-observedrepo-fallback-dominance:
  ObservedRepo / graphAwareFiltered >= 0.5
  AND graphAwareFiltered >= 5

graph-aware-evidencegraph-low-usage:
  EvidenceGraph / graphAwareFiltered < 0.25
  AND graphAwareFiltered >= 5
```

All three are `warning` severity. None indicate
invalid suppression — they signal that graph-aware
filtering is leaning on fallback evidence. Useful
input for the future Option A producer-migration
decision.

## PUBLICATION SURFACING

**Architecture summary.** Under `## Finding Filter
Health`, after `### Graph-Aware Filter Reasons`:

```markdown
### Graph-Aware Evidence Sources

| Evidence Source | Count |
| --- | --- |
| EvidenceGraph | 3 |
| DetectorDetails | 1 |
| ObservedRepo | 2 |

| Reason | EvidenceGraph | Detector Details | ObservedRepo | Other |
| --- | ---: | ---: | ---: | ---: |
| external-api-comment-only | 1 | 1 | 0 | 0 |
| route-handler-with-service | 2 | 0 | 2 | 0 |

EvidenceGraph-backed entries are artifact-backed
structural suppressions. DetectorDetails fallback
entries are weaker (the detector's claim is taken at
face value); review them when they dominate.
ObservedRepo entries are sibling-file evidence —
structurally strong but lower-detail than import-graph
evidence.
```

When `graphAwareFiltered === 0` the section renders
"No graph-aware filtered findings." instead of the
tables.

**Agent contract.** Under `### Finding Filter Health`,
when `graphAwareFiltered > 0`:

```markdown
Graph-aware evidence sources:
- DetectorDetails: 1
- EvidenceGraph: 3
- ObservedRepo: 2
```

The new `Do Not Do` entry sits at the end of the
existing rule list.

## TESTS / VERIFICATION

```sh
npm run typecheck
npm run test
npm run build
git diff --check
node scripts/audit-package-exports.mjs
node scripts/audit-license.mjs
node scripts/publish-dry-run.mjs
node scripts/install-smoke.mjs
node scripts/install-tarball-smoke.mjs
node packages/cli/dist/index.js refresh --root examples/simple-js-ts --json
node packages/cli/dist/index.js findings filter --root examples/simple-js-ts --json
node packages/cli/dist/index.js findings filter-health --root examples/simple-js-ts --json
node packages/cli/dist/index.js publish architecture --root examples/simple-js-ts --json
node packages/cli/dist/index.js publish agent-contract --root examples/simple-js-ts --json
node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json
node packages/cli/dist/index.js artifacts freshness --root examples/simple-js-ts --json
```

All passed. Full suite: 819 passed / 1 skipped / 0
failed (19 new tests on top of the prior 800 passing
tests).

## INTENTIONALLY UNTOUCHED

- `@rekon/capability-js-ts.extractImportFacts`
  producer — unchanged.
- All six graph-aware filter checks
  (`graphFilterRouteHandlerWithService`,
  `graphFilterRouteHttpMiddlewareOnly`,
  `graphFilterExternalApiCommentOnly`,
  `graphFilterFactoryFileCreatesDeps`,
  `graphFilterModuleGateVerifiedCaller`,
  `graphFilterNextjsRouteConvention`) — unchanged. The
  v4 attribution work already labeled their decisions
  via `usedArtifacts`; this slice consumes that data
  and adds publication surfaces.
- `applyFindingGraphFilters` — unchanged.
- `listImportTargetsForFile` /
  `fileImportsTargetMatching` /
  `listExportsForFile` / `listSymbolsForFile` —
  unchanged.
- `EvidenceGraph` artifact `schemaVersion` —
  unchanged.
- `FindingFilterReport` / `FindingFilterHealthReport`
  shapes — additive optional only.
- Filter pipeline behavior — unchanged. Diagnostic
  surface only.
- All CLI commands — no new flags, no new
  subcommands.
- All capability manifests — no new roles, no new
  produces/consumes.
- Reason codes — no new codes.
- LLM / semantic / fuzzy / embedding inference —
  permanently rejected.
- Source-file reads from filter logic — still
  rejected.

## RISKS / FOLLOW-UP

- **Older artifacts attribute as "Unknown".**
  `FilteredFinding` entries on disk from runs before
  this slice carry no `evidenceSource`; the health
  report buckets them as `Unknown`. Operators
  comparing across runs will see attribution coverage
  improve as old artifacts age out (via `rekon
  refresh`). Documented in the artifact doc.
- **Alert noise on small graph-aware corpora.** All
  three new alerts gate on `graphAwareFiltered >= 5`
  to avoid firing on tiny populations. The threshold
  matches the existing 5-finding minimum corpus
  pattern from filter-health diagnostics v2.
- **Architecture summary length.** The new sections
  add 6–14 lines per repo with graph-aware
  filtering. Mitigated by skipping the tables when
  `graphAwareFiltered === 0` (a brief "No graph-aware
  filtered findings." sentence renders instead).
- **Agent contract verbosity.** The new
  `Graph-aware evidence sources:` list is only
  rendered when `graphAwareFiltered > 0`. Agents
  reading the contract see ~5 extra lines maximum
  (one per source label).
- **`DetectorDetails` interpretation.** The label is
  applied uniformly across the graph-aware-stage
  detector fallback AND the classic content-stage
  matches with graph-aware reason codes. Both
  represent "detector's claim taken at face value
  without artifact corroboration." This is the
  intended semantic, but operators should be aware
  that the same label spans two pipeline stages with
  slightly different code paths.
- **Operator data feedback loop.** The follow-up
  slice (graph-aware import evidence operator review)
  consumes the new diagnostic data from real
  operator repos to decide whether the Option A
  producer migration is worth taking. That decision
  cannot be made until smoke runs / dogfood data
  accumulate.

## NEXT STEP

Per the work order's "Next Step After This Batch"
section + the new ADR step 24:

> **Graph-aware import evidence operator review.**
>
> Use the evidence-source diagnostics to decide
> whether import-fact producer migration to
> `subject = file path` (Option A in the
> import-fact subject-shape decision memo) is worth
> taking, or whether helper compatibility remains
> sufficient. This should likely be another decision
> memo using real smoke / operator data, not
> implementation.

That's a strategy batch (no runtime changes). It
consumes the new `byEvidenceSource` /
`graphAwareByEvidenceSource` data from real repos to
inform a Go/No-Go on producer migration.

## CROSS-REFERENCES

- [Graph-aware import-fact consumers v4 review packet](graph-aware-import-fact-consumers-v4.md)
- [Import helper compatibility review packet](import-helper-compatibility.md)
- [Import fact subject-shape decision memo](../../docs/strategy/import-fact-subject-shape-decision.md)
- [Graph-aware filter provider v3 decision memo](../../docs/strategy/graph-aware-filter-provider-v3-decision.md)
- [GraphOntologyValidator-lite audit](../../docs/strategy/graph-ontology-validator-lite-audit.md)
- [Issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
- [Graph-aware finding filters concept](../../docs/concepts/graph-aware-finding-filters.md)
- [FindingFilterReport artifact](../../docs/artifacts/finding-filter-report.md)
- [FindingFilterHealthReport artifact](../../docs/artifacts/finding-filter-health-report.md)
- [Architecture summary publication concept](../../docs/concepts/architecture-summary-publication.md)
- [Agent operating contract concept](../../docs/concepts/agent-operating-contract.md)
