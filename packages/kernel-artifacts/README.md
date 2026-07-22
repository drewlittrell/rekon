# @rekon/kernel-artifacts

Pure TypeScript contracts and helpers for Rekon artifacts.

## Stability

Label: `experimental, public`.

The artifact header and ref contracts are the most conservative public API in
Rekon and are scheduled to move toward `stable` first. Symbols not re-exported
from the package root are `internal`. See
[docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

This package owns the universal artifact surface used by every Rekon producer
and consumer:

- `ArtifactRef`
- `ArtifactHeader`
- `ArtifactInvalidationBaseline`
- `ArtifactSupersessionIdentity`
- `SourceState` and `SourceStateBinding`
- `JsonArtifact`
- validation and parsing helpers
- deterministic JSON digest helpers

## Lifecycle Fit

Every lifecycle phase emits or consumes artifacts. `@rekon/kernel-artifacts`
defines the shared header, ref, producer, freshness, and provenance shape that
lets those phases compose.

## Public Surface

Every generated Rekon artifact must include:

- artifact type and id
- schema version
- generation timestamp
- subject repository metadata
- producer id and version
- input artifact refs
- optional freshness, invalidation, supersession, and provenance metadata

`SourceStateBinding` identifies the exact bytes for a bounded set of
repository-relative paths against an immutable base ref. Its deterministic
digest lets verification and proof-gate consumers compare source state without
using timestamps as evidence.

## Import Boundary

Import artifact types and helpers from this package root. Do not import runtime
artifact-store code from here; filesystem storage belongs in `@rekon/runtime`.
