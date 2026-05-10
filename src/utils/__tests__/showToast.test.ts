// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { showToast } from '../showToast';
import { useAppStore } from '../../store/useAppStore';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    promise: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock('../../store/useAppStore', () => ({
  useAppStore: {
    getState: vi.fn(() => ({ language: 'en' })),
  },
}));

describe('showToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore.getState as any).mockReturnValue({ language: 'en' });
  });

  it('calls sonner toast.success with translated text', () => {
    showToast.success('messages.success.load');
    expect(toast.success).toHaveBeenCalledWith('Tree loaded successfully', undefined);
  });

  it('translates text to arabic when language is ar', () => {
    (useAppStore.getState as any).mockReturnValue({ language: 'ar' });
    showToast.success('messages.success.load');
    expect(toast.success).toHaveBeenCalledWith('تم تحميل الشجرة بنجاح', undefined);
  });

  it('interpolates variables in translation strings', () => {
    showToast.success('messages.success.invite', { variables: { email: 'test@example.com' } });
    expect(toast.success).toHaveBeenCalledWith('Invited test@example.com', expect.any(Object));
  });

  it('falls back to string if key is not found', () => {
    showToast.success('Some literal string');
    expect(toast.success).toHaveBeenCalledWith('Some literal string', undefined);
  });

  it('calls sonner toast.promise correctly', () => {
    const p = Promise.resolve();
    showToast.promise(p, {
      loading: 'Loading fallback...',
      success: 'messages.success.load',
      error: 'messages.error.load',
    });
    
    expect(toast.promise).toHaveBeenCalledWith(p, expect.objectContaining({
      loading: 'Loading fallback...',
    }));
  });
});

