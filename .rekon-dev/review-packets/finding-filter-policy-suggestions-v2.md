# Review Packet: Filter Policy / Exclusion Persistence v2

Slice: P1.1 (Issue Adjudication), filter-policy-suggestions
v2 slice. Implements step 5 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order.

## CHANGES MADE

### `packages/kernel-findings/src/index.ts`

- New exported types:
  - `FindingFilterPolicySuggestionReason` —
    `repeated-filtered-path` /
    `repeated-filtered-type` /
    `repeated-filtered-policy-gap` /
    `high-volume-filtered-pattern`.
  - `FindingFilterPolicySuggestionConfidence` — `high` /
    `medium` / `low`.
  - `FindingFilterPolicySuggestion` — `id`, `reason`,
    `suggestedRule` (a full `FindingFilterPolicyRule`),
    `confidence`, `rationale`, `affectedFindingIds`,
    `affectedPaths`, `affectedTypes`,
    `sourceFilterReportIds`, `evidence`.
  - `FindingFilterPolicySuggestionSummary` —
    `totalSuggestions`, `highConfidence`,
    `mediumConfidence`, `lowConfidence`, `byReason`.
  - `FindingFilterPolicySuggestionReport` —
    `header`, `summary`, `suggestions`.
  - `DeriveFindingFilterPolicySuggestionsInput`.
- New exported helpers:
  - `deriveFindingFilterPolicySuggestions(input)` — pure /
    deterministic. Buckets filtered findings by path
    prefix, type, and reason; emits suggestions when
    configured thresholds are met; runs coverage checks
    against the supplied `policies` array; orders results
    deterministically (reason rank then id).
  - `summarizeFindingFilterPolicySuggestions(suggestions)`.
  - `createFindingFilterPolicySuggestionReport(input)`.
  - `validateFindingFilterPolicySuggestionReport(value)`.
  - `assertFindingFilterPolicySuggestionReport(value)`.
  - `findingFilterPolicySuggestionReportSchema`.
- New file-local helpers:
  - `suggestionPathPrefix(filePath)` — first-two-segment
    prefix (single-segment paths use that one segment).
  - `uniqueSortedArray(values)`.
  - `hashSuggestionId(parts)` — tiny non-cryptographic
    djb2-style hash so suggestion / rule ids stay stable
    across runs.
  - `ruleCoversPath` / `ruleCoversType` — coverage checks
    against existing `findingFilters`.
  - `validateFindingFilterPolicySuggestion(...)` — full
    structural validator used by the report validator.
- Thresholds documented as constants:
  `SUGGESTION_MIN_REPEATED_PATH = 2`,
  `SUGGESTION_HIGH_CONFIDENCE_PATH = 3`,
  `SUGGESTION_MIN_REPEATED_TYPE = 3`,
  `SUGGESTION_HIGH_VOLUME_THRESHOLD = 5`,
  `SUGGESTION_HIGH_VOLUME_DOMINANCE = 0.8`.
- `repeated-filtered-policy-gap` is computed **first** so
  it wins over `repeated-filtered-path` at the same
  pathPattern (the gap version carries strictly more
  information). The repeated-path branch tracks a
  `policyGapPaths` set and skips any pattern that already
  produced a policy-gap suggestion.

### `packages/sdk/src/index.ts`

- `BUILT_IN_ARTIFACT_TYPES` adds
  `FindingFilterPolicySuggestionReport` (`schemaVersion`
  `0.1.0`, stability `experimental`).

### `packages/runtime/src/index.ts`

- Imports the new type + helpers from
  `@rekon/kernel-findings`.
- `ARTIFACT_CATEGORY_BY_TYPE.FindingFilterPolicySuggestionReport
  = "findings"`.
