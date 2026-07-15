import ts from "typescript";

export type SourceQualitySignalKind =
  | "as_any_assertion"
  | "explicit_any_annotation"
  | "non_null_assertion"
  | "empty_catch"
  | "catch_only_logs"
  | "placeholder_throw"
  | "explicit_noop_contract"
  | "constant_empty_query_method"
  | "empty_source_file"
  | "unused_private_member"
  | "async_promise_executor"
  | "async_for_each_callback"
  | "async_sync_array_callback"
  | "floating_local_async_call"
  | "inverse_listener_delegation"
  | "unanchored_whole_value_allowlist"
  | "focused_test"
  | "test_global_state_mutation";

export type SourceQualitySignal = {
  kind: SourceQualitySignalKind;
  line: number;
  column: number;
  syntaxKind: string;
  detail?: string;
};

export type SourceQualityAnalysis = {
  signals: SourceQualitySignal[];
  hasGovernedConsoleCall: boolean;
};

const PLACEHOLDER_THROW = /\b(not implemented|todo|placeholder|implement me)\b/i;
const CONSOLE_METHODS = new Set(["debug", "error", "info", "log", "warn"]);
const SYNC_ASYNC_CALLBACK_METHODS = new Set(["every", "filter", "find", "findIndex", "some", "sort"]);

export function extractSourceQualitySignals(path: string, content: string): SourceQualitySignal[] {
  return analyzeSourceQuality(path, content).signals;
}

export function analyzeSourceQuality(path: string, content: string): SourceQualityAnalysis {
  const sourceFile = ts.createSourceFile(
    path,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForPath(path),
  );
  const signals: SourceQualitySignal[] = [];
  const knownArrays = collectKnownArrayIdentifiers(sourceFile);
  const localAsyncFunctions = collectUnshadowedLocalAsyncFunctions(sourceFile);
  const promiseIsShadowed = hasLocalPromiseBinding(sourceFile);
  const testFile = isTestFile(path);
  const hasSuiteEnvCleanup = testFile && detectsSuiteEnvironmentCleanup(sourceFile);
  let hasGovernedConsoleCall = false;

  if (content.trim().length === 0) {
    signals.push({
      kind: "empty_source_file",
      line: 1,
      column: 1,
      syntaxKind: "SourceFile",
    });
  }

  signals.push(...collectUnusedPrivateMemberSignals(sourceFile));

  const visit = (node: ts.Node, suppressConsoleFinding: boolean): void => {
    if (
      (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node))
      && node.type.kind === ts.SyntaxKind.AnyKeyword
    ) {
      signals.push(signal("as_any_assertion", node, sourceFile));
    } else if (
      node.kind === ts.SyntaxKind.AnyKeyword
      && isDirectExplicitAnyAnnotation(node)
    ) {
      signals.push(signal("explicit_any_annotation", node, sourceFile));
    } else if (ts.isNonNullExpression(node)) {
      signals.push(signal("non_null_assertion", node, sourceFile));
    } else if (ts.isCatchClause(node)) {
      if (node.block.statements.length === 0) {
        if (!documentsIntentionalSuppression(node, sourceFile)
          && !isForcedRemovalCleanup(node)
          && !isNestedErrorRecovery(node)) {
          signals.push(signal("empty_catch", node, sourceFile));
        }
      } else if (node.block.statements.every(isConsoleLogStatement)
        && !documentsIntentionalSuppression(node, sourceFile)
        && !isolatesNamedListener(node)
        && !isNestedErrorRecovery(node)
        && !returnsExplicitFailureAfterCatch(node)
        && !isLoopLocalPresentationFallback(node)
        && !isBestEffortObservabilityBoundary(node, sourceFile)
        && !isBestEffortCacheWriteBoundary(node, sourceFile)
        && !isResilientLoopBoundary(node, sourceFile)) {
        signals.push(signal("catch_only_logs", node, sourceFile));
      }
    } else if (ts.isThrowStatement(node)
      && isPlaceholderError(node.expression)
      && !documentsAbstractContract(node, sourceFile)
      && !describesConditionalCapability(node.expression)
      && !translatesCompletedOperationFailure(node)) {
      signals.push(signal("placeholder_throw", node, sourceFile));
    } else if (ts.isFunctionDeclaration(node) && isExportedNoopContract(node, sourceFile)) {
      signals.push(signal("explicit_noop_contract", node, sourceFile, node.name?.text));
    } else if (ts.isMethodDeclaration(node) && isConstantEmptyQueryMethod(node)) {
      signals.push(signal("constant_empty_query_method", node, sourceFile, node.name.getText(sourceFile)));
    } else if (ts.isMethodDeclaration(node)) {
      const delegation = inverseListenerDelegation(node, sourceFile);
      if (delegation) {
        signals.push(signal("inverse_listener_delegation", node, sourceFile, delegation));
      }
    } else if (ts.isVariableDeclaration(node)) {
      const allowlist = unanchoredWholeValueAllowlist(node, sourceFile);
      if (allowlist) {
        signals.push(signal("unanchored_whole_value_allowlist", node, sourceFile, allowlist));
      }
    }

    if (!promiseIsShadowed
      && ts.isNewExpression(node)
      && isAsyncPromiseExecutor(node)
      && !isSafelyBridgedAsyncPromiseExecutor(node)) {
      signals.push(signal("async_promise_executor", node, sourceFile));
    }
    if (ts.isCallExpression(node)) {
      const method = asyncSynchronousArrayMethod(node, knownArrays);
      if (method === "forEach") {
        signals.push(signal("async_for_each_callback", node, sourceFile, method));
      } else if (method) {
        signals.push(signal("async_sync_array_callback", node, sourceFile, method));
      }
      if (isFloatingLocalAsyncCall(node, localAsyncFunctions)) {
        signals.push(signal("floating_local_async_call", node, sourceFile, node.expression.getText(sourceFile)));
      }
      if (testFile && isFocusedTestCall(node) && !documentsIntentionalFocusedTest(node, sourceFile)) {
        signals.push(signal("focused_test", node, sourceFile, node.expression.getText(sourceFile)));
      }
    }
    if (testFile && ts.isBinaryExpression(node)) {
      const mutated = testEnvironmentMutation(node);
      if (mutated
        && isInsideTestCallback(node)
        && !hasSuiteEnvCleanup
        && !isInsideFinallyBlock(node)
        && !isSavedEnvironmentRestoreAssignment(node, mutated, sourceFile)
        && !hasFollowingSavedEnvironmentRestore(node, mutated, sourceFile)
        && !hasEnclosingEnvironmentRestore(node, mutated, sourceFile)
        && !hasFollowingEnvironmentRestore(node, mutated, sourceFile)) {
        signals.push(signal("test_global_state_mutation", node, sourceFile, mutated));
      }
    }

    if (!suppressConsoleFinding && ts.isCallExpression(node) && isConsoleCall(node)) {
      hasGovernedConsoleCall = true;
    }

    const childSuppressesConsole = ts.isCatchClause(node)
      ? node.block.statements.length > 0 && node.block.statements.every(isConsoleLogStatement)
      : suppressConsoleFinding;
    ts.forEachChild(node, (child) => visit(child, childSuppressesConsole));
  };

  visit(sourceFile, false);
  return {
    signals: signals.sort((left, right) =>
      left.line - right.line
      || left.column - right.column
      || left.kind.localeCompare(right.kind),
    ),
    hasGovernedConsoleCall,
  };
}

