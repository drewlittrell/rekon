# @rekon/capability-model

Built-in Rekon model projector.

## Stability

Experimental alpha.

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

## Import Boundary

The capability is deterministic and uses the same public SDK as community capabilities.
Do not import projection internals from runtime or other capabilities.
