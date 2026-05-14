import {
  type VerificationEvidenceStatus,
  type VerificationEvidenceSummary,
  lookupVerificationEvidence,
} from "@rekon/capability-intent";
import {
  type ArtifactHeader,
  type ArtifactRef,
} from "@rekon/kernel-artifacts";
import {
  type FindingStatus,
  type FindingStatusDecision,
  type FindingStatusDecisionReason,
  type FindingStatusLedger,
  findLatestDecisionForFinding,
} from "@rekon/kernel-findings";
import { type ObservedRepo, type OwnershipMap } from "@rekon/kernel-repo-model";
import { type IntelligenceSnapshot } from "@rekon/kernel-snapshot";
import { type ArtifactReader, type Resolver, defineCapability } from "@rekon/sdk";

export { type VerificationEvidenceStatus, type VerificationEvidenceSummary };

export type ResolutionTraceEntry = {
  step: string;
  sourceType:
    | "OwnershipMap"
    | "ObservedRepo"
    | "GraphSlice"
    | "EvidenceGraph"
    | "FindingReport"
    | "MemorySelection"
    | "ResolverInput"
    | "RiskRule"
    | "WorkOrder"
    | "VerificationPlan"
    | "VerificationResult"
    | "Fallback";
  sourceRef?: ArtifactRef;
  status: "used" | "checked" | "missing" | "skipped" | "fallback" | "warning";
  message: string;
  paths?: string[];
  systems?: string[];
  confidence?: number;
  details?: Record<string, unknown>;
};

export type PreflightPacket = {
  header: ArtifactHeader;
  goal: string;
  paths: string[];
  ownerSystems: string[];
  matchedScopes: Array<{
    path: string;
    owner?: string;
    confidence?: number;
  }>;
  risk: {
    tier: "low" | "medium" | "high";
    reasons: string[];
  };
  requiredChecks: string[];
  relevantFindings: unknown[];
  recommendedContext: string[];
  applicableMemory?: Array<{
    instruction: string;
    scope?: Record<string, unknown>;
    confidence: number;
    reason: string;
  }>;
  warnings: string[];
  resolutionTrace: ResolutionTraceEntry[];
  nextSteps: string[];
};

type EvidenceGraphLike = {
  facts?: Array<{
    kind: string;
    subject: string;
    value?: Record<string, unknown>;
    confidence?: number;
  }>;
};

type GraphSliceLike = {
  header?: ArtifactHeader;
  producer?: string;
  edges?: Array<{
    source: string;
    target: string;
    kind: string;
    evidence?: Array<{
      confidence?: number;
    }>;
  }>;
};

type OwnershipResolution = {
  matchedScopes: PreflightPacket["matchedScopes"];
  ownerSystems: string[];
  trace: ResolutionTraceEntry[];
  warnings: string[];
};

