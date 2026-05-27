# CapabilityContract

`CapabilityContract` is the **policy layer** that sits
above `CapabilityMap` v2. It is the first artifact in the
capability ontology stack that carries *what an operator
wants this code to do or not do* — placement, neighbors,
required checks, preservation notes — as opposed to
*what the code actually does* (which is what the
projection layers describe).

This document is the operator-facing summary. For the
schema, validator rules, and CLI surface, see
[`docs/artifacts/capability-contract.md`](../artifacts/capability-contract.md).
For the architectural rationale, see the
[`CapabilityContract` Architecture Decision](../strategy/capability-contract-architecture-decision.md).

## Where it sits in the stack

```
EvidenceGraph
  → CapabilityNormalizationReport (translation audit)
  → CapabilityPhraseReport         (semantic purpose projection)
  → CapabilityMap v2               (phrase-backed projection)
  → CapabilityContract             (policy)          ← this doc
  → RefactorPreservationContract   (future)
```

The projection layers (`EvidenceGraph` →
`CapabilityNormalizationReport` →
`CapabilityPhraseReport` → `CapabilityMap` v2) describe
the codebase as Rekon sees it. The policy layer
(`CapabilityContract` and, later,
`RefactorPreservationContract`) describes what operators
have **authorised** the system to enforce, given that
view.

These layers are **not interchangeable**:

- `CapabilityMap` v2 must remain projection only and
  must not grow policy fields. This pin is repeated in
  the [artifact reference](../artifacts/capability-map.md)
  and the decision memo.
- `CapabilityContract` is policy and never feeds back
  into projection. The producer never edits the
  `CapabilityMap`, never edits source files, and never
  edits the `.rekon/capability-contracts.json` config
  file.

## What v1 ships

The thirty-third slice on the capability-ontology track
ships:

1. **The artifact type** itself, registered in the SDK
   and runtime.
2. **A reference producer**
   (`buildCapabilityContract` in
   `@rekon/capability-model`) that consumes the latest
   `CapabilityMap` v2 plus an optional
   `.rekon/capability-contracts.json` config and emits
   the effective contract artifact.
3. **A CLI command** —
   `rekon capability contract generate` — that runs the
   producer and writes the artifact under `actions/`.

The artifact is **diagnostic only**. v1 does not:

- lint architecture against the contract,
- route resolvers by capability,
- plan verification by capability,
- write to source,
- write to the config file,
- emit `suggested` rows (reserved for a future
  suggestion / review workflow).

## The config file

Operators author binding rules in
`.rekon/capability-contracts.json`:

```jsonc
{
  "version": "0.1.0",
  "contracts": [
    {
      "id": "billing.invoice-preview",
      "match": {
        "verb": "compute",
        "noun": "invoice-preview",
        "domain": "billing"
      },
      "allowedLayers": ["domain", "service"],
      "forbiddenLayers": ["route", "ui"],
      "requiredChecks": ["npm run test -- pricing"],
      "requiredNeighbors": [
        { "verb": "validate", "noun": "coupon" }
      ],
      "preservationRules": [
        "Preserve tax rounding behavior.",
        "Preserve expired-coupon rejection semantics."
      ]
    }
  ]
}
```

**Authoring rules:**

- The file is operator-authored. Rekon never writes it.
- Missing file is allowed; the artifact is still
  emitted with an empty `contracts` array.
- The `match` block is conjunctive — every populated
  field must agree with the matched v2 phrase-backed
  capability.
- The `id` must be unique within the file.
- A `configured` row with no populated policy fields is
  a config mistake; the producer drops it before emit
  so the validator never sees it.

## Matching, in plain English

When the producer reads your config, it walks the
`phraseBackedCapabilities[]` of the latest
`CapabilityMap` and tries to bind each config row.

- A config row's `verb` and `noun` must match exactly.
- If the row populates `domain`, the matched capability
  must agree on `domain`.
- Same for `pattern` and `layer`.
- If multiple capabilities match a row, the one that
  agrees on the most optional fields wins. Ties break by
  the phrase-backed `id`, ascending.

If no capability matches, the row lands in the artifact
as `unmatched`. This is **visibility only** — the row
exists so you can see config drift, but it carries no
policy fields.

## Citation chain

Every `configured` row in the artifact threads back to
the original evidence:

`CapabilityContract` →
`CapabilityMap.phraseBackedCapabilities[k]` →
`CapabilityPhraseReport.phrases[m]` →
`EvidenceGraph.facts[n]`.

This citation chain is how a future safety review will
verify that any policy enforced off this artifact is
ultimately tied back to evidence in the repo, not to an
LLM hallucination.

## What it does **not** do

Read the artifact reference for the canonical list. The
operator-facing summary:

- **No architecture linting.** Layer / system mismatches
  do not raise findings.
- **No resolver routing by capability.** Resolvers do
  not change behavior because of this artifact.
- **No verification planning by capability.** Plans are
  still produced by the existing verify track.
- **No source mutation.**
- **No config mutation.**
- **No LLM inference.** The producer is deterministic
  over its JSON inputs.

These pins exist so that the rollout of policy-aware
features can happen in safe, reviewed slices instead of
arriving as a surprise the moment the artifact ships.

## Operator workflow

1. Run `rekon refresh` so the latest `CapabilityMap`
   exists.
2. Author `.rekon/capability-contracts.json`. Start with
   a single row and `requiredChecks` to confirm the
   wiring.
3. Run `rekon capability contract generate`. Inspect the
   JSON output (`--json`) or the human summary to see
   what bound to `configured` versus `unmatched`.
4. Iterate. Add `match.domain` / `match.pattern` /
   `match.layer` to narrow rows that bound too broadly.
   Rename or rewrite source so additional capabilities
   project under the verbs / nouns you care about.
5. Commit the artifact (under `.rekon/artifacts/actions/`)
   alongside your other Rekon artifacts so reviewers can
   see the effective contract.

## Cross-references

- [`CapabilityContract` artifact reference](../artifacts/capability-contract.md)
- [`CapabilityContract` Architecture Decision](../strategy/capability-contract-architecture-decision.md)
- [`CapabilityMap` artifact reference](../artifacts/capability-map.md)
- [`CapabilityPhraseReport` artifact reference](../artifacts/capability-phrase-report.md)
- [Capability Ontology concept](capability-ontology.md)
- [Architecture summary publication](architecture-summary-publication.md)
- [Agent operating contract](agent-operating-contract.md)
