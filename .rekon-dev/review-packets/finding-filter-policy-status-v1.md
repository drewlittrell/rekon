# Review Packet: Filter Policy Operator Workflow Polish (`rekon findings filter-policy status` v1)

Slice: P1.1 (Issue Adjudication), filter-policy-status v1 slice.
Implements step 11 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to `(shipped)`).

## CHANGES MADE

### `packages/kernel-findings/src/index.ts`

- New exported types describing the status report shape:
  - `FindingFilterPolicyStatusFreshness` — union of
    `"fresh" | "stale" | "missing-report" | "unknown"`.
  - `FindingFilterPolicyStatusWarning` — `{ code, severity,
    message }`.
  - `FindingFilterPolicyStatusEntry` — per-policy record
    (id, reason, optional confidence, matchers, `usageCount`,
    `usageRate`, `filteredFindingIds`, `warnings`,
    `recommendedActions`, plus boolean convenience flags).
  - `FindingFilterPolicyStatusSuggestion` —
    `{ id, confidence, reason, affectedFindingCount,
    dryRunCommand, applyCommand }`.
  - `FindingFilterPolicyStatusSummary` — global counts
    (`totalPolicies`, `usedPolicies`, `unusedPolicies`,
    `dominantPolicies`, `lowConfidencePolicies`,
    `broadPolicies`, `policiesWithWarnings`,
    `suggestionsAvailable`).
  - `FindingFilterPolicyStatusResult` — top-level wrapper
    (`configPath`, `currentPolicyFingerprint`,
    `reportPolicyFingerprint?`, `freshness`, `summary`,
    `policies[]`, `suggestions[]`, `globalWarnings[]`).
  - `SummarizeFindingFilterPolicyStatusInput` — input shape
    accepting `configPath`, `policies`, optional
    `filterReport` / `healthReport` / `suggestionReport`.
- New exported pure function
  `summarizeFindingFilterPolicyStatus(input)`. No filesystem
  access; no mutation. Implements deterministic per-policy
  warnings (`unused-policy`, `dominant-policy`,
  `low-confidence-policy`, `broad-policy`,
  `stale-policy-fingerprint`), global warnings
  (`missing-filter-report`, `missing-filter-health`),
  freshness state, and suggestion command rendering
  (low-confidence suggestions append `--force` to both
  `dryRunCommand` and `applyCommand`). Reuses existing
  exports: `fingerprintFindingFilterPolicies` for the
  current-policy fingerprint and
  `isBroadFindingFilterPolicyRule` for the broad-pattern
  predicate.

### `packages/cli/src/index.ts`

- New subcommand:
  ```
  rekon findings filter-policy status \
    [--policy <id>] [--warnings-only] [--unused-only] \
    [--root <path>] [--json]
  ```
  Behavior:
  - Reads `.rekon/config.json` directly to confirm it parses
    as a JSON object; on `ENOENT` continues with zero
    policies; on malformed JSON throws with `"Failed to
    parse"` (the file is left byte-identical).
  - Calls the existing best-effort
    `loadFindingFilterPolicies(root)` to extract structurally
    valid `findingFilters` entries.
  - Reads the latest `FindingFilterReport`,
    `FindingFilterHealthReport`, and
    `FindingFilterPolicySuggestionReport` via a new
    file-local helper
    `readLatestArtifactOrUndefined<T>(store, artifactType)`.
  - Calls `summarizeFindingFilterPolicyStatus` and emits
    the full result.
  - Applies optional flag narrowing **after** the helper
    returns so `summary` counts always reflect the full
    policy set. Emits an additional `renderedPolicyCount`
    field so callers can tell how many entries the flags
    left.
- New file-local helper
  `readLatestArtifactOrUndefined<T>(store, artifactType)`
  generalizes the read-the-latest pattern used by the new
  command and reusable by future read-only surfaces.
- Imports added from `@rekon/kernel-findings`:
  `FindingFilterHealthReport`, `FindingFilterReport`,
  `summarizeFindingFilterPolicyStatus`.
- Help text updated to include the new subcommand and
  flags.

### Tests

