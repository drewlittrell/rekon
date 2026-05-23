# Verification / GitHub Trust-Boundary Safety Review

## Decision Summary

**The verification / GitHub trust boundary is
beta-stable after the hardening batch.** All six
fixes from step 9 landed with contract-test
coverage; no remaining gap is severe enough to
block beta. **No additional GitHub review surfaces
should be added before beta.** Remaining work
should focus on operational polish and documented
platform caveats, not new GitHub APIs.

- The combined GitHub review surface
  ([GitHub Review Surfaces Parity Review](github-review-surfaces-parity-review.md))
  was declared **beta-complete as an opt-in
  surface** in step 8.
- The
  [Verification / GitHub Trust-Boundary Hardening](../../.rekon-dev/review-packets/verification-github-trust-boundary-hardening.md)
  batch (step 9) closed the six trust-boundary
  edge cases that step 8 paged for hardening:
  proof-chain coherence, bounded streaming
  capture, POSIX process-tree timeout kill,
  `NODE_OPTIONS` removal, bounded GitHub API
  error-body reads, and PR head SHA safety.
- The hardening was contract-tested with **17 new
  tests across 5 groups** plus 1 new readiness
  rejection test and 2 updated readiness tests.
  Full suite stands at **1550 passed / 1
  skipped**.

**Pinned reminders carried forward:**

- **GitHub status and comments are not canonical
  truth; Rekon artifacts remain canonical.** Every
  Check Run summary, every PR comment body, every
  job summary, and every operator-facing doc
  repeats this. The hardening did not change this
  invariant; it strengthened it by closing the
  proof-chain coherence gap.
- **A successful GitHub Check or PR comment
  publish does not imply findings are resolved or
  reconciliation has been applied.** The
  publishers remain downstream renderers of the
  canonical artifacts.
- **VerificationResult and VerificationRun must
  remain chain-coherent in every review surface.**
  The proof-chain coherence fix structurally
  enforces this for the GitHub Check publisher;
  the parallel guarantee for PR comments comes
  from the same `summarizeVerificationProofSurface`
  helper that both publishers cite.
- **Windows timeout behavior is direct-child-only
  unless a future platform-specific process-tree
  strategy is implemented.** The POSIX process-
  tree kill via group signalling is the v1
  guarantee; Windows operators who spawn
  long-running grandchildren from plan commands
  should kill them explicitly.
- **Forked PRs and `pull_request_target` remain
  blocked by default.** The hardening's PR head
  SHA rule layers on top of the existing
  three-layer fork denial (template trigger list,
  validator profile, runtime readiness).

## Why This Review Exists

Step 8 (the [GitHub Review Surfaces Parity
Review](github-review-surfaces-parity-review.md))
declared the combined review surface
**beta-complete as an opt-in surface** and paged
six trust-boundary edge cases for a focused
hardening pass. Step 9 (the
[Verification / GitHub Trust-Boundary Hardening](../../.rekon-dev/review-packets/verification-github-trust-boundary-hardening.md)
batch) shipped runtime fixes for each one.

This safety review answers the post-hardening
question: are those six fixes individually correct
and together enough to call the trust boundary
**beta-stable**? The framing matters because the
next slice depends on the answer:

- If beta-stable → step back from the GitHub
  adapter and assess the remaining classic-parity
  gap (verification runner, issue governance,
  filtering, memory, publications, source-write /
  reconciliation, watcher / path freshness).
- If not beta-stable → run another hardening
  pass before moving on.

Skipping this review would mean implicitly
treating "shipped + tested" as "stable." That's
fine for individual fixes; it's not fine for the
trust boundary as a system. This memo asks each
fix's stability explicitly + asks the system
question once.

The review is purely strategy: no runtime
behaviour changes; no API changes; no schema
changes.

## Hardening Reviewed

The six fixes from step 9, plus the affected
surfaces they touch. Each fix is reviewed in its
own section below; the surfaces are the
existing-surface review the safety memo confirms.

**Hardening fixes:**

1. **GitHub Check proof-chain coherence**
   (`packages/cli/src/index.ts` —
   `resolveCoherentVerificationRunForGitHubCheck`).
2. **Bounded stdout/stderr streaming capture**
   (`packages/capability-verify/src/index.ts` —
   `createBoundedStreamSink`,
   `finalizeBoundedStreamSummary`).
3. **POSIX process-tree timeout kill**
   (`packages/capability-verify/src/index.ts` —
   `spawnPlanCommand` with `detached: true` +
   group signalling via `process.kill(-pid, ...)`).
