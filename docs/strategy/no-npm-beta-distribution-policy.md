# No-NPM Beta Distribution Policy

## Decision Summary

**Decision: Rekon beta will not be published
to npm.** Beta is a validated product /
checklist state, not an npm-published package
state. Distribution during beta is
source-controlled, local-build, and
tarball-smoke based; the npm registry path is
deferred.

**Pinned reminders carried forward:**

- **Rekon beta will not be published to npm.**
- **npm publish is deferred until after beta or
  until a new explicit operator decision
  reverses this policy.**
- **`0.1.0-beta.0` remains the internal /
  repo version for beta validation.**
- **Beta distribution is source-controlled /
  local-build / tarball-smoke based, not
  public npm registry based.**

**Required statements pinned by the memo + the
docs test:**

- Beta readiness is a product / checklist
  state, not an npm-published state.
- No npm publish should be attempted during
  beta.
- Real-repo dogfood passed and should continue
  across more repos before public package
  release.

The
[Real-Repo Beta Dogfood Report](real-repo-beta-dogfood-report.md)
recorded the first dogfood run as
`pass-with-known-limitations` against a temp
copy of the Rekon repository itself. With
dogfood evidence in hand, the operator chose to
**defer npm publish during beta** rather than
proceed to the previously-planned publish
authorization work order. This memo replaces
that publish authorization step with: (1) the
pinned no-NPM policy, and (2) an additional
real-repo dogfood cohort plan as the next
slice.

This batch ships **the policy memo only**. No
`package.json` `version` field is mutated. No
publish-time tooling is invoked. No release tag
is created. No active workflow YAML is written
under `.github/workflows/`. The mandatory
verification commands + the audit / smoke
matrix continue to gate every batch, including
this one.

## Why This Decision Exists

npm publish is a **public, one-way, immutable**
surface. Once a workspace package is published
under a given semver, that prerelease tag is
consumed forever — it cannot be retracted,
re-used, or quietly corrected. For Rekon's
beta — which is intentionally a validation
state, not a public release — the cost of an
accidental publish (or a publish followed by a
beta-revealed defect that can't be cleanly
rolled back) outweighs the convenience of `npm
install @rekon/cli`.

Three forces shaped this decision:

1. **Successful first dogfood does not equal
   broad-repo confidence.** The first real-repo
   dogfood targeted Rekon itself (a TypeScript
   monorepo with real test commands). It
   passed, but a sample size of one repo —
   especially one as well-understood as Rekon's
   own — is not enough to commit a public
   npm version. Additional dogfood across
   different repo archetypes (small TS package,
   Next.js app, mixed JS/TS repo, repo with
   existing GitHub workflows, etc.) is what
   would justify a public publish.
2. **Beta should be validation, not
   distribution.** The
   [Beta Release Readiness Checklist](beta-release-readiness-checklist.md)
   already pinned "Beta readiness is a checklist
   state, not an npm publish event." This memo
   makes the corollary explicit: beta is a
   validated product *state*, and the
   distribution channel (npm, GitHub Release,
   etc.) is a separate decision that can be
   made later — or not at all, if beta
   feedback suggests a different shape.
3. **Operators can adopt Rekon from source
   today.** A `git clone` + `npm ci` + `npm run
   build` produces the same CLI binary that
   would otherwise be installed from npm. The
   workflow templates (`docs/examples/workflows/*.yml`)
   are documentation, not GitHub Actions
   uploaded under `.github/workflows/`;
   operators copy them into their own repos
   manually. Tarballs produced by
   `scripts/install-tarball-smoke.mjs` exercise
   the same install path npm would use, without
   publishing. There is no functional gap
   between "beta from source" and "beta from
   npm" that npm publish is uniquely required
   to close.

The earlier release sequence had assumed
publish would be the natural next step after
the dogfood pass. The operator's review of the
dogfood report reached a different conclusion:
publish is **post-beta or later**, contingent
on broader real-repo dogfood evidence + an
explicit later operator decision. This memo
captures that revision.

## Dogfood Status

The first real-repo dogfood is **complete and
recorded**.

