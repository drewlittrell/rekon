# Review Packet: Import Fact Subject-Shape Cleanup Decision Memo

Slice: P1.1 (Issue Adjudication),
import-fact-subject-shape-decision slice.
Implements step 20 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to
`(shipped)`).

**Strategy-only batch. No runtime behavior changes.** The
slice produces a decision memo that chooses how Rekon
should handle the inconsistency between the new
`EvidenceGraph` export / symbol facts substrate
(`subject = file path`, shipped at `a776c58`) and the
legacy import facts (`subject = "<file>:<target>"`). The
follow-up implementation slice
(`listImportTargetsForFile` helper compatibility) will
land the actual code change.

## CHANGES MADE

### New: `docs/strategy/import-fact-subject-shape-decision.md`

The decision memo. Twelve required sections (matching
the work order's required structure):

1. Decision Summary
2. Current Fact Shapes
3. Problem
4. Option A: Migrate Import Facts To File Subject
5. Option B: Compatibility-Aware Import Helpers
6. Option C: Leave As-Is
7. Recommendation
8. Consequences
9. Implementation Plan If Accepted
10. Compatibility Contract
11. Future Migration Trigger
12. Tests Required For Implementation
13. Cross-References

The memo enumerates the three options against
concrete pros/cons (including artifact compatibility,
producer churn, helper API surface, and dead-code
implications for existing graph-aware filters),
recommends Option B, and defines four explicit
triggers for adopting Option A in a future slice.

### Updated: `docs/concepts/graph-aware-finding-filters.md`

The "v2 Helpers" section now annotates
`listImportTargetsForFile` and
`fileImportsTargetMatching` with a pointer to the
decision memo and a brief note explaining the
compatibility-aware contract.

### Updated: `docs/artifacts/evidence-graph.md`

The "Built-in Fact Kinds" section gains a paragraph
right after the table explaining why the legacy
`import` subject shape is intentional and stable, and
linking to the decision memo. The paragraph also
documents the helper-only access contract for
file-scoped lookups.

### Updated: `docs/strategy/graph-ontology-validator-lite-audit.md`

Top blockquote gains a new "Import fact subject-shape
decision" update pointing operators at the new memo
and naming the chosen direction (Option B with
Option A preserved as future trigger).

### Updated: `docs/strategy/issue-governance-architecture-decision.md`

Implementation Order step 20 flipped from `(future)`
to `(shipped)`. Entry summarizes the four future-
migration triggers and the compatibility contract.
New step 21 reserved for the import helper
compatibility implementation (the actual
`listImportTargetsForFile` code change).

### Updated: `docs/strategy/classic-behavior-roadmap.md`

New "Import-fact subject-shape decision memo" entry
covering the three options, the recommendation, the
four future-migration triggers, and the compatibility
contract. Notes the follow-up slice ("Import helper
compatibility implementation") as recommended next.

### Updated: `docs/strategy/roadmap.md`

New entry for the decision memo with the same
content shape as prior roadmap entries.

### Updated: `CHANGELOG.md`

New top-of-`0.1.0-alpha.1` entry documenting the
decision, the option separation, the four
future-migration triggers, the compatibility
contract, and the follow-up slice.

### New: `tests/docs/import-fact-subject-shape-decision.test.mjs`

15 docs tests pinning:

1. Memo file exists.
2. All twelve required headings appear in order.
3. Recommendation chooses Option B now (Decision
   Summary names Option B; Recommendation section
   explicitly chooses Option B).
4. Memo preserves Option A as future migration
   (Future Migration Trigger section names Option A
   as the migration target).
5. Memo mentions export facts use subject = file
   path.
6. Memo mentions symbol facts use subject = file
   path.
7. Memo names the legacy import subject shape
   `"<file>:<target>"`.
8. Memo names `listImportTargetsForFile`.
9. Memo names `listExportsForFile`.
10. Memo names `listSymbolsForFile`.
11. Compatibility Contract section forbids raw
    `fact.subject` matching for file-scoped lookups.
12. `graph-aware-finding-filters.md` links the
    decision memo.
13. `evidence-graph.md` links the decision memo.
14. `CHANGELOG.md` mentions the decision.
15. Review packet exists and contains the PURPOSE
    PRESERVATION CHECK heading.

## PUBLIC API CHANGES

None. Docs-only batch.

- No new exports from any `@rekon/*` package.
- No producer change in `@rekon/capability-js-ts`.
- No helper change in `@rekon/kernel-findings`.
- No graph-aware filter change.
- No artifact `schemaVersion` bump.
- No new artifact type.
- No new artifact field.
- No new CLI subcommand or flag.
- No new capability role.
- No new reason codes.
- No new dependency.

## PURPOSE PRESERVATION CHECK

**Original problem:**

- Graph-aware filters and repo-intelligence helpers
  need a consistent way to ask "what
  imports / exports / symbols belong to this file?"
- The new export / symbol facts substrate (shipped at
  `a776c58`) uses `subject = file path`, which makes
  file-scoped helper APIs straightforward.
- Legacy import facts use `subject = "<file>:<target>"`,
  which makes file-scoped helpers fragile unless they
  know to inspect `value.source`.
- `listImportTargetsForFile` currently assumes
  `subject === filePath` and therefore never matches
  `@rekon/capability-js-ts` production data — graph-aware
  filters relying on EvidenceGraph import facts fall
  back silently.

**Classic shape preserved:**

- Structural import-graph evidence remains a
  first-class input to graph-aware filtering.
- The substrate's helper-API contract (use
  `listImportTargetsForFile`, etc., for file-scoped
  lookups) is preserved across both legacy and future
  import fact shapes.

**Rekon equivalent guarantee:**

- `EvidenceGraph` facts support deterministic
  file-scoped lookup via helpers.
- Old artifacts continue to validate.
- The memo names exactly when Option A migration
  becomes worth taking (four explicit triggers).
- Consumers have a documented contract that says
  "always use the helpers."

**What would mean we failed:**

- Future graph-aware filters silently miss production
  import facts because subject shape differs (the
  memo prescribes the fix; the next slice implements
  it).
- Producer migration ships without compatibility or
  warning (Option A is preserved as a *future*
  trigger only).
- The inconsistency is documented without resolution
  (the memo recommends Option B, which IS the
  resolution).
- EvidenceGraph consumers inspect raw fact internals
  ad hoc (the Compatibility Contract section
  explicitly forbids this).

**Regression test (for the follow-up implementation
slice):** given both the legacy
`subject = "<file>:<target>"` shape and a future
file-subject import fact shape,
`listImportTargetsForFile` must return the same set
of import targets for the file and dedupe identical
targets. The memo's "Tests Required For
Implementation" section names this as a required
test for the next slice (Test #3 in the list).

## CODEBASE-INTEL ALIGNMENT

**Classic capability or failure mode evaluated:**

- Import graph / graph intelligence as structural
  evidence for architecture filtering and analysis.

**Relevant classic files / systems considered:**

- `lib/import-graph.ts`
- `services/GraphBuildProvider.ts`
- `domain/graph/producers/**`
- `services/issues/content-filter-ruleid.ts`
- `services/IssueDetectionService.ts`

**What Rekon should preserve (and the memo does):**

- File-scoped structural facts must be reliable.
- Graph-aware filters consume helper APIs, not raw
  fact-shape quirks.
- Old `EvidenceGraph` artifacts should not break
  validation unexpectedly.
- Helper behavior should be explicit and tested.

**What Rekon should simplify (and the memo does):**

- No migration engine in v1 — helper compatibility
  is enough.
- No `EvidenceGraph` `schemaVersion` bump.
- No source re-scan side effects.
- No graph-aware filter expansion in this batch.

## OPTIONS CONSIDERED

| Option | Producer change | Helper change | Recommendation |
| --- | --- | --- | --- |
| A — migrate producer to `subject = file path` | yes | no | future trigger |
| B — compatibility-aware import helpers | no | yes (next slice) | **recommended now** |
| C — leave as-is | no | no | rejected |

**Option A** delivers the cleanest end state but
requires regenerating every existing
`EvidenceGraph` artifact and risks breaking external
consumers. It also produces a transition window
where some artifacts on disk use one shape and new
ones use another — the kernel-evidence dedupe key
includes `subject`, so a fact under the legacy shape
would NOT dedupe across the boundary with the same
fact under the new shape.

**Option B** lands the consumer-side fix in one
place (the `listImportTargetsForFile` helper) and
preserves the producer as-is. Existing artifacts
stay valid. Future graph-aware checks that consume
import facts work against production data
immediately once the helper ships. Option A becomes
additive — the helper continues to work, so the
producer migration is decoupled from the consumer
fix.

**Option C** leaves the surface broken. The
`listImportTargetsForFile` API promises file-scoped
lookup; against production data it returns the
empty array. New contributors reading the v2
strengthening claim ("prefer EvidenceGraph import
facts over `details.imports`") encounter behavior
that contradicts the documentation. Rejected.

## RECOMMENDATION

**Option B now. Option A preserved as a future
trigger.**

The compatibility-aware helper is the smallest
correctness-preserving change. It restores the v2
strengthening invariant ("prefer EvidenceGraph
import facts") against production data, keeps every
existing `EvidenceGraph` artifact valid, requires no
`schemaVersion` bump, contains the change to a
single helper function and its tests, and documents
the contract that all file-scoped lookups must go
through helpers.

## IMPLEMENTATION PLAN

The follow-up slice (a separate batch — *not* this
docs-only memo batch) should:

1. Update `listImportTargetsForFile` in
   `@rekon/kernel-findings` to consult, in order:
   `fact.subject === filePath` → `fact.value.source
   === filePath` → legacy `subject` prefix before the
   first `:` normalizing to `filePath`.
2. Dedupe targets within the helper so a fact
   matched under multiple shape branches contributes
   only once.
3. Add a `matchesFileSubject` private predicate so
   `fileImportsTargetMatching` and any future helper
   share the same compatibility logic.
4. Add contract tests for both shapes, mixed-shape
   dedupe, path normalization, anchored prefix
   matching (no false matches across files), empty
   graph, and `value.source` mismatch handling.
5. Add an end-to-end CLI fixture asserting the
   graph-aware filter consumes EvidenceGraph import
   facts from the JS/TS producer.
6. No artifact migration required. No
   `EvidenceGraph` `schemaVersion` bump.
7. Document the contract in
   `docs/concepts/graph-aware-finding-filters.md`
   and `docs/artifacts/evidence-graph.md`.

That slice is queued as ADR Implementation Order
step 21.

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

All passed. Full test suite: 770 passed / 1 skipped /
0 failed (15 new docs tests on top of the prior 755
passing tests). No CLI smoke required for this
docs-only batch.

## INTENTIONALLY UNTOUCHED

- `@rekon/capability-js-ts` import fact producer —
  unchanged.
- `@rekon/kernel-findings.listImportTargetsForFile`
  / `fileImportsTargetMatching` — unchanged.
- `@rekon/kernel-findings.listExportsForFile` /
  `listSymbolsForFile` — unchanged.
- Graph-aware filter checks
  (`graphFilterRouteHandlerWithService`,
  `graphFilterRouteHttpMiddlewareOnly`,
  `graphFilterExternalApiCommentOnly`,
  `graphFilterFactoryFileCreatesDeps`,
  `graphFilterModuleGateVerifiedCaller`,
  `graphFilterNextjsRouteConvention`) — unchanged.
- `applyFindingFilters` pipeline order — unchanged.
- `FindingFilterReport` /
  `FindingFilterHealthReport` shapes — unchanged.
- `EvidenceGraph` artifact `schemaVersion` —
  unchanged.
- All CLI commands — no new flags, no new
  subcommands.
- All capability manifests — no new roles, no new
  produces/consumes.
- Reason codes — no new codes; no reclassification
  in this batch.
- LLM / semantic / fuzzy / embedding inference —
  permanently rejected.
- Source-file reads from filter logic — still
  rejected.

## RISKS / FOLLOW-UP

- **Helper compatibility branch sprawl.** If future
  graph-aware filters need their own file-scoped
  fact-shape compatibility, the memo's contract says
  to extend the existing helpers — not to inline
  ad-hoc compatibility logic per call-site. The
  Future Migration Trigger section makes this
  explicit by counting "more than ~3 helper
  callsites needing custom compatibility logic" as a
  signal to take Option A.
- **External consumer drift.** A community capability
  that produces import facts in the new
  `subject = file path` shape will be accepted by the
  helper once Option B lands. The Compatibility
  Contract section documents this so external
  authors don't get surprised.
- **Operator data feedback loop.** Once the helper
  compatibility implementation ships, the
  filter-health `byGraphAwareReason` /
  `dominantGraphAwareReason` surfaces may show new
  EvidenceGraph-attributed counts on repos that were
  previously quiet. The "Consequences" section of
  the memo names this expectation explicitly so the
  release note for the follow-up slice can warn
  operators.
- **Producer migration coordination.** When Option A
  eventually ships, it should be coordinated with
  any future `EvidenceGraph` `schemaVersion` bump so
  consumers see one transition, not two.

## NEXT STEP

Per the memo's Implementation Plan and ADR step 21:

> **Import helper compatibility implementation.**
>
> Update `listImportTargetsForFile` in
> `@rekon/kernel-findings` to support the legacy
> `subject = "<file>:<target>"` shape AND the future
> `subject = file path` shape via the
> `matchesFileSubject` predicate. Dedupe targets.
> Add contract tests and an end-to-end CLI fixture.
> Unblock additional graph-aware filters that depend
> on EvidenceGraph import facts.

That's a runtime-behavior batch (the actual code
change to the helper) — a separate, narrowly-scoped
slice that lands the decision memo's recommended
implementation.

## CROSS-REFERENCES

- [Import fact subject-shape decision memo](../../docs/strategy/import-fact-subject-shape-decision.md)
- [Graph-aware filter provider v3 decision memo](../../docs/strategy/graph-aware-filter-provider-v3-decision.md)
- [GraphOntologyValidator-lite audit](../../docs/strategy/graph-ontology-validator-lite-audit.md)
- [Issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
- [EvidenceGraph artifact](../../docs/artifacts/evidence-graph.md)
- [Graph-aware finding filters concept](../../docs/concepts/graph-aware-finding-filters.md)
- [EvidenceGraph export / symbol facts projection v1 review packet](evidence-export-symbol-facts-v1.md)
- [Graph-aware Next.js route export convention filter review packet](graph-aware-nextjs-route-export-filter.md)
- [graph-aware finding filter provider v2 review packet](graph-aware-finding-filter-provider-v2.md)
- [graph-aware finding filter provider v1 review packet](graph-aware-finding-filter-provider-v1.md)
