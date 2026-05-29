# Finding Lifecycle

Findings are governance artifacts in Rekon, not throwaway lint output.
This document explains how Rekon preserves and explains finding state
across runs: `new`, `existing`, `accepted`, `ignored`, and `resolved`.

This is one of the durable wins distilled from
`codebase-intel-classic`: issues should survive across runs, false
positives must be explainable, and accepted-risk decisions must be
auditable. See
[../strategy/classic-behavior-distillation.md](../strategy/classic-behavior-distillation.md)
and [../strategy/classic-wins.md](../strategy/classic-wins.md).

## Three Artifact Types

Three artifacts make up the lifecycle:

- **`FindingReport`** — raw evaluator output, written by an
  `evaluator` capability. Never mutated after the fact.
- **`FindingStatusLedger`** — append-style history of operator/system
  status decisions: `accepted`, `ignored`, `resolved`. Each decision
  carries a note, optional reason, timestamp, and source.
- **`FindingLifecycleReport`** — derived projection that combines the
  latest `FindingReport`, any previous reports, and the latest
  `FindingStatusLedger` into per-finding effective status plus an
  aggregate summary.

Raw `FindingReport`s are append-only. Status decisions go in the
ledger. Lifecycle projections read both and compute the current view.

## Statuses

| Status | Meaning |
| --- | --- |
| `new` | First time the finding has appeared. |
| `existing` | Present in a previous report and still present. |
| `accepted` | Operator decision: known debt or risk; not fixed. Requires a note. |
| `ignored` | Operator decision: false-positive or not-actionable. Requires a note. |
| `resolved` | Present in a previous report and absent from the latest report (derived), or explicitly marked fixed via a status decision. Requires a note when set explicitly. |

