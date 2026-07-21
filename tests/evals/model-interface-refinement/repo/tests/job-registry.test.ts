import assert from "node:assert/strict";
import test from "node:test";

import { implementationForJob } from "../src/jobs/job-registry.ts";

test("registers the cleanup job by stable implementation id", () => {
  assert.equal(
    implementationForJob("cleanup-expired-sessions"),
    "cleanup-expired-sessions:v1",
  );
});
