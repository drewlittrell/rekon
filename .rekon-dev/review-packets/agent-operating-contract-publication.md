CHANGES MADE
- Added a fourth publisher handler inside `@rekon/capability-docs`:
  - id `@rekon/capability-docs.agent-contract`, registered alongside `.publisher`, `.architecture-summary`, and `.proof-report`.
  - Reads the latest `IntelligenceSnapshot` (required; throws with a "Run `rekon refresh` first" message when missing) plus optional `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `CoherencyDelta`, `FindingLifecycleReport`, `WorkOrder` (remediation and resolver), `ReconciliationPlan`, `VerificationPlan`, `VerificationResult`, and `MemorySelection`.
  - Emits one `Publication` artifact with `kind = "agent-contract"`, `title = "Rekon Agent Operating Contract"`, and a Markdown body written to `.rekon/artifacts/publications/agent-contract.md`. Root `AGENTS.md` is never overwritten.
- Extended the package-local `PublicationArtifact.kind` enum to include `"agent-contract"`. The kernel-level `Publication` artifact type is unchanged.
- Added a local `MemorySelectionLike` shape inside `@rekon/capability-docs` so the publisher can read ranked `selected[*]` items without importing `@rekon/capability-memory` (avoids a new package edge).
- Implemented `renderAgentContract` and a small set of helpers (`buildAgentContractNextActions`, `summarizeScope`) that produce the 13-section Markdown body. Memory Guidance includes only items with `reasons` so the publication never carries unexplained memory. Failed / partial / not-run verification surfaces an explicit "Verification is not complete." callout; passing verification surfaces "does not automatically resolve findings."
- Added a CLI friendly shortcut `rekon publish agent-contract` which invokes `runPublish({ publisherId: "@rekon/capability-docs.agent-contract" })` after `ensureSnapshotReady`. Generic `rekon publish run @rekon/capability-docs.agent-contract` dispatches the same publisher. The publisher appears in `rekon publish list`.
- Updated the `@rekon/capability-docs` manifest: `consumes` now includes `MemorySelection`. Added a new `memory.changed` invalidation rule citing `MemorySelection` so an older agent contract goes stale when ranked memory changes.
- Added contract test file `tests/contract/agent-operating-contract-publisher.test.mjs` with 16 tests.
- New docs: `docs/artifacts/agent-contract-publication.md`, `docs/concepts/agent-operating-contract.md`. Updated `docs/artifacts/architecture-summary-publication.md`, `docs/artifacts/proof-report-publication.md`, `docs/artifacts/memory-selection.md`, `docs/concepts/memory.md`, `docs/extensions/authoring-capabilities.md`, `docs/strategy/classic-guarantees-audit.md`, `docs/strategy/classic-guarantee-regression-plan.md`, `docs/strategy/classic-subsystem-purpose-map.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, root `README.md`, `AGENTS.md`, and `CHANGELOG.md`.

PUBLIC API CHANGES
- New publisher handler exported from `@rekon/capability-docs`: `agentContractPublisher`. The default capability export now registers it alongside `docsPublisher`, `architectureSummaryPublisher`, and `proofReportPublisher`.
- `PublicationArtifact.kind` package-local type widened to `"agents" | "repo-summary" | "architecture-summary" | "proof-report" | "agent-contract"`.
- New CLI command `rekon publish agent-contract [--root <path>] [--json]`.
- New publisher id appears in `rekon publish list`.
- `@rekon/capability-docs` manifest `consumes` gains `MemorySelection`; `invalidatedBy` gains a `memory.changed` rule.
- No kernel changes. No SDK changes. No new capability roles. No artifact header shape changes. The `Publication` artifact type at the kernel level is unchanged.

