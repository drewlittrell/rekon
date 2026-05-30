// Contract tests for HandoffCoverageReport v1 (sixty-eighth slice on the
// capability-ontology track).
//
// HandoffCoverageReport v1 compares declared HandoffContract handoffs
// against an optional raw handoff event log (.rekon/handoff-events.jsonl).
// A MISSING log yields not-evaluated rows (not uncovered); a PRESENT log
// with no match yields uncovered. It is handoff-event coverage, NOT
// VerificationRun command success. It creates no RuntimeGraphObservationReport
// / RuntimeGraphDriftReport / WorkOrder / VerificationPlan, detects no
// drift, and mutates nothing.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  buildHandoffCoverageReport,
  parseHandoffEventLog,
} from "../../packages/capability-model/dist/index.js";
import {
  validateHandoffCoverageReport,
} from "../../packages/kernel-repo-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "tests/fixtures/js-ts-ast-evidence");

const CONTRACT_REF = { type: "HandoffContract", id: "hc-1", schemaVersion: "0.1.0" };

function header() {
  return {
    artifactType: "HandoffCoverageReport",
    artifactId: "handoff-coverage-report-test-1",
    schemaVersion: "0.1.0",
    generatedAt: "2026-05-29T00:00:00.000Z",
    subject: { repoId: "test" },
    producer: { id: "@rekon/test", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
    provenance: { confidence: 0.85 },
  };
}

function jsonl(...lines) {
  return lines.join("\n") + "\n";
}

function build({ handoffs, eventLog, eventLogPath, eventLogHash } = {}) {
  return buildHandoffCoverageReport({
    header: header(),
    handoffContract: { handoffs },
    handoffContractRef: CONTRACT_REF,
    eventLog,
    eventLogPath,
    eventLogHash,
  });
}

function rowById(report, id) {
  return report.rows.find((r) => r.id === id);
}

// ---------- 1: validates ----------
test("HandoffCoverageReport validates", () => {
  const r = build({
    handoffs: [{ id: "h1", status: "declared", fromStepId: "a", toStepId: "b", event: { name: "e1" } }],
    eventLog: jsonl(JSON.stringify({ kind: "handoff_event", name: "e1" })),
    eventLogPath: ".rekon/handoff-events.jsonl",
    eventLogHash: "deadbeef",
  });
  assert.equal(validateHandoffCoverageReport(r).ok, true);
});

// ---------- 2: missing log -> not-evaluated ----------
test("missing event log emits not-evaluated rows for declared handoffs", () => {
  const r = build({ handoffs: [{ id: "h1", status: "declared", fromStepId: "a", toStepId: "b", feature: "f" }] });
  assert.equal(rowById(r, "h1").status, "not-evaluated");
  assert.equal(r.summary.notEvaluated, 1);
});

// ---------- 3: missing log != uncovered ----------
test("missing event log does not mark declared handoffs uncovered", () => {
  const r = build({ handoffs: [{ id: "h1", status: "declared", fromStepId: "a", toStepId: "b" }] });
  assert.equal(r.summary.uncovered, 0);
  assert.ok(!r.rows.some((row) => row.status === "uncovered"));
});

// ---------- 4: covered by event-name ----------
test("present log with matching event.name emits covered with event-name match", () => {
  const r = build({
    handoffs: [{ id: "h1", status: "declared", fromStepId: "a", toStepId: "b", feature: "f", event: { name: "e1" } }],
    eventLog: jsonl(JSON.stringify({ kind: "handoff_event", name: "e1", feature: "f" })),
  });
  const row = rowById(r, "h1");
  assert.equal(row.status, "covered");
  assert.equal(row.matchMethod, "event-name");
  assert.equal(row.observedCount, 1);
});

// ---------- 5: covered by feature ----------
test("present log with matching feature emits covered with feature match", () => {
  const r = build({
    handoffs: [{ id: "h1", status: "declared", fromStepId: "a", toStepId: "b", feature: "f1" }],
    eventLog: jsonl(JSON.stringify({ kind: "handoff_event", feature: "f1" })),
  });
  const row = rowById(r, "h1");
  assert.equal(row.status, "covered");
  assert.equal(row.matchMethod, "feature");
});

// ---------- 6: covered by step pair ----------
test("present log with matching fromStepId+toStepId emits covered with step-pair match", () => {
  const r = build({
    handoffs: [{ id: "h1", status: "declared", fromStepId: "a", toStepId: "b" }],
    eventLog: jsonl(JSON.stringify({ kind: "handoff_event", fromStepId: "a", toStepId: "b" })),
  });
  const row = rowById(r, "h1");
  assert.equal(row.status, "covered");
  assert.equal(row.matchMethod, "step-pair");
});

// ---------- 7: multiple matches increment observedCount ----------
test("multiple matching events increment observedCount", () => {
  const r = build({
    handoffs: [{ id: "h1", status: "declared", fromStepId: "a", toStepId: "b", event: { name: "e1" } }],
    eventLog: jsonl(
      JSON.stringify({ kind: "handoff_event", name: "e1" }),
      JSON.stringify({ kind: "handoff_event", name: "e1" }),
    ),
  });
  const row = rowById(r, "h1");
  assert.equal(row.status, "covered");
  assert.equal(row.observedCount, 2);
  assert.equal(row.observedEventRefs.length, 2);
});

// ---------- 8: present log, no match -> uncovered ----------
test("present log with no match emits uncovered", () => {
  const r = build({
    handoffs: [{ id: "h1", status: "declared", fromStepId: "a", toStepId: "b", event: { name: "e1" } }],
    eventLog: jsonl(JSON.stringify({ kind: "handoff_event", name: "other" })),
  });
  const row = rowById(r, "h1");
  assert.equal(row.status, "uncovered");
  assert.equal(row.observedCount, 0);
});

// ---------- 9: unresolved-step -> unresolved-contract ----------
test("unresolved-step contract row emits unresolved-contract", () => {
  const r = build({
    handoffs: [{ id: "h1", status: "unresolved-step", fromStepId: "x", toStepId: "y" }],
    eventLog: jsonl(JSON.stringify({ kind: "handoff_event", name: "e1" })),
  });
  const row = rowById(r, "h1");
  assert.equal(row.status, "unresolved-contract");
  assert.equal(row.observedCount, 0);
});

// ---------- 10: unmatched observed event -> added-observed ----------
test("unmatched observed handoff_event emits added-observed", () => {
  const r = build({
    handoffs: [{ id: "h1", status: "declared", fromStepId: "a", toStepId: "b", event: { name: "e1" } }],
    eventLog: jsonl(JSON.stringify({ kind: "handoff_event", name: "zzz" })),
  });
  const added = r.rows.filter((row) => row.status === "added-observed");
  assert.equal(added.length, 1);
  assert.equal(added[0].eventName, "zzz");
  assert.equal(added[0].observedCount, 1);
});

// ---------- 11: non-handoff_event row ignored ----------
test("non-handoff_event JSON row is ignored", () => {
  const r = build({
    handoffs: [{ id: "h1", status: "declared", fromStepId: "a", toStepId: "b", event: { name: "e1" } }],
    eventLog: jsonl(JSON.stringify({ kind: "other_event", name: "x" })),
  });
  assert.equal(r.summary.addedObserved, 0);
  assert.equal(r.summary.parseErrors, 0);
  assert.equal(rowById(r, "h1").status, "uncovered");
});

// ---------- 12: invalid JSON -> parseErrors, no crash ----------
test("invalid JSON line increments parseErrors and does not crash", () => {
  const r = build({
    handoffs: [{ id: "h1", status: "declared", fromStepId: "a", toStepId: "b", event: { name: "e1" } }],
    eventLog: jsonl("{bad json", JSON.stringify({ kind: "handoff_event", name: "e1" })),
  });
  assert.equal(r.summary.parseErrors, 1);
  assert.equal(rowById(r, "h1").status, "covered");
  // parser surfaces the same count directly
  assert.equal(parseHandoffEventLog({ eventLog: jsonl("{bad", "also bad") }).parseErrors, 2);
});

// ---------- 13: consumed matched events not re-added ----------
test("consumed matched events are not also added-observed", () => {
  const r = build({
    handoffs: [{ id: "h1", status: "declared", fromStepId: "a", toStepId: "b", event: { name: "e1" } }],
    eventLog: jsonl(JSON.stringify({ kind: "handoff_event", name: "e1" })),
  });
  assert.equal(r.summary.addedObserved, 0);
  assert.ok(!r.rows.some((row) => row.status === "added-observed"));
});

// ---------- 14: summary counts ----------
test("summary counts totalDeclared/covered/uncovered/unresolvedContract/addedObserved/notEvaluated/parseErrors", () => {
  const r = build({
    handoffs: [
      { id: "h-cov", status: "declared", fromStepId: "a", toStepId: "b", event: { name: "e1" } },
      { id: "h-unc", status: "declared", fromStepId: "c", toStepId: "d", event: { name: "none" } },
      { id: "h-unr", status: "unresolved-step", fromStepId: "x", toStepId: "y" },
    ],
    eventLog: jsonl(
      JSON.stringify({ kind: "handoff_event", name: "e1" }),
      JSON.stringify({ kind: "handoff_event", name: "extra" }),
      "{bad json",
    ),
  });
  assert.deepEqual(r.summary, {
    totalDeclared: 3,
    covered: 1,
    uncovered: 1,
    unresolvedContract: 1,
    addedObserved: 1,
    notEvaluated: 0,
    parseErrors: 1,
  });
  assert.equal(validateHandoffCoverageReport(r).ok, true);
});

// ---------- 15: deterministic ordering ----------
test("deterministic row ordering (contract rows by id, then added-observed)", () => {
  const r = build({
    handoffs: [
      { id: "z-declared", status: "declared", fromStepId: "a", toStepId: "b", event: { name: "e1" } },
      { id: "a-declared", status: "declared", fromStepId: "c", toStepId: "d", event: { name: "none" } },
    ],
    eventLog: jsonl(
      JSON.stringify({ kind: "handoff_event", name: "e1" }),
      JSON.stringify({ kind: "handoff_event", name: "observed-extra" }),
    ),
  });
  assert.equal(r.rows[0].id, "a-declared");
  assert.equal(r.rows[1].id, "z-declared");
  assert.equal(r.rows[2].status, "added-observed");
  assert.equal(r.rows.at(-1).status, "added-observed");
});

// ---------- CLI integration (16-25) ----------

let cachedWorkspace;

function runCli(cwd, args, { allowFailure = false } = {}) {
  const result = spawnSync(process.execPath, [cliPath, "--root", cwd, ...args], { cwd, encoding: "utf8" });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`CLI failed: ${args.join(" ")}\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`);
  }
  return result;
}

