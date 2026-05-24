# Additional Real-Repo Dogfood Cohort Plan

## Decision Summary

**Plan a 5-archetype cohort of real-repo dogfood
targets to run against the local-built Rekon CLI
at version `0.1.0-beta.0`.** The cohort exercises
every documented surface against operator-selected
repositories that cover the realistic shapes Rekon
beta users are most likely to operate against.

**This batch ships the plan only — it does not
run the cohort.** The cohort execution is the
next slice's responsibility.

**Pinned reminders carried forward from the
[No-NPM Beta Distribution Policy](no-npm-beta-distribution-policy.md):**

- **No npm publish during beta.**
- **Beta is private / local / repo-based** —
  source checkout → `npm ci` → `npm run build` →
  invoke `node packages/cli/dist/index.js …`
  against the target repo.
- **At least three distinct real repositories**
  must be exercised before any post-beta publish
  reconsideration.
- **Findings are acceptable outcomes** when
  recorded honestly.
- **Failed verification is acceptable** when the
  `VerificationRun` + `VerificationResult`
  accurately record the failed proof and
  `artifacts validate` remains clean.
- **`artifacts validate: invalid` is a release
  blocker.**

The [Real-Repo Beta Dogfood Report](real-repo-beta-dogfood-report.md)
already recorded the first dogfood (Rekon itself
at SHA `83ba723`) as
`pass-with-known-limitations`. This plan defines
the next cohort so the second-through-Nth
dogfoods are deliberate, comparable, and
analysable — not ad-hoc.

## Why This Plan Exists

One successful dogfood pass against a single
real repo (Rekon itself) is useful but
**insufficient** to validate a private / local
beta across the realistic shapes beta users are
likely to operate against. The
[No-NPM Beta Distribution Policy](no-npm-beta-distribution-policy.md)
explicitly pinned "more real-repo dogfood is
required before any post-beta publish
reconsideration" — but without a cohort plan,
additional dogfood risks becoming:

- **Ad hoc.** Each run targets whatever
  repository happens to be available, with no
  shared command matrix.
- **Incomparable.** Each report records
  different metrics; no apples-to-apples
  comparison across archetypes.
- **Biased.** A cohort that only runs against
  TypeScript monorepos (like Rekon itself)
  doesn't surface JS-only or mixed-language
  behaviour gaps.
- **Self-confirming.** A cohort that only
  runs against well-organised repos doesn't
  surface what happens against the kind of
  repos beta users actually have.

A planned cohort fixes those failure modes by:

1. **Naming the archetypes deliberately** —
   five shapes that span the realistic beta
   user base (small TS package, medium
   monorepo, Next.js / React app, mixed JS/TS,
   existing-workflows repo).
2. **Pinning a shared command matrix** so
   every target runs the same surfaces and
   produces comparable artefact + finding +
   verification + publication shapes.
3. **Pinning the metrics each report must
   capture** so the cohort report can compare
   across targets.
4. **Pinning the success / blocker
   taxonomy** so the cohort execution can
   classify outcomes consistently.

The point is not to **pass** every target on
the first try — the point is to **see**
honestly what happens across the cohort and
decide what (if anything) needs fixing before
the no-NPM posture is revisited.

## Current Beta Distribution Posture

Carried forward from the
[No-NPM Beta Distribution Policy](no-npm-beta-distribution-policy.md):

- **No npm publish during beta.** Beta is a
  validated product / checklist state, not an
  npm-published package state.
- **Beta is private / local / repo-based.**
  Distribution path: source checkout → `npm
  ci` → `npm run build` → invoke `node
  packages/cli/dist/index.js …` against the
  target repo.
- **`0.1.0-beta.0` remains the internal /
  repo version for beta validation.**
- **Workflow templates** live in
  `docs/examples/workflows/*.yml`; operators
  copy them into their own repos manually.
  No active `.github/workflows/*.yml` in the
  Rekon repo itself.
- **GitHub publishers** (`publish github-check`,
  `publish pr-comment`) only run in `--dry-run`
  mode during dogfood unless the operator
  explicitly sets up GitHub env + tokens.

The cohort plan respects every one of these
pinned reminders. **No cohort target may
trigger npm publish or any GitHub `--send`
flow.**

## Cohort Archetypes

