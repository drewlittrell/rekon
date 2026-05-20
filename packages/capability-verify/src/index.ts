import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type VerificationPlanLike,
  type VerificationRun,
  type VerificationRunCommand,
  type VerificationRunEnvironment,
  type VerificationRunRedaction,
  type VerificationRunRunnerInfo,
  type VerificationRunSummary,
  assertVerificationRun,
  createVerificationRun,
  summarizeVerificationRunCommands,
  validateVerificationRun,
} from "@rekon/capability-intent";
import {
  type ArtifactReader,
  type ArtifactWriter,
  type Runner,
  defineCapability,
} from "@rekon/sdk";

/**
 * `@rekon/capability-verify` skeleton (P1.1
 * verification-runner-v1).
 *
 * **No command execution is implemented in this slice.**
 * The skeleton exists so the dangerous boundary — the
 * `"runner"` role + `execute:verification` permission —
 * is declared, conformance-tested, and visible to
 * manifest review before any execute code lands. A
 * future slice adds the dry-run command (`rekon verify
 * run --plan <id> --dry-run`); a later slice adds
 * opt-in execution (`--execute`) implementing the
 * safety contract pinned in
 * [`docs/strategy/verification-runner-v1-decision.md`](../../../docs/strategy/verification-runner-v1-decision.md).
 *
 * Importing `@rekon/capability-verify` does not enable
 * execution. The runner handler throws when invoked.
 * The handler exists only to satisfy the SDK's
 * "manifest roles must have handlers" invariant.
 */

export const VERIFY_CAPABILITY_ID = "@rekon/capability-verify";
export const VERIFY_CAPABILITY_VERSION = "0.1.0";

/**
 * Re-export of the canonical VerificationRun shape so
 * callers don't need to depend on `@rekon/capability-intent`
 * directly to write VerificationRun artifacts via this
 * capability. The type itself lives in
 * `@rekon/capability-intent` next to `VerificationResult`.
 */
export {
  type VerificationRun,
  type VerificationRunCommand,
  type VerificationRunEnvironment,
  type VerificationRunRedaction,
  type VerificationRunRunnerInfo,
  type VerificationRunSummary,
  type VerificationPlanLike,
  assertVerificationRun,
  createVerificationRun,
  summarizeVerificationRunCommands,
  validateVerificationRun,
};

// ---------- Dry-run helper (P1.1 verification-run-dry-run) ----------
//
// `createVerificationRunDryRun` parses a `VerificationPlan`'s commands
// into a safe argv representation, validates each command against the
// safety contract pinned in
// `docs/strategy/verification-runner-v1-decision.md`, and returns a
// planned-but-not-run `VerificationRun` plus a per-command issue list.
//
// **No process is spawned.** The helper does not import
// `node:child_process` and does not read stdout / stderr from a real
// command. It exists so the CLI can preview the future runner's
// behavior under the same validation rules that opt-in execution
// will apply.
//
// Callers are responsible for deciding whether to write the artifact
// (writing should be refused when any command is invalid).

/**
 * Reason codes for rejected commands. Stable, machine-readable.
 */
export type VerificationRunCommandValidationReason =
  | "empty-command"
  | "shell-control-operator"
  | "command-substitution"
  | "env-assignment-prefix"
  | "newline"
  | "unsupported-syntax";

export type VerificationRunCommandValidationIssue = {
  command: string;
  reason: VerificationRunCommandValidationReason;
  message: string;
};

export type VerificationRunSafetySummary = {
  shell: false;
  executeRequired: true;
  permission: "execute:verification";
  warnings: string[];
};

export type VerificationRunDryRunRunnerInfo = {
  id?: string;
  version?: string;
  capabilityId?: string;
};

export type VerificationRunDryRunInput = {
  verificationPlan: VerificationPlanLike;
  verificationPlanRef: ArtifactRef;
  workOrderRef?: ArtifactRef;
  header: ArtifactHeader;
  runner?: VerificationRunDryRunRunnerInfo;
  environment?: VerificationRunEnvironment;
  generatedAt?: string;
};

export type VerificationRunDryRunResult = {
  verificationRun: VerificationRun;
  safety: VerificationRunSafetySummary;
  validationIssues: VerificationRunCommandValidationIssue[];
  ok: boolean;
};

/**
 * Default redaction patterns mirroring the safety contract in
 * `docs/strategy/verification-runner-v1-decision.md`. These are
 * declared on the artifact even though dry-run captures no
 * stdout / stderr, so the contract is visible from the artifact
 * itself.
 */
