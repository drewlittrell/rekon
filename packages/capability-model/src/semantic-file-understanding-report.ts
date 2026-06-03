// SemanticFileUnderstandingReport v1 builder (slice 144).
//
// Per-file semantic understanding. Reads ONE source file's text (by value,
// passed in — the helper itself reads no files, runs no commands, makes no
// network calls, and writes nothing) and produces a
// SemanticFileUnderstandingReport: a deterministic structural understanding
// (language, line/byte counts, imports, public exports, responsibilities) plus,
// when a semantic-understanding adapter is supplied and usable, an LLM-proposed
// purpose / responsibilities / capability signals / findings.
//
// Imports and public exports are ALWAYS the deterministic extraction — the
// provider can never override them (the hallucination guard, mirroring the old
// codebase-intel per-file pipeline). Provider output is a PROPOSAL, not proof:
// it is shape-coerced here and the deterministic recheck remains authoritative.
//
// Boundaries: no command execution, no source writes, no embeddings, no
// PreparedIntentPlan / WorkOrder / VerificationPlan, no Circe; intent:go remains
// deferred. See docs/concepts/semantic-file-understanding.md.

import { createHash } from "node:crypto";
import type { ArtifactHeader } from "@rekon/kernel-artifacts";
import {
  type SemanticFileCapabilitySignal,
  type SemanticFileSourceEvidence,
  type SemanticFileUnderstandingConfidence,
  type SemanticFileUnderstandingFinding,
  type SemanticFileUnderstandingMode,
  type SemanticFileUnderstandingProvenance,
  type SemanticFileUnderstandingReport,
  type SemanticFileUnderstandingSeverity,
  type SemanticFileUnderstandingStatus,
  createSemanticFileUnderstandingReport,
} from "@rekon/kernel-repo-model";

/** Stable header `artifactId` prefix; the timestamp piece varies. */
export const SEMANTIC_FILE_UNDERSTANDING_REPORT_ARTIFACT_ID_PREFIX = "semantic-file-understanding-report-";

/**
 * Loose result a semantic-understanding adapter may return. Every field is
 * optional; the builder coerces and re-checks. The adapter NEVER overrides the
 * deterministic imports / public exports (the hallucination guard) — any it
 * includes are ignored in favour of the deterministic extraction.
 */
export type SemanticFileUnderstandingAdapterResult = {
  summary?: {
    purpose?: string;
    responsibilities?: string[];
    publicExports?: string[];
    imports?: string[];
    touchedConcepts?: string[];
  };
  capabilitySignals?: Array<{
    id?: string;
    label?: string;
    confidence?: SemanticFileUnderstandingConfidence;
    sourceEvidence?: Array<{ lineStart?: number; lineEnd?: number; excerpt?: string }>;
  }>;
  findings?: Array<{
    id?: string;
    severity?: SemanticFileUnderstandingSeverity;
    message?: string;
    sourceEvidence?: string[];
    suggestedFollowUp?: string;
  }>;
  provider?: string;
  model?: string;
  warnings?: string[];
};

export type SemanticFileUnderstandingAdapter = (input: {
  filePath: string;
  fileText: string;
  language?: string;
}) => Promise<SemanticFileUnderstandingAdapterResult>;

export type BuildSemanticFileUnderstandingReportInput = {
  filePath: string;
  fileText: string;
  fileSha256?: string;
  language?: string;
  generatedAt?: string;
  root?: string;
  semanticMode?: "off" | "auto" | "required";
  semanticUnderstanding?: SemanticFileUnderstandingAdapter;
};

type NormalizedSemantic = {
  purpose: string;
  responsibilities: string[];
  touchedConcepts: string[];
  capabilitySignals: SemanticFileCapabilitySignal[];
  findings: SemanticFileUnderstandingFinding[];
  warnings: string[];
};

// --- deterministic extraction (the always-on structural understanding) -------

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  c: "c",
  h: "c",
  cc: "cpp",
  cpp: "cpp",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  swift: "swift",
  scala: "scala",
  sh: "shell",
  json: "json",
  yml: "yaml",
  yaml: "yaml",
  md: "markdown",
  css: "css",
  scss: "scss",
  html: "html",
  sql: "sql",
};

function inferLanguageFromPath(filePath: string): string | undefined {
  const base = filePath.split("/").pop() ?? filePath;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return undefined;
  const ext = base.slice(dot + 1).toLowerCase();
  return LANGUAGE_BY_EXTENSION[ext];
}

