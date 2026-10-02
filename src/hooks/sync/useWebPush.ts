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
  const [device, setDevice] = useState({ epoch: 0, enabled: false, ready: false, disabling: false });
  const accountRef = useRef({ uid: user?.uid, epoch: 0 });
  if (accountRef.current.uid !== user?.uid) {
    accountRef.current = { uid: user?.uid, epoch: accountRef.current.epoch + 1 };
  }
  const inFlightRef = useRef<{ uid: string; epoch: number } | null>(null);
  const inspectionRef = useRef(0);
  const mountedRef = useRef(false);
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const epoch = accountRef.current.epoch;
    const inspection = ++inspectionRef.current;
    const isCurrentInspection = () => active && accountRef.current.epoch === epoch
      && inspectionRef.current === inspection;
    const confirm = (enabled: boolean) => {
      if (!isCurrentInspection()) return;
      setDevice(previous => previous.epoch === epoch && previous.disabling ? previous
        : { epoch, enabled, ready: enabled, disabling: false });
      setStatus(enabled ? 'enabled' : 'idle');
    };
    if (!supportsWebPush()) {
      confirm(false);
      setStatus('unsupported');
      return;
    }
    if (!user?.uid) {
      confirm(false);
      setStatus('idle');
      return;
    }
    // A token refresh must not race a pending mutation for the same account.
    if (inFlightRef.current?.epoch === epoch) return;
    if (Notification.permission === 'denied') {
      confirm(false);
      setStatus('blocked');
      return;
    }
    if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) {
      confirm(false);
      setStatus('unconfigured');
      return;
    }
    if (Notification.permission !== 'granted') {
      confirm(false);
      setStatus('idle');
      return;
    }
    setStatus('checking');
    const inspectSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration('/sw.js');
        if (!isCurrentInspection()) return;
        const subscription = await registration?.pushManager.getSubscription();
        if (!isCurrentInspection()) return;
        const saved = subscription ? await listSubscriptions(user.uid, user.supabaseToken) : [];
        confirm(Boolean(subscription && saved.some(row => row.endpoint === subscription.endpoint)));
      } catch {
        if (isCurrentInspection()) setStatus('error');
      }
    };
    void inspectSubscription();
    return () => { active = false; };
  }, [user?.uid, user?.supabaseToken]);

  const initializeAndSubscribe = useCallback(
    async (promptUser = false) => {
      if (!user?.uid || inFlightRef.current) return false;
      const epoch = accountRef.current.epoch;
      const isCurrentUser = () => mountedRef.current
        && userRef.current?.uid === user.uid && accountRef.current.epoch === epoch;

      // Ensure browser support
      if (!supportsWebPush()) {
        setStatus('unsupported');
        return false;
      }

      inFlightRef.current = { uid: user.uid, epoch };
      ++inspectionRef.current;
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

        // A globally unique endpoint cannot be transferred through another owner's RLS.
        let subscription = await registration.pushManager.getSubscription();
        if (!isCurrentUser()) return false;
        let retiredEndpoint: string | undefined;
        if (subscription) {
          const saved = await listSubscriptions(user.uid, userRef.current?.supabaseToken);
          if (!isCurrentUser()) return false;
          if (!saved.some(row => row.endpoint === subscription!.endpoint)) {
            retiredEndpoint = subscription.endpoint;
            if (!await subscription.unsubscribe()) throw new Error('Could not rotate this device subscription.');
            if (!isCurrentUser()) return false;
            subscription = null;
          }
        }
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }
        if (!isCurrentUser()) return false;
        if (subscription.endpoint === retiredEndpoint) throw new Error('Subscription rotation did not produce a new endpoint.');

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
          setDevice({ epoch, enabled: true, ready: true, disabling: false });
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
    const epoch = accountRef.current.epoch;
    const isCurrentUser = () => mountedRef.current
      && userRef.current?.uid === user.uid && accountRef.current.epoch === epoch;
    inFlightRef.current = { uid: user.uid, epoch };
    ++inspectionRef.current;
    setDevice(previous => ({ ...previous, epoch, disabling: true }));
    setIsWorking(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!isCurrentUser()) return false;
      const subscription = await registration?.pushManager.getSubscription();
      if (!isCurrentUser()) return false;
      if (subscription) {
        await removeSubscription(subscription.endpoint, user.uid, userRef.current?.supabaseToken);
        if (!isCurrentUser()) return false;
        setDevice(previous => ({ ...previous, ready: false }));
        if (!await subscription.unsubscribe()) throw new Error('Could not unsubscribe this device.');
      }
      if (!isCurrentUser()) return false;
      setDevice({ epoch, enabled: false, ready: false, disabling: false });
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
    isEnabled: device.epoch === accountRef.current.epoch && device.enabled,
    canSendTest: device.epoch === accountRef.current.epoch && device.ready && !device.disabling,
    canActivate: Boolean(user?.uid) && supportsWebPush() && status !== 'blocked'
      && status !== 'unconfigured' && status !== 'checking',
    registerAndSubscribe: () => initializeAndSubscribe(true),
    unsubscribe,
  };
};
