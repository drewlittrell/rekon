import {
  type ArtifactHeader,
  type ArtifactRef,
  type ArtifactSchema,
  type ValidationIssue,
  type ValidationResult,
  assertArtifactHeader,
  assertArtifactRef,
  validateArtifactHeader,
  validateArtifactRef,
} from "@rekon/kernel-artifacts";

export type ObservedSystem = {
  id: string;
  name?: string;
  purpose?: string;
  paths: string[];
  layers: string[];
  capabilities: string[];
  confidence: number;
  evidence: ArtifactRef[];
  /**
   * Optional structural kind of this observed system. Used by
   * graph-aware finding filters (e.g.
   * `module-gate-verified-caller`) to confirm a finding's
   * owning system is module-kind without iterating naming
   * conventions. Common values: `"module"`, `"service"`,
   * `"route"`, `"ui"`, `"infra"`, `"unknown"`. Additive
   * optional; older artifacts and projectors that don't
   * surface kind continue to work.
   */
  kind?: string;
};

export type ObservedRepo = {
  header: ArtifactHeader;
  repository: {
    id: string;
    root: string;
    branch?: string;
    commit?: string;
  };
  systems: ObservedSystem[];
  layers: string[];
  capabilities: string[];
  /**
   * Optional flat file index. Sorted ascending,
   * repo-relative, no absolute paths, no `.rekon/`
   * artifact paths. Populated when the upstream projector
   * has enough evidence (e.g. `file` evidence facts) to
   * surface it. Consumed by graph-aware finding filters
   * (e.g. `route-handler-with-service`) for sibling-file
   * existence checks without scraping the filesystem.
   * Additive optional; older artifacts and projectors that
   * don't surface a file index continue to work.
   */
  files?: string[];
};

export type OwnershipMap = {
  header: ArtifactHeader;
  entries: Array<{
    path: string;
    ownerSystem: string;
    layer?: string;
    confidence: number;
    evidence: ArtifactRef[];
  }>;
};

/**
 * Phrase-backed capability entry (CapabilityMap v2,
 * additive). Projected from a single stable
 * high-confidence `CapabilityPhrase`. v2 entries
 * never replace or invalidate v1 `entries[]`;
 * existing consumers reading `entries[]` continue
 * to work unchanged.
 *
 * Eligibility (enforced by the producer, not by
 * this type): phrase `status === "stable"` AND
 * `confidence === "high"` AND `verb` / `noun`
 * non-empty AND `evidenceRefs` non-empty AND
 * `sourceCandidateIds` non-empty. Partial / low-
 * confidence phrases never appear here. Raw
 * `CapabilityNormalizationReport` rows never appear
 * here. See
 * `docs/strategy/capability-map-v2-high-confidence-decision.md`.
 */
export type CapabilityMapPhraseBackedCapability = {
  /** Deterministic identifier; stable across runs. */
  id: string;
  /** Citation back to the source CapabilityPhrase. */
  phraseRef: {
    report: ArtifactRef;
    phraseId: string;
  };
  verb: string;
  noun: string;
  qualifier?: string[];
  domain?: string;
  pattern?: string;
  layer?: string;
  /** Citations carried from the source phrase. */
  evidenceRefs: ArtifactRef[];
  /** Source normalization-report candidate ids. */
  sourceCandidateIds: string[];
  /** Literal — eligibility filter guarantees it. */
  confidence: "high";
  /** Literal — eligibility filter guarantees it. */
  status: "stable";
};

export type CapabilityMapPhraseBackedSummary = {
  total: number;
  /** Deterministic sorted-key record by canonical verb. */
  byVerb: Record<string, number>;
  /** Deterministic sorted-key record by canonical noun. */
  byNoun: Record<string, number>;
  withDomain: number;
  withPattern: number;
  withLayer: number;
};

export type CapabilityMap = {
  header: ArtifactHeader;
  entries: Array<{
    capability: string;
    subjects: string[];
    systems: string[];
    confidence: number;
    evidence: ArtifactRef[];
  }>;
  /**
   * Optional v2 additions. Populated only when the
   * producer consumed a `CapabilityPhraseReport`.
   * Existing v1 consumers ignore these fields safely.
   */
  phraseBackedCapabilities?: CapabilityMapPhraseBackedCapability[];
  phraseBackedSummary?: CapabilityMapPhraseBackedSummary;
  phraseSourceRef?: ArtifactRef;
};

// --------------------------------------------------------------
// CapabilityContract (policy layer over CapabilityMap v2)
// --------------------------------------------------------------
//
// `CapabilityContract` is the **policy** artifact pinned by
// the CapabilityContract Architecture Decision (Option B,
// thirty-second slice). It is not a projection. It carries
// per-capability binding rules — placement, neighbors,
// required checks, preservation notes — that operators have
// authorised by writing them into
// `.rekon/capability-contracts.json`. The artifact is
// **diagnostic**: nothing routes, lints, or gates on it in
// v1. A future safety review and a separate decision must
// land before any downstream consumer reads it.
//
// V1 emits only `configured` and `unmatched` rows.
// `suggested` is reserved for a future
// suggestion/review workflow and never appears in v1.
//
// **Producer guarantees (enforced upstream, surfaced here
// by the validator):**
// - Every `configured` row carries
//   `capabilityRef.capabilityMapRef` and
//   `capabilityRef.phraseCapabilityId`. The citation chain
//   runs back through the matched phrase-backed capability
//   into the `CapabilityPhrase` and `EvidenceGraph`.
// - `unmatched` rows do NOT carry any policy fields
//   (placement / neighbors / checks / preservation /
//   messages). They exist purely to surface contract IDs
//   that did not bind to a v2 phrase-backed capability so
//   operators can see config drift.
// - `configured` rows carry at least one populated policy
//   field. A configured contract with no rules is a config
//   mistake and the validator rejects it.
//
// **Boundary pins (must not change):**
// - `CapabilityContract` is policy, not projection.
// - `CapabilityMap` v2 remains projection and must not grow
//   policy fields.
// - No source mutation. No config write. No LLM inference.
//   No architecture linting, resolver routing, or
//   verification planning by capability.

export type CapabilityContractPolicyStatus =
  | "configured"
  | "suggested"
  | "unmatched";

export type CapabilityContractCapabilityRef = {
  capabilityMapRef: ArtifactRef;
  phraseCapabilityId: string;
};

export type CapabilityContractMatch = {
  verb: string;
  noun: string;
  domain?: string;
  pattern?: string;
  layer?: string;
};

export type CapabilityContractNeighbor = {
  verb: string;
  noun: string;
};

export type CapabilityContractEntry = {
  /** Stable identifier from the config file (or
   *  generator). Unique within the artifact. */
  id: string;
  /** Citation back into the source `CapabilityMap` v2
   *  entry. Required for `configured` rows. Omitted for
   *  `unmatched` rows. */
  capabilityRef?: CapabilityContractCapabilityRef;
  /** Match block. Conjunctive: every populated field must
   *  agree with the matched phrase-backed capability. */
  match: CapabilityContractMatch;
  /** Policy status. v1 emits `configured` or `unmatched`. */
  status: CapabilityContractPolicyStatus;
  allowedLayers?: string[];
  forbiddenLayers?: string[];
  allowedSystems?: string[];
  forbiddenSystems?: string[];
  requiredChecks?: string[];
  requiredNeighbors?: CapabilityContractNeighbor[];
  forbiddenNeighbors?: CapabilityContractNeighbor[];
  preservationRules?: string[];
  /** Free-form operator notes. Diagnostic only. */
  messages?: string[];
};

export type CapabilityContractSummary = {
  total: number;
  configured: number;
  suggested: number;
  unmatched: number;
  withRequiredChecks: number;
  withPlacementRules: number;
  withPreservationRules: number;
};

export type CapabilityContractSource = {
  /** Repo-relative path to the consumed config file.
   *  Omitted when no config file was present. */
  configPath?: string;
  /** Stable sha256 over the canonical JSON of the
   *  consumed config. Omitted when no config was
   *  present. */
  configHash?: string;
  capabilityMapRef: ArtifactRef;
  phraseReportRef?: ArtifactRef;
};

export type CapabilityContract = {
  header: ArtifactHeader;
  source: CapabilityContractSource;
  summary: CapabilityContractSummary;
  contracts: CapabilityContractEntry[];
};

// ---------- CapabilityArchitectureLintReport (v1) ----------
//
// `CapabilityArchitectureLintReport` is the
// **evaluation** artifact pinned by the Capability-Aware
// Architecture Linting Decision. It records whether
// each configured `CapabilityContract` row's placement
// policy holds against the currently projected
// `CapabilityMap` v2 phrase-backed capability.
//
// v1 evaluates four rule kinds only:
//   - `allowed-layer` / `forbidden-layer`
//   - `allowed-system` / `forbidden-system`
//
// Neighbor and preservation rules are deferred. The
// `required-check` rule is reserved as a row kind but
// is not evaluated in v1; helpers may emit
// `not-evaluated` rows for it.
//
// **Boundary.** This artifact is evaluation, not
// enforcement. It does **not** mutate `FindingReport`,
// `FindingFilterReport`, `FindingLifecycleReport`, or
// `CoherencyDelta`. It does **not** add resolver
// routing, verification planning, or source writes.
// A future explicit bridge slice may promote selected
// rows through the finding lifecycle, but no bridge
// ships in v1.
//
// See:
// - docs/strategy/capability-aware-architecture-linting-decision.md
// - docs/concepts/capability-aware-architecture-linting.md
// - docs/artifacts/capability-architecture-lint-report.md

export type CapabilityArchitectureLintStatus =
  | "violation"
  | "pass"
  | "not-evaluated";

export type CapabilityArchitectureLintRule =
  | "allowed-layer"
  | "forbidden-layer"
  | "allowed-system"
  | "forbidden-system"
  | "required-check"
  | "required-neighbor"
  | "forbidden-neighbor"
  | "preservation-rule";

export type CapabilityArchitectureLintSeverity =
  | "low"
  | "medium"
  | "high";

export type CapabilityArchitectureLintConfidence =
  | "low"
  | "medium"
  | "high";

export type CapabilityArchitectureLintFindingCandidate = {
  title: string;
  category: string;
  severity: CapabilityArchitectureLintSeverity;
};

export type CapabilityArchitectureLintRow = {
  /** Deterministic identifier; stable across runs. */
  id: string;
  /** Citation back to the source `CapabilityContract`
   *  entry. */
  contractId: string;
  /** Citation back to the matched
   *  `CapabilityMap.phraseBackedCapabilities[]` entry.
   *  Empty string when no matching phrase-backed
   *  capability exists (`not-evaluated` rows only). */
  phraseCapabilityId: string;
  rule: CapabilityArchitectureLintRule;
  status: CapabilityArchitectureLintStatus;
  severity: CapabilityArchitectureLintSeverity;
  confidence: CapabilityArchitectureLintConfidence;
  message: string;
  /** Optional citations to upstream evidence. */
  evidenceRefs: ArtifactRef[];
  /** Preview payload reserved for a future finding
   *  bridge slice. Populated only for `violation`
   *  rows. v1 never writes `FindingReport`; this is
   *  context, not enforcement. */
  findingCandidate?: CapabilityArchitectureLintFindingCandidate;
};

