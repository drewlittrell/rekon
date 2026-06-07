# Intent Plan Bundle

> **Re-dogfooded end-to-end (slice 140):** the bundle's Circe projection
> (`handoff.json` / `phase-plan.json` / `rekon-proof.json` / per-phase
> work-orders + verification-plans) was re-generated on a fresh repo and imported
> into a local Circe checkout (`circe import rekon-phase-plan` / `rekon-work-order`).
> The proof sidecar gates now include an explicit `runsCirce: false`; Rekon writes
> no source, runs no commands, and runs no Circe — see
> [`../strategy/fresh-repo-intent-handoff-circe-dogfood-review-semantic.md`](../strategy/fresh-repo-intent-handoff-circe-dogfood-review-semantic.md).

An intent plan bundle is a stable, repo-local projection of the completed Rekon
intent preparation artifacts into human-readable and LLM-agent-ready files. It
answers a practical question: *where do an operator or an agent go to read the
prepared plan, the work order, the verification plan, and the status — and pick up
the handoff?* The answer is one directory, written by `rekon intent bundle write`.

## Projection, Not Truth

**Intent plan bundle is a projection, not canonical artifact truth.** The bundle
is generated from the canonical intent artifacts and is regenerable at any time;
it never replaces them. **Canonical source of truth remains `.rekon/artifacts/`.**
**Intent plan bundles live under `.rekon/intent/plans/<intent-id>/` by default.**
**Agent handoff files live under `agent/` inside the bundle.**

The boundary statements the generator preserves:

- **Bundle generation must not execute commands.** Verification commands appear in
  the bundle as text and requirements only.
- **Bundle generation must not write source files.** The generator writes only
  inside `.rekon/intent/plans/<intent-id>/`.
- **Bundle generation must not implement intent:go.** The bundle is a handoff, not
  an execution.
- **Stale bundles must not be treated as current handoff.** The manifest records
  source artifact digests and a staleness state; a stale bundle is a signal to
  regenerate, not a current handoff.

> **Dogfood review (slice 136):** these bundle boundaries (no command execution, no source
> write, no `intent:go`, no Circe run by Rekon — the handoff `producer.system` is `rekon`) were
> confirmed end-to-end on a realistic fresh TypeScript package, and the emitted `circe/` projection
> was accepted by a real `circe import rekon-phase-plan` / `rekon-work-order` from outside Rekon —
> see [`fresh-repo-intent-handoff-circe-dogfood-review.md`](../strategy/fresh-repo-intent-handoff-circe-dogfood-review.md).

## The Bundle

```text
.rekon/intent/plans/<intent-id>/
  manifest.json
  README.md
  prepared-plan.md
  work-order.md
  verification-plan.md
  status.md
  agent/
    handoff.md
    context.json
    instructions.md
    constraints.md
    verification.json
    source-refs.json
```

The `manifest.json` is the entry point: it records the bundle kind, intent id,
status, the source artifact refs and digests, the staleness state and reasons, the
file map, and the boundaries (`executesCommands` / `writesSourceFiles` /
`implementsIntentGo`, all `false`, plus `canonicalTruth: ".rekon/artifacts"`). The
root Markdown files are for human review; the `agent/` files are a bounded handoff
for an LLM agent (a concise prompt, structured context, ordered instructions,
constraints, verification requirements, and source refs).

## Intent Id And Path Safety

The intent id derives from `--intent-id` (when supplied), else the
`PreparedIntentPlan` / `IntentAssessmentReport` / `IntentStatusReport` id, and is
slug-normalized (lowercase, non-alphanumeric → `-`, collapsed, trimmed). The
generator and CLI enforce that the bundle always resolves inside
`<repo-root>/.rekon/intent/plans/` and that no rendered file path is absolute or
contains `..` — so an adversarial intent id or path cannot escape the bundle
directory.

## Staleness

The manifest's `staleness.state` is `stale` when a source artifact is missing
(`missing-prepared-plan`), a `PathFreshnessReport` reports stale scoped context
(`freshness-stale`), a `RuntimeGraphDriftReport` has new high-severity drift
(`drift-changed`), or the `IntentStatusReport` lists stale inputs
(`status-stale-inputs`); otherwise it is `fresh`. A stale bundle should be
regenerated before it is used as a handoff.

## Circe Handoff Projection

