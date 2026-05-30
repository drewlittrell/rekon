// HandoffContract v1 builder.
//
// Materializes **declared baton policy** from an optional
// `.rekon/handoff-contracts.json` over the current `StepCapabilityGraph`.
// Each configured handoff is resolved to `declared` (both step ids exist
// in the graph) or `unresolved-step` (a referenced step id is missing).
//
// **Boundary.** This is declared baton policy, **not**
// `StepCapabilityGraph` topology. v1 evaluates **no handoff coverage**,
// reads **no runtime events**, detects **no drift**, creates no
// `WorkOrder` / `VerificationPlan`, and mutates nothing (the graph or the
// config). It does not infer handoffs from the graph.
//
// See:
// - docs/strategy/handoff-contract-v1-decision.md
// - docs/artifacts/handoff-contract.md
// - docs/concepts/handoff-contract.md

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type HandoffContract,
  type HandoffContractEntry,
  createHandoffContract,
} from "@rekon/kernel-repo-model";

/** Optional operator config path (declared baton policy only). */
export const HANDOFF_CONTRACT_CONFIG_PATH = ".rekon/handoff-contracts.json";
/** Stable header `artifactId` prefix; the timestamp piece varies. */
export const HANDOFF_CONTRACT_ARTIFACT_ID_PREFIX = "handoff-contract-";

export type HandoffContractConfigCapability = {
  verb: string;
  noun: string;
  domain?: string;
};

export type HandoffContractConfigHandoff = {
  id?: string;
  fromStepId: string;
  toStepId: string;
  feature?: string;
  capability?: HandoffContractConfigCapability;
  event?: { name?: string; kind?: string };
  payload?: { schemaHint?: string };
  notes?: string[];
};

export type HandoffContractConfig = {
  version: "0.1.0";
  handoffs?: HandoffContractConfigHandoff[];
};

/** Structural view of a StepCapabilityGraph. capability-model reads it
 *  by shape (no class dependency). */
export type HandoffContractStepGraphLike = {
  header?: ArtifactHeader;
  steps?: Array<{ id?: string; evidenceRefs?: ArtifactRef[] }>;
};

export type BuildHandoffContractInput = {
  header: ArtifactHeader;
  stepCapabilityGraph: HandoffContractStepGraphLike;
  stepCapabilityGraphRef: ArtifactRef;
  config?: HandoffContractConfig;
  configPath?: string;
  configHash?: string;
};

/**
 * Parse + validate an optional `.rekon/handoff-contracts.json`. Missing
 * config is handled by the caller (this only runs on a present value).
 * Invalid config throws a clear `Error`. The config is never mutated.
 */
export function parseHandoffContractConfig(value: unknown): HandoffContractConfig {
  if (!isRecord(value)) {
    throw new Error("handoff-contracts.json must be a JSON object.");
  }
  if (value.version !== "0.1.0") {
    throw new Error('handoff-contracts.json must have "version": "0.1.0".');
  }
  const handoffs: HandoffContractConfigHandoff[] = [];
  if (value.handoffs !== undefined) {
    if (!Array.isArray(value.handoffs)) {
      throw new Error("handoff-contracts.json `handoffs` must be an array.");
    }
    value.handoffs.forEach((raw, index) => {
      if (!isRecord(raw)) {
        throw new Error(`handoff-contracts.json handoffs[${index}] must be an object.`);
      }
      if (typeof raw.fromStepId !== "string" || raw.fromStepId.length === 0) {
        throw new Error(`handoff-contracts.json handoffs[${index}].fromStepId must be a non-empty string.`);
      }
      if (typeof raw.toStepId !== "string" || raw.toStepId.length === 0) {
        throw new Error(`handoff-contracts.json handoffs[${index}].toStepId must be a non-empty string.`);
      }
      const out: HandoffContractConfigHandoff = { fromStepId: raw.fromStepId, toStepId: raw.toStepId };
      if (raw.id !== undefined) {
        if (typeof raw.id !== "string" || raw.id.length === 0) {
          throw new Error(`handoff-contracts.json handoffs[${index}].id must be a non-empty string.`);
        }
        out.id = raw.id;
      }
      if (raw.feature !== undefined) {
        if (typeof raw.feature !== "string") {
          throw new Error(`handoff-contracts.json handoffs[${index}].feature must be a string.`);
        }
        out.feature = raw.feature;
      }
      if (raw.capability !== undefined) {
        if (!isRecord(raw.capability) || typeof raw.capability.verb !== "string" || raw.capability.verb.length === 0 || typeof raw.capability.noun !== "string" || raw.capability.noun.length === 0) {
          throw new Error(`handoff-contracts.json handoffs[${index}].capability requires non-empty verb and noun.`);
        }
        const cap: HandoffContractConfigCapability = { verb: raw.capability.verb, noun: raw.capability.noun };
        if (raw.capability.domain !== undefined) {
          if (typeof raw.capability.domain !== "string") {
            throw new Error(`handoff-contracts.json handoffs[${index}].capability.domain must be a string.`);
          }
          cap.domain = raw.capability.domain;
        }
        out.capability = cap;
      }
      if (raw.event !== undefined) {
        if (!isRecord(raw.event)) {
          throw new Error(`handoff-contracts.json handoffs[${index}].event must be an object.`);
        }
        out.event = {
          name: optString(raw.event.name),
          kind: optString(raw.event.kind),
        };
      }
      if (raw.payload !== undefined) {
        if (!isRecord(raw.payload)) {
          throw new Error(`handoff-contracts.json handoffs[${index}].payload must be an object.`);
        }
        out.payload = { schemaHint: optString(raw.payload.schemaHint) };
      }
      if (raw.notes !== undefined) {
        if (!Array.isArray(raw.notes) || raw.notes.some((n) => typeof n !== "string")) {
          throw new Error(`handoff-contracts.json handoffs[${index}].notes must be an array of strings.`);
        }
        out.notes = raw.notes as string[];
      }
      handoffs.push(out);
    });
  }
  return { version: "0.1.0", handoffs };
}

