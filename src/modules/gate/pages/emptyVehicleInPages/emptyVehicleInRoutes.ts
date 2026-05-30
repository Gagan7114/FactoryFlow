export const EMPTY_VEHICLE_IN_TOTAL_STEPS = 4;

export const EMPTY_VEHICLE_IN_ROUTES = {
  dashboard: '/gate/empty-vehicle-in',
  details: (gateInId?: number | string | null) =>
    gateInId
      ? `/gate/empty-vehicle-in/new?gateInId=${encodeURIComponent(String(gateInId))}`
      : '/gate/empty-vehicle-in/new',
  weighment: (gateInId: number | string) =>
    `/gate/empty-vehicle-in/new/weighment?gateInId=${encodeURIComponent(String(gateInId))}`,
  attachments: (gateInId: number | string) =>
    `/gate/empty-vehicle-in/new/attachments?gateInId=${encodeURIComponent(String(gateInId))}`,
  review: (gateInId: number | string) =>
    `/gate/empty-vehicle-in/new/review?gateInId=${encodeURIComponent(String(gateInId))}`,
};

export function getGateInId(searchParams: URLSearchParams) {
  return Number(searchParams.get('gateInId') || searchParams.get('entryId') || 0) || null;
}
