// HandoffCoverageReport v1 builder.
//
// Compares declared `HandoffContract` handoffs against an optional raw
// handoff event log (`.rekon/handoff-events.jsonl`) and emits per-handoff
// coverage rows: `covered` / `uncovered` / `unresolved-contract` /
// `added-observed` / `not-evaluated`.
//
// **Boundary.** This is **handoff-event coverage, not VerificationRun
// command success**. A **missing** event log yields `not-evaluated` rows
// (not `uncovered`); a **present** log with no match yields `uncovered`.
// v1 reads only a raw handoff event log directly (not a full runtime
// graph), creates no `RuntimeGraphObservationReport`, detects no drift,
// creates no `WorkOrder` / `VerificationPlan`, and mutates nothing (the
// contract or the event log).
//
// The builder does **not** read files: the CLI reads the optional event
// log and passes its content + hash in. Invalid JSON lines are counted as
// `parseErrors` and never abort the report.
//
// See:
// - docs/strategy/handoff-coverage-report-v1-decision.md
// - docs/artifacts/handoff-coverage-report.md
// - docs/concepts/handoff-coverage.md

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type HandoffCoverageMatchMethod,
  type HandoffCoverageObservedEventRef,
  type HandoffCoverageReport,
  type HandoffCoverageReportSource,
  type HandoffCoverageRow,
  createHandoffCoverageReport,
} from "@rekon/kernel-repo-model";

/** Optional raw handoff event log path (observed handoff events only). */
export const HANDOFF_EVENT_LOG_PATH = ".rekon/handoff-events.jsonl";
/** Stable header `artifactId` prefix; the timestamp piece varies. */
export const HANDOFF_COVERAGE_REPORT_ARTIFACT_ID_PREFIX = "handoff-coverage-report-";
/** Only event log lines with this `kind` are considered observed handoffs. */
export const HANDOFF_EVENT_KIND = "handoff_event";

/** A single parsed `handoff_event` line. */
export type ParsedHandoffEvent = {
  line: number;
  name?: string;
  feature?: string;
  fromStepId?: string;
  toStepId?: string;
  timestamp?: string;
  source?: string;
};

export type ParseHandoffEventLogResult = {
  events: ParsedHandoffEvent[];
  parseErrors: number;
};

/** Structural view of a HandoffContract. capability-model reads it by
 *  shape (no class dependency). */
export type HandoffCoverageContractLike = {
  header?: ArtifactHeader;
  handoffs?: Array<{
    id?: string;
    status?: string;
    fromStepId?: string;
    toStepId?: string;
    feature?: string;
    event?: { name?: string; kind?: string };
  }>;
};

export type BuildHandoffCoverageReportInput = {
  header: ArtifactHeader;
  handoffContract: HandoffCoverageContractLike;
  handoffContractRef: ArtifactRef;
  /** Raw JSONL event log content. `undefined` means **no log** present
   *  (declared handoffs become `not-evaluated`). An empty string means an
   *  **empty** log present (declared handoffs become `uncovered`). */
  eventLog?: string;
  eventLogPath?: string;
  eventLogHash?: string;
};

/**
 * Parse a raw `.rekon/handoff-events.jsonl` string line by line. Only
 * lines whose parsed `kind === "handoff_event"` become events; other valid
 * JSON rows are ignored. Invalid JSON lines increment `parseErrors` and do
 * not abort. Blank lines are skipped. The input is never mutated.
 */
export function parseHandoffEventLog(input: { eventLog: string }): ParseHandoffEventLogResult {
  const events: ParsedHandoffEvent[] = [];
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
    if (!isRecord(parsed) || parsed.kind !== HANDOFF_EVENT_KIND) return;
    const event: ParsedHandoffEvent = { line };
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
    const source = optString(parsed.source);
    if (source) event.source = source;
    events.push(event);
  });
  return { events, parseErrors };
}

/**
 * Build a `HandoffCoverageReport` from a `HandoffContract` + optional raw
 * handoff event log content. The builder reads no files and reads no
 * runtime graph artifacts; the CLI supplies event log content + hash.
 */
export function buildHandoffCoverageReport(input: BuildHandoffCoverageReportInput): HandoffCoverageReport {
  const handoffs = Array.isArray(input.handoffContract.handoffs) ? input.handoffContract.handoffs : [];
  const rows: HandoffCoverageRow[] = [];

  const source: HandoffCoverageReportSource = {
    handoffContractRef: input.handoffContractRef,
  };

  // No event log present → declared handoffs are not-evaluated; unresolved
  // contract rows are still surfaced. No event log is recorded in source.
  if (input.eventLog === undefined) {
    for (const handoff of handoffs) {
      if (!handoff || typeof handoff.id !== "string" || handoff.id.length === 0) continue;
      rows.push(
        handoff.status === "unresolved-step"
          ? unresolvedContractRow(handoff)
          : notEvaluatedRow(handoff),
      );
    }
    return finalize(input.header, source, rows, 0);
  }

  // Event log present → record its path/hash and evaluate coverage.
  if (input.eventLogPath) source.eventLogPath = input.eventLogPath;
  if (input.eventLogHash) source.eventLogHash = input.eventLogHash;

  const { events, parseErrors } = parseHandoffEventLog({ eventLog: input.eventLog });
  const consumed = new Set<number>();

  for (const handoff of handoffs) {
    if (!handoff || typeof handoff.id !== "string" || handoff.id.length === 0) continue;
    if (handoff.status === "unresolved-step") {
      rows.push(unresolvedContractRow(handoff));
      continue;
    }
    const { method, matches } = matchHandoff(handoff, events);
    if (matches.length > 0) {
      for (const event of matches) consumed.add(event.line);
      rows.push(coveredRow(handoff, method, matches));
    } else {
      rows.push(uncoveredRow(handoff));
    }
  }

  // Observed handoff_event lines with no declared match → added-observed.
  // Events consumed by a declared match are never also added-observed.
  for (const event of events) {
    if (consumed.has(event.line)) continue;
    rows.push(addedObservedRow(event));
  }

  return finalize(input.header, source, rows, parseErrors);
}