PURPOSE PRESERVATION CHECK
- Original problem: coding agents need a concise operating contract before they edit code. Without a generated agent-facing contract, agents infer architecture from whatever files they happen to read, miss current findings / proof state, ignore repo-specific rules, and repeat operator-corrected mistakes.
- Classic workflow guarantee: codebase-intel-classic generated agent-facing docs (AGENTS / CLAUDE / context docs via `ArchitectureDocsHandler` / `agent-docs` / `ContextHandler`) that surfaced architecture, constraints, required checks, and repo-specific operating guidance in a form agents actually read. Those docs were not canonical truth, but they were a primary control surface for agent behavior.
- Classic shape that provided the guarantee: `services/ArchitectureDocsHandler.ts`, `lib/agent-docs.ts`, `tools/agent-docs/generator.ts`, `services/ContextHandler.ts`, `handlers/RealTimeContextHandler.ts`. Classic orchestration ensured docs reflected repo intelligence and workflow constraints.
- Rekon equivalent guarantee: `rekon publish agent-contract` writes a `Publication` (`kind: "agent-contract"`) that contains current repo ownership/capability summary, resolver workflow expectations, active coherency/remediation/proof status, ranked memory guidance (with score and reasons), required checks, anti-gaming reminders, do-not-do list, next-recommended-action, and input artifact refs. The publisher reads only via `ArtifactReader`; it never executes commands, judges sufficiency, or mutates findings / status ledgers / memory.
- What would mean we failed (and why this batch does not):
  - "The publication is a generic README-style summary instead of an instruction-grade operating contract." — The 13-section structure is opinionated by construction: operating rules, resolver workflow, do-not-do list, next-recommended-action, anti-gaming language. The contract test "operating rules include resolver/seam/preflight order and anti-gaming text" pins this.
  - "It hides active drift or failed/partial verification." — Failed / partial / not-run verification surfaces an explicit `> Verification is not complete.` callout. The contract tests "agent contract surfaces partial verification status visibly" and "agent contract surfaces failed verification status visibly" both pin this.
  - "It includes memory with no score/reason." — Items without `reasons` are intentionally excluded from the Memory Guidance section. The contract test "agent contract Memory Guidance shows score and reasons when ranked memory exists" pins this.
  - "It implies docs are canonical truth." — The "Canonical Truth" section says `.rekon/artifacts` is the source of truth and this publication may be stale. The contract test "agent contract carries the canonical-truth warning" pins this.
  - "It overwrites root AGENTS.md without explicit operator action." — The publisher writes only to `.rekon/artifacts/publications/agent-contract.md`. The contract test "publish agent-contract does not overwrite a root AGENTS.md" runs against a fixture without `AGENTS.md` and asserts the file is never created.
  - "Agents still need to inspect many artifacts manually to know how to operate." — The 13 sections together summarize ownership, governance, proof, memory, and required checks. Input artifact refs are still listed at the bottom for deeper inspection.
- Acceptance test for original purpose (from the work order): "Given a repo with ownership, coherency delta, remediation work order, verification result, and ranked memory selection, `rekon publish agent-contract` produces a Publication that includes operating rules, resolver flow, active findings/remediation/proof state, selected memory with score/reasons, required checks, the canonical-truth warning, and cites all input artifacts." Shipped end-to-end as the existing 16-test suite; the CLI smoke confirms all four publishers (`agents`, `architecture`, `proof`, `agent-contract`) coexist and `artifacts validate` returns `valid: true`.

CODEBASE-INTEL ALIGNMENT
- Classic capability / failure mode: codebase-intel-classic generated AGENTS / CLAUDE / context docs so agents had the repo operating contract before editing. Classic memory and context systems surfaced scoped operator guidance at the moment of work.
- Relevant classic files: `services/ArchitectureDocsHandler.ts`, `services/ContextHandler.ts`, `handlers/RealTimeContextHandler.ts`, `lib/agent-docs.ts`, `tools/agent-docs/generator.ts`, `lib/operator-feedback.ts`, `lib/context/resolver.ts`. Strategy anchors: `docs/strategy/classic-guarantees-audit.md` (subsystem 9), `docs/strategy/classic-guarantee-regression-plan.md` (P1.3), `docs/strategy/classic-subsystem-purpose-map.md` (row 9).
- What Rekon keeps: generated agent-facing guidance; docs as a control surface for agent behavior; input artifact refs; current ownership / capability / finding / proof state; memory guidance with selection reasons; required checks and anti-gaming language; docs are publications, not canonical truth.
- What Rekon simplifies: one publication artifact only; no root `AGENTS.md` overwrite; no `CLAUDE.md` injection; no watcher-backed regeneration; no real-time context HTTP server; no full generated docs tree; no dashboard / PR surface; no per-system generated doc set.
- What Rekon does not port yet: AGENTS.md / CLAUDE.md overwrite/install command (deferred to an explicit future export command); generated per-system docs; watch-based regeneration; context HTTP server; agent-doc alert projections; multi-document doc tree.
- How this advances migration: closes P1.3 from the Classic Guarantees Audit. Gives agents a concise, current operating contract while keeping artifacts canonical and never overwriting root files. Makes the v1 ranked memory guidance actually usable in an agent-facing surface.

AGENT CONTRACT CONTENT
- Title + metadata: `# Rekon Agent Operating Contract`, generated timestamp, snapshot id.
- **How To Use This Contract**: read before editing; use to orient your work; do not treat as canonical truth.
- **Canonical Truth**: `.rekon/artifacts` is the source of truth; publication may be stale; commands to verify (`rekon artifacts freshness`, `rekon refresh`).
- **Operating Rules** (durable):
  - Resolve route/seam/preflight before editing code.
  - Do not cross owner systems without resolving a seam.
  - Do not claim completion without a `VerificationResult`.
  - Do not weaken tests, validators, rules, status ledgers, or verification scripts to make work appear complete.
  - Do not mutate findings, status ledgers, or memory to hide unresolved work.
  - Publications are guidance; canonical truth lives in `.rekon/artifacts`.
