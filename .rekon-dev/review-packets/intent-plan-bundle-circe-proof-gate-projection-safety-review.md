# Review Packet — Intent Plan Bundle → Circe Proof/Gate Projection Safety Review

## CHANGES MADE

Strategy / safety-review batch — no runtime behavior change. Expands the proof/gate
projection safety review to record the external Rekon → Circe serve-loop execution proof
and the stale top-level-help discoverability gap, and revises the recommended next slice
to CLI Intent Help Surface Alignment → V1 Readiness. Updates the memo, this review
packet, the docs test (24 assertions), cross-reference footers, CHANGELOG, README.

## PUBLIC API CHANGES

None. No helper, type, CLI flag, artifact shape, projection behavior, or CLI help
changed.

## PURPOSE PRESERVATION CHECK

Rekon prepares, proves, packages, and projects; Circe imports and orchestrates. The
slice-101 proof/gate sidecar exists so the import adapter does not flatten away Rekon's
proof-approved preparation model. This review confirms the purpose holds: the sidecar
carries the approval/proof envelope, the IntentStatusReport gate state, the
freshness/drift refs, and per-phase gate metadata; it never upgrades source approval; it
keeps `sourceWriteAllowed` / `commandsExecuted` false and `intentGoDeferred` true; the
enriched projection stays Circe-compatible; and the external serve-loop proof shows Circe
— not Rekon — runs the workers. Rekon still runs no Circe, executes nothing, writes no
source, and defers `intent:go`.

## CODEBASE-INTEL ALIGNMENT

Grounded in the shipped slice-101 code (`renderCirceProjection` in
`packages/capability-docs/src/intent-plan-bundle.ts` + the CLI `intent bundle write`
output), the kernel `PreparedIntentPlanApprovalProof` the sidecar re-projects, the
recovered/rebuilt main CLI (re-confirmed working), and Circe's integration test
(`tests/integration/rekon-intent-handoff-serve-loop.test.ts`).

## HELPER / CLI REVIEWED

`buildIntentPlanBundle` / `renderCirceProjection` (pure renderer; reads no files, writes
none, runs no commands) and `rekon intent bundle write` (writes `circe/` files incl.
`rekon-proof.json` only under the bundle directory with path safety; surfaces
`circe.rekonProof` + `boundaries.runsCirce: false`; runs no Circe).

## PROOF SIDECAR REVIEW

`circe/rekon-proof.json` (`kind: "rekon-circe-proof"`): `sourceArtifacts` (refs +
digests), `approval` (status + reasons), `intentStatus` (value + recommendedNextAction),
`gates`, `proof` (runtimeDrift / handoffCoverage / freshness / verification /
planStructure with `Type:id` refs), `phaseGates`, `warnings`. Pointed at by
`manifest.circe.rekonProof` / `manifest.files.circeProof` and `handoff.json`
`rekonProofPath`.

## GATE STATE REVIEW

`gates.preparedPlanApproved` = `approval.status === "approved"`; `workOrderAllowed` /
`verificationPlanAllowed` = approved && the matching `downstreamHandoff.*` flag;
`sourceWriteAllowed: false`, `commandsExecuted: false`, `intentGoDeferred: true` are
hard-pinned. Honest by construction: no approval ⇒ gates false (proven on a needs-review
plan in the slice-101 CLI smoke).

## PHASE GATE REVIEW

`phaseGates[]`: `phaseId` (matching the projection), `approvalStatus`, `readyForCirce`
(`planApproved && phase not blocked`), `obligationIds`, `verificationRequirementIds`,
`blockers`, `warnings`, `boundaries` (sourceWriteAllowed:false / commandsExecuted:false /
intentGoDeferred:true). Mirrored minimally onto each phase-plan phase as `rekon`.

## WORKORDER / VERIFICATIONPLAN TRACEABILITY REVIEW

Per-phase WorkOrder `intentHandoff` (plan ref, phase id, approval status, obligation /
requirement ids, source refs, boundaries) and per-phase VerificationPlan `intentHandoff`
(plan ref, phase id, requirement ids, source refs, boundaries with
createsVerificationRun:false / executesCommands:false / writesSourceFiles:false /
intentGoDeferred:true). Additive; ignored by Circe normalizers.

## CIRCE COMPATIBILITY REVIEW

