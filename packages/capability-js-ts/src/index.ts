import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import { join, relative } from "node:path";
import { digestJson } from "@rekon/kernel-artifacts";
import {
  type EvidenceFact,
  type EvidenceProvider,
  type ProviderContext,
  createEvidenceFact,
  dedupeEvidenceFacts,
} from "@rekon/kernel-evidence";
import { defineCapability } from "@rekon/sdk";
import {
  type AstConfidence,
  type AstExportKind,
  type AstExtractionResult,
  type AstImportKind,
  type AstLanguage,
  type AstSymbolKind,
  astSupportsExtension,
  extractAstRecords,
} from "./ast-extractor.js";

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"]);
const IGNORED_SEGMENTS = new Set(["node_modules", ".git", ".rekon", ".circe", "dist", "build", "coverage"]);
const DEFAULT_MAX_WALK_DEPTH = 80;

export {
  type AstConfidence,
  type AstExportKind,
  type AstImportKind,
  type AstLanguage,
  type AstSymbolKind,
} from "./ast-extractor.js";

/**
 * @internal — exposed for contract tests so the regex
 * fallback path can be exercised even when the
 * TypeScript parser tolerates the input. Not part of
 * the public API and may change between releases.
 */
export function __extractRegexFallbackFactsForTesting(
  path: string,
  content: string,
): EvidenceFact[] {
  const language = languageForPath(path);
  return [
    ...extractImportFacts(path, content, language),
    ...extractExportFacts(path, content, language),
    ...extractSymbolFacts(path, content, language),
  ];
}

export const jsTsProvider: EvidenceProvider = {
  id: "@rekon/capability-js-ts.provider",
  kind: "language",
  supports(ctx) {
    return Boolean(ctx.repoRoot);
  },
  async extract(ctx) {
    const files = await listSourceFiles(ctx);
    const facts: EvidenceFact[] = [];

    for (const path of files) {
      try {
        const absolutePath = join(ctx.repoRoot, path);
        const content = await readFile(absolutePath, "utf8");

        facts.push(createFileFact(path));

        const extension = extensionForPath(path);
        const language = languageForPath(path);
        let astFacts: EvidenceFact[] | undefined;

        if (astSupportsExtension(extension)) {
          try {
            const result = extractAstRecords({ path, content });
            astFacts = factsFromAstResult(path, result);
          } catch {
            // Fall through to regex fallback.
            astFacts = undefined;
          }
        }

        if (astFacts) {
          appendFacts(facts, astFacts);
        } else {
          // Regex fallback. Mark every emitted fact with
          // extractionMethod: "regex-fallback" so downstream
          // consumers can distinguish AST evidence from
          // fallback evidence.
          appendFacts(facts, extractImportFacts(path, content, language));
          appendFacts(facts, extractExportFacts(path, content, language));
          appendFacts(facts, extractSymbolFacts(path, content, language));
        }

        facts.push(createOwnershipHintFact(path));
        facts.push(createCapabilityHintFact(path));
      } catch (error) {
        facts.push(createCapabilityHintFact(path, {
          unreadable: true,
          reason: error instanceof Error ? error.message : String(error),
        }));
      }
    }

    return dedupeEvidenceFacts(facts);
  },
};

export default defineCapability({
  manifest: {
    id: "@rekon/capability-js-ts",
    name: "JavaScript/TypeScript Intelligence",
    version: "0.1.0",
    roles: ["evidence-provider"],
    consumes: ["SourceFile"],
    produces: ["EvidenceGraph"],
    permissions: ["read:source", "write:artifacts"],
    invalidatedBy: [
      {
        id: "source.changed",
        description: "JavaScript/TypeScript evidence is invalid when source files change.",
        paths: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
      },
    ],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    registry.evidenceProvider(jsTsProvider);
  },
});

async function listSourceFiles(ctx: ProviderContext): Promise<string[]> {
  const changedFiles = ctx.changedFiles?.filter(isSourcePath).filter((path) => !isIgnoredPath(path));

  if (ctx.incremental && changedFiles && changedFiles.length > 0) {
    return [...new Set(changedFiles)].sort();
  }

  const files: string[] = [];

  await walk(ctx.repoRoot, ctx.repoRoot, files, {
    visitedRealpaths: new Set<string>(),
    maxDepth: DEFAULT_MAX_WALK_DEPTH,
  });

  return files.sort();
}

type WalkState = {
  visitedRealpaths: Set<string>;
  maxDepth: number;
};

