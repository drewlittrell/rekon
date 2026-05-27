// CapabilityContract v1 builder.
//
// Reads a published `CapabilityMap` v2 artifact and an
// optional `.rekon/capability-contracts.json` config and
// emits the effective `CapabilityContract` policy artifact.
//
// V1 emits two row statuses:
//   - `configured`: a config row matched a v2
//     phrase-backed capability. Carries placement,
//     neighbor, check, and preservation rules from the
//     config, plus a `capabilityRef` back into the source
//     `CapabilityMap` entry.
//   - `unmatched`: a config row did NOT match any v2
//     entry. No policy fields are carried; this row exists
//     purely to surface config drift to operators.
//
// V1 does NOT emit `suggested` rows. The suggestion /
// review workflow ships in a later slice; until then,
// every populated row started life in the operator's
// config file.
//
// Match semantics (conjunctive):
//   exact verb required, exact noun required;
//   `domain` / `pattern` / `layer` are only checked when
//   the config populates them, in which case the v2 entry
//   must agree.
// Most-specific match wins. Ties break by config order
// then id asc — deterministic across runs.
//
// **No source mutation. No config mutation. No artifact
// mutation upstream.** The helper is a pure function over
// JSON input.

import type { ArtifactRef, ArtifactHeader } from "@rekon/kernel-artifacts";
import {
  type CapabilityContract,
  type CapabilityContractEntry,
  type CapabilityContractNeighbor,
  type CapabilityMap,
  type CapabilityMapPhraseBackedCapability,
  createCapabilityContract,
} from "@rekon/kernel-repo-model";

/** Structural shape of `.rekon/capability-contracts.json`. */
export type CapabilityContractConfig = {
  version: string;
  contracts?: Array<{
    id?: unknown;
    match?: {
      verb?: unknown;
      noun?: unknown;
      domain?: unknown;
      pattern?: unknown;
      layer?: unknown;
    };
    allowedLayers?: unknown;
    forbiddenLayers?: unknown;
    allowedSystems?: unknown;
    forbiddenSystems?: unknown;
    requiredChecks?: unknown;
    requiredNeighbors?: unknown;
    forbiddenNeighbors?: unknown;
    preservationRules?: unknown;
    messages?: unknown;
  }>;
};

export type BuildCapabilityContractInput = {
  /** The published `CapabilityMap` v2 artifact. */
  capabilityMap: CapabilityMap;
  /** Artifact ref for the `CapabilityMap` above. Stamped
   *  into `source.capabilityMapRef`, every configured
   *  row's `capabilityRef.capabilityMapRef`, and into
   *  `header.inputRefs`. */
  capabilityMapRef: ArtifactRef;
  /** Optional parsed config. Absence is allowed and
   *  produces an empty `contracts` array. */
  config?: CapabilityContractConfig;
  /** Repo-relative path to the config file (when
   *  present). Stamped into `source.configPath`. */
  configPath?: string;
  /** Stable hash over the canonical JSON of the config
   *  (when present). Stamped into `source.configHash`. */
  configHash?: string;
  /** ISO timestamp for the artifact header. Defaults to
   *  `new Date().toISOString()`. Tests pin this. */
  generatedAt?: string;
  /** Subject for the artifact header. Defaults to the
   *  `capabilityMap.header.subject`. */
  subject?: ArtifactHeader["subject"];
  /** Optional `CapabilityPhraseReport` ref that produced
   *  the phrase-backed capabilities in `capabilityMap`.
   *  When supplied, stamped into `source.phraseReportRef`
   *  and `header.inputRefs`. */
  phraseReportRef?: ArtifactRef;
};

const PRODUCER_ID = "@rekon/capability-model";
const PRODUCER_VERSION = "0.1.0";
const SCHEMA_VERSION = "0.1.0";

