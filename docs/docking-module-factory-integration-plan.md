# Docking Module Factory Integration Plan

Audit date: 2026-05-18

Frontend repo: `D:\Test_CompanyJivo\FactoryFlow`

Backend repo: `D:\Test_CompanyJivo\factory_app_v2`

Legacy source: `D:\Test_CompanyJivo\docking\mobile`

Related legacy inventory: `docs/legacy-docking-mobile-project.md` and `D:\Test_CompanyJivo\docking\mobile\README.md`

## Goal

Bring the legacy docking/invoice/gate-pass workflow fully inside FactoryFlow and the Django backend, so the PHP app is no longer needed for finished-goods dispatch operations.

The right Factory shape is not a generic copy of the old PHP project. The core docking workflow should become a first-class outbound gate workflow that uses existing Factory modules:

- `dispatch_plans` for SAP invoice lookup and transport booking data.
- `vehicle_management` and `driver_management` for vehicle, transporter, and driver masters.
- `gate_core` for gate entry lifecycle, attachments, and outbound gate operations.
- `weighment` for gross/tare/net weight.
- Existing auth, permissions, company context, SAP client, and media storage.

The legacy dynamic utility forms, raw database clients, and broad reporting/admin tools should not be rebuilt as part of docking unless the business explicitly wants a separate utility-forms module.

## Current Factory Coverage

### Backend

The backend already has useful foundations:

| Area | Current state |
|---|---|
| Auth and company context | Present through Django/DRF permissions and `HasCompanyContext`. |
| Gate module | `gate_core` is installed and exposed at `/api/v1/gate-core/`. |
| Vehicle gate entry model | `VehicleEntry` exists, but its `entry_type` choices do not include sales dispatch/docking. |
| Weighment | `Weighment` is a one-to-one record on `VehicleEntry`. |
| Attachments | `GateAttachment` can upload files against a `VehicleEntry`, but has no attachment type, uploaded-by, photo metadata, latitude, or longitude. |
| Dispatch plans | `dispatch_plans` is installed and exposed at `/api/v1/dispatch-plans/`. It reads SAP A/R invoices and stores vehicle/driver/bilty/freight booking data. |
| SAP invoice lookup | `HanaDispatchBillReader` reads `OINV`, `INV1`, `INV12`, and `OITM` for dispatch bills. |
| SAP stock transfer lookup | `gate_core` already exposes stock transfer lookup for BST gate-out through `SAPClient`. |
| Existing outbound-like workflows | Empty vehicle in/out, BST out/in/return, rejected QC return, and job work gate-in are implemented. |
| Sales dispatch permission seeds | Migration `gate_core/0022_add_sales_dispatch_out_permissions.py` creates view/create permissions. |

There are `outbound_dispatch` and `outbound_gatein` folders, but they are not in `INSTALLED_APPS` and the visible source files are absent. They should not be treated as usable implementation unless recovered from source control.

### Frontend

The frontend already has sales-dispatch navigation and a mostly complete prototype:

| Area | Current state |
|---|---|
| Gate entry type | `sales-dispatch` exists in `src/modules/gate/constants/gateEntryTypes.ts`. |
| Permissions | `GATE_PERMISSIONS.SALES_DISPATCH` maps to backend sales-dispatch permissions. |
| Routes | `/gate/sales-dispatch`, `/gate/sales-dispatch/new`, `/weighment`, `/attachments`, and detail routes exist. |
| UI pages | Sales dispatch dashboard, create, weighment, attachment, and detail pages exist under `src/modules/gate/pages/customerSalesFlow/`. |
| Data source | Sales dispatch uses `localStorage` and `SAMPLE_DELIVERIES`, not backend APIs. |
| File uploads | Attachment UI stores file names only; it does not upload files. |
| Dispatch plan dashboard | Existing dashboard and vehicle-linking pages call the real `dispatch_plans` APIs. |

The main frontend gap is not screen design. It is replacing prototype storage with a real backend contract and making the workflow match the legacy docking state machine.

## `feature/dispatch-new-module` Branch Assessment

Checked on 2026-05-18 using temporary isolated worktrees, which were removed after the rebase:

- Frontend: `D:\Test_CompanyJivo\FactoryFlow_dispatch_inspect`
- Backend: `D:\Test_CompanyJivo\factory_app_v2_dispatch_inspect`

Both frontend and backend have a `feature/dispatch-new-module` branch. It is not a gate docking module yet. It is a dispatch/SAP document workflow centered on dispatch plans, vehicle linking, bilty freight service GRPO, open bilties, and transporter A/P invoice posting.

Rebase status: `feature/docking` has been rebased on `feature/dispatch-new-module` in both repos. The docking module should now be built directly on top of the combined branch state.

### What The Branch Adds

Frontend additions:

- New `src/modules/dispatch` module with routes under `/dispatch`.
- Dispatch sidebar group for:
  - Dispatch plans.
  - Vehicle linking.
  - Service GRPO.
  - Open bilties.
  - Transporter A/P invoice.
