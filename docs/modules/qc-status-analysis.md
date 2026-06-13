# QC Status Deep Analysis

Date: 2026-06-13

This document audits the current raw material QC status flow across backend and frontend. It focuses on the statuses used by the gate dashboard, QC dashboard, inspection detail page, raw material full view, and GRPO-ready flow.

## Executive Summary

The system is mostly correct, but it uses two different status concepts that must stay separate:

- Gate entry progress: `GateEntryStatus`, for example `QC_PENDING`, `QC_IN_REVIEW`, `QC_REJECTED`, `QC_COMPLETED`, `COMPLETED`.
- QC item outcome: `InspectionStatus`, for example `PENDING`, `ACCEPTED`, `REJECTED`, `HOLD`.

The recent gate dashboard change is conceptually correct: a raw material entry can be `QC_COMPLETED` while still containing rejected items, so the dashboard must show the item-level final outcome separately through `qc_final_status`.

Important remaining gaps:

- Overall gate status for `HOLD` items becomes `QC_AWAITING_QAM`, which is misleading after QAM has already made a hold decision.
- Some frontend status constants and dashboard cards do not include all backend gate statuses.
- Badge colors for several raw material gate statuses fall back to grey because `getGateStatusClasses` does not map them.
- Some frontend screens rely on `final_status` while the backend also exposes `effective_final_status`; this is mostly safe today because accepted override updates `final_status`, but the distinction should be documented and used intentionally.

## Backend Status Taxonomy

### Arrival Slip Status

Source: `factory_app/quality_control/enums.py`

- `DRAFT`: slip exists but has not been submitted to QA.
- `SUBMITTED`: gate/store has submitted the slip to QA.
- `REJECTED`: QA sent the slip/inspection back.

### Inspection Workflow Status

Source: `factory_app/quality_control/enums.py`

- `DRAFT`: inspection exists but has not been submitted.
- `SUBMITTED`: waiting for QA Chemist approval.
- `QA_CHEMIST_APPROVED`: waiting for QA Manager approval.
- `QAM_APPROVED`: QA Manager has made a final decision.
- `REJECTED`: inspection was rejected before final QAM approval.
- `COMPLETED`: defined in backend enum, but no current audited flow sets it.

### Inspection Final Status

Source: `factory_app/quality_control/enums.py`

- `PENDING`: no final decision.
- `ACCEPTED`: item passed QC.
- `REJECTED`: item failed QC.
- `HOLD`: item is on hold.

### Gate Entry Status

Source: `factory_app/gate_core/enums.py`

- `ARRIVAL_SLIP_SUBMITTED`, `ARRIVAL_SLIP_REJECTED`: arrival slip phase.
- `QC_PENDING`, `QC_IN_REVIEW`, `QC_AWAITING_QAM`, `QC_REJECTED`: QC progress phase.
- `QC_COMPLETED`: all PO items have terminal QC outcomes.
- `COMPLETED`: final gate entry completion.

`QC_COMPLETED` means QC process complete. It does not mean every item was accepted.

## Backend Flow Audit

### Arrival Slip Submission

Source: `factory_app/quality_control/views.py`

When an arrival slip is submitted:

- Slip status becomes `SUBMITTED`.
- Entry status moves from `IN_PROGRESS` or `ARRIVAL_SLIP_REJECTED` to `ARRIVAL_SLIP_SUBMITTED`.

This is correct for the transition from gate/store into QA.

### Inspection Creation and Draft

Source: `factory_app/quality_control/views.py`

When an inspection is created for a submitted arrival slip:

- Inspection starts as `workflow_status=DRAFT`.
- Inspection starts as `final_status=PENDING`.
- `update_entry_status(entry)` recalculates the gate entry status.

This is correct. For entries where not every item has a completed inspection, `compute_entry_status` keeps the gate entry in a QC progress state.

### Chemist and QAM Approval

Source: `factory_app/quality_control/models/raw_material_inspection.py`

Chemist approval:

- Moves `SUBMITTED` to `QA_CHEMIST_APPROVED`.

QAM approval:

- Moves `QA_CHEMIST_APPROVED` to `QAM_APPROVED`.
- Sets `final_status` to `ACCEPTED`, `REJECTED`, or `HOLD`.
- Locks the inspection.

This is structurally correct.

### Inspection Rejection