function collectUnusedPrivateMemberSignals(sourceFile: ts.SourceFile): SourceQualitySignal[] {
  const signals: SourceQualitySignal[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      for (const member of node.members) {
        if (!ts.isPropertyDeclaration(member) || !isPrivateProperty(member) || isTypeOnlyBrandProperty(member)) continue;
        const name = privatePropertyName(member.name);
        if (!name || hasDecorators(member) || privatePropertyHasRead(node, member, name)) continue;
        signals.push(signal("unused_private_member", member, sourceFile, name));
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return signals;
}

function isTypeOnlyBrandProperty(node: ts.PropertyDeclaration): boolean {
  return !node.initializer
    && Boolean(node.exclamationToken || hasModifier(node, ts.SyntaxKind.DeclareKeyword))
    && Boolean(node.type);
}

function isDirectExplicitAnyAnnotation(node: ts.Node): boolean {
  let current = node;
  while (
    ts.isArrayTypeNode(current.parent)
    || ts.isTupleTypeNode(current.parent)
    || ts.isUnionTypeNode(current.parent)
    || ts.isIntersectionTypeNode(current.parent)
    || ts.isParenthesizedTypeNode(current.parent)
    || ts.isOptionalTypeNode(current.parent)
    || ts.isRestTypeNode(current.parent)
  ) {
    current = current.parent;
  }

  const parent = current.parent;
  if (ts.isTypeAliasDeclaration(parent)) return parent.type === current;
  if (ts.isParameter(parent)
    || ts.isVariableDeclaration(parent)
    || ts.isPropertyDeclaration(parent)
    || ts.isPropertySignature(parent)
    || ts.isMethodDeclaration(parent)
    || ts.isMethodSignature(parent)
    || ts.isFunctionDeclaration(parent)
    || ts.isFunctionExpression(parent)
    || ts.isArrowFunction(parent)
    || ts.isCallSignatureDeclaration(parent)
    || ts.isConstructSignatureDeclaration(parent)
    || ts.isGetAccessorDeclaration(parent)
    || ts.isSetAccessorDeclaration(parent)) {
    return parent.type === current;
  }
  return false;
}

function isPrivateProperty(node: ts.PropertyDeclaration): boolean {
  return ts.isPrivateIdentifier(node.name) || hasModifier(node, ts.SyntaxKind.PrivateKeyword);
}

function privatePropertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name) || ts.isStringLiteralLike(name)) return name.text;
  return undefined;
}

function hasDecorators(node: ts.Node): boolean {
  return ts.canHaveDecorators(node) && Boolean(ts.getDecorators(node)?.length);
}

function privatePropertyHasRead(
  owner: ts.ClassDeclaration | ts.ClassExpression,
  declaration: ts.PropertyDeclaration,
  name: string,
): boolean {
  let read = false;
  const visit = (node: ts.Node): void => {
    if (read || node === declaration) return;

    if (ts.isPropertyAccessExpression(node) && node.name.text === name) {
      if (!isSelfUpdateReference(node, name)) read = true;
      return;
    }
    if (ts.isElementAccessExpression(node)
      && node.argumentExpression
      && ts.isStringLiteralLike(node.argumentExpression)
      && node.argumentExpression.text === name) {
      read = true;
      return;
    }
    if (ts.isStringLiteralLike(node) && node.text === name) {
      // Dynamic property APIs cannot be resolved without type/runtime context.
      // Suppress the source-local opportunity instead of claiming a false read gap.
      read = true;
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(owner);
  return read;
}

function isSelfUpdateReference(node: ts.PropertyAccessExpression, name: string): boolean {
  if ((ts.isPrefixUnaryExpression(node.parent) || ts.isPostfixUnaryExpression(node.parent))
    && (node.parent.operator === ts.SyntaxKind.PlusPlusToken || node.parent.operator === ts.SyntaxKind.MinusMinusToken)) {
    return isDiscardedExpression(node.parent);
  }

  let current: ts.Node | undefined = node;
  while (current?.parent) {
    const parent: ts.Node = current.parent;
    if (ts.isBinaryExpression(parent) && isAssignmentOperator(parent.operatorToken.kind)) {
      if (propertyAccessName(parent.left) !== name) return false;
      if (containsNode(parent.left, node)) {
        if (parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) return true;
        return isDiscardedExpression(parent);
      }
      if (!isDiscardedExpression(parent) || isOperationalSelfRead(node, parent)) return false;
      return true;
    }
    if (ts.isStatement(parent) || ts.isFunctionLike(parent)) break;
    current = parent;
  }
  return false;
}

function isOperationalSelfRead(node: ts.PropertyAccessExpression, assignment: ts.BinaryExpression): boolean {
  let current: ts.Node = node;
  while (current.parent && current.parent !== assignment) {
    const parent = current.parent;
    if (ts.isPropertyAccessExpression(parent) && parent.expression === current) return true;
    if (ts.isElementAccessExpression(parent) && parent.expression === current) return true;
    if (ts.isCallExpression(parent)
      && (parent.expression === current || parent.arguments.includes(current as ts.Expression))) return true;
    if (ts.isNewExpression(parent) && parent.arguments?.includes(current as ts.Expression)) return true;
    current = parent;
  }
  return false;
}

function isDiscardedExpression(expression: ts.Expression): boolean {
  let current = expression;
  while (ts.isParenthesizedExpression(current.parent)) current = current.parent;

  if (ts.isExpressionStatement(current.parent)) return true;
  return ts.isForStatement(current.parent) && current.parent.incrementor === current;
}

function propertyAccessName(node: ts.Expression): string | undefined {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node)
    && node.argumentExpression
    && ts.isStringLiteralLike(node.argumentExpression)) return node.argumentExpression.text;
  return undefined;
}