- New `tests/contract/finding-filter-policy-status.test.mjs`
  with **18 tests** (all passing):
  Pure helpers (11):
  1. `summarizeFindingFilterPolicyStatus` reports
     total / used / unused policy counts.
  2. Surfaces current + report policy fingerprints.
  3. Freshness `fresh` when fingerprints match.
  4. Freshness `stale` when fingerprints differ; per-policy
     `stale-policy-fingerprint` warnings propagate;
     recommended command is `rekon refresh`.
  5. Unused policy gets `unused-policy` warning + `isUnused
     === true`.
  6. Dominant policy gets `dominant-policy` warning +
     `isDominant === true`.
  7. Low-confidence policy gets `low-confidence-policy`
     warning + `isLowConfidence === true`.
  8. Broad policy gets `broad-policy` warning +
     `isBroadPattern === true`.
  9. Missing `FindingFilterReport` → freshness
     `missing-report` + `missing-filter-report` global
     warning.
  10. Filter report present but health missing →
      `missing-filter-health` global warning.
  11. Suggestions render `dryRunCommand` + `applyCommand`;
      low-confidence suggestions include `--force` in both.
  CLI behavior (7):
  12. Command runs and does not mutate `.rekon/config.json`.
  13. Malformed config fails with `"Failed to parse"` and
      leaves the file byte-identical.
  14. `--policy <id>` narrows `policies[]` while leaving
      `summary` global.
  15. `--warnings-only` narrows to entries with at least
      one warning.
  16. `--unused-only` narrows to entries with
      `isUnused === true`.
  17. Existing `rekon findings filter-policy list` and
      `suggest` behavior unchanged.
  18. `rekon artifacts validate` stays clean after the
      status run.
- Full suite: **647 passed / 1 skipped / 0 failed**.

### Docs

- New `docs/concepts/finding-filter-policy-status.md`
  documents the CLI surface, output shape, per-policy /
  global warning codes, freshness model, suggestion
  rendering, and read-only invariant.
- `docs/concepts/finding-filter-policy-suggestions.md` —
  CLI pipeline list and CLI Surface section updated to
  include `status`.
- `docs/concepts/finding-filters.md` — new "Auditable via
  `rekon findings filter-policy status`" bullet under
  the Configured Exclusion Policies section.
- `docs/artifacts/finding-filter-health-report.md` —
  Consumed By gains an entry for the new command.
