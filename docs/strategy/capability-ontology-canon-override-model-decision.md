# Capability Ontology Canon + Override Model Decision

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status:** v1 decision shipped.
**Audience:** capability authors, operators, contributors planning the next implementation slice on the capability-ontology track.
**Scope:** picks the product model for the capability ontology layer going forward. Rekon ships a built-in canonical ontology baseline and repo-archetype overlays. Repo-local override files supersede or extend the canonical set. Manual editing of the full ontology from scratch is **not** the steady-state model.

This memo is **strategy / decision / docs / tests only**. It does **not** ship any canonical pack, does **not** implement override loading, does **not** change normalizer behavior, does **not** add an apply command. The previous *capability ontology config authoring guide + review-loop quickstart* batch remains in `docs/beta/` as a **manual-fallback** reference, not the product promise.

## Decision Summary

- **`CapabilityOntology` is not user-authored from scratch. `CapabilityOntology` is Rekon-provided canon + repo-local overrides.** That is the new product contract.
- **Rekon will ship built-in canonical ontology packs** (`base` + a small set of repo-archetype overlays for v1) so the baseline vocabulary covers common architectures out of the box.
- **Repo-local overrides supersede or extend the canonical set.** The file is renamed `.rekon/capability-ontology.overrides.json` so operators understand they are overriding canon, not defining the ontology.
- **`EffectiveCapabilityOntology` is compiled from `canon → archetype overlays → repo overrides → system seeds`**, deterministically, in source order, with a clear winner rule (later layers supersede earlier).
- **The suggestion workflow becomes override-patch oriented.** `CapabilityOntologySuggestionReport` should eventually propose patches to `.rekon/capability-ontology.overrides.json`, not encourage authoring the full ontology by hand. The apply step itself remains deferred behind a separate decision memo.
- **`CapabilityMap` integration remains deferred** until canon + overrides + suggestions produce stable high-confidence normalized claims.
- **No LLM-only normalization.** The canon is deterministic and Rekon-maintained.
- **No source-write apply.** This decision is strategy-only and does not change runtime behavior.

The recommended next implementation slice is **capability ontology canon packs v1** — implement the canon pack registry, ship a small initial set (`base`, `nextjs-app`, `library-package`, `monorepo`), update the loader to read `.rekon/capability-ontology.overrides.json`, and rewire `EffectiveCapabilityOntology` to compile in the documented order.

## Why This Decision Exists

The shipped track to date is correct in shape (raw → normalized projection → operator review → preview-only suggestions → publication surfacing) but wrong in posture. The previous *Capability Ontology Suggestion Safety Review* selected manual editing of `.rekon/capability-ontology.json` as the operator-control boundary "for now." The follow-up *Capability Ontology Config Authoring Guide + Review-Loop Quickstart* documented that manual path.

Re-evaluating against Rekon's product purpose:

- Rekon's job is to **understand purpose across arbitrary repos**.
- If operators must hand-author a canonical vocabulary before normalization works, Rekon does not deliver that purpose out of the box.
- Classic `codebase-intel` already pointed at the right shape: a Rekon-maintained baseline + workspace overrides, not a from-scratch author-everything model.
- Real-target dogfood from the built-in baseline coverage review showed 5,558 / 9,110 candidates land as `unknown` on a representative Next.js TS app. That is too high a manual lift to expect of every operator on every new repo.

Manual editing must remain possible as an emergency escape hatch (the existing authoring guide + quickstart cover that). But the **product model** has to give operators a working baseline on day one.

## Classic Layered Model Preserved

Classic `codebase-intel` carried this exact split:

- A Rekon-maintained baseline ontology (canonical verbs, nouns, aliases, categories).
- Workspace overrides that supersede or extend the baseline.
- A merge model that compiled an effective ontology from baseline + workspace + system-derived seeds.

This memo preserves that layered split inside Rekon's eight-layer translation model (from the *Capability Ontology Translation Layer Decision*) by inserting two refinements:

- **Layer 3 splits into "built-in canon"** and **archetype overlays** (a small set of packs that are still Rekon-maintained).
- **Layer 5 (repo override file) is renamed** to make the operator's responsibility clearer.

The macro five-layer boundary (`EvidenceGraph → CapabilityOntology → CapabilityNormalizationReport → CapabilityMap → RefactorPreservationContract`) is unchanged. Do not flatten the ontology into a single config / report layer.

## Current Rekon Ontology Loop

Today, the loop is:

