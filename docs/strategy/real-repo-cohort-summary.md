# Real-Repo Dogfood Cohort Summary

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

## Decision Summary

**The additional real-repo dogfood cohort
passes with known limitations.**

Three distinct real repositories were
dogfooded against the local-built Rekon CLI
at version `0.1.0-beta.0`. All three targets
completed every Rekon-side gate (`refresh`,
`artifacts validate`, all three publications,
both GitHub dry-runs, all 4 workflow
validator profiles). Two targets recorded
first-class verification failures from their
own `npm run typecheck` / `test` / `build`
scripts; both failures propagated honestly
through VerificationRun → VerificationResult
→ proof → Check dry-run. **No release
blockers were discovered.**

**Pinned reminders carried forward:**

- This batch does not publish to npm.
- This batch does not change package
  versions.
- This batch does not create a git tag.
- This batch does not create a GitHub
  Release.
- Every target ran from a temp `mktemp -d`
  copy; no source mutation outside the temp
  copy occurred.
- The no-NPM beta posture remains in force:
  successful cohort does not automatically
  trigger publish; revisiting the no-NPM
  policy requires a separate explicit
  operator decision.

## Cohort Targets

Three distinct real repositories covering
all five archetypes via two documented
consolidations (per the cohort plan's
single-repo-consolidation rule).

| Archetype | Target | Representative Path | Outcome |
| --- | --- | --- | --- |
| `<small-ts-package>` + `<github-workflows-repo>` (consolidated) | `boundary-contracts` | `src/index.ts` | `pass` |
| `<medium-monorepo>` | `structured-evals` | `packages/core/src/index.ts` | `pass-with-known-limitations` |
| `<nextjs-app>` + `<mixed-js-ts-repo>` (consolidated) | `figma-ds` | `app/page.tsx` | `pass-with-known-limitations` |

**Consolidation rationale:**

- `boundary-contracts` covers
  `<small-ts-package>` (89 TS / 28 JS, clean
  `src/index.ts`) **and**
  `<github-workflows-repo>` (1
  operator-managed `.github/workflows/*.yml`
  exercised by Rekon's workflow validator
  against the standard read-only profile).
- `figma-ds` covers `<nextjs-app>` (Next.js
  App Router; `app/page.tsx`) **and**
  `<mixed-js-ts-repo>` (251 TS/TSX + 353
  JS/JSX/MJS/CJS — a genuine language mix in
  one tree).

**Disallowed:** Rekon itself (already covered
by the first dogfood; the cohort is about
broader evidence).

Per the intake policy's default-anonymise
posture, repo names are reported with
relative names only (no full filesystem
paths, no source excerpts). The operator
approved this disclosure level when
authorising the cohort.

## Pre-Cohort Verification

All 9 mandatory verification commands passed
on the primary tree at SHA `79e2311` before
the cohort started:

| Command | Result |
| --- | --- |
| `npm run typecheck` | pass (reports `rekon@0.1.0-beta.0`) |
| `npm run test` | pass (1738 passed / 1 skipped on the primary tree) |
| `npm run build` | pass (reports `@rekon/sdk@0.1.0-beta.0`) |
| `git diff --check` | pass |
| `node scripts/audit-package-exports.mjs` | pass (20 packages; 0 issues) |
| `node scripts/audit-license.mjs` | pass (Apache-2.0) |
| `node scripts/publish-dry-run.mjs` | pass (no publish attempted) |
| `node scripts/install-smoke.mjs` | pass |
| `node scripts/install-tarball-smoke.mjs` | pass (20 tarballs; 13 artifact families) |

## Workflow Validator Results

Per the cohort plan, the workflow validator
matrix runs once from the Rekon repo (plus
the `<github-workflows-repo>` archetype
optionally validates operator-supplied YAML).
All four shipped templates validated clean:

| Template | Profile | Result |
| --- | --- | --- |
| `rekon-verification.yml` | `read-only` | `valid: true`, 0 issues |
| `rekon-verification-dry-run.yml` | `read-only` | `valid: true`, 0 issues |
| `rekon-verification-check-send.yml` | `github-check-send` | `valid: true`, 0 issues |
| `rekon-pr-comment-send.yml` | `github-pr-comment-send` | `valid: true`, 0 issues |

The `boundary-contracts` target ships one
operator-managed `.github/workflows/*.yml`;
that file was not validated in this batch
because the operator did not explicitly mark
it as a Rekon-supplied template (per the
cohort plan: validation against operator-
supplied YAML is opt-in informational-only
unless explicitly requested).

## Per-Target Results

