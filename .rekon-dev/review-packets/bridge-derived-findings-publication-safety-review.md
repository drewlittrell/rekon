# Review Packet — Bridge-Derived Findings Publication Safety Review

Fifty-fifth slice on the capability-ontology track. Strategy /
safety-review batch. Read-only review; **no runtime behavior
changes**.

## CHANGES MADE

- **New** `docs/strategy/bridge-derived-findings-publication-safety-review.md`
  — the safety-review memo. 12 headings (Decision Summary, Why This
  Review Exists, Publication Surfaces Reviewed, Source Identification
  Review, Read-Only Guarantee, Boundary Statement Review, Agent
  Contract Do Not Do Review, Proof Report Deferral, Options Considered,
  Recommendation, What This Does Not Do, Follow-Up Work). Four tables
  (surface, source-identification, boundary, option). Seven pinned
  statements.
- **New** this review packet.
- **New** `tests/docs/bridge-derived-findings-publication-safety-review.test.mjs`
  — 15 assertions.
- **Updated** cross-reference docs (publication-decision memo, writer
  safety review, finding-report, bridge report artifact + concept,
  finding-lifecycle, graph-aware-finding-filters, coherency-delta,
  remediation-work-orders, work-order, verification-plan, architecture
  summary publication concept + artifact, agent-operating-contract
  concept + agent-contract artifact, proof-report publication concept +
  artifact), plus `roadmap.md`, `classic-behavior-roadmap.md`,
  `README.md`, `CHANGELOG.md`.

## PUBLIC API CHANGES

None. No source files touched. No package exports changed. No CLI
surface changed. No artifact schema changed.

## PURPOSE PRESERVATION CHECK

**Original problem.** Bridge-derived `FindingReport` entries are now
visible in the architecture summary and agent contract. Visibility is
useful but close to lifecycle / remediation language; before lifecycle
/ `CoherencyDelta` integration is designed, Rekon must verify the
surfacing stays read-only and does not imply status, adjudication,
remediation, `WorkOrder`, `VerificationPlan`, or source-write
behavior.

**Does this slice preserve that purpose?** Yes.

- The review confirms bridge-derived `FindingReport` entries and their
  **source provenance** are visible.
- It confirms publications remain **read-only** (no-mutation /
  no-creation contract assertions + clean `artifacts validate`).
- It confirms finding lifecycle, issue adjudication, `CoherencyDelta`,
  and `WorkOrder` / `VerificationPlan` creation all remain
  **downstream**.
- No runtime behavior changed in this slice, so the shipped surfacing
  guarantees are untouched.

## CODEBASE-INTEL ALIGNMENT

- Grounded by re-reading the shipped fifty-fourth slice:
  `buildBridgeDerivedFindingsPublicationSection` (helper),
  `isBridgeDerivedFinding` (predicate), the constants
  (`BRIDGE_DERIVED_FINDING_TYPE` / `_SOURCE` /
  `BRIDGE_DERIVED_FINDINGS_BOUNDARY_LINE` / `_PROOF_DEFERRAL_LINE`),
  the shared `renderBridgeDerivedFindingsSection` wrapper, both
  publisher call sites (heading levels 2 and 3), the agent `Do Not Do`
  reminder, and the manifest (`FindingReport` in `consumes` +
  `bridge-derived-findings.changed` invalidation rule).
- Mirrors the established safety-review pattern (dry-run safety review,
  writer safety review): read-only review, surface/source/boundary/
  option tables, pinned statements, recommend the next decision-only
  slice.

## PUBLICATION SURFACES REVIEWED

| Surface | Status | Boundary |
| --- | --- | --- |
| architecture summary | shipped | read-only operator visibility |
| agent contract | shipped | read-only agent guidance |
| proof report | deferred | governance context is not proof |

## SOURCE IDENTIFICATION REVIEW

`isBridgeDerivedFinding` uses structural signals — `finding.type ===
"capability_architecture_policy"`, `finding.details.source ===
"capability-lint-bridge"`, or any non-empty `finding.details.source*`
trace field — never title text alone. Matches the fifty-first slice
writer's persisted shape. The contract test pins the title-only decoy
is excluded.

