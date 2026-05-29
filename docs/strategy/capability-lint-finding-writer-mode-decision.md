# CapabilityLintFindingBridgeReport → FindingReport Writer Mode Decision

**Slice:** fiftieth on the codebase-intel-classic
capability-ontology track. Strategy / architecture decision
batch. Follows the
[FindingReport writer dry-run safety review](capability-lint-finding-writer-dry-run-safety-review.md)
(shipped at `b635337`).

## Decision Summary

Rekon **should** add a **future, opt-in `FindingReport` write
mode** to the existing `rekon capability lint write-findings`
command — gated behind an explicit **`--confirm-finding-write`**
flag, reusing the safety-reviewed dry-run preview, and writing a
**new** `FindingReport` artifact only. This is **Option B**.

This is a **decision-only** batch. **No FindingReport entries are
written in this decision slice.** No write mode is implemented, no
`--confirm-finding-write` behavior is added in code, no governance
artifact is mutated, no `WorkOrder` / `VerificationPlan` is
created, and no source file is written.

The pinned boundary from the prior slices still holds:

- **No FindingReport entries are written in this decision slice.**
- **Future write mode must require `--confirm-finding-write`.**
- **`--write`, `--send`, and `--execute` remain rejected.**
- **Future write mode writes a new FindingReport artifact, not an
  existing FindingReport in place.**
- **Future write mode does not mutate FindingFilterReport,
  FindingLifecycleReport, IssueAdjudicationReport, or
  CoherencyDelta.**
- **Future write mode does not create WorkOrder or
  VerificationPlan.**
- **Source writes remain unavailable.**

Recommended next slice: **CapabilityLintFindingBridgeReport →
FindingReport writer implementation** (opt-in write mode behind
`--confirm-finding-write`).

## Why This Decision Exists

The dry-run helper / CLI can now model the **exact** `FindingReport`
body a writer would emit, and that dry-run path has **passed its
safety review** (safe / stable as preview-only writer modeling, no
blocker). The open question is whether Rekon should now add an
**opt-in write mode** and, if so, what gates it must satisfy
before it writes a governed `FindingReport` artifact.

That write mode would cross the final boundary on this track: a
preview value would become a **written governed-finding artifact**
on disk, indexed and visible to the finding-governance pipeline.
This memo answers *whether* and *how* — by pinning the posture
(opt-in, single explicit confirmation flag, reuse of the dry-run
preview, new-artifact-only write, strict pre/post safety checks)
and **deferring the implementation** to its own slice and its own
post-implementation safety review.

## Current Dry-Run Boundary

Already shipped on this track:

- `CapabilityLintFindingBridgeReport` v1 + publication surfacing +
  safety review.
- `CapabilityLintFindingBridgeReport` → `FindingReport` writer
  decision (Option B: opt-in writer, dry-run-first, explicit
  confirmation).
- FindingReport writer **dry-run helper / CLI** —
  `@rekon/capability-model.buildFindingReportWritePreview` +
  `rekon capability lint write-findings --bridge-report <ref>
  --dry-run`.
- FindingReport writer **dry-run safety review** — declared the
  dry-run safe / stable as preview-only writer modeling.

Current dry-run behavior, unchanged by this memo:

- `--dry-run` is required; `--confirm-finding-write` / `--write` /
  `--send` / `--execute` are rejected.
- The dry-run returns a `FindingReportWritePreview` (`dryRun:
  true`, `wouldWrite: false`) modeling the proposed `FindingReport`
  body; it writes nothing, mutates no governance artifact, and
  does not mutate the artifact index.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| keep dry-run only | rejected/deferred | dry-run passed safety review |
| opt-in writer with --confirm-finding-write | selected | explicit bounded mutation |
| accept --write / --send / --execute aliases | rejected | ambiguous crossing of governance boundary |
| mutate existing FindingReport | rejected | artifacts are immutable records |
| update lifecycle / CoherencyDelta too | rejected | downstream stages remain separate |

**Option A — keep dry-run only.** Keep the `FindingReport` writer
permanently deferred. *Rejected / deferred.* The dry-run has
passed safety review and eligible candidates need a governed path
eventually; dry-run alone is not the final product.

**Option B — opt-in writer with `--confirm-finding-write`.** Write
a new `FindingReport` artifact only when explicit confirmation is
supplied. *Selected.* It preserves operator control and keeps
mutation bounded to exactly one governed artifact type.

