# Finding Filter Policy Suggestions

Rekon's filter layer keeps false positives out of active
governance while preserving every suppression as an auditable
[`FindingFilterReport`](../artifacts/finding-filter-report.md)
entry. After enough runs, recurring filtered findings can
become candidates for **durable** project policy via
`.rekon/config.json` `findingFilters`.

`FindingFilterPolicySuggestionReport` is Rekon's bridge
between audit-only filtering and configured exclusions. It
proposes candidate `findingFilters` rules with explicit
evidence — and never mutates the config on its own.

This concept preserves classic codebase-intel's persistent
exclusion behavior in Rekon's artifact-first, operator-driven
shape. See the
[issue governance architecture decision](../strategy/issue-governance-architecture-decision.md).

## Why It Exists

Filtering happens every run. Without a way to promote
recurring patterns to durable policy, operators either:

- keep seeing the same filtered findings in
  `FindingFilterReport` (audit noise), or
- misuse `ignored` status to suppress what should really be
  a system / policy filter (an explicit anti-pattern the
  ADR rules out).

Classic codebase-intel solved this with persistent issue
exclusions. Rekon ports the value without copying the shape:
a separate suggestion artifact lets operators see which
filters would benefit from being written down, with one
explicit step (`apply`) to turn the suggestion into config.

## Suggestion Pipeline

`buildFindingFilterPolicySuggestionReport(store, options?)`:

1. Reads the latest N `FindingFilterReport` artifacts
   (default 5, configurable via `recentLimit`). Operators
   can pin specific reports via `filterReportIds`.
2. Calls
   `deriveFindingFilterPolicySuggestions({ filterReports,
   filterReportRefs, policies })` — a pure, deterministic
   helper that buckets filtered findings by path prefix,
   type, and filter reason and emits suggestion candidates
   only when configured thresholds are met.
3. Filters out any suggestion that would duplicate an
   existing `findingFilters` rule (by `pathPattern`, `type`,
   or `ruleId`).
4. Writes a
   [`FindingFilterPolicySuggestionReport`](../artifacts/finding-filter-policy-suggestion-report.md)
   to the `findings/` category. `header.inputRefs` cite
   every consumed `FindingFilterReport`.

The CLI side runs the same code path:

- `rekon findings filter-policy suggest` →
  `buildFindingFilterPolicySuggestionReport` + write.
- `rekon findings filter-policy list` → returns the latest
  indexed suggestion report (or a friendly empty payload
  pointing back at `suggest`).
- `rekon findings filter-policy apply <id> [--force]` →
  the only mutating command (see the safety section below).

## Suggestion Reasons

| Reason | Trigger | Confidence |
| --- | --- | --- |
| `repeated-filtered-policy-gap` | ≥ 3 built-in-filtered findings share a path prefix AND no `findingFilters` rule covers it | **high** |
| `repeated-filtered-path` | ≥ 2 filtered findings share a path prefix AND no rule covers it AND no policy-gap was emitted for the same prefix | **high** (≥ 3) / **medium** (= 2) |
| `repeated-filtered-type` | ≥ 3 filtered findings share `finding.type` AND no rule covers it | **medium** |
| `high-volume-filtered-pattern` | one `FilteredFinding.reason` accounts for > 80 % of filtered findings AND ≥ 5 findings in that bucket | **low** (review prompt; no `pathPattern`) |

`repeated-filtered-policy-gap` is computed **first** so it
wins over `repeated-filtered-path` for the same pathPattern
(the gap version carries more information — it tells the
operator a built-in filter is doing the work today and
should be promoted to an explicit policy).

Path-prefix heuristic: first two segments
(`src/generated/foo.ts`, `src/generated/bar.ts` →
`src/generated/**`). Single-segment paths use that one
segment (`generated/x.ts` → `generated/**`).

All thresholds are deterministic constants:
`SUGGESTION_MIN_REPEATED_PATH = 2`,
`SUGGESTION_HIGH_CONFIDENCE_PATH = 3`,
`SUGGESTION_MIN_REPEATED_TYPE = 3`,
`SUGGESTION_HIGH_VOLUME_THRESHOLD = 5`,
`SUGGESTION_HIGH_VOLUME_DOMINANCE = 0.8`.

## Apply Safety

`rekon findings filter-policy apply <id>` is the only
command that mutates `.rekon/config.json`. Safety rules:

1. **Low-confidence suggestions require `--force`.** v1
   only emits `high-volume-filtered-pattern` at low
   confidence, and that suggestion intentionally has no
   `pathPattern`. Operators must narrow the rule before
   applying.
2. **Duplicate rule ids require `--force`.** Re-applying
   the same suggestion twice would otherwise silently
   produce a duplicate.
3. **Unknown config fields are preserved.** The command
   only touches `findingFilters`; every other top-level
   key (`capabilities`, `permissions`, project extensions,
   etc.) is carried through unchanged.
4. **Default config is created if missing.** Same shape
   as `rekon init`, so the suggestion lands in a
   well-formed file.
5. **Suggest / list are read-only.** Neither command
   mutates the config under any flag combination.

## Audit Trail

Each suggestion records:

- `affectedFindingIds` — finding ids that contributed to
  the bucket.
- `affectedPaths` — file paths from the contributing
  findings.
- `affectedTypes` — `finding.type` values seen in the
  bucket.
- `sourceFilterReportIds` — the
  `FindingFilterReport.header.artifactId`s the derivation
  folded over.
- `evidence` — `ArtifactRef`s back to those filter reports.

Combined with the suggestion report's own
`header.inputRefs`, every suggestion is fully traceable
back to the filter audit that produced it.

## What This Is Not

- **Not automatic mutation.** Suggestions are advisory
  until `apply` runs explicitly.
- **Not LLM / fuzzy / semantic.** All thresholds are
  deterministic.
- **Not a status surface.** Operator `accepted` / `ignored`
  / `resolved` decisions remain in `FindingStatusLedger`.
- **Not a replacement for `FindingFilterReport`.** Filter
  audit stays the source of truth; suggestions point at it.
- **Not a persistent exclusion list in itself.** Once
  applied, the rule lives in `.rekon/config.json`
  `findingFilters` like any other policy rule. Re-running
  `suggest` over future filter reports will no longer
  surface that pattern (the existing rule covers it).

## CLI Surface

```sh
rekon findings filter-policy suggest [--recent-limit <n>] [--root <repo>] [--json]
rekon findings filter-policy list [--root <repo>] [--json]
rekon findings filter-policy apply <suggestion-id> [--force] [--root <repo>] [--json]
```

`apply` JSON output names the applied rule + config path so
operators can confirm the write landed where expected.

## Freshness

`rekon artifacts freshness --type FindingFilterPolicySuggestionReport`
marks an older suggestion report `stale` when a newer
`FindingFilterReport` has arrived. Re-run
`rekon findings filter-policy suggest` (or just `rekon
refresh` followed by `suggest`) to regenerate.

## Cross-References

- [Finding filter policy suggestion report artifact](../artifacts/finding-filter-policy-suggestion-report.md)
- [Finding filters concept](finding-filters.md)
- [FindingFilterReport](../artifacts/finding-filter-report.md)
- [FindingFilterHealthReport](../artifacts/finding-filter-health-report.md)
- [Issue governance architecture decision](../strategy/issue-governance-architecture-decision.md)
- [Refresh pipeline](refresh.md)
