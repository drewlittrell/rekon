# Source-Write Reconciliation Policy Decision

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

## Decision Summary

**Recommendation: Option C — beta pins the
source-write policy and preview requirements; the
actual apply implementation remains deferred until
the preview / rollback / permission model lands in
its own implementation slice.**

The [Beta Readiness / Remaining Classic-Parity
Review](beta-readiness-classic-parity-review.md)
identified three beta blockers; this memo resolves
the first by pinning the policy boundary without
shipping any source-write implementation in this
batch.

**Pinned reminders carried forward:**

- **Source-write apply is not required for beta,
  but the policy boundary is required for beta.**
- **No agent-autonomous source writes.**
- **Every future source-write apply must be
  preceded by exact diff preview and explicit
  operator confirmation.**
- **A successful apply must not automatically
  resolve findings; lifecycle / status updates
  remain explicit artifacts.**

This batch ships **the decision memo only**. No
new package. No new CLI command. No new helper.
No artifact type registered. No new permission
implemented. No GitHub API call. No source files
mutated. The artifact / permission names
(`ReconciliationApplyReport`, `source:write`) are
**reserved by this memo + the docs test**; their
actual registration belongs to the implementation
slice that follows the next two blocker memos.

## Why This Decision Exists

Rekon today produces `ReconciliationPlan`
artifacts via `reconcile suggest` and the
`resolve.issue` resolver. The plan is **preview /
planning / classification oriented** — it
enumerates the operations Rekon believes a fix
requires, with severity / confidence /
classification metadata. **Nothing in the
shipped runtime writes a single source byte.**

The [beta readiness review](beta-readiness-classic-parity-review.md)
identified this gap as the first beta blocker:

> A beta user who runs Rekon will reasonably
> ask "can I apply the fix it proposed?"
> Without a pinned policy, the answer drifts
> per-operator. Beta needs **one** answer (even
> if the answer is "no, beta is preview-only").

This memo answers that question. The answer is
**"no, beta does not apply; here is exactly
what beta requires before any future apply slice
ships"**.

The framing matters because source writes are
**high-leverage and high-risk**:

- Wrong patch → corrupted code, broken builds,
  silently merged regressions.
- Hidden agent writes → unreviewed diffs entering
  the operator's repo without explicit consent.
- Auto-resolution → findings appear fixed because
  source changed, even when verification fails.
- Irreversible patches → no clear path back to
  the pre-apply state.

Each risk has a corresponding guardrail in this
memo. Together they form the contract that the
implementation slice must satisfy.

## Current Reconciliation Model

`ReconciliationPlan` (shipped) is an
artifact-backed plan that lists candidate
operations:

- **Operation classes:** artifact-only updates
  (e.g., status changes, lifecycle transitions),
  source-file edits (e.g., patches, codemods,
  generated file creation), command executions
  (already routed through the verification
  runner — not source-write).
- **Per-operation metadata:** target path /
  artifact id, classification (deterministic /
  ambiguous / manual-only), confidence, severity,
  cited evidence refs.
- **Cited inputs:** the
  `IssueAdjudicationReport`, `CoherencyDelta`,
  optional `WorkOrder`, and any prior
  `ReconciliationPlan` superseded by this one.
- **Lifecycle:** plans are read by operators (or
  agents) as input to `resolve.issue` /
  `resolve.route` packets. They are **not
  applied**; they describe what an apply could
  do.

The
[Reconciliation plans concept](../concepts/reconciliation-plans.md)
and the
[ReconciliationPlan artifact doc](../artifacts/reconciliation-plan.md)
already describe this preview-only posture. This
memo formalises it as the **beta default** and
defines the boundary every future apply slice
must cross.

The `resolve.issue` resolver already cites the
plan in its `ResolverPacket` and surfaces the
suggested operations to operators — but it never
writes source either. Verification before apply
(see "Verification Requirement" below) already
works today; verification after apply is the
new requirement the apply slice must add.

## Classic Goal Reviewed

`codebase-intel-classic` connected issue
detection → reconciliation → verification →
proof. Its `PlanExecutorService`
(`packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`)
could execute reconciliation operations against
the source tree under operator-defined policies.
The useful guarantee was **not** "automatically
edit everything"; it was **controlled movement
from diagnosis to safe remediation with
traceability**.

Rekon's equivalent guarantee, when the apply
slice lands, must preserve:

- **Artifact-backed traceability.** Every
  applied change must cite the plan and the
  pre/post verification artifacts that justify
  it.
