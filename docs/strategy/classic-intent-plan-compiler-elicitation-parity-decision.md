# Classic Intent Plan Compiler / Elicitation Parity Decision

> Status: Decided (slice 128). Decision-only batch — no implementation, no
> runtime change, no package bump, no npm publish. Follows the
> [Intent Status Work-Ready Transition Safety Review](./intent-status-work-ready-transition-safety-review.md)
> at `7eb6816`.

## Decision Summary

**Rekon will add a plan-actionability / critique / elicitation layer between
`intent assess` and `intent prepare`/`intent approve`, anchored on a new read-only
`IntentPlanActionabilityReport`.** The old codebase-intel system did not merely
package plans — it **compiled and interrogated** them (intake sufficiency →
normalization into executable phase drafts → per-phase actionability gates →
missing-info elicitation questions → answers merged back → prepared phase
artifacts). Rekon rebuilt the downstream proof / handoff / approval machinery but
skipped this upstream plan-intelligence loop. This decision selects the
report-first model: a new `IntentPlanActionabilityReport` that reads a plan
source (and the current `PreparedIntentPlan` draft), normalizes it, and reports
**exactly what must change** before the plan is approvable — without mutating the
plan, writing source, executing commands, running Circe, or implementing
`intent:go`.

This decision puts **LLM-backed semantic normalization in scope** (deterministic
first, escalating to a model when meaning is implicit / in prose), introducing
Rekon's first model-calling capability inside the intent pipeline — bounded to
**read / transform / critique / elicit** only. The model normalizes plan text
into structured phase drafts, generates actionability findings, and proposes
elicitation questions; it executes nothing, writes no source, runs no Circe, and
never auto-approves. A human still approves.

## Why This Decision Exists

The recommended next slice after the
[Intent Status Work-Ready Transition Safety Review](./intent-status-work-ready-transition-safety-review.md)
was a fresh-repo end-to-end review. A deeper parity audit of the old
codebase-intel system found a more material gap: the fresh-repo path has every
*downstream* transition (assess → prepare → approve → status transition →
work-order → verification-plan → bundle → Circe) but no *upstream* plan
intelligence. Rekon's `intent prepare` **projects** a `PreparedIntentPlan` from an
already-structured `IntentAssessmentReport`; it does not **compile** a raw or
prose plan, interrogate it for missing actionability, or tell the operator/agent
what to revise. The old system did all of that and treated it as the gate on
whether plan output was even authorized.

## The Missing Layer

The old flow had this shape:

```text
raw / semi-structured plan
→ structural intake / readiness check (desire / structure / grounding)
→ deterministic or LLM semantic normalization into phase drafts
→ per-phase actionability gates (objective / deliverables / acceptance / scope / verification / ambiguity)
→ elicitation questions for missing plan details
→ answers merged back into the draft
→ prepared phase artifacts + evidence gates
→ manifest / work bundle
→ go / verification path
```

The missing Rekon layer is the **plan compiler + critique + elicitation loop**
that sits between `intent assess` and `intent prepare`/`intent approve`. Rekon
has the artifacts on either side of it; it does not yet have the loop itself.

## Parity: Old codebase-intel vs current Rekon

| Capability | Old codebase-intel | Current Rekon | Verdict |
| --- | --- | --- | --- |
| Intake sufficiency | desire / structure / grounding over plan material; authorization source | `assess` readiness `insufficient-context` over artifact context; `intake-sufficient` approval reason | partial |
| Plan normalization | deterministic + LLM semantic normalization into phase drafts | `prepare` projects phases from an assessment; no raw-plan compile | missing |
| Phase decomposition | source plan split into per-phase artifacts | `PreparedIntentPhase` exists (goal / paths / steps / constraints / verificationRequirements) | partial |
| Actionability gate | objective / deliverables / acceptance / scope / verification / ambiguity | `scope-ambiguous` assessment blocker only; no first-class gate | missing |
| Missing-info elicitation | ask / answer questions, merge back | `ask-clarifying-question` next-action; no question artifact | missing |
| Evidence gates | per-phase evidence gates proving user intent | per-phase `verificationRequirements` + phase-level verification posture | partial |
| Iteration loop | questions → answers → merge into draft | none | missing |
| Handoff packaging | prepared phase manifest / work bundle | bundle + Circe projection | present |
| Approval / proof gates | present | stronger artifact proof / approval / status gates | present (stronger) |

Verdict: **Rekon has stronger artifact / proof / handoff infrastructure; the old
system had stronger plan-preparation intelligence. Both are needed.** Rekon's
current `PreparedIntentPlan` is **not** enough.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| IntentPlanActionabilityReport (report-first) | selected | proves what is missing without mutation, LLM-gated, V1-safe |
| Full new-artifact set (Draft + Critique + Revision + Actionability) | rejected | heavier surface than V1 needs; report subsumes the first cut |
| Extend PreparedIntentPlan in place | rejected | conflates the draft with its critique; loses immutable audit |
| Keep current prepare-only projection | rejected | leaves the plan-intelligence gap open |
| LLM-first normalization (no deterministic path) | rejected | non-determinism without a cheap deterministic baseline |

