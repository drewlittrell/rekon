# Review Packet: Filter-Health Diagnostics v2

Slice: P1.1 (Issue Adjudication), filter-health-diagnostics v2 slice.
Implements step 10 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to `(shipped)`).

## CHANGES MADE

### `packages/kernel-findings/src/index.ts`

- New file-local constant `BUILT_IN_PATH_FILTER_REASONS`
  enumerating the 8 reasons that count as built-in path /
  content suppression (`generated-file`, `external-file`,
  `test-file`, `canary-file`, `content-filter`,
  `explicit-exclusion`, `policy-exception`, `other`).
- New exported pure classifiers:
  - `isPolicyFiltered(entry)` — `source === "policy"` or
    `policyId` is a non-empty string.
  - `isResultFiltered(entry)` — non-policy entry whose
    reason is in `RESULT_FILTER_REASONS` (the 4-case
    result-filter set introduced in
    classic-content-result-filters v2).
  - `isClassicContentFiltered(entry)` — non-policy entry
    whose reason is in `CLASSIC_CONTENT_FILTER_REASONS` (the
    17-case classic content set introduced in
    classic-content-result-filters v2).
  - `isBuiltInPathFiltered(entry)` — non-policy entry whose
    reason is in `BUILT_IN_PATH_FILTER_REASONS` and NOT in
    the result or content sets.
  Policy takes precedence so a filtered entry with
  `source === "policy"` and a `reason: "policy-exception"`
  is classified as **policy**, not built-in. The other
  three buckets are mutually exclusive over the remainder.
- `FindingFilterHealthSummary` gains six additive optional /
  always-present fields:
  - `builtInPathFiltered: number` (always present).
  - `filterRateByReason: Record<string, number>` (always
    present; empty when nothing was filtered). Per-reason
    rate rounded to four decimals.
  - `filterRateByPolicy?: Record<string, number>` (present
    when `byPolicy` is non-empty).
  - `dominantReason?: { reason, count, rate }` (present
    when at least one finding was filtered).
  - `dominantPolicy?: { policyId, count, rate }` (present
    when at least one policy filter fired).
  - `policyFingerprint?: FindingFilterPolicyFingerprint`
    (mirror of the upstream filter report's fingerprint when
    present).
- `buildFindingFilterHealth` and
  `createFindingFilterHealthReport` accept an optional
  `currentPolicyFingerprint: FindingFilterPolicyFingerprint`.
- `buildFindingFilterHealth` now computes:
  - bucket counts (`policyFiltered` /
    `contentFiltered` / `resultFiltered` /
    `builtInPathFiltered`) via the new classifiers, so the
    four counts always sum to `totalFiltered`.
  - per-reason / per-policy filter rates rounded to four
    decimals.
  - dominant reason / policy with deterministic alphabetic
    tiebreak (`Object.entries(...).sort((a, b) => b[1] - a[1]
    || a[0].localeCompare(b[0]))`).
  - six new alerts:
    - `reason-over-filtering` — `totalFindings >= 5` AND
      `dominantReason.rate >= 0.5`.
    - `policy-dominance` — `totalFindings >= 5` AND
      `dominantPolicy.rate >= 0.5`.
    - `content-filter-dominance` — `totalFindings >= 5` AND
      `contentFiltered / totalFindings >= 0.5`.
    - `result-filter-dominance` — `totalFindings >= 5` AND
      `resultFiltered / totalFindings >= 0.5`.
    - `policy-fingerprint-missing` — `policyFiltered > 0`
      AND `report.policyFingerprint` is undefined.
    - `stale-policy-fingerprint` — caller supplied
      `currentPolicyFingerprint` AND
      `report.policyFingerprint` AND
      `currentPolicyFingerprint.digest !==
      report.policyFingerprint.digest`.
  - dominance thresholds (50 % rate + 5-finding minimum
    corpus) are deliberately lower than the over-filtering
    thresholds above them (80 %). They surface a different
    failure mode: one rule / category dominating even when
    the overall filter rate is moderate.

### `packages/runtime/src/index.ts`

- Imports `FindingFilterPolicyFingerprint` from
  `@rekon/kernel-findings`.
- `BuildFindingFilterHealthReportOptions.currentPolicyFingerprint?`
  (additive optional). Forwarded to
  `createFindingFilterHealthReport`.

### `packages/cli/src/index.ts`

