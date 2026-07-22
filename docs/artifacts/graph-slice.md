# GraphSlice

`GraphSlice` represents a typed graph projection over repository evidence, such
as imports, symbols, ownership, or runtime relationships.

## Produced By

- graph projector capabilities

## Consumed By

- resolvers
- publishers
- evaluators that need relationship context

## Common Fields

- `header`
- `producer`
- `sliceType`: stable graph-family identity, such as `import-graph`
- `nodes`
- `edges`

Graph slices are derived artifacts. Their headers should cite the evidence or
model artifacts used to produce them.

Built-in graph projections cover imports, symbols, ownership, application
conventions, calls, entry reachability, and deterministic behavior signals.
The application slice connects files to route, screen, and test nodes and
packages to lifecycle build targets with evidence-bearing `contains` edges. It
also uses resolved imports to connect test nodes to source dependencies with
`depends_on` edges and to related routes, screens, and capability hints with
`related_to` edges. If runtime instrumentation has produced a
`RuntimeGraphObservationReport`, `observed` edges record the source paths and
routes seen while a test executed.

The call graph includes only local and import-bound calls that syntax can
resolve without receiver-type inference. The reachability graph records roots,
route handlers, and resolved import distance. It bounds non-test roots to 100
transitive imports and delegates test dependency context to the application
graph. Entry-node `metadata.reachabilityProjection` and header provenance make
truncation explicit, while `header.inputRefs` cites the complete import graph.
The behavior graph records
literal events, directly imported state-SDK calls, successful stdout calls, and
explicit throws. CLI roots connect to module-scope execution; stdout calls
produce source-scoped `cli_output` nodes. Entry metadata distinguishes product,
tooling, test, and unknown executables. Literal product command branches become
`command` nodes and connect to stdout only when branch-local calls reach a
deterministic stdout producer. Tooling and test roots remain graph context and
are not product-flow starts. These edges explain impact; they do not alter
severity or prove output correctness by themselves.

`related_to` and `observed` are context, not assertion coverage. Rekon does not
emit a `covers` edge from imports, shared dependencies, or execution alone.
Application context is intentionally bounded per test. Its test nodes expose
`metadata.contextProjection` counts and a `truncated` flag, while the slice
header cites the complete import graph used to derive those contextual edges.