- `docs/strategy/issue-governance-architecture-decision.md`
  — Implementation Order step 11 flipped from `(future)`
  to `(shipped)`; new steps 12 ("Filter policy explicit
  disable / remove workflow") and 13
  ("`GraphOntologyValidator`-lite parity audit"); old step
  12 renumbered to 14.
- Four strategy docs (subsystem-purpose-map,
  behavior-roadmap, guarantee-regression-plan, roadmap).
- README adds an example invocation line.
- CHANGELOG. Review packet:
  `.rekon-dev/review-packets/finding-filter-policy-status-v1.md`
  (this file).

## PUBLIC API CHANGES

`@rekon/kernel-findings`:
- New exported types: `FindingFilterPolicyStatusFreshness`,
  `FindingFilterPolicyStatusWarning`,
  `FindingFilterPolicyStatusEntry`,
  `FindingFilterPolicyStatusSuggestion`,
  `FindingFilterPolicyStatusSummary`,
  `FindingFilterPolicyStatusResult`,
  `SummarizeFindingFilterPolicyStatusInput` (all additive).
- New exported function
  `summarizeFindingFilterPolicyStatus(input)` (additive,
  pure deterministic).

`@rekon/cli`:
- New subcommand `rekon findings filter-policy status`.
  No changes to existing `suggest` / `list` / `apply`
  subcommands.

No SDK API change. No artifact registry change. No artifact
`schemaVersion` bump. No new artifact type. No new
capability role. No new write permission. No version bump.
No npm publish.

## PURPOSE PRESERVATION CHECK

Original problem:
- Configured filter policies can suppress recurring false
  positives, but they can also hide real findings if they
  become stale, unused, over-broad, or low-confidence.
- Operators need one place to inspect policy health before
  trusting active governance.

Classic workflow guarantee:
- codebase-intel-classic kept filtered issues auditable
  and supported persistent configured exclusions.
- The useful guarantee was not simply that exclusions
  exist; it was that exclusion behavior could be audited
  and corrected.

Classic shape that provided the guarantee:
- `services/IssueDetectionService.ts`
- `services/issues/issue-result-filters.ts`
- `services/issues/filter-health.ts`
- `services/issues/report-persistence.ts`
- `config issueExclude`
- `filtered-issues.json`
- filter-health report

Rekon equivalent (this slice):
- `rekon findings filter-policy status` combines configured
  policies + the latest filter report + the latest health
  report + the latest suggestion report into one
  structured operator surface.
- Per-policy warnings call out unused / dominant /
  low-confidence / broad / stale policies with deterministic
  rules.
- Global warnings call out missing filter / health
  reports.
- Suggestions ride along as advisory commands that the
  operator can copy-paste.
- The command is read-only; `apply` remains the only
  mutating command.

What would mean we failed (and isn't the case):
- Operators still need to inspect several artifacts
  manually to understand policy health → tests 1, 11, 12,
  14, 15, 16 assert the single command surfaces the data
  classic spread across multiple reports.
- Unused policies are hidden → tests 1, 5, 16 assert
  `isUnused` + the `unused-policy` warning + `--unused-only`
  narrowing all work.
- Stale policy fingerprints are hidden → tests 3, 4
  assert `fresh` / `stale` propagation and per-policy
  `stale-policy-fingerprint` warnings.
- A dominant policy suppresses most findings without a
  clear callout → test 6 asserts `dominant-policy`
  warning + `isDominant === true`.
- The command mutates config instead of reporting status
  → test 12 asserts byte-identical config before / after;
  test 13 asserts malformed config is not overwritten.
- The command implies active governance is trustworthy
  when policy health is questionable → warnings + global
  warnings + freshness recommend `rekon refresh` whenever
  applicable, with explicit `recommendedActions[]` per
  policy.

Regression test for the original problem (test 12 + the
helper tests it builds on):
- Given a config with active, unused, dominant, and
  low-confidence policies plus a
  `FindingFilterHealthReport`, `rekon findings
  filter-policy status --json` reports each policy with
  usage, warnings, current fingerprint, report
  fingerprint, stale/fresh state, and recommended
  actions without mutating config.

## CODEBASE-INTEL ALIGNMENT

Classic capability / failure mode: persistent configured
exclusions and filter-health auditability.

What Rekon keeps:
- configured filters are auditable policy
- policy usage counts matter
- unused policies should be visible
- stale policy fingerprints should be visible
- over-broad / dominant policies require attention
- config mutation remains explicit

What Rekon simplifies:
- CLI status report only — no dashboard, no PR / check
  annotations, no policy tuning UI
- no automatic cleanup or removal
- deterministic warnings only (no LLM, no semantic, no
  embedding)
- `GraphOntologyValidator` port still deferred

What Rekon does not port yet:
- full persistent exclusion-list lifecycle
- policy removal / disable workflow (deferred to step 12
  of the ADR)
- policy tuning UI
- CI / PR filter-health checks
- graph / ontology false-positive validation

How this advances migration:
- Makes configured filtering operationally safe by giving
  operators one place to inspect every health signal.
- Turns filter-health diagnostics v2 into an
  operator-facing workflow.
- Sets up future explicit `disable` / `remove` commands
  by giving them a clean read-only counterpart.

## POLICY STATUS MODEL

Top-level shape:
```ts
{
  configPath: string,
  currentPolicyFingerprint: FindingFilterPolicyFingerprint,
  reportPolicyFingerprint?: FindingFilterPolicyFingerprint,
  freshness: { status, message, recommendedCommand? },
  summary: { ... 8 counts ... },
  policies: [ ... per-policy entries ... ],
  suggestions: [ ... advisory commands ... ],
  globalWarnings: [ ... ],
}
```

Per-policy entry:
```ts
{
  id, reason, confidence?,
  matchers: { pathPattern?, type?, ruleId?, severity?, titleIncludes?, descriptionIncludes? },
  usageCount, usageRate, filteredFindingIds[],
  warnings: [ { code, severity, message } ],
  recommendedActions: string[],
  isUnused, isDominant, isLowConfidence, isBroadPattern,
}
```

CLI-specific tail field:
- `renderedPolicyCount` — how many entries the flag
  filtering left in the `policies` array. Always equal to
  `summary.totalPolicies` when no flags are passed.

## WARNINGS / RECOMMENDED ACTIONS

Per-policy warning codes (deterministic):

| Code | Trigger |
| --- | --- |
| `unused-policy` | `usageCount === 0` |
| `dominant-policy` | id matches `healthReport.summary.dominantPolicy.policyId`, OR `usageRate >= 0.5` AND `totalFindings >= 5` |
| `low-confidence-policy` | `rule.confidence === "low"`, OR a `low-confidence-policy-filter` health alert exists AND the policy is the dominant policy |
| `broad-policy` | `isBroadFindingFilterPolicyRule(rule)` returns `true` |
| `stale-policy-fingerprint` | current vs. report fingerprint digests diverge (propagated to every policy) |

Global warning codes:

| Code | Trigger |
| --- | --- |
| `missing-filter-report` | no `FindingFilterReport` indexed |
| `missing-filter-health` | filter report present, health report absent |

Per-policy `recommendedActions[]` is a deterministic list
derived from the warning set, in a stable order:
1. Remove this policy if it stays unused.
2. Inspect `FindingFilterReport.filteredFindings` before
   trusting active governance.
3. Tighten the matcher / review the evidence (for
   low-confidence policies).
4. Narrow the matcher (for broad policies).
5. Run `rekon refresh` (for stale fingerprint).

All warning severities are `"warning"` (no `"error"`) — the
status command's job is to report, not block.

## TESTS / VERIFICATION

Tests:
- New
  `tests/contract/finding-filter-policy-status.test.mjs`
  (18 tests, all passing).
- Full suite: **647 passed / 1 skipped / 0 failed**.

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
- `node packages/cli/dist/index.js findings filter-policy status --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js findings filter-policy suggest --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js findings filter-policy list --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts freshness --root examples/simple-js-ts --json`

## INTENTIONALLY UNTOUCHED

- `FindingFilterReport`, `FindingFilterHealthReport`,
  `FindingFilterPolicySuggestionReport`,
  `FindingFilterPolicyRule` — shapes unchanged; only
  read by the new command.
- `FindingReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, `CoherencyDelta`,
  `FindingStatusLedger`, `IssueMergeDecisionLedger` — no
  reads, no writes.
- `applyFindingFilters`, `applyFindingContentFilters`,
  `applyFindingResultFilters`, `buildFindingFilterReport`,
  `buildFindingFilterHealth`,
  `deriveFindingFilterPolicySuggestions`,
  `planFindingFilterPolicyApply` — unchanged.
- `rekon findings filter-policy suggest` / `list` /
  `apply` — shape and behavior unchanged.
- Architecture summary / agent contract / proof
  publishers — no shape change, no consumer of the new
  helper yet.
- `RefreshStepId` / refresh pipeline — unchanged.
- `validateArtifactFreshness` — unchanged. Policy-status
  freshness is report-local, not part of the generic
  freshness validator.
- All capability manifests for other packages,
  permissions, dist contents, `schemaVersion` strings.
- `GraphOntologyValidator` port — explicitly deferred.
- LLM / semantic / fuzzy / embedding matching — never.
- No version bump. No npm publish. No branch.

## RISKS / FOLLOW-UP

- Risk: the per-policy `dominant-policy` check fires both
  when the health report explicitly names the policy AND
  when `usageRate >= 0.5` with `totalFindings >= 5`. The
  two conditions can disagree when health is stale.
  Mitigation: stale runs surface a
  `stale-policy-fingerprint` warning that points operators
  back to `rekon refresh`, which re-aligns the two checks.
- Risk: when the filter report exists but `byPolicy` is
  empty (the filter run didn't fire any policy matches),
  `usageCount` is `0` for every configured policy and
  every policy gets the `unused-policy` warning. This is
  the right behavior but can be noisy when the operator
  just added a policy and hasn't refreshed yet.
  Mitigation: the freshness state (`stale` /
  `missing-report`) already prompts a refresh, so the
  noisy warning resolves on the next run.
- Risk: the `--policy <id>` flag silently filters to zero
  results when the id doesn't match any configured policy.
  v2 could add an explicit "policy id not found" error.
  Mitigation: the structured response makes the empty
  list obvious; `summary.totalPolicies` still reflects
  the global count.
- Risk: 18 tests + a new CLI subcommand add surface area
  to maintain. The pure helper is the bulk of the logic
  and is fully covered by 11 deterministic tests.
- Risk: the helper takes a synchronous snapshot of three
  reports plus the config. A long-running operator
  workflow that mutates config between the
  `status` read and a follow-up `apply` could see drift —
  but that's the operator's responsibility, and the
  freshness check on subsequent `apply` already
  surfaces the same drift.
- Follow-up: filter policy explicit disable / remove
  workflow (ADR step 12) — safe, explicit config
  mutation; dry-run / diff first; complement to the
  read-only `status` surface this slice ships.
- Follow-up: `GraphOntologyValidator`-lite parity audit
  (ADR step 13) — decision memo before any
  implementation. The next major classic gap once the
  filtering stack is operational.
- Follow-up: PR / GitHub / dashboard surfaces for
  policy status. Deferred to the surfaces phase.

## NEXT STEP

Per the ADR Implementation Order and the work order's
"Next Step After This Batch", the recommended next slice
is:

> `GraphOntologyValidator`-lite parity audit

Purpose:
- Identify which classic graph / ontology false-positive
  checks are worth reinterpreting in Rekon.
- Decision memo only — no implementation until the memo
  lands.

This is the clean follow-up: the filtering stack is now
operationally safe (policy / content / result / built-in
filters, health diagnostics, apply safety, fingerprint
freshness, and now an operator workflow surface). The
next major classic gap is graph / ontology-informed
false-positive validation, and the right next move is a
scoped audit before any implementation.
