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
| `PHOTO_ATTACHED` | Photo and optional geolocation captured. |
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
- Decide whether the old JSAP mirror update is still required. If required, hide it behind a service with retries and audit logging.

### Business Rules

Backend validation should cover:

- SAP document exists and belongs to the current company context.
- Active duplicate documents cannot be docked twice.
- Rejected documents can be re-entered only through the approved recovery flow.
- Gate pass cannot be generated without photo, required documents, and weighment.
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
- Capture latitude/longitude intentionally for truck photo if the business needs it.
- Make geolocation optional or clearly required. The legacy app had a mismatch where the server required geolocation but the client code was commented out.
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

## Data Migration

If historical continuity matters, migrate the old data after the new schema is stable.

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

1. Confirm scope: invoice-only vs invoice plus stock transfer, exact gatepass format, geolocation rule, and historical migration requirement.
2. Build backend model/API/state machine for sales dispatch gate-out.
3. Wire frontend sales-dispatch pages to real APIs and remove `localStorage` prototype behavior.
4. Add photo/geolocation, gatepass generation, print commit, and dispatch lock.
5. Add reports needed by operations.
6. Migrate historical docking data and uploaded photos if required.
7. Run parallel production validation against the legacy PHP app, then retire the PHP docking pages.

## MVP Scope

The smallest useful Factory docking module should include:

- SAP invoice lookup through existing `dispatch_plans`.
- Create sales-dispatch gate-out from invoice plus vehicle/driver/transporter.
- `VehicleEntry` with `SALES_DISPATCH`.
- Weighment through existing weighment API.
- Truck photo and required document upload.
- Gatepass generation and print commit.
- Dashboard/detail pages using backend data.
- Dispatch plan status update to `DISPATCHED`.

Stock-transfer support, Gupta flow compatibility, Mart print, historical migration, dispatch lock, and advanced reports can follow after MVP if the business can run those through the legacy app temporarily.

## Open Decisions

- Should the module name shown to users be "Docking" or "Sales Dispatch Out"?
- Does docking need to support SAP stock transfers (`OWTR`) on day one, or only A/R invoices (`OINV`)?
- Is exact legacy gatepass print layout required?
- Is geolocation mandatory for truck photo?
- Should old docking history be imported before go-live or kept read-only in the legacy app?
- Is JSAP mirror update still used by downstream systems?
- Should `gupta_invoice.php` become a special case inside the same model or a separate workflow?
- Which legacy reports are truly operationally required?
