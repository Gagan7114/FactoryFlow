# Docking Remaining Implementation Plan

Date: 2026-05-19

Frontend repo: `D:\Test_CompanyJivo\FactoryFlow`

Backend repo: `D:\Test_CompanyJivo\factory_app_v2`

This plan covers the remaining work after the first Docking implementation pass. The main missing business shape is **multi-invoice docking**: one truck/load can carry multiple SAP A/R invoices under a single Docking entry, weighment, photo set, gatepass, and gate-out action.

## Confirmed Decisions

- Docking must support multiple invoices in one truck.
- SAP stock transfer can be read from SAP now.
- Docking should be built with SAP-posting-ready services and payloads, but production SAP writes must stay disabled until explicit sign-off.
- Test DB / test SAP-company posting is allowed when enabled by configuration.
- Docking users create/fill the full Docking flow.
- Gate users only see pending out entries in Gate > Sales Dispatch Out and Gate > BST Out, then mark them dispatched.
- Stock transfer remains part of Docking. Multi-document stock transfer can wait until the business confirms it is needed.
- Gatepass number is one per Docking truck/load, not one per invoice.
- Truck-level physical quantity/UOM stays on the gatepass; SAP quantities remain captured per SAP document/item.

Working decisions from the latest discussion:

- Different customers in one truck are possible in the existing dispatch/service GRPO design. The Docking UI should warn when selected invoices have different customers, but should not block unless operations later asks for a hard rule.
- Different e-way bills are possible. Store and print e-way bill per invoice/document; do not force a single header e-way bill for multi-invoice loads.
- JSAP mirror exists in the old PHP docking app and should be investigated before final production sign-off. It should not be assumed as part of MVP unless a downstream dependency is confirmed.
- The exact PHP report sign-off list is unknown. Build core operational reports first, then use operations sign-off to freeze the old PHP app.

## Current State

Implemented already:

- Backend `SalesDispatchGateOut` model, items, typed attachments, gatepass sequence, lock, reports, print, commit print, reject, cancel, and mark dispatched endpoints.
- Frontend Dispatch > Docking flow for invoice and stock transfer.
- Truck photo upload with geolocation validation.
- Weighment integration.
- Gatepass print with QR.
- Gate-only mark dispatched action for invoice and BST out.
- Gate dashboards for invoice dispatch out and BST out.

Current limitation:

- `SalesDispatchGateOut` is still modeled as one SAP document per Docking entry through `document_type`, `sap_doc_entry`, and `sap_doc_num` on the header.
- `SalesDispatchGateOutItem` lines are attached directly to the header, not to a specific SAP document child.
- Dispatch plan linkage is a single FK, not a set of invoice plans.

## Findings From Existing Dispatch And Service GRPO

Existing dispatch planning already supports linking multiple invoices to one vehicle booking set:

- Backend: `factory_app_v2/dispatch_plans/services.py`
- `DispatchPlansService.update_linked_plans(...)` accepts `linked_invoice_doc_entries`.
- It fetches the selected SAP bills and enforces that they belong to the same SAP branch.
- It does not enforce same customer.
- It copies shared vehicle, bilty, driver, transporter, and freight context to each selected invoice plan.
- It allocates freight across the selected invoices.

Existing Service GRPO already treats related invoices as a bilty/truck/transporter group:

- Backend: `factory_app_v2/grpo/services.py`
- `_service_group_key(...)` groups by bilty number, bilty date, linked vehicle/vehicle number, and transporter.
- `_get_service_group_plans(...)` loads all booked plans in that group.
- Customer is not part of the grouping key.
- `get_service_grpo_preview_data(...)` returns `invoice_lines[]`, one line per invoice/plan, with customer code/name, invoice number, SAP doc entry/num, litres, weight, amount, and freight.
- For multi-invoice GRPO preview, the header-level `invoice_number` and `eway_bill` are blank. Invoice-specific values live on the invoice lines.
- `post_service_grpo(...)` builds one SAP service GRPO with one service line per invoice/plan.
- Each SAP service line can carry invoice/customer/e-way details through line fields such as `U_CardCode`, `U_ARNO`, and `U_Remarks`.

Conclusion for Docking:

- Multi-invoice Docking should follow the same branch-level rule as dispatch planning.
- Same-customer should be a warning, not a blocker, unless operations later gives a stricter rule.
- E-way bill should be stored per selected invoice/document and shown per invoice in print.
- One truck/load should still get one Docking entry, one weighment, one photo set, one gatepass, and one gate-out action.

