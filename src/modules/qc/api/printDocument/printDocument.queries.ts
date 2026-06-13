import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { SaveQCPrintDocumentRequest } from '../../types';
import { printDocumentApi } from './printDocument.api';

export const PRINT_DOCUMENT_QUERY_KEYS = {
  all: ['qcPrintDocuments'] as const,
  lists: () => [...PRINT_DOCUMENT_QUERY_KEYS.all, 'list'] as const,
};

export function usePrintDocuments() {
  return useQuery({
    queryKey: PRINT_DOCUMENT_QUERY_KEYS.lists(),
    queryFn: () => printDocumentApi.getList(),
  });
}

export function useCreatePrintDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SaveQCPrintDocumentRequest) => printDocumentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRINT_DOCUMENT_QUERY_KEYS.lists() });
    },
  });
}

export function useUpdatePrintDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SaveQCPrintDocumentRequest }) =>
      printDocumentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRINT_DOCUMENT_QUERY_KEYS.lists() });
    },
  });
}

export function useDeletePrintDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => printDocumentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRINT_DOCUMENT_QUERY_KEYS.lists() });
    },
  });
}
