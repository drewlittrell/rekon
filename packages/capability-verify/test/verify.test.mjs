// `@rekon/capability-verify` package-local conformance
// tests. Pins that the manifest declares the runner
// boundary, that the skeleton runner is registered, and
// that invoking the runner throws (because command
// execution is not implemented yet).

import assert from "node:assert/strict";
import test from "node:test";
import verifyCapability, {
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

test("skeleton runner handler throws because execution is not implemented", async () => {
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