## Target Shape

Treat `SalesDispatchGateOut` as the **truck/load header**.

Add a child model for the SAP documents carried by that truck:

`SalesDispatchGateOutDocument`

Required fields:

- `sales_dispatch`
- `document_type`
- `sap_doc_entry`
- `sap_doc_num`
- `sap_doc_date`
- `sap_doc_total`
- branch/company snapshot
- customer/destination snapshot
- ship-to/address/GST/e-way snapshot
- warehouse/base refs
- totals: quantity, litres, boxes, SAP weight
- optional `dispatch_plan`
- item summary
- created/updated audit

Update `SalesDispatchGateOutItem`:

- Add FK to `SalesDispatchGateOutDocument`.
- Keep FK to `SalesDispatchGateOut` for convenient querying.
- Store doc identifiers on each line if needed for reports/print performance.

Keep selected document summary fields on `SalesDispatchGateOut` only as denormalized compatibility fields:

- Primary document type/number.
- Combined document numbers.
- Combined item summary.
- Aggregated totals.

Backend should treat the child document rows as the canonical source.

## Business Rules

### Multi-Invoice

- One Docking entry can contain multiple `INVOICE` documents.
- All selected invoices share the same truck, driver, transporter, bilty, weighment, truck photo, attachments, gatepass, print commit, and gate out.
- All selected invoices must belong to the same SAP branch/company.
- If selected invoices have different customers, show a warning and require explicit confirmation before continuing.
- If selected invoices have different e-way bills, show them per invoice and include all of them in the printable gatepass document table.
- Duplicate active invoice protection moves from the header to the child document table.
- An invoice cannot be added to another active Docking entry if its status is `DOCKED`, `PHOTO_ATTACHED`, `READY_FOR_GATEPASS`, `GATEPASS_PRINTED`, `PRINT_COMMITTED`, or `DISPATCHED`.
- Rejected/cancelled invoices can be selected again through a fresh Docking entry.
- For the first build, do not mix `INVOICE` and `STOCK_TRANSFER` documents in one Docking entry.

### Stock Transfer

- Stock transfer lookup remains read-capable against SAP.
- Stock transfer Docking can stay single-document until the business confirms multi-transfer trucks.
- Stock-transfer posting services can be designed and payload-tested, but production posting must be disabled by default.
- Marking BST Out dispatched updates Factory state only.
- If test SAP posting is enabled, stock-transfer posting must write only to the configured test company/database.

### Dispatch Plan

- If selected invoices came from dispatch plans, each document child can link to its own `DispatchPlan`.
- Marking the Docking entry dispatched marks all linked dispatch plans as `DISPATCHED`.
- Service GRPO and transporter A/P invoice posting remain in the Dispatch module, not automatic Docking side effects.

### SAP Posting Strategy

Build the Docking SAP integration as if it can post, but make the write path explicit and gated.

Recommended setting:

```text
DOCKING_SAP_WRITE_MODE=READ_ONLY|SIMULATE|TEST_SAP|PRODUCTION
```

Mode behavior:

- `READ_ONLY`: default for production until sign-off. Docking can read SAP and build preview payloads, but cannot call Service Layer write endpoints.
- `SIMULATE`: records a local posting attempt/result and fake SAP doc identifiers, similar to the existing transporter A/P invoice simulation.
- `TEST_SAP`: permits real Service Layer writes only against configured test SAP company/database credentials.
- `PRODUCTION`: permits real production writes only after explicit business and technical sign-off.

Additional guardrails:

- Add a backend service boundary for Docking SAP writes instead of placing Service Layer calls inside views.
- Store every posting payload, mode, user, timestamp, response, and error.
- Provide a "build/preview payload" endpoint before any post endpoint.
- Add tests that prove production write calls are blocked in `READ_ONLY` and `SIMULATE`.
- Keep mark-dispatched as a Factory state transition; SAP posting should be an explicit step or service call, not an accidental side effect.

JSAP note:

- The old PHP docking project connects to a SQL Server database named `JSAP`.
- `mobile/gate_invoice2.php` mirrors gatepass generation into a `tbl_invoice_printing` table in JSAP.
- `mobile/gate_finalprint.php` mirrors `print_commit = 1` into JSAP.
- The old PHP README also documents JSAP as a mirror for print/gate status.
- What is still unknown is whether any current downstream process reads that mirror.
- If still required, implement it behind an adapter with retries, audit logging, and a feature flag.

## Implementation Phases

### Phase 1: Backend Multi-Document Schema

Backend files:

- `gate_core/models/sales_dispatch.py`
- `gate_core/models/__init__.py`
- `gate_core/admin.py`
- `gate_core/migrations/`
- `gate_core/serializers_sales_dispatch.py`
- `gate_core/views_sales_dispatch.py`
- `gate_core/tests.py`

Tasks:

1. Add `SalesDispatchGateOutDocument`.
2. Add `document` FK to `SalesDispatchGateOutItem`.
3. Add indexes:
   - company + document type + SAP doc entry.
   - sales dispatch + document type.
   - document + line number.
4. Add duplicate active document validation on `SalesDispatchGateOutDocument`.
5. Add a data migration:
   - For every existing `SalesDispatchGateOut`, create one child document row from existing header fields.
   - Link existing item rows to that new child document.
6. Keep old header doc fields for now so current screens do not break.
7. Add serializer fields:
   - `documents: SalesDispatchGateOutDocument[]`
   - `document_count`
   - `document_numbers`
   - `primary_document`
8. Update admin display to show document count and document numbers.

Acceptance:

- Existing single-document entries still load.
- New document rows are created for old entries.
- Duplicate invoice selection is blocked across active Docking entries.

### Phase 2: Backend Multi-Document APIs

Backend files:

- `gate_core/serializers_sales_dispatch.py`
- `gate_core/views_sales_dispatch.py`
- `gate_core/services/sales_dispatch_documents.py`
- `gate_core/tests.py`

Tasks:

1. Replace create payload with:

```json
{
  "documents": [
    {
      "document_type": "INVOICE",
      "sap_doc_entry": 123,
      "dispatch_plan_id": 456
    }
  ],
  "vehicle_id": 1,
  "driver_id": 2,
  "bilty_no": "...",
  "gate_out_date": "2026-05-19"
}
```

2. Keep the current single-document payload temporarily for backward compatibility.
3. Fetch and snapshot each selected SAP document.
4. Reject mixed invoice/stock-transfer selections.
5. Enforce same SAP branch/company for all invoices in one Docking entry.
6. Return warnings when selected invoices have different customers or different e-way bills.
7. Aggregate header totals and summaries.
8. Create item rows grouped under their document rows.
9. Update mark-dispatched to update all linked dispatch plans.
10. Update report/list filters to search across child documents.
11. Add optional document-management endpoints before print:
   - Add document to Docking entry.
   - Remove document from Docking entry.
   - Only allowed before `GATEPASS_PRINTED`.
12. Add a payload-preview service shape for future SAP posting, but block real writes unless the configured mode allows them.

Acceptance:

- Create one Docking entry from two or more invoices.
- Items and totals from all invoices are visible in one detail response.
- Dispatching one Docking entry closes all linked dispatch plans.
- Same-branch violations are blocked.
- Different-customer selections show a warning path instead of failing silently.

### Phase 3: Frontend Multi-Invoice Selection

Frontend files:

- `src/modules/gate/api/salesDispatch/salesDispatch.api.ts`
- `src/modules/gate/api/salesDispatch/salesDispatch.queries.ts`
- `src/modules/gate/pages/customerSalesFlow/SalesDispatchNewPage.tsx`
- `src/modules/gate/pages/customerSalesFlow/SalesDispatchDetailPage.tsx`
- `src/modules/gate/pages/customerSalesFlow/SalesDispatchGatepassPage.tsx`
- `src/modules/gate/pages/customerSalesFlow/SalesDispatchDashboardPage.tsx`
- `src/modules/gate/pages/bstOutPages/BSTOutDashboardPage.tsx`

Tasks:

1. Add frontend types for `SalesDispatchDocumentSnapshot`.
2. Change create request to support `documents[]`.
3. In Docking New:
   - Allow multi-select for invoices.
   - Show selected invoice tray/table.
   - Show doc number, date, customer, e-way bill, amount, SAP weight, and item summary.
   - Warn if selected invoices belong to different customers.
   - Show per-invoice e-way bill values when they differ.
   - Prevent mixing invoice and stock transfer in one entry.
   - Keep stock transfer single-select for now.
