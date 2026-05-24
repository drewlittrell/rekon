# Review Packet — Real-Repo Dogfood Cohort Intake Request

**Slice:** `real-repo-cohort-intake-request`
**Sequence position:** Step 7a of the post-blocker
release sequence — the cohort execution batch's
intake substep, triggered when the operator did not
supply concrete repos in the work-order prompt.
The cohort execution (step 7b) remains blocked on
the operator's intake response.
**Batch type:** Strategy / docs / tests only. **No
runtime behaviour change. Does not run the
cohort. No invented repo names.** No new package,
no new CLI command, no new helper, no
workflow-template change, no validator profile
change, no GitHub API call, no `npm publish`, no
version bump, no release tag, no GitHub Release,
no active workflow YAML, no `package.json` /
`package-lock.json` mutation, no source-file
mutation.

## CHANGES MADE

1. **Triggered the work order's explicit stop
   condition.** The Additional Real-Repo Dogfood
   Execution work order says: "If the operator
   has not supplied repos yet: Stop after writing
   a short intake request. Do not invent repo
   names. Do not run the cohort." The operator's
   prompt did not supply concrete repo paths;
   this batch honours the stop condition.
2. **New intake-request memo** at
   [`docs/strategy/real-repo-cohort-intake-request.md`](../../docs/strategy/real-repo-cohort-intake-request.md)
   records the intake questionnaire the operator
   needs to answer before the cohort execution
   can run. Contains: Decision Summary; Why This
   Intake Request Exists; Pre-Cohort Verification
   (run on this commit); What The Operator Needs
   To Supply (5-row intake table with
   placeholders + columns for concrete repo path
   / representative path / optional notes);
   Operator Selection Guidance; Anonymization
   Posture; What Happens Next; What This Does
   Not Do; updated Implementation Sequence
   (step 7a = this intake request, shipped;
   step 7b = cohort execution, blocked on
   operator intake); Follow-Up Work.
3. **Pre-cohort verification was run** before
   writing the intake request (per work-order
   requirement). All 9 mandatory verification
   commands passed on the primary tree at SHA
   `b80be3e`:
   - `npm run typecheck`: pass
   - `npm run test`: pass (1728 / 1 skipped)
   - `npm run build`: pass
   - `git diff --check`: pass
   - `audit-package-exports.mjs`: pass (20
     packages; 0 issues)
   - `audit-license.mjs`: pass (Apache-2.0)
   - `publish-dry-run.mjs`: pass (no publish
     attempted)
   - `install-smoke.mjs`: pass
   - `install-tarball-smoke.mjs`: pass (20
     tarballs; 13 artifact families)
   The cohort itself is blocked on operator
   intake — but the Rekon CLI is ready.
4. **New docs test** at
   `tests/docs/real-repo-cohort-intake-request.test.mjs`
   pinning 10 assertions (memo existence; all
   required headings; intake-table presence with
   all five archetype placeholders; "do not
   invent repo names" verbatim; "no cohort
   target may be Rekon itself" verbatim; "this
   batch does not run the cohort" verbatim;
   step 7b is blocked on operator intake;
   pre-cohort verification recorded; CHANGELOG
   mention; review-packet PURPOSE PRESERVATION
   CHECK).
5. **Cross-doc updates (4 supporting strategy
   docs):**
   - [`docs/strategy/additional-real-repo-dogfood-cohort-plan.md`](../../docs/strategy/additional-real-repo-dogfood-cohort-plan.md)
     implementation sequence advances to mark
     step 7a (intake request) shipped + step 7b
     (cohort execution) as blocked on operator
     intake.
   - [`docs/strategy/no-npm-beta-distribution-policy.md`](../../docs/strategy/no-npm-beta-distribution-policy.md)
     same.
   - [`docs/strategy/roadmap.md`](../../docs/strategy/roadmap.md)
     new completed-slice entry for the intake
     request.
   - [`docs/strategy/classic-behavior-roadmap.md`](../../docs/strategy/classic-behavior-roadmap.md)
     same.
6. **README + CHANGELOG entries.**

## PUBLIC API CHANGES

- **None.** This is a strategy / docs / tests
  batch with the cohort itself unblocked-only-on-
  operator-intake.
- No new exports from any `@rekon/*` package.
- No new CLI command, no new CLI flag.
- No new validator profile, no new issue code.
- No new workflow template.
- No new artifact type.
- No new capability package.
- No new role / permission.
- **No `package.json` `version` field mutation**
  (still `0.1.0-beta.0`).
