import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type BSTGateOutCancelRequest,
  type BSTGateOutCreateRequest,
  type BSTGateOutParams,
  type BSTGateOutUpdateRequest,
  bstOutApi,
  type SAPStockTransferParams,
} from './bstOut.api';

export const BST_OUT_QUERY_KEYS = {
  all: ['bstOut'] as const,
  list: (params?: BSTGateOutParams) => [...BST_OUT_QUERY_KEYS.all, 'list', params] as const,
  detail: (id?: number | null) => [...BST_OUT_QUERY_KEYS.all, 'detail', id] as const,
  byVehicleEntry: (vehicleEntryId?: number | null) =>
    [...BST_OUT_QUERY_KEYS.all, 'byVehicleEntry', vehicleEntryId] as const,
  sapTransfers: (params?: SAPStockTransferParams) =>
    [...BST_OUT_QUERY_KEYS.all, 'sapTransfers', params] as const,
  sapTransfer: (docEntry?: number | null) =>
    [...BST_OUT_QUERY_KEYS.all, 'sapTransfer', docEntry] as const,
};

export function useBSTGateOutEntries(params?: BSTGateOutParams) {
  return useQuery({
    queryKey: BST_OUT_QUERY_KEYS.list(params),
    queryFn: () => bstOutApi.list(params),
    staleTime: 30 * 1000,
  });
}

export function useBSTGateOut(id?: number | null) {
  return useQuery({
    queryKey: BST_OUT_QUERY_KEYS.detail(id),
    queryFn: () => bstOutApi.get(id!),
    enabled: !!id,
  });
}

export function useBSTGateOutByVehicleEntry(vehicleEntryId?: number | null) {
  return useQuery({
    queryKey: BST_OUT_QUERY_KEYS.byVehicleEntry(vehicleEntryId),
    queryFn: () => bstOutApi.getByVehicleEntry(vehicleEntryId!),
    enabled: !!vehicleEntryId,
  });
}

export function useSAPStockTransfers(
  params?: SAPStockTransferParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: BST_OUT_QUERY_KEYS.sapTransfers(params),
    queryFn: () => bstOutApi.sapTransfers(params),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
  });
}

export function useSAPStockTransfer(docEntry?: number | null) {
  return useQuery({
    queryKey: BST_OUT_QUERY_KEYS.sapTransfer(docEntry),
    queryFn: () => bstOutApi.sapTransfer(docEntry!),
    enabled: !!docEntry,
    staleTime: 60 * 1000,
  });
}

export function useCreateBSTGateOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BSTGateOutCreateRequest) => bstOutApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BST_OUT_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['emptyVehicleIn'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    },
  });
}

export function useUpdateBSTGateOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: BSTGateOutUpdateRequest }) =>
      bstOutApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BST_OUT_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['emptyVehicleIn'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    },
  });
}

export function useCancelBSTGateOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: BSTGateOutCancelRequest }) =>
      bstOutApi.cancel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BST_OUT_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['emptyVehicleIn'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    },
  });
}

export function useCompleteBSTGateOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vehicleEntryId: number) => bstOutApi.complete(vehicleEntryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BST_OUT_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['emptyVehicleIn'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    },
  });
}
