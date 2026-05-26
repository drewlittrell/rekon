# Review Packet — Capability Ontology Canon Packs v1

Implementation slice landing the canon + override model decision
shipped at `d9716f9`. Rekon now compiles every
`EffectiveCapabilityOntology` from built-in canonical ontology
packs plus optional repo-local overrides.

## CHANGES MADE

- **New `packages/capability-ontology/src/packs/` directory** with
  four built-in packs:
  - `base.ts` — common capability language across most repos
    (canonical verbs `get` / `create` / `validate` / `render` /
    etc., canonical nouns `user` / `route` / `service` / etc.,
    aliases for repo phrasing onto the canonical token, noise
    terms `maybe` / `todo`).
  - `nextjs-app.ts` — route / app / front-end conventions
    (`render` / `hydrate` / `navigate` / `revalidate` /
    `prefetch`; nouns `page` / `layout` / `component` /
    `loader` / `metadata` / `segment` / `cache` / `region`).
  - `library-package.ts` — exported package / library
    conventions (verbs `export` / `import` / `expose`; nouns
    `api` / `client` / `sdk` / `package` / `module` / `entry`
    / `adapter` / `plugin` / `schema` / `type`; roles
    `barrel` / `adapter` / `plugin` / `facade`).
  - `monorepo.ts` — workspace / package / ownership language
    (verbs `link` / `compose` / `orchestrate` / `coordinate`;
    nouns `workspace` / `package` / `project` / `graph` /
    `dependency` / `boundary` / `scope` / `task` / `pipeline`).
  - `types.ts` — shared `CapabilityOntologyPack` shape
    (`id` / `version` / `description` / `isBase` / verbs /
    nouns / roles / patterns each with canonical entries +
    aliases; verbs and nouns also have optional `noise`).
  - `index.ts` — pack registry + `resolvePacks(overlayIds)`
    helper. `BUILTIN_CANON_PACKS` is the v1 ship set.
- **Refactored `BUILTIN_VERBS` / `BUILTIN_NOUNS` /
  `BUILTIN_ROLES` / `BUILTIN_PATTERNS`** constants in
  `packages/capability-ontology/src/index.ts` to derive from the
  `base` pack so the source-of-truth lives in
  `src/packs/base.ts`. `BUILTIN_CAPABILITY_ONTOLOGY` is
  preserved as a public export for back-compat.
- **`compileEffectiveCapabilityOntology` rebuilt** to consume
  packs + overrides:
  - Resolves overlay packs from `config.extends` (when present)
    or from caller-supplied `overlayPackIds`; base pack is
    always included implicitly.
  - Walks every selected pack and merges canonical entries,
    aliases, categories, noise.
  - Applies override-config canonical entries (extends),
    aliases (supersedes on key collision), categories, and
    noise (extends) on top of the pack-derived vocabulary.
  - Records `EffectiveCapabilityOntologySource` metadata:
    `builtinVersion`, `basePack`, `overlayPacks`,
    `overridePath`, `overrideHash`, `overrideKind`,
    `legacyOverrideIgnored`, `systemSeedCount`, plus
    legacy aliases `configPath` / `configHash`.
- **Override loader rewritten.** `loadCapabilityOntologyConfig`
  now prefers `.rekon/capability-ontology.overrides.json` and
  falls back to legacy `.rekon/capability-ontology.json`. When
  both exist, the canonical file wins and the result records
  `legacyOverrideIgnored: true`. Returns `overrideKind:
  "canonical-override" | "legacy-compat"`.
- **`detectOverlayPacks(repoRoot)`** added — conservative
  auto-detection from `package.json` + repo paths
  (`next` / `app|pages` → `nextjs-app`; `workspaces` /
  `pnpm-workspace.yaml` / `packages/*` → `monorepo`;
  library exports without app pattern → `library-package`).
  Returns both `packIds` and the underlying signals.
- **Config schema extended** — `CapabilityOntologyConfig` now
  accepts `extends?: string[]`, `verbs.noise?: string[]`,
  `nouns.noise?: string[]`, and top-level
  `noise?: { verbs?, nouns?, candidates? }`. Validator rejects
  malformed `extends` / `noise`.
