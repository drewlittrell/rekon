import assert from "node:assert/strict";
import test from "node:test";

import { createFindingReport, validateFindingReport } from "../dist/index.js";

const header = {
  artifactType: "FindingReport",
  artifactId: "findings",
  schemaVersion: "0.1.0",
  generatedAt: "2026-05-13T17:00:00.000Z",
  subject: { repoId: "rekon" },
  producer: { id: "test", version: "0.1.0" },
  inputRefs: [],
};

test("createFindingReport summarizes and normalizes findings", () => {
  const report = createFindingReport({
    header,
    findings: [{
      id: "finding-1",
      type: "import",
      severity: "medium",
      title: "Bad import",
      description: "No dist imports.",
      subjects: ["src/a.ts", "src/a.ts"],
      files: ["src/a.ts"],
    }],
  });

  assert.equal(validateFindingReport(report).ok, true);
  assert.deepEqual(report.summary, { total: 1, bySeverity: { medium: 1 }, byType: { import: 1 } });
  assert.equal(report.findings[0].status, "new");
  assert.equal(report.findings[0].rootCauseKey, "finding-1");
});

test("createFindingReport fuses explicit shared root causes", () => {
  const report = createFindingReport({
    header,
    findings: [
      {
        id: "signal-a",
        rootCauseKey: "import:src/a.ts:dist",
        type: "import",
        severity: "medium",
        title: "Bad import",
        description: "Imports dist output.",
        subjects: ["src/a.ts"],
        files: ["src/a.ts"],
      },
      {
        id: "signal-b",
        rootCauseKey: "import:src/a.ts:dist",
        type: "architecture",
        severity: "high",
        title: "Boundary bypass",
        description: "The same import bypasses a boundary.",
        subjects: ["src/a.ts"],
        files: ["src/a.ts"],
      },
    ],
  });

  assert.equal(report.summary.total, 1);
  assert.equal(report.findings[0].severity, "high");
  assert.equal(report.findings[0].rootCauseKey, "import:src/a.ts:dist");
  assert.equal(report.findings[0].supportingFindings.length, 2);
});

test("validateFindingReport rejects bad findings", () => {
  const result = validateFindingReport({
    header: { ...header, artifactType: "Rulebook" },
    summary: {},
    findings: [{ id: "", type: "", severity: "bad", title: "", description: "", subjects: [1] }],
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.issues.map((issue) => issue.path), [
    "$.header.artifactType",
    "$.summary",
    "$.findings[0].id",
    "$.findings[0].type",
    "$.findings[0].title",
    "$.findings[0].description",
    "$.findings[0].severity",
    "$.findings[0].subjects",
  ]);
});
