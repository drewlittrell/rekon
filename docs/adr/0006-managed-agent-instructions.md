# ADR 0006: Managed Agent Instructions

## Status

Accepted.

## Context

Models will not reliably use Rekon merely because `.rekon/` exists. A managed
repository needs durable instructions at the standard agent entry point, but
Rekon must not replace repository-specific guidance or embed volatile snapshot
data in source control.

## Decision

Rekon installs a short, versioned block in the repository's root `AGENTS.md`.
The block explains when and how to request Rekon context through MCP, with CLI
fallbacks. Rekon owns only content between explicit markers. Synchronization is
deterministic and preserves all bytes outside that block.

Dynamic ownership, findings, memory, pacts, and verification state remain in
typed artifacts. The managed block points to those interfaces rather than
copying the current state into `AGENTS.md`.

Whole-file replacement of protected instruction files is not the supported
installation path.

## Consequences

- `rekon setup` and `rekon init` can make the context interface discoverable
  immediately; `rekon refresh` keeps it current unless configured for manual
  sync.
- Instruction updates do not erase project-specific guidance.
- Malformed or duplicated markers must fail closed.
- Managed-block writes require root containment and symlink-safe handling.