| Dogfood Target | Result | Notes |
| --- | --- | --- |
| Rekon repo temp copy at SHA `83ba723` | `pass-with-known-limitations` | 489 files / 7.8 MB rsync copy; `npm ci` + `npm run build` inside the copy succeeded; 24-entry dogfood command matrix passed end-to-end; `verify run --execute` actually ran `npm run typecheck` + `npm run test` + `npm run build` and all 3 passed; `publish github-check --dry-run` propagated `conclusion: success`. See [Real-Repo Beta Dogfood Report](real-repo-beta-dogfood-report.md). |

**Real-repo dogfood passed and should continue
across more repos before public package
release.** The next slice (additional real-repo
dogfood cohort plan) defines the broader
target set.

## Beta Distribution Model

Beta is distributed via:

| Distribution Path | Beta Status | Notes |
| --- | --- | --- |
| source checkout | allowed | primary beta path; `git clone` + `npm ci` + `npm run build` |
| local build | allowed | `npm run build` from source checkout produces the same CLI binary that npm would distribute |
| local tarball smoke | allowed | `scripts/install-tarball-smoke.mjs` produces + installs tarballs in a temp project for validation only — no publish |
| GitHub workflow templates | allowed | the four shipped workflow templates under `docs/examples/workflows/*.yml` are documentation; operators copy them into their own repos manually |
| npm registry | **deferred** | no npm publish during beta |
| GitHub Release | **deferred** | no release object during beta unless separately approved by a later explicit operator decision |

**Operators who want to try Rekon during beta:**

1. Clone the Rekon repo at a beta-tagged SHA.
2. Run `npm ci` + `npm run build`.
3. Invoke `node packages/cli/dist/index.js …`
   against their own repo (the same way the
   real-repo dogfood does).
4. Optionally copy the relevant workflow
   template from `docs/examples/workflows/*.yml`
   into their own `.github/workflows/`
   directory.
5. Provide feedback against real-repo behaviour
   before any public package release is
   considered.

**No `npm install @rekon/cli` path during
beta.** No public package surface; no
registry; no install instruction in
documentation referencing an npm install
command for a beta version.

## NPM Publish Policy

| Policy Area | Decision |
| --- | --- |
| npm publish during beta | **deferred** |
| version bump | already applied to `0.1.0-beta.0` (no further bump in this batch) |
| public registry install | not supported during beta |
| source checkout install | supported (primary beta path) |
| more real-repo dogfood | required before post-beta publish |
| publish authorization work order | **replaced** by no-NPM beta policy (this memo) |

**Specifically:**

- **No `npm publish`** for any workspace
  package during beta.
- **No `npm publish --provenance`** during
  beta.
- **No GitHub Actions workflow** under
  `.github/workflows/` is allowed to invoke
  `npm publish`; the publishing path remains
  operator-driven, full stop. (No such
  workflow exists today; this memo pins
  "remains absent" for beta.)
- **`scripts/publish-dry-run.mjs` continues
  to run** as part of the mandatory
  verification matrix — but it composes
  tarballs without invoking npm, exactly as
  designed.
- **`scripts/install-tarball-smoke.mjs`
  continues to run** — it installs the
  composed tarballs into a temp project for
  validation only. Neither script publishes;
  neither needs to change.

**A future post-beta publish would require a
new explicit operator work order.** That work
order would:

- Re-run the mandatory verification commands +
  the CLI smoke matrix + the additional
  real-repo dogfood cohort on the publish SHA.
- Require explicit operator authorization
  immediately before invoking `npm publish`.
- Invoke `npm publish --provenance` for each
  workspace package in dependency order.
- Push the corresponding git tag only after
  every workspace package has published
  successfully.
- Create the GitHub Release.
- Confirm a post-publish install smoke from
  npm.

But this is **post-beta**, not part of beta.
Whether that publish happens at all is itself
a later decision.

## Version Policy

- **Current root version:** `0.1.0-beta.0`
  (applied by Batch 31 — Beta Version Bump
  Execution Report).
- **All 20 workspace package versions:**
  `0.1.0-beta.0` (coherent).
- **Lockfile:** `0.1.0-beta.0` (coherent;
  root version + 21 workspace version entries
  + 70 `@rekon/*` dependency pins all match).
- **No further version bump in this batch.**
- **`0.1.0-beta.0` remains the internal /
  repo version for beta validation.** Operators
  who clone the repo see the beta version in
  every workspace `package.json` and in the
  CLI's `--version` output.
