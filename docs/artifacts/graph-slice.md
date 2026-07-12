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
- `nodes`
- `edges`

Graph slices are derived artifacts. Their headers should cite the evidence or
model artifacts used to produce them.

Built-in slices cover imports, symbols, ownership, and application conventions.
The application slice connects files to route, screen, and test nodes and
packages to lifecycle build targets with evidence-bearing `contains` edges. It
also uses resolved imports to connect test nodes to source dependencies with
`depends_on` edges and to related routes, screens, and capability hints with
`related_to` edges. If runtime instrumentation has produced a
`RuntimeGraphObservationReport`, `observed` edges record the source paths and
routes seen while a test executed.

`related_to` and `observed` are context, not assertion coverage. Rekon does not
emit a `covers` edge from imports, shared dependencies, or execution alone.
