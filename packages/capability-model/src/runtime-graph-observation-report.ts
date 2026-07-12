// RuntimeGraphObservationReport v1 builder.
//
// Generates an **observed runtime graph** from a raw runtime event log
// (`.rekon/handoff-events.jsonl`). Handoff rows preserve workflow flow;
// execution rows connect tests to source files and routes actually observed
// during execution. Both carry counts, timestamps, and line evidence.
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
// - docs/artifacts/runtime-graph-observation-report.md

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type RuntimeGraphObservationEdge,
  type RuntimeGraphObservationCoverageSource,
  type RuntimeGraphObservationEvidenceRef,
  type RuntimeGraphObservationNode,
  type RuntimeGraphObservationNodeSource,
  type RuntimeGraphObservationReport,
  type RuntimeGraphObservationReportSource,
  createRuntimeGraphObservationReport,
} from "@rekon/kernel-repo-model";

/** Default raw runtime event log path. */
export const RUNTIME_GRAPH_OBSERVATION_EVENT_LOG_PATH = ".rekon/handoff-events.jsonl";
/** Stable header `artifactId` prefix; the timestamp piece varies. */
export const RUNTIME_GRAPH_OBSERVATION_ARTIFACT_ID_PREFIX = "runtime-graph-observation-report-";
/** Event log kind for observed handoffs. */
export const RUNTIME_GRAPH_OBSERVATION_EVENT_KIND = "handoff_event";
/** Instrumentation event that records a test observing a source path or route. */
export const RUNTIME_GRAPH_EXECUTION_OBSERVATION_EVENT_KIND = "execution_observation";

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

export type ParsedRuntimeExecutionObservation = {
  line: number;
  testPath: string;
  sourcePaths: string[];
  routePaths: string[];
  timestamp?: string;
  source?: string;
};

export type ParseRuntimeGraphObservationEventLogResult = {
  handoffEvents: ParsedRuntimeGraphObservationEvent[];
  executionObservations: ParsedRuntimeExecutionObservation[];
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
  executionObservations?: ParsedRuntimeExecutionObservation[];
  coverageSources?: RuntimeGraphObservationCoverageSource[];
  handoffCoverageReportRef?: ArtifactRef;
  handoffContractRef?: ArtifactRef;
  stepCapabilityGraphRef?: ArtifactRef;
};

/**
 * Parse a raw `.rekon/handoff-events.jsonl` string line by line. Only lines
 * whose parsed kind is `handoff_event` or `execution_observation` become
 * observed events. Execution paths must be repository-relative and routes
 * must be absolute route paths; unsafe or incomplete rows are ignored.
 * Other valid JSON rows increment `ignoredRows`; invalid JSON lines increment
 * `parseErrors` and do not abort. Blank lines are skipped.
 */
