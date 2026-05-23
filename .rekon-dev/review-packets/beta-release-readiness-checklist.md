# Review Packet — Beta Release Readiness Checklist Memo

**Slice:** `beta-release-readiness-checklist`
**Sequence position:** Third (and final) of three beta
blockers identified by the
[Beta Readiness / Remaining Classic-Parity Review](../../docs/strategy/beta-readiness-classic-parity-review.md).
**Batch type:** Strategy / docs / tests only. **No runtime
behaviour change.** No new package, no new CLI command, no
new helper, no workflow-template change, no validator
profile change, no GitHub API call, no version bump, no
npm publish, no release tag, no active workflow YAML.

## CHANGES MADE

1. **New strategy memo** at
   [`docs/strategy/beta-release-readiness-checklist.md`](../../docs/strategy/beta-release-readiness-checklist.md).
   Pins the final beta release readiness contract.
   **Decision: with this checklist pinned + the
   mandatory verification commands passing on main,
   Rekon is beta-ready. Beta-ready is a checklist
   state, not an npm publish event. The actual
   publish is a separate explicit operator work
   order.** Contains all 13 required headings
   (Decision Summary, Why This Checklist Exists,
   Current Beta Blocker Status, Release Scope,
   Versioning Policy, NPM Publish Policy, Mandatory
   Verification Commands, CLI Smoke Matrix,
   Documentation Completeness, Known Beta
   Limitations, Release Stop Conditions, Beta
   Readiness Decision, Follow-Up Work), the four
   pinned reminder statements, four diagnostic
   tables (beta blocker, verification command,
   known limitations, release stop-condition), the
   pinned CLI smoke matrix, and the implementation
   sequence with the next-slice pointer (beta
   release candidate execution plan).
2. **New docs test** at
   `tests/docs/beta-release-readiness-checklist.test.mjs`
   pinning the 22 required assertions (memo
   existence, all 13 required headings present,
   four pinned reminder statements verbatim, three
   resolved-blocker rows, mandatory verification
   commands, CLI smoke matrix, six known-limitation
   pinned statements, four diagnostic tables,
   CHANGELOG mention, review-packet PURPOSE
   PRESERVATION CHECK).
3. **Cross-doc updates:**
   - [`docs/strategy/beta-readiness-classic-parity-review.md`](../../docs/strategy/beta-readiness-classic-parity-review.md)
     marks the release readiness checklist blocker
     as resolved + points to this memo.
   - [`docs/strategy/source-write-reconciliation-policy-decision.md`](../../docs/strategy/source-write-reconciliation-policy-decision.md)
     updates its implementation sequence to mark
     the third blocker resolved.
   - [`docs/strategy/watcher-path-freshness-policy-decision.md`](../../docs/strategy/watcher-path-freshness-policy-decision.md)
     updates its implementation sequence to mark
     the third blocker resolved.
   - [`docs/strategy/github-review-surfaces-parity-review.md`](../../docs/strategy/github-review-surfaces-parity-review.md)
     adds the beta release readiness checklist
     pointer.
   - [`docs/strategy/verification-github-trust-boundary-safety-review.md`](../../docs/strategy/verification-github-trust-boundary-safety-review.md)
     adds the beta release readiness checklist
     pointer.
   - [`docs/strategy/issue-governance-architecture-decision.md`](../../docs/strategy/issue-governance-architecture-decision.md)
     adds step 64 (beta release readiness checklist
     memo shipped — third blocker resolved).
   - [`docs/strategy/classic-behavior-roadmap.md`](../../docs/strategy/classic-behavior-roadmap.md)
     gains a "Shipped" entry for the beta release
     readiness checklist memo + points to the beta
     release candidate execution plan as the next
     slice.
   - [`docs/strategy/roadmap.md`](../../docs/strategy/roadmap.md)
     gains a new completed-slice entry.
   - [`docs/strategy/classic-guarantees-audit.md`](../../docs/strategy/classic-guarantees-audit.md)
     adds the beta release readiness checklist
     pointer.
   - [`docs/strategy/classic-alignment-map.md`](../../docs/strategy/classic-alignment-map.md)
     adds the beta release readiness checklist
     pointer.
   - [`docs/concepts/verification-runs.md`](../../docs/concepts/verification-runs.md),
     [`docs/concepts/proof-report-publication.md`](../../docs/concepts/proof-report-publication.md),
     [`docs/concepts/agent-operating-contract.md`](../../docs/concepts/agent-operating-contract.md),
     [`docs/concepts/freshness-and-invalidation.md`](../../docs/concepts/freshness-and-invalidation.md)
     add the checklist pointer to their
     Cross-References (the verification / proof /
     agent contract / freshness surfaces are
     beta-ready per the checklist's documentation-
     completeness section).