export type CapabilityArchitectureLintSummary = {
  total: number;
  violations: number;
  passes: number;
  notEvaluated: number;
  byRule: Record<string, number>;
  bySeverity: Record<string, number>;
};

export type CapabilityArchitectureLintSource = {
  capabilityContractRef: ArtifactRef;
  capabilityMapRef: ArtifactRef;
};

export type CapabilityArchitectureLintReport = {
  header: ArtifactHeader;
  source: CapabilityArchitectureLintSource;
  summary: CapabilityArchitectureLintSummary;
  rows: CapabilityArchitectureLintRow[];
};

// ---------------------------------------------------------------------------
// CapabilityLintFindingBridgeReport
// ---------------------------------------------------------------------------
//
// A **preview** bridge artifact between
// `CapabilityArchitectureLintReport` (policy evaluation) and
// the governed-findings pipeline. It classifies each lint row
// as `eligible` / `ineligible` / `needs-review` for a future
// `FindingReport` writer, and attaches a deterministic
// `proposedFinding` ref to rows that could become governed
// findings later.
//
// **Boundary.** This artifact is preview, **not**
// `FindingReport`. Building or writing a
// `CapabilityLintFindingBridgeReport` does **not** write
// `FindingReport`, and does **not** mutate
// `FindingFilterReport`, `FindingLifecycleReport`,
// `IssueAdjudicationReport`, or `CoherencyDelta`. It creates
// no `WorkOrder` and no `VerificationPlan`. Only a separate,
// explicit `FindingReport` writer decision may promote
// eligible candidates into governed findings — and even then
// they flow through the finding filter chain, the status
// ledger, and adjudication like any other finding.
//
// See:
// - docs/strategy/capability-lint-finding-bridge-decision.md
// - docs/concepts/capability-lint-finding-bridge.md
// - docs/artifacts/capability-lint-finding-bridge-report.md

export type CapabilityLintFindingBridgeDecision =
  | "eligible"
  | "ineligible"
  | "needs-review";

export type CapabilityLintFindingBridgeReason =
  | "violation-with-finding-candidate"
  | "not-a-violation"
  | "missing-finding-candidate"
  | "low-confidence"
  | "low-severity"
  | "not-evaluated"
  | "duplicate-candidate"
  | "missing-evidence"
  | "manual-review-required";

/** Citation back to the originating lint row plus the report
 *  that produced it. */
export type CapabilityLintFindingBridgeSourceLintRowRef = {
  report: ArtifactRef;
  rowId: string;
};

/** Preview-only proposed finding. This is **not** a
 *  `FindingReport` entry — it describes what a future
 *  `FindingReport` writer *could* emit for an eligible row. */
export type CapabilityLintFindingBridgeFindingRef = {
  /** Deterministic, slug-safe finding id; stable across runs.
   *  Shape: `capability-architecture-policy:<rule>:<contractId>:<phraseCapabilityId>`. */
  id: string;
  title: string;
  category: string;
  severity: CapabilityArchitectureLintSeverity;
  evidenceRefs: ArtifactRef[];
  sourceLintRowRef: CapabilityLintFindingBridgeSourceLintRowRef;
};

export type CapabilityLintFindingBridgeCandidate = {
  /** Deterministic identifier; equals the source lint row id,
   *  which is unique within a lint report. */
  id: string;
  /** Citation back to the source lint row. */
  lintRowId: string;
  contractId: string;
  phraseCapabilityId: string;
  decision: CapabilityLintFindingBridgeDecision;
  reason: CapabilityLintFindingBridgeReason;
  severity: CapabilityArchitectureLintSeverity;
  confidence: CapabilityArchitectureLintConfidence;
  /** Present for `eligible` and `needs-review` candidates so
   *  reviewers can see what would be promoted. Absent for
   *  `ineligible` candidates. v1 never writes `FindingReport`. */
  proposedFinding?: CapabilityLintFindingBridgeFindingRef;
  messages?: string[];
};

export type CapabilityLintFindingBridgeSource = {
  lintReportRef: ArtifactRef;
  capabilityContractRef?: ArtifactRef;
  capabilityMapRef?: ArtifactRef;
};

export type CapabilityLintFindingBridgeSummary = {
  totalRows: number;
  eligible: number;
  ineligible: number;
  needsReview: number;
  byReason: Record<string, number>;
  bySeverity: Record<string, number>;
};

export type CapabilityLintFindingBridgeReport = {
  header: ArtifactHeader;
  source: CapabilityLintFindingBridgeSource;
  summary: CapabilityLintFindingBridgeSummary;
  candidates: CapabilityLintFindingBridgeCandidate[];
};

