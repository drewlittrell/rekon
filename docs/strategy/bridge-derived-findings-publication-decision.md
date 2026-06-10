# Bridge-Derived Findings Publication Decision

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> Fifty-third slice on the capability-ontology track. Strategy /
> architecture decision only. **No publication behavior is
> implemented in this slice.** This memo follows the
> [FindingReport writer safety review](capability-lint-finding-writer-safety-review.md)
> (fifty-second slice), which declared the controlled, opt-in
> `FindingReport` writer **safe / stable**.

## Decision Summary

The controlled `FindingReport` writer (`rekon capability lint
write-findings --confirm-finding-write`) can now promote `eligible`
`CapabilityLintFindingBridgeReport` candidates into a **new**, governed
`FindingReport`. Those written findings need an operator/agent surface
so a reader can tell a bridge-derived finding from an ordinary
evaluator finding — **before** any lifecycle, adjudication, or
`CoherencyDelta` integration is designed.

**Decision: Option B — surface bridge-derived `FindingReport` entries
in the architecture summary and the agent operating contract first.**
The proof report continues to **defer** bridge-derived findings:
finding provenance is governance context, not verification proof.

This is a **decision-only** batch. It does not implement publication
surfacing, change the `FindingReport` writer, mutate any artifact, or
write source files. It records what the next implementation slice will
build and the boundaries that slice must hold.

The pinned conclusions:

- Bridge-derived findings are governed FindingReport entries, not lifecycle status.
- Publication surfacing does not mutate FindingReport.
- Publication surfacing does not mutate FindingLifecycleReport, IssueAdjudicationReport, or CoherencyDelta.
- Publication surfacing does not create WorkOrder or VerificationPlan.
- Proof report surfacing remains deferred.
- Lifecycle and CoherencyDelta integration remain downstream.

## Why This Decision Exists

The original problem this slice resolves:

- Bridge-derived `FindingReport` entries can now be written safely
  (fifty-first slice writer + fifty-second slice safety review).
- Operators and agents need to distinguish bridge-derived findings
  from ordinary evaluator findings, with provenance back to the lint
  row, contract, and phrase-backed capability.
- Before lifecycle / `CoherencyDelta` integration, the written
  findings need a clear operator surface so the signal is visible and
  traceable.
- The surface must **not** imply lifecycle status, adjudication,
  remediation readiness, `WorkOrder`, `VerificationPlan`, or
  source-write behavior.

The product guarantee the surface must keep:

- Bridge-derived findings become **visible and traceable**.
- Publications show **source provenance** when it is present.
- Publications **do not mutate** findings or governance artifacts.
- Lifecycle / `CoherencyDelta` integration **remains downstream**.
- `WorkOrder` / `VerificationPlan` creation **remains downstream**.

The capability-ontology track already surfaces upstream artifacts
(`CapabilityContract`, `CapabilityArchitectureLintReport`,
`CapabilityLintFindingBridgeReport`) as **read-only visibility** in the
architecture summary and agent contract, with the proof report
deferring each one. Surfacing bridge-derived findings the same way
keeps the publication model coherent: the operator surfaces show
governance context; the proof report stays focused on verification
proof.

## Current Boundary

What ships today (unchanged by this memo):

- The writer is **opt-in** and requires `--confirm-finding-write`.
- Dry-run remains **preview-only** and writes nothing.
- The writer writes **exactly one new** `FindingReport` on success.
- The writer **does not mutate** an existing `FindingReport` in place.
- The writer mutates **no** `FindingFilterReport`,
  `FindingLifecycleReport`, `IssueAdjudicationReport`, or
  `CoherencyDelta`.
- The writer creates **no** `WorkOrder` / `VerificationPlan` and writes
  **no** source files.
- Lifecycle and `CoherencyDelta` integration **remain downstream**.

The bridge report itself is already surfaced as **preview-only**
visibility in the architecture summary and agent contract (forty-fifth
slice). That surfacing renders **candidates** (`eligible` /
`ineligible` / `needs-review`) and `proposedFinding` previews — it does
**not** render written, governed findings. This decision is about a
distinct, later surface: **the findings the writer actually wrote**.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| no special surfacing | rejected/deferred | provenance would be hidden |
| architecture summary + agent contract first | selected | normal operator/agent surfaces |
| proof report too | rejected/deferred | governance context is not proof |
| dedicated publication | deferred | existing surfaces first |
| lifecycle / CoherencyDelta first | rejected | publication visibility before integration |

