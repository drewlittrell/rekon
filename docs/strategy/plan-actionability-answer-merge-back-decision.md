# Plan Actionability Answer / Merge-Back Decision

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

## Decision Summary

Rekon restores the classic `askPreparedPhaseQuestions` / `answerPreparedPhaseQuestions`
loop as a single, coherent **answer / merge-back** capability built on the existing
`IntentPlanActionabilityReport`. **Selected: Option B — an explicit answer/merge-back
command writes a new `IntentPlanActionabilityReport` revision.** A future
`rekon intent plan answer` reads a source report, accepts answers tied to the report's
existing elicitation questions, deterministically merges them into the normalized phase
drafts, re-runs the actionability checks, and writes **one new**
`IntentPlanActionabilityReport`. The source report stays immutable, the user's plan file
is never edited, and the new report (if it reaches `actionable`) flows into the existing
`rekon intent prepare --actionability-report` integration.

This is a decision-only batch — no answer/merge-back is implemented here. It preserves the
accelerated plan-compiler approach: one capability, not a dozen tiny artifacts; quality
through strong tests and a follow-up safety review, not over-fragmentation.

## Why This Decision Exists

The plan compiler is currently one-way. `rekon intent plan review` detects missing
per-phase requirements and emits `elicitationQuestions` + `findings` + a `revisionPrompt`,
but Rekon has no public path to **accept answers** to those questions and produce a new
reviewed plan state. The old codebase-intel system was iterative: questions → answers →
merged draft → re-review → actionable report → prepare. Without merge-back, an operator
(or their agent) must hand-edit the source plan and re-run review from scratch, losing the
question→answer traceability the compiler already computes. This decision pins how Rekon
closes that loop while keeping every existing boundary intact.

## Current Gap

Grounded in the shipped report at `08bbea6`
(`packages/capability-model/src/intent-plan-actionability-report.ts`,
`@rekon/kernel-repo-model`):

- `IntentPlanActionabilityReport` carries `status`, `normalizedPhases`, `findings`,
  `elicitationQuestions`, `revisionPrompt`, `evidenceGates`, `sourcePlan`,
  `normalizationTrace`, and `boundaries` (all `false`).
- Each `IntentPlanElicitationQuestion` already has a **stable id** of the form
  `question-<phaseId>-<requirement>` (e.g. `question-phase:plan-001-objective`), plus
  `phaseId`, `requirement`, `question`, `answerShape`, `whyAsked`, and `priority`.
- `answerShape` is one of `sentence` / `bullets` / `paths` / `command-or-artifact`.
- Findings are `finding-<phaseId>-<requirement>` with `severity`, `requirement`,
  `phaseId`, `sourceEvidence`, and `suggestedFix`.

So the inputs for a merge-back loop already exist (stable question ids tied to phases and
requirements); what is missing is a command to consume answers and emit a revised report.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| critique-only reports | rejected | misses old loop |
| new report revision | selected | preserves immutability and avoids artifact sprawl |
| separate answer artifact | rejected/deferred | more flexible but more complexity |
| mutate existing report | rejected | breaks auditability |
| rewrite source plan | rejected/deferred | source write policy needed |
| LLM-only merge-back | rejected | deterministic baseline first |

- **Option A — keep critique-only reports.** Rejected: leaves plan review one-way and
  does not restore the old ask/answer loop.
- **Option B — new `IntentPlanActionabilityReport` revision.** Selected: preserves
  artifact immutability, avoids a new parallel artifact/approval state, and feeds the
  existing prepare integration unchanged.
- **Option C — separate `IntentPlanAnswerSet` artifact.** Rejected/deferred: more flexible
  long-term but risks another parallel state and more slices; a future slice can promote
  the merge trace into a standalone artifact if real demand appears.
- **Option D — mutate the existing report in place.** Rejected: breaks immutability and
  auditability of the canonical artifact store.
- **Option E — rewrite the source plan file.** Rejected/deferred: source/document
  mutation needs a separate export/write policy and operator gate.
