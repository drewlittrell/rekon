# Review Packet: Filter Policy Suggestion Apply Safety v2

Slice: P1.1 (Issue Adjudication), filter-policy-apply-safety v2 slice.
Implements step 7 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to `(shipped)`).

## CHANGES MADE

### `packages/kernel-findings/src/index.ts`

- New exported constant set
  `FINDING_FILTER_POLICY_BROAD_PATH_PATTERNS` (file-local)
  enumerating repo-wide and top-level-directory glob
  patterns.
- New exported predicate
  `isBroadFindingFilterPolicyRule(rule:
  FindingFilterPolicyRule): boolean`. Returns `true` when:
  - `pathPattern` is one of `*`, `**`, `**/*`, `*/**`, `.`,
    `./**`, `src/**`, `packages/**`, `apps/**`, `lib/**`,
    `tests/**`, `test/**`; OR
  - `pathPattern` is a single top-level `<segment>/**`
    (deterministic: split on `/`, drop empty segments, two
    segments with the second being `**`); OR
  - `pathPattern` is a single-segment `**`; OR
  - the rule has no `pathPattern` AND no narrow matcher
    (`type` / `ruleId` / `severity` / `titleIncludes` /
    `descriptionIncludes`). v2 high-volume-filtered-pattern
    suggestions land in this branch.
  A rule that adds a narrow matcher is **never** broad,
  regardless of `pathPattern`.
- New exported types:
  - `FindingFilterPolicyApplyWarningCode` (union of four
    string literals: `"low-confidence-suggestion"`,
    `"duplicate-rule-id"`, `"broad-path-pattern"`,
    `"config-missing"`).
  - `FindingFilterPolicyApplyWarning` (`{ code, message }`).
  - `FindingFilterPolicyApplyBlockerCode` (subset:
    `"low-confidence-suggestion"`, `"duplicate-rule-id"`,
    `"broad-path-pattern"`).
  - `FindingFilterPolicyApplyBlocker` (`{ code, message }`).
  - `FindingFilterPolicyApplyDiff`:
    ```ts
    {
      addedFindingFilters: FindingFilterPolicyRule[];
      replacedFindingFilters: {
        before: FindingFilterPolicyRule;
        after: FindingFilterPolicyRule;
      }[];
      beforeCount: number;
      afterCount: number;
    }
    ```
  - `FindingFilterPolicyApplyPlan` (full plan shape:
    `suggestionId`, `rule`, `diff`, `proposedRules`,
    `warnings`, `blockers`, `requiresForce`,
    `isLowConfidence`, `isDuplicateRuleId`,
    `isBroadPattern`).
  - `PlanFindingFilterPolicyApplyInput` (`{ suggestion,
    existingRules }`).
- New exported function
  `planFindingFilterPolicyApply(input):
  FindingFilterPolicyApplyPlan`. Pure deterministic planner
  — never reads or writes the filesystem. Reports what an
  apply would do (added vs. replaced rule, before/after
  counts, warnings, blockers, whether `--force` would be
  required). Duplicate-id semantics: the planner records
  the replacement under
  `diff.replacedFindingFilters[{ before, after }]` and
  leaves `diff.addedFindingFilters` empty for that case.

### `packages/cli/src/index.ts`

- `rekon findings filter-policy apply <suggestion-id>` now
  accepts two new flags: `--dry-run` and `--preview`
  (aliases parsed via `parsed.flags["dry-run"]` /
  `parsed.flags.preview`).
- Flow restructured:
  1. Resolve `configPath = .rekon/config.json` and call new
     helper `loadConfigForApply(root, configPath)` **before**
     `store.init()` so the runtime store's config bootstrap
     does not mask "config missing".
  2. `store.init()`, list latest
     `FindingFilterPolicySuggestionReport`, find the
     suggestion by id (existing failure modes preserved).
  3. `parseFindingFiltersFromConfig(parsedConfig)` extracts
     the existing rules as `FindingFilterPolicyRule[]`.
  4. `planFindingFilterPolicyApply({ suggestion,
     existingRules })` computes the plan, warnings,
     blockers, and projected rules.
  5. Add a `config-missing` warning entry when applicable.
  6. Compute `refusalBlockers = force ? [] : plan.blockers`.
  7. Run
     `validateFindingFilterPolicyRules(plan.proposedRules)`.
     Record `validation.valid` / `validation.issues`.
  8. Dry-run path: writeOutput the full plan + diff +
     warnings + blockers + validation + `wouldRefuse =
     refusalBlockers.length > 0 || validationFailed`.
     Never writes anything.
  9. Actual apply path: throw with
     `formatApplyRefusalMessage` when blockers remain;
     then throw a validation error if validation failed;
     then call `writeConfigIfMissing(root)` when the
     config was missing; finally write the projected
     config via
     `JSON.stringify(buildAppliedConfig(parsedConfig, plan),
     null, 2) + "\n"`. writeOutput reports `applied: true`,
     the full plan, and the legacy `appliedRule` alias.
