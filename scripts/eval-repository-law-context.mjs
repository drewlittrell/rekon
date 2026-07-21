#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { evaluateRepositoryLawContextFixture } from "./lib/repository-law-context-eval.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const fixturePath = resolve(root, "tests/fixtures/repository-law-context-eval/cases.json");
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const report = evaluateRepositoryLawContextFixture(fixture);

console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
