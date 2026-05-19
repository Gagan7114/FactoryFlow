import { env } from '@/config/env.config';

const ABSOLUTE_URL_RE = /^(?:https?:|blob:|data:)/i;

function getApiOrigin() {
  try {
    return new URL(env.apiBaseUrl).origin;
  } catch {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return env.apiBaseUrl.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
  }
}

export function resolveFileUrl(fileUrl?: string | null) {
  if (!fileUrl) return '';
  if (ABSOLUTE_URL_RE.test(fileUrl)) return fileUrl;
  if (fileUrl.startsWith('//') && typeof window !== 'undefined') {
    return `${window.location.protocol}${fileUrl}`;
  }

  try {
    return new URL(fileUrl, getApiOrigin()).toString();
  } catch {
    return fileUrl;
  }
}
