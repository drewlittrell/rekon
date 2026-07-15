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
      "  try { use(first); } catch (error: any) { use(error); }",
      "  type PromiseValue = Promise<any>;",
      "  const promiseValue: PromiseValue = Promise.resolve(first);",
      "  const required = input!.value;",
      "  try { use(first); } catch {}",
      "  try { use(second); } catch (error) { console.error(error); }",
      "  use(required);",
      "  use(promiseValue);",
      "}",
      "function pending() { throw new Error('Not implemented'); }",
      "export function clearValidationCache(): void {",
      "  // This is a no-op but provided for API completeness.",
      "}",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    assert.equal(facts.filter((fact) => fact.kind === "typescript:source-quality").length, 8);

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
    const sourceQualityAssessments = report.assessments.filter((assessment) => [
      "typescript.errorSuppression",
      "typescript.placeholderImplementation",
      "typescript.typeEscape",
    ].includes(assessment.ruleId));

    assert.equal(findings.summary.total, 0);
    assert.equal(validateAssessmentReport(report).ok, true);
    assert.equal(sourceQualityAssessments.length, 5);
    assert.equal(sourceQualityAssessments.every((assessment) => assessment.kind === "risk"), true);
    assert.deepEqual([...new Set(sourceQualityAssessments.map((assessment) => assessment.ruleId))].sort(), [
      "typescript.errorSuppression",
      "typescript.placeholderImplementation",
      "typescript.typeEscape",
    ]);
    const anyRisk = sourceQualityAssessments.find((assessment) => assessment.details.signal === "as_any_assertion");
    assert.equal(anyRisk.details.occurrenceCount, 2);
    assert.equal(anyRisk.details.locations.length, 2);
    const explicitAnyRisk = sourceQualityAssessments.find(
      (assessment) => assessment.details.signal === "explicit_any_annotation",
    );
    assert.equal(explicitAnyRisk.title, "Explicit any annotation bypasses type safety");
    assert.equal(explicitAnyRisk.details.occurrenceCount, 1);
    assert.equal(sourceQualityAssessments.some((assessment) => assessment.details.signal === "empty_catch"), false);
    assert.equal(sourceQualityAssessments.some((assessment) => assessment.details.signal === "non_null_assertion"), false);
    const noopRisk = sourceQualityAssessments.find((assessment) => assessment.details.signal === "explicit_noop_contract");
    assert.equal(noopRisk.title, "Exported action contract is a no-op");
    assert.equal(report.assessments.every((assessment) => assessment.evidence.length > 0), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("generated and vendored source retains evidence without entering source-quality policy", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-generated-source-quality-"));
  try {
    await mkdir(join(root, "src", "generated"), { recursive: true });
    await mkdir(join(root, "src", "compiled", "dependency"), { recursive: true });
    await mkdir(join(root, "src", "vendor", "dependency"), { recursive: true });
    await writeFile(join(root, "src", "generated", "client.ts"), [
      "// @generated",
      "try { await persist(); } catch (error) { console.error(error); }",
    ].join("\n"), "utf8");
    await writeFile(join(root, "src", "compiled", "dependency", "index.js"),
      "try { persist(); } catch (error) { console.error(error); }\n", "utf8");
    await writeFile(join(root, "src", "vendor", "dependency", "index.js"),
      "try { persist(); } catch (error) { console.error(error); }\n", "utf8");
    await writeFile(join(root, "src", "application.ts"),
      "try { persist(); } catch (error) { console.error(error); }\n", "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const rawSuppressions = facts.filter(
      (fact) => fact.kind === "typescript:source-quality" && fact.value.signal === "catch_only_logs",
    );
    assert.deepEqual(rawSuppressions.map((fact) => fact.value.path).sort(), [
      "src/application.ts",
      "src/compiled/dependency/index.js",
      "src/generated/client.ts",
      "src/vendor/dependency/index.js",
    ]);
    assert.equal(facts.some(
      (fact) => fact.kind === "content_signal"
        && fact.subject === "src/generated/client.ts"
        && fact.value.signal === "generatedFile",
    ), true);

    const runtime = await createRuntime({
      repoRoot: root,
      repoId: "generated-source-quality-fixture",
      capabilities: [policyCapability],
      logger,
    });
    await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "generated-source-quality-evidence",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-15T00:00:00.000Z",
        subject: { repoId: "generated-source-quality-fixture" },
        producer: { id: "@rekon/capability-js-ts", version: "1.0.0" },
        inputRefs: [],
        freshness: { status: "fresh" },
        provenance: { confidence: 0.9 },
      },
      facts,
    });

    const refs = await runtime.runEvaluate();
    const report = await runtime.artifacts.read(refs.find((ref) => ref.type === "AssessmentReport"));
    const suppressions = report.assessments.filter(
      (assessment) => assessment.ruleId === "typescript.errorSuppression",
    );

    assert.equal(suppressions.length, 1);
    assert.deepEqual(suppressions[0].files, ["src/application.ts"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("empty production files and concrete constant-empty query APIs remain distinct evidence classes", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-empty-source-contracts-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "empty.ts"), "\n", "utf8");
    await writeFile(join(root, "src", "empty-shim.ts"), "\n", "utf8");
    await writeFile(join(root, "package.json"), JSON.stringify({
      name: "empty-source-fixture",
      exports: { "./empty-shim": "./src/empty-shim.ts" },
    }), "utf8");
    await writeFile(join(root, "src", "repository.ts"), [
      "export class UserRepository {",
      "  async getUser(_id: string): Promise<object | null> { return null; }",
      "  async searchUsers(_query: string): Promise<object[]> { return []; }",
      "  async getRealUser(id: string): Promise<object> { return { id }; }",
      "  private getInternal(_id: string): object | null { return null; }",
      "}",
      "export class NullUserRepository {",
      "  async getUser(_id: string): Promise<object | null> { return null; }",
      "}",
      "export function registerDefaultComponents(): void {",
      "  // For now, this will be populated by application bootstrap.",
      "}",
      "export function clearReadCache(): void {",
      "  // Intentionally empty: values are read on demand and there is no cache.",
      "}",
      "function ActionSheetButton(): null { return null; }",
      "class AbstractCursor {",
      "  /** @abstract */",
      "  moveNext() { throw new Error('Not implemented.'); }",
      "}",
      "function requireTransport(invoke: boolean): void {",
      "  if (!invoke) throw new Error('send is required when invoke is not implemented');",
      "}",
      "async function requestCollection(session: { send(): Promise<{ type: string }> }): Promise<void> {",
      "  const result = await session.send();",
      "  if (result.type === 'exception') throw new Error('Method not implemented.');",
      "}",
      "class Formatter {",
      "  format() { throw new Error('format() is not implemented'); }",
      "}",
      "class JsonFormatter extends Formatter {",
      "  format() { return '{}'; }",
      "}",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const signals = facts
      .filter((fact) => fact.kind === "typescript:source-quality")
      .map((fact) => ({ path: fact.value.path, signal: fact.value.signal, detail: fact.value.detail }))
      .sort((left, right) => left.path.localeCompare(right.path)
        || left.signal.localeCompare(right.signal)
        || String(left.detail).localeCompare(String(right.detail)));

    assert.deepEqual(signals, [
      { path: "src/empty-shim.ts", signal: "empty_source_file", detail: undefined },
      { path: "src/empty.ts", signal: "empty_source_file", detail: undefined },
      { path: "src/repository.ts", signal: "constant_empty_query_method", detail: "getUser" },
      { path: "src/repository.ts", signal: "constant_empty_query_method", detail: "searchUsers" },
      { path: "src/repository.ts", signal: "explicit_noop_contract", detail: "registerDefaultComponents" },
    ]);

    const runtime = await createRuntime({ repoRoot: root, repoId: "empty-source-fixture", capabilities: [policyCapability], logger });
    await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "empty-source-evidence",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-14T00:00:00.000Z",
        subject: { repoId: "empty-source-fixture" },
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
    const placeholders = report.assessments
      .filter((assessment) => assessment.ruleId === "typescript.placeholderImplementation")
      .sort((left, right) => left.details.signal.localeCompare(right.details.signal));
    const emptyFiles = report.assessments.filter((assessment) => assessment.ruleId === "dead_code.emptySourceFile");

    assert.equal(findings.summary.total, 0);
    assert.equal(placeholders.length, 2);
    assert.deepEqual(placeholders.map((assessment) => assessment.details.signal), [
      "constant_empty_query_method",
      "explicit_noop_contract",
    ]);
    assert.equal(placeholders[0].details.occurrenceCount, 2);
    assert.equal(emptyFiles.length, 1);
    assert.deepEqual(emptyFiles[0].files, ["src/empty.ts"]);
    assert.equal(emptyFiles[0].kind, "opportunity");
    assert.equal(emptyFiles[0].confidence.verification, "verified");
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

test("compiler-proven unused private members and unreachable code become verified opportunities", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-private-dead-code-opportunity-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "tsconfig.json"), JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext" },
      include: ["src/**/*.ts"],
    }), "utf8");
    await writeFile(join(root, "src", "index.ts"), [
      "export class Example {",
      "  private unusedMethod() { return 1; }",
      "  #unusedField = 2;",
      "  private readonly _brand!: 'Example';",
      "}",
      "export function value() {",
      "  return 1;",
      "  console.log('unreachable');",
      "}",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const runtime = await createRuntime({ repoRoot: root, repoId: "private-dead-code-fixture", capabilities: [policyCapability], logger });
    await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "private-dead-code-evidence",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-13T00:00:00.000Z",
        subject: { repoId: "private-dead-code-fixture" },
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
    const opportunities = report.assessments
      .filter((assessment) => ["typescript.unusedPrivateMember", "typescript.unreachableCode"].includes(assessment.ruleId))
      .sort((left, right) => left.ruleId.localeCompare(right.ruleId));

    assert.equal(findings.findings.some((finding) => finding.ruleId === "typescript.compilerDiagnostic"), false);
    assert.deepEqual(opportunities.map((assessment) => assessment.ruleId), [
      "typescript.unreachableCode",
      "typescript.unusedPrivateMember",
    ]);
    assert.equal(opportunities.every((assessment) => assessment.kind === "opportunity"), true);
    assert.equal(opportunities.every((assessment) => assessment.confidence.verification === "verified"), true);
    assert.equal(
      opportunities.find((assessment) => assessment.ruleId === "typescript.unusedPrivateMember").details.occurrenceCount,
      2,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("source-local unused private fields remain opportunities when project imports do not resolve", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-private-source-local-opportunity-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "tsconfig.json"), JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext" },
      include: ["src/**/*.ts"],
    }), "utf8");
    await writeFile(join(root, "src", "index.ts"), [
      "import type { Missing } from './missing.js';",
      "export class Example {",
      "  private writtenOnly = false;",
      "  private observed = false;",
      "  private consumedCounter = 0;",
      "  private objectCounter = 0;",
      "  private savePromise = Promise.resolve();",
      "  update(_input: Missing) { this.writtenOnly = true; this.observed = true; return this.observed; }",
      "  next() { return ++this.consumedCounter; }",
      "  nextObject() { return { id: this.objectCounter++ }; }",
      "  save() { this.savePromise = this.savePromise.then(() => undefined); }",
      "}",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const runtime = await createRuntime({ repoRoot: root, repoId: "private-source-local-fixture", capabilities: [policyCapability], logger });
    await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "private-source-local-evidence",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-14T00:00:00.000Z",
        subject: { repoId: "private-source-local-fixture" },
        producer: { id: "@rekon/capability-js-ts", version: "1.0.0" },
        inputRefs: [],
        freshness: { status: "fresh" },
        provenance: { confidence: 0.9 },
      },
      facts,
    });

    const refs = await runtime.runEvaluate();
    const report = await runtime.artifacts.read(refs.find((ref) => ref.type === "AssessmentReport"));
    const opportunities = report.assessments.filter(
      (assessment) => assessment.ruleId === "typescript.unusedPrivateMember",
    );

    assert.equal(opportunities.length, 1);
    assert.equal(opportunities[0].kind, "opportunity");
    assert.equal(opportunities[0].confidence.verification, "verified");
    assert.equal(opportunities[0].details.occurrenceCount, 1);
    assert.equal(opportunities[0].details.locations[0].detail, "writtenOnly");
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
      "new Promise(async (resolve, reject) => { try { resolve(await Promise.resolve(1)); } catch (error) { reject(error); } });",
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
    await mkdir(join(root, "test", "unit", "test"), { recursive: true });
    await writeFile(join(root, "tests", "focus.test.ts"), [
      "import test from 'node:test';",
      "test.only('focused', () => { process.env.FEATURE = 'on'; });",
      "fit('also focused', () => {});",
      "test('ordinary', () => {});",
    ].join("\n"), "utf8");
    await writeFile(join(root, "test", "unit", "test", "only.test.ts"), [
      "test.only('verifies focused-test behavior', () => {});",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: true });
    const signals = facts
      .filter((fact) => fact.kind === "typescript:source-quality")
      .map((fact) => ({ signal: fact.value.signal, detail: fact.value.detail }))
      .sort((left, right) => left.signal.localeCompare(right.signal) || String(left.detail).localeCompare(String(right.detail)));
    assert.deepEqual(signals, [
      { signal: "focused_test", detail: "fit" },
      { signal: "focused_test", detail: "test.only" },
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
    assert.deepEqual(
      qualityRisks.filter((assessment) => assessment.ruleId === "tests.focused").flatMap((assessment) => assessment.files),
      ["tests/focus.test.ts"],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("handled effect promises and guaranteed environment cleanup are not risks", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-source-quality-cleanup-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(join(root, "tests"), { recursive: true });
    await writeFile(join(root, "src", "effect.ts"), [
      "declare function useEffect(callback: () => void, deps: unknown[]): void;",
      "useEffect(() => {",
      "  async function load() { try { await Promise.resolve(); } catch {} }",
      "  load();",
      "}, []);",
      "async function persist() { await Promise.resolve(); }",
      "persist();",
    ].join("\n"), "utf8");
    await writeFile(join(root, "tests", "after-each.test.ts"), [
      "declare function afterEach(callback: () => void): void;",
      "declare function test(name: string, callback: () => void): void;",
      "function resetEnv() { delete process.env.FEATURE; }",
      "afterEach(() => { resetEnv(); });",
      "test('cleaned', () => { process.env.FEATURE = 'on'; });",
    ].join("\n"), "utf8");
    await writeFile(join(root, "tests", "finally.test.ts"), [
      "declare function test(name: string, callback: () => void): void;",
      "test('cleaned', () => {",
      "  const previous = process.env.MODE;",
      "  process.env.MODE = 'test';",
      "  try { runWithTestMode(); }",
      "  finally { process.env.MODE = previous; }",
      "});",
    ].join("\n"), "utf8");
    await writeFile(join(root, "tests", "following-finally.test.ts"), [
      "declare function test(name: string, callback: () => void): void;",
      "test('cleaned', () => {",
      "  const previousA = process.env.MODE_A;",
      "  const previousB = process.env.MODE_B;",
      "  process.env.MODE_A = 'test';",
      "  process.env.MODE_B = 'test';",
      "  try { runWithTestMode(); }",
      "  finally { process.env.MODE_A = previousA; process.env.MODE_B = previousB; }",
      "});",
    ].join("\n"), "utf8");
    await writeFile(join(root, "tests", "whole-env-after-each.test.ts"), [
      "declare function afterEach(callback: () => void): void;",
      "declare function test(name: string, callback: () => void): void;",
      "const originalEnv = { ...process.env };",
      "afterEach(() => { process.env = { ...originalEnv }; });",
      "test('cleaned', () => { process.env.MODE = 'test'; });",
    ].join("\n"), "utf8");
    await writeFile(join(root, "tests", "suite-cleanup.test.ts"), [
      "declare function after(callback: () => void): void;",
      "declare function test(name: string, callback: () => void): void;",
      "after(() => { delete process.env.FEATURE; });",
      "test('cleaned', () => { process.env.FEATURE = 'on'; });",
    ].join("\n"), "utf8");
    await writeFile(join(root, "tests", "direct-restore.test.ts"), [
      "declare function test(name: string, callback: () => void): void;",
      "test('cleaned', () => {",
      "  const previous = process.env.MODE;",
      "  process.env.MODE = 'test';",
      "  runWithTestMode();",
      "  process.env.MODE = previous;",
      "});",
    ].join("\n"), "utf8");
    await writeFile(join(root, "tests", "restore-only.test.ts"), [
      "declare function test(name: string, callback: () => void): void;",
      "test('does not mutate the environment', () => {",
      "  const originalMode = process.env.MODE;",
      "  runWithoutChangingMode();",
      "  process.env.MODE = originalMode;",
      "});",
    ].join("\n"), "utf8");
    await writeFile(join(root, "tests", "leaky.test.ts"), [
      "declare function test(name: string, callback: () => void): void;",
      "test('leaks', () => { process.env.LEAK = 'yes'; });",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: true });
    const signals = facts
      .filter((fact) => fact.kind === "typescript:source-quality")
      .map((fact) => ({ path: fact.value.path, signal: fact.value.signal, detail: fact.value.detail }))
      .filter((fact) => fact.signal === "floating_local_async_call" || fact.signal === "test_global_state_mutation")
      .sort((left, right) => left.path.localeCompare(right.path));

    assert.deepEqual(signals, [
      { path: "src/effect.ts", signal: "floating_local_async_call", detail: "persist" },
      { path: "tests/leaky.test.ts", signal: "test_global_state_mutation", detail: "process.env.LEAK" },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
