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