const ACTION_CONTRACT_NAME = /^(?:clear|delete|execute|flush|invalidate|persist|publish|register|remove|reset|run|save|send|set|update|write)(?:[A-Z0-9_]|$)/;
const EXPLICIT_NOOP = /\b(?:no[- ]?op|does nothing|not implemented)\b/i;
const FUTURE_PLACEHOLDER = /\b(?:for now|future|will be (?:called|populated))\b/i;
const SATISFIED_NOOP_RATIONALE = /\b(?:nothing to clear|no cache|read on demand|intentionally empty)\b/i;

function isExportedNoopContract(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): boolean {
  if (!node.name || node.name.text.startsWith("_") || !node.body || node.body.statements.length > 0) return false;
  if (!ACTION_CONTRACT_NAME.test(node.name.text)) return false;
  const exported = ts.canHaveModifiers(node)
    && Boolean(ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
  if (!exported) return false;

  const bodyText = sourceFile.text.slice(node.body.pos, node.body.end);
  return (EXPLICIT_NOOP.test(bodyText) || FUTURE_PLACEHOLDER.test(bodyText))
    && !SATISFIED_NOOP_RATIONALE.test(bodyText);
}

const QUERY_CONTRACT_NAME = /^(?:find|get|list|load|read|resolve|search)(?:[A-Z0-9_]|$)/;
const INTENTIONAL_EMPTY_CLASS = /^(?:Fake|Mock|Noop|Null|Stub)/;

function isConstantEmptyQueryMethod(node: ts.MethodDeclaration): boolean {
  if (!node.body || !ts.isIdentifier(node.name) || !QUERY_CONTRACT_NAME.test(node.name.text)) return false;
  if (node.parameters.length === 0 || !node.parameters.every((parameter) =>
    ts.isIdentifier(parameter.name) && parameter.name.text.startsWith("_"))) return false;
  if (hasModifier(node, ts.SyntaxKind.PrivateKeyword) || hasModifier(node, ts.SyntaxKind.ProtectedKeyword)) return false;
  if (node.body.statements.length !== 1) return false;
  const statement = node.body.statements[0];
  if (!statement || !ts.isReturnStatement(statement)) return false;

  const returned = statement.expression;
  if (!returned || (returned.kind !== ts.SyntaxKind.NullKeyword
    && !(ts.isArrayLiteralExpression(returned) && returned.elements.length === 0))) return false;

  const owner = node.parent;
  return ts.isClassDeclaration(owner)
    && Boolean(owner.name)
    && !INTENTIONAL_EMPTY_CLASS.test(owner.name!.text)
    && hasModifier(owner, ts.SyntaxKind.ExportKeyword);
}

const INVERSE_LISTENER_METHODS: Readonly<Record<string, readonly string[]>> = {
  off: ["on"],
  removeEventListener: ["addEventListener"],
  removeListener: ["addListener", "on"],
  unsubscribe: ["subscribe"],
};

function inverseListenerDelegation(node: ts.MethodDeclaration, sourceFile: ts.SourceFile): string | undefined {
  if (!node.body || !ts.isIdentifier(node.name) || node.body.statements.length !== 1) return undefined;
  const inverseMethods = INVERSE_LISTENER_METHODS[node.name.text];
  if (!inverseMethods) return undefined;

  const statement = node.body.statements[0];
  const expression = statement && ts.isExpressionStatement(statement)
    ? statement.expression
    : statement && ts.isReturnStatement(statement)
      ? statement.expression
      : undefined;
  const call = expression && unwrapExpression(expression);
  if (!call || !ts.isCallExpression(call) || !ts.isPropertyAccessExpression(call.expression)) return undefined;
  if (!inverseMethods.includes(call.expression.name.text)) return undefined;
  if (node.parameters.length !== call.arguments.length) return undefined;

  const delegatesSameArguments = node.parameters.every((parameter, index) => {
    if (!ts.isIdentifier(parameter.name)) return false;
    const argument = call.arguments[index];
    return Boolean(argument) && unwrapExpression(argument!).getText(sourceFile) === parameter.name.text;
  });
  return delegatesSameArguments ? `${node.name.text}->${call.expression.name.text}` : undefined;
}

const ALLOWLIST_PATTERN_NAME = /^(?:(?:allowed|permitted|safe|valid).*(?:pattern|regex)|(?:pattern|regex).*(?:allowed|permitted|safe|valid))$/i;

function unanchoredWholeValueAllowlist(
  node: ts.VariableDeclaration,
  sourceFile: ts.SourceFile,
): string | undefined {
  if (!ts.isIdentifier(node.name)
    || !node.initializer
    || node.initializer.kind !== ts.SyntaxKind.RegularExpressionLiteral
    || !ALLOWLIST_PATTERN_NAME.test(node.name.text)) return undefined;

  const patternName = node.name.text;
  const pattern = regularExpressionPattern(node.initializer.getText(sourceFile));
  if (!pattern
    || pattern.startsWith("^")
    || pattern.endsWith("$")
    || !/^\[(?:\\.|[^\]])+\](?:[+*?]|\{\d+(?:,\d*)?\})?$/.test(pattern)) return undefined;

  let rejectsPartialMatch = false;
  const visit = (candidate: ts.Node): void => {
    if (rejectsPartialMatch) return;
    if (ts.isCallExpression(candidate)
      && ts.isPropertyAccessExpression(candidate.expression)
      && candidate.expression.name.text === "test"
      && ts.isIdentifier(candidate.expression.expression)
      && candidate.expression.expression.text === patternName
      && ts.isPrefixUnaryExpression(candidate.parent)
      && candidate.parent.operator === ts.SyntaxKind.ExclamationToken) {
      const branch = enclosingIfBranch(candidate.parent);
      if (branch && /\b(?:error|invalid|must|only|reason|reject)\b/i.test(branch.getText(sourceFile))) {
        rejectsPartialMatch = true;
        return;
      }
    }
    ts.forEachChild(candidate, visit);
  };
  visit(sourceFile);
  return rejectsPartialMatch ? patternName : undefined;
}