export const preflightResolver: Resolver = {
  id: "resolve.preflight",
  produces: ["ResolverPacket"],
  async resolve({ artifacts, input }) {
    const snapshotRef = parseArtifactRef(input?.snapshotRef);
    const goal = typeof input?.goal === "string" ? input.goal : "";
    const paths = parsePaths(input?.path ?? input?.paths);

    if (!snapshotRef) {
      throw new Error("resolve.preflight requires input.snapshotRef.");
    }

    if (paths.length === 0) {
      throw new Error("resolve.preflight requires input.path or input.paths.");
    }

    const snapshot = await artifacts.read(snapshotRef) as IntelligenceSnapshot;
    const resolverInputTrace: ResolutionTraceEntry = {
      step: "resolver.input",
      sourceType: "ResolverInput",
      status: "used",
      message: "Resolved preflight request inputs.",
      paths,
      details: {
        goal,
      },
    };
    const ownership = await resolveOwnership({ artifacts, snapshot, paths });
    const { matchedScopes, ownerSystems } = ownership;
    const findingRefs = Object.values(snapshot.evaluations ?? {}).flat();
    const relevantFindings = await readRelevantFindings(artifacts, findingRefs, paths);
    const findingTrace = buildFindingTrace(findingRefs, relevantFindings, paths);
    const memoryRefs = Object.values((snapshot as { publications?: Record<string, ArtifactRef[]> }).publications ?? {})
      .flat()
      .filter((ref) => ref.type === "MemorySelection");
    const applicableMemory = await readMemorySelections(artifacts, memoryRefs, paths, goal);
    const memoryTrace = buildMemoryTrace(memoryRefs, applicableMemory ?? [], paths);
    const { risk, trace: riskTrace } = computeRisk(paths, ownerSystems, matchedScopes, relevantFindings);
    const warnings = [
      ...ownership.warnings,
      ...buildFindingWarnings(findingRefs),
      ...buildWarnings(paths, ownerSystems),
    ];
    const resolutionTrace = [
      resolverInputTrace,
      ...ownership.trace,
      ...findingTrace,
      ...memoryTrace,
      ...riskTrace,
    ];
    const ownershipMapRefs = snapshot.projections.OwnershipMap ?? [];
    const observedRepoRefs = snapshot.projections.ObservedRepo ?? [];
    const graphSliceRefs = snapshot.projections.GraphSlice ?? [];
    const evidenceRefs = snapshot.inputs.EvidenceGraph ?? [];
    const packet: PreflightPacket = {
      header: {
        artifactType: "ResolverPacket",
        artifactId: `preflight-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        snapshotId: snapshot.header.artifactId,
        subject: {
          repoId: snapshot.repo.id,
          ref: snapshot.repo.branch,
          commit: snapshot.repo.commit,
          paths,
          systems: ownerSystems,
        },
        producer: {
          id: "@rekon/capability-resolver",
          version: "0.1.0",
        },
        inputRefs: [
          snapshotRef,
          ...ownershipMapRefs,
          ...observedRepoRefs,
          ...graphSliceRefs,
          ...evidenceRefs,
          ...findingRefs,
          ...memoryRefs,
        ],
        freshness: {
          status: "fresh",
        },
        provenance: {
          confidence: ownerSystems.length > 0 ? 0.8 : 0.4,
          notes: ["resolve.preflight"],
        },
      },
      goal,
      paths,
      ownerSystems,
      matchedScopes,
      risk,
      requiredChecks: ["npm run typecheck", "npm run test", "npm run build"],
      relevantFindings,
      recommendedContext: buildRecommendedContext(paths, ownerSystems),
      applicableMemory,
      warnings,
      resolutionTrace,
      nextSteps: [
        "Read the owner package docs before editing.",
        "Keep changes scoped to the requested paths.",
        "Run the required checks before handoff.",
      ],
    };

    const ref = await artifacts.write("ResolverPacket", packet);

    return [ref];
  },
};

export type ResolverPhase = "route" | "seam" | "preflight" | "issue";

export type ResolverPacketBase = {
  header: ArtifactHeader;
  resolverId: string;
  phase: ResolverPhase;
  summary: string;
  warnings: string[];
  nextSteps: string[];
  resolutionTrace: ResolutionTraceEntry[];
};

export type RoutePacket = ResolverPacketBase & {
  phase: "route";
  goal: string;
  concern?: string;
  paths: string[];
  ownerSystems: string[];
  matchedScopes: Array<{
    path: string;
    owner?: string;
    confidence?: number;
    source?: string;
  }>;
  routing: {
    status: "single-owner" | "cross-owner" | "unresolved";
    primaryOwner?: string;
    candidateOwners: string[];
    needsSeam: boolean;
    rationale: string;
  };
  recommendedContext: string[];
  requiredChecks: string[];
  nextRequiredResolver?: "resolve.seam" | "resolve.preflight";
};

export type SeamPacket = ResolverPacketBase & {
  phase: "seam";
  goal: string;
  paths: string[];
  ownerSystems: string[];
  primaryOwner?: string;
  secondaryOwners: string[];
  seam: {
    status: "resolved" | "needs-primary-owner" | "unresolved";
    rationale: string;
    escalate: boolean;
  };
  requiredChecks: string[];
  recommendedContext: string[];
  nextRequiredResolver?: "resolve.preflight";
};

export type IssueSummary = {
  id: string;
  type: string;
  severity: string;
  title?: string;
  description: string;
  files: string[];
  ruleId?: string;
  suggestedAction?: string;
  status?: FindingStatus;
  statusSource?: "report" | "ledger" | "derived";
  statusNote?: string;
  statusReason?: FindingStatusDecisionReason;
};

export type IssuePacket = ResolverPacketBase & {
  phase: "issue";
  query: string;
  issue?: IssueSummary;
  ownerSystems: string[];
  matchedScopes: Array<{
    path: string;
    owner?: string;
    confidence?: number;
    source?: string;
  }>;
  relatedFindings: Array<{
    id: string;
    type: string;
    severity: string;
    files?: string[];
  }>;
  recommendedContext: string[];
  requiredChecks: string[];
  verification?: VerificationEvidenceSummary;
  nextRequiredResolver?: "resolve.route" | "resolve.seam" | "resolve.preflight";
};

export const routeResolver: Resolver = {
  id: "resolve.route",
  produces: ["ResolverPacket"],
  async resolve({ artifacts, input }) {
    const snapshotRef = parseArtifactRef(input?.snapshotRef);
    const goal = typeof input?.goal === "string" ? input.goal : "";
    const concern = typeof input?.concern === "string" ? input.concern : undefined;
    const paths = parsePaths(input?.path ?? input?.paths);

    if (!snapshotRef) {
      throw new Error("resolve.route requires input.snapshotRef.");
    }

    if (paths.length === 0) {
      throw new Error("resolve.route requires input.path or input.paths.");
    }

    const snapshot = (await artifacts.read(snapshotRef)) as IntelligenceSnapshot;
    const resolverInputTrace: ResolutionTraceEntry = {
      step: "resolver.input",
      sourceType: "ResolverInput",
      status: "used",
      message: "Resolved route request inputs.",
      paths,
      details: { goal, concern },
    };
    const ownership = await resolveOwnership({ artifacts, snapshot, paths });
    const { matchedScopes, ownerSystems } = ownership;
    const candidateOwners = [...ownerSystems];

    let routingStatus: RoutePacket["routing"]["status"];
    let nextRequiredResolver: RoutePacket["nextRequiredResolver"];
    let needsSeam = false;
    let primaryOwner: string | undefined;
    let rationale: string;

    if (ownerSystems.length === 1) {
      routingStatus = "single-owner";
      primaryOwner = ownerSystems[0];
      rationale = `All requested paths route to a single owner (${primaryOwner}); proceed to preflight.`;
      nextRequiredResolver = "resolve.preflight";
    } else if (ownerSystems.length > 1) {
      routingStatus = "cross-owner";
      needsSeam = true;
      rationale = `Requested paths span ${ownerSystems.length} owner systems (${ownerSystems.join(", ")}); seam resolution required before preflight.`;
      nextRequiredResolver = "resolve.seam";
    } else {
      routingStatus = "unresolved";
      rationale = "No owner system could be resolved for the requested paths; proceeding to preflight at elevated risk.";
      nextRequiredResolver = "resolve.preflight";
    }

    const routingTrace: ResolutionTraceEntry = {
      step: "routing.decide",
      sourceType: "RiskRule",
      status: routingStatus === "unresolved" ? "warning" : "used",
      message: rationale,
      paths,
      systems: ownerSystems,
      details: {
        routingStatus,
        candidateOwners,
        primaryOwner,
        needsSeam,
        nextRequiredResolver,
      },
    };
    const nextStepTrace: ResolutionTraceEntry = {
      step: "next.resolver",
      sourceType: "Fallback",
      status: "used",
      message: `Next resolver: ${nextRequiredResolver}.`,
      paths,
      details: { nextRequiredResolver },
    };

    const warnings = [...ownership.warnings];

    if (routingStatus === "unresolved") {
      warnings.push("Routing unresolved; preflight will run at elevated risk.");
    }

    const resolutionTrace = [
      resolverInputTrace,
      ...ownership.trace,
      routingTrace,
      nextStepTrace,
    ];

    const summary = routingStatus === "single-owner"
      ? `Single-owner route to ${primaryOwner}.`
      : routingStatus === "cross-owner"
        ? `Cross-owner route across ${ownerSystems.join(", ")}.`
        : "Route unresolved.";

    const packet: RoutePacket = {
      header: {
        artifactType: "ResolverPacket",
        artifactId: `route-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        snapshotId: snapshot.header.artifactId,
        subject: {
          repoId: snapshot.repo.id,
          ref: snapshot.repo.branch,
          commit: snapshot.repo.commit,
          paths,
          systems: ownerSystems,
        },
        producer: {
          id: "@rekon/capability-resolver",
          version: "0.1.0",
        },
        inputRefs: collectInputRefs(snapshot, snapshotRef),
        freshness: { status: "fresh" },
        provenance: {
          confidence: ownerSystems.length > 0 ? 0.75 : 0.4,
          notes: ["resolve.route"],
        },
      },
      resolverId: "resolve.route",
      phase: "route",
      summary,
      goal,
      concern,
      paths,
      ownerSystems,
      matchedScopes,
      routing: {
        status: routingStatus,
        primaryOwner,
        candidateOwners,
        needsSeam,
        rationale,
      },
      recommendedContext: buildRecommendedContext(paths, ownerSystems),
      requiredChecks: ["npm run typecheck", "npm run test"],
      nextRequiredResolver,
      warnings,
      resolutionTrace,
      nextSteps: routeNextSteps(routingStatus, primaryOwner, ownerSystems),
    };

    const ref = await artifacts.write("ResolverPacket", packet);

    return [ref];
  },
};