- **Operator intent.** No apply without
  explicit operator command.
- **Verification authority.** A failed
  post-apply verification is the source of
  truth — `VerificationResult.status === "failed"`
  means apply must not be claimed successful.
- **No silent auto-resolution.** A successful
  apply changes source; lifecycle / status
  changes still require their own artifacts
  (`FindingStatusLedger`, `IssueAdjudicationReport`
  updates, etc.).
- **Permissioned capability.** Apply lives
  behind an explicit `source:write` permission
  granted to specific capabilities.

The classic posture is "controlled apply with
proof." Rekon's posture for beta is "no apply
yet; here is the exact contract apply must
satisfy when it ships."

## Options Considered

### Option A — No source-write apply in beta

Rekon beta remains plan / preview / verification
only. All source-writing operations stay
operator / manual outside Rekon.

**Pros:** safest; no risk of corrupting code; no
rollback burden; current artifact loop remains
coherent.

**Cons:** weaker remediation product loop; users
must manually translate plans into code changes;
less parity with classic execution /
reconciliation workflows.

**Verdict:** acceptable as a strict default, but
doesn't address the policy ambiguity that
operators (and agents reading this codebase)
need pinned for beta. Rejected as the standalone
choice; preserved as the effective behaviour
under Option C.

### Option B — Deterministic source-write apply for narrow operation classes

Rekon beta supports source writes only for
explicitly deterministic, reversible operation
classes (e.g., generated config append with
exact patch; codemod-like text replacement with
exact before / after match; file creation from
template where the destination does not exist).

**Pros:** closes the remediation loop for safe
classes; keeps risky operations deferred; can
be strongly tested.

**Cons:** requires a patch engine, a rollback
model, a permission model, and a per-class
classifier before beta; hard to avoid scope
creep on the "deterministic" definition; the
combined hardening + safety review cost
exceeds the remaining beta budget.

**Verdict:** Rejected for beta. Reconsider
post-beta as the natural first apply slice
once the preview / permission / rollback
contract is implemented.

### Option C — Preview-first beta, apply implementation post-beta (**recommended**)

Beta requires the source-write policy + exact
diff preview shape, but **not** actual apply.
The implementation sequence ships:

1. **This decision memo.** Pins policy +
   reserved vocabulary.
2. **Patch preview artifact.** A concrete diff
   preview artefact (likely an additive field
   on `ReconciliationPlan` or a sibling
   preview artefact); apply-blind for now.
3. **Apply permission / rollback design.**
   Decision memo that pins the apply
   `source:write` permission + rollback
   contract.
4. **Apply implementation** (post-beta or late
   beta). Adds `reconcile apply --confirm` /
   `--apply` flag with pre/post verification
   gates + `ReconciliationApplyReport`.

**Pros:** resolves the beta policy blocker;
gives users confidence about the future apply
boundary; avoids premature source mutation;
keeps the beta-readiness review's "three
blockers, each a decision" framing intact.

**Cons:** beta still lacks source-write apply;
remediation loop remains partly manual.

**Verdict: Recommended.** This is the most
honest answer: beta does **not** include source
writes, but it does pin every constraint the
future apply slices must satisfy.

### Option D — Full apply with verification gates

Rekon beta supports applying `ReconciliationPlan`
operations with pre / post verification and
rollback.

**Pros:** strongest workflow parity; closest to
"plan → apply → verify → prove".

**Cons:** highest risk; rollback and failure
modes are complex; likely too much for beta
without additional hardening (atomic file
operations, multi-file patch transaction,
abort-mid-apply behaviour, signed commits,
etc.).

**Verdict:** Rejected for beta. Reconsider
post-beta as a higher-confidence target after
Options B's narrow-class apply ships and
operators have stress-tested the rollback
contract.

## Recommendation

**Adopt Option C.** Ship this decision memo
+ the docs test that pins it. Defer the
patch-preview artefact and the apply
implementation to follow-on slices, each with
their own decision memo + safety review.

**Pinned for the next slices (in order):**

1. **Watcher / path freshness policy decision
   memo** (next slice; the second beta
   blocker — not source-write work, but the
   next blocker in the beta queue).
2. **Beta release readiness checklist** (third
   beta blocker).
3. **Beta release execution** (final pre-beta
   slice).
4. **(Post-beta)** Patch preview artefact
   slice. Adds the exact diff preview to
   `ReconciliationPlan` (or a sibling
   artefact) without any apply.
