Updated plan: make this a **single E-Invoice JSON page** driven by invoice number.

**Recommended Module**
Backend core should still live in `dispatch_plans`, because this starts from a SAP sales invoice number and uses the existing SAP invoice reader. Frontend page should live under the Dispatch area, for example:

`/dispatch/e-invoice-json`

Not `gate_core` as the primary module, because this new flow is not inherently a gatepass/docking flow. It is an invoice-to-e-invoice-JSON tool.

**User Flow**
1. User opens one page: “E-Invoice JSON Generator”.
2. User enters SAP invoice number.
3. Backend fetches whatever it can from SAP.
4. Page auto-fills all available fields.
5. Page highlights missing/uncertain fields and asks the user to complete only those.
6. User reviews the generated JSON preview.
7. User downloads the exact NIC-style JSON array.

**Backend Plan**
Add a new service in `dispatch_plans`, likely:

`dispatch_plans/einvoice_services.py`

Responsibilities:

- Lookup invoice by number using existing `DispatchPlansService.get_bill_by_number()`.
- Add deeper SAP HANA reads for e-invoice-specific fields:
  - Seller GSTIN, legal name, address, pincode, state code.
  - Buyer GSTIN, legal name, address, pincode, POS/state code.
  - Item HSN, GST rate, tax amounts.
  - Header assessable value, IGST/CGST/SGST, round-off, total value.
- Return a normalized “draft” structure with:
  - `autofilled_fields`
  - `missing_fields`
  - `warnings`
  - `items`
  - `json_preview`

Add endpoints:

```text
GET /api/v1/dispatch-plans/e-invoice/lookup/?invoice_number=626068013
POST /api/v1/dispatch-plans/e-invoice/generate/
```

The `lookup` endpoint fetches SAP data and returns form-ready data.  
The `generate` endpoint accepts user-filled missing fields and returns the final JSON.

**Frontend Plan**
Add one page in the frontend Dispatch module:

```text
src/modules/dispatch/pages/EInvoiceJsonGeneratorPage.tsx
```

Page sections:

1. Invoice lookup
   - Invoice number input
   - Fetch button

2. Auto-filled invoice summary
   - Invoice no/date
   - Customer
   - Total amount
   - GSTIN
   - Items count

3. Missing details form
   - Only show fields the backend could not confidently fetch.
   - Group fields as:
     - Seller Details
     - Buyer Details
     - Value Details
     - Item Details

4. Items table
   - Product description
   - Qty
   - UOM
   - Unit price
   - HSN
   - GST rate
   - IGST/CGST/SGST
   - Total item value

5. JSON preview + download
   - Preview formatted JSON
   - Download `E-INVOICE_<invoice_no>.json`

**Important Behavior**
The backend should not silently guess tax-critical fields. If GSTIN, HSN, pincode, state code, tax rate, or tax split is missing/ambiguous, return it as `missing_fields` and make the user fill it.

**Implementation Phases**
1. Build backend SAP lookup + draft response.
2. Build JSON generator matching the sample shape exactly.
3. Add validation for mandatory NIC fields.
4. Build single frontend page with dynamic missing-field form.
5. Add download action.
6. Add golden-file test using the SAP sample JSON.

This gives users a simple one-page workflow while keeping the tax/invoice logic in the right backend module.