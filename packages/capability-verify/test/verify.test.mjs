// `@rekon/capability-verify` package-local conformance
// tests. Pins that the manifest declares the runner
// boundary, that the skeleton runner is registered, and
// that generic dispatch remains disabled. Opt-in CLI execution
// uses the exported hardened runner helper directly.

import assert from "node:assert/strict";
import test from "node:test";
import verifyCapability, {
  createIsolatedCoverageVerificationPlan,
  VERIFY_CAPABILITY_ID,
  VERIFY_CAPABILITY_VERSION,
  verificationRunner,
} from "../dist/index.js";
import { assertCapabilityConforms, validateCapability } from "@rekon/sdk";

test("@rekon/capability-verify manifest conforms", () => {
  const result = validateCapability(verifyCapability);
  assert.equal(result.ok, true, `expected ok:true; got ${JSON.stringify(result)}`);
});

test("@rekon/capability-verify declares runner role only", () => {
  assert.deepEqual(verifyCapability.manifest.roles, ["runner"]);
});

test("@rekon/capability-verify declares execute:verification permission", () => {
  assert.ok(
    verifyCapability.manifest.permissions?.includes("execute:verification"),
    "manifest must declare execute:verification permission",
  );
});

test("@rekon/capability-verify does NOT declare write:source or apply:reconcile", () => {
  const permissions = verifyCapability.manifest.permissions ?? [];
  assert.ok(
    !permissions.includes("write:source"),
    "manifest must not declare write:source",
  );
  // `apply:reconcile` is not currently a recognized
  // permission; this guard ensures the manifest does
  // not invent or smuggle it in.
  assert.ok(
    !permissions.some((permission) => String(permission).startsWith("apply:")),
    "manifest must not declare any apply:* permission",
  );
});

test("@rekon/capability-verify consumes VerificationPlan and WorkOrder", () => {
  const consumes = verifyCapability.manifest.consumes;
  assert.ok(consumes.includes("VerificationPlan"));
  assert.ok(consumes.includes("WorkOrder"));
});

test("@rekon/capability-verify produces VerificationRun and VerificationResult", () => {
  const produces = verifyCapability.manifest.produces;
  assert.ok(produces.includes("VerificationRun"));
  assert.ok(produces.includes("VerificationResult"));
});

test("@rekon/capability-verify identity matches exported constants", () => {
  assert.equal(verifyCapability.manifest.id, VERIFY_CAPABILITY_ID);
  assert.equal(verifyCapability.manifest.version, VERIFY_CAPABILITY_VERSION);
});

test("generic runner dispatch remains disabled", async () => {
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

test("capability-verify conformance: validateCapability returns ok", async () => {
  const conformed = await assertCapabilityConforms(verifyCapability, {});
  assert.ok(conformed, "expected the capability to conform");
  assert.equal(conformed.runners.length, 1, "expected exactly one runner");
  assert.equal(conformed.runners[0].id, "@rekon/capability-verify.runner");
});

function coveragePlanHeader(id) {
  return {
    artifactType: "VerificationPlan",
    artifactId: id,
    schemaVersion: "0.1.0",
    generatedAt: "2026-07-11T00:00:00.000Z",
    subject: { repoId: "repo", paths: ["tests/service.test.ts"] },
    producer: { id: "test", version: "1.0.0" },
    inputRefs: [],
  };
}

test("isolated Vitest coverage plan uses the local binary and deterministic output", () => {
  const result = createIsolatedCoverageVerificationPlan({
    header: coveragePlanHeader("verification-plan-vitest"),
    framework: "vitest",
    provider: "v8",
    testPath: "tests/service.test.ts",
    targetPaths: ["src/service.ts", "src/service.ts"],
    binaryPath: "node_modules/vitest/vitest.mjs",
  });

  assert.match(result.command, /^node node_modules\/vitest\/vitest\.mjs run tests\/service\.test\.ts /);
  assert.match(result.command, /--coverage\.provider=v8/);
  assert.match(result.command, /--coverage\.reportOnFailure/);
  assert.equal(result.verificationPlan.source, "isolated-coverage");
  assert.equal(result.verificationPlan.coverage.isolated, true);
  assert.deepEqual(result.verificationPlan.coverage.targetPaths, ["src/service.ts"]);
  assert.equal(result.verificationPlan.coverage.coveragePath, result.coveragePath);
  assert.match(result.coveragePath, /^\.rekon\/cache\/coverage\/vitest\/[a-f0-9]{16}\/coverage-final\.json$/);
});

test("isolated Jest coverage plan runs one exact test path", () => {
  const result = createIsolatedCoverageVerificationPlan({
    header: coveragePlanHeader("verification-plan-jest"),
    framework: "jest",
    provider: "babel",
    testPath: "tests/service.test.ts",
    targetPaths: ["src/service.ts"],
    binaryPath: "node_modules/jest/bin/jest.js",
  });

  assert.match(result.command, /--runTestsByPath tests\/service\.test\.ts/);
  assert.match(result.command, /--runInBand/);
  assert.match(result.command, /--coverageProvider=babel/);
  assert.match(result.command, /--coverageReporters=json/);
});

test("isolated coverage plans preserve and quote repository paths with spaces", () => {
  const result = createIsolatedCoverageVerificationPlan({
    header: coveragePlanHeader("verification-plan-spaces"),
    framework: "jest",
    provider: "babel",
    testPath: "tests/user flow.test.ts",
    targetPaths: ["src/user flow.ts"],
    binaryPath: "node_modules/jest/bin/jest.js",
  });

  assert.equal(result.verificationPlan.coverage.testPath, "tests/user flow.test.ts");
  assert.match(result.command, /--runTestsByPath "tests\/user flow\.test\.ts"/);
  assert.deepEqual(result.verificationPlan.coverage.targetPaths, ["src/user flow.ts"]);
});

test("isolated coverage plans reject unsafe paths and framework/provider mismatches", () => {
  assert.throws(() => createIsolatedCoverageVerificationPlan({
    header: coveragePlanHeader("verification-plan-unsafe"),
    framework: "vitest",
    provider: "v8",
    testPath: "../outside.test.ts",
    binaryPath: "node_modules/vitest/vitest.mjs",
  }), /safe repository-relative path/);
  assert.throws(() => createIsolatedCoverageVerificationPlan({
    header: coveragePlanHeader("verification-plan-unsafe-target"),
    framework: "vitest",
    provider: "v8",
    testPath: "tests/service.test.ts",
    targetPaths: ["../outside.ts"],
    binaryPath: "node_modules/vitest/vitest.mjs",
  }), /safe repository-relative path/);
  assert.throws(() => createIsolatedCoverageVerificationPlan({
    header: coveragePlanHeader("verification-plan-provider"),
    framework: "jest",
    provider: "istanbul",
    testPath: "tests/service.test.ts",
    binaryPath: "node_modules/jest/bin/jest.js",
  }), /Jest coverage provider must be v8 or babel/);
});