- `DISPATCH_PERMISSIONS` mapped to `dispatch_plans` Django permissions.
- Multi-invoice selection in dispatch vehicle linking.
- Required bilty attachment handling in dispatch linking.
- A reusable `resolveFileUrl` helper for media/file URLs.
- Multipart attachment upload patterns for transporter invoice submission.

Backend additions:

- New `/api/v1/dispatch/` route group backed by `dispatch_plans.dispatch_urls`.
- `DispatchPlan` fields for invoice number, e-way bill, invoice weight, invoice amount, place of supply, product variety, total litres, effective month, budget delivery point, service location, and SAC data.
- `DispatchPlansService.update_linked_plans`, which can apply one vehicle/bilty booking across multiple SAP invoices and allocate freight across the selected invoices.
- `HanaDispatchBillReader.list_bills_by_doc_entries` and SAP e-way bill extraction.
- Permissions for dispatch vehicle linking, open bilties, bilty service GRPO, and transporter A/P invoice.
- `TransporterAPInvoicePosting`, line, and attachment models.
- Service-layer A/P invoice posting through SAP Service Layer, including attachment upload.
- Local seed command and settings flags for dispatch invoice UI testing without live SAP posting.
- GRPO changes that group dispatch plans by bilty/vehicle/transporter and create service GRPO lines across linked invoices.

### Useful For Docking

These pieces should be reused or rebased before building docking:

| Branch feature | Docking value |
|---|---|
| Dedicated dispatch frontend module | Gives us a clean navigation home for dispatch operations instead of hiding everything under dashboards/vehicle management. |
| Expanded `DispatchPlan` invoice fields | Covers several legacy `tbl_invoice_printing` snapshots: invoice number, e-way bill, amount, weight, delivery point, and product variety. |
| Multi-invoice vehicle linking | Very close to legacy `dock_invoice.php`, where one truck/bilty can carry multiple invoices. |
| Bilty attachment requirement | Useful for docking document readiness before gatepass. |
| Vehicle/driver/transporter linking improvements | Reusable for dock capture and final gate-out. |
| `list_bills_by_doc_entries` | Useful when docking selected invoices by SAP DocEntry instead of only searching by invoice number. |
| SAP e-way bill extraction | Useful for `gate_invoice2.php` parity. |
| Multipart upload pattern | Reusable for truck photos, invoice copies, delivery notes, and gatepass files. |
| Dispatch permissions | Better permission boundary than mixing dispatch actions into dashboard permissions. |
| Local seed/test toggles | Helpful for UI development without live SAP posting. |

### Still Missing For Docking

The branch does not replace the legacy docking app by itself. It still lacks:

- Sales-dispatch/docking gate-out model.
- `VehicleEntry` `SALES_DISPATCH` lifecycle integration.
- Truck photo upload with latitude/longitude.
- Gatepass number generation, QR/random code, and print commit.
- Dispatch lock equivalent to legacy `tbl_lock`.
- Gate-out state machine and security finalization.
- Weighment enforcement for sales dispatch gate-out.
- Legacy rejection/re-entry behavior.
- Empty truck return linkage.
- Truck-with-photo operational reports.
- SAP stock transfer (`OWTR`/`WTR1`) support in the dispatch-plan reader. The branch still centers on `OINV`/`INV1` for dispatch bills.

### Rebase Outcome And Considerations

The branches had diverged before the rebase:

| Repo | `feature/docking` only | `feature/dispatch-new-module` only | Main overlap |
|---|---:|---:|---|
| Frontend | 20 commits | 7 commits | `src/app/registry/index.ts`, `src/config/constants/api.constants.ts`, `src/config/permissions/index.ts` |
| Backend | 12 commits | 7 commits | `config/settings.py`, `config/urls.py` |

The rebase was worthwhile, but it had real conflict areas:

- Frontend API constants and permission exports now include dispatch, AI, barcode, and vehicle-management additions together.
- Frontend `LineManagementPage` conflict was resolved while keeping both production-execution and dispatch-era imports/hooks.
- Backend settings and URL routing now include dispatch, warehouse, barcode, and AI assistant routes together.
- Backend `stock_dashboard/hana_reader.py` conflict was resolved by keeping the richer dispatch stock-dashboard reader and applying the barcode branch on top.
- Any future sales-dispatch API constants must coexist with the dispatch branch's `/dispatch/*` and `/dispatch-plans/*` split.

Recommendation after rebase: build docking gate-out on top of the dispatch module foundations. Do not copy the old PHP docking concepts directly into the current `localStorage` sales-dispatch pages first; that would create duplicate dispatch abstractions.

## Legacy Docking Workflow To Preserve

The core legacy PHP docking flow is:

