# Intelligence Snapshot

The `IntelligenceSnapshot` indexes the current Rekon view of a repository.

It groups artifact refs by category:

- inputs
- projections
- evaluations
- publications
- actions

Resolvers and publishers consume the snapshot so they can use a shared view of
the repository rather than rediscovering inputs independently.
