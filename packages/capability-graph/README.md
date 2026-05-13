# @rekon/capability-graph

Built-in Rekon graph projector.

## Stability

Experimental alpha.

## Purpose

The capability uses the public `@rekon/sdk` projector API. It consumes an
`EvidenceGraph` and produces initial `GraphSlice` artifacts for imports,
symbols, and ownership. The implementation is deterministic and deliberately
small; richer graph slices can be added without changing the runtime.

## Lifecycle Fit

Runs during `Project`. Graph slices enrich resolver and publisher behavior
without becoming canonical lower-layer truth.

## Public Surface

The default export is a Rekon capability definition with projector handlers.

## Import Boundary

Import graph contracts from `@rekon/kernel-graph`. Do not import graph producer
internals from this package.
