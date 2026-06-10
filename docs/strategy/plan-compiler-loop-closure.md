# Plan Compiler Loop Closure / Fresh Repo End-to-End Proof

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> **Re-dogfooded end-to-end (slice 140):** the full operator path (scan → review
> → answer → prepare → approve → status → handoff → bundle) was re-run on a fresh
> repo with semantic mode, and the bundle imported into a local Circe checkout —
> provider output stays proposal-not-proof; Rekon writes no source, runs no
> commands, and runs no Circe — see
> [`fresh-repo-intent-handoff-circe-dogfood-review-semantic.md`](./fresh-repo-intent-handoff-circe-dogfood-review-semantic.md).

Status: closed (slice 135). This memo treats the classic intent **plan compiler loop
as one integrated capability**, not another chain of micro-slices, and records the
fresh-repo end-to-end proof that the whole public Rekon path works.

## The loop

The plan compiler loop is **review → answer → merge-back → prepare**:

- `rekon intent plan review` compiles a rough plan into normalized phase drafts and
  writes an `IntentPlanActionabilityReport` with findings, elicitation questions, and
  a revision prompt.
- `rekon intent plan answer` merges answers (tied to the report's questions by id)
  deterministically into copies of the phase drafts and writes a **new** report
  revision; **answered reports may feed prepare** once actionable.
- `rekon intent prepare --actionability-report <answered-ref>` derives a
  `PreparedIntentPlan` from the actionable answered report.

Downstream of the loop, the existing gated path continues: explicit approval →
work-ready status transition → WorkOrder / VerificationPlan handoff → bundle write →
Circe handoff projection.

## End-to-end proof

A fresh temp repo with a rough plan (`# Add marker export … TODO: decide the file and
verification.`) was driven through the full public sequence:

```
scan → intent context prepare → intent plan review → intent plan answer
→ intent assess → intent prepare (--actionability-report) → intent status
→ intent approve → intent status transition (work-ready)
→ intent work-order generate → intent verification-plan generate
→ intent bundle write → artifacts validate
```

Result: the first review is non-actionable; answer writes a new actionable revision;
prepare consumes it without auto-approving; approval and the work-ready transition are
explicit; WorkOrder and VerificationPlan generation proceed past the approval/status
gates; bundle write emits `.rekon/intent/plans/<intent-id>/circe/handoff.json` and
`circe/rekon-proof.json`; `artifacts validate` is clean; and the **source plan file and
the source `IntentPlanActionabilityReport` are unchanged**.

## Closure repair

The proof surfaced one pre-existing gap in the actionability-report → prepare mapping:
when the report's normalized drafts are all implementation-bearing with no explicit
`verify` phase, the derived `PreparedIntentPlan` lacked a verify phase and failed the
kernel validator's "implementation-bearing plan must include a verify phase" rule on
approval's re-validation. The repair synthesizes a verify phase (wired to the same
report-derived verification requirements) exactly as the non-actionability prepare path
always does. This adds structure only; it changes no approval, status, or handoff gate.

## Boundary

`rekon intent plan answer`, prepare integration, approval, status transition, WorkOrder
/ VerificationPlan handoff, and the bundle / Circe projection remain
read/transform/report/generate-only:

- **Source plan files are unchanged.**
- **Source reports are immutable** (answer writes a new revision; prepare/approve never
  mutate the report).
- **Approval remains explicit** — prepare does not auto-approve; approval requires the
  operator to accept the plan's required proof gaps with a reason.
- **Status transition remains explicit** — work-ready is an explicit operator action.
- **WorkOrder / VerificationPlan handoff remain gated** — they proceed only after
  approval and a work-ready status.
- **No command execution.**
- **No source writes.**
- **No Circe execution by Rekon** — Rekon writes the Circe projection; it never runs
  Circe.
- **intent:go remains deferred.**

## Embedded safety review

**This closure batch replaces a separate immediate safety-review slice because it
introduces no new execution/source-write/Circe boundary beyond the already-reviewed
components.** The only code change is the verify-phase synthesis in the
actionability-report → prepare mapping, which is additive structure within the existing
PreparedIntentPlan shape.

- **Answer / merge-back boundary** — unchanged from slice 134: deterministic merge into
  copies, new report revision, source report immutable, no execution.
- **Prepare integration boundary** — unchanged except the additive verify-phase
  synthesis; still derives a `PreparedIntentPlan` only, no approval side effect.
- **Approval boundary** — unchanged: explicit accepted gaps + reason; no auto-approve.
- **Status transition boundary** — unchanged: explicit work-ready transition.
- **WorkOrder / VerificationPlan handoff boundary** — unchanged: gated on approval +
  work-ready status; no VerificationRun / VerificationResult; no execution.
- **Bundle / Circe projection boundary** — unchanged: writes the bundle + Circe
  projection under `.rekon/`; never runs Circe.

If a future change materially alters any of these boundaries, a separate safety-review
slice is required.

## Tests / verification

- `tests/contract/plan-compiler-loop-closure.test.mjs` — the full end-to-end proof (22
  assertions) on a fresh temp repo.
- `tests/docs/plan-compiler-loop-closure.test.mjs` — documentation coverage (16
  assertions).
- Full 9-command gate green; the verify-phase repair keeps the existing
  prepare-actionability integration tests green (the one phase-count assertion was
  updated to reflect the synthesized verify phase).

## Next step

If closure holds, the recommended follow-on is a **Fresh Repo Intent Handoff / Circe
Dogfood Review**: run the operator-facing path against a real-ish repo and Circe
environment, record usability gaps, and decide what remains before npm publish / broader
v1 release. Do not restart the micro-slice pattern; if closure regresses, take a single
blocker-specific fix slice only.

> **Dogfood review shipped (slice 136):** the operator-facing path was dogfooded on a
> realistic fresh TypeScript package and confirmed Circe-importable end-to-end — no source
> change was required, boundaries are explicit, and a real `circe import rekon-phase-plan` /
> `rekon-work-order` from outside Rekon accepted the projection. The recommended follow-on is
> now **V1 Publish Readiness Reconciliation / npm Release Decision**. See
> [`fresh-repo-intent-handoff-circe-dogfood-review.md`](./fresh-repo-intent-handoff-circe-dogfood-review.md).
