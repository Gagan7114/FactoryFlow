import { toast } from 'sonner';

import type { ApiError } from '@/core/api/types';
import { getErrorMessage } from '@/shared/utils';

const TOASTED_BY_API_CLIENT = new Set([400, 401, 403, 500, 502, 503, 504]);

const getStatus = (error: unknown) => {
  if (!error || typeof error !== 'object') return undefined;
  const apiError = error as Partial<ApiError>;
  return apiError.status || apiError.response?.status;
};

export function getBarcodeErrorMessage(error: unknown, fallbackMessage: string) {
  return getErrorMessage(error, fallbackMessage);
}

export function toastBarcodeError(error: unknown, fallbackMessage: string) {
  const status = getStatus(error);
  if (status && TOASTED_BY_API_CLIENT.has(status)) return;

  toast.error(getBarcodeErrorMessage(error, fallbackMessage));
}
