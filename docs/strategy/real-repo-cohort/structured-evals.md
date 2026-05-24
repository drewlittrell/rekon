# Real-Repo Dogfood Target: structured-evals

**Archetype covered:** `<medium-monorepo>`.

**Outcome:** `pass-with-known-limitations`.

## Target Summary

| Property | Value |
| --- | --- |
| Repo name | `structured-evals` (operator-supplied local path; reported with relative name only per intake policy) |
| Source SHA | `e60ceadf` |
| Setup method | `git clone --local --no-hardlinks` to `mktemp -d` |
| Size | 10 MB |
| Workspaces | `packages/*` (6 subdirs: `cli`, `core`, `intent-vocabulary`, `ui-reconstruction`, …) |
| `.github/workflows/*.yml` | 1 |
| Top-level scripts | `typecheck`, `test` (no root `build` — monorepo per-package builds) |
| Representative path | `packages/core/src/index.ts` |

## Setup Results

| Step | Result | Notes |
| --- | --- | --- |
| `git clone --local --no-hardlinks` | pass | local clone, no network |
| `npm ci` | pass with warnings | 5 moderate-severity vulnerabilities reported; install completed normally |
| `npm run build` | n/a — missing script | monorepo has no root `build` script; per-package builds happen at workspace level. **Recorded honestly**; not a release blocker. |

## Core Matrix Results

| Command | Result | Notes |
| --- | --- | --- |
| `init` | pass | `.rekon/config.json` written |
| `refresh` | pass | 14 lifecycle steps; `status: passed`; `freshness: fresh`; no missing artifacts |
| `artifacts validate` (post-refresh) | pass | `valid: true`, 0 issues |
| `artifacts freshness` (post-refresh) | aggregate `fresh` | 0 issues |
| `findings filter` | pass | 0 raw findings; 0 filtered; 0 kept |
| `findings filter-health` | pass | `filterRate: 0`, 0 alerts |
| `findings list` | pass | 0 findings |
| `issues adjudicate` | pass | 0 groups |
| `issues list` | pass | 0 issues |
| `coherency delta` | pass | 0 active items |
| `publish proof` | pass | `Publication: proof-report-…` |
| `publish architecture` | pass | `Publication: architecture-summary-…` |
| `publish agent-contract` | pass | `Publication: agent-contract-…` |

## Representative Path Results

Representative path: `packages/core/src/index.ts`.

| Command | Result | Notes |
| --- | --- | --- |
| `resolve preflight` | pass | `ResolverPacket: preflight-…` |
| `intent work-order` | pass | produced `IntentMap` + `WorkOrder` + `VerificationPlan` (3 commands) |
| `verify run --dry-run` | pass | 3 commands, all `not-run`, `executed: false` |
| **`verify run --execute`** | **recorded failure (acceptable)** | **3 commands: `npm run typecheck` (passed, exit 0 / 1 150 ms); `npm run test` (passed, exit 0 / 1 675 ms); `npm run build` (failed, exit 1 / 104 ms — `npm error Missing script: "build"`). VerificationRun status: `failed`. First-class behaviour: the auto-generated plan includes `npm run build` but this monorepo lacks a root build script. The failure is recorded honestly; artifacts validate remains clean.** |
| `verify result from-run` | pass (with failed status) | `VerificationResult.status: failed`; 2/3 passed, 1/3 failed |
| Republish proof / architecture / agent-contract | pass | each Publication updated to cite the failed VerificationResult |
| **`publish github-check --dry-run`** | **pass (with `conclusion: failure`)** | **payload propagates the underlying VerificationResult honestly; `conclusion: failure`; `output.title: "Verification: failed"`; 6 cited refs; no network** |
| `publish pr-comment --dry-run` | pass | `wouldPublish: false`; 5 expected readiness gaps; no network |
| Final `artifacts validate` | pass | `valid: true`, 0 issues |
| Final `artifacts freshness` | aggregate `stale` | 15 historical `newer-input-exists` issues (latest-major pattern) |

## Artifact Metrics

