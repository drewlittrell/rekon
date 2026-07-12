#!/usr/bin/env node
// Classic Parity Bench v1 (Phase 0).
//
// Runs the Rekon lifecycle against repositories with legacy-source outputs
// scan history, normalizes both systems' findings into a common shape, and
// emits a ClassicParityReport (a BENCH report, not a canonical artifact) that
// classifies every classic finding as matched, missed-gap, missed-intentional
// (with citation), or flags Rekon findings classic never produced as new.
//
// Usage:
//   REKON_PARITY_CORPUS=/path/to/corpus node tests/bench/classic-parity-bench.mjs
//   node tests/bench/classic-parity-bench.mjs --corpus <path> [--rule-map <path>]
//     [--overruled <path>] [--output <dir>] [--repo <id> ...] [--skip-refresh]
//
// When REKON_PARITY_CORPUS is unset and no --corpus is given, the bench skips
// the real-corpus run cleanly (exit 0) — the same pattern as the gated
// dogfood harnesses. The corpus lives OUTSIDE this repository: classic scan
// outputs and target repos contain private project data and must never be
// committed here. Reports are written to a gitignored output directory.
//
// Guardrails:
// - Read-only against corpus repos except standard `.rekon/` output written
//   by `rekon refresh`. The bench never writes FindingStatusLedger entries,
//   filter policies, or config in corpus repos.
// - Classic outputs are parsed as data; no classic code is imported
//   (AGENTS.md rule 4 / ADR 0004).
// - Fails loudly on classic rules with no rule-map row; `missed-intentional`
//   requires a citation (filter reason / policy id, or a named decision doc).

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

import { loadClassicFindings, loadSuppressedFindings } from "./normalize-classic.mjs";
import { buildBenchReport, classifyParity, renderMarkdownReport, validateOverruledList, validateRuleMap } from "./parity-core.mjs";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

function parseArgs(argv) {
  const flags = { repos: [], skipRefresh: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--corpus") {
      flags.corpus = argv[(index += 1)];
    } else if (arg === "--rule-map") {
      flags.ruleMap = argv[(index += 1)];
    } else if (arg === "--output") {
      flags.output = argv[(index += 1)];
    } else if (arg === "--overruled") {
      flags.overruled = argv[(index += 1)];
    } else if (arg === "--repo") {
      flags.repos.push(argv[(index += 1)]);
    } else if (arg === "--skip-refresh") {
      flags.skipRefresh = true;
    } else {
      throw new Error(`classic-parity-bench: unknown argument "${arg}".`);
    }
  }

  return flags;
}

function runCli(args, label) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(
      `classic-parity-bench: ${label} failed (exit ${result.status}).\n${(result.stderr || result.stdout || "").slice(-2000)}`,
    );
  }

  return result.stdout;
}

function parseJsonOutput(stdout, label) {
  try {
    return JSON.parse(stdout);
  } catch {
    // Some commands print human lines before/after the JSON document; recover
    // the outermost JSON object from the stream.
    const start = stdout.indexOf("{");
    const end = stdout.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(stdout.slice(start, end + 1));
    }

    throw new Error(`classic-parity-bench: could not parse JSON output of ${label}.`);
  }
}

function readArtifactBody(root, artifactPath, label) {
  const candidates = [
    isAbsolute(artifactPath) ? artifactPath : undefined,
    resolve(root, artifactPath),
    resolve(root, ".rekon", artifactPath),
    resolve(root, ".rekon/artifacts", artifactPath),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return JSON.parse(readFileSync(candidate, "utf8"));
    }
  }

  throw new Error(`classic-parity-bench: could not resolve ${label} body at "${artifactPath}" under ${root}.`);
}

function latestArtifactBody(root, type) {
  const stdout = runCli(
    ["artifacts", "latest", "--root", root, "--type", type, "--json", "--allow-missing"],
    `artifacts latest --type ${type}`,
  );
  const parsed = parseJsonOutput(stdout, `artifacts latest --type ${type}`);

  if (!parsed.artifact) {
    return undefined;
  }

  return readArtifactBody(root, parsed.artifact.path, type);
}