- **Option F — LLM-only merge-back.** Rejected: the deterministic merge is the v1
  baseline; a bounded, provenance-tagged semantic merge may be added optionally later.

## Recommendation

Adopt **Option B — explicit answer/merge-back command writes a new
`IntentPlanActionabilityReport` revision.** A future command:

```bash
rekon intent plan answer \
  --report <IntentPlanActionabilityReport ref> \
  --answer <question-id>=<answer> \
  [--answer <question-id>=<answer> ...] \
  [--answered-by <name>] \
  [--json]
```

with an alternative richer-input shape:

```bash
rekon intent plan answer \
  --report <IntentPlanActionabilityReport ref> \
  --answers <path-to-json>
```

**Recommended v1:** support both repeated `--answer question-id=value` and `--answers
<json>` if low-risk; if implementing both is too much for one slice, ship `--answers`
JSON first for reliability (it sidesteps shell-escaping of multi-line / bulleted answers).

The command writes **one** new `IntentPlanActionabilityReport`; the source report remains
immutable; answers and their disposition are recorded in an additive `answerTrace`
(merge trace); `normalizedPhases` gain the answer-derived fields; `findings` /
`elicitationQuestions` / `revisionPrompt` are recalculated; and `status` may become
`actionable` when all blocking requirements are satisfied. The `boundaries` block stays
all-`false`. The new report then feeds `rekon intent prepare --actionability-report`
exactly as a review-produced report does today.

## Report Revision Model

**Answer/merge-back creates a new IntentPlanActionabilityReport revision rather than
mutating the existing report.** The new artifact:

- cites the source report by ref (provenance / lineage);
- carries the merged `normalizedPhases`, recalculated `findings` / `elicitationQuestions`
  / `revisionPrompt` / `evidenceGates`, and an updated `status`;
- preserves `sourcePlan` (same source plan; unchanged) and extends `normalizationTrace`
  /adds an `answerTrace` recording the answers and how they were applied;
- keeps `boundaries` all-`false`.

Suggested additive fields (the implementation slice may choose the exact placement; the
**preferred** decision is an additive `answerTrace`, falling back to
`normalizationTrace.warnings` / `revisionPrompt` / `findings` only if adding a field is
deemed too much):

```ts
type IntentPlanAnswer = {
  questionId: string;
  answer: string;
  answeredAt: string;
  answeredBy?: string;
};

type IntentPlanMergeTrace = {
  sourceReportRef: ArtifactRef;
  answers: IntentPlanAnswer[];
  appliedRequirements: IntentPlanActionabilityRequirement[];
  unappliedAnswers: Array<{ questionId: string; reason: string }>;
  method: "deterministic";
};

// on the new report revision:
answerTrace?: IntentPlanMergeTrace;
```

## Answer Shape Model

Answers honor the question's existing `answerShape`. **Answers are tied to existing
elicitationQuestions by question id** (`question-<phaseId>-<requirement>`).

| Answer Shape | Merge Target |
| --- | --- |
| sentence | objective or ambiguity clarification |
| bullets | deliverables / acceptance criteria / constraints |
| paths | touchedPaths |
| command-or-artifact | verificationCommands / evidenceArtifacts |

Validity rules:

- the `questionId` must exist in the source report's `elicitationQuestions`;
- the `answer` must be non-empty;
- the answer shape must match the question's `answerShape`;
- an unsupported shape or invalid content remains **unapplied** and produces a finding
  (recorded in `answerTrace.unappliedAnswers`);
- answers cannot erase source evidence;
- answers cannot remove non-goals.

## Merge-Back Model

