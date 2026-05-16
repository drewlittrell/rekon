# FindingFilterPolicySuggestionReport

## Purpose

`FindingFilterPolicySuggestionReport` is the advisory artifact
Rekon emits when repeated `FindingFilterReport` runs surface
patterns that should be promoted to durable
`findingFilters` policies. It records each candidate rule
with reason, confidence, rationale, affected finding ids /
paths / types, and evidence refs back to the upstream filter
reports.

Suggestions are **advisory**. `rekon findings filter-policy
suggest` and `rekon findings filter-policy list` never mutate
`.rekon/config.json`. Only `rekon findings filter-policy
apply <suggestion-id>` appends a suggested rule to the
config, and only after the safety checks documented below.

This artifact preserves the classic codebase-intel persistent
exclusion behavior in a Rekon-native form: filtered findings
remain auditable in `FindingFilterReport`, recurring patterns
surface explicitly here, and operators decide whether to
promote each one. See the
[issue governance architecture decision](../strategy/issue-governance-architecture-decision.md)
for the layered model.

## Produced By

- `@rekon/runtime.buildFindingFilterPolicySuggestionReport`
  (exposed via `rekon findings filter-policy suggest`). Reads
  the latest N `FindingFilterReport` artifacts (default 5),
  derives suggestions deterministically, and writes the
  resulting report to the `findings` category.

## Consumed By

- `rekon findings filter-policy list` returns the latest
  report verbatim.
- `rekon findings filter-policy apply <id>` looks up the
  suggestion by id, runs the safety checks (dry-run /
  preview, broad-pattern force guard, duplicate-id replace,
  proposed-config validation), and writes the suggested
  rule to `.rekon/config.json` `findingFilters` when not in
  `--dry-run` mode.
- `@rekon/capability-docs.architecture-summary` renders a
  `## Finding Filter Policy Suggestions` section sourced
  from this artifact, including a per-suggestion table, the
  `--force` requirement for low-confidence suggestions, the
  explicit
  `rekon findings filter-policy apply <suggestion-id>`
  pointer, and a stale banner when the report cites filter
  reports older than the latest indexed one.
- `@rekon/capability-docs.agent-contract` renders a
  `### Finding Filter Policy Suggestions` subsection that
  warns suggestions are advisory and adds two `Do Not Do`
  reminders against applying suggestions without operator
  approval or treating them as already-applied config.
- Operators / agents auditing whether recurring filtering
  should become durable policy.

## Required Header Fields

All standard `ArtifactHeader` fields. `producer.id` =
`@rekon/runtime.findings`. `inputRefs` cite every
`FindingFilterReport` the suggestion derivation folded in
(default: the latest 5 by `writtenAt`).

## Shape

```ts
type FindingFilterPolicySuggestionReason =
  | "repeated-filtered-path"
  | "repeated-filtered-type"
  | "repeated-filtered-policy-gap"
  | "high-volume-filtered-pattern";

type FindingFilterPolicySuggestion = {
  id: string;
  reason: FindingFilterPolicySuggestionReason;
  suggestedRule: FindingFilterPolicyRule;
  confidence: "high" | "medium" | "low";
  rationale: string;
  affectedFindingIds: string[];
  affectedPaths: string[];
  affectedTypes: string[];
  sourceFilterReportIds: string[];
  evidence: ArtifactRef[];
};

type FindingFilterPolicySuggestionReport = {
  header: ArtifactHeader;
  summary: {
    totalSuggestions: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    byReason: Record<string, number>;
  };
  suggestions: FindingFilterPolicySuggestion[];
};
```

Suggestion ids use a deterministic shape:
`policy-suggestion:<reason>:<hash>` where the hash is derived
from the matched dimension (pathPattern / type / reason) plus
the rule's reason. Rule ids use `suggested-<hash>`. These ids
remain stable across runs over the same inputs so operators
can reference them safely.

## Suggestion Rules

Pure, deterministic — no LLM / fuzzy / embedding matching.

| Reason | Trigger | Confidence |
| --- | --- | --- |
| `repeated-filtered-policy-gap` | ≥ 3 built-in-filtered findings share a first-two-segment path prefix AND no existing `findingFilters` rule covers that pattern | high |
| `repeated-filtered-path` | ≥ 2 filtered findings share a first-two-segment path prefix AND no existing rule covers that pattern AND no `policy-gap` suggestion was emitted for the same pattern | high (≥ 3 findings) / medium (= 2) |
| `repeated-filtered-type` | ≥ 3 filtered findings share `finding.type` AND no existing rule covers that type | medium |
| `high-volume-filtered-pattern` | one `FilteredFinding.reason` accounts for > 80 % of filtered findings AND the bucket has ≥ 5 findings | low (review prompt; no `pathPattern`) |

`repeated-filtered-policy-gap` is computed first so it always
wins over `repeated-filtered-path` for the same pathPattern —
the gap version carries strictly more information (it tells
the operator a built-in filter is doing the work today).

