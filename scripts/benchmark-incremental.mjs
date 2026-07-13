import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages", "cli", "dist", "index.js");
const fileCount = integerFlag("--files", 250);
const json = process.argv.includes("--json");
const dryRun = process.argv.includes("--dry-run");

if (dryRun) {
  print({ mode: "dry-run", fileCount, phases: ["init", "observe", "project", "evaluate", "incremental observe", "project", "evaluate"] });
  process.exit(0);
}

const root = await mkdtemp(join(tmpdir(), "rekon-incremental-benchmark-"));

try {
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "rekon-benchmark", private: true, type: "module" }), "utf8");
  for (let index = 0; index < fileCount; index += 1) {
    const previous = index > 0 ? `import { value${index - 1} } from "./file-${index - 1}.js";\n` : "";
    await writeFile(
      join(root, "src", `file-${index}.ts`),
      `${previous}export const value${index} = ${index};\n`,
      "utf8",
    );
  }

  run(["init", "--root", root, "--json"]);
  const fullMs = timed(() => {
    run(["observe", "--root", root, "--json"]);
    run(["project", "--root", root, "--json"]);
    run(["evaluate", "--root", root, "--json"]);
  });

  await writeFile(join(root, "src", "file-0.ts"), "export const value0 = 1000;\n", "utf8");
  const incrementalMs = timed(() => {
    run(["observe", "--root", root, "--changed-file", "src/file-0.ts", "--json"]);
    run(["project", "--root", root, "--json"]);
    run(["evaluate", "--root", root, "--json"]);
  });

  const index = JSON.parse(await readFile(join(root, ".rekon", "registry", "artifacts.index.json"), "utf8"));
  const latestEvidenceEntry = index
    .filter((entry) => entry.type === "EvidenceGraph")
    .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
  const latestEvidence = JSON.parse(await readFile(join(root, latestEvidenceEntry.path), "utf8"));
  const observedFiles = new Set(
    latestEvidence.facts.filter((fact) => fact.kind === "file").map((fact) => fact.value.path),
  );
  if (observedFiles.size !== fileCount || !observedFiles.has(`src/file-${fileCount - 1}.ts`)) {
    throw new Error(`Incremental evidence lost repository files: expected ${fileCount}, observed ${observedFiles.size}.`);
  }

  print({
    mode: "benchmark",
    fileCount,
    fullMs: rounded(fullMs),
    incrementalMs: rounded(incrementalMs),
    ratio: rounded(incrementalMs / fullMs),
    retainedFileFacts: observedFiles.size,
    artifactCount: index.length,
  });
} finally {
  await rm(root, { recursive: true, force: true });
}

function run(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`rekon ${args.join(" ")} failed:\n${result.stderr || result.stdout}`);
  }
}

function timed(callback) {
  const started = performance.now();
  callback();
  return performance.now() - started;
}

function integerFlag(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = Number.parseInt(process.argv[index + 1] ?? "", 10);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} requires a positive integer.`);
  return value;
}

function rounded(value) {
  return Math.round(value * 100) / 100;
}

function print(value) {
  if (json) {
    console.log(JSON.stringify(value, null, 2));
  } else {
    console.log(Object.entries(value).map(([key, entry]) => `${key}: ${Array.isArray(entry) ? entry.join(", ") : entry}`).join("\n"));
  }
}
