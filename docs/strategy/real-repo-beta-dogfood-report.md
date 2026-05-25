# Real-Repo Beta Dogfood Report

## Decision Summary

**Dogfood Decision: pass-with-known-limitations.**

The first real-repo beta dogfood run executed the
local built CLI (`0.1.0-beta.0`) against a temp
copy of the Rekon repository itself and produced
honest, actionable artefacts end-to-end. Every
critical surface behaved as documented; the only
"failures" are first-class behaviours already
disclosed by the
[Beta Release Readiness Checklist](beta-release-readiness-checklist.md)
+ the
[Beta Release Candidate Execution Plan](beta-release-candidate-execution-plan.md)
+ the
[Beta Version Bump Execution Report](beta-version-bump-execution-report.md).

**Pinned reminders carried forward:**

- This batch does not publish to npm.
- This batch does not change package versions.
- This batch does not create a git tag.
- This batch does not create a GitHub Release.
- The dogfood run used a temp copy of a real
  repository and did not mutate committed
  examples.
- The next publish step still requires explicit
  operator authorization.

**Two genuine dogfood wins** (vs. the smaller
example fixture used by Batches 30 + 31):

- **`verify run --execute` actually executed
  real commands and they all passed.** Against
  the dogfood Rekon copy, the auto-generated
  VerificationPlan ran `npm run typecheck` +
  `npm run test` + `npm run build` — all 3
  passed (exit 0; ~40 s total). The fixture
  smokes recorded this surface as
  failed-as-documented because the example
  fixture has no real test commands; the
  dogfood proves the runner works end-to-end on
  a real monorepo.
- **`publish github-check --dry-run`
  propagated success.** The GitHub Check
  payload reports
  `conclusion: success` + `output.title:
  "Verification: passed (fresh)"` —
  proving the verify → result → proof →
  publish pipeline correctly propagates a
  **passing** state. The fixture smokes
  recorded this surface as `conclusion:
  failure` because the fixture's
  VerificationResult is failed; the dogfood
  proves the conclusion correctly flips when
  verification actually passes.

## Target Repository

| Property | Value |
| --- | --- |
| Target repo | temp copy of the Rekon repository itself |
| Target path | `/var/folders/.../rekon-dogfood` (temp under `mktemp -d`) |
| Target SHA | `83ba7237a2a2292b684fed314a58b4196de2fd28` (matches primary `main`) |
| Setup method | `rsync -a --exclude node_modules --exclude dist --exclude '*.tsbuildinfo' --exclude .rekon` from the primary worktree |
| File count | 489 source files (`node_modules`, `dist`, `.tsbuildinfo`, `.rekon` excluded) |
| Size | 7.8 MB |
| Install method | `npm ci` (44 packages audited; 0 vulnerabilities) |
| Build method | `npm run build` (succeeded across all 20 workspace packages) |
| CLI used | `packages/cli/dist/index.js` from the **primary** repo (the built CLI at version `0.1.0-beta.0`) |
| Committed `examples/simple-js-ts` | not mutated (this dogfood targets the Rekon repo itself, not the example fixture) |

**Why Rekon itself?** It exercises a real
TypeScript monorepo with 20 workspace packages,
489 source files, real test commands, real
publication surfaces, real CapabilityMap +
OwnershipMap projections, real findings (the
intentional `import-boundary-rule-pack` fixture
surfaces 1 real finding by design), real
workflow templates, and real validators. It is
the most realistic dogfood available without
requiring a separate external repo.

**Note on host Node engine:** the host runs
Node 25.9.0 while the package declares engines
`^20.12 || ^22 || ^24`. `npm ci` warned with
`EBADENGINE` but completed normally; all
subsequent verification + CLI commands ran
successfully. The engine range is the
documented support contract; running outside
it is allowed (just warned). The release work
order is not expected to broaden the engine
range based on this single off-range run.

## Pre-Dogfood Verification

| Command | Result |
| --- | --- |
| `npm run typecheck` | pass (reports `rekon@0.1.0-beta.0`) |
| `npm run test` | pass (1680 passed / 1 skipped on the primary tree at SHA `83ba723`) |
| `npm run build` | pass (reports `@rekon/sdk@0.1.0-beta.0`) |
| `git diff --check` | pass |
| `node scripts/audit-package-exports.mjs` | pass (20 packages; 0 issues) |
| `node scripts/audit-license.mjs` | pass (20 packages; Apache-2.0) |
| `node scripts/publish-dry-run.mjs` | pass (20 packages; no publish attempted) |
| `node scripts/install-smoke.mjs` | pass (install-from-build) |
| `node scripts/install-tarball-smoke.mjs` | pass (20 tarballs; 13 artifact families) |

