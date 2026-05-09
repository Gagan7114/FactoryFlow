import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type SalesDispatchActionRequest,
  salesDispatchApi,
  type SalesDispatchAttachmentRequest,
  type SalesDispatchGateOutCreateRequest,
  type SalesDispatchGateOutParams,
  type SalesDispatchGateOutUpdateRequest,
} from './salesDispatch.api';

export const SALES_DISPATCH_QUERY_KEYS = {
  all: ['salesDispatchGateOuts'] as const,
  list: (params?: SalesDispatchGateOutParams) =>
    [...SALES_DISPATCH_QUERY_KEYS.all, 'list', params] as const,
  detail: (id?: number | null) => [...SALES_DISPATCH_QUERY_KEYS.all, 'detail', id] as const,
  lock: () => [...SALES_DISPATCH_QUERY_KEYS.all, 'lock'] as const,
};

export function useSalesDispatchGateOuts(params?: SalesDispatchGateOutParams) {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.list(params),
    queryFn: () => salesDispatchApi.list(params),
    staleTime: 30 * 1000,
  });
}

export function useSalesDispatchGateOut(id?: number | null) {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.detail(id),
    queryFn: () => salesDispatchApi.get(id!),
    enabled: !!id,
  });
}

export function useDispatchGateLock() {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.lock(),
    queryFn: () => salesDispatchApi.getLock(),
    staleTime: 30 * 1000,
  });
}

function useInvalidateSalesDispatch() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: SALES_DISPATCH_QUERY_KEYS.all });
    queryClient.invalidateQueries({ queryKey: ['dispatch-plans'] });
  };
}

export function useCreateSalesDispatchGateOut() {
  const invalidate = useInvalidateSalesDispatch();

  return useMutation({
    mutationFn: (data: SalesDispatchGateOutCreateRequest) => salesDispatchApi.create(data),
    onSuccess: invalidate,
  });
}

export function useUpdateSalesDispatchGateOut() {
  const invalidate = useInvalidateSalesDispatch();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SalesDispatchGateOutUpdateRequest }) =>
      salesDispatchApi.update(id, data),
    onSuccess: invalidate,
  });
}

export function useUploadSalesDispatchAttachments() {
  const invalidate = useInvalidateSalesDispatch();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SalesDispatchAttachmentRequest }) =>
      salesDispatchApi.uploadAttachments(id, data),
    onSuccess: invalidate,
  });
}

export function useCompleteSalesDispatchGateOut() {
  const invalidate = useInvalidateSalesDispatch();

  return useMutation({
    mutationFn: (id: number) => salesDispatchApi.complete(id),
    onSuccess: invalidate,
  });
}

export function useCommitSalesDispatchGatePassPrint() {
  const invalidate = useInvalidateSalesDispatch();

  return useMutation({
    mutationFn: (id: number) => salesDispatchApi.commitPrint(id),
    onSuccess: invalidate,
  });
}

export function useCancelSalesDispatchGateOut() {
  const invalidate = useInvalidateSalesDispatch();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SalesDispatchActionRequest }) =>
      salesDispatchApi.cancel(id, data),
    onSuccess: invalidate,
  });
}

export function useRejectSalesDispatchGateOut() {
  const invalidate = useInvalidateSalesDispatch();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SalesDispatchActionRequest }) =>
      salesDispatchApi.reject(id, data),
    onSuccess: invalidate,
  });
}

export function useUpdateDispatchGateLock() {
  const invalidate = useInvalidateSalesDispatch();

  return useMutation({
    mutationFn: (data: { locked: boolean; reason?: string }) => salesDispatchApi.updateLock(data),
    onSuccess: invalidate,
  });
}
