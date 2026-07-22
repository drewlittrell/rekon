# @rekon/capability-graph

Built-in Rekon graph projector.

## Stability

Label: `experimental, public`.

The default capability export is the public surface. Graph producer internals
are `internal`. See [docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

The capability uses the public `@rekon/sdk` projector API. It consumes an
`EvidenceGraph` and produces `GraphSlice` artifacts for imports, symbols,
ownership, application conventions, calls, entry reachability, and narrow
behavior signals. The application graph includes
routes, screens, tests, packages, and lifecycle build targets. The
import slice connects resolved repository file paths rather than retaining raw
module specifiers. The
implementation also connects tests to resolved import dependencies and to
routes, screens, and capability hints that share those dependencies. These are
static context relationships. To keep the projection bounded on large test
suites, each test retains its nearest 100 reachable files, up to 25 related
entry points, and up to 25 related capabilities. Test-node metadata reports the
unbounded count and whether context was truncated; the complete structure stays
in the referenced import graph. When a `RuntimeGraphObservationReport` is
available, the application slice also includes separate `observed` edges for
instrumented test-to-file and test-to-route execution. None of these edges
claims assertion coverage.

The call graph contains only resolved local or import-bound calls. The
reachability graph records manifest and convention roots, route handlers, and
resolved import distance. Non-test roots retain at most 100 transitive imports;
test roots retain their entry relationship and delegate dependency context to
the bounded application graph. Entry metadata and header provenance report
truncation, and the slice cites the complete import graph instead of copying
path evidence into every reachability edge. CLI roots also connect to their
module-scope callable because loading the executable deterministically runs
that scope. The behavior graph records literal event flow, directly imported
state-SDK access, successful stdout calls, and explicit throw/rethrow syntax.
Stdout becomes a `cli_output` node through a `produces` edge; it is an observed
boundary, not proof that the response is correct.

## Lifecycle Fit

Runs during `Project`. Graph slices enrich resolver and publisher behavior
without becoming canonical lower-layer truth.

## Public Surface

The default export is a Rekon capability definition with projector handlers.

## Import Boundary

Import graph contracts from `@rekon/kernel-graph`. Do not import graph producer
internals from this package.
