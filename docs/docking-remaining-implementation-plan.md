# Docking Remaining Implementation Plan

Updated: 2026-05-21

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
- Backend item, attachment, gatepass sequence, dispatch lock, print, print commit, reprint log, reject, cancel, dispatch, and reports endpoints.
- Frontend Docking routes under `/dispatch/docking`.
- Frontend Docking create, weighment, attachment/photo, gatepass, detail, and dashboard pages.
- SAP invoice and stock-transfer lookup.
- Multi-invoice selection for invoices.
- Truck photo upload with GPS.
- Weighment readiness check.
- Gatepass original print is limited to one recorded print.
- Backend audited reprint endpoint and print history endpoint.
- Gate-side pending out flow for committed invoice dispatches.

## Remaining Work

### 1. Permission Hardening

Backend permission records exist, but sales-dispatch views still need action-level enforcement.

Required permissions:

- View Docking entries.
- Create Docking entries.
- Upload truck photo and documents.
- Print original gatepass.
- Commit print.
- Reprint gatepass.
- Mark dispatched.
- Reject entry.
- Cancel entry.
- Manage Docking print lock.
- View reports.

Acceptance:

- API tests prove unauthorized users cannot call protected actions.
- Frontend hides or disables actions using the same permission model.

### 2. Dispatch Reprint Workflow

Create the reprint UI inside the Dispatch module.

Recommended route:

- `/dispatch/docking/:entryId/reprint`

Minimum behavior:

- Show gatepass number, entry number, vehicle, driver, SAP documents, original printed user/time, and previous reprints.
- Require reprint reason.
- Optional printer name.
- Call the audited backend reprint endpoint.
- Open the print dialog only after the backend logs the reprint.
- Show print history after success.

Acceptance:

- Users cannot reprint from the original gatepass screen.
- Every reprint has a reason and an audit log row.
- Reprint remains available only from Dispatch.

### 3. SAP-Matched Gatepass Layout

Use the SAP gatepass layout shared with the team as the target layout.

Required layout content:

- Company/header block.
- Gatepass number and date.
- Vehicle, driver, transporter, bilty/LR details.
- Invoice/document table.
- Per-invoice e-way bill details.
- Customer/destination details.
- Item summary or item lines grouped by invoice.
- Weighbridge weight and SAP weight where available.
- Physical quantity and UOM.
- Seal/PGI/goods issue reference.
- QR code/random code.
- Printed/committed audit details where appropriate.

Acceptance:

- Operations confirms the Factory printout visually matches the SAP gatepass layout closely enough for live use.
- Multi-invoice print remains readable.
- Large item sets may use a second page if the SAP-style layout cannot fit cleanly on one page.

### 4. Vehicle-Linking To Docking Dashboard

Docking must be fed by Dispatch Vehicle Linking.

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

- Dashboard shows document count and document numbers without hiding the gatepass number.
- Detail page groups documents and items by invoice.
- Gatepass page prints a document table before item details.
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

Target flow:

- Stock-transfer Docking Out entries are created in Docking.
- After print commit and dispatch, the stock-transfer Docking entry becomes eligible for BST In.
- BST In should consume dispatched Docking stock-transfer entries instead of requiring a separate duplicate source.

Acceptance:

- A dispatched stock-transfer Docking Out can be selected in BST In.
- Only dispatched stock-transfer Docking entries appear as eligible BST In records.
- Existing BST In screens keep their current behavior while switching source data behind the scenes.

### 9. Reports And Export

All listed reports are required.

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
- CSV/Excel export for operations.

Acceptance:

- Operations can replace the old daily Docking reports from FactoryFlow.
- Date range and status filters work consistently.
- Exports match the filtered report data.

## Suggested Build Order

1. Permission hardening.
2. Vehicle-linking pending rows on Docking dashboard.
3. Start/resume Docking from booked vehicle-linked groups.
4. Dispatch-module reprint UI.
5. SAP-matched gatepass print layout.
6. Multi-invoice detail/gatepass polish.
7. BST In eligibility from dispatched stock-transfer Docking.
8. Reports and CSV/Excel export.
9. SAP posting guardrails later, after explicit sign-off.

## No Longer Unknown

- JSAP mirror: out of scope.
- Other app integrations: out of scope.
- SAP posting from Docking: can wait.
- Reports: all listed operational reports are required.
- Docking entry source: booked Dispatch Vehicle Linking groups.
