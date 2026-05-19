import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  Box,
  BoxDetail,
  BoxFilters,
  BoxTransferPayload,
  BulkPrintItem,
  CreatePalletPayload,
  DismantleBoxPayload,
  DismantlePalletPayload,
  GenerateBoxesPayload,
  LabelData,
  LabelPrintLog,
  ListResponse,
  LookupResponse,
  LooseStock,
  LooseStockFilters,
  PaginatedResponse,
  Pallet,
  PalletAddBoxesPayload,
  PalletClearPayload,
  PalletDetail,
  PalletFilters,
  PalletMovePayload,
  PalletRemoveBoxesPayload,
  PalletSplitPayload,
  PrintHistoryFilters,
  PrintRequestPayload,
  ProductionReleaseOilRow,
  RepackPayload,
  ScanRequestPayload,
  ScanResponse,
  VoidPayload,
} from '../types';

const EP = API_ENDPOINTS.BARCODE;

function isPaginatedResponse<T>(data: ListResponse<T>): data is PaginatedResponse<T> {
  return !Array.isArray(data) && Array.isArray(data.results);
}

function unwrapList<T>(data: ListResponse<T>): T[] {
  return isPaginatedResponse(data) ? data.results : data;
}

function normalizePage<T>(data: ListResponse<T>, params?: { page?: number; page_size?: number }) {
  if (isPaginatedResponse(data)) {
    return data;
  }

  const pageSize = params?.page_size ?? data.length;
  return {
    results: data,
    count: data.length,
    page: params?.page ?? 1,
    page_size: pageSize,
    total_pages: 1,
    next: false,
    previous: false,
  };
}

