#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const packagesDir = join(repoRoot, "packages");
const FORBIDDEN_TOKENS = [".codebase-intel", "CODEBASE_INTEL"];
const FORBIDDEN_PATH_FRAGMENTS = [
  ".rekon/",
  ".rekon-dev/",
  "tests/fixtures/dogfood",
];
const FORBIDDEN_FILE_SUFFIXES = [".tsbuildinfo"];

const issues = [];
const packageReports = [];

const entries = await readdir(packagesDir, { withFileTypes: true });
const packageDirs = entries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const dir of packageDirs) {
  const packageDir = join(packagesDir, dir);
  const packageJsonPath = join(packageDir, "package.json");

  if (!existsSync(packageJsonPath)) {
    addIssue(dir, "missing-package-json", `${dir} has no package.json`);
    continue;
  }

  const pkg = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const report = {
    directory: dir,
    name: pkg.name,
    version: pkg.version,
    private: pkg.private === true,
    skipped: false,
    files: [],
    warnings: [],
    issues: [],
    rawOutput: null,
  };

  if (!existsSync(join(packageDir, "README.md"))) {
    addIssue(pkg.name ?? dir, "missing-readme", `${pkg.name ?? dir} has no README.md`);
    report.issues.push("missing README");
  }

  if (!pkg.license) {
    addIssue(pkg.name ?? dir, "missing-license", `${pkg.name ?? dir} has no license field`);
    report.issues.push("missing license field");
  }

  await checkRequiredOutputs(packageDir, pkg, report);

  const dryRun = spawnSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: packageDir,
    encoding: "utf8",
  });

  report.rawOutput = {
    status: dryRun.status,
    stderr: trimOutput(dryRun.stderr),
    stdout: trimOutput(dryRun.stdout),
  };

  if (dryRun.status !== 0) {
    report.issues.push("npm pack --dry-run exited non-zero");
    addIssue(pkg.name ?? dir, "pack-failed", `${pkg.name ?? dir}: npm pack --dry-run failed`);
    packageReports.push(report);
    continue;
  }

  let parsed;

  try {
    parsed = JSON.parse(dryRun.stdout);
  } catch (error) {
    report.issues.push(`could not parse npm pack JSON output: ${error.message}`);
    addIssue(
      pkg.name ?? dir,
      "pack-output-invalid",
      `${pkg.name ?? dir}: npm pack --dry-run did not return valid JSON`,
    );
    packageReports.push(report);
    continue;
  }

  const tarballMeta = Array.isArray(parsed) ? parsed[0] : parsed;
  const tarballFiles = (tarballMeta?.files ?? []).map((entry) => entry.path);

  report.files = tarballFiles;
  report.size = tarballMeta?.size;
  report.unpackedSize = tarballMeta?.unpackedSize;
  report.entryCount = tarballMeta?.entryCount;

  if (Array.isArray(tarballMeta?.bundledDependencies)) {
    report.bundledDependencies = tarballMeta.bundledDependencies;
  }

  if (Array.isArray(tarballMeta?.warnings)) {
    report.warnings = tarballMeta.warnings;
  }

  for (const file of tarballFiles) {
    for (const fragment of FORBIDDEN_PATH_FRAGMENTS) {
      if (file.includes(fragment)) {
        report.issues.push(`tarball file ${file} includes forbidden fragment ${fragment}`);
        addIssue(
          pkg.name ?? dir,
          "forbidden-tarball-file",
          `${pkg.name ?? dir}: tarball would include ${file} (forbidden fragment ${fragment})`,
        );
      }
    }

    for (const token of FORBIDDEN_TOKENS) {
      if (file.includes(token)) {
        report.issues.push(`tarball file ${file} references forbidden token ${token}`);
        addIssue(
          pkg.name ?? dir,
          "forbidden-tarball-token",
          `${pkg.name ?? dir}: tarball would include ${file} (forbidden token ${token})`,
        );
      }
    }

    for (const suffix of FORBIDDEN_FILE_SUFFIXES) {
      if (file.endsWith(suffix) || file.endsWith(`/${suffix}`)) {
        report.issues.push(`tarball file ${file} ends with forbidden suffix ${suffix}`);
        addIssue(
          pkg.name ?? dir,
          "forbidden-tarball-suffix",
          `${pkg.name ?? dir}: tarball would include ${file} (forbidden suffix ${suffix})`,
        );
      }
    }

    if (file.startsWith("/") || file.startsWith("..")) {
      report.issues.push(`tarball file ${file} is not relative to package root`);
      addIssue(
        pkg.name ?? dir,
        "absolute-tarball-path",
        `${pkg.name ?? dir}: tarball would include non-relative path ${file}`,
      );
    }
  }

  const requiredAdditional = ["README.md", "package.json"];

  for (const required of requiredAdditional) {
    if (!tarballFiles.some((file) => file.endsWith(required))) {
      report.issues.push(`tarball missing required file ${required}`);
      addIssue(
        pkg.name ?? dir,
        "tarball-missing-required",
        `${pkg.name ?? dir}: tarball would not include ${required}`,
      );
    }
  }

  if (existsSync(join(packageDir, "src")) && !tarballFiles.some((file) => file.includes("dist/"))) {
    report.issues.push("tarball missing dist/ output");
    addIssue(
      pkg.name ?? dir,
      "tarball-missing-dist",
      `${pkg.name ?? dir}: tarball includes no dist/ files but src/ exists`,
    );
  }

  if (Array.isArray(report.warnings) && report.warnings.length > 0) {
    for (const warning of report.warnings) {
      addIssue(pkg.name ?? dir, "pack-warning", `${pkg.name ?? dir}: ${warning}`);
    }
  }

  packageReports.push(report);
}

