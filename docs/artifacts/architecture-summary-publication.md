# Architecture Summary Publication

## Purpose

The architecture summary is a `Publication` artifact that summarizes
repository structure, ownership, capabilities, active coherency
findings, top affected paths, remediation priorities, current
proof-loop state (work orders, reconciliation plans, verification
status), and agent guidance. It is the alpha "lite" form of the
classic generated architecture docs and assistant-doc projections.

## Produced By

- `@rekon/capability-docs.architecture-summary` (a publisher handler
  inside the existing `@rekon/capability-docs` capability).

## Consumed By

- Humans and agents who want a single concise governance read of the
  current repository state.
- For a smaller readout focused only on verification/proof state, see
  the sibling [proof report publication](proof-report-publication.md)
  produced by `@rekon/capability-docs.proof-report` and the
  `rekon publish proof` shortcut.
- For an opinionated, agent-facing operating contract that combines
  ownership, governance state, ranked memory guidance, required
  checks, and anti-gaming rules, see the
  [agent contract publication](agent-contract-publication.md) produced
  by `@rekon/capability-docs.agent-contract` and the
  `rekon publish agent-contract` shortcut.
- Future surfaces (GitHub check publishers, dashboards) — these are
  out of scope for the alpha.

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`Publication`. The header carries:

- `producer.id` = `@rekon/capability-docs`.
- `inputRefs` cite every artifact actually read to build the summary:
  `IntelligenceSnapshot`, `ObservedRepo`, `OwnershipMap`,
  `CapabilityMap`, `CoherencyDelta`, `FindingLifecycleReport`,
  `WorkOrder`, `ReconciliationPlan`, `VerificationPlan`, and
  `VerificationResult`. Missing artifacts are not cited.
- `freshness.status` mirrors the snapshot's freshness.

## Shape

The publication uses the existing `PublicationArtifact` shape with an
extended `kind` enum:

```ts
type PublicationArtifact = {
  header: ArtifactHeader;
  kind: "agents" | "repo-summary" | "architecture-summary";
  title?: string;
  path: string;
  format: "markdown";
  content: string;
};
```

For the architecture summary:

- `kind` = `"architecture-summary"`.
- `title` = `"Rekon Architecture Summary"`.
- `path` = `.rekon/artifacts/publications/architecture-summary.md`.
- `format` = `"markdown"`.
- `content` is the rendered markdown.

## Content Structure

The publication content includes these sections, in order:

1. **Repository Overview** — repo id, root, system count, capability
   count, indexed-artifact category counts, snapshot freshness.
2. **Owner Systems** — table of owner systems with truncated paths and
   capabilities. Up to 20 rows; remaining systems collapsed into a
   "+N more" entry.
3. **Capability Map** — bullet list with truncated subjects/systems
   per capability. Up to 20 entries; remaining collapsed.
4. **Coherency Summary** — counts of active/accepted/ignored/resolved
   items and a severity breakdown. The section labels the unit as
   "governed issue groups" when the `CoherencyDelta` was built
   from an `IssueAdjudicationReport` (every delta item carries an
   `issueGroupId`), otherwise as "findings". A one-line preface
   states which mode is in effect. When no `CoherencyDelta` is
   indexed, the section instructs the operator to run
   `rekon coherency delta`.
5. **Governed Issue Groups** — counts (`Total / Active / Accepted
   / Ignored / Resolved / Mixed`), a member-finding total, and a
   table of up to 20 groups (`Group | Status | Severity | Type |
   Members | Files`). The `Members` column reports the member
   count plus the first few member finding ids so raw findings
   stay traceable. When no `IssueAdjudicationReport` exists, the
   section instructs the operator to run `rekon issues
   adjudicate` or `rekon refresh` and warns that raw lifecycle
   counts above may overstate drift when duplicate findings exist.
