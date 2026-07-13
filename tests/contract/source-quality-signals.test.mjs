import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { jsTsProvider } from "../../packages/capability-js-ts/dist/index.js";
import policyCapability from "../../packages/capability-policy/dist/index.js";
import { validateAssessmentReport } from "../../packages/kernel-assessments/dist/index.js";
import { createRuntime } from "../../packages/runtime/dist/index.js";

const logger = { info() {}, warn() {}, error() {} };

test("source quality signals become fused risks rather than findings", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-source-quality-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "quality.ts"), [
      "declare function use(value: unknown): void;",
      "function inspect(input?: { value: string }) {",
      "  const first = input as any;",
      "  const second = input as any;",
      "  const required = input!.value;",
      "  try { use(first); } catch {}",
      "  try { use(second); } catch (error) { console.error(error); }",
      "  use(required);",
      "}",
      "function pending() { throw new Error('Not implemented'); }",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    assert.equal(facts.filter((fact) => fact.kind === "typescript:source-quality").length, 6);

    const runtime = await createRuntime({ repoRoot: root, repoId: "quality-fixture", capabilities: [policyCapability], logger });
    await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "quality-evidence",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-10T00:00:00.000Z",
        subject: { repoId: "quality-fixture" },
        producer: { id: "@rekon/capability-js-ts", version: "1.0.0" },
        inputRefs: [],
        freshness: { status: "fresh" },
        provenance: { confidence: 0.9 },
      },
      facts,
    });

    const refs = await runtime.runEvaluate();
    const findingRef = refs.find((ref) => ref.type === "FindingReport");
    const assessmentRef = refs.find((ref) => ref.type === "AssessmentReport");
    const findings = await runtime.artifacts.read(findingRef);
    const report = await runtime.artifacts.read(assessmentRef);

    assert.equal(findings.summary.total, 0);
    assert.equal(validateAssessmentReport(report).ok, true);
    assert.equal(report.assessments.length, 5);
    assert.equal(report.assessments.every((assessment) => assessment.kind === "risk"), true);
    assert.deepEqual([...new Set(report.assessments.map((assessment) => assessment.ruleId))].sort(), [
      "typescript.errorSuppression",
      "typescript.placeholderImplementation",
      "typescript.typeEscape",
    ]);
    const anyRisk = report.assessments.find((assessment) => assessment.details.signal === "as_any_assertion");
    assert.equal(anyRisk.details.occurrenceCount, 2);
    assert.equal(anyRisk.details.locations.length, 2);
    assert.equal(report.assessments.every((assessment) => assessment.evidence.length > 0), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("compiler-proven unused imports become verified opportunities rather than type errors", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-unused-import-opportunity-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "tsconfig.json"), JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext" },
      include: ["src/**/*.ts"],
    }), "utf8");
    await writeFile(join(root, "src", "values.ts"), "export const used = 1;\nexport const unused = 2;\n", "utf8");
    await writeFile(join(root, "src", "index.ts"), [
      'import { used, unused } from "./values.js";',
      "export const value = used;",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const runtime = await createRuntime({ repoRoot: root, repoId: "unused-import-fixture", capabilities: [policyCapability], logger });
    await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "unused-import-evidence",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-13T00:00:00.000Z",
        subject: { repoId: "unused-import-fixture" },
        producer: { id: "@rekon/capability-js-ts", version: "1.0.0" },
        inputRefs: [],
        freshness: { status: "fresh" },
        provenance: { confidence: 0.9 },
      },
      facts,
    });

    const refs = await runtime.runEvaluate();
    const findings = await runtime.artifacts.read(refs.find((ref) => ref.type === "FindingReport"));
    const report = await runtime.artifacts.read(refs.find((ref) => ref.type === "AssessmentReport"));
    const opportunities = report.assessments.filter((assessment) => assessment.ruleId === "typescript.unusedImport");

    assert.equal(findings.findings.some((finding) => finding.ruleId === "typescript.compilerDiagnostic"), false);
    assert.equal(opportunities.length, 1);
    assert.equal(opportunities[0].kind, "opportunity");
    assert.equal(opportunities[0].type, "dead_code");
    assert.equal(opportunities[0].confidence.verification, "verified");
    assert.equal(opportunities[0].details.occurrenceCount, 1);
    assert.match(opportunities[0].details.locations[0].detail, /unused.*never read/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("async control-flow signals require known language semantics and remain risks", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-async-control-flow-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "hazards.ts"), [
      "const values = [1, 2, 3];",
      "const typed: number[] = values;",
      "const asserted = [1, 2, 3] as number[];",
      "new Promise(async (resolve) => { resolve(await Promise.resolve(1)); });",
      "values.forEach(async (value) => { await Promise.resolve(value); });",
      "typed.filter(async (value) => value > await Promise.resolve(0));",
      "typed.sort(async (left, right) => await Promise.resolve(left - right));",
      "asserted.some(async (value) => value === await Promise.resolve(1));",
      "async function persist() { await Promise.resolve(); }",
      "persist();",
      "await persist();",
      "void persist();",
      "declare const custom: { forEach(callback: (value: number) => Promise<void>): void };",
      "custom.forEach(async (value) => { await Promise.resolve(value); });",
      "values.map(async (value) => await Promise.resolve(value));",
    ].join("\n"), "utf8");
    await writeFile(join(root, "src", "shadowed.ts"), [
      "function run(Promise: new (executor: (resolve: (value: number) => void) => void) => object) {",
      "  return new Promise(async (resolve) => { resolve(1); });",
      "}",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const signals = facts
      .filter((fact) => fact.kind === "typescript:source-quality")
      .map((fact) => ({ path: fact.value.path, signal: fact.value.signal, detail: fact.value.detail }))
      .sort((left, right) => left.signal.localeCompare(right.signal) || String(left.detail).localeCompare(String(right.detail)));
    assert.deepEqual(signals, [
      { path: "src/hazards.ts", signal: "async_for_each_callback", detail: "forEach" },
      { path: "src/hazards.ts", signal: "async_promise_executor", detail: undefined },
      { path: "src/hazards.ts", signal: "async_sync_array_callback", detail: "filter" },
      { path: "src/hazards.ts", signal: "async_sync_array_callback", detail: "some" },
      { path: "src/hazards.ts", signal: "async_sync_array_callback", detail: "sort" },
      { path: "src/hazards.ts", signal: "floating_local_async_call", detail: "persist" },
    ]);

    const runtime = await createRuntime({ repoRoot: root, repoId: "async-fixture", capabilities: [policyCapability], logger });
    await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "async-evidence",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-11T00:00:00.000Z",
        subject: { repoId: "async-fixture" },
        producer: { id: "@rekon/capability-js-ts", version: "1.0.0" },
        inputRefs: [],
        freshness: { status: "fresh" },
        provenance: { confidence: 0.9 },
      },
      facts,
    });

    const refs = await runtime.runEvaluate();
    const findings = await runtime.artifacts.read(refs.find((ref) => ref.type === "FindingReport"));
    const report = await runtime.artifacts.read(refs.find((ref) => ref.type === "AssessmentReport"));
    const asyncRisks = report.assessments.filter((assessment) => assessment.type === "async_control_flow");

    assert.equal(findings.summary.total, 0);
    assert.equal(asyncRisks.length, 4);
    assert.deepEqual([...new Set(asyncRisks.map((assessment) => assessment.ruleId))].sort(), [
      "typescript.asyncArrayCallback",
      "typescript.asyncPromiseExecutor",
      "typescript.floatingPromise",
    ]);
    const syncCallback = asyncRisks.find((assessment) => assessment.details.signal === "async_sync_array_callback");
    assert.equal(syncCallback.details.occurrenceCount, 3);
    assert.deepEqual(syncCallback.details.locations.map((location) => location.detail), ["filter", "sort", "some"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("focused tests and direct test environment mutation remain explicit risks", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-test-quality-"));
  try {
    await mkdir(join(root, "tests"), { recursive: true });
    await writeFile(join(root, "tests", "focus.test.ts"), [
      "import test from 'node:test';",
      "test.only('focused', () => { process.env.FEATURE = 'on'; });",
      "fit('also focused', () => {});",
      "test('ordinary', () => {});",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: true });
    const signals = facts
      .filter((fact) => fact.kind === "typescript:source-quality")
      .map((fact) => ({ signal: fact.value.signal, detail: fact.value.detail }))
      .sort((left, right) => left.signal.localeCompare(right.signal) || String(left.detail).localeCompare(String(right.detail)));
    assert.deepEqual(signals, [
      { signal: "focused_test", detail: "fit" },
      { signal: "focused_test", detail: "test.only" },
      { signal: "test_global_state_mutation", detail: "process.env.FEATURE" },
    ]);

    const runtime = await createRuntime({ repoRoot: root, repoId: "test-quality-fixture", capabilities: [policyCapability], logger });
    await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "test-quality-evidence",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-11T00:00:00.000Z",
        subject: { repoId: "test-quality-fixture" },
        producer: { id: "@rekon/capability-js-ts", version: "1.0.0" },
        inputRefs: [],
        freshness: { status: "fresh" },
        provenance: { confidence: 0.9 },
      },
      facts,
    });
    const refs = await runtime.runEvaluate();
    const findings = await runtime.artifacts.read(refs.find((ref) => ref.type === "FindingReport"));
    const report = await runtime.artifacts.read(refs.find((ref) => ref.type === "AssessmentReport"));
    const qualityRisks = report.assessments.filter((assessment) => assessment.ruleId === "tests.focused" || assessment.ruleId === "tests.isolation");
    assert.equal(findings.summary.total, 0);
    assert.deepEqual(qualityRisks.map((assessment) => assessment.ruleId).sort(), ["tests.focused", "tests.isolation"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