4. Use one vehicle/driver/transporter/bilty form for the whole selected invoice set.
5. Show combined SAP items grouped by invoice.
6. Show document count and document numbers on dashboards.
7. Update gatepass page:
   - Show all invoices carried by the truck.
   - Group item lines by invoice.
   - QR payload should identify the Docking entry/gatepass and include document list.

Acceptance:

- User can select multiple invoices and create one Docking entry.
- User can refresh/resume the flow and still see all selected invoices.
- Gate user sees the single pending truck/load, not separate rows for each invoice.
- User can see why a multi-customer selection is unusual before proceeding.

### Phase 4: Gatepass Print Layout Approval

Files:

- `src/modules/gate/pages/customerSalesFlow/SalesDispatchGatepassPage.tsx`
- `src/index.css`
- backend serializers if a print payload endpoint is added.

Tasks:

1. Update browser print layout for multi-invoice:
   - Header: truck, driver, transporter, gatepass, QR.
   - Document table: invoice number/date/customer/e-way/amount/weight.
   - Item table: grouped or condensed lines.
   - Weighment and physical quantity fields.
   - One QR for the truck/load gatepass.
2. Keep print to one page when possible, but allow a second page for very large item sets if operations accepts it.
3. Get sign-off using real invoice examples.
4. Decide whether browser print is enough or a backend HTML/PDF endpoint is needed.

Acceptance:

- Operations confirms gatepass columns and layout.
- QR is visible and scannable.
- Multi-invoice truck gatepass is readable.

### Phase 5: Stock Transfer And Posting Guardrails

Backend files:

- `gate_core/services/sales_dispatch_documents.py`
- `gate_core/services/sales_dispatch_sap_posting.py`
- `gate_core/views_sales_dispatch.py`
- `gate_core/tests.py`
- `config/settings.py`

Frontend files:

- `SalesDispatchNewPage.tsx`
- `SalesDispatchGatepassPage.tsx`
- `BSTOutDashboardPage.tsx`

Tasks:

1. Confirm `OWTR`/`WTR1` fields returned by SAP reader.
2. Add tests/mocks for stock-transfer document lookup and detail snapshot.
3. Confirm UI labels say BST/Stock Transfer instead of invoice where appropriate.
4. Add `DOCKING_SAP_WRITE_MODE` setting with `READ_ONLY` as the safe default.
5. Add posting service skeletons that can build payloads without sending them.
6. Guard against accidental production SAP posting:
   - No Service Layer POST/PATCH from Docking in `READ_ONLY`.
   - No real Service Layer POST/PATCH in `SIMULATE`.
   - Mark dispatched remains Factory-local.
7. Add a clear code comment/service boundary that stock transfer production posting is disabled until sign-off.

Acceptance:

- A stock transfer can be searched/read from SAP.
- A local Docking entry can be created from the read-only SAP snapshot.
- No SAP write call is made by Docking unless the configured write mode explicitly allows it.
- Test mode can build and store the payload that would be posted.

### Phase 6: SAP Posting Test Mode

Backend files:

- `gate_core/models/sales_dispatch.py`
- `gate_core/services/sales_dispatch_sap_posting.py`
- `gate_core/serializers_sales_dispatch.py`
- `gate_core/views_sales_dispatch.py`
- `gate_core/tests.py`
- `sap_client/client.py` only if a missing Service Layer helper is needed.

Tasks:

1. Add a Docking SAP posting/audit model if posting attempts need persistence separate from `SalesDispatchGateOut`.
2. Build payload preview endpoints for each needed posting action.
3. Add `SIMULATE` mode:
   - Persist payload.
   - Mark local posting status as simulated.
   - Return fake SAP identifiers in a clearly simulated range.
4. Add `TEST_SAP` mode:
   - Require explicit test company/database configuration.
   - Refuse to run if the target looks like production.
   - Persist request and SAP response.
5. Keep production mode disabled until sign-off.

Acceptance:

- Developers can test the complete posting path without touching production SAP.
- Test SAP writes are impossible unless the test mode and test target are both configured.
- Production mode has tests proving it is opt-in only.

### Phase 7: BST Downstream Linkage

Files:

- `src/modules/gate/pages/bstInPages/*`
- `src/modules/gate/api/bstIn/*`
- `src/modules/gate/api/bstOut/*`
- backend BST eligible-out APIs if needed.

