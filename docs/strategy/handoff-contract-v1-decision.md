# HandoffContract v1 Decision

## Decision Summary

This decision fixes the v1 model for `HandoffContract`, the second
artifact in the staged step/handoff/runtime graph spine. It follows the
[StepCapabilityGraph safety review](step-capability-graph-safety-review.md)
at `be09f5c`, which confirmed `StepCapabilityGraph` v1 is safe/stable as
expected workflow topology and selected `HandoffContract` as the next
layer.

**Select Option B — HandoffContract v1 as a config + artifact effective
contract.** An operator declares expected baton passes in an optional
`.rekon/handoff-contracts.json`; Rekon materializes an effective
`HandoffContract` artifact over the current `StepCapabilityGraph`, so
downstream coverage/drift reports can cite a stable artifact ref. Each
declared handoff references `StepCapabilityGraph` step ids
(`fromStepId` / `toStepId`); a handoff whose referenced steps are missing
is emitted with status `unresolved-step` rather than dropped or inferred.

The boundaries are pinned. **HandoffContract is declared baton policy,
not StepCapabilityGraph topology.** **HandoffContract v1 does not
evaluate handoff coverage.** **HandoffContract v1 does not read runtime
events.** **HandoffContract v1 does not detect runtime graph drift.**
**HandoffCoverageReport remains the next layer after HandoffContract.**
**RuntimeGraphObservationReport and RuntimeGraphDriftReport remain
deferred.** **HandoffContract does not create WorkOrder or
VerificationPlan.** **Intent implementation remains deferred.**

This is a decision-only batch; no `HandoffContract` is implemented or
registered here.

## Why This Decision Exists

`StepCapabilityGraph` now provides expected workflow topology, with
reserved (empty) handoff placeholders. Classic codebase-intel had
declared baton / handoff contracts over workflow features and compared
them against observed runtime handoff events. Rekon needs the **declared
baton policy** layer before it can evaluate handoff coverage, observe a
runtime graph, or detect runtime drift. This decision fixes that layer's
v1 shape, inputs, config path, and resolution policy so the
implementation slice has an unambiguous, bounded target — and so the
artifact does not quietly start inferring handoffs or claiming coverage.

## Current Boundary

- `StepCapabilityGraph` — expected workflow topology (steps + capability
  / file / system edges; `handoffPlaceholders` reserved/empty). **Not
  declared baton policy.**
- `CapabilityMap v2` — capability projection. **Not workflow/handoff
  topology.**
- `WorkOrder` — remediation task instruction. **Not a declared baton
  policy.**
- `VerificationPlan` / `VerificationRun` — proof commands + results.
  **Not handoff coverage.**

`HandoffContract` slots beside these as the declared-handoff layer over
`StepCapabilityGraph` step ids.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| config-only handoffs | rejected/deferred | downstream reports need artifact refs |
| config + artifact effective contract | selected | operator policy plus artifact provenance |
| derive handoffs automatically | rejected | baton policy should be declared |
| fold into StepCapabilityGraph | rejected | topology is not baton policy |
| start with HandoffCoverageReport | rejected | coverage needs declared expected handoffs |

- **Option A — config-only HandoffContract.** Rejected/deferred: a
  config alone gives downstream `HandoffCoverageReport` /
  `RuntimeGraphDriftReport` nothing stable to cite; an effective artifact
  is needed for provenance.
- **Option B — config + artifact effective contract.** Selected:
  balances operator control with artifact-backed provenance — the
  operator declares intent; Rekon materializes the effective contract
  over the current graph.
- **Option C — derive handoffs automatically from StepCapabilityGraph.**
  Rejected for v1: baton policy is too important to infer without declared
  intent.
- **Option D — fold handoffs into StepCapabilityGraph.** Rejected:
  `StepCapabilityGraph` is topology; `HandoffContract` is declared baton
  policy — distinct layers.
- **Option E — start with HandoffCoverageReport.** Rejected: coverage
  needs declared expected handoffs to compare observed events against.

## Recommendation

Adopt **Option B**: HandoffContract v1 is a **config + artifact effective
contract**. Inputs: `StepCapabilityGraph` + optional
`.rekon/handoff-contracts.json`. Outputs: declared handoffs with
`fromStepId` / `toStepId` refs, capability / feature labels, optional
event-identity and payload-shape metadata, and unresolved step
references — **no coverage status**. Observed runtime events are **not**
included in v1.

| Input | V1 Decision |
| --- | --- |
| StepCapabilityGraph | consumed |
| .rekon/handoff-contracts.json | optional |
| runtime handoff events | deferred |
| HandoffCoverageReport | deferred |
| RuntimeGraphObservationReport | deferred |
| RuntimeGraphDriftReport | deferred |

## Config Model

Recommended path: `.rekon/handoff-contracts.json`.

```json
{
  "version": "0.1.0",
  "handoffs": [
    {
      "id": "checkout.preview-to-payment.submit",
      "fromStepId": "checkout.preview",
      "toStepId": "payment.submit",
      "feature": "checkout-payment",
      "capability": {
        "verb": "submit",
        "noun": "payment",
        "domain": "checkout"
      },
      "event": {
        "name": "checkout.payment.submitted",
        "kind": "handoff_event"
      },
      "payload": {
        "schemaHint": "CheckoutPaymentSubmitted"
      },
      "notes": ["Expected baton from checkout preview to payment submission."]
    }
  ]
}
```

