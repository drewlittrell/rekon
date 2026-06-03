# Rekon V1 Release Notes

> **Semantic quality proven (slice 141):** LLM-backed semantic normalization was dogfooded live (OpenAI `gpt-4o-mini`) — it extracts objectives/deliverables/acceptance/paths/commands and preserves non-goals with **zero invented paths or commands**, while staying a proposal that is schema-gated and deterministically rechecked. See [`intent-plan-semantic-quality-dogfood.md`](../strategy/intent-plan-semantic-quality-dogfood.md).

> Draft release notes prepared by V1 Release Prep Implementation. No version bump, no
> tag, and no npm publish has occurred; the packages remain at `0.1.0-beta.0`. Versioning,
> tagging, and publishing are separate, explicitly-approved slices.

> **Fresh-repo dogfood (slice 140):** the full operator path (scan → review →
> answer → prepare → approve → status → handoff → bundle) was re-run on a fresh
> repo with semantic mode and the bundle imported into a local Circe checkout;
> Rekon writes no source, runs no commands, and runs no Circe — see
> [`../strategy/fresh-repo-intent-handoff-circe-dogfood-review-semantic.md`](../strategy/fresh-repo-intent-handoff-circe-dogfood-review-semantic.md).

> **Semantic normalization (slice 139):** the plan compiler can use a routed LLM
> provider (`createOpenAiLlmProvider` behind `RekonLlmRouter`, selected via
> `--llm-provider` / `--llm-model` and `REKON_LLM_*` env). LLM output is proposal,
> not proof — schema-validated and deterministically re-checked; no source writes,
> command execution, Circe run, or `intent:go`. See
> [`../strategy/intent-plan-compiler-semantic-normalization-dogfood.md`](../strategy/intent-plan-compiler-semantic-normalization-dogfood.md).

## V1 Definition

**V1 means prepare/prove/package/export, not Rekon-side execution.** Rekon V1 is the
non-executing Rekon → Circe prepared-plan handoff: Rekon assesses an intent, prepares a
proof-approved plan, reports status, generates a WorkOrder and a VerificationPlan, writes a
human/agent plan bundle, and writes a Circe-compatible proof/gate projection — then hands
execution to Circe. The V1 product scope was conditionally approved by the V1 Readiness /
Release Review and its release mechanics staged by the V1 Release Mechanics / Versioning
Decision.

## Included Surfaces

- IntentAssessmentReport
- PreparedIntentPlan (with the approval/proof envelope)
- IntentStatusReport
- WorkOrder (intent handoff)
- VerificationPlan (intent handoff)
- Plan bundle (`.rekon/intent/plans/<intent-id>/`)
- Circe proof/gate projection (`.rekon/intent/plans/<intent-id>/circe/`)
- CLI help surface listing the rich intent workflow

## Included Commands

```
rekon intent plan review
rekon intent assess
rekon intent prepare
rekon intent status
rekon intent work-order generate
rekon intent verification-plan generate
rekon intent bundle write
```

`rekon intent prepare` additionally accepts an optional `--actionability-report <ref>`
flag (slice 131) that gates preparation on the plan compiler's
`IntentPlanActionabilityReport`: an actionable report may feed `PreparedIntentPlan`
generation, while a needs-revision / blocked report blocks preparation with revision
guidance (no plan written). Prepare still does not auto-approve, execute commands, or
write source; `intent:go` stays deferred. See
[Intent Prepare Integration With Actionability Report](../strategy/intent-prepare-actionability-integration.md),
safety-reviewed safe/stable in the
[Intent Prepare Actionability Integration Safety Review](../strategy/intent-prepare-actionability-integration-safety-review.md).
A future `rekon intent plan answer` (decided in the
[Plan Actionability Answer / Merge-Back Decision](../strategy/plan-actionability-answer-merge-back-decision.md); shipped as `rekon intent plan answer` — [implementation](../strategy/plan-actionability-answer-merge-back-implementation.md))
will merge answers to elicitation questions into a new `IntentPlanActionabilityReport` revision so a revised
plan can become actionable — still no source writes, no command execution, no auto-approval, no `intent:go`.

The generated bundle is then handed to Circe via `circe rekon-handoff validate` /
`routes`, `circe import rekon-handoff`, and `circe serve --mode worker` — these are
external, Circe-owned steps.

