# `@rekon/mcp`

Local, read-only MCP context server for Rekon.

`rekon mcp serve` exposes repository context over stdio. The server reads
existing artifacts and returns trust-classed context; it does not write files,
execute commands, or access the network.

## Tools

- `orientation`: repo identity, scan recency, systems, governance summary, and
  useful pointers.
- `where_does_this_belong`: placement context for a described capability or
  path, with explicit fallback when no declaration covers it.

## Boundary

Every response marks the trust class of served values. The server is a context
surface, not an executor.

## Stability

Label: `experimental, public`.
