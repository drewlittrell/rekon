# Review Packet: Filter Policy / Configured Exclusions v1

Slice: P1.1 (Issue Adjudication), filter policy v1 slice.
Implements step 3 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order.

## CHANGES MADE

### `packages/kernel-findings/src/index.ts`

- New exported types:
  - `FindingFilterPolicyRule` — operator-supplied exclusion
    rule with `id`, `reason`, `evidence`, optional
    `confidence`, plus at least one matcher among
    `pathPattern`, `type`, `ruleId`, `severity`,
    `titleIncludes`, `descriptionIncludes`.
  - `FindingFilterPolicyValidationIssue` — shape used by the
    new validator (`policyIndex`, optional `policyId`, `code`,
    `message`, `path`).
  - `ApplyFindingFiltersOptions` — explicit type for the
    options argument of `applyFindingFilters`. Keeps the
    backwards-compatible inline-object call shape.
- `FilteredFinding` gains optional `policyId?: string`. The
  validator requires `source === "policy"` when `policyId` is
  set; structurally additive.
- `FindingFilterSummary` gains optional
  `byPolicy?: Record<string, number>`. Present only when the
  filter run loaded a non-empty policy set.
- `FilterMatch` (internal) gains optional `policyId?`.
- New internal helpers:
  - `matchPathPattern(pattern, filePath)` — deterministic
    glob (`*` per segment, `**` across segments, `?` per
    character), built via a regex with explicit `**` / `*` /
    `?` expansion and full metacharacter escaping.
  - `policyFilterMatch(finding, policy)` — evaluates a single
    policy against a finding; returns a `FilterMatch` or
    `null`. All specified matchers must match.
- `applyFindingFilters(input)` now:
  - Accepts `options.policies?: FindingFilterPolicyRule[]`.
  - Runs policies first, in declared order; the first match
    wins. If no policy matches, falls back to the built-in
    deterministic filter (`findBestFilterMatch`).
  - Emits `source: "policy"` + `policyId` when a policy
    matched; otherwise `source: "system"`.
  - Returns `policyUsage?: Record<string, number>` (always
    present when policies were supplied; pre-populated with
    `0` for every supplied policy id so unused policies are
    visible).
- New exported helper `validateFindingFilterPolicyRules(value)`
  that returns `{ rules, issues }`. Rules are populated for
  structurally valid entries; `issues` is sorted by
  `policyIndex` then `code` for deterministic output. The
  CLI's `rekon config validate` maps each issue into its
  `ConfigValidationIssue` shape.
- `summarizeFindingFilterReport(kept, filtered, policyUsage?)`
  now accepts an optional `policyUsage` map and emits
  `summary.byPolicy` (sorted by id) when non-empty.
- `createFindingFilterReport(input)` accepts an optional
  `policyUsage` field that forwards to the summary.
- `FindingFilterHealthSummary` gains `byPolicy?`,
  `policyFiltered`, and `unusedPolicies: string[]`.
- `buildFindingFilterHealth(input)` accepts an optional
  `policies: FindingFilterPolicyRule[]` argument to detect
  policies that matched zero findings even when the filter
  report's `byPolicy` doesn't list them (e.g., empty policy
  set on disk). Emits three new alerts when applicable:
  `policy-over-filtering`, `low-confidence-policy-filter`,
  `unused-policy-filter`. Alerts are sorted by `code` for
  stable output.
- `createFindingFilterHealthReport` forwards `policies` to
  `buildFindingFilterHealth`.

### `packages/runtime/src/index.ts`

- Imports `FindingFilterPolicyRule` from
  `@rekon/kernel-findings`.
- `BuildFindingFilterReportOptions` gains
  `policies?: FindingFilterPolicyRule[]`. The helper passes
  the rules through to `applyFindingFilters` and forwards the
  resulting `policyUsage` to `createFindingFilterReport`.
