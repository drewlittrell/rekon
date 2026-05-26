# Capability Ontology Config Authoring Guide

**Audience:** operators improving Rekon's canonical
capability vocabulary against their own repo.
**Companion:** [Capability Ontology Review-Loop
Quickstart](capability-ontology-review-loop-quickstart.md).
**Status:** v1. **Fallback / emergency manual path.** The
steady-state product model is now defined by the
[Capability Ontology Canon + Override Model
Decision](../strategy/capability-ontology-canon-override-model-decision.md):
Rekon ships canonical ontology packs (`base` + archetype
overlays) and repo-local overrides extend or supersede them.
This guide remains useful for operators who need to author
the file directly today, and will be updated when the
canon-packs-v1 implementation slice lands (loader target
renames to `.rekon/capability-ontology.overrides.json`).

## Purpose

Show operators how to edit `.rekon/capability-ontology.json`
deliberately, based on real signal from
`CapabilityNormalizationReport`,
`CapabilityNormalizationReviewLedger`, and
`CapabilityOntologySuggestionReport`. The control boundary
is **the operator's hand**: Rekon proposes; the operator
writes the file.

## What The Ontology Config Is

`.rekon/capability-ontology.json` is an **optional**
operator-supplied file that extends the built-in capability
ontology. It tells the normalizer:

- which canonical verbs and nouns the operator considers part
  of this repo's capability vocabulary;
- which local terms are aliases for canonical entries;
- optional categories that group canonical entries by intent;
- optional thresholds for future high-confidence gating.

`CapabilityOntologySuggestionReport` is preview-only and not
applied vocabulary. The config file only becomes effective
after the operator opens the file, writes the proposed
entries, saves, and re-runs `rekon capability ontology
normalize`.

`CapabilityMap` integration remains deferred. Editing the
ontology config does **not** materialize a `CapabilityMap`
entry.

## Where The Config Lives

```text
.rekon/capability-ontology.json
```

Rules:

- The file is **optional**. If absent, Rekon uses the
  built-in baseline ontology.
- **Rekon never creates or mutates this file
  automatically.** No CLI command writes it. The suggestion
  report renders a `before` / `after` JSON preview, but
  applying that preview is a manual editing step.
- Invalid config (bad JSON, wrong version, wrong shape)
  fails `rekon capability ontology normalize` clearly.
  Rekon does not silently ignore the file.
- **JSON only in v1. YAML is not supported.**

## Config Shape

The full v1 shape, with every supported field, looks like:

```json
{
  "version": "0.1.0",
  "verbs": {
    "canonical": ["validate", "render"],
    "aliases": {
      "ensure": "validate"
    },
    "categories": {
      "validation": ["validate"]
    },
    "includeSystemVerbs": true
  },
  "nouns": {
    "canonical": ["schema", "view"],
    "aliases": {
      "screen": "view"
    },
    "categories": {
      "ui": ["view"]
    },
    "thresholds": {
      "autoMap": 0.8
    },
    "includeSystemNouns": true
  }
}
```

`version` must equal `"0.1.0"` in v1. Both `verbs` and
`nouns` are optional; an empty config (`{ "version":
"0.1.0" }`) is valid and behaves identically to the
built-in baseline.

| Section | Purpose |
| --- | --- |
| `verbs.canonical` | allowed canonical verbs |
| `verbs.aliases` | maps local terms to canonical verbs |
| `nouns.canonical` | allowed canonical nouns |
| `nouns.aliases` | maps local terms to canonical nouns |
| `nouns.thresholds.autoMap` | future suggestion threshold |

## Canonical Verbs

`verbs.canonical` lists the **verb tokens** that count as
canonical Rekon capability verbs. Tokens are case-insensitive
and stored normalized. Examples: `validate`, `render`,
`compile`, `transform`, `dispatch`.

Rekon merges canonical entries on top of the built-in
baseline; entries you list here are added to the canonical
set, not in place of it. To remove a built-in entry from
the effective ontology, set `includeSystemVerbs: false` —
otherwise the built-in baseline remains active.

## Verb Aliases

