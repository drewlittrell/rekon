// Doc governance freshness (WO-7, loop integrity track).
//
// Living documents declare their referents in YAML front matter
// (freshness.inputs / freshness.paths, mirroring the invalidatedBy rule
// shapes); this module evaluates them against git history with the
// existing four-status vocabulary. Deterministic by construction: git
// ancestry only (rev-list between the doc's last commit and HEAD), no
// mtimes, no clocks, so the check reproduces across clones. Snapshots
// (banner-marked) are exempt by definition - they never claimed to be
// current. Unenrolled living docs report "unknown"; nothing fabricates
// freshness.
//
// Decision memo: docs/strategy/doc-governance-freshness-decision.md.
// Work order: docs/work-orders/wo-7-doc-freshness.md.

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type DocFreshnessStatus = "fresh" | "stale" | "partial" | "unknown";

export type DocFreshnessDeclarations = {
  /** Artifact type names (resolved via DOC_INPUT_PATHSPECS) or schema file paths. */
  inputs: string[];
  /** Source and doc pathspecs (git glob pathspec semantics). */
  paths: string[];
};

export type DocReferentResult = {
  declaration: string;
  kind: "input" | "path";
  pathspec: string | null;
  resolved: boolean;
  newerThanDoc: boolean;
};

export type DocFreshnessEntry = {
  doc: string;
  classification: "living" | "snapshot" | "generated";
  enrolled: boolean;
  status: DocFreshnessStatus;
  lastCommit: string | null;
  referents: DocReferentResult[];
  note?: string;
};

export type DocsFreshnessReport = {
  root: string;
  entries: DocFreshnessEntry[];
  summary: Record<DocFreshnessStatus, number> & { snapshots: number; generated: number };
};

/**
 * Bare artifact-type names in `freshness.inputs` resolve through this
 * explicit table; an unmapped name is an unresolved declaration (and the
 * doc reports `partial`). Explicit over clever: a wrong guess here would
 * fabricate freshness.
 */
export const DOC_INPUT_PATHSPECS: Readonly<Record<string, string>> = Object.freeze({
  CapabilityMap: "packages/kernel-repo-model/src/**",
  CapabilityContract: "packages/kernel-repo-model/src/**",
  CapabilityArchitectureLintReport: "packages/kernel-repo-model/src/**",
  CapabilityLintFindingBridgeReport: "packages/kernel-repo-model/src/**",
  EvidenceGraph: "packages/kernel-evidence/src/**",
  FindingReport: "packages/kernel-findings/src/**",
  PathFreshnessReport: "packages/kernel-repo-model/src/**",
});

const SNAPSHOT_BANNER = "> **SNAPSHOT.**";

// ---------------------------------------------------------------------------
// Front matter: a tolerant subset parser. The shape is two string lists
// nested under `freshness:`; full YAML is deliberately not a dependency.
// Anything unparseable means "no declarations" - never an error.

