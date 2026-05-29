# CapabilityLintFindingBridgeReport → FindingReport Writer Decision

**Slice:** forty-seventh on the codebase-intel-classic
capability-ontology track. Strategy / architecture decision
batch. Follows the
[`CapabilityLintFindingBridgeReport` publication safety review](capability-lint-finding-bridge-publication-safety-review.md)
(shipped at `f671f4f`).

## Decision Summary

Rekon **should** allow eligible `CapabilityLintFindingBridgeReport`
candidates to become governed `FindingReport` entries — but only
through a **future, separate, opt-in writer** that requires a
**dry-run preview** and an **explicit confirmation** flag before
it writes anything. This is **Option B**.

This is a **decision-only** batch. **No FindingReport entries are
written in this decision slice.** No writer is implemented, no
governance artifact is mutated, no `WorkOrder` or
`VerificationPlan` is created, no resolver routing or verification
planning is added, and no source file is written.

The pinned boundary from the prior slices still holds:

- **CapabilityLintFindingBridgeReport is preview, not
  FindingReport.**
- **proposedFinding is preview-only and writes no FindingReport.**
- **Publication surfacing is read-only visibility.**
- **Only a later explicit writer decision may allow eligible
  bridge candidates to become governed findings.** This memo is
  that writer decision; it selects the *posture* (opt-in,
  dry-run-first, explicit confirmation) and **defers the
  implementation** to its own slice and safety review.

Recommended next slice: **CapabilityLintFindingBridgeReport →
FindingReport writer dry-run helper / CLI** (dry-run preview only;
reads the bridge report, selects eligible candidates, builds the
proposed `FindingReport` body, writes no `FindingReport`).

## Why This Decision Exists

Eligible `CapabilityLintFindingBridgeReport` candidates are now
generated, safety-reviewed, and visible in the architecture
summary and agent contract publications. They still do **not**
enter the governed findings pipeline. The open question is whether
Rekon should allow a tightly gated writer that converts eligible
preview candidates into `FindingReport` entries.

That writer would cross a **major boundary**: a preview / action
artifact (`CapabilityLintFindingBridgeReport`, category `actions`)
would become the source of a **governed finding artifact**
(`FindingReport`, category `findings`). Governed findings drive
the entire governance chain — graph-aware finding filters, the
`FindingStatusLedger`, `FindingLifecycleReport`,
`IssueAdjudicationReport`, `CoherencyDelta`, remediation
`WorkOrder`s, and `VerificationPlan`s. Crossing that boundary
carelessly would let capability-lint evaluation silently inject
governed findings, bypass the filter chain, or drive remediation
work the operator never reviewed.

Because the bridge artifact and its publication surfacing have
**both** passed safety reviews with no blocker, the prerequisite
gates for designing the writer are satisfied. This memo answers
*whether* and *how* the writer should exist — not by building it,
but by pinning its posture, eligibility, finding-id policy, write
model, and governance boundary so the implementation slice has an
unambiguous contract.

## Current Boundary

Already shipped on this track:

- `CapabilityArchitectureLintReport` v1 + publication surfacing +
  publication safety review.
- `CapabilityArchitectureLintReport` → `FindingReport` bridge
  decision (Option B: ship an intermediate preview artifact).
- `CapabilityLintFindingBridgeReport` v1 (category `actions`; CLI
  `rekon capability lint bridge-findings`).
- `CapabilityLintFindingBridgeReport` safety review.
- `CapabilityLintFindingBridgeReport` publication surfacing +
  publication safety review.

Current bridge behavior, unchanged by this memo:

- The bridge classifies each lint row as `eligible`,
  `ineligible`, or `needs-review`.
- Eligible (and duplicate `needs-review`) candidates carry a
  deterministic, slug-safe `proposedFinding` with id
  `capability-architecture-policy:<rule>:<contractId>:<phraseCapabilityId>`
  (no timestamp).
- `proposedFinding` is **preview-only**. No `FindingReport`
  writer exists. The bridge mutates no governance artifact and
  creates no `WorkOrder` / `VerificationPlan`.

## Options Considered

Five options were evaluated for *whether and how* eligible bridge
candidates may become governed findings.

| Option | Decision | Reason |
| --- | --- | --- |
| keep bridge preview-only | rejected/deferred | eligible candidates need a governed path |
| opt-in writer with dry-run + explicit confirmation | selected | preserves operator control |
| automatic writer during refresh | rejected | hidden finding mutation |
| direct lifecycle / CoherencyDelta mutation | rejected | bypasses finding governance |
| WorkOrder / VerificationPlan from bridge | rejected | downstream stages only |