1. `dock_invoice.php`: capture truck, transporter, driver, bilty, freight, dock in-charge, and one or more SAP invoices or stock transfers.
2. `dock_photo.php`: upload truck photo, enrich invoice metadata, and store latitude/longitude.
3. `gate_invoice2.php`: require photo, collect e-way/UOM/physical quantity, compare with weighbridge data, assign gate pass, print, and allow rejection.
4. `gate_finalprint.php`: commit final print state.
5. `empty_truck_in.php`: allow a recently docked truck to come back in empty.
6. `gupta_invoice.php`: alternate invoice-out gate-pass flow.
7. `mart_print.php`: Jivo Mart document print view.
8. `polling9.php`: backfill customer, amount, quantity, and SAP weight from SAP.
9. `lock.php`: dispatch lock/unlock control.
10. Reporting: truck waiting inside, truck vs invoice with photos, truck status with photos.

The main legacy tables behind this are:

- `tbl_invoice_printing`
- `tbl_invoice_printing_gatepass_seq`
- `tbl_invoice_ggo`
- `tbl_truck_entry`
- `tbl_lock`
- `tbl_lock_email`

## Recommended Domain Design

Create a first-class "Sales Dispatch Out" or "Docking" backend domain. It can live in `gate_core` if the team wants to keep outbound gate models together, or in a new installed app such as `sales_dispatch`. Because the existing permissions already live in `gate_core`, the lower-friction path is to add the first version to `gate_core`.

### Core Model

Add a model like `SalesDispatchGateOut`:

| Field group | Required data |
|---|---|
| Identity | company, entry number, status, active flag, created/updated audit fields. |
| Gate link | `VehicleEntry` link with new `entry_type = SALES_DISPATCH`. |
| Dispatch plan link | Optional `DispatchPlan` link for invoices already booked by planning/vehicle linking. |
| SAP document | document type (`OINV` or `OWTR`), SAP company/schema snapshot, doc entry, doc number, doc date, customer/branch/address/GST snapshots, totals, warehouse/base refs. |
| Transport | vehicle, transporter, driver links plus denormalized truck, transporter, contact, driver, license snapshots. |
| Docking | bilty number/date, freight, total freight, dock in-charge, docked by, docked at. |
| Photo | truck photo file, photo latitude, photo longitude, photo uploaded by, photo uploaded at. |
| Weighment | Use existing `Weighment` on `VehicleEntry`; optionally snapshot net weight on final commit. |
| Gate pass | e-way bill attached, UOM, physical quantity, seal number, PGI/goods-issue reference, gatepass number, random/QR code, printed by/at, print committed by/at. |
| Rejection/cancel | rejected flag/status, rejection reason/user/time, cancel reason/user/time. |

Add a line snapshot model like `SalesDispatchGateOutItem`:

- SAP line number.
- Item code/name.
- Quantity, UOM, line amount, gross amount.
- Warehouse, base reference, base entry/type.
- Calculated litres, boxes, SAP weight.

### Status Model

Use an explicit status flow instead of legacy boolean columns:

| Status | Meaning |
|---|---|
| `DOCKED` | Invoice/transfer and truck details captured. |
| `PHOTO_PENDING` | Dock record exists but truck photo is missing. |
| `PHOTO_ATTACHED` | Photo and mandatory geolocation captured. |
| `READY_FOR_GATEPASS` | Required checks, weighment, and documents are present. |
| `GATEPASS_PRINTED` | Gate pass number and QR/random code assigned. |
| `PRINT_COMMITTED` | Final print committed. |
| `DISPATCHED` | Vehicle has left and dispatch plan is closed. |
| `REJECTED` | Invoice was rejected before final dispatch. |
| `CANCELLED` | Entry cancelled with reason. |

The exact names can change, but the backend should enforce legal transitions.

### Attachments

Either extend `GateAttachment` or create a dispatch-specific attachment model. The current `GateAttachment` is too thin for docking parity.

Needed metadata:

- Attachment type: truck photo, gatepass, invoice copy, delivery note, bilty, e-way bill, other.
- Uploaded by.
- Optional latitude/longitude for truck photo.
- Original file name.
- Notes.

### Dispatch Lock

Replace legacy `tbl_lock` with a model such as `DispatchLock`:

- Company.
- Scope, initially `SALES_DISPATCH`.
- `is_locked`.
- Reason.
- Changed by/at.
- Optional email/notification audit.

The backend should block gate-pass print and final commit while locked.

## Delivery Build Plan

### Working Assumptions

Use these assumptions for the first build unless the business confirms otherwise:

- User-facing module name: **Docking**.
- First release supports SAP A/R invoices from `OINV`/`INV1` and SAP stock transfers from `OWTR`/`WTR1`.
- Gatepass printing is required in the first release. The exact print layout still needs approval.
- Truck-photo geolocation is mandatory.
- Historical data from the previous PHP app is not required for go-live.
- Gupta flow, Mart print, and JSAP mirror behavior remain unresolved and should not be assumed in MVP until confirmed.
- Build in the existing `feature/docking` branch, now rebased on `feature/dispatch-new-module`.
- Keep dispatch planning/vehicle linking in `dispatch_plans`; add gate-out/docking execution in `gate_core`.
- Rework the existing frontend pages under `src/modules/gate/pages/customerSalesFlow/` instead of creating a parallel sales-dispatch UI.

