import ts from "typescript";

export type SourceQualitySignalKind =
  | "as_any_assertion"
  | "non_null_assertion"
  | "empty_catch"
  | "catch_only_logs"
  | "placeholder_throw"
  | "async_promise_executor"
  | "async_for_each_callback"
  | "async_sync_array_callback";

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
  const promiseIsShadowed = hasLocalPromiseBinding(sourceFile);
  let hasGovernedConsoleCall = false;

  const visit = (node: ts.Node, suppressConsoleFinding: boolean): void => {
    if (
      (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node))
      && node.type.kind === ts.SyntaxKind.AnyKeyword
    ) {
      signals.push(signal("as_any_assertion", node, sourceFile));
    } else if (ts.isNonNullExpression(node)) {
      signals.push(signal("non_null_assertion", node, sourceFile));
    } else if (ts.isCatchClause(node)) {
      if (node.block.statements.length === 0) {
        signals.push(signal("empty_catch", node, sourceFile));
      } else if (node.block.statements.every(isConsoleLogStatement)) {
        signals.push(signal("catch_only_logs", node, sourceFile));
      }
    } else if (ts.isThrowStatement(node) && isPlaceholderError(node.expression)) {
      signals.push(signal("placeholder_throw", node, sourceFile));
    }

    if (!promiseIsShadowed && ts.isNewExpression(node) && isAsyncPromiseExecutor(node)) {
      signals.push(signal("async_promise_executor", node, sourceFile));
    }
    if (ts.isCallExpression(node)) {
      const method = asyncSynchronousArrayMethod(node, knownArrays);
      if (method === "forEach") {
        signals.push(signal("async_for_each_callback", node, sourceFile, method));
      } else if (method) {
        signals.push(signal("async_sync_array_callback", node, sourceFile, method));
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

function scriptKindForPath(path: string): ts.ScriptKind {
  const lower = path.toLowerCase();
  if (lower.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (lower.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".cjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}
