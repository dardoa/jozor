import { useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { registerSubscription, PushSubscriptionRecordInput } from '../../services/pushSubscriptionService';
import { logError, logInfo } from '../../utils/errorLogger';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

// Helper to convert base64 VAPID to Uint8Array required by push manager
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const useWebPush = () => {
  const user = useAppStore(state => state.user);

  const initializeAndSubscribe = useCallback(
    async (promptUser = false) => {
      if (!user?.uid) return false;

      // Ensure browser support
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        logInfo('WebPush', 'Push API or Service Worker not supported by browser.');
        return false;
      }

      try {
        // 1. Register Service Worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // 2. Check current permission
        let permission = Notification.permission;

        // Only prompt if explicitly asked, to avoid automatic browser penalties
        if (permission === 'default' && promptUser) {
          permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') {
          logInfo('WebPush', `Push notification permission is: ${permission}`);
          return false;
        }

        if (!VAPID_PUBLIC_KEY) {
          logError('WebPush', new Error('Missing VITE_VAPID_PUBLIC_KEY environment variable.'));
          return false;
        }

        // 3. Obtain or create Push Subscription
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        // 4. Extract standard JSONB format mapping expected by backend
        const subJSON = subscription.toJSON();
        if (subJSON.endpoint && subJSON.keys && subJSON.keys.p256dh && subJSON.keys.auth) {
          const input: PushSubscriptionRecordInput = {
            endpoint: subJSON.endpoint,
            keys: {
              p256dh: subJSON.keys.p256dh,
              auth: subJSON.keys.auth,
            },
          };
          
          await registerSubscription(input, user.uid, user.supabaseToken);
          logInfo('WebPush', 'Successfully synced push subscription to Supabase.', { uid: user.uid });
          return true;
        }
        
        return false;
      } catch (error) {
        logError(
          'WebPush',
          error instanceof Error ? error : new Error(String(error)),
          { category: 'SYNC', metadata: { uid: user.uid } }
        );
        return false;
      }
    },
    [user]
  );

  return { registerAndSubscribe: () => initializeAndSubscribe(true) };
};
