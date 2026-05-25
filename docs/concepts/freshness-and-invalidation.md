# Freshness And Invalidation

Freshness is Rekon's current statement about whether an artifact can be
trusted relative to its declared inputs. Invalidation is the declared
reason an artifact should be regenerated.

This is one of the durable wins distilled from `codebase-intel-classic`:
generated context, derived intelligence, and publications go stale.
Rekon makes that fact explicit instead of silently lying.

See also:

- [classic-wins.md](../strategy/classic-wins.md) — "Freshness Must Be
  Explicit".
- [classic-behavior-distillation.md](../strategy/classic-behavior-distillation.md) —
  the Watcher And Freshness behavior card.
- [classic-behavior-roadmap.md](../strategy/classic-behavior-roadmap.md) —
  phasing for watcher / file-change engine.

## Statuses

Artifact freshness uses four statuses:

- `fresh` — the artifact is based on the latest known required inputs
  and no freshness warnings exist.
- `stale` — the artifact is valid JSON and passes integrity checks, but
  a newer relevant input exists or declared invalidation rules say it
  should be regenerated.
- `partial` — the artifact exists but some expected input is missing or
  incomplete.
- `unknown` — Rekon cannot prove freshness because inputs are missing,
  lineage is absent, or invalidation rules are not available.

The same vocabulary applies to single artifacts and to aggregate results.

## Integrity Versus Freshness

Integrity and freshness are independent:

- Integrity asks: is the artifact structurally valid? Do the index
  entries match the on-disk files? Are digests correct? Are paths inside
  the workspace?
- Freshness asks: is the artifact still relevant given what we know
  about its inputs?

An artifact can pass integrity (`rekon artifacts validate` returns
`valid: true`) and still be `stale`. A `stale` artifact is not broken;
it is out of date.

## Current Alpha Behavior

Rekon does not yet run a watcher or file-change freshness engine. The
alpha runtime computes freshness from artifact lineage:

- Every artifact's `header.inputRefs` is inspected.
- For each input ref, the runtime checks whether the artifact index has
  a newer artifact of the same type that the consumer did not reference.
- Missing inputs and missing lineage are surfaced explicitly.

This is enough to answer questions like "did this `FindingReport`
evaluate the latest `EvidenceGraph`?" without polling the filesystem.

## Freshness Checks

The runtime applies these checks to every indexed artifact, optionally
filtered by `--type` and `--id` from the CLI:

1. **Input ref existence.** Every entry in `header.inputRefs` should
   resolve to an indexed artifact. A missing input ref produces an
   `input.missing` warning and the artifact's status becomes `partial`.
