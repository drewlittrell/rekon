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

Rekon runs the first six commands to assess, prepare a proof-approved plan, report status,
generate the WorkOrder and VerificationPlan, and write the bundle. Circe then validates,
previews routes, and imports the handoff — and orchestrates execution.

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
