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
