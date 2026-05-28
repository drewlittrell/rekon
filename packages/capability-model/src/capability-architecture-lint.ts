// CapabilityArchitectureLintReport v1 builder.
//
// Reads a published `CapabilityContract` policy artifact
// and a published `CapabilityMap` v2 projection and emits
// an evaluation artifact (`CapabilityArchitectureLintReport`)
// recording whether each configured contract row's
// placement policy holds against the matched phrase-backed
// capability.
//
// v1 scope:
//   - allowedLayers / forbiddenLayers
//   - allowedSystems / forbiddenSystems
//
// Deferred to later slices:
//   - requiredChecks (no execution; v1 leaves these alone)
//   - requiredNeighbors / forbiddenNeighbors
//   - preservationRules
//
// **Boundary.** This helper is evaluation, not enforcement.
// It does **not** write `FindingReport`, `FindingFilterReport`,
// `FindingLifecycleReport`, or `CoherencyDelta`. It does
// **not** add resolver routing, verification planning, or
// source writes. The `findingCandidate` field on
// `violation` rows is a preview payload only — a future
// explicit bridge slice may promote selected rows through
// the finding lifecycle, but no bridge ships in v1.
//
// **Inputs are read-only.** `CapabilityContract` and
// `CapabilityMap` are never mutated. No source files are
// read. No network.

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type CapabilityArchitectureLintConfidence,
  type CapabilityArchitectureLintFindingCandidate,
  type CapabilityArchitectureLintReport,
  type CapabilityArchitectureLintRow,
  type CapabilityArchitectureLintRule,
  type CapabilityArchitectureLintSeverity,
  type CapabilityArchitectureLintStatus,
  type CapabilityContract,
  type CapabilityContractEntry,
  type CapabilityMap,
  type CapabilityMapPhraseBackedCapability,
  createCapabilityArchitectureLintReport,
} from "@rekon/kernel-repo-model";

export type BuildCapabilityArchitectureLintReportInput = {
  capabilityContract: CapabilityContract;
  capabilityContractRef: ArtifactRef;
  capabilityMap: CapabilityMap;
  capabilityMapRef: ArtifactRef;
  /** ISO timestamp used in the artifact header. Defaults
   *  to `new Date().toISOString()` so producers without a
   *  freeze-frame clock still emit valid artifacts. */
  generatedAt?: string;
};

/** Suggested finding category for v1 violations. Surfaced
 *  on the `findingCandidate` preview payload only. v1
 *  never writes `FindingReport`. */
export const CAPABILITY_ARCHITECTURE_LINT_FINDING_CATEGORY
  = "capability_architecture_policy";

/** Stable header `artifactId` prefix so the artifact has
 *  a deterministic prefix even though the timestamp piece
 *  varies. */
export const CAPABILITY_ARCHITECTURE_LINT_ARTIFACT_ID_PREFIX
  = "capability-architecture-lint-";

/**
 * Build a `CapabilityArchitectureLintReport` from a
 * configured `CapabilityContract` and the currently
 * projected `CapabilityMap` v2.
 *
 * Evaluation rules:
 * - Only contract rows with `status === "configured"` are
 *   evaluated. Unmatched rows are surfaced only when an
 *   evaluator wants context; v1 skips them entirely so
 *   the report stays focused on actionable policy.
 * - For each configured row, the helper looks up the
 *   matched phrase-backed capability by
 *   `capabilityRef.phraseCapabilityId`. If the
 *   phrase-backed capability is missing, the helper emits
 *   one `not-evaluated` row per declared placement rule
 *   (low confidence).
 * - For populated `allowedLayers` / `forbiddenLayers`
 *   rules:
 *     - if the phrase-backed capability has no `layer`,
 *       emit `not-evaluated`;
 *     - otherwise compare and emit `pass` or `violation`.
 * - For populated `allowedSystems` / `forbiddenSystems`
 *   rules:
 *     - `CapabilityMap` v2 phrase-backed capabilities do
 *       not yet expose a deterministic `system` field.
 *       v1 emits `not-evaluated` for system rules with a
 *       diagnostic message.
 *
 * Returns an artifact with deterministic ordering, valid
 * summary counts, and stable byte-identical output for
 * identical input.
 */
