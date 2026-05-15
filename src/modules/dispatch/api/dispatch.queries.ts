import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  TransporterAPInvoicePostRequest,
  TransporterAPInvoicePreviewRequest,
} from '../types';
import { dispatchApi } from './dispatch.api';

export const DISPATCH_QUERY_KEYS = {
  all: ['dispatch'] as const,
  openBilties: () => [...DISPATCH_QUERY_KEYS.all, 'open-bilties'] as const,
  transporterInvoicePreview: (ids: number[]) =>
    [...DISPATCH_QUERY_KEYS.all, 'transporter-invoice-preview', ids] as const,
  transporterInvoiceHistory: () =>
    [...DISPATCH_QUERY_KEYS.all, 'transporter-invoice-history'] as const,
  transporterInvoiceDetail: (postingId: number) =>
    [...DISPATCH_QUERY_KEYS.all, 'transporter-invoice-detail', postingId] as const,
};

export function useOpenBilties() {
  return useQuery({
    queryKey: DISPATCH_QUERY_KEYS.openBilties(),
    queryFn: () => dispatchApi.getOpenBilties(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function usePreviewTransporterInvoice() {
  return useMutation({
    mutationFn: (data: TransporterAPInvoicePreviewRequest) =>
      dispatchApi.previewTransporterInvoice(data),
  });
}

export function usePostTransporterInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TransporterAPInvoicePostRequest) =>
      dispatchApi.postTransporterInvoice(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: DISPATCH_QUERY_KEYS.openBilties() });
      queryClient.invalidateQueries({
        queryKey: DISPATCH_QUERY_KEYS.transporterInvoiceHistory(),
      });
      queryClient.invalidateQueries({
        queryKey: DISPATCH_QUERY_KEYS.transporterInvoiceDetail(
          response.transporter_ap_invoice_posting_id,
        ),
      });
    },
  });
}

export function useTransporterInvoiceHistory() {
  return useQuery({
    queryKey: DISPATCH_QUERY_KEYS.transporterInvoiceHistory(),
    queryFn: () => dispatchApi.getTransporterInvoiceHistory(),
  });
}

export function useTransporterInvoiceDetail(postingId: number | null) {
  return useQuery({
    queryKey: DISPATCH_QUERY_KEYS.transporterInvoiceDetail(postingId!),
    queryFn: () => dispatchApi.getTransporterInvoiceDetail(postingId!),
    enabled: !!postingId,
  });
}
