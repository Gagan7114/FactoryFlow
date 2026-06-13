import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AUDIT_STALE_TIME } from '../constants';
import type { AuditEntryFilters, AuditSubmitPayload } from '../types';
import { auditApi } from './audit.api';

export const AUDIT_QUERY_KEYS = {
  all: ['audit'] as const,
  entries: (filters: AuditEntryFilters) =>
    [...AUDIT_QUERY_KEYS.all, 'entries', filters] as const,
  entry: (entryId: number) => [...AUDIT_QUERY_KEYS.all, 'entry', entryId] as const,
  summary: () => [...AUDIT_QUERY_KEYS.all, 'summary'] as const,
};

export function useAuditEntries(filters: AuditEntryFilters = {}) {
  return useQuery({
    queryKey: AUDIT_QUERY_KEYS.entries(filters),
    queryFn: () => auditApi.listEntries(filters),
    staleTime: AUDIT_STALE_TIME,
  });
}

export function useAuditEntry(entryId: number | null) {
  return useQuery({
    queryKey: AUDIT_QUERY_KEYS.entry(entryId!),
    queryFn: () => auditApi.getEntry(entryId!),
    enabled: entryId != null,
  });
}

export function useAuditSummary() {
  return useQuery({
    queryKey: AUDIT_QUERY_KEYS.summary(),
    queryFn: () => auditApi.getSummary(),
    staleTime: AUDIT_STALE_TIME,
  });
}

function useInvalidateAudit() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: AUDIT_QUERY_KEYS.all });
}

export function useSubmitAuditEntry() {
  const invalidate = useInvalidateAudit();
  return useMutation({
    mutationFn: (payload: AuditSubmitPayload) => auditApi.submitEntry(payload),
    onSuccess: invalidate,
  });
}

export function useReceiveDocuments() {
  const invalidate = useInvalidateAudit();
  return useMutation({
    mutationFn: ({ entryId, remarks }: { entryId: number; remarks?: string }) =>
      auditApi.receiveDocuments(entryId, remarks),
    onSuccess: invalidate,
  });
}

export function usePreAudit() {
  const invalidate = useInvalidateAudit();
  return useMutation({
    mutationFn: ({ entryId, remarks }: { entryId: number; remarks?: string }) =>
      auditApi.preAudit(entryId, remarks),
    onSuccess: invalidate,
  });
}

export function useSetAuditRemarks() {
  const invalidate = useInvalidateAudit();
  return useMutation({
    mutationFn: ({ entryId, remarks }: { entryId: number; remarks: string }) =>
      auditApi.setRemarks(entryId, remarks),
    onSuccess: invalidate,
  });
}
