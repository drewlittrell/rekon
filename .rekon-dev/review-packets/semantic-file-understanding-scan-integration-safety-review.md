# Review Packet — Semantic File Understanding Scan Integration Safety Review (slice 148)

Base: `d3cb9a3`. Strategy/safety-review batch. Reviews the slice-147
`rekon scan --semantic-files` integration end-to-end. No runtime behavior changes.

## CHANGES MADE

- New memo `docs/strategy/semantic-file-understanding-scan-integration-safety-review.md`.
- New docs test `tests/docs/semantic-file-understanding-scan-integration-safety-review.test.mjs`.
- Cross-reference appends to 9 scope docs + `docs/releases/*` + README + CHANGELOG.
- No `.ts` source changes, no test-suite behavior changes, no package-lock change.

## PUBLIC API CHANGES

None. Documentation and a docs test only.

## PURPOSE PRESERVATION CHECK

- Original problem: semantic file understanding belongs to the scan layer but must not
  surprise operators with provider calls, must not mutate source or execute, and slice 147
  implemented explicit scan integration.
- This review confirms the integration preserves scan determinism by default and every
  semantic provider boundary: plain scan is unchanged/deterministic; semantic file
  understanding in scan is explicit opt-in; provider calls are never surprising defaults;
  source text is not sent to providers by default; auto falls back; required fails cleanly
  without partial writes; source is read-only; no command execution; no embeddings; no
  PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun / VerificationResult;
  no Circe; intent:go deferred.

## CODEBASE-INTEL ALIGNMENT

The old codebase-intelligence system ran semantic file understanding as part of its scan.
Rekon now matches that ergonomics — semantic file understanding is a scan layer — but
under stricter boundaries: it is explicit opt-in (never a default provider call), it
overrides LLM-claimed imports/exports with deterministic extraction (the hallucination
guard the old per-file pipeline also enforced), and it persists provider/model provenance.

## IMPLEMENTATION REVIEWED

Grounded at `d3cb9a3` (`grep -a` for the kernel file):
`packages/cli/src/index.ts` (scan branch, flag parse, `runSemanticScanLayer`,
`collectSemanticScanCandidates`, `produceSemanticFileUnderstandingReport`, id helpers,
usage/welcome, refactored single-file command);
`packages/capability-model/src/semantic-file-understanding-report.ts` (optional
`artifactId`); `tests/contract/semantic-file-understanding-scan-integration.test.mjs`
(26), `tests/contract/semantic-file-understanding-report.test.mjs` (23),
`tests/docs/semantic-file-understanding-scan-integration.test.mjs` (13). Raw-NUL re-check:
zero raw NUL bytes in both `.ts` files (escapes intact).

## SCAN DEFAULT REVIEW

`runRefresh` substrate always runs and is never gated on a provider. The semantic layer
runs only when `--semantic-files` is present and not `off`. The `semanticFiles` JSON key
and the human `Semantic files:` line appear only when the flag is present. Plain scan
output is unchanged.

## SEMANTIC MODE REVIEW

`off` → all-zero summary, no adapter, no reports. `auto` → report per file; no-key
fallback (deterministic + warning, `provider-unavailable`), exit 0. `required` → provider
availability preflighted before any write; unavailable → exit non-zero, no report; a
mid-batch build throw stops the loop and exits non-zero (no false success).

## FILE SELECTION REVIEW

Allow-listed extensions; exclude `node_modules` / `dist` / `build` / `coverage` / `.git` /
`.rekon`, lockfiles, files > 256 KiB, and binary (NUL-sniff) files; sorted. Flags:
`--semantic-file-limit` (cap), `--semantic-file-path` (single explicit path),
`--semantic-changed-only` (missing/stale only).

## REUSE AND STALENESS REVIEW

Reuse iff content `sha256` unchanged AND policy (mode + provider + model) unchanged.
Content change → new report. Provider/model change → new report. Policy is encoded in the
artifact id and parsed back for comparison against the prior report's `file.sha256`.

## ARTIFACT IDENTITY REVIEW

Builder gained an additive optional `artifactId`; the single-file path omits it (unchanged
timestamp scheme). Scan passes `<prefix><pathHash>-<policyHash>-<idStamp>`; distinct paths
→ distinct path hashes → unique ids, so batched reports never collide on the
`${type}-${artifactId}` store key.

## CLI REVIEW

Shared `produceSemanticFileUnderstandingReport` (category `actions`) used by both scan and
single-file command. `readFile` only; source read, not modified. CLI is the only env-key
reader. Usage lists scan flags and retains the single-file command.

## BOUNDARY REVIEW

Deterministic imports/exports authoritative; source read-only; no command execution; no
embeddings; no PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun /
VerificationResult; no Circe; intent:go deferred; not yet consumed by intent context. The
report's eight boundary booleans are forced false by the kernel factory and rejected if
non-false by the validator.

## RECOMMENDATION

**Semantic File Understanding Scan Integration is safe/stable.** Next: Semantic File
Understanding Intent Context Decision; embeddings remain a separate, later track.

## TESTS / VERIFICATION

- New docs test (33 assertions): headings, 25 statements, 4 tables, CHANGELOG mention,
  packet PURPOSE PRESERVATION CHECK.
- Re-ran the slice-147 contract (26) + docs (13) tests as part of the full suite.
- Full 9-command gate (typecheck, test, build, diff-check, exports, license, publish,
  install, tarball). No CLI smoke (strategy-only batch).

## INTENTIONALLY UNTOUCHED

All `.ts` source; the scan integration; the deterministic substrate; intent-context
consumption; WorkOrder / VerificationPlan gates; npm publish; package versions.

## RISKS / FOLLOW-UP

- Reuse / `--semantic-changed-only` read prior reports once per scan — O(reports) on large
  histories; could index later.
- Required-mode preflight is a deterministic availability check, not a live provider ping;
  a present-but-invalid key surfaces as a per-file failure (counted, exit non-zero).
- Follow-up: Semantic File Understanding Intent Context Decision (or the embeddings track).

## NEXT STEP

Recommended: **Semantic File Understanding Intent Context Decision**.