`accepted` and `ignored` are operator decisions; they survive across
runs until cleared. `resolved` is usually derived (the finding stopped
appearing), but can also be set explicitly with a note (e.g., "Fixed in
PR #42").

## Decision Reasons

`FindingStatusDecision.reason` is one of:

- `accepted-risk`
- `false-positive`
- `fixed`
- `not-actionable`
- `other`

Reasons are optional but encouraged. Combined with the required `note`,
they give future readers enough to understand the call.

## Lifecycle Derivation Rules

`deriveFindingLifecycle({ latestReport, previousReports, ledger })`:

1. Latest `FindingReport` is the active report unless overridden.
2. Findings in the latest report compare against the union of all
   previous reports' findings (by `id`):
   - Present in a previous report → `existing`.
   - Not present in any previous report → `new`.
3. Status decisions in the ledger override the derived status:
   - `accepted`, `ignored`, or `resolved` ledger decision → that
     status is the `effectiveStatus`, with `statusSource: "ledger"`.
   - The derived status is preserved as fallback when no ledger
     decision applies to the finding (`statusSource: "derived"`).
4. Findings present in a previous report but absent from the latest:
   - Derived `effectiveStatus: "resolved"`, `statusSource: "derived"`.
   - Listed under `resolvedFindings` in the lifecycle report.
   - Ledger decisions (e.g., `accepted` on a finding that no longer
     appears) still override the derived `resolved` status.
5. Ignored decisions must have a non-empty note (kernel-level
   validation rejects them otherwise).
6. The decisions array in the lifecycle report mirrors the ledger, so
   downstream consumers can see every decision, not just the latest per
   finding.

Matching uses `finding.id` for the alpha. Fuzzy/semantic matching is
deferred.

## CLI Surface

```sh
rekon findings list --root <repo> --json [--status <status>]
rekon findings lifecycle --root <repo> --json
rekon findings status list --root <repo> --json
rekon findings status set <finding-id> --status accepted|ignored|resolved --note <note> [--reason <reason>] --root <repo> --json
```

- `findings list` reads the latest `FindingReport` (and any
  `FindingStatusLedger`), applies lifecycle derivation, and prints
  the effective findings.
- `findings lifecycle` writes a `FindingLifecycleReport` artifact
  through the runtime store, with `inputRefs` to the reports and ledger
  used.
- `findings status list` prints the decisions in the latest ledger.
- `findings status set` appends or replaces a decision for the given
  finding id and writes a new `FindingStatusLedger`. Ignored and
  resolved decisions require `--note`.

## Resolver Integration

`resolve.issue` reads the latest `FindingStatusLedger` automatically
when matching a finding. If the matched finding has an `accepted`,
`ignored`, or `resolved` ledger decision, the resolver:

- includes `status`, `statusSource`, `statusNote`, and `statusReason`
  on the matched `issue`;
- adds a warning summarizing the decision:
  - `ignored` → "Matched finding is ignored; verify before acting."
  - `accepted` → "Matched finding is accepted risk/debt; verify policy before changing."
  - `resolved` → "Matched finding is marked resolved; confirm whether action is still needed."

The resolver does not silently treat ignored/accepted findings as
"no-op". It surfaces the decision so the agent or operator decides what
to do.

## Downstream Projection

The `CoherencyDelta` artifact consumes the lifecycle report and
produces severity/system summaries plus a remediation queue. Build one
with `rekon coherency delta --root <repo> --json`. See
[coherency-delta.md](coherency-delta.md) and
[../artifacts/coherency-delta.md](../artifacts/coherency-delta.md).

## What This Is Not

- This is not a coherency delta itself. The delta is a separate
  artifact built on top of this lifecycle projection; see above.
- This is not LLM-driven issue review. Status decisions are operator
  decisions or system decisions written into a typed ledger.
- This is not a false-positive classifier. The ledger records explicit
  decisions; classifying false positives without human input is out of
  scope for the alpha.
- This is not finding dedupe or semantic merge. The lifecycle
  report matches findings by id. Deterministic
  *adjudication* (group-by-key-equality dedupe) is a separate
  projection — see
  [docs/concepts/issue-adjudication.md](issue-adjudication.md)
  and
  [docs/artifacts/issue-adjudication-report.md](../artifacts/issue-adjudication-report.md).

## Relationship To Filtering

`FindingLifecycleReport` now consumes
`FindingFilterReport.keptFindings` when a current filter report
exists (filter-aware lifecycle slice). "Current" means the
filter report cites the latest `FindingReport` in its
`header.inputRefs`. Filtered findings stay auditable in
`FindingFilterReport.filteredFindings` and do **not** appear as
active lifecycle findings — they neither flow into issue groups
nor into `CoherencyDelta` items / remediation steps. When no
filter report exists or the latest filter is stale relative to
the latest `FindingReport`, the lifecycle falls back to the raw
`FindingReport` transparently. See the
[issue governance architecture decision](../strategy/issue-governance-architecture-decision.md)
and [finding-filters.md](finding-filters.md) for the layered
model.

## Cross-References

- [docs/artifacts/finding-report.md](../artifacts/finding-report.md)
- [docs/artifacts/finding-filter-report.md](../artifacts/finding-filter-report.md)
- [docs/artifacts/finding-filter-health-report.md](../artifacts/finding-filter-health-report.md)
- [docs/concepts/finding-filters.md](finding-filters.md)
- [docs/artifacts/finding-status-ledger.md](../artifacts/finding-status-ledger.md)
- [docs/artifacts/finding-lifecycle-report.md](../artifacts/finding-lifecycle-report.md)
- [docs/artifacts/issue-adjudication-report.md](../artifacts/issue-adjudication-report.md)
- [docs/concepts/issue-adjudication.md](issue-adjudication.md)
- [docs/artifacts/resolver-packet.md](../artifacts/resolver-packet.md)
- [docs/concepts/resolvers.md](resolvers.md)
- [docs/strategy/classic-behavior-distillation.md](../strategy/classic-behavior-distillation.md)
- [docs/strategy/classic-wins.md](../strategy/classic-wins.md)
- [docs/strategy/issue-governance-architecture-decision.md](../strategy/issue-governance-architecture-decision.md)
- [docs/strategy/capability-lint-finding-bridge-decision.md](../strategy/capability-lint-finding-bridge-decision.md)
  — forty-second slice; selects an intermediate
  `CapabilityLintFindingBridgeReport` preview artifact before any
  `FindingReport` writer. The lifecycle stays **downstream** of governed
  findings; the bridge report mutates no lifecycle state.
- [docs/artifacts/capability-lint-finding-bridge-report.md](../artifacts/capability-lint-finding-bridge-report.md)
  — forty-third slice; the `CapabilityLintFindingBridgeReport` preview
  artifact shipped. It **does not write `FindingReport`** and **does not
  mutate `FindingLifecycleReport`** (or `FindingFilterReport`,
  `IssueAdjudicationReport`, `CoherencyDelta`). Only a later explicit
  writer decision may promote eligible candidates into governed findings,
  and they would still flow through this lifecycle downstream.
- [docs/strategy/capability-lint-finding-bridge-report-safety-review.md](../strategy/capability-lint-finding-bridge-report-safety-review.md)
  — forty-fourth slice; read-only review confirming the bridge mutates no
  lifecycle state and declaring it safe / stable. The lifecycle stays
  downstream of governed findings.
- [docs/strategy/capability-lint-finding-writer-decision.md](../strategy/capability-lint-finding-writer-decision.md)
  — forty-seventh slice; selects Option B (a future, opt-in
  `FindingReport` writer with dry-run preview + explicit confirmation;
  not implemented). The writer would write a new `FindingReport`
  artifact; **this lifecycle remains downstream and is not mutated by
  the writer**. Any written finding still flows through the filters,
  status ledger, and this lifecycle projection like any other finding.
  The writer's **dry-run helper / CLI** has shipped (forty-eighth
  slice, preview only): it previews the proposed `FindingReport`
  body and mutates no lifecycle state; write mode is deferred. The
  dry-run **safety review** (forty-ninth slice) declared it **safe
  / stable as preview-only writer modeling**; this lifecycle stays
  downstream and unmutated. The **writer mode decision** (fiftieth
  slice) selected an opt-in write mode behind
  `--confirm-finding-write` (now **shipped** in the fifty-first
  slice as the writer implementation); a written `FindingReport`
  still flows through this lifecycle downstream, which the writer
  does not mutate. The **writer safety review** (fifty-second
  slice) confirmed the writer **safe / stable as a controlled,
  opt-in writer**; lifecycle integration remains downstream. The
  **bridge-derived findings publication decision** (fifty-third
  slice) then selected **Option B** — surface the written
  bridge-derived `FindingReport` entries in the architecture summary
  and agent operating contract first (read-only, with provenance);
  proof-report surfacing is deferred. That surfacing mutates no
  lifecycle state and bridge-derived findings are governed
  `FindingReport` entries, **not lifecycle status**; lifecycle
  integration remains downstream. See
  [bridge-derived findings publication decision](../strategy/bridge-derived-findings-publication-decision.md). The surfacing
implementation shipped in the fifty-fourth slice (read-only
`## Bridge-Derived Findings` in the architecture summary and `###
Bridge-Derived Findings` in the agent contract); it mutates no
lifecycle state and lifecycle integration remains downstream. The surfacing was safety-reviewed safe / stable as read-only visibility in the fifty-fifth slice. The lifecycle / CoherencyDelta integration decision (fifty-sixth slice) then selected a BridgeFindingLifecycleIntegrationReport preview artifact first; lifecycle / adjudication / CoherencyDelta mutation remain deferred to later safety-reviewed slices. The preview artifact `BridgeFindingLifecycleIntegrationReport` then shipped in the fifty-seventh slice (read-only; `rekon capability lint lifecycle-preview`); see [its artifact reference](../artifacts/bridge-finding-lifecycle-integration-report.md). It was safety-reviewed safe / stable in the fifty-eighth slice (no blocker).
