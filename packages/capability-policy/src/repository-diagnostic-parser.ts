export type RepositoryCheckCategory = "build" | "test" | "typecheck" | "lint";

export type RepositoryDiagnosticParser =
  | "eslint"
  | "eslint-json"
  | "junit"
  | "typescript"
  | "test-runner"
  | "node-tap"
  | "build";

export type ParsedRepositoryDiagnostic = {
  parser: RepositoryDiagnosticParser;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
  severity?: "error" | "warning";
};

export function parseRepositoryDiagnostics(input: {
  category: RepositoryCheckCategory;
  output: string;
  sourcePaths: readonly string[];
}): ParsedRepositoryDiagnostic[] {
  const output = stripAnsi(input.output);
  const diagnostics: ParsedRepositoryDiagnostic[] = [];

  if (input.category === "lint") {
    diagnostics.push(...parseEslintStylish(output, input.sourcePaths));
    diagnostics.push(...parseEslintCompact(output, input.sourcePaths));
  }

  if (input.category === "typecheck" || input.category === "build") {
    diagnostics.push(...parseTypeScript(output, input.sourcePaths));
  }

  if (input.category === "test") {
    const tapDiagnostics = parseNodeTap(output, input.sourcePaths);
    diagnostics.push(...(tapDiagnostics.length > 0
      ? tapDiagnostics
      : parseTestRunnerLocations(output, input.sourcePaths)));
  }

  if (input.category === "build") {
    diagnostics.push(...parseBuildLocations(output, input.sourcePaths));
  }

  return dedupeDiagnostics(diagnostics);
}

function parseEslintStylish(
  output: string,
  sourcePaths: readonly string[],
): ParsedRepositoryDiagnostic[] {
  const lines = output.split(/\r?\n/);
  const diagnostics: ParsedRepositoryDiagnostic[] = [];
  let currentFile: string | undefined;

  for (const line of lines) {
    const path = knownPathOnLine(line, sourcePaths);
    if (path && line.trim().endsWith(path)) {
      currentFile = path;
      continue;
    }

    if (!currentFile) continue;
    const row = /^\s*(\d+):(\d+)\s+(error|warning)\s+(.+?)(?:\s{2,}([^\s]+))?\s*$/i.exec(line);
    if (row) {
      diagnostics.push({
        parser: "eslint",
        file: currentFile,
        line: Number(row[1]),
        column: Number(row[2]),
        severity: row[3]!.toLowerCase() as "error" | "warning",
        message: normalizeMessage(row[4]!),
        ...(row[5] ? { code: row[5] } : {}),
      });
      continue;
    }

    if (line.trim().length > 0 && knownPathOnLine(line, sourcePaths)) {
      currentFile = knownPathOnLine(line, sourcePaths);
    }
  }

  return diagnostics;
}

function parseEslintCompact(
  output: string,
  sourcePaths: readonly string[],
): ParsedRepositoryDiagnostic[] {
  const diagnostics: ParsedRepositoryDiagnostic[] = [];

  for (const file of sourcePaths) {
    const pattern = new RegExp(
      `${escapeRegExp(file)}:(\\d+):(\\d+):\\s*([^\\n]+?)\\s*\\[(Error|Warning)\\/([^\\]]+)\\]`,
      "gi",
    );
    for (const match of output.matchAll(pattern)) {
      diagnostics.push({
        parser: "eslint",
        file,
        line: Number(match[1]),
        column: Number(match[2]),
        message: normalizeMessage(match[3]!),
        severity: match[4]!.toLowerCase() as "error" | "warning",
        code: match[5],
      });
    }
  }

  return diagnostics;
}

function parseTypeScript(
  output: string,
  sourcePaths: readonly string[],
): ParsedRepositoryDiagnostic[] {
  const diagnostics: ParsedRepositoryDiagnostic[] = [];

  for (const file of sourcePaths) {
    const pattern = new RegExp(
      `${escapeRegExp(file)}(?:\\((\\d+),(\\d+)\\)|:(\\d+):(\\d+))\\s*(?:-|:)?\\s*(error|warning)\\s+(TS\\d+):\\s*([^\\n]+)`,
      "gi",
    );
    for (const match of output.matchAll(pattern)) {
      diagnostics.push({
        parser: "typescript",
        file,
        line: Number(match[1] ?? match[3]),
        column: Number(match[2] ?? match[4]),
        severity: match[5]!.toLowerCase() as "error" | "warning",
        code: match[6]!.toUpperCase(),
        message: normalizeMessage(match[7]!),
      });
    }
  }

  return diagnostics;
}

function parseTestRunnerLocations(
  output: string,
  sourcePaths: readonly string[],
): ParsedRepositoryDiagnostic[] {
  const diagnostics: ParsedRepositoryDiagnostic[] = [];

  for (const file of sourcePaths) {
    const pattern = new RegExp(`${escapeRegExp(file)}:(\\d+):(\\d+)`, "g");
    for (const match of output.matchAll(pattern)) {
      const message = nearestTestFailureMessage(output, match.index ?? 0);
      if (!message) continue;
      diagnostics.push({
        parser: "test-runner",
        file,
        line: Number(match[1]),
        column: Number(match[2]),
        code: "test-failure",
        severity: "error",
        message,
      });
    }
  }

  return diagnostics;
}

