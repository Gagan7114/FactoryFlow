export interface AiAssistantRequest {
  question: string;
  page?: string;
}

export interface AiAssistantSource {
  type: string;
  label: string;
}

export interface AiAssistantContextSummary {
  company_code: string;
  page: string;
  tokens_used_for_lookup: string[];
  box_count: number;
  pallet_count: number;
  print_log_count: number;
  production_release_count: number;
  document_count: number;
}

export interface AiAssistantResponse {
  answer: string;
  sources: AiAssistantSource[];
  context_summary: AiAssistantContextSummary;
  model: string;
  mode: 'read_only';
}
