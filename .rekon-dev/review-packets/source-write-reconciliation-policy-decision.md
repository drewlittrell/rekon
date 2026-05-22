# Review Packet — Source-Write Reconciliation Policy Decision Memo

**Slice:** `source-write-reconciliation-policy-decision`
**Sequence position:** First of three beta blockers
identified by the
[Beta Readiness / Remaining Classic-Parity Review](../../docs/strategy/beta-readiness-classic-parity-review.md).
**Batch type:** Strategy / docs / tests only. **No runtime
behaviour change.** No new package, no new CLI command, no
new helper, no workflow-template change, no validator
profile change, no GitHub API call, no source-file
mutation, no artifact-type registration, no permission
registration.

## CHANGES MADE

1. **New strategy memo** at
   [`docs/strategy/source-write-reconciliation-policy-decision.md`](../../docs/strategy/source-write-reconciliation-policy-decision.md).
   Pins the source-write boundary for beta: **Option C —
   beta pins the policy + preview requirements; the
   actual apply implementation remains deferred
   post-beta.** Contains all 16 required headings
   (Decision Summary, Why This Decision Exists, Current
   Reconciliation Model, Classic Goal Reviewed, Options
   Considered, Recommendation, Source-Write Boundary,
   Preview Requirement, Operator Confirmation
   Requirement, Verification Requirement, Rollback
   Requirement, Artifact Trail, Permission Model, What
   This Does Not Do, Implementation Sequence), the four
   pinned reminder statements, three diagnostic tables
   (policy, operation-class, risk), and explicit
   reservation of the `ReconciliationApplyReport`
   artifact name + `source:write` permission name.
2. **New docs test** at
   `tests/docs/source-write-reconciliation-policy-decision.test.mjs`
   pinning the 18 required assertions (memo existence,
   all 16 required headings present, four pinned
   reminder statements verbatim, three diagnostic
   tables present, Option C recommended, reserved
   artifact name, reserved permission name,
   implementation sequence ordering, CHANGELOG
   mention, review-packet PURPOSE PRESERVATION CHECK).
3. **Cross-doc updates:**
   - [`docs/strategy/beta-readiness-classic-parity-review.md`](../../docs/strategy/beta-readiness-classic-parity-review.md)
     marks the source-write reconciliation policy
     blocker as resolved + points to this memo.
   - [`docs/strategy/issue-governance-architecture-decision.md`](../../docs/strategy/issue-governance-architecture-decision.md)
     adds step 62 (source-write reconciliation policy
     memo shipped).
   - [`docs/strategy/classic-behavior-roadmap.md`](../../docs/strategy/classic-behavior-roadmap.md)
     gains a "Shipped" entry for the source-write
     reconciliation policy decision memo + points to
     the watcher / path freshness decision memo as
     the next slice.
   - [`docs/strategy/roadmap.md`](../../docs/strategy/roadmap.md)
     gains a new completed-slice entry.
   - [`docs/strategy/classic-guarantees-audit.md`](../../docs/strategy/classic-guarantees-audit.md)
     adds the source-write reconciliation policy
     memo pointer.
   - [`docs/strategy/classic-alignment-map.md`](../../docs/strategy/classic-alignment-map.md)
     adds the source-write reconciliation policy
     memo pointer.
   - [`docs/concepts/reconciliation-plans.md`](../../docs/concepts/reconciliation-plans.md)
     adds the policy memo to its Cross-References.
   - [`docs/artifacts/reconciliation-plan.md`](../../docs/artifacts/reconciliation-plan.md)
     adds the policy memo to its Cross-References.
   - [`docs/concepts/proof-report-publication.md`](../../docs/concepts/proof-report-publication.md)
     adds the policy memo pointer (proof surfaces are
     affected by the post-apply verification
     requirement).
   - [`docs/concepts/verification-runs.md`](../../docs/concepts/verification-runs.md)
     adds the policy memo pointer (post-apply
     verification is mandatory under the policy).
4. **README + CHANGELOG entries.**

All 10 listed supporting docs exist in the repository;
none were skipped. The verification step that confirmed
this is documented in the implementation notes (no
missing-doc entry needed).

## PUBLIC API CHANGES

- **None.** This is a strategy / docs / tests batch.
- No new exports from `@rekon/capability-docs`,
  `@rekon/capability-verify`, `@rekon/sdk`,
  `@rekon/runtime`, or any other package.
- No new CLI command, no new CLI flag.
- No new validator profile, no new issue code.
- No new workflow template.
- No new artifact type. (`ReconciliationApplyReport`
  is **reserved by name** in this memo + the docs
  test; the actual artifact registration is a
  follow-on slice.)
- No new capability package.
- No new role / permission. (`source:write` is
  **reserved by name** in this memo + the docs test;
  the actual permission registration is a follow-on
  slice.)

