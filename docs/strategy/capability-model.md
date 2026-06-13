# Capability Model

A capability is a pluggable unit of repository intelligence. Built-in and
community capabilities use the same public SDK.

## Roles

- `evidence-provider`: reads source or configuration and emits evidence facts.
- `projector`: derives models such as `ObservedRepo`, `OwnershipMap`,
  `CapabilityMap`, and graph slices.
- `evaluator`: applies rules and emits findings.
- `resolver`: answers task-specific questions from snapshots and artifacts.
- `publisher`: produces generated docs, summaries, and agent guidance.
- `learner`: records feedback and selects relevant memory.
- `actuator`: prepares work, verification, reconciliation, or other action
  artifacts.

## Manifest Contract

A capability must declare:

- `roles`
- `consumes`
- `produces`
- `permissions`
- `invalidatedBy`
- `compatibility`

Handlers must match declared roles. Produced artifacts must match declared
artifact types and include valid headers with schema version, producer,
subject, input refs, freshness, and provenance.

## Permissions

Capabilities should request the smallest permission set they need. Artifact
reads and writes are common. Source writes, command execution, and outbound
network access are sensitive and must be explicit.

## Community Extensions

Community packages can register artifact types and handlers through
`defineCapability()` and the in-memory registry exposed by `@rekon/sdk`.
Conformance helpers let capability authors validate manifest and handler shape
without reading runtime internals.
