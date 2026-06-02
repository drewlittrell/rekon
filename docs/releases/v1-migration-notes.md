# Rekon V1 Migration Notes

> Migration guidance prepared by V1 Release Prep Implementation. No version bump, tag, or
> npm publish has occurred; packages remain at `0.1.0-beta.0`.

## Who Should Read This

Operators and maintainers who used Rekon during beta — especially anyone who relied on the
legacy `rekon prepare plan` direction or the `.rekon/handoffs` layout — and anyone adopting
the V1 non-executing Rekon → Circe prepared-plan handoff for the first time.

## Legacy Beta Surfaces

During beta, intent preparation was explored under a legacy `rekon prepare plan` direction
that wrote into a `.rekon/handoffs` layout. **Legacy `rekon prepare plan` / `.rekon/handoffs`
direction is superseded by `.rekon/intent/plans/<intent-id>/circe/`.** The V1 path is the
shipped, safety-reviewed intent pipeline; the legacy direction is not the V1 recommended
path.

## V1 Canonical Flow

```
rekon intent plan review
rekon intent assess
rekon intent prepare
rekon intent status
rekon intent work-order generate
rekon intent verification-plan generate
rekon intent bundle write
circe rekon-handoff validate
circe rekon-handoff routes
circe import rekon-handoff
```

> Optional gating (slice 131): `rekon intent prepare` accepts `--actionability-report <ref>`
> so a written plan's actionability gates preparation — an actionable report may feed
> `PreparedIntentPlan` generation, while a needs-revision / blocked report blocks
> preparation and returns the revision guidance (no plan written). It does not change the
> canonical flow above and adds no execution power: prepare still does not auto-approve,
> create a WorkOrder / VerificationPlan, execute commands, or write source; `intent:go`
> remains deferred. See
> [Intent Prepare Integration With Actionability Report](../strategy/intent-prepare-actionability-integration.md),
> safety-reviewed safe/stable in the
> [Intent Prepare Actionability Integration Safety Review](../strategy/intent-prepare-actionability-integration-safety-review.md).
> A future `rekon intent plan answer` (decided in the
> [Plan Actionability Answer / Merge-Back Decision](../strategy/plan-actionability-answer-merge-back-decision.md); shipped as `rekon intent plan answer` — [implementation](../strategy/plan-actionability-answer-merge-back-implementation.md))
> will merge answers into a new report revision; it adds no source writes, command execution, auto-approval,
> or `intent:go`, so it does not change the canonical flow above.

Rekon runs the first six commands to assess, prepare a proof-approved plan, report status,
generate the WorkOrder and VerificationPlan, and write the bundle. Circe then validates,
previews routes, and imports the handoff — and orchestrates execution.

> The optional `rekon intent plan review` step that precedes `intent assess` was safety-reviewed
> safe/stable as a read / transform / report-only plan-compiler layer (no downstream artifacts, no
> command execution, no source writes, no Circe). See the
> [Intent Plan Actionability Report Safety Review](../strategy/intent-plan-actionability-report-safety-review.md).

## Intent Bundle Directory

`.rekon/intent/plans/<intent-id>/` is the human + agent handoff bundle: the Markdown /
agent files for review and LLM handoff, regenerable from canonical artifacts.

## Circe Projection Directory

`.rekon/intent/plans/<intent-id>/circe/` is the Circe projection (the
`rekon-circe-handoff` package: `handoff.json`, `phase-plan.json`, `work-orders/`,
`verification-plans/`, plus the `rekon-proof.json` proof/gate sidecar). It is the
orchestration import projection that Circe consumes.

## Legacy Handoff Path

The legacy `.rekon/handoffs` path is not produced by the V1 pipeline. Operators should move
to `.rekon/intent/plans/<intent-id>/` (bundle) and `.rekon/intent/plans/<intent-id>/circe/`
(Circe projection). `.rekon/artifacts/` remains canonical truth — the bundle and projection
are regenerable projections of it.

## Command Mapping

| Legacy / beta surface | V1 recommended path |
| --- | --- |
| `rekon prepare plan` (legacy direction) | `rekon intent assess` → `prepare` → `status` → `work-order generate` → `verification-plan generate` → `bundle write` |
| `.rekon/handoffs/...` | `.rekon/intent/plans/<intent-id>/` (+ `circe/` projection) |
| (orchestration) | `circe rekon-handoff validate` / `routes`, `circe import rekon-handoff`, `circe serve --mode worker` |
| `intent:go` | not available — **intent:go is not available in V1.** |

