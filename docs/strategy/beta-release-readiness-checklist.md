# Beta Release Readiness Checklist

## Decision Summary

**Recommendation: Pin this checklist as Rekon's
beta release readiness contract. With this memo
shipped, all three beta blockers identified by
the
[Beta Readiness / Remaining Classic-Parity Review](beta-readiness-classic-parity-review.md)
are resolved. Beta-ready is now a checklist state
defined by passing audits + smokes + documented
limitations, not an npm publish event.**

The
[Beta Readiness / Remaining Classic-Parity Review](beta-readiness-classic-parity-review.md)
identified three beta blockers; the
[source-write reconciliation policy decision](source-write-reconciliation-policy-decision.md)
resolved the first, the
[watcher / path freshness policy decision](watcher-path-freshness-policy-decision.md)
resolved the second, and **this memo resolves
the third** by pinning the release checklist
without shipping any version bump, npm publish,
or release tag in this batch.

**Pinned reminders carried forward:**

- **Beta readiness is a checklist state, not an
  npm publish event.**
- **npm publish requires a separate explicit
  release work order.**
- **No version bump occurs in this checklist
  batch.**
- **Known beta limitations must be documented
  before beta is announced.**

This batch ships **the checklist memo only**.
No `package.json` version field is mutated. No
publish-time tooling is invoked. No release tag
is created. No active workflow YAML is written
under `.github/workflows/`. The mandatory
verification commands listed below are run as
part of this batch's own gate; they are not
re-invoked as part of the future release slice
without re-running them on the release SHA.

## Why This Checklist Exists

The beta-readiness review concluded that Rekon
was **beta-close but not beta-ready**. Two of
the three blockers it identified were policy
decisions about product surface (source-write
reconciliation; watcher / path freshness). The
third is operational: **what counts as
"shippable for beta"?**

Without a pinned checklist:

- A future contributor could declare beta
  without running the audit / smoke matrix,
  leaving subtle regressions visible to first
  beta users.
- An accidental `npm publish` could happen
  outside an explicit release slice, surprising
  operators who hadn't opted in.
- A version bump could be applied in the wrong
  batch (this one, a strategy batch), conflating
  decision memos with release events.
- Known limitations could slip out unannounced,
  leaving beta users to discover them as
  apparent bugs.
- Beta-ready and full-classic-parity could
  collapse into a single ambiguous label,
  invalidating the deferred post-beta work the
  beta-readiness review documented.

This memo answers the question explicitly. The
answer is **"beta becomes ready when every
mandatory audit and smoke passes on main and
the documented limitations are in the
operator's hands; the actual release is a
separate slice."**

The framing matters because release events are
**high-leverage and high-risk**:

- An npm publish is one-way (semver-tagged
  versions cannot be cleanly retracted).
- A version bump in the wrong batch implies
  product changes that did not occur.
- A release tag creates an immutable claim
  about the codebase that must be defensible
  later.
- Missing limitation docs become "feature
  surprises" once users adopt.

Each risk has a corresponding guardrail in this
memo.

## Current Beta Blocker Status

| Blocker | Status | Evidence |
| --- | --- | --- |
| Source-write reconciliation policy | resolved | [source-write policy memo](source-write-reconciliation-policy-decision.md) (Option C — beta pins policy + preview requirements; apply deferred post-beta) |
| Watcher / path freshness policy | resolved | [watcher / path freshness memo](watcher-path-freshness-policy-decision.md) (Option C — watcher-lite / path freshness policy for beta; no daemon by default) |
| Release readiness checklist | resolved by this memo | checklist pinned (this document) |

With this checklist pinned and the listed
verification commands passing on main, Rekon is
**beta-ready** in the sense the beta-readiness
review meant: every blocker is closed; every
deferred surface is named; every limitation is
disclosed.

**Beta-ready ≠ npm-published.** The next slice
(beta release candidate execution plan) is
where a version bump and publish are
authorized, on a separate explicit operator
work order.

## Release Scope

**This checklist batch ships:**

- This decision memo.
- A docs test that pins every required
  statement.
- A review packet with PURPOSE PRESERVATION
  CHECK.
- Cross-references in 14 supporting docs +
  CHANGELOG + README.

**This checklist batch explicitly does not:**

- Run an npm publish.
- Bump any `package.json` `version` field
  (root or workspace).
- Create any release tag.
- Add active `.github/workflows/*.yml` files.
- Change runtime behaviour in any package.
- Add a new CLI command.
- Add a new validator profile.
- Add a new workflow template.
- Add a new artifact type.
- Add a new permission.