function regularExpressionPattern(literal: string): string | undefined {
  if (!literal.startsWith("/")) return undefined;
  for (let index = literal.length - 1; index > 0; index -= 1) {
    if (literal[index] !== "/") continue;
    let backslashes = 0;
    for (let cursor = index - 1; cursor >= 0 && literal[cursor] === "\\"; cursor -= 1) backslashes += 1;
    if (backslashes % 2 === 0) return literal.slice(1, index);
  }
  return undefined;
}

function enclosingIfBranch(node: ts.Node): ts.Statement | undefined {
  let current: ts.Node | undefined = node;
  while (current?.parent) {
    const parent: ts.Node = current.parent;
    if (ts.isIfStatement(parent) && containsNode(parent.expression, node)) return parent.thenStatement;
    if (ts.isFunctionLike(parent)) return undefined;
    current = parent;
  }
  return undefined;
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node)
    && Boolean(ts.getModifiers(node)?.some((modifier) => modifier.kind === kind));
}

type LocalAsyncFunction = ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression;

function collectUnshadowedLocalAsyncFunctions(sourceFile: ts.SourceFile): Map<string, LocalAsyncFunction> {
  const asyncFunctions = new Map<string, LocalAsyncFunction>();
  const conflictingBindings = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      if (hasAsyncModifier(node)) asyncFunctions.set(node.name.text, node);
      else conflictingBindings.add(node.name.text);
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const initializer = node.initializer && unwrapExpression(node.initializer);
      if (initializer && isAsyncFunction(initializer)) asyncFunctions.set(node.name.text, initializer);
      else conflictingBindings.add(node.name.text);
    } else if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
      conflictingBindings.add(node.name.text);
    } else if (ts.isImportClause(node) && node.name) {
      conflictingBindings.add(node.name.text);
    } else if (ts.isImportSpecifier(node) || ts.isNamespaceImport(node)) {
      conflictingBindings.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  for (const name of conflictingBindings) asyncFunctions.delete(name);
  return asyncFunctions;
}

function hasAsyncModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node)
    && Boolean(ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword));
}

function isFloatingLocalAsyncCall(
  call: ts.CallExpression,
  asyncFunctions: ReadonlyMap<string, LocalAsyncFunction>,
): boolean {
  const localFunction = ts.isIdentifier(call.expression) ? asyncFunctions.get(call.expression.text) : undefined;
  return Boolean(localFunction)
    && ts.isExpressionStatement(call.parent)
    && call.parent.expression === call
    && !(isInsideUseEffectCallback(call) && functionHandlesOwnRejection(localFunction!));
}

function isInsideUseEffectCallback(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current))
      && current.parent && ts.isCallExpression(current.parent)
      && current.parent.arguments.includes(current as ts.Expression)) {
      const callee = current.parent.expression;
      return (ts.isIdentifier(callee) && callee.text === "useEffect")
        || (ts.isPropertyAccessExpression(callee) && callee.name.text === "useEffect");
    }
    current = current.parent;
  }
  return false;
}

function functionHandlesOwnRejection(fn: LocalAsyncFunction): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found || (node !== fn && ts.isFunctionLike(node))) return;
    if (ts.isCatchClause(node)) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(fn);
  return found;
}

function isFocusedTestCall(call: ts.CallExpression): boolean {
  if (ts.isIdentifier(call.expression)) {
    return call.expression.text === "fit" || call.expression.text === "fdescribe";
  }
  return ts.isPropertyAccessExpression(call.expression)
    && call.expression.name.text === "only"
    && ts.isIdentifier(call.expression.expression)
    && (call.expression.expression.text === "it"
      || call.expression.expression.text === "test"
      || call.expression.expression.text === "describe");
}

function testEnvironmentMutation(node: ts.BinaryExpression): string | undefined {
  if (!isAssignmentOperator(node.operatorToken.kind)) return undefined;
  const left = node.left;
  if (ts.isPropertyAccessExpression(left)
    && ts.isPropertyAccessExpression(left.expression)
    && ts.isIdentifier(left.expression.expression)
    && left.expression.expression.text === "process"
    && left.expression.name.text === "env") {
    return `process.env.${left.name.text}`;
  }
  if (ts.isElementAccessExpression(left)
    && ts.isPropertyAccessExpression(left.expression)
    && ts.isIdentifier(left.expression.expression)
    && left.expression.expression.text === "process"
    && left.expression.name.text === "env"
    && left.argumentExpression
    && ts.isStringLiteralLike(left.argumentExpression)) {
    return `process.env.${left.argumentExpression.text}`;
  }
  return undefined;
}

function documentsIntentionalSuppression(node: ts.CatchClause, sourceFile: ts.SourceFile): boolean {
  const text = sourceFile.text.slice(node.block.getStart(sourceFile), node.block.end);
  const comments = text.match(/\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g) ?? [];
  if (comments.some((comment) => !/\b(?:TODO|FIXME|HACK)\b/i.test(comment))) {
    return true;
  }
  return /\b(?:best[- ]effort|cleanup|fallback|ignore|ignored|malformed|non[- ]fatal|optional|preserve|quietly|resilient|retry|stale[- ]session)\b|\bnever\s+break\b/i.test(text);
}

function isForcedRemovalCleanup(node: ts.CatchClause): boolean {
  const tryStatement = node.parent;
  if (!ts.isTryStatement(tryStatement) || tryStatement.tryBlock.statements.length === 0) return false;

  return tryStatement.tryBlock.statements.every((statement) => {
    if (!ts.isExpressionStatement(statement)) return false;
    let expression = statement.expression;
    while (ts.isAwaitExpression(expression)) expression = expression.expression;
    if (!ts.isCallExpression(expression)) return false;

    const callee = expression.expression;
    const name = ts.isIdentifier(callee)
      ? callee.text
      : ts.isPropertyAccessExpression(callee)
        ? callee.name.text
        : "";
    if (name !== "rm" && name !== "rmSync") return false;

    const options = expression.arguments[1];
    return Boolean(options && ts.isObjectLiteralExpression(options) && options.properties.some((property) => (
      ts.isPropertyAssignment(property)
      && ((ts.isIdentifier(property.name) && property.name.text === "force")
        || (ts.isStringLiteralLike(property.name) && property.name.text === "force"))
      && property.initializer.kind === ts.SyntaxKind.TrueKeyword
    )));
  });
}

function isNestedErrorRecovery(node: ts.CatchClause): boolean {
  let current: ts.Node | undefined = node.parent.parent;
  while (current) {
    if (ts.isCatchClause(current)) return true;
    current = current.parent;
  }
  return false;
}

