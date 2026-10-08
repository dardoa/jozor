import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import CryptoJS from 'crypto-js';
import { useAppStore } from '../../store/useAppStore';
import { listSubscriptions, registerSubscription, removeSubscription, type PushSubscriptionRecordInput } from '../../services/pushSubscriptionService';
import { logError, logInfo } from '../../utils/errorLogger';
import { authTokenService } from '../../services/authTokenService';
import { webPushMutationCoordinator as coordinator, type PushAttempt, type PushOutcome } from '../../services/webPushMutationCoordinator';

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
  const snapshot = useSyncExternalStore(coordinator.subscribe, coordinator.getSnapshot, coordinator.getSnapshot);
  const [status, setStatus] = useState<PushStatus>('checking');
  const inspectionRef = useRef(0);
  const [inspectionVersion, setInspectionVersion] = useState(0);
  const permissionRef = useRef(typeof Notification === 'undefined' ? 'default' : Notification.permission);
  const revocationRef = useRef(0);
  const inspectedVersionRef = useRef(-1);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const reconcilePermission = useCallback(() => {
    if (!mountedRef.current || typeof Notification === 'undefined'
      || permissionRef.current === Notification.permission) return;
    permissionRef.current = Notification.permission;
    if (Notification.permission !== 'granted') ++revocationRef.current;
    ++inspectionRef.current;
    setInspectionVersion(previous => previous + 1);
  }, []);

  useEffect(() => {
    if (!supportsWebPush()) return;
    let active = true;
    let permissionStatus: PermissionStatus | undefined;
    const whenVisible = () => {
      if (document.visibilityState === 'visible') reconcilePermission();
    };
    window.addEventListener('focus', whenVisible);
    document.addEventListener('visibilitychange', whenVisible);
    try {
      void navigator.permissions?.query({ name: 'notifications' }).then(result => {
        if (!active) return;
        permissionStatus = result;
        result.addEventListener('change', reconcilePermission);
        reconcilePermission();
      }).catch(() => { /* Focus/visibility checks cover unsupported permission queries. */ });
    } catch { /* Some browsers reject permission queries synchronously. */ }
    return () => {
      active = false;
      window.removeEventListener('focus', whenVisible);
      document.removeEventListener('visibilitychange', whenVisible);
      permissionStatus?.removeEventListener('change', reconcilePermission);
    };
  }, [reconcilePermission]);

  const finishMutation = useCallback((attempt: PushAttempt, outcome: PushOutcome | null) => {
    coordinator.settle(attempt, outcome);
    if (!mountedRef.current) return;
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') reconcilePermission();
  }, [reconcilePermission]);

  const resolvePushToken = useCallback(async (attempt: PushAttempt) => {
    if (!coordinator.advance(attempt, 'credentials')) return null;
    const current = useAppStore.getState().user;
    if (current?.uid !== attempt.owner.uid) return null;
    const token = await authTokenService.getPreferredSupabaseToken(current.supabaseToken);
    if (!coordinator.isCurrent(attempt)) return null;
    if (!token) throw new Error('No authenticated push session.');
    return token;
  }, []);

  useEffect(() => {
    let active = true;
    const current = coordinator.getSnapshot();
    const owner = current.owner;
    const revision = current.revision;
    const inspection = ++inspectionRef.current;
    const isCurrentInspection = () => active && inspectionRef.current === inspection
      && coordinator.getSnapshot().owner?.uid === owner?.uid
      && coordinator.getSnapshot().owner?.generation === owner?.generation
      && coordinator.getSnapshot().revision === revision;
    const confirm = (enabled: boolean) => {
      if (!isCurrentInspection()) return;
      if (owner) coordinator.acceptInspection(owner, revision, enabled);
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
    if (current.active) return;
    const shouldInspect = inspectedVersionRef.current !== inspectionVersion;
    inspectedVersionRef.current = inspectionVersion;
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
    if (current.outcome?.disableRetry) return;
    if (current.outcome && !shouldInspect) {
      setStatus(current.outcome.failed ? 'error' : current.outcome.enabled ? 'enabled' : 'idle');
      return;
    }
    setStatus('checking');
    const inspectSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration('/sw.js');
        if (!isCurrentInspection()) return;
        const subscription = await registration?.pushManager.getSubscription();
        if (!isCurrentInspection()) return;
        let saved: Awaited<ReturnType<typeof listSubscriptions>> = [];
        if (subscription) {
          const token = await authTokenService.getPreferredSupabaseToken(useAppStore.getState().user?.supabaseToken);
          if (!isCurrentInspection()) return;
          if (!token) throw new Error('No authenticated push session.');
          saved = await listSubscriptions(user.uid, token);
        }
        confirm(Boolean(subscription && saved.some(row => row.endpoint === subscription.endpoint)));
      } catch {
        if (isCurrentInspection()) setStatus('error');
      }
    };
    void inspectSubscription();
    return () => { active = false; };
  }, [user?.uid, user?.supabaseToken, inspectionVersion, snapshot.owner?.generation, snapshot.active?.id, snapshot.revision]);

  const initializeAndSubscribe = useCallback(
    async (promptUser = false) => {
      if (!user?.uid) return false;
      const revocation = revocationRef.current;

      // Ensure browser support
      if (!supportsWebPush()) {
        setStatus('unsupported');
        return false;
      }

      const attempt = coordinator.claim('enable', user.uid, coordinator.getSnapshot().outcome?.enabled ?? false);
      if (!attempt) return false;
      const isCurrentUser = () => mountedRef.current && coordinator.isCurrent(attempt);
      const canContinue = () => isCurrentUser() && Notification.permission === 'granted'
        && revocationRef.current === revocation;
      let outcome: PushOutcome | null = null;
      ++inspectionRef.current;
      try {
        // Request permission while the click still supplies user activation.
        let permission = Notification.permission;

        // Only prompt if explicitly asked, to avoid automatic browser penalties
        if (permission === 'default' && promptUser) {
          permission = await Notification.requestPermission();
        }

        if (!isCurrentUser()) return false;
        if (permission !== 'granted' || Notification.permission !== 'granted') {
          setStatus(Notification.permission === 'denied' ? 'blocked' : 'idle');
          return false;
        }
        if (!canContinue()) return false;
        // A prompt can grant permission without a supported permission-change event.
        permissionRef.current = Notification.permission;

        const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
        if (!publicKey) {
          setStatus('unconfigured');
          return false;
        }

        const registration = await navigator.serviceWorker.register('/sw.js');
        if (!canContinue()) return false;
        await navigator.serviceWorker.ready;
        if (!canContinue()) return false;

        // A globally unique endpoint cannot be transferred through another owner's RLS.
        let subscription = await registration.pushManager.getSubscription();
        if (!canContinue()) return false;
        let retiredEndpoint: string | undefined;
        if (subscription) {
          const token = await resolvePushToken(attempt);
          if (!token || !canContinue()) return false;
          const saved = await listSubscriptions(user.uid, token);
          if (!canContinue()) return false;
          if (!saved.some(row => row.endpoint === subscription!.endpoint)) {
            retiredEndpoint = subscription.endpoint;
            if (!await subscription.unsubscribe()) throw new Error('Could not rotate this device subscription.');
            if (!canContinue()) return false;
            subscription = null;
          }
        }
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }
        if (!canContinue()) return false;
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
          
          if (!canContinue()) return false;
          const token = await resolvePushToken(attempt);
          if (!token || !canContinue()) return false;
          await registerSubscription(input, user.uid, token);
          if (!canContinue()) return false;
          outcome = { enabled: true, ready: true, disableRetry: false, failed: false };
          setStatus('enabled');
          logInfo('WebPush', 'Successfully synced push subscription to Supabase.');
          return true;
        }
        
        setStatus('error');
        return false;
      } catch (error) {
        if (isCurrentUser()) {
          outcome = { enabled: false, ready: false, disableRetry: false, failed: true };
          setStatus('error');
        }
        logError(
          'WebPush',
          error instanceof Error ? error : new Error(String(error)),
          { category: 'SYNC', metadata: { uid: user.uid } }
        );
        return false;
      } finally {
        finishMutation(attempt, outcome);
      }
    },
    [user, finishMutation, resolvePushToken]
  );

  const unsubscribe = useCallback(async () => {
    if (!user?.uid || !supportsWebPush()) return false;
    const enabled = coordinator.getSnapshot().outcome?.enabled ?? false;
    const attempt = coordinator.claim('disable', user.uid, enabled);
    if (!attempt) return false;
    const isCurrentUser = () => coordinator.isCurrent(attempt);
    let outcome: PushOutcome | null = null;
    ++inspectionRef.current;
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!isCurrentUser()) return false;
      const subscription = await registration?.pushManager.getSubscription();
      if (!isCurrentUser()) return false;
      if (subscription) {
        const hash = CryptoJS.SHA256(subscription.endpoint).toString();
        if (coordinator.getDisableEndpointHash(attempt.owner) !== hash) {
          const token = await resolvePushToken(attempt);
          if (!token || !isCurrentUser()) return false;
          const saved = await listSubscriptions(user.uid, token);
          if (!isCurrentUser()) return false;
          if (!saved.some(row => row.endpoint === subscription.endpoint)) throw new Error('Cannot confirm this device owner.');
          coordinator.rememberDisableEndpoint(attempt, hash);
        }
        const token = await resolvePushToken(attempt);
        if (!token || !coordinator.advance(attempt, 'server')) return false;
        await removeSubscription(subscription.endpoint, user.uid, token);
        if (!isCurrentUser()) return false;
        if (!coordinator.advance(attempt, 'unsubscribe')) return false;
        if (!await subscription.unsubscribe()) throw new Error('Could not unsubscribe this device.');
      }
      if (!isCurrentUser()) return false;
      outcome = { enabled: false, ready: false, disableRetry: false, failed: false };
      if (mountedRef.current) setStatus('idle');
      return true;
    } catch {
      if (isCurrentUser()) {
        outcome = { enabled, ready: false, disableRetry: true, failed: true };
        if (mountedRef.current) setStatus('error');
      }
      return false;
    } finally {
      finishMutation(attempt, outcome);
    }
  }, [user, finishMutation, resolvePushToken]);

  const permissionGranted = supportsWebPush() && Notification.permission === 'granted';
  const device = snapshot.owner?.uid === user?.uid ? snapshot.outcome : null;
  const isWorking = Boolean(snapshot.active);
  const visibleStatus: PushStatus = !supportsWebPush() ? 'unsupported' : !user?.uid ? 'idle'
    : Notification.permission === 'denied' ? 'blocked' : !import.meta.env.VITE_VAPID_PUBLIC_KEY ? 'unconfigured'
      : status === 'checking' && !device?.disableRetry ? 'checking'
        : device?.failed ? 'error' : device ? permissionGranted && device.enabled ? 'enabled' : 'idle' : status;
  return {
    status: visibleStatus,
    isWorking,
    isEnabled: permissionGranted && Boolean(device?.enabled),
    canSendTest: permissionGranted && visibleStatus === 'enabled' && !isWorking && Boolean(device?.ready && !device.disableRetry),
    canActivate: Boolean(user?.uid) && !isWorking && visibleStatus !== 'unsupported' && visibleStatus !== 'blocked'
      && visibleStatus !== 'unconfigured' && visibleStatus !== 'checking',
    registerAndSubscribe: () => coordinator.getSnapshot().outcome?.disableRetry ? unsubscribe() : initializeAndSubscribe(true),
    unsubscribe,
  };
};
