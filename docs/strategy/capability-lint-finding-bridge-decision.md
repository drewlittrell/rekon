# CapabilityArchitectureLintReport → FindingReport Bridge Decision

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Slice:** forty-second on the codebase-intel-classic
capability-ontology track.

**Scope:** strategy / architecture decision memo only.
This memo decides whether and how selected
`CapabilityArchitectureLintReport` rows may become
governed findings. It is the first bridge decision
between the capability-policy evaluation layer and the
existing finding / governance pipeline. **No bridge
implementation ships in this slice. No `FindingReport`
is written. No governance artifact is mutated.**

## Decision Summary

**Select Option B: introduce an intermediate
`CapabilityLintFindingBridgeReport` first.** When the
bridge work eventually begins, it emits a **preview**
artifact that classifies which
`CapabilityArchitectureLintReport` violation rows would
be *eligible* to become governed findings — without
writing `FindingReport`, mutating
`FindingFilterReport` / `FindingLifecycleReport` /
`IssueAdjudicationReport`, or touching `CoherencyDelta`.

The bridge report preserves the layered boundary:

```
lint evaluation  →  finding candidates  →  governed findings
(CapabilityArch-     (CapabilityLint-       (FindingReport →
 itectureLint-        FindingBridge-         FindingFilterReport →
 Report)              Report, preview)       FindingLifecycleReport →
                                             IssueAdjudicationReport →
                                             CoherencyDelta)
```

A direct `FindingReport` writer (Option C), direct
`FindingLifecycleReport` mutation (Option D), and direct
`CoherencyDelta` remediation (Option E) are all rejected.
A `FindingReport` writer may only be considered after the
bridge report ships and passes its own safety review, and
only via a separate explicit writer decision.

**Recommended next slice:**
`CapabilityLintFindingBridgeReport` v1 — register the
bridge report artifact and implement preview-only
projection from eligible
`CapabilityArchitectureLintReport` violation rows. Still
no `FindingReport` mutation, no lifecycle mutation, no
`CoherencyDelta` mutation, no `WorkOrder` /
`VerificationPlan` creation, no source writes.

> **Update (forty-third slice):**
> `CapabilityLintFindingBridgeReport` v1 has **shipped** as a
> preview artifact, implementing Option B. See
> [the artifact doc](../artifacts/capability-lint-finding-bridge-report.md)
> and [the concept page](../concepts/capability-lint-finding-bridge.md).
> The bridge report **does not write `FindingReport`**, does not
> mutate `FindingFilterReport` / `FindingLifecycleReport` /
> `IssueAdjudicationReport` / `CoherencyDelta`, and creates no
> `WorkOrder` / `VerificationPlan`. Only a later explicit writer
> decision may allow eligible bridge candidates to become
> governed findings. The recommended next slice is now the
> **`CapabilityLintFindingBridgeReport` safety review**.

> **Update (forty-fourth slice):** the
> [`CapabilityLintFindingBridgeReport` safety review](capability-lint-finding-bridge-report-safety-review.md)
> has **shipped** and declared v1 **safe / stable as a preview
> bridge artifact** (no blocker). The next slice is
> **`CapabilityLintFindingBridgeReport` publication surfacing**
> — read-only visibility in the architecture summary and agent
> contract; it may surface the report but must not write
> findings.

> **Update (forty-fifth slice):**
> `CapabilityLintFindingBridgeReport` publication surfacing has
> **shipped** (read-only). The architecture summary and agent
> contract render a `Capability Lint Finding Bridge` section
> without writing `FindingReport`, mutating governance
> artifacts, or creating `WorkOrder` / `VerificationPlan`. The
> next slice is the **publication safety review**; a
> `FindingReport` writer decision remains deferred behind its
> own decision + safety review.