**Option A — keep bridge preview-only.** Do not allow any
`FindingReport` writer yet. *Rejected / deferred unless this
review found boundary risk.* Eligible candidates need a governed
path eventually; bridge preview alone is not the final product,
and both prerequisite safety reviews passed with no blocker.

**Option B — opt-in writer with dry-run + explicit confirmation.**
A future writer consumes `CapabilityLintFindingBridgeReport` and
writes a new `FindingReport` only for eligible candidates, only
after a dry-run preview and an explicit confirmation flag.
*Selected.* It preserves operator control and reviewability before
crossing into governed findings.

**Option C — automatic writer during refresh.** Eligible bridge
candidates become findings during `rekon refresh`. *Rejected.* Too
much hidden mutation; it violates the explicit bridge boundary and
the pinned "only a later explicit writer decision" rule.

**Option D — direct lifecycle / CoherencyDelta mutation.**
Eligible bridge candidates update `FindingLifecycleReport` or
`CoherencyDelta` directly. *Rejected.* It bypasses governed
`FindingReport`, the finding filters, the status ledger, the
lifecycle projection, and adjudication.

**Option E — WorkOrder / VerificationPlan generation from bridge
candidates.** Eligible candidates immediately produce
`WorkOrder`s / `VerificationPlan`s. *Rejected.* Work orders and
verification plans are downstream of governed findings and
`CoherencyDelta`, not of preview bridge candidates.

## Recommendation

Adopt **Option B**: design a future **opt-in** `FindingReport`
writer that requires a **dry-run preview** and an **explicit
confirmation** flag. **Do not implement the writer in this slice.**

The writer must:

- be a separate, explicit command — never automatic, never part of
  `rekon refresh`, never triggered by a publication;
- support a **dry-run preview** that writes no `FindingReport`;
- require an **explicit confirmation** flag before write mode;
- consider only `eligible` bridge candidates;
- write a **new** `FindingReport` artifact rather than mutate an
  existing one;
- leave `FindingFilterReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, and `CoherencyDelta` **downstream and
  unmutated**;
- create no `WorkOrder` and no `VerificationPlan`;
- write no source files.

If the implementation slice or its safety review later surfaces a
boundary risk that cannot be mitigated, fall back to **Option A**
(keep the bridge preview-only and defer the writer). Option B is
the default recommendation precisely because both the bridge
artifact and its publication surfacing have already passed safety
reviews.

### Decision Questions Answered

1. **Should eligible candidates ever be written to
   `FindingReport`?** Yes — but only through a future opt-in
   writer, never automatically.
2. **Should the writer be a separate opt-in command?** Yes. It is
   its own command, distinct from `bridge-findings` and from
   `refresh`.
3. **Should the writer require explicit confirmation?** Yes. Write
   mode requires an explicit `--confirm-finding-write` flag.
4. **Should the writer support dry-run first?** Yes. Dry-run is the
   default; it writes no `FindingReport`.
5. **Which candidates are eligible?** Only
   `decision === "eligible"` candidates that carry a
   `proposedFinding` with non-empty `evidenceRefs` and a
   `sourceLintRowRef`, at `high`/`medium` severity and
   `high`/`medium` confidence. (See the eligibility table.)
6. **How are duplicate finding ids handled?** The writer preserves
   the bridge's deterministic id and refuses (or marks
   needs-review) duplicates unless the bridge report already
   resolved them.
7. **New artifact or append?** A **new** `FindingReport` artifact
   containing only bridge-derived findings plus source metadata.
   Existing `FindingReport`s are never mutated in place.
8. **How does it cite upstream artifacts?**
   `header.inputRefs` cites `CapabilityLintFindingBridgeReport`,
   `CapabilityArchitectureLintReport`, `CapabilityContract`,
   `CapabilityMap`, and `EvidenceGraph` (when reachable through
   `evidenceRefs`).
9. **How do filters / lifecycle / adjudication / CoherencyDelta
   stay downstream?** The writer emits raw `FindingReport` output
   only; every governed finding still flows through the graph-aware
   finding filters, the status ledger, lifecycle, adjudication, and
   `CoherencyDelta` like any other finding. The writer mutates none
   of those.
10. **Should `WorkOrder` / `VerificationPlan` generation happen in
    this writer?** **No.** Those remain downstream of governed
    findings and `CoherencyDelta`.
11. **What implementation slice follows?** The
    `CapabilityLintFindingBridgeReport` → `FindingReport` writer
    **dry-run helper / CLI** (preview only).

## Writer Model

Sketch only; **do not implement** in this slice. The future writer
should mirror the dry-run-first / explicit-confirmation posture
already used by the GitHub Check and PR-comment publishers.

Recommended future dry-run CLI:

```bash
rekon capability lint write-findings \
  --bridge-report <CapabilityLintFindingBridgeReport:id|type:id> \
  --dry-run \
  --json
