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

// ---- StepCapabilityGraph (v1, expected workflow topology) ----
//
// Expected workflow topology graph projected from EvidenceGraph +
// CapabilityMap v2 + CapabilityPhraseReport (+ optional operator
// config). It is **workflow topology, not CapabilityMap v2**: it adds
// step/workflow nodes and step→capability / step→file / step→system
// edges. It models **no runtime truth, no handoff coverage, and no
// drift**. `handoffPlaceholders` is reserved (placeholders only); v1
// declares no handoffs.

export type StepCapabilityGraphNodeSource = "derived" | "configured" | "mixed";

export type StepCapabilityGraphNode = {
  id: string;
  label: string;
  source: StepCapabilityGraphNodeSource;
  systems?: string[];
  paths?: string[];
  evidenceRefs: ArtifactRef[];
};

export type StepCapabilityGraphCapabilityEdgeSource =
  | "capability-map"
  | "phrase-report"
  | "config"
  | "mixed";

export type StepCapabilityGraphCapabilityEdge = {
  id: string;
  stepId: string;
  capabilityId?: string;
  phraseCapabilityId?: string;
  verb: string;
  noun: string;
  domain?: string;
  confidence: "high" | "medium" | "low";
  source: StepCapabilityGraphCapabilityEdgeSource;
  evidenceRefs: ArtifactRef[];
};

export type StepCapabilityGraphFileEdgeSource = "evidence" | "config" | "mixed";

export type StepCapabilityGraphFileEdge = {
  id: string;
  stepId: string;
  path: string;
  source: StepCapabilityGraphFileEdgeSource;
  evidenceRefs: ArtifactRef[];
};

export type StepCapabilityGraphSystemEdge = {
  id: string;
  stepId: string;
  system: string;
  source: "capability-map" | "config" | "mixed";
  evidenceRefs: ArtifactRef[];
};

export type StepCapabilityGraphHandoffPlaceholder = {
  id: string;
  fromStepId?: string;
  toStepId?: string;
  status: "placeholder" | "unresolved";
  message: string;
};

export type StepCapabilityGraphUnresolvedCapability = {
  id: string;
  reason: string;
  capabilityId?: string;
  phraseCapabilityId?: string;
  evidenceRefs: ArtifactRef[];
};

export type StepCapabilityGraphSource = {
  evidenceGraphRef?: ArtifactRef;
  capabilityMapRef?: ArtifactRef;
  capabilityPhraseReportRef?: ArtifactRef;
  configPath?: string;
  configHash?: string;
};

export type StepCapabilityGraphSummary = {
  steps: number;
  capabilityEdges: number;
  fileEdges: number;
  systemEdges: number;
  unresolvedCapabilities: number;
  handoffPlaceholders: number;
};

export type StepCapabilityGraph = {
  header: ArtifactHeader;
  source: StepCapabilityGraphSource;
  summary: StepCapabilityGraphSummary;
  steps: StepCapabilityGraphNode[];
  capabilityEdges: StepCapabilityGraphCapabilityEdge[];
  fileEdges: StepCapabilityGraphFileEdge[];
  systemEdges: StepCapabilityGraphSystemEdge[];
  handoffPlaceholders: StepCapabilityGraphHandoffPlaceholder[];
  unresolvedCapabilities: StepCapabilityGraphUnresolvedCapability[];
};

const STEP_CAPABILITY_GRAPH_NODE_SOURCES = new Set<string>([
  "derived",
  "configured",
  "mixed",
]);
const STEP_CAPABILITY_GRAPH_CAPABILITY_EDGE_SOURCES = new Set<string>([
  "capability-map",
  "phrase-report",
  "config",
  "mixed",
]);
const STEP_CAPABILITY_GRAPH_FILE_EDGE_SOURCES = new Set<string>([
  "evidence",
  "config",
  "mixed",
]);
const STEP_CAPABILITY_GRAPH_SYSTEM_EDGE_SOURCES = new Set<string>([
  "capability-map",
  "config",
  "mixed",
]);
const STEP_CAPABILITY_GRAPH_CONFIDENCES = new Set<string>([
  "high",
  "medium",
  "low",
]);
const STEP_CAPABILITY_GRAPH_PLACEHOLDER_STATUSES = new Set<string>([
  "placeholder",
  "unresolved",
]);

function sortStringSet(values: string[] | undefined): string[] | undefined {
  if (!values) return undefined;
  const out = [...new Set(values.filter((v) => typeof v === "string" && v.length > 0))];
  out.sort();
  return out.length > 0 ? out : undefined;
}

export function createStepCapabilityGraph(
  input: StepCapabilityGraph,
): StepCapabilityGraph {
  const steps: StepCapabilityGraphNode[] = [];
  const seenSteps = new Set<string>();
  for (const raw of input.steps ?? []) {
    if (!raw || seenSteps.has(raw.id)) continue;
    seenSteps.add(raw.id);
    const node: StepCapabilityGraphNode = {
      id: raw.id,
      label: raw.label,
      source: raw.source,
      evidenceRefs: normalizeRefs(raw.evidenceRefs ?? []),
    };
    const systems = sortStringSet(raw.systems);
    if (systems) node.systems = systems;
    const paths = sortStringSet(raw.paths);
    if (paths) node.paths = paths;
    steps.push(node);
  }
  steps.sort((a, b) => a.id.localeCompare(b.id));

  const capabilityEdges = dedupeSortedEntries(
    input.capabilityEdges ?? [],
    (edge) => edge.id,
    (a, b) =>
      a.stepId !== b.stepId
        ? a.stepId.localeCompare(b.stepId)
        : a.id.localeCompare(b.id),
    (edge) => {
      const out: StepCapabilityGraphCapabilityEdge = {
        id: edge.id,
        stepId: edge.stepId,
        verb: edge.verb,
        noun: edge.noun,
        confidence: edge.confidence,
        source: edge.source,
        evidenceRefs: normalizeRefs(edge.evidenceRefs ?? []),
      };
      if (edge.capabilityId) out.capabilityId = edge.capabilityId;
      if (edge.phraseCapabilityId) out.phraseCapabilityId = edge.phraseCapabilityId;
      if (edge.domain) out.domain = edge.domain;
      return out;
    },
  );

  const fileEdges = dedupeSortedEntries(
    input.fileEdges ?? [],
    (edge) => edge.id,
    (a, b) =>
      a.stepId !== b.stepId
        ? a.stepId.localeCompare(b.stepId)
        : a.path !== b.path
          ? a.path.localeCompare(b.path)
          : a.id.localeCompare(b.id),
    (edge) => ({
      id: edge.id,
      stepId: edge.stepId,
      path: edge.path,
      source: edge.source,
      evidenceRefs: normalizeRefs(edge.evidenceRefs ?? []),
    }),
  );

  const systemEdges = dedupeSortedEntries(
    input.systemEdges ?? [],
    (edge) => edge.id,
    (a, b) =>
      a.stepId !== b.stepId
        ? a.stepId.localeCompare(b.stepId)
        : a.system !== b.system
          ? a.system.localeCompare(b.system)
          : a.id.localeCompare(b.id),
    (edge) => ({
      id: edge.id,
      stepId: edge.stepId,
      system: edge.system,
      source: edge.source,
      evidenceRefs: normalizeRefs(edge.evidenceRefs ?? []),
    }),
  );

  const handoffPlaceholders = dedupeSortedEntries(
    input.handoffPlaceholders ?? [],
    (entry) => entry.id,
    (a, b) => a.id.localeCompare(b.id),
    (entry) => {
      const out: StepCapabilityGraphHandoffPlaceholder = {
        id: entry.id,
        status: entry.status,
        message: entry.message,
      };
      if (entry.fromStepId) out.fromStepId = entry.fromStepId;
      if (entry.toStepId) out.toStepId = entry.toStepId;
      return out;
    },
  );

  const unresolvedCapabilities = dedupeSortedEntries(
    input.unresolvedCapabilities ?? [],
    (entry) => entry.id,
    (a, b) => a.id.localeCompare(b.id),
    (entry) => {
      const out: StepCapabilityGraphUnresolvedCapability = {
        id: entry.id,
        reason: entry.reason,
        evidenceRefs: normalizeRefs(entry.evidenceRefs ?? []),
      };
      if (entry.capabilityId) out.capabilityId = entry.capabilityId;
      if (entry.phraseCapabilityId) out.phraseCapabilityId = entry.phraseCapabilityId;
      return out;
    },
  );

  const source: StepCapabilityGraphSource = {};
  if (input.source?.evidenceGraphRef) {
    source.evidenceGraphRef = assertArtifactRef(input.source.evidenceGraphRef);
  }
  if (input.source?.capabilityMapRef) {
    source.capabilityMapRef = assertArtifactRef(input.source.capabilityMapRef);
  }
  if (input.source?.capabilityPhraseReportRef) {
    source.capabilityPhraseReportRef = assertArtifactRef(
      input.source.capabilityPhraseReportRef,
    );
  }
  if (typeof input.source?.configPath === "string" && input.source.configPath.length > 0) {
    source.configPath = input.source.configPath;
  }
  if (typeof input.source?.configHash === "string" && input.source.configHash.length > 0) {
    source.configHash = input.source.configHash;
  }

  const summary: StepCapabilityGraphSummary = {
    steps: steps.length,
    capabilityEdges: capabilityEdges.length,
    fileEdges: fileEdges.length,
    systemEdges: systemEdges.length,
    unresolvedCapabilities: unresolvedCapabilities.length,
    handoffPlaceholders: handoffPlaceholders.length,
  };

  return assertStepCapabilityGraph({
    header: input.header,
    source,
    summary,
    steps,
    capabilityEdges,
    fileEdges,
    systemEdges,
    handoffPlaceholders,
    unresolvedCapabilities,
  });
}

function dedupeSortedEntries<T extends { id: string }>(
  raw: T[],
  keyOf: (entry: T) => string,
  compare: (a: T, b: T) => number,
  normalize: (entry: T) => T,
): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!entry) continue;
    const key = keyOf(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalize(entry));
  }
  out.sort(compare);
  return out;
}

export function validateStepCapabilityGraph(
  value: unknown,
): ValidationResult<StepCapabilityGraph> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  validateModelHeader(value.header, "StepCapabilityGraph", "$.header", issues);

  if (!isRecord(value.source)) {
    issues.push({ path: "$.source", message: "Expected an object." });
  } else {
    for (
      const field of [
        "evidenceGraphRef",
        "capabilityMapRef",
        "capabilityPhraseReportRef",
      ] as const
    ) {
      const ref = (value.source as Record<string, unknown>)[field];
      if (ref !== undefined) {
        const result = validateArtifactRef(ref);
        if (!result.ok) issues.push(...prefixIssues(result.issues, `$.source.${field}`));
      }
    }
  }

  const stepIds = new Set<string>();
  validateStepCapabilityGraphArray(value.steps, "$.steps", issues, (step, path) => {
    if (typeof step.id !== "string" || step.id.length === 0) {
      issues.push({ path: `${path}.id`, message: "Expected a non-empty string." });
    } else if (stepIds.has(step.id)) {
      issues.push({ path: `${path}.id`, message: `Duplicate step id ${step.id}.` });
    } else {
      stepIds.add(step.id);
    }
    if (typeof step.label !== "string" || step.label.length === 0) {
      issues.push({ path: `${path}.label`, message: "Expected a non-empty string." });
    }
    if (typeof step.source !== "string" || !STEP_CAPABILITY_GRAPH_NODE_SOURCES.has(step.source)) {
      issues.push({ path: `${path}.source`, message: "Expected one of derived, configured, mixed." });
    }
    validateStepCapabilityGraphRefArray(step.evidenceRefs, `${path}.evidenceRefs`, issues);
  });

  const capEdgeIds = new Set<string>();
  validateStepCapabilityGraphArray(value.capabilityEdges, "$.capabilityEdges", issues, (edge, path) => {
    validateStepCapabilityGraphEdgeId(edge.id, capEdgeIds, path, issues);
    if (typeof edge.stepId !== "string" || edge.stepId.length === 0) {
      issues.push({ path: `${path}.stepId`, message: "Expected a non-empty string." });
    }
    for (const field of ["verb", "noun"] as const) {
      if (typeof edge[field] !== "string" || (edge[field] as string).length === 0) {
        issues.push({ path: `${path}.${field}`, message: "Expected a non-empty string." });
      }
    }
    if (typeof edge.confidence !== "string" || !STEP_CAPABILITY_GRAPH_CONFIDENCES.has(edge.confidence)) {
      issues.push({ path: `${path}.confidence`, message: "Expected one of high, medium, low." });
    }
    if (typeof edge.source !== "string" || !STEP_CAPABILITY_GRAPH_CAPABILITY_EDGE_SOURCES.has(edge.source)) {
      issues.push({ path: `${path}.source`, message: "Expected one of capability-map, phrase-report, config, mixed." });
    }
    validateStepCapabilityGraphRefArray(edge.evidenceRefs, `${path}.evidenceRefs`, issues);
  });

  const fileEdgeIds = new Set<string>();
  validateStepCapabilityGraphArray(value.fileEdges, "$.fileEdges", issues, (edge, path) => {
    validateStepCapabilityGraphEdgeId(edge.id, fileEdgeIds, path, issues);
    if (typeof edge.stepId !== "string" || edge.stepId.length === 0) {
      issues.push({ path: `${path}.stepId`, message: "Expected a non-empty string." });
    }
    if (typeof edge.path !== "string" || edge.path.length === 0) {
      issues.push({ path: `${path}.path`, message: "Expected a non-empty string." });
    }
    if (typeof edge.source !== "string" || !STEP_CAPABILITY_GRAPH_FILE_EDGE_SOURCES.has(edge.source)) {
      issues.push({ path: `${path}.source`, message: "Expected one of evidence, config, mixed." });
    }
    validateStepCapabilityGraphRefArray(edge.evidenceRefs, `${path}.evidenceRefs`, issues);
  });

  const systemEdgeIds = new Set<string>();
  validateStepCapabilityGraphArray(value.systemEdges, "$.systemEdges", issues, (edge, path) => {
    validateStepCapabilityGraphEdgeId(edge.id, systemEdgeIds, path, issues);
    if (typeof edge.stepId !== "string" || edge.stepId.length === 0) {
      issues.push({ path: `${path}.stepId`, message: "Expected a non-empty string." });
    }
    if (typeof edge.system !== "string" || edge.system.length === 0) {
      issues.push({ path: `${path}.system`, message: "Expected a non-empty string." });
    }
    if (typeof edge.source !== "string" || !STEP_CAPABILITY_GRAPH_SYSTEM_EDGE_SOURCES.has(edge.source)) {
      issues.push({ path: `${path}.source`, message: "Expected one of capability-map, config, mixed." });
    }
    validateStepCapabilityGraphRefArray(edge.evidenceRefs, `${path}.evidenceRefs`, issues);
  });

  const placeholderIds = new Set<string>();
  validateStepCapabilityGraphArray(value.handoffPlaceholders, "$.handoffPlaceholders", issues, (entry, path) => {
    validateStepCapabilityGraphEdgeId(entry.id, placeholderIds, path, issues);
    if (typeof entry.status !== "string" || !STEP_CAPABILITY_GRAPH_PLACEHOLDER_STATUSES.has(entry.status)) {
      issues.push({ path: `${path}.status`, message: "Expected one of placeholder, unresolved." });
    }
    if (typeof entry.message !== "string" || entry.message.length === 0) {
      issues.push({ path: `${path}.message`, message: "Expected a non-empty string." });
    }
  });

  const unresolvedIds = new Set<string>();
  validateStepCapabilityGraphArray(value.unresolvedCapabilities, "$.unresolvedCapabilities", issues, (entry, path) => {
    validateStepCapabilityGraphEdgeId(entry.id, unresolvedIds, path, issues);
    if (typeof entry.reason !== "string" || entry.reason.length === 0) {
      issues.push({ path: `${path}.reason`, message: "Expected a non-empty string." });
    }
    validateStepCapabilityGraphRefArray(entry.evidenceRefs, `${path}.evidenceRefs`, issues);
  });

  if (!isRecord(value.summary)) {
    issues.push({ path: "$.summary", message: "Expected an object." });
  } else {
    const computed: Record<string, number> = {
      steps: Array.isArray(value.steps) ? value.steps.length : 0,
      capabilityEdges: Array.isArray(value.capabilityEdges) ? value.capabilityEdges.length : 0,
      fileEdges: Array.isArray(value.fileEdges) ? value.fileEdges.length : 0,
      systemEdges: Array.isArray(value.systemEdges) ? value.systemEdges.length : 0,
      unresolvedCapabilities: Array.isArray(value.unresolvedCapabilities) ? value.unresolvedCapabilities.length : 0,
      handoffPlaceholders: Array.isArray(value.handoffPlaceholders) ? value.handoffPlaceholders.length : 0,
    };
    for (
      const field of [
        "steps",
        "capabilityEdges",
        "fileEdges",
        "systemEdges",
        "unresolvedCapabilities",
        "handoffPlaceholders",
      ] as const
    ) {
      const supplied = (value.summary as Record<string, unknown>)[field];
      if (typeof supplied !== "number" || !Number.isInteger(supplied) || supplied < 0) {
        issues.push({ path: `$.summary.${field}`, message: "Expected a non-negative integer." });
      } else if (supplied !== computed[field]) {
        issues.push({ path: `$.summary.${field}`, message: `Expected ${computed[field]} (recomputed).` });
      }
    }
  }

  return validationResult(value as StepCapabilityGraph, issues);
}

function validateStepCapabilityGraphArray(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  each: (entry: Record<string, unknown>, path: string) => void,
): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array." });
    return;
  }
  value.forEach((entry, index) => {
    if (!isRecord(entry)) {
      issues.push({ path: `${path}[${index}]`, message: "Expected an object." });
      return;
    }
    each(entry as Record<string, unknown>, `${path}[${index}]`);
  });
}

function validateStepCapabilityGraphEdgeId(
  id: unknown,
  seen: Set<string>,
  path: string,
  issues: ValidationIssue[],
): void {
  if (typeof id !== "string" || id.length === 0) {
    issues.push({ path: `${path}.id`, message: "Expected a non-empty string." });
  } else if (seen.has(id)) {
    issues.push({ path: `${path}.id`, message: `Duplicate id ${id}.` });
  } else {
    seen.add(id);
  }
}

function validateStepCapabilityGraphRefArray(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array." });
    return;
  }
  value.forEach((ref, index) => {
    const result = validateArtifactRef(ref);
    if (!result.ok) issues.push(...prefixIssues(result.issues, `${path}[${index}]`));
  });
}

export function assertStepCapabilityGraph(value: unknown): StepCapabilityGraph {
  return assertValid(validateStepCapabilityGraph(value), "StepCapabilityGraph");
}

export const stepCapabilityGraphSchema: ArtifactSchema<StepCapabilityGraph> = {
  validate: validateStepCapabilityGraph,
  parse: assertStepCapabilityGraph,
};

// ---- HandoffContract (v1, declared baton policy) ----
//
// Effective contract that materializes **declared baton policy** from an
// optional `.rekon/handoff-contracts.json` over the current
// `StepCapabilityGraph`. It is **declared baton policy, not
// StepCapabilityGraph topology**: each handoff references step ids and is
// resolved to `declared` (both steps exist) or `unresolved-step` (a step
// id is missing). v1 evaluates **no coverage**, reads **no runtime
// events**, and detects **no drift**.

export type HandoffContractStatus = "declared" | "unresolved-step" | "needs-review";

export type HandoffContractCapabilityRef = {
  verb: string;
  noun: string;
  domain?: string;
};

export type HandoffContractEventRef = {
  name?: string;
  kind?: string;
};

export type HandoffContractPayloadRef = {
  schemaHint?: string;
};

export type HandoffContractEntry = {
  id: string;
  status: HandoffContractStatus;
  fromStepId: string;
  toStepId: string;
  feature?: string;
  capability?: HandoffContractCapabilityRef;
  event?: HandoffContractEventRef;
  payload?: HandoffContractPayloadRef;
  evidenceRefs: ArtifactRef[];
  messages?: string[];
};

export type HandoffContractSource = {
  stepCapabilityGraphRef: ArtifactRef;
  configPath?: string;
  configHash?: string;
};

export type HandoffContractSummary = {
  total: number;
  declared: number;
  unresolvedStep: number;
  needsReview: number;
};

export type HandoffContract = {
  header: ArtifactHeader;
  source: HandoffContractSource;
  summary: HandoffContractSummary;
  handoffs: HandoffContractEntry[];
};

const HANDOFF_CONTRACT_STATUSES = new Set<string>([
  "declared",
  "unresolved-step",
  "needs-review",
]);

const HANDOFF_CONTRACT_STATUS_RANK: Record<string, number> = {
  declared: 0,
  "needs-review": 1,
  "unresolved-step": 2,
};

