# Review Packet: Graph-Aware Import Evidence Operator Review Refresh

Slice: P1.1 (Issue Adjudication),
graph-aware-import-evidence-operator-review-refresh slice.
Implements step 26 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to
`(shipped)`).

**Strategy-only batch. No runtime behavior changes.** The
slice re-runs the prior
[operator review](../../docs/strategy/graph-aware-import-evidence-operator-review.md)
(shipped at `2d6dc50`) against the three deterministic
regression fixtures shipped at `702afbf`
(`tests/fixtures/graph-aware-filters/route-handler/`,
`external-comment/`, `nextjs-route/`). The prior memo
had concluded **Option C** (defer producer migration)
based on architectural reasoning because no available
fixture exercised the EvidenceGraph branches. This
refresh confirms the same recommendation against
measured diagnostic data.

## CHANGES MADE

### New: `docs/strategy/graph-aware-import-evidence-operator-review-refresh.md`

The refresh memo. Twelve required sections (matching
the work order's required structure):

1. Decision Summary
2. Why This Refresh Exists
3. Fixtures Reviewed
4. Evidence Gathered
5. Diagnostic Results
6. Migration Trigger Review
7. Option A: Producer Migration
8. Option B: Helper Compatibility
9. Option C: Hybrid
10. Recommendation
11. Decision For Alpha
12. Follow-Up Work

Plus a Cross-References section.

The memo:

- Lists the CLI flow run per fixture
  (`refresh` → seed FindingReport → `findings filter`
  → `findings filter-health` →
  `publish architecture` + `publish agent-contract` →
  `artifacts validate`).
- Records measured diagnostics in a per-fixture table
  and an aggregate evidence-source table.
- Captures verbatim evidence strings from each
  fixture's `FilteredFinding.evidence` field.
- Explicitly addresses the `high-filter-rate` alert
  that fires in each fixture (single-finding
  side-effect, not a graph-aware fallback signal).
- Confirms no fallback-dominance alert fires.
- Confirms `rekon artifacts validate` returns
  `{ valid: true, issues: [] }` for every fixture.
- Re-evaluates all four migration triggers from the
  prior decision memo against measured data.
- Records the supporting non-trigger diagnostic
  ("EvidenceGraph-backed graph-aware filters now work
  in deterministic fixtures") as the strongest
  available evidence in favor of Option C.
- Recommends graph-aware filter fixture coverage v2
  (covering the remaining three graph-aware checks)
  as the next implementation slice.

### Updated: `docs/strategy/graph-aware-import-evidence-operator-review.md`

The prior memo's "Follow-Up Work" section gains a
"Refresh shipped" paragraph pointing at the new
refresh memo and summarizing its measured aggregate.

### Updated: `docs/strategy/import-fact-subject-shape-decision.md`

Top blockquote gains an "Operator review refresh"
block summarizing the refresh's measured aggregate
(EvidenceGraph 3, DetectorDetails 0, ObservedRepo 0,
no fallback-dominance alert) and confirming
Option C remains the alpha decision.

### Updated: `docs/strategy/graph-ontology-validator-lite-audit.md`

Top blockquote gains an "Operator review refresh"
line pointing at the new memo.

### Updated: `docs/strategy/issue-governance-architecture-decision.md`

- Implementation Order step 26 flipped from
  `(future)` to `(shipped)`. Entry summarizes the
  refresh's findings and the four-trigger
  re-evaluation result.
- New step 27 reserved for the recommended
  graph-aware filter fixture coverage v2 slice.
- Existing step 27 (merge-decision freshness etc.)
  renumbered to 28.

### Updated: `docs/strategy/classic-behavior-roadmap.md`

New "Graph-aware import evidence operator review
refresh" entry: states the Option C decision,
includes the per-fixture diagnostic table, summarizes
the aggregate evidence-source counts, evaluates all
four migration triggers, and names the recommended
follow-up slice.

### Updated: `docs/strategy/roadmap.md`

New entry mirroring the classic-behavior-roadmap
content in roadmap.md's shorter format.

### Updated: `docs/concepts/graph-aware-finding-filters.md`

The operator-review paragraph at the top of the
evidence-source attribution section extended with a
sentence linking the refresh memo and naming the
measured aggregate.

### Updated: `docs/artifacts/evidence-graph.md`

The legacy-subject paragraph already referencing the
prior operator review extended with a sentence
linking the refresh and naming the measured
aggregate.

### Updated: `CHANGELOG.md`

New top-of-`0.1.0-alpha.1` entry documenting the
refresh, the measured aggregate diagnostics, the
four-trigger evaluation result, and the recommended
follow-up slice.

### New: `tests/docs/graph-aware-import-evidence-operator-review-refresh.test.mjs`

16 docs tests pinning:

1. Refresh memo file exists.
2. All twelve required headings appear in order.
3. Recommendation chooses Option C (both in the
   Decision Summary and the Recommendation section).
4. Memo contains the explicit "No import fact
   producer migration in alpha unless a trigger is
   met" statement (regex tolerant of blockquote
   line-wrapping).
5. Memo contains the explicit "deterministic
   fixtures prove EvidenceGraph-backed graph-aware
   filtering works through helper compatibility"
   statement.
6. Memo references the `route-handler` fixture.
7. Memo references the `external-comment` fixture.
8. Memo references the `nextjs-route` fixture.
9. Memo references `graphAwareByEvidenceSource`.
10. Memo references `graphAwareReasonEvidenceSources`.
11. Memo includes the migration-trigger review
    (with all four triggers evaluated).
12. `import-fact-subject-shape-decision.md` links the
    refresh.
13. `graph-aware-finding-filters.md` links the
    refresh.
14. `evidence-graph.md` links the refresh.
15. `CHANGELOG.md` mentions the refresh.
16. Review packet exists and contains
    `## PURPOSE PRESERVATION CHECK`.

## PUBLIC API CHANGES

None. Docs-only batch.

- No new exports from any `@rekon/*` package.
- No producer change.
- No helper change.
- No graph-aware filter change.
- No artifact `schemaVersion` bump.
- No new artifact type.
- No new CLI subcommand or flag.
- No new capability role.
- No new reason codes.

## PURPOSE PRESERVATION CHECK

**Original problem.** The first graph-aware import
evidence operator review found sparse local data:
zero graph-aware filter matches in available
fixtures. That made the Option A vs Option C
decision mostly architectural. Now that
deterministic fixtures exist, the decision should be
refreshed using measured local evidence.

**Classic shape preserved.** codebase-intel-classic
import graph / graph producers supplied reliable
structural truth for architecture analysis and
false-positive filtering. The guarantee is reliable
import/export structural evidence for consumers, not
a specific EvidenceGraph subject-shape aesthetic.
The refresh confirms this guarantee with measured
data: every fixture's graph-aware match attributes
to EvidenceGraph, the evidence strings name the
artifact-backed signal, `FindingFilterReport.header.inputRefs`
cites EvidenceGraph, and the diagnostic summary
fields populate with non-empty maps.

**Rekon equivalent guarantee, now measured:**

- Graph-aware filters use helper APIs and
  EvidenceGraph where available — confirmed by all
  three fixtures attributing to `EvidenceGraph`.
- Filter-health diagnostics expose whether
  graph-aware filters rely on EvidenceGraph,
  DetectorDetails, or ObservedRepo — confirmed by
  the per-fixture `graphAwareByEvidenceSource` and
  `graphAwareReasonEvidenceSources` maps.
- Import fact producer migration should be decided
  from evidence and user impact, not code neatness
  alone — confirmed by the four-trigger
  re-evaluation against measured data, all four
  triggers still Not Met.

**Regression test for original problem.** The
contract test
`tests/contract/graph-aware-filter-fixtures.test.mjs`
(shipped at `702afbf`) pins the fixture flow
end-to-end. This refresh memo reads its diagnostic
output and locks the conclusion via the docs test
shipped in this slice. The combination is the
durable regression apparatus: if the fixtures stop
producing EvidenceGraph-attributed matches in a
future change, the contract test fails first; the
docs test confirms the conclusion remains
recorded.

**What would mean we failed (prevented by the
memo + tests):**

- We make an import producer migration decision
  without using the new fixture data → **prevented;**
  the refresh memo records measured fixture data
  explicitly, the docs test pins the references to
  `graphAwareByEvidenceSource` /
  `graphAwareReasonEvidenceSources` and to each
  fixture by name.
- We ignore that EvidenceGraph-backed graph-aware
  filtering now works in deterministic fixtures →
  **prevented;** the docs test pins the "fixtures
  prove EvidenceGraph-backed graph-aware filtering
  works through helper compatibility" statement.
- We treat fixture success as proof that all real
  repos are covered → **prevented;** the memo
  explicitly distinguishes fixture-measured data
  from operator-measured data and lists the
  conditions under which the conclusion would be
  revisited.
- We change runtime behavior in a decision batch →
  **prevented;** this batch contains no runtime code
  changes (verified by the full-suite run + git
  diff).

## CODEBASE-INTEL ALIGNMENT

**Classic capability:** import graph / graph
intelligence as structural evidence for architecture
filtering.

**Relevant classic files / systems aligned to:**

- `lib/import-graph.ts`
- `services/GraphBuildProvider.ts`
- `domain/graph/producers/**`
- `services/issues/content-filter-ruleid.ts`
- `services/issues/filter-health.ts`
- `services/IssueDetectionService.ts`

**What Rekon keeps:**

- Structural evidence must be reliable.
- Graph-aware filters consume helper APIs.
- Evidence-source attribution informs product
  decisions.
- Import producer migration remains a schema /
  compatibility decision.

**What Rekon simplifies:**

- Decision refresh only.
- No producer migration.
- No schema bump.
- No new graph checks.
- No source reads.

## FIXTURES REVIEWED

| Fixture | Files | Drives | Evidence path |
| --- | --- | --- | --- |
| `tests/fixtures/graph-aware-filters/route-handler` | `src/api/widgets/route.ts`, `src/api/widgets/handler.ts`, `package.json` | `route-handler-with-service` | EvidenceGraph import fact `route.ts → ./handler` (legacy subject shape, surfaced via the compatibility-aware `listImportTargetsForFile`) |
| `tests/fixtures/graph-aware-filters/external-comment` | `src/api/util.ts`, `package.json` | `external-api-comment-only` | EvidenceGraph import fact `util.ts → leftpad`; no external-API SDK import |
| `tests/fixtures/graph-aware-filters/nextjs-route` | `src/app/api/route.ts`, `package.json` | `nextjs-route-convention` | EvidenceGraph export facts `runtime`, `dynamic`, `GET` |

All three fixtures were exercised via the
temp-copy flow (`mkdtemp` + `cp -r`); the committed
fixture directories were not mutated.

## DIAGNOSTIC RESULTS

**Per-fixture summary (measured against `702afbf`):**

| Fixture | Expected Reason | Evidence Source | graphAwareFiltered | EvidenceGraph InputRef | Publication Surfaced |
| --- | --- | --- | ---: | --- | --- |
| route-handler | route-handler-with-service | EvidenceGraph | 1 | yes | yes |
| external-comment | external-api-comment-only | EvidenceGraph | 1 | yes | yes |
| nextjs-route | nextjs-route-convention | EvidenceGraph | 1 | yes | yes |

**Aggregate evidence-source counts:**

| Evidence Source | Count |
| --- | ---: |
| EvidenceGraph | 3 |
| DetectorDetails | 0 |
| ObservedRepo | 0 |
| BuiltIn | 0 |
| Policy | 0 |
| ResultFilter | 0 |

**Verbatim evidence strings** (from each fixture's
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

**Alerts.** Each fixture produced one
`high-filter-rate` alert (single-finding fixtures
yield `filterRate = 1.0`, above the default `0.8`
threshold). No fallback-dominance alert fires in any
fixture (`graph-aware-details-fallback-dominance`,
`graph-aware-observedrepo-fallback-dominance`,
`graph-aware-evidencegraph-low-usage` all silent).
All three gate on `graphAwareFiltered >= 5`; even if
the data skewed toward fallback, single-finding
fixtures would not trigger them.

**`rekon artifacts validate`.** All three fixtures
return `{ valid: true, issues: [] }`.

## MIGRATION TRIGGER REVIEW

| Trigger | Status | Evidence | Decision impact |
| --- | --- | --- | --- |
| Helper compatibility callsites > ~3 | Not met | One `matchesFileSubject` implementation; two consumers via delegation (`listImportTargetsForFile`, `fileImportsTargetMatching`) | No change |
| `EvidenceGraph` `schemaVersion` bump planned | Not met | No ADR or roadmap item proposes a bump; recent additive optional fields all shipped without bumps | No change |
| External capability author confusion | Unknown | Pre-publish; no external authors exist yet; cannot fire pre-publish | No change |
| Import facts become publication-facing | Not met | Publications aggregate counts only; no surface exposes raw import-fact data | No change |

**Aggregate:** zero of four triggers met. Option C
remains appropriate for alpha.

**Supporting non-trigger diagnostic:** EvidenceGraph-
backed graph-aware filtering now works in
deterministic fixtures. The helpers are doing their
job; producer migration is not required for filter
correctness today.

## RECOMMENDATION

**Option C remains the alpha decision.**

- The deterministic fixtures prove EvidenceGraph-
  backed graph-aware filtering works through helper
  compatibility.
- No import fact producer migration in alpha unless a
  trigger is met.
- The decision is durable for the entire alpha
  window and revisitable when any of the four
  documented triggers transitions to "Met" or when
  real operator data from third-party repos
  materially changes the diagnostic picture.

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
```

The data-gathering CLI flow recorded in the memo is
exercised continuously by the contract test
`tests/contract/graph-aware-filter-fixtures.test.mjs`
(shipped at `702afbf`); no separate CLI smoke is
required for this docs-only refresh.

## INTENTIONALLY UNTOUCHED

- `@rekon/capability-js-ts.extractImportFacts` /
  `extractExportFacts` / `extractSymbolFacts`
  producers — unchanged.
- `@rekon/kernel-findings.listImportTargetsForFile`
  / `fileImportsTargetMatching` /
  `listExportsForFile` / `listSymbolsForFile`
  helpers — unchanged.
- All six graph-aware filter checks
  (`graphFilterRouteHandlerWithService`,
  `graphFilterRouteHttpMiddlewareOnly`,
  `graphFilterExternalApiCommentOnly`,
  `graphFilterFactoryFileCreatesDeps`,
  `graphFilterModuleGateVerifiedCaller`,
  `graphFilterNextjsRouteConvention`) — unchanged.
- `applyFindingGraphFilters` /
  `applyFindingFilters` — unchanged.
- `EvidenceGraph` artifact `schemaVersion` —
  unchanged.
- `FindingFilterReport` /
  `FindingFilterHealthReport` shapes — unchanged.
- Filter pipeline behavior — unchanged.
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

- **Fixture coverage limited to three checks.** The
  refresh measures `route-handler-with-service`,
  `external-api-comment-only`, and
  `nextjs-route-convention`. The other three
  graph-aware checks
  (`route-http-middleware-only`,
  `factory-file-creates-deps`,
  `module-gate-verified-caller`) still rely on the
  graph-aware contract tests for behavioral
  coverage but lack the production-shaped
  end-to-end fixture flow this refresh records.
  Closing that gap is the recommended next slice.
- **Pre-publish horizon.** Trigger #3 (external
  capability author confusion) cannot fire
  pre-publish. The memo states this explicitly and
  defers re-evaluation to the alpha → beta
  transition.
- **Single-finding fixtures.** Each fixture filters
  exactly one seeded finding, so the
  `high-filter-rate` alert fires unavoidably
  (`filterRate = 1.0`). The memo records this as a
  fixture-size artifact, not a graph-aware-fallback
  signal. Future fixtures could combine multiple
  findings to exercise the alert thresholds more
  realistically, but the single-finding shape is
  sufficient for the EvidenceGraph-attribution
  question this refresh answers.
- **Decision durability.** Option C is durable for
  the entire alpha window. If trigger conditions
  fire mid-alpha (e.g. external authors arrive and
  report confusion), the migration becomes a small
  scheduled slice rather than a speculative
  refactor.

## NEXT STEP

Per the work order's "Next Step After This Batch"
section + ADR step 27:

> **Graph-aware filter fixture coverage v2.**
>
> Add three more deterministic fixtures under
> `tests/fixtures/graph-aware-filters/`:
>
> - `route-http-middleware-only/` — a `route.ts`
>   importing only `/infra/http/middleware/...` and
>   `/infra/Identity/...` modules.
> - `factory-file-creates-deps/` — a
>   `core/services/<name>/init/<file>.ts` or a
>   `Factory.ts` file.
> - `module-gate-verified-caller/` — a
>   `GateEvaluator.ts` file plus an
>   `ObservedSystem.kind === "module"` ownership
>   setup.
>
> Extend the contract test with the same end-to-end
> assertion suite as the prior three fixtures.

That's an implementation batch (small fixture + test
additions; no helper or filter changes). After it
lands, the remaining three graph-aware checks gain
production-shaped end-to-end coverage to match what
this refresh just confirmed for the first three.

## CROSS-REFERENCES

- [Operator review refresh memo](../../docs/strategy/graph-aware-import-evidence-operator-review-refresh.md)
- [Prior operator review memo](../../docs/strategy/graph-aware-import-evidence-operator-review.md)
- [Import fact subject-shape decision memo](../../docs/strategy/import-fact-subject-shape-decision.md)
- [Graph-aware filter provider v3 decision memo](../../docs/strategy/graph-aware-filter-provider-v3-decision.md)
- [GraphOntologyValidator-lite audit](../../docs/strategy/graph-ontology-validator-lite-audit.md)
- [Issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
- [Graph-aware finding filters concept](../../docs/concepts/graph-aware-finding-filters.md)
- [EvidenceGraph artifact](../../docs/artifacts/evidence-graph.md)
- [Graph-aware filter fixtures review packet](graph-aware-filter-fixtures.md)
- [Prior operator review packet](graph-aware-import-evidence-operator-review.md)
