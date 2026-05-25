# Barcode Dispatch System Design

> Technical design for a barcode-based dispatch workflow integrated with SAP.
> Initial assumption: the user enters an SAP billing document or invoice number.
> Target recommendation: use the SAP outbound delivery as the final dispatch
> object whenever it is available.

## Goals

- Fetch bill or delivery details from SAP through the backend only.
- Create a local dispatch session with a complete immutable SAP snapshot.
- Force item lines to be scanned in bill sequence.
- Reject wrong item scans, duplicate serial scans, and over-quantity scans.
- Store every accepted and rejected scan as an audit record.
- Mark dispatch complete only after all required lines are fully scanned.
- Update SAP dispatch status when the SAP API/configuration supports it.
- Keep local dispatch status as the source of workflow truth when SAP cannot be
  updated.

## Non-Goals

- Frontend-to-SAP calls. SAP credentials and URLs must never reach the browser.
- Financial posting from scanned labels unless the SAP team explicitly approves
  the target object and API.
- Replacing SAP as the source of truth for bill, customer, delivery, or
  accounting data.
- Complex route planning, transporter billing, proof of delivery, or e-way bill
  generation in the MVP.

## System Architecture

```text
Scanner / Browser
  |
  | HTTPS + JWT
  v
FactoryFlow Frontend
  |
  | /api/v1/dispatch/*
  v
Backend Dispatch Module
  |-- DispatchSessionService
  |-- DispatchScanValidator
  |-- BarcodeLookupService
  |-- SapDispatchAdapter
  |
  | App DB
  |-- dispatch_session
  |-- dispatch_session_line
  |-- dispatch_scan_log
  |-- dispatch_scanned_unit
  |-- dispatch_sap_sync_log
  |
  | Backend-only SAP connection
  v
SAP
  |-- S/4HANA OData / CDS / custom API
  |-- ECC RFC / BAPI / IDoc / custom ABAP API
  |-- SAP Business One Service Layer / HANA read
```

### Component Responsibilities

| Component | Responsibility |
| --- | --- |
| Frontend dispatch screen | Bill entry, session progress, scanner input, errors, completion action |
| Backend dispatch API | Auth, validation, transactions, scan logging, session lifecycle |
| SAP adapter | Product-specific bill/delivery lookup and optional status update |
| Barcode lookup service | Resolves QR/raw barcode to box, pallet, serial, item, batch, qty, UOM |
| Dispatch validator | Enforces sequence, material, quantity, duplicate, status, and audit rules |
| App database | Session state, SAP response snapshot, scans, rejection reasons, SAP sync attempts |

## User Workflow

1. User opens the dispatch screen.
2. User enters a bill number.
3. Frontend calls backend `POST /dispatch/bills/lookup/`.
4. Backend queries SAP for the bill/invoice and, if available, the linked
   outbound delivery.
5. Backend rejects the request if SAP does not find the bill.
6. Backend rejects the request if SAP or the local system says the bill is
   already dispatched.
7. Backend creates a dispatch session and line records from the SAP response.
8. Frontend shows bill header, customer, delivery reference, and item lines.
9. User scans item 1 labels until scanned quantity equals bill quantity.
10. User cannot scan item 2 until item 1 is complete.
11. Every scan is sent to `POST /dispatch/sessions/{id}/scans/`.
12. Backend accepts or rejects the scan and stores the scan log either way.
13. When all lines are complete, frontend enables "Mark Dispatched".
14. User confirms dispatch.
15. Backend marks local session as dispatched.
16. Backend tries SAP update if configured.
17. If SAP update succeeds, session is `DISPATCHED`.
18. If SAP update is unavailable or fails after retries, session remains locally
    dispatched with `sap_update_status = PENDING` or `FAILED`.

## Dispatch Status Model

| Status | Meaning |
| --- | --- |
| `DRAFT` | Session created from SAP bill but no scans accepted |
| `IN_PROGRESS` | At least one accepted scan exists |
| `SCANNING_COMPLETE` | All bill quantities are scanned, awaiting final confirmation |
| `DISPATCHED` | Local dispatch completed and SAP update completed or not required |
| `SAP_UPDATE_PENDING` | Local dispatch completed, SAP update queued |
| `SAP_UPDATE_FAILED` | Local dispatch completed, SAP update failed and needs retry |
| `CANCELLED` | Session cancelled before dispatch |

## Database Schema

