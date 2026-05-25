# Private Beta Onboarding Validation Report

**Status:** shipped.
**Audience:** Rekon operator + onboarding
quickstart reviewers.
**Scope:** records what happened when the
[Private Beta Onboarding Quickstart](private-beta-onboarding-quickstart.md)
was executed end-to-end against one
non-Rekon target repository (anonymized as
`target-1`) under the intake fields the
operator authorised in the work-order
prompt.

## Decision Summary

**Outcome: `pass-with-known-limitations`.**

The quickstart was followed verbatim, without
silent adjustments, against a temp copy of a
real non-Rekon target. The full
first-scan command matrix ran without
crashing. `artifacts validate` returned
`valid: true`. Path freshness produced
`unknown` on the first run (no baseline)
and `fresh` on the second run (295 / 295
paths fresh, no refresh required). The
optional verification chain ran honestly —
`npm run typecheck` / `npm run test` /
`npm run build` were all recorded as
`failed` in the canonical `VerificationRun`
because the temp-copy target's
`pnpm`-workspace install was deliberately
not run, and `VerificationResult` was
derived correctly from that run. GitHub
dry-runs made **no network calls** and
returned the expected readiness blocks
(no `GITHUB_TOKEN`, no `REKON_PR_COMMENTS`,
no write-permission confirmation). Two
minor quickstart gaps surfaced (recorded in
the *Quickstart Gaps* section below) — both
are documentation refinements, not Rekon
defects.

**This batch does not publish to npm.**
The no-NPM private-beta posture from the
[No-NPM Beta Distribution Policy](../strategy/no-npm-beta-distribution-policy.md)
is unchanged.

**This batch does not change package
versions.** Rekon remains at
`0.1.0-beta.0`.

**This batch does not create a git tag.**
No release tag is created.

**This batch does not create a GitHub
Release.** No GitHub Release artifact is
created.

**The validation run used a temp copy of a
non-Rekon repository.** The temp copy was
built via `mktemp -d` + `git clone --local
--no-hardlinks` of the operator-authorised
target. The original target repo was
**never** mutated. No `rekon refresh`,
`rekon paths freshness`, or any other
command touched the original target's
working tree. The temp copy was deleted
after the canonical artifact counts were
recorded.

**Rekon artifacts remain canonical; GitHub
dry-runs are downstream previews.** Both
GitHub dry-runs were invoked with
`--dry-run` only and made no HTTP calls.
The local `.rekon/` artifact store inside
the temp copy held the canonical results.

## Target Repository

Referred to throughout this report by the
safe name **`target-1`**. The full
host-side path and the target's product
name are intentionally omitted from this
report per the work order's anonymization
rule.