**Option C — accept `--write` / `--send` / `--execute` aliases.**
Allow generic write-ish flags. *Rejected.* Ambiguous flags make
the governance boundary easier to cross accidentally; a single
purpose-named flag is safer.

**Option D — mutate existing `FindingReport`.** Append
bridge-derived findings into the latest `FindingReport`.
*Rejected.* Rekon artifacts are immutable records; the writer must
create a new `FindingReport`.

**Option E — also update `FindingLifecycleReport` /
`CoherencyDelta`.** After writing `FindingReport`, immediately
update lifecycle and remediation. *Rejected.* Finding lifecycle and
`CoherencyDelta` remain downstream stages with their own gates.

## Recommendation

Adopt **Option B**: design a future **opt-in** `FindingReport`
write mode on `rekon capability lint write-findings`, gated behind
`--confirm-finding-write`. **Do not implement write mode in this
slice.**

The future write mode must:

- require `--confirm-finding-write`;
- reject `--write`, `--send`, and `--execute` as aliases;
- reuse `buildFindingReportWritePreview` (build the dry-run preview
  first);
- write a **new** `FindingReport` artifact only;
- include exactly the same proposed findings as the dry-run
  preview (`preview.proposedFindingReport.findings`);
- fail (exit non-zero) if the dry-run preview would produce zero
  findings, unless an explicit `--allow-empty-finding-report` flag
  is introduced and approved later;
- cite `CapabilityLintFindingBridgeReport` and the upstream refs
  from the preview's `inputRefs`;
- not mutate an existing `FindingReport`;
- not mutate `FindingFilterReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, or `CoherencyDelta`;
- not create `WorkOrder` / `VerificationPlan`;
- not write source files.

If the writer implementation slice or its safety review surfaces an
unmitigable risk, the documented fallback is **Option A** (keep the
dry-run only). Option B is the default recommendation precisely
because the dry-run has already passed safety review.

### Decision Questions Answered

1. **Should write mode be added after the dry-run safety review?**
   Yes — opt-in only, behind explicit confirmation.
2. **What explicit confirmation flag is required?**
   `--confirm-finding-write`.
3. **Should `--write`, `--send`, or `--execute` be accepted?** No.
   They remain rejected as ambiguous aliases.
4. **New `FindingReport` or mutate an existing one?** A **new**
   `FindingReport` artifact; never an in-place mutation.
5. **Which dry-run output must be reused?** The
   `FindingReportWritePreview` from `buildFindingReportWritePreview`
   — write mode persists exactly
   `preview.proposedFindingReport.findings`.
6. **What input artifact must write mode cite?** The
   `CapabilityLintFindingBridgeReport` (plus the upstream lint /
   contract / map refs carried in the preview's `inputRefs`).
7. **How are duplicate finding ids handled?** The preview already
   skips later duplicate finding ids; write mode persists only the
   deduped findings and a pre-write check re-asserts id uniqueness.
8. **What downstream artifacts remain untouched?**
   `FindingFilterReport`, `FindingLifecycleReport`,
   `IssueAdjudicationReport`, `CoherencyDelta`, `WorkOrder`, and
   `VerificationPlan`.
9. **What safety checks must run before and after write?** See the
   [Safety Checks](#safety-checks) section (six before-write
   checks, two after-write checks).
10. **What implementation slice follows?** The
    `CapabilityLintFindingBridgeReport` → `FindingReport` **writer
    implementation** (opt-in write mode).

## Proposed Write Mode

Sketch only; **do not implement** in this slice. The future write
mode extends the existing dry-run command rather than adding a new
one.

Future write-mode CLI:

```bash
rekon capability lint write-findings \
  --bridge-report <CapabilityLintFindingBridgeReport:id|type:id> \
  --confirm-finding-write \
  --json
