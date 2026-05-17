# Finding Filters

Rekon's evaluator output is raw lint-style detection. Some
findings are valid governance signals and some are false
positives — for example, a finding that fires on a path under
`dist/`, `node_modules/`, or `tests/` is almost certainly not
something a human should triage. Without an explicit filter
layer, those false positives pollute lifecycle counts,
adjudication groups, the coherency rollup, and the remediation
queue.

`FindingFilterReport` is Rekon's auditable filter layer. It
preserves the classic codebase-intel guarantee that false
positives have a paper trail.

## Why Filtering Is Separate From Status

Operator status decisions (`accepted`, `ignored`, `resolved`)
live in `FindingStatusLedger` and reflect human judgment about a
finding's lifecycle. System / policy suppression of false
positives is a different concern: it answers "should this
finding ever have been an active governance signal?" and is
deterministic, not a judgment call.

Mixing the two is a mistake we explicitly avoid:

- A test-file false positive should never be marked `ignored`
  by a human just to remove it from the surface; instead, the
  filter layer should suppress it and the status ledger should
  stay empty.
- An accepted-risk finding should not be suppressed by a filter
  — it remains an active governance signal that the operator
  has decided to live with.

The
[issue governance architecture decision](../strategy/issue-governance-architecture-decision.md)
formalizes this split.

## Why It Exists

Classic codebase-intel proved the following for trustworthy
issue governance:

- False positives need an audit trail (reason, evidence,
  confidence).
- Filtered findings must remain inspectable so an operator can
  debug filters or recover a wrongly-suppressed finding.
- Coherency rollups should operate on governed (kept,
  adjudicated) findings rather than raw detector noise.

Rekon's prior shape covered the lifecycle / status / adjudication
side of that guarantee but did not yet have a filter layer.
`FindingFilterReport` fills that gap.

## Filter Pipeline

`buildFindingFilterReport`:

1. Reads the latest `FindingReport` (or a pinned report id).
2. Walks every file on every finding and finds the
   highest-priority filter match (see "Reasons" below).
3. Emits a `FindingFilterReport` artifact that:
   - lists every filtered finding with reason, evidence, file
     path, and confidence;
   - lists every kept finding so downstream consumers can opt
     in to the filtered projection;
   - cites the source `FindingReport` in `header.inputRefs`.

`buildFindingFilterHealthReport`:

1. Reads the latest `FindingFilterReport` (or builds one if
   missing).
2. Computes `filterRate`, `highConfidenceFiltered`,
   `lowConfidenceFiltered`, and the reason breakdown.
3. Emits a `FindingFilterHealthReport` with deterministic v1
   alerts (`high-filter-rate`, `low-confidence-filtered`).

Both artifacts live under the `findings/` category in
`.rekon/artifacts/`.

## Configured Exclusion Policies

Operators can extend the built-in deterministic filters with
project-specific exclusions via `.rekon/config.json`:

```json
{
  "findingFilters": [
    {
      "id": "generated-src",
      "reason": "generated-file",
      "evidence": "Generated source is excluded from active governance.",
      "pathPattern": "src/generated/**",
      "confidence": "high"
    },
    {
      "id": "legacy-module",
      "reason": "policy-exception",
      "evidence": "Legacy module is being deprecated; suppress until removal.",
      "pathPattern": "src/legacy/**",
      "type": "import_boundary.parent_relative_import",
      "confidence": "medium"
    }
  ]
}
```

Each entry requires `id`, `reason`, and `evidence`, plus at
least one matcher: `pathPattern`, `type`, `ruleId`, `severity`,
`titleIncludes`, or `descriptionIncludes`. Path patterns are
project-relative; absolute paths and `..` traversal are
rejected. Path matching supports a small deterministic glob
vocabulary: `*` matches a single path segment, `**` matches
zero or more segments, and `?` matches one character.

Policy rules run **before** built-in deterministic filters, in
declared order. The first matching policy wins. When a policy
matches, the filtered entry records:

- `source: "policy"`
- `policyId`: the rule's `id`
- `reason`: the rule's `reason`
- `evidence`: the rule's `evidence` string
- `confidence`: the rule's `confidence` (defaults to `medium`)

