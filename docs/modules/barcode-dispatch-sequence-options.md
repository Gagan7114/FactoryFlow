# Barcode Dispatch Sequence Options

> Design note only. No implementation changes are included in this document.
> Purpose: explain what types of sequence-wise dispatch are possible before
> choosing one business rule for the barcode dispatch module.

## Goal

If dispatch must be sequence-wise, the system needs a clear rule for "what must
come first". Sequence can be based on SAP bill lines, delivery lines, material,
pallet, box serial, expiry, warehouse location, loading plan, or a combination
of these.

The best option depends on how the dispatch team physically loads material.

## Current Assumption

- User enters a SAP bill or invoice number.
- Backend fetches bill and item details from SAP.
- Dispatch can be done by scanning item, box, or pallet barcode.
- Backend validates all scans.
- Frontend should never call SAP directly.
- If outbound delivery is available, it should be preferred as the final
  dispatch object.

## What Sequence-Wise Dispatch Means

Sequence-wise dispatch means the system does not allow the next scan until the
required previous step is complete.

Example:

1. Bill has item 1 and item 2.
2. User must finish full quantity of item 1.
3. Only after item 1 is complete, user can scan item 2.
4. If user scans item 2 early, the scan is rejected or warned based on setting.

## Possible Sequence Types

### 1. SAP Bill Line Sequence

The scan order follows the item order received from SAP billing document or
invoice.

Example:

| SAP Item No | Material | Required Qty | Allowed Order |
| --- | --- | ---: | --- |
| 10 | FG-A | 100 | First |
| 20 | FG-B | 50 | Second |
| 30 | FG-C | 25 | Third |

Rules:

- Complete SAP item 10 before item 20.
- Complete SAP item 20 before item 30.
- Reject scan if material belongs to a later line.

Best for:

- Simple dispatch.
- Bill-wise dispatch.
- When SAP bill line order is meaningful for loading.

Limitation:

- Warehouse may physically load pallets in a different order.
- Same material may appear on multiple SAP lines and needs careful handling.

Recommendation:

- Good default MVP sequence rule.

### 2. SAP Outbound Delivery Line Sequence

The scan order follows SAP outbound delivery line order instead of invoice line
order.

Rules:

- If bill has a reference delivery number, fetch delivery lines.
- Dispatch follows delivery item order.
- Invoice is used for reference, but delivery controls dispatch.

Best for:

- S/4HANA or ECC dispatch where outbound delivery is the real logistics object.
- Companies where invoice and physical loading are not always the same.

Limitation:

- Requires SAP delivery API or table access.
- If delivery is missing, fallback rule is needed.

Recommendation:

- Best long-term option if SAP outbound delivery is available.

### 3. Material Priority Sequence

The business defines a fixed material priority. Dispatch must follow that
priority, not SAP line order.

Example:

| Priority | Material Type |
| ---: | --- |
| 1 | Finished goods cartons |
| 2 | Free goods |
| 3 | Samples |
| 4 | Promotional material |

Rules:

- Materials with priority 1 must be completed first.
- Then priority 2, then priority 3.
- Within the same priority, SAP line order can be used.

Best for:

- Business-controlled loading order.
- Customer rules where main goods must be loaded before free items.

Limitation:

- Needs material priority master data.
- Admin must maintain sequence rules.

### 4. Pallet Sequence

Dispatch follows a planned pallet order.

Example:

| Sequence | Pallet Barcode | Material | Boxes |
| ---: | --- | --- | ---: |
| 1 | PLT-001 | FG-A | 10 |
| 2 | PLT-002 | FG-A | 10 |
| 3 | PLT-003 | FG-B | 8 |

Rules:

- User must scan pallet `PLT-001` before `PLT-002`.
- If user scans `PLT-003` before `PLT-001`, reject or warn.
- Boxes inside the current pallet can be scanned only if box-level scanning is
  required.

Best for:

- Truck loading plan.
- Dispatch where pallets are staged in exact loading order.
- Full pallet dispatch.

Limitation:

- Needs pallet loading sequence to be created before dispatch.
- Not ideal if operators choose pallets freely from stock.