export function createHandoffContract(input: HandoffContract): HandoffContract {
  const handoffs: HandoffContractEntry[] = [];
  const seen = new Set<string>();
  for (const raw of input.handoffs ?? []) {
    if (!raw || seen.has(raw.id)) continue;
    seen.add(raw.id);
    const entry: HandoffContractEntry = {
      id: raw.id,
      status: raw.status,
      fromStepId: raw.fromStepId,
      toStepId: raw.toStepId,
      evidenceRefs: normalizeRefs(raw.evidenceRefs ?? []),
    };
    if (typeof raw.feature === "string" && raw.feature.length > 0) entry.feature = raw.feature;
    if (raw.capability && typeof raw.capability === "object") {
      const cap: HandoffContractCapabilityRef = { verb: raw.capability.verb, noun: raw.capability.noun };
      if (typeof raw.capability.domain === "string" && raw.capability.domain.length > 0) cap.domain = raw.capability.domain;
      entry.capability = cap;
    }
    if (raw.event && typeof raw.event === "object") {
      const event: HandoffContractEventRef = {};
      if (typeof raw.event.name === "string" && raw.event.name.length > 0) event.name = raw.event.name;
      if (typeof raw.event.kind === "string" && raw.event.kind.length > 0) event.kind = raw.event.kind;
      if (event.name || event.kind) entry.event = event;
    }
    if (raw.payload && typeof raw.payload === "object") {
      if (typeof raw.payload.schemaHint === "string" && raw.payload.schemaHint.length > 0) {
        entry.payload = { schemaHint: raw.payload.schemaHint };
      }
    }
    if (raw.messages && raw.messages.length > 0) {
      const messages = raw.messages.filter((m): m is string => typeof m === "string" && m.length > 0);
      if (messages.length > 0) entry.messages = messages;
    }
    handoffs.push(entry);
  }
  handoffs.sort((a, b) => {
    const ra = HANDOFF_CONTRACT_STATUS_RANK[a.status] ?? 99;
    const rb = HANDOFF_CONTRACT_STATUS_RANK[b.status] ?? 99;
    return ra !== rb ? ra - rb : a.id.localeCompare(b.id);
  });

  let declared = 0;
  let unresolvedStep = 0;
  let needsReview = 0;
  for (const entry of handoffs) {
    if (entry.status === "declared") declared += 1;
    else if (entry.status === "unresolved-step") unresolvedStep += 1;
    else if (entry.status === "needs-review") needsReview += 1;
  }

  const source: HandoffContractSource = {
    stepCapabilityGraphRef: assertArtifactRef(input.source.stepCapabilityGraphRef),
  };
  if (typeof input.source.configPath === "string" && input.source.configPath.length > 0) {
    source.configPath = input.source.configPath;
  }
  if (typeof input.source.configHash === "string" && input.source.configHash.length > 0) {
    source.configHash = input.source.configHash;
  }

  return assertHandoffContract({
    header: input.header,
    source,
    summary: { total: handoffs.length, declared, unresolvedStep, needsReview },
    handoffs,
  });
}

export function validateHandoffContract(value: unknown): ValidationResult<HandoffContract> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  validateModelHeader(value.header, "HandoffContract", "$.header", issues);

  if (!isRecord(value.source)) {
    issues.push({ path: "$.source", message: "Expected an object." });
  } else {
    const result = validateArtifactRef(value.source.stepCapabilityGraphRef);
    if (!result.ok) issues.push(...prefixIssues(result.issues, "$.source.stepCapabilityGraphRef"));
  }

  let handoffs: unknown[] = [];
  if (!Array.isArray(value.handoffs)) {
    issues.push({ path: "$.handoffs", message: "Expected an array." });
  } else {
    handoffs = value.handoffs;
    const seenIds = new Set<string>();
    handoffs.forEach((entry, index) => validateHandoffContractEntry(entry, `$.handoffs[${index}]`, issues, seenIds));
  }

  if (!isRecord(value.summary)) {
    issues.push({ path: "$.summary", message: "Expected an object." });
  } else {
    const list = Array.isArray(handoffs) ? handoffs.filter(isRecord) as Array<Record<string, unknown>> : [];
    const computed: Record<string, number> = {
      total: list.length,
      declared: list.filter((h) => h.status === "declared").length,
      unresolvedStep: list.filter((h) => h.status === "unresolved-step").length,
      needsReview: list.filter((h) => h.status === "needs-review").length,
    };
    for (const field of ["total", "declared", "unresolvedStep", "needsReview"] as const) {
      const supplied = (value.summary as Record<string, unknown>)[field];
      if (typeof supplied !== "number" || !Number.isInteger(supplied) || supplied < 0) {
        issues.push({ path: `$.summary.${field}`, message: "Expected a non-negative integer." });
      } else if (supplied !== computed[field]) {
        issues.push({ path: `$.summary.${field}`, message: `Expected ${computed[field]} (recomputed).` });
      }
    }
  }

  return validationResult(value as HandoffContract, issues);
}

function validateHandoffContractEntry(
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
    issues.push({ path: `${path}.id`, message: `Duplicate handoff id ${value.id}.` });
  } else {
    seenIds.add(value.id);
  }
  if (typeof value.status !== "string" || !HANDOFF_CONTRACT_STATUSES.has(value.status)) {
    issues.push({ path: `${path}.status`, message: "Expected one of declared, unresolved-step, needs-review." });
  }
  for (const field of ["fromStepId", "toStepId"] as const) {
    if (typeof value[field] !== "string" || (value[field] as string).length === 0) {
      issues.push({ path: `${path}.${field}`, message: "Expected a non-empty string." });
    }
  }
  if (value.feature !== undefined && (typeof value.feature !== "string" || value.feature.length === 0)) {
    issues.push({ path: `${path}.feature`, message: "Expected a non-empty string." });
  }
  if (value.capability !== undefined) {
    if (!isRecord(value.capability) || typeof value.capability.verb !== "string" || value.capability.verb.length === 0 || typeof value.capability.noun !== "string" || value.capability.noun.length === 0) {
      issues.push({ path: `${path}.capability`, message: "Expected an object with non-empty verb and noun." });
    }
  }
  if (!Array.isArray(value.evidenceRefs)) {
    issues.push({ path: `${path}.evidenceRefs`, message: "Expected an array." });
  } else {
    value.evidenceRefs.forEach((ref, index) => {
      const result = validateArtifactRef(ref);
      if (!result.ok) issues.push(...prefixIssues(result.issues, `${path}.evidenceRefs[${index}]`));
    });
  }
  // unresolved-step rows must carry a diagnostic message.
  if (value.status === "unresolved-step") {
    const messages = Array.isArray(value.messages) ? value.messages.filter((m) => typeof m === "string" && m.length > 0) : [];
    if (messages.length === 0) {
      issues.push({ path: `${path}.messages`, message: "unresolved-step handoffs must include a non-empty message." });
    }
  }
}

export function assertHandoffContract(value: unknown): HandoffContract {
  return assertValid(validateHandoffContract(value), "HandoffContract");
}

export const handoffContractSchema: ArtifactSchema<HandoffContract> = {
  validate: validateHandoffContract,
  parse: assertHandoffContract,
};

// ---- HandoffCoverageReport (v1, handoff-event coverage) ----
//
// Declared-vs-observed handoff-event coverage over a `HandoffContract` and an
// optional raw handoff event log (`.rekon/handoff-events.jsonl`). It is
// **handoff-event coverage, not VerificationRun command success**: each
// declared handoff is matched to observed `handoff_event` lines (by event
// name, then feature, then step pair) and resolved to `covered` /
// `uncovered` / `unresolved-contract` / `added-observed` / `not-evaluated`.
// A **missing** event log yields `not-evaluated` rows (not `uncovered`); a
// **present** log with no match yields `uncovered`. v1 creates **no**
// `RuntimeGraphObservationReport`, detects **no** drift, and creates **no**
// `WorkOrder` / `VerificationPlan`.

export type HandoffCoverageStatus =
  | "covered"
  | "uncovered"
  | "unresolved-contract"
  | "added-observed"
  | "not-evaluated";

export type HandoffCoverageMatchMethod =
  | "event-name"
  | "feature"
  | "step-pair"
  | "none";

export type HandoffCoverageObservedEventRef = {
  line: number;
  timestamp?: string;
  source?: string;
};

export type HandoffCoverageRow = {
  id: string;
  handoffId?: string;
  status: HandoffCoverageStatus;
  matchMethod: HandoffCoverageMatchMethod;
  feature?: string;
  eventName?: string;
  fromStepId?: string;
  toStepId?: string;
  observedCount: number;
  observedEventRefs?: HandoffCoverageObservedEventRef[];
  messages?: string[];
};

export type HandoffCoverageReportSource = {
  handoffContractRef: ArtifactRef;
  eventLogPath?: string;
  eventLogHash?: string;
};

export type HandoffCoverageReportSummary = {
  totalDeclared: number;
  covered: number;
  uncovered: number;
  unresolvedContract: number;
  addedObserved: number;
  notEvaluated: number;
  parseErrors: number;
};

export type HandoffCoverageReport = {
  header: ArtifactHeader;
  source: HandoffCoverageReportSource;
  summary: HandoffCoverageReportSummary;
  rows: HandoffCoverageRow[];
};

const HANDOFF_COVERAGE_STATUSES = new Set<string>([
  "covered",
  "uncovered",
  "unresolved-contract",
  "added-observed",
  "not-evaluated",
]);

const HANDOFF_COVERAGE_MATCH_METHODS = new Set<string>([
  "event-name",
  "feature",
  "step-pair",
  "none",
]);

// Statuses that must carry no observed events.
const HANDOFF_COVERAGE_ZERO_OBSERVED = new Set<string>([
  "uncovered",
  "unresolved-contract",
  "not-evaluated",
]);

export function createHandoffCoverageReport(input: HandoffCoverageReport): HandoffCoverageReport {
  const rows: HandoffCoverageRow[] = [];
  const seen = new Set<string>();
  for (const raw of input.rows ?? []) {
    if (!raw || seen.has(raw.id)) continue;
    seen.add(raw.id);
    const row: HandoffCoverageRow = {
      id: raw.id,
      status: raw.status,
      matchMethod: raw.matchMethod,
      observedCount: typeof raw.observedCount === "number" ? raw.observedCount : 0,
    };
    if (typeof raw.handoffId === "string" && raw.handoffId.length > 0) row.handoffId = raw.handoffId;
    if (typeof raw.feature === "string" && raw.feature.length > 0) row.feature = raw.feature;
    if (typeof raw.eventName === "string" && raw.eventName.length > 0) row.eventName = raw.eventName;
    if (typeof raw.fromStepId === "string" && raw.fromStepId.length > 0) row.fromStepId = raw.fromStepId;
    if (typeof raw.toStepId === "string" && raw.toStepId.length > 0) row.toStepId = raw.toStepId;
    if (Array.isArray(raw.observedEventRefs) && raw.observedEventRefs.length > 0) {
      const refs: HandoffCoverageObservedEventRef[] = [];
      for (const r of raw.observedEventRefs) {
        if (!r || typeof r.line !== "number") continue;
        const ref: HandoffCoverageObservedEventRef = { line: r.line };
        if (typeof r.timestamp === "string" && r.timestamp.length > 0) ref.timestamp = r.timestamp;
        if (typeof r.source === "string" && r.source.length > 0) ref.source = r.source;
        refs.push(ref);
      }
      if (refs.length > 0) row.observedEventRefs = refs;
    }
    if (raw.messages && raw.messages.length > 0) {
      const messages = raw.messages.filter((m): m is string => typeof m === "string" && m.length > 0);
      if (messages.length > 0) row.messages = messages;
    }
    rows.push(row);
  }
  // Deterministic ordering: declared contract rows first (by id), then
  // added-observed rows (by first observed line, then id).
  rows.sort((a, b) => {
    const ga = a.status === "added-observed" ? 1 : 0;
    const gb = b.status === "added-observed" ? 1 : 0;
    if (ga !== gb) return ga - gb;
    if (ga === 1) {
      const la = a.observedEventRefs?.[0]?.line ?? 0;
      const lb = b.observedEventRefs?.[0]?.line ?? 0;
      if (la !== lb) return la - lb;
    }
    return a.id.localeCompare(b.id);
  });

  const count = (status: HandoffCoverageStatus): number =>
    rows.filter((row) => row.status === status).length;
  const covered = count("covered");
  const uncovered = count("uncovered");
  const unresolvedContract = count("unresolved-contract");
  const addedObserved = count("added-observed");
  const notEvaluated = count("not-evaluated");
  const suppliedParseErrors = input.summary?.parseErrors;
  const parseErrors =
    typeof suppliedParseErrors === "number" && Number.isInteger(suppliedParseErrors) && suppliedParseErrors >= 0
      ? suppliedParseErrors
      : 0;

  const source: HandoffCoverageReportSource = {
    handoffContractRef: assertArtifactRef(input.source.handoffContractRef),
  };
  if (typeof input.source.eventLogPath === "string" && input.source.eventLogPath.length > 0) {
    source.eventLogPath = input.source.eventLogPath;
  }
  if (typeof input.source.eventLogHash === "string" && input.source.eventLogHash.length > 0) {
    source.eventLogHash = input.source.eventLogHash;
  }

  return assertHandoffCoverageReport({
    header: input.header,
    source,
    summary: {
      totalDeclared: covered + uncovered + unresolvedContract + notEvaluated,
      covered,
      uncovered,
      unresolvedContract,
      addedObserved,
      notEvaluated,
      parseErrors,
    },
    rows,
  });
}

export function validateHandoffCoverageReport(value: unknown): ValidationResult<HandoffCoverageReport> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  validateModelHeader(value.header, "HandoffCoverageReport", "$.header", issues);

  if (!isRecord(value.source)) {
    issues.push({ path: "$.source", message: "Expected an object." });
  } else {
    const result = validateArtifactRef(value.source.handoffContractRef);
    if (!result.ok) issues.push(...prefixIssues(result.issues, "$.source.handoffContractRef"));
    for (const field of ["eventLogPath", "eventLogHash"] as const) {
      const supplied = (value.source as Record<string, unknown>)[field];
      if (supplied !== undefined && (typeof supplied !== "string" || supplied.length === 0)) {
        issues.push({ path: `$.source.${field}`, message: "Expected a non-empty string." });
      }
    }
  }

  let rows: unknown[] = [];
  if (!Array.isArray(value.rows)) {
    issues.push({ path: "$.rows", message: "Expected an array." });
  } else {
    rows = value.rows;
    const seenIds = new Set<string>();
    rows.forEach((row, index) => validateHandoffCoverageRow(row, `$.rows[${index}]`, issues, seenIds));
  }

  if (!isRecord(value.summary)) {
    issues.push({ path: "$.summary", message: "Expected an object." });
  } else {
    const list = Array.isArray(rows) ? rows.filter(isRecord) as Array<Record<string, unknown>> : [];
    const byStatus = (status: string): number => list.filter((row) => row.status === status).length;
    const covered = byStatus("covered");
    const uncovered = byStatus("uncovered");
    const unresolvedContract = byStatus("unresolved-contract");
    const addedObserved = byStatus("added-observed");
    const notEvaluated = byStatus("not-evaluated");
    const computed: Record<string, number> = {
      totalDeclared: covered + uncovered + unresolvedContract + notEvaluated,
      covered,
      uncovered,
      unresolvedContract,
      addedObserved,
      notEvaluated,
    };
    for (const field of [
      "totalDeclared",
      "covered",
      "uncovered",
      "unresolvedContract",
      "addedObserved",
      "notEvaluated",
    ] as const) {
      const supplied = (value.summary as Record<string, unknown>)[field];
      if (typeof supplied !== "number" || !Number.isInteger(supplied) || supplied < 0) {
        issues.push({ path: `$.summary.${field}`, message: "Expected a non-negative integer." });
      } else if (supplied !== computed[field]) {
        issues.push({ path: `$.summary.${field}`, message: `Expected ${computed[field]} (recomputed).` });
      }
    }
    // parseErrors is observed during parsing and not recomputable from rows;
    // it is type-checked but trusted.
    const parseErrors = (value.summary as Record<string, unknown>).parseErrors;
    if (typeof parseErrors !== "number" || !Number.isInteger(parseErrors) || parseErrors < 0) {
      issues.push({ path: "$.summary.parseErrors", message: "Expected a non-negative integer." });
    }
  }

  return validationResult(value as HandoffCoverageReport, issues);
}

function validateHandoffCoverageRow(
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
    issues.push({ path: `${path}.id`, message: `Duplicate coverage row id ${value.id}.` });
  } else {
    seenIds.add(value.id);
  }
  const status = value.status;
  if (typeof status !== "string" || !HANDOFF_COVERAGE_STATUSES.has(status)) {
    issues.push({ path: `${path}.status`, message: "Expected one of covered, uncovered, unresolved-contract, added-observed, not-evaluated." });
  }
  if (typeof value.matchMethod !== "string" || !HANDOFF_COVERAGE_MATCH_METHODS.has(value.matchMethod)) {
    issues.push({ path: `${path}.matchMethod`, message: "Expected one of event-name, feature, step-pair, none." });
  }
  const observedCount = value.observedCount;
  if (typeof observedCount !== "number" || !Number.isInteger(observedCount) || observedCount < 0) {
    issues.push({ path: `${path}.observedCount`, message: "Expected a non-negative integer." });
  } else if (typeof status === "string") {
    if ((status === "covered" || status === "added-observed") && observedCount === 0) {
      issues.push({ path: `${path}.observedCount`, message: `${status} rows must have observedCount > 0.` });
    } else if (HANDOFF_COVERAGE_ZERO_OBSERVED.has(status) && observedCount !== 0) {
      issues.push({ path: `${path}.observedCount`, message: `${status} rows must have observedCount === 0.` });
    }
  }
  for (const field of ["handoffId", "feature", "eventName", "fromStepId", "toStepId"] as const) {
    const supplied = value[field];
    if (supplied !== undefined && (typeof supplied !== "string" || supplied.length === 0)) {
      issues.push({ path: `${path}.${field}`, message: "Expected a non-empty string." });
    }
  }
  if (value.observedEventRefs !== undefined) {
    if (!Array.isArray(value.observedEventRefs)) {
      issues.push({ path: `${path}.observedEventRefs`, message: "Expected an array." });
    } else {
      value.observedEventRefs.forEach((ref, index) => {
        const refPath = `${path}.observedEventRefs[${index}]`;
        if (!isRecord(ref)) {
          issues.push({ path: refPath, message: "Expected an object." });
          return;
        }
        if (typeof ref.line !== "number" || !Number.isInteger(ref.line) || ref.line < 0) {
          issues.push({ path: `${refPath}.line`, message: "Expected a non-negative integer." });
        }
        for (const f of ["timestamp", "source"] as const) {
          const fv = ref[f];
          if (fv !== undefined && (typeof fv !== "string" || fv.length === 0)) {
            issues.push({ path: `${refPath}.${f}`, message: "Expected a non-empty string." });
          }
        }
      });
    }
  }
  if (value.messages !== undefined) {
    if (!Array.isArray(value.messages)) {
      issues.push({ path: `${path}.messages`, message: "Expected an array." });
    } else {
      value.messages.forEach((message, index) => {
        if (typeof message !== "string" || message.length === 0) {
          issues.push({ path: `${path}.messages[${index}]`, message: "Expected a non-empty string." });
        }
      });
    }
  }
}

export function assertHandoffCoverageReport(value: unknown): HandoffCoverageReport {
  return assertValid(validateHandoffCoverageReport(value), "HandoffCoverageReport");
}

export const handoffCoverageReportSchema: ArtifactSchema<HandoffCoverageReport> = {
  validate: validateHandoffCoverageReport,
  parse: assertHandoffCoverageReport,
};

// ---- RuntimeGraphObservationReport (v1, observed runtime graph) ----
//
// Observed runtime graph generated from a raw handoff event log
// (`.rekon/handoff-events.jsonl`). It folds observed `handoff_event` rows
// into observed **nodes** (step / feature / event / source) and **edges**
// (handoff / emitted-by), recording observedCount + first/last timestamps
// + line evidence. It is **observed runtime graph, not declared
// topology**, and **not HandoffCoverageReport**: it preserves raw observed
// graph facts. v1 evaluates **no coverage**, compares against **no**
// declared artifact, detects **no drift**, and creates no `WorkOrder` /
// `VerificationPlan`.

export type RuntimeGraphObservationNodeKind =
  | "step"
  | "feature"
  | "event"
  | "source";

export type RuntimeGraphObservationEdgeKind =
  | "handoff"
  | "emitted-by"
  | "observed-from";

export type RuntimeGraphObservationEvidenceRef = {
  line: number;
  timestamp?: string;
  source?: string;
};

export type RuntimeGraphObservationNode = {
  id: string;
  kind: RuntimeGraphObservationNodeKind;
  label: string;
  source: "handoff-event-log";
  firstObservedAt?: string;
  lastObservedAt?: string;
  observedCount: number;
  evidenceRefs: RuntimeGraphObservationEvidenceRef[];
};

export type RuntimeGraphObservationEdge = {
  id: string;
  kind: RuntimeGraphObservationEdgeKind;
  fromNodeId: string;
  toNodeId: string;
  feature?: string;
  eventName?: string;
  payloadType?: string;
  firstObservedAt?: string;
  lastObservedAt?: string;
  observedCount: number;
  evidenceRefs: RuntimeGraphObservationEvidenceRef[];
};

export type RuntimeGraphObservationReportSource = {
  eventLogPath?: string;
  eventLogHash?: string;
  handoffCoverageReportRef?: ArtifactRef;
  handoffContractRef?: ArtifactRef;
  stepCapabilityGraphRef?: ArtifactRef;
};

export type RuntimeGraphObservationReportSummary = {
  observedNodes: number;
  observedEdges: number;
  handoffEvents: number;
  ignoredRows: number;
  parseErrors: number;
};

export type RuntimeGraphObservationReport = {
  header: ArtifactHeader;
  source: RuntimeGraphObservationReportSource;
  summary: RuntimeGraphObservationReportSummary;
  nodes: RuntimeGraphObservationNode[];
  edges: RuntimeGraphObservationEdge[];
};

const RUNTIME_GRAPH_OBSERVATION_NODE_KINDS = new Set<string>([
  "step",
  "feature",
  "event",
  "source",
]);

const RUNTIME_GRAPH_OBSERVATION_EDGE_KINDS = new Set<string>([
  "handoff",
  "emitted-by",
  "observed-from",
]);

function normalizeRuntimeGraphEvidenceRefs(
  refs: RuntimeGraphObservationEvidenceRef[] | undefined,
): RuntimeGraphObservationEvidenceRef[] {
  const out: RuntimeGraphObservationEvidenceRef[] = [];
  for (const raw of refs ?? []) {
    if (!raw || typeof raw.line !== "number") continue;
    const ref: RuntimeGraphObservationEvidenceRef = { line: raw.line };
    if (typeof raw.timestamp === "string" && raw.timestamp.length > 0) ref.timestamp = raw.timestamp;
    if (typeof raw.source === "string" && raw.source.length > 0) ref.source = raw.source;
    out.push(ref);
  }
  return out;
}