All 9 mandatory verification commands passed on
the primary tree before the dogfood run started.
The dogfood run did not introduce any regression
to those gates.

## Dogfood Command Matrix

| Command / Flow | Result | Notes |
| --- | --- | --- |
| `init` | pass | wrote `.rekon/config.json` to the dogfood root |
| `refresh` | pass | 14 lifecycle steps; `status: passed`; `freshness: fresh`; no missing artifact families |
| `artifacts validate` (post-refresh) | pass | `valid: true`, 0 issues |
| `artifacts freshness` (post-refresh) | aggregate `fresh` | 0 issues (cleaner than the small fixture which carries historical artifacts) |
| `findings filter` | pass | 134 filtered (all `test-file`), 1 kept; `filterRate: 0.9926` |
| `findings filter-health` | pass | 0 alerts |
| `findings list` | pass | 1 kept finding |
| `issues adjudicate` | pass | 1 group; 1 active; 0 accepted / ignored / resolved / mixed; `mergeCandidates: 0` |
| `issues list` | pass | 0 (surface lists merge candidates; adjudication recorded 0) |
| `coherency delta` | pass | 1 active item; severity `medium`; system `examples`; top path `examples/import-boundary-rule-pack/fixtures/bad-imports/src/feature/handler.ts` (the intentional "bad imports" demo fixture) |
| `publish proof` | pass | Publication `proof-report-…` written |
| `publish architecture` | pass | Publication `architecture-summary-…` written |
| `publish agent-contract` | pass | Publication `agent-contract-…` written |
| `resolve preflight --path packages/cli/src/index.ts --goal "dogfood release validation"` | pass | ResolverPacket `preflight-…` written; packet has `goal`, `paths`, `ownerSystems`, `matchedScopes`, `risk`, `requiredChecks`, `relevantFindings` |
| `intent work-order --path packages/cli/src/index.ts --goal "dogfood release validation"` | pass | produced `IntentMap`, `WorkOrder`, `VerificationPlan` |
| `verify run --dry-run` | pass | 3 commands, all `not-run`; `executed: false`; VerificationRun written |
| **`verify run --execute`** | **pass** | **3 commands, all `passed` (`npm run typecheck` exit 0 / 280ms; `npm run test` exit 0 / 37246ms; `npm run build` exit 0 / 2214ms)**; VerificationRun written; `status: passed` |
| `verify result from-run` | pass | VerificationResult `status: passed`; 3 commands, all passed; downstream surfaces will reflect the pass |
| Republish `proof` / `architecture` / `agent-contract` | pass | each Publication updated to cite the passed VerificationResult |
| **`publish github-check --dry-run`** | **pass** | **`dryRun: true`; `conclusion: success`; `output.title: "Verification: passed (fresh)"`; 6 cited refs; no network call** |
| `publish pr-comment --dry-run` | pass | `dryRun: true`; `wouldPublish: false`; readiness reports 5 expected gaps (`not-enabled`, `missing-repository`, `missing-pr-number`, `missing-token`, `write-permission-not-confirmed`); no network call |
| `verify github-workflow validate --profile read-only` (`rekon-verification.yml`) | pass | `valid: true`, 0 issues |
| `verify github-workflow validate --profile read-only` (`rekon-verification-dry-run.yml`) | pass | `valid: true`, 0 issues |
| `verify github-workflow validate --profile github-check-send` | pass | `valid: true`, 0 issues |
| `verify github-workflow validate --profile github-pr-comment-send` | pass | `valid: true`, 0 issues |
| Final `artifacts validate` (after all smokes) | pass | `valid: true`, 0 issues |
| Final `artifacts freshness` (after all smokes) | aggregate `stale` | 20 historical `newer-input-exists` issues; documented latest-major pattern; not a release blocker. (For scale: the small example fixture's post-matrix freshness reported 1571 historical issues; the dogfood's 20 reflects its small artifact history.) |

**No CLI command crashed. No artifact was
corrupted. No publication was unreadable.** Every
CLI surface returned a parseable JSON response
matching its documented contract.

## Artifact Results

**Total artifacts written by the dogfood run: 36
across 19 types.**

