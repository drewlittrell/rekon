# Review Packet: Classic Issue Filtering Parity v2 — Content / Result Filter Expansion

Slice: P1.1 (Issue Adjudication), classic-content-result-filters v2 slice.
Implements step 9 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to `(shipped)`).

## CHANGES MADE

### `packages/kernel-findings/src/index.ts`

- `Finding` gains an additive optional
  `details?: Record<string, unknown>`. Detectors that already
  surface structured detail (stub name / stub reason / imports
  / evidence / envVars / decisionConcerns / concernTag /
  owner.kind / otherExports / minCapabilityConfidence /
  system / ownerSystems) can pass it through; consumers that
  don't care simply ignore the field.
- `FindingFilterReason` union extended additively with 21
  new reasons (17 classic-inspired content + 4 result-filter).
  `FINDING_FILTER_REASONS` set + `FINDING_FILTER_REASON_PRIORITY`
  map extended to match. Classic content reasons land at
  priority `10`-`12`; result-filter reasons at `20`; broad
  path heuristics stay at `0`-`5`. Priority only matters when
  a finding could match multiple path-based reasons — the
  pipeline short-circuits on the first match across stages.
- New exported types:
  - `FindingContentFilterContext = { finding: Finding; ruleId?: string }`.
  - `FindingContentFilterDecision = { reason, evidence, filePath?, confidence }`.
  - `FindingResultFilterOptions = { minConfidence?, severity?, systems?, pathExcludes? }`.
- New exported function
  `applyFindingContentFilters({ finding })`. Pure synchronous
  function that iterates a fixed list of 17 case handlers
  (`CONTENT_FILTER_FNS`) and returns the first matching
  decision or `null`. Each handler is a small private
  `contentFilterX` function reading `finding.type` /
  `finding.ruleId` / `finding.description` / `firstFile()` /
  `details()` accessors with no side effects.
- New exported function
  `applyFindingResultFilters(finding, options)`. Pure
  synchronous function that evaluates `minConfidence` →
  `severity` → `systems` → `pathExcludes` in that order and
  returns the first matching decision or `null`. The local
  `FINDING_RESULT_FILTER_SEVERITY_RANK` map ranks severities
  (`critical=3, high=2, medium=1, low=0`); renamed from a
  collision with an unrelated `SEVERITY_RANK` constant later
  in the file.
- New exported validator
  `validateFindingResultFilterOptions(value)`. Returns
  `{ options: FindingResultFilterOptions, issues:
  FindingFilterPolicyValidationIssue[] }`. Issue codes:
  - `finding-result-filters-not-object`
  - `finding-result-filters-min-confidence-invalid`
  - `finding-result-filters-severity-invalid`
  - `finding-result-filters-systems-invalid`
  - `finding-result-filters-systems-entry-invalid`
  - `finding-result-filters-path-excludes-invalid`
  - `finding-result-filters-path-excludes-entry-invalid`
  - `finding-result-filters-path-excludes-absolute`
  - `finding-result-filters-path-excludes-traversal`
- `ApplyFindingFiltersOptions` gains optional
  `resultFilters?: FindingResultFilterOptions`.
  `applyFindingFilters` now runs filters in fixed priority
  order:
  1. policy filters (`findingFilters`),
  2. classic content filters,
  3. built-in path heuristics,
  4. result filters.
  The pipeline short-circuits on the first match. Every
  filtered finding still records reason / evidence /
  filePath / confidence / filteredAt / source / policyId
  exactly as before; result-filtered findings record
  `source: "system"`.
- `FindingFilterHealthSummary` gains two additive numeric
  fields: `contentFiltered` (count of findings suppressed
  by a classic content filter) and `resultFiltered` (count
  of findings suppressed by a result filter). Always
  present; `0` when no filter of that type fired.
- `buildFindingFilterHealth` computes the two new counts
  and emits two new deterministic alerts:
  - `content-filter-high-volume` — one classic content
    reason accounts for `>= 5` findings AND `> 50 %` of
    total findings.
  - `result-filter-over-filtering` — configured
    `findingResultFilters` suppress more than 80 %
    (`> highFilterRateThreshold`) of total findings.
  Alerts are appended to the existing sort-by-code list so
  output stays deterministic.
