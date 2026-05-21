# Review Packet — Verification Runner CI / GitHub Adapter Decision

**Step 8** of the runner v1 implementation
sequence pinned by
[`docs/strategy/verification-runner-v1-decision.md`](../../docs/strategy/verification-runner-v1-decision.md).
**Strategy-only batch.** No runtime change.
No code, no workflow files, no GitHub API
calls. The memo decides whether Rekon's
verification runner should remain
local-only for alpha or gain a GitHub
Actions / PR-check surface, and pins the
safety contract any future CI surface must
respect.

## CHANGES MADE

**New decision memo:**

- `docs/strategy/verification-runner-ci-github-decision.md`
  — the full memo (12 required sections:
  Decision Summary, Problem, Current Rekon
  Proof Loop, Options Considered,
  Recommendation, Alpha Workflow Shape,
  GitHub Permissions And Fork Safety,
  Artifact Upload And Retention, Job
  Summary Surface, What This Does Not Do,
  Implementation Sequence, Future GitHub
  Check Publisher).

**Supporting docs updated (9):**

- `docs/strategy/verification-runner-v1-decision.md`
  — step 8 flipped to ✅ Shipped
  (decision-memo-only; runtime work
  deferred to subsequent slices).
- `docs/concepts/verification-runs.md` —
  new "CI / GitHub Direction" subsection
  + cross-reference.
- `docs/concepts/verification-results.md`
  — cross-reference added.
- `docs/concepts/proof-report-publication.md`
  — cross-reference added.
- `docs/artifacts/proof-report-publication.md`
  — cross-reference added.
- `docs/strategy/issue-governance-architecture-decision.md`
  — step 41 flipped to shipped; step 42
  added for the workflow-template
  implementation slice; subsequent steps
  renumbered.
- `docs/strategy/classic-behavior-roadmap.md`
  — flipped "Recommended next slice"
  pointer and added comprehensive new
  shipped entry.
- `docs/strategy/roadmap.md` — new
  completed-slice entry.
- `README.md` — new comment block in the
  CLI examples section pointing at the
  decision memo.
- `CHANGELOG.md` — new
  top-of-`0.1.0-alpha.1` entry.

**Tests:**

- `tests/docs/verification-runner-ci-github-decision.test.mjs`
  — 16 docs-only assertions.

## PUBLIC API CHANGES

**None.** Strategy-only batch. No code,
no artifact-shape change, no new
capability, no new CLI command, no
`schemaVersion` bump, no version bump,
no npm publish.

## PURPOSE PRESERVATION CHECK

Rekon's purpose is **artifact-backed
codebase intelligence with a deliberately
narrow execution surface**. The memo
preserves every guarantee:

1. **Artifact-canonical proof.** GitHub
   status is **not** canonical truth.
   `VerificationRun`,
   `VerificationResult`, and
   `Publication` artifacts remain the
   canonical proof records. The memo
   states this explicitly as an anchor
   invariant.
2. **Local safety contract applies in
   CI.** The alpha workflow runs the
   same local CLI under the same
   `shell: false` / scrubbed env /
   timeout / redaction rules. CI does
   not gain looser execution semantics
   than local.
3. **No fork escalation.** The memo
   forbids `pull_request_target` in the
   alpha template, requires
   `permissions: contents: read`, and
   prohibits secrets in the default
   template. Forked PRs run with
   read-only contents and no upstream
   secret exposure.
4. **No raw log leakage.** The uploaded
   artifact excludes `.log` files
   explicitly. Rekon's existing
   redaction + truncation contract
   means even the included artifacts
   never carry raw stdout / stderr —
   only digests + bounded redacted
   excerpts.
5. **No auto-resolution / no
   auto-apply.** A green CI check or
   passing job badge never resolves
   findings; the publications already
   ban this and the CI surface inherits
   the prohibition.
6. **Failed / stale proof stays
   visible.** The job summary uses the
   existing proof-report publication
   markdown, which already calls out
   failed / partial / not-run / stale
   proof with explicit callouts and
   recommended commands.