Rules: missing config is valid; invalid config fails clearly; the config
is never mutated. The config **declares expected baton policy** — it
cannot claim coverage, cannot mark drift resolved, and cannot create
runtime events. The `event` and `payload` blocks are *expected-identity*
metadata for a future coverage layer, not observed events.

## Artifact Model

Sketch only; not implemented in this batch.

```ts
type HandoffContractStatus =
  | "declared"
  | "unresolved-step"
  | "needs-review";

type HandoffContractCapabilityRef = {
  verb: string;
  noun: string;
  domain?: string;
};

type HandoffContractEventRef = {
  name?: string;
  kind?: string;
};

type HandoffContractPayloadRef = {
  schemaHint?: string;
};

type HandoffContractEntry = {
  id: string;
  status: HandoffContractStatus;
  fromStepId: string;
  toStepId: string;
  feature?: string;
  capability?: HandoffContractCapabilityRef;
  event?: HandoffContractEventRef;
  payload?: HandoffContractPayloadRef;
  evidenceRefs: ArtifactRef[];
  messages?: string[];
};

type HandoffContract = {
  header: ArtifactHeader;
  source: {
    stepCapabilityGraphRef: ArtifactRef;
    configPath?: string;
    configHash?: string;
  };
  summary: {
    total: number;
    declared: number;
    unresolvedStep: number;
    needsReview: number;
  };
  handoffs: HandoffContractEntry[];
};
```

Handoff ids are operator-declared in config and carried through verbatim
(the implementation slice may also derive a deterministic id from
`fromStepId` / `toStepId` / capability when omitted). `fromStepId` /
`toStepId` reference `StepCapabilityGraph.steps[].id`. The artifact
carries no coverage field; `event` / `payload` are expected-identity
metadata only.

## V1 Resolution Policy

1. Read latest or pinned `StepCapabilityGraph`.
2. Read optional `.rekon/handoff-contracts.json`.
3. For each configured handoff, check `fromStepId` / `toStepId` exist in
   `StepCapabilityGraph.steps`.
4. If both exist, emit status `declared`.
5. If either is missing, emit status `unresolved-step` with a message.
6. If no config exists, emit a valid `HandoffContract` with zero
   handoffs.
7. Do **not** infer handoffs from `StepCapabilityGraph`.
8. Do **not** evaluate coverage.
9. Do **not** read runtime event logs.

## Boundary Model

| Boundary | Decision |
| --- | --- |
| HandoffContract vs StepCapabilityGraph | declared baton policy vs topology |
| HandoffContract vs HandoffCoverageReport | no coverage in v1 |
| HandoffContract vs RuntimeGraphObservationReport | no runtime events in v1 |
| HandoffContract vs RuntimeGraphDriftReport | no drift detection in v1 |
| HandoffContract vs WorkOrder / VerificationPlan | no task/proof artifact creation |
| HandoffContract vs intent | prerequisite only |

## Follow-On Artifacts

| Future Artifact | Dependency On HandoffContract |
| --- | --- |
| HandoffCoverageReport | compares declared handoffs to observed events |
| RuntimeGraphObservationReport | provides observed event graph |
| RuntimeGraphDriftReport | compares declared/expected vs observed graph |
| intent:prepare | attaches declared handoffs and gates |
| intent:status | reports handoff coverage / drift state |

## Intent Impact

Intent integration is out of scope for this decision. The v1 shape is
chosen so a future `intent:prepare` can attach declared handoffs (and
gate on them) and `intent:status` can report handoff coverage / drift
once the coverage and runtime layers exist. **Intent implementation
remains deferred**, and `HandoffContract` v1 gates nothing on its own.

## What This Does Not Do

This decision implements no `HandoffContract`, registers no artifact
type, adds no CLI command, mutates no existing artifact
(`StepCapabilityGraph` or its config), infers no runtime events / handoff
coverage / runtime drift, creates no `WorkOrder` or `VerificationPlan`,
and starts no intent implementation. It imports nothing from classic
codebase-intel, bumps no version, and publishes nothing.

## Implementation Sequence

1. **HandoffContract v1 decision** (this memo) — model + config path +
   resolution policy.
2. **HandoffContract v1 implementation** — register the artifact type and
   a read-only generator from `StepCapabilityGraph` + optional
   `.rekon/handoff-contracts.json` (declared / unresolved-step only; no
   coverage, no runtime events, no drift).
3. **HandoffCoverageReport** — compares declared handoffs to observed
   events.
4. **RuntimeGraphObservationReport** → **RuntimeGraphDriftReport**, then
   intent spine integration.

## Cross-References

- [StepCapabilityGraph safety review](step-capability-graph-safety-review.md)
- [StepCapabilityGraph v1 decision](step-capability-graph-v1-decision.md)
- [StepCapabilityGraph / HandoffContract architecture decision](step-capability-handoff-architecture-decision.md)
- [Classic step-capability / handoff / runtime drift parity audit](classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [StepCapabilityGraph artifact](../artifacts/step-capability-graph.md)
- [Step capability graph concept](../concepts/step-capability-graph.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)

> See also: [HandoffContract artifact](../artifacts/handoff-contract.md) — the declared baton policy layer over StepCapabilityGraph step ids (config + artifact effective contract; declared / unresolved-step only; no handoff coverage / runtime events / drift in v1).