- **No `package-lock.json` mutation.**

## PURPOSE PRESERVATION CHECK

The intake request is informational + workflow-
gating; it preserves every existing invariant:

- **Beta readiness decision.** Unchanged.
- **No-NPM beta posture.** Unchanged.
- **`0.1.0-beta.0` version coherence.**
  Unchanged.
- **Cohort plan archetypes + command matrix +
  metrics + success criteria + release blocker
  taxonomy.** Unchanged. The intake request
  carries forward every constraint from the
  cohort plan without revising any.
- **No invented repo names.** Honoured. The
  intake request keeps the cohort plan's
  placeholders (`<small-ts-package>`, etc.)
  and explicitly asks the operator to
  substitute concrete repos.
- **No-NPM beta posture continues to forbid
  npm publish.** Reinforced.
- **No source mutation outside `mktemp -d`.**
  Reinforced — the intake request reminds the
  operator that even when they answer, every
  cohort target runs from a temp copy.
- **No-token-leak invariant.** Reinforced. The
  intake request does not collect any GitHub
  tokens / secrets.
- **Anonymization posture.** Pinned. The
  intake request explicitly defaults to
  anonymising private repo names in the cohort
  execution reports unless the operator says
  otherwise.

## CODEBASE-INTEL ALIGNMENT

- **Classic operator-driven validation
  guarantee preserved.** `codebase-intel-classic`
  matured through real-repo dogfood under
  operator direction. The intake request
  applies that posture explicitly: the cohort
  execution waits for the operator to choose
  the targets, rather than the CLI agent
  picking arbitrary public repos.
- **Classic anti-patterns avoided.** The intake
  request refuses to invent repo names; refuses
  to run the cohort without operator input;
  refuses to substitute Rekon itself (already
  covered by the first dogfood); refuses to
  publicise private repo identities without
  operator approval.
- **Capability model:** unchanged.
- **Conformance:** unchanged.

## COHORT TARGETS

**None.** The cohort intake table is empty
because the operator has not supplied
concrete repos. The memo records the empty
intake table with placeholders so the
operator can fill it in.

## COMMAND MATRIX

**Not executed in this batch.** The command
matrix is pinned in the
[Additional Real-Repo Dogfood Cohort Plan](../../docs/strategy/additional-real-repo-dogfood-cohort-plan.md);
it is the cohort execution batch's
responsibility to run it once the operator
supplies targets.

This batch did run the **pre-cohort
verification gate** (the 9 mandatory
verification commands from the cohort plan).
All 9 passed; results recorded in the intake
request's "Pre-Cohort Verification" section.

## ARTIFACT RESULTS

**None.** No `.rekon/artifacts/**` were
written by this batch beyond what the
pre-cohort verification + audits / smokes
naturally produce (none of which is
committed; they live in `mktemp -d` install
smoke temp directories that this batch does
not touch beyond running the scripts).

## VERIFICATION RESULTS

**None from the cohort itself** (not run).
The pre-cohort verification's `npm run test`
result is 1728 passed / 1 skipped (matches the
post-Batch-34 count + 0 new from this batch
until the docs test below lands; once the
docs test is added it advances to 1738 / 1).

## GITHUB DRY-RUN RESULTS

**None.** No GitHub publishers ran in this
batch. (They will run in the cohort
execution batch's per-target representative-
path matrix.)

## DOGFOOD DECISION

**Not applicable.** No cohort was run. The
**intake decision** is: the cohort is
blocked on operator intake; the
[intake-request memo](../../docs/strategy/real-repo-cohort-intake-request.md)
records what the operator needs to supply.

## TESTS / VERIFICATION

- **New docs suite:**
  `tests/docs/real-repo-cohort-intake-request.test.mjs`
  — 10 assertions, all passing.
- **Existing suites still passing:** every
  prior contract / docs suite. Full suite
  expected ≥ 1738 passed / 1 skipped (1728
  prior + 10 new).
- **Audits / smokes:** all 5 pass on the
  primary tree (pre-intake verification +
  re-verification after the docs drop).
- **No CLI smoke required in the
  docs-finalisation pass.** The cohort
  execution batch will run the per-target
  CLI smoke matrix once operator intake is
  available.

## INTENTIONALLY UNTOUCHED

- `packages/*/src/**.ts` — unchanged.
- `packages/cli/src/index.ts` — unchanged.
- `@rekon/sdk` conformance — unchanged.
- `@rekon/runtime` artifact category map —
  unchanged.
