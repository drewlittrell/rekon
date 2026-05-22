# Review Packet — PR Comment API Writer Go/No-Go Review (P1.1 slice)

**Slice:** `pr-comment-api-writer-go-no-go-review`
**Sequence position:** Step 7e of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md)
and the
[PR Comment Publisher API Decision Gate](../../docs/strategy/pr-comment-publisher-api-decision-gate.md).
**Batch type:** Strategy / docs / tests only. **No runtime
behaviour change.** No new package, no new CLI command, no
new helper, no workflow-template change, no validator profile
change, no GitHub API call, no token read.

## CHANGES MADE

1. **New strategy memo** at
   [`docs/strategy/pr-comment-api-writer-go-no-go-review.md`](../../docs/strategy/pr-comment-api-writer-go-no-go-review.md).
   Reviews the full pre-API PR comment publishing path
   (dry-run body helper, readiness helper, dry-run CLI,
   workflow template, validator profile, idempotency
   marker, permission model, endpoint model, fork / event
   safety, canonical-artifact boundary) and pins a go /
   no-go decision before step 7f (the actual API writer)
   lands. **Decision: Go — adopt Option B.** Proceed to
   `rekon publish pr-comment --send` using GitHub issue
   comments, update-in-place by
   `<!-- rekon:pr-comment:v1 -->`, gated by
   `REKON_PR_COMMENTS=1`,
   `REKON_PR_COMMENTS_WRITE_CONFIRMED=1`, trusted event
   context, and explicit write confirmation. Contains the
   13 required headings + the 3 diagnostic tables
   (component status table, permission table, risk table)
   pinned by the work order.
2. **New docs test** at
   `tests/docs/pr-comment-api-writer-go-no-go-review.test.mjs`
   pinning the 18 required assertions (memo existence,
   required headings, Option B / "Go" recommendation
   language, endpoint pinned to issue-comment endpoints,
   permission pinned to `pull-requests: write`, marker
   pinned to `<!-- rekon:pr-comment:v1 -->`, canonical-truth
   language, marker-not-proof language, forked-PR
   denied-by-default language, `pull_request_target`
   denied-unconditionally language, no `--send`
   implementation in this batch, no GitHub API call in
   this batch, references to the dry-run helper / CLI /
   workflow template / validator profile slices,
   CHANGELOG mention, review-packet PURPOSE PRESERVATION
   CHECK).