| Artifact Family / Type | Count | Notes |
| --- | ---: | --- |
| `CapabilityMap` | 1 | from `project` step of refresh |
| `CoherencyDelta` | 2 | one from refresh; one from `coherency delta` re-run |
| `EvidenceGraph` | 1 | from `observe` |
| `FindingFilterHealthReport` | 2 | one from refresh; one from `findings filter-health` re-run |
| `FindingFilterReport` | 2 | one from refresh; one from `findings filter` re-run |
| `FindingLifecycleReport` | 1 | from refresh |
| `FindingReport` | 1 | from `evaluate` step of refresh |
| `GraphSlice` | 3 | from `project` (multiple registered slices) |
| `IntelligenceSnapshot` | 4 | one from refresh + three from individual subsequent commands that re-snapshot |
| `IntentMap` | 1 | from `intent work-order` |
| `IssueAdjudicationReport` | 2 | one from refresh; one from `issues adjudicate` re-run |
| `ObservedRepo` | 1 | from `project` |
| `OwnershipMap` | 1 | from `project` |
| `Publication` | 7 | proof-report (×2: pre-verify + post-verify) + architecture-summary (×2) + agent-contract (×2) + the refresh's own architecture-summary |
| `ResolverPacket` | 2 | one from `resolve preflight`; one from `intent work-order`'s embedded resolver call |
| `VerificationPlan` | 1 | from `intent work-order` |
| `VerificationResult` | 1 | from `verify result from-run` |
| `VerificationRun` | 2 | one from `verify run --dry-run`; one from `verify run --execute` |
| `WorkOrder` | 1 | from `intent work-order` |

**`artifacts validate` reports `valid: true`,
0 issues** across all 36 artefacts. Every
artefact's `header` resolves; every digest
matches; no path escapes `.rekon/artifacts/**`.

## Finding And Issue Results

- **Findings (raw):** 135 (134 in test scaffolding
  + 1 in the intentional "bad imports" demo
  fixture).
- **Findings filtered:** 134 (all `test-file`).
- **Findings kept:** 1.
- **Filter rate:** 0.9926 (99.26%).
- **Filter-health alerts:** 0.
- **Issue groups (adjudication):** 1.
- **Active issue groups:** 1.
- **Accepted / ignored / resolved / mixed
  groups:** 0 each.
- **Merge candidates:** 0.
- **CoherencyDelta items:** 1 active; severity
  `medium`; system `examples`; top path
  `examples/import-boundary-rule-pack/fixtures/bad-imports/src/feature/handler.ts`.

The single surviving finding is by design: the
`import-boundary-rule-pack` ships a demo fixture
containing intentional violations to demonstrate
that the rule pack detects them. **Rekon
dogfood correctly surfaces its own demo as a
finding.** No false positive in the production
source tree.

## Verification Results

- **VerificationPlan:** `verification-plan-…`
  (3 commands: `npm run typecheck`, `npm run
  test`, `npm run build`).
- **VerificationRun (dry-run):** `verification-run-…`;
  `status: not-run`; 3/3 commands `not-run`;
  `executed: false`.
- **VerificationRun (execute):**
  `verification-run-…`; `status: passed`; 3/3
  commands `passed`:
  - `npm run typecheck`: exit 0, 280 ms.
  - `npm run test`: exit 0, 37 246 ms (the
    dogfood's own test suite passes against
    the bumped tree).
  - `npm run build`: exit 0, 2 214 ms.
- **VerificationResult:** `verification-result-…`;
  `status: passed`; 3/3 commands recorded as
  passed.

**This is the first verify-runner end-to-end
pass against real commands.** The fixture
smokes in Batches 30 + 31 recorded
`status: failed` because their fixture had no
real test commands; the dogfood proves the
runner correctly handles a passing path.

## Publication Results

- **Pre-verify publications:**
  - `Publication: proof-report-…` (1).
  - `Publication: architecture-summary-…` (1).
  - `Publication: agent-contract-…` (1).
- **Post-verify publications (after `verify
  result from-run` wrote the passed result):**
  - `Publication: proof-report-…` (1, updated;
    now cites the passed VerificationResult).
  - `Publication: architecture-summary-…` (1,
    updated).
  - `Publication: agent-contract-…` (1,
    updated).
- **Refresh's own publication** (from
  `publish.architecture` step of refresh,
  before the explicit `publish` re-runs): 1.

All 7 publications were written without error;
each has a valid digest; each cites the right
inputs.

## GitHub Review Dry-Runs

- **`publish github-check --dry-run`:**
  `dryRun: true`; `conclusion: success` (vs.
  `failure` in the fixture smokes);
  `output.title: "Verification: passed
  (fresh)"`; 6 cited refs (VerificationResult,
  VerificationRun, VerificationPlan, proof
  report, architecture summary, agent contract);
  no network call. The canonical reminder
  "GitHub status is not canonical truth; Rekon
  artifacts remain canonical" remains in the
  payload summary.
