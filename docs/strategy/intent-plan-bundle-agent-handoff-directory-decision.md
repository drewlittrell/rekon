# Intent Plan Bundle / Agent Handoff Directory Decision

## Decision Summary

The non-executing intent preparation chain is now complete and safety-reviewed
through `IntentAssessmentReport → PreparedIntentPlan → IntentStatusReport →
WorkOrder handoff → VerificationPlan handoff` (`217102d`). Those canonical
artifacts live under `.rekon/artifacts/`, which is machine-readable truth but a
poor surface for human review and LLM-agent handoff. This decision pins the
canonical directory, bundle shape, manifest model, human-readable files,
agent-handoff files, staleness / provenance model, source-control posture, and
implementation sequence for projecting the completed intent artifacts into a
stable repo-local plan bundle.

**The decision selects the repo-local plan bundle directory
`.rekon/intent/plans/<intent-id>/` (Option B)** — human-readable root files plus
agent-facing files under `agent/`, generated as a regenerable projection from the
canonical artifacts with manifest digests for staleness. This batch decides the
shape only; it implements no bundle and writes no files.

**Intent plan bundle is a projection, not canonical artifact truth.** **Canonical
source of truth remains .rekon/artifacts/.** **Intent plan bundles live under
.rekon/intent/plans/<intent-id>/ by default.** **Agent handoff files live under
agent/ inside the bundle.** **Bundle generation must not execute commands.**
**Bundle generation must not write source files.** **Bundle generation must not
implement intent:go.** **Stale bundles must not be treated as current handoff.**

## Why This Decision Exists

Rekon now materializes canonical, machine-readable intent / work / proof artifacts,
but operators and LLM agents need a *predictable repo-local place* to find a
prepared plan: a readable overview, the implementation guidance, the verification
requirements, and a concise agent handoff. Reading `.rekon/artifacts/` JSON
directly is canonical but neither ergonomic for humans nor shaped for agent
consumption. A bundle gives both audiences a stable handoff surface — but it must
remain a *projection* of canonical truth, never a second source of truth, and it
must never imply command execution, source writes, or `intent:go`. Pinning the
directory, manifest, files, and staleness model now keeps the upcoming
implementation disciplined.

## Current Boundary

Intent plan artifacts exist as canonical machine-readable artifacts under
`.rekon/artifacts/`. There is no human-readable / LLM-agent-ready plan bundle
directory yet; the VerificationPlan handoff safety review selected this directory
decision as the next slice. This decision adds only the *shape* of a future bundle
that would read the canonical artifacts and project them into
`.rekon/intent/plans/<intent-id>/` — never mutating canonical artifacts, never
executing commands, never writing source outside the bundle directory, and never
implementing `intent:go`.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| artifacts only | rejected | poor human/agent handoff surface |
| .rekon/intent/plans/<intent-id>/ bundle | selected | stable repo-local projection |
| markdown in .rekon/artifacts | rejected | blurs truth and presentation |
| top-level plans directory | rejected/deferred | should stay under .rekon by default |
| agent-only bundle | rejected | human review remains required |

- **Option A — no bundle; artifacts only.** Rejected: artifacts are canonical but
  not the best human / agent handoff surface.
- **Option B — repo-local bundle under `.rekon/intent/plans/<intent-id>/`.**
  Selected: gives humans and LLM agents a predictable handoff location while
  preserving `.rekon/artifacts/` as truth.
- **Option C — Markdown directly in `.rekon/artifacts/`.** Rejected: blurs
  canonical artifact storage with operator / agent presentation.
- **Option D — bundles in a repo-root `plans/` directory.** Rejected/deferred: the
  bundle is Rekon operational state and should stay under `.rekon` unless an
  operator explicitly exports it.
- **Option E — agent-only bundle.** Rejected: humans need the same handoff in
  readable form for review and auditing.

## Recommendation

Adopt **Option B**: a canonical repo-local plan bundle directory at
`.rekon/intent/plans/<intent-id>/` with human-readable root files and agent-facing
files under `agent/`, generated as a **regenerable projection with manifest
digests**. The canonical artifacts under `.rekon/artifacts/` remain the source of
truth; bundle files are derived; if a source artifact digest changes the manifest
marks the bundle stale; and the implementation may overwrite / regenerate the
bundle for the same intent id unless an immutable-snapshot mode is later decided.
The next slice is the Intent Plan Bundle / Agent Handoff Implementation.

## Directory Model

Default directory:

```text
.rekon/intent/plans/<intent-id>/
```

Rules:

- `<intent-id>` must be deterministic and slug-safe.
- the intent id should derive from the `PreparedIntentPlan` / `IntentAssessmentReport`
  id where possible.
