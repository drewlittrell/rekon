# Real-Repo Dogfood Target: boundary-contracts

**Archetypes covered:** `<small-ts-package>` +
`<github-workflows-repo>` (documented
consolidation — boundary-contracts is a small
TS package and ships with one operator-managed
`.github/workflows/*.yml`).

**Outcome:** `pass`.

## Target Summary

| Property | Value |
| --- | --- |
| Repo name | `boundary-contracts` (operator-supplied local path; reported with relative name only per intake policy) |
| Source SHA | `884abb40` |
| Setup method | `git clone --local --no-hardlinks` to `mktemp -d` |
| Size | 1.1 MB, 267 files |
| Workspaces | none (single package) |
| `.github/workflows/*.yml` | 1 |
| Top-level scripts | `build`, `typecheck`, `test`, `test:watch`, plus example/scenario scripts |
| Representative path | `src/index.ts` |

## Setup Results

| Step | Result | Notes |
| --- | --- | --- |
| `git clone --local --no-hardlinks` | pass | local clone, no network |
| `npm ci` | pass | 20 packages, 0 vulnerabilities, ~1.2 s |
| `npm run build` | pass | `tsc -p tsconfig.build.json` |

## Core Matrix Results

| Command | Result | Notes |
| --- | --- | --- |
| `init` | pass | `.rekon/config.json` written |
| `refresh` | pass | 14 lifecycle steps; `status: passed`; `freshness: fresh`; no missing artifacts |
| `artifacts validate` (post-refresh) | pass | `valid: true`, 0 issues |
| `artifacts freshness` (post-refresh) | aggregate `fresh` | 0 issues (clean tree; no historical artefacts yet) |
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

Representative path: `src/index.ts`.

| Command | Result | Notes |
| --- | --- | --- |
| `resolve preflight` | pass | `ResolverPacket: preflight-…` |
| `intent work-order` | pass | produced `IntentMap` + `WorkOrder` + `VerificationPlan` (3 commands) |
| `verify run --dry-run` | pass | 3 commands, all `not-run`, `executed: false` |
| **`verify run --execute`** | **pass** | **3/3 commands passed: `npm run typecheck` (exit 0 / 680 ms); `npm run test` (exit 0 / 1 701 ms); `npm run build` (exit 0 / 602 ms)** |
| `verify result from-run` | pass | `VerificationResult.status: passed`; 3/3 passed |
| Republish proof / architecture / agent-contract | pass | each Publication updated to cite the passed VerificationResult |
| **`publish github-check --dry-run`** | **pass** | **`conclusion: success`; `output.title: "Verification: passed (fresh)"`; 6 cited refs; no network call** |
| `publish pr-comment --dry-run` | pass | `wouldPublish: false`; 5 expected readiness gaps; no network |
| Final `artifacts validate` | pass | `valid: true`, 0 issues |
| Final `artifacts freshness` | aggregate `stale` | 15 historical `newer-input-exists` issues (documented latest-major pattern) |

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
| EvidenceGraph facts | (not surfaced as a summary field; 1 EvidenceGraph artefact produced) |
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
| VerificationRun (execute) status | `passed` |
| `npm run typecheck` | passed (exit 0, 680 ms) |
| `npm run test` | passed (exit 0, 1 701 ms) |
| `npm run build` | passed (exit 0, 602 ms) |
| VerificationResult status | `passed` |

## Publication Metrics

| Metric | Value |
| --- | --- |
| Proof publication | written ×2 (pre-verify + post-verify) |
| Architecture publication | written ×2 |
| Agent-contract publication | written ×2 |
| Refresh's own architecture publication | 1 |
| Total Publications | 7 |
| Publication render failures | 0 |
| Unreadable publications | 0 |

## GitHub Dry-Run Metrics

| Metric | Value |
| --- | --- |
| `publish github-check --dry-run` `dryRun` | `true` |
| `publish github-check --dry-run` `conclusion` | `success` |
| `publish github-check --dry-run` output title | `Verification: passed (fresh)` |
| `publish github-check --dry-run` cited refs count | 6 |
| `publish github-check --dry-run` network calls | 0 |
| `publish pr-comment --dry-run` `dryRun` | `true` |
| `publish pr-comment --dry-run` `wouldPublish` | `false` |
| `publish pr-comment --dry-run` readiness gap count | 5 |
| `publish pr-comment --dry-run` network calls | 0 |

## Outcome Classification

**`pass`.**

Every release-relevant gate cleared:

- `refresh` completed cleanly (14 steps,
  `freshness: fresh`).
- `artifacts validate` returned `valid: true`,
  0 issues at every checkpoint.
- All three publications rendered.
- Both GitHub dry-runs rendered without
  network calls.
- No CLI crash; no artefact corruption; no
  token leak; no source mutation outside the
  temp copy.
- `verify run --execute` actually ran real
  commands and all 3 passed.
- `publish github-check --dry-run` propagated
  `conclusion: success` end-to-end.

No findings exist in this small TS package's
current source tree (the import-boundary
rule pack's demo fixtures are not part of
this repo). That's a clean signal, not a bug.

## Follow-Up Work

No follow-up work required from this target.
Optional: revisit when boundary-contracts
grows to include cross-boundary tests beyond
its current scope, to confirm Rekon's
filter / adjudication chain remains useful at
larger sizes.
