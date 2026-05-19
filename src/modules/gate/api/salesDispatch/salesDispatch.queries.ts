import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type SalesDispatchAttachmentUploadRequest,
  type SalesDispatchCreateRequest,
  type SalesDispatchDocumentParams,
  type SalesDispatchDocumentType,
  type SalesDispatchGatepassPrintRequest,
  type SalesDispatchListParams,
  type SalesDispatchReasonRequest,
  type SalesDispatchUpdateRequest,
  salesDispatchApi,
} from './salesDispatch.api';

export const SALES_DISPATCH_QUERY_KEYS = {
  all: ['salesDispatch'] as const,
  documents: (params?: SalesDispatchDocumentParams) =>
    [...SALES_DISPATCH_QUERY_KEYS.all, 'documents', params] as const,
  document: (documentType?: SalesDispatchDocumentType | null, docEntry?: number | null) =>
    [...SALES_DISPATCH_QUERY_KEYS.all, 'document', documentType, docEntry] as const,
  list: (params?: SalesDispatchListParams) =>
    [...SALES_DISPATCH_QUERY_KEYS.all, 'list', params] as const,
  detail: (id?: number | null) => [...SALES_DISPATCH_QUERY_KEYS.all, 'detail', id] as const,
  byVehicleEntry: (vehicleEntryId?: number | null) =>
    [...SALES_DISPATCH_QUERY_KEYS.all, 'byVehicleEntry', vehicleEntryId] as const,
  attachments: (id?: number | null) =>
    [...SALES_DISPATCH_QUERY_KEYS.all, 'attachments', id] as const,
};

function invalidateSalesDispatch(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: SALES_DISPATCH_QUERY_KEYS.all });
  queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
  queryClient.invalidateQueries({ queryKey: ['dispatchPlans'] });
}

export function useSalesDispatchDocuments(
  params?: SalesDispatchDocumentParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.documents(params),
    queryFn: () => salesDispatchApi.documents(params),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useSalesDispatchDocument(
  documentType?: SalesDispatchDocumentType | null,
  docEntry?: number | null,
) {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.document(documentType, docEntry),
    queryFn: () => salesDispatchApi.document(documentType!, docEntry!),
    enabled: !!documentType && !!docEntry,
    staleTime: 60 * 1000,
  });
}

export function useSalesDispatchEntries(
  params?: SalesDispatchListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.list(params),
    queryFn: () => salesDispatchApi.list(params),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useSalesDispatch(id?: number | null) {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.detail(id),
    queryFn: () => salesDispatchApi.get(id!),
    enabled: !!id,
  });
}

export function useSalesDispatchByVehicleEntry(vehicleEntryId?: number | null) {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.byVehicleEntry(vehicleEntryId),
    queryFn: () => salesDispatchApi.getByVehicleEntry(vehicleEntryId!),
    enabled: !!vehicleEntryId,
  });
}

export function useSalesDispatchAttachments(id?: number | null) {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.attachments(id),
    queryFn: () => salesDispatchApi.attachments(id!),
    enabled: !!id,
  });
}

export function useCreateSalesDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SalesDispatchCreateRequest) => salesDispatchApi.create(data),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function useUpdateSalesDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SalesDispatchUpdateRequest }) =>
      salesDispatchApi.update(id, data),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function useUploadSalesDispatchAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SalesDispatchAttachmentUploadRequest }) =>
      salesDispatchApi.uploadAttachment(id, data),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function usePreviewSalesDispatchGatepass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => salesDispatchApi.previewGatepass(id),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function usePrintSalesDispatchGatepass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SalesDispatchGatepassPrintRequest }) =>
      salesDispatchApi.printGatepass(id, data),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function useCommitSalesDispatchPrint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => salesDispatchApi.commitPrint(id),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function useMarkSalesDispatchDispatched() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => salesDispatchApi.markDispatched(id),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function useRejectSalesDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SalesDispatchReasonRequest }) =>
      salesDispatchApi.reject(id, data),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function useCancelSalesDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SalesDispatchReasonRequest }) =>
      salesDispatchApi.cancel(id, data),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}