### Architecture Target

The module should have three connected layers:

| Layer | Responsibility | Main modules |
|---|---|---|
| Planning | SAP invoice search, vehicle/driver/transporter/bilty/freight booking, multi-invoice grouping. | `dispatch_plans`, `vehicle_management`, frontend `src/modules/dispatch` and `src/modules/vehicle-management`. |
| Docking execution | Create gate-out, capture truck/photo/documents, enforce weighment, generate gatepass, commit final print, reject/cancel. | `gate_core`, `weighment`, `driver_management`, frontend sales-dispatch pages. |
| Settlement/reporting | Service GRPO, open bilties, transporter A/P invoice, operational truck/photo reports. | Existing `/api/v1/dispatch/` plus new sales-dispatch reports. |

### Phase 0: Scope Lock And Contract

Goal: freeze the first release contract before writing migrations.

Backend tasks:

- Confirm exact `OWTR`/`WTR1` stock-transfer search and selection rules for Docking.
- Confirm exact gatepass number format, QR/random-code content, and print layout.
- Confirm whether dispatch lock is required for MVP or phase 2.
- Confirm whether one gate-out can contain multiple invoices, or whether it creates one gate-out per invoice but shares the same vehicle/bilty group.
- Confirm whether JSAP mirror updates are still used by downstream systems.
- Confirm whether Gupta invoice flow belongs in Docking or remains out of scope.
- Confirm which reports are required beyond the basic operational dashboard.

Frontend tasks:

- Confirm whether the main entry point is `/gate/sales-dispatch` or the new `/dispatch` group.
- Confirm which existing pages stay in the gate sidebar and which actions should deep-link from dispatch vehicle linking.

Acceptance gate:

- A short API contract is agreed for create, photo upload, gatepass print, commit, reject, cancel, list, and detail.

### Phase 1: Backend Foundation

Goal: create the persistent docking domain and make it visible to the current gate/dispatch infrastructure.

Files/modules to touch:

- `driver_management/models/vehicle_entry.py`
- `driver_management/migrations/`
- `gate_core/models/`
- `gate_core/models/__init__.py`
- `gate_core/admin.py`
- `gate_core/permissions.py`
- `gate_core/migrations/`
- `gate_core/services/`
- `dispatch_plans/models.py`
- `dispatch_plans/services.py`

Tasks:

1. Add `SALES_DISPATCH` to `VehicleEntry.ENTRY_TYPE_CHOICES`.
2. Add `SalesDispatchGateOutStatus` choices.
3. Add `SalesDispatchGateOut` with company, `VehicleEntry`, optional linked dispatch-plan group key, transport snapshots, SAP document snapshots, docking data, photo metadata, gatepass fields, print audit, rejection/cancel fields, and dispatch completion audit.
4. Add `SalesDispatchGateOutItem` for invoice line snapshots.
5. Add `SalesDispatchAttachment` or extend `GateAttachment` with typed attachment metadata. Prefer a new dispatch-specific attachment model if migration risk on shared attachments is high.
6. Add `DispatchLock` if lock is in MVP.
7. Add model permissions for view/create/edit/photo/upload/gatepass/commit/reject/cancel/reports/lock.
8. Add indexes and constraints:
   - company + status.
   - company + created date.
   - company + SAP document type + SAP doc entry.
   - company + vehicle entry.
   - company + gatepass number.
   - unique active document per company/document type/doc entry.
9. Add admin views for operational inspection, not primary workflow use.
10. Add a service that can mark related `DispatchPlan` rows as dispatched after final commit.

Acceptance gate:

- Migrations run.
- Django check passes.
- A `VehicleEntry` can be created with `SALES_DISPATCH`.
- Model constraints prevent duplicate active gate-outs for the same SAP document.

### Phase 2: Backend APIs And State Machine

Goal: expose the workflow as clear DRF endpoints with backend-enforced transitions.

Files/modules to touch:

- `gate_core/serializers.py`, or new `gate_core/serializers_sales_dispatch.py`.
- `gate_core/views.py`, or preferably new `gate_core/views_sales_dispatch.py` imported by `gate_core/urls.py`.
- `gate_core/urls.py`.
- `gate_core/services/sales_dispatch_state.py`.
- `gate_core/services/sales_dispatch_documents.py`.
- `gate_core/services/sales_dispatch_gatepass.py`.
- `gate_core/services/lock_manager.py` if reused.
- `dispatch_plans/invoice_services.py`.
- `dispatch_plans/services.py`.