The legacy `rekon intent work-order --path --goal` and `rekon intent remediation` commands
still exist as legacy/compatibility surfaces, but are not the V1 recommended path.

## What Changes Operationally

- Intent preparation now flows through the six rich `rekon intent ...` commands, all
  discoverable in top-level `rekon help`.
- The handoff to Circe is an explicit `circe rekon-handoff` import of the `circe/`
  projection, carrying Rekon's proof/gate state.
- Execution is owned by Circe, not Rekon.

## What Does Not Change

- `.rekon/artifacts/` remains canonical truth.
- `.rekon/intent/plans/<intent-id>/` is the human + agent handoff bundle.
- `.rekon/intent/plans/<intent-id>/circe/` is the Circe projection.
- Rekon does not execute commands and does not write source files; `intent:go` is not
  available in V1.

## Known Compatibility Notes

- Legacy `intent work-order --path --goal` / `intent remediation` remain available as
  compatibility surfaces; prefer the V1 canonical flow.
- The Circe projection is additive and validated against Circe's real normalizers; extra
  Rekon-owned fields (the proof sidecar, per-phase traceability) are tolerated and ignored
  by Circe.
- No package versions changed in this migration-notes slice; packages remain at
  `0.1.0-beta.0`.

## Update — First-Run Onboarding (slice 110)

The canonical first-run verb is moving to `rekon scan` (decided in
[Rekon First-Run Scan / Install Onboarding Decision](../strategy/rekon-first-run-scan-onboarding-decision.md)):
`rekon scan` initializes `.rekon/` if needed and creates the first repository intelligence
substrate, replacing `rekon refresh` as the documented first-run command. `refresh` remains an
expert / compatibility alias, so existing scripts that call `rekon refresh` continue to work.
This decision changes onboarding vocabulary only — no `rekon scan` implementation and no CLI
behavior change yet.

**Update (slice 111): `rekon scan` is now implemented.** The documented first-run command is
`rekon scan` (equivalent to `rekon init` + `rekon refresh` in one step); `rekon refresh`
remains available unchanged as the expert / compatibility update command, so existing
`rekon refresh` scripts continue to work. No package version change and no npm publish.

**Update (slice 112): `rekon scan` reviewed safe/stable.** The Rekon First-Run Scan Safety
Review confirmed `rekon scan` is safe as the canonical first-run command; `rekon refresh`
remains unchanged as the expert / compatibility update command. No package version change and
no npm publish.

**Update (slice 113): fresh-repo intent path.** On a fresh repo, run `rekon scan` then
`rekon intent context prepare` (builds StepCapabilityGraph + runtime/handoff context;
not-evaluated where there is no event log) before `rekon intent assess` — the documented public
intent sequence then works without manual `.rekon/artifacts` seeding. No package version change
and no npm publish.

**Update (slice 114): fresh-repo intent path reviewed safe/stable.** The Fresh Repo Intent
Readiness Safety Review confirmed the slice-113 fix is safe/stable: the fresh-repo public intent
sequence works without manual `.rekon/artifacts` seeding, `rekon scan` / `rekon refresh` are
unchanged, missing runtime/handoff evidence is recorded as not-evaluated / observation-missing
(not false success), Rekon runs no Circe and writes no source, and `intent:go` remains deferred.
No package version change and no npm publish. See
[Fresh Repo Intent Readiness Safety Review](../strategy/fresh-repo-intent-readiness-safety-review.md).

**Update (slice 115): phase-level verification is explicit in bundles.** Operators importing a
bundle into Circe now see a per-phase `verificationPosture` (`executable` / `final-verification` /
`manual-review` / `needs-review`) in `circe/rekon-proof.json` `phaseGates[]` and on
`circe/phase-plan.json` `phases[].rekon`; `phase-modify` / `phase-refactor` ship a per-phase
VerificationPlan when a safe executable requirement applies, `phase-verify` carries final
verification, and `phase-investigate` / `phase-review` are reviewer-gated. A phase without
executable verification is recorded as `manual-review` or `needs-review`, never silently verified.
All fields are additive and Circe-schema-compatible. No package version change and no npm publish.

**Update (slice 116): phase-level verification reviewed safe/stable.** The Intent Bundle Phase-Level
Verification Safety Review confirmed the slice-115 posture implementation is safe/stable: every
phase has explicit verification posture, skipped verification is not proof, and posture is
projection metadata (not a VerificationRun). No commands executed, no VerificationRun /
VerificationResult, no source writes, no Circe run by Rekon, `intent:go` deferred. No package
version change and no npm publish. See
[Intent Bundle Phase-Level Verification Safety Review](../strategy/intent-bundle-phase-level-verification-safety-review.md).

