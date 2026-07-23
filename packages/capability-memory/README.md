# @rekon/capability-memory

Built-in Rekon memory capability.

## Stability

Label: `experimental, public`.

The default capability export and memory artifact shapes are the public
surface. Selection internals are `internal`. See
[docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

The package uses the public `@rekon/sdk` learner API. It writes typed feedback,
selection, usage, grounded outcome evaluation, and curation artifacts.

## Lifecycle Fit

Runs during `Learn`. Refresh curates recorded context outcomes. Task context
may try one matching, unobserved entry once; only task-scoped suggestive or
corroborated memory repeats. An item becomes eligible for either status only
when a validation receipt marks it applied and independent outcome proof is
linked.

## Public Surface

The default export is a Rekon capability definition with learner handlers.
`buildGroundedContextOutcomeEvaluation()`, `selectGroundedMemoryForTask()`, and
`readGroundedMemoryForTask()` expose the same bounded policy to hosts.

## Import Boundary

Memory can enrich task context and resolver packets, but it does not rewrite
ownership, rules, findings, contracts, or other architecture facts. Delivery
and self-report alone cannot reinforce or refute an entry.