### 5. Box Serial Sequence

Dispatch follows box serial number order.

Example:

| Sequence | Box Barcode |
| ---: | --- |
| 1 | BOX-0001 |
| 2 | BOX-0002 |
| 3 | BOX-0003 |

Rules:

- Scan `BOX-0001` before `BOX-0002`.
- Reject skipped box sequence if strict mode is enabled.
- Duplicate box barcode is always rejected.

Best for:

- Serial-controlled cartons.
- High audit requirement.
- Cases where missing box number should be caught immediately.

Limitation:

- Slow for large dispatches.
- Requires reliable box sequence generation.

### 6. Pallet Then Box Sequence

The pallet is scanned first, then only boxes from that pallet can be scanned.

Rules:

- User scans pallet barcode.
- System opens that pallet for scanning.
- User scans boxes inside that pallet.
- Box from another pallet is rejected.
- After pallet is complete, user can move to next pallet.

Best for:

- When pallet identity must be verified before loading.
- Mixed pallet audit.
- Dispatch where box-level proof is required.

Limitation:

- More scans are required.
- Full pallet scan shortcut may not be allowed in this mode.

### 7. FEFO / Expiry Sequence

Dispatch follows First Expiry First Out.

Rules:

- System sorts eligible stock by expiry date.
- Older expiry batch must be dispatched before newer expiry batch.
- If user scans newer batch early, reject or warn.

Best for:

- FMCG.
- Food, oil, pharma, health products.
- Any expiry-controlled material.

Limitation:

- Requires barcode to contain batch and expiry or backend must resolve it.
- Requires stock/batch visibility.

Recommendation:

- Important if expiry control is a business requirement.

### 8. Batch Sequence

Dispatch follows batch order, usually oldest batch first or SAP-reserved batch
first.

Rules:

- SAP or backend decides allowed batch.
- User must scan only the expected batch.
- Different batch is rejected even if material is correct.

Best for:

- Batch-managed items.
- Cases where SAP allocation or QA release decides exact batch.

Limitation:

- Requires batch details from SAP bill, delivery, or reservation.

### 9. Warehouse Location / Pick Path Sequence

Dispatch follows warehouse path sequence.

Example:

| Sequence | Location |
| ---: | --- |
| 1 | Aisle A, Rack 01 |
| 2 | Aisle A, Rack 02 |
| 3 | Aisle B, Rack 01 |

Rules:

- Pick and scan boxes based on location sequence.
- User cannot scan material from later location before current location is done.

Best for:

- Large warehouse.
- Reducing picker walking time.
- WMS-driven dispatch.

Limitation:

- Requires bin/location mapping.
- More suitable when dispatch is integrated with picking.

### 10. Loading Plan Sequence

Dispatch follows the truck loading plan.

Rules:

- Admin or planner creates loading sequence.
- Sequence may include customer, route, drop point, pallet, or material.
- User scans according to loading plan.

Best for:

- Multi-customer vehicle loading.
- Route-wise dispatch.
- Last-in-first-out truck loading.

Limitation:

- Requires a separate loading plan screen or imported plan.
- More complex than normal bill dispatch.

### 11. Customer / Route Drop Sequence

Dispatch follows route drop order.

Example:

| Drop | Customer | Loading Rule |
| ---: | --- | --- |
| 1 | Customer A | Load last |
| 2 | Customer B | Load before Customer A |
| 3 | Customer C | Load first |

Rules:

- For route dispatch, later delivery drop may be loaded first.
- System controls dispatch by customer or delivery stop.

Best for:

- One vehicle carrying multiple bills.
- Route-based distribution.

Limitation:

- Needs route/drop plan.
- Not required for single-bill dispatch MVP.

### 12. Mixed Sequence

Multiple rules are combined.

Common combinations:

| Sequence Model | Rule |
| --- | --- |
| Bill line + box | Complete item 1 by scanning boxes, then item 2 |
| Delivery line + pallet | Follow SAP delivery line, dispatch pallets inside each line |
| FEFO + material | For each material, scan oldest expiry first |
| Pallet + box | Scan pallet, then scan boxes inside that pallet |
| Loading plan + pallet | Follow truck loading plan pallet by pallet |