**Update (slice 117): install / setup / ASCII UX decided.** The Rekon Install / Setup / ASCII Art UX
Decision selected staged install/setup polish: the V1 install path stays `npm install -D @rekon/cli`
→ `npx rekon scan` (no postinstall onboarding), with a future optional `rekon setup` and later `npm
init rekon`. First-run setup starts with scan; ASCII art never appears in `--json`; non-TTY / CI never
prompt; `intent:go` remains deferred. Decision-only — nothing implemented this slice. No package
version change and no npm publish. See
[Rekon Install / Setup / ASCII Art UX Decision](../strategy/rekon-install-setup-ascii-ux-decision.md).

**Update (slice 118): setup / welcome UI implemented.** Operators get two new read-only commands:
`rekon welcome` (a branded Scan → Snapshot → Act introduction) and `rekon setup` (a deterministic,
non-interactive setup plan that detects workspace state without running scan or creating `.rekon/`).
ASCII art never appears in `--json`; `NO_COLOR` / `REKON_NO_BANNER` are respected; non-TTY never
prompts. `rekon scan` remains the canonical first-run command and `rekon refresh` stays expert /
compatibility. No prompts, no `create-rekon`, no postinstall, `intent:go` deferred. No package
version change and no npm publish. See [Rekon Setup / Welcome UI](../concepts/rekon-setup-welcome.md).

**Update (slice 119): setup / welcome UI reviewed safe/stable.** The Rekon Setup / Welcome UI Safety
Review confirmed `rekon welcome` / `rekon setup` are safe/stable: welcome is explanatory, setup is
deterministic / non-interactive, setup does not run scan or create `.rekon/` before scan, `--json`
is banner-free, and onboarding implies no command execution, source writes, or Circe run. `intent:go`
remains deferred. No package version change and no npm publish. See
[Rekon Setup / Welcome UI Safety Review](../strategy/rekon-setup-welcome-ui-safety-review.md).

**Update (slice 120): interactive setup prompt policy decided.** The Rekon Interactive Setup Prompt
Decision selects TTY-only scan-first prompts for `rekon setup`: prompts only in human TTY mode, never
in `--json` / non-TTY / CI; before scan only the first-scan prompt; a decided (unimplemented) `--yes`
runs the first scan only; no prompt persistence; setup never runs Circe, executes commands, or writes
source. `intent:go` remains deferred. Decision-only — no CLI or behavior change and no npm publish. See
[Rekon Interactive Setup Prompt Decision](../strategy/rekon-interactive-setup-prompt-decision.md).

**Update (slice 121): fresh-repo intent prepare is now planful.** On a fresh repo, after `rekon scan`
→ `rekon intent context prepare` → `rekon intent assess` (needs-review, zero hard blockers), `rekon
intent prepare` now produces an implementation-bearing **draft** plan (investigate / modify|refactor /
verify / review with safe `npm run typecheck` / `npm test` / `npm run build` requirements) instead of
a bare review phase. The draft stays `needs-review`; approval is never auto-elevated; WorkOrder and
VerificationPlan generation remain blocked until explicit approval. No commands execute, no source is
written, `intent:go` remains deferred. No package version change and no npm publish. See
[Intent Prepare Needs-Review Planfulness Fix](../strategy/intent-prepare-needs-review-planfulness.md).

**Update (slice 122): operator approval path decided.** The Intent Operator Approval / Proof
Acceptance Decision pins how a needs-review draft `PreparedIntentPlan` becomes approved: a future
`rekon intent approve` rechecks freshness / drift / status, records the operator's accepted proof
gaps, and writes a new approved plan revision (the source draft stays immutable). Approval enables but
does not create the WorkOrder / VerificationPlan handoff; no commands execute and no source is
written; `intent:go` remains deferred. Decision-only — no CLI or behavior change and no npm publish.
See [Intent Operator Approval / Proof Acceptance Decision](../strategy/intent-operator-approval-proof-acceptance-decision.md).