4. **`NODE_OPTIONS` removed from runner env
   allowlist**
   (`packages/capability-verify/src/index.ts` —
   `VERIFICATION_RUN_ENV_ALLOWLIST`).
5. **Bounded GitHub API error-body reads**
   (`packages/capability-docs/src/index.ts` —
   `readBoundedResponseBody`).
6. **PR head SHA safety**
   (`packages/capability-docs/src/index.ts` —
   `assessGitHubCheckPublisherReadiness` +
   `missing-pr-head-sha` issue code;
   `packages/cli/src/index.ts` — `--head-sha` /
   `GITHUB_HEAD_SHA` resolution).

**Affected surfaces:**

- `rekon verify run --execute` (runner).
- `rekon verify result from-run` (result
  derivation).
- `rekon publish github-check --dry-run` (Check
  payload preview + proof-chain warning surface).
- `rekon publish github-check --send` (Check API
  writer + PR head SHA gate).
- `rekon publish pr-comment --dry-run` (no
  hardening change; verified unchanged).
- `rekon publish pr-comment --send` (inherits
  bounded body reader; verified unchanged
  otherwise).
- `VerificationRun` artifact semantics (no schema
  change; `originalBytes` now reflects full
  stream).
- `VerificationResult` proof-summary semantics
  (no schema change; the coherence fix relies on
  `header.inputRefs` already cited by
  `deriveVerificationResultFromRun`).
- GitHub Check payloads (`proofChainWarnings` is
  the only new output field).
- PR comment body / update path (unchanged
  apart from inheriting the bounded body
  reader).
- Workflow templates and validator profiles
  (unchanged).

**Hardening diagnostic table:**

| Fix | Status | Evidence | Remaining Follow-Up |
| --- | --- | --- | --- |
| Proof-chain coherence | shipped | github-check uses VerificationResult -> cited VerificationRun | monitor missing-run warnings |
| Bounded output capture | shipped | incremental digest + bounded excerpts | consider streaming redaction overlap tests |
| Timeout semantics | shipped | POSIX process-group kill; Windows direct-child-only | Windows process-tree strategy |
| Environment policy | shipped | NODE_OPTIONS removed | review NPM_CONFIG_USERCONFIG |
| GitHub error bounds | shipped | 64 KiB bounded reads | keep fake-server regression tests |
| PR head SHA policy | shipped | pull_request requires explicit head SHA | event-payload extraction future |

## Proof-Chain Coherence Review

**Before the hardening:**
`rekon publish github-check` independently picked
the latest `VerificationResult`, the latest
`VerificationRun`, and the latest
`VerificationPlan`. A newer unrelated
`VerificationRun` could attach itself to an older
`VerificationResult` in the Check payload — a
green Check could silently describe a mixed
chain.

**After the hardening:**

- If a `VerificationResult` exists, the CLI reads
  `header.inputRefs` and resolves the **specific
  VerificationRun cited there**. The latest
  unrelated run is ignored.
- If the cited run is **missing** from the local
  store, the CLI emits a
  `proofChainWarnings` entry and refuses to
  substitute. The payload reports the gap
  honestly; the Check conclusion is never
  `success` in that state.
- If a `VerificationResult` cites **no
  VerificationRun** (manually recorded results),
  the CLI surfaces the same warning rather than
  silently using the latest run.
- If **no VerificationResult exists**, the CLI
  falls back to the latest VerificationRun — the
  existing behaviour for runs-without-results
  scenarios.

**Tests pinning this:**

- `tests/contract/verification-github-trust-boundary-hardening.test.mjs`:
  - "GitHub Check payload uses VerificationRun
    cited by VerificationResult, not unrelated
    newer run".
  - "missing cited run reports action_required +
    proof-chain warning".
  - "no VerificationResult — falls back to latest
    VerificationRun without proof-chain warning".

**Verdict: beta-stable.** The structural
guarantee (`header.inputRefs` always cites the
derived chain) is now enforced at the GitHub
Check publisher boundary. The PR comment
publisher already cites refs the same way; both
review surfaces are now chain-coherent by
construction.

## Execution Output Bounds Review

**Before the hardening:**
The runner read every `data` chunk into a growing
string (`stdout += chunk.toString("utf8")`),
then truncated after the command finished. A
large stdout/stderr (especially from a hanging
command that emits many MiB of debug output)
could exhaust process memory before the
post-execution truncation pass.

**After the hardening:**

- `createBoundedStreamSink(maxBytes)` returns
  `{ onChunk(buffer), finalize() }`. Each chunk
  is hashed incrementally with sha256; bytes are
  appended to the excerpt buffer only until the
  cap (`excerptCap = max(maxLogBytes * 2, 4096)`)
  is reached; everything beyond is hashed and
  discarded.
