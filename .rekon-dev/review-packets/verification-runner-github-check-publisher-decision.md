# Review Packet — GitHub Check Publisher Decision + Gated Skeleton (P1.1 slice)

**Slice:** `verification-runner-github-check-publisher-decision`
**Sequence position:** Step 6a of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md).
**Batch type:** Decision memo + gated skeleton + tests + docs.
No GitHub API calls. No active workflow. No GitHub write
permissions. No artifact-shape change. No new capability
package.

## CHANGES MADE

1. **Decision memo** —
   [`docs/strategy/verification-runner-github-check-publisher-decision.md`](../../docs/strategy/verification-runner-github-check-publisher-decision.md).
   Eleven required headings: Decision Summary, Problem,
   Current GitHub Workflow State, Options Considered,
   Recommendation, Canonical Artifact Boundary, Permission
   Model, Fork And Secret Safety, Check Payload Model, What
   This Does Not Do, Implementation Sequence, Tests Required
   For Implementation. Recommends **Option B (gated GitHub
   Check publisher with split-shipment: decision + skeleton
   now, dry-run CLI next slice, API call later)**.

2. **Gated skeleton in `@rekon/capability-docs`.** Two pure
   helpers, no network client imported:
   - `buildGitHubCheckPayload(input)` — builds the Check
     payload (name, status, conclusion, output.title,
     output.summary, externalId, citedRefs) from
     artifact-like inputs. Pure function; reads no
     environment variables; calls no I/O.
   - `assessGitHubCheckPublisherReadiness(input)` — returns
     `{ ready, issues[] }` after evaluating opt-in env vars,
     token presence, repository slug, head SHA, event trust,
     and write-permission confirmation. Pure function; reads
     environment from the caller-provided `env` map.

3. **Exported types and constants:**
   - `GITHUB_CHECK_PUBLISHER_CANONICAL_TRUTH_REMINDER`.
   - `GITHUB_CHECK_PUBLISHER_DEFAULT_NAME`.
   - `GitHubCheckPublisherConfig`,
     `GitHubCheckConclusion`,
     `GitHubCheckPayload`,
     `GitHubCheckPublisherReadinessIssueCode`,
     `GitHubCheckPublisherReadinessIssue`,
     `GitHubCheckPublisherReadiness`,
     `GitHubCheckEventTrust`,
     `GitHubCheckPublisherReadinessEvent`,
     `GitHubCheckPublisherReadinessInput`,
     `GitHubCheckPublisherFreshness`,
     `GitHubCheckPublisherProofStatus`,
     `GitHubCheckPublisherRunStatus`,
     `BuildGitHubCheckPayloadInput`.

4. **Contract test suite** —
   `tests/contract/github-check-publisher-skeleton.test.mjs`
   (25 tests). Covers every conclusion code, summary content
   (canonical-truth reminder, cited refs, artifacts-valid
   status), every readiness issue code, env-flag parsing,
   and a read-only / network-free invariant that scans the
   capability-docs source for forbidden imports / tokens.

5. **Docs test suite** —
   `tests/docs/verification-runner-github-check-publisher-decision.test.mjs`
   (13 assertions). Pins memo existence, all required
   headings, gate language, env var names, conclusion
   mapping presence, CHANGELOG mention, and review-packet
   PURPOSE PRESERVATION CHECK.

