import ts from "typescript";

export type FrameworkRouteConvention = {
  kind: "route";
  framework: "express" | "nestjs";
  routePath: string;
  methods: string[];
  handler?: string;
  line: number;
};

export type FrameworkEntryConvention = {
  kind: "entry";
  framework: "express" | "nestjs";
  line: number;
};

export type FrameworkConvention = FrameworkRouteConvention | FrameworkEntryConvention;

const EXPRESS_METHODS = new Map([
  ["all", "ALL"],
  ["delete", "DELETE"],
  ["get", "GET"],
  ["head", "HEAD"],
  ["options", "OPTIONS"],
  ["patch", "PATCH"],
  ["post", "POST"],
  ["put", "PUT"],
]);

const NEST_METHODS = new Map([
  ["All", "ALL"],
  ["Delete", "DELETE"],
  ["Get", "GET"],
  ["Head", "HEAD"],
  ["Options", "OPTIONS"],
  ["Patch", "PATCH"],
  ["Post", "POST"],
  ["Put", "PUT"],
]);

export function extractFrameworkConventions(path: string, content: string): FrameworkConvention[] {
  const sourceFile = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, scriptKindForPath(path));
  return [...extractExpressConventions(sourceFile), ...extractNestConventions(sourceFile)]
    .sort((left, right) => left.line - right.line || conventionKey(left).localeCompare(conventionKey(right)));
}

