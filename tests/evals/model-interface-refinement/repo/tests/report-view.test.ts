import assert from "node:assert/strict";
import test from "node:test";

import { renderReport } from "../src/reports/report-view.ts";

test("renders a legacy report title", () => {
  assert.equal(renderReport({ id: "report-1", title: "Quarterly report" }), "Quarterly report");
});