7. **No GitHub API surface in alpha.**
   The first-party Check / PR publisher
   is deferred to beta because GitHub
   API integration is genuinely
   tricky for forked PRs and the
   memo refuses to ship that
   complexity without a dedicated
   design memo for it.

## CODEBASE-INTEL ALIGNMENT

- Mirrors classic codebase-intel
  workflow guarantees: planned work →
  execution → proof → review surface.
- The classic surface (GitHub /
  CI checks) is identified as a
  **review-time projection**, never the
  canonical proof record. Rekon's
  artifacts are the equivalent of the
  classic system's proof database.
- Failed / stale / partial proof
  visibility maps to the classic "make
  proof visible at the decision point"
  guarantee.

## OPTIONS CONSIDERED

**Option A — Local-only for alpha.**
Ship nothing CI-specific. Rejected:
weaker team workflow; reviewers can't
see proof; operators will build
inconsistent CI glue.

**Option B — GitHub Actions smoke
workflow only.** Documented workflow
template that runs the CLI end-to-end
and uploads `.rekon/artifacts`. No
GitHub API. Accepted as the alpha
implementation slice (step 2 below).

**Option C — First-party GitHub Check /
PR publisher.** Requires `checks: write`
/ `pull-requests: write`, GitHub API
client, retry logic, conclusion-state
mapping, forked-PR safety design,
stale-check handling. Rejected for
alpha; deferred to beta. The memo
documents the deferred design problems
so the alpha template doesn't paint
itself into a corner.

**Option D — Hybrid staged approach.**
Alpha = Option B; beta = Option C.
**Recommended.**

## RECOMMENDATION

**Adopt Option D.**

For alpha:

- Verification execution remains
  **local-first**.
- Rekon ships **one** documented GitHub
  Actions workflow template (next
  implementation slice).
- The template uses
  `permissions: contents: read`, no
  secrets, no `pull_request_target`,
  no `checks: write`, no
  `pull-requests: write`.
- Job summary uses
  `$GITHUB_STEP_SUMMARY` (no API
  required).
- Artifact upload covers
  `.rekon/artifacts` with `.log` files
  excluded and `retention-days: 7`.

The two anchor invariants the memo pins
explicitly:

- **GitHub status is not canonical
  truth.** Rekon artifacts remain
  canonical.
- **Forked PRs must not receive
  secret-bearing execution by default.**

## SAFETY / PERMISSIONS

| Concern | Alpha template behavior |
| --- | --- |
| Workflow permissions | `contents: read` only |
| `pull-requests: write` | Forbidden |
| `checks: write` | Forbidden |
| `contents: write` | Forbidden |
| `id-token` | Forbidden |
| Secrets in template | None declared |
| `pull_request_target` | Forbidden |
| GitHub API writes | None |
| Artifact upload path | `.rekon/artifacts` (no `.log`) |
| Artifact retention | 7 days default |
| Job summary | `$GITHUB_STEP_SUMMARY` (no API) |
| Forked PR execution | Read-only contents, no secrets |
| `continue-on-error` | Forbidden (failures must surface) |
| Setup actions requiring secrets | Forbidden in template |

## IMPLEMENTATION SEQUENCE

1. **(this slice, ✅)** Decision memo +
   supporting doc updates.
2. **GitHub Actions workflow template
   (alpha, docs-only).** Adds the
   copyable YAML under `examples/` or
   `docs/examples/` plus operator
   documentation. No GitHub API writes.
3. **CLI ergonomics for CI (optional).**
   Add
   `rekon artifacts latest --type <type>
   --json` for plan/run id lookup
   without `require()` scripting.
4. **Job-summary publisher (optional).**
   `--summary-only` flag on
   `rekon publish proof` or a dedicated
   `rekon publish job-summary` command.
5. **GitHub Check publisher (beta).**
   Requires `checks: write`,
   per-repo opt-in, separate fork-safety
   decision memo, conclusion-state
   mapping, idempotency, stale-check
   handling.
6. **PR comment publisher (beta+).**
   Requires `pull-requests: write`.
7. **Cross-CI documentation (beta+).**
   GitLab CI / Jenkins / CircleCI /
   etc.

## TESTS / VERIFICATION

