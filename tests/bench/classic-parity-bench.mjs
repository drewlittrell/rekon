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
//     [--overruled <path>] [--equivalences <path>] [--adjudications <path>]
//     [--quality-thresholds <path>]
//     [--output <dir>] [--repo <id> ...] [--capture-evidence] [--skip-refresh]
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
import { dirname, isAbsolute, join, resolve } from "node:path";

import { loadClassicFindings, loadSuppressedFindings } from "./normalize-classic.mjs";
import {
  buildBenchReport,
  classifyParity,
  renderMarkdownReport,
  validateOverruledList,
  validateParityEquivalences,
  validateRuleMap,
} from "./parity-core.mjs";
import {
  buildQualitySummary,
  buildSanitizedBenchReport,
  validateQualityAdjudications,
  validateQualityThresholds,
} from "./quality-core.mjs";
import {
  evidenceInputArtifactType,
  evidenceInputCliArgs,
  validateCorpusEvidenceInputs,
} from "./corpus-evidence-inputs.mjs";
import {
  createCorpusEvidenceVerificationPlan,
  diffProtectedCorpusTrees,
  isAcceptablePartialRefresh,
  snapshotProtectedCorpusTree,
  validateCorpusEvidenceCapture,
} from "./corpus-evidence-capture.mjs";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

