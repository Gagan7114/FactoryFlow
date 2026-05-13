export const EMPTY_VEHICLE_OUT_DRAFT_KEY = 'gate.empty-vehicle-out.form-draft';

export interface EmptyVehicleOutDraft {
  vehicleEntryId: number;
  vehicleEntryNo: string;
  vehicleEntryType: string;
  vehicleNumber: string;
  vehicleType: string;
  driverName: string;
  driverMobile: string;
  gateOutDate: string;
  outTime: string;
  securityName: string;
  remarks: string;
}

export function readEmptyVehicleOutDraft(): EmptyVehicleOutDraft | null {
  const rawDraft = window.localStorage.getItem(EMPTY_VEHICLE_OUT_DRAFT_KEY);
  if (!rawDraft) return null;

  try {
    return JSON.parse(rawDraft) as EmptyVehicleOutDraft;
  } catch {
    return null;
  }
}

export function writeEmptyVehicleOutDraft(draft: EmptyVehicleOutDraft) {
  window.localStorage.setItem(EMPTY_VEHICLE_OUT_DRAFT_KEY, JSON.stringify(draft));
}

export function clearEmptyVehicleOutDraft() {
  window.localStorage.removeItem(EMPTY_VEHICLE_OUT_DRAFT_KEY);
}
