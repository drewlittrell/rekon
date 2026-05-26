# Review Packet: Capability Ontology Suggestion Safety Review

**Slice:** Strategy / safety-review batch (gate before any
new mutation path on the capability-ontology track).
**Status:** Implemented. Ready for review.
**Owning surface:** `docs/strategy/capability-ontology-suggestion-safety-review.md`.
**Decision lineage:** [Architecture Impact
Review](../../docs/strategy/capability-ontology-architecture-impact-review.md)
→ [Translation Layer
Decision](../../docs/strategy/capability-ontology-translation-layer-decision.md)
→ [`CapabilityNormalizationReport`
v1](../../docs/artifacts/capability-normalization-report.md)
→ [Built-In Baseline Ontology Coverage
Review](../../docs/strategy/builtin-ontology-coverage-review.md)
→ [`CapabilityNormalizationReviewLedger`
v1](../../docs/artifacts/capability-normalization-review-ledger.md)
→ [`CapabilityOntologySuggestionReport`
v1](../../docs/artifacts/capability-ontology-suggestion-report.md)
→ [Suggestion publication surfacing
](../../docs/artifacts/capability-ontology-suggestion-report.md)
→ **this memo**.

## CHANGES MADE

- New strategy memo
  `docs/strategy/capability-ontology-suggestion-safety-review.md`
  covering the full `normalize → review → suggest →
  publish` loop. Includes the decision summary, the three
  required diagnostic tables (workflow / option / risk),
  the explicit verbatim mutation-boundary statements, and
  the proof report + `CapabilityMap` deferral pins.
- New 14-assertion docs test
  `tests/docs/capability-ontology-suggestion-safety-review.test.mjs`.
- This review packet.
- Cross-link updates to: concept doc, three artifact
  references, two strategy memos, roadmap,
  classic-behavior roadmap, README, and CHANGELOG.

## PUBLIC API CHANGES

None.

- No package exports added or removed.
- No artifact type registered.
- No CLI command added or removed.
- No SDK / runtime change.
- No publisher behavior change.
- No `tsconfig` change.
- No `package.json` change to any workspace package.

## PURPOSE PRESERVATION CHECK

This memo is the safety gate before any new mutation path
ships on the capability-ontology track. It preserves the
product guarantees verbatim:

- `EvidenceGraph` raw facts remain unchanged.
- `CapabilityNormalizationReport` remains audit-only.
- `CapabilityNormalizationReviewLedger` remains append-only
  and never mutates the report it cites.
- `CapabilityOntologySuggestionReport` remains preview-only
  and never mutates `.rekon/capability-ontology.json`.
- Publication surfacing remains read-only and never mutates
  the suggestion report, the ledger, the config, or
  `CapabilityMap`.
- Suggestion entries are not applied vocabulary.
- The layered ontology model is preserved — "do not flatten
  the ontology into a single config / report layer."
- Source-write apply remains unavailable.

## CODEBASE-INTEL ALIGNMENT

- Matches classic `codebase-intel`'s preview-first
  reconciliation policy. Applying the policy to ontology
  vocabulary keeps the source-write trust boundary
  consistent across reconciliation and ontology tracks.
- Avoids the failure mode the architecture impact review
  identified: a monolithic ontology validator would create
  hidden semantic truth. Splitting the workflow across
  six layered artifacts keeps every claim auditable.
- Preserves the architecture impact review's "no port of
  the monolithic `GraphOntologyValidator`" pin.

## WORKFLOW REVIEWED

The end-to-end operator path:

```text
rekon refresh
  → EvidenceGraph
rekon capability ontology normalize
  → CapabilityNormalizationReport
rekon capability ontology review suggestions
  → (read-only aggregator)
rekon capability ontology review decide
  → CapabilityNormalizationReviewLedger (append-only)
rekon capability ontology review decisions
  → (read-only listing)
rekon capability ontology suggestions
  → CapabilityOntologySuggestionReport (preview-only)
rekon publish architecture
rekon publish agent-contract
  → Publications (read-only surface of the report)
```

Every step has contract + docs test coverage pinning the
read-only guarantees against ontology config,
`CapabilityMap`, the upstream artifacts, and `EvidenceGraph`.

## MUTATION BOUNDARY

- No step in the loop writes `.rekon/capability-ontology.json`.
- No step in the loop writes `CapabilityMap`.
- No step writes `EvidenceGraph`.
- No step writes source files.
- The only mutation channel is the operator's hand on
  `.rekon/capability-ontology.json` — Rekon never opens that
  file for writing.

