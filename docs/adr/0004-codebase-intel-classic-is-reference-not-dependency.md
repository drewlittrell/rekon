# ADR 0004: codebase-intel-classic Is Reference, Not Dependency

## Status

Accepted

## Context

The existing codebase-intel implementation is a useful source of behavior, fixtures, and migration ideas, but it is too entangled to become the public Rekon substrate directly.

## Decision

Rekon must not import from the old codebase-intel repository. The old project may be used only as `codebase-intel-classic`: a reference implementation, fixture corpus, dogfood target, and migration source.

## Consequences

- No package dependency or source import may point at the old repository.
- Migration work must cross through public Rekon contracts.
- Dogfood fixtures may reference classic paths without making classic code a dependency.
