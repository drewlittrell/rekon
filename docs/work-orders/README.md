# Work orders

Work orders are issued here, committed before execution. Amendments to an
in-flight work order land as commits to its file; an executing agent's
first act is confirming it runs the committed version at tip. This
directory exists because WO-4 executed faithfully against a document that
had been amended in conversation but never reached the executor; repo-first
issuance makes that drift mode impossible by construction.

Work orders are living documents while in flight (enrolled in doc
freshness once WO-7 ships) and become snapshots on completion: stamp the
snapshot banner in the completing commit, with the completion summary
reference.

Authority: `docs/strategy/rekon-system-model.md` and the AGENTS.md
documentation-authority section govern. Issued by the planning session;
ratified by the operator; executed under the required checks in AGENTS.md.

Step 0, all detector and capability slices: before design, audit what
already exists for this goal from tier-1 sources (source code, CLI output,
artifact schemas; never prose). Report the inventory in the decision memo.
If substantial substrate exists, the slice reshapes as composition or
extension, and the completion summary states what was found versus what
was built. This step exists because the substrate inventory in any pinned
document is accurate only as of its commit, and slices have repeatedly
landed capability that later orders nearly redesigned.

## The overruled-entry convention (WO-18 Part 4)

A calibration order's dispatch also ratifies overruled entries for the
classic keeps its rulings directly contradict; the executor enumerates
them in the same slice, per-finding, with covering-ruling notes. The
WO-12 guards hold unchanged: only operator rulings overrule, entries are
per-finding never per-rule, honest losses never qualify, and every
rulingRef must resolve. This removes the one-cycle lag the
"next overruled-candidate batch" queue item used to carry.
