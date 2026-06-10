# Intent Plan Bundle → Circe Handoff Projection Decision

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

## Decision Summary

Rekon prepares and packages; Circe imports and orchestrates. The Intent plan
bundle (`a1723d7`, safety-reviewed at `de6e885`) is now the final non-executing
handoff surface, and the next boundary is making that bundle directly importable by
Circe. This decision pins how Rekon's prepared intent plan bundle projects into
Circe's `rekon-circe-handoff` import format, grounded in the **actual Circe source**
(not inferred from filenames).

**The decision selects a Circe projection under each Rekon intent plan bundle
(Option B), at `.rekon/intent/plans/<intent-id>/circe/`.** Rekon emits a
Circe-compatible projection — `circe/handoff.json`, `circe/phase-plan.json`,
`circe/work-orders/<phase-id>.work-order.json`, and
`circe/verification-plans/<phase-id>.verification-plan.json` — derived from the
bundle's canonical artifacts. Rekon does not run Circe commands, executes nothing,
and writes no source. This batch decides the projection shape only; it implements
no projection.

**Circe handoff projection is an import adapter, not a new planning system.**
**Canonical Rekon truth remains `.rekon/artifacts/`.** **The Circe projection is
derived from the intent plan bundle.** **Rekon does not execute the Circe handoff.**
**Rekon does not run Circe commands during bundle generation.** **Rekon does not
write source files.** **Circe owns orchestration after import.** **intent:go remains
deferred.**

## Why This Decision Exists

The completed intent preparation chain produces a human + agent bundle, but that
bundle is not yet shaped for Circe's importer. Circe owns orchestration: it
validates a handoff manifest, previews implementer routes, imports a phase graph,
and schedules workers. For Rekon's bundle to flow into Circe without Circe ever
parsing Rekon internals, Rekon must emit Circe's exact `rekon-circe-handoff`
package shape. Because the schema is owned by Circe and enforced by Circe's
validators, the projection must be pinned against Circe's real source, not guessed.

## Circe Source Reviewed

The following Circe source files were read in
`/Users/andrewlittrell/Code/Circe` before this decision (no schema was inferred
from names):

- `src/adapters/rekon-handoff.ts` — the canonical `RekonHandoffManifest` type, the
  shape validator (`validateHandoffShape` / `normalizeHandoffManifest`), the
  `validateRekonHandoff` / `importRekonHandoff` functions, and the route-blocking
  code sets.
- `docs/strategy/rekon-to-circe-handoff-contract.md` — the ownership boundary,
  package shape, manifest / phase-plan schema, Circe commands, and validation /
  import semantics.
- `tests/fixtures/rekon-handoffs/valid-handoff/handoff.json` — a valid manifest.
- `tests/fixtures/rekon-handoffs/valid-handoff/phase-plan.json` — a valid phase
  plan with `implementerProfile` routing.
- `tests/fixtures/rekon-handoffs/valid-handoff/work-orders/phase-1.work-order.json`
  — a per-phase WorkOrder (canonical Rekon WorkOrder shape).
- `tests/fixtures/rekon-handoffs/valid-handoff/verification-plans/phase-1.verification-plan.json`
  — a per-phase VerificationPlan (canonical Rekon VerificationPlan shape).
- `tests/fixtures/rekon-handoffs/README.md` — the package contract summary.
- Additional adapters noted (not fully transcribed):
  `src/adapters/rekon-phase-plan-import.ts`, `rekon-phase-plan-validate.ts`,
  `rekon-work-order-import.ts`.

## Current Boundary

Rekon's intent artifacts are canonical machine-readable truth under
`.rekon/artifacts/`, and the bundle (`.rekon/intent/plans/<intent-id>/`) is a
human + agent projection. There is no Circe projection yet. This decision adds only
the *shape* of a `circe/` subdirectory inside the bundle that Rekon would emit as a
Circe `rekon-circe-handoff` package — never mutating canonical artifacts, never
running Circe, never executing commands, and never writing source.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| no Circe projection | rejected | bundle would not be directly importable |
| Circe projection under bundle/circe | selected | preserves Rekon/Circe boundary |
| replace Rekon bundle with Circe format | rejected | loses human/agent bundle separation |
| make Circe read Rekon artifacts directly | rejected/deferred | couples Circe to Rekon internals |
| implement intent:go now | rejected | execution boundary still deferred |

