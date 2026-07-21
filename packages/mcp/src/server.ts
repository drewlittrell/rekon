// MCP stdio server loop. Minimal in-house JSON-RPC 2.0 over
// newline-delimited stdio - no third-party protocol code inside the trust
// boundary. Local only: no listeners, ports, network egress, or child
// processes.

import {
  MCP_PROTOCOL_VERSION,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  MCP_TOOLS,
  callTool,
  type McpToolResponse,
} from "./index.js";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
};

export type McpToolCall = {
  repoRoot: string;
  name: string;
  args: Record<string, unknown>;
};

export type McpServerOptions = {
  beforeToolCall?: (call: McpToolCall) => Promise<void>;
  handleToolCall?: (call: McpToolCall) => Promise<McpToolResponse | undefined>;
};

export async function handleMcpRequest(
  repoRoot: string,
  request: JsonRpcRequest,
  options: McpServerOptions = {},
): Promise<unknown | undefined> {
  const { id, method, params } = request;

  // Notifications (no id) get no response.
  const respond = (result: unknown) => (id === undefined ? undefined : { jsonrpc: "2.0", id, result });
  const fail = (code: number, message: string) =>
    id === undefined ? undefined : { jsonrpc: "2.0", id, error: { code, message } };

  switch (method) {
    case "initialize":
      return respond({
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
      });
    case "notifications/initialized":
      return undefined;
    case "ping":
      return respond({});
    case "tools/list":
      return respond({ tools: MCP_TOOLS });
    case "tools/call": {
      const name = typeof params?.name === "string" ? params.name : "";
      const args = (params?.arguments as Record<string, unknown>) ?? {};
      const call = { repoRoot, name, args };
      await options.beforeToolCall?.(call);
      const payload = await options.handleToolCall?.(call) ?? await callTool(repoRoot, name, args);

      return respond({
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        isError: Boolean(payload.unavailable),
      });
    }
    default:
      return fail(-32601, `Method not found: ${method}`);
  }
}

/** Run the stdio loop. Reads newline-delimited JSON-RPC from stdin forever. */
export function runMcpServer(repoRoot: string, options: McpServerOptions = {}): void {
  let buffer = "";
  let requestQueue = Promise.resolve();

  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk: string) => {
    buffer += chunk;

    let newline = buffer.indexOf("\n");

    while (newline !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");

      if (line.length === 0) {
        continue;
      }

      requestQueue = requestQueue.then(() => processMcpLine(repoRoot, line, options));
    }
  });
}

async function processMcpLine(
  repoRoot: string,
  line: string,
  options: McpServerOptions,
): Promise<void> {
  let request: JsonRpcRequest;

  try {
    request = JSON.parse(line);
  } catch {
    process.stdout.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } })}\n`,
    );
    return;
  }

  let response: unknown | undefined;

  try {
    response = await handleMcpRequest(repoRoot, request, options);
  } catch (error) {
    response = request.id === undefined
      ? undefined
      : {
          jsonrpc: "2.0",
          id: request.id,
          error: { code: -32603, message: error instanceof Error ? error.message : String(error) },
        };
  }

  if (response !== undefined) {
    process.stdout.write(`${JSON.stringify(response)}\n`);
  }
}