Endpoint plan:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/gate-core/sales-dispatch/documents/` | GET | Search SAP invoice or stock-transfer documents and return normalized document data. |
| `/api/v1/gate-core/sales-dispatch/documents/<document_type>/<doc_entry>/` | GET | Fetch SAP invoice or stock-transfer detail and line snapshot. |
| `/api/v1/gate-core/sales-dispatch/` | GET | Dashboard list with date, status, vehicle, invoice, customer, and gatepass filters. |
| `/api/v1/gate-core/sales-dispatch/` | POST | Create docking gate-out from SAP document plus vehicle/driver/transporter/bilty data. |
| `/api/v1/gate-core/sales-dispatch/<id>/` | GET/PATCH | Detail and editable docking fields. |
| `/api/v1/gate-core/sales-dispatch/by-vehicle-entry/<vehicle_entry_id>/` | GET | Resume workflow from gate entry. |
| `/api/v1/gate-core/sales-dispatch/<id>/attachments/` | GET/POST | Upload typed documents and truck photo. |
| `/api/v1/gate-core/sales-dispatch/<id>/gatepass/preview/` | POST | Validate readiness and return printable gatepass data without committing. |
| `/api/v1/gate-core/sales-dispatch/<id>/gatepass/print/` | POST | Assign gatepass number and QR/random code. |
| `/api/v1/gate-core/sales-dispatch/<id>/commit-print/` | POST | Final print commit. |
| `/api/v1/gate-core/sales-dispatch/<id>/dispatch/` | POST | Mark vehicle dispatched and linked dispatch plans dispatched. |
| `/api/v1/gate-core/sales-dispatch/<id>/reject/` | POST | Reject before final dispatch. |
| `/api/v1/gate-core/sales-dispatch/<id>/cancel/` | POST | Cancel with reason. |
| `/api/v1/gate-core/sales-dispatch/lock/` | GET/PATCH | Read/update dispatch lock, if included in MVP. |

State machine:

| From | Allowed next states |
|---|---|
| `DOCKED` | `PHOTO_ATTACHED`, `CANCELLED`, `REJECTED` |
| `PHOTO_ATTACHED` | `READY_FOR_GATEPASS`, `CANCELLED`, `REJECTED` |
| `READY_FOR_GATEPASS` | `GATEPASS_PRINTED`, `CANCELLED`, `REJECTED` |
| `GATEPASS_PRINTED` | `PRINT_COMMITTED`, `REJECTED` |
| `PRINT_COMMITTED` | `DISPATCHED` |
| `REJECTED` | terminal for that record; recovery creates a new linked record if allowed |
| `CANCELLED` | terminal |
| `DISPATCHED` | terminal |

Validation rules:

- Create requires company context, valid SAP invoice or stock transfer, vehicle, driver, and transporter.
- Gatepass preview requires photo, geolocation, required documents, and completed weighment.
- Gatepass print is blocked by dispatch lock.
- Commit print is blocked unless gatepass was printed.
- Dispatch is blocked unless print is committed.
- Cancel is blocked after print commit unless a privileged correction flow is added.
- Reject is blocked after dispatch.

Acceptance gate:

- API tests pass for create, duplicate prevention, photo upload, weighment enforcement, gatepass print, commit, reject, cancel, permissions, and dispatch-plan status update.

### Phase 3: Frontend API Layer

Goal: remove sales-dispatch dependence on `localStorage` and define stable client contracts.

Files/modules to touch:

- `src/config/constants/api.constants.ts`
- `src/config/constants/index.ts`
- `src/modules/gate/api/index.ts`
- `src/modules/gate/api/salesDispatch/salesDispatch.api.ts`
- `src/modules/gate/api/salesDispatch/salesDispatch.queries.ts`
- `src/modules/gate/types/salesDispatch.types.ts`
- `src/modules/gate/pages/customerSalesFlow/customerSalesFlow.storage.ts`

Tasks:

1. Add `ENTRY_TYPES.SALES_DISPATCH`.
2. Add `API_ENDPOINTS.SALES_DISPATCH` entries matching the backend.
3. Add DTO types for list row, detail, item lines, attachments, status, gatepass preview, and action payloads.
4. Add React Query hooks:
   - list.
   - detail.
   - by vehicle entry.
   - document search/detail.
   - create/update.
   - upload attachment/photo.
   - gatepass preview/print.
   - commit print.
   - mark dispatched.
   - reject/cancel.
   - lock read/update.
5. Split customer-return prototype storage away from sales-dispatch storage. Customer return can keep `customerSalesFlow.storage.ts`; sales dispatch should use API hooks only.
6. Invalidate dashboard/detail/dispatch-plan queries after mutating actions.

Acceptance gate:

- Frontend builds.
- No sales-dispatch page imports `SAMPLE_DELIVERIES` or writes sales-dispatch entries to `localStorage`.

### Phase 4: Frontend Workflow Pages

Goal: make the current sales-dispatch UI operate against the backend workflow.

Files/modules to touch:

- `src/modules/gate/pages/customerSalesFlow/SalesDispatchDashboardPage.tsx`
- `src/modules/gate/pages/customerSalesFlow/SalesDispatchNewPage.tsx`
- `src/modules/gate/pages/customerSalesFlow/SalesDispatchWeighmentPage.tsx`
- `src/modules/gate/pages/customerSalesFlow/SalesDispatchAttachmentsPage.tsx`
- `src/modules/gate/pages/customerSalesFlow/SalesDispatchDetailPage.tsx`
- `src/modules/gate/pages/customerSalesFlow/CustomerSalesAttachmentsPage.tsx`
- `src/modules/vehicle-management/pages/DispatchVehicleLinkingPage.tsx`
- `src/modules/dispatch/pages/OpenBiltiesPage.tsx` only if deep-links are needed.

Page behavior:

| Page | Build behavior |
|---|---|
| Dashboard | Query backend list, show real counts, status tabs, date/search filters, and inside/not-dispatched trucks. |
| New | Search SAP invoices, prefill from dispatch plan if booked, create `VehicleEntry` + sales-dispatch gate-out, then route to weighment/photo. |
| Weighment | Use existing weighment API against the sales-dispatch `VehicleEntry`; route back to detail if already complete. |
| Attachments/photo | Upload actual files, capture truck photo and mandatory geolocation, show uploaded previews, route to gatepass preview. |
| Detail | Show state timeline, SAP invoice lines, truck photo, documents, weighment, linked dispatch plans, gatepass preview/print, commit, dispatch, reject, cancel. |

Deep links:

- From dispatch vehicle linking, add an action to start or open docking for the selected invoice group.
- From dispatch plan detail/dashboard, show docking status when a gate-out exists.

Acceptance gate:

- A user can create a sales-dispatch gate-out from a real or seeded invoice or stock transfer and complete photo, geolocation, weighment, gatepass, final print, and dispatch without refreshing into broken state.

### Phase 5: Gatepass, Print, Lock, And Reports

Goal: cover the legacy behaviors that operators need daily.

Backend tasks:

- Implement gatepass sequence model/service.
- Generate QR/random code server-side.
- Return printable payload with company, truck, customer, invoice, item, weighment, e-way, and audit data.
- Add PDF/HTML print endpoint if browser print is insufficient.
- Add dispatch lock API and enforce it if not done in phase 2.
- Add reports:
  - trucks waiting inside.
  - truck vs invoice with photos.
  - truck status with photos.
  - rejected/cancelled dispatches.

Frontend tasks:

- Add print preview/action on detail page.
- Add lock management page or compact admin control for authorized users.
- Add reports page or filters within dashboard, depending on operational preference.
- Ensure uploaded photo and printable gatepass render from backend media URLs using `resolveFileUrl`.

Acceptance gate:

- Printed gatepass matches approved layout and can be re-opened from the Docking record.
- Lock prevents print/commit and shows a clear UI message.
- Reports cover the legacy daily report use cases.

### Phase 6: Legacy Cutover Without History Migration

Goal: retire the PHP docking app safely.

Tasks:

1. Do not import old PHP docking history for the current go-live scope.
2. Run parallel production validation:
   - Same invoice/truck can be found in both systems.
   - Gatepass totals match.
   - Photo paths resolve.
   - Dispatch status matches.
3. Freeze PHP docking writes.
4. Switch users to Factory URLs.
5. Keep the PHP app read-only for a defined rollback window if operations still need lookup access.

Acceptance gate:

- Business signs off on live parallel-run entries.
- No new writes are made in PHP after cutover.

### Suggested Commit Order

Keep commits small enough to review and rollback:

1. Backend `SALES_DISPATCH` entry type and model migrations.
2. Backend document lookup and create/detail/list APIs.
3. Backend attachment/photo, gatepass, commit, reject/cancel APIs.
4. Backend dispatch-plan status integration and reports.
5. Frontend API constants/types/hooks.
6. Frontend dashboard/new/weighment conversion.
7. Frontend attachments/detail/gatepass conversion.
8. Frontend dispatch-plan deep links and reports.
9. Tests and polish.
10. Cutover tooling and optional legacy lookup support.

### First MVP Definition Of Done

The MVP is done when:

- Sales dispatch has real backend persistence.
- The frontend no longer uses sample deliveries/localStorage for sales dispatch.
- One SAP invoice and one SAP stock transfer can each be docked, weighed, photographed with geolocation, gatepass-printed, final-print committed, and dispatched.
- Linked dispatch plans become `DISPATCHED`.
- Required permissions are enforced.
- Build/check/test commands pass.
- Operations can see trucks waiting inside and completed gatepasses.

## Backend Build Checklist

### Models And Migrations

- Add `SALES_DISPATCH` to `VehicleEntry.ENTRY_TYPE_CHOICES`.
- Add `SalesDispatchGateOut`.
- Add `SalesDispatchGateOutItem`.
- Add or extend attachment model for typed files and photo metadata.
- Add `DispatchLock` if no shared lock model is chosen.
- Add model permissions for view, create, edit, cancel, reject, print, commit, and reports.
- Add indexes on company, status, date fields, SAP document identity, vehicle, driver, and dispatch plan.
- Enforce unique active dispatch document per company/document type/doc entry, with a clear exception for rejected re-entry if the business requires it.

### APIs

Add DRF endpoints, for example:

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/gate-core/sales-dispatch-outs/` | List dashboard entries with date/status/search filters. |
| `POST /api/v1/gate-core/sales-dispatch-outs/` | Create docked dispatch from SAP document plus transport details. |
| `GET /api/v1/gate-core/sales-dispatch-outs/<id>/` | Detail view. |
| `PATCH /api/v1/gate-core/sales-dispatch-outs/<id>/` | Update editable docking fields. |
| `POST /api/v1/gate-core/sales-dispatch-outs/<id>/photo/` | Upload truck photo and geolocation. |
| `POST /api/v1/gate-core/sales-dispatch-outs/<id>/gatepass/` | Validate checks, assign gate pass, and return printable data. |
| `POST /api/v1/gate-core/sales-dispatch-outs/<id>/commit-print/` | Commit final print state. |
| `POST /api/v1/gate-core/sales-dispatch-outs/<id>/reject/` | Reject before final dispatch. |
| `POST /api/v1/gate-core/sales-dispatch-outs/<id>/cancel/` | Cancel with reason. |
| `POST /api/v1/gate-core/sales-dispatch-outs/<id>/mark-dispatched/` | Close the workflow and update dispatch plan status. |
| `GET /api/v1/gate-core/sales-dispatch-outs/reports/...` | Truck/photo/status reports. |
| `GET/PATCH /api/v1/gate-core/dispatch-lock/` | Lock/unlock dispatch gate-pass activity. |

