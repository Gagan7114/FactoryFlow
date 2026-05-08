import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type EmptyVehicleGateOutCancelRequest,
  type EmptyVehicleGateOutCreateRequest,
  type EmptyVehicleGateOutParams,
  emptyVehicleOutApi,
} from './emptyVehicleOut.api';

export const EMPTY_VEHICLE_OUT_QUERY_KEYS = {
  all: ['emptyVehicleOut'] as const,
  eligible: (params?: EmptyVehicleGateOutParams) =>
    [...EMPTY_VEHICLE_OUT_QUERY_KEYS.all, 'eligible', params] as const,
  list: (params?: EmptyVehicleGateOutParams) =>
    [...EMPTY_VEHICLE_OUT_QUERY_KEYS.all, 'list', params] as const,
  detail: (id?: number | null) => [...EMPTY_VEHICLE_OUT_QUERY_KEYS.all, 'detail', id] as const,
};

export function useEmptyVehicleEligibleEntries(params?: EmptyVehicleGateOutParams) {
  return useQuery({
    queryKey: EMPTY_VEHICLE_OUT_QUERY_KEYS.eligible(params),
    queryFn: () => emptyVehicleOutApi.eligibleEntries(params),
    staleTime: 30 * 1000,
  });
}

export function useEmptyVehicleGateOutEntries(params?: EmptyVehicleGateOutParams) {
  return useQuery({
    queryKey: EMPTY_VEHICLE_OUT_QUERY_KEYS.list(params),
    queryFn: () => emptyVehicleOutApi.list(params),
    staleTime: 30 * 1000,
  });
}

export function useEmptyVehicleGateOut(id?: number | null) {
  return useQuery({
    queryKey: EMPTY_VEHICLE_OUT_QUERY_KEYS.detail(id),
    queryFn: () => emptyVehicleOutApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateEmptyVehicleGateOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EmptyVehicleGateOutCreateRequest) => emptyVehicleOutApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPTY_VEHICLE_OUT_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
    },
  });
}

export function useCancelEmptyVehicleGateOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: EmptyVehicleGateOutCancelRequest }) =>
      emptyVehicleOutApi.cancel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPTY_VEHICLE_OUT_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
    },
  });
}
