import assert from "node:assert/strict";
import test from "node:test";

import { extractFunctionComplexityMetrics } from "../dist/index.js";

test("extracts stable metrics for named functions and skips anonymous callbacks", () => {
  const source = [
    "export function inspect(input) {",
    "  if (input) {",
    "    if (input.ready) {",
    "      for (const item of input.items) {",
    "        if (item.enabled) alpha(item);",
    "      }",
    "    }",
    "  }",
    "  if (input.a) beta();",
    "  if (input.b) gamma();",
    "  if (input.c) delta();",
    "  if (input.d) epsilon();",
    "  if (input.e) zeta();",
    "  if (input.f) eta();",
    "  theta();",
    "  input.items.map((item) => item.value);",
    "}",
    "const assigned = (value) => value ? one() : two();",
  ].join("\n");

  const metrics = extractFunctionComplexityMetrics("src/inspect.ts", source);

  assert.deepEqual(metrics.map((entry) => entry.functionId), ["inspect", "assigned"]);
  assert.equal(metrics[0].cyclomatic, 11);
  assert.equal(metrics[0].maxNesting, 4);
  assert.equal(metrics[0].fanOut, 9);
  assert.equal(metrics[0].statements, 19);
  assert.equal(metrics[1].kind, "arrow");
  assert.equal(metrics[1].cyclomatic, 2);
});

test("qualifies class methods and gives duplicate names deterministic ordinals", () => {
  const source = [
    "class First { run() { return one(); } }",
    "class Second { run() { return two(); } }",
    "const helper = function helper() { return three(); };",
    "const other = function helper() { return four(); };",
  ].join("\n");

  const metrics = extractFunctionComplexityMetrics("src/classes.ts", source);

  assert.deepEqual(metrics.map((entry) => entry.functionId), [
    "First.run",
    "Second.run",
    "helper",
    "helper#2",
  ]);
});
