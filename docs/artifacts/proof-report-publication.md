# Proof Report Publication

Purpose: publish a reviewable proof summary from current Rekon artifacts.

Produced by: `@rekon/capability-docs`.

Consumed by: humans, automation that posts review summaries, and release or
verification workflows.

Required header fields: `artifactType`, `artifactId`, `schemaVersion`,
`generatedAt`, `subject`, `producer`, and `inputRefs`.

Proof report surfacing is deferred for CapabilityContract,
CapabilityArchitectureLintReport, CapabilityLintFindingBridgeReport, and
bridge-derived findings. That deferral is intentional: these artifacts can
influence architecture summaries and agent contracts without being treated as
canonical proof-report sections.