- `rekon findings filter-health` now fingerprints the loaded
  policies via the existing
  `fingerprintFindingFilterPolicies` helper and forwards
  the result as `currentPolicyFingerprint`. The CLI JSON
  output adds a `currentPolicyFingerprint` field so
  operators can confirm what was loaded.
- `rekon refresh`'s `findings.filter-health` step does the
  same. The expected steady state is "match" (the upstream
  `findings.filter` step just rebuilt the report with the
  same policies), but a partial refresh that skipped
  `findings.filter` or a pre-existing filter report from an
  older policy set would still surface
  `stale-policy-fingerprint` here.

### Tests

- New `tests/contract/finding-filter-health-diagnostics-v2.test.mjs`
  with **17 tests** (all passing):
  Pure helpers (13):
  1. Classification helpers bucket entries into policy /
     content / result / built-in (with policy taking
     precedence over `policy-exception` reason).
  2. `reason-over-filtering` fires when one reason dominates
     (≥ 5 findings, ≥ 50 %).
  3. `policy-dominance` fires when one policy dominates.
  4. `content-filter-dominance` fires when content filters
     dominate.
  5. `result-filter-dominance` fires when result filters
     dominate.
  6. `low-confidence-filtered` alert includes count.
  7. `low-confidence-policy-filter` fires when a policy-
     filtered entry is low-confidence.
  8. `unused-policy-filter` names the policy id.
  9. `policy-fingerprint-missing` fires when
     `policyFiltered > 0` and report has no fingerprint.
  10. `stale-policy-fingerprint` fires when current
      fingerprint differs from report fingerprint.
  11. No `stale-policy-fingerprint` when fingerprints match.
  12. Summary includes
      `contentFiltered` / `resultFiltered` / `policyFiltered`
      / `builtInPathFiltered` counts that sum to
      `totalFiltered`.
  13. Summary includes `dominantReason` / `dominantPolicy`
      with deterministic alphabetic tiebreak.
  End-to-end CLI (4):
  14. `rekon findings filter-health` passes current config
      fingerprint and surfaces it in JSON. No stale /
      missing alerts on a fresh refresh.
  15. `rekon refresh` produces a filter-health report whose
      fingerprint matches the current config.
  16. Architecture summary and agent contract surface the
      new alert codes via existing generic Filter Health
      tables — no publication shape change required.
  17. `rekon artifacts validate` stays clean after
      diagnostics v2 fields are populated.
- Full suite: **629 passed / 1 skipped / 0 failed**.

### Docs

- `docs/artifacts/finding-filter-health-report.md` — Shape
  gains six new diagnostic fields with comments; alerts
  table includes the six new diagnostics v2 alert codes
  (13 total).
- `docs/concepts/finding-filters.md` — Health Alerts section
  expanded to list all 13 alerts; new "Classification
  helpers" subsection documenting the four classifiers and
  the policy-takes-precedence rule.
- `docs/strategy/issue-governance-architecture-decision.md`
  — Implementation Order step 10 flipped from `(future)` to
  `(shipped)` with full description; new step 11 "Filter
  policy operator workflow polish"; old step 11 renumbered
  to 12.
- `docs/strategy/classic-subsystem-purpose-map.md` —
  subsystem 6 row appended with the shipped behavior;
  status string updated with `+ filter-health-diagnostics
  v2`; next-slice column changed to "Filter policy
  operator workflow polish".
- `docs/strategy/classic-behavior-roadmap.md` — new
  detailed entry "Filter-health diagnostics v2".
- `docs/strategy/classic-guarantee-regression-plan.md` —
  new shipped entry pinned by
  `tests/contract/finding-filter-health-diagnostics-v2.test.mjs`
  (17 tests).
- `docs/strategy/roadmap.md` — new bullet under the alpha
  spine for the filter-health-diagnostics v2 slice.
- `CHANGELOG.md` — detailed entry at the top of
  `0.1.0-alpha.1`.

Review packet:
`.rekon-dev/review-packets/finding-filter-health-diagnostics-v2.md`
(this file).

## PUBLIC API CHANGES

`@rekon/kernel-findings`:
- New exported functions:
  `isPolicyFiltered(entry)`,
  `isResultFiltered(entry)`,
  `isClassicContentFiltered(entry)`,
  `isBuiltInPathFiltered(entry)` (all additive).
