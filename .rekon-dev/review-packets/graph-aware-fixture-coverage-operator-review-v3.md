# Review Packet — Graph-Aware Fixture Coverage Operator Review v3

Strategy / docs / test batch only. No runtime change. No
producer change. No helper change. No filter behavior
change. No artifact `schemaVersion` bump. No new
artifact type. No new capability role. No new CLI
subcommand or flag. No new reason codes. No version
bump. No npm publish.

## CHANGES MADE

**New decision memo:**

- `docs/strategy/graph-aware-fixture-coverage-operator-review-v3.md`
  — full operator review memo against the
  post-strengthening attribution profile, with the
  required sections: Decision Summary, Why This Review
  Exists, Fixture Coverage Reviewed, Diagnostic
  Results (per-fixture table + aggregate counts +
  attribution delta vs v2 baseline + per-fixture
  health summary + publication surface +
  negative-case verification + fallback path
  pinning), Migration Trigger Review (all four
  triggers re-evaluated), Artifact-Strength Review
  By Reason (per-reason current source + strength +
  next-slice action + summary table),
  Alpha-Completeness Decision, Option A / B / C
  framing, Recommendation, Decision For Alpha,
  Follow-Up Work, Cross-References.

**Supporting docs updated:**

- `docs/strategy/factory-module-gate-evidence-strengthening.md`
  — "Graph-aware fixture coverage operator review
  v3" entry under Deferred Work flipped to shipped
  with the alpha-complete summary; cross-references
  add the v3 review.
- `docs/strategy/graph-aware-fixture-coverage-operator-review-v2.md`
  — banner notes v3 supersedes for the
  post-strengthening baseline; cross-references add
  the v3 review.
- `docs/strategy/graph-aware-import-evidence-operator-review-refresh.md`
  — banner extended with the v3 review's
  alpha-complete decision; cross-references add the
  v3 review.
- `docs/strategy/import-fact-subject-shape-decision.md`
  — front-matter adds the v3 operator review block
  (aggregate `EvidenceGraph: 6 / DetectorDetails: 0
  / ObservedRepo: 0`; all four triggers re-evaluated;
  Option C confirmed; graph-aware arc alpha-complete;
  next slice is issue merge decision freshness
  guardrails). Cross-references add the v3 review.
- `docs/strategy/graph-ontology-validator-lite-audit.md`
  — new paragraph notes the v3 review recorded the
  arc as alpha-complete; cross-references add the
  v3 review.
- `docs/strategy/issue-governance-architecture-decision.md`
  — step 31 flipped from `(future)` to `(shipped)`
  with the full diagnostic summary; new step 32
  re-introduces "Issue merge decision freshness
  guardrails" as the recommended next implementation
  slice; new step 33 moves "Per-module ObservedSystem
  projection + CapabilityMap role field" to optional
  future; step 34 reserves "Persistent exclusion
  lists" + further product-extension expansion.
- `docs/strategy/classic-behavior-roadmap.md` — new
  v3 operator-review entry directly below the
  factory / module-gate v1 strengthening entry.
- `docs/strategy/roadmap.md` — new
  graph-aware-fixture-coverage-operator-review-v3
  entry above the
  factory-module-gate-evidence-strengthening entry.
- `docs/concepts/graph-aware-finding-filters.md` —
  Operator Review paragraph extended with the v3
  review's alpha-complete summary.
- `docs/concepts/finding-filters.md` — graph-aware
  bullet extended with the v3 review pointer +
  alpha-complete decision.
- `docs/artifacts/evidence-graph.md` —
  operator-review paragraph extended with the v3
  block (alpha-complete + reason summary).
- `CHANGELOG.md` — new top-of-`0.1.0-alpha.1` entry
  summarizing the v3 review.

**New review packet:**

- `.rekon-dev/review-packets/graph-aware-fixture-coverage-operator-review-v3.md`
  (this file).

**New docs test:**

- `tests/docs/graph-aware-fixture-coverage-operator-review-v3.test.mjs`
  — 21 required assertions covering the memo's
  existence, required headings, recommendations,
  alpha-complete decision, cross-references,
  CHANGELOG mention, and review packet existence +
  purpose-preservation-check section.

## PUBLIC API CHANGES

**None.** No code changes. No type changes. No
fact-shape changes. No exported helper changes. No
`schemaVersion` bumps. No CLI flag changes.

## PURPOSE PRESERVATION CHECK