Every generated bundle also includes a Circe projection under `circe/`, so the
bundle is directly importable by [Circe](https://github.com/drewlittrell/Circe)
without Circe parsing Rekon internals:

```text
.rekon/intent/plans/<intent-id>/circe/
  handoff.json                              # rekon-circe-handoff manifest
  phase-plan.json                           # one phase per PreparedIntentPlan phase
  work-orders/<phase-id>.work-order.json    # canonical Rekon WorkOrder, one per phase
  verification-plans/<phase-id>.verification-plan.json  # optional, per phase
```

The **Circe handoff projection is an import adapter, not a new planning system.**
`handoff.json` matches Circe's `rekon-circe-handoff` schema exactly (`schemaVersion:
1`, `kind: "rekon-circe-handoff"`, `producer.system: "rekon"`, `status: "ready"`).
Circe requires one WorkOrder per phase (VerificationPlan optional), so the projection
derives one WorkOrder per PreparedIntentPlan phase in the canonical Rekon WorkOrder /
VerificationPlan shapes; a phase with no verification requirement omits its
VerificationPlan and records a handoff warning. `implementerProfile` is omitted by
default because Rekon does not know the operator's Circe workflow profiles. The
projection files are derived files, **not** registered canonical artifacts.

Operators import a bundle into Circe by pointing Circe at the projection:

```sh
circe rekon-handoff validate --handoff .rekon/intent/plans/<intent-id>/circe/handoff.json --workflow WORKFLOW.md
circe import rekon-handoff --handoff .rekon/intent/plans/<intent-id>/circe/handoff.json
```

**Boundaries.** **Canonical Rekon truth remains `.rekon/artifacts/`.** **Rekon does
not run Circe commands during bundle generation.** **Rekon does not execute the Circe
handoff.** **Rekon does not write source files.** **Circe owns orchestration after
import.** Compatibility is proven by the operator's own `circe rekon-handoff validate`
/ `routes` / `circe import rekon-handoff`, never by Rekon. **intent:go remains
deferred.**

### Proof / Gate Sidecar (`circe/rekon-proof.json`)

So the projection does not flatten away Rekon's proof-approved preparation model, the
bundle also emits a Rekon-specific proof/gate sidecar, `circe/rekon-proof.json`, for
Circe import review:

```text
.rekon/intent/plans/<intent-id>/circe/rekon-proof.json   # kind: rekon-circe-proof
```

The sidecar **carries the PreparedIntentPlan approval/proof** envelope (approval
status / reasons, and the `runtimeDrift` / `handoffCoverage` / `freshness` /
`verification` / `planStructure` proof with their source refs), the **IntentStatusReport
gate state** (status + recommended next action), the **freshness/drift refs**, and
**phase-level gate metadata** (per-phase `phaseGates` with phase id, obligation ids,
verification-requirement ids, approval status, and readiness). The bundle manifest's
`circe` section points at it (`circe.rekonProof`), `circe/handoff.json` carries a
minimal `rekonProofPath` pointer, and the per-phase WorkOrder / VerificationPlan
projections carry the same traceability via their `intentHandoff` block.

The sidecar never claims approval or readiness the source artifacts do not support
(no `PreparedIntentPlan.approval` ⇒ `gates.preparedPlanApproved: false` and
`phaseGates[].readyForCirce: false`), and it always pins the boundaries:
**sourceWriteAllowed remains false**, **commandsExecuted remains false**, and
**intentGoDeferred remains true**.

The enrichment is additive: the proof data rides in the Rekon-owned sidecar plus
fields Circe's normalizers ignore, so **Circe schema validation remains intact**
(`handoff.json`, `phase-plan.json`, and the per-phase WorkOrder / VerificationPlan
projections are still accepted by Circe's `readRekonHandoffManifestFile` /
`readRekonPhasePlanFile` / `normalizeRekonWorkOrder` / `normalizeRekonVerificationPlan`).

## Phase Verification Posture

Slice 115 makes phase-level verification explicit in the bundle and its Circe
projection so skipped verification never reads as proof. **Every phase has an
explicit verification posture.** The posture is one of `executable`,
`final-verification`, `manual-review`, or `needs-review` — recorded in `circe/rekon-proof.json`
`phaseGates[]` (with `manualGate`, `needsReview`, `reason`, and, when present,
`verificationPlanPath`), mirrored on `circe/phase-plan.json` `phases[].rekon`, and
summarized in `verification-plan.md` and `agent/verification.json`.

The posture is derived from the phase `kind` and the plan's safe executable
verification requirements (those that carry a command):

- **`phase-modify` gets executable verification when possible.** Implementation
  phases (`modify` / `refactor`) map the plan's safe executable requirements and
  ship a per-phase VerificationPlan; if no safe requirement applies they are
  recorded as `needs-review` (not silently skipped).
- **`phase-verify` carries final verification.** The verify phase ships the final
  VerificationPlan when executable requirements exist, else `needs-review`.
- **`phase-investigate` and `phase-review` may be manual / reviewer-gated.** They
  are `manual-review` by default unless explicit executable requirements attach.

**Manual-only phases are marked explicitly so skipped verification does not look
like proof.** Each `manual-review` / `needs-review` phase records why it carries no
executable VerificationPlan. **A phase without executable verification is never
silently treated as verified.** `rekon intent bundle write` reports a
`phaseVerification` summary (executable / final-verification / manual-review /
needs-review counts); the bundle still executes no commands and writes no source.

## CLI

```sh
rekon intent bundle write \
  [--intent-id <id>] \
  [--assessment <IntentAssessmentReport:id|type:id>] \
  [--prepared-plan <PreparedIntentPlan:id|type:id>] \
  [--intent-status <IntentStatusReport:id|type:id>] \
  [--work-order <WorkOrder:id|type:id>] \
  [--verification-plan <VerificationPlan:id|type:id>] \
  [--path-freshness <PathFreshnessReport:id|type:id>] \
  [--runtime-drift <RuntimeGraphDriftReport:id|type:id>] \
  [--root <path>] [--json]
```

The command reads the latest-or-pinned canonical artifacts, renders the bundle, and
writes it under `.rekon/intent/plans/<intent-id>/`, regenerating the bundle for the
same intent id. It creates no canonical artifacts, executes no commands, writes no
source files outside the bundle directory, and does not implement `intent:go`.

> Reviewed (slice 97): the Intent plan bundle generator is safe/stable as a human + LLM-agent filesystem projection — `rekon intent bundle write` writes the bundle only under `.rekon/intent/plans/<intent-id>/` with path-traversal safety on the intent id and every file path. **Intent plan bundle is a projection, not canonical artifact truth**; canonical source of truth remains `.rekon/artifacts/`; bundle generation creates no canonical artifacts, executes no commands, and writes no source files; stale bundles must not be treated as current handoff; intent:go remains deferred. Next: Intent Go / Execution Boundary Decision. See [Intent Plan Bundle / Agent Handoff Safety Review](../strategy/intent-plan-bundle-agent-handoff-safety-review.md).

> Decided (slice 98): the Intent plan bundle → Circe handoff projection is an import adapter, not a new planning system — Rekon emits a Circe `rekon-circe-handoff` package under `.rekon/intent/plans/<intent-id>/circe/` (handoff.json, phase-plan.json, work-orders/, verification-plans/) derived from the bundle. **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not execute the Circe handoff, does not run Circe commands during bundle generation, and does not write source files; Circe owns orchestration after import; intent:go remains deferred. Next: Intent Plan Bundle → Circe Handoff Projection Implementation. See [Intent Plan Bundle → Circe Handoff Projection Decision](../strategy/intent-plan-bundle-circe-handoff-projection-decision.md).

> Implemented (slice 99): the Intent plan bundle → Circe handoff projection now ships under `.rekon/intent/plans/<intent-id>/circe/` (handoff.json, phase-plan.json, work-orders/, verification-plans/), matching Circe's `rekon-circe-handoff` schema (validated against Circe's real normalizers). The bundle includes a Circe projection under `circe/`; **Circe handoff projection is an import adapter, not a new planning system**; **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not run Circe commands during bundle generation, does not execute the Circe handoff, and does not write source files; Circe owns orchestration after import; intent:go remains deferred. Next: Intent Plan Bundle → Circe Handoff Projection Safety Review. See [Intent Plan Bundle → Circe Handoff Projection Decision](../strategy/intent-plan-bundle-circe-handoff-projection-decision.md).

> Reviewed (slice 100): the Intent plan bundle → Circe handoff projection is safe/stable as a Circe import adapter (schema-valid against Circe's real normalizers, boundary preserved, no Circe execution) — no blocker. But proof/gate traceability is incomplete: the PreparedIntentPlan approval/proof envelope, the IntentStatusReport gate status, and freshness/drift refs do not survive into `circe/`. **Circe handoff projection is an import adapter, not a new planning system**; **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not run Circe commands during bundle generation, does not execute the Circe handoff, and does not write source files; Circe owns orchestration after import; Circe projection must preserve Rekon's proof/gate traceability, and if it is incomplete, intent:go must remain blocked; intent:go remains deferred. Next: Intent Plan Bundle → Circe Proof/Gate Projection Enrichment. See [Intent Plan Bundle → Circe Handoff Projection Safety Review](../strategy/intent-plan-bundle-circe-handoff-projection-safety-review.md).

> Enriched (slice 101): the Intent plan bundle → Circe proof/gate projection now also emits `circe/rekon-proof.json` (kind rekon-circe-proof), carrying the PreparedIntentPlan approval/proof envelope, the IntentStatusReport gate state, the freshness/drift refs, and per-phase gate metadata; the per-phase WorkOrder / VerificationPlan projections gain additive `intentHandoff` traceability and `handoff.json` a `rekonProofPath` pointer. The sidecar never claims approval/readiness the source does not support; **sourceWriteAllowed remains false**, **commandsExecuted remains false**, **intentGoDeferred remains true**; **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not run Circe commands during bundle generation, does not execute the Circe handoff, and does not write source files; Circe schema validation remains intact (re-validated against Circe's real normalizers); intent:go remains deferred. Next: Intent Plan Bundle → Circe Proof/Gate Projection Safety Review. See [Intent Plan Bundle → Circe Handoff Projection Safety Review](../strategy/intent-plan-bundle-circe-handoff-projection-safety-review.md).

> Reviewed (slice 102): the Intent plan bundle → Circe proof/gate projection is safe/stable — no blocker. `circe/rekon-proof.json` carries the PreparedIntentPlan approval/proof envelope, the IntentStatusReport gate state, the freshness/runtime-drift refs, and per-phase gate metadata; the sidecar never claims approval/readiness the source artifacts do not support; **sourceWriteAllowed remains false**, **commandsExecuted remains false**, **intentGoDeferred remains true**; the enriched projection remains compatible with Circe's real normalizers; **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not run Circe commands during bundle generation, does not execute commands, and does not write source files; intent:go remains deferred. The non-executing handoff pipeline is complete. Next: Intent Go / Execution Boundary Decision. See [Intent Plan Bundle → Circe Proof/Gate Projection Safety Review](../strategy/intent-plan-bundle-circe-proof-gate-projection-safety-review.md).

---

_Re-reviewed (slice 103): the Intent plan bundle → Circe proof/gate projection is safe/stable — no blocker. The current built Rekon CLI passed the Circe validate/routes/import/serve-loop proof (Circe's `rekon-intent-handoff-serve-loop.test.ts`, pass 1 / fail 0), so the enriched projection remains compatible with Circe. Top-level Rekon help is stale (0 of 6 richer intent commands listed) and must be aligned before V1/operator-ready release. `sourceWriteAllowed` / `commandsExecuted` stay false; `intent:go` remains deferred. See [Circe Proof/Gate Projection Safety Review](../strategy/intent-plan-bundle-circe-proof-gate-projection-safety-review.md)._

---

_V1 readiness (slice 105): this surface is part of the non-executing Rekon → Circe prepared-plan handoff that the V1 Readiness / Release Review conditionally approved as V1 — Rekon prepares, proves, packages, and exports; Circe imports and orchestrates. `intent:go`, Rekon-side command execution, Rekon-side source writes, and VerificationRun / VerificationResult generation remain excluded/deferred beyond V1; release mechanics (version / tag / publish) are a separate slice. See [V1 Readiness / Release Review](../strategy/v1-readiness-release-review.md)._

---

_Reviewed (slice 116): the phase-level verification posture (slice 115) is **safe/stable** — every phase has explicit verification posture, `phase-modify` / `phase-refactor` get executable verification when safe requirements exist (else `needs-review`), `phase-verify` carries final verification, and `phase-investigate` / `phase-review` are explicit manual / reviewer gates. Skipped verification is not proof; posture is projection metadata, not a VerificationRun. No commands executed, no VerificationRun / VerificationResult, no source writes, no Circe run by Rekon, `intent:go` deferred. See [Intent Bundle Phase-Level Verification Safety Review](../strategy/intent-bundle-phase-level-verification-safety-review.md)._

> Fixed (slice 121): a needs-review PreparedIntentPlan with zero hard blockers now yields an implementation-bearing **draft** (investigate / modify|refactor / verify / review + safe verification requirements), so the bundle and phase-level posture render real phases instead of review-only. The draft stays needs-review; WorkOrder / VerificationPlan generation remain blocked until explicit approval; no commands execute and no source is written. See [Intent Prepare Needs-Review Planfulness Fix](../strategy/intent-prepare-needs-review-planfulness.md).

> Decided (slice 122): explicit approval of a reviewed draft is pinned by **Intent Operator Approval / Proof Acceptance Decision** — a future `rekon intent approve` writes a new approved `PreparedIntentPlan` revision after rechecking freshness / drift / status and recording the operator's accepted proof gaps, so the bundle can then project an approved plan. Approval enables but does not create the WorkOrder / VerificationPlan handoff; no commands execute and no source is written. See [Intent Operator Approval / Proof Acceptance Decision](../strategy/intent-operator-approval-proof-acceptance-decision.md).

> Upstream (slice 129): well before a bundle is written, `rekon intent plan review` compiles a raw / semi-structured plan into phase drafts and reports whether it is actionable / needs-revision / blocked (findings + elicitation questions + an operator-or-LLM revision prompt) via the read-only `IntentPlanActionabilityReport`. It is the intent plan compiler's front door, upstream of assess / prepare / approve / bundle, and is **report-only: it creates no canonical or downstream artifacts, executes no commands, writes no source, and runs no Circe.** See [the intent plan compiler](./intent-plan-compiler.md).

> Reviewed (slice 130): the upstream plan-compiler layer is safe/stable as read / transform / report-only — it creates no canonical or downstream artifacts, executes no commands, writes no source, and runs no Circe; intent:go remains deferred. See [Intent Plan Actionability Report Safety Review](../strategy/intent-plan-actionability-report-safety-review.md).

> Integrated (slice 131): the actionability report now feeds the spine ahead of the bundle. `rekon intent prepare --actionability-report <ref>` lets an actionable report shape the `PreparedIntentPlan` phases the bundle later renders, while a needs-revision / blocked report blocks preparation (no plan, non-zero exit) so a non-actionable plan cannot reach a bundle. Prepare still does not auto-approve, creates no WorkOrder / VerificationPlan, executes no commands, writes no source, and runs no Circe; intent:go remains deferred. See [Intent Prepare Integration With Actionability Report](../strategy/intent-prepare-actionability-integration.md).

> Reviewed (slice 132): the upstream prepare / actionability integration is safe/stable — a non-actionable plan cannot reach a bundle (preparation blocks first), and an actionable report only shapes the prepared phases the bundle renders, never approval. See [Intent Prepare Actionability Integration Safety Review](../strategy/intent-prepare-actionability-integration-safety-review.md).

> Update (slice 182 · TaskContextReport Bundle Context Decision): intent bundles may carry optional `TaskContextReport` refs as context for agents/operators (Option B + E) — an additive `manifest.context.taskContextReports[]` section plus Rekon-side `context/` sidecars, with the Circe handoff schema unchanged in v1. Inclusion is optional, never required; context stays context, not proof — it must not approve plans, satisfy WorkOrder/VerificationPlan gates, change phase gates, execute commands, write source, or run Circe; hints stay hints; do-not-touch stays guidance; Circe is not required to know TaskContextReport internals in v1; intent:go deferred. First implementation: TaskContextReport Bundle Context Implementation. See [`task-context-report-bundle-context-decision.md`](../strategy/task-context-report-bundle-context-decision.md).

> Update (slice 183 · TaskContextReport Bundle Context Implementation): `rekon intent bundle write` now attaches optional `TaskContextReport` refs via a repeatable `--task-context-ref` (plus bounded lineage discovery from prepared-plan / assessment `inputRefs`) as an additive `manifest.context.taskContextReports[]` section (`role: optional-agent-context`, `proof: false`) plus three Rekon-side `context/` sidecars (`task-context.md` / `task-context.agent.json` / `task-context.refs.json`). With no ref the bundle is byte-identical; a missing / wrong-type ref fails cleanly. The Circe handoff projection (`circe/handoff.json` etc.) and the WorkOrder / VerificationPlan / phase-gate files are unchanged and never carry task context. TaskContextReport may be included in bundles only as optional context, not proof — it must not be required to write an intent bundle, approve plans, satisfy WorkOrder/VerificationPlan or phase gates, execute commands, write source, or run Circe; verification hints remain hints; do-not-touch zones remain guidance; Circe handoff JSON is unchanged in v1; intent:go remains deferred. Implements the slice-182 decision (Option B + E). See [`task-context-report-bundle-context-implementation.md`](../strategy/task-context-report-bundle-context-implementation.md).

> Update (slice 184 · TaskContextReport Bundle Context Safety Review): the slice-183 bundle-context implementation was reviewed end-to-end and declared safe/stable — optional `TaskContextReport` context in intent bundles holds every boundary. TaskContextReport may be included in bundles only as optional context, not proof, and is not required to write an intent bundle: a bundle with no ref is byte-identical; a bundle with a ref adds only `manifest.context.taskContextReports[]` (`proof: false`, `role: optional-agent-context`) and the `context/` sidecars (`task-context.md` optional guidance not proof, `task-context.agent.json` all-false boundaries, `task-context.refs.json` refs + `proof:false`). The Circe handoff JSON is unchanged in v1; WorkOrder / VerificationPlan / phase gates unchanged; missing + wrong-type refs fail cleanly; lineage discovery stays bounded and optional. No approval / command execution / source write / WorkOrder / VerificationPlan / Circe; verification hints stay hints; do-not-touch stays guidance; intent:go remains deferred. Recommended next: TaskContextReport Bundle Context Dogfood. See [`task-context-report-bundle-context-safety-review.md`](../strategy/task-context-report-bundle-context-safety-review.md).

> Update (slice 185 · TaskContextReport Bundle Context Dogfood): the optional bundle-context sidecars were dogfooded on a realistic operator/agent handoff path (full intent path → `intent bundle write --task-context-ref` → validate). bundle write succeeded; `manifest.context.taskContextReports` (`proof:false`, `role: optional-agent-context`) was discoverable; the `context/task-context.md` human brief, `context/task-context.agent.json` agent view, and `context/task-context.refs.json` traceability index were all useful; bundle JSON reported the `taskContext` sidecars; the Circe handoff JSON remains unchanged / not dependent on task context; WorkOrder / VerificationPlan + phase gates unchanged; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred. One narrow human-discoverability gap was fixed: the bundle `README.md` now renders an additive "## Task context" section (guidance, not proof) only when a TaskContextReport is attached. Sidecars are ready for broader handoff use. Next: TaskContextReport Bundle Context Dogfood Safety Review. See [`task-context-report-bundle-context-dogfood.md`](../strategy/task-context-report-bundle-context-dogfood.md).

> Update (slice 186 · TaskContextReport Bundle Context Dogfood Safety Review): the slice-185 dogfood result + the narrow bundle-README discoverability fix were reviewed end-to-end and declared safe/stable. TaskContextReport bundle context is optional context, not proof; the full bundle-context dogfood path completed successfully; `manifest.context.taskContextReports` was discoverable (`proof:false`, `role: optional-agent-context`); the `context/task-context.md` / `.agent.json` / `.refs.json` sidecars were useful to humans, agents, and traceability; the bundle README now points to the sidecars (guidance, not proof) when context is attached and is omitted otherwise; Circe handoff JSON remains unchanged / not dependent on task context; WorkOrder / VerificationPlan + phase gates unchanged; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred. Bundle context is ready for broader handoff use. Next: TaskContextReport Bundle Context Broader Handoff Decision. See [`task-context-report-bundle-context-dogfood-safety-review.md`](../strategy/task-context-report-bundle-context-dogfood-safety-review.md).

> Update (slice 187 · TaskContextReport Bundle Broader Handoff Decision): decided how broader operator/agent handoff workflows should use the optional bundle-context sidecars (Option B — promote them in human/agent handoff guidance, recommended not required). Humans should inspect `context/task-context.md` when present; agents should read `context/task-context.agent.json` when present; the follow-up will point `agent/instructions.md` + `agent/handoff.md` (and optionally `agent/context.json` metadata) at the sidecars. TaskContextReport sidecars are optional context, not proof — must not be required to write an intent bundle, approve plans, execute commands, write source, or satisfy WorkOrder/VerificationPlan or phase gates; verification hints remain hints; do-not-touch zones remain guidance; Circe handoff JSON remains the machine handoff contract and is not required to understand TaskContextReport internals; intent:go remains deferred. First implementation: TaskContextReport Bundle Handoff Guidance Implementation. See [`task-context-report-bundle-broader-handoff-decision.md`](../strategy/task-context-report-bundle-broader-handoff-decision.md).

> Update (slice 188 · TaskContextReport Bundle Handoff Guidance Implementation): when a `TaskContextReport` is attached to an intent plan bundle, the agent-facing bundle files now promote the optional context sidecars. `agent/instructions.md` and `agent/handoff.md` gain a "## Task context" section (only when a TaskContextReport is attached) pointing at `context/task-context.agent.json` / `context/task-context.md`, framing context as not-proof and keeping WorkOrder / VerificationPlan / phase gates authoritative; `agent/context.json` gains an additive `taskContext` metadata block (`available:true`, `proof:false`, `role: optional-agent-context`) with every existing field preserved. With no task context the agent files are byte-identical. The bundle README section, the `context/` sidecars, and the Circe handoff trio are unchanged. TaskContextReport sidecars are optional context, not proof — humans should inspect context/task-context.md when present; agents should read context/task-context.agent.json when present; verification hints remain hints; do-not-touch stays guidance; Circe handoff JSON remains the machine handoff contract; intent:go remains deferred. Next: TaskContextReport Bundle Handoff Guidance Safety Review. See [`task-context-report-bundle-handoff-guidance-implementation.md`](../strategy/task-context-report-bundle-handoff-guidance-implementation.md).

> Update (slice 189 · TaskContextReport Bundle Handoff Guidance Safety Review): the slice-188 agent-facing handoff guidance was reviewed end-to-end and declared safe/stable. TaskContextReport sidecars are optional context, not proof; `agent/instructions.md` + `agent/handoff.md` promote the optional task context only when sidecars are present; `agent/context.json` carries additive `taskContext` metadata (`proof:false`, `role: optional-agent-context`) when present and preserves every existing field; without-context bundles are byte-identical. Agents should read `context/task-context.agent.json` when present; humans should inspect `context/task-context.md` when present; verification hints remain hints; do-not-touch stays guidance; WorkOrder / VerificationPlan + phase gates remain authoritative; the Circe handoff JSON remains the machine handoff contract and is not required to understand TaskContextReport internals; sidecars must not approve plans, execute commands, or write source; intent:go remains deferred. Next: TaskContextReport Bundle Handoff Dogfood. See [`task-context-report-bundle-handoff-guidance-safety-review.md`](../strategy/task-context-report-bundle-handoff-guidance-safety-review.md).

> Update (slice 190 · TaskContextReport Bundle Handoff Dogfood — rebased on 4cc34b73 Circe actor contracts): the promoted handoff guidance was re-dogfooded from both the human-operator and the agent perspective against the current bundle producer after `4cc34b73` ("feat: emit target-specific Circe actor contracts"). A human can discover task context from `README.md`; `context/task-context.md` + `context/task-context.refs.json` were useful; an agent can discover it from `agent/instructions.md` + `agent/handoff.md`; `agent/context.json` `taskContext` metadata + `context/task-context.agent.json` were useful; `agent/verification.json` stayed authoritative for verification posture and `agent/source-refs.json` for source refs. The Circe handoff trio stayed stable and independent of TaskContextReport — `circe/handoff.json` now carries an additive `actorContracts` block. The new `circe/actor-contracts/` artifacts (3 contract Markdown + 3 JSON Schema, default `circe` target) were present and non-executing (return-shape guidance/artifacts, not executed workers) and identical in the without-context bundle. WorkOrder / VerificationPlan + phase gates remained authoritative; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred; the without-context bundle omitted every task-context surface. No fix needed. Next: TaskContextReport Bundle Handoff Dogfood Safety Review. See [`task-context-report-bundle-handoff-dogfood.md`](../strategy/task-context-report-bundle-handoff-dogfood.md).
