import { Bell, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { useAppSelector } from '@/core/store';
import { Button } from '@/shared/components/ui';

import { fcmService } from '../fcm.service';
import { usePushNotifications } from '../hooks';

const DISMISSED_KEY = 'notification-permission-dismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function isIOSLike(): boolean {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function canRequestOnThisInstall(): boolean {
  return !isIOSLike() || fcmService.isPWA();
}

export function NotificationPermissionPrompt() {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { isLoading, permission, token, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(readDismissed);
  const [requestError, setRequestError] = useState<string | null>(null);

  const canShow = useMemo(
    () =>
      isAuthenticated &&
      !dismissed &&
      !token &&
      permission === 'default' &&
      fcmService.isSupported() &&
      canRequestOnThisInstall(),
    [dismissed, isAuthenticated, permission, token],
  );

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // Ignore storage failures; dismissal is best effort.
    }
  }, []);

  const enableNotifications = useCallback(async () => {
    setRequestError(null);
    try {
      await requestPermission();
      setDismissed(true);
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unable to enable notifications',
      );
    }
  }, [requestPermission]);

  if (!canShow) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-lg border bg-background p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold leading-none">Enable phone alerts</p>
            <p className="text-sm text-muted-foreground">
              Receive dispatch and approval updates on this device.
            </p>
            {requestError && <p className="text-xs text-destructive">{requestError}</p>}
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-sm opacity-70 transition-opacity hover:opacity-100"
            aria-label="Dismiss notification prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Not now
          </Button>
          <Button size="sm" onClick={enableNotifications} disabled={isLoading}>
            <Bell className="h-4 w-4" />
            {isLoading ? 'Enabling' : 'Enable'}
          </Button>
        </div>
      </div>
    </div>
  );
}
