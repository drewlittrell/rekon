import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { evaluateModelInterfaceFixture } from "./lib/model-interface-eval.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const fixturePath = resolve(root, "tests/fixtures/model-interface-eval/cases.json");
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const report = evaluateModelInterfaceFixture(fixture);

console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
