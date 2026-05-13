# @rekon/kernel-artifacts

Pure TypeScript contracts and helpers for Rekon artifacts.

This package owns the universal artifact surface used by every Rekon producer and consumer:

- `ArtifactRef`
- `ArtifactHeader`
- `JsonArtifact`
- validation and parsing helpers
- deterministic JSON digest helpers

## Contract

Every generated Rekon artifact must include:

- artifact type and id
- schema version
- generation timestamp
- subject repository metadata
- producer id and version
- input artifact refs
- optional freshness and provenance metadata

This package has no filesystem dependency. Artifact storage belongs in `@rekon/runtime`.
