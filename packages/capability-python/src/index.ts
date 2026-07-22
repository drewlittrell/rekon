import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { digestJson } from "@rekon/kernel-artifacts";
import {
  createEvidenceFact,
  dedupeEvidenceFacts,
  type EvidenceFact,
  type EvidenceProvider,
  type ProviderContext,
} from "@rekon/kernel-evidence";
import { defineCapability } from "@rekon/sdk";

const SOURCE_EXTENSIONS = new Set([".py", ".pyi"]);
const IGNORED_SEGMENTS = new Set([
  ".git",
  ".rekon",
  ".circe",
  ".next",
  ".venv",
  "venv",
  "env",
  "node_modules",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
  "dist",
  "build",
  "coverage",
]);
const DEFAULT_AGENT_SCRATCH_SEGMENTS = [".claude", ".codex", ".agents"] as const;
const SCAN_SCOPE_CONFIG_PATH = ".rekon/scan-scope.json";
const MAX_WALK_DEPTH = 80;

export type PythonImportEvidence = {
  module: string;
  names: string[];
  kind: "from" | "import";
  line: number;
  excerpt: string;
};

export type PythonSymbolEvidence = {
  name: string;
  qualifiedName: string;
  kind: "class" | "function" | "method";
  line: number;
  excerpt: string;
  topLevel: boolean;
};

export type PythonInjectedDependencyEvidence = {
  ownerClass: string;
  dependency: string;
  resolvedTarget: string;
  targetSymbol: string;
  methods: string[];
  line: number;
};

type PythonModuleIndex = {
  fileSet: Set<string>;
  byModule: Map<string, string[]>;
};

type PythonClassLocation = {
  path: string;
  name: string;
};

