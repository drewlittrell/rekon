import assert from "node:assert/strict";
import test from "node:test";

import { recordMetric } from "../../extensions/metrics/src/metric-registry.ts";

test("increments counters", () => {
  assert.equal(recordMetric(2), 3);
});