- `@rekon/kernel-*` — unchanged.
- All 21 `package.json` files — unchanged
  (still `0.1.0-beta.0`).
- `package-lock.json` — unchanged.
- All four workflow templates — unchanged.
- All three validator profiles — unchanged.
- `scripts/*.mjs` — unchanged.
- All existing contract tests — unchanged.
- `.github/workflows/*.yml` in the Rekon
  repo — unchanged (still empty).
- The committed `examples/simple-js-ts`
  fixture — unchanged.
- The `docs/strategy/real-repo-cohort/`
  directory — **not created** (it's the
  cohort execution batch's responsibility,
  not this intake batch's).
- The `docs/strategy/real-repo-cohort-summary.md`
  file — **not created** (same).
- The `.rekon-dev/review-packets/additional-real-repo-dogfood-execution.md`
  file — **not created** (same).
- The `tests/docs/additional-real-repo-dogfood-execution.test.mjs`
  file — **not created** (same).

## RISKS / FOLLOW-UP

- **Risk: a future agent reads this batch and
  starts inventing repo names "to keep
  momentum."** Mitigated by the verbatim "Do
  not invent repo names" + "this batch does
  not run the cohort" + "No invented repo
  names" statements, pinned by the docs
  test.
- **Risk: the cohort plan gets re-read as if
  step 7 has been executed.** Mitigated by
  the updated implementation sequence in
  five places (intake request memo + cohort
  plan + no-NPM policy + master roadmap +
  classic-behavior-roadmap) that explicitly
  show step 7a (intake request) ✅ +
  step 7b (cohort execution) blocked on
  operator intake.
- **Risk: operator anonymisation gets
  forgotten when the cohort actually runs.**
  Mitigated by the intake request's
  Anonymization Posture section pinning
  "default to anonymise unless the operator
  says otherwise."
- **Risk: cohort execution batch silently
  swaps in Rekon itself or one of the
  shipped `examples/*` fixtures.**
  Mitigated by the verbatim "No cohort
  target may be Rekon itself" statement
  carried forward from the cohort plan +
  the intake request's "Disallowed targets"
  note.
- **Follow-up — Operator intake response.**
  The operator answers the intake table
  with concrete repo paths + representative
  paths + anonymisation preferences. Until
  the operator responds, step 7b stays
  blocked.
- **Follow-up (after operator intake) —
  Additional real-repo dogfood execution.**
  Substitutes operator-selected repos for
  each placeholder; runs the cohort plan's
  command matrix; writes per-target reports
  + cohort summary + cohort execution
  review packet + cohort execution docs
  test.
- **Follow-up — Post-beta source-write apply
  roadmap (4 slices).** Independent of the
  cohort; can proceed in parallel.
- **Follow-up — Post-beta path freshness +
  watcher roadmap (4 slices).** Independent
  of the cohort.
- **Follow-up — Post-beta breadth / maturity
  / polish work.** Independent of the
  cohort.

## NEXT STEP

**Wait for operator intake response.**

The intake request specifies exactly what the
operator needs to supply (a 5-row table with
at least 3 distinct concrete repos + a
representative path for each + an
anonymisation preference). Once the operator
responds, the **additional real-repo dogfood
execution** batch can run:

- Substitutes the operator's concrete repos
  for each archetype placeholder.
- Runs the per-target setup + core matrix +
  representative-path matrix + workflow
  validator matrix.
- Records all 27 metrics per target.
- Classifies each target as `pass`,
  `pass-with-known-limitations`, or
  `blocked`.
- Writes per-target reports under
  `docs/strategy/real-repo-cohort/`.
- Writes the cohort summary at
  `docs/strategy/real-repo-cohort-summary.md`.
- Writes the cohort execution review packet
  + the cohort execution docs test.
- **Still does not publish to npm, bump
  versions, create a git tag, or create a
  GitHub Release.** The no-NPM beta posture
  stays in force.

If the operator's intake response signals
they would rather work on a different slice
first (e.g., post-beta source-write apply
roadmap, or post-beta breadth / maturity /
polish), the cohort execution can wait.
None of the post-beta tracks blocks on the
cohort.

**No npm publish during beta. Beta is
private / local / repo-based. At least three
distinct real repositories must be exercised
before any post-beta publish reconsideration.
No invented repo names. The cohort was not
run in this batch.**
