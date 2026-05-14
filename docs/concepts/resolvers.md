# Resolvers

Resolvers consume an `IntelligenceSnapshot` and related typed artifacts to
produce resolved outputs for users and agents.

`@rekon/capability-resolver` registers four resolver handlers:

- `resolve.route` — given a goal and paths, decide who owns the touched
  code and whether the change is a single-owner walk to preflight or a
  cross-owner walk that needs a seam first.
- `resolve.seam` — given paths that span owners, designate the primary
  owner, record secondary owners, and escalate when a primary owner cannot
  be chosen.
- `resolve.preflight` — the original resolver. Resolves ownership,
  attaches findings and memory, evaluates simple risk, and writes a
  `ResolverPacket`.
- `resolve.issue` — given an issue id or fragment, find the matching
  `Finding`, resolve ownership for the finding's files, and recommend the
  next resolver based on owner spread.

Every resolver packet must be explainable. Each one includes a
`resolutionTrace` showing which artifact sources were checked, which source
won, why fallback happened, and which decision selected the next resolver.

## Resolver Phase Flow

The resolvers compose into a phased flow:

```
                resolve.route
                  /        \
   single-owner /            \ cross-owner
              ↓                ↓
       resolve.preflight    resolve.seam
                                ↓
                         resolve.preflight
```

For findings-driven entry:

```
   resolve.issue
       ↓
   (matched finding)
       ↓
   one owner  → resolve.preflight
   many owners → resolve.seam → resolve.preflight
   no files   → resolve.route
```

Each packet records `nextRequiredResolver` so an agent or operator can
walk the flow without guessing.

## CLI Surface

Friendly shortcuts:

```sh
rekon resolve route --path <path> [--path <path>] [--goal <goal>] [--concern <concern>] --root <repo> --json
rekon resolve seam --path <path> [--path <path>] [--primary-owner <owner>] [--goal <goal>] --root <repo> --json
rekon resolve preflight --path <path> --goal <goal> --root <repo> --json
rekon resolve issue --issue <id-or-fragment> --root <repo> --json
```

Generic dispatch (works for every registered resolver):

```sh
rekon resolve list --root <repo> --json
rekon resolve run <resolver-id> --root <repo> --input-json '<json>' --json
```

`resolve list` reports `resolve.route`, `resolve.seam`,
`resolve.preflight`, and `resolve.issue` as registered handlers under
`@rekon/capability-resolver`.

`resolve.issue` automatically reads the latest
[FindingStatusLedger](../artifacts/finding-status-ledger.md) and
annotates the matched issue with `status`, `statusSource`,
`statusNote`, and `statusReason`. When the matched finding is
`accepted`, `ignored`, or `resolved`, the resolver also adds a warning
so an agent or operator can decide whether action is still required.
See [finding-lifecycle.md](finding-lifecycle.md).

`resolve.issue` also looks up associated verification evidence by
matching the finding id against the `remediationItems` of the latest
`WorkOrder` (where `source === "coherency-delta"`), then chaining
through the paired `VerificationPlan` to the latest
`VerificationResult`. The resolved packet exposes
`verification: VerificationEvidenceSummary` with one of five statuses
— `passed`, `failed`, `partial`, `not-run`, or `missing` — plus
references to the underlying `WorkOrder`, `VerificationPlan`, and
`VerificationResult` artifacts. Each status emits a corresponding
`warnings[]` entry (except `passed`, which is informational), and a
new `issue.verification` `resolutionTrace` step records the source
type and status. Passing verification **never** auto-resolves the
finding or mutates the `FindingStatusLedger`; it only changes the
recommended next step. See
[../concepts/verification-results.md](verification-results.md) and
[../artifacts/verification-result.md](../artifacts/verification-result.md).

Ownership source precedence is deterministic:

`OwnershipMap -> ObservedRepo -> ownership GraphSlice -> EvidenceGraph`

1. `OwnershipMap`
2. `ObservedRepo`
3. ownership `GraphSlice`
4. raw `EvidenceGraph` `ownership_hint` fallback

Using raw evidence as fallback is allowed. Using it silently is not.

## Trace Entry Shape

`resolutionTrace` entries include:

- `step`
- `sourceType`
- `sourceRef`
- `status`
- `message`
- `paths`
- `systems`
- `confidence`
- `details`

Example:

```json
{
  "step": "ownership.resolve",
  "sourceType": "OwnershipMap",
  "status": "used",
  "message": "Resolved owner system from OwnershipMap.",
  "paths": ["src/index.ts"],
  "systems": ["src"],
  "confidence": 0.9
}
```

## Fallback

Fallback means a preferred source was unavailable or did not match the requested
path, so the resolver checked the next source in the precedence chain. Fallback
is acceptable when it is explicit in the packet. It is not acceptable for a
resolver to silently use lower-confidence data.

## Risk Trace

Risk rules are recorded with `step: "risk.evaluate"` and
`sourceType: "RiskRule"`. Current rules are intentionally small:

- high: multiple owner systems
- high: protected or high-leverage path
- high: relevant high or critical finding
- medium: unresolved ownership
- medium: relevant findings
- medium: multiple paths
- low: single owner, narrow scope, no relevant findings

## Building A Resolver That Explains Itself

A resolver should:

- read from `IntelligenceSnapshot`
- prefer model artifacts over raw evidence
- record every checked source
- record skipped and fallback decisions
- include confidence when a source provides it
- attach input refs to the packet header
- avoid hiding missing data behind confident prose