4. **README + CHANGELOG entries.**

All 14 listed supporting docs in the work order exist in
the repository; none were skipped. The verification step
that confirmed this is documented in the implementation
notes (no missing-doc entry needed).

## PUBLIC API CHANGES

- **None.** This is a strategy / docs / tests batch.
- No new exports from any `@rekon/*` package.
- No new CLI command, no new CLI flag.
- No new validator profile, no new issue code.
- No new workflow template.
- No new artifact type.
- No new capability package.
- No new role / permission.
- **No `package.json` `version` field mutation** (root
  or workspace).

## PURPOSE PRESERVATION CHECK

The memo is informational + policy-pinning; it preserves
every existing invariant:

- **Root + workspace versions.** Unchanged. The memo
  records the current state (`0.1.0-alpha.1`) and
  defers the beta version decision to the release
  slice.
- **npm publish state.** Unchanged. No publish has
  occurred. No release tag exists. No GitHub Release
  has been created.
- **Workflow templates.** Unchanged. The CLI smoke
  matrix references the existing opt-in workflow
  templates by name; no new workflow YAML ships in
  this batch.
- **Validator profiles.** Unchanged. The CLI smoke
  matrix lists the three existing profiles
  (read-only, github-check-send, github-pr-comment-send)
  as the validation surface; no new profile is
  added.
- **Audit + smoke scripts.** Unchanged. The memo
  references the existing
  `scripts/audit-package-exports.mjs`,
  `scripts/audit-license.mjs`,
  `scripts/publish-dry-run.mjs`,
  `scripts/install-smoke.mjs`, and
  `scripts/install-tarball-smoke.mjs` by name.
- **Verification runner / proof surfaces / GitHub
  publishers.** Unchanged.
- **Source-write policy + watcher / path freshness
  policy.** Unchanged. Both upstream policy memos are
  referenced; their decisions remain in force.
- **Canonical-truth invariant.** Reinforced. The
  memo pins that GitHub Checks / PR comments remain
  downstream of artifacts; the release slice must
  preserve this.
- **No-background-mutation invariant.** Reinforced.
  Hidden background refresh blocks release; hidden
  artifact mutation blocks release.
- **No-auto-resolution invariant.** Reinforced.
  Source edits / verification status / GitHub
  publishes do not auto-resolve findings; the
  release slice must preserve this.
- **No-source-write-without-explicit-command
  invariant.** Reinforced. Hidden source-write
  behaviour is a release stop condition.
- **No-token-leak invariant.** Reinforced (carried
  forward from the trust-boundary safety review).
- **No new policy decisions outside the scope of
  this memo.** The actual version decision + the
  publish invocation are intentionally deferred to
  the release slice.

## CODEBASE-INTEL ALIGNMENT

- **Classic product loop preserved at the policy
  level.** The codebase-intel-classic project
  shipped a coherent observe → evaluate → filter →
  adjudicate → plan → verify → publish → review
  loop. Rekon's beta does not claim full classic
  parity; it claims a reliable, installable,
  documented, bounded product surface that
  preserves the classic loop's core guarantees
  (artifact-backed governance; explicit proof and
  verification; downstream GitHub surfaces; clear
  source-write + watcher policies; no automatic
  resolution; no hidden source mutation;
  auditable install / publish readiness).
