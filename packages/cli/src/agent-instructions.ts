import { randomUUID } from "node:crypto";
import { lstat, open, readFile, realpath, rename, rm, chmod } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import {
  REKON_AGENT_CLI_FALLBACKS,
  REKON_AGENT_MCP_BOUNDARY,
  REKON_AGENT_MCP_STEPS,
} from "@rekon/mcp";

export const AGENT_INSTRUCTIONS_VERSION = "2.0.0";
export const AGENT_INSTRUCTIONS_TARGET = "AGENTS.md";
export const AGENT_INSTRUCTIONS_START =
  `<!-- rekon:agent-instructions:start version="${AGENT_INSTRUCTIONS_VERSION}" -->`;
export const AGENT_INSTRUCTIONS_END = "<!-- rekon:agent-instructions:end -->";

export type AgentInstructionsStatus = "current" | "missing" | "stale" | "malformed" | "disabled";

export type AgentInstructionsResult = {
  target: string;
  absolutePath: string;
  status: AgentInstructionsStatus;
  changed: boolean;
  version: string;
  message?: string;
};

export type AgentInstructionsOptions = {
  enabled?: boolean;
  target?: string;
};

export function renderAgentInstructionsBlock(): string {
  return [
    AGENT_INSTRUCTIONS_START,
    "## Rekon",
    "",
    "This repository uses Rekon for repository context and change governance.",
    "Before the first repository command, search, read, or edit, use Rekon MCP when available. Do not probe for the CLI first.",
    "After context compaction or restart, and whenever the task goal or path scope changes, request fresh task context before continuing.",
    "",
    "When Rekon MCP tools are available:",
    "",
    ...REKON_AGENT_MCP_STEPS.map((step, index) => `${index + 1}. ${step}`),
    "",
    REKON_AGENT_MCP_BOUNDARY,
    "",
    "Use the CLI only when Rekon MCP is absent or fails:",
    "",
    ...REKON_AGENT_CLI_FALLBACKS.map((command) => `- \`${command}\``),
    "",
    "If task context reports missing or drifted repository law, run `rekon contracts maintain --root . --json`, inspect the cited source, and complete its judgment step yourself. Apply contract sources only when the configured adoption policy permits it.",
    "",
    "If context is stale and artifact writes are allowed, run `rekon refresh --root . --json`. Context is evidence; required checks are proof.",
    "",
    "This block is managed by Rekon. Put repository-specific instructions outside the markers.",
    AGENT_INSTRUCTIONS_END,
  ].join("\n");
}

function countOccurrences(content: string, marker: string): number {
  return content.split(marker).length - 1;
}

function locateManagedBlock(content: string): { start: number; end: number } | null {
  const startCount = countOccurrences(content, "<!-- rekon:agent-instructions:start");
  const endCount = countOccurrences(content, AGENT_INSTRUCTIONS_END);

  if (startCount === 0 && endCount === 0) return null;
  if (startCount !== 1 || endCount !== 1) {
    throw new Error("AGENTS.md contains malformed or duplicated Rekon instruction markers.");
  }

  const start = content.indexOf("<!-- rekon:agent-instructions:start");
  const startClose = content.indexOf("-->", start);
  const endMarker = content.indexOf(AGENT_INSTRUCTIONS_END, startClose + 3);

  if (start < 0 || startClose < 0 || endMarker < 0 || endMarker < startClose) {
    throw new Error("AGENTS.md contains an unclosed or out-of-order Rekon instruction block.");
  }

  return { start, end: endMarker + AGENT_INSTRUCTIONS_END.length };
}

function insertOrReplaceManagedBlock(content: string): string {
  const block = renderAgentInstructionsBlock();
  const located = locateManagedBlock(content);

  if (located) {
    return `${content.slice(0, located.start)}${block}${content.slice(located.end)}`;
  }

  if (content.length === 0) return `# AGENTS\n\n${block}\n`;
  const separator = content.endsWith("\n\n") ? "" : content.endsWith("\n") ? "\n" : "\n\n";
  return `${content}${separator}${block}\n`;
}

function removeManagedBlock(content: string): string {
  const located = locateManagedBlock(content);
  if (!located) return content;
  return `${content.slice(0, located.start)}${content.slice(located.end)}`;
}