| Metric | Value |
| --- | --- |
| Total artefacts | 34 across 19 types |
| EvidenceGraph | 1 |
| ObservedRepo | 1 |
| OwnershipMap | 1 |
| CapabilityMap | 1 |
| GraphSlice | 3 |
| IntelligenceSnapshot | 3 |
| FindingReport | 1 |
| FindingFilterReport | 2 |
| FindingFilterHealthReport | 2 |
| FindingLifecycleReport | 1 |
| IssueAdjudicationReport | 2 |
| CoherencyDelta | 2 |
| IntentMap | 1 |
| WorkOrder | 1 |
| VerificationPlan | 1 |
| VerificationRun | 2 |
| VerificationResult | 1 |
| ResolverPacket | 1 |
| Publication | 7 |

## Finding And Issue Metrics

| Metric | Value |
| --- | --- |
| FindingReport findings | 0 |
| FilteredFindings | 0 |
| filterRate | 0 |
| filter-health alerts | 0 |
| Issue groups | 0 |
| Remediation queue items | 0 |

## Verification Metrics

| Metric | Value |
| --- | --- |
| VerificationPlan command count | 3 |
| VerificationRun (dry-run) status | `not-run` |
| VerificationRun (execute) status | **`failed`** |
| `npm run typecheck` | passed (exit 0, 1 150 ms) |
| `npm run test` | passed (exit 0, 1 675 ms) |
| `npm run build` | **failed (exit 1, 104 ms — `Missing script: "build"`)** |
| VerificationResult status | **`failed`** |

## Publication Metrics

| Metric | Value |
| --- | --- |
| Total Publications | 7 (proof ×2, architecture ×2, agent-contract ×2, refresh's own architecture ×1) |
| Publication render failures | 0 |
| Unreadable publications | 0 |

## GitHub Dry-Run Metrics

| Metric | Value |
| --- | --- |
| `publish github-check --dry-run` `dryRun` | `true` |
| `publish github-check --dry-run` `conclusion` | **`failure`** (propagates the failed VerificationResult honestly) |
| `publish github-check --dry-run` output title | `Verification: failed` |
| `publish github-check --dry-run` cited refs count | 6 |
| `publish github-check --dry-run` network calls | 0 |
| `publish pr-comment --dry-run` `dryRun` | `true` |
| `publish pr-comment --dry-run` `wouldPublish` | `false` |
| `publish pr-comment --dry-run` readiness gap count | 5 |
| `publish pr-comment --dry-run` network calls | 0 |

## Outcome Classification

**`pass-with-known-limitations`.**

Every Rekon-side gate cleared:

- `refresh` completed cleanly.
- `artifacts validate` returned `valid: true`
  at every checkpoint.
- All three publications rendered.
- Both GitHub dry-runs rendered without
  network calls.
- No CLI crash; no artefact corruption; no
  token leak; no source mutation outside the
  temp copy.

Known limitations recorded honestly:

- **`npm ci` reported 5 moderate-severity
  vulnerabilities** in the target's own
  dependency tree. Not a Rekon defect; an
  upstream maintenance signal for the target
  repo's maintainer.
- **`npm run build` failed because the
  monorepo lacks a root `build` script.** The
  auto-generated VerificationPlan includes
  `npm run build` per the standard contract;
  this monorepo's per-package build pattern
  doesn't match. Rekon recorded the failure
  honestly through VerificationRun →
  VerificationResult → proof → Check dry-run.
  Per the cohort plan's success criteria,
  "failed verification is acceptable when
  recorded honestly" — this case qualifies.
- **0 findings** in the source tree. Could
  reflect Rekon's import-boundary / structural
  rule packs not yet matching this repo's
  patterns, or it could reflect that the
  source tree is genuinely clean. Either way,
  no false positives produced.

## Follow-Up Work

**Not a release blocker** — but two
post-cohort improvements worth surfacing:

1. **VerificationPlan adaptation to monorepo
   layouts.** Rekon's auto-generated
   VerificationPlan defaults to `npm run
   typecheck` + `npm run test` + `npm run
   build`. For monorepos without root scripts,
   the plan could detect workspaces and
   either skip missing scripts (recommended)
   or generate per-workspace plans. This is a
   post-beta enhancement; today's behaviour
   (record the failure honestly) is correct
   per the cohort plan's first-class-failure
   contract.
2. **Operator-supplied verification plan
   override.** A `--plan-commands` flag or a
   per-repo plan config could let operators
   override the default 3-command plan when
   their repo's convention differs. Also
   post-beta; not a release blocker.

Neither of these affects the cohort decision
— the target passes with known limitations
that are already documented in the cohort
plan + the no-NPM beta policy.
