import type { DispatchBill, DispatchPlanStatus } from '@/modules/dashboards/dispatch-plans/types';

export type DispatchLinkingBucket = 'today' | 'overdue' | 'upcoming' | 'all';

export interface DispatchLinkingFilters {
  bucket: DispatchLinkingBucket;
  date: string;
  booking_status?: DispatchPlanStatus | 'all';
  search?: string;
  limit?: number;
}

export interface DispatchLinkingResponse {
  data: DispatchBill[];
  meta: {
    total: number;
    today: number;
    overdue: number;
    upcoming: number;
    pending: number;
    booked: number;
    dispatched: number;
    cancelled: number;
  };
}

export interface DispatchVehicleLinkPayload {
  sap_invoice_doc_num: string;
  vehicle_id: number | null;
  transporter_id: number | null;
  driver_id: number | null;
  linked_vehicle_entry_id: number | null;
  booking_status: DispatchPlanStatus;
  dispatch_date: string | null;
  transporter_name: string;
  transporter_gstin: string;
  contact_person: string;
  mobile_no: string;
  vehicle_no: string;
  driver_name: string;
  driver_mobile_no: string;
  driver_license_no: string;
  driver_id_proof_type: string;
  driver_id_proof_number: string;
  bilty_no: string;
  bilty_date: string | null;
  freight: string | null;
  total_freight: string | null;
  kanta_weight: string | null;
  remarks: string;
}