export function createRuntimeGraphObservationReport(
  input: RuntimeGraphObservationReport,
): RuntimeGraphObservationReport {
  const nodes: RuntimeGraphObservationNode[] = [];
  const seenNodes = new Set<string>();
  for (const raw of input.nodes ?? []) {
    if (!raw || seenNodes.has(raw.id)) continue;
    seenNodes.add(raw.id);
    const node: RuntimeGraphObservationNode = {
      id: raw.id,
      kind: raw.kind,
      label: raw.label,
      source: "handoff-event-log",
      observedCount: typeof raw.observedCount === "number" ? raw.observedCount : 0,
      evidenceRefs: normalizeRuntimeGraphEvidenceRefs(raw.evidenceRefs),
    };
    if (typeof raw.firstObservedAt === "string" && raw.firstObservedAt.length > 0) node.firstObservedAt = raw.firstObservedAt;
    if (typeof raw.lastObservedAt === "string" && raw.lastObservedAt.length > 0) node.lastObservedAt = raw.lastObservedAt;
    nodes.push(node);
  }
  nodes.sort((a, b) => (a.kind !== b.kind ? a.kind.localeCompare(b.kind) : a.id.localeCompare(b.id)));

  const edges: RuntimeGraphObservationEdge[] = [];
  const seenEdges = new Set<string>();
  for (const raw of input.edges ?? []) {
    if (!raw || seenEdges.has(raw.id)) continue;
    seenEdges.add(raw.id);
    const edge: RuntimeGraphObservationEdge = {
      id: raw.id,
      kind: raw.kind,
      fromNodeId: raw.fromNodeId,
      toNodeId: raw.toNodeId,
      observedCount: typeof raw.observedCount === "number" ? raw.observedCount : 0,
      evidenceRefs: normalizeRuntimeGraphEvidenceRefs(raw.evidenceRefs),
    };
    if (typeof raw.feature === "string" && raw.feature.length > 0) edge.feature = raw.feature;
    if (typeof raw.eventName === "string" && raw.eventName.length > 0) edge.eventName = raw.eventName;
    if (typeof raw.payloadType === "string" && raw.payloadType.length > 0) edge.payloadType = raw.payloadType;
    if (typeof raw.firstObservedAt === "string" && raw.firstObservedAt.length > 0) edge.firstObservedAt = raw.firstObservedAt;
    if (typeof raw.lastObservedAt === "string" && raw.lastObservedAt.length > 0) edge.lastObservedAt = raw.lastObservedAt;
    edges.push(edge);
  }
  edges.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    if (a.fromNodeId !== b.fromNodeId) return a.fromNodeId.localeCompare(b.fromNodeId);
    if (a.toNodeId !== b.toNodeId) return a.toNodeId.localeCompare(b.toNodeId);
    return a.id.localeCompare(b.id);
  });

  const nonNegInt = (value: unknown): number =>
    typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;

  const source: RuntimeGraphObservationReportSource = {};
  if (typeof input.source?.eventLogPath === "string" && input.source.eventLogPath.length > 0) {
    source.eventLogPath = input.source.eventLogPath;
  }
  if (typeof input.source?.eventLogHash === "string" && input.source.eventLogHash.length > 0) {
    source.eventLogHash = input.source.eventLogHash;
  }
  if (input.source?.handoffCoverageReportRef) source.handoffCoverageReportRef = assertArtifactRef(input.source.handoffCoverageReportRef);
  if (input.source?.handoffContractRef) source.handoffContractRef = assertArtifactRef(input.source.handoffContractRef);
  if (input.source?.stepCapabilityGraphRef) source.stepCapabilityGraphRef = assertArtifactRef(input.source.stepCapabilityGraphRef);

  return assertRuntimeGraphObservationReport({
    header: input.header,
    source,
    summary: {
      observedNodes: nodes.length,
      observedEdges: edges.length,
      handoffEvents: nonNegInt(input.summary?.handoffEvents),
      ignoredRows: nonNegInt(input.summary?.ignoredRows),
      parseErrors: nonNegInt(input.summary?.parseErrors),
    },
    nodes,
    edges,
  });
}

export function validateRuntimeGraphObservationReport(value: unknown): ValidationResult<RuntimeGraphObservationReport> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  validateModelHeader(value.header, "RuntimeGraphObservationReport", "$.header", issues);

  if (!isRecord(value.source)) {
    issues.push({ path: "$.source", message: "Expected an object." });
  } else {
    for (const field of ["eventLogPath", "eventLogHash"] as const) {
      const supplied = (value.source as Record<string, unknown>)[field];
      if (supplied !== undefined && (typeof supplied !== "string" || supplied.length === 0)) {
        issues.push({ path: `$.source.${field}`, message: "Expected a non-empty string." });
      }
    }
    for (const field of ["handoffCoverageReportRef", "handoffContractRef", "stepCapabilityGraphRef"] as const) {
      const supplied = (value.source as Record<string, unknown>)[field];
      if (supplied !== undefined) {
        const result = validateArtifactRef(supplied);
        if (!result.ok) issues.push(...prefixIssues(result.issues, `$.source.${field}`));
      }
    }
  }

  let nodes: unknown[] = [];
  if (!Array.isArray(value.nodes)) {
    issues.push({ path: "$.nodes", message: "Expected an array." });
  } else {
    nodes = value.nodes;
    const seenIds = new Set<string>();
    nodes.forEach((node, index) => validateRuntimeGraphObservationNode(node, `$.nodes[${index}]`, issues, seenIds));
  }

  let edges: unknown[] = [];
  if (!Array.isArray(value.edges)) {
    issues.push({ path: "$.edges", message: "Expected an array." });
  } else {
    edges = value.edges;
    const seenIds = new Set<string>();
    edges.forEach((edge, index) => validateRuntimeGraphObservationEdge(edge, `$.edges[${index}]`, issues, seenIds));
  }

  if (!isRecord(value.summary)) {
    issues.push({ path: "$.summary", message: "Expected an object." });
  } else {
    const computed: Record<string, number> = {
      observedNodes: Array.isArray(nodes) ? nodes.length : 0,
      observedEdges: Array.isArray(edges) ? edges.length : 0,
    };
    for (const field of ["observedNodes", "observedEdges"] as const) {
      const supplied = (value.summary as Record<string, unknown>)[field];
      if (typeof supplied !== "number" || !Number.isInteger(supplied) || supplied < 0) {
        issues.push({ path: `$.summary.${field}`, message: "Expected a non-negative integer." });
      } else if (supplied !== computed[field]) {
        issues.push({ path: `$.summary.${field}`, message: `Expected ${computed[field]} (recomputed).` });
      }
    }
    // handoffEvents / ignoredRows / parseErrors are observed during parsing
    // and not recomputable from nodes/edges; they are type-checked but trusted.
    for (const field of ["handoffEvents", "ignoredRows", "parseErrors"] as const) {
      const supplied = (value.summary as Record<string, unknown>)[field];
      if (typeof supplied !== "number" || !Number.isInteger(supplied) || supplied < 0) {
        issues.push({ path: `$.summary.${field}`, message: "Expected a non-negative integer." });
      }
    }
  }

  return validationResult(value as RuntimeGraphObservationReport, issues);
}

function validateRuntimeGraphObservationEvidenceRefs(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array." });
    return;
  }
  value.forEach((ref, index) => {
    const refPath = `${path}[${index}]`;
    if (!isRecord(ref)) {
      issues.push({ path: refPath, message: "Expected an object." });
      return;
    }
    if (typeof ref.line !== "number" || !Number.isInteger(ref.line) || ref.line < 0) {
      issues.push({ path: `${refPath}.line`, message: "Expected a non-negative integer." });
    }
    for (const f of ["timestamp", "source"] as const) {
      const fv = ref[f];
      if (fv !== undefined && (typeof fv !== "string" || fv.length === 0)) {
        issues.push({ path: `${refPath}.${f}`, message: "Expected a non-empty string." });
      }
    }
  });
}

function validateRuntimeGraphObservationNode(
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
    issues.push({ path: `${path}.id`, message: `Duplicate node id ${value.id}.` });
  } else {
    seenIds.add(value.id);
  }
  if (typeof value.kind !== "string" || !RUNTIME_GRAPH_OBSERVATION_NODE_KINDS.has(value.kind)) {
    issues.push({ path: `${path}.kind`, message: "Expected one of step, feature, event, source." });
  }
  if (typeof value.label !== "string" || value.label.length === 0) {
    issues.push({ path: `${path}.label`, message: "Expected a non-empty string." });
  }
  if (value.source !== "handoff-event-log") {
    issues.push({ path: `${path}.source`, message: 'Expected "handoff-event-log".' });
  }
  for (const field of ["firstObservedAt", "lastObservedAt"] as const) {
    const supplied = value[field];
    if (supplied !== undefined && (typeof supplied !== "string" || supplied.length === 0)) {
      issues.push({ path: `${path}.${field}`, message: "Expected a non-empty string." });
    }
  }
  if (typeof value.observedCount !== "number" || !Number.isInteger(value.observedCount) || value.observedCount <= 0) {
    issues.push({ path: `${path}.observedCount`, message: "Expected a positive integer." });
  }
  validateRuntimeGraphObservationEvidenceRefs(value.evidenceRefs, `${path}.evidenceRefs`, issues);
}

function validateRuntimeGraphObservationEdge(
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
    issues.push({ path: `${path}.id`, message: `Duplicate edge id ${value.id}.` });
  } else {
    seenIds.add(value.id);
  }
  if (typeof value.kind !== "string" || !RUNTIME_GRAPH_OBSERVATION_EDGE_KINDS.has(value.kind)) {
    issues.push({ path: `${path}.kind`, message: "Expected one of handoff, emitted-by, observed-from." });
  }
  for (const field of ["fromNodeId", "toNodeId"] as const) {
    if (typeof value[field] !== "string" || (value[field] as string).length === 0) {
      issues.push({ path: `${path}.${field}`, message: "Expected a non-empty string." });
    }
  }
  for (const field of ["feature", "eventName", "payloadType", "firstObservedAt", "lastObservedAt"] as const) {
    const supplied = value[field];
    if (supplied !== undefined && (typeof supplied !== "string" || supplied.length === 0)) {
      issues.push({ path: `${path}.${field}`, message: "Expected a non-empty string." });
    }
  }
  if (typeof value.observedCount !== "number" || !Number.isInteger(value.observedCount) || value.observedCount <= 0) {
    issues.push({ path: `${path}.observedCount`, message: "Expected a positive integer." });
  }
  validateRuntimeGraphObservationEvidenceRefs(value.evidenceRefs, `${path}.evidenceRefs`, issues);
}

export function assertRuntimeGraphObservationReport(value: unknown): RuntimeGraphObservationReport {
  return assertValid(validateRuntimeGraphObservationReport(value), "RuntimeGraphObservationReport");
}

export const runtimeGraphObservationReportSchema: ArtifactSchema<RuntimeGraphObservationReport> = {
  validate: validateRuntimeGraphObservationReport,
  parse: assertRuntimeGraphObservationReport,
};

// ---- RuntimeGraphDriftReport (v1, expected-vs-observed drift) ----
//
// Expected-vs-observed runtime graph drift over the four already-materialized
// graph artifacts (`StepCapabilityGraph`, `HandoffContract`,
// `HandoffCoverageReport`, `RuntimeGraphObservationReport`). It is
// **expected-vs-observed runtime graph drift, not runtime observation**, and
// **not HandoffCoverageReport**, and **not PathFreshnessReport or artifact
// lineage freshness**. v1 reads **no** raw handoff event logs directly,
// re-evaluates **no** coverage, and creates no `WorkOrder` /
// `VerificationPlan`.

export type RuntimeGraphDriftStatus =
  | "in-sync"
  | "missing-expected"
  | "added-observed"
  | "uncovered-handoff"
  | "unresolved-contract"
  | "observation-missing"
  | "not-evaluated";

export type RuntimeGraphDriftKind =
  | "step-edge"
  | "handoff"
  | "coverage"
  | "observation"
  | "contract";

export type RuntimeGraphDriftSeverity = "low" | "medium" | "high";

export type RuntimeGraphDriftRow = {
  id: string;
  kind: RuntimeGraphDriftKind;
  status: RuntimeGraphDriftStatus;
  severity: RuntimeGraphDriftSeverity;
  message: string;
  stepId?: string;
  fromStepId?: string;
  toStepId?: string;
  handoffId?: string;
  coverageRowId?: string;
  observedEdgeId?: string;
  expectedRef?: ArtifactRef;
  observedRef?: ArtifactRef;
  evidenceRefs: ArtifactRef[];
};

export type RuntimeGraphDriftReportSource = {
  stepCapabilityGraphRef?: ArtifactRef;
  handoffContractRef?: ArtifactRef;
  handoffCoverageReportRef?: ArtifactRef;
  runtimeGraphObservationReportRef?: ArtifactRef;
};

export type RuntimeGraphDriftReportSummary = {
  total: number;
  inSync: number;
  missingExpected: number;
  addedObserved: number;
  uncoveredHandoff: number;
  unresolvedContract: number;
  observationMissing: number;
  notEvaluated: number;
  bySeverity: Record<string, number>;
};

export type RuntimeGraphDriftReport = {
  header: ArtifactHeader;
  source: RuntimeGraphDriftReportSource;
  summary: RuntimeGraphDriftReportSummary;
  rows: RuntimeGraphDriftRow[];
};

const RUNTIME_GRAPH_DRIFT_STATUSES = new Set<string>([
  "in-sync",
  "missing-expected",
  "added-observed",
  "uncovered-handoff",
  "unresolved-contract",
  "observation-missing",
  "not-evaluated",
]);

const RUNTIME_GRAPH_DRIFT_KINDS = new Set<string>([
  "step-edge",
  "handoff",
  "coverage",
  "observation",
  "contract",
]);

const RUNTIME_GRAPH_DRIFT_SEVERITIES = new Set<string>(["low", "medium", "high"]);

// Map each drift status to its summary count field.
const RUNTIME_GRAPH_DRIFT_STATUS_FIELD: Record<string, keyof RuntimeGraphDriftReportSummary> = {
  "in-sync": "inSync",
  "missing-expected": "missingExpected",
  "added-observed": "addedObserved",
  "uncovered-handoff": "uncoveredHandoff",
  "unresolved-contract": "unresolvedContract",
  "observation-missing": "observationMissing",
  "not-evaluated": "notEvaluated",
};

export function createRuntimeGraphDriftReport(input: RuntimeGraphDriftReport): RuntimeGraphDriftReport {
  const rows: RuntimeGraphDriftRow[] = [];
  const seen = new Set<string>();
  for (const raw of input.rows ?? []) {
    if (!raw || seen.has(raw.id)) continue;
    seen.add(raw.id);
    const row: RuntimeGraphDriftRow = {
      id: raw.id,
      kind: raw.kind,
      status: raw.status,
      severity: raw.severity,
      message: raw.message,
      evidenceRefs: normalizeRefs(raw.evidenceRefs ?? []),
    };
    for (const field of ["stepId", "fromStepId", "toStepId", "handoffId", "coverageRowId", "observedEdgeId"] as const) {
      const value = raw[field];
      if (typeof value === "string" && value.length > 0) row[field] = value;
    }
    if (raw.expectedRef) row.expectedRef = assertArtifactRef(raw.expectedRef);
    if (raw.observedRef) row.observedRef = assertArtifactRef(raw.observedRef);
    rows.push(row);
  }
  // Deterministic ordering: by kind, then status, then id.
  rows.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    if (a.status !== b.status) return a.status.localeCompare(b.status);
    return a.id.localeCompare(b.id);
  });

  const summary: RuntimeGraphDriftReportSummary = {
    total: rows.length,
    inSync: 0,
    missingExpected: 0,
    addedObserved: 0,
    uncoveredHandoff: 0,
    unresolvedContract: 0,
    observationMissing: 0,
    notEvaluated: 0,
    bySeverity: { low: 0, medium: 0, high: 0 },
  };
  for (const row of rows) {
    const field = RUNTIME_GRAPH_DRIFT_STATUS_FIELD[row.status];
    if (field && field !== "bySeverity" && field !== "total") {
      (summary[field] as number) += 1;
    }
    if (RUNTIME_GRAPH_DRIFT_SEVERITIES.has(row.severity)) {
      summary.bySeverity[row.severity] = (summary.bySeverity[row.severity] ?? 0) + 1;
    }
  }

  const source: RuntimeGraphDriftReportSource = {};
  for (const field of ["stepCapabilityGraphRef", "handoffContractRef", "handoffCoverageReportRef", "runtimeGraphObservationReportRef"] as const) {
    const ref = input.source?.[field];
    if (ref) source[field] = assertArtifactRef(ref);
  }

  return assertRuntimeGraphDriftReport({ header: input.header, source, summary, rows });
}

export function validateRuntimeGraphDriftReport(value: unknown): ValidationResult<RuntimeGraphDriftReport> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  validateModelHeader(value.header, "RuntimeGraphDriftReport", "$.header", issues);

  if (!isRecord(value.source)) {
    issues.push({ path: "$.source", message: "Expected an object." });
  } else {
    for (const field of ["stepCapabilityGraphRef", "handoffContractRef", "handoffCoverageReportRef", "runtimeGraphObservationReportRef"] as const) {
      const ref = (value.source as Record<string, unknown>)[field];
      if (ref !== undefined) {
        const result = validateArtifactRef(ref);
        if (!result.ok) issues.push(...prefixIssues(result.issues, `$.source.${field}`));
      }
    }
  }

  let rows: unknown[] = [];
  if (!Array.isArray(value.rows)) {
    issues.push({ path: "$.rows", message: "Expected an array." });
  } else {
    rows = value.rows;
    const seenIds = new Set<string>();
    rows.forEach((row, index) => validateRuntimeGraphDriftRow(row, `$.rows[${index}]`, issues, seenIds));
  }

  if (!isRecord(value.summary)) {
    issues.push({ path: "$.summary", message: "Expected an object." });
  } else {
    const list = Array.isArray(rows) ? rows.filter(isRecord) as Array<Record<string, unknown>> : [];
    const byStatus = (status: string): number => list.filter((row) => row.status === status).length;
    const computed: Record<string, number> = {
      total: list.length,
      inSync: byStatus("in-sync"),
      missingExpected: byStatus("missing-expected"),
      addedObserved: byStatus("added-observed"),
      uncoveredHandoff: byStatus("uncovered-handoff"),
      unresolvedContract: byStatus("unresolved-contract"),
      observationMissing: byStatus("observation-missing"),
      notEvaluated: byStatus("not-evaluated"),
    };
    for (const field of Object.keys(computed)) {
      const supplied = (value.summary as Record<string, unknown>)[field];
      if (typeof supplied !== "number" || !Number.isInteger(supplied) || supplied < 0) {
        issues.push({ path: `$.summary.${field}`, message: "Expected a non-negative integer." });
      } else if (supplied !== computed[field]) {
        issues.push({ path: `$.summary.${field}`, message: `Expected ${computed[field]} (recomputed).` });
      }
    }
    const bySeverity = (value.summary as Record<string, unknown>).bySeverity;
    if (!isRecord(bySeverity)) {
      issues.push({ path: "$.summary.bySeverity", message: "Expected an object." });
    } else {
      for (const severity of ["low", "medium", "high"] as const) {
        const computedCount = list.filter((row) => row.severity === severity).length;
        const supplied = bySeverity[severity];
        if (typeof supplied !== "number" || !Number.isInteger(supplied) || supplied < 0) {
          issues.push({ path: `$.summary.bySeverity.${severity}`, message: "Expected a non-negative integer." });
        } else if (supplied !== computedCount) {
          issues.push({ path: `$.summary.bySeverity.${severity}`, message: `Expected ${computedCount} (recomputed).` });
        }
      }
    }
  }

  return validationResult(value as RuntimeGraphDriftReport, issues);
}

function validateRuntimeGraphDriftRow(
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
    issues.push({ path: `${path}.id`, message: `Duplicate drift row id ${value.id}.` });
  } else {
    seenIds.add(value.id);
  }
  if (typeof value.kind !== "string" || !RUNTIME_GRAPH_DRIFT_KINDS.has(value.kind)) {
    issues.push({ path: `${path}.kind`, message: "Expected one of step-edge, handoff, coverage, observation, contract." });
  }
  if (typeof value.status !== "string" || !RUNTIME_GRAPH_DRIFT_STATUSES.has(value.status)) {
    issues.push({ path: `${path}.status`, message: "Expected a valid drift status." });
  }
  if (typeof value.severity !== "string" || !RUNTIME_GRAPH_DRIFT_SEVERITIES.has(value.severity)) {
    issues.push({ path: `${path}.severity`, message: "Expected one of low, medium, high." });
  }
  if (typeof value.message !== "string" || value.message.length === 0) {
    issues.push({ path: `${path}.message`, message: "Expected a non-empty string." });
  }
  for (const field of ["stepId", "fromStepId", "toStepId", "handoffId", "coverageRowId", "observedEdgeId"] as const) {
    const supplied = value[field];
    if (supplied !== undefined && (typeof supplied !== "string" || supplied.length === 0)) {
      issues.push({ path: `${path}.${field}`, message: "Expected a non-empty string." });
    }
  }
  for (const field of ["expectedRef", "observedRef"] as const) {
    const ref = value[field];
    if (ref !== undefined) {
      const result = validateArtifactRef(ref);
      if (!result.ok) issues.push(...prefixIssues(result.issues, `${path}.${field}`));
    }
  }
  if (!Array.isArray(value.evidenceRefs)) {
    issues.push({ path: `${path}.evidenceRefs`, message: "Expected an array." });
  } else {
    value.evidenceRefs.forEach((ref, index) => {
      const result = validateArtifactRef(ref);
      if (!result.ok) issues.push(...prefixIssues(result.issues, `${path}.evidenceRefs[${index}]`));
    });
  }
}

export function assertRuntimeGraphDriftReport(value: unknown): RuntimeGraphDriftReport {
  return assertValid(validateRuntimeGraphDriftReport(value), "RuntimeGraphDriftReport");
}

export const runtimeGraphDriftReportSchema: ArtifactSchema<RuntimeGraphDriftReport> = {
  validate: validateRuntimeGraphDriftReport,
  parse: assertRuntimeGraphDriftReport,
};