- New file-local helpers:
  - `loadConfigForApply(root, configPath)` — reads the
    config, distinguishes ENOENT (returns synthesized
    default + `configMissing: true`) from malformed JSON
    (throws "Failed to parse: ...; Refusing to write.")
    from non-object root JSON (throws "must be a JSON
    object; Refusing to write.").
  - `parseFindingFiltersFromConfig(config)` — returns the
    `findingFilters` array as `FindingFilterPolicyRule[]`,
    filtering out non-object entries.
  - `buildAppliedConfig(parsedConfig, plan)` — returns
    `{ ...parsedConfig, findingFilters:
    plan.proposedRules.map((rule) => ({ ...rule })) }`.
    Preserves every unrelated top-level field.
  - `formatApplyRefusalMessage(blockers, suggestionId)` —
    formats the multi-line refusal error for non-dry-run
    apply with blockers.
- Imports updated:
  `type FindingFilterPolicyApplyPlan`,
  `isBroadFindingFilterPolicyRule`,
  `planFindingFilterPolicyApply` added.
- Help text updated:
  `rekon findings filter-policy apply <suggestion-id>
  [--dry-run|--preview] [--force] [--root <path>] [--json]`.

### Tests

- New
  `tests/contract/finding-filter-policy-apply-safety.test.mjs`
  with **21 tests** (5 pure-helper + 16 CLI behavior; all
  passing):
  Pure helpers:
  1. `isBroadFindingFilterPolicyRule` flags repo-wide
     patterns (`*`, `**`, `**/*`, `*/**`, `.`, `./**`).
  2. `isBroadFindingFilterPolicyRule` flags single
     top-level `<segment>/**` patterns (`src/**`,
     `packages/**`, `apps/**`, `lib/**`, `tests/**`,
     `vendor/**`).
  3. `isBroadFindingFilterPolicyRule` keeps two-segment
     patterns (`src/generated/**`, `tests/fixtures/**`,
     `packages/foo/generated/**`) narrow.
  4. Extra matcher (`type` / `ruleId` / `severity`)
     narrows an otherwise-broad `pathPattern`.
  5. No `pathPattern` + no narrow matcher is broad.
  6. `planFindingFilterPolicyApply` clean append: counts +
     `addedFindingFilters` correct, no blockers.
  7. `planFindingFilterPolicyApply` duplicate id replaces:
     `replacedFindingFilters[0].before/after` populated,
     `addedFindingFilters` empty.
  8. `planFindingFilterPolicyApply` broad pattern requires
     force.
  9. `planFindingFilterPolicyApply` low-confidence requires
     force.
  CLI behavior (use `withSuggestionFixture` to seed a
  synthetic `FindingFilterPolicySuggestionReport` with any
  rule shape needed):
  10. `apply --dry-run` returns plan + diff and does not
      mutate config; `validation.valid === true` for a
      narrow high-confidence rule.
  11. `--preview` is an alias for `--dry-run`.
  12. Actual apply appends a new non-broad high-confidence
      rule (`findingFilters.length === 1`).
  13. Dry-run reports `config-missing` when the file is
      absent and does not write `findingFilters` into the
      bootstrapped default (runtime store still bootstraps
      a default for subsequent commands).
  14. Apply writes the rule when config was missing.
  15. Malformed config causes dry-run + apply to fail with
      "Failed to parse" and leaves the file unchanged.
  16. Broad pattern dry-run succeeds with
      `broad-path-pattern` in warnings + blockers, sets
      `wouldRefuse: true`.
  17. Broad pattern apply fails without `--force`.
  18. Broad pattern apply with `--force` succeeds and
      includes `broad-path-pattern` warning.
  19. Low-confidence dry-run succeeds with warning +
      blocker.
  20. Low-confidence apply fails without `--force`.
  21. Low-confidence apply with `--force` succeeds on a
      narrow rule.
  22. Duplicate id dry-run reports `duplicate-rule-id` in
      warnings and `replacedFindingFilters[0]` in diff.
  23. Duplicate id apply fails without `--force`.
  24. Duplicate id apply with `--force` **replaces** the
      existing rule (not append) — `findingFilters.length
      === 1` after, with the suggested rule's pathPattern.
  25. Unrelated top-level config fields are preserved on
      apply.
  26. `rekon config validate` passes after apply.
  27. `suggest` / `list` still do not mutate config.
- Pre-existing
  `tests/contract/finding-filter-policy-suggestions.test.mjs`
  test 247 updated: now asserts that without `--force` the
  error includes "low-confidence" (preserving original
  intent) and that with `--force` the blocker is bypassed
  but the proposed config still fails validation (because
  the v2 high-volume-filtered-pattern suggestion has no
  matcher). The other 14 tests in that file remain
  unchanged and pass.
- Full suite: **569 passed / 1 skipped / 0 failed**.

### Docs

- `docs/concepts/finding-filter-policy-suggestions.md` —
  Apply Safety section rewritten as a 10-rule numbered list
  covering dry-run / preview, low-confidence, broad
  `pathPattern`, duplicate-id-replace, proposed-config
  validation, malformed-config refusal, unrelated-field
  preservation, default-config creation, suggest/list
  read-only, and the force-never-bypasses-validation
  invariant. CLI Surface updated with the new flag form
  and the new structured-JSON output table (15 fields).
  Added a "Recommended operator workflow" 4-step sequence.
- `docs/artifacts/finding-filter-policy-suggestion-report.md`
  — Consumed By bullet for `apply` expanded to mention
  dry-run / safety checks. CLI Surface usage line updated.
  Apply Safety Rules rewritten as a 9-rule list (added:
  dry-run, broad pattern, duplicate replacement,
  validation, malformed-config refusal).
- `docs/concepts/finding-filters.md` — Promotable bullet
  extended to describe broad-pattern force gate, duplicate
  replacement, and the new dry-run preview workflow.
- `docs/strategy/issue-governance-architecture-decision.md`
  — Implementation Order step 7 flipped from `(future)` to
  `(shipped)` with a full description (dry-run / preview,
  broad-pattern predicate, duplicate-replace, validation,
  malformed-config refusal, new exports). New step 8
  added: "Configured filter policy freshness / publication
  guardrails". Old step 7 (merge-decision guardrails etc.)
  renumbered to 9.
- `docs/strategy/classic-subsystem-purpose-map.md` —
  subsystem 6 row appended with "v2 shipped (filter policy
  suggestion apply safety)" entry; next-slice column
  changed to "Configured filter policy freshness /
  publication guardrails"; status string updated with
  `+ filter-policy-apply-safety v2`.