> **Update (forty-sixth slice):** the
> [`CapabilityLintFindingBridgeReport` publication safety review](capability-lint-finding-bridge-publication-safety-review.md)
> has **shipped** and declared the surfacing **safe / stable as
> read-only visibility** (no blocker). The next slice is the
> **`CapabilityLintFindingBridgeReport` → `FindingReport` writer
> decision** — the gate that designs whether/how eligible
> preview candidates may become governed findings. Writer
> implementation and all governance integration remain deferred.

> **Update (forty-seventh slice):** the
> [`CapabilityLintFindingBridgeReport` → `FindingReport` writer
> decision](capability-lint-finding-writer-decision.md) has
> **shipped**. It selects **Option B** — a future, separate,
> opt-in `FindingReport` writer with a required dry-run preview
> and explicit confirmation. **The writer is not implemented and
> writes no `FindingReport`.** It would consume `eligible` bridge
> candidates, preserve the deterministic `proposedFinding` id,
> and write a **new** `FindingReport` artifact (no in-place
> mutation); the finding filters, lifecycle, adjudication,
> `CoherencyDelta`, `WorkOrder` / `VerificationPlan`, and source
> writes all remain downstream and untouched. The next slice is
> the **`FindingReport` writer dry-run helper / CLI** (preview
> only).

## Why This Decision Exists

`CapabilityArchitectureLintReport` now produces and
surfaces capability-policy evaluation rows
(thirty-eighth → forty-first slices). Violation rows can
carry a preview `findingCandidate` payload. Operators
have asked for a governed path from useful lint
violations into the existing finding lifecycle — but
that path must not bypass the finding-filter chain,
lifecycle status, adjudication, or `CoherencyDelta`
generation.

The risk this decision guards against is **pipeline
bypass**: a naive bridge that writes `FindingReport`
directly (or worse, mutates lifecycle / `CoherencyDelta`
directly) would skip the graph-aware finding filters, the
status ledger, and the adjudication checkpoint — the very
governance layers that keep Rekon's findings trustworthy.
By deciding for an intermediate preview report first, we
give operators (and a future writer decision) a stable,
inspectable surface to review *which* violations would
become findings before any mutation exists.

## Current Boundary

Pinned by the prior slices and unchanged here:

- `CapabilityArchitectureLintReport` is **evaluation, not
  enforcement**.
- `findingCandidate` on violation rows is **preview-only**
  and writes no `FindingReport`.
- No `FindingReport` mutation exists.
- No `FindingFilterReport` / `FindingLifecycleReport` /
  `IssueAdjudicationReport` mutation exists.
- No `CoherencyDelta` mutation exists.
- Publication surfacing (architecture summary + agent
  contract) is read-only visibility only.

This decision does not change any of that. It decides the
*shape* of the future bridge, not its behavior.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| no bridge | rejected/deferred | violations need a governed path |
| bridge report first | selected | preserves review boundary |
| direct FindingReport writer | rejected | too much blast radius |
| direct lifecycle mutation | rejected | lifecycle is downstream |
| direct CoherencyDelta mutation | rejected | skips finding governance |

- **Option A — No bridge.** Keep lint reports visible
  only. *Rejected / deferred.* Visibility alone does not
  let capability-policy violations enter governed
  remediation; operators have a real need for a path.
- **Option B — Intermediate bridge report first.** Emit
  `CapabilityLintFindingBridgeReport` from eligible lint
  violation rows. *Selected.* Preserves the review
  boundary before any `FindingReport` write exists.
- **Option C — Direct `FindingReport` writer.** Selected
  lint violations become `FindingReport` entries
  immediately. *Rejected for v1.* Too much blast radius;
  bypasses the bridge safety review.
- **Option D — Direct `FindingLifecycleReport`
  mutation.** *Rejected.* Lifecycle is downstream of
  governed findings, not of lint evaluation.
- **Option E — Direct `CoherencyDelta` remediation.**
  *Rejected.* Skips `FindingReport`, filters, lifecycle,
  and adjudication.

## Recommendation