// ---- IntentAssessmentReport (v1, artifact-backed readiness assessment) ----
//
// A read-only readiness assessment of a user request against existing Rekon
// context artifacts (capability map / contract, the step / handoff / coverage
// / observation / drift spine, finding governance, path freshness, and
// verification proof). It is **assessment, not WorkOrder**: it never creates
// `WorkOrder` / `VerificationPlan`, never executes commands, and never writes
// source. `RuntimeGraphDriftReport` is an input to readiness, not the intent
// system itself. `PreparedIntentPlan` remains the next layer after assessment;
// `IntentStatusReport` and `intent:go` remain deferred.

export type IntentAssessmentReadiness =
  | "ready-for-prepare"
  | "blocked"
  | "needs-review"
  | "insufficient-context"
  | "stale-context";

export type IntentAssessmentIntentKind =
  | "bug"
  | "feature"
  | "refactor"
  | "investigation"
  | "migration"
  | "unknown";

export type IntentAssessmentRecommendedNextAction =
  | "prepare-intent"
  | "refresh-context"
  | "resolve-blockers"
  | "ask-clarifying-question"
  | "run-verification"
  | "human-review";

export type IntentAssessmentBlockerCategory =
  | "missing-artifact"
  | "stale-context"
  | "runtime-drift"
  | "handoff-coverage"
  | "finding-governance"
  | "proof-missing"
  | "scope-ambiguous"
  | "source-write-unavailable";

export type IntentAssessmentSeverity = "low" | "medium" | "high";

export type IntentAssessmentScope = {
  paths?: string[];
  systems?: string[];
  capabilities?: string[];
  steps?: string[];
};

export type IntentAssessmentRequest = {
  goal: string;
  kind: IntentAssessmentIntentKind;
  scope?: IntentAssessmentScope;
  constraints?: string[];
  nonGoals?: string[];
};

export type IntentAssessmentBlocker = {
  id: string;
  category: IntentAssessmentBlockerCategory;
  severity: IntentAssessmentSeverity;
  message: string;
  sourceRefs?: ArtifactRef[];
};

export type IntentAssessmentReportSource = {
  intelligenceSnapshotRef?: ArtifactRef;
  capabilityMapRef?: ArtifactRef;
  capabilityContractRef?: ArtifactRef;
  stepCapabilityGraphRef?: ArtifactRef;
  handoffContractRef?: ArtifactRef;
  handoffCoverageReportRef?: ArtifactRef;
  runtimeGraphObservationReportRef?: ArtifactRef;
  runtimeGraphDriftReportRef?: ArtifactRef;
  findingReportRef?: ArtifactRef;
  bridgeFindingLifecycleIntegrationReportRef?: ArtifactRef;
  pathFreshnessReportRef?: ArtifactRef;
  verificationResultRef?: ArtifactRef;
  verificationRunRef?: ArtifactRef;
  verificationPlanRef?: ArtifactRef;
};

export type IntentAssessmentReadinessBlock = {
  status: IntentAssessmentReadiness;
  score?: number;
  recommendedNextAction: IntentAssessmentRecommendedNextAction;
};

export type IntentAssessmentMatchedContext = {
  systems: string[];
  capabilities: string[];
  steps: string[];
  paths: string[];
};

export type IntentAssessmentReport = {
  header: ArtifactHeader;
  request: IntentAssessmentRequest;
  source: IntentAssessmentReportSource;
  readiness: IntentAssessmentReadinessBlock;
  matchedContext: IntentAssessmentMatchedContext;
  blockers: IntentAssessmentBlocker[];
  warnings: IntentAssessmentBlocker[];
  missingContext: IntentAssessmentBlocker[];
};

const INTENT_ASSESSMENT_READINESS_STATUSES = new Set<string>([
  "ready-for-prepare",
  "blocked",
  "needs-review",
  "insufficient-context",
  "stale-context",
]);

const INTENT_ASSESSMENT_INTENT_KINDS = new Set<string>([
  "bug",
  "feature",
  "refactor",
  "investigation",
  "migration",
  "unknown",
]);

const INTENT_ASSESSMENT_NEXT_ACTIONS = new Set<string>([
  "prepare-intent",
  "refresh-context",
  "resolve-blockers",
  "ask-clarifying-question",
  "run-verification",
  "human-review",
]);

const INTENT_ASSESSMENT_BLOCKER_CATEGORIES = new Set<string>([
  "missing-artifact",
  "stale-context",
  "runtime-drift",
  "handoff-coverage",
  "finding-governance",
  "proof-missing",
  "scope-ambiguous",
  "source-write-unavailable",
]);

const INTENT_ASSESSMENT_SEVERITIES = new Set<string>(["low", "medium", "high"]);

const INTENT_ASSESSMENT_SEVERITY_RANK: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const INTENT_ASSESSMENT_SOURCE_FIELDS = [
  "intelligenceSnapshotRef",
  "capabilityMapRef",
  "capabilityContractRef",
  "stepCapabilityGraphRef",
  "handoffContractRef",
  "handoffCoverageReportRef",
  "runtimeGraphObservationReportRef",
  "runtimeGraphDriftReportRef",
  "findingReportRef",
  "bridgeFindingLifecycleIntegrationReportRef",
  "pathFreshnessReportRef",
  "verificationResultRef",
  "verificationRunRef",
  "verificationPlanRef",
] as const;

const INTENT_ASSESSMENT_SCOPE_FIELDS = ["paths", "systems", "capabilities", "steps"] as const;

function intentAssessmentSortedStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const set = new Set<string>();
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) set.add(value);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function intentAssessmentTextList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) out.push(value);
  }
  return out;
}

function intentAssessmentNormalizeBlockers(values: unknown): IntentAssessmentBlocker[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: IntentAssessmentBlocker[] = [];
  for (const raw of values) {
    if (!isRecord(raw)) continue;
    const id = raw.id;
    if (typeof id !== "string" || id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    const blocker: IntentAssessmentBlocker = {
      id,
      category: raw.category as IntentAssessmentBlockerCategory,
      severity: raw.severity as IntentAssessmentSeverity,
      message: typeof raw.message === "string" ? raw.message : "",
    };
    if (Array.isArray(raw.sourceRefs) && raw.sourceRefs.length > 0) {
      blocker.sourceRefs = normalizeRefs(raw.sourceRefs as ArtifactRef[]);
    }
    out.push(blocker);
  }
  // Deterministic ordering: by severity rank (high first), then category, id.
  out.sort((a, b) => {
    const ra = INTENT_ASSESSMENT_SEVERITY_RANK[a.severity] ?? 9;
    const rb = INTENT_ASSESSMENT_SEVERITY_RANK[b.severity] ?? 9;
    if (ra !== rb) return ra - rb;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.id.localeCompare(b.id);
  });
  return out;
}

export function createIntentAssessmentReport(input: IntentAssessmentReport): IntentAssessmentReport {
  const rawRequest = isRecord(input.request) ? (input.request as IntentAssessmentRequest) : ({} as IntentAssessmentRequest);
  const request: IntentAssessmentRequest = {
    goal: typeof rawRequest.goal === "string" ? rawRequest.goal : "",
    kind: rawRequest.kind,
  };
  if (isRecord(rawRequest.scope)) {
    const scope: IntentAssessmentScope = {};
    for (const field of INTENT_ASSESSMENT_SCOPE_FIELDS) {
      const list = intentAssessmentSortedStrings((rawRequest.scope as Record<string, unknown>)[field]);
      if (list.length > 0) scope[field] = list;
    }
    if (Object.keys(scope).length > 0) request.scope = scope;
  }
  const constraints = intentAssessmentTextList(rawRequest.constraints);
  if (constraints.length > 0) request.constraints = constraints;
  const nonGoals = intentAssessmentTextList(rawRequest.nonGoals);
  if (nonGoals.length > 0) request.nonGoals = nonGoals;

  const source: IntentAssessmentReportSource = {};
  for (const field of INTENT_ASSESSMENT_SOURCE_FIELDS) {
    const ref = input.source?.[field];
    if (ref) source[field] = assertArtifactRef(ref);
  }

  const rawReadiness = isRecord(input.readiness)
    ? (input.readiness as IntentAssessmentReadinessBlock)
    : ({} as IntentAssessmentReadinessBlock);
  const readiness: IntentAssessmentReadinessBlock = {
    status: rawReadiness.status,
    recommendedNextAction: rawReadiness.recommendedNextAction,
  };
  if (typeof rawReadiness.score === "number" && Number.isFinite(rawReadiness.score)) {
    readiness.score = rawReadiness.score;
  }

  const matchedContext: IntentAssessmentMatchedContext = {
    systems: intentAssessmentSortedStrings(input.matchedContext?.systems),
    capabilities: intentAssessmentSortedStrings(input.matchedContext?.capabilities),
    steps: intentAssessmentSortedStrings(input.matchedContext?.steps),
    paths: intentAssessmentSortedStrings(input.matchedContext?.paths),
  };

  return assertIntentAssessmentReport({
    header: input.header,
    request,
    source,
    readiness,
    matchedContext,
    blockers: intentAssessmentNormalizeBlockers(input.blockers),
    warnings: intentAssessmentNormalizeBlockers(input.warnings),
    missingContext: intentAssessmentNormalizeBlockers(input.missingContext),
  });
}

function validateIntentAssessmentStringArray(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array." });
    return;
  }
  value.forEach((item, index) => {
    if (typeof item !== "string" || item.length === 0) {
      issues.push({ path: `${path}[${index}]`, message: "Expected a non-empty string." });
    }
  });
}

function validateIntentAssessmentBlocker(
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
  if (typeof value.category !== "string" || !INTENT_ASSESSMENT_BLOCKER_CATEGORIES.has(value.category)) {
    issues.push({ path: `${path}.category`, message: "Expected a valid blocker category." });
  }
  if (typeof value.severity !== "string" || !INTENT_ASSESSMENT_SEVERITIES.has(value.severity)) {
    issues.push({ path: `${path}.severity`, message: "Expected one of low, medium, high." });
  }
  if (typeof value.message !== "string" || value.message.length === 0) {
    issues.push({ path: `${path}.message`, message: "Expected a non-empty string." });
  }
  if (value.sourceRefs !== undefined) {
    if (!Array.isArray(value.sourceRefs)) {
      issues.push({ path: `${path}.sourceRefs`, message: "Expected an array." });
    } else {
      value.sourceRefs.forEach((ref, index) => {
        const result = validateArtifactRef(ref);
        if (!result.ok) issues.push(...prefixIssues(result.issues, `${path}.sourceRefs[${index}]`));
      });
    }
  }
}

export function validateIntentAssessmentReport(value: unknown): ValidationResult<IntentAssessmentReport> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  validateModelHeader(value.header, "IntentAssessmentReport", "$.header", issues);

  if (!isRecord(value.request)) {
    issues.push({ path: "$.request", message: "Expected an object." });
  } else {
    const request = value.request as Record<string, unknown>;
    if (typeof request.goal !== "string" || request.goal.length === 0) {
      issues.push({ path: "$.request.goal", message: "Expected a non-empty string." });
    }
    if (typeof request.kind !== "string" || !INTENT_ASSESSMENT_INTENT_KINDS.has(request.kind)) {
      issues.push({ path: "$.request.kind", message: "Expected one of bug, feature, refactor, investigation, migration, unknown." });
    }
    if (request.scope !== undefined) {
      if (!isRecord(request.scope)) {
        issues.push({ path: "$.request.scope", message: "Expected an object." });
      } else {
        for (const field of INTENT_ASSESSMENT_SCOPE_FIELDS) {
          const list = (request.scope as Record<string, unknown>)[field];
          if (list !== undefined) validateIntentAssessmentStringArray(list, `$.request.scope.${field}`, issues);
        }
      }
    }
    for (const field of ["constraints", "nonGoals"] as const) {
      if (request[field] !== undefined) validateIntentAssessmentStringArray(request[field], `$.request.${field}`, issues);
    }
  }

  if (!isRecord(value.source)) {
    issues.push({ path: "$.source", message: "Expected an object." });
  } else {
    for (const field of INTENT_ASSESSMENT_SOURCE_FIELDS) {
      const ref = (value.source as Record<string, unknown>)[field];
      if (ref !== undefined) {
        const result = validateArtifactRef(ref);
        if (!result.ok) issues.push(...prefixIssues(result.issues, `$.source.${field}`));
      }
    }
  }

  if (!isRecord(value.readiness)) {
    issues.push({ path: "$.readiness", message: "Expected an object." });
  } else {
    const readiness = value.readiness as Record<string, unknown>;
    if (typeof readiness.status !== "string" || !INTENT_ASSESSMENT_READINESS_STATUSES.has(readiness.status)) {
      issues.push({ path: "$.readiness.status", message: "Expected a valid readiness status." });
    }
    if (typeof readiness.recommendedNextAction !== "string" || !INTENT_ASSESSMENT_NEXT_ACTIONS.has(readiness.recommendedNextAction)) {
      issues.push({ path: "$.readiness.recommendedNextAction", message: "Expected a valid recommended next action." });
    }
    if (readiness.score !== undefined && (typeof readiness.score !== "number" || !Number.isFinite(readiness.score))) {
      issues.push({ path: "$.readiness.score", message: "Expected a finite number." });
    }
  }

  if (!isRecord(value.matchedContext)) {
    issues.push({ path: "$.matchedContext", message: "Expected an object." });
  } else {
    for (const field of ["systems", "capabilities", "steps", "paths"] as const) {
      validateIntentAssessmentStringArray((value.matchedContext as Record<string, unknown>)[field], `$.matchedContext.${field}`, issues);
    }
  }

  for (const field of ["blockers", "warnings", "missingContext"] as const) {
    const list = (value as Record<string, unknown>)[field];
    if (!Array.isArray(list)) {
      issues.push({ path: `$.${field}`, message: "Expected an array." });
    } else {
      const seenIds = new Set<string>();
      list.forEach((entry, index) => validateIntentAssessmentBlocker(entry, `$.${field}[${index}]`, issues, seenIds));
    }
  }

  return validationResult(value as IntentAssessmentReport, issues);
}

export function assertIntentAssessmentReport(value: unknown): IntentAssessmentReport {
  return assertValid(validateIntentAssessmentReport(value), "IntentAssessmentReport");
}

export const intentAssessmentReportSchema: ArtifactSchema<IntentAssessmentReport> = {
  validate: validateIntentAssessmentReport,
  parse: assertIntentAssessmentReport,
};

// ---- PreparedIntentPlan (v1, phase/gate preparation) ----
//
// A read-only phase/gate preparation artifact generated from an
// `IntentAssessmentReport` plus the existing Rekon context spine. It turns a
// safe assessment into planned phases, touched paths, capability / step /
// handoff / drift obligations, preservation constraints, and proposed
// verification requirements. It is **phase/gate preparation, not WorkOrder**:
// it creates no `WorkOrder` / `VerificationPlan`, executes no commands, and
// writes no source. **Verification requirements are not VerificationPlan.**
// `IntentStatusReport` remains the next layer; `intent:go` remains deferred;
// source-write behavior remains unavailable.

export type PreparedIntentPlanStatus =
  | "prepared"
  | "blocked"
  | "needs-review"
  | "stale-assessment"
  | "insufficient-assessment";

export type PreparedIntentPlanRecommendedNextAction =
  | "create-work-order"
  | "resolve-blockers"
  | "refresh-context"
  | "human-review"
  | "run-assessment"
  | "defer";

export type PreparedIntentPhaseKind =
  | "investigate"
  | "modify"
  | "refactor"
  | "verify"
  | "review";

export type PreparedIntentPhaseStatus = "planned" | "blocked" | "needs-review";

export type PreparedIntentObligationCategory =
  | "capability-preservation"
  | "step-preservation"
  | "handoff-preservation"
  | "runtime-drift"
  | "finding-governance"
  | "freshness"
  | "verification"
  | "source-write-boundary";

export type PreparedIntentSeverity = "low" | "medium" | "high";

export type PreparedIntentPhase = {
  id: string;
  title: string;
  kind: PreparedIntentPhaseKind;
  status: PreparedIntentPhaseStatus;
  goal: string;
  paths: string[];
  systems: string[];
  capabilities: string[];
  steps: string[];
  constraints: string[];
  obligations: string[];
  verificationRequirements: string[];
  sourceRefs: ArtifactRef[];
};

export type PreparedIntentObligation = {
  id: string;
  category: PreparedIntentObligationCategory;
  severity: PreparedIntentSeverity;
  message: string;
  sourceRefs?: ArtifactRef[];
};

export type PreparedIntentVerificationRequirement = {
  id: string;
  command?: string;
  reason: string;
  sourceRefs?: ArtifactRef[];
};

export type PreparedIntentPlanSource = {
  intentAssessmentReportRef: ArtifactRef;
  capabilityMapRef?: ArtifactRef;
  capabilityContractRef?: ArtifactRef;
  stepCapabilityGraphRef?: ArtifactRef;
  handoffContractRef?: ArtifactRef;
  handoffCoverageReportRef?: ArtifactRef;
  runtimeGraphObservationReportRef?: ArtifactRef;
  runtimeGraphDriftReportRef?: ArtifactRef;
  findingReportRef?: ArtifactRef;
  pathFreshnessReportRef?: ArtifactRef;
  verificationResultRef?: ArtifactRef;
};

export type PreparedIntentPlanRequest = {
  goal: string;
  kind: string;
  scope?: {
    paths?: string[];
    systems?: string[];
    capabilities?: string[];
    steps?: string[];
  };
};

export type PreparedIntentPlanStatusBlock = {
  value: PreparedIntentPlanStatus;
  recommendedNextAction: PreparedIntentPlanRecommendedNextAction;
};

export type PreparedIntentPlanApprovalStatus =
  | "approved"
  | "not-approved"
  | "needs-review";

export type PreparedIntentPlanApprovalReason =
  | "assessment-ready-for-prepare"
  | "explicit-operator-approval"
  | "intake-sufficient"
  | "manual-risk-acceptance"
  | "blocked-assessment"
  | "stale-assessment"
  | "insufficient-context"
  | "runtime-drift-unresolved"
  | "handoff-coverage-unresolved"
  | "verification-proof-missing";

export type PreparedIntentPlanApprovalProof = {
  intentAssessmentReportRef: ArtifactRef;
  assessmentReadiness: string;
  assessmentApprovedForPrepare: boolean;
  requiredContextPresent: boolean;
  missingContext: string[];
  intakeSufficiency?: {
    present: boolean;
    satisfied: string[];
    missing: string[];
    sourceRefs: ArtifactRef[];
  };
  runtimeDrift: {
    accepted: boolean;
    unresolvedHighSeverity: number;
    runtimeGraphDriftReportRef?: ArtifactRef;
  };
  handoffCoverage: {
    accepted: boolean;
    uncovered: number;
    unresolvedContract: number;
    notEvaluated: number;
    handoffCoverageReportRef?: ArtifactRef;
  };
  freshness: {
    accepted: boolean;
    staleContext: boolean;
    pathFreshnessReportRef?: ArtifactRef;
  };
  verification: {
    requirementsPresent: boolean;
    proofResultsPresent: boolean;
    verificationRefs: ArtifactRef[];
  };
  planStructure: {
    phasesPresent: boolean;
    minimumPhaseCountMet: boolean;
    hasInvestigation: boolean;
    hasImplementationOrRefactor: boolean;
    hasVerification: boolean;
    hasReview: boolean;
  };
  downstreamHandoff: {
    workOrderAllowed: boolean;
    verificationPlanAllowed: boolean;
    sourceWriteAllowed: false;
  };
};

// An operator-accepted proof gap recorded on an approved PreparedIntentPlan
// revision. Accepted risks make explicit which known proof gaps (missing
// verification proof, unresolved runtime drift, un-evaluated handoff coverage,
// un-proven freshness, required manual review) a human operator knowingly
// accepted when approving a needs-review draft. They are evidence, not a
// substitute for proof, and never authorize command execution or source writes.
export type IntentOperatorAcceptedRiskCategory =
  | "verification-proof-missing"
  | "runtime-drift-unresolved"
  | "handoff-coverage-not-evaluated"
  | "freshness-not-proven"
  | "manual-review-required"
  | "other";

export type IntentOperatorAcceptedRisk = {
  id: string;
  category: IntentOperatorAcceptedRiskCategory;
  message: string;
  acceptedAt: string;
  acceptedBy?: string;
  reason: string;
  sourceRefs: ArtifactRef[];
};

export type PreparedIntentPlanApproval = {
  status: PreparedIntentPlanApprovalStatus;
  reasons: PreparedIntentPlanApprovalReason[];
  proof: PreparedIntentPlanApprovalProof;
  blockers: PreparedIntentObligation[];
  // Additive (slice 123): the operator-accepted proof gaps recorded when a
  // needs-review draft is explicitly approved. Optional and backward-compatible
  // — existing approved/needs-review plans without this field still validate.
  acceptedRisks?: IntentOperatorAcceptedRisk[];
};

export type PreparedIntentPlan = {
  header: ArtifactHeader;
  source: PreparedIntentPlanSource;
  request: PreparedIntentPlanRequest;
  status: PreparedIntentPlanStatusBlock;
  approval: PreparedIntentPlanApproval;
  phases: PreparedIntentPhase[];
  obligations: PreparedIntentObligation[];
  verificationRequirements: PreparedIntentVerificationRequirement[];
  blockedReasons: PreparedIntentObligation[];
};

const PREPARED_INTENT_PLAN_STATUSES = new Set<string>([
  "prepared",
  "blocked",
  "needs-review",
  "stale-assessment",
  "insufficient-assessment",
]);

const PREPARED_INTENT_NEXT_ACTIONS = new Set<string>([
  "create-work-order",
  "resolve-blockers",
  "refresh-context",
  "human-review",
  "run-assessment",
  "defer",
]);

const PREPARED_INTENT_APPROVAL_STATUSES = new Set<string>([
  "approved",
  "not-approved",
  "needs-review",
]);

