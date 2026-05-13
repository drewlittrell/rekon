import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { join, resolve } from "node:path";
import test from "node:test";
import { assertCapabilityConforms, validateCapability } from "../../packages/sdk/dist/index.js";
import docsCapability from "../../packages/capability-docs/dist/index.js";
import graphCapability from "../../packages/capability-graph/dist/index.js";
import intentCapability from "../../packages/capability-intent/dist/index.js";
import jsTsCapability from "../../packages/capability-js-ts/dist/index.js";
import memoryCapability from "../../packages/capability-memory/dist/index.js";
import modelCapability from "../../packages/capability-model/dist/index.js";
import policyCapability from "../../packages/capability-policy/dist/index.js";
import reconcileCapability from "../../packages/capability-reconcile/dist/index.js";
import resolverCapability from "../../packages/capability-resolver/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

const builtIns = [
  docsCapability,
  graphCapability,
  intentCapability,
  jsTsCapability,
  memoryCapability,
  modelCapability,
  policyCapability,
  reconcileCapability,
  resolverCapability,
];

test("built-in capabilities conform to the public SDK contract", async () => {
  for (const capability of builtIns) {
    const result = validateCapability(capability);

    assert.equal(result.ok, true, `${capability.manifest.id}: ${formatIssues(result.issues)}`);
    await assertCapabilityConforms(capability);
  }
});

test("custom capability example conforms to the public SDK contract", async () => {
  const build = spawnSync("npx", ["tsc", "-p", "examples/custom-capability/tsconfig.json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(build.status, 0, build.stderr || build.stdout);

  const moduleUrl = pathToFileURL(join(repoRoot, "examples/custom-capability/dist/index.js")).href;
  const capability = (await import(moduleUrl)).default;
  const result = validateCapability(capability);

  assert.equal(result.ok, true, formatIssues(result.issues));
  await assertCapabilityConforms(capability);
});

function formatIssues(issues) {
  return issues.map((issue) => `${issue.code}: ${issue.message}`).join("; ");
}
