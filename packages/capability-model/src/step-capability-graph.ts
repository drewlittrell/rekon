// StepCapabilityGraph v1 builder.
//
// Projects an **expected workflow topology graph** from existing
// governed artifacts — EvidenceGraph, CapabilityMap v2 (phrase-backed
// capabilities), CapabilityPhraseReport — with an OPTIONAL operator
// config at `.rekon/step-capability-map.json` used only for grouping /
// labeling.
//
// **Boundary.** This is workflow topology, **not** CapabilityMap v2. It
// models **no runtime truth, no handoff coverage, and no drift**, marks
// no execution readiness, declares no handoffs, and mutates nothing.
// `handoffPlaceholders` is reserved (empty in v1). The optional config
// only groups / labels derived capabilities into steps; it is never the
// only source of truth and cannot invent coverage / drift / readiness.
//
// See:
// - docs/strategy/step-capability-graph-v1-decision.md
// - docs/artifacts/step-capability-graph.md
// - docs/concepts/step-capability-graph.md

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type StepCapabilityGraph,
  type StepCapabilityGraphCapabilityEdge,
  type StepCapabilityGraphFileEdge,
  type StepCapabilityGraphNode,
  type StepCapabilityGraphSystemEdge,
  type StepCapabilityGraphUnresolvedCapability,
  createStepCapabilityGraph,
} from "@rekon/kernel-repo-model";

/** Optional operator config path (grouping / labeling only). */
export const STEP_CAPABILITY_GRAPH_CONFIG_PATH = ".rekon/step-capability-map.json";
/** Stable header `artifactId` prefix; the timestamp piece varies. */
export const STEP_CAPABILITY_GRAPH_ARTIFACT_ID_PREFIX = "step-capability-graph-";

export type StepCapabilityGraphConfigStep = {
  id: string;
  label?: string;
  capabilities?: Array<{ verb: string; noun: string; domain?: string }>;
  paths?: string[];
  systems?: string[];
  notes?: string[];
};

export type StepCapabilityGraphConfig = {
  version: "0.1.0";
  steps?: StepCapabilityGraphConfigStep[];
};

/** Structural reads — capability-model never depends on the producing
 *  packages by class; inputs are read by shape. */
export type StepCapabilityGraphEvidenceGraphLike = {
  header?: ArtifactHeader;
  facts?: Array<{
    kind?: string;
    subject?: string;
    value?: Record<string, unknown>;
    confidence?: number;
  }>;
};

export type StepCapabilityGraphCapabilityMapLike = {
  header?: ArtifactHeader;
  entries?: Array<{
    capability?: string;
    subjects?: string[];
    systems?: string[];
    evidence?: ArtifactRef[];
  }>;
  phraseBackedCapabilities?: Array<{
    id?: string;
    verb?: string;
    noun?: string;
    domain?: string;
    evidenceRefs?: ArtifactRef[];
  }>;
};

export type StepCapabilityGraphPhraseReportLike = {
  header?: ArtifactHeader;
  phrases?: Array<{
    id?: string;
    verb?: string;
    noun?: string;
    domain?: string;
    status?: string;
    confidence?: string;
    evidenceRefs?: ArtifactRef[];
  }>;
};

export type BuildStepCapabilityGraphInput = {
  header: ArtifactHeader;
  evidenceGraph?: StepCapabilityGraphEvidenceGraphLike;
  evidenceGraphRef?: ArtifactRef;
  capabilityMap?: StepCapabilityGraphCapabilityMapLike;
  capabilityMapRef?: ArtifactRef;
  capabilityPhraseReport?: StepCapabilityGraphPhraseReportLike;
  capabilityPhraseReportRef?: ArtifactRef;
  config?: StepCapabilityGraphConfig;
  configPath?: string;
  configHash?: string;
};

/**
 * Parse + validate an optional `.rekon/step-capability-map.json`
 * config. Missing config is handled by the caller (this only runs on a
 * present value). Invalid config throws a clear `Error`. The config is
 * never mutated.
 */
