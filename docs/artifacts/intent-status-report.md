# IntentStatusReport

`IntentStatusReport` summarizes the current state of one intent. It reads
existing artifacts and does not create work, execute commands, or write source.

## Lineage

Status proof must form one coherent chain:

```text
IntentAssessmentReport -> PreparedIntentPlan -> IntentStatusReport
  -> WorkOrder -> VerificationPlan -> VerificationRun -> VerificationResult
```

When an assessment or prepared plan is pinned, automatic selection considers
only downstream artifacts that trace to that exact lineage. A missing match is
reported as absent proof. Proof from another intent is never used as fallback.

JSON output includes `lineage.root`, `lineage.selected`, and `lineage.missing`.
Explicit incompatible references fail with one of these codes:

- `intent_artifact_lineage_mismatch`
- `intent_artifact_lineage_ambiguous`
- `intent_artifact_source_ref_missing`

Compatibility is established from structured artifact refs and digests, not
timestamps, filenames, repository roots, or goal text.

`rekon intent assess` follows the same rule for verification proof. Pass
`--verification-plan`, `--verification-run`, or `--verification-result` to
select proof for the assessment. Unselected historical proof remains available
through the artifact registry but is not attached automatically.

## Produced By

- `rekon intent status`
- `rekon intent status transition`

## Consumed By

- `rekon intent approve`
- `rekon intent work-order generate`
- `rekon intent verification-plan generate`
- `rekon intent bundle write`

The artifact header records every selected input ref. The report remains a
rollup; its inputs remain the source artifacts.