```

Recommended future write mode:

```bash
rekon capability lint write-findings \
  --bridge-report <CapabilityLintFindingBridgeReport:id|type:id> \
  --confirm-finding-write \
  --json
```

Rules the writer must enforce:

- `--dry-run` is **required unless** `--confirm-finding-write` is
  present.
- dry-run **never** writes `FindingReport`.
- write mode requires **explicit confirmation**
  (`--confirm-finding-write`).
- **no automatic write during refresh.**
- **no hidden write from publications.**

## Eligibility Policy

The writer may consider only bridge candidates where **all** hold:

```text
candidate.decision === "eligible"
candidate.proposedFinding exists
candidate.proposedFinding.evidenceRefs non-empty
candidate.proposedFinding.sourceLintRowRef exists
candidate.severity is "high" or "medium"
candidate.confidence is "high" or "medium"
```

The writer must exclude:

```text
ineligible candidates
needs-review candidates
eligible candidates missing proposedFinding
eligible candidates missing evidenceRefs
low severity
low confidence
```

| Candidate Property | Writer Decision |
| --- | --- |
| decision eligible | required |
| proposedFinding | required |
| evidenceRefs | required |
| sourceLintRowRef | required |
| severity high/medium | required |
| confidence high/medium | required |
| ineligible candidates | excluded |
| needs-review candidates | excluded |

This re-uses the bridge's own eligibility conjunction rather than
re-classifying rows. The writer trusts the bridge report's
`decision` field and re-validates the structural prerequisites
(`proposedFinding`, `evidenceRefs`, `sourceLintRowRef`,
severity/confidence) before writing, so a hand-edited or stale
bridge report cannot smuggle an under-specified candidate into a
governed finding.

## Finding Id Policy

The writer preserves the proposed finding id from the bridge
report:

```text
capability-architecture-policy:<rule>:<contractId>:<phraseCapabilityId>
```

Rules:

- **deterministic.**
- **stable across runs.**
- **no timestamp.**
- duplicate ids collapse deterministically.
- the writer should **refuse or needs-review duplicates** unless
  the bridge report already resolved them (the bridge already flips
  later same-id eligible candidates to `needs-review` with
  `duplicate-candidate`, so a well-formed bridge report presents at
  most one `eligible` candidate per id).

A stable, timestamp-free id means re-running the writer against the
same bridge report yields the same finding ids, so the downstream
lifecycle projection matches the finding as `existing` across runs
rather than churning `new`/`resolved`.

## FindingReport Write Model

Recommended:

> Write a **new** `FindingReport` artifact containing only
> bridge-derived findings plus source metadata.

The writer must **not** mutate an existing `FindingReport` in
place. Rekon `FindingReport`s are immutable, append-style evaluator
output (see [finding-report.md](../artifacts/finding-report.md) and
[finding-lifecycle.md](../concepts/finding-lifecycle.md)); a new
artifact preserves provenance and keeps the lifecycle derivation
honest.

Source metadata should cite, in `header.inputRefs`:

```text
CapabilityLintFindingBridgeReport
CapabilityArchitectureLintReport
CapabilityContract
CapabilityMap
EvidenceGraph when reachable through evidenceRefs
```

Recommended finding category:

```text
capability_architecture_policy
```

Recommended finding fields per written finding:

```text
id
title
category
severity
evidenceRefs
sourceBridgeCandidateId
sourceLintRowId
sourceContractId
sourcePhraseCapabilityId
```

The exact mapping of these fields onto the concrete `FindingReport`
finding shape (for example whether `category` is carried as the
finding `type`, and how `evidenceRefs` map onto the finding
`evidence` projection) is **pinned in the writer dry-run
implementation slice**, not here. This memo fixes the *intent*:
every written finding must trace back to its bridge candidate, lint
row, contract, and phrase capability, and carry the evidence the
bridge already attached.

## Governance Boundary

The writer decision pins the following, each restated for the
implementation slice and its safety review:

- **FindingReport writer does not mutate FindingFilterReport.**
- **FindingReport writer does not mutate FindingLifecycleReport.**
- **FindingReport writer does not mutate IssueAdjudicationReport.**
- **FindingReport writer does not mutate CoherencyDelta.**
- **FindingReport writer does not create WorkOrder or
  VerificationPlan.**
- **Finding lifecycle, adjudication, CoherencyDelta, WorkOrder, and
  VerificationPlan remain downstream stages.**
- **Source writes remain unavailable.**

| Boundary | Decision |
| --- | --- |
| writer vs FindingReport | may write new FindingReport only after explicit confirmation |
| writer vs existing FindingReport | no in-place mutation |
| writer vs FindingFilterReport | no filter mutation |
| writer vs FindingLifecycleReport | no lifecycle mutation |
| writer vs IssueAdjudicationReport | no adjudication mutation |
| writer vs CoherencyDelta | no remediation mutation |
| writer vs WorkOrder | no work-order creation |
| writer vs VerificationPlan | no verification-plan creation |
| writer vs source files | no source writes |

A governed finding written by this future writer becomes ordinary
`FindingReport` output the moment it lands: the graph-aware finding
filters may suppress it, the status ledger may accept/ignore it,
the lifecycle projection tracks it, adjudication groups it, and
only then does `CoherencyDelta` (and any remediation `WorkOrder` /
`VerificationPlan`) consider it. The writer participates in none of
those downstream stages.

## Future Sequence

| Step | Gate |
| --- | --- |
| writer decision | this slice |
| writer dry-run helper / CLI | next implementation slice |
| writer safety review | required before write mode |
| opt-in writer implementation | explicit confirmation only |
| post-writer safety review | required before downstream lifecycle integration |
| lifecycle / CoherencyDelta integration | later, separate decision |

Each step is its own batch. Write mode does not ship until the
dry-run helper has passed its safety review; downstream lifecycle /
`CoherencyDelta` integration is a later, separate decision after
the writer's own post-implementation safety review.

## What This Does Not Do

This decision changes **no runtime behavior**. It implements no
writer, writes no `FindingReport`, mutates no governance artifact,
creates no `WorkOrder` / `VerificationPlan`, adds no resolver
routing or verification planning, and writes no source files.
Restating the invariants the implementation slice must honor:

- **No FindingReport entries are written in this decision slice.**
- **A future writer must support dry-run preview before write
  mode.**
- **A future writer must require explicit confirmation before
  writing FindingReport.**
- **The writer must write a new FindingReport artifact, not mutate
  an existing FindingReport in place.**
- **FindingFilterReport, FindingLifecycleReport,
  IssueAdjudicationReport, and CoherencyDelta remain downstream and
  are not mutated by the writer.**
- **WorkOrder and VerificationPlan creation remain downstream and
  are not part of the writer.**
- **Source writes remain unavailable.**

## Implementation Sequence

Recommended order, each gated behind its own batch:

1. **Writer decision** — this slice (posture, eligibility, finding
   id, write model, governance boundary pinned).
2. **FindingReport writer dry-run / preview helper + CLI** — reads
   `CapabilityLintFindingBridgeReport`, selects eligible
   candidates, builds the proposed `FindingReport` body, and
   prints/writes **no** `FindingReport`. No governance mutation, no
   source writes.
3. **Writer safety review** — required before any write mode is
   considered.
4. **Opt-in writer implementation** — write mode only, behind
   explicit `--confirm-finding-write`; approved only if the safety
   review finds no blocker.
5. **Post-writer safety review** — required before any downstream
   lifecycle / filter / adjudication / `CoherencyDelta`
   integration.
6. **Finding lifecycle / filter / adjudication / CoherencyDelta
   integration** — remains downstream and separate, gated behind
   its own decision.

## Cross-References

- [CapabilityLintFindingBridgeReport publication safety review](capability-lint-finding-bridge-publication-safety-review.md)
  — forty-sixth slice; declared the publication surfacing safe /
  stable as read-only visibility and selected this writer decision
  as the next slice.
- [CapabilityLintFindingBridgeReport safety review](capability-lint-finding-bridge-report-safety-review.md)
  — forty-fourth slice; declared the preview bridge safe / stable.
- [`CapabilityArchitectureLintReport` → `FindingReport` bridge decision](capability-lint-finding-bridge-decision.md)
  — forty-second slice; selected the intermediate preview artifact
  (Option B) before any writer.
- [CapabilityLintFindingBridgeReport artifact](../artifacts/capability-lint-finding-bridge-report.md)
- [Capability lint finding bridge concept](../concepts/capability-lint-finding-bridge.md)
- [FindingReport artifact](../artifacts/finding-report.md)
- [Finding lifecycle concept](../concepts/finding-lifecycle.md)
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [Coherency delta concept](../concepts/coherency-delta.md)
- [Remediation work orders concept](../concepts/remediation-work-orders.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
