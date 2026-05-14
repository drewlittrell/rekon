# Refresh

`rekon refresh` is the one-command flow for producing a coherent
repo-intelligence state. It is the Rekon-native preservation of the
workflow guarantee that classic `FullScanHandler` provided: after one
command, the repository has a current-enough, validated set of typed
artifacts that downstream consumers can trust.

It is not a watcher, not a daemon, not a source rewriter, and not a
verification command runner. It runs the existing Rekon lifecycle in
the correct order and reports what happened.

For the full audit of why this command exists, see the **Full Scan /
Refresh Orchestration** entry in
[../strategy/classic-guarantees-audit.md](../strategy/classic-guarantees-audit.md)
and the **P0.1** guarantee in
[../strategy/classic-guarantee-regression-plan.md](../strategy/classic-guarantee-regression-plan.md).

## Why It Exists

The Rekon lifecycle has nine phases:

```
observe → project → snapshot → evaluate → findings lifecycle
        → coherency delta → publish architecture
        → artifacts validate → artifacts freshness
```

Each phase is its own CLI verb, so they compose well — but they also
compose silently wrong when a phase is skipped. An operator who
forgets `findings lifecycle` between `evaluate` and
`coherency delta`, or who never runs `publish architecture` after a
new evaluate, ends up with a partial state. `rekon artifacts
freshness` will eventually flag the mismatch, but the operator has
already published a stale view by then.

`rekon refresh` makes the full sequence one command. It:

- runs every phase in order;
- stops on the first failure rather than pretending the state is
  coherent;
- validates the artifact index at the end;
- judges freshness by the **latest major artifact of each type**,
  not by every historical artifact still in the store.

## CLI Surface

```sh
rekon refresh --root <repo> --json
rekon refresh --root <repo> --skip-publish --json
rekon refresh --root <repo> --skip-freshness --json
rekon refresh --root <repo> --changed-file <path> --changed-file <path> --json
```

Flags:

- `--skip-publish` — skip the `publish architecture` step. The
  Verification Status section of the architecture summary will not
  be refreshed this run. The latest-major freshness check excludes
  `Publication` artifacts to avoid flagging an intentionally
  unrefreshed publication as stale.
- `--skip-freshness` — skip the final `artifacts.freshness` step.
  The result still includes the `artifacts.validate` outcome.
- `--changed-file <path>` (repeatable) — passed through to `observe`
  as the `changedFiles` list. Useful for incremental updates.

## Output Shape

```json
{
  "root": "/abs/path/to/repo",
  "startedAt": "2026-05-14T18:30:00.000Z",
  "completedAt": "2026-05-14T18:30:01.420Z",
  "status": "passed",
  "steps": [
    { "id": "init", "status": "passed" },
    { "id": "config.validate", "status": "passed", "issues": [] },
    { "id": "observe", "status": "passed", "artifacts": [{ "type": "EvidenceGraph", "id": "..." }] },
    { "id": "project", "status": "passed", "artifacts": [...] },
    { "id": "snapshot", "status": "passed", "artifacts": [...] },
    { "id": "evaluate", "status": "passed", "artifacts": [...] },
    { "id": "findings.lifecycle", "status": "passed", "artifacts": [...], "summary": {...} },
    { "id": "issues.adjudicate", "status": "passed", "artifacts": [...], "summary": {...} },
    { "id": "coherency.delta", "status": "passed", "artifacts": [...], "summary": {...} },
    { "id": "publish.architecture", "status": "passed", "artifacts": [...] },
    { "id": "artifacts.validate", "status": "passed", "issues": [] },
    { "id": "artifacts.freshness", "status": "passed", "summary": { "status": "stale", "latestMajor": [...] } }
  ],
  "validation": { "valid": true, "issues": [] },
  "freshness": {
    "status": "stale",
    "issues": [],
    "latestMajor": [
      { "type": "EvidenceGraph", "id": "...", "status": "fresh" },
      { "type": "ObservedRepo", "id": "...", "status": "fresh" },
      ...
    ]
  },
  "artifacts": [...],
  "missing": []
}
```

Notes:

- The aggregate `freshness.status` may be `stale` even on a
  successful refresh, because the artifact store keeps historical
  artifacts that the validator flags as having `newer-input-exists`
  issues. The overall refresh status uses the **latest-major**
  interpretation: every newest artifact of each major type must
  resolve to `fresh` after filtering out `newer-input-exists`
  issues that point to historical inputs.
- `missing` lists required artifact types that the run did not
  produce (e.g. `Publication(architecture-summary)` when
  `publish architecture` failed).

## Lifecycle Steps

1. **init** — ensure `.rekon/` exists. If `.rekon/config.json` is
   missing, write the default config. **An existing malformed
   config is left alone** so that `config.validate` can report it
   in the next step.
2. **config.validate** — reuse `rekon config validate` logic. If
   invalid, the refresh stops here with `status: "failed"`.
3. **observe** — produces an `EvidenceGraph`. Optional
   `--changed-file` flags pass through.
4. **project** — produces `ObservedRepo`, `OwnershipMap`,
   `CapabilityMap`, and any registered graph slices.
5. **snapshot** — produces an `IntelligenceSnapshot` indexing
   everything above.
6. **evaluate** — runs every registered evaluator and writes
   `FindingReport` artifacts.
7. **findings.lifecycle** — builds the `FindingLifecycleReport`
   from the latest report and the latest status ledger.