export function createObservedRepo(input: ObservedRepo): ObservedRepo {
  const systems = normalizeSystems(input.systems);
  // Normalize files to a sorted unique list of repo-relative
  // paths. Absolute paths and `.rekon/` artifact paths are
  // dropped at the boundary so consumers can rely on the shape
  // without re-filtering.
  const files = Array.isArray(input.files)
    ? uniqueSorted(
        input.files
          .filter((path): path is string => typeof path === "string" && path.length > 0)
          .map((path) => path.replace(/^\.\//, ""))
          .filter((path) => !path.startsWith("/"))
          .filter((path) => {
            const segments = path.split("/");
            return !segments.includes(".rekon");
          }),
      )
    : undefined;

  const observed: ObservedRepo = {
    header: input.header,
    repository: { ...input.repository },
    systems,
    layers: uniqueSorted([
      ...input.layers,
      ...systems.flatMap((system) => system.layers),
    ]),
    capabilities: uniqueSorted([
      ...input.capabilities,
      ...systems.flatMap((system) => system.capabilities),
    ]),
  };
  if (files && files.length > 0) {
    observed.files = files;
  }
  return assertObservedRepo(observed);
}

export function createOwnershipMap(input: OwnershipMap): OwnershipMap {
  return assertOwnershipMap({
    header: input.header,
    entries: [...dedupeBy(input.entries, (entry) => `${entry.path}:${entry.ownerSystem}:${entry.layer ?? ""}`).values()]
      .map((entry) => ({
        ...entry,
        evidence: normalizeRefs(entry.evidence),
      }))
      .sort((left, right) => `${left.path}:${left.ownerSystem}`.localeCompare(`${right.path}:${right.ownerSystem}`)),
  });
}

export function createCapabilityMap(input: CapabilityMap): CapabilityMap {
  const normalized: CapabilityMap = {
    header: input.header,
    entries: [...dedupeBy(input.entries, (entry) => entry.capability).values()]
      .map((entry) => ({
        ...entry,
        subjects: uniqueSorted(entry.subjects),
        systems: uniqueSorted(entry.systems),
        evidence: normalizeRefs(entry.evidence),
      }))
      .sort((left, right) => left.capability.localeCompare(right.capability)),
  };

  // ---- v2 additive fields ----
  if (Array.isArray(input.phraseBackedCapabilities)) {
    const phraseBacked = [...input.phraseBackedCapabilities]
      .map((entry) => normalizePhraseBackedCapability(entry))
      .sort(comparePhraseBackedCapability);
    if (phraseBacked.length > 0 || input.phraseBackedSummary || input.phraseSourceRef) {
      normalized.phraseBackedCapabilities = phraseBacked;
    }
  }
  if (input.phraseBackedSummary) {
    normalized.phraseBackedSummary = normalizePhraseBackedSummary(
      input.phraseBackedSummary,
    );
  }
  if (input.phraseSourceRef) {
    normalized.phraseSourceRef = assertArtifactRef(input.phraseSourceRef);
  }

  return assertCapabilityMap(normalized);
}

/**
 * Normalise and validate a `CapabilityContract` artifact.
 *
 * Deterministic ordering:
 * - `contracts` are sorted by `(verb asc, noun asc, id
 *   asc)` so two runs over identical input produce
 *   byte-identical artifacts.
 * - Inside each entry, repeated string fields
 *   (`allowed*`, `forbidden*`, `requiredChecks`,
 *   `preservationRules`) are uniqueSorted; neighbor
 *   arrays are deduplicated by `${verb}${noun}`
 *   and sorted by `(verb, noun)`.
 *
 * No source mutation. No config write. No artifact
 * mutation upstream. The producer is responsible for
 * supplying a valid `summary` — the validator re-checks
 * the totals against `contracts.length` and the status
 * counts.
 */
export function createCapabilityContract(
  input: CapabilityContract,
): CapabilityContract {
  const seenIds = new Set<string>();
  const entries: CapabilityContractEntry[] = [];
  for (const raw of input.contracts) {
    if (!raw) continue;
    if (seenIds.has(raw.id)) {
      // Drop later duplicates deterministically; the
      // validator will not see the dropped row, but the
      // producer's tie-break should already have prevented
      // this. Defensive only.
      continue;
    }
    seenIds.add(raw.id);
    entries.push(normalizeCapabilityContractEntry(raw));
  }
  entries.sort(compareCapabilityContractEntry);

  const summary = recountCapabilityContractSummary(entries);

  const source: CapabilityContractSource = {
    capabilityMapRef: assertArtifactRef(input.source.capabilityMapRef),
  };
  if (input.source.configPath !== undefined) {
    source.configPath = input.source.configPath;
  }
  if (input.source.configHash !== undefined) {
    source.configHash = input.source.configHash;
  }
  if (input.source.phraseReportRef !== undefined) {
    source.phraseReportRef = assertArtifactRef(input.source.phraseReportRef);
  }

  return assertCapabilityContract({
    header: input.header,
    source,
    summary,
    contracts: entries,
  });
}

/**
 * Normalise and validate a `CapabilityArchitectureLintReport`
 * artifact.
 *
 * Deterministic ordering:
 * - `rows` are sorted by `(contractId asc, rule asc,
 *   phraseCapabilityId asc, id asc)` so two runs over
 *   identical input produce byte-identical artifacts.
 * - `summary.byRule` / `summary.bySeverity` are key-sorted.
 *
 * No source mutation. No artifact mutation upstream.
 * The producer is responsible for supplying a valid
 * `summary`; the validator re-derives counts and
 * rejects mismatches.
 */
export function createCapabilityArchitectureLintReport(
  input: CapabilityArchitectureLintReport,
): CapabilityArchitectureLintReport {
  const rows: CapabilityArchitectureLintRow[] = [];
  const seenIds = new Set<string>();
  for (const raw of input.rows ?? []) {
    if (!raw) continue;
    if (seenIds.has(raw.id)) continue;
    seenIds.add(raw.id);
    rows.push(normalizeCapabilityArchitectureLintRow(raw));
  }
  rows.sort(compareCapabilityArchitectureLintRow);

  const summary = recountCapabilityArchitectureLintSummary(rows);

  const source: CapabilityArchitectureLintSource = {
    capabilityContractRef: assertArtifactRef(input.source.capabilityContractRef),
    capabilityMapRef: assertArtifactRef(input.source.capabilityMapRef),
  };

  return assertCapabilityArchitectureLintReport({
    header: input.header,
    source,
    summary,
    rows,
  });
}

function normalizePhraseBackedCapability(
  entry: CapabilityMapPhraseBackedCapability,
): CapabilityMapPhraseBackedCapability {
  const out: CapabilityMapPhraseBackedCapability = {
    id: entry.id,
    phraseRef: {
      report: assertArtifactRef(entry.phraseRef.report),
      phraseId: entry.phraseRef.phraseId,
    },
    verb: entry.verb,
    noun: entry.noun,
    evidenceRefs: normalizeRefs(entry.evidenceRefs),
    sourceCandidateIds: uniqueSorted(entry.sourceCandidateIds),
    confidence: "high",
    status: "stable",
  };
  if (entry.qualifier && entry.qualifier.length > 0) {
    out.qualifier = uniqueSorted(entry.qualifier);
  }
  if (entry.domain) out.domain = entry.domain;
  if (entry.pattern) out.pattern = entry.pattern;
  if (entry.layer) out.layer = entry.layer;
  return out;
}

function comparePhraseBackedCapability(
  left: CapabilityMapPhraseBackedCapability,
  right: CapabilityMapPhraseBackedCapability,
): number {
  if (left.verb !== right.verb) return left.verb.localeCompare(right.verb);
  if (left.noun !== right.noun) return left.noun.localeCompare(right.noun);
  return left.id.localeCompare(right.id);
}

function normalizePhraseBackedSummary(
  summary: CapabilityMapPhraseBackedSummary,
): CapabilityMapPhraseBackedSummary {
  return {
    total: summary.total,
    byVerb: sortRecord(summary.byVerb ?? {}),
    byNoun: sortRecord(summary.byNoun ?? {}),
    withDomain: summary.withDomain,
    withPattern: summary.withPattern,
    withLayer: summary.withLayer,
  };
}

function sortRecord(record: Record<string, number>): Record<string, number> {
  const sorted: Record<string, number> = {};
  for (const key of Object.keys(record).sort()) {
    sorted[key] = record[key]!;
  }
  return sorted;
}

function normalizeCapabilityContractEntry(
  entry: CapabilityContractEntry,
): CapabilityContractEntry {
  const out: CapabilityContractEntry = {
    id: entry.id,
    match: {
      verb: entry.match.verb,
      noun: entry.match.noun,
    },
    status: entry.status,
  };
  if (entry.match.domain !== undefined) out.match.domain = entry.match.domain;
  if (entry.match.pattern !== undefined) out.match.pattern = entry.match.pattern;
  if (entry.match.layer !== undefined) out.match.layer = entry.match.layer;

  if (entry.capabilityRef) {
    out.capabilityRef = {
      capabilityMapRef: assertArtifactRef(entry.capabilityRef.capabilityMapRef),
      phraseCapabilityId: entry.capabilityRef.phraseCapabilityId,
    };
  }

  if (entry.allowedLayers && entry.allowedLayers.length > 0) {
    out.allowedLayers = uniqueSorted(entry.allowedLayers);
  }
  if (entry.forbiddenLayers && entry.forbiddenLayers.length > 0) {
    out.forbiddenLayers = uniqueSorted(entry.forbiddenLayers);
  }
  if (entry.allowedSystems && entry.allowedSystems.length > 0) {
    out.allowedSystems = uniqueSorted(entry.allowedSystems);
  }
  if (entry.forbiddenSystems && entry.forbiddenSystems.length > 0) {
    out.forbiddenSystems = uniqueSorted(entry.forbiddenSystems);
  }
  if (entry.requiredChecks && entry.requiredChecks.length > 0) {
    out.requiredChecks = uniqueSorted(entry.requiredChecks);
  }
  if (entry.requiredNeighbors && entry.requiredNeighbors.length > 0) {
    out.requiredNeighbors = normalizeNeighbors(entry.requiredNeighbors);
  }
  if (entry.forbiddenNeighbors && entry.forbiddenNeighbors.length > 0) {
    out.forbiddenNeighbors = normalizeNeighbors(entry.forbiddenNeighbors);
  }
  if (entry.preservationRules && entry.preservationRules.length > 0) {
    out.preservationRules = uniqueSorted(entry.preservationRules);
  }
  if (entry.messages && entry.messages.length > 0) {
    out.messages = entry.messages.filter((m): m is string => typeof m === "string" && m.length > 0);
    if (out.messages.length === 0) delete out.messages;
  }

  return out;
}

function normalizeNeighbors(
  neighbors: CapabilityContractNeighbor[],
): CapabilityContractNeighbor[] {
  const seen = new Set<string>();
  const out: CapabilityContractNeighbor[] = [];
  for (const n of neighbors) {
    if (!n || typeof n.verb !== "string" || typeof n.noun !== "string") continue;
    const key = `${n.verb} ${n.noun}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ verb: n.verb, noun: n.noun });
  }
  out.sort((left, right) => {
    if (left.verb !== right.verb) return left.verb.localeCompare(right.verb);
    return left.noun.localeCompare(right.noun);
  });
  return out;
}

function compareCapabilityContractEntry(
  left: CapabilityContractEntry,
  right: CapabilityContractEntry,
): number {
  if (left.match.verb !== right.match.verb) {
    return left.match.verb.localeCompare(right.match.verb);
  }
  if (left.match.noun !== right.match.noun) {
    return left.match.noun.localeCompare(right.match.noun);
  }
  return left.id.localeCompare(right.id);
}

function recountCapabilityContractSummary(
  entries: CapabilityContractEntry[],
): CapabilityContractSummary {
  let configured = 0;
  let suggested = 0;
  let unmatched = 0;
  let withRequiredChecks = 0;
  let withPlacementRules = 0;
  let withPreservationRules = 0;
  for (const entry of entries) {
    if (entry.status === "configured") configured++;
    else if (entry.status === "suggested") suggested++;
    else if (entry.status === "unmatched") unmatched++;

    if (entry.requiredChecks && entry.requiredChecks.length > 0) {
      withRequiredChecks++;
    }
    const hasPlacement = !!(
      (entry.allowedLayers && entry.allowedLayers.length > 0)
      || (entry.forbiddenLayers && entry.forbiddenLayers.length > 0)
      || (entry.allowedSystems && entry.allowedSystems.length > 0)
      || (entry.forbiddenSystems && entry.forbiddenSystems.length > 0)
    );
    if (hasPlacement) withPlacementRules++;
    if (entry.preservationRules && entry.preservationRules.length > 0) {
      withPreservationRules++;
    }
  }
  return {
    total: entries.length,
    configured,
    suggested,
    unmatched,
    withRequiredChecks,
    withPlacementRules,
    withPreservationRules,
  };
}

function normalizeCapabilityArchitectureLintRow(
  row: CapabilityArchitectureLintRow,
): CapabilityArchitectureLintRow {
  const out: CapabilityArchitectureLintRow = {
    id: row.id,
    contractId: row.contractId,
    phraseCapabilityId: row.phraseCapabilityId ?? "",
    rule: row.rule,
    status: row.status,
    severity: row.severity,
    confidence: row.confidence,
    message: row.message,
    evidenceRefs: normalizeRefs(row.evidenceRefs ?? []),
  };
  if (row.findingCandidate) {
    out.findingCandidate = {
      title: row.findingCandidate.title,
      category: row.findingCandidate.category,
      severity: row.findingCandidate.severity,
    };
  }
  return out;
}

function compareCapabilityArchitectureLintRow(
  left: CapabilityArchitectureLintRow,
  right: CapabilityArchitectureLintRow,
): number {
  if (left.contractId !== right.contractId) {
    return left.contractId.localeCompare(right.contractId);
  }
  if (left.rule !== right.rule) {
    return left.rule.localeCompare(right.rule);
  }
  if (left.phraseCapabilityId !== right.phraseCapabilityId) {
    return left.phraseCapabilityId.localeCompare(right.phraseCapabilityId);
  }
  return left.id.localeCompare(right.id);
}

function recountCapabilityArchitectureLintSummary(
  rows: CapabilityArchitectureLintRow[],
): CapabilityArchitectureLintSummary {
  let violations = 0;
  let passes = 0;
  let notEvaluated = 0;
  const byRule: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const row of rows) {
    if (row.status === "violation") violations++;
    else if (row.status === "pass") passes++;
    else if (row.status === "not-evaluated") notEvaluated++;
    byRule[row.rule] = (byRule[row.rule] ?? 0) + 1;
    bySeverity[row.severity] = (bySeverity[row.severity] ?? 0) + 1;
  }
  return {
    total: rows.length,
    violations,
    passes,
    notEvaluated,
    byRule: sortRecord(byRule),
    bySeverity: sortRecord(bySeverity),
  };
}

/**
 * Normalize a `CapabilityLintFindingBridgeReport`:
 * dedupe candidates by `id`, sort deterministically, and
 * recompute the summary from the candidates so callers cannot
 * persist a stale summary. The decision/reason on each
 * candidate are authored upstream (in
 * `buildCapabilityLintFindingBridgeReport`); the factory does
 * not re-classify or re-run duplicate detection.
 *
 * This factory does not read or write `FindingReport`,
 * `FindingFilterReport`, `FindingLifecycleReport`,
 * `IssueAdjudicationReport`, or `CoherencyDelta`.
 */
export function createCapabilityLintFindingBridgeReport(
  input: CapabilityLintFindingBridgeReport,
): CapabilityLintFindingBridgeReport {
  const candidates: CapabilityLintFindingBridgeCandidate[] = [];
  const seenIds = new Set<string>();
  for (const raw of input.candidates ?? []) {
    if (!raw) continue;
    if (seenIds.has(raw.id)) continue;
    seenIds.add(raw.id);
    candidates.push(normalizeCapabilityLintFindingBridgeCandidate(raw));
  }
  candidates.sort(compareCapabilityLintFindingBridgeCandidate);

  const summary = recountCapabilityLintFindingBridgeSummary(candidates);

  const source: CapabilityLintFindingBridgeSource = {
    lintReportRef: assertArtifactRef(input.source.lintReportRef),
  };
  if (input.source.capabilityContractRef) {
    source.capabilityContractRef = assertArtifactRef(
      input.source.capabilityContractRef,
    );
  }
  if (input.source.capabilityMapRef) {
    source.capabilityMapRef = assertArtifactRef(input.source.capabilityMapRef);
  }

  return assertCapabilityLintFindingBridgeReport({
    header: input.header,
    source,
    summary,
    candidates,
  });
}

function normalizeCapabilityLintFindingBridgeCandidate(
  candidate: CapabilityLintFindingBridgeCandidate,
): CapabilityLintFindingBridgeCandidate {
  const out: CapabilityLintFindingBridgeCandidate = {
    id: candidate.id,
    lintRowId: candidate.lintRowId,
    contractId: candidate.contractId,
    phraseCapabilityId: candidate.phraseCapabilityId ?? "",
    decision: candidate.decision,
    reason: candidate.reason,
    severity: candidate.severity,
    confidence: candidate.confidence,
  };
  if (candidate.proposedFinding) {
    out.proposedFinding = {
      id: candidate.proposedFinding.id,
      title: candidate.proposedFinding.title,
      category: candidate.proposedFinding.category,
      severity: candidate.proposedFinding.severity,
      evidenceRefs: normalizeRefs(candidate.proposedFinding.evidenceRefs ?? []),
      sourceLintRowRef: {
        report: assertArtifactRef(
          candidate.proposedFinding.sourceLintRowRef.report,
        ),
        rowId: candidate.proposedFinding.sourceLintRowRef.rowId,
      },
    };
  }
  if (candidate.messages && candidate.messages.length > 0) {
    out.messages = candidate.messages.filter(
      (message): message is string =>
        typeof message === "string" && message.length > 0,
    );
    if (out.messages.length === 0) delete out.messages;
  }
  return out;
}

function compareCapabilityLintFindingBridgeCandidate(
  left: CapabilityLintFindingBridgeCandidate,
  right: CapabilityLintFindingBridgeCandidate,
): number {
  if (left.contractId !== right.contractId) {
    return left.contractId.localeCompare(right.contractId);
  }
  if (left.lintRowId !== right.lintRowId) {
    return left.lintRowId.localeCompare(right.lintRowId);
  }
  return left.id.localeCompare(right.id);
}

function recountCapabilityLintFindingBridgeSummary(
  candidates: CapabilityLintFindingBridgeCandidate[],
): CapabilityLintFindingBridgeSummary {
  let eligible = 0;
  let ineligible = 0;
  let needsReview = 0;
  const byReason: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const candidate of candidates) {
    if (candidate.decision === "eligible") eligible++;
    else if (candidate.decision === "ineligible") ineligible++;
    else if (candidate.decision === "needs-review") needsReview++;
    byReason[candidate.reason] = (byReason[candidate.reason] ?? 0) + 1;
    bySeverity[candidate.severity] = (bySeverity[candidate.severity] ?? 0) + 1;
  }
  return {
    totalRows: candidates.length,
    eligible,
    ineligible,
    needsReview,
    byReason: sortRecord(byReason),
    bySeverity: sortRecord(bySeverity),
  };
}

export function validateObservedRepo(value: unknown): ValidationResult<ObservedRepo> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  validateModelHeader(value.header, "ObservedRepo", "$.header", issues);
  validateRepository(value.repository, "$.repository", issues);

  if (!Array.isArray(value.systems)) {
    issues.push({ path: "$.systems", message: "Expected an array." });
  } else {
    value.systems.forEach((system, index) => validateObservedSystem(system, `$.systems[${index}]`, issues));
  }

  if (!isStringArray(value.layers)) {
    issues.push({ path: "$.layers", message: "Expected an array of strings." });
  }

  if (!isStringArray(value.capabilities)) {
    issues.push({ path: "$.capabilities", message: "Expected an array of strings." });
  }

  if (value.files !== undefined && !isStringArray(value.files)) {
    issues.push({ path: "$.files", message: "Expected an array of strings when present." });
  }

  return validationResult(value as ObservedRepo, issues);
}

export function validateOwnershipMap(value: unknown): ValidationResult<OwnershipMap> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  validateModelHeader(value.header, "OwnershipMap", "$.header", issues);

  if (!Array.isArray(value.entries)) {
    issues.push({ path: "$.entries", message: "Expected an array." });
  } else {
    value.entries.forEach((entry, index) => validateOwnershipEntry(entry, `$.entries[${index}]`, issues));
  }

  return validationResult(value as OwnershipMap, issues);
}

export function validateCapabilityMap(value: unknown): ValidationResult<CapabilityMap> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  validateModelHeader(value.header, "CapabilityMap", "$.header", issues);

  if (!Array.isArray(value.entries)) {
    issues.push({ path: "$.entries", message: "Expected an array." });
  } else {
    value.entries.forEach((entry, index) => validateCapabilityEntry(entry, `$.entries[${index}]`, issues));
  }

  // v2 additive fields. All optional; absence is fine.
  if (value.phraseBackedCapabilities !== undefined) {
    if (!Array.isArray(value.phraseBackedCapabilities)) {
      issues.push({
        path: "$.phraseBackedCapabilities",
        message: "Expected an array when present.",
      });
    } else {
      value.phraseBackedCapabilities.forEach((entry, index) =>
        validatePhraseBackedCapability(entry, `$.phraseBackedCapabilities[${index}]`, issues),
      );
    }
  }
  if (value.phraseBackedSummary !== undefined) {
    validatePhraseBackedSummary(value.phraseBackedSummary, "$.phraseBackedSummary", issues);
  }
  if (value.phraseSourceRef !== undefined) {
    const result = validateArtifactRef(value.phraseSourceRef);
    if (!result.ok) {
      issues.push(...prefixIssues(result.issues, "$.phraseSourceRef"));
    }
  }

  return validationResult(value as CapabilityMap, issues);
}

export function validateCapabilityContract(
  value: unknown,
): ValidationResult<CapabilityContract> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  validateModelHeader(value.header, "CapabilityContract", "$.header", issues);

  // ---- source ----
  if (!isRecord(value.source)) {
    issues.push({ path: "$.source", message: "Expected an object." });
  } else {
    const sourceRefResult = validateArtifactRef(value.source.capabilityMapRef);
    if (!sourceRefResult.ok) {
      issues.push(...prefixIssues(sourceRefResult.issues, "$.source.capabilityMapRef"));
    }
    if (value.source.phraseReportRef !== undefined) {
      const phraseRefResult = validateArtifactRef(value.source.phraseReportRef);
      if (!phraseRefResult.ok) {
        issues.push(...prefixIssues(phraseRefResult.issues, "$.source.phraseReportRef"));
      }
    }
    if (
      value.source.configPath !== undefined
      && typeof value.source.configPath !== "string"
    ) {
      issues.push({
        path: "$.source.configPath",
        message: "Expected a string when present.",
      });
    }
    if (
      value.source.configHash !== undefined
      && typeof value.source.configHash !== "string"
    ) {
      issues.push({
        path: "$.source.configHash",
        message: "Expected a string when present.",
      });
    }
  }

  // ---- contracts ----
  let entries: unknown[] = [];
  if (!Array.isArray(value.contracts)) {
    issues.push({ path: "$.contracts", message: "Expected an array." });
  } else {
    entries = value.contracts;
    const seenIds = new Set<string>();
    entries.forEach((entry, index) =>
      validateCapabilityContractEntry(
        entry,
        `$.contracts[${index}]`,
        issues,
        seenIds,
      ),
    );
  }

  // ---- summary ----
  if (!isRecord(value.summary)) {
    issues.push({ path: "$.summary", message: "Expected an object." });
  } else {
    for (const field of [
      "total",
      "configured",
      "suggested",
      "unmatched",
      "withRequiredChecks",
      "withPlacementRules",
      "withPreservationRules",
    ] as const) {
      const fieldValue = value.summary[field];
      if (
        typeof fieldValue !== "number"
        || !Number.isInteger(fieldValue)
        || fieldValue < 0
      ) {
        issues.push({
          path: `$.summary.${field}`,
          message: "Expected a non-negative integer.",
        });
      }
    }
    // Re-derive and compare counts to the producer-supplied
    // summary so artifacts with stale counts are rejected.
    if (Array.isArray(entries)) {
      const computed = recountCapabilityContractSummary(
        entries.filter(isRecord) as unknown as CapabilityContractEntry[],
      );
      for (const field of [
        "total",
        "configured",
        "suggested",
        "unmatched",
        "withRequiredChecks",
        "withPlacementRules",
        "withPreservationRules",
      ] as const) {
        if (
          typeof value.summary[field] === "number"
          && value.summary[field] !== computed[field]
        ) {
          issues.push({
            path: `$.summary.${field}`,
            message: `Expected ${computed[field]} (recomputed from contracts).`,
          });
        }
      }
    }
  }

  return validationResult(value as CapabilityContract, issues);
}

function validateCapabilityContractEntry(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  seenIds: Set<string>,
): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  pushRequiredStringIssue(issues, value.id, `${path}.id`);
  if (typeof value.id === "string") {
    if (seenIds.has(value.id)) {
      issues.push({
        path: `${path}.id`,
        message: `Duplicate contract id ${JSON.stringify(value.id)}.`,
      });
    } else {
      seenIds.add(value.id);
    }
  }

  // ---- status ----
  if (
    value.status !== "configured"
    && value.status !== "suggested"
    && value.status !== "unmatched"
  ) {
    issues.push({
      path: `${path}.status`,
      message: 'Expected one of "configured" | "suggested" | "unmatched".',
    });
  }

  // ---- match block ----
  if (!isRecord(value.match)) {
    issues.push({ path: `${path}.match`, message: "Expected an object." });
  } else {
    pushRequiredStringIssue(issues, value.match.verb, `${path}.match.verb`);
    pushRequiredStringIssue(issues, value.match.noun, `${path}.match.noun`);
    for (const field of ["domain", "pattern", "layer"] as const) {
      const fieldValue = (value.match as Record<string, unknown>)[field];
      if (fieldValue !== undefined && typeof fieldValue !== "string") {
        issues.push({
          path: `${path}.match.${field}`,
          message: "Expected a string when present.",
        });
      }
    }
  }

  // ---- capabilityRef (required for configured) ----
  if (value.status === "configured") {
    if (!isRecord(value.capabilityRef)) {
      issues.push({
        path: `${path}.capabilityRef`,
        message: "Expected an object for configured rows.",
      });
    } else {
      pushRequiredStringIssue(
        issues,
        value.capabilityRef.phraseCapabilityId,
        `${path}.capabilityRef.phraseCapabilityId`,
      );
      const refResult = validateArtifactRef(value.capabilityRef.capabilityMapRef);
      if (!refResult.ok) {
        issues.push(
          ...prefixIssues(refResult.issues, `${path}.capabilityRef.capabilityMapRef`),
        );
      }
    }
  } else if (value.capabilityRef !== undefined) {
    // unmatched / suggested rows MUST NOT carry a capabilityRef.
    issues.push({
      path: `${path}.capabilityRef`,
      message: `Expected absent for ${value.status} rows.`,
    });
  }

  // ---- policy fields ----
  const stringArrayFields = [
    "allowedLayers",
    "forbiddenLayers",
    "allowedSystems",
    "forbiddenSystems",
    "requiredChecks",
    "preservationRules",
    "messages",
  ] as const;
  let policyFieldCount = 0;
  for (const field of stringArrayFields) {
    const fieldValue = (value as Record<string, unknown>)[field];
    if (fieldValue === undefined) continue;
    if (!isStringArray(fieldValue)) {
      issues.push({
        path: `${path}.${field}`,
        message: "Expected an array of strings when present.",
      });
      continue;
    }
    if (fieldValue.length > 0) policyFieldCount++;
  }
  for (const field of ["requiredNeighbors", "forbiddenNeighbors"] as const) {
    const fieldValue = (value as Record<string, unknown>)[field];
    if (fieldValue === undefined) continue;
    if (!Array.isArray(fieldValue)) {
      issues.push({
        path: `${path}.${field}`,
        message: "Expected an array when present.",
      });
      continue;
    }
    fieldValue.forEach((neighbor, index) => {
      if (!isRecord(neighbor)) {
        issues.push({
          path: `${path}.${field}[${index}]`,
          message: "Expected an object.",
        });
        return;
      }
      pushRequiredStringIssue(issues, neighbor.verb, `${path}.${field}[${index}].verb`);
      pushRequiredStringIssue(issues, neighbor.noun, `${path}.${field}[${index}].noun`);
    });
    if (fieldValue.length > 0) policyFieldCount++;
  }

  // unmatched rows MUST carry no policy fields.
  if (value.status === "unmatched" && policyFieldCount > 0) {
    issues.push({
      path,
      message: "Expected no policy fields populated for unmatched rows.",
    });
  }
  // configured rows MUST carry at least one policy field.
  if (value.status === "configured" && policyFieldCount === 0) {
    issues.push({
      path,
      message: "Expected at least one populated policy field for configured rows.",
    });
  }
}

const LINT_STATUSES = new Set<string>([
  "violation",
  "pass",
  "not-evaluated",
]);
const LINT_RULES = new Set<string>([
  "allowed-layer",
  "forbidden-layer",
  "allowed-system",
  "forbidden-system",
  "required-check",
  "required-neighbor",
  "forbidden-neighbor",
  "preservation-rule",
]);
const LINT_SEVERITIES = new Set<string>(["low", "medium", "high"]);
const LINT_CONFIDENCES = new Set<string>(["low", "medium", "high"]);

const BRIDGE_DECISIONS = new Set<string>([
  "eligible",
  "ineligible",
  "needs-review",
]);
const BRIDGE_REASONS = new Set<string>([
  "violation-with-finding-candidate",
  "not-a-violation",
  "missing-finding-candidate",
  "low-confidence",
  "low-severity",
  "not-evaluated",
  "duplicate-candidate",
  "missing-evidence",
  "manual-review-required",
]);

export function validateCapabilityArchitectureLintReport(
  value: unknown,
): ValidationResult<CapabilityArchitectureLintReport> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  validateModelHeader(
    value.header,
    "CapabilityArchitectureLintReport",
    "$.header",
    issues,
  );

  // ---- source ----
  if (!isRecord(value.source)) {
    issues.push({ path: "$.source", message: "Expected an object." });
  } else {
    const contractResult = validateArtifactRef(value.source.capabilityContractRef);
    if (!contractResult.ok) {
      issues.push(
        ...prefixIssues(contractResult.issues, "$.source.capabilityContractRef"),
      );
    }
    const mapResult = validateArtifactRef(value.source.capabilityMapRef);
    if (!mapResult.ok) {
      issues.push(
        ...prefixIssues(mapResult.issues, "$.source.capabilityMapRef"),
      );
    }
  }

  // ---- rows ----
  let rows: unknown[] = [];
  if (!Array.isArray(value.rows)) {
    issues.push({ path: "$.rows", message: "Expected an array." });
  } else {
    rows = value.rows;
    const seenIds = new Set<string>();
    rows.forEach((row, index) =>
      validateCapabilityArchitectureLintRow(row, `$.rows[${index}]`, issues, seenIds),
    );
  }

  // ---- summary ----
  if (!isRecord(value.summary)) {
    issues.push({ path: "$.summary", message: "Expected an object." });
  } else {
    for (const field of [
      "total",
      "violations",
      "passes",
      "notEvaluated",
    ] as const) {
      const v = (value.summary as Record<string, unknown>)[field];
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
        issues.push({
          path: `$.summary.${field}`,
          message: "Expected a non-negative integer.",
        });
      }
    }
    for (const field of ["byRule", "bySeverity"] as const) {
      const v = (value.summary as Record<string, unknown>)[field];
      if (!isRecord(v)) {
        issues.push({
          path: `$.summary.${field}`,
          message: "Expected an object of non-negative integers.",
        });
        continue;
      }
      for (const [key, count] of Object.entries(v as Record<string, unknown>)) {
        if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
          issues.push({
            path: `$.summary.${field}.${key}`,
            message: "Expected a non-negative integer.",
          });
        }
      }
    }
    // Re-derive and compare counts to the producer-supplied
    // summary so artifacts with stale counts are rejected.
    if (Array.isArray(rows)) {
      const computed = recountCapabilityArchitectureLintSummary(
        rows.filter(isRecord) as unknown as CapabilityArchitectureLintRow[],
      );
      for (const field of [
        "total",
        "violations",
        "passes",
        "notEvaluated",
      ] as const) {
        const supplied = (value.summary as Record<string, unknown>)[field];
        if (typeof supplied === "number" && supplied !== computed[field]) {
          issues.push({
            path: `$.summary.${field}`,
            message: `Expected ${computed[field]} (recomputed from rows).`,
          });
        }
      }
    }
  }

  return validationResult(value as CapabilityArchitectureLintReport, issues);
}

function validateCapabilityArchitectureLintRow(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  seenIds: Set<string>,
): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  pushRequiredStringIssue(issues, value.id, `${path}.id`);
  pushRequiredStringIssue(issues, value.contractId, `${path}.contractId`);
  if (typeof value.id === "string" && value.id.length > 0) {
    if (seenIds.has(value.id)) {
      issues.push({ path: `${path}.id`, message: "Expected a unique row id." });
    } else {
      seenIds.add(value.id);
    }
  }
  if (typeof value.phraseCapabilityId !== "string") {
    issues.push({
      path: `${path}.phraseCapabilityId`,
      message: "Expected a string (may be empty for not-evaluated rows).",
    });
  }
  if (typeof value.rule !== "string" || !LINT_RULES.has(value.rule)) {
    issues.push({
      path: `${path}.rule`,
      message:
        "Expected one of allowed-layer | forbidden-layer | allowed-system | forbidden-system | required-check | required-neighbor | forbidden-neighbor | preservation-rule.",
    });
  }
  if (typeof value.status !== "string" || !LINT_STATUSES.has(value.status)) {
    issues.push({
      path: `${path}.status`,
      message: "Expected one of violation | pass | not-evaluated.",
    });
  }
  if (typeof value.severity !== "string" || !LINT_SEVERITIES.has(value.severity)) {
    issues.push({
      path: `${path}.severity`,
      message: "Expected one of low | medium | high.",
    });
  }
  if (typeof value.confidence !== "string" || !LINT_CONFIDENCES.has(value.confidence)) {
    issues.push({
      path: `${path}.confidence`,
      message: "Expected one of low | medium | high.",
    });
  }
  pushRequiredStringIssue(issues, value.message, `${path}.message`);
  if (!Array.isArray(value.evidenceRefs)) {
    issues.push({
      path: `${path}.evidenceRefs`,
      message: "Expected an array of artifact refs.",
    });
  } else {
    value.evidenceRefs.forEach((ref, index) => {
      const result = validateArtifactRef(ref);
      if (!result.ok) {
        issues.push(...prefixIssues(result.issues, `${path}.evidenceRefs[${index}]`));
      }
    });
  }
  if (value.findingCandidate !== undefined) {
    const candidate = value.findingCandidate;
    if (!isRecord(candidate)) {
      issues.push({
        path: `${path}.findingCandidate`,
        message: "Expected an object when present.",
      });
    } else {
      pushRequiredStringIssue(issues, candidate.title, `${path}.findingCandidate.title`);
      pushRequiredStringIssue(issues, candidate.category, `${path}.findingCandidate.category`);
      if (
        typeof candidate.severity !== "string"
        || !LINT_SEVERITIES.has(candidate.severity)
      ) {
        issues.push({
          path: `${path}.findingCandidate.severity`,
          message: "Expected one of low | medium | high.",
        });
      }
    }
  }
}

export function validateCapabilityLintFindingBridgeReport(
  value: unknown,
): ValidationResult<CapabilityLintFindingBridgeReport> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  validateModelHeader(
    value.header,
    "CapabilityLintFindingBridgeReport",
    "$.header",
    issues,
  );

  // ---- source ----
  if (!isRecord(value.source)) {
    issues.push({ path: "$.source", message: "Expected an object." });
  } else {
    const lintResult = validateArtifactRef(value.source.lintReportRef);
    if (!lintResult.ok) {
      issues.push(...prefixIssues(lintResult.issues, "$.source.lintReportRef"));
    }
    if (value.source.capabilityContractRef !== undefined) {
      const result = validateArtifactRef(value.source.capabilityContractRef);
      if (!result.ok) {
        issues.push(
          ...prefixIssues(result.issues, "$.source.capabilityContractRef"),
        );
      }
    }
    if (value.source.capabilityMapRef !== undefined) {
      const result = validateArtifactRef(value.source.capabilityMapRef);
      if (!result.ok) {
        issues.push(...prefixIssues(result.issues, "$.source.capabilityMapRef"));
      }
    }
  }

  // ---- candidates ----
  let candidates: unknown[] = [];
  if (!Array.isArray(value.candidates)) {
    issues.push({ path: "$.candidates", message: "Expected an array." });
  } else {
    candidates = value.candidates;
    const seenIds = new Set<string>();
    candidates.forEach((candidate, index) =>
      validateCapabilityLintFindingBridgeCandidate(
        candidate,
        `$.candidates[${index}]`,
        issues,
        seenIds,
      ),
    );
  }

  // ---- summary ----
  if (!isRecord(value.summary)) {
    issues.push({ path: "$.summary", message: "Expected an object." });
  } else {
    for (const field of [
      "totalRows",
      "eligible",
      "ineligible",
      "needsReview",
    ] as const) {
      const v = (value.summary as Record<string, unknown>)[field];
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
        issues.push({
          path: `$.summary.${field}`,
          message: "Expected a non-negative integer.",
        });
      }
    }
    for (const field of ["byReason", "bySeverity"] as const) {
      const v = (value.summary as Record<string, unknown>)[field];
      if (!isRecord(v)) {
        issues.push({
          path: `$.summary.${field}`,
          message: "Expected an object of non-negative integers.",
        });
        continue;
      }
      for (const [key, count] of Object.entries(v as Record<string, unknown>)) {
        if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
          issues.push({
            path: `$.summary.${field}.${key}`,
            message: "Expected a non-negative integer.",
          });
        }
      }
    }
    // Re-derive and compare counts so artifacts with stale
    // summaries are rejected.
    if (Array.isArray(candidates)) {
      const computed = recountCapabilityLintFindingBridgeSummary(
        candidates.filter(
          isRecord,
        ) as unknown as CapabilityLintFindingBridgeCandidate[],
      );
      for (const field of [
        "totalRows",
        "eligible",
        "ineligible",
        "needsReview",
      ] as const) {
        const supplied = (value.summary as Record<string, unknown>)[field];
        if (typeof supplied === "number" && supplied !== computed[field]) {
          issues.push({
            path: `$.summary.${field}`,
            message: `Expected ${computed[field]} (recomputed from candidates).`,
          });
        }
      }
    }
  }

  return validationResult(value as CapabilityLintFindingBridgeReport, issues);
}

function validateCapabilityLintFindingBridgeCandidate(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  seenIds: Set<string>,
): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  pushRequiredStringIssue(issues, value.id, `${path}.id`);
  pushRequiredStringIssue(issues, value.lintRowId, `${path}.lintRowId`);
  pushRequiredStringIssue(issues, value.contractId, `${path}.contractId`);
  if (typeof value.id === "string" && value.id.length > 0) {
    if (seenIds.has(value.id)) {
      issues.push({
        path: `${path}.id`,
        message: "Expected a unique candidate id.",
      });
    } else {
      seenIds.add(value.id);
    }
  }
  if (typeof value.phraseCapabilityId !== "string") {
    issues.push({
      path: `${path}.phraseCapabilityId`,
      message: "Expected a string (may be empty).",
    });
  }
  if (typeof value.decision !== "string" || !BRIDGE_DECISIONS.has(value.decision)) {
    issues.push({
      path: `${path}.decision`,
      message: "Expected one of eligible | ineligible | needs-review.",
    });
  }
  if (typeof value.reason !== "string" || !BRIDGE_REASONS.has(value.reason)) {
    issues.push({
      path: `${path}.reason`,
      message:
        "Expected a known bridge reason (e.g. violation-with-finding-candidate | not-a-violation | duplicate-candidate).",
    });
  }
  if (typeof value.severity !== "string" || !LINT_SEVERITIES.has(value.severity)) {
    issues.push({
      path: `${path}.severity`,
      message: "Expected one of low | medium | high.",
    });
  }
  if (
    typeof value.confidence !== "string"
    || !LINT_CONFIDENCES.has(value.confidence)
  ) {
    issues.push({
      path: `${path}.confidence`,
      message: "Expected one of low | medium | high.",
    });
  }
  if (value.proposedFinding !== undefined) {
    validateCapabilityLintFindingBridgeFindingRef(
      value.proposedFinding,
      `${path}.proposedFinding`,
      issues,
    );
  }
  if (value.messages !== undefined && !isStringArray(value.messages)) {
    issues.push({
      path: `${path}.messages`,
      message: "Expected an array of strings when present.",
    });
  }
}

function validateCapabilityLintFindingBridgeFindingRef(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object when present." });
    return;
  }
  pushRequiredStringIssue(issues, value.id, `${path}.id`);
  pushRequiredStringIssue(issues, value.title, `${path}.title`);
  pushRequiredStringIssue(issues, value.category, `${path}.category`);
  if (typeof value.severity !== "string" || !LINT_SEVERITIES.has(value.severity)) {
    issues.push({
      path: `${path}.severity`,
      message: "Expected one of low | medium | high.",
    });
  }
  if (!Array.isArray(value.evidenceRefs)) {
    issues.push({
      path: `${path}.evidenceRefs`,
      message: "Expected an array of artifact refs.",
    });
  } else if (value.evidenceRefs.length === 0) {
    issues.push({
      path: `${path}.evidenceRefs`,
      message: "Expected a non-empty array of artifact refs for a proposed finding.",
    });
  } else {
    value.evidenceRefs.forEach((ref, index) => {
      const result = validateArtifactRef(ref);
      if (!result.ok) {
        issues.push(...prefixIssues(result.issues, `${path}.evidenceRefs[${index}]`));
      }
    });
  }
  if (!isRecord(value.sourceLintRowRef)) {
    issues.push({
      path: `${path}.sourceLintRowRef`,
      message: "Expected an object.",
    });
  } else {
    const reportResult = validateArtifactRef(value.sourceLintRowRef.report);
    if (!reportResult.ok) {
      issues.push(
        ...prefixIssues(reportResult.issues, `${path}.sourceLintRowRef.report`),
      );
    }
    pushRequiredStringIssue(
      issues,
      value.sourceLintRowRef.rowId,
      `${path}.sourceLintRowRef.rowId`,
    );
  }
}

export function assertObservedRepo(value: unknown): ObservedRepo {
  return assertValid(validateObservedRepo(value), "ObservedRepo");
}

export function assertOwnershipMap(value: unknown): OwnershipMap {
  return assertValid(validateOwnershipMap(value), "OwnershipMap");
}

export function assertCapabilityMap(value: unknown): CapabilityMap {
  return assertValid(validateCapabilityMap(value), "CapabilityMap");
}

export function assertCapabilityContract(value: unknown): CapabilityContract {
  return assertValid(validateCapabilityContract(value), "CapabilityContract");
}

export function assertCapabilityArchitectureLintReport(
  value: unknown,
): CapabilityArchitectureLintReport {
  return assertValid(
    validateCapabilityArchitectureLintReport(value),
    "CapabilityArchitectureLintReport",
  );
}

export function assertCapabilityLintFindingBridgeReport(
  value: unknown,
): CapabilityLintFindingBridgeReport {
  return assertValid(
    validateCapabilityLintFindingBridgeReport(value),
    "CapabilityLintFindingBridgeReport",
  );
}

export const observedRepoSchema: ArtifactSchema<ObservedRepo> = {
  validate: validateObservedRepo,
  parse: assertObservedRepo,
};

export const ownershipMapSchema: ArtifactSchema<OwnershipMap> = {
  validate: validateOwnershipMap,
  parse: assertOwnershipMap,
};

export const capabilityMapSchema: ArtifactSchema<CapabilityMap> = {
  validate: validateCapabilityMap,
  parse: assertCapabilityMap,
};

export const capabilityContractSchema: ArtifactSchema<CapabilityContract> = {
  validate: validateCapabilityContract,
  parse: assertCapabilityContract,
};

export const capabilityArchitectureLintReportSchema: ArtifactSchema<CapabilityArchitectureLintReport> = {
  validate: validateCapabilityArchitectureLintReport,
  parse: assertCapabilityArchitectureLintReport,
};

export const capabilityLintFindingBridgeReportSchema: ArtifactSchema<CapabilityLintFindingBridgeReport> = {
  validate: validateCapabilityLintFindingBridgeReport,
  parse: assertCapabilityLintFindingBridgeReport,
};

// ---- BridgeFindingLifecycleIntegrationReport (preview) ----
//
// Preview artifact modeling how bridge-derived `FindingReport`
// entries WOULD enter the finding filter / lifecycle / adjudication
// / CoherencyDelta chain. It is **preview, not
// `FindingLifecycleReport`**: it assigns no real lifecycle status and
// mutates no governance artifact. `initialLifecycleStatus` is a
// *modeled* status (`new` for ready entries), never written.

export type BridgeFindingLifecycleIntegrationDecision =
  | "ready-for-lifecycle"
  | "filtered"
  | "needs-review"
  | "duplicate"
  | "ineligible";

export type BridgeFindingLifecycleIntegrationStatus =
  | "new"
  | "active"
  | "suppressed"
  | "resolved";

export type BridgeFindingLifecycleIntegrationEntry = {
  id: string;
  findingId: string;
  decision: BridgeFindingLifecycleIntegrationDecision;
  initialLifecycleStatus?: BridgeFindingLifecycleIntegrationStatus;
  severity: "low" | "medium" | "high";
  sourceBridgeCandidateId?: string;
  sourceLintRowId?: string;
  sourceContractId?: string;
  sourcePhraseCapabilityId?: string;
  evidenceRefs: ArtifactRef[];
  messages?: string[];
};

export type BridgeFindingLifecycleIntegrationSource = {
  findingReportRef: ArtifactRef;
  filterReportRef?: ArtifactRef;
  lifecycleReportRef?: ArtifactRef;
  issueAdjudicationReportRef?: ArtifactRef;
};

export type BridgeFindingLifecycleIntegrationSummary = {
  totalBridgeFindings: number;
  readyForLifecycle: number;
  filtered: number;
  needsReview: number;
  duplicate: number;
  ineligible: number;
  bySeverity: Record<string, number>;
};

export type BridgeFindingLifecycleIntegrationReport = {
  header: ArtifactHeader;
  source: BridgeFindingLifecycleIntegrationSource;
  summary: BridgeFindingLifecycleIntegrationSummary;
  entries: BridgeFindingLifecycleIntegrationEntry[];
};

const BRIDGE_LIFECYCLE_INTEGRATION_DECISIONS = new Set<string>([
  "ready-for-lifecycle",
  "filtered",
  "needs-review",
  "duplicate",
  "ineligible",
]);

const BRIDGE_LIFECYCLE_INTEGRATION_STATUSES = new Set<string>([
  "new",
  "active",
  "suppressed",
  "resolved",
]);

const BRIDGE_LIFECYCLE_INTEGRATION_SEVERITIES = new Set<string>([
  "low",
  "medium",
  "high",
]);

export function createBridgeFindingLifecycleIntegrationReport(
  input: BridgeFindingLifecycleIntegrationReport,
): BridgeFindingLifecycleIntegrationReport {
  const entries: BridgeFindingLifecycleIntegrationEntry[] = [];
  const seenIds = new Set<string>();
  for (const raw of input.entries ?? []) {
    if (!raw) continue;
    if (seenIds.has(raw.id)) continue;
    seenIds.add(raw.id);
    entries.push(normalizeBridgeFindingLifecycleIntegrationEntry(raw));
  }
  entries.sort(compareBridgeFindingLifecycleIntegrationEntry);

  const summary = recountBridgeFindingLifecycleIntegrationSummary(entries);

  const source: BridgeFindingLifecycleIntegrationSource = {
    findingReportRef: assertArtifactRef(input.source.findingReportRef),
  };
  if (input.source.filterReportRef) {
    source.filterReportRef = assertArtifactRef(input.source.filterReportRef);
  }
  if (input.source.lifecycleReportRef) {
    source.lifecycleReportRef = assertArtifactRef(
      input.source.lifecycleReportRef,
    );
  }
  if (input.source.issueAdjudicationReportRef) {
    source.issueAdjudicationReportRef = assertArtifactRef(
      input.source.issueAdjudicationReportRef,
    );
  }

  return assertBridgeFindingLifecycleIntegrationReport({
    header: input.header,
    source,
    summary,
    entries,
  });
}

function normalizeBridgeFindingLifecycleIntegrationEntry(
  entry: BridgeFindingLifecycleIntegrationEntry,
): BridgeFindingLifecycleIntegrationEntry {
  const out: BridgeFindingLifecycleIntegrationEntry = {
    id: entry.id,
    findingId: entry.findingId,
    decision: entry.decision,
    severity: entry.severity,
    evidenceRefs: normalizeRefs(entry.evidenceRefs ?? []),
  };
  if (
    entry.initialLifecycleStatus !== undefined
    && entry.initialLifecycleStatus !== null
  ) {
    out.initialLifecycleStatus = entry.initialLifecycleStatus;
  }
  for (
    const field of [
      "sourceBridgeCandidateId",
      "sourceLintRowId",
      "sourceContractId",
      "sourcePhraseCapabilityId",
    ] as const
  ) {
    const value = entry[field];
    if (typeof value === "string" && value.length > 0) {
      out[field] = value;
    }
  }
  if (entry.messages && entry.messages.length > 0) {
    const messages = entry.messages.filter(
      (message): message is string =>
        typeof message === "string" && message.length > 0,
    );
    if (messages.length > 0) out.messages = messages;
  }
  return out;
}

function compareBridgeFindingLifecycleIntegrationEntry(
  left: BridgeFindingLifecycleIntegrationEntry,
  right: BridgeFindingLifecycleIntegrationEntry,
): number {
  if (left.findingId !== right.findingId) {
    return left.findingId.localeCompare(right.findingId);
  }
  return left.id.localeCompare(right.id);
}

function recountBridgeFindingLifecycleIntegrationSummary(
  entries: BridgeFindingLifecycleIntegrationEntry[],
): BridgeFindingLifecycleIntegrationSummary {
  let readyForLifecycle = 0;
  let filtered = 0;
  let needsReview = 0;
  let duplicate = 0;
  let ineligible = 0;
  const bySeverity: Record<string, number> = {};
  for (const entry of entries) {
    switch (entry.decision) {
      case "ready-for-lifecycle":
        readyForLifecycle++;
        break;
      case "filtered":
        filtered++;
        break;
      case "needs-review":
        needsReview++;
        break;
      case "duplicate":
        duplicate++;
        break;
      case "ineligible":
        ineligible++;
        break;
      default:
        break;
    }
    bySeverity[entry.severity] = (bySeverity[entry.severity] ?? 0) + 1;
  }
  return {
    totalBridgeFindings: entries.length,
    readyForLifecycle,
    filtered,
    needsReview,
    duplicate,
    ineligible,
    bySeverity: sortRecord(bySeverity),
  };
}

export function validateBridgeFindingLifecycleIntegrationReport(
  value: unknown,
): ValidationResult<BridgeFindingLifecycleIntegrationReport> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  validateModelHeader(
    value.header,
    "BridgeFindingLifecycleIntegrationReport",
    "$.header",
    issues,
  );

  // ---- source ----
  if (!isRecord(value.source)) {
    issues.push({ path: "$.source", message: "Expected an object." });
  } else {
    const findingResult = validateArtifactRef(value.source.findingReportRef);
    if (!findingResult.ok) {
      issues.push(
        ...prefixIssues(findingResult.issues, "$.source.findingReportRef"),
      );
    }
    for (
      const field of [
        "filterReportRef",
        "lifecycleReportRef",
        "issueAdjudicationReportRef",
      ] as const
    ) {
      const ref = (value.source as Record<string, unknown>)[field];
      if (ref !== undefined) {
        const result = validateArtifactRef(ref);
        if (!result.ok) {
          issues.push(...prefixIssues(result.issues, `$.source.${field}`));
        }
      }
    }
  }

  // ---- entries ----
  let entries: unknown[] = [];
  if (!Array.isArray(value.entries)) {
    issues.push({ path: "$.entries", message: "Expected an array." });
  } else {
    entries = value.entries;
    const seenIds = new Set<string>();
    entries.forEach((entry, index) =>
      validateBridgeFindingLifecycleIntegrationEntry(
        entry,
        `$.entries[${index}]`,
        issues,
        seenIds,
      ),
    );
  }

  // ---- summary ----
  if (!isRecord(value.summary)) {
    issues.push({ path: "$.summary", message: "Expected an object." });
  } else {
    for (
      const field of [
        "totalBridgeFindings",
        "readyForLifecycle",
        "filtered",
        "needsReview",
        "duplicate",
        "ineligible",
      ] as const
    ) {
      const v = (value.summary as Record<string, unknown>)[field];
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
        issues.push({
          path: `$.summary.${field}`,
          message: "Expected a non-negative integer.",
        });
      }
    }
    const bySeverity = (value.summary as Record<string, unknown>).bySeverity;
    if (!isRecord(bySeverity)) {
      issues.push({
        path: "$.summary.bySeverity",
        message: "Expected an object of non-negative integers.",
      });
    } else {
      for (const [key, count] of Object.entries(bySeverity)) {
        if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
          issues.push({
            path: `$.summary.bySeverity.${key}`,
            message: "Expected a non-negative integer.",
          });
        }
      }
    }
    // Re-derive and compare counts so artifacts with stale summaries
    // are rejected.
    if (Array.isArray(entries)) {
      const computed = recountBridgeFindingLifecycleIntegrationSummary(
        entries.filter(
          isRecord,
        ) as unknown as BridgeFindingLifecycleIntegrationEntry[],
      );
      for (
        const field of [
          "totalBridgeFindings",
          "readyForLifecycle",
          "filtered",
          "needsReview",
          "duplicate",
          "ineligible",
        ] as const
      ) {
        const supplied = (value.summary as Record<string, unknown>)[field];
        if (typeof supplied === "number" && supplied !== computed[field]) {
          issues.push({
            path: `$.summary.${field}`,
            message: `Expected ${computed[field]} (recomputed from entries).`,
          });
        }
      }
    }
  }

  return validationResult(
    value as BridgeFindingLifecycleIntegrationReport,
    issues,
  );
}

function validateBridgeFindingLifecycleIntegrationEntry(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  seenIds: Set<string>,
): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  if (typeof value.id !== "string" || value.id.length === 0) {
    issues.push({ path: `${path}.id`, message: "Expected a non-empty string." });
  } else if (seenIds.has(value.id)) {
    issues.push({ path: `${path}.id`, message: `Duplicate entry id ${value.id}.` });
  } else {
    seenIds.add(value.id);
  }
  if (typeof value.findingId !== "string" || value.findingId.length === 0) {
    issues.push({
      path: `${path}.findingId`,
      message: "Expected a non-empty string.",
    });
  }
  if (
    typeof value.decision !== "string"
    || !BRIDGE_LIFECYCLE_INTEGRATION_DECISIONS.has(value.decision)
  ) {
    issues.push({
      path: `${path}.decision`,
      message:
        "Expected one of ready-for-lifecycle, filtered, needs-review, duplicate, ineligible.",
    });
  }
  if (
    typeof value.severity !== "string"
    || !BRIDGE_LIFECYCLE_INTEGRATION_SEVERITIES.has(value.severity)
  ) {
    issues.push({
      path: `${path}.severity`,
      message: "Expected one of low, medium, high.",
    });
  }
  if (
    value.initialLifecycleStatus !== undefined
    && (typeof value.initialLifecycleStatus !== "string"
      || !BRIDGE_LIFECYCLE_INTEGRATION_STATUSES.has(value.initialLifecycleStatus))
  ) {
    issues.push({
      path: `${path}.initialLifecycleStatus`,
      message: "Expected one of new, active, suppressed, resolved.",
    });
  }
  if (!Array.isArray(value.evidenceRefs)) {
    issues.push({ path: `${path}.evidenceRefs`, message: "Expected an array." });
  } else {
    value.evidenceRefs.forEach((ref, index) => {
      const result = validateArtifactRef(ref);
      if (!result.ok) {
        issues.push(
          ...prefixIssues(result.issues, `${path}.evidenceRefs[${index}]`),
        );
      }
    });
  }
}

export function assertBridgeFindingLifecycleIntegrationReport(
  value: unknown,
): BridgeFindingLifecycleIntegrationReport {
  return assertValid(
    validateBridgeFindingLifecycleIntegrationReport(value),
    "BridgeFindingLifecycleIntegrationReport",
  );
}

export const bridgeFindingLifecycleIntegrationReportSchema: ArtifactSchema<BridgeFindingLifecycleIntegrationReport> = {
  validate: validateBridgeFindingLifecycleIntegrationReport,
  parse: assertBridgeFindingLifecycleIntegrationReport,
};

export function normalizeSystems(systems: ObservedSystem[]): ObservedSystem[] {
  const byId = new Map<string, ObservedSystem>();

  for (const system of systems) {
    const existing = byId.get(system.id);
    const normalized = {
      ...system,
      paths: uniqueSorted(system.paths),
      layers: uniqueSorted(system.layers),
      capabilities: uniqueSorted(system.capabilities),
      evidence: normalizeRefs(system.evidence),
    };

    if (!existing) {
      byId.set(system.id, normalized);
      continue;
    }

    byId.set(system.id, {
      ...existing,
      name: existing.name ?? normalized.name,
      purpose: existing.purpose ?? normalized.purpose,
      kind: existing.kind ?? normalized.kind,
      paths: uniqueSorted([...existing.paths, ...normalized.paths]),
      layers: uniqueSorted([...existing.layers, ...normalized.layers]),
      capabilities: uniqueSorted([...existing.capabilities, ...normalized.capabilities]),
      confidence: Math.max(existing.confidence, normalized.confidence),
      evidence: normalizeRefs([...existing.evidence, ...normalized.evidence]),
    });
  }

  return [...byId.values()]
    .map(stripUndefinedObjectValues)
    .sort((left, right) => left.id.localeCompare(right.id));
}

function validateModelHeader(value: unknown, artifactType: string, path: string, issues: ValidationIssue[]): void {
  const result = validateArtifactHeader(value);

  if (!result.ok) {
    issues.push(...prefixIssues(result.issues, path));
    return;
  }

  if (result.value.artifactType !== artifactType) {
    issues.push({ path: `${path}.artifactType`, message: `Expected artifactType to be ${artifactType}.` });
  }
}

function validateRepository(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  pushRequiredStringIssue(issues, value.id, `${path}.id`);
  pushRequiredStringIssue(issues, value.root, `${path}.root`);
}

function validateObservedSystem(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  pushRequiredStringIssue(issues, value.id, `${path}.id`);

  if (!isStringArray(value.paths)) {
    issues.push({ path: `${path}.paths`, message: "Expected an array of strings." });
  }

  if (!isStringArray(value.layers)) {
    issues.push({ path: `${path}.layers`, message: "Expected an array of strings." });
  }

  if (!isStringArray(value.capabilities)) {
    issues.push({ path: `${path}.capabilities`, message: "Expected an array of strings." });
  }

  if (value.kind !== undefined && (typeof value.kind !== "string" || value.kind.length === 0)) {
    issues.push({ path: `${path}.kind`, message: "Expected a non-empty string when present." });
  }

  validateConfidence(value.confidence, `${path}.confidence`, issues);
  validateRefs(value.evidence, `${path}.evidence`, issues);
}

function validateOwnershipEntry(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  pushRequiredStringIssue(issues, value.path, `${path}.path`);
  pushRequiredStringIssue(issues, value.ownerSystem, `${path}.ownerSystem`);
  validateConfidence(value.confidence, `${path}.confidence`, issues);
  validateRefs(value.evidence, `${path}.evidence`, issues);
}

function validateCapabilityEntry(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  pushRequiredStringIssue(issues, value.capability, `${path}.capability`);

  if (!isStringArray(value.subjects)) {
    issues.push({ path: `${path}.subjects`, message: "Expected an array of strings." });
  }

  if (!isStringArray(value.systems)) {
    issues.push({ path: `${path}.systems`, message: "Expected an array of strings." });
  }

  validateConfidence(value.confidence, `${path}.confidence`, issues);
  validateRefs(value.evidence, `${path}.evidence`, issues);
}

function validateConfidence(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    issues.push({ path, message: "Expected a finite number between 0 and 1." });
  }
}

function validatePhraseBackedCapability(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  pushRequiredStringIssue(issues, value.id, `${path}.id`);
  pushRequiredStringIssue(issues, value.verb, `${path}.verb`);
  pushRequiredStringIssue(issues, value.noun, `${path}.noun`);

  if (!isRecord(value.phraseRef)) {
    issues.push({ path: `${path}.phraseRef`, message: "Expected an object." });
  } else {
    pushRequiredStringIssue(issues, value.phraseRef.phraseId, `${path}.phraseRef.phraseId`);
    const refResult = validateArtifactRef(value.phraseRef.report);
    if (!refResult.ok) {
      issues.push(...prefixIssues(refResult.issues, `${path}.phraseRef.report`));
    }
  }

  validateRefs(value.evidenceRefs, `${path}.evidenceRefs`, issues);
  if (Array.isArray(value.evidenceRefs) && value.evidenceRefs.length === 0) {
    issues.push({
      path: `${path}.evidenceRefs`,
      message: "Expected at least one evidence ref (eligibility rule).",
    });
  }

  if (!isStringArray(value.sourceCandidateIds)) {
    issues.push({
      path: `${path}.sourceCandidateIds`,
      message: "Expected an array of strings.",
    });
  } else if (value.sourceCandidateIds.length === 0) {
    issues.push({
      path: `${path}.sourceCandidateIds`,
      message: "Expected at least one source candidate id (eligibility rule).",
    });
  }

  if (value.confidence !== "high") {
    issues.push({
      path: `${path}.confidence`,
      message: 'Expected literal "high" (eligibility rule).',
    });
  }
  if (value.status !== "stable") {
    issues.push({
      path: `${path}.status`,
      message: 'Expected literal "stable" (eligibility rule).',
    });
  }

  if (value.qualifier !== undefined && !isStringArray(value.qualifier)) {
    issues.push({
      path: `${path}.qualifier`,
      message: "Expected an array of strings when present.",
    });
  }
  for (const field of ["domain", "pattern", "layer"] as const) {
    const fieldValue = (value as Record<string, unknown>)[field];
    if (fieldValue !== undefined && typeof fieldValue !== "string") {
      issues.push({
        path: `${path}.${field}`,
        message: "Expected a string when present.",
      });
    }
  }
}

function validatePhraseBackedSummary(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  for (const field of ["total", "withDomain", "withPattern", "withLayer"] as const) {
    if (typeof value[field] !== "number" || !Number.isInteger(value[field] as number) || (value[field] as number) < 0) {
      issues.push({
        path: `${path}.${field}`,
        message: "Expected a non-negative integer.",
      });
    }
  }
  for (const field of ["byVerb", "byNoun"] as const) {
    const recordValue = value[field];
    if (!isRecord(recordValue)) {
      issues.push({
        path: `${path}.${field}`,
        message: "Expected an object.",
      });
      continue;
    }
    for (const [key, count] of Object.entries(recordValue)) {
      if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
        issues.push({
          path: `${path}.${field}.${key}`,
          message: "Expected a non-negative integer.",
        });
      }
    }
  }
}

function validateRefs(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array of artifact refs." });
    return;
  }

  value.forEach((ref, index) => {
    const result = validateArtifactRef(ref);

    if (!result.ok) {
      issues.push(...prefixIssues(result.issues, `${path}[${index}]`));
    }
  });
}

function normalizeRefs(refs: ArtifactRef[]): ArtifactRef[] {
  return [...dedupeBy(refs.map(assertArtifactRef), (ref) => `${ref.type}:${ref.id}:${ref.path ?? ""}`).values()]
    .sort((left, right) => `${left.type}:${left.id}:${left.path ?? ""}`.localeCompare(`${right.type}:${right.id}:${right.path ?? ""}`));
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort();
}

function dedupeBy<T>(values: T[], keyForValue: (value: T) => string): Map<string, T> {
  const byKey = new Map<string, T>();

  for (const value of values) {
    byKey.set(keyForValue(value), value);
  }

  return byKey;
}

function validationResult<T>(value: T, issues: ValidationIssue[]): ValidationResult<T> {
  return issues.length > 0 ? { ok: false, issues } : { ok: true, value, issues: [] };
}

function assertValid<T>(result: ValidationResult<T>, typeName: string): T {
  if (result.ok) {
    return result.value;
  }

  throw new TypeError(`${typeName} validation failed: ${result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function pushRequiredStringIssue(issues: ValidationIssue[], value: unknown, path: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path, message: "Expected a non-empty string." });
  }
}

function prefixIssues(issues: ValidationIssue[], prefix: string): ValidationIssue[] {
  return issues.map((issue) => ({
    path: issue.path.replace("$", prefix),
    message: issue.message,
  }));
}

function stripUndefinedObjectValues<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedObjectValues(item)) as T;
  }

  if (isRecord(value)) {
    return Object.entries(value).reduce<Record<string, unknown>>((stripped, [key, item]) => {
      if (item !== undefined) {
        stripped[key] = stripUndefinedObjectValues(item);
      }

      return stripped;
    }, {}) as T;
  }

  return value;
}