Adopt Option B. The next implementation slice registers
`CapabilityLintFindingBridgeReport` and emits it as a
**preview / dry-run artifact only** — it classifies lint
rows into eligible / ineligible / needs-review and
attaches a `proposedFinding` payload to eligible rows,
but writes no `FindingReport` and mutates no governance
artifact. A bridge safety review follows, then (only if
explicitly approved) a separate `FindingReport` writer
decision.

## Bridge Artifact Model

Recommended name: **`CapabilityLintFindingBridgeReport`**
(the bridge sits between capability lint evaluation and
governed findings — it is neither the lint report nor
`FindingReport`). Alternatives considered:
`CapabilityArchitectureFindingCandidateReport`,
`CapabilityArchitectureLintFindingBridgeReport`.

Sketch only — **not implemented in this slice**:

```ts
type CapabilityLintFindingBridgeDecision =
  | "eligible"
  | "ineligible"
  | "needs-review";

type CapabilityLintFindingBridgeReason =
  | "violation-with-finding-candidate"
  | "not-a-violation"
  | "missing-finding-candidate"
  | "low-confidence"
  | "not-evaluated"
  | "duplicate-candidate"
  | "manual-review-required";

type CapabilityLintFindingBridgeReport = {
  header: ArtifactHeader;
  source: {
    lintReportRef: ArtifactRef;
    capabilityContractRef?: ArtifactRef;
    capabilityMapRef?: ArtifactRef;
  };
  summary: {
    totalRows: number;
    eligible: number;
    ineligible: number;
    needsReview: number;
    byReason: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  candidates: Array<{
    id: string;
    lintRowId: string;
    contractId: string;
    phraseCapabilityId: string;
    decision: CapabilityLintFindingBridgeDecision;
    reason: CapabilityLintFindingBridgeReason;
    severity: "low" | "medium" | "high";
    confidence: "low" | "medium" | "high";
    proposedFinding?: {
      id: string;
      title: string;
      category: string;
      severity: "low" | "medium" | "high";
      evidenceRefs: ArtifactRef[];
      sourceLintRowRef: { report: ArtifactRef; rowId: string };
    };
    messages?: string[];
  }>;
};
```

The `proposedFinding` payload is **preview** shape only —
it describes what a future `FindingReport` entry *would*
look like, so a later writer decision has a stable target.
It is never itself a `FindingReport` entry.

## Eligibility Policy

V1 eligibility (pinned for the bridge-report
implementation slice):

| Row Property | V1 Decision |
| --- | --- |
| status violation | required |
| findingCandidate | required |
| confidence high/medium | required |
| severity high/medium | required |
| evidenceRefs | required |
| pass rows | ineligible |
| not-evaluated rows | ineligible |
| low severity/confidence | ineligible |

A lint row is **eligible** only when *all* of: status is
`violation`; it carries a `findingCandidate`; confidence
is `high` or `medium`; severity is `high` or `medium`; and
it has `evidenceRefs`.

A row is **ineligible** when: status is `pass`; status is
`not-evaluated`; there is no `findingCandidate`; confidence
is low; or severity is low (unless a later decision
explicitly enables low-severity bridging).

A row is **needs-review** when: a duplicate candidate id
conflict occurs; the evidence chain is missing; or the
category mapping is uncertain.

**No automatic `FindingReport` writing in v1** — even an
`eligible` row only yields a `proposedFinding` preview.

## Finding Id Policy

Proposed deterministic id (sketch only):

```
capability-architecture-policy:<rule>:<contractId>:<phraseCapabilityId>
```

Rules:

- Deterministic across runs.
- Does **not** include a timestamp.
- Preserves the source lint row (`sourceLintRowRef`).
- Duplicate candidates collapse deterministically (same
  id → one candidate, conflicts flagged `needs-review`).

A deterministic id matters so that, if a future writer
ships, repeated bridge runs map a recurring violation to
the *same* prospective finding id rather than spawning
duplicates through the lifecycle.

## Governance Boundary

