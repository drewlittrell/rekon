# Review Packet — CapabilityMap v2 Publication Surfacing

Product / capability batch. **Thirtieth slice on the
capability-ontology track.** The architecture
summary and agent contract publications now render
the additive `phraseBackedCapabilities` /
`phraseBackedSummary` / `phraseSourceRef`
projection as operator + agent context, gated by
the
[CapabilityMap v2 Safety Review](../../docs/strategy/capability-map-v2-safety-review.md)
(twenty-ninth slice). **Both publication surfaces
are strictly read-only over `CapabilityMap`, every
upstream artifact, and the source tree.** No
`CapabilityMap` mutation. No
`CapabilityPhraseReport` /
`CapabilityNormalizationReport` / `EvidenceGraph`
mutation. No `CapabilityContract`. No resolver
routing by capability. No architecture linting. No
verification planning by capability. No source
writes. No LLM-only inference. No new artifact
type. No new invalidation rule. No npm publish. No
version bump. No git tag. No GitHub Release. No
new branch.

## CHANGES MADE

### New helper

- `packages/capability-docs/src/index.ts` — added
  `buildCapabilityMapV2PublicationSection(input)`
  plus exported structural types
  (`CapabilityMapV2Like`,
  `CapabilityMapV2PhraseBackedLike`,
  `CapabilityMapV2SummaryLike`,
  `BuildCapabilityMapV2PublicationSectionInput`,
  `BuildCapabilityMapV2PublicationSectionResult`).
  Pure function (no I/O, no LLM, no source read).
  Renders the section header
  (`## CapabilityMap v2 Phrase-Backed Capabilities`
  for level 2,
  `### CapabilityMap v2 Phrase-Backed Capabilities`
  for level 3), the `CapabilityMap` ref, the
  `CapabilityPhraseReport` ref
  (`phraseSourceRef`), summary counts (`total`,
  `withDomain`, `withPattern`, `withLayer`),
  optional top-verb / top-noun lines, an explicit
  boundary statement (*"These entries are
  projection context, not CapabilityContract
  placement policy. CapabilityMap v2 does not
  imply placement policy, ownership policy,
  resolver routing, architecture linting,
  verification planning, or source writes."*), a
  proof-report-deferral line, and a bounded
  table (`| Verb | Noun | Domain | Pattern |
  Layer | Evidence |`, capped at 20 rows).

### Producer wiring

- `packages/capability-docs/src/index.ts` —
  architecture-summary publisher now calls
  `renderCapabilityMapV2Section` after the
  existing Capability Phrases section (heading
  level 2). Agent-contract publisher does the
  same at heading level 3, sitting inside the
  operating-state group after the existing
  `### Capability Phrases` subsection.
- The `CapabilityMap` ref is discovered via
  `pickCapabilityMapRefFromHeader(capabilityMap?.header)`
  and passed to the helper for citation rendering.
  `header.inputRefs` already cited the
  `CapabilityMap` (v1 requirement).
- Manifest `consumes` already included
  `CapabilityMap`. The `coherency.changed`
  invalidation rule description was tightened to
  mention the v2 surfacing (the rule already
  triggers on `CapabilityMap` changes).
- Agent contract `AGENT_CONTRACT_DO_NOT_DO`
  extended with a v2-specific reminder
  (*"Do not treat CapabilityMap v2 phrase-backed
  capabilities as CapabilityContract policy,
  resolver routing authority, architecture lint
  findings, verification requirements, or
  source-write permission. CapabilityMap v2
  phrase-backed capabilities are stable capability
  projection; they are not placement policy,
  ownership policy, or source-write authority."*).
  The existing CapabilityPhraseReport Do-Not-Do
  entry was tightened to reflect that v2 has
  shipped (CapabilityContract policy still
  deferred).

### New tests

- **Contract test**
  `tests/contract/capability-map-v2-publications.test.mjs`
  (16 assertions): architecture-summary section
  renders when v2 fields exist, summary counts,
  bounded table (20-row cap), projection-context
  boundary statement, does not duplicate the
  CapabilityPhraseReport table, agent contract
  subsection renders, says "stable capability
  projection", says "not placement policy or
  source-write authority", Do-Not-Do reminder
  covers all five surfaces (CapabilityContract
  policy / resolver routing / architecture lint /
  verification requirements / source-write
  permission), publications do not create or
  mutate `CapabilityMap`, do not mutate
  `CapabilityPhraseReport`, do not mutate
  `CapabilityNormalizationReport`, do not mutate
  `EvidenceGraph`, proof report does not render a
  v2 section, architecture-summary block carries
  the proof-report-deferred pin, artifacts
  validate stays clean.
- **Docs test**
  `tests/docs/capability-map-v2-publications.test.mjs`
  (9 assertions): architecture summary surfacing
  mentioned, agent contract surfacing mentioned,
  proof report surfacing deferred, publications
  read v2 fields, publications do not mutate
  `CapabilityMap`, phrase-backed capabilities are
  projection context (not `CapabilityContract`
  policy), v2 does not imply routing / linting /
  verification / source writes, CHANGELOG
  mentions publication surfacing, review packet
  (this file) carries `PURPOSE PRESERVATION CHECK`.

### Supporting doc updates

- `docs/artifacts/capability-map.md` — new
  `## Publication Surfacing` section with a
  field-to-surface table, boundary statement,
  proof-report-deferral pin, and cross-links to
  both publication artifact docs.
- `docs/artifacts/capability-phrase-report.md` —
  notes v2 has shipped and is now surfaced in
  publications; reaffirms publications never
  mutate `CapabilityMap` or this report.
- `docs/concepts/capability-ontology.md` — Layer
  6 entry mentions the publication surfacing and
  proof-report deferral.
- `docs/concepts/architecture-summary-publication.md`
  — new `## CapabilityMap v2 Surfacing` section
  describes the rendered section.
- `docs/artifacts/architecture-summary-publication.md`
  — Cross-References list extended with a
  detailed v2 publication-surfacing entry.
- `docs/concepts/agent-operating-contract.md` —
  Section Map table gains a `CapabilityMap v2
  Phrase-Backed Capabilities` row.
- `docs/artifacts/agent-contract-publication.md`
  — new `## CapabilityMap v2 Phrase-Backed
  Capabilities` section with the rendered surface
  description, Do-Not-Do reminder verbatim, and
  read-only guarantee.
- `docs/concepts/proof-report-publication.md` —
  `## What This Is Not` list extended with a v2
  surfacing deferral entry.
- `docs/artifacts/proof-report-publication.md` —
  `## What This Is Not` extended likewise.
- `docs/strategy/capability-map-v2-safety-review.md`
  — Follow-Up Work step 1 marked ✅ shipped.
- `docs/strategy/capability-map-v2-high-confidence-decision.md`
  — Implementation Sequence steps 5/6/7 updated
  (step 5 = publication surfacing ✅ shipped; step
  6 = publication safety review = next slice;
  step 7 = post-v2 coverage review = gated).
- `docs/strategy/roadmap.md` — new thirtieth-slice
  entry at the top.
- `docs/strategy/classic-behavior-roadmap.md` —
  new thirtieth-slice entry at the top.
- `README.md` — new comment block at the top of
  the news section.
- `CHANGELOG.md` — new top entry.

## PUBLIC API CHANGES

| Change | Layer | Direction |
| --- | --- | --- |
| `buildCapabilityMapV2PublicationSection` | `@rekon/capability-docs` helper | new export |
| `CapabilityMapV2Like` / `CapabilityMapV2PhraseBackedLike` / `CapabilityMapV2SummaryLike` | `@rekon/capability-docs` types | new exports |
| `BuildCapabilityMapV2PublicationSectionInput` / `BuildCapabilityMapV2PublicationSectionResult` | `@rekon/capability-docs` types | new exports |
| `AGENT_CONTRACT_DO_NOT_DO` reminder line | publication string | additive (no removals) |
| `coherency.changed` invalidation rule description | manifest | wording tightened (`inputs` unchanged) |

No removals. No renames. No changes to
`CapabilityMap` itself (the producer in
`@rekon/capability-model` is unchanged). No
changes to `CapabilityPhraseReport`,
`CapabilityNormalizationReport`, or
`EvidenceGraph`. No new artifact type. No new
invalidation rule.

## PURPOSE PRESERVATION CHECK

- **Architecture summary and agent contract
  surface `CapabilityMap` v2.** Verified by the
  contract test (heading match, summary line
  match, bounded table) and by the CLI smoke
  (the architecture summary and agent contract
  publications generated against the
  `tests/fixtures/js-ts-ast-evidence` fixture
  both contain `CapabilityMap v2 Phrase-Backed
  Capabilities` with 6 stable phrase-backed
  capabilities).
- **Proof report surfacing is deferred.**
  Verified by the contract test
  (`publication.content` for the proof report
  does not match `/CapabilityMap v2
  Phrase-Backed Capabilities/`) and pinned in
  the proof-report concept doc + artifact doc.
- **Publications read `CapabilityMap` v2 fields.**
  The helper's input type
  (`CapabilityMapV2Like`) duck-types exactly the
  three v2 fields plus `header`. The publisher
  reads the latest `CapabilityMap` via
  `readLatestArtifact<CapabilityMap>` (already
  cited in `header.inputRefs`).
- **Publications do not mutate `CapabilityMap`.**
  The helper is pure (no `fs.write*`, no
  `artifacts.write` call). The producer wiring
  uses `await artifacts.read(...)` only. The
  contract test verifies no new `CapabilityMap`
  entries appear in the artifact index and no
  existing `CapabilityMap` digest changes after
  running both publications.
- **Phrase-backed capabilities are projection
  context, not `CapabilityContract` policy.**
  Verified by the boundary statement rendered
  in every section (architecture summary, agent
  contract) and by the absence of any
  `CapabilityContract` artifact / type / helper
  / registration.
- **Phrase-backed capabilities do not imply
  resolver routing, architecture linting,
  verification planning, or source writes.** The
  helper renders the full negative-properties
  list in the boundary statement. The agent
  contract Do-Not-Do reminder restates this with
  the explicit five-surface enumeration
  (`CapabilityContract policy, resolver routing
  authority, architecture lint findings,
  verification requirements, or source-write
  permission`).

### Boundary preservation (negative properties)

- `CapabilityMap` writes — not added. Helper is
  pure; publishers use `artifacts.read` only.
- `CapabilityPhraseReport` writes — not added.
- `CapabilityNormalizationReport` writes — not
  added.
- `EvidenceGraph` writes — not added.
- `CapabilityContract` — not added.
- Resolver routing by capability — not added.
- Architecture linting from `CapabilityMap` v2 —
  not added.
- Verification planning from `CapabilityMap` v2 —
  not added.
- Source writes — not added.
- LLM-only inference — not added.
- New artifact type — not added.
- New invalidation rule — not added (the
  existing `coherency.changed` rule already
  covers `CapabilityMap` changes; description
  tightened but inputs unchanged).
- CLI command additions — none.
- Cross-package dependency from
  `@rekon/capability-docs` to
  `@rekon/capability-ontology` — not added.
  Structural typing keeps the dependency graph
  unchanged.
- npm publish — not done.
- Version bump — not done.
- Git tag — not done.
- GitHub Release — not done.
- New branch — not created.

## CODEBASE-INTEL ALIGNMENT

The publication surfacing preserves Rekon's
classic-parity guarantees:

- **Projection / policy split**: the new
  surfaces render projection only. Policy stays
  with the (future) `CapabilityContract`
  artifact.
- **Read-only publishers**: publishers continue
  to read artifacts and write `Publication`
  artifacts only. They never run CLI commands,
  never mutate source, never touch upstream
  artifacts.
- **Citation chain**: every entry carries
  `phraseRef.report` + `phraseRef.phraseId` plus
  `evidenceRefs[]`. The architecture summary's
  `header.inputRefs` already cites
  `CapabilityMap`; the v2 surfacing reuses that
  citation.
- **Operator visibility before policy**:
  publication surfacing precedes any
  `CapabilityContract` proposal. Operators get
  to see and validate v2 entries before they are
  used to drive policy.

## PUBLICATION SURFACES

| Surface | Heading | Rendered content |
| --- | --- | --- |
| Architecture summary | `## CapabilityMap v2 Phrase-Backed Capabilities` | full surface (refs, summary counts, top verbs / nouns, boundary statement, proof-deferral, bounded table) |
| Agent contract | `### CapabilityMap v2 Phrase-Backed Capabilities` | full surface at level 3, inside operating-state group |
| Proof report | — | **explicitly deferred**; documented in both proof-report docs |
| GitHub Check / PR-comment publishers | — | not modified in this batch; the v2 surfacing is operator-context only |

## READ-ONLY GUARANTEE

Publication generation may:

- read the latest `CapabilityMap`;
- render v2 fields into markdown;
- cite `CapabilityMap` in `header.inputRefs`
  (already a v1 requirement).

Publication generation must not (and does not):

- run `rekon capability phrase project`;
- run `rekon refresh`;
- run `rekon capability ontology normalize`;
- mutate `CapabilityMap`;
- mutate `CapabilityPhraseReport`;
- mutate `CapabilityNormalizationReport`;
- mutate `EvidenceGraph`;
- write source files.

The contract test asserts the no-mutation
properties on every relevant upstream artifact.

## BOUNDARY STATEMENTS

Both rendered surfaces carry the same boundary
statement verbatim:

> These entries are projection context, not
> `CapabilityContract` placement policy.
> `CapabilityMap` v2 does not imply placement
> policy, ownership policy, resolver routing,
> architecture linting, verification planning, or
> source writes.

The agent contract `Do Not Do` reminder reads:

> Do not treat `CapabilityMap` v2 phrase-backed
> capabilities as `CapabilityContract` policy,
> resolver routing authority, architecture lint
> findings, verification requirements, or
> source-write permission. `CapabilityMap` v2
> phrase-backed capabilities are stable
> capability projection; they are not placement
> policy, ownership policy, or source-write
> authority.

## PROOF REPORT DEFERRAL

**Proof-report surfacing of `CapabilityMap` v2 is
deferred.** Rationale:

- `CapabilityMap` v2 is **semantic capability
  projection**, not verification proof.
- The proof report describes `VerificationPlan` /
  `VerificationResult` proof state. Mixing
  semantic projection into the proof report would
  create proof confusion.
- The contract test explicitly verifies that the
  proof report does not render a v2 section. The
  proof-report concept doc + artifact doc both
  document the deferral.

If a future slice surfaces v2 in proof reports,
it will need its own decision memo + safety
review. The current architecture summary + agent
contract surfacing is sufficient operator
visibility for now.

## TESTS / VERIFICATION

- New 16-assertion contract test passes:
  `tests/contract/capability-map-v2-publications.test.mjs`.
- New 9-assertion docs test passes:
  `tests/docs/capability-map-v2-publications.test.mjs`.
- Full test suite passes (no regressions).
- 9-command verification gate passes (typecheck,
  test, build, diff-check,
  audit-package-exports, audit-license,
  publish-dry-run, install-smoke,
  install-tarball-smoke).
- CLI smoke on `tests/fixtures/js-ts-ast-evidence`
  confirms both publications render the v2
  section with 6 phrase-backed capabilities,
  summary counts, top verbs / nouns, boundary
  statement, proof-deferral line, and a bounded
  table; artifacts validate clean.

## INTENTIONALLY UNTOUCHED

- `packages/kernel-repo-model/src/index.ts` —
  `CapabilityMap` type unchanged.
- `packages/capability-model/src/index.ts` —
  producer unchanged.
- `packages/capability-model/src/phrase-backed.ts`
  — helper unchanged.
- `packages/capability-ontology/src/**` — no
  changes.
- All other publishers (proof report, GitHub
  Check, PR comment, etc.) — no v2 surfacing
  added.
- All CLI command surfaces — no new commands, no
  changes to existing commands.
- All artifact types — no additions, no schema
  changes.
- Existing `CapabilityPhraseReport` /
  `CapabilityOntologySuggestionReport` /
  `CapabilityNormalizationReport` surfacing
  sections — unchanged. The new v2 section sits
  alongside, not in place of.

## RISKS / FOLLOW-UP

- **Operator confusion between v1 entries[] and
  v2 phrase-backed entries.** Mitigation: the
  architecture summary already renders both
  sections separately (`Ownership And
  Capabilities` for v1 entries, the new section
  for v2). The boundary statement in the v2
  section is explicit.
- **Section length on large repos.** Mitigation:
  the table is capped at 20 rows; an omission
  count is emitted when truncation occurs.
- **Risk of policy creep.** Mitigation: the
  Do-Not-Do reminder enumerates all five surfaces
  v2 must not drive (`CapabilityContract` policy,
  resolver routing, architecture linting,
  verification requirements, source-write
  permission). The next slice (publication safety
  review) re-audits this boundary.

## NEXT STEP

**`CapabilityMap` v2 publication safety review**
(thirty-first slice). Scope: read-only audit of
the publication surfacing — boundary statements,
read-only guarantee, proof-report deferral,
Do-Not-Do reminder coverage, no upstream-artifact
mutation, no source writes, no CLI command
execution.

After the publication safety review:
post-`CapabilityMap`-v2 coverage review
(measuring phrase-backed entry quality on the
cohort + fixture now that operators can see the
output).
