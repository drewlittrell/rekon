# Plan Actionability Answer / Merge-Back Implementation

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

Status: implemented (slice 134). Decision of record:
[plan-actionability-answer-merge-back-decision.md](./plan-actionability-answer-merge-back-decision.md).

`rekon intent plan answer` restores the classic codebase-intelligence
`askPreparedPhaseQuestions` / `answerPreparedPhaseQuestions` /
`mergeElicitationAnswersIntoDraft` loop in one bounded slice. It reads an existing
`IntentPlanActionabilityReport`, accepts answers tied to that report's
`elicitationQuestions` by question id, deterministically merges those answers into
copies of the normalized phase drafts, re-runs the **same** actionability
evaluator, and writes **exactly one** new `IntentPlanActionabilityReport` revision.

This closes the loop opened by `rekon intent plan review`: review surfaces the
elicitation questions; answer merges the answers back and re-scores; the resulting
revision can feed `rekon intent prepare --actionability-report` once it is
`actionable`.

## Command

```
rekon intent plan answer \
  --report <IntentPlanActionabilityReport:id|type:id> \
  --answer <question-id>=<answer> [--answer ...] \
  [--answers <path-to-json>] \
  [--answered-by <name>] \
  [--root <path>] [--json]
```

- `--answer <question-id>=<answer>` is repeatable. The question id must be one of
  the source report's `elicitationQuestions[].id`.
- `--answers <path>` reads a JSON file in either form: a bare array
  `[{ "questionId": "...", "answer": "..." }]` or an object
  `{ "answers": [ ... ] }`. `--answer` and `--answers` may be combined.
- A **blocked** result writes no report, prints the blockers, and exits non-zero.
- A **merged** result writes one new revision and prints its ref, status, applied
  and unapplied answer counts, findings, and questions.

Canonical flow:
`intent plan review → intent plan answer → intent prepare --actionability-report`.

## Answer model

Each answer is validated against the question it targets:

- `unknown-question` — the question id is not in the source report.
- `empty-answer` — the answer is empty or whitespace.
- `duplicate-answer` — the same question id is answered more than once.
- `no-applicable-phase` — the question is phase-scoped but the phase is missing.
- `invalid-answer-shape` — the answer yields no usable value for its shape (only
  the `paths` shape can fail this way; a `paths` answer must contain at least one
  path-like token containing `/` or `.`). File existence is **not** required.
- `missing-report` / `missing-report-ref` — no source report or no source report
  reference was supplied.

Any blocker blocks the whole merge: the source report and plan file are left
unchanged and no revision is written.

Answer shapes are parsed conservatively and never invent material:

- `sentence` → a single line of text.
- `bullets` → newline/semicolon-split non-empty items.
- `paths` → path-like tokens only (containing `/` or `.`, no whitespace).
- `command-or-artifact` → split into commands (text, **never executed**) and
  path-like artifacts.

## Merge model

Answers merge additively into copies of the normalized phase drafts. The merge
preserves order, source evidence, non-goals, and existing constraints; it
deduplicates merged values; and it routes by the question's requirement:

- `objective` (sentence) → fills `objective` if empty, else appended as a
  `clarification:` constraint.
- `ambiguity-clearance` (sentence) → added as a `clarification:` constraint. An
  explicit clarification constraint resolves ambiguity during re-evaluation
  without erasing the original source evidence that still carries the ambiguous
  wording.
- `deliverables` (bullets) → appended to `deliverables`.
- `acceptance-criteria` (bullets) → appended to `acceptanceCriteria`.
- `implementation-scope` (paths) → appended to `touchedPaths`.
- `verification-evidence` / `evidence-gates` (command-or-artifact) → commands
  appended to `verificationCommands`, path-like artifacts appended to
  `evidenceArtifacts`.
- `phase-contract` (bullets) → appended to `constraints`.

An answer that adds no new content (every value already present) is recorded as an
**unapplied answer** with a reason rather than silently dropped. Applied
requirements and unapplied answers are both recorded in the merge trace.

## Re-evaluation model