> The optional pre-assess `rekon intent plan review` step (`IntentPlanActionabilityReport`) was
> safety-reviewed safe/stable as a read / transform / report-only plan-compiler layer — it creates no
> downstream artifacts, executes no commands, writes no source, and runs no Circe. See the
> [Intent Plan Actionability Report Safety Review](../strategy/intent-plan-actionability-report-safety-review.md).

## Rekon / Circe Boundary

**Circe owns orchestration for V1.** Rekon prepares, proves, packages, and exports; Circe
validates, previews routes, imports, and orchestrates execution. The Circe proof/gate
projection carries Rekon's approval/proof state so Circe imports a proof-carrying package
rather than a flat plan. **Rekon does not execute commands in V1. Rekon does not write
source files in V1.** The bundle and projection are written only under
`.rekon/intent/plans/<intent-id>/`; canonical truth remains `.rekon/artifacts/`.

## Proof And Safety Evidence

- Full Rekon test suite passing and package gates green (export audit, license audit,
  publish dry-run, install-from-build and install-from-tarball smokes across all 21
  packages).
- Circe handoff schema validation passing against Circe's real normalizers.
- **External Circe serve-loop proof passed: pass 1 / fail 0** — the current built Rekon
  CLI drove `circe rekon-handoff validate` → `routes` → `circe import rekon-handoff` →
  `circe serve --mode worker`, dispatching, committing, continuing, and stopping every
  generated phase.
- Eight shipped intent safety reviews: IntentAssessmentReport, PreparedIntentPlan,
  IntentStatusReport, WorkOrder handoff, VerificationPlan handoff, Agent Handoff bundle,
  Circe Handoff Projection, and Circe Proof/Gate Projection.
- Top-level help alignment covered by the CLI help contract test.

## Explicit Exclusions

- `intent:go` — **intent:go remains deferred beyond V1.**
- Rekon-side command execution.
- Rekon-side source writes.
- Rekon-side VerificationRun / VerificationResult generation —
  **VerificationRun and VerificationResult generation remain deferred beyond V1.**
- npm publish / version bump / git tag — deferred to separate, explicitly-approved
  slices.

## Known Limitations

- No `intent:go` (explicit exclusion).
- No Rekon-side VerificationRun (delegated/deferred).
- No Rekon-side source writes (explicit exclusion).
- The bundle is a projection; canonical truth remains `.rekon/artifacts/`.
- Circe is a required dependency for orchestration.
- Release mechanics (version / tag / publish) are not completed — separate slices.

## Package Scope

All 21 public workspace packages release together (lockstep). At the time of this prep
slice every package is at `0.1.0-beta.0`; the private workspace root `rekon` is the
container and is not published. The intended release target is `1.0.0` applied lockstep,
deferred to an explicit versioning slice.

> Updated (slice 108): the lockstep version bump has been executed — all 21 public packages
> and the private root are now at **`1.0.0`** (internal `@rekon/*` pins and
> `package-lock.json` updated to match). No git tag and no npm publish occurred; those remain
> separate, explicitly-approved slices. See
> [V1 Versioning Implementation](../strategy/v1-versioning-implementation.md).

## Verification Gates

The standard nine-command gate must pass before any release action:

```
npm run typecheck
npm run test
npm run build
git diff --check
node scripts/audit-package-exports.mjs
node scripts/audit-license.mjs
node scripts/publish-dry-run.mjs
node scripts/install-smoke.mjs
node scripts/install-tarball-smoke.mjs
```

## Next Steps

- **V1 Versioning Decision / Implementation** — decide and, if approved, bump all 21
  public packages lockstep from `0.1.0-beta.0` to `1.0.0`.
- Then a separate git-tag slice, then a separate, approval-gated npm-publish slice.
- `intent:go` / Rekon-side execution remain out of V1 and are a later, separate decision.

## Update — First-Run Onboarding (slice 110)

The V1 install / first-run onboarding model is decided in
[Rekon First-Run Scan / Install Onboarding Decision](../strategy/rekon-first-run-scan-onboarding-decision.md):
the public first-run verb is `rekon scan` (not `refresh`). `rekon scan` initializes `.rekon/`
if needed and creates the first repository intelligence substrate; docs / agent-context /
verification / CI options are offered only after the first scan. `refresh` is retained as an
expert / compatibility alias. This is a vocabulary / UX decision only — **no `rekon scan`
implementation, no CLI behavior change, no version bump, no npm publish.**

