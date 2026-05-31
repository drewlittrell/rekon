# PathFreshnessReport

## Purpose

`PathFreshnessReport` records a **deterministic
comparison between the current working-tree fingerprint
of a declared source-path set and a baseline fingerprint
captured by an earlier `PathFreshnessReport`.** It is
the first watcher / path-freshness slice — selected by
the
[Post-Beta Dogfood Evidence Triage Decision](../strategy/post-beta-dogfood-evidence-triage.md)
(Option C) and reserved by the
[Watcher / Path Freshness Policy Decision](../strategy/watcher-path-freshness-policy-decision.md).

The report exists so operators and agents can tell
**without running a daemon** whether the files Rekon's
artifacts cite have drifted since those artifacts were
generated. The recommendation field tells the operator
to run `rekon refresh` explicitly when the working tree
has changed.

## Distinction From Artifact Lineage Freshness

**Artifact lineage freshness is not working-tree
freshness.** The two are independent and both
matter:

- **Artifact lineage freshness** — handled by the
  runtime's `validateArtifactFreshness` and the
  existing `## Input Freshness Warnings` / `###
  Governance Freshness` surfaces. It flags drift
  *within* the artifact chain (e.g., the latest
  `FindingReport` no longer matches the snapshot it
  cites).
- **Working-tree freshness** — handled by
  `PathFreshnessReport`. It flags drift *between*
  the source files and the latest recorded
  source-state baseline.

Neither replaces the other; both can be `fresh` while
the other is `stale`.

## Status Of The Surface

**Shipped (this slice):**

- `PathFreshnessReport` artifact type registered in
  `@rekon/sdk` conformance + `@rekon/runtime`
  category map (`actions`).
- `createPathFreshnessReport(...)` + `comparePathFreshness(current,
  baseline?)` pure helpers in `@rekon/capability-intent`.
- `buildSourceStateFingerprint(input)` pure helper in
  `@rekon/kernel-repo-model` (sha256 hashes; default
  ignore set; deterministic root hash).
- `rekon paths freshness [--path <path>] [--root
  <path>] [--json]` CLI command that writes one
  `PathFreshnessReport` per invocation. **Read-only
  with respect to source files.**

**Shipped (follow-on slice
`path-freshness-publication-surfacing`):**

- Architecture summary renders a `## Working Tree
  Path Freshness` section.
- Agent contract renders a `### Working Tree Path
  Freshness` subsection + a new Do-Not-Do
  reminder.
- Proof report renders a `## Working Tree Path
  Freshness` section.
- All three publishers cite the latest
  `PathFreshnessReport` in `header.inputRefs` when
  present. **Publications are read-only with
  respect to the report: they never run `rekon
  paths freshness` and never run `rekon refresh`.**

**Shipped (follow-on slice
`path-freshness-github-review-surfacing`):**

- GitHub Check dry-run / send payload includes a
  compact `Working tree path freshness:` block in
  `output.summary` sourced from the latest
  `PathFreshnessReport`. The Check payload
  appends the report ref to `citedRefs`.
- PR comment dry-run / send body includes two new
  table rows (`Working-tree freshness` +
  `PathFreshnessReport`) sourced from the latest
  `PathFreshnessReport`. The comment's
  `### Warnings` section gains the stale or
  unknown warning. JSON output adds
  `citedRefs.pathFreshness` (additive only).
- **Both GitHub review surfaces read the latest
  `PathFreshnessReport` and never run `rekon
  refresh` or `rekon paths freshness`.**
- **Stale `PathFreshnessReport` is a trust
  warning — it is visible in the Check output and
  PR comment body but does not by itself flip the
  GitHub Check conclusion in this slice.**
  Conclusion continues to be derived from proof /
  validation state via the existing
  `pickConclusion` logic.
- **GitHub status / comments remain non-canonical;
  both surfaces retain their existing
  canonical-truth reminders.**

**Shipped (final track slice
`path-freshness-safety-review`):**

- End-to-end review of every component on the
  track (artifact + fingerprint helper + CLI +
  publication surfacing + GitHub review
  surfacing + read-only guarantees + no-daemon
  policy + mtime/hash policy + Check
  conclusion policy). **Decision: the path
  freshness track is beta-private stable.** See
  [Path Freshness Safety Review](../strategy/path-freshness-safety-review.md).

**Deferred (post-beta):**