- **`publish pr-comment --dry-run`:**
  `dryRun: true`; `wouldPublish: false`;
  readiness reports 5 expected gaps
  (`not-enabled`, `missing-repository`,
  `missing-pr-number`, `missing-token`,
  `write-permission-not-confirmed`); no network
  call. The PR comment body would render the
  same proof summary but is correctly blocked
  from publishing without GitHub environment +
  operator confirmation.

**The dry-run path is honest in both
directions:** it reports `success` when
verification passes (dogfood) and `failure` when
verification fails (fixture). The PR comment
readiness contract continues to refuse a publish
without the explicit operator opt-in.

## Workflow Validator Results

| Template | Profile | Result |
| --- | --- | --- |
| `rekon-verification.yml` | `read-only` | `valid: true`, 0 issues |
| `rekon-verification-dry-run.yml` | `read-only` | `valid: true`, 0 issues |
| `rekon-verification-check-send.yml` | `github-check-send` | `valid: true`, 0 issues |
| `rekon-pr-comment-send.yml` | `github-pr-comment-send` | `valid: true`, 0 issues |

All four shipped workflow templates validate
clean against their corresponding profiles.
The dogfood run did not need to copy or modify
any workflow file.

## Known Limitations Observed

| Limitation | Observed? | Notes |
| --- | --- | --- |
| source-write apply unavailable | yes | expected — Rekon has no `reconcile apply`; the dogfood made zero source writes |
| watcher daemon unavailable | yes | expected — Rekon has no `rekon watch`; refresh was an explicit operator command |
| hosted GitHub App unavailable | yes | expected — the dogfood used the local CLI, not a hosted publisher |
| active workflows not installed automatically | yes | expected — no `.github/workflows/*.yml` was added to the dogfood; the templates remain documentation |
| GitHub writes opt-in only | yes | expected — both GitHub publishers were exercised in `--dry-run` mode; no `--send` invocation; no token; no network |
| Windows process-tree kill direct-child-only | n/a | not exercised — the dogfood ran on macOS; the Windows caveat remains documented for the eventual Windows operator |
| full classic parity not claimed | n/a | the dogfood does not test classic parity; the parity review already accepted "beta is not full classic parity" |
| aggregate freshness historical stale entries | yes | expected — final `artifacts freshness` reports aggregate `stale` with 20 historical `newer-input-exists` issues; documented latest-major pattern |
| Host Node engine outside declared range | yes | host Node 25.9.0 vs. declared `^20.12 \|\| ^22 \|\| ^24`; `npm ci` warned with `EBADENGINE`; install + build + tests + dogfood matrix all completed normally. Not a release blocker; the engine declaration is the documented support contract. |
| `pr-comment --dry-run` readiness `not-enabled` / `missing-token` etc. | yes | expected — no GitHub env set; readiness contract did its job |

**No surprise limitation surfaced.** Every
observed limitation is already documented by
the upstream policy memos
(source-write reconciliation policy; watcher /
path freshness policy; beta release readiness
checklist).

## Dogfood Decision

**Classification: `pass-with-known-limitations`.**

The dogfood run **passes** on every release-
relevant gate:

- All 9 mandatory verification commands passed
  before the dogfood (and continue to pass
  after, including the new 18-assertion docs
  suite this batch adds).
- The local CLI initialized + refreshed a real
  monorepo without error.
- Refresh produced 14 lifecycle steps;
  `freshness: fresh`; no missing artifacts.
- `artifacts validate` is clean (0 issues) at
  every checkpoint (post-refresh; final
  post-matrix).
- The findings / filter / lifecycle /
  adjudication / coherency chain ran without
  error and correctly identified the
  intentional demo fixture (and **only** the
  intentional demo fixture).
- All three publications wrote successfully.
- The resolver / planning chain produced
  WorkOrder + VerificationPlan from a real
  source path.
- **`verify run --execute` actually ran real
  commands and they all passed** — the first
  time this surface has had a real verification
  target.
- **`verify result from-run` derived a passed
  VerificationResult** end-to-end.
- **The GitHub Check dry-run payload reported
  `success`** — proving the proof-pipeline
  correctly propagates a passing state.
- The PR comment dry-run correctly refused to
  publish without GitHub environment +
  operator confirmation.
- All 4 workflow validators passed.
- No CLI command crashed; no artifact was
  corrupted; no publication was unreadable.

The "with known limitations" qualifier
reflects only the limitations already
disclosed by the checklist (source-write
apply / watcher / hosted GitHub App / active
workflows / GitHub writes opt-in / Windows
process-tree kill / full classic parity /
aggregate freshness historical stale entries /
host Node engine warning). **None of those is a
new defect; every one was previously
documented.**

