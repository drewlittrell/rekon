# VerificationResult

`VerificationResult` summarizes the outcome of verification.

## Produced By

- manual recording commands
- verification-result derivation from a `VerificationRun`

## Common Fields

- `header`
- `status`
- `commandResults`
- `recordedBy`
- `notes`
- `sourceState`

Results cite the relevant plan and run through `inputRefs`.

A result derived from a stable executed run copies the run's exact post-command
`SourceStateBinding`. Post-edit validation compares this digest with the
current change state. Generation time is display metadata, not evidence that a
result applies to current bytes.

Manual and historical results without a source binding remain readable for
compatibility. Their current-state freshness is `unknown`, so they cannot
satisfy a `ProofGateReport` for a changed source state.

When the result cites a `VerificationRun`, post-edit validation may read that
run to return a bounded, re-redacted stderr, stdout, or note excerpt for a
failed selected command. The diagnostic is corrective context, not a new proof
claim.
