import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  AuditEntryFilters,
  AuditInvoiceEntry,
  AuditSubmitPayload,
  AuditSummary,
} from '../types';

const EP = API_ENDPOINTS.AUDIT;

export const auditApi = {
  async listEntries(filters: AuditEntryFilters = {}): Promise<AuditInvoiceEntry[]> {
    const params: Record<string, string> = {};
    if (filters.type) params.type = filters.type;
    if (filters.status) params.status = filters.status;
    if (filters.scope) params.scope = filters.scope;

    const response = await apiClient.get<AuditInvoiceEntry[]>(EP.ENTRIES, { params });
    return response.data;
  },

  async getEntry(entryId: number): Promise<AuditInvoiceEntry> {
    const response = await apiClient.get<AuditInvoiceEntry>(EP.DETAIL(entryId));
    return response.data;
  },

  async submitEntry(payload: AuditSubmitPayload): Promise<AuditInvoiceEntry> {
    const response = await apiClient.post<AuditInvoiceEntry>(EP.ENTRIES, payload);
    return response.data;
  },

  async receiveDocuments(entryId: number, remarks?: string): Promise<AuditInvoiceEntry> {
    const response = await apiClient.post<AuditInvoiceEntry>(EP.RECEIVE_DOCUMENTS(entryId), {
      remarks,
    });
    return response.data;
  },

  async preAudit(entryId: number, remarks?: string): Promise<AuditInvoiceEntry> {
    const response = await apiClient.post<AuditInvoiceEntry>(EP.PRE_AUDIT(entryId), {
      remarks,
    });
    return response.data;
  },

  async setRemarks(entryId: number, remarks: string): Promise<AuditInvoiceEntry> {
    const response = await apiClient.patch<AuditInvoiceEntry>(EP.REMARKS(entryId), {
      remarks,
    });
    return response.data;
  },

  async getSummary(): Promise<AuditSummary> {
    const response = await apiClient.get<AuditSummary>(EP.SUMMARY);
    return response.data;
  },
};
