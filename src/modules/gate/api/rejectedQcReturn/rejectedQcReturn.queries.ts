import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type RejectedQCReturnCreateRequest, rejectedQCReturnApi } from './rejectedQcReturn.api';

export const REJECTED_QC_RETURN_QUERY_KEYS = {
  all: ['rejectedQcReturns'] as const,
  list: () => [...REJECTED_QC_RETURN_QUERY_KEYS.all, 'list'] as const,
};

export function useRejectedQCReturnEntries(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: REJECTED_QC_RETURN_QUERY_KEYS.list(),
    queryFn: () => rejectedQCReturnApi.list(),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateRejectedQCReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RejectedQCReturnCreateRequest) => rejectedQCReturnApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REJECTED_QC_RETURN_QUERY_KEYS.all });
    },
  });
}