export function parseStepCapabilityGraphConfig(
  value: unknown,
): StepCapabilityGraphConfig {
  if (!isRecord(value)) {
    throw new Error("step-capability-map.json must be a JSON object.");
  }
  if (value.version !== "0.1.0") {
    throw new Error(
      'step-capability-map.json must have "version": "0.1.0".',
    );
  }
  const steps: StepCapabilityGraphConfigStep[] = [];
  if (value.steps !== undefined) {
    if (!Array.isArray(value.steps)) {
      throw new Error("step-capability-map.json `steps` must be an array.");
    }
    value.steps.forEach((raw, index) => {
      if (!isRecord(raw)) {
        throw new Error(`step-capability-map.json steps[${index}] must be an object.`);
      }
      if (typeof raw.id !== "string" || raw.id.length === 0) {
        throw new Error(`step-capability-map.json steps[${index}].id must be a non-empty string.`);
      }
      const step: StepCapabilityGraphConfigStep = { id: raw.id };
      if (raw.label !== undefined) {
        if (typeof raw.label !== "string") {
          throw new Error(`step-capability-map.json steps[${index}].label must be a string.`);
        }
        step.label = raw.label;
      }
      if (raw.capabilities !== undefined) {
        if (!Array.isArray(raw.capabilities)) {
          throw new Error(`step-capability-map.json steps[${index}].capabilities must be an array.`);
        }
        step.capabilities = raw.capabilities.map((cap, capIndex) => {
          if (!isRecord(cap) || typeof cap.verb !== "string" || cap.verb.length === 0 || typeof cap.noun !== "string" || cap.noun.length === 0) {
            throw new Error(`step-capability-map.json steps[${index}].capabilities[${capIndex}] requires non-empty verb and noun.`);
          }
          const out: { verb: string; noun: string; domain?: string } = { verb: cap.verb, noun: cap.noun };
          if (cap.domain !== undefined) {
            if (typeof cap.domain !== "string") {
              throw new Error(`step-capability-map.json steps[${index}].capabilities[${capIndex}].domain must be a string.`);
            }
            out.domain = cap.domain;
          }
          return out;
        });
      }
      step.paths = readStringArray(raw.paths, `steps[${index}].paths`);
      step.systems = readStringArray(raw.systems, `steps[${index}].systems`);
      step.notes = readStringArray(raw.notes, `steps[${index}].notes`);
      steps.push(step);
    });
  }
  return { version: "0.1.0", steps };
}

type PhraseCap = {
  id: string;
  verb: string;
  noun: string;
  domain?: string;
  evidenceRefs: ArtifactRef[];
};

type CapabilityMapEntry = {
  capability: string;
  tokens: Set<string>;
  subjects: string[];
  systems: string[];
  evidence: ArtifactRef[];
};

/**
 * Build a `StepCapabilityGraph` from governed artifacts + optional
 * config. Projection-first: works with no config. Mutates nothing.
 *
 * Matching order when assigning a capability to a configured step is
 * deterministic: capability (verb+noun, optional domain) > path prefix
 * > system > config order > id ascending.
 */
