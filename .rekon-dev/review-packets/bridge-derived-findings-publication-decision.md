# Review Packet — Bridge-Derived Findings Publication Decision

Fifty-third slice on the capability-ontology track. Strategy /
architecture **decision-only** batch. No runtime behavior changes.

## CHANGES MADE

- **New** `docs/strategy/bridge-derived-findings-publication-decision.md`
  — the decision memo. 13 headings (Decision Summary, Why This Decision
  Exists, Current Boundary, Options Considered, Recommendation,
  Publication Model, Source Identification Policy, Citation Policy,
  Governance Boundary, Future Sequence, What This Does Not Do,
  Implementation Sequence — under the `# Bridge-Derived Findings
  Publication Decision` title). Selects **Option B** (architecture
  summary + agent contract first); defers the proof report. Four tables
  (option, surface, boundary, source-identification). Six pinned
  boundary statements.
- **New** `.rekon-dev/review-packets/bridge-derived-findings-publication-decision.md`
  — this packet.
- **New** `tests/docs/bridge-derived-findings-publication-decision.test.mjs`
  — 15 assertions (memo existence + headings + selected decision +
  deferral + 6 pinned statements + 4 tables + CHANGELOG mention +
  review-packet existence/PURPOSE PRESERVATION CHECK).
- **Updated** cross-reference docs (writer safety review, writer mode
  decision, finding-report, bridge report artifact + concept,
  finding-lifecycle, graph-aware-finding-filters, coherency-delta,
  remediation-work-orders, work-order, verification-plan, architecture
  summary publication concept + artifact, agent operating contract
  concept + artifact, proof report publication concept + artifact),
  plus `roadmap.md`, `classic-behavior-roadmap.md`, `README.md`,
  `CHANGELOG.md`.

## PUBLIC API CHANGES

None. No source files touched. No package exports changed. No CLI
surface changed. No artifact schema changed.

## PURPOSE PRESERVATION CHECK

**Original problem.** Bridge-derived `FindingReport` entries can now be
written safely (fifty-first slice writer + fifty-second slice safety
review). Operators and agents need to distinguish bridge-derived
findings from ordinary findings, with provenance, before lifecycle /
`CoherencyDelta` integration — and the surface must not imply lifecycle
status, adjudication, remediation, `WorkOrder`, `VerificationPlan`, or
source-write behavior.

**Does this slice preserve that purpose?** Yes.

- The memo records that bridge-derived findings become **visible and
  traceable** via a dedicated, read-only section on the normal
  operator/agent surfaces (architecture summary + agent contract).
- It pins **provenance** via the `capability_architecture_policy` type
  and `details.source*` trace fields — never title text alone.
- It pins that publication surfacing **mutates nothing** —
  `FindingReport`, `FindingLifecycleReport`, `IssueAdjudicationReport`,
  `CoherencyDelta` are all read-only; no `WorkOrder` / `VerificationPlan`
  creation; no source writes.
- It pins that **lifecycle / `CoherencyDelta` integration remain
  downstream** and that the proof report **defers** bridge-derived
  findings.
- No behavior changed in this slice, so the writer's shipped guarantees
  are untouched.

## CODEBASE-INTEL ALIGNMENT

- Mirrors the established capability-track publication pattern:
  `CapabilityContract`, `CapabilityArchitectureLintReport`, and
  `CapabilityLintFindingBridgeReport` are each surfaced as read-only
  visibility in the architecture summary + agent contract, with the
  proof report deferring each one. This memo extends the same model to
  the writer's **output** (governed bridge-derived findings).
- The source-identification policy was validated against the actual
  fifty-first slice write-mode mapping in `packages/cli/src/index.ts`:
  `type = finding.category` (`capability_architecture_policy`),
  `details = { source: "capability-lint-bridge", sourceBridgeCandidateId,
  sourceLintRowId, sourceContractId, sourcePhraseCapabilityId }`,
  `subjects = [sourceContractId]`, `evidence = evidenceRefs`. The
  signals named in the memo are real, not invented.
- All 19 review-scope docs named in the work order exist; none were
  missing, so no closest-existing substitution was required.

## OPTIONS CONSIDERED

| Option | Decision | Reason |
| --- | --- | --- |
| no special surfacing | rejected/deferred | provenance would be hidden |
| architecture summary + agent contract first | selected | normal operator/agent surfaces |
| proof report too | rejected/deferred | governance context is not proof |
| dedicated publication | deferred | existing surfaces first |
| lifecycle / CoherencyDelta first | rejected | publication visibility before integration |

