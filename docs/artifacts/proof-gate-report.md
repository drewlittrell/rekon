# ProofGateReport

`ProofGateReport` records why a post-edit source state is allowed to advance.
It is an action artifact, not repository law.

## Produced By

`rekon context validate-change ... --record-proof` writes the report only when
every required obligation is satisfied.

## Consumed By

`rekon refresh --proof-gate <ProofGateReport:id>` verifies the recorded source
digests before refreshing evidence, projections, governance, and publications.
Future source-writing actuators may use the same completion gate.

## Contract

The artifact contains:

- `task`: the task text and changed paths;
- `sourceState`: an immutable base ref, before/after SHA-256 for each changed
  file, and a deterministic digest of that bounded state;
- `obligations`: assertions attached to repository law, flow handoffs, context
  claims, or selected checks;
- `results`: explicit static, test, runtime, or model-judgment evidence;
- `evaluation`: the recomputed decision for every obligation and the whole
  gate.

Each obligation declares its accepted methods and policy. `all-required`
requires every listed method. `any-authoritative` excludes model judgment when
a stronger listed method exists. `any-supported` accepts one listed method and
is used for a handoff edge that may be exercised by a test, runtime observation,
or explicit semantic judgment. Any accepted refutation blocks the gate.

```json
{
  "header": {
    "artifactType": "ProofGateReport",
    "artifactId": "proof-gate-7c03b1c4",
    "schemaVersion": "1.0.0",
    "generatedAt": "2026-07-21T12:00:00.000Z",
    "subject": { "repoId": "example", "paths": ["src/index.ts"] },
    "producer": { "id": "@rekon/cli.change-validation", "version": "1.0.0" },
    "inputRefs": [{ "type": "VerificationResult", "id": "verification-result-42", "schemaVersion": "0.1.0" }],
    "freshness": { "status": "fresh" },
    "provenance": { "confidence": 1 }
  },
  "sourceState": {
    "baseRef": "b479d1f07899b3aa9b527ec210fcbb40799e9f31",
    "files": [{
      "path": "src/index.ts",
      "status": "modified",
      "beforeSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "afterSha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    }],
    "digest": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
  },
  "evaluation": { "status": "satisfied" }
}
```

Missing, skipped, stale, or unrelated evidence remains unresolved. Results for
an unknown obligation do not count. Contradictory evidence is retained, and a
refutation wins over support.

## Freshness

The report is fresh only for the exact recorded source bytes. A later edit,
restored deletion, path mismatch, malformed digest, or non-satisfied evaluation
causes proof-gated refresh to fail. Verification evidence is admitted only when
its own source-state digest equals this change state; a newer timestamp cannot
substitute for digest equality.
