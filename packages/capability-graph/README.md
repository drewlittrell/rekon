# @rekon/capability-graph

Built-in Rekon graph projector.

The capability uses the public `@rekon/sdk` projector API. It consumes an
`EvidenceGraph` and produces initial `GraphSlice` artifacts for imports,
symbols, and ownership. The implementation is deterministic and deliberately
small; richer graph slices can be added without changing the runtime.