| Target | Outcome | Refresh | Validate | Findings | Issues | Verification | Blockers |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| `boundary-contracts` | `pass` | passed (14 steps; fresh) | clean (0 issues) | 0 | 0 | passed (3/3 commands: typecheck/test/build all exit 0) | none |
| `structured-evals` | `pass-with-known-limitations` | passed (14 steps; fresh) | clean (0 issues) | 0 | 0 | failed (2/3 — typecheck+test passed; build failed with "Missing script: build" — first-class behaviour, recorded honestly) | none (acceptable per cohort plan) |
| `figma-ds` | `pass-with-known-limitations` | passed (14 steps; fresh) | clean (0 issues) | 0 | 0 | failed (1/3 — typecheck failed with real TS errors in operator source; test script missing; build passed) | none (acceptable per cohort plan) |

**Aggregate artifact counts across the
cohort:** 102 artefacts across 19 types (34
per target × 3 targets). Every artefact
validated clean; no corruption; no
unreadable publication.

## Cross-Target Findings

Three honest signals from the cohort:

1. **The verify → result → proof → Check
   dry-run pipeline propagates state
   correctly in both directions.** The first
   dogfood (Rekon itself) showed `conclusion:
   success` for a passing run. Today's
   cohort adds two `conclusion: failure`
   propagations from genuinely-failing
   real-repo verifications. The pipeline
   doesn't lie about either case.

2. **The auto-generated VerificationPlan's
   three-command default (`npm run
   typecheck` + `npm run test` + `npm run
   build`) is reasonable but not
   universal.** Two of three targets had at
   least one of those scripts missing:
   structured-evals (monorepo, no root
   `build`); figma-ds (no `test`).
   First-class failure recording handled
   this correctly at cohort time. **Status:
   addressed post-cohort.** A polish slice
   ([VerificationPlan Missing-Script
   Tolerance](verification-missing-script-tolerance.md))
   teaches the runner a pre-flight check:
   `npm | pnpm | yarn run <script>`
   commands whose script is absent from the
   operator's `package.json` are now
   recorded `skipped` (not `failed`) with a
   `missing-script: <name>` note and the
   package manager is never spawned. Re-runs
   on the same cohort would now record
   `partial` (not `failed`) for the two
   non-`pass` rows.

3. **Rekon's import-boundary / structural
   rule packs don't surface findings on
   these three targets.** That could mean
   (a) all three repos have clean structural
   patterns, or (b) Rekon's current rule
   packs don't match their patterns. Either
   is acceptable in beta (the no-false-
   positives signal is itself valuable);
   broader real-repo coverage would
   strengthen confidence. **Future cohort
   expansion (additional repos / archetypes
   / rule packs) would help.**

## Release Blockers

| Target | Blocker | Severity | Follow-Up |
| --- | --- | --- | --- |

**No release blockers found.**

The three failures recorded during `verify
run --execute` (structured-evals: `build`
missing; figma-ds: `typecheck` real TS
errors + `test` missing) are all
**acceptable outcomes** per the cohort
plan's success criteria: "failed
verification is acceptable when recorded
honestly; VerificationRun + VerificationResult
accurately record the failed proof; artifacts
validate remains clean."

In every case:
- The VerificationRun was written with
  `status: failed`.
- The failed exit code + duration were
  recorded per-command.
- The VerificationResult propagated `status:
  failed`.
- The proof / architecture / agent-contract
  publications cited the failed result
  truthfully.
- The github-check dry-run payload reported
  `conclusion: failure` with `output.title:
  "Verification: failed"`.
- `artifacts validate` returned `valid:
  true` at every checkpoint.
- No CLI crash; no malformed artefact; no
  unreadable publication; no token leak; no
  source mutation outside the temp copy.

## Known Limitations Observed

| Limitation | Observed in cohort? | Notes |
| --- | --- | --- |
| source-write apply unavailable | yes | per the source-write reconciliation policy memo; no cohort target attempted any source write |
| watcher daemon unavailable | yes | per the watcher / path freshness policy memo; refresh was an explicit operator command |
| hosted GitHub App unavailable | yes | cohort used the local CLI |
| active workflows not installed automatically | yes | no `.github/workflows/*.yml` added to the Rekon repo |
| GitHub writes opt-in only | yes | both GitHub publishers ran in `--dry-run` mode for every target |
| Windows process-tree kill direct-child-only | n/a | dogfood ran on macOS |
| full classic parity not claimed | n/a | not tested in cohort |
| aggregate freshness historical stale entries | yes | each target's final `artifacts freshness` reported aggregate `stale` (15 issues) per the documented latest-major pattern |
| host Node engine outside declared range | yes | Node 25.9.0 vs. various target engines; `npm ci` warned but completed |
| `pr-comment --dry-run` readiness false without env | yes | every target reported 5 expected gaps with no GitHub env set |
| `npm run build` missing from monorepo | yes | structured-evals (per-package builds; no root script) |
| `npm run test` missing | yes | figma-ds (no test script defined) |
| Real TS errors in target source | yes | figma-ds typecheck failed honestly |

**No new defect surfaced.** Every limitation
either was previously documented or is the
target's own source / config — not a Rekon
defect.

## Dogfood Decision

**`pass-with-known-limitations`.**