## Recommendation

Adopt **Option B**: add a Circe projection under each Rekon intent plan bundle at
`.rekon/intent/plans/<intent-id>/circe/`, emitting the exact `rekon-circe-handoff`
package shape. The bundle keeps its three layers: Markdown / `agent/` files for
human + LLM-agent review, `circe/*.json` for the orchestration import projection,
and `.rekon/artifacts/...` as canonical truth. An operator imports a Rekon bundle
into Circe by pointing Circe's `--handoff` flag at
`.rekon/intent/plans/<intent-id>/circe/handoff.json` — all manifest-relative paths
resolve inside `circe/`. The next slice is the Intent Plan Bundle → Circe Handoff
Projection Implementation.

## Circe Projection Directory

```text
.rekon/intent/plans/<intent-id>/circe/
  handoff.json
  phase-plan.json
  work-orders/
    <phase-id>.work-order.json
  verification-plans/
    <phase-id>.verification-plan.json
```

The bundle invariant becomes:

```text
Markdown / agent files = review + LLM handoff
circe/*.json           = orchestration import projection
.rekon/artifacts/...    = canonical truth
```

Circe resolves `handoff.json`'s relative paths from the directory containing it, so
the projection is self-contained inside `circe/`.

The projection maps Rekon's bundle sources into Circe's package:

| Rekon Source | Circe Projection |
| --- | --- |
| PreparedIntentPlan phases | phase-plan entries |
| WorkOrder | work-orders/<phase-id>.work-order.json |
| VerificationPlan | verification-plans/<phase-id>.verification-plan.json |
| IntentStatusReport | handoff status / warnings |
| manifest sourceArtifacts | handoff provenance |
| agent constraints | phase constraints / stop conditions |

## Handoff Manifest Model

