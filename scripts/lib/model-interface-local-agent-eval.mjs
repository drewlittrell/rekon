const CONTENT_READ_PATTERN = /(?:^|\s|\/)(?:cat|sed|head|tail|nl|awk|grep|rg)(?:\s|$)/u;
const DISCOVERY_PATTERN = /(?:rg\s+--files|\bfind\b|\bls\b|\btree\b|git\s+(?:status|ls-files))/u;
const VERIFICATION_PATTERN = /(?:npm\s+(?:test|run\s+\S+)|node\s+--test|pytest|go\s+test|git\s+diff\s+--check)/u;
const BENCHMARK_GENERATED_PREFIXES = [".rekon/", ".rekon-dev/"];
const PRODUCT_LOOP_PHASES = [
  "entry",
  "context",
  "implementation",
  "validation",
  "verification",
  "proof",
  "maintenance",
];

export const LOCAL_AGENT_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [
    "status",
    "contextPaths",
    "filesModified",
    "checks",
    "summary",
    "risks",
    "confidence",
  ],
  properties: {
    status: { type: "string", enum: ["complete", "blocked"] },
    contextPaths: { type: "array", items: { type: "string" } },
    filesModified: { type: "array", items: { type: "string" } },
    checks: { type: "array", items: { type: "string" } },
    summary: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
  },
});

export function parseCodexJsonl(text) {
  const events = [];
  const ignoredLines = [];
  for (const rawLine of String(text ?? "").split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    try {
      const value = JSON.parse(line);
      if (isRecord(value) && typeof value.type === "string") events.push(value);
      else ignoredLines.push(line);
    } catch {
      ignoredLines.push(line);
    }
  }
  return { events, ignoredLines };
}

export function summarizeCodexTokenUsage(events) {
  const usageEvents = events.filter((event) => event?.type === "turn.completed" && isRecord(event.usage));
  const usage = usageEvents.reduce((total, event) => ({
    inputTokens: total.inputTokens + tokenCount(event.usage, "input_tokens", "inputTokens"),
    cachedInputTokens: total.cachedInputTokens
      + tokenCount(event.usage, "cached_input_tokens", "cachedInputTokens"),
    outputTokens: total.outputTokens + tokenCount(event.usage, "output_tokens", "outputTokens"),
    reasoningOutputTokens: total.reasoningOutputTokens
      + tokenCount(event.usage, "reasoning_output_tokens", "reasoningOutputTokens"),
  }), {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
  });
  const available = usageEvents.length > 0
    && usage.inputTokens + usage.outputTokens > 0;
  return {
    source: "codex-turn-completed",
    available,
    turns: usageEvents.length,
    ...usage,
    nonCachedInputTokens: Math.max(0, usage.inputTokens - usage.cachedInputTokens),
    totalTokens: usage.inputTokens + usage.outputTokens,
  };
}

export function estimateVisibleTokenUsage(events, prompt) {
  let commandOutputTokens = 0;
  let mcpOutputTokens = 0;
  let modelActionTokens = 0;
  let finalResponseTokens = 0;

  for (const event of events) {
    if (event?.type !== "item.completed" || !isRecord(event.item)) continue;
    const item = event.item;
    if (item.type === "command_execution") {
      modelActionTokens += estimateTextTokens(item.command);
      commandOutputTokens += estimateTextTokens(item.aggregated_output);
      continue;
    }
    if (item.type === "mcp_tool_call") {
      modelActionTokens += estimateValueTokens(item.arguments);
      mcpOutputTokens += estimateValueTokens(item.result ?? item.content ?? item.error);
      continue;
    }
    if (item.type === "agent_message") {
      finalResponseTokens += estimateTextTokens(item.text);
      continue;
    }
    if (["file_change", "file_edit", "apply_patch"].includes(item.type)) {
      modelActionTokens += estimateValueTokens(item.changes ?? item.patch ?? item.diff);
    }
  }

  const promptTokens = estimateTextTokens(prompt);
  const toolOutputTokens = commandOutputTokens + mcpOutputTokens;
  return {
    method: "utf8-bytes-divided-by-four",
    promptTokens,
    commandOutputTokens,
    mcpOutputTokens,
    toolOutputTokens,
    modelActionTokens,
    finalResponseTokens,
    totalTokens: promptTokens + toolOutputTokens + modelActionTokens + finalResponseTokens,
  };
}

export function parseGitStatusPaths(text) {
  return String(text ?? "")
    .split(/\r?\n/u)
    .filter((line) => line.length >= 4)
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    .sort();
}

