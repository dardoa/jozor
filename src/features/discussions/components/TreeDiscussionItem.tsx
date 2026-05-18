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
  const { language } = useTranslation();
  const user = useAppStore(state => state.user);
  const currentTreeId = useAppStore(state => state.currentTreeId);
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
    if (!window.confirm(language === 'ar' ? '?? ??? ????? ?? ??? ??? ????????' : 'Are you sure you want to delete this message?')) return;

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
    <div className={`flex flex-col gap-1 mb-4 group ${isOwn ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-2 px-1">
        {!isOwn && (
          <div className="w-6 h-6 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </div>
        )}
        <span className="text-xs font-bold text-[var(--text-secondary)]">
          {message.userEmail?.split('@')[0] || 'Someone'}
        </span>
        {isOwn && (
          <div className="w-6 h-6 rounded-full bg-[var(--color-primary-subtle)] flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-[var(--color-primary-500)]" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 max-w-[90%] w-full justify-start group">
        {isOwn && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onReply?.(message)}
              className="p-1.5 hover:bg-[var(--surface-subtle)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all active:scale-90"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
            {canDelete && (
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 transition-all active:scale-90"
                title="Delete"
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
                {message.replyToUserName || 'Someone'}
              </div>
              <div className="truncate opacity-90 italic">
                {message.replyToContent}
              </div>
            </div>
          )}
          {message.content}
        </div>

        {!isOwn && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
             <button 
               onClick={() => onReply?.(message)}
               className="p-1.5 hover:bg-[var(--surface-subtle)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all active:scale-90"
               title="Reply"
             >
               <Reply className="w-3.5 h-3.5" />
             </button>
             {canDelete && (
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 transition-all active:scale-90"
                  title="Delete"
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
            <span>Context</span>
          </div>
        )}
      </div>
    </div>
  );
};