const PREPARED_INTENT_APPROVAL_REASONS = new Set<string>([
  "assessment-ready-for-prepare",
  "explicit-operator-approval",
  "intake-sufficient",
  "manual-risk-acceptance",
  "blocked-assessment",
  "stale-assessment",
  "insufficient-context",
  "runtime-drift-unresolved",
  "handoff-coverage-unresolved",
  "verification-proof-missing",
]);

const PREPARED_INTENT_IMPLEMENTATION_KINDS = new Set<string>(["bug", "feature", "refactor", "migration"]);

const PREPARED_INTENT_EXPLICIT_APPROVAL_REASONS = new Set<string>([
  "explicit-operator-approval",
  "intake-sufficient",
  "manual-risk-acceptance",
]);

const PREPARED_INTENT_PHASE_KINDS = new Set<string>([
  "investigate",
  "modify",
  "refactor",
  "verify",
  "review",
]);

const PREPARED_INTENT_PHASE_STATUSES = new Set<string>([
  "planned",
  "blocked",
  "needs-review",
]);

const PREPARED_INTENT_OBLIGATION_CATEGORIES = new Set<string>([
  "capability-preservation",
  "step-preservation",
  "handoff-preservation",
  "runtime-drift",
  "finding-governance",
  "freshness",
  "verification",
  "source-write-boundary",
]);

const PREPARED_INTENT_SEVERITIES = new Set<string>(["low", "medium", "high"]);

const PREPARED_INTENT_SEVERITY_RANK: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const PREPARED_INTENT_SOURCE_OPTIONAL_FIELDS = [
  "capabilityMapRef",
  "capabilityContractRef",
  "stepCapabilityGraphRef",
  "handoffContractRef",
  "handoffCoverageReportRef",
  "runtimeGraphObservationReportRef",
  "runtimeGraphDriftReportRef",
  "findingReportRef",
  "pathFreshnessReportRef",
  "verificationResultRef",
] as const;

const PREPARED_INTENT_SCOPE_FIELDS = ["paths", "systems", "capabilities", "steps"] as const;

function preparedIntentSortedStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const set = new Set<string>();
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) set.add(value);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function preparedIntentCompactStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value === "string" && value.length > 0 && !seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

function preparedIntentNormalizeObligations(values: unknown): PreparedIntentObligation[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: PreparedIntentObligation[] = [];
  for (const raw of values) {
    if (!isRecord(raw)) continue;
    const id = raw.id;
    if (typeof id !== "string" || id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    const obligation: PreparedIntentObligation = {
      id,
      category: raw.category as PreparedIntentObligationCategory,
      severity: raw.severity as PreparedIntentSeverity,
      message: typeof raw.message === "string" ? raw.message : "",
    };
    if (Array.isArray(raw.sourceRefs) && raw.sourceRefs.length > 0) {
      obligation.sourceRefs = normalizeRefs(raw.sourceRefs as ArtifactRef[]);
    }
    out.push(obligation);
  }
  out.sort((a, b) => {
    const ra = PREPARED_INTENT_SEVERITY_RANK[a.severity] ?? 9;
    const rb = PREPARED_INTENT_SEVERITY_RANK[b.severity] ?? 9;
    if (ra !== rb) return ra - rb;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.id.localeCompare(b.id);
  });
  return out;
}

function preparedIntentNormalizePhases(values: unknown): PreparedIntentPhase[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: PreparedIntentPhase[] = [];
  for (const raw of values) {
    if (!isRecord(raw)) continue;
    const id = raw.id;
    if (typeof id !== "string" || id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      title: typeof raw.title === "string" ? raw.title : "",
      kind: raw.kind as PreparedIntentPhaseKind,
      status: raw.status as PreparedIntentPhaseStatus,
      goal: typeof raw.goal === "string" ? raw.goal : "",
      paths: preparedIntentSortedStrings(raw.paths),
      systems: preparedIntentSortedStrings(raw.systems),
      capabilities: preparedIntentSortedStrings(raw.capabilities),
      steps: preparedIntentSortedStrings(raw.steps),
      constraints: preparedIntentCompactStrings(raw.constraints),
      obligations: preparedIntentCompactStrings(raw.obligations),
      verificationRequirements: preparedIntentCompactStrings(raw.verificationRequirements),
      sourceRefs: normalizeRefs(Array.isArray(raw.sourceRefs) ? (raw.sourceRefs as ArtifactRef[]) : []),
    });
  }
  out.sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

function preparedIntentNormalizeVerificationRequirements(values: unknown): PreparedIntentVerificationRequirement[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: PreparedIntentVerificationRequirement[] = [];
  for (const raw of values) {
    if (!isRecord(raw)) continue;
    const id = raw.id;
    if (typeof id !== "string" || id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    const requirement: PreparedIntentVerificationRequirement = {
      id,
      reason: typeof raw.reason === "string" ? raw.reason : "",
    };
    if (typeof raw.command === "string" && raw.command.length > 0) requirement.command = raw.command;
    if (Array.isArray(raw.sourceRefs) && raw.sourceRefs.length > 0) {
      requirement.sourceRefs = normalizeRefs(raw.sourceRefs as ArtifactRef[]);
    }
    out.push(requirement);
  }
  out.sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

function preparedIntentApprovalReasons(values: unknown): PreparedIntentPlanApprovalReason[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: PreparedIntentPlanApprovalReason[] = [];
  for (const value of values) {
    if (typeof value === "string" && value.length > 0 && !seen.has(value)) {
      seen.add(value);
      out.push(value as PreparedIntentPlanApprovalReason);
    }
  }
  return out;
}

function preparedIntentBool(value: unknown): boolean {
  return value === true;
}

function preparedIntentCount(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function preparedIntentNormalizeProof(value: unknown): PreparedIntentPlanApprovalProof {
  const raw = isRecord(value) ? value : {};
  const drift = isRecord(raw.runtimeDrift) ? raw.runtimeDrift : {};
  const coverage = isRecord(raw.handoffCoverage) ? raw.handoffCoverage : {};
  const freshness = isRecord(raw.freshness) ? raw.freshness : {};
  const verification = isRecord(raw.verification) ? raw.verification : {};
  const structure = isRecord(raw.planStructure) ? raw.planStructure : {};
  const handoff = isRecord(raw.downstreamHandoff) ? raw.downstreamHandoff : {};

  const proof: PreparedIntentPlanApprovalProof = {
    intentAssessmentReportRef: assertArtifactRef(raw.intentAssessmentReportRef),
    assessmentReadiness: typeof raw.assessmentReadiness === "string" ? raw.assessmentReadiness : "",
    assessmentApprovedForPrepare: preparedIntentBool(raw.assessmentApprovedForPrepare),
    requiredContextPresent: preparedIntentBool(raw.requiredContextPresent),
    missingContext: preparedIntentCompactStrings(raw.missingContext),
    runtimeDrift: {
      accepted: preparedIntentBool(drift.accepted),
      unresolvedHighSeverity: preparedIntentCount(drift.unresolvedHighSeverity),
    },
    handoffCoverage: {
      accepted: preparedIntentBool(coverage.accepted),
      uncovered: preparedIntentCount(coverage.uncovered),
      unresolvedContract: preparedIntentCount(coverage.unresolvedContract),
      notEvaluated: preparedIntentCount(coverage.notEvaluated),
    },
    freshness: {
      accepted: preparedIntentBool(freshness.accepted),
      staleContext: preparedIntentBool(freshness.staleContext),
    },
    verification: {
      requirementsPresent: preparedIntentBool(verification.requirementsPresent),
      proofResultsPresent: preparedIntentBool(verification.proofResultsPresent),
      verificationRefs: normalizeRefs(Array.isArray(verification.verificationRefs) ? (verification.verificationRefs as ArtifactRef[]) : []),
    },
    planStructure: {
      phasesPresent: preparedIntentBool(structure.phasesPresent),
      minimumPhaseCountMet: preparedIntentBool(structure.minimumPhaseCountMet),
      hasInvestigation: preparedIntentBool(structure.hasInvestigation),
      hasImplementationOrRefactor: preparedIntentBool(structure.hasImplementationOrRefactor),
      hasVerification: preparedIntentBool(structure.hasVerification),
      hasReview: preparedIntentBool(structure.hasReview),
    },
    downstreamHandoff: {
      workOrderAllowed: preparedIntentBool(handoff.workOrderAllowed),
      verificationPlanAllowed: preparedIntentBool(handoff.verificationPlanAllowed),
      sourceWriteAllowed: false,
    },
  };
  if (drift.runtimeGraphDriftReportRef) proof.runtimeDrift.runtimeGraphDriftReportRef = assertArtifactRef(drift.runtimeGraphDriftReportRef);
  if (coverage.handoffCoverageReportRef) proof.handoffCoverage.handoffCoverageReportRef = assertArtifactRef(coverage.handoffCoverageReportRef);
  if (freshness.pathFreshnessReportRef) proof.freshness.pathFreshnessReportRef = assertArtifactRef(freshness.pathFreshnessReportRef);
  if (isRecord(raw.intakeSufficiency)) {
    const intake = raw.intakeSufficiency;
    proof.intakeSufficiency = {
      present: preparedIntentBool(intake.present),
      satisfied: preparedIntentCompactStrings(intake.satisfied),
      missing: preparedIntentCompactStrings(intake.missing),
      sourceRefs: normalizeRefs(Array.isArray(intake.sourceRefs) ? (intake.sourceRefs as ArtifactRef[]) : []),
    };
  }
  return proof;
}

const INTENT_OPERATOR_ACCEPTED_RISK_CATEGORIES = new Set<string>([
  "verification-proof-missing",
  "runtime-drift-unresolved",
  "handoff-coverage-not-evaluated",
  "freshness-not-proven",
  "manual-review-required",
  "other",
]);

function preparedIntentNormalizeAcceptedRisks(value: unknown): IntentOperatorAcceptedRisk[] {
  if (!Array.isArray(value)) return [];
  const out: IntentOperatorAcceptedRisk[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const category =
      typeof entry.category === "string" && INTENT_OPERATOR_ACCEPTED_RISK_CATEGORIES.has(entry.category)
        ? (entry.category as IntentOperatorAcceptedRiskCategory)
        : "other";
    const risk: IntentOperatorAcceptedRisk = {
      id: typeof entry.id === "string" ? entry.id : "",
      category,
      message: typeof entry.message === "string" ? entry.message : "",
      acceptedAt: typeof entry.acceptedAt === "string" ? entry.acceptedAt : "",
      reason: typeof entry.reason === "string" ? entry.reason : "",
      sourceRefs: normalizeRefs(Array.isArray(entry.sourceRefs) ? (entry.sourceRefs as ArtifactRef[]) : []),
    };
    if (typeof entry.acceptedBy === "string" && entry.acceptedBy.length > 0) risk.acceptedBy = entry.acceptedBy;
    out.push(risk);
  }
  return out;
}

function preparedIntentNormalizeApproval(value: unknown): PreparedIntentPlanApproval {
  const raw = isRecord(value) ? value : {};
  const approval: PreparedIntentPlanApproval = {
    status: raw.status as PreparedIntentPlanApprovalStatus,
    reasons: preparedIntentApprovalReasons(raw.reasons),
    proof: preparedIntentNormalizeProof(raw.proof),
    blockers: preparedIntentNormalizeObligations(raw.blockers),
  };
  const acceptedRisks = preparedIntentNormalizeAcceptedRisks(raw.acceptedRisks);
  if (acceptedRisks.length > 0) approval.acceptedRisks = acceptedRisks;
  return approval;
}

export function createPreparedIntentPlan(input: PreparedIntentPlan): PreparedIntentPlan {
  const source: PreparedIntentPlanSource = {
    intentAssessmentReportRef: assertArtifactRef(input.source?.intentAssessmentReportRef),
  };
  for (const field of PREPARED_INTENT_SOURCE_OPTIONAL_FIELDS) {
    const ref = input.source?.[field];
    if (ref) source[field] = assertArtifactRef(ref);
  }

  const rawRequest = isRecord(input.request) ? (input.request as PreparedIntentPlanRequest) : ({} as PreparedIntentPlanRequest);
  const request: PreparedIntentPlanRequest = {
    goal: typeof rawRequest.goal === "string" ? rawRequest.goal : "",
    kind: typeof rawRequest.kind === "string" ? rawRequest.kind : "",
  };
  if (isRecord(rawRequest.scope)) {
    const scope: NonNullable<PreparedIntentPlanRequest["scope"]> = {};
    for (const field of PREPARED_INTENT_SCOPE_FIELDS) {
      const list = preparedIntentSortedStrings((rawRequest.scope as Record<string, unknown>)[field]);
      if (list.length > 0) scope[field] = list;
    }
    if (Object.keys(scope).length > 0) request.scope = scope;
  }

  const rawStatus = isRecord(input.status) ? (input.status as PreparedIntentPlanStatusBlock) : ({} as PreparedIntentPlanStatusBlock);
  const status: PreparedIntentPlanStatusBlock = {
    value: rawStatus.value,
    recommendedNextAction: rawStatus.recommendedNextAction,
  };

  return assertPreparedIntentPlan({
    header: input.header,
    source,
    request,
    status,
    approval: preparedIntentNormalizeApproval(input.approval),
    phases: preparedIntentNormalizePhases(input.phases),
    obligations: preparedIntentNormalizeObligations(input.obligations),
    verificationRequirements: preparedIntentNormalizeVerificationRequirements(input.verificationRequirements),
    blockedReasons: preparedIntentNormalizeObligations(input.blockedReasons),
  });
}

function validatePreparedIntentObligation(
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
  if (typeof value.category !== "string" || !PREPARED_INTENT_OBLIGATION_CATEGORIES.has(value.category)) {
    issues.push({ path: `${path}.category`, message: "Expected a valid obligation category." });
  }
  if (typeof value.severity !== "string" || !PREPARED_INTENT_SEVERITIES.has(value.severity)) {
    issues.push({ path: `${path}.severity`, message: "Expected one of low, medium, high." });
  }
  if (typeof value.message !== "string" || value.message.length === 0) {
    issues.push({ path: `${path}.message`, message: "Expected a non-empty string." });
  }
  if (value.sourceRefs !== undefined) {
    if (!Array.isArray(value.sourceRefs)) {
      issues.push({ path: `${path}.sourceRefs`, message: "Expected an array." });
    } else {
      value.sourceRefs.forEach((ref, index) => {
        const result = validateArtifactRef(ref);
        if (!result.ok) issues.push(...prefixIssues(result.issues, `${path}.sourceRefs[${index}]`));
      });
    }
  }
}

function validatePreparedIntentStringArray(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array." });
    return;
  }
  value.forEach((item, index) => {
    if (typeof item !== "string" || item.length === 0) {
      issues.push({ path: `${path}[${index}]`, message: "Expected a non-empty string." });
    }
  });
}

function validatePreparedIntentPhase(
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
    issues.push({ path: `${path}.id`, message: `Duplicate phase id ${value.id}.` });
  } else {
    seenIds.add(value.id);
  }
  if (typeof value.title !== "string" || value.title.length === 0) {
    issues.push({ path: `${path}.title`, message: "Expected a non-empty string." });
  }
  if (typeof value.kind !== "string" || !PREPARED_INTENT_PHASE_KINDS.has(value.kind)) {
    issues.push({ path: `${path}.kind`, message: "Expected one of investigate, modify, refactor, verify, review." });
  }
  if (typeof value.status !== "string" || !PREPARED_INTENT_PHASE_STATUSES.has(value.status)) {
    issues.push({ path: `${path}.status`, message: "Expected one of planned, blocked, needs-review." });
  }
  if (typeof value.goal !== "string" || value.goal.length === 0) {
    issues.push({ path: `${path}.goal`, message: "Expected a non-empty string." });
  }
  for (const field of ["paths", "systems", "capabilities", "steps", "constraints", "obligations", "verificationRequirements"] as const) {
    validatePreparedIntentStringArray(value[field], `${path}.${field}`, issues);
  }
  if (!Array.isArray(value.sourceRefs)) {
    issues.push({ path: `${path}.sourceRefs`, message: "Expected an array." });
  } else {
    value.sourceRefs.forEach((ref, index) => {
      const result = validateArtifactRef(ref);
      if (!result.ok) issues.push(...prefixIssues(result.issues, `${path}.sourceRefs[${index}]`));
    });
  }
}

function validatePreparedIntentProofBool(rec: Record<string, unknown>, key: string, path: string, issues: ValidationIssue[]): void {
  if (typeof rec[key] !== "boolean") issues.push({ path: `${path}.${key}`, message: "Expected a boolean." });
}

function validatePreparedIntentProofCount(rec: Record<string, unknown>, key: string, path: string, issues: ValidationIssue[]): void {
  const x = rec[key];
  if (typeof x !== "number" || !Number.isInteger(x) || x < 0) issues.push({ path: `${path}.${key}`, message: "Expected a non-negative integer." });
}

function validatePreparedIntentProofOptRef(rec: Record<string, unknown>, key: string, path: string, issues: ValidationIssue[]): void {
  if (rec[key] !== undefined) {
    const result = validateArtifactRef(rec[key]);
    if (!result.ok) issues.push(...prefixIssues(result.issues, `${path}.${key}`));
  }
}

function validatePreparedIntentProofRefList(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array." });
    return;
  }
  value.forEach((ref, index) => {
    const result = validateArtifactRef(ref);
    if (!result.ok) issues.push(...prefixIssues(result.issues, `${path}[${index}]`));
  });
}

function validatePreparedIntentProofBlock(value: unknown, path: string, bools: string[], counts: string[], optRefs: string[], issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  for (const key of bools) validatePreparedIntentProofBool(value, key, path, issues);
  for (const key of counts) validatePreparedIntentProofCount(value, key, path, issues);
  for (const key of optRefs) validatePreparedIntentProofOptRef(value, key, path, issues);
}

function validatePreparedIntentProof(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  if (value.intentAssessmentReportRef === undefined) {
    issues.push({ path: `${path}.intentAssessmentReportRef`, message: "Expected an ArtifactRef." });
  } else {
    const result = validateArtifactRef(value.intentAssessmentReportRef);
    if (!result.ok) issues.push(...prefixIssues(result.issues, `${path}.intentAssessmentReportRef`));
  }
  if (typeof value.assessmentReadiness !== "string" || value.assessmentReadiness.length === 0) {
    issues.push({ path: `${path}.assessmentReadiness`, message: "Expected a non-empty string." });
  }
  validatePreparedIntentProofBool(value, "assessmentApprovedForPrepare", path, issues);
  validatePreparedIntentProofBool(value, "requiredContextPresent", path, issues);
  validatePreparedIntentStringArray(value.missingContext, `${path}.missingContext`, issues);
  validatePreparedIntentProofBlock(value.runtimeDrift, `${path}.runtimeDrift`, ["accepted"], ["unresolvedHighSeverity"], ["runtimeGraphDriftReportRef"], issues);
  validatePreparedIntentProofBlock(value.handoffCoverage, `${path}.handoffCoverage`, ["accepted"], ["uncovered", "unresolvedContract", "notEvaluated"], ["handoffCoverageReportRef"], issues);
  validatePreparedIntentProofBlock(value.freshness, `${path}.freshness`, ["accepted", "staleContext"], [], ["pathFreshnessReportRef"], issues);
  if (!isRecord(value.verification)) {
    issues.push({ path: `${path}.verification`, message: "Expected an object." });
  } else {
    validatePreparedIntentProofBool(value.verification, "requirementsPresent", `${path}.verification`, issues);
    validatePreparedIntentProofBool(value.verification, "proofResultsPresent", `${path}.verification`, issues);
    validatePreparedIntentProofRefList(value.verification.verificationRefs, `${path}.verification.verificationRefs`, issues);
  }
  validatePreparedIntentProofBlock(
    value.planStructure,
    `${path}.planStructure`,
    ["phasesPresent", "minimumPhaseCountMet", "hasInvestigation", "hasImplementationOrRefactor", "hasVerification", "hasReview"],
    [],
    [],
    issues,
  );
  if (!isRecord(value.downstreamHandoff)) {
    issues.push({ path: `${path}.downstreamHandoff`, message: "Expected an object." });
  } else {
    validatePreparedIntentProofBool(value.downstreamHandoff, "workOrderAllowed", `${path}.downstreamHandoff`, issues);
    validatePreparedIntentProofBool(value.downstreamHandoff, "verificationPlanAllowed", `${path}.downstreamHandoff`, issues);
    if (value.downstreamHandoff.sourceWriteAllowed !== false) {
      issues.push({ path: `${path}.downstreamHandoff.sourceWriteAllowed`, message: "Expected the literal false." });
    }
  }
  if (value.intakeSufficiency !== undefined) {
    if (!isRecord(value.intakeSufficiency)) {
      issues.push({ path: `${path}.intakeSufficiency`, message: "Expected an object." });
    } else {
      validatePreparedIntentProofBool(value.intakeSufficiency, "present", `${path}.intakeSufficiency`, issues);
      validatePreparedIntentStringArray(value.intakeSufficiency.satisfied, `${path}.intakeSufficiency.satisfied`, issues);
      validatePreparedIntentStringArray(value.intakeSufficiency.missing, `${path}.intakeSufficiency.missing`, issues);
      validatePreparedIntentProofRefList(value.intakeSufficiency.sourceRefs, `${path}.intakeSufficiency.sourceRefs`, issues);
    }
  }
}

function validateIntentOperatorAcceptedRisk(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  if (typeof value.id !== "string" || value.id.length === 0) {
    issues.push({ path: `${path}.id`, message: "Expected a non-empty string." });
  }
  if (typeof value.category !== "string" || !INTENT_OPERATOR_ACCEPTED_RISK_CATEGORIES.has(value.category)) {
    issues.push({ path: `${path}.category`, message: "Expected a valid accepted-risk category." });
  }
  if (typeof value.message !== "string" || value.message.length === 0) {
    issues.push({ path: `${path}.message`, message: "Expected a non-empty string." });
  }
  if (typeof value.acceptedAt !== "string" || value.acceptedAt.length === 0) {
    issues.push({ path: `${path}.acceptedAt`, message: "Expected a non-empty string." });
  }
  if (typeof value.reason !== "string" || value.reason.length === 0) {
    issues.push({ path: `${path}.reason`, message: "Expected a non-empty string." });
  }
  if (value.acceptedBy !== undefined && typeof value.acceptedBy !== "string") {
    issues.push({ path: `${path}.acceptedBy`, message: "Expected a string." });
  }
  if (!Array.isArray(value.sourceRefs)) {
    issues.push({ path: `${path}.sourceRefs`, message: "Expected an array." });
  } else {
    value.sourceRefs.forEach((ref, index) => {
      const result = validateArtifactRef(ref);
      if (!result.ok) issues.push(...prefixIssues(result.issues, `${path}.sourceRefs[${index}]`));
    });
  }
}

function validatePreparedIntentApproval(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  if (typeof value.status !== "string" || !PREPARED_INTENT_APPROVAL_STATUSES.has(value.status)) {
    issues.push({ path: `${path}.status`, message: "Expected approved, not-approved, or needs-review." });
  }
  if (!Array.isArray(value.reasons) || value.reasons.length === 0) {
    issues.push({ path: `${path}.reasons`, message: "Expected a non-empty array." });
  } else {
    value.reasons.forEach((reason, index) => {
      if (typeof reason !== "string" || !PREPARED_INTENT_APPROVAL_REASONS.has(reason)) {
        issues.push({ path: `${path}.reasons[${index}]`, message: "Expected a valid approval reason." });
      }
    });
  }
  if (!Array.isArray(value.blockers)) {
    issues.push({ path: `${path}.blockers`, message: "Expected an array." });
  } else {
    const seen = new Set<string>();
    value.blockers.forEach((blocker, index) => validatePreparedIntentObligation(blocker, `${path}.blockers[${index}]`, issues, seen));
  }
  validatePreparedIntentProof(value.proof, `${path}.proof`, issues);
  if (value.acceptedRisks !== undefined) {
    if (!Array.isArray(value.acceptedRisks)) {
      issues.push({ path: `${path}.acceptedRisks`, message: "Expected an array." });
    } else {
      value.acceptedRisks.forEach((risk, index) =>
        validateIntentOperatorAcceptedRisk(risk, `${path}.acceptedRisks[${index}]`, issues),
      );
    }
  }
}

export function validatePreparedIntentPlan(value: unknown): ValidationResult<PreparedIntentPlan> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  validateModelHeader(value.header, "PreparedIntentPlan", "$.header", issues);

  if (!isRecord(value.source)) {
    issues.push({ path: "$.source", message: "Expected an object." });
  } else {
    const ref = (value.source as Record<string, unknown>).intentAssessmentReportRef;
    if (ref === undefined) {
      issues.push({ path: "$.source.intentAssessmentReportRef", message: "Expected an ArtifactRef." });
    } else {
      const result = validateArtifactRef(ref);
      if (!result.ok) issues.push(...prefixIssues(result.issues, "$.source.intentAssessmentReportRef"));
    }
    for (const field of PREPARED_INTENT_SOURCE_OPTIONAL_FIELDS) {
      const optional = (value.source as Record<string, unknown>)[field];
      if (optional !== undefined) {
        const result = validateArtifactRef(optional);
        if (!result.ok) issues.push(...prefixIssues(result.issues, `$.source.${field}`));
      }
    }
  }

  if (!isRecord(value.request)) {
    issues.push({ path: "$.request", message: "Expected an object." });
  } else {
    const request = value.request as Record<string, unknown>;
    if (typeof request.goal !== "string" || request.goal.length === 0) {
      issues.push({ path: "$.request.goal", message: "Expected a non-empty string." });
    }
    if (typeof request.kind !== "string" || request.kind.length === 0) {
      issues.push({ path: "$.request.kind", message: "Expected a non-empty string." });
    }
    if (request.scope !== undefined) {
      if (!isRecord(request.scope)) {
        issues.push({ path: "$.request.scope", message: "Expected an object." });
      } else {
        for (const field of PREPARED_INTENT_SCOPE_FIELDS) {
          const list = (request.scope as Record<string, unknown>)[field];
          if (list !== undefined) validatePreparedIntentStringArray(list, `$.request.scope.${field}`, issues);
        }
      }
    }
  }

  if (!isRecord(value.status)) {
    issues.push({ path: "$.status", message: "Expected an object." });
  } else {
    const status = value.status as Record<string, unknown>;
    if (typeof status.value !== "string" || !PREPARED_INTENT_PLAN_STATUSES.has(status.value)) {
      issues.push({ path: "$.status.value", message: "Expected a valid prepared status." });
    }
    if (typeof status.recommendedNextAction !== "string" || !PREPARED_INTENT_NEXT_ACTIONS.has(status.recommendedNextAction)) {
      issues.push({ path: "$.status.recommendedNextAction", message: "Expected a valid recommended next action." });
    }
  }

  if (!Array.isArray(value.phases)) {
    issues.push({ path: "$.phases", message: "Expected an array." });
  } else {
    const seenIds = new Set<string>();
    value.phases.forEach((phase, index) => validatePreparedIntentPhase(phase, `$.phases[${index}]`, issues, seenIds));
  }

  for (const field of ["obligations", "blockedReasons"] as const) {
    const list = (value as Record<string, unknown>)[field];
    if (!Array.isArray(list)) {
      issues.push({ path: `$.${field}`, message: "Expected an array." });
    } else {
      const seenIds = new Set<string>();
      list.forEach((entry, index) => validatePreparedIntentObligation(entry, `$.${field}[${index}]`, issues, seenIds));
    }
  }

  if (!Array.isArray(value.verificationRequirements)) {
    issues.push({ path: "$.verificationRequirements", message: "Expected an array." });
  } else {
    const seenIds = new Set<string>();
    value.verificationRequirements.forEach((requirement, index) => {
      const path = `$.verificationRequirements[${index}]`;
      if (!isRecord(requirement)) {
        issues.push({ path, message: "Expected an object." });
        return;
      }
      if (typeof requirement.id !== "string" || requirement.id.length === 0) {
        issues.push({ path: `${path}.id`, message: "Expected a non-empty string." });
      } else if (seenIds.has(requirement.id)) {
        issues.push({ path: `${path}.id`, message: `Duplicate verification requirement id ${requirement.id}.` });
      } else {
        seenIds.add(requirement.id);
      }
      if (typeof requirement.reason !== "string" || requirement.reason.length === 0) {
        issues.push({ path: `${path}.reason`, message: "Expected a non-empty string." });
      }
      if (requirement.command !== undefined && (typeof requirement.command !== "string" || requirement.command.length === 0)) {
        issues.push({ path: `${path}.command`, message: "Expected a non-empty string." });
      }
      if (requirement.sourceRefs !== undefined) {
        if (!Array.isArray(requirement.sourceRefs)) {
          issues.push({ path: `${path}.sourceRefs`, message: "Expected an array." });
        } else {
          requirement.sourceRefs.forEach((ref, refIndex) => {
            const result = validateArtifactRef(ref);
            if (!result.ok) issues.push(...prefixIssues(result.issues, `${path}.sourceRefs[${refIndex}]`));
          });
        }
      }
    });
  }

  // Required approval/proof envelope (PreparedIntentPlan Approval / Proof
  // Model Decision). `approval` is required; `prepared` requires `approved`.
  if (value.approval === undefined) {
    issues.push({ path: "$.approval", message: "Expected an approval envelope." });
  } else {
    validatePreparedIntentApproval(value.approval, "$.approval", issues);
  }

  // Cross-field hard rules.
  const statusValue = isRecord(value.status) ? (value.status as Record<string, unknown>).value : undefined;
  const approvalStatus = isRecord(value.approval) ? (value.approval as Record<string, unknown>).status : undefined;
  const requestKind = isRecord(value.request) ? (value.request as Record<string, unknown>).kind : undefined;
  const phaseList = Array.isArray(value.phases) ? value.phases.filter(isRecord) as Array<Record<string, unknown>> : [];
  const phaseKinds = new Set(phaseList.map((phase) => phase.kind));
  const requirementCount = Array.isArray(value.verificationRequirements) ? value.verificationRequirements.length : 0;
  const approvalReasons = isRecord(value.approval) && Array.isArray((value.approval as Record<string, unknown>).reasons)
    ? ((value.approval as Record<string, unknown>).reasons as unknown[])
    : [];

  if (statusValue === "prepared") {
    if (approvalStatus !== "approved") {
      issues.push({ path: "$.status.value", message: "A prepared plan requires approval.status === \"approved\"." });
    }
    if (phaseList.length === 0) {
      issues.push({ path: "$.phases", message: "A prepared plan must have at least one phase." });
    }
    if (typeof requestKind === "string" && PREPARED_INTENT_IMPLEMENTATION_KINDS.has(requestKind)) {
      if (requirementCount === 0) {
        issues.push({ path: "$.verificationRequirements", message: "A prepared implementation-bearing plan must have verification requirements." });
      }
      if (!phaseKinds.has("verify")) {
        issues.push({ path: "$.phases", message: "A prepared implementation-bearing plan must include a verify phase." });
      }
    }
    if (requestKind === "refactor" && !phaseKinds.has("refactor")) {
      issues.push({ path: "$.phases", message: "A prepared refactor plan must include a refactor phase." });
    }
    if ((requestKind === "bug" || requestKind === "feature" || requestKind === "migration") && !phaseKinds.has("modify")) {
      issues.push({ path: "$.phases", message: "A prepared bug/feature/migration plan must include a modify phase." });
    }
    if (requestKind === "unknown" && !approvalReasons.some((reason) => typeof reason === "string" && PREPARED_INTENT_EXPLICIT_APPROVAL_REASONS.has(reason))) {
      issues.push({ path: "$.status.value", message: "A prepared unknown-kind plan requires an explicit approval reason." });
    }
  }
  if ((statusValue === "blocked" || statusValue === "stale-assessment" || statusValue === "insufficient-assessment") && approvalStatus === "approved") {
    issues.push({ path: "$.approval.status", message: "A blocked/stale/insufficient plan must not have approval.status approved." });
  }

  return validationResult(value as PreparedIntentPlan, issues);
}