5. **(Post-beta)** Apply permission +
   rollback design memo. Pins `source:write`
   capability binding + atomic-apply contract
   + rollback strategy.
6. **(Post-beta)** Apply implementation
   slice. Adds the `reconcile apply` (or
   equivalent) CLI mode with full pre / post
   verification gates and the
   `ReconciliationApplyReport` artefact.
7. **(Post-beta)** Source-write safety review
   slice. Walks the full apply path and
   declares it beta-stable (or surfaces
   remaining blockers).

**The next slice is the watcher / path
freshness policy decision memo**, not the
patch preview artefact, because the beta
blockers must clear in the order the
beta-readiness review listed them.

## Source-Write Boundary

The source-write boundary is the line between
"Rekon describes a fix" and "Rekon writes the
fix to source". Today, **everything Rekon
produces lives on the describe side of that
line.** Apply work — when it ships — crosses
the line under the constraints below.

The boundary applies to:

- **Source-file edits** of any kind (in-place
  patches, codemods, regenerations).
- **File creation** under the operator's
  repository tree.
- **File deletion** (always more dangerous than
  edits; will need its own narrow contract
  when the apply slice lands).

The boundary does **not** apply to:

- **Rekon artifact writes** under
  `.rekon/artifacts/**` — those are how Rekon
  records its own observations; they have
  always been writable by Rekon.
- **Workflow / CI side effects** (Check Run
  bodies, PR comment bodies, job summaries) —
  downstream surfaces, not source.
- **Verification command execution.** The
  verification runner spawns plan commands;
  those commands may themselves write files
  in their own scope, but that is a property
  of the command, not a Rekon source-write.

## Preview Requirement

**Exact diff preview is mandatory before any
source-write apply.**

The preview must include:

- **File path** of every file touched.
- **Operation type** (`create`, `edit`,
  `delete`, `move`, `regenerate`).
- **Before / after content** (or, for
  `create` / `delete`, the absent side
  represented explicitly).
- **Risk classification** (`deterministic` /
  `ambiguous` / `manual-only`) — defined by
  the patch preview slice; this memo only
  reserves the field names.

The preview must be **artifact-backed**: the
operator must be able to fetch the preview
from `.rekon/artifacts/**`, inspect it via
`rekon artifacts show`, validate its digest,
and cite it from a downstream surface (e.g.,
a PR comment body) without re-running
analysis.

**The preview is required even when the
operator is invoking apply themselves.** A
beta-future operator who runs
`rekon reconcile apply --confirm <plan-id>`
must see exactly what would be written
before the writer touches disk.

A preview without an explicit confirmation
**is not an apply**. The CLI surface
(`rekon reconcile preview` or equivalent —
naming is deferred to the implementation
slice) must default to preview-only.

## Operator Confirmation Requirement

**Apply requires an explicit operator
command.** Specifically:

- Apply requires a flag such as `--apply`
  (or `--confirm`, or both) plus a
  confirmation token or plan id.
- **No apply from `refresh`, `publish`,
  `resolve`, `verify`, or `agent-contract
  export`.** Those commands describe; they
  must never write source files.
- **No apply from a non-CLI surface.** The
  GitHub Check publisher, the PR comment
  publisher, and any future hosted surface
  must not trigger an apply directly.
- **No agent-autonomous source writes.** An
  agent reading the agent-contract
  publication may surface a plan to the
  operator; it must never invoke apply on
  the operator's behalf without an explicit
  human-driven CLI command.

The confirmation token / plan id ensures the
apply binds to a specific plan: an operator
cannot accidentally apply a stale plan if the
plan was regenerated after their preview.

## Verification Requirement

**Verification before apply is recommended;
verification after apply is mandatory.**

- **Before apply (recommended).** A
  `VerificationResult` exists, cites the
  current source state, and reports the
  expected baseline. Operators may skip this
  for fast-iteration cases, but the future
  apply CLI should default to running
  pre-apply verification.
- **After apply (mandatory).** A
  `VerificationResult` must be derived from
  a fresh `VerificationRun` against the
  post-apply source state. The apply
  artifact (`ReconciliationApplyReport`)
  must cite that result.
- **Failed post-apply verification leaves
  visible failed proof.** The downstream
  surfaces (proof-report publication, Check
  Run, PR comment) must report `failed` /
  `action_required`. The apply is not
  rolled back automatically just because
  post-verification failed — see the
  Rollback Requirement.