Source: `factory_app/quality_control/models/raw_material_inspection.py`

Rejecting an inspection:

- Sets `final_status=REJECTED`.
- Sets `workflow_status=REJECTED`.
- Locks the inspection.
- Marks the arrival slip as `REJECTED`.
- Recomputes the entry status.

This is correct for a rejected QC item.

### Factory Head Decision

Source: `factory_app/quality_control/models/raw_material_inspection.py`

For a rejected inspection:

- `ACCEPT_QC_OVERRIDE` updates `final_status=ACCEPTED`, sets `workflow_status=QAM_APPROVED`, and reopens the arrival slip status as `SUBMITTED`.
- Other decisions stay stored as factory head metadata while `final_status` remains `REJECTED`.

The model also exposes `effective_final_status`, where accepted override returns `ACCEPTED`.

This is mostly correct. Because accepted override also mutates `final_status`, most current list and gate status summaries work even if they do not explicitly use `effective_final_status`.

## Gate Entry Status Rules

Source: `factory_app/quality_control/services/rules.py`

`compute_entry_status` works as follows:

- Any missing arrival slip or inspection returns `QC_PENDING`.
- If every item has `final_status` in `{ACCEPTED, REJECTED}`, entry becomes `QC_COMPLETED`.
- If any item is rejected and some items are not done, entry becomes `QC_REJECTED`.
- Otherwise, the highest workflow stage determines `QC_IN_REVIEW` or `QC_AWAITING_QAM`.

Correct behavior:

- Mixed accepted and rejected terminal items become `QC_COMPLETED`.
- The separate final outcome summary is needed to explain whether `QC_COMPLETED` contains a rejection.

Gap:

- `HOLD` is not terminal for gate completion. A QAM-approved hold item makes the entry look like `QC_AWAITING_QAM`, even though QAM has already acted. The system has no `QC_HOLD` gate status. This should be fixed before expanding hold workflows.

## Gate Completion Rules

Source: `factory_app/raw_material_gatein/services/gate_completion.py`

Completion requires:

- Security check exists and is submitted.
- At least one PO item exists.
- Every PO item has an arrival slip and inspection.
- Every inspection has `final_status` `ACCEPTED` or `REJECTED`.

This is logically consistent with the current business meaning of `QC_COMPLETED`, but it means rejected material can still allow the gate entry to be completed. If the business wants vendor return before closing the original inward gate entry, that rule is not enforced today.

## Backend API Outputs

### Vehicle Entry List

Source: `factory_app/vehicle_management/serializers.py`

Raw material entries include `qc_final_status`.

Rules:

- Any rejected item returns `code=REJECTED`, `display=QC Rejected`.
- All accepted items return `code=ACCEPTED`, `display=QC Approved`.
- Any hold item without rejection returns `code=HOLD`, `display=QC On Hold`.
- Partial accepted items return `QC Approved x/y`.
- All pending/no inspections return `null`.

This is correct for the gate dashboard use case.

Note:

- The summary uses `final_status`. Accepted override is safe because backend changes `final_status` to `ACCEPTED`.
- The summary does not expose factory head decision metadata. That is acceptable for dashboard labels but not enough for full audit history.

### Raw Material Full View

Source: `factory_app/gate_core/views.py`

Each PO item has a `qc_status` based on arrival slip and inspection state:

- Missing slip: `NO_SLIP`
- Submitted slip without inspection: `AWAITING_INSPECTION`
- Draft inspection: `INSPECTION_DRAFT`
- Submitted inspection: `AWAITING_CHEMIST`
- Chemist-approved inspection: `AWAITING_QAM`
- QAM-approved accepted/rejected/hold: `ACCEPTED`, `REJECTED`, `HOLD`

This is useful and mostly correct.

Gap:

- The response type in `FactoryFlow/src/modules/gate/api/gateEntryFullView/gateEntryFullView.api.ts` only models `qc_status` but not the nested `inspection` data that the backend also sends. If frontend later needs detailed audit status, the type should be expanded.

### QC List APIs

Source: `factory_app/quality_control/views.py`

List endpoints are consistent:

- `pending`: no inspection.
- `draft`: inspection draft.
- `actionable`: no inspection, draft, submitted, or chemist-approved.
- `approved`: QAM-approved and frontend passes `final_status=ACCEPTED`.
- `rejected`: `final_status=REJECTED`.
- `counts`: counts not started, draft, awaiting chemist, awaiting QAM, accepted completed, rejected, hold.

