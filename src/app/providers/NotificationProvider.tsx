import { type MessagePayload } from 'firebase/messaging';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { Notification } from '@/core/notifications';
import { fcmService, notificationService } from '@/core/notifications';
import { useAppDispatch, useAppSelector } from '@/core/store';
import {
  addNotification,
  fetchUnreadCount,
  selectFCMState,
  setFCMPermission,
  setupPushNotifications,
} from '@/core/store/slices/notification.slice';

interface NotificationProviderProps {
  children: React.ReactNode;
}

const BACKEND_DEVICE_REGISTER_RETRY_MS = 30000;
const UNREAD_COUNT_FETCH_DELAY_MS = 200;

/**
 * NotificationProvider
 *
 * Flow:
 * Login → FCM setup (permission + token) → Register device with backend → ...
 * Company select → Fetch unread count
 * Logout → Unregister device → Delete FCM token
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  const dispatch = useAppDispatch();
  const { isAuthenticated, currentCompany } = useAppSelector((state) => state.auth);
  const fcmState = useAppSelector(selectFCMState);
  const messageListenerRef = useRef<(() => void) | null>(null);
  const setupAttemptedRef = useRef(false);
  const deviceRegisteredTokenRef = useRef<string | null>(null);
  const registrationRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [registrationRetryTick, setRegistrationRetryTick] = useState(0);

  /**
   * Handle incoming foreground messages
   */
  const handleForegroundMessage = useCallback(
    (payload: MessagePayload) => {
      if (import.meta.env.DEV) {
        console.log('[NotificationProvider] Foreground message:', payload);
      }

      const typeCode = payload.data?.notification_type || payload.data?.type_code || 'UNKNOWN';

      const notification: Notification = {
        id: Date.now(),
        type_code: typeCode,
        notification_type: typeCode,
        title: payload.notification?.title || payload.data?.title || 'New Notification',
        body: payload.notification?.body || payload.data?.body || '',
        click_action_url: payload.data?.url,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      dispatch(addNotification(notification));

      if (document.visibilityState === 'visible') {
        toast.info(notification.title, {
          description: notification.body,
          action: payload.data?.url
            ? {
                label: 'View',
                onClick: () => {
                  window.location.href = payload.data!.url!;
                },
              }
            : undefined,
        });
      } else if (globalThis.Notification?.permission === 'granted') {
        const browserNotification = new globalThis.Notification(notification.title, {
          body: notification.body,
          icon: '/pwa-192x192.png',
          tag: payload.data?.tag || 'foreground',
          data: payload.data,
        });

        browserNotification.onclick = () => {
          window.focus();
          browserNotification.close();
          if (payload.data?.url) {
            window.location.href = payload.data.url;
          }
        };
      }

      // Short delay to allow backend to finish storing the notification
      setTimeout(() => dispatch(fetchUnreadCount()), UNREAD_COUNT_FETCH_DELAY_MS);
    },
    [dispatch],
  );

  /**
   * Keep Redux permission state in sync with the browser.
   */
  useEffect(() => {
    const permission = fcmService.getPermissionStatus();
    if (permission !== fcmState.permission) {
      dispatch(setFCMPermission(permission));
    }
  }, [dispatch, fcmState.permission]);

  /**
   * If permission was already granted, restore/register the FCM token after login.
   * First-time permission must come from a user action for mobile PWA support.
   */
  useEffect(() => {
    const browserPermission = fcmService.getPermissionStatus();

    if (
      !isAuthenticated ||
      fcmState.token ||
      browserPermission !== 'granted' ||
      setupAttemptedRef.current
    ) {
      return;
    }

    setupAttemptedRef.current = true;

    dispatch(setupPushNotifications()).catch((error) => {
      console.warn('[NotificationProvider] Push notification setup failed:', error);
    });
  }, [isAuthenticated, fcmState.token, dispatch]);

  /**
   * Setup message listener when FCM has a token (meaning it's initialized)
   */
  useEffect(() => {
    if (!fcmState.token || !isAuthenticated) {
      return;
    }

    messageListenerRef.current = fcmService.onMessage(handleForegroundMessage);

    return () => {
      if (messageListenerRef.current) {
        messageListenerRef.current();
        messageListenerRef.current = null;
      }
    };
  }, [fcmState.token, isAuthenticated, handleForegroundMessage]);

  /**
   * Register device token with backend after obtaining FCM token.
   * Does NOT wait for company selection — the register endpoint only needs Bearer auth.
   */
  useEffect(() => {
    if (
      !fcmState.token ||
      !isAuthenticated ||
      deviceRegisteredTokenRef.current === fcmState.token
    ) {
      return;
    }

    if (registrationRetryTimerRef.current) {
      clearTimeout(registrationRetryTimerRef.current);
      registrationRetryTimerRef.current = null;
    }

    deviceRegisteredTokenRef.current = fcmState.token;

    notificationService.registerDevice(fcmState.token).catch((error) => {
      console.warn('[NotificationProvider] Backend device registration failed:', error);
      deviceRegisteredTokenRef.current = null;
      if (registrationRetryTimerRef.current) {
        clearTimeout(registrationRetryTimerRef.current);
      }
      registrationRetryTimerRef.current = setTimeout(() => {
        registrationRetryTimerRef.current = null;
        setRegistrationRetryTick((tick) => tick + 1);
      }, BACKEND_DEVICE_REGISTER_RETRY_MS);
    });
  }, [fcmState.token, isAuthenticated, registrationRetryTick]);

  /**
   * Fetch unread count once company is selected
   */
  useEffect(() => {
    if (!isAuthenticated || !currentCompany) {
      return;
    }

    dispatch(fetchUnreadCount());
  }, [isAuthenticated, currentCompany, dispatch]);

  /**
   * Reset flags on logout
   */
  useEffect(() => {
    if (!isAuthenticated) {
      setupAttemptedRef.current = false;
      deviceRegisteredTokenRef.current = null;
      if (registrationRetryTimerRef.current) {
        clearTimeout(registrationRetryTimerRef.current);
        registrationRetryTimerRef.current = null;
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      if (registrationRetryTimerRef.current) {
        clearTimeout(registrationRetryTimerRef.current);
      }
    };
  }, []);

  return <>{children}</>;
}