The names below are proposed Django model/table names. All tables should include
`company`, `created_at`, `created_by`, `updated_at`, and `updated_by` where the
existing backend convention supports it.

### `dispatch_session`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK | Internal session ID |
| `company_id` | FK/string | Company scope |
| `bill_number` | varchar | User-entered SAP billing/invoice number |
| `sap_system_type` | enum | `S4HANA`, `ECC`, `BUSINESS_ONE` |
| `sap_object_type` | enum | `BILLING_DOCUMENT`, `AR_INVOICE`, `OUTBOUND_DELIVERY` |
| `sap_doc_entry` | varchar nullable | SAP internal key when available |
| `sap_doc_num` | varchar nullable | SAP display number |
| `reference_delivery_number` | varchar nullable | Preferred final dispatch object |
| `customer_code` | varchar | From SAP |
| `customer_name` | varchar | From SAP |
| `ship_to_code` | varchar nullable | From SAP if available |
| `ship_to_name` | varchar nullable | From SAP if available |
| `bill_date` | date nullable | From SAP |
| `status` | enum | Session lifecycle status |
| `sap_dispatch_status` | varchar nullable | Raw SAP status if returned |
| `sap_update_status` | enum | `NOT_CONFIGURED`, `PENDING`, `SUCCESS`, `FAILED` |
| `sap_update_error` | text nullable | Last SAP update failure |
| `sap_snapshot` | jsonb | Immutable SAP header + lines response at session creation |
| `started_at` | timestamptz nullable | First accepted scan time |
| `completed_at` | timestamptz nullable | All lines completed time |
| `dispatched_at` | timestamptz nullable | Final dispatch confirmation time |
| `dispatched_by_id` | FK nullable | User who marked dispatched |
| `cancelled_at` | timestamptz nullable | Cancel time |
| `cancel_reason` | text nullable | Required on cancel |

Constraints:

- Unique active session per `company_id + bill_number` where status is not
  `CANCELLED`.
- Index `company_id, bill_number`.
- Index `company_id, status, created_at`.

### `dispatch_session_line`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK | Internal line ID |
| `session_id` | FK | Dispatch session |
| `sequence_no` | integer | Scan order. Item 1 must complete before item 2 |
| `sap_line_no` | varchar | SAP line key |
| `material_code` | varchar | SAP item/material code |
| `material_description` | text | SAP item description |
| `bill_qty` | decimal | Required bill quantity |
| `scanned_qty` | decimal | Accepted quantity so far |
| `uom` | varchar | SAP UOM |
| `batch_number` | varchar nullable | Required match if SAP bill/delivery has batch |
| `warehouse_code` | varchar nullable | Source/loading warehouse if available |
| `serial_required` | boolean | True if serial-level tracking is required |
| `status` | enum | `PENDING`, `IN_PROGRESS`, `COMPLETE` |

Constraints:

- Unique `session_id + sequence_no`.
- Unique `session_id + sap_line_no`.
- Check `scanned_qty <= bill_qty`.

### `dispatch_scan_log`

Stores every scan attempt, accepted or rejected.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK | Scan log ID |
| `session_id` | FK | Dispatch session |
| `line_id` | FK nullable | Active or matched line when known |
| `raw_barcode` | text | Exact scanner input |
| `parsed_barcode` | jsonb nullable | Parsed QR/label payload |
| `entity_type` | enum nullable | `BOX`, `PALLET`, `SERIAL`, `UNKNOWN` |
| `entity_id` | varchar nullable | Box/pallet/serial ID |
| `material_code` | varchar nullable | Material resolved from barcode |
| `batch_number` | varchar nullable | Batch resolved from barcode |
| `qty` | decimal nullable | Quantity represented by scan |
| `uom` | varchar nullable | Barcode UOM |
| `result` | enum | `ACCEPTED`, `REJECTED` |
| `reject_code` | varchar nullable | Machine-readable reason |
| `reject_message` | text nullable | User-facing reason |
| `device_id` | varchar nullable | Scanner/browser device ID |
| `ip_address` | inet nullable | Request source |
| `scanned_by_id` | FK | User |
| `scanned_at` | timestamptz | Scan timestamp |
| `request_id` | uuid | Idempotency and tracing |

Indexes:

- `session_id, scanned_at`
- `session_id, result`
- `session_id, reject_code`
- `raw_barcode`

### `dispatch_scanned_unit`