`rekon config validate` enforces the schema and rejects
duplicate ids, missing matchers, unknown reasons, and absolute
or traversal `pathPattern` values.

`FindingFilterReport.summary.byPolicy` reports the number of
findings each configured policy suppressed (including zero for
policies that never matched). `FindingFilterHealthReport` adds
three policy-aware alerts:

- `policy-over-filtering` — configured policies suppress more
  than 80 % of findings (review for over-broad patterns).
- `low-confidence-policy-filter` — at least one policy hit with
  `confidence: "low"`.
- `unused-policy-filter` — at least one configured policy
  matched zero findings (remove or refine the matcher).

The built-in deterministic rules below still run when no policy
matches a finding.

## Reasons

v1 ships deterministic, path-aware rules. There is no LLM,
semantic matching, or fuzzy matching. Priority order (strongest
first):

- **`generated-file`** — path segment is `dist`, `build`, or
  `generated`, or path contains `__generated__` or
  `.generated.`. Confidence: high.
- **`external-file`** — path segment is `node_modules`,
  `vendor`, or `third_party`. Confidence: high.
- **`test-file`** — path segment is `test`, `tests`,
  `__tests__`, or `__test__`, or filename ends with
  `.test.{ts,tsx,js,jsx,mjs,cjs}` or
  `.spec.{ts,tsx,js,jsx,mjs,cjs}`. Confidence: high.
- **`canary-file`** — path contains `canary`. Confidence: high.
- **`content-filter`** — finding text mentions "generated
  output" **and** file is in a generated path. Confidence:
  medium.
