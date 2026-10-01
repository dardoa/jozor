import { useEffect, useRef, useState } from 'react';
import { Bell, Loader2, Send } from 'lucide-react';
import { useWebPush } from '../../../hooks/sync/useWebPush';
import { useAppStore } from '../../../store/useAppStore';
import { authTokenService } from '../../../services/authTokenService';
import type { TranslationSchema } from '../../../utils/translationLoader';
import { Button } from '../../ui/Button';

export const GlobalSettingsPushPreference = ({ t }: { t: TranslationSchema }) => {
  const { status, isWorking, canActivate, registerAndSubscribe, unsubscribe } = useWebPush();
  const labels = t.globalSettings.preferences.push;
  const enabled = status === 'enabled';
  const user = useAppStore(state => state.user);
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'accepted' | 'failed'>('idle');
  const testRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setTestStatus('idle');
    return () => {
      testRequestRef.current?.abort();
      testRequestRef.current = null;
    };
  }, [user?.uid, user?.supabaseToken]);

  useEffect(() => {
    if (!enabled) setTestStatus('idle');
  }, [enabled]);

  const sendTest = async () => {
    if (!enabled || !user?.uid || isWorking || testRequestRef.current) return;
    const controller = new AbortController();
    testRequestRef.current = controller;
    setTestStatus('sending');
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const token = await authTokenService.getPreferredSupabaseToken(user.supabaseToken);
      if (controller.signal.aborted) return;
      if (!token) throw new Error('No authenticated session.');
      const response = await fetch('/api/push-notifier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: 'Jozor', body: labels.testBody, tag: 'jozor-push-test' }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Test push rejected.');
      const result = await response.json();
      if (testRequestRef.current === controller) {
        setTestStatus(typeof result.sent === 'number' && result.sent > 0 ? 'accepted' : 'failed');
      }
    } catch {
      if (testRequestRef.current === controller) setTestStatus('failed');
    } finally {
      clearTimeout(timer);
      if (testRequestRef.current === controller) testRequestRef.current = null;
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border-soft)] py-5">
      <div className="flex min-w-0 items-center gap-3">
        <Bell className="h-5 w-5 shrink-0 text-[var(--primary-600)]" aria-hidden="true" />
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-[var(--text-main)]">{labels.title}</h4>
          <p className="mt-1 break-words text-xs text-[var(--text-dim)]" role="status">
            {isWorking ? labels.saving : labels[status]}
          </p>
          {testStatus !== 'idle' && (
            <p className="mt-1 break-words text-xs text-[var(--text-dim)]" role="status">
              {labels[testStatus]}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Button
          type="button" variant="secondary" size="icon"
          aria-label={labels.testAction} title={labels.testAction}
          disabled={!enabled || isWorking} isLoading={testStatus === 'sending'}
          onClick={() => { void sendTest(); }}
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
        <button
          type="button" role="switch" aria-label={labels.title}
          aria-checked={enabled} aria-busy={isWorking}
          disabled={!canActivate || isWorking || testStatus === 'sending'}
          onClick={() => { void (enabled ? unsubscribe() : registerAndSubscribe()); }}
          className={`relative h-6 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] disabled:opacity-50 ${enabled ? 'bg-[var(--primary-600)]' : 'bg-[var(--border-strong)]'}`}
        >
          <span className={`absolute top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white transition-all ${enabled ? 'right-1' : 'right-7'}`}>
            {isWorking && <Loader2 className="h-3 w-3 animate-spin text-[var(--primary-600)]" aria-hidden="true" />}
          </span>
        </button>
      </div>
    </div>
  );
};
