# Docking Module Factory Integration Plan

Updated: 2026-05-21

Frontend repo: `D:\Test_CompanyJivo\FactoryFlow`

Backend repo: `D:\Test_CompanyJivo\factory_app_v2`

## Goal

Docking should be a Dispatch module workflow that takes vehicle-linked SAP invoice groups from Dispatch Vehicle Linking, completes physical truck verification, prints the gatepass, and hands the committed entry to Gate for final vehicle-out marking.

The module replaces the operational Docking portion of the legacy PHP flow, but it should not mirror old app databases or talk to non-SAP systems.

## Confirmed Product Shape

- Main Docking route: `/dispatch/docking`.
- Reprint workflow route should also be under Dispatch, for example `/dispatch/docking/:entryId/reprint`.
- Gate-side Sales Dispatch Out is only for final security dispatch actions.
- Docking starts from Dispatch Vehicle Linking.
- Once vehicle-linked invoices are marked `BOOKED`, they appear on Docking as pending work.
- One booked vehicle group equals one Docking truck/load.
- If the booked group contains multiple invoices, Docking keeps them together.
- Gatepass number is one per truck/load.
- Gatepass layout must match the SAP gatepass layout shared with the team.
- SAP is the only external integration in scope.
- JSAP mirror and old PHP app writeback are out of scope.
- Docking SAP posting can wait.
- BST downstream linkage is required.
- Operational reports and exports are required.

## Factory Module Boundaries

| Area | Responsibility |
|---|---|
| Dispatch Vehicle Linking | Select invoices, vehicle, driver, transporter, bilty, freight, and mark the group `BOOKED`. |
| Dispatch Docking | Show booked groups as pending, create/resume Docking entries, capture weighment/photo/GPS/documents, print and commit gatepass. |
| Gate Sales Dispatch Out | Show committed entries pending physical gate-out and mark dispatched. |
| BST In | Consume dispatched stock-transfer Docking Out entries when receiving the vehicle back in. |
| SAP | Source for invoice and stock-transfer document data. |

## Updated Workflow

1. Dispatch planning or vehicle-linking user selects one or more SAP invoices.
2. User links vehicle, driver, transporter, bilty/LR, freight, and related booking details.
3. Vehicle-linked group becomes `BOOKED`.
4. Docking dashboard shows the booked group as `Pending`.
5. Docking user opens the pending row.
6. FactoryFlow creates or resumes the `SalesDispatchGateOut`.
7. Docking user records or verifies truck/load data.
8. Weighment is recorded.
9. Truck photo is uploaded with GPS coordinates.
10. Gatepass readiness is checked.
11. Original gatepass is printed once.
12. Docking user commits the print.
13. Gate user sees the entry as pending out.
14. Gate user marks the vehicle dispatched.
15. All linked dispatch plans are marked `DISPATCHED`.

## Pending Docking Rows

Docking dashboard must combine two sources:

- Real `SalesDispatchGateOut` rows that already exist.
- Pending booked vehicle-linked groups from `DispatchPlan` records that do not yet have a Docking row.

Rules:

- Show booked groups without a Docking row as `Pending`.
- Opening a pending row creates or resumes the Docking entry.
- The pending row should carry selected invoice list, vehicle, driver, transporter, bilty, and freight context.
- If a Docking row already exists for any active invoice in the group, open the existing Docking row instead of creating a duplicate.
- Cancelled or rejected entries can be recovered only through the approved recovery flow.

## Multi-Invoice Handling

Multi-invoice is a normal Docking case when created from Vehicle Linking.

Rules:

- One truck/load can contain multiple invoices.
- All invoices in the vehicle-linked group stay together.
- Same SAP branch/company is required.
- Different customers are allowed with a visible warning.
- Different e-way bills are allowed and printed per invoice.
- Gatepass is truck-level, not invoice-level.
- Physical quantity/UOM is truck-level.
- SAP quantities, SAP amount, SAP weight, and e-way bill remain document-level snapshots.

## Reprint Workflow

Reprint must be separate from original gatepass print.

Location:

- Dispatch module.

Behavior:

- The original gatepass page must not allow browser reprints after the original print is recorded.
- Reprint UI must show print history.
- Reprint requires a reason.
- Reprint creates an append-only print log row.
- Print dialog opens only after the backend accepts and logs the reprint.