export function assertPreparedIntentPlan(value: unknown): PreparedIntentPlan {
  return assertValid(validatePreparedIntentPlan(value), "PreparedIntentPlan");
}

export const preparedIntentPlanSchema: ArtifactSchema<PreparedIntentPlan> = {
  validate: validatePreparedIntentPlan,
  parse: assertPreparedIntentPlan,
};

// ---------------------------------------------------------------------------
// IntentStatusReport — read-only rollup status report over the intent spine.
// Status reporting, NOT VerificationResult; NOT WorkOrder. It consumes existing
// artifacts read-only, reports PreparedIntentPlan approval state without
// approving plans, and creates nothing. See
// docs/strategy/intent-status-report-v1-decision.md.
// ---------------------------------------------------------------------------

export type IntentStatusValue =
  | "not-assessed"
  | "assessed"
  | "assessment-blocked"
  | "prepared"
  | "preparation-blocked"
  | "needs-review"
  | "stale"
  | "work-ready"
  | "work-in-progress"
  | "verification-ready"
  | "verification-running"
  | "verification-passed"
  | "verification-failed"
  | "complete"
  | "unknown";

export type IntentStatusRecommendedNextAction =
  | "run-assessment"
  | "prepare-intent"
  | "review-prepared-plan"
  | "create-work-order"
  | "create-verification-plan"
  | "run-verification"
  | "resolve-blockers"
  | "refresh-context"
  | "human-review"
  | "none";

export type IntentStatusIssueCategory =
  | "assessment-blocked"
  | "preparation-not-approved"
  | "stale-context"
  | "runtime-drift"
  | "handoff-coverage"
  | "work-missing"
  | "verification-plan-missing"
  | "verification-not-run"
  | "verification-failed"
  | "missing-artifact"
  | "unknown-state";

export type IntentStatusSeverity = "low" | "medium" | "high";

export type IntentStatusIssue = {
  id: string;
  category: IntentStatusIssueCategory;
  severity: IntentStatusSeverity;
  message: string;
  sourceRefs?: ArtifactRef[];
};

export type IntentStatusPhaseSummary = {
  id: string;
  title: string;
  status: string;
};

export type IntentStatusReportRequest = {
  goal?: string;
  kind?: string;
  scope?: {
    paths?: string[];
    systems?: string[];
    capabilities?: string[];
    steps?: string[];
  };
};

export type IntentStatusReportSource = {
  intentAssessmentReportRef?: ArtifactRef;
  preparedIntentPlanRef?: ArtifactRef;
  workOrderRef?: ArtifactRef;
  verificationPlanRef?: ArtifactRef;
  verificationRunRef?: ArtifactRef;
  verificationResultRef?: ArtifactRef;
  pathFreshnessReportRef?: ArtifactRef;
  runtimeGraphDriftReportRef?: ArtifactRef;
  handoffCoverageReportRef?: ArtifactRef;
  findingReportRef?: ArtifactRef;
  // Additive (slice 126): set by the work-ready status transition. The approved
  // PreparedIntentPlan this revision reflects and the previous IntentStatusReport
  // it transitions from. Optional and backward-compatible.
  approvedPreparedIntentPlanRef?: ArtifactRef;
  previousIntentStatusReportRef?: ArtifactRef;
};

export type IntentStatusProof = {
  assessment?: { present: boolean; readiness?: string; blockers: number; warnings: number };
  preparation?: {
    present: boolean;
    status?: string;
    approvalStatus?: string;
    phases: number;
    obligations: number;
    verificationRequirements: number;
    // Additive (slice 126): the operator-accepted proof gaps carried forward from
    // the approved PreparedIntentPlan by the work-ready status transition.
    acceptedRisks?: IntentOperatorAcceptedRisk[];
  };
  work?: { present: boolean; status?: string };
  verification?: { planPresent: boolean; runPresent: boolean; resultPresent: boolean; resultStatus?: string };
  freshness?: { present: boolean; stale: boolean };
  runtimeDrift?: {
    present: boolean;
    highSeverityOpen: number;
    addedObserved: number;
    uncoveredHandoff: number;
    unresolvedContract: number;
  };
};

export type IntentStatusReport = {
  header: ArtifactHeader;
  source: IntentStatusReportSource;
  request?: IntentStatusReportRequest;
  status: {
    value: IntentStatusValue;
    recommendedNextAction: IntentStatusRecommendedNextAction;
  };
  phases: IntentStatusPhaseSummary[];
  proof: IntentStatusProof;
  blockers: IntentStatusIssue[];
  warnings: IntentStatusIssue[];
  staleInputs: IntentStatusIssue[];
  missingInputs: IntentStatusIssue[];
};

const INTENT_STATUS_VALUES = new Set<string>([
  "not-assessed",
  "assessed",
  "assessment-blocked",
  "prepared",
  "preparation-blocked",
  "needs-review",
  "stale",
  "work-ready",
  "work-in-progress",
  "verification-ready",
  "verification-running",
  "verification-passed",
  "verification-failed",
  "complete",
  "unknown",
]);

const INTENT_STATUS_NEXT_ACTIONS = new Set<string>([
  "run-assessment",
  "prepare-intent",
  "review-prepared-plan",
  "create-work-order",
  "create-verification-plan",
  "run-verification",
  "resolve-blockers",
  "refresh-context",
  "human-review",
  "none",
]);

const INTENT_STATUS_ISSUE_CATEGORIES = new Set<string>([
  "assessment-blocked",
  "preparation-not-approved",
  "stale-context",
  "runtime-drift",
  "handoff-coverage",
  "work-missing",
  "verification-plan-missing",
  "verification-not-run",
  "verification-failed",
  "missing-artifact",
  "unknown-state",
]);

const INTENT_STATUS_SEVERITIES = new Set<string>(["low", "medium", "high"]);
const INTENT_STATUS_SEVERITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

const INTENT_STATUS_SOURCE_FIELDS = [
  "intentAssessmentReportRef",
  "preparedIntentPlanRef",
  "workOrderRef",
  "verificationPlanRef",
  "verificationRunRef",
  "verificationResultRef",
  "pathFreshnessReportRef",
  "runtimeGraphDriftReportRef",
  "handoffCoverageReportRef",
  "findingReportRef",
  "approvedPreparedIntentPlanRef",
  "previousIntentStatusReportRef",
] as const;

const INTENT_STATUS_SCOPE_FIELDS = ["paths", "systems", "capabilities", "steps"] as const;

function intentStatusBool(value: unknown): boolean {
  return value === true;
}

function intentStatusCount(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function intentStatusSortedStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item === "string" && item.length > 0) seen.add(item);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

function normalizeIntentStatusPhases(value: unknown): IntentStatusPhaseSummary[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: IntentStatusPhaseSummary[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || typeof raw.id !== "string" || raw.id.length === 0 || seen.has(raw.id)) continue;
    seen.add(raw.id);
    out.push({
      id: raw.id,
      title: typeof raw.title === "string" ? raw.title : "",
      status: typeof raw.status === "string" ? raw.status : "",
    });
  }
  out.sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

function normalizeIntentStatusIssues(value: unknown): IntentStatusIssue[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: IntentStatusIssue[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || typeof raw.id !== "string" || raw.id.length === 0 || seen.has(raw.id)) continue;
    seen.add(raw.id);
    const issue: IntentStatusIssue = {
      id: raw.id,
      category: raw.category as IntentStatusIssueCategory,
      severity: raw.severity as IntentStatusSeverity,
      message: typeof raw.message === "string" ? raw.message : "",
    };
    if (Array.isArray(raw.sourceRefs)) issue.sourceRefs = normalizeRefs(raw.sourceRefs as ArtifactRef[]);
    out.push(issue);
  }
  out.sort((a, b) => {
    const ra = INTENT_STATUS_SEVERITY_RANK[a.severity] ?? 9;
    const rb = INTENT_STATUS_SEVERITY_RANK[b.severity] ?? 9;
    if (ra !== rb) return ra - rb;
    if (a.category !== b.category) return String(a.category).localeCompare(String(b.category));
    return a.id.localeCompare(b.id);
  });
  return out;
}

function normalizeIntentStatusProof(value: unknown): IntentStatusProof {
  const raw = isRecord(value) ? value : {};
  const proof: IntentStatusProof = {};
  if (isRecord(raw.assessment)) {
    const a = raw.assessment;
    proof.assessment = { present: intentStatusBool(a.present), blockers: intentStatusCount(a.blockers), warnings: intentStatusCount(a.warnings) };
    if (typeof a.readiness === "string") proof.assessment.readiness = a.readiness;
  }
  if (isRecord(raw.preparation)) {
    const p = raw.preparation;
    proof.preparation = {
      present: intentStatusBool(p.present),
      phases: intentStatusCount(p.phases),
      obligations: intentStatusCount(p.obligations),
      verificationRequirements: intentStatusCount(p.verificationRequirements),
    };
    if (typeof p.status === "string") proof.preparation.status = p.status;
    if (typeof p.approvalStatus === "string") proof.preparation.approvalStatus = p.approvalStatus;
    const preparationAcceptedRisks = preparedIntentNormalizeAcceptedRisks(p.acceptedRisks);
    if (preparationAcceptedRisks.length > 0) proof.preparation.acceptedRisks = preparationAcceptedRisks;
  }
  if (isRecord(raw.work)) {
    const w = raw.work;
    proof.work = { present: intentStatusBool(w.present) };
    if (typeof w.status === "string") proof.work.status = w.status;
  }
  if (isRecord(raw.verification)) {
    const v = raw.verification;
    proof.verification = {
      planPresent: intentStatusBool(v.planPresent),
      runPresent: intentStatusBool(v.runPresent),
      resultPresent: intentStatusBool(v.resultPresent),
    };
    if (typeof v.resultStatus === "string") proof.verification.resultStatus = v.resultStatus;
  }
  if (isRecord(raw.freshness)) {
    const f = raw.freshness;
    proof.freshness = { present: intentStatusBool(f.present), stale: intentStatusBool(f.stale) };
  }
  if (isRecord(raw.runtimeDrift)) {
    const d = raw.runtimeDrift;
    proof.runtimeDrift = {
      present: intentStatusBool(d.present),
      highSeverityOpen: intentStatusCount(d.highSeverityOpen),
      addedObserved: intentStatusCount(d.addedObserved),
      uncoveredHandoff: intentStatusCount(d.uncoveredHandoff),
      unresolvedContract: intentStatusCount(d.unresolvedContract),
    };
  }
  return proof;
}

export function createIntentStatusReport(input: IntentStatusReport): IntentStatusReport {
  const source: IntentStatusReportSource = {};
  for (const field of INTENT_STATUS_SOURCE_FIELDS) {
    const ref = input.source?.[field];
    if (ref) source[field] = assertArtifactRef(ref);
  }

  const rawStatus = isRecord(input.status) ? (input.status as IntentStatusReport["status"]) : ({} as IntentStatusReport["status"]);
  const report: IntentStatusReport = {
    header: input.header,
    source,
    status: { value: rawStatus.value, recommendedNextAction: rawStatus.recommendedNextAction },
    phases: normalizeIntentStatusPhases(input.phases),
    proof: normalizeIntentStatusProof(input.proof),
    blockers: normalizeIntentStatusIssues(input.blockers),
    warnings: normalizeIntentStatusIssues(input.warnings),
    staleInputs: normalizeIntentStatusIssues(input.staleInputs),
    missingInputs: normalizeIntentStatusIssues(input.missingInputs),
  };

  if (isRecord(input.request)) {
    const rawRequest = input.request as IntentStatusReportRequest;
    const request: IntentStatusReportRequest = {};
    if (typeof rawRequest.goal === "string" && rawRequest.goal.length > 0) request.goal = rawRequest.goal;
    if (typeof rawRequest.kind === "string" && rawRequest.kind.length > 0) request.kind = rawRequest.kind;
    if (isRecord(rawRequest.scope)) {
      const scope: NonNullable<IntentStatusReportRequest["scope"]> = {};
      for (const field of INTENT_STATUS_SCOPE_FIELDS) {
        const list = intentStatusSortedStrings((rawRequest.scope as Record<string, unknown>)[field]);
        if (list.length > 0) scope[field] = list;
      }
      if (Object.keys(scope).length > 0) request.scope = scope;
    }
    if (Object.keys(request).length > 0) report.request = request;
  }

  return assertIntentStatusReport(report);
}

