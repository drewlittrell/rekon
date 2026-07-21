import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const repoRoot = process.env.REKON_EVAL_REPO_ROOT;

if (!repoRoot) {
  test("report producer oracle runs only inside the isolated eval repository", {
    skip: "Run through eval:model-interface:refinement:adoption.",
  });
} else {
  test("optional producer metadata reaches the view without changing legacy reports", async () => {
    const { exportReport } = await import(pathToFileURL(join(
      repoRoot,
      "src/reports/report-exporter.ts",
    )));
    const { renderReport } = await import(pathToFileURL(join(
      repoRoot,
      "src/reports/report-view.ts",
    )));

    const enriched = exportReport({
      id: "report-2",
      title: "Incident review",
      generatedBy: "ops-bot",
    });
    assert.deepEqual(enriched, {
      id: "report-2",
      title: "Incident review",
      generatedBy: "ops-bot",
    });
    const rendered = renderReport(enriched);
    assert.match(rendered, /Incident review/u);
    assert.match(rendered, /ops-bot/u);

    const legacy = exportReport({ id: "report-3", title: "Legacy report" });
    assert.deepEqual(legacy, { id: "report-3", title: "Legacy report" });
    assert.equal(Object.hasOwn(legacy, "generatedBy"), false);
    assert.equal(renderReport(legacy), "Legacy report");
  });
}