## Update — First-Run Scan Implemented (slice 111)

`rekon scan` is now **implemented** (Rekon First-Run Scan Implementation): the canonical
first-run command `rekon scan [--root <path>] [--json]` initializes `.rekon/` if needed and
creates the first repository intelligence substrate (sharing the existing `refresh` pipeline),
then reports the workspace state and post-scan next actions. `scan --json` carries boundary
booleans and emits no ASCII art. `refresh` is unchanged and retained as the expert /
compatibility update command. **No version bump and no npm publish occurred.**

## Update — First-Run Scan Safety Review (slice 112)

The Rekon First-Run Scan Safety Review confirmed `rekon scan` is **safe/stable as the canonical
first-run command** — first-run and repeat paths pass, `refresh` is preserved as the expert /
compatibility verb, the no-docs/agent/CI/verification-before-scan and no-execution /
no-source-write / no-ASCII-in-`--json` boundaries hold, and the `config.capabilities`
normalization (`[]` = defaults) is acceptable for v1. No code or behavior change. See
[Rekon First-Run Scan Safety Review](../strategy/rekon-first-run-scan-safety-review.md).

## Update — Fresh-Repo Intent Readiness (slice 113)

The fresh-repo intent-preparation path is fixed: a fresh operator runs `rekon scan` → **`rekon
intent context prepare`** → `rekon intent assess` → … → `rekon intent bundle write` with no
manual `.rekon/artifacts` seeding. `rekon intent context prepare` builds the intent-readiness
context substrate (StepCapabilityGraph + runtime/handoff context, recorded as not-evaluated
where there is no event log) by running the existing producer commands, and is now discoverable
in top-level help. No change to `scan` / `refresh` or the `intent assess` approval/proof policy;
no `intent:go` and no Circe execution by Rekon.

## Update — Fresh-Repo Intent Readiness Reviewed (slice 114)

The Fresh Repo Intent Readiness Safety Review confirmed the slice-113 fresh-repo intent-context
fix is **safe/stable**. The public fresh-repo sequence `rekon scan` → **`rekon intent context
prepare`** → `rekon intent assess` → … → `rekon intent bundle write` works without manual
`.rekon/artifacts` seeding; `rekon intent context prepare` uses the existing producer commands in
dependency order; `rekon scan` / `rekon refresh` and the `intent assess` severity policy are
unchanged; missing runtime/handoff evidence is recorded as `not-evaluated` / `observation-missing`
rather than false success; Rekon runs no Circe and writes no source in this path; `intent:go`
remains deferred; phase-level VerificationPlan behavior is a recorded follow-up. No package
version change and no npm publish. See
[Fresh Repo Intent Readiness Safety Review](../strategy/fresh-repo-intent-readiness-safety-review.md).

## Update — Phase-Level Verification In Bundles (slice 115)

The intent plan bundle and its Circe projection now make phase-level verification **explicit**, so
skipped verification never reads as proof. Every phase carries a `verificationPosture`
(`executable` / `final-verification` / `manual-review` / `needs-review`) in `circe/rekon-proof.json`
`phaseGates[]`, on `circe/phase-plan.json` `phases[].rekon`, in `verification-plan.md`, and in
`agent/verification.json`. `phase-modify` / `phase-refactor` map the plan's safe executable
verification requirements and ship a per-phase VerificationPlan (or `needs-review` when none
applies); `phase-verify` carries final verification; `phase-investigate` / `phase-review` are
reviewer-gated `manual-review`. `rekon intent bundle write` reports a `phaseVerification` summary.
Derived in the bundle projection layer only — no canonical artifact, approval/proof, or
runtime-execution change; no `intent:go`, no Circe execution by Rekon, no source writes. No package
version change and no npm publish.

## Update — Phase-Level Verification Reviewed (slice 116)