```text
rekon refresh                                    → EvidenceGraph
rekon capability ontology normalize              → CapabilityNormalizationReport
rekon capability ontology review suggestions     → (read-only aggregator)
rekon capability ontology review decide          → CapabilityNormalizationReviewLedger
rekon capability ontology suggestions            → CapabilityOntologySuggestionReport
rekon publish architecture / agent-contract      → Publications (read-only surface)
[manual]  edit .rekon/capability-ontology.json   ← the entire baseline is the operator's burden
rerun normalize
```

The bug is the last manual step: the operator must invent the canonical vocabulary themselves. That is what this decision changes.

The new loop (after the canon-packs-v1 implementation lands) is:

```text
rekon refresh                                    → EvidenceGraph
rekon capability ontology normalize              → CapabilityNormalizationReport
  ↑ uses canon + archetype overlays + (optional) overrides

rekon capability ontology review {…}             → ReviewLedger (unchanged)
rekon capability ontology suggestions            → SuggestionReport (unchanged shape; future versions propose override patches)

[optional, fallback]  edit .rekon/capability-ontology.overrides.json
rerun normalize
```

Manual editing remains available; it is no longer the only way to make the loop useful.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| Manual config authoring | **Rejected** | Creates too much manual administration. Contradicts Rekon's purpose of understanding arbitrary repos out of the box. |
| One global built-in ontology | **Rejected** | Different repo archetypes use different capability language. A monorepo, a Next.js app, and a CLI all read differently. |
| Canon packs + repo overrides | **Selected** | Preserves a useful baseline while letting repos add local terms. Matches classic codebase-intel's layered model. |
| Auto-apply suggestions into overrides | **Deferred** | Config mutation needs explicit operator approval, patch preview, and a dedicated safety review. Defer behind a separate decision memo. |
| LLM-generated ontology | **Rejected** | LLM-only normalization is not truth in v1. The canon must be deterministic and inspectable. |

## Recommendation

Ship the canon + override model in three phases:

1. **Canon pack registry + minimal pack set.** Implement loading of named packs (`base`, plus a few archetype overlays). Implement `extends` selection from the override file. Replace the current free-form `verbs`/`nouns` config with a clear "canon vs. overrides" split. Rewire `EffectiveCapabilityOntology` to compile in the documented source order.
2. **Pack-aware suggestion proposals.** Update `CapabilityOntologySuggestionReport` so it proposes patches to the **overrides file**, not the entire canonical set. Most operators will only ever propose alias additions; the canonical token list stays Rekon-managed.
3. **Apply path decision.** Once canon + overrides + override-patch suggestions are stable across multiple operator targets, draft a separate decision memo for an operator-approved apply command. It would require an explicit confirmation token, pre / post override-file diff, and a dedicated safety review.

`CapabilityMap` integration (Layer 6) remains deferred until vocabulary expansion through canon + overrides reaches steady state.

## Canon Pack Model

Rekon ships a small set of canonical packs. Each pack is a JSON document built into the `@rekon/capability-ontology` package (read-only from outside). A pack defines:

- canonical verbs;
- verb aliases;
- verb categories;
- canonical nouns;
- noun aliases;
- noun categories;
- roles (controller / service / handler / view / repository / …);
- patterns (CRUD / REST route / background job / validator / …);
- package + framework conventions (e.g. Next.js route handlers, Express handlers, NestJS controllers);
- noise terms (HTTP method constants, framework helpers that are not capabilities).

Initial candidate packs:

| Pack | Purpose |
| --- | --- |
| `base` | common capability language; default canonical verbs / nouns / roles / patterns shared across repos. |
| `nextjs-app` | route / app / front-end conventions specific to Next.js applications. |
| `backend-api` | handlers / services / providers / API conventions. |
| `library-package` | exported package capability language (publishable npm packages, SDKs). |
| `cli-tooling` | CLI / tooling conventions (commands, subcommands, runners). |
| `monorepo` | workspace / package ownership language. |
| `fullstack-layered` | server / client / shared layer conventions in fullstack repos. |
| `test-fixture-heavy` | repos dominated by tests / fixtures / mock harnesses. |
| `data-etl` | data / ETL / pipeline conventions. |

v1 selection:

- **`base`** — always loaded.
- **`nextjs-app`**, **`library-package`**, **`monorepo`** — selected by `extends` in the override file or by future automatic archetype detection. v1 will require the operator to set `extends`; later phases can infer it from the repo contract / observed package + framework facts.

## Override File Model

The override file is **renamed** to make the operator's role unambiguous:

```text
.rekon/capability-ontology.overrides.json
```