`verbs.aliases` maps a **local term** (the key) to a
**canonical verb** (the value). When the normalizer sees a
symbol whose verb token equals an alias key, it resolves the
verb to the canonical value and records `verbAliasApplied`
on the resulting candidate.

Example: `{ "ensure": "validate" }` resolves the verb token
`ensure` to canonical verb `validate`.

Aliases are case-insensitive. The canonical target should be
present in either the built-in baseline or
`verbs.canonical`; the loader does not block missing
targets, but the resulting candidate may render as
`unknown-verb` if no canonical entry exists.

## Canonical Nouns

`nouns.canonical` mirrors `verbs.canonical`. Examples:
`schema`, `view`, `route`, `user`. Tokens are case-insensitive
and merged with the built-in baseline.

## Noun Aliases

`nouns.aliases` mirrors `verbs.aliases`. Example: `{ "screen":
"view" }` resolves the noun token `screen` to canonical noun
`view`.

## Categories And Thresholds

`verbs.categories` and `nouns.categories` are optional
operator-supplied category labels. The shape is `{ <category
name>: [<canonical tokens>] }`. Categories are informational
in v1 — the normalizer surfaces them in
`CapabilityNormalizationReport` candidate rows so operators
can group canonical entries by intent.

`nouns.thresholds.autoMap` is a **future** high-confidence
threshold. It is read by the loader but does not change
normalization behavior in v1. Future slices may use it to
gate `CapabilityMap` projection. Default: `0.8`.

`verbs.includeSystemVerbs` / `nouns.includeSystemNouns`
(default `true`) include the built-in baseline. Set to
`false` only when the repo wants to start from a clean
slate; the normalizer still recognizes operator-supplied
canonical entries.

## Manual Editing Workflow

The full operator loop is:

```bash
# 1. Refresh artifacts so the EvidenceGraph is current.
node packages/cli/dist/index.js refresh --root <repo> --json

# 2. Project the EvidenceGraph through the current ontology.
node packages/cli/dist/index.js capability ontology normalize --root <repo> --json

# 3. List unknown / low-confidence terms.
node packages/cli/dist/index.js capability ontology review suggestions \
  --root <repo> \
  --report <CapabilityNormalizationReport:id> \
  --json

# 4. Decide top terms one at a time.
node packages/cli/dist/index.js capability ontology review decide \
  --root <repo> \
  --term <term> \
  --term-kind noun \
  --decision extend-ontology \
  --reason "<reason>" \
  --json

# 5. Generate a preview-only suggestion report.
node packages/cli/dist/index.js capability ontology suggestions --root <repo> --json
```

Then:

1. Open the `CapabilityOntologySuggestionReport` (artifact
   path printed by step 5) or read the `## Capability
   Ontology Suggestions` section in the architecture
   summary publication.
2. Inspect `preview.patch.before` and `preview.patch.after`.
3. Copy the proposed canonical terms and aliases into
   `.rekon/capability-ontology.json` **manually**. Create
   the file if it does not exist; otherwise merge the
   additions into the existing config.
4. Save the file.
5. Re-run `rekon capability ontology normalize` and compare
   counts (see *Validation Loop* below).

**`CapabilityOntologySuggestionReport` is preview-only and
not applied vocabulary.** Skipping the manual edit means the
config remains untouched and normalization output does not
change.

**`CapabilityMap` integration remains deferred.** Manual
ontology edits do not produce a `CapabilityMap` projection
yet; that integration is gated on stable high-confidence
normalized claims across multiple operator targets.

## Validation Loop

After editing the config:

```bash
node packages/cli/dist/index.js capability ontology normalize --root <repo> --json
node packages/cli/dist/index.js artifacts validate --root <repo> --json
```

What to look for:

- `summary.normalized` goes **up**.
- `summary.unknown`, `summary.unknownVerb`, and
  `summary.unknownNoun` go **down** for the terms you
  added or aliased.
- `ontology.source` flips from `"builtin"` to
  `"builtin+config"`.
- `ontology.configPath` is `.rekon/capability-ontology.json`.
- `ontology.configHash` is a fresh 16-char SHA prefix.
- `rekon artifacts validate` reports zero issues.