function extractExpressConventions(sourceFile: ts.SourceFile): FrameworkConvention[] {
  const expressFactories = new Set<string>();
  const routerFactories = new Set<string>();
  const namespaces = new Set<string>();
  const receivers = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && moduleText(statement.moduleSpecifier) === "express") {
      const clause = statement.importClause;
      if (clause?.name) expressFactories.add(clause.name.text);
      if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
        namespaces.add(clause.namedBindings.name.text);
      }
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) {
          if ((element.propertyName?.text ?? element.name.text) === "Router") routerFactories.add(element.name.text);
        }
      }
    }
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      const initializer = unwrap(declaration.initializer);
      if (isExpressRequire(initializer)) {
        expressFactories.add(declaration.name.text);
      }
    }
  }

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      const initializer = unwrap(declaration.initializer);
      if (!ts.isCallExpression(initializer)) continue;
      if (ts.isIdentifier(initializer.expression)
        && (expressFactories.has(initializer.expression.text) || routerFactories.has(initializer.expression.text))) {
        receivers.add(declaration.name.text);
      } else if (ts.isPropertyAccessExpression(initializer.expression)
        && initializer.expression.name.text === "Router"
        && ts.isIdentifier(initializer.expression.expression)
        && (expressFactories.has(initializer.expression.expression.text) || namespaces.has(initializer.expression.expression.text))) {
        receivers.add(declaration.name.text);
      }
    }
  }

  if (receivers.size === 0) return [];
  const conventions: FrameworkConvention[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression) && receivers.has(node.expression.expression.text)) {
      const method = node.expression.name.text;
      const line = lineOf(node, sourceFile);
      if (method === "listen") {
        conventions.push({ kind: "entry", framework: "express", line });
      } else {
        const httpMethod = EXPRESS_METHODS.get(method);
        const routePath = literalText(node.arguments[0]);
        if (httpMethod && routePath !== undefined) {
          conventions.push({
            kind: "route",
            framework: "express",
            routePath: normalizeRoutePath(routePath),
            methods: [httpMethod],
            ...(handlerName(node.arguments.at(-1)) ? { handler: handlerName(node.arguments.at(-1)) } : {}),
            line,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return dedupe(conventions);
}

function extractNestConventions(sourceFile: ts.SourceFile): FrameworkConvention[] {
  const controllerDecorators = new Set<string>();
  const methodDecorators = new Map<string, string>();
  const nestFactories = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause?.namedBindings
      || !ts.isNamedImports(statement.importClause.namedBindings)) continue;
    const module = moduleText(statement.moduleSpecifier);
    for (const element of statement.importClause.namedBindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text;
      if (module === "@nestjs/common") {
        if (imported === "Controller") controllerDecorators.add(element.name.text);
        const method = NEST_METHODS.get(imported);
        if (method) methodDecorators.set(element.name.text, method);
      } else if (module === "@nestjs/core" && imported === "NestFactory") {
        nestFactories.add(element.name.text);
      }
    }
  }

  const conventions: FrameworkConvention[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isClassDeclaration(statement)) continue;
    const controller = decoratorsOf(statement)
      .map(decoratorCall)
      .find((decorator) => decorator && controllerDecorators.has(decorator.name));
    if (!controller) continue;
    const prefix = literalText(controller.argument) ?? "";
    const className = statement.name?.text ?? "Controller";
    for (const member of statement.members) {
      if (!ts.isMethodDeclaration(member)) continue;
      const methodName = propertyNameText(member.name);
      if (!methodName) continue;
      for (const decorator of decoratorsOf(member).map(decoratorCall)) {
        if (!decorator) continue;
        const method = methodDecorators.get(decorator.name);
        if (!method) continue;
        const suffix = literalText(decorator.argument) ?? "";
        conventions.push({
          kind: "route",
          framework: "nestjs",
          routePath: joinRoutePath(prefix, suffix),
          methods: [method],
          handler: `${className}.${methodName}`,
          line: lineOf(member, sourceFile),
        });
      }
    }
  }

  if (nestFactories.size > 0) {
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
        && node.expression.name.text === "create" && ts.isIdentifier(node.expression.expression)
        && nestFactories.has(node.expression.expression.text)) {
        conventions.push({ kind: "entry", framework: "nestjs", line: lineOf(node, sourceFile) });
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  return dedupe(conventions);
}

function decoratorsOf(node: ts.Node): readonly ts.Decorator[] {
  return ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : [];
}

function decoratorCall(decorator: ts.Decorator): { name: string; argument?: ts.Expression } | undefined {
  const expression = decorator.expression;
  if (ts.isIdentifier(expression)) return { name: expression.text };
  if (!ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)) return undefined;
  return { name: expression.expression.text, argument: expression.arguments[0] };
}

function isExpressRequire(expression: ts.Expression): boolean {
  return ts.isCallExpression(expression)
    && ts.isIdentifier(expression.expression)
    && expression.expression.text === "require"
    && literalText(expression.arguments[0]) === "express";
}

function moduleText(expression: ts.Expression): string | undefined {
  return ts.isStringLiteralLike(expression) ? expression.text : undefined;
}

function literalText(expression: ts.Expression | undefined): string | undefined {
  return expression && (ts.isStringLiteralLike(expression) || ts.isNoSubstitutionTemplateLiteral(expression))
    ? expression.text
    : undefined;
}

function handlerName(expression: ts.Expression | undefined): string | undefined {
  if (!expression) return undefined;
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.getText();
  return undefined;
}

function propertyNameText(name: ts.PropertyName | undefined): string | undefined {
  if (!name) return undefined;
  return ts.isIdentifier(name) || ts.isStringLiteralLike(name) ? name.text : undefined;
}

function normalizeRoutePath(path: string): string {
  return path === "" || path === "/" ? "/" : `/${path.replace(/^\/+|\/+$/g, "")}`;
}

function joinRoutePath(prefix: string, suffix: string): string {
  return normalizeRoutePath([prefix, suffix].filter(Boolean).join("/"));
}

function lineOf(node: ts.Node, sourceFile: ts.SourceFile): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return current;
}

function conventionKey(convention: FrameworkConvention): string {
  return convention.kind === "entry"
    ? `entry:${convention.framework}`
    : `route:${convention.framework}:${convention.methods.join(",")}:${convention.routePath}:${convention.handler ?? ""}`;
}

function dedupe<T extends FrameworkConvention>(values: T[]): T[] {
  return [...new Map(values.map((value) => [conventionKey(value), value])).values()];
}

function scriptKindForPath(path: string): ts.ScriptKind {
  const lower = path.toLowerCase();
  if (lower.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (lower.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".cjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}
