# Agent Contract Export Command

## Batch Summary

Adds `rekon agent-contract export --output <path> [--force] [--root <path>] [--json]` so operators can materialize the latest `agent-contract` `Publication` to a chosen path under the repo root with safe-by-default behavior. The command never writes outside the repo root, never silently overwrites existing files, requires `--force` for protected agent-instruction paths (`AGENTS.md`, `CLAUDE.md`, `.cursor/rules/*.md`, `.github/copilot-instructions.md`), and stamps the exported file with a generated preamble citing the source Publication and pointing back to `.rekon/artifacts` as canonical truth. No artifact-shape, kernel, SDK, or capability changes. No new publisher. No source writes. No automatic AGENTS.md mutation. No version bump. No npm publish.

This is the follow-up to the v1 agent operating contract publication batch (`c551486`). The `next slice` recorded in `docs/strategy/classic-subsystem-purpose-map.md` for subsystem 9 (Generated Docs / Agent Docs) was "optional export/install command". This batch ships that slice.

## CHANGES MADE

- `packages/cli/src/index.ts`
  - Added imports from `node:fs/promises` (`access`, `mkdir`, `readFile`, `writeFile`) and `node:path` (`dirname`, `isAbsolute`, `relative`, `resolve`).
  - Declared `PROTECTED_AGENT_DOC_BASENAMES` (`Set<string>`) and `PROTECTED_AGENT_DOC_RELATIVE_PATTERNS` (`ReadonlyArray<RegExp>`) at the top of the file so they are initialized before the module-load `main()` invocation runs synchronously up to its first `await`.
  - Added new `if (command === "agent-contract" && subcommand === "export")` dispatch branch in `main()` calling `runAgentContractExport(root, { outputPath, force })`.
  - Added `AgentContractExportOptions` and `AgentContractExportResult` types.
  - Implemented `runAgentContractExport()`: resolves the absolute output path, refuses any path that escapes the repo root (`relative()` starts with `..` or is absolute), refuses protected agent-doc paths without `--force`, refuses existing files without `--force`, auto-publishes via `runtime.runPublish({ publisherId: "@rekon/capability-docs.agent-contract" })` when no `agent-contract` `Publication` exists yet, reads the latest such `Publication` from the artifact store, prepends a generated preamble, writes through `mkdir` (recursive) + `writeFile`, and returns the documented JSON shape.
  - Implemented `findLatestAgentContractEntry()`: lists `Publication` artifact refs and returns the most recent one with `kind === "agent-contract"` (sort by id descending).
  - Implemented `isProtectedAgentDocPath()`: matches basename (case-insensitive) against `PROTECTED_AGENT_DOC_BASENAMES`, then matches the normalized relative path against `PROTECTED_AGENT_DOC_RELATIVE_PATTERNS`.
  - Implemented `pathExists()`: thin wrapper around `access`.
  - Added the new line to the `usage()` output: `rekon agent-contract export --output <path> [--force] [--root <path>] [--json]`.
- `tests/contract/agent-contract-export.test.mjs` — new contract test file with 15 tests covering: happy-path export, preamble citation, original content preservation, refuse-existing-without-force, force overwrite with message, refuse `AGENTS.md`, force `AGENTS.md` with `protectedPath: true`, refuse `CLAUDE.md`, refuse `.cursor/rules/*.md`, refuse `.github/copilot-instructions.md`, refuse outside-root (absolute + `../`), auto-publish when missing, `publish agent-contract` alone does not create root `AGENTS.md`, JSON output shape, missing-output error.
- `docs/concepts/agent-operating-contract.md` — added the export command to the CLI Surface section, expanded the Root AGENTS.md Policy section with the safe-by-default rules, the JSON output shape, and the recommended `AGENTS.rekon.md` target.
- `docs/artifacts/agent-contract-publication.md` — same export-command additions, JSON shape, and protected-path rules from the artifact contract perspective.
- `README.md` — added the export command to the CLI Commands list and a short paragraph describing the safe-by-default rules and the `docs/concepts/agent-operating-contract.md` cross-link.
- `AGENTS.md` — added a paragraph below the existing agent-contract paragraph describing the export command and its safe-by-default rules.
- `CHANGELOG.md` — extended the `0.1.0-alpha.1` section with the export command entry, test file entry, docs updates, the implementation note about the module-load TDZ ordering, and the explicit "no behavior changes / no version bump / no npm publish" line.