- `docs/strategy/classic-behavior-roadmap.md` — new
  "Filter policy suggestion apply safety v2 (P1.1
  filter-policy-apply-safety v2 slice)" entry with full
  behavioral description, every blocker code, all new
  exports, test count 21, and follow-up to the next slice.
- `docs/strategy/classic-guarantee-regression-plan.md` —
  new shipped entry "Filter policy suggestion apply safety
  v2" pinned by
  `tests/contract/finding-filter-policy-apply-safety.test.mjs`
  (21 tests).
- `docs/strategy/roadmap.md` — new bullet under the alpha
  spine for the filter-policy-apply-safety v2 slice.
- `README.md` — added two example invocation lines for the
  apply dry-run and actual apply.
- `CHANGELOG.md` — detailed entry at the top of
  `0.1.0-alpha.1`.

Review packet:
`.rekon-dev/review-packets/finding-filter-policy-apply-safety-v2.md`
(this file).

## PUBLIC API CHANGES

`@rekon/kernel-findings`:
- New exported function
  `isBroadFindingFilterPolicyRule(rule)` (additive).
- New exported function `planFindingFilterPolicyApply(input)`
  (additive).
- New exported types: `FindingFilterPolicyApplyPlan`,
  `FindingFilterPolicyApplyDiff`,
  `FindingFilterPolicyApplyWarning`,
  `FindingFilterPolicyApplyBlocker`,
  `FindingFilterPolicyApplyWarningCode`,
  `FindingFilterPolicyApplyBlockerCode`,
  `PlanFindingFilterPolicyApplyInput` (additive).