/**
 * Build a `HandoffContract` from a `StepCapabilityGraph` + optional
 * config. Resolves each configured handoff against the graph's step ids:
 * both present → `declared`; a missing step id → `unresolved-step` (with
 * a message). No config → zero handoffs. Infers nothing; mutates
 * nothing.
 */
export function buildHandoffContract(input: BuildHandoffContractInput): HandoffContract {
  const steps = Array.isArray(input.stepCapabilityGraph.steps) ? input.stepCapabilityGraph.steps : [];
  const stepEvidence = new Map<string, ArtifactRef[]>();
  for (const step of steps) {
    if (typeof step?.id === "string" && step.id.length > 0) {
      stepEvidence.set(step.id, Array.isArray(step.evidenceRefs) ? step.evidenceRefs : []);
    }
  }

  const entries: HandoffContractEntry[] = [];
  const usedIds = new Set<string>();
  const configHandoffs = input.config?.handoffs ?? [];
  for (const handoff of configHandoffs) {
    const id = uniqueId(handoff.id && handoff.id.length > 0 ? handoff.id : deriveId(handoff), usedIds);
    const fromExists = stepEvidence.has(handoff.fromStepId);
    const toExists = stepEvidence.has(handoff.toStepId);
    const status = fromExists && toExists ? "declared" : "unresolved-step";

    const entry: HandoffContractEntry = {
      id,
      status,
      fromStepId: handoff.fromStepId,
      toStepId: handoff.toStepId,
      evidenceRefs: mergeRefs(
        fromExists ? stepEvidence.get(handoff.fromStepId) : undefined,
        toExists ? stepEvidence.get(handoff.toStepId) : undefined,
      ),
    };
    if (handoff.feature) entry.feature = handoff.feature;
    if (handoff.capability) entry.capability = handoff.capability;
    if (handoff.event && (handoff.event.name || handoff.event.kind)) entry.event = handoff.event;
    if (handoff.payload && handoff.payload.schemaHint) entry.payload = handoff.payload;

    if (status === "unresolved-step") {
      const missing: string[] = [];
      if (!fromExists) missing.push(`fromStepId "${handoff.fromStepId}"`);
      if (!toExists) missing.push(`toStepId "${handoff.toStepId}"`);
      entry.messages = [
        `Declared handoff references ${missing.join(" and ")} not present in the StepCapabilityGraph; resolve the step id(s) or update the graph.`,
      ];
    }
    entries.push(entry);
  }

  const source: HandoffContract["source"] = {
    stepCapabilityGraphRef: input.stepCapabilityGraphRef,
  };
  if (input.configPath) source.configPath = input.configPath;
  if (input.configHash) source.configHash = input.configHash;

  // The factory recomputes the summary, sorts by status rank then id,
  // and asserts. No coverage, no runtime events, no drift.
  return createHandoffContract({
    header: input.header,
    source,
    summary: { total: 0, declared: 0, unresolvedStep: 0, needsReview: 0 },
    handoffs: entries,
  });
}

function deriveId(handoff: HandoffContractConfigHandoff): string {
  const suffix =
    handoff.feature
    ?? (handoff.capability ? `${handoff.capability.verb}-${handoff.capability.noun}` : undefined)
    ?? handoff.event?.name
    ?? "default";
  return `handoff:${slug(handoff.fromStepId)}:${slug(handoff.toStepId)}:${slug(suffix)}`;
}

function slug(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "x";
}

function uniqueId(base: string, used: Set<string>): string {
  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

function mergeRefs(a: ArtifactRef[] | undefined, b: ArtifactRef[] | undefined): ArtifactRef[] {
  const out: ArtifactRef[] = [];
  for (const ref of [...(a ?? []), ...(b ?? [])]) {
    if (ref && typeof ref.type === "string" && typeof ref.id === "string" && !out.some((e) => e.type === ref.type && e.id === ref.id)) {
      out.push(ref);
    }
  }
  return out;
}

function optString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
