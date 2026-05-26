# Capability Ontology Review-Loop Quickstart

**Audience:** operators who have just installed Rekon and
want to run the full ontology review loop end-to-end against
their own repo.
**Companion:** [Capability Ontology Config Authoring
Guide](capability-ontology-config-authoring-guide.md).
**Status:** v1. Manual config editing only. No config-apply
command ships (per the
[Capability Ontology Suggestion Safety
Review](../strategy/capability-ontology-suggestion-safety-review.md)).

## Who This Is For

Operators using Rekon against a real repo who want to:

- triage unknown / low-confidence capability terms;
- decide which terms should extend the canonical ontology;
- inspect the proposed config patch;
- apply the change **manually** to
  `.rekon/capability-ontology.json`;
- confirm the next normalization run reflects the change.

This quickstart is the operator path. The authoring guide
above is the reference. Read both.

## Prerequisites

- Rekon installed and the CLI on `PATH` (or invoked through
  `node packages/cli/dist/index.js`).
- A repo with an existing or initializable `.rekon/`
  workspace.
- A text editor capable of editing JSON (any editor will
  do).
- The capability ontology suggestion safety review's
  preview-only contract acknowledged: nothing in this
  quickstart writes `.rekon/capability-ontology.json`
  automatically.

The full loop:

| Step | Command / Action |
| --- | --- |
| normalize | `rekon capability ontology normalize` |
| review | `rekon capability ontology review suggestions` |
| decide | `rekon capability ontology review decide` |
| suggest | `rekon capability ontology suggestions` |
| edit | manually edit `.rekon/capability-ontology.json` |
| rerun | rerun normalize and compare counts |

## Step 1: Normalize

```bash
node packages/cli/dist/index.js refresh --root <repo> --json
node packages/cli/dist/index.js capability ontology normalize --root <repo> --json
```

Reads the latest `EvidenceGraph` and writes a
`CapabilityNormalizationReport`. The JSON output prints the
artifact id under `artifact.id`; the summary lists counts
by status (`normalized`, `unknownVerb`, `unknownNoun`,
`unknown`, `ignored`, `lowConfidence`).

If the repo has never been observed, run `rekon refresh`
first (the snippet above does). Without a fresh
`EvidenceGraph` the normalizer fails clearly.

## Step 2: Review Suggestions

```bash
REPORT="$(node packages/cli/dist/index.js artifacts latest \
  --root <repo> \
  --type CapabilityNormalizationReport \
  --id-only)"

node packages/cli/dist/index.js capability ontology review suggestions \
  --root <repo> \
  --report "$REPORT" \
  --json
```

Aggregates unknown / low-confidence terms by frequency. The
JSON output is sorted by `count` descending; the top
entries are the highest-leverage triage targets. By default
the command excludes terms already decided in the latest
ledger.

Pass `--limit <n>` to see more than the default 20 rows.
Pass `--include-decided` to re-surface previously decided
terms.

## Step 3: Decide Unknown Terms

For each high-frequency term, record one decision:

```bash
node packages/cli/dist/index.js capability ontology review decide \
  --root <repo> \
  --term <term> \
  --term-kind verb|noun|candidate \
  --decision extend-ontology|rename-symbol|noise-filter|defer \
  --reason "<text>" \
  [--suggested-canonical <text>] \
  [--report "$REPORT"] \
  [--candidate <candidate-id>] \
  --json
```

Decision meanings:

- **`extend-ontology`** — real vocabulary gap; consider
  adding canonical term or alias.
- **`rename-symbol`** — source repo naming should change,
  not ontology.
- **`noise-filter`** — term is not a capability signal.
- **`defer`** — operator needs more context.

| Decision | Meaning | Typical Follow-Up |
| --- | --- | --- |
| extend-ontology | real vocabulary gap | manually add canonical term or alias |
| rename-symbol | repo naming should change | consider source rename later |
| noise-filter | not a capability signal | leave out of ontology |
| defer | needs more context | revisit later |

For `extend-ontology` decisions, optionally pass
`--suggested-canonical <text>` to indicate the canonical
form. With it, the next step proposes an **alias** mapping
the operator's term to your canonical; without it, the next
step proposes a **canonical addition**.

The ledger is append-only. Each `decide` adds one entry; no
prior entries change.

## Step 4: Generate Ontology Suggestions

```bash
node packages/cli/dist/index.js capability ontology suggestions \
  --root <repo> \
  --json
```

Writes a `CapabilityOntologySuggestionReport` under
`.rekon/artifacts/actions/`. Each `extend-ontology` decision
becomes one of:

- `add-canonical-verb` / `add-canonical-noun` (no
  `suggestedCanonical`);
- `add-verb-alias` / `add-noun-alias` (with
  `suggestedCanonical`).

`termKind: candidate` decisions are skipped in v1 with the
reason *"candidate-level decisions require manual ontology
editing."*. `rename-symbol`, `noise-filter`, and `defer`
decisions do not produce suggestions.