- **`CapabilityNormalizationReport.ontology`** widened with
  optional `basePack`, `overlayPacks`, `overridePath`,
  `overrideHash`, `overrideKind`, `legacyOverrideIgnored`,
  `systemSeedCount` fields. Legacy `configPath` / `configHash`
  preserved as aliases for `overridePath` / `overrideHash`.
- **`CapabilityOntologySuggestionPreview.configPath`** type
  narrowed to the literal
  `".rekon/capability-ontology.overrides.json"`. The
  `buildSuggestionPreview` helper now emits the canonical
  path and an updated message clarifying that suggestions
  propose override-file changes, not canon edits.
- **`@rekon/capability-ontology.projector`** + the CLI
  `rekon capability ontology normalize` command now call
  `detectOverlayPacks(repoRoot)` and pass the detection result
  + override-loader output into the compiler.
- **`@rekon/capability-ontology` exports** widened to
  surface `BASE_PACK_ID`, `BUILTIN_CANON_PACKS`, `basePack`,
  `nextjsAppPack`, `libraryPackagePack`, `monorepoPack`,
  `CANON_PACK_VERSION`, `CapabilityOntologyPack`,
  `CapabilityOntologyPackVerbEntry`,
  `CapabilityOntologyPackNounEntry`,
  `CapabilityOntologyPackNamedEntry`, `resolvePacks`,
  `getBuiltinCanonPack`, `listBuiltinCanonPackIds`,
  `detectOverlayPacks`, `CAPABILITY_ONTOLOGY_OVERRIDES_PATH`,
  `CAPABILITY_ONTOLOGY_LEGACY_PATH`,
  `EffectiveCapabilityOntologySource`.
- **23-assertion contract test**
  `tests/contract/capability-ontology-canon-packs.test.mjs`
  pins pack existence, deterministic compilation, override
  precedence, legacy fallback, suggestion-preview target,
  dedupe, unknown-pack rejection, `extends` selection, report
  metadata, CapabilityMap / EvidenceGraph non-mutation, and
  artifacts-validate cleanliness.
- **13-assertion docs test**
  `tests/docs/capability-ontology-canon-packs.test.mjs` pins
  doc coverage of the canon + override posture.
- **`tests/contract/capability-normalization-report.test.mjs`**
  updated: the alias-resolution test now uses
  `retrieve` → `get` instead of the now-canonical `fetch` →
  `get` (since `fetch` is canonical in the new base pack).
- **Doc updates:**
  - `docs/concepts/capability-ontology.md` — reframed
    What v1 Ships + Operator Overrides sections to canon +
    override; added legacy compatibility callout; added
    `CapabilityMap` deferred pin.
  - `docs/artifacts/capability-normalization-report.md` —
    schema table extended with `basePack` / `overlayPacks` /
    `overridePath` / `overrideHash` / `overrideKind` /
    `legacyOverrideIgnored` / `systemSeedCount`. Operator
    workflow updated to reference the overrides path.
  - `docs/artifacts/capability-ontology-suggestion-report.md`
    — intro reframed; schema row for
    `preview.configPath` updated to the overrides path.
  - `docs/strategy/capability-ontology-canon-override-model-decision.md`
    — implementation-sequence row 2 marked ✅ Shipped.
  - `CHANGELOG.md` — new top entry for Canon Packs v1.

## PUBLIC API CHANGES

- **`CapabilityOntologyConfig`** gains:
  - `extends?: string[]`
  - `verbs.noise?: string[]`
  - `nouns.noise?: string[]`
  - `noise?: { verbs?, nouns?, candidates? }`
- **`EffectiveCapabilityOntologySource`** (new exported type):
  `builtinVersion`, `basePack`, `overlayPacks`,
  `overridePath?`, `overrideHash?`, `overrideKind?`,
  `legacyOverrideIgnored?`, `systemSeedCount`, plus legacy
  aliases `configPath?` / `configHash?`.
- **`EffectiveCapabilityOntology.verbs.noise: string[]`** and
  `EffectiveCapabilityOntology.nouns.noise: string[]` added.
- **`CompileEffectiveCapabilityOntologyInput`** gains
  `overrideKind?`, `legacyOverrideIgnored?`, `overlayPackIds?`.
- **`LoadOntologyConfigResult.overrideKind`** +
  `LoadOntologyConfigResult.legacyOverrideIgnored` added (only
  on the `found: true` branch).
- **`CapabilityOntologySuggestionPreview.configPath`** literal
  type changed from `.rekon/capability-ontology.json` to
  `.rekon/capability-ontology.overrides.json`.
