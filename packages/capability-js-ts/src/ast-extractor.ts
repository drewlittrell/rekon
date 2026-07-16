// AST-backed JS/TS evidence extractor.
//
// Uses the TypeScript compiler parser API
// (`ts.createSourceFile`, `ts.forEachChild`) to walk a
// single source file's syntactic AST and emit structured
// records that the provider promotes into `symbol` /
// `export` / `import` `EvidenceGraph` facts.
//
// Parser-only by design — no typechecker, no program,
// no typechecker, no inferred receiver types, and no inferred return types.
// Cross-file calls are emitted only when local import bindings resolve to a
// repository file. AST stays optional enrichment, not foundational truth.
//
// Returns structured records (not facts) so the provider
// stays in charge of fact construction, dedupe, and
// provenance. Records intentionally omit per-occurrence
// line/column from the dedupe surface — the provider
// reads `location` for `import` facts only (where the
// legacy behaviour also keyed by line), and drops it for
// `export` / `symbol` facts so duplicate declarations
// continue to dedupe via the canonical
// `kind + subject + value + provenance` key.

import ts from "typescript";

export type AstLanguage = "typescript" | "javascript";

export type AstSymbolKind =
  | "function"
  | "class"
  | "method"
  | "variable"
  | "interface"
  | "type"
  | "enum"
  | "object"
  | "unknown";

export type AstExportKind =
  | "named"
  | "default"
  | "re-export"
  | "type-only"
  | "namespace";

export type AstImportKind =
  | "value"
  | "dynamic"
  | "type-only"
  | "namespace"
  | "side-effect";

export type AstConfidence = "high" | "medium" | "low";

/** Subset of the original declaration keyword. Used to
 *  preserve the legacy `value.kind` enum that downstream
 *  consumers already understand. `"unknown"` indicates
 *  the AST did not have a single canonical keyword (e.g.
 *  named-export-list entries reference an existing
 *  symbol, so the keyword is not knowable without
 *  cross-file resolution). */
type AstDeclarationKeyword =
  | "function"
  | "class"
  | "const"
  | "let"
  | "var"
  | "type"
  | "interface"
  | "namespace"
  | "enum"
  | "default"
  | "unknown";

export interface AstLocation {
  /** 1-based line. */
  line: number;
  /** 1-based column. */
  column: number;
}

interface AstSymbolRecord {
  name: string;
  ownerName?: string;
  symbolKind: AstSymbolKind;
  syntaxKind: string;
  /** Original declaration keyword. Drives the legacy
   *  `value.kind` enum the provider continues to expose. */
  declarationKeyword: AstDeclarationKeyword;
  exported: boolean;
  location: AstLocation;
}

interface AstExportRecord {
  name: string;
  exportKind: AstExportKind;
  syntaxKind: string;
  declarationKeyword: AstDeclarationKeyword;
  isDefault: boolean;
  location: AstLocation;
  /** Set when the export references another module
   *  (re-export / namespace). */
  moduleSpecifier?: string;
}

interface AstImportRecord {
  /** Module specifier (the import target). */
  target: string;
  importKind: AstImportKind;
  syntaxKind: string;
  location: AstLocation;
}

type AstImportSpecifierKind =
  | "named"
  | "default"
  | "namespace"
  | "side-effect";

/** WO-8: symbol-level import edge - which symbol a file
 *  imports from where, beyond file-to-file. */
interface AstImportSpecifierRecord {
  /** Module specifier (the import target). */
  target: string;
  /** Name as exported by the target module ("default" for
   *  default imports, "*" for namespace / side-effect). */
  name: string;
  /** Local binding name ("*" for side-effect imports). */
  local: string;
  specifierKind: AstImportSpecifierKind;
  typeOnly: boolean;
  location: AstLocation;
}

type AstReexportKind = "named" | "star" | "namespace";

/** WO-8: re-export chain edge (`export ... from "..."`). */
interface AstReexportRecord {
  /** Module specifier (the re-export source). */
  target: string;
  /** Name as exported by the target ("*" for star forms). */
  name: string;
  /** Name this module exposes it as ("*" for bare star). */
  exportedAs: string;
  reexportKind: AstReexportKind;
  typeOnly: boolean;
  location: AstLocation;
}

interface AstCallRecord {
  caller: string;
  callee: string;
  receiver?: string;
  callKind: "call" | "construct";
  syntaxKind: string;
  location: AstLocation;
}

export type ErrorControlFlowGuard = {
  kind: "if";
  expression: string;
  operator: "and" | "or" | "single";
  terms: string[];
  polarity: "when-true" | "when-false";
  location: AstLocation;
};

export type ErrorIdentityMapping = {
  identity: string;
  property: string;
  expression: string;
  location: AstLocation;
};

export type ErrorControlFlowEvidence = {
  kind: "error";
  caller: string;
  action: "throw" | "rethrow";
  errorName?: string;
  errorIdentity?: string;
  expressionKind: "identifier" | "object" | "constructor" | "other";
  guards: ErrorControlFlowGuard[];
  identityMappings: ErrorIdentityMapping[];
  location: AstLocation;
};

export type ErrorReasonPropagationEvidence = {
  kind: "error-reason";
  caller: string;
  mechanism: "cause-with-default-message";
  errorIdentity: string;
  messageExpression: string;
  causeExpression: string;
  location: AstLocation;
  messageLocation: AstLocation;
  causeLocation: AstLocation;
};

export type AbortReasonDropEvidence = {
  kind: "abort-reason-drop";
  caller: string;
  mechanism: "abort-rejection-without-reason";
  cancellationBinding: string;
  signalExpression: string;
  rejectionExpression: string;
  location: AstLocation;
  cancellationLocation: AstLocation;
  signalLocation: AstLocation;
};

export type ErrorCodeWrappingEvidence = {
  kind: "error-code-wrapping";
  caller: string;
  mechanism: "error-code-lost-by-wrapping";
  errorIdentifier: string;
  wrapperExpression: string;
  retryCode: string;
  location: AstLocation;
  wrapperLocation: AstLocation;
  retryCheckLocation: AstLocation;
};

export type PromiseEventErrorBridgeEvidence = {
  kind: "promise-event-error-bridge";
  caller: string;
  mechanism: "unforwarded-emitter-error";
  emitter: string;
  successEvents: string[];
  rejectIdentifier: string;
  location: AstLocation;
  successListenerLocations: AstLocation[];
  rejectionLocation: AstLocation;
};

export type OptionPropagationEvidence = {
  kind: "option-override";
  caller: string;
  property: string;
  spreadSource: string;
  overrideSource: string;
  overrideExpression: string;
  overrideKind: "shorthand" | "direct" | "fallback";
  fallbackOperator?: "nullish" | "logical-or";
  fallbackTarget?: string;
  preservesSpreadValue: boolean;
  callbackParameter?: string;
  callbackProperty?: string;
  callbackOwner?: string;
  location: AstLocation;
  objectLocation: AstLocation;
};

export type DefaultOptionOverrideEvidence = {
  kind: "default-option-override";
  caller: string;
  mechanism: "default-after-user-options";
  property: string;
  spreadSource: string;
  defaultExpression: string;
  location: AstLocation;
  spreadLocation: AstLocation;
  objectLocation: AstLocation;
};

export type ModeDefaultOverrideEvidence = {
  kind: "mode-default-override";
  caller: string;
  mechanism: "mode-specific-default-unconditionally-forced";
  property: string;
  defaultExpression: string;
  modeSignal: string;
  assignmentKind: "property" | "assignment";
  location: AstLocation;
  modeLocation: AstLocation;
};

export type OptionFalsyDefaultEvidence = {
  kind: "option-falsy-default";
  caller: string;
  mechanism: "truthy-default-overrides-falsy";
  property: string;
  optionContainer: string;
  optionExpression: string;
  defaultExpression: string;
  defaultSource: string;
  defaultValue: true;
  location: AstLocation;
  optionLocation: AstLocation;
  defaultLocation: AstLocation;
};

export type RequestSignalForwardingEvidence = {
  kind: "request-signal-forwarding";
  caller: string;
  mechanism: "derived-request-signal-forwarded";
  requestBinding: string;
  inputParameter: string;
  initParameter: string;
  requestExpression: string;
  forwardedSignal: string;
  outputPath: "options.signal";
  normalizedMembers: string[];
  location: AstLocation;
  requestLocation: AstLocation;
  outputLocation: AstLocation;
};

export type ResourceLifetimeEvidence = {
  kind: "resource-lifetime";
  action: "retain" | "release";
  caller: string;
  resource: string;
  target: string;
  ownerKind: "socket" | "connection" | "server";
  retainedNames?: string[];
  location: AstLocation;
};

export type TerminalEventListenerEvidence = {
  kind: "terminal-event-listener";
  mechanism: "terminal-listener-retained";
  caller: string;
  target: string;
  eventName: "readystatechange";
  handlerName: string;
  terminalCondition: string;
  terminalProperty: "readyState";
  terminalValue: "4";
  location: AstLocation;
  handlerLocation: AstLocation;
  terminalLocation: AstLocation;
};

export type AbortListenerLifetimeEvidence = {
  kind: "abort-listener-lifetime";
  caller: string;
  mechanism: "abort-listener-retained-after-settlement";
  target: string;
  eventName: "abort";
  handlerExpression: string;
  resolveIdentifier: string;
  rejectIdentifier: string;
  location: AstLocation;
  handlerLocation: AstLocation;
  settlementLocations: AstLocation[];
};

export type OwnedBrowserLifetimeEvidence = {
  kind: "owned-browser-lifetime";
  caller: string;
  mechanism: "server-owned-browsers-not-closed";
  owner: string;
  browserCollection: string;
  transportCloseExpression: string;
  location: AstLocation;
  ownershipLocation: AstLocation;
  transportCloseLocation: AstLocation;
};

export type ScopeResolutionEvidence = {
  kind: "scope-model";
  classifierName: string;
  classifierExpression: string;
  resolverFunctions: string[];
  modeledNodeKinds: string[];
  unmodeledLexicalBoundaries: string[];
  handlesSwitchCases: boolean;
  rewritesIdentifiers: boolean;
  excludesSwitchDiscriminant: boolean;
  location: AstLocation;
};

export type ScopeNameResolutionEvidence = {
  kind: "scope-name-resolution";
  mechanism: "name-only-reference-owner";
  caller: string;
  bindTarget: string;
  scopeBinding: string;
  analysisExpression: string;
  referenceCollection: string;
  referenceParameter: string;
  ownerLookup: string;
  location: AstLocation;
  analysisLocation: AstLocation;
  collectionLocation: AstLocation;
  ownerLookupLocation: AstLocation;
};

export type ScopeTraversalEscapeEvidence = {
  kind: "scope-traversal-escape";
  mechanism: "switch-discriminant-not-requeued";
  visitor: string;
  scopeHandler: "Scope";
  pathParameter: string;
  bindingCheck: string;
  skipExpression: string;
  modeledExceptions: string[];
  missingParentEvaluatedChildren: ["SwitchStatement.discriminant"];
  location: AstLocation;
  handlerLocation: AstLocation;
  bindingCheckLocation: AstLocation;
  skipLocation: AstLocation;
  exceptionLocation: AstLocation;
};

export type ReferencePositionEvidence = {
  kind: "reference-position";
  caller: string;
  mechanism: "noncomputed-class-property-key-reference";
  parentParameter: string;
  modeledExclusions: string[];
  missingExclusion: "PropertyDefinition.noncomputed-key";
  location: AstLocation;
  methodExclusionLocation: AstLocation;
  propertyKeyExclusionLocation: AstLocation;
};

export type NestedLoopInitializationEvidence = {
  kind: "nested-loop-initialization";
  caller: string;
  mechanism: "nested-loop-head-reinitialization-missing";
  pathParameter: string;
  loopCondition: string;
  initializationExpression: string;
  location: AstLocation;
  conditionLocation: AstLocation;
  initializationLocation: AstLocation;
};

export type DependencyResolutionEvidence = {
  kind: "dependency-selection";
  caller: string;
  selectedBinding: string;
  candidateExpression: string;
  collectionExpression: string;
  exitKind: "conditional-break" | "unconditional-break" | "none";
  exitCondition?: string;
  returnedAfterLoop: boolean;
  selectionLocation: AstLocation;
  exitLocation?: AstLocation;
  location: AstLocation;
};

export type DependencyCandidateBypassEvidence = {
  kind: "dependency-candidate-bypass";
  caller: string;
  resolver: string;
  mechanism: "iterated-candidate-bypass";
  candidateParameter: string;
  candidateBindings: string[];
  collectionExpression: string;
  bypassExpression: string;
  selectorExpressions: string[];
  guardExpression: string;
  location: AstLocation;
  iterationLocation: AstLocation;
  bypassLocation: AstLocation;
  guardLocation: AstLocation;
};

export type DependencyNamespaceAmbiguityEvidence = {
  kind: "dependency-namespace-ambiguity";
  mechanism: "multi-namespace-first-match";
  caller: string;
  selectedBinding: string;
  collectionExpression: string;
  candidateParameter: string;
  selectorExpression: string;
  matchedProperties: string[];
  canonicalProperty: string;
  returnExpression: string;
  ambiguitySignal: string;
  location: AstLocation;
  selectionLocation: AstLocation;
  predicateLocation: AstLocation;
  returnLocation: AstLocation;
  ambiguityLocation: AstLocation;
};

export type DependencyExplicitSourceEvidence = {
  kind: "dependency-explicit-source";
  caller: string;
  mechanism: "bare-explicit-source-expanded";
  resultBinding: string;
  expansionFunction: string;
  explicitModuleExpression: string;
  location: AstLocation;
  expansionLocation: AstLocation;
};

export type AutoImportPathPreferenceEvidence = {
  kind: "auto-import-path-preference";
  caller: string;
  mechanism: "auto-import-node-modules-relative-preference";
  importedFileBinding: string;
  candidateBinding: string;
  guardExpression: string;
  location: AstLocation;
  guardLocation: AstLocation;
};

export type CacheContractEvidence = {
  kind: "cache-contract";
  caller: string;
  factory: string;
  cacheBinding: string;
  keyExpression: string;
  keyParameters: string[];
  omittedResultParameters: string[];
  guardExpression: string;
  guardedReturnExpression: string;
  fallbackReturnExpression: string;
  location: AstLocation;
  guardLocation: AstLocation;
  fallbackLocation: AstLocation;
};

export type CacheKeyNormalizationEvidence = {
  kind: "cache-key-normalization";
  caller: string;
  mechanism: "raw-cache-input-after-normalization";
  normalizedBinding: string;
  rawInput: string;
  fallbackExpression: string;
  guardExpression: string;
  keyExpression: string;
  location: AstLocation;
  guardLocation: AstLocation;
  keyLocation: AstLocation;
};

export type CacheRevalidationEvidence = {
  kind: "cache-revalidation";
  caller: string;
  mechanism: "validator-zero-freshness-not-stored";
  directiveBinding: string;
  staleExpression: string;
  location: AstLocation;
  returnLocation: AstLocation;
};

export type PromiseCacheRejectionEvidence = {
  kind: "promise-cache-rejection";
  caller: string;
  mechanism: "rejected-promise-retained";
  cacheBinding: string;
  guardExpression: string;
  promiseExpression: string;
  returnExpression: string;
  location: AstLocation;
  guardLocation: AstLocation;
  returnLocation: AstLocation;
};

export type CleanupCompletenessEvidence = {
  kind: "cleanup-contract";
  caller: string;
  mechanism: "fail-fast-aggregate" | "sequential-unhandled-awaits";
  obligations: string[];
  location: AstLocation;
  obligationLocations: AstLocation[];
};

export type TeardownInterruptionEvidence = {
  kind: "teardown-interruption";
  caller: string;
  mechanism: "teardown-shares-stop-policy";
  teardownCollection: string;
  dispatcherExpression: string;
  location: AstLocation;
  teardownLocation: AstLocation;
  dispatcherLocation: AstLocation;
};

export type PendingCallbackCleanupEvidence = {
  kind: "pending-callback-cleanup";
  caller: string;
  mechanism: "pending-callbacks-not-settled-on-close";
  callbackCollection: string;
  registrationMethod: string;
  closeMethod: string;
  location: AstLocation;
  registrationLocation: AstLocation;
  closeLocation: AstLocation;
};

export type AsyncEffectContinuationEvidence = {
  kind: "async-effect-continuation";
  caller: string;
  mechanism: "superseded-effect-continuation";
  hook: string;
  promiseMethod: "all" | "allSettled";
  dependencies: string[];
  stateSetters: string[];
  aggregateExpression: string;
  location: AstLocation;
  continuationLocation: AstLocation;
  setterLocations: AstLocation[];
  dependencyLocation: AstLocation;
};

type AstFlowRecord =
  | { kind: "event"; caller: string; action: "emit" | "subscribe"; eventName: string; receiver: string; location: AstLocation }
  | { kind: "member-call"; caller: string; root: string; members: string[]; location: AstLocation }
  | ErrorControlFlowEvidence
  | ErrorReasonPropagationEvidence
  | AbortReasonDropEvidence
  | ErrorCodeWrappingEvidence
  | PromiseEventErrorBridgeEvidence
  | OptionPropagationEvidence
  | DefaultOptionOverrideEvidence
  | ModeDefaultOverrideEvidence
  | OptionFalsyDefaultEvidence
  | RequestSignalForwardingEvidence
  | ResourceLifetimeEvidence
  | TerminalEventListenerEvidence
  | AbortListenerLifetimeEvidence
  | OwnedBrowserLifetimeEvidence
  | ScopeResolutionEvidence
  | ScopeNameResolutionEvidence
  | ScopeTraversalEscapeEvidence
  | ReferencePositionEvidence
  | NestedLoopInitializationEvidence
  | DependencyResolutionEvidence
  | DependencyCandidateBypassEvidence
  | DependencyNamespaceAmbiguityEvidence
  | DependencyExplicitSourceEvidence
  | AutoImportPathPreferenceEvidence
  | CacheContractEvidence
  | CacheKeyNormalizationEvidence
  | CacheRevalidationEvidence
  | PromiseCacheRejectionEvidence
  | CleanupCompletenessEvidence
  | TeardownInterruptionEvidence
  | PendingCallbackCleanupEvidence
  | AsyncEffectContinuationEvidence;

export interface AstExtractionResult {
  language: AstLanguage;
  symbols: AstSymbolRecord[];
  exports: AstExportRecord[];
  imports: AstImportRecord[];
  importSpecifiers: AstImportSpecifierRecord[];
  reexports: AstReexportRecord[];
  calls: AstCallRecord[];
  flows: AstFlowRecord[];
}

interface AstExtractionInput {
  /** Repo-relative path (used only to infer ScriptKind +
   *  language; the parser reads from the supplied
   *  content). */
  path: string;
  content: string;
}

/**
 * Extract structured AST records from a single JS/TS
 * source file. Throws if the TypeScript parser cannot
 * produce a SourceFile. Callers (provider) decide
 * whether to fall back to the regex extractor when
 * extraction throws.
 */
export function extractAstRecords(
  input: AstExtractionInput,
): AstExtractionResult {
  const { path, content } = input;
  const language = languageForExtension(extensionForPath(path));
  const scriptKind = scriptKindForExtension(extensionForPath(path));
  const sourceFile = ts.createSourceFile(
    path,
    content,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    scriptKind,
  );

  const result: AstExtractionResult = {
    language,
    symbols: [],
    exports: [],
    imports: [],
    importSpecifiers: [],
    reexports: [],
    calls: [],
    flows: [],
  };

  visit(sourceFile, sourceFile, result);
  result.calls.push(...extractCallRecords(sourceFile));
  result.flows.push(...extractFlowRecords(sourceFile));

  return result;
}

export function extractErrorControlFlowEvidence(input: AstExtractionInput): ErrorControlFlowEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is ErrorControlFlowEvidence => record.kind === "error",
  );
}

export function extractErrorReasonPropagationEvidence(input: AstExtractionInput): ErrorReasonPropagationEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is ErrorReasonPropagationEvidence => record.kind === "error-reason",
  );
}

export function extractAbortReasonDropEvidence(input: AstExtractionInput): AbortReasonDropEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is AbortReasonDropEvidence => record.kind === "abort-reason-drop",
  );
}

export function extractErrorCodeWrappingEvidence(input: AstExtractionInput): ErrorCodeWrappingEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is ErrorCodeWrappingEvidence => record.kind === "error-code-wrapping",
  );
}

export function extractPromiseEventErrorBridgeEvidence(
  input: AstExtractionInput,
): PromiseEventErrorBridgeEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is PromiseEventErrorBridgeEvidence => record.kind === "promise-event-error-bridge",
  );
}

export function extractOptionPropagationEvidence(input: AstExtractionInput): OptionPropagationEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is OptionPropagationEvidence => record.kind === "option-override",
  );
}

export function extractDefaultOptionOverrideEvidence(input: AstExtractionInput): DefaultOptionOverrideEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is DefaultOptionOverrideEvidence => record.kind === "default-option-override",
  );
}

export function extractModeDefaultOverrideEvidence(input: AstExtractionInput): ModeDefaultOverrideEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is ModeDefaultOverrideEvidence => record.kind === "mode-default-override",
  );
}

export function extractOptionFalsyDefaultEvidence(input: AstExtractionInput): OptionFalsyDefaultEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is OptionFalsyDefaultEvidence => record.kind === "option-falsy-default",
  );
}

export function extractRequestSignalForwardingEvidence(
  input: AstExtractionInput,
): RequestSignalForwardingEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is RequestSignalForwardingEvidence => record.kind === "request-signal-forwarding",
  );
}

export function extractResourceLifetimeEvidence(input: AstExtractionInput): ResourceLifetimeEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is ResourceLifetimeEvidence => record.kind === "resource-lifetime",
  );
}

export function extractTerminalEventListenerEvidence(
  input: AstExtractionInput,
): TerminalEventListenerEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is TerminalEventListenerEvidence => record.kind === "terminal-event-listener",
  );
}

export function extractAbortListenerLifetimeEvidence(
  input: AstExtractionInput,
): AbortListenerLifetimeEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is AbortListenerLifetimeEvidence => record.kind === "abort-listener-lifetime",
  );
}

export function extractOwnedBrowserLifetimeEvidence(input: AstExtractionInput): OwnedBrowserLifetimeEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is OwnedBrowserLifetimeEvidence => record.kind === "owned-browser-lifetime",
  );
}

export function extractScopeResolutionEvidence(input: AstExtractionInput): ScopeResolutionEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is ScopeResolutionEvidence => record.kind === "scope-model",
  );
}

export function extractScopeNameResolutionEvidence(input: AstExtractionInput): ScopeNameResolutionEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is ScopeNameResolutionEvidence => record.kind === "scope-name-resolution",
  );
}

export function extractScopeTraversalEscapeEvidence(
  input: AstExtractionInput,
): ScopeTraversalEscapeEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is ScopeTraversalEscapeEvidence => record.kind === "scope-traversal-escape",
  );
}

export function extractReferencePositionEvidence(input: AstExtractionInput): ReferencePositionEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is ReferencePositionEvidence => record.kind === "reference-position",
  );
}

export function extractNestedLoopInitializationEvidence(
  input: AstExtractionInput,
): NestedLoopInitializationEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is NestedLoopInitializationEvidence => record.kind === "nested-loop-initialization",
  );
}