- **A successful apply does not
  automatically resolve findings.** Status
  changes remain explicit artifacts
  (`FindingStatusLedger`,
  `IssueAdjudicationReport`,
  `CoherencyDelta`). The apply changes
  source; the operator (or a separate
  resolver) decides whether that change
  resolves the underlying finding.

## Rollback Requirement

**A rollback / revert strategy must be defined
before the apply implementation ships.** This
memo does not pin the exact mechanism (the
apply permission + rollback design memo will);
it pins the **requirement** and the minimum
shape:

- The apply artifact (`ReconciliationApplyReport`)
  must record either a **reversible patch**
  (e.g., diff with both directions) or a
  **revert plan** (the inverse operation set)
  such that an operator can restore the
  pre-apply state.
- **If rollback cannot be guaranteed for an
  operation class, apply for that class must
  remain manual** in beta and any post-beta
  apply slice.
- The rollback mechanism must work without
  network access (operators may need to
  rollback offline).
- The rollback mechanism must not require
  re-running verification just to roll back
  (verification is run **after** rollback if
  the operator wants to confirm the restored
  baseline).
- Partial-apply states (apply fails halfway
  through a multi-file patch) must roll
  back to the pre-apply state atomically or
  surface the partial state honestly so the
  operator can recover by hand. The apply
  implementation slice picks one; this memo
  forbids silent partial commits.

## Artifact Trail

**Reserved artifact name:
`ReconciliationApplyReport`** (singular
`Report`, not `Log`).

Rationale for the name:

- **Report shape matches one apply run.** Each
  apply produces one report citing one plan +
  one (or two) verification artifacts. An
  append-only ledger naming would imply
  continuous accumulation; we may add a
  separate ledger later if needed, but the
  per-apply report is the right primary
  artifact.
- **Can cite ReconciliationPlan,
  VerificationRun / Result, and the patch
  preview** by id. The chain is end-to-end
  traceable from finding → plan → preview →
  apply → post-verification.
- **Does not preclude a ledger** later
  (`ReconciliationActivityLedger` or
  similar) if real-world apply usage shows
  operators want a cross-run history.

The `ReconciliationApplyReport` artifact will
be **registered** in the apply implementation
slice, not this memo. This memo only reserves
the name + the cited-refs shape.

**Reserved fields the apply report must
include** (informational; the registration
slice can extend):

- `header.inputRefs` cites the
  `ReconciliationPlan`, the patch preview
  artefact, the pre-apply `VerificationResult`
  (if present), and the post-apply
  `VerificationResult`.
- `appliedOperations[]` lists each operation
  with `path`, `operationType`, `digestBefore`,
  `digestAfter`, `status` (`applied` /
  `skipped` / `failed`), `reversiblePatch`
  (or `revertPlan` ref).
- `summary` includes `total`, `applied`,
  `skipped`, `failed`, `verificationStatus`
  (mirrors the post-apply result).
- `confirmation` records the operator command
  + the plan id + the confirmation token (no
  free-text comments; structured fields only).

## Permission Model

**Reserved permission name: `source:write`**
(not `reconcile:apply`).

Rationale:

- **The dangerous boundary is writing source
  files, not merely reconciling artifacts.**
  Rekon already has many capabilities that
  reconcile artifacts (filtering, lifecycle,
  adjudication, coherency); the new boundary
  introduced by apply is the source-file
  writer, not the reconciler.
- **Scope.** A future hosted publisher that
  reconciles artifacts without writing source
  should not need a permission named
  `reconcile:apply`. The clean cut is on the
  source-write side.
- **Discoverability.** Operators reading their
  capability map will see `source:write` and
  immediately understand it permits source
  mutation. `reconcile:apply` would invite
  the question "apply what?".

The `source:write` permission will be
**registered** in the apply permission +
rollback design memo, not this memo. This
memo reserves the name and the SDK conformance
expectation that any capability claiming
`source:write` must:

- Declare it explicitly in the capability
  manifest.
- Surface it in the agent-contract
  Publication's permission list.
- Refuse to perform a source-write if the
  permission is missing from the runtime's
  `permissions` map.
- Refuse to perform a source-write outside
  the CLI surface (see Operator Confirmation
  Requirement).

## What This Does Not Do

This batch **does not**:

- Implement source writes.
- Add `reconcile apply`.
- Add `source:write` permission to the SDK /
  runtime / capability manifest. (Reserved
  by name in this memo; registration is a
  later slice.)
- Add the `ReconciliationApplyReport`
  artifact type to `@rekon/runtime`'s
  category map or `@rekon/sdk`'s
  conformance. (Reserved by name; same
  pattern.)