**Option A — No special surfacing.** Let bridge-derived findings
appear only as ordinary `FindingReport` entries with no distinguishing
section. *Rejected / deferred:* operators need provenance and
bridge-derived context before lifecycle integration; hiding the
provenance would force readers to reverse-engineer `finding.details`
by hand.

**Option B — Architecture summary + agent contract first.** Show
bridge-derived findings in the architecture summary and the agent
operating contract as a dedicated, read-only section with provenance.
*Selected:* these are the normal operator/agent surfaces and already
carry the upstream capability sections, so the new section slots in
without proof-report confusion.

**Option C — Proof report too.** Additionally show bridge-derived
findings in the proof report. *Rejected / deferred:* finding
provenance is governance context, not verification proof; the proof
report stays focused on plan / result state, consistent with every
prior capability-track deferral.

**Option D — Dedicated publication.** Create a standalone
bridge-derived findings publication. *Deferred:* this could be useful
later, but the existing publications should surface the signal first;
a new publication kind is a larger commitment that is not yet
justified.

**Option E — Lifecycle / `CoherencyDelta` integration first.** Move
written findings into lifecycle / remediation before any publication
surfacing. *Rejected:* operators should inspect the written findings
and their provenance before downstream integration is designed;
visibility precedes integration.

## Recommendation

Proceed with **Option B**. The next implementation slice surfaces
bridge-derived `FindingReport` entries in the **architecture summary**
and the **agent operating contract** as read-only visibility with
provenance. Proof-report surfacing remains **deferred**.

Rationale: the architecture summary and agent contract are the normal
operator/agent surfaces. They can show bridge-derived findings as
governed findings with provenance while preserving the downstream
lifecycle boundary. The proof report would conflate governance context
with verification proof, so it is deferred — matching the
`CapabilityContract`, `CapabilityArchitectureLintReport`, and
`CapabilityLintFindingBridgeReport` deferrals already in place.

Answers to the required decision questions:

1. **Should bridge-derived `FindingReport` entries be surfaced
   specially?** Yes. A dedicated, clearly labeled section with
   provenance — not buried in ordinary finding counts.
2. **Which surfaces render them first?** The architecture summary and
   the agent operating contract.
3. **Should the proof report include bridge-derived findings?** No.
   Proof-report surfacing remains deferred.
4. **How should publications distinguish bridge-derived findings from
   ordinary findings?** By the `capability_architecture_policy` finding
   type plus the `details.source = "capability-lint-bridge"` marker and
   the `details.source*` trace fields — never by title text alone.
5. **Should publications cite
   `CapabilityLintFindingBridgeReport` /
   `CapabilityArchitectureLintReport` / `CapabilityContract` /
   `CapabilityMap`?** Yes, when those refs are present in the
   `FindingReport` `inputRefs` or the finding `details` /
   `evidenceRefs`. When a ref is not available, show whatever
   provenance is present and do not invent refs.
6. **Should any publication imply lifecycle status or remediation
   readiness?** No.
7. **Should lifecycle / `CoherencyDelta` integration happen before or
   after publication surfacing?** After. Surface first, then review,
   then decide integration.
8. **What implementation slice follows?** Bridge-derived findings
   publication surfacing in the architecture summary + agent contract
   (read-only, provenance-bearing), followed by a publication
   surfacing safety review.

## Publication Model

Sketch only; **not implemented in this slice**. The implementation
slice will render a dedicated section sourced from the latest
`FindingReport`, filtered to bridge-derived findings.

Architecture summary section heading:

```markdown
## Bridge-Derived Findings
```

Agent contract subsection heading:

```markdown
### Bridge-Derived Findings
```

Required content (both surfaces):

- count of bridge-derived findings;
- severity distribution;
- source bridge report refs when available;
- source lint row / contract / phrase references when available
  through finding `details`;
