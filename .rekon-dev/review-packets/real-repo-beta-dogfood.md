# Review Packet — Real-Repo Beta Dogfood Validation

**Slice:** `real-repo-beta-dogfood`
**Sequence position:** Step 4 of the post-blocker
release sequence pinned by the
[Beta Release Readiness Checklist](../../docs/strategy/beta-release-readiness-checklist.md)
+ advanced by the
[Beta Release Candidate Execution Plan](../../docs/strategy/beta-release-candidate-execution-plan.md)
+ the
[Beta Version Bump Execution Report](../../docs/strategy/beta-version-bump-execution-report.md).
**Batch type:** Release-validation (real-repo dogfood)
batch. **No runtime behaviour change.** No new
package, no new CLI command, no new helper, no
workflow-template change, no validator profile
change, no GitHub API call, no `npm publish`, no
version bump, no release tag, no GitHub Release, no
active workflow YAML, no mutation of committed
examples.

## CHANGES MADE

1. **Executed the dogfood command matrix against a
   temp copy of the Rekon repository itself** (489
   files / 7.8 MB rsync copy; `node_modules`,
   `dist`, `.tsbuildinfo`, `.rekon` excluded; `npm
   ci` + `npm run build` succeeded inside the
   dogfood copy). The matrix exercised every CLI
   surface listed by the work order: init, refresh,
   artifacts validate/freshness, findings
   filter/filter-health/list, issues
   adjudicate/list, coherency delta, publish
   proof/architecture/agent-contract, resolve
   preflight, intent work-order, verify run
   dry-run/execute, verify result from-run,
   republish, github-check + pr-comment dry-runs,
   workflow validators × 4, final
   validate/freshness.
2. **Two genuine dogfood wins** (vs. the smaller
   example fixture used by Batches 30 + 31):
   - `verify run --execute` actually ran real
     commands (`npm run typecheck` + `npm run test`
     + `npm run build`) and all 3 **passed**. The
     fixture smokes had recorded this surface as
     failed-as-documented because the fixture has
     no real test commands; the dogfood proves the
     runner works end-to-end on a real monorepo.
   - `publish github-check --dry-run` propagated
     `conclusion: success` end-to-end. The fixture
     smokes had recorded `conclusion: failure`; the
     dogfood proves the conclusion correctly flips
     when verification actually passes.
3. **New strategy memo** at
   [`docs/strategy/real-repo-beta-dogfood-report.md`](../../docs/strategy/real-repo-beta-dogfood-report.md)
   records the full dogfood run. Contains all 13
   required headings (Decision Summary, Target
   Repository, Pre-Dogfood Verification, Dogfood
   Command Matrix, Artifact Results, Finding And
   Issue Results, Verification Results, Publication
   Results, GitHub Review Dry-Runs, Workflow
   Validator Results, Known Limitations Observed,
   Dogfood Decision, What This Does Not Do,
   Follow-Up Work). Contains the pre-dogfood
   verification table (9 rows), dogfood command
   table (24 rows: 22 distinct commands + 2 final
   validation re-runs), artifact summary table (19
   types / 36 artefacts), known limitations table
   (10 rows). Pins all six required statements
   (no publish; no version change; no git tag; no
   GitHub Release; temp copy of a real repo; next
   publish requires explicit operator
   authorization).
4. **New docs test** at
   `tests/docs/real-repo-beta-dogfood-report.test.mjs`
   pinning the 15 required assertions (memo
   existence; all 13 required `##` headings; six
   required statements verbatim; four diagnostic-
   table assertions; Dogfood Decision recorded;
   CHANGELOG mention; review-packet PURPOSE
   PRESERVATION CHECK).
5. **Cross-doc updates:**
   - [`docs/strategy/beta-release-candidate-execution-plan.md`](../../docs/strategy/beta-release-candidate-execution-plan.md)
     advances its implementation sequence to mark
     the dogfood shipped.
   - [`docs/strategy/beta-version-bump-execution-report.md`](../../docs/strategy/beta-version-bump-execution-report.md)
     advances its implementation sequence.
   - [`docs/strategy/beta-release-readiness-checklist.md`](../../docs/strategy/beta-release-readiness-checklist.md)
     advances its implementation sequence.
   - [`docs/strategy/roadmap.md`](../../docs/strategy/roadmap.md)
     gains a new completed-slice entry.
   - [`docs/strategy/classic-behavior-roadmap.md`](../../docs/strategy/classic-behavior-roadmap.md)
     gains a "Shipped" entry for the dogfood.
