# FindingReport

## Purpose

`FindingReport` is an evaluation artifact. It groups findings produced by
policy or community evaluators.

## Produced By

- `@rekon/capability-policy`
- evaluator capabilities
- the custom TODO example

## Consumed By

- `@rekon/runtime.buildFindingFilterReport` — the next layer in
  the governance chain. It produces a
  [`FindingFilterReport`](finding-filter-report.md) recording
  which findings were suppressed by deterministic system /
  policy filters, with reason / evidence / confidence. The
  `FindingReport` is **not** mutated by filtering.
- `@rekon/capability-resolver`
- `@rekon/capability-docs`
- intent/work-order generation

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`FindingReport`.

## Common Fields

- `summary.total`
- `summary.bySeverity`
- `summary.byType`
- `findings`
- `findings[].severity`
- `findings[].subjects`
- `findings[].files`
- `findings[].evidence`

## Example

```json
{
  "header": {
    "artifactType": "FindingReport",
    "artifactId": "finding-report-123",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-13T18:00:00.000Z",
    "subject": { "repoId": "simple-js-ts" },
    "producer": { "id": "@rekon/capability-policy", "version": "0.1.0" },
    "inputRefs": [
      { "type": "EvidenceGraph", "id": "evidence-123", "schemaVersion": "0.1.0" }
    ],
    "provenance": { "confidence": 1 }
  },
  "summary": {
    "total": 1,
    "bySeverity": { "low": 1 },
    "byType": { "todo_comment": 1 }
  },
  "findings": [
    {
      "id": "todo:src/index.ts:1",
      "type": "todo_comment",
      "severity": "low",
      "title": "TODO comment",
      "description": "Source contains a TODO comment.",
      "subjects": ["src/index.ts"],
      "files": ["src/index.ts"]
    }
  ]
}
```

## Freshness And Provenance

Finding reports should point to the artifacts they evaluated. Resolver packets
attach relevant findings by path.

## Lifecycle

`FindingReport` artifacts are raw evaluator output. They are never
mutated. Lifecycle state — `accepted`, `ignored`, `resolved` — lives in
the separate [FindingStatusLedger](finding-status-ledger.md) artifact,
and the derived view ships as
[FindingLifecycleReport](finding-lifecycle-report.md). See
[../concepts/finding-lifecycle.md](../concepts/finding-lifecycle.md).

## Capability Lint Bridge

The
[`CapabilityArchitectureLintReport` → `FindingReport` bridge decision](../strategy/capability-lint-finding-bridge-decision.md)
(forty-second slice) selected an intermediate
[`CapabilityLintFindingBridgeReport`](capability-lint-finding-bridge-report.md)
**preview** artifact between capability-policy lint evaluation and
governed findings. That bridge report **shipped in the forty-third
slice** (preview-only; see the
[capability lint finding bridge concept](../concepts/capability-lint-finding-bridge.md)).
**No bridge writes `FindingReport` today**, and the bridge report itself
**does not write `FindingReport`** — nor does it mutate
`FindingFilterReport`, `FindingLifecycleReport`,
`IssueAdjudicationReport`, or `CoherencyDelta`, and it creates no
`WorkOrder` / `VerificationPlan`. Only a separate, explicit
`FindingReport` writer decision may promote eligible bridge candidates
into governed findings; even then they flow through the graph-aware
finding filters, the status ledger, and adjudication like any other
finding. The
[`CapabilityLintFindingBridgeReport` safety review](../strategy/capability-lint-finding-bridge-report-safety-review.md)
(forty-fourth slice) confirmed this boundary holds and declared the
preview bridge safe / stable; publication surfacing (visibility only,
no finding writes) shipped next and was itself safety-reviewed.

The
[`CapabilityLintFindingBridgeReport` → `FindingReport` writer
decision](../strategy/capability-lint-finding-writer-decision.md)
(forty-seventh slice) selects **Option B**: a **future, separate,
opt-in** `FindingReport` writer with a **required dry-run preview**
and **explicit confirmation**. **The writer is not implemented and
no `FindingReport` is written.** When built, it would consume
`eligible` bridge candidates, preserve the deterministic
`proposedFinding` id, and write a **new** `FindingReport` artifact —
never mutating an existing `FindingReport` in place. Every written
finding would still flow through the graph-aware finding filters,
the status ledger, lifecycle, and adjudication;
`FindingFilterReport`, `FindingLifecycleReport`,
`IssueAdjudicationReport`, `CoherencyDelta`, `WorkOrder`,
`VerificationPlan`, and source writes all remain downstream and are
not mutated by the writer.