function uniqueStrings(values: string[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = v.trim();
    if (t.length === 0 || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

function extractImports(text: string, language: string | undefined): string[] {
  const out: string[] = [];
  const jsPatterns = [
    /\bimport\s+[^"'`]*?\bfrom\s*["'`]([^"'`]+)["'`]/g,
    /\bimport\s*["'`]([^"'`]+)["'`]/g,
    /\bexport\s+[^"'`]*?\bfrom\s*["'`]([^"'`]+)["'`]/g,
    /\bimport\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
    /\brequire\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
  ];
  const pyPatterns = [/^\s*from\s+([A-Za-z0-9_.]+)\s+import\b/gm, /^\s*import\s+([A-Za-z0-9_.]+)/gm];
  // Gate Python patterns to Python files so JS `import path from "node:path"` does
  // not also match the Python `import x` form (which would capture the binding).
  const patterns = language === "python" ? pyPatterns : jsPatterns;
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const spec = m[1];
      if (typeof spec === "string" && spec.length > 0) out.push(spec);
    }
  }
  return uniqueStrings(out, 200);
}

function extractExports(text: string, language: string | undefined): string[] {
  const out: string[] = [];

  // Python: top-level def/class are the module's public surface.
  if (language === "python") {
    for (const m of text.matchAll(/^(?:def|class)\s+([A-Za-z_][A-Za-z0-9_]*)/gm)) {
      const name = m[1];
      if (typeof name === "string") out.push(name);
    }
    return uniqueStrings(out, 200);
  }

  // JS/TS (and unknown): only EXPLICIT `export` declarations — never a bare
  // class/function, which would over-report unexported internals.
  const declRe =
    /\bexport\s+(?:default\s+)?(?:async\s+)?(?:function\*?|class|const|let|var|type|interface|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  for (const m of text.matchAll(declRe)) {
    const name = m[1];
    if (typeof name === "string") out.push(name);
  }
  for (const block of text.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    const inner = block[1];
    if (typeof inner !== "string") continue;
    for (const part of inner.split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop();
      if (name && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) out.push(name);
    }
  }
  if (/\bexport\s+default\b/.test(text) && !/\bexport\s+default\s+(?:async\s+)?(?:function|class)\s+[A-Za-z_$]/.test(text)) {
    out.push("default");
  }
  if (/\bmodule\.exports\b/.test(text)) out.push("module.exports");
  for (const m of text.matchAll(/\bexports\.([A-Za-z_$][A-Za-z0-9_$]*)/g)) {
    const name = m[1];
    if (typeof name === "string") out.push(name);
  }
  return uniqueStrings(out, 200);
}

function extractResponsibilities(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(
    /\b(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g,
  )) {
    const name = m[1];
    if (typeof name === "string") out.push(name);
  }
  for (const m of text.matchAll(/\b(?:export\s+)?const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?\(/g)) {
    const name = m[1];
    if (typeof name === "string") out.push(name);
  }
  for (const m of text.matchAll(/^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)/gm)) {
    const name = m[1];
    if (typeof name === "string") out.push(name);
  }
  return uniqueStrings(out, 40);
}

function extractPurpose(text: string): string {
  const lines = text.split(/\r?\n/);
  for (const raw of lines.slice(0, 40)) {
    const line = raw.trim();
    if (line.length === 0) continue;
    const m = line.match(/^(?:\/\/+|#|\*|\/\*\*?|--)\s?(.*)$/);
    if (m) {
      const body = (m[1] ?? "").replace(/\*\/\s*$/, "").trim();
      if (body.length > 0) return body.slice(0, 280);
      continue;
    }
    break;
  }
  return "";
}

// --- provider-output coercion (shape gate; deterministic recheck is final) ---

function normalizeConfidence(value: unknown): SemanticFileUnderstandingConfidence {
  return value === "high" || value === "medium" || value === "low" ? value : "low";
}

function normalizeSeverity(value: unknown): SemanticFileUnderstandingSeverity {
  return value === "high" || value === "medium" || value === "low" ? value : "low";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const v of value) if (typeof v === "string" && v.length > 0) out.push(v);
  return out;
}

function normalizeEvidence(value: unknown): SemanticFileSourceEvidence[] {
  if (!Array.isArray(value)) return [];
  const out: SemanticFileSourceEvidence[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const excerpt = typeof r.excerpt === "string" ? r.excerpt : "";
    if (excerpt.length === 0) continue;
    const ev: SemanticFileSourceEvidence = { excerpt };
    if (typeof r.lineStart === "number" && Number.isInteger(r.lineStart) && r.lineStart >= 0) ev.lineStart = r.lineStart;
    if (typeof r.lineEnd === "number" && Number.isInteger(r.lineEnd) && r.lineEnd >= 0) ev.lineEnd = r.lineEnd;
    out.push(ev);
  }
  return out;
}

function coerceSemanticUnderstanding(
  raw: SemanticFileUnderstandingAdapterResult | undefined | null,
): NormalizedSemantic | null {
  if (!raw || typeof raw !== "object") return null;

  const purpose = typeof raw.summary?.purpose === "string" ? raw.summary.purpose.trim() : "";
  const responsibilities = normalizeStringArray(raw.summary?.responsibilities);
  const touchedConcepts = normalizeStringArray(raw.summary?.touchedConcepts);

  const capabilitySignals: SemanticFileCapabilitySignal[] = [];
  const seenSignal = new Set<string>();
  if (Array.isArray(raw.capabilitySignals)) {
    for (const s of raw.capabilitySignals) {
      if (!s || typeof s !== "object") continue;
      const id = typeof s.id === "string" ? s.id.trim() : "";
      if (id.length === 0 || seenSignal.has(id)) continue;
      seenSignal.add(id);
      capabilitySignals.push({
        id,
        label: typeof s.label === "string" ? s.label : "",
        confidence: normalizeConfidence(s.confidence),
        sourceEvidence: normalizeEvidence(s.sourceEvidence),
      });
    }
  }

  const findings: SemanticFileUnderstandingFinding[] = [];
  const seenFinding = new Set<string>();
  if (Array.isArray(raw.findings)) {
    for (const f of raw.findings) {
      if (!f || typeof f !== "object") continue;
      const id = typeof f.id === "string" ? f.id.trim() : "";
      if (id.length === 0 || seenFinding.has(id)) continue;
      seenFinding.add(id);
      const finding: SemanticFileUnderstandingFinding = {
        id,
        severity: normalizeSeverity(f.severity),
        message: typeof f.message === "string" ? f.message : "",
        sourceEvidence: normalizeStringArray(f.sourceEvidence),
      };
      if (typeof f.suggestedFollowUp === "string" && f.suggestedFollowUp.length > 0) {
        finding.suggestedFollowUp = f.suggestedFollowUp;
      }
      findings.push(finding);
    }
  }

  const usable =
    purpose.length > 0 ||
    responsibilities.length > 0 ||
    touchedConcepts.length > 0 ||
    capabilitySignals.length > 0 ||
    findings.length > 0;
  if (!usable) return null;

  return { purpose, responsibilities, touchedConcepts, capabilitySignals, findings, warnings: normalizeStringArray(raw.warnings) };
}

export async function buildSemanticFileUnderstandingReport(
  input: BuildSemanticFileUnderstandingReportInput,
): Promise<SemanticFileUnderstandingReport> {
  const filePath = input.filePath;
  const fileText = input.fileText;
  const lines = fileText.split(/\r?\n/);
  const byteLength = Buffer.byteLength(fileText, "utf8");
  const lineCount = fileText.length === 0 ? 0 : lines.length;
  const language = input.language ?? inferLanguageFromPath(filePath);
  const sha256 =
    typeof input.fileSha256 === "string" && input.fileSha256.length > 0
      ? input.fileSha256
      : createHash("sha256").update(fileText).digest("hex");

  const detImports = extractImports(fileText, language);
  const detExports = extractExports(fileText, language);
  const detResponsibilities = extractResponsibilities(fileText);
  const detPurpose = extractPurpose(fileText);

  const mode: "off" | "auto" | "required" = input.semanticMode ?? "off";
  const warnings: string[] = [];
  let method: SemanticFileUnderstandingMode = "deterministic";
  let invoked = false;
  let provenance: SemanticFileUnderstandingProvenance = "source-only";
  let provider: string | undefined;
  let model: string | undefined;
  let semantic: NormalizedSemantic | null = null;

  if (mode !== "off") {
    invoked = true;
    const adapter = input.semanticUnderstanding;
    if (!adapter) {
      if (mode === "required") {
        throw new Error("Semantic file understanding is required but no understanding provider/adapter was available.");
      }
      method = "deterministic-fallback";
      warnings.push(
        "Semantic understanding was requested but no provider was available; reported deterministic structural understanding only.",
      );
    } else {
      let raw: SemanticFileUnderstandingAdapterResult | undefined;
      let threw = false;
      try {
        raw = await adapter({ filePath, fileText, ...(language ? { language } : {}) });
      } catch (error) {
        if (mode === "required") {
          throw error instanceof Error ? error : new Error(String(error));
        }
        threw = true;
        method = "deterministic-fallback";
        warnings.push(
          `Semantic understanding provider failed; reported deterministic structural understanding only. (${
            error instanceof Error ? error.message : String(error)
          })`,
        );
      }
      if (!threw) {
        const coerced = coerceSemanticUnderstanding(raw ?? null);
        if (!coerced) {
          if (mode === "required") {
            throw new Error("Semantic file understanding is required but the provider returned no usable understanding.");
          }
          method = "deterministic-fallback";
          warnings.push(
            "Semantic understanding provider returned no usable result; reported deterministic structural understanding only.",
          );
        } else {
          method = "semantic-llm";
          provenance = "semantic-llm";
          semantic = coerced;
          for (const w of coerced.warnings) warnings.push(w);
          if (raw && typeof raw.provider === "string" && raw.provider.length > 0) provider = raw.provider;
          if (raw && typeof raw.model === "string" && raw.model.length > 0) model = raw.model;
        }
      }
    }
  }

  const summary: SemanticFileUnderstandingReport["summary"] = {
    purpose: semantic && semantic.purpose.length > 0 ? semantic.purpose : detPurpose,
    responsibilities: semantic && semantic.responsibilities.length > 0 ? semantic.responsibilities : detResponsibilities,
    publicExports: detExports,
    imports: detImports,
    touchedConcepts: semantic ? semantic.touchedConcepts : [],
  };
  const capabilitySignals = semantic ? semantic.capabilitySignals : [];
  const findings = semantic ? semantic.findings : [];

  let statusValue: SemanticFileUnderstandingStatus;
  let reason: string;
  if (byteLength === 0) {
    statusValue = "blocked";
    reason = "The file is empty; there is nothing to understand.";
  } else if (method === "semantic-llm") {
    const high = findings.filter((f) => f.severity === "high").length;
    if (high > 0) {
      statusValue = "needs-review";
      reason = `Semantic understanding produced ${high} high-severity finding(s) to review.`;
    } else {
      statusValue = "understood";
      reason = "Semantic understanding produced a source-grounded summary.";
    }
  } else if (method === "deterministic-fallback") {
    statusValue = "provider-unavailable";
    reason = "Semantic understanding was unavailable; reported deterministic structural understanding only.";
  } else {
    statusValue = "understood";
    reason = "Reported deterministic structural understanding.";
  }

  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const idStamp = Date.parse(generatedAt);
  const artifactId = `${SEMANTIC_FILE_UNDERSTANDING_REPORT_ARTIFACT_ID_PREFIX}${
    Number.isFinite(idStamp) ? idStamp : Date.now()
  }`;
  const header: ArtifactHeader = {
    artifactType: "SemanticFileUnderstandingReport",
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt,
    subject: { repoId: input.root ?? ".", paths: [filePath] },
    producer: { id: "@rekon/capability-model.semantic-file-understanding", version: "0.1.0-beta.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
    provenance: { confidence: provenance === "semantic-llm" ? 0.6 : 0.9 },
  };

  const normalizationTrace: SemanticFileUnderstandingReport["normalizationTrace"] = {
    method,
    invokedSemanticUnderstanding: invoked,
    provenance,
    warnings,
  };
  if (provider) normalizationTrace.provider = provider;
  if (model) normalizationTrace.model = model;

  const file: SemanticFileUnderstandingReport["file"] = { path: filePath, sha256, lineCount, byteLength };
  if (language) file.language = language;

  const report: SemanticFileUnderstandingReport = {
    header,
    schemaVersion: "0.1.0",
    status: { value: statusValue, reason },
    file,
    normalizationTrace,
    summary,
    capabilitySignals,
    findings,
    boundaries: {
      executedCommands: false,
      wroteSourceFiles: false,
      createdPreparedIntentPlan: false,
      createdWorkOrder: false,
      createdVerificationPlan: false,
      generatedEmbeddings: false,
      ranCirce: false,
      implementedIntentGo: false,
    },
  };

  return createSemanticFileUnderstandingReport(report);
}
