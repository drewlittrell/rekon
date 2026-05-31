# Intent Plan Bundle → Circe Proof/Gate Projection Safety Review

## Decision Summary

The Circe proof/gate projection enrichment (slice 101, `1159d7a`) is **safe and
stable**, and the Rekon → Circe handoff is now **externally proven end-to-end**: the
current built Rekon CLI drove a Circe `validate` → `routes` → `import` → `serve --mode
worker` loop to a passing result. The bundle emits `circe/rekon-proof.json` (a
Rekon-owned proof/gate sidecar) plus additive per-phase traceability; the proof/gate
state survives the projection, the sidecar is honest (it never upgrades source
approval), and the enriched projection remains Circe-compatible. There is **no blocker**.

One operator-readiness follow-up is recorded (not a blocker for projection safety):
top-level `rekon help` is stale — the richer intent commands work directly but are not
listed in the top-level help.

**`circe/rekon-proof.json` carries PreparedIntentPlan approval/proof into the Circe
projection.** **`circe/rekon-proof.json` carries IntentStatusReport gate state.**
**`circe/rekon-proof.json` carries freshness and runtime drift refs.**
**`circe/rekon-proof.json` carries phase-level gate metadata.** **sourceWriteAllowed
remains false.** **commandsExecuted remains false.** **intentGoDeferred remains true.**
**The Circe projection must not claim approval/readiness the source artifacts do not
support.** **The enriched projection remains compatible with Circe.** **The current
built Rekon CLI passed the Circe validate/routes/import/serve-loop proof.** **Rekon
does not run Circe commands during bundle generation.** **Rekon does not execute
commands.** **Rekon does not write source files.** **intent:go remains deferred.**
**Top-level Rekon help is stale and must be aligned before V1/operator-ready release.**

The non-executing Rekon → Circe plan handoff is functionally proven, so the recommended
next slice is **CLI Intent Help Surface Alignment** (make the shipped intent commands
discoverable), then **V1 Readiness / Release Review**. `intent:go` implementation is
not recommended; if the team wants the execution-boundary architecture first, the Intent
Go / Execution Boundary Decision should explicitly weigh delegating execution to Circe
versus keeping it out of V1.

## Why This Review Exists

Slice 100 found the first Circe projection flattened away Rekon's proof/gate state;
slice 101 added `circe/rekon-proof.json` and per-phase traceability to fix it. A new
external Circe proof then showed the richer Rekon intent pipeline can produce a bundle
that Circe validates, routes, imports, and executes as a worker serve-loop. Before
moving toward V1 readiness, Rekon must record that this handoff is safe and that
execution still belongs to Circe.

## Helper And CLI Reviewed

- `buildIntentPlanBundle` / `renderCirceProjection`
  (`@rekon/capability-docs`, `packages/capability-docs/src/intent-plan-bundle.ts`):
  pure renderer; reads no files, writes none, runs no commands, mutates no input. The
  proof block re-projects `plan.approval.proof`, `plan.status`, and the
  `IntentStatusReport` value into `rekon-proof.json`; `approvalStatus` defaults to
  `"unknown"` without a plan, and gates are only marked approved when the source
  approval is `"approved"`.
- `rekon intent bundle write` (`packages/cli/src/index.ts`): writes the `circe/` files
  (incl. `rekon-proof.json`) only under the bundle directory with per-file path safety;
  surfaces `circe.rekonProof` and `boundaries.runsCirce: false`; runs no Circe.

## Proof Sidecar Review

`circe/rekon-proof.json` (`kind: "rekon-circe-proof"`) carries `sourceArtifacts` (refs +
digests), `approval` (status + reasons from `PreparedIntentPlan.approval`),
`intentStatus` (value + recommended next action from the `IntentStatusReport`),
`gates`, `proof`, `phaseGates`, and `warnings`. The bundle manifest points at it via
`circe.rekonProof` (and `manifest.files.circeProof`); `circe/handoff.json` carries a
minimal `rekonProofPath` pointer. The sidecar is a Rekon-owned file outside Circe's
validated set, so it carries the full proof model without schema risk.

