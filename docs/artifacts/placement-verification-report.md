# PlacementVerificationReport

`PlacementVerificationReport` records an independent semantic review of a
changed flow-stage responsibility. It is proof input, not repository law, and
it does not replace the stage's required test.

## Produced By

An independent model or service creates the report with
`createPlacementVerificationReport()` and writes it to the Rekon artifact
store. The verifier must not be the agent that made the change.

## Consumed By

`rekon context validate-change` accepts repeatable
`--placement-verification <PlacementVerificationReport:ref>` arguments.
CLI-hosted MCP accepts the same refs through `placementVerifications`.

## Contract

The report binds:

- the task text and complete changed-path set;
- the exact `FlowContract`, flow, stage, responsibility assertion, and stage
  paths;
- the changed implementation paths covered by the responsibility;
- a normalized `sourceState` with before/after SHA-256 values and a
  deterministic digest;
- bounded source spans whose file digests match that source state;
- a `supported`, `refuted`, or `unresolved` verdict and explanation;
- verifier identity, version, and the acting-agent identity from which it is
  independent.

```json
{
  "header": {
    "artifactType": "PlacementVerificationReport",
    "artifactId": "placement-review-42",
    "schemaVersion": "1.0.0",
    "generatedAt": "2026-07-23T12:00:00.000Z",
    "subject": {
      "repoId": "example",
      "paths": ["src/nlu/tokenize.ts", "tests/experience.test.ts"]
    },
    "producer": {
      "id": "@example/placement-judge",
      "version": "1.0.0"
    },
    "inputRefs": [{
      "type": "FlowContract",
      "id": "experience-flow",
      "schemaVersion": "1.0.0"
    }],
    "freshness": { "status": "fresh" },
    "provenance": { "confidence": 1 }
  },
  "obligation": {
    "id": "constraint:experience-flow.stage.tokenize.responsibility.1",
    "assertion": "Stage tokenize responsibility: remove connectors.",
    "contractRef": {
      "type": "FlowContract",
      "id": "experience-flow",
      "schemaVersion": "1.0.0"
    },
    "flowId": "experience-flow",
    "stageId": "tokenize",
    "stagePaths": ["src/nlu/tokenize.ts"],
    "changedSourcePaths": ["src/nlu/tokenize.ts"]
  },
  "verdict": "supported",
  "verifier": {
    "kind": "model",
    "id": "independent-placement-judge",
    "version": "1.0.0",
    "independentOf": ["rekon-managed-agent"]
  }
}
```

## Admission

Validation accepts a report only when its task, paths, assertion, contract,
flow, stage, source state, and verifier independence match the current
responsibility obligation. The CLI also verifies cited source excerpts against
the current regular, in-repository files. Generic `--judgment-json`, direct
`ProofResult` input, stale reports, and reports attributed to the acting agent
cannot satisfy placement.

A supported report supplies the semantic half of the stage-responsibility
gate. The matching declared test must still pass. A refuted report blocks the
gate even when that test passes.
