# Review Packet — Verification Runner Latest-Artifact CLI Helper

**Step 3** of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md).
Adds a **read-only** CLI helper for resolving
the latest artifact of a given type, and
updates the GitHub Actions workflow template
to use it instead of inline Node snippets.

## CHANGES MADE

**`@rekon/cli`
(`packages/cli/src/index.ts`):**

- New `command === "artifacts" && subcommand
  === "latest"` branch implementing
  `rekon artifacts latest --type
  <ArtifactType> [--kind <kind>] [--id-only]
  [--allow-missing] [--root <path>] [--json]`.
- Behaviour:
  - Reads the local artifact index via the
    existing `createLocalArtifactStore` /
    `store.list(type)` path.
  - Sorts by `writtenAt` desc via the
    existing `sortByWrittenAtDesc` helper.
  - `--kind <kind>` is valid only with
    `--type Publication`; walks entries
    newest-first and reads each
    Publication body until a match on
    `body.kind` is found. Unreadable
    entries are skipped (the artifact
    validation path handles those).
  - `--id-only` writes a typed
    `<type>:<id>` ref to stdout and
    returns (no JSON, no other output).
  - `--allow-missing` returns
    `artifact: null` with exit 0 instead
    of exit 1.
  - Default missing case: JSON payload
    with `artifact: null` and exit 1.
  - Refuses `--kind` on a non-Publication
    type with a clear error.
  - Read-only: never writes artifacts,
    refreshes, validates, publishes, or
    executes.
- Usage line added to the help output.

**GitHub Actions workflow template
(`docs/examples/workflows/rekon-verification.yml`):**

- Inline `node - <<'NODE'` snippet for
  resolving the latest `VerificationPlan`
  id replaced with
  `rekon artifacts latest --type
  VerificationPlan --id-only
  --allow-missing`.
- Inline `node - <<'NODE'` snippet for
  resolving the latest `VerificationRun`
  id (previously parsed `verify-run.json`)
  replaced with
  `rekon artifacts latest --type
  VerificationRun --id-only
  --allow-missing`.
- New step `Resolve latest proof-report
  Publication` uses
  `rekon artifacts latest --type
  Publication --kind proof-report --id-only
  --allow-missing` to cite the
  proof-report Publication in the job
  summary.
- Step output names normalised:
  `ref` (the full `<type>:<id>` ref) and
  `id` (the raw id, suitable for passing
  to commands that accept either form).
- Workflow contract unchanged:
  `permissions: contents: read`, no
  secrets, no `pull_request_target`, no
  GitHub API writes,
  `actions/upload-artifact` upload of
  `.rekon/artifacts/**` (excluding
  `*.log`) with `retention-days: 7`.

**Operator guide
(`docs/examples/github-actions-verification-runner.md`):**

- Section 7 (Customizing the
  VerificationPlan lookup) rewritten
  around the helper, explaining each
  flag (`--type`, `--kind`, `--id-only`,
  `--allow-missing`) and reiterating
  that the helper is read-only.

**Tests:**

- `tests/contract/artifacts-latest-cli.test.mjs`
  — 12 contract tests.
- `tests/docs/verification-runner-github-actions-template-latest-helper.test.mjs`
  — 9 docs-only assertions.

**Docs (11 updated + CHANGELOG + README +
review packet):**

- `docs/strategy/verification-runner-ci-github-decision.md`
  — step 3 flipped to ✅ Shipped with the
  recorded flag contract + GitHub-template
  update.
- `docs/concepts/verification-runs.md` —
  CI / GitHub Direction subsection now
  describes the helper.
- `docs/strategy/issue-governance-architecture-decision.md`
  — step 43 flipped to ✅ Shipped.
- `docs/strategy/classic-behavior-roadmap.md`
  — pointer flipped + new shipped entry.
- `docs/strategy/roadmap.md` — new
  completed-slice entry.
- `docs/examples/github-actions-verification-runner.md`
  — section 7 rewrite.
- `docs/examples/workflows/rekon-verification.yml`
  — inline snippets replaced.
- `README.md` — pointer block updated
  with a `rekon artifacts latest` example.
- `CHANGELOG.md` — new
  top-of-`0.1.0-alpha.1` entry.

## PUBLIC API CHANGES

**Additive only. No breaking changes.**

- `@rekon/cli`:
  - New subcommand `rekon artifacts
    latest`.

**No changes to:** any artifact shape,
runtime, SDK, or capability. No
`schemaVersion` bump. No version bump.

## PURPOSE PRESERVATION CHECK

1. **Read-only.** The helper reads the
   artifact index and (for Publication
   `--kind`) artifact bodies. It writes
   nothing. Contract test #9 asserts the
   artifact index is byte-identical
   before and after a sequence of helper
   calls.
