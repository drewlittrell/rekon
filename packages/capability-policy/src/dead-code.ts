// WO-14 sub-order B: dead_code on graph reachability.
//
// Unreferenced exports via WO-8 symbol facts (import_specifier + reexport
// edges against export facts); file reachability from declared roots
// (manifest main/exports/bin + app entry conventions). Step 0 found the
// GraphSlice TYPE in kernel-graph but no refresh-produced slice artifact,
// so the slice is composed here from the same EvidenceGraph facts the
// projection would read - composition, not a parallel mechanism. Absent
// declared roots the rule runs in unreferenced-exports mode only and the
// payload says so: no reachability claims without declared roots.
// Citation: detection-design-decisions.md §C, dead_code row.

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import type { Finding } from "@rekon/kernel-findings";

import { isNonProductionPath } from "./grammar-divergence.js";

export const DEAD_CODE_RULE_ID = "dead_code.unreferenced";

const DEAD_CODE_CITATION = "docs/strategy/detection-design-decisions.md §C dead_code row (WO-14 sub-order B)";

type FactLike = {
  kind: string;
  subject: string;
  value: Record<string, unknown>;
};

/**
 * Framework-consumed convention files: their exports are invoked by the
 * framework, not by repo imports (classic's dead_code FP class). They are
 * also reachability roots when present.
 */
export function isFrameworkEntryPath(path: string): boolean {
  const base = path.split("/").at(-1) ?? "";

  if (/^(?:page|route|layout|loading|error|not-found|template|default|middleware|instrumentation)\.[jt]sx?$/.test(base)) {
    return true;
  }

  if (/(^|\/)pages\//.test(path)) {
    return true;
  }

  return /\.config\.[cm]?[jt]s$/.test(base);
}