The writer's **dry-run helper / CLI** shipped in the **forty-eighth
slice** (preview only): `rekon capability lint write-findings
--bridge-report <id|type:id> --dry-run` and
`@rekon/capability-model.buildFindingReportWritePreview` read the
bridge report and return the proposed `FindingReport` body. **The
dry-run writes no `FindingReport`, mutates no governance artifact or
the artifact index, creates no `WorkOrder` / `VerificationPlan`,
requires `--dry-run`, and rejects `--confirm-finding-write` /
`--write` / `--send` / `--execute`.** Write mode is deferred to a
later, safety-reviewed slice.

The dry-run helper / CLI was itself **safety-reviewed** in the
**forty-ninth slice**
([dry-run safety review](../strategy/capability-lint-finding-writer-dry-run-safety-review.md)),
which declared it **safe / stable as preview-only writer
modeling** (no blocker) and selected the writer mode decision as
the next slice. `FindingReport` and the rest of the governance
chain remain unmutated by the dry-run.

The
[FindingReport writer mode decision](../strategy/capability-lint-finding-writer-mode-decision.md)
(fiftieth slice) then selected **Option B**: a future, opt-in
write mode gated behind `--confirm-finding-write` that reuses the
dry-run preview and writes a **new** `FindingReport` artifact only
(never mutating an existing one). It is **not implemented**;
`--write` / `--send` / `--execute` stay rejected, and the writer
mutates no `FindingFilterReport` / `FindingLifecycleReport` /
`IssueAdjudicationReport` / `CoherencyDelta` and creates no
`WorkOrder` / `VerificationPlan`.

The **writer implementation** shipped in the **fifty-first slice**:
`rekon capability lint write-findings --confirm-finding-write`
writes exactly one new `FindingReport` artifact (the proposed
body), never mutating an existing `FindingReport` in place. It
requires `--confirm-finding-write` (mutually exclusive with
`--dry-run`; `--write` / `--send` / `--execute` rejected), exits
non-zero on 0 eligible findings, and mutates no downstream
governance artifact.

The writer was **safety-reviewed** in the **fifty-second slice**
([writer safety review](../strategy/capability-lint-finding-writer-safety-review.md)),
which declared it **safe / stable as a controlled, opt-in writer**
(no blocker) and selected the writer publication / operator-surface
decision as the next slice. Lifecycle and `CoherencyDelta`
integration remain downstream.

The
[bridge-derived findings publication decision](../strategy/bridge-derived-findings-publication-decision.md)
(fifty-third slice) then selected **Option B**: bridge-derived
`FindingReport` entries (those the writer wrote, identified by
`finding.type === "capability_architecture_policy"` plus the
`details.source*` trace fields) will be surfaced in the
**architecture summary** and **agent operating contract** first as
read-only visibility with provenance; proof-report surfacing remains
**deferred**. The surfacing **shipped in the fifty-fourth slice**
(read-only `## Bridge-Derived Findings` in the architecture summary
and `### Bridge-Derived Findings` in the agent contract). The surfacing was safety-reviewed safe / stable as read-only visibility in the fifty-fifth slice. The lifecycle / CoherencyDelta integration decision (fifty-sixth slice) then selected a BridgeFindingLifecycleIntegrationReport preview artifact first; lifecycle / adjudication / CoherencyDelta mutation remain deferred to later safety-reviewed slices. The preview artifact `BridgeFindingLifecycleIntegrationReport` then shipped in the fifty-seventh slice (read-only; `rekon capability lint lifecycle-preview`); see [its artifact reference](bridge-finding-lifecycle-integration-report.md).
Publication surfacing mutates no `FindingReport`,
`FindingLifecycleReport`, `IssueAdjudicationReport`, or
`CoherencyDelta`, and creates no `WorkOrder` / `VerificationPlan`;
bridge-derived findings are governed `FindingReport` entries, not
lifecycle status, and lifecycle / `CoherencyDelta` integration remain
downstream.