type ContractHandoffLike = NonNullable<HandoffCoverageContractLike["handoffs"]>[number];

/**
 * Pick the match method for a declared handoff and return matching observed
 * events. Method priority: event name → feature → step pair. Never matches
 * by title / prose.
 */
function matchHandoff(
  handoff: ContractHandoffLike,
  events: ParsedHandoffEvent[],
): { method: HandoffCoverageMatchMethod; matches: ParsedHandoffEvent[] } {
  const eventName = optString(handoff.event?.name);
  if (eventName) {
    return { method: "event-name", matches: events.filter((event) => event.name === eventName) };
  }
  const feature = optString(handoff.feature);
  if (feature) {
    return { method: "feature", matches: events.filter((event) => event.feature === feature) };
  }
  const fromStepId = optString(handoff.fromStepId);
  const toStepId = optString(handoff.toStepId);
  if (fromStepId && toStepId) {
    return {
      method: "step-pair",
      matches: events.filter((event) => event.fromStepId === fromStepId && event.toStepId === toStepId),
    };
  }
  return { method: "none", matches: [] };
}

function notEvaluatedRow(handoff: ContractHandoffLike): HandoffCoverageRow {
  const row = baseRow(handoff, "not-evaluated", "none", 0);
  row.messages = ["No handoff event log present; coverage was not evaluated for this handoff."];
  return row;
}

function unresolvedContractRow(handoff: ContractHandoffLike): HandoffCoverageRow {
  const row = baseRow(handoff, "unresolved-contract", "none", 0);
  row.messages = [
    "Handoff contract row is unresolved-step; resolve its step ids in the StepCapabilityGraph before coverage can be evaluated.",
  ];
  return row;
}

function uncoveredRow(handoff: ContractHandoffLike): HandoffCoverageRow {
  const row = baseRow(handoff, "uncovered", "none", 0);
  row.messages = ["Declared handoff has no matching observed handoff_event in the event log."];
  return row;
}

function coveredRow(
  handoff: ContractHandoffLike,
  method: HandoffCoverageMatchMethod,
  matches: ParsedHandoffEvent[],
): HandoffCoverageRow {
  const row = baseRow(handoff, "covered", method, matches.length);
  row.observedEventRefs = matches.map(toObservedEventRef);
  return row;
}

function addedObservedRow(event: ParsedHandoffEvent): HandoffCoverageRow {
  const row: HandoffCoverageRow = {
    id: `added-observed:${event.line}`,
    status: "added-observed",
    matchMethod: "none",
    observedCount: 1,
    observedEventRefs: [toObservedEventRef(event)],
  };
  if (event.feature) row.feature = event.feature;
  if (event.name) row.eventName = event.name;
  if (event.fromStepId) row.fromStepId = event.fromStepId;
  if (event.toStepId) row.toStepId = event.toStepId;
  row.messages = ["Observed handoff_event has no declared handoff in the HandoffContract."];
  return row;
}

function baseRow(
  handoff: ContractHandoffLike,
  status: HandoffCoverageRow["status"],
  method: HandoffCoverageMatchMethod,
  observedCount: number,
): HandoffCoverageRow {
  const row: HandoffCoverageRow = {
    id: handoff.id as string,
    handoffId: handoff.id as string,
    status,
    matchMethod: method,
    observedCount,
  };
  const feature = optString(handoff.feature);
  if (feature) row.feature = feature;
  const eventName = optString(handoff.event?.name);
  if (eventName) row.eventName = eventName;
  const fromStepId = optString(handoff.fromStepId);
  if (fromStepId) row.fromStepId = fromStepId;
  const toStepId = optString(handoff.toStepId);
  if (toStepId) row.toStepId = toStepId;
  return row;
}

function toObservedEventRef(event: ParsedHandoffEvent): HandoffCoverageObservedEventRef {
  const ref: HandoffCoverageObservedEventRef = { line: event.line };
  if (event.timestamp) ref.timestamp = event.timestamp;
  if (event.source) ref.source = event.source;
  return ref;
}

function finalize(
  header: ArtifactHeader,
  source: HandoffCoverageReportSource,
  rows: HandoffCoverageRow[],
  parseErrors: number,
): HandoffCoverageReport {
  // The factory recomputes the summary (except parseErrors, which it trusts),
  // sorts contract rows before added-observed, and asserts. No drift, no
  // runtime graph, no WorkOrder / VerificationPlan.
  return createHandoffCoverageReport({
    header,
    source,
    summary: {
      totalDeclared: 0,
      covered: 0,
      uncovered: 0,
      unresolvedContract: 0,
      addedObserved: 0,
      notEvaluated: 0,
      parseErrors,
    },
    rows,
  });
}

function optString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