**The release slice that follows this memo**
(see Follow-Up Work) is where the version
decision is applied, the publish dry-run is
re-run on the release SHA, the install / install-
tarball smokes are re-run on the release SHA,
and (only with an explicit operator work
order) `npm publish --provenance` is invoked.

## Versioning Policy

**Current root version:** `0.1.0-alpha.1`.

**Beta target version naming convention:**
The current major version is `0.1.0`. Beta will
use a `-beta.<n>` prerelease tag, e.g.
`0.1.0-beta.0`, advancing the prerelease
identifier on each subsequent beta release
candidate. The choice of `-beta.0` vs.
`-beta.1` (and any subsequent semver decisions)
is **applied in the release slice, not this
memo**.

**Workspace version coherence:** Every
`@rekon/*` workspace package currently shares
`0.1.0-alpha.1`. The release slice must
maintain that coherence — every published
workspace package must share the same
prerelease identifier as the root. The
`scripts/publish-dry-run.mjs` audit will
surface any drift before publish.

**No version bump in this batch.** This batch
must not edit any `version` field. The release
slice (a separate explicit work order) bumps
once, applies the bump to every workspace,
re-runs the audit / smoke matrix on the
release SHA, and then (and only then, with
explicit operator authorization) publishes.

## NPM Publish Policy

**No npm publish in this batch.** No `npm
publish` invocation. No `--provenance` publish.
No release-tag push. No GitHub Release
creation.

**Publish requires a separate explicit
release work order.** The release work order
must:

- Be authored as its own batch (the beta
  release candidate execution plan slice
  described in Follow-Up Work).
- Re-run `node scripts/publish-dry-run.mjs` on
  the release SHA and confirm zero issues.
- Confirm the audit / smoke matrix from this
  checklist passes on the release SHA.
- Decide the exact beta version (`0.1.0-beta.0`
  or successor), apply it to every workspace
  package, and re-run the audits one more time
  after the bump.
- Require the operator's explicit
  authorization to invoke `npm publish`.
- Push the corresponding git tag only after a
  successful publish.

**Publish dry-run is mandatory before
publish.** Both before this checklist batch
and immediately before the release slice's
publish step. The `scripts/publish-dry-run.mjs`
inspects every workspace's tarball composition
without invoking npm; a passing dry-run is the
minimum precondition for `npm publish`.

**No automated publish triggers.** No GitHub
Actions workflow under `.github/workflows/`
may invoke `npm publish` for beta. Publish is
operator-driven, end of story.

## Mandatory Verification Commands

Before beta can be declared, every command in
the table below must pass on main:

| Command | Required Before Beta |
| --- | --- |
| `npm run typecheck` | yes |
| `npm run test` | yes |
| `npm run build` | yes |
| `git diff --check` | yes |
| `node scripts/audit-package-exports.mjs` | yes |
| `node scripts/audit-license.mjs` | yes |
| `node scripts/publish-dry-run.mjs` | yes |
| `node scripts/install-smoke.mjs` | yes |
| `node scripts/install-tarball-smoke.mjs` | yes |

**Failure of any required command blocks
beta.** No exceptions. The release slice is
responsible for re-running the same matrix on
the release SHA before publish.

**Why these commands matter:**

- `npm run typecheck` — ensures every workspace
  compiles together with the SDK conformance
  expectations.
- `npm run test` — runs the full contract +
  docs test suite (currently 1622+ assertions,
  growing with each batch).
- `npm run build` — produces every package's
  `dist/` output that the install smokes will
  consume.
- `git diff --check` — surfaces whitespace
  drift before commits land on main.
- `audit-package-exports.mjs` — confirms every
  workspace's `package.json` `exports` field
  resolves and that no internal-only path
  leaks into a published surface.
- `audit-license.mjs` — confirms every
  workspace and the root share `Apache-2.0`.
- `publish-dry-run.mjs` — composes every
  workspace's would-be tarball and counts
  entries / bytes without invoking npm.
- `install-smoke.mjs` — installs the built
  packages into a temp project and confirms
  the CLI runs.
- `install-tarball-smoke.mjs` — installs from
  the packed tarballs (closer to the eventual
  published artifact shape) and confirms 13+
  artifact families emit on the CLI smoke.

## CLI Smoke Matrix

The release slice's CLI smoke matrix (run on
fixture inputs, not main repo state):