export function parseDocFreshnessFrontMatter(content: string): DocFreshnessDeclarations | null {
  if (!content.startsWith("---\n")) {
    return null;
  }

  const end = content.indexOf("\n---", 4);

  if (end === -1) {
    return null;
  }

  const lines = content.slice(4, end).split("\n");
  const inputs: string[] = [];
  const paths: string[] = [];
  let section: "inputs" | "paths" | null = null;
  let inFreshness = false;

  for (const line of lines) {
    if (/^freshness:\s*$/.test(line)) {
      inFreshness = true;
      section = null;
      continue;
    }

    if (/^\S/.test(line)) {
      inFreshness = false;
      section = null;
      continue;
    }

    if (!inFreshness) {
      continue;
    }

    const header = line.match(/^\s+(inputs|paths):\s*(.*)$/);

    if (header) {
      section = header[1] as "inputs" | "paths";
      const inline = header[2]?.trim();

      if (inline && inline.startsWith("[") && inline.endsWith("]")) {
        const target = section === "inputs" ? inputs : paths;

        for (const item of inline.slice(1, -1).split(",")) {
          const value = item.trim().replace(/^["']|["']$/g, "");

          if (value) {
            target.push(value);
          }
        }
      }

      continue;
    }

    const item = line.match(/^\s+-\s+(.+)$/);

    if (item?.[1] && section) {
      const value = item[1].trim().replace(/^["']|["']$/g, "");

      if (value) {
        (section === "inputs" ? inputs : paths).push(value);
      }
    }
  }

  if (inputs.length === 0 && paths.length === 0) {
    return null;
  }

  return { inputs, paths };
}

// ---------------------------------------------------------------------------
// Git: a thin reader. Evaluation logic stays pure over its outputs.

export type DocGitReader = {
  /** Last commit hash touching the path, or null (untracked / no history). */
  lastCommit: (path: string) => string | null;
  /** True if any commit after `sinceCommit` touches the pathspec. */
  changedSince: (sinceCommit: string, pathspec: string) => boolean;
  /** True if any commit in history touches the pathspec (declaration resolves). */
  everTouched: (pathspec: string) => boolean;
};

export function createGitDocReader(repoRoot: string): DocGitReader {
  const git = (args: string[]): string => {
    try {
      return execFileSync("git", ["-C", repoRoot, ...args], { encoding: "utf8" }).trim();
    } catch {
      return "";
    }
  };

  return {
    lastCommit: (path) => git(["log", "-1", "--format=%H", "--", path]) || null,
    changedSince: (sinceCommit, pathspec) =>
      git(["rev-list", "-1", `${sinceCommit}..HEAD`, "--", `:(glob)${pathspec}`]) !== "",
    everTouched: (pathspec) => git(["log", "-1", "--format=%H", "--", `:(glob)${pathspec}`]) !== "",
  };
}

// ---------------------------------------------------------------------------
// Evaluation (pure over the git reader).

export function evaluateDocFreshness(
  doc: string,
  declarations: DocFreshnessDeclarations | null,
  reader: DocGitReader,
): Pick<DocFreshnessEntry, "status" | "lastCommit" | "referents" | "note"> {
  const lastCommit = reader.lastCommit(doc);

  if (!declarations) {
    return { status: "unknown", lastCommit, referents: [], note: "no freshness declarations" };
  }

  if (!lastCommit) {
    return { status: "unknown", lastCommit: null, referents: [], note: "doc has no git history yet" };
  }

  const referents: DocReferentResult[] = [];

  for (const declaration of declarations.inputs) {
    const pathspec = declaration.includes("/")
      ? declaration
      : (DOC_INPUT_PATHSPECS[declaration] ?? null);
    const resolved = pathspec !== null && reader.everTouched(pathspec);

    referents.push({
      declaration,
      kind: "input",
      pathspec,
      resolved,
      newerThanDoc: resolved ? reader.changedSince(lastCommit, pathspec!) : false,
    });
  }

  for (const declaration of declarations.paths) {
    const resolved = reader.everTouched(declaration);

    referents.push({
      declaration,
      kind: "path",
      pathspec: declaration,
      resolved,
      newerThanDoc: resolved ? reader.changedSince(lastCommit, declaration) : false,
    });
  }

  const anyStale = referents.some((referent) => referent.newerThanDoc);
  const anyUnresolved = referents.some((referent) => !referent.resolved);
  const status: DocFreshnessStatus = anyStale ? "stale" : anyUnresolved ? "partial" : "fresh";

  return { status, lastCommit, referents };
}

// ---------------------------------------------------------------------------
// Repo walk + report.

function listMarkdownFiles(dir: string, out: string[] = []): string[] {
  let names: string[];

  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }

  for (const name of names.sort()) {
    const full = join(dir, name);

    if (statSync(full).isDirectory()) {
      listMarkdownFiles(full, out);
    } else if (name.endsWith(".md")) {
      out.push(full);
    }
  }

  return out;
}

export function buildDocsFreshnessReport(
  repoRoot: string,
  reader: DocGitReader = createGitDocReader(repoRoot),
): DocsFreshnessReport {
  const entries: DocFreshnessEntry[] = [];

  for (const file of listMarkdownFiles(join(repoRoot, "docs"))) {
    const doc = relative(repoRoot, file);
    const content = readFileSync(file, "utf8");

    if (doc === "docs/INDEX.md") {
      entries.push({
        doc,
        classification: "generated",
        enrolled: false,
        status: "unknown",
        lastCommit: null,
        referents: [],
        note: "generated by rekon docs freshness",
      });
      continue;
    }

    if (content.includes(SNAPSHOT_BANNER)) {
      entries.push({
        doc,
        classification: "snapshot",
        enrolled: false,
        status: "unknown",
        lastCommit: null,
        referents: [],
        note: "snapshot: exempt by definition",
      });
      continue;
    }

    const declarations = parseDocFreshnessFrontMatter(content);

    entries.push({
      doc,
      classification: "living",
      enrolled: declarations !== null,
      ...evaluateDocFreshness(doc, declarations, reader),
    });
  }

  const summary = { fresh: 0, stale: 0, partial: 0, unknown: 0, snapshots: 0, generated: 0 };

  for (const entry of entries) {
    if (entry.classification === "snapshot") {
      summary.snapshots += 1;
    } else if (entry.classification === "generated") {
      summary.generated += 1;
    } else {
      summary[entry.status] += 1;
    }
  }

  return { root: repoRoot, entries, summary };
}

// ---------------------------------------------------------------------------
// docs/INDEX.md rendering. Deterministic: derived only from the report
// (git state + doc content), no timestamps, so regeneration with no
// underlying change is byte-identical.

export function renderDocsIndex(report: DocsFreshnessReport): string {
  const living = report.entries.filter((entry) => entry.classification === "living");
  const snapshots = report.entries.filter((entry) => entry.classification === "snapshot");
  const lines: string[] = [
    "# Docs Index",
    "",
    "<!-- GENERATED by `rekon docs freshness` (WO-7). Do not edit by hand. -->",
    "",
    "Living documents declare their referents in front matter; status is a",
    "deterministic git comparison (see docs/work-orders/wo-7-doc-freshness.md).",
    "`unknown` means a living doc has not enrolled yet - honest, not fresh.",
    "Snapshots are exempt by definition: they are point-in-time records and",
    "never claimed to be current.",
    "",
    "## Living documents",
    "",
    "| Doc | Status | Last verified commit |",
    "| --- | --- | --- |",
  ];

  for (const entry of living) {
    lines.push(
      `| ${entry.doc} | ${entry.status} | ${entry.lastCommit ? entry.lastCommit.slice(0, 10) : "-"} |`,
    );
  }

  lines.push("", "## Snapshots (exempt by definition)", "");
  const byDir = new Map<string, string[]>();

  for (const entry of snapshots) {
    const dir = entry.doc.split("/").slice(0, -1).join("/");
    byDir.set(dir, [...(byDir.get(dir) ?? []), entry.doc.split("/").at(-1)!]);
  }

  for (const [dir, names] of [...byDir.entries()].sort()) {
    lines.push(`- \`${dir}/\` (${names.length}): ${names.join(", ")}`);
  }

  lines.push("");

  return lines.join("\n");
}