Additive enrichment (Rekon-owned sidecar + ignored extras); no Circe-validated file's
required shape changed. Re-validated against Circe's real normalizers
(`readRekonHandoffManifestFile` / `readRekonPhasePlanFile` / `normalizeRekonWorkOrder` /
`normalizeRekonVerificationPlan`) in slice 101 for both a hand-crafted and a
real-pipeline projection — both accepted.

## EXTERNAL REKON / CIRCE EXECUTION PROOF

The current built Rekon CLI drove a full Circe handoff to a passing result via Circe's
integration test
(`/Users/andrewlittrell/Code/Circe/tests/integration/rekon-intent-handoff-serve-loop.test.ts`):

```
CIRCE_REKON_INTENT_CLI_PATH=/Users/andrewlittrell/Code/rekon/packages/cli/dist/index.js \
  node --import tsx --test tests/integration/rekon-intent-handoff-serve-loop.test.ts
# pass 1, fail 0
```

Covered: `intent assess` / `prepare` / `status` / `work-order generate` /
`verification-plan generate` / `bundle write`; generated `circe/handoff.json`; `circe
rekon-handoff validate` / `routes`; `circe import rekon-handoff`; `circe serve --mode
worker`; all phases dispatched, committed, continued, stopped. Recorded as supplied; not
re-run here (heavy worker serve-loop left to Circe CI; Rekon's projection shape is
independently proven by the normalizer checks). The serve-loop test file exists and was
confirmed; the recovered main CLI was re-confirmed working (`intent assess --goal x` →
"Intent assessment").

## CLI HELP DISCOVERABILITY GAP

Top-level `rekon help` lists only legacy `intent work-order --path --goal` and `intent
remediation` and **none** of the six richer intent commands (verified: 0 of 6 listed),
though they execute correctly when invoked directly. A help/discoverability gap, not a
pipeline-correctness blocker. Recorded as the next slice; this review does not change CLI
help.

## REKON / CIRCE BOUNDARY

Rekon emits projection + proof sidecar; Circe validates / imports / orchestrates /
executes. Projection vs canonical truth; proof projection, not a planner; no Circe
command execution by Rekon; import handoff, not Rekon execution; no source writes. Stale
help is a discoverability gap, not a safety blocker.

## COMMAND / SOURCE-WRITE BOUNDARY

Pure renderer; CLI's only effect is `mkdir` / `writeFile` under the bundle directory. No
`circe` spawned during bundle generation (`runsCirce: false`); commands projected as
text, never executed; no source writes outside the bundle; no canonical artifact created;
`rekon artifacts validate` clean. Circe — not Rekon — ran the workers in the proof.

## INTENT GO BOUNDARY

`intent:go` remains deferred and unimplemented; `intentGoDeferred` pinned `true` across
the sidecar, phase gates, and per-phase WorkOrder / VerificationPlan boundaries. The
external proof shows execution can be owned entirely by Circe, so V1 can ship the
non-executing handoff without Rekon execution. Whether `intent:go` later delegates to
Circe or stays out of V1 is a separate decision, not crossed here.

## RECOMMENDATION

The proof/gate projection is **safe/stable** — no blocker — and the Rekon → Circe handoff
is externally proven. Recommended next slice: **CLI Intent Help Surface Alignment**, then
**V1 Readiness / Release Review**. `intent:go` implementation is not recommended.

## TESTS / VERIFICATION

- New/expanded `tests/docs/intent-plan-bundle-circe-proof-gate-projection-safety-review.test.mjs`
  (24 assertions).
- External: Circe serve-loop proof (pass 1 / fail 0) recorded.
- Full gate: typecheck, test (full suite), build, `git diff --check`,
  audit-package-exports, audit-license, publish-dry-run, install-smoke,
  install-tarball-smoke. No CLI smoke (strategy-only batch).

## INTENTIONALLY UNTOUCHED

No projection behavior change, no further enrichment, no CLI help fix, no `circe/*`
writes, no Circe execution by Rekon, no `intent:go`, no VerificationRun, no command
execution, no source writes, no canonical artifact mutation, no new artifact type, no
version bump, no publish, no branch.

## RISKS / FOLLOW-UP

- Top-level CLI help must be aligned before V1/operator-ready release (next slice).
- The serve-loop proof was supplied by Circe's CI / the operator; Rekon's side is
  independently proven by the normalizer checks. Re-running the full serve-loop needs a
  built Circe + worker spawning (left to Circe CI).
- `proof.handoffCoverage` ref/counts come from `PreparedIntentPlan.approval.proof` (not a
  live HandoffCoverageReport bundle input).

## NEXT STEP

CLI Intent Help Surface Alignment.