**Five archetypes** that together cover the
realistic shapes Rekon beta users are most
likely to operate against. The cohort must
include **at least three distinct real
repositories**, drawn from this archetype list,
and may consolidate archetypes onto a single
repo where it genuinely covers multiple shapes
(documented explicitly).

| Archetype | Placeholder | Why It Matters |
| --- | --- | --- |
| Small TypeScript package | `<small-ts-package>` | validates package-scale local loop; one workspace; minimal OwnershipMap; smallest viable verification target |
| Medium monorepo | `<medium-monorepo>` | validates workspace / package breadth without Rekon-itself bias; tests `CapabilityMap` projection over multiple workspaces; tests intra-monorepo dependency graph slices |
| Next.js / React app | `<nextjs-app>` | validates route / app / front-end patterns; tests the import-boundary rule pack against `app/` + `pages/` + `components/` structure; tests graph-aware filters over a non-monorepo |
| Mixed JS/TS repo | `<mixed-js-ts-repo>` | validates language mix; tests the JS/TS evidence provider's behaviour when both `.js` and `.ts` files coexist without enforced module boundary; tests filter behaviour over partial typing |
| Existing GitHub workflows repo | `<github-workflows-repo>` | validates workflow-adjacent review surfaces; tests `verify github-workflow validate` against operator-supplied (not Rekon-supplied) workflow YAML; tests that Rekon's workflow templates coexist with pre-existing operator workflows |

**Placeholders are intentional.** The plan does
not hard-code private repository names because
the operator will select specific targets at
cohort-execution time. The cohort execution
work order is where the operator substitutes
concrete repos for each placeholder.

**Single-repo consolidation rules:**

- A repo that legitimately covers multiple
  archetypes (e.g., a Next.js app that is also
  a mixed JS/TS repo) may stand in for both
  archetypes if documented explicitly in the
  cohort execution report.
- The cohort must still include at least **three
  distinct real repositories** even if some
  archetypes consolidate.
- No cohort target may be Rekon itself (the
  first dogfood already covered that — the
  cohort is about **broader** evidence).

**Suggested operator selection criteria:**

- Prefer repos the operator already uses
  regularly (familiarity reduces interpretation
  cost).
- Prefer repos with at least one real
  verification target (`npm test`, `pnpm
  test`, `yarn test`, etc.) so `verify run
  --execute` exercises a real command.
- Prefer repos where the operator has commit
  history visibility (so the operator can
  interpret findings without external context).
- Avoid repos with secrets / proprietary code
  the operator does not want recorded in
  artefacts. (Cohort artefacts live under
  `mktemp -d`; they're not committed; but
  operator caution still applies.)
- Avoid repos whose `npm ci` would take more
  than ~10 minutes (cohort overhead).

## Command Matrix

The cohort execution work order runs **the
same command matrix** against every target.
The matrix mirrors the first dogfood's matrix
(see
[Real-Repo Beta Dogfood Report](real-repo-beta-dogfood-report.md))
so results are directly comparable.

**Setup per target (operator-substituted
placeholders):**

```sh
REKON_ROOT="/path/to/rekon"           # the Rekon checkout at 0.1.0-beta.0
TMP_DOGFOOD="$(mktemp -d)"
TARGET_REPO="<repo-url-or-path>"      # operator-supplied
TARGET_NAME="<short-name>"            # e.g., "small-ts-package"

# Prefer git clone --local --no-hardlinks when the source is a local checkout:
git clone --local --no-hardlinks "$TARGET_REPO" "$TMP_DOGFOOD/$TARGET_NAME"
# Or rsync when --local isn't available:
# rsync -a --exclude node_modules --exclude dist --exclude .rekon \
#       "$TARGET_REPO/" "$TMP_DOGFOOD/$TARGET_NAME/"

CLI="$REKON_ROOT/packages/cli/dist/index.js"
ROOT="$TMP_DOGFOOD/$TARGET_NAME"

# Install + build the target's own dependencies (the target's tests + build
# need to be runnable for `verify run --execute` to exercise a real command):
( cd "$ROOT" && npm ci && npm run build ) || echo "(install/build failed; record honestly)"
```

**Core matrix (run for every target):**