6. **Strategy memo update** —
   [`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md)
   step 6 (GitHub Check publisher) flipped to ✅ Shipped (the
   decision memo + gated skeleton portion).

7. **Cross-doc updates** —
   - `docs/examples/github-actions-verification-runner.md`,
   - `docs/concepts/verification-runs.md`,
   - `docs/concepts/verification-results.md`,
   - `docs/concepts/proof-report-publication.md`,
   - `docs/artifacts/proof-report-publication.md`,
   - `docs/strategy/issue-governance-architecture-decision.md`
     (new shipped slice + renumbering),
   - `docs/strategy/classic-behavior-roadmap.md`,
   - `docs/strategy/roadmap.md`,
   - `README.md`,
   - `CHANGELOG.md`.

## PUBLIC API CHANGES

- **New exports from `@rekon/capability-docs`:**
  - `buildGitHubCheckPayload`
  - `assessGitHubCheckPublisherReadiness`
  - `GITHUB_CHECK_PUBLISHER_CANONICAL_TRUTH_REMINDER`
  - `GITHUB_CHECK_PUBLISHER_DEFAULT_NAME`
  - (13 type aliases — see CHANGES MADE)
- **No new artifact type.** No new artifact `schemaVersion`.
- **No new capability package.** No new role / permission.
- **No new CLI command.** The dry-run CLI ships next slice.
- **No existing CLI command modified.**
- **No GitHub-write permission added** to any workflow
  template.

## PURPOSE PRESERVATION CHECK

The slice is **additive**. It preserves every existing
invariant:

- **Verification runner v1 purpose.** Unchanged. The skeleton
  reads artifacts; it does not execute verification commands.
- **VerificationPlan / VerificationRun / VerificationResult.**
  Unchanged. The skeleton only *cites* these refs; it does
  not produce or mutate them.
- **Proof-report / architecture-summary / agent-contract
  Publications.** Unchanged. The skeleton cites their refs
  but does not regenerate or override them.
- **Workflow templates' safety contract.** Unchanged. Both
  bundled templates still declare `permissions: contents:
  read` and still pass `rekon verify github-workflow
  validate`.
- **Canonical-truth invariant.** Preserved and made
  explicit. The skeleton refuses to emit a payload without
  the canonical-truth reminder. The decision memo and
  README explicitly call out that GitHub status is a
  downstream surface, not canonical truth.
- **Fork-safety invariant.** Strengthened. The readiness
  gate refuses forked PRs by default and refuses
  `pull_request_target` unconditionally.
- **No-auto-resolution invariant.** Unchanged. The skeleton
  builds a payload; it does not touch findings, lifecycle,
  coherency, reconciliation, or any governance artifact.
- **Local-first runner posture.** Unchanged. The skeleton
  reads only artifact-like shapes the caller passes in. It
  does not authenticate to GitHub or any external service.

## CODEBASE-INTEL ALIGNMENT

- **Classic guarantee preserved:** reviewers see proof and
  governance state at the decision point. The GitHub Check
  payload is a downstream rendering of artifact-backed proof
  state — not a substitute for the canonical artifacts.
- **Classic anti-pattern avoided:** Rekon does not treat
  GitHub status as canonical. The payload always says so.
- **Capability map:** unchanged. `@rekon/capability-docs`
  already produces `Publication` artifacts; the new helpers
  are payload-building functions, not publishers themselves
  (no `produces: ["Publication"]` Publisher exported here).
- **Conformance:** unchanged. No new role / permission /
  artifact type.

## OPTIONS CONSIDERED

| Option | Verdict |
| --- | --- |
| A — Keep templates only | Acceptable as alpha posture; not a long-term answer. |
| B — Gated GitHub Check publisher (split: decision + skeleton now, dry-run CLI next, API call later) | **Recommended.** |
| C — PR comment publisher first | Rejected for this batch; requires broader `pull-requests: write` scope. |
| D — Hosted / GitHub App publisher | Rejected for alpha / beta; requires hosted infrastructure Rekon does not have. |

## RECOMMENDATION

Adopt Option B. Ship the decision memo + gated skeleton in
this batch. Ship a dry-run CLI in the next batch. Ship the
actual GitHub API call in a later batch with its own review
packet, behind the readiness gate from this batch.

## GITHUB CHECK PAYLOAD MODEL

### Conclusion mapping (in precedence order)

| Signal | Conclusion |
| --- | --- |
| `artifactsValid === false` | `failure` |
| `VerificationRun.status === "killed"` | `failure` |
| `VerificationRun.status === "timeout"` | `timed_out` |
| `VerificationResult.status === "failed"` | `failure` |
| `VerificationResult.status === "partial"` | `action_required` |
| `VerificationResult` missing | `action_required` |
| Freshness is `stale` or `missing-plan` | `action_required` |
| `VerificationResult.status === "not-run"` | `neutral` |
| `VerificationResult.status === "passed"` + freshness `fresh` | `success` |
| Default | `neutral` |

The run-level `timeout` signal wins over a generic
`result.status === "failed"` because it's more specific
about *why* the result is failed; `killed` and
`artifacts-valid: false` are most severe and stay at the top.

### Summary content (always present)

- The conclusion line.
- Proof status, run status, freshness, artifacts-valid
  status.
- Cited refs for `VerificationResult`, `VerificationRun`,
  `VerificationPlan`, proof-report `Publication`,
  architecture-summary `Publication`, agent-contract
  `Publication` (when each is present).
- The canonical-truth reminder:
  `GitHub status is not canonical truth; Rekon artifacts
  remain canonical.`
- Workflow run URL (when supplied via
  `config.runUrl`).

### externalId

When a `VerificationResult` ref is supplied, the payload's
`externalId` is `VerificationResult:<id>`; otherwise it
falls back to `VerificationRun:<id>` when that is supplied;
otherwise it is `undefined`. This lets the future API
caller deduplicate Check runs across re-deliveries.

## SAFETY / PERMISSIONS

### Readiness gate

`assessGitHubCheckPublisherReadiness` returns
`ready: false` unless **all** of:

- `REKON_GITHUB_CHECKS=1` (or `true`).
- `GITHUB_TOKEN` is present and non-empty.
- `GITHUB_REPOSITORY` is present and non-empty.
- A head SHA is present (`headShaOverride` or
  `env.GITHUB_SHA`).
- Event trust is `trusted` — OR is `untrusted-fork` and the
  caller passed `forkOverride: true`. `unconditional-deny`
  (i.e. `pull_request_target`) refuses regardless of any
  override.
- Caller passes `writePermissionConfirmed: true`.

### Default-deny on fork PRs

`pull_request` events with `pullRequestIsFork: true` fail
the gate by default (`untrusted-event` issue). The
`forkOverride` escape hatch exists so a maintainer can wire
a manually-approved workflow later; alpha/beta does not use
it.

### Unconditional-deny on `pull_request_target`

The skeleton refuses to mark itself ready for
`pull_request_target` events, period. Even with
`forkOverride: true`. This matches the alpha workflow
validator, which rejects `pull_request_target` as the
canonical fork-escalation vector.

### Write-permission confirmation

The skeleton refuses to mark itself ready unless the caller
explicitly affirms `writePermissionConfirmed: true`. The
actual GitHub permission check happens at API-call time in
a later slice; this flag is the explicit hand-off from the
caller (the future CLI) that says "yes, I'm operating in a
workflow that granted `checks: write`."

### Read-only invariant

The skeleton makes no HTTP request, opens no socket, writes
no file. The contract test scans the capability-docs source
for forbidden tokens (`@octokit/`, `octokit`,
`node-fetch`, `got`, `axios`, `undici`, `https.request`,
`http.request`, `fetch(`, `new Request(`) and fails the
build if any are present.

## TESTS / VERIFICATION

- **Contract suite:**
  `tests/contract/github-check-publisher-skeleton.test.mjs` —
  25 tests, all passing. Covers:
  - 9 conclusion-mapping cases (success / failure / partial
    / not-run / timeout / killed / stale / missing /
    artifacts-invalid override).
  - 3 summary-content tests (canonical-truth reminder,
    cited refs, artifacts-valid status).
  - 10 readiness-gate tests (env absent, token absent,
    repository absent, sha absent, forked PR default deny,
    `pull_request_target` deny, write-permission absent,
    `workflow_dispatch` happy path, `push` happy path,
    same-repo `pull_request` happy path).
  - 1 fork-override allow case.
  - 1 read-only / no-network-client invariant.
  - 1 env-flag parsing test (`1`, `true`, `TRUE`, `no`).

- **Docs suite:**
  `tests/docs/verification-runner-github-check-publisher-decision.test.mjs` —
  13 assertions, all passing. Pins memo existence, all
  required headings, gate language, env var names, the
  conclusion mapping (every conclusion value), CHANGELOG
  mention, and the review-packet PURPOSE PRESERVATION
  CHECK.

- **Full suite:** 1218 (prior) + 25 (new contract) + 13
  (new docs) = expected ≥ 1256 pass / 1 skip.

## INTENTIONALLY UNTOUCHED

- `packages/capability-verify/` — unchanged. The runner
  surface owns execution; the publisher surface owns
  payload-building. No coupling required.
- `@rekon/sdk` conformance — no new role / permission.
- `@rekon/runtime` artifact category map — no new artifact
  type.
- `@rekon/kernel-*` — no change.
- `rekon verify run` — unchanged.
- `rekon verify result from-run` — unchanged.
- `rekon artifacts latest` — unchanged.
- `rekon verify github-workflow validate` — unchanged. Both
  bundled templates still pass validation.
- `.github/workflows/*.yml` in the Rekon repo — none added;
  none modified.
- All bundled workflow templates' `permissions: contents:
  read` posture — unchanged.

## RISKS / FOLLOW-UP

- **Risk: skeleton drift.** If the payload shape changes
  before the API-call slice lands, the dry-run CLI and the
  eventual API call will need to be re-reviewed. Mitigation:
  the conclusion mapping and summary structure are pinned
  by contract tests; any change requires updating both the
  helper and the tests in the same review packet.
- **Risk: false sense of readiness.** The readiness gate
  says "API call would be safe to attempt," but a token
  without `checks: write` actually granted by the workflow
  will still fail at API-call time. Mitigation: the
  `writePermissionConfirmed` flag forces the caller to
  affirm the permission explicitly; the docs say the caller
  must verify this externally. The future API-call slice
  will add a probe step that surfaces the GitHub-side
  permission error cleanly.
- **Risk: payload growth.** As more canonical artifacts
  land (e.g. issue-merge ledgers, finding-lifecycle
  reports), the Check summary risks bloating. Mitigation:
  the skeleton's summary is intentionally compact (refs +
  conclusion only); the longer markdown body goes into
  `output.text`, which is reserved for the dry-run CLI
  slice.
- **Follow-up — step 6b:** add
  `rekon publish github-check --dry-run --json` CLI that
  reads local Rekon artifacts and prints the Check payload
  + readiness report. Still no API call.
- **Follow-up — step 6c:** add the actual GitHub API call
  behind the readiness gate, under a dedicated import path
  (likely `packages/capability-docs/src/github-check-client.ts`).
  This is the first slice that will introduce a
  network-client dependency in Rekon; it will require its
  own decision memo, its own review packet, and its own
  contract tests with mocked HTTP.
- **Follow-up — step 7:** PR comment publisher. Same shape,
  broader scope (`pull-requests: write`); will reuse the
  readiness gate.

## NEXT STEP

Step 6b of the CI / GitHub adapter implementation sequence:
the dry-run CLI for the GitHub Check publisher
(`rekon publish github-check --dry-run --json`). Reads local
Rekon artifacts, builds the payload via this slice's
helper, prints the readiness report. Still no API call.