```sh
rekon refresh --root <fixture>
rekon verify run --dry-run --plan <fixture-plan>
rekon verify run --execute --plan <fixture-plan>
rekon verify result from-run --run <fixture-run>
rekon publish proof --root <fixture>
rekon publish architecture --root <fixture>
rekon publish agent-contract --root <fixture>
rekon publish github-check --dry-run --root <fixture>
rekon publish pr-comment --dry-run --root <fixture>
rekon verify github-workflow validate --path <fixture> --profile read-only
rekon verify github-workflow validate --path <fixture> --profile github-check-send
rekon verify github-workflow validate --path <fixture> --profile github-pr-comment-send
rekon artifacts validate --root <fixture>
rekon artifacts freshness --root <fixture>
```

**Use temporary fixtures for execution / send-
adjacent flows.** The `--execute` path runs the
verification command runner; `--dry-run` paths
for `github-check` and `pr-comment` exercise
the readiness + payload helpers without making
GitHub API calls; the `github-workflow
validate` profiles exercise the validator
against opt-in workflow templates.

**The CLI smoke matrix is not required to pass
in this checklist batch.** It is the release
slice's responsibility to run it. This memo
pins what the matrix must include so the
release slice can be authored against a stable
contract.

**No `--send` paths in the smoke matrix.** The
GitHub Check / PR comment `--send` modes
require operator-supplied tokens and live
GitHub repos; they are exercised by contract
tests against fake transports and by operators
adopting the opt-in workflow templates, not by
the release slice's smoke matrix.

## Documentation Completeness

Beta requires the following docs to exist and
be consistent with the shipped behaviour:

- **README.md** — front door; includes
  installation hint, the beta-readiness
  summary, the three resolved blockers, and
  pinned reminders from each policy memo.
- **CHANGELOG.md** — chronological release
  notes covering every shipped batch.
- **docs/strategy/beta-readiness-classic-parity-review.md**
  — the parent review that named the three
  blockers.
- **docs/strategy/source-write-reconciliation-policy-decision.md**
  — beta source-write policy.
- **docs/strategy/watcher-path-freshness-policy-decision.md**
  — beta watcher / path freshness policy.
- **docs/strategy/beta-release-readiness-checklist.md**
  — this memo.
- **docs/strategy/github-review-surfaces-parity-review.md**
  + **docs/strategy/verification-github-trust-boundary-safety-review.md**
  — the GitHub review surface arc
  declarations (beta-complete + beta-stable).
- **docs/strategy/classic-behavior-roadmap.md**
  + **docs/strategy/roadmap.md** — release-
  facing roadmaps that list shipped + pending
  slices.
- **docs/strategy/classic-guarantees-audit.md**
  + **docs/strategy/classic-alignment-map.md**
  — the classic-guarantee tracking docs.
- **docs/concepts/verification-runs.md** +
  **docs/concepts/proof-report-publication.md**
  + **docs/concepts/agent-operating-contract.md**
  + **docs/concepts/freshness-and-invalidation.md**
  — operator-facing concept docs for the
  proof / freshness / agent contract surfaces.

**All listed docs were verified to exist at
the time this memo was written.** The work
order confirmed 14 supporting docs; this memo
records the verification as part of its
shipped artefact set.

**Docs completeness is necessary but not
sufficient.** The release slice must
additionally confirm that no doc references a
behaviour that the release SHA does not
provide (e.g., no doc claims `reconcile
apply` works; no doc claims a watcher daemon
exists).

## Known Beta Limitations

Beta users must be told about these
limitations **before** they adopt Rekon:

| Limitation | Beta Posture |
| --- | --- |
| source-write apply | not available |
| watcher daemon | not available |
| hosted GitHub App | not available |
| active workflows | not installed automatically |
| GitHub writes | opt-in only |
| Windows process-tree kill | direct-child-only |
| full classic parity | not claimed |

Additional limitations carried forward from
the policy memos:

- **`PathFreshnessReport` reserved but not
  implemented.** The artifact type name is
  pinned by the watcher / path freshness memo;
  no runtime registration ships in beta.
- **`ReconciliationApplyReport` reserved but
  not implemented.** Same pattern; pinned by
  the source-write policy memo.
- **`source:write` permission reserved but not
  registered.** Same pattern.
- **`paths` and `events` invalidation rules
  remain public intent.** Capability manifests
  may declare them; no runtime engine
  evaluates them in beta.
- **No bounded-retry on GitHub API publishers
  yet.** PR comment publisher retries are
  documented as post-beta polish (per the
  parity review).
- **No same-repo `pull_request` guard
  enforcement yet.** Fork denial relies on the
  trigger list + validator profile + runtime
  readiness; the explicit same-repo check is
  post-beta polish.
- **No memory promotion / supersession.** The
  memory selection + curation surface is
  beta-ready; automatic promotion remains
  post-beta maturity work.
