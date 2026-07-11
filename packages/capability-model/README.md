# @rekon/capability-model

Built-in Rekon model projector.

## Stability

Label: `experimental, public`.

The default capability export is the public surface. Projector internals are
`internal`. See [docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

Consumes `EvidenceGraph` and produces:

- `ObservedRepo`
- `OwnershipMap`
- `CapabilityMap`

## Lifecycle Fit

Runs during `Project`. Resolvers and publishers should prefer these projection
artifacts over re-deriving ownership directly from raw evidence.

## Public Surface

The default export is a Rekon capability definition with a projector handler.
The package also exports the semantic-debt judgment prompt, strict response
schema, and deterministic concern coercion used by the CLI and model evaluator.

## Import Boundary

The capability is deterministic and uses the same public SDK as community capabilities.
Do not import projection internals from runtime or other capabilities.