- New `BuildFindingFilterPolicySuggestionReportOptions` and
  `buildFindingFilterPolicySuggestionReport(store, options?)`:
  - Lists every indexed `FindingFilterReport`, sorted by
    `writtenAt` ascending.
  - Throws when no filter report exists.
  - With `filterReportIds` supplied, filters to that exact
    set (throws on no match).
  - Otherwise uses the most-recent `recentLimit` reports
    (default 5, clamped to indexed count).
  - Reads each report, runs
    `deriveFindingFilterPolicySuggestions({ filterReports,
    filterReportRefs, policies })`, and writes a
    `FindingFilterPolicySuggestionReport` with `inputRefs`
    citing every consumed `FindingFilterReport`.

### `packages/cli/src/index.ts`

- Imports `FindingFilterPolicySuggestion`,
  `FindingFilterPolicySuggestionReport` types and
  `buildFindingFilterPolicySuggestionReport`.
- Three new subcommands under `findings filter-policy`:
  - **`suggest`** — loads configured policies via the
    existing `loadFindingFilterPolicies(root)` helper,
    accepts an optional `--recent-limit <n>` flag (positive
    integer; rejected when invalid), builds the suggestion
    report, writes it under `findings`, and returns
    `{ artifact, summary, suggestions }`. Never mutates the
    config.
  - **`list`** — reads the latest
    `FindingFilterPolicySuggestionReport`. When nothing is
    indexed, returns
    `{ artifact: null, summary: null, suggestions: [],
       message: "No FindingFilterPolicySuggestionReport
       indexed. Run \`rekon findings filter-policy
       suggest\` to generate one." }`.
  - **`apply <suggestion-id> [--force]`** — looks up the
    suggestion by id, refuses low-confidence suggestions
    without `--force`, reads `.rekon/config.json`, refuses
    duplicate rule ids without `--force`, appends the
    suggested rule to `findingFilters`, preserves every
    other top-level field (`capabilities`, `permissions`,
    project extensions), writes `<JSON>\n` in one
    `writeFile` call, and returns
    `{ applied, configPath, suggestionId, appliedRule,
       force, confidence }`. When the config file doesn't
    exist, the command calls `writeConfigIfMissing(root)`
    to materialize a default config first (mirroring
    `rekon init`).
- Three new usage lines:
  - `rekon findings filter-policy suggest [--recent-limit
    <n>] [--root <path>] [--json]`
  - `rekon findings filter-policy list [--root <path>]
    [--json]`
  - `rekon findings filter-policy apply <suggestion-id>
    [--force] [--root <path>] [--json]`

### Tests

- New
  `tests/contract/finding-filter-policy-suggestions.test.mjs`
  with **15 tests** (all passing):
  1. `deriveFindingFilterPolicySuggestions`: repeated
     generated path prefix produces a high-confidence
     `repeated-filtered-policy-gap` suggestion (and no
     duplicate `repeated-filtered-path` for the same
     pathPattern).
  2. Two repeated paths (policy-filtered, source `policy`)
     produce a medium-confidence `repeated-filtered-path`
     suggestion.
  3. Existing matching config policy suppresses the
     duplicate suggestion (no suggestion at the same
     pathPattern).
  4. Repeated filtered type (≥ 3) produces a
     `repeated-filtered-type` suggestion (medium).
  5. High-volume dominant reason produces a low-confidence
     `high-volume-filtered-pattern` suggestion with no
     pathPattern.
  6. Suggestion `sourceFilterReportIds` + `evidence`
     refs cite the source `FindingFilterReport` id.
  7. CLI `suggest` writes the report and does **not**
     mutate `.rekon/config.json` (asserted via
     before / after `readFile`).
  8. CLI `list` returns the latest suggestion report.
  9. CLI `list` before any `suggest` run returns a
     friendly empty payload with command guidance.
  10. CLI `apply` appends the suggested rule to
      `findingFilters` and returns
      `applied: true` + the applied rule.
  11. CLI `apply` refuses a low-confidence suggestion
      without `--force`; `--force` succeeds.
  12. CLI `apply` refuses a duplicate rule id without
      `--force`; `--force` succeeds.
  13. CLI `apply` preserves unrelated top-level config
      fields (asserted by patching a `customExtension`
      key and confirming it survives).
  14. `rekon config validate` passes after applying a
      non-low-confidence suggestion.
  15. `rekon artifacts validate` stays clean after suggest
      + apply.
