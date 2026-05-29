const DISPATCH_DOCKING_BASE = '/dispatch/docking';
const GATE_SALES_DISPATCH_BASE = '/gate/sales-dispatch';
const GATE_BST_OUT_BASE = '/gate/bst-out';

function buildSalesDispatchRoutes(base: string) {
  const barcodeScan = (entryId: string | number) =>
    `${base}/new/barcode-scan?entryId=${encodeURIComponent(String(entryId))}`;

  return {
    dashboard: base,
    reports: `${base}/reprint`,
    reprintSearch: `${base}/reprint`,
    newEntry: `${base}/new`,
    barcodeScan,
    weighment: barcodeScan,
    attachments: (entryId: string | number) =>
      `${base}/new/attachments?entryId=${encodeURIComponent(String(entryId))}`,
    gatepass: (entryId: string | number) =>
      `${base}/new/gatepass?entryId=${encodeURIComponent(String(entryId))}`,
    detail: (entryId: string | number) => `${base}/${entryId}`,
    reprint: (entryId: string | number) => `${base}/${entryId}/reprint`,
  };
}

export const DOCKING_ROUTES = buildSalesDispatchRoutes(DISPATCH_DOCKING_BASE);
export const SALES_DISPATCH_OUT_ROUTES = buildSalesDispatchRoutes(GATE_SALES_DISPATCH_BASE);
export const BST_OUT_DOCKING_ROUTES = buildSalesDispatchRoutes(GATE_BST_OUT_BASE);

export function getSalesDispatchRoutes(pathname: string) {
  if (pathname.startsWith(GATE_BST_OUT_BASE)) return BST_OUT_DOCKING_ROUTES;
  if (pathname.startsWith(GATE_SALES_DISPATCH_BASE)) return SALES_DISPATCH_OUT_ROUTES;
  return DOCKING_ROUTES;
}

export function isSalesDispatchOutPath(pathname: string) {
  return pathname.startsWith(GATE_SALES_DISPATCH_BASE) || pathname.startsWith(GATE_BST_OUT_BASE);
}

export const SALES_DISPATCH_BASE_ROUTES = {
  dispatchDocking: DISPATCH_DOCKING_BASE,
  gateSalesDispatchOut: GATE_SALES_DISPATCH_BASE,
  gateBstOut: GATE_BST_OUT_BASE,
};

export const GATE_OUT_ROUTES = {
  bstOutDashboard: '/gate/bst-out',
  bstOutNew: '/dispatch/docking/new',
  bstOutGatepass: (vehicleEntryId: string | number) =>
    `${GATE_BST_OUT_BASE}/new/gatepass?entryId=${encodeURIComponent(String(vehicleEntryId))}`,
  salesDispatchOutDashboard: '/gate/sales-dispatch',
  salesDispatchOutEntry: (entryId: string | number) => `/gate/sales-dispatch/${entryId}`,
  salesDispatchOutGatepass: (vehicleEntryId: string | number) =>
    `/gate/sales-dispatch/new/gatepass?entryId=${encodeURIComponent(String(vehicleEntryId))}`,
};