- `BuildFindingFilterHealthReportOptions` gains
  `policies?: FindingFilterPolicyRule[]`. Used both for the
  `unused-policy-filter` check and, when the
  `buildIfMissing` path runs, forwarded to the inner
  `buildFindingFilterReport` call so the freshly built filter
  report applies the same policies.

### `packages/cli/src/index.ts`

- Imports `FindingFilterPolicyRule` and
  `validateFindingFilterPolicyRules` from
  `@rekon/kernel-findings`.
- New helper `loadFindingFilterPolicies(root)` — reads
  `.rekon/config.json`, calls
  `validateFindingFilterPolicyRules`, and returns only the
  structurally valid rules. Missing / unparseable configs
  return `[]` so the filter path stays best-effort
  (operators run `rekon config validate` for a full
  diagnostic).
- `rekon findings filter` and `rekon findings filter-health`
  call `loadFindingFilterPolicies(root)` and forward the
  result to the runtime helpers; JSON output includes
  `policyFilters: <count>`.
- `rekon refresh` loads the policies once per invocation and
  forwards them to both the `findings.filter` and
  `findings.filter-health` steps.
- `validateConfig` now validates `findingFilters` when
  present, mapping each issue from
  `validateFindingFilterPolicyRules` into a
  `ConfigValidationIssue` (severity `"error"`).

### Tests

- New `tests/contract/finding-filter-policy.test.mjs` with
  **19 tests** (all passing) covering:
  1. `validateFindingFilterPolicyRules` accepts a valid ruleset.
  2. Rejects duplicate ids.
  3. Rejects entries with no matcher.
  4. Rejects absolute / `..` traversal `pathPattern`.
  5. Rejects unknown reasons.
  6. Policy `pathPattern` filters matching finding with
     `source: "policy"` + `policyId`.
  7. Policy `type` / `ruleId` / `severity` matching works.
  8. Policy `titleIncludes` / `descriptionIncludes` match
     case-insensitively.
  9. Policy filters run before built-ins (first matching
     policy wins).
  10. Built-in filters still work when no policies are
      supplied.
  11. `FindingFilterReport.summary.byPolicy` reports
      per-policy counts.
  12. `buildFindingFilterHealth` emits `byPolicy` /
      `policy-over-filtering` / `unused-policy-filter`.
  13. `buildFindingFilterHealth` emits
      `low-confidence-policy-filter`.
  14. `rekon config validate` accepts a valid
      `findingFilters` block.
  15. `rekon config validate` rejects duplicate ids and
      missing matchers.
  16. `rekon findings filter` reads
      `.rekon/config.json findingFilters` and writes a
      policy-aware report (with on-disk inspection of the
      filtered entry).
  17. Policy-filtered findings are excluded from
      `FindingLifecycleReport`, `IssueAdjudicationReport`,
      and `CoherencyDelta`; raw `FindingReport` retains
      them.
  18. `rekon findings filter-health` surfaces `byPolicy`
      and emits `unused-policy-filter`.
  19. `artifacts validate` remains clean after a
      policy-aware filter + filter-health + lifecycle +
      adjudication + coherency run.
- Full suite: **502 passed / 1 skipped / 0 failed**.

### Docs

- `docs/artifacts/finding-filter-report.md` — added "Shape"
  updates for `policyId` + `summary.byPolicy`; new
  "Configured Exclusion Policies" section; refreshed
  "What This Is Not".
- `docs/artifacts/finding-filter-health-report.md` — extended
  "Shape" with the three new summary fields; added the three
  new alerts to the v1 alerts table; refreshed
  "What This Is Not".
- `docs/concepts/finding-filters.md` — added "Configured
  Exclusion Policies" section above the deterministic-rules
  table; updated the `explicit-exclusion` and
  `policy-exception` rows; refreshed "What This Is Not".
- `docs/concepts/refresh.md` — `findings.filter` /
  `findings.filter-health` step descriptions extended to
  mention policy loading and the new alerts.