- Full suite: **529 passed / 1 skipped / 0 failed**.

### Docs

- New
  `docs/artifacts/finding-filter-policy-suggestion-report.md`.
- New
  `docs/concepts/finding-filter-policy-suggestions.md`.
- Updated `docs/artifacts/finding-filter-report.md` —
  "Consumed By" gains the suggestion-builder entry.
- Updated
  `docs/artifacts/finding-filter-health-report.md` —
  "Consumed By" mentions the suggestion CLI flow.
- Updated `docs/concepts/finding-filters.md` — new
  "Promotable to durable policy via suggestions" bullet.
- Updated
  `docs/strategy/issue-governance-architecture-decision.md`
  — Implementation Order step 5 flipped from `(future)`
  to `(shipped)`; step 6 (publication surfaces) and step
  7 (merge-decision freshness etc.) re-numbered.
- Updated `docs/strategy/classic-subsystem-purpose-map.md`
  — subsystem 6 row reflects the v2 slice and points the
  next-slice column at "Filter policy suggestions
  surfaced in architecture summary / agent contract".
- Updated `docs/strategy/classic-behavior-roadmap.md` —
  new "Filter policy / exclusion persistence v2" entry
  under P1.1 with the full behavioral description.
- Updated `docs/strategy/classic-guarantee-regression-plan.md`
  — new shipped entry pinned by the new 15-test contract.
- Updated `docs/strategy/roadmap.md` — new bullet under
  the alpha spine for the filter-policy-suggestions v2
  slice.
- Updated `README.md` CLI command list with `findings
  filter-policy suggest` / `list`.
- Updated `CHANGELOG.md` with the detailed entry at the
  top of `0.1.0-alpha.1`.

Review packet: `.rekon-dev/review-packets/finding-filter-policy-suggestions-v2.md`
(this file).

## PUBLIC API CHANGES

`@rekon/kernel-findings`:
- New exported types: `FindingFilterPolicySuggestion`,
  `FindingFilterPolicySuggestionReason`,
  `FindingFilterPolicySuggestionConfidence`,
  `FindingFilterPolicySuggestionSummary`,
  `FindingFilterPolicySuggestionReport`,
  `DeriveFindingFilterPolicySuggestionsInput`.
- New exported helpers:
  `deriveFindingFilterPolicySuggestions`,
  `summarizeFindingFilterPolicySuggestions`,
  `createFindingFilterPolicySuggestionReport`,
  `validateFindingFilterPolicySuggestionReport`,
  `assertFindingFilterPolicySuggestionReport`,
  `findingFilterPolicySuggestionReportSchema`. All
  additive.

`@rekon/sdk`:
- `BUILT_IN_ARTIFACT_TYPES` gains
  `FindingFilterPolicySuggestionReport`.

`@rekon/runtime`:
- `BuildFindingFilterPolicySuggestionReportOptions` +
  `buildFindingFilterPolicySuggestionReport` exported.
- `ARTIFACT_CATEGORY_BY_TYPE` extended.

`@rekon/cli`:
- Three new subcommands under `findings filter-policy`
  (`suggest`, `list`, `apply`).

No SDK API removal. No artifact schemaVersion bump. No
new capability role. No version bump. No npm publish.

## PURPOSE PRESERVATION CHECK

Original problem: some false positives recur across runs.
If operators repeatedly see the same filtered findings,
they need a way to turn those patterns into durable
project policy — but automatic exclusion is risky, and a
bad generated policy can hide real issues.

Classic shape: `services/IssueDetectionService.ts`,
`services/issues/issue-result-filters.ts`,
`services/issues/report-persistence.ts`,
`services/issues/filter-health.ts`, the classic
`issueExclude` config, `filtered-issues.json`. Classic
supported persistent issue exclusions / configured
filters so known cases did not keep polluting the active
issue surface; filtered issues remained auditable.