async function walk(
  root: string,
  directory: string,
  files: string[],
  state: WalkState,
  depth = 0,
): Promise<void> {
  if (depth > state.maxDepth) {
    return;
  }

  let directoryRealpath: string;

  try {
    directoryRealpath = await realpath(directory);
  } catch {
    return;
  }

  if (state.visitedRealpaths.has(directoryRealpath)) {
    return;
  }

  state.visitedRealpaths.add(directoryRealpath);

  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    const relativePath = normalizePath(relative(root, absolutePath));

    if (isIgnoredPath(relativePath)) {
      continue;
    }

    let stats;

    try {
      stats = await lstat(absolutePath);
    } catch {
      continue;
    }

    if (stats.isSymbolicLink()) {
      continue;
    }

    if (stats.isDirectory()) {
      await walk(root, absolutePath, files, state, depth + 1);
    } else if (stats.isFile() && isSourcePath(relativePath)) {
      files.push(relativePath);
    }
  }
}

/**
 * Append one-by-one instead of `target.push(...items)`: a single file can
 * emit enough facts (e.g. a generated module with tens of thousands of
 * exports) that spreading the per-file array overflows the call stack —
 * every spread element becomes a stack-allocated argument.
 */
function appendFacts(target: EvidenceFact[], items: EvidenceFact[]): void {
  for (const item of items) {
    target.push(item);
  }
}

function createFileFact(path: string): EvidenceFact {
  return fact("file", path, {
    path,
    extension: extensionForPath(path),
    language: languageForPath(path),
  }, path);
}

// ---------- AST -> facts -------------------------------------------------

function factsFromAstResult(path: string, result: AstExtractionResult): EvidenceFact[] {
  const facts: EvidenceFact[] = [];

  // ---- imports ----
  // Imports keep `location` in `value` to mirror the
  // legacy `line` field. Each unique (target, location)
  // remains a distinct fact, matching the legacy
  // multiple-imports-per-target behaviour.
  for (const importRecord of result.imports) {
    facts.push(
      fact(
        "import",
        `${path}:${importRecord.target}`,
        {
          source: path,
          target: importRecord.target,
          line: importRecord.location.line,
          extractionMethod: "ast" as const,
          language: result.language,
          syntaxKind: importRecord.syntaxKind,
          importKind: importRecord.importKind,
          location: importRecord.location,
          confidence: "high" as AstConfidence,
        },
        path,
        importRecord.location.line,
      ),
    );
  }

  // ---- exports ----
  // Exports intentionally OMIT `location` from `value`
  // so duplicate declarations (or repeated re-exports)
  // continue to dedupe via the canonical
  // `kind + subject + value + provenance` key, matching
  // the legacy regex behaviour.
  for (const exportRecord of result.exports) {
    const legacyKind = legacyExportKind(exportRecord);
    const value: Record<string, unknown> = {
      name: exportRecord.name,
      kind: legacyKind,
      extractionMethod: "ast" as const,
      language: result.language,
      syntaxKind: exportRecord.syntaxKind,
      exportKind: exportRecord.exportKind,
      confidence: "high" as AstConfidence,
    };
    if (exportRecord.isDefault) {
      value.default = true;
    }
    if (exportRecord.moduleSpecifier) {
      value.moduleSpecifier = exportRecord.moduleSpecifier;
    }
    facts.push(fact("export", path, value, path));
  }

  // ---- symbols ----
  // Symbols also OMIT `location` from `value` (legacy
  // dedupe parity). The richer AST classification rides
  // alongside the legacy `kind` field.
  for (const symbolRecord of result.symbols) {
    const value: Record<string, unknown> = {
      name: symbolRecord.name,
      kind: legacySymbolKind(symbolRecord),
      exported: symbolRecord.exported,
      extractionMethod: "ast" as const,
      language: result.language,
      syntaxKind: symbolRecord.syntaxKind,
      symbolKind: symbolRecord.symbolKind,
      confidence: "high" as AstConfidence,
    };
    facts.push(fact("symbol", path, value, path));
  }

  return facts;
}

// Map the AST export to the legacy `value.kind` enum
// downstream consumers (regex era) already understand.
// The richer `exportKind` rides alongside.
function legacyExportKind(record: {
  declarationKeyword:
    | "function" | "class" | "const" | "let" | "var" | "type"
    | "interface" | "namespace" | "enum" | "default" | "unknown";
  isDefault: boolean;
  exportKind: AstExportKind;
}): FileExportSymbolKind {
  if (record.isDefault) {
    return "default";
  }
  switch (record.declarationKeyword) {
    case "function":
      return "function";
    case "class":
      return "class";
    case "const":
      return "const";
    case "let":
      return "let";
    case "var":
      return "var";
    case "type":
      return "type";
    case "interface":
      return "interface";
    case "namespace":
      return "namespace";
    case "enum":
      return "namespace";
    case "default":
      return "default";
    case "unknown":
    default:
      return "unknown";
  }
}