`circe/handoff.json` matches Circe's `RekonHandoffManifest` exactly (validated by
`validateHandoffShape`): `schemaVersion` **must be the number `1`**, `kind` **must
be `"rekon-circe-handoff"`**, `handoffId` (slug from the bundle intent id),
`repoRoot` (the repo root absolute path), `sourcePlanPath` (relative, e.g. the
bundle's `../prepared-plan.md` or a `source-plan.md` copied into `circe/`),
`phasePlanPath: "phase-plan.json"`, `producer: { system: "rekon", version }`
(**`producer.system` must be `"rekon"`**), `status: "ready"` (**must be `"ready"`
for Circe import**), `warnings: string[]`, and
`artifacts: { workOrders: [{phaseId, path, artifactId}], verificationPlans:
[{phaseId, path, artifactId}] }`.

## Phase Plan Model

`circe/phase-plan.json` matches Circe's phase-plan schema: `schemaVersion: 1`,
`planId` (from the prepared plan), `repoRoot`, and `phases: [{ phaseId, title,
workOrderPath, verificationPlanPath, implementerProfile? }]`. Each phase points at a
per-phase WorkOrder and (optionally) VerificationPlan path relative to `circe/`.

## WorkOrder Projection Model

Circe requires **one WorkOrder per phase** (referenced by the phase plan and listed
in `handoff.json` `artifacts.workOrders`). Rekon's intent handoff produces a single
whole-plan WorkOrder, so the projection **derives one WorkOrder per PreparedIntentPlan
phase**: each `circe/work-orders/<phase-id>.work-order.json` is the canonical Rekon
`WorkOrder` shape (`header` + `goal` / `paths` / `ownerSystems` / `riskNotes` /
`requiredChecks` / `successCriteria` / `relevantFindings` / `relevantMemory` /
`antiGamingInstruction` / `markdown` / `source`) populated from that phase's goal,
paths, obligations, and verification-requirement guidance (and the generated
WorkOrder's `intentHandoff` traceability where present). These are projection files,
not registered canonical artifacts.

## VerificationPlan Projection Model

VerificationPlans are **optional** per Circe (a phase may omit one; Circe reports a
warning that verification is weaker). When emitted, each
`circe/verification-plans/<phase-id>.verification-plan.json` is the canonical Rekon
`VerificationPlan` shape (`header` + `workOrderRef` + `commands` + `successCriteria`
+ `source`), derived from that phase's verification requirements (safe command
strings as `commands`, requirement reasons as `successCriteria`), citing the phase's
WorkOrder via `workOrderRef`. The projection never executes these commands.

## Routing / Implementer Profile Model

`phase.implementerProfile` is **optional** in Circe; when present it must match a
workflow `worker_profiles` entry whose worker kind is supported for implementation
(today: `codex_app_server` and `external_harness`). Because Rekon does not know the
operator's Circe workflow profiles, the projection **omits `implementerProfile` by
default**, leaving Circe to apply its default routing. A future slice may make the
profile configurable (e.g. a per-phase override), but Rekon must never invent a
profile that may not exist in the operator's workflow.

## Validation Model

Compatibility is proven by Circe's own commands run by the operator (or CI), never
by Rekon during bundle generation:

| Circe Command | Role |
| --- | --- |
| circe rekon-handoff validate | compatibility check |
| circe rekon-handoff routes | route / implementer preview |
| circe import rekon-handoff | import phase graph |

`circe rekon-handoff validate --handoff <circe/handoff.json> --workflow <WORKFLOW.md>`
checks: the manifest parses; `schemaVersion === 1`; `kind === "rekon-circe-handoff"`;
`producer.system === "rekon"`; `status === "ready"`; `phasePlanPath` exists; warnings
are surfaced; the phase plan passes Circe's phase-plan validation; implementer
profiles exist in the workflow with supported worker kinds; and the WorkOrder /
VerificationPlan artifacts normalize as Rekon artifacts. **Rekon does not run Circe
validation during bundle generation** unless an operator explicitly opts into it in
a later slice.

## Boundary Model

| Boundary | Decision |
| --- | --- |
| Rekon vs Circe | prepare/package vs orchestrate/execute |
| Circe projection vs canonical artifacts | projection vs truth |
| Circe projection vs Markdown bundle | orchestration JSON vs review files |
| bundle generation vs Circe validation | no command execution by default |
| projection vs intent:go | import handoff, not execution |
| projection vs source writes | no writes outside bundle |

## What This Does Not Do

This decision implements no projection. It writes no `circe/*` files, runs no Circe
commands, registers no artifact type, adds no CLI command, creates no canonical
artifacts, executes no commands, writes no source files, and implements no
`intent:go`. It mutates no canonical artifacts. It bumps no versions and publishes
nothing.

## Implementation Sequence

1. **Intent Plan Bundle → Circe Handoff Projection Implementation** (next slice):
   extend `rekon intent bundle write` (the `buildIntentPlanBundle` renderer) so the
   bundle also emits `circe/handoff.json`, `circe/phase-plan.json`,
   `circe/work-orders/<phase-id>.work-order.json`, and
   `circe/verification-plans/<phase-id>.verification-plan.json`, derived per phase,
   matching Circe's schema exactly. Still no Circe command execution, no source
   writes outside the bundle, and no `intent:go`. Ground the implementation against
   the same Circe validators and prove it with a fixture validated by
   `circe rekon-handoff validate` where practical.
2. **Intent Plan Bundle → Circe Handoff Projection Safety Review.**
3. **Intent Go / Execution Boundary Decision** — only after the projection safety
   review.

> Implemented (slice 99): the Intent plan bundle → Circe handoff projection now ships under `.rekon/intent/plans/<intent-id>/circe/` (handoff.json, phase-plan.json, work-orders/, verification-plans/), matching Circe's `rekon-circe-handoff` schema (validated against Circe's real normalizers). The bundle includes a Circe projection under `circe/`; **Circe handoff projection is an import adapter, not a new planning system**; **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not run Circe commands during bundle generation, does not execute the Circe handoff, and does not write source files; Circe owns orchestration after import; intent:go remains deferred. Next: Intent Plan Bundle → Circe Handoff Projection Safety Review. See [Intent Plan Bundle concept](../concepts/intent-plan-bundle.md).

