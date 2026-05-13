# EvidenceGraph

## Purpose

`EvidenceGraph` is the canonical evidence input artifact produced by observe.
It contains evidence facts extracted from a repository.

## Produced By

- `@rekon/runtime.observe`
- evidence providers such as `@rekon/capability-js-ts`
- community evidence-provider capabilities

## Consumed By

- `@rekon/capability-model`
- `@rekon/capability-graph`
- `@rekon/capability-policy`
- `@rekon/capability-resolver` as fallback ownership evidence

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`EvidenceGraph`.

## Common Fields

- `facts`
- `facts[].kind`
- `facts[].subject`
- `facts[].value`
- `facts[].confidence`
- `facts[].provenance`

Unknown fact kinds are allowed. Community kinds should be namespaced when they
may collide with built-ins.

## Example

```json
{
  "header": {
    "artifactType": "EvidenceGraph",
    "artifactId": "evidence-123",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-13T18:00:00.000Z",
    "subject": { "repoId": "simple-js-ts" },
    "producer": { "id": "@rekon/runtime.observe", "version": "0.1.0" },
    "inputRefs": [],
    "provenance": { "confidence": 1 }
  },
  "facts": [
    {
      "id": "js-ts:abc",
      "kind": "ownership_hint",
      "subject": "src/index.ts",
      "value": { "path": "src/index.ts", "system": "src" },
      "confidence": 0.9,
      "provenance": {
        "source": "repo",
        "pack": "@rekon/capability-js-ts",
        "file": "src/index.ts",
        "extractorVersion": "0.1.0"
      }
    }
  ]
}
```

## Freshness And Provenance

Evidence facts must carry provenance. Derived artifacts should point back to
the `EvidenceGraph` through `inputRefs` or evidence refs.
