# Review Packet: Issue Governance ADR + Filtering / Filter Health v1

Slice: P1.1 (Issue Adjudication), filtering v1 slice.

## CHANGES MADE

### Part 1 — ADR

`docs/strategy/issue-governance-architecture-decision.md` (new).
Formalizes Rekon's layered issue-governance model:

1. `FindingReport` (raw, never mutated)
2. `FindingFilterReport` (system / policy filtering audit) ← **new**
3. `FindingStatusLedger` (operator status decisions)
4. `FindingLifecycleReport`
5. `IssueAdjudicationReport`
6. `IssueMergeDecisionLedger` (product extension)
7. `CoherencyDelta`

The ADR explicitly labels `IssueMergeCandidate`,
`IssueMergeDecisionLedger`, accepted-merge rollups in
`CoherencyDelta` v3, and publication / resolver awareness of
those rollups as **Rekon product extensions**, not classic
codebase-intel parity. Future ADRs may promote them; the
labeling stays explicit in strategy docs and review packets
until promoted.

### Part 2 — implementation

`packages/kernel-findings/src/index.ts`
- New types: `FindingFilterReason`,
  `FindingFilterConfidence`, `FindingFilterSource`,
  `FilteredFinding`, `FindingFilterSummary`,
  `FindingFilterReport`, `FindingFilterHealthAlert`,
  `FindingFilterHealthSummary`,
  `FindingFilterHealthReport`, `ApplyFindingFiltersResult`.
- New helpers (exported): `applyFindingFilters`,
  `summarizeFindingFilterReport`,
  `createFindingFilterReport`,
  `validateFindingFilterReport`,
  `assertFindingFilterReport`,
  `findingFilterReportSchema`,
  `buildFindingFilterHealth`,
  `createFindingFilterHealthReport`,
  `validateFindingFilterHealthReport`,
  `assertFindingFilterHealthReport`,
  `findingFilterHealthReportSchema`.
- Internal helpers: `pathHasSegment`, `pathHas`,
  `pathFilterMatch`, `contentFilterMatch`,
  `findBestFilterMatch`, `validateFilteredFinding`.
- Deterministic v1 filter rules. Priority order
  `generated > external > test > canary > content`.

`packages/sdk/src/index.ts`
- Adds `FindingFilterReport` and `FindingFilterHealthReport` to
  `BUILT_IN_ARTIFACT_TYPES`.

`packages/runtime/src/index.ts`
- Imports new types + helpers from `@rekon/kernel-findings`.
- `ARTIFACT_CATEGORY_BY_TYPE` maps `FindingFilterReport` and
  `FindingFilterHealthReport` to `findings`.
- New exported helpers:
  - `buildFindingFilterReport(store, options?)` — reads the
    latest (or pinned) `FindingReport`, applies filters, writes
    a `FindingFilterReport` with `inputRefs` citing the source
    `FindingReport`. Throws when no `FindingReport` exists.
  - `buildFindingFilterHealthReport(store, options?)` — reads
    the latest (or pinned) `FindingFilterReport`, derives
    health summary + alerts, writes a
    `FindingFilterHealthReport` citing the filter report and
    its upstream refs. Builds the filter report if missing by
    default (controllable via `buildIfMissing: false`); a
    pinned `filterReportId` that does not exist throws.

`packages/cli/src/index.ts`
- New imports: `buildFindingFilterReport`,
  `buildFindingFilterHealthReport`.
- New subcommands: `rekon findings filter` and
  `rekon findings filter-health`.
- `RefreshStepId` union gains `"findings.filter"` and
  `"findings.filter-health"`.
- `runRefresh` adds two new steps between `evaluate` and
  `findings.lifecycle`:
  1. `findings.filter` — writes a `FindingFilterReport`.
  2. `findings.filter-health` — writes a
     `FindingFilterHealthReport` (summary surfaces
     `alerts.length`).
- `REQUIRED_REFRESH_ARTIFACT_TYPES` extended with
  `FindingFilterReport` and `FindingFilterHealthReport`.
