# Review Packet: Graph-Aware Filter Provider v3 Decision Memo

Slice: P1.1 (Issue Adjudication),
graph-aware-filter-provider-v3-decision slice.
Implements step 17 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to
`(shipped)`).

**Strategy-only batch. No runtime behavior changes ship.**
The slice produces a decision memo that evaluates the ten
most prominent remaining classic graph / ontology checks
and recommends the substrate work to ship next.

## CHANGES MADE

### New: `docs/strategy/graph-aware-filter-provider-v3-decision.md`

The v3 decision memo. Twelve sections (matching the work
order's required structure):

1. Decision Summary
2. What v1/v2 Already Cover
3. Remaining Classic Checks
4. Product Decision Criteria
5. Candidate Checks To Port Now
6. Candidate Checks That Need Missing Projections First
7. Checks To Defer
8. Checks To Reject
9. Required Artifact Projections
10. Implementation Options
11. Recommended Next Implementation
12. Future Regression Tests
13. Cross-References

The memo evaluates ten remaining classic graph / ontology
checks against seven product decision criteria, classifies
each as port-now / needs-projection / defer / reject, names
the three required artifact projections in priority order,
evaluates four implementation options, and recommends a
single concrete next implementation slice.

### Updated: `docs/strategy/graph-ontology-validator-lite-audit.md`

- Top-of-file blockquote gains a "v3 decision memo" update
  pointing to the new memo.
- New "## v3 Decision Follow-up" section summarizes the
  memo's three conclusions: no broad v3 catalog ships
  next; three required artifact projections identified;
  `EvidenceGraph` export / symbol facts projection v1 is
  the recommended substrate.
- Cross-references list adds the v3 memo and the
  graph-aware finding filters concept.

### Updated: `docs/strategy/issue-governance-architecture-decision.md`

- Implementation Order step 17 flipped from `(future)` to
  `(shipped)`. Entry summarizes the memo's findings and
  reaffirms every prior rejection.
- New step 18 reserved for the recommended substrate:
  `EvidenceGraph` export / symbol facts projection v1
  (additive optional fact kinds; no new artifact type; no
  `schemaVersion` bump; no graph-aware filter ports in
  that slice).
- Step 19 reserved for any remaining product-extension
  expansion.

### Updated: `docs/strategy/classic-guarantee-regression-plan.md`

- New entries:
  - "Graph-aware filter surfacing in publications /
    filter health" (shipped at `01faa49`, pinned by
    `tests/contract/graph-aware-filter-health-publications.test.mjs`).
  - "Graph-aware finding filter provider v2" (shipped at
    `0ab0b16`, pinned by
    `tests/contract/graph-aware-finding-filters-v2.test.mjs`).
  - "Graph-aware filter provider v3 decision memo"
    (shipped at this commit, pinned by
    `tests/docs/graph-aware-filter-provider-v3-decision.test.mjs`).

### Updated: `docs/strategy/classic-subsystem-purpose-map.md`

Row 6 (Issue Detection / Adjudication) gains:
- A summary of the graph-aware filter health publications
  slice.
- A summary of the graph-aware finding filter provider v2
  slice (helpers, strengthened checks, precise
  inputRefs, pipeline reorder).
- A summary of the graph-aware filter provider v3 decision
  memo + the substrate recommendation.
- The "future" cell updates to
  "`EvidenceGraph` export / symbol facts projection v1 is
  the recommended next substrate".

### Updated: `docs/strategy/classic-behavior-roadmap.md`

New "Graph-aware filter provider v3 decision memo —
remaining classic checks" entry summarizing the memo's
conclusions, the three required projections, the
recommended next slice (export / symbol facts), and the
constraint that the substrate ships alone (no graph-aware
filter ports in the same slice).

### Updated: `docs/strategy/roadmap.md`

New entry for the v3 decision memo with the same content
shape as prior roadmap entries.

### Updated: `CHANGELOG.md`