6. **Accepted Issue Merge Roll-ups** — derived from
   `CoherencyDelta` v3. Renders one row per merged rollup item
   (items where `mergedIssueGroupIds.length > 1`): `Roll-up |
   Groups | Decision IDs | Member Findings | Severity | Status |
   Active`. Raw group ids and decision ids are visible so
   operators can trace the roll-up back to its accepted decisions
   and the underlying `IssueAdjudicationReport` groups. When no
   accepted roll-ups exist, the section says so explicitly
   without implying anything about the existence of merge
   candidates. When no `CoherencyDelta` is indexed, the section
   instructs the operator to run `rekon coherency delta`. See
   [coherency-delta.md](coherency-delta.md),
   [../concepts/issue-merge-decisions.md](../concepts/issue-merge-decisions.md).
7. **Finding Filter Health** — derived from
   [`FindingFilterReport`](finding-filter-report.md) +
   [`FindingFilterHealthReport`](finding-filter-health-report.md).
   When both artifacts exist, renders kept / filtered /
   filter-rate counts plus policy-filtered totals, and three
   tables: **Filter Reasons** (per-reason counts), **Policy
   Filters** (per-`findingFilters` policy counts plus a list
   of any unused policy ids), and **Filter Health Alerts**
   (severity / code / message per alert). Always closes with
   "Filtered findings are not deleted. Inspect
   `FindingFilterReport.filteredFindings` for the full audit"
   so the section is unambiguous about the audit trail. When
   either artifact is missing, the section emits a
   command-shaped hint (`rekon findings filter` /
   `rekon findings filter-health` / `rekon refresh`). See
   [../concepts/finding-filters.md](../concepts/finding-filters.md).
8. **Finding Filter Policy Freshness** — derived from
   [`FindingFilterReport.policyFingerprint`](finding-filter-report.md)
   plus the current `.rekon/config.json` `findingFilters`.
   Renders a status (`fresh` / `stale` / `missing` / `unknown`)
   plus both fingerprints (current config vs. report) so the
   operator can see at a glance whether
   `rekon refresh` should be re-run. `stale` fires when the
   operator changed `findingFilters` after the latest filter
   run; the section emits a blockquote recommending
   `rekon refresh`. `missing` / `unknown` emit the same
   recommendation. `fresh` says "Finding filter policy
   fingerprint matches the latest FindingFilterReport." See
   [../concepts/finding-filters.md](../concepts/finding-filters.md)
   "Policy Fingerprint and Freshness".
9. **Finding Filter Policy Suggestions** — derived from
   [`FindingFilterPolicySuggestionReport`](finding-filter-policy-suggestion-report.md).
   Renders total / high / medium / low suggestion counts plus
   a `Suggestion | Confidence | Reason | Suggested Rule |
   Affected Findings | Evidence` table (capped at 20 rows with
   an overflow line). When low-confidence suggestions exist,
   the section explicitly notes that `--force` is required to
   apply them. The section always closes with the audit
   pointer "Suggestions are advisory and do not mutate
   `.rekon/config.json`. Apply explicitly with
   `rekon findings filter-policy apply <suggestion-id>`." When
   the suggestion report is missing, the section emits an
   explicit `rekon findings filter-policy suggest` hint
   (skipping ahead to `rekon findings filter` first if no
   filter report exists yet). When the latest
   `FindingFilterReport` is **not** cited in the suggestion
   report's `inputRefs`, the section emits a stale banner
   pointing operators back to
   `rekon findings filter-policy suggest`. See
   [../concepts/finding-filter-policy-suggestions.md](../concepts/finding-filter-policy-suggestions.md).
10. **Top Affected Paths** — table of paths from
    `CoherencyDelta.summary.topPaths`. Up to 10 rows.
11. **Remediation Queue** — table of remediation steps from
    `CoherencyDelta.remediationQueue` with priority, finding id,
    severity, systems, and the truncated action. Up to 20 rows.
12. **Work Orders** — table showing the latest remediation
    (`source = "coherency-delta"`) and resolver work orders. Each row
    reports source, goal, paths, owner systems, and selected item count
    (for remediation orders) or `n/a` (for resolver orders). Missing
    work orders are called out with a "run `rekon intent remediation`
    or `rekon intent work-order`" hint.
