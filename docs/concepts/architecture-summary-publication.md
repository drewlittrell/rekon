# Architecture Summary Publication

A concise governance read of the repository in one Rekon-native
publication. It rolls up the snapshot, owner systems, capability map,
coherency delta, finding lifecycle, plus the full proof loop —
work orders, reconciliation plans, verification plans, and
verification results — into a single markdown document that humans
and agents can scan before editing code.

This is the alpha "lite" form of the classic generated architecture
docs and assistant-doc projections — see
[../strategy/classic-behavior-distillation.md](../strategy/classic-behavior-distillation.md)
("Publications And Generated Docs") and
[../strategy/classic-wins.md](../strategy/classic-wins.md) ("Generated
Docs Are Publications, Not Truth").

## Why It Exists

Before the architecture summary, governance lived across many
artifacts: `FindingReport`, `FindingStatusLedger`,
`FindingLifecycleReport`, `CoherencyDelta`, `OwnershipMap`,
`CapabilityMap`. Each is correct, but reading them all in one go was
friction. The architecture summary collapses them — and the
downstream proof-loop artifacts (`WorkOrder`, `ReconciliationPlan`,
`VerificationPlan`, `VerificationResult`) — into one publication:

- one paragraph for repository overview;
- one table for owner systems;
- a short capability map;
- a coherency summary (active/accepted/ignored/resolved + severity
  breakdown);
- top affected paths;
- a prioritized remediation queue;
- the latest work orders (remediation and resolver);
- the latest reconciliation plan classification summary;
- the latest verification status (passed / failed / partial /
  not-run);
- a proof-loop summary that suggests the next command to run;
- short agent guidance.

The publication does not replace any of the underlying artifacts. It
is a derived projection and is regenerated from artifacts each time.
It also does **not** execute verification commands, run reconciliation,
or judge verification sufficiency. Failed and partial verification
states are surfaced, not hidden.

## How It Is Built

`rekon publish architecture` invokes the
`@rekon/capability-docs.architecture-summary` publisher inside
`@rekon/capability-docs`. The publisher:

1. Reads the latest `IntelligenceSnapshot` (required).
2. Reads the latest `ObservedRepo`, `OwnershipMap`, `CapabilityMap`,
   `CoherencyDelta`, `IssueAdjudicationReport`, and
   `FindingLifecycleReport` if available. When an
   `IssueAdjudicationReport` is indexed, the summary renders a
   `Governed Issue Groups` section listing each adjudicated group
   with its member finding ids; the Coherency Summary section is
   also labeled as group-aware vs. raw-finding mode depending on
   whether the `CoherencyDelta` was built from adjudicated
   groups. When `CoherencyDelta` v3 contains operator-accepted
   merged rollup items (`mergedIssueGroupIds.length > 1`), the
   summary also renders an `Accepted Issue Merge Roll-ups`
   table showing each rollup id, the underlying group ids, the
   decision ids that produced it, member finding counts, severity,
   status, and active flag — derived from `CoherencyDelta` only
   (the publisher does not read `IssueMergeDecisionLedger`
   directly). The publisher additionally reads the latest
   `FindingFilterReport` and `FindingFilterHealthReport` and
   renders a `Finding Filter Health` section with kept /
   filtered counts, filter rate, per-reason / per-policy /
   per-graph-aware-reason tables, the full alert list, and an
   audit pointer back to `FindingFilterReport.filteredFindings`.
   The section breaks down the filtered count into five
   mutually-exclusive buckets — policy, classic content,
   graph-aware, result, built-in path — and surfaces a
   dedicated `Graph-Aware Filter Reasons` table whenever
   graph-aware filtering fired. After the graph-aware
   import evidence publication diagnostics slice, the
   publisher also renders a `Graph-Aware Evidence
   Sources` table (per-source counts from
   `graphAwareByEvidenceSource`) plus a per-reason ×
   per-source breakdown table sourced from
   `graphAwareReasonEvidenceSources` so operators can
   see whether graph-aware suppression is artifact-
   backed (EvidenceGraph) or relying on fallback
   (`DetectorDetails` / `ObservedRepo`). The new
   `graph-aware-filter-dominance`,
   `graph-aware-reason-dominance`,
   `graph-aware-details-fallback-dominance`,
   `graph-aware-observedrepo-fallback-dominance`, and
   `graph-aware-evidencegraph-low-usage` alerts surface
   in the same alerts table when their thresholds are
   met. Missing filter artifacts produce explicit `rekon
   findings filter` / `rekon findings filter-health` /
   `rekon refresh` hints.
   When a `FindingFilterPolicySuggestionReport` is indexed,
   the publisher also renders a `Finding Filter Policy
   Suggestions` section with total / high / medium / low
   counts, one row per suggestion (id, confidence, reason,
   suggested rule summary, affected finding count, evidence),
   and an explicit
   `rekon findings filter-policy apply <suggestion-id>`
   pointer. Low-confidence suggestions trigger an explicit
   `--force` note. When the suggestion report does **not**
   cite the latest `FindingFilterReport`, the section emits a
   stale banner pointing operators back to
   `rekon findings filter-policy suggest`.
   The publisher additionally renders a `Finding Filter
   Policy Freshness` section that compares the current
   `.rekon/config.json` `findingFilters` fingerprint (loaded
   via the new `loadCurrentFindingFilterPolicies(root)`
   helper) against the fingerprint stamped on the latest
   `FindingFilterReport`. Status is one of
   `fresh` / `stale` / `missing` / `unknown`. On `stale` /
   `missing` / `unknown`, the section emits a blockquote
   recommending `rekon refresh`. The helper
   `computeFilterPolicyStaleness` is exported so other
   surfaces and tests can reuse the same comparison.
   The publisher also runs a small
   `detectGovernanceFreshness` helper across the latest
   `FindingLifecycleReport` /
   `IssueAdjudicationReport` / `CoherencyDelta` and, when any
   adjudication / coherency input is stale, renders an
   `## Input Freshness Warnings` section recommending the next
   rebuild command. The section is omitted when the chain is
   clean — silence is the success signal. See
   [freshness-and-invalidation.md](freshness-and-invalidation.md).
3. Reads the latest remediation `WorkOrder` (where `source ===
   "coherency-delta"`) and the latest resolver `WorkOrder` if either
   exists.
4. Reads the latest `ReconciliationPlan` if it exists.
5. Reads the latest `VerificationPlan` and `VerificationResult` if
   they exist. The latest plan is tracked even when no result is
   recorded yet, so the Verification Status section can flag stale
   results.
6. Renders the markdown summary.
7. Writes a `Publication` artifact with `kind = "architecture-summary"`
   and full `header.inputRefs`.

The publisher does **not** call runtime helpers to build missing
artifacts. If a `CoherencyDelta` is missing, the summary instructs the
operator to run `rekon coherency delta`; if no `VerificationResult`
is recorded yet, it instructs the operator to run
`rekon verify record`; and so on.

## CLI Surface

```sh
rekon publish architecture --root <repo> --json
rekon publish run @rekon/capability-docs.architecture-summary --root <repo> --json
rekon publish list --root <repo> --json
```

Both write paths emit the same artifact. The shortcut exists for
parity with `rekon publish agents`.

## Verification Proof Status Block

P1.1 verification-proof-surfaces-v2. The
architecture summary renders a compact
`## Verification Proof Status` block when a
`VerificationResult` exists:

- `Status: passed / failed / partial / not-run`
- `Source: manual / runner-derived / unknown`
- `Freshness: fresh / stale / missing-plan / unknown`
- `VerificationResult: <ref>`
- `VerificationRun: <ref>` (when runner-derived)

When the proof is not complete (`failed` /
`partial` / `not-run`) or not current (`stale` /
`missing-plan`), the block surfaces:

> Verification is not complete or current. Do
> not mark governed issues resolved from this
> proof alone.

For a passing, fresh result the block surfaces:

> Verification passed. Passing proof does not
> automatically resolve findings.

The block uses the shared classifier
`summarizeVerificationProofSurface` from
`@rekon/capability-intent` so it agrees with the
proof report and agent contract.

## When To Use It

- After a fresh evaluate + coherency-delta cycle, to capture a
  governance snapshot.
- After running `rekon verify record` or
  `rekon verify result from-run`, to confirm the proof loop
  is visible and the next suggested command is correct.
- Before handing repo state to an agent that does not have time to
  read every underlying artifact.
- When reviewing repository drift over time — read the latest
  publication and compare to the previous one.

For a smaller readout focused only on proof state, see the sibling
[proof report publication](proof-report-publication.md). The two
publications complement each other: the architecture summary covers
the broader governance loop; the proof report zooms into the latest
plan / result.

## CapabilityMap v2 Surfacing

This surface passed a
[publication safety review](../strategy/capability-map-v2-publication-safety-review.md)
confirming the rendered section is read-only
visibility (no mutation of `CapabilityMap`,
`CapabilityPhraseReport`,
`CapabilityNormalizationReport`, or
`EvidenceGraph`), the boundary statement is
always emitted, and the proof-report deferral is
preserved. The
[CapabilityContract Architecture Decision](../strategy/capability-contract-architecture-decision.md)
has shipped, its v1 implementation has shipped
(thirty-third slice — see
[`CapabilityContract` artifact reference](../artifacts/capability-contract.md)
and the
[`CapabilityContract` concept doc](capability-contracts.md)),
its v1 safety review has shipped
(thirty-fourth slice — see
[`CapabilityContract` v1 Safety Review](../strategy/capability-contract-v1-safety-review.md)),
and its **publication surfacing has shipped
(thirty-fifth slice)**.

The architecture summary now renders a **`##
Capability Contracts`** section sourced from the
latest `CapabilityContract`. When no contract
exists, the section renders no-contract guidance
that points operators at `rekon capability contract
generate --json`. When a contract exists, the
section surfaces the contract ref, the source
`CapabilityMap` ref, the optional config path
(`.rekon/capability-contracts.json`), summary
counts (`total` / `configured` / `unmatched` /
`suggested` / `withRequiredChecks` /
`withPlacementRules` / `withPreservationRules`),
the boundary statement (*"CapabilityContract is
policy visibility only; this publication does not
enforce linting, routing, verification planning, or
source writes."*), and a bounded contract table.

The architecture-summary publisher **reads the
latest `CapabilityContract`** and cites it in
`header.inputRefs` when present. It **never runs
`rekon capability contract generate`**, **never
mutates `CapabilityContract`**, **never mutates
`.rekon/capability-contracts.json`**, and **never
mutates `CapabilityMap`,
`CapabilityPhraseReport`, or `EvidenceGraph`**.
Surfacing is **visibility only**: it does not
enforce architecture linting, resolver routing,
verification planning, source writes, or finding
resolution.

Proof-report surfacing of `CapabilityContract`
remains explicitly **deferred**.
`CapabilityContract` is policy context, not
verification proof; the proof-report publisher
continues to render only verification-proof
context.

The
[`CapabilityContract` publication safety review](../strategy/capability-contract-publication-safety-review.md)
(thirty-sixth slice) declares the architecture
summary's Capability Contracts section **safe /
stable** as read-only visibility and recommends the
capability-aware architecture linting decision as
the next slice (strategy / decision memo only; no
implementation).

The architecture summary also renders a **`##
Capability Architecture Linting`** section sourced
from the latest `CapabilityArchitectureLintReport`
(**publication surfacing shipped, fortieth slice**).
When no lint report exists, the section renders
no-report guidance pointing operators at `rekon
capability lint architecture --json`. When a report
exists, the section surfaces the lint report ref,
the source `CapabilityContract` + `CapabilityMap`
refs, summary counts (`total` / `violations` /
`passes` / `notEvaluated`), optional byRule /
bySeverity lines, and a bounded lint-row table. The
publisher **reads the latest
`CapabilityArchitectureLintReport`** and cites it in
`header.inputRefs`; it **never runs `rekon
capability lint architecture`** and **never mutates
the lint report, `CapabilityContract`,
`CapabilityMap`, `FindingReport`,
`FindingFilterReport`, `FindingLifecycleReport`, or
`CoherencyDelta`**. The rendered surface is
**evaluation visibility only**: `violation` rows are
policy-evaluation signals, not governed findings, and
`findingCandidate` stays **preview-only**.
Proof-report surfacing of
`CapabilityArchitectureLintReport` is **deferred** —
it is policy-evaluation context, not verification
proof. The
[`CapabilityArchitectureLintReport` publication safety
review](../strategy/capability-architecture-lint-publication-safety-review.md)
(forty-first slice) declares this surfacing **safe /
stable as read-only visibility**. See
[`CapabilityArchitectureLintReport` artifact](../artifacts/capability-architecture-lint-report.md)
and
[capability-aware architecture linting concept](capability-aware-architecture-linting.md).

The architecture summary also renders a **`## Capability
Lint Finding Bridge`** section sourced from the latest
`CapabilityLintFindingBridgeReport` (**publication
surfacing shipped, forty-fifth slice**) — summary counts
(`totalRows` / `eligible` / `ineligible` / `needsReview`),
optional byReason / bySeverity lines, the eligible /
ineligible / needs-review guidance, and a bounded candidate
table; no-report guidance points at `rekon capability lint
bridge-findings --json`. The publisher **reads the latest
`CapabilityLintFindingBridgeReport`** and cites it in
`header.inputRefs`; it **never runs `rekon capability lint
bridge-findings`**, **never writes `FindingReport`**, never
mutates `FindingFilterReport`, `FindingLifecycleReport`,
`IssueAdjudicationReport`, or `CoherencyDelta`, and **never
creates `WorkOrder` or `VerificationPlan`**. `proposedFinding`
stays **preview-only**; surfacing does not imply source
writes. Proof-report surfacing of
`CapabilityLintFindingBridgeReport` is **deferred**. See the
[`CapabilityLintFindingBridgeReport` artifact](../artifacts/capability-lint-finding-bridge-report.md)
and
[capability lint finding bridge concept](capability-lint-finding-bridge.md).

The
[bridge-derived findings publication decision](../strategy/bridge-derived-findings-publication-decision.md)
(fifty-third slice) selects the **architecture summary** (and the
agent operating contract) to additionally render a read-only **`##
Bridge-Derived Findings`** section for the *governed findings the
controlled writer wrote* — distinct from the preview Capability Lint
Finding Bridge section above. That section would surface the
bridge-derived `FindingReport` entries (identified by `finding.type
=== "capability_architecture_policy"` plus `details.source*` trace
fields) with provenance and an explicit boundary statement. **The
surfacing shipped in the fifty-fourth slice** as a read-only `##
Bridge-Derived Findings` section (FindingReport ref, count, severity
distribution, bounded provenance table). The surfacing was safety-reviewed safe / stable as read-only visibility in the fifty-fifth slice. It mutates no
`FindingReport`, `FindingLifecycleReport`, `IssueAdjudicationReport`,
or `CoherencyDelta`, and creates no `WorkOrder` / `VerificationPlan`;
bridge-derived findings are governed `FindingReport` entries, not
lifecycle status. Proof-report surfacing remains **deferred**.

The summary renders a **`## CapabilityMap v2
Phrase-Backed Capabilities`** section sourced from
the latest `CapabilityMap` when the v2 fields
(`phraseBackedCapabilities`,
`phraseBackedSummary`, `phraseSourceRef`) are
populated. The section surfaces the
`CapabilityMap` ref, the consumed
`CapabilityPhraseReport` ref, summary counts
(`total` / `withDomain` / `withPattern` /
`withLayer`), optional top-verb / top-noun lines,
a boundary statement (*"These entries are
projection context, not `CapabilityContract`
placement policy. `CapabilityMap` v2 does not
imply placement policy, ownership policy,
resolver routing, architecture linting,
verification planning, or source writes."*), a
proof-report-deferral line, and a bounded table
(`| Verb | Noun | Domain | Pattern | Layer |
Evidence |`, capped at 20 rows). When the latest
`CapabilityMap` has no v2 fields, the section
renders no-report guidance and still emits the
boundary statement. **Publications never mutate
`CapabilityMap`, never re-run model projection,
and never trigger CLI commands.**

## What This Is Not

- Not canonical architecture truth. Generated docs never are. The
  publication cites its inputs; trust the inputs.
- Not the full classic generated-docs tree. There is no per-system
  generated doc set in this alpha.
- Not an AGENTS.md overwrite. Rekon does not inject content into the
  repo's root AGENTS.md.
- Not a watcher- or PR-driven publication. CLI/runtime only.
- Not a dashboard.
- Not a remediation auto-apply. The queue lists work; it does not run
  it.
- Not a verification runner. The Verification Status section reports
  the latest `VerificationResult`; it does not execute commands.
- Not a verification judge. Failed and partial verification states
  are surfaced verbatim, not scored or graded.

## Freshness

Run `rekon artifacts freshness --type Publication --json` to inspect
whether the latest architecture summary still reflects current inputs.
A newer `IntelligenceSnapshot`, `CoherencyDelta`, `OwnershipMap`,
`CapabilityMap`, `ObservedRepo`, `FindingLifecycleReport`,
`WorkOrder`, `ReconciliationPlan`, `VerificationPlan`, or
`VerificationResult` will mark the summary `stale`. Rebuild with
`rekon publish architecture`.

A `### Merge Roll-up Freshness` subsection (right
below `## Accepted Issue Merge Roll-ups`) surfaces the
lineage state of accepted merge roll-ups. Warnings
do **not** invalidate the publication structurally;
they mark the consumed merge-roll-up context as stale
for decision-making and recommend `rekon refresh`. See
[issue merge decision freshness guardrails](../strategy/issue-merge-decision-freshness-guardrails.md).

A `## Merge Candidate Decisions` section then surfaces
the accepted / rejected / undecided counts for the
latest `IssueAdjudicationReport.mergeCandidates` and
recommends `rekon issues merge candidates --undecided
--json` (plus `--superseded` / `--stale` variants when
those counts are non-zero). The section closes with
the new candidate-detail and decide commands so
operators can review and record decisions without
opening raw artifacts. See
[issue merge decision operator ergonomics](../strategy/issue-merge-decision-operator-ergonomics.md).

## Cross-References

- [Architecture summary artifact](../artifacts/architecture-summary-publication.md)
- [Coherency delta concept](coherency-delta.md)
- [Finding lifecycle concept](finding-lifecycle.md)
- [Resolvers](resolvers.md)
- [Issue merge decision freshness guardrails](../strategy/issue-merge-decision-freshness-guardrails.md)
- [Issue merge decision operator ergonomics](../strategy/issue-merge-decision-operator-ergonomics.md)
- [Issue merge decision publication / detail polish](../strategy/issue-merge-decision-publication-detail-polish.md)
- [Capability model](../strategy/capability-model.md)
- [Classic behavior distillation](../strategy/classic-behavior-distillation.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
- [PathFreshnessReport](../artifacts/path-freshness-report.md) + [Path freshness concept](path-freshness.md) — the architecture summary now renders a `## Working Tree Path Freshness` section sourced from the latest `PathFreshnessReport`. Publication generation reads the latest report and never runs `rekon paths freshness` or `rekon refresh`. **Artifact lineage freshness is not working-tree freshness; both surfaces coexist.**
- [`CapabilityOntologySuggestionReport`](../artifacts/capability-ontology-suggestion-report.md) — the architecture summary now renders a `## Capability Ontology Suggestions` section sourced from the latest `CapabilityOntologySuggestionReport`. The section is **preview-only**: it lists proposed canonical and alias additions to `.rekon/capability-ontology.json`, pins that the config remains unchanged, and emits a bounded suggestion table. Publication generation reads the latest report and never runs the suggestions CLI, never mutates the config, never mutates `CapabilityMap`. When no report exists the section emits guidance pointing the operator at `rekon capability ontology suggestions --json`.
