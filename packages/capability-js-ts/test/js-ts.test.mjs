import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import capability, {
  extractAbortListenerLifetimeEvidence,
  extractAbortReasonDropEvidence,
  extractAsyncEffectContinuationEvidence,
  extractCacheContractEvidence,
  extractCacheKeyNormalizationEvidence,
  extractCacheRevalidationEvidence,
  extractCleanupCompletenessEvidence,
  extractDefaultOptionOverrideEvidence,
  extractModeDefaultOverrideEvidence,
  extractPendingCallbackCleanupEvidence,
  extractAutoImportPathPreferenceEvidence,
  extractDependencyCandidateBypassEvidence,
  extractDependencyExplicitSourceEvidence,
  extractDependencyNamespaceAmbiguityEvidence,
  extractDependencyResolutionEvidence,
  extractErrorControlFlowEvidence,
  extractErrorCodeWrappingEvidence,
  extractErrorReasonPropagationEvidence,
  extractPromiseEventErrorBridgeEvidence,
  extractPromiseCacheRejectionEvidence,
  extractOptionFalsyDefaultEvidence,
  extractOptionPropagationEvidence,
  extractRequestSignalForwardingEvidence,
  extractOwnedBrowserLifetimeEvidence,
  extractResourceLifetimeEvidence,
  extractTerminalEventListenerEvidence,
  extractReferencePositionEvidence,
  extractNestedLoopInitializationEvidence,
  extractScopeNameResolutionEvidence,
  extractScopeResolutionEvidence,
  extractScopeTraversalEscapeEvidence,
  extractSourceDependencies,
  extractTeardownInterruptionEvidence,
  jsTsProvider,
} from "../dist/index.js";

test("built-in capability uses defineCapability-compatible manifest", () => {
  assert.equal(capability.manifest.id, "@rekon/capability-js-ts");
  assert.deepEqual(capability.manifest.roles, ["evidence-provider"]);
  assert.deepEqual(capability.manifest.produces, ["EvidenceGraph"]);
});

test("source dependency extraction is AST-backed, resolved, and deterministic", () => {
  const dependencies = extractSourceDependencies(
    "src/index.ts",
    [
      "import type { Config } from './config.js';",
      "import { helper } from './helper.js';",
      "const lazy = import('./helper.js');",
      "import fs from 'node:fs';",
    ].join("\n"),
    new Set(["src/index.ts", "src/config.ts", "src/helper.ts"]),
  );

  assert.deepEqual(dependencies.map(({ specifier, resolvedPath }) => ({ specifier, resolvedPath })), [
    { specifier: "./config.js", resolvedPath: "src/config.ts" },
    { specifier: "./helper.js", resolvedPath: "src/helper.ts" },
    { specifier: "node:fs", resolvedPath: undefined },
  ]);
});

