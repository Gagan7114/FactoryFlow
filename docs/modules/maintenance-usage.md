# Maintenance module — Quick usage guide

This document explains how to use the Maintenance module in FactoryFlow: where to find UI pages, what permissions are needed, common workflows (work orders, assets, preventive maintenance, spares, vendor flow), and useful backend endpoints.

## Where to open the module
- Frontend routes (open in app navigation):
  - Dashboard: /maintenance
  - Assets: /maintenance/assets
  - Work Orders: /maintenance/work-orders
  - Work Order detail: /maintenance/work-orders/:workOrderId
  - Store / Spares: /maintenance/spares
  - PM / Checklist: /maintenance/pm
  - Reports: /maintenance/reports
  - Automation & Masters: /maintenance/automation, /maintenance/masters
- Gate material in (maintenance gate): /gate/maintenance

(These routes are defined in src/modules/maintenance/module.config.tsx.)

## Required permissions (frontend & backend)
Common permission keys are defined under MAINTENANCE_PERMISSIONS and include:
- VIEW_DASHBOARD, VIEW_ASSET, CREATE_WORK_ORDER, MANAGE_WORK_ORDER, EDIT_MAINTENANCE_WORK_ORDER,
- VIEW_SPARE, VIEW_PM, VIEW_REPORTS, MANAGE_SETTINGS, etc.

If you cannot see a page or button, check that your user has the appropriate permission.

## Common workflows (UI steps)
1. Create a Work Order (complaint/breakdown/PM)
   - Go to: /maintenance/work-orders -> New Work
   - Fill: asset (select from Assets), work type (Breakdown / PM / Complaint), priority, title, description, target date, assign technician (optional)
   - Save: new work order opens; navigate to detail to attach photos, checklists, spare requests.

2. Work Order lifecycle
   - States: DRAFT → OPEN → ASSIGNED → IN_PROGRESS → WAITING_SPARE / WAITING_VENDOR → COMPLETED → APPROVED → CLOSED
   - Use "Edit" to update details, assign technician, or mark progress. Use the Work Order detail page to add photos, checklist results, spare issues, and vendor visits.

3. Asset management
   - Go to: /maintenance/assets
   - Create or open an asset to edit metadata (location, line, department, serial numbers), attach photos/documents, and view history (work orders, PMs, spare usage).

4. Preventive Maintenance (PM)
   - Go to: /maintenance/pm to view PM plans and executions.
   - Create PM plans (frequency, checklist). Execution can be started from the PM page or the asset profile; fill checklist and mark as complete.

5. Spares / Store
   - Go to: /maintenance/spares to view and manage spare master data.
   - From a work order, create a spare request or issue spares to the work order (store/WMS integration required for actual stock movement).

6. Vendor & Gate-In flow
   - When a spare or vendor part arrives via Gate, the Gate module record (path: /gate/maintenance) can be linked to a work order via the backend gate-links feature. Use vendor visit forms to track external work.

7. Reporting & Dashboard
   - Use /maintenance to view KPIs: open work orders, PM compliance, downtime, critical spares. Drill-down cards link into reports and work-order lists.

## Backend API (router endpoints)
The maintenance Django app exposes REST endpoints via router + custom APIs (see factory_app/maintenance/urls.py). Key API routes (router base) include:
- asset-categories/ (maintenance-asset-category)
- asset-locations/
- asset-departments/
- assets/ (CRUD asset master)
- asset-photos/, asset-documents/
- work-orders/ (CRUD + actions)
- pm-plans/, pm-checklist-items/, pm-executions/
- spare-categories/, spares/, spare-requests/, spare-movements/, spare-receipts/
- gate-links/
- vendor-visits/, work-order-photos/

Custom endpoints:
- dashboard/ (maintenance dashboard API)
- reports/ (various report types: daily, monthly, pm_compliance, breakdown, mttr, mtbf, etc.)
- scan/lookup/ (QR/scan lookup)
- scan/work-order/ (scan-based work order creation)
- spares/stock/ (spare stock view)
- alerts/
- options/ (metadata/options for front-end dropdowns)

Base path depends on how the project mounts the maintenance app (check main project urls). Example usage:
GET /api/maintenance/work-orders/ → list work orders
POST /api/maintenance/work-orders/ → create work order
GET /api/maintenance/dashboard/ → dashboard metrics

## Quick troubleshooting
- Missing UI item: verify user permissions in `MAINTENANCE_PERMISSIONS`.
- API errors: check backend logs (factory_app/backend.maintenance.out.log / err.log) and server console.
- Gate or WMS integration: ensure Gate and WMS modules are configured and that maintenance gate-links/spare receipt flows are enabled.

## Where to look for implementation details
- Frontend routes and nav: src/modules/maintenance/module.config.tsx
- Frontend pages and components: src/modules/maintenance/pages/, components/, api/
- Backend API implementations: factory_app/maintenance/views.py, serializers.py, models.py, urls.py
- Docs and design notes: FactoryFlow/docs/modules/maintenance.md (module overview & design)

---
If you want, I can:
- Add example API calls (curl) for common tasks (create work order, add spare request)
- Add screenshots or step-by-step UI screenshots
- Update the existing FactoryFlow/docs/modules/maintenance.md instead of creating a new file

Created by Copilot CLI.