Merge-back is **deterministic** for v1. For each valid answer, the merge resolves the
target phase via `phaseId` and the target field via the question's `requirement` /
`answerShape`, then appends the answer-derived material to the normalized phase draft
(objective text, deliverables, acceptance criteria, constraints, touched paths,
verification commands, or evidence artifacts). Merge is additive: it augments the draft,
never deletes source-derived evidence or non-goals. Every applied answer is recorded in
`answerTrace.answers` with `appliedRequirements`; every rejected answer is recorded in
`answerTrace.unappliedAnswers` with a reason. A bounded, provenance-tagged semantic merge
may be added later behind the existing adapter boundary, but is **not** the v1 baseline.

## Re-Evaluation Model

After applying answers, the merge re-runs the actionability evaluation on the merged
drafts. **Merge-back re-runs actionability checks after applying answers.** Specifically
it:

- re-runs the per-phase requirement checks (objective / deliverables / acceptance criteria
  / implementation scope / verification evidence / ambiguity clearance / phase contract /
  evidence gates);
- preserves prior source evidence and adds the answer evidence / merge trace;
- regenerates `findings`, `elicitationQuestions`, and `revisionPrompt`;
- recalculates `status`.

Status behavior (unchanged from review):

- **actionable** — all implementation-bearing phases have objective, deliverables,
  acceptance criteria, implementation scope, verification evidence, and ambiguity
  clearance.
- **needs-revision** — high/medium findings remain.
- **blocked** — critical ambiguity remains or no usable phases.

**Incomplete answers keep the report needs-revision or blocked.** Answers that conflict
with source evidence are not applied (they cannot erase evidence) and surface as findings.

## CLI Model

Future command (not implemented in this batch):

```bash
rekon intent plan answer \
  --report <ref> \
  --answer question-phase:plan-001-objective="Add a token-bucket limiter to the gateway." \
  --answer question-phase:plan-001-implementation-scope=src/gateway/rate-limit.ts \
  --answer question-phase:plan-001-verification-evidence="npm run test:gateway" \
  --json
```

Blocked output (invalid answer):

```json
{
  "status": "blocked",
  "reason": "invalid-answer",
  "blockers": [
    { "id": "unknown-question:<id>", "message": "Question id was not found in the source report." }
  ]
}
```

Success output:

```json
{
  "status": "actionable",
  "artifact": { "type": "IntentPlanActionabilityReport", "id": "..." },
  "sourceReport": { "type": "IntentPlanActionabilityReport", "id": "..." },
  "summary": { "findings": 0, "questions": 0 },
  "boundaries": {
    "createdPreparedIntentPlan": false,
    "createdWorkOrder": false,
    "createdVerificationPlan": false,
    "createdVerificationRun": false,
    "createdVerificationResult": false,
    "executedCommands": false,
    "wroteSourceFiles": false,
    "ranCirce": false,
    "implementedIntentGo": false
  }
}
```

## Boundary Model

| Boundary | Decision |
| --- | --- |
| answer vs report mutation | new report revision |
| answer vs source plan | no source-plan write |
| answer vs PreparedIntentPlan | not created |
| answer vs WorkOrder | not created |
| answer vs VerificationPlan | not created |
| answer vs command execution | no commands |
| answer vs source writes | no writes |
| answer vs Circe | does not run Circe |
| answer vs intent:go | deferred |

The sequence the loop restores:

| Step | Result |
| --- | --- |
| plan review | report with questions |
| answer questions | answers tied to question ids |
| merge-back | new report revision |
| re-review | findings/questions recalculated |
| actionable report | eligible for prepare |
| prepare | separate command |

Pinned boundary statements:

- **Answer/merge-back does not write to the source plan file.**
- **Answer/merge-back does not approve plans.**
- **Answer/merge-back creates no PreparedIntentPlan.**
- **Answer/merge-back creates no WorkOrder.**
- **Answer/merge-back creates no VerificationPlan.**
- **Answer/merge-back executes no commands.**
- **Answer/merge-back writes no source files.**
- **Answer/merge-back runs no Circe.**
- **intent:go remains deferred.**

## What This Does Not Do