- Watcher daemon design + implementation.
- Source-write apply.
- Optional `--path` from `git diff --name-only`
  in workflow templates.

## Shape

```ts
export type PathFreshnessStatus = "fresh" | "stale" | "unknown";

export type PathFreshnessPathStatus =
  | "fresh"
  | "changed"
  | "missing"
  | "new"
  | "unknown";

export type SourcePathFingerprint = {
  path: string;
  hash?: string;
  size?: number;
  exists: boolean;
  /**
   * mtime is **advisory only** — never canonical
   * freshness evidence. Hash comparison is the
   * source of truth.
   */
  mtimeAdvisory?: string;
};

export type SourceStateFingerprint = {
  algorithm: "sha256";
  rootHash: string;
  paths: SourcePathFingerprint[];
  generatedAt: string;
  ignoredGlobs?: string[];
};

export type PathFreshnessEntry = {
  path: string;
  status: PathFreshnessPathStatus;
  currentHash?: string;
  baselineHash?: string;
  currentExists?: boolean;
  baselineExists?: boolean;
  message?: string;
};

export type PathFreshnessSummary = {
  total: number;
  fresh: number;
  changed: number;
  missing: number;
  new: number;
  unknown: number;
};

export type PathFreshnessRecommendation = {
  refreshRecommended: boolean;
  commands: string[]; // e.g. ["rekon refresh"]
  message: string;
};

export type PathFreshnessReport = {
  header: ArtifactHeader;
  status: PathFreshnessStatus;
  baselineRef?: ArtifactRef;
  baselineGeneratedAt?: string;
  currentSourceState: SourceStateFingerprint;
  baselineSourceState?: SourceStateFingerprint;
  entries: PathFreshnessEntry[];
  summary: PathFreshnessSummary;
  recommendation: PathFreshnessRecommendation;
};
```

`ArtifactHeader` is unchanged. The report records
hashes and path-level metadata only — **never raw file
contents.**

## Source-State Fingerprint

`buildSourceStateFingerprint(input)` walks the source
tree under `input.repoRoot`, hashes file contents with
sha256, and returns a deterministic
`SourceStateFingerprint`. Behaviour:

- **Deterministic ordering.** Paths are sorted
  lexically; `rootHash` is a sha256 over the
  canonical JSON of `{path, hash, size, exists}`
  entries.
- **Bounded.** Files larger than 32 MiB record
  `exists + size` only (no hash) so a runaway file
  never exhausts memory.
- **Default ignore set.** When the operator does
  not supply `paths`, the walk excludes any
  segment in the default set:
  `.git`, `.rekon`, `node_modules`, `dist`,
  `coverage`, `.next`, `.turbo`, `.cache`. The
  ignored set is recorded on the fingerprint for
  audit reviewers.
- **`mtimeAdvisory` only.** When
  `includeMtimeAdvisory: true` is passed (CLI
  defaults to `false`), the entry records the
  file's mtime as an **advisory** field. Hash
  comparison remains the canonical signal during
  `comparePathFreshness`; **mtimes are never
  canonical freshness evidence.**
- **No source mutation. No network.** The helper
  is strictly read-only and never opens a socket.

## Comparator Rules

`comparePathFreshness(current, baseline?)` is a pure
function that produces the report's `status` /
`entries` / `summary` / `recommendation`:

| Condition | Per-path status | Run status |
| --- | --- | --- |
| Baseline absent (first run) | every current path → `unknown` | `unknown` (with refreshRecommended = false; "No baseline" message) |
| Path in current + baseline, hashes equal | `fresh` | contributes to `fresh` |
| Path in current + baseline, hashes differ | `changed` | contributes to `stale` |
| Path in baseline but not current | `missing` | contributes to `stale` |
| Path in current but not baseline | `new` | contributes to `stale` |

Aggregate rule: if any entry is `changed`, `missing`,
or `new`, the report's overall `status` is `stale`;
otherwise `fresh`. The recommendation field tells the
operator to run `rekon refresh` when the report is
`stale`.

## CLI Surface

```bash
rekon paths freshness [--path <path>] [--path <path>] [--root <path>] [--json]
```

Behaviour:

- **Read-only with respect to source files.**
  Writes exactly one new `PathFreshnessReport`
  artifact under
  `.rekon/artifacts/actions/PathFreshnessReport-<id>.json`.
- Compares against the most recent prior
  `PathFreshnessReport` for the same workspace.
  When `--path` narrows the tracking set, the
  baseline comparison is narrowed to the same set
  so unrelated paths in the broader baseline do
  not surface noise.
