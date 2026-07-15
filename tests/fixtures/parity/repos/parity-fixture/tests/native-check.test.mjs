import assert from "node:assert/strict";
import test from "node:test";

test("fixture exposes repository-native check evidence", () => {
  assert.equal(1, 2, "intentional calibration failure");
});