function validateIntentStatusIssueList(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array." });
    return;
  }
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isRecord(entry)) {
      issues.push({ path: entryPath, message: "Expected an object." });
      return;
    }
    if (typeof entry.id !== "string" || entry.id.length === 0) {
      issues.push({ path: `${entryPath}.id`, message: "Expected a non-empty string." });
    } else if (seen.has(entry.id)) {
      issues.push({ path: `${entryPath}.id`, message: `Duplicate issue id ${entry.id}.` });
    } else {
      seen.add(entry.id);
    }
    if (typeof entry.category !== "string" || !INTENT_STATUS_ISSUE_CATEGORIES.has(entry.category)) {
      issues.push({ path: `${entryPath}.category`, message: "Expected a valid issue category." });
    }
    if (typeof entry.severity !== "string" || !INTENT_STATUS_SEVERITIES.has(entry.severity)) {
      issues.push({ path: `${entryPath}.severity`, message: "Expected one of low, medium, high." });
    }
    if (typeof entry.message !== "string" || entry.message.length === 0) {
      issues.push({ path: `${entryPath}.message`, message: "Expected a non-empty string." });
    }
    if (entry.sourceRefs !== undefined) {
      if (!Array.isArray(entry.sourceRefs)) {
        issues.push({ path: `${entryPath}.sourceRefs`, message: "Expected an array." });
      } else {
        entry.sourceRefs.forEach((ref, refIndex) => {
          const result = validateArtifactRef(ref);
          if (!result.ok) issues.push(...prefixIssues(result.issues, `${entryPath}.sourceRefs[${refIndex}]`));
        });
      }
    }
  });
}

function validateIntentStatusProofBlock(
  value: unknown,
  path: string,
  bools: string[],
  counts: string[],
  optStrings: string[],
  issues: ValidationIssue[],
): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  for (const key of bools) {
    if (typeof value[key] !== "boolean") issues.push({ path: `${path}.${key}`, message: "Expected a boolean." });
  }
  for (const key of counts) {
    const x = value[key];
    if (typeof x !== "number" || !Number.isInteger(x) || x < 0) issues.push({ path: `${path}.${key}`, message: "Expected a non-negative integer." });
  }
  for (const key of optStrings) {
    if (value[key] !== undefined && typeof value[key] !== "string") issues.push({ path: `${path}.${key}`, message: "Expected a string." });
  }
}

export function validateIntentStatusReport(value: unknown): ValidationResult<IntentStatusReport> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  validateModelHeader(value.header, "IntentStatusReport", "$.header", issues);

  if (!isRecord(value.source)) {
    issues.push({ path: "$.source", message: "Expected an object." });
  } else {
    for (const field of INTENT_STATUS_SOURCE_FIELDS) {
      const ref = (value.source as Record<string, unknown>)[field];
      if (ref !== undefined) {
        const result = validateArtifactRef(ref);
        if (!result.ok) issues.push(...prefixIssues(result.issues, `$.source.${field}`));
      }
    }
  }

  if (value.request !== undefined) {
    if (!isRecord(value.request)) {
      issues.push({ path: "$.request", message: "Expected an object." });
    } else {
      const request = value.request as Record<string, unknown>;
      if (request.goal !== undefined && (typeof request.goal !== "string" || request.goal.length === 0)) {
        issues.push({ path: "$.request.goal", message: "Expected a non-empty string." });
      }
      if (request.kind !== undefined && (typeof request.kind !== "string" || request.kind.length === 0)) {
        issues.push({ path: "$.request.kind", message: "Expected a non-empty string." });
      }
      if (request.scope !== undefined) {
        if (!isRecord(request.scope)) {
          issues.push({ path: "$.request.scope", message: "Expected an object." });
        } else {
          for (const field of INTENT_STATUS_SCOPE_FIELDS) {
            const list = (request.scope as Record<string, unknown>)[field];
            if (list !== undefined) {
              if (!Array.isArray(list)) {
                issues.push({ path: `$.request.scope.${field}`, message: "Expected an array." });
              } else {
                list.forEach((item, index) => {
                  if (typeof item !== "string" || item.length === 0) {
                    issues.push({ path: `$.request.scope.${field}[${index}]`, message: "Expected a non-empty string." });
                  }
                });
              }
            }
          }
        }
      }
    }
  }

  if (!isRecord(value.status)) {
    issues.push({ path: "$.status", message: "Expected an object." });
  } else {
    const status = value.status as Record<string, unknown>;
    if (typeof status.value !== "string" || !INTENT_STATUS_VALUES.has(status.value)) {
      issues.push({ path: "$.status.value", message: "Expected a valid intent status value." });
    }
    if (typeof status.recommendedNextAction !== "string" || !INTENT_STATUS_NEXT_ACTIONS.has(status.recommendedNextAction)) {
      issues.push({ path: "$.status.recommendedNextAction", message: "Expected a valid recommended next action." });
    }
  }

  if (!Array.isArray(value.phases)) {
    issues.push({ path: "$.phases", message: "Expected an array." });
  } else {
    const seen = new Set<string>();
    value.phases.forEach((phase, index) => {
      const path = `$.phases[${index}]`;
      if (!isRecord(phase)) {
        issues.push({ path, message: "Expected an object." });
        return;
      }
      if (typeof phase.id !== "string" || phase.id.length === 0) {
        issues.push({ path: `${path}.id`, message: "Expected a non-empty string." });
      } else if (seen.has(phase.id)) {
        issues.push({ path: `${path}.id`, message: `Duplicate phase id ${phase.id}.` });
      } else {
        seen.add(phase.id);
      }
      if (typeof phase.title !== "string") issues.push({ path: `${path}.title`, message: "Expected a string." });
      if (typeof phase.status !== "string") issues.push({ path: `${path}.status`, message: "Expected a string." });
    });
  }

  if (!isRecord(value.proof)) {
    issues.push({ path: "$.proof", message: "Expected an object." });
  } else {
    const proof = value.proof as Record<string, unknown>;
    if (proof.assessment !== undefined) validateIntentStatusProofBlock(proof.assessment, "$.proof.assessment", ["present"], ["blockers", "warnings"], ["readiness"], issues);
    if (proof.preparation !== undefined) validateIntentStatusProofBlock(proof.preparation, "$.proof.preparation", ["present"], ["phases", "obligations", "verificationRequirements"], ["status", "approvalStatus"], issues);
    if (isRecord(proof.preparation) && (proof.preparation as Record<string, unknown>).acceptedRisks !== undefined) {
      const ar = (proof.preparation as Record<string, unknown>).acceptedRisks;
      if (!Array.isArray(ar)) {
        issues.push({ path: "$.proof.preparation.acceptedRisks", message: "Expected an array." });
      } else {
        ar.forEach((risk, index) => validateIntentOperatorAcceptedRisk(risk, `$.proof.preparation.acceptedRisks[${index}]`, issues));
      }
    }
    if (proof.work !== undefined) validateIntentStatusProofBlock(proof.work, "$.proof.work", ["present"], [], ["status"], issues);
    if (proof.verification !== undefined) validateIntentStatusProofBlock(proof.verification, "$.proof.verification", ["planPresent", "runPresent", "resultPresent"], [], ["resultStatus"], issues);
    if (proof.freshness !== undefined) validateIntentStatusProofBlock(proof.freshness, "$.proof.freshness", ["present", "stale"], [], [], issues);
    if (proof.runtimeDrift !== undefined) validateIntentStatusProofBlock(proof.runtimeDrift, "$.proof.runtimeDrift", ["present"], ["highSeverityOpen", "addedObserved", "uncoveredHandoff", "unresolvedContract"], [], issues);
  }

  validateIntentStatusIssueList(value.blockers, "$.blockers", issues);
  validateIntentStatusIssueList(value.warnings, "$.warnings", issues);
  validateIntentStatusIssueList(value.staleInputs, "$.staleInputs", issues);
  validateIntentStatusIssueList(value.missingInputs, "$.missingInputs", issues);

  // Completion rule: `complete` requires passed verification proof and no
  // high-severity blockers.
  const statusValue = isRecord(value.status) ? (value.status as Record<string, unknown>).value : undefined;
  if (statusValue === "complete") {
    const verification = isRecord(value.proof) ? (value.proof as Record<string, unknown>).verification : undefined;
    const resultStatus = isRecord(verification) ? (verification as Record<string, unknown>).resultStatus : undefined;
    if (resultStatus !== "passed") {
      issues.push({ path: "$.status.value", message: "A complete status requires verification proof resultStatus passed." });
    }
    if (Array.isArray(value.blockers) && value.blockers.some((b) => isRecord(b) && (b as Record<string, unknown>).severity === "high")) {
      issues.push({ path: "$.status.value", message: "A complete status must not have high-severity blockers." });
    }
  }

  return validationResult(value as IntentStatusReport, issues);
}

export function assertIntentStatusReport(value: unknown): IntentStatusReport {
  return assertValid(validateIntentStatusReport(value), "IntentStatusReport");
}

export const intentStatusReportSchema: ArtifactSchema<IntentStatusReport> = {
  validate: validateIntentStatusReport,
  parse: assertIntentStatusReport,
};

// ---------------------------------------------------------------------------
// IntentPlanActionabilityReport — plan compiler / actionability / elicitation
// (slice 129). Reads a raw / semi-structured plan, normalizes it into phase
// drafts, evaluates actionability, emits findings + elicitation questions + a
// revision prompt. Read/transform/report-only: executes no commands, writes no
// source, creates no PreparedIntentPlan / WorkOrder / VerificationPlan, runs no
// Circe; intent:go remains deferred.
// ---------------------------------------------------------------------------

export type IntentPlanActionabilityStatus = "actionable" | "needs-revision" | "blocked";
export type IntentPlanSourceShape = "structured-plan" | "semi-structured" | "brain-dump";
export type IntentPlanNormalizationMethod = "deterministic" | "semantic-llm" | "deterministic-fallback";
export type IntentPlanNormalizationProvenance = "source-only" | "semantic-llm";
export type IntentPlanActionabilityRequirement =
  | "objective"
  | "deliverables"
  | "acceptance-criteria"
  | "implementation-scope"
  | "verification-evidence"
  | "ambiguity-clearance"
  | "phase-contract"
  | "evidence-gates";
export type IntentPlanActionabilitySeverity = "low" | "medium" | "high" | "critical";
export type IntentPlanPhaseDraftKind = "investigate" | "modify" | "refactor" | "verify" | "review" | "unknown";
export type IntentPlanPhaseActionabilityStatus = "actionable" | "needs-revision" | "blocked";
export type IntentPlanElicitationAnswerShape = "sentence" | "bullets" | "paths" | "command-or-artifact";
export type IntentPlanElicitationPriority = "critical" | "high" | "medium";

export type IntentPlanPhaseSourceEvidence = {
  lineStart?: number;
  lineEnd?: number;
  excerpt: string;
};

export type IntentPlanPhaseDraft = {
  id: string;
  order: number;
  title: string;
  kind: IntentPlanPhaseDraftKind;
  objective: string;
  deliverables: string[];
  acceptanceCriteria: string[];
  touchedPaths: string[];
  verificationCommands: string[];
  evidenceArtifacts: string[];
  constraints: string[];
  sourceEvidence: IntentPlanPhaseSourceEvidence[];
  actionability: {
    status: IntentPlanPhaseActionabilityStatus;
    satisfiedRequirements: IntentPlanActionabilityRequirement[];
    missingRequirements: IntentPlanActionabilityRequirement[];
  };
};

export type IntentPlanActionabilityFinding = {
  id: string;
  severity: IntentPlanActionabilitySeverity;
  requirement: IntentPlanActionabilityRequirement;
  phaseId?: string;
  message: string;
  sourceEvidence: string[];
  suggestedFix: string;
};

export type IntentPlanElicitationQuestion = {
  id: string;
  phaseId?: string;
  requirement: IntentPlanActionabilityRequirement;
  question: string;
  answerShape: IntentPlanElicitationAnswerShape;
  whyAsked: string;
  priority: IntentPlanElicitationPriority;
};

export type IntentPlanEvidenceGate = {
  id: string;
  phaseId?: string;
  description: string;
  satisfied: boolean;
  evidence: string[];
};

// Answer / merge-back (slice 134). Optional, additive: an answered report revision
// records the answers that were merged into the normalized phase drafts. Existing
// reports without an answerTrace still validate.
export type IntentPlanAnswer = {
  questionId: string;
  answer: string;
  answeredAt: string;
  answeredBy?: string;
};
export type IntentPlanUnappliedAnswer = {
  questionId: string;
  reason: string;
};
export type IntentPlanMergeTrace = {
  sourceReportRef: ArtifactRef;
  answers: IntentPlanAnswer[];
  appliedRequirements: IntentPlanActionabilityRequirement[];
  unappliedAnswers: IntentPlanUnappliedAnswer[];
  method: "deterministic";
};

export type IntentPlanActionabilityReport = {
  header: ArtifactHeader;
  status: { value: IntentPlanActionabilityStatus; reason: string };
  sourcePlan: { path?: string; sha256?: string; lineCount?: number; sourceShape: IntentPlanSourceShape };
  request?: { goal?: string; kind?: string };
  normalizationTrace: {
    method: IntentPlanNormalizationMethod;
    invokedSemanticNormalization: boolean;
    rationale: string;
    model?: string;
    provider?: string;
    provenance: IntentPlanNormalizationProvenance;
    warnings: string[];
  };
  normalizedPhases: IntentPlanPhaseDraft[];
  findings: IntentPlanActionabilityFinding[];
  elicitationQuestions: IntentPlanElicitationQuestion[];
  revisionPrompt: { prompt: string; targetAudience: "operator-or-llm"; requiredChanges: string[] };
  evidenceGates: IntentPlanEvidenceGate[];
  summary: {
    totalPhases: number;
    actionablePhases: number;
    blockedPhases: number;
    questions: number;
    findings: number;
  };
  boundaries: {
    executedCommands: boolean;
    wroteSourceFiles: boolean;
    createdPreparedIntentPlan: boolean;
    createdWorkOrder: boolean;
    createdVerificationPlan: boolean;
    ranCirce: boolean;
    implementedIntentGo: boolean;
  };
  // Optional answer / merge trace (slice 134). Present only on answered revisions.
  answerTrace?: IntentPlanMergeTrace;
};

const INTENT_PLAN_ACTIONABILITY_STATUSES = new Set<string>(["actionable", "needs-revision", "blocked"]);
const INTENT_PLAN_SOURCE_SHAPES = new Set<string>(["structured-plan", "semi-structured", "brain-dump"]);
const INTENT_PLAN_NORMALIZATION_METHODS = new Set<string>(["deterministic", "semantic-llm", "deterministic-fallback"]);
const INTENT_PLAN_NORMALIZATION_PROVENANCES = new Set<string>(["source-only", "semantic-llm"]);
const INTENT_PLAN_ACTIONABILITY_REQUIREMENTS = new Set<string>([
  "objective",
  "deliverables",
  "acceptance-criteria",
  "implementation-scope",
  "verification-evidence",
  "ambiguity-clearance",
  "phase-contract",
  "evidence-gates",
]);
const INTENT_PLAN_ACTIONABILITY_SEVERITIES = new Set<string>(["low", "medium", "high", "critical"]);
const INTENT_PLAN_PHASE_DRAFT_KINDS = new Set<string>(["investigate", "modify", "refactor", "verify", "review", "unknown"]);
const INTENT_PLAN_PHASE_ACTIONABILITY_STATUSES = new Set<string>(["actionable", "needs-revision", "blocked"]);
const INTENT_PLAN_ELICITATION_ANSWER_SHAPES = new Set<string>(["sentence", "bullets", "paths", "command-or-artifact"]);
const INTENT_PLAN_ELICITATION_PRIORITIES = new Set<string>(["critical", "high", "medium"]);

function intentPlanStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string") {
      const trimmed = entry.trim();
      if (trimmed.length > 0) out.push(trimmed);
    }
  }
  return out;
}

function intentPlanRequirementList(value: unknown): IntentPlanActionabilityRequirement[] {
  if (!Array.isArray(value)) return [];
  const out: IntentPlanActionabilityRequirement[] = [];
  for (const entry of value) {
    if (typeof entry === "string" && INTENT_PLAN_ACTIONABILITY_REQUIREMENTS.has(entry) && !out.includes(entry as IntentPlanActionabilityRequirement)) {
      out.push(entry as IntentPlanActionabilityRequirement);
    }
  }
  return out;
}

function normalizeIntentPlanPhaseDraft(value: unknown, index: number): IntentPlanPhaseDraft {
  const raw = isRecord(value) ? value : {};
  const kind = typeof raw.kind === "string" && INTENT_PLAN_PHASE_DRAFT_KINDS.has(raw.kind) ? (raw.kind as IntentPlanPhaseDraftKind) : "unknown";
  const evidence: IntentPlanPhaseSourceEvidence[] = Array.isArray(raw.sourceEvidence)
    ? raw.sourceEvidence
        .filter(isRecord)
        .map((e) => {
          const out: IntentPlanPhaseSourceEvidence = { excerpt: typeof e.excerpt === "string" ? e.excerpt : "" };
          if (typeof e.lineStart === "number" && Number.isInteger(e.lineStart) && e.lineStart >= 0) out.lineStart = e.lineStart;
          if (typeof e.lineEnd === "number" && Number.isInteger(e.lineEnd) && e.lineEnd >= 0) out.lineEnd = e.lineEnd;
          return out;
        })
        .filter((e) => e.excerpt.length > 0)
    : [];
  const act = isRecord(raw.actionability) ? raw.actionability : {};
  const status = typeof act.status === "string" && INTENT_PLAN_PHASE_ACTIONABILITY_STATUSES.has(act.status) ? (act.status as IntentPlanPhaseActionabilityStatus) : "blocked";
  return {
    id: typeof raw.id === "string" && raw.id.length > 0 ? raw.id : `phase-${index + 1}`,
    order: typeof raw.order === "number" && Number.isInteger(raw.order) ? raw.order : index + 1,
    title: typeof raw.title === "string" ? raw.title : "",
    kind,
    objective: typeof raw.objective === "string" ? raw.objective : "",
    deliverables: intentPlanStringList(raw.deliverables),
    acceptanceCriteria: intentPlanStringList(raw.acceptanceCriteria),
    touchedPaths: intentPlanStringList(raw.touchedPaths),
    verificationCommands: intentPlanStringList(raw.verificationCommands),
    evidenceArtifacts: intentPlanStringList(raw.evidenceArtifacts),
    constraints: intentPlanStringList(raw.constraints),
    sourceEvidence: evidence,
    actionability: {
      status,
      satisfiedRequirements: intentPlanRequirementList(act.satisfiedRequirements),
      missingRequirements: intentPlanRequirementList(act.missingRequirements),
    },
  };
}

function normalizeIntentPlanFinding(value: unknown, index: number): IntentPlanActionabilityFinding {
  const raw = isRecord(value) ? value : {};
  const out: IntentPlanActionabilityFinding = {
    id: typeof raw.id === "string" && raw.id.length > 0 ? raw.id : `finding-${index + 1}`,
    severity: typeof raw.severity === "string" && INTENT_PLAN_ACTIONABILITY_SEVERITIES.has(raw.severity) ? (raw.severity as IntentPlanActionabilitySeverity) : "medium",
    requirement: typeof raw.requirement === "string" && INTENT_PLAN_ACTIONABILITY_REQUIREMENTS.has(raw.requirement) ? (raw.requirement as IntentPlanActionabilityRequirement) : "objective",
    message: typeof raw.message === "string" ? raw.message : "",
    sourceEvidence: intentPlanStringList(raw.sourceEvidence),
    suggestedFix: typeof raw.suggestedFix === "string" ? raw.suggestedFix : "",
  };
  if (typeof raw.phaseId === "string" && raw.phaseId.length > 0) out.phaseId = raw.phaseId;
  return out;
}

function normalizeIntentPlanQuestion(value: unknown, index: number): IntentPlanElicitationQuestion {
  const raw = isRecord(value) ? value : {};
  const out: IntentPlanElicitationQuestion = {
    id: typeof raw.id === "string" && raw.id.length > 0 ? raw.id : `question-${index + 1}`,
    requirement: typeof raw.requirement === "string" && INTENT_PLAN_ACTIONABILITY_REQUIREMENTS.has(raw.requirement) ? (raw.requirement as IntentPlanActionabilityRequirement) : "objective",
    question: typeof raw.question === "string" ? raw.question : "",
    answerShape: typeof raw.answerShape === "string" && INTENT_PLAN_ELICITATION_ANSWER_SHAPES.has(raw.answerShape) ? (raw.answerShape as IntentPlanElicitationAnswerShape) : "sentence",
    whyAsked: typeof raw.whyAsked === "string" ? raw.whyAsked : "",
    priority: typeof raw.priority === "string" && INTENT_PLAN_ELICITATION_PRIORITIES.has(raw.priority) ? (raw.priority as IntentPlanElicitationPriority) : "medium",
  };
  if (typeof raw.phaseId === "string" && raw.phaseId.length > 0) out.phaseId = raw.phaseId;
  return out;
}

function normalizeIntentPlanEvidenceGate(value: unknown, index: number): IntentPlanEvidenceGate {
  const raw = isRecord(value) ? value : {};
  const out: IntentPlanEvidenceGate = {
    id: typeof raw.id === "string" && raw.id.length > 0 ? raw.id : `evidence-gate-${index + 1}`,
    description: typeof raw.description === "string" ? raw.description : "",
    satisfied: raw.satisfied === true,
    evidence: intentPlanStringList(raw.evidence),
  };
  if (typeof raw.phaseId === "string" && raw.phaseId.length > 0) out.phaseId = raw.phaseId;
  return out;
}