This is a decision-only batch. It implements no answer/merge-back command, adds no new
artifact or kernel field, mutates no source plan files, implements no source-plan export,
executes no commands, writes no source files, runs no Circe, and does not implement
`intent:go`. It does not auto-approve, create a `PreparedIntentPlan`, `WorkOrder`,
`VerificationPlan`, `VerificationRun`, or `VerificationResult`. No version bump, no npm
publish, no branch.

## Implementation Sequence

Next: **Plan Actionability Answer / Merge-Back Implementation** — add `rekon intent plan
answer`; tie answers to question ids; deterministically merge answers into a new
`IntentPlanActionabilityReport` revision (source report immutable; additive `answerTrace`);
re-run actionability; let an actionable revision feed `rekon intent prepare
--actionability-report`. Still no source writes, no command execution, no auto-approval,
no `intent:go`. A safety review follows the implementation, and a bounded semantic merge
(Option F, deferred) or a standalone answer artifact (Option C, deferred) remain available
as later, separately-decided slices.

## Decision Questions Answered

1. **What does answer/merge-back mean in Rekon?** Accepting answers to a report's
   elicitation questions and emitting a new reviewed report revision — no source edit.
2. **Should answers mutate the source plan file?** No.
3. **Should answers mutate the existing report?** No — a new revision is written.
4. **Should merge-back create a new report revision?** Yes (Option B).
5. **Should a separate `IntentPlanAnswerSet` artifact exist?** Deferred (Option C); not
   for v1.
6. **How are answers tied to questions?** By the report's stable question id
   (`question-<phaseId>-<requirement>`).
7. **What answer shapes are supported?** sentence / bullets / paths / command-or-artifact.
8. **How are answers merged into normalized phase drafts?** Deterministically, additively,
   into the field implied by the question's requirement / answerShape.
9. **How are findings re-evaluated?** The actionability checks re-run on the merged drafts.
10. **What if answers are incomplete?** The report stays needs-revision or blocked.
11. **What if answers conflict with source evidence?** They are not applied and surface as
    findings; answers cannot erase evidence.
12. **Should merge-back use LLM semantic normalization?** No for v1 (Option F deferred).
13. **Should merge-back write a revised plan file?** No.
14. **How does the new report flow into prepare?** As any actionable report does today via
    `rekon intent prepare --actionability-report`.
15. **Does merge-back approve anything?** No.
16. **Does merge-back execute commands?** No.
17. **Does merge-back write source files?** No.
18. **Does merge-back implement intent:go?** No.
19. **What implementation slice follows?** Plan Actionability Answer / Merge-Back
    Implementation.

## Related

- Implementation: [`plan-actionability-answer-merge-back-implementation.md`](./plan-actionability-answer-merge-back-implementation.md) — shipped as `rekon intent plan answer` (slice 134).
- Prepare integration: [`intent-prepare-actionability-integration.md`](./intent-prepare-actionability-integration.md)
- Prepare integration safety review: [`intent-prepare-actionability-integration-safety-review.md`](./intent-prepare-actionability-integration-safety-review.md)
- Report safety review: [`intent-plan-actionability-report-safety-review.md`](./intent-plan-actionability-report-safety-review.md)
- Parity decision: [`classic-intent-plan-compiler-elicitation-parity-decision.md`](./classic-intent-plan-compiler-elicitation-parity-decision.md)
- Concept: [`intent-plan-compiler.md`](../concepts/intent-plan-compiler.md)
- Artifact: [`IntentPlanActionabilityReport`](../artifacts/intent-plan-actionability-report.md)
- Review packet: [`plan-actionability-answer-merge-back-decision.md`](../../.rekon-dev/review-packets/plan-actionability-answer-merge-back-decision.md)

> **Loop closure (slice 135):** the full plan compiler loop (review → answer → merge-back → prepare) is proven end-to-end on a fresh repo through approval, work-ready status, and the gated WorkOrder / VerificationPlan / Circe-bundle handoff — see [`plan-compiler-loop-closure.md`](./plan-compiler-loop-closure.md).