- Usage list extended with `rekon findings filter` and
  `rekon findings filter-health`.

Tests:
- New `tests/contract/finding-filters.test.mjs` with 18 tests
  covering: deterministic filter rules per reason, kept-finding
  preservation, reason priority, payload retention in
  `filteredFindings`, summary counts, validator rejection of
  unknown reasons, filter-health alerts
  (`high-filter-rate` + `low-confidence-filtered`),
  `createFindingFilterHealthReport` validity,
  `buildFindingFilterReport` empty-store error, CLI happy paths
  for `findings filter` / `findings filter-health`,
  refresh-pipeline step ordering + step status + artifacts,
  raw `FindingReport` non-mutation, freshness staleness after
  newer `FindingReport`, and `artifacts validate` cleanliness.
- Updated: `tests/contract/refresh-command.test.mjs` and
  `tests/contract/coherency-delta-adjudicated.test.mjs` to
  reflect the new refresh step order
  (evaluate → findings.filter → findings.filter-health →
  findings.lifecycle → …).
- Full suite: 476 passed / 1 skipped / 0 failed.

Docs:
- New: `docs/artifacts/finding-filter-report.md`,
  `docs/artifacts/finding-filter-health-report.md`,
  `docs/concepts/finding-filters.md`,
  `docs/strategy/issue-governance-architecture-decision.md`.
- Updated: `docs/artifacts/finding-report.md` (Consumed By
  callout to filter layer), `docs/artifacts/finding-lifecycle-report.md`
  (Relationship To Filtering + cross-refs),
  `docs/artifacts/issue-adjudication-report.md`
  (Relationship To Filtering + cross-refs),
  `docs/concepts/finding-lifecycle.md`,
  `docs/concepts/issue-adjudication.md`,
  `docs/concepts/coherency-delta.md`,
  `docs/concepts/refresh.md` (pipeline order + step
  descriptions),
  `docs/strategy/classic-subsystem-purpose-map.md`,
  `docs/strategy/classic-behavior-roadmap.md`,
  `docs/strategy/classic-guarantee-regression-plan.md`,
  `docs/strategy/roadmap.md`,
  `docs/strategy/classic-alignment-map.md`, `README.md`,
  `AGENTS.md`, `CONTRIBUTING.md`, `CHANGELOG.md`.

Review packet: `.rekon-dev/review-packets/issue-governance-filtering-v1.md` (this file).

## PUBLIC API CHANGES

`@rekon/kernel-findings`:
- New exported types and helpers listed above. All additive;
  no existing API removed or renamed.

`@rekon/sdk`:
- `BUILT_IN_ARTIFACT_TYPES` adds two new entries
  (`FindingFilterReport`, `FindingFilterHealthReport`) at
  `schemaVersion 0.1.0` with `stability: "experimental"`.

`@rekon/runtime`:
- New exported helpers `buildFindingFilterReport` and
  `buildFindingFilterHealthReport`. Additive.
- `ARTIFACT_CATEGORY_BY_TYPE` extended additively.

`@rekon/cli`:
- New subcommands `rekon findings filter` and
  `rekon findings filter-health`. Additive.
- `runRefresh` step order extended additively
  (evaluate → findings.filter → findings.filter-health →
  findings.lifecycle → …).
- `REQUIRED_REFRESH_ARTIFACT_TYPES` extended additively.

No SDK API removal. No artifact registry rename. No
schemaVersion bump. No new capability role. No CLI subcommand
rename or removal. No version bump. No npm publish.

## PRODUCT ARCHITECTURE DECISION

The ADR `docs/strategy/issue-governance-architecture-decision.md`
locks the layered issue-governance model and the product-extension
boundary. Highlights:

- The pipeline is FindingReport → **FindingFilterReport** →
  FindingStatusLedger → FindingLifecycleReport →
  IssueAdjudicationReport → CoherencyDelta.