function parseArgs(argv) {
  const flags = { repos: [], skipRefresh: false, captureEvidence: false };

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
    } else if (arg === "--equivalences") {
      flags.equivalences = argv[(index += 1)];
    } else if (arg === "--adjudications") {
      flags.adjudications = argv[(index += 1)];
    } else if (arg === "--quality-thresholds") {
      flags.qualityThresholds = argv[(index += 1)];
    } else if (arg === "--repo") {
      flags.repos.push(argv[(index += 1)]);
    } else if (arg === "--skip-refresh") {
      flags.skipRefresh = true;
    } else if (arg === "--capture-evidence") {
      flags.captureEvidence = true;
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

function runRefresh(root, label) {
  const result = spawnSync(process.execPath, [cliPath, "refresh", "--root", root, "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const parsed = parseJsonOutput(result.stdout, label);

  if (result.status === 0) return parsed;
  if (isAcceptablePartialRefresh(parsed)) {
    return { ...parsed, status: "partial" };
  }

  throw new Error(
    `classic-parity-bench: ${label} failed (exit ${result.status}).\n${(result.stderr || result.stdout || "").slice(-2000)}`,
  );
}

function runEvidenceCapture({ entry, root }) {
  const capture = entry.evidenceCapture;
  if (!capture) return { status: "not-declared" };

  const snapshotOptions = {
    evidenceInputs: entry.evidenceInputs,
    allowedWrites: capture.allowedWrites,
  };
  const before = snapshotProtectedCorpusTree(root, snapshotOptions);
  const generatedAt = new Date().toISOString();
  const plan = createCorpusEvidenceVerificationPlan({ repoId: entry.id, capture, generatedAt });
  const cacheDirectory = join(root, ".rekon/cache/parity-bench");
  const planPath = join(cacheDirectory, `${plan.header.artifactId}.json`);
  mkdirSync(cacheDirectory, { recursive: true });
  writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);

  const args = [
    "verify", "run",
    "--plan-file", planPath,
    "--execute",
    "--root", root,
    "--json",
  ];
  if (capture.commandTimeoutMs) args.push("--command-timeout-ms", String(capture.commandTimeoutMs));
  if (capture.timeoutMs) args.push("--timeout-ms", String(capture.timeoutMs));
  if (capture.maxLogBytes) args.push("--max-log-bytes", String(capture.maxLogBytes));

  const executions = [];
  let after = before;
  for (let repetition = 0; repetition < capture.repetitions; repetition += 1) {
    const result = spawnSync(process.execPath, [cliPath, ...args], {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    let parsed;
    try {
      parsed = parseJsonOutput(result.stdout, `evidence capture for ${entry.id}`);
    } catch (error) {
      throw new Error(
        `classic-parity-bench: evidence capture for ${entry.id} did not return a VerificationRun `
          + `(exit ${result.status}).\n${(result.stderr || result.stdout || String(error)).slice(-2000)}`,
      );
    }

    if (
      parsed.executed !== true
      || parsed.artifact?.type !== "VerificationRun"
      || typeof parsed.artifact.id !== "string"
      || typeof parsed.verificationRun?.status !== "string"
    ) {
      throw new Error(`classic-parity-bench: evidence capture for ${entry.id} returned an invalid execution result.`);
    }
    executions.push(parsed);

    after = snapshotProtectedCorpusTree(root, snapshotOptions);
    const changes = diffProtectedCorpusTrees(before, after);
    if (changes.length > 0) {
      const detail = changes.slice(0, 20).map((change) => `${change.change}: ${change.path}`).join("; ");
      throw new Error(
        `classic-parity-bench: evidence capture for ${entry.id} modified protected repository files: ${detail}`,
      );
    }
  }

  const latest = executions.at(-1);
  const artifacts = executions.map((execution) => ({
    type: execution.artifact.type,
    id: execution.artifact.id,
  }));

  return {
    status: "captured",
    commands: capture.commands.length,
    executions: executions.length,
    verificationStatus: latest.verificationRun.status,
    verificationStatuses: executions.map((execution) => execution.verificationRun.status),
    artifact: artifacts.at(-1),
    artifacts,
    protectedSourceDigest: after.digest,
    protectedFiles: after.entries.size,
  };
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
    for (const field of ["id", "root"]) {
      if (typeof entry[field] !== "string" || entry[field].length === 0) {
        throw new Error(`classic-parity-bench: corpus repo entry is missing "${field}".`);
      }
    }

    entry.benchmarkMode ??= "parity";
    if (entry.benchmarkMode !== "parity" && entry.benchmarkMode !== "quality-only") {
      throw new Error(
        `classic-parity-bench: corpus repo "${entry.id}" has unsupported benchmarkMode "${entry.benchmarkMode}".`,
      );
    }

    if (entry.benchmarkMode === "parity") {
      for (const field of ["classicOutput", "classicFormat"]) {
        if (typeof entry[field] !== "string" || entry[field].length === 0) {
          throw new Error(`classic-parity-bench: parity repo "${entry.id}" is missing "${field}".`);
        }
      }
    } else {
      if (
        typeof entry.source?.url !== "string"
        || entry.source.url.length === 0
        || typeof entry.source?.commit !== "string"
        || !/^[a-f0-9]{40}$/u.test(entry.source.commit)
      ) {
        throw new Error(
          `classic-parity-bench: quality-only repo "${entry.id}" must declare source.url and a full source.commit SHA.`,
        );
      }
    }

    entry.evidenceInputs = validateCorpusEvidenceInputs(
      entry.evidenceInputs,
      `corpus repo "${entry.id}" evidenceInputs`,
    );
    entry.evidenceCapture = validateCorpusEvidenceCapture(
      entry.evidenceCapture,
      `corpus repo "${entry.id}" evidenceCapture`,
    );
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

  if (flags.captureEvidence && flags.skipRefresh) {
    throw new Error("classic-parity-bench: --capture-evidence cannot be combined with --skip-refresh.");
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
  const adjudicationsInput = flags.adjudications ?? process.env.REKON_PARITY_ADJUDICATIONS;
  const adjudications = adjudicationsInput
    ? validateQualityAdjudications(JSON.parse(readFileSync(resolve(adjudicationsInput), "utf8")))
    : [];
  const equivalencesInput = flags.equivalences ?? process.env.REKON_PARITY_EQUIVALENCES;
  const equivalencesPath = equivalencesInput ? resolve(equivalencesInput) : undefined;
  const equivalences = equivalencesPath
    ? validateParityEquivalences(
        JSON.parse(readFileSync(equivalencesPath, "utf8")),
        (path) => {
          const candidate = resolve(dirname(equivalencesPath), path);
          return existsSync(candidate) ? readFileSync(candidate, "utf8") : null;
        },
      )
    : [];
  const qualityThresholdsPath = flags.qualityThresholds
    ? resolve(flags.qualityThresholds)
    : resolve(repoRoot, "tests/bench/quality-thresholds.json");
  const qualityThresholds = validateQualityThresholds(JSON.parse(readFileSync(qualityThresholdsPath, "utf8")));
  const outputDir = flags.output ? resolve(flags.output) : resolve(repoRoot, "tests/bench/output");
  const selected = manifest.repos.filter((entry) => flags.repos.length === 0 || flags.repos.includes(entry.id));

  if (selected.length === 0) {
    throw new Error("classic-parity-bench: --repo filter matched no corpus repos.");
  }

  const repoResults = [];

  for (const entry of selected) {
    const root = resolve(corpusAbs, entry.root);
    const classicOutputDir = entry.benchmarkMode === "parity"
      ? resolve(corpusAbs, entry.classicOutput)
      : undefined;

    process.stdout.write(`classic-parity-bench: ${entry.id} — ${flags.skipRefresh ? "scoring (refresh skipped)" : "refreshing"}…\n`);

    let refresh = {
      status: "skipped",
      evidenceCapture: {
        status: entry.evidenceCapture ? "skipped" : "not-declared",
      },
      evidenceInputs: {
        status: entry.evidenceInputs.length > 0 ? "skipped" : "not-declared",
        count: entry.evidenceInputs.length,
        artifacts: [],
      },
    };

    if (!flags.skipRefresh) {
      const parsed = runRefresh(root, `rekon refresh --root ${entry.id}`);

      refresh = {
        status: typeof parsed.status === "string" ? parsed.status : "unknown",
        evidenceCapture: {
          status: entry.evidenceCapture ? "skipped" : "not-declared",
        },
        evidenceInputs: { status: "not-declared", count: 0, artifacts: [] },
      };

      if (refresh.status === "failed") {
        throw new Error(`classic-parity-bench: rekon refresh reported status "failed" for ${entry.id}.`);
      }

      if (flags.captureEvidence && entry.evidenceCapture) {
        refresh.evidenceCapture = runEvidenceCapture({ entry, root });
      }

      const captureVerificationRun = refresh.evidenceCapture.status === "captured"
        ? `${refresh.evidenceCapture.artifact.type}:${refresh.evidenceCapture.artifact.id}`
        : undefined;

      if (entry.evidenceInputs.length > 0) {
        const artifacts = entry.evidenceInputs.map((input) => {
          const label = `${entry.id} evidence input ${input.kind}:${input.path}`;
          const output = runCli(evidenceInputCliArgs(input, root, { captureVerificationRun }), label);
          const parsedInput = parseJsonOutput(output, label);
          const artifact = parsedInput.artifact;
          const expectedType = evidenceInputArtifactType(input.kind);

          if (!artifact || artifact.type !== expectedType || typeof artifact.id !== "string") {
            throw new Error(
              `classic-parity-bench: ${label} did not return the expected ${expectedType} artifact ref.`,
            );
          }

          return { kind: input.kind, type: artifact.type, id: artifact.id };
        });

        runCli(["evaluate", "--root", root, "--json"], `rekon evaluate after evidence ingestion for ${entry.id}`);
        refresh.evidenceInputs = { status: "ingested", count: artifacts.length, artifacts };
      }
    }

    const findingReport = latestArtifactBody(root, "FindingReport");
    const assessmentReport = latestArtifactBody(root, "AssessmentReport");
    const filterReport = latestArtifactBody(root, "FindingFilterReport");
    const rekonFindings = findingReport?.findings ?? [];
    const filteredFindings = filterReport?.filteredFindings ?? [];
    const assessments = assessmentReport?.assessments ?? [];
    const parity = entry.benchmarkMode === "parity"
      ? classifyParity({
          repoId: entry.id,
          classicFindings: loadClassicFindings({ classicOutputDir, classicFormat: entry.classicFormat }),
          rekonFindings,
          rekonAssessments: assessments,
          filteredFindings,
          ruleMap,
          overruled,
          equivalences,
          suppressedFindings: loadSuppressedFindings({ classicOutputDir }),
        })
      : { rows: [], newFindings: [], coverage: [], precision: [] };

    repoResults.push({
      id: entry.id,
      benchmarkMode: entry.benchmarkMode,
      ...(entry.source ? { source: entry.source } : {}),
      refresh,
      ...parity,
      rekonFindingCount: rekonFindings.length,
      rekonFindings,
      assessments,
    });
  }

  const report = buildBenchReport({
    generatedAt: new Date().toISOString(),
    corpusRoot: corpusAbs,
    repos: repoResults,
  });
  const quality = buildQualitySummary({ repos: repoResults, adjudications, thresholds: qualityThresholds });
  const detailedReport = { ...report, quality };
  const sanitizedReport = buildSanitizedBenchReport(report, quality);

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, "report.json"), `${JSON.stringify(detailedReport, null, 2)}\n`);
  writeFileSync(join(outputDir, "report.sanitized.json"), `${JSON.stringify(sanitizedReport, null, 2)}\n`);
  writeFileSync(join(outputDir, "report.md"), renderMarkdownReport(report));

  const parityRepos = repoResults.filter((repo) => repo.benchmarkMode === "parity").length;
  const qualityOnlyRepos = repoResults.length - parityRepos;
  process.stdout.write(
    `classic-parity-bench: weighted finding recall ${(report.aggregate.recall * 100).toFixed(1)}% ` +
      `(${report.aggregate.creditedWeight}/${report.aggregate.totalWeight} weighted); observable signal coverage ` +
      `${(report.aggregate.signalCoverage.recall * 100).toFixed(1)}% ` +
      `(${report.aggregate.signalCoverage.creditedWeight}/${report.aggregate.signalCoverage.totalWeight} weighted) ` +
      `across ${parityRepos} parity and ${qualityOnlyRepos} quality-only repo(s). ` +
      `Reports: ${join(outputDir, "report.md")}, ${join(outputDir, "report.sanitized.json")}\n`,
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