// ---------- Source-state fingerprint (P1.1 path-freshness-report) ----------
//
// Pure (well, IO-only) helper used by the
// `rekon paths freshness` CLI to capture a bounded,
// deterministic snapshot of the working tree's source
// state. Hashes content with sha256; never stores file
// contents. Treats file mtimes as **advisory only** —
// hashes are the canonical evidence.
//
// Safety contract:
// - **No source mutation.** Read-only.
// - **No network.**
// - **No directory walk outside the supplied repoRoot.**
// - Default ignore set excludes machine-generated
//   directories (`.git`, `.rekon`, `node_modules`,
//   `dist`, `coverage`, `.next`, `.turbo`, `.cache`)
//   so the fingerprint reflects intentional source
//   only.
// - Path entries are sorted lexically; the `rootHash`
//   is a sha256 over the canonical JSON of `{path,
//   hash, size, exists}` entries so two runs over the
//   same tree produce byte-identical fingerprints.

import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";

/**
 * The default set of relative path segments that the
 * source-state walk ignores. Operators can extend this
 * via `ignoreGlobs` (currently treated as path-segment
 * names; full glob support is deferred).
 */
export const DEFAULT_SOURCE_FINGERPRINT_IGNORE: ReadonlyArray<string> = [
  ".git",
  ".rekon",
  "node_modules",
  "dist",
  "coverage",
  ".next",
  ".turbo",
  ".cache",
];

