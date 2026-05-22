# ReconciliationPlan

## Purpose

`ReconciliationPlan` records the operations a reconciliation actuator
considered, together with their **classification** and **status**. In
the current alpha, reconciliation is artifact-only by default and
source-writing operations are not applied.

`ReconciliationPlan` supports two modes:

- **Manual mode.** The operator supplies a list of operations (e.g.
  `--operation docs_regeneration`). The actuator denies anything that
  is not artifact-only.
- **Suggestion mode.** The actuator reads the latest `WorkOrder` (when
  `source === "coherency-delta"`) or `CoherencyDelta` and classifies
  every remediation item into a `ReconciliationPlanOperation`.
  Source-write and command operations are marked `deferred` and
  require future permission grants to apply.

## Produced By

- `@rekon/capability-reconcile.actuator`.

## Consumed By

- humans and agents reviewing planned or applied operations
- future verification recorders, publishers, and dashboards

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`ReconciliationPlan`. `inputRefs` cites the inputs the plan was built
from: at minimum the latest `IntelligenceSnapshot`, and for suggestion
plans the latest `WorkOrder` and/or `CoherencyDelta`.

## Shape

```ts
type ReconciliationOperation =
  | "docs_regeneration"
  | "label_override_write"
  | "finding_baseline_write"
  | "safe_import_rewrite"
  | "generated_scaffold_write"
  | "verification_command_run"
  | "manual_review";

type ReconciliationOperationClass =
  | "artifact-only"
  | "deterministic-deferred"
  | "source-write-deferred"
  | "command-deferred"
  | "manual-review";

type ReconciliationOperationStatus =
  | "planned"
  | "applied"
  | "deferred"
  | "denied";

type ReconciliationPlanOperation = {
  operation: ReconciliationOperation;
  status: ReconciliationOperationStatus;
  reason?: string;
  class?: ReconciliationOperationClass;
  source?: "manual" | "work-order" | "coherency-delta";
  findingId?: string;
  priority?: "p0" | "p1" | "p2";
  files?: string[];
  systems?: string[];
  suggestedAction?: string;
  requiresPermission?: Array<"write:source" | "execute:commands" | "network:outbound">;
};

type ReconciliationPlan = {
  header: ArtifactHeader;
  dryRun: boolean;
  operations: ReconciliationPlanOperation[];
  summary?: {
    total: number;
    artifactOnly: number;
    deterministicDeferred: number;
    sourceWriteDeferred: number;
    commandDeferred: number;
    manualReview: number;
    applied: number;
    planned: number;
    deferred: number;
    denied: number;
  };
};
```

## Operation Classification

The suggestion-mode actuator classifies each remediation item by
inspecting its `title` and `action` text (case-insensitive):

| Match | Operation | Class | Status |
| --- | --- | --- | --- |
| docs / documentation / README / AGENTS | `docs_regeneration` | `artifact-only` | `planned` (or `applied` with `--apply`) |
| baseline / accept / ignore / false positive / status ledger | `finding_baseline_write` | `artifact-only` | `planned` (or `applied` with `--apply`) |
| import / generated output / dist / build output / boundary | `safe_import_rewrite` | `source-write-deferred` | `deferred` (requires `write:source`) |
| scaffold / generate file / create file | `generated_scaffold_write` | `source-write-deferred` | `deferred` (requires `write:source`) |
| test / verify / verification / command / run | `verification_command_run` | `command-deferred` | `deferred` (requires `execute:commands`) |
| (no match) | `manual_review` | `manual-review` | `deferred` |

`--apply` only applies `artifact-only` operations. All other classes
remain deferred until a future permission and execution model is
introduced.

## Example — suggestion mode

```json
{
  "header": {
    "artifactType": "ReconciliationPlan",
    "artifactId": "reconciliation-plan-...",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-14T12:00:00.000Z",
    "subject": { "repoId": "simple-js-ts" },
    "producer": { "id": "@rekon/capability-reconcile", "version": "0.1.0" },
    "inputRefs": [
      { "type": "WorkOrder", "id": "work-order-...", "schemaVersion": "0.1.0" },
      { "type": "CoherencyDelta", "id": "coherency-delta-...", "schemaVersion": "0.1.0" }
    ],
    "provenance": { "confidence": 0.8 }
  },
  "dryRun": true,
  "operations": [
    {
      "operation": "safe_import_rewrite",
      "status": "deferred",
      "class": "source-write-deferred",
      "source": "work-order",
      "findingId": "import_boundary.generated_output_import:src/feature/handler.ts:../../dist/generated",
      "priority": "p0",
      "files": ["src/feature/handler.ts"],
      "systems": ["src"],
      "suggestedAction": "Replace generated-output import with a source import or package entrypoint import.",
      "requiresPermission": ["write:source"],
      "reason": "Import remediation likely requires source edits; source writes are deferred."
    }
  ],
  "summary": {
    "total": 1,
    "artifactOnly": 0,
    "deterministicDeferred": 0,
    "sourceWriteDeferred": 1,
    "commandDeferred": 0,
    "manualReview": 0,
    "applied": 0,
    "planned": 0,
    "deferred": 1,
    "denied": 0
  }
}
```

## Freshness And Provenance

`ReconciliationPlan` lives under the `actions` category. Its
`inputRefs` cite the `WorkOrder` (if used) and the `CoherencyDelta`
(if used), so `rekon artifacts freshness --type ReconciliationPlan`
marks the plan `stale` when a newer governance input is indexed.
Rebuild with `rekon reconcile suggest`.

## What This Is Not

- Not source modification. The plan describes work; it does not write
  code.
- Not command execution. The plan lists commands; it does not run
  them.
- Not auto-apply. `--apply` only acts on `artifact-only` operations.
- Not a full classic `PlanExecutorService`. The deeper apply path
  (deterministic source writes, generated scaffolds, command runs)
  remains deferred behind future permissions.

## Cross-References

- [ReconciliationLog](reconciliation-log.md)
- [Reconciliation plans concept](../concepts/reconciliation-plans.md)
- [WorkOrder](work-order.md)
- [CoherencyDelta](coherency-delta.md)
- [Capability model](../strategy/capability-model.md)
- [Source-write reconciliation policy decision](../strategy/source-write-reconciliation-policy-decision.md) —
  pins beta posture: Option C (preview-first, apply
  deferred post-beta). Reserves the
  `ReconciliationApplyReport` artifact name (the
  per-apply artifact that will cite this plan +
  pre / post `VerificationResult`s when the apply
  slice ships) and the `source:write` permission
  name. No autonomous source writes.
