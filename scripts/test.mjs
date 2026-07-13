import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const suiteIndex = args.findIndex((argument) => argument === "--suite");
const suite = suiteIndex >= 0 ? args[suiteIndex + 1] : undefined;
if (suiteIndex >= 0) {
  args.splice(suiteIndex, 2);
}
const requestedPaths = args;

const build = spawnSync("npm", ["run", "build", "--workspaces"], {
  cwd: root,
  stdio: "inherit",
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const testFiles =
  requestedPaths.length > 0
    ? requestedPaths.flatMap((requestedPath) => collectRequestedTests(join(root, requestedPath)))
    : suite
      ? collectSuiteTests(suite)
      : collectDefaultTests();

if (testFiles.length === 0) {
  console.error("No test files found.");
  process.exit(1);
}

const test = spawnSync(process.execPath, ["--test", ...testFiles], {
  cwd: root,
  stdio: "inherit",
});

process.exit(test.status ?? 1);

function collectDefaultTests() {
  return [
    ...collectTestsUnder(join(root, "tests")),
    ...collectPackageTests(),
  ];
}

function collectSuiteTests(name) {
  const packageTests = collectPackageTests();
  const contractTests = collectTestsUnder(join(root, "tests", "contract"));
  const integrationTests = collectTestsUnder(join(root, "tests", "integration"));
  const benchTests = collectTestsUnder(join(root, "tests", "bench"));
  const optional = (path) => /(?:live|dogfood)\.test\.[cm]?js$/.test(path);

  switch (name) {
    case "smoke":
      return [join(root, "tests", "root-smoke.test.mjs")];
    case "contract":
      return [...packageTests, ...contractTests, ...integrationTests].filter((path) => !optional(path));
    case "live":
      return [...contractTests, ...integrationTests].filter(optional);
    case "bench":
      return benchTests;
    default:
      console.error(`Unknown test suite: ${name}. Expected smoke, contract, live, or bench.`);
      process.exit(1);
  }
}

function collectPackageTests() {
  const packagesDir = join(root, "packages");

  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => collectTestsUnder(join(packagesDir, entry.name, "test")));
}

function collectRequestedTests(requestedPath) {
  if (!exists(requestedPath)) {
    return [requestedPath];
  }

  const stat = statSync(requestedPath);

  if (stat.isDirectory()) {
    return collectTestsUnder(requestedPath);
  }

  return [requestedPath];
}

function collectTestsUnder(directory) {
  if (!exists(directory)) {
    return [];
  }

  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTestsUnder(entryPath));
    } else if (entry.isFile() && /\.test\.[cm]?js$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function exists(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}
