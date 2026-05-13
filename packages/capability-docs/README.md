# @rekon/capability-docs

Built-in Rekon publisher for generated documentation artifacts.

## Stability

Label: `experimental, public`.

The default capability export is the public surface. Publication template
internals are `internal`. See
[docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

The package uses the public `@rekon/sdk` publisher API. It consumes an
`IntelligenceSnapshot` and optional resolver packets, then writes `Publication`
artifacts that contain markdown content and metadata.

## Lifecycle Fit

Runs during `Publish`, creating durable docs from typed artifacts.

## Public Surface

The default export is a Rekon capability definition with publisher handlers.

## Import Boundary

Docs are publications, not canonical truth. They summarize current typed
artifacts and include snapshot id, generated time, input refs, freshness, and
provenance.