- a bounded table of findings with columns:
  - id
  - title
  - severity
  - source bridge candidate
  - source lint row
- an explicit boundary statement:

  > Bridge-derived findings are governed FindingReport entries, but
  > this publication does not update lifecycle status, adjudication,
  > CoherencyDelta, WorkOrders, VerificationPlans, or source files.

No-report / no-bridge-derived guidance (when the latest
`FindingReport` carries no bridge-derived entries, or no
`FindingReport` exists):

> No bridge-derived FindingReport entries found. Run the bridge
> dry-run / writer flow only if approved.

The agent contract additionally carries a `Do Not Do` reminder so an
agent never reads the section as lifecycle status or as permission to
mutate governance artifacts, create `WorkOrder` / `VerificationPlan`,
or write source files.

## Source Identification Policy

The implementation slice identifies bridge-derived findings using one
or more deterministic signals on the governed `Finding`, never title
text alone:

| Signal | Use |
| --- | --- |
| finding.type = capability_architecture_policy | primary category signal |
| sourceBridgeCandidateId | bridge provenance |
| sourceLintRowId | lint-row provenance |
| sourceContractId | contract provenance |
| sourcePhraseCapabilityId | phrase-capability provenance |

These signals match what the fifty-first slice writer actually
persists: `finding.type` is set from the preview finding's
`category` (`capability_architecture_policy`), and the trace fields
live under `finding.details` (`source = "capability-lint-bridge"`,
`sourceBridgeCandidateId`, `sourceLintRowId`, `sourceContractId`,
`sourcePhraseCapabilityId`). The `details.source` marker is an
additional reliable discriminator. **Do not rely only on title
text.**

## Citation Policy

When source trace fields exist, publications should cite:

```text
FindingReport
CapabilityLintFindingBridgeReport if present in inputRefs or details
CapabilityArchitectureLintReport if present
CapabilityContract if present
CapabilityMap if present
EvidenceGraph via evidenceRefs when already cited/available
```

If not all refs are available, **show whatever provenance is present
and do not invent refs.** The publisher reads the latest
`FindingReport`, filters to bridge-derived findings, and cites the
artifacts it actually read in `header.inputRefs` — consistent with
every other publication section.

## Governance Boundary

The implementation slice is **read-only visibility**. The pinned
boundaries:

- Bridge-derived findings are governed FindingReport entries, not lifecycle status.
- Publication surfacing does not mutate FindingReport.
- Publication surfacing does not mutate FindingLifecycleReport, IssueAdjudicationReport, or CoherencyDelta.
- Publication surfacing does not create WorkOrder or VerificationPlan.
- Proof report surfacing remains deferred.
- Lifecycle and CoherencyDelta integration remain downstream.

| Boundary | Decision |
| --- | --- |
| publication vs FindingReport | no mutation |
| publication vs FindingLifecycleReport | no mutation |
| publication vs IssueAdjudicationReport | no mutation |
| publication vs CoherencyDelta | no mutation |
| publication vs WorkOrder | no creation |
| publication vs VerificationPlan | no creation |
| publication vs source files | no writes |

The surface table that pins which publications render bridge-derived
findings first:

| Surface | Decision |
| --- | --- |
| architecture summary | selected |
| agent contract | selected |
| proof report | deferred |
| dedicated publication | deferred |

## Future Sequence

Lifecycle and `CoherencyDelta` integration of bridge-derived findings
**remain downstream** and are out of scope for both this decision and
the publication-surfacing slice that follows it. The integration
decision happens **only after** publication surfacing has shipped and
been safety-reviewed, so operators can inspect the written findings and
their provenance first. The proof report continues to defer
bridge-derived findings until — and unless — a separate decision +
safety-review pair defines a natural section for it.

## What This Does Not Do

- It does **not** implement publication surfacing.
- It does **not** change `FindingReport` writer behavior.
- It does **not** mutate `FindingReport`.
- It does **not** mutate `FindingFilterReport`,
  `FindingLifecycleReport`, `IssueAdjudicationReport`, or
  `CoherencyDelta`.
- It does **not** create `WorkOrder` or `VerificationPlan`.
- It does **not** add resolver routing or verification planning by
  capability.
