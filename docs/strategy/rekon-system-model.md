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
7. Record verification and reconciliation outcomes back into artifacts.

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

## Extension Boundary

Capabilities are the unit of extension. A capability declares its roles,
inputs, outputs, permissions, invalidation rules, and compatible Rekon version.
The runtime enforces those declarations through the SDK and artifact store.

## Safety Boundary

Rekon separates recommendations, approvals, proof, and source changes. By
default it writes artifacts, not source. Any capability that requests
`write:source`, `execute:commands`, or outbound network access must declare
that permission and be granted it explicitly.