**This batch does not publish to npm.**

**This batch does not change package versions.**

**This batch does not create a git tag.**

**This batch does not create a GitHub Release.**

**The dogfood run used a temp copy of a real
repository and did not mutate committed
examples.**

**The next publish step still requires
explicit operator authorization.**

## What This Does Not Do

This batch **does not**:

- Run `npm publish` for any workspace package.
- Run `npm publish --provenance`.
- Edit any `package.json` `version` field.
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
- Commit any `.rekon/**` artifact produced by
  the dogfood run (the dogfood root is a temp
  directory under `mktemp -d`; its `.rekon/`
  tree lives there, not in the committed
  repo).
- Hide any smoke result. Every observation
  above matches what actually happened on the
  dogfood tree.

## Follow-Up Work

**Recommended next slice: No-NPM beta
distribution policy** (shipped immediately
after this report; see
[`no-npm-beta-distribution-policy.md`](no-npm-beta-distribution-policy.md)),
followed by an **additional real-repo dogfood
cohort plan**.

After reviewing this report, the operator
decided that **Rekon beta will not be
published to npm**. A sample size of one
dogfood (Rekon itself) is not enough to
commit a public npm version. Beta remains
source-checkout + local-build + tarball-smoke
based; publish is deferred until after beta
or until a new explicit operator decision
reverses the policy. See the
[No-NPM Beta Distribution Policy](no-npm-beta-distribution-policy.md)
for the full pinning.

**Implementation Sequence (updated):**

| Step | Slice | Status |
| --- | --- | --- |
| 1 | [Beta release readiness checklist memo](beta-release-readiness-checklist.md) | ✅ Shipped |
| 2 | [Beta release candidate execution plan](beta-release-candidate-execution-plan.md) | ✅ Shipped (against SHA `54d1dfd`) |
| 3 | [Beta version bump execution report](beta-version-bump-execution-report.md) | ✅ Shipped (`0.1.0-beta.0` applied) |
| 4 | **Real-repo beta dogfood report (this report)** | ✅ **Shipped** — `pass-with-known-limitations` against the Rekon repo itself |
| 5 | [No-NPM beta distribution policy](no-npm-beta-distribution-policy.md) | ✅ Shipped — replaces the previously-planned publish authorization work order |
| 6 | [Additional real-repo dogfood cohort plan](additional-real-repo-dogfood-cohort-plan.md) | ✅ Shipped — 5 archetypes; ≥ 3 distinct real repositories required; command matrix + metrics + success criteria + release blocker taxonomy + reporting format pinned |
| 7a | [Real-repo dogfood cohort intake request](real-repo-cohort-intake-request.md) | ✅ Shipped |
| 7b | [Additional real-repo dogfood execution](real-repo-cohort-summary.md) | ✅ **Shipped** — `pass-with-known-limitations` across 3 distinct real repos (`boundary-contracts`, `structured-evals`, `figma-ds`) covering all 5 archetypes via two documented consolidations; no release blockers |
| 8 | Post-beta source-write apply roadmap (4 slices) | Post-beta |
| 9 | Post-beta path freshness + watcher roadmap (4 slices) | Post-beta |
| 10 | Post-beta breadth / maturity / polish work | Ongoing |
| 11 | (Optional, deferred) Post-beta npm publish authorization work order | Only after broader real-repo dogfood + an explicit later operator decision reverses the no-NPM policy |

**Additional dogfood targets** that the
cohort plan (step 6) will define + the cohort
execution (step 7) will run:

- A small external TypeScript app (e.g., a
  CRA / Vite project).
- A non-monorepo single-package project (to
  confirm OwnershipMap behaviour with one
  workspace).
- A Next.js app.
- A mixed JS/TS repo (some `.js`, some `.ts`,
  no enforced module boundary).
- A repo with existing `.github/workflows/*.yml`
  (to confirm Rekon's workflow templates
  coexist).

**These are now release-relevant.** Under the
[No-NPM Beta Distribution Policy](no-npm-beta-distribution-policy.md),
broader real-repo dogfood is **required**
before any post-beta publish is reconsidered;
the cohort is no longer optional hardening.

## Operator Support

Private-beta operators use the
[Private Beta Support Playbook](../beta/private-beta-support-playbook.md)
+
[Private Beta Bug Report Template](../beta/private-beta-bug-report-template.md)
to install, run, validate, share artifacts, and
report issues during the no-NPM beta. The
playbook pins the source-checkout install path,
the command matrix, the artifact-sharing
policy with explicit redaction guidance, the
blocker taxonomy, and the path-freshness rerun
guidance.