async function resolveSafeTarget(root: string, target: string): Promise<{ absoluteRoot: string; absolutePath: string }> {
  if (target.replace(/\\/g, "/") !== AGENT_INSTRUCTIONS_TARGET) {
    throw new Error(`Rekon v1 agent instructions may target only ${AGENT_INSTRUCTIONS_TARGET}.`);
  }
  const absoluteRoot = await realpath(resolve(root));
  const absolutePath = resolve(absoluteRoot, target);
  const relativePath = relative(absoluteRoot, absolutePath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error("Agent instruction target must stay inside the repository root.");
  }
  try {
    const stats = await lstat(absolutePath);
    if (stats.isSymbolicLink() || !stats.isFile()) {
      throw new Error("Agent instruction target must be a regular, non-symlink file.");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return { absoluteRoot, absolutePath };
}

async function readExisting(path: string): Promise<{ content: string; mode?: number }> {
  try {
    const stats = await lstat(path);
    return { content: await readFile(path, "utf8"), mode: stats.mode };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { content: "" };
    throw error;
  }
}

async function atomicWrite(root: string, target: string, content: string, mode?: number): Promise<void> {
  const temporary = resolve(root, `.rekon-agent-instructions-${randomUUID()}.tmp`);
  const handle = await open(temporary, "wx", mode ?? 0o644);
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    if (mode !== undefined) await chmod(temporary, mode & 0o777);
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export async function checkAgentInstructions(
  root: string,
  options: AgentInstructionsOptions = {},
): Promise<AgentInstructionsResult> {
  const target = options.target ?? AGENT_INSTRUCTIONS_TARGET;
  const { absolutePath } = await resolveSafeTarget(root, target);
  if (options.enabled === false) {
    return { target, absolutePath, status: "disabled", changed: false, version: AGENT_INSTRUCTIONS_VERSION };
  }
  const { content } = await readExisting(absolutePath);
  if (content.length === 0) {
    return { target, absolutePath, status: "missing", changed: false, version: AGENT_INSTRUCTIONS_VERSION };
  }
  try {
    const located = locateManagedBlock(content);
    if (!located) {
      return { target, absolutePath, status: "missing", changed: false, version: AGENT_INSTRUCTIONS_VERSION };
    }
    const current = content.slice(located.start, located.end) === renderAgentInstructionsBlock();
    return {
      target,
      absolutePath,
      status: current ? "current" : "stale",
      changed: false,
      version: AGENT_INSTRUCTIONS_VERSION,
    };
  } catch (error) {
    return {
      target,
      absolutePath,
      status: "malformed",
      changed: false,
      version: AGENT_INSTRUCTIONS_VERSION,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function syncAgentInstructions(
  root: string,
  options: AgentInstructionsOptions = {},
): Promise<AgentInstructionsResult> {
  const target = options.target ?? AGENT_INSTRUCTIONS_TARGET;
  const { absoluteRoot, absolutePath } = await resolveSafeTarget(root, target);
  if (options.enabled === false) {
    return { target, absolutePath, status: "disabled", changed: false, version: AGENT_INSTRUCTIONS_VERSION };
  }
  const existing = await readExisting(absolutePath);
  const next = insertOrReplaceManagedBlock(existing.content);
  if (next === existing.content) {
    return { target, absolutePath, status: "current", changed: false, version: AGENT_INSTRUCTIONS_VERSION };
  }
  await atomicWrite(absoluteRoot, absolutePath, next, existing.mode);
  return { target, absolutePath, status: "current", changed: true, version: AGENT_INSTRUCTIONS_VERSION };
}

export async function removeAgentInstructions(
  root: string,
  options: AgentInstructionsOptions = {},
): Promise<AgentInstructionsResult> {
  const target = options.target ?? AGENT_INSTRUCTIONS_TARGET;
  const { absoluteRoot, absolutePath } = await resolveSafeTarget(root, target);
  const existing = await readExisting(absolutePath);
  if (existing.content.length === 0) {
    return { target, absolutePath, status: "missing", changed: false, version: AGENT_INSTRUCTIONS_VERSION };
  }
  const next = removeManagedBlock(existing.content);
  if (next === existing.content) {
    return { target, absolutePath, status: "missing", changed: false, version: AGENT_INSTRUCTIONS_VERSION };
  }
  await atomicWrite(absoluteRoot, absolutePath, next, existing.mode);
  return { target, absolutePath, status: "missing", changed: true, version: AGENT_INSTRUCTIONS_VERSION };
}
