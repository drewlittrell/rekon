# npm Publish Plan

This document is the plan for the *eventual* `npm publish` of Rekon
`0.1.0-alpha.1`. It does **not** publish anything. It describes the
pre-publish checks, the dependency-safe publish order, and post-publish
verification.

> **Do not run `npm publish` from automation, scripts, or agents.**
> Publishing requires explicit manual approval from a maintainer with npm
> publish rights on the `@rekon` scope.

## dist-tag Decision

npm requires `--tag` for every prerelease version (any version with a
hyphen, e.g. `0.1.0-alpha.1`). The choice of tag is a public posture
decision, not a workaround.

**Default for `0.1.0-alpha.1`: `--tag alpha`.**

- `--tag alpha` (recommended). Consumers opt in:
  `npm install @rekon/cli@alpha`. The bare `npm install @rekon/cli`
  resolves to nothing until a non-prerelease version exists. This
  communicates "usable, but not the stable default".
- `--tag latest`. Consumers get the alpha with bare
  `npm install @rekon/cli`. Use this only if frictionless discovery
  matters more than stability signaling. Once chosen, downgrading the
  tag later is operationally awkward.

If Drew explicitly approves `latest`, replace every `--tag alpha`
command below with `--tag latest`, and update install docs in
[0.1.0-alpha.1.md](0.1.0-alpha.1.md) and `README.md` to match.

## Scope Assumption

- All public packages live under the `@rekon/*` npm scope.
- First publish of any `@rekon/*` package implicitly creates the scope on
  behalf of the publishing account. The publishing account must be a
  member of (or own) the `@rekon` organization on npm.
- All published packages declare `license: Apache-2.0`.

## Authentication Prerequisite

- Run `npm whoami` and confirm the logged-in user is the intended
  publisher. If `npm whoami` errors with `ENEEDAUTH`, run `npm login`
  interactively before proceeding.
- The publisher must have publish rights on `@rekon/*` (organization
  member with publish role, or the org owner). The `@rekon` scope is
  not yet claimed on npm; the first publish under this scope will claim
  it for the publishing account or organization.
- 2FA-on-publish must be respected; the publisher will need to satisfy
  whatever auth challenge npm requires.
- Do not commit npm tokens. CI publishing is out of scope for this batch.

## Pre-Publish Checks

Run these on the release commit. Every check must pass before the first
`npm publish` runs.

```sh
npm install
npm run typecheck
npm run test
npm run build
git diff --check

node scripts/audit-package-exports.mjs
node scripts/publish-dry-run.mjs
node scripts/audit-license.mjs
node scripts/install-smoke.mjs
node scripts/install-tarball-smoke.mjs
```

Optional regression:

```sh
REKON_DOGFOOD_CLASSIC_ROOT=/path/to/codebase-intel npm run test
```

Manual checks:

- `CHANGELOG.md` has an entry for `0.1.0-alpha.1`.
- `docs/release/0.1.0-alpha.1.md` reflects what is being released.
- `docs/release/public-package-boundaries.md` matches the actual publish
  list.
- Every workspace package version is exactly `0.1.0-alpha.1`.
- Git working tree is clean.

## Package Publish Order

Publish in dependency-safe order so each tarball can resolve its
`@rekon/*` peers from the registry. The order below is computed from the
current workspace dependency graph.

1. `@rekon/kernel-artifacts`
2. `@rekon/kernel-evidence`
3. `@rekon/kernel-snapshot`
4. `@rekon/kernel-graph`
5. `@rekon/kernel-repo-model`
6. `@rekon/kernel-rulebook`
7. `@rekon/kernel-findings`
8. `@rekon/sdk`
9. `@rekon/runtime`
10. `@rekon/capability-js-ts`
11. `@rekon/capability-model`
12. `@rekon/capability-graph`
13. `@rekon/capability-policy`
14. `@rekon/capability-resolver`
15. `@rekon/capability-docs`
16. `@rekon/capability-memory`
17. `@rekon/capability-intent`
18. `@rekon/capability-reconcile`
19. `@rekon/cli`

If the actual dependency graph drifts before publish, recompute the order
with:

```sh
node -e "$(cat <<'EOF'
const { readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const packages = {};
for (const dir of readdirSync('packages')) {
  const pkg = JSON.parse(readFileSync(join('packages', dir, 'package.json'), 'utf8'));
  packages[pkg.name] = Object.keys(pkg.dependencies || {}).filter((dep) => dep.startsWith('@rekon/'));
}
const sorted = [];
const visited = new Set();
function visit(name) {
  if (visited.has(name)) return;
  visited.add(name);
  for (const dep of packages[name] || []) visit(dep);
  sorted.push(name);
}
for (const name of Object.keys(packages).sort()) visit(name);
console.log(sorted.join('\n'));
EOF
)"
```

## Dry-Run Command Template

Before publishing for real, run a per-package dry-run from the repo root:

```sh
npm publish --dry-run --access public --tag alpha --workspace @rekon/<package>
```

`npm publish --dry-run` does not publish. It prints the tarball contents
and the integrity hash.

`--tag` is **required**. npm refuses to publish a prerelease version
without one. See the [dist-tag Decision](#dist-tag-decision) section for
why this defaults to `alpha`.

Run the full sequence:

```sh
for pkg in \
  @rekon/kernel-artifacts \
  @rekon/kernel-evidence \
  @rekon/kernel-snapshot \
  @rekon/kernel-graph \
  @rekon/kernel-repo-model \
  @rekon/kernel-rulebook \
  @rekon/kernel-findings \
  @rekon/sdk \
  @rekon/runtime \
  @rekon/capability-js-ts \
  @rekon/capability-model \
  @rekon/capability-graph \
  @rekon/capability-policy \
  @rekon/capability-resolver \
  @rekon/capability-docs \
  @rekon/capability-memory \
  @rekon/capability-intent \
  @rekon/capability-reconcile \
  @rekon/cli; do
  npm publish --dry-run --access public --tag alpha --workspace "$pkg"
done
```

## Publish Command Template

When the manual approval is in hand, publish per package in the order
above:

```sh
npm publish --access public --tag alpha --workspace @rekon/<package>
```

If npm 2FA on publish is enabled, provide `--otp <code>` per command:

```sh
npm publish --access public --tag alpha --otp <code> --workspace @rekon/<package>
```

Notes:

- `--access public` is required because `@rekon/*` is a scoped name.
- `--tag alpha` is the documented default for this alpha. See
  [dist-tag Decision](#dist-tag-decision). Substitute `--tag latest`
  only if Drew explicitly approves making the alpha the default install
  target.
- `--otp` may be required depending on the publisher's npm 2FA
  settings. Each `npm publish` call is a separate registry write, so
  expect a separate OTP challenge per package.

## Post-Publish Smoke

After publishing every package, run from a clean directory outside the
Rekon checkout. With `--tag alpha`, consumers must opt in via `@alpha`:

```sh
tmpdir="$(mktemp -d)"
cd "$tmpdir"

npm init -y
npm install --no-save @rekon/cli@alpha

# Use the installed CLI on a tiny fixture
mkdir -p sample/src
cat > sample/package.json <<'JSON'
{ "type": "module" }
JSON
cat > sample/src/index.ts <<'TS'
export function bootstrapApp() {
  return "ok";
}
TS

./node_modules/.bin/rekon init --root sample
./node_modules/.bin/rekon observe --root sample --json | head
./node_modules/.bin/rekon project --root sample --json | head
./node_modules/.bin/rekon snapshot --root sample --json | head
./node_modules/.bin/rekon evaluate --root sample --json | head
./node_modules/.bin/rekon resolve preflight --root sample --path src/index.ts --goal "modify bootstrap" --json | head
./node_modules/.bin/rekon publish agents --root sample
./node_modules/.bin/rekon artifacts validate --root sample --json
```

If the publish ran with `--tag latest` instead, the install command is
`npm install --no-save @rekon/cli@0.1.0-alpha.1` (or just `@rekon/cli`).
Everything else stays the same.

Verify:

- All commands exit `0`.
- `artifacts validate` reports `valid: true`.
- The installed `rekon` binary loads built-in capabilities without
  requiring extra configuration.

If anything fails, see "Rollback / Deprecate" below.

## Rollback / Deprecate

- npm **unpublish** is restricted (only allowed within a short window for
  brand-new packages with no dependents). Do **not** rely on unpublish.
- Prefer `npm deprecate @rekon/<package>@<version> "<reason>"` to
  discourage installation of a broken version.
- If a published version is broken, ship a fix as `0.1.0-alpha.2`.
- Keep the bad version's deprecation message accurate and pointing to the
  successor.
- Document the incident in `CHANGELOG.md` and add a follow-up entry to
  `docs/release/`.

## Do Not Publish Until

- The current alpha release checklist clears (see
  [alpha-release-checklist.md](alpha-release-checklist.md)).
- A maintainer with `@rekon` publish rights has approved the publish.
- The release notes in
  [docs/release/0.1.0-alpha.1.md](0.1.0-alpha.1.md) are current.
- A `git tag v0.1.0-alpha.1` (or equivalent) is created and pushed.
- The maintainer is at a workstation with npm 2FA available, not in
  automation.

## Out Of Scope

- Automated publish from CI.
- `provenance` SLSA attestations (worth doing later; not blocking for
  alpha.1).
- Private registry mirroring.
- npm `publishConfig.registry` overrides.
- Long-term release cadence.

Cross-references:

- [Public package boundaries](public-package-boundaries.md)
- [Alpha release checklist](alpha-release-checklist.md)
- [0.1.0-alpha.1 release notes](0.1.0-alpha.1.md)