Gap:

- Backend `InspectionCompletedAPI` can include hold/rejected records if called without `final_status`. The current frontend approved tab passes `final_status=ACCEPTED`, so the user-facing approved tab is correct.

## Frontend Audit

### Gate Dashboard and Raw Materials List

Sources:

- `FactoryFlow/src/modules/gate/pages/RawMaterialsPage.tsx`
- `FactoryFlow/src/modules/gate/pages/shared/SharedDashboard.tsx`
- `FactoryFlow/src/modules/gate/api/vehicle/vehicleEntry.api.ts`

Current behavior:

- Shows the gate entry progress status badge, for example `QC_COMPLETED`.
- Shows a second badge from `entry.qc_final_status`, for example `QC Rejected` or `QC Approved`.
- Search includes `qc_final_status.display`.

This is correct and addresses the main user-facing confusion.

### QC Pending/All/Approved/Rejected Pages

Source: `FactoryFlow/src/modules/qc/pages/PendingInspectionsPage.tsx`

Current behavior:

- Displays workflow status labels from `WORKFLOW_STATUS_CONFIG`.
- Shows `Accepted Override` when backend or locally stored factory head decision is `ACCEPT_QC_OVERRIDE`.
- The approved tab uses the completed endpoint with `final_status=ACCEPTED`.

Mostly correct.

Risk:

- It reads localStorage factory head decisions when backend data does not have one. This can show stale `Accepted Override` if local storage is out of sync.

### Inspection Detail Page

Source: `FactoryFlow/src/modules/qc/pages/InspectionDetailPage.tsx`

Current behavior:

- Shows workflow badge and final status badge.
- Replaces them with `Accepted Override` when factory head accepted override exists.
- Shows factory head decision controls only for rejected inspections and Factory Head role.

Mostly correct.

Risk:

- `WORKFLOW_STATUS_CONFIG[inspection.workflow_status]` assumes every backend workflow value exists in the frontend config. Backend defines `COMPLETED`, but frontend type/config does not. This is safe only because audited flows do not currently set `COMPLETED`.

### Gate Review Page

Source: `FactoryFlow/src/modules/gate/pages/rawMaterialPages/ReviewPage.tsx`

Current behavior:

- Shows item-level `qc_status.display` from the full-view API.
- The complete button relies on backend validation.

Risk:

- The UI says "Security check submitted. Ready to complete entry." based only on security status. It does not use `qc_summary.can_complete`, so users can still see a ready message while QC is incomplete and then receive a backend error.

### Status Color and Dashboard Config

Sources:

- `FactoryFlow/src/modules/gate/utils/gateStatusClasses.ts`
- `FactoryFlow/src/modules/gate/pages/shared/dashboardStatusConfig.ts`
- `FactoryFlow/src/config/constants/status.constants.ts`

Gaps:

- `getGateStatusClasses` maps `QC_COMPLETED` and `QC_REJECTED`, but not `ARRIVAL_SLIP_SUBMITTED`, `ARRIVAL_SLIP_REJECTED`, `QC_PENDING`, `QC_IN_REVIEW`, or `QC_AWAITING_QAM`.
- Raw material status overview cards include only `draft`, `in_progress`, `qc_completed`, `completed`, `cancelled`, and `rejected`.
- Backend can return more raw material statuses than the dashboard overview counts.
- `ENTRY_STATUS` does not include the full backend `GateEntryStatus` set.

These are display/reporting gaps, not backend data-integrity gaps.

## Correctness Verdict

Correct:

- Item-level final status is stored in `RawMaterialInspection.final_status`.
- Gate-level progress is stored in `VehicleEntry.status`.
- `QC_COMPLETED` is correctly used as "all QC decisions complete", not "all accepted".
- `qc_final_status` correctly gives the user accepted/rejected/hold context on gate dashboards.
- Factory Head accepted override currently becomes operationally accepted because backend changes `final_status` to `ACCEPTED`.
- QC approved tab currently shows accepted items because frontend passes `final_status=ACCEPTED`.

Needs improvement:

- Add a clear overall status for held material, or map QAM-approved hold to a less misleading gate status.
- Add all backend raw material gate statuses to frontend constants, badges, and status overview cards.
- Use `qc_summary.can_complete` in raw material review UI before showing "ready to complete".
- Decide whether rejected QC material may close the original inward gate entry before vendor return.
- Add focused tests for `compute_entry_status`, especially mixed accepted/rejected, hold, partial progress, and accepted override.

## Recommended Fix Plan

1. Backend status tests

Add tests for `quality_control.services.rules.compute_entry_status`:

- No PO items keeps current status.
- Missing slip returns `QC_PENDING`.
- Draft inspection returns `QC_PENDING`.
- Submitted inspection returns `QC_IN_REVIEW`.
- Chemist-approved inspection returns `QC_AWAITING_QAM`.
- One rejected plus unfinished item returns `QC_REJECTED`.
- All accepted returns `QC_COMPLETED`.
- Accepted plus rejected returns `QC_COMPLETED`.
- Hold after QAM approval documents the current behavior, then update once a desired status is chosen.

2. Frontend raw material status mappings

Add mappings for:

- `ARRIVAL_SLIP_SUBMITTED`
- `ARRIVAL_SLIP_REJECTED`
- `QC_PENDING`
- `QC_IN_REVIEW`
- `QC_AWAITING_QAM`
- `QC_REJECTED`
- `QC_COMPLETED`

Update:

- `ENTRY_STATUS`
- `ENTRY_STATUS_COLORS`
- `gateStatusClasses`
- `RAW_MATERIAL_STATUS_CONFIG`
- related file-content tests

3. Review page completion messaging

Use `gateEntry.qc_summary.can_complete` in the frontend type and UI:

- Show "QC incomplete" when security is complete but QC is not.
- Disable or explain the complete action until backend rules can pass.
- Keep backend validation as the final guard.

4. Hold semantics decision

Choose one:

- Add backend `GateEntryStatus.QC_HOLD`.
- Treat hold as `QC_REJECTED` until resolved.
- Treat hold as not complete but display "QC On Hold" at entry level.

The current `QC_AWAITING_QAM` label for a QAM-approved hold is confusing.

5. Effective final status consistency

Keep accepted override behavior as-is or explicitly switch summaries to `effective_final_status`.

If switching:

- Update `VehicleEntrySerializer._get_qc_final_status`.
- Update `can_complete_gate` if business wants effective status.
- Update full-view item status.
- Add tests for factory head accepted override.

## Files Reviewed

Backend:

- `factory_app/quality_control/enums.py`
- `factory_app/gate_core/enums.py`
- `factory_app/quality_control/models/raw_material_inspection.py`
- `factory_app/quality_control/views.py`
- `factory_app/quality_control/services/rules.py`
- `factory_app/raw_material_gatein/services/gate_completion.py`
- `factory_app/vehicle_management/serializers.py`
- `factory_app/gate_core/views.py`
- `factory_app/vehicle_management/tests.py`
- `factory_app/quality_control/tests.py`

Frontend:

- `FactoryFlow/src/modules/gate/api/vehicle/vehicleEntry.api.ts`
- `FactoryFlow/src/modules/gate/pages/RawMaterialsPage.tsx`
- `FactoryFlow/src/modules/gate/pages/shared/SharedDashboard.tsx`
- `FactoryFlow/src/modules/gate/pages/rawMaterialPages/ReviewPage.tsx`
- `FactoryFlow/src/modules/gate/api/gateEntryFullView/gateEntryFullView.api.ts`
- `FactoryFlow/src/modules/gate/utils/gateStatusClasses.ts`
- `FactoryFlow/src/modules/gate/pages/shared/dashboardStatusConfig.ts`
- `FactoryFlow/src/config/constants/status.constants.ts`
- `FactoryFlow/src/modules/qc/types/qc.types.ts`
- `FactoryFlow/src/modules/qc/constants/qc.constants.ts`
- `FactoryFlow/src/modules/qc/pages/PendingInspectionsPage.tsx`
- `FactoryFlow/src/modules/qc/pages/InspectionDetailPage.tsx`
- `FactoryFlow/src/modules/qc/api/inspection/inspection.api.ts`
- `FactoryFlow/src/modules/qc/api/inspection/inspection.queries.ts`
- `FactoryFlow/src/modules/qc/utils/factoryHeadDecision.ts`