- Mutate `ReconciliationPlan` behaviour or
  schema.
- Mutate `FindingReport`,
  `FindingLifecycleReport`, `CoherencyDelta`,
  `VerificationRun`, or `VerificationResult`.
- Auto-apply reconciliation operations.
- Auto-resolve findings.
- Add rollback implementation.
- Add patch generation implementation.
- Add GitHub API calls.
- Mutate source files.
- Bump versions. Publish to npm.

The shipped artefacts are: this memo, a docs
test, a review packet, and supporting-doc
cross-references.

## Implementation Sequence

| Step | Slice | Status |
| --- | --- | --- |
| 1 | **Source-write reconciliation policy decision memo (this memo)** | ✅ **Shipped** |
| 2 | [Watcher / path freshness policy decision memo](watcher-path-freshness-policy-decision.md) | ✅ **Shipped** (second beta blocker) |
| 3 | [Beta release readiness checklist memo](beta-release-readiness-checklist.md) | ✅ **Shipped** (third beta blocker) |
| 4 | Beta release candidate execution plan | Next slice — executes checklist on release SHA |
| 5 | Patch preview artefact (post-beta) | Adds exact-diff preview shape to `ReconciliationPlan` or a sibling artefact; apply-blind. **Note (2026-05):** the read-only [Reconciliation preview v1](reconciliation-preview-v1.md) slice has shipped a `rekon reconcile preview` CLI + `buildReconciliationPreview` helper that classifies plan operations and emits a unified diff when forward-compatible `beforeText` + `afterText` match the current file. The [ReconciliationPreviewReport Artifact Decision](reconciliation-preview-report-artifact-decision.md) (Option A — reserve, defer) followed: the `ReconciliationPreviewReport` artifact name is reserved, but no validator / writer / category ships in that slice. The [Plan-Generator Diff Data Discovery](plan-generator-diff-data-discovery.md) recorded that no generator emitted exact patch data yet; the [Reconciliation Exact-Diff Operation v1](reconciliation-exact-diff-operation-v1.md) slice closed that gap by adding the `exact_text_replacement` operation kind with an eight-precondition safety gate. Source-write apply is **still unavailable**; the exact-diff slice ships preview only. Durable preview snapshots remain post-beta and now gated on at least two of: forward-compat plan-generator diff data (now satisfied), a queued / shipped source-write apply slice, a publication or GitHub review surface that needs preview content inline, or operator cohort feedback explicitly asking for persistence. |
| 6 | Apply permission + rollback design memo (post-beta) | Pins `source:write` registration + atomic-apply contract + rollback mechanism |
| 7 | Apply implementation slice (post-beta) | Adds `reconcile apply` (or equivalent) CLI mode + `ReconciliationApplyReport` registration |
| 8 | Source-write safety review (post-beta) | Walks the full apply path end-to-end and declares it beta-stable |

The next four slices (steps 2, 3, 4 + the beta
release) are the remaining beta-blocker work.
Steps 5–8 are the source-write apply roadmap;
they live post-beta unless real-world adoption
signals demand they accelerate.

**Policy diagnostic table:**

| Policy Area | Decision |
| --- | --- |
| Beta source-write apply | deferred |
| Preview | exact diff required |
| Confirmation | explicit operator command required |
| Verification | post-apply mandatory |
| Rollback | required before implementation |
| Artifact trail | ReconciliationApplyReport reserved |
| Permission | source:write reserved |
| Agent autonomy | no autonomous source writes |

**Operation-class diagnostic table:**

| Operation Class | Beta Decision | Notes |
| --- | --- | --- |
| artifact-only reconciliation | allowed | already safe |
| deterministic source patch | preview only | apply deferred |
| generated file creation | preview only | apply deferred |
| command execution | verification runner only | not source apply |
| ambiguous/manual remediation | manual only | no apply |

**Risk diagnostic table:**

| Risk | Guardrail |
| --- | --- |
| corrupting source | preview + explicit confirmation + rollback |
| hidden agent writes | no autonomous source writes |
| failed verification | post-apply VerificationResult required |
| false resolution | no automatic status change |
| irreversible patch | apply forbidden until rollback model exists |

**The next slice is the watcher / path
freshness policy decision memo.** It is the
second of the three beta blockers identified
by the
[beta readiness review](beta-readiness-classic-parity-review.md);
the source-write apply work itself stays
post-beta until the beta blockers + release
execution land.