export function buildStepCapabilityGraph(
  input: BuildStepCapabilityGraphInput,
): StepCapabilityGraph {
  const phraseCaps = collectPhraseCaps(input);
  const mapEntries = collectMapEntries(input.capabilityMap);

  // Per-step accumulation.
  const stepNodes = new Map<string, StepCapabilityGraphNode>();
  const stepHasDerivedMatch = new Map<string, boolean>();
  const capabilityEdges: StepCapabilityGraphCapabilityEdge[] = [];
  const fileEdges: StepCapabilityGraphFileEdge[] = [];
  const systemEdges: StepCapabilityGraphSystemEdge[] = [];
  const unresolved: StepCapabilityGraphUnresolvedCapability[] = [];

  const configSteps = input.config?.steps ?? [];

  // Seed configured step nodes + their declared file/system edges.
  for (const cfg of configSteps) {
    const node: StepCapabilityGraphNode = {
      id: cfg.id,
      label: cfg.label && cfg.label.length > 0 ? cfg.label : cfg.id,
      source: "configured",
      evidenceRefs: [],
    };
    if (cfg.systems && cfg.systems.length > 0) node.systems = [...cfg.systems];
    if (cfg.paths && cfg.paths.length > 0) node.paths = [...cfg.paths];
    stepNodes.set(cfg.id, node);
    stepHasDerivedMatch.set(cfg.id, false);
    for (const path of cfg.paths ?? []) {
      fileEdges.push({ id: `file:${cfg.id}:${path}`, stepId: cfg.id, path, source: "config", evidenceRefs: [] });
    }
    for (const system of cfg.systems ?? []) {
      systemEdges.push({ id: `sys:${cfg.id}:${system}`, stepId: cfg.id, system, source: "config", evidenceRefs: [] });
    }
  }

  for (const cap of phraseCaps) {
    const mapEntry = findMapEntry(mapEntries, cap);
    const capPaths = mapEntry?.subjects ?? [];
    const capSystems = mapEntry?.systems ?? [];

    // Deterministic best-match config step.
    let best: { step: StepCapabilityGraphConfigStep; rank: number; index: number } | undefined;
    configSteps.forEach((cfg, index) => {
      const rank = matchRank(cfg, cap, capPaths, capSystems);
      if (rank === 0) return;
      if (!best || rank > best.rank || (rank === best.rank && index < best.index)) {
        best = { step: cfg, rank, index };
      }
    });

    if (best) {
      const stepId = best.step.id;
      const declared = best.rank === 3;
      capabilityEdges.push({
        id: `cap:${stepId}:${cap.id}`,
        stepId,
        capabilityId: mapEntry?.capability,
        phraseCapabilityId: cap.id,
        verb: cap.verb,
        noun: cap.noun,
        domain: cap.domain,
        confidence: declared ? "high" : best.rank === 2 ? "medium" : "low",
        source: declared ? "config" : "mixed",
        evidenceRefs: mergeRefs(cap.evidenceRefs, mapEntry?.evidence),
      });
      if (!declared) stepHasDerivedMatch.set(stepId, true);
      attachMapEvidenceEdges(stepId, mapEntry, cap, fileEdges, systemEdges);
      continue;
    }

    // Not assigned to config. Derive by domain grouping, else unresolved.
    if (cap.domain && cap.domain.length > 0) {
      const stepId = `step:domain:${cap.domain}`;
      if (!stepNodes.has(stepId)) {
        stepNodes.set(stepId, { id: stepId, label: cap.domain, source: "derived", evidenceRefs: [] });
        stepHasDerivedMatch.set(stepId, true);
      }
      capabilityEdges.push({
        id: `cap:${stepId}:${cap.id}`,
        stepId,
        capabilityId: mapEntry?.capability,
        phraseCapabilityId: cap.id,
        verb: cap.verb,
        noun: cap.noun,
        domain: cap.domain,
        confidence: mapEntry ? "high" : "medium",
        source: mapEntry ? "capability-map" : "phrase-report",
        evidenceRefs: mergeRefs(cap.evidenceRefs, mapEntry?.evidence),
      });
      // domain → system edge for the derived step. Cite the
      // capability's own evidence (always present) so the edge is never
      // an unevidenced capability-map edge.
      systemEdges.push({ id: `sys:${stepId}:${cap.domain}`, stepId, system: cap.domain, source: "capability-map", evidenceRefs: mergeRefs(cap.evidenceRefs, mapEntry?.evidence) });
      attachMapEvidenceEdges(stepId, mapEntry, cap, fileEdges, systemEdges);
      continue;
    }

    unresolved.push({
      id: `unresolved:${cap.id}`,
      reason:
        "Bridge-derived capability could not be safely assigned to a step (no configured step matched and no domain grouping available).",
      capabilityId: mapEntry?.capability,
      phraseCapabilityId: cap.id,
      evidenceRefs: cap.evidenceRefs,
    });
  }

  // Finalize node sources (configured -> mixed when a derived cap attached).
  for (const [id, node] of stepNodes) {
    if (node.source === "configured" && stepHasDerivedMatch.get(id)) {
      node.source = "mixed";
    }
  }

  const source: StepCapabilityGraph["source"] = {};
  if (input.evidenceGraphRef) source.evidenceGraphRef = input.evidenceGraphRef;
  if (input.capabilityMapRef) source.capabilityMapRef = input.capabilityMapRef;
  if (input.capabilityPhraseReportRef) source.capabilityPhraseReportRef = input.capabilityPhraseReportRef;
  if (input.configPath) source.configPath = input.configPath;
  if (input.configHash) source.configHash = input.configHash;

  // The factory dedupes by id, sorts, recomputes the summary, and
  // asserts. handoffPlaceholders is empty in v1 (no declared handoffs).
  return createStepCapabilityGraph({
    header: input.header,
    source,
    summary: {
      steps: 0,
      capabilityEdges: 0,
      fileEdges: 0,
      systemEdges: 0,
      unresolvedCapabilities: 0,
      handoffPlaceholders: 0,
    },
    steps: [...stepNodes.values()],
    capabilityEdges,
    fileEdges,
    systemEdges,
    handoffPlaceholders: [],
    unresolvedCapabilities: unresolved,
  });
}

function attachMapEvidenceEdges(
  stepId: string,
  mapEntry: CapabilityMapEntry | undefined,
  cap: PhraseCap,
  fileEdges: StepCapabilityGraphFileEdge[],
  systemEdges: StepCapabilityGraphSystemEdge[],
): void {
  if (!mapEntry) return;
  // Cite the capability's evidence alongside the map entry's so an edge
  // is never an unevidenced evidence/capability-map edge.
  const refs = mergeRefs(mapEntry.evidence, cap.evidenceRefs);
  for (const path of mapEntry.subjects) {
    fileEdges.push({ id: `file:${stepId}:${path}`, stepId, path, source: "evidence", evidenceRefs: refs });
  }
  for (const system of mapEntry.systems) {
    systemEdges.push({ id: `sys:${stepId}:${system}`, stepId, system, source: "capability-map", evidenceRefs: refs });
  }
}

