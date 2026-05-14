# Memory Artifacts

## Purpose

Memory artifacts record operator feedback and deterministic memory selections.
They enrich resolver output without rewriting architecture facts.

## Produced By

- `@rekon/capability-memory`

## Consumed By

- `@rekon/capability-resolver`
- `@rekon/capability-docs`
- future learner-aware publishers

## Required Header Fields

All standard `ArtifactHeader` fields are required. Common memory artifact types
are `OperatorFeedbackEntry`, `MemoryEvent`, and `MemorySelection`.

## Common Fields

`OperatorFeedbackEntry`:

- `instruction`
- `scope.paths`
- `scope.goal`
- `confidence`

`MemorySelection`:

- `path`
- `goal`
- `selections`

## Example

```json
{
  "header": {
    "artifactType": "MemorySelection",
    "artifactId": "memory-selection-123",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-13T18:00:00.000Z",
    "subject": { "repoId": "simple-js-ts", "paths": ["src/index.ts"] },
    "producer": { "id": "@rekon/capability-memory", "version": "0.1.0" },
    "inputRefs": [
      { "type": "OperatorFeedbackEntry", "id": "feedback-123", "schemaVersion": "0.1.0" }
    ],
    "provenance": { "confidence": 1 }
  },
  "path": "src/index.ts",
  "goal": "modify bootstrap",
  "selections": [
    {
      "instruction": "Preserve bootstrap behavior.",
      "confidence": 0.75,
      "reason": "scope prefix match"
    }
  ]
}
```

## Freshness And Provenance

Memory selections are invalid when feedback entries change. Memory must not
mutate ownership, rules, findings, or canonical evidence.

## v1 Ranking And Curation

The v1 batch made memory selection scoped, ranked, freshness-aware,
verification-aware, and explainable. See:

- [../concepts/memory.md](../concepts/memory.md) for the ranking
  algorithm, CLI surface, and curation principles.
- [operator-memory-entry.md](operator-memory-entry.md) for the
  extended `OperatorFeedbackEntry` fields (`scope.systems`,
  `scope.capabilities`, `scope.layers`, `scope.tags`,
  `verification`, `reliability`, `priority`, `status`, etc.).
- [memory-selection.md](memory-selection.md) for the
  `MemorySelection` shape including the new `query` /
  `selected` (with `score` and `reasons` per item) / `rejected`
  fields.

The pre-v1 `MemorySelection.selections` array is preserved for
backwards compatibility — the resolver and any other older consumer
keep working without changes.