- **Resolver Workflow**: `route → seam (if cross-owner) → preflight`; `issue → seam/preflight`; commands; trust the `resolutionTrace`.
- **Ownership And Capabilities**: systems table from `ObservedRepo` (up to 10), capability bullets from `CapabilityMap` (up to 10), ownership entry count from `OwnershipMap`. Missing-state message points at `rekon refresh`.
- **Active Governance State**: active/accepted/ignored/resolved counts; severity breakdown; top affected paths (up to 5); remediation queue P0/P1/P2 counts; lifecycle summary line. Missing-state message points at `rekon coherency delta` or `rekon refresh`.
- **Proof And Verification State**: presence/missing for remediation `WorkOrder`, resolver `WorkOrder`, `ReconciliationPlan`, `VerificationPlan`, `VerificationResult`. Explicit "Verification is not complete." for failed/partial/not-run; "passed does not automatically resolve findings" for passed; stale-plan callout when the latest result references an older plan id.
- **Memory Guidance**: query + goal lines; `| Score | Instruction | Scope | Reasons |` table with up to 10 ranked items; "Memory enriches guidance but does not rewrite ownership, rules, or findings." reminder. Missing-state message points at `rekon memory select`.
- **Required Checks**: commands from latest `VerificationPlan.commands` when present; otherwise default typecheck/test/build + `rekon artifacts validate` + `rekon artifacts freshness`.
- **Do Not Do** (durable): do not bypass failing checks; do not remove tests; do not change rules/findings/status ledgers to hide work; do not ignore stale artifacts; do not apply source-writing reconciliation without an explicit future permission gate.
- **Next Recommended Actions**: derived from current state — refresh if no coherency delta; intent remediation if active findings without a remediation work order; reconcile suggest if no plan; verify record if no result; address failures if not-passed; memory select if no selection; otherwise "proceed with scoped changes; re-run `rekon refresh` after completion."
- **Input Artifacts**: bullet list of every `ArtifactRef` cited in `header.inputRefs`.

MEMORY GUIDANCE INTEGRATION
- The publisher reads the latest `MemorySelection` via the standard artifact reader and uses the `selected[*]` array (falling back to the legacy `selections[*]` array when needed).
- Only entries with a non-empty `reasons` array are rendered. The legacy v0 selections (which lacked `reasons`) would not appear; the v1 ranked output is the supported surface. This is intentional — the publication only carries memory it can explain.
- Each row shows: clamped 0..1 `score` (two decimals), `instruction` (truncated to 80 chars), compact `scope` summary (paths / systems / capabilities / tags), and the `reasons` list (semicolon-separated).
- Memory does not mutate ownership / findings / status. The contract test `preflight resolver includes selected memory but does not mutate ownerSystems or finding status` from the prior memory-ranking batch continues to pin this; this batch adds no new resolver behavior.

PROOF LOOP INTEGRATION
- The publisher follows the same proof-loop semantics as the proof-report and architecture-summary publishers:
  - Reads the latest remediation `WorkOrder` (where `source === "coherency-delta"`) and the latest resolver `WorkOrder` separately.
  - Reads the latest `ReconciliationPlan`.
  - Reads the latest `VerificationPlan` ref directly so it can flag a stale-plan mismatch when the latest `VerificationResult` cites an older plan id.
  - Reads the latest `VerificationResult` and surfaces its `status` and `summary` in the Proof And Verification State section.
- Failed / partial / not-run renders `> Verification is not complete.` Passing renders `> Verification recorded as passed. This does not automatically resolve findings.` Stale-plan renders `> VerificationResult may be stale; the latest VerificationPlan differs.`
- The `Required Checks` section reads `VerificationPlan.commands` when present and falls back to the default list otherwise. The work order's required checks become the agent contract's required checks automatically.