### SAP Services

Current `dispatch_plans` supports A/R invoices only. Legacy docking also searched SAP stock transfers for Mart/BST-like flows. Build a unified dispatch document lookup service:

- Support `OINV`/`INV1`/`INV12` for customer invoices.
- Support `OWTR`/`WTR1` for stock transfers where the business still uses docking for transfer documents.
- Reuse existing `dispatch_plans.HanaDispatchBillReader` for invoice metadata.
- Reuse or wrap existing `SAPClient` stock-transfer methods for `OWTR`.
- Return a normalized `DispatchDocument` DTO to the new docking APIs.
- Keep SAP access backend-only.

### Gate Pass And Print

- Generate Factory gate pass numbers through a Django sequence/model, replacing `tbl_invoice_printing_gatepass_seq`.
- Generate QR/random code server-side.
- Return printable HTML/PDF data from the API.
- Store print audit and final commit timestamps.
- Gatepass printing is required for MVP; the exact legacy layout still needs approval.
- Decide whether the old JSAP mirror update is still required. If required, hide it behind a service with retries and audit logging.

### Business Rules

Backend validation should cover:

- SAP document exists and belongs to the current company context.
- Active duplicate documents cannot be docked twice.
- Rejected documents can be re-entered only through the approved recovery flow.
- Gate pass cannot be generated without photo, geolocation, required documents, and weighment.
- Dispatch lock blocks gate-pass/final-print actions.
- Dispatch plan must move to `DISPATCHED` once the gate-out is completed.
- Cancellation is blocked after final print/dispatch unless a privileged correction flow is added.