const summary = {
  generatedAt: new Date().toISOString(),
  packageCount: packageReports.length,
  packages: packageReports,
  issues,
};

console.log(JSON.stringify(summary, null, 2));

console.error("\nPer-package summary:");

for (const report of packageReports) {
  const status = report.issues.length === 0 ? "ok" : `${report.issues.length} issue(s)`;
  const size = typeof report.size === "number" ? `${report.size} bytes` : "size unknown";
  const entryCount = typeof report.entryCount === "number" ? `${report.entryCount} entries` : "entries unknown";

  console.error(`  - ${report.name ?? report.directory}: ${status}, ${entryCount}, ${size}`);
}

if (issues.length > 0) {
  console.error(`\nPublish dry-run failed with ${issues.length} issue(s).`);
  process.exit(1);
}

console.error(
  `\nPublish dry-run passed: ${packageReports.length} package(s) inspected, no publish attempted.`,
);

function addIssue(name, code, message) {
  issues.push({ code, message, package: name });
}

async function checkRequiredOutputs(packageDir, pkg, report) {
  const candidatePaths = collectCandidatePaths(pkg);

  for (const candidate of candidatePaths) {
    const full = join(packageDir, candidate);

    if (!existsSync(full)) {
      report.issues.push(`required output missing: ${candidate}`);
      addIssue(
        pkg.name ?? report.directory,
        "missing-build-output",
        `${pkg.name ?? report.directory}: declared entry ${candidate} does not exist (run npm run build)`,
      );
    }
  }
}

function collectCandidatePaths(pkg) {
  const paths = new Set();

  if (typeof pkg.main === "string") {
    paths.add(pkg.main.replace(/^\.\//, ""));
  }

  if (typeof pkg.module === "string") {
    paths.add(pkg.module.replace(/^\.\//, ""));
  }

  if (typeof pkg.types === "string") {
    paths.add(pkg.types.replace(/^\.\//, ""));
  }

  if (pkg.exports && typeof pkg.exports === "object") {
    for (const value of Object.values(pkg.exports)) {
      if (typeof value === "string") {
        paths.add(value.replace(/^\.\//, ""));
      } else if (typeof value === "object" && value !== null) {
        for (const conditionalValue of Object.values(value)) {
          if (typeof conditionalValue === "string") {
            paths.add(conditionalValue.replace(/^\.\//, ""));
          }
        }
      }
    }
  }

  if (pkg.bin) {
    if (typeof pkg.bin === "string") {
      paths.add(pkg.bin.replace(/^\.\//, ""));
    } else if (typeof pkg.bin === "object") {
      for (const value of Object.values(pkg.bin)) {
        if (typeof value === "string") {
          paths.add(value.replace(/^\.\//, ""));
        }
      }
    }
  }

  return [...paths];
}

function trimOutput(text) {
  if (!text) {
    return "";
  }

  const trimmed = text.trim();

  if (trimmed.length <= 2000) {
    return trimmed;
  }

  return `${trimmed.slice(0, 2000)}... [truncated]`;
}