## PUBLIC API CHANGES

- New CLI command surface: `rekon agent-contract export --output <path> [--force] [--root <path>] [--json]`.
- JSON output shape: `{ outputPath, absolutePath, publicationRef: { type, id, schemaVersion }, forced, protectedPath, wrote, message? }`.
- No kernel API changes. No SDK API changes. No new capability roles or permissions. No new artifact types. No artifact-header shape changes. The `Publication` artifact type at the kernel level is unchanged. The `@rekon/capability-docs.agent-contract` publisher's input/output contract is unchanged.
- No npm package version bump. No npm publish.

## TESTS / VERIFICATION

- `npm run typecheck` — passed.
- `npm run test` — 333 passed, 1 skipped (the optional `REKON_DOGFOOD_CLASSIC_ROOT` regression), 0 failed across all suites including the new `tests/contract/agent-contract-export.test.mjs` (15 tests, all passing).
- `npm run build` — passed.
- `git diff --check` — no whitespace issues.
- `node scripts/audit-license.mjs` — passed (19 packages).
- `node scripts/audit-package-exports.mjs` — passed (19 packages).
- `node scripts/publish-dry-run.mjs` — passed (19 packages packed, no `.tsbuildinfo` leaks, no forbidden tokens).
- `node scripts/install-tarball-smoke.mjs` — passed (19 tarballs installed into a fresh consumer; full CLI flow against a copy of `examples/simple-js-ts` produced 13 artifacts and `artifacts validate` passed).
- End-to-end CLI smoke against a temp copy of `examples/simple-js-ts`:
  - `rekon init --json` ok.
  - `rekon refresh --json` → status `passed`.
  - `rekon publish list --json` → 4 publishers including `@rekon/capability-docs.agent-contract`.
  - `rekon publish agent-contract --json` → emits a `Publication` artifact.
  - `rekon agent-contract export --output AGENTS.rekon.md --json` (happy path) → `outputPath: "AGENTS.rekon.md"`, `protectedPath: false`, `wrote: true`, preamble is present at top of the written file, original Publication content follows.
  - `rekon agent-contract export --output AGENTS.rekon.md --json` (no `--force`, file already exists) → exits non-zero with `Refusing to overwrite existing file AGENTS.rekon.md without --force.`.
  - `rekon agent-contract export --output AGENTS.rekon.md --force --json` → `forced: true`, `protectedPath: false`, `message: "Overwrote existing file because --force was provided."`.
  - `rekon agent-contract export --output AGENTS.md --json` → exits non-zero with `Refusing to overwrite protected agent instruction file AGENTS.md without --force.`.
  - `rekon agent-contract export --output AGENTS.md --force --json` → `forced: true`, `protectedPath: true`, `message: "Overwrote protected agent instruction file because --force was provided."`.
  - `rekon agent-contract export --output CLAUDE.md --json` → refused.
  - `rekon agent-contract export --output .cursor/rules/rekon.md --json` → refused.
  - `rekon agent-contract export --output .github/copilot-instructions.md --json` → refused.
  - `rekon agent-contract export --output /tmp/somewhere/X.md --json` → refused with `must resolve inside the repo root`.
  - `rekon publish agent-contract --json` (no export call) → no root `AGENTS.md` file is created in the target repo.

## INTENTIONALLY UNTOUCHED