function isolatesNamedListener(node: ts.CatchClause): boolean {
  const tryStatement = node.parent;
  if (!ts.isTryStatement(tryStatement) || tryStatement.tryBlock.statements.length !== 1) return false;
  const statement = tryStatement.tryBlock.statements[0];
  if (!statement || !ts.isExpressionStatement(statement)) return false;

  let expression = statement.expression;
  while (ts.isAwaitExpression(expression)) expression = expression.expression;
  if (!ts.isCallExpression(expression)) return false;

  const callee = expression.expression;
  if ((ts.isIdentifier(callee) && callee.text === "listener")
    || (ts.isPropertyAccessExpression(callee)
      && (callee.name.text === "listener" || /^_?on[A-Z0-9_]/.test(callee.name.text)))) {
    return true;
  }

  if (isInsideListenerRegistration(node)) return true;
  if (!ts.isIdentifier(callee)) return false;

  const boundary = enclosingNamedFunctionLike(node);
  if (!boundary) return false;
  const invokesParameter = boundary.fn.parameters.some(
    (parameter) => ts.isIdentifier(parameter.name) && parameter.name.text === callee.text,
  );
  if (!invokesParameter) return false;

  const nameTokens = boundary.name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/);
  return nameTokens.some((token) => ["callback", "callbacks", "event", "events", "hook", "hooks", "listener", "listeners"].includes(token));
}

function isInsideListenerRegistration(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current))
      && ts.isCallExpression(current.parent)
      && current.parent.arguments.includes(current)) {
      const callee = current.parent.expression;
      if (ts.isPropertyAccessExpression(callee)
        && ["addEventListener", "on", "once", "subscribe"].includes(callee.name.text)) {
        return true;
      }
    }
    current = current.parent;
  }
  return false;
}

function returnsExplicitFailureAfterCatch(node: ts.CatchClause): boolean {
  const tryStatement = node.parent;
  if (!ts.isTryStatement(tryStatement) || !ts.isBlock(tryStatement.parent)) return false;
  const block = tryStatement.parent;
  const index = block.statements.indexOf(tryStatement);
  const next = index >= 0 ? block.statements[index + 1] : undefined;
  if (!next || !ts.isReturnStatement(next) || !next.expression) return false;

  const expression = next.expression;
  if (expression.kind === ts.SyntaxKind.FalseKeyword || expression.kind === ts.SyntaxKind.NullKeyword) return true;
  if (ts.isIdentifier(expression) && expression.text === "undefined") return true;
  return ts.isArrayLiteralExpression(expression)
    && Boolean(expression.elements[0]
      && (expression.elements[0].kind === ts.SyntaxKind.FalseKeyword
        || expression.elements[0].kind === ts.SyntaxKind.NullKeyword));
}

function isLoopLocalPresentationFallback(node: ts.CatchClause): boolean {
  if (node.variableDeclaration) return false;
  const tryStatement = node.parent;
  if (!ts.isTryStatement(tryStatement) || !ts.isBlock(tryStatement.parent)) return false;
  const loop = tryStatement.parent.parent;
  if (!ts.isForStatement(loop)
    && !ts.isForInStatement(loop)
    && !ts.isForOfStatement(loop)
    && !ts.isWhileStatement(loop)
    && !ts.isDoStatement(loop)) {
    return false;
  }

  let hasConsoleBranch = false;
  const isConsoleBranch = (statement: ts.Statement): boolean => {
    if (ts.isBlock(statement)) return statement.statements.length > 0 && statement.statements.every(isConsoleBranch);
    if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) return false;
    if (!isConsoleCall(statement.expression)) return false;
    hasConsoleBranch = true;
    return true;
  };
  const isPresentationStatement = (statement: ts.Statement): boolean => {
    if (ts.isVariableStatement(statement)) return true;
    if (!ts.isIfStatement(statement)) return false;
    return isConsoleBranch(statement.thenStatement)
      && (!statement.elseStatement || isConsoleBranch(statement.elseStatement));
  };

  return tryStatement.tryBlock.statements.length > 0
    && tryStatement.tryBlock.statements.every(isPresentationStatement)
    && hasConsoleBranch;
}

function documentsIntentionalFocusedTest(node: ts.CallExpression, sourceFile: ts.SourceFile): boolean {
  const preceding = sourceFile.text.slice(Math.max(0, node.getStart(sourceFile) - 240), node.getStart(sourceFile));
  return /(?:eslint-disable-next-line|biome-ignore)[^\r\n]*(?:no-focused-tests|focused)/i.test(preceding);
}

function isBestEffortObservabilityBoundary(
  node: ts.CatchClause,
  sourceFile: ts.SourceFile,
): boolean {
  const tryStatement = node.parent;
  if (!ts.isTryStatement(tryStatement)) return false;

  const sourceName = sourceFile.fileName.split(/[\\/]/).at(-1) ?? "";
  if (/(?:logger|loggingservice)\.[cm]?[jt]sx?$/i.test(sourceName)) return true;

  if (isInsideLoggingClass(node)) return true;

  const namedBoundary = enclosingNamedFunctionLike(node);
  if (!namedBoundary) return false;
  const { fn, name } = namedBoundary;
  if (!fn.body || !ts.isBlock(fn.body)) return false;

  const returnType = fn.type?.getText(sourceFile).replace(/\s+/g, "");
  const returnsVoid = returnType === "void"
    || returnType === "Promise<void>"
    || (returnType === undefined && !containsValueReturn(fn.body));
  if (!returnsVoid) return false;

  const nameTokens = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/);
  if (nameTokens.includes("log") || nameTokens.includes("logging") || nameTokens.includes("debug")) return true;

  const observabilityTokens = new Set(["trace", "telemetry", "metric", "metrics", "analytics", "diagnostic", "debug", "audit"]);
  return nameTokens.some((token) => observabilityTokens.has(token))
    && fn.body.statements.length === 1
    && fn.body.statements[0] === tryStatement;
}

