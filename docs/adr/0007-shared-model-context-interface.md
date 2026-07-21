# ADR 0007: Shared Model Context Interface

## Status

Accepted.

## Context

Task context is currently assembled by CLI orchestration while MCP exposes a
smaller, independently implemented read surface. Separate selection logic would
produce inconsistent answers and make model behavior depend on the adapter.

## Decision

CLI and MCP consume one shared context compiler. The compiler accepts a task,
paths, and context budget, then returns a typed packet containing core context,
supporting context, constraints, verification hints, warnings, evidence refs,
and a selection trace.

The MCP package remains local, read-only, network-free, and command-free. The
CLI-hosted server may refresh Rekon-owned artifacts before compilation when
source evidence is stale. It does not write repository source or run project
commands. CLI may also persist a compiled packet as a typed artifact. Neither
adapter may maintain its own context ranking policy.

## Consequences

- Context quality can be evaluated independently of transport.
- MCP and CLI parity becomes contract-testable.
- Context budgets prevent a repository index from becoming an indiscriminate
  prompt dump.
- Selection changes become public behavior and require tests and changelog
  coverage.