export function extractDependencyResolutionEvidence(input: AstExtractionInput): DependencyResolutionEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is DependencyResolutionEvidence => record.kind === "dependency-selection",
  );
}

export function extractDependencyCandidateBypassEvidence(input: AstExtractionInput): DependencyCandidateBypassEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is DependencyCandidateBypassEvidence => record.kind === "dependency-candidate-bypass",
  );
}

export function extractDependencyNamespaceAmbiguityEvidence(
  input: AstExtractionInput,
): DependencyNamespaceAmbiguityEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is DependencyNamespaceAmbiguityEvidence =>
      record.kind === "dependency-namespace-ambiguity",
  );
}

export function extractDependencyExplicitSourceEvidence(
  input: AstExtractionInput,
): DependencyExplicitSourceEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is DependencyExplicitSourceEvidence => record.kind === "dependency-explicit-source",
  );
}

export function extractAutoImportPathPreferenceEvidence(
  input: AstExtractionInput,
): AutoImportPathPreferenceEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is AutoImportPathPreferenceEvidence => record.kind === "auto-import-path-preference",
  );
}

export function extractCacheContractEvidence(input: AstExtractionInput): CacheContractEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is CacheContractEvidence => record.kind === "cache-contract",
  );
}

export function extractCacheKeyNormalizationEvidence(input: AstExtractionInput): CacheKeyNormalizationEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is CacheKeyNormalizationEvidence => record.kind === "cache-key-normalization",
  );
}

export function extractCacheRevalidationEvidence(input: AstExtractionInput): CacheRevalidationEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is CacheRevalidationEvidence => record.kind === "cache-revalidation",
  );
}

export function extractPromiseCacheRejectionEvidence(
  input: AstExtractionInput,
): PromiseCacheRejectionEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is PromiseCacheRejectionEvidence => record.kind === "promise-cache-rejection",
  );
}

export function extractCleanupCompletenessEvidence(input: AstExtractionInput): CleanupCompletenessEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is CleanupCompletenessEvidence => record.kind === "cleanup-contract",
  );
}

export function extractTeardownInterruptionEvidence(input: AstExtractionInput): TeardownInterruptionEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is TeardownInterruptionEvidence => record.kind === "teardown-interruption",
  );
}

export function extractPendingCallbackCleanupEvidence(
  input: AstExtractionInput,
): PendingCallbackCleanupEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is PendingCallbackCleanupEvidence => record.kind === "pending-callback-cleanup",
  );
}

export function extractAsyncEffectContinuationEvidence(
  input: AstExtractionInput,
): AsyncEffectContinuationEvidence[] {
  if (!astSupportsExtension(extensionForPath(input.path))) return [];
  return extractAstRecords(input).flows.filter(
    (record): record is AsyncEffectContinuationEvidence => record.kind === "async-effect-continuation",
  );
}

function visit(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  result: AstExtractionResult,
): void {
  // ---- Imports -----------------------------------
  if (ts.isImportDeclaration(node)) {
    const target = moduleSpecifierText(node.moduleSpecifier);
    if (target) {
      result.imports.push({
        target,
        importKind: classifyImport(node),
        syntaxKind: ts.SyntaxKind[node.kind],
        location: locationOf(node, sourceFile),
      });
      collectImportSpecifiers(node, target, sourceFile, result);
    }
  } else if (ts.isImportEqualsDeclaration(node)) {
    const target = moduleReferenceTarget(node.moduleReference);
    if (target) {
      result.imports.push({
        target,
        importKind: "value",
        syntaxKind: ts.SyntaxKind[node.kind],
        location: locationOf(node, sourceFile),
      });
    }
  } else if (ts.isCallExpression(node)
    && node.expression.kind === ts.SyntaxKind.ImportKeyword
    && node.arguments.length === 1
    && ts.isStringLiteralLike(node.arguments[0]!)) {
    result.imports.push({
      target: node.arguments[0].text,
      importKind: "dynamic",
      syntaxKind: ts.SyntaxKind[node.kind],
      location: locationOf(node, sourceFile),
    });
  }

  // ---- Top-level / member declarations ----------
  if (ts.isFunctionDeclaration(node) && node.name) {
    const exported = hasExportModifier(node);
    const isDefault = hasDefaultModifier(node);
    result.symbols.push({
      name: node.name.text,
      symbolKind: "function",
      syntaxKind: ts.SyntaxKind[node.kind],
      declarationKeyword: "function",
      exported,
      location: locationOf(node.name, sourceFile),
    });
    if (exported) {
      result.exports.push({
        name: isDefault ? "default" : node.name.text,
        exportKind: isDefault ? "default" : "named",
        syntaxKind: ts.SyntaxKind[node.kind],
        declarationKeyword: isDefault ? "default" : "function",
        isDefault,
        location: locationOf(node, sourceFile),
      });
    }
  } else if (ts.isClassDeclaration(node) && node.name) {
    const exported = hasExportModifier(node);
    const isDefault = hasDefaultModifier(node);
    result.symbols.push({
      name: node.name.text,
      symbolKind: "class",
      syntaxKind: ts.SyntaxKind[node.kind],
      declarationKeyword: "class",
      exported,
      location: locationOf(node.name, sourceFile),
    });
    if (exported) {
      result.exports.push({
        name: isDefault ? "default" : node.name.text,
        exportKind: isDefault ? "default" : "named",
        syntaxKind: ts.SyntaxKind[node.kind],
        declarationKeyword: isDefault ? "default" : "class",
        isDefault,
        location: locationOf(node, sourceFile),
      });
    }
    // Walk class members for methods.
    for (const member of node.members) {
      if (ts.isMethodDeclaration(member) && member.name) {
        const memberName = methodNameText(member.name);
        if (memberName) {
          result.symbols.push({
            name: memberName,
            ownerName: node.name.text,
            symbolKind: "method",
            syntaxKind: ts.SyntaxKind[member.kind],
            declarationKeyword: "function",
            exported: false,
            location: locationOf(member.name, sourceFile),
          });
        }
      }
    }
  } else if (ts.isInterfaceDeclaration(node)) {
    const exported = hasExportModifier(node);
    result.symbols.push({
      name: node.name.text,
      symbolKind: "interface",
      syntaxKind: ts.SyntaxKind[node.kind],
      declarationKeyword: "interface",
      exported,
      location: locationOf(node.name, sourceFile),
    });
    if (exported) {
      result.exports.push({
        name: node.name.text,
        exportKind: "named",
        syntaxKind: ts.SyntaxKind[node.kind],
        declarationKeyword: "interface",
        isDefault: false,
        location: locationOf(node, sourceFile),
      });
    }
  } else if (ts.isTypeAliasDeclaration(node)) {
    const exported = hasExportModifier(node);
    result.symbols.push({
      name: node.name.text,
      symbolKind: "type",
      syntaxKind: ts.SyntaxKind[node.kind],
      declarationKeyword: "type",
      exported,
      location: locationOf(node.name, sourceFile),
    });
    if (exported) {
      result.exports.push({
        name: node.name.text,
        exportKind: "named",
        syntaxKind: ts.SyntaxKind[node.kind],
        declarationKeyword: "type",
        isDefault: false,
        location: locationOf(node, sourceFile),
      });
    }
  } else if (ts.isEnumDeclaration(node)) {
    const exported = hasExportModifier(node);
    result.symbols.push({
      name: node.name.text,
      symbolKind: "enum",
      syntaxKind: ts.SyntaxKind[node.kind],
      declarationKeyword: "enum",
      exported,
      location: locationOf(node.name, sourceFile),
    });
    if (exported) {
      result.exports.push({
        name: node.name.text,
        exportKind: "named",
        syntaxKind: ts.SyntaxKind[node.kind],
        declarationKeyword: "enum",
        isDefault: false,
        location: locationOf(node, sourceFile),
      });
    }
  } else if (
    ts.isModuleDeclaration(node)
    && node.name
    && ts.isIdentifier(node.name)
  ) {
    // `namespace X {}` / `module X {}`
    const exported = hasExportModifier(node);
    result.symbols.push({
      name: node.name.text,
      symbolKind: "unknown",
      syntaxKind: ts.SyntaxKind[node.kind],
      declarationKeyword: "namespace",
      exported,
      location: locationOf(node.name, sourceFile),
    });
    if (exported) {
      result.exports.push({
        name: node.name.text,
        exportKind: "named",
        syntaxKind: ts.SyntaxKind[node.kind],
        declarationKeyword: "namespace",
        isDefault: false,
        location: locationOf(node, sourceFile),
      });
    }
  } else if (ts.isVariableStatement(node)) {
    const exported = hasExportModifier(node);
    const keyword = variableKeywordFor(node.declarationList);
    for (const decl of node.declarationList.declarations) {
      if (ts.isIdentifier(decl.name)) {
        const symbolKind = classifyVariable(decl.initializer);
        result.symbols.push({
          name: decl.name.text,
          symbolKind,
          syntaxKind: ts.SyntaxKind[decl.kind],
          declarationKeyword: keyword,
          exported,
          location: locationOf(decl.name, sourceFile),
        });
        if (exported) {
          result.exports.push({
            name: decl.name.text,
            exportKind: "named",
            syntaxKind: ts.SyntaxKind[decl.kind],
            declarationKeyword: keyword,
            isDefault: false,
            location: locationOf(decl, sourceFile),
          });
        }
      }
    }
  } else if (ts.isExportDeclaration(node)) {
    handleExportDeclaration(node, sourceFile, result);
  } else if (ts.isExportAssignment(node)) {
    // `export default <expr>` or `export = <expr>`
    result.exports.push({
      name: "default",
      exportKind: "default",
      syntaxKind: ts.SyntaxKind[node.kind],
      declarationKeyword: "default",
      isDefault: true,
      location: locationOf(node, sourceFile),
    });
  }

  ts.forEachChild(node, (child) => {
    visit(child, sourceFile, result);
  });
}

function extractCallRecords(sourceFile: ts.SourceFile): AstCallRecord[] {
  const records: AstCallRecord[] = [];

  const visitCalls = (node: ts.Node, context: { caller: string; className?: string }): void => {
    let childContext = context;
    if (ts.isClassDeclaration(node) && node.name) {
      childContext = { ...context, className: node.name.text };
    } else if (ts.isFunctionDeclaration(node)) {
      childContext = { ...context, caller: node.name?.text ?? "default" };
    } else if (ts.isMethodDeclaration(node)) {
      const name = methodNameText(node.name);
      if (name) childContext = { ...context, caller: context.className ? `${context.className}.${name}` : name };
    } else if (ts.isConstructorDeclaration(node)) {
      childContext = { ...context, caller: context.className ? `${context.className}.constructor` : "constructor" };
    } else if (ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.initializer
      && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
      childContext = { ...context, caller: node.name.text };
    }

    if (ts.isCallExpression(node) && node.expression.kind !== ts.SyntaxKind.ImportKeyword) {
      const target = callTarget(node.expression);
      if (target) records.push({ ...target, caller: context.caller, callKind: "call", syntaxKind: ts.SyntaxKind[node.kind], location: locationOf(node, sourceFile) });
    } else if (ts.isNewExpression(node)) {
      const target = callTarget(node.expression);
      if (target) records.push({ ...target, caller: context.caller, callKind: "construct", syntaxKind: ts.SyntaxKind[node.kind], location: locationOf(node, sourceFile) });
    }

    ts.forEachChild(node, (child) => visitCalls(child, childContext));
  };

  visitCalls(sourceFile, { caller: "__module__" });
  return records;
}

function extractFlowRecords(sourceFile: ts.SourceFile): AstFlowRecord[] {
  const records: AstFlowRecord[] = [];
  const identityMappings = extractErrorIdentityMappings(sourceFile);
  const undefinedIsShadowed = hasLocalValueBinding(sourceFile, "undefined");
  const truthyBooleanDefaults = collectTruthyBooleanDefaults(sourceFile);

  const visitFlows = (node: ts.Node, context: { caller: string; className?: string; caughtName?: string }): void => {
    let childContext = context;
    if (ts.isClassDeclaration(node) && node.name) {
      childContext = { ...context, className: node.name.text };
    } else if (ts.isFunctionDeclaration(node)) {
      childContext = { ...context, caller: node.name?.text ?? "default", caughtName: undefined };
    } else if (ts.isMethodDeclaration(node)) {
      const name = methodNameText(node.name);
      if (name) childContext = { ...context, caller: context.className ? `${context.className}.${name}` : name, caughtName: undefined };
    } else if (ts.isConstructorDeclaration(node)) {
      childContext = { ...context, caller: context.className ? `${context.className}.constructor` : "constructor", caughtName: undefined };
    } else if (ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.initializer
      && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
      childContext = { ...context, caller: node.name.text, caughtName: undefined };
    } else if (ts.isCatchClause(node) && node.variableDeclaration && ts.isIdentifier(node.variableDeclaration.name)) {
      childContext = { ...context, caughtName: node.variableDeclaration.name.text };
    }

    if (ts.isObjectLiteralExpression(node)) {
      const optionOverrides = optionPropagationRecords(node, sourceFile, context.caller);
      records.push(...optionOverrides);
      records.push(...defaultOptionOverrideRecords(node, sourceFile, context.caller));
    }

    if (ts.isBinaryExpression(node)) {
      const falsyDefault = optionFalsyDefaultRecord(
        node,
        truthyBooleanDefaults,
        sourceFile,
        context.caller,
      );
      if (falsyDefault) records.push(falsyDefault);
      if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        const resource = resourceLifetimeAssignment(node, sourceFile, context.caller);
        if (resource) records.push(resource);
      }
    } else if (ts.isDeleteExpression(node)) {
      const resource = resourceLifetimeDelete(node, sourceFile, context.caller);
      if (resource) records.push(resource);
    }

    if (ts.isNewExpression(node) && !undefinedIsShadowed) {
      const reasonPropagation = errorReasonPropagationRecord(node, sourceFile, context.caller);
      if (reasonPropagation) records.push(reasonPropagation);
    }

    if (ts.isCallExpression(node)) {
      const path = memberPath(node.expression);
      if (path && path.length >= 2) {
        records.push({ kind: "member-call", caller: context.caller, root: path[0]!, members: path.slice(1), location: locationOf(node, sourceFile) });
        const listenerRetention = resourceLifetimeListener(node, sourceFile, context.caller);
        if (listenerRetention) records.push(listenerRetention);
        const method = path.at(-1);
        const firstArg = node.arguments[0];
        const eventName = firstArg && ts.isStringLiteralLike(firstArg) ? firstArg.text : undefined;
        const action = method === "emit" || method === "dispatchEvent"
          ? "emit"
          : method === "on" || method === "once" || method === "addEventListener"
            ? "subscribe"
            : undefined;
        if (action && eventName) records.push({ kind: "event", caller: context.caller, action, eventName, receiver: path.slice(0, -1).join("."), location: locationOf(node, sourceFile) });
      }
    } else if (ts.isThrowStatement(node)) {
      const error = classifyThrownExpression(node.expression);
      records.push({
        kind: "error",
        caller: context.caller,
        action: error.errorName && error.errorName === context.caughtName ? "rethrow" : "throw",
        ...(error.errorName ? { errorName: error.errorName } : {}),
        ...(error.errorIdentity ? { errorIdentity: error.errorIdentity } : {}),
        expressionKind: error.expressionKind,
        guards: enclosingErrorGuards(node, sourceFile),
        identityMappings,
        location: locationOf(node, sourceFile),
      });
    }

    ts.forEachChild(node, (child) => visitFlows(child, childContext));
  };

  visitFlows(sourceFile, { caller: "__module__" });
  records.push(...cacheContractRecords(sourceFile));
  records.push(...cacheKeyNormalizationRecords(sourceFile));
  records.push(...cacheRevalidationRecords(sourceFile));
  records.push(...promiseCacheRejectionRecords(sourceFile));
  records.push(...cleanupCompletenessRecords(sourceFile));
  records.push(...teardownInterruptionRecords(sourceFile));
  records.push(...pendingCallbackCleanupRecords(sourceFile));
  records.push(...asyncEffectContinuationRecords(sourceFile));
  records.push(...dependencyResolutionRecords(sourceFile));
  records.push(...dependencyCandidateBypassRecords(sourceFile));
  records.push(...dependencyNamespaceAmbiguityRecords(sourceFile));
  records.push(...dependencyExplicitSourceRecords(sourceFile));
  records.push(...autoImportPathPreferenceRecords(sourceFile));
  records.push(...promiseEventErrorBridgeRecords(sourceFile));
  records.push(...abortReasonDropRecords(sourceFile));
  records.push(...errorCodeWrappingRecords(sourceFile));
  records.push(...modeDefaultOverrideRecords(sourceFile));
  records.push(...requestSignalForwardingRecords(sourceFile));
  records.push(...terminalEventListenerRecords(sourceFile));
  records.push(...abortListenerLifetimeRecords(sourceFile));
  records.push(...ownedBrowserLifetimeRecords(sourceFile));
  records.push(...scopeResolutionRecords(sourceFile));
  records.push(...scopeNameResolutionRecords(sourceFile));
  records.push(...scopeTraversalEscapeRecords(sourceFile));
  records.push(...referencePositionRecords(sourceFile));
  records.push(...nestedLoopInitializationRecords(sourceFile));
  return records;
}