- `docs/strategy/issue-governance-architecture-decision.md`
  — Implementation Order item 3 flipped from "next slice" to
  "shipped" with full description; Open Questions resolved
  the "configurable filters via `.rekon/config.json`" entry.
- `docs/strategy/classic-subsystem-purpose-map.md` —
  subsystem 6 row updated; next-slice column now
  "Filter health / issue adjudication surfaces in
  publications".
- `docs/strategy/classic-behavior-roadmap.md` — new
  "Filter policy / configured exclusions v1" entry under
  P1.1 with full behavioral description.
- `docs/strategy/classic-guarantee-regression-plan.md` —
  new "Filter policy / configured exclusions v1" (shipped)
  entry pinned by the new 19-test contract.
- `docs/strategy/roadmap.md` — new bullet under the alpha
  spine for the filter policy v1 slice.
- `CHANGELOG.md` — detailed entry at the top of
  `0.1.0-alpha.1`.

Review packet: `.rekon-dev/review-packets/finding-filter-policy-v1.md` (this file).

## PUBLIC API CHANGES

`@rekon/kernel-findings`:
- New exported types: `FindingFilterPolicyRule`,
  `FindingFilterPolicyValidationIssue`,
  `ApplyFindingFiltersOptions`.
- New exported helper: `validateFindingFilterPolicyRules`.
- `applyFindingFilters` signature extended additively to
  accept `options.policies?`; return type now includes the
  optional `policyUsage?` map.
- `summarizeFindingFilterReport` signature extended with an
  additive optional `policyUsage?` argument.
- `createFindingFilterReport` input gains optional
  `policyUsage?`.
- `createFindingFilterHealthReport` / `buildFindingFilterHealth`
  inputs gain optional `policies?`.
- `FilteredFinding` gains optional `policyId?`.
- `FindingFilterSummary` gains optional `byPolicy?`.
- `FindingFilterHealthSummary` gains optional `byPolicy?` +
  required `policyFiltered: number` and
  `unusedPolicies: string[]`. Existing artifacts on disk
  still validate because the new fields are additive on
  read; the validator accepts the absence of these new
  fields (the validator only checks shape on header /
  alerts / `summary.totalFiltered`). Newly-built reports
  always populate the new fields.

`@rekon/runtime`:
- `BuildFindingFilterReportOptions.policies?` (additive).
- `BuildFindingFilterHealthReportOptions.policies?` (additive).

`@rekon/cli`:
- `rekon findings filter` / `rekon findings filter-health`
  now load `.rekon/config.json findingFilters` and forward
  them; JSON output adds `policyFilters: <count>`.
- `rekon refresh` loads + forwards policies through both
  filter steps.
- `rekon config validate` now validates `findingFilters`
  and emits `finding-filter-*` issue codes.

No SDK API removal. No artifact registry change. No artifact
`schemaVersion` bump. No new capability role. No new CLI
subcommand. No version bump. No npm publish.

## PURPOSE PRESERVATION CHECK

Original problem: every repo has known exceptions, generated
areas, external code, test-only patterns, and policy-specific
exclusions. Built-in deterministic filters are not enough.
Without configured exclusions, teams either repeatedly see
known false positives or misuse `ignored` status to suppress
system / policy cases.

Classic shape: `services/IssueDetectionService.ts`,
`services/issues/issue-result-filters.ts`,
`services/issues/content-filters.ts`,
`services/issues/report-persistence.ts`, the classic
`issueExclude` config, the `filtered-issues.json` audit,
`services/issues/filter-health.ts`. Classic supports
configured issue exclusions / result filters and false-
positive filtering before producing the canonical governed
issue surface; filtered issues remain auditable through
filtered reports.

Rekon equivalent (this slice):
- `.rekon/config.json` accepts a `findingFilters` array.
- `FindingFilterReport` records every configured exclusion
  with `reason` / `evidence` / `policyId` / `confidence` /
  `source: "policy"`.