export const seamResolver: Resolver = {
  id: "resolve.seam",
  produces: ["ResolverPacket"],
  async resolve({ artifacts, input }) {
    const snapshotRef = parseArtifactRef(input?.snapshotRef);
    const goal = typeof input?.goal === "string" ? input.goal : "";
    const paths = parsePaths(input?.path ?? input?.paths);
    const requestedPrimaryOwner = typeof input?.primaryOwner === "string" && input.primaryOwner.length > 0
      ? input.primaryOwner
      : undefined;

    if (!snapshotRef) {
      throw new Error("resolve.seam requires input.snapshotRef.");
    }

    if (paths.length === 0) {
      throw new Error("resolve.seam requires input.path or input.paths.");
    }

    const snapshot = (await artifacts.read(snapshotRef)) as IntelligenceSnapshot;
    const resolverInputTrace: ResolutionTraceEntry = {
      step: "resolver.input",
      sourceType: "ResolverInput",
      status: "used",
      message: "Resolved seam request inputs.",
      paths,
      details: { goal, requestedPrimaryOwner },
    };
    const ownership = await resolveOwnership({ artifacts, snapshot, paths });
    const { matchedScopes, ownerSystems } = ownership;
    const warnings = [...ownership.warnings];

    let seamStatus: SeamPacket["seam"]["status"];
    let escalate = false;
    let primaryOwner: string | undefined;
    let secondaryOwners: string[] = [];
    let rationale: string;
    let nextRequiredResolver: SeamPacket["nextRequiredResolver"];

    if (ownerSystems.length === 0) {
      seamStatus = "unresolved";
      escalate = true;
      rationale = "No owner system was resolved for the requested paths; seam cannot be drawn.";
      warnings.push("Seam unresolved because ownership could not be determined.");
    } else if (ownerSystems.length === 1) {
      seamStatus = "resolved";
      primaryOwner = ownerSystems[0];
      secondaryOwners = [];
      rationale = `Single owner system (${primaryOwner}); no seam required.`;
      nextRequiredResolver = "resolve.preflight";
    } else if (requestedPrimaryOwner && ownerSystems.includes(requestedPrimaryOwner)) {
      seamStatus = "resolved";
      primaryOwner = requestedPrimaryOwner;
      secondaryOwners = ownerSystems.filter((owner) => owner !== requestedPrimaryOwner).sort();
      rationale = `Primary owner ${primaryOwner} validated against resolved systems; ${secondaryOwners.length} secondary owner(s) recorded.`;
      nextRequiredResolver = "resolve.preflight";
    } else if (requestedPrimaryOwner) {
      seamStatus = "unresolved";
      escalate = true;
      rationale = `Requested primary owner '${requestedPrimaryOwner}' is not among resolved owner systems (${ownerSystems.join(", ")}).`;
      warnings.push(
        `Primary owner '${requestedPrimaryOwner}' is not among resolved owner systems (${ownerSystems.join(", ")}); escalation required.`,
      );
    } else {
      seamStatus = "needs-primary-owner";
      escalate = true;
      rationale = `Multiple owner systems (${ownerSystems.join(", ")}); primary owner must be designated to proceed.`;
      warnings.push("Seam needs primary owner before preflight can run.");
    }

    const seamTrace: ResolutionTraceEntry = {
      step: "seam.resolve",
      sourceType: "RiskRule",
      status: seamStatus === "resolved" ? "used" : "warning",
      message: rationale,
      paths,
      systems: ownerSystems,
      details: {
        seamStatus,
        primaryOwner,
        secondaryOwners,
        escalate,
        nextRequiredResolver,
      },
    };

    const nextStepTrace: ResolutionTraceEntry = {
      step: "next.resolver",
      sourceType: "Fallback",
      status: nextRequiredResolver ? "used" : "warning",
      message: nextRequiredResolver
        ? `Next resolver: ${nextRequiredResolver}.`
        : "No next resolver; seam unresolved or needs a primary owner.",
      paths,
      details: { nextRequiredResolver },
    };

    const resolutionTrace = [
      resolverInputTrace,
      ...ownership.trace,
      seamTrace,
      nextStepTrace,
    ];

    const summary = seamStatus === "resolved"
      ? `Seam resolved with primary owner ${primaryOwner}.`
      : seamStatus === "needs-primary-owner"
        ? "Seam needs a primary owner."
        : "Seam unresolved.";

    const packet: SeamPacket = {
      header: {
        artifactType: "ResolverPacket",
        artifactId: `seam-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        snapshotId: snapshot.header.artifactId,
        subject: {
          repoId: snapshot.repo.id,
          ref: snapshot.repo.branch,
          commit: snapshot.repo.commit,
          paths,
          systems: ownerSystems,
        },
        producer: {
          id: "@rekon/capability-resolver",
          version: "0.1.0",
        },
        inputRefs: collectInputRefs(snapshot, snapshotRef),
        freshness: { status: "fresh" },
        provenance: {
          confidence: seamStatus === "resolved" ? 0.8 : 0.4,
          notes: ["resolve.seam"],
        },
      },
      resolverId: "resolve.seam",
      phase: "seam",
      summary,
      goal,
      paths,
      ownerSystems,
      primaryOwner,
      secondaryOwners,
      seam: {
        status: seamStatus,
        rationale,
        escalate,
      },
      requiredChecks: ["npm run typecheck", "npm run test"],
      recommendedContext: buildRecommendedContext(paths, ownerSystems),
      nextRequiredResolver,
      warnings,
      resolutionTrace,
      nextSteps: seamNextSteps(seamStatus, primaryOwner, secondaryOwners),
    };

    const ref = await artifacts.write("ResolverPacket", packet);

    return [ref];
  },
};

export const issueResolver: Resolver = {
  id: "resolve.issue",
  produces: ["ResolverPacket"],
  async resolve({ artifacts, input }) {
    const snapshotRef = parseArtifactRef(input?.snapshotRef);
    const query = typeof input?.issue === "string" ? input.issue.trim() : "";

    if (!snapshotRef) {
      throw new Error("resolve.issue requires input.snapshotRef.");
    }

    const snapshot = (await artifacts.read(snapshotRef)) as IntelligenceSnapshot;
    const resolverInputTrace: ResolutionTraceEntry = {
      step: "resolver.input",
      sourceType: "ResolverInput",
      status: query.length > 0 ? "used" : "warning",
      message: query.length > 0
        ? `Resolved issue request for query '${query}'.`
        : "resolve.issue called without an issue id or fragment.",
      details: { query },
    };

    const findingRefs = Object.values(snapshot.evaluations ?? {}).flat();
    const trace: ResolutionTraceEntry[] = [resolverInputTrace];

    if (findingRefs.length === 0) {
      trace.push({
        step: "issue.lookup",
        sourceType: "FindingReport",
        status: "missing",
        message: "No FindingReport artifacts are indexed; issue cannot be resolved.",
      });
    }

    const ledger = await readLatestLedgerFromArtifacts(artifacts);
    const ledgerRef = ledger
      ? { type: "FindingStatusLedger", id: ledger.header.artifactId, schemaVersion: ledger.header.schemaVersion }
      : undefined;

    if (ledger) {
      trace.push({
        step: "issue.lookup",
        sourceType: "Fallback",
        sourceRef: ledgerRef,
        status: "used",
        message: "Applied finding status ledger when annotating matches.",
      });
    }

    const { match: rawMatch, matches, candidates } = await findIssueMatches(artifacts, findingRefs, query);
    const match = rawMatch ? annotateIssueWithLedger(rawMatch, ledger) : null;

    for (const ref of findingRefs) {
      trace.push({
        step: "issue.lookup",
        sourceType: "FindingReport",
        sourceRef: ref,
        status: "checked",
        message: "Searched FindingReport for matching issue.",
      });
    }

    const warnings: string[] = [];
    let ownership: OwnershipResolution = {
      matchedScopes: [],
      ownerSystems: [],
      trace: [],
      warnings: [],
    };
    let nextRequiredResolver: IssuePacket["nextRequiredResolver"];
    let summary: string;

    if (query.length === 0) {
      warnings.push("resolve.issue called without an issue id or fragment.");
      summary = "Issue query missing.";
      trace.push({
        step: "issue.match",
        sourceType: "Fallback",
        status: "warning",
        message: "Query was empty; nothing to look up.",
      });
    } else if (!match && matches.length === 0) {
      warnings.push(`No finding matched query '${query}'.`);
      summary = `No finding matched query '${query}'.`;
      trace.push({
        step: "issue.match",
        sourceType: "Fallback",
        status: "warning",
        message: `No finding matched query '${query}'.`,
        details: { findingCount: candidates.length },
      });
    } else if (!match && matches.length > 1) {
      warnings.push(`Issue query '${query}' matched ${matches.length} findings; please refine.`);
      summary = `Ambiguous issue query '${query}'.`;
      trace.push({
        step: "issue.match",
        sourceType: "Fallback",
        status: "warning",
        message: `Issue query '${query}' matched ${matches.length} findings.`,
        details: {
          matchedFindingIds: matches.map((candidate) => candidate.id),
        },
      });
    } else if (match) {
      trace.push({
        step: "issue.match",
        sourceType: "FindingReport",
        status: "used",
        message: `Matched finding ${match.id}.`,
        paths: match.files ?? [],
        details: { ruleId: match.ruleId, severity: match.severity, type: match.type },
      });

      const files = match.files ?? [];

      if (files.length > 0) {
        ownership = await resolveOwnership({ artifacts, snapshot, paths: files });
        trace.push(...ownership.trace);
        warnings.push(...ownership.warnings);

        if (ownership.ownerSystems.length > 1) {
          nextRequiredResolver = "resolve.seam";
        } else {
          nextRequiredResolver = "resolve.preflight";
        }
      } else {
        nextRequiredResolver = "resolve.route";
        trace.push({
          step: "issue.ownership",
          sourceType: "Fallback",
          status: "warning",
          message: "Matched finding has no associated files; routing must be re-established.",
        });
        warnings.push("Matched finding has no file information; recommending route resolver.");
      }

      summary = `Matched finding ${match.id} (${match.severity}).`;

      if (match.status === "ignored") {
        warnings.push("Matched finding is ignored; verify before acting.");
      } else if (match.status === "accepted") {
        warnings.push("Matched finding is accepted risk/debt; verify policy before changing.");
      } else if (match.status === "resolved") {
        warnings.push("Matched finding is marked resolved; confirm whether action is still needed.");
      }
    } else {
      summary = "No issue resolved.";
    }

    let verification: VerificationEvidenceSummary | undefined;

    if (match) {
      verification = await lookupVerificationEvidence(artifacts, match.id);

      const verificationSourceType = pickVerificationSourceType(verification);
      const verificationSourceRef = verification.verificationResultRef
        ?? verification.verificationPlanRef
        ?? verification.workOrderRef;
      const verificationStatusEntry: ResolutionTraceEntry["status"] = verification.status === "passed"
        ? "used"
        : verification.status === "missing"
          ? "missing"
          : "warning";

      trace.push({
        step: "issue.verification",
        sourceType: verificationSourceType,
        sourceRef: verificationSourceRef,
        status: verificationStatusEntry,
        message: verificationTraceMessage(verification),
        details: {
          status: verification.status,
          summary: verification.summary,
          recordedBy: verification.recordedBy,
          recordedAt: verification.recordedAt,
        },
      });

      switch (verification.status) {
        case "failed":
          warnings.push("Associated verification failed; inspect VerificationResult before acting.");
          break;
        case "partial":
          warnings.push("Associated verification is partial; missing checks remain.");
          break;
        case "not-run":
          warnings.push("VerificationPlan exists but no VerificationResult has passed yet.");
          break;
        case "missing":
          warnings.push("No verification evidence found for this finding.");
          break;
        case "passed":
          break;
      }

      for (const evidenceWarning of verification.warnings) {
        if (!warnings.includes(evidenceWarning)) {
          warnings.push(evidenceWarning);
        }
      }
    }

    const relatedFindings = matches
      .filter((candidate) => !match || candidate.id !== match.id)
      .slice(0, 5)
      .map((candidate) => ({
        id: candidate.id,
        type: candidate.type,
        severity: candidate.severity,
        files: candidate.files,
      }));

    const nextStepTrace: ResolutionTraceEntry = {
      step: "next.resolver",
      sourceType: "Fallback",
      status: nextRequiredResolver ? "used" : "warning",
      message: nextRequiredResolver
        ? `Next resolver: ${nextRequiredResolver}.`
        : "No next resolver; issue resolution incomplete.",
      details: { nextRequiredResolver },
    };

    const resolutionTrace = [...trace, nextStepTrace];

    const packet: IssuePacket = {
      header: {
        artifactType: "ResolverPacket",
        artifactId: `issue-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        snapshotId: snapshot.header.artifactId,
        subject: {
          repoId: snapshot.repo.id,
          ref: snapshot.repo.branch,
          commit: snapshot.repo.commit,
          paths: match?.files ?? [],
          systems: ownership.ownerSystems,
        },
        producer: {
          id: "@rekon/capability-resolver",
          version: "0.1.0",
        },
        inputRefs: collectInputRefs(snapshot, snapshotRef),
        freshness: { status: "fresh" },
        provenance: {
          confidence: match ? 0.7 : 0.3,
          notes: ["resolve.issue"],
        },
      },
      resolverId: "resolve.issue",
      phase: "issue",
      summary,
      query,
      issue: match ?? undefined,
      ownerSystems: ownership.ownerSystems,
      matchedScopes: ownership.matchedScopes,
      relatedFindings,
      recommendedContext: buildRecommendedContext(match?.files ?? [], ownership.ownerSystems),
      requiredChecks: ["npm run typecheck", "npm run test"],
      verification,
      nextRequiredResolver,
      warnings,
      resolutionTrace,
      nextSteps: issueNextSteps(match, ownership.ownerSystems, verification),
    };

    const ref = await artifacts.write("ResolverPacket", packet);

    return [ref];
  },
};

