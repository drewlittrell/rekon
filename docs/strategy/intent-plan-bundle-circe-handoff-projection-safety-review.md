# Intent Plan Bundle → Circe Handoff Projection Safety Review

## Decision Summary

The Circe handoff projection shipped in slice 99 (`5736d34`) is **safe and stable as
an import adapter**: it matches the real Circe `rekon-circe-handoff` schema (proven
against Circe's own normalizers), it preserves the Rekon / Circe boundary, it runs no
Circe commands during bundle generation, executes nothing, writes no source files, and
registers no canonical artifacts. There is **no safety blocker** in the projection
itself.

However, the review finds a **gap, not a blocker**: the projection carries the
PreparedIntentPlan phase structure, obligations, constraints, and verification
requirement content, but it does **not** carry the Rekon proof/gate state — the
PreparedIntentPlan `approval` / `proof` envelope (including `sourceWriteAllowed ===
false`), the `IntentStatusReport` gate status, or the freshness / drift refs — into the
`circe/` files. `circe/handoff.json` `status` is the Circe-required literal `"ready"`,
which is a schema value, not Rekon's gate verdict.

**Circe handoff projection is an import adapter, not a new planning system.**
**Canonical Rekon truth remains `.rekon/artifacts/`.** The projection lives under
`.rekon/intent/plans/<intent-id>/circe/`. **Rekon does not run Circe commands during
bundle generation.** **Rekon does not execute the Circe handoff.** **Rekon does not
write source files.** **Circe owns orchestration after import.** **intent:go remains
deferred.** **Circe projection must preserve Rekon's proof/gate traceability.** **If
proof/gate traceability is incomplete, intent:go must remain blocked.**

Because proof/gate state does not yet survive into the projection, and per the stricter
posture, the recommended next slice is **Intent Plan Bundle → Circe Proof/Gate
Projection Enrichment** — not the Intent Go / Execution Boundary Decision.

## Why This Review Exists

The projection is the last surface before any execution-boundary discussion. Rekon's
value is its proof/gate model: a `PreparedIntentPlan` only reaches `status.value ===
"prepared"` when `approval.status === "approved"`, and the approval `proof` records that
preparation authorizes **no** source writes
(`approval.proof.downstreamHandoff.sourceWriteAllowed === false`). If the Circe
projection flattens that proof away, an importer could treat a WorkOrder as
execution-authorized without the evidence that gated it. This review checks whether the
projection preserves enough of that proof/gate state, and decides whether the execution
boundary can be discussed next or whether the projection must be enriched first.

## Helper And CLI Reviewed

- `buildIntentPlanBundle` and its internal `renderCirceProjection`
  (`@rekon/capability-docs`, `packages/capability-docs/src/intent-plan-bundle.ts`):
  pure renderer; reads no files, writes none, runs no commands, mutates no input.
  `renderCirceProjection` is passed `intentId`, `generatedAt`, `repoRoot`, `goal`,
  `planRef` (the PreparedIntentPlan ref only), `producerVersion`, `phases`,
  `requirements`, `obligations`, and the WorkOrder / VerificationPlan schema versions —
  and **not** the approval/proof envelope, the IntentStatusReport, or the freshness /
  drift inputs.
- `rekon intent bundle write` (`packages/cli/src/index.ts`): writes the `circe/` files
  only under the bundle directory with per-file path-traversal safety; surfaces the
  Circe handoff path / per-kind counts and `boundaries.runsCirce: false`; runs no Circe.

## Circe Schema Validation Review

The projection matches the real Circe `rekon-circe-handoff` schema, proven against
Circe's own normalizers (run via `tsx` over the current Circe TS source in slice 99 and
re-confirmable from the existing helper):

| Circe Validator / Fixture | Result |
| --- | --- |
| readRekonHandoffManifestFile | accepted implementation projection |
| readRekonPhasePlanFile | accepted implementation projection |
| normalizeRekonWorkOrder | accepted per-phase WorkOrder projection |
| normalizeRekonVerificationPlan | accepted per-phase VerificationPlan projection |
| real-pipeline projection | accepted |

