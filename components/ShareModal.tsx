import { useEffect, useState, FormEvent } from 'react';
import { Language, UserProfile, Collaborator } from '../types';
import { X, UserPlus, Mail, Shield, Check, Trash2, Share2, Copy, Globe } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';
import { showSuccess, showError } from '../utils/toast';
import { getShareSettings, inviteCollaborator, removeCollaborator } from '../services/shareService';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  user: UserProfile | null;
  driveFileId: string | null;
  treeId: string | null;
}

export const ShareModal = ({ isOpen, onClose, language, user, driveFileId, treeId }: ShareModalProps) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [isCopied, setIsCopied] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  // Updated Share Link Format: Now includes driveFileId for unique targeting
  // Format: /tree/:ownerUid/:driveFileId
  const shareLink =
    user && (driveFileId || treeId)
      ? `${window.location.origin}/tree/${user.uid}/${driveFileId || treeId}${treeId && !driveFileId ? '?type=db' : ''}`
      : '';

  // Load collaborators from Supabase when modal opens
  useEffect(() => {
    const load = async () => {
      if (!isOpen || !user || (!driveFileId && !treeId)) return;
      try {
        const remote = await getShareSettings({
          driveFileId: driveFileId || undefined,
          treeId: treeId || undefined,
          ownerUid: user.uid,
        }, user.supabaseToken);
        const owner: Collaborator = {
          email: user.email,
          role: 'owner',
          status: 'active',
          avatar: user.photoURL,
        };
        const merged = [
          owner,
          ...remote.filter((c: Collaborator) => c.email.toLowerCase() !== user.email.toLowerCase()),
        ];
        setCollaborators(merged);
      } catch (err: any) {
        console.error('Failed to load share settings', err);
        // Don't show error if it's just 403 (unauthorized) and user is owner - likely just no record yet
        if (err.message !== 'Authentication required') {
          // showError('Failed to load share settings');
        }
      }
    };
    load();
  }, [isOpen, user, driveFileId, treeId]);

  if (!isOpen) return null;

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    if (!user || (!driveFileId && !treeId)) {
      showError('No active tree is selected for sharing.');
      return;
    }

    try {
      // Record in Supabase (Share Record)
      const remote = await inviteCollaborator({
        driveFileId: driveFileId || undefined,
        treeId: treeId || undefined,
        ownerUid: user.uid,
        email,
        role,
      }, user.supabaseToken);

      const owner: Collaborator = {
        email: user.email,
        role: 'owner',
        status: 'active',
        avatar: user.photoURL,
      };

      const merged = [
        owner,
        ...remote.filter((c: Collaborator) => c.email.toLowerCase() !== user.email.toLowerCase()),
      ];

      setCollaborators(merged);
      setEmail('');
      showSuccess(t.inviteSent + ' ' + email);
    } catch (err: any) {
      console.error('Failed to invite collaborator', err);
      showError(err.message || 'Failed to invite collaborator');
    }
  };

  const handleRemove = async (emailToRemove: string) => {
    if (!user || (!driveFileId && !treeId)) return;
    try {
      // Remove from Supabase
      const remote = await removeCollaborator({
        driveFileId: driveFileId || undefined,
        treeId: treeId || undefined,
        ownerUid: user.uid,
        email: emailToRemove,
      }, user.supabaseToken);

      const owner: Collaborator = {
        email: user.email,
        role: 'owner',
        status: 'active',
        avatar: user.photoURL,
      };

      const merged = [
        owner,
        ...remote.filter((c: Collaborator) => c.email.toLowerCase() !== user.email.toLowerCase()),
      ];
      setCollaborators(merged);
      showSuccess('Collaborator removed.');
    } catch (err: any) {
      console.error('Failed to remove collaborator', err);
      showError('Failed to remove collaborator from DB.');
    }
  };

  const copyLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setIsCopied(true);
    showSuccess('Link copied to clipboard!'); // Toast success
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
      <div className='bg-white dark:bg-stone-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-stone-200 dark:border-stone-700'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50'>
          <div className='flex items-center gap-2'>
            <div className='p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400'>
              <Share2 className='w-5 h-5' />
            </div>
            <h3 className='text-lg font-bold text-stone-800 dark:text-white'>{t.shareTree}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label={t.close || 'Close'}
            className='p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-6 space-y-6'>
          {/* Invite Section */}
          <div className='bg-white dark:bg-stone-800 pt-5 p-3 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm space-y-2 relative'>
            <h3 className='absolute top-[-12px] start-3 z-10 bg-white dark:bg-stone-800 px-2 text-[9px] font-bold text-stone-400 uppercase tracking-wider'>
              {t.inviteCollaborator}
            </h3>
            <form onSubmit={handleInvite} className='flex gap-2'>
              <div className='flex-1 relative'>
                <Mail className='absolute start-3 top-2.5 w-4 h-4 text-stone-400' />
                <input
                  type='email'
                  required
                  placeholder={t.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='w-full ps-10 pe-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-stone-900 dark:text-stone-100'
                />
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                aria-label={t.role || 'Role'}
                className='bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm px-3 text-stone-700 dark:text-stone-200 outline-none focus:border-blue-500'
              >
                <option value='editor'>{t.editor}</option>
                <option value='viewer'>{t.viewer}</option>
              </select>
              <button
                type='submit'
                className='bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2'
              >
                {language === 'ar' ? (
                  <UserPlus className='w-4 h-4 scale-x-[-1]' />
                ) : (
                  <UserPlus className='w-4 h-4' />
                )}
                <span className='hidden sm:inline'>{t.sendInvite}</span>
              </button>
            </form>
          </div>

          {/* Link Sharing */}
          <div className='p-3 bg-stone-50 dark:bg-stone-900/50 rounded-lg border border-dashed border-stone-200 dark:border-stone-700 flex items-center justify-between gap-3'>
            <div className='flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400 overflow-hidden'>
              <Globe className='w-4 h-4 shrink-0' />
              <span className='truncate'>{shareLink || 'Loading...'}</span>
            </div>
            <button
              onClick={copyLink}
              disabled={!shareLink}
              className='text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 flex items-center gap-1 disabled:opacity-50'
            >
              {isCopied ? <Check className='w-3 h-3' /> : <Copy className='w-3 h-3' />}
              {isCopied ? 'Copied' : 'Copy Link'}
            </button>
          </div>

          {/* Collaborators List */}
          <div className='bg-white dark:bg-stone-800 pt-5 p-3 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm space-y-2 relative'>
            <h3 className='absolute top-[-12px] start-3 z-10 bg-white dark:bg-stone-800 px-2 text-[9px] font-bold text-stone-400 uppercase tracking-wider'>
              {t.collaborators}
            </h3>
            <div className='border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden'>
              {collaborators.map((c, idx) => (
                <div
                  key={idx}
                  className='flex items-center justify-between p-3 border-b border-stone-50 dark:border-stone-800 last:border-0 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors'
                >
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 rounded-full bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-700 dark:to-stone-800 flex items-center justify-center text-xs font-bold text-stone-600 dark:text-stone-300'>
                      {c.avatar ? (
                        <img
                          src={c.avatar}
                          alt={`${c.email}'s avatar`}
                          className='w-full h-full rounded-full'
                        />
                      ) : (
                        c.email[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className='text-sm font-medium text-stone-800 dark:text-stone-200'>
                        {c.email}{' '}
                        {c.email === user?.email && (
                          <span className='text-stone-400 text-xs'>({t.you})</span>
                        )}
                      </div>
                      <div className='text-[10px] text-stone-500 dark:text-stone-400 flex items-center gap-1'>
                        {c.role === 'owner' ? (
                          <Shield className='w-3 h-3 text-amber-500' />
                        ) : (
                          <div className='w-1.5 h-1.5 rounded-full bg-blue-400'></div>
                        )}
                        {c.role === 'owner' ? t.owner : c.role === 'editor' ? t.editor : t.viewer}
                        {c.status === 'pending' && (
                          <span className='bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 rounded text-[9px]'>
                            {t.pending}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {c.role !== 'owner' && (
                    <button
                      onClick={() => handleRemove(c.email)}
                      className='p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors'
                      title={t.remove}
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
