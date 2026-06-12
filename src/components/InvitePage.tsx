import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { acceptTreeInvitation } from '../features/sharing';
import { showToast } from '../utils/showToast';

type InvitationResult = Awaited<ReturnType<typeof acceptTreeInvitation>>;
const invitationCache = new Map<string, Promise<InvitationResult>>();

const getInvitationPromise = (token: string, uid: string, email: string, supabaseToken?: string) => {
    const key = `${token}:${uid}`;
    if (!invitationCache.has(key)) {
        const promise = acceptTreeInvitation(token, uid, email, supabaseToken);
        invitationCache.set(key, promise);

        const cleanup = () => {
            if (invitationCache.get(key) === promise) {
                invitationCache.delete(key);
            }
        };
        void promise.then(cleanup, cleanup);
    }
    return invitationCache.get(key)!;
};

interface AuthenticatedInviteAcceptorProps {
    token: string;
    currentUser: NonNullable<ReturnType<typeof useAppStore.getState>['user']>;
    navigate: ReturnType<typeof useNavigate>;
}

const AuthenticatedInviteAcceptor: React.FC<AuthenticatedInviteAcceptorProps> = ({
    token,
    currentUser,
    navigate,
}) => {
    const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        let isMounted = true;
        let timeoutId: NodeJS.Timeout | null = null;

        const handleAccept = async () => {
            try {
                const result = await getInvitationPromise(
                    token,
                    currentUser.uid,
                    currentUser.email || '',
                    currentUser.supabaseToken
                );
                
                if (!isMounted) return;

                setStatus('success');
                showToast.success('تمت إضافتك إلى الشجرة بنجاح!');
                
                timeoutId = setTimeout(() => {
                    if (isMounted) {
                        navigate(`/tree/${result.treeId}`);
                    }
                }, 2000);
            } catch (error: unknown) {
                if (!isMounted) return;
                console.error('Accept Invitation Error:', error);
                setStatus('error');
                setErrorMessage(error instanceof Error ? error.message : 'تعذر معالجة الدعوة. قد تكون منتهية الصلاحية أو غير صالحة لحسابك.');
            }
        };

        void handleAccept();

        return () => {
            isMounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [token, currentUser, navigate]);

    return (
        <>
            {status === 'loading' && (
                <div className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-12 h-12 text-[var(--primary-500)] animate-spin" />
                    <h2 className="text-xl font-bold text-[var(--text-main)]">جاري معالجة الدعوة...</h2>
                    <p className="text-[var(--text-muted)] text-sm">يرجى الانتظار قليلاً.</p>
                </div>
            )}

            {status === 'error' && (
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                        <ShieldAlert className="w-10 h-10" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-main)]">فشل قبول الدعوة</h2>
                    <p className="text-red-500 text-sm font-medium">{errorMessage}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="mt-6 px-6 py-2 bg-[var(--surface-subtle)] hover:bg-[var(--border-strong)] text-[var(--text-main)] rounded-lg font-medium transition-colors w-full"
                    >
                        العودة للرئيسية
                    </button>
                </div>
            )}

            {status === 'success' && (
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="p-4 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
                        <ShieldCheck className="w-10 h-10" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-main)]">تم بنجاح!</h2>
                    <p className="text-[var(--text-muted)] text-sm">
                        تمت إضافتك كمتعاون في الشجرة بنجاح. سيتم توجيهك الآن...
                    </p>
                    <Loader2 className="w-6 h-6 text-[var(--primary-500)] animate-spin mx-auto mt-4" />
                </div>
            )}
        </>
    );
};

export const InvitePage: React.FC = () => {
    const { token, shareToken } = useParams<{ token?: string; shareToken?: string }>();
    const navigate = useNavigate();
    const currentUser = useAppStore(state => state.user);
    const resolvedToken = shareToken || token;

    return (
        <div className="min-h-screen bg-[var(--theme-bg)] flex items-center justify-center p-4" dir="rtl">
            <div className="max-w-md w-full bg-[var(--theme-surface)] border border-[var(--border-main)] rounded-2xl shadow-xl overflow-hidden p-8 text-center">
                
                {!resolvedToken && (
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                            <ShieldAlert className="w-10 h-10" />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--text-main)]">فشل قبول الدعوة</h2>
                        <p className="text-red-500 text-sm font-medium">رابط الدعوة غير صالح.</p>
                        <button
                            onClick={() => navigate('/')}
                            className="mt-6 px-6 py-2 bg-[var(--surface-subtle)] hover:bg-[var(--border-strong)] text-[var(--text-main)] rounded-lg font-medium transition-colors w-full"
                        >
                            العودة للرئيسية
                        </button>
                    </div>
                )}

                {resolvedToken && !currentUser && (
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="p-4 bg-[var(--surface-subtle)] rounded-full text-[var(--primary-600)]">
                            <ShieldAlert className="w-10 h-10" />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--text-main)]">تسجيل الدخول مطلوب</h2>
                        <p className="text-[var(--text-muted)] text-sm">
                            لقبول هذه الدعوة، يجب عليك تسجيل الدخول أولاً بحسابك الخاص المرتبط بالبريد الإلكتروني المدعو.
                        </p>
                        <button 
                            onClick={() => navigate('/login')}
                            className="mt-6 px-6 py-2.5 bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white rounded-lg font-medium transition-colors w-full"
                        >
                            الذهاب لتسجيل الدخول
                        </button>
                    </div>
                )}

                {resolvedToken && currentUser && (
                    <AuthenticatedInviteAcceptor
                        key={`${resolvedToken}:${currentUser.uid}`}
                        token={resolvedToken}
                        currentUser={currentUser}
                        navigate={navigate}
                    />
                )}

            </div>
        </div>
    );
};