- **`CapabilityNormalizationReport.ontology`** gains optional
  `basePack`, `overlayPacks`, `overridePath`, `overrideHash`,
  `overrideKind`, `legacyOverrideIgnored`, `systemSeedCount`.
  Existing `source` / `configPath` / `configHash` /
  `effectiveHash` fields are preserved.
- **New exports** from `@rekon/capability-ontology`:
  `BASE_PACK_ID`, `BUILTIN_CANON_PACKS`, `basePack`,
  `nextjsAppPack`, `libraryPackagePack`, `monorepoPack`,
  `CANON_PACK_VERSION`, `CapabilityOntologyPack`,
  `CapabilityOntologyPackVerbEntry`,
  `CapabilityOntologyPackNounEntry`,
  `CapabilityOntologyPackNamedEntry`, `resolvePacks`,
  `getBuiltinCanonPack`, `listBuiltinCanonPackIds`,
  `detectOverlayPacks`, `CAPABILITY_ONTOLOGY_OVERRIDES_PATH`,
  `CAPABILITY_ONTOLOGY_LEGACY_PATH`,
  `EffectiveCapabilityOntologySource`,
  `CapabilityOntologyOverrideKind`.

## PURPOSE PRESERVATION CHECK

- The ontology layer's purpose is to translate arbitrary repo
  language into canonical capability language. Canon packs +
  overrides preserve that purpose by:
  - shipping a meaningful canonical vocabulary out of the box
    (operators no longer start from an empty baseline);
  - giving operators an explicit override mechanism that
    extends or supersedes canon without rewriting it;
  - recording the exact base pack + overlay set + override
    file in every report so the audit trail is intact;
  - never auto-creating or auto-mutating the override file —
    the operator is still the canonical author of repo-local
    additions.
- Built-in canon packs do **not** modify the
  `CapabilityNormalizationReviewLedger` semantics. Operator
  decisions still surface as audit signal; only the
  suggestion-preview target changed.
- `CapabilityMap` integration remains deferred until
  high-confidence normalized claims stabilize.

## CODEBASE-INTEL ALIGNMENT

- Canon + override is the steady-state product model selected
  in the [canon + override decision memo](../../docs/strategy/capability-ontology-canon-override-model-decision.md).
  This slice implements the next-slice recommendation of that
  memo (canon-packs-v1).
- Manual editing of the override file remains the operator-
  control boundary. The
  [authoring guide](../../docs/beta/capability-ontology-config-authoring-guide.md)
  and
  [review-loop quickstart](../../docs/beta/capability-ontology-review-loop-quickstart.md)
  are now fallback / emergency references.
- `CapabilityOntologySuggestionReport` proposes patches against
  the canonical overrides path; the suggestion safety review
  posture (preview-only, never mutates the config file) is
  preserved.

## CANON PACK MODEL

| Pack id | Purpose | Selection trigger |
| --- | --- | --- |
| `base` | Common capability language across most repos. Always included. | Implicit (always) |
| `nextjs-app` | Route / app / front-end conventions. | `next` dependency, or `app/`, or `pages/` (incl. `src/app`, `src/pages`) |
| `library-package` | Exported package / library conventions. | `package.json` declares `exports` / `main` / `module` / `types` AND no nextjs signal |
| `monorepo` | Workspace / package / ownership conventions. | `package.json workspaces`, `pnpm-workspace.yaml`, or `packages/` directory |

Each pack defines: `id`, `version`, `description`, `isBase`
(only on base), and optional `verbs` / `nouns` / `roles` /
`patterns`. Verbs and nouns may also declare `noise` terms.

Pack content is intentionally conservative for v1.

## OVERRIDE MODEL

| Override field | Behavior |
| --- | --- |
| `extends` (string[]) | Selects overlay packs explicitly. `base` always included. Unknown ids fail clearly. Duplicates dedupe. When present, supersedes caller-supplied auto-detection. |
| `verbs.canonical` / `nouns.canonical` | Extends pack canonical entries. |
| `verbs.aliases` / `nouns.aliases` | Supersedes pack alias keys on collision. |
| `verbs.categories` / `nouns.categories` | Extends / supersedes per-key. |
| `verbs.noise` / `nouns.noise` / `noise.{verbs,nouns,candidates}` | Extends pack noise. Noise suppresses suggestion noise, not raw evidence. |
| `roles` / `patterns` | Extend pack entries. |