- `FindingFilterHealthSummary` gains:
  - `builtInPathFiltered: number` (always present).
  - `filterRateByReason: Record<string, number>` (always
    present).
  - `filterRateByPolicy?: Record<string, number>`
    (additive optional).
  - `dominantReason?: { reason, count, rate }` (additive
    optional).
  - `dominantPolicy?: { policyId, count, rate }` (additive
    optional).
  - `policyFingerprint?: FindingFilterPolicyFingerprint`
    (additive optional).
- `buildFindingFilterHealth({ ...,
  currentPolicyFingerprint? })` (additive optional input).
- `createFindingFilterHealthReport({ ...,
  currentPolicyFingerprint? })` (additive optional input).

`@rekon/runtime`:
- `BuildFindingFilterHealthReportOptions.currentPolicyFingerprint?`
  (additive optional).

`@rekon/cli`:
- `rekon findings filter-health` JSON output gains a
  `currentPolicyFingerprint` field (additive).
- No new flag or subcommand.

No SDK API change. No artifact registry change. No artifact
`schemaVersion` bump (only additive optional fields and
one always-present numeric field). No new artifact type.
No new capability role. No version bump. No npm publish.

## PURPOSE PRESERVATION CHECK

Original problem:
- Filtering protects users from noisy false positives, but
  it can also hide real governance signals if it becomes too
  broad.
- Operators need to know not only that findings were
  filtered, but whether filtering behavior looks healthy.
- A clean active-governance surface is not trustworthy if
  90 % of findings were filtered by one broad policy or
  low-confidence rule.

Classic workflow guarantee:
- codebase-intel-classic preserved filtered issues for audit
  and produced filter-health diagnostics after filtering.
- The guarantee is "filter known false positives while
  making filter behavior inspectable", not "filter
  aggressively".

Classic shape that provided the guarantee:
- `services/IssueDetectionService.ts`
- `services/issues/filter-health.ts`
- `services/issues/report-persistence.ts`
- `services/issues/content-filters.ts`
- `services/issues/issue-result-filters.ts`

Rekon equivalent (this slice):
- `FindingFilterHealthReport` already records filtered
  totals, byReason, byPolicy, and basic alerts.
- Diagnostics v2 adds per-category counts (policy / content
  / result / built-in), per-reason and per-policy rates,
  dominant reason / policy, and policyFingerprint mirror to
  the summary.
- Six new deterministic alerts cover the failure modes
  classic flagged: one reason dominating, one policy
  dominating, content / result filters dominating, missing
  policy fingerprint, stale policy fingerprint.
- Existing publications surface the new alert codes
  automatically.