test("JS/TS provider emits facts with provenance and ignores generated directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(join(root, ".rekon"), { recursive: true });
    await mkdir(join(root, ".next", "server"), { recursive: true });
    await writeFile(join(root, "src", "index.ts"), [
      "import { helper } from './helper';",
      "export function greet(name: string) {",
      "  return helper(name);",
      "}",
      "export { helper };",
    ].join("\n"), "utf8");
    await writeFile(join(root, "src", "helper.ts"), "export const helper = (value: string) => value;\n", "utf8");
    await writeFile(join(root, ".rekon", "ignored.ts"), "export const ignored = true;\n", "utf8");
    await writeFile(join(root, ".next", "server", "ignored.js"), "export const generated = true;\n", "utf8");

    const facts = await jsTsProvider.extract({
      repoRoot: root,
      includeTests: false,
    });
    const kinds = new Set(facts.map((fact) => fact.kind));

    assert.equal(kinds.has("file"), true);
    assert.equal(kinds.has("import"), true);
    assert.equal(kinds.has("export"), true);
    assert.equal(kinds.has("symbol"), true);
    assert.equal(kinds.has("ownership_hint"), true);
    assert.equal(kinds.has("capability_hint"), true);
    assert.equal(
      facts.filter((fact) => fact.kind === "ownership_hint").every((fact) => fact.value.basis === "inferred"),
      true,
    );
    assert.equal(
      facts.filter((fact) => fact.kind === "file").every((fact) => typeof fact.value.digest === "string"),
      true,
    );
    assert.equal(facts.some((fact) => fact.subject.includes(".rekon")), false);
    assert.equal(facts.some((fact) => fact.subject.includes(".next")), false);
    assert.equal(facts.every((fact) => fact.provenance.pack === "@rekon/capability-js-ts"), true);
    assert.equal(facts.every((fact) => fact.provenance.extractorVersion === "0.1.0"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider supports changed-files incremental input", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "one.ts"), "export const one = 1;\n", "utf8");
    await writeFile(join(root, "src", "two.ts"), "export const two = 2;\n", "utf8");

    const facts = await jsTsProvider.extract({
      repoRoot: root,
      includeTests: false,
      incremental: true,
      changedFiles: ["src/two.ts"],
    });

    assert.equal(facts.some((fact) => fact.subject === "src/two.ts"), true);
    assert.equal(facts.some((fact) => fact.subject === "src/one.ts"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider emits stable compiler diagnostics and excludes dependency-resolution noise", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-diagnostics-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "tsconfig.json"), JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext" },
      include: ["src/**/*.ts"],
    }), "utf8");
    await writeFile(join(root, "src", "index.ts"), [
      "import { missing } from 'not-installed';",
      "export const value: string = 42;",
      "export const result = missing;",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const diagnostics = facts.filter((fact) => fact.kind === "typescript:diagnostic");

    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].value.code, 2322);
    assert.equal(diagnostics[0].value.phase, "semantic");
    assert.equal(diagnostics[0].value.line, 2);
    assert.equal(diagnostics[0].provenance.file, "src/index.ts");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider identifies compiler-proven unused imports even when repo config does not enable noUnusedLocals", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-unused-import-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "tsconfig.json"), JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", noUnusedLocals: false },
      include: ["src/**/*.ts"],
    }), "utf8");
    await writeFile(join(root, "src", "values.ts"), "export const used = 1;\nexport const unused = 2;\n", "utf8");
    await writeFile(join(root, "src", "index.ts"), [
      'import { used, unused } from "./values.js";',
      "export const value = used;",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const diagnostics = facts.filter((fact) => fact.kind === "typescript:diagnostic");
    const unused = diagnostics.filter((fact) => fact.value.purpose === "unused-import");

    assert.equal(unused.length, 1);
    assert.equal(unused[0].value.code, 6133);
    assert.equal(unused[0].value.line, 1);
    assert.match(unused[0].value.message, /unused.*never read/i);
    assert.equal(diagnostics.some((fact) => fact.value.purpose === "compiler-error"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider identifies compiler-proven unused private members and unreachable code only", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-private-dead-code-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "tsconfig.json"), JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext" },
      include: ["src/**/*.ts"],
    }), "utf8");
    await writeFile(join(root, "src", "index.ts"), [
      "export class Example {",
      "  private unusedMethod() { return 1; }",
      "  private usedMethod() { return 2; }",
      "  #unusedField = 3;",
      "  run() { return this.usedMethod(); }",
      "}",
      "export function demo() {",
      "  const ordinaryUnusedLocal = 1;",
      "  return 2;",
      "  console.log('unreachable');",
      "}",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const diagnostics = facts.filter((fact) => fact.kind === "typescript:diagnostic");
    const purposes = diagnostics.map((fact) => fact.value.purpose).sort();

    assert.deepEqual(purposes, ["unreachable-code", "unused-private-member", "unused-private-member"]);
    assert.equal(diagnostics.some((fact) => /ordinaryUnusedLocal/.test(String(fact.value.message))), false);
    assert.equal(diagnostics.filter((fact) => fact.value.purpose === "unreachable-code")[0].value.code, 7027);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider emits AST-backed source quality signals", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-quality-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "quality.ts"), [
      "function inspect(input?: { value: string }) {",
      "  const unsafe = input as any;",
      "  try { use(unsafe); } catch (error: any) { use(error); }",
      "  const required = input!.value;",
      "  try { use(unsafe); } catch {}",
      "  try { use(required); } catch (error) { console.error(error); }",
      "}",
      "function pending() { throw new Error('Not implemented'); }",
      "export function clearValidationCache(): void {",
      "  // This is a no-op but provided for API completeness.",
      "}",
      "export function _resetOntologyCache(): void {",
      "  // no-op: ontology is read on demand",
      "}",
      "function ActionSheetCancel() { return null; }",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const signals = facts
      .filter((fact) => fact.kind === "typescript:source-quality")
      .map((fact) => fact.value.signal)
      .sort();

    assert.deepEqual(signals, [
      "as_any_assertion",
      "catch_only_logs",
      "empty_catch",
      "explicit_any_annotation",
      "explicit_noop_contract",
      "non_null_assertion",
      "placeholder_throw",
    ]);
    assert.equal(facts.filter((fact) => fact.kind === "typescript:source-quality").every((fact) => fact.provenance.line > 0), true);
    assert.equal(facts.some((fact) => fact.kind === "content_signal" && fact.value.signal === "consoleLogging"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider detects inverse listener delegation and partial allowlist validation", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-defect-pairs-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "validation.ts"), [
      "export class Worker {",
      "  constructor(private emitter: { on(event: string, callback: () => void): void; off(event: string, callback: () => void): void }) {}",
      "  off(event: string, callback: () => void): void {",
      "    this.emitter.on(event, callback);",
      "  }",
      "  removeCorrectly(event: string, callback: () => void): void {",
      "    this.emitter.off(event, callback);",
      "  }",
      "}",
      "const allowedHandlerNameRegex = /[a-z-]/;",
      "export function validateHandlerName(key: string): void {",
      "  if (!allowedHandlerNameRegex.test(key)) throw new Error('key must only use a-z and -');",
      "}",
      "const validExtensionFileRegex = /\\.[a-z]+$/;",
      "export function hasValidExtension(path: string): boolean {",
      "  return validExtensionFileRegex.test(path);",
      "}",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const signals = facts
      .filter((fact) => fact.kind === "typescript:source-quality")
      .map((fact) => ({ signal: fact.value.signal, detail: fact.value.detail }));

    assert.deepEqual(signals, [
      { signal: "inverse_listener_delegation", detail: "off->on" },
      { signal: "unanchored_whole_value_allowlist", detail: "allowedHandlerNameRegex" },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("error-control-flow evidence distinguishes merged and identity-specific guards", async () => {
  const buggySource = [
    "const classify = error => ({ aborted: error?.name === 'AbortError', condition: error?.name === 'ConditionError' });",
    "export function run(conditionResult: boolean, signal: AbortSignal) {",
    "  if (conditionResult === false || signal.aborted) {",
    "    throw { name: 'ConditionError', message: 'condition failed' };",
    "  }",
    "}",
  ].join("\n");
  const fixedSource = [
    "const classify = error => ({ aborted: error?.name === 'AbortError', condition: error?.name === 'ConditionError' });",
    "export function run(conditionResult: boolean, signal: AbortSignal) {",
    "  if (conditionResult === false) {",
    "    throw { name: 'ConditionError', message: 'condition failed' };",
    "  }",
    "  if (signal.aborted) {",
    "    throw { name: 'AbortError', message: 'aborted' };",
    "  }",
    "}",
  ].join("\n");

  const buggy = extractErrorControlFlowEvidence({ path: "src/buggy.ts", content: buggySource });
  assert.equal(buggy.length, 1);
  assert.equal(buggy[0].errorIdentity, "ConditionError");
  assert.equal(buggy[0].expressionKind, "object");
  assert.deepEqual(buggy[0].guards[0], {
    kind: "if",
    expression: "conditionResult === false || signal.aborted",
    operator: "or",
    terms: ["conditionResult === false", "signal.aborted"],
    polarity: "when-true",
    location: { line: 3, column: 3 },
  });
  assert.deepEqual(buggy[0].identityMappings.map((mapping) => [mapping.identity, mapping.property]), [
    ["AbortError", "aborted"],
    ["ConditionError", "condition"],
  ]);

  const fixed = extractErrorControlFlowEvidence({ path: "src/fixed.ts", content: fixedSource });
  assert.deepEqual(fixed.map((entry) => ({
    identity: entry.errorIdentity,
    guard: entry.guards[0]?.expression,
    operator: entry.guards[0]?.operator,
  })), [
    { identity: "ConditionError", guard: "conditionResult === false", operator: "single" },
    { identity: "AbortError", guard: "signal.aborted", operator: "single" },
  ]);

  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-error-flow-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "fixed.ts"), fixedSource, "utf8");
    const facts = (await jsTsProvider.extract({ repoRoot: root, includeTests: false }))
      .filter((fact) => fact.kind === "error_flow");
    assert.equal(facts.length, 2);
    assert.equal(new Set(facts.map((fact) => fact.subject)).size, 2);
    assert.deepEqual(facts.map((fact) => fact.value.errorIdentity).sort(), ["AbortError", "ConditionError"]);
    assert.ok(facts.every((fact) => fact.value.identityMappings.length === 2));
    assert.ok(facts.every((fact) => fact.provenance.line === fact.value.line));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("error-reason evidence identifies cause values hidden behind a default message", async () => {
  const buggySource = [
    "export async function dispatch(params) {",
    "  await controller.abort(new AbortError(undefined, { cause: params.reason }));",
    "}",
  ].join("\n");
  const fixedSource = buggySource.replace(
    "new AbortError(undefined, { cause: params.reason })",
    "new AbortError(params.reason)",
  );

  const evidence = extractErrorReasonPropagationEvidence({ path: "src/dispatcher.ts", content: buggySource });
  assert.equal(evidence.length, 1);
  assert.deepEqual(evidence[0], {
    kind: "error-reason",
    caller: "dispatch",
    mechanism: "cause-with-default-message",
    errorIdentity: "AbortError",
    messageExpression: "undefined",
    causeExpression: "params.reason",
    location: { line: 2, column: 26 },
    messageLocation: { line: 2, column: 41 },
    causeLocation: { line: 2, column: 61 },
  });
  assert.deepEqual(extractErrorReasonPropagationEvidence({ path: "src/dispatcher.ts", content: fixedSource }), []);
  assert.deepEqual(extractErrorReasonPropagationEvidence({
    path: "src/dispatcher.ts",
    content: "new Envelope(undefined, { cause: params.reason });",
  }), []);
  assert.deepEqual(extractErrorReasonPropagationEvidence({
    path: "src/dispatcher.ts",
    content: "new AbortError(undefined, { cause: undefined });",
  }), []);
  assert.deepEqual(extractErrorReasonPropagationEvidence({
    path: "src/dispatcher.ts",
    content: "function dispatch(undefined) { return new AbortError(undefined, { cause: params.reason }); }",
  }), []);

  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-error-reason-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "dispatcher.ts"), buggySource, "utf8");
    const facts = (await jsTsProvider.extract({ repoRoot: root, includeTests: false }))
      .filter((fact) => fact.kind === "error_flow");
    assert.equal(facts.length, 1);
    assert.equal(facts[0].value.action, "construct");
    assert.equal(facts[0].value.mechanism, "cause-with-default-message");
    assert.equal(facts[0].value.causeExpression, "params.reason");
    assert.equal(facts[0].provenance.line, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("promise event bridge evidence identifies emitter errors that do not reach reject", async () => {
  const buggySource = [
    "export function read(zipPath, filePath) {",
    "  return openZip(zipPath).then(zipfile => {",
    "    return new Promise((resolve, reject) => {",
    "      zipfile.on('entry', entry => {",
    "        if (entry.fileName === filePath) {",
    "          openZipStream(zipfile, entry).then(stream => resolve(stream), err => reject(err));",
    "        }",
    "      });",
    "      zipfile.once('close', () => reject(new Error('not found')));",
    "    });",
    "  });",
    "}",
  ].join("\n");
  const fixedSource = buggySource.replace(
    "      zipfile.on('entry', entry => {",
    "      zipfile.once('error', err => reject(err));\n      zipfile.on('entry', entry => {",
  );

  const evidence = extractPromiseEventErrorBridgeEvidence({
    path: "src/zip.ts",
    content: buggySource,
  });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].kind, "promise-event-error-bridge");
  assert.equal(evidence[0].mechanism, "unforwarded-emitter-error");
  assert.equal(evidence[0].caller, "read");
  assert.equal(evidence[0].emitter, "zipfile");
  assert.deepEqual(evidence[0].successEvents, ["entry"]);
  assert.equal(evidence[0].rejectIdentifier, "reject");
  assert.deepEqual(evidence[0].location, { line: 3, column: 12 });
  assert.deepEqual(evidence[0].successListenerLocations, [{ line: 4, column: 7 }]);
  assert.equal(evidence[0].rejectionLocation.line, 6);

  assert.deepEqual(extractPromiseEventErrorBridgeEvidence({
    path: "src/zip.ts",
    content: fixedSource,
  }), []);
  assert.deepEqual(extractPromiseEventErrorBridgeEvidence({
    path: "src/zip.ts",
    content: buggySource.replace(
      "      zipfile.on('entry', entry => {",
      "      zipfile.once('error', reject);\n      zipfile.on('entry', entry => {",
    ),
  }), []);
  assert.deepEqual(extractPromiseEventErrorBridgeEvidence({
    path: "src/zip.ts",
    content: [
      "new Promise((resolve, reject) => {",
      "  zipfile.on('change', value => resolve(value));",
      "  rejectLater(reject);",
      "});",
    ].join("\n"),
  }), []);
  assert.deepEqual(extractPromiseEventErrorBridgeEvidence({
    path: "src/zip.ts",
    content: [
      "new Promise((resolve, reject) => {",
      "  zipfile.on('entry', resolve => resolve('local'));",
      "  reject(new Error('failed'));",
      "});",
    ].join("\n"),
  }), []);
  assert.deepEqual(extractPromiseEventErrorBridgeEvidence({
    path: "src/zip.ts",
    content: [
      "new Promise(resolve => {",
      "  zipfile.on('entry', value => resolve(value));",
      "});",
    ].join("\n"),
  }), []);
  assert.deepEqual(extractPromiseEventErrorBridgeEvidence({
    path: "src/zip.ts",
    content: [
      "function Promise() {}",
      "new Promise((resolve, reject) => {",
      "  zipfile.on('entry', value => resolve(value));",
      "  reject(new Error('failed'));",
      "});",
    ].join("\n"),
  }), []);

  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-event-error-bridge-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "zip.ts"), buggySource, "utf8");
    const facts = (await jsTsProvider.extract({ repoRoot: root, includeTests: false }))
      .filter((fact) =>
        fact.kind === "error_flow"
        && fact.value.mechanism === "unforwarded-emitter-error");
    assert.equal(facts.length, 1);
    assert.equal(facts[0].value.action, "bridge");
    assert.equal(facts[0].value.emitter, "zipfile");
    assert.deepEqual(facts[0].value.successEvents, ["entry"]);
    assert.equal(facts[0].provenance.line, 3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("dependency-flow evidence distinguishes conditional overwrite from first-match exit", async () => {
  const buggySource = [
    "export function resolve(children, name) {",
    "  let selected = null;",
    "  for (const child of children) {",
    "    if (!child.providers.has(name)) continue;",
    "    selected = child.providers.get(name)!;",
    "    if (!selected.pending) break;",
    "  }",
    "  return selected;",
    "}",
  ].join("\n");
  const fixedSource = buggySource.replace("if (!selected.pending) break;", "break;");

  const buggy = extractDependencyResolutionEvidence({ path: "src/buggy.ts", content: buggySource });
  assert.equal(buggy.length, 1);
  assert.equal(buggy[0].caller, "resolve");
  assert.equal(buggy[0].selectedBinding, "selected");
  assert.equal(buggy[0].candidateExpression, "child.providers.get(name)");
  assert.equal(buggy[0].exitKind, "conditional-break");
  assert.equal(buggy[0].exitCondition, "!selected.pending");
  assert.equal(buggy[0].returnedAfterLoop, true);

  const fixed = extractDependencyResolutionEvidence({ path: "src/fixed.ts", content: fixedSource });
  assert.equal(fixed.length, 1);
  assert.equal(fixed[0].exitKind, "unconditional-break");
  assert.equal(fixed[0].returnedAfterLoop, true);

  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-dependency-flow-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "buggy.ts"), buggySource, "utf8");
    const facts = (await jsTsProvider.extract({ repoRoot: root, includeTests: false }))
      .filter((fact) => fact.kind === "dependency_flow");
    assert.equal(facts.length, 1);
    assert.equal(facts[0].value.exitKind, "conditional-break");
    assert.equal(facts[0].value.returnedAfterLoop, true);
    assert.equal(facts[0].provenance.line, facts[0].value.selectionLocation.line);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("dependency-flow evidence identifies a resolver that bypasses its iterated candidate", async () => {
  const buggySource = [
    "export abstract class Resolver {",
    "  protected abstract get(token: string): unknown;",
    "  protected async resolvePerContext(typeOrToken: string) {",
    "    const instanceLinks = this.links.get(typeOrToken);",
    "    const pluckInstance = async (instanceLink) => {",
    "      const { wrapperRef } = instanceLink;",
    "      if (wrapperRef.isStatic()) {",
    "        return this.get(typeOrToken);",
    "      }",
    "      return wrapperRef.instance;",
    "    };",
    "    return Promise.all(instanceLinks.map(link => pluckInstance(link)));",
    "  }",
    "}",
  ].join("\n");
  const fixedSource = buggySource.replace("return this.get(typeOrToken);", "return wrapperRef.instance;");

  const evidence = extractDependencyCandidateBypassEvidence({ path: "src/resolver.ts", content: buggySource });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].caller, "resolvePerContext");
  assert.equal(evidence[0].resolver, "pluckInstance");
  assert.equal(evidence[0].mechanism, "iterated-candidate-bypass");
  assert.equal(evidence[0].candidateParameter, "instanceLink");
  assert.deepEqual(evidence[0].candidateBindings, ["instanceLink", "wrapperRef"]);
  assert.equal(evidence[0].collectionExpression, "instanceLinks");
  assert.equal(evidence[0].bypassExpression, "this.get(typeOrToken)");
  assert.deepEqual(evidence[0].selectorExpressions, ["typeOrToken"]);
  assert.equal(evidence[0].guardExpression, "wrapperRef.isStatic()");
  assert.equal(evidence[0].bypassLocation.line, 8);
  assert.equal(evidence[0].iterationLocation.line, 12);

  assert.deepEqual(extractDependencyCandidateBypassEvidence({ path: "src/resolver.ts", content: fixedSource }), []);
  assert.deepEqual(extractDependencyCandidateBypassEvidence({
    path: "src/resolver.ts",
    content: buggySource.replace("this.get(typeOrToken)", "this.get(instanceLink.token)"),
  }), []);
  assert.deepEqual(extractDependencyCandidateBypassEvidence({
    path: "src/resolver.ts",
    content: buggySource.replace(
      "Promise.all(instanceLinks.map(link => pluckInstance(link)))",
      "pluckInstance(instanceLinks[0])",
    ),
  }), []);
  assert.deepEqual(extractDependencyCandidateBypassEvidence({
    path: "src/resolver.ts",
    content: buggySource.replace("resolvePerContext", "renderEach"),
  }), []);

  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-dependency-bypass-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "resolver.ts"), buggySource, "utf8");
    const facts = (await jsTsProvider.extract({ repoRoot: root, includeTests: false }))
      .filter((fact) => fact.kind === "dependency_flow");
    assert.equal(facts.length, 1);
    assert.equal(facts[0].value.mechanism, "iterated-candidate-bypass");
    assert.equal(facts[0].value.bypassExpression, "this.get(typeOrToken)");
    assert.equal(facts[0].provenance.line, 8);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("dependency-flow evidence identifies first-match selection across reference namespaces", async () => {
  const buggySource = [
    "export function resolveTarget(input, tabs) {",
    "  const needle = input.trim();",
    "  const exact = tabs.find(tab =>",
    "    tab.targetId === needle ||",
    "    tab.suggestedTargetId === needle ||",
    "    tab.label === needle",
    "  );",
    "  if (exact) return { ok: true, targetId: exact.targetId };",
    "  const matches = tabs.filter(tab => tab.targetId.startsWith(needle));",
    "  const only = matches.length === 1 ? matches[0] : undefined;",
    "  if (only) return { ok: true, targetId: only.targetId };",
    "  if (matches.length === 0) return { ok: false, reason: 'not_found' };",
    "  return { ok: false, reason: 'ambiguous', matches };",
    "}",
  ].join("\n");
  const fixedSource = buggySource.replace(
    [
      "  const exact = tabs.find(tab =>",
      "    tab.targetId === needle ||",
      "    tab.suggestedTargetId === needle ||",
      "    tab.label === needle",
      "  );",
      "  if (exact) return { ok: true, targetId: exact.targetId };",
    ].join("\n"),
    [
      "  const exactMatches = tabs",
      "    .filter(tab => tab.targetId === needle || tab.suggestedTargetId === needle || tab.label === needle)",
      "    .map(tab => tab.targetId);",
      "  if (exactMatches.length === 1) return { ok: true, targetId: exactMatches[0] };",
      "  if (exactMatches.length > 1) return { ok: false, reason: 'ambiguous' };",
    ].join("\n"),
  );

  const evidence = extractDependencyNamespaceAmbiguityEvidence({
    path: "src/target-id.ts",
    content: buggySource,
  });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].mechanism, "multi-namespace-first-match");
  assert.equal(evidence[0].caller, "resolveTarget");
  assert.equal(evidence[0].selectedBinding, "exact");
  assert.equal(evidence[0].collectionExpression, "tabs");
  assert.equal(evidence[0].candidateParameter, "tab");
  assert.equal(evidence[0].selectorExpression, "needle");
  assert.deepEqual(evidence[0].matchedProperties, ["targetId", "suggestedTargetId", "label"]);
  assert.equal(evidence[0].canonicalProperty, "targetId");
  assert.equal(evidence[0].returnExpression, "{ ok: true, targetId: exact.targetId }");
  assert.equal(
    evidence[0].ambiguitySignal,
    "matches.length === 1 and matches.length === 0 before ambiguous return",
  );

  assert.deepEqual(extractDependencyNamespaceAmbiguityEvidence({
    path: "src/target-id.ts",
    content: fixedSource,
  }), []);
  assert.deepEqual(extractDependencyNamespaceAmbiguityEvidence({
    path: "src/target-id.ts",
    content: buggySource.replace(
      "tab.suggestedTargetId === needle ||\n    tab.label === needle",
      "tab.suggestedTargetId === other ||\n    tab.label === needle",
    ),
  }), []);
  assert.deepEqual(extractDependencyNamespaceAmbiguityEvidence({
    path: "src/target-id.ts",
    content: buggySource.replace(
      "tab.suggestedTargetId === needle ||\n    tab.label === needle",
      "tab.targetId === needle",
    ),
  }), []);
  assert.deepEqual(extractDependencyNamespaceAmbiguityEvidence({
    path: "src/target-id.ts",
    content: buggySource.replace(
      "  return { ok: false, reason: 'ambiguous', matches };",
      "  return { ok: false, reason: 'not_found' };",
    ),
  }), []);
  assert.deepEqual(extractDependencyNamespaceAmbiguityEvidence({
    path: "src/target-id.ts",
    content: buggySource.replace(
      "  if (exact) return { ok: true, targetId: exact.targetId };",
      "  return { ok: true, targetId: exact.targetId };",
    ),
  }), []);
  assert.deepEqual(extractDependencyNamespaceAmbiguityEvidence({
    path: "src/target-id.ts",
    content: buggySource.replace("resolveTarget", "renderTarget"),
  }), []);

  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-dependency-namespace-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "target-id.ts"), buggySource, "utf8");
    const facts = (await jsTsProvider.extract({ repoRoot: root, includeTests: false }))
      .filter((fact) =>
        fact.kind === "dependency_flow"
        && fact.value.mechanism === "multi-namespace-first-match");
    assert.equal(facts.length, 1);
    assert.deepEqual(facts[0].value.matchedProperties, ["targetId", "suggestedTargetId", "label"]);
    assert.equal(facts[0].value.canonicalProperty, "targetId");
    assert.equal(facts[0].provenance.line, facts[0].value.selectionLocation.line);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("option-flow evidence distinguishes destructive overrides from spread-preserving fallbacks", async () => {
  const buggySource = [
    "export function publishWithOtp(publishOptions: object) {",
    "  return withOtpHandling({",
    "    operation: otp => publish({ ...publishOptions, otp }),",
    "  });",
    "}",
  ].join("\n");
  const fixedSource = [
    "export function publishWithOtp(publishOptions: object) {",
    "  return withOtpHandling({",
    "    operation: otp => publish({ ...publishOptions, otp: otp ?? publishOptions.otp }),",
    "  });",
    "}",
  ].join("\n");

  const buggy = extractOptionPropagationEvidence({ path: "src/buggy.ts", content: buggySource });
  assert.deepEqual(buggy, [{
    kind: "option-override",
    caller: "publishWithOtp",
    property: "otp",
    spreadSource: "publishOptions",
    overrideSource: "otp",
    overrideExpression: "otp",
    overrideKind: "shorthand",
    preservesSpreadValue: false,
    callbackParameter: "otp",
    callbackProperty: "operation",
    callbackOwner: "withOtpHandling",
    location: { line: 3, column: 52 },
    objectLocation: { line: 3, column: 31 },
  }]);

  const fixed = extractOptionPropagationEvidence({ path: "src/fixed.ts", content: fixedSource });
  assert.equal(fixed.length, 1);
  assert.deepEqual({
    overrideKind: fixed[0].overrideKind,
    fallbackOperator: fixed[0].fallbackOperator,
    fallbackTarget: fixed[0].fallbackTarget,
    preservesSpreadValue: fixed[0].preservesSpreadValue,
  }, {
    overrideKind: "fallback",
    fallbackOperator: "nullish",
    fallbackTarget: "publishOptions.otp",
    preservesSpreadValue: true,
  });

  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-option-flow-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "buggy.ts"), buggySource, "utf8");
    const facts = (await jsTsProvider.extract({ repoRoot: root, includeTests: false }))
      .filter((fact) => fact.kind === "option_flow");
    assert.equal(facts.length, 1);
    assert.equal(facts[0].value.callbackOwner, "withOtpHandling");
    assert.equal(facts[0].value.preservesSpreadValue, false);
    assert.equal(facts[0].provenance.line, facts[0].value.line);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("option-flow evidence identifies truthy defaults that override explicit false", async () => {
  const buggySource = [
    "const DEFAULT_OPTIONS = {",
    "  modules: true,",
    "  profile: false,",
    "};",
    "class Plugin {",
    "  constructor(options = {}) {",
    "    this.showModules = options.modules || DEFAULT_OPTIONS.modules;",
    "    this.profile = options.profile || DEFAULT_OPTIONS.profile;",
    "  }",
    "  apply() {",
    "    const entrypoints = this.options.entrypoints || true;",
    "    const enabled = this.options.enabled ?? true;",
    "  }",
    "}",
  ].join("\n");
  const fixedSource = [
    "const DEFAULT_OPTIONS = { modules: true, profile: false };",
    "class Plugin {",
    "  constructor(options = {}) {",
    "    const merged = { ...DEFAULT_OPTIONS, ...options };",
    "    this.showModules = merged.modules;",
    "  }",
    "  apply() {",
    "    const entrypoints = this.options.entrypoints !== undefined ? this.options.entrypoints : true;",
    "  }",
    "}",
  ].join("\n");

  const evidence = extractOptionFalsyDefaultEvidence({ path: "src/plugin.js", content: buggySource });
  assert.equal(evidence.length, 2);
  assert.deepEqual(evidence.map((entry) => ({
    caller: entry.caller,
    mechanism: entry.mechanism,
    property: entry.property,
    optionContainer: entry.optionContainer,
    optionExpression: entry.optionExpression,
    defaultExpression: entry.defaultExpression,
    defaultSource: entry.defaultSource,
    defaultValue: entry.defaultValue,
  })), [
    {
      caller: "Plugin.constructor",
      mechanism: "truthy-default-overrides-falsy",
      property: "modules",
      optionContainer: "options",
      optionExpression: "options.modules",
      defaultExpression: "DEFAULT_OPTIONS.modules",
      defaultSource: "DEFAULT_OPTIONS",
      defaultValue: true,
    },
    {
      caller: "Plugin.apply",
      mechanism: "truthy-default-overrides-falsy",
      property: "entrypoints",
      optionContainer: "this.options",
      optionExpression: "this.options.entrypoints",
      defaultExpression: "true",
      defaultSource: "literal",
      defaultValue: true,
    },
  ]);
  assert.deepEqual(extractOptionFalsyDefaultEvidence({ path: "src/plugin.js", content: fixedSource }), []);
  assert.deepEqual(extractOptionFalsyDefaultEvidence({
    path: "src/config.js",
    content: "const DEFAULT_OPTIONS = { enabled: true }; const value = config.enabled || DEFAULT_OPTIONS.enabled;",
  }), []);
  assert.deepEqual(extractOptionFalsyDefaultEvidence({
    path: "src/options.js",
    content: "const DEFAULT_OPTIONS = { other: true }; const value = options.enabled || DEFAULT_OPTIONS.other;",
  }), []);
  assert.deepEqual(extractOptionFalsyDefaultEvidence({
    path: "src/scoped-options.js",
    content: "function read(options) { const DEFAULT_OPTIONS = { enabled: true }; return options.enabled || DEFAULT_OPTIONS.enabled; }",
  }), []);

  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-option-default-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "plugin.js"), buggySource, "utf8");
    const facts = (await jsTsProvider.extract({ repoRoot: root, includeTests: false }))
      .filter((fact) => fact.kind === "option_flow"
        && fact.value.mechanism === "truthy-default-overrides-falsy");
    assert.equal(facts.length, 2);
    assert.deepEqual(facts.map((fact) => fact.value.property), ["modules", "entrypoints"]);
    assert.ok(facts.every((fact) => fact.provenance.line === fact.value.location.line));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("option-flow evidence identifies temporary Request signals forwarded instead of caller signals", async () => {
  const buggySource = [
    "async function normalizeFetchInput(input, init) {",
    "  const request = new Request(input, init);",
    "  return {",
    "    url: request.url,",
    "    options: {",
    "      ...init,",
    "      method: request.method,",
    "      headers: request.headers,",
    "      signal: request.signal,",
    "    },",
    "  };",
    "}",
  ].join("\n");
  const fixedSource = buggySource.replace(
    "signal: request.signal",
    "signal: init?.signal ?? (input instanceof Request ? input.signal : null)",
  );

  assert.deepEqual(extractRequestSignalForwardingEvidence({
    path: "src/secure-fetch.ts",
    content: buggySource,
  }), [{
    kind: "request-signal-forwarding",
    caller: "normalizeFetchInput",
    mechanism: "derived-request-signal-forwarded",
    requestBinding: "request",
    inputParameter: "input",
    initParameter: "init",
    requestExpression: "new Request(input, init)",
    forwardedSignal: "request.signal",
    outputPath: "options.signal",
    normalizedMembers: ["headers", "method"],
    location: { line: 9, column: 7 },
    requestLocation: { line: 2, column: 9 },
    outputLocation: { line: 5, column: 14 },
  }]);
  assert.deepEqual(extractRequestSignalForwardingEvidence({
    path: "src/secure-fetch.ts",
    content: fixedSource,
  }), []);
  assert.deepEqual(extractRequestSignalForwardingEvidence({
    path: "src/no-spread.ts",
    content: buggySource.replace("      ...init,\n", ""),
  }), []);
  assert.deepEqual(extractRequestSignalForwardingEvidence({
    path: "src/not-normalizing.ts",
    content: buggySource.replace("      headers: request.headers,\n", ""),
  }), []);
  assert.deepEqual(extractRequestSignalForwardingEvidence({
    path: "src/shadowed.ts",
    content: `const Request = class Request {};\n${buggySource}`,
  }), []);
  assert.deepEqual(extractRequestSignalForwardingEvidence({
    path: "src/unrelated-input.ts",
    content: buggySource.replace(
      "  const request = new Request(input, init);",
      "  const source = input;\n  const request = new Request(source, init);",
    ),
  }), []);

  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-request-signal-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "secure-fetch.ts"), buggySource, "utf8");
    const facts = (await jsTsProvider.extract({ repoRoot: root, includeTests: false }))
      .filter((fact) =>
        fact.kind === "option_flow"
        && fact.value.mechanism === "derived-request-signal-forwarded");
    assert.equal(facts.length, 1);
    assert.equal(facts[0].value.forwardedSignal, "request.signal");
    assert.deepEqual(facts[0].value.normalizedMembers, ["headers", "method"]);
    assert.equal(facts[0].provenance.line, 9);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("resource-flow evidence links request retention to an explicit connection release", async () => {
  const retainSource = [
    "export function attach(request, reply, context) {",
    "  request.raw.socket._meta = { context, request, reply };",
    "}",
  ].join("\n");
  const releaseSource = [
    "export function finish(reply) {",
    "  const socket = reply.request.raw.socket;",
    "  socket._meta = null;",
    "}",
  ].join("\n");

  assert.deepEqual(extractResourceLifetimeEvidence({ path: "src/route.ts", content: retainSource }), [{
    kind: "resource-lifetime",
    action: "retain",
    caller: "attach",
    resource: "socket._meta",
    target: "request.raw.socket._meta",
    ownerKind: "socket",
    retainedNames: ["reply", "request"],
    location: { line: 2, column: 3 },
  }]);
  assert.deepEqual(extractResourceLifetimeEvidence({ path: "src/reply.ts", content: releaseSource }), [{
    kind: "resource-lifetime",
    action: "release",
    caller: "finish",
    resource: "socket._meta",
    target: "socket._meta",
    ownerKind: "socket",
    location: { line: 3, column: 3 },
  }]);
  assert.deepEqual(extractResourceLifetimeEvidence({
    path: "src/ordinary.ts",
    content: "request.state.meta = { request, reply }; server.metrics = { count: 1 };",
  }), []);

  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-resource-flow-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "route.ts"), retainSource, "utf8");
    await writeFile(join(root, "src", "reply.ts"), releaseSource, "utf8");
    const facts = (await jsTsProvider.extract({ repoRoot: root, includeTests: false }))
      .filter((fact) => fact.kind === "resource_flow")
      .sort((left, right) => left.value.action.localeCompare(right.value.action));
    assert.equal(facts.length, 2);
    assert.deepEqual(facts.map((fact) => [fact.value.action, fact.value.resource]), [
      ["release", "socket._meta"],
      ["retain", "socket._meta"],
    ]);
    assert.ok(facts.every((fact) => fact.provenance.line === fact.value.line));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("resource-flow evidence captures request closures attached to connection sockets", async () => {
  const buggySource = [
    "function buildRequest(req) {",
    "  req.on('socket', function (socket) {",
    "    socket.on('timeout', function () {",
    "      req.destroy();",
    "    });",
    "  });",
    "}",
  ].join("\n");
  const fixedSource = [
    "function buildRequest(req) {",
    "  req.on('timeout', function () {",
    "    req.destroy();",
    "  });",
    "}",
  ].join("\n");
  const propertyOnlySource = [
    "function buildRequest(req, metrics) {",
    "  req.on('socket', function (socket) {",
    "    socket.on('timeout', function () {",
    "      metrics.request += 1;",
    "    });",
    "  });",
    "}",
  ].join("\n");

  assert.deepEqual(extractResourceLifetimeEvidence({ path: "lib/modem.js", content: buggySource }), [{
    kind: "resource-lifetime",
    action: "retain",
    caller: "buildRequest",
    resource: "socket:timeout",
    target: "socket.on",
    ownerKind: "socket",
    retainedNames: ["req"],
    location: { line: 3, column: 5 },
  }]);
  assert.deepEqual(extractResourceLifetimeEvidence({ path: "lib/modem.js", content: fixedSource }), []);
  assert.deepEqual(extractResourceLifetimeEvidence({ path: "lib/modem.js", content: propertyOnlySource }), []);

  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-socket-retention-"));
  try {
    await mkdir(join(root, "lib"), { recursive: true });
    await writeFile(join(root, "lib", "modem.js"), buggySource, "utf8");
    const facts = (await jsTsProvider.extract({ repoRoot: root, includeTests: false }))
      .filter((fact) => fact.kind === "resource_flow");
    assert.equal(facts.length, 1);
    assert.equal(facts[0].value.resource, "socket:timeout");
    assert.deepEqual(facts[0].value.retainedNames, ["req"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("terminal listener evidence identifies completed XHR handlers that stay attached", async () => {
  const buggySource = [
    "export function instrumentXHR(xhr) {",
    "  const virtualError = new Error();",
    "  const onreadystatechangeHandler = () => {",
    "    if (xhr.readyState === 4) {",
    "      report(xhr, virtualError);",
    "    }",
    "  };",
    "  xhr.addEventListener('readystatechange', onreadystatechangeHandler);",
    "}",
  ].join("\n");
  const fixedSource = buggySource.replace(
    "      report(xhr, virtualError);",
    "      report(xhr, virtualError);\n      xhr.removeEventListener('readystatechange', onreadystatechangeHandler);",
  );
  const onceSource = buggySource.replace(
    "onreadystatechangeHandler);",
    "onreadystatechangeHandler, { once: true });",
  );
  const nonTerminalSource = buggySource.replace("readyState === 4", "readyState === 3");
  const inlineSource = buggySource.replace(
    "  xhr.addEventListener('readystatechange', onreadystatechangeHandler);",
    "  xhr.addEventListener('readystatechange', () => report(xhr));",
  );
  const unrelatedRemovalSource = buggySource.replace(
    "  xhr.addEventListener('readystatechange', onreadystatechangeHandler);",
    "  other.removeEventListener('readystatechange', onreadystatechangeHandler);\n  xhr.addEventListener('readystatechange', onreadystatechangeHandler);",
  );

  assert.deepEqual(extractTerminalEventListenerEvidence({
    path: "src/instrument/xhr.ts",
    content: buggySource,
  }), [{
    kind: "terminal-event-listener",
    mechanism: "terminal-listener-retained",
    caller: "instrumentXHR",
    target: "xhr",
    eventName: "readystatechange",
    handlerName: "onreadystatechangeHandler",
    terminalCondition: "xhr.readyState === 4",
    terminalProperty: "readyState",
    terminalValue: "4",
    location: { line: 8, column: 3 },
    handlerLocation: { line: 3, column: 9 },
    terminalLocation: { line: 4, column: 9 },
  }]);
  assert.deepEqual(extractTerminalEventListenerEvidence({
    path: "src/instrument/xhr.ts",
    content: fixedSource,
  }), []);
  assert.deepEqual(extractTerminalEventListenerEvidence({
    path: "src/instrument/xhr.ts",
    content: onceSource,
  }), []);
  assert.deepEqual(extractTerminalEventListenerEvidence({
    path: "src/instrument/xhr.ts",
    content: nonTerminalSource,
  }), []);
  assert.deepEqual(extractTerminalEventListenerEvidence({
    path: "src/instrument/xhr.ts",
    content: inlineSource,
  }), []);
  assert.equal(extractTerminalEventListenerEvidence({
    path: "src/instrument/xhr.ts",
    content: unrelatedRemovalSource,
  }).length, 1);

  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-terminal-listener-"));
  try {
    await mkdir(join(root, "src", "instrument"), { recursive: true });
    await writeFile(join(root, "src", "instrument", "xhr.ts"), buggySource, "utf8");
    const facts = (await jsTsProvider.extract({ repoRoot: root, includeTests: false }))
      .filter((fact) =>
        fact.kind === "resource_flow"
        && fact.value.mechanism === "terminal-listener-retained");
    assert.equal(facts.length, 1);
    assert.equal(facts[0].value.target, "xhr");
    assert.equal(facts[0].value.handlerName, "onreadystatechangeHandler");
    assert.equal(facts[0].provenance.line, 8);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("cache-contract evidence identifies result parameters omitted from a memoization key", async () => {
  const buggySource = [
    "const METADATA_CACHE = new Map();",
    "export async function loadMetadata(ident, {version}) {",
    "  return await miscUtils.getFactoryWithDefault(METADATA_CACHE, ident.hash, async () => {",
    "    const cached = await readDisk(ident);",
    "    if (cached && version && cached.versions[version])",
    "      return cached;",
    "    return await readNetwork(ident);",
    "  });",
    "}",
  ].join("\n");
  const fixedSource = [
    "const DISK_CACHE = new Map();",
    "const NETWORK_CACHE = new Map();",
    "const readDiskCached = (path) => miscUtils.getFactoryWithDefault(DISK_CACHE, path, () => readDisk(path));",
    "const readNetworkCached = (path) => miscUtils.getFactoryWithDefault(NETWORK_CACHE, path, () => readNetwork(path));",
    "export async function loadMetadata(ident, {version}) {",
    "  const cached = await readDiskCached(ident.hash);",
    "  if (cached && version && cached.versions[version]) return cached;",
    "  return await readNetworkCached(ident.hash);",
    "}",
  ].join("\n");
  const completeKeySource = buggySource.replace("ident.hash, async", "`${ident.hash}:${version}`, async");
  const shadowedParameterSource = buggySource.replace("async () =>", "async (version) =>");
  const noFallbackSource = buggySource.replace(
    "    return await readNetwork(ident);",
    "    throw new Error('missing');",
  );

  assert.deepEqual(extractCacheContractEvidence({ path: "src/metadata.ts", content: buggySource }), [{
    kind: "cache-contract",
    caller: "loadMetadata",
    factory: "miscUtils.getFactoryWithDefault",
    cacheBinding: "METADATA_CACHE",
    keyExpression: "ident.hash",
    keyParameters: ["ident"],
    omittedResultParameters: ["version"],
    guardExpression: "cached && version && cached.versions[version]",
    guardedReturnExpression: "cached",
    fallbackReturnExpression: "await readNetwork(ident)",
    location: { line: 3, column: 16 },
    guardLocation: { line: 5, column: 9 },
    fallbackLocation: { line: 7, column: 5 },
  }]);
  assert.deepEqual(extractCacheContractEvidence({ path: "src/metadata.ts", content: fixedSource }), []);
  assert.deepEqual(extractCacheContractEvidence({ path: "src/metadata.ts", content: completeKeySource }), []);
  assert.deepEqual(extractCacheContractEvidence({ path: "src/metadata.ts", content: shadowedParameterSource }), []);
  assert.deepEqual(extractCacheContractEvidence({ path: "src/metadata.ts", content: noFallbackSource }), []);

  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-cache-contract-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "metadata.ts"), buggySource, "utf8");
    const facts = (await jsTsProvider.extract({ repoRoot: root, includeTests: false }))
      .filter((fact) => fact.kind === "cache_flow");
    assert.equal(facts.length, 1);
    assert.equal(facts[0].value.cacheBinding, "METADATA_CACHE");
    assert.deepEqual(facts[0].value.omittedResultParameters, ["version"]);
    assert.deepEqual(facts[0].value.guardLocation, { line: 5, column: 9 });
    assert.equal(facts[0].provenance.line, 3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("promise-cache evidence identifies rejected async loads retained for later callers", async () => {
  const buggySource = [
    "export class EdgeFeatureStore {",
    "  async _getKVData() {",
    "    if (!this._deserializedPromise) {",
    "      this._deserializedPromise = (async () => {",
    "        return await this._edgeProvider.get(this._rootKey);",
    "      })();",
    "    }",
    "    return this._deserializedPromise;",
    "  }",
    "}",
  ].join("\n");
  const fixedSource = [
    "export class EdgeFeatureStore {",
    "  async _getKVData() {",
    "    if (!this._deserializedPromise) {",
    "      const promise = (async () => {",
    "        return await this._edgeProvider.get(this._rootKey);",
    "      })();",
    "      promise.catch(() => {",
    "        if (this._deserializedPromise === promise) this._deserializedPromise = null;",
    "      });",
    "      this._deserializedPromise = promise;",
    "    }",
    "    return this._deserializedPromise;",
    "  }",
    "}",
  ].join("\n");
  const directEvictionSource = buggySource.replace(
    "      })();\n    }",
    "      })();\n      this._deserializedPromise.catch(() => { this._deserializedPromise = null; });\n    }",
  );

  const evidence = extractPromiseCacheRejectionEvidence({
    path: "src/EdgeFeatureStore.ts",
    content: buggySource,
  });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].kind, "promise-cache-rejection");
  assert.equal(evidence[0].caller, "_getKVData");
  assert.equal(evidence[0].mechanism, "rejected-promise-retained");
  assert.equal(evidence[0].cacheBinding, "this._deserializedPromise");
  assert.equal(evidence[0].guardExpression, "!this._deserializedPromise");
  assert.equal(evidence[0].promiseExpression.startsWith("(async () =>"), true);
  assert.equal(evidence[0].returnExpression, "this._deserializedPromise");
  assert.deepEqual(evidence[0].guardLocation, { line: 3, column: 9 });
  assert.deepEqual(evidence[0].location, { line: 4, column: 7 });
  assert.deepEqual(evidence[0].returnLocation, { line: 8, column: 5 });

  assert.deepEqual(extractPromiseCacheRejectionEvidence({
    path: "src/EdgeFeatureStore.ts",
    content: fixedSource,
  }), []);
  assert.deepEqual(extractPromiseCacheRejectionEvidence({
    path: "src/EdgeFeatureStore.ts",
    content: directEvictionSource,
  }), []);
  assert.deepEqual(extractPromiseCacheRejectionEvidence({
    path: "src/EdgeFeatureStore.ts",
    content: buggySource.replaceAll("_deserializedPromise", "_deserializedValue"),
  }), []);
  assert.deepEqual(extractPromiseCacheRejectionEvidence({
    path: "src/EdgeFeatureStore.ts",
    content: buggySource.replace("    return this._deserializedPromise;", "    return null;"),
  }), []);
  assert.deepEqual(extractPromiseCacheRejectionEvidence({
    path: "src/EdgeFeatureStore.ts",
    content: buggySource.replace("(async () =>", "(() =>"),
  }), []);

  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-promise-cache-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "EdgeFeatureStore.ts"), buggySource, "utf8");
    const facts = (await jsTsProvider.extract({ repoRoot: root, includeTests: false }))
      .filter((fact) =>
        fact.kind === "cache_flow"
        && fact.value.mechanism === "rejected-promise-retained");
    assert.equal(facts.length, 1);
    assert.equal(facts[0].value.cacheBinding, "this._deserializedPromise");
    assert.equal(facts[0].value.returnExpression, "this._deserializedPromise");
    assert.equal(facts[0].provenance.line, 4);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("cleanup-contract evidence identifies lifecycle waits that can finish prematurely", async () => {
  const aggregateSource = [
    "export function createServer() {",
    "  return {",
    "    async close() {",
    "      await Promise.all([watcher.close(), socket.close(), closeHttpServer()]);",
    "      state.urls = null;",
    "    },",
    "  };",
    "}",
  ].join("\n");
  const sequentialSource = [
    "export function createOptimizer() {",
    "  async function close() {",
    "    await discovery.catch(() => {});",
    "    await postScanResult;",
    "    await optimizingResult;",
    "  }",
    "  return { close };",
    "}",
  ].join("\n");

  assert.deepEqual(extractCleanupCompletenessEvidence({ path: "src/server.ts", content: aggregateSource }), [{
    kind: "cleanup-contract",
    caller: "close",
    mechanism: "fail-fast-aggregate",
    obligations: ["watcher.close()", "socket.close()", "closeHttpServer()"],
    location: { line: 4, column: 13 },
    obligationLocations: [
      { line: 4, column: 26 },
      { line: 4, column: 43 },
      { line: 4, column: 59 },
    ],
  }]);
  assert.deepEqual(extractCleanupCompletenessEvidence({ path: "src/optimizer.ts", content: sequentialSource }), [{
    kind: "cleanup-contract",
    caller: "close",
    mechanism: "sequential-unhandled-awaits",
    obligations: ["postScanResult", "optimizingResult"],
    location: { line: 4, column: 11 },
    obligationLocations: [
      { line: 4, column: 11 },
      { line: 5, column: 11 },
    ],
  }]);
  assert.deepEqual(extractCleanupCompletenessEvidence({
    path: "src/server.ts",
    content: aggregateSource.replace("Promise.all", "Promise.allSettled"),
  }), []);
  assert.deepEqual(extractCleanupCompletenessEvidence({
    path: "src/work.ts",
    content: "async function run() { await Promise.all([one(), two()]); }",
  }), []);
  assert.deepEqual(extractCleanupCompletenessEvidence({
    path: "src/close.ts",
    content: "async function close() { await one().catch(ignore); await two().catch(ignore); }",
  }), []);
  assert.deepEqual(extractCleanupCompletenessEvidence({
    path: "src/close.ts",
    content: "const Promise = customPromise; async function close() { await Promise.all([one(), two()]); await three(); }",
  }), []);
  assert.deepEqual(extractCleanupCompletenessEvidence({
    path: "src/close.ts",
    content: "async function close() { await Promise.allSettled([one(), two()]); await three(); }",
  }), []);

  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-cleanup-contract-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "server.ts"), aggregateSource, "utf8");
    const facts = (await jsTsProvider.extract({ repoRoot: root, includeTests: false }))
      .filter((fact) => fact.kind === "cleanup_flow");
    assert.equal(facts.length, 1);
    assert.equal(facts[0].value.mechanism, "fail-fast-aggregate");
    assert.deepEqual(facts[0].value.obligations, ["watcher.close()", "socket.close()", "closeHttpServer()"]);
    assert.equal(facts[0].provenance.line, 4);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("cleanup-flow evidence identifies superseded React effect continuations without cleanup", async () => {
  const buggySource = [
    "import { useEffect, useState } from 'react';",
    "export function useItems(ids) {",
    "  const [items, setItems] = useState([]);",
    "  const pending = ids.map(load);",
    "  useEffect(() => {",
    "    void Promise.allSettled(pending).then(results => {",
    "      setItems(results);",
    "    });",
    "  }, [ids]);",
    "  return items;",
    "}",
  ].join("\n");
  const fixedSource = buggySource
    .replace("  useEffect(() => {", "  useEffect(() => {\n    let active = true;")
    .replace("      setItems(results);", "      if (!active) return;\n      setItems(results);")
    .replace("  }, [ids]);", "    return () => { active = false; };\n  }, [ids]);");

  assert.deepEqual(extractAsyncEffectContinuationEvidence({
    path: "src/useItems.ts",
    content: buggySource,
  }), [{
    kind: "async-effect-continuation",
    caller: "useItems",
    mechanism: "superseded-effect-continuation",
    hook: "useEffect",
    promiseMethod: "allSettled",
    dependencies: ["ids"],
    stateSetters: ["setItems"],
    aggregateExpression: "Promise.allSettled(pending)",
    location: { line: 5, column: 3 },
    continuationLocation: { line: 6, column: 10 },
    setterLocations: [{ line: 7, column: 7 }],
    dependencyLocation: { line: 9, column: 6 },
  }]);
  assert.deepEqual(extractAsyncEffectContinuationEvidence({
    path: "src/useItems.ts",
    content: fixedSource,
  }), []);
  assert.deepEqual(extractAsyncEffectContinuationEvidence({
    path: "src/useItems.ts",
    content: buggySource.replace("[ids]);", "[]);"),
  }), []);
  assert.deepEqual(extractAsyncEffectContinuationEvidence({
    path: "src/useItems.ts",
    content: buggySource.replace("from 'react'", "from './hooks.js'"),
  }), []);
  assert.deepEqual(extractAsyncEffectContinuationEvidence({
    path: "src/useItems.ts",
    content: buggySource.replace(
      "const [items, setItems] = useState([]);",
      "const items = []; const setItems = updateItems;",
    ),
  }), []);
  assert.deepEqual(extractAsyncEffectContinuationEvidence({
    path: "src/useItems.ts",
    content: `const Promise = customPromise;\n${buggySource}`,
  }), []);
  assert.deepEqual(extractAsyncEffectContinuationEvidence({
    path: "src/useItems.ts",
    content: buggySource.replace("Promise.allSettled(pending)", "Promise.resolve(pending)"),
  }), []);

  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-async-effect-cleanup-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "useItems.ts"), buggySource, "utf8");
    const facts = (await jsTsProvider.extract({ repoRoot: root, includeTests: false }))
      .filter((fact) =>
        fact.kind === "cleanup_flow"
        && fact.value.mechanism === "superseded-effect-continuation");
    assert.equal(facts.length, 1);
    assert.equal(facts[0].value.caller, "useItems");
    assert.deepEqual(facts[0].value.stateSetters, ["setItems"]);
    assert.equal(facts[0].provenance.line, 5);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scope-model evidence records lexical boundaries used by identifier rewriting", async () => {
  const buggySource = [
    "const blockNodeTypeRE = /^BlockStatement$|^For(?:In|Of)?Statement$/;",
    "function setScope(node, name) { scopeMap.set(node, name); }",
    "function isInScope(name, parents) { return parents.some(node => scopeMap.get(node) === name); }",
    "function findParentScope(parents, isVar = false) { return parents.find(isVar ? isFunction : isBlock); }",
    "function walk(node) {",
    "  if (node.type === 'SwitchCase') onStatements(node.consequent);",
    "  if (node.type === 'VariableDeclarator') findParentScope(parentStack, varKind === 'var');",
    "  onIdentifier(node);",
    "  output.overwrite(node.start, node.end, replacement);",
    "}",
  ].join("\n");
  const fixedSource = buggySource
    .replace("^BlockStatement$|", "^BlockStatement$|^SwitchStatement$|")
    .replace("function walk(node) {", [
      "function isSkippedParent(node, parent) {",
      "  return parent.type === 'SwitchStatement' && node === parent.discriminant;",
      "}",
      "function walk(node) {",
    ].join("\n"));

  const buggy = extractScopeResolutionEvidence({ path: "src/transform.ts", content: buggySource });
  assert.equal(buggy.length, 1);
  assert.equal(buggy[0].classifierName, "blockNodeTypeRE");
  assert.deepEqual(buggy[0].unmodeledLexicalBoundaries, ["SwitchStatement"]);
  assert.equal(buggy[0].rewritesIdentifiers, true);
  assert.equal(buggy[0].excludesSwitchDiscriminant, false);

  const fixed = extractScopeResolutionEvidence({ path: "src/transform.ts", content: fixedSource });
  assert.equal(fixed.length, 1);
  assert.deepEqual(fixed[0].unmodeledLexicalBoundaries, []);
  assert.equal(fixed[0].excludesSwitchDiscriminant, true);
  assert.deepEqual(extractScopeResolutionEvidence({
    path: "src/ordinary.ts",
    content: "switch (value) { case 1: { const local = value; break; } }",
  }), []);

  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-scope-model-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "transform.ts"), buggySource, "utf8");
    const facts = (await jsTsProvider.extract({ repoRoot: root, includeTests: false }))
      .filter((fact) => fact.kind === "scope_model");
    assert.equal(facts.length, 1);
    assert.deepEqual(facts[0].value.unmodeledLexicalBoundaries, ["SwitchStatement"]);
    assert.equal(facts[0].value.classifierName, "blockNodeTypeRE");
    assert.equal(facts[0].provenance.line, facts[0].value.line);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scope-model evidence identifies name-only reference ownership in binding transforms", async () => {
  const buggySource = [
    "export function transformHoistInlineDirective(ast) {",
    "  const analyzed = analyze(ast);",
    "  walk(ast, {",
    "    enter(node) {",
    "      const scope = analyzed.map.get(node);",
    "      const bindVars = [...scope.references].filter((ref) => {",
    "        const owner = scope.find_owner(ref);",
    "        return owner && owner !== scope && owner !== analyzed.scope;",
    "      });",
    "      return bindVars;",
    "    },",
    "  });",
    "}",
  ].join("\n");
  const fixedSource = [
    "export function transformHoistInlineDirective(ast) {",
    "  const scopeTree = buildScopeTree(ast);",
    "  walk(ast, {",
    "    enter(node) {",
    "      const bindVars = getBindVars(node, scopeTree);",
    "      return bindVars;",
    "    },",
    "  });",
    "}",
  ].join("\n");

  const evidence = extractScopeNameResolutionEvidence({ path: "src/hoist.ts", content: buggySource });
  assert.equal(evidence.length, 1);
  assert.deepEqual({
    mechanism: evidence[0].mechanism,
    caller: evidence[0].caller,
    bindTarget: evidence[0].bindTarget,
    scopeBinding: evidence[0].scopeBinding,
    analysisExpression: evidence[0].analysisExpression,
    referenceCollection: evidence[0].referenceCollection,
    referenceParameter: evidence[0].referenceParameter,
    ownerLookup: evidence[0].ownerLookup,
  }, {
    mechanism: "name-only-reference-owner",
    caller: "transformHoistInlineDirective",
    bindTarget: "bindVars",
    scopeBinding: "scope",
    analysisExpression: "analyzed.map.get(node)",
    referenceCollection: "scope.references",
    referenceParameter: "ref",
    ownerLookup: "scope.find_owner(ref)",
  });
  assert.deepEqual(extractScopeNameResolutionEvidence({ path: "src/hoist.ts", content: fixedSource }), []);
  assert.deepEqual(extractScopeNameResolutionEvidence({
    path: "src/ordinary.ts",
    content: buggySource.replace("bindVars", "references"),
  }), []);
  assert.deepEqual(extractScopeNameResolutionEvidence({
    path: "src/no-map.ts",
    content: buggySource.replace("analyzed.map.get(node)", "analyzed.scope"),
  }), []);

  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-scope-name-resolution-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "hoist.ts"), buggySource, "utf8");
    const facts = (await jsTsProvider.extract({ repoRoot: root, includeTests: false }))
      .filter((fact) => fact.kind === "scope_model"
        && fact.value.mechanism === "name-only-reference-owner");
    assert.equal(facts.length, 1);
    assert.equal(facts[0].value.bindTarget, "bindVars");
    assert.equal(facts[0].value.ownerLookup, "scope.find_owner(ref)");
    assert.equal(facts[0].provenance.line, facts[0].value.location.line);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scope-model evidence identifies skipped switch discriminants in binding renamers", async () => {
  const buggySource = [
    "const renameVisitor: Visitor<Renamer> = {",
    "  ReferencedIdentifier({ node }, state) {",
    "    if (node.name === state.oldName) node.name = state.newName;",
    "  },",
    "  Scope(path, state) {",
    "    if (!path.scope.bindingIdentifierEquals(state.oldName, state.binding.identifier)) {",
    "      path.skip();",
    "      if (path.isMethod()) {",
    "        path.requeueComputedKeyAndDecorators();",
    "      }",
    "    }",
    "  },",
    "};",
  ].join("\n");
  const fixedSource = buggySource.replace(
    "      }\n    }",
    [
      "      }",
      "      if (path.isSwitchStatement()) {",
      "        path.context.maybeQueue(path.get(\"discriminant\"));",
      "      }",
      "    }",
    ].join("\n"),
  );

  const evidence = extractScopeTraversalEscapeEvidence({
    path: "packages/babel-traverse/src/scope/lib/renamer.ts",
    content: buggySource,
  });
  assert.equal(evidence.length, 1);
  assert.deepEqual({
    mechanism: evidence[0].mechanism,
    visitor: evidence[0].visitor,
    scopeHandler: evidence[0].scopeHandler,
    pathParameter: evidence[0].pathParameter,
    modeledExceptions: evidence[0].modeledExceptions,
    missingParentEvaluatedChildren: evidence[0].missingParentEvaluatedChildren,
  }, {
    mechanism: "switch-discriminant-not-requeued",
    visitor: "renameVisitor",
    scopeHandler: "Scope",
    pathParameter: "path",
    modeledExceptions: ["method-computed-key-and-decorators"],
    missingParentEvaluatedChildren: ["SwitchStatement.discriminant"],
  });
  assert.deepEqual(extractScopeTraversalEscapeEvidence({
    path: "packages/babel-traverse/src/scope/lib/renamer.ts",
    content: fixedSource,
  }), []);
  assert.deepEqual(extractScopeTraversalEscapeEvidence({
    path: "src/ordinary.ts",
    content: "switch (value) { case 1: { const value = 2; break; } }",
  }), []);
  assert.deepEqual(extractScopeTraversalEscapeEvidence({
    path: "src/visitor.ts",
    content: buggySource.replace("bindingIdentifierEquals", "hasBinding"),
  }), []);
  assert.deepEqual(extractScopeTraversalEscapeEvidence({
    path: "src/visitor.ts",
    content: buggySource.replace(
      "      if (path.isMethod()) {\n        path.requeueComputedKeyAndDecorators();\n      }\n",
      "",
    ),
  }), []);

  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-scope-traversal-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "renamer.ts"), buggySource, "utf8");
    const facts = (await jsTsProvider.extract({ repoRoot: root, includeTests: false }))
      .filter((fact) => fact.kind === "scope_model"
        && fact.value.mechanism === "switch-discriminant-not-requeued");
    assert.equal(facts.length, 1);
    assert.equal(facts[0].value.visitor, "renameVisitor");
    assert.deepEqual(
      facts[0].value.missingParentEvaluatedChildren,
      ["SwitchStatement.discriminant"],
    );
    assert.equal(facts[0].provenance.line, facts[0].value.location.line);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("source-local private member evidence survives an unresolved TypeScript project", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-private-source-evidence-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "tsconfig.json"), JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext" },
      include: ["src/**/*.ts"],
    }), "utf8");
    await writeFile(join(root, "src", "client.ts"), [
      "import { Missing } from './missing.js';",
      "export class Client {",
      "  private sessionCreated = false;",
      "  private conversationBound = false;",
      "  private accumulator = '';",
      "  private readLater = false;",
      "  private dynamic = false;",
      "  public visible = false;",
      "  connect(_value: Missing) {",
      "    this.sessionCreated = true;",
      "    this.conversationBound = true;",
      "    this.accumulator += 'connected';",
      "    this.accumulator = 'ready' ?? this.accumulator;",
      "    this.readLater = true;",
      "    this.dynamic = true;",
      "    return this.readLater || this['dynamic'];",
      "  }",
      "}",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const sourceSignals = facts
      .filter((fact) => fact.kind === "typescript:source-quality" && fact.value.signal === "unused_private_member")
      .map((fact) => fact.value.detail)
      .sort();
    const diagnosticSignals = facts.filter(
      (fact) => fact.kind === "typescript:diagnostic" && fact.value.purpose === "unused-private-member",
    );

    assert.deepEqual(sourceSignals, ["accumulator", "conversationBound", "sessionCreated"]);
    assert.equal(diagnosticSignals.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("documented intentional catch suppression is not emitted as a risk", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-intentional-catch-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "cleanup.ts"), [
      "try { closeResource(); } catch {",
      "  // Ignore cleanup failure so the original error remains authoritative.",
      "}",
      "try { finishCommand(); } catch {",
      "  // Keep command completion resilient when optional recording fails.",
      "}",
      "try { notifyListeners(); } catch {",
      "  // Listener errors are isolated so one broken stream does not affect others.",
      "}",
      "try { runRequiredWork(); } catch {}",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const catchSignals = facts.filter((fact) =>
      fact.kind === "typescript:source-quality"
      && (fact.value.signal === "empty_catch" || fact.value.signal === "catch_only_logs"));
    const emptyCatches = catchSignals.filter((fact) => fact.value.signal === "empty_catch");
    assert.equal(catchSignals.length, 1);
    assert.equal(emptyCatches.length, 1);
    assert.equal(emptyCatches[0].provenance.line, 10);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("forced removal cleanup and nested error recovery are not emitted as suppression risks", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-structural-catch-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "cleanup.ts"), [
      "try { fs.rmSync(tempPath, { force: true }); } catch {}",
      "try { runPrimaryWork(); } catch (primaryError) {",
      "  try { deriveDiagnostic(primaryError); } catch {}",
      "  throw primaryError;",
      "}",
      "try { runRequiredWork(); } catch {}",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const emptyCatches = facts.filter((fact) => (
      fact.kind === "typescript:source-quality" && fact.value.signal === "empty_catch"
    ));

    assert.equal(emptyCatches.length, 1);
    assert.equal(emptyCatches[0].provenance.line, 6);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("logged listener isolation is not emitted as error suppression", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-listener-catch-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "listeners.ts"), [
      "declare const listener: (event: unknown) => void;",
      "declare const collector: { _onChannelRedirect(event: unknown): void };",
      "declare const events: { on(name: string, callback: () => void): void };",
      "declare const event: unknown;",
      "try { listener(event); } catch (error) { console.error('listener failed', error); }",
      "try { collector._onChannelRedirect(event); } catch (error) { console.error('collector failed', error); }",
      "function callHooks(invoke: (hook: unknown) => void, hooks: unknown[]) {",
      "  for (const hook of hooks) { try { invoke(hook); } catch (error) { console.error('hook failed', error); } }",
      "}",
      "events.on('change', () => { try { runEvent(); } catch (error) { console.error('event failed', error); } });",
      "try { runRequiredWork(); } catch (error) { console.error('required work failed', error); }",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const catchSignals = facts.filter((fact) =>
      fact.kind === "typescript:source-quality"
      && fact.value.signal === "catch_only_logs");

    assert.equal(catchSignals.length, 1);
    assert.equal(catchSignals[0].provenance.line, 11);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("best-effort observability boundaries are not emitted as error suppression", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-observability-catch-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "trace.ts"), [
      "export async function persistTraceEvent(): Promise<void> {",
      "  try { await sendTraceEvent(); } catch (error) { console.warn('trace failed', error); }",
      "}",
      "export class Logger {",
      "  packet(payload: unknown) {",
      "    try { console.warn(safeClone(payload)); } catch (error) { console.warn(payload, error); }",
      "  }",
      "}",
      "export function clientDebugLog() {",
      "  if (!enabled()) return;",
      "  try { sendDebugLog(); } catch (error) { console.warn('debug failed', error); }",
      "}",
      "export async function superviseWorker(): Promise<void> {",
      "  while (running()) {",
      "    try { await drain(); } catch (error) { console.warn('drain failed', error); }",
      "    await sleep(1000);",
      "  }",
      "}",
      "export function documentedFallback(): void {",
      "  try { optionalWork(); } catch (error) {",
      "    // Optional work must not break the caller.",
      "    console.warn('optional work failed', error);",
      "  }",
      "}",
      "export async function startRequiredWork(): Promise<void> {",
      "  try { await connect(); } catch (error) { console.warn('start failed', error); }",
      "}",
      "export function explicitFailure(): [boolean, string] {",
      "  try { requiredWrite(); return [true, 'written']; } catch (error) { console.error(error); }",
      "  return [false, 'not written'];",
      "}",
      "export function nestedRecovery(): void {",
      "  try { primary(); } catch {",
      "    try { recover(); } catch (error) { console.error('recovery failed', error); }",
      "  }",
      "}",
      "export function documentedRetry(): void {",
      "  try { refresh(); } catch (error) { console.error('will retry on the next event', error); }",
      "}",
    ].join("\n"), "utf8");
    await writeFile(join(root, "src", "ServerLogger.ts"), [
      "export async function flushSummaries(): Promise<void> {",
      "  for (const summary of pendingSummaries()) {",
      "    try { await writeSummary(summary); }",
      "    catch (error) { console.warn('summary failed', error); }",
      "  }",
      "}",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const catchSignals = facts.filter((fact) =>
      fact.kind === "typescript:source-quality"
      && fact.value.signal === "catch_only_logs");

    assert.equal(catchSignals.length, 1);
    assert.equal(catchSignals[0].provenance.line, 26);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("best-effort cache writes are distinct from required persistence failures", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-cache-catch-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "cache.ts"), [
      "export async function setCachedValue(value: string): Promise<void> {",
      "  try { await redis.setex('key', CACHE_CONFIGS.value.ttlSeconds, value); }",
      "  catch (error) { console.error('Cache write failed', error); }",
      "}",
      "export async function persistRequired(value: string): Promise<void> {",
      "  try { await repository.save(value); }",
      "  catch (error) { console.error('Persistence failed', error); }",
      "}",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const catches = facts.filter((fact) => (
      fact.kind === "typescript:source-quality" && fact.value.signal === "catch_only_logs"
    ));

    assert.equal(catches.length, 1);
    assert.equal(catches[0].provenance.line, 7);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("loop-local presentation fallbacks are distinct from suppressed writes", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-presentation-fallback-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "render.ts"), [
      "for (const file of files) {",
      "  try {",
      "    const stats = lstatSync(file);",
      "    if (stats.isDirectory()) console.log(file + '/');",
      "    else console.log(file);",
      "  } catch { console.log(file); }",
      "}",
      "try { writeRequiredFile(); console.log('wrote file'); }",
      "catch (error) { console.error('write failed', error); }",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const catches = facts.filter((fact) => (
      fact.kind === "typescript:source-quality" && fact.value.signal === "catch_only_logs"
    ));

    assert.equal(catches.length, 1);
    assert.equal(catches[0].provenance.line, 9);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("console calls outside catch blocks remain governed content signals", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-console-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "console.ts"), "console.warn('visible');\n", "utf8");
    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    assert.equal(facts.some((fact) => fact.kind === "content_signal" && fact.value.signal === "consoleLogging"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("console calls in a catch that rethrows remain governed content signals", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-console-rethrow-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "console.ts"), "try { work(); } catch (error) { console.error(error); throw error; }\n", "utf8");
    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    assert.equal(facts.some((fact) => fact.kind === "content_signal" && fact.value.signal === "consoleLogging"), true);
    assert.equal(facts.some((fact) => fact.kind === "typescript:source-quality" && fact.value.signal === "catch_only_logs"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider emits package, lifecycle, route, screen, and test evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-conventions-"));
  try {
    await mkdir(join(root, "app", "api", "users"), { recursive: true });
    await mkdir(join(root, "app", "(marketing)", "about"), { recursive: true });
    await mkdir(join(root, "pages", "api"), { recursive: true });
    await mkdir(join(root, "tests", "integration"), { recursive: true });
    await writeFile(join(root, "package.json"), JSON.stringify({
      name: "convention-fixture",
      version: "1.0.0",
      type: "module",
      scripts: {
        build: "tsc",
        dev: "next dev",
        test: "node --test",
        "test:integration": "node --test tests/integration",
        typecheck: "tsc --noEmit",
      },
    }), "utf8");
    await writeFile(join(root, "app", "api", "users", "route.ts"), [
      "export function GET() { return Response.json([]); }",
      "export function POST() { return Response.json({}); }",
    ].join("\n"), "utf8");
    await writeFile(join(root, "app", "(marketing)", "about", "page.tsx"), "export default function Page() { return <main>About</main>; }\n", "utf8");
    await writeFile(join(root, "pages", "api", "legacy.ts"), "export default function handler() {}\n", "utf8");
    await writeFile(join(root, "pages", "index.tsx"), "export default function Home() { return <main>Home</main>; }\n", "utf8");
    await writeFile(join(root, "tests", "integration", "user.test.ts"), "import test from 'node:test'; test('works', () => {});\n", "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: true });
    const manifest = facts.find((fact) => fact.kind === "manifest");
    const targets = facts.filter((fact) => fact.kind === "build_target");
    const routes = facts.filter((fact) => fact.kind === "route");
    const screens = facts.filter((fact) => fact.kind === "screen");
    const tests = facts.filter((fact) => fact.kind === "test");

    assert.equal(manifest.value.name, "convention-fixture");
    assert.deepEqual(targets.map((fact) => fact.value.name).sort(), ["build", "test", "test:integration", "typecheck"]);
    assert.deepEqual(routes.map((fact) => fact.value.routePath).sort(), ["/api/legacy", "/api/users"]);
    assert.deepEqual(routes.find((fact) => fact.value.routePath === "/api/users").value.methods, ["GET", "POST"]);
    assert.deepEqual(screens.map((fact) => fact.value.routePath).sort(), ["/", "/about"]);
    assert.equal(tests.length, 1);
    assert.equal(tests[0].value.framework, "node-test");
    assert.equal(tests[0].value.testKind, "integration");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider emits resolved calls, dynamic imports, and explicit entry points", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-call-graph-"));
  try {
    await mkdir(join(root, "src", "workers"), { recursive: true });
    await mkdir(join(root, "src", "plugins", "published"), { recursive: true });
    await mkdir(join(root, "app", "api", "users"), { recursive: true });
    await mkdir(join(root, "hooks"), { recursive: true });
    await mkdir(join(root, "tests"), { recursive: true });
    await writeFile(join(root, "package.json"), JSON.stringify({
      name: "call-fixture",
      main: "./dist/index.js",
      exports: { ".": "./dist/index.js" },
      imports: { "#feature": { default: "./src/feature-flag.ts" } },
      bin: { fixture: "./dist/cli.js" },
      files: ["src/plugins/**/index.ts"],
      mocha: { require: ["./hooks/mocha-init-hook.ts", "ts-node/register"] },
    }), "utf8");
    await writeFile(join(root, "src", "index.ts"), [
      "import { serve } from './service.js';",
      "export function main() { serve(); }",
      "export async function lazy() { return import('./lazy.js'); }",
    ].join("\n"), "utf8");
    await writeFile(join(root, "src", "cli.ts"), "#!/usr/bin/env node\nimport { main } from './index.js'; main();\n", "utf8");
    await writeFile(join(root, "src", "service.ts"), [
      "import * as prisma from '@prisma/client';",
      "export function serve() { events.emit('user.loaded'); return prisma.user.findMany(); }",
      "export function guarded() { try { return serve(); } catch (error) { throw error; } }",
      "export class Service { load() { return this.read(); } read() { return 1; } }",
    ].join("\n"), "utf8");
    await writeFile(join(root, "src", "lazy.ts"), "export const lazy = true;\n", "utf8");
    await writeFile(join(root, "src", "feature-flag.ts"), "export default false;\n", "utf8");
    await writeFile(join(root, "src", "browser-client.ts"), "export const client = true;\n", "utf8");
    await writeFile(join(root, "src", "plugins", "published", "index.ts"), "export const plugin = true;\n", "utf8");
    await writeFile(join(root, "src", "workers", "mail.worker.ts"), "export function run() {}\n", "utf8");
    await writeFile(join(root, "hooks", "mocha-init-hook.ts"), "export const mochaHooks = {};\n", "utf8");
    await writeFile(join(root, "rollup.config.ts"), "export default { input: path.resolve(dirname, 'src/browser-client.ts') };\n", "utf8");
    await writeFile(join(root, "app", "api", "users", "route.ts"), "import { serve } from '../../../src/service.js'; export function GET() { return serve(); }\n", "utf8");
    await writeFile(join(root, "tests", "service.test.ts"), "import { serve } from '../src/service.js'; serve();\n", "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: true });
    const calls = facts.filter((fact) => fact.kind === "call");
    const entries = facts.filter((fact) => fact.kind === "entry_point");
    const dynamicImport = facts.find((fact) => fact.kind === "import" && fact.value.importKind === "dynamic");

    assert.ok(calls.some((fact) => fact.value.caller === "main" && fact.value.targetFile === "src/service.ts" && fact.value.targetSymbol === "serve"));
    assert.ok(calls.some((fact) => fact.value.caller === "Service.load" && fact.value.targetSymbol === "Service.read" && fact.value.resolution === "this-method"));
    assert.ok(calls.some((fact) => fact.value.source === "app/api/users/route.ts" && fact.value.caller === "GET" && fact.value.targetFile === "src/service.ts"));
    assert.equal(dynamicImport.value.resolvedTarget, "src/lazy.ts");
    assert.ok(facts.some((fact) => fact.kind === "event_flow" && fact.value.eventName === "user.loaded" && fact.value.action === "emit"));
    assert.ok(facts.some((fact) => fact.kind === "state_access" && fact.value.package === "@prisma/client" && fact.value.operation === "user.findMany"));
    assert.ok(facts.some((fact) => fact.kind === "error_flow" && fact.value.caller === "guarded" && fact.value.action === "rethrow"));
    assert.ok(entries.some((fact) => fact.value.entryKind === "package" && fact.value.path === "src/index.ts"));
    assert.ok(entries.some((fact) => fact.value.entryKind === "cli" && fact.value.path === "src/cli.ts"));
    assert.ok(entries.some((fact) => fact.value.entryKind === "route" && fact.value.path === "app/api/users/route.ts"));
    assert.ok(entries.some((fact) => fact.value.entryKind === "worker" && fact.value.path === "src/workers/mail.worker.ts"));
    assert.ok(entries.some((fact) => fact.value.entryKind === "test" && fact.value.path === "tests/service.test.ts"));
    assert.ok(entries.some((fact) => fact.value.source === "package-manifest" && fact.value.path === "src/feature-flag.ts"));
    assert.ok(entries.some((fact) => fact.value.source === "package-files" && fact.value.path === "src/plugins/published/index.ts"));
    assert.ok(entries.some((fact) => fact.value.source === "package-tool-config" && fact.value.path === "hooks/mocha-init-hook.ts"));
    assert.ok(entries.some((fact) => fact.value.source === "build-config" && fact.value.path === "src/browser-client.ts"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider resolves declared workspace exports, aliases, and re-export chains", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-workspace-exports-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(join(root, "packages", "core", "src", "features"), { recursive: true });
    await writeFile(join(root, "package.json"), JSON.stringify({ workspaces: ["packages/*"] }), "utf8");
    await writeFile(join(root, "tsconfig.json"), JSON.stringify({
      compilerOptions: { baseUrl: ".", paths: { "@app/*": ["src/*"] } },
    }), "utf8");
    await writeFile(join(root, "packages", "core", "package.json"), JSON.stringify({
      name: "@fixture/core",
      exports: {
        ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
        "./features/*": { types: "./dist/features/*.d.ts", import: "./dist/features/*.js" },
      },
    }), "utf8");
    await writeFile(join(root, "packages", "core", "src", "index.ts"), "export { feature } from './features/one.js';\n", "utf8");
    await writeFile(join(root, "packages", "core", "src", "features", "one.ts"), "export const feature = 1;\n", "utf8");
    await writeFile(join(root, "packages", "core", "src", "private.ts"), "export const privateValue = 1;\n", "utf8");
    await writeFile(join(root, "src", "local.ts"), "export const local = true;\n", "utf8");
    await writeFile(join(root, "src", "app.ts"), [
      "import { feature as rootFeature } from '@fixture/core';",
      "import { feature } from '@fixture/core/features/one';",
      "import { privateValue } from '@fixture/core/private';",
      "import { local } from '@app/local';",
      "export const result = [rootFeature, feature, privateValue, local];",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const imports = facts.filter((fact) => fact.kind === "import_specifier" && fact.value.source === "src/app.ts");
    assert.equal(imports.find((fact) => fact.value.target === "@fixture/core").value.resolvedTarget, "packages/core/src/index.ts");
    assert.equal(imports.find((fact) => fact.value.target === "@fixture/core/features/one").value.resolvedTarget, "packages/core/src/features/one.ts");
    assert.equal(imports.find((fact) => fact.value.target === "@fixture/core/private").value.resolvedTarget, undefined);
    assert.equal(imports.find((fact) => fact.value.target === "@app/local").value.resolvedTarget, "src/local.ts");
    assert.equal(facts.find((fact) => fact.kind === "reexport" && fact.value.source === "packages/core/src/index.ts").value.resolvedTarget, "packages/core/src/features/one.ts");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider emits deterministic Express, Nest, and Vite framework evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-frameworks-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "package.json"), JSON.stringify({
      scripts: { dev: "vite" },
      dependencies: { express: "*", "@nestjs/common": "*", "@nestjs/core": "*" },
      devDependencies: { vite: "*" },
    }), "utf8");
    await writeFile(join(root, "src", "server.ts"), [
      "import express, { Router } from 'express';",
      "const app = express();",
      "const router = Router();",
      "app.get('/users', listUsers);",
      "router.post('/users', handlers.create);",
      "app.listen(3000);",
    ].join("\n"), "utf8");
    await writeFile(join(root, "src", "controller.ts"), [
      "import { Controller as ApiController, Get as Read, Post } from '@nestjs/common';",
      "@ApiController('accounts')",
      "export class AccountsController {",
      "  @Read(':id') read() {}",
      "  @Post() create() {}",
      "}",
    ].join("\n"), "utf8");
    await writeFile(join(root, "src", "main.ts"), [
      "import { NestFactory as Factory } from '@nestjs/core';",
      "async function bootstrap() { return Factory.create(class AppModule {}); }",
      "bootstrap();",
    ].join("\n"), "utf8");
    await writeFile(join(root, "vite.config.ts"), "export default {};\n", "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const routes = facts.filter((fact) => fact.kind === "route");
    const entries = facts.filter((fact) => fact.kind === "entry_point");
    assert.ok(routes.some((fact) => fact.value.framework === "express" && fact.value.routePath === "/users" && fact.value.methods[0] === "GET" && fact.value.handler === "listUsers"));
    assert.ok(routes.some((fact) => fact.value.framework === "express" && fact.value.methods[0] === "POST" && fact.value.handler === "handlers.create"));
    assert.ok(routes.some((fact) => fact.value.framework === "nestjs" && fact.value.routePath === "/accounts/:id" && fact.value.handler === "AccountsController.read"));
    assert.ok(routes.some((fact) => fact.value.framework === "nestjs" && fact.value.routePath === "/accounts" && fact.value.methods[0] === "POST"));
    assert.ok(entries.some((fact) => fact.value.framework === "express" && fact.value.path === "src/server.ts"));
    assert.ok(entries.some((fact) => fact.value.framework === "express" && fact.value.handlers?.includes("listUsers")));
    assert.ok(entries.some((fact) => fact.value.framework === "express" && fact.value.handlers?.includes("handlers.create")));
    assert.ok(entries.some((fact) => fact.value.framework === "nestjs" && fact.value.path === "src/main.ts"));
    assert.ok(entries.some((fact) => fact.value.framework === "vite" && fact.value.path === "src/main.ts"));
    assert.ok(entries.some((fact) => fact.value.framework === "vite" && fact.value.path === "vite.config.ts"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider honors includeTests", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-test-scope-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(join(root, "tests"), { recursive: true });
    await writeFile(join(root, "src", "index.ts"), "export const source = true;\n", "utf8");
    await writeFile(join(root, "tests", "index.test.ts"), "test.only('focused', () => {});\n", "utf8");
    await writeFile(join(root, "tests", "focused-helper.test.ts"), [
      "// eslint-disable-next-line jest/no-focused-tests -- deliberate framework plumbing",
      "it.only('framework sentinel', () => {});",
    ].join("\n"), "utf8");

    const excluded = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const included = await jsTsProvider.extract({ repoRoot: root, includeTests: true });
    assert.equal(excluded.some((fact) => fact.subject.includes("index.test.ts")), false);
    assert.equal(included.some((fact) => fact.kind === "test" && fact.subject === "tests/index.test.ts"), true);
    const focused = included.filter(
      (fact) => fact.kind === "typescript:source-quality" && fact.value.signal === "focused_test",
    );
    assert.equal(focused.length, 1);
    assert.equal(focused[0].value.path, "tests/index.test.ts");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider refreshes repository diagnostics during incremental observe", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-diagnostics-incremental-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "tsconfig.json"), JSON.stringify({ include: ["src/**/*.ts"] }), "utf8");
    await writeFile(join(root, "src", "index.ts"), "export const value: string = 42;\n", "utf8");

    const facts = await jsTsProvider.extract({
      repoRoot: root,
      includeTests: false,
      incremental: true,
      changedFiles: ["src/index.ts"],
    });

    assert.equal(facts.some((fact) => fact.kind === "typescript:diagnostic"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider rejects changed-files inputs outside the repo root", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-"));
  const outside = await mkdtemp(join(tmpdir(), "rekon-js-ts-outside-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "inside.ts"), "export const inside = 1;\n", "utf8");
    await writeFile(join(outside, "outside.ts"), "export const outside = 1;\n", "utf8");

    const facts = await jsTsProvider.extract({
      repoRoot: root,
      includeTests: false,
      incremental: true,
      changedFiles: [
        "src/inside.ts",
        relative(root, join(outside, "outside.ts")),
      ],
    });

    assert.equal(facts.some((fact) => fact.subject === "src/inside.ts"), true);
    assert.equal(facts.some((fact) => fact.subject.includes("outside.ts")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("JS/TS provider skips runtime dirs and symlink cycles during source walk", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-walk-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "index.ts"), "export const value = 1;\n", "utf8");

    await mkdir(join(root, ".circe", "workspaces"), { recursive: true });
    await writeFile(join(root, ".circe", "workspaces", "ignored.ts"), "export const ignoredCirce = true;\n", "utf8");
    await symlink(root, join(root, ".circe", "workspaces", "link-to-root"), "dir");

    await mkdir(join(root, ".rekon", "intent", "plans", "fixture"), { recursive: true });
    await writeFile(join(root, ".rekon", "intent", "plans", "fixture", "ignored.ts"), "export const ignoredRekon = true;\n", "utf8");

    await mkdir(join(root, "node_modules", "pkg"), { recursive: true });
    await writeFile(join(root, "node_modules", "pkg", "ignored.ts"), "export const ignoredNodeModules = true;\n", "utf8");

    await symlink(join(root, "src"), join(root, "src-link"), "dir");
    await symlink(join(root, "missing-target"), join(root, "broken-link"), "file");

    const facts = await jsTsProvider.extract({
      repoRoot: root,
      includeTests: false,
    });
    const fileSubjects = facts
      .filter((fact) => fact.kind === "file")
      .map((fact) => fact.subject);

    assert.deepEqual(fileSubjects, ["src/index.ts"]);
    assert.equal(facts.some((fact) => fact.subject.includes(".circe")), false);
    assert.equal(facts.some((fact) => fact.subject.includes(".rekon")), false);
    assert.equal(facts.some((fact) => fact.subject.includes("node_modules")), false);
    assert.equal(facts.some((fact) => fact.subject.includes("src-link")), false);
    assert.equal(facts.some((fact) => fact.subject.includes("broken-link")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("extract completes on a single generated file emitting >100k facts (per-file spread-overflow regression)", async () => {
  // Same WO-2 failure class as the runtime site, one layer down: the
  // per-file `facts.push(...astFacts)` spread overflows when one generated
  // module alone emits more facts than the V8 argument ceiling (~10^5).
  // 60k exports produce >120k facts (export + symbol per declaration), which
  // crashed the pre-fix spread; the fixed appendFacts path must complete.
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-scale-"));

  try {
    const EXPORTS = 60_000;
    const lines = [];

    for (let index = 0; index < EXPORTS; index += 1) {
      lines.push(`export const generatedValue${index} = ${index};`);
    }

    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "huge.ts"), `${lines.join("\n")}\n`, "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });

    assert.ok(facts.length > 100_000, `expected >100k facts from the generated module, got ${facts.length}`);
    assert.ok(facts.some((fact) => fact.kind === "file" && fact.subject === "src/huge.ts"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("extract is deterministic run-to-run on the simple-js-ts example fixture", async () => {
  // Determinism guard for the WO-2 fix: appending facts one-by-one must not
  // change fact content or order relative to a second identical run.
  const exampleRoot = join(import.meta.dirname, "../../../examples/simple-js-ts");
  const first = await jsTsProvider.extract({ repoRoot: exampleRoot, includeTests: false });
  const second = await jsTsProvider.extract({ repoRoot: exampleRoot, includeTests: false });

  assert.ok(first.length > 0, "example fixture should produce facts");
  assert.deepEqual(second, first);
});

test("cache-key normalization evidence distinguishes raw and normalized guards", () => {
  const buggy = `
    function makeCacheKey(opts) {
      let fullPath = opts.path || "/";
      if (opts.query && !hasQuery(opts.path))
        fullPath = serialize(fullPath, opts.query);
      return { path: fullPath };
    }
  `;
  const fixed = buggy.replace("hasQuery(opts.path)", "hasQuery(fullPath)");
  const unrelated = `
    function route(opts) {
      const fullPath = opts.path || "/";
      if (hasQuery(opts.path)) return opts.path;
      return fullPath;
    }
  `;

  const evidence = extractCacheKeyNormalizationEvidence({ path: "src/cache.ts", content: buggy });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].mechanism, "raw-cache-input-after-normalization");
  assert.equal(evidence[0].rawInput, "opts.path");
  assert.deepEqual(extractCacheKeyNormalizationEvidence({ path: "src/cache.ts", content: fixed }), []);
  assert.deepEqual(extractCacheKeyNormalizationEvidence({ path: "src/route.ts", content: unrelated }), []);
});

test("teardown interruption evidence requires teardown-aware phases with a default dispatcher", () => {
  const buggy = `
    function createPhasesTask() {
      const teardownToSetups = buildTeardownToSetupsMap(allProjects);
      const phase = { dispatcher: new Dispatcher(testRun), projects: [] };
      return { teardownToSetups, phase };
    }
  `;
  const fixed = buggy.replace(
    "new Dispatcher(testRun)",
    "new Dispatcher(testRun, { ignoreMaxFailures: true })",
  );
  const unrelated = `
    function createPhasesTask() {
      const phase = { dispatcher: new Dispatcher(testRun), projects: [] };
      return phase;
    }
  `;

  const evidence = extractTeardownInterruptionEvidence({ path: "src/tasks.ts", content: buggy });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].mechanism, "teardown-shares-stop-policy");
  assert.deepEqual(extractTeardownInterruptionEvidence({ path: "src/tasks.ts", content: fixed }), []);
  assert.deepEqual(extractTeardownInterruptionEvidence({ path: "src/tasks.ts", content: unrelated }), []);
});

test("explicit dependency source evidence clears when bare modules bypass re-export expansion", () => {
  const buggy = `
    function getImportCompletionAction(exportedSymbol, moduleSymbol, sourceFile) {
      const exportInfos = getAllReExportingModules(sourceFile, exportedSymbol, moduleSymbol);
      return first(exportInfos);
    }
  `;
  const fixed = `
    function getImportCompletionAction(exportedSymbol, moduleSymbol, sourceFile) {
      const exportInfos = pathIsBareSpecifier(moduleSymbol.name)
        ? [getSymbolExportInfoForSymbol(exportedSymbol, moduleSymbol)]
        : getAllReExportingModules(sourceFile, exportedSymbol, moduleSymbol);
      return first(exportInfos);
    }
  `;
  const unrelated = `
    function collectExports(exportedSymbol, moduleSymbol, sourceFile) {
      const exportInfos = getAllReExportingModules(sourceFile, exportedSymbol, moduleSymbol);
      return exportInfos;
    }
  `;

  const evidence = extractDependencyExplicitSourceEvidence({ path: "src/imports.ts", content: buggy });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].mechanism, "bare-explicit-source-expanded");
  assert.deepEqual(extractDependencyExplicitSourceEvidence({ path: "src/imports.ts", content: fixed }), []);
  assert.deepEqual(extractDependencyExplicitSourceEvidence({ path: "src/imports.ts", content: unrelated }), []);
});

test("abort reason evidence requires a signal-backed cancellation flag and empty rejection", () => {
  const buggy = `
    function fetch() {
      let cancelled = false;
      addConsumeAwareSignal(value, () => context.signal, () => (cancelled = true));
      async function fetchPage() {
        if (cancelled) return Promise.reject();
        return load();
      }
      return fetchPage();
    }
  `;
  const fixed = buggy.replace("Promise.reject()", "Promise.reject(context.signal.reason)");
  const unrelated = `
    function fetch() {
      let cancelled = false;
      async function fetchPage() {
        if (cancelled) return Promise.reject();
        return load();
      }
      return fetchPage();
    }
  `;

  const evidence = extractAbortReasonDropEvidence({ path: "src/query.ts", content: buggy });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].signalExpression, "context.signal");
  assert.deepEqual(extractAbortReasonDropEvidence({ path: "src/query.ts", content: fixed }), []);
  assert.deepEqual(extractAbortReasonDropEvidence({ path: "src/query.ts", content: unrelated }), []);
});

test("default option evidence follows object spread precedence", () => {
  const buggy = `
    function build() {
      return run({
        transform: {
          ...rolldownOptions.transform,
          target: ESBUILD_BASELINE_TARGET,
        },
      });
    }
  `;
  const fixed = `
    function build() {
      return run({
        transform: {
          target: ESBUILD_BASELINE_TARGET,
          ...rolldownOptions.transform,
        },
      });
    }
  `;
  const unrelated = `
    function build() {
      return run({ ...internalState, target: ESBUILD_BASELINE_TARGET });
    }
  `;
  const preservingMerge = `
    function writeConfig(existingConfig) {
      const existingCapabilities = existingConfig.capabilities.filter(Boolean);
      return {
        ...existingConfig,
        capabilities: [
          ...existingCapabilities,
          ...DEFAULT_CAPABILITIES,
        ],
      };
    }
  `;

  const evidence = extractDefaultOptionOverrideEvidence({ path: "src/options.ts", content: buggy });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].property, "target");
  assert.deepEqual(extractDefaultOptionOverrideEvidence({ path: "src/options.ts", content: fixed }), []);
  assert.deepEqual(extractDefaultOptionOverrideEvidence({ path: "src/options.ts", content: unrelated }), []);
  assert.deepEqual(
    extractDefaultOptionOverrideEvidence({ path: "src/options.ts", content: preservingMerge }),
    [],
  );
});

test("abort listener lifetime evidence clears on matching removal", () => {
  const buggy = `
    function withCancel(fn, signal) {
      return new Promise((resolve, reject) => {
        const onAbort = () => reject(signal.reason);
        signal.addEventListener("abort", onAbort, { once: true });
        try {
          fn().then(resolve, reject);
          resolve("sync");
        } catch (error) {
          reject(error);
        }
      });
    }
  `;
  const fixed = buggy.replace(
    'signal.addEventListener("abort", onAbort, { once: true });',
    'signal.addEventListener("abort", onAbort, { once: true });\\n        signal.removeEventListener("abort", onAbort);',
  );
  const unrelated = `
    function wait(signal) {
      return new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    }
  `;

  const evidence = extractAbortListenerLifetimeEvidence({ path: "src/context.ts", content: buggy });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].mechanism, "abort-listener-retained-after-settlement");
  assert.deepEqual(extractAbortListenerLifetimeEvidence({ path: "src/context.ts", content: fixed }), []);
  assert.deepEqual(extractAbortListenerLifetimeEvidence({ path: "src/context.ts", content: unrelated }), []);
});

test("reference-position evidence distinguishes class property keys from values", () => {
  const buggy = `
    const kind = "PropertyDefinition";
    function isRefIdentifier(id, parent) {
      if (parent.type === "MethodDefinition" && !parent.computed) return false;
      if (isStaticPropertyKey(id, parent)) return false;
      return true;
    }
  `;
  const fixed = `
    const kind = "PropertyDefinition";
    function isRefIdentifier(id, parent) {
      if (parent.type === "MethodDefinition" && !parent.computed) return false;
      if (parent.type === "PropertyDefinition" && !parent.computed) return id === parent.value;
      if (isStaticPropertyKey(id, parent)) return false;
      return true;
    }
  `;
  const unrelated = `
    const kind = "PropertyDefinition";
    function classifyNode(id, parent) {
      if (parent.type === "MethodDefinition" && !parent.computed) return false;
      if (isStaticPropertyKey(id, parent)) return false;
      return true;
    }
  `;

  const evidence = extractReferencePositionEvidence({ path: "src/walker.ts", content: buggy });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].missingExclusion, "PropertyDefinition.noncomputed-key");
  assert.deepEqual(extractReferencePositionEvidence({ path: "src/walker.ts", content: fixed }), []);
  assert.deepEqual(extractReferencePositionEvidence({ path: "src/walker.ts", content: unrelated }), []);
});

test("cache revalidation evidence identifies zero freshness discarded despite validators", () => {
  const buggy = `
    function determineStaleAt(cacheControlDirectives, resHeaders) {
      const maxAge = cacheControlDirectives["max-age"];
      if (resHeaders.etag) observe(resHeaders.etag);
      if (maxAge !== undefined)
        return maxAge > 0 ? maxAge * 1000 : undefined;
      return undefined;
    }
  `;
  const fixed = `
    function determineStaleAt(cacheControlDirectives, resHeaders, hasValidator) {
      const maxAge = cacheControlDirectives["max-age"];
      if (resHeaders.etag) observe(resHeaders.etag);
      if (maxAge !== undefined) {
        if (maxAge > 0) return maxAge * 1000;
        return maxAge === 0 && hasValidator ? 0 : undefined;
      }
      return undefined;
    }
  `;
  const unrelated = buggy.replaceAll("resHeaders.etag", "resHeaders.authorization");

  const evidence = extractCacheRevalidationEvidence({ path: "src/cache.ts", content: buggy });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].mechanism, "validator-zero-freshness-not-stored");
  assert.deepEqual(extractCacheRevalidationEvidence({ path: "src/cache.ts", content: fixed }), []);
  assert.deepEqual(extractCacheRevalidationEvidence({ path: "src/cache.ts", content: unrelated }), []);
});

test("pending callback cleanup evidence follows the lifecycle implementation", () => {
  const buggy = `
    class Device {
      private _callbacks = new Map();
      private _send(id) {
        return new Promise((fulfill, reject) =>
          this._callbacks.set(id, { fulfill, reject }));
      }
      async close() { await this._close(); }
      private async _close() { await this._backend.close(); }
    }
  `;
  const fixed = buggy.replace(
    "private async _close() { await this._backend.close(); }",
    `private async _close() {
      for (const callback of this._callbacks.values())
        callback.reject(new Error("closed"));
      this._callbacks.clear();
      await this._backend.close();
    }`,
  );
  const unrelated = `
    class Device {
      private _callbacks = new Map();
      private _send(id, callback) { this._callbacks.set(id, callback); }
      private async _close() { await this._backend.close(); }
    }
  `;

  const evidence = extractPendingCallbackCleanupEvidence({ path: "src/device.ts", content: buggy });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].closeMethod, "_close");
  assert.deepEqual(extractPendingCallbackCleanupEvidence({ path: "src/device.ts", content: fixed }), []);
  assert.deepEqual(extractPendingCallbackCleanupEvidence({ path: "src/device.ts", content: unrelated }), []);
});

test("auto-import path evidence distinguishes ranking from explicit auto-import mode", () => {
  const buggy = `
    function computeModuleSpecifiers(importedFileIsInNodeModules, modulePath) {
      if (!importedFileIsInNodeModules || modulePath.isInNodeModules)
        return modulePath.path;
      return undefined;
    }
  `;
  const fixed = `
    function computeModuleSpecifiers(importedFileIsInNodeModules, modulePath, forAutoImport) {
      if (forAutoImport || !importedFileIsInNodeModules || modulePath.isInNodeModules)
        return modulePath.path;
      return undefined;
    }
  `;
  const unrelated = buggy.replace("computeModuleSpecifiers", "filterPaths");

  const evidence = extractAutoImportPathPreferenceEvidence({ path: "src/modules.ts", content: buggy });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].candidateBinding, "modulePath");
  assert.deepEqual(extractAutoImportPathPreferenceEvidence({ path: "src/modules.ts", content: fixed }), []);
  assert.deepEqual(extractAutoImportPathPreferenceEvidence({ path: "src/modules.ts", content: unrelated }), []);
});

test("error-code wrapping evidence requires a stream adapter and retry code contract", () => {
  const buggy = `
    function sendWithRetries(error) {
      if (error.code !== "ECONNRESET") throw error;
    }
    function send(response, transform, reject) {
      pipeline(response, transform, error => {
        if (error)
          reject(new Error(\`decompression failed: \${error.message}\`));
      });
    }
  `;
  const fixed = `
    function sendWithRetries(error) {
      if (error.code !== "ECONNRESET") throw error;
    }
    function send(response, transform, reject) {
      pipeline(response, transform, error => {
        if (error) {
          if (error.code === "ECONNRESET") reject(error);
          else reject(new Error(\`decompression failed: \${error.message}\`));
        }
      });
    }
  `;
  const unrelated = `
    function sendWithRetries(error) {
      if (error.code !== "ECONNRESET") throw error;
      throw new Error(\`request failed: \${error.message}\`);
    }
  `;

  const evidence = extractErrorCodeWrappingEvidence({ path: "src/fetch.ts", content: buggy });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].retryCode, "ECONNRESET");
  assert.deepEqual(extractErrorCodeWrappingEvidence({ path: "src/fetch.ts", content: fixed }), []);
  assert.deepEqual(extractErrorCodeWrappingEvidence({ path: "src/fetch.ts", content: unrelated }), []);
});

test("mode default evidence requires an unguarded browser-sensitive assignment", () => {
  const buggy = `
    function configure(environment, browserEnabled) {
      environment.dev.preTransformRequests = false;
      return environment;
    }
  `;
  const fixed = `
    function configure(environment, browserEnabled) {
      if (!browserEnabled)
        environment.dev.preTransformRequests = false;
      return environment;
    }
  `;
  const unrelated = buggy.replace("browserEnabled", "workerEnabled");

  const evidence = extractModeDefaultOverrideEvidence({ path: "src/config.ts", content: buggy });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].property, "preTransformRequests");
  assert.deepEqual(extractModeDefaultOverrideEvidence({ path: "src/config.ts", content: fixed }), []);
  assert.deepEqual(extractModeDefaultOverrideEvidence({ path: "src/config.ts", content: unrelated }), []);
});

test("owned browser lifetime evidence requires browser enumeration and an incomplete server close", () => {
  const buggy = `
    class PlaywrightServer {
      private _playwright;
      list() { return this._playwright.allBrowsers(); }
      async close() { await this._wsServer.close(); }
    }
  `;
  const fixed = `
    class PlaywrightServer {
      private _playwright;
      list() { return this._playwright.allBrowsers(); }
      async close() {
        await this._wsServer.close();
        for (const browser of this._playwright.allBrowsers())
          await browser.close();
      }
    }
  `;
  const unrelated = `
    class PlaywrightClient {
      private _playwright;
      list() { return this._playwright.allBrowsers(); }
      async close() { await this._transport.close(); }
    }
  `;

  const evidence = extractOwnedBrowserLifetimeEvidence({ path: "src/server.ts", content: buggy });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].owner, "this._playwright");
  assert.deepEqual(extractOwnedBrowserLifetimeEvidence({ path: "src/server.ts", content: fixed }), []);
  assert.deepEqual(extractOwnedBrowserLifetimeEvidence({ path: "src/client.ts", content: unrelated }), []);
});

test("nested loop initialization evidence requires lowering without a nested for-init exception", () => {
  const buggy = `
    function transformBlockScopedVariable(path, t) {
      if (isInLoop(path) && !isVarInLoopHead(path)) {
        for (const decl of path.node.declarations)
          decl.init ??= t.buildUndefinedNode();
      }
    }
  `;
  const fixed = `
    function transformBlockScopedVariable(path, t) {
      const loopBody = isInLoop(path) && !isVarInLoopHead(path);
      const nestedForInit = isVarInForStatementInit(path) && isInLoop(path.parentPath);
      if (loopBody || nestedForInit) {
        for (const decl of path.node.declarations)
          decl.init ??= t.buildUndefinedNode();
      }
    }
  `;
  const unrelated = buggy.replace("t.buildUndefinedNode()", "undefined");

  const evidence = extractNestedLoopInitializationEvidence({ path: "src/scope.ts", content: buggy });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].pathParameter, "path");
  assert.deepEqual(extractNestedLoopInitializationEvidence({ path: "src/scope.ts", content: fixed }), []);
  assert.deepEqual(extractNestedLoopInitializationEvidence({ path: "src/scope.ts", content: unrelated }), []);
});