export function buildCapabilityContract(
  input: BuildCapabilityContractInput,
): CapabilityContract {
  const {
    capabilityMap,
    capabilityMapRef,
    config,
    configPath,
    configHash,
    generatedAt,
    subject,
    phraseReportRef,
  } = input;

  const phraseBacked = Array.isArray(capabilityMap.phraseBackedCapabilities)
    ? capabilityMap.phraseBackedCapabilities
    : [];

  const configRows = Array.isArray(config?.contracts) ? config!.contracts : [];

  const entries: CapabilityContractEntry[] = [];
  const seenIds = new Set<string>();

  configRows.forEach((row, configIndex) => {
    if (!row || typeof row !== "object") return;

    const id = typeof row.id === "string" && row.id.length > 0 ? row.id : "";
    const verb = readString(row.match?.verb);
    const noun = readString(row.match?.noun);
    if (!id || !verb || !noun) {
      // Malformed config row. Skip silently so a single
      // bad entry doesn't poison the whole artifact;
      // operators see this via the `total` vs config
      // length delta surfaced by callers (CLI prints a
      // warning).
      return;
    }
    if (seenIds.has(id)) {
      // Duplicate id in config — defer to first
      // occurrence (config-order). Defensive only; the
      // config schema reserves the right to reject these.
      return;
    }
    seenIds.add(id);

    const domain = readOptionalString(row.match?.domain);
    const pattern = readOptionalString(row.match?.pattern);
    const layer = readOptionalString(row.match?.layer);

    const match = { verb, noun, domain, pattern, layer };
    const matched = pickMostSpecificMatch(phraseBacked, match);

    const baseEntry: CapabilityContractEntry = {
      id,
      match: stripUndefinedMatch(match),
      status: matched ? "configured" : "unmatched",
    };

    if (matched) {
      baseEntry.capabilityRef = {
        capabilityMapRef,
        phraseCapabilityId: matched.id,
      };

      const allowedLayers = readStringArray(row.allowedLayers);
      const forbiddenLayers = readStringArray(row.forbiddenLayers);
      const allowedSystems = readStringArray(row.allowedSystems);
      const forbiddenSystems = readStringArray(row.forbiddenSystems);
      const requiredChecks = readStringArray(row.requiredChecks);
      const requiredNeighbors = readNeighbors(row.requiredNeighbors);
      const forbiddenNeighbors = readNeighbors(row.forbiddenNeighbors);
      const preservationRules = readStringArray(row.preservationRules);
      const messages = readStringArray(row.messages);

      if (allowedLayers.length) baseEntry.allowedLayers = allowedLayers;
      if (forbiddenLayers.length) baseEntry.forbiddenLayers = forbiddenLayers;
      if (allowedSystems.length) baseEntry.allowedSystems = allowedSystems;
      if (forbiddenSystems.length) baseEntry.forbiddenSystems = forbiddenSystems;
      if (requiredChecks.length) baseEntry.requiredChecks = requiredChecks;
      if (requiredNeighbors.length) baseEntry.requiredNeighbors = requiredNeighbors;
      if (forbiddenNeighbors.length) baseEntry.forbiddenNeighbors = forbiddenNeighbors;
      if (preservationRules.length) baseEntry.preservationRules = preservationRules;
      if (messages.length) baseEntry.messages = messages;

      // Configured rows must carry at least one populated
      // policy field. Drop empty-policy rows so the
      // validator never sees them.
      const policyCount =
        Number(baseEntry.allowedLayers !== undefined)
        + Number(baseEntry.forbiddenLayers !== undefined)
        + Number(baseEntry.allowedSystems !== undefined)
        + Number(baseEntry.forbiddenSystems !== undefined)
        + Number(baseEntry.requiredChecks !== undefined)
        + Number(baseEntry.requiredNeighbors !== undefined)
        + Number(baseEntry.forbiddenNeighbors !== undefined)
        + Number(baseEntry.preservationRules !== undefined)
        + Number(baseEntry.messages !== undefined);
      if (policyCount === 0) return;
    }

    // Preserve config order on the entry so the
    // normalizer's `(verb, noun, id)` sort stays stable
    // when multiple rows share a (verb, noun); the id
    // tie-break already encodes that.
    void configIndex;

    entries.push(baseEntry);
  });

  const inputRefs: ArtifactRef[] = [capabilityMapRef];
  if (phraseReportRef) inputRefs.push(phraseReportRef);

  const header: ArtifactHeader = {
    artifactType: "CapabilityContract",
    artifactId: `capability-contract-${(generatedAt ?? new Date().toISOString()).replace(/[^0-9A-Za-z]/g, "")}`,
    schemaVersion: SCHEMA_VERSION,
    generatedAt: generatedAt ?? new Date().toISOString(),
    subject: subject ?? capabilityMap.header.subject,
    producer: {
      id: PRODUCER_ID,
      version: PRODUCER_VERSION,
    },
    inputRefs,
    freshness: { status: "fresh" },
    provenance: { confidence: 0.95 },
  };

  return createCapabilityContract({
    header,
    source: {
      capabilityMapRef,
      configPath,
      configHash,
      phraseReportRef,
    },
    // `summary` will be re-computed by the constructor.
    // Provide zero values so the validator path stays
    // type-safe.
    summary: {
      total: 0,
      configured: 0,
      suggested: 0,
      unmatched: 0,
      withRequiredChecks: 0,
      withPlacementRules: 0,
      withPreservationRules: 0,
    },
    contracts: entries,
  });
}

