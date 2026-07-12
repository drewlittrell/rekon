// `@rekon/capability-verify` skeleton contract tests
// (P1.1 verification-runner-v1). Pins the manifest
// conformance and the dangerous-boundary declarations
// at the workspace contract layer (the package-local
// tests already cover the unit behavior). Execution remains
// available only through the explicit CLI path.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";
import verifyCapability, {
  VERIFY_CAPABILITY_ID,
  verificationRunner,
} from "../../packages/capability-verify/dist/index.js";
import { assertCapabilityConforms, createCapabilityRegistry } from "../../packages/sdk/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

// ---------- 1: capability conforms via assertCapabilityConforms ----------

test("@rekon/capability-verify conforms (manifest + handlers)", async () => {
  const conformed = await assertCapabilityConforms(verifyCapability, {});
  assert.equal(conformed.manifest.id, VERIFY_CAPABILITY_ID);
  assert.equal(conformed.runners.length, 1);
});

// ---------- 2: capability declares role: runner ----------

test("@rekon/capability-verify declares role: runner", () => {
  assert.ok(
    verifyCapability.manifest.roles.includes("runner"),
    `expected roles to include "runner"; got ${JSON.stringify(verifyCapability.manifest.roles)}`,
  );
});

// ---------- 3: capability declares execute:verification ----------

test("@rekon/capability-verify declares execute:verification permission", () => {
  assert.ok(
    verifyCapability.manifest.permissions?.includes("execute:verification"),
    "manifest must declare execute:verification",
  );
});

// ---------- 4: capability does NOT declare write:source or any apply:* ----------

test("@rekon/capability-verify does NOT declare write:source or any apply:* permission", () => {
  const permissions = verifyCapability.manifest.permissions ?? [];
  assert.ok(
    !permissions.includes("write:source"),
    `manifest must not declare write:source; got ${JSON.stringify(permissions)}`,
  );
  assert.ok(
    !permissions.some((permission) => String(permission).startsWith("apply:")),
    `manifest must not declare any apply:* permission; got ${JSON.stringify(permissions)}`,
  );
});

// ---------- 5: capability consumes VerificationPlan and WorkOrder ----------

test("@rekon/capability-verify consumes VerificationPlan and WorkOrder", () => {
  const consumes = verifyCapability.manifest.consumes;
  assert.ok(consumes.includes("VerificationPlan"));
  assert.ok(consumes.includes("WorkOrder"));
});

// ---------- 6: capability produces VerificationRun and VerificationResult ----------

test("@rekon/capability-verify produces VerificationRun and VerificationResult", () => {
  const produces = verifyCapability.manifest.produces;
  assert.ok(produces.includes("VerificationRun"));
  assert.ok(produces.includes("VerificationResult"));
});

// ---------- 7: README documents opt-in execution and safety boundaries ----------

test("@rekon/capability-verify README documents explicit execution and source-write denial", async () => {
  const readmePath = join(repoRoot, "packages/capability-verify/README.md");
  const text = await readFile(readmePath, "utf8");
  assert.match(text, /rekon verify run --execute/i);
  assert.match(text, /without a shell/i);
  assert.match(text, /does not write source files/i);
  assert.match(text, /does not auto-resolve findings/i);
});

// ---------- 8: skeleton runner handler throws (does not spawn) ----------

test("@rekon/capability-verify skeleton runner throws when invoked", async () => {
  await assert.rejects(
    verificationRunner.run({
      artifacts: {
        read: async () => undefined,
        list: async () => [],
        write: async () => {
          throw new Error("write should not be called from the skeleton runner");
        },
      },
    }),
    /not implemented yet/i,
  );
});

// ---------- 9: SDK registry rejects an unknown role declaration ----------

test("SDK registry rejects a manifest declaring an unknown role", () => {
  const registry = createCapabilityRegistry();
  assert.throws(
    () => registry.use({
      manifest: {
        id: "@rekon/test.bogus-role",
        name: "Bogus Role",
        version: "0.0.1",
        roles: ["wizard"],
        consumes: [],
        produces: [],
        permissions: ["read:artifacts"],
        invalidatedBy: [{ id: "x", inputs: ["IntelligenceSnapshot"] }],
        compatibility: { rekon: "^0.1.0" },
      },
      register() {},
    }),
    /Unknown capability role: wizard/,
  );
});

// ---------- 10: SDK registry rejects an unknown permission declaration ----------

test("SDK registry rejects a manifest declaring an unknown permission", () => {
  const registry = createCapabilityRegistry();
  assert.throws(
    () => registry.use({
      manifest: {
        id: "@rekon/test.bogus-permission",
        name: "Bogus Permission",
        version: "0.0.1",
        roles: ["runner"],
        consumes: [],
        produces: ["VerificationRun"],
        permissions: ["execute:everything"],
        invalidatedBy: [{ id: "x", inputs: ["IntelligenceSnapshot"] }],
        compatibility: { rekon: "^0.1.0" },
      },
      register() {},
    }),
    /Unknown capability permission: execute:everything/,
  );
});

// ---------- 11: SDK registry accepts a runner-role manifest with a registered runner handler ----------

test("SDK registry accepts a synthetic runner-role manifest paired with a runner handler", () => {
  const registry = createCapabilityRegistry();
  const minimalRunner = {
    id: "test.minimal-runner",
    produces: ["VerificationRun"],
    async run() {
      throw new Error("not implemented in test");
    },
  };
  const registered = registry.use({
    manifest: {
      id: "@rekon/test.minimal-runner",
      name: "Minimal Runner Test",
      version: "0.0.1",
      roles: ["runner"],
      consumes: ["VerificationPlan"],
      produces: ["VerificationRun"],
      permissions: ["execute:verification", "read:artifacts", "write:artifacts"],
      invalidatedBy: [{ id: "x", inputs: ["VerificationPlan"] }],
      compatibility: { rekon: "^0.1.0" },
    },
    register(reg) {
      reg.runner(minimalRunner);
    },
  });
  assert.equal(registered.runners.length, 1);
  assert.equal(registered.runners[0].id, "test.minimal-runner");
});

// ---------- 12: SDK registry rejects a runner-role manifest with no runner handler ----------

test("SDK registry rejects a runner-role manifest that registers no runner handler", () => {
  const registry = createCapabilityRegistry();
  assert.throws(
    () => registry.use({
      manifest: {
        id: "@rekon/test.runner-no-handler",
        name: "Runner Missing Handler",
        version: "0.0.1",
        roles: ["runner"],
        consumes: ["VerificationPlan"],
        produces: ["VerificationRun"],
        permissions: ["execute:verification"],
        invalidatedBy: [{ id: "x", inputs: ["VerificationPlan"] }],
        compatibility: { rekon: "^0.1.0" },
      },
      register() {
        // intentionally no runner registration
      },
    }),
    /declares runner but registered no handler/,
  );
});
