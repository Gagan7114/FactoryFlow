import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  dockingApprovalApi,
  type DockingScanSkipCreateRequest,
  type DockingScanSkipListParams,
  type DockingScanSkipReviewRequest,
} from './dockingApproval.api';

export const DOCKING_APPROVAL_QUERY_KEYS = {
  all: ['dockingScanSkip'] as const,
  list: (params?: DockingScanSkipListParams) =>
    [...DOCKING_APPROVAL_QUERY_KEYS.all, 'list', params] as const,
  byDispatch: (entryId?: number | null) =>
    [...DOCKING_APPROVAL_QUERY_KEYS.all, 'byDispatch', entryId] as const,
};

function invalidateDockingApproval(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: DOCKING_APPROVAL_QUERY_KEYS.all });
  // The scan page gates "Continue" on the docking entry's skip status.
  queryClient.invalidateQueries({ queryKey: ['salesDispatch'] });
}

export function useDockingScanSkipRequests(
  params?: DockingScanSkipListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: DOCKING_APPROVAL_QUERY_KEYS.list(params),
    queryFn: () => dockingApprovalApi.list(params),
    staleTime: 15 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useDockingScanSkipRequestByDispatch(entryId?: number | null) {
  return useQuery({
    queryKey: DOCKING_APPROVAL_QUERY_KEYS.byDispatch(entryId),
    queryFn: () => dockingApprovalApi.byDispatch(entryId as number),
    enabled: Boolean(entryId),
  });
}

export function useCreateDockingScanSkipRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DockingScanSkipCreateRequest) => dockingApprovalApi.create(data),
    onSuccess: () => invalidateDockingApproval(queryClient),
  });
}

export function useApproveDockingScanSkipRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: DockingScanSkipReviewRequest }) =>
      dockingApprovalApi.approve(id, data),
    onSuccess: () => invalidateDockingApproval(queryClient),
  });
}

export function useRejectDockingScanSkipRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DockingScanSkipReviewRequest }) =>
      dockingApprovalApi.reject(id, data),
    onSuccess: () => invalidateDockingApproval(queryClient),
  });
}