- `finalize()` returns
  `{ excerpt, digest, originalBytes, truncated }`.
  `originalBytes` reflects the **full** stream;
  the digest covers every byte.
- `finalizeBoundedStreamSummary` (in
  `executeVerificationRun`) applies the existing
  redaction patterns + the existing
  `truncateToBytes` post-pass to produce the
  `VerificationRunStreamExcerpt`.

**Tests pinning this:**

- 512 KiB stdout with `maxLogBytes=4096`:
  `truncated: true`, `storedBytes ≤ 4096`, full
  stream's sha256 is preserved in `stdoutDigest`.
- 256 KiB stderr with `maxLogBytes=2048`: same
  shape.
- Redaction still fires on a `GITHUB_TOKEN=...`
  line through the bounded sink (`[REDACTED]`
  present; raw secret absent).

**Verdict: beta-stable.** The memory ceiling is
now bounded by `excerptCap`, which is a few KiB
for any reasonable `maxLogBytes` setting. The
digest still attributes the full stream so
operators can compare excerpts against the same
hashed run when needed.

## Timeout Semantics Review

**Before the hardening:**
`spawnPlanCommand` called `child.kill(signal)` on
timeout, which signals only the direct child. A
plan command that spawns its own grandchild
processes could leave them orphaned after the
runner timed out.

**After the hardening (POSIX):**

- `spawn(..., { detached: true, ... })` puts the
  child in its own process group.
- On timeout: `process.kill(-pid, "SIGTERM")` →
  3 s grace → `process.kill(-pid, "SIGKILL")`.
  Negative pid signals the whole process group,
  so grandchildren receive the signal too.
- Fallback to `child.kill(signal)` if the group
  kill throws (e.g., the process is already
  dead).

**After the hardening (Windows):**

- `spawn(..., { detached: false, ... })` — the
  child is not in its own process group; the
  runner cannot signal grandchildren on Windows
  using portable Node APIs.
- The runner uses `child.kill(signal)` only.
  Long-running grandchildren spawned by plan
  commands on Windows can outlive the runner.
- **Documented explicitly** in
  `docs/concepts/verification-runs.md`,
  `docs/artifacts/verification-run.md`, and this
  safety review. A future hardening slice may
  use Job Objects on Windows.

**Tests pinning this:**

- "command timeout records timeout/killed and
  terminates the direct child" — runs on every
  platform; status is `killed` / `timeout`.
- "POSIX process-tree timeout reaches descendants
  (or test skips on Windows)" — POSIX-only test
  that asserts the runner times out a command
  whose direct child has spawned a detached
  grandchild.

**Verdict: beta-stable** with the platform caveat
documented honestly. The POSIX path is the v1
guarantee operators can rely on; the Windows
caveat is paged for follow-up but does not block
beta because the bundled GitHub Actions templates
run on Ubuntu (POSIX).

## Environment Policy Review

**Before the hardening:**
The runner allowlist included `NODE_OPTIONS`.
`NODE_OPTIONS=--require /malicious-preload.js`
would have silently preloaded arbitrary modules
into any Node-launched plan command, weakening
proof repeatability and creating an injection
path that downstream Check / PR comment surfaces
could inadvertently certify.

**After the hardening:**

- `NODE_OPTIONS` is removed from
  `VERIFICATION_RUN_ENV_ALLOWLIST`.
- The constant's JSDoc explains the rationale and
  points operators at the inline-on-command
  alternative (set the Node flag in the `argv` of
  the VerificationPlan command, where the
  operator is responsible for it explicitly).
- The secret-key scrub pattern is unchanged and
  still removes token-bearing values.

**Tests pinning this:**

- "NODE_OPTIONS is removed from the runner env
  allowlist" — direct assertion on the constant.
- "spawned child env does not include
  NODE_OPTIONS even when it's set in process.env"
  — a plan command echoes `process.env.NODE_OPTIONS`
  and the child sees it as unset.

**`NPM_CONFIG_USERCONFIG` decision.** The
hardening kept this in the allowlist (npm
resolves config from operators' `~/.npmrc`
locations; removing it would break expected npm
semantics for plan commands that invoke npm). The
secret-key scrub still applies to its value when
the key name matches the token pattern. This is
**acceptable for beta** but flagged in the
"Remaining Risks" table as a follow-up to
revisit if real-repo data shows operators
weaponising it.

**Verdict: beta-stable.** The default posture is
now safer; the kept allowlist entries are
documented + scrub-tested.

## GitHub API Error Bounds Review

