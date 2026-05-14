CHANGES MADE
- Added a second actuator handler inside `@rekon/capability-intent`:
  - id `@rekon/capability-intent.remediation-work-order` registered alongside the existing `@rekon/capability-intent.work-order`.
  - Consumes the latest `CoherencyDelta` (required), plus `FindingLifecycleReport` and `ResolverPacket` (each optional).
  - Emits one `IntentMap`, one `WorkOrder`, and one `VerificationPlan` per invocation.
- Exported helper `runRemediation(artifacts, options)` from the package so future surfaces (PR/check publishers, dashboards) can reuse the same logic.
- Extended the package-local `WorkOrder` type with optional `source: "resolver" | "coherency-delta"` and `remediationItems: RemediationWorkOrderItem[]` fields. The kernel-level `WorkOrder` artifact shape is unchanged.
- Added `@rekon/kernel-findings` as a `@rekon/capability-intent` dependency (used for `CoherencyDelta`, `CoherencyRemediationStep`, `CoherencyRemediationPriority`, and `FindingLifecycleReport` type imports).
- Updated the capability manifest's `consumes` to include the new artifact types and added `coherency.changed` + `lifecycle.changed` invalidation rules alongside the existing `preflight.changed` rule.
- Added a CLI friendly shortcut `rekon intent remediation` which invokes `runAct({ actuatorId: "@rekon/capability-intent.remediation-work-order" })` after `ensureCoherencyDeltaReady`. Supports `--finding <id>`, `--priority p0|p1|p2`, `--limit <n>` flags.
- Added contract test file `tests/contract/remediation-work-order.test.mjs` with 12 tests.
- New docs: `docs/concepts/remediation-work-orders.md`, `docs/artifacts/verification-plan.md`. Updated `docs/artifacts/work-order.md` to describe both work-order flavors, `docs/artifacts/coherency-delta.md`, `docs/concepts/coherency-delta.md`, `docs/extensions/authoring-capabilities.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, root `README.md`, and `CHANGELOG.md`.

PUBLIC API CHANGES
- New actuator handler exported from `@rekon/capability-intent`: `remediationActuator`. The default capability export now registers it alongside `intentActuator`.
- New exported `runRemediation` helper plus new exported `RemediationWorkOrderItem`, `RemediationActuatorInput`, `RemediationActuatorResult` types from `@rekon/capability-intent`.
- `WorkOrder` package-local type gained optional `source?: "resolver" | "coherency-delta"` and `remediationItems?: RemediationWorkOrderItem[]` fields.
- New CLI command: `rekon intent remediation [--finding <id>] [--priority p0|p1|p2] [--limit <n>] [--root <path>] [--json]`.
- New actuator id appears in capability listing; the existing `@rekon/capability-intent.work-order` actuator and its behavior are unchanged.
- No kernel changes. No SDK changes. No new capability roles. No artifact header shape changes. The `WorkOrder`, `VerificationPlan`, and `IntentMap` artifact types at the kernel level are unchanged.

CODEBASE-INTEL ALIGNMENT
- Classic capability: structured intent preparation, anti-gaming gates, and remediation plans from `services/IntentPreparationService.ts`, `lib/intent-preparation/**`, `packages/product-codebase-intel/src/intent/**`, `packages/product-codebase-intel/src/reconcile/PlanHandler.ts`, `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`, plus the issue-driven plan generation in `packages/product-codebase-intel/src/replatform/replatform-delta.ts`.
- What Rekon keeps: structured objective; scope (paths + owner systems); required checks; explicit success criteria; strengthened anti-gaming instruction; remediation work driven by governance artifacts; outputs are artifacts with `inputRefs`.
- What Rekon simplifies: no phase parser, no semantic triage, no actionability question engine, no elicitation state, no parallel work-unit scheduling, no LLM normalization, no source-write reconciliation, no auto-apply.
- What Rekon does not port yet: full `IntentPreparationService`, implementation context projection, phase artifact renderer, gate quality review, generated-artifact completion projection.
- Phase advanced: B — remediation work orders ✅ initial slice shipped. Phase C still holds the deeper intent prep (phase parser, semantic triage, elicitation, parallel scheduling) and deterministic source-write reconciliation.

REMEDIATION WORK ORDER MODEL
- Actuator id: `@rekon/capability-intent.remediation-work-order`.
- Capability id: `@rekon/capability-intent` (existing).
- Produces: `IntentMap`, `WorkOrder`, `VerificationPlan`.
- Required input: latest `CoherencyDelta` (actuator returns no artifacts + clear message if missing or empty).
- Optional inputs: latest `FindingLifecycleReport`, latest `ResolverPacket`.
- Output category: `actions` (same as existing resolver work orders).
- Filtering:
  - `--finding <id>`: select only the matching `findingId`.
  - `--priority p0|p1|p2`: select only items at the named priority.
  - `--limit <n>`: limit to the first N items (default 5).
- Accepted/ignored/resolved findings are excluded because they never enter `CoherencyDelta.remediationQueue` (the kernel filters them out before this actuator runs).
- The actuator does not modify source, does not run verification commands, and does not synthesize missing inputs. If no `CoherencyDelta` or no active items, it writes no artifacts and returns `{ artifacts: [], selectedItems: [], message }`.

CLI COMMANDS ADDED
- `rekon intent remediation` — friendly shortcut. Optional flags: `--finding`, `--priority`, `--limit`. Auto-runs `ensureCoherencyDeltaReady` (which auto-runs observe/project/evaluate/snapshot/lifecycle/delta if missing) before dispatching the actuator.
- Output shape on success:
  ```json
  {
    "artifacts": [
      { "type": "IntentMap", "id": "...", "path": "..." },
      { "type": "WorkOrder", "id": "...", "path": "..." },
      { "type": "VerificationPlan", "id": "...", "path": "..." }
    ],
    "selectedItems": [
      { "findingId": "...", "priority": "p0", "severity": "high", "files": ["..."], "systems": ["..."], "title": "...", "action": "..." }
    ]
  }
  ```
- Output shape on empty:
  ```json
  { "artifacts": [], "selectedItems": [], "message": "No active remediation items in latest CoherencyDelta." }
  ```
- Generic actuator dispatch (`rekon act run …`) remains intentionally unprovided. Generic dispatch for actuators is a deliberate alpha-scope deferral; the friendly shortcut is the only path.

ANTI-GAMING GUARDRAILS
- The remediation work-order `antiGamingInstruction` is stronger than the resolver-based one. Verbatim:
  > "Do not modify tests, artifact validators, rules, findings, status ledgers, or verification scripts merely to make this work order appear complete. Verification gates exist to prove real implementation correctness; if a gate is wrong, record that as a finding or follow-up instead of gaming it."
- Success criteria call out: real implementation change; no weakened/removed/bypassed checks; addressed findings no longer active after re-running `rekon evaluate` -> `rekon findings lifecycle` -> `rekon coherency delta`; work stays scoped; accepted/ignored status changes require notes.
- Required checks include `rekon artifacts validate --json` and `rekon artifacts freshness --json` so the operator must verify the artifact lineage really moved.
- Risk Notes surface P0 caution, cross-system seam reminders, and the lifecycle filtering note (accepted/ignored/resolved excluded).
- Follow-up Evidence section explicitly instructs re-running evaluate, findings lifecycle, coherency delta, and publish architecture so the rebuilt governance state proves the work landed.

TESTS / VERIFICATION
- `npm run typecheck`: passed.
- `npm run test`: 190 passed, 1 skipped (optional dogfood). 12 new contract tests in `tests/contract/remediation-work-order.test.mjs`.
- `npm run build`: passed.
- `git diff --check`: clean.
- `node scripts/audit-package-exports.mjs`: passed (19 packages).
- `node scripts/publish-dry-run.mjs`: passed (19 packages, 6 files each, no `.tsbuildinfo`, no forbidden tokens).
- `node scripts/audit-license.mjs`: passed.
- `node scripts/install-smoke.mjs`: passed.
- `node scripts/install-tarball-smoke.mjs`: passed.
- CLI smoke against `examples/simple-js-ts`: `init`, `observe`, `project`, `snapshot`, `evaluate`, `findings lifecycle`, `coherency delta`, `intent remediation` (no-active-items path), `intent work-order` (resolver-based path still works), `publish architecture`, `artifacts validate` — every command exited 0. `artifacts validate` returned `{ valid: true, issues: [] }`. The example produces zero findings so `intent remediation` correctly returns the empty-message payload.
- Manual smoke against the import-boundary rule pack fixture: 3 active findings (1 p0, 2 p1). `rekon intent remediation` selected all 3 (default limit 5); `--priority p0` narrowed to 1; `--limit 1` narrowed to 1. The generated `WorkOrder` markdown body included the documented sections (Source, Objective, Selected Remediation Items table with `| p0 |` and `| p1 |` rows, Scope, Required Checks, Success Criteria, Guardrails, Risk Notes, Follow-up Evidence), used `source: "coherency-delta"`, and cited `CoherencyDelta`/`IntentMap`/`FindingLifecycleReport` in `header.inputRefs`. `rekon artifacts validate` stayed clean.

INTENTIONALLY UNTOUCHED
- No kernel changes. The `WorkOrder`, `IntentMap`, and `VerificationPlan` artifact types at the kernel level are unchanged. The `CoherencyDelta` shape is unchanged.
- No SDK changes. The new handler is a second `actuator` inside the same capability and registers through the existing `defineCapability` API.
- No new capability roles. No phase artifact, no triage artifact, no elicitation state.
- No source modification. The actuator does not write code files.
- No auto-apply. The verification plan lists commands; the actuator does not run them.
- No reconciliation source writes. `@rekon/capability-reconcile` is unchanged.
- No PR/check publishers. The work order is an artifact, not a GitHub surface.
- No watcher or daemon.
- No LLM normalization. No semantic triage. No phase parser.
- No schema library introduced.
- No version bump.
- No npm publish.
- No `codebase-intel-classic` imports.
- The existing `@rekon/capability-intent.work-order` actuator and its `intent work-order` CLI behavior are unchanged (resolver-based work orders still write `source: "resolver"` and omit `remediationItems`).
- `resolve.issue` is unchanged.

RISKS / FOLLOW-UP
- The single Markdown work-order body can grow long when many findings land. Default limit is 5; longer follow-up would either add multiple work orders, JSON sidecars, or pagination. Not needed at alpha volume.
- The actuator does not yet emit a structured JSON sidecar containing the rendered remediation items separately from the markdown. Future PR/check publishers that consume the same inputs will likely want a structured surface; deferring keeps this batch small (`remediationItems` is already on the WorkOrder JSON, which is the structured surface).
- The remediation work order cites every consumed artifact in `header.inputRefs` but does not embed their content. Re-reading them through `rekon artifacts show <id>` is the canonical path.
- The package-local `WorkOrder.source` and `WorkOrder.remediationItems` fields are a soft API change — direct importers of the `WorkOrder` type from `@rekon/capability-intent` will see the new optional fields. The runtime treats `WorkOrder` opaquely, so no downstream code should break.
- The CLI shortcut `rekon intent remediation` always (re)runs `ensureCoherencyDeltaReady` before dispatching the actuator. If a CoherencyDelta already exists this is a no-op; if missing, the helper auto-runs observe/project/evaluate/snapshot/lifecycle/delta. A pure-replay path (only re-dispatch the actuator without rebuilding governance state) is not yet exposed; deferring to keep the surface simple.
- No `VerificationResult` artifact is emitted yet. A future "verification recorder" capability could write the result of actually running the verification plan commands. Out of scope here.

NEXT STEP
- Per the work order: reconciliation plan generation from `WorkOrder` / `CoherencyDelta`. Produce `ReconciliationPlan` *suggestions* only — no source writes — classifying deterministic vs deferred operations. Maps to classic `PlanHandler` / `PlanExecutorService` discipline while keeping auto-apply out of scope.
- Operator npm publish is still pending and unchanged by this batch.