export const barcodeApi = {
  // =========================================================================
  // Boxes
  // =========================================================================

  async generateBoxes(data: GenerateBoxesPayload): Promise<Box[]> {
    const res = await apiClient.post<Box[]>(EP.BOXES_GENERATE, data);
    return res.data;
  },

  async getBoxes(params?: BoxFilters): Promise<Box[]> {
    const res = await apiClient.get<ListResponse<Box>>(EP.BOXES, { params });
    return unwrapList(res.data);
  },

  async getBoxesPage(params?: BoxFilters): Promise<PaginatedResponse<Box>> {
    const res = await apiClient.get<ListResponse<Box>>(EP.BOXES, { params });
    return normalizePage(res.data, params);
  },

  async getBoxDetail(boxId: number): Promise<BoxDetail> {
    const res = await apiClient.get<BoxDetail>(EP.BOX_DETAIL(boxId));
    return res.data;
  },

  async voidBox(boxId: number, data?: VoidPayload): Promise<BoxDetail> {
    const res = await apiClient.post<BoxDetail>(EP.BOX_VOID(boxId), data || {});
    return res.data;
  },

  // =========================================================================
  // Pallets
  // =========================================================================

  async createPallet(data: CreatePalletPayload): Promise<PalletDetail> {
    const res = await apiClient.post<PalletDetail>(EP.PALLET_CREATE, data);
    return res.data;
  },

  async getPallets(params?: PalletFilters): Promise<Pallet[]> {
    const res = await apiClient.get<ListResponse<Pallet>>(EP.PALLETS, { params });
    return unwrapList(res.data);
  },

  async getPalletsPage(params?: PalletFilters): Promise<PaginatedResponse<Pallet>> {
    const res = await apiClient.get<ListResponse<Pallet>>(EP.PALLETS, { params });
    return normalizePage(res.data, params);
  },

  async getPalletDetail(palletId: number): Promise<PalletDetail> {
    const res = await apiClient.get<PalletDetail>(EP.PALLET_DETAIL(palletId));
    return res.data;
  },

  async voidPallet(palletId: number, data?: VoidPayload): Promise<PalletDetail> {
    const res = await apiClient.post<PalletDetail>(EP.PALLET_VOID(palletId), data || {});
    return res.data;
  },

  async movePallet(palletId: number, data: PalletMovePayload): Promise<PalletDetail> {
    const res = await apiClient.post<PalletDetail>(EP.PALLET_MOVE(palletId), data);
    return res.data;
  },

  async clearPallet(palletId: number, data?: PalletClearPayload): Promise<PalletDetail> {
    const res = await apiClient.post<PalletDetail>(EP.PALLET_CLEAR(palletId), data || {});
    return res.data;
  },

  async splitPallet(palletId: number, data: PalletSplitPayload): Promise<PalletDetail> {
    const res = await apiClient.post<PalletDetail>(EP.PALLET_SPLIT(palletId), data);
    return res.data;
  },

  async addBoxesToPallet(palletId: number, data: PalletAddBoxesPayload): Promise<PalletDetail> {
    const res = await apiClient.post<PalletDetail>(EP.PALLET_ADD_BOXES(palletId), data);
    return res.data;
  },

  async removeBoxesFromPallet(
    palletId: number,
    data: PalletRemoveBoxesPayload,
  ): Promise<PalletDetail> {
    const res = await apiClient.post<PalletDetail>(EP.PALLET_REMOVE_BOXES(palletId), data);
    return res.data;
  },

  async transferBoxes(data: BoxTransferPayload): Promise<Box[]> {
    const res = await apiClient.post<Box[]>(EP.TRANSFER_BOX, data);
    return res.data;
  },

  // =========================================================================
  // Print / Labels
  // =========================================================================

  async printBoxLabel(boxId: number, data?: PrintRequestPayload): Promise<LabelData> {
    const res = await apiClient.post<LabelData>(EP.PRINT_BOX(boxId), data || {});
    return res.data;
  },

  async printPalletLabel(palletId: number, data?: PrintRequestPayload): Promise<LabelData> {
    const res = await apiClient.post<LabelData>(EP.PRINT_PALLET(palletId), data || {});
    return res.data;
  },

  async printBulk(items: BulkPrintItem[]): Promise<LabelData[]> {
    const res = await apiClient.post<LabelData[]>(EP.PRINT_BULK, { items });
    return res.data;
  },

  async getPrintHistory(params?: PrintHistoryFilters): Promise<LabelPrintLog[]> {
    const res = await apiClient.get<ListResponse<LabelPrintLog>>(EP.PRINT_HISTORY, { params });
    return unwrapList(res.data);
  },

  async getPrintHistoryPage(
    params?: PrintHistoryFilters,
  ): Promise<PaginatedResponse<LabelPrintLog>> {
    const res = await apiClient.get<ListResponse<LabelPrintLog>>(EP.PRINT_HISTORY, { params });
    return normalizePage(res.data, params);
  },

  async getProductionReleaseOil(params?: {
    search?: string;
    limit?: number;
  }): Promise<ProductionReleaseOilRow[]> {
    const res = await apiClient.get<ProductionReleaseOilRow[]>(EP.PRODUCTION_RELEASE_OIL, {
      params,
    });
    return res.data;
  },

  // =========================================================================
  // Dismantle & Repack
  // =========================================================================

  async dismantlePallet(palletId: number, data: DismantlePalletPayload): Promise<PalletDetail> {
    const res = await apiClient.post<PalletDetail>(EP.DISMANTLE_PALLET(palletId), data);
    return res.data;
  },

  async dismantleBox(boxId: number, data: DismantleBoxPayload): Promise<LooseStock> {
    const res = await apiClient.post<LooseStock>(EP.DISMANTLE_BOX(boxId), data);
    return res.data;
  },

  async repack(data: RepackPayload): Promise<BoxDetail> {
    const res = await apiClient.post<BoxDetail>(EP.REPACK, data);
    return res.data;
  },

  // =========================================================================
  // Loose Stock
  // =========================================================================

  async getLooseStock(params?: LooseStockFilters): Promise<LooseStock[]> {
    const res = await apiClient.get<ListResponse<LooseStock>>(EP.LOOSE, { params });
    return unwrapList(res.data);
  },

  async getLooseStockPage(params?: LooseStockFilters): Promise<PaginatedResponse<LooseStock>> {
    const res = await apiClient.get<ListResponse<LooseStock>>(EP.LOOSE, { params });
    return normalizePage(res.data, params);
  },

  async getLooseStockDetail(looseId: number): Promise<LooseStock> {
    const res = await apiClient.get<LooseStock>(EP.LOOSE_DETAIL(looseId));
    return res.data;
  },

  // =========================================================================
  // Scan
  // =========================================================================

  async processScan(data: ScanRequestPayload): Promise<ScanResponse> {
    const res = await apiClient.post<ScanResponse>(EP.SCAN, data);
    return res.data;
  },

  async lookupBarcode(barcode: string): Promise<LookupResponse> {
    const res = await apiClient.get<LookupResponse>(EP.LOOKUP(barcode));
    return res.data;
  },
};