- `IssueMergeCandidate`, `IssueMergeDecisionLedger`,
  accepted-merge rollups in `CoherencyDelta` v3, and the
  publication / resolver awareness of those rollups are
  **Rekon product extensions**, not classic parity. They
  remain shipped and supported.
- Future work must label batches in strategy docs and review
  packets as one of: classic-guarantee preservation, Rekon
  reinterpretation, or Rekon product extension. AGENTS.md +
  CONTRIBUTING.md call this out.
- Implementation order: (1) this batch — ADR + filtering v1;
  (2) filter-aware lifecycle / adjudication; (3) filter-aware
  CoherencyDelta; (4) merge-decision freshness guardrails,
  `GraphOntologyValidator`, and other product-extension
  expansion.

## PURPOSE PRESERVATION CHECK

Original problem: raw issue / finding output is noisy. Some
findings are valid governance signals; many are false
positives — touch generated / test / external / canary files,
known exclusions, or content-driven cases. Without an audit
layer between detection and active governance, those false
positives become active drift in lifecycle / adjudication /
coherency, and operators lose trust in the surface. Even
worse, suppressed findings can disappear entirely with no
audit trail.

Classic shape: `services/IssueDetectionService.ts`,
`services/issues/content-filters.ts`,
`services/issues/issue-result-filters.ts`,
`services/issues/filter-health.ts`,
`services/issues/report-persistence.ts`,
`domain/issues/mergeIssues.ts`, plus the
`GraphOntologyValidator` false-positive checks. Classic
detects → dedupes by stable issue id → hydrates systems →
filters with reason / evidence / confidence → preserves status
/ review metadata → writes a filtered audit alongside the
canonical report → builds filter health → compiles coherency
delta from the governed (post-filter) report.

Rekon equivalent (this slice):
- `FindingReport` stays raw.
- `FindingFilterReport` records system / policy suppression
  with `reason` / `evidence` / `filePath` / `confidence` /
  `filteredAt` / `source` per filtered finding, plus a
  `keptFindings` projection.
- `FindingFilterHealthReport` summarizes filter behavior with
  `filterRate` / `byReason` / confidence breakdowns and emits
  `high-filter-rate` + `low-confidence-filtered` alerts.
- Operator status decisions remain in `FindingStatusLedger`
  (separate concern from system filtering).
- Lifecycle / adjudication / coherency still read
  `FindingReport` in this slice; filter-aware consumption is
  the next slice. Filter artifacts are produced and auditable
  today.

