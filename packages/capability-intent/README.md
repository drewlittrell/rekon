# @rekon/capability-intent

Built-in Rekon intent and work-order capability.

## Stability

Label: `experimental, public`.

The default capability export and the `IntentMap`, `WorkOrder`, and
`VerificationPlan` artifact shapes are the public surface. Planning internals
are `internal`. See
[docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

The package consumes a `ResolverPacket` and writes `IntentMap`, `WorkOrder`,
and `VerificationPlan` artifacts. It is modeled as an SDK actuator because it
produces action-oriented artifacts, but the initial implementation performs no
source writes and executes no commands.

## Lifecycle Fit

Runs during `Act` as an artifact-producing planning step after `Resolve`.

## Public Surface

The default export is a Rekon capability definition with an actuator handler for
work-order generation.

`VerificationPlanLike` includes optional `VerificationPlanCoverage` metadata
for isolated Node, Vitest, and Jest plans, including source paths the test
intends to exercise. Vitest and Jest plans may name a repository-local runner
config. Execution remains owned by `@rekon/capability-verify`. Plans may pin a
`baseRef` for source-state capture. Executed runs can carry before/after
`SourceStateBinding` values, and derived results retain the exact stable
post-run binding.

Plans created by post-edit validation may also carry `checkSelection`. This
records declared versus evidence-backed origin, covered paths, provenance, and
the check and flow-edge proof obligations associated with each command. The
metadata explains planning; it is not execution proof.

## Import Boundary

Do not treat work orders as source mutations. They are typed action artifacts
that downstream users can inspect and execute separately.
