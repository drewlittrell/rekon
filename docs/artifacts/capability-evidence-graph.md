# CapabilityEvidenceGraph

`CapabilityEvidenceGraph` is the task-navigation graph used by Rekon's context
compiler. It joins current source with resolved provider evidence while keeping
facts, inferences, and recommendations distinct.

## Produced By

- `@rekon/capability-model`
- `rekon scan`, `rekon refresh`, and `rekon capability graph build`

## Consumed By

- task-context selection and refinement
- capability and repository-model projection
- model-facing source routing

## Contract

The artifact contains file, symbol, and capability nodes; source-bound evidence
rows; typed claims; capability summaries; and all-false execution boundaries.
Its header cites the current `EvidenceGraph` when provider facts are projected.

Language providers own syntax extraction and local module resolution. The model
builder accepts their resolved repository-file facts only when both source and
target are present in the current source set. Evidence rows use the current
source SHA-256 and exact line excerpt, so stale provider locations cannot become
fresh graph context silently.

`python:injected_dependency` becomes an
`injected_dependency_candidate` relationship. The name reflects its trust
boundary: it is useful navigation evidence, not proof of runtime construction.