- bundle creation must not write outside `.rekon/intent/plans/<intent-id>/`.
- bundle creation must not mutate canonical artifacts.
- bundle creation must not write source files.
- bundle creation must not execute commands.

The split is explicit: `.rekon/artifacts/...` is canonical machine-readable truth;
`.rekon/intent/plans/<intent-id>/` is the human + agent handoff bundle.

## Manifest Model

`manifest.json` is the bundle entry point — it records the source artifact refs and
digests, the rolled-up status, the file map, the staleness state, and the
boundaries:

```json
{
  "schemaVersion": "0.1.0",
  "bundleKind": "intent-plan",
  "intentId": "intent-...",
  "generatedAt": "2026-05-30T00:00:00.000Z",
  "status": "work-ready",
  "sourceArtifacts": {
    "intentAssessmentReport": { "ref": "IntentAssessmentReport:...", "digest": "..." },
    "preparedIntentPlan": { "ref": "PreparedIntentPlan:...", "digest": "..." },
    "intentStatusReport": { "ref": "IntentStatusReport:...", "digest": "..." },
    "workOrder": { "ref": "WorkOrder:...", "digest": "..." },
    "verificationPlan": { "ref": "VerificationPlan:...", "digest": "..." }
  },
  "staleness": { "state": "fresh", "staleReasons": [] },
  "files": {
    "readme": "README.md",
    "preparedPlan": "prepared-plan.md",
    "workOrder": "work-order.md",
    "verificationPlan": "verification-plan.md",
    "status": "status.md",
    "agentHandoff": "agent/handoff.md",
    "agentContext": "agent/context.json",
    "agentInstructions": "agent/instructions.md",
    "agentConstraints": "agent/constraints.md",
    "agentVerification": "agent/verification.json",
    "agentSourceRefs": "agent/source-refs.json"
  },
  "boundaries": {
    "canonicalTruth": ".rekon/artifacts",
    "executesCommands": false,
    "writesSourceFiles": false,
    "implementsIntentGo": false
  }
}
```

## Human-Readable Files

Required root files: `README.md`, `prepared-plan.md`, `work-order.md`,
`verification-plan.md`, `status.md`.

- **README.md** — overview, status, artifact refs, boundaries.
- **prepared-plan.md** — phases, approval / proof state, obligations, blocked
  reasons.
- **work-order.md** — implementation guidance from the generated `WorkOrder`.
- **verification-plan.md** — verification checks / commands as text, not execution.
- **status.md** — the current `IntentStatusReport` rollup.

Optional future root files: `findings.md`, `drift.md`, `handoff-coverage.md`.

| File | Audience | Purpose |
| --- | --- | --- |
| manifest.json | human + agent | entry point, refs, digests, staleness |
| README.md | human | overview and boundaries |
| prepared-plan.md | human | phases / approval / obligations |
| work-order.md | human | implementation guidance |
| verification-plan.md | human | proof requirements |
| status.md | human | current status rollup |
| agent/handoff.md | agent | concise task handoff |
| agent/context.json | agent | structured context |
| agent/instructions.md | agent | implementation instructions |
| agent/constraints.md | agent | boundaries / non-goals |
| agent/verification.json | agent | proof requirements |
| agent/source-refs.json | agent | canonical refs / digests |

## Agent Handoff Files

Required `agent/` files: `handoff.md`, `context.json`, `instructions.md`,
`constraints.md`, `verification.json`, `source-refs.json`.

- **agent/handoff.md** — a concise LLM-agent handoff prompt with goal, scope,
  status, instructions, and stop conditions.
- **agent/context.json** — machine-readable goal, scope, systems, capabilities,
  steps, phases, obligations, and status.
- **agent/instructions.md** — implementation instructions derived from the
  `PreparedIntentPlan` and `WorkOrder`.
- **agent/constraints.md** — non-goals, source-write boundaries, preservation
  obligations, prohibited behavior.
- **agent/verification.json** — `VerificationPlan` commands / checks as requirements
  only.
- **agent/source-refs.json** — refs / digests for canonical artifacts.

Agent rules: agent files are projection, not canonical truth; they must include
source artifact refs and stop conditions; they must state commands are not executed
by the bundle; and they must not grant source-write permission beyond what future
policies allow.

## Staleness And Provenance Model

The manifest stores source artifact refs and digests, and the bundle is stale when
any of the following hold:

| Staleness Signal | Bundle Behavior |
| --- | --- |
| source artifact digest changed | stale |
| IntentStatusReport stale | stale |
| PathFreshnessReport stale | stale |
| RuntimeGraphDriftReport new high-severity drift | stale |
| missing source artifact | stale / invalid |

Implementation may initially compute staleness using artifact digests only, then
expand to the IntentStatusReport / PathFreshnessReport / RuntimeGraphDriftReport
signals. A stale bundle must not be treated as a current handoff.

