# `CapabilityContract` Artifact

`CapabilityContract` is the **policy layer** that sits on
top of [`CapabilityMap`](capability-map.md) v2. It carries
per-capability binding rules — placement, neighbors,
required verification checks, preservation notes — that
operators have explicitly authorised in
`.rekon/capability-contracts.json`. The artifact is
**diagnostic**: in v1, nothing routes, lints, or gates on
it. A future safety review and a separate decision must
land before any downstream consumer reads it.

This memo pins:
- `CapabilityContract` is policy.
- `CapabilityMap` v2 remains projection and must not grow
  policy fields.

Both pins are inherited verbatim from the
[`CapabilityContract` Architecture Decision](../strategy/capability-contract-architecture-decision.md).

## Layer position

```
EvidenceGraph
  → CapabilityNormalizationReport (translation audit)
  → CapabilityPhraseReport         (semantic purpose projection)
  → CapabilityMap v2               (phrase-backed projection)
  → CapabilityContract             (policy)
  → RefactorPreservationContract   (future)
```

`CapabilityContract` consumes a published `CapabilityMap`
artifact ref and the optional config file at
`.rekon/capability-contracts.json`. It does not read
source files. It does not invoke an LLM. It does not
mutate any upstream artifact.

## What v1 emits

The v1 producer emits two row statuses:

- **`configured`** — a row in
  `.rekon/capability-contracts.json` matched a v2
  phrase-backed capability. The row carries the binding
  rules from the config plus a `capabilityRef` back into
  the source `CapabilityMap`.
- **`unmatched`** — a row in the config did not match any
  v2 phrase-backed capability. No policy fields are
  carried; the row exists purely to surface config drift
  to operators.

`suggested` is **reserved for future use**. v1 never
emits suggested rows. When a suggestion / review workflow
ships in a later slice, it will follow the same
operator-gated semantics as the
[`CapabilityOntologySuggestionReport`](capability-ontology-suggestion-report.md)
preview workflow.

## Match semantics

Matching is **conjunctive**:

- exact `verb` required,
- exact `noun` required,
- `domain` / `pattern` / `layer` only compared when the
  config populates them; when populated, the matched
  phrase-backed capability must agree.

**Most-specific match wins.** If multiple v2 phrase-backed
capabilities match the config row, the one that agrees on
the largest count of optional fields wins. Ties break by
phrase-backed `id` ascending — deterministic across runs.

## Citation chain

Every `configured` row carries a citation chain back
through the projection layers:

`CapabilityContract.contracts[i].capabilityRef.capabilityMapRef`
→ `CapabilityMap.phraseBackedCapabilities[k].phraseRef.report`
→ `CapabilityPhraseReport.phrases[m].evidenceRefs[]`
→ `EvidenceGraph.facts[n]`.

`unmatched` rows do not carry citations — by definition
they failed to bind to a v2 capability.

## Shape (v1)

```ts
type CapabilityContractPolicyStatus =
  | "configured"
  | "suggested" // reserved; v1 never emits
  | "unmatched";

type CapabilityContract = {
  header: ArtifactHeader;

  source: {
    configPath?: string;        // ".rekon/capability-contracts.json" when present
    configHash?: string;        // sha256 hex of canonical-JSON config
    capabilityMapRef: ArtifactRef;
    phraseReportRef?: ArtifactRef;
  };

  summary: {
    total: number;
    configured: number;
    suggested: number;          // always 0 in v1
    unmatched: number;
    withRequiredChecks: number;
    withPlacementRules: number;
    withPreservationRules: number;
  };

  contracts: Array<{
    id: string;
    capabilityRef?: {
      capabilityMapRef: ArtifactRef;
      phraseCapabilityId: string;
    };                          // required for configured; absent on unmatched
    match: {
      verb: string;
      noun: string;
      domain?: string;
      pattern?: string;
      layer?: string;
    };
    status: CapabilityContractPolicyStatus;
    allowedLayers?: string[];
    forbiddenLayers?: string[];
    allowedSystems?: string[];
    forbiddenSystems?: string[];
    requiredChecks?: string[];
    requiredNeighbors?: Array<{ verb: string; noun: string }>;
    forbiddenNeighbors?: Array<{ verb: string; noun: string }>;
    preservationRules?: string[];
    messages?: string[];
  }>;
};
```

## Producer contract

The reference producer is `@rekon/capability-model`'s
`buildCapabilityContract` helper. Its guarantees:

- Inputs are a `CapabilityMap` and an optional
  `CapabilityContractConfig`. Missing config is allowed
  and produces an artifact with an empty `contracts`
  array.
- The CapabilityMap is **never** mutated.
- The config file is **never** written.
- Source files are **never** read or mutated.
- No LLM inference. No network calls.
- Ordering is deterministic: contracts sort by `(verb,
  noun, id)`; repeated string fields are
  `uniqueSorted`; neighbor arrays are deduplicated and
  sorted by `(verb, noun)`.
- `summary` is re-derived from `contracts` so the
  validator can detect tampered or stale counts.
- `configHash` is a sha256 over the canonical JSON of the
  consumed config (object keys sorted). Two runs over the
  identical config produce byte-identical hashes.

## Validator pins

The kernel validator at
`@rekon/kernel-repo-model.validateCapabilityContract`
enforces:

- Every `configured` row carries a non-empty
  `capabilityRef.phraseCapabilityId` and a valid
  `capabilityRef.capabilityMapRef`.
- `unmatched` rows MUST NOT carry any policy fields.
- `configured` rows MUST carry at least one populated
  policy field. (The producer drops empty-policy rows
  before emit.)
- `summary.total`, `.configured`, `.suggested`,
  `.unmatched`, `.withRequiredChecks`,
  `.withPlacementRules`, `.withPreservationRules` are
  re-derived from `contracts` and must agree.
- `status` is one of `"configured" | "suggested" |
  "unmatched"` (v1 emits only the first and third).

## CLI

```
rekon capability contract generate \
  [--capability-map <id|type:id>] \
  [--root <path>] \
  [--json]
```

- Reads the latest (or specified) `CapabilityMap`.
- Reads `.rekon/capability-contracts.json` when present;
  missing config is benign.
- Writes the resulting `CapabilityContract` artifact
  under `actions/`.
- Prints a human-readable summary that includes the
  diagnostic-only reminder.

## What this artifact does **not** do (v1)

- **No architecture linting.** Mismatched layer / system
  placement does not raise a finding.
- **No resolver routing by capability.** Resolvers see
  the same routing input they saw before this artifact
  shipped.
- **No verification planning by capability.** Plans are
  still produced by the existing verify track.
- **No source write.** No file is read, edited, or
  created by the producer.
- **No `write:source` permission.** The producer holds
  `read:artifacts` + `write:artifacts` only.

## Cross-references

- [`CapabilityContract` Architecture Decision](../strategy/capability-contract-architecture-decision.md)
  — pins the policy / projection boundary.
- [`CapabilityContract` v1 Safety Review](../strategy/capability-contract-v1-safety-review.md)
  — thirty-fourth slice; declares v1 safe / stable as
  an artifact-backed policy layer and recommends
  publication surfacing as the next slice.
- [`CapabilityMap` artifact](capability-map.md) — the
  projection layer this artifact consumes.
- [`CapabilityPhraseReport` artifact](capability-phrase-report.md)
  — the semantic-purpose projection that feeds
  `CapabilityMap` v2.
- [Capability Ontology concept](../concepts/capability-ontology.md)
  — the layer ladder.
- [CapabilityContract concept](../concepts/capability-contracts.md)
  — operator-facing summary.