- **Classic anti-patterns avoided.** The memo
  refuses to declare beta on vibes; refuses to
  conflate audit-passing with publish-readiness;
  refuses to allow accidental publish; refuses to
  conflate beta-ready with full classic parity.
- **Capability model:** unchanged.
- **Conformance:** unchanged.

## CHECKLIST DECISIONS

The four pinned reminder statements:

- Beta readiness is a checklist state, not an npm
  publish event.
- npm publish requires a separate explicit release
  work order.
- No version bump occurs in this checklist batch.
- Known beta limitations must be documented before
  beta is announced.

The pinned versioning policy:

- Current root version: `0.1.0-alpha.1`.
- Beta target naming: `0.1.0-beta.<n>` (the
  specific `<n>` is decided in the release slice).
- Workspace version coherence: every `@rekon/*`
  workspace package must share the same prerelease
  identifier as the root.
- No version bump in this batch.

The pinned npm publish policy:

- No `npm publish` in this batch.
- Publish requires its own work order.
- Publish dry-run is mandatory before publish.
- No automated publish triggers — operator-driven.

The pinned mandatory verification commands (9
commands; all 9 marked yes-required-before-beta).

The pinned CLI smoke matrix (14 commands; the
release slice executes them on fixture inputs).

The pinned known limitations (7 in the table + 8
additional carried forward from the policy memos).

The pinned release stop conditions (5 in the table
+ 8 additional invariants).

## BETA BLOCKER STATUS

| Blocker | Status |
| --- | --- |
| Source-write reconciliation policy | resolved (Option C — preview-first; apply deferred post-beta) |
| Watcher / path freshness policy | resolved (Option C — watcher-lite; no daemon by default) |
| Release readiness checklist | resolved by this memo |

**All three beta blockers identified by the parity
review are now resolved.** With this checklist
pinned and the mandatory verification commands
passing on main, Rekon is beta-ready as the
parity review meant: every blocker closed; every
deferred surface named; every limitation
disclosed.

## KNOWN LIMITATIONS

The seven primary table rows + eight additional
carried-forward limitations are pinned by the
memo and the docs test:

- source-write apply: not available.
- watcher daemon: not available.
- hosted GitHub App: not available.
- active workflows: not installed automatically.
- GitHub writes: opt-in only.
- Windows process-tree kill: direct-child-only.
- full classic parity: not claimed.
- `PathFreshnessReport`: reserved but not
  implemented.
- `ReconciliationApplyReport`: reserved but not
  implemented.
- `source:write`: reserved but not registered.
- `paths` / `events` invalidation rules: public
  intent only.
- PR comment publisher bounded-retry: post-beta
  polish.
- Same-repo `pull_request` guard enforcement: post-
  beta polish.
- Memory promotion / supersession: post-beta
  maturity work.
- Deeper rule catalog expansion: post-beta breadth
  work.

## TESTS / VERIFICATION

- **New docs suite:**
  `tests/docs/beta-release-readiness-checklist.test.mjs`
  — 22 assertions, all passing.
- **Existing suites still passing:** every prior
  contract / docs suite. Full suite expected ≥
  1644 passed / 1 skipped (1622 prior + 22 new).
- **Audits / smokes:** package-exports, license,
  publish-dry-run, install-smoke,
  install-tarball-smoke — all expected to pass
  unchanged. **These are the same five audits
  the checklist itself pins as mandatory.** Beta-
  ready is conditional on all five passing on the
  release SHA.
- **No CLI smoke required in this batch.** The
  CLI smoke matrix is pinned for the release
  slice to execute; this batch does not run it.

## INTENTIONALLY UNTOUCHED

