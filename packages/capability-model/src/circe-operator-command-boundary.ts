export type CirceOperatorCommandPlacement = {
  command: string;
  suggestedFix: string;
  message: string;
};

const CIRCE_OPERATOR_COMMAND_PREFIXES = [
  "circe plans report",
  "circe phase report",
  "circe handoffs show",
  "circe handoffs trace",
  "circe admin attention",
  "circe workers status",
  "circe actors pipeline",
  "circe actors assignments",
  "circe actors list",
  "circe actors show",
  "circe actors events",
  "circe work runs",
  "circe dispatch diagnostics",
];

const CIRCE_COMMAND_RE = /\bcirce\s+[A-Za-z0-9_-]+(?:\s+[A-Za-z0-9_-]+)?(?:\s+[^\n\r]*)?/i;

function normalizeCommand(value: string): string {
  return value
    .trim()
    .replace(/^`+|`+$/g, "")
    .replace(/^\s*(?:run|execute|inspect|check|review)\s+/i, "")
    .replace(/\s+/g, " ");
}

export function findCirceOperatorCockpitCommand(text: string | undefined): string | null {
  if (typeof text !== "string" || text.trim().length === 0) return null;
  const match = CIRCE_COMMAND_RE.exec(text);
  const command = normalizeCommand(match?.[0] ?? text);
  const lower = command.toLowerCase();
  const prefix = CIRCE_OPERATOR_COMMAND_PREFIXES.find((candidate) => lower.startsWith(candidate));
  return prefix ? command : null;
}

export function buildCirceOperatorCommandPlacement(command: string): CirceOperatorCommandPlacement {
  const suggestedFix =
    "Move this Circe cockpit command to an `Operator Inspection After Run` section. Keep worker-facing Verification Commands / Required Checks repo-local, such as `npm run typecheck`, `npm run agents:generate`, or `npm test`.";
  return {
    command,
    suggestedFix,
    message:
      `Circe cockpit command "${command}" is an operator inspection command, not worker verification. ` +
      "Worker-facing verification sections must contain repo-local checks only.",
  };
}