3. **Cross-doc updates:**
   - [`docs/strategy/pr-comment-publisher-api-decision-gate.md`](../../docs/strategy/pr-comment-publisher-api-decision-gate.md)
     links to the go/no-go review under "Status" and
     "Implementation Sequence".
   - [`docs/strategy/pr-comment-publisher-decision.md`](../../docs/strategy/pr-comment-publisher-decision.md)
     gains a "Go/no-go review" cross-reference.
   - [`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md)
     marks step 7e as ✅ Shipped and links to the new
     memo.
   - [`docs/examples/github-actions-verification-runner.md`](../../docs/examples/github-actions-verification-runner.md)
     links to the go/no-go review from the operator
     guide's "Optional: preview a PR comment workflow"
     block + the cross-references block.
   - The concept docs
     ([`verification-runs.md`](../../docs/concepts/verification-runs.md),
     [`verification-results.md`](../../docs/concepts/verification-results.md),
     [`proof-report-publication.md`](../../docs/concepts/proof-report-publication.md))
     and the artifact doc
     ([`proof-report-publication.md`](../../docs/artifacts/proof-report-publication.md))
     add the go/no-go review to their Cross-References
     lists.
   - [`docs/strategy/issue-governance-architecture-decision.md`](../../docs/strategy/issue-governance-architecture-decision.md)
     flips step 53 to ✅ Shipped (PR comment API writer
     go/no-go review).
   - [`docs/strategy/classic-behavior-roadmap.md`](../../docs/strategy/classic-behavior-roadmap.md)
     gains a "Shipped" entry for the go/no-go review +
     points to the PR comment API writer slice (7f) as
     the next slice.
   - [`docs/strategy/roadmap.md`](../../docs/strategy/roadmap.md)
     gains a new completed-slice entry.
4. **README + CHANGELOG entries.**

## PUBLIC API CHANGES

- **None.** This is a strategy / docs / tests batch.
- No new exports from `@rekon/capability-docs`,
  `@rekon/capability-verify`, `@rekon/sdk`,
  `@rekon/runtime`, or any other package.
- No new CLI command, no new CLI flag.
- No new validator profile, no new issue code.
- No new workflow template.
- No new artifact type.
- No new capability package.
- No new role / permission.

## PURPOSE PRESERVATION CHECK

The review is informational; it preserves every existing
invariant:

- **Verification runner v1 purpose.** Unchanged.
- **VerificationPlan / VerificationRun /
  VerificationResult.** Unchanged. The memo cites refs
  by id only; no artifact mutation, no schema change.
- **Proof-report / architecture-summary / agent-contract
  Publications.** Unchanged.
- **`rekon publish pr-comment --dry-run` helpers + CLI.**
  Unchanged. The memo reviews their behaviour without
  modifying them.
- **PR comment workflow template.** Unchanged. The memo
  reviews the shipped
  `docs/examples/workflows/rekon-pr-comment-send.yml`
  without touching it.
- **`github-pr-comment-send` validator profile.**
  Unchanged. The memo reviews the profile's permission
  / trigger / command rules without modifying them.
- **Existing read-only / `github-check-send` profiles.**
  Unchanged.
- **Existing GitHub Check publisher path (helpers, CLI,
  workflow templates).** Unchanged.
- **Canonical-truth invariant.** Reinforced. The memo
  repeats `GitHub comments are not canonical truth;
  Rekon artifacts remain canonical.` in the Decision
  Summary, the Recommendation, and the Canonical
  Artifact Boundary section.
- **Marker-not-proof invariant.** Reinforced. The memo
  repeats `The idempotency marker is not proof; it is
  only an update-in-place handle.` in the Decision
  Summary, the Idempotency And Noise Review, and the
  Canonical Artifact Boundary section.
- **Fork-safety invariant.** Reinforced via the
  three-layer table in the Fork And Event Safety
  Review. `Forked PRs remain denied by default.`
  `pull_request_target remains denied
  unconditionally.`
- **No-auto-resolution invariant.** Reinforced. The
  memo explicitly states the future writer will not
  imply any finding has been auto-resolved or
  reconciled.
- **No-token-leak invariant.** Reinforced via the
  Endpoint Model Review's sanitized-errors pin (the
  writer slice will follow the same
  `{ status, message, documentationUrl }` pattern as
  the GitHub Check publisher; sentinel-token contract
  test required).

## CODEBASE-INTEL ALIGNMENT

- **Classic guarantee preserved:** reviewers see
  artifact-backed proof at the decision point. The
  review pins the canonical-artifact boundary survives
  end-to-end through the future PR comment writer
  exactly as it survives through the shipped GitHub
  Check publisher.
- **Classic anti-pattern avoided:** the review pages
  forward `GitHub comments are not canonical truth;
  Rekon artifacts remain canonical.` through every
  operator-facing surface (PR comment body, job
  summary, operator guide, concept docs, artifact
  doc, decision memos, governance memo, roadmaps).
- **Capability map:** unchanged.
- **Conformance:** unchanged.

## COMPONENTS REVIEWED

1. `buildPrCommentBody(input)` (pure helper, no I/O;
   shipped 7b).
2. `assessPrCommentPublisherReadiness(input)` (pure
   helper, no I/O; shipped 7b).
3. `rekon publish pr-comment --dry-run` CLI mode
   (shipped 7b).
4. `docs/examples/workflows/rekon-pr-comment-send.yml`
   workflow template (shipped 7d).
5. `github-pr-comment-send` validator profile (shipped
   7d).
6. Idempotency marker `<!-- rekon:pr-comment:v1 -->`
   (pinned by 7a / 7b / 7d; reviewed here).
7. Permission model: `pull-requests: write` vs
   `issues: write` vs `checks: write`.
8. Endpoint model: GitHub issue-comment endpoints vs
   PR-review / PR-review-comment endpoints.
9. Fork / `pull_request` / `pull_request_target`
   behaviour at three layers (template, validator,
   runtime readiness).
10. Canonical-artifact boundary (citation in body +
    canonical-truth phrase + no Rekon-artifact mutation).
11. Test coverage to date (helper, dry-run CLI,
    validator, docs).
12. Implementation sequence for the writer slice (7f)
    + safety review slice (7g).

## PERMISSION / ENDPOINT REVIEW

**Permission pinned:** `pull-requests: write` (the
conventional choice; the bundled template already
declares it; the validator already permits it under
the `github-pr-comment-send` profile).

GitHub treats PR timeline comments as **issue
comments** under the hood. The selected REST endpoints
are:

- `GET  /repos/{owner}/{repo}/issues/{issue_number}/comments` (list)
- `POST /repos/{owner}/{repo}/issues/{issue_number}/comments` (create)
- `PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}` (update)

Each accepts **either** `Issues: write` **or**
`Pull requests: write`; the writer slice does not
need `issues: write`. The validator continues to
refuse every other write scope under the PR comment
profile, including `checks: write`, `contents: write`,
`id-token: write`, `actions: write`,
`deployments: write`, `statuses: write`, and
`packages: write`.

**The PR comment surface is broader than the GitHub
Check surface.** `checks: write` only permits Check
Run CRUD; `pull-requests: write` permits PR-
conversation mutation, label / milestone / requested-
reviewer changes, etc. The writer will use only the
comment endpoints; the gate's job is to keep that
scope from drifting in future slices.

**Rejected alternatives:**

- **PR review comments** (file/line-scoped) — wrong
  surface for a whole-PR summary; would force the
  writer to pick a file + line.
- **PR reviews** (state: approve / changes-requested /
  commented) — broader notification footprint than
  reviewers expect for an informational status update;
  would conflate Rekon's read-only status with a
  reviewer's actual approval state.
- **A separate spike batch** to pin pagination / retry
  / fake-API test structure — these are normal
  implementation choices for the writer slice's own
  review packet; an extra batch would duplicate that
  work.

## RECOMMENDATION

**Go — adopt Option B.** Proceed to
`rekon publish pr-comment --send` using GitHub issue
comments, update-in-place by
`<!-- rekon:pr-comment:v1 -->`, gated by
`REKON_PR_COMMENTS=1`,
`REKON_PR_COMMENTS_WRITE_CONFIRMED=1`, trusted event
context, and explicit write confirmation.

The endpoint + permission boundary are now pinned by
the shipped workflow / validator gate; the remaining
implementation choices (author filter for ownership,
pagination, retry policy, fake-API contract test
structure) are normal design questions to be answered
inside the writer slice's own review packet (step 7f),
not blockers that justify another spike batch.

The recommendation is supported by:

- Three-layer fork denial (workflow template,
  validator profile, runtime readiness assessor).
- Three-layer opt-in enforcement (workflow template
  env, validator-required env, runtime readiness
  assessor's `not-enabled` issue code).
- Update-in-place idempotency model (marker + author
  identity; PATCH on match, POST on miss, never
  delete reviewer-touched comments).
- Canonical-artifact boundary preserved structurally
  (the dry-run body cites refs; the writer will not
  mutate any artifact; the idempotency marker is an
  identity handle only, not proof).
- Permission boundary already pinned by the shipped
  validator profile (every other write scope refused).

The recommendation explicitly does **not** implement
the writer in this batch. The 7f slice (next) does
that.

## TESTS / VERIFICATION

- **New docs suite:**
  `tests/docs/pr-comment-api-writer-go-no-go-review.test.mjs`
  — 18 assertions, all passing.
- **Existing suites still passing:** the PR comment
  helper (capability-docs) suite, the PR comment
  dry-run CLI contract suite, the PR comment workflow
  validator profile suite, the PR comment publisher
  decision docs suite, the API decision gate docs
  suite, the workflow validator suite, plus every
  GitHub Check publisher suite.
- **Audits / smokes:** package-exports, license,
  publish-dry-run, install-smoke,
  install-tarball-smoke — all expected to pass
  unchanged.
- **No CLI smoke required.** Strategy-only batch.

## INTENTIONALLY UNTOUCHED

- `packages/capability-docs/src/index.ts` — unchanged
  (PR comment helpers + GitHub Check helpers remain as
  published).
- `packages/cli/src/index.ts` — unchanged.
- `packages/capability-verify/` — unchanged.
- `@rekon/sdk` conformance — unchanged.
- `@rekon/runtime` artifact category map — unchanged.
- `@rekon/kernel-*` — unchanged.
- `docs/examples/workflows/rekon-verification.yml` —
  unchanged.
- `docs/examples/workflows/rekon-verification-dry-run.yml`
  — unchanged.
- `docs/examples/workflows/rekon-verification-check-send.yml`
  — unchanged.
- `docs/examples/workflows/rekon-pr-comment-send.yml` —
  unchanged.
- The `read-only`, `github-check-send`, and
  `github-pr-comment-send` validator profiles —
  unchanged.
- All existing contract / docs tests — unchanged.
- `.github/workflows/*.yml` in the Rekon repo —
  unchanged (still empty).

## RISKS / FOLLOW-UP

- **Risk: review memo drifts from shipped runtime
  behaviour.** Mitigated by the docs test pinning the
  memo's language (recommendation, endpoint,
  permission, marker, canonical-truth, marker-not-
  proof, fork-default-deny, no `--send` in this
  batch).
- **Risk: writer slice (7f) re-litigates the gate.**
  Mitigated by the explicit "open implementation
  choices for the writer slice" list in the memo —
  pagination, retry, ownership filter, `--api-base-url`,
  sanitized errors are normal writer-slice questions
  and are flagged as such; the gate's job is to pin
  the boundary, not to design the writer.
- **Risk: same-repo PR support unaddressed.** The
  current three-layer defence refuses
  `pull_request` triggers entirely (any same-repo
  PR + any forked PR alike). A future slice may add
  a same-repo guard so reviewers see PR comments on
  safe PRs. Out of scope for the writer slice (7f);
  paged for follow-up after 7g.
- **Risk: rate-limit / network failure on `--send`.**
  Recommendation pins "no retry in v1; surface the
  rate-limit error cleanly". A bounded-retry slice
  may follow once the writer + safety review land.
- **Risk: `issues: write` permission ever required.**
  The validator's permission scan does not yet
  enumerate `issues`. The writer slice will use the
  issue-comment endpoint under `pull-requests: write`
  (sufficient per the GitHub REST docs); if a future
  endpoint required `issues: write`, the writer
  builder must stop and document the mismatch rather
  than silently switching scope.
- **Risk: operator deletes the Rekon-owned comment
  manually.** Acceptable. The next run will re-POST.
  The marker is the only identity contract.
- **Follow-up — PR comment API writer (step 7f).**
  Next slice. Build the writer per the recommendation
  above.
- **Follow-up — PR comment safety review (step 7g).**
  After 7f. Confirms beta readiness end-to-end,
  parallel to the GitHub Check publisher's safety
  review.

## NEXT STEP

**PR comment API writer (step 7f).** Ship:

- `publishPrCommentRun(input)` helper in
  `@rekon/capability-docs` (parallel to
  `publishGitHubCheckRun`).
- `rekon publish pr-comment --send` CLI mode (parallel
  to `publish github-check --send`).
- Workflow template update: add a `publish pr-comment
  --send` step to
  `docs/examples/workflows/rekon-pr-comment-send.yml`.
- Validator extension: either remove the
  `forbidden-publish-pr-comment-send` rule from the
  `github-pr-comment-send` profile OR add a separate
  `github-pr-comment-send-active` profile (7f review
  packet picks one).
- Contract tests at
  `tests/contract/pr-comment-send-cli.test.mjs` using
  a local `node:http` fake server + `--api-base-url`.
- Sentinel-token contract test pinning no-token-leak.
- Docs update (operator guide, strategy memos,
  CHANGELOG, README, review packet).

Then step 7g (safety review) walks the full PR
comment publishing path and confirms beta readiness
or surfaces remaining blockers, parallel to the
GitHub Check publisher's safety review.