- **Option A — `IntentPlanActionabilityReport` (report-first):** add one new
  read-only report artifact + a `rekon intent plan review` surface that lists
  exactly what must change. **Selected** — it is additive, mutation-free, and
  proves the gap before any plan is approvable.
- **Option B — full new-artifact set** (`IntentPlanDraft` +
  `IntentPlanCritiqueReport` + `IntentPlanRevisionRequest` +
  `IntentPlanActionabilityReport`): mirrors the old surface more closely.
  **Rejected for V1** — the single actionability report subsumes the critique and
  revision-request content for the first cut; the heavier set can follow if
  needed.
- **Option C — extend `PreparedIntentPlan` in place** (add `sourcePlan` /
  `normalizationTrace` / `actionability` / `elicitationQuestions` /
  `requiredRevisions` / `phaseContracts` / `evidenceGates`): **Rejected** — it
  conflates the plan draft with its critique and loses the immutable,
  independently-auditable report. The report may *reference* the plan; it should
  not live inside it.
- **Option D — keep the current prepare-only projection:** **Rejected** — it
  leaves the gap this decision exists to close.
- **Option E — LLM-first normalization:** **Rejected** — normalization should try
  a cheap deterministic path first and escalate to the model only when meaning is
  implicit.

## Selected Model

| Field | Decision |
| --- | --- |
| New artifact | IntentPlanActionabilityReport (read-only) |
| Producer surface | rekon intent plan review / intent prepare --review |
| Mutation | none (report references the plan, never edits it) |
| Normalization | deterministic-first, LLM-backed escalation in scope |
| Approval coupling | blocking actionability findings block approval |
| Elicitation | questions surfaced in the report; answer/merge-back deferred |
| Circe | enriches the prepared handoff; still Rekon-side prepare/prove only |

## Normalization Model

Normalization is **deterministic-first with LLM-backed escalation, in scope** for
this decision. When a plan's phase fields are explicit and structured, a
deterministic pass extracts them. When meaning is implicit or the plan is prose /
transcript, the layer escalates to **LLM-backed semantic normalization** that
turns the text into executable phase drafts (objective / deliverables /
acceptanceCriteria / touchedPaths / artifactPaths / verificationCommands /
evidenceSnippets), with two hard rules carried from the old system: the model is
told **not to invent missing requirements**, and every model-inferred field is
**provenance-tagged** so the actionability report can show what was inferred
versus stated. **LLM-backed normalization reads and transforms plan text into
structured drafts, findings, and questions; it executes no commands, writes no
source, and runs no Circe.** This is Rekon's first model-calling capability in the
intent pipeline and stays strictly inside "prepare / prove."

## Actionability Gate Model

The report emits per-phase and plan-level actionability findings across the old
system's requirement order: **ambiguity clearance → objective → deliverables →
acceptance criteria → implementation scope (touched paths) → verification
evidence**, plus **non-goals** and **evidence gates**. Each missing or ambiguous
field becomes a finding with a severity and a concrete "what must change"
message (e.g., *missing phase objective*, *missing touched paths*, *missing
acceptance criteria*, *missing verification evidence*, *ambiguous implementation
scope*, *missing non-goals*, *missing evidence gates*). **Missing required fields
produce blocking actionability findings that block approval** — the layer couples
to the existing approval gate the same way proof gaps already do: a plan with
open high-severity actionability findings is not approvable until they are
resolved or explicitly accepted.

## Elicitation Model

The report surfaces **elicitation questions** for the missing details, generated
from the unmet requirements (e.g., *What single sentence should define the
objective for this phase? What concrete work items should this phase deliver?
What exact outcomes mark this phase complete? Which files or directories are in
scope? How should this phase be verified?*). For V1 this is **report-first**:
**the elicitation questions are surfaced; answers are merged back into the draft
only in a later, gated implementation slice.** The mutation/iteration loop
(`answer → merge into plan`) is deliberately deferred so the first cut writes no
plan and proves the gap read-only.

## CLI Surface (proposed)

```sh
rekon intent plan review --plan <plan.md|PreparedIntentPlan:id|type:id> \
  [--assessment <ref>] [--root <path>] [--json]
# and/or
rekon intent prepare --plan <plan.md> --review   # report-only review pass
```

`intent prepare` may additionally accept a raw plan file (`--plan ./plan.md`) as a
plan source feeding the review/normalization path. The review pass writes exactly
one `IntentPlanActionabilityReport` and no plan; it prints what must change and,
in `--json`, a boundaries object whose flags are all `false`.

