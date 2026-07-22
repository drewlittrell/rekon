---
freshness:
  paths:
    - packages/**
    - docs/strategy/rekon-system-model.md
---

# Rekon System Model

Rekon models a codebase through typed evidence, derived artifacts, and
explainable resolution.

## Core Loop

1. Observe source and configuration into evidence facts.
2. Normalize and project evidence into repository models.
3. Evaluate those models against rulebooks and policies.
4. Resolve task-specific questions from the current snapshot.
5. Publish derived guidance without making it canonical truth.
6. Prepare work and verification artifacts when a task needs execution.
7. Validate the resulting diff and prove each affected contract edge.
8. Record the satisfied gate and refresh maintained knowledge.

Each flow handoff may name its accepted verifier methods, acceptance policy,
and exact checks. Deterministic checks and runtime observations bind directly
to the edges they exercise; one handoff's check cannot prove a sibling edge.
The acting model judges semantic obligations against cited source.
Counterevidence blocks completion.
Contract discovery assigns an explicit policy to every proposed handoff. It
first inventories the current structural graph, adopted flow contracts,
runtime observations, and isolated coverage known to the artifact registry.
Inventory completeness and evidence availability are separate: a successful
inventory can still produce structural-only, provisional flows when runtime
evidence does not exist. Invalid evidence marks the candidate report partial.
Cold-start topology identifies which additional observations are worth
gathering; later passes refine it rather than treating the first proposal as
final. After inventory, discovery preserves adopted policy, then prefers a
validated isolated test covering both
stage endpoints, current runtime observation, and finally model judgment.
Historical observations nominate the verifier to rerun; they are not
present-state proof.
Cold-start JavaScript and TypeScript CLI discovery connects executable module
scope to successful stdout and excludes test roots from product-flow starts.
Source paths survive entry, callable, and output graph identities so exact
coverage can nominate a handoff verifier before model judgment is required.
Executed checks capture their bounded source state before and after execution;
only an unchanged post-run digest can satisfy the matching current change.
Declared checks remain authoritative. When they leave changed source without a
test, prior isolated coverage may nominate exact recorded commands; a
deterministic set-cover pass adds only the commands needed to cover the gap.
That history chooses what to rerun and is never accepted as present-state
proof. Failed or stale proof returns bounded context for the exact check,
paths, and affected flow edge before any broader context escalation.
One digest-bound, proof-gated refresh then advances the maintained repository
model. The gate is retained as observation provenance; unaffected evidence is
preserved, stale embedding cache records are excluded, and projections,
governance, snapshot, maintained publications, and managed agent instructions
are regenerated. Existing adopted contracts are reconciled after projection;
confirmed drift blocks acceptance, while missing contracts remain an explicit
bootstrap decision. The gated source bytes are checked again after the final
write so refresh cannot accept a source state that changed while it ran.

Models enter this loop through a stable bootstrap in `AGENTS.md`. The bootstrap
directs them to a shared context compiler exposed through MCP and CLI. The
compiler selects current repository law, ownership, graph context, scoped
memory, governed assessments, and required checks under an explicit context
budget.

Before delivery, one shared policy classifies the task and its current evidence.
Complete local work receives compact context and can proceed directly. High-risk,
contract-changing, migration, and critical-flow work uses the existing work-order
path. Missing evidence raises the context budget to standard; an unexplained
validation failure raises it to deep. CLI and MCP expose the same decision as
`operation` rather than maintaining separate risk policies.

The loop is designed to make context reusable and reviewable. A person should
be able to inspect an artifact and understand its producer, inputs, freshness,
and provenance.

## Trust Boundaries

- Evidence is the base layer.
- Models are deterministic projections of evidence.
- Findings are evaluations, not edits.
- Resolver packets explain source precedence and fallback.
- Publications are generated readouts.
- Work and verification artifacts guide execution but do not execute commands
  by themselves.
- Memory can influence recommendations but cannot rewrite facts.

## Model Interface Boundary

- `AGENTS.md` carries a short, versioned Rekon bootstrap, not dynamic repo data.
- MCP is the model-native context interface. Its package is read-only; the CLI
  host may refresh Rekon-owned artifacts before task-context calls.
- CLI is the universal interface and owns lifecycle and artifact writes.
- Automatic context refresh never writes repository source, executes project
  commands, or calls a model provider.
- MCP and CLI consume the same context compiler and selection rules.
- Post-edit validation uses the same TaskPact and graph contracts. The first
  pass names proof obligations; a final CLI pass can record a satisfied
  `ProofGateReport`. Verification evidence is admitted by exact source-state
  digest equality, not timestamp order. Validation never runs project checks
  or writes source.
- Change-generated verification plans preserve why each command was selected
  and which check or flow-edge obligations it can prove. Flow contracts own
  accepted edge methods and policy. Semantic handoff guarantees still require
  their own verifier method; a passing command does not silently prove them.
- Context refinement is an explicit delta protocol: a model must name the
  unresolved question, anchor, and graph relationship after reading the initial
  packet. Absence remains unresolved rather than authorizing broad search.
- Context responses explain inclusion, exclusion, trust, freshness, and budget.
- A model-facing adapter may format context, but may not independently select or
  reinterpret canonical inputs.

## Extension Boundary

Capabilities are the unit of extension. A capability declares its roles,
inputs, outputs, permissions, invalidation rules, and compatible Rekon version.
The runtime enforces those declarations through the SDK and artifact store.

## Safety Boundary

Rekon separates recommendations, approvals, proof, and source changes. By
default it writes artifacts, not source. Any capability that requests
`write:source`, `execute:commands`, or outbound network access must declare
that permission and be granted it explicitly. A source-writing actuator may
not report completion or refresh accepted knowledge until the resulting source
state has a satisfied proof gate.
