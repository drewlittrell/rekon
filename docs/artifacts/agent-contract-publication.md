# Agent Operating Contract Publication

## Purpose

The agent operating contract is an instruction-grade `Publication`
that tells a coding agent how to operate in this repository before
it edits any code. It rolls up ownership, capabilities, current
governance state, proof-loop status, ranked operator memory, required
checks, anti-gaming guardrails, and recommended next actions into a
single document.

It is the Rekon-native equivalent of the classic generated agent /
context docs. See the **Generated Docs / Agent Docs** entry in
[../strategy/classic-guarantees-audit.md](../strategy/classic-guarantees-audit.md)
and the **P1.3 Agent-operating-contract publication** guarantee in
[../strategy/classic-guarantee-regression-plan.md](../strategy/classic-guarantee-regression-plan.md).

## Produced By

- `@rekon/capability-docs.agent-contract` (a publisher handler
  inside the existing `@rekon/capability-docs` capability).

## Consumed By

- Coding agents and humans who need a single operating contract
  before editing the repository.
- Future PR/check publishers may consume this artifact as a
  "what the agent saw" attestation. Deferred.

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`Publication`. The header carries:

- `producer.id` = `@rekon/capability-docs`.
- `inputRefs` cite every artifact actually read: at minimum the
  `IntelligenceSnapshot`; additionally any of `ObservedRepo`,
  `OwnershipMap`, `CapabilityMap`, `CoherencyDelta`,
  `FindingLifecycleReport`, `WorkOrder`, `ReconciliationPlan`,
  `VerificationPlan`, `VerificationResult`, and `MemorySelection`
  when they are present.
- `freshness.status` mirrors the snapshot's freshness at write
  time.

## Shape

The publication uses the existing `PublicationArtifact` shape with
the extended `kind` enum:

```ts
type PublicationArtifact = {
  header: ArtifactHeader;
  kind: "agents" | "repo-summary" | "architecture-summary" | "proof-report" | "agent-contract";
  title?: string;
  path: string;
  format: "markdown";
  content: string;
};
```

For the agent contract:

- `kind` = `"agent-contract"`.
- `title` = `"Rekon Agent Operating Contract"`.
- `path` = `.rekon/artifacts/publications/agent-contract.md`.
- `format` = `"markdown"`.
- `content` is the rendered markdown.

## Content Structure

The publication contains, in fixed order:

1. **Title + metadata** — generated timestamp, snapshot id.
2. **How To Use This Contract** — read before editing; do not treat
   as canonical truth.
3. **Canonical Truth** — `.rekon/artifacts` is the source of truth;
   this is a derived publication that may be stale.
4. **Operating Rules** — durable agent rules: resolve before edit,
   no cross-owner without seam, no completion without proof,
   anti-gaming on tests/validators/ledgers/scripts, no mutation to
   hide unresolved work, publications are guidance.
5. **Resolver Workflow** — route → seam (if cross-owner) → preflight;
   issue → seam/preflight; commands; resolver trace mention.
6. **Ownership And Capabilities** — system table (up to 10) from
   `ObservedRepo`, capability bullets (up to 10) from
   `CapabilityMap`, ownership entry count from `OwnershipMap`. When
   missing: "Run `rekon refresh`."
