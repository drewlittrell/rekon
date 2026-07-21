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
7. Validate the resulting diff against task scope and repository law.
8. Record verification and reconciliation outcomes back into artifacts.

After selected checks pass, one changed-file refresh advances the maintained
repository model. Existing adopted contracts are reconciled after projection;
missing contracts remain an explicit bootstrap decision.

Models enter this loop through a stable bootstrap in `AGENTS.md`. The bootstrap
directs them to a shared context compiler exposed through MCP and CLI. The
compiler selects current repository law, ownership, graph context, scoped
memory, governed assessments, and required checks under an explicit context
budget.

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
- Post-edit validation uses the same TaskPact and graph contracts, reads Git and
  current source through the CLI host, and neither writes an artifact nor runs
  project checks.
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
that permission and be granted it explicitly.