- Filtered findings remain in
  `FindingFilterReport.filteredFindings` with full payload.
- Lifecycle / adjudication / coherency continue to operate
  on `keptFindings` (already shipped in the filter-aware
  lifecycle slice).
- Operator statuses remain a separate concern in
  `FindingStatusLedger`.

What would mean we failed (and isn't the case):
- Configured exclusions silently drop findings →
  `filteredFindings` always retains the original
  `Finding` payload; tests 6, 16 assert on-disk shape.
- Configured exclusions mutate raw `FindingReport` → test
  17 reads the raw report from disk after refresh +
  filter and confirms the policy-filtered finding stays.
- `ignored` status used to represent policy filtering →
  the ADR and concept docs explicitly call this out; the
  filter pipeline never touches `FindingStatusLedger`.
- Teams cannot see which policy rule filtered a finding →
  every policy-filtered entry records `policyId`; the
  filter-health report exposes `byPolicy` counts.
- Broad config pattern filters too much without filter-
  health warning → test 12 asserts `policy-over-filtering`
  fires when policies suppress > 80 % of findings.
- Lifecycle / adjudication still include configured-
  filtered findings → test 17 walks lifecycle /
  adjudication / coherency and asserts the policy-filtered
  id is absent.

Regression: given `.rekon/config.json` with a
`legacy-src` `findingFilters` entry excluding
`src/legacy/**` and a `FindingReport` with one `legacy`
finding and one normal `ok` finding,
`FindingFilterReport.filteredFindings` contains `legacy`
with `source: "policy"`, `policyId: "legacy-src"`, the
configured reason / evidence / confidence;
`keptFindings` contains only `ok`; lifecycle /
adjudication / coherency exclude `legacy`; the raw
`FindingReport` is unchanged. All covered by tests 16 +
17.

## CODEBASE-INTEL ALIGNMENT

Classic capability / failure mode: configured issue
exclusions / result filters and filtered issue audit.

What Rekon keeps:
- configured filters happen before active governance
- filtered findings remain auditable
- filters carry `reason` / `evidence` / `confidence` /
  `policyId`
- operator status decisions remain separate
- filter health can warn on over-broad / unused / low-
  confidence policy filtering
- raw findings remain inspectable

What Rekon simplifies:
- simple config schema only
- deterministic path / type / ruleId / severity / title /
  description matching
- no `GraphOntologyValidator`
- no persistent exclusion list (no carry-forward across
  runs beyond what's on disk in `.rekon/config.json`)
- no semantic false-positive classifier
- no advanced filter policy language
- no external policy package yet

What Rekon does not port yet:
- full classic `issueExclude` behavior if richer than this
  schema
- graph / ontology validation
- persistent exclusion carry-forward
- content / AST-aware exclusions
- semantic false-positive classification
- advanced filter-health alerts beyond v1

How this advances migration:
- Completes the first configured filtering layer after the
  built-in deterministic filters and the filter-aware
  lifecycle.
- Prevents teams from misusing `ignored` status for
  policy / system exclusions.
- Moves Rekon closer to classic's canonical-governed-issues
  pipeline while keeping the ADR's product-extension
  boundary explicit.

## FILTER POLICY MODEL

Schema:

```ts
type FindingFilterPolicyRule = {
  id: string;
  reason: FindingFilterReason;
  evidence: string;
  confidence?: "high" | "medium" | "low";
  pathPattern?: string;
  type?: string;
  ruleId?: string;
  severity?: "critical" | "high" | "medium" | "low";
  titleIncludes?: string;
  descriptionIncludes?: string;
};
```

Path-pattern grammar (deterministic, internal — no glob
dependency added):
- `*` matches zero or more characters within a single path
  segment (does **not** cross `/`).
- `**` matches zero or more segments, including the
  surrounding `/` boundaries when followed by `/`.
- `?` matches exactly one non-`/` character.
- Regex metacharacters in the pattern are escaped; matching
  is case-sensitive (mirrors JS/TS path conventions).

Matching rules:
- A policy rule matches a finding when **every** specified
  matcher matches:
  - `pathPattern` matches if any `finding.files` entry
    matches the pattern.
  - `type` is an exact match against `finding.type`.
  - `ruleId` is an exact match against `finding.ruleId`.
  - `severity` is an exact match against `finding.severity`.
  - `titleIncludes` / `descriptionIncludes` are
    case-insensitive substring matches against
    `finding.title` / `finding.description`.
- A finding without any `files` cannot match a `pathPattern`
  matcher (no path to test against). Other matchers still
  apply.
- Default `confidence` when omitted from a rule is `medium`.

Ordering:
- Policy rules run **before** built-in deterministic
  filters, in declared order. The first matching policy
  wins. If no policy matches, the built-in filter
  (`findBestFilterMatch`) runs unchanged.

Audit shape:
- A policy hit records `source: "policy"` and
  `policyId: <rule.id>` on the `FilteredFinding`.
- The validator requires `policyId` to be paired with
  `source === "policy"`.

## CONFIG VALIDATION

`validateFindingFilterPolicyRules(value)` checks:

1. `findingFilters` must be an array when present
   (`finding-filters-not-array`).
2. Each entry must be an object
   (`finding-filter-not-object`).
3. `id` must be a non-empty string
   (`finding-filter-id-missing`) and unique
   (`finding-filter-id-duplicate`).
4. `reason` must be a known `FindingFilterReason`
   (`finding-filter-reason-invalid`).
5. `evidence` must be a non-empty string
   (`finding-filter-evidence-missing`).
6. `confidence` must be one of `high` / `medium` / `low`
   when present (`finding-filter-confidence-invalid`).
7. `severity` must be one of `critical` / `high` / `medium`
   / `low` when present
   (`finding-filter-severity-invalid`).
8. `pathPattern`, `type`, `ruleId`, `titleIncludes`,
   `descriptionIncludes` must be strings when present
   (`finding-filter-<field>-invalid`).
9. `pathPattern` must be project-relative — absolute paths
   (`finding-filter-path-pattern-absolute`) and `..`
   traversal (`finding-filter-path-pattern-traversal`) are
   rejected.
10. At least one matcher must be specified
    (`finding-filter-no-matcher`).

`rekon config validate` surfaces all of these as
`severity: "error"` issues. The CLI's
`loadFindingFilterPolicies` path is best-effort and silently
drops invalid entries so a malformed config does not break
`rekon findings filter` / `rekon refresh` — operators get a
full diagnostic from `rekon config validate`.

## FILTER HEALTH UPDATES

New summary fields:
- `summary.byPolicy?: Record<string, number>` — mirrors
  `FindingFilterReport.summary.byPolicy`.
- `summary.policyFiltered: number` — count of findings
  filtered with `source === "policy"`.
- `summary.unusedPolicies: string[]` — sorted ids of
  policies that matched zero findings.

New alerts (sorted by `code`):
- **`policy-over-filtering`** (severity `warning`) — fires
  when `policyFiltered / totalFindings > 0.8`. Example
  message: *"Configured policies suppressed 9 of 10 findings
  (90.0%). Review .rekon/config.json findingFilters for
  over-broad patterns."*
- **`low-confidence-policy-filter`** (severity `warning`) —
  fires when any policy-filtered entry has `confidence:
  "low"`.
- **`unused-policy-filter`** (severity `warning`) — fires
  when at least one configured policy id matched zero
  findings. Lists the unused ids in the message.

## TESTS / VERIFICATION

Tests:
- New `tests/contract/finding-filter-policy.test.mjs` (19
  tests, all passing).
- Full suite: **502 passed / 1 skipped / 0 failed**.

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

- `FindingReport` shape, writes, validation — never mutated;
  policies project over `Finding` objects in memory.
- Built-in deterministic filter rules (`generated-file` /
  `external-file` / `test-file` / `canary-file` /
  `content-filter`) — unchanged; policies layer above them.
- `FindingFilterReport.filteredFindings` shape — only
  additive `policyId` field.
- `FindingFilterReport.keptFindings` semantics — unchanged.
- `FindingFilterHealthReport.alerts` array shape — unchanged;
  three new `code` values added.
- `FindingStatusLedger` — operator status decisions remain
  separate; the filter pipeline never reads or writes it.
- `FindingLifecycleReport`, `IssueAdjudicationReport`,
  `CoherencyDelta`, publications, `resolve.issue` — none
  read `FindingFilterPolicyRule` directly. Their behavior
  reflects the filter projection (already shipped in
  filter-aware lifecycle).
- All capability manifests, permissions, dist contents,
  schemaVersion strings.
- `GraphOntologyValidator` port — explicitly deferred.
- Persistent exclusion lists across runs — deferred.
- `RefreshStepId` / CLI subcommand surface — unchanged.
- No version bump.
- No npm publish.

## RISKS / FOLLOW-UP

- Risk: the deterministic glob (`*` / `**` / `?`) is
  minimal. Operators expecting full extglob / brace
  expansion will hit the wall. Mitigation: the doc + the
  ADR call out the exact grammar; `rekon config validate`
  rejects absolute / traversal patterns up front so
  surprises are limited to "this pattern didn't match what
  I expected." Future work can introduce a richer pattern
  matcher behind the same `pathPattern` field.
- Risk: policies run before built-ins, so a deliberate
  `policy-exception` rule on a path that the built-in
  filter would otherwise suppress will override the
  built-in. This is the intended semantic (operator policy
  is explicit). Tests 9 + 16 pin it. Operators who only
  want to *add* exclusions on top of built-ins can simply
  pick non-overlapping `pathPattern` values.
- Risk: `loadFindingFilterPolicies` silently drops invalid
  entries so the filter path stays best-effort. Operators
  who want a hard fail run `rekon config validate`.
  Mitigation: the CLI smoke section + concept doc call out
  the expectation.
- Risk: `unused-policy-filter` fires for any zero-match
  policy, which can be noisy on a per-run basis (e.g., a
  policy reserved for a path that isn't built yet).
  Mitigation: alert is `warning` severity and explicit in
  its remediation text. Future work can add a
  `severity: "info"` or per-policy `allowZeroMatches: true`
  escape hatch.
- Risk: configured policies do not (yet) influence
  `FindingFilterReport.header.inputRefs`. The filter
  report cites the upstream `FindingReport` only; the
  config is implicitly the source of policy rules.
  Mitigation: the policy ids are recorded inline in
  `filteredFindings[].policyId` so the audit trail names
  every rule that fired; `rekon config validate` covers the
  config-level audit.
- Follow-up: filter health / issue adjudication surfaces in
  publications (next slice) — architecture summary + agent
  contract should render filter-health alerts and filtered
  counts so agents know when active governance is heavily
  filtered.
- Follow-up: persistent exclusion list (carry-forward
  across runs), richer policy language,
  `GraphOntologyValidator` port.

## NEXT STEP

Per the work order's closing section, the recommended next
slice is:

> Filter health / issue adjudication surfaces in publications

Purpose:
- `@rekon/capability-docs.architecture-summary` should
  render filter-health alerts and filtered counts inline.
- `@rekon/capability-docs.agent-contract` should surface
  the same so agents know when active governance is
  heavily filtered (and which policies dominate).
- Neither surface should bypass `FindingFilterReport` /
  `FindingFilterHealthReport`; both should read the
  artifacts only.

This is the clean follow-up after the ADR + filter audit
layer + filter-aware lifecycle + filter policy slices that
have now landed.
