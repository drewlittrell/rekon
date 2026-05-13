# Contributing

Rekon is open-source from the first commit. Contributions should preserve public package boundaries and treat API, docs, examples, and generated artifacts as product surfaces.

Before working on public API, capability shape, artifact contracts, or
lifecycle behavior, read [docs/strategy/north-star.md](docs/strategy/north-star.md).
Capability authors should also read [docs/strategy/capability-model.md](docs/strategy/capability-model.md).
The [roadmap](docs/strategy/roadmap.md) and the
[codebase-intel-classic migration plan](docs/strategy/codebase-intel-classic-migration.md)
describe sequencing and where the classic reference fits.

## Setup

Use Node `^20.12 || ^22 || ^24`.

```sh
npm install
npm run build
node packages/cli/dist/index.js --help
```

## Local Checks

```sh
npm run typecheck
npm run test
npm run build
git diff --check
```

Run `npm run lint` when linting is configured.

## Ground Rules

- Use Rekon naming consistently: `Rekon`, `rekon`, `.rekon/`, `REKON_`, and `@rekon/*`.
- Do not import from `codebase-intel-classic`.
- Do not use `.codebase-intel` paths or `CODEBASE_INTEL_*` names.
- Built-in capabilities must use `@rekon/sdk`.
- Generated artifacts must include schema version, producer metadata, input refs, and provenance.
- Capabilities must declare consumes, produces, permissions, and invalidation rules.
- Keep kernel packages pure and side-effect free.
- Prefer package-local changes over cross-package shortcuts.

## Authoring Capabilities

Start with [docs/extensions/authoring-capabilities.md](docs/extensions/authoring-capabilities.md)
and [examples/custom-capability](examples/custom-capability).

A capability should:

- export `defineCapability(...)` from `@rekon/sdk`;
- declare roles, consumes, produces, permissions, invalidation rules, and compatibility;
- register every artifact type it produces when the type is not already built in;
- write artifacts with valid headers, producer metadata, input refs, and provenance;
- pass `validateCapability()` or `assertCapabilityConforms()` in tests.

Do not import runtime internals just to define a capability. Capability packages
should depend on `@rekon/sdk` and relevant kernel packages.

## Public API Changes

Treat public package exports, artifact shapes, CLI commands, examples, and docs
as user-facing surfaces. If a change affects one of those surfaces:

- update the package README or relevant docs;
- add or update tests for public behavior;
- record the change in `CHANGELOG.md`;
- avoid hiding breaking changes inside implementation-only commits.

Kernel artifacts and snapshot contracts are especially sensitive because every
capability can consume them.

## Changelog Expectations

Add a concise entry to `CHANGELOG.md` for:

- new public exports;
- artifact shape changes;
- CLI command changes;
- capability manifest or permission changes;
- docs/example changes that affect onboarding or extension authoring.

## Development Flow

During solo alpha development, push directly to `main` after the required checks
pass. Do not create branches unless explicitly requested.

Switch back to branches and PRs when:

- external contributors arrive;
- packages are published;
- users rely on `main`;
- risky source-writing actuator work begins;
- breaking public API changes are planned;
- release candidate work begins.

Keep generated `.rekon/` artifacts out of commits unless the task explicitly
asks for fixtures. Include verification commands and results in the handoff.
Keep unrelated formatting or dependency churn out of the change.

## Security Notes

Capabilities are executable code. Review manifests and permissions before
loading external packages from `.rekon/config.json`.

Default alpha expectations:

- `read:source`, `read:artifacts`, and `write:artifacts` are normal for local analysis.
- `write:source`, `execute:commands`, and `network:outbound` require explicit scrutiny.
- Memory may enrich resolver output, but it must not rewrite ownership, rules, or findings.
- Docs are publications, not canonical truth.

Report security issues using [SECURITY.md](SECURITY.md).

## Codex and Agent Contributions

Agents working in this repo must read `AGENTS.md` first. A good handoff or PR
summary includes:

- changes made;
- public API changes;
- tests and verification;
- intentionally untouched areas;
- risks and follow-up;
- next step.

If a task cannot be completed without changing runtime architecture or public
SDK shape, stop and make the proposed change explicit instead of smuggling it
through docs or examples.