- It does **not** add a `RefactorPreservationContract`.
- It does **not** write source files or add LLM-only inference.
- It does **not** publish to npm or bump versions.
- It does **not** imply proof-report inclusion.

## Implementation Sequence

1. **Decision memo — this slice.** Records Option B, the publication
   model sketch, the source-identification and citation policies, and
   the governance boundary.
2. **Architecture summary + agent contract surfacing implementation.**
   A `buildBridgeDerivedFindingsPublicationSection`-style helper reads
   the latest `FindingReport`, filters to bridge-derived findings, and
   renders the read-only section in both publishers with provenance and
   the boundary statement. Proof report unchanged.
3. **Publication surfacing safety review.** Read-only review confirming
   the surfacing mutates nothing, cites real refs, and preserves the
   proof-report deferral.
4. **Lifecycle / `CoherencyDelta` integration decision — only after
   surfacing is reviewed.**

## Surfacing Implementation (Fifty-Fourth Slice)

Step 2 of the implementation sequence **has shipped** (fifty-fourth
slice). The pure helper
`@rekon/capability-docs.buildBridgeDerivedFindingsPublicationSection`
reads the latest `FindingReport`, filters to bridge-derived findings
(identified by `finding.type === "capability_architecture_policy"`, by
`finding.details.source === "capability-lint-bridge"`, or by any
`finding.details.source*` trace field — never by title text alone),
and renders a read-only, provenance-bearing section. Both publishers
wire it in: the **architecture summary** renders `## Bridge-Derived
Findings` and the **agent operating contract** renders `###
Bridge-Derived Findings` plus a `Do Not Do` reminder. The
`@rekon/capability-docs` manifest now consumes `FindingReport` and a
`bridge-derived-findings.changed` invalidation rule regenerates both
publications when a new `FindingReport` lands.

The shipped surfacing is read-only and bounded:

- The architecture summary surfaces bridge-derived findings.
- The agent operating contract surfaces bridge-derived findings.
- Proof report surfacing remains deferred.
- Publications read the latest FindingReport.
- Publications do not run the bridge writer.
- Publications do not mutate FindingReport, FindingLifecycleReport, IssueAdjudicationReport, or CoherencyDelta.
- Publications do not create WorkOrder or VerificationPlan.
- Bridge-derived findings are governed FindingReport entries, not lifecycle status.
- Lifecycle and CoherencyDelta integration remain downstream.

The bridge-derived findings publication safety
review **shipped in the fifty-fifth slice** (declared the surfacing
safe / stable), after which the `FindingLifecycleReport` /
`IssueAdjudicationReport` / `CoherencyDelta` integration decision may
begin. That integration decision **shipped in the fifty-sixth slice**
and selected a `BridgeFindingLifecycleIntegrationReport` preview
artifact first (no lifecycle / adjudication / `CoherencyDelta`
mutation).

## Cross-References

- [FindingReport writer safety review](capability-lint-finding-writer-safety-review.md)
- [FindingReport writer mode decision](capability-lint-finding-writer-mode-decision.md)
- [FindingReport writer dry-run safety review](capability-lint-finding-writer-dry-run-safety-review.md)
- [CapabilityLintFindingBridgeReport → FindingReport writer decision](capability-lint-finding-writer-decision.md)
- [FindingReport artifact](../artifacts/finding-report.md)
- [CapabilityLintFindingBridgeReport artifact](../artifacts/capability-lint-finding-bridge-report.md)
- [Capability lint finding bridge concept](../concepts/capability-lint-finding-bridge.md)
- [Finding lifecycle concept](../concepts/finding-lifecycle.md)
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [Coherency delta concept](../concepts/coherency-delta.md)
- [Remediation work orders concept](../concepts/remediation-work-orders.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [Architecture summary publication concept](../concepts/architecture-summary-publication.md) +
  [artifact](../artifacts/architecture-summary-publication.md)
- [Agent operating contract concept](../concepts/agent-operating-contract.md) +
  [artifact](../artifacts/agent-contract-publication.md)
- [Proof report publication concept](../concepts/proof-report-publication.md) +
  [artifact](../artifacts/proof-report-publication.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