export default defineCapability({
  manifest: {
    id: "@rekon/capability-resolver",
    name: "Resolver Capability",
    version: "0.1.0",
    roles: ["resolver"],
    consumes: [
      "IntelligenceSnapshot",
      "OwnershipMap",
      "ObservedRepo",
      "GraphSlice",
      "EvidenceGraph",
      "FindingReport",
      "MemorySelection",
      "WorkOrder",
      "VerificationPlan",
      "VerificationResult",
    ],
    produces: ["ResolverPacket"],
    permissions: ["read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "snapshot.changed",
        description: "Resolver packets are invalid when their snapshot or selected inputs change.",
        inputs: ["IntelligenceSnapshot", "OwnershipMap", "ObservedRepo", "GraphSlice", "EvidenceGraph", "FindingReport", "MemorySelection"],
      },
      {
        id: "verification.changed",
        description: "Issue resolver packets are invalid when associated verification evidence changes.",
        inputs: ["WorkOrder", "VerificationPlan", "VerificationResult"],
      },
    ],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    registry.resolver(preflightResolver);
    registry.resolver(routeResolver);
    registry.resolver(seamResolver);
    registry.resolver(issueResolver);
  },
});

function collectInputRefs(snapshot: IntelligenceSnapshot, snapshotRef: ArtifactRef): ArtifactRef[] {
  return [
    snapshotRef,
    ...(snapshot.projections.OwnershipMap ?? []),
    ...(snapshot.projections.ObservedRepo ?? []),
    ...(snapshot.projections.GraphSlice ?? []),
    ...(snapshot.inputs.EvidenceGraph ?? []),
    ...Object.values(snapshot.evaluations ?? {}).flat(),
    ...Object.values((snapshot as { publications?: Record<string, ArtifactRef[]> }).publications ?? {})
      .flat()
      .filter((ref) => ref.type === "MemorySelection"),
  ];
}