```sh
node "$CLI" init --root "$ROOT" --json
node "$CLI" refresh --root "$ROOT" --json
node "$CLI" artifacts validate --root "$ROOT" --json
node "$CLI" artifacts freshness --root "$ROOT" --json
node "$CLI" findings filter --root "$ROOT" --json
node "$CLI" findings filter-health --root "$ROOT" --json
node "$CLI" findings list --root "$ROOT" --json
node "$CLI" issues adjudicate --root "$ROOT" --json
node "$CLI" issues list --root "$ROOT" --json
node "$CLI" coherency delta --root "$ROOT" --json
node "$CLI" publish proof --root "$ROOT" --json
node "$CLI" publish architecture --root "$ROOT" --json
node "$CLI" publish agent-contract --root "$ROOT" --json
```

**Representative-path matrix (run for one
representative path per target):**

```sh
REPRESENTATIVE_PATH="<repo-relative-path>"   # operator-selected per target
GOAL="dogfood cohort validation"

node "$CLI" resolve preflight --root "$ROOT" \
  --path "$REPRESENTATIVE_PATH" --goal "$GOAL" --json

node "$CLI" intent work-order --root "$ROOT" \
  --path "$REPRESENTATIVE_PATH" --goal "$GOAL" --json

PLAN_REF="$(node "$CLI" artifacts latest --root "$ROOT" \
              --type VerificationPlan --id-only)"

node "$CLI" verify run --root "$ROOT" --plan "$PLAN_REF" --dry-run --json
node "$CLI" verify run --root "$ROOT" --plan "$PLAN_REF" --execute --json || true

RUN_REF="$(node "$CLI" artifacts latest --root "$ROOT" \
             --type VerificationRun --id-only)"

node "$CLI" verify result from-run --root "$ROOT" --run "$RUN_REF" --json || true

# Republish all three surfaces so they cite the new verification chain:
node "$CLI" publish proof --root "$ROOT" --json
node "$CLI" publish architecture --root "$ROOT" --json
node "$CLI" publish agent-contract --root "$ROOT" --json

# GitHub review dry-runs (no network):
node "$CLI" publish github-check --root "$ROOT" --dry-run --json
node "$CLI" publish pr-comment --root "$ROOT" --dry-run --json

# Final validation:
node "$CLI" artifacts validate --root "$ROOT" --json
node "$CLI" artifacts freshness --root "$ROOT" --json
```

**Representative-path selection guidance:**

- A file the operator recently edited (so the
  finding context is recent / interpretable).
- A file in the "main" module of the repo
  (e.g., `src/index.ts`, `app/page.tsx`,
  `lib/main.js`).
- Avoid generated files (they should be
  filtered out, but skipping them upfront
  reduces noise).
- Avoid test files (also filtered out).

**Workflow validator matrix (run once from the
Rekon repo, not per target — except when the
target contains workflow templates to
validate):**

```sh
node "$CLI" verify github-workflow validate \
  --path "$REKON_ROOT/docs/examples/workflows/rekon-verification.yml" \
  --profile read-only --json

node "$CLI" verify github-workflow validate \
  --path "$REKON_ROOT/docs/examples/workflows/rekon-verification-dry-run.yml" \
  --profile read-only --json

node "$CLI" verify github-workflow validate \
  --path "$REKON_ROOT/docs/examples/workflows/rekon-verification-check-send.yml" \
  --profile github-check-send --json

node "$CLI" verify github-workflow validate \
  --path "$REKON_ROOT/docs/examples/workflows/rekon-pr-comment-send.yml" \
  --profile github-pr-comment-send --json
```

The
`<github-workflows-repo>` archetype is the
exception: it should additionally validate the
operator-supplied workflow YAML (if any).

**No `--send` flow** anywhere in the matrix. No
GitHub API call. No npm publish. No version
bump. No source mutation outside the temp
`mktemp -d` copy.

## Metrics To Record

