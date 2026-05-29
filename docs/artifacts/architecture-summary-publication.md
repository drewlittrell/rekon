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

## Merge Roll-up Freshness

When `CoherencyDelta` carries accepted merge roll-ups,
the architecture summary renders a `### Merge Roll-up
Freshness` subsection right below `## Accepted Issue
Merge Roll-ups`. The subsection emits a `Status:`
line (`fresh` / `stale`) and, when any rule fires, a
table of `(code, message, recommended command)` rows
plus a `Do not rely on accepted merge roll-ups …`
callout. The predicate (see
[issue merge decision freshness guardrails](../strategy/issue-merge-decision-freshness-guardrails.md))
is artifact-lineage only — no file-system mtime, no
watcher. All warnings recommend `rekon refresh`.

## Merge Candidate Decisions

When the latest `IssueAdjudicationReport.mergeCandidates`
is non-empty, the architecture summary renders a
`## Merge Candidate Decisions` section with
`Total / Accepted / Rejected / Undecided` counts.
When undecided candidates exist, the section
recommends `rekon issues merge candidates
--undecided --json`. When `merge-decision-superseded`
or freshness-stale candidates exist, the section also
recommends `--superseded` / `--stale` variants. The
section always closes with the candidate-detail and
decide command lines so operators have a single
starting point. See
[issue merge decision operator ergonomics](../strategy/issue-merge-decision-operator-ergonomics.md).

## Cross-References