The Intent Bundle Phase-Level Verification Safety Review confirmed the slice-115 phase-level
verification posture implementation is **safe/stable**. Every phase has explicit verification
posture; `phase-modify` / `phase-refactor` get executable verification when safe requirements exist
(else `needs-review`); `phase-verify` carries final verification; `phase-investigate` /
`phase-review` are explicit manual / reviewer gates; a phase without executable verification is
never silently verified; skipped verification is not proof; the posture is projection metadata, not
a VerificationRun. No commands executed, no VerificationRun / VerificationResult created, no source
writes, no Circe run by Rekon, `intent:go` deferred. No package version change and no npm publish.
See
[Intent Bundle Phase-Level Verification Safety Review](../strategy/intent-bundle-phase-level-verification-safety-review.md).

## Update — Install / Setup / ASCII UX Decided (slice 117)

The Rekon Install / Setup / ASCII Art UX Decision selected **Option B — staged install/setup
polish**. The V1 install path stays scriptable — `npm install -D @rekon/cli` then `npx rekon scan` —
with a future optional `rekon setup` and later `npm init rekon` layering interactive guidance.
Install runs no onboarding (`@rekon/cli` ships no postinstall); first-run setup starts with scan;
docs / agent / verification options are not offered before the first scan; ASCII art never appears in
`--json`; non-TTY / CI never prompt and default to no banner; `NO_COLOR` / `REKON_NO_BANNER` are
respected; onboarding never implies command execution, source writes, or Circe execution by Rekon;
`intent:go` remains deferred. Decision-only — no setup / prompts / ASCII / `create-rekon` / dependency
implemented. No package version change and no npm publish. See
[Rekon Install / Setup / ASCII Art UX Decision](../strategy/rekon-install-setup-ascii-ux-decision.md).

## Update — Setup / Welcome UI Implemented (slice 118)

The non-interactive-safe welcome / setup UI foundation is implemented. `rekon welcome [--json]
[--no-banner]` prints a branded Scan → Snapshot → Act lifecycle introduction; `rekon setup [--root
<path>] [--json] [--no-banner]` is deterministic and non-interactive, detecting workspace state
read-only (no scan, no `.rekon/` creation before scan) and printing recommended next actions. ASCII
art never appears in `--json`; `NO_COLOR` disables color, `REKON_NO_BANNER` / `--no-banner` disable
the banner, non-TTY shows the compact mark and never prompts. No prompts, no `create-rekon`, no
postinstall onboarding, no dependency, no Circe execution, no command execution, no source writes;
`intent:go` remains deferred. No package version change and no npm publish. See
[Rekon Setup / Welcome UI](../concepts/rekon-setup-welcome.md).

## Update — Setup / Welcome UI Reviewed (slice 119)

The Rekon Setup / Welcome UI Safety Review confirmed the slice-118 `rekon welcome` / `rekon setup`
implementation is **safe/stable**. `rekon welcome` is explanatory (not action-taking); `rekon setup`
is deterministic and non-interactive, does not run scan, does not create `.rekon/` before scan, and
generates no docs / agent handoff / CI / VerificationPlan. ASCII art never appears in `--json`;
`REKON_NO_BANNER` / `NO_COLOR` are respected; non-TTY setup does not prompt; onboarding implies no
Circe run, command execution, or source writes; `intent:go` remains deferred. No package version
change and no npm publish. See
[Rekon Setup / Welcome UI Safety Review](../strategy/rekon-setup-welcome-ui-safety-review.md).

## Update — Interactive Setup Prompt Decided (slice 120)

The Rekon Interactive Setup Prompt Decision pins the prompt policy for `rekon setup`: **TTY-only
scan-first prompts**. Prompts are allowed only in human TTY mode; `rekon setup --json`, non-TTY, and
CI never prompt. Before scan, setup may ask only whether to run the first scan; after a snapshot
exists it may present post-scan next actions as explicit choices. A decided (unimplemented) `--yes`
flag may run the first scan only and must not perform downstream actions automatically. Prompt answers
are not persisted in v1. Setup never runs Circe, executes arbitrary commands, or writes source files;
`intent:go` remains deferred. Decision-only — no CLI, package version, or runtime change and no npm
publish. See
[Rekon Interactive Setup Prompt Decision](../strategy/rekon-interactive-setup-prompt-decision.md).

## Update — Intent Prepare Planfulness (slice 121)