- `packages/capability-docs/src/index.ts` — unchanged.
- `packages/capability-verify/src/index.ts` —
  unchanged.
- `packages/cli/src/index.ts` — unchanged.
- `@rekon/sdk` conformance — unchanged.
- `@rekon/runtime` artifact category map —
  unchanged.
- `@rekon/kernel-*` — unchanged.
- Every workspace `package.json` `version` field —
  unchanged (still `0.1.0-alpha.1`).
- Root `package.json` `version` field — unchanged
  (still `0.1.0-alpha.1`).
- `scripts/audit-package-exports.mjs`,
  `scripts/audit-license.mjs`,
  `scripts/publish-dry-run.mjs`,
  `scripts/install-smoke.mjs`,
  `scripts/install-tarball-smoke.mjs` — unchanged.
- All four workflow templates — unchanged.
- All three validator profiles — unchanged.
- All existing contract tests — unchanged.
- `.github/workflows/*.yml` in the Rekon repo —
  unchanged (still empty).

## RISKS / FOLLOW-UP

- **Risk: checklist drifts from product reality
  before the release slice lands.** Mitigated by
  the docs test pinning the four pinned reminder
  statements, the resolved-blocker rows, the
  mandatory verification commands, the CLI smoke
  matrix, the known-limitation statements, the
  four diagnostic tables, and the next-slice
  pointer.
- **Risk: an accidental `npm publish` happens
  outside the release slice.** Mitigated by the
  verbatim `npm publish requires a separate
  explicit release work order` statement, pinned
  by the docs test and surfaced in every cross-
  referenced doc. Operationally also mitigated by
  the no-automated-publish-triggers policy in
  this memo.
- **Risk: a version bump slips into this batch
  or another strategy batch.** Mitigated by the
  verbatim `No version bump occurs in this
  checklist batch` statement, pinned by the docs
  test. Operationally also mitigated by every
  prior batch's commit body explicitly stating
  "no version bump, no npm publish."
- **Risk: known limitations are not surfaced
  to first beta users.** Mitigated by the verbatim
  `Known beta limitations must be documented
  before beta is announced` statement, pinned by
  the docs test, plus the dedicated Known Beta
  Limitations section + table.
- **Risk: beta gets declared full-classic-parity.**
  Mitigated by the verbatim `full classic parity:
  not claimed` row in the limitations table,
  pinned by the docs test.
- **Follow-up — Beta release candidate execution
  plan (next slice).** Executes the pinned
  checklist against main on the release SHA.
- **Follow-up — Beta release (explicit operator
  work order).** Applies the version bump,
  invokes `npm publish --provenance`, pushes the
  release tag.
- **Follow-up — Post-beta source-write apply
  roadmap (4 slices).**
- **Follow-up — Post-beta path freshness +
  watcher roadmap (4 slices).**
- **Follow-up — Post-beta breadth / maturity /
  polish work** (hosted GitHub App, deeper rule
  catalog, memory promotion, PR comment
  refinements, Windows process-tree kill).

## NEXT STEP

**Beta release candidate execution plan.**

Execute the pinned checklist against main on the
release SHA:

- Run all mandatory verification commands
  (`npm run typecheck`, `npm run test`, `npm run
  build`, `git diff --check`,
  `audit-package-exports`, `audit-license`,
  `publish-dry-run`, `install-smoke`,
  `install-tarball-smoke`).
- Run the release CLI smoke matrix against
  fixture inputs.
- Confirm the package / version state.
- Decide the exact beta version (`0.1.0-beta.0`
  or successor).
- Prepare an explicit version-bump + npm-publish
  work order if approved.
- **Still avoid `npm publish` unless the operator
  explicitly authorises it.** The execution plan
  is a dry-run + readiness declaration; the
  actual publish is the work order it produces.

The execution slice is followed by the beta
release work order itself (the actual publish),
then post-beta source-write apply + path
freshness + watcher roadmaps + polish.
