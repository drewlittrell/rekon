# Stability Labels

Rekon uses lightweight stability labels so contributors know what is safe to
depend on. The labels apply to public package exports, artifact shapes, CLI
commands, and documented contracts.

## Labels

- `stable`. Changes follow semver. The contract is intentionally
  conservative. Consumers may rely on this surface.
- `experimental`. Public and supported in the current alpha, but the shape
  may change before a stable release. Pin to an exact version when relying
  on experimental surfaces.
- `internal`. Package-private. Not part of the public contract. External
  consumers should not import it.
- `deprecated`. Scheduled for removal. Consumers should migrate away.

A surface may also carry a scope tag:

- `public`. Exported from a package and intended for consumers.
- `internal`. Used only inside the package.

The most common alpha label is `experimental, public`.

## Alpha Defaults

For the `0.1.0-alpha.x` line:

- Kernel artifact contracts (`@rekon/kernel-artifacts`): `experimental, public`.
  The artifact header and ref shapes are the most conservative public API and
  evolve toward `stable` first.
- Other kernel contracts (`@rekon/kernel-evidence`,
  `@rekon/kernel-snapshot`, `@rekon/kernel-graph`,
  `@rekon/kernel-repo-model`, `@rekon/kernel-rulebook`,
  `@rekon/kernel-findings`): `experimental, public`.
- SDK manifest, registry, validation, and conformance helpers
  (`@rekon/sdk`): `experimental, public`.
- Runtime local artifact store and lifecycle APIs (`@rekon/runtime`):
  `experimental, public`.
- CLI commands (`@rekon/cli`): `experimental, public`.
- Built-in capability default exports (`@rekon/capability-*`):
  `experimental, public`.
- Capability internals not re-exported from the default entry: `internal`.

## Where Labels Live

- Every package README has a `## Stability` section that uses these labels.
- Documentation pages may mention stability inline when a feature is
  experimental or internal.
- Source files do not need per-symbol labels in the alpha; the package
  README is the source of truth.

## When Labels Change

Labels move conservatively. Examples:

- `experimental` to `stable`: requires public API tests covering the
  surface, a stable contract for at least one release, and an entry in
  `CHANGELOG.md`.
- `experimental` to `deprecated`: requires a migration note in the package
  README, a `CHANGELOG.md` entry, and removal scheduled for a later release.
- `internal` to `public`: requires a README update, a public test, and a
  changelog entry.

If a planned change would break a `stable` surface, stop and re-plan. The
NorthStar (see [docs/strategy/north-star.md](../strategy/north-star.md))
constrains how aggressively public surfaces may change.
