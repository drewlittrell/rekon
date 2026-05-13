# Intelligence Snapshot

The IntelligenceSnapshot is Rekon's shared index of repository intelligence.

It is a typed artifact with an `ArtifactHeader`. It points to other artifacts by `ArtifactRef` rather than embedding all derived data inline.

## Categories

- `inputs`: canonical inputs such as EvidenceGraph
- `projections`: derived models such as ObservedRepo, OwnershipMap, CapabilityMap, and graph slices
- `evaluations`: rule results and finding reports
- `publications`: generated docs and user-facing outputs
- `actions`: reconciliation logs, overrides, scaffolds, and verification results

## Rule

The snapshot indexes truth-bearing artifacts. Publications and memory may enrich resolver output, but they do not silently rewrite lower-layer facts.
