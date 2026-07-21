# `@rekon/mcp`

Local, read-only MCP context server for Rekon.

`rekon mcp serve` exposes repository context over stdio. The server reads
existing artifacts and returns trust-classed context; it does not write files,
execute commands, or access the network.

Every tool advertises MCP read-only, non-destructive, idempotent, and
closed-world annotations so non-interactive clients can enforce that boundary
from protocol metadata.

## Tools

- `context_for_task`: budgeted core and supporting context for a concrete task,
  with compact read-first routing, trust labels, source freshness, constraints,
  checks, and warnings. Path-matched `CapabilityContract` rules are served as
  declared guidance.
- `resolve_source_target`: a bounded unread context delta for one exact symbol,
  type, or call named by inspected source, using a `dependency`, `dependent`,
  `test`, `contract`, `consumer`, `producer`, or `implementation` relationship.

The server still accepts the earlier `orientation`, `where_does_this_belong`,
`preflight_change`, and `refine_task_context` names for compatibility. They are
not advertised in `tools/list`; operator-oriented orientation, placement, and
preflight remain available through the CLI.

## Agent Usage

Configure the local server with:

```sh
rekon mcp serve --root .
```

When the MCP tools are available to an agent:

1. Call `context_for_task` first with the concrete task and known paths. Start
   with the `compact` profile, then read every returned `readFirst` path before
   planning or editing.
2. Read exact repository paths directly. When inspected source names a
   task-required symbol, type, or call whose target path is absent from
   `readFirst` and `boundaryPaths`, call `resolve_source_target` with that exact
   target, the question, closest anchor, relationship, and paths already read.
   Read every returned `readNext` path. Use deterministic resolution before
   broad or text search for that target; search is a fallback when resolution
   is unresolved or stale. Resolve again only for a new task-required symbolic
   target. Do not use it for completeness checks or turn an unresolved response
   into broad search.
3. Treat returned pact constraints and required checks as acceptance criteria.
   Respect the trust class and freshness attached to returned values.
4. Treat unavailable or stale responses as missing evidence. Do not expand
   context merely because another repository relationship may exist.

MCP never refreshes artifacts or calls a model provider. If MCP is unavailable,
use `rekon context task --model-context`, `rekon resolve preflight`, and `rekon
artifacts freshness`. Those commands consume the same compiler and artifact
store.

The CLI equivalent for refinement is `rekon context refine`. Both surfaces use
the same pure relationship selector, exclude `--already-read` paths, cap new
paths at eight, and report an explicit unresolved result rather than falling
back to broad search.

`context_for_task` returns the compact model-delivery projection. The CLI JSON
and stored `TaskContextReport` retain evidence refs, budget internals,
boundaries, and selection trace for audit and debugging.

The delivery separates `readFirst` implementation evidence from actionable
`boundaryPaths` compatibility context. Inspect `readFirst` before planning.
Preserve boundary files and inspect them only when a named dependency remains
unresolved. Detailed routing reasons, capability metadata, provenance, and
selection diagnostics remain in the full CLI JSON and stored report.

The production delivery policy is `full`. Evaluators may set
`REKON_EXPERIMENTAL_CONTEXT_DELIVERY_POLICY=role-aware` to keep required routes
in `readFirst` while moving conditional dependency and compatibility routes to
`supportingContext` with a route role and necessity reason. This policy has a
deterministic selection gate. An independent Sol/xhigh canary preserved
correctness but read every conditional route and used more tokens than `full`,
so managed repository instructions must not enable it by default. A second
canary with oracle-confirmed optional routes also produced no skipping under
role-aware delivery and added token and command overhead.

Evaluators may also set the policy to `summary-aware`. It replaces deterministic
conditional file entries with tagged, pathless `routeSummaries` carrying a
route count, a `condition-not-triggered` decision, and an `inspectWhen`
condition. Two Sol/xhigh trials preserved quality but reduced no source reads;
required source exposed the omitted imports and the model inspected them
anyway. The policy remains evaluation-only and non-default.
Exact fresh capability contracts produced the same result for relative and
symbolic imports. MCP context reduced unrelated navigation in the symbolic
case, but did not replace implementation inspection and added token overhead.

Evaluators may set `navigation-only` to retain required paths, normative
constraints, checks, and inference-only support while omitting conditional
paths and route summaries. A three-pair Sol/xhigh probe produced a smaller MCP
payload and narrower repository exposure, but the model still inspected the
omitted dependency and total token use increased. This policy is also
evaluation-only and non-default.

## Boundary

Every response marks the trust class of served values. The server is a context
surface, not an executor.

## Stability

Label: `experimental, public`.