The answered path does not duplicate the actionability logic. The shared
`evaluatePlanPhases` evaluator — the same one `buildIntentPlanActionabilityReport`
uses for the initial review — is run over the merged phase drafts. It regenerates
findings, elicitation questions, the revision prompt, evidence gates, the summary,
and the overall status (`actionable` / `needs-revision` / `blocked`) from scratch.
Question ids are stable across revisions, so answering an earlier revision's
question id continues to work.

## Answer trace model

The new revision additively records an optional `answerTrace` on the
`IntentPlanActionabilityReport`:

```
answerTrace?: {
  sourceReportRef: ArtifactRef;            // the report that was answered
  answers: { questionId, answer, answeredAt, answeredBy? }[];
  appliedRequirements: IntentPlanActionabilityRequirement[];
  unappliedAnswers: { questionId, reason }[];
  method: "deterministic";
}
```

The field is additive: existing reports without an `answerTrace` still validate.
The report's `boundaries` block remains validator-enforced all-false.

## Boundary model

`rekon intent plan answer`:

1. Reads an existing `IntentPlanActionabilityReport` and its elicitation questions.
2. Does not edit the source plan file.
3. Does not mutate the source report in place.
4. Writes exactly one new `IntentPlanActionabilityReport` revision.
5. Does not write a revised markdown plan file.
6. Does not create a separate `IntentPlanAnswerSet` artifact; the merge trace lives
   on the report revision.
7. Merges deterministically; it never performs an LLM-only merge-back.
8. Does not auto-approve the plan.
9. Creates no `PreparedIntentPlan`.
10. Creates no `WorkOrder`.
11. Creates no `VerificationPlan`, `VerificationRun`, or `VerificationResult`.
12. Executes no commands and writes no source files.
13. Runs no Circe and does not implement `intent:go`.

## Tests / verification

- `tests/contract/intent-plan-answer-merge-back.test.mjs` — helper merge, blockers
  (unknown / empty / duplicate / missing-phase / missing-report / missing-ref /
  invalid-shape), source-report immutability, answer-trace provenance, ambiguity
  clearance, unapplied-answer recording, additive validation, and the CLI surface
  (both answer forms, blocked exit, wrong-type rejection, 9-field boundaries,
  byte-identical source report).
- `tests/docs/plan-actionability-answer-merge-back.test.mjs` — documentation
  coverage of the command, the merge / answer / boundary models, and the canonical
  flow.

## Next step

The recommended follow-on is a **Plan Actionability Answer / Merge-Back Safety
Review** that re-reads the shipped helper and CLI branch against this boundary
model. Do not start it without a new confirmed Work Order against the new SHA.

> **Loop closure (slice 135):** the full plan compiler loop (review → answer → merge-back → prepare) is proven end-to-end on a fresh repo through approval, work-ready status, and the gated WorkOrder / VerificationPlan / Circe-bundle handoff — see [`plan-compiler-loop-closure.md`](./plan-compiler-loop-closure.md).

> **Dogfood review (slice 136):** the answered-report → prepare → handoff path is dogfooded on a realistic fresh TypeScript package and confirmed Circe-importable end-to-end (source report + source plan immutable, no command execution, no Circe run by Rekon, `intent:go` deferred) — see [`fresh-repo-intent-handoff-circe-dogfood-review.md`](./fresh-repo-intent-handoff-circe-dogfood-review.md).

> **Provider routing implemented (slice 138):** the shared `RekonLlmRouter` (`@rekon/llm-provider`) shipped and is wired into `intent plan review` (`--llm-provider` / `--llm-model`); `intent plan answer` will consume the same router (route `plan.answer-merge`) in a later slice — providers stay proposal-not-proof — see [`rekon-llm-provider-routing-implementation.md`](./rekon-llm-provider-routing-implementation.md).

> **Provider routing (slice 137):** `intent plan answer`'s messy-answer parsing will consume the **same** shared LLM provider router as `intent plan review` (route `plan.answer-merge`), via an injected adapter — providers may read/transform/critique text but never approve/execute/write source/run Circe/implement `intent:go`; LLM output is proposal, not proof — see [`rekon-llm-provider-routing-semantic-normalization-decision.md`](./rekon-llm-provider-routing-semantic-normalization-decision.md).
