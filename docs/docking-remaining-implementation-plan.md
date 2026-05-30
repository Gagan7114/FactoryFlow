# Docking Remaining Implementation Plan

Updated: 2026-05-25

Frontend repo: `D:\Test_CompanyJivo\FactoryFlow`

Backend repo: `D:\Test_CompanyJivo\factory_app_v2`

## Confirmed Decisions

- User-facing Docking work lives in the **Dispatch module** under `/dispatch/docking`.
- Gate users still use gate-side routes only for final security actions such as marking a committed vehicle out.
- Gatepass reprint must be a separate audited workflow in the Dispatch module, not a normal browser reprint from the original gatepass page.
- Gatepass print layout must match the SAP gatepass layout shared with the team. Do not invent a new layout unless operations signs off.
- Docking is linked to Dispatch Vehicle Linking.
- After vehicle linking marks an invoice group as `BOOKED`, that booked vehicle group must appear on the Docking dashboard as `Pending`.
- Starting Docking from a pending booked group creates or opens one Docking truck/load entry.
- Multi-invoice booked groups stay together as one Docking truck/load.
- Dispatch vehicle-linking and Docking dashboard integration covers the previous "deep link" requirement.
- Docking SAP write/posting support can wait.
- FactoryFlow should talk only to SAP for this workflow. Do not build JSAP or other external app mirror integrations.
- BST downstream linkage is required.
- All operational reports listed below are in scope.

## Current State

Already implemented or mostly implemented:

- Backend `SalesDispatchGateOut` persistence.
- Backend `SalesDispatchGateOutDocument` child model for multi-document Docking.
- Backend item, attachment, gatepass sequence, dispatch lock, print, print commit, audited reprint, print history, reject, cancel, dispatch, and report endpoints.
- Backend action-level permissions are enforced on Docking APIs, with tests covering unauthorized access.
- Frontend Docking routes under `/dispatch/docking`.
- Frontend Docking create, weighment, attachment/photo, gatepass, detail, and dashboard pages.
- SAP invoice and stock-transfer lookup.
- Multi-invoice selection for invoices.
- Truck photo upload with GPS.
- Weighment readiness check.
- Gatepass original print is limited to one recorded print.
- Backend audited reprint endpoint and print history endpoint.
- Frontend Dispatch reprint route/page at `/dispatch/docking/:entryId/reprint`.
- Original gatepass page links to the audited Dispatch reprint workflow after the first print is recorded.
- Docking detail page shows SAP documents separately and groups item lines by document/invoice.
- Gate-side pending out flow for committed invoice dispatches.
- Vehicle-linked `BOOKED` dispatch plans are exposed as pending Docking rows.
- Docking dashboard merges pending vehicle-linked bookings with real Docking entries.
- Starting Docking from a pending booked group carries forward vehicle, driver, transporter, bilty, and selected invoice documents.
- Duplicate active Docking rows are blocked for already docked documents/plans.
- BST Out dashboard reads Docking-created stock-transfer entries.
- BST In eligibility now reads dispatched Docking stock-transfer entries and creates receiving entries linked back to the Docking source.

## Phase Completion Tracker

| Build phase                                               | Status      | Notes                                                                                                                                            |
| --------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dispatch-module reprint UI                                | Done        | Route, page, reason form, printer name, print history, backend audited reprint call, and original-gatepass handoff are implemented.              |
| Frontend action permission hardening                      | Done        | Permission constants, route guards, and Docking action buttons now check permissions, including reject and report/export actions.                |
| SAP-matched gatepass print layout                         | In progress | Redundant/internal fields, document table, per-document values, and grouped item lines are implemented; remaining work is final visual sign-off. |
| Multi-invoice detail/gatepass polish                      | Done        | Multi-document backend, create flow, dashboard document display, detail grouping, and gatepass grouping are implemented.                         |
| BST In eligibility from dispatched stock-transfer Docking | Done        | BST Out reads Docking stock-transfer entries; BST In eligibility and creation now use dispatched Docking stock-transfer sources.                 |
| Reports and CSV/Excel export                              | Done        | Docking reports page, filtered report API lists, dashboard export, and report Excel export are implemented.                                      |
| Vehicle-linking regression polish                         | Partial     | Core pending booking flow works; resume/open wording and regression pass remain.                                                                 |
| SAP posting guardrails                                    | Deferred    | Explicitly later, after business sign-off.                                                                                                       |

