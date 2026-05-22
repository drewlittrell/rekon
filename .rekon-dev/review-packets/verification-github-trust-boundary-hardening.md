# Review Packet — Verification / GitHub Trust-Boundary Hardening (P1.1 slice)

**Slice:** `verification-github-trust-boundary-hardening`
**Sequence position:** Step 9 of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md).
**Batch type:** Hardening — touches runtime code in
`@rekon/capability-docs` (GitHub Check + PR comment helpers),
`@rekon/capability-verify` (runner spawn / env / capture), and
the CLI (`publish github-check` proof-chain selection +
`--head-sha`). 17 new contract tests + updates to 2 prior
tests; full suite **1550 passed / 1 skipped**.

## CHANGES MADE

Six trust-boundary fixes — one per row of the bug register
the [GitHub Review Surfaces Parity Review](../../docs/strategy/github-review-surfaces-parity-review.md)
paged for hardening:

1. **Coherent GitHub Check proof-chain selection** (CLI).
   `publish github-check` now picks the VerificationRun
   cited by `VerificationResult.header.inputRefs`, not the
   unrelated latest run. Missing cited run → no run in
   payload + `proofChainWarnings` entry on output. No
   VerificationResult → fall back to latest VerificationRun
   (existing behaviour).
2. **Bounded stdout/stderr streaming capture** (runner).
   New `createBoundedStreamSink` in
   `@rekon/capability-verify`. Each chunk is hashed
   incrementally with sha256 and dropped after the bounded
   excerpt buffer fills. `originalBytes` reflects the full
   stream; `storedBytes` ≤ `maxLogBytes`; `truncated` is
   true on overflow; the digest covers the full stream
   even when ≪ 1% is retained.
3. **Process-tree timeout kill (POSIX)** (runner). The
   runner now spawns commands with `detached: true` on
   POSIX, and timeouts signal the whole process group via
   `process.kill(-pid, signal)`. Windows falls back to
   direct-child `child.kill()` — pinned by docs + a
   POSIX-only test that skips on Windows.
4. **`NODE_OPTIONS` removed from runner env allowlist**
   (runner). `VERIFICATION_RUN_ENV_ALLOWLIST` no longer
   contains `NODE_OPTIONS`; the env-scrub test confirms
   children never see it even when set in `process.env`.
   `NPM_CONFIG_USERCONFIG` remains allowed (npm semantics
   depend on it; documented in this packet).
5. **Bounded GitHub API error-body reads** (both
   publishers). New shared `readBoundedResponseBody` in
   `@rekon/capability-docs` streams the response body
   chunk-by-chunk with `response.body.getReader()`,
   aborts at 64 KiB, and cancels the reader so the
   connection releases promptly. Applies to
   `publishGitHubCheckRun` + `publishPrCommentRun`.
6. **PR head SHA safety on `pull_request` events**
   (readiness + CLI). New readiness issue code
   `missing-pr-head-sha`. `pull_request` /
   `pull_request_target` events require explicit
   `headShaOverride` (via `--head-sha` flag or
   `GITHUB_HEAD_SHA` env) — `GITHUB_SHA` on those events
   is the merge commit, not the PR head. `push` and
   `workflow_dispatch` continue using `GITHUB_SHA`.
   `pull_request_target` remains unconditionally denied.

## PUBLIC API CHANGES

- **`@rekon/capability-docs`:**
  - New (additive) readiness issue code
    `missing-pr-head-sha`.
  - `readResponseBodySafely` now uses the bounded
    streaming reader internally; same return shape.
  - No change to `publishGitHubCheckRun` /
    `publishPrCommentRun` signatures.
- **`@rekon/capability-verify`:**
  - `VERIFICATION_RUN_ENV_ALLOWLIST` no longer contains
    `NODE_OPTIONS` (subtractive — operators relying on
    `NODE_OPTIONS` passthrough must move their flags to
    the `argv` of their VerificationPlan commands).
  - No change to `executeVerificationRun` signature.
  - `VerificationRun` artifact shape unchanged. `originalBytes`
    now reflects the full stream (previously truncated to
    `storedBytes`).
- **CLI:**
  - New optional flag `--head-sha <sha>` on
    `publish github-check --send`.
  - New optional output field `proofChainWarnings` on
    `publish github-check` (dry-run + send).
- **No validator-profile changes.** No workflow-template
  changes. No new role / permission. No artifact-shape
  change.

## PURPOSE PRESERVATION CHECK

The hardening preserves every existing invariant:

- **Verification runner v1 purpose.** Unchanged. The
  runner still runs validated plan commands with
  `shell: false`, a scrubbed env, per-command + per-plan
  timeouts.
- **VerificationPlan / VerificationRun /
  VerificationResult shapes.** Unchanged — the runner
  emits the same `stdoutExcerpt` /
  `stderrExcerpt` / `stdoutDigest` / `stderrDigest` /
  `originalBytes` / `storedBytes` / `truncated` /
  `redacted` shape.
- **Proof-report / architecture-summary / agent-contract
  Publications.** Unchanged.
- **Read-only / opt-in workflow templates.** Unchanged.
  The validator profiles also unchanged.
- **Canonical-truth invariant.** Reinforced. The Check
  payload now refuses to silently combine unrelated
  result+run artifacts; the proof-chain warning surfaces
  the gap on dry-run and send.
- **Marker-not-proof invariant.** Unchanged (PR comment
  marker semantics untouched).
- **Fork-safety invariant.** Strengthened. The new
  `missing-pr-head-sha` readiness rule closes a path
  where `pull_request` events could attach Checks to a
  merge-commit SHA by accident.
- **No-auto-resolution invariant.** Unchanged.
- **No-token-leak invariant.** Reinforced. Bounded
  streaming error-body reads prevent a misbehaving
  upstream from echoing a huge body that could embed a
  token; the sentinel-token contract tests still pin
  no-token-leak end-to-end.

## CODEBASE-INTEL ALIGNMENT

- **Classic guarantee preserved:** reviewers see
  artifact-backed proof at the decision point. The
  proof-chain coherence fix structurally prevents a
  green / red GitHub Check from misrepresenting an
  incoherent Rekon artifact chain.
- **Classic anti-pattern avoided:** GitHub status
  remains downstream; the Check's authority is bounded
  by what the underlying VerificationResult →
  VerificationRun chain actually says.
- **Capability map:** unchanged.
- **Conformance:** unchanged.

## BUGS FIXED

| # | Bug | Surface | Fix |
| --- | --- | --- | --- |
| 1 | Unrelated newer VerificationRun could influence GitHub Check payload for an older VerificationResult | `publish github-check` CLI | Resolve cited run from `result.header.inputRefs`; throw a proof-chain warning when the cited run is missing rather than silently substituting |
| 2 | Large stdout/stderr buffered before truncation could exhaust memory | `executeVerificationRun` | Incremental sha256 + bounded excerpt buffer; full stream hashed without retention |
| 3 | Timeout killed direct child only on POSIX, leaving grandchildren orphaned | runner spawn | `detached: true` + `process.kill(-pid, signal)` on POSIX; documented direct-child fallback on Windows |
| 4 | `NODE_OPTIONS` forwarded by default could preload modules into runner children | env allowlist | Removed from `VERIFICATION_RUN_ENV_ALLOWLIST` |
| 5 | `response.text()` could load unbounded GitHub error bodies into memory | both publishers | New `readBoundedResponseBody` streams + aborts at 64 KiB |
| 6 | `pull_request` events silently used `GITHUB_SHA` (merge commit) as head SHA | readiness + CLI | New `missing-pr-head-sha` readiness rule; `--head-sha` flag + `GITHUB_HEAD_SHA` env on the CLI |

## PROOF CHAIN COHERENCE

`resolveCoherentVerificationRunForGitHubCheck` (new helper
in `packages/cli/src/index.ts`):

- **Result exists + cites a VerificationRun in
  inputRefs:** load that specific run; payload uses it.
- **Result exists + cites a VerificationRun that's not
  in the store:** return `entry: undefined` + a
  warning string; payload reports the gap; conclusion
  is never `success`.
- **Result exists but cites no VerificationRun in
  inputRefs:** return `entry: undefined` + a warning;
  do not silently substitute the latest run.
- **No result:** fall back to latest VerificationRun
  (unchanged behaviour for runs-without-results
  scenarios).

The warning is surfaced in `proofChainWarnings` on every
output type (dry-run, send-readiness-failed,
send-api-error, send-success).

## EXECUTION OUTPUT BOUNDS

New `createBoundedStreamSink(maxBytes)` returns:
- `onChunk(buffer)` — updates incremental hash + appends
  to excerpt buffer until cap is reached, then discards.
- `finalize()` → `{ excerpt, digest, originalBytes,
  truncated }`.

