# @rekon/capability-graph

Built-in Rekon graph projector.

## Stability

Label: `experimental, public`.

The default capability export is the public surface. Graph producer internals
are `internal`. See [docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

The capability uses the public `@rekon/sdk` projector API. It consumes an
`EvidenceGraph` and produces initial `GraphSlice` artifacts for imports,
symbols, ownership, and application conventions. The application slice includes
routes, screens, tests, packages, and lifecycle build targets. The
import slice connects resolved repository file paths rather than retaining raw
module specifiers. The
implementation also connects tests to resolved import dependencies and to
routes, screens, and capability hints that share those dependencies. These are
static context relationships. When a `RuntimeGraphObservationReport` is
available, the application slice also includes separate `observed` edges for
instrumented test-to-file and test-to-route execution. None of these edges
claims assertion coverage.

## Lifecycle Fit

Runs during `Project`. Graph slices enrich resolver and publisher behavior
without becoming canonical lower-layer truth.

## Public Surface

The default export is a Rekon capability definition with projector handlers.

## Import Boundary

Import graph contracts from `@rekon/kernel-graph`. Do not import graph producer
internals from this package.
