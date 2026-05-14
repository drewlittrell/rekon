# FindingStatusLedger

## Purpose

`FindingStatusLedger` is an artifact that records operator/system
decisions about findings: `accepted`, `ignored`, or `resolved`. It is
the durable, append-style history Rekon uses to preserve finding
lifecycle state across runs.

Raw `FindingReport` artifacts are never mutated. Status decisions live
here.

## Produced By

- `@rekon/cli.findings` (via `rekon findings status set ...`)
- Future programmatic decisions from learner/actuator capabilities
  should write here through the runtime artifact store.

## Consumed By

- `@rekon/runtime` lifecycle helpers (`buildFindingLifecycleReport`).
- `@rekon/capability-resolver`'s `resolve.issue` to annotate matched
  findings.
- Any future capability that wants to know whether a finding is
  accepted, ignored, or explicitly resolved.

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`FindingStatusLedger`.

## Shape

```ts
type FindingStatusDecision = {
  id: string;
  findingId: string;
  status: "accepted" | "ignored" | "resolved";
  note: string;
  reason?: "accepted-risk" | "false-positive" | "fixed" | "not-actionable" | "other";
  updatedAt: string;
  updatedBy?: string;
  source: "operator" | "system";
  appliesTo?: {
    type?: string;
    ruleId?: string;
    files?: string[];
    subjects?: string[];
  };
  evidence?: ArtifactRef[];
};

type FindingStatusLedger = {
  header: ArtifactHeader;
  decisions: FindingStatusDecision[];
};
```

## Validation Rules

`assertFindingStatusLedger()` from `@rekon/kernel-findings` enforces:

- `decisions` is an array.
- Every decision has `id`, `findingId`, `note`, `updatedAt`.
- `status` is one of `accepted`, `ignored`, `resolved`.
- `source` is `operator` or `system`.
- `reason` (when present) is one of the documented set.
- `status: "ignored"` requires a non-empty `note`.

`createFindingStatusLedger()` sorts decisions by `findingId` then
`updatedAt` for deterministic output. `findLatestDecisionForFinding()`
exposes the latest decision for a given finding id.

## Append Discipline

The CLI's `rekon findings status set` writes a new ledger artifact each
time. Prior ledger entries are retained as separate artifacts in the
store. The runtime helper reads the latest ledger (by `writtenAt`) when
computing lifecycle status.

If two operators both set a status for the same finding id, the latest
decision wins. The ledger retains both decisions; the previous one is
visible under `rekon findings status list`.

## Freshness And Provenance

`FindingStatusLedger` is a canonical input artifact for freshness
purposes (alongside `EvidenceGraph`, `Rulebook`, and
`OperatorFeedbackEntry`). A ledger with no `inputRefs` does not raise
`lineage.unknown`.

## Cross-References

- [Finding lifecycle concept](../concepts/finding-lifecycle.md)
- [FindingReport](finding-report.md)
- [FindingLifecycleReport](finding-lifecycle-report.md)
- [ResolverPacket](resolver-packet.md)