2. **Newer input by type.** If an artifact references
   `EvidenceGraph:evidence-1` but the index has a newer
   `EvidenceGraph:evidence-2` written after the referenced one, the
   artifact is marked `stale` with a `newer-input-exists` warning. The
   same applies to every artifact type referenced through `inputRefs`
   (e.g., `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `GraphSlice`,
   `FindingReport`, `ResolverPacket`, `MemorySelection`,
   `IntelligenceSnapshot`).
3. **Unknown lineage.** An artifact with no `inputRefs` that is not a
   recognized canonical input (currently `EvidenceGraph`, `Rulebook`,
   `OperatorFeedbackEntry`) raises a `lineage.unknown` warning and
   becomes `unknown`.
4. **Unreadable artifact.** If the index points at an artifact that
   cannot be read or parsed, the entry is reported as `unknown` with an
   `artifact.unreadable` error.

The aggregate status is `unknown` if any artifact is `unknown`,
`partial` if any artifact is `partial`, `stale` if any artifact is
`stale`, otherwise `fresh`.

File-system mtimes and source-file change detection are **not** part of
the alpha. They belong to the future watcher / freshness engine described
in the classic-behavior roadmap.

## CLI Surface

Use `rekon artifacts freshness` to inspect freshness:

```sh
rekon artifacts freshness --root <repo> --json
rekon artifacts freshness --root <repo> --type FindingReport --json
rekon artifacts freshness --root <repo> --type ResolverPacket --id <artifact-id> --json
```

Output shape:

```json
{
  "status": "fresh",
  "checkedAt": "2026-05-13T20:00:00.000Z",
  "issues": [],
  "artifacts": [
    {
      "type": "FindingReport",
      "id": "finding-report-1",
      "status": "fresh",
      "issues": []
    }
  ]
}
```

When a newer input exists:

```json
{
  "status": "stale",
  "issues": [
    {
      "code": "newer-input-exists",
      "severity": "warning",
      "artifactType": "FindingReport",
      "artifactId": "finding-report-1",
      "inputType": "EvidenceGraph",
      "inputId": "evidence-122",
      "message": "FindingReport:finding-report-1 references EvidenceGraph:evidence-122, but newer EvidenceGraph:evidence-130 exists."
    }
  ]
}
```

`rekon artifacts validate` remains integrity-only; it answers a
different question and keeps a stable shape.

## Invalidation Rules In Manifests

Capabilities declare invalidation rules through `CapabilityManifest`'s
`invalidatedBy`. Each rule is:

```ts
type InvalidationRule = {
  id: string;
  description?: string;
  inputs?: string[];   // artifact types whose change invalidates this output
  paths?: string[];    // file globs whose change invalidates this output
  events?: string[];   // named events (reserved for future runtime support)
};
```

A built-in evaluator declares:

```ts
invalidatedBy: [
  {
    id: "evidence.changed",
    description: "Findings change when evidence changes.",
    inputs: ["EvidenceGraph"],
  },
];
```

A built-in evidence provider declares path-based invalidation:

```ts
invalidatedBy: [
  {
    id: "source.changed",
    description: "JS/TS evidence changes when source files change.",
    paths: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
  },
];
```

Today's freshness checks consume the `inputs` lineage path implicitly
via `header.inputRefs`. `paths` and `events` rules are public intent:
they describe what *should* trigger regeneration. A future watcher /
freshness engine will evaluate them.

Capability authors should declare conservative `invalidatedBy` rules so
the future engine has accurate information without retroactive edits.

## Snapshot Status

`IntelligenceSnapshot.status.freshness` is the existing per-snapshot
status field. The runtime sets it during `runSnapshot()`:

- `unknown` — no `EvidenceGraph` is indexed.
- `partial` — evidence exists, but artifact index validation reported
  warnings or expected projection families are incomplete.
- `fresh` — latest evidence is included and no warnings exist.
- `stale` — reserved for future invalidation work informed by
  `validateArtifactFreshness()`.

The snapshot's status answers a different question than
`validateArtifactFreshness()`. The snapshot status is computed at the
moment of writing the snapshot. The freshness validator answers the
question after the fact, against the full index.

## Surface-Level Freshness Guardrails

`rekon artifacts freshness` is the authoritative freshness oracle,
but agents and humans act on **rendered outputs**, not on the
freshness artifact. So the surfaces that consume adjudication +
coherency state also surface their own input-freshness warnings:

- **Architecture summary publication** renders an
  `## Input Freshness Warnings` section after Governed Issue
  Groups when the latest `IssueAdjudicationReport` is older than
  the latest `FindingLifecycleReport`, the latest `CoherencyDelta`
  is older than the latest `IssueAdjudicationReport`, the
  `CoherencyDelta` was built from raw lifecycle while
  adjudication now exists, or the chain is transitively stale.
  The section recommends `rekon refresh` (or a more specific
  command). When the chain is clean the section is omitted.
- **Agent operating contract publication** always renders a
  `### Governance Freshness` subsection under Active Governance
  State showing `Issue adjudication: fresh / stale / missing`
  and `Coherency delta: fresh / stale / missing`. When stale, a
  blockquote lists the underlying warnings and includes
  "Do not treat governed issue counts as current until
  `rekon refresh` (or `rekon issues adjudicate && rekon coherency
  delta`) has run."
- **resolve.issue (group mode)** emits an `issue.freshness`
  trace entry (`status: "warning"` when the cited
  `FindingLifecycleReport` is not the latest, `status: "used"`
  when fresh) and adds an "IssueAdjudicationReport may be stale;
  run `rekon issues adjudicate` or `rekon refresh` before
  relying on group counts." entry to `packet.warnings` when
  stale.

These guardrails are read-only. They **do not mutate** any
artifact, **do not auto-regenerate** missing or stale inputs,
and **do not block** the rendered output. They make staleness
visible where reviewers act so it cannot be silently consumed.

Detection rules:

- `IssueAdjudicationReport` is **stale** when its
  `header.inputRefs` cite a `FindingLifecycleReport` whose id is
  not the latest indexed lifecycle id, or when no lifecycle is
  cited but a lifecycle exists in the store.
- `CoherencyDelta` is **stale** when (a) it cites an
  `IssueAdjudicationReport` whose id is not the latest, (b) it
  was built from raw lifecycle (no `IssueAdjudicationReport` in
  its `inputRefs`, no `issueGroupId` on any item) and an
  `IssueAdjudicationReport` now exists, or (c) its cited
  adjudication is transitively stale.

No file-system watching, mtime invalidation, or daemon behavior
is introduced. The path to deeper trust infrastructure
(watchers, path/event invalidation) remains deferred to future
phases.

## Dogfood Regression

The optional dogfood regression is gated by `REKON_DOGFOOD_CLASSIC_ROOT`.
Without that environment variable, the test is skipped cleanly and CI
does not depend on a local checkout.

```sh
REKON_DOGFOOD_CLASSIC_ROOT=/path/to/codebase-intel npm run test
```

## Accepted Merge Roll-up Freshness

Accepted operator merge roll-ups are recorded on
`CoherencyDelta.items[].mergedIssueGroupIds /
mergeDecisionIds / mergeCandidateIds` and consumed by
architecture summary, agent contract, and
`resolve.issue`. Their freshness is checked by the
**issue merge decision freshness guardrails**: a
`CoherencyDelta` is considered **stale for
decision-making** when any of the following hold —

- The `CoherencyDelta` cites an older
  `IssueMergeDecisionLedger` than the latest available
  ledger (`merge-ledger-stale`).
- The `CoherencyDelta` contains
  `mergedIssueGroupIds` but cites no
  `IssueMergeDecisionLedger` in its
  `header.inputRefs` (`merge-ledger-missing`).
- The `CoherencyDelta` cites an older
  `IssueAdjudicationReport` than the latest
  (`adjudication-stale`).
- The cited `IssueAdjudicationReport` cites an older
  `FindingLifecycleReport` than the latest
  (`lifecycle-stale`).
- The latest `IssueMergeDecisionLedger`'s latest
  decision for any `mergeCandidateId` used by the
  roll-up has been superseded
  (`merge-decision-superseded`).

Warnings do **not** invalidate artifacts structurally.
They mark the consumed merge-roll-up context as stale
for decision-making. All warnings recommend
`rekon refresh`. See the
[issue merge decision freshness guardrails memo](../strategy/issue-merge-decision-freshness-guardrails.md).

## Cross-References

- [Artifact header](../artifacts/artifact-header.md)
- [Intelligence snapshot](../artifacts/intelligence-snapshot.md)
- [Capability manifest](../extensions/capability-manifest.md)
- [Capability model](../strategy/capability-model.md)
- [Classic wins](../strategy/classic-wins.md)
- [Classic behavior distillation](../strategy/classic-behavior-distillation.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
- [Issue merge decision freshness guardrails](../strategy/issue-merge-decision-freshness-guardrails.md)
- [Watcher / path freshness policy decision](../strategy/watcher-path-freshness-policy-decision.md) —
  pins the distinction between artifact lineage freshness
  (this doc) and working-tree freshness (future
  `PathFreshnessReport` slice); reserves the artifact
  name; no daemon in beta; mtimes advisory only.
- [Beta release readiness checklist](../strategy/beta-release-readiness-checklist.md) —
  the release-slice CLI smoke matrix includes
  `rekon artifacts validate` + `rekon artifacts
  freshness` to confirm both freshness oracles emit
  on fixture input.
- [Path freshness](path-freshness.md) +
  [PathFreshnessReport](../artifacts/path-freshness-report.md) —
  the complementary working-tree freshness surface.
  **Artifact lineage freshness is not working-tree
  freshness.** This document covers the artifact
  lineage half; `PathFreshnessReport` covers the
  source-state half. Both can be `fresh` while the
  other is `stale`; both signals matter. The
  full path-freshness track has been declared
  beta-private stable; see
  [Path Freshness Safety Review](../strategy/path-freshness-safety-review.md).