6. **README + CHANGELOG entries.**

## PUBLIC API CHANGES

- **None.** This is a release-validation + docs
  batch.
- No new exports from any `@rekon/*` package.
- No new CLI command, no new CLI flag.
- No new validator profile, no new issue code.
- No new workflow template.
- No new artifact type.
- No new capability package.
- No new role / permission.
- **No `package.json` `version` field mutation**
  (root or workspace). The package versions
  remain `0.1.0-beta.0` exactly as set by
  Batch 31.

## PURPOSE PRESERVATION CHECK

The dogfood validates + records observations; it
preserves every existing invariant:

- **Root + workspace versions.** Unchanged
  (still `0.1.0-beta.0`).
- **npm publish state.** Unchanged. No publish
  has occurred. No release tag exists. No
  GitHub Release has been created.
- **Workflow templates.** Unchanged. All four
  were validated; none was modified.
- **Validator profiles.** Unchanged.
- **Audit + smoke scripts.** Unchanged.
- **Verification runner / proof surfaces /
  GitHub publishers.** Unchanged. The dogfood
  proves they behave correctly end-to-end on a
  real monorepo.
- **Source-write policy + watcher / path
  freshness policy.** Unchanged. The dogfood
  made zero source writes; the dogfood
  refresh was an explicit operator command.
- **Beta release readiness checklist.**
  Unchanged.
- **Canonical-truth invariant.** Reinforced.
  The GitHub Check dry-run payload includes
  the "GitHub status is not canonical truth;
  Rekon artifacts remain canonical" reminder
  verbatim.
- **No-background-mutation invariant.**
  Reinforced. No background process ran during
  the dogfood.
- **No-auto-resolution invariant.** Reinforced.
  The finding-status / lifecycle chain
  identified 1 active item and did not
  auto-resolve it.
- **No-source-write-without-explicit-command
  invariant.** Reinforced. The dogfood made
  zero writes to source files; only the
  dogfood's own `.rekon/artifacts/**` tree was
  written, and that lives under the temp
  fixture root.
- **No-token-leak invariant.** Reinforced. No
  GitHub API call was made; both publishers
  ran in `--dry-run` mode.
- **Committed examples unmutated.**
  Reinforced. The dogfood targeted the Rekon
  repo itself (not the `examples/simple-js-ts`
  fixture), and the target was a `mktemp -d`
  copy.

## CODEBASE-INTEL ALIGNMENT

- **Classic real-repo guarantee preserved.**
  `codebase-intel-classic` worked on real
  codebases, not just fixtures. The dogfood
  proves Rekon does the same: the CLI can
  initialize, refresh, evaluate, filter,
  adjudicate, plan, verify, and publish against
  a real 20-workspace TypeScript monorepo
  without crashing, corrupting artefacts, or
  producing unreadable publications.