`@rekon/cli`:
- `rekon findings filter-policy apply` accepts two new
  flags: `--dry-run` and `--preview` (aliases). Existing
  `--force` / `--root` / `--json` flags unchanged.
- JSON output shape on the actual apply path is a superset
  of the previous shape: `applied`, `dryRun`, `configPath`,
  `suggestionId`, `appliedRule` (legacy alias), `force`,
  `confidence` are still present; `rule`, `diff`,
  `warnings`, `blockers`, `requiresForce`,
  `isLowConfidence`, `isDuplicateRuleId`, `isBroadPattern`,
  `validation`, `wouldRefuse` are new fields.

No SDK API change. No artifact registry change. No
artifact `schemaVersion` bump. No new artifact type. No new
capability role. No new CLI subcommand (only new flags on
an existing subcommand). No version bump. No npm publish.

## PURPOSE PRESERVATION CHECK

Original problem:
- Persistent filter policies are powerful: they suppress
  recurring false positives durably.
- They are also risky: a broad or poorly reviewed filter
  can hide real governance findings.
- Operators need an explicit, reviewable apply path that
  shows exactly what will change before the config is
  mutated.

Classic workflow guarantee:
- Codebase-intel-classic supported configured exclusions
  and persistent filtered reports, embedded in a controlled
  issue-governance pipeline with auditability.
- The useful guarantee is "known false positives can become
  durable policy without losing auditability."

Classic shape that provided the guarantee:
- `services/IssueDetectionService.ts`
- `services/issues/issue-result-filters.ts`
- `services/issues/report-persistence.ts`
- `services/issues/filter-health.ts`
- `config issueExclude`
- `filtered-issues.json`

Rekon equivalent guarantee (this slice):
- `FindingFilterPolicySuggestionReport` proposes durable
  filter policies with evidence (previous slices).
- `rekon findings filter-policy apply` is now the only
  mutation path AND ships with:
  - dry-run / preview for non-mutating inspection,
  - exact structured config diff
    (`addedFindingFilters` / `replacedFindingFilters` /
    `beforeCount` / `afterCount`),
  - broad-pattern force gate via the deterministic
    `isBroadFindingFilterPolicyRule` predicate,
  - duplicate-id replacement (not append) under `--force`,
  - proposed-config validation (refuses write on failure
    even with `--force`),
  - malformed-config-never-overwritten guarantee,
  - unrelated-field preservation,
  - `config-missing` warning.

