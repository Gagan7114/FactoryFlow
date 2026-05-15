import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { AiAssistantRequest, AiAssistantResponse } from '../types';

export const aiApi = {
  async askAssistant(data: AiAssistantRequest): Promise<AiAssistantResponse> {
    const res = await apiClient.post<AiAssistantResponse>(API_ENDPOINTS.AI.ASSISTANT_CHAT, data);
    return res.data;
  },
};
