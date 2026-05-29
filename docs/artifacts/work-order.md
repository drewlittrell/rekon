# WorkOrder

## Purpose

`WorkOrder` is an action-oriented artifact that turns scoped intelligence into
work guidance and verification requirements. Rekon generates two flavors of
work order:

- **Resolver work order.** Derived from a `ResolverPacket`. Drives a specific
  agent task with a goal, paths, owner systems, and required checks.
- **Remediation work order.** Derived from a `CoherencyDelta` remediation
  queue. Drives prioritized governance work (P0/P1/P2 findings) with stronger
  anti-gaming guardrails.

Both flavors share the same `WorkOrder` artifact type; only `source` and the
optional `remediationItems` field differ.

## Produced By

- `@rekon/capability-intent.work-order` — resolver-based work order.
- `@rekon/capability-intent.remediation-work-order` — remediation work order
  built from `CoherencyDelta`.

## Consumed By

- users and agents executing work
- `@rekon/capability-reconcile.actuator` in suggestion mode reads the
  latest remediation work order (where `source === "coherency-delta"`)
  to classify reconciliation operations. See
  [reconciliation-plan.md](reconciliation-plan.md).
- `@rekon/capability-intent` via `rekon verify record` cites the
  work order when recording [`VerificationResult`](verification-result.md)
  outcomes against the paired `VerificationPlan`.
- `@rekon/capability-resolver`'s `resolve.issue` walks
  `remediationItems` to find verification evidence for a finding (see
  [verification-result.md](verification-result.md) and
  [../concepts/verification-results.md](../concepts/verification-results.md)).
- `rekon intent remediation --skip-verified` reads
  `remediationItems` indirectly via `lookupVerificationEvidence` when
  deciding which findings already have passing proof.

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`WorkOrder`.

## Common Fields

- `goal`
- `paths`
- `ownerSystems`
- `riskNotes`
- `requiredChecks`
- `successCriteria`
- `relevantFindings`
- `relevantMemory`
- `antiGamingInstruction`
- `markdown`
- `source` — `"resolver"` or `"coherency-delta"` (optional)
- `remediationItems` — present only on remediation work orders

`remediationItems` shape:

```ts
type RemediationWorkOrderItem = {
  findingId: string;
  priority: "p0" | "p1" | "p2";
  title: string;
  action: string;
  files: string[];
  systems: string[];
  severity: string;
};
```

## Example — resolver work order

```json
{
  "header": {
    "artifactType": "WorkOrder",
    "artifactId": "work-order-123",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-13T18:00:00.000Z",
    "subject": {
      "repoId": "simple-js-ts",
      "paths": ["src/index.ts"],
      "systems": ["src"]
    },
    "producer": { "id": "@rekon/capability-intent", "version": "0.1.0" },
    "inputRefs": [
      { "type": "ResolverPacket", "id": "preflight-123", "schemaVersion": "0.1.0" }
    ],
    "provenance": { "confidence": 0.8 }
  },
  "goal": "modify bootstrap",
  "paths": ["src/index.ts"],
  "ownerSystems": ["src"],
  "requiredChecks": ["npm run typecheck", "npm run test", "npm run build"],
  "antiGamingInstruction": "Do not bypass failing checks, delete tests, or weaken validation to make verification pass.",
  "source": "resolver"
}
```

## Example — remediation work order

```json
{
  "header": {
    "artifactType": "WorkOrder",
    "artifactId": "work-order-456",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-14T11:00:00.000Z",
    "subject": { "repoId": "simple-js-ts" },
    "producer": { "id": "@rekon/capability-intent", "version": "0.1.0" },
    "inputRefs": [
      { "type": "IntentMap", "id": "intent-map-...", "schemaVersion": "0.1.0" },
      { "type": "CoherencyDelta", "id": "coherency-delta-...", "schemaVersion": "0.1.0" },
      { "type": "FindingLifecycleReport", "id": "finding-lifecycle-report-...", "schemaVersion": "0.1.0" }
    ],
    "provenance": { "confidence": 0.7 }
  },
  "goal": "Resolve active coherency findings from the latest CoherencyDelta.",
  "source": "coherency-delta",
  "remediationItems": [
    {
      "findingId": "import_boundary.generated_output_import:src/feature/handler.ts:../../dist/generated",
      "priority": "p0",
      "title": "Import from generated/build output",
      "action": "Replace generated-output import with a source import or package entrypoint import.",
      "files": ["src/feature/handler.ts"],
      "systems": ["src"],
      "severity": "high"
    }
  ],
  "requiredChecks": [
    "npm run typecheck",
    "npm run test",
    "npm run build",
    "rekon artifacts validate --json",
    "rekon artifacts freshness --json"
  ]
}
```

## Freshness And Provenance

Resolver work orders are invalid when their input `ResolverPacket` changes.
Remediation work orders are invalid when their `CoherencyDelta` or
`FindingLifecycleReport` changes.

Work orders are guidance artifacts, not source changes. The intent capability
does not modify code or run the verification commands; it only writes the
plan.

## Cross-References

- [Remediation work orders concept](../concepts/remediation-work-orders.md)
- [VerificationPlan](verification-plan.md)
- [VerificationResult](verification-result.md)
- [Verification results concept](../concepts/verification-results.md)
- [CoherencyDelta](coherency-delta.md)
- [ResolverPacket](resolver-packet.md)
- [CapabilityLintFindingBridgeReport → FindingReport writer decision](../strategy/capability-lint-finding-writer-decision.md)
  — forty-seventh slice; selects Option B (a future, opt-in
  `FindingReport` writer with dry-run preview + explicit confirmation;
  not implemented). **The writer creates no `WorkOrder`** — work orders
  remain downstream of governed findings and `CoherencyDelta`, never of
  capability-lint bridge candidates or their writer. The writer's
  **dry-run helper / CLI** has shipped (forty-eighth slice, preview
  only): it previews the proposed `FindingReport` body and creates no
  `WorkOrder`; write mode is deferred. The dry-run **safety review**
  (forty-ninth slice) declared it **safe / stable as preview-only
  writer modeling**; work orders stay downstream and are not created
  by the dry-run. The **writer mode decision** (fiftieth slice)
  selected an opt-in write mode behind `--confirm-finding-write`
  (now **shipped** in the fifty-first slice as the writer
  implementation); it creates no `WorkOrder`. The **writer safety
  review** (fifty-second slice) confirmed the writer **safe /
  stable as a controlled, opt-in writer**; work orders remain
  downstream. The **bridge-derived findings publication decision**
  (fifty-third slice) then selected **Option B** — surface the
  written bridge-derived `FindingReport` entries in the architecture
  summary and agent operating contract first; that surfacing creates
  no `WorkOrder`, and work orders remain downstream. See
  [bridge-derived findings publication decision](../strategy/bridge-derived-findings-publication-decision.md). The surfacing
implementation shipped in the fifty-fourth slice (read-only, in the
architecture summary + agent contract); it creates no `WorkOrder` and
work orders remain downstream. The surfacing was safety-reviewed safe / stable as read-only visibility in the fifty-fifth slice. The lifecycle / CoherencyDelta integration decision (fifty-sixth slice) then selected a BridgeFindingLifecycleIntegrationReport preview artifact first; lifecycle / adjudication / CoherencyDelta mutation remain deferred to later safety-reviewed slices.
