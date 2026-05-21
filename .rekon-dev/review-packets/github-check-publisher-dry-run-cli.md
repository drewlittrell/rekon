# Review Packet — GitHub Check Publisher Dry-Run CLI (P1.1 slice)

**Slice:** `github-check-publisher-dry-run-cli`
**Sequence position:** Step 6b of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md).
**Batch type:** CLI + tests + docs. No GitHub API calls. No
active workflow. No GitHub write permissions. No artifact-shape
change. No new capability package.

## CHANGES MADE

1. **New CLI command** in `packages/cli/src/index.ts`:
   `rekon publish github-check --dry-run [--root <path>]
   [--json]`. Registered alongside the existing
   `publish architecture` / `publish proof` /
   `publish agent-contract` dispatch blocks.

2. **CLI behaviour:**
   - Refuses to run without `--dry-run` (exit 1, error
     message points at the decision memo).
   - Reads the latest local `VerificationResult`,
     `VerificationRun`, and `VerificationPlan` from the
     artifact store.
   - Walks `Publication` entries newest-first and matches
     `body.kind` to find the latest `proof-report`,
     `architecture-summary`, and `agent-contract`
     publications.
   - Runs `validateArtifactIndex(store)` (read-only) so the
     payload reflects current local index state via
     `artifactsValid`.
   - Calls `buildGitHubCheckPayload(...)` (passes refs +
     loaded `VerificationResult` body + a synthetic
     `verificationRun` shape with the mapped run status).
   - Calls `assessGitHubCheckPublisherReadiness(...)` with
     an **explicitly empty env map** + a
     `workflow_dispatch` event + `writePermissionConfirmed:
     false`. The CLI **does not** read `process.env` for
     any GitHub credential.
   - Prints
     `{ kind: "rekon.github-check.dry-run", dryRun: true,
     payload, readiness, canonicalTruthReminder }` via
     the shared `writeOutput` helper.

3. **New helpers in the CLI** (file-local; not exported):
   - `pickLatestArtifactEntry(store, artifactType)` —
     sorts `store.list(artifactType)` by `writtenAt` desc
     and returns the head entry.
   - `pickLatestPublicationByKind(store, kind)` — walks
     publications newest-first, reads each body, returns the
     first whose `body.kind` matches.
   - `toArtifactRef(entry)` — converts an
     `ArtifactIndexEntry` into an `ArtifactRef`.
   - `mapVerificationRunStatusForGitHubCheck(run)` — maps
     the runner's `status` (or `summary.status`) string into
     the helper's
     `GitHubCheckPublisherRunStatus` enum.

4. **New local types** (file-local):
   - `GitHubCheckVerificationRunBodyLike` — the slim shape
     the CLI reads from `VerificationRun` body.
   - `VerificationResultBodyLike` — the slim shape the CLI
     reads from `VerificationResult` body (mirrors the
     `VerificationResultLike` shape that `capability-docs`
     accepts).
   - `GitHubCheckDryRunOutput` — return shape printed by the
     command.

5. **Usage line** added in the CLI's usage list:
   `"rekon publish github-check --dry-run [--root <path>] [--json]"`.

6. **Imports updated:** the CLI now pulls
   `buildGitHubCheckPayload`,
   `assessGitHubCheckPublisherReadiness`,
   `GITHUB_CHECK_PUBLISHER_CANONICAL_TRUTH_REMINDER`, and
   the type `GitHubCheckPublisherRunStatus` from
   `@rekon/capability-docs`. No other new imports.

7. **Contract tests** at
   `tests/contract/github-check-publisher-dry-run-cli.test.mjs`
   (9 tests).

8. **Documentation updates** to the decision memo, the
   CI / GitHub adapter memo, the operator guide, the
   roadmap, the classic-behavior roadmap, the issue-
   governance memo, the CHANGELOG, the README, and this
   review packet.

## PUBLIC API CHANGES

- **New CLI command:** `rekon publish github-check
  --dry-run [--root <path>] [--json]`.
- **No new package exports.** All helpers used by the CLI
  already existed in `@rekon/capability-docs` (shipped in
  step 6a).
- **No new artifact type.**
- **No new capability package.**
- **No new role / permission.**
- **No existing CLI command modified.**
- **No flag removed or renamed.**

## PURPOSE PRESERVATION CHECK

The slice is strictly **additive** + **local-only**. It
preserves every existing invariant:

- **Verification runner v1 purpose.** Unchanged. The CLI
  reads artifacts; it does not execute verification
  commands.
- **VerificationPlan / VerificationRun /
  VerificationResult.** Unchanged. The CLI cites refs only.
- **Proof-report / architecture-summary / agent-contract
  Publications.** Unchanged. The CLI cites refs only.
