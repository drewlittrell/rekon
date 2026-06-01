# Rekon V1 Release Notes

> Draft release notes prepared by V1 Release Prep Implementation. No version bump, no
> tag, and no npm publish has occurred; the packages remain at `0.1.0-beta.0`. Versioning,
> tagging, and publishing are separate, explicitly-approved slices.

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
rekon intent assess
rekon intent prepare
rekon intent status
rekon intent work-order generate
rekon intent verification-plan generate
rekon intent bundle write
```

The generated bundle is then handed to Circe via `circe rekon-handoff validate` /
`routes`, `circe import rekon-handoff`, and `circe serve --mode worker` — these are
external, Circe-owned steps.

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
