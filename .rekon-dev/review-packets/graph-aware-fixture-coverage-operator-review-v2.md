# Review Packet — Graph-Aware Fixture Coverage Operator Review v2

Strategy / docs / test batch only. No runtime change. No
producer change. No helper change. No filter behavior
change. No artifact `schemaVersion` bump. No new artifact
type. No new capability role. No new CLI subcommand or
flag. No new reason codes. No version bump. No npm
publish.

## CHANGES MADE

**New decision memo:**

- `docs/strategy/graph-aware-fixture-coverage-operator-review-v2.md`
  — full operator review memo against the now-six
  deterministic fixtures, with the required sections:
  Decision Summary, Why This Review Exists, Fixture
  Coverage Reviewed, Diagnostic Results (per-fixture
  table + aggregate counts + publication surface +
  negative-case verification), Migration Trigger Review
  (all four triggers re-evaluated against the new data),
  Artifact-Strength Review By Reason (per-reason current
  source, strength, recommended action, summary table),
  Option A / B / C framing, Recommendation, Decision For
  Alpha, Follow-Up Work, Cross-References.

**Supporting docs updated:**

- `docs/strategy/graph-aware-import-evidence-operator-review-refresh.md`
  — banner notes the v2 review supersedes the refresh
  for the now-complete six-fixture diagnostic surface;
  Follow-Up Work points at the shipped v2 review and
  preserves the prior framing; Cross-References add
  the v2 review.
- `docs/strategy/import-fact-subject-shape-decision.md`
  — front-matter adds a v2-review summary block
  (aggregate `EvidenceGraph: 4` / `DetectorDetails: 2` /
  `ObservedRepo: 0`; all four triggers re-evaluated /
  none met; Option C confirmed; v2 review identifies
  factory + module-gate as next evidence-strengthening
  targets). Cross-References add the v2 review.
- `docs/strategy/graph-ontology-validator-lite-audit.md`
  — new "Graph-Aware Fixture Coverage Operator Review v2"
  section explains how strengthening factory +
  module-gate via role / kind / ownership projections
  fits the audit's framing (no monolithic port; no
  source reads; deterministic
  capability-author-declarable projections). Cross-References
  add the v2 review.
- `docs/strategy/issue-governance-architecture-decision.md`
  — Implementation Order step 28 flipped from
  `(future)` to `(shipped)` with the full diagnostic
  summary; new step 29 reserves "Factory / module-gate
  artifact evidence strengthening" as the next
  implementation slice; the prior "future" step shifts
  to step 30.
- `docs/strategy/classic-behavior-roadmap.md` — new
  "Graph-aware fixture coverage operator review v2"
  entry directly below the v2-fixtures entry; aggregate
  diagnostics, migration-trigger review, Option C
  decision, per-reason artifact-strength table, and
  next-slice pointer at "Factory / module-gate artifact
  evidence strengthening". The prior entry's
  "recommended next slice" pointer updated to point at
  this new entry.
- `docs/strategy/roadmap.md` — new
  graph-aware-fixture-coverage-operator-review-v2 entry
  above the graph-aware-filter-fixtures-v2 entry,
  mirroring the classic-behavior-roadmap entry's
  structure.
- `docs/concepts/graph-aware-finding-filters.md` —
  Operator Review paragraph extended with the v2
  review's aggregate diagnostics, migration-trigger
  result, and next evidence-strengthening candidates.
- `docs/concepts/finding-filters.md` — graph-aware bullet
  extended with the v2 review pointer, aggregate
  diagnostics, and next evidence-strengthening
  candidates.
- `docs/artifacts/evidence-graph.md` — operator-review
  paragraph extended with the v2 review block (aggregate
  diagnostics; migration triggers re-evaluated / none
  met; Option C confirmed; next evidence-strengthening
  candidates).
- `CHANGELOG.md` — new top-of-`0.1.0-alpha.1` entry
  summarizing the v2 review with the full diagnostic
  surface, migration-trigger conclusion, Option C
  decision, and next-slice pointer.

**New review packet:**

- `.rekon-dev/review-packets/graph-aware-fixture-coverage-operator-review-v2.md`
  (this file).

**New docs test:**

- `tests/docs/graph-aware-fixture-coverage-operator-review-v2.test.mjs`
  — 20 required assertions covering the memo's
  existence, headings, recommendations, cross-references,
  CHANGELOG mention, and the review packet's purpose
  preservation check.

## PUBLIC API CHANGES

**None.** No code changes. No type changes. No fact-shape
changes. No exported helper changes. No `schemaVersion`
bumps.