**New docs test
(`tests/docs/verification-runner-ci-github-decision.test.mjs`,
16 assertions):**

1. Decision doc exists.
2. Doc contains all required headings.
3. Doc recommends Option D.
4. Doc says local-first runner.
5. Doc says GitHub Actions workflow
   template for alpha.
6. Doc says GitHub Check / PR
   publisher deferred (to beta).
7. Doc says GitHub status is not
   canonical truth.
8. Doc says Rekon artifacts remain
   canonical.
9. Doc says forked PRs must not
   receive secret-bearing execution by
   default.
10. Doc includes
    `permissions: contents: read`.
11. Doc mentions uploaded
    `.rekon/artifacts`.
12. Doc says raw command logs should
    not be uploaded.
13. Doc mentions job summary.
14. Doc lists implementation sequence.
15. CHANGELOG mentions the decision.
16. Review packet exists and contains
    `PURPOSE PRESERVATION CHECK`.

**Full suite results:** 1122 passed / 1
skipped / 0 failed (up from 1106/1/0).

**Build:** `tsc -b` composite build
clean (no code change in this batch).

**Audits / smokes:**

- `audit-package-exports`.
- `audit-license`.
- `publish-dry-run`.
- `install-smoke` /
  `install-tarball-smoke`.

No CLI smoke required for a docs-only
decision batch.

## INTENTIONALLY UNTOUCHED

- Every artifact shape and producer.
- Runtime, SDK, every capability.
- All existing CLI commands.
- `refresh` / `publish` / `resolve` /
  `intent` / `reconcile` / `verify` /
  `artifacts` lifecycle steps.
- `FindingStatusLedger`,
  `FindingLifecycleReport`,
  `CoherencyDelta`,
  `ReconciliationPlan`.
- The CI pipeline (no
  `.github/workflows/` change in this
  batch — the workflow-template slice
  lands separately as a docs-only
  example).
- No new dependency on `@actions/*`,
  `@octokit/*`, or any GitHub-specific
  library.

## RISKS / FOLLOW-UP

**Risks (low to medium):**

- **Operators may copy the template
  before the workflow-template slice
  ships.** The memo describes the YAML
  in detail; sophisticated operators
  may transcribe it. This is fine —
  the description is correct — but the
  next slice should ship the file so
  there's a canonical source.
- **Forked-PR execution remains a
  trust boundary.** The alpha template
  is safe by construction (no
  `pull_request_target`; no secrets).
  Operators who add secrets or switch
  to `pull_request_target` accept the
  risk. The memo states this
  explicitly so the contract is
  visible.
- **Job summary size limits.** GitHub
  Actions caps `$GITHUB_STEP_SUMMARY`
  at ~1 MB. The proof report is small
  (typically < 50 KB) so this is not a
  current concern, but a future
  capability that emits very large
  reports may need to truncate.
- **Plan/run id lookup ergonomics.**
  The current template uses an inline
  `node -e` to read the artifact
  index. A small CLI helper would
  improve readability. Documented as
  follow-up step 3.

**Follow-up (next slice):**

- **Verification runner GitHub Actions
  workflow template (alpha,
  docs-only).** Adds the copyable
  workflow YAML + operator
  documentation. No GitHub API
  writes; no new capability or CLI
  command. The memo's "Alpha Workflow
  Shape" section is the spec.

## NEXT STEP

Recommended next slice:
**verification runner GitHub Actions
workflow template** (alpha
implementation, docs-only). Step 2 of
the implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md).

That slice adds:

- A copyable workflow YAML at
  `examples/github-actions/rekon-verify.yml`
  (or `docs/examples/`) implementing
  the memo's "Alpha Workflow Shape"
  exactly.
- Operator documentation explaining
  the permission contract, fork
  safety, artifact upload retention,
  and job-summary surface.
- Optional minor doc updates pointing
  contributors at the template.
- Tests that pin the workflow YAML's
  permissions, trigger set, and
  artifact path (so future PRs cannot
  silently widen the permission
  surface).

Still no GitHub API writes. Still no
new capability or CLI command. Still
no `pull_request_target`. Auto-
resolution / auto-apply remain out of
scope forever.