function isBestEffortCacheWriteBoundary(
  node: ts.CatchClause,
  sourceFile: ts.SourceFile,
): boolean {
  const tryStatement = node.parent;
  if (!ts.isTryStatement(tryStatement)) return false;

  const namedBoundary = enclosingNamedFunctionLike(node);
  if (!namedBoundary?.fn.body || !ts.isBlock(namedBoundary.fn.body)) return false;
  const returnType = namedBoundary.fn.type?.getText(sourceFile).replace(/\s+/g, "");
  const returnsVoid = returnType === "void"
    || returnType === "Promise<void>"
    || (returnType === undefined && !containsValueReturn(namedBoundary.fn.body));
  if (!returnsVoid) return false;

  const tryText = tryStatement.tryBlock.getText(sourceFile);
  const catchText = node.block.getText(sourceFile);
  const boundaryName = namedBoundary.name.toLowerCase();
  const cacheDeclared = boundaryName.includes("cache")
    || tryText.toLowerCase().includes("cache")
    || catchText.toLowerCase().includes("cache");
  const cacheWrite = /\.(?:setex|psetex|setEx|set)\s*\(/.test(tryText);

  return cacheDeclared && cacheWrite;
}

function isInsideLoggingClass(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isClassDeclaration(current) || ts.isClassExpression(current)) {
      const name = current.name?.text.toLowerCase();
      return Boolean(name && (name === "logger" || name.endsWith("logger") || name.endsWith("loggingservice")));
    }
    current = current.parent;
  }
  return false;
}

function containsValueReturn(body: ts.Block): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found || (node !== body && ts.isFunctionLike(node))) return;
    if (ts.isReturnStatement(node) && node.expression) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return found;
}

function isResilientLoopBoundary(node: ts.CatchClause, sourceFile: ts.SourceFile): boolean {
  const tryStatement = node.parent;
  if (!ts.isTryStatement(tryStatement) || !ts.isBlock(tryStatement.parent)) return false;
  const block = tryStatement.parent;
  const loop = block.parent;
  if (!ts.isWhileStatement(loop) && !ts.isDoStatement(loop) && !ts.isForStatement(loop)) return false;

  const index = block.statements.indexOf(tryStatement);
  if (index < 0) return false;
  return block.statements.slice(index + 1).some((statement) =>
    /\bawait\s+(?:sleep|delay|wait)\s*\(/i.test(statement.getText(sourceFile)));
}

function enclosingNamedFunctionLike(
  node: ts.Node,
): { fn: ts.FunctionLikeDeclaration; name: string } | undefined {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isFunctionDeclaration(current)
      || ts.isMethodDeclaration(current)
      || ts.isGetAccessorDeclaration(current)
      || ts.isSetAccessorDeclaration(current)
      || ts.isConstructorDeclaration(current)
      || ts.isFunctionExpression(current)
      || ts.isArrowFunction(current)) {
      const name = functionLikeName(current);
      if (name) return { fn: current, name };
    }
    current = current.parent;
  }
  return undefined;
}

function functionLikeName(node: ts.FunctionLikeDeclaration): string | undefined {
  if (node.name && ts.isIdentifier(node.name)) return node.name.text;
  if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node))
    && ts.isVariableDeclaration(node.parent)
    && ts.isIdentifier(node.parent.name)) {
    return node.parent.name.text;
  }
  return undefined;
}

function isSavedEnvironmentRestoreAssignment(
  node: ts.BinaryExpression,
  target: string,
  sourceFile: ts.SourceFile,
): boolean {
  if (!ts.isIdentifier(node.right)) return false;
  const restoreVariable = node.right.text;
  const callback = enclosingTestCallback(node);
  if (!callback) return false;

  let saved = false;
  const visit = (candidate: ts.Node): void => {
    if (saved || candidate.getStart(sourceFile) >= node.getStart(sourceFile)) return;
    if (ts.isVariableDeclaration(candidate)
      && ts.isIdentifier(candidate.name)
      && candidate.name.text === restoreVariable
      && candidate.initializer?.getText(sourceFile) === target) {
      saved = true;
      return;
    }
    ts.forEachChild(candidate, visit);
  };
  visit(callback.body);
  return saved;
}

function detectsSuiteEnvironmentCleanup(sourceFile: ts.SourceFile): boolean {
  const helpers = new Map<string, string>();
  const collect = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      helpers.set(node.name.text, node.body.getText(sourceFile));
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer
      && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
      helpers.set(node.name.text, node.initializer.body.getText(sourceFile));
    }
    ts.forEachChild(node, collect);
  };
  collect(sourceFile);

  let cleanup = false;
  const visit = (node: ts.Node): void => {
    if (cleanup) return;
    if (ts.isCallExpression(node)
      && ["after", "afterAll", "afterEach"].some((name) => isNamedCall(node.expression, name))) {
      const callback = node.arguments[0];
      if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
        const callbackText = callback.body.getText(sourceFile);
        if (mutatesProcessEnvironmentText(callbackText)) {
          cleanup = true;
          return;
        }
        const calledHelpers = new Set<string>();
        const collectCalls = (child: ts.Node): void => {
          if (ts.isCallExpression(child) && ts.isIdentifier(child.expression)) calledHelpers.add(child.expression.text);
          ts.forEachChild(child, collectCalls);
        };
        collectCalls(callback.body);
        cleanup = [...calledHelpers].some((name) => mutatesProcessEnvironmentText(helpers.get(name) ?? ""));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return cleanup;
}

function hasFollowingSavedEnvironmentRestore(
  node: ts.BinaryExpression,
  target: string,
  sourceFile: ts.SourceFile,
): boolean {
  const callback = enclosingTestCallback(node);
  if (!callback || !ts.isBlock(callback.body)) return false;

  let statement: ts.Statement | undefined;
  let current: ts.Node = node;
  while (current.parent && current.parent !== callback.body) current = current.parent;
  if (ts.isStatement(current)) statement = current;
  if (!statement) return false;

  const index = callback.body.statements.indexOf(statement);
  if (index < 0) return false;

  const savedNames = new Set<string>();
  for (const previous of callback.body.statements.slice(0, index)) {
    const collect = (candidate: ts.Node): void => {
      if (ts.isVariableDeclaration(candidate)
        && ts.isIdentifier(candidate.name)
        && candidate.initializer?.getText(sourceFile) === target) {
        savedNames.add(candidate.name.text);
      }
      ts.forEachChild(candidate, collect);
    };
    collect(previous);
  }
  if (savedNames.size === 0) return false;

  return callback.body.statements.slice(index + 1).some((following) => {
    let restored = false;
    const visit = (candidate: ts.Node): void => {
      if (restored) return;
      if (ts.isBinaryExpression(candidate)
        && isAssignmentOperator(candidate.operatorToken.kind)
        && candidate.left.getText(sourceFile) === target
        && ts.isIdentifier(candidate.right)
        && savedNames.has(candidate.right.text)) {
        restored = true;
        return;
      }
      ts.forEachChild(candidate, visit);
    };
    visit(following);
    return restored;
  });
}

function mutatesProcessEnvironmentText(text: string): boolean {
  return /\bdelete\s+process\.env(?:\.|\[)/.test(text)
    || /\bprocess\.env\s*=(?!=)/.test(text)
    || /\bprocess\.env(?:\.|\[)[^;\n]*(?:=(?!=)|\+\+|--)/.test(text);
}

function hasEnclosingEnvironmentRestore(
  node: ts.Node,
  target: string,
  sourceFile: ts.SourceFile,
): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isTryStatement(current) && current.finallyBlock && containsNode(current.tryBlock, node)) {
      if (environmentRestoreTextMatches(current.finallyBlock.getText(sourceFile), target)) return true;
    }
    current = current.parent;
  }
  return false;
}