- **No deeper rule catalog expansion in beta.**
  The shipped rule packs cover the canonical
  alpha fixtures; broader catalogs are post-
  beta breadth work.

**Each limitation is disclosed.** Beta users
discovering these as apparent gaps should
find them in the docs they were given, not
through trial and error.

## Release Stop Conditions

| Stop Condition | Outcome |
| --- | --- |
| any required audit fails | do not release |
| any required smoke fails | do not release |
| version bump missing in release slice | do not publish |
| known limitations not documented | do not announce beta |
| accidental npm publish | stop and document incident |

**Other stop conditions:**

- **Hidden source-write behaviour.** Any
  surface that mutates source files without
  the explicit operator command path defined
  by the source-write policy memo blocks
  release.
- **Hidden background refresh.** Any surface
  that triggers `rekon refresh` autonomously
  blocks release.
- **Hidden artifact mutation.** Any background
  process (watcher or otherwise) that writes
  to `.rekon/artifacts/**` outside an explicit
  operator command blocks release.
- **Mixed-version workspace.** Any `@rekon/*`
  package's `version` field that doesn't match
  the root version blocks release.
- **Audit-mismatched exports.** Any
  `package.json` `exports` field that doesn't
  resolve in `audit-package-exports.mjs`
  blocks release.
- **License drift.** Any workspace whose
  license field doesn't match `Apache-2.0`
  blocks release.
- **Failing dogfood regression.** The optional
  `codebase-intel-classic` dogfood regression
  (gated by `REKON_DOGFOOD_CLASSIC_ROOT`) is
  not a release blocker per se, but a failing
  dogfood result must be triaged before
  release.

## Beta Readiness Decision

**With this checklist pinned and the
mandatory verification commands passing on
this commit, Rekon is beta-ready.**

The decision is conditional on the audit /
smoke matrix this batch itself runs. The
release slice re-runs the same matrix on the
release SHA; a passing result there is the
final pre-publish gate.

**Beta-ready means:**

- All three beta blockers from the parity
  review are resolved.
- The mandatory verification commands pass on
  main.
- The CLI smoke matrix is pinned as the
  release-time contract.
- The known limitations are documented.
- The release stop conditions are pinned.
- The next-step release slice is authorable
  against a stable contract.

**Beta-ready does not mean:**

- Beta has been released.
- The npm package has been published.
- A git tag has been created.
- A GitHub Release has been announced.
- Full classic parity has been achieved.

The release slice (next) is where the actual
beta release candidate is composed.

## Follow-Up Work

**Recommended next slice: Beta release
candidate execution plan.**

That slice's purpose:

- Execute the pinned checklist against main
  on the release SHA.
- Run all mandatory verification commands +
  the CLI smoke matrix.
- Confirm the package / version state.
- Decide the exact beta version (`0.1.0-beta.0`
  or successor).
- Prepare an explicit version-bump + npm-
  publish work order if approved.
- **Still avoid npm publish unless the
  operator explicitly authorises it.** The
  execution plan is a dry-run + readiness
  declaration; the actual publish is the work
  order it produces.

After the release execution slice, post-beta
work proceeds against the deferred surfaces
the parity review + the policy memos already
named:

- **Source-write apply roadmap** (post-beta):
  patch preview artefact → apply permission /
  rollback design memo → apply implementation
  → source-write safety review (4 slices).
- **Path freshness + watcher roadmap** (post-
  beta): path freshness artefact slice →
  watcher daemon design memo → watcher
  implementation → watcher / path freshness
  safety review (4 slices).
- **Hosted GitHub App** (post-beta product
  surface).
- **Deeper rule catalog expansion** (post-beta
  breadth work).
- **Memory promotion / supersession** (post-
  beta maturity work).
- **PR comment publisher refinements**
  (post-beta polish: bounded retry, same-
  repo `pull_request` guard).
- **Windows process-tree kill** (post-beta
  platform polish).

**Implementation Sequence:**

| Step | Slice | Status |
| --- | --- | --- |
| 1 | **Beta release readiness checklist memo (this memo)** | ✅ **Shipped** |
| 2 | Beta release candidate execution plan | Next slice (release-readiness execution) |
| 3 | Beta release (explicit operator work order) | Subsequent — applies version bump + invokes publish |
| 4 | Source-write apply roadmap (4 post-beta slices) | Post-beta |
| 5 | Path freshness + watcher roadmap (4 post-beta slices) | Post-beta |
| 6 | Post-beta breadth / maturity / polish work | Ongoing |

**The next slice is the beta release
candidate execution plan**, not the publish
itself. The publish is the explicit operator
work order step 2 produces, not step 2 itself.