**Before the hardening:**
Both `publishGitHubCheckRun` and
`publishPrCommentRun` called `response.text()`
then truncated to 64 KiB after the fact.
`response.text()` reads the entire body into a
string first; a misbehaving upstream or proxy
could feed a multi-MiB body before the
truncation pass clamped it.

**After the hardening:**

- New shared helper `readBoundedResponseBody`
  in `@rekon/capability-docs`.
- Streams via `response.body.getReader()`
  chunk-by-chunk; aborts at 64 KiB; cancels the
  reader so the underlying connection releases
  promptly.
- The 2xx-success path (`response.json()`)
  remains unchanged — a GitHub success body is
  small and structured.
- Both publishers use the shared helper.

**Tests pinning this:**

- "GitHub Check API error body is bounded
  (Check publisher)" — 2 MiB fake error body
  → CLI output bounded < 200 KiB total, token
  sentinel never appears, exit 1 without
  hanging.
- "PR comment API error body is bounded (PR
  comment publisher)" — same shape for the PR
  comment publisher.

**Verdict: beta-stable.** The bounded streaming
reader prevents the memory exhaustion path; the
sentinel-token contract test still pins
no-token-leak across the error path.

## Pull Request Head SHA Review

**Before the hardening:**
`assessGitHubCheckPublisherReadiness` accepted any
event with a non-empty `GITHUB_SHA`. On
`pull_request` events, `GITHUB_SHA` is the
**merge commit** SHA, not the PR head. A
`pull_request --send` mode would silently attach
the Check to the merge commit, rendering it
against the wrong commit in the GitHub UI.

**After the hardening:**

- New readiness issue code
  `missing-pr-head-sha`.
- `pull_request` / `pull_request_target` events
  require an explicit `headShaOverride`.
- CLI resolution order:
  1. `--head-sha <sha>` flag (preferred).
  2. `GITHUB_HEAD_SHA` env (set by some workflow
     runners via
     `${{ github.event.pull_request.head.sha }}`).
  3. Otherwise → readiness fails with
     `missing-pr-head-sha`.
- `push` and `workflow_dispatch` events continue
  using `GITHUB_SHA` (those events already point
  at the right commit).
- `pull_request_target` remains **unconditionally
  denied** regardless of how the head SHA is
  supplied (the `untrusted-event` issue still
  wins; the new `missing-pr-head-sha` issue is
  additive).

**Tests pinning this:**

- "pull_request --send without explicit head SHA
  fails readiness with missing-pr-head-sha".
- "pull_request --send with --head-sha uses the
  explicit SHA" — the fake API receives the
  explicit SHA in the request body.
- "push --send uses GITHUB_SHA".
- "workflow_dispatch --send uses GITHUB_SHA".
- "pull_request_target remains denied
  unconditionally regardless of head SHA".

**Verdict: beta-stable.** The default-deny rule
closes the unsafe-fallback path; the explicit
override is documented + tested. Future
follow-up: parse `GITHUB_EVENT_PATH` to extract
`pull_request.head.sha` automatically. Not a
blocker for beta because operators copying the
bundled workflow template are guided to the
explicit override.

## Canonical Artifact Boundary

The hardening preserved the canonical artifact
boundary end-to-end. The canonical artifacts
remain:

- `VerificationPlan`
- `VerificationRun`
- `VerificationResult`
- Proof-report / architecture-summary /
  agent-contract `Publication`s

Both GitHub write surfaces (Check Run and PR
comment) continue to:

- **Cite** refs by id in every payload / body.
- **Carry** the canonical-truth phrase verbatim.
- **Never** mutate any Rekon artifact (the
  artifact index is byte-identical before and
  after a `--send` run; pinned by contract tests
  on both surfaces).
- **Never** imply a finding has been auto-
  resolved or that reconciliation has been
  auto-applied.

The proof-chain coherence fix reinforces this by
making the GitHub Check payload's
`verificationRunRef` structurally tied to the
result's `inputRefs`. The bounded output capture
preserves digests so reviewers can still verify
that a Check's cited refs match the runs they
were derived from.

**GitHub status and comments are not canonical
truth; Rekon artifacts remain canonical.**

**A successful GitHub Check or PR comment
publish does not imply findings are resolved or
reconciliation has been applied.**

**VerificationResult and VerificationRun must
remain chain-coherent in every review surface.**

## Beta Stability Decision

**Beta decision table:**

| Criterion | Result |
| --- | --- |
| Coherent proof chain | pass |
| Bounded execution logs | pass |
| Token/log safety | pass |
| Timeout semantics documented | pass |
| PR SHA policy safe | pass |
| Canonical artifact boundary preserved | pass |
| No auto-resolution | pass |