Path-prefix heuristic uses the first two path segments
(`src/generated/foo.ts`, `src/generated/bar.ts` →
`src/generated/**`). Single-segment paths use that one
segment (`generated/x.ts` → `generated/**`).

## CLI Surface

```sh
rekon findings filter-policy suggest [--recent-limit <n>] [--root <repo>] [--json]
rekon findings filter-policy list [--root <repo>] [--json]
rekon findings filter-policy apply <suggestion-id> [--dry-run|--preview] [--force] [--root <repo>] [--json]
```

- `suggest` reads the latest N filter reports (default 5,
  configurable via `--recent-limit`), runs the deterministic
  derivation, and writes a `FindingFilterPolicySuggestionReport`.
  Never mutates the config.
- `list` reads the latest indexed
  `FindingFilterPolicySuggestionReport`. When nothing is
  indexed, returns a friendly empty payload with a hint to
  run `suggest`.
- `apply <id> --dry-run` (alias `--preview`) computes the
  proposed rule and a structured config diff, validates the
  projected `findingFilters`, surfaces every warning /
  blocker / validation issue, and exits **without writing**.
  Recommended before every real apply.
- `apply <id>` (without `--dry-run`) looks up the suggestion
  and writes its `suggestedRule` into
  `.rekon/config.json` `findingFilters`. Refuses (non-zero
  exit) when the suggestion is low-confidence, when the
  rule's `pathPattern` is broad, or when an existing rule
  shares the suggested id — each gated by `--force`. With
  `--force`, a duplicate id **replaces** the existing rule
  (not append). Preserves every other field in the config.
  Creates a default config file if one doesn't exist yet.
  Validates the projected `findingFilters` and refuses to
  write when validation fails (even with `--force`).

## Apply Safety Rules

1. **Dry-run / preview is non-mutating.** `--dry-run` and
   `--preview` are aliases. They never touch the filesystem
   beyond reading and report the full plan + warnings +
   blockers + validation result.
2. **Low-confidence requires `--force`.** v2 only emits
   `high-volume-filtered-pattern` at low confidence; that
   rule deliberately omits a `pathPattern` so it cannot be
   applied directly — operators must narrow the rule first.
3. **Broad `pathPattern` requires `--force`.** A rule is
   broad when its `pathPattern` is `*`, `**`, `**/*`,
   `*/**`, `.`, `./**`, or a single top-level directory
   (`src/**`, `packages/**`, `tests/**`, etc.) and the rule
   adds no narrower matcher (`type`, `ruleId`, `severity`,
   `titleIncludes`, `descriptionIncludes`). Two segments or
   more (`src/generated/**`) is not broad.
4. **Duplicate rule id requires `--force` and replaces the
   existing rule.** With `--force`, the existing rule is
   replaced, not duplicated. The diff records this as
   `replacedFindingFilters[].before / .after`.
5. **Proposed config is validated.** Both dry-run and apply
   run `validateFindingFilterPolicyRules` against the
   projected `findingFilters`. Validation failures refuse
   the write — `--force` does not bypass validation.
6. **Malformed `.rekon/config.json` is never overwritten.**
   When the file exists but cannot be parsed as a JSON
   object, both dry-run and apply fail with a clear
   "Failed to parse" error and leave the file unchanged.
7. **Preserve unrelated config fields.** Only
   `findingFilters` is mutated; every other top-level key is
   carried through unchanged.
8. **Atomic-on-disk write.** The config is rewritten as
   `<JSON>\n` in a single `writeFile` call.
9. **No automatic application.** `suggest` and `list` never
   mutate the config; only `apply` writes (and only when
   `--dry-run` / `--preview` is not set).

## What This Is Not

- **Not an automatic policy.** v1 ships
  `rekon findings filter-policy apply` as the only mutating
  command; everything else is read-only.
- **Not LLM / fuzzy / semantic.** All suggestions come from
  deterministic counts and prefix matching.
- **Not a status decision.** Operator `accepted` / `ignored`
  / `resolved` decisions remain in `FindingStatusLedger`.
- **Not a persistent exclusion list of its own.** The report
  is regenerated each `suggest` run; persistent project
  policy lives in `.rekon/config.json` `findingFilters` after
  `apply`.

## Freshness

`rekon artifacts freshness --type FindingFilterPolicySuggestionReport`
marks an older suggestion report `stale` when a newer
`FindingFilterReport` has arrived (the suggestion report's
inputRefs become outdated).

## Cross-References

- [Issue governance architecture decision](../strategy/issue-governance-architecture-decision.md)
- [Finding filter policy suggestions concept](../concepts/finding-filter-policy-suggestions.md)
- [Finding filters concept](../concepts/finding-filters.md)
- [FindingFilterReport](finding-filter-report.md)
- [FindingFilterHealthReport](finding-filter-health-report.md)
- [FindingReport](finding-report.md)
