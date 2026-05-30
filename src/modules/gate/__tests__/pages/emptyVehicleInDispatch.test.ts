import { describe, expect, it } from 'vitest';

import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';
import type { EmptyVehicleGateInEntry } from '@/modules/gate/api';

import { buildExpectedDispatchVehicles } from '../../pages/emptyVehicleInPages/emptyVehicleInDispatch';

function makeDispatchBill(
  overrides: Partial<DispatchBill> & { plan?: Partial<DispatchBill['plan']> } = {},
): DispatchBill {
  const plan: DispatchBill['plan'] = {
    id: 1,
    sap_invoice_doc_entry: 626050551,
    sap_invoice_doc_num: '626050551',
    invoice_number: '626050551',
    eway_bill: '',
    invoice_weight: null,
    invoice_amount: null,
    place_of_supply: '',
    product_variety: '',
    total_litres: null,
    effective_month: null,
    budget_delivery_point: '',
    service_location_code: null,
    service_location_name: '',
    sac_entry: null,
    sac_code: '',
    vehicle_id: 11,
    transporter_id: null,
    driver_id: null,
    linked_vehicle_entry_id: null,
    booking_status: 'BOOKED',
    dispatch_date: '2026-05-27',
    priority: '',
    transporter_name: '',
    transporter_gstin: '',
    contact_person: '',
    mobile_no: '',
    vehicle_no: 'DL01LAC9967',
    driver_name: '',
    driver_mobile_no: '',
    driver_license_no: '',
    driver_id_proof_type: '',
    driver_id_proof_number: '',
    bilty_no: '6767',
    bilty_date: null,
    bilty_attachment: null,
    bilty_attachment_name: '',
    freight: null,
    total_freight: null,
    kanta_weight: null,
    remarks: '',
    created_at: null,
    updated_at: null,
    ...overrides.plan,
  };

  return {
    doc_entry: 626050551,
    doc_num: '626050551',
    doc_date: '2026-05-27',
    create_date: '2026-05-27',
    create_time: '',
    card_code: 'C001',
    card_name: 'PURE AGROCHEM CORPORATION',
    doc_total: 1000,
    branch_id: null,
    branch_name: '',
    ship_to_code: '',
    ship_to_address: '',
    state: '',
    city: '',
    bp_gstin: '',
    sap_dispatch_date: null,
    sap_bilty_no: '',
    sap_bilty_date: null,
    sap_transporter_name: '',
    sap_vehicle_no: '',
    sap_transporter_invoice: '',
    sap_lr_number: '',
    sap_eway_bill: '',
    gst_vehicle_no: '',
    gst_transport_date: null,
    gst_transport_reason: '',
    line_count: 1,
    total_quantity: 1,
    total_litres: 0,
    total_boxes: 0,
    total_weight: 16069.2,
    total_line_amount: 1000,
    total_gross_amount: 1000,
    warehouses: '',
    item_summary: '',
    base_refs: '',
    ...overrides,
    plan,
  };
}

function makeEmptyVehicleEntry(
  overrides: Partial<EmptyVehicleGateInEntry> = {},
): EmptyVehicleGateInEntry {
  return {
    id: 9,
    entry_no: 'EVGI-20260527-0001',
    vehicle_entry: 143,
    vehicle_entry_no: 'EVGI-20260527-0001',
    vehicle_entry_status: 'IN_PROGRESS',
    vehicle_entry_time: '',
    vehicle: 11,
    vehicle_number: 'DL01LAC9967',
    driver: 15,
    driver_name: 'ABC',
    driver_mobile: '',
    reason: 'DISPATCH',
    reason_display: 'Dispatch',
    gate_in_date: '2026-05-27',
    in_time: '14:37:00',
    items: [],
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('buildExpectedDispatchVehicles', () => {
  it('does not show booked plans already linked to an empty vehicle entry', () => {
    const result = buildExpectedDispatchVehicles([
      makeDispatchBill({ plan: { linked_vehicle_entry_id: 143 } }),
    ]);

    expect(result).toEqual([]);
  });

  it('does not show vehicles that already have an active dispatch empty vehicle entry', () => {
    const result = buildExpectedDispatchVehicles(
      [makeDispatchBill()],
      [makeEmptyVehicleEntry()],
    );

    expect(result).toEqual([]);
  });

  it('groups unlinked booked bills by vehicle', () => {
    const result = buildExpectedDispatchVehicles([
      makeDispatchBill(),
      makeDispatchBill({
        doc_entry: 626050552,
        doc_num: '626050552',
        card_name: 'SECOND CUSTOMER',
        total_weight: 10,
        plan: {
          id: 2,
          sap_invoice_doc_entry: 626050552,
          sap_invoice_doc_num: '626050552',
        },
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      vehicleId: 11,
      docEntries: [626050551, 626050552],
      docNums: ['626050551', '626050552'],
      customers: ['PURE AGROCHEM CORPORATION', 'SECOND CUSTOMER'],
      totalWeight: 16079.2,
    });
  });
});