Tasks:

1. Decide whether BST In should consume:
   - New `SalesDispatchGateOut` stock-transfer entries, or
   - Legacy `BSTGateOutEntry` rows.
2. Preferred path: let BST In eligible-outs include dispatched Docking stock-transfer entries.
3. Add API adapter or backend endpoint to expose Docking stock-transfer entries as eligible BST In records.
4. Preserve existing BST In UI behavior while switching source data.
5. Ensure only `DISPATCHED` stock-transfer Docking entries appear for BST In.

Acceptance:

- Stock transfer Docking out can later be selected in BST In.
- Old BST In screens do not break.

### Phase 8: Permissions And Role Hardening

Backend:

- Enforce granular permissions per action:
  - Create Docking.
  - Upload photo/documents.
  - Print gatepass.
  - Commit print.
  - Mark dispatched.
  - Reject.
  - Cancel.
  - Manage lock.
  - View reports.

Frontend:

- Hide/disable actions based on the same permissions.
- Ensure Dispatch/Docking users cannot mark dispatched.
- Ensure Gate users cannot create/modify Docking capture fields from Gate Out screens.

Acceptance:

- Unauthorized action calls fail in API tests.
- UI only shows actions valid for the role.

### Phase 9: Reports And Recovery

Reports to build:

- Waiting inside.
- Missing photo/GPS.
- Gatepass printed but not committed.
- Ready for gate dispatch.
- Dispatched.
- Truck vs invoices with photo.
- Truck status with photo.
- Rejected/cancelled entries.
- CSV export if operations needs Excel-style reporting.

Recovery:

- Re-entry after rejection.
- Clear duplicate behavior for cancelled/rejected documents.
- Optional empty truck return link if operations needs it.

Acceptance:

- Operations can replace the daily PHP docking reports from Factory.
- Rejected/cancelled documents can be handled without manual database fixes.

## Testing Plan

Backend tests:

- Create multi-invoice Docking entry.
- Create stock-transfer Docking entry from read-only SAP fixture.
- Block mixed invoice + stock-transfer selection.
- Block multi-invoice selections across different SAP branches.
- Return warnings for multi-customer and multi-e-way selections.
- Block duplicate active invoice across Docking entries.
- Migrate old single-document rows into document children.
- Upload photo with geolocation.
- Gatepass print and commit.
- Dispatch updates all linked dispatch plans.
- Mark dispatched does not post to SAP.
- SAP posting preview builds payloads without writing in `READ_ONLY`.
- `SIMULATE` posting stores a simulated result and never calls Service Layer.
- `TEST_SAP` posting refuses to run without test target configuration.
- Permissions block forbidden role actions.

Frontend validation:

- Multi-select invoice create flow.
- Multi-customer warning flow.
- Per-invoice e-way bill display.
- Resume flow after refresh.
- Item/document display on detail and gatepass.
- Print preview with multiple invoices.
- Gate Sales Dispatch Out pending row opens mark-dispatched page.
- Gate BST Out pending row opens mark-dispatched page.

## Suggested Build Order

1. Backend multi-document migration and serializers.
2. Backend multi-document create/list/detail APIs.
3. Frontend API types and multi-select Docking New page.
4. Detail/gatepass/document item grouping.
5. Gatepass print layout sign-off.
6. Stock-transfer validation and SAP posting guardrails.
7. SAP posting simulation/test-mode path.
8. BST In source linkage.
9. Permission hardening.
10. Reports and recovery polish.

## Resolved Or Working Answers

- Multi-invoice trucks are in scope.
- Same SAP branch/company is required for all invoices in one Docking entry.
- Different customers should warn, not block, because existing dispatch/service GRPO grouping does not require same customer.
- Different e-way bills should be stored and printed per invoice/document.
- Stock transfer remains single-document for now.
- Physical quantity/UOM is truck/load-level for gatepass; SAP quantities remain per document/item.
- Gatepass number is one per truck/load.
- SAP posting should be built as a real service/payload path, but production writes stay disabled until sign-off.

## Remaining Unknowns

- Whether stock transfers can later be multi-document.
- Whether JSAP mirror is still used by any downstream system.
- Which exact reports must be signed off before PHP docking is frozen.
- Whether operations wants a hard same-customer block after seeing the warning flow.