## Frontend Build Checklist

### Replace Prototype Storage

The current sales-dispatch pages use `customerSalesFlow.storage.ts`, `localStorage`, and `SAMPLE_DELIVERIES`. Replace this with:

- `src/modules/gate/api/salesDispatch/salesDispatch.api.ts`
- `src/modules/gate/api/salesDispatch/salesDispatch.queries.ts`
- Typed DTOs matching the backend.
- React Query cache invalidation after create/update/photo/gatepass/reject/cancel.

### Sales Dispatch Pages

Rework existing pages instead of creating a parallel UI:

| Page | Required changes |
|---|---|
| `SalesDispatchDashboardPage` | Load real entries, counts, filters, and statuses from backend. |
| `SalesDispatchNewPage` | Search/select SAP invoice or stock transfer, link dispatch plan where present, capture truck/driver/transporter/bilty/freight/dock-incharge. |
| `SalesDispatchWeighmentPage` | Save through existing weighment API using the created `VehicleEntry`. |
| `SalesDispatchAttachmentsPage` | Upload actual files, including truck photo and document attachments. |
| `SalesDispatchDetailPage` | Show full backend state, SAP lines, photo, gatepass, print audit, cancellation/rejection history. |

Add or split pages if the business wants dock and gate teams to work separately:

- Dock invoice capture.
- Dock photo upload.
- Gate-pass print.
- Dispatch reports.
- Dispatch lock admin.

### Dispatch Plan Integration

Existing dispatch-plan and vehicle-linking screens are valuable and should remain:

- Let planning/vehicle teams book transport through `dispatch_plans`.
- Let docking create a gate-out from a booked plan.
- Preserve bilty/freight/kanta data from the dispatch plan.
- Update the plan to `DISPATCHED` when gate-out is committed.