function parseNodeTap(
  output: string,
  sourcePaths: readonly string[],
): ParsedRepositoryDiagnostic[] {
  if (!/(?:^TAP version\s+\d+|^# Subtest:|^\s+---$)/m.test(output)) return [];
  const lines = output.split(/\r?\n/);
  const diagnostics: ParsedRepositoryDiagnostic[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const row = /^not ok\s+\d+\s+-\s+(.+)$/i.exec(lines[index] ?? "");
    if (!row) continue;
    let end = index + 1;
    while (end < lines.length && !/^(?:not )?ok\s+\d+\s+-\s+/i.test(lines[end] ?? "")) end += 1;
    const block = lines.slice(index + 1, end).join("\n");
    const location = firstKnownLocation(block, sourcePaths);
    const errorLine = lines.slice(index + 1, end).find((line) =>
      /^\s*(?:error|message):\s*\S/i.test(line)
      || /(?:AssertionError|expected|received)/i.test(line),
    );
    const error = errorLine
      ? normalizeMessage(errorLine.replace(/^\s*(?:error|message):\s*/i, ""))
      : undefined;
    diagnostics.push({
      parser: "node-tap",
      code: "tap:not-ok",
      severity: "error",
      message: normalizeMessage(`${row[1]}${error ? `: ${error}` : ""}`),
      ...(location ?? {}),
    });
    index = end - 1;
  }

  return diagnostics;
}

function parseBuildLocations(
  output: string,
  sourcePaths: readonly string[],
): ParsedRepositoryDiagnostic[] {
  const diagnostics: ParsedRepositoryDiagnostic[] = [];

  for (const file of sourcePaths) {
    const pattern = new RegExp(
      `${escapeRegExp(file)}:(\\d+):(\\d+)\\s*(?:-|:)?\\s*(?:ERROR|Error|error)?\\s*:?[ \\t]*([^\\n)]+)`,
      "g",
    );
    for (const match of output.matchAll(pattern)) {
      const message = normalizeMessage(match[3]!);
      if (message.length < 4 || /^(?:at\s|\[?plugin:|TS\d+:)/i.test(message)) continue;
      diagnostics.push({
        parser: "build",
        file,
        line: Number(match[1]),
        column: Number(match[2]),
        severity: "error",
        message,
      });
    }
  }

  return diagnostics;
}

function firstKnownLocation(
  text: string,
  sourcePaths: readonly string[],
): Pick<ParsedRepositoryDiagnostic, "file" | "line" | "column"> | undefined {
  for (const file of sourcePaths) {
    const match = new RegExp(`${escapeRegExp(file)}:(\\d+):(\\d+)`).exec(text);
    if (match) return { file, line: Number(match[1]), column: Number(match[2]) };
  }
  return undefined;
}

function nearestTestFailureMessage(output: string, locationOffset: number): string | undefined {
  const before = output.slice(0, locationOffset).split(/\r?\n/).slice(-12).reverse();
  const candidate = before.find((line) =>
    /(?:AssertionError|Error:|expected|received|failed|failure)/i.test(line)
    && !/^\s*at\s/.test(line),
  );
  if (!candidate) return undefined;
  return normalizeMessage(candidate.replace(/^\s*(?:AssertionError\s*:?)?\s*/i, ""));
}

function knownPathOnLine(line: string, sourcePaths: readonly string[]): string | undefined {
  return sourcePaths
    .slice()
    .sort((left, right) => right.length - left.length)
    .find((path) => line.includes(path));
}

function dedupeDiagnostics(input: ParsedRepositoryDiagnostic[]): ParsedRepositoryDiagnostic[] {
  const byKey = new Map<string, ParsedRepositoryDiagnostic>();
  for (const diagnostic of input) {
    const normalized: ParsedRepositoryDiagnostic = {
      ...diagnostic,
      message: normalizeMessage(diagnostic.message),
    };
    const key = [
      normalized.parser,
      normalized.file ?? "",
      normalized.line ?? 0,
      normalized.column ?? 0,
      normalized.code ?? "",
      normalized.message,
    ].join(":");
    byKey.set(key, normalized);
  }
  return [...byKey.values()].sort((left, right) => diagnosticKey(left).localeCompare(diagnosticKey(right)));
}

function diagnosticKey(diagnostic: ParsedRepositoryDiagnostic): string {
  return [
    diagnostic.file ?? "",
    diagnostic.line ?? 0,
    diagnostic.column ?? 0,
    diagnostic.code ?? "",
    diagnostic.message,
    diagnostic.parser,
  ].join(":");
}

function normalizeMessage(value: string): string {
  return stripAnsi(value)
    .replace(/\b\d+(?:\.\d+)?\s*(?:ms|milliseconds?|seconds?|secs?)\b/gi, "<duration>")
    .replace(/\b20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/g, "<timestamp>")
    .replace(/\s+/g, " ")
    .trim();
}

function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