- **Original problem:** graph-aware filtering needs
  artifact-backed evidence strong enough to justify
  suppressing active governance findings. After the
  factory / module-gate v1 strengthening shipped at
  `a2a2d25`, all six graph-aware reasons appear
  EvidenceGraph-backed in fixture data. The product
  decision needed in this batch is whether that is
  sufficient for alpha — or whether deeper
  projections are still needed before moving on.
- **Classic workflow guarantee preserved:** classic
  graph / ontology filtering used the **strongest
  available deterministic structural evidence** to
  suppress false positives. The guarantee is not
  "every check uses a specific artifact type"; it is
  "every suppression is justified by the strongest
  deterministic evidence available and remains
  auditable." The v3 review confirms that every
  fixture positive is now artifact-backed, the
  publication surface continues to distinguish
  evidence sources, and the per-row `evidenceSource`
  field continues to make every decision auditable.
- **No behavior change in this slice.** The memo
  records the measured baseline; it proposes no
  filter / helper / producer change. The recommended
  next slice (issue merge decision freshness
  guardrails) is a separate batch that returns to
  deferred governance work.
- **Failure modes avoided:**
  - The memo does not claim complete parity with
    classic `GraphOntologyValidator`; it explicitly
    notes that deeper ontology / runtime-truth
    checks remain deferred (and the
    GraphOntologyValidator-lite audit's "no
    monolithic port" position is unchanged).
  - The memo does not migrate import producer shape;
    all four triggers re-evaluated remain unmet.
  - The memo does not change runtime behavior in a
    strategy batch.
  - The memo does not ignore that fixture
    attribution has improved — that improvement is
    the central diagnostic finding that justifies
    the alpha-complete decision.

## CODEBASE-INTEL ALIGNMENT

Aligned to:

- `infra/validation/GraphOntologyValidator.ts`
  (classic reference; intentionally not ported per
  the GraphOntologyValidator-lite audit; the v3
  review explicitly confirms the audit's position
  for alpha).
- `services/IssueDetectionService.ts`,
  `services/issues/content-filter-ruleid.ts`,
  `services/issues/filter-health.ts` (classic
  filtering surface; the v3 review confirms the
  Rekon-side equivalent — per-row `evidenceSource`,
  per-reason × per-source matrix, alert thresholds
  for fallback dominance — works end-to-end against
  every committed fixture).
- `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**` (classic graph
  substrate; the v3 review records which producer
  output backs each filter and confirms no producer
  migration is needed).

What Rekon keeps:
- structural filtering remains artifact-backed where
  possible;
- fallbacks remain visible through `evidenceSource`;
- filtered findings remain auditable (raw
  `FindingReport` byte-preserved; filter report
  exposes evidence source per row);
- migration decisions remain evidence-driven, not
  aesthetic.

What Rekon simplifies:
- decision memo only;
- no schema bump;
- no producer migration;
- no new graph checks;
- no source reads.

## FIXTURES REVIEWED

Six deterministic fixtures under
`tests/fixtures/graph-aware-filters/` (identical to
the v2 set):

| Fixture | Source files | Expected graph-aware reason |
| --- | --- | --- |
| `route-handler` | `src/api/widgets/route.ts` (imports `./handler`), `src/api/widgets/handler.ts` | `route-handler-with-service` |
| `external-comment` | `src/api/util.ts` (imports `leftpad`; mentions `"openai"` in a comment) | `external-api-comment-only` |
| `nextjs-route` | `src/app/dashboard/page.tsx` (`DashboardPage` named export) | `nextjs-route-convention` |
| `route-http-middleware-only` positive | `src/api/session/route.ts` (imports only `/infra/http/` + `/infra/Identity/`) | `route-http-middleware-only` |
| `route-http-middleware-only` negative | `src/api/bad/route.ts` (imports `/infra/Database/...`) | none — finding must remain KEPT |
| `factory-file` | `src/core/services/widgets/WidgetFactory.ts` (`createWidgetService` export) | `factory-file-creates-deps` |
| `module-gate` | `src/modules/payments/PaymentGateEvaluator.ts` (`evaluatePaymentGate` export) | `module-gate-verified-caller` |

Three contract tests (25 assertions total) pin the
attribution end-to-end on `main` at `a2a2d25`:

- `tests/contract/graph-aware-filter-fixtures.test.mjs`
  — v1 fixtures (route-handler, external-comment,
  nextjs-route).
- `tests/contract/graph-aware-filter-fixtures-v2.test.mjs`
  — v2 fixtures (route-http-middleware-only
  positive + negative, factory-file, module-gate)
  with the new EvidenceGraph attribution for factory
  + module-gate.
- `tests/contract/factory-module-gate-artifact-evidence.test.mjs`
  — full factory + module-gate coverage with
  EvidenceGraph + ObservedRepo + path-fallback
  scenarios.

## DIAGNOSTIC RESULTS

### Per-fixture diagnostic table

| Fixture | Reason | Filtered? | Evidence Source | EvidenceGraph InputRef | Publication Surfaced |
| --- | --- | --- | --- | --- | --- |
| `route-handler` | `route-handler-with-service` | yes | `EvidenceGraph` | yes | yes |
| `external-comment` | `external-api-comment-only` | yes | `EvidenceGraph` | yes | yes |
| `nextjs-route` | `nextjs-route-convention` | yes | `EvidenceGraph` | yes | yes |
| `route-http-middleware-only` positive | `route-http-middleware-only` | yes | `EvidenceGraph` | yes | yes |
| `route-http-middleware-only` negative | n/a (KEPT) | no | n/a | n/a | n/a |
| `factory-file` | `factory-file-creates-deps` | yes | `EvidenceGraph` | yes | yes |
| `module-gate` | `module-gate-verified-caller` | yes | `EvidenceGraph` | yes | yes |

### Aggregate evidence-source counts (six filtered cases)

| Evidence Source | Count |
| --- | ---: |
| `EvidenceGraph` | 6 |
| `DetectorDetails` | 0 |
| `ObservedRepo` | 0 |

### Attribution delta vs v2 baseline

The two reasons the v2 review identified as
candidates for evidence strengthening
(`factory-file-creates-deps`,
`module-gate-verified-caller`) lifted from
`DetectorDetails` to `EvidenceGraph` after the
factory / module-gate strengthening shipped at
`a2a2d25`. The remaining four reasons were already
EvidenceGraph-backed at the v2 baseline; their
attribution is unchanged.

## MIGRATION TRIGGER REVIEW

Four triggers from the import-fact subject-shape
decision memo re-evaluated against the new data:

1. **Helper compatibility logic exceeds ~3 callsites** —
   **not met.** `listImportTargetsForFile` remains
   the sole helper. The v3 strengthening did not add
   any new import-helper callsites (factory and
   module-gate consume export / symbol facts, not
   imports).
2. **EvidenceGraph schemaVersion bump planned for
   unrelated reasons** — **not met.** No unrelated
   bump queued.
3. **External capability authors report confusion** —
   **not met.** No community issue / PR raised.
4. **Import facts become a publication-facing
   artifact projection** — **not met.**

**Conclusion:** no trigger met. **Option C remains
correct for alpha. The fixture suite now proves
every shipped graph-aware reason can be supported
by artifact-backed EvidenceGraph evidence in
committed regression data.**

## ARTIFACT-STRENGTH REVIEW

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

## ALPHA-COMPLETENESS DECISION

**The graph-aware v1 / v2 / v3 arc is
alpha-complete.**

All seven criteria evaluated in the memo are met:

1. Every shipped graph-aware reason has
   deterministic fixture coverage.
2. Every fixture positive is artifact-backed in
   committed regression data.
3. Path / CapabilityMap / OwnershipMap fallback
   branches remain in the implementation and are
   pinned by contract tests.
4. The publication-facing diagnostic surface
   distinguishes evidence sources and asks
   reviewers to weight `DetectorDetails` more
   critically.
5. The negative case is pinned.
6. Import producer migration is not required.
7. No remaining graph-aware reason needs further
   strengthening before alpha.

## RECOMMENDATION

**Option C remains the alpha decision.** Keep helper
compatibility; do not migrate the import producer
during alpha; revisit only if a migration trigger
fires.

**Graph-aware v1 / v2 / v3 arc is alpha-complete:**

- all shipped graph-aware reasons have deterministic
  fixture coverage;
- all committed fixture positives are
  EvidenceGraph-backed after `a2a2d25`;
- fallback paths remain for compatibility but are
  no longer the fixture baseline.

**Explicitly:**

- **No import fact producer migration in alpha
  unless a trigger is met.**
- **Factory / module-gate artifact evidence
  strengthening closes the last known
  fixture-attribution gap.**

**Next implementation slice:** **Issue merge
decision freshness guardrails** — return to the
deferred issue-governance trust gap (previously
deferred until filtering / graph-aware parity was
stronger; that condition is now satisfied).

## TESTS / VERIFICATION

**Docs test added:**
`tests/docs/graph-aware-fixture-coverage-operator-review-v3.test.mjs`
— 21 required assertions covering memo existence,
required headings, recommendation language,
alpha-complete decision, no-migration statement,
last-known-gap statement, all six fixture
references, EvidenceGraph + DetectorDetails +
`graphAwareByEvidenceSource` references,
migration-trigger evaluation, cross-references from
the import-fact subject-shape decision,
graph-aware-finding-filters concept, and
EvidenceGraph artifact doc, CHANGELOG mention, and
review packet existence + purpose-preservation
check.

**Verification commands:**
- `npm run typecheck` — clean
- `npm run test` — full suite green
- `npm run build` — clean
- `git diff --check` — clean
- `node scripts/audit-package-exports.mjs` — passed
- `node scripts/publish-dry-run.mjs` — passed
- `node scripts/audit-license.mjs` — passed
- `node scripts/install-smoke.mjs` — passed
- `node scripts/install-tarball-smoke.mjs` — passed

No extra CLI smoke beyond the data already pinned by
the three graph-aware fixture contract tests (25
assertions) and the v3 docs test.

## INTENTIONALLY UNTOUCHED

- `extractImportFacts` (`@rekon/capability-js-ts`)
  and every other producer.
- `listImportTargetsForFile`,
  `listSymbolsForFile`, `listExportsForFile`
  helpers.
- Every graph-aware filter check (route-handler,
  route-http-middleware-only,
  external-api-comment-only,
  nextjs-route-convention,
  factory-file-creates-deps,
  module-gate-verified-caller).
- `evidenceSourceFromGraphArtifacts` /
  `FindingFilterEvidenceSource` types + precedence.
- `FindingFilterReport`, `FindingFilterHealthReport`,
  `EvidenceGraph`, `ObservedRepo`, `OwnershipMap`,
  `CapabilityMap` schemas. No new fields. No
  `schemaVersion` bumps.
- Architecture summary + agent contract publication
  renderers.
- The six committed fixture directories — read-only.
- CLI subcommands, flags, exit codes.
- Capability roles, capability templates.
- `examples/**` — no user-facing example changes.

## RISKS / FOLLOW-UP

**Risks:**

- The alpha-complete decision is based on
  **committed fixture data**, not real-world repo
  data. The publications already include
  fallback-dominance alerts
  (`graph-aware-details-fallback-dominance`,
  `graph-aware-observedrepo-fallback-dominance`,
  `graph-aware-evidencegraph-low-usage`) that
  would fire if real repos show different
  attribution patterns. If a real repo
  systematically surfaces `DetectorDetails`
  fallback for factory or module-gate (because its
  symbol/export names don't match the canonical
  patterns), the deferred substrates
  (per-module `ObservedSystem` projection,
  CapabilityMap `role` field) become candidates
  for activation. The path-evidence + CapabilityMap
  + OwnershipMap fallback branches that remain in
  the filter implementation cover those cases
  today.
- The "graph-aware arc is alpha-complete" framing
  is scoped to the deterministic filter substrate
  (path / symbol / export / import / OwnershipMap /
  ObservedSystem.kind) that classic
  codebase-intel-classic's
  `GraphOntologyValidator` covered. Deeper
  ontology / runtime-truth checks remain
  intentionally deferred per the
  GraphOntologyValidator-lite audit's rejection
  list; the v3 review does not change that
  position.

**Follow-up work:**

- **Issue merge decision freshness guardrails** —
  recommended next implementation slice. If
  `CoherencyDelta` roll-ups are based on a stale
  `IssueMergeDecisionLedger` or a stale
  `IssueAdjudicationReport`, publications and
  `resolve.issue` should warn clearly.
- Per-module `ObservedSystem` projection +
  CapabilityMap `role` field — optional future
  substrates (activate if real-repo data shows
  `DetectorDetails` fallback dominance for factory
  / module-gate).
- Persistent exclusion lists, additional
  product-extension expansion.

## NEXT STEP

**Issue merge decision freshness guardrails.**

Return to the deferred issue-governance trust gap.
If `CoherencyDelta` roll-ups are based on a stale
`IssueMergeDecisionLedger` or a stale
`IssueAdjudicationReport`, publications and
`resolve.issue` should warn clearly. This was
previously deferred until filtering / graph-aware
parity was stronger; the v3 review records that
condition as satisfied.