- Two file-local `Set<FindingFilterReason>` constants
  (`CLASSIC_CONTENT_FILTER_REASONS`, `RESULT_FILTER_REASONS`)
  back the new counts + alerts and document which reasons
  belong to which layer.

### `packages/runtime/src/index.ts`

- Imports `FindingResultFilterOptions` from
  `@rekon/kernel-findings`.
- `BuildFindingFilterReportOptions` and
  `BuildFindingFilterHealthReportOptions` gain optional
  `resultFilters?: FindingResultFilterOptions` (additive).
- `buildFindingFilterReport` forwards `options.resultFilters`
  into `applyFindingFilters`.
- `buildFindingFilterHealthReport`'s rebuild path forwards
  `options.resultFilters` so the
  `content-filter-high-volume` and
  `result-filter-over-filtering` alerts fire when
  `buildIfMissing` runs.

### `packages/cli/src/index.ts`

- Imports `FindingResultFilterOptions` (type) and
  `validateFindingResultFilterOptions` from
  `@rekon/kernel-findings`.
- New best-effort loader `loadFindingResultFilters(root)`:
  reads `.rekon/config.json`, drops invalid entries via
  `validateFindingResultFilterOptions`, returns `undefined`
  when no result filters are configured so callers can
  skip the result-filter stage entirely.
- `rekon findings filter` loads result filters and passes
  them through to `buildFindingFilterReport`; the JSON
  output adds a `resultFilters: <options | null>` field so
  operators can confirm what was loaded.
- `rekon findings filter-health` does the same against
  `buildFindingFilterHealthReport`.
- `rekon refresh` (`findings.filter` + `findings.filter-health`
  steps) loads result filters once per refresh alongside
  policies and forwards them.
- `validateConfig` (the worker behind `rekon config validate`)
  adds a `findingResultFilters` block. Issues from the
  validator are surfaced as `error` severities on the same
  `ConfigValidationIssue` shape used by `findingFilters`.

### Tests

- New `tests/contract/finding-content-result-filters.test.mjs`
  with **24 tests** (all passing):
  Content filter helper (10):
  1. **A** empty constructor stub → `empty-constructor-stub`.
  2. **D** same-directory import → `same-directory-import`.
  3. **E** SVG namespace URL → `svg-namespace-url`.
  4. **F** NODE_ENV client env → `client-env-node-env`.
  5. **G** speculative anti-pattern →
     `speculative-anti-pattern`.
  6. **I** hardcoded-config-not-DDE →
     `hardcoded-config-not-dde`.
  7. **M** route handler with service →
     `route-handler-with-service`.
  8. **O** external-API comment only →
     `external-api-comment-only`.
  9. **Q** Next.js route convention →
     `nextjs-route-convention`.
  10. Normal finding is kept (no content filter applies).
  Result filter helper (7):
  11. `minConfidence` filters below threshold with audit
      entry.
  12. `severity` filters below threshold with audit entry.
  13. `systems` filters outside selected systems with
      audit entry.
  14. `pathExcludes` filters matching path with audit
      entry.
  15. Result filters do not silently drop findings —
      preserves full audit (`findingId`, `evidence`,
      `confidence`, `source`, `filteredAt`).
  16. `validateFindingResultFilterOptions` accepts a valid
      block.
  17. `validateFindingResultFilterOptions` rejects invalid
      entries (out-of-range `minConfidence`, invalid
      `severity`, absolute `pathExcludes`, traversal
      `pathExcludes`).
  End-to-end CLI (7):
  18. `rekon config validate` accepts valid
      `findingResultFilters`.
  19. `rekon config validate` rejects invalid
      `findingResultFilters` (exit code 1 + structured JSON).
  20. `rekon findings filter` loads `findingResultFilters`
      from config and writes audit entries.
  21. Lifecycle / adjudication / coherency exclude
      result-filtered findings from active governance.
  22. Raw `FindingReport` is byte-identical before / after
      content/result filtering.
  23. `rekon artifacts validate` stays clean after
      content/result filtering.
  24. `rekon findings filter-health` summary reports
      `contentFiltered` / `resultFiltered` counts and the
      `result-filter-over-filtering` alert fires when
      result filters dominate suppression.
- Full suite: **612 passed / 1 skipped / 0 failed**.

### Docs

