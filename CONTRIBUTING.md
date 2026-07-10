# Contributing

Rekon is a public codebase intelligence project. Contributions should keep the
repository easy to understand, easy to run, and careful about public contracts.

Before changing public APIs, artifact shapes, lifecycle behavior, or capability
contracts, read:

- [North Star](docs/strategy/north-star.md)
- [System model](docs/strategy/rekon-system-model.md)
- [Capability model](docs/strategy/capability-model.md)
- [Roadmap](docs/strategy/roadmap.md)

## Setup

Use Node `^20.12 || ^22 || ^24`.

```sh
npm install
npm run build
node packages/cli/dist/index.js --help
```

## Checks

```sh
npm run typecheck
npm run test
npm run build
git diff --check
```

Run `npm run lint` when linting is configured.

## Ground Rules

- Use Rekon naming consistently: `Rekon`, `rekon`, `.rekon/`, `REKON_`, and
  `@rekon/*`.
- Do not import from private reference repositories or generated workspaces.
- Do not leak private workspace paths or environment names into Rekon outputs.
- Built-in capabilities must use `@rekon/sdk`.
- Generated artifacts must include schema version, producer metadata, input
  refs, freshness, and provenance.
- Capabilities must declare consumes, produces, permissions, invalidation
  rules, and compatibility.
- Kernel packages should remain pure TypeScript with no side effects.

## Public API Changes

Treat package exports, artifact contracts, CLI commands, examples, and docs as
public surfaces. If a change affects one of them:

- update the relevant README or docs;
- add or update behavior tests;
- record the change in `CHANGELOG.md`;
- avoid hiding breaking changes in implementation-only code.

## Authoring Capabilities

Start with [authoring capabilities](docs/extensions/authoring-capabilities.md)
and [the custom capability example](examples/custom-capability/README.md).

A capability should export a `defineCapability(...)` result from `@rekon/sdk`,
declare its manifest completely, register every new artifact type it produces,
write artifacts with valid headers, and pass the SDK conformance helpers in
tests.

## Security

Capabilities are executable code. Review manifests and permissions before
loading external packages.

`write:source`, `execute:commands`, and `network:outbound` are sensitive
permissions. They should be requested only when the capability genuinely needs
them and granted only deliberately.

Report security issues using [SECURITY.md](SECURITY.md).
