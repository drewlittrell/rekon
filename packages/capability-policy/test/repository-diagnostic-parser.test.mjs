import assert from "node:assert/strict";
import test from "node:test";

import { parseRepositoryDiagnostics } from "../dist/repository-diagnostic-parser.js";

const paths = ["src/index.ts", "src/service.test.ts"];

test("parses ESLint stylish output into location-specific diagnostics", () => {
  const diagnostics = parseRepositoryDiagnostics({
    category: "lint",
    sourcePaths: paths,
    output: [
      "/workspace/src/index.ts",
      "  3:15  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any",
      "  8:2   warning  'unused' is assigned but never used       @typescript-eslint/no-unused-vars",
      "",
      "2 problems (1 error, 1 warning)",
    ].join("\n"),
  });

  assert.deepEqual(diagnostics, [
    {
      parser: "eslint",
      file: "src/index.ts",
      line: 3,
      column: 15,
      severity: "error",
      message: "Unexpected any. Specify a different type",
      code: "@typescript-eslint/no-explicit-any",
    },
    {
      parser: "eslint",
      file: "src/index.ts",
      line: 8,
      column: 2,
      severity: "warning",
      message: "'unused' is assigned but never used",
      code: "@typescript-eslint/no-unused-vars",
    },
  ]);
});

test("parses ESLint compact output", () => {
  const [diagnostic] = parseRepositoryDiagnostics({
    category: "lint",
    sourcePaths: paths,
    output: "src/index.ts:4:9: Unexpected console statement. [Error/no-console]",
  });

  assert.deepEqual(diagnostic, {
    parser: "eslint",
    file: "src/index.ts",
    line: 4,
    column: 9,
    message: "Unexpected console statement.",
    severity: "error",
    code: "no-console",
  });
});

test("parses TypeScript parenthesized and colon locations", () => {
  const diagnostics = parseRepositoryDiagnostics({
    category: "typecheck",
    sourcePaths: paths,
    output: [
      "src/index.ts(5,7): error TS2322: Type 'number' is not assignable to type 'string'.",
      "src/index.ts:9:3 - error TS18048: 'value' is possibly 'undefined'.",
    ].join("\n"),
  });

  assert.deepEqual(diagnostics.map(({ line, column, code }) => ({ line, column, code })), [
    { line: 5, column: 7, code: "TS2322" },
    { line: 9, column: 3, code: "TS18048" },
  ]);
});

test("parses Vitest and Jest-style test locations", () => {
  const diagnostics = parseRepositoryDiagnostics({
    category: "test",
    sourcePaths: paths,
    output: [
      "FAIL src/service.test.ts > service returns a value",
      "AssertionError: expected 2 to be 1",
      "    at src/service.test.ts:12:5",
    ].join("\n"),
  });

  assert.deepEqual(diagnostics, [{
    parser: "test-runner",
    file: "src/service.test.ts",
    line: 12,
    column: 5,
    code: "test-failure",
    severity: "error",
    message: "expected 2 to be 1",
  }]);
});

test("collapses a Node TAP failure block into one diagnostic", () => {
  const diagnostics = parseRepositoryDiagnostics({
    category: "test",
    sourcePaths: paths,
    output: [
      "TAP version 13",
      "# Subtest: service handles missing input",
      "not ok 1 - service handles missing input",
      "  ---",
      "  error: expected an error result",
      "  stack: |",
      "    at src/service.test.ts:18:7",
      "  ...",
    ].join("\n"),
  });

  assert.deepEqual(diagnostics, [{
    parser: "node-tap",
    file: "src/service.test.ts",
    line: 18,
    column: 7,
    code: "tap:not-ok",
    severity: "error",
    message: "service handles missing input: expected an error result",
  }]);
});

test("parses file-located build errors and ignores unlocated summaries", () => {
  const diagnostics = parseRepositoryDiagnostics({
    category: "build",
    sourcePaths: paths,
    output: [
      "src/index.ts:14:6: ERROR: Could not resolve './missing.js'",
      "Build failed with 1 error in 247ms",
    ].join("\n"),
  });

  assert.deepEqual(diagnostics, [{
    parser: "build",
    file: "src/index.ts",
    line: 14,
    column: 6,
    severity: "error",
    message: "Could not resolve './missing.js'",
  }]);
});

test("does not duplicate TypeScript diagnostics as generic build errors", () => {
  const diagnostics = parseRepositoryDiagnostics({
    category: "build",
    sourcePaths: paths,
    output: "src/index.ts:5:7 - error TS2322: Type 'number' is not assignable to type 'string'.",
  });

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].parser, "typescript");
  assert.equal(diagnostics[0].code, "TS2322");
});

test("returns no structured diagnostics for unknown output", () => {
  assert.deepEqual(parseRepositoryDiagnostics({
    category: "build",
    sourcePaths: paths,
    output: "The command failed for an unknown reason.",
  }), []);
});
