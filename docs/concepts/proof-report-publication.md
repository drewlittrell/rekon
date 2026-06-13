---
freshness:
  inputs:
    - FindingReport
  paths:
    - packages/capability-docs/src/**
    - docs/concepts/proof-report-publication.md
---

# Proof Report Publication

Proof reports are generated publications that summarize evidence, findings, and
verification proof for review. They are readouts, not canonical truth.

Current proof reports surface verification context and issue-merge context. Proof
report surfacing is deferred for CapabilityContract,
CapabilityArchitectureLintReport, CapabilityLintFindingBridgeReport, and
bridge-derived findings. Those signals are available through architecture
summaries and agent contracts first, where their preview status and non-mutating
behavior are explicit.
