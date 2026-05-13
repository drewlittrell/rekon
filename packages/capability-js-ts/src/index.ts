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

function extractExportFacts(path: string, content: string): EvidenceFact[] {
  const facts: EvidenceFact[] = [];
  const exportRegex = /\bexport\s+(?:default\s+)?(?:async\s+)?(?:class|function|const|let|var|type|interface|enum)\s+([A-Za-z_$][\w$]*)|\bexport\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = exportRegex.exec(content))) {
    const directName = match[1];
    const namedExports = match[2];
    const line = lineForIndex(content, match.index);

    if (directName) {
      facts.push(fact("export", `${path}:${directName}`, {
        file: path,
        name: directName,
        line,
      }, path, line));
    }

    if (namedExports) {
      for (const name of namedExports.split(",").map((part) => part.trim()).filter(Boolean)) {
        const exportName = name.split(/\s+as\s+/i).at(-1)?.trim() ?? name;

        facts.push(fact("export", `${path}:${exportName}`, {
          file: path,
          name: exportName,
          line,
        }, path, line));
      }
    }
  }

  return facts;
}

function extractSymbolFacts(path: string, content: string): EvidenceFact[] {
  const facts: EvidenceFact[] = [];
  const symbolRegex = /\b(?:class|function|const|let|var|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;
  let match: RegExpExecArray | null;

  while ((match = symbolRegex.exec(content))) {
    const name = match[1];

    if (name) {
      const line = lineForIndex(content, match.index);

      facts.push(fact("symbol", `${path}:${name}`, {
        file: path,
        name,
        line,
      }, path, line));
    }
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