- **`explicit-exclusion`** / **`policy-exception`** — emitted
  by configured exclusion policies (see "Configured Exclusion
  Policies" above). Both reasons are operator-supplied via
  `.rekon/config.json` `findingFilters`.
- **`other`** — reserved escape hatch; not used by v1.

Findings with no `files` are kept by default (no rule has
anything to match against).

## Audit Guarantee

- `FindingReport` is **never** mutated by filtering.
- Filtered findings remain in
  `FindingFilterReport.filteredFindings` with the full original
  payload, so a future operator can review or recover them.
- The filter run timestamps each entry (`filteredAt`) and labels
  the source (`system` / `operator` / `policy`).
- `rekon artifacts freshness` marks the filter report `stale`
  when a newer `FindingReport` is written.

## Policy Fingerprint and Freshness

Each `FindingFilterReport` written by filter-policy-freshness
v2 carries an order-sensitive
`policyFingerprint: { digest, ruleCount, ruleIds }` of the
`findingFilters` policy set the run used. The CLI / publishers
compare this fingerprint against the current
`.rekon/config.json` `findingFilters` to detect drift:

- **fresh** — current config fingerprint matches the report
  fingerprint.
- **stale** — fingerprints diverge; the operator changed
  `findingFilters` after the filter run. Active governance
  (lifecycle / adjudication / coherency / publications) may be
  stale until `rekon refresh` rebuilds the filter chain.
- **missing** — no `FindingFilterReport` indexed yet. Run
  `rekon refresh` (or `rekon findings filter`).
- **unknown** — latest `FindingFilterReport` predates
  filter-policy-freshness v2. Run `rekon refresh` to regenerate
  a fingerprinted report.

`@rekon/capability-docs.architecture-summary` renders a
`## Finding Filter Policy Freshness` section with the status
and both fingerprints (current vs. report).
`@rekon/capability-docs.agent-contract` renders the same as a
`### Finding Filter Policy Freshness` subsection and adds a
`Do Not Do` reminder against acting on stale active
governance after a policy change.

`rekon findings filter-policy apply` now reports
`currentPolicyFingerprint`, `projectedPolicyFingerprint`
(dry-run), and `policyFingerprint` (actual apply) so operators
can confirm what `rekon refresh` should next see in the
`FindingFilterReport`.

## Health Alerts

v1 ships two alerts:

- **`high-filter-rate`** — fires when `filterRate > 0.8`.
  Inspect which reasons dominate `byReason` — a 90 %+ filter
  rate usually means the evaluator is mis-targeting paths.
- **`low-confidence-filtered`** — fires when any filtered
  finding has confidence `low`. v1 deterministic rules emit
  `high` or `medium`; this alert exists so a future expansion
  surfaces low-confidence suppression for review.

The alert list is empty when filtering looks healthy.

## What This Is Not

- **Not an operator status decision.** Status decisions belong
  in `FindingStatusLedger`.
- **Not a delete.** Filtered findings are preserved with audit
  evidence in `FindingFilterReport.filteredFindings`.
- **Not LLM / fuzzy / semantic.** v1 is purely deterministic
  path / content rules. Configured exclusion policies are
  deterministic matchers (path glob / type / ruleId / severity /
  title / description substring); operators describe the
  intent, not the model.
- **Not a graph / ontology validator.** The classic
  `GraphOntologyValidator` is deferred.
- **Consumed by lifecycle / adjudication / coherency.**
  `FindingLifecycleReport` reads `keptFindings` from the latest
  current filter report; `IssueAdjudicationReport` groups those
  kept findings; `CoherencyDelta` rolls up only governed kept
  issues. Filtered findings remain auditable in
  `FindingFilterReport.filteredFindings` and do not flow into
  active governance. When the latest filter report does not
  cite the latest `FindingReport`, the lifecycle transparently
  falls back to the raw report.
- **Surfaced in publications.**
  `@rekon/capability-docs.architecture-summary` renders a
  `## Finding Filter Health` section (kept / filtered counts,
  filter rate, per-reason / per-policy tables, full alert
  list, audit pointer to `filteredFindings`).
  `@rekon/capability-docs.agent-contract` renders a
  `### Finding Filter Health` subsection under
  `Active Governance State` that visibly warns when alerts
  exist and instructs agents to inspect
  `FindingFilterReport.filteredFindings` before claiming the
  repo has no active issues. The agent contract's `Do Not Do`
  list adds a clean-active-governance reminder.
- **Promotable to durable policy via suggestions.** Repeated
  filtered findings can be turned into project-specific
  `findingFilters` rules via
  [`FindingFilterPolicySuggestionReport`](../artifacts/finding-filter-policy-suggestion-report.md).
  `rekon findings filter-policy suggest` generates the
  suggestions (deterministic, no LLM, no fuzzy matching).
  `rekon findings filter-policy list` reads the latest
  report. `rekon findings filter-policy apply <id>` is the
  **only** command that mutates `.rekon/config.json`. It
  refuses low-confidence rules, broad `pathPattern` rules
  (`*`, `**`, `src/**`, etc.), and duplicate ids without
  `--force`; with `--force` a duplicate id **replaces** the
  existing rule (it never appends a second). Run with
  `--dry-run` (alias `--preview`) first to inspect the
  exact proposed rule, structured config diff, and
  validation result without writing anything. See
  [finding-filter-policy-suggestions.md](finding-filter-policy-suggestions.md).
- **Visible in publications.** The architecture summary
  renders a `## Finding Filter Policy Suggestions` section
  with a per-suggestion table; the agent contract renders a
  `### Finding Filter Policy Suggestions` subsection with an
  advisory blockquote and `Do Not Do` reminders so agents
  never apply suggestions on their own. Both surfaces show
  a stale banner when the suggestion report cites filter
  reports older than the latest indexed `FindingFilterReport`.

## CLI Surface

```sh
rekon findings filter --root <repo> --json
rekon findings filter-health --root <repo> --json
```

`rekon refresh` runs both steps automatically between
`evaluate` and `findings.lifecycle`. `rekon artifacts validate`
and `rekon artifacts freshness` cover both artifact types.

## Cross-References

- [Issue governance architecture decision](../strategy/issue-governance-architecture-decision.md)
- [FindingFilterReport artifact](../artifacts/finding-filter-report.md)
- [FindingFilterHealthReport artifact](../artifacts/finding-filter-health-report.md)
- [FindingReport artifact](../artifacts/finding-report.md)
- [Finding lifecycle concept](finding-lifecycle.md)
- [Issue adjudication concept](issue-adjudication.md)
- [Coherency delta concept](coherency-delta.md)
- [Refresh pipeline](refresh.md)