`circe/handoff.json` is `schemaVersion: 1`, `kind: "rekon-circe-handoff"`,
`producer.system: "rekon"`, `status: "ready"`; `circe/phase-plan.json` uses
`phaseId` / `workOrderPath` / `verificationPlanPath` with `implementerProfile` omitted;
per-phase files are the canonical Rekon WorkOrder / VerificationPlan shapes.

## Projection Surface Review

| Surface | Status | Boundary |
| --- | --- | --- |
| circe/handoff.json | shipped | Circe import manifest |
| circe/phase-plan.json | shipped | phase routing / order |
| circe/work-orders/*.json | shipped | per-phase work guidance projection |
| circe/verification-plans/*.json | shipped when requirements exist | per-phase proof planning projection |
| Rekon artifacts | unchanged | canonical truth |
| Circe commands | not run | external validation/import only |
| intent:go | deferred | no execution |

The manifest gains an additive `circe` section (relative paths + counts). A phase with
no verification requirement omits its VerificationPlan and records a handoff warning.

## Proof / Gate Traceability Review

This is the substantive finding. The projection carries phase structure and obligations,
but the Rekon **proof/gate envelope does not survive into the `circe/` files**:

| Rekon Proof Surface | Circe Projection Location |
| --- | --- |
| PreparedIntentPlan phase id | phase-plan + per-phase artifact filenames (carried) |
| PreparedIntentPlan obligations | per-phase WorkOrder projection riskNotes (carried, as messages) |
| PreparedIntentPlan verificationRequirement ids | per-phase VerificationPlan projection (content carried as commands / successCriteria; literal ids NOT carried) |
| PreparedIntentPlan.approval/proof | NOT carried — only the plan ref appears in WorkOrder inputRefs; sourceWriteAllowed=false is absent (follow-up: circe/rekon-proof.json) |
| IntentStatusReport status | NOT carried — handoff.status is the literal "ready", warnings only cover missing VPs (follow-up: proof file / source refs) |
| freshness / drift refs | NOT carried into circe/ (present only in the bundle manifest) (follow-up: proof file / source refs) |
| boundary flags | NOT carried into per-phase files (present only in the bundle manifest boundaries) (follow-up: per-phase notes) |

What survives is enough for Circe to **schedule** work, but not enough to **prove** that
the work was gate-approved and source-write-restricted. The approval proof — the single
most important Rekon safety fact — is not visible to an importer reading only `circe/`.

## Path Safety Review

Phase ids are slugified (`slugifyIntentId`) and de-duplicated; every emitted `circe/*`
path passes `isSafeBundleRelativePath` (asserted in the renderer) and the CLI's per-file
post-resolve containment check. An adversarial phase id (e.g. `../../etc/passwd`)
slugifies to a safe segment; no projection path is absolute or contains `..`; no
projection path can escape the bundle directory. Contract assertions cover all four file
kinds plus the unsafe-phase-id case.

## Rekon / Circe Boundary Review

| Boundary | Decision |
| --- | --- |
| Rekon vs Circe | prepare/package vs orchestrate/execute |
| projection vs canonical artifacts | projection vs truth |
| projection vs Markdown bundle | orchestration JSON vs review files |
| bundle generation vs Circe validation | no Circe command execution by default |
| projection vs intent:go | import handoff, not execution |
| projection vs source writes | no writes outside bundle |

The boundary holds: Rekon emits projection; Circe validates / imports / orchestrates.
Compatibility is proven by the operator's own `circe rekon-handoff validate` / `routes`
/ `circe import rekon-handoff`, never by Rekon.

## Command / Source-Write Boundary Review

`renderCirceProjection` is pure; the CLI's only filesystem effect is `mkdir` /
`writeFile` under the bundle directory. Verification requirement commands are projected
as text (`requiredChecks` / `commands`) and never executed. No `circe` process is
spawned; `boundaries.runsCirce` is `false`. No source files are written outside the
bundle. No canonical artifact is created; `rekon artifacts validate` stays clean.

## Intent Go Boundary Review

`intent:go` remains deferred and unimplemented. Because the approval/proof envelope and
the IntentStatusReport gate status do not survive into the projection, an execution
boundary cannot yet be honestly discussed from the projection alone: a Circe importer
cannot read, from `circe/`, that Rekon approved the plan and authorized no source
writes. **If proof/gate traceability is incomplete, intent:go must remain blocked** —
which it is.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare projection safe/stable | selected if proof/gate traceability sufficient | schema + boundary hold |
| add proof/gate enrichment | selected if traceability incomplete | avoid flattening approval proof |
| more Circe validation dogfood | deferred | external normalizer validation already run |
| Intent Go / Execution Boundary Decision next | rejected for now | proof/gate state does not survive projection |
| intent:go implementation next | rejected | execution boundary not decided |

The projection is safe/stable as an import adapter (no blocker), **and** proof/gate
traceability is incomplete — so both the first and second rows apply: declare the
adapter safe, then enrich proof/gate before any execution-boundary discussion.

## Recommendation

**Intent Plan Bundle → Circe Handoff Projection is safe/stable as a Circe import
adapter.** No safety blocker. The schema is correct, the boundary holds, and the
projection executes nothing.

However, proof/gate traceability is incomplete: approval/proof, IntentStatusReport
status, and freshness/drift refs do not survive into the `circe/` files. Per the
stricter posture, the next slice is **Intent Plan Bundle → Circe Proof/Gate Projection
Enrichment**, not the Intent Go / Execution Boundary Decision. **Do not begin the
execution-boundary decision until proof/gate state explicitly survives into the
projection.**

## What This Does Not Do

This review changes no runtime behavior. It implements no proof/gate enrichment, writes
no `circe/*` files, runs no Circe commands, implements no `intent:go`, generates no
VerificationRun, executes no commands, writes no source files, mutates no canonical
artifacts, registers no artifact type, bumps no versions, and publishes nothing.

## Follow-Up Work

- **Next:** Intent Plan Bundle → Circe Proof/Gate Projection Enrichment — carry the
  approval/proof envelope (including `sourceWriteAllowed === false`), the
  IntentStatusReport gate status, the verification-requirement ids, and the
  freshness/drift refs into the projection, e.g. via a `circe/rekon-proof.json` file,
  per-phase gate metadata, and a handoff-manifest pointer if the Circe schema permits;
  with tests proving approval/proof/gates survive into the projection. Still no Circe
  command execution, no source writes, no `intent:go`.
- **Then:** Intent Go / Execution Boundary Decision — only after proof/gate state
  survives the projection.
- **Deferred:** `intent:go`; VerificationRun generation; command execution; source
  writes; configurable `implementerProfile`; end-to-end `circe rekon-handoff validate`
  with an operator workflow.

> Enriched (slice 101): the Intent plan bundle → Circe proof/gate projection now also emits `circe/rekon-proof.json` (kind rekon-circe-proof), carrying the PreparedIntentPlan approval/proof envelope, the IntentStatusReport gate state, the freshness/drift refs, and per-phase gate metadata; the per-phase WorkOrder / VerificationPlan projections gain additive `intentHandoff` traceability and `handoff.json` a `rekonProofPath` pointer. The sidecar never claims approval/readiness the source does not support; **sourceWriteAllowed remains false**, **commandsExecuted remains false**, **intentGoDeferred remains true**; **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not run Circe commands during bundle generation, does not execute the Circe handoff, and does not write source files; Circe schema validation remains intact (re-validated against Circe's real normalizers); intent:go remains deferred. Next: Intent Plan Bundle → Circe Proof/Gate Projection Safety Review. See [Intent Plan Bundle concept](../concepts/intent-plan-bundle.md).

> Reviewed (slice 102): the Intent plan bundle → Circe proof/gate projection is safe/stable — no blocker. `circe/rekon-proof.json` carries the PreparedIntentPlan approval/proof envelope, the IntentStatusReport gate state, the freshness/runtime-drift refs, and per-phase gate metadata; the sidecar never claims approval/readiness the source artifacts do not support; **sourceWriteAllowed remains false**, **commandsExecuted remains false**, **intentGoDeferred remains true**; the enriched projection remains compatible with Circe's real normalizers; **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not run Circe commands during bundle generation, does not execute commands, and does not write source files; intent:go remains deferred. The non-executing handoff pipeline is complete. Next: Intent Go / Execution Boundary Decision. See [Intent Plan Bundle → Circe Proof/Gate Projection Safety Review](./intent-plan-bundle-circe-proof-gate-projection-safety-review.md).