export function buildCapabilityArchitectureLintReport(
  input: BuildCapabilityArchitectureLintReportInput,
): CapabilityArchitectureLintReport {
  const {
    capabilityContract,
    capabilityContractRef,
    capabilityMap,
    capabilityMapRef,
    generatedAt,
  } = input;

  const phraseBacked = new Map<string, CapabilityMapPhraseBackedCapability>();
  for (const entry of capabilityMap.phraseBackedCapabilities ?? []) {
    phraseBacked.set(entry.id, entry);
  }

  const rows: CapabilityArchitectureLintRow[] = [];
  for (const contractEntry of capabilityContract.contracts) {
    // v1 only evaluates `configured` rows. `unmatched`
    // rows surface drift in the contract generator, not
    // architecture policy violations.
    if (contractEntry.status !== "configured") continue;

    const phraseCapabilityId
      = contractEntry.capabilityRef?.phraseCapabilityId ?? "";
    const phraseBackedEntry
      = phraseCapabilityId.length > 0
        ? phraseBacked.get(phraseCapabilityId)
        : undefined;

    evaluateLayerRule({
      contractEntry,
      phraseBackedEntry,
      phraseCapabilityId,
      capabilityMapRef,
      kind: "allowed",
      out: rows,
    });
    evaluateLayerRule({
      contractEntry,
      phraseBackedEntry,
      phraseCapabilityId,
      capabilityMapRef,
      kind: "forbidden",
      out: rows,
    });
    evaluateSystemRule({
      contractEntry,
      phraseBackedEntry,
      phraseCapabilityId,
      capabilityMapRef,
      kind: "allowed",
      out: rows,
    });
    evaluateSystemRule({
      contractEntry,
      phraseBackedEntry,
      phraseCapabilityId,
      capabilityMapRef,
      kind: "forbidden",
      out: rows,
    });
  }

  const header: ArtifactHeader = {
    schemaVersion: "0.1.0",
    artifactType: "CapabilityArchitectureLintReport",
    artifactId:
      `${CAPABILITY_ARCHITECTURE_LINT_ARTIFACT_ID_PREFIX}${Date.now()}`,
    generatedAt: generatedAt ?? new Date().toISOString(),
    subject: capabilityContract.header.subject,
    producer: {
      id: "@rekon/capability-model",
      version: "0.1.0",
    },
    inputRefs: [capabilityContractRef, capabilityMapRef],
    freshness: { status: "fresh" },
    provenance: { confidence: 0.85 },
  };

  return createCapabilityArchitectureLintReport({
    header,
    source: {
      capabilityContractRef,
      capabilityMapRef,
    },
    // Summary is recomputed inside the factory; the
    // placeholder here exists only because the type
    // requires it. The factory replaces it.
    summary: {
      total: 0,
      violations: 0,
      passes: 0,
      notEvaluated: 0,
      byRule: {},
      bySeverity: {},
    },
    rows,
  });
}

function evaluateLayerRule(args: {
  contractEntry: CapabilityContractEntry;
  phraseBackedEntry: CapabilityMapPhraseBackedCapability | undefined;
  phraseCapabilityId: string;
  capabilityMapRef: ArtifactRef;
  kind: "allowed" | "forbidden";
  out: CapabilityArchitectureLintRow[];
}): void {
  const {
    contractEntry,
    phraseBackedEntry,
    phraseCapabilityId,
    capabilityMapRef,
    kind,
    out,
  } = args;
  const list
    = kind === "allowed"
      ? contractEntry.allowedLayers
      : contractEntry.forbiddenLayers;
  if (!list || list.length === 0) return;
  const rule: CapabilityArchitectureLintRule
    = kind === "allowed" ? "allowed-layer" : "forbidden-layer";
  const id = stableRowId(contractEntry.id, rule);

  if (!phraseBackedEntry) {
    out.push(
      notEvaluatedRow({
        id,
        contractId: contractEntry.id,
        phraseCapabilityId,
        rule,
        message:
          phraseCapabilityId.length === 0
            ? "Configured contract row has no capabilityRef.phraseCapabilityId; cannot evaluate placement policy."
            : `No phrase-backed CapabilityMap entry found for id ${phraseCapabilityId}; cannot evaluate placement policy.`,
        evidenceRefs: [capabilityMapRef],
      }),
    );
    return;
  }

  const layer = phraseBackedEntry.layer;
  if (typeof layer !== "string" || layer.length === 0) {
    out.push(
      notEvaluatedRow({
        id,
        contractId: contractEntry.id,
        phraseCapabilityId,
        rule,
        message:
          "Phrase-backed capability has no `layer` field; layer rule is not evaluated.",
        evidenceRefs: [capabilityMapRef],
      }),
    );
    return;
  }

  const inList = list.includes(layer);
  const isViolation = kind === "allowed" ? !inList : inList;
  if (isViolation) {
    const verb = contractEntry.match.verb;
    const noun = contractEntry.match.noun;
    const title
      = kind === "allowed"
        ? `Capability "${verb} ${noun}" placed on layer "${layer}" outside its allowedLayers.`
        : `Capability "${verb} ${noun}" placed on a forbidden layer "${layer}".`;
    const message
      = kind === "allowed"
        ? `Phrase-backed capability ${phraseCapabilityId} sits on layer ${layer}; allowedLayers permits [${list.join(", ")}].`
        : `Phrase-backed capability ${phraseCapabilityId} sits on layer ${layer}; forbiddenLayers disallows it.`;
    out.push(
      violationRow({
        id,
        contractId: contractEntry.id,
        phraseCapabilityId,
        rule,
        severity: "high",
        confidence: "high",
        message,
        evidenceRefs: [capabilityMapRef],
        findingCandidate: {
          title,
          category: CAPABILITY_ARCHITECTURE_LINT_FINDING_CATEGORY,
          severity: "high",
        },
      }),
    );
    return;
  }

  out.push(
    passRow({
      id,
      contractId: contractEntry.id,
      phraseCapabilityId,
      rule,
      message:
        kind === "allowed"
          ? `Phrase-backed capability ${phraseCapabilityId} on layer ${layer} satisfies allowedLayers.`
          : `Phrase-backed capability ${phraseCapabilityId} on layer ${layer} is outside forbiddenLayers.`,
      evidenceRefs: [capabilityMapRef],
    }),
  );
}

