CHANGES MADE
- Updated `docs/release/npm-publish-plan.md` to add a dedicated "dist-tag Decision" section and switch the default publish command template from `--tag latest` to `--tag alpha`. The plan now treats `--tag latest` as the explicit opt-in for making the alpha the default install target.
- Updated `docs/release/0.1.0-alpha.1.md` install instructions to use `npm install --no-save @rekon/cli@alpha`. Publish Status section now states that alpha packages are expected under the `alpha` dist-tag unless the release decision changes.
- Updated `docs/release/alpha-release-checklist.md` "Do Not Publish Until" with three new unchecked manual items: scope/dist-tag decision, `npm login`, and the dist-tag-specific post-publish smoke command. The "Next Batch" section now points to this packet alongside the previous gate.
- Added this review packet: `.rekon-dev/review-packets/dist-tag-decision.md`.
- Updated `CHANGELOG.md` with a docs-only entry recording the publish-plan correction.
- No package code, kernel, SDK, runtime, or capability behavior changes.

PUBLIC API CHANGES
- None. Docs only.

CURRENT BLOCKER
- `npm whoami` returns `ENEEDAUTH`. A maintainer must `npm login` on the publishing workstation before any publish can run.

PACKAGE NAMES AVAILABLE
- All 19 `@rekon/*` package names returned `404 Not Found` from `npm view`. Names are claimable on the first authenticated publish.

RECOMMENDED DIST-TAG: `alpha`
- Why: Rekon `0.1.0-alpha.1` is explicitly an alpha. `--tag alpha` communicates "usable, but not a stable default yet". Consumers opt in via `@rekon/cli@alpha`. Bare `npm install @rekon/cli` resolves to nothing until a non-prerelease ships.
- Trade-off: `alpha` adds friction (consumers must type `@alpha`). For a substrate library, that friction is the *point*: it filters for consumers who understand they are picking up an alpha.

ALTERNATIVE DIST-TAG: `latest`
- Why someone might choose it: bare `npm install @rekon/cli` works immediately without `@alpha`. Frictionless discovery.
- Trade-off: the alpha becomes the default install target. Downgrading from `latest` to `alpha` later is operationally awkward: it requires `npm dist-tag` calls, communication to consumers, and (in some npm scenarios) a real `latest` release to override the alpha. Avoid unless frictionless install matters more than the stability signal.

EXACT COMMANDS IF ALPHA IS APPROVED

> **DO NOT RUN WITHOUT DREW APPROVAL.**

Pre-publish on the publishing workstation:

```sh
npm login         # interactive; satisfies ENEEDAUTH
npm whoami        # confirm publisher identity
npm run build     # ensure dist/ is current
```

Per-package dry-run:

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

Real publish, dependency-safe order, `--tag alpha`:

```sh
npm publish --access public --tag alpha --workspace @rekon/kernel-artifacts
npm publish --access public --tag alpha --workspace @rekon/kernel-evidence
npm publish --access public --tag alpha --workspace @rekon/kernel-snapshot
npm publish --access public --tag alpha --workspace @rekon/kernel-graph
npm publish --access public --tag alpha --workspace @rekon/kernel-repo-model
npm publish --access public --tag alpha --workspace @rekon/kernel-rulebook
npm publish --access public --tag alpha --workspace @rekon/kernel-findings
npm publish --access public --tag alpha --workspace @rekon/sdk
npm publish --access public --tag alpha --workspace @rekon/runtime
npm publish --access public --tag alpha --workspace @rekon/capability-js-ts
npm publish --access public --tag alpha --workspace @rekon/capability-model
npm publish --access public --tag alpha --workspace @rekon/capability-graph
npm publish --access public --tag alpha --workspace @rekon/capability-policy
npm publish --access public --tag alpha --workspace @rekon/capability-resolver
npm publish --access public --tag alpha --workspace @rekon/capability-docs
npm publish --access public --tag alpha --workspace @rekon/capability-memory
npm publish --access public --tag alpha --workspace @rekon/capability-intent
npm publish --access public --tag alpha --workspace @rekon/capability-reconcile
npm publish --access public --tag alpha --workspace @rekon/cli
```

If npm 2FA on publish is enabled, append `--otp <code>` per command. Expect 19 OTP prompts.

POST-PUBLISH SMOKE PLAN (alpha)

```sh
tmpdir="$(mktemp -d)"
cd "$tmpdir"
npm init -y
npm install --no-save @rekon/cli@alpha

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
./node_modules/.bin/rekon observe --root sample --json
./node_modules/.bin/rekon project --root sample --json
./node_modules/.bin/rekon snapshot --root sample --json
./node_modules/.bin/rekon evaluate --root sample --json
./node_modules/.bin/rekon resolve preflight --root sample --path src/index.ts --goal "modify bootstrap" --json
./node_modules/.bin/rekon publish agents --root sample
./node_modules/.bin/rekon artifacts validate --root sample --json
```

Acceptance:
- Every command exits 0.
- `artifacts validate --json` returns `{ "valid": true, "issues": [] }`.

POST-PUBLISH FOLLOW-UP
- Update [docs/release/0.1.0-alpha.1.md](../../docs/release/0.1.0-alpha.1.md) Publish Status with versions, timestamp, publisher, and the dist-tag actually used.
- Create and push a `v0.1.0-alpha.1` git tag.
- Optionally draft a GitHub release.
- If at any point the project moves the alpha to `latest`, update install docs in `README.md`, the release notes, and this packet.

RISKS / FOLLOW-UP
- `--tag alpha` will surprise consumers who try `npm install @rekon/cli` without `@alpha`. The error is clear (no matching version), but new contributors may not realize it. The release notes and README should mention `@alpha` prominently.
- If a maintainer accidentally publishes the first version with `--tag latest`, switching to `--tag alpha` later requires `npm dist-tag rm @rekon/<pkg> latest` and `npm dist-tag add @rekon/<pkg>@0.1.0-alpha.1 alpha` per package. Easier to get this right on first publish.
- The `@rekon` scope claim still depends on operator action: decide between a personal-account claim and an npm org.

NEXT STEP
- Drew makes the operational decisions:
  1. Scope: confirm `@rekon` (recommended), or pick an alternative.
  2. Identity: personal account vs npm org.
  3. dist-tag: `alpha` (recommended), or `latest` (only on explicit approval).
- Then `npm login` and run the publish sequence above (or the latest variant if approved).
- Until those steps run, the publish remains DEFER_PUBLISH per [manual-publish-decision.md](manual-publish-decision.md).
