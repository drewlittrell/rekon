# Issue Governance Architecture Decision

Status: **Accepted** (2026-05). Author: Rekon core.
Scope: P1.1 (Issue Adjudication) and downstream coherency / publication / resolver surfaces.

This ADR is the canonical reference for how Rekon shapes its
issue-governance pipeline. It exists because issue work spans
several P1.1 slices, mixes faithful classic guarantees with new
product extensions, and risks accidentally promoting product
features (like operator-assisted merge decisions) into "classic
parity" if we are not deliberate.

## Decision

Rekon uses a layered issue-governance model. Every layer is its
own artifact type. Each layer reads from the layer(s) below it,
without mutating them.

1. **`FindingReport`** — raw evaluator output. Never mutated.
   Source of truth for what evaluators detected on this run.
2. **`FindingFilterReport`** — system / policy filtering audit.
   Records filtered findings with reason, evidence, and
   confidence. Does **not** mutate `FindingReport`. Carries a
   `keptFindings` projection alongside `filteredFindings` so
   downstream consumers can opt in to the filtered view without
   re-deriving it.
3. **`FindingStatusLedger`** (already shipped) — operator status
   decisions (accepted / ignored / resolved) with note + reason.
   Append-only; never mutated.
4. **`FindingLifecycleReport`** — run-to-run lifecycle (new /
   existing / resolved) plus the effective status produced by
   joining `FindingReport` × `FindingStatusLedger`. **As of the
   filter-aware lifecycle slice**, the lifecycle prefers
   `FindingFilterReport.keptFindings` as the active latest set
   when the filter report cites the latest `FindingReport` in
   its `inputRefs`. The filter report is cited in the
   lifecycle's own `inputRefs` so freshness flags lifecycle
   stale when a newer filter arrives. When no current filter
   report exists, the lifecycle falls back to the raw
   `FindingReport` transparently and does not cite a stale
   filter.
5. **`IssueAdjudicationReport`** — groups kept findings into
   governed `IssueAdjudicationGroup` records. Deterministic
   grouping first (current shape). The `mergeCandidates` field is
   an advisory product extension (see below).
6. **`IssueMergeDecisionLedger`** — operator-assisted product
   extension. Records `accepted` / `rejected` decisions per
   merge candidate with required note + optional reason.
   Append-only.
7. **`CoherencyDelta`** — operational roll-up of the current
   governed issue state. v3 honors accepted merge decisions as a
   derived projection (merged rollup items); raw groups remain
   inspectable.

The product-extension layers (merge candidates, decision ledger,
accepted-merge roll-ups, publication / resolver awareness of
those roll-ups) are useful and shipped, but they are explicitly
**not** classic parity. Future ADRs may promote them.

## Why

Classic codebase-intel proved the following are non-negotiable
for trustworthy issue governance:

- **Issue id continuity** across runs (so lifecycle / status
  decisions survive re-detection).
- **False positives need an audit trail.** Filtered findings
  must record reason, evidence, and confidence so a future
  operator can debug filters or recover a wrongly-suppressed
  finding.
- **Status / review metadata persists** independent of detection
  re-runs.
- **Coherency roll-ups operate on governed issues**, not raw
  detector noise. Without filtering, raw counts overstate drift
  whenever the repo has test / generated / external paths.

Rekon's current shape satisfies the first three (via
`FindingStatusLedger` + `FindingLifecycleReport` +
`IssueAdjudicationReport`). The fourth is partially satisfied: a
`CoherencyDelta` already operates on adjudicated groups, but the
groups themselves include false positives because the layer
above — system / policy filtering — does not yet exist. This ADR
puts the filter layer between `FindingReport` and the lifecycle /
adjudication chain.

## Product Extension Boundary

The following are Rekon product extensions, not faithful classic
parity:

- `IssueMergeCandidate` (advisory cross-rule merge hints on
  `IssueAdjudicationReport`).
- `IssueMergeDecisionLedger` (operator accept / reject
  decisions).
- Accepted-merge rollup items in `CoherencyDelta` v3
  (`mergedIssueGroupIds`, `mergeDecisionIds`,
  `mergeCandidateIds`).
- Publication / resolver awareness of accepted rollups
  (architecture summary + agent contract sections,
  `IssuePacket.mergeRollup`).

These remain shipped and supported. Future work must explicitly
**label** them as product extensions in the strategy docs and
review packets unless an ADR promotes them. Promotion requires:

1. Documenting the classic behavior the extension preserves.
2. Pinning the regression via the classic-guarantee plan.
3. Removing the "product extension" label in alignment-map /
   subsystem-purpose-map.

## Terminology

| Term | Meaning |
| --- | --- |
| **Finding** | Raw evaluator output. A single `Finding` record. |
| **Filtered finding** | A finding suppressed from active governance by a system / policy filter, with audit evidence. Lives in `FindingFilterReport.filteredFindings`. |
| **Kept finding** | A finding that passed filtering. Lives in `FindingFilterReport.keptFindings`. Becomes a candidate for lifecycle / adjudication. |
| **Issue group** | Governed group of kept findings (`IssueAdjudicationGroup`). |
| **Merge candidate** | Advisory possible relationship between two issue groups. Not automatic; not classic parity. |
| **Merge decision** | Operator decision to accept or reject a merge candidate. Persisted in `IssueMergeDecisionLedger`. |
| **Merge rollup** | Derived projection in `CoherencyDelta` that collapses two or more groups linked by an accepted merge decision into a single rollup item. |
| **Coherency delta** | Operational roll-up of current governed issue state. |

## Consequences

