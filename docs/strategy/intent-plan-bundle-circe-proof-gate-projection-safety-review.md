# Intent Plan Bundle → Circe Proof/Gate Projection Safety Review

## Decision Summary

The Circe proof/gate projection enrichment shipped in slice 101 (`1159d7a`) is
**safe and stable**. The bundle now emits `circe/rekon-proof.json` (a Rekon-owned
proof/gate sidecar) plus additive per-phase traceability, and the review confirms:
the proof/gate state survives the projection, the sidecar is honest (it never upgrades
source approval), the enriched projection is still accepted by Circe's real
normalizers, and the execution boundary is unchanged. There is **no blocker**.

**`circe/rekon-proof.json` carries PreparedIntentPlan approval/proof into the Circe
projection.** **`circe/rekon-proof.json` carries IntentStatusReport gate state.**
**`circe/rekon-proof.json` carries freshness and runtime drift refs.**
**`circe/rekon-proof.json` carries phase-level gate metadata.** **sourceWriteAllowed
remains false.** **commandsExecuted remains false.** **intentGoDeferred remains true.**
**The Circe projection must not claim approval/readiness the source artifacts do not
support.** **The enriched projection remains compatible with Circe's real
normalizers.** **Rekon does not run Circe commands during bundle generation.** **Rekon
does not execute commands.** **Rekon does not write source files.** **intent:go remains
deferred.**

The non-executing intent pipeline is now complete end-to-end: assess → prepare
(proof-approved) → status → WorkOrder / VerificationPlan handoff → human/agent bundle →
Circe import projection carrying proof/gate state. The recommended next slice is the
**Intent Go / Execution Boundary Decision** — the first decision about whether and how
Rekon ever moves from prepared handoff into execution.

## Why This Review Exists

Slice 100 found that the first Circe projection was schema-valid but flattened away
Rekon's proof/gate state; slice 101 added the sidecar and per-phase traceability to fix
it. This review confirms the fix actually carries the proof/gate state without breaking
Circe compatibility or changing the execution boundary — and decides whether the
execution-boundary discussion can finally begin.

## Helper And CLI Reviewed

- `buildIntentPlanBundle` and `renderCirceProjection`
  (`@rekon/capability-docs`, `packages/capability-docs/src/intent-plan-bundle.ts`):
  pure renderer; reads no files, writes none, runs no commands, mutates no input. The
  proof block re-projects `plan.approval.proof`, `plan.status`, and the
  `IntentStatusReport` value into `rekon-proof.json`; it derives `approvalStatus` as
  `"unknown"` when no plan is present and only marks gates approved when the source
  approval is `"approved"`.
- `rekon intent bundle write` (`packages/cli/src/index.ts`): writes the `circe/` files
  (incl. `rekon-proof.json`) only under the bundle directory with per-file path safety;
  surfaces `circe.rekonProof` and `boundaries.runsCirce: false`; runs no Circe.

## Proof Sidecar Review

`circe/rekon-proof.json` (`kind: "rekon-circe-proof"`) carries `sourceArtifacts`
(refs + digests), `approval` (status + reasons from `PreparedIntentPlan.approval`),
`intentStatus` (value + recommended next action from the `IntentStatusReport`),
`gates`, `proof`, `phaseGates`, and `warnings`. The bundle manifest points at it via
`circe.rekonProof` (and `manifest.files.circeProof`); `circe/handoff.json` carries a
minimal `rekonProofPath` pointer. The sidecar is a Rekon-owned file outside Circe's
validated set, so it can carry the full proof model without schema risk.

| Surface | Status | Boundary |
| --- | --- | --- |
| circe/rekon-proof.json | shipped | Rekon proof/gate sidecar |
| manifest.circe.rekonProof | shipped | bundle pointer |
| handoff.json rekonProofPath | shipped | Circe-side pointer |
| phase-plan per-phase rekon metadata | shipped | phase gate traceability |
| WorkOrder intentHandoff | shipped | phase work traceability |
| VerificationPlan intentHandoff | shipped | phase proof traceability |
| Circe commands | not run | external to bundle generation |
| intent:go | deferred | no execution |

## Gate State Review

`gates` reports `preparedPlanApproved` (`approval.status === "approved"`),
`workOrderAllowed` / `verificationPlanAllowed` (approved **and** the matching
`approval.proof.downstreamHandoff.*` flag), and the hard-pinned literals
`sourceWriteAllowed: false`, `commandsExecuted: false`, `intentGoDeferred: true`. The
`proof` block re-projects `approval.proof.runtimeDrift` / `handoffCoverage` /
`freshness` / `verification` / `planStructure`, with each report ref rendered as a
`Type:id` string. **The sidecar never claims approval/readiness the source artifacts do
not support**: with no `PreparedIntentPlan.approval` the gates are `false`, and the
slice-101 real-pipeline CLI smoke confirmed a `needs-review` plan produced
`preparedPlanApproved: false` / `workOrderAllowed: false` while still pinning the
source-write / command / intent:go boundaries.

| Proof / Gate Surface | Review Finding |
| --- | --- |
| PreparedIntentPlan approval/proof | carried in rekon-proof.json |
| IntentStatusReport gate state | carried in rekon-proof.json |
| freshness refs | carried in rekon-proof.json |
| runtime drift refs | carried in rekon-proof.json |
| phase-level gate metadata | carried in phaseGates |
| sourceWriteAllowed | false |
| commandsExecuted | false |
| intentGoDeferred | true |