function legacySymbolKind(record: {
  declarationKeyword:
    | "function" | "class" | "const" | "let" | "var" | "type"
    | "interface" | "namespace" | "enum" | "default" | "unknown";
}): FileExportSymbolKind {
  switch (record.declarationKeyword) {
    case "function":
      return "function";
    case "class":
      return "class";
    case "const":
      return "const";
    case "let":
      return "let";
    case "var":
      return "var";
    case "type":
      return "type";
    case "interface":
      return "interface";
    case "namespace":
      return "namespace";
    case "enum":
      return "namespace";
    case "default":
      return "default";
    case "unknown":
    default:
      return "unknown";
  }
}

// ---------- Regex fallback -----------------------------------------------

function extractImportFacts(path: string, content: string, language: AstLanguage): EvidenceFact[] {
  const facts: EvidenceFact[] = [];
  const importRegex = /\bimport\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?["']([^"']+)["']|import\(["']([^"']+)["']\)|\brequire\(["']([^"']+)["']\)/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(content))) {
    const target = match[1] ?? match[2] ?? match[3];

    if (target) {
      const line = lineForIndex(content, match.index);
      facts.push(fact("import", `${path}:${target}`, {
        source: path,
        target,
        line,
        extractionMethod: "regex-fallback" as const,
        language,
        confidence: "medium" as AstConfidence,
      }, path, line));
    }
  }

  return facts;
}

// ---------- Export / symbol facts (regex fallback) -----------------------
//
// EvidenceGraph export/symbol facts projection v1 (per the
// graph-aware filter provider v3 decision memo).
// Deterministic regex-based extraction — no AST, no type
// checker, no LLM, no semantic role inference. Conservative:
// tolerate false negatives better than false positives. Used
// only as fallback when AST parsing fails or is unsupported
// for the file. Every fallback fact is stamped with
// `extractionMethod: "regex-fallback"` and
// `confidence: "medium"` (per the JS/TS AST Evidence Adapter
// Decision).

type FileExportSymbolKind =
  | "function"
  | "class"
  | "const"
  | "let"
  | "var"
  | "type"
  | "interface"
  | "namespace"
  | "default"
  | "unknown";

const DECL_KIND_MAP: Record<string, FileExportSymbolKind> = {
  function: "function",
  class: "class",
  const: "const",
  let: "let",
  var: "var",
  type: "type",
  interface: "interface",
  namespace: "namespace",
  // enum is not in the work-order export kind enum; map to
  // namespace (TypeScript enums act as namespaces at runtime).
  enum: "namespace",
};

const NAMED_EXPORT_DECL_RE
  = /\bexport\s+(?:async\s+)?(function|class|const|let|var|type|interface|namespace|enum)\s+([A-Za-z_$][\w$]*)/g;
const DEFAULT_FUNCTION_OR_CLASS_RE
  = /\bexport\s+default\s+(?:async\s+)?(?:function|class)\b/g;
// Matches `export default <something>` for anything other than
// a function/class declaration. Negative lookahead rejects
// function/class so DEFAULT_FUNCTION_OR_CLASS_RE stays
// canonical for those forms.
const DEFAULT_EXPRESSION_RE
  = /\bexport\s+default\s+(?!(?:async\s+)?(?:function|class)\b)\S/g;
const NAMED_EXPORT_LIST_RE = /\bexport\s*\{([^}]+)\}/g;
// `export * from "..."` and `export * as alias from "..."`.
const STAR_REEXPORT_RE
  = /\bexport\s+\*(?:\s+as\s+([A-Za-z_$][\w$]*))?\s+from\s+["']([^"']+)["']/g;

