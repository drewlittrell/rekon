# Intent Plan Bundle

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