## Phase Gate Review

`phaseGates[]` carries, per phase, the slug-safe `phaseId` (matching the projection's
phase ids), `approvalStatus`, `readyForCirce` (`planApproved && phase not blocked`),
`obligationIds`, `verificationRequirementIds`, `blockers`, `warnings`, and the per-phase
`boundaries` (`sourceWriteAllowed: false` / `commandsExecuted: false` /
`intentGoDeferred: true`). The same metadata is mirrored minimally onto each
`phase-plan.json` phase as a `rekon` object.

## WorkOrder / VerificationPlan Traceability Review

Each per-phase WorkOrder gains an additive `intentHandoff` block (PreparedIntentPlan
ref, phase id, approval status, obligation / requirement ids, source refs, and
`boundaries` with `sourceWriteAllowed: false` / `commandsExecuted: false` /
`intentGoDeferred: true`). Each per-phase VerificationPlan gains an additive
`intentHandoff` block (PreparedIntentPlan ref, phase id, requirement ids, source refs,
and `boundaries` with `createsVerificationRun: false` / `executesCommands: false` /
`writesSourceFiles: false` / `intentGoDeferred: true`).

## Circe Compatibility Review

The enrichment is additive — the proof rides in the Rekon-owned sidecar plus fields
Circe's normalizers ignore (`rekonProofPath`, per-phase `rekon`, `intentHandoff`), so
no Circe-validated file's required shape changed. Slice 101 re-validated the enriched
projection against Circe's real normalizers (run via `tsx` over the current Circe TS
source) for both a hand-crafted and the CLI-produced real-pipeline projection:

| Circe Normalizer | Result |
| --- | --- |
| readRekonHandoffManifestFile | accepted enriched projection |
| readRekonPhasePlanFile | accepted enriched projection |
| normalizeRekonWorkOrder | accepted enriched projection |
| normalizeRekonVerificationPlan | accepted enriched projection |
| real-pipeline enriched projection | accepted |

## Rekon / Circe Boundary Review

| Boundary | Decision |
| --- | --- |
| Rekon vs Circe | prepare/package vs orchestrate/execute |
| projection vs canonical artifacts | projection vs truth |
| proof sidecar vs planner | proof projection, not new planner |
| bundle generation vs Circe validation | no Circe command execution by default |
| projection vs intent:go | import handoff, not execution |
| projection vs source writes | no writes outside bundle |

The boundary holds: Rekon emits the projection (and a proof sidecar for review); Circe
validates / imports / orchestrates. Canonical Rekon truth remains `.rekon/artifacts/`.

## Command / Source-Write Boundary Review

`renderCirceProjection` is pure; the CLI's only filesystem effect is `mkdir` /
`writeFile` under the bundle directory. No `circe` process is spawned
(`boundaries.runsCirce: false`); requirement commands are projected as text and never
executed; no source files are written outside the bundle; no canonical artifact is
created and `rekon artifacts validate` stays clean.

## Intent Go Boundary Review

`intent:go` remains deferred and unimplemented; `intentGoDeferred` is pinned `true`
across the sidecar gates, the phase gates, and the per-phase WorkOrder / VerificationPlan
`intentHandoff` boundaries. With the proof/gate state now surviving the projection, a
Circe importer can read, from `circe/`, whether Rekon approved the plan and that it
authorized no source writes — so the execution boundary can finally be discussed
honestly. The discussion itself is a separate decision; this review opens it, it does
not cross it.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare proof/gate projection safe/stable | selected | proof/gate state survives |
| Intent Go / Execution Boundary Decision next | selected | non-executing handoff pipeline complete |
| more projection enrichment | deferred | no blocker if review confirms coverage |
| run Circe automatically next | rejected | execution boundary not decided |
| intent:go implementation next | rejected | execution boundary decision required first |

## Recommendation

**Intent Plan Bundle → Circe Proof/Gate Projection is safe/stable.** No blocker. The
sidecar carries the approval/proof envelope, the IntentStatusReport gate state, the
freshness/drift refs, and per-phase gate metadata; it never claims approval/readiness
the source does not support; and the enriched projection remains compatible with Circe's
real normalizers.

The non-executing handoff pipeline is complete, so the recommended next slice is the
**Intent Go / Execution Boundary Decision**: decide whether and how Rekon ever moves
from prepared handoff into execution. That decision still implements no `intent:go`,
runs no Circe, generates no VerificationRun, executes no commands, and writes no source.

## What This Does Not Do

This review changes no runtime behavior. It implements no further enrichment, writes no
`circe/*` files, runs no Circe commands, implements no `intent:go`, generates no
VerificationRun, executes no commands, writes no source files, mutates no canonical
artifacts, registers no artifact type, bumps no versions, and publishes nothing.

## Follow-Up Work

- **Next:** Intent Go / Execution Boundary Decision — decide whether / how Rekon moves
  from prepared handoff into execution (still no `intent:go` implementation, no Circe
  execution by Rekon, no VerificationRun generation, no command execution, no source
  writes).
- **Deferred:** `intent:go`; Circe execution by Rekon; VerificationRun generation;
  command execution; source writes; configurable `implementerProfile`; end-to-end
  `circe rekon-handoff validate` with an operator workflow.