After a manual edit, rerun normalization and compare unknown
/ low-confidence counts.

If unknown counts do not drop:

- Confirm the term you added matches the **lexical-split
  output** in the previous report's candidate row, not the
  source symbol. The splitter lowercases tokens and splits
  on camel / snake / kebab boundaries.
- Confirm the alias points at a canonical entry. The
  normalizer only resolves aliases whose target is a known
  canonical token.
- Confirm `version` is exactly `"0.1.0"`.

## What Suggestions Mean

`CapabilityOntologySuggestionReport` translates
`extend-ontology` decisions from the latest
`CapabilityNormalizationReviewLedger` into proposed config
edits. The four suggestion kinds are:

- `add-canonical-verb` — operator marked a `verb` term as
  `extend-ontology` with no `suggestedCanonical`. The
  proposal adds the term to `verbs.canonical`.
- `add-canonical-noun` — same shape for `noun` terms.
- `add-verb-alias` — operator supplied
  `suggestedCanonical`. The proposal adds an entry under
  `verbs.aliases` mapping the operator-supplied term to the
  canonical form.
- `add-noun-alias` — same shape for `noun` terms with
  `suggestedCanonical`.

Rules:

- Verb / noun extend decisions can become canonical
  additions or aliases.
- `termKind: candidate` decisions are skipped in v1 with the
  reason *"candidate-level decisions require manual ontology
  editing."*. Single-token capability names need operator
  judgement that the suggestion report does not encode.
- Suggestions are deduped deterministically
  (case-insensitive term + canonical pair).
- Suggestions do **not** mutate `.rekon/capability-ontology.json`.
- Suggestions do **not** mutate `CapabilityMap`.

| Decision | Meaning | Typical Follow-Up |
| --- | --- | --- |
| extend-ontology | real vocabulary gap | manually add canonical term or alias |
| rename-symbol | repo naming should change | consider source rename later |
| noise-filter | not a capability signal | leave out of ontology |
| defer | needs more context | revisit later |

Decision meanings:

- **`extend-ontology`** — real vocabulary gap; consider
  adding canonical term or alias.
- **`rename-symbol`** — source repo naming should change,
  not ontology.
- **`noise-filter`** — term is not a capability signal.
- **`defer`** — operator needs more context.

## What This Does Not Do

- Does not add a config apply command.
- Does not mutate `.rekon/capability-ontology.json`.
- Does not mutate `CapabilityMap`.
- Does not mutate `EvidenceGraph` raw facts.
- Does not change normalizer or suggestions CLI behavior.
- Does not add LLM-only normalization.
- Does not add source writes.
- Does not change publication behavior.
- Does not bump versions.
- Does not publish to npm.

## Follow-Up Work

- *Manual ontology config dogfood* — exercise this guide
  end-to-end on one real repo and compare unknown counts
  before / after the manual edit. Output drives the
  decision on whether an operator-approved apply command is
  worth shipping.
- *Operator-approved apply command (deferred)* — only after
  manual dogfood produces evidence of meaningful friction.
  Any apply implementation must ship behind its own
  decision memo + explicit confirmation token + pre / post
  config diff artifact + dedicated safety review.
- *`CapabilityMap` v2 (deferred)* — gated on stable
  high-confidence reviewed claims across multiple operator
  targets.

## See Also

- [Capability Ontology Review-Loop
  Quickstart](capability-ontology-review-loop-quickstart.md)
- [Capability Ontology
  concept](../concepts/capability-ontology.md)
- [`CapabilityNormalizationReport` artifact
  reference](../artifacts/capability-normalization-report.md)
- [`CapabilityNormalizationReviewLedger` artifact
  reference](../artifacts/capability-normalization-review-ledger.md)
- [`CapabilityOntologySuggestionReport` artifact
  reference](../artifacts/capability-ontology-suggestion-report.md)
- [Capability Ontology Suggestion Safety
  Review](../strategy/capability-ontology-suggestion-safety-review.md)
- [Capability Ontology Translation Layer
  Decision](../strategy/capability-ontology-translation-layer-decision.md)
