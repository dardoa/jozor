import { useRef, useState } from 'react';
import { ClipboardCheck, Loader2 } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';
import { clearAccountDeletionReceipt, getStoredAccountDeletionReceipt, readAccountDeletionStatus } from '../../services/accountDeletionReceipt';
import { DropdownMenuItem } from '../ui/DropdownMenu';
import { Button } from '../ui/Button';

export function AccountDeletionStatusItem({ variant = 'menu' }: { variant?: 'menu' | 'page' }) {
  const { language } = useTranslation();
  const [receipt] = useState(getStoredAccountDeletionReceipt);
  const [status, setStatus] = useState<'idle' | 'pending' | 'complete' | 'unconfirmed' | 'error'>('idle');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  if (!receipt) return null;
  const ar = language === 'ar';
  const messages = ar ? {
    pending: 'قُبل طلب الحذف، وما زالت إزالة الملفات والحساب جارية.',
    complete: 'اكتمل حذف الحساب وملفاته من الخدمة.',
    unconfirmed: 'لم يتأكد طلب الحذف. لم يبدأ هذا الفحص أي عملية حذف.',
    error: 'تعذّر التحقق الآن. أعد المحاولة عند عودة الاتصال.',
  } : {
    pending: 'Deletion was accepted. Account and file cleanup is still running.',
    complete: 'Account and file deletion from the service is complete.',
    unconfirmed: 'No deletion request was confirmed. This check did not start a deletion.',
    error: 'Status is unavailable. Check again when the connection returns.',
  };
  const check = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await readAccountDeletionStatus(receipt);
      setStatus(result ?? 'unconfirmed');
      if (result === 'complete') clearAccountDeletionReceipt(receipt);
    } catch { setStatus('error'); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const label = ar ? 'حالة طلب حذف الحساب' : 'Account deletion status';
  const icon = busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />;
  const message = status !== 'idle' && <p role="status" className="px-4 py-2 text-xs leading-relaxed text-[var(--text-main)]">{messages[status]}</p>;
  if (variant === 'page') return <section aria-label={label} className="mx-auto w-full max-w-7xl border-b border-[var(--border-soft)] px-6 py-4">
    <Button variant="secondary" disabled={busy} onClick={() => { void check(); }}>{icon}{label}</Button>
    {message}
  </section>;
  return <>
    <DropdownMenuItem
      label={label}
      icon={icon}
      onClick={() => { void check(); }} disabled={busy} closeOnClick={false}
    />
    {message}
  </>;
}
