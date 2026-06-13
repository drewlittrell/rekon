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
