import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
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
import { collectTypeScriptDiagnostics, type TypeScriptDiagnosticEvidence } from "./typescript-diagnostics.js";
import { analyzeSourceQuality, type SourceQualitySignal } from "./source-quality-signals.js";
import { extractFunctionComplexityMetrics, type FunctionComplexityMetrics } from "./function-complexity.js";
import { extractFrameworkConventions } from "./framework-conventions.js";

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"]);
const IGNORED_SEGMENTS = new Set([
  "node_modules",
  ".git",
  ".rekon",
  ".circe",
  ".next",
  "dist",
  ".dist",
  "build",
  "coverage",
]);
/**
 * WO-10: agent scratch trees (executor worktrees, agent workspaces) are
 * duplicated source the repo does not own; scanning them contaminates
 * the EvidenceGraph (mentor corpus: 122 of 245 detector findings).
 * Excluded at the file-walk level so NO provider path emits facts from
 * them. Operators override via .rekon/scan-scope.json
 * { "agentScratchSegments": [...] } - an explicit list REPLACES this
 * default (empty list disables), so a directory an operator declares as
 * real source is never silently swallowed. Core IGNORED_SEGMENTS are
 * correctness, not policy, and stay non-negotiable.
 */
// WO-17 Part 6: .agents is the third agent-scratch class observed in the wild.
export const DEFAULT_AGENT_SCRATCH_SEGMENTS: ReadonlyArray<string> = Object.freeze([".claude", ".codex", ".agents"]);
export const SCAN_SCOPE_CONFIG_PATH = ".rekon/scan-scope.json";
const DEFAULT_MAX_WALK_DEPTH = 80;

export async function loadAgentScratchSegments(repoRoot: string): Promise<ReadonlyArray<string>> {
  try {
    const raw = await readFile(join(repoRoot, SCAN_SCOPE_CONFIG_PATH), "utf8");
    const parsed = JSON.parse(raw) as { agentScratchSegments?: unknown };

    if (Array.isArray(parsed.agentScratchSegments)) {
      return parsed.agentScratchSegments.filter((value): value is string => typeof value === "string");
    }
  } catch {
    // Missing or malformed config -> ship the default on.
  }

  return DEFAULT_AGENT_SCRATCH_SEGMENTS;
}

export {
  type AstConfidence,
  type AstExportKind,
  type AstImportKind,
  type AstLanguage,
  type AstSymbolKind,
  type ErrorControlFlowGuard,
  type ErrorControlFlowEvidence,
  type OptionPropagationEvidence,
  type ResourceLifetimeEvidence,
  extractErrorControlFlowEvidence,
  extractOptionPropagationEvidence,
  extractResourceLifetimeEvidence,
} from "./ast-extractor.js";
export { collectTypeScriptDiagnostics, type TypeScriptDiagnosticEvidence } from "./typescript-diagnostics.js";
export {
  extractFunctionComplexityMetrics,
  type FunctionComplexityKind,
  type FunctionComplexityMetrics,
} from "./function-complexity.js";
export {
  analyzeSourceQuality,
  extractSourceQualitySignals,
  type SourceQualityAnalysis,
  type SourceQualitySignal,
  type SourceQualitySignalKind,
} from "./source-quality-signals.js";

/**
 * @internal — exposed for contract tests so the regex
 * fallback path can be exercised even when the
 * TypeScript parser tolerates the input. Not part of
 * the public API and may change between releases.
 */
export function __extractRegexFallbackFactsForTesting(
  path: string,
  content: string,
  fileSet: ReadonlySet<string> = new Set(),
): EvidenceFact[] {
  const language = languageForPath(path);
  const resolve = (specifier: string) => resolveRelativeTarget(path, specifier, fileSet);
  return [
    ...extractImportFacts(path, content, language),
    ...extractExportFacts(path, content, language),
    ...extractSymbolFacts(path, content, language),
    ...extractImportSpecifierFactsRegex(path, content, language, resolve),
    ...extractReexportFactsRegex(path, content, language, resolve),
  ];
}

// ---------- WO-14 A: debt markers as evidence facts ------------------------
//
// Deterministic content markers (detection-design-decisions.md §B): TODO /
// FIXME / HACK comments, @deprecated tags, and disabled tests. One fact per
// distinct (file, marker, detail) - location is omitted from value AND
// provenance per WO-8's id-stability discipline, so identical marker lines
// dedupe to one fact and ids never shift when code moves.