export const VERIFICATION_RUN_DRY_RUN_REDACTION_PATTERNS = Object.freeze([
  "env:TOKEN",
  "env:SECRET",
  "env:KEY",
  "env:PASSWORD",
  "env:PAT",
  "env:BEARER",
  "header:Authorization:Bearer",
  "header:Authorization:Basic",
]);

/**
 * The default runner identity used when the caller does not
 * supply one. Picked so `runner.id` is human-readable in the
 * dry-run output ("rekon.local.dry-run") and `capabilityId`
 * stays aligned with the manifest.
 */
export const VERIFICATION_RUN_DRY_RUN_RUNNER_ID = "rekon.local.dry-run";

/**
 * Build a planned-but-not-run `VerificationRun` from a
 * `VerificationPlan`. Does not execute or spawn anything.
 * The returned `validationIssues` array is non-empty when the
 * plan contains commands the future runner would refuse to
 * execute. Callers should refuse to write the artifact when
 * `ok` is false.
 */
export function createVerificationRunDryRun(
  input: VerificationRunDryRunInput,
): VerificationRunDryRunResult {
  if (!input || typeof input !== "object") {
    throw new TypeError("createVerificationRunDryRun requires an input object.");
  }
  if (!input.verificationPlan || typeof input.verificationPlan !== "object") {
    throw new TypeError("createVerificationRunDryRun requires input.verificationPlan.");
  }
  if (!input.verificationPlanRef || typeof input.verificationPlanRef !== "object") {
    throw new TypeError(
      "createVerificationRunDryRun requires input.verificationPlanRef.",
    );
  }
  if (!input.header || typeof input.header !== "object") {
    throw new TypeError("createVerificationRunDryRun requires input.header.");
  }

  const plan = input.verificationPlan;
  const planCommands = Array.isArray(plan.commands) ? plan.commands : [];

  const commands: VerificationRunCommand[] = [];
  const validationIssues: VerificationRunCommandValidationIssue[] = [];

  for (let index = 0; index < planCommands.length; index += 1) {
    const rawCommand = planCommands[index];
    const command = typeof rawCommand === "string" ? rawCommand : "";
    const id = `cmd-${index + 1}`;
    const validation = validateVerificationRunCommandString(command);

    if (!validation.ok) {
      validationIssues.push({
        command,
        reason: validation.reason,
        message: validation.message,
      });
    }

    commands.push({
      id,
      command,
      argv: validation.argv,
      status: "not-run",
    });
  }

  const summary: VerificationRunSummary = {
    total: commands.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    notRun: commands.length,
    timeout: 0,
    killed: 0,
  };

  const runner: VerificationRunRunnerInfo = {
    id: input.runner?.id ?? VERIFICATION_RUN_DRY_RUN_RUNNER_ID,
    version: input.runner?.version,
    capabilityId: input.runner?.capabilityId ?? VERIFY_CAPABILITY_ID,
  };

  const redaction: VerificationRunRedaction = {
    applied: false,
    patterns: [...VERIFICATION_RUN_DRY_RUN_REDACTION_PATTERNS],
    redactedMatches: 0,
  };

  const environment: VerificationRunEnvironment | undefined = input.environment
    ? {
      platform: input.environment.platform,
      arch: input.environment.arch,
      nodeVersion: input.environment.nodeVersion,
      shell: input.environment.shell,
      network: input.environment.network,
      envPolicy: input.environment.envPolicy ?? "scrubbed",
    }
    : undefined;

  const verificationRun = createVerificationRun({
    header: input.header,
    status: "not-run",
    verificationPlanRef: input.verificationPlanRef,
    workOrderRef: input.workOrderRef,
    commands,
    summary,
    runner,
    environment,
    redaction,
  });

  const safety: VerificationRunSafetySummary = {
    shell: false,
    executeRequired: true,
    permission: "execute:verification",
    warnings: validationIssues.length > 0
      ? [
        "One or more planned commands are not safe for the runner. "
          + "Fix them in the VerificationPlan before opt-in execution lands.",
      ]
      : [],
  };

  return {
    verificationRun,
    safety,
    validationIssues,
    ok: validationIssues.length === 0,
  };
}

type VerificationRunCommandValidation =
  | { ok: true; argv: string[] }
  | {
    ok: false;
    argv: string[];
    reason: VerificationRunCommandValidationReason;
    message: string;
  };

/**
 * Validate and tokenize a single command string into argv.
 * Conservative: rejects any shell-control operator, command
 * substitution, env-assignment prefix, or newline. The future
 * runner spawns `argv[0]` with `argv.slice(1)` and
 * `shell: false`.
 *
 * Tokenization is intentionally simple: whitespace-separated,
 * with double-quoted and single-quoted strings preserved as
 * single tokens. This matches the subset of plan strings we
 * accept ("npm run test", "node scripts/audit-license.mjs",
 * etc.). Anything more complex is rejected so a future runner
 * never has to parse shell.
 */
