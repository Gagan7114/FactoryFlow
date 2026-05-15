import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  OpenBilty,
  TransporterAPInvoicePostRequest,
  TransporterAPInvoicePosting,
  TransporterAPInvoicePostResponse,
  TransporterAPInvoicePreview,
  TransporterAPInvoicePreviewRequest,
} from '../types';

export const dispatchApi = {
  async getOpenBilties(): Promise<OpenBilty[]> {
    const response = await apiClient.get<OpenBilty[]>(API_ENDPOINTS.DISPATCH.OPEN_BILTIES);
    return response.data;
  },

  async previewTransporterInvoice(
    data: TransporterAPInvoicePreviewRequest,
  ): Promise<TransporterAPInvoicePreview> {
    const response = await apiClient.post<TransporterAPInvoicePreview>(
      API_ENDPOINTS.DISPATCH.TRANSPORTER_INVOICE_PREVIEW,
      data,
    );
    return response.data;
  },

  async postTransporterInvoice(
    data: TransporterAPInvoicePostRequest,
  ): Promise<TransporterAPInvoicePostResponse> {
    const { attachments, ...jsonData } = data;
    const files = attachments ?? [];

    if (files.length > 0) {
      const formData = new FormData();
      formData.append('data', JSON.stringify(jsonData));
      files.forEach((file) => {
        formData.append('attachments', file);
      });
      const response = await apiClient.post<TransporterAPInvoicePostResponse>(
        API_ENDPOINTS.DISPATCH.TRANSPORTER_INVOICE_POST_AP_INVOICE,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data;
    }

    const response = await apiClient.post<TransporterAPInvoicePostResponse>(
      API_ENDPOINTS.DISPATCH.TRANSPORTER_INVOICE_POST_AP_INVOICE,
      jsonData,
    );
    return response.data;
  },

  async getTransporterInvoiceHistory(): Promise<TransporterAPInvoicePosting[]> {
    const response = await apiClient.get<TransporterAPInvoicePosting[]>(
      API_ENDPOINTS.DISPATCH.TRANSPORTER_INVOICE_HISTORY,
    );
    return response.data;
  },

  async getTransporterInvoiceDetail(postingId: number): Promise<TransporterAPInvoicePosting> {
    const response = await apiClient.get<TransporterAPInvoicePosting>(
      API_ENDPOINTS.DISPATCH.TRANSPORTER_INVOICE_DETAIL(postingId),
    );
    return response.data;
  },
};
