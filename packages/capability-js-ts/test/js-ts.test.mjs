import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import capability, {
  extractCacheContractEvidence,
  extractCleanupCompletenessEvidence,
  extractDependencyCandidateBypassEvidence,
  extractDependencyResolutionEvidence,
  extractErrorControlFlowEvidence,
  extractErrorReasonPropagationEvidence,
  extractOptionFalsyDefaultEvidence,
  extractOptionPropagationEvidence,
  extractResourceLifetimeEvidence,
  extractScopeResolutionEvidence,
  jsTsProvider,
} from "../dist/index.js";

test("built-in capability uses defineCapability-compatible manifest", () => {
  assert.equal(capability.manifest.id, "@rekon/capability-js-ts");
  assert.deepEqual(capability.manifest.roles, ["evidence-provider"]);
  assert.deepEqual(capability.manifest.produces, ["EvidenceGraph"]);
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