export function createIntentPlanActionabilityReport(input: IntentPlanActionabilityReport): IntentPlanActionabilityReport {
  const rawStatus = isRecord(input.status) ? input.status : ({} as IntentPlanActionabilityReport["status"]);
  const rawSource = isRecord(input.sourcePlan) ? input.sourcePlan : ({} as IntentPlanActionabilityReport["sourcePlan"]);
  const rawTrace = isRecord(input.normalizationTrace) ? input.normalizationTrace : ({} as IntentPlanActionabilityReport["normalizationTrace"]);
  const rawRevision = isRecord(input.revisionPrompt) ? input.revisionPrompt : ({} as IntentPlanActionabilityReport["revisionPrompt"]);
  const rawSummary = isRecord(input.summary) ? input.summary : ({} as IntentPlanActionabilityReport["summary"]);

  const phases = Array.isArray(input.normalizedPhases) ? input.normalizedPhases.map((p, i) => normalizeIntentPlanPhaseDraft(p, i)) : [];
  const findings = Array.isArray(input.findings) ? input.findings.map((f, i) => normalizeIntentPlanFinding(f, i)) : [];
  const questions = Array.isArray(input.elicitationQuestions) ? input.elicitationQuestions.map((q, i) => normalizeIntentPlanQuestion(q, i)) : [];
  const evidenceGates = Array.isArray(input.evidenceGates) ? input.evidenceGates.map((g, i) => normalizeIntentPlanEvidenceGate(g, i)) : [];

  const sourcePlan: IntentPlanActionabilityReport["sourcePlan"] = {
    sourceShape: typeof rawSource.sourceShape === "string" && INTENT_PLAN_SOURCE_SHAPES.has(rawSource.sourceShape) ? (rawSource.sourceShape as IntentPlanSourceShape) : "brain-dump",
  };
  if (typeof rawSource.path === "string" && rawSource.path.length > 0) sourcePlan.path = rawSource.path;
  if (typeof rawSource.sha256 === "string" && rawSource.sha256.length > 0) sourcePlan.sha256 = rawSource.sha256;
  if (typeof rawSource.lineCount === "number" && Number.isInteger(rawSource.lineCount) && rawSource.lineCount >= 0) sourcePlan.lineCount = rawSource.lineCount;

  const normalizationTrace: IntentPlanActionabilityReport["normalizationTrace"] = {
    method: typeof rawTrace.method === "string" && INTENT_PLAN_NORMALIZATION_METHODS.has(rawTrace.method) ? (rawTrace.method as IntentPlanNormalizationMethod) : "deterministic",
    invokedSemanticNormalization: rawTrace.invokedSemanticNormalization === true,
    rationale: typeof rawTrace.rationale === "string" ? rawTrace.rationale : "",
    provenance: typeof rawTrace.provenance === "string" && INTENT_PLAN_NORMALIZATION_PROVENANCES.has(rawTrace.provenance) ? (rawTrace.provenance as IntentPlanNormalizationProvenance) : "source-only",
    warnings: intentPlanStringList(rawTrace.warnings),
  };
  if (typeof rawTrace.model === "string" && rawTrace.model.length > 0) normalizationTrace.model = rawTrace.model;
  if (typeof rawTrace.provider === "string" && rawTrace.provider.length > 0) normalizationTrace.provider = rawTrace.provider;

  const report: IntentPlanActionabilityReport = {
    header: input.header,
    status: {
      value: typeof rawStatus.value === "string" && INTENT_PLAN_ACTIONABILITY_STATUSES.has(rawStatus.value) ? (rawStatus.value as IntentPlanActionabilityStatus) : "blocked",
      reason: typeof rawStatus.reason === "string" ? rawStatus.reason : "",
    },
    sourcePlan,
    normalizationTrace,
    normalizedPhases: phases,
    findings,
    elicitationQuestions: questions,
    revisionPrompt: {
      prompt: typeof rawRevision.prompt === "string" ? rawRevision.prompt : "",
      targetAudience: "operator-or-llm",
      requiredChanges: intentPlanStringList(rawRevision.requiredChanges),
    },
    evidenceGates,
    summary: {
      totalPhases: typeof rawSummary.totalPhases === "number" && Number.isInteger(rawSummary.totalPhases) && rawSummary.totalPhases >= 0 ? rawSummary.totalPhases : phases.length,
      actionablePhases: typeof rawSummary.actionablePhases === "number" && Number.isInteger(rawSummary.actionablePhases) && rawSummary.actionablePhases >= 0 ? rawSummary.actionablePhases : phases.filter((p) => p.actionability.status === "actionable").length,
      blockedPhases: typeof rawSummary.blockedPhases === "number" && Number.isInteger(rawSummary.blockedPhases) && rawSummary.blockedPhases >= 0 ? rawSummary.blockedPhases : phases.filter((p) => p.actionability.status === "blocked").length,
      questions: typeof rawSummary.questions === "number" && Number.isInteger(rawSummary.questions) && rawSummary.questions >= 0 ? rawSummary.questions : questions.length,
      findings: typeof rawSummary.findings === "number" && Number.isInteger(rawSummary.findings) && rawSummary.findings >= 0 ? rawSummary.findings : findings.length,
    },
    boundaries: {
      executedCommands: false,
      wroteSourceFiles: false,
      createdPreparedIntentPlan: false,
      createdWorkOrder: false,
      createdVerificationPlan: false,
      ranCirce: false,
      implementedIntentGo: false,
    },
  };

  if (isRecord(input.request)) {
    const rawRequest = input.request as { goal?: unknown; kind?: unknown };
    const request: { goal?: string; kind?: string } = {};
    if (typeof rawRequest.goal === "string" && rawRequest.goal.length > 0) request.goal = rawRequest.goal;
    if (typeof rawRequest.kind === "string" && rawRequest.kind.length > 0) request.kind = rawRequest.kind;
    if (Object.keys(request).length > 0) report.request = request;
  }

  // Optional answer / merge trace (slice 134). Additive: only attached when the
  // caller supplies it. Existing reports omit it and still validate.
  if (isRecord(input.answerTrace)) {
    const rawAnswerTrace = input.answerTrace as {
      sourceReportRef?: unknown;
      answers?: unknown;
      appliedRequirements?: unknown;
      unappliedAnswers?: unknown;
    };
    const rawRef = isRecord(rawAnswerTrace.sourceReportRef) ? rawAnswerTrace.sourceReportRef : {};
    const sourceReportRef: ArtifactRef = {
      type: typeof rawRef.type === "string" && rawRef.type.length > 0 ? rawRef.type : "IntentPlanActionabilityReport",
      id: typeof rawRef.id === "string" ? rawRef.id : "",
      schemaVersion: typeof rawRef.schemaVersion === "string" && rawRef.schemaVersion.length > 0 ? rawRef.schemaVersion : "0.1.0",
    };
    if (typeof rawRef.path === "string" && rawRef.path.length > 0) sourceReportRef.path = rawRef.path;
    if (typeof rawRef.digest === "string" && rawRef.digest.length > 0) sourceReportRef.digest = rawRef.digest;
    const answers: IntentPlanAnswer[] = Array.isArray(rawAnswerTrace.answers)
      ? rawAnswerTrace.answers.flatMap((a) => {
          if (!isRecord(a)) return [];
          const out: IntentPlanAnswer = {
            questionId: typeof a.questionId === "string" ? a.questionId : "",
            answer: typeof a.answer === "string" ? a.answer : "",
            answeredAt: typeof a.answeredAt === "string" ? a.answeredAt : "",
          };
          if (typeof a.answeredBy === "string" && a.answeredBy.length > 0) out.answeredBy = a.answeredBy;
          return [out];
        })
      : [];
    const unappliedAnswers: IntentPlanUnappliedAnswer[] = Array.isArray(rawAnswerTrace.unappliedAnswers)
      ? rawAnswerTrace.unappliedAnswers.flatMap((u) => {
          if (!isRecord(u)) return [];
          return [
            {
              questionId: typeof u.questionId === "string" ? u.questionId : "",
              reason: typeof u.reason === "string" ? u.reason : "",
            },
          ];
        })
      : [];
    report.answerTrace = {
      sourceReportRef,
      answers,
      appliedRequirements: intentPlanRequirementList(rawAnswerTrace.appliedRequirements),
      unappliedAnswers,
      method: "deterministic",
    };
  }

  return assertIntentPlanActionabilityReport(report);
}

function validateIntentPlanPhaseDraftList(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array." });
    return;
  }
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    const p = `${path}[${index}]`;
    if (!isRecord(entry)) {
      issues.push({ path: p, message: "Expected an object." });
      return;
    }
    if (typeof entry.id !== "string" || entry.id.length === 0) issues.push({ path: `${p}.id`, message: "Expected a non-empty string." });
    else if (seen.has(entry.id)) issues.push({ path: `${p}.id`, message: `Duplicate phase id ${entry.id}.` });
    else seen.add(entry.id);
    if (typeof entry.order !== "number" || !Number.isInteger(entry.order)) issues.push({ path: `${p}.order`, message: "Expected an integer." });
    if (typeof entry.title !== "string") issues.push({ path: `${p}.title`, message: "Expected a string." });
    if (typeof entry.kind !== "string" || !INTENT_PLAN_PHASE_DRAFT_KINDS.has(entry.kind)) issues.push({ path: `${p}.kind`, message: "Expected a valid phase kind." });
    if (typeof entry.objective !== "string") issues.push({ path: `${p}.objective`, message: "Expected a string." });
    for (const key of ["deliverables", "acceptanceCriteria", "touchedPaths", "verificationCommands", "evidenceArtifacts", "constraints"]) {
      if (!Array.isArray(entry[key])) issues.push({ path: `${p}.${key}`, message: "Expected an array." });
    }
    if (!Array.isArray(entry.sourceEvidence)) issues.push({ path: `${p}.sourceEvidence`, message: "Expected an array." });
    if (!isRecord(entry.actionability)) {
      issues.push({ path: `${p}.actionability`, message: "Expected an object." });
    } else {
      const a = entry.actionability as Record<string, unknown>;
      if (typeof a.status !== "string" || !INTENT_PLAN_PHASE_ACTIONABILITY_STATUSES.has(a.status)) issues.push({ path: `${p}.actionability.status`, message: "Expected a valid status." });
      if (!Array.isArray(a.satisfiedRequirements)) issues.push({ path: `${p}.actionability.satisfiedRequirements`, message: "Expected an array." });
      if (!Array.isArray(a.missingRequirements)) issues.push({ path: `${p}.actionability.missingRequirements`, message: "Expected an array." });
    }
  });
}

export function validateIntentPlanActionabilityReport(value: unknown): ValidationResult<IntentPlanActionabilityReport> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  validateModelHeader(value.header, "IntentPlanActionabilityReport", "$.header", issues);

  if (!isRecord(value.status)) {
    issues.push({ path: "$.status", message: "Expected an object." });
  } else {
    const s = value.status as Record<string, unknown>;
    if (typeof s.value !== "string" || !INTENT_PLAN_ACTIONABILITY_STATUSES.has(s.value)) issues.push({ path: "$.status.value", message: "Expected one of actionable, needs-revision, blocked." });
    if (typeof s.reason !== "string") issues.push({ path: "$.status.reason", message: "Expected a string." });
  }

  if (!isRecord(value.sourcePlan)) {
    issues.push({ path: "$.sourcePlan", message: "Expected an object." });
  } else {
    const sp = value.sourcePlan as Record<string, unknown>;
    if (typeof sp.sourceShape !== "string" || !INTENT_PLAN_SOURCE_SHAPES.has(sp.sourceShape)) issues.push({ path: "$.sourcePlan.sourceShape", message: "Expected a valid source shape." });
    if (sp.path !== undefined && typeof sp.path !== "string") issues.push({ path: "$.sourcePlan.path", message: "Expected a string." });
    if (sp.sha256 !== undefined && typeof sp.sha256 !== "string") issues.push({ path: "$.sourcePlan.sha256", message: "Expected a string." });
    if (sp.lineCount !== undefined && (typeof sp.lineCount !== "number" || !Number.isInteger(sp.lineCount) || sp.lineCount < 0)) issues.push({ path: "$.sourcePlan.lineCount", message: "Expected a non-negative integer." });
  }

  if (value.request !== undefined && !isRecord(value.request)) issues.push({ path: "$.request", message: "Expected an object." });

  if (!isRecord(value.normalizationTrace)) {
    issues.push({ path: "$.normalizationTrace", message: "Expected an object." });
  } else {
    const t = value.normalizationTrace as Record<string, unknown>;
    if (typeof t.method !== "string" || !INTENT_PLAN_NORMALIZATION_METHODS.has(t.method)) issues.push({ path: "$.normalizationTrace.method", message: "Expected a valid method." });
    if (typeof t.invokedSemanticNormalization !== "boolean") issues.push({ path: "$.normalizationTrace.invokedSemanticNormalization", message: "Expected a boolean." });
    if (typeof t.rationale !== "string") issues.push({ path: "$.normalizationTrace.rationale", message: "Expected a string." });
    if (typeof t.provenance !== "string" || !INTENT_PLAN_NORMALIZATION_PROVENANCES.has(t.provenance)) issues.push({ path: "$.normalizationTrace.provenance", message: "Expected a valid provenance." });
    if (!Array.isArray(t.warnings)) issues.push({ path: "$.normalizationTrace.warnings", message: "Expected an array." });
  }

  validateIntentPlanPhaseDraftList(value.normalizedPhases, "$.normalizedPhases", issues);

  if (!Array.isArray(value.findings)) {
    issues.push({ path: "$.findings", message: "Expected an array." });
  } else {
    (value.findings as unknown[]).forEach((entry, index) => {
      const p = `$.findings[${index}]`;
      if (!isRecord(entry)) { issues.push({ path: p, message: "Expected an object." }); return; }
      if (typeof entry.id !== "string" || entry.id.length === 0) issues.push({ path: `${p}.id`, message: "Expected a non-empty string." });
      if (typeof entry.severity !== "string" || !INTENT_PLAN_ACTIONABILITY_SEVERITIES.has(entry.severity)) issues.push({ path: `${p}.severity`, message: "Expected a valid severity." });
      if (typeof entry.requirement !== "string" || !INTENT_PLAN_ACTIONABILITY_REQUIREMENTS.has(entry.requirement)) issues.push({ path: `${p}.requirement`, message: "Expected a valid requirement." });
      if (typeof entry.message !== "string") issues.push({ path: `${p}.message`, message: "Expected a string." });
      if (!Array.isArray(entry.sourceEvidence)) issues.push({ path: `${p}.sourceEvidence`, message: "Expected an array." });
      if (typeof entry.suggestedFix !== "string") issues.push({ path: `${p}.suggestedFix`, message: "Expected a string." });
    });
  }

  if (!Array.isArray(value.elicitationQuestions)) {
    issues.push({ path: "$.elicitationQuestions", message: "Expected an array." });
  } else {
    (value.elicitationQuestions as unknown[]).forEach((entry, index) => {
      const p = `$.elicitationQuestions[${index}]`;
      if (!isRecord(entry)) { issues.push({ path: p, message: "Expected an object." }); return; }
      if (typeof entry.id !== "string" || entry.id.length === 0) issues.push({ path: `${p}.id`, message: "Expected a non-empty string." });
      if (typeof entry.requirement !== "string" || !INTENT_PLAN_ACTIONABILITY_REQUIREMENTS.has(entry.requirement)) issues.push({ path: `${p}.requirement`, message: "Expected a valid requirement." });
      if (typeof entry.question !== "string") issues.push({ path: `${p}.question`, message: "Expected a string." });
      if (typeof entry.answerShape !== "string" || !INTENT_PLAN_ELICITATION_ANSWER_SHAPES.has(entry.answerShape)) issues.push({ path: `${p}.answerShape`, message: "Expected a valid answer shape." });
      if (typeof entry.priority !== "string" || !INTENT_PLAN_ELICITATION_PRIORITIES.has(entry.priority)) issues.push({ path: `${p}.priority`, message: "Expected a valid priority." });
    });
  }

  if (!isRecord(value.revisionPrompt)) {
    issues.push({ path: "$.revisionPrompt", message: "Expected an object." });
  } else {
    const r = value.revisionPrompt as Record<string, unknown>;
    if (typeof r.prompt !== "string") issues.push({ path: "$.revisionPrompt.prompt", message: "Expected a string." });
    if (r.targetAudience !== "operator-or-llm") issues.push({ path: "$.revisionPrompt.targetAudience", message: "Expected operator-or-llm." });
    if (!Array.isArray(r.requiredChanges)) issues.push({ path: "$.revisionPrompt.requiredChanges", message: "Expected an array." });
  }

  if (!Array.isArray(value.evidenceGates)) {
    issues.push({ path: "$.evidenceGates", message: "Expected an array." });
  } else {
    (value.evidenceGates as unknown[]).forEach((entry, index) => {
      const p = `$.evidenceGates[${index}]`;
      if (!isRecord(entry)) { issues.push({ path: p, message: "Expected an object." }); return; }
      if (typeof entry.id !== "string" || entry.id.length === 0) issues.push({ path: `${p}.id`, message: "Expected a non-empty string." });
      if (typeof entry.description !== "string") issues.push({ path: `${p}.description`, message: "Expected a string." });
      if (typeof entry.satisfied !== "boolean") issues.push({ path: `${p}.satisfied`, message: "Expected a boolean." });
      if (!Array.isArray(entry.evidence)) issues.push({ path: `${p}.evidence`, message: "Expected an array." });
    });
  }

  if (!isRecord(value.summary)) {
    issues.push({ path: "$.summary", message: "Expected an object." });
  } else {
    const sm = value.summary as Record<string, unknown>;
    for (const key of ["totalPhases", "actionablePhases", "blockedPhases", "questions", "findings"]) {
      const x = sm[key];
      if (typeof x !== "number" || !Number.isInteger(x) || x < 0) issues.push({ path: `$.summary.${key}`, message: "Expected a non-negative integer." });
    }
  }

  if (!isRecord(value.boundaries)) {
    issues.push({ path: "$.boundaries", message: "Expected an object." });
  } else {
    const b = value.boundaries as Record<string, unknown>;
    for (const key of ["executedCommands", "wroteSourceFiles", "createdPreparedIntentPlan", "createdWorkOrder", "createdVerificationPlan", "ranCirce", "implementedIntentGo"]) {
      if (b[key] !== false) issues.push({ path: `$.boundaries.${key}`, message: "Expected false." });
    }
  }

  // answerTrace is optional and additive (slice 134). Reports without it are valid.
  if (value.answerTrace !== undefined) {
    if (!isRecord(value.answerTrace)) {
      issues.push({ path: "$.answerTrace", message: "Expected an object." });
    } else {
      const at = value.answerTrace as Record<string, unknown>;
      if (at.method !== "deterministic") issues.push({ path: "$.answerTrace.method", message: 'Expected "deterministic".' });
      if (!isRecord(at.sourceReportRef)) {
        issues.push({ path: "$.answerTrace.sourceReportRef", message: "Expected an object." });
      } else {
        const ref = at.sourceReportRef as Record<string, unknown>;
        if (typeof ref.type !== "string" || ref.type.length === 0) issues.push({ path: "$.answerTrace.sourceReportRef.type", message: "Expected a non-empty string." });
        if (typeof ref.id !== "string" || ref.id.length === 0) issues.push({ path: "$.answerTrace.sourceReportRef.id", message: "Expected a non-empty string." });
        if (typeof ref.schemaVersion !== "string" || ref.schemaVersion.length === 0) issues.push({ path: "$.answerTrace.sourceReportRef.schemaVersion", message: "Expected a non-empty string." });
      }
      if (!Array.isArray(at.answers)) {
        issues.push({ path: "$.answerTrace.answers", message: "Expected an array." });
      } else {
        (at.answers as unknown[]).forEach((entry, index) => {
          const p = `$.answerTrace.answers[${index}]`;
          if (!isRecord(entry)) { issues.push({ path: p, message: "Expected an object." }); return; }
          if (typeof entry.questionId !== "string" || entry.questionId.length === 0) issues.push({ path: `${p}.questionId`, message: "Expected a non-empty string." });
          if (typeof entry.answer !== "string" || entry.answer.length === 0) issues.push({ path: `${p}.answer`, message: "Expected a non-empty string." });
          if (typeof entry.answeredAt !== "string" || entry.answeredAt.length === 0) issues.push({ path: `${p}.answeredAt`, message: "Expected a non-empty string." });
          if (entry.answeredBy !== undefined && typeof entry.answeredBy !== "string") issues.push({ path: `${p}.answeredBy`, message: "Expected a string." });
        });
      }
      if (!Array.isArray(at.appliedRequirements)) {
        issues.push({ path: "$.answerTrace.appliedRequirements", message: "Expected an array." });
      } else {
        (at.appliedRequirements as unknown[]).forEach((entry, index) => {
          if (typeof entry !== "string" || !INTENT_PLAN_ACTIONABILITY_REQUIREMENTS.has(entry)) {
            issues.push({ path: `$.answerTrace.appliedRequirements[${index}]`, message: "Expected an actionability requirement." });
          }
        });
      }
      if (!Array.isArray(at.unappliedAnswers)) {
        issues.push({ path: "$.answerTrace.unappliedAnswers", message: "Expected an array." });
      } else {
        (at.unappliedAnswers as unknown[]).forEach((entry, index) => {
          const p = `$.answerTrace.unappliedAnswers[${index}]`;
          if (!isRecord(entry)) { issues.push({ path: p, message: "Expected an object." }); return; }
          if (typeof entry.questionId !== "string" || entry.questionId.length === 0) issues.push({ path: `${p}.questionId`, message: "Expected a non-empty string." });
          if (typeof entry.reason !== "string" || entry.reason.length === 0) issues.push({ path: `${p}.reason`, message: "Expected a non-empty string." });
        });
      }
    }
  }

  return validationResult(value as IntentPlanActionabilityReport, issues);
}

export function assertIntentPlanActionabilityReport(value: unknown): IntentPlanActionabilityReport {
  return assertValid(validateIntentPlanActionabilityReport(value), "IntentPlanActionabilityReport");
}

export const intentPlanActionabilityReportSchema: ArtifactSchema<IntentPlanActionabilityReport> = {
  validate: validateIntentPlanActionabilityReport,
  parse: assertIntentPlanActionabilityReport,
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