function loadCorpus(corpusRoot) {
  const manifestPath = join(corpusRoot, "corpus.json");

  if (!existsSync(manifestPath)) {
    throw new Error(`classic-parity-bench: no corpus.json at ${corpusRoot}.`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  if (!Array.isArray(manifest.repos) || manifest.repos.length === 0) {
    throw new Error("classic-parity-bench: corpus.json must declare a non-empty repos array.");
  }

  for (const entry of manifest.repos) {
    for (const field of ["id", "root", "classicOutput", "classicFormat"]) {
      if (typeof entry[field] !== "string" || entry[field].length === 0) {
        throw new Error(`classic-parity-bench: corpus repo entry is missing "${field}".`);
      }
    }
  }

  return manifest;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const corpusRoot = flags.corpus ?? process.env.REKON_PARITY_CORPUS;

  if (!corpusRoot) {
    process.stdout.write(
      "classic-parity-bench: REKON_PARITY_CORPUS is not set and no --corpus was given — skipping the real-corpus run.\n" +
        "Set REKON_PARITY_CORPUS=/path/to/corpus (with a corpus.json) to score parity.\n",
    );
    return 0;
  }

  if (!existsSync(cliPath)) {
    throw new Error(`classic-parity-bench: built CLI not found at ${cliPath}. Run \`npm run build\` first.`);
  }

  const corpusAbs = resolve(corpusRoot);
  const manifest = loadCorpus(corpusAbs);
  const ruleMapPath = flags.ruleMap
    ? resolve(flags.ruleMap)
    : resolve(repoRoot, "tests/bench/rule-map.json");
  const ruleMap = validateRuleMap(JSON.parse(readFileSync(ruleMapPath, "utf8")));
  const overruledInput = flags.overruled ?? process.env.REKON_PARITY_OVERRULED;
  const overruledPath = overruledInput ? resolve(overruledInput) : undefined;
  const overruled = overruledPath
    ? validateOverruledList(JSON.parse(readFileSync(overruledPath, "utf8")), (path) => {
        const candidate = resolve(repoRoot, path);

        return existsSync(candidate) ? readFileSync(candidate, "utf8") : null;
      })
    : [];
  const outputDir = flags.output ? resolve(flags.output) : resolve(repoRoot, "tests/bench/output");
  const selected = manifest.repos.filter((entry) => flags.repos.length === 0 || flags.repos.includes(entry.id));

  if (selected.length === 0) {
    throw new Error("classic-parity-bench: --repo filter matched no corpus repos.");
  }

  const repoResults = [];

  for (const entry of selected) {
    const root = resolve(corpusAbs, entry.root);
    const classicOutputDir = resolve(corpusAbs, entry.classicOutput);

    process.stdout.write(`classic-parity-bench: ${entry.id} — ${flags.skipRefresh ? "scoring (refresh skipped)" : "refreshing"}…\n`);

    let refresh = { status: "skipped" };

    if (!flags.skipRefresh) {
      const stdout = runCli(["refresh", "--root", root, "--json"], `rekon refresh --root ${entry.id}`);
      const parsed = parseJsonOutput(stdout, "rekon refresh");

      refresh = { status: typeof parsed.status === "string" ? parsed.status : "unknown" };

      if (refresh.status === "failed") {
        throw new Error(`classic-parity-bench: rekon refresh reported status "failed" for ${entry.id}.`);
      }
    }

    const findingReport = latestArtifactBody(root, "FindingReport");
    const filterReport = latestArtifactBody(root, "FindingFilterReport");
    const rekonFindings = findingReport?.findings ?? [];
    const filteredFindings = filterReport?.filteredFindings ?? [];
    const classicFindings = loadClassicFindings({ classicOutputDir, classicFormat: entry.classicFormat });
    const suppressedFindings = loadSuppressedFindings({ classicOutputDir });

    const { rows, newFindings, coverage, precision } = classifyParity({ classicFindings, rekonFindings, filteredFindings, ruleMap, overruled, suppressedFindings });

    repoResults.push({
      id: entry.id,
      refresh,
      rows,
      newFindings,
      coverage,
      precision,
      rekonFindingCount: rekonFindings.length,
    });
  }

  const report = buildBenchReport({
    generatedAt: new Date().toISOString(),
    corpusRoot: corpusAbs,
    repos: repoResults,
  });

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(outputDir, "report.md"), renderMarkdownReport(report));

  process.stdout.write(
    `classic-parity-bench: weighted recall ${(report.aggregate.recall * 100).toFixed(1)}% ` +
      `(${report.aggregate.creditedWeight}/${report.aggregate.totalWeight} weighted) across ${repoResults.length} repo(s). ` +
      `Report: ${join(outputDir, "report.md")}\n`,
  );

  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
