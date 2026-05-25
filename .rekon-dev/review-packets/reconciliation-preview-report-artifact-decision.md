# Review Packet — ReconciliationPreviewReport Artifact Decision

**Slice:** `reconciliation-preview-report-artifact-decision`
**Batch type:** Strategy / docs / tests only.
**Sequence position:** First decision slice
after
[Reconciliation Preview v1](../../docs/strategy/reconciliation-preview-v1.md)
shipped on `b127d08`.
**Decision:** **Option A — reserve the
`ReconciliationPreviewReport` artifact name;
defer registration.** No artifact type ships,
no validator ships, no writer ships, no
category map change, no runtime behaviour
change.
**Strict no-go list:** no
`ReconciliationPreviewReport` registration,
no new validator, no new writer, no new
artifact category, no new permission, no
new role, no new CLI command, no
modification of
`buildReconciliationPreview`, no
modification of `rekon reconcile preview`,
no modification of `ReconciliationPlan`
shape, no source-write apply, no
`source:write` permission registration, no
`ReconciliationApplyReport` registration,
no GitHub API call, no workflow YAML, no
`package.json` / `package-lock.json`
mutation, no source-file mutation in any
`packages/*/src/*`, no npm publish, no
version bump, no git tag, no GitHub
Release, no new branch, no network I/O.

## CHANGES MADE

1. **New strategy memo
   `docs/strategy/reconciliation-preview-report-artifact-decision.md`**
   recording Option A with Decision Summary,
   Why This Decision Exists, Current State,
   Options Considered (A/B/C), Recommendation,
   Conditions For Future Registration,
   Reserved Vocabulary, What This Decision
   Does Not Do, Cross-References, Status,
   Follow-Up.
2. **New review packet (this file)** with
   PURPOSE PRESERVATION CHECK + all 11
   required sections.
3. **New docs test
   `tests/docs/reconciliation-preview-report-artifact-decision.test.mjs`**
   with 17 assertions covering: memo
   existence + required headings; the five
   verbatim pins
   (`ReconciliationPreviewReport is not
   registered as a Rekon artifact in this
   slice.`, `The artifact name
   ReconciliationPreviewReport is
   reserved.`, `No
   ReconciliationPreviewReport validator,
   writer, or category is added.`,
   `Reconciliation Preview v1 remains a
   read-only, in-memory projection of
   ReconciliationPlan.`, `Source-write
   apply remains unavailable.`); options
   considered (A/B/C); the four future
   registration conditions; reserved
   vocabulary table; cross-links;
   CHANGELOG mention; review packet
   exists with PURPOSE PRESERVATION
   CHECK + all 11 required headings.
4. **Supporting doc updates:**
   `docs/strategy/reconciliation-preview-v1.md`
   *Follow-Up* section pinned to this
   decision; `docs/concepts/reconciliation-preview.md`
   *See Also* cross-link added;
   `docs/strategy/source-write-reconciliation-policy-decision.md`
   step 5a row notes this decision;
   `docs/concepts/reconciliation-plans.md`,
   `docs/artifacts/reconciliation-plan.md`
   cross-link the decision; `docs/strategy/roadmap.md`
   + `docs/strategy/classic-behavior-roadmap.md`
   list the slice; `README.md` +
   `CHANGELOG.md` updated.

## PUBLIC API CHANGES

**None.** No new type added, removed,
renamed, narrowed, or exported. No CLI
surface added or modified. No runtime
behaviour change. No schema change. No new
artifact type. No new permission. No new
role. No workflow YAML installed. No
`package.json` mutation in any workspace.

`@rekon/capability-reconcile` exports +
the `rekon reconcile preview` CLI shipped
in the previous batch are **unchanged**.

## PURPOSE PRESERVATION CHECK

Original product question (from the
Reconciliation Preview v1 memo's
Follow-Up): *"Should previews become
durable artifacts before any source-write
apply path exists?"*

This memo answers that question
explicitly:

- **No, not yet.** Without a downstream
  consumer (apply path, publication, real
  plan-generator diff data, or operator
  cohort feedback), persisting previews
  buys nothing concrete today.
- **The name is reserved.** Future slices
  can land cleanly under the
  `ReconciliationPreviewReport` name
  without re-decision overhead.
- **The conditions for future
  registration are explicit.** A future
  registration slice has four named
  signals to check against; at least
  two must fire before registration is
  worth doing.

Source-write policy preserved verbatim:

- *"Source-write apply remains
  unavailable."* — pinned in this
  decision memo + asserted by docs test.
- The
  [Source-Write Reconciliation Policy
  Decision](../../docs/strategy/source-write-reconciliation-policy-decision.md)
  remains the canonical source-write
  contract. `source:write` permission
  remains reserved. `ReconciliationApplyReport`
  remains reserved. `rekon reconcile
  apply` remains unimplemented.

Reconciliation Preview v1's read-only
guarantees preserved:

- *"Reconciliation Preview v1 remains a
  read-only, in-memory projection of
  ReconciliationPlan."* — pinned in this
  decision memo + asserted by docs test.

## CODEBASE-INTEL ALIGNMENT

- **No code change in any
  `packages/*/src/`.** This is a strategy /
  docs / tests-only batch.
- **No CLI surface change.** `rekon
  reconcile preview` continues to write no
  artifacts.
- **No artifact registry change.** The
  artifact category map, the kernel-side
  artifact registration list, and the
  runtime's index validator are all
  untouched.
- **No new freshness surface.** Operators
  already learned the existing triplet
  (`paths freshness` /
  `artifacts freshness` /
  `artifacts validate`) from the v2
  quickstart refinements; this decision
  pins that no fourth surface lands now.