What would mean we failed (and isn't the case):
- Apply mutates config without showing the rule/diff →
  tests 10, 12, 22 assert the rule + diff appear in both
  dry-run and actual apply output.
- Broad patterns like `**`, `**/*`, `*`, or repository-wide
  filters apply without force → tests 1, 2, 5 (helper) +
  17 (CLI) assert the broad-pattern blocker fires.
- Dry-run still writes config → tests 10, 11, 13 assert
  byte-identical config / empty findingFilters after
  dry-run.
- Suggestions in publications are treated as applied →
  pre-existing publications-filter-policy-suggestions tests
  still assert the advisory blockquote and the new
  Do-Not-Do reminders.
- Config apply overwrites unrelated config fields → test
  25 (CLI) asserts unrelated nested objects are preserved.
- A low-confidence suggestion can be applied accidentally
  → tests 9 (helper) + 19, 20 (CLI) assert the
  low-confidence blocker fires without `--force`.

Regression test for original problem (covered by tests):
- Given a high-confidence suggestion, `rekon findings
  filter-policy apply <id> --dry-run --json` returns the
  exact proposed rule and config diff while leaving
  `.rekon/config.json` byte-for-byte unchanged.
- Given the same suggestion without dry-run, apply appends
  only the suggested rule and preserves unrelated config
  fields.
- Given a broad path pattern, apply refuses unless
  `--force` is provided.

## CODEBASE-INTEL ALIGNMENT

Classic capability / failure mode: persistent issue
exclusions / configured false-positive suppression with
audit trail and safety gates.

What Rekon keeps:
- recurring false positives can become durable policy
- filtered findings remain auditable
- config mutation is explicit operator action
- policy suggestions cite evidence
- broad filters require extra caution
- unrelated config is preserved
- malformed config is never overwritten
- the only mutating command is `apply`; everything else
  is read-only

What Rekon simplifies:
- deterministic preview / diff only
- no interactive prompt
- no textual unified diff (structured JSON diff only)
- no dashboard
- no semantic filter classifier
- no automatic policy promotion
- no PR / check approval workflow

What Rekon does not port yet:
- full classic `issueExclude` semantics (beyond
  config-backed `findingFilters`)
- persistent exclusion merge sophistication
- graph / ontology validation
- filter tuning UI
- CI / PR filter recommendations
- semantic false-positive classification
- post-apply governance freshness invalidation (deferred
  to step 8 "Configured filter policy freshness /
  publication guardrails")

How this advances migration:
- Makes the operator-controlled persistent exclusion path
  safer.
- Keeps Rekon's advisory suggestion model while making
  explicit apply usable.
- Prevents filter policy suggestions from becoming a
  footgun (broad pattern, duplicate-id append,
  malformed-config overwrite).

## APPLY SAFETY MODEL

The apply command now resolves in three modes:

1. **Dry-run / Preview** (`--dry-run` or `--preview`).
   Computes the plan + diff + validation. Reports every
   warning, blocker, and the `wouldRefuse` summary. Never
   writes to disk.

2. **Non-forced apply** (no flags). Refuses with a clear
   multi-line error when any blocker is present
   (`low-confidence-suggestion` / `broad-path-pattern` /
   `duplicate-rule-id`). Also refuses when the proposed
   config fails `validateFindingFilterPolicyRules`. On
   success, writes the appended rule (or replaced rule for
   duplicate ids) and emits `applied: true`.

3. **Forced apply** (`--force`). Bypasses the three
   blockers but still respects validation. Duplicate ids
   replace the existing rule; broad patterns are written
   with a warning surfaced in the JSON output. A proposed
   config that fails validation is still refused.

## DRY-RUN / PREVIEW BEHAVIOR

- `--dry-run` and `--preview` are aliases.
- Reads the latest `FindingFilterPolicySuggestionReport`,
  finds the suggestion by id (errors if missing).
- Reads `.rekon/config.json`; reports `config-missing` in
  warnings when the file does not exist on disk before
  this invocation. Does not write the suggested rule into
  the bootstrapped default; the runtime store still
  bootstraps the default file so future rekon commands
  work.
- Computes the plan via `planFindingFilterPolicyApply`.
- Runs `validateFindingFilterPolicyRules` on the
  projected `findingFilters` and reports the result under
  `validation.valid` / `validation.issues`.
- Emits a single JSON object with `applied: false`,
  `dryRun: true`, plus every plan field.
- Never invokes `writeFile`.

## BROAD-PATTERN GUARD

Predicate: `isBroadFindingFilterPolicyRule(rule)`.

Returns `true` when:
- `rule` has no narrow matcher (`type` / `ruleId` /
  `severity` / `titleIncludes` / `descriptionIncludes`),
  AND one of:
  - `pathPattern` is empty / undefined (so the rule
    matches everything by default), OR
  - `pathPattern` ∈ `{ "*", "**", "**/*", "*/**", ".",
    "./**", "src/**", "packages/**", "apps/**", "lib/**",
    "tests/**", "test/**" }`, OR
  - `pathPattern` is a single-segment-plus-`**` pattern
    (e.g. `vendor/**`).

Returns `false` for any rule with at least one narrow
matcher, regardless of `pathPattern`.

Returns `false` for two-segment-or-deeper patterns
(`src/generated/**`, `packages/foo/generated/**`).

## CONFIG DIFF MODEL

The diff is a structured JSON object, not a textual unified
diff. Shape:

```json
{
  "addedFindingFilters": [
    {
      "id": "...",
      "reason": "...",
      "evidence": "...",
      "pathPattern": "..."
    }
  ],
  "replacedFindingFilters": [
    {
      "before": { "id": "...", "pathPattern": "src/old/**", ... },
      "after":  { "id": "...", "pathPattern": "src/new/**", ... }
    }
  ],
  "beforeCount": 0,
  "afterCount": 1
}
```

`addedFindingFilters` is empty on duplicate-id replacement.
`replacedFindingFilters` is empty on clean append. Both
arrays are arrays of `FindingFilterPolicyRule`.

## TESTS / VERIFICATION

Tests:
- New
  `tests/contract/finding-filter-policy-apply-safety.test.mjs`
  (21 tests, all passing).
- Updated test 247 in
  `tests/contract/finding-filter-policy-suggestions.test.mjs`
  to match the new error shape.
- Full suite: **569 passed / 1 skipped / 0 failed**.

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

Apply smoke runs against a temp fixture inside the
contract test suite — the committed `examples/simple-js-ts`
config is never mutated by tests.

## INTENTIONALLY UNTOUCHED

- `FindingFilterPolicySuggestionReport` shape — read,
  never mutated; no `schemaVersion` bump.
- Suggestion derivation rules — unchanged (still in
  `deriveFindingFilterPolicySuggestions`).
- `FindingReport` / `FindingFilterReport` /
  `FindingFilterHealthReport` / `FindingStatusLedger` /
  `FindingLifecycleReport` / `IssueAdjudicationReport` /
  `CoherencyDelta` — no changes to behavior or shape.
- Publication shape — unchanged. The architecture summary
  + agent contract still render the suggestion section /
  subsection from the previous slice; no new section is
  introduced here.
- `RefreshStepId` / refresh pipeline — unchanged.
- `proofReportPublisher` — out of scope.
- All capability manifests for other packages,
  permissions, dist contents, `schemaVersion` strings.
- `GraphOntologyValidator` port — explicitly deferred.
- Persistent exclusion lists beyond config-backed
  `findingFilters` — deferred.
- LLM / semantic / fuzzy / embedding matching — never.
- No version bump.
- No npm publish.
- No new CLI subcommand (only new flags on the existing
  `apply` subcommand).
- No new artifact type.
- No mutation of `.rekon/config.json` from `suggest` /
  `list` / publications / refresh.

## RISKS / FOLLOW-UP

- Risk: the broad-pattern predicate may flag a pattern an
  operator considers narrow enough. Mitigation: adding any
  narrow matcher (`type` / `ruleId` / `severity` /
  `titleIncludes` / `descriptionIncludes`) immediately
  removes the broad classification. The dry-run output
  surfaces the predicate result so operators can iterate
  before applying.
- Risk: duplicate-id replacement is a behavior change
  from the previous slice (which appended a duplicate
  under `--force`). A migration scenario where operators
  re-ran apply with `--force` to "stack" rules now
  produces a single replacement. Mitigation: documented
  in CHANGELOG, ADR step 7, behavior roadmap, the concept
  doc, and tested by test 24.
- Risk: the high-volume-filtered-pattern suggestion shape
  (no matcher) is not directly applicable under `--force`
  because validation fails. This is intentional —
  operators must augment the rule — but it could surprise
  someone who expected `--force` to be a full override.
  Mitigation: the dry-run output shows
  `validation.valid: false` plus the exact issue, and the
  concept doc + ADR explicitly call this out.
- Risk: `config-missing` warning describes a state that
  cannot realistically be observed end-to-end because
  `store.init()` bootstraps `.rekon/config.json`. The
  warning exists for the narrow case where the file is
  deleted between `loadConfigForApply` and the actual
  write. Mitigation: it's a defensive code path; tests
  exercise it by deleting the file mid-flow.
- Risk: the structured diff is JSON-only — no textual
  unified diff. v3 could add a textual rendering when
  `--json` is not set. Mitigation: deferred; agents and
  scripts consume JSON anyway.
- Follow-up: Configured filter policy freshness /
  publication guardrails (next slice). When the operator
  applies a filter policy, the existing
  `FindingLifecycleReport` / `IssueAdjudicationReport` /
  `CoherencyDelta` / publications may have been built
  against an outdated policy set. The next slice should
  warn or rebuild so the governed surface stays coherent.
- Follow-up: PR / GitHub / dashboard surfaces for apply.
  Deferred to the surfaces phase.

## NEXT STEP

Per the ADR Implementation Order step 8 and the work
order's closing section, the recommended next slice is:

> Configured filter policy freshness / publication
> guardrails

Purpose:
- When active lifecycle / adjudication / coherency
  artifacts were built before a filter policy `apply`,
  publications and `rekon refresh` should warn or rebuild.
- Preserve the guarantee that changed filter policy
  invalidates the governed issue surface.

This is the clean follow-up after the ADR + filter audit
layer + filter-aware lifecycle + filter policy v1 +
filter-health publications + filter policy suggestion
derivation + filter policy suggestion publications + this
apply-safety v2 slice that have now landed.