function hasFollowingEnvironmentRestore(
  node: ts.Node,
  target: string,
  sourceFile: ts.SourceFile,
): boolean {
  let statement: ts.Node = node;
  while (statement.parent && !ts.isStatement(statement)) statement = statement.parent;
  if (!ts.isStatement(statement)) return false;

  const parent = statement.parent;
  const statements = ts.isBlock(parent) || ts.isSourceFile(parent) ? parent.statements : undefined;
  if (!statements) return false;
  const index = statements.indexOf(statement);
  if (index < 0) return false;
  return statements.slice(index + 1).some((next) =>
    ts.isTryStatement(next)
    && next.finallyBlock
    && environmentRestoreTextMatches(next.finallyBlock.getText(sourceFile), target));
}

function environmentRestoreTextMatches(text: string, target: string): boolean {
  if (/\bprocess\.env\s*=(?!=)/.test(text)) return true;
  const key = target.slice("process.env.".length);
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`process\\.env(?:\\.${escaped}|\\[(?:"|')${escaped}(?:"|')\\])`).test(text);
}

function isInsideFinallyBlock(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isBlock(current) && current.parent && ts.isTryStatement(current.parent)
      && current.parent.finallyBlock === current) return true;
    current = current.parent;
  }
  return false;
}

function containsNode(container: ts.Node, node: ts.Node): boolean {
  return node.getStart() >= container.getStart() && node.end <= container.end;
}

function isNamedCall(expression: ts.LeftHandSideExpression, name: string): boolean {
  return (ts.isIdentifier(expression) && expression.text === name)
    || (ts.isPropertyAccessExpression(expression) && expression.name.text === name);
}

function isAssignmentOperator(kind: ts.SyntaxKind): boolean {
  return kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;
}

function isInsideTestCallback(node: ts.Node): boolean {
  return Boolean(enclosingTestCallback(node));
}

function enclosingTestCallback(node: ts.Node): ts.ArrowFunction | ts.FunctionExpression | undefined {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current))
      && current.parent && ts.isCallExpression(current.parent)
      && current.parent.arguments.includes(current as ts.Expression)) {
      const callee = current.parent.expression;
      if (ts.isIdentifier(callee) && (callee.text === "it" || callee.text === "test")) return current;
      if (ts.isPropertyAccessExpression(callee)
        && ts.isIdentifier(callee.expression)
        && (callee.expression.text === "it" || callee.expression.text === "test")) return current;
    }
    current = current.parent;
  }
  return undefined;
}

function isTestFile(path: string): boolean {
  return /(^|\/)(?:__tests__|tests?|specs?)(\/|$)/i.test(path) || /\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(path);
}

function signal(
  kind: SourceQualitySignalKind,
  node: ts.Node,
  sourceFile: ts.SourceFile,
  detail?: string,
): SourceQualitySignal {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return {
    kind,
    line: position.line + 1,
    column: position.character + 1,
    syntaxKind: ts.SyntaxKind[node.kind],
    ...(detail ? { detail } : {}),
  };
}

function isAsyncPromiseExecutor(node: ts.NewExpression): boolean {
  return ts.isIdentifier(node.expression)
    && node.expression.text === "Promise"
    && Boolean(node.arguments?.[0] && isAsyncFunction(node.arguments[0]));
}

function isSafelyBridgedAsyncPromiseExecutor(node: ts.NewExpression): boolean {
  const executor = node.arguments?.[0];
  if (!executor || (!ts.isArrowFunction(executor) && !ts.isFunctionExpression(executor))) return false;
  if (!ts.isBlock(executor.body) || executor.body.statements.length !== 1) return false;
  const rejectionParameter = executor.parameters[1]?.name;
  if (!rejectionParameter || !ts.isIdentifier(rejectionParameter)) return false;

  const statement = executor.body.statements[0];
  if (!statement || !ts.isTryStatement(statement) || !statement.catchClause || statement.finallyBlock) return false;
  if (statement.catchClause.block.statements.length === 0) return false;

  let rejects = false;
  let unsafeAsync = false;
  const visitCatch = (candidate: ts.Node): void => {
    if (ts.isAwaitExpression(candidate)) unsafeAsync = true;
    if (ts.isCallExpression(candidate)
      && ts.isIdentifier(candidate.expression)
      && candidate.expression.text === rejectionParameter.text) {
      rejects = true;
    }
    ts.forEachChild(candidate, visitCatch);
  };
  visitCatch(statement.catchClause.block);
  return rejects && !unsafeAsync;
}

function asyncSynchronousArrayMethod(
  call: ts.CallExpression,
  knownArrays: ReadonlySet<string>,
): string | undefined {
  if (!ts.isPropertyAccessExpression(call.expression)) return undefined;
  const method = call.expression.name.text;
  if (method !== "forEach" && !SYNC_ASYNC_CALLBACK_METHODS.has(method)) return undefined;
  const callback = call.arguments[0];
  if (!callback || !isAsyncFunction(callback)) return undefined;
  return isKnownArrayExpression(call.expression.expression, knownArrays) ? method : undefined;
}

function isAsyncFunction(node: ts.Node): node is ts.ArrowFunction | ts.FunctionExpression {
  return (ts.isArrowFunction(node) || ts.isFunctionExpression(node))
    && Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword));
}

function collectKnownArrayIdentifiers(sourceFile: ts.SourceFile): Set<string> {
  const identifiers = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && (isArrayTypeNode(node.type) || Boolean(node.initializer && isKnownArrayExpression(node.initializer, identifiers)))) {
      identifiers.add(node.name.text);
    } else if (ts.isParameter(node) && ts.isIdentifier(node.name) && isArrayTypeNode(node.type)) {
      identifiers.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return identifiers;
}

