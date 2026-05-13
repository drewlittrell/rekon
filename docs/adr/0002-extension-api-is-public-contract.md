# ADR 0002: Extension API Is Public Contract

## Status

Accepted

## Context

Rekon depends on community and built-in capabilities consuming shared repository intelligence through stable contracts.

## Decision

The extension API exposed by `@rekon/sdk` is a public contract. Capability manifests, permissions, produced artifacts, consumed artifacts, and invalidation rules are part of that contract.

## Consequences

- SDK changes require tests, docs, and changelog entries.
- Compatibility metadata is required for capabilities.
- Runtime internals cannot be the only way to author a useful capability.
