# FindingReport

## Purpose

`FindingReport` is an evaluation artifact. It groups findings produced by
policy or community evaluators.

## Produced By

- `@rekon/capability-policy`
- evaluator capabilities
- the custom TODO example

## Consumed By

- `@rekon/runtime.buildFindingFilterReport` — the next layer in
  the governance chain. It produces a
  [`FindingFilterReport`](finding-filter-report.md) recording
  which findings were suppressed by deterministic system /
  policy filters, with reason / evidence / confidence. The
  `FindingReport` is **not** mutated by filtering.
- `@rekon/capability-resolver`
- `@rekon/capability-docs`
- intent/work-order generation

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`FindingReport`.

## Common Fields

- `summary.total`
- `summary.bySeverity`
- `summary.byType`
- `findings`
- `findings[].severity`
- `findings[].subjects`
- `findings[].files`
- `findings[].evidence`

## Example

```json
{
  "header": {
    "artifactType": "FindingReport",
    "artifactId": "finding-report-123",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-13T18:00:00.000Z",
    "subject": { "repoId": "simple-js-ts" },
    "producer": { "id": "@rekon/capability-policy", "version": "0.1.0" },
    "inputRefs": [
      { "type": "EvidenceGraph", "id": "evidence-123", "schemaVersion": "0.1.0" }
    ],
    "provenance": { "confidence": 1 }
  },
  "summary": {
    "total": 1,
    "bySeverity": { "low": 1 },
    "byType": { "todo_comment": 1 }
  },
  "findings": [
    {
      "id": "todo:src/index.ts:1",
      "type": "todo_comment",
      "severity": "low",
      "title": "TODO comment",
      "description": "Source contains a TODO comment.",
      "subjects": ["src/index.ts"],
      "files": ["src/index.ts"]
    }
  ]
}
```

## Freshness And Provenance

Finding reports should point to the artifacts they evaluated. Resolver packets
attach relevant findings by path.

## Lifecycle

`FindingReport` artifacts are raw evaluator output. They are never
mutated. Lifecycle state — `accepted`, `ignored`, `resolved` — lives in
the separate [FindingStatusLedger](finding-status-ledger.md) artifact,
and the derived view ships as
[FindingLifecycleReport](finding-lifecycle-report.md). See
[../concepts/finding-lifecycle.md](../concepts/finding-lifecycle.md).

## Capability Lint Bridge (Future)

The
[`CapabilityArchitectureLintReport` → `FindingReport` bridge decision](../strategy/capability-lint-finding-bridge-decision.md)
(forty-second slice) selects an intermediate
`CapabilityLintFindingBridgeReport` **preview** artifact between
capability-policy lint evaluation and governed findings. **No bridge
writes `FindingReport` today**, and the bridge report itself never
writes `FindingReport`. Only a separate, explicit `FindingReport` writer
decision may promote eligible bridge candidates into governed findings;
even then they flow through the graph-aware finding filters, the status
ledger, and adjudication like any other finding.
