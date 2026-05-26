# Capability Ontology Suggestion Safety Review

**Status:** v1 review shipped.
**Audience:** capability authors, operators, contributors planning the next step on the capability-ontology track.
**Scope:** end-to-end review of the `normalize → review ledger → suggestion report → publication surfacing` loop. Decides whether the loop is safe and stable as a preview-only operator-control surface and whether the next step should add an operator-approved config apply command or keep manual editing of `.rekon/capability-ontology.json`.

This memo is **strategy / docs / tests only**. It does **not** change any runtime behavior, does **not** add an apply command, does **not** mutate `.rekon/capability-ontology.json`, does **not** mutate `CapabilityMap`, and does **not** add proof-report surfacing.

## Decision Summary

- **The capability ontology suggestion workflow is safe and stable as a preview-only loop.** Every step is read-only with respect to the ontology config, `CapabilityMap`, `EvidenceGraph` raw facts, and findings. Operators see the full audit chain in normal Rekon publications.
- **Manual editing of `.rekon/capability-ontology.json` remains the operator-control boundary for now.** No config apply command ships in this batch. The next slice deliberately documents the manual path rather than automating it.
- **`CapabilityNormalizationReport`, `CapabilityNormalizationReviewLedger`, and `CapabilityOntologySuggestionReport` all remain preview-only audit artifacts.** None of them is canonical vocabulary. The agent contract's `Do Not Do` reminder already pins this.
- **Proof report surfacing of suggestions remains deferred.** Ontology suggestions are operator vocabulary / config proposals, not verification proof.
- **`CapabilityMap` integration remains deferred until reviewed terms produce stable high-confidence normalized claims** across multiple operator targets.

The recommended next slice is *capability ontology config authoring guide + review-loop quickstart* — a docs-only follow-up that walks operators through the full manual path (`normalize → review unknowns → generate suggestions → inspect publications → manually edit `.rekon/capability-ontology.json` → rerun normalize`).

## Why This Review Exists

The capability-ontology track shipped six implementation slices in sequence:

1. `CapabilityNormalizationReport` v1 (Layer 5 audit artifact).
2. Built-in baseline ontology coverage review (step 4 strategy).
3. `CapabilityNormalizationReviewLedger` v1 (Layer 5' append-only operator decisions).
4. `CapabilityOntologySuggestionReport` v1 (Layer 5'' preview-only config proposal).
5. Suggestion publication surfacing (architecture summary + agent contract).
6. *(this memo)* — the safety gate before adding any mutation path.

The translation-layer decision committed to *"vocabulary expansion gated on operator review"* and *"`CapabilityMap` integration is deferred to v2."* Before any new mutation path lands — including an operator-approved config apply command — the track needs an explicit safety review answering:

- Does any step mutate ontology config?
- Does any step mutate `CapabilityMap`?
- Does any step risk treating suggestions as applied vocabulary?
- Is the proof report deferral still correct?

This memo answers those questions against the working code and contract / docs tests already shipped.

## Workflow Reviewed

The end-to-end operator path is:

```text
rekon refresh
  ↓ writes EvidenceGraph (Layer 0)

rekon capability ontology normalize
  ↓ writes CapabilityNormalizationReport (Layer 5)

rekon capability ontology review suggestions --report <ref>
  ↓ read-only; aggregates unknown / low-confidence terms

rekon capability ontology review decide --term … --decision …
  ↓ appends one entry to CapabilityNormalizationReviewLedger (Layer 5')

rekon capability ontology review decisions
  ↓ read-only; lists the latest ledger

rekon capability ontology suggestions
  ↓ writes CapabilityOntologySuggestionReport (Layer 5'')

rekon publish architecture
rekon publish agent-contract
  ↓ both surface the suggestion report (read-only)
```

No step in this loop writes `.rekon/capability-ontology.json`. No step writes `CapabilityMap`. No step writes `EvidenceGraph`. No step invokes an LLM.

## Component Safety Review

### `CapabilityNormalizationReport`

- Producer: `@rekon/capability-ontology` (projector).
- Reads `EvidenceGraph` (latest) + optional `.rekon/capability-ontology.json` (read-only).
- Emits a deterministic projection: canonical verb / noun pairs, alias resolution, status (`normalized` / `unknown-verb` / `unknown-noun` / `unknown` / `ignored` / `low-confidence`).
- **No mutation of `EvidenceGraph`, `CapabilityMap`, `.rekon/capability-ontology.json`, findings, or source files.**
- Asserted by 19 contract tests + 10 docs tests (`tests/contract/capability-normalization-report.test.mjs`, `tests/docs/capability-normalization-report.test.mjs`).

### `CapabilityNormalizationReviewLedger`

- Producer: `@rekon/cli.capability-ontology-review`.
- Append-only. Each `decide` adds one entry; existing entries are never rewritten or removed.
- Records operator decisions: `extend-ontology` / `rename-symbol` / `noise-filter` / `defer`.
- **No mutation of `.rekon/capability-ontology.json`, `CapabilityNormalizationReport`, `CapabilityMap`, or `EvidenceGraph`.**
- Asserted by 18 contract tests + 12 docs tests (`tests/contract/capability-normalization-review-ledger.test.mjs`, `tests/docs/capability-normalization-review-ledger.test.mjs`).

### `CapabilityOntologySuggestionReport`

- Producer: `@rekon/cli.capability-ontology-suggestions`.
- Reads the latest ledger + optional existing config.
- Renders `before` / `after` JSON strings under `preview.patch` — read-only text, never written to `.rekon/capability-ontology.json`.
- Suggestion kinds: `add-canonical-verb`, `add-canonical-noun`, `add-verb-alias`, `add-noun-alias`. `termKind: candidate` decisions are skipped with the v1 reason *"candidate-level decisions require manual ontology editing."*. `rename-symbol`, `noise-filter`, `defer` decisions are ignored.
- **No mutation of `.rekon/capability-ontology.json`, the ledger, the normalization report, or `CapabilityMap`.**
- Asserted by 17 contract tests + 9 docs tests (`tests/contract/capability-ontology-suggestions.test.mjs`, `tests/docs/capability-ontology-suggestions.test.mjs`).

### CLI surfaces

- `rekon capability ontology normalize` — reads EvidenceGraph, writes a report under `.rekon/artifacts/projections/`.
- `rekon capability ontology review suggestions` — read-only aggregator.
- `rekon capability ontology review decide` — appends one ledger entry under `.rekon/artifacts/actions/`.
- `rekon capability ontology review decisions` — read-only listing.
- `rekon capability ontology suggestions` — writes a suggestion report under `.rekon/artifacts/actions/`.

None of these CLIs writes outside `.rekon/artifacts/`. None spawns subprocesses. None reads or writes `.rekon/capability-ontology.json` for mutation (the loader is read-only).

### Publication surfacing

- Architecture summary publisher renders a `## Capability Ontology Suggestions` section between `## Working Tree Path Freshness` and `## Proof Loop`.
- Agent contract publisher renders a `### Capability Ontology Suggestions` subsection in the operating-state group and appends a `Do Not Do` reminder: *"Do not treat `CapabilityOntologySuggestionReport` entries as applied ontology config."*
- Both publishers cite the suggestion report in `header.inputRefs` when present.
- Asserted by 13 contract tests + 9 docs tests (`tests/contract/capability-ontology-suggestion-publications.test.mjs`, `tests/docs/capability-ontology-suggestion-publications.test.mjs`).
- **Read-only.** Contract tests assert publications do not create new suggestion reports, do not create `.rekon/capability-ontology.json`, and do not add `CapabilityMap` entries.

## Mutation Boundary Review

`CapabilityOntologySuggestionReport` entries are preview-only and not applied vocabulary.

No current ontology suggestion path mutates `.rekon/capability-ontology.json`.

No current ontology suggestion path mutates `CapabilityMap`.

The mutation boundary is the operator's hand: only the operator can edit `.rekon/capability-ontology.json`, and only by opening the file. The Rekon code path provides preview-only audit trails up to and including the architecture summary + agent contract markdown — but never the write.

| Step | Artifact / Command | Writes | Mutates Config? | Mutates CapabilityMap? |
| --- | --- | --- | --- | --- |
| normalize | `CapabilityNormalizationReport` | report artifact | no | no |
| review suggestions | n/a (read-only) | nothing | no | no |
| review decide | `CapabilityNormalizationReviewLedger` | ledger artifact | no | no |
| review decisions | n/a (read-only) | nothing | no | no |
| suggestions | `CapabilityOntologySuggestionReport` | report artifact | no | no |
| publish architecture | `Publication` | publication artifact | no | no |
| publish agent-contract | `Publication` | publication artifact | no | no |

## Publication Surfacing Review

- The architecture summary's `## Capability Ontology Suggestions` section opens with an explicit `**Preview-only.**` callout: *"`.rekon/capability-ontology.json` remains unchanged. Operators must review the proposed config and apply it manually if desired."*.
- The agent contract carries the same content at heading level 3 inside the operating-state group, plus a new `Do Not Do` rule pinning the preview-only contract.
- Suggestion + skipped tables are bounded (default limit 10) to keep publication size predictable.
- Both publishers cite the source `CapabilityOntologySuggestionReport` in `header.inputRefs`, so freshness logic tracks the source report.

Risk that publications make suggestions look applied: **low**. The publication-side `Preview-only.` line, the agent contract `Do Not Do`, and the `Config path: .rekon/capability-ontology.json` line shown above the table all reinforce that the file is untouched.

## Proof Report Deferral

Proof report surfacing remains deferred because ontology suggestions are vocabulary/config proposals, not verification proof.

The deferral is already documented in:

- `docs/concepts/proof-report-publication.md`
- `docs/artifacts/proof-report-publication.md`
- `docs/artifacts/capability-ontology-suggestion-report.md`

Re-evaluate when a future batch defines a natural ontology / context section for the proof report.

## CapabilityMap Deferral

CapabilityMap integration remains deferred until reviewed terms produce stable high-confidence normalized claims.

This memo does not change the deferral. The built-in baseline coverage review (step 4 of the translation-layer implementation sequence) already documented that:

- the built-in baseline is **acceptable for audit-only v1**;
- the built-in baseline is **not yet sufficient for `CapabilityMap` v2** because real-target unknowns are dominated by symbol noise + lexical-split limitations rather than pure vocabulary gap;
- `CapabilityMap` v2 should wait for either (a) operator-driven vocabulary expansion to reach steady state across multiple targets, or (b) a strict high-confidence-only gate that excludes single-token, path-shaped, and proper-noun-prefixed outcomes.

Neither precondition is met yet. The unknown-term operator review surface + suggestion report exist but have not been exercised against multiple operator targets. The next docs slice documents the manual editing workflow; vocabulary expansion through operator-applied config edits is the natural source of evidence for the CapabilityMap readiness re-evaluation.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| Manual `.rekon/capability-ontology.json` editing only | **Selected for now** | Preserves operator control; matches the layered ontology decision's "operator review gates expansion" pin; no new mutation path to audit. |
| Operator-approved apply command | Deferred | Needs operator-friction evidence from multiple targets. An apply command would cross the preview → mutation boundary and warrants its own decision memo + safety review. |
| Automatic config mutation | Rejected | Creates hidden semantic truth. Violates the translation-layer decision's "do not flatten the ontology into a single config / report layer" pin. |
| `CapabilityMap` v2 now | Rejected | Needs stable reviewed terms across multiple targets. Coverage review explicitly deferred. |

## Recommendation

- Ship this memo + supporting doc updates + docs test. **Do not add a config apply command in this batch.**
- The next slice should be a **docs-only quickstart** that walks the operator through the full manual path. Title suggestion: *capability ontology config authoring guide + review-loop quickstart*.
- Treat the appearance of operator friction in the docs quickstart as the gate for deciding whether an operator-approved apply command is worth shipping. If the manual path remains workable, keep deferring the apply command. If multiple operators report meaningful friction, draft an apply decision memo with explicit confirmation token + pre / post config diff requirements before any implementation work.

## What This Does Not Do

- Does not add an operator-approved config apply command.
- Does not change normalizer behavior.
- Does not change any suggestions CLI behavior.
- Does not change publication behavior.
- Does not change the built-in baseline vocabulary.
- Does not add proof report surfacing of suggestions.
- Does not register a new artifact type.
- Does not register a new capability role or permission.
- Does not mutate `EvidenceGraph` raw facts.
- Does not mutate `CapabilityMap`.
- Does not mutate `.rekon/capability-ontology.json`.
- Does not write any source file.
- Does not bump versions.
- Does not publish to npm.
- Does not add a git tag or GitHub Release.
- Does not create a branch.

## Follow-Up Work

In priority order:

1. **Capability ontology config authoring guide + review-loop quickstart** (docs-only, the recommended next slice). Walks operators through `normalize → review unknowns → generate suggestions → inspect publications → manually edit `.rekon/capability-ontology.json` → rerun normalize`.
2. **Operator-friction signal collection.** Track how often operators report difficulty applying suggestions manually. Treat that as the gate for the apply-command decision memo.
3. **Optional: operator-approved apply command (deferred).** Only after step 2 produces evidence of meaningful friction. Apply would require an explicit confirmation token + pre / post config diff artifact + its own safety review.
4. **`CapabilityMap` v2 (deferred).** Gated on stable reviewed terms across multiple operator targets. The coverage review's high-confidence-only gate language remains the most likely shape.
5. **Proof report surfacing of ontology suggestions (deferred).** Re-evaluate only when a natural ontology / context section exists for the proof report.

| Risk | Guardrail |
| --- | --- |
| Suggestions mistaken as applied vocabulary | Publication `Preview-only.` callout + agent contract `Do Not Do` reminder + `Config path` line + bounded summary table. |
| Hidden config mutation | No writer path. Contract tests pin the absence (config file not created, ledger digest unchanged, suggestion report digest unchanged, no new `CapabilityMap` entries). |
| Premature `CapabilityMap` projection | `CapabilityMap` v2 explicitly deferred in the coverage review + this memo. Translation-layer decision lists `CapabilityMap` integration as v2. |
| Proof report confusion | Proof report surfacing deferred + pinned in `docs/concepts/proof-report-publication.md` and `docs/artifacts/proof-report-publication.md`. |

## See Also

- [Capability Ontology Translation Layer Decision](capability-ontology-translation-layer-decision.md)
- [Built-In Baseline Ontology Coverage Review](builtin-ontology-coverage-review.md)
- [`CapabilityNormalizationReport` artifact reference](../artifacts/capability-normalization-report.md)
- [`CapabilityNormalizationReviewLedger` artifact reference](../artifacts/capability-normalization-review-ledger.md)
- [`CapabilityOntologySuggestionReport` artifact reference](../artifacts/capability-ontology-suggestion-report.md)
- [Capability ontology concept](../concepts/capability-ontology.md)
- [Capability Ontology Config Authoring Guide](../beta/capability-ontology-config-authoring-guide.md)
  — operator reference for editing `.rekon/capability-ontology.json` by hand,
  shipped as the docs-only follow-up to this safety review.
- [Capability Ontology Review-Loop Quickstart](../beta/capability-ontology-review-loop-quickstart.md)
  — seven-step operator quickstart walking through the manual path.
- [Roadmap](roadmap.md)
- [Classic-behaviour roadmap](classic-behavior-roadmap.md)
