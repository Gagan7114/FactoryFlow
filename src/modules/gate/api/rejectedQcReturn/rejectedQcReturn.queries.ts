import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type RejectedQCReturnCreateRequest,
  type RejectedQCReturnParams,
  rejectedQCReturnApi,
} from './rejectedQcReturn.api';

export const REJECTED_QC_RETURN_QUERY_KEYS = {
  all: ['rejectedQcReturns'] as const,
  list: (params?: RejectedQCReturnParams) =>
    [...REJECTED_QC_RETURN_QUERY_KEYS.all, 'list', params] as const,
};

export function useRejectedQCReturnEntries(
  params?: RejectedQCReturnParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: REJECTED_QC_RETURN_QUERY_KEYS.list(params),
    queryFn: () => rejectedQCReturnApi.list(params),
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