This name tells the operator: you are not defining the whole ontology; you are overriding Rekon's canon.

Shape:

```json
{
  "version": "0.1.0",
  "extends": ["base", "nextjs-app"],
  "verbs": {
    "aliases": {
      "ensure": "validate",
      "hydrate": "load"
    }
  },
  "nouns": {
    "canonical": ["workspace"],
    "aliases": {
      "screen": "view"
    }
  },
  "noise": {
    "nouns": ["figma"],
    "candidates": ["src/index.ts"]
  }
}
```

| Override Area | Behavior |
| --- | --- |
| `extends` | selects pack overlays in source order |
| canonical terms (`verbs.canonical`, `nouns.canonical`) | **extend** canon — never remove canonical entries |
| aliases (`verbs.aliases`, `nouns.aliases`) | **supersede** canon aliases when the alias key collides; otherwise extend |
| noise (`noise.nouns`, `noise.candidates`) | **suppress suggestion noise** — these terms stop appearing in `CapabilityOntologySuggestionReport`; they do **not** delete raw evidence in `EvidenceGraph` |

Rules:

- The override file is **optional**. If absent, Rekon uses canon + the operator's prior `extends` choice (or just `base`).
- Rekon never creates or mutates this file automatically in v1.
- JSON only in v1. YAML is not supported.
- Missing canonical targets in alias values do not block loading; the resulting candidate normalizes as `unknown-verb` / `unknown-noun` if no canonical entry is present.
- Noise suppression is a suggestion-side mechanism only. The raw EvidenceGraph fact remains intact.

The legacy file path `.rekon/capability-ontology.json` continues to be loaded for one release as a back-compat alias when no overrides file exists, then gets a deprecation log warning, then is removed in a later slice. The deprecation path is out of scope for this memo and is documented in the canon-packs-v1 implementation slice.

## EffectiveCapabilityOntology Compilation

Compilation order, with later layers superseding earlier:

1. **Built-in canon (`base` pack).** Always loaded.
2. **Archetype overlays.** In `extends` order from the override file (if present) or from a future automatic archetype-detection helper.
3. **Repo-local overrides** from `.rekon/capability-ontology.overrides.json`.
4. **System seeds.** Small Rekon-controlled set (e.g. `build`, `deploy`, `test`, `lint`) reserved for cross-repo verbs that should always be canonical.

Reference type sketch (v1 implementation will finalize):

```ts
type EffectiveCapabilityOntology = {
  version: string;
  source: {
    basePack: string;
    overlayPacks: string[];
    overridePath?: string;
    overrideHash?: string;
    systemSeedCount: number;
  };
  verbs: {
    canonical: string[];
    aliasToCanonical: Record<string, string>;
    categoryByCanonical: Record<string, string>;
  };
  nouns: {
    canonical: string[];
    aliasToCanonical: Record<string, string>;
    categoryByCanonical: Record<string, string>;
    noise: string[];
    autoMapThreshold: number;
  };
  roles: {
    canonical: string[];
    aliasToCanonical: Record<string, string>;
  };
  patterns: {
    canonical: string[];
    aliasToCanonical: Record<string, string>;
  };
};
```

Determinism rules:

- Effective compilation must be stable: same canon + same overrides + same system seeds → same effective hash.
- The `source` block records exactly which packs and overrides contributed, so `CapabilityNormalizationReport` can cite the compiled ontology source.
- Sorting is canonical (alphabetical, case-insensitive normalization) inside every set so the resulting hash is comparable across runs and across operator machines.

## Suggestion Workflow Revision

Today:

```text
ReviewLedger → SuggestionReport → manual edit of the entire config
```

Target:

```text
ReviewLedger → SuggestionReport → OverridePatchPreview → operator-approved apply
```

Until the apply slice ships, the operator path is:

1. Operator runs `rekon capability ontology review decide` to triage unknowns.
2. `rekon capability ontology suggestions` produces a `CapabilityOntologySuggestionReport`. v2 of this report will render its `preview.patch` against `.rekon/capability-ontology.overrides.json`, not against the entire config.
3. Operator manually merges the proposed override patch into the overrides file. This is the fallback path documented in
   [`docs/beta/capability-ontology-config-authoring-guide.md`](../beta/capability-ontology-config-authoring-guide.md)
   and
   [`docs/beta/capability-ontology-review-loop-quickstart.md`](../beta/capability-ontology-review-loop-quickstart.md);
   both docs will be updated to point at the overrides file rather than the legacy config.