2. **No execution change.** Existing
   `verify run --dry-run` /
   `verify run --execute` /
   `verify result from-run` paths are
   untouched. Contract test #10 confirms
   `artifacts validate` stays clean after
   helper calls.
3. **Index-canonical latest.** The helper
   uses the same `writtenAt` desc
   ordering the existing
   `resolveVerificationPlanEntry` helper
   uses. It does not guess from filename
   alone or invent a new ordering rule.
4. **Publication kind reads body.kind.**
   Contract test #7 generates two
   Publications (`proof-report` then
   `architecture-summary`) and confirms
   that `--kind proof-report` returns
   the older one because it reads
   `body.kind` rather than guessing from
   the id prefix.
5. **No GitHub API surface.** The
   workflow template still uses no API
   writes; the helper is purely a local
   CLI surface.
6. **No raw log leakage.** The helper
   does not surface stdout / stderr
   excerpts or any other artifact body
   content beyond what `artifacts show`
   already exposes. `--id-only` returns
   only the type + id.

## CODEBASE-INTEL ALIGNMENT

- The helper is a small additive CLI
  surface that **consolidates** the
  inline Node snippets the workflow
  template previously used. It does not
  add new artifact behaviour; it makes
  existing artifact lookup ergonomic
  and auditable.
- Operators reading the workflow can now
  trace every step back to a documented
  CLI command. No hand-rolled index
  parsing.
- The helper is **general-purpose** (any
  artifact type) rather than
  verification-specific, so future
  workflows (e.g., for architecture
  summary or agent contract surfaces)
  can reuse it.
- The fork-safety, permissions, and
  artifact-canonical-truth invariants
  from the CI / GitHub decision memo are
  preserved.

## LATEST LOOKUP MODEL

**Ordering rule:** entries are sorted by
`writtenAt` desc. This is the same
ordering the existing
`resolveVerificationPlanEntry` helper
uses in the CLI's `verify record` /
`verify run` paths. Documented in the
review packet so future contributors
don't reinvent it.

**Type filter:** uses
`store.list(artifactType)`, which already
filters at the index-read level. No
filename inspection.

**Kind filter (Publication-only):**

```text
for candidate in sorted entries (newest-first):
  body = await store.read(candidate)
  if body.kind === requested_kind:
    return candidate
  else:
    continue
```

Reading bodies is necessary because the
artifact index entry does **not** carry
the Publication's `kind` field. The
helper walks newest-first and stops at
the first match, so the cost is bounded
by the number of Publications between
the latest entry and the latest
matching-kind entry.

**`--kind` on non-Publication:** rejected
with a clear error. The flag is reserved
for Publication kind discrimination; if
a future artifact type carries a `kind`
field, the helper's restriction can be
loosened without changing the existing
semantics.

## GITHUB WORKFLOW UPDATE

The workflow now uses three helper
invocations instead of three inline Node
snippets:

```yaml
- name: Resolve latest VerificationPlan
  id: plan
  run: |
    ID="$(node packages/cli/dist/index.js artifacts latest \
      --root . --type VerificationPlan --id-only --allow-missing)"
    echo "ref=$ID" >> "$GITHUB_OUTPUT"
    echo "id=${ID#VerificationPlan:}" >> "$GITHUB_OUTPUT"

- name: Resolve latest VerificationRun
  id: run
  if: steps.plan.outputs.id != ''
  run: |
    ID="$(node packages/cli/dist/index.js artifacts latest \
      --root . --type VerificationRun --id-only --allow-missing)"
    echo "ref=$ID" >> "$GITHUB_OUTPUT"
    echo "id=${ID#VerificationRun:}" >> "$GITHUB_OUTPUT"

- name: Resolve latest proof-report Publication
  id: proof
  if: always()
  run: |
    ID="$(node packages/cli/dist/index.js artifacts latest \
      --root . --type Publication --kind proof-report \
      --id-only --allow-missing)"
    echo "ref=$ID" >> "$GITHUB_OUTPUT"
```

The `--allow-missing` flag lets the
workflow continue gracefully when no
artifact of the requested type exists
yet; subsequent steps gate themselves
with `if: steps.X.outputs.id != ''`.

Step outputs are named `ref` (the typed
`<type>:<id>`) and `id` (the raw id) so
the workflow can pass whichever form a
given command expects. Existing Rekon
CLI commands accept either form via the
`<id|type:id>` pattern.

## TESTS / VERIFICATION

**Contract tests
(`tests/contract/artifacts-latest-cli.test.mjs`,
12 total):**

1. Latest-by-type returns the entry
   ref.
2. Missing → null payload, exit 1.
3. `--allow-missing` → null payload,
   exit 0.
4. `--id-only` emits typed ref to
   stdout, no JSON.
5. `--type Publication --kind
   proof-report` returns the latest
   proof report.
6. `--kind` on a non-Publication type
   fails clearly.
