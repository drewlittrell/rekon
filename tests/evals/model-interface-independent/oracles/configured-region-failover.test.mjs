import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const repoRoot = process.env.REKON_EVAL_REPO_ROOT;

if (!repoRoot) {
  test("configured-region oracle runs only inside the isolated eval repository", {
    skip: "Run through eval:model-interface:independent.",
  });
} else {
  test("enterprise failover uses the configured enabled ap-south region", async () => {
    const config = JSON.parse(readFileSync(join(repoRoot, "config/failover-regions.json"), "utf8"));
    const { chooseRegion } = await import(pathToFileURL(join(
      repoRoot,
      "platform/routing/src/region-policy.ts",
    )));
    const { resolveRequestRegion } = await import(pathToFileURL(join(
      repoRoot,
      "apps/gateway/src/region-controller.ts",
    )));

    assert.ok(config.enabled.includes("ap-south"));
    assert.equal(config.failover["us-east"], "ap-south");
    assert.equal(
      chooseRegion(config, "us-east", "enterprise", ["ap-south", "eu-west"]),
      "ap-south",
    );
    assert.equal(
      chooseRegion(config, "us-east", "standard", ["ap-south", "eu-west"]),
      "us-east",
    );
    assert.equal(
      chooseRegion({ ...config, enabled: ["eu-west"] }, "us-east", "enterprise", ["ap-south"]),
      "us-east",
    );
    assert.deepEqual(resolveRequestRegion("us-east", "enterprise", ["ap-south"]), {
      region: "ap-south",
    });
  });
}