function indexSnapshot(rawIndex, type) {
  return JSON.parse(rawIndex)
    .filter((e) => e.type === type)
    .map((e) => ({ id: e.id, digest: e.digest }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function getWorkspace() {
  if (cachedWorkspace) return cachedWorkspace;
  const work = await mkdtemp(join(tmpdir(), "rekon-hcr-"));
  await cp(exampleRoot, work, { recursive: true });
  await rm(join(work, ".rekon"), { recursive: true, force: true });
  runCli(work, ["init"]);
  runCli(work, ["refresh", "--json"]);
  runCli(work, ["capability", "ontology", "normalize", "--json"]);
  const nref = runCli(work, ["artifacts", "latest", "--type", "CapabilityNormalizationReport", "--id-only"]).stdout.trim();
  runCli(work, ["capability", "phrase", "project", "--report", nref, "--json"]);
  runCli(work, ["refresh", "--json"]);

  await mkdir(join(work, ".rekon"), { recursive: true });
  await writeFile(join(work, ".rekon/step-capability-map.json"), JSON.stringify({
    version: "0.1.0",
    steps: [
      { id: "fixture.create-user", label: "Create User", capabilities: [{ verb: "create", noun: "user" }], paths: ["src/"], systems: ["fixture"] },
      { id: "fixture.persist-user", label: "Persist User", capabilities: [{ verb: "save", noun: "user" }], paths: ["src/"], systems: ["fixture"] },
    ],
  }, null, 2), "utf8");
  runCli(work, ["step", "graph", "build", "--json"]);

  await writeFile(join(work, ".rekon/handoff-contracts.json"), JSON.stringify({
    version: "0.1.0",
    handoffs: [
      {
        id: "fixture.create-to-persist",
        fromStepId: "fixture.create-user",
        toStepId: "fixture.persist-user",
        feature: "fixture-user",
        event: { name: "fixture.user.persist", kind: "handoff_event" },
      },
      { id: "fixture.create-to-missing", fromStepId: "fixture.create-user", toStepId: "missing.step", feature: "fixture-missing" },
      { id: "fixture.uncovered", fromStepId: "fixture.persist-user", toStepId: "fixture.create-user", feature: "fixture-uncovered" },
    ],
  }, null, 2), "utf8");
  runCli(work, ["handoff", "contract", "build", "--json"]);

  // Raw handoff event log: line 1 matches the declared event name, line 2 is
  // an unmatched observed event, line 3 is a non-handoff_event row, line 4 is
  // invalid JSON.
  const eventLogPath = join(work, ".rekon/handoff-events.jsonl");
  const eventLogContent = [
    JSON.stringify({ kind: "handoff_event", name: "fixture.user.persist", feature: "fixture-user", fromStepId: "fixture.create-user", toStepId: "fixture.persist-user", timestamp: "2026-05-30T00:00:00.000Z", source: "smoke" }),
    JSON.stringify({ kind: "handoff_event", name: "fixture.extra", feature: "fixture-extra", fromStepId: "fixture.extra-from", toStepId: "fixture.extra-to", timestamp: "2026-05-30T00:00:01.000Z", source: "smoke" }),
    JSON.stringify({ kind: "other_event", name: "ignored" }),
    "{bad json",
  ].join("\n") + "\n";
  await writeFile(eventLogPath, eventLogContent, "utf8");

  // Custom event log for the explicit --event-log flag.
  const customEventLogRel = ".rekon/custom-events.jsonl";
  await writeFile(join(work, customEventLogRel), JSON.stringify({ kind: "handoff_event", name: "fixture.user.persist" }) + "\n", "utf8");

  const indexPath = join(work, ".rekon/registry/artifacts.index.json");
  const beforeIndex = await readFile(indexPath, "utf8");
  const eventLogBefore = await readFile(eventLogPath, "utf8");

  const contractRef = runCli(work, ["artifacts", "latest", "--type", "HandoffContract", "--id-only"]).stdout.trim();
  const reportResult = runCli(work, ["handoff", "coverage", "report", "--handoff-contract", contractRef, "--json"]);
  const customResult = runCli(work, ["handoff", "coverage", "report", "--event-log", customEventLogRel, "--json"]);

  const afterIndex = await readFile(indexPath, "utf8");
  const eventLogAfter = await readFile(eventLogPath, "utf8");
  const validateResult = runCli(work, ["artifacts", "validate", "--json"]);

  cachedWorkspace = {
    work,
    reportJson: JSON.parse(reportResult.stdout),
    customJson: JSON.parse(customResult.stdout),
    beforeIndex,
    afterIndex,
    eventLogBefore,
    eventLogAfter,
    validateJson: JSON.parse(validateResult.stdout),
  };
  return cachedWorkspace;
}

test("CLI writes HandoffCoverageReport", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.reportJson.artifact.type, "HandoffCoverageReport");
  assert.ok(indexSnapshot(ws.afterIndex, "HandoffCoverageReport").length >= 1);
  assert.deepEqual(ws.reportJson.summary, {
    totalDeclared: 3,
    covered: 1,
    uncovered: 1,
    unresolvedContract: 1,
    addedObserved: 1,
    notEvaluated: 0,
    parseErrors: 1,
  });
});

test("CLI supports pinned HandoffContract", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.reportJson.source.handoffContractRef.type, "HandoffContract");
  assert.equal(ws.reportJson.source.eventLogPath, ".rekon/handoff-events.jsonl");
});