- **Classic anti-patterns avoided.** The
  dogfood refused to hide its observations
  (every command's actual output is recorded);
  refused to publish; refused to bump versions;
  refused to mutate committed examples;
  refused to write its dogfood artefacts back
  into the committed repo.
- **Capability model:** unchanged.
- **Conformance:** unchanged.

## TARGET REPOSITORY

- **Target:** temp copy of the Rekon repository
  itself.
- **SHA:** `83ba7237a2a2292b684fed314a58b4196de2fd28`
  (matches primary `main`).
- **Setup:** `rsync` copy excluding
  `node_modules`, `dist`, `*.tsbuildinfo`,
  `.rekon`. 489 files / 7.8 MB.
- **Install:** `npm ci` (44 packages; 0
  vulnerabilities; `EBADENGINE` warning for host
  Node 25.9.0 vs. declared `^20.12 || ^22 ||
  ^24` — non-blocking).
- **Build:** `npm run build` succeeded across
  all 20 workspaces.
- **CLI used:** `packages/cli/dist/index.js`
  from the **primary** repo at version
  `0.1.0-beta.0`.

## COMMAND MATRIX

24 entries (22 distinct commands + 2 final
validation re-runs). Every command returned a
parseable JSON response. No CLI crash. No
artifact corruption.

**Headline results:**

- `refresh`: 14 lifecycle steps; `status:
  passed`; `freshness: fresh`; no missing
  artifacts.
- `findings filter`: 134 filtered (all
  `test-file`), 1 kept; `filterRate: 0.9926`;
  0 filter-health alerts.
- `coherency delta`: 1 active item (the
  intentional `import-boundary-rule-pack`
  demo fixture).
- **`verify run --execute`: `status: passed`,
  3/3 commands passed** (`npm run typecheck`:
  exit 0 / 280 ms; `npm run test`: exit 0 /
  37 246 ms; `npm run build`: exit 0 /
  2 214 ms).
- **`verify result from-run`: `status:
  passed`, 3/3 commands recorded as passed.**
- **`publish github-check --dry-run`:
  `conclusion: success`; `output.title:
  "Verification: passed (fresh)"`; 6 cited
  refs; no network call.**
- `publish pr-comment --dry-run`:
  `wouldPublish: false`; 5 expected readiness
  gaps; no network call.
- All 4 workflow validators: `valid: true`,
  0 issues each.
- Final `artifacts validate` (after all
  smokes): `valid: true`, 0 issues.

## ARTIFACT RESULTS

Total: **36 artefacts across 19 types**
written to the dogfood's `.rekon/artifacts/**`
tree. Every artefact validated clean. Notable
counts: 7 Publications (proof, architecture,
agent-contract; ×2 each pre/post-verify; +1
from refresh's own publish.architecture
step); 4 IntelligenceSnapshots; 3 GraphSlices;
2 VerificationRuns (dry-run + execute); 1
VerificationResult.

## VERIFICATION RESULTS

**First real-command pass.** The dogfood's
`verify run --execute` ran `npm run typecheck`
+ `npm run test` + `npm run build` against the
dogfood Rekon copy. All 3 commands passed (exit
0). The VerificationRun was written with
`status: passed`; the derived VerificationResult
also reported `status: passed`. The downstream
proof + Check dry-run + PR comment dry-run all
correctly reflected the passing state.

This is the **first dogfood evidence** that the
verify-runner works end-to-end against real test
commands. Batches 30 + 31's fixture smokes
recorded `status: failed` because the example
fixture has no real test commands; that was
first-class behaviour documented as such, but
it left an open question about the passing path.
The dogfood closes that question.

## GITHUB DRY-RUN RESULTS

- **`publish github-check --dry-run`:**
  `dryRun: true`, `conclusion: success` (vs.
  `failure` in the fixture run), `output.title:
  "Verification: passed (fresh)"`, 6 cited
  refs, no network call. The "GitHub status is
  not canonical truth; Rekon artifacts remain
  canonical" reminder is in the payload
  summary verbatim.
- **`publish pr-comment --dry-run`:**
  `dryRun: true`, `wouldPublish: false`,
  readiness reports 5 expected gaps
  (`not-enabled`, `missing-repository`,
  `missing-pr-number`, `missing-token`,
  `write-permission-not-confirmed`), no
  network call. The readiness contract is
  doing its job by surfacing every gap
  explicitly.

**The dry-run path is honest in both
directions.** It reports `success` when
verification passes (dogfood) and `failure`
when verification fails (fixture). The PR
comment readiness contract continues to refuse
publish without GitHub env + operator
confirmation.

## DOGFOOD DECISION

**Classification: `pass-with-known-limitations`.**

The dogfood run passes on every release-
relevant gate. The "with known limitations"
qualifier reflects only limitations already
disclosed by the upstream policy memos
(source-write apply / watcher / hosted GitHub
App / active workflows / GitHub writes opt-in /
Windows process-tree kill / full classic
parity / aggregate freshness historical stale
entries / host Node engine warning). None of
those is a new defect; every one was
previously documented.

**No release-blocking defect was discovered.**
The dogfood is the last release-validation
gate before publish; the next slice is the
beta npm publish authorization work order.

## TESTS / VERIFICATION

- **New docs suite:**
  `tests/docs/real-repo-beta-dogfood-report.test.mjs`
  — 15 assertions, all passing.
- **Existing suites still passing:** every
  prior contract / docs suite. Full suite
  expected ≥ 1695 passed / 1 skipped (1680
  prior + 15 new).
- **Audits / smokes:** all 5 pass on the
  primary tree before + after the doc-drop
  commit.
- **No new CLI smoke required in the
  final docs-finalisation pass.** The dogfood
  matrix already ran against the dogfood copy
  and is recorded in the memo.

## INTENTIONALLY UNTOUCHED

- `packages/*/src/**.ts` — unchanged.
- `packages/cli/src/index.ts` — unchanged.
- `@rekon/sdk` conformance — unchanged.
- `@rekon/runtime` artifact category map —
  unchanged.
- `@rekon/kernel-*` — unchanged.
- `ArtifactHeader` shape — unchanged.
- `IntelligenceSnapshot` / `EvidenceGraph` /
  `ObservedRepo` / `FindingReport` /
  `VerificationRun` schemas — unchanged.
- All 21 `package.json` files — unchanged
  (still `0.1.0-beta.0`).
- `package-lock.json` — unchanged.
- All four workflow templates — unchanged.
- All three validator profiles — unchanged.
- `scripts/*.mjs` — unchanged.
- All existing contract tests — unchanged.
- `.github/workflows/*.yml` in the Rekon repo —
  unchanged (still empty).
- The committed `examples/simple-js-ts`
  fixture — unchanged.
- The dogfood's `.rekon/**` tree is NOT
  committed (it lives under the temp `mktemp -d`
  directory; it is intentionally ephemeral).

## RISKS / FOLLOW-UP

- **Risk: an accidental `npm publish` happens
  after the dogfood pass.** Mitigated by the
  verbatim "this batch does not publish to
  npm" + "the next publish step still requires
  explicit operator authorization" statements,
  pinned by the docs test, plus the explicit
  Follow-Up Work section pointing at the
  publish authorization work order (which is
  the only slice allowed to publish).
- **Risk: the dogfood's
  `.rekon/**` artefacts get committed into the
  primary repo by accident.** Mitigated by
  using a `mktemp -d` directory for the
  dogfood root; the dogfood artefacts live
  outside the committed repo's working tree
  and are not stageable from there.
- **Risk: the host Node engine warning
  becomes a release blocker.** Not a blocker
  in itself — the engine declaration is the
  documented support contract; running outside
  it is allowed (just warned). The release
  work order's CI flow uses the in-range Node
  versions explicitly.
- **Risk: the `pass-with-known-limitations`
  classification gets read as `pass` and the
  documented limitations slip in marketing /
  release notes.** Mitigated by the explicit
  Known Limitations Observed table and the
  Dogfood Decision section's enumeration of
  every limitation.
- **Risk: a future contributor adds a
  release-blocking smoke that the dogfood
  didn't exercise.** Mitigated by re-running
  the full dogfood matrix in the publish work
  order's pre-publish pre-flight, on the
  publish SHA.
- **Follow-up — Beta npm publish authorization
  work order (next slice).** First slice
  allowed to invoke `npm publish`, with
  explicit operator authorization.
- **Follow-up — Post-beta source-write apply
  roadmap (4 slices).**
- **Follow-up — Post-beta path freshness +
  watcher roadmap (4 slices).**
- **Follow-up — Post-beta breadth / maturity /
  polish work** (including additional dogfood
  targets such as small external apps,
  non-monorepo single-package projects, and
  graceful-no-evidence handling for non-JS/TS
  projects).

## NEXT STEP

**Beta npm publish authorization work order.**

That work order:

- Re-runs the mandatory verification commands
  + the CLI smoke matrix + (recommended) the
  full dogfood matrix one more time on the
  publish SHA (which equals this batch's
  commit).
- Requires explicit operator authorization
  immediately before `npm publish`.
- Invokes `npm publish --provenance` for each
  workspace package in dependency order.
- Pushes the `v0.1.0-beta.0` git tag only
  after publish succeeds.
- Creates the GitHub Release with the beta
  CHANGELOG entry as the body.
- Confirms the post-publish smoke install
  from npm.

This next work order is the **first one
allowed to publish**.