New entry at the top of `0.1.0-alpha.1` documenting the v3
decision memo, the four-bucket separation
(port-now / needs-projection / defer / reject), the three
required artifact projections, and the recommended next
slice. Also calls out that this is a docs-only slice with
no runtime behavior change.

### New: `tests/docs/graph-aware-filter-provider-v3-decision.test.mjs`

Pins the memo's structure + key assertions so future
contributors cannot quietly drop a required section or
weaken the rejection list. 16 tests covering:

1. Memo file exists.
2. All twelve required headings appear in order.
3. Decision Summary names the recommendation
   (no-broad-catalog + export-symbol-facts substrate).
4. What v1/v2 Already Cover summarizes both slices
   (projections, checks, helpers, usedArtifacts).
5. Remaining Classic Checks evaluates all ten required
   candidates (the list from the work order).
6. Product Decision Criteria covers all seven required
   criteria (user value, evidence quality, auditability,
   scope, safety, complexity, extensibility).
7. Candidate Checks To Port Now is conservative
   (zero / at most two).
8. Candidate Checks That Need Missing Projections First
   names the substrate.
9. Checks To Defer covers the deferred candidates
   (runtime truth graph, capability role, call-graph).
10. Checks To Reject reaffirms permanent rejections
    (monolithic validator, source-reading, LLM /
    semantic / fuzzy, policy-owner parser).
11. Required Artifact Projections lists the three
    priority candidates (export / symbol, capability
    role, call-graph / referrer).
12. Implementation Options evaluates all four options
    (kernel helper, built-in capability, external rule
    pack, wait-for-projections).
13. Recommended Next Implementation is concrete +
    justified (export / symbol facts projection v1; cites
    the substrate-first rationale).
14. Memo explicitly says NOT to port a monolithic
    `GraphOntologyValidator`.
15. ADR Implementation Order references the v3 decision
    memo and queues the next substrate step.
16. CHANGELOG mentions the v3 decision memo.

## PUBLIC API CHANGES

None. Docs-only batch.

- No new exports from any `@rekon/*` package.
- No new artifact type, no new artifact field, no
  `schemaVersion` bump.
- No new CLI subcommand or flag.
- No new capability role.
- No new reason codes.

## PURPOSE PRESERVATION CHECK

**Original problem:**
- Classic codebase-intel used graph / ontology context
  because some false positives require structural
  understanding beyond paths / imports.