Rekon equivalent (this slice):
- `FindingFilterReport` continues to record every
  filtered finding (already shipped).
- `FindingFilterPolicySuggestionReport` identifies
  recurring filtered-finding patterns and proposes
  candidate `findingFilters` rules with
  reason / confidence / rationale / evidence.
- `rekon findings filter-policy suggest` and `list`
  are read-only.
- `rekon findings filter-policy apply <id>` is the only
  mutating command; it refuses low-confidence + duplicate
  rule ids without `--force` and preserves every other
  config field.

What would mean we failed (and isn't the case):
- Rekon silently mutates config → tested directly
  (`suggest writes a suggestion report without mutating
  config` asserts byte-for-byte equality of the config
  before and after).
- Rekon suggests broad policies without evidence → every
  suggestion records `affectedFindingIds`,
  `affectedPaths`, `affectedTypes`,
  `sourceFilterReportIds`, and `evidence` refs.
- Rekon hides repeated filtered findings → suggestions
  don't touch `FindingFilterReport`; the audit trail
  stays exactly where it was.
- Users cannot tell which filter report entries led to a
  suggestion → `sourceFilterReportIds` + `evidence` cite
  every report the derivation folded in; suggestion
  payload lists affected ids inline.
- Applying overwrites unrelated config → tested by
  patching `customExtension` into the config and
  asserting it survives `apply`.
- A suggested policy behaves like ignored status →
  suggestions only ever propose `findingFilters` entries
  (with explicit `source: "policy"` semantics in the
  filter layer); operator status decisions are never
  generated.

Regression: given repeated filtered findings under
`src/generated/**` across multiple `FindingFilterReport`
runs, `rekon findings filter-policy suggest` emits a
high-confidence `repeated-filtered-policy-gap` suggestion
with the suggested rule (`pathPattern:
"src/generated/**"`, dominant reason mirroring the
built-in filter), evidence refs back to the consumed
reports, affected finding ids, and no config mutation.
`rekon findings filter-policy apply <id>` appends the
rule to `.rekon/config.json` `findingFilters` only when
invoked explicitly. All covered by tests 1, 7, 10.

## CODEBASE-INTEL ALIGNMENT

Classic capability / failure mode: persistent issue
exclusions / configured false-positive suppression with
audit trail.

What Rekon keeps:
- repeated false positives become durable policy
  candidates
- policy filtering remains distinct from operator
  `ignored` / `accepted` status
- filtered findings remain auditable in
  `FindingFilterReport`
- suggestions cite evidence and source filter reports
- operator approval is required before config changes
- filter-health visibility (per-policy / unused /
  over-broad) still feeds the audit surface

What Rekon simplifies:
- deterministic suggestion rules only
- no `GraphOntologyValidator`
- no semantic false-positive classifier
- no automatic persistent exclusion list (config-backed
  rules are durable; everything else is regenerated each
  run)
- no dashboard / UI
- no automatic config mutation

What Rekon does not port yet:
- full classic exclusion semantics
- graph / ontology validation
- persistent exclusion merge sophistication beyond
  config-backed rules
- semantic false-positive classification
- filter tuning UI
- CI / PR filter recommendations
- surfacing suggestions in publications (next slice)

How this advances migration:
- Bridges audit-only filtering and durable configured
  exclusions in a deterministic, operator-controlled way.
- Preserves the classic persistent-exclusion value while
  keeping Rekon artifact-first.

## SUGGESTION MODEL

Suggestion ids: `policy-suggestion:<reason>:<hash>` where
`<hash>` is a 33-char djb2 derivative over the matched
dimension + reason. Rule ids: `suggested-<hash>`. Both
are stable across runs over the same inputs.

Derivation rules:

- **`repeated-filtered-policy-gap`**
  - Trigger: ≥ 3 filtered findings under a path prefix
    (first-two-segment), `source !== "policy"` (i.e.
    built-in filters fired), and no existing rule covers
    the pattern.
  - Output: `pathPattern: "<prefix>/**"`, `reason` ==
    dominant filtered reason in the bucket
    (`generated-file` / `external-file` / `test-file` /
    `canary-file` / `content-filter`), `confidence: high`,
    `rationale` naming the path prefix and the
    promote-to-explicit-policy intent.
  - Computed **first** so its higher-information
    suggestion wins over `repeated-filtered-path` at the
    same pattern.

- **`repeated-filtered-path`**
  - Trigger: ≥ 2 filtered findings under a path prefix
    AND no existing rule covers it AND no policy-gap was
    emitted for the same pattern.
  - Output: `pathPattern: "<prefix>/**"`, `reason` ==
    dominant reason in the bucket, `confidence: high`
    (≥ 3 findings) / `medium` (= 2).

- **`repeated-filtered-type`**
  - Trigger: ≥ 3 filtered findings share `finding.type`
    AND no existing rule covers the type.
  - Output: `type: "<type>"`, `reason:
    "explicit-exclusion"`, `confidence: medium`. Affected
    paths + types are recorded for audit but the
    suggested rule is intentionally type-only so it
    matches across all locations.

- **`high-volume-filtered-pattern`**
  - Trigger: one `FilteredFinding.reason` accounts for
    > 80 % of all filtered findings AND the bucket has
    ≥ 5 findings.
  - Output: `reason: <dominant>`, **no pathPattern**,
    `confidence: low`, `rationale` describing the
    dominance percentage and asking the operator to
    narrow the rule before applying. Because no
    pathPattern is set, the suggested rule has no
    matcher and will fail policy validation as-is — by
    design. `apply` only succeeds with `--force`, which
    the operator should only use after editing the
    suggested rule into something matcher-bearing.

Ordering: reason rank
`policy-gap > path > type > high-volume`, then by
suggestion id. Sets are sorted alphabetically inside the
suggestion payload (`affectedFindingIds`,
`affectedPaths`, `affectedTypes`).

## CONFIG APPLY SAFETY

`apply` is the only mutating command. Safety:

1. **Suggestion lookup.** Latest indexed
   `FindingFilterPolicySuggestionReport`. Throws when none
   is indexed (with hint to run `suggest`). Throws on
   unknown suggestion id, listing available ids.
2. **Low-confidence guard.** Refuses with a clear error
   message naming the suggestion id unless `--force` is
   passed. v1 only emits low confidence for
   `high-volume-filtered-pattern`.
3. **Duplicate-rule-id guard.** Refuses when the
   suggestion's rule id already appears in
   `findingFilters` unless `--force`.
4. **Field preservation.** Reads existing config,
   spreads it, replaces only `findingFilters` with the
   appended array. Unknown top-level fields ride
   through unchanged.
5. **Default-config fallback.** When the file doesn't
   exist (`ENOENT`), the command calls
   `writeConfigIfMissing(root)` (the same helper `rekon
   init` uses) to materialize the default shape, then
   re-reads.
6. **Single atomic write.** `<JSON>\n` written via
   `writeFile` in one call.
7. **No silent JSON drop.** Malformed config (non-JSON
   or non-object) throws explicitly; the operator runs
   `rekon config validate` to debug.

## TESTS / VERIFICATION

Tests:
- New
  `tests/contract/finding-filter-policy-suggestions.test.mjs`
  (15 tests, all passing).
- Full suite: **529 passed / 1 skipped / 0 failed**.

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
- `node packages/cli/dist/index.js findings filter-policy suggest --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js findings filter-policy list --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts freshness --root examples/simple-js-ts --json`

Smoke note: `apply` is intentionally not run against the
committed example. Tests cover all `apply` branches in
temporary fixtures.

## INTENTIONALLY UNTOUCHED

- `FindingFilterReport` shape, writes, and validation —
  consumed but never modified.
- `FindingFilterHealthReport` shape — unchanged; this
  slice ships its own report type.
- `FindingReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, `CoherencyDelta` — no
  changes to behavior or shape.
- Filter policy schema in `findingFilters` itself —
  unchanged; this slice generates rules in that exact
  shape via `suggestedRule`.
- `rekon config validate` — unchanged; it validates the
  applied rule via the existing
  `validateFindingFilterPolicyRules` helper because the
  suggestion appends a normal `FindingFilterPolicyRule`.
- Publication renderers — out of scope; the next slice
  surfaces suggestions in architecture summary / agent
  contract.
- `FindingFilterHealthReport` does not gain a
  `filter-policy-suggestions-available` alert this batch
  (the work order called it optional / docs-only because
  of the circular dependency between health and
  suggestions).
- `rekon refresh` pipeline — unchanged; `suggest` is an
  on-demand command, not a refresh step.
- `RefreshStepId` / other CLI subcommands — unchanged.
- All capability manifests, permissions, dist contents,
  schemaVersion strings.
- `GraphOntologyValidator` port — explicitly deferred.
- Semantic / fuzzy / LLM filtering — explicitly
  deferred.
- No version bump.
- No npm publish.

## RISKS / FOLLOW-UP

- Risk: `high-volume-filtered-pattern` emits a low
  confidence suggestion with no `pathPattern`. If an
  operator runs `apply --force` on it without first
  editing the suggested rule, the rule has no matcher
  and will fail `rekon config validate`
  (`finding-filter-no-matcher`). This is intentional —
  the suggestion is a *review prompt*, not a ready-to-
  paste rule — but it means `--force` users get an
  error from the next `config validate` rather than from
  `apply` itself. Future iterations could short-circuit
  with a clearer message at `apply` time.
- Risk: the path-prefix heuristic is first-two-segments
  only. Repositories with deeper conventional layouts
  (e.g. `packages/foo/src/generated/**`) will currently
  produce a `packages/foo/**` suggestion, which is too
  broad. Mitigation: the `evidence` string names the
  actual prefix; operators can narrow before applying.
  Future work could pick the longest common prefix
  shared by the bucket.
- Risk: suggestion ids are deterministic per
  `(dimension, reason)`. If the operator narrows the
  suggested rule before applying, the saved rule id
  still says `suggested-<original-hash>`, which can
  drift from the actual matcher over time. Mitigation:
  operators can rename the rule id after editing —
  `findingFilters` doesn't care which id you use beyond
  uniqueness.
- Risk: the `dominantReason` tie-breaker for the policy-
  gap branch favors alphabetical order on ties. For a
  bucket where two reasons fire equally often this can
  feel arbitrary. The audit trail still records the
  actual breakdown (`affectedPaths` / `affectedTypes`),
  but the suggested rule only gets one reason. Future
  work could split into separate suggestions per reason
  if needed.
- Risk: `apply` mutates `.rekon/config.json` in place.
  We don't write a backup. Operators rely on version
  control for rollback. Future work could add a
  `.rekon/config.json.bak` companion or git-stage the
  change.
- Follow-up: surfacing suggestions in publications (the
  next slice). Architecture summary and agent contract
  should tell users / agents when repeated filtered
  findings imply a policy suggestion, ideally with the
  same audit-pointer language used for filter health.

## NEXT STEP

Per the work order's closing section, the recommended
next slice is:

> Filter policy suggestions surfaced in architecture
> summary / agent contract

Purpose:
- Let users / agents know when repeated filtered
  findings imply a `findingFilters` policy suggestion.
- Still no automatic config mutation; surfaces should
  read the artifact, cite it in `header.inputRefs`, and
  point operators at `rekon findings filter-policy
  apply` for the explicit step.

This is the clean follow-up after the ADR + filter audit
layer + filter-aware lifecycle + filter policy v1 +
filter-health publication surfaces + filter policy
suggestions v2 that have now landed.
