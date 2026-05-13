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

## Import Boundary

Do not treat work orders as source mutations. They are typed action artifacts
that downstream operators can inspect and execute separately.