`executeVerificationRun` calls `spawnPlanCommand` with
the configured `maxLogBytes`; the per-stream sink retains
at most `excerptCap = max(maxLogBytes * 2, 4096)` UTF-8
bytes for boundary-aware redaction. The capture is then
passed to `finalizeBoundedStreamSummary`, which applies
the existing redaction patterns + the existing
`truncateToBytes` post-pass and emits the
`VerificationRunStreamExcerpt`. `originalBytes` reflects
the full stream byte count even when the retained
buffer is tiny; the digest is sha256 over every chunk.

**Tests pinning this:**
- 512 KiB stdout with `maxLogBytes=4096` →
  `truncated: true`, `storedBytes ≤ 4096`, digest
  matches independent hash of 512 KiB.
- 256 KiB stderr with `maxLogBytes=2048` → same shape
  for stderr.
- Redaction still fires on a `GITHUB_TOKEN=...` line
  through the bounded sink (excerpt has
  `[REDACTED]`, raw secret absent).

## TIMEOUT SEMANTICS

| Platform | Behaviour |
| --- | --- |
| POSIX (darwin, linux, etc.) | `spawn({ detached: true, ... })` puts the child in its own process group. On timeout: `process.kill(-pid, "SIGTERM")` → grace → `process.kill(-pid, "SIGKILL")`. Group signalling reaches every descendant. |
| Windows | `detached: false`; `child.kill()` only signals the direct child. Grandchildren can outlive the runner if the direct child spawned them with their own session. Documented in `docs/concepts/verification-runs.md`. |

The fallback path for both platforms is `child.kill()`
if the group-kill throws (e.g., the process is already
dead).

**Tests pinning this:**
- Timeout on `setInterval` keeps `timedOut`/`killed`
  honest.
- POSIX-only: a child that itself spawns a detached
  grandchild times out with `killed: true` (group-kill
  reaches both).

## ENVIRONMENT POLICY

`VERIFICATION_RUN_ENV_ALLOWLIST` (current, after fix):
```
PATH, HOME, USER, LOGNAME, SHELL, TMPDIR, TEMP, TMP,
NODE_ENV, NPM_CONFIG_USERCONFIG, CI, LANG, LC_ALL, LC_CTYPE,
SystemRoot, ComSpec, PATHEXT, windir, USERPROFILE, APPDATA,
LOCALAPPDATA
```

Removed: **`NODE_OPTIONS`**.