> Reviewed (slice 100): the Intent plan bundle → Circe handoff projection is safe/stable as a Circe import adapter (schema-valid against Circe's real normalizers, boundary preserved, no Circe execution) — no blocker. But proof/gate traceability is incomplete: the PreparedIntentPlan approval/proof envelope, the IntentStatusReport gate status, and freshness/drift refs do not survive into `circe/`. **Circe handoff projection is an import adapter, not a new planning system**; **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not run Circe commands during bundle generation, does not execute the Circe handoff, and does not write source files; Circe owns orchestration after import; Circe projection must preserve Rekon's proof/gate traceability, and if it is incomplete, intent:go must remain blocked; intent:go remains deferred. Next: Intent Plan Bundle → Circe Proof/Gate Projection Enrichment. See [Intent Plan Bundle → Circe Handoff Projection Safety Review](./intent-plan-bundle-circe-handoff-projection-safety-review.md).

> Enriched (slice 101): the Intent plan bundle → Circe proof/gate projection now also emits `circe/rekon-proof.json` (kind rekon-circe-proof), carrying the PreparedIntentPlan approval/proof envelope, the IntentStatusReport gate state, the freshness/drift refs, and per-phase gate metadata; the per-phase WorkOrder / VerificationPlan projections gain additive `intentHandoff` traceability and `handoff.json` a `rekonProofPath` pointer. The sidecar never claims approval/readiness the source does not support; **sourceWriteAllowed remains false**, **commandsExecuted remains false**, **intentGoDeferred remains true**; **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not run Circe commands during bundle generation, does not execute the Circe handoff, and does not write source files; Circe schema validation remains intact (re-validated against Circe's real normalizers); intent:go remains deferred. Next: Intent Plan Bundle → Circe Proof/Gate Projection Safety Review. See [Intent Plan Bundle concept](../concepts/intent-plan-bundle.md).

> Reviewed (slice 102): the Intent plan bundle → Circe proof/gate projection is safe/stable — no blocker. `circe/rekon-proof.json` carries the PreparedIntentPlan approval/proof envelope, the IntentStatusReport gate state, the freshness/runtime-drift refs, and per-phase gate metadata; the sidecar never claims approval/readiness the source artifacts do not support; **sourceWriteAllowed remains false**, **commandsExecuted remains false**, **intentGoDeferred remains true**; the enriched projection remains compatible with Circe's real normalizers; **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not run Circe commands during bundle generation, does not execute commands, and does not write source files; intent:go remains deferred. The non-executing handoff pipeline is complete. Next: Intent Go / Execution Boundary Decision. See [Intent Plan Bundle → Circe Proof/Gate Projection Safety Review](./intent-plan-bundle-circe-proof-gate-projection-safety-review.md).

---

_Re-reviewed (slice 103): the Intent plan bundle → Circe proof/gate projection is safe/stable — no blocker. The current built Rekon CLI passed the Circe validate/routes/import/serve-loop proof (Circe's `rekon-intent-handoff-serve-loop.test.ts`, pass 1 / fail 0), so the enriched projection remains compatible with Circe. Top-level Rekon help is stale (0 of 6 richer intent commands listed) and must be aligned before V1/operator-ready release. `sourceWriteAllowed` / `commandsExecuted` stay false; `intent:go` remains deferred. See [Circe Proof/Gate Projection Safety Review](./intent-plan-bundle-circe-proof-gate-projection-safety-review.md)._