export type SourcePathFingerprintEntry = {
  path: string;
  hash?: string;
  size?: number;
  exists: boolean;
  mtimeAdvisory?: string;
};

export type SourceStateFingerprintData = {
  algorithm: "sha256";
  rootHash: string;
  paths: SourcePathFingerprintEntry[];
  generatedAt: string;
  ignoredGlobs?: string[];
};

export type BuildSourceStateFingerprintInput = {
  repoRoot: string;
  /**
   * When provided, only these repo-relative paths are
   * fingerprinted. When omitted, a conservative walk
   * starting at `repoRoot` is performed; the walk
   * skips any path whose segment matches any entry in
   * `ignoreGlobs ?? DEFAULT_SOURCE_FINGERPRINT_IGNORE`.
   */
  paths?: ReadonlyArray<string>;
  /**
   * Replacement ignore set (segment names). When
   * omitted, `DEFAULT_SOURCE_FINGERPRINT_IGNORE` is
   * used.
   */
  ignoreGlobs?: ReadonlyArray<string>;
  /**
   * When `true`, the fingerprint includes the file's
   * mtime as **advisory** metadata. The mtime is
   * **never** used as canonical freshness evidence
   * during comparison; hashes are. Defaults to
   * `false` so two clones with identical content
   * produce identical fingerprints.
   */
  includeMtimeAdvisory?: boolean;
  /**
   * Override for the `generatedAt` ISO timestamp.
   * Tests use this to keep snapshots deterministic.
   */
  generatedAt?: string;
};