function matchRank(
  cfg: StepCapabilityGraphConfigStep,
  cap: PhraseCap,
  capPaths: string[],
  capSystems: string[],
): number {
  const declared = (cfg.capabilities ?? []).some(
    (c) =>
      c.verb.toLowerCase() === cap.verb.toLowerCase()
      && c.noun.toLowerCase() === cap.noun.toLowerCase()
      && (c.domain ? c.domain === cap.domain : true),
  );
  if (declared) return 3;
  const cfgPaths = cfg.paths ?? [];
  if (cfgPaths.length > 0 && capPaths.some((cp) => cfgPaths.some((fp) => cp === fp || cp.startsWith(fp)))) {
    return 2;
  }
  const cfgSystems = cfg.systems ?? [];
  const capSystemSet = new Set([...capSystems, ...(cap.domain ? [cap.domain] : [])]);
  if (cfgSystems.length > 0 && cfgSystems.some((s) => capSystemSet.has(s))) {
    return 1;
  }
  return 0;
}

function collectPhraseCaps(input: BuildStepCapabilityGraphInput): PhraseCap[] {
  const out: PhraseCap[] = [];
  const seen = new Set<string>();
  const fromMap = input.capabilityMap?.phraseBackedCapabilities ?? [];
  for (const raw of fromMap) {
    if (!isNonEmpty(raw?.id) || !isNonEmpty(raw?.verb) || !isNonEmpty(raw?.noun)) continue;
    const refs = readRefs(raw.evidenceRefs);
    if (refs.length === 0) continue;
    if (seen.has(raw.id as string)) continue;
    seen.add(raw.id as string);
    out.push({ id: raw.id as string, verb: raw.verb as string, noun: raw.noun as string, domain: optString(raw.domain), evidenceRefs: refs });
  }
  if (out.length === 0) {
    // Fall back to eligible phrases (stable + high) when the map has no
    // phrase-backed entries.
    const phrases = input.capabilityPhraseReport?.phrases ?? [];
    for (const raw of phrases) {
      if (raw?.status !== "stable" || raw?.confidence !== "high") continue;
      if (!isNonEmpty(raw?.id) || !isNonEmpty(raw?.verb) || !isNonEmpty(raw?.noun)) continue;
      const refs = readRefs(raw.evidenceRefs);
      if (refs.length === 0) continue;
      const id = `capability-phrase:${raw.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ id, verb: raw.verb as string, noun: raw.noun as string, domain: optString(raw.domain), evidenceRefs: refs });
    }
  }
  out.sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

function collectMapEntries(map: StepCapabilityGraphCapabilityMapLike | undefined): CapabilityMapEntry[] {
  const out: CapabilityMapEntry[] = [];
  for (const raw of map?.entries ?? []) {
    if (!isNonEmpty(raw?.capability)) continue;
    const capability = raw.capability as string;
    const tokens = new Set(capability.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
    out.push({
      capability,
      tokens,
      subjects: readStringArray(raw.subjects, "subjects") ?? [],
      systems: readStringArray(raw.systems, "systems") ?? [],
      evidence: readRefs(raw.evidence),
    });
  }
  return out;
}

function findMapEntry(entries: CapabilityMapEntry[], cap: PhraseCap): CapabilityMapEntry | undefined {
  const verb = cap.verb.toLowerCase();
  const noun = cap.noun.toLowerCase();
  return entries.find((e) => e.tokens.has(verb) && e.tokens.has(noun));
}

function mergeRefs(a: ArtifactRef[], b: ArtifactRef[] | undefined): ArtifactRef[] {
  const out: ArtifactRef[] = [...a];
  for (const ref of b ?? []) {
    if (!out.some((existing) => existing.type === ref.type && existing.id === ref.id)) {
      out.push(ref);
    }
  }
  return out;
}

function readRefs(value: unknown): ArtifactRef[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (ref): ref is ArtifactRef =>
      isRecord(ref) && typeof ref.type === "string" && typeof ref.id === "string",
  );
}

function readStringArray(value: unknown, label: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw new Error(`step-capability-map.json ${label} must be an array of strings.`);
  }
  const out = (value as string[]).filter((v) => v.length > 0);
  return out.length > 0 ? out : undefined;
}

function isNonEmpty(value: unknown): boolean {
  return typeof value === "string" && value.length > 0;
}

function optString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
