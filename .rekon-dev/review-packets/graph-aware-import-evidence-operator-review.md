# Review Packet: Graph-Aware Import Evidence Operator Review

Slice: P1.1 (Issue Adjudication),
graph-aware-import-evidence-operator-review slice.
Implements step 24 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to
`(shipped)`).

**Strategy-only batch. No runtime behavior changes.** The
slice produces an operator review memo that consumes the
new diagnostic surface (shipped at `499d096`) against
available local fixtures and decides whether the future
Option A producer migration is worth taking now. The
recommendation is **Option C (Hybrid — defer producer
migration) for alpha**. The decision is durable for the
entire alpha window and revisitable when any of the four
documented migration triggers fires.

## CHANGES MADE

### New: `docs/strategy/graph-aware-import-evidence-operator-review.md`

The operator review memo. Eleven required sections
(matching the work order's required structure):

1. Decision Summary
2. Background
3. Evidence Gathered
4. Observed Diagnostics
5. Option A: Producer Migration
6. Option B: Helper Compatibility
7. Option C: Hybrid
8. Recommendation
9. Migration Triggers
10. Decision For Alpha
11. Follow-Up Work
12. Cross-References

The memo:

- Lists the CLI commands run against three local
  fixtures (`examples/simple-js-ts`,
  `examples/import-boundary-rule-pack/fixtures/bad-imports`,
  `examples/custom-capability`) to gather diagnostic
  data.
- Tabulates observed diagnostics in an "Observed
  Diagnostics" table with seven columns
  (`totalFindings`, `totalFiltered`,
  `graphAwareFiltered`, `byEvidenceSource`,
  `graphAwareByEvidenceSource`, alerts, EvidenceGraph
  in inputRefs).
- States explicitly that the data is sparse: "Across
  all three available fixtures: zero graph-aware
  filter decisions fire." Confirms the attribution
  machinery works end-to-end (the `custom-capability`
  fixture's `BuiltIn: 1` attribution proves it).
- Evaluates each of the four migration triggers
  individually with current status + evidence +
  decision impact.
- Concludes Option C and states explicitly:
  *"No import fact producer migration in alpha unless
  a trigger is met."*
- Recommends graph-aware filtering fixture expansion
  as the next implementation slice.

### Updated: `docs/strategy/import-fact-subject-shape-decision.md`

Top-of-file blockquote gains an "Operator review"
update naming the memo, summarizing its
Option C decision, and noting the four triggers
remain documented in the decision memo body.

### Updated: `docs/strategy/graph-ontology-validator-lite-audit.md`

Top blockquote gains an "Operator review" line
pointing at the new memo.

### Updated: `docs/strategy/issue-governance-architecture-decision.md`

- Implementation Order step 24 flipped from
  `(future)` to `(shipped)`. Entry summarizes the
  memo's findings and the four-trigger evaluation
  result.
- New step 25 reserved for the recommended
  graph-aware filtering fixture expansion slice.
- Existing step 25 (merge-decision freshness etc.)
  renumbered to 26.

### Updated: `docs/strategy/classic-behavior-roadmap.md`

New "Graph-aware import evidence operator review"
entry: states the Option C decision, summarizes the
three fixtures + their diagnostic outputs, evaluates
all four migration triggers, and names the
recommended follow-up slice.

### Updated: `docs/strategy/roadmap.md`

New entry mirroring the classic-behavior-roadmap
content in roadmap.md's shorter format.

### Updated: `docs/concepts/graph-aware-finding-filters.md`

New "Operator review" paragraph at the top of the
evidence-source attribution section linking the memo
and naming the decision.

### Updated: `docs/artifacts/evidence-graph.md`

The import-fact paragraph that already explains
helper compatibility now also references the
operator review for the "decision for alpha" status.

### Updated: `CHANGELOG.md`

New top-of-`0.1.0-alpha.1` entry documenting the
decision, the three-fixture data summary, the
four-trigger evaluation result, and the recommended
follow-up slice.

### New: `tests/docs/graph-aware-import-evidence-operator-review.test.mjs`

15 docs tests pinning:

1. Memo file exists.
2. All eleven required headings appear in order.
3. Recommendation chooses Option C (both in the
   Decision Summary and the Recommendation section).
4. Memo contains the explicit
   "No import fact producer migration in alpha
   unless a trigger is met" statement (regex tolerant
   of line-wrap and blockquote formatting).
5. Memo evaluates all four migration triggers (helper
   compatibility callsites, `schemaVersion` bump,
   external author confusion, publication-facing).
6. Memo mentions `graphAwareByEvidenceSource`.
7. Memo mentions `graphAwareReasonEvidenceSources`.
8. Memo mentions `EvidenceGraph`.
9. Memo mentions `DetectorDetails`.
10. Memo mentions `ObservedRepo`.
11. `import-fact-subject-shape-decision.md` links the
    operator review.
12. `graph-aware-finding-filters.md` links the
    operator review.
13. `evidence-graph.md` links the operator review.
14. `CHANGELOG.md` mentions the review.
15. Review packet exists and contains
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

**Original problem.** Import facts are structural
evidence for graph-aware filtering. Rekon currently
supports production legacy import facts through
compatibility-aware helpers (`cce837f`). Migrating
producer shape to `subject = file path` would make
fact shapes cleaner but could create churn for
existing artifacts and external consumers. The
decision should be based on observed evidence-source
behavior and architectural tradeoffs, not aesthetics.

**Classic shape preserved.** codebase-intel-classic
import graph / graph producers supplied reliable
structural truth for architecture analysis and
false-positive filtering. The important guarantee is
reliable import lookup for consumers, not a
particular fact subject shape. The operator review
confirms `listImportTargetsForFile` already makes
file-scoped import lookup reliable across both
shapes, and the helper-compatibility approach is
canonical for alpha.

**Rekon equivalent guarantee preserved:**

- `listImportTargetsForFile` reliably handles both
  shapes (verified by the
  import-helper-compatibility contract tests at
  `cce837f`).
- Graph-aware filter diagnostics show how often
  EvidenceGraph import facts are actually used
  versus fallback evidence (verified by the
  evidence-source diagnostics at `499d096`).
- Producer migration only happens when the
  compatibility approach becomes a product /
  maintainability problem — none of the four
  documented triggers is met today.

**What would mean we failed (verified by tests we
shipped):**

- Migrate producer shape just because it looks
  cleaner, without evidence → prevented; memo states
  explicitly that the decision is durable for alpha
  unless a trigger fires.
- Keep helper compatibility forever despite clear
  external-author confusion or helper sprawl →
  prevented; memo evaluates the helper-sprawl trigger
  with current data (one implementation, two
  consumers — well under the ~3-callsite threshold)
  and the external-author-confusion trigger
  (Unknown pre-publish; revisit at alpha → beta).
- Ignore evidence-source diagnostics that show
  fallback paths dominate → prevented; memo records
  every fixture's `byEvidenceSource` /
  `graphAwareByEvidenceSource` values and explains
  why the data is sparse rather than overinterpreting
  it.
- Make a schema-affecting decision without
  documenting tradeoffs and triggers → prevented;
  memo restates each trigger from the prior decision
  memo with current status + evidence + decision
  impact.

## CODEBASE-INTEL ALIGNMENT

**Classic capability:** import graph / graph
intelligence as structural evidence for issue
filtering and architecture analysis.

**Relevant classic files / systems aligned to:**

- `lib/import-graph.ts`
- `services/GraphBuildProvider.ts`
- `domain/graph/producers/**`
- `services/issues/content-filter-ruleid.ts`
- `services/IssueDetectionService.ts`

**What Rekon keeps:**

- Import evidence must be reliable.
- Graph-aware filters must consume helpers.
- External consumers should not need raw
  subject-shape trivia.
- Compatibility should be explicit and tested.
- Producer migration should have a clear trigger.

**What Rekon simplifies:**

- Decision memo only.
- No schema bump.
- No migration engine.
- No producer change.
- No graph-aware filter expansion.

## EVIDENCE REVIEWED

Three local fixtures exercised against the current
`499d096` build:

| Fixture | `totalFindings` | `totalFiltered` | `graphAwareFiltered` | `byEvidenceSource` | `graphAwareByEvidenceSource` |
| --- | ---: | ---: | ---: | --- | --- |
| `examples/simple-js-ts` | 0 | 0 | 0 | `{}` | `{}` |
| `examples/import-boundary-rule-pack/fixtures/bad-imports` | 1 | 0 | 0 | `{}` | `{}` |
| `examples/custom-capability` | 1 | 1 | 0 | `{ "BuiltIn": 1 }` | `{}` |

**Zero graph-aware filter decisions fire in any local
fixture.** The attribution machinery works
(confirmed by `custom-capability`'s
`BuiltIn: 1`) but no fixture exercises the
EvidenceGraph / DetectorDetails / ObservedRepo
branches of any graph-aware check. The three new
fallback-dominance alerts gate on
`graphAwareFiltered >= 5`, which no fixture reaches.

No external operator data exists (Rekon is
pre-publish alpha). The memo deliberately does not
invent data.

## OPTIONS CONSIDERED

| Option | Producer change | Helper change | Recommendation |
| --- | --- | --- | --- |
| A — migrate producer to `subject = file path` | yes | (compatibility branch becomes dead code) | **deferred** (no trigger met) |
| B — keep helper compatibility long-term | no | no (already shipped at `cce837f`) | viable but conservative |
| C — Hybrid: keep B now, A when a trigger fires | no | no | **recommended for alpha** |

**Option A** would deliver the cleanest end state but
requires regenerating every existing `EvidenceGraph`
artifact and risks breaking external consumers
without measurable benefit today. Memo defers.

**Option B** is correct in principle but presented as
"long-term solution" suggests no future migration —
the memo prefers explicit hybrid framing.

**Option C** keeps B as the alpha behavior, preserves
A as a future trigger-driven decision, and gives
operators four explicit criteria for revisiting.

## RECOMMENDATION

**Option C (Hybrid — defer producer migration) for
alpha.**

- Helper compatibility callsites: 1 implementation,
  2 consumers. Trigger not met.
- `EvidenceGraph` `schemaVersion` bump planned: no.
  Trigger not met.
- External capability author confusion: unknown
  (no external authors exist pre-publish). Trigger
  cannot fire pre-publish.
- Import facts become publication-facing artifacts:
  publications aggregate counts only. Trigger not
  met.

Zero of four triggers met → defer Option A. The
decision is durable for the entire alpha window.

## IMPLEMENTATION PLAN

None — this is a strategy memo. The recommended
follow-up implementation slice is *graph-aware
filtering fixture expansion*:

- Add deterministic fixtures (under `examples/` or
  `tests/fixtures/`) that exercise the EvidenceGraph
  branches of the import-consuming graph-aware
  filters end to end.
- Candidate fixtures: route + handler sibling pair
  firing `route-handler-with-service`; external-API
  finding with no SDK import firing
  `external-api-comment-only`; Next.js route file
  with segment-config exports firing
  `nextjs-route-convention`.
- Each fixture exercises one branch of one
  graph-aware check end to end.
- Fixtures should be deterministic, regeneration-
  friendly (`rekon refresh` rebuilds them from
  scratch), and small.

After fixture expansion lands, the next operator
review can consume measured `byEvidenceSource` /
`graphAwareByEvidenceSource` distributions rather
than synthetic test data.

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

All passed. Full suite includes the 15 new docs tests
for the operator review. No CLI smoke required
beyond the data-gathering commands already run for
the memo.

## INTENTIONALLY UNTOUCHED

- `@rekon/capability-js-ts.extractImportFacts`
  producer — unchanged.
- `listImportTargetsForFile` /
  `fileImportsTargetMatching` — unchanged.
- All six graph-aware filter checks — unchanged.
- `applyFindingGraphFilters` — unchanged.
- `applyFindingFilters` pipeline order, decision
  shapes, `usedArtifacts`, `inputRefs`,
  `graphArtifactsUsed`, `evidenceSource`
  attribution — all unchanged from
  `cce837f` / `8a4d4b1` / `499d096`.
- `EvidenceGraph` artifact `schemaVersion` —
  unchanged.
- `FindingFilterReport` /
  `FindingFilterHealthReport` shapes — unchanged.
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

- **Sparse fixture data.** The decision rests on
  architectural reasoning (none of four triggers
  met) rather than measured operator data, because
  no local fixture exercises the graph-aware
  EvidenceGraph branches. The follow-up fixture
  expansion slice addresses this directly.
- **Pre-publish horizon.** Trigger #3 (external
  capability author confusion) cannot fire
  pre-publish. The memo states this explicitly and
  defers re-evaluation to the alpha → beta
  transition.
