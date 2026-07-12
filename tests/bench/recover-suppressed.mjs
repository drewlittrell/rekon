#!/usr/bin/env node
// Export the legacy baseline's suppressed findings (the labeled
// false-positive set) from a classic filter artifact into the parity
// corpus. Reads a `filtered-issues.json` (shape: { filteredIssues:
// [{ issue, reason, ... }] }) and writes `suppressed.json` next to the
// corpus repo's issues.json as [{ issue, reason }] entries.
//
// Paths are ARGUMENTS, never hardcoded: classic outputs and target repos
// contain private data, and none of it - including machine paths - may be
// committed to this repository.
//
// Usage: node tests/bench/recover-suppressed.mjs --source <filtered-issues.json> --out <suppressed.json>

import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(name);

  return index === -1 ? undefined : args[index + 1];
};

const source = flag("--source");
const out = flag("--out");

if (!source || !out) {
  console.error("usage: recover-suppressed.mjs --source <filtered-issues.json> --out <suppressed.json>");
  process.exit(1);
}

const document = JSON.parse(readFileSync(source, "utf8"));
const filtered = Array.isArray(document.filteredIssues) ? document.filteredIssues : [];
const entries = filtered
  .filter((entry) => entry && typeof entry === "object" && entry.issue && typeof entry.issue === "object")
  .map((entry) => ({ issue: entry.issue, reason: typeof entry.reason === "string" ? entry.reason : "unspecified" }));

writeFileSync(out, JSON.stringify(entries, null, 2) + "\n");
console.log(`recover-suppressed: wrote ${entries.length} labeled negative(s) to ${out}`);