## PUBLICATION MODEL

Sketch only (not implemented). Architecture summary `## Bridge-Derived
Findings` section / agent contract `### Bridge-Derived Findings`
subsection, each rendering: count, severity distribution, source bridge
report refs, source lint-row / contract / phrase references via finding
`details`, a bounded table (`id`, `title`, `severity`, `source bridge
candidate`, `source lint row`), and an explicit boundary statement.
No-report / no-bridge-derived guidance points operators at the bridge
dry-run / writer flow only if approved.

## SOURCE IDENTIFICATION POLICY

| Signal | Use |
| --- | --- |
| finding.type = capability_architecture_policy | primary category signal |
| sourceBridgeCandidateId | bridge provenance |
| sourceLintRowId | lint-row provenance |
| sourceContractId | contract provenance |
| sourcePhraseCapabilityId | phrase-capability provenance |

Plus the `details.source = "capability-lint-bridge"` marker as an
additional discriminator. Title text is never the sole signal.

## CITATION POLICY

When trace fields exist, cite `FindingReport`,
`CapabilityLintFindingBridgeReport` (if present in `inputRefs` or
`details`), `CapabilityArchitectureLintReport`, `CapabilityContract`,
`CapabilityMap` (each if present), and `EvidenceGraph` via
`evidenceRefs` when already cited/available. If not all refs are
available, show whatever provenance is present and do not invent refs.

## GOVERNANCE BOUNDARY

| Boundary | Decision |
| --- | --- |
| publication vs FindingReport | no mutation |
| publication vs FindingLifecycleReport | no mutation |
| publication vs IssueAdjudicationReport | no mutation |
| publication vs CoherencyDelta | no mutation |
| publication vs WorkOrder | no creation |
| publication vs VerificationPlan | no creation |
| publication vs source files | no writes |

Pinned statements: "Bridge-derived findings are governed FindingReport
entries, not lifecycle status." / "Publication surfacing does not
mutate FindingReport." / "Publication surfacing does not mutate
FindingLifecycleReport, IssueAdjudicationReport, or CoherencyDelta." /
"Publication surfacing does not create WorkOrder or VerificationPlan."
/ "Proof report surfacing remains deferred." / "Lifecycle and
CoherencyDelta integration remain downstream."

## FUTURE SEQUENCE

1. This decision memo.
2. Architecture summary + agent contract surfacing implementation
   (read-only, provenance-bearing).
3. Publication surfacing safety review.
4. Lifecycle / `CoherencyDelta` integration decision — only after
   surfacing is reviewed.

## TESTS / VERIFICATION

- New docs test `tests/docs/bridge-derived-findings-publication-decision.test.mjs`
  (15 assertions) passes.
- Full 9-command gate run before commit: `npm run typecheck`,
  `npm run test`, `npm run build`, `git diff --check`,
  `node scripts/audit-package-exports.mjs`, `node scripts/audit-license.mjs`,
  `node scripts/publish-dry-run.mjs`, `node scripts/install-smoke.mjs`,
  `node scripts/install-tarball-smoke.mjs`.
- No CLI smoke (strategy-only batch; no runtime behavior changed).

## INTENTIONALLY UNTOUCHED

- All `packages/` source. No helper, CLI, schema, or publisher change.
- The `FindingReport` writer (`--confirm-finding-write`) and dry-run
  behavior.
- `FindingFilterReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, `CoherencyDelta`.
- `WorkOrder` / `VerificationPlan`.
- The proof report publisher (bridge-derived deferral preserved).
- `pnpm-lock.yaml` (left unstaged per workflow).

## RISKS / FOLLOW-UP

- **Risk:** the surfacing slice could accidentally read the section as
  lifecycle status. *Mitigation:* the boundary statement and agent-
  contract `Do Not Do` reminder are pinned in this memo and must ship
  verbatim with the implementation.
- **Risk:** filtering by title text would misclassify findings.
  *Mitigation:* the source-identification policy mandates `type` +
  `details.source*` signals, validated against the real writer mapping.
- **Follow-up:** the publication surfacing implementation slice, then
  its safety review, then the lifecycle / `CoherencyDelta` integration
  decision.

## NEXT STEP

Recommended next slice: **Bridge-derived findings publication
surfacing** — surface bridge-derived `FindingReport` entries in the
architecture summary and the agent operating contract (read-only,
provenance-bearing). Still no `FindingLifecycleReport` mutation, no
`IssueAdjudicationReport` mutation, no `CoherencyDelta` mutation, no
`WorkOrder` / `VerificationPlan` creation, no source writes.
