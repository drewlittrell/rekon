import assert from "node:assert/strict";
import test from "node:test";

import { resolveRequestRegion } from "../../apps/gateway/src/region-controller.ts";
import { loadRegionConfig } from "../../platform/routing/src/load-region-config.ts";
import { chooseRegion } from "../../platform/routing/src/region-policy.ts";

test("enterprise traffic fails over to the configured enabled region", () => {
  assert.equal(
    chooseRegion(loadRegionConfig(), "us-east", "enterprise", ["eu-west"]),
    "eu-west",
  );
});

test("the gateway response keeps its public shape", () => {
  assert.deepEqual(resolveRequestRegion("us-east", "standard", ["eu-west"]), {
    region: "us-east",
  });
});