Override file lookup order:

1. `.rekon/capability-ontology.overrides.json` (canonical).
2. `.rekon/capability-ontology.json` (legacy compatibility,
   read only when overrides is absent).

When both exist, the canonical file wins and
`source.legacyOverrideIgnored = true`. **No automatic
migration.**

## EFFECTIVE ONTOLOGY SOURCE

`EffectiveCapabilityOntology.source` now records:

```ts
{
  builtinVersion: "0.1.0",
  basePack: "base",
  overlayPacks: ["nextjs-app", "library-package", "monorepo"],
  overridePath?: ".rekon/capability-ontology.overrides.json",
  overrideHash?: "<16-char SHA prefix>",
  overrideKind?: "canonical-override" | "legacy-compat",
  legacyOverrideIgnored?: true,
  systemSeedCount: 3,
  // legacy aliases:
  configPath?: <same as overridePath>,
  configHash?: <same as overrideHash>,
}
```

`CapabilityNormalizationReport.ontology` surfaces the same
fields (additive optional) so the audit trail is complete in
every report.

## SUGGESTION PREVIEW TARGET

`CapabilityOntologySuggestionReport.preview.configPath` is now
the literal `.rekon/capability-ontology.overrides.json`. The
preview message clarifies that suggestions propose
override-file changes, not canon edits.

When the legacy `.rekon/capability-ontology.json` exists and
the canonical overrides file does not, the preview still
targets `.rekon/capability-ontology.overrides.json` — the
suggestion tool nudges operators toward the canonical path.

## TESTS / VERIFICATION

- New contract test
  `tests/contract/capability-ontology-canon-packs.test.mjs`:
  23 assertions (21 from the work order + 2 bonus).
- New docs test
  `tests/docs/capability-ontology-canon-packs.test.mjs`:
  13 assertions.
- Existing test
  `tests/contract/capability-normalization-report.test.mjs`
  alias-resolution case updated to use `retrieve` (still an
  alias of `get`) since `fetch` is now canonical.
- Full suite: 2221 → 2257+ pass after this batch.
- Build, typecheck, audit-package-exports, audit-license,
  publish-dry-run, install-smoke, install-tarball-smoke all
  green.
- CLI smoke matrix passes (refresh → normalize without
  overrides → write overrides → normalize with overrides →
  suggest → validate).

## INTENTIONALLY UNTOUCHED

- `CapabilityMap` is not mutated.
- `EvidenceGraph` is not mutated.
- `FindingReport` / `FindingFilterReport` /
  `CoherencyDelta` / `ReconciliationPlan` /
  `VerificationRun` / `VerificationResult` are unchanged.
- Memory, publication, and GitHub publisher behavior are
  unchanged.
- No new CLI subcommands; existing
  `rekon capability ontology normalize` / `review` /
  `suggestions` continue to work.
- No override-file mutation. No source writes.
- No LLM-only normalization.
- No new permission. No workflow YAML change.
- No version bump. No npm publish. No git tag. No GitHub
  Release. No new branch.

## RISKS / FOLLOW-UP

- **Risk: legacy config drift.** Repos that have a
  `.rekon/capability-ontology.json` continue to work but the
  report flags `overrideKind: "legacy-compat"`. Operators
  must rename the file manually to switch to the canonical
  path. A future deprecation slice will add a warning log
  and eventual removal.
- **Risk: auto-detection false positives.** Conservative
  thresholds reduce this; operators can override with the
  `extends` field. Detection signals are surfaced for audit.
- **Follow-up: canon-pack coverage review.** Re-run
  normalization against fixtures + real repos and compare
  unknown / low-confidence rates before / after canon packs
  to decide whether more packs are needed, the splitter
  should improve, or `CapabilityMap` v2 can begin.
- **Follow-up: override apply command.** Deferred behind its
  own decision memo + confirmation token + pre / post diff
  artifact + safety review. No code path written yet.

## NEXT STEP

Recommended: **capability ontology canon-pack coverage
review** — run normalization against the fixture and one
real repo again and compare unknown / low-confidence rates
before / after the canon packs landed. Output drives the
next decision (more packs? splitter changes? operator
review surface enough? `CapabilityMap` v2 can begin?).