- [Architecture summary concept](../concepts/architecture-summary-publication.md)
- [CoherencyDelta](coherency-delta.md)
- [FindingLifecycleReport](finding-lifecycle-report.md)
- [Issue merge decision freshness guardrails](../strategy/issue-merge-decision-freshness-guardrails.md)
- [Issue merge decision operator ergonomics](../strategy/issue-merge-decision-operator-ergonomics.md)
- [Issue merge decision publication / detail polish](../strategy/issue-merge-decision-publication-detail-polish.md)
- [Capability model](../strategy/capability-model.md)
- [Classic behavior distillation](../strategy/classic-behavior-distillation.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
- [Watcher / path freshness policy decision](../strategy/watcher-path-freshness-policy-decision.md) —
  reserves a future `## Working Tree Freshness` section
  that will land with the path-freshness implementation
  slice. The existing Input Freshness Warnings section
  covers artifact-lineage freshness only.
- [PathFreshnessReport](path-freshness-report.md) +
  [Path freshness concept doc](../concepts/path-freshness.md) —
  the architecture summary **now renders a `## Working
  Tree Path Freshness` section** sourced from the
  latest `PathFreshnessReport`. The section sits
  between `## Verification Proof Status` and
  `## Proof Loop` and includes the report ref,
  baseline ref (if any), refresh recommendation, a
  per-path table (bounded at 20 non-fresh entries),
  and the canonical lineage-vs-working-tree
  distinction. The latest `PathFreshnessReport` is
  cited in `header.inputRefs` when present.
  **Publication generation is read-only with respect
  to working-tree freshness: it never runs `rekon
  paths freshness` and never runs `rekon refresh`.**
  When no `PathFreshnessReport` exists, the section
  renders no-report guidance naming `rekon paths
  freshness --json`.
- **Capability ontology suggestion publication
  surfacing.** The publisher reads the latest
  `CapabilityOntologySuggestionReport` and renders
  a **`## Capability Ontology Suggestions`
  section** with the report ref, summary counts by
  suggestion kind, an explicit `Preview-only.`
  callout pinning that
  `.rekon/capability-ontology.json` remains
  unchanged, and a bounded suggestion table. When
  the report has `skipped` entries the section
  appends them as `Skipped decisions (v1)` so
  agents understand which decisions were not
  translated. The latest report is cited in
  `header.inputRefs` when present. **Publication
  generation is read-only with respect to ontology
  state: it never mutates
  `.rekon/capability-ontology.json`, never mutates
  the `CapabilityNormalizationReviewLedger`, never
  writes a new
  `CapabilityOntologySuggestionReport`, and never
  mutates `CapabilityMap`.** When no report exists,
  the section renders no-report guidance naming
  `rekon capability ontology suggestions --json`.
- **CapabilityMap v2 publication surfacing.** The
  publisher reads the latest `CapabilityMap` and,
  when the v2 fields are populated, renders a
  **`## CapabilityMap v2 Phrase-Backed Capabilities`
  section** with the `CapabilityMap` ref, the
  consumed `CapabilityPhraseReport` ref
  (`phraseSourceRef`), a count line surfacing
  `total` / `withDomain` / `withPattern` /
  `withLayer`, optional top-verb / top-noun
  summaries (when `phraseBackedSummary.byVerb` /
  `byNoun` is present), an explicit boundary
  statement (`These entries are projection context,
  not CapabilityContract placement policy.
  CapabilityMap v2 does not imply placement
  policy, ownership policy, resolver routing,
  architecture linting, verification planning, or
  source writes.`), a proof-report-deferral line
  (`Proof-report surfacing of CapabilityMap v2 is
  deferred. CapabilityMap v2 is semantic
  capability projection, not verification proof.`),
  and a bounded table (`| Verb | Noun | Domain |
  Pattern | Layer | Evidence |`, capped at 20
  rows). The latest `CapabilityMap` is cited in
  `header.inputRefs` (already a v1 requirement);
  the publisher never mutates `CapabilityMap`,
  never mutates `CapabilityPhraseReport`, never
  mutates `CapabilityNormalizationReport`, never
  mutates `EvidenceGraph`, and never re-runs
  `rekon capability phrase project` or `rekon
  refresh`. When the latest `CapabilityMap` has no
  v2 fields, the section renders a no-report
  guidance line and still emits the boundary
  statement. See
  [`CapabilityMap` artifact reference](capability-map.md).
  The publication surfacing passed a
  [publication safety review](../strategy/capability-map-v2-publication-safety-review.md)
  (next slice: `CapabilityContract` architecture
  decision).
- The architecture summary also renders a
  **`## Capability Contracts`** section sourced
  from the latest `CapabilityContract`
  (thirty-fifth slice on the capability-ontology
  track). When a `CapabilityContract` exists, the
  section surfaces the contract ref, the source
  `CapabilityMap` ref, the optional config path
  (`.rekon/capability-contracts.json`), summary
  counts (`total` / `configured` / `unmatched` /
  `suggested` / `withRequiredChecks` /
  `withPlacementRules` / `withPreservationRules`),
  the boundary statement (*"CapabilityContract is
  policy visibility only; this publication does
  not enforce linting, routing, verification
  planning, or source writes."*), and a bounded
  contract table (`| Status | Verb | Noun |
  Domain | Layer | Checks | Rules |`, capped at
  20 rows). When no contract exists, the section
  renders no-contract guidance pointing operators
  at `rekon capability contract generate --json`.
  The latest `CapabilityContract` is cited in
  `header.inputRefs` when present. The publisher
  **reads** the latest contract; it **never runs
  `rekon capability contract generate`**, **never
  mutates** `CapabilityContract`,
  `.rekon/capability-contracts.json`,
  `CapabilityMap`, `CapabilityPhraseReport`, or
  `EvidenceGraph`. Proof-report surfacing of
  `CapabilityContract` is explicitly **deferred**.
  See the
  [`CapabilityContract` artifact reference](capability-contract.md),
  the
  [`CapabilityContract` v1 Safety Review](../strategy/capability-contract-v1-safety-review.md),
  and the
  [`CapabilityContract` publication safety review](../strategy/capability-contract-publication-safety-review.md)
  — thirty-sixth slice; declares this surfacing
  safe / stable as read-only visibility and selects
  the capability-aware architecture linting decision
  as the next slice.
- The architecture summary also renders a
  **`## Capability Architecture Linting`** section
  sourced from the latest
  `CapabilityArchitectureLintReport` (**fortieth
  slice** on the capability-ontology track). When a
  report exists, the section surfaces the lint report
  ref, the source `CapabilityContract` +
  `CapabilityMap` refs, summary counts (`total` /
  `violations` / `passes` / `notEvaluated`), optional
  byRule / bySeverity lines, and a bounded lint-row
  table (`| Status | Rule | Contract | Capability |
  Severity | Confidence | Message |`, capped at 20
  rows). When no report exists, the section renders
  no-report guidance pointing operators at `rekon
  capability lint architecture --json`. The latest
  `CapabilityArchitectureLintReport` is cited in
  `header.inputRefs` when present. The publisher
  **reads** the latest report; it **never runs
  `rekon capability lint architecture`** and **never
  mutates** the lint report, `CapabilityContract`,
  `CapabilityMap`, `FindingReport`,
  `FindingFilterReport`, `FindingLifecycleReport`, or
  `CoherencyDelta`. The rendered surface is
  **evaluation visibility only**: `violation` rows
  are policy-evaluation signals, not governed
  findings; `findingCandidate` stays preview-only.
  Proof-report surfacing of
  `CapabilityArchitectureLintReport` is explicitly
  **deferred**. See the
  [`CapabilityArchitectureLintReport` artifact reference](capability-architecture-lint-report.md),
  the
  [capability-aware architecture linting concept](../concepts/capability-aware-architecture-linting.md),
  and the
  [`CapabilityArchitectureLintReport` safety review](../strategy/capability-architecture-lint-report-safety-review.md).
- The architecture summary also renders a
  **`## Capability Lint Finding Bridge`** section sourced from
  the latest `CapabilityLintFindingBridgeReport` (**forty-fifth
  slice**). When a report exists it surfaces the bridge report
  ref, the source `CapabilityArchitectureLintReport` ref,
  summary counts (`totalRows` / `eligible` / `ineligible` /
  `needsReview`), optional byReason / bySeverity lines, the
  eligible / ineligible / needs-review guidance, and a bounded
  candidate table (`| Decision | Reason | Contract | Capability
  | Severity | Confidence | Proposed Finding |`, capped at 20).
  When absent it renders no-report guidance pointing at `rekon
  capability lint bridge-findings --json`. The report is cited
  in `header.inputRefs` when present. The publisher **reads**
  the latest report; it **never runs `rekon capability lint
  bridge-findings`**, **never writes `FindingReport`**, never
  mutates `FindingFilterReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, or `CoherencyDelta`, and **never
  creates `WorkOrder` or `VerificationPlan`**. `proposedFinding`
  stays **preview-only**; surfacing does not imply source
  writes. Proof-report surfacing of
  `CapabilityLintFindingBridgeReport` is explicitly **deferred**.
  See the
  [`CapabilityLintFindingBridgeReport` artifact reference](capability-lint-finding-bridge-report.md)
  and the
  [capability lint finding bridge concept](../concepts/capability-lint-finding-bridge.md).
- The
  [bridge-derived findings publication decision](../strategy/bridge-derived-findings-publication-decision.md)
  (**fifty-third slice**) selects the architecture summary + agent
  operating contract to additionally render a read-only **`##
  Bridge-Derived Findings`** section for the *governed findings the
  controlled writer wrote* (distinct from the preview Capability
  Lint Finding Bridge section). The section would surface the
  bridge-derived `FindingReport` entries — identified by
  `finding.type === "capability_architecture_policy"` plus the
  `details.source*` trace fields — with provenance and a boundary
  statement. **Shipped in the fifty-fourth slice.** It mutates no
  `FindingReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, or `CoherencyDelta`, and creates no
  `WorkOrder` / `VerificationPlan`. Proof-report surfacing remains
  **deferred**.