test("CLI supports explicit --event-log", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.customJson.source.eventLogPath, ".rekon/custom-events.jsonl");
  // The custom log only contains the matching event -> covered=1, no extras.
  assert.equal(ws.customJson.summary.covered, 1);
  assert.equal(ws.customJson.summary.addedObserved, 0);
  assert.equal(ws.customJson.summary.parseErrors, 0);
});

test("CLI does not mutate .rekon/handoff-events.jsonl", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.eventLogAfter, ws.eventLogBefore);
});

test("CLI does not mutate HandoffContract", async () => {
  const ws = await getWorkspace();
  assert.deepEqual(indexSnapshot(ws.afterIndex, "HandoffContract"), indexSnapshot(ws.beforeIndex, "HandoffContract"));
});

test("CLI does not create RuntimeGraphObservationReport", async () => {
  const ws = await getWorkspace();
  assert.equal(indexSnapshot(ws.afterIndex, "RuntimeGraphObservationReport").length, 0);
});

test("CLI does not create RuntimeGraphDriftReport", async () => {
  const ws = await getWorkspace();
  assert.equal(indexSnapshot(ws.afterIndex, "RuntimeGraphDriftReport").length, 0);
});

test("CLI does not create WorkOrder", async () => {
  const ws = await getWorkspace();
  assert.equal(indexSnapshot(ws.afterIndex, "WorkOrder").length, 0);
});

test("CLI does not create VerificationPlan", async () => {
  const ws = await getWorkspace();
  assert.equal(indexSnapshot(ws.afterIndex, "VerificationPlan").length, 0);
});

test("artifacts validate remains clean", async () => {
  const ws = await getWorkspace();
  assert.equal(ws.validateJson.valid, true);
  assert.equal((ws.validateJson.issues || []).length, 0);
  await rm(ws.work, { recursive: true, force: true });
});