## PURPOSE PRESERVATION CHECK

The memo is informational + policy-pinning; it preserves
every existing invariant:

- **Verification runner v1 purpose.** Unchanged.
- **VerificationPlan / VerificationRun /
  VerificationResult schemas.** Unchanged.
- **ReconciliationPlan artifact + concept.** Unchanged.
  The memo pins the existing preview-only posture as
  the beta default; it does not modify the artifact
  shape, the concept doc's runtime contract, or any
  consumer.
- **Proof-report / architecture-summary / agent-contract
  Publications.** Unchanged.
- **GitHub Check publisher + PR comment publisher.**
  Unchanged.
- **All four workflow templates.** Unchanged.
- **All three validator profiles.** Unchanged.
- **Canonical-truth invariant.** Reinforced. A future
  apply must cite artifacts; downstream surfaces remain
  non-canonical.
- **Marker-not-proof invariant.** Unchanged.
- **Fork-safety invariant.** Unchanged.
- **No-auto-resolution invariant.** **Reinforced.** The
  memo explicitly pins `A successful apply must not
  automatically resolve findings; lifecycle / status
  updates remain explicit artifacts.`
- **No-token-leak invariant.** Unchanged.
- **No agent-autonomous source writes.** **Pinned**
  by this memo as a future-apply invariant.
- **No new policy decisions outside the scope of this
  memo.** The memo intentionally defers the patch
  preview shape, the apply permission registration,
  and the rollback mechanism to follow-on slices.

## CODEBASE-INTEL ALIGNMENT

- **Classic goal reviewed and preserved at the policy
  level.** `codebase-intel-classic`'s `PlanExecutorService`
  could execute reconciliation operations against the
  source tree under operator-defined policies. The useful
  guarantee was "controlled movement from diagnosis to
  safe remediation with traceability." The memo
  preserves that guarantee as the **future apply
  contract**: artifact-backed traceability, operator
  intent, verification authority, no silent
  auto-resolution, permissioned capability.
- **Classic posture honoured at the boundary.** The
  source-write boundary itself is pinned for beta:
  Rekon describes; an explicit operator command (in a
  later slice) is the only path that may cross into
  source writes.
- **Capability model:** unchanged. The memo reserves
  `source:write` as the permission name for the
  future apply slice; the SDK / runtime do not change
  here.
- **Conformance:** unchanged.

## OPTIONS CONSIDERED

Four options analysed in the memo:

| Option | Posture | Verdict |
| --- | --- | --- |
| A | No source-write apply in beta | Acceptable as strict default; rejected standalone because it leaves policy ambiguous |
| B | Deterministic narrow apply (codemod / template) | Rejected for beta; reconsider post-beta after Option C lands |
| C | Preview-first beta, apply post-beta | **Recommended** |
| D | Full apply with verification gates | Rejected for beta; highest risk; reconsider after B ships |

Option C preserves the safety properties of A while
giving the beta product a pinned policy boundary
operators (and agents reading this codebase) can rely
on.

## RECOMMENDATION

**Option C.** Ship this decision memo + the docs test
that pins it. Defer the patch-preview artefact, the
apply permission + rollback design, and the apply
implementation to follow-on slices, each with its own
decision memo + safety review.

The next four pre-beta slices, in order:

1. **Watcher / path freshness policy decision memo.**
   Second beta blocker.
2. **Beta release readiness checklist.** Third beta
   blocker.
3. **Beta release execution.** Final pre-beta slice.

The four post-beta source-write apply slices, in order:

4. **Patch preview artefact slice.** Adds exact-diff
   preview to `ReconciliationPlan` (or sibling
   artefact); apply-blind.
5. **Apply permission + rollback design memo.** Pins
   `source:write` registration + atomic-apply contract
   + rollback mechanism.
6. **Apply implementation slice.** Adds `reconcile
   apply` (or equivalent) CLI mode +
   `ReconciliationApplyReport` registration.
7. **Source-write safety review slice.** Walks the
   full apply path and declares it beta-stable.

## POLICY DECISIONS

The eight policy decisions pinned by the memo:

| Policy Area | Decision |
| --- | --- |
| Beta source-write apply | deferred |
| Preview | exact diff required |
| Confirmation | explicit operator command required |
| Verification | post-apply mandatory |
| Rollback | required before implementation |
| Artifact trail | `ReconciliationApplyReport` reserved |
| Permission | `source:write` reserved |
| Agent autonomy | no autonomous source writes |

The five operation-class decisions:

| Operation Class | Beta Decision |
| --- | --- |
| artifact-only reconciliation | allowed (already safe) |
| deterministic source patch | preview only |
| generated file creation | preview only |
| command execution | verification runner only |
| ambiguous / manual remediation | manual only |

The five risk guardrails:

| Risk | Guardrail |
| --- | --- |
| corrupting source | preview + confirmation + rollback |
| hidden agent writes | no autonomous source writes |
| failed verification | post-apply VerificationResult required |
| false resolution | no automatic status change |
| irreversible patch | apply forbidden until rollback model exists |

## BETA IMPACT

- **Beta source-write apply path:** unchanged
  (preview-only).
- **`ReconciliationPlan` behaviour:** unchanged.
- **`resolve.issue` resolver behaviour:** unchanged.
- **Verification runner behaviour:** unchanged.
- **Proof report behaviour:** unchanged.
- **GitHub Check / PR comment publisher behaviour:**
  unchanged.
- **Permission map / SDK conformance:** unchanged.
- **Operator-facing CLI surface:** unchanged.
- **Documentation:** the source-write boundary is now
  pinned. Operators reading the docs in the order
  Beta Readiness → Source-Write Policy → Reconciliation
  Plans now see the same answer at every level.
- **Beta blocker count:** one blocker resolved
  (source-write reconciliation policy). Two blockers
  remain (watcher / path freshness, release
  readiness checklist).

## TESTS / VERIFICATION

- **New docs suite:**
  `tests/docs/source-write-reconciliation-policy-decision.test.mjs`
  — 18 assertions, all passing.
- **Existing suites still passing:** every prior
  contract / docs suite. Full suite expected ≥ 1605
  passed / 1 skipped (1587 prior + 18 new).
- **Audits / smokes:** package-exports, license,
  publish-dry-run, install-smoke,
  install-tarball-smoke — all expected to pass
  unchanged.
- **No CLI smoke required.** Strategy-only batch.

## INTENTIONALLY UNTOUCHED

- `packages/capability-docs/src/index.ts` — unchanged.
- `packages/capability-verify/src/index.ts` —
  unchanged.
- `packages/cli/src/index.ts` — unchanged.
- `@rekon/sdk` conformance — unchanged (no
  `source:write` registration in this batch).
- `@rekon/runtime` artifact category map — unchanged
  (no `ReconciliationApplyReport` registration in
  this batch).
- `@rekon/kernel-*` — unchanged.
- `ReconciliationPlan` artifact schema + concept doc
  runtime contract — unchanged.
- All four workflow templates — unchanged.
- All three validator profiles — unchanged.
- All existing contract tests — unchanged.
- `.github/workflows/*.yml` in the Rekon repo —
  unchanged (still empty).

## RISKS / FOLLOW-UP

- **Risk: memo drifts from product reality before
  the patch-preview + apply slices land.** Mitigated
  by the docs test pinning the four pinned reminder
  statements, the reserved names, the policy /
  operation / risk tables, and the implementation
  sequence ordering.
- **Risk: a future contributor implements `reconcile
  apply` before the permission + rollback design
  memo lands.** Mitigated by the docs test pinning
  the implementation sequence ordering (steps 4 → 5
  → 6 → 7, with watcher / release work in between).
- **Risk: an agent reads the memo and tries to
  apply source writes autonomously.** Mitigated by
  the verbatim `No agent-autonomous source writes.`
  statement, pinned by the docs test and surfaced in
  every cross-referenced doc.
- **Risk: name collisions.** Reserved
  `ReconciliationApplyReport` and `source:write` are
  defensive reservations; they do not register
  themselves with the SDK / runtime, so an
  out-of-band batch could theoretically use the
  names for something else. Mitigated by the docs
  test pinning both names in this memo.
- **Follow-up — Watcher / path freshness policy
  decision memo (next slice).** Second beta blocker.
- **Follow-up — Beta release readiness checklist
  (after).** Third beta blocker.
- **Follow-up — Beta release execution.** Final
  pre-beta slice.
- **Follow-up (post-beta) — Patch preview artefact
  slice.** Adds the exact-diff preview shape; still
  apply-blind.
- **Follow-up (post-beta) — Apply permission +
  rollback design memo.** Pins `source:write`
  registration + atomic-apply contract + rollback
  mechanism.
- **Follow-up (post-beta) — Apply implementation
  slice.** Adds `reconcile apply` +
  `ReconciliationApplyReport` registration.
- **Follow-up (post-beta) — Source-write safety
  review slice.** Declares the apply path
  beta-stable (or surfaces remaining blockers).

## NEXT STEP

**Watcher / path freshness policy decision memo.**

Pin the operator-facing freshness contract for beta:

- Freshness is visible everywhere it matters.
- Stale artifacts never present as fresh.
- Operators have an explicit refresh command and
  explicit refusal options.
- No silent re-derivation behind the operator's
  back.

This is the second of the three beta blockers
identified by the
[Beta Readiness / Remaining Classic-Parity Review](../../docs/strategy/beta-readiness-classic-parity-review.md).
