# @rekon/kernel-graph

Pure graph contracts for Rekon graph slices.

## Stability

Label: `experimental, public`.

Node and edge kinds are intentionally extensible. Symbols not re-exported from
the package root are `internal`. See
[docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

The package defines community-extensible node and edge kinds, built-in kind
constants, validation helpers, and composition helpers. Graph slices are
ordinary Rekon artifacts and must carry artifact headers with provenance and
input refs.

## Lifecycle Fit

Graph slices are projection artifacts produced during `Project` and consumed by
resolvers, evaluators, publishers, and future analysis capabilities.

## Public Surface

- `GraphNode`
- `GraphEdge`
- `GraphSlice`
- built-in node and edge kind constants
- graph slice validation and composition helpers

The built-in vocabulary includes `capability` nodes, `depends_on` and
`related_to` edges for static test context, and `observed` edges for explicit
runtime observations. It also includes callable, command, and entry-point nodes plus
`calls`, `enters`, `reaches`, `handles`, `emits`, `subscribes`, `accesses`, and
`propagates_error` edges. `cli_output` nodes and `produces` edges represent
AST-observed successful standard output without claiming that the output is
correct. Command nodes represent code-backed CLI dispatch operations, not help
text or repository scripts merely marked executable. The vocabulary
intentionally does not define a `covers` edge:
neither static relationships nor observed execution prove assertion coverage.

## Import Boundary

Import graph contracts from this package root. Do not place graph extraction or
repository traversal logic here; graph producers belong in capabilities such as
`@rekon/capability-graph`.