Best for:

- Real production dispatch after MVP.
- Businesses with strict loading and audit requirements.

Limitation:

- Needs clear priority when two rules conflict.

Example conflict:

- SAP line says material A first.
- FEFO says material B has older expiry.
- System must know which rule wins.

## Strict vs Warning Mode

Every sequence rule can work in two modes.

### Strict Mode

Wrong sequence is rejected.

Example:

- Expected: item 1.
- Scanned: item 2.
- Result: rejected.

Best for:

- Audit-heavy dispatch.
- New process rollout.
- High risk of wrong loading.

### Warning Mode

Wrong sequence shows warning but can continue with override.

Example:

- Expected: item 1.
- Scanned: item 2.
- Result: warning and admin override required.

Best for:

- Practical warehouse operations.
- Cases where physical loading can change quickly.

Risk:

- Too many overrides can weaken control.

## Recommended Sequence Options By Phase

### MVP

Use SAP bill line sequence.

Rules:

- Complete current bill line before next bill line.
- Allow box and pallet scans only if they belong to current line.
- Reject wrong material.
- Reject duplicate box or pallet.
- Reject over quantity.

Why:

- Simple to understand.
- Easy for users.
- Matches current bill-based dispatch requirement.

### Next Phase

Use outbound delivery line sequence if SAP provides delivery data.

Rules:

- Bill number fetches invoice and linked outbound delivery.
- Delivery line sequence becomes the scan sequence.
- Invoice remains reference data.

Why:

- More correct for physical dispatch.
- SAP outbound delivery is usually the logistics document.

### Advanced Phase

Add configurable sequence source.

Possible setting values:

| Setting | Meaning |
| --- | --- |
| `SAP_BILL_LINE` | Follow SAP invoice or bill item order |
| `SAP_DELIVERY_LINE` | Follow outbound delivery item order |
| `PALLET_PLAN` | Follow planned pallet loading order |
| `BOX_SERIAL` | Follow box serial number order |
| `FEFO` | Follow expiry date order |
| `BATCH` | Follow SAP or oldest batch order |
| `LOCATION_PICK_PATH` | Follow warehouse bin path |
| `LOADING_PLAN` | Follow truck loading plan |
| `NONE` | No sequence rule, only material and quantity validation |

## Recommended Rule Priority

If multiple sequence checks are enabled, use this priority:

1. Session status check.
2. Duplicate dispatch check.
3. Barcode belongs to bill or delivery.
4. Material, batch, and UOM validation.
5. Over quantity validation.
6. Sequence validation.
7. Pallet or box state update.
8. Scan audit log.

This keeps critical safety checks before sequence checks.

## Suggested Default Configuration

| Setting | Suggested Default |
| --- | --- |
| Require sequence scanning | Yes |
| Sequence source | SAP bill line |
| Strict sequence mode | Yes |
| Allow admin override | No for MVP |
| Allow pallet scan in sequence | Yes, only for current item |
| Allow box scan in sequence | Yes, only for current item |
| Allow partial pallet dispatch | Configurable |
| Use FEFO | Later phase |
| Use loading plan | Later phase |

## Open Questions For Business And SAP Team

1. Should sequence follow SAP invoice line or outbound delivery line?
2. Can one material appear multiple times in the same bill?
3. Should same material across multiple lines be merged or kept separate?
4. Is batch or expiry mandatory during dispatch?
5. Should wrong sequence be rejected or allowed with admin override?
6. Is full pallet scan allowed, or must each box inside pallet be scanned?
7. Can a box be removed from pallet and dispatched separately?
8. If one box is removed, can remaining pallet still be dispatched as partial?
9. Is truck loading order required?
10. Is multi-bill or route-wise dispatch required?

## Final Recommendation

Start with strict SAP bill line sequence for the current bill-based dispatch.
Move to outbound delivery sequence when SAP confirms delivery data and update API.
Add pallet plan, FEFO, and loading plan sequence only after the basic dispatch
flow is stable.