const MAX_FILE_BYTES_FOR_HASH = 32 * 1024 * 1024; // 32 MiB safety cap

export async function buildSourceStateFingerprint(
  input: BuildSourceStateFingerprintInput,
): Promise<SourceStateFingerprintData> {
  if (!input || typeof input !== "object") {
    throw new TypeError("buildSourceStateFingerprint requires an input object.");
  }
  if (typeof input.repoRoot !== "string" || input.repoRoot.length === 0) {
    throw new TypeError("buildSourceStateFingerprint requires input.repoRoot.");
  }
  if (!isAbsolute(input.repoRoot)) {
    throw new TypeError("buildSourceStateFingerprint repoRoot must be absolute.");
  }

  const ignoreGlobs = [
    ...(input.ignoreGlobs ?? DEFAULT_SOURCE_FINGERPRINT_IGNORE),
  ];
  const ignoreSet = new Set(ignoreGlobs);
  const includeMtimeAdvisory = input.includeMtimeAdvisory === true;
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  let candidatePaths: string[];
  if (Array.isArray(input.paths) && input.paths.length > 0) {
    candidatePaths = [...input.paths]
      .map((entry) => normalizeRepoRelativePath(entry))
      .filter((entry) => entry.length > 0);
  } else {
    candidatePaths = await walkRepo(input.repoRoot, ignoreSet);
  }

  // De-duplicate + sort for determinism.
  const uniquePaths = [...new Set(candidatePaths)].sort();

  const entries: SourcePathFingerprintEntry[] = [];
  for (const relativePath of uniquePaths) {
    if (containsIgnoredSegment(relativePath, ignoreSet)) {
      continue;
    }
    const absolutePath = join(input.repoRoot, relativePath);
    const entry = await fingerprintPath(absolutePath, relativePath, {
      includeMtimeAdvisory,
    });
    entries.push(entry);
  }

  const rootHash = computeRootHash(entries);

  const result: SourceStateFingerprintData = {
    algorithm: "sha256",
    rootHash,
    paths: entries,
    generatedAt,
  };
  if (ignoreGlobs.length > 0) {
    result.ignoredGlobs = ignoreGlobs;
  }
  return result;
}

