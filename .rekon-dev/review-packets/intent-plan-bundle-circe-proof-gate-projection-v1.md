# Review Packet — Intent Plan Bundle → Circe Proof/Gate Projection Enrichment (slice 101)

## CHANGES MADE

Product-capability batch. The Circe handoff projection now also emits
`circe/rekon-proof.json`, a Rekon-owned proof/gate sidecar, and strengthens the
in-schema projection files with additive (Circe-tolerated) proof traceability. No new
artifact type, no canonical artifact mutation, no Circe execution.

## PUBLIC API CHANGES

- `RenderCirceProjectionInput` (internal) gains proof inputs; `BuildIntentPlanBundleInput`
  is unchanged (the CLI threads existing source artifacts). The renderer return is
  unchanged except `result.files` also contains `circe/rekon-proof.json` and
  `result.manifest.circe` gains `rekonProof` / `manifest.files` gains `circeProof`.
- CLI `intent bundle write` JSON output `circe` block gains `rekonProof`.

## PURPOSE PRESERVATION CHECK

Rekon's value is its proof-approved preparation model: a `PreparedIntentPlan` reaches
`prepared` only when `approval.status === "approved"`, and the approval proof records
that preparation authorizes no source writes (`downstreamHandoff.sourceWriteAllowed ===
false`). The slice-100 review found that model did not survive into `circe/`. This slice
carries it across — the Circe projection remains an import adapter (not a planner),
canonical truth stays `.rekon/artifacts/`, and the sidecar gives Circe enough proof/gate
context for import review without Rekon running Circe, executing commands, writing
source, or implementing intent:go. The sidecar never claims approval/readiness the
source does not support, and always pins sourceWriteAllowed / commandsExecuted /
intentGoDeferred.

## CODEBASE-INTEL ALIGNMENT

The sidecar is a faithful re-projection of the kernel `PreparedIntentPlanApprovalProof`
(`runtimeDrift` / `handoffCoverage` / `freshness` / `verification` / `planStructure` /
`downstreamHandoff`) already produced by `createPreparedIntentPlan` (slices 80–83), plus
`plan.status` and the IntentStatusReport (slice 86). Per-phase gate metadata reuses the
existing phase loop (single source of phase-id slugification). Reuses the existing
pure-renderer + path-safety + CLI write-loop patterns.

## CIRCE SOURCE ALIGNMENT

Re-read the real Circe schema (`src/adapters/rekon-handoff.ts`,
`rekon-phase-plan-import.ts`, `rekon-phase-plan-validate.ts`, `src/rekon/RekonTypes.ts`).
Confirmed: `validateHandoffShape`, `normalizePhasePlan`, `normalizeRekonWorkOrder`, and
`normalizeRekonVerificationPlan` all build known-fields-only objects and never reject
unknown keys — extra fields are tolerated (and dropped on import). The sidecar is a
brand-new Rekon-owned file outside Circe's validated set. **The enriched projection was
re-validated against Circe's real normalizers** (via `tsx`): the enriched `handoff.json`
(with `rekonProofPath`), `phase-plan.json` (with per-phase `rekon`), and per-phase
WorkOrder / VerificationPlan (with `intentHandoff`) are still accepted.

## PROOF SIDECAR MODEL

`circe/rekon-proof.json` (`kind: "rekon-circe-proof"`): `schemaVersion`, `intentId`,
`generatedAt`, `sourceArtifacts` (ref + digest), `approval` (status + reasons),
`intentStatus` (value + recommendedNextAction), `gates` (preparedPlanApproved /
workOrderAllowed / verificationPlanAllowed / sourceWriteAllowed:false /
commandsExecuted:false / intentGoDeferred:true), `proof` (runtimeDrift / handoffCoverage
/ freshness / verification / planStructure, refs projected to `Type:id` strings),
`phaseGates`, and `warnings`.

## PHASE GATE MODEL

