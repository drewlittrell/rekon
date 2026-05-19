import { readdir, readFile, stat } from "node:fs/promises";
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

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);
const IGNORED_SEGMENTS = new Set(["node_modules", ".git", ".rekon", "dist", "build", "coverage"]);

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
        facts.push(...extractImportFacts(path, content));
        facts.push(...extractExportFacts(path, content));
        facts.push(...extractSymbolFacts(path, content));
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
        paths: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
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

  await walk(ctx.repoRoot, ctx.repoRoot, files);

  return files.sort();
}

async function walk(root: string, directory: string, files: string[]): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    const relativePath = normalizePath(relative(root, absolutePath));

    if (isIgnoredPath(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      await walk(root, absolutePath, files);
    } else if (entry.isFile() && isSourcePath(relativePath)) {
      files.push(relativePath);
    }
  }
}

function createFileFact(path: string): EvidenceFact {
  return fact("file", path, {
    path,
    extension: extensionForPath(path),
    language: languageForPath(path),
  }, path);
}

function extractImportFacts(path: string, content: string): EvidenceFact[] {
  const facts: EvidenceFact[] = [];
  const importRegex = /\bimport\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?["']([^"']+)["']|import\(["']([^"']+)["']\)|\brequire\(["']([^"']+)["']\)/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(content))) {
    const target = match[1] ?? match[2] ?? match[3];

    if (target) {
      facts.push(fact("import", `${path}:${target}`, {
        source: path,
        target,
        line: lineForIndex(content, match.index),
      }, path, lineForIndex(content, match.index)));
    }
  }

  return facts;
}

// ---------- Export / symbol facts (substrate v1) ----------
//
// EvidenceGraph export/symbol facts projection v1 (per the
// graph-aware filter provider v3 decision memo). Deterministic
// regex-based extraction — no AST, no type checker, no LLM, no
// semantic role inference. Conservative: tolerate false
// negatives better than false positives.
//
// Fact shape (per work order spec):
//   { kind: "export", subject: <path>, value: { name, kind, default? } }
//   { kind: "symbol", subject: <path>, value: { name, kind, exported? } }
//
// The subject is the repo-relative file path. `name`, `kind`
// (function / class / const / let / var / type / interface /
// namespace / default / unknown), and the `default` /
// `exported` flag live in `value` so multiple exports / symbols
// per file are distinct after the kernel-evidence dedupe
// (`kind + subject + value + provenance` canonical key).

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

function extractExportFacts(path: string, content: string): EvidenceFact[] {
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

  // (2) `export default function/class ...` — name is "default";
  //     kind is "default" so consumers can distinguish from
  //     named exports.
  for (const m of content.matchAll(DEFAULT_FUNCTION_OR_CLASS_RE)) {
    if (m.index === undefined) continue;
    collected.push({
      name: "default",
      kind: "default",
      isDefault: true,
      line: lineForIndex(content, m.index),
    });
  }

  // (3) `export default <other>` (anything that isn't a
  //     function/class declaration).
  for (const m of content.matchAll(DEFAULT_EXPRESSION_RE)) {
    if (m.index === undefined) continue;
    collected.push({
      name: "default",
      kind: "default",
      isDefault: true,
      line: lineForIndex(content, m.index),
    });
  }

  // (4) `export { a, b as c }` — extract the renamed half of
  //     each entry. Default re-exports (`export { default }`)
  //     are recorded with kind "default".
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

  // Note: `line` intentionally NOT included in provenance so
  // two identical declarations on different lines dedupe via
  // the kernel-evidence canonical key
  // (`kind + subject + value + provenance`). The work order
  // dedupe rule is `kind + subject + value.name + value.kind +
  // value.default/exported` — dropping line achieves that.
  return collected.map((entry) =>
    fact(
      "export",
      path,
      entry.isDefault
        ? { name: entry.name, kind: entry.kind, default: true }
        : { name: entry.name, kind: entry.kind },
      path,
    ),
  );
}

const SYMBOL_DECL_RE
  = /(?:^|\s|;)(export\s+(?:default\s+)?)?(?:async\s+)?(function|class|const|let|var|type|interface|namespace|enum)\s+([A-Za-z_$][\w$]*)/g;

function extractSymbolFacts(path: string, content: string): EvidenceFact[] {
  const facts: EvidenceFact[] = [];

  for (const m of content.matchAll(SYMBOL_DECL_RE)) {
    const exportedPrefix = m[1];
    const keyword = m[2];
    const name = m[3];
    if (!keyword || !name || m.index === undefined) continue;

    const value: { name: string; kind: FileExportSymbolKind; exported?: boolean } = {
      name,
      kind: DECL_KIND_MAP[keyword] ?? "unknown",
    };
    // Only mark exported when the declaration *itself* begins
    // with `export`. v1 is conservative — symbols re-exported
    // via a later `export { ... }` clause are NOT marked
    // exported. The export facts produced by
    // `extractExportFacts` capture the re-export side
    // independently.
    if (exportedPrefix) value.exported = true;
    else value.exported = false;

    // `line` intentionally NOT included in provenance — see
    // comment in `extractExportFacts`.
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

function languageForPath(path: string): string {
  const extension = extensionForPath(path);

  if (extension === ".ts" || extension === ".tsx") {
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