export function classifyBenchmarkModifiedPaths(paths) {
  const sourcePaths = [];
  const generatedPaths = [];
  for (const path of unique(strings(paths)).sort()) {
    const normalized = path.replace(/^\.\//u, "");
    if (BENCHMARK_GENERATED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
      generatedPaths.push(normalized);
    } else {
      sourcePaths.push(normalized);
    }
  }
  return { sourcePaths, generatedPaths };
}

export function selectContextUsageForChange(records, options = {}) {
  const initialArtifactKeys = options.initialArtifactKeys instanceof Set
    ? options.initialArtifactKeys
    : new Set(strings(options.initialArtifactKeys));
  const changedPaths = new Set(strings(options.sourceModifiedPaths).map(normalizeRepoPath));
  const readPaths = new Set([
    ...strings(options.inspectedPaths),
    ...strings(options.reportedContextPaths),
  ].map(normalizeRepoPath));
  const candidates = [...(Array.isArray(records) ? records : [])]
    .filter((record) => isRecord(record) && isRecord(record.ref) && isRecord(record.usage))
    .sort((left, right) =>
      String(right.ref.writtenAt ?? "").localeCompare(String(left.ref.writtenAt ?? "")));

  for (const { ref, usage } of candidates) {
    const artifactKey = `${String(ref.type ?? "")}:${String(ref.id ?? "")}`;
    if (initialArtifactKeys.has(artifactKey)) continue;
    if (ref.type !== "ContextUsageEvent" || typeof ref.id !== "string") continue;
    if (!Array.isArray(usage.claims) || usage.claims.length > 0) continue;
    if (!["mcp", "cli"].includes(usage.delivery?.channel)) continue;
    if (typeof usage.task?.text !== "string" || usage.task.text.trim().length === 0) continue;

    const itemIds = unique(strings(usage.delivery?.itemIds).map(normalizeRepoPath));
    if (itemIds.length === 0) continue;
    const scopedPaths = new Set([
      ...strings(usage.task?.paths),
      ...strings(usage.header?.subject?.paths),
      ...itemIds,
    ].map(normalizeRepoPath));
    if (
      changedPaths.size > 0
      && ![...changedPaths].some((path) => scopedPaths.has(path))
    ) {
      continue;
    }

    return {
      ref,
      taskText: usage.task.text.trim(),
      claims: Object.fromEntries(itemIds.map((itemId) => [
        itemId,
        readPaths.has(itemId) ? "read" : "ignored",
      ])),
    };
  }
  return undefined;
}

export function mergeAgentCommands(eventCommands, verifiedCommands) {
  return unique([
    ...strings(eventCommands),
    ...strings(verifiedCommands),
  ]);
}

export function summarizeCodexExploration(events, repositoryFiles) {
  const completed = events
    .filter((event) => event.type === "item.completed")
    .map((event) => event.item)
    .filter((item) => isRecord(item) && item.type === "command_execution");
  const inspectedPaths = new Set();
  const discoveredPaths = new Set();
  const searchedPaths = new Set();
  let discoveryCommands = 0;
  let readCommands = 0;
  let verificationCommands = 0;
  let failedCommands = 0;

  for (const item of completed) {
    const command = typeof item.command === "string" ? item.command : "";
    const output = typeof item.aggregated_output === "string" ? item.aggregated_output : "";
    const commandForMatch = command.replace(/["']/gu, " ");
    const discovery = DISCOVERY_PATTERN.test(commandForMatch);
    const read = CONTENT_READ_PATTERN.test(commandForMatch) && !discovery;
    const verification = VERIFICATION_PATTERN.test(commandForMatch);
    if (discovery) discoveryCommands += 1;
    if (read) readCommands += 1;
    if (verification) verificationCommands += 1;
    if (typeof item.exit_code === "number" && item.exit_code !== 0) failedCommands += 1;

    for (const path of repositoryFiles) {
      if (discovery && (command.includes(path) || output.includes(path))) discoveredPaths.add(path);
      if (read && (command.includes(path) || output.includes(path))) inspectedPaths.add(path);
    }
    if (read) addBroadSearchPaths(command, repositoryFiles, searchedPaths);
  }

  return {
    commandCount: completed.length,
    discoveryCommands,
    readCommands,
    verificationCommands,
    failedCommands,
    discoveredPaths: [...discoveredPaths].sort(),
    inspectedPaths: [...inspectedPaths].sort(),
    searchedPaths: [...searchedPaths].sort(),
  };
}

export function summarizeRekonProductLoop(events, artifactEvidence = {}, options = {}) {
  const validations = [];
  let contextIndex = null;
  let editIndex = null;
  let prepareVerificationIndex = null;
  let verificationRunIndex = null;
  let verificationResultIndex = null;
  let proofRecordIndex = null;
  let refreshIndex = null;
  let refreshCommandPassed = false;
  let refreshLatestMajorFresh = false;
  let refreshRequiredStepsPassed = false;

  for (const [index, event] of events.entries()) {
    if (event?.type !== "item.completed" || !isRecord(event.item)) continue;
    const item = event.item;

    if (item.type === "mcp_tool_call" && item.server === "rekon") {
      const tool = typeof item.tool === "string" ? item.tool : "";
      const completed = item.status === "completed";
      const args = isRecord(item.arguments) ? item.arguments : {};
      if (tool === "context_for_task" && completed && contextIndex === null) {
        contextIndex = index;
      }
      if (tool === "validate_change") {
        validations.push({
          index,
          interface: "mcp",
          completed,
          hasContextUsage: typeof args.contextUsageRef === "string" && args.contextUsageRef.length > 0,
          hasContextClaims: isRecord(args.contextClaims) && Object.keys(args.contextClaims).length > 0,
          hasVerification: strings(args.verificationResults).length > 0,
          preparesVerification: false,
          recordsProof: false,
        });
      }
      continue;
    }

    if (item.type === "command_execution") {
      const command = typeof item.command === "string" ? item.command : "";
      const completed = item.exit_code === 0;
      const output = parseCommandJson(item.aggregated_output);
      if (isContextCliCommand(command) && completed && contextIndex === null) {
        contextIndex = index;
      }
      if (isValidationCliCommand(command) || isChangeValidationPayload(output)) {
        const preparesVerification = hasCommandFlag(command, "--prepare-verification")
          || output?.verificationPlan?.type === "VerificationPlan";
        const recordsProof = hasCommandFlag(command, "--record-proof")
          || output?.proofArtifact?.type === "ProofGateReport";
        validations.push({
          index,
          interface: "cli",
          completed,
          hasContextUsage: hasCommandFlag(command, "--context-usage"),
          hasContextClaims: hasCommandFlag(command, "--context-claims-json"),
          hasVerification: hasCommandFlag(command, "--verification-result")
            || output?.proofArtifact?.type === "ProofGateReport",
          preparesVerification,
          recordsProof,
        });
        if (preparesVerification && completed && prepareVerificationIndex === null) {
          prepareVerificationIndex = index;
        }
        if (recordsProof && completed && proofRecordIndex === null) {
          proofRecordIndex = index;
        }
      }
      if (((isVerificationRunCliCommand(command) && hasCommandFlag(command, "--execute"))
        || output?.verificationRun?.header?.artifactType === "VerificationRun")
        && completed && verificationRunIndex === null) {
        verificationRunIndex = index;
      }
      if ((isVerificationResultCliCommand(command)
        || output?.verificationResult?.header?.artifactType === "VerificationResult")
        && completed && verificationResultIndex === null) {
        verificationResultIndex = index;
      }
      if (isProofRefreshCliCommand(command) || isProofRefreshPayload(output)) {
        refreshIndex = index;
        const refresh = output;
        refreshCommandPassed = completed && refresh?.status === "passed";
        refreshLatestMajorFresh = completed
          && Array.isArray(refresh?.freshness?.latestMajor)
          && refresh.freshness.latestMajor.length > 0
          && refresh.freshness.latestMajor.every((entry) => entry?.status === "fresh");
        refreshRequiredStepsPassed = completed && requiredRefreshStepsPassed(refresh?.steps);
      }
      if (editIndex === null && isShellEditCommand(command)) editIndex = index;
      continue;
    }

    if (editIndex === null && ["file_change", "file_edit", "apply_patch"].includes(item.type)) {
      editIndex = index;
    }
  }

  const completedValidations = validations.filter((entry) => entry.completed);
  const postEditValidations = completedValidations.filter((entry) =>
    editIndex !== null && entry.index > editIndex);
  const initialValidation = postEditValidations[0];
  const finalValidation = postEditValidations.find((entry) =>
    entry.hasVerification
    && verificationResultIndex !== null
    && entry.index > verificationResultIndex);
  const validationBeforeVerification = initialValidation !== undefined
    && prepareVerificationIndex !== null
    && initialValidation.index < prepareVerificationIndex;
  const verificationOrderValid = prepareVerificationIndex !== null
    && verificationRunIndex !== null
    && verificationResultIndex !== null
    && prepareVerificationIndex < verificationRunIndex
    && verificationRunIndex < verificationResultIndex;
  const proofOrderValid = finalValidation !== undefined
    && proofRecordIndex !== null
    && finalValidation.index <= proofRecordIndex;
  const refreshOrderValid = proofRecordIndex !== null
    && refreshIndex !== null
    && proofRecordIndex < refreshIndex;
  const artifactVerificationOrderValid = artifactEvidence.verificationLineageComplete === true;
  const artifactProofOrderValid = artifactEvidence.proofLineageComplete === true;
  const artifactRefreshOrderValid = artifactEvidence.refreshLineageComplete === true;
  const useArtifactRefreshFallback = refreshIndex === null;
  const checks = {
    terminalStatusComplete: options.terminalStatus === undefined
      || options.terminalStatus === "complete",
    contextAcquired: contextIndex !== null,
    contextBeforeEdit: contextIndex !== null && editIndex !== null && contextIndex < editIndex,
    postEditValidation: initialValidation !== undefined,
    contextLineageSubmitted: postEditValidations.some((entry) => entry.hasContextUsage),
    contextClaimsSubmitted: postEditValidations.some((entry) => entry.hasContextClaims)
      || artifactEvidence.contextClaimReceiptRecorded === true,
    verificationPrepared: prepareVerificationIndex !== null
      || artifactEvidence.verificationPlanRecorded === true,
    validationBeforeVerification: validationBeforeVerification
      || (initialValidation !== undefined && artifactVerificationOrderValid),
    verificationExecuted: verificationRunIndex !== null
      || artifactEvidence.verificationRunPassed === true,
    verificationResultRecorded: verificationResultIndex !== null
      || artifactEvidence.verificationResultPassed === true,
    verificationOrderValid: verificationOrderValid || artifactVerificationOrderValid,
    finalValidation: finalValidation !== undefined
      || artifactEvidence.validationOutcomeVerified === true,
    proofRecorded: proofRecordIndex !== null || artifactEvidence.proofGateSatisfied === true,
    proofOrderValid: proofOrderValid || artifactProofOrderValid,
    refreshInvoked: refreshIndex !== null || artifactEvidence.refreshOutcomeAccepted === true,
    refreshOrderValid: useArtifactRefreshFallback
      ? artifactRefreshOrderValid
      : refreshOrderValid,
    refreshCommandPassed: useArtifactRefreshFallback
      ? artifactEvidence.refreshCompleted === true
      : refreshCommandPassed,
    refreshLatestMajorFresh: useArtifactRefreshFallback
      ? artifactEvidence.refreshCompleted === true
      : refreshLatestMajorFresh,
    refreshRequiredStepsPassed: useArtifactRefreshFallback
      ? artifactEvidence.refreshCompleted === true
      : refreshRequiredStepsPassed,
    deliveryArtifactRecorded: artifactEvidence.deliveryRecorded === true,
    contextClaimReceiptRecorded: artifactEvidence.contextClaimReceiptRecorded === true,
    verificationPlanRecorded: artifactEvidence.verificationPlanRecorded === true,
    verificationRunPassed: artifactEvidence.verificationRunPassed === true,
    verificationSourceStable: artifactEvidence.verificationSourceStable === true,
    verificationResultPassed: artifactEvidence.verificationResultPassed === true,
    ...(artifactEvidence.placementVerificationRequired === true ? {
      placementVerificationTrusted: artifactEvidence.placementVerificationTrusted === true,
    } : {}),
    proofGateSatisfied: artifactEvidence.proofGateSatisfied === true,
    proofGateLinkedVerification: artifactEvidence.proofGateLinkedVerification === true,
    validationOutcomeVerified: artifactEvidence.validationOutcomeVerified === true,
    refreshOutcomeAccepted: artifactEvidence.refreshOutcomeAccepted === true,
    refreshOutcomeLinkedProof: artifactEvidence.refreshOutcomeLinkedProof === true,
    refreshedEvidenceLinkedProof: artifactEvidence.refreshedEvidenceLinkedProof === true,
    managedInstructionsCurrent: artifactEvidence.managedInstructionsCurrent === true,
  };
  const missing = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  const milestones = {
    context: contextIndex,
    edit: editIndex,
    initialValidation: initialValidation?.index ?? null,
    verificationPrepared: prepareVerificationIndex,
    verificationExecuted: verificationRunIndex,
    verificationResult: verificationResultIndex,
    finalValidation: finalValidation?.index ?? null,
    proofRecorded: proofRecordIndex,
    refresh: refreshIndex,
  };

  return {
    required: options.required === true,
    passed: missing.length === 0,
    checks,
    missing,
    validationCalls: completedValidations.length,
    phaseMetrics: summarizeProductLoopPhaseMetrics(events, milestones),
    artifactEvidence,
  };
}

export function summarizeRekonAdoption(events, expectations = {}) {
  const toolCalls = [];
  let firstContextIndex = null;
  let firstRefinementIndex = null;
  let firstExplorationIndex = null;
  let firstEditIndex = null;
  let cliFallbackAttempted = false;
  let cliFallbackSucceeded = false;

  for (const [index, event] of events.entries()) {
    if (event?.type !== "item.completed" || !isRecord(event.item)) continue;
    const item = event.item;

    if (item.type === "mcp_tool_call" && item.server === "rekon") {
      const tool = typeof item.tool === "string" ? item.tool : "unknown";
      const status = item.status === "completed" ? "completed" : "failed";
      const args = isRecord(item.arguments) ? item.arguments : {};
      toolCalls.push({
        order: toolCalls.length + 1,
        tool,
        status,
        ...(isRefinementTool(tool) && typeof args.relationship === "string"
          ? { relationship: args.relationship }
          : {}),
        ...(isRefinementTool(tool) && typeof args.anchorPath === "string"
          ? { anchorPath: args.anchorPath }
          : {}),
        ...(isRefinementTool(tool) && typeof args.anchorSymbol === "string"
          ? { anchorSymbol: args.anchorSymbol }
          : {}),
      });
      if (tool === "context_for_task" && status === "completed" && firstContextIndex === null) {
        firstContextIndex = index;
      }
      if (isRefinementTool(tool) && status === "completed" && firstRefinementIndex === null) {
        firstRefinementIndex = index;
      }
      continue;
    }

    if (item.type === "command_execution") {
      const command = typeof item.command === "string" ? item.command : "";
      if (isContextCliCommand(command)) {
        cliFallbackAttempted = true;
        if (item.exit_code === 0) {
          cliFallbackSucceeded = true;
          if (firstContextIndex === null) firstContextIndex = index;
        }
      } else if (isRefinementCliCommand(command)) {
        if (item.exit_code === 0 && firstRefinementIndex === null) firstRefinementIndex = index;
      } else if (firstExplorationIndex === null && isRepositoryExplorationCommand(command)) {
        firstExplorationIndex = index;
      }
      if (firstEditIndex === null && isShellEditCommand(command)) firstEditIndex = index;
      continue;
    }

    if (firstEditIndex === null && ["file_change", "file_edit", "apply_patch"].includes(item.type)) {
      firstEditIndex = index;
    }
  }

  const completedTools = new Set(
    toolCalls.filter((entry) => entry.status === "completed").map((entry) => entry.tool),
  );
  const mcpContextSucceeded = completedTools.has("context_for_task");
  const refinementCalls = toolCalls.filter((entry) =>
    isRefinementTool(entry.tool) && entry.status === "completed").length
    + (firstRefinementIndex !== null && ![...completedTools].some(isRefinementTool) ? 1 : 0);
  const maxRefinementCalls = Number.isInteger(expectations.maxRefinementCalls)
    && expectations.maxRefinementCalls >= 0
    ? expectations.maxRefinementCalls
    : undefined;
  const excessiveRefinement = maxRefinementCalls !== undefined
    && refinementCalls > maxRefinementCalls;
  const completedRefinementCalls = toolCalls.filter((entry) =>
    isRefinementTool(entry.tool) && entry.status === "completed");
  const requiredRefinementRelationship = typeof expectations.requiredRefinementRelationship === "string"
    ? expectations.requiredRefinementRelationship
    : undefined;
  const requiredRefinementAnchorPath = typeof expectations.requiredRefinementAnchorPath === "string"
    ? expectations.requiredRefinementAnchorPath
    : undefined;
  const refinementTargetMatched = requiredRefinementRelationship === undefined
    && requiredRefinementAnchorPath === undefined
    ? true
    : completedRefinementCalls.some((entry) =>
      (requiredRefinementRelationship === undefined || entry.relationship === requiredRefinementRelationship)
      && (requiredRefinementAnchorPath === undefined || entry.anchorPath === requiredRefinementAnchorPath));
  const unexpectedRefinement = refinementCalls > 0
    && expectations.allowRefinement !== true
    && expectations.requireRefinement !== true;
  const refinementBeforeContext = firstRefinementIndex !== null
    && (firstContextIndex === null || firstRefinementIndex < firstContextIndex);
  const expectedReadFirstPaths = unique(strings(expectations.readFirstPaths));
  const readBeforeRefinement = new Set();
  if (firstRefinementIndex !== null && expectedReadFirstPaths.length > 0) {
    for (const event of events.slice(0, firstRefinementIndex)) {
      const item = event?.type === "item.completed" && isRecord(event.item) ? event.item : undefined;
      if (!item || item.type !== "command_execution") continue;
      const command = typeof item.command === "string" ? item.command : "";
      const output = typeof item.aggregated_output === "string" ? item.aggregated_output : "";
      const commandForMatch = command.replace(/["']/gu, " ");
      if (!CONTENT_READ_PATTERN.test(commandForMatch) || DISCOVERY_PATTERN.test(commandForMatch)) continue;
      for (const path of expectedReadFirstPaths) {
        if (command.includes(path) || output.includes(path)) readBeforeRefinement.add(path);
      }
    }
  }
  const missingReadFirstBeforeRefinement = firstRefinementIndex === null
    ? []
    : expectedReadFirstPaths.filter((path) => !readBeforeRefinement.has(path));
  const refinementBeforeReadFirst = firstRefinementIndex !== null
    && missingReadFirstBeforeRefinement.length > 0;
  const contextBeforeExploration = firstContextIndex !== null
    && (firstExplorationIndex === null || firstContextIndex < firstExplorationIndex);
  const contextBeforeEdit = firstContextIndex !== null
    && (firstEditIndex === null || firstContextIndex < firstEditIndex);
  const missingRequiredTools = [
    ...(expectations.requireOrientation && !cliFallbackSucceeded && !completedTools.has("orientation")
      ? ["orientation"]
      : []),
    ...(!mcpContextSucceeded && !cliFallbackSucceeded ? ["context_for_task"] : []),
    ...(expectations.requirePlacement && !completedTools.has("where_does_this_belong")
      ? ["where_does_this_belong"]
      : []),
    ...(expectations.requirePreflight && !completedTools.has("preflight_change")
      ? ["preflight_change"]
      : []),
    ...(expectations.requireRefinement && refinementCalls === 0
      ? ["resolve_source_target"]
      : []),
    ...(!refinementTargetMatched
      ? [`resolve_source_target:${requiredRefinementRelationship ?? "any"}@${requiredRefinementAnchorPath ?? "any"}`]
      : []),
  ];

  const interfacePassed = missingRequiredTools.length === 0
    && contextBeforeExploration
    && contextBeforeEdit
    && !unexpectedRefinement
    && !excessiveRefinement
    && refinementTargetMatched
    && !refinementBeforeContext
    && !refinementBeforeReadFirst;

  return {
    status: interfacePassed
      ? "adopted"
      : firstContextIndex !== null
        ? "partial"
        : "not-adopted",
    passed: interfacePassed,
    interface: cliFallbackSucceeded ? "cli" : completedTools.size > 0 ? "mcp" : "none",
    toolCalls,
    cliFallbackAttempted,
    cliFallbackUsed: cliFallbackSucceeded,
    contextBeforeExploration,
    contextBeforeEdit,
    explorationBeforeContext: firstExplorationIndex !== null
      && (firstContextIndex === null || firstExplorationIndex < firstContextIndex),
    refinementCalls,
    ...(maxRefinementCalls !== undefined ? { maxRefinementCalls } : {}),
    excessiveRefinement,
    ...(requiredRefinementRelationship !== undefined ? { requiredRefinementRelationship } : {}),
    ...(requiredRefinementAnchorPath !== undefined ? { requiredRefinementAnchorPath } : {}),
    refinementTargetMatched,
    unexpectedRefinement,
    refinementBeforeContext,
    refinementBeforeReadFirst,
    missingReadFirstBeforeRefinement,
    missingRequiredTools,
  };
}

function isRefinementTool(tool) {
  return tool === "resolve_source_target" || tool === "refine_task_context";
}

export function assessRekonContextUse(adoption, contextSelection, contextUse) {
  const readFirstPaths = unique(strings(
    contextSelection?.readFirstPaths ?? contextSelection?.selectedPaths,
  ));
  const usedPaths = new Set([
    ...strings(contextUse?.selectedPathsInspected),
    ...strings(contextUse?.selectedPathsReported),
  ]);
  const missingReadFirstPaths = readFirstPaths.filter((path) => !usedPaths.has(path));
  const readFirstRecall = readFirstPaths.length === 0
    ? 1
    : (readFirstPaths.length - missingReadFirstPaths.length) / readFirstPaths.length;
  const refinementExpectedPaths = unique(strings(contextSelection?.refinementExpectedPaths));
  const usedRefinementPaths = new Set([
    ...strings(contextUse?.refinementPathsInspected),
    ...strings(contextUse?.refinementPathsModified),
  ]);
  const missingRefinementPaths = refinementExpectedPaths.filter((path) => !usedRefinementPaths.has(path));
  const refinementRecall = refinementExpectedPaths.length === 0
    ? 1
    : (refinementExpectedPaths.length - missingRefinementPaths.length) / refinementExpectedPaths.length;
  const contextUsed = readFirstRecall === 1;
  const refinementUsed = refinementRecall === 1;
  const passed = adoption.passed && contextUsed && refinementUsed;

  return {
    ...adoption,
    status: passed
      ? "adopted"
      : adoption.status === "not-adopted"
        ? "not-adopted"
        : "partial",
    passed,
    readFirstRecall: round(readFirstRecall),
    missingReadFirstPaths,
    refinementRecall: round(refinementRecall),
    missingRefinementPaths,
  };
}

export function compareManagedLocalAgentPair(baseline, rekon) {
  if (!baseline?.score || !rekon?.score || baseline.status !== "ok" || rekon.status !== "ok") {
    return { decision: "inconclusive", reasons: ["one or both isolated runs did not complete"] };
  }
  if (rekon.productLoop?.required && !rekon.productLoop.passed) {
    return {
      decision: "discard",
      reasons: [
        "managed Rekon run did not complete the required product loop",
        `missing lifecycle checks: ${rekon.productLoop.missing.join(", ") || "unknown"}`,
      ],
    };
  }
  if ((baseline.score.passed && !rekon.score.passed)
    || (!baseline.score.hardFailure && rekon.score.hardFailure)) {
    return { decision: "discard", reasons: ["managed Rekon use reduced safety or correctness"] };
  }
  if (!baseline.score.passed && rekon.score.passed) {
    return {
      decision: "candidate",
      reasons: [
        `outcome pass ${baseline.score.passed} -> ${rekon.score.passed}`,
        `quality ${baseline.score.qualityScore} -> ${rekon.score.qualityScore}`,
        `search breadth ${explorationLoad(baseline)} -> ${explorationLoad(rekon)}`,
        `shell commands ${baseline.exploration.commandCount} -> ${rekon.exploration.commandCount}`,
      ],
    };
  }
  if (!baseline.score.passed && !rekon.score.passed) {
    return { decision: "no-advantage", reasons: ["neither condition produced an acceptable change"] };
  }

  const baselineExploration = explorationLoad(baseline);
  const rekonExploration = explorationLoad(rekon);
  const noWorseQuality = rekon.score.qualityScore >= baseline.score.qualityScore;
  const narrowerSearch = rekonExploration < baselineExploration;
  const fewerCommands = rekon.exploration.commandCount < baseline.exploration.commandCount;
  const reasons = [
    `quality ${baseline.score.qualityScore} -> ${rekon.score.qualityScore}`,
    `search breadth ${baselineExploration} -> ${rekonExploration}`,
    `shell commands ${baseline.exploration.commandCount} -> ${rekon.exploration.commandCount}`,
    ...tokenComparisonReasons(baseline, rekon),
  ];
  return noWorseQuality && (narrowerSearch || fewerCommands)
    ? { decision: "candidate", reasons }
    : { decision: "no-advantage", reasons };
}

export function normalizeLocalAgentResponse(value, repositoryFiles) {
  if (!isRecord(value)) return { ok: false, error: "response-not-object" };
  if (value.status !== "complete" && value.status !== "blocked") {
    return { ok: false, error: "invalid-status" };
  }
  const allowed = new Set(repositoryFiles);
  return {
    ok: true,
    response: {
      status: value.status,
      contextPaths: unique(strings(value.contextPaths).filter((path) => allowed.has(path))),
      filesModified: unique(strings(value.filesModified).filter((path) => allowed.has(path))),
      checks: unique(strings(value.checks)),
      summary: unique(strings(value.summary)),
      risks: unique(strings(value.risks)),
      confidence: Math.max(0, Math.min(1, finite(value.confidence))),
    },
  };
}

export function scoreLocalAgentOutcome(run, oracle) {
  const modifiedPaths = run.sourceModifiedPaths ?? run.modifiedPaths ?? [];
  const requiredModifyRecall = recall(oracle.requiredModifyPaths ?? [], modifiedPaths);
  const allowedModifyPaths = oracle.allowedModifyPaths ?? oracle.requiredModifyPaths ?? [];
  const unexpectedModifiedPaths = modifiedPaths.filter((path) => !allowedModifyPaths.includes(path));
  const protectedPathViolations = modifiedPaths.filter((path) => (oracle.protectedPaths ?? []).includes(path));
  const agentCheckRecall = commandRecall(oracle.commands ?? [], run.agentCommands ?? []);
  const requiredChecksPassed = (run.requiredChecks ?? []).length > 0
    && run.requiredChecks.every((check) => check.exitCode === 0);
  const oracleChecksPassed = (run.oracleChecks ?? []).length > 0
    && run.oracleChecks.every((check) => check.exitCode === 0);
  const completed = run.status === "ok" && run.final?.status === "complete";
  const hardFailure = protectedPathViolations.length > 0 || !oracleChecksPassed;
  const passed = completed
    && !hardFailure
    && requiredModifyRecall === 1
    && unexpectedModifiedPaths.length === 0
    && agentCheckRecall === 1
    && requiredChecksPassed;
  const qualityScore = average([
    completed ? 1 : 0,
    requiredModifyRecall,
    unexpectedModifiedPaths.length === 0 ? 1 : 0,
    protectedPathViolations.length === 0 ? 1 : 0,
    agentCheckRecall,
    requiredChecksPassed ? 1 : 0,
    oracleChecksPassed ? 1 : 0,
  ]);
  return {
    passed,
    hardFailure,
    qualityScore: round(qualityScore),
    requiredModifyRecall: round(requiredModifyRecall),
    agentCheckRecall: round(agentCheckRecall),
    requiredChecksPassed,
    oracleChecksPassed,
    unexpectedModifiedPaths,
    protectedPathViolations,
  };
}

export function assessIndependentPlacementOutcome({
  sourceModifiedPaths,
  oracle,
  requiredChecks,
  oracleChecks,
}) {
  const modifiedPaths = unique(strings(sourceModifiedPaths));
  const requiredPaths = unique(strings(oracle?.requiredModifyPaths));
  const allowedPaths = unique(strings(
    oracle?.allowedModifyPaths ?? oracle?.requiredModifyPaths,
  ));
  const protectedPaths = new Set(unique(strings(oracle?.protectedPaths)));
  const missingRequiredPaths = requiredPaths.filter((path) => !modifiedPaths.includes(path));
  const unexpectedModifiedPaths = modifiedPaths.filter((path) => !allowedPaths.includes(path));
  const protectedPathViolations = modifiedPaths.filter((path) => protectedPaths.has(path));
  const failedRequiredChecks = (requiredChecks ?? [])
    .filter((entry) => entry?.exitCode !== 0)
    .map((entry) => entry.command);
  const failedOracleChecks = (oracleChecks ?? [])
    .filter((entry) => entry?.exitCode !== 0)
    .map((entry) => entry.command);
  const reasons = [
    ...missingRequiredPaths.map((path) => `missing required change: ${path}`),
    ...unexpectedModifiedPaths.map((path) => `unexpected source change: ${path}`),
    ...protectedPathViolations.map((path) => `protected source changed: ${path}`),
    ...failedRequiredChecks.map((command) => `required check failed: ${command}`),
    ...failedOracleChecks.map((command) => `hidden oracle failed: ${command}`),
  ];

  return {
    verdict: reasons.length === 0 ? "supported" : "refuted",
    reasons,
    missingRequiredPaths,
    unexpectedModifiedPaths,
    protectedPathViolations,
    failedRequiredChecks,
    failedOracleChecks,
  };
}

export function compareLocalAgentPair(baseline, rekon) {
  if (!baseline?.score || !rekon?.score || baseline.status !== "ok" || rekon.status !== "ok") {
    return { decision: "inconclusive", reasons: ["one or both isolated runs did not complete"] };
  }
  if ((baseline.score.passed && !rekon.score.passed)
    || (!baseline.score.hardFailure && rekon.score.hardFailure)) {
    return { decision: "discard", reasons: ["Rekon context reduced safety or correctness"] };
  }
  if (!baseline.score.passed && rekon.score.passed) {
    return {
      decision: "candidate",
      reasons: [
        `outcome pass ${baseline.score.passed} -> ${rekon.score.passed}`,
        `quality ${baseline.score.qualityScore} -> ${rekon.score.qualityScore}`,
      ],
    };
  }
  if (!baseline.score.passed && !rekon.score.passed) {
    return {
      decision: "no-advantage",
      reasons: [
        baseline.score.hardFailure && rekon.score.hardFailure
          ? "both conditions failed behavioral or safety checks"
          : "neither condition produced an acceptable change",
      ],
    };
  }

  const baselineExploration = explorationLoad(baseline);
  const rekonExploration = explorationLoad(rekon);
  const noWorseQuality = rekon.score.qualityScore >= baseline.score.qualityScore;
  const noBroaderSearch = rekonExploration <= baselineExploration;
  const noMoreCommands = rekon.exploration.commandCount <= baseline.exploration.commandCount;
  const strictImprovement = rekon.score.qualityScore > baseline.score.qualityScore
    || rekonExploration < baselineExploration
    || rekon.exploration.commandCount < baseline.exploration.commandCount;
  const reasons = [
    `quality ${baseline.score.qualityScore} -> ${rekon.score.qualityScore}`,
    `search breadth ${baselineExploration} -> ${rekonExploration}`,
    `commands ${baseline.exploration.commandCount} -> ${rekon.exploration.commandCount}`,
    ...tokenComparisonReasons(baseline, rekon),
  ];
  if (noWorseQuality && noBroaderSearch && noMoreCommands && strictImprovement) {
    return { decision: "candidate", reasons };
  }
  return { decision: "no-advantage", reasons };
}

export function compactLocalAgentRun(run) {
  return {
    runner: run.runner,
    model: run.model,
    caseId: run.caseId,
    repeat: run.repeat,
    condition: run.condition,
    status: run.status,
    ...(run.actorTerminalStatus ? { actorTerminalStatus: run.actorTerminalStatus } : {}),
    ...(run.independentJudge ? { independentJudge: run.independentJudge } : {}),
    ...(run.firstPass ? { firstPass: run.firstPass } : {}),
    ...(run.repair ? { repair: run.repair } : {}),
    final: run.final ? {
      status: run.final.status,
      contextPaths: run.final.contextPaths,
      filesModified: run.final.filesModified,
      confidence: run.final.confidence,
    } : undefined,
    modifiedPaths: run.modifiedPaths,
    ...(run.sourceModifiedPaths ? { sourceModifiedPaths: run.sourceModifiedPaths } : {}),
    ...(run.generatedModifiedPaths ? { generatedModifiedPaths: run.generatedModifiedPaths } : {}),
    requiredChecks: run.requiredChecks,
    oracleChecks: run.oracleChecks,
    exploration: run.exploration,
    ...(run.tokenUsage ? { tokenUsage: run.tokenUsage } : {}),
    ...(run.visibleTokenEstimate ? { visibleTokenEstimate: run.visibleTokenEstimate } : {}),
    ...(run.contextUse ? { contextUse: run.contextUse } : {}),
    ...(run.adoption ? { adoption: run.adoption } : {}),
    ...(run.productLoop ? { productLoop: run.productLoop } : {}),
    elapsedMs: run.elapsedMs,
    score: run.score,
    ...(run.error ? { error: run.error } : {}),
  };
}

export function buildBoundedRekonRepairPrompt(task, correctiveContext) {
  const entries = (Array.isArray(correctiveContext?.entries) ? correctiveContext.entries : [])
    .slice(0, 4)
    .map((entry) => ({
      id: String(entry?.id ?? "").slice(0, 180),
      kind: String(entry?.kind ?? "").slice(0, 80),
      ...(typeof entry?.command === "string" && entry.command.trim().length > 0
        ? { command: entry.command.trim().slice(0, 420) }
        : {}),
      summary: String(entry?.summary ?? "").slice(0, 420),
      paths: strings(entry?.paths).slice(0, 6).map((path) => path.slice(0, 220)),
      obligationIds: strings(entry?.obligationIds).slice(0, 8).map((id) => id.slice(0, 220)),
      reasons: strings(entry?.reasons).slice(0, 4).map((reason) => reason.slice(0, 1_600)),
      evidenceRefs: strings(entry?.evidenceRefs).slice(0, 6).map((ref) => ref.slice(0, 220)),
      nextAction: String(entry?.nextAction ?? "").slice(0, 520),
    }));
  const repairContext = {
    strategy: "proof-local",
    entries,
    omittedEntries: Math.max(0, (correctiveContext?.entries?.length ?? 0) - entries.length),
  };
  return [
    "Continue the same task in this existing disposable checkout.",
    "The independent Rekon verifier blocked the current source state. This is one bounded correction attempt, not a new task.",
    "Before the first repository command, call Rekon context_for_task again and read every returned readFirst path.",
    "Use only the refreshed task context, files already inspected for this task, and the bounded corrective context below. Do not restart broad exploration.",
    `Task: ${String(task ?? "").trim()}`,
    `Rekon corrective context: ${JSON.stringify(repairContext)}`,
    "Replace or revert the refuted implementation. Do not weaken tests, contracts, proof requirements, or hidden behavior to make the change pass.",
    "Run the checks required by the task. If independent proof is still required, stop for the host verifier instead of self-approving it.",
    "Your final response must match the supplied JSON schema. Report repository-relative context paths, modified files, checks actually run, a concise summary, risks, and confidence.",
  ].join("\n\n");
}

function isContextCliCommand(command) {
  return /(?:^|\s)(?:rekon|\S*packages\/cli\/dist\/index\.js)\s+context\s+task(?:\s|$)/u.test(
    command.replace(/["']/gu, " "),
  );
}

function isRefinementCliCommand(command) {
  return /(?:^|\s)(?:rekon|\S*packages\/cli\/dist\/index\.js)\s+context\s+refine(?:\s|$)/u.test(
    command.replace(/["']/gu, " "),
  );
}

function isRepositoryExplorationCommand(command) {
  const normalized = command.replace(/["']/gu, " ");
  return DISCOVERY_PATTERN.test(normalized) || CONTENT_READ_PATTERN.test(normalized);
}

function isShellEditCommand(command) {
  const normalized = command.replace(/["']/gu, " ");
  return /(?:^|\s)(?:apply_patch|perl\s+-i|sed\s+-i|tee|truncate)(?:\s|$)|(?:^|\s)(?:cp|mv)\s/u.test(normalized)
    || /(?:^|[^>])>{1,2}\s*[^&]/u.test(normalized);
}

export function summarizeLocalAgentRuns(runs) {
  return Object.fromEntries(["baseline", "rekon"].map((condition) => {
    const selected = runs.filter((run) => run.condition === condition);
    const productLoopRuns = selected.filter((run) => run.productLoop);
    const optionalRoutesOffered = selected.reduce(
      (total, run) => total + (run.contextUse?.optionalPathsOffered?.length ?? 0),
      0,
    );
    const optionalRoutesInspected = selected.reduce(
      (total, run) => total + (run.contextUse?.optionalPathsInspected?.length ?? 0),
      0,
    );
    const optionalRoutesReported = selected.reduce(
      (total, run) => total + (run.contextUse?.optionalPathsReported?.length ?? 0),
      0,
    );
    const optionalRoutesUsed = selected.reduce(
      (total, run) => total + (run.contextUse?.optionalPathsUsed?.length ?? 0),
      0,
    );
    return [condition, {
      runs: selected.length,
      passes: selected.filter((run) => run.score?.passed).length,
      averageQuality: round(average(selected.map((run) => run.score?.qualityScore ?? 0))),
      averageExplorationPaths: round(average(selected.map(explorationLoad))),
      averageCommands: round(average(selected.map((run) => run.exploration?.commandCount ?? 0))),
      averageDiscoveryCommands: round(average(selected.map((run) => run.exploration?.discoveryCommands ?? 0))),
      averageReadCommands: round(average(selected.map((run) => run.exploration?.readCommands ?? 0))),
      averageElapsedMs: round(average(selected.map((run) => run.elapsedMs ?? 0))),
      tokenUsage: summarizeConditionTokenUsage(selected),
      visibleTokenEstimate: summarizeConditionVisibleTokens(selected),
      ...(productLoopRuns.length > 0 ? {
        productLoop: summarizeProductLoopRuns(productLoopRuns),
      } : {}),
      ...(optionalRoutesOffered > 0 ? {
        optionalContext: {
          routesOffered: optionalRoutesOffered,
          routesInspected: optionalRoutesInspected,
          routesReported: optionalRoutesReported,
          routesUsed: optionalRoutesUsed,
          routesSkipped: optionalRoutesOffered - optionalRoutesUsed,
          inspectionRate: round(optionalRoutesInspected / optionalRoutesOffered),
          useRate: round(optionalRoutesUsed / optionalRoutesOffered),
          runsSkippingAtLeastOne: selected.filter((run) =>
            (run.contextUse?.optionalPathsSkipped?.length ?? 0) > 0).length,
        },
      } : {}),
    }];
  }));
}

export function summarizeContextSelection(contextPacket, oracle, repositoryFiles) {
  const repository = new Set(repositoryFiles);
  const readFirstPaths = unique(strings(contextPacket?.readFirst).filter((path) => repository.has(path))).sort();
  const readFirst = new Set(readFirstPaths);
  const routeItems = new Map();
  for (const item of contextPacket?.coreContext ?? []) {
    if (typeof item?.ref !== "string" || !repository.has(item.ref) || !readFirst.has(item.ref)) continue;
    routeItems.set(item.ref, item);
  }
  for (const item of contextPacket?.supportingContext ?? []) {
    if (typeof item?.ref !== "string" || !repository.has(item.ref)) continue;
    routeItems.set(item.ref, item);
  }
  const selectedPaths = unique([
    ...(contextPacket?.paths ?? []),
    ...(contextPacket?.coreContext ?? []).map((item) => item.ref),
    ...(contextPacket?.supportingContext ?? []).map((item) => item.ref),
  ].filter((path) => repository.has(path))).sort();
  const requiredPaths = unique([
    ...strings(oracle?.requiredContextPaths),
    ...strings(oracle?.requiredRoutedContextPaths),
  ]).sort();
  const optionalContextPaths = unique(strings(oracle?.optionalContextPaths)
    .filter((path) => repository.has(path))).sort();
  const allowedPaths = new Set(strings(oracle?.allowedContextPaths));
  const missingRequiredPaths = requiredPaths.filter((path) => !selectedPaths.includes(path));
  const avoidableSelectedPaths = selectedPaths.filter((path) => !allowedPaths.has(path));
  const constraints = (contextPacket?.constraints ?? [])
    .map((entry) => typeof entry === "string" ? entry : entry?.statement)
    .filter((entry) => typeof entry === "string")
    .map((entry) => entry.toLowerCase());
  const expectedConstraintFragments = strings(oracle?.constraintFragments);
  const commands = (contextPacket?.checks ?? [])
    .flatMap((entry) => typeof entry === "string" ? [entry] : [entry?.command, entry?.artifact])
    .filter((entry) => typeof entry === "string");
  const supportingItems = (contextPacket?.supportingContext ?? [])
    .filter((item) => typeof item?.ref === "string" && repository.has(item.ref));
  const routeSummaries = (contextPacket?.routeSummaries ?? [])
    .filter((summary) => typeof summary?.routeRole === "string"
      && Number.isInteger(summary?.routeCount)
      && summary.routeCount > 0);
  const roleEntries = [...routeItems.values()]
    .filter((item) => typeof item?.routeRole === "string");
  const byRole = Object.fromEntries(unique(roleEntries.map((item) => item.routeRole)).sort().map((role) => [
    role,
    unique(roleEntries.filter((item) => item.routeRole === role).map((item) => item.ref)).sort(),
  ]));
  return {
    selectedPaths,
    readFirstPaths,
    supportingPaths: unique(supportingItems.map((item) => item.ref)).sort(),
    boundaryPaths: unique(strings(contextPacket?.boundaryPaths).filter((path) => repository.has(path))).sort(),
    routePlan: {
      requiredPaths: readFirstPaths,
      conditionalPaths: unique(supportingItems
        .filter((item) => item.necessity === "conditional")
        .map((item) => item.ref)).sort(),
      supportingOnlyPaths: unique(supportingItems
        .filter((item) => item.necessity === "supporting")
        .map((item) => item.ref)).sort(),
      byRole,
      ...(routeSummaries.length > 0 ? {
        pathlessSummaries: {
          totalRoutes: routeSummaries.reduce((sum, summary) => sum + summary.routeCount, 0),
          byRole: Object.fromEntries(unique(routeSummaries.map((summary) => summary.routeRole))
            .sort()
            .map((role) => [
              role,
              routeSummaries
                .filter((summary) => summary.routeRole === role)
                .reduce((sum, summary) => sum + summary.routeCount, 0),
            ])),
        },
      } : {}),
    },
    refinementExpectedPaths: unique(strings(oracle?.requiredRefinementPaths)
      .filter((path) => repository.has(path))).sort(),
    requiredContextRecall: round(recall(requiredPaths, selectedPaths)),
    selectedPathPrecision: round(selectedPaths.length === 0
      ? 0
      : (selectedPaths.length - avoidableSelectedPaths.length) / selectedPaths.length),
    constraintRecall: round(expectedConstraintFragments.length === 0
      ? 1
      : expectedConstraintFragments.filter((fragment) =>
          constraints.some((constraint) => constraint.includes(fragment.toLowerCase()))).length
        / expectedConstraintFragments.length),
    commandRecall: round(commandRecall(strings(oracle?.commands), commands)),
    missingRequiredPaths,
    avoidableSelectedPaths,
    ...(optionalContextPaths.length > 0 ? { optionalContextPaths } : {}),
  };
}

export function summarizeContextUse(selection, exploration, final, modifiedPaths = []) {
  const selected = new Set(selection?.selectedPaths ?? []);
  const supporting = new Set(selection?.supportingPaths ?? []);
  const optional = new Set((selection?.optionalContextPaths ?? [])
    .filter((path) => selected.has(path)));
  const refinementExpected = new Set(selection?.refinementExpectedPaths ?? []);
  const discovered = new Set(exploration?.discoveredPaths ?? []);
  const inspected = new Set(exploration?.inspectedPaths ?? []);
  const reported = new Set(final?.contextPaths ?? []);
  const modified = new Set(modifiedPaths);
  const searched = new Set(exploration?.searchedPaths ?? []);
  const optionalUsed = [...optional].filter((path) => inspected.has(path) || reported.has(path));
  return {
    selectedPathsInspected: [...selected].filter((path) => inspected.has(path)).sort(),
    selectedPathsReported: [...selected].filter((path) => reported.has(path)).sort(),
    supportingPathsInspected: [...supporting].filter((path) => inspected.has(path)).sort(),
    supportingPathsReported: [...supporting].filter((path) => reported.has(path)).sort(),
    ...(optional.size > 0 ? {
      optionalPathsOffered: [...optional].sort(),
      optionalPathsInspected: [...optional].filter((path) => inspected.has(path)).sort(),
      optionalPathsReported: [...optional].filter((path) => reported.has(path)).sort(),
      optionalPathsUsed: optionalUsed.sort(),
      optionalPathsSkipped: [...optional]
        .filter((path) => !inspected.has(path) && !reported.has(path)).sort(),
      optionalInspectionRate: round(
        [...optional].filter((path) => inspected.has(path)).length / optional.size,
      ),
      optionalUseRate: round(optionalUsed.length / optional.size),
    } : {}),
    refinementPathsInspected: [...refinementExpected].filter((path) => inspected.has(path)).sort(),
    refinementPathsModified: [...refinementExpected].filter((path) => modified.has(path)).sort(),
    refinementPathsReported: [...refinementExpected].filter((path) => reported.has(path)).sort(),
    discoveredOutsideSelection: [...discovered].filter((path) => !selected.has(path)).sort(),
    inspectedOutsideSelection: [...inspected].filter((path) => !selected.has(path)).sort(),
    searchedOutsideSelection: [...searched].filter((path) => !selected.has(path)).sort(),
  };
}

function addBroadSearchPaths(command, repositoryFiles, target) {
  const normalized = command.replace(/["']/gu, " ");
  const scopes = new Set();
  for (const token of normalized.split(/\s+/u)) {
    const clean = token.replace(/[;|&()]/gu, "").replace(/^\.\//u, "");
    if (clean === "src" || clean === "tests" || clean === "test" || clean === ".") scopes.add(clean);
  }
  for (const path of repositoryFiles) {
    if (scopes.has(".")
      || (scopes.has("src") && path.startsWith("src/"))
      || (scopes.has("tests") && path.startsWith("tests/"))
      || (scopes.has("test") && path.startsWith("test/"))) {
      target.add(path);
    }
  }
}

function explorationLoad(run) {
  return new Set([
    ...(run.exploration?.discoveredPaths ?? []),
    ...(run.exploration?.inspectedPaths ?? []),
    ...(run.exploration?.searchedPaths ?? []),
    ...(run.final?.contextPaths ?? []),
  ]).size;
}

function summarizeConditionTokenUsage(runs) {
  const available = runs.filter((run) => run.tokenUsage?.available);
  const total = available.reduce((usage, run) => ({
    inputTokens: usage.inputTokens + finite(run.tokenUsage.inputTokens),
    cachedInputTokens: usage.cachedInputTokens + finite(run.tokenUsage.cachedInputTokens),
    nonCachedInputTokens: usage.nonCachedInputTokens + finite(run.tokenUsage.nonCachedInputTokens),
    outputTokens: usage.outputTokens + finite(run.tokenUsage.outputTokens),
    reasoningOutputTokens: usage.reasoningOutputTokens + finite(run.tokenUsage.reasoningOutputTokens),
    totalTokens: usage.totalTokens + finite(run.tokenUsage.totalTokens),
  }), {
    inputTokens: 0,
    cachedInputTokens: 0,
    nonCachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
  });
  return {
    source: "codex-turn-completed",
    measuredRuns: available.length,
    missingRuns: runs.length - available.length,
    ...total,
    averageTotalTokens: round(average(available.map((run) => run.tokenUsage.totalTokens))),
  };
}

function summarizeConditionVisibleTokens(runs) {
  const measured = runs.filter((run) => run.visibleTokenEstimate);
  const totalTokens = measured.reduce(
    (sum, run) => sum + finite(run.visibleTokenEstimate.totalTokens),
    0,
  );
  return {
    method: "utf8-bytes-divided-by-four",
    measuredRuns: measured.length,
    missingRuns: runs.length - measured.length,
    totalTokens,
    averageTotalTokens: round(average(measured.map((run) => run.visibleTokenEstimate.totalTokens))),
  };
}

function tokenComparisonReasons(baseline, rekon) {
  const reasons = [];
  if (baseline.tokenUsage?.available && rekon.tokenUsage?.available) {
    reasons.push(`subscription-reported tokens ${baseline.tokenUsage.totalTokens} -> ${rekon.tokenUsage.totalTokens}`);
  }
  if (baseline.visibleTokenEstimate && rekon.visibleTokenEstimate) {
    reasons.push(`visible estimated tokens ${baseline.visibleTokenEstimate.totalTokens} -> ${rekon.visibleTokenEstimate.totalTokens}`);
  }
  return reasons.length > 0 ? reasons : ["token usage unavailable"];
}

function commandRecall(expected, commands) {
  if (expected.length === 0) return 1;
  const normalized = commands.map(normalizeVerificationCommand);
  return expected.filter((expectedCommand) => normalized.some((command) => (
    command.includes(normalizeVerificationCommand(expectedCommand))
  ))).length / expected.length;
}

function normalizeVerificationCommand(command) {
  return String(command).toLowerCase().replace(/\bnpm\s+run\s+test\b/gu, "npm test");
}

function summarizeProductLoopRuns(runs) {
  const phases = Object.fromEntries(PRODUCT_LOOP_PHASES.map((phase) => [
    phase,
    {
      averageEvents: round(average(runs.map((run) =>
        run.productLoop?.phaseMetrics?.[phase]?.events ?? 0))),
      averageCommands: round(average(runs.map((run) =>
        run.productLoop?.phaseMetrics?.[phase]?.commandCount ?? 0))),
      averageMcpCalls: round(average(runs.map((run) =>
        run.productLoop?.phaseMetrics?.[phase]?.mcpCalls ?? 0))),
      averageVisibleTokens: round(average(runs.map((run) =>
        run.productLoop?.phaseMetrics?.[phase]?.visibleTokens ?? 0))),
    },
  ]));
  const missingChecks = {};
  for (const run of runs) {
    for (const check of run.productLoop?.missing ?? []) {
      missingChecks[check] = (missingChecks[check] ?? 0) + 1;
    }
  }
  return {
    runs: runs.length,
    requiredRuns: runs.filter((run) => run.productLoop?.required).length,
    passes: runs.filter((run) => run.productLoop?.passed).length,
    missingChecks,
    phases,
  };
}

function summarizeProductLoopPhaseMetrics(events, milestones) {
  const metrics = Object.fromEntries(PRODUCT_LOOP_PHASES.map((phase) => [
    phase,
    { events: 0, commandCount: 0, mcpCalls: 0, visibleTokens: 0 },
  ]));
  for (const [index, event] of events.entries()) {
    if (event?.type !== "item.completed" || !isRecord(event.item)) continue;
    const phase = productLoopPhaseForIndex(index, milestones);
    const metric = metrics[phase];
    metric.events += 1;
    if (event.item.type === "command_execution") metric.commandCount += 1;
    if (event.item.type === "mcp_tool_call") metric.mcpCalls += 1;
    metric.visibleTokens += estimateItemVisibleTokens(event.item);
  }
  return metrics;
}

function productLoopPhaseForIndex(index, milestones) {
  if (milestones.context === null || index < milestones.context) return "entry";
  if (milestones.edit === null || index < milestones.edit) return "context";
  if (milestones.initialValidation === null || index < milestones.initialValidation) {
    return "implementation";
  }
  if (milestones.verificationExecuted === null || index < milestones.verificationExecuted) {
    return "validation";
  }
  if (milestones.proofRecorded === null || index < milestones.proofRecorded) {
    return "verification";
  }
  if (milestones.refresh === null || index < milestones.refresh) return "proof";
  return "maintenance";
}

function estimateItemVisibleTokens(item) {
  if (item.type === "command_execution") {
    return estimateTextTokens(item.command) + estimateTextTokens(item.aggregated_output);
  }
  if (item.type === "mcp_tool_call") {
    return estimateValueTokens(item.arguments)
      + estimateValueTokens(item.result ?? item.content ?? item.error);
  }
  if (item.type === "agent_message") return estimateTextTokens(item.text);
  if (["file_change", "file_edit", "apply_patch"].includes(item.type)) {
    return estimateValueTokens(item.changes ?? item.patch ?? item.diff);
  }
  return 0;
}

function isValidationCliCommand(command) {
  return /\b(?:rekon|\S*packages\/cli\/dist\/index\.js)\s+context\s+validate-change\b/u.test(
    command.replace(/["']/gu, " "),
  );
}

function isVerificationRunCliCommand(command) {
  return /\b(?:rekon|\S*packages\/cli\/dist\/index\.js)\s+verify\s+run\b/u.test(
    command.replace(/["']/gu, " "),
  );
}

function isVerificationResultCliCommand(command) {
  return /\b(?:rekon|\S*packages\/cli\/dist\/index\.js)\s+verify\s+result\s+from-run\b/u.test(
    command.replace(/["']/gu, " "),
  );
}

function isProofRefreshCliCommand(command) {
  const normalized = command.replace(/["']/gu, " ");
  return /\b(?:rekon|\S*packages\/cli\/dist\/index\.js)\s+refresh\b/u.test(normalized)
    && hasCommandFlag(normalized, "--proof-gate");
}

function hasCommandFlag(command, flag) {
  return String(command).includes(flag);
}

function parseCommandJson(output) {
  if (typeof output !== "string" || output.trim().length === 0) return undefined;
  const trimmed = output.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return undefined;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return undefined;
    }
  }
}

function isChangeValidationPayload(value) {
  if (!isRecord(value)) return false;
  return isRecord(value.proofGate)
    || value.verificationPlan?.type === "VerificationPlan"
    || value.proofArtifact?.type === "ProofGateReport";
}

function isProofRefreshPayload(value) {
  return isRecord(value)
    && Array.isArray(value.steps)
    && isRecord(value.freshness)
    && Array.isArray(value.freshness.latestMajor);
}

function requiredRefreshStepsPassed(steps) {
  if (!Array.isArray(steps)) return false;
  const required = new Set([
    "agent-instructions.sync",
    "proof-gate.preaccept",
    "outcome.record",
    "artifacts.freshness",
    "proof-gate.revalidate",
  ]);
  for (const step of steps) {
    if (required.has(step?.id) && step?.status === "passed") required.delete(step.id);
  }
  return required.size === 0;
}

function recall(expected, actual) {
  if (expected.length === 0) return 1;
  const values = new Set(actual);
  return expected.filter((value) => values.has(value)).length / expected.length;
}

function strings(value) {
  return Array.isArray(value)
    ? value.filter((entry) => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim())
    : [];
}

function unique(values) {
  return [...new Set(values)];
}

function normalizeRepoPath(value) {
  return String(value).replace(/\\/gu, "/").replace(/^\.\//u, "");
}

function average(values) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function finite(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function tokenCount(value, snakeCaseKey, camelCaseKey) {
  return finite(value?.[snakeCaseKey] ?? value?.[camelCaseKey]);
}

function estimateTextTokens(value) {
  if (typeof value !== "string" || value.length === 0) return 0;
  return Math.max(1, Math.ceil(Buffer.byteLength(value, "utf8") / 4));
}

function estimateValueTokens(value) {
  if (value === undefined || value === null) return 0;
  if (typeof value === "string") return estimateTextTokens(value);
  try {
    return estimateTextTokens(JSON.stringify(value));
  } catch {
    return 0;
  }
}

function round(value, places = 4) {
  const scale = 10 ** places;
  return Math.round((finite(value) + Number.EPSILON) * scale) / scale;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