function normalizeRepoRelativePath(value: string): string {
  if (typeof value !== "string") return "";
  // Normalise path separators to forward slashes for
  // determinism across platforms. Leading "./" trimmed.
  let normalized = value.replace(/\\/g, "/").replace(/\/+/g, "/");
  if (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }
  if (normalized.startsWith("/")) {
    normalized = normalized.slice(1);
  }
  return normalized;
}

function containsIgnoredSegment(
  relativePath: string,
  ignoreSet: Set<string>,
): boolean {
  if (ignoreSet.size === 0) return false;
  const segments = relativePath.split("/");
  for (const segment of segments) {
    if (ignoreSet.has(segment)) return true;
  }
  return false;
}

async function fingerprintPath(
  absolutePath: string,
  relativePath: string,
  options: { includeMtimeAdvisory: boolean },
): Promise<SourcePathFingerprintEntry> {
  let stats;
  try {
    stats = await stat(absolutePath);
  } catch {
    return { path: relativePath, exists: false };
  }
  if (!stats.isFile()) {
    return { path: relativePath, exists: false };
  }
  if (stats.size > MAX_FILE_BYTES_FOR_HASH) {
    // Above the safety cap: record existence + size but
    // not a hash. Comparators will treat hash absence as
    // unknown content and fall back to size + exists.
    const result: SourcePathFingerprintEntry = {
      path: relativePath,
      exists: true,
      size: stats.size,
    };
    if (options.includeMtimeAdvisory) {
      result.mtimeAdvisory = stats.mtime.toISOString();
    }
    return result;
  }
  const contents = await readFile(absolutePath);
  const hash = createHash("sha256").update(contents).digest("hex");
  const result: SourcePathFingerprintEntry = {
    path: relativePath,
    exists: true,
    size: stats.size,
    hash,
  };
  if (options.includeMtimeAdvisory) {
    result.mtimeAdvisory = stats.mtime.toISOString();
  }
  return result;
}

