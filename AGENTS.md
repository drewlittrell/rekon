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