## READ-ONLY GUARANTEE

Publication generation reads the latest `FindingReport`, filters
bridge-derived findings, renders the section, cites the report in
`header.inputRefs`. It never runs the bridge writer or bridge-findings
command, never mutates `FindingReport` / `FindingFilterReport` /
`FindingLifecycleReport` / `IssueAdjudicationReport` / `CoherencyDelta`,
and never creates `WorkOrder` / `VerificationPlan`. Proven by the
contract test's before/after index count + digest comparison and clean
`artifacts validate`.

## BOUNDARY STATEMENT REVIEW

Both surfaces render the boundary statement ("Bridge-derived findings
are governed FindingReport entries, not lifecycle status; this
publication does not update lifecycle status, adjudication,
CoherencyDelta, WorkOrders, VerificationPlans, or source files.") on
every section, including the no-findings path. Eight overclaim risks
(lifecycle status, adjudication, CoherencyDelta remediation, WorkOrder
creation, VerificationPlan creation, resolver routing, verification
planning, source-write permission) are each guarded by the boundary
statement + the agent `Do Not Do` reminder.

## AGENT CONTRACT DO NOT DO REVIEW

One verbatim `Do Not Do` reminder covers all eight overclaim risks and
re-pins that lifecycle / `CoherencyDelta` integration remain
downstream. The contract test pins its presence.

## PROOF REPORT DEFERRAL

Proof-report surfacing remains deferred: bridge-derived findings are
governance context (finding provenance), not verification proof. The
proof-report concept + artifact docs carry the explicit "Not a
bridge-derived findings surface" deferral; the helper emits a
proof-deferral line.

## RECOMMENDATION

Bridge-derived findings publication surfacing is **safe / stable as
read-only visibility** — no blocker. **Lifecycle / `CoherencyDelta`
integration decision work may begin** next (decision-only). Defer:
lifecycle implementation, `IssueAdjudicationReport` mutation,
`CoherencyDelta` mutation, `WorkOrder` creation, `VerificationPlan`
creation, resolver routing, verification planning,
`RefactorPreservationContract`, source writes.

## TESTS / VERIFICATION

- New 15-assertion docs test
  `tests/docs/bridge-derived-findings-publication-safety-review.test.mjs`
  passes.
- Full 9-command gate: `npm run typecheck`, `npm run test`,
  `npm run build`, `git diff --check`,
  `node scripts/audit-package-exports.mjs`,
  `node scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`,
  `node scripts/install-smoke.mjs`,
  `node scripts/install-tarball-smoke.mjs`.
- No CLI smoke (strategy-only batch; no runtime behavior changed).

## INTENTIONALLY UNTOUCHED

- All `packages/` source. No helper, publisher, manifest, schema, or
  CLI change.
- The bridge-derived findings publication surfacing behavior
  (fifty-fourth slice).
- `FindingReport`, `FindingFilterReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, `CoherencyDelta`.
- `WorkOrder` / `VerificationPlan`.
- The proof-report publisher (deferral preserved).
- `pnpm-lock.yaml` (left unstaged per workflow).

## RISKS / FOLLOW-UP

- **Risk:** the lifecycle / `CoherencyDelta` integration decision could
  blur the governed-finding-vs-lifecycle boundary this review just
  confirmed. *Mitigation:* that slice is decision-only, and the
  boundary statements + `Do Not Do` reminder remain in force until an
  explicit, separately-reviewed integration ships.
- **Follow-up:** the bridge-derived findings lifecycle /
  `CoherencyDelta` integration decision (decision-only), then its own
  implementation + safety-review slices.

## NEXT STEP

Recommended next slice: **bridge-derived findings lifecycle /
`CoherencyDelta` integration decision** — decide how bridge-derived
`FindingReport` entries should enter `FindingLifecycleReport`,
`IssueAdjudicationReport`, and `CoherencyDelta`. Still no lifecycle
mutation implementation, no `CoherencyDelta` mutation implementation,
no `WorkOrder` / `VerificationPlan` creation, no source writes.
