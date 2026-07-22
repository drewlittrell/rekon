# Verification Results

`VerificationResult` summarizes verification proof for a plan or work order.

It should cite the plan and any run it was derived from. A result does not
automatically resolve findings or apply reconciliation.

Results derived from stable executed runs carry the exact post-run
`SourceStateBinding`. `validate_change` admits that result only when its digest
matches the current bounded change state. Timestamp ordering is not a proof
mechanism: an unbound result is `unknown`, and a newer result bound to different
bytes is `stale`.

When a selected result is failed, stale, skipped, or missing,
`validate_change` emits proof-local corrective context. The entry identifies
the selected command, changed paths, check and flow-edge obligation IDs,
result/run refs, and a bounded redacted diagnostic when the linked run has one.
A passing result bound to the current source emits no correction.