| Surface | Status | Boundary |
| --- | --- | --- |
| circe/rekon-proof.json | shipped | Rekon proof/gate sidecar |
| manifest.circe.rekonProof | shipped | bundle pointer |
| handoff.json rekonProofPath | shipped | Circe-side pointer |
| phase-plan per-phase rekon metadata | shipped | phase gate traceability |
| WorkOrder intentHandoff | shipped | phase work traceability |
| VerificationPlan intentHandoff | shipped | phase proof traceability |
| Circe serve-loop proof | passed | external orchestration proof |
| Circe commands during bundle generation | not run | external to Rekon generation |
| intent:go | deferred | no Rekon execution |

## Gate State Review

`gates.preparedPlanApproved` = `approval.status === "approved"`; `workOrderAllowed` /
`verificationPlanAllowed` = approved **and** the matching
`approval.proof.downstreamHandoff.*` flag; `sourceWriteAllowed: false`,
`commandsExecuted: false`, `intentGoDeferred: true` are hard-pinned literals. The
`proof` block re-projects `approval.proof.runtimeDrift` / `handoffCoverage` /
`freshness` / `verification` / `planStructure`, each report ref rendered as a `Type:id`
string. **The sidecar never claims approval/readiness the source artifacts do not
support**: with no `PreparedIntentPlan.approval` the gates are `false` (proven on a
needs-review plan in the slice-101 CLI smoke).

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

`phaseGates[]` carries, per phase, the slug-safe `phaseId` (matching the projection),
`approvalStatus`, `readyForCirce` (`planApproved && phase not blocked`), `obligationIds`,
`verificationRequirementIds`, `blockers`, `warnings`, and per-phase `boundaries`
(`sourceWriteAllowed: false` / `commandsExecuted: false` / `intentGoDeferred: true`).
The same metadata is mirrored minimally onto each `phase-plan.json` phase as `rekon`.

## WorkOrder / VerificationPlan Traceability Review

Each per-phase WorkOrder gains an additive `intentHandoff` block (PreparedIntentPlan
ref, phase id, approval status, obligation / requirement ids, source refs, and
boundaries). Each per-phase VerificationPlan gains an additive `intentHandoff` block
(PreparedIntentPlan ref, phase id, requirement ids, source refs, and boundaries with
`createsVerificationRun: false` / `executesCommands: false` / `writesSourceFiles: false`
/ `intentGoDeferred: true`).

## Circe Compatibility Review

The enrichment is additive — the proof rides in the Rekon-owned sidecar plus fields
Circe's normalizers ignore (`rekonProofPath`, per-phase `rekon`, `intentHandoff`), so no
Circe-validated file's required shape changed. Slice 101 re-validated the enriched
projection against Circe's real normalizers (`readRekonHandoffManifestFile`,
`readRekonPhasePlanFile`, `normalizeRekonWorkOrder`, `normalizeRekonVerificationPlan`)
for both a hand-crafted and a real-pipeline projection — both accepted. **The enriched
projection remains compatible with Circe.**

## External Rekon / Circe Execution Proof

The current built Rekon CLI drove a full Circe handoff to a passing result through
Circe's integration test
(`/Users/andrewlittrell/Code/Circe/tests/integration/rekon-intent-handoff-serve-loop.test.ts`):

```bash
CIRCE_REKON_INTENT_CLI_PATH=/Users/andrewlittrell/Code/rekon/packages/cli/dist/index.js \
node --import tsx --test tests/integration/rekon-intent-handoff-serve-loop.test.ts
# pass 1, fail 0
```

**The current built Rekon CLI passed the Circe validate/routes/import/serve-loop proof.**
The proof exercised the richer intent command surface and the generated handoff:

| Circe Step | Result |
| --- | --- |
| rekon intent assess | passed through external test |
| rekon intent prepare | passed through external test |
| rekon intent status | passed through external test |
| rekon intent work-order generate | passed through external test |
| rekon intent verification-plan generate | passed through external test |
| rekon intent bundle write | passed through external test |
| circe rekon-handoff validate | ok |
| circe rekon-handoff routes | ok |
| circe import rekon-handoff | ok |
| circe serve --mode worker | pass |

All generated phases dispatched, committed, continued, and stopped correctly under
Circe's worker serve-loop. This review records the proof as supplied; it was not re-run
here (the heavy worker serve-loop is left to Circe's own CI, and Rekon's projection
shape compatibility is independently proven by the normalizer checks above). Rekon ran
no Circe commands during bundle generation; Circe owned the orchestration.

## CLI Help Discoverability Gap