function routeNextSteps(
  status: RoutePacket["routing"]["status"],
  primaryOwner: string | undefined,
  ownerSystems: string[],
): string[] {
  if (status === "single-owner" && primaryOwner) {
    return [
      `Run preflight against the requested paths (owner: ${primaryOwner}).`,
      "Keep changes scoped to the requested paths.",
    ];
  }

  if (status === "cross-owner") {
    return [
      `Run seam resolution to designate a primary owner among ${ownerSystems.join(", ")}.`,
      "Record secondary owners explicitly before preflight.",
    ];
  }

  return [
    "Confirm ownership manually before editing.",
    "Run preflight with reduced confidence and treat results as advisory.",
  ];
}

function seamNextSteps(
  status: SeamPacket["seam"]["status"],
  primaryOwner: string | undefined,
  secondaryOwners: string[],
): string[] {
  if (status === "resolved" && primaryOwner) {
    return [
      `Run preflight with primary owner ${primaryOwner}.`,
      secondaryOwners.length > 0
        ? `Coordinate with secondary owner(s): ${secondaryOwners.join(", ")}.`
        : "No secondary owners recorded.",
    ];
  }

  if (status === "needs-primary-owner") {
    return [
      "Designate a primary owner.",
      "Re-run resolve.seam with --primary-owner once chosen.",
    ];
  }

  return [
    "Confirm ownership manually before editing.",
    "Escalate the seam decision before running preflight.",
  ];
}

function issueNextSteps(
  match: IssueSummary | null,
  ownerSystems: string[],
  verification?: VerificationEvidenceSummary,
): string[] {
  if (!match) {
    return [
      "Refine the issue query and re-run resolve.issue.",
      "Use `rekon evaluate` to refresh FindingReport artifacts if needed.",
    ];
  }

  const steps = [
    `Read the matched finding (${match.id}) and its suggested action.`,
  ];

  if (ownerSystems.length > 1) {
    steps.push(`Run seam resolution against owners: ${ownerSystems.join(", ")}.`);
  } else if (ownerSystems.length === 1) {
    steps.push(`Run preflight against the matched files (owner: ${ownerSystems[0]}).`);
  } else {
    steps.push("Run route resolution; matched finding has no associated files.");
  }

  if (verification) {
    switch (verification.status) {
      case "missing":
        steps.push("Run `rekon intent remediation` to plan work and `rekon verify record` to capture proof.");
        break;
      case "not-run":
        steps.push("Run `rekon verify record` against the existing VerificationPlan to capture proof.");
        break;
      case "partial":
      case "failed":
        steps.push("Address verification failures and re-run `rekon verify record`.");
        break;
      case "passed":
        steps.push("Associated verification has passed; confirm whether the finding is now stale.");
        break;
    }
  }

  return steps;
}

async function readLatestLedgerFromArtifacts(
  artifacts: ArtifactReader,
): Promise<FindingStatusLedger | undefined> {
  const entries = await artifacts.list("FindingStatusLedger");

  if (entries.length === 0) {
    return undefined;
  }

  const sorted = [...entries].sort((left, right) => {
    const leftWritten = (left as { writtenAt?: string }).writtenAt ?? "";
    const rightWritten = (right as { writtenAt?: string }).writtenAt ?? "";

    if (leftWritten !== rightWritten) {
      return rightWritten.localeCompare(leftWritten);
    }

    return right.id.localeCompare(left.id);
  });

  const latest = sorted[0];

  if (!latest) {
    return undefined;
  }

  return (await artifacts.read(latest)) as FindingStatusLedger;
}

function annotateIssueWithLedger(
  issue: IssueSummary,
  ledger: FindingStatusLedger | undefined,
): IssueSummary {
  if (!ledger) {
    return issue;
  }

  const decision: FindingStatusDecision | undefined = findLatestDecisionForFinding(
    ledger,
    issue.id,
  );

  if (!decision) {
    return issue;
  }

  return {
    ...issue,
    status: decision.status,
    statusSource: "ledger",
    statusNote: decision.note,
    statusReason: decision.reason,
  };
}

async function findIssueMatches(
  artifacts: { read(ref: ArtifactRef): Promise<unknown> },
  refs: ArtifactRef[],
  query: string,
): Promise<{
  match: IssueSummary | null;
  matches: IssueSummary[];
  candidates: IssueSummary[];
}> {
  const candidates: IssueSummary[] = [];

  for (const ref of refs) {
    const report = (await artifacts.read(ref)) as { findings?: unknown[] };

    for (const candidate of report.findings ?? []) {
      const summary = parseFindingSummary(candidate);

      if (summary) {
        candidates.push(summary);
      }
    }
  }

  if (query.length === 0) {
    return { match: null, matches: [], candidates };
  }

  const exact = candidates.find((candidate) => candidate.id === query);

  if (exact) {
    return { match: exact, matches: [exact], candidates };
  }

  const lower = query.toLowerCase();
  const matches = candidates.filter((candidate) => {
    return (
      candidate.id.toLowerCase().includes(lower) ||
      candidate.type.toLowerCase().includes(lower) ||
      (candidate.title && candidate.title.toLowerCase().includes(lower)) ||
      candidate.description.toLowerCase().includes(lower) ||
      (candidate.ruleId && candidate.ruleId.toLowerCase().includes(lower))
    );
  });

  if (matches.length === 1) {
    return { match: matches[0]!, matches, candidates };
  }

  return { match: null, matches, candidates };
}

function parseFindingSummary(value: unknown): IssueSummary | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as {
    id?: unknown;
    type?: unknown;
    severity?: unknown;
    title?: unknown;
    description?: unknown;
    files?: unknown;
    ruleId?: unknown;
    suggestedAction?: unknown;
  };

  if (typeof candidate.id !== "string" || typeof candidate.type !== "string") {
    return null;
  }

  const files = Array.isArray(candidate.files)
    ? candidate.files.filter((file): file is string => typeof file === "string")
    : [];

  return {
    id: candidate.id,
    type: candidate.type,
    severity: typeof candidate.severity === "string" ? candidate.severity : "unknown",
    title: typeof candidate.title === "string" ? candidate.title : undefined,
    description: typeof candidate.description === "string" ? candidate.description : "",
    files,
    ruleId: typeof candidate.ruleId === "string" ? candidate.ruleId : undefined,
    suggestedAction:
      typeof candidate.suggestedAction === "string" ? candidate.suggestedAction : undefined,
  };
}

function parseArtifactRef(value: unknown): ArtifactRef | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ArtifactRef>;

  if (
    typeof candidate.type === "string" &&
    typeof candidate.id === "string" &&
    typeof candidate.schemaVersion === "string"
  ) {
    return candidate as ArtifactRef;
  }

  return null;
}

function parsePaths(value: unknown): string[] {
  if (typeof value === "string" && value.length > 0) {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter(isString);
  }

  return [];
}

