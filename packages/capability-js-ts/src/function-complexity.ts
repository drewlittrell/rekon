import ts from "typescript";

export type FunctionComplexityKind =
  | "function"
  | "method"
  | "constructor"
  | "accessor"
  | "arrow"
  | "function-expression";

export type FunctionComplexityMetrics = {
  functionId: string;
  name: string;
  kind: FunctionComplexityKind;
  line: number;
  endLine: number;
  lines: number;
  statements: number;
  cyclomatic: number;
  maxNesting: number;
  fanOut: number;
};

type NamedFunction = {
  node: ts.FunctionLikeDeclaration;
  name: string;
  kind: FunctionComplexityKind;
};

/**
 * Extract neutral per-function metrics. Policy decides whether a combination
 * of these measurements is actionable; this layer does not classify debt.
 */
export function extractFunctionComplexityMetrics(
  path: string,
  content: string,
): FunctionComplexityMetrics[] {
  const sourceFile = ts.createSourceFile(
    path,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForPath(path),
  );
  const functions: NamedFunction[] = [];

  const collect = (node: ts.Node): void => {
    const named = namedFunction(node);
    if (named?.node.body) functions.push(named);
    ts.forEachChild(node, collect);
  };
  collect(sourceFile);

  const occurrences = new Map<string, number>();
  return functions.map(({ node, name, kind }) => {
    const occurrence = (occurrences.get(name) ?? 0) + 1;
    occurrences.set(name, occurrence);
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
    const measured = measureFunction(node, sourceFile);

    return {
      functionId: occurrence === 1 ? name : `${name}#${occurrence}`,
      name,
      kind,
      line: start,
      endLine: end,
      lines: end - start + 1,
      ...measured,
    };
  });
}

function measureFunction(
  root: ts.FunctionLikeDeclaration,
  sourceFile: ts.SourceFile,
): Pick<FunctionComplexityMetrics, "statements" | "cyclomatic" | "maxNesting" | "fanOut"> {
  let statements = 0;
  let cyclomatic = 1;
  let maxNesting = 0;
  const callees = new Set<string>();

  const visit = (node: ts.Node, nesting: number): void => {
    if (node !== root && isFunctionLike(node)) return;

    if (ts.isStatement(node) && !ts.isBlock(node) && !ts.isEmptyStatement(node)) statements += 1;
    if (addsDecision(node)) cyclomatic += 1;
    if (ts.isCallExpression(node)) {
      const callee = callTarget(node.expression, sourceFile);
      if (callee) callees.add(callee);
    }

    const nextNesting = addsNesting(node) ? nesting + 1 : nesting;
    maxNesting = Math.max(maxNesting, nextNesting);
    ts.forEachChild(node, (child) => visit(child, nextNesting));
  };

  if (root.body) visit(root.body, 0);
  return { statements, cyclomatic, maxNesting, fanOut: callees.size };
}

function namedFunction(node: ts.Node): NamedFunction | undefined {
  if (ts.isFunctionDeclaration(node) && node.name) {
    return { node, name: node.name.text, kind: "function" };
  }
  if (ts.isMethodDeclaration(node) && node.body) {
    const name = memberName(node.name);
    return name ? { node, name: qualifyMember(node, name), kind: "method" } : undefined;
  }
  if (ts.isConstructorDeclaration(node) && node.body) {
    return { node, name: qualifyMember(node, "constructor"), kind: "constructor" };
  }
  if ((ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) && node.body) {
    const name = memberName(node.name);
    return name ? { node, name: qualifyMember(node, name), kind: "accessor" } : undefined;
  }
  if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && node.body) {
    const name = assignedFunctionName(node);
    if (!name) return undefined;
    return { node, name, kind: ts.isArrowFunction(node) ? "arrow" : "function-expression" };
  }
  return undefined;
}

function assignedFunctionName(node: ts.ArrowFunction | ts.FunctionExpression): string | undefined {
  if (ts.isFunctionExpression(node) && node.name) return node.name.text;
  const parent = node.parent;
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
  if (ts.isPropertyAssignment(parent)) return memberName(parent.name);
  return undefined;
}

function qualifyMember(node: ts.Node, name: string): string {
  let current = node.parent;
  while (current) {
    if ((ts.isClassDeclaration(current) || ts.isClassExpression(current)) && current.name) {
      return `${current.name.text}.${name}`;
    }
    current = current.parent;
  }
  return name;
}

function memberName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
}

function isFunctionLike(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return ts.isFunctionDeclaration(node)
    || ts.isMethodDeclaration(node)
    || ts.isConstructorDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node)
    || ts.isArrowFunction(node)
    || ts.isFunctionExpression(node);
}

function addsDecision(node: ts.Node): boolean {
  if (
    ts.isIfStatement(node)
    || ts.isForStatement(node)
    || ts.isForInStatement(node)
    || ts.isForOfStatement(node)
    || ts.isWhileStatement(node)
    || ts.isDoStatement(node)
    || ts.isCatchClause(node)
    || ts.isConditionalExpression(node)
  ) {
    return true;
  }
  if (ts.isCaseClause(node)) return true;
  return ts.isBinaryExpression(node)
    && (
      node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      || node.operatorToken.kind === ts.SyntaxKind.BarBarToken
      || node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
    );
}

function addsNesting(node: ts.Node): boolean {
  return ts.isIfStatement(node)
    || ts.isForStatement(node)
    || ts.isForInStatement(node)
    || ts.isForOfStatement(node)
    || ts.isWhileStatement(node)
    || ts.isDoStatement(node)
    || ts.isSwitchStatement(node)
    || ts.isCatchClause(node)
    || ts.isConditionalExpression(node);
}

function callTarget(expression: ts.LeftHandSideExpression, sourceFile: ts.SourceFile): string | undefined {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.getText(sourceFile);
  if (ts.isElementAccessExpression(expression) && ts.isStringLiteralLike(expression.argumentExpression)) {
    return `${expression.expression.getText(sourceFile)}.${expression.argumentExpression.text}`;
  }
  return undefined;
}

function scriptKindForPath(path: string): ts.ScriptKind {
  const lower = path.toLowerCase();
  if (lower.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (lower.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".cjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}
