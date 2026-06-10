# Real-Repo Dogfood Target: figma-ds

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Archetypes covered:** `<nextjs-app>` +
`<mixed-js-ts-repo>` (documented
consolidation — figma-ds is a Next.js app
with a genuine JS/TS mix of 251 `.ts/.tsx`
files alongside 353 `.js/.jsx/.mjs/.cjs`
files, legitimately covering both
archetypes).

**Outcome:** `pass-with-known-limitations`.

## Target Summary

| Property | Value |
| --- | --- |
| Repo name | `figma-ds` (operator-supplied local path; reported with relative name only per intake policy) |
| Source SHA | `0771d984` |
| Setup method | `git clone --local --no-hardlinks` to `mktemp -d` |
| Size | 131 MB |
| Workspaces | none (single Next.js app) |
| Framework | Next.js (App Router; `app/page.tsx`) + React + TypeScript |
| Language mix | 251 TS/TSX files + 353 JS/JSX/MJS/CJS files |
| Top-level scripts | `build`, `typecheck` (no `test`) |
| Representative path | `app/page.tsx` |

## Setup Results

| Step | Result | Notes |
| --- | --- | --- |
| `git clone --local --no-hardlinks` | pass | local clone, no network |
| `npm ci` | pass with warnings | 3 vulnerabilities (2 moderate, 1 high) reported in the target's own deps; install completed normally |
| `npm run build` | pass | builds the figma plugin via `scripts/build.mjs` |

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

Representative path: `app/page.tsx`.

| Command | Result | Notes |
| --- | --- | --- |
| `resolve preflight` | pass | `ResolverPacket: preflight-…` |
| `intent work-order` | pass | produced `IntentMap` + `WorkOrder` + `VerificationPlan` (3 commands) |
| `verify run --dry-run` | pass | 3 commands, all `not-run`, `executed: false` |
| **`verify run --execute`** | **recorded failure (acceptable)** | **3 commands: `npm run typecheck` (failed, exit 2 / 2 286 ms — real TS type errors in source); `npm run test` (failed, exit 1 / 110 ms — no `test` script defined); `npm run build` (passed, exit 0 / 370 ms — plugin build succeeded). VerificationRun status: `failed`. Two distinct failure modes captured honestly: (a) real TS errors in operator's source — Rekon correctly surfaces real diagnostic signal; (b) missing `test` script — same pattern as structured-evals's missing `build`.** |
| `verify result from-run` | pass (with failed status) | `VerificationResult.status: failed`; 1/3 passed, 2/3 failed |
| Republish proof / architecture / agent-contract | pass | each Publication updated to cite the failed VerificationResult |
| **`publish github-check --dry-run`** | **pass (with `conclusion: failure`)** | **payload propagates honestly; `conclusion: failure`; `output.title: "Verification: failed"`; 6 cited refs; no network** |
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

**Observation:** 0 Rekon-detected findings
despite the operator's own `npm run
typecheck` reporting real TS errors. Rekon's
current rule packs focus on
import-boundary / structural patterns, not
TypeScript compile errors. The verify-runner
correctly surfaces the TS errors through
`npm run typecheck`'s exit code; Rekon's
finding-evaluator surface intentionally
doesn't overlap with `tsc`'s job. This is
the correct separation of concerns, not a
gap — but worth noting as a real-repo
signal.

## Verification Metrics

| Metric | Value |
| --- | --- |
| VerificationPlan command count | 3 |
| VerificationRun (dry-run) status | `not-run` |
| VerificationRun (execute) status | **`failed`** |
| `npm run typecheck` | **failed (exit 2, 2 286 ms — real TS errors)** |
| `npm run test` | **failed (exit 1, 110 ms — script not defined)** |
| `npm run build` | passed (exit 0, 370 ms — plugin build) |
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
| `publish github-check --dry-run` `conclusion` | **`failure`** (propagates failed VerificationResult honestly) |
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
- `artifacts validate` returned `valid:
  true` at every checkpoint.
- All three publications rendered.
- Both GitHub dry-runs rendered without
  network calls.
- No CLI crash; no artefact corruption; no
  token leak; no source mutation outside the
  temp copy.
- The verify → result → proof → Check dry-run
  pipeline correctly propagated a **failed**
  state end-to-end.

Known limitations recorded honestly:

- **`npm ci` reported 3 vulnerabilities** in
  the target's own deps (2 moderate, 1
  high). Not a Rekon defect.
- **`npm run typecheck` failed** because the
  operator's source has real TS errors.
  That's a genuine signal from the target
  repo's own typecheck — Rekon faithfully
  recorded it.
- **`npm run test` failed** because no
  `test` script is defined in this repo.
  Same first-class-missing-script pattern as
  structured-evals's missing `build`.
- **0 Rekon-detected findings** in source
  despite real TS errors. Rekon's rule packs
  intentionally don't replicate `tsc`'s job;
  the verify-runner is the right surface for
  type errors and it caught them.

## Follow-Up Work

**Not a release blocker.** Three observations
worth surfacing as post-beta breadth /
polish:

1. **VerificationPlan should detect missing
   scripts gracefully.** When `test` or
   `build` is not defined in `package.json`,
   the plan could either skip the command
   (mark `not-applicable`) or generate a
   stub. Current behaviour (record as
   `failed` with the actual exit code) is
   honest but noisy. Post-beta polish.
2. **The vulnerability warnings from `npm
   ci` are not surfaced in any Rekon
   artefact.** That's correct (they're the
   target maintainer's responsibility, not
   Rekon's) but it could become a future
   capability if Rekon ever adds a
   dependency-audit publisher.
3. **The Next.js app router pattern works.**
   `app/page.tsx` as the representative path
   produced a clean ResolverPacket without
   any front-end-specific gaps.

None affects the cohort decision — the
target passes with known limitations
already documented in the cohort plan + the
no-NPM beta policy.