- **Successor versions** (`0.1.0-beta.1`,
  `0.1.0-beta.2`, etc., or eventually the
  general `0.1.0`) are deferred to later batches
  that explicitly decide on each bump. No batch
  may bump versions implicitly.

**Why keep the `0.1.0-beta.0` version even
though we won't publish?** Three reasons:

1. **Operator clarity.** A clone of the repo
   shows `0.1.0-beta.0` everywhere, so
   operators know they're using beta code, not
   the prior alpha.
2. **Future publish coherence.** If a future
   work order decides to publish, the workspace
   coherence + lockfile state are already
   ready; no last-minute bump scramble.
3. **Sequence honesty.** Bumping to beta was
   the explicit decision of Batch 31. Reverting
   would imply the bump was wrong. It wasn't —
   the version is correct; the distribution
   posture has changed.

## Install / Run Model During Beta

Beta install is **source-checkout based**.
Concretely:

```sh
git clone https://github.com/drewlittrell/rekon.git
cd rekon
git checkout <beta-validated-sha>      # operator-supplied; recorded in dogfood reports
npm ci
npm run build

# Run the CLI against your own repo:
node packages/cli/dist/index.js refresh --root /path/to/your/repo --json
node packages/cli/dist/index.js artifacts validate --root /path/to/your/repo --json
node packages/cli/dist/index.js verify run --root /path/to/your/repo --plan <plan-id> --dry-run --json
```

The CLI binary at `packages/cli/dist/index.js`
is the same artefact that a future npm publish
would install. No special "beta build" mode;
no separate distribution channel; no two
divergent code paths.

**Workflow templates** in
`docs/examples/workflows/*.yml` are copied
manually by operators into their own repos'
`.github/workflows/` directories. The Rekon
repo's own `.github/workflows/*.yml` remains
**empty** during beta — no active workflows are
installed.

**No public install instruction** in any
operator-facing doc may suggest `npm install`
or `npx @rekon/cli` works during beta. (If
this changes post-beta, the publish work order
will update the operator docs explicitly.)

## Known Limitations

All limitations carried forward from the
[Beta Release Readiness Checklist](beta-release-readiness-checklist.md)
+ the
[Real-Repo Beta Dogfood Report](real-repo-beta-dogfood-report.md)
remain accurate. This memo adds the no-NPM
posture to that list:

- **No npm install during beta.** Source
  checkout is the only beta install path.
- **No public version on the npm registry.**
  `@rekon/*` package names are reserved by the
  unpublished workspace; no published version
  exists.
- **No GitHub Release object for beta.**
  Operators discover beta SHAs via the
  CHANGELOG + roadmap, not via a GitHub
  Release tag.
- **One real-repo dogfood completed.**
  Additional dogfood targets are the next
  slice's responsibility before any public
  publish is reconsidered.
- All carried-forward limitations: no
  source-write apply; no watcher daemon; no
  hosted GitHub App; active workflows not
  installed automatically; GitHub writes opt-in
  only; Windows process-tree kill
  direct-child-only; full classic parity not
  claimed; aggregate freshness historical
  stale entries; reserved-but-not-implemented
  `PathFreshnessReport` /
  `ReconciliationApplyReport` / `source:write`;
  `paths` / `events` invalidation rules public
  intent only; PR comment bounded-retry +
  same-repo `pull_request` guard post-beta
  polish; memory promotion / supersession
  post-beta maturity; deeper rule catalog
  post-beta breadth.

**No new defect.** No new limitation surfaced
by this policy revision. The npm-deferred
posture is a distribution decision, not a
product-readiness decision.

## What This Does Not Do

This batch **does not**:

- Run `npm publish` for any workspace package.
- Run `npm publish --provenance`.
- Edit any `package.json` `version` field
  (root or workspace — still `0.1.0-beta.0`).
- Edit `package-lock.json`.
- Create any git tag.
- Create any GitHub Release.
- Add any active `.github/workflows/*.yml`.
- Change runtime behaviour in any package.
- Add a new CLI command, validator profile,
  workflow template, artifact type, or
  permission.
- Mutate any `packages/*/src/*.ts` file.
- Mutate the committed `examples/simple-js-ts`
  fixture.
- Change the previously-pinned beta-ready
  decision. The product is beta-ready; the
  distribution channel has changed.
