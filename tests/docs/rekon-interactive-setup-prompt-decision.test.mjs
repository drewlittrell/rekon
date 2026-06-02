// Docs contract for the Rekon Interactive Setup Prompt Decision (slice 120).
// A strategy / product-UX decision batch: it pins the TTY-only scan-first prompt
// policy for `rekon setup`. These assertions guard the decided boundaries so a
// later implementation slice cannot drift into prompting in --json / non-TTY /
// CI, auto-running downstream actions, persisting answers, or running Circe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const memoPath = resolve(root, "docs/strategy/rekon-interactive-setup-prompt-decision.md");
const packetPath = resolve(root, ".rekon-dev/review-packets/rekon-interactive-setup-prompt-decision.md");
const changelogPath = resolve(root, "CHANGELOG.md");

const raw = readFileSync(memoPath, "utf8");
// Strip backticks / asterisks and collapse whitespace; the arrow and pipes survive.
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");
const n = norm(raw);

const REQUIRED_HEADINGS = [
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Current Setup Surface",
  "## Options Considered",
  "## Recommendation",
  "## Prompt Model",
  "## Output Mode Rules",
  "## Yes Flag Model",
  "## Persistence Model",
  "## Cancellation Model",
  "## Boundary Model",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

// 1. decision memo exists (with the expected title).
test("1. decision memo exists", () => {
  assert.ok(raw.length > 0, "memo is non-empty");
  assert.match(raw, /^# Rekon Interactive Setup Prompt Decision/m);
});

// 2. doc contains all required headings.
test("2. doc contains all required headings", () => {
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(raw.includes(heading), `missing heading: ${heading}`);
  }
});

// 3. doc selects TTY-only scan-first prompts.
test("3. doc selects TTY-only scan-first prompts", () => {
  assert.match(raw, /TTY-only scan-first prompts \| selected/);
  assert.ok(n.includes("TTY-only scan-first prompts"));
});

// 4. interactive setup prompts are allowed only in human TTY mode.
test("4. prompts allowed only in human TTY mode", () => {
  assert.ok(n.includes("Interactive setup prompts are allowed only in human TTY mode."));
});

// 5. `rekon setup --json` must never prompt.
test("5. setup --json must never prompt", () => {
  assert.ok(n.includes("rekon setup --json must never prompt."));
});

// 6. non-TTY setup must never prompt.
test("6. non-TTY setup must never prompt", () => {
  assert.ok(n.includes("Non-TTY setup must never prompt."));
});

// 7. CI setup must never prompt.
test("7. CI setup must never prompt", () => {
  assert.ok(n.includes("CI setup must never prompt."));
});

// 8. before scan, setup may ask only whether to run the first scan.
test("8. before scan only the first-scan prompt", () => {
  assert.ok(n.includes("Before scan, setup may ask only whether to run the first scan."));
});

// 9. docs generation is not offered before the first scan.
test("9. no docs generation before scan", () => {
  assert.ok(n.includes("Docs generation is not offered before the first scan."));
});

// 10. agent handoff generation is not offered before the first scan.
test("10. no agent handoff generation before scan", () => {
  assert.ok(n.includes("Agent handoff generation is not offered before the first scan."));
});

// 11. verification planning is not offered before the first scan.
test("11. no verification planning before scan", () => {
  assert.ok(n.includes("Verification planning is not offered before the first scan."));
});

// 12. --yes may run the first scan but must not perform downstream actions automatically.
test("12. --yes scope is bounded", () => {
  assert.ok(
    n.includes("--yes may run the first scan but must not perform downstream actions automatically."),
  );
});

// 13. prompt answers are not persisted in v1.
test("13. no prompt-answer persistence in v1", () => {
  assert.ok(n.includes("Prompt answers are not persisted in v1."));
});

// 14. setup must not run Circe.
test("14. setup must not run Circe", () => {
  assert.ok(n.includes("Setup must not run Circe."));
});

// 15. setup must not execute arbitrary commands.
test("15. setup must not execute arbitrary commands", () => {
  assert.ok(n.includes("Setup must not execute arbitrary commands."));
});

// 16. setup must not write source files.
test("16. setup must not write source files", () => {
  assert.ok(n.includes("Setup must not write source files."));
});

// 17. intent:go remains deferred.
test("17. intent:go remains deferred", () => {
  assert.ok(n.includes("intent:go remains deferred."));
});

// 18. doc includes option table.
test("18. option table present", () => {
  assert.match(raw, /\| Option \| Decision \| Reason \|/);
  assert.match(raw, /keep setup non-interactive forever \| rejected\/deferred/);
  assert.match(raw, /postinstall launches setup \| rejected/);
});

// 19. doc includes prompt table.
test("19. prompt table present", () => {
  assert.match(raw, /\| State \| Allowed Prompt \|/);
  assert.match(raw, /snapshot_ready \| post-scan next-action selection/);
  assert.match(raw, /non-TTY \/ CI \| no prompt/);
});

// 20. doc includes flag table.
test("20. flag table present", () => {
  assert.match(raw, /\| Flag \/ Environment \| Decision \|/);
  assert.match(raw, /--yes \| run first scan only; no downstream actions/);
});

// 21. doc includes boundary table.
test("21. boundary table present", () => {
  assert.match(raw, /\| Boundary \| Decision \|/);
  assert.match(raw, /setup vs Circe \| does not run Circe/);
  assert.match(raw, /setup vs intent:go \| deferred/);
});

// 22. CHANGELOG mentions Rekon Interactive Setup Prompt Decision.
test("22. CHANGELOG mentions the decision", () => {
  const changelog = readFileSync(changelogPath, "utf8");
  assert.ok(changelog.includes("Rekon Interactive Setup Prompt Decision"));
});

// 23. review packet exists and contains PURPOSE PRESERVATION CHECK.
test("23. review packet exists with PURPOSE PRESERVATION CHECK", () => {
  const packet = readFileSync(packetPath, "utf8");
  assert.ok(packet.length > 0, "review packet is non-empty");
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});
