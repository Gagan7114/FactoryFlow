# QC Status Fixes

Date: 2026-06-13

Branch: `feature/qc-status-fixes`

This document records the QC status fixes implemented after the QC status audit.

## What Was Fixed

### Backend: Explicit QC Hold Gate Status

Added a new gate entry status:

- `QC_HOLD`: used when one or more QC items have final status `HOLD` and no item has a rejected final status.

Before this change, a QAM-approved hold item could make the overall gate entry status appear as `QC_AWAITING_QAM`, even though QAM had already made a hold decision. That was misleading for gate users.

Updated backend behavior:

- Accepted and rejected items still count as final for gate completion.
- Hold items do not allow gate completion.
- Any rejected item still takes priority and shows the entry as `QC_REJECTED`.
- Hold without rejection now shows `QC_HOLD`.
- Rejected and hold states stay visible even when another item has not started QC yet.

Backend files changed:

- `gate_core/enums.py`
- `gate_core/services/status_guard.py`
- `quality_control/services/rules.py`
- `raw_material_gatein/services/gate_completion.py`
- `driver_management/migrations/0012_add_qc_hold_status.py`
- `grpo/tests.py`
- `quality_control/tests.py`

### Frontend: Complete Raw Material Gate Status Coverage

Added missing raw material gate statuses to shared frontend constants and dashboard status cards:

- `SECURITY_CHECK_DONE`
- `ARRIVAL_SLIP_SUBMITTED`
- `ARRIVAL_SLIP_REJECTED`
- `QC_PENDING`
- `QC_IN_REVIEW`
- `QC_AWAITING_QAM`
- `QC_REJECTED`
- `QC_HOLD`

This prevents current backend statuses from falling into grey default badges or disappearing from the raw material dashboard status overview.

The status badge normalizer was also tightened so labels such as `On Hold`, `QC On Hold`, and strings with extra slash/space separators still map to the correct orange hold styling instead of falling back to grey.

Frontend files changed:

- `src/config/constants/status.constants.ts`
- `src/config/__tests__/constants/status.constants.test.ts`
- `src/modules/gate/pages/shared/dashboardStatusConfig.ts`
- `src/modules/gate/utils/gateStatusClasses.ts`
- `src/modules/gate/__tests__/utils/gateStatusClasses.test.ts`
- `src/modules/gate/__tests__/pages/shared/dashboardStatusConfig.test.ts`

### Frontend: Gate Review Completion Guard

Updated the raw material final review page to use the backend `qc_summary.can_complete` flag.

Before this change, the page could show "Ready to complete entry" after security submission even when QC was still pending or on hold. The backend still blocked completion, but the UI message was confusing.

Updated UI behavior:

- If security is submitted and QC is complete, the page shows the entry is ready to complete.
- If security is submitted but QC is pending or on hold, the page shows the QC blockers.
- The Complete Entry button is disabled until `qc_summary.can_complete` is true.

Frontend files changed:

- `src/modules/gate/api/gateEntryFullView/gateEntryFullView.api.ts`
- `src/modules/gate/pages/rawMaterialPages/ReviewPage.tsx`
- `src/modules/gate/__tests__/api/gateEntryFullView/gateEntryFullView.api.test.ts`
- `src/modules/gate/__tests__/pages/rawmaterialpages/ReviewPage.test.tsx`

### Frontend: QC Workflow Type Alignment

Added backend workflow status `COMPLETED` to frontend QC workflow types and display configuration.

Frontend files changed:

- `src/modules/qc/types/qc.types.ts`
- `src/modules/qc/constants/qc.constants.ts`
- `src/modules/qc/__tests__/types/qc.types.test.ts`
- `src/modules/qc/__tests__/constants/qc.constants.test.ts`

## Tested Status Matrix

Backend status-rule tests now cover:

- No PO items: keeps current entry status.
- PO item without arrival slip: `QC_PENDING`.
- Submitted arrival slip without inspection: `QC_PENDING`.
- Draft inspection: `QC_PENDING`.
- Submitted inspection: `QC_IN_REVIEW`.
- Chemist-approved inspection: `QC_AWAITING_QAM`.
- All accepted items: `QC_COMPLETED`.
- All rejected items: `QC_COMPLETED`, with final item outcome kept separate.
- Mixed accepted and rejected terminal items: `QC_COMPLETED`.
- Rejected item with another non-terminal inspection: `QC_REJECTED`.
- Rejected item with another missing slip: `QC_REJECTED`.
- Hold item: `QC_HOLD`.
- Hold item with accepted item: `QC_HOLD`.
- Hold item with another missing slip: `QC_HOLD`.
- Rejected item with hold item: `QC_REJECTED`.

## Verification

Frontend:

- `npm run build`
- `npx vitest run src\config\__tests__\constants\status.constants.test.ts src\modules\qc\__tests__\types\qc.types.test.ts src\modules\qc\__tests__\constants\qc.constants.test.ts src\modules\gate\__tests__\utils\gateStatusClasses.test.ts src\modules\gate\__tests__\pages\shared\dashboardStatusConfig.test.ts src\modules\gate\__tests__\pages\rawmaterialpages\ReviewPage.test.tsx src\modules\gate\__tests__\api\gateEntryFullView\gateEntryFullView.api.test.ts src\modules\gate\__tests__\pages\RawMaterialsPage.test.tsx src\modules\gate\__tests__\pages\shared\SharedDashboard.test.tsx`
- `prettier --check` on all touched frontend files

Backend:

- `python manage.py makemigrations --check --dry-run`
- `python manage.py test quality_control.tests --keepdb`
- `python manage.py test quality_control.tests.RawMaterialQCEntryStatusRuleTests grpo.tests.GRPOServiceTests.test_qam_approved_hold_does_not_complete_qc grpo.tests.GRPOServiceTests.test_pending_grpo_entries_exclude_qam_approved_hold_qc grpo.tests.GRPOServiceTests.test_pending_grpo_entries_allow_final_accepted_qc vehicle_management.tests.VehicleEntryDashboardQCTests --keepdb`
- `python manage.py test grpo.tests.GRPOServiceTests.test_qam_approved_hold_does_not_complete_qc grpo.tests.GRPOServiceTests.test_pending_grpo_entries_exclude_qam_approved_hold_qc grpo.tests.GRPOServiceTests.test_pending_grpo_entries_allow_final_accepted_qc --keepdb`
- `python manage.py test vehicle_management.tests.VehicleEntryDashboardQCTests --keepdb`

All verification commands passed.

Note: frontend build still prints existing Rollup circular chunk warnings for shared re-exports. These warnings were already unrelated to the QC status changes and did not fail the build.