export function extractPythonImports(content: string): PythonImportEvidence[] {
  const imports: PythonImportEvidence[] = [];
  const lines = content.split(/\r?\n/u);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const excerpt = line.trim().slice(0, 240);
    const fromMatch = line.match(/^\s*from\s+([.A-Za-z_][\w.]*)\s+import\s+(.+?)(?:\s+#.*)?$/u);
    if (fromMatch?.[1] && fromMatch[2]) {
      const names = parseImportedNames(fromMatch[2]);
      imports.push({ module: fromMatch[1], names, kind: "from", line: index + 1, excerpt });
      continue;
    }

    const importMatch = line.match(/^\s*import\s+(.+?)(?:\s+#.*)?$/u);
    if (!importMatch?.[1]) continue;
    for (const imported of importMatch[1].split(",")) {
      const module = imported.trim().split(/\s+as\s+/u)[0]?.trim();
      if (!module || !/^[A-Za-z_][\w.]*$/u.test(module)) continue;
      imports.push({ module, names: [], kind: "import", line: index + 1, excerpt });
    }
  }

  return imports;
}

export function extractPythonSymbols(content: string): PythonSymbolEvidence[] {
  const symbols: PythonSymbolEvidence[] = [];
  const classStack: Array<{ name: string; indent: number }> = [];
  const lines = content.split(/\r?\n/u);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("@")) continue;
    const indent = indentation(line);
    while (classStack.length > 0 && indent <= (classStack.at(-1)?.indent ?? -1)) classStack.pop();

    const classMatch = line.match(/^\s*class\s+([A-Za-z_]\w*)\b/u);
    if (classMatch?.[1]) {
      const parent = classStack.map((entry) => entry.name);
      const qualifiedName = [...parent, classMatch[1]].join(".");
      symbols.push({
        name: classMatch[1],
        qualifiedName,
        kind: "class",
        line: index + 1,
        excerpt: trimmed.slice(0, 240),
        topLevel: indent === 0,
      });
      classStack.push({ name: classMatch[1], indent });
      continue;
    }

    const functionMatch = line.match(/^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/u);
    if (!functionMatch?.[1]) continue;
    const owner = classStack.at(-1);
    symbols.push({
      name: functionMatch[1],
      qualifiedName: owner ? `${owner.name}.${functionMatch[1]}` : functionMatch[1],
      kind: owner ? "method" : "function",
      line: index + 1,
      excerpt: trimmed.slice(0, 240),
      topLevel: !owner && indent === 0,
    });
  }

  return symbols;
}

export const pythonProvider: EvidenceProvider = {
  id: "@rekon/capability-python.provider",
  kind: "language",
  supports(ctx) {
    return Boolean(ctx.repoRoot);
  },
  async extract(ctx) {
    const scratchSegments = new Set(await loadAgentScratchSegments(ctx.repoRoot));
    const allPaths = await listPythonFiles(ctx.repoRoot, scratchSegments);
    const selectedPaths = ctx.incremental && ctx.changedFiles
      ? await normalizeChangedFiles(ctx, scratchSegments)
      : allPaths.filter((path) => ctx.includeTests || !isTestFile(path));
    const sourceByPath = new Map<string, string>();

    for (const path of allPaths) {
      try {
        sourceByPath.set(path, await readFile(join(ctx.repoRoot, path), "utf8"));
      } catch {
        // Unreadable selected files are surfaced below; unreadable index-only
        // files simply cannot participate in deterministic resolution.
      }
    }

    const moduleIndex = buildPythonModuleIndex(allPaths);
    const classes: PythonClassLocation[] = [];
    for (const [path, content] of sourceByPath) {
      for (const symbol of extractPythonSymbols(content)) {
        if (symbol.kind === "class" && symbol.topLevel) classes.push({ path, name: symbol.name });
      }
    }

    const facts: EvidenceFact[] = [];
    for (const path of selectedPaths) {
      const content = sourceByPath.get(path);
      if (content === undefined) {
        facts.push(makeFact("capability_hint", path, {
          path,
          capability: inferCapability(path),
          unreadable: true,
        }, path));
        continue;
      }

      facts.push(makeFact("file", path, {
        path,
        extension: extname(path).toLowerCase(),
        language: "python",
        digest: digestJson(content),
      }, path));

      for (const imported of extractPythonImports(content)) {
        const resolvedTarget = resolvePythonImport(path, imported, moduleIndex);
        facts.push(makeFact("import", `${path}:${imported.module}`, {
          path,
          module: imported.module,
          names: imported.names,
          importKind: imported.kind,
          ...(resolvedTarget ? { resolvedTarget } : {}),
        }, path, imported.line));
      }

      for (const symbol of extractPythonSymbols(content)) {
        facts.push(makeFact("symbol", `${path}#${symbol.qualifiedName}`, {
          path,
          name: symbol.name,
          qualifiedName: symbol.qualifiedName,
          kind: symbol.kind,
          topLevel: symbol.topLevel,
          language: "python",
        }, path, symbol.line));
        if (symbol.topLevel && !symbol.name.startsWith("_")) {
          facts.push(makeFact("export", `${path}#${symbol.name}`, {
            path,
            name: symbol.name,
            kind: symbol.kind,
            language: "python",
          }, path, symbol.line));
        }
      }

      for (const dependency of extractInjectedDependencyEvidence(path, content, classes)) {
        facts.push(makeFact("python:injected_dependency", `${path}:${dependency.ownerClass}:${dependency.dependency}`, {
          path,
          ownerClass: dependency.ownerClass,
          dependency: dependency.dependency,
          resolvedTarget: dependency.resolvedTarget,
          targetSymbol: dependency.targetSymbol,
          methods: dependency.methods,
          resolution: "unique-same-package-class-suffix",
        }, path, dependency.line, 0.8));
      }

      if (isTestFile(path)) {
        const framework = /(?:^|\n)\s*(?:from\s+pytest\b|import\s+pytest\b)/u.test(content)
          ? "pytest"
          : /(?:^|\n)\s*(?:from\s+unittest\b|import\s+unittest\b)/u.test(content)
            ? "unittest"
            : "python";
        facts.push(makeFact("test", path, { path, framework, testKind: "file" }, path));
        facts.push(makeFact("entry_point", `test:${path}`, { path, entryKind: "test", framework }, path));
      }

      facts.push(makeFact("ownership_hint", path, {
        path,
        system: path.split("/")[0] ?? "root",
        layer: isTestFile(path) ? "test" : path.includes("/src/") ? "source" : "unknown",
        basis: "inferred",
      }, path));
      facts.push(makeFact("capability_hint", path, {
        path,
        capability: inferCapability(path),
      }, path));
    }

    return dedupeEvidenceFacts(facts);
  },
};

export default defineCapability({
  manifest: {
    id: "@rekon/capability-python",
    name: "Python Intelligence",
    version: "0.1.0",
    roles: ["evidence-provider"],
    consumes: ["SourceFile"],
    produces: ["EvidenceGraph"],
    permissions: ["read:source", "write:artifacts"],
    invalidatedBy: [{
      id: "source.changed",
      description: "Python evidence is invalid when Python source files change.",
      paths: ["**/*.{py,pyi}"],
    }],
    compatibility: { rekon: "^0.1.0" },
  },
  register(registry) {
    registry.evidenceProvider(pythonProvider);
  },
});

function parseImportedNames(raw: string): string[] {
  return raw
    .replace(/[()]/gu, "")
    .split(",")
    .map((entry) => entry.trim().split(/\s+as\s+/u)[0]?.trim() ?? "")
    .filter((entry) => /^[A-Za-z_*][\w*]*$/u.test(entry));
}

function buildPythonModuleIndex(paths: string[]): PythonModuleIndex {
  const byModule = new Map<string, string[]>();
  const fileSet = new Set(paths);
  for (const path of paths) {
    let modulePath = path.replace(/\.pyi?$/u, "");
    if (modulePath.endsWith("/__init__")) modulePath = modulePath.slice(0, -"/__init__".length);
    const segments = modulePath.split("/").filter(Boolean);
    for (let start = 0; start < segments.length; start += 1) {
      const key = segments.slice(start).join(".");
      const entries = byModule.get(key) ?? [];
      if (!entries.includes(path)) entries.push(path);
      byModule.set(key, entries);
    }
  }
  return { fileSet, byModule };
}

function resolvePythonImport(
  sourcePath: string,
  imported: PythonImportEvidence,
  index: PythonModuleIndex,
): string | undefined {
  const relativeMatch = imported.module.match(/^(\.+)(.*)$/u);
  if (relativeMatch?.[1] !== undefined) {
    const parentCount = Math.max(0, relativeMatch[1].length - 1);
    const sourceDirectory = dirname(sourcePath).split("/").filter(Boolean);
    const base = sourceDirectory.slice(0, Math.max(0, sourceDirectory.length - parentCount));
    const moduleSegments = (relativeMatch[2] ?? "").split(".").filter(Boolean);
    const suffixes = moduleSegments.length > 0
      ? [moduleSegments]
      : imported.names.filter((name) => name !== "*").map((name) => [name]);
    for (const suffix of suffixes) {
      const stem = [...base, ...suffix].join("/");
      for (const candidate of [`${stem}.py`, `${stem}.pyi`, `${stem}/__init__.py`, `${stem}/__init__.pyi`]) {
        if (index.fileSet.has(candidate)) return candidate;
      }
    }
    return undefined;
  }

  const direct = index.byModule.get(imported.module) ?? [];
  if (direct.length === 1) return direct[0];
  if (imported.kind === "from") {
    for (const name of imported.names) {
      const nested = index.byModule.get(`${imported.module}.${name}`) ?? [];
      if (nested.length === 1) return nested[0];
    }
  }
  return undefined;
}

function extractInjectedDependencyEvidence(
  path: string,
  content: string,
  classes: PythonClassLocation[],
): PythonInjectedDependencyEvidence[] {
  const lines = content.split(/\r?\n/u);
  const results: PythonInjectedDependencyEvidence[] = [];

  for (let classIndex = 0; classIndex < lines.length; classIndex += 1) {
    const classLine = lines[classIndex] ?? "";
    const classMatch = classLine.match(/^(\s*)class\s+([A-Za-z_]\w*)\b/u);
    if (!classMatch?.[2]) continue;
    const classIndent = indentation(classLine);
    const classEnd = blockEnd(lines, classIndex + 1, classIndent);
    let initIndex = -1;
    let initIndent = -1;
    let parameters: string[] = [];

    for (let index = classIndex + 1; index < classEnd; index += 1) {
      const line = lines[index] ?? "";
      const match = line.match(/^\s*def\s+__init__\s*\(([^)]*)\)\s*:/u);
      if (!match?.[1]) continue;
      initIndex = index;
      initIndent = indentation(line);
      parameters = match[1]
        .split(",")
        .map((entry) => entry.trim().replace(/^\*+/u, "").split(/[:=]/u)[0]?.trim() ?? "")
        .filter((entry) => entry.length > 0 && entry !== "self" && entry !== "cls");
      break;
    }
    if (initIndex < 0) continue;

    const initEnd = blockEnd(lines, initIndex + 1, initIndent);
    const assignments = new Map<string, { line: number }>();
    for (let index = initIndex + 1; index < initEnd; index += 1) {
      const assignment = (lines[index] ?? "").match(/\bself\.([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)\b/u);
      if (!assignment?.[1] || assignment[1] !== assignment[2] || !parameters.includes(assignment[1])) continue;
      assignments.set(assignment[1], { line: index + 1 });
    }

    const used = new Map<string, Set<string>>();
    for (let index = initEnd; index < classEnd; index += 1) {
      for (const match of (lines[index] ?? "").matchAll(/\bself\.([A-Za-z_]\w*)\.([A-Za-z_]\w*)\s*\(/gu)) {
        const dependency = match[1];
        const method = match[2];
        if (!dependency || !method || !assignments.has(dependency)) continue;
        const methods = used.get(dependency) ?? new Set<string>();
        methods.add(method);
        used.set(dependency, methods);
      }
    }

    // One injected value is common wrapper plumbing. Two or more independently
    // called constructor members is the bounded orchestration shape this
    // provider is willing to surface as dependency candidates.
    if (used.size < 2) continue;

    for (const [dependency, methods] of used) {
      const normalizedDependency = normalizeIdentifier(dependency);
      const candidates = classes.filter((candidate) => (
        candidate.path !== path
        && dirname(candidate.path) === dirname(path)
        && normalizeIdentifier(candidate.name).endsWith(normalizedDependency)
      ));
      if (candidates.length !== 1) continue;
      const candidate = candidates[0];
      const assignment = assignments.get(dependency);
      if (!candidate || !assignment) continue;
      results.push({
        ownerClass: classMatch[2],
        dependency,
        resolvedTarget: candidate.path,
        targetSymbol: candidate.name,
        methods: [...methods].sort(),
        line: assignment.line,
      });
    }
  }

  return results.sort((left, right) => left.dependency.localeCompare(right.dependency));
}

async function loadAgentScratchSegments(repoRoot: string): Promise<ReadonlySet<string>> {
  try {
    const parsed = JSON.parse(await readFile(join(repoRoot, SCAN_SCOPE_CONFIG_PATH), "utf8")) as {
      agentScratchSegments?: unknown;
    };
    if (Array.isArray(parsed.agentScratchSegments)) {
      return new Set(parsed.agentScratchSegments.filter((entry): entry is string => typeof entry === "string"));
    }
  } catch {
    // Missing or malformed configuration uses the shipped safe default.
  }
  return new Set(DEFAULT_AGENT_SCRATCH_SEGMENTS);
}

async function listPythonFiles(repoRoot: string, scratchSegments: ReadonlySet<string>): Promise<string[]> {
  const files: string[] = [];
  await walk(repoRoot, repoRoot, files, scratchSegments, new Set<string>());
  return files.sort();
}

async function walk(
  repoRoot: string,
  directory: string,
  files: string[],
  scratchSegments: ReadonlySet<string>,
  visited: Set<string>,
  depth = 0,
): Promise<void> {
  if (depth > MAX_WALK_DEPTH) return;
  let directoryRealpath: string;
  try {
    directoryRealpath = await realpath(directory);
  } catch {
    return;
  }
  if (visited.has(directoryRealpath)) return;
  visited.add(directoryRealpath);

  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    const relativePath = normalizePath(relative(repoRoot, absolutePath));
    if (isIgnored(relativePath, scratchSegments)) continue;
    const stats = await lstat(absolutePath).catch(() => undefined);
    if (!stats || stats.isSymbolicLink()) continue;
    if (stats.isDirectory()) {
      await walk(repoRoot, absolutePath, files, scratchSegments, visited, depth + 1);
    } else if (stats.isFile() && SOURCE_EXTENSIONS.has(extname(relativePath).toLowerCase())) {
      files.push(relativePath);
    }
  }
}

async function normalizeChangedFiles(
  ctx: ProviderContext,
  scratchSegments: ReadonlySet<string>,
): Promise<string[]> {
  const repoRoot = resolve(ctx.repoRoot);
  const repoRealpath = await realpath(repoRoot).catch(() => repoRoot);
  const selected = new Set<string>();
  for (const rawPath of ctx.changedFiles ?? []) {
    if (typeof rawPath !== "string" || !rawPath.trim()) continue;
    const absolutePath = resolve(repoRoot, rawPath);
    if (!isPathInside(absolutePath, repoRoot)) continue;
    const stats = await lstat(absolutePath).catch(() => undefined);
    if (!stats?.isFile() || stats.isSymbolicLink()) continue;
    const fileRealpath = await realpath(absolutePath).catch(() => undefined);
    if (!fileRealpath || !isPathInside(fileRealpath, repoRealpath)) continue;
    const relativePath = normalizePath(relative(repoRealpath, fileRealpath));
    if (
      isAbsolute(relativePath)
      || relativePath === ".."
      || relativePath.startsWith("../")
      || !SOURCE_EXTENSIONS.has(extname(relativePath).toLowerCase())
      || isIgnored(relativePath, scratchSegments)
      || (!ctx.includeTests && isTestFile(relativePath))
    ) continue;
    selected.add(relativePath);
  }
  return [...selected].sort();
}

function makeFact(
  kind: string,
  subject: string,
  value: Record<string, unknown>,
  file: string,
  line?: number,
  confidence = 0.9,
): EvidenceFact {
  return createEvidenceFact({
    id: `python:${digestJson({ kind, subject, value }).slice(0, 16)}`,
    kind,
    subject,
    value,
    confidence,
    provenance: {
      source: "repo",
      pack: "@rekon/capability-python",
      file,
      ...(line ? { line } : {}),
      extractorVersion: "0.1.0",
    },
  });
}

function blockEnd(lines: string[], start: number, parentIndent: number): number {
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (indentation(line) <= parentIndent) return index;
  }
  return lines.length;
}