const DEBT_COMMENT_MARKER_RE = /(?:\/\/|\/\*|^\s*\*)[^\n]*?\b(TODO|FIXME|HACK)\b/;
const DEBT_DEPRECATED_RE = /^\s*(?:\/\/|\/\*+|\*)\s*@deprecated\b/;
const DEBT_DISABLED_TEST_RE = /\b(?:it|test|describe)\.skip\s*\(|(?:^|[^\w.])(?:xit|xdescribe|xtest)\s*\(/;

export function extractDebtMarkerFacts(path: string, content: string): EvidenceFact[] {
  const facts: EvidenceFact[] = [];

  for (const line of content.split("\n")) {
    const detail = line.trim().slice(0, 160);
    const comment = DEBT_COMMENT_MARKER_RE.exec(line);

    if (comment?.[1]) {
      facts.push(fact("debt_marker", path, { marker: comment[1].toLowerCase(), detail }, path));
    }

    if (DEBT_DEPRECATED_RE.test(line)) {
      facts.push(fact("debt_marker", path, { marker: "deprecated", detail }, path));
    }

    if (DEBT_DISABLED_TEST_RE.test(line)) {
      facts.push(fact("debt_marker", path, { marker: "disabled-test", detail }, path));
    }
  }

  return facts;
}

// ---------- WO-14 F: content signals for the anti-pattern pack -------------
//
// The provider observes signal PRESENCE; the policy evaluator applies the
// law (tier-aware, ratification-gated). The signal table mirrors the
// grammar antiPattern rows' declared detectionRules regexes (drift-guarded
// by contract test against the ported pack data); rows with prose
// detection rules or detectable:false are the LLM remainder and have no
// signals here. One fact per (file, signal).

const CONTENT_SIGNALS: ReadonlyArray<{ signal: string; patterns: RegExp[] }> = [
  {
    signal: "businessLogicInService",
    patterns: [/if.*state\./, /if.*phase\s*(?:===|!==)/, /if.*status\s*(?:===|!==)/],
  },
  {
    signal: "directDatabaseInService",
    patterns: [/supabase\.from\(/, /db\.(select|insert|update|delete)\(/, /\.rpc\(/],
  },
  {
    signal: "conditionalHooks",
    patterns: [/if.*\{[^}]*use[A-Z]/, /&&\s*use[A-Z]/, /\?.*use[A-Z]/],
  },
];

// WO-15: generated-file header markers (the @generated convention plus the
// AUTO-GENERATED / "Generated by" / DO NOT EDIT forms the corpus evidence
// shows). Header region only - the first lines, where generators stamp.
const GENERATED_HEADER_RE = /@generated\b|AUTO-GENERATED|DO NOT EDIT|^\s*\/\/.*Generated by /im;
const PUBLIC_API_RE = /@publicApi\b/;

export function extractContentSignalFacts(
  path: string,
  content: string,
  hasGovernedConsoleCall = analyzeSourceQuality(path, content).hasGovernedConsoleCall,
): EvidenceFact[] {
  const facts: EvidenceFact[] = [];

  if (hasGovernedConsoleCall) {
    facts.push(fact("content_signal", path, { signal: "consoleLogging" }, path));
  }

  for (const { signal, patterns } of CONTENT_SIGNALS) {
    if (patterns.some((pattern) => pattern.test(content))) {
      facts.push(fact("content_signal", path, { signal }, path));
    }
  }

  const header = content.split("\n").slice(0, 10).join("\n");

  if (GENERATED_HEADER_RE.test(header)) {
    facts.push(fact("content_signal", path, { signal: "generatedFile" }, path));
  }
  if (PUBLIC_API_RE.test(content)) {
    facts.push(fact("content_signal", path, { signal: "declaredPublicApi" }, path));
  }

  return facts;
}

export const jsTsProvider: EvidenceProvider = {
  id: "@rekon/capability-js-ts.provider",
  kind: "language",
  supports(ctx) {
    return Boolean(ctx.repoRoot);
  },
  async extract(ctx) {
    const files = await listSourceFiles(ctx);
    const repositoryFiles = ctx.incremental
      ? await listSourceFiles({ ...ctx, changedFiles: undefined, changedSince: undefined, incremental: false })
      : files;
    const facts: EvidenceFact[] = [];
    // WO-8: relative and tsconfig-alias import specifiers resolve against
    // the scanned file set so symbol-level edges become repo-path edges.
    // Incremental runs see a partial set; resolution simply finds fewer
    // targets (no false resolution, never an error).
    const fileSet = new Set(repositoryFiles);
    const aliases = await loadTsconfigPathAliases(ctx.repoRoot);
    const workspaces = await loadWorkspaceAliases(ctx.repoRoot);
    const hasVercelConfig = await isRegularRepoFile(ctx.repoRoot, "vercel.json");

    for (const path of files) {
      try {
        const absolutePath = join(ctx.repoRoot, path);
        const content = await readFile(absolutePath, "utf8");

        facts.push(createFileFact(path, content));
        const sourceQuality = analyzeSourceQuality(path, content);
        appendFacts(facts, extractDebtMarkerFacts(path, content));
        appendFacts(facts, extractContentSignalFacts(path, content, sourceQuality.hasGovernedConsoleCall));
        appendFacts(facts, sourceQuality.signals.map((signal) => createSourceQualityFact(path, signal)));
        appendFacts(facts, extractFunctionComplexityMetrics(path, content).map((metrics) => createFunctionMetricsFact(path, metrics)));

        const extension = extensionForPath(path);
        const language = languageForPath(path);
        let astFacts: EvidenceFact[] | undefined;

        const resolve = (specifier: string) => resolveRelativeTarget(path, specifier, fileSet, aliases, workspaces);

        if (astSupportsExtension(extension)) {
          try {
            const result = extractAstRecords({ path, content });
            astFacts = factsFromAstResult(path, result, resolve);
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
          appendFacts(facts, extractImportSpecifierFactsRegex(path, content, language, resolve));
          appendFacts(facts, extractReexportFactsRegex(path, content, language, resolve));
        }

        appendFacts(facts, extractRepositoryConventionFacts(path, content, astFacts, { hasVercelConfig }));
        appendFacts(facts, extractBuildConfigEntryFacts(path, content, fileSet));

        facts.push(createOwnershipHintFact(path));
        facts.push(createCapabilityHintFact(path));
      } catch (error) {
        facts.push(createCapabilityHintFact(path, {
          unreadable: true,
          reason: error instanceof Error ? error.message : String(error),
        }));
      }
    }

    // Repository-wide facts are recomputed even for an incremental observe.
    // The runtime replaces their previous versions while retaining unchanged
    // per-file facts, which keeps the resulting graph complete and current.
    appendFacts(facts, await extractPackageManifestFacts(ctx.repoRoot, fileSet));
    appendFacts(facts, collectTypeScriptDiagnostics(ctx.repoRoot, repositoryFiles).map(createTypeScriptDiagnosticFact));

    return dedupeEvidenceFacts(facts);
  },
};

function extractBuildConfigEntryFacts(
  path: string,
  content: string,
  fileSet: ReadonlySet<string>,
): EvidenceFact[] {
  if (!/(^|\/)(?:rollup|rolldown|vite|webpack)\.config\.[cm]?[jt]s$/u.test(path)) return [];
  const directory = path.split("/").slice(0, -1).join("/");
  const pattern = /\binput\s*:\s*(?:path\.)?resolve\([^)]*?['"]([^'"]+)['"]\s*\)/gu;
  const entries = new Set<string>();
  for (const match of content.matchAll(pattern)) {
    const target = match[1];
    if (!target) continue;
    const candidate = probeCandidates(normalizePath(directory ? `${directory}/${target}` : target), fileSet);
    if (candidate) entries.add(candidate);
  }
  return [...entries].sort().map((entry) => fact("entry_point", `build:${path}:${entry}`, {
    path: entry,
    entryKind: "build",
    source: "build-config",
    configPath: path,
  }, path));
}

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
  const scratchSegments = new Set(await loadAgentScratchSegments(ctx.repoRoot));
  const ignored = (path: string) => isIgnoredPath(path, scratchSegments);
  const changedFiles = await normalizeChangedSourceFiles(ctx, scratchSegments);

  if (ctx.incremental && changedFiles && changedFiles.length > 0) {
    return changedFiles;
  }

  const files: string[] = [];

  await walk(ctx.repoRoot, ctx.repoRoot, files, {
    visitedRealpaths: new Set<string>(),
    maxDepth: DEFAULT_MAX_WALK_DEPTH,
    scratchSegments,
  });

  return files
    .filter((path) => ctx.includeTests || !isTestFile(path))
    .sort();
}

async function normalizeChangedSourceFiles(
  ctx: ProviderContext,
  scratchSegments: ReadonlySet<string>,
): Promise<string[] | undefined> {
  if (!ctx.changedFiles || ctx.changedFiles.length === 0) {
    return undefined;
  }

  const repoRoot = resolve(ctx.repoRoot);
  let repoRealpath: string;

  try {
    repoRealpath = await realpath(repoRoot);
  } catch {
    repoRealpath = repoRoot;
  }

  const normalized = new Set<string>();

  for (const rawPath of ctx.changedFiles) {
    if (typeof rawPath !== "string" || rawPath.trim().length === 0) {
      continue;
    }

    const absolutePath = resolve(repoRoot, rawPath);

    if (!isPathInside(absolutePath, repoRoot)) {
      continue;
    }

    let stats;

    try {
      stats = await lstat(absolutePath);
    } catch {
      continue;
    }

    if (!stats.isFile() || stats.isSymbolicLink()) {
      continue;
    }

    let realFilePath: string;

    try {
      realFilePath = await realpath(absolutePath);
    } catch {
      continue;
    }

    if (!isPathInside(realFilePath, repoRealpath)) {
      continue;
    }

    const relativePath = relative(repoRealpath, realFilePath).replace(/\\/g, "/");

    if (isAbsolute(relativePath) || relativePath.startsWith("../") || relativePath === "..") {
      continue;
    }

    if (!isSourcePath(relativePath)
      || isIgnoredPath(relativePath, scratchSegments)
      || (!ctx.includeTests && isTestFile(relativePath))) {
      continue;
    }

    normalized.add(relativePath);
  }

  return [...normalized].sort();
}

type WalkState = {
  visitedRealpaths: Set<string>;
  maxDepth: number;
  scratchSegments: ReadonlySet<string>;
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

    if (isIgnoredPath(relativePath, state.scratchSegments)) {
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

function createFileFact(path: string, content: string): EvidenceFact {
  return fact("file", path, {
    path,
    extension: extensionForPath(path),
    language: languageForPath(path),
    digest: digestJson(content),
  }, path);
}

function createTypeScriptDiagnosticFact(diagnostic: TypeScriptDiagnosticEvidence): EvidenceFact {
  return fact(
    "typescript:diagnostic",
    `${diagnostic.path}:${diagnostic.code}:${diagnostic.line}:${diagnostic.column}`,
    {
      path: diagnostic.path,
      code: diagnostic.code,
      category: diagnostic.category,
      phase: diagnostic.phase,
      ...(diagnostic.purpose ? { purpose: diagnostic.purpose } : {}),
      message: diagnostic.message,
      line: diagnostic.line,
      column: diagnostic.column,
    },
    diagnostic.path,
    diagnostic.line,
  );
}

function createSourceQualityFact(path: string, signal: SourceQualitySignal): EvidenceFact {
  return fact(
    "typescript:source-quality",
    `${path}:${signal.kind}:${signal.line}:${signal.column}`,
    {
      path,
      signal: signal.kind,
      line: signal.line,
      column: signal.column,
      syntaxKind: signal.syntaxKind,
      ...(signal.detail ? { detail: signal.detail } : {}),
    },
    path,
    signal.line,
  );
}

function createFunctionMetricsFact(path: string, metrics: FunctionComplexityMetrics): EvidenceFact {
  return fact(
    "typescript:function-metrics",
    `${path}:${metrics.functionId}`,
    {
      path,
      ...metrics,
    },
    path,
    metrics.line,
  );
}

const HTTP_METHOD_EXPORTS = new Set(["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]);

function extractRepositoryConventionFacts(
  path: string,
  content: string,
  astFacts: EvidenceFact[] | undefined,
  options: { hasVercelConfig?: boolean } = {},
): EvidenceFact[] {
  const facts: EvidenceFact[] = [];
  const normalized = normalizePath(path);
  const exportNames = new Set(
    (astFacts ?? [])
      .filter((item) => item.kind === "export" && typeof item.value.name === "string")
      .map((item) => item.value.name as string),
  );

  for (const convention of extractFrameworkConventions(normalized, content)) {
    if (convention.kind === "route") {
      facts.push(fact("route", `${normalized}#${convention.framework}:${convention.methods.join(",")}:${convention.routePath}`, {
        path: normalized,
        framework: convention.framework,
        routePath: convention.routePath,
        methods: convention.methods,
        ...(convention.handler ? { handler: convention.handler } : {}),
      }, normalized, convention.line));
    } else {
      facts.push(fact("entry_point", `framework:${convention.framework}:${normalized}`, {
        path: normalized,
        entryKind: "framework",
        source: "framework-syntax",
        framework: convention.framework,
      }, normalized, convention.line));
    }
  }

  if (/^(?:src\/)?app\/.+\/route\.[cm]?[jt]sx?$/.test(normalized) || /^(?:src\/)?app\/route\.[cm]?[jt]sx?$/.test(normalized)) {
    facts.push(fact("route", normalized, {
      path: normalized,
      framework: "nextjs-app-router",
      routePath: nextAppRoutePath(normalized),
      methods: [...exportNames].filter((name) => HTTP_METHOD_EXPORTS.has(name)).sort(),
    }, normalized));
  } else if (/^(?:src\/)?pages\/api\/.+\.[cm]?[jt]sx?$/.test(normalized)) {
    facts.push(fact("route", normalized, {
      path: normalized,
      framework: "nextjs-pages-router",
      routePath: nextPagesRoutePath(normalized),
      methods: [],
    }, normalized));
  }

  if (/^(?:src\/)?app\/(?:.*\/)?page\.[cm]?[jt]sx?$/.test(normalized)) {
    facts.push(fact("screen", normalized, {
      path: normalized,
      framework: "nextjs-app-router",
      routePath: nextAppRoutePath(normalized),
    }, normalized));
  } else if (
    /^(?:src\/)?pages\/.+\.[cm]?[jt]sx?$/.test(normalized)
    && !/^(?:src\/)?pages\/api\//.test(normalized)
    && !/\/(?:_app|_document|_error)\.[cm]?[jt]sx?$/.test(normalized)
  ) {
    facts.push(fact("screen", normalized, {
      path: normalized,
      framework: "nextjs-pages-router",
      routePath: nextPagesRoutePath(normalized),
    }, normalized));
  }

  if (isTestFile(normalized)) {
    facts.push(fact("test", normalized, {
      path: normalized,
      framework: inferTestFramework(content),
      testKind: inferTestKind(normalized),
    }, normalized));
  }

  for (const observed of [...facts]) {
    if (observed.kind !== "route" && observed.kind !== "screen" && observed.kind !== "test") continue;
    facts.push(fact("entry_point", `${observed.kind}:${normalized}`, {
      path: normalized,
      entryKind: observed.kind,
      source: "framework-convention",
      ...(typeof observed.value.framework === "string" ? { framework: observed.value.framework } : {}),
      ...(typeof observed.value.routePath === "string" ? { routePath: observed.value.routePath } : {}),
      ...(Array.isArray(observed.value.methods) ? { handlers: observed.value.methods } : {}),
    }, normalized));
  }

  const base = normalized.split("/").at(-1) ?? normalized;
  if (/^(?:middleware|instrumentation)\.[cm]?[jt]sx?$/u.test(base)
    || /^(?:src\/)?pages\/(?:_app|_document|_error)\.[cm]?[jt]sx?$/u.test(normalized)
    || /^(?:src\/)?app\/layout\.[cm]?[jt]sx?$/u.test(normalized)
    || /^(?:src\/)?app\/(?:.*\/)?(?:robots|sitemap|manifest|icon|apple-icon|opengraph-image|twitter-image)\.[cm]?[jt]sx?$/u.test(normalized)) {
    facts.push(fact("entry_point", `framework:${normalized}`, {
      path: normalized,
      entryKind: "framework",
      source: "framework-convention",
      ...(/(?:robots|sitemap|manifest|icon|apple-icon|opengraph-image|twitter-image)\.[cm]?[jt]sx?$/u.test(normalized)
        ? { framework: "nextjs-app-router" }
        : {}),
    }, normalized));
  }
  if (options.hasVercelConfig && /^api\/.+\.[cm]?[jt]sx?$/u.test(normalized)) {
    facts.push(fact("entry_point", `framework:vercel:${normalized}`, {
      path: normalized,
      entryKind: "framework",
      source: "framework-convention",
      framework: "vercel-filesystem-function",
    }, normalized));
  }
  if (/(?:^|\/)(?:workers?\/[^/]+|[^/]+\.worker)\.[cm]?[jt]sx?$/u.test(normalized)) {
    facts.push(fact("entry_point", `worker:${normalized}`, {
      path: normalized,
      entryKind: "worker",
      source: "worker-convention",
    }, normalized));
  }
  if (/^#!.*\bnode\b/u.test(content.split("\n", 1)[0] ?? "")
    || /(?:^|\/)(?:bin|cli)\/[^/]+\.[cm]?[jt]s$/u.test(normalized)) {
    facts.push(fact("entry_point", `cli:${normalized}`, {
      path: normalized,
      entryKind: "cli",
      source: "cli-convention",
    }, normalized));
  }

  return facts;
}

async function isRegularRepoFile(repoRoot: string, relativePath: string): Promise<boolean> {
  try {
    const stats = await lstat(join(repoRoot, relativePath));
    return stats.isFile() && !stats.isSymbolicLink();
  } catch {
    return false;
  }
}

function nextAppRoutePath(path: string): string {
  const withoutPrefix = path.replace(/^src\//, "").replace(/^app\//, "");
  const segments = withoutPrefix
    .split("/")
    .slice(0, -1)
    .filter((segment) => !/^\(.*\)$/.test(segment) && !segment.startsWith("@"));
  return `/${segments.join("/")}`.replace(/\/$/, "") || "/";
}

function nextPagesRoutePath(path: string): string {
  const withoutPrefix = path.replace(/^src\//, "").replace(/^pages\//, "").replace(/\.[^.]+$/, "");
  const segments = withoutPrefix.split("/");
  if (segments.at(-1) === "index") segments.pop();
  return `/${segments.join("/")}`.replace(/\/$/, "") || "/";
}

function isTestFile(path: string): boolean {
  return /(^|\/)(?:__tests__|tests?|specs?)(\/|$)/i.test(path) || /\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(path);
}

function inferTestFramework(content: string): string {
  if (/['"]@playwright\/test['"]/.test(content)) return "playwright";
  if (/['"]vitest['"]/.test(content)) return "vitest";
  if (/['"]node:test['"]/.test(content)) return "node-test";
  if (/['"](?:jest|@jest\/globals)['"]/.test(content)) return "jest";
  if (/['"]cypress['"]/.test(content) || /\bcy\./.test(content)) return "cypress";
  if (/['"]mocha['"]/.test(content)) return "mocha";
  return "unknown";
}

function inferTestKind(path: string): string {
  const lower = path.toLowerCase();
  if (lower.includes("/e2e/") || lower.includes(".e2e.")) return "e2e";
  if (lower.includes("/integration/") || lower.includes(".integration.")) return "integration";
  return "unit";
}

async function extractPackageManifestFacts(repoRoot: string, fileSet: ReadonlySet<string>): Promise<EvidenceFact[]> {
  const scratchSegments = new Set(await loadAgentScratchSegments(repoRoot));
  const paths: string[] = [];
  await walkForPackageManifests(repoRoot, repoRoot, paths, {
    visitedRealpaths: new Set<string>(),
    maxDepth: DEFAULT_MAX_WALK_DEPTH,
    scratchSegments,
  });

  const facts: EvidenceFact[] = [];
  for (const path of paths.sort()) {
    try {
      const raw = await readFile(join(repoRoot, path), "utf8");
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const scripts = isStringRecord(parsed.scripts) ? parsed.scripts : {};
      facts.push(fact("manifest", path, {
        path,
        format: "package.json",
        digest: digestJson(raw),
        ...(typeof parsed.name === "string" ? { name: parsed.name } : {}),
        ...(typeof parsed.version === "string" ? { version: parsed.version } : {}),
        ...(typeof parsed.private === "boolean" ? { private: parsed.private } : {}),
        ...(typeof parsed.type === "string" ? { packageType: parsed.type } : {}),
        scripts: Object.keys(scripts).sort(),
      }, path));

      const packageName = typeof parsed.name === "string" ? parsed.name : path;
      const entries = collectManifestEntries(parsed);
      for (const entry of entries) {
        const target = resolveManifestEntry(path, entry.target, fileSet);
        if (!target) continue;
        facts.push(fact("entry_point", `manifest:${path}:${entry.kind}:${entry.name}`, {
          path: target,
          entryKind: entry.kind,
          source: "package-manifest",
          manifestPath: path,
          packageName,
          publicName: entry.name,
        }, path));
      }
      for (const publishedPath of collectPublishedManifestPaths(path, parsed.files, fileSet)) {
        facts.push(fact("entry_point", `manifest:${path}:published:${publishedPath}`, {
          path: publishedPath,
          entryKind: "package",
          source: "package-files",
          manifestPath: path,
          packageName,
          publicName: publishedPath,
        }, path));
      }
      for (const configured of collectManifestConfiguredEntries(parsed)) {
        const target = resolveManifestEntry(path, configured.target, fileSet);
        if (!target) continue;
        facts.push(fact("entry_point", `manifest:${path}:configured:${configured.name}:${target}`, {
          path: target,
          entryKind: "test",
          source: "package-tool-config",
          manifestPath: path,
          packageName,
          publicName: configured.name,
        }, path));
      }

      if (manifestUsesVite(parsed, scripts)) {
        const directory = path === "package.json" ? "" : path.slice(0, -"/package.json".length);
        for (const stem of ["src/main", "vite.config"]) {
          const candidate = probeCandidates(directory ? `${directory}/${stem}` : stem, fileSet);
          if (!candidate) continue;
          facts.push(fact("entry_point", `framework:vite:${candidate}`, {
            path: candidate,
            entryKind: "framework",
            source: "package-manifest",
            framework: "vite",
            manifestPath: path,
          }, path));
        }
      }

      for (const name of Object.keys(scripts).filter((script) => /^(build|test|typecheck|lint|check|verify)(:|$)/.test(script)).sort()) {
        facts.push(fact("build_target", `${path}#${name}`, {
          path,
          name,
          command: scripts[name],
          runner: "npm-script",
        }, path));
      }
    } catch {
      facts.push(fact("manifest", path, { path, format: "package.json", valid: false }, path));
    }
  }
  return facts;
}

function manifestUsesVite(manifest: Record<string, unknown>, scripts: Record<string, string>): boolean {
  const dependencyFields = [manifest.dependencies, manifest.devDependencies, manifest.peerDependencies];
  return dependencyFields.some((field) => isStringRecord(field) && typeof field.vite === "string")
    || Object.values(scripts).some((command) => /(?:^|\s|\/|\\)vite(?:\s|$)/u.test(command));
}

function collectManifestEntries(manifest: Record<string, unknown>): Array<{ kind: "package" | "cli"; name: string; target: string }> {
  const entries: Array<{ kind: "package" | "cli"; name: string; target: string }> = [];
  for (const field of ["source", "main", "module"] as const) {
    if (typeof manifest[field] === "string") entries.push({ kind: "package", name: field, target: manifest[field] });
  }
  collectExportTargets(manifest.exports, ".", entries);
  collectExportTargets(manifest.imports, "#imports", entries);
  if (typeof manifest.bin === "string") {
    entries.push({ kind: "cli", name: typeof manifest.name === "string" ? manifest.name : "bin", target: manifest.bin });
  } else if (manifest.bin && typeof manifest.bin === "object" && !Array.isArray(manifest.bin)) {
    for (const [name, target] of Object.entries(manifest.bin)) {
      if (typeof target === "string") entries.push({ kind: "cli", name, target });
    }
  }
  return entries;
}

function collectPublishedManifestPaths(
  manifestPath: string,
  value: unknown,
  fileSet: ReadonlySet<string>,
): string[] {
  if (!Array.isArray(value)) return [];
  const directory = manifestPath === "package.json" ? "" : manifestPath.slice(0, -"/package.json".length);
  const patterns = value.filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.replace(/^\.\//u, "").replaceAll("\\", "/"));
  return [...fileSet]
    .filter((path) => {
      const relativePath = directory && path.startsWith(`${directory}/`) ? path.slice(directory.length + 1) : directory ? "" : path;
      return relativePath.length > 0 && patterns.some((pattern) => manifestFilePatternMatches(relativePath, pattern));
    })
    .sort();
}

function manifestFilePatternMatches(path: string, pattern: string): boolean {
  if (!pattern.includes("*")) return path === pattern || path.startsWith(`${pattern.replace(/\/$/u, "")}/`);
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/gu, "\\$&")
    .replace(/\*\*\//gu, "\u0000")
    .replace(/\*\*/gu, "\u0001")
    .replace(/\*/gu, "[^/]*")
    .replaceAll("\u0000", "(?:.*/)?")
    .replaceAll("\u0001", ".*");
  return new RegExp(`^${escaped}$`, "u").test(path);
}

function collectManifestConfiguredEntries(manifest: Record<string, unknown>): Array<{ name: string; target: string }> {
  const entries: Array<{ name: string; target: string }> = [];
  const collect = (tool: string, field: string): void => {
    const config = manifest[tool];
    if (!config || typeof config !== "object" || Array.isArray(config)) return;
    const value = (config as Record<string, unknown>)[field];
    const targets = typeof value === "string" ? [value] : Array.isArray(value) ? value : [];
    for (const target of targets) {
      if (typeof target === "string") entries.push({ name: `${tool}.${field}`, target });
    }
  };
  for (const [tool, field] of [
    ["mocha", "require"],
    ["ava", "require"],
    ["nyc", "require"],
    ["jest", "setupFiles"],
    ["jest", "setupFilesAfterEnv"],
    ["vitest", "setupFiles"],
  ] as const) collect(tool, field);
  return entries;
}

function collectExportTargets(
  value: unknown,
  name: string,
  entries: Array<{ kind: "package" | "cli"; name: string; target: string }>,
): void {
  if (typeof value === "string") {
    entries.push({ kind: "package", name, target: value });
    return;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    collectExportTargets(nested, key.startsWith(".") ? key : name, entries);
  }
}

function resolveManifestEntry(manifestPath: string, target: string, fileSet: ReadonlySet<string>): string | undefined {
  const direct = resolveRelativeTarget(manifestPath, target, fileSet);
  if (direct) return direct;
  const normalized = normalizePath(join(manifestPath.split("/").slice(0, -1).join("/"), target.replace(/^\.\//u, "")));
  const sourceCandidate = normalized.replace(/(^|\/)(?:dist|lib)\//u, "$1src/").replace(/\.(?:mjs|cjs|js|jsx)$/u, "");
  return [sourceCandidate, ...[".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"].map((extension) => `${sourceCandidate}${extension}`)]
    .find((candidate) => fileSet.has(candidate));
}

async function walkForPackageManifests(
  root: string,
  directory: string,
  paths: string[],
  state: WalkState,
  depth = 0,
): Promise<void> {
  if (depth > state.maxDepth) return;
  let directoryRealpath: string;
  try {
    directoryRealpath = await realpath(directory);
  } catch {
    return;
  }
  if (state.visitedRealpaths.has(directoryRealpath)) return;
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
    if (isIgnoredPath(relativePath, state.scratchSegments)) continue;
    let stats;
    try {
      stats = await lstat(absolutePath);
    } catch {
      continue;
    }
    if (stats.isSymbolicLink()) continue;
    if (stats.isDirectory()) {
      await walkForPackageManifests(root, absolutePath, paths, state, depth + 1);
    } else if (stats.isFile() && entry.name === "package.json") {
      paths.push(relativePath);
    }
  }
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
    && Object.values(value as Record<string, unknown>).every((item) => typeof item === "string");
}

// ---------- AST -> facts -------------------------------------------------

function factsFromAstResult(
  path: string,
  result: AstExtractionResult,
  resolve: (specifier: string) => string | undefined,
): EvidenceFact[] {
  const facts: EvidenceFact[] = [];
  const importBindings = new Map(result.importSpecifiers.flatMap((specifier) => {
    const targetFile = resolve(specifier.target);
    return targetFile ? [[specifier.local, { specifier, targetFile }] as const] : [];
  }));
  const allImportBindings = new Map(result.importSpecifiers.map((specifier) => [specifier.local, specifier] as const));
  const localFunctions = new Set(result.symbols
    .filter((symbol) => symbol.symbolKind === "function" || symbol.symbolKind === "method")
    .map((symbol) => symbol.ownerName ? `${symbol.ownerName}.${symbol.name}` : symbol.name));
  const localClasses = new Set(result.symbols.filter((symbol) => symbol.symbolKind === "class").map((symbol) => symbol.name));

  // ---- imports ----
  // Imports keep `location` in `value` to mirror the
  // legacy `line` field. Each unique (target, location)
  // remains a distinct fact, matching the legacy
  // multiple-imports-per-target behaviour.
  for (const importRecord of result.imports) {
    const resolvedTarget = resolve(importRecord.target);
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
          ...(resolvedTarget ? { resolvedTarget } : {}),
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

  // ---- import specifiers (WO-8) ----
  // Symbol-level import edges. Like exports, `location` is OMITTED from
  // `value` so repeated identical imports dedupe to one fact; the line
  // rides in provenance only.
  for (const spec of result.importSpecifiers) {
    const value: Record<string, unknown> = {
      source: path,
      target: spec.target,
      name: spec.name,
      local: spec.local,
      specifierKind: spec.specifierKind,
      extractionMethod: "ast" as const,
      language: result.language,
      confidence: "high" as AstConfidence,
    };
    if (spec.typeOnly) {
      value.typeOnly = true;
    }
    const resolvedTarget = resolve(spec.target);
    if (resolvedTarget) {
      value.resolvedTarget = resolvedTarget;
    }
    // Line is omitted from provenance too (not just value): the fact id
    // hashes kind+subject+value, so a line-bearing provenance would let
    // two facts share an id while failing to dedupe.
    facts.push(fact("import_specifier", `${path}:${spec.target}:${spec.name}`, value, path));
  }

  // ---- re-exports (WO-8) ----
  for (const reexport of result.reexports) {
    const value: Record<string, unknown> = {
      source: path,
      target: reexport.target,
      name: reexport.name,
      exportedAs: reexport.exportedAs,
      reexportKind: reexport.reexportKind,
      extractionMethod: "ast" as const,
      language: result.language,
      confidence: "high" as AstConfidence,
    };
    if (reexport.typeOnly) {
      value.typeOnly = true;
    }
    const resolvedTarget = resolve(reexport.target);
    if (resolvedTarget) {
      value.resolvedTarget = resolvedTarget;
    }
    facts.push(fact("reexport", `${path}:${reexport.target}:${reexport.exportedAs}`, value, path));
  }

  // ---- direct calls ----
  // Calls become graph evidence only when syntax and import bindings identify
  // a concrete repository file and callable. Receiver type inference is out of
  // scope; ambiguous object-property calls are intentionally omitted.
  for (const call of result.calls) {
    let targetFile: string | undefined;
    let targetSymbol: string | undefined;
    let resolution: string | undefined;
    if (!call.receiver) {
      const imported = importBindings.get(call.callee);
      if (imported && imported.specifier.specifierKind !== "namespace" && imported.specifier.specifierKind !== "side-effect") {
        targetFile = imported.targetFile;
        targetSymbol = imported.specifier.name;
        resolution = "import-binding";
      } else if (localFunctions.has(call.callee)) {
        targetFile = path;
        targetSymbol = call.callee;
        resolution = "local-binding";
      }
    } else if (call.receiver === "this") {
      const className = call.caller.includes(".") ? call.caller.split(".")[0] : undefined;
      const qualified = className ? `${className}.${call.callee}` : undefined;
      if (qualified && localFunctions.has(qualified)) {
        targetFile = path;
        targetSymbol = qualified;
        resolution = "this-method";
      }
    } else {
      const imported = importBindings.get(call.receiver);
      if (imported?.specifier.specifierKind === "namespace") {
        targetFile = imported.targetFile;
        targetSymbol = call.callee;
        resolution = "namespace-import";
      } else if (localClasses.has(call.receiver) && localFunctions.has(`${call.receiver}.${call.callee}`)) {
        targetFile = path;
        targetSymbol = `${call.receiver}.${call.callee}`;
        resolution = "class-method";
      }
    }
    if (!targetFile || !targetSymbol || !resolution) continue;
    facts.push(fact("call", `${path}:${call.caller}->${targetFile}:${targetSymbol}`, {
      source: path,
      caller: call.caller,
      targetFile,
      targetSymbol,
      callKind: call.callKind,
      resolution,
      extractionMethod: "ast" as const,
      language: result.language,
      confidence: "high" as AstConfidence,
    }, path));
  }

  // ---- deterministic behavior signals ----
  for (const flow of result.flows) {
    if (flow.kind === "event") {
      facts.push(fact("event_flow", `${path}:${flow.caller}:${flow.action}:${flow.eventName}`, {
        source: path,
        caller: flow.caller,
        action: flow.action,
        eventName: flow.eventName,
        receiver: flow.receiver,
        extractionMethod: "ast" as const,
        confidence: "high" as AstConfidence,
      }, path));
      continue;
    }
    if (flow.kind === "error") {
      facts.push(fact("error_flow", `${path}:${flow.caller}:${flow.action}:${flow.location.line}:${flow.location.column}`, {
        source: path,
        caller: flow.caller,
        action: flow.action,
        ...(flow.errorName ? { errorName: flow.errorName } : {}),
        ...(flow.errorIdentity ? { errorIdentity: flow.errorIdentity } : {}),
        expressionKind: flow.expressionKind,
        guards: flow.guards,
        line: flow.location.line,
        column: flow.location.column,
        extractionMethod: "ast" as const,
        confidence: "high" as AstConfidence,
      }, path, flow.location.line));
      continue;
    }
    if (flow.kind === "option-override") {
      facts.push(fact("option_flow", `${path}:${flow.caller}:${flow.property}:${flow.location.line}:${flow.location.column}`, {
        source: path,
        caller: flow.caller,
        property: flow.property,
        spreadSource: flow.spreadSource,
        overrideSource: flow.overrideSource,
        overrideExpression: flow.overrideExpression,
        overrideKind: flow.overrideKind,
        ...(flow.fallbackOperator ? { fallbackOperator: flow.fallbackOperator } : {}),
        ...(flow.fallbackTarget ? { fallbackTarget: flow.fallbackTarget } : {}),
        preservesSpreadValue: flow.preservesSpreadValue,
        ...(flow.callbackParameter ? { callbackParameter: flow.callbackParameter } : {}),
        ...(flow.callbackProperty ? { callbackProperty: flow.callbackProperty } : {}),
        ...(flow.callbackOwner ? { callbackOwner: flow.callbackOwner } : {}),
        line: flow.location.line,
        column: flow.location.column,
        extractionMethod: "ast" as const,
        confidence: "high" as AstConfidence,
      }, path, flow.location.line));
      continue;
    }
    if (flow.kind === "resource-lifetime") {
      facts.push(fact("resource_flow", `${path}:${flow.resource}:${flow.action}:${flow.location.line}:${flow.location.column}`, {
        source: path,
        caller: flow.caller,
        action: flow.action,
        resource: flow.resource,
        target: flow.target,
        ownerKind: flow.ownerKind,
        ...(flow.retainedNames ? { retainedNames: flow.retainedNames } : {}),
        line: flow.location.line,
        column: flow.location.column,
        extractionMethod: "ast" as const,
        confidence: "high" as AstConfidence,
      }, path, flow.location.line));
      continue;
    }
    const binding = allImportBindings.get(flow.root);
    if (!binding || !isKnownStatePackage(binding.target)) continue;
    facts.push(fact("state_access", `${path}:${flow.caller}:${binding.target}:${flow.members.join(".")}`, {
      source: path,
      caller: flow.caller,
      package: binding.target,
      binding: flow.root,
      operation: flow.members.join("."),
      extractionMethod: "ast" as const,
      confidence: "high" as AstConfidence,
    }, path));
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
    if (symbolRecord.ownerName) value.ownerName = symbolRecord.ownerName;
    facts.push(fact("symbol", path, value, path));
  }

  return facts;
}

function isKnownStatePackage(target: string): boolean {
  return /^(?:@prisma\/client|drizzle-orm(?:\/|$)|typeorm$|mongoose$|sequelize$|knex$|@supabase\/supabase-js$|firebase(?:\/|$)|ioredis$|redis$)/u.test(target);
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
    basis: "inferred",
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

function isIgnoredPath(
  path: string,
  scratchSegments: ReadonlySet<string> = new Set(DEFAULT_AGENT_SCRATCH_SEGMENTS),
): boolean {
  const normalized = normalizePath(path);

  // WO-17 Part 6: root-level .tmp-* files are working scratch, never source.
  if (/^\.tmp-[^/]*$/.test(normalized)) {
    return true;
  }

  return normalized
    .split("/")
    .some((segment) => IGNORED_SEGMENTS.has(segment) || scratchSegments.has(segment));
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

function isPathInside(path: string, root: string): boolean {
  const relativePath = relative(resolve(root), resolve(path));

  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

// ---------- WO-8: import-specifier + re-export facts (regex fallback) -----

const IMPORT_CLAUSE_RE
  = /\bimport\s+(type\s+)?([^'";]*?)\s*from\s*["']([^"']+)["']|\bimport\s*["']([^"']+)["']/g;
const REEXPORT_NAMED_RE
  = /\bexport\s+(type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;
const REEXPORT_STAR_RE
  = /\bexport\s+\*(?:\s+as\s+([A-Za-z_$][\w$]*))?\s+from\s+["']([^"']+)["']/g;

function extractImportSpecifierFactsRegex(
  path: string,
  content: string,
  language: AstLanguage,
  resolve: (specifier: string) => string | undefined,
): EvidenceFact[] {
  const facts: EvidenceFact[] = [];
  const push = (
    target: string,
    name: string,
    local: string,
    specifierKind: string,
    typeOnly: boolean,
    line: number,
  ) => {
    const value: Record<string, unknown> = {
      source: path,
      target,
      name,
      local,
      specifierKind,
      extractionMethod: "regex-fallback" as const,
      language,
      confidence: "medium" as AstConfidence,
    };
    if (typeOnly) {
      value.typeOnly = true;
    }
    const resolvedTarget = resolve(target);
    if (resolvedTarget) {
      value.resolvedTarget = resolvedTarget;
    }
    facts.push(fact("import_specifier", `${path}:${target}:${name}`, value, path));
  };

  for (const m of content.matchAll(IMPORT_CLAUSE_RE)) {
    if (m.index === undefined) continue;
    const line = lineForIndex(content, m.index);
    const sideEffectTarget = m[4];

    if (sideEffectTarget) {
      push(sideEffectTarget, "*", "*", "side-effect", false, line);
      continue;
    }

    const typeOnly = Boolean(m[1]);
    const clause = (m[2] ?? "").trim();
    const target = m[3];
    if (!target) continue;

    if (!clause) {
      push(target, "*", "*", "side-effect", typeOnly, line);
      continue;
    }

    // `* as ns` (possibly after a default: `d, * as ns`).
    const namespaceMatch = clause.match(/\*\s*as\s+([A-Za-z_$][\w$]*)/);
    // Leading default binding (an identifier before `,` or alone).
    const defaultMatch = clause.match(/^([A-Za-z_$][\w$]*)\s*(?:,|$)/);
    const namedMatch = clause.match(/\{([^}]*)\}/);

    if (defaultMatch?.[1]) {
      push(target, "default", defaultMatch[1], "default", typeOnly, line);
    }
    if (namespaceMatch?.[1]) {
      push(target, "*", namespaceMatch[1], "namespace", typeOnly, line);
    }
    if (namedMatch?.[1] !== undefined) {
      for (const entry of namedMatch[1].split(",")) {
        let trimmed = entry.trim();
        if (!trimmed) continue;
        const entryTypeOnly = /^type\s+/.test(trimmed);
        trimmed = trimmed.replace(/^type\s+/, "");
        const parts = trimmed.split(/\s+as\s+/);
        const name = parts[0]?.trim();
        const local = (parts[1] ?? parts[0])?.trim();
        if (!name || !/^[A-Za-z_$][\w$]*$|^default$/.test(name)) continue;
        push(target, name, local ?? name, "named", typeOnly || entryTypeOnly, line);
      }
    }
  }

  return facts;
}

function extractReexportFactsRegex(
  path: string,
  content: string,
  language: AstLanguage,
  resolve: (specifier: string) => string | undefined,
): EvidenceFact[] {
  const facts: EvidenceFact[] = [];
  const push = (
    target: string,
    name: string,
    exportedAs: string,
    reexportKind: string,
    typeOnly: boolean,
    line: number,
  ) => {
    const value: Record<string, unknown> = {
      source: path,
      target,
      name,
      exportedAs,
      reexportKind,
      extractionMethod: "regex-fallback" as const,
      language,
      confidence: "medium" as AstConfidence,
    };
    if (typeOnly) {
      value.typeOnly = true;
    }
    const resolvedTarget = resolve(target);
    if (resolvedTarget) {
      value.resolvedTarget = resolvedTarget;
    }
    facts.push(fact("reexport", `${path}:${target}:${exportedAs}`, value, path));
  };

  for (const m of content.matchAll(REEXPORT_STAR_RE)) {
    if (m.index === undefined || !m[2]) continue;
    const alias = m[1];
    push(m[2], "*", alias ?? "*", alias ? "namespace" : "star", false, lineForIndex(content, m.index));
  }

  for (const m of content.matchAll(REEXPORT_NAMED_RE)) {
    if (m.index === undefined || !m[3]) continue;
    const typeOnly = Boolean(m[1]);
    const line = lineForIndex(content, m.index);
    for (const entry of (m[2] ?? "").split(",")) {
      let trimmed = entry.trim();
      if (!trimmed) continue;
      const entryTypeOnly = /^type\s+/.test(trimmed);
      trimmed = trimmed.replace(/^type\s+/, "");
      const parts = trimmed.split(/\s+as\s+/);
      const name = parts[0]?.trim();
      const exportedAs = (parts[1] ?? parts[0])?.trim();
      if (!name || !/^[A-Za-z_$][\w$]*$|^default$/.test(name)) continue;
      push(m[3], name, exportedAs ?? name, "named", typeOnly || entryTypeOnly, line);
    }
  }

  return facts;
}

// ---------- WO-8: relative-target resolution -------------------------------
//
// Pure and deterministic: relative paths plus declared tsconfig and workspace
// aliases, with a fixed candidate order probed against the scanned file set.
// A miss yields no resolvedTarget - never a guess.

const RESOLUTION_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];

export function resolveRelativeTarget(
  sourcePath: string,
  specifier: string,
  fileSet: ReadonlySet<string>,
  aliases: ReadonlyArray<TsconfigPathAlias> = [],
  workspaces: ReadonlyArray<WorkspaceAlias> = [],
): string | undefined {
  if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
    // tsconfig path aliases (declared, never guessed).
    for (const alias of aliases) {
      if (alias.wildcard ? specifier.startsWith(alias.prefix) : specifier === alias.prefix) {
        const suffix = alias.wildcard ? specifier.slice(alias.prefix.length) : "";

        for (const target of alias.targets) {
          const joined = normalizePath(`${target}${suffix}`).replace(/^\.\//, "");
          const resolved = probeCandidates(joined, fileSet);

          if (resolved) {
            return resolved;
          }
        }
      }
    }

    // WO-14 B: workspace package names (declared in workspace manifests,
    // read as data - the WO-8 tsconfig-alias precedent). An export
    // consumed through its package name must not read as dead.
    for (const ws of workspaces) {
      if (specifier === ws.name) {
        for (const entry of ws.entries) {
          const resolved = probeCandidates(entry, fileSet) ?? (fileSet.has(entry) ? entry : undefined);

          if (resolved) {
            return resolved;
          }
        }
      } else if (specifier.startsWith(`${ws.name}/`)) {
        const sub = specifier.slice(ws.name.length + 1);
        const declaredExports = ws.exports ?? [];
        for (const declared of declaredExports) {
          const capture = matchWorkspaceExport(declared.subpath, `./${sub}`);
          if (capture === undefined) continue;
          for (const target of declared.targets) {
            const expanded = capture === null ? target : target.replaceAll("*", capture);
            for (const candidate of workspaceTargetCandidates(ws.dir, expanded)) {
              const resolved = probeCandidates(candidate, fileSet) ?? (fileSet.has(candidate) ? candidate : undefined);
              if (resolved) return resolved;
            }
          }
        }

        // A package exports map is authoritative. Do not invent access to a
        // subpath that the package did not declare.
        if (declaredExports.length > 0) continue;

        const resolved = probeCandidates(`${ws.dir}/${sub}`, fileSet)
          ?? probeCandidates(`${ws.dir}/src/${sub}`, fileSet);

        if (resolved) {
          return resolved;
        }
      }
    }

    return undefined;
  }

  const base = sourcePath.split("/").slice(0, -1);

  for (const segment of specifier.split("/")) {
    if (segment === "." || segment === "") {
      continue;
    }
    if (segment === "..") {
      if (base.length === 0) {
        return undefined;
      }
      base.pop();
    } else {
      base.push(segment);
    }
  }

  return probeCandidates(base.join("/"), fileSet);
}

// ---------- WO-14 B: workspace-name aliases (data read only) ---------------
//
// Reads the root manifest's `workspaces` globs and each member package's
// `name` + entry fields. Same fail-soft discipline as tsconfig aliases:
// any read or parse failure yields zero aliases - resolution degrades,
// never errors and never guesses.

export type WorkspaceAlias = {
  /** Package name as imported (e.g. "@rekon/kernel-evidence"). */
  name: string;
  /** Repo-relative package directory. */
  dir: string;
  /** Repo-relative entry candidates (manifest main/exports + src/index conventions). */
  entries: string[];
  /** Declared package export subpaths. Targets remain manifest-relative until matched. */
  exports?: WorkspaceExportAlias[];
};

export type WorkspaceExportAlias = {
  /** Package export key such as ".", "./feature", or "./features/*". */
  subpath: string;
  /** Manifest-relative conditional target leaves for this subpath. */
  targets: string[];
};

export async function loadWorkspaceAliases(repoRoot: string): Promise<WorkspaceAlias[]> {
  try {
    const rootRaw = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8")) as {
      workspaces?: string[] | { packages?: string[] };
    };
    const globs = Array.isArray(rootRaw.workspaces)
      ? rootRaw.workspaces
      : rootRaw.workspaces?.packages ?? [];
    const dirs: string[] = [];

    for (const glob of globs) {
      if (glob.endsWith("/*")) {
        const parent = glob.slice(0, -2);

        try {
          const children = await readdir(join(repoRoot, parent), { withFileTypes: true });

          for (const child of children.filter((c) => c.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
            dirs.push(`${parent}/${child.name}`);
          }
        } catch {
          // Missing parent directory - skip the glob.
        }
      } else if (!glob.includes("*")) {
        dirs.push(glob);
      }
    }

    const aliases: WorkspaceAlias[] = [];

    for (const dir of dirs) {
      try {
        const pkg = JSON.parse(await readFile(join(repoRoot, dir, "package.json"), "utf8")) as {
          name?: string;
          main?: string;
          exports?: unknown;
        };

        if (typeof pkg.name !== "string" || pkg.name.length === 0) {
          continue;
        }

        const entries = new Set<string>();
        const addEntry = (rel: string) => {
          for (const candidate of workspaceTargetCandidates(dir, rel)) entries.add(candidate);
        };

        if (typeof pkg.main === "string") {
          addEntry(pkg.main);
        }

        const exportRoot = (pkg.exports as Record<string, unknown> | string | undefined);
        const exportAliases = collectWorkspaceExportAliases(exportRoot);

        if (typeof exportRoot === "string") {
          addEntry(exportRoot);
        } else if (exportRoot && typeof exportRoot === "object") {
          for (const target of exportAliases.find((entry) => entry.subpath === ".")?.targets ?? []) addEntry(target);
        }

        entries.add(`${dir}/src/index.ts`);
        entries.add(`${dir}/src/index.tsx`);
        entries.add(`${dir}/index.ts`);

        aliases.push({
          name: pkg.name,
          dir,
          entries: [...entries],
          ...(exportAliases.length > 0 ? { exports: exportAliases } : {}),
        });
      } catch {
        // Unreadable member manifest - skip the package.
      }
    }

    return aliases;
  } catch {
    return [];
  }
}

function collectWorkspaceExportAliases(value: unknown): WorkspaceExportAlias[] {
  if (typeof value === "string") return [{ subpath: ".", targets: [value] }];
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const record = value as Record<string, unknown>;
  const subpathEntries = Object.entries(record).filter(([key]) => key === "." || key.startsWith("./"));
  const entries = subpathEntries.length > 0 ? subpathEntries : [[".", value] as const];
  return entries
    .map(([subpath, target]) => ({ subpath, targets: collectStringLeaves(target) }))
    .filter((entry) => entry.targets.length > 0)
    .sort((left, right) => right.subpath.length - left.subpath.length || left.subpath.localeCompare(right.subpath));
}

function collectStringLeaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return [...new Set(value.flatMap(collectStringLeaves))];
  if (!value || typeof value !== "object") return [];
  return [...new Set(Object.values(value as Record<string, unknown>).flatMap(collectStringLeaves))];
}

function matchWorkspaceExport(pattern: string, requested: string): string | null | undefined {
  if (pattern === requested) return null;
  const star = pattern.indexOf("*");
  if (star < 0) return undefined;
  const prefix = pattern.slice(0, star);
  const suffix = pattern.slice(star + 1);
  if (!requested.startsWith(prefix) || !requested.endsWith(suffix)) return undefined;
  return requested.slice(prefix.length, requested.length - suffix.length);
}

function workspaceTargetCandidates(dir: string, target: string): string[] {
  const normalized = `${dir}/${target.replace(/^\.\//, "")}`;
  const source = normalized
    .replace(/^((?:[^/]+\/)*[^/]+)\/(?:dist|lib)\//, "$1/src/")
    .replace(/\.(?:mjs|cjs|js|jsx)$/, ".ts");
  return normalized === source ? [normalized] : [normalized, source];
}

// ---------- WO-8: tsconfig path-alias resolution (data read only) ---------
//
// The AST adapter stays parser-only (no ts.Program, no typechecker); the
// PROVIDER may read tsconfig.json `compilerOptions.paths` as plain data so
// alias imports (`@/components/x`) resolve to repo paths the same way
// relative imports do. Tolerant of JSONC (comments, trailing commas);
// any parse failure yields zero aliases - resolution degrades, never
// errors and never guesses.

export type TsconfigPathAlias = {
  /** Alias prefix before `*` (e.g. "@/"), or the full key for exact aliases. */
  prefix: string;
  /** Target prefixes before `*`, repo-relative (e.g. "src/"). */
  targets: string[];
  /** Whether the alias key ended with `*`. */
  wildcard: boolean;
};

export async function loadTsconfigPathAliases(repoRoot: string): Promise<TsconfigPathAlias[]> {
  let raw: string;

  try {
    raw = await readFile(join(repoRoot, "tsconfig.json"), "utf8");
  } catch {
    return [];
  }

  let parsed: { compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> } };

  try {
    parsed = JSON.parse(stripJsonc(raw));
  } catch {
    return [];
  }

  const paths = parsed.compilerOptions?.paths;

  if (!paths || typeof paths !== "object") {
    return [];
  }

  const baseUrl = normalizePath(parsed.compilerOptions?.baseUrl ?? ".").replace(/^\.\/?/, "").replace(/\/$/, "");
  const aliases: TsconfigPathAlias[] = [];

  for (const key of Object.keys(paths).sort()) {
    const values = paths[key];

    if (!Array.isArray(values)) {
      continue;
    }

    const wildcard = key.endsWith("*");
    const prefix = wildcard ? key.slice(0, -1) : key;
    const targets: string[] = [];

    for (const value of values) {
      if (typeof value !== "string") {
        continue;
      }
      const stem = (wildcard && value.endsWith("*") ? value.slice(0, -1) : value)
        .replace(/^\.\//, "")
        .replace(/^\//, "");
      targets.push(normalizePath(baseUrl ? `${baseUrl}/${stem}` : stem).replace(/^\.\//, ""));
    }

    if (targets.length > 0) {
      aliases.push({ prefix, targets, wildcard });
    }
  }

  // Longest prefix first so the most specific alias wins deterministically.
  return aliases.sort((a, b) => b.prefix.length - a.prefix.length || a.prefix.localeCompare(b.prefix));
}

function probeCandidates(joined: string, fileSet: ReadonlySet<string>): string | undefined {
  const candidates: string[] = [joined];
  const jsStyle = joined.match(/^(.*)\.(js|mjs|cjs)$/);

  if (jsStyle?.[1]) {
    const stem = jsStyle[1];
    candidates.push(`${stem}.ts`, `${stem}.tsx`, `${stem}.mts`, `${stem}.cts`);
  }

  for (const extension of RESOLUTION_EXTENSIONS) {
    candidates.push(`${joined}${extension}`);
  }
  for (const extension of RESOLUTION_EXTENSIONS) {
    candidates.push(`${joined}/index${extension}`);
  }

  for (const candidate of candidates) {
    if (fileSet.has(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * String-aware JSONC stripper: removes // and block comments and trailing
 * commas WITHOUT touching string contents. A naive regex eats everything
 * between the `/*` in a `"@/*"` paths key and the `*\/` inside a
 * `"**\/*.test.ts"` glob - exactly the shapes tsconfigs are made of.
 */
function stripJsonc(raw: string): string {
  let out = "";
  let inString = false;
  let index = 0;

  while (index < raw.length) {
    const char = raw[index]!;
    const next = raw[index + 1];

    if (inString) {
      out += char;
      if (char === "\\" && next !== undefined) {
        out += next;
        index += 2;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      index += 1;
      continue;
    }

    if (char === '"') {
      inString = true;
      out += char;
      index += 1;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < raw.length && raw[index] !== "\n") {
        index += 1;
      }
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (index < raw.length && !(raw[index] === "*" && raw[index + 1] === "/")) {
        index += 1;
      }
      index += 2;
      continue;
    }

    if (char === ",") {
      let lookahead = index + 1;
      while (lookahead < raw.length && /\s/.test(raw[lookahead]!)) {
        lookahead += 1;
      }
      if (raw[lookahead] === "}" || raw[lookahead] === "]") {
        index += 1;
        continue;
      }
    }

    out += char;
    index += 1;
  }

  return out;
}