Every criterion passes. The verification / GitHub
trust boundary is **beta-stable**. Adoption can
proceed without holding for additional hardening;
the bundled workflow templates remain the
recommended starting point.

**Operators adopting the bundled templates can
expect, after step 9:**

- A green Check / PR comment cites the actual
  cited VerificationRun, not an unrelated newer
  one.
- The runner cannot exhaust memory through
  unbounded stdout/stderr.
- POSIX runners terminate every descendant
  process on timeout; Windows runners terminate
  the direct child only (documented).
- `NODE_OPTIONS` cannot silently inject behaviour
  into plan-command children.
- GitHub API errors cannot leak unbounded
  response bodies; tokens never appear.
- `pull_request` Checks attach to the actual PR
  head SHA, not the merge commit.

## Remaining Risks

Paged but not blocking:

| Risk | Current Guardrail | Remaining Follow-Up |
| --- | --- | --- |
| mixed proof chain | result -> run lookup | missing-run warning review |
| memory exhaustion via output | bounded stream buffers | high-volume stress test |
| orphan child process | POSIX process-group kill | Windows tree kill |
| env-based Node injection | NODE_OPTIONS removed | env policy config future |
| huge GitHub error body | bounded stream read | GHES/proxy testing |
| wrong PR SHA | explicit head SHA required | event payload parsing |

None is severe enough to pause adoption. Each has
a current guardrail; the remaining follow-up is
operational + platform polish rather than a
trust-boundary gap.

**Specific items the safety review pages for
future hardening, in priority order:**

1. **Windows process-tree timeout.** Use Job
   Objects on Windows to terminate the entire
   process tree on timeout. Currently
   direct-child-only.
2. **`NPM_CONFIG_USERCONFIG` review.** Reconsider
   whether to drop or scope the npm-config
   forward. Acceptable for v1 but flagged.
3. **Event-payload parsing for PR head SHA.**
   Parse `GITHUB_EVENT_PATH` to extract
   `pull_request.head.sha` automatically so
   operators don't need `--head-sha`. Currently
   explicit override required.
4. **GHES / proxy stress testing.** The bounded
   reader is contract-tested against a local
   fake server; real-world GHES / corporate
   proxy testing is paged.
5. **High-volume stream stress test.** The
   bounded sink is contract-tested at 512 KiB.
   Multi-GB stress test would re-confirm the
   memory ceiling under sustained load.
6. **Missing-run warning analytics.** The
   `proofChainWarnings` surface is new; a
   future slice may aggregate warning counts
   so operators see when their proof chain
   drifts.

## Follow-Up Work

In order of expected priority (post-beta unless
flagged otherwise):

1. **Beta readiness / remaining classic-parity
   review (next slice).** Step back from
   GitHub-specific work and assess the
   remaining delta to beta: verification runner
   gaps, GitHub review surfaces (already
   beta-complete), issue governance, filtering /
   graph-aware filters, memory, publications,
   source-write / reconciliation gaps, watcher /
   path freshness gaps. Decide which gaps must
   close before beta and which are post-beta.
2. **Windows Job-Object timeout** (post-beta).
   See Remaining Risks.
3. **PR event-payload parsing** (post-beta).
   See Remaining Risks.
4. **GHES / proxy regression testing**
   (post-beta).
5. **Cross-CI documentation** (post-beta).
   Document the same workflow pattern for
   GitLab CI, Jenkins, CircleCI, etc. The CLI
   surface is identical; only the YAML envelope
   differs.

**The trust boundary is beta-stable. The next
slice is the beta readiness / remaining
classic-parity review.**

**Update — beta readiness review shipped.** The
[Beta Readiness / Remaining Classic-Parity Review](beta-readiness-classic-parity-review.md)
declared Rekon **beta-close but not beta-ready**.
Three policy blockers remain (source-write
reconciliation policy, watcher / path freshness
policy, release readiness checklist). The trust
boundary remains beta-stable; the next slice is the
**source-write reconciliation policy decision memo**.

**Update — all three beta blockers resolved.** The
[source-write reconciliation policy decision memo](source-write-reconciliation-policy-decision.md),
the
[watcher / path freshness policy decision memo](watcher-path-freshness-policy-decision.md),
and the
[Beta release readiness checklist memo](beta-release-readiness-checklist.md)
have all shipped. The verification / GitHub trust
boundary remains beta-stable; the next slice is the
beta release candidate execution plan — no trust-
boundary work; just executes the pinned checklist on
the release SHA.
