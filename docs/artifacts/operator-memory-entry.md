# OperatorFeedbackEntry

`OperatorFeedbackEntry` records a single piece of operator-supplied
guidance, scoped to the part of the repo it applies to and annotated
with quality signals the memory ranker uses.

This is the artifact-side counterpart of
[../concepts/memory.md](../concepts/memory.md).

## Produced By

- `@rekon/capability-memory` via `rekon memory add` or the
  `memory.learner` (mode `"add"`).

## Consumed By

- `@rekon/capability-memory` again, in `mode: "select"`, to produce a
  [`MemorySelection`](memory-selection.md).
- `@rekon/capability-resolver`'s `resolve.preflight` (indirectly,
  via the `MemorySelection` artifact).
- Future curation surfaces.

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`OperatorFeedbackEntry`.

## Shape

```ts
type OperatorMemoryPriority = "low" | "normal" | "high";
type OperatorMemoryStatus = "active" | "deprecated" | "superseded";
type OperatorMemoryVerificationStatus = "verified" | "unverified" | "disputed";

type OperatorMemoryScope = {
  paths: string[];
  goal?: string;
  systems?: string[];
  capabilities?: string[];
  layers?: string[];
  tags?: string[];
};

type OperatorMemoryVerification = {
  status?: OperatorMemoryVerificationStatus;
  verifiedAt?: string;
  verificationResultRef?: ArtifactRef;
};

type OperatorFeedbackEntry = {
  header: ArtifactHeader;
  instruction: string;
  scope: OperatorMemoryScope;
  confidence: number;
  rationale?: string;
  evidence?: ArtifactRef[];
  verification?: OperatorMemoryVerification;
  reliability?: number;     // 0..1
  priority?: OperatorMemoryPriority;
  createdAt?: string;
  updatedAt?: string;
  source?: "operator" | "system";
  status?: OperatorMemoryStatus;
};
```

## Field Notes

- `instruction` is the human-readable guidance. Keep it short and
  imperative.
- `scope.paths` is the minimum scope for ranking by path. Empty
  paths plus empty systems/capabilities/tags is the "no scope"
  state, which incurs the `broad-scope-penalty` reason and only
  receives a tiny base bonus during selection.
- `scope.systems` / `scope.capabilities` / `scope.layers` /
  `scope.tags` are optional additional scope dimensions. The ranker
  rewards each match (see the table in
  [../concepts/memory.md](../concepts/memory.md)).
- `confidence` is the legacy field, retained at default `1` for
  backwards compatibility. New ranking uses `reliability`.
- `reliability` is operator-supplied confidence in the entry's
  long-term accuracy. Default `0.5` when omitted.
- `priority` lets operators flag urgent guidance. `high` adds
  +0.1; `low` subtracts 0.05.
- `verification.status` records whether the entry has been
  independently corroborated. `verified` adds +0.2 to the score;
  `disputed` rejects the entry outright; `unverified` is neutral.
- `verification.verificationResultRef` links to a Rekon
  `VerificationResult` artifact when the corroboration came from a
  recorded verification run.
- `status` is the entry's lifecycle state. `deprecated` and
  `superseded` entries are rejected from selection but kept in the
  store for audit.
- `createdAt` / `updatedAt` drive the freshness scoring (fresh
  ≤30d: +0.1; fresh ≤180d: +0.05; stale >365d: −0.1).
- `source` distinguishes operator-supplied entries from future
  system-generated ones (e.g. memory promoted from
  `VerificationResult` evidence).

## Example

```json
{
  "header": {
    "artifactType": "OperatorFeedbackEntry",
    "artifactId": "feedback-1778787609410",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-14T19:00:09.410Z",
    "subject": { "repoId": "simple-js-ts", "paths": ["packages/runtime"] },
    "producer": { "id": "@rekon/capability-memory", "version": "0.1.0" },
    "inputRefs": [],
    "provenance": { "confidence": 1, "notes": ["Memory enriches resolver output; it does not rewrite architecture facts."] }
  },
  "instruction": "Provider retry behavior belongs in provider layer.",
  "scope": {
    "paths": ["packages/runtime"],
    "systems": ["runtime"],
    "capabilities": ["provider-boundary"],
    "tags": ["policy", "review"]
  },
  "confidence": 1,
  "rationale": "Repeated operator correction.",
  "reliability": 0.9,
  "priority": "high",
  "verification": {
    "status": "verified",
    "verifiedAt": "2026-05-14T19:00:09.410Z"
  },
  "createdAt": "2026-05-14T19:00:09.410Z",
  "updatedAt": "2026-05-14T19:00:09.410Z",
  "source": "operator",
  "status": "active"
}
```

## Freshness And Provenance

Memory entries are inputs to `MemorySelection`. When entries
change, `rekon artifacts freshness` marks older selections `stale`
via their `inputRefs`. The entry itself is fresh on creation; if
operators update it, they should also update `updatedAt`.

## What This Is Not

- Not a rule. `Finding`/`Rulebook` rules are evaluator-produced
  facts. Memory is operator-supplied guidance and never appears in a
  finding.
- Not an architecture fact. Memory cannot override `OwnershipMap`,
  `CapabilityMap`, `ObservedRepo`, or `EvidenceGraph`.
- Not a credential or secret. Do not store credentials in memory
  entries.

## Cross-References

- [Memory concept](../concepts/memory.md)
- [MemorySelection](memory-selection.md)
- [Memory usage ledger](memory-usage-ledger.md)
- [Memory curation report](memory-curation-report.md)
- [Memory curation concept](../concepts/memory-curation.md)
- [Memory artifacts overview](memory-artifacts.md)
- [Resolvers](../concepts/resolvers.md)