8. **issues.adjudicate** — builds the `IssueAdjudicationReport`
   from the latest `FindingLifecycleReport` (or from the latest
   `FindingReport` plus status ledger when no lifecycle exists).
   Groups duplicate / overlapping findings deterministically; no
   findings are dropped. See
   [issue-adjudication.md](issue-adjudication.md).
9. **coherency.delta** — builds the `CoherencyDelta`. When an
   `IssueAdjudicationReport` exists, the delta consumes its
   groups directly (v2 adjudicated mode); each delta item carries
   `issueGroupId` / `memberFindingIds` / `groupingReasons`. When
   no adjudication report exists, the delta falls back to the
   legacy lifecycle path with no breaking change. See
   [coherency-delta.md](coherency-delta.md).
10. **publish.architecture** — invokes
    `@rekon/capability-docs.architecture-summary` to write the
    architecture summary publication. Skipped when
    `--skip-publish` is set.
11. **artifacts.validate** — runs the artifact-index integrity
    validator. Status: `passed` when `{ valid: true, issues: [] }`.
12. **artifacts.freshness** — runs the per-artifact freshness
    validator AND applies the latest-major interpretation (see
    below). Skipped when `--skip-freshness` is set.

## Latest-Major Freshness Interpretation

Rekon's artifact store keeps history. Every run of `evaluate`,
`findings lifecycle`, `coherency delta`, and so on adds a new
artifact rather than overwriting the previous one. The freshness
validator's `newer-input-exists` issue is *correct* for individual
artifacts in that history (an old `FindingLifecycleReport`
genuinely references a now-superseded `FindingReport`), but it is
not what we mean by "the repo's intelligence state is current."

`rekon refresh` treats freshness this way:

- Find the **latest artifact of each major type** in the store
  (`EvidenceGraph`, `ObservedRepo`, `OwnershipMap`, `CapabilityMap`,
  `IntelligenceSnapshot`, `FindingReport`,
  `FindingLifecycleReport`, `IssueAdjudicationReport`,
  `CoherencyDelta`, and `Publication`).
- For each of those latest artifacts, ignore `newer-input-exists`
  issues. (The artifact is by construction the newest of its type;
  those issues are about historical inputs the producer
  intentionally cited.)
- The refresh's `artifacts.freshness` step **passes** only when
  every latest major artifact's *non-historical* issues are empty.

This is intentional. `buildFindingLifecycleReport` cites every prior
`FindingReport` to compute resolved-finding state; that's a
deliberate input pattern. Aggregate freshness would flag those
references as `stale` and would never report `passed` after a second
refresh; latest-major freshness correctly says "the latest of every
type has all its current inputs."

## Failure Behavior

If any step fails (including the up-front config validation), the
refresh stops immediately and returns `status: "failed"`. Subsequent
steps are not recorded as `skipped` — they simply aren't run, so
they are absent from `steps`. The CLI exits with a non-zero code.

If a step is intentionally skipped via `--skip-publish` or
`--skip-freshness`, the step appears in `steps` with status
`"skipped"` and the reason in `message`. The refresh's overall
status can still be `passed`.

If a required artifact family is missing after a successful run
(e.g. an evaluator produced no `FindingReport`), the result's
`missing` array names the absent type and the overall status is
`"partial"`.

## What This Is Not

- Not a watcher. There is no daemon, no file-system event loop, no
  background loop. One invocation runs the lifecycle once.
- Not a source rewriter. The refresh writes only into `.rekon/`.
- Not a verification command runner. `rekon refresh` does not
  execute the commands listed in any `VerificationPlan`. To record
  proof, use `rekon verify record` separately.
- Not a remediation actuator. `rekon refresh` does not run `intent
  remediation`, `reconcile suggest`, or `publish proof`. Those are
  intentional proof-loop steps the operator chooses when ready.
- Not a way to skip lifecycle phases silently. Skipping is opt-in
  via explicit flags and always recorded in `steps`.
- Not the only way to invoke the lifecycle. Each phase remains
  available as its own CLI verb for incremental flows.

## When To Use It

- After cloning a repo, before consuming any architecture summary
  or resolver packet.
- Before handing the workspace to an agent that will read
  publications or call resolvers.
- After a significant batch of source changes, before any
  governance review.
- When you suspect the workspace has drifted (mixed-version
  artifacts) and you want a clean baseline.

## CLI Smoke

```sh
node packages/cli/dist/index.js refresh --root examples/simple-js-ts --json
```

After the run, the artifact store should contain at minimum:

- `EvidenceGraph`, `ObservedRepo`, `OwnershipMap`, `CapabilityMap`
- `IntelligenceSnapshot`
- `FindingReport`, `FindingLifecycleReport`, `CoherencyDelta`
- `Publication` with `kind === "architecture-summary"`

`rekon artifacts validate --json` should return
`{ valid: true, issues: [] }`. `rekon artifacts freshness --json`
may report aggregate `stale` due to historical artifacts; the
latest-major check inside `refresh` already filters those.

## Cross-References

- [classic-guarantees-audit.md](../strategy/classic-guarantees-audit.md) —
  full per-subsystem audit; "Full Scan / Refresh Orchestration"
  entry.
- [classic-guarantee-regression-plan.md](../strategy/classic-guarantee-regression-plan.md) —
  P0.1 guarantee.
- [classic-subsystem-purpose-map.md](../strategy/classic-subsystem-purpose-map.md) —
  quick-reference table.
- [architecture-summary-publication.md](architecture-summary-publication.md) —
  the publication `rekon refresh` writes at step 9.
- [coherency-delta.md](coherency-delta.md), [finding-lifecycle.md](finding-lifecycle.md) —
  the governance artifacts the refresh derives.