`rekon intent prepare` now produces an implementation-bearing **draft** plan when `rekon intent
assess` is `needs-review` with zero hard blockers, instead of a bare review phase. The draft includes
investigate / modify (or refactor) / verify / review phases plus safe default verification
requirements (`npm run typecheck`, `npm test`, `npm run build`) derived from `package.json` scripts
and attached to the implementation + verify phases. The plan stays `needs-review`; approval is never
auto-elevated; `rekon intent work-order generate` and `rekon intent verification-plan generate`
remain blocked until explicit approval. No commands execute, no VerificationRun / VerificationResult
is created, no source is written, and `intent:go` remains deferred. No package version change and no
npm publish. See
[Intent Prepare Needs-Review Planfulness Fix](../strategy/intent-prepare-needs-review-planfulness.md).

## Update — Operator Approval Decided (slice 122)

The Intent Operator Approval / Proof Acceptance Decision pins the explicit path to approve a
needs-review draft `PreparedIntentPlan`: a future `rekon intent approve` rechecks freshness / drift /
status, records the operator's explicitly accepted proof gaps, and writes a **new** approved plan
revision (the source draft stays immutable). Approval is explicit (never auto-approved), accepts named
gaps rather than erasing them, and may enable WorkOrder / VerificationPlan handoff but does not create
them. No VerificationRun / VerificationResult, no command execution, no source writes; `intent:go`
remains deferred. No package version change and no npm publish. See
[Intent Operator Approval / Proof Acceptance Decision](../strategy/intent-operator-approval-proof-acceptance-decision.md).

## Update — Operator Approval / Proof Acceptance Implementation (slice 123)

`rekon intent approve` is implemented. It reads a needs-review draft `PreparedIntentPlan`, verifies the
operator explicitly accepted the draft's known proof gaps (`--accept <gap>` with a required `--reason`),
rechecks freshness / runtime drift / status context, and writes exactly one **new approved**
`PreparedIntentPlan` revision — the source draft is never mutated and stays byte-identical. The approved
revision sets `status.value=prepared` / `recommendedNextAction=create-work-order`,
`approval.status=approved` (reasons gain `explicit-operator-approval` + `manual-risk-acceptance`),
records the accepted gaps as `approval.acceptedRisks[]`, and flips
`downstreamHandoff.workOrderAllowed` / `verificationPlanAllowed` to `true` while keeping
`sourceWriteAllowed` the literal `false`. Approval is never automatic, enables but does not create the
WorkOrder / VerificationPlan handoffs, and creates no WorkOrder / VerificationPlan / VerificationRun /
VerificationResult, executes no commands, writes no source, and runs no Circe; `intent:go` remains
deferred. No package version change and no npm publish. See
[Intent Operator Approval / Proof Acceptance Implementation](../strategy/intent-operator-approval-proof-acceptance-implementation.md).

## Update — Operator Approval / Proof Acceptance Safety Review (slice 124)

The Intent Operator Approval / Proof Acceptance Safety Review confirmed `rekon intent approve` is
safe/stable: approval is explicit (needs-review plans are never auto-approved); accepted proof gaps are
recorded, not erased; approval writes a new approved `PreparedIntentPlan` revision while the source draft
stays immutable; freshness / runtime drift / IntentStatusReport are rechecked conservatively; approval
blocks unknown or missing required accepted gaps and empty approval reasons; and `sourceWriteAllowed`
remains the literal `false`. Approval may enable but does not create the WorkOrder / VerificationPlan
handoffs, and creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no
commands, writes no source, and runs no Circe; `intent:go` remains deferred. `status-not-work-ready`
remains a separate downstream gate after approval. No package version change and no npm publish. See
[Intent Operator Approval / Proof Acceptance Safety Review](../strategy/intent-operator-approval-proof-acceptance-safety-review.md).

## Update — Status Work-Ready Transition Decision (slice 125)

The Intent Status Work-Ready Transition Decision pins how an approved `PreparedIntentPlan` reaches
work-ready status past the remaining `status-not-work-ready` gate. Selected Option B: a future
`rekon intent status transition` writes a **new** `IntentStatusReport` work-ready revision after reading
the approved plan and the previous status report and rechecking freshness / drift / status. The previous
report stays immutable; operator approval does not auto-transition status. The work-ready report sets
`status.value = work-ready` and `recommendedNextAction = create-work-order`. The transition may enable but
does not create the WorkOrder / VerificationPlan handoffs; it creates no WorkOrder / VerificationPlan /
VerificationRun / VerificationResult, executes no commands, writes no source, and runs no Circe;
`intent:go` remains deferred. Decision-only — nothing implemented this slice. No package version change
and no npm publish. See
[Intent Status Work-Ready Transition Decision](../strategy/intent-status-work-ready-transition-decision.md).