function extractExportFacts(path: string, content: string, language: AstLanguage): EvidenceFact[] {
  const collected: Array<{
    name: string;
    kind: FileExportSymbolKind;
    isDefault: boolean;
    line: number;
  }> = [];

  // (1) `export function|class|const|...|namespace NAME`.
  for (const m of content.matchAll(NAMED_EXPORT_DECL_RE)) {
    const keyword = m[1];
    const name = m[2];
    if (!keyword || !name || m.index === undefined) continue;
    collected.push({
      name,
      kind: DECL_KIND_MAP[keyword] ?? "unknown",
      isDefault: false,
      line: lineForIndex(content, m.index),
    });
  }

  // (2) `export default function/class ...`.
  for (const m of content.matchAll(DEFAULT_FUNCTION_OR_CLASS_RE)) {
    if (m.index === undefined) continue;
    collected.push({
      name: "default",
      kind: "default",
      isDefault: true,
      line: lineForIndex(content, m.index),
    });
  }

  // (3) `export default <other>`.
  for (const m of content.matchAll(DEFAULT_EXPRESSION_RE)) {
    if (m.index === undefined) continue;
    collected.push({
      name: "default",
      kind: "default",
      isDefault: true,
      line: lineForIndex(content, m.index),
    });
  }

  // (4) `export { a, b as c }`.
  for (const m of content.matchAll(NAMED_EXPORT_LIST_RE)) {
    const body = m[1];
    if (!body || m.index === undefined) continue;
    const line = lineForIndex(content, m.index);
    for (const entry of body.split(",")) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/\s+as\s+/i);
      const exported = (parts.at(-1) ?? trimmed).trim();
      if (!exported || !/^[A-Za-z_$][\w$]*$|^default$/.test(exported)) continue;
      collected.push({
        name: exported,
        kind: exported === "default" ? "default" : "unknown",
        isDefault: exported === "default",
        line,
      });
    }
  }

  // (5) `export * from "..."` / `export * as alias from "..."`.
  for (const m of content.matchAll(STAR_REEXPORT_RE)) {
    if (m.index === undefined) continue;
    const alias = m[1];
    collected.push({
      name: alias ?? "*",
      kind: "namespace",
      isDefault: false,
      line: lineForIndex(content, m.index),
    });
  }

  return collected.map((entry) => {
    const value: Record<string, unknown> = entry.isDefault
      ? { name: entry.name, kind: entry.kind, default: true }
      : { name: entry.name, kind: entry.kind };
    value.extractionMethod = "regex-fallback" as const;
    value.language = language;
    value.confidence = "medium" as AstConfidence;
    return fact("export", path, value, path);
  });
}

const SYMBOL_DECL_RE
  = /(?:^|\s|;)(export\s+(?:default\s+)?)?(?:async\s+)?(function|class|const|let|var|type|interface|namespace|enum)\s+([A-Za-z_$][\w$]*)/g;

function extractSymbolFacts(path: string, content: string, language: AstLanguage): EvidenceFact[] {
  const facts: EvidenceFact[] = [];

  for (const m of content.matchAll(SYMBOL_DECL_RE)) {
    const exportedPrefix = m[1];
    const keyword = m[2];
    const name = m[3];
    if (!keyword || !name || m.index === undefined) continue;

    const value: Record<string, unknown> = {
      name,
      kind: DECL_KIND_MAP[keyword] ?? "unknown",
      exported: Boolean(exportedPrefix),
      extractionMethod: "regex-fallback" as const,
      language,
      confidence: "medium" as AstConfidence,
    };

    facts.push(fact("symbol", path, value, path));
  }

  return facts;
}

function createOwnershipHintFact(path: string): EvidenceFact {
  const segments = path.split("/");
  const owner = segments.length > 1 ? segments[0] : "root";

  return fact("ownership_hint", path, {
    path,
    system: owner,
    layer: inferLayer(path),
  }, path);
}

function createCapabilityHintFact(path: string, extra: Record<string, unknown> = {}): EvidenceFact {
  return fact("capability_hint", path, {
    path,
    capability: inferCapability(path),
    ...extra,
  }, path);
}

function fact(
  kind: string,
  subject: string,
  value: Record<string, unknown>,
  file: string,
  line?: number,
): EvidenceFact {
  return createEvidenceFact({
    id: `js-ts:${digestJson({ kind, subject, value }).slice(0, 16)}`,
    kind,
    subject,
    value,
    confidence: 0.9,
    provenance: {
      source: "repo",
      pack: "@rekon/capability-js-ts",
      file,
      line,
      extractorVersion: "0.1.0",
    },
  });
}

function isSourcePath(path: string): boolean {
  return SOURCE_EXTENSIONS.has(extensionForPath(path));
}

function isIgnoredPath(path: string): boolean {
  return normalizePath(path).split("/").some((segment) => IGNORED_SEGMENTS.has(segment));
}

function extensionForPath(path: string): string {
  const match = path.match(/\.[^.]+$/);

  return match?.[0] ?? "";
}

function languageForPath(path: string): AstLanguage {
  const extension = extensionForPath(path);

  if (extension === ".ts" || extension === ".tsx" || extension === ".mts" || extension === ".cts") {
    return "typescript";
  }

  return "javascript";
}

function inferLayer(path: string): string {
  if (path.includes("/test/") || /\.test\.[jt]sx?$/.test(path) || /\.spec\.[jt]sx?$/.test(path)) {
    return "test";
  }

  if (path.includes("/src/")) {
    return "source";
  }

  return "unknown";
}

function inferCapability(path: string): string {
  const segments = path.split("/");

  if (segments.includes("cli")) {
    return "cli";
  }

  if (segments.includes("runtime")) {
    return "runtime";
  }

  if (segments.includes("sdk")) {
    return "sdk";
  }

  return segments.length > 1 ? (segments[0] ?? "root") : "root";
}

function lineForIndex(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

function normalizePath(path: string): string {
  return path.split("\\").join("/");
}