Stores accepted physical units for duplicate prevention and traceability.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK | Unit ID |
| `session_id` | FK | Dispatch session |
| `line_id` | FK | Dispatch line |
| `scan_log_id` | FK | Accepted scan log |
| `barcode_value` | varchar | Unique accepted barcode in session |
| `entity_type` | enum | `BOX`, `PALLET`, `SERIAL` |
| `box_id` | FK nullable | If scanned unit is a box |
| `pallet_id` | FK nullable | If scanned unit is a pallet |
| `serial_number` | varchar nullable | If serial tracking is used |
| `material_code` | varchar | Resolved material |
| `batch_number` | varchar nullable | Resolved batch |
| `qty` | decimal | Accepted quantity |
| `uom` | varchar | Accepted UOM |

Constraints:

- Unique `session_id + barcode_value`.
- Unique `session_id + serial_number` where `serial_number` is not null.

### `dispatch_sap_sync_log`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK | Sync attempt ID |
| `session_id` | FK | Dispatch session |
| `operation` | varchar | `UPDATE_DISPATCH_STATUS`, `POST_GI`, `PATCH_UDF` |
| `request_payload` | jsonb | Sanitized SAP request |
| `response_payload` | jsonb nullable | Sanitized SAP response |
| `status` | enum | `PENDING`, `SUCCESS`, `FAILED` |
| `error_message` | text nullable | Failure details |
| `attempt_no` | integer | Retry count |
| `created_at` | timestamptz | Attempt timestamp |

## Backend API Endpoints

Base path: `/api/v1/dispatch/`

### Lookup Bill

```http
POST /dispatch/bills/lookup/
```

Request:

```json
{
  "bill_number": "9000123456"
}
```

Behavior:

- Calls SAP through the backend adapter.
- Rejects if not found.
- Rejects if already dispatched in SAP or locally.
- Returns normalized bill data but does not create a session.

Response:

```json
{
  "bill_number": "9000123456",
  "reference_delivery_number": "8000123456",
  "customer": {
    "code": "CUST001",
    "name": "ABC Traders"
  },
  "status": "OPEN",
  "lines": [
    {
      "sequence_no": 1,
      "sap_line_no": "10",
      "material_code": "FG0000047",
      "description": "Mustard Oil 1L",
      "bill_qty": "100.000",
      "uom": "PCS"
    }
  ]
}
```

### Create Dispatch Session

```http
POST /dispatch/sessions/
```

Request:

```json
{
  "bill_number": "9000123456"
}
```

Behavior:

- Re-validates bill in SAP.
- Creates `dispatch_session` and `dispatch_session_line` records in a database
  transaction.
- Stores the SAP response in `sap_snapshot`.
- Returns an existing active session for the same bill if policy allows resume.

### Get Session

```http
GET /dispatch/sessions/{session_id}/
```

Returns header, customer, active line, line progress, accepted scans, rejected
scan count, and final dispatch eligibility.

### Submit Scan

```http
POST /dispatch/sessions/{session_id}/scans/
```

Request:

```json
{
  "barcode": "{\"type\":\"BOX\",\"box_barcode\":\"BOX-20260417-L4-0001\"}",
  "device_id": "scanner-01",
  "request_id": "d1a0d48e-6df8-4e0d-bd9c-9cd5d4f0bc36"
}
```

Response for accepted scan:

```json
{
  "result": "ACCEPTED",
  "line_id": 101,
  "accepted_qty": "20.000",
  "line_scanned_qty": "20.000",
  "line_bill_qty": "100.000",
  "session_status": "IN_PROGRESS",
  "next_required_line": {
    "sequence_no": 1,
    "material_code": "FG0000047",
    "remaining_qty": "80.000"
  }
}
```

Response for rejected scan:

```json
{
  "result": "REJECTED",
  "reject_code": "WRONG_MATERIAL",
  "message": "Scanned material FG0000099 does not match current item FG0000047.",
  "next_required_line": {
    "sequence_no": 1,
    "material_code": "FG0000047",
    "remaining_qty": "100.000"
  }
}
```

### Mark Dispatched

```http
POST /dispatch/sessions/{session_id}/dispatch/
```

Behavior:

- Requires all lines complete.
- Locks session and lines.
- Marks local status dispatched.
- Calls SAP update if enabled.
- Returns SAP sync result.

### Retry SAP Update

```http
POST /dispatch/sessions/{session_id}/sap-sync/retry/
```