| Metric | Required |
| --- | --- |
| Target repo archetype | yes |
| Target repo SHA (or rsync-source SHA) | yes |
| Target repo size: package count | yes |
| Target repo size: file count (cheap-to-compute; `find . -type f | wc -l` excluding `node_modules`) | yes |
| Target repo size: JS/TS file count (cheap-to-compute; `find . -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.mjs' -o -name '*.cjs' | wc -l` excluding `node_modules`) | yes |
| `refresh` status | yes |
| `refresh` lifecycle step count | yes |
| `refresh` missing artifact families | yes |
| `artifacts validate` result | yes |
| `artifacts freshness` aggregate status | yes |
| `EvidenceGraph` fact count | yes |
| `FindingReport` finding count | yes |
| `FindingFilterReport` filtered count (+ breakdown by `reason`) | yes |
| `FindingFilterReport` kept count | yes |
| `FindingFilterHealthReport` `filterRate` + alert count | yes |
| `IssueAdjudicationReport` group count (total + active + accepted + ignored + resolved) | yes |
| `CoherencyDelta` remediation queue item count | yes |
| Proof publication: `Publication` id + render success | yes |
| Architecture publication: `Publication` id + render success | yes |
| Agent-contract publication: `Publication` id + render success | yes |
| Resolver preflight: `ResolverPacket` id + risk / required-checks summary | yes |
| `VerificationPlan` id + command count | yes |
| `VerificationRun` (dry-run) status | yes |
| `VerificationRun` (execute) status + per-command exit + per-command durationMs | yes |
| `VerificationResult` status + summary | yes |
| GitHub Check dry-run `conclusion` + cited-refs count | yes |
| PR comment dry-run `wouldPublish` + readiness issue count | yes |
| Workflow validator result per template / profile | yes (where applicable; see Command Matrix) |
| Final `artifacts validate` result | yes |
| Final `artifacts freshness` aggregate status + issue count | yes |
| Unexpected errors (CLI crash, malformed artefact, unreadable publication, token leak, source mutation outside temp copy) | yes |
| Per-target run wall-clock time | yes |

The cohort execution report records all of the
above per target, plus a cohort-level summary
table that compares across targets.

## Success Criteria

The cohort is **successful** if **every** target
meets all of the following:

- `refresh` completes (`status: passed`).
- `artifacts validate` returns `valid: true`,
  0 issues.
- All three publications render (proof,
  architecture, agent-contract) without error.
- Both GitHub dry-runs render without network
  calls (`dryRun: true` in both responses; no
  HTTP call attempted).
- No CLI command crashes.
- No artefact is corrupted (every artefact has
  a valid header + digest).
- No unreadable publication.
- No token leak in any output.
- No source mutation outside the temp copy.

**Acceptable outcomes that are NOT failures:**

| Outcome | Classification | Why Acceptable |
| --- | --- | --- |
| Findings exist | acceptable | Rekon's job is to surface findings; finding ≠ failure |
| Failed `verify run --execute` | acceptable when recorded honestly | first-class behaviour per `docs/concepts/verification-runs.md`; the VerificationRun is still written; `artifacts validate` remains clean |
| `artifacts freshness` aggregate `stale` | acceptable | documented latest-major pattern; historical artefacts carry `newer-input-exists` issues by design |
| `publish pr-comment --dry-run` readiness `false` | acceptable | expected without GitHub env (`not-enabled` / `missing-repository` / etc.); the readiness contract is doing its job |
| `publish github-check --dry-run` `conclusion: failure` | acceptable when VerificationResult is failed | the conclusion propagates honestly from the underlying VerificationResult |
| Slow `verify run --execute` | acceptable | a real repo's tests can take minutes; no time budget is imposed on the target's own test commands |
| Missing artifact family if the target is genuinely lacking it (e.g., no `OwnershipMap` for a single-workspace repo with no `CODEOWNERS`) | acceptable, record explicitly | the lifecycle handles absence honestly |
| `EBADENGINE` install warnings | acceptable, record explicitly | host Node engine may be outside the target's declared range; the engine declaration is the documented support contract |

## Release Blocker Taxonomy