/** Manifest-declared roots (main / exports / bin), read fail-soft as data. */
export async function loadDeclaredRoots(repoRoot: string): Promise<string[]> {
  const roots = new Set<string>();

  const collect = async (dir: string): Promise<void> => {
    try {
      const pkg = JSON.parse(await readFile(join(repoRoot, dir, "package.json"), "utf8")) as {
        main?: string;
        exports?: unknown;
        bin?: unknown;
        workspaces?: string[] | { packages?: string[] };
      };
      const add = (rel: unknown) => {
        if (typeof rel !== "string") {
          return;
        }

        const normalized = `${dir ? `${dir}/` : ""}${rel.replace(/^\.\//, "")}`
          .replace(/^((?:[^/]+\/)*[^/]+)\/dist\//, "$1/src/")
          .replace(/\.js$/, ".ts");

        roots.add(normalized);
      };

      add(pkg.main);

      if (typeof pkg.exports === "string") {
        add(pkg.exports);
      } else if (pkg.exports && typeof pkg.exports === "object") {
        add((pkg.exports as Record<string, unknown>)["."]);
      }

      if (typeof pkg.bin === "string") {
        add(pkg.bin);
      } else if (pkg.bin && typeof pkg.bin === "object") {
        for (const value of Object.values(pkg.bin as Record<string, unknown>)) {
          add(value);
        }
      }

      // App entry conventions (the WO's second roots source): index files
      // are entry surface wherever a manifest marks a package boundary.
      // The evaluator keeps only candidates present in the scanned file
      // set, so nonexistent conventions never become roots.
      for (const convention of ["src/index.ts", "src/index.tsx", "src/main.ts", "index.ts"]) {
        add(convention);
      }

      if (dir === "") {
        const globs = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces?.packages ?? [];

        for (const glob of globs) {
          if (glob.endsWith("/*")) {
            const parent = glob.slice(0, -2);

            try {
              const children = await readdir(join(repoRoot, parent), { withFileTypes: true });

              for (const child of children.filter((c) => c.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
                await collect(`${parent}/${child.name}`);
              }
            } catch {
              // Missing workspace parent - skip.
            }
          } else if (!glob.includes("*")) {
            await collect(glob);
          }
        }
      }
    } catch {
      // No manifest at this level - fine.
    }
  };

  await collect("");

  return [...roots].sort();
}

export function evaluateDeadCode(input: {
  facts: ReadonlyArray<FactLike>;
  /** Declared roots (repo-relative). Empty -> unreferenced-exports mode. */
  roots?: ReadonlyArray<string>;
}): Finding[] {
  const facts = input.facts;
  const files = new Set(facts.filter((f) => f.kind === "file").map((f) => f.subject));
  const declaredRoots = (input.roots ?? []).filter((root) => files.has(root));
  const mode = declaredRoots.length > 0 ? "reachability" : "unreferenced-exports";

  // Referenced names per target file, plus whole-file references (star
  // re-exports, namespace imports, default-everything cases keep us
  // conservative: any uncertainty marks the whole file referenced).
  const referencedNames = new Set<string>();
  const wholeFileReferenced = new Set<string>();
  const importEdges = new Map<string, Set<string>>();

  for (const fact of facts) {
    if (fact.kind !== "import_specifier" && fact.kind !== "reexport") {
      continue;
    }

    const target = typeof fact.value.resolvedTarget === "string" ? fact.value.resolvedTarget : undefined;

    if (!target) {
      continue;
    }

    const source = typeof fact.value.source === "string" ? fact.value.source : fact.subject;
    const edges = importEdges.get(source) ?? new Set<string>();

    edges.add(target);
    importEdges.set(source, edges);

    const name = typeof fact.value.name === "string" ? fact.value.name : "*";
    const specifierKind = typeof fact.value.specifierKind === "string" ? fact.value.specifierKind : undefined;
    const reexportKind = typeof fact.value.reexportKind === "string" ? fact.value.reexportKind : undefined;

    if (name === "*" || specifierKind === "namespace" || specifierKind === "side-effect" || reexportKind === "star" || reexportKind === "namespace") {
      wholeFileReferenced.add(target);
    } else {
      referencedNames.add(`${target}#${name}`);
    }
  }

  // Reachability from declared roots over the file import graph.
  const reachable = new Set<string>();

  if (mode === "reachability") {
    const queue = [...declaredRoots];

    while (queue.length > 0) {
      const current = queue.pop()!;

      if (reachable.has(current)) {
        continue;
      }

      reachable.add(current);

      for (const next of importEdges.get(current) ?? []) {
        queue.push(next);
      }
    }
  }

  // Unreferenced exports per file.
  const deadByFile = new Map<string, string[]>();

  for (const fact of facts) {
    if (fact.kind !== "export") {
      continue;
    }

    const file = fact.subject;

    if (
      isNonProductionPath(file)
      || isFrameworkEntryPath(file)
      || declaredRoots.includes(file)
      || wholeFileReferenced.has(file)
    ) {
      continue;
    }

    const name = typeof fact.value.name === "string" ? fact.value.name : undefined;

    if (!name || referencedNames.has(`${file}#${name}`)) {
      continue;
    }

    const list = deadByFile.get(file) ?? [];

    if (!list.includes(name)) {
      list.push(name);
    }

    deadByFile.set(file, list);
  }

  const findings: Finding[] = [];

  for (const [file, names] of [...deadByFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const unreachable = mode === "reachability" && !reachable.has(file);

    findings.push({
      id: `${DEAD_CODE_RULE_ID}:${file}`,
      type: "dead_code",
      severity: "low",
      title: `Unreferenced export(s) in ${file}`,
      description: `${file} exports ${names.length} symbol(s) with no resolved import or re-export edge: ${names.sort().join(", ")}.${unreachable ? " The file is also unreachable from the declared roots." : ""}`,
      subjects: [file],
      files: [file],
      ruleId: DEAD_CODE_RULE_ID,
      suggestedAction: "Remove the unused export, or wire it to a declared root if it is a real entry point.",
      evidence: [],
      payload: {
        mode,
        unreferencedExports: names.sort(),
        ...(mode === "reachability" ? { reachableFromRoots: !unreachable } : {}),
        citation: DEAD_CODE_CITATION,
      },
    } as Finding);
  }

  return findings;
}