function indentation(line: string): number {
  const prefix = line.match(/^[ \t]*/u)?.[0] ?? "";
  return [...prefix].reduce((total, character) => total + (character === "\t" ? 4 : 1), 0);
}

function isTestFile(path: string): boolean {
  const name = path.split("/").at(-1) ?? path;
  return /(?:^|\/)tests?(?:\/|$)/u.test(path) || /^test_.+\.pyi?$/u.test(name) || /_test\.pyi?$/u.test(name);
}

function inferCapability(path: string): string {
  const name = path.split("/").at(-1)?.replace(/\.pyi?$/u, "") ?? "python";
  return name === "__init__" ? (path.split("/").at(-2) ?? "python") : name;
}

function normalizeIdentifier(value: string): string {
  return value.replace(/[^A-Za-z0-9]/gu, "").toLowerCase();
}

function normalizePath(path: string): string {
  return path.replace(/\\/gu, "/").replace(/^\.\//u, "");
}

function isIgnored(path: string, scratchSegments: ReadonlySet<string>): boolean {
  return normalizePath(path).split("/").some((segment) => (
    IGNORED_SEGMENTS.has(segment) || scratchSegments.has(segment)
  ));
}

function isPathInside(path: string, root: string): boolean {
  const relativePath = relative(resolve(root), resolve(path));
  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}
