import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  jobWorkApi,
  type JobWorkGateInCreateRequest,
  type JobWorkGateInParams,
  type JobWorkGateInUpdateRequest,
  type SAPGRPOParams,
  type SAPProductionOrderParams,
} from './jobWork.api';

export const JOB_WORK_QUERY_KEYS = {
  all: ['jobWork'] as const,
  list: (params?: JobWorkGateInParams) => [...JOB_WORK_QUERY_KEYS.all, 'list', params] as const,
  detail: (id?: number | null) => [...JOB_WORK_QUERY_KEYS.all, 'detail', id] as const,
  byVehicleEntry: (vehicleEntryId?: number | null) =>
    [...JOB_WORK_QUERY_KEYS.all, 'byVehicleEntry', vehicleEntryId] as const,
  sapGrpos: (params?: SAPGRPOParams) => [...JOB_WORK_QUERY_KEYS.all, 'sapGrpos', params] as const,
  sapGrpo: (docEntry?: number | null) => [...JOB_WORK_QUERY_KEYS.all, 'sapGrpo', docEntry] as const,
  sapProductionOrders: (params?: SAPProductionOrderParams) =>
    [...JOB_WORK_QUERY_KEYS.all, 'sapProductionOrders', params] as const,
  sapProductionOrder: (docEntry?: number | null) =>
    [...JOB_WORK_QUERY_KEYS.all, 'sapProductionOrder', docEntry] as const,
};

export function useJobWorkGateInEntries(
  params?: JobWorkGateInParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: JOB_WORK_QUERY_KEYS.list(params),
    queryFn: () => jobWorkApi.list(params),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useJobWorkGateIn(id?: number | null) {
  return useQuery({
    queryKey: JOB_WORK_QUERY_KEYS.detail(id),
    queryFn: () => jobWorkApi.get(id!),
    enabled: !!id,
  });
}

export function useJobWorkGateInByVehicleEntry(vehicleEntryId?: number | null) {
  return useQuery({
    queryKey: JOB_WORK_QUERY_KEYS.byVehicleEntry(vehicleEntryId),
    queryFn: () => jobWorkApi.getByVehicleEntry(vehicleEntryId!),
    enabled: !!vehicleEntryId,
  });
}

export function useSAPGRPOs(params?: SAPGRPOParams) {
  return useQuery({
    queryKey: JOB_WORK_QUERY_KEYS.sapGrpos(params),
    queryFn: () => jobWorkApi.sapGrpos(params),
    staleTime: 30 * 1000,
  });
}

export function useSAPGRPO(docEntry?: number | null) {
  return useQuery({
    queryKey: JOB_WORK_QUERY_KEYS.sapGrpo(docEntry),
    queryFn: () => jobWorkApi.sapGrpo(docEntry!),
    enabled: !!docEntry,
    staleTime: 60 * 1000,
  });
}

export function useSAPProductionOrders(params?: SAPProductionOrderParams) {
  return useQuery({
    queryKey: JOB_WORK_QUERY_KEYS.sapProductionOrders(params),
    queryFn: () => jobWorkApi.sapProductionOrders(params),
    staleTime: 30 * 1000,
  });
}

export function useSAPProductionOrder(docEntry?: number | null) {
  return useQuery({
    queryKey: JOB_WORK_QUERY_KEYS.sapProductionOrder(docEntry),
    queryFn: () => jobWorkApi.sapProductionOrder(docEntry!),
    enabled: !!docEntry,
    staleTime: 60 * 1000,
  });
}

export function useCreateJobWorkGateIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: JobWorkGateInCreateRequest) => jobWorkApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOB_WORK_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    },
  });
}

export function useUpdateJobWorkGateIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: JobWorkGateInUpdateRequest }) =>
      jobWorkApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOB_WORK_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    },
  });
}

export function useCompleteJobWorkGateIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vehicleEntryId: number) => jobWorkApi.complete(vehicleEntryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOB_WORK_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    },
  });
}