**Update (slice 123): operator approval is now implemented.** On a fresh repo, after `rekon scan` →
`rekon intent context prepare` → `rekon intent assess` → `rekon intent prepare` (a needs-review draft) →
`rekon intent status`, run `rekon intent approve --prepared-plan <ref> --intent-status <ref> --accept
<gap> [--accept <gap>...] --reason <text>` to write a **new approved** `PreparedIntentPlan` revision; the
source draft stays immutable. The required `--accept` gaps are exactly the draft's `approval.reasons`
mapped to gap ids (e.g. `verification-proof-missing`, `runtime-drift-unresolved`). Approval enables — it
does not create — the WorkOrder / VerificationPlan handoffs; it creates no WorkOrder / VerificationPlan /
VerificationRun / VerificationResult, executes no commands, writes no source, and runs no Circe;
`intent:go` remains deferred. No package version change and no npm publish. See
[Intent Operator Approval / Proof Acceptance Implementation](../strategy/intent-operator-approval-proof-acceptance-implementation.md).

**Update (slice 124): operator approval reviewed safe/stable.** The Intent Operator Approval / Proof
Acceptance Safety Review confirmed `rekon intent approve` is safe/stable: explicit approval (never
auto-approved), recorded (not erased) accepted proof gaps, an immutable source draft, conservative
freshness / drift / status rechecks, and `sourceWriteAllowed` false. Approval enables but does not create
the WorkOrder / VerificationPlan handoffs; it creates no WorkOrder / VerificationPlan / VerificationRun /
VerificationResult, executes no commands, writes no source, and runs no Circe; `intent:go` remains
deferred. After approval, WorkOrder / VerificationPlan generation can still stop at
`status-not-work-ready` (a separate IntentStatusReport gate). No package version change and no npm
publish. See
[Intent Operator Approval / Proof Acceptance Safety Review](../strategy/intent-operator-approval-proof-acceptance-safety-review.md).

**Update (slice 125): status work-ready transition decided.** After `rekon intent approve` writes an
approved `PreparedIntentPlan`, WorkOrder / VerificationPlan generation can still stop at
`status-not-work-ready` because the prior `IntentStatusReport` reflects pre-approval state. The Intent
Status Work-Ready Transition Decision pins the fix: a future `rekon intent status transition` writes a
**new** work-ready `IntentStatusReport` revision from the approved plan + rechecks (the previous report
stays immutable; approval does not auto-transition). WorkOrder / VerificationPlan generation will then
proceed against the latest work-ready status. The transition creates no WorkOrder / VerificationPlan /
VerificationRun / VerificationResult, executes no commands, writes no source, and runs no Circe;
`intent:go` remains deferred. Decision-only — no CLI or behavior change and no npm publish. See
[Intent Status Work-Ready Transition Decision](../strategy/intent-status-work-ready-transition-decision.md).

**Update (slice 126): status work-ready transition shipped.** `rekon intent status transition` now
writes the new work-ready `IntentStatusReport` revision from an approved plan plus rechecks. This is
additive: new optional kernel fields (`source.approvedPreparedIntentPlanRef`,
`source.previousIntentStatusReportRef`, `proof.preparation.acceptedRisks`) — existing
`IntentStatusReport` artifacts still validate unchanged. No migration action is required; the previous
report and approved plan are never mutated. No package version change and no npm publish. See the
[Intent Status Work-Ready Transition Implementation](../strategy/intent-status-work-ready-transition-implementation.md).

**Update (slice 127): status work-ready transition reviewed safe/stable.** The safety review confirms the
shipped `rekon intent status transition` introduces no migration action: the additive fields stay
optional, existing `IntentStatusReport` artifacts still validate unchanged, and the previous report and
approved plan remain immutable. Review-only — no code or version change and no npm publish. See the
[Intent Status Work-Ready Transition Safety Review](../strategy/intent-status-work-ready-transition-safety-review.md).

> **Loop closure (slice 135):** the full plan compiler loop (review → answer → merge-back → prepare) is proven end-to-end on a fresh repo through approval, work-ready status, and the gated WorkOrder / VerificationPlan / Circe-bundle handoff — see [`plan-compiler-loop-closure.md`](../strategy/plan-compiler-loop-closure.md).

> **Dogfood review (slice 136):** the closed public path is dogfooded on a realistic fresh TypeScript package and confirmed Circe-importable end-to-end — boundaries explicit, source/plan/test files immutable, no Circe-run record, `intent:go` deferred — see [`fresh-repo-intent-handoff-circe-dogfood-review.md`](../strategy/fresh-repo-intent-handoff-circe-dogfood-review.md).

> **Provider routing (slice 137):** a shared LLM provider router is decided for semantic normalization (task routes, injected adapters, env/config/CLI provider selection); no provider implemented yet, and provider output stays inside the same non-executing plan-compiler boundary — see [`rekon-llm-provider-routing-semantic-normalization-decision.md`](../strategy/rekon-llm-provider-routing-semantic-normalization-decision.md).