Supervisor-only endpoint to retry failed SAP update.

### Cancel Session

```http
POST /dispatch/sessions/{session_id}/cancel/
```

Request:

```json
{
  "reason": "Wrong bill selected"
}
```

Allowed only before final dispatch.

### Audit Logs

```http
GET /dispatch/sessions/{session_id}/scan-logs/
GET /dispatch/sessions/{session_id}/sap-sync-logs/
GET /dispatch/sessions/?status=IN_PROGRESS&bill_number=9000123456
```

## SAP Integration Options

The backend should hide SAP product differences behind one interface:

```text
SapDispatchAdapter
  lookup_bill(bill_number) -> NormalizedDispatchBill
  is_already_dispatched(normalized_bill) -> bool
  update_dispatch_status(session) -> SapUpdateResult
```

### S/4HANA

Preferred approach:

- Read billing document header/items through released OData APIs such as billing
  document APIs or customer-specific CDS/OData views.
- Read linked outbound delivery from document flow when available.
- Use outbound delivery APIs as the final dispatch object.
- If physical dispatch means post goods issue, use the approved outbound
  delivery goods movement API/action configured by the SAP team.
- If physical dispatch is only an operational status, write to an approved
  custom field/status extension on the delivery, or store status locally.

Recommended object priority:

1. Outbound delivery
2. Sales order delivery schedule/pick list if delivery is not created yet
3. Billing document/invoice only as an input lookup key

### SAP ECC

Preferred approach:

- Use a custom RFC/BAPI wrapper owned by the SAP team for lookup and update.
- Read billing from `VBRK/VBRP`.
- Read delivery from `LIKP/LIPS` and document flow from `VBFA`.
- For delivery completion or PGI, use the SAP team's approved BAPI, RFC, or
  transaction wrapper. Do not update tables directly.
- For asynchronous integration, use IDoc-based status exchange if that is the
  existing SAP standard in the landscape.

Recommended object priority:

1. Outbound delivery (`LIKP/LIPS`)
2. Sales order (`VBAK/VBAP`) if delivery is not available
3. Billing document (`VBRK/VBRP`) as a lookup key only

### SAP Business One

Preferred approach for the current FactoryFlow landscape:

- Read AR invoice from Service Layer `Invoices` or HANA tables `OINV/INV1`.
- Read linked delivery note from `DeliveryNotes` or HANA tables `ODLN/DLN1`.
- Use delivery note as the dispatch object when it exists.
- If a user-defined field is approved, update a dispatch UDF on the delivery or
  invoice through Service Layer.
- If SAP Business One does not allow the required status update, store local
  status and keep the SAP document numbers for audit.

Recommended object priority:

1. Delivery Note (`ODLN/DLN1`, Service Layer `DeliveryNotes`)
2. Pick List (`OPKL/PKL1`, Service Layer `PickLists`) if dispatch is tied to
   picking
3. AR Invoice (`OINV/INV1`, Service Layer `Invoices`) as input lookup key

## Normalized SAP Bill Contract

All SAP adapters must return the same shape to the dispatch service:

```json
{
  "source_system": "BUSINESS_ONE",
  "bill_number": "9000123456",
  "bill_internal_id": "12345",
  "bill_date": "2026-05-23",
  "already_dispatched": false,
  "reference_delivery_number": "8000123456",
  "customer": {
    "code": "CUST001",
    "name": "ABC Traders",
    "ship_to_code": "SHIP001",
    "ship_to_name": "ABC Traders Warehouse"
  },
  "lines": [
    {
      "sequence_no": 1,
      "sap_line_no": "10",
      "material_code": "FG0000047",
      "material_description": "Mustard Oil 1L",
      "quantity": "100.000",
      "uom": "PCS",
      "batch_number": null,
      "warehouse_code": "BH-FG",
      "serial_required": false
    }
  ],
  "raw": {}
}
```

## Barcode Validation Logic

Validation must run inside a database transaction with row locks on the session
and active line.