What would mean we failed (and isn't the case):
- A single broad policy filters most findings with no
  warning → tests 3 + 13 + the end-to-end publication test
  assert `policy-dominance` fires and surfaces in
  publications.
- Low-confidence filtered findings are hidden in totals →
  test 6 asserts the count appears in the alert message;
  `lowConfidenceFiltered` was already in the summary.
- Unused policies remain invisible → test 8 asserts the
  alert names the unused policy id.
- Result filters suppress most active findings without a
  health alert → test 5 asserts `result-filter-dominance`
  fires (and the existing `result-filter-over-filtering`
  fires at 80 %).
- Filter policy fingerprint staleness is not reflected in
  filter health → tests 9, 10, 11 assert the two
  fingerprint alerts fire correctly and stay silent when
  fingerprints match.
- Filter health implies findings were deleted instead of
  auditable → no message says "deleted"; every alert
  references `FindingFilterReport.filteredFindings` or
  `.rekon/config.json`.

Regression test for the original problem (tests 4, 5, 16):
- Synthetic filter report with one reason or policy
  category dominating produces the matching dominance
  alert; the alert surfaces in both the architecture
  summary and the agent contract via the existing generic
  Filter Health table / subsection.

## CODEBASE-INTEL ALIGNMENT

Classic capability / failure mode: filtered issue audit and
filter-health diagnostics. Operators need to know whether
filtering behavior looks healthy.

What Rekon keeps:
- filtered findings remain auditable (no changes to
  `FindingFilterReport`)
- filter behavior is summarized and warned on
- confidence matters
- policy filters are visible by id (existing) plus by
  dominance count (new)
- result filters are distinct from content filters and
  policy filters (existing) plus separately tracked in the
  summary (new)
- active governance should not hide heavy filtering — six
  new alerts catch dominance, staleness, and missing
  fingerprints

What Rekon simplifies:
- deterministic thresholds only (50 % dominance + 5-finding
  minimum corpus)
- no graph / ontology validation
- no semantic classifier
- no LLM review
- no dashboard
- no PR / check annotations
- no auto-tuning of policies

What Rekon does not port yet:
- full classic filter-health suite (if classic ships
  richer alerts)
- GraphOntologyValidator-driven health
- persistent exclusion-list analytics
- semantic false-positive diagnostics
- UI for filter tuning

How this advances migration:
- Closes the diagnostic gap left by classic-content-result-
  filters v2 (which added counts but no dominance alerts).
- Makes filter-health load-bearing: a clean
  active-governance surface is now actively defended by
  six new deterministic alerts.
- Sets up the next slice (filter policy operator workflow
  polish) by exposing the data it will visualize
  (`filterRateByPolicy`, `dominantPolicy`, `unusedPolicies`,
  fingerprint freshness).

## HEALTH DIAGNOSTIC MODEL

`FindingFilterHealthReport.summary` after this slice:

```ts
{
  totalFindings: number;
  totalFiltered: number;
  filterRate: number;
  highConfidenceFiltered: number;
  lowConfidenceFiltered: number;
  byReason: Record<string, number>;
  byPolicy?: Record<string, number>;
  policyFiltered: number;
  unusedPolicies: string[];
  contentFiltered: number;       // classic-content-result-filters v2
  resultFiltered: number;        // classic-content-result-filters v2
  builtInPathFiltered: number;   // diagnostics v2 (new)
  filterRateByReason: Record<string, number>;          // diagnostics v2 (new)
  filterRateByPolicy?: Record<string, number>;         // diagnostics v2 (new)
  dominantReason?: { reason, count, rate };            // diagnostics v2 (new)
  dominantPolicy?: { policyId, count, rate };          // diagnostics v2 (new)
  policyFingerprint?: FindingFilterPolicyFingerprint;  // diagnostics v2 (new)
}
```

The four bucket counts (`policyFiltered` +
`contentFiltered` + `resultFiltered` +
`builtInPathFiltered`) always sum to `totalFiltered`.

## ALERT CODES / THRESHOLDS

Existing alerts (preserved):

| Code | Threshold |
| --- | --- |
| `high-filter-rate` | `filterRate > 0.8` (configurable) |
| `low-confidence-filtered` | any `confidence: "low"` |
| `policy-over-filtering` | `policyFiltered / totalFindings > 0.8` |
| `low-confidence-policy-filter` | any `source: "policy" && confidence: "low"` |
| `unused-policy-filter` | a supplied policy id matched zero findings |
| `content-filter-high-volume` | one classic content reason ≥ 5 findings AND > 50 % of total |
| `result-filter-over-filtering` | `resultFiltered / totalFindings > 0.8` |

New alerts (diagnostics v2):

| Code | Threshold |
| --- | --- |
| `reason-over-filtering` | `totalFindings >= 5` AND `dominantReason.rate >= 0.5` |
| `policy-dominance` | `totalFindings >= 5` AND `dominantPolicy.rate >= 0.5` |
| `content-filter-dominance` | `totalFindings >= 5` AND `contentFiltered / totalFindings >= 0.5` |
| `result-filter-dominance` | `totalFindings >= 5` AND `resultFiltered / totalFindings >= 0.5` |
| `policy-fingerprint-missing` | `policyFiltered > 0` AND no `report.policyFingerprint` |
| `stale-policy-fingerprint` | `currentPolicyFingerprint.digest !== report.policyFingerprint.digest` |

All alerts are `severity: "warning"`. Dominance thresholds
require a minimum corpus size (5 findings) to keep small-
example noise out. Alerts are sorted by `code` for stable
output.

## POLICY FINGERPRINT HEALTH

`policy-fingerprint-missing` and `stale-policy-fingerprint`
mirror the freshness warnings the architecture summary /
agent contract publishers already render via
`computeFilterPolicyStaleness`. The report-local versions
exist so any non-publication consumer of
`FindingFilterHealthReport` sees the same diagnostic.

Plumbing:
- `buildFindingFilterHealth({ currentPolicyFingerprint })`
  — pure kernel function.
- `createFindingFilterHealthReport({ currentPolicyFingerprint })`
  — wraps the build.
- Runtime `buildFindingFilterHealthReport({ currentPolicyFingerprint })`
  — forwards to the kernel.
- CLI `rekon findings filter-health` / `rekon refresh` —
  fingerprint current `.rekon/config.json findingFilters`
  via the existing helpers and pass through.

No new artifact type. No new schema field on
`FindingFilterReport`. The fingerprint mirror lives only
on `FindingFilterHealthReport.summary.policyFingerprint`
where downstream surfaces already render alerts.

## TESTS / VERIFICATION

Tests:
- New `tests/contract/finding-filter-health-diagnostics-v2.test.mjs`
  (17 tests, all passing).
- Full suite: **629 passed / 1 skipped / 0 failed**.

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
- `node packages/cli/dist/index.js publish architecture --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js publish agent-contract --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts freshness --root examples/simple-js-ts --json`

## INTENTIONALLY UNTOUCHED

- `FindingFilterHealthReport.schemaVersion` — additive
  optional fields only.
- Filtering decisions in `applyFindingFilters` — unchanged.
- Suggestion derivation in
  `deriveFindingFilterPolicySuggestions` — unchanged.
- `FindingReport`, `FindingFilterReport`,
  `FindingLifecycleReport`, `IssueAdjudicationReport`,
  `CoherencyDelta`, `FindingStatusLedger`,
  `FindingFilterPolicySuggestionReport`,
  `IssueMergeDecisionLedger` — no changes to behavior or
  shape.
- Architecture summary / agent contract / proof
  publishers — no shape change. The six new alert codes
  surface automatically via the existing generic Filter
  Health tables.
- `RefreshStepId` / refresh pipeline shape — unchanged.
- `validateArtifactFreshness` — unchanged. Filter-policy
  fingerprint health is report-local, not part of the
  generic freshness validator.
- All capability manifests for other packages, permissions,
  dist contents, `schemaVersion` strings.
- `GraphOntologyValidator` port — explicitly deferred.
- LLM / semantic / fuzzy / embedding matching — never.
- No version bump. No npm publish. No branch.

## RISKS / FOLLOW-UP

- Risk: dominance thresholds (50 %) overlap with the
  over-filtering thresholds (80 %), so the same report can
  fire both `policy-over-filtering` and `policy-dominance`.
  This is intentional: each conveys a slightly different
  severity ("filter is hot" vs. "one rule is dominating").
  Mitigation: documented in the alerts table.
- Risk: `policy-fingerprint-missing` may fire on every
  older filter report after this slice ships if operators
  do not run `rekon refresh`. Mitigation: this is the
  intended user-facing reminder; the alert is
  `severity: "warning"`, not `error`, and the message
  recommends `rekon refresh`. The architecture summary /
  agent contract already render the equivalent freshness
  guidance.
- Risk: dominant-reason / dominant-policy alphabetic
  tiebreaks may surprise operators when two policies tie
  on count. Mitigation: the alphabetic tiebreak is
  deterministic (mentioned in summary docs); the actual
  policy id appears in the alert message.
- Risk: the new fingerprint plumbing in
  `rekon findings filter-health` adds one extra
  config-read per CLI invocation. The cost is negligible
  (single JSON parse) and matches the existing
  `loadFindingFilterPolicies` pattern.
- Risk: publications now show six new alert codes. This is
  intentional (the whole point of the slice). Operators
  whose runs were silent before may now see new warnings.
  Mitigation: every new alert has a 5-finding minimum
  corpus so empty / tiny runs stay silent.
- Follow-up: filter policy operator workflow polish (next
  slice). Use `dominantPolicy`, `filterRateByPolicy`,
  `unusedPolicies`, and the fingerprint alerts to build a
  per-policy status view.
- Follow-up: PR / GitHub / dashboard surfaces for the new
  diagnostics. Deferred to the surfaces phase.

## NEXT STEP

Per the ADR Implementation Order step 11 and the work
order's closing section, the recommended next slice is:

> Filter policy operator workflow polish

Purpose:
- List active policies with usage counts.
- Surface unused / stale / low-confidence policy warnings.
- Possibly add `rekon findings filter-policy status`.
- No automatic mutation.

This is the clean follow-up after the ADR + filter audit
layer + filter-aware lifecycle + filter policy v1 +
filter-health publications + filter policy suggestion
derivation + filter policy suggestion publications +
apply safety v2 + freshness guardrails + content/result
filters v2 + this diagnostics v2 slice that have now
landed.