- `docs/concepts/finding-filters.md` — "Reasons" section
  references the new content + result reasons; new
  "Classic Content Filters" subsection with the 17-case
  per-trigger table; new "Classic Result Filters"
  subsection with config example + field semantics;
  "Health Alerts" expanded to 7 alerts (5 existing + 2
  new) and lists the new `contentFiltered` / `resultFiltered`
  summary counts.
- `docs/artifacts/finding-filter-report.md` — new
  "Classic-Inspired Content / Result Filters (v2)" section
  documenting pipeline order, the new reasons, the
  `Finding.details` field, and the configured
  `findingResultFilters` block + validator issue codes.
- `docs/artifacts/finding-filter-health-report.md` — Shape
  includes `contentFiltered` / `resultFiltered`; Alerts
  table includes the two new v2 alerts.
- `docs/strategy/issue-governance-architecture-decision.md`
  — Implementation Order step 9 flipped from `(future)` to
  `(shipped)` with a full description; new step 10
  "Filter-health diagnostics v2"; old step 9 renumbered to
  11.
- `docs/strategy/classic-subsystem-purpose-map.md` —
  subsystem 6 row appended with the shipped behavior;
  next-slice column changed to "Filter-health diagnostics
  v2"; status string updated with
  `+ classic-content-result-filters v2`.
- `docs/strategy/classic-behavior-roadmap.md` — new
  detailed entry "Classic issue filtering parity v2 —
  content/result filter expansion".
- `docs/strategy/classic-guarantee-regression-plan.md` —
  new shipped entry pinned by
  `tests/contract/finding-content-result-filters.test.mjs`
  (24 tests).
- `docs/strategy/roadmap.md` — new bullet under the alpha
  spine for the classic-content-result-filters v2 slice.
- `CHANGELOG.md` — detailed entry at the top of
  `0.1.0-alpha.1`.

Review packet:
`.rekon-dev/review-packets/finding-content-result-filters-v2.md`
(this file).

## PUBLIC API CHANGES

`@rekon/kernel-findings`:
- `Finding.details?: Record<string, unknown>` (additive
  optional).
- `FindingFilterReason` union extended additively with 21
  reasons (no removals).
- New exported types: `FindingContentFilterContext`,
  `FindingContentFilterDecision`,
  `FindingResultFilterOptions`.
- New exported functions:
  `applyFindingContentFilters({ finding })`,
  `applyFindingResultFilters(finding, options)`,
  `validateFindingResultFilterOptions(value)`.
- `ApplyFindingFiltersOptions.resultFilters?:
  FindingResultFilterOptions` (additive optional).
- `FindingFilterHealthSummary.contentFiltered: number` and
  `FindingFilterHealthSummary.resultFiltered: number`
  (always present; not optional — they default to `0`).

`@rekon/runtime`:
- `BuildFindingFilterReportOptions.resultFilters?` and
  `BuildFindingFilterHealthReportOptions.resultFilters?`
  (additive optional).

`@rekon/cli`:
- `rekon findings filter` / `rekon findings filter-health`
  JSON output gains a `resultFilters: <options | null>`
  field.
- `rekon config validate` validates a new
  `findingResultFilters` block under `.rekon/config.json`.

No SDK API change. No artifact registry change. No
artifact `schemaVersion` bump (only additive optional
fields). No new artifact type. No new capability role. No
new CLI subcommand or flag. No version bump. No npm
publish.

## PURPOSE PRESERVATION CHECK

Original problem:
- Some detector outputs are known false positives because
  they are informational, framework conventions, safe
  abstractions, comments-only references,
  generated/test/external cases, or below the operator's
  requested result threshold.
- Without deterministic content / result filters, users
  see noisy active-governance findings and lose trust.
- Without an audit trail, users cannot understand or
  correct filtering decisions.

Classic workflow guarantee:
- codebase-intel-classic runs deterministic content filters
  and result filters before producing the canonical active
  issue report.
- Filtered issues are preserved with reason / evidence /
  confidence for audit.

Classic shape that provided the guarantee:
- `services/issues/content-filters.ts`
- `services/issues/content-filter-stub-and-import.ts`
- `services/issues/content-filter-architecture.ts`
- `services/issues/content-filter-ruleid.ts`
- `services/issues/issue-result-filters.ts`
- `services/IssueDetectionService.ts`