```text
validate_scan(session_id, raw_barcode, user, request_id):
  session = lock dispatch_session

  if session.status in DISPATCHED, CANCELLED:
    reject SESSION_CLOSED

  active_line = first line where scanned_qty < bill_qty order by sequence_no
  if no active_line:
    reject SESSION_ALREADY_COMPLETE

  parsed = parse raw barcode
  resolved = lookup barcode entity
  if unresolved:
    reject BARCODE_NOT_FOUND

  if resolved.status is not dispatchable:
    reject BARCODE_NOT_DISPATCHABLE

  if resolved.material_code != active_line.material_code:
    if resolved.material_code belongs to a later session line:
      reject LINE_SEQUENCE_VIOLATION
    else:
      reject WRONG_MATERIAL

  if active_line.batch_number exists and resolved.batch_number != active_line.batch_number:
    reject WRONG_BATCH

  if active_line.serial_required:
    if resolved.serial_number missing:
      reject SERIAL_REQUIRED
    if serial already exists in dispatch_scanned_unit for session:
      reject DUPLICATE_SERIAL

  if resolved.barcode_value already exists in dispatch_scanned_unit for session:
    reject DUPLICATE_BARCODE

  scan_qty = normalize_uom(resolved.qty, resolved.uom, active_line.uom)
  remaining_qty = active_line.bill_qty - active_line.scanned_qty

  if scan_qty <= 0:
    reject INVALID_QUANTITY

  if scan_qty > remaining_qty:
    reject OVER_QUANTITY

  accept:
    insert dispatch_scan_log ACCEPTED
    insert dispatch_scanned_unit
    update line.scanned_qty += scan_qty
    update line.status
    update session.status
```

### Dispatchable Barcode Rules

| Entity | Dispatchable when |
| --- | --- |
| Box | Status is `ACTIVE` or approved equivalent, not void/dismantled/dispatched |
| Pallet | Status is `ACTIVE`, contents match one item/batch/UOM or SAP line policy allows mixed handling |
| Serial | Serial exists, belongs to expected material, and is not already used in this session |

### Pallet Scan Rules

MVP recommendation:

- Accept a pallet scan only if the pallet contains one material, one batch, and
  one UOM.
- Reject pallet scan if pallet quantity exceeds remaining line quantity.
- Reject mixed pallets unless a later version supports line-level expansion of
  boxes inside the pallet.

## Wrong Scan Prevention

Wrong scans must be prevented by backend logic, not only frontend UI.

Rules:

- The backend determines the active line as the first incomplete line.
- The frontend may visually lock later lines, but backend still rejects them.
- If a barcode belongs to item 2 while item 1 is incomplete, reject with
  `LINE_SEQUENCE_VIOLATION`.
- If a barcode belongs to an item not present in the bill, reject with
  `WRONG_MATERIAL`.
- If a barcode belongs to the correct material but wrong batch, reject with
  `WRONG_BATCH`.
- If quantity represented by a box/pallet exceeds the remaining line quantity,
  reject with `OVER_QUANTITY`.
- If a barcode or serial was already accepted in the session, reject with
  `DUPLICATE_BARCODE` or `DUPLICATE_SERIAL`.

## Error Handling

| Code | When | User Message |
| --- | --- | --- |
| `SAP_BILL_NOT_FOUND` | SAP lookup returns no bill | Bill not found in SAP. |
| `BILL_ALREADY_DISPATCHED` | SAP/local status says dispatched | This bill is already dispatched. |
| `SAP_UNAVAILABLE` | SAP timeout/auth/network failure | SAP is not reachable. Try again or contact support. |
| `SESSION_CLOSED` | Scan after dispatch/cancel | This dispatch session is closed. |
| `LINE_SEQUENCE_VIOLATION` | Later item scanned too early | Complete the current item before scanning the next item. |
| `WRONG_MATERIAL` | Material mismatch | Scanned barcode does not match the current bill item. |
| `WRONG_BATCH` | Batch mismatch | Scanned batch does not match the bill batch. |
| `OVER_QUANTITY` | Scan exceeds remaining qty | Scan quantity is greater than remaining bill quantity. |
| `DUPLICATE_BARCODE` | Same box/pallet scanned again | This barcode is already scanned for this bill. |
| `DUPLICATE_SERIAL` | Same serial scanned again | This serial number is already scanned for this bill. |
| `UOM_CONVERSION_MISSING` | Barcode UOM cannot convert to bill UOM | UOM conversion is not configured. |
| `SAP_UPDATE_FAILED` | Final SAP update fails | Dispatch saved locally, but SAP update failed. |

All rejected scans must be stored in `dispatch_scan_log` with the raw barcode,
parsed payload when possible, reason code, user, device, timestamp, and session.

## Security Model