- **Do not** overload `ignored` / `accepted` statuses to mean
  system filtering. Operator status decisions belong in
  `FindingStatusLedger`; system / policy suppression belongs in
  `FindingFilterReport`.
- **Do not** drop filtered findings. They stay in the filter
  report with reason + evidence + confidence so any operator can
  audit them.
- **Do not** treat raw finding counts as governed issue counts.
  The agent contract `Do Not Do` already states this; the
  pattern extends to filter counts (kept vs. filtered) too.
- **Do not** treat merge candidates as automatic merged groups.
  Only accepted decisions reshape the `CoherencyDelta`
  projection.
- **Do not** continue merge-decision freshness work until
  filtering / filter-health exists. The freshness layer over
  merge decisions matters less than restoring the missing
  classic filtering guarantee.
- **Do** add `FindingFilterReport` and
  `FindingFilterHealthReport` as the next implementation slice
  (this batch).
- **Do** label future slices in strategy docs as one of:
  classic-guarantee preservation, Rekon reinterpretation, or
  Rekon product extension.

## Implementation Order

1. **(shipped)** ADR + `FindingFilterReport` +
   `FindingFilterHealthReport` v1 + CLI + refresh wiring.
   Filter artifacts are produced and auditable.
2. **(shipped)** Filter-aware lifecycle:
   `FindingLifecycleReport` consumes
   `FindingFilterReport.keptFindings` when the latest filter
   report cites the latest `FindingReport`. Adjudication and
   `CoherencyDelta` benefit transitively — only kept findings
   flow into issue groups and coherency rollups. Filtered
   findings remain auditable but no longer become active
   governed issue groups or coherency items.
3. **(shipped)** Filter policy / configured exclusions v1:
   `.rekon/config.json` accepts a `findingFilters` array of
   project-specific policy rules. Each rule names a
   `FindingFilterReason`, supplies `evidence`, and matches
   findings by deterministic `pathPattern` (simple glob),
   `type`, `ruleId`, `severity`, `titleIncludes`, and/or
   `descriptionIncludes`. Policy rules run **before** built-in
   deterministic filters, in declared order; the first
   matching rule wins. Filtered entries record
   `source: "policy"` plus a `policyId` so the audit trail
   names the rule. `FindingFilterReport.summary.byPolicy` /
   `FindingFilterHealthReport.summary.byPolicy` report
   per-policy counts. Three new health alerts:
   `policy-over-filtering`, `low-confidence-policy-filter`,
   `unused-policy-filter`. `rekon config validate` enforces
   the policy schema and rejects duplicates / missing
   matchers / absolute or traversal pathPattern.
4. **(shipped)** Filter health / issue adjudication surfaces
   in publications. `@rekon/capability-docs.architecture-summary`
   renders a `## Finding Filter Health` section sourced from
   `FindingFilterReport` + `FindingFilterHealthReport` (kept /
   filtered counts, filter rate, per-reason / per-policy
   tables, alert list, audit pointer to `filteredFindings`).
   `@rekon/capability-docs.agent-contract` renders a
   `### Finding Filter Health` subsection under
   `Active Governance State` that visibly warns when alerts
   exist and instructs agents to inspect
   `FindingFilterReport.filteredFindings` before claiming the
   repo has no active issues. Both publications cite the
   filter artifacts in `header.inputRefs`, so freshness flags
   them stale on newer filter / health reports. The agent
   contract's `Do Not Do` list adds a clean-active-governance
   reminder.
5. **(future)** Filter policy / exclusion persistence v2 —
   preserve repeated filtered findings into explicit
   config-backed policy suggestions; still no automatic
   mutation.
6. **(future)** Merge-decision freshness guardrails,
   `GraphOntologyValidator`-style filters, persistent
   exclusion lists, and any further product-extension
   expansion.

## Open Questions

- When should `CoherencyDelta` switch from
  lifecycle / adjudication input to a final
  filtered-governed projection? Likely after step 2 lands.
- ~~Should finding filters be configurable via
  `.rekon/config.json` (allowlist / denylist paths, custom
  reasons)? Deferred until v1 shape proves stable.~~ Resolved
  by Filter policy / configured exclusions v1 (`findingFilters`
  array in `.rekon/config.json`).
- What filter-health alerts matter before beta? v1 ships two:
  high-filter-rate (`filterRate > 0.8`) and
  low-confidence-filtered (`> 0`). Severity-aware alerts and
  reason-specific thresholds can come later.
- Where do we draw the line between deterministic v1 filters and
  the deferred `GraphOntologyValidator` port? Likely a separate
  capability or rule pack rather than core `@rekon/runtime`.

## Cross-References

- [classic-alignment-map.md](classic-alignment-map.md)
- [classic-behavior-roadmap.md](classic-behavior-roadmap.md)
- [classic-guarantee-regression-plan.md](classic-guarantee-regression-plan.md)
- [classic-subsystem-purpose-map.md](classic-subsystem-purpose-map.md)
- [roadmap.md](roadmap.md)
- [../artifacts/finding-report.md](../artifacts/finding-report.md)
- [../artifacts/finding-filter-report.md](../artifacts/finding-filter-report.md)
- [../artifacts/finding-filter-health-report.md](../artifacts/finding-filter-health-report.md)
- [../artifacts/finding-lifecycle-report.md](../artifacts/finding-lifecycle-report.md)
- [../artifacts/finding-status-ledger.md](../artifacts/finding-status-ledger.md)
- [../artifacts/issue-adjudication-report.md](../artifacts/issue-adjudication-report.md)
- [../artifacts/issue-merge-decision-ledger.md](../artifacts/issue-merge-decision-ledger.md)
- [../artifacts/coherency-delta.md](../artifacts/coherency-delta.md)