export function validateVerificationRunCommandString(
  command: string,
): VerificationRunCommandValidation {
  if (typeof command !== "string" || command.trim().length === 0) {
    return {
      ok: false,
      argv: [],
      reason: "empty-command",
      message: "Command is empty.",
    };
  }

  if (command.includes("\n") || command.includes("\r")) {
    return {
      ok: false,
      argv: [],
      reason: "newline",
      message: "Command contains a newline. Multi-line commands are not supported.",
    };
  }

  // Reject command substitution before tokenization so backticks /
  // $(…) anywhere in the raw string are caught even inside quotes.
  if (command.includes("`") || command.includes("$(")) {
    return {
      ok: false,
      argv: [],
      reason: "command-substitution",
      message: "Command substitution (`...` or $(...)) is not supported.",
    };
  }

  // Shell control operators. Checked before tokenization to catch
  // them whether or not they're surrounded by spaces.
  const shellControl = [";", "&&", "||", "|", ">>", "<<", ">", "<", "&"];

  for (const operator of shellControl) {
    if (command.includes(operator)) {
      return {
        ok: false,
        argv: [],
        reason: "shell-control-operator",
        message: `Shell control operator '${operator}' is not supported.`,
      };
    }
  }

  let argv: string[];

  try {
    argv = tokenizeCommandString(command);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      ok: false,
      argv: [],
      reason: "unsupported-syntax",
      message,
    };
  }

  if (argv.length === 0) {
    return {
      ok: false,
      argv: [],
      reason: "empty-command",
      message: "Command tokenized to zero arguments.",
    };
  }

  // Env-assignment prefix (e.g. "TOKEN=x npm test"). The first
  // token must not look like NAME=VALUE.
  if (argv[0] !== undefined && /^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[0])) {
    return {
      ok: false,
      argv: [],
      reason: "env-assignment-prefix",
      message:
        "Env-assignment prefix (NAME=value) is not supported. Set environment "
        + "variables through the runner's environment policy instead.",
    };
  }

  return { ok: true, argv };
}

function tokenizeCommandString(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let mode: "default" | "single" | "double" = "default";

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];

    if (mode === "default") {
      if (char === " " || char === "\t") {
        if (current.length > 0) {
          tokens.push(current);
          current = "";
        }

        continue;
      }

      if (char === "'") {
        mode = "single";
        continue;
      }

      if (char === "\"") {
        mode = "double";
        continue;
      }

      current += char;
      continue;
    }

    if (mode === "single") {
      if (char === "'") {
        mode = "default";
        continue;
      }

      current += char;
      continue;
    }

    if (mode === "double") {
      if (char === "\"") {
        mode = "default";
        continue;
      }

      current += char;
      continue;
    }
  }

  if (mode !== "default") {
    throw new Error("Unterminated quoted string.");
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Skeleton runner. **Always throws.** Exists only to
 * satisfy the SDK's manifest-roles-have-handlers
 * invariant; the actual execute path will replace the
 * `run` body in a future slice once dry-run and opt-in
 * execution land. The handler does NOT spawn any
 * process, read any stdout/stderr, or read source
 * files.
 */
export const verificationRunner: Runner = {
  id: "@rekon/capability-verify.runner",
  produces: ["VerificationRun", "VerificationResult"],
  async run(_input: {
    artifacts: ArtifactReader & ArtifactWriter;
    input?: Record<string, unknown>;
  }): Promise<ArtifactRef[]> {
    throw new Error(
      "@rekon/capability-verify: command execution is not implemented yet. "
      + "The runner skeleton declares the boundary (role: runner, permission: "
      + "execute:verification); the dry-run command lands in the next slice, and "
      + "opt-in execution (`rekon verify run --plan <id> --execute`) lands after "
      + "that. Until then, use `rekon verify record` to record outcomes manually.",
    );
  },
};

export default defineCapability({
  manifest: {
    id: VERIFY_CAPABILITY_ID,
    name: "Verification Runner",
    version: VERIFY_CAPABILITY_VERSION,
    description:
      "Verification runner capability skeleton. v1 declares the runner / execute:verification boundary; command execution is not implemented yet.",
    roles: ["runner"],
    consumes: ["VerificationPlan", "WorkOrder"],
    produces: ["VerificationRun", "VerificationResult"],
    permissions: ["execute:verification", "read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "verification-plan.changed",
        description:
          "Re-run on demand when the verification plan changes. Runner is opt-in; no automatic regeneration on `rekon refresh`.",
        inputs: ["VerificationPlan"],
      },
    ],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    registry.runner(verificationRunner);
  },
});