function cacheRevalidationRecords(sourceFile: ts.SourceFile): CacheRevalidationEvidence[] {
  if (!/(?:etag|last-modified)/iu.test(sourceFile.text)) return [];
  const records: CacheRevalidationEvidence[] = [];
  const visit = (node: ts.Node): void => {
    if (isFunctionBoundary(node) && node.body && ts.isBlock(node.body)) {
      const caller = functionLikeName(node) ?? enclosingCaller(node);
      if (/(?:cache|stale)/iu.test(caller)) {
        let match: { binding: string; statement: ts.ReturnStatement } | undefined;
        const inspect = (candidate: ts.Node): void => {
          if (match || (candidate !== node.body && isFunctionBoundary(candidate))) return;
          if (ts.isReturnStatement(candidate)
            && candidate.expression
            && ts.isConditionalExpression(unwrapExpression(candidate.expression))) {
            const conditional = unwrapExpression(candidate.expression) as ts.ConditionalExpression;
            const binding = zeroFreshnessBinding(conditional);
            if (binding) match = { binding, statement: candidate };
          }
          ts.forEachChild(candidate, inspect);
        };
        inspect(node.body);
        if (match) {
          records.push({
            kind: "cache-revalidation",
            caller,
            mechanism: "validator-zero-freshness-not-stored",
            directiveBinding: match.binding,
            staleExpression: boundedNodeText(match.statement.expression!, sourceFile),
            location: locationOf(node, sourceFile),
            returnLocation: locationOf(match.statement, sourceFile),
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return records;
}

function zeroFreshnessBinding(conditional: ts.ConditionalExpression): string | undefined {
  const condition = unwrapExpression(conditional.condition);
  if (!ts.isBinaryExpression(condition)
    || condition.operatorToken.kind !== ts.SyntaxKind.GreaterThanToken
    || !ts.isIdentifier(unwrapExpression(condition.left))
    || !isNumericZero(unwrapExpression(condition.right))
    || !isUndefinedExpression(unwrapExpression(conditional.whenFalse))) {
    return undefined;
  }
  const binding = (unwrapExpression(condition.left) as ts.Identifier).text;
  return /^(?:s?maxAge|staleAt)$/u.test(binding) ? binding : undefined;
}

function isNumericZero(expression: ts.Expression): boolean {
  return ts.isNumericLiteral(expression) && Number(expression.text) === 0;
}

function isUndefinedExpression(expression: ts.Expression): boolean {
  return (ts.isIdentifier(expression) && expression.text === "undefined")
    || ts.isVoidExpression(expression);
}

function pendingCallbackCleanupRecords(sourceFile: ts.SourceFile): PendingCallbackCleanupEvidence[] {
  const records: PendingCallbackCleanupEvidence[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) && node.name) {
      const methods = node.members.filter(ts.isMethodDeclaration);
      const callbackProperties = node.members
        .filter(ts.isPropertyDeclaration)
        .map((member) => methodNameText(member.name))
        .filter((name): name is string => Boolean(name && /(?:callbacks?|pending)/iu.test(name)));
      for (const callbackProperty of callbackProperties) {
        const callbackPath = `this.${callbackProperty}`;
        const registration = methods
          .map((method) => ({
            method,
            call: firstCallWithPath(method.body, `${callbackPath}.set`),
          }))
          .find((entry) =>
            entry.call
            && entry.method.body
            && /\bnew\s+Promise\b/u.test(entry.method.body.getText(sourceFile)));
        const closeMethod = methods
          .filter((method) => {
            const name = methodNameText(method.name);
            return Boolean(name && /^(?:_?close|_?dispose|_?destroy|_?shutdown)$/iu.test(name));
          })
          .sort((left, right) => {
            const leftName = methodNameText(left.name) ?? "";
            const rightName = methodNameText(right.name) ?? "";
            return Number(!leftName.startsWith("_")) - Number(!rightName.startsWith("_"));
          })[0];
        if (!registration?.call || !closeMethod?.body) continue;
        if (closeSettlesCallbackCollection(closeMethod.body, callbackPath)) continue;
        const registrationName = methodNameText(registration.method.name) ?? "unknown";
        const closeName = methodNameText(closeMethod.name) ?? "close";
        records.push({
          kind: "pending-callback-cleanup",
          caller: `${node.name.text}.${closeName}`,
          mechanism: "pending-callbacks-not-settled-on-close",
          callbackCollection: callbackPath,
          registrationMethod: registrationName,
          closeMethod: closeName,
          location: locationOf(closeMethod, sourceFile),
          registrationLocation: locationOf(registration.call, sourceFile),
          closeLocation: locationOf(closeMethod.body, sourceFile),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return records;
}

function firstCallWithPath(node: ts.Node | undefined, expectedPath: string): ts.CallExpression | undefined {
  if (!node) return undefined;
  let match: ts.CallExpression | undefined;
  const visit = (candidate: ts.Node): void => {
    if (match) return;
    if (ts.isCallExpression(candidate) && memberPath(candidate.expression)?.join(".") === expectedPath) {
      match = candidate;
      return;
    }
    ts.forEachChild(candidate, visit);
  };
  visit(node);
  return match;
}

function closeSettlesCallbackCollection(body: ts.Block, callbackPath: string): boolean {
  let clears = false;
  let rejects = false;
  let iterates = false;
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const path = memberPath(node.expression)?.join(".");
      if (path === `${callbackPath}.clear`) clears = true;
      if (path?.endsWith(".reject")) rejects = true;
      if (path === `${callbackPath}.values`) iterates = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return clears && rejects && iterates;
}

function autoImportPathPreferenceRecords(sourceFile: ts.SourceFile): AutoImportPathPreferenceEvidence[] {
  const records: AutoImportPathPreferenceEvidence[] = [];
  const visit = (node: ts.Node): void => {
    if (!ts.isBinaryExpression(node) || node.operatorToken.kind !== ts.SyntaxKind.BarBarToken) {
      ts.forEachChild(node, visit);
      return;
    }
    const boundary = enclosingFunction(node);
    const caller = boundary ? functionLikeName(boundary) ?? enclosingCaller(boundary) : undefined;
    if (!caller || !/moduleSpecifiers?/iu.test(caller)) {
      ts.forEachChild(node, visit);
      return;
    }
    const terms = booleanTerms(node, "or");
    if (terms.some((term) => /autoImport/iu.test(term.getText(sourceFile)))) {
      ts.forEachChild(node, visit);
      return;
    }
    const imported = terms
      .map((term) => unwrapExpression(term))
      .find((term): term is ts.PrefixUnaryExpression =>
        ts.isPrefixUnaryExpression(term)
        && term.operator === ts.SyntaxKind.ExclamationToken
        && ts.isIdentifier(unwrapExpression(term.operand))
        && /importedFile.*NodeModules/iu.test((unwrapExpression(term.operand) as ts.Identifier).text));
    const candidate = terms
      .map((term) => memberPath(unwrapExpression(term)))
      .find((path) => path && path.at(-1) === "isInNodeModules");
    if (imported && candidate) {
      const importedFileBinding = (unwrapExpression(imported.operand) as ts.Identifier).text;
      records.push({
        kind: "auto-import-path-preference",
        caller,
        mechanism: "auto-import-node-modules-relative-preference",
        importedFileBinding,
        candidateBinding: candidate.slice(0, -1).join("."),
        guardExpression: boundedNodeText(node, sourceFile),
        location: locationOf(boundary!, sourceFile),
        guardLocation: locationOf(node, sourceFile),
      });
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return records;
}

function errorCodeWrappingRecords(sourceFile: ts.SourceFile): ErrorCodeWrappingEvidence[] {
  const retryCheck = firstNetworkRetryCodeCheck(sourceFile);
  if (!retryCheck) return [];
  const records = new Map<string, ErrorCodeWrappingEvidence>();
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)
      && memberPath(node.expression)?.at(-1) === "reject"
      && node.arguments[0]
      && ts.isNewExpression(unwrapExpression(node.arguments[0]))) {
      const wrapper = unwrapExpression(node.arguments[0]) as ts.NewExpression;
      if (!/Error$/u.test(boundedNodeText(wrapper.expression, sourceFile))) {
        ts.forEachChild(node, visit);
        return;
      }
      const adapter = enclosingStreamErrorAdapter(node);
      const errorParameter = adapter?.parameters[0]?.name;
      if (!adapter || !errorParameter || !ts.isIdentifier(errorParameter)) {
        ts.forEachChild(node, visit);
        return;
      }
      const errorIdentifier = errorParameter.text;
      const usesMessage = wrapper.arguments?.some((argument) =>
        containsExactMemberPath(argument, `${errorIdentifier}.message`)) ?? false;
      if (!usesMessage || containsRawReject(adapter.body, errorIdentifier)) {
        ts.forEachChild(node, visit);
        return;
      }
      const caller = enclosingCaller(adapter);
      const key = `${caller}:${errorIdentifier}`;
      if (!records.has(key)) {
        records.set(key, {
          kind: "error-code-wrapping",
          caller,
          mechanism: "error-code-lost-by-wrapping",
          errorIdentifier,
          wrapperExpression: boundedNodeText(wrapper, sourceFile),
          retryCode: retryCheck.code,
          location: locationOf(adapter, sourceFile),
          wrapperLocation: locationOf(wrapper, sourceFile),
          retryCheckLocation: locationOf(retryCheck.node, sourceFile),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return [...records.values()];
}

function enclosingStreamErrorAdapter(node: ts.Node): ts.ArrowFunction | ts.FunctionExpression | undefined {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      const parent = current.parent;
      if (!ts.isCallExpression(parent) || !parent.arguments.includes(current)) return undefined;
      const path = memberPath(parent.expression);
      const pipeline = ts.isIdentifier(parent.expression) && parent.expression.text === "pipeline";
      const errorListener = path?.at(-1) === "on"
        && parent.arguments[0]
        && ts.isStringLiteralLike(parent.arguments[0])
        && parent.arguments[0].text === "error";
      return pipeline || errorListener ? current : undefined;
    }
    current = current.parent;
  }
  return undefined;
}

function containsRawReject(body: ts.ConciseBody, errorIdentifier: string): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isCallExpression(node)
      && memberPath(node.expression)?.at(-1) === "reject"
      && node.arguments[0]
      && ts.isIdentifier(unwrapExpression(node.arguments[0]))
      && (unwrapExpression(node.arguments[0]) as ts.Identifier).text === errorIdentifier) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return found;
}

function firstNetworkRetryCodeCheck(
  sourceFile: ts.SourceFile,
): { code: string; node: ts.BinaryExpression } | undefined {
  let match: { code: string; node: ts.BinaryExpression } | undefined;
  const visit = (node: ts.Node): void => {
    if (match) return;
    if (ts.isBinaryExpression(node)) {
      const sides = [unwrapExpression(node.left), unwrapExpression(node.right)];
      const code = sides.find(ts.isStringLiteralLike)?.text;
      const codePath = sides
        .map((side) => ts.isStringLiteralLike(side) ? undefined : memberPath(side))
        .find((path) => path?.at(-1) === "code");
      if (codePath && code && /^(?:ECONNRESET|EPIPE|ECONNABORTED)$/u.test(code)) {
        match = { code, node };
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return match;
}

function modeDefaultOverrideRecords(sourceFile: ts.SourceFile): ModeDefaultOverrideEvidence[] {
  const modeSignal = firstIdentifier(sourceFile, /^(?:is)?browserEnabled$/iu);
  if (!modeSignal) return [];
  const records: ModeDefaultOverrideEvidence[] = [];
  const visit = (node: ts.Node): void => {
    let property: string | undefined;
    let expression: ts.Expression | undefined;
    let assignmentKind: "property" | "assignment" | undefined;
    if (ts.isPropertyAssignment(node)
      && methodNameText(node.name) === "preTransformRequests") {
      property = "preTransformRequests";
      expression = node.initializer;
      assignmentKind = "property";
    } else if (ts.isBinaryExpression(node)
      && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && memberPath(unwrapExpression(node.left))?.at(-1) === "preTransformRequests") {
      property = "preTransformRequests";
      expression = node.right;
      assignmentKind = "assignment";
    }
    if (property
      && expression
      && assignmentKind
      && unwrapExpression(expression).kind === ts.SyntaxKind.FalseKeyword
      && !guardedByIdentifier(node, modeSignal.text)) {
      records.push({
        kind: "mode-default-override",
        caller: enclosingCaller(node),
        mechanism: "mode-specific-default-unconditionally-forced",
        property,
        defaultExpression: boundedNodeText(expression, sourceFile),
        modeSignal: modeSignal.text,
        assignmentKind,
        location: locationOf(node, sourceFile),
        modeLocation: locationOf(modeSignal, sourceFile),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return records;
}

function firstIdentifier(sourceFile: ts.SourceFile, pattern: RegExp): ts.Identifier | undefined {
  let match: ts.Identifier | undefined;
  const visit = (node: ts.Node): void => {
    if (match) return;
    if (ts.isIdentifier(node) && pattern.test(node.text)) {
      match = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return match;
}

function guardedByIdentifier(node: ts.Node, identifier: string): boolean {
  let current: ts.Node | undefined = node.parent;
  const names = new Set([identifier]);
  while (current && !ts.isSourceFile(current) && !isFunctionBoundary(current)) {
    const condition = ts.isIfStatement(current)
      ? current.expression
      : ts.isConditionalExpression(current)
        ? current.condition
        : undefined;
    if (condition && referencedNames(condition, names).length > 0) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function ownedBrowserLifetimeRecords(sourceFile: ts.SourceFile): OwnedBrowserLifetimeEvidence[] {
  const records: OwnedBrowserLifetimeEvidence[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) && node.name && /Server$/u.test(node.name.text)) {
      const ownershipCall = firstCallMatching(node, (call) =>
        memberPath(call.expression)?.at(-1) === "allBrowsers");
      const ownershipPath = ownershipCall ? memberPath(ownershipCall.expression) : undefined;
      const closeMethod = node.members
        .filter(ts.isMethodDeclaration)
        .find((method) => methodNameText(method.name) === "close");
      if (ownershipCall && ownershipPath && closeMethod?.body) {
        const owner = ownershipPath.slice(0, -1).join(".");
        const closesOwnedBrowsers = closesEachOwnedBrowser(closeMethod.body, owner);
        const transportClose = firstCallMatching(closeMethod.body, (call) => {
          const path = memberPath(call.expression);
          return path?.at(-1) === "close" && !path.join(".").startsWith(owner);
        });
        if (!closesOwnedBrowsers && transportClose) {
          records.push({
            kind: "owned-browser-lifetime",
            caller: `${node.name.text}.close`,
            mechanism: "server-owned-browsers-not-closed",
            owner,
            browserCollection: boundedNodeText(ownershipCall, sourceFile),
            transportCloseExpression: boundedNodeText(transportClose, sourceFile),
            location: locationOf(closeMethod, sourceFile),
            ownershipLocation: locationOf(ownershipCall, sourceFile),
            transportCloseLocation: locationOf(transportClose, sourceFile),
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return records;
}

function closesEachOwnedBrowser(body: ts.Block, owner: string): boolean {
  let closes = false;
  const visit = (node: ts.Node): void => {
    if (closes) return;
    if (ts.isForOfStatement(node)
      && ts.isCallExpression(unwrapExpression(node.expression))
      && memberPath((unwrapExpression(node.expression) as ts.CallExpression).expression)?.join(".")
        === `${owner}.allBrowsers`) {
      const declaration = node.initializer;
      const binding = ts.isVariableDeclarationList(declaration)
        && declaration.declarations.length === 1
        && ts.isIdentifier(declaration.declarations[0]!.name)
        ? declaration.declarations[0]!.name.text
        : undefined;
      if (binding && firstCallMatching(node.statement, (call) =>
        memberPath(call.expression)?.join(".") === `${binding}.close`)) {
        closes = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return closes;
}

function firstCallMatching(
  node: ts.Node,
  predicate: (call: ts.CallExpression) => boolean,
): ts.CallExpression | undefined {
  let match: ts.CallExpression | undefined;
  const visit = (candidate: ts.Node): void => {
    if (match) return;
    if (ts.isCallExpression(candidate) && predicate(candidate)) {
      match = candidate;
      return;
    }
    ts.forEachChild(candidate, visit);
  };
  visit(node);
  return match;
}

function nestedLoopInitializationRecords(sourceFile: ts.SourceFile): NestedLoopInitializationEvidence[] {
  const records: NestedLoopInitializationEvidence[] = [];
  const visit = (node: ts.Node): void => {
    if (isFunctionBoundary(node) && node.body && ts.isBlock(node.body)) {
      const caller = functionLikeName(node) ?? enclosingCaller(node);
      const pathParameter = node.parameters
        .map((parameter) => parameter.name)
        .find(ts.isIdentifier);
      if (pathParameter) {
        const body = node.body;
        const loopCondition = firstCallPairCondition(
          body,
          "isInLoop",
          "isVarInLoopHead",
          pathParameter.text,
        );
        const initialization = firstCallMatching(body, (call) =>
          memberPath(call.expression)?.at(-1) === "buildUndefinedNode");
        const handlesNestedForInit =
          body.getText(sourceFile).includes("isVarInForStatementInit")
          && body.getText(sourceFile).includes(`${pathParameter.text}.parentPath`);
        if (loopCondition && initialization && !handlesNestedForInit) {
          records.push({
            kind: "nested-loop-initialization",
            caller,
            mechanism: "nested-loop-head-reinitialization-missing",
            pathParameter: pathParameter.text,
            loopCondition: boundedNodeText(loopCondition, sourceFile),
            initializationExpression: boundedNodeText(initialization, sourceFile),
            location: locationOf(node, sourceFile),
            conditionLocation: locationOf(loopCondition, sourceFile),
            initializationLocation: locationOf(initialization, sourceFile),
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return records;
}

function firstCallPairCondition(
  body: ts.Block,
  positiveCall: string,
  negativeCall: string,
  parameter: string,
): ts.Expression | undefined {
  let match: ts.Expression | undefined;
  const visit = (node: ts.Node): void => {
    if (match || (node !== body && isFunctionBoundary(node))) return;
    if (ts.isBinaryExpression(node)
      && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      const text = node.getText();
      if (text.includes(`${positiveCall}(${parameter})`)
        && text.includes(`!${negativeCall}(${parameter})`)) {
        match = node;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return match;
}

function cacheKeyNormalizationRecords(sourceFile: ts.SourceFile): CacheKeyNormalizationEvidence[] {
  const records: CacheKeyNormalizationEvidence[] = [];
  const visitFunctions = (node: ts.Node): void => {
    if (isFunctionBoundary(node) && node.body && ts.isBlock(node.body)) {
      const body = node.body;
      const caller = functionLikeName(node) ?? enclosingCaller(node);
      const visitDeclarations = (candidate: ts.Node): void => {
        if (candidate !== body && isFunctionBoundary(candidate)) return;
        if (ts.isVariableDeclaration(candidate)
          && ts.isIdentifier(candidate.name)
          && candidate.initializer) {
          const normalization = fallbackNormalization(candidate.initializer, sourceFile);
          if (normalization && /(?:path|key|url)/iu.test(candidate.name.text)) {
            const guarded = rawNormalizationGuard(
              body,
              normalization.rawInput,
            );
            const returned = returnedNormalizedKey(
              body,
              candidate.name.text,
              normalization.rawInput,
              sourceFile,
            );
            if (guarded && returned) {
              records.push({
                kind: "cache-key-normalization",
                caller,
                mechanism: "raw-cache-input-after-normalization",
                normalizedBinding: candidate.name.text,
                rawInput: normalization.rawInput,
                fallbackExpression: normalization.fallbackExpression,
                guardExpression: boundedNodeText(guarded.expression, sourceFile),
                keyExpression: boundedNodeText(returned.initializer, sourceFile),
                location: locationOf(candidate, sourceFile),
                guardLocation: locationOf(guarded.expression, sourceFile),
                keyLocation: locationOf(returned, sourceFile),
              });
            }
          }
        }
        ts.forEachChild(candidate, visitDeclarations);
      };
      visitDeclarations(node.body);
    }
    ts.forEachChild(node, visitFunctions);
  };
  visitFunctions(sourceFile);
  return records.sort((left, right) =>
    left.location.line - right.location.line
      || left.normalizedBinding.localeCompare(right.normalizedBinding));
}

function fallbackNormalization(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
): { rawInput: string; fallbackExpression: string } | undefined {
  const value = unwrapExpression(expression);
  if (!ts.isBinaryExpression(value)
    || (value.operatorToken.kind !== ts.SyntaxKind.BarBarToken
      && value.operatorToken.kind !== ts.SyntaxKind.QuestionQuestionToken)) {
    return undefined;
  }
  const rawPath = memberPath(unwrapExpression(value.left));
  if (!rawPath || rawPath.length < 2) return undefined;
  const fallback = unwrapExpression(value.right);
  if (!ts.isStringLiteralLike(fallback) && !ts.isNoSubstitutionTemplateLiteral(fallback)) return undefined;
  return {
    rawInput: rawPath.join("."),
    fallbackExpression: boundedNodeText(value, sourceFile),
  };
}

function rawNormalizationGuard(
  body: ts.Block,
  rawInput: string,
): ts.IfStatement | undefined {
  let match: ts.IfStatement | undefined;
  const visit = (node: ts.Node): void => {
    if (match || (node !== body && isFunctionBoundary(node))) return;
    if (ts.isIfStatement(node) && callReceivesExactMember(node.expression, rawInput)) {
      match = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return match;

  function callReceivesExactMember(node: ts.Node, expected: string): boolean {
    let found = false;
    const inspect = (candidate: ts.Node): void => {
      if (found) return;
      if (ts.isCallExpression(candidate)
        && candidate.arguments.some((argument) =>
          memberPath(unwrapExpression(argument))?.join(".") === expected)) {
        found = true;
        return;
      }
      ts.forEachChild(candidate, inspect);
    };
    inspect(node);
    return found;
  }
}

function returnedNormalizedKey(
  body: ts.Block,
  normalizedBinding: string,
  rawInput: string,
  sourceFile: ts.SourceFile,
): ts.PropertyAssignment | undefined {
  const rawProperty = rawInput.split(".").at(-1);
  let match: ts.PropertyAssignment | undefined;
  const visit = (node: ts.Node): void => {
    if (match || (node !== body && isFunctionBoundary(node))) return;
    if (ts.isReturnStatement(node) && node.expression) {
      const returned = unwrapExpression(node.expression);
      if (ts.isObjectLiteralExpression(returned)) {
        for (const property of returned.properties) {
          const initializer = ts.isPropertyAssignment(property)
            ? unwrapExpression(property.initializer)
            : undefined;
          if (!ts.isPropertyAssignment(property)
            || methodNameText(property.name) !== rawProperty
            || !initializer
            || !ts.isIdentifier(initializer)
            || initializer.text !== normalizedBinding) {
            continue;
          }
          match = property;
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return match;
}

function teardownInterruptionRecords(sourceFile: ts.SourceFile): TeardownInterruptionEvidence[] {
  const records: TeardownInterruptionEvidence[] = [];
  const visitFunctions = (node: ts.Node): void => {
    if (isFunctionBoundary(node) && node.body) {
      const caller = functionLikeName(node);
      if (caller && /(?:phase|schedule)/iu.test(caller)) {
        let teardownDeclaration: ts.VariableDeclaration | undefined;
        const dispatchers: ts.NewExpression[] = [];
        const inspect = (candidate: ts.Node): void => {
          if (ts.isVariableDeclaration(candidate)
            && ts.isIdentifier(candidate.name)
            && candidate.initializer
            && directCallName(candidate.initializer) === "buildTeardownToSetupsMap") {
            teardownDeclaration = candidate;
          } else if (ts.isNewExpression(candidate)
            && directExpressionName(candidate.expression) === "Dispatcher") {
            dispatchers.push(candidate);
          }
          ts.forEachChild(candidate, inspect);
        };
        inspect(node.body);
        const unsafeDispatcher = dispatchers.find((dispatcher) =>
          !dispatcher.arguments?.some((argument) =>
            /\bignoreMaxFailures\b/u.test(boundedNodeText(argument, sourceFile))));
        if (teardownDeclaration && ts.isIdentifier(teardownDeclaration.name) && unsafeDispatcher) {
          records.push({
            kind: "teardown-interruption",
            caller,
            mechanism: "teardown-shares-stop-policy",
            teardownCollection: teardownDeclaration.name.text,
            dispatcherExpression: boundedNodeText(unsafeDispatcher, sourceFile),
            location: locationOf(node, sourceFile),
            teardownLocation: locationOf(teardownDeclaration, sourceFile),
            dispatcherLocation: locationOf(unsafeDispatcher, sourceFile),
          });
        }
      }
    }
    ts.forEachChild(node, visitFunctions);
  };
  visitFunctions(sourceFile);
  return records.sort((left, right) => left.location.line - right.location.line);
}

function directCallName(expression: ts.Expression): string | undefined {
  const value = unwrapExpression(expression);
  return ts.isCallExpression(value) ? directExpressionName(value.expression) : undefined;
}

function directExpressionName(expression: ts.Expression): string | undefined {
  const value = unwrapExpression(expression);
  if (ts.isIdentifier(value)) return value.text;
  if (ts.isPropertyAccessExpression(value)) return value.name.text;
  return undefined;
}

const CLEANUP_CALLER_NAMES = new Set([
  "cleanup",
  "close",
  "destroy",
  "disconnect",
  "dispose",
  "finalize",
  "shutdown",
  "stop",
  "teardown",
  "terminate",
]);

function cleanupCompletenessRecords(sourceFile: ts.SourceFile): CleanupCompletenessEvidence[] {
  const records: CleanupCompletenessEvidence[] = [];
  const promiseIsShadowed = hasLocalPromiseBinding(sourceFile);
  const visitFunctions = (node: ts.Node): void => {
    if (isFunctionBoundary(node) && node.body && ts.isBlock(node.body)) {
      const caller = functionLikeName(node);
      if (caller && CLEANUP_CALLER_NAMES.has(caller.toLowerCase())) {
        records.push(...cleanupCompletenessRecordsForBody(node.body, caller, sourceFile, promiseIsShadowed));
      }
    }
    ts.forEachChild(node, visitFunctions);
  };
  visitFunctions(sourceFile);
  return records.sort((left, right) =>
    left.location.line - right.location.line || left.caller.localeCompare(right.caller));
}

function cleanupCompletenessRecordsForBody(
  body: ts.Block,
  caller: string,
  sourceFile: ts.SourceFile,
  promiseIsShadowed: boolean,
): CleanupCompletenessEvidence[] {
  const aggregates: CleanupCompletenessEvidence[] = [];
  const unhandledAwaits: Array<{ expression: ts.Expression; location: AstLocation }> = [];

  for (const statement of body.statements) {
    const awaited = directAwaitExpression(statement);
    if (!awaited) continue;
    const expression = unwrapExpression(awaited.expression);
    const aggregate = promiseAllOperands(expression);
    if (aggregate && promiseIsShadowed) continue;
    if (aggregate && aggregate.length >= 2) {
      aggregates.push({
        kind: "cleanup-contract",
        caller,
        mechanism: "fail-fast-aggregate",
        obligations: aggregate.map((entry) => boundedNodeText(entry, sourceFile)),
        location: locationOf(expression, sourceFile),
        obligationLocations: aggregate.map((entry) => locationOf(entry, sourceFile)),
      });
      continue;
    }
    if (!isRejectionInsulatedExpression(expression, promiseIsShadowed)) {
      unhandledAwaits.push({ expression, location: locationOf(expression, sourceFile) });
    }
  }

  if (aggregates.length > 0 || unhandledAwaits.length < 2) return aggregates;
  return [{
    kind: "cleanup-contract",
    caller,
    mechanism: "sequential-unhandled-awaits",
    obligations: unhandledAwaits.map((entry) => boundedNodeText(entry.expression, sourceFile)),
    location: unhandledAwaits[0]!.location,
    obligationLocations: unhandledAwaits.map((entry) => entry.location),
  }];
}

function asyncEffectContinuationRecords(sourceFile: ts.SourceFile): AsyncEffectContinuationEvidence[] {
  if (hasLocalPromiseBinding(sourceFile)) return [];
  const effectHooks = reactNamedImportBindings(sourceFile, "useEffect");
  const stateHooks = reactNamedImportBindings(sourceFile, "useState");
  if (effectHooks.size === 0 || stateHooks.size === 0) return [];

  const records: AsyncEffectContinuationEvidence[] = [];
  const visitFunctions = (node: ts.Node): void => {
    if (isFunctionBoundary(node) && node.body && ts.isBlock(node.body)) {
      const caller = functionLikeName(node);
      const stateSetters = caller
        ? reactStateSetterBindings(node.body, stateHooks)
        : new Set<string>();
      if (caller && stateSetters.size > 0) {
        records.push(...asyncEffectContinuationRecordsForFunction(
          node.body,
          caller,
          effectHooks,
          stateSetters,
          sourceFile,
        ));
      }
    }
    ts.forEachChild(node, visitFunctions);
  };
  visitFunctions(sourceFile);
  return records.sort((left, right) =>
    left.location.line - right.location.line
      || left.caller.localeCompare(right.caller)
      || left.stateSetters.join(",").localeCompare(right.stateSetters.join(",")));
}

function reactNamedImportBindings(sourceFile: ts.SourceFile, importedName: string): Set<string> {
  const bindings = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)
      || !ts.isStringLiteral(statement.moduleSpecifier)
      || statement.moduleSpecifier.text !== "react"
      || !statement.importClause?.namedBindings
      || !ts.isNamedImports(statement.importClause.namedBindings)) {
      continue;
    }
    for (const element of statement.importClause.namedBindings.elements) {
      if ((element.propertyName?.text ?? element.name.text) === importedName) {
        bindings.add(element.name.text);
      }
    }
  }
  return bindings;
}

function reactStateSetterBindings(
  body: ts.Block,
  stateHooks: ReadonlySet<string>,
): Set<string> {
  const setters = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (node !== body && isFunctionBoundary(node)) return;
    if (ts.isVariableDeclaration(node)
      && ts.isArrayBindingPattern(node.name)
      && node.initializer) {
      const initializer = unwrapExpression(node.initializer);
      const setter = node.name.elements[1];
      if (ts.isCallExpression(initializer)
        && ts.isIdentifier(initializer.expression)
        && stateHooks.has(initializer.expression.text)
        && setter
        && ts.isBindingElement(setter)
        && ts.isIdentifier(setter.name)) {
        setters.add(setter.name.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return setters;
}

function asyncEffectContinuationRecordsForFunction(
  body: ts.Block,
  caller: string,
  effectHooks: ReadonlySet<string>,
  stateSetters: ReadonlySet<string>,
  sourceFile: ts.SourceFile,
): AsyncEffectContinuationEvidence[] {
  const records: AsyncEffectContinuationEvidence[] = [];
  const visit = (node: ts.Node): void => {
    if (node !== body && isFunctionBoundary(node)) return;
    if (ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && effectHooks.has(node.expression.text)) {
      records.push(...asyncEffectContinuationRecordsForCall(
        node,
        caller,
        stateSetters,
        sourceFile,
      ));
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return records;
}

function asyncEffectContinuationRecordsForCall(
  effectCall: ts.CallExpression,
  caller: string,
  stateSetters: ReadonlySet<string>,
  sourceFile: ts.SourceFile,
): AsyncEffectContinuationEvidence[] {
  const callbackNode = effectCall.arguments[0];
  const dependenciesNode = effectCall.arguments[1];
  if (!callbackNode || !dependenciesNode) return [];
  const callback = unwrapExpression(callbackNode);
  const dependencies = unwrapExpression(dependenciesNode);
  if ((!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))
    || !ts.isBlock(callback.body)
    || !ts.isArrayLiteralExpression(dependencies)
    || dependencies.elements.length === 0
    || effectReturnsCleanup(callback)) {
    return [];
  }
  const dependencyValues = dependencies.elements
    .filter((entry): entry is ts.Expression => ts.isExpression(entry))
    .map((entry) => boundedNodeText(entry, sourceFile));
  if (dependencyValues.length === 0) return [];

  const records: AsyncEffectContinuationEvidence[] = [];
  const visit = (node: ts.Node): void => {
    if (node !== callback.body && isFunctionBoundary(node)) return;
    if (ts.isCallExpression(node)) {
      const aggregate = promiseAggregateThen(node);
      if (aggregate) {
        const setterCalls = stateSetterCalls(aggregate.continuation, stateSetters);
        if (setterCalls.length > 0) {
          records.push({
            kind: "async-effect-continuation",
            caller,
            mechanism: "superseded-effect-continuation",
            hook: ts.isIdentifier(effectCall.expression) ? effectCall.expression.text : "useEffect",
            promiseMethod: aggregate.method,
            dependencies: dependencyValues,
            stateSetters: [...new Set(setterCalls.map((call) =>
              ts.isIdentifier(call.expression) ? call.expression.text : ""))]
              .filter(Boolean)
              .sort(),
            aggregateExpression: boundedNodeText(aggregate.aggregate, sourceFile),
            location: locationOf(effectCall, sourceFile),
            continuationLocation: locationOf(node, sourceFile),
            setterLocations: setterCalls.map((call) => locationOf(call, sourceFile)),
            dependencyLocation: locationOf(dependencies, sourceFile),
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(callback.body);
  return records;
}

function effectReturnsCleanup(callback: ts.ArrowFunction | ts.FunctionExpression): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found || (node !== callback.body && isFunctionBoundary(node))) return;
    if (ts.isReturnStatement(node) && node.expression) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(callback.body);
  return found;
}

function promiseAggregateThen(call: ts.CallExpression): {
  aggregate: ts.CallExpression;
  continuation: ts.ArrowFunction | ts.FunctionExpression;
  method: "all" | "allSettled";
} | undefined {
  if (!ts.isPropertyAccessExpression(call.expression)
    || call.expression.name.text !== "then") {
    return undefined;
  }
  const aggregate = unwrapExpression(call.expression.expression);
  const continuationNode = call.arguments[0];
  if (!ts.isCallExpression(aggregate)
    || !ts.isPropertyAccessExpression(aggregate.expression)
    || !ts.isIdentifier(aggregate.expression.expression)
    || aggregate.expression.expression.text !== "Promise"
    || (aggregate.expression.name.text !== "all" && aggregate.expression.name.text !== "allSettled")
    || !continuationNode) {
    return undefined;
  }
  const continuation = unwrapExpression(continuationNode);
  if (!ts.isArrowFunction(continuation) && !ts.isFunctionExpression(continuation)) return undefined;
  return {
    aggregate,
    continuation,
    method: aggregate.expression.name.text,
  };
}

function stateSetterCalls(
  continuation: ts.ArrowFunction | ts.FunctionExpression,
  stateSetters: ReadonlySet<string>,
): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (node !== continuation.body && isFunctionBoundary(node)) return;
    if (ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && stateSetters.has(node.expression.text)) {
      calls.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(continuation.body);
  return calls;
}

function directAwaitExpression(statement: ts.Statement): ts.AwaitExpression | undefined {
  if (!ts.isExpressionStatement(statement)) return undefined;
  const expression = unwrapExpression(statement.expression);
  return ts.isAwaitExpression(expression) ? expression : undefined;
}

function promiseAllOperands(expression: ts.Expression): ts.Expression[] | undefined {
  const call = unwrapExpression(expression);
  if (!ts.isCallExpression(call) || !ts.isPropertyAccessExpression(call.expression)) return undefined;
  if (!ts.isIdentifier(call.expression.expression)
    || call.expression.expression.text !== "Promise"
    || call.expression.name.text !== "all") {
    return undefined;
  }
  const argument = call.arguments[0];
  return argument && ts.isArrayLiteralExpression(argument) ? [...argument.elements] : undefined;
}

function isRejectionInsulatedExpression(expression: ts.Expression, promiseIsShadowed: boolean): boolean {
  const call = unwrapExpression(expression);
  if (!ts.isCallExpression(call) || !ts.isPropertyAccessExpression(call.expression)) return false;
  if (call.expression.name.text === "catch") return true;
  return !promiseIsShadowed
    && call.expression.name.text === "allSettled"
    && ts.isIdentifier(call.expression.expression)
    && call.expression.expression.text === "Promise";
}

function functionLikeName(node: ts.FunctionLikeDeclaration): string | undefined {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    return node.name ? methodNameText(node.name) : undefined;
  }
  if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node))) {
    if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) return node.parent.name.text;
    if (ts.isPropertyAssignment(node.parent)) return methodNameText(node.parent.name);
  }
  return undefined;
}

function hasLocalPromiseBinding(sourceFile: ts.SourceFile): boolean {
  return hasLocalValueBinding(sourceFile, "Promise");
}

function hasLocalValueBinding(sourceFile: ts.SourceFile, expected: string): boolean {
  let found = false;
  const visitBindings = (node: ts.Node): void => {
    if (found) return;
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node)) && bindingContainsName(node.name, expected)) {
      found = true;
      return;
    }
    if ((ts.isFunctionDeclaration(node)
      || ts.isFunctionExpression(node)
      || ts.isClassDeclaration(node)
      || ts.isClassExpression(node)
      || ts.isEnumDeclaration(node))
      && node.name?.text === expected) {
      found = true;
      return;
    }
    if (ts.isImportClause(node) && node.name?.text === expected) {
      found = true;
      return;
    }
    if ((ts.isImportSpecifier(node) || ts.isNamespaceImport(node)) && node.name.text === expected) {
      found = true;
      return;
    }
    if (ts.isImportEqualsDeclaration(node) && node.name.text === expected) {
      found = true;
      return;
    }
    ts.forEachChild(node, visitBindings);
  };
  visitBindings(sourceFile);
  return found;
}

function bindingContainsName(name: ts.BindingName, expected: string): boolean {
  if (ts.isIdentifier(name)) return name.text === expected;
  return name.elements.some((element) =>
    ts.isBindingElement(element) && bindingContainsName(element.name, expected));
}

function cacheContractRecords(sourceFile: ts.SourceFile): CacheContractEvidence[] {
  const records: CacheContractEvidence[] = [];
  const visitReturns = (node: ts.Node): void => {
    if (ts.isReturnStatement(node) && node.expression) {
      const call = returnedCallExpression(node.expression);
      const factoryPath = call ? memberPath(call.expression) : undefined;
      if (call && factoryPath?.at(-1) === "getFactoryWithDefault") {
        const record = cacheContractRecord(node, call, factoryPath.join("."), sourceFile);
        if (record) records.push(record);
      }
    }
    ts.forEachChild(node, visitReturns);
  };
  visitReturns(sourceFile);
  return records.sort((left, right) =>
    left.location.line - right.location.line || left.caller.localeCompare(right.caller));
}

function cacheContractRecord(
  returned: ts.ReturnStatement,
  call: ts.CallExpression,
  factory: string,
  sourceFile: ts.SourceFile,
): CacheContractEvidence | undefined {
  const owner = enclosingFunction(returned);
  const cache = call.arguments[0];
  const key = call.arguments[1];
  const callback = call.arguments[2];
  if (!owner || !cache || !key || !callback
    || (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))) {
    return undefined;
  }

  const parameterNames = new Set<string>();
  for (const parameter of owner.parameters) collectBindingNames(parameter.name, parameterNames);
  const keyParameters = referencedNames(key, parameterNames);
  if (keyParameters.length === 0) return undefined;
  const callbackParameters = new Set<string>();
  for (const parameter of callback.parameters) collectBindingNames(parameter.name, callbackParameters);
  const resultParameters = new Set([...parameterNames].filter((name) => !callbackParameters.has(name)));

  const callbackReturns = directFunctionReturns(callback);
  for (const guarded of callbackReturns) {
    if (!guarded.expression) continue;
    for (const guard of enclosingIfsWithin(guarded, callback)) {
      const guardParameters = referencedNames(guard.expression, resultParameters);
      const omittedResultParameters = guardParameters
        .filter((name) => !keyParameters.includes(name));
      if (omittedResultParameters.length === 0) continue;

      const fallback = callbackReturns.find((candidate) =>
        candidate !== guarded
        && candidate.expression
        && candidate.getStart(sourceFile) > guarded.getEnd()
        && !containsPosition(guard, candidate)
        && boundedNodeText(candidate.expression, sourceFile)
          !== boundedNodeText(guarded.expression!, sourceFile));
      if (!fallback?.expression) continue;

      return {
        kind: "cache-contract",
        caller: enclosingCaller(returned),
        factory,
        cacheBinding: boundedNodeText(cache, sourceFile),
        keyExpression: boundedNodeText(key, sourceFile),
        keyParameters,
        omittedResultParameters,
        guardExpression: boundedNodeText(guard.expression, sourceFile),
        guardedReturnExpression: boundedNodeText(guarded.expression, sourceFile),
        fallbackReturnExpression: boundedNodeText(fallback.expression, sourceFile),
        location: locationOf(call, sourceFile),
        guardLocation: locationOf(guard.expression, sourceFile),
        fallbackLocation: locationOf(fallback, sourceFile),
      };
    }
  }
  return undefined;
}

function promiseCacheRejectionRecords(sourceFile: ts.SourceFile): PromiseCacheRejectionEvidence[] {
  const records: PromiseCacheRejectionEvidence[] = [];
  const visit = (node: ts.Node): void => {
    if (isFunctionBoundary(node) && node.body && ts.isBlock(node.body)) {
      records.push(...promiseCacheRejectionRecordsForBody(
        node.body,
        functionLikeName(node) ?? enclosingCaller(node),
        sourceFile,
      ));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return records.sort((left, right) =>
    left.location.line - right.location.line
      || left.cacheBinding.localeCompare(right.cacheBinding));
}

function promiseCacheRejectionRecordsForBody(
  body: ts.Block,
  caller: string,
  sourceFile: ts.SourceFile,
): PromiseCacheRejectionEvidence[] {
  const records: PromiseCacheRejectionEvidence[] = [];
  for (let index = 0; index < body.statements.length; index += 1) {
    const statement = body.statements[index];
    if (!statement || !ts.isIfStatement(statement)) continue;
    const cacheBinding = negatedPromiseCacheBinding(statement.expression);
    if (!cacheBinding) continue;
    const assignment = findPromiseCacheAssignment(statement.thenStatement, cacheBinding);
    if (!assignment || hasPromiseCacheRejectionEviction(body, cacheBinding)) continue;
    const returned = body.statements.slice(index + 1)
      .find((candidate): candidate is ts.ReturnStatement =>
        ts.isReturnStatement(candidate)
        && returnedMemberBinding(candidate.expression) === cacheBinding);
    if (!returned?.expression) continue;
    records.push({
      kind: "promise-cache-rejection",
      caller,
      mechanism: "rejected-promise-retained",
      cacheBinding,
      guardExpression: boundedNodeText(statement.expression, sourceFile),
      promiseExpression: boundedNodeText(assignment.right, sourceFile),
      returnExpression: boundedNodeText(returned.expression, sourceFile),
      location: locationOf(assignment, sourceFile),
      guardLocation: locationOf(statement.expression, sourceFile),
      returnLocation: locationOf(returned, sourceFile),
    });
  }
  return records;
}

function negatedPromiseCacheBinding(expression: ts.Expression): string | undefined {
  const value = unwrapExpression(expression);
  if (!ts.isPrefixUnaryExpression(value)
    || value.operator !== ts.SyntaxKind.ExclamationToken) {
    return undefined;
  }
  const path = memberPath(unwrapExpression(value.operand));
  if (!path || path.length < 2 || !/promise/iu.test(path.at(-1)!)) return undefined;
  return path.join(".");
}

function findPromiseCacheAssignment(
  node: ts.Node,
  cacheBinding: string,
): ts.BinaryExpression | undefined {
  let match: ts.BinaryExpression | undefined;
  const visit = (current: ts.Node): void => {
    if (match || (current !== node && isFunctionBoundary(current))) return;
    if (ts.isBinaryExpression(current)
      && current.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && memberPath(unwrapExpression(current.left))?.join(".") === cacheBinding
      && isAsyncImmediatelyInvokedFunction(current.right)) {
      match = current;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return match;
}

function isAsyncImmediatelyInvokedFunction(expression: ts.Expression): boolean {
  const call = unwrapExpression(expression);
  if (!ts.isCallExpression(call)) return false;
  const target = unwrapExpression(call.expression);
  if (!ts.isArrowFunction(target) && !ts.isFunctionExpression(target)) return false;
  return ts.canHaveModifiers(target)
    && (ts.getModifiers(target) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword);
}

function returnedMemberBinding(expression: ts.Expression | undefined): string | undefined {
  if (!expression) return undefined;
  let value = unwrapExpression(expression);
  while (ts.isAwaitExpression(value)) value = unwrapExpression(value.expression);
  return memberPath(value)?.join(".");
}

function hasPromiseCacheRejectionEviction(body: ts.Block, cacheBinding: string): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found || (node !== body && isFunctionBoundary(node))) return;
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      const receiver = memberPath(unwrapExpression(node.expression.expression))?.join(".");
      const handler = node.arguments[0];
      if ((method === "catch" || method === "finally")
        && receiver === cacheBinding
        && handler
        && containsNullishAssignment(handler, cacheBinding)) {
        found = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return found;
}

function containsNullishAssignment(node: ts.Node, cacheBinding: string): boolean {
  let found = false;
  const visit = (current: ts.Node): void => {
    if (found || (current !== node && isFunctionBoundary(current))) return;
    if (ts.isBinaryExpression(current)
      && current.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && memberPath(unwrapExpression(current.left))?.join(".") === cacheBinding
      && isNullishCacheValue(unwrapExpression(current.right))) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

function isNullishCacheValue(expression: ts.Expression): boolean {
  return expression.kind === ts.SyntaxKind.NullKeyword
    || (ts.isIdentifier(expression) && expression.text === "undefined");
}

function returnedCallExpression(expression: ts.Expression): ts.CallExpression | undefined {
  let current = unwrapExpression(expression);
  while (ts.isAwaitExpression(current)) current = unwrapExpression(current.expression);
  return ts.isCallExpression(current) ? current : undefined;
}

function enclosingFunction(node: ts.Node): ts.FunctionLikeDeclaration | undefined {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (isFunctionBoundary(current)) return current;
    current = current.parent;
  }
  return undefined;
}

function referencedNames(node: ts.Node, candidates: ReadonlySet<string>): string[] {
  const names = new Set<string>();
  const visit = (current: ts.Node): void => {
    if (ts.isIdentifier(current)
      && candidates.has(current.text)
      && isValueIdentifierReference(current)) {
      names.add(current.text);
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return [...names].sort();
}

function directFunctionReturns(
  callback: ts.ArrowFunction | ts.FunctionExpression,
): ts.ReturnStatement[] {
  const returns: ts.ReturnStatement[] = [];
  const visit = (node: ts.Node): void => {
    if (node !== callback.body && isFunctionBoundary(node)) return;
    if (ts.isReturnStatement(node)) {
      returns.push(node);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(callback.body);
  return returns;
}

function enclosingIfsWithin(
  node: ts.Node,
  boundary: ts.ArrowFunction | ts.FunctionExpression,
): ts.IfStatement[] {
  const statements: ts.IfStatement[] = [];
  let current: ts.Node | undefined = node.parent;
  while (current && current !== boundary) {
    if (ts.isIfStatement(current) && containsPosition(current.thenStatement, node)) statements.push(current);
    current = current.parent;
  }
  return statements;
}

function extractErrorIdentityMappings(sourceFile: ts.SourceFile): ErrorIdentityMapping[] {
  const mappings: ErrorIdentityMapping[] = [];
  const visitMappings = (node: ts.Node): void => {
    if (ts.isPropertyAssignment(node)) {
      const property = methodNameText(node.name);
      const initializer = unwrapParenthesized(node.initializer);
      if (property && ts.isBinaryExpression(initializer)
        && (initializer.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
          || initializer.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken)) {
        const left = unwrapParenthesized(initializer.left);
        const right = unwrapParenthesized(initializer.right);
        const identity = identityComparison(left, right) ?? identityComparison(right, left);
        if (identity) {
          mappings.push({
            identity,
            property,
            expression: boundedNodeText(initializer, sourceFile),
            location: locationOf(initializer, sourceFile),
          });
        }
      }
    }
    ts.forEachChild(node, visitMappings);
  };
  visitMappings(sourceFile);
  return mappings.sort((left, right) => left.location.line - right.location.line || left.property.localeCompare(right.property));
}

function identityComparison(candidate: ts.Expression, identity: ts.Expression): string | undefined {
  const path = memberPath(candidate);
  if (!path || path.at(-1) !== "name" || !ts.isStringLiteralLike(identity)) return undefined;
  return /Error$/u.test(identity.text) ? identity.text : undefined;
}

function abortReasonDropRecords(sourceFile: ts.SourceFile): AbortReasonDropEvidence[] {
  const records: AbortReasonDropEvidence[] = [];
  const visitReturns = (node: ts.Node): void => {
    if (ts.isReturnStatement(node) && node.expression) {
      const rejection = unwrapExpression(node.expression);
      if (ts.isCallExpression(rejection)
        && rejection.arguments.length === 0
        && ts.isPropertyAccessExpression(rejection.expression)
        && ts.isIdentifier(rejection.expression.expression)
        && rejection.expression.expression.text === "Promise"
        && rejection.expression.name.text === "reject") {
        const guard = enclosingCancellationGuard(node);
        if (guard) {
          const signal = cancellationSignalContract(node, guard.binding, sourceFile);
          if (signal) {
            records.push({
              kind: "abort-reason-drop",
              caller: enclosingCaller(node),
              mechanism: "abort-rejection-without-reason",
              cancellationBinding: guard.binding,
              signalExpression: signal.expression,
              rejectionExpression: boundedNodeText(rejection, sourceFile),
              location: locationOf(rejection, sourceFile),
              cancellationLocation: locationOf(signal.assignment, sourceFile),
              signalLocation: locationOf(signal.signal, sourceFile),
            });
          }
        }
      }
    }
    ts.forEachChild(node, visitReturns);
  };
  visitReturns(sourceFile);
  return records.sort((left, right) => left.location.line - right.location.line);
}

function enclosingCancellationGuard(
  node: ts.Node,
): { binding: string; guard: ts.IfStatement } | undefined {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isIfStatement(current) && containsPosition(current.thenStatement, node)) {
      const condition = unwrapExpression(current.expression);
      if (ts.isIdentifier(condition) && /(?:cancel|abort)/iu.test(condition.text)) {
        return { binding: condition.text, guard: current };
      }
    }
    if (isFunctionBoundary(current)) return undefined;
    current = current.parent;
  }
  return undefined;
}

function cancellationSignalContract(
  node: ts.Node,
  cancellationBinding: string,
  sourceFile: ts.SourceFile,
): { expression: string; signal: ts.Expression; assignment: ts.BinaryExpression } | undefined {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (isFunctionBoundary(current) && current.body) {
      let result: { expression: string; signal: ts.Expression; assignment: ts.BinaryExpression } | undefined;
      const inspect = (candidate: ts.Node): void => {
        if (result) return;
        if (ts.isCallExpression(candidate)
          && /(?:consume.*signal|signal.*consume)/iu.test(directExpressionName(candidate.expression) ?? "")) {
          let signal: ts.Expression | undefined;
          let assignment: ts.BinaryExpression | undefined;
          for (const argument of candidate.arguments) {
            const value = unwrapExpression(argument);
            if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) {
              const body = value.body;
              const inspectCallback = (callbackNode: ts.Node): void => {
                const left = ts.isBinaryExpression(callbackNode)
                  ? unwrapExpression(callbackNode.left)
                  : undefined;
                if (ts.isBinaryExpression(callbackNode)
                  && callbackNode.operatorToken.kind === ts.SyntaxKind.EqualsToken
                  && left
                  && ts.isIdentifier(left)
                  && left.text === cancellationBinding
                  && unwrapExpression(callbackNode.right).kind === ts.SyntaxKind.TrueKeyword) {
                  assignment = callbackNode;
                }
                if (ts.isPropertyAccessExpression(callbackNode)
                  && callbackNode.name.text === "signal") {
                  signal = callbackNode;
                }
                ts.forEachChild(callbackNode, inspectCallback);
              };
              inspectCallback(body);
            }
          }
          if (signal && assignment) {
            result = {
              expression: boundedNodeText(signal, sourceFile),
              signal,
              assignment,
            };
            return;
          }
        }
        ts.forEachChild(candidate, inspect);
      };
      inspect(current.body);
      if (result) return result;
    }
    current = current.parent;
  }
  return undefined;
}

function dependencyResolutionRecords(sourceFile: ts.SourceFile): DependencyResolutionEvidence[] {
  const records: DependencyResolutionEvidence[] = [];
  const visitLoops = (node: ts.Node): void => {
    if (ts.isForOfStatement(node) || ts.isForInStatement(node) || ts.isForStatement(node)) {
      const selection = candidateSelectionAssignment(node.statement, sourceFile);
      if (selection) {
        const exit = loopExitAfterSelection(node.statement, selection.node, sourceFile);
        records.push({
          kind: "dependency-selection",
          caller: enclosingCaller(node),
          selectedBinding: selection.binding,
          candidateExpression: selection.expression,
          collectionExpression: ts.isForStatement(node)
            ? boundedNodeText(node.condition ?? node, sourceFile)
            : boundedNodeText(node.expression, sourceFile),
          exitKind: exit.kind,
          ...(exit.condition ? { exitCondition: exit.condition } : {}),
          returnedAfterLoop: bindingReturnedAfterLoop(node, selection.binding),
          selectionLocation: locationOf(selection.node, sourceFile),
          ...(exit.node ? { exitLocation: locationOf(exit.node, sourceFile) } : {}),
          location: locationOf(node, sourceFile),
        });
      }
    }
    ts.forEachChild(node, visitLoops);
  };
  visitLoops(sourceFile);
  return records;
}

function dependencyExplicitSourceRecords(sourceFile: ts.SourceFile): DependencyExplicitSourceEvidence[] {
  const records: DependencyExplicitSourceEvidence[] = [];
  const visitFunctions = (node: ts.Node): void => {
    if (isFunctionBoundary(node) && node.body && ts.isBlock(node.body)) {
      const caller = functionLikeName(node);
      if (caller && /(?:import|module).*(?:completion|fix|action)|(?:completion|fix|action).*(?:import|module)/iu.test(caller)) {
        const visitDeclarations = (candidate: ts.Node): void => {
          if (candidate !== node.body && isFunctionBoundary(candidate)) return;
          if (ts.isVariableDeclaration(candidate)
            && ts.isIdentifier(candidate.name)
            && /exportInfo/iu.test(candidate.name.text)
            && candidate.initializer) {
            const initializer = unwrapExpression(candidate.initializer);
            if (ts.isCallExpression(initializer)
              && directExpressionName(initializer.expression) === "getAllReExportingModules") {
              const explicitModule = initializer.arguments.find((argument) => {
                const text = boundedNodeText(argument, sourceFile);
                return /module(?:Symbol)?/iu.test(text);
              });
              if (explicitModule) {
                records.push({
                  kind: "dependency-explicit-source",
                  caller,
                  mechanism: "bare-explicit-source-expanded",
                  resultBinding: candidate.name.text,
                  expansionFunction: "getAllReExportingModules",
                  explicitModuleExpression: boundedNodeText(explicitModule, sourceFile),
                  location: locationOf(candidate, sourceFile),
                  expansionLocation: locationOf(initializer, sourceFile),
                });
              }
            }
          }
          ts.forEachChild(candidate, visitDeclarations);
        };
        visitDeclarations(node.body);
      }
    }
    ts.forEachChild(node, visitFunctions);
  };
  visitFunctions(sourceFile);
  return records.sort((left, right) => left.location.line - right.location.line);
}

const DEPENDENCY_RESOLVER_NAME = /(?:resolve|find|get|inject|provider|dependency|binding)/iu;
const DEPENDENCY_CANDIDATE_NAME = /(?:candidate|provider|binding|registration|instance.?link|wrapper|entry)/iu;
const DEPENDENCY_LOOKUP_METHODS = new Set(["find", "get", "lookup", "resolve"]);
const DEPENDENCY_NAMESPACE_RESOLVER_NAME = /(?:resolve|find|select|lookup)/iu;

function dependencyCandidateBypassRecords(sourceFile: ts.SourceFile): DependencyCandidateBypassEvidence[] {
  const records: DependencyCandidateBypassEvidence[] = [];
  const visitResolvers = (node: ts.Node): void => {
    if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && ts.isBlock(node.body)) {
      const record = dependencyCandidateBypassRecord(node, sourceFile);
      if (record) records.push(record);
    }
    ts.forEachChild(node, visitResolvers);
  };
  visitResolvers(sourceFile);
  return records.sort((left, right) =>
    left.location.line - right.location.line || left.resolver.localeCompare(right.resolver));
}

function dependencyCandidateBypassRecord(
  resolver: ts.ArrowFunction | ts.FunctionExpression,
  sourceFile: ts.SourceFile,
): DependencyCandidateBypassEvidence | undefined {
  const resolverName = functionLikeName(resolver);
  const candidate = resolver.parameters[0]?.name;
  if (!resolverName || !candidate || !ts.isIdentifier(candidate) || !DEPENDENCY_CANDIDATE_NAME.test(candidate.text)) {
    return undefined;
  }
  const outer = enclosingFunction(resolver);
  const caller = outer ? functionLikeName(outer) : undefined;
  if (!outer?.body || !ts.isBlock(outer.body) || !caller || !DEPENDENCY_RESOLVER_NAME.test(caller)) return undefined;
  const iteration = candidateIteration(outer.body, resolverName, sourceFile);
  if (!iteration || !DEPENDENCY_CANDIDATE_NAME.test(iteration.collectionExpression)) return undefined;

  const candidateBindings = candidateDerivedBindings(resolver, candidate.text);
  const outerParameters = new Set<string>();
  for (const parameter of outer.parameters) collectBindingNames(parameter.name, outerParameters);
  if (outerParameters.size === 0) return undefined;

  for (const returned of directFunctionReturns(resolver)) {
    if (!returned.expression) continue;
    const bypassCall = returnedCallExpression(returned.expression);
    const callPath = bypassCall ? memberPath(bypassCall.expression) : undefined;
    if (!bypassCall || callPath?.[0] !== "this" || !DEPENDENCY_LOOKUP_METHODS.has(callPath.at(-1) ?? "")) {
      continue;
    }
    if (referencedNames(bypassCall, candidateBindings).length > 0) continue;
    const selectorExpressions = bypassCall.arguments
      .filter((argument) => referencedNames(argument, outerParameters).length > 0)
      .map((argument) => boundedNodeText(argument, sourceFile));
    if (selectorExpressions.length === 0) continue;
    const guarded = enclosingCandidateGuard(returned, resolver, candidateBindings);
    if (!guarded) continue;
    return {
      kind: "dependency-candidate-bypass",
      caller,
      resolver: resolverName,
      mechanism: "iterated-candidate-bypass",
      candidateParameter: candidate.text,
      candidateBindings: [...candidateBindings].sort(),
      collectionExpression: iteration.collectionExpression,
      bypassExpression: boundedNodeText(bypassCall, sourceFile),
      selectorExpressions,
      guardExpression: boundedNodeText(guarded.expression, sourceFile),
      location: locationOf(resolver, sourceFile),
      iterationLocation: iteration.location,
      bypassLocation: locationOf(bypassCall, sourceFile),
      guardLocation: locationOf(guarded.expression, sourceFile),
    };
  }
  return undefined;
}

function candidateDerivedBindings(
  resolver: ts.ArrowFunction | ts.FunctionExpression,
  candidate: string,
): Set<string> {
  const bindings = new Set([candidate]);
  const visit = (node: ts.Node): void => {
    if (node !== resolver.body && isFunctionBoundary(node)) return;
    if (ts.isVariableDeclaration(node)
      && node.initializer
      && referencedNames(node.initializer, bindings).length > 0) {
      collectBindingNames(node.name, bindings);
    }
    ts.forEachChild(node, visit);
  };
  visit(resolver.body);
  return bindings;
}

function dependencyNamespaceAmbiguityRecords(
  sourceFile: ts.SourceFile,
): DependencyNamespaceAmbiguityEvidence[] {
  const records: DependencyNamespaceAmbiguityEvidence[] = [];
  const visitFunctions = (node: ts.Node): void => {
    if (isFunctionBoundary(node) && node.body && ts.isBlock(node.body)) {
      const caller = functionLikeName(node);
      if (caller && DEPENDENCY_NAMESPACE_RESOLVER_NAME.test(caller)) {
        records.push(...dependencyNamespaceAmbiguityRecordsForFunction(node, caller, sourceFile));
      }
    }
    ts.forEachChild(node, visitFunctions);
  };
  visitFunctions(sourceFile);
  return records.sort((left, right) =>
    left.location.line - right.location.line || left.selectedBinding.localeCompare(right.selectedBinding));
}

function dependencyNamespaceAmbiguityRecordsForFunction(
  fn: ts.FunctionLikeDeclaration,
  caller: string,
  sourceFile: ts.SourceFile,
): DependencyNamespaceAmbiguityEvidence[] {
  if (!fn.body || !ts.isBlock(fn.body)) return [];
  const body = fn.body;
  const ambiguity = functionAmbiguityContract(body, sourceFile);
  if (!ambiguity) return [];

  const records: DependencyNamespaceAmbiguityEvidence[] = [];
  const visit = (node: ts.Node): void => {
    if (node !== body && isFunctionBoundary(node)) return;
    if (ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.initializer) {
      const selection = namespaceFirstMatchSelection(node.initializer, sourceFile);
      if (selection) {
        const returned = selectedCanonicalReturn(
          body,
          node,
          node.name.text,
          new Set(selection.matchedProperties),
          sourceFile,
        );
        if (returned) {
          records.push({
            kind: "dependency-namespace-ambiguity",
            mechanism: "multi-namespace-first-match",
            caller,
            selectedBinding: node.name.text,
            collectionExpression: selection.collectionExpression,
            candidateParameter: selection.candidateParameter,
            selectorExpression: selection.selectorExpression,
            matchedProperties: selection.matchedProperties,
            canonicalProperty: returned.canonicalProperty,
            returnExpression: returned.returnExpression,
            ambiguitySignal: ambiguity.signal,
            location: locationOf(node, sourceFile),
            selectionLocation: locationOf(selection.call, sourceFile),
            predicateLocation: locationOf(selection.predicate, sourceFile),
            returnLocation: locationOf(returned.returnStatement, sourceFile),
            ambiguityLocation: locationOf(ambiguity.condition, sourceFile),
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return records;
}

function namespaceFirstMatchSelection(
  initializer: ts.Expression,
  sourceFile: ts.SourceFile,
): {
  call: ts.CallExpression;
  predicate: ts.Expression;
  collectionExpression: string;
  candidateParameter: string;
  selectorExpression: string;
  matchedProperties: string[];
} | undefined {
  const call = unwrapExpression(initializer);
  if (!ts.isCallExpression(call)
    || !ts.isPropertyAccessExpression(call.expression)
    || call.expression.name.text !== "find") {
    return undefined;
  }
  const callback = call.arguments[0];
  if (!callback || (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))) return undefined;
  const candidate = callback.parameters[0]?.name;
  if (!candidate || !ts.isIdentifier(candidate)) return undefined;
  const predicate = callbackPredicate(callback);
  if (!predicate) return undefined;

  const comparisons = booleanTerms(unwrapExpression(predicate), "or");
  if (comparisons.length < 2) return undefined;
  const matchedProperties: string[] = [];
  let selectorExpression: string | undefined;
  for (const comparison of comparisons) {
    const normalized = namespaceEquality(
      unwrapExpression(comparison),
      candidate.text,
      sourceFile,
    );
    if (!normalized) return undefined;
    if (selectorExpression !== undefined && normalized.selectorExpression !== selectorExpression) return undefined;
    selectorExpression = normalized.selectorExpression;
    matchedProperties.push(normalized.property);
  }
  const distinctProperties = [...new Set(matchedProperties)];
  if (!selectorExpression || distinctProperties.length < 2) return undefined;
  return {
    call,
    predicate,
    collectionExpression: boundedNodeText(call.expression.expression, sourceFile),
    candidateParameter: candidate.text,
    selectorExpression,
    matchedProperties: distinctProperties,
  };
}

function callbackPredicate(
  callback: ts.ArrowFunction | ts.FunctionExpression,
): ts.Expression | undefined {
  if (!ts.isBlock(callback.body)) return callback.body;
  if (callback.body.statements.length !== 1) return undefined;
  const statement = callback.body.statements[0];
  return statement && ts.isReturnStatement(statement) && statement.expression
    ? statement.expression
    : undefined;
}

function namespaceEquality(
  expression: ts.Expression,
  candidateParameter: string,
  sourceFile: ts.SourceFile,
): { property: string; selectorExpression: string } | undefined {
  if (!ts.isBinaryExpression(expression)
    || expression.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken) {
    return undefined;
  }
  return namespaceEqualitySides(expression.left, expression.right, candidateParameter, sourceFile)
    ?? namespaceEqualitySides(expression.right, expression.left, candidateParameter, sourceFile);
}

function namespaceEqualitySides(
  candidateSide: ts.Expression,
  selectorSide: ts.Expression,
  candidateParameter: string,
  sourceFile: ts.SourceFile,
): { property: string; selectorExpression: string } | undefined {
  const path = memberPath(unwrapExpression(candidateSide));
  if (!path || path.length !== 2 || path[0] !== candidateParameter) return undefined;
  if (referencedNames(selectorSide, new Set([candidateParameter])).length > 0) return undefined;
  return {
    property: path[1]!,
    selectorExpression: boundedNodeText(selectorSide, sourceFile),
  };
}

function selectedCanonicalReturn(
  body: ts.Block,
  declaration: ts.VariableDeclaration,
  selectedBinding: string,
  matchedProperties: ReadonlySet<string>,
  sourceFile: ts.SourceFile,
): {
  canonicalProperty: string;
  returnExpression: string;
  returnStatement: ts.ReturnStatement;
} | undefined {
  let result: {
    canonicalProperty: string;
    returnExpression: string;
    returnStatement: ts.ReturnStatement;
  } | undefined;
  const visit = (node: ts.Node): void => {
    if (result || (node !== body && node.getStart(sourceFile) <= declaration.getStart(sourceFile))) return;
    if (node !== body && isFunctionBoundary(node)) return;
    if (ts.isReturnStatement(node) && node.expression) {
      const property = returnedSelectedProperty(node.expression, selectedBinding);
      if (property
        && matchedProperties.has(property)
        && returnGuardedBySelection(node, body, selectedBinding)) {
        result = {
          canonicalProperty: property,
          returnExpression: boundedNodeText(node.expression, sourceFile),
          returnStatement: node,
        };
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return result;
}

function returnGuardedBySelection(
  returned: ts.ReturnStatement,
  body: ts.Block,
  selectedBinding: string,
): boolean {
  let current: ts.Node | undefined = returned.parent;
  const selected = new Set([selectedBinding]);
  while (current && current !== body) {
    if (ts.isIfStatement(current)
      && containsPosition(current.thenStatement, returned)
      && referencedNames(current.expression, selected).length > 0) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function returnedSelectedProperty(
  expression: ts.Expression,
  selectedBinding: string,
): string | undefined {
  const value = unwrapExpression(expression);
  const directPath = memberPath(value);
  if (directPath?.length === 2 && directPath[0] === selectedBinding) return directPath[1];
  if (!ts.isObjectLiteralExpression(value)) return undefined;
  for (const property of value.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const path = memberPath(unwrapExpression(property.initializer));
    if (path?.length === 2 && path[0] === selectedBinding) return path[1];
  }
  return undefined;
}

function functionAmbiguityContract(
  body: ts.Block,
  sourceFile: ts.SourceFile,
): { signal: string; condition: ts.Expression } | undefined {
  let result: { signal: string; condition: ts.Expression } | undefined;
  const visit = (node: ts.Node): void => {
    if (result || (node !== body && isFunctionBoundary(node))) return;
    if (ts.isIfStatement(node)
      && isMultipleMatchCondition(node.expression)
      && statementReturnsAmbiguous(node.thenStatement)) {
      result = {
        signal: boundedNodeText(node.expression, sourceFile),
        condition: node.expression,
      };
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  if (result) return result;

  let ambiguousReturn: ts.ReturnStatement | undefined;
  const findReturn = (node: ts.Node): void => {
    if (ambiguousReturn || (node !== body && isFunctionBoundary(node))) return;
    if (ts.isReturnStatement(node)
      && node.expression
      && expressionHasAmbiguousReason(node.expression)
      && ambiguousMatchBinding(node.expression)) {
      ambiguousReturn = node;
      return;
    }
    ts.forEachChild(node, findReturn);
  };
  findReturn(body);
  if (!ambiguousReturn?.expression) return undefined;
  const matchBinding = ambiguousMatchBinding(ambiguousReturn.expression);
  if (!matchBinding) return undefined;
  const checks = collectionCardinalityChecks(
    body,
    matchBinding,
    ambiguousReturn.getStart(sourceFile),
    sourceFile,
  );
  const cardinalities = new Set(checks.map((check) => check.cardinality));
  if (!cardinalities.has(0) || !cardinalities.has(1)) return undefined;
  return {
    signal: `${checks.map((check) => check.expression).join(" and ")} before ambiguous return`,
    condition: ambiguousReturn.expression,
  };
}

function isMultipleMatchCondition(expression: ts.Expression): boolean {
  const value = unwrapExpression(expression);
  if (!ts.isBinaryExpression(value)
    || (value.operatorToken.kind !== ts.SyntaxKind.GreaterThanToken
      && value.operatorToken.kind !== ts.SyntaxKind.GreaterThanEqualsToken)) {
    return false;
  }
  const left = memberPath(unwrapExpression(value.left));
  return left?.at(-1) === "length"
    && ts.isNumericLiteral(unwrapExpression(value.right))
    && Number(unwrapExpression(value.right).getText()) >= 1;
}

function statementReturnsAmbiguous(statement: ts.Statement): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found || (node !== statement && isFunctionBoundary(node))) return;
    if (ts.isReturnStatement(node)
      && node.expression
      && expressionHasAmbiguousReason(node.expression)) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(statement);
  return found;
}

function expressionHasAmbiguousReason(expression: ts.Expression): boolean {
  const value = unwrapExpression(expression);
  if (!ts.isObjectLiteralExpression(value)) return false;
  return value.properties.some((property) => {
    if (!ts.isPropertyAssignment(property) || methodNameText(property.name) !== "reason") return false;
    const initializer = unwrapExpression(property.initializer);
    return ts.isStringLiteralLike(initializer) && initializer.text === "ambiguous";
  });
}

function ambiguousMatchBinding(expression: ts.Expression): string | undefined {
  const value = unwrapExpression(expression);
  if (!ts.isObjectLiteralExpression(value)) return undefined;
  for (const property of value.properties) {
    if (ts.isShorthandPropertyAssignment(property) && property.name.text === "matches") {
      return property.name.text;
    }
    if (ts.isPropertyAssignment(property) && methodNameText(property.name) === "matches") {
      const initializer = unwrapExpression(property.initializer);
      if (ts.isIdentifier(initializer)) return initializer.text;
    }
  }
  return undefined;
}

function collectionCardinalityChecks(
  body: ts.Block,
  collection: string,
  beforePosition: number,
  sourceFile: ts.SourceFile,
): Array<{ cardinality: number; expression: string }> {
  const checks: Array<{ cardinality: number; expression: string }> = [];
  const visit = (node: ts.Node): void => {
    if ((node !== body && isFunctionBoundary(node)) || node.getStart(sourceFile) >= beforePosition) return;
    if (ts.isBinaryExpression(node)
      && (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
        || node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken)) {
      const left = memberPath(unwrapExpression(node.left));
      const right = unwrapExpression(node.right);
      if (left?.length === 2
        && left[0] === collection
        && left[1] === "length"
        && ts.isNumericLiteral(right)) {
        checks.push({
          cardinality: Number(right.text),
          expression: boundedNodeText(node, sourceFile),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return checks;
}

function candidateIteration(
  body: ts.Block,
  resolverName: string,
  sourceFile: ts.SourceFile,
): { collectionExpression: string; location: AstLocation } | undefined {
  let match: { collectionExpression: string; location: AstLocation } | undefined;
  const visit = (node: ts.Node): void => {
    if (match || (node !== body && isFunctionBoundary(node))) return;
    if (ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && (node.expression.name.text === "map" || node.expression.name.text === "flatMap")
      && callbackInvokesResolver(node.arguments[0], resolverName)) {
      match = {
        collectionExpression: boundedNodeText(node.expression.expression, sourceFile),
        location: locationOf(node, sourceFile),
      };
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return match;
}

function callbackInvokesResolver(callback: ts.Expression | undefined, resolverName: string): boolean {
  if (!callback) return false;
  const value = unwrapExpression(callback);
  if (ts.isIdentifier(value)) return value.text === resolverName;
  if (!ts.isArrowFunction(value) && !ts.isFunctionExpression(value)) return false;
  const callbackBindings = new Set<string>();
  for (const parameter of value.parameters) collectBindingNames(parameter.name, callbackBindings);
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found || (node !== value.body && isFunctionBoundary(node))) return;
    if (ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === resolverName
      && node.arguments.some((argument) => referencedNames(argument, callbackBindings).length > 0)) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(value.body);
  return found;
}

function enclosingCandidateGuard(
  node: ts.Node,
  resolver: ts.ArrowFunction | ts.FunctionExpression,
  candidateBindings: ReadonlySet<string>,
): ts.IfStatement | undefined {
  let current: ts.Node | undefined = node.parent;
  while (current && current !== resolver) {
    if (ts.isIfStatement(current)
      && referencedNames(current.expression, candidateBindings).length > 0
      && (containsPosition(current.thenStatement, node)
        || (current.elseStatement ? containsPosition(current.elseStatement, node) : false))) {
      return current;
    }
    current = current.parent;
  }
  return undefined;
}

function candidateSelectionAssignment(
  body: ts.Statement,
  sourceFile: ts.SourceFile,
): { node: ts.BinaryExpression; binding: string; expression: string } | undefined {
  let match: { node: ts.BinaryExpression; binding: string; expression: string } | undefined;
  const visit = (node: ts.Node): void => {
    if (match || (node !== body && (isFunctionBoundary(node) || isLoopStatement(node)))) return;
    if (ts.isBinaryExpression(node)
      && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ts.isIdentifier(node.left)) {
      const right = unwrapExpression(node.right);
      if (ts.isCallExpression(right)
        && ts.isPropertyAccessExpression(right.expression)
        && right.expression.name.text === "get") {
        match = {
          node,
          binding: node.left.text,
          expression: boundedNodeText(right, sourceFile),
        };
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return match;
}

function loopExitAfterSelection(
  body: ts.Statement,
  selection: ts.BinaryExpression,
  sourceFile: ts.SourceFile,
): { kind: DependencyResolutionEvidence["exitKind"]; condition?: string; node?: ts.BreakStatement } {
  const breaks: Array<{ node: ts.BreakStatement; condition?: string }> = [];
  const visit = (node: ts.Node): void => {
    if (node !== body && (isFunctionBoundary(node) || isLoopStatement(node))) return;
    if (ts.isBreakStatement(node) && !node.label && node.getStart(sourceFile) > selection.getStart(sourceFile)) {
      let current: ts.Node | undefined = node.parent;
      let condition: string | undefined;
      while (current && current !== body) {
        if (ts.isIfStatement(current)) {
          condition = boundedNodeText(current.expression, sourceFile);
          break;
        }
        current = current.parent;
      }
      breaks.push({ node, ...(condition ? { condition } : {}) });
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  const exit = breaks.sort((left, right) => left.node.getStart(sourceFile) - right.node.getStart(sourceFile))[0];
  if (!exit) return { kind: "none" };
  return {
    kind: exit.condition ? "conditional-break" : "unconditional-break",
    ...(exit.condition ? { condition: exit.condition } : {}),
    node: exit.node,
  };
}

function bindingReturnedAfterLoop(loop: ts.IterationStatement, binding: string): boolean {
  if (!ts.isBlock(loop.parent)) return false;
  const index = loop.parent.statements.indexOf(loop);
  if (index < 0) return false;
  return loop.parent.statements.slice(index + 1).some((statement) => containsReturnedBinding(statement, binding));
}

function containsReturnedBinding(node: ts.Node, binding: string): boolean {
  if (isFunctionBoundary(node)) return false;
  if (ts.isReturnStatement(node) && node.expression) {
    const expression = unwrapExpression(node.expression);
    return ts.isIdentifier(expression) && expression.text === binding;
  }
  let found = false;
  ts.forEachChild(node, (child) => {
    if (!found) found = containsReturnedBinding(child, binding);
  });
  return found;
}

function enclosingCaller(node: ts.Node): string {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isFunctionDeclaration(current)) return current.name?.text ?? "default";
    if (ts.isMethodDeclaration(current)) return methodNameText(current.name) ?? "__anonymous__";
    if (ts.isConstructorDeclaration(current)) return "constructor";
    if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current))
      && ts.isVariableDeclaration(current.parent)
      && ts.isIdentifier(current.parent.name)) {
      return current.parent.name.text;
    }
    current = current.parent;
  }
  return "__module__";
}

function isLoopStatement(node: ts.Node): node is ts.IterationStatement {
  return ts.isForStatement(node)
    || ts.isForInStatement(node)
    || ts.isForOfStatement(node)
    || ts.isWhileStatement(node)
    || ts.isDoStatement(node);
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current)
    || ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isNonNullExpression(current)) {
    current = current.expression;
  }
  return current;
}

function referencePositionRecords(sourceFile: ts.SourceFile): ReferencePositionEvidence[] {
  const records: ReferencePositionEvidence[] = [];
  const visitFunctions = (node: ts.Node): void => {
    if (isFunctionBoundary(node) && node.body && ts.isBlock(node.body)) {
      const caller = functionLikeName(node);
      const parentParameter = node.parameters[1]?.name;
      if (caller
        && /(?:is|classify).*(?:ref|reference).*identifier/iu.test(caller)
        && parentParameter
        && ts.isIdentifier(parentParameter)
        && sourceFile.text.includes("PropertyDefinition")) {
        let methodExclusion: ts.IfStatement | undefined;
        let propertyKeyExclusion: ts.IfStatement | undefined;
        let classPropertyExclusion = false;
        const inspect = (candidate: ts.Node): void => {
          if (candidate !== node.body && isFunctionBoundary(candidate)) return;
          if (ts.isIfStatement(candidate)) {
            const condition = boundedNodeText(candidate.expression, sourceFile);
            if (statementReturnsFalse(candidate.thenStatement)
              && /MethodDefinition/u.test(condition)
              && new RegExp(`!\\s*${parentParameter.text}\\.computed`, "u").test(condition)) {
              methodExclusion = candidate;
            }
            if (statementReturnsFalse(candidate.thenStatement)
              && /isStaticPropertyKey/u.test(condition)) {
              propertyKeyExclusion = candidate;
            }
            if (/PropertyDefinition/u.test(condition)
              && new RegExp(`!\\s*${parentParameter.text}\\.computed`, "u").test(condition)
              && statementContainsReturn(candidate.thenStatement)) {
              classPropertyExclusion = true;
            }
          }
          ts.forEachChild(candidate, inspect);
        };
        inspect(node.body);
        if (methodExclusion && propertyKeyExclusion && !classPropertyExclusion) {
          records.push({
            kind: "reference-position",
            caller,
            mechanism: "noncomputed-class-property-key-reference",
            parentParameter: parentParameter.text,
            modeledExclusions: [
              "MethodDefinition.noncomputed-key",
              "static-property-key",
            ],
            missingExclusion: "PropertyDefinition.noncomputed-key",
            location: locationOf(node, sourceFile),
            methodExclusionLocation: locationOf(methodExclusion.expression, sourceFile),
            propertyKeyExclusionLocation: locationOf(propertyKeyExclusion.expression, sourceFile),
          });
        }
      }
    }
    ts.forEachChild(node, visitFunctions);
  };
  visitFunctions(sourceFile);
  return records.sort((left, right) => left.location.line - right.location.line);
}

function statementReturnsFalse(statement: ts.Statement): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found || (node !== statement && isFunctionBoundary(node))) return;
    if (ts.isReturnStatement(node)
      && node.expression
      && unwrapExpression(node.expression).kind === ts.SyntaxKind.FalseKeyword) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(statement);
  return found;
}

function statementContainsReturn(statement: ts.Statement): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found || (node !== statement && isFunctionBoundary(node))) return;
    if (ts.isReturnStatement(node)) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(statement);
  return found;
}

function scopeResolutionRecords(sourceFile: ts.SourceFile): ScopeResolutionEvidence[] {
  const text = sourceFile.text;
  const resolverFunctions = new Set<string>();
  const classifiers: Array<{ name: string; expression: string; location: AstLocation }> = [];

  const visitScopeModel = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name && /(?:scope|binding)/iu.test(node.name.text)) {
      resolverFunctions.add(node.name.text);
    } else if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.initializer
    ) {
      if (
        (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
        && /(?:scope|binding)/iu.test(node.name.text)
      ) {
        resolverFunctions.add(node.name.text);
      }
      const expression = boundedNodeText(node.initializer, sourceFile);
      if (
        /(?:block|scope)/iu.test(node.name.text)
        && /BlockStatement/u.test(expression)
        && (ts.isRegularExpressionLiteral(node.initializer) || ts.isStringLiteralLike(node.initializer))
      ) {
        classifiers.push({
          name: node.name.text,
          expression,
          location: locationOf(node.name, sourceFile),
        });
      }
    }
    ts.forEachChild(node, visitScopeModel);
  };
  visitScopeModel(sourceFile);

  const handlesSwitchCases = /\bSwitchCase\b/u.test(text);
  const routesDeclarations = /\bVariableDeclarator\b/u.test(text) && /\bfindParentScope\b/u.test(text);
  const rewritesIdentifiers = /\bonIdentifier\b/u.test(text) && /\b(?:overwrite|replace|rewrite|update)\b/iu.test(text);
  if (!handlesSwitchCases || !routesDeclarations || !rewritesIdentifiers || resolverFunctions.size < 2) return [];

  return classifiers.map((classifier) => {
    const modeledNodeKinds = [...new Set(
      classifier.expression.match(/[A-Z][A-Za-z]*(?:Statement|Block|Case|Declaration|Expression)/gu) ?? [],
    )].sort();
    const modelsSwitch = classifier.expression.includes("SwitchStatement");
    return {
      kind: "scope-model",
      classifierName: classifier.name,
      classifierExpression: classifier.expression,
      resolverFunctions: [...resolverFunctions].sort(),
      modeledNodeKinds,
      unmodeledLexicalBoundaries: modelsSwitch ? [] : ["SwitchStatement"],
      handlesSwitchCases,
      rewritesIdentifiers,
      excludesSwitchDiscriminant: modelsSwitch
        && /(?:SwitchStatement[\s\S]{0,240}discriminant|discriminant[\s\S]{0,240}SwitchStatement)/u.test(text),
      location: classifier.location,
    };
  });
}

function scopeNameResolutionRecords(sourceFile: ts.SourceFile): ScopeNameResolutionEvidence[] {
  const records: ScopeNameResolutionEvidence[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const record = scopeNameResolutionRecord(node, sourceFile);
      if (record) records.push(record);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return records.sort((left, right) =>
    left.location.line - right.location.line || left.bindTarget.localeCompare(right.bindTarget));
}

function scopeTraversalEscapeRecords(sourceFile: ts.SourceFile): ScopeTraversalEscapeEvidence[] {
  const records: ScopeTraversalEscapeEvidence[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.initializer) {
      const initializer = unwrapExpression(node.initializer);
      if (ts.isObjectLiteralExpression(initializer)) {
        const record = scopeTraversalEscapeRecord(node, initializer, sourceFile);
        if (record) records.push(record);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return records.sort((left, right) =>
    left.location.line - right.location.line || left.visitor.localeCompare(right.visitor));
}

function scopeTraversalEscapeRecord(
  declaration: ts.VariableDeclaration,
  visitor: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
): ScopeTraversalEscapeEvidence | undefined {
  if (!ts.isIdentifier(declaration.name)) return undefined;
  const typeText = declaration.type ? boundedNodeText(declaration.type, sourceFile) : "";
  if (!/visitor/iu.test(declaration.name.text) && !/\bVisitor\b/u.test(typeText)) return undefined;
  const scopeHandler = visitor.properties.find((property): property is ts.MethodDeclaration =>
    ts.isMethodDeclaration(property)
      && property.name !== undefined
      && propertyNameText(property.name) === "Scope"
      && property.body !== undefined);
  if (!scopeHandler?.body) return undefined;
  const pathParameter = scopeHandler.parameters[0]?.name;
  if (!pathParameter || !ts.isIdentifier(pathParameter)) return undefined;

  const shadowBranch = findScopeSkipBranch(scopeHandler.body, pathParameter.text, sourceFile);
  if (!shadowBranch) return undefined;
  const methodCheck = findPathCall(
    shadowBranch.thenStatement,
    pathParameter.text,
    ["isMethod"],
  );
  const methodRequeue = findPathCall(
    shadowBranch.thenStatement,
    pathParameter.text,
    ["requeueComputedKeyAndDecorators"],
  );
  if (!methodCheck || !methodRequeue) return undefined;
  const handlesSwitch = findPathCall(
    shadowBranch.thenStatement,
    pathParameter.text,
    ["isSwitchStatement"],
  );
  const getsDiscriminant = findPathCall(
    shadowBranch.thenStatement,
    pathParameter.text,
    ["get"],
    "discriminant",
  );
  const queuesChild = findMemberCall(
    shadowBranch.thenStatement,
    /^(?:maybeQueue|queue|requeue)$/u,
  );
  if (handlesSwitch && getsDiscriminant && queuesChild) return undefined;

  return {
    kind: "scope-traversal-escape",
    mechanism: "switch-discriminant-not-requeued",
    visitor: declaration.name.text,
    scopeHandler: "Scope",
    pathParameter: pathParameter.text,
    bindingCheck: boundedNodeText(shadowBranch.expression, sourceFile),
    skipExpression: boundedNodeText(shadowBranch.skipCall, sourceFile),
    modeledExceptions: ["method-computed-key-and-decorators"],
    missingParentEvaluatedChildren: ["SwitchStatement.discriminant"],
    location: locationOf(declaration.name, sourceFile),
    handlerLocation: locationOf(scopeHandler.name, sourceFile),
    bindingCheckLocation: locationOf(shadowBranch.bindingCheck, sourceFile),
    skipLocation: locationOf(shadowBranch.skipCall, sourceFile),
    exceptionLocation: locationOf(methodRequeue, sourceFile),
  };
}

function findScopeSkipBranch(
  body: ts.Block,
  pathParameter: string,
  sourceFile: ts.SourceFile,
): {
  expression: ts.Expression;
  bindingCheck: ts.CallExpression;
  skipCall: ts.CallExpression;
  thenStatement: ts.Statement;
} | undefined {
  let match: {
    expression: ts.Expression;
    bindingCheck: ts.CallExpression;
    skipCall: ts.CallExpression;
    thenStatement: ts.Statement;
  } | undefined;
  const visit = (node: ts.Node): void => {
    if (match || (node !== body && isFunctionBoundary(node))) return;
    if (ts.isIfStatement(node)) {
      const bindingCheck = findPathCall(
        node.expression,
        pathParameter,
        ["scope", "bindingIdentifierEquals"],
      );
      const skipCall = findPathCall(node.thenStatement, pathParameter, ["skip"]);
      if (bindingCheck
        && skipCall
        && boundedNodeText(node.expression, sourceFile).includes("!")) {
        match = {
          expression: node.expression,
          bindingCheck,
          skipCall,
          thenStatement: node.thenStatement,
        };
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return match;
}

function findPathCall(
  root: ts.Node,
  pathParameter: string,
  expectedMembers: readonly string[],
  stringArgument?: string,
): ts.CallExpression | undefined {
  let match: ts.CallExpression | undefined;
  const visit = (node: ts.Node): void => {
    if (match || (node !== root && isFunctionBoundary(node))) return;
    if (ts.isCallExpression(node)) {
      const path = memberPath(node.expression);
      const expectedPath = [pathParameter, ...expectedMembers];
      if (path?.length === expectedPath.length
        && path.every((part, index) => part === expectedPath[index])
        && (stringArgument === undefined
          || node.arguments.some((argument) =>
            ts.isStringLiteralLike(argument) && argument.text === stringArgument))) {
        match = node;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return match;
}

function findMemberCall(
  root: ts.Node,
  memberName: RegExp,
): ts.CallExpression | undefined {
  let match: ts.CallExpression | undefined;
  const visit = (node: ts.Node): void => {
    if (match || (node !== root && isFunctionBoundary(node))) return;
    if (ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && memberName.test(node.expression.name.text)) {
      match = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return match;
}

function propertyNameText(name: ts.PropertyName): string | undefined {
  return ts.isIdentifier(name) || ts.isStringLiteralLike(name)
    ? name.text
    : undefined;
}

function scopeNameResolutionRecord(
  declaration: ts.VariableDeclaration,
  sourceFile: ts.SourceFile,
): ScopeNameResolutionEvidence | undefined {
  if (!ts.isIdentifier(declaration.name)
    || !/(?:bind|captur|closure).*(?:var|ref|name)|(?:var|ref|name).*(?:bind|captur|closure)/iu.test(declaration.name.text)
    || !declaration.initializer) {
    return undefined;
  }
  const initializer = unwrapExpression(declaration.initializer);
  if (!ts.isCallExpression(initializer)
    || !ts.isPropertyAccessExpression(initializer.expression)
    || initializer.expression.name.text !== "filter") {
    return undefined;
  }
  const collection = unwrapExpression(initializer.expression.expression);
  if (!ts.isArrayLiteralExpression(collection)) return undefined;
  const spread = collection.elements.find(ts.isSpreadElement);
  const collectionPath = spread ? memberPath(unwrapExpression(spread.expression)) : undefined;
  if (!spread || !collectionPath || collectionPath.length !== 2 || collectionPath[1] !== "references") {
    return undefined;
  }
  const scopeBinding = collectionPath[0]!;
  const callbackArgument = initializer.arguments[0];
  if (!callbackArgument) return undefined;
  const callback = unwrapExpression(callbackArgument);
  if (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback)) {
    return undefined;
  }
  const parameter = callback.parameters[0];
  if (!parameter || !ts.isIdentifier(parameter.name)) return undefined;
  const referenceParameter = parameter.name.text;
  const ownerLookup = findNameOnlyOwnerLookup(callback, scopeBinding, referenceParameter);
  if (!ownerLookup) return undefined;

  const boundary = enclosingFunction(declaration);
  if (!boundary?.body || !ts.isBlock(boundary.body)) return undefined;
  const scopeDeclaration = findVariableDeclaration(boundary.body, scopeBinding);
  const analysis = scopeDeclaration?.initializer
    ? returnedCallExpression(scopeDeclaration.initializer)
    : undefined;
  const analysisPath = analysis ? memberPath(analysis.expression) : undefined;
  if (!scopeDeclaration?.initializer
    || !analysis
    || analysisPath?.at(-1) !== "get"
    || !analysisPath.slice(0, -1).some((part) => /^(?:map|scopes?)$/iu.test(part))) {
    return undefined;
  }

  return {
    kind: "scope-name-resolution",
    mechanism: "name-only-reference-owner",
    caller: scopeTransformCaller(declaration),
    bindTarget: declaration.name.text,
    scopeBinding,
    analysisExpression: boundedNodeText(scopeDeclaration.initializer, sourceFile),
    referenceCollection: collectionPath.join("."),
    referenceParameter,
    ownerLookup: boundedNodeText(ownerLookup, sourceFile),
    location: locationOf(declaration, sourceFile),
    analysisLocation: locationOf(scopeDeclaration.initializer, sourceFile),
    collectionLocation: locationOf(spread.expression, sourceFile),
    ownerLookupLocation: locationOf(ownerLookup, sourceFile),
  };
}

function findNameOnlyOwnerLookup(
  callback: ts.ArrowFunction | ts.FunctionExpression,
  scopeBinding: string,
  referenceParameter: string,
): ts.CallExpression | undefined {
  let match: ts.CallExpression | undefined;
  const visit = (node: ts.Node): void => {
    if (match || (node !== callback.body && isFunctionBoundary(node))) return;
    if (ts.isCallExpression(node)) {
      const path = memberPath(node.expression);
      const firstArgument = node.arguments[0];
      if (!firstArgument) {
        ts.forEachChild(node, visit);
        return;
      }
      const first = unwrapExpression(firstArgument);
      if (path?.length === 2
        && path[0] === scopeBinding
        && /^(?:find_owner|findOwner)$/u.test(path[1]!)
        && ts.isIdentifier(first)
        && first.text === referenceParameter) {
        match = node;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(callback.body);
  return match;
}

function findVariableDeclaration(body: ts.Block, name: string): ts.VariableDeclaration | undefined {
  let match: ts.VariableDeclaration | undefined;
  const visit = (node: ts.Node): void => {
    if (match || (node !== body && isFunctionBoundary(node))) return;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) {
      match = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return match;
}

function scopeTransformCaller(node: ts.Node): string {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (isFunctionBoundary(current)) {
      const name = functionLikeName(current);
      if (name && /(?:transform|hoist|scope|bind)/iu.test(name)) return name;
    }
    current = current.parent;
  }
  return enclosingCaller(node);
}

const RESOURCE_OWNER_KINDS = new Set(["socket", "connection", "server"] as const);

function resourceLifetimeAssignment(
  assignment: ts.BinaryExpression,
  sourceFile: ts.SourceFile,
  caller: string,
): ResourceLifetimeEvidence | undefined {
  const target = resourceTarget(unwrapParenthesized(assignment.left));
  if (!target) return undefined;
  const value = unwrapParenthesized(assignment.right);
  const base = {
    kind: "resource-lifetime" as const,
    caller,
    resource: target.resource,
    target: target.target,
    ownerKind: target.ownerKind,
    location: locationOf(assignment.left, sourceFile),
  };
  if (isReleaseValue(value)) return { ...base, action: "release" };
  if (!ts.isObjectLiteralExpression(value)) return undefined;
  const retainedNames = requestScopedNames(value);
  if (retainedNames.length === 0) return undefined;
  return { ...base, action: "retain", retainedNames };
}

function resourceLifetimeDelete(
  expression: ts.DeleteExpression,
  sourceFile: ts.SourceFile,
  caller: string,
): ResourceLifetimeEvidence | undefined {
  const target = resourceTarget(unwrapParenthesized(expression.expression));
  if (!target) return undefined;
  return {
    kind: "resource-lifetime",
    action: "release",
    caller,
    resource: target.resource,
    target: target.target,
    ownerKind: target.ownerKind,
    location: locationOf(expression.expression, sourceFile),
  };
}

function resourceTarget(expression: ts.Expression): {
  resource: string;
  target: string;
  ownerKind: ResourceLifetimeEvidence["ownerKind"];
} | undefined {
  const path = memberPath(expression);
  if (!path || path.length < 2) return undefined;
  const ownerIndex = path.findIndex((part) => RESOURCE_OWNER_KINDS.has(part as ResourceLifetimeEvidence["ownerKind"]));
  if (ownerIndex < 0 || ownerIndex === path.length - 1) return undefined;
  const ownerKind = path[ownerIndex] as ResourceLifetimeEvidence["ownerKind"];
  return {
    resource: path.slice(ownerIndex).join("."),
    target: path.join("."),
    ownerKind,
  };
}

function isReleaseValue(expression: ts.Expression): boolean {
  return expression.kind === ts.SyntaxKind.NullKeyword
    || (ts.isIdentifier(expression) && expression.text === "undefined")
    || (ts.isVoidExpression(expression) && expression.expression.kind === ts.SyntaxKind.NumericLiteral);
}

function requestScopedNames(object: ts.ObjectLiteralExpression): string[] {
  const names = new Set<string>();
  const collect = (node: ts.Node): void => {
    if (ts.isIdentifier(node)
      && isValueIdentifierReference(node)
      && /^(?:req|request|reply|res|response)$/iu.test(node.text)) {
      names.add(node.text);
    }
    ts.forEachChild(node, collect);
  };
  for (const property of object.properties) {
    if (ts.isShorthandPropertyAssignment(property)) collect(property.name);
    else if (ts.isPropertyAssignment(property)) collect(property.initializer);
    else if (ts.isSpreadAssignment(property)) collect(property.expression);
  }
  return [...names].sort();
}

function resourceLifetimeListener(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  caller: string,
): ResourceLifetimeEvidence | undefined {
  const path = memberPath(call.expression);
  if (!path || path.at(-1) !== "on") return undefined;
  const ownerIndex = path.findIndex((part) => part === "socket");
  if (ownerIndex < 0 || ownerIndex !== path.length - 2) return undefined;

  const event = call.arguments[0];
  const handler = call.arguments[1];
  if (!event || !ts.isStringLiteralLike(event)
    || !handler || (!ts.isArrowFunction(handler) && !ts.isFunctionExpression(handler))) {
    return undefined;
  }

  const retainedNames = capturedRequestScopedNames(handler);
  const socketName = path[ownerIndex]!;
  if (retainedNames.length === 0 || !hasEnclosingRequestSocketRegistration(call, socketName)) {
    return undefined;
  }

  return {
    kind: "resource-lifetime",
    action: "retain",
    caller,
    resource: `${path.slice(ownerIndex, -1).join(".")}:${event.text}`,
    target: path.join("."),
    ownerKind: "socket",
    retainedNames,
    location: locationOf(call, sourceFile),
  };
}

function abortListenerLifetimeRecords(sourceFile: ts.SourceFile): AbortListenerLifetimeEvidence[] {
  const records: AbortListenerLifetimeEvidence[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isNewExpression(node)
      && directExpressionName(node.expression) === "Promise") {
      const callbackNode = node.arguments?.[0];
      const callback = callbackNode ? unwrapExpression(callbackNode) : undefined;
      if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
        const resolveParameter = callback.parameters[0]?.name;
        const rejectParameter = callback.parameters[1]?.name;
        if (resolveParameter && ts.isIdentifier(resolveParameter)
          && rejectParameter && ts.isIdentifier(rejectParameter)) {
          const record = abortListenerLifetimeRecord(
            node,
            callback,
            resolveParameter.text,
            rejectParameter.text,
            sourceFile,
          );
          if (record) records.push(record);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return records.sort((left, right) => left.location.line - right.location.line);
}

function abortListenerLifetimeRecord(
  promise: ts.NewExpression,
  callback: ts.ArrowFunction | ts.FunctionExpression,
  resolveIdentifier: string,
  rejectIdentifier: string,
  sourceFile: ts.SourceFile,
): AbortListenerLifetimeEvidence | undefined {
  let registration: ts.CallExpression | undefined;
  let target: string | undefined;
  let handler: ts.Expression | undefined;
  const settlementCalls: ts.CallExpression[] = [];
  const inspect = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const path = memberPath(node.expression);
      const event = node.arguments[0];
      if (path?.at(-1) === "addEventListener"
        && event && ts.isStringLiteralLike(event) && event.text === "abort"
        && node.arguments[1]) {
        registration = node;
        target = path.slice(0, -1).join(".");
        handler = node.arguments[1];
      }
      if (ts.isIdentifier(node.expression)
        && (node.expression.text === resolveIdentifier
          || node.expression.text === rejectIdentifier)) {
        settlementCalls.push(node);
      }
    }
    ts.forEachChild(node, inspect);
  };
  inspect(callback.body);
  if (!registration || !target || !handler
    || !handlerReferencesIdentifier(handler, rejectIdentifier)
    || !settlementCalls.some((call) =>
      ts.isIdentifier(call.expression) && call.expression.text === resolveIdentifier)
    || !settlementCalls.some((call) =>
      ts.isIdentifier(call.expression) && call.expression.text === rejectIdentifier)
    || matchingAbortListenerRemoval(callback.body, target, handler, sourceFile)) {
    return undefined;
  }
  return {
    kind: "abort-listener-lifetime",
    caller: enclosingCaller(promise),
    mechanism: "abort-listener-retained-after-settlement",
    target,
    eventName: "abort",
    handlerExpression: boundedNodeText(handler, sourceFile),
    resolveIdentifier,
    rejectIdentifier,
    location: locationOf(registration, sourceFile),
    handlerLocation: locationOf(handler, sourceFile),
    settlementLocations: settlementCalls.map((call) => locationOf(call, sourceFile)),
  };
}

function handlerReferencesIdentifier(handler: ts.Expression, expected: string): boolean {
  const value = unwrapExpression(handler);
  if (ts.isIdentifier(value)) return true;
  if (!ts.isArrowFunction(value) && !ts.isFunctionExpression(value)) return false;
  return referencedNames(value.body, new Set([expected])).includes(expected);
}

function matchingAbortListenerRemoval(
  body: ts.ConciseBody,
  target: string,
  handler: ts.Expression,
  sourceFile: ts.SourceFile,
): boolean {
  const handlerText = boundedNodeText(handler, sourceFile);
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isCallExpression(node)) {
      const path = memberPath(node.expression);
      const event = node.arguments[0];
      const removedHandler = node.arguments[1];
      if (path?.at(-1) === "removeEventListener"
        && path.slice(0, -1).join(".") === target
        && event && ts.isStringLiteralLike(event) && event.text === "abort"
        && removedHandler
        && boundedNodeText(removedHandler, sourceFile) === handlerText) {
        found = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return found;
}

function terminalEventListenerRecords(sourceFile: ts.SourceFile): TerminalEventListenerEvidence[] {
  const records: TerminalEventListenerEvidence[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const record = terminalEventListenerRecord(node, sourceFile);
      if (record) records.push(record);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return records.sort((left, right) =>
    left.location.line - right.location.line
      || left.target.localeCompare(right.target)
      || left.handlerName.localeCompare(right.handlerName));
}

function terminalEventListenerRecord(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
): TerminalEventListenerEvidence | undefined {
  const path = memberPath(call.expression);
  if (!path || path.length < 2 || path.at(-1) !== "addEventListener") return undefined;
  const event = call.arguments[0];
  const handlerReference = call.arguments[1];
  if (!event || !ts.isStringLiteralLike(event) || event.text !== "readystatechange"
    || !handlerReference || !ts.isIdentifier(handlerReference)
    || eventListenerUsesOnce(call.arguments[2])) {
    return undefined;
  }

  const target = path.slice(0, -1).join(".");
  const boundary = enclosingFunctionBlock(call);
  if (!boundary) return undefined;
  const declaration = findVariableDeclaration(boundary.body, handlerReference.text);
  if (!declaration?.initializer || declaration.getStart(sourceFile) > call.getStart(sourceFile)) return undefined;
  const initializer = unwrapExpression(declaration.initializer);
  if (!ts.isArrowFunction(initializer) && !ts.isFunctionExpression(initializer)) return undefined;
  const terminal = terminalReadyStateCondition(initializer, target, sourceFile);
  if (!terminal
    || hasMatchingEventListenerRemoval(
      boundary.body,
      target,
      event.text,
      handlerReference.text,
    )) {
    return undefined;
  }

  return {
    kind: "terminal-event-listener",
    mechanism: "terminal-listener-retained",
    caller: boundary.caller,
    target,
    eventName: "readystatechange",
    handlerName: handlerReference.text,
    terminalCondition: boundedNodeText(terminal, sourceFile),
    terminalProperty: "readyState",
    terminalValue: "4",
    location: locationOf(call, sourceFile),
    handlerLocation: locationOf(declaration, sourceFile),
    terminalLocation: locationOf(terminal, sourceFile),
  };
}

function eventListenerUsesOnce(expression: ts.Expression | undefined): boolean {
  if (!expression) return false;
  const value = unwrapExpression(expression);
  if (!ts.isObjectLiteralExpression(value)) return false;
  return value.properties.some((property) =>
    ts.isPropertyAssignment(property)
      && methodNameText(property.name) === "once"
      && unwrapExpression(property.initializer).kind === ts.SyntaxKind.TrueKeyword);
}

function enclosingFunctionBlock(node: ts.Node): { body: ts.Block; caller: string } | undefined {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (isFunctionBoundary(current) && current.body && ts.isBlock(current.body)) {
      return {
        body: current.body,
        caller: functionLikeName(current) ?? enclosingCaller(current),
      };
    }
    current = current.parent;
  }
  return undefined;
}

function terminalReadyStateCondition(
  handler: ts.ArrowFunction | ts.FunctionExpression,
  target: string,
  sourceFile: ts.SourceFile,
): ts.Expression | undefined {
  let match: ts.Expression | undefined;
  const visit = (node: ts.Node): void => {
    if (match || (node !== handler && isFunctionBoundary(node))) return;
    if (ts.isIfStatement(node) && isTerminalReadyStateExpression(node.expression, target)) {
      match = node.expression;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(handler);
  return match && boundedNodeText(match, sourceFile) ? match : undefined;
}

function isTerminalReadyStateExpression(expression: ts.Expression, target: string): boolean {
  const value = unwrapExpression(expression);
  if (!ts.isBinaryExpression(value)
    || value.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken) {
    return false;
  }
  return (isReadyStateMember(value.left, target) && isReadyStateDoneValue(value.right))
    || (isReadyStateDoneValue(value.left) && isReadyStateMember(value.right, target));
}

function isReadyStateMember(expression: ts.Expression, target: string): boolean {
  return memberPath(unwrapExpression(expression))?.join(".") === `${target}.readyState`;
}

function isReadyStateDoneValue(expression: ts.Expression): boolean {
  const value = unwrapExpression(expression);
  return ts.isNumericLiteral(value) && value.text === "4";
}

function hasMatchingEventListenerRemoval(
  body: ts.Block,
  target: string,
  eventName: string,
  handlerName: string,
): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isCallExpression(node)) {
      const path = memberPath(node.expression);
      const event = node.arguments[0];
      const handler = node.arguments[1];
      if (path?.at(-1) === "removeEventListener"
        && path.slice(0, -1).join(".") === target
        && event && ts.isStringLiteralLike(event) && event.text === eventName
        && handler && ts.isIdentifier(handler) && handler.text === handlerName) {
        found = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return found;
}

function capturedRequestScopedNames(handler: ts.ArrowFunction | ts.FunctionExpression): string[] {
  const declared = new Set<string>();
  for (const parameter of handler.parameters) collectBindingNames(parameter.name, declared);

  const names = new Set<string>();
  const collect = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node)) collectBindingNames(node.name, declared);
    if (ts.isIdentifier(node)
      && isValueIdentifierReference(node)
      && /^(?:req|request|reply|res|response)$/iu.test(node.text)) {
      names.add(node.text);
    }
    ts.forEachChild(node, collect);
  };
  collect(handler.body);
  for (const name of declared) names.delete(name);
  return [...names].sort();
}

function isValueIdentifierReference(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return false;
  if ((ts.isVariableDeclaration(parent)
    || ts.isParameter(parent)
    || ts.isBindingElement(parent)
    || ts.isFunctionDeclaration(parent)
    || ts.isFunctionExpression(parent)
    || ts.isMethodDeclaration(parent)
    || ts.isPropertyDeclaration(parent)
    || ts.isClassDeclaration(parent))
    && parent.name === node) {
    return false;
  }
  return true;
}

function collectBindingNames(name: ts.BindingName, target: Set<string>): void {
  if (ts.isIdentifier(name)) {
    target.add(name.text);
    return;
  }
  for (const element of name.elements) {
    if (!ts.isOmittedExpression(element)) collectBindingNames(element.name, target);
  }
}

function hasEnclosingRequestSocketRegistration(call: ts.CallExpression, socketName: string): boolean {
  let current: ts.Node | undefined = call.parent;
  while (current) {
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      const parent: ts.Node = current.parent;
      if (ts.isCallExpression(parent) && parent.arguments.includes(current)) {
        const path = memberPath(parent.expression);
        const event = parent.arguments[0];
        const hasSocketParameter = current.parameters.some(
          (parameter) => ts.isIdentifier(parameter.name) && parameter.name.text === socketName,
        );
        if (path && path.at(-1) === "on"
          && /^(?:req|request)$/iu.test(path[0] ?? "")
          && event && ts.isStringLiteralLike(event) && event.text === "socket"
          && hasSocketParameter) {
          return true;
        }
      }
    }
    current = current.parent;
  }
  return false;
}

function optionPropagationRecords(
  object: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  caller: string,
): OptionPropagationEvidence[] {
  const records: OptionPropagationEvidence[] = [];
  const spreadSources: string[] = [];

  for (const property of object.properties) {
    if (ts.isSpreadAssignment(property)) {
      const source = memberPath(unwrapParenthesized(property.expression))?.join(".");
      if (source) spreadSources.push(source);
      continue;
    }
    if (spreadSources.length === 0) continue;

    const override = optionOverride(property, sourceFile);
    if (!override) continue;
    const spreadSource = spreadSources.at(-1)!;
    const callback = optionCallbackContext(object, override.overrideSource, sourceFile);
    records.push({
      kind: "option-override",
      caller,
      property: override.property,
      spreadSource,
      overrideSource: override.overrideSource,
      overrideExpression: override.overrideExpression,
      overrideKind: override.overrideKind,
      ...(override.fallbackOperator ? { fallbackOperator: override.fallbackOperator } : {}),
      ...(override.fallbackTarget ? { fallbackTarget: override.fallbackTarget } : {}),
      preservesSpreadValue: override.fallbackTarget === `${spreadSource}.${override.property}`,
      ...callback,
      location: locationOf(property, sourceFile),
      objectLocation: locationOf(object, sourceFile),
    });
  }
  return records;
}

function defaultOptionOverrideRecords(
  object: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  caller: string,
): DefaultOptionOverrideEvidence[] {
  const records: DefaultOptionOverrideEvidence[] = [];
  const spreads: Array<{ source: string; location: AstLocation }> = [];
  for (const property of object.properties) {
    if (ts.isSpreadAssignment(property)) {
      const spreadSource = memberPath(unwrapExpression(property.expression))?.join(".");
      if (spreadSource) {
        spreads.push({
          source: spreadSource,
          location: locationOf(property, sourceFile),
        });
      }
      continue;
    }
    const spread = spreads.at(-1);
    const spreadSource = spread?.source;
    if (!spreadSource
      || !/(?:options?|config)(?:\.|$)/iu.test(spreadSource)
      || !ts.isPropertyAssignment(property)) {
      continue;
    }
    const propertyName = methodNameText(property.name);
    const initializer = unwrapExpression(property.initializer);
    const defaultExpression = boundedNodeText(initializer, sourceFile);
    if (!propertyName
      || ts.isObjectLiteralExpression(initializer)
      || !/(?:default|baseline)/iu.test(defaultExpression)
      || memberPath(initializer)?.join(".") === `${spreadSource}.${propertyName}`
      || preservesSpreadPropertyInArrayMerge(
        object,
        initializer,
        spreadSource,
        propertyName,
      )) {
      continue;
    }
    records.push({
      kind: "default-option-override",
      caller,
      mechanism: "default-after-user-options",
      property: propertyName,
      spreadSource,
      defaultExpression,
      location: locationOf(property, sourceFile),
      spreadLocation: spread!.location,
      objectLocation: locationOf(object, sourceFile),
    });
  }
  return records;
}

function preservesSpreadPropertyInArrayMerge(
  object: ts.ObjectLiteralExpression,
  initializer: ts.Expression,
  spreadSource: string,
  propertyName: string,
): boolean {
  if (!ts.isArrayLiteralExpression(initializer)) return false;
  const expectedPath = `${spreadSource}.${propertyName}`;
  const boundary = enclosingFunctionBlock(object);

  return initializer.elements.some((element) => {
    if (!ts.isSpreadElement(element)) return false;
    const spreadValue = unwrapExpression(element.expression);
    if (memberPath(spreadValue)?.join(".") === expectedPath) return true;
    if (!boundary || !ts.isIdentifier(spreadValue)) return false;

    const declaration = findVariableDeclaration(boundary.body, spreadValue.text);
    return Boolean(
      declaration?.initializer
      && declaration.getStart() < object.getStart()
      && containsExactMemberPath(declaration.initializer, expectedPath),
    );
  });
}

function containsExactMemberPath(node: ts.Node, expectedPath: string): boolean {
  let found = false;
  const visit = (candidate: ts.Node): void => {
    if (found) return;
    if ((ts.isIdentifier(candidate)
      || ts.isPropertyAccessExpression(candidate)
      || ts.isElementAccessExpression(candidate))
      && memberPath(candidate)?.join(".") === expectedPath) {
      found = true;
      return;
    }
    ts.forEachChild(candidate, visit);
  };
  visit(node);
  return found;
}

function collectTruthyBooleanDefaults(sourceFile: ts.SourceFile): Set<string> {
  const defaults = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)
      || !(statement.declarationList.flags & ts.NodeFlags.Const)) {
      continue;
    }
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)
        || !declaration.initializer
        || !ts.isObjectLiteralExpression(unwrapParenthesized(declaration.initializer))) {
        continue;
      }
      const object = unwrapParenthesized(declaration.initializer) as ts.ObjectLiteralExpression;
      for (const property of object.properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        const name = methodNameText(property.name);
        if (name && unwrapParenthesized(property.initializer).kind === ts.SyntaxKind.TrueKeyword) {
          defaults.add(`${declaration.name.text}.${name}`);
        }
      }
    }
  }
  return defaults;
}

function optionFalsyDefaultRecord(
  expression: ts.BinaryExpression,
  truthyBooleanDefaults: ReadonlySet<string>,
  sourceFile: ts.SourceFile,
  caller: string,
): OptionFalsyDefaultEvidence | undefined {
  if (expression.operatorToken.kind !== ts.SyntaxKind.BarBarToken) return undefined;
  const option = unwrapParenthesized(expression.left);
  const fallback = unwrapParenthesized(expression.right);
  const optionPath = memberPath(option);
  if (!optionPath || optionPath.length < 2) return undefined;
  const property = optionPath.at(-1)!;
  const optionContainerPath = optionPath.slice(0, -1);
  if (!/^(?:options?|opts)$/iu.test(optionContainerPath.at(-1) ?? "")) return undefined;

  const fallbackPath = memberPath(fallback);
  const literalTrue = fallback.kind === ts.SyntaxKind.TrueKeyword;
  const declaredTruthyDefault = fallbackPath?.at(-1) === property
    && truthyBooleanDefaults.has(fallbackPath.join("."));
  if (!literalTrue && !declaredTruthyDefault) return undefined;

  return {
    kind: "option-falsy-default",
    caller,
    mechanism: "truthy-default-overrides-falsy",
    property,
    optionContainer: optionContainerPath.join("."),
    optionExpression: boundedNodeText(option, sourceFile),
    defaultExpression: boundedNodeText(fallback, sourceFile),
    defaultSource: literalTrue ? "literal" : fallbackPath!.slice(0, -1).join("."),
    defaultValue: true,
    location: locationOf(expression, sourceFile),
    optionLocation: locationOf(option, sourceFile),
    defaultLocation: locationOf(fallback, sourceFile),
  };
}

function requestSignalForwardingRecords(sourceFile: ts.SourceFile): RequestSignalForwardingEvidence[] {
  if (hasLocalValueBinding(sourceFile, "Request")) return [];
  const records: RequestSignalForwardingEvidence[] = [];
  const visit = (node: ts.Node): void => {
    if (isFunctionBoundary(node) && node.body && ts.isBlock(node.body)) {
      records.push(...requestSignalForwardingRecordsForFunction(node, sourceFile));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return records.sort((left, right) =>
    left.location.line - right.location.line
      || left.caller.localeCompare(right.caller)
      || left.requestBinding.localeCompare(right.requestBinding));
}

function requestSignalForwardingRecordsForFunction(
  fn: ts.FunctionLikeDeclaration,
  sourceFile: ts.SourceFile,
): RequestSignalForwardingEvidence[] {
  if (!fn.body || !ts.isBlock(fn.body)) return [];
  const parameterNames = new Set(fn.parameters.flatMap((parameter) =>
    ts.isIdentifier(parameter.name) ? [parameter.name.text] : []));
  if (parameterNames.size < 2) return [];

  const declarations: ts.VariableDeclaration[] = [];
  const returns: ts.ReturnStatement[] = [];
  const collect = (node: ts.Node): void => {
    if (node !== fn.body && isFunctionBoundary(node)) return;
    if (ts.isVariableDeclaration(node)) declarations.push(node);
    if (ts.isReturnStatement(node)) returns.push(node);
    ts.forEachChild(node, collect);
  };
  collect(fn.body);

  const records: RequestSignalForwardingEvidence[] = [];
  for (const declaration of declarations) {
    if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
    const initializer = unwrapExpression(declaration.initializer);
    if (!ts.isNewExpression(initializer)
      || !ts.isIdentifier(initializer.expression)
      || initializer.expression.text !== "Request"
      || initializer.arguments?.length !== 2) {
      continue;
    }
    const input = unwrapExpression(initializer.arguments[0]!);
    const init = unwrapExpression(initializer.arguments[1]!);
    if (!ts.isIdentifier(input) || !parameterNames.has(input.text)
      || !ts.isIdentifier(init) || !parameterNames.has(init.text)) {
      continue;
    }

    for (const statement of returns) {
      const record = requestSignalForwardingRecord({
        statement,
        requestBinding: declaration.name.text,
        inputParameter: input.text,
        initParameter: init.text,
        requestExpression: boundedNodeText(initializer, sourceFile),
        requestLocation: locationOf(declaration, sourceFile),
        caller: functionLikeName(fn) ?? enclosingCaller(fn),
        sourceFile,
      });
      if (record) records.push(record);
    }
  }
  return records;
}

function requestSignalForwardingRecord(input: {
  statement: ts.ReturnStatement;
  requestBinding: string;
  inputParameter: string;
  initParameter: string;
  requestExpression: string;
  requestLocation: AstLocation;
  caller: string;
  sourceFile: ts.SourceFile;
}): RequestSignalForwardingEvidence | undefined {
  if (!input.statement.expression) return undefined;
  const returned = unwrapExpression(input.statement.expression);
  if (!ts.isObjectLiteralExpression(returned)) return undefined;
  const optionsProperty = returned.properties.find((property) =>
    ts.isPropertyAssignment(property) && methodNameText(property.name) === "options");
  if (!optionsProperty || !ts.isPropertyAssignment(optionsProperty)) return undefined;
  const options = unwrapExpression(optionsProperty.initializer);
  if (!ts.isObjectLiteralExpression(options)) return undefined;
  const spreadsCallerInit = options.properties.some((property) =>
    ts.isSpreadAssignment(property)
      && ts.isIdentifier(unwrapExpression(property.expression))
      && (unwrapExpression(property.expression) as ts.Identifier).text === input.initParameter);
  if (!spreadsCallerInit) return undefined;

  const signalProperty = options.properties.find((property) =>
    ts.isPropertyAssignment(property) && methodNameText(property.name) === "signal");
  if (!signalProperty || !ts.isPropertyAssignment(signalProperty)) return undefined;
  const signalExpression = unwrapExpression(signalProperty.initializer);
  if (memberPath(signalExpression)?.join(".") !== `${input.requestBinding}.signal`) return undefined;

  const normalizedMembers = requestMembersReferencedByOptions(
    options,
    input.requestBinding,
    signalProperty,
  );
  if (normalizedMembers.length < 2) return undefined;
  return {
    kind: "request-signal-forwarding",
    caller: input.caller,
    mechanism: "derived-request-signal-forwarded",
    requestBinding: input.requestBinding,
    inputParameter: input.inputParameter,
    initParameter: input.initParameter,
    requestExpression: input.requestExpression,
    forwardedSignal: boundedNodeText(signalExpression, input.sourceFile),
    outputPath: "options.signal",
    normalizedMembers,
    location: locationOf(signalProperty, input.sourceFile),
    requestLocation: input.requestLocation,
    outputLocation: locationOf(options, input.sourceFile),
  };
}

function requestMembersReferencedByOptions(
  options: ts.ObjectLiteralExpression,
  requestBinding: string,
  signalProperty: ts.PropertyAssignment,
): string[] {
  const members = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (node !== options && isFunctionBoundary(node)) return;
    if (node === signalProperty) return;
    if (ts.isPropertyAccessExpression(node)) {
      const path = memberPath(node);
      if (path?.[0] === requestBinding && path.length >= 2) {
        members.add(path.slice(1).join("."));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(options);
  return [...members].sort();
}

function optionOverride(
  property: ts.ObjectLiteralElementLike,
  sourceFile: ts.SourceFile,
): Pick<
  OptionPropagationEvidence,
  "property" | "overrideSource" | "overrideExpression" | "overrideKind" | "fallbackOperator" | "fallbackTarget"
> | undefined {
  if (ts.isShorthandPropertyAssignment(property)) {
    return {
      property: property.name.text,
      overrideSource: property.name.text,
      overrideExpression: property.name.text,
      overrideKind: "shorthand",
    };
  }
  if (!ts.isPropertyAssignment(property)) return undefined;
  const propertyName = methodNameText(property.name);
  if (!propertyName) return undefined;
  const initializer = unwrapParenthesized(property.initializer);
  if (ts.isIdentifier(initializer) && initializer.text === propertyName) {
    return {
      property: propertyName,
      overrideSource: initializer.text,
      overrideExpression: boundedNodeText(initializer, sourceFile),
      overrideKind: "direct",
    };
  }
  if (!ts.isBinaryExpression(initializer)) return undefined;
  const operator = initializer.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
    ? "nullish"
    : initializer.operatorToken.kind === ts.SyntaxKind.BarBarToken
      ? "logical-or"
      : undefined;
  if (!operator) return undefined;
  const left = unwrapParenthesized(initializer.left);
  if (!ts.isIdentifier(left) || left.text !== propertyName) return undefined;
  return {
    property: propertyName,
    overrideSource: left.text,
    overrideExpression: boundedNodeText(initializer, sourceFile),
    overrideKind: "fallback",
    fallbackOperator: operator,
    fallbackTarget: memberPath(unwrapParenthesized(initializer.right))?.join("."),
  };
}

function optionCallbackContext(
  object: ts.ObjectLiteralExpression,
  overrideSource: string,
  sourceFile: ts.SourceFile,
): Pick<OptionPropagationEvidence, "callbackParameter" | "callbackProperty" | "callbackOwner"> {
  let current: ts.Node | undefined = object.parent;
  while (current) {
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      const parameter = current.parameters.find(
        (entry) => ts.isIdentifier(entry.name) && entry.name.text === overrideSource,
      );
      if (!parameter || !ts.isIdentifier(parameter.name)) return {};
      const result: Pick<OptionPropagationEvidence, "callbackParameter" | "callbackProperty" | "callbackOwner"> = {
        callbackParameter: parameter.name.text,
      };
      const property = current.parent;
      if (!ts.isPropertyAssignment(property) || property.initializer !== current) return result;
      const callbackProperty = methodNameText(property.name);
      if (callbackProperty) result.callbackProperty = callbackProperty;
      const container = property.parent;
      const call = ts.isObjectLiteralExpression(container) ? container.parent : undefined;
      if (call && ts.isCallExpression(call) && call.arguments.includes(container)) {
        result.callbackOwner = boundedNodeText(call.expression, sourceFile);
      }
      return result;
    }
    if (isFunctionBoundary(current)) return {};
    current = current.parent;
  }
  return {};
}

function classifyThrownExpression(expression: ts.Expression | undefined): {
  errorName?: string;
  errorIdentity?: string;
  expressionKind: ErrorControlFlowEvidence["expressionKind"];
} {
  if (!expression) return { expressionKind: "other" };
  if (ts.isIdentifier(expression)) {
    return { errorName: expression.text, errorIdentity: expression.text, expressionKind: "identifier" };
  }
  if (ts.isNewExpression(expression)) {
    const errorIdentity = expression.expression.getText().trim();
    return { ...(errorIdentity ? { errorIdentity } : {}), expressionKind: "constructor" };
  }
  if (ts.isObjectLiteralExpression(expression)) {
    const errorIdentity = stringPropertyValue(expression, "name");
    return { ...(errorIdentity ? { errorIdentity } : {}), expressionKind: "object" };
  }
  return { expressionKind: "other" };
}

const PROMISE_BRIDGE_SUCCESS_EVENTS = new Set([
  "connect",
  "data",
  "end",
  "entry",
  "exit",
  "finish",
  "load",
  "message",
  "open",
  "ready",
  "response",
]);

type PromiseEventSubscription = {
  emitter: string;
  eventName: string;
  resolves: boolean;
  rejects: boolean;
  location: AstLocation;
};

function promiseEventErrorBridgeRecords(sourceFile: ts.SourceFile): PromiseEventErrorBridgeEvidence[] {
  if (hasLocalPromiseBinding(sourceFile)) return [];
  const records: PromiseEventErrorBridgeEvidence[] = [];
  const visit = (node: ts.Node, caller: string): void => {
    let childCaller = caller;
    if (isFunctionBoundary(node)) {
      childCaller = functionLikeName(node) ?? caller;
    }
    if (ts.isNewExpression(node)) {
      records.push(...promiseEventErrorBridgeRecord(node, sourceFile, childCaller));
    }
    ts.forEachChild(node, (child) => visit(child, childCaller));
  };
  visit(sourceFile, "__module__");
  return records.sort((left, right) =>
    left.location.line - right.location.line
      || left.emitter.localeCompare(right.emitter));
}

function promiseEventErrorBridgeRecord(
  expression: ts.NewExpression,
  sourceFile: ts.SourceFile,
  caller: string,
): PromiseEventErrorBridgeEvidence[] {
  if (!ts.isIdentifier(expression.expression) || expression.expression.text !== "Promise") return [];
  const executor = expression.arguments?.[0];
  if (!executor || (!ts.isArrowFunction(executor) && !ts.isFunctionExpression(executor))) return [];
  const resolveParameter = executor.parameters[0]?.name;
  const rejectParameter = executor.parameters[1]?.name;
  if (!resolveParameter || !rejectParameter
    || !ts.isIdentifier(resolveParameter) || !ts.isIdentifier(rejectParameter)
    || resolveParameter.text === rejectParameter.text) {
    return [];
  }

  const rejectionLocation = firstIdentifierCallLocation(
    executor.body,
    rejectParameter.text,
    sourceFile,
  );
  if (!rejectionLocation) return [];
  const subscriptions = promiseEventSubscriptions(
    executor.body,
    resolveParameter.text,
    rejectParameter.text,
    sourceFile,
  );
  const byEmitter = new Map<string, PromiseEventSubscription[]>();
  for (const subscription of subscriptions) {
    const current = byEmitter.get(subscription.emitter) ?? [];
    current.push(subscription);
    byEmitter.set(subscription.emitter, current);
  }

  const records: PromiseEventErrorBridgeEvidence[] = [];
  for (const [emitter, emitterSubscriptions] of byEmitter) {
    const successSubscriptions = emitterSubscriptions.filter((subscription) =>
      subscription.eventName !== "error"
      && PROMISE_BRIDGE_SUCCESS_EVENTS.has(subscription.eventName)
      && subscription.resolves);
    if (successSubscriptions.length === 0) continue;
    const forwardsError = emitterSubscriptions.some((subscription) =>
      subscription.eventName === "error" && subscription.rejects);
    if (forwardsError) continue;
    records.push({
      kind: "promise-event-error-bridge",
      caller,
      mechanism: "unforwarded-emitter-error",
      emitter,
      successEvents: [...new Set(successSubscriptions.map((subscription) => subscription.eventName))].sort(),
      rejectIdentifier: rejectParameter.text,
      location: locationOf(expression, sourceFile),
      successListenerLocations: successSubscriptions.map((subscription) => subscription.location),
      rejectionLocation,
    });
  }
  return records;
}

function promiseEventSubscriptions(
  node: ts.Node,
  resolveIdentifier: string,
  rejectIdentifier: string,
  sourceFile: ts.SourceFile,
): PromiseEventSubscription[] {
  const subscriptions: PromiseEventSubscription[] = [];
  const visit = (current: ts.Node): void => {
    if (current !== node && ts.isNewExpression(current)
      && ts.isIdentifier(current.expression) && current.expression.text === "Promise") {
      return;
    }
    if (ts.isCallExpression(current)) {
      const path = memberPath(current.expression);
      const method = path?.at(-1);
      const eventArgument = current.arguments[0];
      const listener = current.arguments[1];
      if (path && path.length >= 2
        && (method === "on" || method === "once")
        && eventArgument && ts.isStringLiteralLike(eventArgument)
        && listener) {
        subscriptions.push({
          emitter: path.slice(0, -1).join("."),
          eventName: eventArgument.text,
          resolves: expressionInvokesIdentifier(listener, resolveIdentifier),
          rejects: expressionInvokesIdentifier(listener, rejectIdentifier),
          location: locationOf(current, sourceFile),
        });
      }
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return subscriptions;
}

function expressionInvokesIdentifier(node: ts.Node, identifier: string): boolean {
  if (ts.isIdentifier(node) && node.text === identifier) return true;
  let invoked = false;
  const visit = (current: ts.Node): void => {
    if (invoked) return;
    if (isFunctionBoundary(current)
      && current.parameters.some((parameter) => bindingContainsName(parameter.name, identifier))) {
      return;
    }
    if (current !== node && ts.isNewExpression(current)
      && ts.isIdentifier(current.expression) && current.expression.text === "Promise") {
      return;
    }
    if (ts.isCallExpression(current)
      && ts.isIdentifier(current.expression)
      && current.expression.text === identifier) {
      invoked = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return invoked;
}

function firstIdentifierCallLocation(
  node: ts.Node,
  identifier: string,
  sourceFile: ts.SourceFile,
): AstLocation | undefined {
  let result: AstLocation | undefined;
  const visit = (current: ts.Node): void => {
    if (result) return;
    if (isFunctionBoundary(current)
      && current.parameters.some((parameter) => bindingContainsName(parameter.name, identifier))) {
      return;
    }
    if (current !== node && ts.isNewExpression(current)
      && ts.isIdentifier(current.expression) && current.expression.text === "Promise") {
      return;
    }
    if (ts.isCallExpression(current)
      && ts.isIdentifier(current.expression)
      && current.expression.text === identifier) {
      result = locationOf(current, sourceFile);
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return result;
}

function errorReasonPropagationRecord(
  expression: ts.NewExpression,
  sourceFile: ts.SourceFile,
  caller: string,
): ErrorReasonPropagationEvidence | undefined {
  const constructorPath = memberPath(expression.expression);
  const errorIdentity = constructorPath?.at(-1);
  if (!errorIdentity || !/(?:Error|Exception)$/u.test(errorIdentity)) return undefined;
  const message = expression.arguments?.[0];
  const options = expression.arguments?.[1];
  if (!message) return undefined;
  const messageValue = unwrapExpression(message);
  if (!ts.isIdentifier(messageValue) || messageValue.text !== "undefined") {
    return undefined;
  }
  if (!options) return undefined;
  const optionsValue = unwrapExpression(options);
  if (!ts.isObjectLiteralExpression(optionsValue)) return undefined;
  const cause = objectPropertyExpression(optionsValue, "cause");
  if (!cause) return undefined;
  const causeValue = unwrapExpression(cause);
  if (ts.isIdentifier(causeValue) && causeValue.text === "undefined") {
    return undefined;
  }
  return {
    kind: "error-reason",
    caller,
    mechanism: "cause-with-default-message",
    errorIdentity,
    messageExpression: boundedNodeText(message, sourceFile),
    causeExpression: boundedNodeText(cause, sourceFile),
    location: locationOf(expression, sourceFile),
    messageLocation: locationOf(message, sourceFile),
    causeLocation: locationOf(cause, sourceFile),
  };
}

function objectPropertyExpression(
  object: ts.ObjectLiteralExpression,
  propertyName: string,
): ts.Expression | undefined {
  for (const property of object.properties) {
    if (ts.isPropertyAssignment(property) && methodNameText(property.name) === propertyName) {
      return property.initializer;
    }
    if (ts.isShorthandPropertyAssignment(property) && property.name.text === propertyName) {
      return property.name;
    }
  }
  return undefined;
}

function stringPropertyValue(object: ts.ObjectLiteralExpression, propertyName: string): string | undefined {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property) || methodNameText(property.name) !== propertyName) continue;
    if (ts.isStringLiteralLike(property.initializer)) return property.initializer.text;
  }
  return undefined;
}

function enclosingErrorGuards(node: ts.ThrowStatement, sourceFile: ts.SourceFile): ErrorControlFlowGuard[] {
  const guards: ErrorControlFlowGuard[] = [];
  let current: ts.Node = node;
  while (current.parent) {
    const parent = current.parent;
    if (isFunctionBoundary(parent)) break;
    if (ts.isIfStatement(parent)) {
      const branch = branchContainingNode(parent, node);
      if (branch) {
        const expression = unwrapParenthesized(parent.expression);
        const operator = booleanOperator(expression);
        guards.push({
          kind: "if",
          expression: boundedNodeText(expression, sourceFile),
          operator,
          terms: booleanTerms(expression, operator).map((term) => boundedNodeText(term, sourceFile)),
          polarity: branch,
          location: locationOf(parent, sourceFile),
        });
      }
    }
    current = parent;
  }
  return guards.reverse();
}

function branchContainingNode(
  statement: ts.IfStatement,
  node: ts.Node,
): ErrorControlFlowGuard["polarity"] | undefined {
  if (containsPosition(statement.thenStatement, node)) return "when-true";
  if (statement.elseStatement && containsPosition(statement.elseStatement, node)) return "when-false";
  return undefined;
}

function containsPosition(container: ts.Node, node: ts.Node): boolean {
  return container.getFullStart() <= node.getFullStart() && container.getEnd() >= node.getEnd();
}

function isFunctionBoundary(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return ts.isFunctionDeclaration(node)
    || ts.isFunctionExpression(node)
    || ts.isArrowFunction(node)
    || ts.isMethodDeclaration(node)
    || ts.isConstructorDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node);
}

function unwrapParenthesized(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return current;
}

function booleanOperator(expression: ts.Expression): ErrorControlFlowGuard["operator"] {
  if (!ts.isBinaryExpression(expression)) return "single";
  if (expression.operatorToken.kind === ts.SyntaxKind.BarBarToken) return "or";
  if (expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) return "and";
  return "single";
}

function booleanTerms(
  expression: ts.Expression,
  operator: ErrorControlFlowGuard["operator"],
): ts.Expression[] {
  if (operator === "single") return [expression];
  const token = operator === "or" ? ts.SyntaxKind.BarBarToken : ts.SyntaxKind.AmpersandAmpersandToken;
  if (!ts.isBinaryExpression(expression) || expression.operatorToken.kind !== token) return [expression];
  return [
    ...booleanTerms(unwrapParenthesized(expression.left), operator),
    ...booleanTerms(unwrapParenthesized(expression.right), operator),
  ];
}

function boundedNodeText(node: ts.Node, sourceFile: ts.SourceFile): string {
  const text = node.getText(sourceFile).replace(/\s+/gu, " ").trim();
  return text.length <= 320 ? text : `${text.slice(0, 317)}...`;
}

function memberPath(expression: ts.Expression): string[] | undefined {
  if (ts.isIdentifier(expression)) return [expression.text];
  if (expression.kind === ts.SyntaxKind.ThisKeyword) return ["this"];
  if (ts.isPropertyAccessExpression(expression)) {
    const base = memberPath(expression.expression);
    return base ? [...base, expression.name.text] : undefined;
  }
  if (ts.isElementAccessExpression(expression)
    && expression.argumentExpression
    && ts.isStringLiteralLike(expression.argumentExpression)) {
    const base = memberPath(expression.expression);
    return base ? [...base, expression.argumentExpression.text] : undefined;
  }
  return undefined;
}

function callTarget(expression: ts.Expression): Pick<AstCallRecord, "callee" | "receiver"> | undefined {
  if (ts.isIdentifier(expression)) return { callee: expression.text };
  if (expression.kind === ts.SyntaxKind.SuperKeyword) return { callee: "constructor", receiver: "super" };
  if (ts.isPropertyAccessExpression(expression)) {
    const receiver = expression.expression.kind === ts.SyntaxKind.ThisKeyword
      ? "this"
      : ts.isIdentifier(expression.expression)
        ? expression.expression.text
        : undefined;
    return receiver ? { receiver, callee: expression.name.text } : undefined;
  }
  if (ts.isElementAccessExpression(expression)
    && expression.argumentExpression
    && ts.isStringLiteralLike(expression.argumentExpression)) {
    const receiver = expression.expression.kind === ts.SyntaxKind.ThisKeyword
      ? "this"
      : ts.isIdentifier(expression.expression)
        ? expression.expression.text
        : undefined;
    return receiver ? { receiver, callee: expression.argumentExpression.text } : undefined;
  }
  return undefined;
}

function collectImportSpecifiers(
  node: ts.ImportDeclaration,
  target: string,
  sourceFile: ts.SourceFile,
  result: AstExtractionResult,
): void {
  const clause = node.importClause;
  const location = locationOf(node, sourceFile);

  if (!clause) {
    // `import "side-effect"` is still a file-to-file edge.
    result.importSpecifiers.push({
      target,
      name: "*",
      local: "*",
      specifierKind: "side-effect",
      typeOnly: false,
      location,
    });
    return;
  }

  const clauseTypeOnly = clause.isTypeOnly === true;

  if (clause.name) {
    result.importSpecifiers.push({
      target,
      name: "default",
      local: clause.name.text,
      specifierKind: "default",
      typeOnly: clauseTypeOnly,
      location: locationOf(clause.name, sourceFile),
    });
  }

  if (clause.namedBindings) {
    if (ts.isNamespaceImport(clause.namedBindings)) {
      result.importSpecifiers.push({
        target,
        name: "*",
        local: clause.namedBindings.name.text,
        specifierKind: "namespace",
        typeOnly: clauseTypeOnly,
        location: locationOf(clause.namedBindings.name, sourceFile),
      });
    } else if (ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) {
        result.importSpecifiers.push({
          target,
          name: element.propertyName?.text ?? element.name.text,
          local: element.name.text,
          specifierKind: "named",
          typeOnly: clauseTypeOnly || element.isTypeOnly === true,
          location: locationOf(element.name, sourceFile),
        });
      }
    }
  }
}

function handleExportDeclaration(
  node: ts.ExportDeclaration,
  sourceFile: ts.SourceFile,
  result: AstExtractionResult,
): void {
  const moduleSpecifier = node.moduleSpecifier
    ? moduleSpecifierText(node.moduleSpecifier)
    : undefined;
  const typeOnly = node.isTypeOnly === true;

  // `export * from "..."`
  if (!node.exportClause && moduleSpecifier) {
    result.exports.push({
      name: "*",
      exportKind: "namespace",
      syntaxKind: ts.SyntaxKind[node.kind],
      declarationKeyword: "namespace",
      isDefault: false,
      location: locationOf(node, sourceFile),
      moduleSpecifier,
    });
    result.reexports.push({
      target: moduleSpecifier,
      name: "*",
      exportedAs: "*",
      reexportKind: "star",
      typeOnly,
      location: locationOf(node, sourceFile),
    });
    return;
  }

  // `export * as alias from "..."`
  if (node.exportClause && ts.isNamespaceExport(node.exportClause)) {
    result.exports.push({
      name: node.exportClause.name.text,
      exportKind: "namespace",
      syntaxKind: ts.SyntaxKind[node.kind],
      declarationKeyword: "namespace",
      isDefault: false,
      location: locationOf(node.exportClause.name, sourceFile),
      moduleSpecifier,
    });
    if (moduleSpecifier) {
      result.reexports.push({
        target: moduleSpecifier,
        name: "*",
        exportedAs: node.exportClause.name.text,
        reexportKind: "namespace",
        typeOnly,
        location: locationOf(node.exportClause.name, sourceFile),
      });
    }
    return;
  }

  // `export { a, b as c }` and `export { a } from "./y"`
  if (node.exportClause && ts.isNamedExports(node.exportClause)) {
    for (const element of node.exportClause.elements) {
      const exportedName = element.name.text;
      const elementTypeOnly = element.isTypeOnly === true;
      const isTypeOnly = typeOnly || elementTypeOnly;
      let exportKind: AstExportKind;
      let keyword: AstDeclarationKeyword;
      if (exportedName === "default") {
        keyword = "default";
      } else {
        // Named-export-list entries reference an existing
        // symbol; the AST does not know its declaration
        // keyword without cross-file resolution.
        keyword = "unknown";
      }
      if (moduleSpecifier) {
        exportKind = "re-export";
      } else if (isTypeOnly) {
        exportKind = "type-only";
      } else {
        exportKind = "named";
      }
      const record: AstExportRecord = {
        name: exportedName,
        exportKind,
        syntaxKind: ts.SyntaxKind[element.kind],
        declarationKeyword: exportedName === "default" ? "default" : keyword,
        isDefault: exportedName === "default",
        location: locationOf(element.name, sourceFile),
      };
      if (moduleSpecifier) {
        record.moduleSpecifier = moduleSpecifier;
        result.reexports.push({
          target: moduleSpecifier,
          name: element.propertyName?.text ?? exportedName,
          exportedAs: exportedName,
          reexportKind: "named",
          typeOnly: isTypeOnly,
          location: locationOf(element.name, sourceFile),
        });
      }
      result.exports.push(record);
    }
  }
}

function classifyImport(node: ts.ImportDeclaration): AstImportKind {
  const clause = node.importClause;
  if (!clause) {
    return "side-effect";
  }
  if (clause.isTypeOnly) {
    return "type-only";
  }
  if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
    return "namespace";
  }
  return "value";
}

function classifyVariable(
  initializer: ts.Expression | undefined,
): AstSymbolKind {
  if (!initializer) {
    return "variable";
  }
  if (
    ts.isArrowFunction(initializer)
    || ts.isFunctionExpression(initializer)
  ) {
    return "function";
  }
  if (ts.isObjectLiteralExpression(initializer)) {
    return "object";
  }
  if (ts.isClassExpression(initializer)) {
    return "class";
  }
  return "variable";
}

function variableKeywordFor(
  list: ts.VariableDeclarationList,
): AstDeclarationKeyword {
  const flags = list.flags;
  if (flags & ts.NodeFlags.Const) {
    return "const";
  }
  if (flags & ts.NodeFlags.Let) {
    return "let";
  }
  return "var";
}

function hasExportModifier(
  node: ts.HasModifiers | ts.Node,
): boolean {
  const modifiers = ts.canHaveModifiers(node as ts.Node)
    ? ts.getModifiers(node as ts.HasModifiers)
    : undefined;
  if (!modifiers) {
    return false;
  }
  return modifiers.some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
  );
}

function hasDefaultModifier(
  node: ts.HasModifiers | ts.Node,
): boolean {
  const modifiers = ts.canHaveModifiers(node as ts.Node)
    ? ts.getModifiers(node as ts.HasModifiers)
    : undefined;
  if (!modifiers) {
    return false;
  }
  return modifiers.some(
    (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword,
  );
}

function moduleSpecifierText(node: ts.Expression): string | undefined {
  if (ts.isStringLiteral(node)) {
    return node.text;
  }
  return undefined;
}

function moduleReferenceTarget(
  reference: ts.ModuleReference,
): string | undefined {
  if (ts.isExternalModuleReference(reference) && reference.expression) {
    if (ts.isStringLiteral(reference.expression)) {
      return reference.expression.text;
    }
  }
  return undefined;
}

function methodNameText(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) {
    return name.text;
  }
  if (ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return undefined;
}

function locationOf(node: ts.Node, sourceFile: ts.SourceFile): AstLocation {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  );
  return { line: line + 1, column: character + 1 };
}

function extensionForPath(path: string): string {
  const match = path.match(/\.[^.]+$/);
  return match ? match[0].toLowerCase() : "";
}

function scriptKindForExtension(extension: string): ts.ScriptKind {
  switch (extension) {
    case ".tsx":
      return ts.ScriptKind.TSX;
    case ".jsx":
      return ts.ScriptKind.JSX;
    case ".js":
    case ".mjs":
    case ".cjs":
      return ts.ScriptKind.JS;
    case ".ts":
    case ".mts":
    case ".cts":
    default:
      return ts.ScriptKind.TS;
  }
}

function languageForExtension(extension: string): AstLanguage {
  switch (extension) {
    case ".js":
    case ".jsx":
    case ".mjs":
    case ".cjs":
      return "javascript";
    case ".ts":
    case ".tsx":
    case ".mts":
    case ".cts":
    default:
      return "typescript";
  }
}

/**
 * Map a file extension to whether AST extraction is
 * supported (i.e. the parser handles the source). Used
 * by the provider to pick AST vs regex fallback.
 */
export function astSupportsExtension(extension: string): boolean {
  switch (extension.toLowerCase()) {
    case ".ts":
    case ".tsx":
    case ".js":
    case ".jsx":
    case ".mts":
    case ".cts":
    case ".mjs":
    case ".cjs":
      return true;
    default:
      return false;
  }
}
