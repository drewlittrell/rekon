CHANGES MADE
- Updated `docs/release/npm-publish-plan.md` to require `--tag latest` for every dry-run and publish command. npm refuses to publish a prerelease version (anything with a hyphen, e.g. `0.1.0-alpha.1`) without an explicit `--tag`. Also clarified that the `@rekon` scope is currently unclaimed on npm.
- No package code, kernel, SDK, runtime, or capability behavior changes.

PUBLIC API CHANGES
- None.

REPO STATE
- Branch: `main`
- HEAD: `f77cda3 Prepare 0.1.0-alpha.1 publish boundaries and tarball smoke`
- Working tree clean before this gate began. The publish-plan documentation update is the only file modified during this gate.

NPM IDENTITY
- `npm whoami`: failed with `ENEEDAUTH` (`This command requires you to be logged in.`).
- `npm profile get`: failed with `401 Unauthorized`.
- No user is currently authenticated to npm on this machine.
- 2FA mode: unknown until login.

SCOPE STATUS
- `npm org ls rekon`: command exited 0 with empty output. Without auth, npm cannot report org membership for an unowned scope, so this is consistent with the scope being unclaimed.
- `npm access ls-collaborators @rekon/cli`: not a valid command in this npm version (`EUSAGE`). The modern equivalents are `npm access list collaborators` / `npm owner ls`; neither is meaningful for a package that does not yet exist.
- `npm view @rekon/cli version`: `404 Not Found`. Consistent with the package not existing.
- Conclusion: the `@rekon` scope is currently unclaimed on npm. The first `npm publish --access public` from an authenticated account will claim it for that account (or the linked org, if the account is an org member).

PACKAGE AVAILABILITY (all 19 checked via `npm view <pkg> version`)
- @rekon/kernel-artifacts: AVAILABLE
- @rekon/kernel-evidence: AVAILABLE
- @rekon/kernel-snapshot: AVAILABLE
- @rekon/kernel-graph: AVAILABLE
- @rekon/kernel-repo-model: AVAILABLE
- @rekon/kernel-rulebook: AVAILABLE
- @rekon/kernel-findings: AVAILABLE
- @rekon/sdk: AVAILABLE
- @rekon/runtime: AVAILABLE
- @rekon/capability-js-ts: AVAILABLE
- @rekon/capability-model: AVAILABLE
- @rekon/capability-graph: AVAILABLE
- @rekon/capability-policy: AVAILABLE
- @rekon/capability-resolver: AVAILABLE
- @rekon/capability-docs: AVAILABLE
- @rekon/capability-memory: AVAILABLE
- @rekon/capability-intent: AVAILABLE
- @rekon/capability-reconcile: AVAILABLE
- @rekon/cli: AVAILABLE
- All 19 names are available; no name conflicts.

LOCAL VERIFICATION
- npm run typecheck: passed.
- npm run test: 89 passed, 1 skipped optional dogfood (REKON_DOGFOOD_CLASSIC_ROOT not set).
- npm run build: passed.
- git diff --check: clean.
- node scripts/audit-package-exports.mjs: passed (19 packages, no issues).
- node scripts/publish-dry-run.mjs: passed (19 packages, 6 entries each, no `.tsbuildinfo`, no forbidden tokens).
- node scripts/audit-license.mjs: passed (root + 19 packages all Apache-2.0).
- node scripts/install-smoke.mjs: passed (build-based install smoke, artifact validate clean).
- node scripts/install-tarball-smoke.mjs: passed (19 tarballs packed, installed via `file:` deps, golden CLI flow validated, 14 artifacts emitted, artifact validate clean).
- CLI golden flow against `examples/simple-js-ts`: all 8 commands exited 0; final `artifacts validate --json` returned `{ "valid": true, "issues": [] }`. Example workspace cleaned afterward.

NPM PUBLISH DRY-RUN
- Initial attempt without `--tag` failed for every package: `npm error You must specify a tag using --tag when publishing a prerelease version.` This is npm's mandatory rule for prerelease versions (anything with a hyphen).
- With `--tag latest`, all 19 dry-runs passed (exit 0, 6 files per tarball):
  - @rekon/kernel-artifacts: 6.3 kB, 6 files
  - @rekon/kernel-evidence: 6.0 kB, 6 files
  - @rekon/kernel-snapshot: 4.8 kB, 6 files
  - @rekon/kernel-graph: 3.4 kB, 6 files
  - @rekon/kernel-repo-model: 5.7 kB, 6 files
  - @rekon/kernel-rulebook: 3.2 kB, 6 files
  - @rekon/kernel-findings: 4.2 kB, 6 files
  - @rekon/sdk: 10.8 kB, 6 files
  - @rekon/runtime: 12.7 kB, 6 files
  - @rekon/capability-js-ts: 5.1 kB, 6 files
  - @rekon/capability-model: 3.8 kB, 6 files
  - @rekon/capability-graph: 3.3 kB, 6 files
  - @rekon/capability-policy: 3.6 kB, 6 files
  - @rekon/capability-resolver: 11.2 kB, 6 files
  - @rekon/capability-docs: 3.9 kB, 6 files
  - @rekon/capability-memory: 4.1 kB, 6 files
  - @rekon/capability-intent: 4.1 kB, 6 files
  - @rekon/capability-reconcile: 3.3 kB, 6 files
  - @rekon/cli: 7.5 kB, 6 files
