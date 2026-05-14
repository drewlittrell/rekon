# MemorySelection

`MemorySelection` is the artifact produced when an operator (or the
resolver) asks "what memory applies here?" It captures the query,
the ranked selected entries with reasons, and the rejected entries
with rejection reasons.

This is the artifact-side counterpart of the v1 ranking work
described in [../concepts/memory.md](../concepts/memory.md).

## Produced By

- `@rekon/capability-memory` via `rekon memory select` or the
  `memory.learner` (mode `"select"`).
- `@rekon/capability-resolver`'s `resolve.preflight` indirectly
  writes a fresh `MemorySelection` before reading it.

## Consumed By

- `@rekon/capability-resolver`'s `resolve.preflight` (reads the
  legacy `selections[*]` array to populate `applicableMemory`).
- Future agent-operating-contract publishers and dashboards.

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`MemorySelection`. `inputRefs` cites every
[`OperatorFeedbackEntry`](operator-memory-entry.md) artifact
considered, so freshness marks older selections `stale` when
entries change.

## Shape

```ts
type MemorySelectionItem = {
  // Legacy fields (kept so older consumers / resolvers continue to
  // work).
  instruction: string;
  scope?: Record<string, unknown>;
  confidence: number;
  reason: string;

  // New v1 fields.
  id?: string;
  score?: number;
  reasons?: string[];
  match?: {
    paths?: string[];
    systems?: string[];
    capabilities?: string[];
    tags?: string[];
  };
  priority?: "low" | "normal" | "high";
  verification?: "verified" | "unverified" | "disputed";
};

type MemorySelectionRejection = {
  id: string;
  reasons: string[];
};

type MemorySelectionQuery = {
  path?: string;
  paths?: string[];
  goal?: string;
  system?: string;
  capability?: string;
  tags?: string[];
};

type MemorySelection = {
  header: ArtifactHeader;
  // Legacy fields preserved.
  path: string;
  goal: string;
  selections: MemorySelectionItem[];
  // New v1 fields.
  query: MemorySelectionQuery;
  selected: MemorySelectionItem[];
  rejected: MemorySelectionRejection[];
};
```

`selections` and `selected` always carry the same array. The legacy
`selections` field is preserved so existing consumers (notably
`resolve.preflight`'s memory reader) keep working without changes.

## Ranking Reasons

Each `MemorySelectionItem.reasons` is an ordered list of
human-readable tokens explaining the score. See the full ranking
table in [../concepts/memory.md](../concepts/memory.md). Examples:

- `path-exact-match: src/index.ts`
- `path-prefix-match: src`
- `system-match: runtime`
- `capability-match: provider-boundary`
- `tag-match: policy`
- `verified`
- `high-priority`
- `low-priority`
- `fresh-within-30-days`
- `fresh-within-180-days`
- `stale-over-365-days`
- `reliability-0.90` (when ≥0.75)
- `low-reliability-0.20` (when ≤0.25)
- `scoped-specific`
- `broad-scope-penalty`
- `no-scope-fallback`

Rejection reasons (in `selection.rejected[*].reasons`):

- `deprecated-rejected`
- `superseded-rejected`
- `disputed-rejected`
- `scope-mismatch`

## Example

```json
{
  "header": {
    "artifactType": "MemorySelection",
    "artifactId": "memory-selection-1778787700123",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-14T19:01:40.123Z",
    "subject": { "repoId": "simple-js-ts", "paths": ["src/index.ts"] },
    "producer": { "id": "@rekon/capability-memory", "version": "0.1.0" },
    "inputRefs": [
      { "type": "OperatorFeedbackEntry", "id": "feedback-...", "schemaVersion": "0.1.0" }
    ],
    "provenance": { "confidence": 1 }
  },
  "path": "src/index.ts",
  "goal": "modify bootstrap",
  "query": {
    "path": "src/index.ts",
    "paths": ["src/index.ts"],
    "goal": "modify bootstrap",
    "system": "src"
  },
  "selections": [
    {
      "instruction": "Preserve bootstrap behavior.",
      "scope": { "paths": ["src"], "systems": ["src"] },
      "confidence": 0.91,
      "reason": "scope prefix match",
      "id": "feedback-1778787609340",
      "score": 0.91,
      "reasons": [
        "path-prefix-match: src",
        "system-match: src",
        "verified",
        "high-priority",
        "reliability-0.90",
        "fresh-within-30-days",
        "scoped-specific"
      ],
      "match": { "paths": ["src"], "systems": ["src"] },
      "priority": "high",
      "verification": "verified"
    }
  ],
  "selected": [ "... same array as selections ..." ],
  "rejected": [
    { "id": "feedback-1778787608111", "reasons": ["deprecated-rejected"] }
  ]
}
```

## Freshness And Provenance

`MemorySelection.header.inputRefs` cites every
`OperatorFeedbackEntry` considered. `rekon artifacts freshness`
marks an older selection `stale` when any of the cited entries has
a newer indexed sibling, or when a new entry is added.

The selection is a snapshot of the ranker's verdict; it does not
update automatically.

## What This Is Not

- Not a rule. Selection items never appear in `Finding` or
  `Rulebook` artifacts.
- Not authoritative. Resolvers may include selected memory as
  guidance; the resolver packet's `ownerSystems`, `risk`,
  `findings`, `status`, and `nextRequiredResolver` are derived from
  `OwnershipMap` / `FindingReport` / risk rules, never from memory.
- Not a usage log. Future `MemoryUsageEvent` artifacts could record
  whether memory was actually used; this is deferred.

## Cross-References

- [Memory concept](../concepts/memory.md)
- [OperatorFeedbackEntry](operator-memory-entry.md)
- [Memory artifacts overview](memory-artifacts.md)
- [Resolvers](../concepts/resolvers.md)