Contract tests already pin this. The memo records it as an
explicit strategy decision so any future apply-command
proposal must go through its own decision memo + safety
review.

## PUBLICATION SURFACING

- Architecture summary section `## Capability Ontology
  Suggestions` always renders the `Preview-only.` callout
  and the `Config path: .rekon/capability-ontology.json`
  line.
- Agent contract `### Capability Ontology Suggestions`
  subsection mirrors the same content at heading level 3.
- Agent contract `Do Not Do` adds: *"Do not treat
  `CapabilityOntologySuggestionReport` entries as applied
  ontology config."*.
- Both publishers cite the source suggestion report in
  `header.inputRefs`.
- Bounded suggestion + skipped tables keep publication size
  predictable.

Risk that publications imply suggestions are applied: low.
The `Preview-only.` line, the agent contract `Do Not Do`,
and the explicit config-path callout are layered guardrails.

## PROOF REPORT DEFERRAL

Proof report surfacing is **deliberately deferred**.

Rationale: ontology suggestions are operator vocabulary /
config proposals, not verification proof. Adding them to
the proof report would risk implying the suggestion report
contributes to pass / fail.

The deferral is pinned in:

- `docs/concepts/proof-report-publication.md`
- `docs/artifacts/proof-report-publication.md`
- `docs/artifacts/capability-ontology-suggestion-report.md`

Re-evaluate only when a natural ontology / context section
exists for the proof report.

## RECOMMENDATION

- The suggestion workflow is **safe and stable** as a
  preview-only loop.
- **Manual editing of `.rekon/capability-ontology.json`
  remains the operator-control boundary for now.**
- **Do not add an operator-approved config apply command
  in this batch.** Treat operator friction in the next docs
  quickstart as the gate for a future apply-command
  decision memo. Any future apply implementation must
  ship behind an explicit confirmation token + pre / post
  config diff artifact + its own safety review.
- **Next slice:** *capability ontology config authoring
  guide + review-loop quickstart* (docs-only). Walks
  operators through the full manual path.

## TESTS / VERIFICATION

- 9-command pre-validation gate passed on `4453dff` before
  this batch began.
- New 14-assertion docs test passing locally:
  `tests/docs/capability-ontology-suggestion-safety-review.test.mjs`.
- Full 9-command verification gate to be re-run before
  merge.
- No CLI smoke required — strategy / docs / tests only.

## INTENTIONALLY UNTOUCHED

- Built-in ontology vocabulary in
  `packages/capability-ontology/src/index.ts`.
- Lexical splitter, candidate extractor, normalizer.
- `CapabilityNormalizationReport`,
  `CapabilityNormalizationReviewLedger`, and
  `CapabilityOntologySuggestionReport` artifact shapes.
- `rekon capability ontology normalize` /
  `review {suggestions,decide,decisions}` /
  `suggestions` CLI commands.
- Architecture summary / agent contract / proof report
  publisher behavior.
- `.rekon/capability-ontology.json` loader behavior
  (read-only).
- `CapabilityMap` artifact shape and `runProject` flow.
- `EvidenceGraph` raw facts.
- Any other workspace package.

## RISKS / FOLLOW-UP

- **Operator friction not yet measured.** The recommendation
  to defer the apply command depends on operator experience
  with manual editing. The next docs quickstart should
  surface friction so the apply-command decision memo (if
  ever needed) has evidence.
- **Multiple-target coverage unknown.** The built-in
  baseline coverage review used one anonymized real-world
  target. CapabilityMap readiness re-evaluation requires
  more targets; the next slice can encourage operators to
  capture suggestion + ledger output across more repos.
- **Proof report deferral may need revisiting.** Once the
  proof report has a natural ontology / context section,
  re-evaluate whether the suggestion report should appear
  there too.

## NEXT STEP

**Capability ontology config authoring guide + review-loop
quickstart.** A docs-only follow-up. Walks operators
through:

1. Run `rekon refresh`.
2. Run `rekon capability ontology normalize --json`.
3. Run `rekon capability ontology review suggestions`
   against the latest report.
4. Triage with `rekon capability ontology review decide`.
5. Run `rekon capability ontology suggestions --json` to
   produce a preview.
6. Read the `architecture-summary` / `agent-contract`
   publications.
7. Manually edit `.rekon/capability-ontology.json` if the
   operator agrees with the proposed config patch.
8. Rerun `rekon capability ontology normalize` and confirm
   the previously unknown terms now normalize.

The quickstart should not include any apply command. It
should explicitly document the manual editing step so
operators understand the control boundary.
