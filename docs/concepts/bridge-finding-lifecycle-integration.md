---
freshness:
  paths:
    - packages/capability-model/src/bridge-finding-lifecycle-integration.ts
---
# Bridge Finding Lifecycle Integration

**Bridge finding lifecycle integration** is the question of how
bridge-derived findings — the `Finding` rows the controlled
`rekon capability lint write-findings --confirm-finding-write` writer
produces from `CapabilityArchitectureLintReport` rows via the
`CapabilityLintFindingBridgeReport` — *would* enter the governed-finding
pipeline (finding filters → finding lifecycle → issue adjudication →
`CoherencyDelta`), and how to surface that readiness **before** building
any writer that mutates lifecycle.

## Why a preview first

The capability ontology stops, by deliberate governance design, at a
`FindingReport`. Findings then flow through the *existing* governed
pipeline like any other finding. But bridge-derived findings carry
extra trace (`source`, `sourceBridgeCandidateId`, `sourceLintRowId`,
`sourceContractId`, `sourcePhraseCapabilityId`) and have their own
eligibility questions: do they have evidence? do they carry the trace a
lifecycle decision would need? are they duplicates of findings already
in the pipeline?

Rather than answer those questions inside a lifecycle *writer* — which
would couple the capability track to lifecycle, adjudication, and
`CoherencyDelta` mutation in a single step — the
[lifecycle / CoherencyDelta integration
decision](../strategy/bridge-finding-lifecycle-integration-decision.md)
chose **Option B**: ship a read-only preview artifact first, observe it,
and only then design the writer behind its own decision and safety
review.

## What the preview models

The `BridgeFindingLifecycleIntegrationReport` reads a `FindingReport`,
identifies the bridge-derived findings structurally (never by title text
alone), and classifies each one's readiness to enter lifecycle:

- **ready-for-lifecycle** — has evidence and the expected bridge trace;
  receives a modeled initial status `new`.
- **needs-review** — has evidence but is missing expected trace.
- **duplicate** — repeats a finding id already classified ready.
- **ineligible** — has no evidence.
- **filtered** — reserved for a later slice that consumes the
  deterministic filter APIs.

Ordinary (non-bridge) findings are omitted from the preview entirely.

## Governance boundary

The preview is **read-only**. It mutates no `FindingFilterReport`,
`FindingLifecycleReport`, `IssueAdjudicationReport`, or `CoherencyDelta`;
it creates no `WorkOrder` or `VerificationPlan`; it performs no source
writes. It only models eligibility so an operator or agent can see what
*would* happen. `CoherencyDelta` integration remains downstream of
lifecycle and adjudication, and `WorkOrder` / `VerificationPlan` remain
downstream of governed `CoherencyDelta`.

See the
[BridgeFindingLifecycleIntegrationReport artifact reference](../artifacts/bridge-finding-lifecycle-integration-report.md)
for the full shape, classification table, and CLI surface.

## Cross-References

- [BridgeFindingLifecycleIntegrationReport artifact](../artifacts/bridge-finding-lifecycle-integration-report.md)
- [Bridge-derived findings lifecycle / CoherencyDelta integration decision](../strategy/bridge-finding-lifecycle-integration-decision.md)
- [BridgeFindingLifecycleIntegrationReport safety review](../strategy/bridge-finding-lifecycle-integration-report-safety-review.md)
- [FindingReport artifact](../artifacts/finding-report.md)
- [Finding lifecycle concept](finding-lifecycle.md)
- [Graph-aware finding filters concept](graph-aware-finding-filters.md)
- [Coherency delta concept](coherency-delta.md)
- [Remediation work orders concept](remediation-work-orders.md)