- Prints a JSON or human summary; exits 0
  regardless of status (the report's `status` is
  the operator-facing signal, not the exit code).
- **Does NOT run `rekon refresh`.** Refresh
  remains operator-initiated, full stop.
- **Does NOT start a watcher daemon. No
  background refresh. No file-system event
  subscription.**

### Output (JSON)

```json
{
  "artifact": { "type": "PathFreshnessReport", "id": "..." },
  "status": "stale",
  "summary": { "total": 2, "fresh": 0, "changed": 1, "missing": 1, "new": 0, "unknown": 0 },
  "recommendation": {
    "refreshRecommended": true,
    "commands": ["rekon refresh"],
    "message": "Source paths changed since the last PathFreshnessReport. Run `rekon refresh` before relying on existing artifacts."
  },
  "entries": [ /* per-path */ ],
  "baselineRef": { "type": "PathFreshnessReport", "id": "..." }
}
```

### Output (human)

```
Path freshness: stale
Paths inspected: 2 (fresh 0, changed 1, missing 1, new 0, unknown 0)
Recommendation: Source paths changed since the last PathFreshnessReport. Run `rekon refresh` before relying on existing artifacts.
Commands: rekon refresh
Artifact: PathFreshnessReport:path-freshness-<timestamp>
```

## Safety Contract

- **No source writes.** The helper, the comparator,
  and the CLI never touch a source file.
- **No watcher daemon. No background refresh. No
  file-system event subscription.**
- **Hashes only — never file contents.** A
  `PathFreshnessReport` carries deterministic
  identifiers, not retrievable copies of source.
- **mtimes are advisory only — never canonical
  freshness evidence.** Hash comparison is the
  source of truth; mtimes exist as a debugging
  aid only.
- **Conservative default ignore set.** Build
  artefacts (`dist`, `coverage`, `.next`,
  `.turbo`, `.cache`), VCS metadata (`.git`), the
  package manager cache (`node_modules`), and
  Rekon's own workspace (`.rekon`) are excluded
  from the default walk so source-state churn is
  driven by intentional source changes only.
- **`PathFreshnessReport` is a projection, not
  truth.** It exists to inform operator decisions
  (run `rekon refresh`? trust the latest
  artifacts?) — not to silently re-derive
  anything.

## Cross-References

- [Watcher / Path Freshness Policy
  Decision](../strategy/watcher-path-freshness-policy-decision.md)
  — pins Option C and reserves the
  `PathFreshnessReport` name.
- [Post-Beta Dogfood Evidence Triage
  Decision](../strategy/post-beta-dogfood-evidence-triage.md)
  — selects Option C as the next track.
- [Path Freshness concept doc](../concepts/path-freshness.md)
  — the operator-facing model.
- [Source-Write Reconciliation Policy
  Decision](../strategy/source-write-reconciliation-policy-decision.md)
  — explains why `rekon refresh` remains
  operator-initiated.
- [Freshness and invalidation concept
  doc](../concepts/freshness-and-invalidation.md)
  — covers artifact lineage freshness (the
  complementary surface).

> See also: [RuntimeGraphDriftReport v1 decision](../strategy/runtime-graph-drift-report-v1-decision.md) — the next spine layer (final classic-parity drift): compares StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport for expected-vs-observed runtime graph drift. Expected-vs-observed runtime graph drift, not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness; does not read raw handoff event logs directly; no WorkOrder / VerificationPlan; intent deferred.

> See also: [RuntimeGraphDriftReport artifact](runtime-graph-drift-report.md) — the final spine layer: expected-vs-observed runtime graph drift over StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport. Drift rows in-sync / missing-expected / added-observed / uncovered-handoff / unresolved-contract / observation-missing / not-evaluated (severity-bucketed). Not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness; does not read raw handoff event logs directly; no WorkOrder / VerificationPlan; intent deferred. See the [runtime graph drift concept](../concepts/runtime-graph-drift.md).

> See also: [RuntimeGraphDriftReport safety review](../strategy/runtime-graph-drift-report-safety-review.md) — declares RuntimeGraphDriftReport v1 safe / stable as expected-vs-observed runtime graph drift (not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness): reads no raw handoff event logs, re-evaluates no coverage, creates no WorkOrder / VerificationPlan, implements no intent. The classic step/handoff/runtime-drift spine is now complete enough to unblock intent architecture work. Next: Intent Capability Spine Integration Review.

