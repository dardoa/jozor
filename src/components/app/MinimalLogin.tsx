import * as React from 'react';
import { Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { AuthProps } from '../../types';
import { useTranslation } from '../../context/TranslationContext';
import { EmailLoginForm } from '../EmailLoginForm';
import { LoginButton } from '../LoginButton';
import { Logo } from '../Logo';

export const MinimalLogin: React.FC<{ auth: AuthProps }> = ({ auth }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showEmailForm, setShowEmailForm] = React.useState(false);

  const handleGoogleLogin = () => {
    const returnTo = sessionStorage.getItem('jozor:return_to') || sessionStorage.getItem('jozor:post-login-redirect') || undefined;
    auth.onLogin(returnTo);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--theme-bg)] text-center p-6 w-full absolute inset-0 z-50">
      <div className="bg-[var(--theme-surface)] border border-[var(--border-main)] rounded-2xl shadow-xl p-8 max-w-md w-full mx-auto flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
        <div className="flex justify-center mb-6 w-full px-2">
          <Logo variant="white" className="h-[160px] md:h-[180px] w-full object-contain" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[var(--text-main)]">{t.sharedLoader.loginRequired}</h2>
          <p className="text-[var(--text-muted)] text-sm leading-relaxed">
            {t.sharedLoader.loginPrompt}
          </p>
        </div>

        {!showEmailForm ? (
          <div className="w-full flex flex-col gap-3">
            <LoginButton
              onLogin={async () => { handleGoogleLogin(); }}
              label={t.loginGoogle}
            />

            <div className="flex items-center gap-4 py-2">
              <div className="h-px flex-1 bg-[var(--border-soft)]"></div>
              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">{t.or}</span>
              <div className="h-px flex-1 bg-[var(--border-soft)]"></div>
            </div>

            <button
              onClick={() => setShowEmailForm(true)}
              className="w-full py-3 px-6 bg-[var(--surface-subtle)] text-[var(--text-main)] font-semibold rounded-xl hover:bg-[var(--border-strong)] transition-all active:scale-95 flex items-center justify-center gap-2 border border-[var(--border-main)]"
            >
              <Mail className="w-5 h-5" />
              {t.loginEmail}
            </button>
          </div>
        ) : (
          <div className="w-full">
            <EmailLoginForm
              onSuccess={() => {
                const returnTo = sessionStorage.getItem('jozor:return_to') || sessionStorage.getItem('jozor:post-login-redirect') || '/';
                navigate(returnTo);
              }}
              onCancel={() => setShowEmailForm(false)}
            />
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          className="text-xs font-medium text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors mt-2"
        >
          {t.sharedLoader.backToHome}
        </button>
      </div>
    </div>
  );
};