## PURPOSE PRESERVATION CHECK

- **Original problem:** graph-aware filtering now has
  fixture coverage for all graph-aware reasons, but not
  all reasons are equally artifact-backed. Operators need
  to know whether the current attribution profile is
  acceptable, or whether specific reasons need stronger
  artifact projections.
- **Classic workflow guarantee preserved:** classic
  graph / ontology filtering used structural repo
  evidence to suppress false positives. The guarantee is
  not "every check must use EvidenceGraph" — it is that
  every suppression is justified by the strongest
  available deterministic evidence and remains auditable.
  The v2 review confirms this guarantee holds:
  - the four EvidenceGraph-attributed reasons consult real
    artifact evidence at filter time and cite
    EvidenceGraph in `FindingFilterReport.header.inputRefs`;
  - the two DetectorDetails-attributed reasons surface
    that attribution explicitly via `FilteredFinding.evidenceSource`,
    `FindingFilterHealthSummary.graphAwareByEvidenceSource`,
    and the publications, so auditors can see at a
    glance which suppressions rest on path evidence and
    review them more critically. The agent-contract
    "Do Not Do" reminder already tells reviewers to
    weight DetectorDetails entries more critically than
    EvidenceGraph entries.
- **No behavior change in this slice.** The memo records
  measured attribution accurately; it does not propose
  any filter / helper / producer change. The
  recommended next slice is a separate batch.
- **What would mean we failed:** treating fixture
  coverage as complete parity when two reasons still rest
  on `DetectorDetails`; migrating import fact production
  even though helper compatibility works; ignoring that
  factory / module-gate attribution may need better
  artifact support; changing runtime behavior in a
  strategy batch. None of these failure modes apply: the
  memo explicitly distinguishes EvidenceGraph from
  DetectorDetails attribution, recommends against
  producer migration, identifies factory / module-gate
  as the next evidence-strengthening candidates, and
  ships zero runtime changes.

## CODEBASE-INTEL ALIGNMENT

Aligned to:

- `infra/validation/GraphOntologyValidator.ts` (classic
  reference for graph / ontology-informed false-positive
  filtering; intentionally not ported, as documented in
  the GraphOntologyValidator-lite audit and reaffirmed
  here).
- `services/IssueDetectionService.ts`,
  `services/issues/content-filter-ruleid.ts`,
  `services/issues/filter-health.ts` (classic
  filtering and filter-health surfaces; the v2 review
  records the equivalent Rekon-side diagnostic surface
  for all six reasons).
- `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**` (classic producer side;
  the v2 review documents which reasons consume which
  producer outputs and where the next slice's
  projection could land).
- `lib/import-graph.ts` (classic import-graph surface;
  the v2 review confirms helper-compatibility on the
  Rekon side via `listImportTargetsForFile` is
  sufficient for every import-consuming check).

What Rekon keeps:
- graph-aware filtering is artifact-backed where
  possible;
- fallbacks remain visible through `evidenceSource`;
- filtered findings remain auditable (raw
  `FindingReport` byte-preserved; filter report exposes
  evidence source per row);
- migration decisions are based on measured evidence,
  not aesthetics.

What Rekon simplifies:
- decision memo only — no schema bump, no producer
  migration, no new graph checks, no source reads, no
  filter rewrites.

## FIXTURES REVIEWED

Six deterministic fixtures under
`tests/fixtures/graph-aware-filters/`:

| Fixture | Source files | Expected graph-aware reason |
| --- | --- | --- |
| `route-handler` | `src/api/widgets/route.ts` (imports `./handler`), `src/api/widgets/handler.ts` | `route-handler-with-service` |
| `external-comment` | `src/api/util.ts` (imports `leftpad`; mentions `"openai"` in a comment) | `external-api-comment-only` |
| `nextjs-route` | `src/app/dashboard/page.tsx` (`DashboardPage` named export) | `nextjs-route-convention` |
| `route-http-middleware-only` positive | `src/api/session/route.ts` (imports only `/infra/http/` + `/infra/Identity/`) | `route-http-middleware-only` |
| `route-http-middleware-only` negative | `src/api/bad/route.ts` (imports `/infra/Database/...`) | none — finding must remain KEPT |
| `factory-file` | `src/core/services/widgets/WidgetFactory.ts` | `factory-file-creates-deps` |
| `module-gate` | `src/modules/payments/PaymentGateEvaluator.ts` | `module-gate-verified-caller` |

