# @rekon/capability-memory

Built-in Rekon memory capability.

## Stability

Label: `experimental, public`.

The default capability export and memory artifact shapes are the public
surface. Selection internals are `internal`. See
[docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

The package uses the public `@rekon/sdk` learner API. It writes typed
`OperatorFeedbackEntry`, `MemoryEvent`, and `MemorySelection` artifacts.

## Lifecycle Fit

Runs during `Learn`. Resolver packets can include selected memory as guidance.

## Public Surface

The default export is a Rekon capability definition with learner handlers.

## Import Boundary

Memory selections can enrich resolver packets, but memory does not rewrite
ownership, rules, findings, or other architecture facts.