## Remaining Work

### 1. Frontend Permission Hardening - Done

Backend permission records and action-level API enforcement are implemented.

Required permissions:

- View Docking entries.
- Create Docking entries.
- Upload truck photo and documents. Main action covered.
- Print original gatepass. Main action covered.
- Commit print. Main action covered.
- Reprint gatepass. Main action covered.
- Mark dispatched. Main action covered.
- Reject entry. Main action covered.
- Cancel entry. Main action covered.
- Manage Docking print lock. Main action covered.
- View reports. Dashboard/report export covered.

Acceptance:

- Frontend exposes constants for every backend Docking permission.
- Frontend hides or disables actions using the same permission model.
- API tests remain green for unauthorized users.

### 2. Dispatch Reprint Workflow - Done

The reprint UI exists inside the Dispatch module.

Recommended route:

- `/dispatch/docking/:entryId/reprint`

Implemented behavior:

- Show gatepass number, entry number, vehicle, driver, SAP documents, original printed user/time, and previous reprints.
- Require reprint reason.
- Optional printer name.
- Call the audited backend reprint endpoint.
- Open the print dialog only after the backend logs the reprint.
- Show print history after success.
- Original gatepass screen links users to this audited workflow once the original print exists.

Acceptance:

- Users cannot trigger a browser reprint from the original gatepass screen; it only hands off to the audited Dispatch reprint workflow.
- Every reprint has a reason and an audit log row.
- Reprint remains available only from Dispatch.

### 3. SAP-Matched Gatepass Layout

Use the SAP gatepass layout shared with the team as the target layout.

Required layout content:

- Company/header block. Implemented.
- Gatepass number and date. Implemented.
- Vehicle, driver, transporter, bilty/LR details. Implemented.
- Invoice/document table. Implemented on gatepass print.
- Per-invoice e-way bill details. Implemented when SAP e-way bill data exists.
- Customer/destination details. Implemented.
- Item summary or item lines grouped by invoice. Implemented on gatepass print.
- Weighbridge weight and SAP weight where available. Implemented.
- Physical quantity and UOM. Implemented when entered.
- Seal/PGI/goods issue reference. Implemented when entered.
- QR code/random code. Implemented.
- Printed/committed audit details where appropriate. Original printed timestamp is implemented; committed audit display can be added if operations wants it on paper.

Acceptance:

- Operations confirms the Factory printout visually matches the SAP gatepass layout closely enough for live use.
- Multi-invoice print remains readable.
- Large item sets may use a second page if the SAP-style layout cannot fit cleanly on one page.

### 4. Vehicle-Linking To Docking Dashboard

Docking must be fed by Dispatch Vehicle Linking.

Current code status:

- Backend pending-bookings endpoint exists and groups booked `DispatchPlan` rows.
- Backend filters pending bookings by date/search and excludes already docked active plans/documents.
- Frontend dashboard calls pending bookings and merges them as `Pending` rows.
- Frontend create page accepts `dispatchPlanIds` and pre-fills the Docking form.
- Backend updates linked dispatch plans to `DISPATCHED` when Docking dispatch is completed.

Remaining work:

- Final UI polish and regression testing for resume/open edge cases.
- Ensure operations accepts the pending-row wording and table columns.

Target flow:

1. Planning/dispatch selects one or more SAP invoices in Vehicle Linking.
2. Vehicle, driver, transporter, bilty, and freight details are saved.
3. The linked invoice group status becomes `BOOKED`.
4. Docking dashboard shows this booked group as `Pending`.
5. Docking operator opens the pending row.
6. The system creates or resumes one `SalesDispatchGateOut` for that booked group.
7. The full Docking flow continues with weighment, photo/GPS, gatepass, print commit, and dispatch.
8. When dispatched, all linked dispatch plans move to `DISPATCHED`.

Implementation notes:

- A pending row may be virtual, derived from booked `DispatchPlan` groups that do not yet have a `SalesDispatchGateOut`.
- Once a Docking record exists, the dashboard should show the real Docking status.
- Multi-invoice groups should appear as one pending truck/load row.
- Duplicate active Docking rows must be blocked for any invoice already inside an active booked/docking flow.

Acceptance:

- A booked vehicle-linked invoice group appears in Docking without manual SAP re-selection.
- Opening the pending row carries forward vehicle, driver, transporter, bilty, and selected invoices.
- A multi-invoice vehicle-linked group creates one Docking entry.

### 5. Multi-Invoice Detail And Print Polish

The backend supports child document rows. The frontend must make this obvious everywhere.

Required UI polish:

- Dashboard shows document count and document numbers without hiding the gatepass number. Implemented.
- Detail page groups documents and items by invoice. Implemented.
- Gatepass page prints a document table before item details. Implemented.
- Different customers/e-way bills remain warnings, not hard blocks, unless operations changes the rule.

Acceptance:

- Users can clearly understand "one truck, multiple invoices."
- Gate users see one pending truck/load, not one row per invoice.

### 6. SAP Posting Guardrails

This can wait.

When revisited, add a dedicated Docking SAP posting service with an explicit mode:

```text
DOCKING_SAP_WRITE_MODE=READ_ONLY|SIMULATE|TEST_SAP|PRODUCTION
```

For now:

- Docking reads SAP documents.
- Docking does not post Docking state changes to SAP.
- Mark dispatched remains a FactoryFlow state transition.

### 7. External App Mirrors

Out of scope.

- Do not implement JSAP mirror writes.
- Do not integrate with the old PHP app or any other app.
- SAP is the only external system considered for Docking.

### 8. BST Downstream Linkage

Required.

Current code status:

- BST Out dashboard already reads Docking-created `STOCK_TRANSFER` entries.
- BST In backend eligibility reads dispatched Docking stock-transfer rows.
- BST In creation stores the Docking stock-transfer source on the receiving entry.
- Existing legacy BST In rows remain readable.

Target flow:

- Stock-transfer Docking Out entries are created in Docking.
- After print commit and dispatch, the stock-transfer Docking entry becomes eligible for BST In. Implemented.
- BST In consumes dispatched Docking stock-transfer entries instead of requiring a separate duplicate source. Implemented.

Acceptance:

- A dispatched stock-transfer Docking Out can be selected in BST In. Implemented.
- Only dispatched stock-transfer Docking entries appear as eligible BST In records. Implemented.
- Existing BST In screens keep their current behavior while switching source data behind the scenes. Implemented.

### 9. Reports And Export

All listed reports are required.

Current code status:

- Backend reports endpoint exists with counts and top entry lists for core Docking states.
- Frontend report page exists at `/dispatch/docking/reports`.
- Docking dashboard exposes filtered Excel export for the currently visible rows.
- The dashboard export includes summary, entry, SAP document, and item-line sheets.
- Dashboard and report exports are gated by `gate_core.can_view_sales_dispatch_reports`.
- Backend reports endpoint now returns filtered report lists for all required Docking report categories.
- Report list exports use a capped `limit=1000` request for operational downloads.
- Some required reports are not complete yet, such as truck vs invoices with photo and truck status with photo.

Reports to build or harden:

- Waiting inside.
- Missing photo/GPS.
- Gatepass pending.
- Gatepass printed but not committed.
- Ready for dispatch.
- Dispatched.
- Truck vs invoices with photo.
- Truck status with photo.
- Rejected/cancelled entries.
- CSV/Excel export for operations. Implemented for dashboard and reports page.

Acceptance:

- Operations can replace the old daily Docking reports from FactoryFlow.
- Date range and status filters work consistently.
- Dashboard export matches the selected date range, search, and status card filter.
- Report-page exports match their filtered report data.

## Suggested Build Order

1. Dispatch-module reprint UI. Done.
2. Frontend action permission hardening. Done.
3. SAP-matched gatepass print layout. In progress; document table and grouped items implemented, awaiting visual sign-off.
4. Multi-invoice detail/gatepass polish. Done; dashboard document display, detail grouping, and gatepass grouping are implemented.
5. BST In eligibility from dispatched stock-transfer Docking. Partial.
6. Reports and CSV/Excel export. Done.
7. Vehicle-linking regression polish. Partial.
8. SAP posting guardrails later, after explicit sign-off. Deferred.

## No Longer Unknown

- JSAP mirror: out of scope.
- Other app integrations: out of scope.
- SAP posting from Docking: can wait.
- Reports: all listed operational reports are required.
- Docking entry source: booked Dispatch Vehicle Linking groups.