function isKnownArrayExpression(expression: ts.Expression, knownArrays: ReadonlySet<string>): boolean {
  const unwrapped = unwrapExpression(expression);
  if (ts.isArrayLiteralExpression(unwrapped)) return true;
  if (ts.isIdentifier(unwrapped)) return knownArrays.has(unwrapped.text);
  if (ts.isAsExpression(unwrapped) || ts.isTypeAssertionExpression(unwrapped)) {
    return isArrayTypeNode(unwrapped.type) || isKnownArrayExpression(unwrapped.expression, knownArrays);
  }
  return false;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return current;
}

function isArrayTypeNode(type: ts.TypeNode | undefined): boolean {
  if (!type) return false;
  if (ts.isArrayTypeNode(type) || ts.isTupleTypeNode(type)) return true;
  if (ts.isTypeReferenceNode(type) && ts.isIdentifier(type.typeName)) {
    return type.typeName.text === "Array" || type.typeName.text === "ReadonlyArray";
  }
  return ts.isUnionTypeNode(type) && type.types.every((member) => isArrayTypeNode(member));
}

function hasLocalPromiseBinding(sourceFile: ts.SourceFile): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node)) && bindingContainsPromise(node.name)) {
      found = true;
      return;
    }
    if ((ts.isFunctionDeclaration(node)
      || ts.isFunctionExpression(node)
      || ts.isClassDeclaration(node)
      || ts.isClassExpression(node)
      || ts.isEnumDeclaration(node))
      && node.name?.text === "Promise") {
      found = true;
      return;
    }
    if (ts.isImportClause(node) && node.name?.text === "Promise") {
      found = true;
      return;
    }
    if ((ts.isImportSpecifier(node) || ts.isNamespaceImport(node)) && node.name.text === "Promise") {
      found = true;
      return;
    }
    if (ts.isImportEqualsDeclaration(node) && node.name.text === "Promise") {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function bindingContainsPromise(name: ts.BindingName): boolean {
  if (ts.isIdentifier(name)) return name.text === "Promise";
  return name.elements.some((element) =>
    ts.isBindingElement(element) && bindingContainsPromise(element.name));
}

function isConsoleLogStatement(statement: ts.Statement): boolean {
  if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) return false;
  return isConsoleCall(statement.expression);
}

function isConsoleCall(call: ts.CallExpression): boolean {
  const callee = call.expression;
  return ts.isPropertyAccessExpression(callee)
    && ts.isIdentifier(callee.expression)
    && callee.expression.text === "console"
    && CONSOLE_METHODS.has(callee.name.text);
}

function isPlaceholderError(expression: ts.Expression | undefined): boolean {
  if (!expression || !ts.isNewExpression(expression) || !ts.isIdentifier(expression.expression)) return false;
  if (expression.expression.text !== "Error") return false;
  const message = expression.arguments?.[0];
  return Boolean(message && ts.isStringLiteralLike(message) && PLACEHOLDER_THROW.test(message.text));
}

function documentsAbstractContract(node: ts.ThrowStatement, sourceFile: ts.SourceFile): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isMethodDeclaration(current) || ts.isMethodSignature(current)) {
      return ts.getJSDocTags(current).some((tag) => tag.tagName.text === "abstract")
        || isImplicitAbstractBaseMethod(current, sourceFile);
    }
    if (ts.isClassDeclaration(current) || ts.isClassExpression(current) || ts.isFunctionLike(current)) break;
    current = current.parent;
  }
  return false;
}

function isImplicitAbstractBaseMethod(
  method: ts.MethodDeclaration | ts.MethodSignature,
  sourceFile: ts.SourceFile,
): boolean {
  if (!ts.isMethodDeclaration(method) || !ts.isClassDeclaration(method.parent) || !method.parent.name) return false;
  if (hasModifier(method.parent, ts.SyntaxKind.ExportKeyword)) return false;
  const methodName = propertyNameText(method.name);
  if (!methodName) return false;

  const baseName = method.parent.name.text;
  const derivedClasses: ts.ClassDeclaration[] = [];
  let directlyInstantiated = false;
  const visit = (node: ts.Node): void => {
    if (ts.isNewExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === baseName) {
      directlyInstantiated = true;
    }
    if (ts.isClassDeclaration(node)
      && node !== method.parent
      && node.heritageClauses?.some((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword
        && clause.types.some((type) => ts.isIdentifier(type.expression) && type.expression.text === baseName))) {
      derivedClasses.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return !directlyInstantiated
    && derivedClasses.length > 0
    && derivedClasses.every((derived) => derived.members.some((member) =>
      ts.isMethodDeclaration(member) && propertyNameText(member.name) === methodName));
}

function propertyNameText(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name) || ts.isStringLiteralLike(name)) return name.text;
  return undefined;
}

function translatesCompletedOperationFailure(node: ts.ThrowStatement): boolean {
  let owner: ts.SignatureDeclaration | undefined;
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isFunctionLike(current)) {
      owner = current;
      break;
    }
    current = current.parent;
  }
  const body = owner && "body" in owner ? owner.body : undefined;
  if (!body || !ts.isBlock(body)) return false;

  let conditional = false;
  current = node;
  while (current && current.parent !== body) {
    if (ts.isIfStatement(current) || ts.isCaseClause(current) || ts.isDefaultClause(current)) conditional = true;
    current = current.parent;
  }
  if (!current || !ts.isStatement(current)) return false;
  if (!conditional && !ts.isIfStatement(current)) return false;

  const statementIndex = body.statements.indexOf(current);
  return statementIndex > 0
    && body.statements.slice(0, statementIndex).some(containsCallExpression);
}

function containsCallExpression(node: ts.Node): boolean {
  let found = false;
  const visit = (child: ts.Node): void => {
    if (found) return;
    if (ts.isCallExpression(child) || ts.isNewExpression(child)) {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

function describesConditionalCapability(expression: ts.Expression | undefined): boolean {
  if (!expression || !ts.isNewExpression(expression) || expression.arguments?.length !== 1) return false;
  const message = expression.arguments[0];
  if (!message || !ts.isStringLiteralLike(message)) return false;
  return /\b(?:if|when)\b[^.]*\bnot implemented\b|\b(?:must|does not)\s+implement\b/i.test(message.text);
}

function scriptKindForPath(path: string): ts.ScriptKind {
  const lower = path.toLowerCase();
  if (lower.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (lower.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".cjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}
