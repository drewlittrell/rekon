# AGENTS

This repository is Rekon.

Treat public APIs, package boundaries, docs, examples, and generated artifacts
as product surfaces.

Before changing architecture, public API, capability contracts, or artifact
shapes, read:

- [docs/strategy/north-star.md](docs/strategy/north-star.md)
- [docs/strategy/rekon-system-model.md](docs/strategy/rekon-system-model.md)
- [docs/strategy/roadmap.md](docs/strategy/roadmap.md)

## Rules

1. Identify the package boundary being changed.
2. State whether the change affects public API.
3. Add or update tests for public behavior.
4. Do not import from private reference repositories or generated workspaces.
   External reference repos may be used only as data or fixtures, never as
   runtime dependencies.
5. Built-in capabilities must use `@rekon/sdk`.
6. Generated artifacts must include schema version, producer, input refs, and
   provenance.
7. Capabilities must declare consumes, produces, permissions, and invalidation
   rules.
8. Keep kernel packages pure and side-effect free.
9. Update docs and `CHANGELOG.md` for user-facing changes.
10. End every implementation task with verification evidence.
11. Rekon must install and maintain a bounded, Rekon-owned instruction block in
    the `AGENTS.md` of repositories it manages. Model-facing CLI commands, MCP
    tools, generated instructions, and conformance tests must stay synchronized.

## Naming

- Product/system: Rekon
- CLI: `rekon`
- Workspace directory: `.rekon/`
- Environment prefix: `REKON_`
- Package scope: `@rekon/*`

## Checks

Run these before completing a change:

```sh
npm run typecheck
npm run test
npm run build
git diff --check
```

Run `npm run lint` when linting is configured.

## Process

During solo maintainer work, direct commits to `main` are acceptable after the
required checks pass. Use branches and PRs when external contributors,
published packages, release candidates, risky source-writing work, or breaking
public API changes require review.

## Completion Summary

Use this shape:

- CHANGES MADE
- PUBLIC API CHANGES
- TESTS / VERIFICATION
- INTENTIONALLY UNTOUCHED
- RISKS / FOLLOW-UP
- NEXT STEP

<!-- rekon:agent-instructions:start version="2.0.6" -->
## Rekon

This repository uses Rekon for context and change governance.
Before the first repository command, search, read, or edit, use Rekon MCP when available. Do not probe for the CLI first.
After context compaction or restart, and whenever the task goal or path scope changes, request fresh task context before continuing.

When Rekon MCP tools are available:

1. Call `context_for_task` at task start, after compaction, or when scope changes; keep its `contextUsageRef` and batch-read every `readFirst` path before editing.
2. Use `resolve_source_target` only for an exact task-required symbol named by inspected source and absent from `readFirst` and `boundaryPaths`. Read every `readNext` path. Never use it for completeness or analogues; unresolved does not permit broad search.
3. When required, create the returned work order before editing. Treat pact constraints and checks as acceptance criteria; unresolved ownership is not permission.
4. After editing, call `validate_change` with the retained ref, task, paths, base ref, and `contextClaims`. Use `applied` only for context that shaped the change; claims route proof but are not proof. Judge only generic `model-judgment` obligations. Stage placement requires an independently signed, source-bound `PlacementVerificationReport`; do not create or sign it. Stop for the host verifier. Prepare checks with CLI `--prepare-verification`; repair from `correctiveContext` before `escalation: validation-failed`.
5. Validate again with explicit VerificationResult refs, required independent placement reports, runtime observations, and remaining judgments. Completion requires `proofGate.status: satisfied`; failed/stale/skipped/self-authored/unbound evidence is not proof.
6. Record the satisfied gate, then run `rekon refresh --proof-gate <ProofGateReport:id> --json` without skip flags; it refreshes knowledge and rechecks gated source bytes. Any digest, gate, refresh, or contract-drift failure is incomplete.

MCP is local and source-safe: it never writes source, runs checks, uses network, or calls models. The CLI host may refresh `.rekon/` for `context_for_task` and read Git/source for `validate_change`. Host: `rekon mcp serve --root .`.

Use the CLI only when Rekon MCP is absent or fails:

- `rekon context task --task "<task>" --path <path> --model-context`
- `rekon context refine --question "<unresolved question>" --target <source-identifier> --relationship dependency|dependent|test|contract|consumer|producer|implementation --anchor-path <path> --already-read <path> --model-context`
- `rekon context validate-change --task "<task>" --changed-path <path> --base-ref HEAD --context-usage <ContextUsageEvent:id> --context-claims-json '<json-map>' [--prepare-verification|--verification-result <ref> --placement-verification <PlacementVerificationReport:ref> --judgment-json '<json>' --record-proof] --json`
- `rekon resolve preflight --path <path> --goal "<goal>" --json`
- `rekon artifacts freshness --json`

If task context reports missing or drifted repository law, run `rekon contracts maintain --root . --json`, inspect the cited source, and complete its judgment step yourself. Apply contract sources only when the configured adoption policy permits it.

If context is stale and artifact writes are allowed, run `rekon refresh --root . --json`; context is evidence, checks are proof.

Rekon manages this block; keep repository-specific instructions outside it.
<!-- rekon:agent-instructions:end -->