- **Decision durability.** Option C is durable for
  the entire alpha window. If trigger conditions
  fire mid-alpha, the migration becomes a small
  scheduled slice rather than a speculative
  refactor. The memo's "Decision For Alpha"
  section makes this explicit.
- **Documentation coupling.** The operator review
  references the import-fact subject-shape decision
  memo extensively. Future updates to either doc
  should keep their trigger lists in sync.

## NEXT STEP

Per the work order's "Next Step After This Batch"
section + ADR step 25:

> **Graph-aware filtering fixture expansion.**
>
> Add deterministic fixtures that produce
> EvidenceGraph-backed graph-aware filter matches,
> so the diagnostics surface has useful real data
> during development.

That's an implementation batch (small fixture +
test additions; no helper or filter changes). After
it lands, the next operator review (if needed) can
consume measured distributions.

## CROSS-REFERENCES

- [Graph-aware import evidence operator review memo](../../docs/strategy/graph-aware-import-evidence-operator-review.md)
- [Import fact subject-shape decision memo](../../docs/strategy/import-fact-subject-shape-decision.md)
- [Graph-aware filter provider v3 decision memo](../../docs/strategy/graph-aware-filter-provider-v3-decision.md)
- [GraphOntologyValidator-lite audit](../../docs/strategy/graph-ontology-validator-lite-audit.md)
- [Issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
- [Graph-aware finding filters concept](../../docs/concepts/graph-aware-finding-filters.md)
- [EvidenceGraph artifact](../../docs/artifacts/evidence-graph.md)
- [Graph-aware import evidence publication diagnostics review packet](graph-aware-import-evidence-publication-diagnostics.md)
- [Graph-aware import-fact consumers v4 review packet](graph-aware-import-fact-consumers-v4.md)
- [Import helper compatibility review packet](import-helper-compatibility.md)
