import { describe, expect, it } from 'vitest';

import type { DispatchScanLog, DispatchSession, DispatchSessionLine } from '../../types';
import {
  canMarkDispatchComplete,
  canSubmitDispatchScan,
  formatDispatchScanMessage,
  getDispatchActiveLine,
  getLineProgress,
  getLineRemainingQty,
  isLineComplete,
  isLineLocked,
} from '../dispatchValidation';

function line(overrides: Partial<DispatchSessionLine>): DispatchSessionLine {
  return {
    id: 1,
    sequence_no: 1,
    sap_line_no: '1',
    material_code: 'MAT-1',
    material_description: 'Material 1',
    bill_qty: '10',
    scanned_qty: '0',
    remaining_qty: '10',
    uom: 'PCS',
    batch_number: '',
    warehouse_code: '',
    serial_required: false,
    status: 'PENDING',
    ...overrides,
  };
}

function session(overrides: Partial<DispatchSession>): DispatchSession {
  const lines = overrides.lines ?? [line({})];
  return {
    id: 10,
    bill_number: '900001',
    sap_system_type: 'BUSINESS_ONE',
    sap_object_type: 'AR_INVOICE',
    sap_doc_entry: '100',
    sap_doc_num: '900001',
    delivery_number: '',
    reference_delivery_number: '',
    customer_code: 'C001',
    customer_name: 'Test Customer',
    ship_to_code: '',
    ship_to_name: '',
    bill_date: null,
    status: 'DRAFT',
    total_expected_qty: '10',
    total_scanned_qty: '0',
    pending_qty: '10',
    sap_dispatch_status: 'OPEN',
    sap_update_status: 'NOT_CONFIGURED',
    sap_update_error: '',
    sap_sync_status: 'NOT_CONFIGURED',
    sap_sync_error: '',
    started_at: null,
    completed_at: null,
    dispatched_at: null,
    dispatched_by: null,
    dispatched_by_name: '',
    completed_by: null,
    completed_by_name: '',
    closed_at: null,
    closed_by: null,
    closed_by_name: '',
    close_reason: '',
    cancelled_at: null,
    cancel_reason: '',
    created_by: null,
    created_by_name: '',
    created_at: '',
    updated_at: '',
    line_count: lines.length,
    completed_line_count: 0,
    accepted_scan_count: 0,
    rejected_scan_count: 0,
    pallet_scan_count: 0,
    box_scan_count: 0,
    active_line: null,
    can_dispatch: false,
    can_scan: true,
    lines,
    ...overrides,
  };
}

describe('dispatchValidation', () => {
  it('returns the first incomplete line in sequence order', () => {
    const second = line({ id: 2, sequence_no: 2, material_code: 'MAT-2' });
    const first = line({ id: 1, sequence_no: 1, scanned_qty: '10', remaining_qty: '0' });

    expect(getDispatchActiveLine([second, first])).toEqual(second);
  });

  it('uses backend active_line when it is present', () => {
    const active = line({ id: 3, sequence_no: 3 });

    expect(getDispatchActiveLine(session({ active_line: active, lines: [line({})] }))).toEqual(
      active,
    );
  });

  it('calculates remaining quantity, completion, and clamped progress', () => {
    const current = line({ bill_qty: '10', scanned_qty: '12', remaining_qty: '-2' });

    expect(getLineRemainingQty(current)).toBe(0);
    expect(isLineComplete(current)).toBe(true);
    expect(getLineProgress(current)).toBe(100);
  });

  it('locks later lines until the active line is complete', () => {
    const first = line({ id: 1, sequence_no: 1, scanned_qty: '5', remaining_qty: '5' });
    const second = line({ id: 2, sequence_no: 2, material_code: 'MAT-2' });
    const currentSession = session({ active_line: first, lines: [first, second] });

    expect(isLineLocked(first, currentSession)).toBe(false);
    expect(isLineLocked(second, currentSession)).toBe(true);
  });

  it('blocks scanning for closed sessions and enables final dispatch only when complete', () => {
    const done = line({ scanned_qty: '10', remaining_qty: '0', status: 'COMPLETE' });

    expect(canSubmitDispatchScan(session({ status: 'COMPLETED', lines: [done] }))).toBe(false);
    expect(canMarkDispatchComplete(session({ can_dispatch: true, lines: [done] }))).toBe(true);
  });

  it('formats accepted and rejected scan messages', () => {
    const accepted = {
      result: 'ACCEPTED',
      material_code: 'MAT-1',
      qty: '5',
      uom: 'PCS',
    } as DispatchScanLog;
    const rejected = {
      result: 'REJECTED',
      reject_code: 'WRONG_MATERIAL',
      reject_message: 'Wrong material scanned',
    } as DispatchScanLog;

    expect(formatDispatchScanMessage(accepted)).toBe('Accepted MAT-1 (5 PCS)');
    expect(formatDispatchScanMessage(rejected)).toBe('Wrong material scanned');
  });
});
