#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const packagesDir = join(repoRoot, "packages");
const EXPECTED_LICENSE = "Apache-2.0";

const issues = [];
const packageReports = [];

const rootLicensePath = join(repoRoot, "LICENSE");

if (!existsSync(rootLicensePath)) {
  addIssue("root", "missing-root-license", "Repository root must include a LICENSE file");
} else {
  const rootLicense = await readFile(rootLicensePath, "utf8");

  if (!/Apache License/.test(rootLicense) || !/Version 2\.0/.test(rootLicense)) {
    addIssue(
      "root",
      "wrong-root-license-content",
      "Root LICENSE must contain Apache License 2.0 text",
    );
  }
}

const rootPackageJson = JSON.parse(
  await readFile(join(repoRoot, "package.json"), "utf8"),
);

if (rootPackageJson.license !== EXPECTED_LICENSE) {
  addIssue(
    "root",
    "wrong-root-package-license",
    `root package.json license is ${rootPackageJson.license}; expected ${EXPECTED_LICENSE}`,
  );
}

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
    license: pkg.license,
    issues: [],
  };

  if (!pkg.license) {
    report.issues.push("missing license");
    addIssue(pkg.name ?? dir, "missing-license", `${pkg.name ?? dir} is missing license field`);
  } else if (pkg.license !== EXPECTED_LICENSE) {
    report.issues.push(`license mismatch: ${pkg.license}`);
    addIssue(
      pkg.name ?? dir,
      "license-mismatch",
      `${pkg.name ?? dir} declares ${pkg.license}; expected ${EXPECTED_LICENSE}`,
    );
  }

  const readmePath = join(packageDir, "README.md");

  if (existsSync(readmePath)) {
    const readme = await readFile(readmePath, "utf8");
    const conflictingLicenseMatches = readme.match(
      /license:\s*(MIT|GPL|AGPL|LGPL|BSD|MPL|Unlicense|ISC)\b/i,
    );

    if (conflictingLicenseMatches) {
      report.issues.push(
        `README references conflicting license ${conflictingLicenseMatches[1]}`,
      );
      addIssue(
        pkg.name ?? dir,
        "conflicting-readme-license",
        `${pkg.name ?? dir}: README.md references ${conflictingLicenseMatches[1]}, not ${EXPECTED_LICENSE}`,
      );
    }
  }

  packageReports.push(report);
}

const summary = {
  generatedAt: new Date().toISOString(),
  expectedLicense: EXPECTED_LICENSE,
  packageCount: packageReports.length,
  packages: packageReports,
  issues,
};

console.log(JSON.stringify(summary, null, 2));

if (issues.length > 0) {
  console.error(`\nLicense audit failed with ${issues.length} issue(s).`);
  process.exit(1);
}

console.error(
  `\nLicense audit passed: ${packageReports.length} package(s) inspected, root + per-package licenses match ${EXPECTED_LICENSE}.`,
);

function addIssue(scope, code, message) {
  issues.push({ code, message, scope });
}
