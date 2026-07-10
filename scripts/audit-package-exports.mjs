#!/usr/bin/env node
import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const packagesDir = join(repoRoot, "packages");
const LEGACY_WORKSPACE_SEGMENT = [".codebase", "intel"].join("-");
const LEGACY_ENV_PREFIX = ["CODEBASE", "INTEL"].join("_");
const LEGACY_DEPENDENCY_PATTERN = /^codebase[-]intel/;
const FORBIDDEN_TOKENS = [LEGACY_WORKSPACE_SEGMENT, LEGACY_ENV_PREFIX];

const issues = [];
const summaries = [];

const packages = (await readdir(packagesDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (packages.length === 0) {
  fail("no-packages-found", "No packages discovered under packages/.");
}

for (const name of packages) {
  const packageDir = join(packagesDir, name);
  const packageJsonPath = join(packageDir, "package.json");
  const readmePath = join(packageDir, "README.md");

  if (!existsSync(packageJsonPath)) {
    fail("missing-package-json", `${name} has no package.json`);
    continue;
  }

  let raw;
  let pkg;

  try {
    raw = await readFile(packageJsonPath, "utf8");
    pkg = JSON.parse(raw);
  } catch (error) {
    fail("invalid-package-json", `${name}: ${error.message}`);
    continue;
  }

  const summary = {
    directory: name,
    name: pkg.name,
    version: pkg.version,
    private: pkg.private === true,
    hasReadme: false,
    hasExports: Boolean(pkg.exports),
    hasMain: Boolean(pkg.main),
    hasBin: Boolean(pkg.bin),
    license: pkg.license,
    type: pkg.type,
    issues: [],
  };

  if (!pkg.name || typeof pkg.name !== "string") {
    summary.issues.push("missing or invalid name");
    fail("missing-name", `${name}/package.json must declare a string name`);
  }

  if (typeof pkg.name === "string" && !pkg.name.startsWith("@rekon/")) {
    summary.issues.push("name must be scoped under @rekon/");
    fail(
      "non-rekon-scope",
      `${pkg.name} must be scoped under @rekon/*`,
    );
  }

  if (!pkg.version || typeof pkg.version !== "string") {
    summary.issues.push("missing version");
    fail("missing-version", `${pkg.name} must declare a string version`);
  }

  if (pkg.type !== "module") {
    summary.issues.push("type should be 'module' for ESM consistency");
    fail(
      "wrong-module-type",
      `${pkg.name} must declare type: module to match the repo ESM convention`,
    );
  }

  if (!pkg.license) {
    summary.issues.push("missing license");
    fail("missing-license", `${pkg.name} must declare a license field`);
  } else if (pkg.license !== "Apache-2.0") {
    summary.issues.push(`license must be Apache-2.0 (got ${pkg.license})`);
    fail(
      "wrong-license",
      `${pkg.name} declares license ${pkg.license}; expected Apache-2.0`,
    );
  }

  const hasEntry = Boolean(pkg.exports || pkg.main || pkg.bin);

  if (!hasEntry) {
    summary.issues.push("must declare exports, main, or bin");
    fail(
      "missing-entry",
      `${pkg.name} must declare an exports map, main field, or bin entry`,
    );
  }

  if (pkg.exports) {
    validateExportsBlock(pkg.exports, pkg.name, summary);
  }

  if (pkg.bin) {
    validateBinBlock(pkg.bin, pkg.name, summary);
  }

  if (Array.isArray(pkg.files)) {
    summary.files = pkg.files;
  } else if (pkg.files) {
    summary.issues.push("files field must be an array if present");
    fail(
      "invalid-files-field",
      `${pkg.name}: files field must be an array of strings`,
    );
  }

  if (existsSync(readmePath)) {
    summary.hasReadme = true;
    const readme = await readFile(readmePath, "utf8");

    for (const token of FORBIDDEN_TOKENS) {
      if (readme.includes(token)) {
        summary.issues.push(`README references forbidden token ${token}`);
        fail(
          "forbidden-readme-token",
          `${pkg.name}/README.md references forbidden token ${token}`,
        );
      }
    }
  } else {
    summary.issues.push("missing README.md");
    fail("missing-readme", `${pkg.name} must include a README.md`);
  }

  for (const token of FORBIDDEN_TOKENS) {
    if (raw.includes(token)) {
      summary.issues.push(`package.json references forbidden token ${token}`);
      fail(
        "forbidden-pkg-token",
        `${pkg.name}/package.json references forbidden token ${token}`,
      );
    }
  }

  for (const dep of collectDependencies(pkg)) {
    if (LEGACY_DEPENDENCY_PATTERN.test(dep)) {
      summary.issues.push(`depends on ${dep} which must not be imported`);
      fail(
        "forbidden-dependency",
        `${pkg.name} depends on ${dep}; Rekon must not depend on private reference packages`,
      );
    }
  }

  await scanSourceForForbiddenTokens(packageDir, pkg.name, summary);

  if (pkg.private === true && pkg.name?.startsWith("@rekon/")) {
    summary.issues.push("@rekon/* packages should not be private");
    fail(
      "rekon-package-private",
      `${pkg.name} is marked private but is scoped under @rekon/*`,
    );
  }

  summaries.push(summary);
}

const summaryReport = {
  generatedAt: new Date().toISOString(),
  packages: summaries,
  issues,
};

console.log(JSON.stringify(summaryReport, null, 2));

if (issues.length > 0) {
  console.error(`\nPackage export audit failed with ${issues.length} issue(s).`);
  process.exit(1);
}

console.error(
  `\nPackage export audit passed: ${packages.length} package(s) inspected, no issues.`,
);

function fail(code, message) {
  issues.push({ code, message });
}

function validateExportsBlock(exportsBlock, packageName, summary) {
  if (typeof exportsBlock === "string") {
    summary.issues.push("exports must be an object map for type clarity");
    fail(
      "string-exports",
      `${packageName} exports must be an object map exposing types and import`,
    );
    return;
  }

  if (typeof exportsBlock !== "object" || exportsBlock === null) {
    summary.issues.push("exports must be an object");
    fail("invalid-exports", `${packageName} exports field must be an object`);
    return;
  }

  for (const [key, value] of Object.entries(exportsBlock)) {
    if (typeof value === "string") {
      checkExportPath(value, packageName, summary);
      continue;
    }

    if (typeof value === "object" && value !== null) {
      for (const conditionalValue of Object.values(value)) {
        if (typeof conditionalValue === "string") {
          checkExportPath(conditionalValue, packageName, summary);
        }
      }
      continue;
    }

    summary.issues.push(`exports.${key} must be a string or object`);
    fail(
      "invalid-exports-entry",
      `${packageName} exports.${key} must be a string or object`,
    );
  }
}

function validateBinBlock(binBlock, packageName, summary) {
  if (typeof binBlock === "string") {
    checkExportPath(binBlock, packageName, summary);
    return;
  }

  if (typeof binBlock !== "object" || binBlock === null) {
    summary.issues.push("bin must be a string or object");
    fail("invalid-bin", `${packageName} bin field must be a string or object`);
    return;
  }

  for (const value of Object.values(binBlock)) {
    if (typeof value === "string") {
      checkExportPath(value, packageName, summary);
    }
  }
}

function checkExportPath(value, packageName, summary) {
  if (value.startsWith("/")) {
    summary.issues.push(`absolute path in export: ${value}`);
    fail(
      "absolute-export-path",
      `${packageName} export references absolute path ${value}`,
    );
  }

  for (const token of FORBIDDEN_TOKENS) {
    if (value.includes(token)) {
      summary.issues.push(`export references ${token}`);
      fail(
        "forbidden-export-token",
        `${packageName} export references forbidden token ${token}`,
      );
    }
  }
}

function collectDependencies(pkg) {
  const groups = [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies];
  const names = new Set();

  for (const group of groups) {
    if (group && typeof group === "object") {
      for (const name of Object.keys(group)) {
        names.add(name);
      }
    }
  }

  return names;
}

async function scanSourceForForbiddenTokens(packageDir, packageName, summary) {
  const srcDir = join(packageDir, "src");

  if (!existsSync(srcDir)) {
    return;
  }

  const files = await listFiles(srcDir);

  for (const file of files) {
    if (!/\.(ts|tsx|js|cjs|mjs)$/.test(file)) {
      continue;
    }

    const content = await readFile(file, "utf8");

    if (/from ["'][^"']*codebase[-]intel/.test(content)) {
      summary.issues.push(`source ${file} imports from a private reference package`);
      fail(
        "forbidden-source-import",
        `${packageName}: ${file} imports from a private reference package`,
      );
    }

    if (/require\(["'][^"']*codebase[-]intel/.test(content)) {
      summary.issues.push(`source ${file} requires a private reference package`);
      fail(
        "forbidden-source-require",
        `${packageName}: ${file} requires a private reference package via CommonJS`,
      );
    }

    const legacyEnvPattern = new RegExp(`${LEGACY_ENV_PREFIX}[A-Z_]*`, "g");
    if (legacyEnvPattern.test(content)) {
      const matches = content.match(legacyEnvPattern) ?? [];
      const isGuardrailOnly = matches.every((match) =>
        new RegExp(`["'\`]${match}["'\`]`, "g").test(content),
      );

      if (!isGuardrailOnly) {
        summary.issues.push(`source ${file} references a private legacy environment prefix outside of guardrail strings`);
        fail(
          "forbidden-source-identifier",
          `${packageName}: ${file} references a private legacy environment prefix outside of guardrail strings`,
        );
      }
    }
  }
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}