async function resolveOwnership(input: {
  artifacts: ArtifactReader;
  snapshot: IntelligenceSnapshot;
  paths: string[];
}): Promise<OwnershipResolution> {
  const matchedScopes = input.paths.map((path) => ({ path }));
  const unresolved = new Set(input.paths);
  const trace: ResolutionTraceEntry[] = [];
  const warnings: string[] = [];

  const ownershipMapRefs = input.snapshot.projections.OwnershipMap ?? [];
  const observedRepoRefs = input.snapshot.projections.ObservedRepo ?? [];
  const graphSliceRefs = input.snapshot.projections.GraphSlice ?? [];
  const evidenceRefs = input.snapshot.inputs.EvidenceGraph ?? [];

  if (ownershipMapRefs.length === 0) {
    trace.push(missingTrace("OwnershipMap", "OwnershipMap unavailable; checking ObservedRepo.", input.paths));
  } else {
    for (const ref of ownershipMapRefs) {
      trace.push(checkedTrace("OwnershipMap", ref, `Checked OwnershipMap for ${unresolved.size} unresolved path(s).`, [...unresolved]));
      const map = await input.artifacts.read(ref) as OwnershipMap;
      const matches = [...unresolved]
        .map((path) => ({ path, match: findBestOwnershipMapMatch(path, map) }))
        .filter((candidate): candidate is { path: string; match: { owner: string; matchedPath: string; confidence: number } } => Boolean(candidate.match));

      applyOwnershipMatches(matchedScopes, unresolved, matches.map(({ path, match }) => ({
        path,
        owner: match.owner,
        confidence: match.confidence,
      })));

      if (matches.length > 0) {
        trace.push(usedTrace("OwnershipMap", ref, "Resolved owner system from OwnershipMap.", matches));
      }
    }

    if (unresolved.size > 0) {
      trace.push(fallbackTrace("OwnershipMap", "OwnershipMap had no matching entry for every requested path; falling back to ObservedRepo.", [...unresolved]));
    }
  }

  if (unresolved.size === 0) {
    trace.push(skippedTrace("ObservedRepo", "ObservedRepo skipped because ownership was fully resolved.", input.paths));
    trace.push(skippedTrace("GraphSlice", "Ownership GraphSlice skipped because ownership was fully resolved.", input.paths));
    trace.push(skippedTrace("EvidenceGraph", "EvidenceGraph ownership_hint fallback skipped because ownership was fully resolved.", input.paths));
    return completeOwnershipResolution(matchedScopes, trace, warnings);
  }

  if (observedRepoRefs.length === 0) {
    trace.push(missingTrace("ObservedRepo", "ObservedRepo unavailable; checking ownership GraphSlice.", [...unresolved]));
  } else {
    for (const ref of observedRepoRefs) {
      trace.push(checkedTrace("ObservedRepo", ref, `Checked ObservedRepo for ${unresolved.size} unresolved path(s).`, [...unresolved]));
      const repo = await input.artifacts.read(ref) as ObservedRepo;
      const matches = [...unresolved]
        .map((path) => ({ path, match: findBestObservedRepoMatch(path, repo) }))
        .filter((candidate): candidate is { path: string; match: { owner: string; matchedPath: string; confidence: number } } => Boolean(candidate.match));

      applyOwnershipMatches(matchedScopes, unresolved, matches.map(({ path, match }) => ({
        path,
        owner: match.owner,
        confidence: match.confidence,
      })));

      if (matches.length > 0) {
        trace.push(usedTrace("ObservedRepo", ref, "Resolved owner system from ObservedRepo.", matches));
      }
    }

    if (unresolved.size > 0) {
      trace.push(fallbackTrace("ObservedRepo", "ObservedRepo had no matching system path; falling back to ownership GraphSlice.", [...unresolved]));
    }
  }

  if (unresolved.size === 0) {
    trace.push(skippedTrace("GraphSlice", "Ownership GraphSlice skipped because ownership was fully resolved.", input.paths));
    trace.push(skippedTrace("EvidenceGraph", "EvidenceGraph ownership_hint fallback skipped because ownership was fully resolved.", input.paths));
    return completeOwnershipResolution(matchedScopes, trace, warnings);
  }

  if (graphSliceRefs.length === 0) {
    trace.push(missingTrace("GraphSlice", "No GraphSlice artifacts are indexed; checking raw EvidenceGraph ownership hints.", [...unresolved]));
  } else {
    let checkedOwnershipGraph = false;

    for (const ref of graphSliceRefs) {
      const slice = await input.artifacts.read(ref) as GraphSliceLike;

      if (!isOwnershipGraphSlice(slice)) {
        trace.push({
          step: "ownership.resolve",
          sourceType: "GraphSlice",
          sourceRef: ref,
          status: "skipped",
          message: "Skipped non-ownership GraphSlice.",
          paths: [...unresolved],
        });
        continue;
      }

      checkedOwnershipGraph = true;
      trace.push(checkedTrace("GraphSlice", ref, `Checked ownership GraphSlice for ${unresolved.size} unresolved path(s).`, [...unresolved]));
      const matches = [...unresolved]
        .map((path) => ({ path, match: findBestGraphOwnershipMatch(path, slice) }))
        .filter((candidate): candidate is { path: string; match: { owner: string; matchedPath: string; confidence: number } } => Boolean(candidate.match));

      applyOwnershipMatches(matchedScopes, unresolved, matches.map(({ path, match }) => ({
        path,
        owner: match.owner,
        confidence: match.confidence,
      })));

      if (matches.length > 0) {
        trace.push(usedTrace("GraphSlice", ref, "Resolved owner system from ownership GraphSlice.", matches));
      }
    }

    if (!checkedOwnershipGraph) {
      trace.push(fallbackTrace("GraphSlice", "No ownership GraphSlice was found; falling back to raw EvidenceGraph ownership_hint facts.", [...unresolved]));
    } else if (unresolved.size > 0) {
      trace.push(fallbackTrace("GraphSlice", "Ownership GraphSlice had no matching edge for every requested path; falling back to raw EvidenceGraph ownership_hint facts.", [...unresolved]));
    }
  }

  if (unresolved.size === 0) {
    trace.push(skippedTrace("EvidenceGraph", "EvidenceGraph ownership_hint fallback skipped because ownership was fully resolved.", input.paths));
    return completeOwnershipResolution(matchedScopes, trace, warnings);
  }

  if (evidenceRefs.length === 0) {
    trace.push(missingTrace("EvidenceGraph", "EvidenceGraph unavailable; ownership remains unresolved.", [...unresolved]));
  } else {
    let usedEvidenceFallback = false;

    for (const ref of evidenceRefs) {
      trace.push(checkedTrace("EvidenceGraph", ref, `Checked raw EvidenceGraph ownership_hint facts for ${unresolved.size} unresolved path(s).`, [...unresolved]));
      const graph = await input.artifacts.read(ref) as EvidenceGraphLike;
      const facts = (graph.facts ?? []).filter((fact) => fact.kind === "ownership_hint");
      const matches = [...unresolved]
        .map((path) => ({ path, match: findBestEvidenceOwnershipMatch(path, facts) }))
        .filter((candidate): candidate is { path: string; match: { owner: string; matchedPath: string; confidence: number } } => Boolean(candidate.match));

      applyOwnershipMatches(matchedScopes, unresolved, matches.map(({ path, match }) => ({
        path,
        owner: match.owner,
        confidence: match.confidence,
      })));

      if (matches.length > 0) {
        usedEvidenceFallback = true;
        trace.push(usedTrace("EvidenceGraph", ref, "Resolved owner system from raw EvidenceGraph ownership_hint fallback.", matches));
      }
    }

    if (usedEvidenceFallback) {
      warnings.push("OwnershipMap unavailable; used EvidenceGraph ownership_hint fallback.");
    }
  }

  if (unresolved.size > 0) {
    warnings.push("Ownership unresolved for at least one requested path.");
    trace.push({
      step: "ownership.resolve",
      sourceType: "Fallback",
      status: "warning",
      message: "Ownership remains unresolved for at least one requested path.",
      paths: [...unresolved],
    });
  }

  return completeOwnershipResolution(matchedScopes, trace, warnings);
}

