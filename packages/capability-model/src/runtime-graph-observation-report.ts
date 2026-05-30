// RuntimeGraphObservationReport v1 builder.
//
// Generates an **observed runtime graph** from a raw handoff event log
// (`.rekon/handoff-events.jsonl`). Observed `handoff_event` rows fold into
// observed nodes (step / feature / event / source) and edges (handoff /
// emitted-by), each carrying observedCount + first/last timestamps + line
// evidence.
//
// **Boundary.** This is observed runtime graph, **not** declared topology,
// and **not** `HandoffCoverageReport`. v1 evaluates **no** declared handoff
// coverage, compares against **no** declared artifact, detects **no**
// drift, creates no `WorkOrder` / `VerificationPlan`, and mutates nothing
// (the event log or upstream artifacts). Optional upstream refs are
// citation / context only.
//
// The builder does **not** read files: the CLI reads the optional event log
// and passes its content + hash in. Invalid JSON lines are counted as
// `parseErrors` and never abort the report; non-handoff JSON rows are
// counted as `ignoredRows`.
//
// See:
// - docs/strategy/runtime-graph-observation-report-v1-decision.md
// - docs/artifacts/runtime-graph-observation-report.md
// - docs/concepts/runtime-graph-observation.md

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type RuntimeGraphObservationEdge,
  type RuntimeGraphObservationEvidenceRef,
  type RuntimeGraphObservationNode,
  type RuntimeGraphObservationReport,
  type RuntimeGraphObservationReportSource,
  createRuntimeGraphObservationReport,
} from "@rekon/kernel-repo-model";

/** Optional raw handoff event log path (observed runtime events only). */
export const RUNTIME_GRAPH_OBSERVATION_EVENT_LOG_PATH = ".rekon/handoff-events.jsonl";
/** Stable header `artifactId` prefix; the timestamp piece varies. */
export const RUNTIME_GRAPH_OBSERVATION_ARTIFACT_ID_PREFIX = "runtime-graph-observation-report-";
/** Only event log lines with this `kind` create observed graph nodes/edges. */
export const RUNTIME_GRAPH_OBSERVATION_EVENT_KIND = "handoff_event";

/** A single parsed `handoff_event` line. */
export type ParsedRuntimeGraphObservationEvent = {
  line: number;
  name?: string;
  feature?: string;
  fromStepId?: string;
  toStepId?: string;
  timestamp?: string;
  payloadType?: string;
  source?: string;
};

export type ParseRuntimeGraphObservationEventLogResult = {
  handoffEvents: ParsedRuntimeGraphObservationEvent[];
  ignoredRows: number;
  parseErrors: number;
};

export type BuildRuntimeGraphObservationReportInput = {
  header: ArtifactHeader;
  /** Raw JSONL event log content. `undefined` means **no log** present
   *  (zero nodes / zero edges). */
  eventLog?: string;
  eventLogPath?: string;
  eventLogHash?: string;
  handoffCoverageReportRef?: ArtifactRef;
  handoffContractRef?: ArtifactRef;
  stepCapabilityGraphRef?: ArtifactRef;
};

/**
 * Parse a raw `.rekon/handoff-events.jsonl` string line by line. Only lines
 * whose parsed `kind === "handoff_event"` become observed events; other
 * valid JSON rows increment `ignoredRows`; invalid JSON lines increment
 * `parseErrors` and do not abort. Blank lines are skipped. The input is
 * never mutated.
 */
export function parseRuntimeGraphObservationEventLog(
  input: { eventLog: string },
): ParseRuntimeGraphObservationEventLogResult {
  const handoffEvents: ParsedRuntimeGraphObservationEvent[] = [];
  let ignoredRows = 0;
  let parseErrors = 0;
  const lines = input.eventLog.split("\n");
  lines.forEach((rawLine, index) => {
    const line = index + 1;
    const trimmed = rawLine.trim();
    if (trimmed.length === 0) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      parseErrors += 1;
      return;
    }
    if (!isRecord(parsed) || parsed.kind !== RUNTIME_GRAPH_OBSERVATION_EVENT_KIND) {
      ignoredRows += 1;
      return;
    }
    const event: ParsedRuntimeGraphObservationEvent = { line };
    const name = optString(parsed.name);
    if (name) event.name = name;
    const feature = optString(parsed.feature);
    if (feature) event.feature = feature;
    const fromStepId = optString(parsed.fromStepId);
    if (fromStepId) event.fromStepId = fromStepId;
    const toStepId = optString(parsed.toStepId);
    if (toStepId) event.toStepId = toStepId;
    const timestamp = optString(parsed.timestamp);
    if (timestamp) event.timestamp = timestamp;
    const payloadType = optString(parsed.payloadType);
    if (payloadType) event.payloadType = payloadType;
    const source = optString(parsed.source);
    if (source) event.source = source;
    handoffEvents.push(event);
  });
  return { handoffEvents, ignoredRows, parseErrors };
}

/**
 * Build a `RuntimeGraphObservationReport` from optional raw handoff event
 * log content. The builder reads no files and reads no upstream artifact
 * contents; the CLI supplies event log content + hash and optional citation
 * refs.
 */
