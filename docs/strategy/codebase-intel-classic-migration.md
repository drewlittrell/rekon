# Migration From codebase-intel-classic

`codebase-intel-classic` is Rekon's reference implementation, capability
mine, dogfood target, and migration source. It is not a Rekon dependency.

Rekon packages must not import from the classic repo, reuse private service
internals through path aliases, or copy private symbols. The classic repo is
useful precisely because it shows what the substrate should be able to do
once the new artifact, capability, and lifecycle contracts exist.

This document complements the existing
[capability migration backlog](../migration/capability-backlog.md). It
captures the durable mapping and porting criteria. The backlog tracks
priority and status.

## Migration Mapping

| Classic Concept | Rekon Role | Notes |
| --- | --- | --- |
| JS/TS analysis services | evidence-provider, projector | Extract deterministic facts first, then derive models. |
| Graph producers | projector | Emit `GraphSlice` artifacts with declared node/edge kinds. |
| Rule evaluators | evaluator | Convert rules into rulebook entries and `Finding` outputs. |
| Context resolver | resolver | Build `ResolverPacket` artifacts with `resolutionTrace`. |
| Docs generation | publisher | Emit `Publication` artifacts; docs are not canonical truth. |
| Memory | learner / resolver enrichment | Emit `MemoryEvent` and `MemorySelection`; never overwrite ownership/rules. |
| Intent | actuator / governor | Emit `WorkOrder`, `VerificationPlan`, and `IntentMap` artifacts. |
| Reconciliation | actuator | Emit `ReconciliationPlan` and `ReconciliationLog`; source writes require explicit permission. |
| Watcher | runtime lifecycle / freshness engine | Future hardening batch. |
| GitHub app and dashboard | future surfaces | Post-alpha publication surfaces. |

## Porting Criteria

Before porting a classic feature into Rekon, the new capability must:

1. Declare `consumes` and `produces` artifact types explicitly.
2. Use the artifact schema for every output (`ArtifactHeader` with
   producer, schema version, input refs, freshness, provenance).
3. Declare freshness / invalidation expectations so future runtimes can
   stale-check.
4. Request the smallest permission set (`read:source`, `read:artifacts`,
   `write:artifacts` for most; `write:source` / `execute:commands` /
   `network:outbound` only with explicit justification).
5. Maintain provenance from every derived fact back to the inputs that
   produced it.
6. Pass `validateCapability()` and `assertCapabilityConforms()` in tests.

A port that cannot meet these criteria should be reshaped before it lands,
not smuggled into Rekon as a private internal.

## Dogfood Strategy

- Dogfood the classic repo as a large real codebase using the local
  runtime.
- Tests gated on `REKON_DOGFOOD_CLASSIC_ROOT` run the alpha lifecycle and
  validate that evidence, projections, graph slices, findings, and resolver
  packets stay coherent.
- Dogfood does **not** require semantic parity with every classic artifact.
  The goal is to confirm Rekon stays useful on a real, complex codebase.

## What Not To Do

- **Do not import** from `codebase-intel-classic`. Not at runtime, not in
  tests, not in scripts.
- **Do not use** `.codebase-intel` paths or `CODEBASE_INTEL_*` environment
  variables anywhere in Rekon outputs.
- **Do not copy** private classes verbatim. Reshape them into capabilities,
  artifacts, and contracts.
- **Do not treat** docs or memory as canonical truth carried over from the
  classic repo. Publications must be regenerable from artifacts.
- **Do not bundle** classic behavior into a single mega-port. Migrate in
  small, role-shaped batches with conformance tests.

## When To Update This Document

Update this document when:

- The capability migration backlog moves a high-priority item to "done".
- A classic concept maps to a different Rekon role than originally listed.
- The porting criteria evolve (e.g., new permission, new artifact
  contract).
- A planned future surface (watcher, GitHub app, dashboard) starts shipping
  and replaces the classic equivalent.

Older context lives in
[docs/migration/from-codebase-intel-classic.md](../migration/from-codebase-intel-classic.md)
and [docs/migration/capability-backlog.md](../migration/capability-backlog.md).
This document is the durable mapping; those documents track day-to-day
migration status.