- **Workflow templates' safety contract.** Unchanged. Both
  bundled templates still declare `permissions: contents:
  read` and still pass `rekon verify github-workflow
  validate`.
- **Canonical-truth invariant.** Preserved and made
  explicit in the CLI's JSON output via
  `canonicalTruthReminder`.
- **Fork-safety invariant.** Unchanged. The readiness
  assessor refuses forked PRs by default; the CLI does
  not relax that.
- **No-auto-resolution invariant.** Unchanged.
- **Local-first runner posture.** Unchanged. The CLI is
  strictly local; it does not authenticate, network, or
  spawn subprocesses (other than `node` itself when called
  via `spawnSync` in tests).
- **No GitHub API writes invariant.** Reinforced. The CLI
  explicitly refuses the publish path without `--dry-run`,
  and contract tests fail the build if a network client
  ever lands in the CLI source.

## CODEBASE-INTEL ALIGNMENT

- **Classic guarantee preserved:** reviewers see proof and
  governance state at the decision point. The GitHub Check
  payload renders the same artifact-backed proof surface
  the architecture summary / agent contract already
  render — now in a CI-ready JSON shape.
- **Classic anti-pattern avoided:** the CLI does not treat
  GitHub status as canonical. Every payload still carries
  the canonical-truth reminder.
- **Capability map:** unchanged. The CLI calls existing
  helpers from `@rekon/capability-docs`; no new
  capability / role / permission added.
- **Conformance:** unchanged. No new artifact type, no
  new conformance rule.

## CLI SURFACE

```text
rekon publish github-check --dry-run [--root <path>] [--json]
```

- `--dry-run` (required): the only mode the CLI supports
  in this slice.
- `--root <path>` (optional): workspace root. Defaults to
  CWD via `resolveRoot`.
- `--json` (optional): print the dry-run output as JSON.

**Exit codes:**
- `0` — payload + readiness rendered. The readiness may be
  `ready: false`; that does **not** fail the CLI.
- `1` — missing or malformed local artifacts that prevent
  payload construction, or the command was invoked without
  `--dry-run`.

**JSON shape:**

```json
{
  "kind": "rekon.github-check.dry-run",
  "dryRun": true,
  "payload": {
    "name": "Rekon Verification",
    "status": "completed",
    "conclusion": "action_required" | "success" | "failure" | "neutral" | "timed_out" | "cancelled",
    "output": {
      "title": "...",
      "summary": "... (markdown, always contains the canonical-truth reminder)"
    },
    "externalId": "VerificationResult:<id>" | "VerificationRun:<id>" | undefined,
    "citedRefs": [/* ArtifactRef[] */]
  },
  "readiness": {
    "ready": false,
    "issues": [
      { "code": "not-enabled", "message": "..." },
      { "code": "missing-token", "message": "..." },
      { "code": "missing-repository", "message": "..." },
      { "code": "missing-sha", "message": "..." },
      { "code": "write-permission-not-confirmed", "message": "..." }
    ]
  },
  "canonicalTruthReminder": "GitHub status is not canonical truth; Rekon artifacts remain canonical."
}
```

## OPTIONS CONSIDERED

