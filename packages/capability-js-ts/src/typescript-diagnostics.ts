import { relative, resolve } from "node:path";
import ts from "typescript";

export type TypeScriptDiagnosticEvidence = {
  path: string;
  code: number;
  category: "error";
  phase: "syntactic" | "semantic";
  purpose?: "compiler-error" | "unused-import";
  message: string;
  line: number;
  column: number;
};

// These semantic diagnostics describe concrete type contradictions in a file.
// Resolution, ambient-global, and project-configuration diagnostics are
// intentionally excluded because they depend heavily on install state.
const STABLE_SEMANTIC_DIAGNOSTIC_CODES = new Set([
  2322, 2339, 2345, 2362, 2363, 2365, 2554, 2741, 2769, 18047, 18048,
]);
const UNUSED_DECLARATION_DIAGNOSTIC_CODES = new Set([6133, 6192, 6196]);

export function collectTypeScriptDiagnostics(
  repoRoot: string,
  scannedFiles: readonly string[],
): TypeScriptDiagnosticEvidence[] {
  const configPath = ts.findConfigFile(repoRoot, ts.sys.fileExists, "tsconfig.json");
  if (!configPath) return [];

  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) return [];

  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, repoRoot, { noEmit: true }, configPath);
  if (parsed.errors.length > 0) return [];

  const root = resolve(repoRoot);
  const scanned = new Set(scannedFiles.map(normalizePath));
  const rootNames = parsed.fileNames.filter((fileName) => scanned.has(relativeToRoot(root, fileName)));
  if (rootNames.length === 0) return [];

  let program: ts.Program;
  try {
    program = ts.createProgram({
      rootNames,
      options: { ...parsed.options, noEmit: true, noUnusedLocals: true, noUnusedParameters: false },
      projectReferences: parsed.projectReferences,
    });
  } catch {
    return [];
  }

  const selected: Array<{
    diagnostic: ts.Diagnostic;
    phase: TypeScriptDiagnosticEvidence["phase"];
    purpose: NonNullable<TypeScriptDiagnosticEvidence["purpose"]>;
  }> = program.getSyntacticDiagnostics()
    .map((diagnostic) => ({ diagnostic, phase: "syntactic", purpose: "compiler-error" }));
  for (const diagnostic of program.getSemanticDiagnostics()) {
    if (STABLE_SEMANTIC_DIAGNOSTIC_CODES.has(diagnostic.code)) {
      selected.push({ diagnostic, phase: "semantic", purpose: "compiler-error" });
    } else if (UNUSED_DECLARATION_DIAGNOSTIC_CODES.has(diagnostic.code) && diagnosticTargetsImport(diagnostic)) {
      selected.push({ diagnostic, phase: "semantic", purpose: "unused-import" });
    }
  }

  return selected
    .map(({ diagnostic, phase, purpose }) => normalizeDiagnostic(root, scanned, diagnostic, phase, purpose))
    .filter((diagnostic): diagnostic is TypeScriptDiagnosticEvidence => Boolean(diagnostic))
    .sort((left, right) =>
      left.path.localeCompare(right.path)
      || left.line - right.line
      || left.column - right.column
      || left.code - right.code,
    );
}

function normalizeDiagnostic(
  repoRoot: string,
  scannedFiles: ReadonlySet<string>,
  diagnostic: ts.Diagnostic,
  phase: TypeScriptDiagnosticEvidence["phase"],
  purpose: NonNullable<TypeScriptDiagnosticEvidence["purpose"]>,
): TypeScriptDiagnosticEvidence | undefined {
  if (!diagnostic.file || diagnostic.start === undefined || diagnostic.category !== ts.DiagnosticCategory.Error) {
    return undefined;
  }

  const path = relativeToRoot(repoRoot, diagnostic.file.fileName);
  if (!scannedFiles.has(path)) return undefined;

  const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  return {
    path,
    code: diagnostic.code,
    category: "error",
    phase,
    purpose,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    line: position.line + 1,
    column: position.character + 1,
  };
}

function diagnosticTargetsImport(diagnostic: ts.Diagnostic): boolean {
  if (!diagnostic.file || diagnostic.start === undefined) return false;
  let node = deepestNodeAt(diagnostic.file, diagnostic.start);
  while (node) {
    if (ts.isImportDeclaration(node) || ts.isImportEqualsDeclaration(node)) return true;
    node = node.parent;
  }
  return false;
}

function deepestNodeAt(root: ts.Node, position: number): ts.Node {
  let deepest = root;
  const visit = (node: ts.Node): void => {
    if (position < node.getFullStart() || position >= node.getEnd()) return;
    deepest = node;
    node.forEachChild(visit);
  };
  visit(root);
  return deepest;
}

function relativeToRoot(repoRoot: string, fileName: string): string {
  return normalizePath(relative(repoRoot, resolve(fileName)));
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}