- The `@rekon/capability-docs.agent-contract` publisher contract is unchanged. The export command is a thin CLI surface over the existing Publication.
- No watcher, no automatic file mutation on artifact changes, no CI publisher surface.
- No actuator. The export writes to the repo working tree only on explicit operator invocation and only inside the repo root.
- No `rekon refresh` change. Refresh still does not run the export step. Export remains an explicit, operator-initiated command.
- No `rekon publish agent-contract` behavior change. It still writes only `Publication` JSON inside `.rekon/artifacts/publications/`.
- No memory mutation. No finding mutation. No ownership mutation.
- No npm package version bump. No npm publish.

## RISKS / FOLLOW-UP

- Risk: an operator runs `rekon agent-contract export --output AGENTS.md --force` and overwrites a hand-curated `AGENTS.md`. Mitigation: the protected-path list refuses the operation without `--force`, and the JSON output reports `protectedPath: true` plus an explicit `message` so the intent is visible to humans and agents reading the JSON. The default recommended target is `AGENTS.rekon.md` (not in the protected list).
- Risk: an exported `AGENTS.rekon.md` goes stale relative to `.rekon/artifacts`. Mitigation: every exported file carries a generated preamble citing the source `Publication:<id>` and a regenerate command. Operators / agents reading the file see the staleness disclaimer and the regenerate recipe at the top.
- Risk: the protected-path list does not cover every agent-instruction convention. Known gaps: `.windsurf/`, `.aider/`, `.continue/`, IDE-local rule directories. Follow-up: expand the protected list if a convention becomes load-bearing in practice.
- Follow-up (not in this batch): teach `rekon refresh` an opt-in `--export-agent-contract <path>` flag that runs the export step at the end of the lifecycle. Deferred until there is a real operator need.
- Follow-up (not in this batch): a `--dry-run` flag that returns the JSON shape (including `wrote: false`) without touching disk. Deferred — the safe-by-default refusals already give operators a way to inspect the destination before forcing.
- No npm publish in this batch. The export command lands behind the existing `0.1.0-alpha.1` version. Publish remains gated by the manual approval requirement in `docs/release/npm-publish-plan.md`.

## NEXT STEP

Commit and push the export command to `main` per the solo-alpha working agreement. After this batch, the next slice in the classic guarantees roadmap is `docs/strategy/classic-guarantees-audit.md`'s `Resolver / Preflight Workflow` (subsystem 6) → next remaining gap (issue-resolver lifecycle audit) — but that is a separate batch and not affected by this work order.

## PURPOSE PRESERVATION CHECK

- **Original problem**: classic `codebase-intel-classic` shipped generated agent / context docs (`AGENTS.md`, `CLAUDE.md`-style files) so an agent could read the durable operating contract for the repo before editing code. Without a way to materialize the generated contract at a path the agent's harness expects to read, the contract sits inside `.rekon/artifacts/publications/agent-contract.md` and most agent runtimes will never look there.
- **Classic workflow guarantee**: the generated docs lived at conventional repo paths (`AGENTS.md`, `CLAUDE.md`, etc.) so agents that auto-load instruction files would see the current contract before editing. The publisher was deterministic and re-runnable from current sources.
- **Classic shape that provided the guarantee**: the doc-generation pipeline wrote directly to those conventional paths from a single source of truth (the analysis cache). Outputs were always overwritten on each run.
- **Rekon equivalent guarantee**: the v1 publication batch (`c551486`) preserved the deterministic generated-contract guarantee by writing a typed `Publication` artifact at `.rekon/artifacts/publications/agent-contract.md` with full `header.inputRefs` and a `kind: "agent-contract"` discriminator. This batch closes the remaining gap by giving operators an explicit, audited path to materialize that artifact at the conventional location their agent harness expects — without making the materialization automatic or destructive. The Rekon variant strictly improves on the classic guarantee by refusing silent overwrites of hand-curated `AGENTS.md` / `CLAUDE.md` files, refusing writes outside the repo root, and stamping every exported file with a preamble citing the source `Publication:<id>` and a regenerate command. The export is reversible by design: deleting the exported file does nothing to the canonical `.rekon/artifacts` source.
- **What would mean we failed**:
  - The command silently overwrites a hand-curated `AGENTS.md` or `CLAUDE.md`. The protected-path test asserts the refusal.
  - The command writes outside the repo root. The outside-root test asserts the refusal for both absolute paths and `..` escapes.
  - The exported file omits the preamble, so an agent reading it treats it as canonical truth. The preamble test asserts every required line is present.
  - The command writes stale content because no current `Publication` exists. The auto-publish test asserts the command publishes a fresh `Publication` when none exists yet.
  - The command starts auto-writing during `rekon refresh` or `rekon publish agent-contract` without operator intent. The "publish does not create root AGENTS.md" test asserts the publish flow remains side-effect-free outside `.rekon/`.