function findBestEvidenceOwnershipMatch(
  path: string,
  facts: Array<{ subject: string; value?: Record<string, unknown>; confidence?: number }>,
): { owner: string; matchedPath: string; confidence: number } | undefined {
  const match = facts
    .map((fact) => ({
      fact,
      factPath: typeof fact.value?.path === "string" ? fact.value.path : fact.subject,
    }))
    .filter(({ fact, factPath }) => typeof fact.value?.system === "string" && pathMatches(path, factPath))
    .sort((left, right) => right.factPath.length - left.factPath.length || (right.fact.confidence ?? 0) - (left.fact.confidence ?? 0))[0];

  if (!match || typeof match.fact.value?.system !== "string") {
    return undefined;
  }

  return {
    owner: match.fact.value.system,
    matchedPath: match.factPath,
    confidence: match.fact.confidence ?? 0.5,
  };
}

function findBestOwnershipMapMatch(path: string, map: OwnershipMap): { owner: string; matchedPath: string; confidence: number } | undefined {
  const entry = map.entries
    .filter((candidate) => pathMatches(path, candidate.path))
    .sort((left, right) => right.path.length - left.path.length || right.confidence - left.confidence)[0];

  return entry
    ? { owner: entry.ownerSystem, matchedPath: entry.path, confidence: entry.confidence }
    : undefined;
}

function findBestObservedRepoMatch(path: string, repo: ObservedRepo): { owner: string; matchedPath: string; confidence: number } | undefined {
  const entry = repo.systems
    .flatMap((system) => system.paths.map((systemPath) => ({ system, systemPath })))
    .filter((candidate) => pathMatches(path, candidate.systemPath))
    .sort((left, right) => right.systemPath.length - left.systemPath.length || right.system.confidence - left.system.confidence)[0];

  return entry
    ? { owner: entry.system.id, matchedPath: entry.systemPath, confidence: entry.system.confidence }
    : undefined;
}

function findBestGraphOwnershipMatch(path: string, slice: GraphSliceLike): { owner: string; matchedPath: string; confidence: number } | undefined {
  const edge = (slice.edges ?? [])
    .filter((candidate) => candidate.kind === "owns" && pathMatches(path, candidate.target))
    .sort((left, right) => right.target.length - left.target.length || confidenceForEdge(right) - confidenceForEdge(left))[0];

  return edge
    ? { owner: edge.source, matchedPath: edge.target, confidence: confidenceForEdge(edge) }
    : undefined;
}

function completeOwnershipResolution(
  matchedScopes: PreflightPacket["matchedScopes"],
  trace: ResolutionTraceEntry[],
  warnings: string[],
): OwnershipResolution {
  return {
    matchedScopes,
    ownerSystems: [...new Set(matchedScopes.map((scope) => scope.owner).filter(isString))].sort(),
    trace,
    warnings,
  };
}

function applyOwnershipMatches(
  matchedScopes: PreflightPacket["matchedScopes"],
  unresolved: Set<string>,
  matches: Array<{ path: string; owner: string; confidence: number }>,
): void {
  for (const match of matches) {
    const scope = matchedScopes.find((candidate) => candidate.path === match.path);

    if (scope) {
      scope.owner = match.owner;
      scope.confidence = match.confidence;
    }

    unresolved.delete(match.path);
  }
}

function isOwnershipGraphSlice(slice: GraphSliceLike): boolean {
  const artifactId = slice.header?.artifactId ?? "";
  const notes = slice.header?.provenance?.notes ?? [];

  return artifactId.includes("ownership")
    || notes.some((note) => note.includes("ownership"))
    || (slice.edges ?? []).some((edge) => edge.kind === "owns");
}

function confidenceForEdge(edge: NonNullable<GraphSliceLike["edges"]>[number]): number {
  const confidences = (edge.evidence ?? [])
    .map((evidence) => evidence.confidence)
    .filter((confidence): confidence is number => typeof confidence === "number");

  return confidences.length > 0 ? Math.max(...confidences) : 0.5;
}

function pathMatches(path: string, candidatePath: string): boolean {
  return path === candidatePath || path.startsWith(`${candidatePath}/`);
}

function checkedTrace(
  sourceType: ResolutionTraceEntry["sourceType"],
  sourceRef: ArtifactRef,
  message: string,
  paths: string[],
): ResolutionTraceEntry {
  return {
    step: "ownership.resolve",
    sourceType,
    sourceRef,
    status: "checked",
    message,
    paths,
  };
}

function usedTrace(
  sourceType: ResolutionTraceEntry["sourceType"],
  sourceRef: ArtifactRef,
  message: string,
  matches: Array<{ path: string; match: { owner: string; matchedPath: string; confidence: number } }>,
): ResolutionTraceEntry {
  const systems = [...new Set(matches.map(({ match }) => match.owner))].sort();
  const confidence = Math.max(...matches.map(({ match }) => match.confidence));

  return {
    step: "ownership.resolve",
    sourceType,
    sourceRef,
    status: "used",
    message,
    paths: matches.map(({ path }) => path),
    systems,
    confidence,
    details: {
      matches: matches.map(({ path, match }) => ({
        path,
        matchedPath: match.matchedPath,
        owner: match.owner,
        confidence: match.confidence,
      })),
    },
  };
}

function missingTrace(
  sourceType: ResolutionTraceEntry["sourceType"],
  message: string,
  paths: string[],
): ResolutionTraceEntry {
  return {
    step: "ownership.resolve",
    sourceType,
    status: "missing",
    message,
    paths,
  };
}

function fallbackTrace(
  sourceType: ResolutionTraceEntry["sourceType"],
  message: string,
  paths: string[],
): ResolutionTraceEntry {
  return {
    step: "ownership.resolve",
    sourceType,
    status: "fallback",
    message,
    paths,
  };
}

function skippedTrace(
  sourceType: ResolutionTraceEntry["sourceType"],
  message: string,
  paths: string[],
): ResolutionTraceEntry {
  return {
    step: "ownership.resolve",
    sourceType,
    status: "skipped",
    message,
    paths,
  };
}

async function readRelevantFindings(
  artifacts: { read(ref: ArtifactRef): Promise<unknown> },
  refs: ArtifactRef[],
  paths: string[],
): Promise<unknown[]> {
  const findings: unknown[] = [];

  for (const ref of refs) {
    const report = await artifacts.read(ref) as { findings?: unknown[] };

    for (const finding of report.findings ?? []) {
      if (!finding || typeof finding !== "object") {
        continue;
      }

      const files = (finding as { files?: unknown }).files;

      if (Array.isArray(files) && files.some((file) => typeof file === "string" && paths.includes(file))) {
        findings.push(finding);
      }
    }
  }

  return findings;
}

async function readMemorySelections(
  artifacts: { read(ref: ArtifactRef): Promise<unknown> },
  refs: ArtifactRef[],
  paths: string[],
  goal: string,
): Promise<PreflightPacket["applicableMemory"]> {
  const selections: NonNullable<PreflightPacket["applicableMemory"]> = [];

  for (const ref of refs) {
    const artifact = await artifacts.read(ref) as { selections?: unknown[] };

    for (const selection of artifact.selections ?? []) {
      if (!selection || typeof selection !== "object") {
        continue;
      }

      const candidate = selection as {
        instruction?: unknown;
        scope?: Record<string, unknown>;
        confidence?: unknown;
        reason?: unknown;
        path?: unknown;
        goal?: unknown;
      };
      const pathMatches = typeof candidate.path !== "string" || paths.some((path) => path.startsWith(candidate.path as string));
      const goalMatches = typeof candidate.goal !== "string" || goal.includes(candidate.goal);

      if (typeof candidate.instruction === "string" && pathMatches && goalMatches) {
        selections.push({
          instruction: candidate.instruction,
          scope: candidate.scope,
          confidence: typeof candidate.confidence === "number" ? candidate.confidence : 0.5,
          reason: typeof candidate.reason === "string" ? candidate.reason : "Selected from memory artifact.",
        });
      }
    }
  }

  return selections;
}