| Boundary | Decision |
| --- | --- |
| bridge report vs FindingReport | no FindingReport writes |
| bridge report vs FindingFilterReport | no filter mutation |
| bridge report vs FindingLifecycleReport | no lifecycle mutation |
| bridge report vs IssueAdjudicationReport | no adjudication mutation |
| bridge report vs CoherencyDelta | no remediation mutation |
| bridge report vs WorkOrder | no work-order creation |
| bridge report vs VerificationPlan | no verification-plan generation |

Pinned verbatim:

- **`CapabilityLintFindingBridgeReport` is preview, not
  `FindingReport`.**
- **`CapabilityLintFindingBridgeReport` does not write
  `FindingReport` in v1.**
- **`CapabilityLintFindingBridgeReport` does not mutate
  `FindingFilterReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, or `CoherencyDelta`.**
- **Only a later explicit writer decision may allow bridge
  candidates to become `FindingReport` entries.**
- **Even after `FindingReport` writing exists,
  `FindingLifecycleReport` / `IssueAdjudicationReport` /
  `CoherencyDelta` must remain downstream lifecycle
  stages.**

## Future Sequence

| Step | Gate |
| --- | --- |
| CapabilityLintFindingBridgeReport v1 | preview artifact only |
| bridge safety review | required before writer |
| FindingReport writer decision | required before mutation |
| FindingReport writer implementation | explicit approval only |
| lifecycle / CoherencyDelta integration | downstream, separate slices |

When a `FindingReport` writer eventually ships, governed
findings produced from bridged candidates must still flow
through the existing graph-aware finding filters, the
status ledger, the adjudication checkpoint, and only then
into `CoherencyDelta` — the bridge does not get to skip
any of those stages.

## What This Does Not Do

This memo is strategy only. It does not implement the
bridge, does not register
`CapabilityLintFindingBridgeReport`, does not emit
`FindingReport` entries, does not mutate `FindingReport`,
`FindingFilterReport`, `FindingLifecycleReport`,
`IssueAdjudicationReport`, or `CoherencyDelta`, does not
create `WorkOrder` or `VerificationPlan`, does not add
resolver routing or verification planning, does not add
`RefactorPreservationContract`, does not add source
writes, does not use LLM inference, does not publish to
npm, and does not bump versions.

## Implementation Sequence

1. **Decision memo** — this slice (forty-second).
2. **`CapabilityLintFindingBridgeReport` v1** —
   dry-run / preview artifact only: register the artifact
   type, implement a pure preview projection from eligible
   `CapabilityArchitectureLintReport` violation rows, add
   a CLI command. No `FindingReport` mutation.
3. **Bridge safety review** — read-only audit confirming
   the preview is safe / stable and writes nothing.
4. **Optional `FindingReport` writer decision** — a
   separate explicit decision on whether bridge candidates
   may become governed findings.
5. **`FindingReport` writer implementation** — only if
   step 4 explicitly approves it; governed findings flow
   through filters → lifecycle → adjudication →
   `CoherencyDelta` as usual.

## Cross-References

- [Capability-Aware Architecture Linting Decision](capability-aware-architecture-linting-decision.md)
  — thirty-seventh slice; Option B (separate evaluation
  artifact) that this bridge builds on.
- [`CapabilityArchitectureLintReport` safety review](capability-architecture-lint-report-safety-review.md)
  — thirty-ninth slice.
- [`CapabilityArchitectureLintReport` publication safety review](capability-architecture-lint-publication-safety-review.md)
  — forty-first slice; un-blocks this bridge decision.
- [`CapabilityArchitectureLintReport` artifact](../artifacts/capability-architecture-lint-report.md)
- [Capability-Aware Architecture Linting concept](../concepts/capability-aware-architecture-linting.md)
- [FindingReport artifact](../artifacts/finding-report.md)
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [Finding lifecycle concept](../concepts/finding-lifecycle.md)
- [Coherency delta concept](../concepts/coherency-delta.md)
- [Remediation work orders concept](../concepts/remediation-work-orders.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