The report carries `preview.patch.before` and
`preview.patch.after` JSON strings — read both. The
`after` block is what `.rekon/capability-ontology.json`
would look like if you applied every proposed change.

- Suggestions do **not** mutate
  `.rekon/capability-ontology.json`.
- Suggestions do **not** mutate `CapabilityMap`.
- Suggestions are deduped deterministically
  (case-insensitive term + canonical pair).

## Step 5: Inspect Publications

```bash
node packages/cli/dist/index.js publish architecture --root <repo> --json
node packages/cli/dist/index.js publish agent-contract --root <repo> --json
```

Both publications now surface a `Capability Ontology
Suggestions` section. The architecture summary renders it at
heading level 2; the agent contract renders it at heading
level 3 inside the operating-state group, with a `Do Not Do`
reminder pinning that suggestion entries are **not applied
vocabulary**.

The architecture summary's section opens with a
`Preview-only.` callout confirming
`.rekon/capability-ontology.json` remains unchanged. Use
this read-only surface to share the proposed change with
collaborators before editing the config.

## Step 6: Manually Edit Ontology Config

Open `.rekon/capability-ontology.json` (create it if
absent):

```json
{
  "version": "0.1.0",
  "verbs": {
    "canonical": ["validate", "render"],
    "aliases": {
      "ensure": "validate"
    }
  },
  "nouns": {
    "canonical": ["schema", "view"],
    "aliases": {
      "screen": "view"
    }
  }
}
```

Rules from the [authoring
guide](capability-ontology-config-authoring-guide.md):

- The file is **optional**. If absent, Rekon uses the
  built-in baseline ontology.
- **Rekon never creates or mutates this file
  automatically.** This step is the entire reason the loop
  exists.
- **JSON only in v1. YAML is not supported.**
- `version` must equal `"0.1.0"`.

Copy the proposed canonical entries and aliases from the
suggestion report's `preview.patch.after` block into the
file. Save. The mutation channel is the operator's hand on
this file; Rekon does not open it for writing.

**`CapabilityOntologySuggestionReport` is preview-only and
not applied vocabulary.**

## Step 7: Rerun Normalize

```bash
node packages/cli/dist/index.js capability ontology normalize --root <repo> --json
node packages/cli/dist/index.js artifacts validate --root <repo> --json
```

What to look for:

- `ontology.source` flips from `"builtin"` to
  `"builtin+config"`.
- `ontology.configPath` is `.rekon/capability-ontology.json`.
- `summary.normalized` count goes **up**.
- `summary.unknown`, `summary.unknownVerb`,
  `summary.unknownNoun` go **down** for the terms you
  added or aliased.
- `rekon artifacts validate` reports zero issues.

After a manual edit, rerun normalization and compare unknown
/ low-confidence counts.

## Interpreting Results

- **Most unknown rows became `normalized` after the edit.**
  Loop succeeded; consider committing
  `.rekon/capability-ontology.json` to the repo so
  collaborators benefit.
- **Some unknown rows persist.** Re-run *Step 2: Review
  Suggestions*. Confirm:
  - the term you added matches the lexical-split output
    (the splitter lowercases tokens and splits on camel /
    snake / kebab boundaries);
  - aliases point at canonical entries actually present in
    the effective ontology (built-in baseline +
    operator-supplied canonical);
  - `version` is exactly `"0.1.0"` and the JSON is valid.
- **`unknown` count goes up.** That can happen if you
  removed a built-in entry by setting
  `includeSystemVerbs: false` or `includeSystemNouns:
  false`. Confirm this was intentional.
- **`CapabilityMap` integration remains deferred.** Manual
  ontology edits do not project canonical claims into
  `CapabilityMap` yet; that integration is gated on stable
  high-confidence normalized claims across multiple
  operator targets.

## What This Does Not Do

- Does not add a config apply command.
- Does not mutate `.rekon/capability-ontology.json`
  automatically.
- Does not mutate `CapabilityMap`.
- Does not mutate `EvidenceGraph` raw facts.
- Does not change normalizer or suggestions CLI behavior.
- Does not change publication behavior.
- Does not add LLM-only normalization.
- Does not add source writes.
- Does not publish to npm.
- Does not bump versions.

## Next Steps

- Repeat the loop iteratively. After each manual edit, rerun
  the normalize + review + decide + suggestions chain.
- Consider committing
  `.rekon/capability-ontology.json` to the repo so
  collaborators get the same effective ontology.
- If manual editing becomes painful at scale, report
  friction so a future apply-command decision memo can land
  with evidence. Any future apply command will ship behind
  its own decision memo + explicit confirmation token +
  pre / post config diff artifact + dedicated safety review.

## See Also

- [Capability Ontology Config Authoring
  Guide](capability-ontology-config-authoring-guide.md)
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