- Forbid a future npm publish forever. A
  later explicit operator decision can revisit
  the npm posture; this memo defers it, not
  cancels it.

## Implementation Sequence

| Step | Slice | Status |
| --- | --- | --- |
| 1 | [Beta release readiness checklist memo](beta-release-readiness-checklist.md) | ✅ Shipped |
| 2 | [Beta release candidate execution plan](beta-release-candidate-execution-plan.md) | ✅ Shipped (against SHA `54d1dfd`) |
| 3 | [Beta version bump execution report](beta-version-bump-execution-report.md) | ✅ Shipped (`0.1.0-beta.0` applied) |
| 4 | [Real-repo beta dogfood report](real-repo-beta-dogfood-report.md) | ✅ Shipped (`pass-with-known-limitations` against the Rekon repo itself) |
| 5 | **No-NPM beta distribution policy (this memo)** | ✅ **Shipped** — replaces the previously-planned publish authorization work order |
| 6 | [Additional real-repo dogfood cohort plan](additional-real-repo-dogfood-cohort-plan.md) | ✅ **Shipped** — 5 archetypes (small TS package; medium monorepo; Next.js / React app; mixed JS/TS repo; existing GitHub workflows repo); at least 3 distinct real repositories required; command matrix + metrics + success criteria + release blocker taxonomy + reporting format pinned |
| 7a | [Real-repo dogfood cohort intake request](real-repo-cohort-intake-request.md) | ✅ **Shipped** — operator intake table pending |
| 7b | Additional real-repo dogfood execution | **Blocked on operator intake.** Resumes once the operator answers the intake table |
| 8 | Post-beta source-write apply roadmap (4 slices) | Post-beta |
| 9 | Post-beta path freshness + watcher roadmap (4 slices) | Post-beta |
| 10 | Post-beta breadth / maturity / polish work | Ongoing |
| 11 | (Optional, deferred) Post-beta npm publish authorization work order | Only after broader real-repo dogfood + an explicit later operator decision reverses the no-NPM policy |

**The next slice is the additional real-repo
dogfood cohort plan**, not the publish
authorization. The publish authorization is
explicitly deferred; whether it ever runs is a
later decision.

## Follow-Up Work

**Recommended next slice: Additional real-repo
dogfood cohort plan.**

That plan defines 3–5 more real repositories /
repo archetypes to dogfood before any post-beta
publish is reconsidered. Candidate archetypes:

- A small TypeScript package (single workspace;
  no monorepo).
- A medium monorepo (a few workspaces; not as
  intricate as Rekon's own).
- A Next.js app.
- A mixed JS/TS repo (some `.js`, some `.ts`,
  no enforced module boundary).
- A repo with existing `.github/workflows/*.yml`
  (to confirm Rekon's workflow templates
  coexist).

For each cohort target, run Rekon locally from
source checkout (same way the first dogfood
ran), record findings, artifact validation,
verification behaviour, and operator value.
The cohort plan slice authors the operating
procedure; the cohort execution slice (after)
performs the runs.

**After the cohort completes,** the operator
can reconsider:

- Continue beta with the no-NPM posture
  indefinitely.
- Open a publish authorization work order
  (would require a new explicit operator
  decision).
- Adjust the beta version (e.g., bump to
  `0.1.0-beta.1`) before further dogfood.
- Promote to a different distribution channel
  (e.g., GitHub Container Registry, private
  npm, etc. — not in scope for this memo).

**Other post-beta work** continues
independently of the publish decision:

- Post-beta source-write apply roadmap (4
  slices: patch preview → permission + rollback
  design → apply implementation → safety
  review).
- Post-beta path freshness + watcher roadmap
  (4 slices: path freshness artefact → watcher
  daemon design → watcher implementation →
  safety review).
- Post-beta breadth / maturity / polish
  (hosted GitHub App; deeper rule catalog;
  memory promotion / supersession; PR comment
  bounded retry + same-repo `pull_request`
  guard; Windows process-tree kill via Job
  Objects).

None of those depends on publish. They can
proceed against the source-checkout beta as
soon as the cohort feedback informs priorities.

**`0.1.0-beta.0` remains the internal beta
version. Beta readiness is a product /
checklist state, not an npm-published state.
No npm publish should be attempted during
beta. Real-repo dogfood passed and should
continue across more repos before public
package release.**
