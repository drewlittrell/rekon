# Review Packet — Semantic File Understanding Scan Integration (slice 147)

Base: `7ab666b`. Product capability batch (Track A). Integrates
`SemanticFileUnderstandingReport` into `rekon scan` as an explicit opt-in
semantic scan layer. Reverses the slice-146 "batch command first" direction.

## CHANGES MADE

- `packages/cli/src/index.ts`:
  - `rekon scan` gains `--semantic-files off|auto|required`, `--llm-provider`,
    `--llm-model`, `--semantic-file-limit <n>`, `--semantic-file-path <path>`,
    `--semantic-changed-only`. Default `off`.
  - New `runSemanticScanLayer(...)` (selection → reuse → required-preflight →
    write), `collectSemanticScanCandidates(root)` (conservative file walk),
    `produceSemanticFileUnderstandingReport(store, input)` (shared producer),
    and `semanticScanPathHashSegment` / `semanticScanPolicyHashFromArtifactId`
    (reuse-key helpers).
  - `semanticFiles` summary added to scan JSON **only when** `--semantic-files`
    is present (plain scan output unchanged). Human output adds one
    `Semantic files: ...` line when present. Exit non-zero on required failure.
  - `rekon semantic file understand --path` refactored to use the shared
    producer (de-dup, same behavior).
  - `usage()` scan line + welcome "Analysis:" updated; the single-file command
    line is retained.
- `packages/capability-model/src/semantic-file-understanding-report.ts`:
  - `BuildSemanticFileUnderstandingReportInput` gains optional `artifactId`; the
    builder uses it when present, else the existing timestamp-derived id. This is
    additive; the single-file path passes no `artifactId` and is unchanged.

## PUBLIC API CHANGES

- New CLI flags on `rekon scan` (additive). Default keeps plain scan identical.
- `buildSemanticFileUnderstandingReport` accepts an optional `artifactId`
  (additive, backward compatible).
- No new packages, no removed exports, no version bumps.

## PURPOSE PRESERVATION CHECK

- Original problem: the old codebase-intel treated semantic file understanding as
  part of the scan layer; Rekon needs it integrated into scan without surprising
  provider calls, while a separate per-file command is wrong as the primary path.
- Preserved: `rekon scan` remains deterministic by default; `--semantic-files
  auto|required` explicitly enables semantic file reports; source text is only
  sent to a provider after explicit operator opt-in; reports are proposal/context,
  not proof; deterministic facts remain authoritative for imports/exports; no
  source files modified; no commands executed; no embeddings generated.

## SOURCE REVIEW

Grounded at `7ab666b` (kernel comments contain an em dash → `grep -a`):

- `rekon scan` (cli ~line 561) ran `runRefresh(root, {})` only; no semantic flags.
- `runRefresh` does not expose the walked file list → the layer uses its own
  conservative walk.
- `createLocalArtifactStore.write` keys files by `${type}-${artifactId}` and
  upserts the index by `${type}:${artifactId}` → duplicate ids overwrite, so each
  batched file needs a unique id (drove the optional-`artifactId` builder change).
- `store.list(type)` returns refs in write order; `.read(ref)` loads the report →
  latest-by-path reuse map built from prior reports.
- `createSemanticFileUnderstandingAdapter(mode, provider, model)` never throws and
  never decides modes (returns `{}` with no key) → reused as-is, built once.

## SCAN INTEGRATION MODEL

Deterministic substrate (`runRefresh`) always runs. The semantic layer runs after
it, only when `--semantic-files` is present and not `off`. `rekon refresh` is
unchanged; `rekon scan` is the only verb that gains the semantic flags.

## FILE SELECTION MODEL

Allow-list extensions; exclude `node_modules` / `dist` / `build` / `coverage` /
`.git` / `.rekon`, lockfiles, files > 256 KiB, and binary (NUL-byte) files.
Sorted for determinism. `--semantic-file-path` analyzes a single explicit path
(bypassing allow-list/lockfile filters). `--semantic-file-limit` caps selection
(default 100). `--semantic-changed-only` restricts to missing/stale files.

## SEMANTIC MODE MODEL

`off` → no reports. `auto` → report per file; provider when available, else
deterministic fallback with warning (`provider-unavailable`), exit 0. `required`
→ provider availability preflighted before any write; missing provider/key exits
non-zero and writes nothing (no partial writes, no false success).

## REUSE / STALENESS MODEL

Reuse iff content `sha256` unchanged AND policy (mode + provider + model)
unchanged. Content change → new report. Provider/model change → policy change →
new report. The reuse policy is encoded in the artifact id
(`<prefix><pathHash>-<policyHash>-<idStamp>`) and compared against the prior
report's `file.sha256` + parsed policy segment.

## CLI SURFACE

`rekon scan [--semantic-files off|auto|required] [--llm-provider <id>]
[--llm-model <model>] [--semantic-file-limit <n>] [--semantic-file-path <path>]
[--semantic-changed-only] [--root <path>] [--json]`. `rekon semantic file
understand --path <file> ...` retained.

## BOUNDARY MODEL

Executes no commands; writes no source files; generates no embeddings; creates no
PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun /
VerificationResult; runs no Circe; approves no plans; does not implement
intent:go. Report boundary booleans forced false by factory, rejected if
non-false by validator. Embeddings remain a separate, deferred track.

## TESTS / VERIFICATION

- `tests/contract/semantic-file-understanding-scan-integration.test.mjs` — 26
  assertions, all pass (keyless).
- `tests/docs/semantic-file-understanding-scan-integration.test.mjs` — docs
  invariants.
- Full 9-command gate green; keyless CLI smoke matrix (plain / off / auto-fallback
  / required-block / reuse / sha-change / policy-change / limit / file-path /
  artifacts-validate / source-unchanged) confirmed.

## INTENTIONALLY UNTOUCHED

`rekon refresh` semantics; the deterministic substrate (EvidenceGraph /
CapabilityMap / IntelligenceSnapshot); intent context consumption of reports
(deferred); WorkOrder / VerificationPlan gates; npm publish; package versions.

## RISKS / FOLLOW-UP

- `--semantic-changed-only` and reuse read prior reports once per scan; on very
  large histories this is O(reports). Acceptable for v1; could index later.
- Required-mode preflight is a deterministic availability check (provider
  configured + key present), not a live provider ping; a present-but-invalid key
  surfaces as a per-file failure (counted, exit non-zero) rather than at preflight.
- Follow-up: **Semantic File Understanding Scan Integration Safety Review**, then
  a Semantic File Understanding Intent Context Decision (or the embeddings track).

## NEXT STEP

Recommended: **Semantic File Understanding Scan Integration Safety Review**.