export function buildRuntimeGraphObservationReport(
  input: BuildRuntimeGraphObservationReportInput,
): RuntimeGraphObservationReport {
  const source: RuntimeGraphObservationReportSource = {};
  if (input.handoffCoverageReportRef) source.handoffCoverageReportRef = input.handoffCoverageReportRef;
  if (input.handoffContractRef) source.handoffContractRef = input.handoffContractRef;
  if (input.stepCapabilityGraphRef) source.stepCapabilityGraphRef = input.stepCapabilityGraphRef;

  // No event log present → zero nodes / zero edges; record no log path/hash.
  if (input.eventLog === undefined) {
    return finalize(input.header, source, [], [], 0, 0, 0);
  }

  if (input.eventLogPath) source.eventLogPath = input.eventLogPath;
  if (input.eventLogHash) source.eventLogHash = input.eventLogHash;

  const { handoffEvents, ignoredRows, parseErrors } = parseRuntimeGraphObservationEventLog({ eventLog: input.eventLog });

  const nodeMap = new Map<string, RuntimeGraphObservationNode>();
  const edgeMap = new Map<string, RuntimeGraphObservationEdge>();

  for (const event of handoffEvents) {
    const ts = event.timestamp;
    const src = event.source;
    if (event.fromStepId) upsertNode(nodeMap, `step:${slug(event.fromStepId)}`, "step", event.fromStepId, event.line, ts, src);
    if (event.toStepId) upsertNode(nodeMap, `step:${slug(event.toStepId)}`, "step", event.toStepId, event.line, ts, src);
    if (event.feature) upsertNode(nodeMap, `feature:${slug(event.feature)}`, "feature", event.feature, event.line, ts, src);
    if (event.name) upsertNode(nodeMap, `event:${slug(event.name)}`, "event", event.name, event.line, ts, src);
    if (event.source) upsertNode(nodeMap, `source:${slug(event.source)}`, "source", event.source, event.line, ts, src);

    if (event.fromStepId && event.toStepId) {
      upsertEdge(
        edgeMap,
        `handoff:${slug(event.fromStepId)}:${slug(event.toStepId)}`,
        "handoff",
        `step:${slug(event.fromStepId)}`,
        `step:${slug(event.toStepId)}`,
        event,
        ts,
        src,
        { feature: event.feature, eventName: event.name, payloadType: event.payloadType },
      );
    }
    if (event.name && event.source) {
      upsertEdge(
        edgeMap,
        `emitted-by:${slug(event.name)}:${slug(event.source)}`,
        "emitted-by",
        `event:${slug(event.name)}`,
        `source:${slug(event.source)}`,
        event,
        ts,
        src,
        { eventName: event.name },
      );
    }
  }

  return finalize(
    input.header,
    source,
    [...nodeMap.values()],
    [...edgeMap.values()],
    handoffEvents.length,
    ignoredRows,
    parseErrors,
  );
}

function upsertNode(
  map: Map<string, RuntimeGraphObservationNode>,
  id: string,
  kind: RuntimeGraphObservationNode["kind"],
  label: string,
  line: number,
  timestamp: string | undefined,
  source: string | undefined,
): void {
  let node = map.get(id);
  if (!node) {
    node = { id, kind, label, source: "handoff-event-log", observedCount: 0, evidenceRefs: [] };
    map.set(id, node);
  }
  node.observedCount += 1;
  node.evidenceRefs.push(evidenceRef(line, timestamp, source));
  applyObservedAt(node, timestamp);
}

function upsertEdge(
  map: Map<string, RuntimeGraphObservationEdge>,
  id: string,
  kind: RuntimeGraphObservationEdge["kind"],
  fromNodeId: string,
  toNodeId: string,
  event: ParsedRuntimeGraphObservationEvent,
  timestamp: string | undefined,
  source: string | undefined,
  attrs: { feature?: string; eventName?: string; payloadType?: string },
): void {
  let edge = map.get(id);
  if (!edge) {
    edge = { id, kind, fromNodeId, toNodeId, observedCount: 0, evidenceRefs: [] };
    if (attrs.feature) edge.feature = attrs.feature;
    if (attrs.eventName) edge.eventName = attrs.eventName;
    if (attrs.payloadType) edge.payloadType = attrs.payloadType;
    map.set(id, edge);
  }
  edge.observedCount += 1;
  edge.evidenceRefs.push(evidenceRef(event.line, timestamp, source));
  applyObservedAt(edge, timestamp);
}

function evidenceRef(line: number, timestamp: string | undefined, source: string | undefined): RuntimeGraphObservationEvidenceRef {
  const ref: RuntimeGraphObservationEvidenceRef = { line };
  if (timestamp) ref.timestamp = timestamp;
  if (source) ref.source = source;
  return ref;
}

function applyObservedAt(
  target: { firstObservedAt?: string; lastObservedAt?: string },
  timestamp: string | undefined,
): void {
  if (!timestamp) return;
  if (!target.firstObservedAt || timestamp < target.firstObservedAt) target.firstObservedAt = timestamp;
  if (!target.lastObservedAt || timestamp > target.lastObservedAt) target.lastObservedAt = timestamp;
}

function finalize(
  header: ArtifactHeader,
  source: RuntimeGraphObservationReportSource,
  nodes: RuntimeGraphObservationNode[],
  edges: RuntimeGraphObservationEdge[],
  handoffEvents: number,
  ignoredRows: number,
  parseErrors: number,
): RuntimeGraphObservationReport {
  // The factory recomputes observedNodes/observedEdges (trusting
  // handoffEvents/ignoredRows/parseErrors), dedupes + sorts, and asserts.
  // No coverage, no drift, no runtime graph comparison.
  return createRuntimeGraphObservationReport({
    header,
    source,
    summary: { observedNodes: 0, observedEdges: 0, handoffEvents, ignoredRows, parseErrors },
    nodes,
    edges,
  });
}

function slug(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "x";
}

function optString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
