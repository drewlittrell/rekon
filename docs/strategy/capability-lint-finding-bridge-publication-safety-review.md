# CapabilityLintFindingBridgeReport Publication Safety Review

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Slice:** forty-sixth on the codebase-intel-classic
capability-ontology track. Strategy / safety-review batch.
Follows `CapabilityLintFindingBridgeReport` publication
surfacing (shipped at `41e0f32`).

## Decision Summary

`CapabilityLintFindingBridgeReport` publication surfacing is
**safe / stable as read-only visibility.** The end-to-end
review confirms the architecture summary and agent contract
sections are read-only, preserve the preview-vs-governed-finding
boundary, keep proof-report surfacing deferred, and imply no
governed-finding mutation or downstream remediation behavior.

**CapabilityLintFindingBridgeReport publication surfacing is
read-only visibility.** **CapabilityLintFindingBridgeReport is
preview, not FindingReport.** **proposedFinding is preview-only
and writes no FindingReport.** **CapabilityLintFindingBridgeReport
publication surfacing does not imply FindingReport mutation,
FindingLifecycleReport mutation, IssueAdjudicationReport
mutation, CoherencyDelta mutation, WorkOrder creation,
VerificationPlan creation, resolver routing, verification
planning, RefactorPreservationContract behavior, or source-write
permission.**

No blocker was found. **FindingReport writer decision work may
begin after this safety review if no blockers are found.**
Recommended next slice: **CapabilityLintFindingBridgeReport →
FindingReport writer decision.**

> **Update (forty-seventh slice):** the
> [`CapabilityLintFindingBridgeReport` → `FindingReport` writer
> decision](capability-lint-finding-writer-decision.md) has
> **shipped**. It selects **Option B** — a future, separate,
> opt-in `FindingReport` writer with a required dry-run preview
> and explicit confirmation; **the writer is not implemented**.
> No `FindingReport` entries are written; the writer would write
> a new `FindingReport` artifact (no in-place mutation), and
> `FindingFilterReport` / `FindingLifecycleReport` /
> `IssueAdjudicationReport` / `CoherencyDelta` /
> `WorkOrder` / `VerificationPlan` / source writes all remain
> downstream and untouched. The next slice is the
> **`FindingReport` writer dry-run helper / CLI** (preview only).

## Why This Review Exists

`CapabilityLintFindingBridgeReport` is now visible in the main
operator/agent publications. Visibility is useful, but
finding-bridge language is enforcement-adjacent: an operator or
agent could mistake an `eligible` preview candidate for a
governed finding, or read the surfacing as authorization to
write `FindingReport`, mutate the finding lifecycle, drive
`CoherencyDelta` remediation, or open a `WorkOrder`. Before any
`FindingReport` writer decision begins, Rekon must verify that
publication surfacing remains read-only and implies no
governed-finding mutation or downstream remediation. This memo
is that gate.

## Publication Surfaces Reviewed

| Surface | Status | Boundary |
| --- | --- | --- |
| architecture summary | shipped | read-only operator visibility |
| agent contract | shipped | read-only agent guidance |
| proof report | deferred | preview bridge context is not proof |

Reviewed in detail:

- **`buildCapabilityLintFindingBridgePublicationSection`**
  (`@rekon/capability-docs`): a pure, structurally-typed helper.
  Given a report it renders the bridge ref, the source
  `CapabilityArchitectureLintReport` ref, optional
  `CapabilityContract` / `CapabilityMap` refs, summary counts
  (`totalRows` / `eligible` / `ineligible` / `needsReview`),
  optional byReason / bySeverity, the eligible / ineligible /
  needs-review guidance, a bounded candidate table (cap 20), and
  the boundary line. Given no report it renders no-report
  guidance pointing at `rekon capability lint bridge-findings
  --json`. It reads nothing and writes nothing — it only returns
  rendered lines plus the resolved `inputRef`.
- **Architecture summary** (`## Capability Lint Finding
  Bridge`, level 2) and **agent contract** (`### Capability Lint
  Finding Bridge`, level 3): both publishers read the latest
  `CapabilityLintFindingBridgeReport`, render the section, and
  cite the report in `header.inputRefs`. Both render no-report
  guidance when absent.
- **Contract test**
  (`tests/contract/capability-lint-finding-bridge-publications.test.mjs`,
  23 assertions) and **docs test** (11 assertions) cover the
  helper, the citation, the guidance, the Do Not Do reminder,
  and — via before/after artifact-index digest snapshots — that
  publishing mutates no `CapabilityLintFindingBridgeReport`,
  `CapabilityArchitectureLintReport`, `FindingReport`,
  `FindingLifecycleReport`, or `CoherencyDelta`, and creates no
  `WorkOrder` or `VerificationPlan`, with `artifacts validate`
  clean.
- **CLI smoke** (implementation batch): on the
  `js-ts-ast-evidence` fixture both publications render the
  `Capability Lint Finding Bridge` section, `artifacts validate`
  is clean, and publications write only `Publication-*`
  artifacts.

## Read-Only Guarantee

