import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { TreeDiscussionMessage } from '../../../types/tree';
import { useTranslation } from '../../../context/TranslationContext';
import { User, MessageSquare, Trash2, Loader2, Reply } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { treeDiscussionService } from '../services/treeDiscussionService';

interface TreeDiscussionItemProps {
  message: TreeDiscussionMessage;
  isOwn: boolean;
  onReply?: (message: TreeDiscussionMessage) => void;
}

export const TreeDiscussionItem: React.FC<TreeDiscussionItemProps> = ({ message, isOwn, onReply }) => {
  const { t, language } = useTranslation();
  const discussionText = t.discussionDrawer;
  const user = useAppStore(state => state.user);
  const currentUserRole = useAppStore(state => state.currentUserRole);
  const removeMessage = useAppStore(state => state.removeDiscussionMessage);
  
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  const isOwner = currentUserRole === 'owner';
  const canDelete = isOwn || isOwner;

  const locale = language === 'ar' ? ar : enUS;

  const dateLabel = formatDistanceToNow(new Date(message.createdAt), {
    addSuffix: true,
    locale
  });

  const handleDelete = async () => {
    if (!user || isDeleting) return;
    if (!window.confirm(discussionText.deleteConfirmation)) return;

    setIsDeleting(true);
    try {
      const success = await treeDiscussionService.deleteMessage(
        message.id,
        user.uid,
        user.email,
        user.supabaseToken
      );
      if (success) {
        removeMessage(message.treeId, message.id);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`group/message flex flex-col gap-1 mb-4 ${isOwn ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-2 px-1">
        {!isOwn && (
          <div className="w-6 h-6 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </div>
        )}
        <span className="text-xs font-bold text-[var(--text-secondary)]">
          {message.userEmail?.split('@')[0] || discussionText.someone}
        </span>
        {isOwn && (
          <div className="w-6 h-6 rounded-full bg-[var(--color-primary-subtle)] flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-[var(--color-primary-500)]" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 max-w-[90%] w-full justify-start">
        {isOwn && (
          <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/message:opacity-100 sm:group-focus-within/message:opacity-100">
            <button 
              type="button"
              onClick={() => onReply?.(message)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-all hover:bg-[var(--surface-subtle)] hover:text-[var(--text-main)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]"
              title={discussionText.reply}
              aria-label={discussionText.reply}
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
            {canDelete && (
              <button 
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-all hover:bg-red-500/10 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                title={discussionText.delete}
                aria-label={discussionText.delete}
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        )}
        
        <div className={`
          flex-1 px-4 py-2.5 rounded-2xl text-sm leading-relaxed overflow-hidden
          ${isOwn 
            ? 'bg-[var(--color-primary-500)] text-white rounded-tr-none' 
            : 'bg-[var(--surface-subtle)] text-[var(--text-main)] rounded-tl-none border border-[var(--border-soft)]'}
        `}>
          {message.replyToContent && (
            <div className={`
              mb-2 p-2 rounded-lg text-[10.5px] border-l-[3px] leading-snug
              ${isOwn 
                ? 'bg-black/10 border-white/20 text-white/80' 
                : 'bg-[var(--surface-app)] border-[var(--color-primary-500)]/40 text-[var(--text-muted)]'}
            `}>
              <div className={`font-bold mb-0.5 ${isOwn ? 'text-white/90' : 'text-[var(--color-primary-500)]'}`}>
                {message.replyToUserName || discussionText.someone}
              </div>
              <div className="truncate opacity-90 italic">
                {message.replyToContent}
              </div>
            </div>
          )}
          {message.content}
        </div>

        {!isOwn && (
          <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/message:opacity-100 sm:group-focus-within/message:opacity-100">
             <button 
               type="button"
               onClick={() => onReply?.(message)}
               className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-all hover:bg-[var(--surface-subtle)] hover:text-[var(--text-main)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]"
               title={discussionText.reply}
               aria-label={discussionText.reply}
             >
               <Reply className="w-3.5 h-3.5" />
             </button>
             {canDelete && (
                <button 
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-all hover:bg-red-500/10 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  title={discussionText.delete}
                  aria-label={discussionText.delete}
                >
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
             )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-1 mt-0.5">
        <span className="text-[10px] text-[var(--text-muted)] font-medium">
          {dateLabel}
        </span>
        {message.replyToEventId && (
          <div className="flex items-center gap-1 text-[10px] text-[var(--color-info-500)] font-bold">
            <MessageSquare className="w-3 h-3" />
            <span>{discussionText.context}</span>
          </div>
        )}
      </div>
    </div>
  );
};