```

Rules the writer must enforce:

- **`--confirm-finding-write` is required for write mode.**
- `--dry-run` remains supported and writes nothing.
- `--write` / `--send` / `--execute` remain **rejected**.
- the dry-run preview is built **first** (write mode is dry-run +
  persist).
- write mode writes exactly `preview.proposedFindingReport.findings`.
- write mode writes a **new** `FindingReport` artifact.
- if `preview.summary.proposedFindings === 0`, write mode exits
  non-zero unless a later explicit empty-write flag is approved.

Future output shape (write mode):

```json
{
  "dryRun": false,
  "wouldWrite": true,
  "artifact": { "type": "FindingReport", "id": "..." },
  "source": {
    "bridgeReportRef": { "type": "CapabilityLintFindingBridgeReport", "id": "..." }
  },
  "summary": { "writtenFindings": 3, "skippedCandidates": 2 }
}
```

## Confirmation Policy

| Flag | Decision |
| --- | --- |
| --confirm-finding-write | required for write mode |
| --dry-run | preview only, writes nothing |
| --write | rejected |
| --send | rejected |
| --execute | rejected |

The confirmation policy keeps one purpose-named flag
(`--confirm-finding-write`) as the *only* way to cross into write
mode. Generic write-ish aliases stay rejected so the governance
boundary cannot be crossed by a habitual `--write` / `--send` /
`--execute`. `--dry-run` remains the default-safe preview path.

## Governance Boundary

The writer-mode decision pins the following, each restated for the
implementation slice and its safety review:

- **Write mode writes only a new FindingReport artifact.**
- **Write mode does not mutate existing FindingReport.**
- **Write mode does not mutate FindingFilterReport,
  FindingLifecycleReport, IssueAdjudicationReport, or
  CoherencyDelta.**
- **Write mode does not create WorkOrder or VerificationPlan.**
- **Write mode does not imply resolver routing, verification
  planning, RefactorPreservationContract, or source writes.**
- **Finding lifecycle, filtering, adjudication, CoherencyDelta,
  WorkOrder, and VerificationPlan remain downstream of the written
  FindingReport.**

| Boundary | Decision |
| --- | --- |
| writer vs new FindingReport | may write one new artifact with confirmation |
| writer vs existing FindingReport | no in-place mutation |
| writer vs FindingFilterReport | no mutation |
| writer vs FindingLifecycleReport | no mutation |
| writer vs IssueAdjudicationReport | no mutation |
| writer vs CoherencyDelta | no mutation |
| writer vs WorkOrder | no creation |
| writer vs VerificationPlan | no creation |
| writer vs source files | no writes |

A `FindingReport` written by this future write mode becomes
ordinary evaluator output the moment it lands: the graph-aware
finding filters may suppress it, the status ledger may
accept/ignore it, the lifecycle projection tracks it, adjudication
groups it, and only then does `CoherencyDelta` (and any remediation
`WorkOrder` / `VerificationPlan`) consider it. The writer
participates in none of those downstream stages.

## Safety Checks

The future implementation must run these checks.

Before write:

- bridge report exists and validates.
- dry-run preview succeeds.
- proposed findings count > 0.
- proposed finding ids are unique.
- all proposed findings have `evidenceRefs`.
- `--confirm-finding-write` is present.

After write:

- `artifacts validate` clean.
- written `FindingReport` cites `CapabilityLintFindingBridgeReport`.
- no `FindingFilterReport` / `FindingLifecycleReport` /
  `IssueAdjudicationReport` / `CoherencyDelta` / `WorkOrder` /
  `VerificationPlan` count changed except the new `FindingReport`.

| Check | Timing |
| --- | --- |
| bridge report validates | before write |
| dry-run preview succeeds | before write |
| proposed findings count > 0 | before write |
| proposed finding ids unique | before write |
| evidenceRefs present | before write |
| artifacts validate clean | after write |
| downstream artifact counts unchanged | after write |

## Future Sequence

Recommended order, each gated behind its own batch:

1. **Writer mode decision** — this slice (posture, confirmation
   policy, write model, governance boundary, safety checks pinned).
2. **Writer implementation** — opt-in write mode behind
   `--confirm-finding-write`, reusing the dry-run preview, writing
   exactly one new `FindingReport` artifact.
3. **Writer safety review** — required before the write mode is
   considered stable.
4. **Finding lifecycle / filter / adjudication / CoherencyDelta
   integration** — remains downstream and separate, gated behind
   its own decision.

## What This Does Not Do

This decision changes **no runtime behavior**. It implements no
write mode, adds no `--confirm-finding-write` behavior in code,
writes no `FindingReport`, mutates no governance artifact, creates
no `WorkOrder` / `VerificationPlan`, and writes no source files.
Restating the invariants the implementation slice must honor:

- **No FindingReport entries are written in this decision slice.**
- **Future write mode must require `--confirm-finding-write`.**
- **`--write`, `--send`, and `--execute` remain rejected.**
- **Future write mode writes a new FindingReport artifact, not an
  existing FindingReport in place.**
- **Future write mode does not mutate FindingFilterReport,
  FindingLifecycleReport, IssueAdjudicationReport, or
  CoherencyDelta.**
- **Future write mode does not create WorkOrder or
  VerificationPlan.**
- **Source writes remain unavailable.**

## Implementation Sequence

1. **Writer mode decision** — this slice.
2. **FindingReport writer implementation** — adds the opt-in
   `--confirm-finding-write` write path; reuses
   `buildFindingReportWritePreview`; writes exactly one new
   `FindingReport`; runs the before/after safety checks above; no
   existing-`FindingReport` mutation; no governance mutation; no
   `WorkOrder` / `VerificationPlan` creation; no source writes.
3. **Writer safety review** — required before write mode is
   declared stable.
4. **Downstream integration** (lifecycle / filter / adjudication /
   `CoherencyDelta`) — later, separate decision.

## Writer Implementation (Fifty-First Slice)

The **FindingReport writer implementation** has shipped. The
`rekon capability lint write-findings` command now has two modes
on the existing surface:

```bash
rekon capability lint write-findings --bridge-report <id|type:id> --dry-run [--root <path>] [--json]
rekon capability lint write-findings --bridge-report <id|type:id> --confirm-finding-write [--root <path>] [--json]
```

Pinned behavior, exactly as decided above:

- **Write mode requires `--confirm-finding-write`.** Running with
  neither `--dry-run` nor `--confirm-finding-write` is an error.
- **`--dry-run` and `--confirm-finding-write` are mutually
  exclusive.** Passing both is an error.
- **`--write`, `--send`, and `--execute` are rejected** (exit
  non-zero) as ambiguous aliases.
- Write mode builds the dry-run preview first
  (`buildFindingReportWritePreview`) and persists exactly
  `preview.proposedFindingReport.findings`.
- **Write mode writes a new `FindingReport` artifact** under
  `.rekon/artifacts/findings/`, citing the
  `CapabilityLintFindingBridgeReport` plus the upstream lint /
  `CapabilityContract` / `CapabilityMap` refs from the preview's
  `inputRefs`; proposed finding ids, severity, and `evidenceRefs`
  are preserved, and the bridge trace fields
  (`sourceBridgeCandidateId` / `sourceLintRowId` /
  `sourceContractId` / `sourcePhraseCapabilityId`) are kept under
  the finding `details`.
- If the preview produces **0 eligible findings**, write mode
  exits non-zero and writes nothing.
- **The existing `FindingReport` is not mutated in place.** A new
  artifact is always created.
- **`FindingFilterReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, and `CoherencyDelta` are not
  mutated.**