The suggestion report shape stays preview-only. The agent contract's existing `Do Not Do` reminder still pins that suggestion entries are not applied vocabulary. Apply remains deferred.

## What This Does Not Do

- Does not ship any canonical pack. Pack content is the next slice's job.
- Does not implement `extends` resolution.
- Does not change the normalizer behavior.
- Does not change the suggestions CLI behavior.
- Does not change publication behavior.
- Does not rename or move `.rekon/capability-ontology.json` yet. The rename to `.rekon/capability-ontology.overrides.json` ships with the canon-packs-v1 implementation slice, alongside a back-compat alias and deprecation path.
- Does not add an apply command.
- Does not register a new artifact type.
- Does not register a new capability role or permission.
- Does not mutate `EvidenceGraph` raw facts.
- Does not mutate `CapabilityMap`.
- Does not mutate any source file or any artifact.
- Does not bump versions.
- Does not publish to npm.
- Does not add a git tag or GitHub Release.
- Does not create a branch.

## Implementation Sequence

| Step | Slice | Status |
| --- | --- | --- |
| 1 | **Capability Ontology Canon + Override Model Decision** (this memo) | ✅ Shipped |
| 2 | Capability ontology canon packs v1 — implement `base` pack + the v1 archetype set (`nextjs-app`, `library-package`, `monorepo`), implement `extends` resolution, rename loader target to `.rekon/capability-ontology.overrides.json` with a back-compat alias for the legacy path. Update `EffectiveCapabilityOntology.source` to record `basePack` + `overlayPacks`. | ✅ Shipped |
| 3 | Suggestion-report-v2 — render `preview.patch` against the overrides file (not the entire config). Skip canonical-token suggestions when the term is already canonical in any selected pack. | After step 2 |
| 4 | Automatic archetype detection — infer `extends` from the repo contract / observed package + framework facts when the override file is absent or omits `extends`. | After step 3 |
| 5 | Override apply decision memo — only after step 4 lands and operator dogfood produces evidence that manual override merging is painful. Apply implementation gates on confirmation token + override-file diff + dedicated safety review. | Deferred |
| 6 | `CapabilityMap` v2 — gated on stable canon + overrides + apply path. **Now additionally gated on the [CapabilityPhrase architecture decision](capability-phrase-contract-architecture-decision.md):** v2 consumes only stable, confidence-scored `CapabilityPhrase` claims, never raw normalization rows. | Deferred |
| 7 | **CapabilityPhrase + CapabilityContract Architecture Decision** — reserve the semantic primitive between `CapabilityNormalizationReport` and `CapabilityMap` v2; pin v1 phrase field shape; defer `CapabilityContract` to a separate future memo. | ✅ Shipped |
| 8 | **CapabilityPhraseReport Decision** — commit to **Option B**: emit `CapabilityPhrase` v1 as a separate `CapabilityPhraseReport` artifact, not enrichment of `CapabilityNormalizationReport`. See [the memo](capability-phrase-report-decision.md). | ✅ Shipped |
| 9 | CapabilityPhraseReport v1 — register the artifact, implement deterministic projection from high-confidence normalized candidates, cite normalization + EvidenceGraph in `inputRefs`. v1 required fields only. | Next slice (recommended) |

Steps 2 – 4 are the next implementation work. Step 1 lands now as a strategy decision.

## See Also

- [Capability Ontology Architecture Impact Review](capability-ontology-architecture-impact-review.md)
- [Capability Ontology Translation Layer Decision](capability-ontology-translation-layer-decision.md)
- [Built-In Baseline Ontology Coverage Review](builtin-ontology-coverage-review.md)
- [`CapabilityNormalizationReport` artifact reference](../artifacts/capability-normalization-report.md)
- [`CapabilityNormalizationReviewLedger` artifact reference](../artifacts/capability-normalization-review-ledger.md)
- [`CapabilityOntologySuggestionReport` artifact reference](../artifacts/capability-ontology-suggestion-report.md)
- [Capability Ontology Suggestion Safety Review](capability-ontology-suggestion-safety-review.md)
- [Capability Ontology Config Authoring Guide](../beta/capability-ontology-config-authoring-guide.md) — fallback / emergency manual path.
- [Capability Ontology Review-Loop Quickstart](../beta/capability-ontology-review-loop-quickstart.md) — fallback / emergency manual path.
- [Capability ontology concept](../concepts/capability-ontology.md)
- [Roadmap](roadmap.md)
- [Classic-behaviour roadmap](classic-behavior-roadmap.md)
