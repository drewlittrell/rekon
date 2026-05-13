# @rekon/capability-docs

Built-in Rekon publisher for generated documentation artifacts.

The package uses the public `@rekon/sdk` publisher API. It consumes an
`IntelligenceSnapshot` and optional resolver packets, then writes `Publication`
artifacts that contain markdown content and metadata.

Docs are publications, not canonical truth. They summarize current typed
artifacts and include snapshot id, generated time, input refs, freshness, and
provenance.