The richer intent commands work directly, but top-level `rekon help` is **stale**: it
lists only the legacy `intent work-order --path --goal` and `intent remediation`, and
**none** of the shipped `intent assess` / `intent prepare` / `intent status` / `intent
work-order generate` / `intent verification-plan generate` / `intent bundle write`. This
is a help/discoverability gap, not a pipeline-correctness blocker — the commands execute
correctly when invoked directly (verified: `intent assess --goal x` → "Intent
assessment"; `intent bundle write` → reaches its branch). **Top-level Rekon help is
stale and must be aligned before V1/operator-ready release.** This review does not change
the CLI help; it is recorded as the next slice.

## Rekon / Circe Boundary Review

| Boundary | Decision |
| --- | --- |
| Rekon vs Circe | prepare/package vs orchestrate/execute |
| projection vs canonical artifacts | projection vs truth |
| proof sidecar vs planner | proof projection, not new planner |
| bundle generation vs Circe validation | no Circe command execution by Rekon |
| projection vs intent:go | import handoff, not Rekon execution |
| projection vs source writes | no source writes |
| stale CLI help | discoverability gap, not safety blocker |

Rekon emits the projection + a proof sidecar; Circe validates / imports / orchestrates.
Canonical Rekon truth remains `.rekon/artifacts/`.

## Command / Source-Write Boundary Review

`renderCirceProjection` is pure; the CLI's only filesystem effect is `mkdir` /
`writeFile` under the bundle directory. No `circe` process is spawned during bundle
generation (`boundaries.runsCirce: false`); requirement commands are projected as text
and never executed; no source files are written outside the bundle; no canonical
artifact is created and `rekon artifacts validate` stays clean. (Circe — not Rekon — ran
the workers in the external proof.)

## Intent Go Boundary Review

`intent:go` remains deferred and unimplemented; `intentGoDeferred` is pinned `true`
across the sidecar gates, the phase gates, and the per-phase WorkOrder / VerificationPlan
`intentHandoff` boundaries. The external proof shows execution can be owned entirely by
Circe (worker serve-loop) with Rekon only preparing/projecting — so V1 can ship the
non-executing handoff without any Rekon execution. Whether `intent:go` should later
delegate to Circe or stay out of V1 is a separate Intent Go / Execution Boundary
Decision, not crossed here.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare proof/gate projection safe/stable | selected | proof/gate state survives and Circe proof passed |
| CLI help alignment next | selected | operator discoverability needed before V1 |
| V1 readiness review next | selected after help alignment | pipeline is functionally proven |
| Intent Go / Execution Boundary Decision next | deferred | V1 can ship without Rekon execution |
| intent:go implementation next | rejected | execution boundary not decided |

## Recommendation

**Intent Plan Bundle → Circe Proof/Gate Projection is safe/stable.** No blocker. The
sidecar carries the approval/proof envelope, the IntentStatusReport gate state, the
freshness/drift refs, and per-phase gate metadata; it never claims approval/readiness the
source does not support; the enriched projection remains compatible with Circe; and the
current built Rekon CLI passed the Circe validate/routes/import/serve-loop proof.

The recommended next slice is **CLI Intent Help Surface Alignment** — make the shipped
intent commands and the canonical Rekon → Circe flow visible in top-level help — followed
by a **V1 Readiness / Release Review** scoping V1 as prepare/prove/package/export with
execution owned by Circe. `intent:go` implementation is not recommended.

## What This Does Not Do

This review changes no runtime behavior. It implements no further enrichment, no CLI
help fix, writes no `circe/*` files, runs no Circe commands, implements no `intent:go`,
generates no VerificationRun, executes no commands, writes no source files, mutates no
canonical artifacts, registers no artifact type, bumps no versions, and publishes
nothing.

## Follow-Up Work

- **Next:** CLI Intent Help Surface Alignment — surface `intent assess` / `prepare` /
  `status` / `work-order generate` / `verification-plan generate` / `bundle write` and
  the canonical flow in top-level help (still no `intent:go`, no command execution, no
  source writes).
- **Then:** V1 Readiness / Release Review — V1 = prepare / prove / package / export;
  execution owned by Circe.
- **Deferred:** Intent Go / Execution Boundary Decision (weigh delegating execution to
  Circe vs keeping it out of V1); `intent:go`; Circe execution by Rekon; VerificationRun
  generation; command execution; source writes.