TESTS / VERIFICATION
- `npm run typecheck`: passed.
- `npm run test`: 318 passed, 1 skipped (optional dogfood). 16 new contract tests in `tests/contract/agent-operating-contract-publisher.test.mjs`. Was 302 → 318 (+16).
- `npm run build`: passed.
- `git diff --check`: clean.
- `node scripts/audit-package-exports.mjs`: passed (19 packages, no issues).
- `node scripts/publish-dry-run.mjs`: passed.
- `node scripts/audit-license.mjs`: passed.
- `node scripts/install-smoke.mjs`: passed.
- `node scripts/install-tarball-smoke.mjs`: passed (19 tarballs, 13 artifacts).
- CLI smoke against `examples/simple-js-ts`: `rekon refresh` → `rekon memory add` (with system/capability/priority/verified/reliability/rationale) → `rekon memory select` → `rekon intent work-order` → `rekon verify record` (partial result) → `rekon publish agent-contract` returns `status: 0`. All four publishers (`publish agents`, `publish architecture`, `publish proof`, `publish agent-contract`) coexist and produce their respective Publications. `rekon artifacts validate` returns `{ valid: true, issues: [] }`. `rekon artifacts freshness` exits 0. The fixture's `AGENTS.md` is never created (confirmed via `ls`).
- Manual content inspection: when the full proof loop is present, the rendered Markdown includes the score-1.00 verified memory row with `path-prefix-match: src; system-match: src; capability-match: bootstrap; verified; high-priority; fresh-within-30-days` reasons, surfaces "VerificationResult: status partial" plus the "Verification is not complete." callout, and lists `Verification summary: passed 1 / failed 0 / skipped 0 / not-run 2`.

INTENTIONALLY UNTOUCHED
- No kernel changes. The `Publication` artifact type at the kernel level is unchanged (the new `kind` widens the package-local type only).
- No SDK changes. No new capability roles. No new actuator / publisher / resolver / learner handlers — only a fourth publisher inside the same `@rekon/capability-docs` capability.
- No new artifact types. The agent contract is a `Publication` with `kind: "agent-contract"`.
- No coupling to new package edges. The publisher does not import `@rekon/capability-memory` or `@rekon/capability-intent`; it reads memory and proof-loop artifacts through the standard `ArtifactReader` interface and a small set of local "Like" types.
- No command execution. No verification command runner. No verification judge.
- No automatic memory promotion. No memory mutation. The publisher reads `MemorySelection` and writes only the `Publication`.
- No automatic source writes. No reconciliation apply.
- No root `AGENTS.md` overwrite. No `CLAUDE.md` injection. No write outside `.rekon/`.
- No watcher / daemon / live invalidation.
- No CI / GitHub / dashboard surfaces.
- No LLM. No semantic judge of memory or verification sufficiency.
- No `--output` / `--export` flag yet. Operators who want the contract surfaced as a root file must copy the markdown manually for now.
- No version bump. No npm publish. No `codebase-intel-classic` imports.
- Existing `@rekon/capability-docs.publisher` (`agents` + `repo-summary`), `@rekon/capability-docs.architecture-summary`, and `@rekon/capability-docs.proof-report` publishers are unchanged.

RISKS / FOLLOW-UP
- The Memory Guidance section excludes pre-v1 memory entries (those that lack `reasons`). If a workspace still has pre-v1 entries that have not been rebuilt via `rekon memory select`, those entries will appear in the resolver's `applicableMemory` (which reads the legacy `selections[*]` array) but not in the agent contract's Memory Guidance. Documented in `docs/concepts/agent-operating-contract.md`; operators can rebuild ranked entries with `rekon memory select`.
- Required Checks falls back to the default list when no `VerificationPlan` exists. If a future capability emits a `VerificationPlan` with intentionally-different command names, the agent contract will surface those names verbatim — there is no normalization. Documented.
- The agent contract is regenerated on demand. If an operator changes memory or verification state and forgets to re-publish, the contract goes stale; freshness flags it but the operator must rebuild explicitly. A future `rekon refresh` extension could include `publish agent-contract` in the lifecycle; deferred for now to keep `rekon refresh` semantics narrow.
- No optional `--output` / export command yet. Documented in the audit subsystem 9 entry as the next-step follow-up.
- The publisher reads `MemorySelectionLike` via duck typing; if `@rekon/capability-memory` ever changes the field names, the publisher would render an empty table rather than throwing. The contract tests pin the current behavior end-to-end.
- The Markdown is intentionally caped at 10 rows per table. Very large repos with many systems / memory entries will render the most-relevant rows plus a `_… N more_` continuation line.

NEXT STEP
- Per the work order: optional `rekon publish agent-contract --output <path>` (or `rekon agent-contract export --output <path>`) command that lets operators publish the generated artifact to an explicit path. Still no overwrite by default; the export must require a clear path argument and refuse to write to root `AGENTS.md` / `CLAUDE.md` without a `--force` equivalent.
- After that, the next likely slice is PR/check publishers (Phase D) that consume the agent contract + proof report + verification result and emit GitHub-check-style status surfaces. Out of scope until external users are nearby.
- Operator npm publish is still pending and unchanged by this batch.
