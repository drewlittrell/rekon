#!/usr/bin/env node
// Stamp every strategy memo as a point-in-time snapshot (WO-5).
//
// Inserts the snapshot banner immediately after the H1 of every markdown
// file under docs/strategy/, excluding the allowlist (the living documents)
// and anything under archive/. Allowlist files instead receive a one-line
// living-document status note. Idempotent: detection is by the literal
// banner/note string, and a second run changes nothing. Additive only: no
// other content is edited.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export const SNAPSHOT_BANNER = [
  "> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not",
  "> read it as current state. Current state lives in source code, CLI",
  "> output, artifact schemas, `docs/concepts/`, and",
  "> `docs/strategy/rekon-system-model.md`.",
].join("\n");

export const LIVING_NOTE =
  "> **LIVING DOCUMENT.** Maintained as current state; governed by the Documentation authority section in AGENTS.md.";

const ALLOWLIST = new Set(["rekon-system-model.md", "north-star.md", "roadmap.md"]);

function collectMarkdownFiles(root) {
  const files = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const entryPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "archive") {
          continue;
        }

        walk(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(entryPath);
      }
    }
  };

  walk(root);
  return files.sort();
}

function insertAfterH1(content, insertion) {
  const lines = content.split("\n");
  const h1Index = lines.findIndex((line) => line.startsWith("# "));

  if (h1Index === -1) {
    return `${insertion}\n\n${content}`;
  }

  return [...lines.slice(0, h1Index + 1), "", insertion, ...lines.slice(h1Index + 1)].join("\n");
}

export function stampDocSnapshots(root) {
  const summary = { stamped: [], livingNoted: [], unchanged: [], total: 0 };

  for (const filePath of collectMarkdownFiles(root)) {
    summary.total += 1;
    const rel = relative(root, filePath);
    const isAllowlisted = !rel.includes("/") && ALLOWLIST.has(rel);
    const content = readFileSync(filePath, "utf8");
    const marker = isAllowlisted ? LIVING_NOTE : SNAPSHOT_BANNER;

    if (content.includes(marker)) {
      summary.unchanged.push(rel);
      continue;
    }

    writeFileSync(filePath, insertAfterH1(content, marker), "utf8");
    (isAllowlisted ? summary.livingNoted : summary.stamped).push(rel);
  }

  return summary;
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);

if (isDirectRun) {
  const rootFlagIndex = process.argv.indexOf("--root");
  const root =
    rootFlagIndex !== -1 && process.argv[rootFlagIndex + 1]
      ? resolve(process.argv[rootFlagIndex + 1])
      : resolve(new URL("../docs/strategy", import.meta.url).pathname);

  const summary = stampDocSnapshots(root);

  console.log(
    `stamp-doc-snapshots: ${summary.stamped.length} stamped, ${summary.livingNoted.length} living-noted, ` +
      `${summary.unchanged.length} already current, ${summary.total} markdown files scanned under ${root}.`,
  );
}
