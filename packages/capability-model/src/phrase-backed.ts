// CapabilityMap v2 phrase-backed projection helper.
//
// Implements the `phraseBackedCapabilities` /
// `phraseBackedSummary` / `phraseSourceRef` additive
// projection committed to by the
// CapabilityMap v2 High-Confidence-Only Decision
// (twenty-seventh slice). Conjunctive eligibility:
// phrase.status === "stable" AND phrase.confidence ===
// "high" AND verb/noun non-empty AND evidenceRefs
// non-empty AND sourceCandidateIds non-empty.
//
// Partial / low-confidence phrases never appear here.
// Raw CapabilityNormalizationReport rows are never
// consumed by this helper. The helper does not read
// source files, does not infer policy, does not invoke
// an LLM, and does not mutate any upstream artifact.
//
// Structural typing is intentional: capability-model
// does not depend on @rekon/capability-ontology, only on
// the stable phrase-report JSON shape documented in
// docs/artifacts/capability-phrase-report.md.

import type { ArtifactRef } from "@rekon/kernel-artifacts";
import type {
  CapabilityMapPhraseBackedCapability,
  CapabilityMapPhraseBackedSummary,
} from "@rekon/kernel-repo-model";

/** Structural shape of a single CapabilityPhrase. */
export type PhraseLike = {
  id?: unknown;
  verb?: unknown;
  noun?: unknown;
  qualifier?: unknown;
  domain?: unknown;
  pattern?: unknown;
  layer?: unknown;
  confidence?: unknown;
  evidenceRefs?: unknown;
  sourceCandidateIds?: unknown;
  status?: unknown;
};

/** Structural shape of a CapabilityPhraseReport. */
export type PhraseReportLike = {
  phrases?: unknown;
};

export type BuildPhraseBackedAdditionsInput = {
  /** Latest CapabilityPhraseReport to filter. */
  phraseReport?: PhraseReportLike;
  /** ArtifactRef to the consumed report. Required when
   *  the report is supplied. Stamped into every entry's
   *  `phraseRef.report` and into the top-level
   *  `phraseSourceRef`. */
  phraseReportRef?: ArtifactRef;
};

export type PhraseBackedAdditions = {
  phraseBackedCapabilities?: CapabilityMapPhraseBackedCapability[];
  phraseBackedSummary?: CapabilityMapPhraseBackedSummary;
  phraseSourceRef?: ArtifactRef;
};

/**
 * Build the additive CapabilityMap v2 fields from a
 * CapabilityPhraseReport. Returns an empty object when
 * no report is supplied. When a report is supplied but
 * has no eligible phrases, returns the
 * `phraseSourceRef` plus an empty `phraseBackedCapabilities`
 * array and zeroed summary, so consumers can see the
 * report was considered (per the decision memo's
 * Freshness / Citation table).
 */
export function buildPhraseBackedCapabilityMapAdditions(
  input: BuildPhraseBackedAdditionsInput,
): PhraseBackedAdditions {
  const { phraseReport, phraseReportRef } = input;
  if (!phraseReport || !phraseReportRef) {
    return {};
  }

  const phrases = Array.isArray(phraseReport.phrases) ? phraseReport.phrases : [];
  const eligible: CapabilityMapPhraseBackedCapability[] = [];

  for (const raw of phrases) {
    if (!isPhrase(raw)) continue;
    if (raw.status !== "stable") continue;
    if (raw.confidence !== "high") continue;
    if (!isNonEmptyString(raw.verb) || !isNonEmptyString(raw.noun)) continue;
    if (!isNonEmptyString(raw.id)) continue;
    const evidenceRefs = readArtifactRefs(raw.evidenceRefs);
    if (!evidenceRefs || evidenceRefs.length === 0) continue;
    const sourceCandidateIds = readStringArray(raw.sourceCandidateIds);
    if (!sourceCandidateIds || sourceCandidateIds.length === 0) continue;

    const entry: CapabilityMapPhraseBackedCapability = {
      id: `capability-phrase:${raw.id}`,
      phraseRef: {
        report: phraseReportRef,
        phraseId: raw.id,
      },
      verb: raw.verb,
      noun: raw.noun,
      evidenceRefs,
      sourceCandidateIds,
      confidence: "high",
      status: "stable",
    };
    const qualifier = readStringArray(raw.qualifier);
    if (qualifier && qualifier.length > 0) entry.qualifier = qualifier;
    if (isNonEmptyString(raw.domain)) entry.domain = raw.domain;
    if (isNonEmptyString(raw.pattern)) entry.pattern = raw.pattern;
    if (isNonEmptyString(raw.layer)) entry.layer = raw.layer;
    eligible.push(entry);
  }

  // Deterministic ordering: verb asc, noun asc, id asc.
  eligible.sort((left, right) => {
    if (left.verb !== right.verb) return left.verb.localeCompare(right.verb);
    if (left.noun !== right.noun) return left.noun.localeCompare(right.noun);
    return left.id.localeCompare(right.id);
  });

  const summary = summarize(eligible);

  return {
    phraseBackedCapabilities: eligible,
    phraseBackedSummary: summary,
    phraseSourceRef: phraseReportRef,
  };
}

function summarize(
  entries: CapabilityMapPhraseBackedCapability[],
): CapabilityMapPhraseBackedSummary {
  const byVerbAccum: Record<string, number> = {};
  const byNounAccum: Record<string, number> = {};
  let withDomain = 0;
  let withPattern = 0;
  let withLayer = 0;
  for (const entry of entries) {
    byVerbAccum[entry.verb] = (byVerbAccum[entry.verb] ?? 0) + 1;
    byNounAccum[entry.noun] = (byNounAccum[entry.noun] ?? 0) + 1;
    if (entry.domain) withDomain++;
    if (entry.pattern) withPattern++;
    if (entry.layer) withLayer++;
  }
  return {
    total: entries.length,
    byVerb: sortRecord(byVerbAccum),
    byNoun: sortRecord(byNounAccum),
    withDomain,
    withPattern,
    withLayer,
  };
}

function sortRecord(record: Record<string, number>): Record<string, number> {
  const sorted: Record<string, number> = {};
  for (const key of Object.keys(record).sort()) {
    sorted[key] = record[key]!;
  }
  return sorted;
}

function isPhrase(raw: unknown): raw is PhraseLike & {
  id: string;
  verb: string;
  noun: string;
  status: "stable" | "partial" | "low-confidence";
  confidence: "high" | "medium" | "low";
} {
  if (!raw || typeof raw !== "object") return false;
  const candidate = raw as Record<string, unknown>;
  return (
    typeof candidate.id === "string"
    && typeof candidate.verb === "string"
    && typeof candidate.noun === "string"
    && typeof candidate.status === "string"
    && typeof candidate.confidence === "string"
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const filtered = value.filter((item): item is string => typeof item === "string");
  return filtered;
}

function readArtifactRefs(value: unknown): ArtifactRef[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const refs: ArtifactRef[] = [];
  for (const item of value) {
    if (
      item
      && typeof item === "object"
      && typeof (item as Record<string, unknown>).type === "string"
      && typeof (item as Record<string, unknown>).id === "string"
    ) {
      refs.push(item as ArtifactRef);
    }
  }
  return refs;
}