### File And Photo UX

- Use real upload progress and backend file URLs.
- Capture latitude/longitude for truck photo as a mandatory step.
- Show a clear blocking message if browser/device geolocation is unavailable, because geolocation is required for MVP.
- Preview uploaded photos and documents.

### Permissions

Frontend already has `GATE_PERMISSIONS.SALES_DISPATCH`. Expand it if the backend adds granular actions:

- View.
- Create/dock.
- Upload photo.
- Print gate pass.
- Commit print.
- Reject.
- Cancel.
- Manage dispatch lock.
- View reports.

## Reporting Build Checklist

Build only the reports needed to retire docking:

| Legacy report | Factory replacement |
|---|---|
| All trucks waiting inside | Sales dispatch dashboard filter for inside/not dispatched. |
| Truck vs invoice report with photos | API report with document, truck, customer, photo, and gatepass details. |
| Truck status report with photos | API report by status with photo and timestamps. |
| Planning report | Keep existing dashboards if they already cover planning; otherwise add a dispatch-plans report, not a PHP clone. |

Avoid rebuilding `pg_client.php` or `sql_client.php`. Those are admin database consoles, not product workflows.

## Historical Data Migration

Historical data from the previous PHP app is not required for go-live. Do not build migration tooling in the MVP.

Keep this section only as an optional future reference if the business later asks for old docking history inside Factory.

### Source Tables

- `tbl_invoice_printing` to `SalesDispatchGateOut`.
- `tbl_invoice_ggo` to either `SalesDispatchGateOut` with a source/type flag or a separate compatibility import.
- `tbl_truck_entry` to empty-vehicle or dispatch-entry history.
- `uploads/` files to Django media storage with attachment rows.
- `tbl_lock` to `DispatchLock`.

### Migration Rules

- Map legacy company DB values to Factory companies.
- Normalize document type and SAP document number.
- Deduplicate by company, document type, and document number.
- Preserve old gatepass number, random code, print date, photo path, latitude, longitude, and rejected/committed flags.
- Map legacy users to Factory users where possible; otherwise store legacy login as a text snapshot.
- Keep old image paths in a legacy reference field until every file is copied and verified.

## Testing Checklist

Backend tests:

- Create dispatch from invoice and stock transfer.
- Duplicate active document is rejected.
- Rejected document recovery path works.
- Required photo/weighment/documents block gatepass until present.
- Dispatch lock blocks print/commit.
- Gatepass sequence is unique under concurrency.
- Dispatch plan status changes to `DISPATCHED` after commit.
- Permissions block unauthorized actions.
- SAP unavailable and SAP not-found cases return useful errors.

Frontend tests:

- Dashboard loads and filters real entries.
- Create flow calls backend and resumes from existing entry.
- Photo/document uploads persist and display after refresh.
- Gatepass print/commit flow updates status.
- Reject/cancel actions update dashboard counts.

## Suggested Phases

1. Confirm remaining unknowns: stock-transfer selection rules, exact gatepass format, dispatch lock timing, JSAP mirror need, Gupta flow, and required reports.
2. Build backend model/API/state machine for sales dispatch gate-out.
3. Wire frontend sales-dispatch pages to real APIs and remove `localStorage` prototype behavior.
4. Add photo/geolocation, gatepass generation, print commit, and dispatch lock.
5. Add reports needed by operations.
6. Run parallel production validation against the legacy PHP app, then retire the PHP docking pages.

## MVP Scope

The smallest useful Factory docking module should include:

- SAP invoice lookup through existing `dispatch_plans`.
- SAP stock-transfer lookup through existing stock-transfer services or a normalized `OWTR`/`WTR1` reader.
- Create sales-dispatch gate-out from invoice or stock transfer plus vehicle/driver/transporter.
- `VehicleEntry` with `SALES_DISPATCH`.
- Weighment through existing weighment API.
- Truck photo with geolocation and required document upload.
- Gatepass generation and print commit.
- Dashboard/detail pages using backend data.
- Dispatch plan status update to `DISPATCHED`.

Gupta flow compatibility, Mart print, JSAP mirror update, historical migration, and advanced reports remain outside MVP until confirmed. Dispatch lock can be built in MVP or phase 2 depending on operational urgency.

## Open Decisions

| Question | Current answer |
|---|---|
| Module name shown to users | Docking. |
| SAP stock transfer support | Required on day one. Support `OWTR`/`WTR1` along with A/R invoices. |
| Gatepass printing | Required on day one. Exact layout/format still needs approval. |
| Truck-photo geolocation | Mandatory. |
| Previous PHP app history | Not required for Factory go-live. |
| JSAP mirror update | Unknown. Investigate before final print/dispatch service design. |
| `gupta_invoice.php` compatibility | Unknown. Leave out of MVP until business confirms. |
| Required legacy reports | Unknown. Start with operational dashboard/report basics, then confirm the final report list. |