Each fixture is copied into a `mkdtemp` temp directory by
the contract tests
(`tests/contract/graph-aware-filter-fixtures.test.mjs`
and
`tests/contract/graph-aware-filter-fixtures-v2.test.mjs`)
before `rekon refresh` runs, so committed fixture
directories stay untouched. The contract tests pass on
`main` at `b2f74b8`, so the measured attribution profile
recorded below is current.

## DIAGNOSTIC RESULTS

### Per-fixture diagnostic table

| Fixture | Reason | Filtered? | Evidence Source | EvidenceGraph InputRef | Publication Surfaced |
| --- | --- | --- | --- | --- | --- |
| `route-handler` | `route-handler-with-service` | yes | `EvidenceGraph` | yes | yes |
| `external-comment` | `external-api-comment-only` | yes | `EvidenceGraph` | yes | yes |
| `nextjs-route` | `nextjs-route-convention` | yes | `EvidenceGraph` | yes | yes |
| `route-http-middleware-only` positive | `route-http-middleware-only` | yes | `EvidenceGraph` | yes | yes |
| `route-http-middleware-only` negative | n/a (KEPT) | no | n/a | n/a | n/a |
| `factory-file` | `factory-file-creates-deps` | yes | `DetectorDetails` | no | yes |
| `module-gate` | `module-gate-verified-caller` | yes | `DetectorDetails` | no | yes |

### Aggregate evidence-source counts (six filtered cases)

| Evidence Source | Count |
| --- | ---: |
| `EvidenceGraph` | 4 |
| `DetectorDetails` | 2 |
| `ObservedRepo` | 0 |

No `graph-aware-details-fallback-dominance`,
`graph-aware-observedrepo-fallback-dominance`, or
`graph-aware-evidencegraph-low-usage` alert fires per
fixture (each fixture surfaces exactly one filtered row
of one evidence source).

### Negative-case verification

The `route-http-middleware-only` negative case
(`src/api/bad/route.ts` importing
`/infra/Database/client`) appears in
`FindingFilterReport.keptFindings` and is absent from
`FindingFilterReport.filteredFindings`. The contract
test additionally asserts that no filtered entry
anywhere in the report carries the
`route-http-middleware-only` reason — catching both
under-suppression and over-suppression regressions in
the same diff.

## MIGRATION TRIGGER REVIEW

Four triggers from the import-fact subject-shape
decision memo re-evaluated against the new data:

1. **Helper compatibility logic exceeds ~3 callsites** —
   **not met.** `listImportTargetsForFile` remains the
   sole helper carrying the legacy ↔ new shape branch.
   The four EvidenceGraph-attributed fixtures all fire
   through it; the two DetectorDetails fixtures do not
   consume imports.
2. **EvidenceGraph `schemaVersion` bump planned for
   unrelated reasons** — **not met.** No unrelated bump
   is queued. The v2 fixture batch shipped no bump.
3. **External capability authors report confusion** —
   **not met.** No community PR or issue raised the
   subject shape during the fixture-coverage batches.
4. **Import facts become a publication-facing artifact
   projection** — **not met.** Import facts remain
   internal; publication surfaces consume the
   evidence-source attribution, not raw subject strings.

**Conclusion:** none met. **Option C remains correct
for alpha.** The fixture suite proves helper
compatibility is sufficient for the import-backed
graph-aware checks currently shipped.

## ARTIFACT-STRENGTH REVIEW

| Reason | Current source | Strength | Next-slice action |
| --- | --- | --- | --- |
| `route-handler-with-service` | `EvidenceGraph` | strong artifact-backed | none |
| `route-http-middleware-only` | `EvidenceGraph` | strong artifact-backed | none |
| `external-api-comment-only` | `EvidenceGraph` | strong artifact-backed | none |
| `nextjs-route-convention` | `EvidenceGraph` | strong artifact-backed | none |
| `factory-file-creates-deps` | `DetectorDetails` | acceptable fallback | strengthen via role / kind / capability projection |
| `module-gate-verified-caller` | `DetectorDetails` | acceptable fallback | strengthen via ObservedSystem.kind / OwnershipMap projection |

## RECOMMENDATION

**Option C remains the alpha decision.** Keep helper
compatibility; do not migrate the import producer
during alpha; revisit only if a migration trigger fires.

**Next implementation slice: factory / module-gate
artifact evidence strengthening.** Move
`factory-file-creates-deps` and
`module-gate-verified-caller` from `DetectorDetails` /
path fallback toward stronger artifact-backed evidence
via:

- `ObservedSystem.kind === "module"` for
  `/modules/<name>/` directory roots;
