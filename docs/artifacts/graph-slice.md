# GraphSlice

## Purpose

`GraphSlice` is a projection artifact for relationship models. Initial built-in
slices cover imports, symbols, and ownership.

## Produced By

- `@rekon/capability-graph`
- community projector capabilities

## Consumed By

- `@rekon/capability-resolver` for ownership fallback
- future graph-aware resolvers and publishers

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`GraphSlice`.

## Common Fields

- `producer`
- `nodes`
- `nodes[].id`
- `nodes[].kind`
- `edges`
- `edges[].source`
- `edges[].target`
- `edges[].kind`
- `edges[].evidence`

Every edge must keep evidence.

## Example

```json
{
  "header": {
    "artifactType": "GraphSlice",
    "artifactId": "ownership-graph-123",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-13T18:00:00.000Z",
    "subject": { "repoId": "simple-js-ts" },
    "producer": { "id": "@rekon/capability-graph", "version": "0.1.0" },
    "inputRefs": [
      { "type": "EvidenceGraph", "id": "evidence-123", "schemaVersion": "0.1.0" }
    ],
    "provenance": { "confidence": 0.8, "notes": ["ownership-graph"] }
  },
  "producer": "@rekon/capability-graph",
  "nodes": [
    { "id": "src", "kind": "system" },
    { "id": "src/index.ts", "kind": "file" }
  ],
  "edges": [
    {
      "source": "src",
      "target": "src/index.ts",
      "kind": "owns",
      "evidence": [
        { "source": "repo", "extractorVersion": "0.1.0", "computedAt": "2026-05-13T18:00:00.000Z", "confidence": 0.9 }
      ]
    }
  ]
}
```

## Freshness And Provenance

Graph slices are derived from evidence. Their headers should include the input
evidence graph in `inputRefs`, and each edge should carry evidence.
