import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type BSTGateReturnCreateRequest,
  type BSTGateReturnEligibleOutParams,
  type BSTGateReturnParams,
  type BSTGateReturnUpdateRequest,
  bstReturnApi,
} from './bstReturn.api';

export const BST_RETURN_QUERY_KEYS = {
  all: ['bstReturn'] as const,
  list: (params?: BSTGateReturnParams) => [...BST_RETURN_QUERY_KEYS.all, 'list', params] as const,
  detail: (id?: number | null) => [...BST_RETURN_QUERY_KEYS.all, 'detail', id] as const,
  byVehicleEntry: (vehicleEntryId?: number | null) =>
    [...BST_RETURN_QUERY_KEYS.all, 'byVehicleEntry', vehicleEntryId] as const,
  eligibleOuts: (params?: BSTGateReturnEligibleOutParams) =>
    [...BST_RETURN_QUERY_KEYS.all, 'eligibleOuts', params] as const,
};

export function useBSTGateReturnEntries(
  params?: BSTGateReturnParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: BST_RETURN_QUERY_KEYS.list(params),
    queryFn: () => bstReturnApi.list(params),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useBSTGateReturn(id?: number | null) {
  return useQuery({
    queryKey: BST_RETURN_QUERY_KEYS.detail(id),
    queryFn: () => bstReturnApi.get(id!),
    enabled: !!id,
  });
}

export function useBSTGateReturnByVehicleEntry(vehicleEntryId?: number | null) {
  return useQuery({
    queryKey: BST_RETURN_QUERY_KEYS.byVehicleEntry(vehicleEntryId),
    queryFn: () => bstReturnApi.getByVehicleEntry(vehicleEntryId!),
    enabled: !!vehicleEntryId,
  });
}

export function useBSTGateReturnEligibleOuts(
  params?: BSTGateReturnEligibleOutParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: BST_RETURN_QUERY_KEYS.eligibleOuts(params),
    queryFn: () => bstReturnApi.eligibleOuts(params),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateBSTGateReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BSTGateReturnCreateRequest) => bstReturnApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BST_RETURN_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['bstOut'] });
      queryClient.invalidateQueries({ queryKey: ['bstIn'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    },
  });
}

export function useUpdateBSTGateReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: BSTGateReturnUpdateRequest }) =>
      bstReturnApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BST_RETURN_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['bstOut'] });
      queryClient.invalidateQueries({ queryKey: ['bstIn'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    },
  });
}

export function useCompleteBSTGateReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vehicleEntryId: number) => bstReturnApi.complete(vehicleEntryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BST_RETURN_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['bstOut'] });
      queryClient.invalidateQueries({ queryKey: ['bstIn'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    },
  });
}
