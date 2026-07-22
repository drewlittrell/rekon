# Repository Contracts

Repository contracts preserve design intent at different scales.

## Sources

Version-controlled inputs use `version: "1.0.0"`. Rekon discovers:

- `rekon.contract.json` files within repository systems;
- JSON documents under `rekon/contracts/`;
- explicit paths in `rekon.config.json` under `contracts.sources`.

`.rekon/` contains generated state and is never a contract source.

## Artifacts

`SystemContract` describes a system's scope, purpose, user outcomes,
invariants, prohibited changes, context paths, and checks.

`FlowContract` describes an end-to-end outcome, ordered stages, semantic
handoffs, completion conditions, and invariants that must survive the flow.
Critical flows use `criticality: "critical"`; the artifact is not limited to
performance hot paths.

### Handoff verification

A handoff may declare how its dependency edge is proved:

```json
{
  "id": "route-to-handler",
  "fromStageId": "route",
  "toStageId": "handler",
  "verification": {
    "acceptedMethods": ["test", "runtime"],
    "acceptancePolicy": "all-required",
    "requiredChecks": ["npm run test:request-flow"]
  }
}
```

`acceptedMethods` supports `static`, `test`, `runtime`, and
`model-judgment`. `acceptancePolicy` defaults to `any-supported`; it may also
be `all-required` or `any-authoritative`. A handoff with `requiredChecks` must
accept `test` evidence. Those commands are selected only when the task or diff
intersects that handoff's stages, and each command records the exact edge it
can prove.

The declaration applies to edge continuity. Payload fields, guarantees,
ordering, and failure semantics remain independent proof obligations. Existing
contracts without `verification` retain the compatible default: one supported
test, runtime observation, or model judgment can prove the edge, and a
flow-level check may bind to affected handoffs.

`EffectiveContractRegistry` indexes current system, capability, handoff, and
flow contracts by authority and scope. It contains refs rather than copying
contract bodies.

`ContractCandidateReport` contains bounded, inferred system and flow proposals
from current repository evidence. It is not repository law.

`ContractJudgmentReport` records source-cited agent judgment. An accepted
candidate must cite current repository source and provide a repository-native
contract proposal; a generic restatement is invalid.

`ContractAdoptionReport` records dry-run, adopted, skipped, and blocked source
writes. Adoption is allowed only under the configured source-write policy.

`ContractDriftReport` compares adopted law with current sources, ownership,
and flow evidence. Drift remains explicit until reconciliation and a new
judgment update the committed source.

`TaskPact` selects the adopted system and end-to-end flow law that applies to a
single task. It carries required context, constraints, checks, freshness
warnings, and impact obligations into model context and work-order generation.

## Authority

Contract authority progresses from `observed` to `inferred`, `corroborated`,
and `adopted`. A committed source compiles to adopted law. Future discovery
and judgment artifacts must retain their lower authority until an adoption
policy accepts them.

## CLI

```sh
rekon contracts maintain --root . --json
rekon contracts maintain --root . --candidate-report <id> --input <judgment.json> --json
rekon contracts maintain --root . --candidate-report <id> --input <judgment.json> --apply --json
rekon contracts bootstrap --root . --json
rekon contracts compile --root . --json
rekon contracts discover --root . --json
rekon contracts judge --root . --candidate-report <id>
rekon contracts judge --root . --candidate-report <id> --input <judgment.json> --json
rekon contracts adopt --root . --judgment-report <id> --json
rekon contracts adopt --root . --judgment-report <id> --apply --json
rekon contracts reconcile --root . --json
```

`maintain` is the resumable agent path. Without `--input`, it prepares current
intelligence and returns bounded candidates plus a judgment schema. The coding
agent inspects cited source and reruns it with judgment JSON. The command then
binds source digests, dry-runs or applies adoption, compiles adopted law, and
reconciles drift. It never calls a model provider or executes repository
commands. `--apply` still requires `contracts.adoption.allowSourceWrites`.

`bootstrap`, `judge`, `adopt`, and `reconcile` expose the same stages for
explicit control. `compile` validates source containment and schemas, writes
typed contracts, and writes the effective registry. `discover` emits inferred
candidates without adopting them. `judge` binds agent decisions to source.
`adopt` is a dry run unless `--apply` is present and source writes are enabled
in `.rekon/config.json`. `reconcile` reports drift and regenerates candidates
for law that no longer matches the repository.

`rekon refresh` also runs reconciliation after projection when an effective
registry already exists. The resulting `ContractDriftReport` and
`ContractCandidateReport` join the current snapshot run. Missing law remains a
separate bootstrap decision rather than causing refresh to create an empty
contract system.

Task context automatically builds a `TaskPact` from the current effective
registry. MCP derives the same pact in memory without writing. The CLI persists
it so downstream intent and work-order artifacts can cite the exact law used.