function evaluateSystemRule(args: {
  contractEntry: CapabilityContractEntry;
  phraseBackedEntry: CapabilityMapPhraseBackedCapability | undefined;
  phraseCapabilityId: string;
  capabilityMapRef: ArtifactRef;
  kind: "allowed" | "forbidden";
  out: CapabilityArchitectureLintRow[];
}): void {
  const {
    contractEntry,
    phraseBackedEntry,
    phraseCapabilityId,
    capabilityMapRef,
    kind,
    out,
  } = args;
  const list
    = kind === "allowed"
      ? contractEntry.allowedSystems
      : contractEntry.forbiddenSystems;
  if (!list || list.length === 0) return;
  const rule: CapabilityArchitectureLintRule
    = kind === "allowed" ? "allowed-system" : "forbidden-system";
  const id = stableRowId(contractEntry.id, rule);

  if (!phraseBackedEntry) {
    out.push(
      notEvaluatedRow({
        id,
        contractId: contractEntry.id,
        phraseCapabilityId,
        rule,
        message:
          phraseCapabilityId.length === 0
            ? "Configured contract row has no capabilityRef.phraseCapabilityId; cannot evaluate placement policy."
            : `No phrase-backed CapabilityMap entry found for id ${phraseCapabilityId}; cannot evaluate placement policy.`,
        evidenceRefs: [capabilityMapRef],
      }),
    );
    return;
  }

  // v1: CapabilityMap.phraseBackedCapabilities[] does not
  // yet carry a deterministic `system` field. System rules
  // are surfaced as `not-evaluated` until a phrase-backed
  // capability gains a stable system attribution.
  out.push(
    notEvaluatedRow({
      id,
      contractId: contractEntry.id,
      phraseCapabilityId,
      rule,
      message:
        "No deterministic system field is available on the phrase-backed capability; system rule is not evaluated.",
      evidenceRefs: [capabilityMapRef],
    }),
  );
}

function stableRowId(
  contractId: string,
  rule: CapabilityArchitectureLintRule,
): string {
  return `${contractId}:${rule}`;
}

function notEvaluatedRow(args: {
  id: string;
  contractId: string;
  phraseCapabilityId: string;
  rule: CapabilityArchitectureLintRule;
  message: string;
  evidenceRefs: ArtifactRef[];
}): CapabilityArchitectureLintRow {
  return buildRow({
    ...args,
    status: "not-evaluated",
    severity: "low",
    confidence: "low",
  });
}

function passRow(args: {
  id: string;
  contractId: string;
  phraseCapabilityId: string;
  rule: CapabilityArchitectureLintRule;
  message: string;
  evidenceRefs: ArtifactRef[];
}): CapabilityArchitectureLintRow {
  return buildRow({
    ...args,
    status: "pass",
    severity: "low",
    confidence: "high",
  });
}

function violationRow(args: {
  id: string;
  contractId: string;
  phraseCapabilityId: string;
  rule: CapabilityArchitectureLintRule;
  severity: CapabilityArchitectureLintSeverity;
  confidence: CapabilityArchitectureLintConfidence;
  message: string;
  evidenceRefs: ArtifactRef[];
  findingCandidate: CapabilityArchitectureLintFindingCandidate;
}): CapabilityArchitectureLintRow {
  return buildRow({
    id: args.id,
    contractId: args.contractId,
    phraseCapabilityId: args.phraseCapabilityId,
    rule: args.rule,
    status: "violation",
    severity: args.severity,
    confidence: args.confidence,
    message: args.message,
    evidenceRefs: args.evidenceRefs,
    findingCandidate: args.findingCandidate,
  });
}

function buildRow(args: {
  id: string;
  contractId: string;
  phraseCapabilityId: string;
  rule: CapabilityArchitectureLintRule;
  status: CapabilityArchitectureLintStatus;
  severity: CapabilityArchitectureLintSeverity;
  confidence: CapabilityArchitectureLintConfidence;
  message: string;
  evidenceRefs: ArtifactRef[];
  findingCandidate?: CapabilityArchitectureLintFindingCandidate;
}): CapabilityArchitectureLintRow {
  const row: CapabilityArchitectureLintRow = {
    id: args.id,
    contractId: args.contractId,
    phraseCapabilityId: args.phraseCapabilityId,
    rule: args.rule,
    status: args.status,
    severity: args.severity,
    confidence: args.confidence,
    message: args.message,
    evidenceRefs: args.evidenceRefs,
  };
  if (args.findingCandidate) {
    row.findingCandidate = args.findingCandidate;
  }
  return row;
}
