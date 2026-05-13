import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const packagesDir = join(repoRoot, "packages");

const EXPECTED_VERSION = "0.1.0-alpha.1";

test("workspace and every package declare version 0.1.0-alpha.1", async () => {
  const rootPkg = JSON.parse(
    await readFile(join(repoRoot, "package.json"), "utf8"),
  );

  assert.equal(
    rootPkg.version,
    EXPECTED_VERSION,
    `root package.json version must be ${EXPECTED_VERSION}`,
  );

  const dirs = (await readdir(packagesDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.ok(dirs.length > 0, "expected at least one workspace package");

  for (const dir of dirs) {
    const pkg = JSON.parse(
      await readFile(join(packagesDir, dir, "package.json"), "utf8"),
    );

    assert.equal(
      pkg.version,
      EXPECTED_VERSION,
      `${pkg.name ?? dir} version must be ${EXPECTED_VERSION}`,
    );

    for (const depMap of [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies]) {
      if (!depMap) continue;
      for (const [name, range] of Object.entries(depMap)) {
        if (name.startsWith("@rekon/")) {
          assert.equal(
            range,
            EXPECTED_VERSION,
            `${pkg.name ?? dir} declares ${name}@${range}; expected ${EXPECTED_VERSION}`,
          );
        }
      }
    }
  }
});

test("release readiness docs exist", async () => {
  const docs = [
    "docs/release/alpha-release-checklist.md",
    "docs/release/public-package-boundaries.md",
    "docs/release/npm-publish-plan.md",
    "docs/release/0.1.0-alpha.1.md",
  ];

  for (const doc of docs) {
    assert.ok(existsSync(join(repoRoot, doc)), `${doc} must exist`);
  }
});

test("public package boundaries doc lists every workspace package or explicitly defers it", async () => {
  const boundariesPath = join(
    repoRoot,
    "docs/release/public-package-boundaries.md",
  );
  const boundaries = await readFile(boundariesPath, "utf8");

  const dirs = (await readdir(packagesDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const dir of dirs) {
    const pkg = JSON.parse(
      await readFile(join(packagesDir, dir, "package.json"), "utf8"),
    );

    assert.ok(
      boundaries.includes(pkg.name),
      `public-package-boundaries.md must mention ${pkg.name} (either publish or defer)`,
    );
  }
});

test("npm publish plan exists and requires manual approval", async () => {
  const plan = await readFile(
    join(repoRoot, "docs/release/npm-publish-plan.md"),
    "utf8",
  );

  for (const phrase of [
    "Do not run `npm publish`",
    "manual approval",
    "Pre-Publish Checks",
    "Package Publish Order",
    "Post-Publish Smoke",
    "Rollback / Deprecate",
    "Do Not Publish Until",
    "@rekon/kernel-artifacts",
    "@rekon/cli",
  ]) {
    assert.ok(
      plan.includes(phrase),
      `npm-publish-plan.md must include: ${phrase}`,
    );
  }
});

test("release notes draft summarizes the alpha.1 release", async () => {
  const notes = await readFile(
    join(repoRoot, "docs/release/0.1.0-alpha.1.md"),
    "utf8",
  );

  for (const phrase of [
    "Rekon 0.1.0-alpha.1",
    "What Rekon Is",
    "What's Included In `0.1.0-alpha.1`",
    "Install And Use From Source",
    "Key CLI Flows",
    "Capability Authoring",
    "Known Limitations",
    "Verification",
    "Dogfood",
    "Architecture Rule",
    "Publish Status",
  ]) {
    assert.ok(notes.includes(phrase), `0.1.0-alpha.1.md must include: ${phrase}`);
  }
});

test("publish dry-run and install-tarball-smoke scripts exist", async () => {
  for (const script of [
    "scripts/publish-dry-run.mjs",
    "scripts/install-tarball-smoke.mjs",
  ]) {
    assert.ok(existsSync(join(repoRoot, script)), `${script} must exist`);
  }
});

test("publish dry-run script knows to fail on .tsbuildinfo", async () => {
  const script = await readFile(
    join(repoRoot, "scripts/publish-dry-run.mjs"),
    "utf8",
  );

  assert.ok(
    script.includes(".tsbuildinfo"),
    "publish-dry-run.mjs must guard against .tsbuildinfo inclusion",
  );
});

test("alpha release checklist references release readiness artifacts", async () => {
  const checklist = await readFile(
    join(repoRoot, "docs/release/alpha-release-checklist.md"),
    "utf8",
  );

  for (const phrase of [
    "public-package-boundaries.md",
    "npm-publish-plan.md",
    "0.1.0-alpha.1.md",
    "install-tarball-smoke",
    "Manual Publish Decision",
  ]) {
    assert.ok(checklist.includes(phrase), `alpha checklist must mention: ${phrase}`);
  }
});
