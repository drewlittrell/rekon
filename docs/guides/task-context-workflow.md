# Task Context Workflow

This guide turns the [TaskContextReport Workflow Integration
Decision](../strategy/task-context-report-workflow-integration-decision.md)
(Option B — context-first workflow policy) into a practical habit for humans and
agents. TaskContextReport is the standard pre-work context substrate, not a proof
artifact.

## What This Is

`rekon context task` builds one `TaskContextReport` for a task and presents it two
ways: a human "read this before editing" markdown brief and a structured
`agentContext` JSON block. This guide explains **when** to build that context and
**how** each reader should use it — before planning or editing, not as approval.

Context-first means context before planning or editing, not context as approval.
The report orients work; it never decides, approves, or executes anything.

## Context-First Workflow

The standard Rekon workflow is **context first, plan second, approval third,
handoff fourth**:

1. **Build / refresh evidence** — make sure the capability graph (and optionally
   semantic / embedding evidence) reflects the current repo.
2. **Build task context** — run `rekon context task` for the task you are about to
   work on.
3. **Human reads the markdown brief** — orient before touching code.
4. **Agent reads the `agentContext` JSON** — exact paths, constraints, hints,
   warnings, evidence, boundaries.
5. **Optionally pass the report to intent** — `rekon intent assess` /
   `rekon intent plan review` accept it explicitly via `--task-context-ref`.
6. **Prepare / approve / status / handoff stay separate** — none are unlocked by
   context.

| Step | Command / Action | Purpose |
| --- | --- | --- |
| build evidence | `rekon scan` / `rekon capability graph build` | evidence substrate |
| build context | `rekon context task` | task-shaped context |
| human read | markdown view | orientation |
| agent read | `agentContext` JSON | structured guidance |
| intent assess | `--task-context-ref` | optional explicit context |
| plan review | `--task-context-ref` | optional explicit context |
| prepare / approve / handoff | separate commands | separate gates |

## Command Sequence

The canonical pre-work sequence:

```bash
rekon scan

rekon capability graph build

rekon context task \
  --task "Describe the change" \
  --path src/example.ts \
  --json

TASK_REF="$(rekon artifacts latest --type TaskContextReport --id-only)"

rekon intent assess \
  --goal "Describe the change" \
  --path src/example.ts \
  --task-context-ref "$TASK_REF" \
  --json

rekon intent plan review \
  --plan plans/change.md \
  --goal "Describe the change" \
  --task-context-ref "$TASK_REF" \
  --json
```

`rekon artifacts latest --type TaskContextReport --id-only` resolves the most
recent report's id (add `--allow-missing` to tolerate a fresh repo). The intent
steps are **optional** — context is useful on its own for a human or agent about
to edit.

## Human Reading Guide

Humans should read the TaskContextReport markdown before editing. The brief opens
with "Read this before editing." and renders:

- **Core Context** — operator paths and deterministic graph facts (the context
  that outranks similarity).
- **Related / Supporting Context** — embedding/semantic neighbors as proposal-grade
  support.
- **Do Not Touch** — zones tagged "(guidance, not enforced)".
- **Verification Hints** — checks tagged "(hint, not executed)".
- **Warnings** — context-quality notes (e.g. retrieval unavailable, low signal).
- **Evidence** — the deduped, sorted evidence refs behind the context.

Treat do-not-touch zones as strong guidance, verification hints as suggested
checks (not executed proof), warnings as context-quality notes, and evidence refs
as traceability back to graph claims / embedding chunks.

## Agent Consumption Guide

Agents should consume agentContext before editing. Prefer the exact paths and
symbols in `coreContext`; treat `supportingContext` as useful but lower priority;
obey `doNotTouch` guidance unless the operator explicitly overrides it; treat
`verificationHints` as suggestions only. See
[Agent Context Instructions](agent-context-instructions.md) for the full agent
protocol.

| Consumer | Reads | Uses For |
| --- | --- | --- |
| human | markdown | orientation before editing |
| agent | agentContext JSON | exact paths / constraints / hints |
| intent assess | TaskContextReport ref | matchedContext enrichment |
| intent plan review | TaskContextReport ref | revision guidance |

## Intent Workflow Integration

`rekon intent assess` and `rekon intent plan review` accept a `TaskContextReport`
explicitly via `--task-context latest` / `--task-context-ref <ref>`. Used reports
enrich assessment `matchedContext` and plan-review `revisionPrompt` as additive
context — never readiness, never proof. They do **not** auto-generate context; you
pass it. `rekon intent prepare` does not take a task-context flag — it receives
context only by lineage through the assessment / actionability artifacts. Prepare /
approve / status / handoff remain separately gated. TaskContextReport consumption
remains explicit unless a future decision changes it.

## Optional Evidence Enrichment

Context quality improves when the underlying evidence is richer, but none of these
are required:

```bash
rekon scan --semantic-files auto
rekon capability graph build --semantic-file-reports latest
rekon embeddings index --changed
```

Without them, `context task` still builds from the deterministic graph and explicit
`--path` inputs (and degrades to a graph + lexical fallback when an implicitly
defaulted embedding provider has no key). Regenerate context after the repo
changes materially so the brief reflects the current source.

## Boundaries

- TaskContextReport is the standard pre-work context substrate, not a proof artifact.
- Context-first means context before planning or editing, not context as approval.
- Humans should read the TaskContextReport markdown before editing.
- Agents should consume agentContext before editing.
- TaskContextReport must not approve plans.
- TaskContextReport must not execute commands.
- TaskContextReport must not write source files.
- TaskContextReport must not create WorkOrder or VerificationPlan.
- Verification hints remain hints, not executed commands.
- Do-not-touch zones remain guidance/context, not enforcement.
- TaskContextReport consumption remains explicit unless a future decision changes it.
- Prepare / approve / status / handoff remain separately gated.
- TaskContextReport may be included in bundles only as optional context, not proof.
- intent:go remains deferred.

| Boundary | Decision |
| --- | --- |
| context vs proof | context only |
| context vs approval | no approval |
| context vs command execution | no execution |
| context vs source writes | no writes |
| context vs WorkOrder / VerificationPlan | not created |
| verification hints | hints only |
| do-not-touch zones | guidance/context |
| intent:go | deferred |

## What This Does Not Do

This guide adds no automation and changes no runtime behavior. Context is never
generated automatically inside intent commands, never becomes proof or approval,
never executes a verification hint or any target-repo command, never writes source,
never creates a WorkOrder or VerificationPlan, and never runs Circe. Do-not-touch
enforcement, required-context gating, bundle/handoff inclusion, and intent:go all
remain deferred.

> Update (slice 181 · TaskContextReport Workflow Guide Safety Review): the slice-180 workflow guide + agent instructions were reviewed end-to-end and declared safe/stable — docs/product surface only, guidance not automation. Humans read the TaskContextReport markdown before editing; agents consume `agentContext` before editing; every documented command was confirmed against the live CLI. TaskContextReport stays context, not proof — no approval / command execution / source write / WorkOrder / VerificationPlan / Circe; hints stay hints; do-not-touch stays guidance; consumption stays explicit; prepare / approve / status / handoff stay separately gated; bundle inclusion optional context only; intent:go deferred; the workflow guide introduces no runtime behavior changes. See [`task-context-workflow-guide-safety-review.md`](../strategy/task-context-workflow-guide-safety-review.md).
