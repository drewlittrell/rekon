# Review Packet — Intent Plan Bundle → Circe Handoff Projection Decision (slice 98)

## CHANGES MADE

Strategy / architecture decision batch — no runtime behavior change. Adds
`docs/strategy/intent-plan-bundle-circe-handoff-projection-decision.md` (pins the
Circe projection shape, grounded in real Circe source), this review packet, a
16-assertion docs test, and cross-reference footers / CHANGELOG / README pointers.
No source files changed; no projection implemented.

## PUBLIC API CHANGES

None. No helper, type, CLI flag, or artifact shape changed. The decision proposes a
future `circe/` projection under the bundle but implements nothing.

## PURPOSE PRESERVATION CHECK

Rekon owns plan preparation and packaging; Circe owns orchestration and execution.
The bundle is the final non-executing handoff surface; the next boundary is making
it importable by Circe without Circe parsing Rekon internals. The decision preserves
the boundary: Rekon emits Circe's exact `rekon-circe-handoff` package as a
projection derived from the bundle, runs no Circe commands, executes nothing, writes
no source, mutates no canonical artifacts, and leaves orchestration to Circe;
`intent:go` stays deferred.

## CODEBASE-INTEL ALIGNMENT

Grounded in the **actual Circe source** (not inferred from names): `src/adapters/
rekon-handoff.ts` (the `RekonHandoffManifest` type + `validateHandoffShape` /
`validateRekonHandoff` / `importRekonHandoff`), `docs/strategy/
rekon-to-circe-handoff-contract.md`, and the `tests/fixtures/rekon-handoffs/
valid-handoff/` fixtures (handoff.json / phase-plan.json / work-orders /
verification-plans). The projection re-uses the canonical Rekon WorkOrder /
VerificationPlan shapes that Circe already normalizes.

## OPTIONS CONSIDERED

A no-projection (rejected), **B `circe/` under the bundle (selected)**, C replace the
bundle with Circe format (rejected — loses human/agent layer), D Circe reads Rekon
artifacts directly (rejected/deferred — couples Circe to Rekon internals), E
implement intent:go now (rejected).

## DIRECTORY MODEL

`.rekon/intent/plans/<intent-id>/circe/` with `handoff.json`, `phase-plan.json`,
`work-orders/<phase-id>.work-order.json`, `verification-plans/<phase-id>.verification-plan.json`.
Bundle invariant: Markdown / agent files = review + LLM handoff; `circe/*.json` =
orchestration import projection; `.rekon/artifacts/...` = canonical truth. Circe
resolves manifest-relative paths from `circe/`.

## MANIFEST MODEL

`handoff.json` matches Circe exactly: `schemaVersion: 1` (number), `kind:
"rekon-circe-handoff"`, `handoffId`, `repoRoot`, `sourcePlanPath?`, `phasePlanPath`,
`producer.{system: "rekon", version}`, `status: "ready"`, `warnings[]`,
`artifacts.{workOrders,verificationPlans}[{phaseId, path, artifactId}]`.

## PHASE PLAN MODEL

`phase-plan.json`: `schemaVersion: 1`, `planId`, `repoRoot`, `phases[{ phaseId,
title, workOrderPath, verificationPlanPath, implementerProfile? }]`.

## WORKORDER PROJECTION MODEL

Circe requires one WorkOrder per phase; Rekon's whole-plan WorkOrder is split into
one per PreparedIntentPlan phase, each in the canonical Rekon `WorkOrder` shape
(header + goal/paths/ownerSystems/riskNotes/requiredChecks/successCriteria/…),
populated from that phase's data. Projection files, not registered artifacts.

## VERIFICATIONPLAN PROJECTION MODEL

Optional per Circe (omission → warning). When emitted, canonical Rekon
`VerificationPlan` shape (header + workOrderRef + commands + successCriteria +
source), derived from the phase's verification requirements; commands are text, never
executed.

## ROUTING / IMPLEMENTER PROFILE MODEL

`implementerProfile` is optional in Circe and must match a workflow profile with a
supported worker kind (`codex_app_server` / `external_harness`). Rekon omits it by
default (does not know the operator's profiles); a future slice may make it
configurable.

## VALIDATION MODEL

Compatibility proven by `circe rekon-handoff validate` / `routes` / `circe import
rekon-handoff`, run by the operator/CI — never by Rekon during bundle generation
(unless explicitly opted into later). Validation checks schemaVersion===1, kind,
producer.system==="rekon", status==="ready", phase-plan validity, profile/worker-kind
support, and artifact normalization.

## BOUNDARY MODEL

Rekon vs Circe (prepare/package vs orchestrate/execute); projection vs canonical
artifacts (projection vs truth); projection vs Markdown bundle (orchestration JSON vs
review files); bundle generation vs Circe validation (no command execution by
default); projection vs intent:go (import handoff, not execution); projection vs
source writes (none outside bundle).

## TESTS / VERIFICATION

- New `tests/docs/intent-plan-bundle-circe-handoff-projection-decision.test.mjs` (16
  assertions).
- Full gate: typecheck, test (full suite), build, `git diff --check`,
  audit-package-exports, audit-license, publish-dry-run, install-smoke,
  install-tarball-smoke. No CLI smoke (decision-only batch).

## INTENTIONALLY UNTOUCHED

No projection implementation, no `circe/*` files, no Circe command execution, no
artifact-type registration, no CLI command, no canonical artifact mutation, no
command execution, no source writes, no `intent:go`, no version bump, no publish.

## RISKS / FOLLOW-UP

- Per-phase WorkOrder/VerificationPlan derivation from a whole-plan WorkOrder must be
  pinned carefully in the implementation; ground against the same Circe validators.
- `implementerProfile` is omitted in v1; a configurable mapping is a follow-up.
- The Circe contract's canonical package location is `.rekon/handoffs/<id>/`; Rekon's
  projection lives under the bundle and is passed to Circe via `--handoff`.

## NEXT STEP

Intent Plan Bundle → Circe Handoff Projection Implementation.