// ---------------------------------------------------------
// Matching
// ---------------------------------------------------------

type ConfigMatch = {
  verb: string;
  noun: string;
  domain?: string;
  pattern?: string;
  layer?: string;
};

/** Returns the most-specific v2 capability that matches
 *  the config row, or undefined if none. Most-specific =
 *  greatest count of populated optional fields that
 *  agree. Ties break by phrase-backed id asc — the v2
 *  ordering is already deterministic. */
function pickMostSpecificMatch(
  phraseBacked: CapabilityMapPhraseBackedCapability[],
  config: ConfigMatch,
): CapabilityMapPhraseBackedCapability | undefined {
  let best: CapabilityMapPhraseBackedCapability | undefined;
  let bestSpecificity = -1;

  for (const phrase of phraseBacked) {
    if (phrase.verb !== config.verb) continue;
    if (phrase.noun !== config.noun) continue;

    let specificity = 0;
    if (config.domain !== undefined) {
      if (phrase.domain !== config.domain) continue;
      specificity++;
    }
    if (config.pattern !== undefined) {
      if (phrase.pattern !== config.pattern) continue;
      specificity++;
    }
    if (config.layer !== undefined) {
      if (phrase.layer !== config.layer) continue;
      specificity++;
    }

    if (specificity > bestSpecificity) {
      best = phrase;
      bestSpecificity = specificity;
      continue;
    }
    if (specificity === bestSpecificity && best && phrase.id < best.id) {
      best = phrase;
    }
  }

  return best;
}

// ---------------------------------------------------------
// Config field readers (defensive against malformed JSON)
// ---------------------------------------------------------

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function readNeighbors(value: unknown): CapabilityContractNeighbor[] {
  if (!Array.isArray(value)) return [];
  const out: CapabilityContractNeighbor[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const candidate = raw as { verb?: unknown; noun?: unknown };
    const verb = readString(candidate.verb);
    const noun = readString(candidate.noun);
    if (verb && noun) out.push({ verb, noun });
  }
  return out;
}

function stripUndefinedMatch(match: ConfigMatch): CapabilityContractEntry["match"] {
  const out: CapabilityContractEntry["match"] = { verb: match.verb, noun: match.noun };
  if (match.domain !== undefined) out.domain = match.domain;
  if (match.pattern !== undefined) out.pattern = match.pattern;
  if (match.layer !== undefined) out.layer = match.layer;
  return out;
}