13. **Reconciliation Plans** — summary table (total / artifact-only /
    source-write deferred / command deferred / manual review / applied
    / deferred / denied) plus up to 5 top operations with class, status,
    permissions, and finding. Missing plans recommend
    `rekon reconcile suggest`.
14. **Verification Status** — table of the latest `VerificationResult`
    status, summary counts, recorded by, recorded at. Failed / partial
    / not-run results display an explicit "Verification is not
    complete." line. If the result references an older
    `VerificationPlan` than the latest, the section says
    "VerificationResult may be stale; latest VerificationPlan differs."
15. **Proof Loop** — `Governance:` / `Planning:` / `Verification:`
    state bullets plus a single "Suggested next command:" line that
    walks the loop `coherency delta -> intent remediation -> reconcile
    suggest -> verify record -> address failures -> publish`.
16. **Agent Guidance** — short bullet list reminding readers of the
    route → seam → preflight flow and required checks.
17. **Freshness** — instructs the operator to run
    `rekon artifacts freshness --json`.
18. **Input Artifacts** — bullet list of `ArtifactRef`s cited in the
    header.

## Inputs Consumed

The publisher reads the latest available of each:

- `IntelligenceSnapshot` (required; the publisher throws if missing).
- `ObservedRepo` (optional).
- `OwnershipMap` (optional).
- `CapabilityMap` (optional).
- `CoherencyDelta` (optional).
- `IssueAdjudicationReport` (optional). When present, the
  publication renders the Governed Issue Groups section and
  flags the Coherency Summary as group-aware. When absent, the
  Governed Issue Groups section emits a "run `rekon issues
  adjudicate`" hint.
- `FindingLifecycleReport` (optional).
- `WorkOrder` (optional). The publisher reads up to two: the latest
  remediation work order (where `source === "coherency-delta"`) and
  the latest resolver work order.
- `ReconciliationPlan` (optional).
- `VerificationPlan` (optional). The publisher tracks the latest plan
  even when no `VerificationResult` is recorded yet, so the
  Verification Status section can flag stale results.
- `VerificationResult` (optional).

Every artifact actually read is cited in `header.inputRefs`. The
publisher does not synthesize missing artifacts; each missing section
calls out what to run next.

## Freshness And Provenance

The publication's `freshness.status` mirrors the snapshot's freshness
at write time. `rekon artifacts freshness` marks an older architecture
summary `stale` once any newer input artifact lands:

- newer `IntelligenceSnapshot`,
- newer `CoherencyDelta`,
- newer `IssueAdjudicationReport`,
- newer `OwnershipMap` / `ObservedRepo` / `CapabilityMap`,
- newer `FindingLifecycleReport`,
- newer `WorkOrder`,
- newer `ReconciliationPlan`,
- newer `VerificationPlan`,
- newer `VerificationResult`.

Rebuild with `rekon publish architecture` to refresh.

## CLI Surface

```sh
rekon publish architecture --root <repo> --json
rekon publish run @rekon/capability-docs.architecture-summary --root <repo> --json
rekon publish list --root <repo> --json
```

The two write paths are equivalent; the shortcut exists for parity
with `rekon publish agents`.

## What This Is Not

- Not canonical architecture truth. The publication is a derived
  projection. Canonical truth lives in `.rekon/artifacts`.
- Not the full classic `ArchitectureDocsHandler` tree. There is no
  per-system generated doc set in this alpha.
- Not an AGENTS.md overwrite. Rekon does not inject this output into
  the repo's root AGENTS.md.
- Not a watcher- or PR-driven publication. CLI/runtime only.
- Not a dashboard.
- Not a remediation auto-apply pipeline. The queue lists work; it does
  not run it.

## Cross-References

- [Architecture summary concept](../concepts/architecture-summary-publication.md)
- [CoherencyDelta](coherency-delta.md)
- [FindingLifecycleReport](finding-lifecycle-report.md)
- [Capability model](../strategy/capability-model.md)
- [Classic behavior distillation](../strategy/classic-behavior-distillation.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