function buildFindingTrace(
  refs: ArtifactRef[],
  relevantFindings: unknown[],
  paths: string[],
): ResolutionTraceEntry[] {
  if (refs.length === 0) {
    return [{
      step: "findings.attach",
      sourceType: "FindingReport",
      status: "missing",
      message: "No FindingReport artifacts are indexed.",
      paths,
    }];
  }

  return [
    ...refs.map((ref): ResolutionTraceEntry => ({
      step: "findings.attach",
      sourceType: "FindingReport",
      sourceRef: ref,
      status: "checked",
      message: "Checked FindingReport for findings relevant to requested paths.",
      paths,
    })),
    {
      step: "findings.attach",
      sourceType: "FindingReport",
      status: relevantFindings.length > 0 ? "used" : "checked",
      message: relevantFindings.length > 0
        ? "Attached relevant findings to preflight packet."
        : "No relevant findings matched requested paths.",
      paths,
      details: {
        relevantFindingCount: relevantFindings.length,
      },
    },
  ];
}

function buildMemoryTrace(
  refs: ArtifactRef[],
  applicableMemory: NonNullable<PreflightPacket["applicableMemory"]>,
  paths: string[],
): ResolutionTraceEntry[] {
  if (refs.length === 0) {
    return [{
      step: "memory.select",
      sourceType: "MemorySelection",
      status: "missing",
      message: "No MemorySelection artifacts are indexed.",
      paths,
    }];
  }

  return [
    ...refs.map((ref): ResolutionTraceEntry => ({
      step: "memory.select",
      sourceType: "MemorySelection",
      sourceRef: ref,
      status: "checked",
      message: "Checked MemorySelection for applicable instructions.",
      paths,
    })),
    {
      step: "memory.select",
      sourceType: "MemorySelection",
      status: applicableMemory.length > 0 ? "used" : "checked",
      message: applicableMemory.length > 0
        ? "Attached applicable memory to preflight packet."
        : "No applicable memory matched requested paths and goal.",
      paths,
      confidence: applicableMemory.length > 0
        ? Math.max(...applicableMemory.map((memory) => memory.confidence))
        : undefined,
      details: {
        applicableMemoryCount: applicableMemory.length,
      },
    },
  ];
}

function buildFindingWarnings(refs: ArtifactRef[]): string[] {
  return refs.length === 0
    ? ["Relevant findings were unavailable because no FindingReport is indexed."]
    : [];
}

function computeRisk(
  paths: string[],
  ownerSystems: string[],
  matchedScopes: PreflightPacket["matchedScopes"],
  relevantFindings: unknown[],
): { risk: PreflightPacket["risk"]; trace: ResolutionTraceEntry[] } {
  const reasons: string[] = [];
  const trace: ResolutionTraceEntry[] = [];
  const unresolvedOwnership = matchedScopes.some((scope) => !scope.owner);
  const hasHighOrCriticalFinding = relevantFindings.some(isHighOrCriticalFinding);

  if (ownerSystems.length > 1) {
    const reason = "Requested paths span multiple owner systems.";
    reasons.push(reason);
    trace.push(riskTrace("high", "multiple_owner_systems", reason, paths, ownerSystems));
  }

  if (paths.some((path) => /(^|\/)(security|auth|runtime|kernel|src\/index)/i.test(path))) {
    const reason = "Requested paths include protected or high-leverage areas.";
    reasons.push(reason);
    trace.push(riskTrace("high", "protected_path", reason, paths, ownerSystems));
  }

  if (hasHighOrCriticalFinding) {
    const reason = "Relevant high or critical findings are already attached to the requested paths.";
    reasons.push(reason);
    trace.push(riskTrace("high", "high_or_critical_finding", reason, paths, ownerSystems));
  }

  if (reasons.length === 0 && unresolvedOwnership) {
    const reason = "No owner system could be resolved for at least one requested path.";
    reasons.push(reason);
    trace.push(riskTrace("medium", "unresolved_ownership", reason, paths, ownerSystems));
  }

  if (reasons.length === 0 && relevantFindings.length > 0) {
    const reason = "Relevant findings are already attached to the requested paths.";
    reasons.push(reason);
    trace.push(riskTrace("medium", "relevant_findings", reason, paths, ownerSystems));
  }

  if (reasons.length === 0 && paths.length > 1) {
    const reason = "Multiple paths were requested.";
    reasons.push(reason);
    trace.push(riskTrace("medium", "multiple_paths", reason, paths, ownerSystems));
  }

  if (reasons.length === 0) {
    trace.push(riskTrace("low", "single_owner_no_findings", "Risk set to low because ownership is resolved, scope is narrow, and no relevant findings are attached.", paths, ownerSystems));
  }

  const tier = trace.some((entry) => entry.details?.tier === "high")
    ? "high"
    : trace.some((entry) => entry.details?.tier === "medium")
      ? "medium"
      : "low";

  return {
    risk: {
      tier,
      reasons,
    },
    trace,
  };
}

function riskTrace(
  tier: "low" | "medium" | "high",
  rule: string,
  message: string,
  paths: string[],
  ownerSystems: string[],
): ResolutionTraceEntry {
  return {
    step: "risk.evaluate",
    sourceType: "RiskRule",
    status: "used",
    message: tier === "low" ? message : `Risk set to ${tier} because ${message.charAt(0).toLowerCase()}${message.slice(1)}`,
    paths,
    systems: ownerSystems,
    details: {
      rule,
      tier,
    },
  };
}

function isHighOrCriticalFinding(finding: unknown): boolean {
  if (!finding || typeof finding !== "object") {
    return false;
  }

  const severity = (finding as { severity?: unknown }).severity;

  return severity === "high" || severity === "critical";
}

function buildRecommendedContext(paths: string[], ownerSystems: string[]): string[] {
  return [
    ...paths.map((path) => `Source path: ${path}`),
    ...ownerSystems.map((system) => `Owner system: ${system}`),
  ];
}

function buildWarnings(paths: string[], ownerSystems: string[]): string[] {
  const warnings: string[] = [];

  if (paths.length > 1) {
    warnings.push("Multiple paths were requested; keep the change boundary explicit.");
  }

  return warnings;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function pickVerificationSourceType(
  verification: VerificationEvidenceSummary,
): ResolutionTraceEntry["sourceType"] {
  if (verification.verificationResultRef) {
    return "VerificationResult";
  }

  if (verification.verificationPlanRef) {
    return "VerificationPlan";
  }

  if (verification.workOrderRef) {
    return "WorkOrder";
  }

  return "Fallback";
}

function verificationTraceMessage(verification: VerificationEvidenceSummary): string {
  switch (verification.status) {
    case "passed":
      return "VerificationResult linked to remediation work is `passed`.";
    case "failed":
      return "VerificationResult linked to remediation work is `failed`.";
    case "partial":
      return "VerificationResult linked to remediation work is `partial`.";
    case "not-run":
      return "Remediation work has a VerificationPlan but no VerificationResult has been recorded.";
    case "missing":
      return "No remediation WorkOrder or VerificationPlan references this finding.";
  }
}
