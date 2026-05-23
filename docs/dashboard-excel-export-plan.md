# Dashboard Excel Export Plan

Updated: 2026-05-23

## Goal

Add a consistent downloadable Excel feature to every dashboard. Exports should use the dashboard's current filters so the file matches what the user is reviewing, including date range, search, status cards, company, branch, and other page-specific filters.

## Completion Rules

- A phase is marked done only after the related code is merged into the frontend and build/test verification has passed.
- Dashboard exports should prefer all filtered rows, not only visible rows, wherever the API supports that.
- Exports should use shared helpers instead of page-specific Excel or CSV code.
- Large datasets may need backend export support before they can be marked complete.

## Phases

### [x] Phase 1 - Shared Excel Export Foundation

Status: Done

Scope:

- Add reusable Excel worksheet/workbook/download helpers.
- Support column definitions, value formatters, multiple sheets, metadata sheets, safe filenames, safe sheet names, and column auto-sizing.
- Export the helper from `src/shared/utils`.
- Add focused tests for worksheet creation, sanitization, and workbook metadata.

Files:

- `src/shared/utils/excelExport.ts`
- `src/shared/utils/index.ts`
- `src/shared/__tests__/utils/excelExport.test.ts`

Verification:

- `npx vitest run src/shared/__tests__/utils/excelExport.test.ts`
- `npm run build`

### [x] Phase 2 - Shared Dashboard Export Button

Status: Done

Scope:

- Add a reusable dashboard Excel button component.
- Support loading, disabled, compact/mobile layout, and consistent icon usage.
- Place the component near existing dashboard actions without changing page behavior.

Files:

- `src/shared/components/dashboard/ExcelExportButton.tsx`
- `src/shared/components/dashboard/index.ts`
- `src/shared/__tests__/components/dashboard/ExcelExportButton.test.tsx`

Verification:

- `npx vitest run src/shared/__tests__/components/dashboard/ExcelExportButton.test.tsx src/shared/__tests__/components/dashboard/index.test.ts src/shared/__tests__/exports.test.ts`
- `npm run build`

### [x] Phase 3 - Structured Analytics Dashboards

Status: Done

Scope:

- Add Excel exports to the analytics dashboards under `src/modules/dashboards/*`.
- Export current filtered data and summary metadata where applicable.

Target dashboards:

- Dispatch Plans
- Stock Level
- Inventory Age
- Non Moving
- Production Movement
- SAP Plan

Files:

- `src/modules/dashboards/utils/dashboardExcelExport.ts`
- `src/modules/dashboards/dispatch-plans/utils/exportDispatchPlans.ts`
- `src/modules/dashboards/stock-level/utils/exportStockLevel.ts`
- `src/modules/dashboards/inventory-age/utils/exportInventoryAge.ts`
- `src/modules/dashboards/non-moving/utils/exportNonMoving.ts`
- `src/modules/dashboards/production-movement/utils/exportProductionMovement.ts`
- `src/modules/dashboards/sap-plan/utils/exportSAPPlan.ts`
- `src/modules/dashboards/dispatch-plans/pages/DispatchPlansDashboardPage.tsx`
- `src/modules/dashboards/stock-level/pages/StockLevelDashboardPage.tsx`
- `src/modules/dashboards/inventory-age/pages/InventoryAgeDashboardPage.tsx`
- `src/modules/dashboards/non-moving/pages/NonMovingDashboardPage.tsx`
- `src/modules/dashboards/production-movement/pages/ProductionMovementDashboardPage.tsx`
- `src/modules/dashboards/sap-plan/pages/SAPPlanDashboardPage.tsx`

Verification:

- `npx eslint` on the Phase 3 dashboard pages and export utilities
- `npm run build`

Notes:

- Dispatch Plans and Stock Level perform a fresh all-filtered export fetch where the API supports page sizing.
- Inventory Age, Non Moving, Production Movement, and SAP Plan export the currently loaded filtered result set plus summary metadata.

### [x] Phase 4 - Gate, Dispatch, Docking, And GRPO Dashboards

Status: Done

Scope:

- Add Excel exports to operational dashboards with current date/status/search filters.
- Include status summaries as a separate sheet where the dashboard has KPI cards.
- Ensure docking exports respect the pending/printed/dispatched filter cards.

Target areas:

- Gate Management
- Sales Dispatch / Docking
- Customer Returns
- GRPO
- Service GRPO

Files:

- `src/shared/utils/dashboardExcelExport.ts`
- `src/modules/dashboards/utils/dashboardExcelExport.ts`
- `src/modules/gate/utils/exportGateDashboard.ts`
- `src/modules/gate/utils/index.ts`
- `src/modules/gate/pages/GateDashboardPage.tsx`
- `src/modules/gate/pages/customerSalesFlow/exportCustomerFlowDashboards.ts`
- `src/modules/gate/pages/customerSalesFlow/SalesDispatchDashboardPage.tsx`
- `src/modules/gate/pages/customerSalesFlow/CustomerReturnDashboardPage.tsx`
- `src/modules/grpo/utils/exportGRPODashboards.ts`
- `src/modules/grpo/pages/GRPODashboardPage.tsx`
- `src/modules/grpo/pages/ServiceGRPODashboardPage.tsx`

Verification:

- `npx eslint` on the Phase 4 dashboard pages and export utilities
- `npm run build`

Notes:

- Gate Management exports the currently visible entry types, active date range, search term, and status summaries.
- Sales Dispatch and Customer Returns export the current date/search-filtered table rows with entry, item, and status summary sheets.
- Material GRPO and Service GRPO export pending rows, posting history, posting line details, and status summaries.

### [ ] Phase 5 - Warehouse And Existing CSV Export Migration

Scope:

- Replace existing CSV exports with shared Excel exports.
- Preserve current columns while adding metadata sheets and safer filenames.

Target pages:

- Transfer Activity
- Stock Tracker
- Sales Order Backlog
- Billing Tracker
- Batch Expiry
- WMS dashboards

### [ ] Phase 6 - Remaining Module Dashboards

Scope:

- Add exports to remaining module dashboards after the shared pattern is proven.

Target areas:

- QC
- Production
- Barcode
- Vehicle Management
- Finance

### [ ] Phase 7 - Backend Export Support For Large Or Paginated Data

Scope:

- Identify dashboards where the frontend only has a page of data.
- Add backend export endpoints or all-filtered-row API support where needed.
- Keep the exported file aligned with the same filters used by the dashboard.

### [ ] Phase 8 - Final QA And Cleanup

Scope:

- Verify Excel output across desktop and mobile dashboard layouts.
- Remove duplicated local export code.
- Confirm build and smoke test all dashboard export buttons.
