type JobWorkStatusSource = {
  status?: string | null;
  production_order_doc_entry?: number | null;
  production_order_doc_num?: string | null;
};

export type JobWorkDisplayStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export function hasLinkedJobWorkProductionOrder(entry: JobWorkStatusSource) {
  return Boolean(entry.production_order_doc_entry || entry.production_order_doc_num);
}

export function getJobWorkDisplayStatus(entry: JobWorkStatusSource): JobWorkDisplayStatus {
  if (entry.status === 'CANCELLED') return 'CANCELLED';
  if (!hasLinkedJobWorkProductionOrder(entry)) return 'PENDING';
  if (entry.status === 'COMPLETED') return 'COMPLETED';
  return 'IN_PROGRESS';
}