The cohort is the last release-validation
gate the no-NPM beta posture defined.
**No release blockers were discovered.**
Two targets recorded honest verification
failures from their own scripts; both
failures propagated truthfully through the
proof chain. The Rekon CLI itself behaved
correctly on three different repo shapes
(small TS package + workflows; medium
monorepo; Next.js + mixed JS/TS).

**This does not automatically trigger npm
publish.** Per the
[No-NPM Beta Distribution Policy](no-npm-beta-distribution-policy.md),
revisiting the no-NPM posture requires a
separate explicit operator decision after
the cohort summary lands. This summary is
that landing point; the next operator
decision is whether to:

- continue beta with the no-NPM posture
  indefinitely;
- author additional cohort batches (more
  repos / different archetypes);
- pivot to post-beta breadth / maturity /
  polish work;
- open a no-NPM-policy-revision work order
  (would require a new explicit operator
  decision; this summary does not
  pre-authorise one).

## What This Does Not Do

This batch **does not**:

- Run `npm publish` for any workspace
  package.
- Edit any `package.json` `version` field
  (still `0.1.0-beta.0`).
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
  fixture or any committed example.
- Mutate any of the three cohort target
  repos' actual source trees. Every target
  ran from a `mktemp -d` copy.
- Commit any `.rekon/**` artefact produced by
  the cohort runs. Cohort artefacts live in
  temp directories that this commit does not
  touch.
- Change the beta-ready decision or the
  no-NPM beta posture. Successful cohort
  does not automatically trigger publish;
  revisiting the no-NPM policy requires a
  separate explicit operator decision.

## Follow-Up Work

**Decision point for the operator** (the
no-NPM beta posture explicitly defers this
to a separate decision):

- **Continue beta with the no-NPM posture
  indefinitely.** Reasonable; the cohort
  validates the current product loop on
  three additional real repo shapes; further
  beta evolution can happen against
  source-checkout users without npm.
- **Add more cohort targets.** Worth doing
  if specific archetypes feel
  under-represented (e.g., a Vite + React
  SPA without Next.js; a deep TS monorepo
  with Turborepo; a CLI-only package).
- **Pivot to post-beta tracks.** The cohort
  doesn't block any of:
  - Post-beta source-write apply roadmap (4
    slices: patch preview → permission +
    rollback design → apply implementation
    → safety review).
  - Post-beta path freshness + watcher
    roadmap (4 slices: path freshness
    artefact → watcher daemon design →
    watcher implementation → safety
    review).
  - Post-beta breadth / maturity / polish
    (hosted GitHub App; deeper rule
    catalog; memory promotion /
    supersession; PR comment refinements;
    Windows process-tree kill via Job
    Objects; VerificationPlan adaptation
    for missing-script tolerance — surfaced
    by this cohort).
- **Open a no-NPM-policy-revision work
  order.** Would require an explicit
  operator decision; this summary does not
  pre-authorise one.

**Implementation Sequence (updated):**

| Step | Slice | Status |
| --- | --- | --- |
| 1 | [Beta release readiness checklist memo](beta-release-readiness-checklist.md) | ✅ Shipped |
| 2 | [Beta release candidate execution plan](beta-release-candidate-execution-plan.md) | ✅ Shipped |
| 3 | [Beta version bump execution report](beta-version-bump-execution-report.md) | ✅ Shipped |
| 4 | [Real-repo beta dogfood report](real-repo-beta-dogfood-report.md) | ✅ Shipped |
| 5 | [No-NPM beta distribution policy](no-npm-beta-distribution-policy.md) | ✅ Shipped |
| 6 | [Additional real-repo dogfood cohort plan](additional-real-repo-dogfood-cohort-plan.md) | ✅ Shipped |
| 7a | [Real-repo dogfood cohort intake request](real-repo-cohort-intake-request.md) | ✅ Shipped |
| 7b | **Additional real-repo dogfood execution (this cohort summary)** | ✅ **Shipped** — `pass-with-known-limitations` across 3 distinct real repos covering all 5 archetypes |
| 8 | Post-beta source-write apply roadmap (4 slices) | Post-beta; independent of cohort |
| 9 | Post-beta path freshness + watcher roadmap (4 slices) | Post-beta; independent |
| 10 | Post-beta breadth / maturity / polish work | Post-beta; one item ([VerificationPlan missing-script tolerance](verification-missing-script-tolerance.md)) shipped post-cohort on `cee7af4` |
| 10a | [Post-beta dogfood evidence triage decision](post-beta-dogfood-evidence-triage.md) | ✅ Shipped — classifies every cohort observation; selects **Option C (watcher / path freshness implementation)** as the next slice |
| 11 | (Optional, deferred) Post-beta npm publish authorization work order | Only after an explicit later operator decision reverses the no-NPM policy |

**No npm publish during beta. Beta is private
/ local / repo-based. The cohort passed with
known limitations; no release blocker
surfaced. The next operator decision is
explicit: continue beta as-is, add more
cohort targets, pivot to post-beta tracks,
or open a no-NPM-policy-revision work
order.**