- `docs/release/npm-publish-plan.md` updated to require `--tag latest` so the next attempt does not hit this gate.

DECISION
- **DEFER_PUBLISH.**
- Local artifact readiness is green. Package shape, audits, smokes, and dry-runs all pass.
- The blocking gate is operational, not technical: the publisher must authenticate to npm and claim the `@rekon` scope before publish can proceed.

BLOCKERS
1. **npm authentication is not configured on this machine.** `npm whoami` fails with `ENEEDAUTH`. A maintainer must run `npm login` (interactive) before any publish.
2. **`@rekon` scope is unclaimed and must be intentionally chosen.** First publish under `@rekon/*` will create the scope tied to the publisher's account (or org). Confirm whether the intended owner is a personal account or an organization, and create the npm org explicitly if multi-maintainer publishing is desired (`npm org create rekon`, npm web UI, etc.).
3. **Publish requires `--tag latest` (or `--tag alpha`).** Documented and fixed in this gate. Reviewer should decide between `--tag latest` (default install pulls alpha) and `--tag alpha` (consumers must opt in via `@alpha`). The published plan currently uses `--tag latest`.
4. **No human approval recorded yet for publishing under `0.1.0-alpha.1`.** The publish step is intentionally gated on Drew's explicit go.

PUBLISH COMMANDS IF APPROVED
> **DO NOT RUN WITHOUT DREW APPROVAL.**

Pre-publish (from repo root, working tree at `f77cda3` or later):

```sh
npm login          # interactive
npm whoami         # confirm publisher identity
npm run build      # ensure dist is current
```

Publish in dependency-safe order with `--tag latest`:

```sh
npm publish --access public --tag latest --workspace @rekon/kernel-artifacts
npm publish --access public --tag latest --workspace @rekon/kernel-evidence
npm publish --access public --tag latest --workspace @rekon/kernel-snapshot
npm publish --access public --tag latest --workspace @rekon/kernel-graph
npm publish --access public --tag latest --workspace @rekon/kernel-repo-model
npm publish --access public --tag latest --workspace @rekon/kernel-rulebook
npm publish --access public --tag latest --workspace @rekon/kernel-findings
npm publish --access public --tag latest --workspace @rekon/sdk
npm publish --access public --tag latest --workspace @rekon/runtime
npm publish --access public --tag latest --workspace @rekon/capability-js-ts
npm publish --access public --tag latest --workspace @rekon/capability-model
npm publish --access public --tag latest --workspace @rekon/capability-graph
npm publish --access public --tag latest --workspace @rekon/capability-policy
npm publish --access public --tag latest --workspace @rekon/capability-resolver
npm publish --access public --tag latest --workspace @rekon/capability-docs
npm publish --access public --tag latest --workspace @rekon/capability-memory
npm publish --access public --tag latest --workspace @rekon/capability-intent
npm publish --access public --tag latest --workspace @rekon/capability-reconcile
npm publish --access public --tag latest --workspace @rekon/cli
```

If npm 2FA on publish is enabled, append `--otp <code>` per command. Expect 19 OTP prompts.

POST-PUBLISH SMOKE PLAN
After all 19 publishes succeed, run from outside the repo:

```sh
tmpdir="$(mktemp -d)"
cd "$tmpdir"
npm init -y
npm install --no-save @rekon/cli@0.1.0-alpha.1

mkdir -p sample/src
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
- Installed CLI loads all built-in capabilities without extra configuration.

If post-publish smoke fails:
- Use `npm deprecate @rekon/<pkg>@0.1.0-alpha.1 "<reason>"` instead of unpublish.
- Ship a fix as `0.1.0-alpha.2`.
- Record the incident in `CHANGELOG.md`.

After successful post-publish:
- Update `docs/release/0.1.0-alpha.1.md` "Publish Status" with versions, timestamp, and publisher.
- Create and push a `v0.1.0-alpha.1` git tag.
- Optionally draft a GitHub release.

RISKS / FOLLOW-UP
- `--tag latest` makes `npm install @rekon/cli` resolve to the alpha by default. If that's not desired, switch to `--tag alpha` before publish; consumers will then need `npm install @rekon/cli@alpha`.
- Each `npm publish` is irreversible after a 72-hour window. Tarballs/dist must be exactly what is intended.
- The current `package-lock.json` lists internal `@rekon/*` deps at pinned `0.1.0-alpha.1`. After real publish, downstream consumers in fresh installs will pull from the registry instead of workspace symlinks; behavior should be identical because everything ships under the same version.
- A maintainer should decide whether to publish from a personal account or to create an `rekon` npm org first.
- CI status on `main` should be confirmed green before publish.

NEXT STEP
- Drew makes the explicit publish decision:
  1. Approve publish → run `npm login`, then execute the publish sequence above, then run the post-publish smoke, then tag and update release notes.
  2. Defer → set up npm auth/scope offline first and re-run this gate; no other code changes are required.
- Until explicit approval, no `@rekon/*` package will be published. `READY_TO_PUBLISH` is *not* the current state because the npm auth/scope work is still outstanding. The current state is `DEFER_PUBLISH`: pre-publish artifacts are green, operational pre-publish steps are not.