What would mean we failed (and isn't the case here):
- Filtered findings silently disappear → covered by
  "filtered findings remain present in
  `FindingFilterReport.filteredFindings`" tests + the audit
  guarantee documented in the artifact spec.
- Ignored status used as substitute for filtering → covered by
  the ADR's terminology section and the agent / contributor
  instruction that filters are system / policy, status is
  operator.
- CoherencyDelta treats known false positives as active drift
  → this slice intentionally defers filter-aware coherency to
  the next slice; the ADR documents the deferral and lifecycle
  /adjudication / coherency continue to read `FindingReport`.
- Filter reasons vague / missing → reasons are an enum, every
  entry carries `evidence` (human-readable) + `filePath` +
  `confidence`.
- Users cannot see what was filtered → CLI
  `rekon findings filter --json` and
  `rekon findings filter-health --json` expose everything.
- Existing merge-candidate behavior presented as classic
  parity → ADR + AGENTS.md + CONTRIBUTING.md + CHANGELOG +
  strategy docs all label it as a product extension.

Regression: given a `FindingReport` containing one normal
finding and one generated-file false positive, filtering emits
a `FindingFilterReport` with the filtered finding + reason +
evidence + confidence, a `keptFindings` list with the normal
finding, a `FindingFilterHealthReport` summarizing the filter
behavior, and leaves the raw `FindingReport` unchanged on
disk. All covered by tests in
`tests/contract/finding-filters.test.mjs`.

## CODEBASE-INTEL ALIGNMENT

Classic capability / failure mode: issue filtering,
false-positive audit, status preservation, and filter-health
diagnostics.

What Rekon keeps:
- raw findings are not enough
- false positives need explicit reason / evidence / confidence
- filtered findings remain auditable (full payload retained)
- issue governance has a final active surface (kept findings;
  consumed in the next slice)
- status / review decisions are separate from system filtering
  (separate artifact + separate ADR section)
- coherency should roll up governed findings / issues, not
  unfiltered noise (deferred to next slice)

What Rekon simplifies:
- deterministic filter rules only
- no `GraphOntologyValidator` port yet
- no LLM filtering, no semantic / fuzzy / embedding matching
- no automatic ignore / accept status from filters
- no configured filter policy beyond initial built-ins
- no filter-health scoring beyond simple alerts

What Rekon does not port yet:
- full classic content filter catalog
- graph / ontology validation
- `issueExclude` config policy
- persistent exclusion list
- semantic false-positive classifier
- filter-health advanced alerting / scoring
- delta projections from filtered audit (next slice covers the
  lifecycle / adjudication piece)

How this advances migration:
- Restores a major classic guarantee currently missing in
  Rekon (false-positive filtering audit).
- Gives Rekon an auditable filter layer before pushing
  merge-decision architecture further.
- Separates faithful classic guarantees from product
  extensions explicitly, via the ADR.

## FILTER MODEL

Deterministic v1 filter rules (in priority order, strongest
first):

| Reason | Trigger | Confidence |
| --- | --- | --- |
| `generated-file` | path segment is `dist`, `build`, or `generated`, or path contains `__generated__` or `.generated.` | high |
| `external-file` | path segment is `node_modules`, `vendor`, or `third_party` | high |
| `test-file` | path segment is `test`, `tests`, `__tests__`, or `__test__`, or filename ends with `.test.{ts,tsx,js,jsx,mjs,cjs}` or `.spec.{ts,tsx,js,jsx,mjs,cjs}` | high |
| `canary-file` | path contains `canary` | high |
| `explicit-exclusion` | reserved for future config-driven exclusions | n/a in v1 |
| `content-filter` | finding text mentions "generated output" **and** file is in a generated path | medium |
| `policy-exception` | reserved | n/a in v1 |
| `other` | reserved escape hatch | low when used |

Notes:
- Path matching is segment-aware (case-insensitive) so both
  `node_modules/leftpad/x.js` and `/repo/node_modules/leftpad/x.js`
  match `external-file`.
- A finding without any `files` cannot be filtered by path
  rules and is kept by default.
- Each filtered entry retains the full original `Finding`
  payload in `FilteredFinding.finding` so the audit is
  recoverable.
- `filteredAt` is set once per call; `source` defaults to
  `system` (operator and policy sources reserved for future
  extensions).

## FILTER HEALTH MODEL

`FindingFilterHealthReport.summary`:
- `totalFindings` = kept + filtered (after deduping inputs).
- `totalFiltered`.
- `filterRate` = `totalFiltered / totalFindings` (0 when no
  findings), rounded to 4 decimal places.
- `highConfidenceFiltered` / `lowConfidenceFiltered` counts
  across filtered entries.
- `byReason` mirrors the filter report's reason histogram.

v1 alerts (sorted by `code` for stable output):
- `high-filter-rate` (severity `warning`) — fires when
  `filterRate > 0.8` (configurable via
  `highFilterRateThreshold`).
- `low-confidence-filtered` (severity `warning`) — fires when
  any filtered entry has `confidence === "low"`.

The alert list is empty when filtering looks healthy.

## REFRESH PIPELINE UPDATE

New pipeline order:

```
observe → project → snapshot → evaluate
       → findings.filter → findings.filter-health
       → findings.lifecycle → issues.adjudicate
       → coherency.delta → publish.architecture
       → artifacts.validate → artifacts.freshness
```

Two new step ids in the `RefreshStepId` union:
`"findings.filter"` and `"findings.filter-health"`. Both are
required by `REQUIRED_REFRESH_ARTIFACT_TYPES` (their
artifact types are listed). On failure of either step,
refresh finalizes as `failed`.

Lifecycle / adjudication / coherency continue to consume
`FindingReport` directly until the filter-aware variant ships.
The filter artifacts are produced, auditable, indexed, and
freshness-tracked today.

## TESTS / VERIFICATION

Tests:
- New `tests/contract/finding-filters.test.mjs` (18 tests).
- Updated `tests/contract/refresh-command.test.mjs` and
  `tests/contract/coherency-delta-adjudicated.test.mjs` for
  the new step order.
- Full suite: 476 passed / 1 skipped / 0 failed.

Required verification commands (all run, all green):
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `git diff --check`
- `node scripts/audit-package-exports.mjs`
- `node scripts/publish-dry-run.mjs`
- `node scripts/audit-license.mjs`
- `node scripts/install-smoke.mjs`
- `node scripts/install-tarball-smoke.mjs`
- `node packages/cli/dist/index.js refresh --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js findings filter --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js findings filter-health --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts freshness --root examples/simple-js-ts --json`

## INTENTIONALLY UNTOUCHED

- `FindingReport` shape, writes, and validation.
- `FindingStatusLedger` (operator status decisions remain a
  separate concern from filtering).
- `FindingLifecycleReport`, `IssueAdjudicationReport`,
  `IssueMergeDecisionLedger`, `CoherencyDelta` — all still
  read `FindingReport` (transitively) directly. Filter-aware
  consumption is the next slice.
- `@rekon/capability-docs.architecture-summary` / agent
  contract / `resolve.issue` — none surface filter artifacts
  yet; that is a future slice.
- All capability manifests, permissions, dist contents,
  schemaVersion strings.
- `GraphOntologyValidator` port — explicitly deferred.
- Configurable filter exclusions via `.rekon/config.json` —
  open question in the ADR.
- No version bump.
- No npm publish.

## RISKS / FOLLOW-UP

- Risk: deterministic v1 filter rules are aggressive on
  obvious cases (test / dist / node_modules) but conservative
  elsewhere. False positives in the v1 set are mitigated by
  the audit trail — every filtered finding is recoverable from
  `FindingFilterReport.filteredFindings`. Future expansions
  (config-driven exclusions, `GraphOntologyValidator`) can
  refine without breaking the audit shape.
- Risk: the filter step adds latency to `rekon refresh`. v1
  filtering is O(findings × files) and trivially fast for the
  current alpha fixture; revisit if dogfood corpora grow.
- Risk: `findings.filter-health` step writes a fresh artifact
  every refresh. This is consistent with the rest of the
  pipeline (lifecycle / adjudication / delta all write per
  run) and helps freshness pin staleness; future hardening
  could dedupe identical reports.
- Risk: lifecycle / adjudication / coherency still see filtered
  findings until the next slice. Mitigation: the ADR and every
  affected concept doc explicitly note the deferral; the
  filter report's audit trail makes it visible which findings
  *should* be filtered out of those downstream consumers.
- Follow-up: filter-aware lifecycle / adjudication (the next
  slice). Then filter-aware coherency delta. Then
  merge-decision freshness guardrails. Then optional
  config-driven filter exclusions and `GraphOntologyValidator`.

## NEXT STEP

Per the work order's closing section, the recommended next
slice is:

> Filter-aware lifecycle / adjudication

Purpose:
- `FindingLifecycleReport` and `IssueAdjudicationReport`
  should prefer `FindingFilterReport.keptFindings` from the
  latest filter report when present, falling back to
  `FindingReport` when no filter report exists.
- Filtered findings remain auditable in
  `FindingFilterReport.filteredFindings` but do not become
  active governed issue groups.
- `inputRefs` on lifecycle / adjudication reports should cite
  the `FindingFilterReport` when used so freshness propagates.

This is the clean follow-up after the ADR + filter audit layer
shipped here.