- Rekon v1 + v2 now cover the first five artifact-backed
  checks (the original audit's port-soon candidates).
- Before adding deeper checks, we needed to decide which
  remaining classic guarantees are still underserved and
  which would add real product value.

**Classic workflow guarantee preserved:**
- Structural repo knowledge can suppress false positives
  before active issue governance.
- The guarantee is **trustworthy, auditable structural
  filtering**, not a monolithic validator.

**Rekon equivalent guarantee preserved:**
- Graph-aware filters consume artifacts only:
  `EvidenceGraph`, `ObservedRepo`, `OwnershipMap`,
  `CapabilityMap`, `GraphSlice`.
- Missing evidence → conservative no-op.
- Filtered findings stay auditable in
  `FindingFilterReport.filteredFindings`.
- v3 checks should only be added if current artifacts can
  prove them.

**Regression for the original problem:**
- The memo makes the substrate-first decision explicit.
- Future v3 checks must consume artifact projections
  that ship first; no implementation gets ahead of the
  evidence substrate.

## CODEBASE-INTEL ALIGNMENT

**Classic capability or failure mode evaluated:**
- Deeper graph / ontology false-positive validation
  after the first structural checks.

**Relevant classic files / systems considered:**
- `infra/validation/GraphOntologyValidator.ts`
- `services/issues/content-filter-ruleid.ts`
- `services/issues/content-filter-architecture.ts`
- `services/issues/content-filter-stub-and-import.ts`
- `services/IssueDetectionService.ts`
- `services/GraphBuildProvider.ts`
- `domain/graph/producers/**`
- `domain/issues/evaluators/**`
- `domain/issues/RulesResolver.ts`

**What Rekon keeps:**
- Structural filtering can be powerful.
- Artifact evidence is required.
- Filtered findings remain auditable.
- Graph-aware checks run before lifecycle / adjudication /
  coherency.
- No hidden source scraping.

**What Rekon simplifies:**
- Decision first, implementation later.
- No broad framework catalog without proof.
- No monolithic validator.
- No LLM / semantic / fuzzy layer.
- No runtime truth graph yet.

**What Rekon does not port yet:**
- Deep policy-owner parser.
- Runtime truth graph checks.
- Full framework-specific catalog.
- Broad `GraphOntologyValidator` suite.

## DECISION SUMMARY

> **Do not port a broad v3 catalog yet. Ship the substrate
> first.**

The decision separates ten remaining candidates into four
buckets:

- **Port now (0 checks).** Every candidate either needs
  missing projections, is project-specific, or is
  permanently rejected.
- **Needs missing projections first (5 checks).** UI HTTP
  provider abstraction (deeper), UI hook uses HTTP not
  DB, framework-specific route segment config, factory by
  capability, provider boundary / external API provider
  proof.
- **Defer (3 checks).** Module gate verified caller
  beyond current kind/path, factory by capability beyond
  path (also needs capability role taxonomy), runtime
  truth graph (deferred indefinitely).
- **Reject (4 categories).** Monolithic
  `GraphOntologyValidator` port; source-reading filters;
  LLM / semantic / fuzzy / embedding matching;
  project-specific hardcoded exception catalogs in core
  (incl. full policy-owner parser).

**Recommended next implementation slice:**
`EvidenceGraph` export / symbol facts projection v1 —
the substrate that unblocks 3–4 v3 candidate checks at
once. Ships alone; no graph-aware filter ports in the
same slice.

## REMAINING CHECKS REVIEWED

The memo evaluates exactly the ten candidates the work
order required:

| # | Candidate | Decision |
| --- | --- | --- |
| 1 | UI HTTP provider abstraction (deeper) | needs projection |
| 2 | UI hook uses HTTP not DB | needs projection |
| 3 | Hardcoded config not DDE | reject for core (external rule pack) |
| 4 | Module gate verified caller beyond current kind/path | defer |
| 5 | Framework-specific route segment config conventions | needs projection |
| 6 | Factory by capability beyond path | defer (or external pack) |
| 7 | Provider boundary / external API provider proof | needs projection |
| 8 | Runtime truth graph checks | defer indefinitely |
| 9 | Full policy-owner parser | reject |
| 10 | Test / generated / external graph-ontology checks beyond paths | candidate-to-port-now IF helper added; user value marginal until operator data justifies it |

Each candidate's memo entry includes Classic purpose,
Current Rekon coverage, Artifact evidence needed,
Available today?, Risk, and Recommendation.

## MISSING PROJECTIONS IDENTIFIED

Three required artifact projections in priority order:

1. **`EvidenceGraph` export / symbol facts** — additive
   optional fact kinds (`kind: "export"`,
   `kind: "symbol"`) on the existing `EvidenceGraph`.
   Unblocks UI hook role, UI hook uses HTTP not DB,
   framework-specific route segment config beyond v2,
   capability-confirmed factory.
2. **`CapabilityMap.entries[].role?: string`** — additive
   optional role field. Unblocks provider boundary /
   external API provider proof and a stronger
   capability-confirmed factory.
3. **Call-graph / referrer evidence** — either a
   `listImportSourcesForFile` helper over existing import
   facts, or a new `kind: "call-edge"` fact. Unblocks
   deeper module-gate caller confirmation and
   reverse-import test / generated / external
   confirmation.

All three are additive optional projections; none
requires an artifact `schemaVersion` bump.

## RECOMMENDED NEXT IMPLEMENTATION

> **`EvidenceGraph` export / symbol facts projection v1.**

Concrete scope:

- Extend `@rekon/capability-model.projector` (or a
  dedicated producer if the projector is the wrong
  layer) to surface `kind: "export"` and
  `kind: "symbol"` facts alongside the existing
  `kind: "import"` facts.
- New kernel-findings helper
  `listExportsForFile(context, filePath)`.
- Contract tests pinning helper behavior, producer
  output shape, additive-optional schema (older
  `EvidenceGraph` artifacts continue to validate), no
  source reads.
- No new artifact type. No `schemaVersion` bump. No new
  CLI command or flag. No new capability role.
- No graph-aware filter ports in this slice. The
  substrate work ships alone so v3 candidate checks can
  consume it in a follow-up slice.

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

All passed. Full test suite: 731 passed / 1 skipped / 0
failed (the 16 new v3 docs tests on top of the prior 715
passing tests). No CLI smoke required for this docs-only
batch (per the work order's "Required verification"
section).

## INTENTIONALLY UNTOUCHED

- `@rekon/kernel-findings` runtime — no behavior change.
- `@rekon/runtime` — no behavior change.
- `@rekon/capability-docs` — no publication shape change.
- `@rekon/cli` — no new command, no new flag.
- Artifact schemas — no `schemaVersion` bumps, no new
  fields.
- Reason codes — no new codes.
- `EvidenceGraph` — no new fact kinds *yet* (the memo
  *recommends* them as the next slice; the actual
  projection ships separately).
- `CapabilityMap` — no new `role` field *yet* (same).
- LLM / semantic / fuzzy / embedding logic — permanently
  rejected.
- Source-file reads from filter logic — still rejected.
- `GraphOntologyValidator` port — still rejected.

## RISKS / FOLLOW-UP

- **Memo can age.** Future Rekon evolution (new
  detectors, new operator workflows, new external rule
  packs) may surface a v3 candidate the memo did not
  evaluate. The memo's structure (10 candidates × 7
  criteria) is the contract; new candidates should be
  added to the same shape, not freelanced.