`phaseGates[]`: `phaseId` (matching the projection's slug-safe phase id),
`approvalStatus`, `readyForCirce` (approved && plan prepared && phase not blocked),
`obligationIds`, `verificationRequirementIds`, `blockers`, `warnings`, and `boundaries`
(sourceWriteAllowed:false / commandsExecuted:false / intentGoDeferred:true). Mirrored as
minimal `rekon` metadata on each `phase-plan.json` phase.

## WORKORDER PROOF TRACEABILITY

Per-phase WorkOrder gains an additive `intentHandoff` block: `preparedIntentPlanRef`,
`phaseId`, `approvalStatus`, `obligationIds`, `verificationRequirementIds`, `sourceRefs`,
and `boundaries` (sourceWriteAllowed:false / commandsExecuted:false /
intentGoDeferred:true). Tolerated + dropped by Circe's `normalizeRekonWorkOrder`.

## VERIFICATIONPLAN PROOF TRACEABILITY

Per-phase VerificationPlan gains an additive `intentHandoff` block:
`preparedIntentPlanRef`, `phaseId`, `verificationRequirementIds`, `sourceRefs`, and
`boundaries` (createsVerificationRun:false / executesCommands:false /
writesSourceFiles:false / intentGoDeferred:true). Tolerated + dropped by Circe's
`normalizeRekonVerificationPlan`.

## SCHEMA COMPATIBILITY

Proven against Circe's real normalizers (see CIRCE SOURCE ALIGNMENT). The required Circe
fields are unchanged (`handoff.json` still schemaVersion 1 / kind / producer.system /
status ready; phase-plan schemaVersion 1; WorkOrder canonical shape + non-empty goal;
VerificationPlan canonical shape + workOrderRef). The proof data lives in the sidecar +
tolerated extras only.

## PATH SAFETY

`circe/rekon-proof.json` is a fixed safe relative path; the existing renderer assertion
+ CLI per-file containment cover it. Phase ids remain slug-safe and de-duplicated.

## CLI SURFACE

`rekon intent bundle write` unchanged flags; output `circe` block adds `rekonProof`. No
Circe execution; `boundaries.runsCirce: false`.

## BOUNDARY MODEL

Rekon emits projection; Circe validates / imports / orchestrates. The sidecar never
claims approval/readiness without source support. sourceWriteAllowed / commandsExecuted
stay false; intentGoDeferred stays true. No source writes outside the bundle; no
canonical artifact mutation; no new artifact type.

## TESTS / VERIFICATION

- `tests/contract/intent-plan-bundle.test.mjs`: 85 assertions (53 prior + 32 proof,
  incl. enriched-files-still-Circe-compatible + missing-approval-does-not-claim-readiness).
- `tests/docs/intent-plan-bundle-circe-proof-projection.test.mjs`: 11 assertions.
- External: Circe real normalizers accepted the enriched projection (hand-crafted + the
  CLI-produced real-pipeline projection).
- Full 9-command gate + CLI smoke (verifies `circe/rekon-proof.json`, gates, no source
  writes, `artifacts validate` clean).

## INTENTIONALLY UNTOUCHED

No Circe command execution, no Circe import, no `intent:go`, no VerificationRun, no
VerificationResult, no command execution, no source writes outside the bundle, no
canonical artifact mutation, no new artifact type, no Circe source change, no version
bump, no npm publish, no branch.

## RISKS / FOLLOW-UP

- `proof.handoffCoverage` ref/counts come from `PreparedIntentPlan.approval.proof` (the
  plan recorded them at preparation); they are not re-derived from a live
  HandoffCoverageReport bundle input.
- `rekonProofPath` / per-phase `rekon` / `intentHandoff` are tolerated-but-dropped by
  Circe import today; a future Circe version could consume them (out of scope here).
- `implementerProfile` still omitted by default.

## NEXT STEP

Intent Plan Bundle → Circe Proof/Gate Projection Safety Review.