- CapabilityMap role tags (`role: "factory"`,
  `role: "module-gate"`);
- or first-class EvidenceGraph symbol / export facts
  for factory and gate-evaluator names.

Once the projection exists, the existing path-evidence
filter branches can cite an artifact via
`evidenceSourceFromGraphArtifacts` precedence and
attribution shifts to `EvidenceGraph` / `ObservedRepo`
naturally — no filter logic rewrite required. The
path-evidence fallback stays for repos outside the
projection's coverage.

**Explicitly:**

- **No import fact producer migration in alpha unless
  a trigger is met.**
- **Factory / module-gate are the next
  evidence-strengthening candidates, not import
  producer migration.**

## TESTS / VERIFICATION

**Docs test added:**
`tests/docs/graph-aware-fixture-coverage-operator-review-v2.test.mjs`
— 20 required assertions covering the memo's existence,
required headings, recommendation language, all six
fixture references, EvidenceGraph + DetectorDetails
references, `graphAwareByEvidenceSource` reference,
migration-trigger evaluation, cross-references from
supporting docs (`import-fact-subject-shape-decision`,
`graph-aware-finding-filters` concept,
`evidence-graph` artifact), CHANGELOG mention, and
review packet existence + purpose-preservation-check
section.

**Verification commands:**
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `git diff --check`
- `node scripts/audit-package-exports.mjs`
- `node scripts/publish-dry-run.mjs`
- `node scripts/audit-license.mjs`
- `node scripts/install-smoke.mjs`
- `node scripts/install-tarball-smoke.mjs`

No extra CLI smoke needed beyond the data already
proven by the v1 + v2 fixture contract tests, which
both run as part of `npm run test`.

## INTENTIONALLY UNTOUCHED

- `extractImportFacts` (`@rekon/capability-js-ts`).
- `listImportTargetsForFile`,
  `fileImportsTargetMatching` (`@rekon/kernel-findings`).
- Any graph-aware filter check (route-handler,
  route-http-middleware-only, external-api-comment-only,
  nextjs-route-convention, factory-file-creates-deps,
  module-gate-verified-caller).
- `evidenceSourceFromGraphArtifacts` /
  `FindingFilterEvidenceSource` types and precedence.
- `FindingFilterReport`, `FindingFilterHealthReport`,
  `EvidenceGraph` schemas. No new fields. No
  `schemaVersion` bumps.
- Architecture summary + agent contract publication
  renderers.
- The six committed fixture directories — read-only;
  the contract tests' `withFixtureCopy` flow remains
  the canonical access pattern.
- CLI subcommands, flags, exit codes.
- Capability roles, capability templates.
- `examples/**` — no user-facing example changes.

## RISKS / FOLLOW-UP

**Risks:**

- The DetectorDetails attribution for factory /
  module-gate is intentional and documented, but
  operators reading the publications may interpret it
  as a regression. **Mitigation:** the agent-contract
  "Do Not Do" reminder already tells reviewers to
  weight DetectorDetails more critically than
  EvidenceGraph; the v2 review memo + classic-behavior
  roadmap + CHANGELOG explicitly document the
  attribution as expected baseline; the next slice's
  goal is to lift attribution naturally without a
  filter rewrite.
- The "next slice" framing depends on a projection
  target (CapabilityMap role tag, ObservedSystem kind,
  EvidenceGraph symbol fact). The v2 memo lists the
  candidates; the next batch's strategy memo should
  pick one before implementation lands.

**Follow-up:**

- **Factory / module-gate artifact evidence
  strengthening** is the recommended next implementation
  slice — likely with its own strategy memo first to
  pin the projection target, then a small implementation
  slice that adds the projection + a filter branch
  that prefers it over path-evidence via existing
  `evidenceSourceFromGraphArtifacts` precedence.
- The other queued follow-ups (merge-decision freshness
  guardrails, persistent exclusion lists, additional
  product-extension expansion) are unchanged by this
  batch.

## NEXT STEP

**Factory / module-gate artifact evidence strengthening.**

Move `factory-file-creates-deps` and
`module-gate-verified-caller` from `DetectorDetails` /
path fallback toward stronger artifact-backed evidence.
Likely substrate: `ObservedSystem.kind`,
CapabilityMap role / kind tags, EvidenceGraph
symbol / export facts. Still no source reads, no
`GraphOntologyValidator` port, no producer migration
for import facts. Start with a strategy memo to pin
the projection target; ship a small implementation
slice after the memo is reviewed.
