# @rekon/kernel-repo-model

Public repository model artifact contracts for Rekon.

## Stability

Label: `experimental, public`.

Symbols not re-exported from the package root are `internal`. See
[docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

This package owns deterministic model artifacts derived from evidence:

- `ObservedRepo`
- `ObservedSystem`
- `OwnershipMap`
- `CapabilityMap`
- `SystemContract`
- `FlowContract`
- `EffectiveContractRegistry`
- `ContractCandidateReport`
- `ContractJudgmentReport`
- `ContractAdoptionReport`
- `ContractDriftReport`
- `TaskPact`
- `PlacementVerificationReport`
- `ProofGateReport`
- `ContextUsageEvent`
- `OutcomeEvent`
- `ContextOutcomeEvaluationReport`
- `RuntimeGraphObservationReport`
- `SemanticDebtJudgmentReport`
- `SecurityScanReport`
- `DependencyAuditReport`
- `TestReport`
- `LintReport`

## Lifecycle Fit

Model artifacts are produced during `Project` and consumed by resolvers,
policy, docs, and intent/work-order generation.

## Public Surface

The package also exports validation helpers and normalization helpers for
systems and paths. Intent consumers share `INTENT_TASK_KINDS`,
`INTENT_IMPLEMENTATION_TASK_KINDS`, and their type guards so request kinds do
not drift between assessment, preparation, and handoff generation.
Semantic debt report policy records provider, model, effort, prompt version,
coercion version, and eligibility version so cached judgments retain their
execution provenance. Reports may summarize why files were excluded before
provider judgment.
`OwnershipMap` entries may identify their `basis` as `declared` or `inferred`.
Consumers that enforce repository law must not silently treat inferred path
grouping as an operator declaration.
`createCapabilityMap()` merges repeated entries for the same capability,
preserving all normalized subjects, systems, and evidence references instead
of dropping later or earlier observations.
Runtime graph observation contracts preserve instrumented execution evidence
without redefining it as coverage. Coverage source metadata records its format,
digest, explicit test attribution, accepted/ignored file counts, and optional
`VerificationRun` command provenance. Isolated sources may also retain function
ranges, execution counts, and declared source targets for downstream evidence
joins.
Security scan contracts retain normalized SARIF tool, rule, severity,
fingerprint, location, and source-digest provenance without asserting
exploitability.
Dependency audit contracts retain normalized advisories, affected ranges,
installed versions, dependency paths, scope, and source/lockfile digests
without asserting exploitability.
Test and lint report contracts retain normalized JUnit cases and ESLint
diagnostics without retaining raw tool payloads.

## Import Boundary

These are projections, not canonical input truth. They must point back to evidence with `ArtifactRef`s.
Committed `RepositoryContractSourceDocument` inputs are version-controlled
declarations compiled into provenance-bearing contract artifacts. Generated
artifacts never rewrite those sources.
`TaskPact` is the task-scoped read model over adopted repository law. It carries
matched contracts, constraints, context paths, checks, freshness, and impact
obligations without changing the source contracts.
`PlacementVerificationReport` is the source-bound independent semantic proof
for a changed flow-stage responsibility. It binds the exact contract, stage,
task paths, source-state digest, reviewed spans, verdict, and verifier
provenance. Public helpers normalize its signing payload, add an Ed25519
attestation, and verify that attestation against an operator-provided trusted
key. An unsigned report is a draft, not admissible proof. The report is not
repository law and cannot replace the stage's test.
`ProofObligation`, `ProofResult`, and `ProofGateReport` define post-edit
completion gates. Tests, runtime observations, static evidence, and model
judgment count only when the obligation declares that method. Counterevidence
blocks the gate. Recorded reports bind the accepted result to post-edit source
digests so later edits cannot reuse it.
`FlowContract` handoffs may declare accepted proof methods, an acceptance
policy, and exact checks for their dependency edge. These declarations do not
collapse payload, guarantee, ordering, or failure semantics into edge proof.
Stages may also declare path-scoped responsibilities. A handoff verifier may
name `requiredEvidencePaths`, normally focused regression tests, only alongside
an accepted `test` method and at least one exact check. This declares current
diff evidence; it does not replace execution of the check. Stage placement
requires a current, trusted independent `PlacementVerificationReport`; the
acting agent's generic model judgment cannot satisfy it.
`ContractCandidateReport.evidenceInventory` distinguishes successful inventory
of supported evidence from actual runtime and isolated-coverage availability.
It is optional when reading earlier v1 reports; current discovery producers
emit it and mark validation gaps as partial.
`TaskContextItem` may also carry a `routeRole`, `necessity`, and
`necessityReason`. These fields distinguish task targets, repository law,
implementation, handoff, verification, dependency, compatibility, and
supporting routes without changing the underlying evidence. Legacy items may
omit all three fields; when any route field is present, validation requires the
complete route description.
`TaskContextAdmission` records whether each delivered item is supported or
unresolved and keeps rejected graph claims out of context while preserving an
audit decision. Legacy reports may omit this additive field.
`TaskContextItem` supports a `memory` kind and source with a stable
`contextKey` and `unobserved`, `suggestive`, or `corroborated` grounding
status. The learning event contracts join that delivered identity to exact
grounded outcomes. Validation may derive an immutable receipt with `applied`,
`read`, or `ignored` claims; those claims route independent proof but are not
proof of effectiveness.
Exact `CapabilityEvidenceRef` source excerpts may carry `sourceSha256`, binding
their line range and text to the scanned source. Consumers must not serve an
exact source span unless this digest is present and valid.