7. **Active Governance State** — active/accepted/ignored/resolved
   counts, severity breakdown, top affected paths, remediation queue
   priorities (`P0/P1/P2`), plus the lifecycle summary line when
   present. When missing: "Run `rekon coherency delta` or `rekon
   refresh`."
8. **Proof And Verification State** — presence/missing for
   remediation WorkOrder, resolver WorkOrder, ReconciliationPlan,
   VerificationPlan, VerificationResult; explicit "Verification is
   not complete." for failed/partial/not-run; explicit "passed does
   not auto-resolve findings" for passed; "stale plan" callout when
   the latest result references an older plan id.
9. **Memory Guidance** — table of ranked `MemorySelection`
   entries (up to 10) with Score, Instruction, Scope, Reasons.
   Entries without explicit `reasons` are excluded — only ranked
   memory appears. When no selection: "Run `rekon memory select
   --path <path> --goal <goal>`."
10. **Required Checks** — commands from the latest
    `VerificationPlan` when present, otherwise the default
    typecheck/test/build + `rekon artifacts validate` + `rekon
    artifacts freshness` list.
11. **Do Not Do** — explicit anti-gaming reminders.
12. **Next Recommended Actions** — derived from current artifact
    state (run refresh if no coherency delta, intent remediation if
    active findings without a remediation work order, reconcile
    suggest if no plan, verify record if no result, address
    failures if not-passed, memory select if no selection;
    otherwise proceed with scoped changes).
13. **Input Artifacts** — bullet list of every `ArtifactRef` cited
    in `header.inputRefs`.

## Memory Guidance

The Memory Guidance section reads the latest `MemorySelection` and
renders only ranked items (those with a non-empty `reasons` array).
Each row carries:

- `Score` — the v1 ranker's clamped 0..1 score.
- `Instruction` — the operator-supplied guidance.
- `Scope` — a compact summary of `paths` / `systems` /
  `capabilities` / `tags` that scoped the entry.
- `Reasons` — semicolon-separated tokens from the ranker
  (`path-prefix-match: src`, `verified`, `high-priority`, etc.).

Memory enriches guidance but never rewrites ownership, rules, or
findings. The contract test
`preflight resolver includes selected memory but does not mutate
ownerSystems or finding status` in
`tests/contract/memory-ranking-curation.test.mjs` pins this
invariant; the agent contract surfaces the same ranked output
without changing the architecture facts the rest of the publication
already cites.

## Failure Visibility

Failed, partial, and not-run verification states are always visible
in the Proof And Verification State section. The publication never
hides incomplete proof: it renders an explicit
`> Verification is not complete.` callout and lists the per-status
counts. Passing verification renders an explicit
`> Verification recorded as passed. This does not automatically
resolve findings.` callout so an agent reading the contract does not
treat passing checks as automatic finding resolution.

## CLI Surface

```sh
rekon publish agent-contract --root <repo> --json
rekon publish run @rekon/capability-docs.agent-contract --root <repo> --json
rekon publish list --root <repo> --json
```

The friendly shortcut and the generic dispatch produce the same
artifact. The publisher is also visible in `rekon publish list`.

## Root AGENTS.md

`rekon publish agent-contract` writes only to
`.rekon/artifacts/publications/agent-contract.md`. It **does not**
overwrite the repository's root `AGENTS.md` or inject content into
`CLAUDE.md` or any other root file. A future explicit
`rekon agent-contract export` or `--output` flag may publish the
generated artifact to a chosen path; that is intentionally
deferred.

## Freshness And Provenance

The publication's `freshness.status` mirrors the snapshot's
freshness. `rekon artifacts freshness --type Publication` marks an
older agent contract `stale` once any newer cited input artifact
lands — `MemorySelection`, `VerificationResult`, `CoherencyDelta`,
`WorkOrder`, etc. Rebuild with `rekon publish agent-contract` (or
include it in a future `rekon refresh` extension).

## What This Is Not

- Not canonical architecture truth. The publication cites its
  inputs.
- Not a substitute for the architecture summary or the proof
  report. The architecture summary covers the broader governance
  loop; the proof report zooms into the latest plan/result; the
  agent contract is the agent-facing operating contract that
  combines them with operating rules, memory guidance, and
  anti-gaming language.
- Not a verification runner. Required checks are listed; commands
  are not executed.
- Not a memory-curation surface. Memory is read; entries are not
  mutated.
- Not a root-file writer. No root `AGENTS.md` overwrite by default.

## Cross-References

- [Agent contract concept](../concepts/agent-operating-contract.md)
- [Architecture summary publication](architecture-summary-publication.md)
- [Proof report publication](proof-report-publication.md)
- [MemorySelection](memory-selection.md)
- [Memory concept](../concepts/memory.md)
- [Capability model](../strategy/capability-model.md)
- [Classic guarantees audit](../strategy/classic-guarantees-audit.md)
- [Classic guarantee regression plan](../strategy/classic-guarantee-regression-plan.md)