| Field | Value |
| --- | --- |
| Safe name | `target-1` |
| Archetype | small Next.js app |
| Primary language | TypeScript |
| Source-of-truth manager | `pnpm-workspace` |
| Notable surface | `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `src/{app,components,features,lib}/**` |
| Representative path | `src/lib/validation.ts` |
| Approximate working-tree size | 295 fingerprintable paths |
| Sensitive paths flagged | `.env*`, deployment secrets if any (none surfaced) |

The temp copy was prepared with:

```bash
TMP_REKON_TARGET="$(mktemp -d)"
git clone --local --no-hardlinks "$TARGET_SRC" "$TMP_REKON_TARGET/target-1"
TARGET_ROOT="$TMP_REKON_TARGET/target-1"
```

No `rsync` fallback was needed because the
target is a git repo.

## Commands Run

All commands were issued from the Rekon
checkout via:

```bash
REKON_ROOT="$(pwd)"
CLI="$REKON_ROOT/packages/cli/dist/index.js"
```

### Command Matrix

| Step | Command | Result | Notes |
| --- | --- | --- | --- |
| init | `node "$CLI" init --root "$TARGET_ROOT" --json` | pass | wrote `.rekon/config.json` + artifact-index scaffolding |
| refresh | `node "$CLI" refresh --root "$TARGET_ROOT" --json` | pass | canonical chain written (`EvidenceGraph`, `IntelligenceSnapshot`, `ObservedRepo`, `FindingReport`, …); first publication snapshot included `architecture-summary` |
| paths freshness (first) | `node "$CLI" paths freshness --root "$TARGET_ROOT" --json` | first-baseline | reported the working-tree fingerprint and wrote the first `PathFreshnessReport` artifact |
| artifacts validate | `node "$CLI" artifacts validate --root "$TARGET_ROOT" --json` | `valid: true` | no validation issues |
| findings list | `node "$CLI" findings list --root "$TARGET_ROOT" --json` | 0 findings | first-class acceptable outcome (no findings yet for a freshly-scanned small target) |
| findings filter-health | `node "$CLI" findings filter-health --root "$TARGET_ROOT" --json` | pass | `policyFilters: 0`, no policy rules |
| issues adjudicate | `node "$CLI" issues adjudicate --root "$TARGET_ROOT" --json` | pass | 0 groups, 0 merge candidates |
| issues list | `node "$CLI" issues list --root "$TARGET_ROOT" --json` | 0 issues | first-class acceptable outcome |
| coherency delta | `node "$CLI" coherency delta --root "$TARGET_ROOT" --json` | pass | empty remediation queue |
| publish architecture | `node "$CLI" publish architecture --root "$TARGET_ROOT" --json` | pass | `Publication` artifact written under `.rekon/artifacts/publications/` |
| publish agent-contract | `node "$CLI" publish agent-contract --root "$TARGET_ROOT" --json` | pass | `Publication` artifact written |
| publish proof | `node "$CLI" publish proof --root "$TARGET_ROOT" --json` | pass | `Publication` artifact written |
| paths freshness (second) | `node "$CLI" paths freshness --root "$TARGET_ROOT" --json` | `fresh` | **295 / 295 paths fresh; `refreshRecommended: false`** |
| intent work-order | `node "$CLI" intent work-order --root "$TARGET_ROOT" --path src/lib/validation.ts --goal "private beta onboarding validation" --json` | pass | wrote `IntentMap`, `WorkOrder`, `VerificationPlan` |
| artifacts latest VerificationPlan | `node "$CLI" artifacts latest --root "$TARGET_ROOT" --type VerificationPlan --id-only` | pass | returned plan ref |
| verify run --dry-run | `node "$CLI" verify run --root "$TARGET_ROOT" --plan $PLAN_REF --dry-run --json` | pass | `Dry run only. No commands were executed.` |
| verify run --execute | `node "$CLI" verify run --root "$TARGET_ROOT" --plan $PLAN_REF --execute --json` | recorded honestly | `npm run typecheck` → failed, `npm run test` → failed, `npm run build` → failed (target uses `pnpm-workspace`; `node_modules` was deliberately not installed in the temp copy). All three failures recorded in the canonical `VerificationRun` artifact. |
| artifacts latest VerificationRun | `node "$CLI" artifacts latest --root "$TARGET_ROOT" --type VerificationRun --id-only` | pass | returned run ref |
| verify result from-run | `node "$CLI" verify result from-run --root "$TARGET_ROOT" --run $RUN_REF --json` | pass | `VerificationResult derived from VerificationRun. No commands were re-run. No findings were auto-resolved.` |
| publish proof (re-publish) | `node "$CLI" publish proof --root "$TARGET_ROOT" --json` | pass | proof report regenerated with the new `VerificationResult` |
| publish architecture (re-publish) | `node "$CLI" publish architecture --root "$TARGET_ROOT" --json` | pass | architecture summary regenerated |
| publish agent-contract (re-publish) | `node "$CLI" publish agent-contract --root "$TARGET_ROOT" --json` | pass | agent contract regenerated |
| publish github-check --dry-run | `node "$CLI" publish github-check --root "$TARGET_ROOT" --dry-run --json` | dry-run / no-network | `readiness.ready: false` (no env), payload generated, `conclusion: failure` derived from failed verification |
| publish pr-comment --dry-run | `node "$CLI" publish pr-comment --root "$TARGET_ROOT" --dry-run --json` | dry-run / no-network | `readiness.ready: false` with five readiness issues: not-enabled, missing-repository, missing-pr-number, missing-token, write-permission-not-confirmed |
| final artifacts validate | `node "$CLI" artifacts validate --root "$TARGET_ROOT" --json` | `valid: true` | no validation issues |
| artifacts freshness | `node "$CLI" artifacts freshness --root "$TARGET_ROOT" --json` | `status: unknown` | acceptable per the work order's classification — historical `newer-input-exists` warnings from publish-then-republish-then-validate, plus expected `lineage.unknown` for `PathFreshnessReport` (artifact has no inputRefs by design) |

## Output Summary

### Output Summary Table

| Output | Result | Ref / Notes |
| --- | --- | --- |
| Architecture summary | pass | three `Publication` artifacts written across the run (initial, post-verify republish, final) |
| Agent contract | pass | two `Publication` artifacts written (initial + post-verify republish) |
| Proof report | pass | three `Publication` artifacts written (initial, post-verify republish, after final verification chain) |
| PathFreshnessReport | pass | three `PathFreshnessReport` artifacts (first-baseline unknown + second `fresh` + a third inside the publication chain); second run 295/295 paths fresh |
| FindingReport / FindingFilterReport | pass | 0 findings, 0 policy filters — first-class acceptable outcome for a freshly-scanned small target |
| VerificationPlan / VerificationRun / VerificationResult | recorded honestly | plan + run + result all written; 3 / 3 commands recorded as `failed` (no install in temp copy) |
| GitHub Check dry-run | dry-run / no-network | payload generated, conclusion `failure` derived from `VerificationResult`, readiness=false (no env) |
| PR comment dry-run | dry-run / no-network | readiness=false with five concrete readiness issues; no body emitted because readiness blocked |

Total canonical artifacts written under
`.rekon/artifacts/` inside the temp copy:
**36** across `actions/`, `findings/`,
`graph/`, `publications/`, `repo/`, and
`snapshot/`. Of those, **8** were
`Publication` artifacts and **3** were
`PathFreshnessReport` artifacts.

## Artifact Results

`artifacts validate` returned `valid: true`
both at the mid-run checkpoint (after the
first publication chain) and at the
post-verification checkpoint. No
validation issues at any point in the run.

`artifacts freshness` returned `status:
unknown` at the end. Inspecting the issues
list confirmed the warnings are all
historical (`newer-input-exists` on
publications and a `CoherencyDelta` whose
input was superseded by a later
republish) plus the expected
`lineage.unknown` for `PathFreshnessReport`
(the artifact intentionally has no
`inputRefs` — see
[Path Freshness Safety Review](../strategy/path-freshness-safety-review.md)).
Per the work order's *Acceptable Outcomes*
list, "aggregate artifacts freshness
reports historical newer-input-exists" is
**not** a blocker.

## Path Freshness Results

| Run | Status | Total / Fresh / Other |
| --- | --- | --- |
| First (no baseline) | first-baseline | 295 / — / — |
| Second (unchanged target) | `fresh` | 295 / 295 / 0 changed, 0 missing, 0 new, 0 unknown |
| Third (after publish chain) | `fresh` | 295 / 295 / 0 changed, 0 missing, 0 new, 0 unknown |

The quickstart's pin matched reality:
**"First run may be `unknown` because no
baseline exists" / "Second unchanged run
should be `fresh`."** The transition
worked exactly as documented.
`refreshRecommended: false` was returned
on the second run because the working tree
matched the baseline.

## Verification Results

| Field | Value |
| --- | --- |
| `VerificationPlan` ref | `VerificationPlan:verification-plan-…` (recorded as plan ref in the run) |
| `VerificationRun.commandResults` | 3 entries, all `failed`: `npm run typecheck`, `npm run test`, `npm run build` |
| `VerificationRun` message | `Verification commands executed; one or more failed/timed out/killed. No findings were auto-resolved.` |
| `VerificationResult` derivation | `VerificationResult derived from VerificationRun. No commands were re-run. No findings were auto-resolved.` |
| `safety.shell` | `false` (no shell allowed) |
| `safety.executeRequired` | `true` (was set; --execute was passed) |
| `safety.permission` | `execute:verification` |

The verification chain captured the failures
honestly without any CLI crash. Per the
work order's *Acceptable Outcomes* list,
"verification fails but is recorded
honestly" is **not** a blocker. The
[VerificationPlan Missing-Script Tolerance
Memo](../strategy/verification-missing-script-tolerance.md)'s
`skipped` semantics did **not** apply
here because the scripts existed in
`package.json`; they were attempted and
failed (no `node_modules`).

## GitHub Dry-Run Results

### `publish github-check --dry-run`

- `readiness.ready: false` (expected — no
  env)
- `payload` generated, including
  `conclusion: failure` derived from the
  failed `VerificationResult`. **CONCLUSION
  POLICY:** the `failure` conclusion is
  driven by `pickConclusion`'s response to
  `VerificationResult.status`, **not** by
  path freshness (which was `fresh`). This
  matches the
  [Path Freshness Safety Review](../strategy/path-freshness-safety-review.md)
  pin: *"Stale path freshness is a warning,
  not a GitHub Check conclusion override."*
- No HTTP call made.

### `publish pr-comment --dry-run`

- `readiness.ready: false` with five
  concrete readiness issues:
  1. `not-enabled` — `REKON_PR_COMMENTS`
     not set to `1`/`true` (publisher is
     gated off by default).
  2. `missing-repository` —
     `GITHUB_REPOSITORY` not set.
  3. `missing-pr-number` — neither
     `GITHUB_PR_NUMBER` nor `PR_NUMBER`
     set.
  4. `missing-token` — `GITHUB_TOKEN`
     not set.
  5. `write-permission-not-confirmed` —
     caller did not pass the
     write-permission confirmation flag.
- `comment` body was not rendered because
  readiness blocked.
- No HTTP call made.

Both dry-runs satisfied the quickstart's
pin: **"Dry-run commands make no network
calls."**

## Quickstart Gaps

| Gap | Severity | Recommended Fix |
| --- | --- | --- |
| The quickstart's *Optional Verification Flow* assumes the target installs cleanly via `npm`. The target used `pnpm-workspace` + `pnpm-lock.yaml`, so `npm run` commands failed honestly. The quickstart could call out that targets using a non-npm package manager will see `failed` results unless the operator runs the target's native install command first. | low | Add a one-line note to *Optional Verification Flow* in the quickstart pointing operators at the support playbook's blocker taxonomy (which already covers this as a first-class acceptable outcome). |
| `artifacts freshness` at the end of the run returned `status: unknown` with historical `newer-input-exists` warnings (because `publish architecture` / `publish proof` were called twice). The quickstart's "Run path freshness twice" pattern is clear; the `artifacts freshness` behaviour after multiple publish cycles is not called out at all. A new operator might mistake the historical warnings for a blocker. | low | Add a one-line note to *Inspect The Main Outputs* in the quickstart explaining that re-publishing the same publication generates historical `newer-input-exists` warnings on the older artifacts — these are not blockers; the support playbook already classifies aggregate artifacts-freshness `unknown` as a first-class acceptable outcome. |

Both gaps are **documentation refinements**,
not Rekon defects. Both are recorded for
the post-validation follow-up but do not
warrant a separate "blocker fix" batch.

## Support Template Gaps

| Gap | Severity | Recommended Fix |
| --- | --- | --- |
| None observed. The support playbook + bug-report template already cover the two quickstart gaps above as first-class acceptable outcomes. | n/a | n/a |

No bug report was filed during the
validation run because no blocker was
encountered. The support template was
**not** exercised in earnest; the
template's *fitness for purpose* is
inferred from the fact that it already
covers the two minor gaps above
explicitly.

## Blockers

| Blocker | Status | Notes |
| --- | --- | --- |
| `artifacts validate` invalid | none | both checkpoints returned `valid: true` |
| CLI crash | none | every command exited cleanly |
| Malformed artifact | none | none observed |
| Publication render failure | none | three publication kinds all rendered successfully across initial + republish cycles |
| Token / log leak | none | no token was set; no command logged secrets |
| Source mutation outside temp copy | none | only the temp copy under `mktemp -d` was touched; the original target's working tree was never modified |
| Dry-run network call | none | both dry-runs made zero HTTP calls |
| Quickstart command materially wrong | none | the quickstart's command matrix matched reality; the two gaps above are wording refinements, not factual errors |
| Privacy / redaction guidance insufficient | none | the *Anonymization Posture* section of the intake-request memo + the playbook's *Privacy And Redaction Guidance* together produced a clean `target-1` report with no host-side paths and no source excerpts |

**No onboarding blockers found.**

## Outcome Classification

**`pass-with-known-limitations`.**

The work order's classification matrix
defines three outcomes:

- `pass` — quickstart followed verbatim,
  no gaps, no blockers, no documentation
  refinement requests.
- `pass-with-known-limitations` —
  quickstart followed verbatim, no
  blockers, but minor documentation
  refinements surfaced.
- `blocked` — Rekon defect or quickstart
  defect that prevents an operator from
  proceeding.

This run produced **two minor
documentation refinements** (pnpm-workspace
note in *Optional Verification Flow* and
artifacts-freshness behaviour note in
*Inspect The Main Outputs*) and **zero
blockers**, so the classification is
`pass-with-known-limitations`. The
follow-up work to land those refinements
is a **separate** strategy / docs batch
and does not require a Rekon code change.

## What This Does Not Do

This batch **does not**:

- Mutate any operator repo. The original
  `target-1` source repo was never
  touched; only a `mktemp -d` temp copy
  was used and the temp copy was deleted
  after the run.
- Authorise `npm publish` of any Rekon
  workspace package. The no-NPM beta
  posture is unchanged.
- Bump any version number. Rekon remains
  at `0.1.0-beta.0`.
- Create a git tag or GitHub Release.
- Install any active workflow YAML.
- Open a watcher daemon or any background
  refresh.
- Apply any quickstart documentation
  refinement in this batch — both
  documentation gaps are recorded here
  but the *fix* lands in a subsequent
  batch so this validation report itself
  is the unchanged record.

## Follow-Up Work

**Recommended next slice:** *Private beta
onboarding quickstart refinements (v2).*
Apply the two minor documentation
refinements recorded in *Quickstart Gaps*:

1. Add a one-line note in *Optional
   Verification Flow* about non-npm
   package managers (pnpm / yarn /
   bun).
2. Add a one-line note in *Inspect The
   Main Outputs* about
   re-publication-induced
   `newer-input-exists` warnings in
   `artifacts freshness`.

Both refinements are strategy / docs /
tests-only, no version bump, no runtime
behaviour change.

**Recommended slice after that:** *Private
beta cohort onboarding plan.* With one
end-to-end validation in hand, define how
to invite and support the first private
beta users using the source-checkout
distribution + the support playbook + the
quickstart + the validation report + the
bug-report template as a coherent
package.

## Cross-References

- [Private Beta Onboarding Quickstart](private-beta-onboarding-quickstart.md)
- [Private Beta Onboarding Validation Intake Request](private-beta-onboarding-validation-intake-request.md)
- [Private Beta Support Playbook](private-beta-support-playbook.md)
- [Private Beta Bug Report Template](private-beta-bug-report-template.md)
- [No-NPM Beta Distribution Policy](../strategy/no-npm-beta-distribution-policy.md)
- [Path Freshness Safety Review](../strategy/path-freshness-safety-review.md)
- [VerificationPlan Missing-Script Tolerance Memo](../strategy/verification-missing-script-tolerance.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic-behaviour roadmap](../strategy/classic-behavior-roadmap.md)

## Status

Recorded on 2026-05-25 against Rekon
commit `d25519c`. No version bump. No
npm publish. No git tag. No GitHub
Release. No runtime behaviour change.
No new workflow YAML. No mutation of
any operator repo. Rollback is trivial:
revert this report and the supporting
doc cross-links.