- **Reservation is documentation, not
  code.** Reserved names live in this
  memo + the cross-linked docs; no
  exported identifier prevents future use.

## DECISION MODEL

| Surface | Today | After this decision | After future registration (if/when conditions met) |
| --- | --- | --- | --- |
| `ReconciliationPreviewReport` artifact type | not registered | **still not registered** (name reserved) | registered |
| `buildReconciliationPreview` helper | in-memory only | unchanged | extended writer helper added in parallel |
| `rekon reconcile preview` CLI | writes no artifacts | unchanged | writes `ReconciliationPreviewReport` (default-on or opt-in, decided in registration slice) |
| Freshness model | three surfaces | unchanged | adds a fourth surface (artifact lineage for previews) |
| Source-write apply | unavailable | **still unavailable** | **still unavailable** unless a separate apply slice ships in parallel |

## RESERVED VOCABULARY

The memo reserves four name shapes:

1. `ReconciliationPreviewReport` — the
   future durable preview artifact type.
2. `@rekon/capability-reconcile`
   `writeReconciliationPreviewReport`
   (or equivalent) — the future writer
   helper.
3. `rekon reconcile preview --write`
   (or default-on equivalent, decided
   in registration slice) — the future
   opt-in / default-on persistence
   flag.
4. `ReconciliationPreviewReport`
   freshness checks — future entries
   in the artifacts-freshness
   validator.

These are documentation reservations only.
No exported identifier ships; no code
collision is prevented by anything except
review hygiene.

## CONDITIONS FOR FUTURE REGISTRATION

`ReconciliationPreviewReport` becomes
worth registering when at least two of:

1. A plan generator emits forward-compat
   `beforeText` + `afterText` for at
   least one real operation class.
2. A source-write apply slice is queued
   or shipped (and needs a durable
   preview to cite).
3. A publication or GitHub review
   surface needs the preview body as
   structured input.
4. Operator cohort feedback explicitly
   asks for durable previews.

The registration slice (if/when it
lands) ships:

- artifact type registration (kernel +
  SDK + runtime + conformance harness),
- validator + writer in
  `@rekon/capability-reconcile`,
- CLI flag / default-on persistence
  (decision in that slice),
- freshness semantics (does the report
  go stale when the plan changes, the
  source changes, or both?),
- artifact-category map update,
- updated docs + tests + review packet.

That slice MUST explicitly re-affirm
the source-write boundary.

## TESTS / VERIFICATION

- `tests/docs/reconciliation-preview-report-artifact-decision.test.mjs`
  — 17 assertions covering memo
  existence, required headings, all
  five verbatim pins, options
  considered, future-registration
  conditions, reserved vocabulary,
  cross-links, CHANGELOG mention, and
  the review packet.
- **Full 9-command verification gate**
  ran on `b127d08` before edits + again
  after edits.
- **No new contract test required** —
  no new helper, CLI, validator, or
  publisher in this batch.
- **No CLI smoke required** — docs /
  decision only.

## INTENTIONALLY UNTOUCHED

- `packages/*/src/*` — no source change
  in any workspace.
- `packages/cli/src/*` — no new CLI
  command, no new flag.
- `packages/capability-reconcile/src/*` —
  helper + types unchanged.
- `packages/kernel-*/src/*` — no schema
  change, no validator change.
- `packages/runtime/src/*` — no
  artifact category, no freshness
  validator change.
- `packages/sdk/src/*` — no conformance
  harness change.
- The artifact registry — no entry
  added, no entry renamed.
- The permission model — no permission
  added, no role added.
- `.github/workflows/*.yml` — no
  active workflow installed.
- Any `package.json`,
  `package-lock.json`, or
  `tsconfig.json` — no dependency
  change, no version bump.
- `ReconciliationPlan` artifact shape
  + writer behaviour — unchanged.
- `ReconciliationApplyReport`
  reservation (from the source-write
  policy decision) — unchanged; still
  reserved, still not shipped.
- `rekon reconcile preview` /
  `rekon reconcile suggest` /
  `rekon reconcile` CLI commands —
  unchanged.

## RISKS / FOLLOW-UP

**Risks (all low):**

- *Reservation drift.* If the four
  reserved name shapes get used for
  something else in the future, the
  registration slice would either
  collide or have to rename.
  Mitigation: review packet + docs test
  pin the reserved vocabulary
  explicitly.
- *Decision goes stale.* Real product
  signals may arrive before the next
  reconciliation slice is scheduled.
  Mitigation: the *Conditions For
  Future Registration* list is short
  and concrete; any contributor can
  flip the decision by writing a
  follow-up memo when ≥ 2 conditions
  fire.

**Follow-up:** none from this slice
itself. The next reconciliation slice
is gated on the *Conditions For Future
Registration*; until at least two
fire, the reconciliation track sits
at the v1 preview surface.

## NEXT STEP

The reconciliation track is now at a
**deliberate pause point**. The next
useful product slice will most likely be
one of:

1. *Plan-generator diff data slice* —
   wire forward-compat `beforeText` +
   `afterText` into one or more
   deterministic plan operations (e.g.,
   `docs_regeneration` with known
   generator output). This lights up the
   helper's diff branch against real
   plans and triggers condition #1
   above.
2. *Apply permission + rollback design
   memo* — the next source-write track
   slice (per the source-write policy
   decision's step 6). This would trigger
   condition #2 above and naturally
   drag the registration slice along
   with it.
3. *Publication / review surface that
   consumes preview content* — if a
   downstream publication or GitHub
   review surface decides previews
   belong inline, that triggers
   condition #3.
4. *Operator cohort onboarding* — if
   operator cohort feedback explicitly
   asks for durable previews, that
   triggers condition #4.

The next slice can be picked from any
of these depending on which product
signal arrives first.