**Publications read the latest CapabilityLintFindingBridgeReport;
they never run `rekon capability lint bridge-findings`.** The
publishers' only bridge interaction is `latestRef` +
`artifacts.read`; the only write is the publication artifact
itself. The `@rekon/capability-docs` manifest lists
`CapabilityLintFindingBridgeReport` under `consumes` and adds
the `capability-lint-finding-bridge.changed` invalidation rule —
both read-only signals. No publisher path runs bridge
generation, mutates the bridge report, or mutates any governance
artifact. **Finding: the surfacing is read-only.**

The eligible / ineligible / needs-review decisions and the
`proposedFinding` payload are surfaced verbatim from the report;
the guidance bullets explain each decision (eligible = proposed
candidate only; ineligible = not bridge-ready; needs-review =
operator review required) so a reader does not mistake a preview
candidate for a governed finding. **Finding: the candidate
semantics are understandable enough for v1.**

## Boundary Statement Review

| Overclaim Risk | Guardrail |
| --- | --- |
| treated as FindingReport writing | explicit boundary statement + Do Not Do |
| treated as FindingLifecycleReport mutation | explicit boundary statement + Do Not Do |
| treated as IssueAdjudicationReport mutation | explicit boundary statement + Do Not Do |
| treated as CoherencyDelta mutation | explicit boundary statement + Do Not Do |
| treated as WorkOrder creation | explicit boundary statement + Do Not Do |
| treated as VerificationPlan creation | explicit boundary statement + Do Not Do |
| treated as resolver routing | explicit boundary statement + Do Not Do |
| treated as verification planning | explicit boundary statement + Do Not Do |
| treated as RefactorPreservationContract | explicit boundary statement + Do Not Do |
| treated as source-write permission | explicit boundary statement + Do Not Do |

Every rendered section carries the boundary line:
*"CapabilityLintFindingBridgeReport is preview visibility only;
this publication does not write FindingReport, mutate lifecycle
state, mutate CoherencyDelta, create WorkOrders, create
VerificationPlans, or write source files."* Combined with the
agent-contract Do Not Do reminder, all ten overclaim risks are
covered. **Finding: boundary statements are visible enough.**

## Agent Contract Do Not Do Review

The agent contract `## Do Not Do` list carries a verbatim
reminder: *"Do not treat CapabilityLintFindingBridgeReport
publication surfacing as FindingReport writing, lifecycle
mutation, CoherencyDelta remediation, WorkOrder creation,
VerificationPlan generation, resolver routing, verification
planning, RefactorPreservationContract, or source-write
permission."* This covers every major overclaim risk in the
boundary table. **Finding: the Do Not Do reminder is
sufficient.**

## Proof Report Deferral

**Proof report surfacing remains deferred because
CapabilityLintFindingBridgeReport is preview/governance-candidate
context, not verification proof.** Surfacing eligible /
ineligible / needs-review preview rows in the proof report would
conflate governance-candidate context with verification proof.
The proof-report deferral is documented in the bridge artifact +
concept docs and the proof-report publication docs. **Finding:
the deferral is still correct.**

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare surfacing safe/stable | selected | read-only and bounded |
| FindingReport writer decision next | selected | writer boundary must be designed before mutation |
| more publication polish first | deferred | no blocker found |
| lifecycle/CoherencyDelta integration next | rejected | FindingReport writer boundary must come first |
| resolver routing next | rejected | routing should wait for governed finding boundary |
| verification planning next | rejected | planning should wait for governed finding boundary |

## Recommendation

`CapabilityLintFindingBridgeReport` publication surfacing is
**safe / stable as read-only visibility.** Proceed to the
**`CapabilityLintFindingBridgeReport` → `FindingReport` writer
decision**: the bridge artifact is generated, safety-reviewed,
and visible; the next boundary to design is whether and how
eligible preview candidates may become governed `FindingReport`
entries. **FindingReport writer decision work may begin after
this safety review if no blockers are found.**

## What This Does Not Do

This review changes no runtime behavior. It does not modify the
publication helper or publishers, change bridge generation, or
implement a `FindingReport` writer. Restating the invariants:

- **CapabilityLintFindingBridgeReport publication surfacing is
  read-only visibility.**
- **CapabilityLintFindingBridgeReport is preview, not
  FindingReport.**
- **proposedFinding is preview-only and writes no
  FindingReport.**
- **CapabilityLintFindingBridgeReport publication surfacing does
  not imply FindingReport mutation, FindingLifecycleReport
  mutation, IssueAdjudicationReport mutation, CoherencyDelta
  mutation, WorkOrder creation, VerificationPlan creation,
  resolver routing, verification planning,
  RefactorPreservationContract behavior, or source-write
  permission.**

## Follow-Up Work

Deferred, each gated behind its own decision and (where it
mutates governance) its own safety review:

- `FindingReport` writer implementation.
- `FindingReport` mutation.
- `FindingFilterReport` / `FindingLifecycleReport` /
  `IssueAdjudicationReport` mutation.
- `CoherencyDelta` integration.
- `WorkOrder` / `VerificationPlan` creation.
- resolver routing by capability.
- verification planning by capability.
- `RefactorPreservationContract`.
- source writes.

Immediate next slice: **CapabilityLintFindingBridgeReport →
FindingReport writer decision** (strategy / decision memo only;
still no writer implementation, no lifecycle mutation, no
`CoherencyDelta` mutation, no `WorkOrder` / `VerificationPlan`
creation, no resolver routing, no verification planning, no
source writes).