| Outcome | Classification |
| --- | --- |
| `refresh` completes | success |
| `artifacts validate` clean | success |
| All three publications render | success |
| Both GitHub dry-runs render without network | success |
| No CLI crash | success |
| Findings exist | acceptable |
| Failed `verify run --execute` recorded honestly | acceptable |
| `artifacts freshness` aggregate `stale` (historical) | acceptable |
| `publish pr-comment --dry-run` readiness `false` (no env) | acceptable |
| `publish github-check --dry-run` `conclusion: failure` propagating from failed VerificationResult | acceptable |
| `refresh` crash | **release blocker** |
| `artifacts validate` returns `valid: false` | **release blocker** |
| Malformed artefact (header invalid, digest mismatch, path escapes `.rekon/artifacts/**`) | **release blocker** |
| Publication render failure (proof / architecture / agent-contract throws or returns malformed Publication) | **release blocker** |
| CLI crash (process exits non-zero with an unhandled exception, not a documented first-class failure) | **release blocker** |
| Token / log leak (any `GITHUB_TOKEN`-shaped string in any output) | **release blocker** |
| Source mutation outside the temp copy (the target's source tree gets modified outside `mktemp -d`) | **release blocker** |
| Workflow validator returns invalid for a Rekon-supplied template | **release blocker** |
| `verify run --dry-run` mode actually executes commands (the dry-run contract is broken) | **release blocker** |
| `publish github-check --dry-run` or `publish pr-comment --dry-run` makes a network call | **release blocker** |

**Any release blocker** in any target stops
the cohort and triggers a dogfood blocker fix
batch. The cohort can resume only after the
blocker is fixed and re-verified.

**Any non-blocker outcome** is recorded
honestly in the per-target report and the
cohort summary. The cohort is the evidence
gathering surface; classification happens
later.

## Reporting Format

The cohort execution work order produces:

1. **A per-target dogfood report**, one per
   cohort target, at
   `docs/strategy/real-repo-cohort/<target-name>-dogfood-report.md`.
   Each per-target report has the same shape as the
   first
   [Real-Repo Beta Dogfood Report](real-repo-beta-dogfood-report.md)
   (13 required headings), with the
   `## Target Repository`, `## Dogfood Command
   Matrix`, `## Artifact Results`, `## Finding
   And Issue Results`, `## Verification
   Results`, `## Publication Results`, `##
   GitHub Review Dry-Runs`, `## Workflow
   Validator Results`, `## Known Limitations
   Observed`, and `## Dogfood Decision`
   sections customised for the target.

2. **A cohort summary report** at
   `docs/strategy/real-repo-cohort-summary.md`
   that:
   - Lists every target.
   - Surfaces a cohort-level metrics table
     (one row per target; columns mirror the
     "Metrics To Record" table above so
     cross-target comparison is direct).
   - Classifies the cohort as `pass`,
     `pass-with-known-limitations`, or
     `blocked` (using the same classification
     vocabulary as the first dogfood report).
   - Pins follow-up work (any blocker
     becomes a dogfood blocker fix batch;
     any non-blocker observation feeds the
     post-beta breadth / maturity / polish
     work).
   - Re-states the no-NPM beta posture:
     successful cohort does not automatically
     trigger npm publish; revisiting the
     no-NPM policy requires a separate
     explicit operator decision.

3. **A cohort execution review packet** at
   `.rekon-dev/review-packets/additional-real-repo-dogfood-cohort-execution.md`
   capturing the run itself (CHANGES MADE,
   PUBLIC API CHANGES, PURPOSE PRESERVATION
   CHECK, etc.).

4. **A cohort execution docs test** at
   `tests/docs/real-repo-cohort-summary.test.mjs`
   that pins the cohort summary's required
   structure + the no-NPM posture statements.

**The cohort execution work order does not
publish to npm, does not bump versions, does
not create a git tag, and does not create a
GitHub Release** — same constraints as this
plan batch and every previous release-prep
batch.

## What This Does Not Do

This batch **does not**:

- Run the cohort. The cohort execution is the
  next slice's responsibility.
- Hard-code private repository names. The
  cohort archetypes are placeholders; the
  operator substitutes concrete repos at
  cohort-execution time.
- Add `docs/strategy/real-repo-cohort/`
  per-target report files. Those are written
  by the cohort execution work order.
- Add the cohort summary report. Same — that's
  the cohort execution's output.
- Run `npm publish` for any workspace package.
- Run `npm publish --provenance`.
- Edit any `package.json` `version` field
  (still `0.1.0-beta.0` across root + 20
  workspace packages).
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
- Change the no-NPM beta posture. Successful
  cohort does not automatically trigger
  publish; revisiting the no-NPM policy
  requires a separate explicit operator
  decision after the cohort summary lands.

## Follow-Up Work

**Recommended next slice: Additional real-repo
dogfood execution.**

That work order:

- Substitutes operator-selected concrete
  repositories for each archetype placeholder.
- Runs the command matrix defined in this
  plan against every target.
- Records the metrics defined in this plan
  for every target.
- Classifies outcomes using the success /
  blocker taxonomy defined in this plan.
- Writes the per-target dogfood reports + the
  cohort summary report + the cohort
  execution review packet + the cohort
  execution docs test (the reporting format
  defined in this plan).
- Still does not publish to npm, bump
  versions, create a git tag, or create a
  GitHub Release. The no-NPM beta posture
  stays in force.

**If the cohort is `pass` or
`pass-with-known-limitations`** across every
target, the operator can choose to:

- Continue beta with the no-NPM posture
  indefinitely.
- Author additional cohort batches as Rekon's
  rule packs or surfaces mature.
- Open a no-NPM-policy-revision work order
  (would require a new explicit operator
  decision; this plan does not pre-authorise
  one).

**If the cohort is `blocked`**, the operator
authors a dogfood blocker fix batch:

- Reproduces the blocker locally.
- Fixes the underlying runtime / validator /
  publisher / CLI defect.
- Re-runs the affected target's matrix.
- Re-classifies the cohort.

**Other post-beta work** continues
independently of cohort outcomes:

- Post-beta source-write apply roadmap (4
  slices: patch preview → permission +
  rollback design → apply implementation →
  safety review).
- Post-beta path freshness + watcher roadmap
  (4 slices: path freshness artefact →
  watcher daemon design → watcher
  implementation → safety review).
- Post-beta breadth / maturity / polish
  (hosted GitHub App; deeper rule catalog;
  memory promotion / supersession; PR
  comment bounded retry + same-repo
  `pull_request` guard; Windows
  process-tree kill via Job Objects).

**Implementation Sequence (updated):**

| Step | Slice | Status |
| --- | --- | --- |
| 1 | [Beta release readiness checklist memo](beta-release-readiness-checklist.md) | ✅ Shipped |
| 2 | [Beta release candidate execution plan](beta-release-candidate-execution-plan.md) | ✅ Shipped (against SHA `54d1dfd`) |
| 3 | [Beta version bump execution report](beta-version-bump-execution-report.md) | ✅ Shipped (`0.1.0-beta.0` applied) |
| 4 | [Real-repo beta dogfood report](real-repo-beta-dogfood-report.md) | ✅ Shipped (`pass-with-known-limitations`) |
| 5 | [No-NPM beta distribution policy](no-npm-beta-distribution-policy.md) | ✅ Shipped — replaces the previously-planned publish authorization work order |
| 6 | **Additional real-repo dogfood cohort plan (this plan)** | ✅ **Shipped** |
| 7a | [Real-repo dogfood cohort intake request](real-repo-cohort-intake-request.md) | ✅ **Shipped** |
| 7b | [Additional real-repo dogfood execution](real-repo-cohort-summary.md) | ✅ **Shipped** — `pass-with-known-limitations` across 3 distinct real repos (`boundary-contracts`, `structured-evals`, `figma-ds`) covering all 5 archetypes via two documented consolidations; no release blockers |
| 7c | [VerificationPlan missing-script tolerance](verification-missing-script-tolerance.md) | ✅ **Shipped** — first post-beta polish slice surfaced by this cohort; `skipped` is now emitted for `npm \| pnpm \| yarn run <absent-script>` instead of `failed` |
| 7d | [Post-beta dogfood evidence triage decision](post-beta-dogfood-evidence-triage.md) | ✅ **Shipped** — classifies every cohort observation; selects **Option C (watcher / path freshness implementation)** as the next slice |
| 8 | Post-beta source-write apply roadmap (4 slices) | Post-beta — sequence-deferred behind path freshness per the triage memo |
| 9 | Post-beta path freshness + watcher roadmap (4 slices) | Post-beta — **next slice up**: `PathFreshnessReport` artifact + source-state fingerprint skeleton |
| 10 | Post-beta breadth / maturity / polish work | Ongoing |
| 11 | (Optional, deferred) Post-beta npm publish authorization work order | Only after broader real-repo dogfood + an explicit later operator decision reverses the no-NPM policy |

**The next slice is the cohort execution**,
not the publish authorization. The publish
authorization remains optional + deferred;
whether it ever runs is a later decision
contingent on cohort evidence + a separate
explicit operator decision.

**No npm publish during beta. Beta is private
/ local / repo-based. At least three distinct
real repositories must be exercised before
any post-beta publish reconsideration.
Findings are acceptable outcomes. Failed
verification is acceptable when recorded
honestly. `artifacts validate: invalid` is a
release blocker.**