| Option | Verdict |
| --- | --- |
| A — Skip the dry-run slice; jump straight to the API write | Rejected. Would force a single big API-write review with payload shape + auth + retry + error handling all at once. |
| B — Dry-run CLI now, API write later (recommended in step 6a's decision memo) | **Adopted.** |
| C — Dry-run command in `@rekon/capability-docs` instead of `@rekon/cli` | Rejected. The CLI is the natural ingress for operator-facing dry-run commands; package surface should stay free of `process.argv` parsing. |

## RECOMMENDATION

The dry-run CLI lands in `@rekon/cli`, reuses the existing
helpers, and adds no new network dependency. The actual
GitHub API call is intentionally deferred to step 6c with
its own decision memo + review packet so the network-
dependent code can ship as a small, independently
reviewable slice.

## GITHUB CHECK PAYLOAD MODEL

Unchanged from step 6a. The CLI delegates entirely to
`buildGitHubCheckPayload`. A contract test scans the CLI
source for `pickConclusion` and counts the conclusion
string literals to confirm the precedence ladder lives
only in `@rekon/capability-docs`.

## SAFETY / PERMISSIONS

- **`--dry-run` required.** The CLI refuses to run without
  it (exit 1, error message points at the decision memo).
- **No GitHub API call.** Contract test scans the CLI
  source for `@octokit/*`, `@actions/github`, `octokit`,
  `node-fetch`, `axios`, `undici`, `got`, `fetch(`,
  `https.request`, `http.request`, and `new Request(`;
  fails the build if any are present.
- **No token reads.** Contract test scans the CLI source
  for `process.env.GITHUB_TOKEN`, `process.env.GH_TOKEN`,
  and bracket-form equivalents; fails the build if any are
  present.
- **Readiness false is exit 0.** The CLI's render path
  succeeding does not imply a publish-ready environment;
  the JSON output's `readiness.issues` array enumerates
  the gates that remain.
- **Read-only filesystem invariant.** A contract test
  checks `fs.readFile(.rekon/registry/artifacts.index.json)`
  before / after the CLI run and asserts equality. The CLI
  reads only — no writes, no `store.write`.
- **No spawn / exec.** The CLI's command body does not
  spawn or exec anything; it only calls async helpers on
  the in-process artifact store.
- **Conclusion mapping delegated.** Contract test fails if
  the CLI source either defines a `pickConclusion` helper
  or matches four or more GitHub Check conclusion string
  literals (which would imply a duplicate precedence
  ladder).

## TESTS / VERIFICATION

- **Contract suite:**
  `tests/contract/github-check-publisher-dry-run-cli.test.mjs` —
  9 tests, all passing:
  1. CLI refuses to run without `--dry-run` (exit 1).
  2. `--dry-run --json` prints the stable JSON shape.
  3. Readiness `ready: false` is exit 0, with the expected
     issue codes (`not-enabled`, `missing-token`,
     `missing-repository`, `missing-sha`,
     `write-permission-not-confirmed`).
  4. Payload summary cites publications produced by
     `refresh` + explicit `publish proof` + explicit
     `publish agent-contract`.
  5. CLI source does not duplicate conclusion mapping
     (no `pickConclusion` helper; fewer than four
     conclusion-literal occurrences).
  6. CLI source does not read `GITHUB_TOKEN` /
     `GH_TOKEN` from `process.env` (regex scan of code-
     only, comments / strings stripped).
  7. CLI source imports no network client (regex scan of
     import / require / call-site).
  8. CLI run does not mutate the artifact index
     (read-only invariant).
  9. The usage line is registered in the CLI help.

- **Full suite:** expected ≥ 1265 passed / 1 skipped
  (1256 prior + 9 new).

- **CLI smokes:**
  - `rekon publish github-check --root examples/simple-js-ts
    --json` → exit 1, "requires --dry-run" message.
  - `rekon publish github-check --dry-run --root
    examples/simple-js-ts --json` → exit 0, JSON
    `{ kind, dryRun: true, payload, readiness:
    {ready:false, issues:[5 codes]}, canonicalTruthReminder }`.

## INTENTIONALLY UNTOUCHED

- `packages/capability-docs/src/index.ts` — unchanged. The
  CLI consumes the existing exports; no new exports were
  added.
- `packages/capability-verify/` — unchanged.
- `@rekon/sdk` conformance — unchanged.
- `@rekon/runtime` artifact category map — unchanged.
- `@rekon/kernel-*` — unchanged.
- `rekon verify run` — unchanged.
- `rekon verify result from-run` — unchanged.
- `rekon artifacts latest` — unchanged.
- `rekon verify github-workflow validate` — unchanged.
- `.github/workflows/*.yml` in the Rekon repo — none
  added; none modified.
- All bundled workflow templates' `permissions: contents:
  read` posture — unchanged.

## RISKS / FOLLOW-UP

- **Risk: stale verification body deserialization.** The
  CLI casts the `VerificationResult` body via a slim
  `VerificationResultBodyLike` shape that mirrors the
  helper's `VerificationResultLike`. If the canonical
  `VerificationResult` type ever gains required fields
  the CLI doesn't know about, the cast is permissive
  enough to pass through. Mitigation: the helper-side
  contract tests in
  `github-check-publisher-skeleton.test.mjs` exercise
  the same shape, so a divergence would surface there
  first.
- **Risk: empty readiness env in production.** The CLI
  intentionally passes `{}` to
  `assessGitHubCheckPublisherReadiness`, which makes
  readiness always return `ready: false`. The future
  step-6c CLI will pass `process.env` explicitly (with
  the same `writePermissionConfirmed` flag the operator
  must set in their copy of the workflow).
- **Risk: payload growth.** Same risk noted in step 6a;
  unchanged by this slice.
- **Follow-up — step 6c:** the actual GitHub API call.
  First slice that will introduce a network-client
  dependency in Rekon (likely under a dedicated import
  path like `packages/capability-docs/src/github-check-client.ts`).
  Requires its own decision memo and review packet.

## NEXT STEP

Step 6c of the CI / GitHub adapter implementation
sequence: the actual GitHub Checks API call. Reads the
same artifacts the step-6b CLI reads, but actually POSTs
the Check Run via GitHub's API. Gated by
`assessGitHubCheckPublisherReadiness`. The dependency on
a network client (`octokit` or equivalent) is
explicit + dedicated to that slice; it will not leak
into other packages.