export function parseRuntimeGraphObservationEventLog(
  input: { eventLog: string },
): ParseRuntimeGraphObservationEventLogResult {
  const handoffEvents: ParsedRuntimeGraphObservationEvent[] = [];
  const executionObservations: ParsedRuntimeExecutionObservation[] = [];
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
    if (!isRecord(parsed)) {
      ignoredRows += 1;
      return;
    }
    if (parsed.kind === RUNTIME_GRAPH_EXECUTION_OBSERVATION_EVENT_KIND) {
      const testPath = normalizeRepoRelativePath(optString(parsed.testPath));
      const sourcePaths = normalizedRepoPaths(parsed.sourcePaths, parsed.sourcePath);
      const routePaths = normalizedRoutePaths(parsed.routePaths, parsed.routePath);
      if (!testPath || (sourcePaths.length === 0 && routePaths.length === 0)) {
        ignoredRows += 1;
        return;
      }
      const observation: ParsedRuntimeExecutionObservation = {
        line,
        testPath,
        sourcePaths,
        routePaths,
      };
      const timestamp = optString(parsed.timestamp);
      if (timestamp) observation.timestamp = timestamp;
      const source = optString(parsed.source);
      if (source) observation.source = source;
      executionObservations.push(observation);
      return;
    }
    if (parsed.kind !== RUNTIME_GRAPH_OBSERVATION_EVENT_KIND) {
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
  return { handoffEvents, executionObservations, ignoredRows, parseErrors };
}

/**
 * Build a `RuntimeGraphObservationReport` from optional raw runtime events and
 * normalized execution observations. The builder reads no files or upstream
 * artifact contents; callers supply content, digests, provenance, and refs.
 */
export function buildRuntimeGraphObservationReport(
  input: BuildRuntimeGraphObservationReportInput,
): RuntimeGraphObservationReport {
  const source: RuntimeGraphObservationReportSource = {};
  if (input.handoffCoverageReportRef) source.handoffCoverageReportRef = input.handoffCoverageReportRef;
  if (input.handoffContractRef) source.handoffContractRef = input.handoffContractRef;
  if (input.stepCapabilityGraphRef) source.stepCapabilityGraphRef = input.stepCapabilityGraphRef;
  if (input.coverageSources && input.coverageSources.length > 0) {
    source.coverageSources = input.coverageSources;
  }

  if (input.eventLog !== undefined) {
    if (input.eventLogPath) source.eventLogPath = input.eventLogPath;
    if (input.eventLogHash) source.eventLogHash = input.eventLogHash;
  }

  const parsed = input.eventLog === undefined
    ? { handoffEvents: [], executionObservations: [], ignoredRows: 0, parseErrors: 0 }
    : parseRuntimeGraphObservationEventLog({ eventLog: input.eventLog });
  const handoffEvents = parsed.handoffEvents;
  const executionObservations = [
    ...parsed.executionObservations,
    ...(input.executionObservations ?? []).flatMap((observation) => {
      const normalized = normalizeExecutionObservation(observation);
      return normalized ? [normalized] : [];
    }),
  ];

  const nodeMap = new Map<string, RuntimeGraphObservationNode>();
  const edgeMap = new Map<string, RuntimeGraphObservationEdge>();

  for (const event of handoffEvents) {
    const ts = event.timestamp;
    const src = event.source;
    if (event.fromStepId) upsertNode(nodeMap, `step:${slug(event.fromStepId)}`, "step", event.fromStepId, "handoff-event-log", event.line, ts, src);
    if (event.toStepId) upsertNode(nodeMap, `step:${slug(event.toStepId)}`, "step", event.toStepId, "handoff-event-log", event.line, ts, src);
    if (event.feature) upsertNode(nodeMap, `feature:${slug(event.feature)}`, "feature", event.feature, "handoff-event-log", event.line, ts, src);
    if (event.name) upsertNode(nodeMap, `event:${slug(event.name)}`, "event", event.name, "handoff-event-log", event.line, ts, src);
    if (event.source) upsertNode(nodeMap, `source:${slug(event.source)}`, "source", event.source, "handoff-event-log", event.line, ts, src);

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

  for (const observation of executionObservations) {
    const testNodeId = `test:${observation.testPath}`;
    upsertNode(
      nodeMap,
      testNodeId,
      "test",
      observation.testPath,
      "runtime-event-log",
      observation.line,
      observation.timestamp,
      observation.source,
    );
    for (const sourcePath of observation.sourcePaths) {
      const fileNodeId = `file:${sourcePath}`;
      upsertNode(nodeMap, fileNodeId, "file", sourcePath, "runtime-event-log", observation.line, observation.timestamp, observation.source);
      upsertExecutionEdge(edgeMap, testNodeId, fileNodeId, observation);
    }
    for (const routePath of observation.routePaths) {
      const routeNodeId = `route:${routePath}`;
      upsertNode(nodeMap, routeNodeId, "route", routePath, "runtime-event-log", observation.line, observation.timestamp, observation.source);
      upsertExecutionEdge(edgeMap, testNodeId, routeNodeId, observation);
    }
  }

  return finalize(
    input.header,
    source,
    [...nodeMap.values()],
    [...edgeMap.values()],
    handoffEvents.length,
    executionObservations.length,
    parsed.ignoredRows,
    parsed.parseErrors,
  );
}

function upsertNode(
  map: Map<string, RuntimeGraphObservationNode>,
  id: string,
  kind: RuntimeGraphObservationNode["kind"],
  label: string,
  nodeSource: RuntimeGraphObservationNodeSource,
  line: number,
  timestamp: string | undefined,
  source: string | undefined,
): void {
  let node = map.get(id);
  if (!node) {
    node = { id, kind, label, source: nodeSource, observedCount: 0, evidenceRefs: [] };
    map.set(id, node);
  }
  node.observedCount += 1;
  node.evidenceRefs.push(evidenceRef(line, timestamp, source));
  applyObservedAt(node, timestamp);
}

function upsertExecutionEdge(
  map: Map<string, RuntimeGraphObservationEdge>,
  fromNodeId: string,
  toNodeId: string,
  observation: ParsedRuntimeExecutionObservation,
): void {
  const id = `observed-execution:${fromNodeId}:${toNodeId}`;
  let edge = map.get(id);
  if (!edge) {
    edge = {
      id,
      kind: "observed-execution",
      fromNodeId,
      toNodeId,
      observedCount: 0,
      evidenceRefs: [],
    };
    map.set(id, edge);
  }
  edge.observedCount += 1;
  edge.evidenceRefs.push(evidenceRef(observation.line, observation.timestamp, observation.source));
  applyObservedAt(edge, observation.timestamp);
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
  executionObservations: number,
  ignoredRows: number,
  parseErrors: number,
): RuntimeGraphObservationReport {
  // The factory recomputes observedNodes/observedEdges (trusting
  // event counts/ignoredRows/parseErrors), dedupes + sorts, and asserts.
  // No coverage, no drift, no runtime graph comparison.
  return createRuntimeGraphObservationReport({
    header,
    source,
    summary: {
      observedNodes: 0,
      observedEdges: 0,
      handoffEvents,
      ...(executionObservations > 0 ? { executionObservations } : {}),
      ignoredRows,
      parseErrors,
    },
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

function normalizedRepoPaths(plural: unknown, singular: unknown): string[] {
  const values = [
    ...(Array.isArray(plural) ? plural : []),
    singular,
  ];
  return [...new Set(values.flatMap((value) => {
    const path = normalizeRepoRelativePath(optString(value));
    return path ? [path] : [];
  }))].sort();
}

function normalizeExecutionObservation(
  value: ParsedRuntimeExecutionObservation,
): ParsedRuntimeExecutionObservation | undefined {
  const testPath = normalizeRepoRelativePath(value?.testPath);
  const sourcePaths = normalizedRepoPaths(value?.sourcePaths, undefined);
  const routePaths = normalizedRoutePaths(value?.routePaths, undefined);
  if (!testPath || (sourcePaths.length === 0 && routePaths.length === 0)) return undefined;
  return {
    line: typeof value.line === "number" && Number.isInteger(value.line) && value.line >= 0 ? value.line : 0,
    testPath,
    sourcePaths,
    routePaths,
    ...(typeof value.timestamp === "string" && value.timestamp.length > 0 ? { timestamp: value.timestamp } : {}),
    ...(typeof value.source === "string" && value.source.length > 0 ? { source: value.source } : {}),
  };
}

function normalizeRepoRelativePath(value: string | undefined): string | undefined {
  if (!value || value.includes("\0") || value.includes("\\")) return undefined;
  if (value.startsWith("/") || /^[a-zA-Z]:/.test(value)) return undefined;
  const parts = value.split("/");
  if (parts.some((part) => part === "..")) return undefined;
  const normalized = parts.filter((part) => part.length > 0 && part !== ".").join("/");
  return normalized.length > 0 ? normalized : undefined;
}

function normalizedRoutePaths(plural: unknown, singular: unknown): string[] {
  const values = [
    ...(Array.isArray(plural) ? plural : []),
    singular,
  ];
  return [...new Set(values.flatMap((value) => {
    const route = normalizeRoutePath(optString(value));
    return route ? [route] : [];
  }))].sort();
}

function normalizeRoutePath(value: string | undefined): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("\0")) {
    return undefined;
  }
  const path = value.split(/[?#]/, 1)[0] ?? "";
  const parts = path.split("/");
  if (parts.some((part) => part === "..")) return undefined;
  const normalized = `/${parts.filter((part) => part.length > 0 && part !== ".").join("/")}`;
  return normalized === "/" || normalized.length > 1 ? normalized : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