## Source Control Policy

Default: the bundle is repo-local operational state under `.rekon` and is **not
assumed committed**. Whether `.rekon/intent/plans` is committed is a repo / operator
policy decision; Rekon should not assume bundles are committed, and a future export
command may copy a bundle elsewhere.

## Boundary Model

| Boundary | Decision |
| --- | --- |
| bundle vs canonical artifacts | projection vs truth |
| bundle vs intent:go | no execution |
| bundle vs source writes | no source writes |
| bundle vs VerificationRun | no command execution |
| bundle vs agent handoff | agent files are bounded instructions |
| bundle vs source control | repo/operator policy |

## What This Does Not Do

This decision implements no bundle. It writes no `.rekon/intent/plans` files,
registers no artifact type, adds no CLI command, and creates no `WorkOrder` /
`VerificationPlan` / `VerificationRun` / `VerificationResult`. It executes no
commands, writes no source files outside the future bundle directory, mutates no
canonical artifacts, and implements no `intent:go`. It bumps no versions and
publishes nothing.

## Implementation Sequence

1. **Intent Plan Bundle / Agent Handoff Implementation** (next slice): a generator
   that reads the canonical intent artifacts and writes the bundle into
   `.rekon/intent/plans/<intent-id>/` (manifest + human files + `agent/` files),
   computing staleness from source digests; it executes no commands, writes no
   source outside the bundle directory, and implements no `intent:go`.
2. **Intent Plan Bundle / Agent Handoff Safety Review**: ground review of the
   shipped generator.
3. **Intent Go / Execution Boundary Decision** — only after the plan-bundle safety
   review. `intent:go` remains deferred until then.

> Shipped (slice 96): the Intent plan bundle generator shipped — `rekon intent bundle write` projects the canonical intent artifacts into a regenerable human + LLM-agent handoff bundle under `.rekon/intent/plans/<intent-id>/` (manifest + human files + `agent/` files), recording source refs / digests / staleness. **Intent plan bundle is a projection, not canonical artifact truth**; canonical source of truth remains `.rekon/artifacts/`; bundle generation executes no commands, writes no source files outside the bundle directory, creates no canonical artifacts, and does not implement intent:go; stale bundles must not be treated as current handoff. Next: Intent Plan Bundle / Agent Handoff Safety Review. See [intent plan bundle](../concepts/intent-plan-bundle.md).

> Reviewed (slice 97): the Intent plan bundle generator is safe/stable as a human + LLM-agent filesystem projection — `rekon intent bundle write` writes the bundle only under `.rekon/intent/plans/<intent-id>/` with path-traversal safety on the intent id and every file path. **Intent plan bundle is a projection, not canonical artifact truth**; canonical source of truth remains `.rekon/artifacts/`; bundle generation creates no canonical artifacts, executes no commands, and writes no source files; stale bundles must not be treated as current handoff; intent:go remains deferred. Next: Intent Go / Execution Boundary Decision. See [Intent Plan Bundle / Agent Handoff Safety Review](./intent-plan-bundle-agent-handoff-safety-review.md).

> Decided (slice 98): the Intent plan bundle → Circe handoff projection is an import adapter, not a new planning system — Rekon emits a Circe `rekon-circe-handoff` package under `.rekon/intent/plans/<intent-id>/circe/` (handoff.json, phase-plan.json, work-orders/, verification-plans/) derived from the bundle. **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not execute the Circe handoff, does not run Circe commands during bundle generation, and does not write source files; Circe owns orchestration after import; intent:go remains deferred. Next: Intent Plan Bundle → Circe Handoff Projection Implementation. See [Intent Plan Bundle → Circe Handoff Projection Decision](./intent-plan-bundle-circe-handoff-projection-decision.md).

> Reviewed (slice 100): the Intent plan bundle → Circe handoff projection is safe/stable as a Circe import adapter (schema-valid against Circe's real normalizers, boundary preserved, no Circe execution) — no blocker. But proof/gate traceability is incomplete: the PreparedIntentPlan approval/proof envelope, the IntentStatusReport gate status, and freshness/drift refs do not survive into `circe/`. **Circe handoff projection is an import adapter, not a new planning system**; **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not run Circe commands during bundle generation, does not execute the Circe handoff, and does not write source files; Circe owns orchestration after import; Circe projection must preserve Rekon's proof/gate traceability, and if it is incomplete, intent:go must remain blocked; intent:go remains deferred. Next: Intent Plan Bundle → Circe Proof/Gate Projection Enrichment. See [Intent Plan Bundle → Circe Handoff Projection Safety Review](./intent-plan-bundle-circe-handoff-projection-safety-review.md).
