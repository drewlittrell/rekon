import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const packagesDir = join(repoRoot, "packages");

test("every Rekon package README declares a stability label", async () => {
  const entries = await readdir(packagesDir, { withFileTypes: true });
  const packageDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.ok(packageDirs.length > 0, "expected at least one package");

  for (const dir of packageDirs) {
    const readmePath = join(packagesDir, dir, "README.md");
    const readme = await readFile(readmePath, "utf8");

    assert.match(readme, /## Stability/, `${dir} README must have a Stability section`);
    assert.ok(
      /`stable`|`experimental`|`internal`|`deprecated`/.test(readme),
      `${dir} README must reference at least one stability label`,
    );
  }
});

test("audit and release scripts exist", async () => {
  const scriptsDir = join(repoRoot, "scripts");
  const scriptFiles = (await readdir(scriptsDir)).filter((file) => file.endsWith(".mjs"));

  for (const expected of [
    "audit-package-exports.mjs",
    "publish-dry-run.mjs",
    "install-smoke.mjs",
    "install-tarball-smoke.mjs",
    "audit-license.mjs",
  ]) {
    assert.ok(scriptFiles.includes(expected), `scripts/${expected} must exist`);
  }
});
