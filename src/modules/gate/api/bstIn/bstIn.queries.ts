import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type BSTGateInCreateRequest,
  type BSTGateInEligibleOutParams,
  type BSTGateInParams,
  type BSTGateInUpdateRequest,
  bstInApi,
} from './bstIn.api';

export const BST_IN_QUERY_KEYS = {
  all: ['bstIn'] as const,
  list: (params?: BSTGateInParams) => [...BST_IN_QUERY_KEYS.all, 'list', params] as const,
  detail: (id?: number | null) => [...BST_IN_QUERY_KEYS.all, 'detail', id] as const,
  byVehicleEntry: (vehicleEntryId?: number | null) =>
    [...BST_IN_QUERY_KEYS.all, 'byVehicleEntry', vehicleEntryId] as const,
  eligibleOuts: (params?: BSTGateInEligibleOutParams) =>
    [...BST_IN_QUERY_KEYS.all, 'eligibleOuts', params] as const,
};

export function useBSTGateInEntries(params?: BSTGateInParams) {
  return useQuery({
    queryKey: BST_IN_QUERY_KEYS.list(params),
    queryFn: () => bstInApi.list(params),
    staleTime: 30 * 1000,
  });
}

export function useBSTGateIn(id?: number | null) {
  return useQuery({
    queryKey: BST_IN_QUERY_KEYS.detail(id),
    queryFn: () => bstInApi.get(id!),
    enabled: !!id,
  });
}

export function useBSTGateInByVehicleEntry(vehicleEntryId?: number | null) {
  return useQuery({
    queryKey: BST_IN_QUERY_KEYS.byVehicleEntry(vehicleEntryId),
    queryFn: () => bstInApi.getByVehicleEntry(vehicleEntryId!),
    enabled: !!vehicleEntryId,
  });
}

export function useBSTGateInEligibleOuts(params?: BSTGateInEligibleOutParams) {
  return useQuery({
    queryKey: BST_IN_QUERY_KEYS.eligibleOuts(params),
    queryFn: () => bstInApi.eligibleOuts(params),
    staleTime: 30 * 1000,
  });
}

export function useCreateBSTGateIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BSTGateInCreateRequest) => bstInApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BST_IN_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['bstOut'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    },
  });
}

export function useUpdateBSTGateIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: BSTGateInUpdateRequest }) =>
      bstInApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BST_IN_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['bstOut'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    },
  });
}

export function useCompleteBSTGateIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vehicleEntryId: number) => bstInApi.complete(vehicleEntryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BST_IN_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['bstOut'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    },
  });
}
