# Finding Filter Policy Status

`rekon findings filter-policy status` is Rekon's read-only
operator workflow surface for configured `findingFilters`
policies. It combines the operator's current policy set
with the latest `FindingFilterReport`,
`FindingFilterHealthReport`, and
`FindingFilterPolicySuggestionReport` and returns a single
structured JSON document the operator can inspect before
trusting active governance.

The command is **read-only**. `.rekon/config.json` is never
mutated. Mutation still happens only through explicit
`rekon findings filter-policy apply`.

## Why It Exists

Configured filter policies are useful only when they are
auditable. Without one operator surface, operators have to
combine:

- the policy list in `.rekon/config.json`,
- per-policy usage counts in `FindingFilterReport.summary.byPolicy`,
- alerts in `FindingFilterHealthReport.alerts`,
- fingerprint drift checks (current config vs. report fingerprint),
- advisory candidates in `FindingFilterPolicySuggestionReport`,

to understand whether a policy is healthy, unused, dominant,
low-confidence, broad, or stale. `status` is that surface.

## CLI Surface

```sh
rekon findings filter-policy status [--policy <id>] [--warnings-only] [--unused-only] [--root <repo>] [--json]
```

Flags:

- **`--policy <id>`** — narrow the rendered list to a single
  policy id. Summary counts still reflect the whole policy
  set.
- **`--warnings-only`** — narrow the rendered list to
  policies with at least one warning.
- **`--unused-only`** — narrow the rendered list to policies
  that suppressed zero findings.

The flags affect rendering only; the structured summary
counts are always computed against the full policy set so
operators can see both the global state and the narrowed
view.

## Output Shape

```ts
type FindingFilterPolicyStatusResult = {
  configPath: string;
  currentPolicyFingerprint: FindingFilterPolicyFingerprint;
  reportPolicyFingerprint?: FindingFilterPolicyFingerprint;
  freshness: {
    status: "fresh" | "stale" | "missing-report" | "unknown";
    message: string;
    recommendedCommand?: string;
  };
  summary: {
    totalPolicies: number;
    usedPolicies: number;
    unusedPolicies: number;
    dominantPolicies: number;
    lowConfidencePolicies: number;
    broadPolicies: number;
    policiesWithWarnings: number;
    suggestionsAvailable: number;
  };
  policies: Array<{
    id: string;
    reason: FindingFilterReason;
    confidence?: FindingFilterConfidence;
    matchers: { pathPattern?; type?; ruleId?; severity?; titleIncludes?; descriptionIncludes? };
    usageCount: number;
    usageRate: number;
    filteredFindingIds: string[];
    warnings: Array<{ code; severity; message }>;
    recommendedActions: string[];
    isUnused: boolean;
    isDominant: boolean;
    isLowConfidence: boolean;
    isBroadPattern: boolean;
  }>;
  suggestions: Array<{
    id: string;
    confidence: "high" | "medium" | "low";
    reason: string;
    affectedFindingCount: number;
    dryRunCommand: string;
    applyCommand: string;
  }>;
  globalWarnings: Array<{ code; severity; message }>;
};
```

The CLI additionally emits a `renderedPolicyCount` field at
the top level so the operator can see how many policies the
flag filtering left in the `policies` array (vs. the full
`summary.totalPolicies`).

## Per-Policy Warnings

Deterministic checks. A policy may trigger more than one.

- **`unused-policy`** — `usageCount === 0`. The policy
  matched no findings in the latest filter run.
- **`dominant-policy`** — the policy id matches
  `FindingFilterHealthReport.summary.dominantPolicy.policyId`,
  OR `usageRate >= 0.5` AND `totalFindings >= 5`. One
  policy is doing more than half the suppression.
- **`low-confidence-policy`** — `rule.confidence === "low"`,
  OR a `low-confidence-policy-filter` health alert exists
  AND the policy is the dominant policy. Operators should
  tighten the matcher or raise the confidence.
- **`broad-policy`** — `isBroadFindingFilterPolicyRule(rule)`
  returns `true` (the same predicate the apply-safety v2
  slice uses). Operators should narrow `pathPattern` /
  `type` / `ruleId` / `severity` / `titleIncludes` /
  `descriptionIncludes`.
- **`stale-policy-fingerprint`** — propagated to every
  policy when the current vs. report fingerprint digests
  diverge. Mirrors the global freshness state so each
  policy entry carries the actionable recommendation
  inline.

`recommendedActions` for each policy is a deterministic
list derived from the warnings.

## Global Warnings

- **`missing-filter-report`** — no `FindingFilterReport`
  indexed yet. Policy usage counts are unavailable.
  Recommended command: `rekon refresh`.
- **`missing-filter-health`** — `FindingFilterReport`
  exists but `FindingFilterHealthReport` does not. Alerts
  (dominance / unused / low-confidence) are unavailable.

## Suggestions

If a `FindingFilterPolicySuggestionReport` is indexed, the
status response includes each suggestion as an advisory
record:

```ts
{
  id: "policy-suggestion:...",
  confidence: "high" | "medium" | "low",
  reason: "repeated-filtered-path" | ...,
  affectedFindingCount: number,
  dryRunCommand: "rekon findings filter-policy apply <id> --dry-run --json",
  applyCommand: "rekon findings filter-policy apply <id> --json",
}
```

Low-confidence suggestions append `--force` to both the
`dryRunCommand` and `applyCommand`. The status command
**never** applies suggestions on its own initiative — it
just renders the operator command.

## Freshness

`freshness.status` mirrors the global signal from the
filter-policy-freshness v2 slice:

- **`fresh`** — current config fingerprint matches the
  fingerprint stamped on the latest `FindingFilterReport`.
- **`stale`** — fingerprints diverge; the operator changed
  `findingFilters` after the latest filter run. Recommended
  command: `rekon refresh`.
- **`missing-report`** — no `FindingFilterReport`
  indexed. Recommended command: `rekon refresh`.
- **`unknown`** — the latest `FindingFilterReport`
  predates filter-policy-freshness v2 and has no
  `policyFingerprint`. Recommended command: `rekon
  refresh` (to regenerate a fingerprinted report).

When stale, every policy entry also receives the
`stale-policy-fingerprint` warning so the recommendation
travels with each policy in the rendered list.

## Pure Helper

`summarizeFindingFilterPolicyStatus(input)` is exported
from `@rekon/kernel-findings`. It is a pure deterministic
function — no filesystem access, no mutation. The CLI
performs the config + artifact reads, then hands everything
to the helper. Reusable by future surfaces that want the
same per-policy report.

## What This Is Not

- **Not a config mutator.** `apply` remains the only
  command that writes `.rekon/config.json`.
- **Not a status decision.** Operator `accepted` /
  `ignored` / `resolved` decisions remain in
  `FindingStatusLedger`.
- **Not a watcher / daemon.** One invocation reads, renders,
  and exits.
- **Not LLM / semantic / fuzzy.** All warnings come from
  deterministic structural checks.
- **Not a dashboard.** v1 ships the JSON surface only;
  rendering markdown / dashboard surfaces is deferred.

## Cross-References

- [Finding filter policy suggestions](finding-filter-policy-suggestions.md)
- [Finding filters](finding-filters.md)
- [FindingFilterReport artifact](../artifacts/finding-filter-report.md)
- [FindingFilterHealthReport artifact](../artifacts/finding-filter-health-report.md)
- [FindingFilterPolicySuggestionReport artifact](../artifacts/finding-filter-policy-suggestion-report.md)
- [Issue governance ADR](../strategy/issue-governance-architecture-decision.md)