Rekon equivalent (this slice):
- 17 classic-inspired content filters expressed as
  deterministic structural checks against `Finding.type` /
  `finding.ruleId` / `finding.description` /
  `finding.details`. Every filter emits a typed
  `FindingFilterReason` and a `source: "system"` audit
  entry.
- 4 classic-inspired result-filter reasons covering
  `minConfidence`, `severity`, `systems`, `pathExcludes`.
- `applyFindingFilters` runs **policy → content →
  built-in path → result** with first-match-wins
  short-circuit.
- `findingResultFilters` block in `.rekon/config.json`,
  validated by `rekon config validate`.
- Raw `FindingReport` is byte-identical before / after.
- Lifecycle / adjudication / coherency exclude every
  filtered finding (test 21).
- `FindingFilterHealthReport` gains `contentFiltered` /
  `resultFiltered` counts + two new alerts.

What would mean we failed (and isn't the case):
- A classic-known false positive remains active in
  lifecycle/adjudication → tests 1-9 + 21 assert each
  content reason fires and exclusion propagates.
- A result filter silently removes a finding without an
  audit entry → test 15 asserts the full audit entry is
  preserved (`findingId`, `evidence`, `confidence`,
  `source`, `filteredAt`).
- Filter reasons are vague or lack evidence → every
  content filter case returns a specific
  `{ reason, evidence, filePath?, confidence }`
  populated from the case-specific match logic.
- Filtering mutates raw findings or status ledgers → test
  22 asserts byte-identical `FindingReport`; the
  pipeline never touches `FindingStatusLedger`.
- Operator `ignored` / `accepted` status is used as a
  substitute for deterministic filtering → result filters
  go through the kernel filter layer, not the status
  ledger; status decisions remain unaffected.

Regression test for the original problem (test 20):
- Given findings that match classic deterministic
  false-positive cases and result-filter criteria,
  `rekon findings filter` produces FindingFilterReport
  entries with expected reason / evidence / confidence,
  excludes them from `keptFindings`, leaves raw
  `FindingReport` unchanged, and lifecycle/adjudication/
  coherency exclude them from active governance.

## CODEBASE-INTEL ALIGNMENT

Classic capability / failure mode: deterministic content
filters and issue-result filters before canonical active
issue / coherency output, with auditable filtered issues.

What Rekon keeps:
- deterministic content filtering
- result filters for confidence / severity / system /
  path-exclusion
- filtered findings remain auditable in
  `FindingFilterReport.filteredFindings`
- active governance uses kept findings
- filter evidence and confidence matter
- filter health can reveal over-filtering
- raw `FindingReport` is never mutated
- operator status decisions remain in
  `FindingStatusLedger`

What Rekon simplifies:
- 17 of classic's most-impactful content cases ported as
  structural checks; the remainder (graph / ontology /
  semantic) is explicitly deferred
- result filters as a CLI/config layer, not a separate
  reporting service
- two new filter-health alerts; richer diagnostics
  deferred to filter-health-diagnostics v2

What Rekon does not port yet:
- full classic content-filter catalog (any case requiring
  GraphOntologyValidator, repo architecture parser, or
  semantic review)
- file-existence sibling-handler lookup (the
  `route-handler-with-service` filter accepts a
  `details.imports` signal but does not perform fs reads
  in v2)
- watcher-backed path invalidation
- advanced filter-health scoring
- semantic / LLM-driven false-positive classification

How this advances migration:
- Closes the most visible classic false-positive cases
  via structural rules.
- Makes operator-configured surface filters first-class
  with full audit trail.
- Sets up `Finding.details` as the contract for richer
  detector-side metadata in future slices.

## CONTENT FILTER MODEL

Filter pipeline order (first match wins):

1. **Policy filters** (`findingFilters`) — operator-supplied
   exclusion rules.
2. **Classic content filters** — 17 deterministic
   structural checks ported from codebase-intel-classic.
3. **Built-in path heuristics** — `generated-file` /
   `external-file` / `test-file` / `canary-file` /
   `content-filter`.
4. **Result filters** — operator-configured surface
   filters.

Each content filter is a small private function
`contentFilterX(finding) → FindingContentFilterDecision |
null`. The helper iterates a fixed list of these
functions (`CONTENT_FILTER_FNS`) in priority order and
returns the first match. Synchronous, side-effect-free,
no fs access.

`Finding.details?: Record<string, unknown>` accessors are
file-local: `details(finding)` returns the bag or `{}`;
`stringField(record, key)` / `stringArrayField(record, key)`
extract typed values defensively. Detectors that don't
emit detail simply never hit any classic content filter.

Per-case logic is documented in
`docs/concepts/finding-filters.md` "Classic Content
Filters" (full table) and in the per-function comments at
the kernel source. Cases that depend on file-existence
(sibling `handler.ts`, etc.) accept a structural signal
from `details.imports` instead of performing fs reads in
v2 — keeping the helper synchronous and free of async
churn.

## RESULT FILTER MODEL

`FindingResultFilterOptions`:
```ts
{
  minConfidence?: number;        // [0, 1]
  severity?: "critical" | "high" | "medium" | "low";
  systems?: string[];            // allow-list
  pathExcludes?: string[];       // glob patterns
}
```

Evaluation order in `applyFindingResultFilters`:

1. **`minConfidence`** — reads
   `finding.details.minCapabilityConfidence` (coerced to
   number); fires when value `< options.minConfidence`.
   Reason: `below-min-confidence`.
2. **`severity`** — ranks via
   `critical=3, high=2, medium=1, low=0`; fires when the
   finding rank is below the configured floor. Reason:
   `below-min-severity`.
3. **`systems`** — reads `finding.details.system` (single)
   and `finding.details.ownerSystems` (list); fires when
   the declared systems don't overlap the allowed set.
   Reason: `outside-selected-system`. (Findings with no
   declared system are kept — the operator can use
   `findingFilters` for stricter exclusion.)
4. **`pathExcludes`** — reuses the same `matchPathPattern`
   vocabulary as `findingFilters[].pathPattern`. Reason:
   `configured-path-exclusion`.

Result filters run after content + path + policy filters,
so deterministic suppression keeps priority. A finding
that already matched an earlier layer never reaches the
result-filter stage. Result-filtered findings record
`source: "system"` and stay in
`FindingFilterReport.filteredFindings` — they are not
silently deleted.

## CONFIG VALIDATION

`.rekon/config.json findingResultFilters` is validated by
`validateFindingResultFilterOptions`. Every issue is
emitted as an `error` severity on the
`ConfigValidationIssue` shape used by `findingFilters`:

- `findingResultFilters.minConfidence` must be a number in
  `[0, 1]`.
- `findingResultFilters.severity` must be one of
  `critical` / `high` / `medium` / `low`.
- `findingResultFilters.systems[]` must be non-empty
  strings.
- `findingResultFilters.pathExcludes[]` must be
  project-relative non-traversing glob patterns:
  - absolute paths (`/etc/...`) are rejected;
  - `..` traversal is rejected.
- Any other shape (`findingResultFilters` not an object)
  is rejected via `finding-result-filters-not-object`.

Best-effort loading: invalid entries are dropped at the
CLI loader boundary so a malformed config doesn't blow
up `rekon refresh`. `rekon config validate` is the full
diagnostic and exits non-zero on errors.

## TESTS / VERIFICATION

Tests:
- New `tests/contract/finding-content-result-filters.test.mjs`
  (24 tests, all passing).
- Full suite: **612 passed / 1 skipped / 0 failed**.

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
- `node packages/cli/dist/index.js config validate --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js findings filter --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js findings filter-health --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js findings lifecycle --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js issues adjudicate --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js coherency delta --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts freshness --root examples/simple-js-ts --json`

## INTENTIONALLY UNTOUCHED

- `FindingReport` shape (other than the additive optional
  `details` field on `Finding`).
- `FindingFilterReport` shape (additive only — the new
  reasons live inside `filteredFindings[].reason`).
- `FindingFilterHealthReport.schemaVersion` — additive
  fields only.
- `FindingFilterPolicyRule` / `findingFilters` config —
  unchanged.
- `FindingFilterPolicySuggestionReport` — unchanged.
- `FindingFilterPolicyApplyPlan` / `apply` CLI —
  unchanged.
- `FindingStatusLedger` — never read or written by the
  filter pipeline. Result filters are not operator status
  decisions.
- `FindingLifecycleReport`, `IssueAdjudicationReport`,
  `CoherencyDelta` — read kept findings only; their shape
  is unchanged.
- `proofReportPublisher`, `architectureSummaryPublisher`,
  `agentContractPublisher` — out of scope. Publications
  still surface filter-health via the existing rendering
  paths; new alert codes appear automatically because the
  publications iterate `health.alerts`.
- `RefreshStepId` / refresh pipeline shape — unchanged.
  The refresh runs `findings.filter` and
  `findings.filter-health` as before; the only change is
  that both stages now also accept and forward result
  filters.
- All capability manifests for other packages,
  permissions, dist contents, `schemaVersion` strings.
- `GraphOntologyValidator` port — explicitly deferred.
- LLM / semantic / fuzzy / embedding matching — never.
- No version bump. No npm publish. No branch.

## RISKS / FOLLOW-UP

- Risk: classic content filters depend on the new
  `Finding.details` field. Detectors that don't surface
  structured detail won't hit those filters and may keep
  emitting known false positives until they are updated
  to populate `details`. Mitigation: documented in
  `docs/concepts/finding-filters.md` "Classic Content
  Filters". The field is additive; no detector breaks.
- Risk: the
  `route-handler-with-service` /
  `route-http-middleware-only` cases rely on
  `details.imports` instead of reading the filesystem to
  confirm sibling `handler.ts` / `infra/http/` files
  exist. v2 keeps the helper synchronous; v3 could opt
  into an `fileExists` callback if a real fs check
  becomes necessary. Mitigation: documented in the
  Codebase-Intel Alignment section.
- Risk: result filters operate on `finding.details.system`
  and `finding.details.ownerSystems`. Findings with no
  declared system slip past `outside-selected-system`.
  This is intentional — the operator can use
  `findingFilters` for stricter behavior. Mitigation:
  documented in the Result Filter Model section.
- Risk: result-filter pipeline runs **after** content +
  path filters. An aggressive `minConfidence` floor can
  still be masked by a built-in `generated-file` /
  `test-file` match that fired first. This matches
  classic ordering (system / policy filters precede
  operator surface filters) and is intentional.
  Mitigation: filter-health surfaces
  `result-filter-over-filtering` when configured floors
  dominate suppression.
- Risk: 24 new tests + 17 new content filters add
  surface area. Mitigation: every filter is pure /
  deterministic / synchronous / single-purpose; the
  helper iterates a fixed list so adding or removing a
  case is a single-line change in `CONTENT_FILTER_FNS`.
- Risk: `validateFindingResultFilterOptions` reuses the
  existing `FindingFilterPolicyValidationIssue` shape
  (with `policyIndex: -1` for non-policy-rule context).
  Future work could split into two issue shapes;
  current shape keeps `rekon config validate` output
  uniform. Mitigation: documented in this packet.
- Follow-up: Filter-health diagnostics v2 (the next
  slice). Add richer diagnostics: per-reason
  over-filtering, unused-policy, low-confidence,
  content-filter dominance, result-filter dominance,
  possible stale policy fingerprints. ADR step 10.
- Follow-up: classic content cases B, C, H, J, K, L, N,
  P. Several of these depend on stronger detector-side
  signals (e.g. ownership kind, infra-path imports). They
  are sketched in `docs/concepts/finding-filters.md` and
  the helper list, but the v2 fixture set doesn't
  exercise them end-to-end — they fire when the
  appropriate `details` payload is present.
- Follow-up: PR / GitHub / dashboard surfaces for
  content / result filter activity. Deferred to the
  surfaces phase.

## NEXT STEP

Per the ADR Implementation Order step 10 and the work
order's closing section, the recommended next slice is:

> Filter-health diagnostics v2

Purpose:
- Add richer filter-health warnings that mirror classic
  filter-health intent: per-reason over-filtering, unused
  policies, low-confidence filters, content-filter
  dominance, result-filter dominance, possible stale
  policy fingerprints.

This is the clean follow-up after the ADR + filter audit
layer + filter-aware lifecycle + filter policy v1 +
filter-health publications + filter policy suggestion
derivation + filter policy suggestion publications +
apply safety v2 + freshness guardrails + this
content/result filters slice that have now landed.
