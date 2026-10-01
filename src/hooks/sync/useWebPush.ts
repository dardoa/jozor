import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { listSubscriptions, registerSubscription, removeSubscription, type PushSubscriptionRecordInput } from '../../services/pushSubscriptionService';
import { logError, logInfo } from '../../utils/errorLogger';

type PushStatus = 'idle' | 'checking' | 'enabled' | 'blocked' | 'unsupported' | 'unconfigured' | 'error';

const supportsWebPush = () => typeof window !== 'undefined'
  && typeof Notification !== 'undefined'
  && typeof PushManager !== 'undefined'
  && 'serviceWorker' in navigator;

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
  const [status, setStatus] = useState<PushStatus>('checking');
  const [isWorking, setIsWorking] = useState(false);
  const inFlightRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!supportsWebPush()) {
      setStatus('unsupported');
      return;
    }
    if (!user?.uid) {
      setStatus('idle');
      return;
    }
    // A token refresh must not race a pending mutation for the same account.
    if (inFlightRef.current === user.uid) return;
    if (Notification.permission === 'denied') {
      setStatus('blocked');
      return;
    }
    if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) {
      setStatus('unconfigured');
      return;
    }
    if (Notification.permission !== 'granted') {
      setStatus('idle');
      return;
    }
    setStatus('checking');
    const inspectSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration('/sw.js');
        const subscription = await registration?.pushManager.getSubscription();
        const saved = subscription ? await listSubscriptions(user.uid, user.supabaseToken) : [];
        if (active) {
          setStatus(subscription && saved.some(row => row.endpoint === subscription.endpoint) ? 'enabled' : 'idle');
        }
      } catch {
        if (active) setStatus('error');
      }
    };
    void inspectSubscription();
    return () => { active = false; };
  }, [user?.uid, user?.supabaseToken]);

  const initializeAndSubscribe = useCallback(
    async (promptUser = false) => {
      if (!user?.uid || inFlightRef.current) return false;
      const isCurrentUser = () => mountedRef.current
        && userRef.current?.uid === user.uid;

      // Ensure browser support
      if (!supportsWebPush()) {
        setStatus('unsupported');
        return false;
      }

      inFlightRef.current = user.uid;
      setIsWorking(true);
      try {
        // Request permission while the click still supplies user activation.
        let permission = Notification.permission;

        // Only prompt if explicitly asked, to avoid automatic browser penalties
        if (permission === 'default' && promptUser) {
          permission = await Notification.requestPermission();
        }

        if (!isCurrentUser()) return false;
        if (permission !== 'granted') {
          setStatus(permission === 'denied' ? 'blocked' : 'idle');
          return false;
        }

        const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
        if (!publicKey) {
          setStatus('unconfigured');
          return false;
        }

        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        if (!isCurrentUser()) return false;

        // Obtain or reuse this device's subscription.
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
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
          
          if (!isCurrentUser()) return false;
          await registerSubscription(input, user.uid, userRef.current?.supabaseToken);
          if (!isCurrentUser()) return false;
          setStatus('enabled');
          logInfo('WebPush', 'Successfully synced push subscription to Supabase.');
          return true;
        }
        
        setStatus('error');
        return false;
      } catch (error) {
        if (isCurrentUser()) setStatus('error');
        logError(
          'WebPush',
          error instanceof Error ? error : new Error(String(error)),
          { category: 'SYNC', metadata: { uid: user.uid } }
        );
        return false;
      } finally {
        inFlightRef.current = null;
        if (mountedRef.current) setIsWorking(false);
      }
    },
    [user]
  );

  const unsubscribe = useCallback(async () => {
    if (!user?.uid || inFlightRef.current || !supportsWebPush()) return false;
    const isCurrentUser = () => mountedRef.current
      && userRef.current?.uid === user.uid;
    inFlightRef.current = user.uid;
    setIsWorking(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      const subscription = await registration?.pushManager.getSubscription();
      if (!isCurrentUser()) return false;
      if (subscription) {
        await removeSubscription(subscription.endpoint, user.uid, userRef.current?.supabaseToken);
        if (!isCurrentUser()) return false;
        if (!await subscription.unsubscribe()) throw new Error('Could not unsubscribe this device.');
      }
      if (!isCurrentUser()) return false;
      setStatus('idle');
      return true;
    } catch {
      if (isCurrentUser()) setStatus('error');
      return false;
    } finally {
      inFlightRef.current = null;
      if (mountedRef.current) setIsWorking(false);
    }
  }, [user]);

  return {
    status,
    isWorking,
    canActivate: Boolean(user?.uid) && supportsWebPush() && status !== 'blocked'
      && status !== 'unconfigured' && status !== 'checking',
    registerAndSubscribe: () => initializeAndSubscribe(true),
    unsubscribe,
  };
};