- **Regression test for the original problem**: `tests/contract/agent-contract-export.test.mjs` (15 tests). The four most load-bearing for the original guarantee:
  - `agent-contract export writes AGENTS.rekon.md from the latest agent-contract Publication` (proves the export materializes current content at the operator-chosen path).
  - `exported file includes the generated preamble citing the source Publication` (proves canonical-truth disclaimer is always present so the materialized file is not mistaken for source).
  - `agent-contract export refuses to overwrite AGENTS.md without --force` (proves silent overwrite of conventional agent-instruction files cannot happen).
  - `rekon publish agent-contract alone does not create a root AGENTS.md` (proves the publish flow is unchanged and remains side-effect-free outside `.rekon/`).

## CODEBASE-INTEL ALIGNMENT

- **Classic capability or failure mode being addressed**: classic shipped a doc-generation phase that wrote `AGENTS.md`-style files at conventional paths so agents would pick them up. The failure mode being addressed is: a Rekon-managed contract lives at `.rekon/artifacts/publications/agent-contract.md` but agent harnesses look at `AGENTS.md` / `CLAUDE.md` / `.cursor/rules/` / `.github/copilot-instructions.md`. Without an export step, the contract is invisible to those harnesses.
- **Relevant classic files/systems**: the classic generated-docs pipeline that wrote conventional instruction files from the analysis cache. See subsystem 9 (Generated Docs / Agent Docs) in `docs/strategy/classic-guarantees-audit.md` and `docs/strategy/classic-subsystem-purpose-map.md`.
- **What Rekon keeps from the classic behavior**: the determinism (any export step always re-derives content from current artifacts), the conventional-path output (operators can choose `AGENTS.md` / `CLAUDE.md` / `.cursor/rules/rekon.md` etc. with `--force`), and the rebuild-from-sources guarantee (the preamble cites the source `Publication:<id>` so the regenerate command is one line away).
- **What Rekon simplifies**: classic shipped doc generation as an opaque pipeline that wrote files implicitly. Rekon splits the generation step (already in `@rekon/capability-docs.agent-contract`, writes only to `.rekon/`) from the export step (explicit `rekon agent-contract export --output <path>`, writes only inside the repo root, refuses silent overwrites, never runs automatically). This means an agent or human inspecting the workspace can always tell what is canonical (`.rekon/`) and what is operator-exported (a single materialized file with a visible preamble).
- **What Rekon does not port yet**: automatic export on refresh (deferred until operator demand is real); a registry of multiple export targets per repo (deferred — the protected-path list is the safety surface, not a manifest); a CI publisher that writes the contract into the PR review surface (Phase D); a `--dry-run` flag returning the planned write without touching disk (deferred — the safe-by-default refusals already give operators a way to inspect destinations without writing).
- **How this advances migration phase per `docs/strategy/classic-behavior-roadmap.md`**: Phase B closure of the Generated Docs / Agent Docs subsystem. `classic-subsystem-purpose-map.md` already records subsystem 9 as "P1 preserved (v1)" with the next slice = optional export/install command. This batch ships that slice. The remaining Phase D work (CI publisher / PR surface) is unchanged and remains deferred.
