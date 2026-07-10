# ADR 0004: Private Reference Repos Are Not Dependencies

## Status

Accepted

## Context

Prior private systems can be useful sources of behavior, fixtures, and migration ideas, but private implementation details must not become part of Rekon's public substrate.

## Decision

Rekon must not import from private reference repositories. Prior systems may be used only as external reference data, fixture corpora, validation targets, or migration sources.

## Consequences

- No package dependency or source import may point at the old repository.
- Migration work must cross through public Rekon contracts.
- Dogfood fixtures may reference classic paths without making classic code a dependency.