> See also: [Intent Capability Spine Integration Review](../strategy/intent-capability-spine-integration-review.md) — maps the classic intent surfaces (intent:assess / intent:prepare / intent:go / intent:status) onto the Rekon artifact spine: assess → IntentAssessmentReport, prepare → PreparedIntentPlan, status → IntentStatusReport, go deferred. Selects Option B (staged intent artifact spine); first target IntentAssessmentReport v1 decision. Classic intent did not consume the step/handoff/runtime-graph/drift spine; Rekon intent extends parity by wiring StepCapabilityGraph, HandoffContract, HandoffCoverageReport, RuntimeGraphObservationReport, and RuntimeGraphDriftReport into intent readiness. No intent implemented, no artifact registered, no CLI command, no source writes.

> See also: [IntentAssessmentReport v1 decision](../strategy/intent-assessment-report-v1-decision.md) — selects Option B: IntentAssessmentReport v1 as an artifact-backed readiness assessment generated from a user request plus existing Rekon context artifacts (CapabilityMap v2, StepCapabilityGraph, HandoffCoverageReport, RuntimeGraphDriftReport, PathFreshnessReport, VerificationResult when available). Readiness: ready-for-prepare / blocked / needs-review / insufficient-context / stale-context; blocker categories missing-artifact / stale-context / runtime-drift / handoff-coverage / finding-governance / proof-missing / scope-ambiguous / source-write-unavailable. IntentAssessmentReport is assessment, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred. RuntimeGraphDriftReport is an input to readiness, not the intent system itself. No artifact implemented or registered; no CLI; no source writes.

> See also: [IntentAssessmentReport artifact](intent-assessment-report.md) — the read-only readiness assessment of a user request against the Rekon context spine (CapabilityMap, StepCapabilityGraph, HandoffCoverageReport, RuntimeGraphDriftReport, PathFreshnessReport, VerificationResult), via `rekon intent assess`. Readiness: ready-for-prepare / blocked / needs-review / insufficient-context / stale-context. IntentAssessmentReport is assessment, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. RuntimeGraphDriftReport is an input to readiness, not the intent system itself. PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred.

> See also: [IntentAssessmentReport safety review](../strategy/intent-assessment-report-safety-review.md) — declares IntentAssessmentReport v1 safe / stable as read-only readiness assessment (no blocker): assessment, not WorkOrder; creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult; executes no commands; writes no source; RuntimeGraphDriftReport is an input to readiness, not the intent system itself; PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred. Recommended next slice: PreparedIntentPlan v1 decision.

> See also: [PreparedIntentPlan v1 decision](../strategy/prepared-intent-plan-v1-decision.md) — selects Option B: PreparedIntentPlan v1 as an artifact-backed phase/gate preparation artifact generated from IntentAssessmentReport plus existing Rekon context. Prepared status: prepared / blocked / needs-review / stale-assessment / insufficient-assessment; phases investigate / modify / refactor / verify / review; obligation categories capability-preservation / step-preservation / handoff-preservation / runtime-drift / finding-governance / freshness / verification / source-write-boundary. PreparedIntentPlan is phase/gate preparation, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. Verification requirements are not VerificationPlan. IntentStatusReport is the next layer; intent:go deferred; source-write behavior remains unavailable.

> See also: [PreparedIntentPlan artifact](prepared-intent-plan.md) — the read-only phase/gate preparation generated from an IntentAssessmentReport plus the Rekon context spine, via `rekon intent prepare`. Prepared status: prepared / blocked / needs-review / stale-assessment / insufficient-assessment; phases investigate / modify / refactor / verify / review; obligation categories capability-preservation / step-preservation / handoff-preservation / runtime-drift / finding-governance / freshness / verification / source-write-boundary. PreparedIntentPlan is phase/gate preparation, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. Verification requirements are not VerificationPlan. IntentStatusReport is the next layer; intent:go deferred; source-write behavior remains unavailable.