function computeRootHash(entries: SourcePathFingerprintEntry[]): string {
  const canonical = entries.map((entry) => ({
    path: entry.path,
    hash: entry.hash ?? null,
    size: typeof entry.size === "number" ? entry.size : null,
    exists: entry.exists,
  }));
  return createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");
}

async function walkRepo(
  repoRoot: string,
  ignoreSet: Set<string>,
): Promise<string[]> {
  const results: string[] = [];
  await walkRepoInner(repoRoot, repoRoot, ignoreSet, results);
  return results;
}

async function walkRepoInner(
  repoRoot: string,
  currentDir: string,
  ignoreSet: Set<string>,
  results: string[],
): Promise<void> {
  let dirEntries;
  try {
    dirEntries = await readdir(currentDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const dirEntry of dirEntries) {
    if (ignoreSet.has(dirEntry.name)) continue;
    const absolutePath = join(currentDir, dirEntry.name);
    if (dirEntry.isDirectory()) {
      await walkRepoInner(repoRoot, absolutePath, ignoreSet, results);
      continue;
    }
    if (!dirEntry.isFile()) continue;
    const relativeFromRoot = relative(repoRoot, absolutePath).split(sep).join("/");
    if (relativeFromRoot.length === 0) continue;
    results.push(relativeFromRoot);
  }
}