Backend already has:

- Reprint endpoint.
- Print history endpoint.
- `SalesDispatchGatepassPrintLog`.

Frontend still needs:

- Dispatch reprint page or dialog.
- Print history display.
- Reprint reason form.

## Gatepass Layout

The FactoryFlow gatepass should match the SAP gatepass layout shared with the team.

Required sections:

- Company and gatepass header.
- Gatepass number/date.
- Truck, driver, transporter, bilty/LR.
- Document table with invoice/stock-transfer details.
- Customer/destination details.
- E-way bill per document.
- Item lines or item summary grouped by document.
- SAP weight and weighbridge weight.
- Physical quantity/UOM.
- Seal number and PGI/goods issue reference.
- QR/random code.
- Print audit details.

The layout should stay printable on one A4 page where practical. For large multi-invoice loads, a second page is acceptable if operations approves.

## BST Linkage

BST linkage is required.

Target:

- Stock-transfer Docking Out should become the source for BST In eligibility.
- Only dispatched stock-transfer Docking entries should appear in BST In.
- BST In UI should preserve existing behavior while reading from the new eligible source.

## SAP Integration

Current scope:

- Read SAP A/R invoice data.
- Read SAP stock-transfer data.
- Store FactoryFlow snapshots and workflow state locally.

Deferred scope:

- Docking SAP writes.
- SAP posting preview/simulation/test modes.

Out of scope:

- JSAP mirror.
- Old PHP app writeback.
- Any non-SAP app integration.

## Reports And Export

Reports required for Docking:

- Waiting inside.
- Missing photo/GPS.
- Gatepass pending.
- Gatepass printed but not committed.
- Ready for dispatch.
- Dispatched.
- Truck vs invoices with photo.
- Truck status with photo.
- Rejected/cancelled entries.
- CSV/Excel export.

Reports must respect:

- Date range.
- Status.
- Document type.
- Vehicle.
- Customer/destination.
- SAP document number.
- Gatepass number.

## Remaining Implementation Phases

### Phase 1: Permission Hardening

- Enforce per-action permissions in backend sales-dispatch views.
- Hide or disable frontend actions from unauthorized users.
- Add API tests for forbidden actions.

### Phase 2: Vehicle-Linking Integration

- Add backend endpoint or service that exposes booked vehicle-linked groups as pending Docking rows.
- Merge pending booked groups with existing Docking rows in the Docking dashboard.
- Create/resume Docking from a booked group.

### Phase 3: Reprint UI

- Build Dispatch-module reprint route or dialog.
- Show print history.
- Require reprint reason.
- Use backend audited reprint endpoint.

### Phase 4: SAP-Matched Gatepass Layout

- Update gatepass page and print CSS to match the SAP layout.
- Add document table and per-invoice e-way bill display.
- Get operations sign-off.

### Phase 5: Multi-Invoice Polish

- Group detail and print views by document.
- Improve dashboard display for document count and document numbers.
- Keep one truck/load row for multi-invoice groups.

### Phase 6: BST Downstream Linkage

- Expose dispatched stock-transfer Docking entries as BST In eligible-outs.
- Update BST In query source.
- Test that only dispatched stock-transfer rows appear.

### Phase 7: Reports And Export

- Complete all required operational reports.
- Add CSV/Excel export.
- Ensure exports match filtered report data.

### Phase 8: SAP Posting Later

- Add SAP write-mode guardrails only after the business asks for Docking SAP writes.
- Keep default behavior read-only until then.

## MVP Definition Of Done

MVP is complete when:

- Booked Dispatch Vehicle Linking groups appear as pending Docking rows.
- Docking can be started/resumed from those rows.
- Multi-invoice booked groups create one truck/load Docking entry.
- Weighment, truck photo/GPS, gatepass print, print commit, and gate dispatch work end to end.
- Original print is limited to one time.
- Reprint is available only through the Dispatch reprint workflow with audit logging.
- Gatepass print matches the SAP shared layout.
- BST In can consume dispatched stock-transfer Docking Out entries.
- Required reports and exports are available.
- Permissions are enforced.
- No JSAP or old PHP writeback exists.