Rationale (pinned in the constant's JSDoc):

- `NODE_OPTIONS=--require /malicious-preload.js` would
  silently preload arbitrary modules into any
  Node-launched plan command. This weakens proof
  repeatability and creates an injection path that
  downstream Check / PR comment surfaces would
  inadvertently certify.
- Operators who need specific Node flags should set
  them inline on the command in their VerificationPlan
  (where the operator is responsible for them
  explicitly), not via inherited env.

Kept: `NPM_CONFIG_USERCONFIG`. Rationale: npm config
resolution depends on it (operators' `~/.npmrc`
locations). The forward is explicit; the secret-key
pattern still scrubs token-bearing values.

The secret-key scrub pattern is unchanged:
`(?:^|[_\-])(TOKEN|SECRET|PASSWORD|APIKEY|API_KEY|KEY|AUTH|CREDENTIAL|COOKIE|SESSION|BEARER|PAT)(?:$|[_\-])`.

**Tests pinning this:**
- Assertion that `VERIFICATION_RUN_ENV_ALLOWLIST` does
  not include `NODE_OPTIONS`.
- A child run with `NODE_OPTIONS` set in
  `process.env` confirms the child sees `NODE_OPTIONS`
  as unset.

## GITHUB ERROR BOUNDS

New shared helper in `@rekon/capability-docs`:

```ts
async function readBoundedResponseBody(response: Response): Promise<string>;
```

Behaviour:

1. If `response.body === null` (HEAD-style response):
   fall back to `response.text()` then post-truncate
   to 64 KiB.
2. Otherwise: stream via `response.body.getReader()`,
   decoding each chunk with a `TextDecoder` (streaming
   mode), retaining only up to 64 KiB, then cancelling
   the reader so the underlying connection releases.
3. Append `… [truncated]` when truncation occurred.

Both `publishGitHubCheckRun` and `publishPrCommentRun`
use this helper for their non-2xx error-body reads.
The 2xx-success path still uses `response.json()` (a
GitHub success body is small and structured).

**Tests pinning this:**
- 2 MiB fake GitHub Check API error body → CLI error
  output is bounded (< 200 KiB total), token sentinel
  never appears, process exits 1 without hanging.
- Same for the PR comment publisher.

## PR HEAD SHA POLICY

The readiness assessor now refuses `pull_request` and
`pull_request_target` events without an explicit head
SHA. Resolution order in the CLI:

1. `--head-sha <sha>` flag (preferred).
2. `GITHUB_HEAD_SHA` env (set by some workflow runners
   via `${{ github.event.pull_request.head.sha }}`).
3. Otherwise, on a `pull_request*` event, readiness
   fails with `missing-pr-head-sha`.

For `push` and `workflow_dispatch`, `GITHUB_SHA`
continues to be the head — those events already point
at the right commit.

`pull_request_target` remains **unconditionally denied**
regardless of how the head SHA is supplied
(`untrusted-event` issue code wins; the new
`missing-pr-head-sha` issue is additive). Forked PRs
remain denied by default via the existing
`untrusted-fork` classification.

**Tests pinning this:**
- `pull_request` without explicit head SHA → readiness
  fails with `missing-pr-head-sha`; no API call.
- `pull_request` with `--head-sha` → payload uses the
  explicit SHA; fake API receives it as `head_sha`.
- `push` → payload uses `GITHUB_SHA`.
- `workflow_dispatch` → payload uses `GITHUB_SHA`.
- `pull_request_target` with `--head-sha` → still
  denied with `untrusted-event`.

## TESTS / VERIFICATION

- **New contract suite:**
  `tests/contract/verification-github-trust-boundary-hardening.test.mjs`
  — 17 tests across 5 groups (proof-chain coherence /
  execution bounds / timeout / GitHub error bounds /
  PR head SHA). All passing.
- **Updated prior tests:**
  `tests/contract/github-check-publisher-skeleton.test.mjs`
  — two `pull_request` readiness tests updated to pass
  explicit `headShaOverride`; one new test added for
  the rejection-without-explicit-head-SHA case.
- **Existing suites still passing.** Full suite
  **1550 passed / 1 skipped** (+ 17 new, + 1 from the
  readiness rejection test, − 0 broken).
- **Audits / smokes:** package-exports, license,
  publish-dry-run, install-smoke, install-tarball-smoke
  — all pass unchanged.
- **CLI smokes:** `verify run --execute`,
  `verify result from-run`, `publish github-check
  --dry-run`, `publish pr-comment --dry-run`,
  `artifacts validate` — all expected to pass against
  the bundled fixture.

## INTENTIONALLY UNTOUCHED

- `@rekon/capability-intent` — unchanged.
- `@rekon/sdk` conformance — unchanged.
- `@rekon/runtime` artifact category map — unchanged.
- `@rekon/kernel-*` — unchanged.
- All four workflow templates — unchanged.
- All three validator profiles — unchanged.
- `rekon publish pr-comment` CLI (apart from inheriting
  the bounded body reader via the shared helper) —
  unchanged.
- VerificationPlan / VerificationResult /
  VerificationRun artifact schemas — unchanged.
- `.github/workflows/*.yml` in the Rekon repo —
  unchanged (still empty).

## RISKS / FOLLOW-UP

- **Risk: operators relying on `NODE_OPTIONS` env
  passthrough.** Mitigated by docs explaining the
  rationale + the inline-on-command alternative. The
  validator does not currently flag this; a future
  validator extension may surface `NODE_OPTIONS` use
  in `argv` if needed.
- **Risk: Windows direct-child-only timeout.**
  Documented honestly (test skips on Windows; docs
  call out the behaviour). Future hardening could
  use Job Objects on Windows; out of scope for v1.
- **Risk: PR head SHA error message confusion.**
  Mitigated by including a one-line explanation
  inside the readiness issue's `message` field
  pointing operators at `--head-sha`.
- **Risk: bounded body cap of 64 KiB drops useful
  GitHub error context.** Acceptable — sanitized
  errors keep `documentationUrl`; operators can
  inspect the workflow run if they need the raw
  body.
- **Follow-up — Verification / GitHub trust-boundary
  safety review (next slice).** Strategy review over
  the hardening results, deciding whether the
  trust boundary is beta-stable or needs another
  hardening pass before broader product polish.

## NEXT STEP

**Verification / GitHub trust-boundary safety review.**
Walk every fix above in isolation and decide whether
the combined trust boundary is beta-stable or whether
further hardening (Windows Job Objects, bounded retry,
validator extensions, NPM_CONFIG_USERCONFIG decision)
remains required before broader product work resumes.