- **Substrate-first discipline.** The memo recommends
  the substrate alone, without graph-aware filter ports.
  The discipline must hold — adding a filter check in
  the same slice as the substrate makes the substrate
  hard to review on its own merits.
- **Operator data feedback loop.** Once the substrate
  ships, the new "Graph-Aware Filter Reasons" surface
  and the two graph-aware dominance alerts (shipped at
  `01faa49`) will tell us *which* of the remaining
  candidates is actually missing in practice. The next
  memo (v4 or "follow-up check selection") should
  consume that operator data, not freelance.
- **External rule packs.** Three checks the memo defers
  to external packs (DDE catalogs, named-provider lists,
  Next.js-specific exception lists) need an example
  external pack to demonstrate the pattern. That's a
  separate workstream from graph-aware filtering.

## NEXT STEP

After this memo lands, the next implementation slice
should be:

> **`EvidenceGraph` export / symbol facts projection v1.**

After the substrate ships and operator data accumulates
from the graph-aware filter health surfaces, the
follow-up slice should ship **one** narrow graph-aware
check that depends on the new substrate. The strongest
candidate per the memo is strengthening
`nextjs-route-convention` (or its graph-aware variant) to
confirm route file exports structurally. That choice can
be revisited based on the data.

## CROSS-REFERENCES

- [Graph-aware filter provider v3 decision memo](../../docs/strategy/graph-aware-filter-provider-v3-decision.md)
- [GraphOntologyValidator-lite audit](../../docs/strategy/graph-ontology-validator-lite-audit.md)
- [Issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
- [graph-aware finding filter provider v1 review packet](graph-aware-finding-filter-provider-v1.md)
- [graph-aware filter health publications review packet](graph-aware-filter-health-publications.md)
- [graph-aware finding filter provider v2 review packet](graph-aware-finding-filter-provider-v2.md)
- [graph-aware finding filters concept](../../docs/concepts/graph-aware-finding-filters.md)