**Shipped (slice 126): `rekon intent status transition`.** The decision is now implemented: the command
reads an approved `PreparedIntentPlan` plus the previous `IntentStatusReport`, rechecks freshness / drift
/ status, and writes one new work-ready `IntentStatusReport` (`status.value = work-ready`,
`recommendedNextAction = create-work-order`). The previous report and approved plan stay immutable; the
transition creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no
commands, writes no source, runs no Circe, and does not implement `intent:go`. Additive kernel fields
(`source.approvedPreparedIntentPlanRef`, `source.previousIntentStatusReportRef`,
`proof.preparation.acceptedRisks`) are backward compatible. No package version change and no npm publish.
See the [Intent Status Work-Ready Transition Implementation](../strategy/intent-status-work-ready-transition-implementation.md).

**Reviewed (slice 127): `rekon intent status transition` is safe/stable.** The safety review confirms the
transition is explicit (approval never auto-transitions), writes a new immutable `IntentStatusReport`
revision, leaves the previous report and approved plan immutable, rechecks prior status / freshness /
runtime drift conservatively, carries `acceptedRisks` into proof, and enables but does not create the
WorkOrder / VerificationPlan handoffs — creating no WorkOrder / VerificationPlan / VerificationRun /
VerificationResult, executing no commands, writing no source, and running no Circe; `intent:go` remains
deferred. Review-only — no code or version change and no npm publish. See the
[Intent Status Work-Ready Transition Safety Review](../strategy/intent-status-work-ready-transition-safety-review.md).

**Decided (slice 128): Classic Intent Plan Compiler / Elicitation Parity.** A parity audit found the
old codebase-intel system compiled and interrogated plans (intake sufficiency → normalization into
executable phase drafts → per-phase actionability gates → missing-info elicitation), a layer Rekon had
not rebuilt. The decision adds a report-first `IntentPlanActionabilityReport` + `rekon intent plan
review` that normalizes a plan and reports exactly what must change before approval, with LLM-backed
semantic normalization in scope (deterministic-first, bounded to read / transform / critique / elicit;
never execution). Report-only: no plan mutation, no source writes, no command execution, no Circe;
`intent:go` deferred. Decision-only — nothing implemented this slice. No package version change and no
npm publish. See the
[Classic Intent Plan Compiler / Elicitation Parity Decision](../strategy/classic-intent-plan-compiler-elicitation-parity-decision.md).

> **Loop closure (slice 135):** the full plan compiler loop (review → answer → merge-back → prepare) is proven end-to-end on a fresh repo through approval, work-ready status, and the gated WorkOrder / VerificationPlan / Circe-bundle handoff — see [`plan-compiler-loop-closure.md`](../strategy/plan-compiler-loop-closure.md).

> **Dogfood review (slice 136):** the closed public path is dogfooded on a realistic fresh TypeScript package and confirmed Circe-importable end-to-end — boundaries explicit, source/plan/test files immutable, no Circe-run record, `intent:go` deferred — see [`fresh-repo-intent-handoff-circe-dogfood-review.md`](../strategy/fresh-repo-intent-handoff-circe-dogfood-review.md).

> **Provider routing implemented (slice 138):** `@rekon/llm-provider` ships the shared router; `rekon intent plan review` gains `--llm-provider` / `--llm-model` and a router-bound adapter — no live provider yet, providers stay proposal-not-proof — see [`rekon-llm-provider-routing-implementation.md`](../strategy/rekon-llm-provider-routing-implementation.md).

> **Provider routing (slice 137):** semantic normalization is being generalized into a shared LLM provider router (task routes, injected adapters, `--llm-provider` / `--llm-model`); providers may read/transform/critique text but never approve/execute/write source/run Circe/implement `intent:go`, and LLM output is proposal, not proof — see [`rekon-llm-provider-routing-semantic-normalization-decision.md`](../strategy/rekon-llm-provider-routing-semantic-normalization-decision.md).