- Frontend authenticates with the normal FactoryFlow JWT/session mechanism.
- SAP credentials are backend-only secrets in environment or secret manager.
- Frontend never receives SAP credentials, SAP hostnames, or raw auth tokens.
- All APIs enforce company scope.
- Suggested permissions:
  - `dispatch.view`
  - `dispatch.create`
  - `dispatch.scan`
  - `dispatch.dispatch`
  - `dispatch.cancel`
  - `dispatch.sap_retry`
  - `dispatch.audit_view`
- Dispatch and SAP retry actions require server-side permission checks.
- Every accepted/rejected scan logs user and device metadata.
- Use idempotency via `request_id` for scan submissions to avoid double scans
  from scanner key repeat or network retry.
- Use DB transactions and row locks to prevent concurrent over-scan.
- Mask sensitive customer data in logs where not needed.
- Store raw SAP response snapshots because they are audit evidence, but protect
  them with the same access rules as dispatch records.

## MVP Scope

Build first:

- Dispatch screen with bill number entry.
- Backend SAP bill lookup through configurable adapter.
- Session creation from SAP bill/invoice.
- Sequential line scanning.
- Box barcode validation.
- Optional pallet barcode validation only for single-material pallets.
- Reject wrong item, over quantity, duplicate barcode, duplicate serial.
- Complete accepted and rejected scan audit.
- Mark dispatched after all lines complete.
- Local dispatch status.
- SAP update hook with `NOT_CONFIGURED`, `PENDING`, `SUCCESS`, and `FAILED`
  states.
- Basic list/detail screens for in-progress and dispatched sessions.

Defer:

- Offline scanning.
- Mixed-material pallet expansion.
- Route/truck planning.
- Proof of delivery.
- E-way bill generation.
- Automated customer notification.
- Complex UOM conversions beyond approved SAP conversion mappings.
- Full SAP PGI posting unless SAP team confirms the exact object and API.

## Open Questions For SAP Team

1. Which SAP product is authoritative for dispatch in this company:
   S/4HANA, ECC, or SAP Business One?
2. Is the entered bill number an invoice/billing document number, AR invoice
   number, delivery number, or customer-facing bill number?
3. Can SAP return the linked outbound delivery for every bill?
4. Which object should be treated as final dispatch object: invoice, outbound
   delivery, pick list, sales order, or a custom document?
5. What SAP status currently means "already dispatched"?
6. Does billing happen before or after physical dispatch?
7. Is post goods issue already completed before the bill is printed?
8. If PGI is not completed, which SAP API/BAPI/Service Layer endpoint is
   approved to complete it?
9. If PGI is already completed, can we update a custom dispatch flag/UDF?
10. Are user-defined fields allowed on invoice or delivery documents?
11. Which fields must be returned in bill lookup: customer, ship-to, line item,
   batch, warehouse, UOM, delivery reference, status?
12. Are all dispatch items batch-managed, serial-managed, both, or neither?
13. Are serial numbers configured in SAP, app-only, or not used?
14. Are partial dispatches allowed against one bill?
15. Can one bill contain repeated material codes on multiple lines?
16. If repeated materials exist, should scan sequence follow SAP line number or
   material grouping?
17. What is the approved UOM conversion source?
18. Should scanning compare against invoice quantity, delivery quantity, or open
   quantity?
19. Should the app block dispatch if SAP stock is insufficient?
20. What should happen if SAP update fails after local dispatch is confirmed?
21. Is a background retry worker allowed for SAP status updates?
22. What audit fields does SAP require from FactoryFlow: user, timestamp,
   device, boxes, pallets, serials?
23. Is there an existing SAP IDoc/interface for dispatch confirmation?
24. What timeout and retry policy is acceptable for SAP calls?
25. Should bill lookup cache SAP responses, and if yes, for how long?

## Implementation Notes

- Keep SAP integration behind an adapter so the dispatch workflow does not care
  whether the backend talks to S/4HANA, ECC, or SAP Business One.
- Treat SAP response snapshots as immutable once a session starts. If SAP data
  changes, require a controlled refresh/cancel/recreate flow.
- Prefer delivery number over bill number for final status update because
  delivery is the logistics execution object. Billing/invoice is usually a
  financial document and may not be the right place to record physical dispatch.
- Enforce all critical rules on the backend. Frontend sequence locking is only
  a usability aid.
- Store rejected scans with the same rigor as accepted scans. Rejections are
  operational evidence and help identify training, label, and SAP-master-data
  issues.