- **`WorkOrder` and `VerificationPlan` are not created.**
- **Source writes remain unavailable.**

Dry-run remains available and unchanged (preview only, writes
nothing). The next slice is the **FindingReport writer safety
review**.

> **Update (fifty-second slice):** the **FindingReport writer
> safety review** has **shipped** and declared the writer mode
> **safe / stable as a controlled, opt-in writer** (no blocker).
> It re-confirmed that write mode is opt-in / `--confirm-finding-write`,
> dry-run stays preview-only, write mode writes exactly one new
> `FindingReport` (no in-place mutation), no governance artifact /
> `WorkOrder` / `VerificationPlan` is mutated or created, and no
> source files are written. Lifecycle / `CoherencyDelta`
> integration remain downstream. The next slice is the
> **FindingReport writer publication / operator-surface
> decision**.

## Cross-References

- [FindingReport writer dry-run safety review](capability-lint-finding-writer-dry-run-safety-review.md)
  — forty-ninth slice; declared the dry-run helper / CLI safe /
  stable and selected this writer mode decision next.
- [CapabilityLintFindingBridgeReport → FindingReport writer decision](capability-lint-finding-writer-decision.md)
  — forty-seventh slice (decision) + forty-eighth slice (dry-run
  helper / CLI).
- [CapabilityLintFindingBridgeReport artifact](../artifacts/capability-lint-finding-bridge-report.md)
- [Capability lint finding bridge concept](../concepts/capability-lint-finding-bridge.md)
- [FindingReport artifact](../artifacts/finding-report.md)
- [Finding lifecycle concept](../concepts/finding-lifecycle.md)
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [Coherency delta concept](../concepts/coherency-delta.md)
- [Remediation work orders concept](../concepts/remediation-work-orders.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [Bridge-derived findings publication decision](bridge-derived-findings-publication-decision.md)
  — fifty-third slice; decides how the written bridge-derived
  `FindingReport` entries are surfaced. Selects **Option B**
  (architecture summary + agent contract first); defers the proof
  report. Publication surfacing mutates nothing; lifecycle /
  `CoherencyDelta` integration remain downstream.
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