> See also: [PreparedIntentPlan Approval / Proof Model Decision](../strategy/prepared-intent-plan-approval-proof-decision.md) — amends the PreparedIntentPlan architecture so a plan cannot be prepared without an explicit approval/proof envelope. PreparedIntentPlan.status.value can be prepared only when approval.status is approved; a plan with phases but without approval is not prepared. Approval cites the IntentAssessmentReport and records readiness, runtime-drift, handoff-coverage, freshness, verification, plan-structure, and source-write-boundary proof. Verification requirements are proof obligations, not VerificationPlan. PreparedIntentPlan does not create WorkOrder / VerificationPlan, execute commands, or write source; intent:go remains deferred. The shipped v1 implementation must be amended to add this envelope before it is treated as proof-bearing.

> Reviewed (slice 84): PreparedIntentPlan v1 is safe/stable as proof-approved phase/gate preparation — `status.value` can be prepared only when `approval.status` is approved, and a plan with phases but without approval is not prepared. Verification requirements are proof obligations, not VerificationPlan; preparation creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, and writes no source; IntentStatusReport remains the next layer and intent:go remains deferred. See [PreparedIntentPlan safety review](../strategy/prepared-intent-plan-safety-review.md).

> IntentStatusReport v1 decision (slice 85): the next intent layer is an artifact-backed status rollup generated read-only from IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport v1 decision](../strategy/intent-status-report-v1-decision.md).

> IntentStatusReport v1 (slice 86): the intent status layer has shipped as a read-only rollup status report (`rekon intent status`) over IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan / VerificationRun, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport artifact](intent-status-report.md).

> Reviewed (slice 87): IntentStatusReport v1 is safe/stable as read-only status reporting — it reports assessment / preparation / approval / work / verification / freshness / drift state but performs none of those steps. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself; WorkOrder / VerificationPlan generation remains deferred to a separate decision. It creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport safety review](../strategy/intent-status-report-safety-review.md).

> Decided (slice 88): the intent work/proof handoff uses separate, explicit, gated generators — PreparedIntentPlan -> WorkOrder and PreparedIntentPlan -> VerificationPlan, each decided / implemented / safety-reviewed on its own. Intent work/proof handoff is artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; VerificationPlan generation must require PreparedIntentPlan verification requirements; IntentStatusReport gates handoff but does not generate downstream artifacts; generated WorkOrder and VerificationPlan must trace back to PreparedIntentPlan; handoff generation does not execute commands or write source files; intent:go remains deferred. See [Intent Work / Proof Handoff Decision](../strategy/intent-work-proof-handoff-decision.md).

> Decided (slice 89): the Intent WorkOrder handoff uses an explicit gated WorkOrder generator (rekon intent work-order generate) that creates one WorkOrder from a proof-approved PreparedIntentPlan after the approval / IntentStatusReport work-ready / freshness / drift gates pass. Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; IntentStatusReport gates WorkOrder generation but does not generate WorkOrder; generated WorkOrder must trace back to PreparedIntentPlan; WorkOrder generation does not create VerificationPlan, execute commands, or write source files; intent:go remains deferred. See [Intent WorkOrder Handoff Decision](../strategy/intent-work-order-handoff-decision.md).

> Reviewed (slice 91): the Intent WorkOrder handoff is safe/stable as an explicit gated WorkOrder generator — `rekon intent work-order generate` requires a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready + a handoff-time freshness / drift recheck); the blocked path writes no `WorkOrder`, and the generated path writes exactly one `WorkOrder` that traces back to the plan. **Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go**; WorkOrder generation creates no `VerificationPlan` / `VerificationRun` / `VerificationResult`, executes no commands, and writes no source files; intent:go remains deferred. Next: Intent VerificationPlan Handoff Decision. See [Intent WorkOrder Handoff Safety Review](../strategy/intent-work-order-handoff-safety-review.md).

> Decided (slice 92): the Intent VerificationPlan handoff uses an explicit gated `VerificationPlan` generator (`rekon intent verification-plan generate`) that creates one `VerificationPlan` from a proof-approved `PreparedIntentPlan`'s verification requirements after the approval / IntentStatusReport (work-ready / work-in-progress / verification-ready) / `verificationPlanAllowed` / freshness / drift gates pass. **Intent VerificationPlan handoff is VerificationPlan artifact generation, not intent:go**; it requires a proof-approved PreparedIntentPlan and non-empty verification requirements; IntentStatusReport gates generation but does not generate VerificationPlan; generated VerificationPlan must trace back to PreparedIntentPlan; VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. WorkOrder is optional in v1 (cited when available). Next: Intent VerificationPlan Handoff Implementation. See [Intent VerificationPlan Handoff Decision](../strategy/intent-verification-plan-handoff-decision.md).