7. Kind lookup reads `body.kind` (not
   id prefix); older `proof-report`
   wins over newer `architecture-summary`
   when `--kind proof-report` is set.
8. Older artifact of same type is
   ignored when a newer one exists.
9. Read-only invariant: artifact index
   is byte-identical before/after a
   sequence of helper calls (JSON,
   `--id-only`, missing-with-`--allow-missing`).
10. `artifacts validate` stays clean
    after helper calls.
11. Missing `--type` rejected with a
    clear error.
12. `--id-only` missing case: stderr
    message, empty stdout, exit 1.

**Docs tests
(`tests/docs/verification-runner-github-actions-template-latest-helper.test.mjs`,
9 total):**

1. Workflow uses `artifacts latest
   --type VerificationPlan`.
2. Workflow uses `artifacts latest
   --type VerificationRun`.
3. Workflow handles VerificationResult
   lookup correctly (via
   `verify result from-run`).
4. Workflow uses `artifacts latest
   --type Publication --kind
   proof-report`.
5. Workflow no longer contains inline
   `node - <<'NODE'` snippets.
6. Operator guide mentions `rekon
   artifacts latest`.
7. Operator guide says the helper is
   read-only.
8. CHANGELOG mentions the helper.
9. Review packet exists and contains
   `PURPOSE PRESERVATION CHECK`.

**Full suite results:** 1166 passed / 1
skipped / 0 failed (up from 1145/1/0).

**Build:** `tsc -b` composite build
clean.

**Audits / smokes:**

- `audit-package-exports`.
- `audit-license`.
- `publish-dry-run`.
- `install-smoke` /
  `install-tarball-smoke`.

**CLI smokes:**

- `rekon refresh` — unchanged.
- `rekon verify run --execute` —
  unchanged.
- `rekon verify result from-run` —
  unchanged.
- `rekon publish proof` /
  `architecture` / `agent-contract` —
  unchanged.
- `rekon artifacts validate` —
  unchanged + clean.
- `rekon artifacts latest --type
  VerificationPlan --json` (new) —
  returns the latest plan.
- `rekon artifacts latest --type
  VerificationPlan --id-only` (new) —
  returns `VerificationPlan:<id>`.
- `rekon artifacts latest --type
  Publication --kind proof-report
  --json` (new) — returns the latest
  proof-report Publication.

## INTENTIONALLY UNTOUCHED

- Every artifact shape and producer.
- Runtime, SDK, every other capability.
- `refresh` / `publish` / `resolve` /
  `intent` / `reconcile` / `verify` /
  `artifacts` (other subcommands) /
  `findings` / `issues` / `coherency`
  lifecycle steps.
- Permission policy.
- Snapshot freshness / staleness
  computation.
- Every existing capability manifest.
- Every existing publication.
- `.github/workflows/` (still no active
  workflow installed in this repo).
- The CI pipeline.

## RISKS / FOLLOW-UP

**Risks (low):**

- **Kind filter reads bodies.** For
  Publication `--kind` lookups the
  helper reads each candidate body
  until a match is found. On a repo
  with thousands of Publications and
  no matching kind, this could be
  slow. Mitigation: the helper walks
  newest-first, so common cases (a
  recent proof-report exists) are
  fast; cold caches stay bounded.
- **Step output trimming.** The
  workflow template uses
  `${ID#VerificationPlan:}` /
  `${ID#VerificationRun:}` to strip
  the typed prefix from `--id-only`
  output for commands that prefer raw
  ids. This is bash-specific
  parameter expansion. If operators
  switch to PowerShell runners, the
  template needs adaptation. Out of
  scope for this slice; documented as
  a future workflow-hardening item.
- **Index ordering assumption.** The
  helper relies on `writtenAt` desc
  matching the operator-visible
  "latest" semantics. If a future
  artifact migration shuffles
  `writtenAt`, results may surprise.
  No mitigation needed today;
  documented for future migration
  authors.

**Follow-up (next slice):**

- **Verification runner GitHub Actions
  workflow hardening v2** — optional
  dry-run workflow variant,
  troubleshooting section, and
  proof-summary job-summary improvements
  using the latest-artifact helper.
  Still no GitHub API writes.

## NEXT STEP

Recommended next slice: **verification
runner GitHub Actions workflow hardening
v2**. Step 4 of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md).

That slice may add:

- A second documented workflow YAML
  (`rekon-verification-dry-run.yml`)
  for trial usage that uses
  `--dry-run` instead of `--execute`.
- An expanded troubleshooting section
  in the operator guide.
- A `rekon publish job-summary`
  command (or `--summary-only` flag
  on `rekon publish proof`) for
  tighter `$GITHUB_STEP_SUMMARY`
  output.

Still no GitHub API writes. Still no
first-party Check / PR comment
publisher.