## How This Feeds Circe

The actionability report (and, later, the normalized phase contracts and evidence
gates) enriches the `PreparedIntentPlan` → bundle → Circe projection so Circe
imports a plan that has been **proven actionable**, not merely structured. The
boundary is unchanged: Rekon prepares and proves; Circe imports and orchestrates.
The report is a Rekon-side prepare/prove artifact and crosses no execution
boundary.

## Boundary Model

| Boundary | Decision |
| --- | --- |
| actionability layer vs mutation | report-only; never edits the plan |
| LLM normalization vs execution | reads / transforms text; no commands / source / Circe |
| report vs auto-approval | proves gaps; never auto-approves |
| report vs auto-revision | surfaces questions; answer/merge-back deferred |
| missing fields vs approval | blocking findings block approval |
| actionability vs WorkOrder / VerificationPlan | not created by the review |
| actionability vs Circe | does not run Circe |
| actionability vs intent:go | deferred |

The boundary statements this decision pins:

- The plan-actionability layer is report-only; it writes no source and mutates no plan.
- LLM-backed normalization reads and transforms plan text into structured drafts, findings, and questions; it executes no commands, writes no source, and runs no Circe.
- The actionability report proves what is missing; it does not auto-approve and does not auto-revise the plan.
- Missing required fields produce blocking actionability findings that block approval.
- The elicitation questions are surfaced; answers are merged back into the draft only in a later, gated implementation slice.
- IntentPlanActionabilityReport is the selected model; a full new-artifact set and in-place PreparedIntentPlan mutation are rejected for V1.
- The plan-actionability layer creates no WorkOrder, VerificationPlan, VerificationRun, or VerificationResult.
- The plan-actionability layer executes no commands, writes no source files, and runs no Circe.
- intent:go remains deferred.

## Decision Questions

1. **What old behavior must be preserved?** Intake sufficiency over plan material;
   normalization of rough plans into executable phase drafts; per-phase
   actionability gates; missing-info elicitation questions; per-phase evidence
   gates; and the "tell the author exactly what to change before approval" loop.
2. **Is Rekon's current PreparedIntentPlan enough?** **No.** It projects phases
   from an assessment and lacks deliverables / acceptance criteria / evidence
   gates / actionability / elicitation / normalization trace.
3. **Should Rekon add IntentPlanActionabilityReport?** **Yes** — it is the
   selected, report-first model.
4. **Should Rekon add plan revision questions?** **Yes** — surfaced in the report;
   the answer/merge-back loop is deferred to a later gated slice.
5. **Should `intent prepare` accept raw plan files directly?** **Yes** — via a
   `--plan <file>` source feeding the review/normalization path (and/or a
   dedicated `rekon intent plan review`).
6. **Should semantic normalization be LLM-backed or deterministic first?**
   **Deterministic first, LLM-backed escalation in scope** — model used only when
   meaning is implicit / prose; provenance-tagged; told not to invent.
7. **How do missing fields block approval?** They become blocking actionability
   findings; a plan with open high-severity findings is not approvable until they
   are resolved or explicitly accepted, mirroring the existing proof-gap gate.
8. **How does this feed Circe handoff?** The report (and later phase contracts /
   evidence gates) enriches the PreparedIntentPlan → bundle → Circe projection so
   Circe imports a proven-actionable plan; still Rekon-side prepare/prove only.
9. **What implementation slice follows?** **Intent Plan Actionability Report v1** —
   the kernel `IntentPlanActionabilityReport` type + a deterministic
   `buildIntentPlanActionabilityReport` helper + `rekon intent plan review`
   (report-only). LLM-backed normalization, the elicitation answer/merge-back
   loop, and approval-gate coupling follow as separate gated slices.

## What This Does Not Do

This is a decision-only batch. It implements no actionability report, no
normalization, no elicitation, no CLI command, and no approval coupling. It
mutates no `PreparedIntentPlan` or `IntentAssessmentReport`, creates no WorkOrder
/ VerificationPlan / VerificationRun / VerificationResult, executes no commands,
writes no source files, runs no Circe, does not implement `intent:go`, calls no
model (the LLM path is decided here, not built), bumps no version, and publishes
nothing to npm.

## Implementation Sequence

Next: **Intent Plan Actionability Report v1** — register the kernel
`IntentPlanActionabilityReport`, implement a deterministic
`buildIntentPlanActionabilityReport` helper that reads a plan source and reports
the actionability findings + elicitation questions, and add `rekon intent plan
review` (report-only). Following slices: **LLM-backed semantic normalization**
(deterministic-first triage, provenance-tagged, told-not-to-invent), the
**elicitation answer/merge-back loop**, and **approval-gate coupling** (blocking
findings block approval). Each remains report/prove-side: no command execution,
no source writes, no Circe, `intent:go` deferred.
