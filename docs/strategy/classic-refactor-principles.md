# Classic Refactor Principles

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

Rules for porting `codebase-intel-classic` behavior into Rekon-native form.
These are derived from the wins distilled in
[classic-wins.md](classic-wins.md) and the behavior cards in
[classic-behavior-distillation.md](classic-behavior-distillation.md).

If a proposed port cannot follow these rules, the port is not ready.
Update the substrate first; do not let the port leak through.

## Rules

### Preserve The Goal, Not The File Structure

Classic file layouts evolved under specific constraints
(service handlers, path aliases, cache directories). The goal each file
serves is what survives. Rekon's package layout is intentional;
re-creating the classic layout inside Rekon would import the accidents
along with the wins.

### Preserve The Artifact Contract, Not The Cache Location

Classic stores many artifacts under `.codebase-intel/cache/**`. The cache
location is incidental. The artifact contract — header, producer,
`inputRefs`, `freshness`, `provenance` — is what consumers depend on.
Replace cache paths with the Rekon artifact store; preserve the data
contract.

### Preserve Evaluator Semantics, Not Evaluator Registry Sprawl

Classic registers evaluators in a single map (`RULE_EVALUATORS`). The
useful part is the contract: stable rule id, evaluator key, severity,
pass/fail/skipped/unimplemented/error status, source references. Rekon
gets that for free through the SDK; one giant registry is not required.

### Preserve Graph Relationships, Not Graph-Builder Coupling

Classic graph producers share a single `GraphBuildProvider` and a common
`FileAnalysisWithMeta` input. The useful part is the relationship model
(import, call, route, runtime, etc.) and the validated `GraphSlice`
shape. Rekon ports each relationship as a standalone `projector` whose
inputs are typed Rekon artifacts.

### Preserve Resolver Phases, Not Old CLI Branching

Classic resolver phases (preflight → route → seam → issue) are valuable.
The classic CLI branching that selects them is not. Rekon already exposes
`rekon resolve list` and `rekon resolve run <id>`. Adding new resolver
phases means adding new resolver handlers in capabilities, not new CLI
branches in the binary.

### Preserve Memory Ranking Principles, Not Every Curation Heuristic

Classic memory carries kind, scope, evidence, freshness, verification,
and usage tracking. Those are the principles to preserve. The many
normalization / promotion / migration heuristics that accumulated around
them are not the principles; they are implementation artifacts. Port the
principles in small, declared steps.

### Preserve Anti-Gaming Gates, Not Every Phase-Prep Implementation Detail

Classic intent preparation has gates that prevent agents from declaring
"done" without evidence. The gate concept — behavior, semantic, artifact
evidence classes — is durable. The migration-plan-specific phase
preparation pipeline is not. Port the gates; let the workflow stay
minimal.

### Preserve Deterministic Reconciliation, Not Auto-Apply Breadth

Classic reconciliation is safe because it applies only deterministic
operations and defers everything else. Preserve that bias. Do not expand
auto-apply scope until permission gating, dry-run, and audit are first
class.

### Port Only When Consumes / Produces / Permissions / Provenance Are Clear

A port should be able to state, before code is written:

- exactly which artifact types it consumes;
- exactly which artifact types it produces;
- the smallest permission set the runtime needs to grant;
- how every produced artifact will record provenance back to its inputs.

If any of those is unclear, stop. The port will leak through and become
the next accident.

### If The Classic Behavior Cannot Be Expressed As A Rekon Capability/Artifact, Pause And Define The Missing Substrate First

When a port wants a role Rekon does not define, an artifact type Rekon
does not own, or a permission the runtime does not enforce, the right
next step is **not** to fit it in around the edges. The right next step
is to add the missing piece to the substrate (kernels, SDK, runtime,
capability contract). Then port.

## How To Use These Rules

Every Rekon implementation work order that touches behavior also present
in classic should include a `CODEBASE-INTEL ALIGNMENT` section
(`AGENTS.md` requires it). That section is the right place to check each
rule against the proposed port:

- What is the goal? (rule 1)
- What artifact contract is preserved? (rule 2)
- What evaluator/graph/resolver/memory semantics are preserved? (rules
  3–6)
- What anti-gaming and deterministic-reconciliation principles are
  preserved? (rules 7–8)
- Are consumes/produces/permissions/provenance clear? (rule 9)
- Is any new substrate needed first? (rule 10)

If the answers are concrete and short, the port is ready. If they need
hand-waving, stop and update the substrate or the distillation.

### Preserve The Workflow Guarantee, Not Just The Feature

Each classic subsystem encodes a workflow guarantee, not just a
feature. Before reinterpreting a subsystem in Rekon-native form,
identify the original problem and the workflow guarantee the classic
shape provided. A port that recreates the feature but loses the
guarantee is incomplete.

The audit, regression plan, and quick-reference map make this rule
operational:

- [classic-guarantees-audit.md](classic-guarantees-audit.md) lists
  the workflow guarantee for each subsystem.
- [classic-guarantee-regression-plan.md](classic-guarantee-regression-plan.md)
  proposes the regression test that would prove the original
  problem is still solved.
- [classic-subsystem-purpose-map.md](classic-subsystem-purpose-map.md)
  is the quick-reference table to consult first.

Do not call classic orchestration "weight" unless the work order
identifies which guarantee is preserved elsewhere.

Cross-references:

- [classic-behavior-distillation.md](classic-behavior-distillation.md)
- [classic-wins.md](classic-wins.md)
- [classic-to-rekon-translation.md](classic-to-rekon-translation.md)
- [classic-guarantees-audit.md](classic-guarantees-audit.md)
- [classic-guarantee-regression-plan.md](classic-guarantee-regression-plan.md)
- [classic-subsystem-purpose-map.md](classic-subsystem-purpose-map.md)
- [capability-model.md](capability-model.md)
- [north-star.md](north-star.md)
