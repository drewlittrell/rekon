// AST-backed JS/TS evidence extractor (v1).
//
// Implements the JS/TS AST Evidence Adapter Decision
// (twenty-third slice on the capability-ontology track).
// Uses the TypeScript compiler parser API
// (`ts.createSourceFile`, `ts.forEachChild`) to walk a
// single source file's syntactic AST and emit structured
// records that the provider promotes into `symbol` /
// `export` / `import` `EvidenceGraph` facts.
//
// Parser-only by design — no typechecker, no program,
// no `tsconfig` resolution, no project graph, no call
// graph, no cross-file resolution, no inferred return
// types. AST stays optional enrichment, not foundational
// truth.
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
export type AstDeclarationKeyword =
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

export interface AstSymbolRecord {
  name: string;
  symbolKind: AstSymbolKind;
  syntaxKind: string;
  /** Original declaration keyword. Drives the legacy
   *  `value.kind` enum the provider continues to expose. */
  declarationKeyword: AstDeclarationKeyword;
  exported: boolean;
  location: AstLocation;
}

export interface AstExportRecord {
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

export interface AstImportRecord {
  /** Module specifier (the import target). */
  target: string;
  importKind: AstImportKind;
  syntaxKind: string;
  location: AstLocation;
}

export interface AstExtractionResult {
  language: AstLanguage;
  symbols: AstSymbolRecord[];
  exports: AstExportRecord[];
  imports: AstImportRecord[];
}

export interface AstExtractionInput {
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
  };

  visit(sourceFile, sourceFile, result);

  return result;
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
