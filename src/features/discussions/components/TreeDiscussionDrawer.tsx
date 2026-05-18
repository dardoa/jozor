import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    X,
    Send,
    MessageCircle,
    Loader2,
    Reply as ReplyIcon,
    Search
} from 'lucide-react';
import { useTranslation } from '../../../context/TranslationContext';
import { OverlayPrimitive } from '../../../context/OverlayContext';
import { useTreeDiscussion } from '../hooks/useTreeDiscussion';
import { TreeDiscussionItem } from './TreeDiscussionItem';
import { useAppStore } from '../../../store/useAppStore';
import { TreeDiscussionMessage } from '../../../types/tree';
import { DISCUSSION_MESSAGE_MAX_LENGTH } from '../services/treeDiscussionService';

interface TreeDiscussionDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    treeId: string;
}

const EMPTY_ARRAY: any[] = [];

const TreeDiscussionDrawer: React.FC<TreeDiscussionDrawerProps> = ({ isOpen, onClose, treeId }) => {
    const { t, language } = useTranslation();
    const user = useAppStore(state => state.user);
    const markAsRead = useAppStore(state => state.markAsRead);
    const onlineUsers = useAppStore(state => state.onlineUsers[treeId] || EMPTY_ARRAY);
    const collaborators = useAppStore(state => state.collaborators[treeId] || EMPTY_ARRAY);
    const { messages, loading, loadingMore, hasMore, sendMessage, loadMore } = useTreeDiscussion(treeId);
    const [content, setContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sendError, setSendError] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [replyingTo, setReplyingTo] = useState<TreeDiscussionMessage | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Memoize the combined members list to avoid unnecessary re-renders and infinite loops
    const allMembers = useMemo(() => {
        // Get unique online users emails
        const onlineEmails = new Set(
            onlineUsers
                .map((u: any) => typeof u.email === 'string' ? u.email.toLowerCase() : '')
                .filter(Boolean)
        );
        
        const allMemberEmails = new Set<string>();
        
        // 1. Add current user
        if (user?.email) allMemberEmails.add(user.email.toLowerCase());

        // 2. Add collaborators from the tree
        collaborators.forEach((c: any) => {
            if (c.email) allMemberEmails.add(c.email.toLowerCase());
        });
        
        // 3. Add everyone who has ever sent a message in this discussion
        messages.forEach((m: any) => {
            if (m.userEmail) allMemberEmails.add(m.userEmail.toLowerCase());
        });

        // 4. Add anyone currently online
        onlineUsers.forEach((u: any) => {
            if (u.email) allMemberEmails.add(u.email.toLowerCase());
        });

        // Create a combined list of members with online status
        return Array.from(allMemberEmails).map(email => ({
            email,
            name: email.split('@')[0],
            isOnline: onlineEmails.has(email)
        })).sort((a, b) => {
            // Online first, then alphabetical
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [onlineUsers, collaborators, messages, user?.email]);

    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    const visibleMessages = useMemo(() => {
        if (!normalizedSearchQuery) return messages;
        return messages.filter((message) => {
            const haystack = [
                message.content,
                message.userEmail,
                message.replyToContent,
                message.replyToUserName,
            ].filter(Boolean).join(' ').toLowerCase();
            return haystack.includes(normalizedSearchQuery);
        });
    }, [messages, normalizedSearchQuery]);

    // Mark as read when opened
    useEffect(() => {
        if (isOpen && treeId) {
            markAsRead(treeId);
        }
    }, [isOpen, treeId, markAsRead]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!content.trim() || isSending) return;

        setIsSending(true);
        setSendError('');
        try {
            const sent = await sendMessage(
                content, 
                undefined, // replyToEventId
                replyingTo?.id,
                replyToUserName(replyingTo),
                replyingTo?.content
            );
            if (sent) {
                setContent('');
                setReplyingTo(null);
            } else {
                setSendError(language === 'ar' ? 'تعذر إرسال الرسالة. لم يتم حذف النص، حاول مرة أخرى.' : 'Message could not be sent. Your draft was kept; please try again.');
            }
        } finally {
            setIsSending(false);
        }
    };

    const replyToUserName = (msg: TreeDiscussionMessage | null) => {
        if (!msg) return '';
        return msg.userEmail?.split('@')[0] || 'Someone';
    };

    // Auto scroll to bottom
    useEffect(() => {
        if (scrollRef.current && !normalizedSearchQuery) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, normalizedSearchQuery]);

    return (
        <OverlayPrimitive
            isOpen={isOpen}
            onClose={onClose}
            id='tree-discussion-drawer'
            withBackdrop={false}
        >
            <div
                className="ds-overlay-backdrop fixed inset-0 z-[var(--z-index-drawer)] transition-opacity"
                onClick={onClose}
            />

            <div className={`
                ds-drawer-shell fixed top-14 md:top-16 end-0 h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] w-[400px] z-[calc(var(--z-index-drawer)+1)]
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'}
                flex flex-col bg-[var(--surface-app)] border-l border-[var(--border-soft)] shadow-2xl
            `}>
                {/* Header */}
                <div className="ds-drawer-header p-6 flex flex-col gap-4 sticky top-0 shadow-[var(--shadow-sm)] bg-[var(--surface-app)]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[var(--surface-subtle)] rounded-lg text-[var(--color-primary-500)]">
                                <MessageCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-[var(--text-main)] leading-tight">
                                    {(t as any).discussionDrawer?.title || 'Tree Discussion'}
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">
                                        {(t as any).discussionDrawer?.subtitle || 'Coordinate with collaborators'}
                                    </p>
                                    {onlineUsers.length > 0 && (
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-[10px] text-green-600 font-bold">
                                                {onlineUsers.length} {(t as any).discussionDrawer?.online || 'Online'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-[var(--surface-subtle)] rounded-full transition-colors group"
                        >
                            <X className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />
                        </button>
                    </div>

                    {/* All Members List with Status */}
                    {allMembers.length > 0 && (
                        <div className="flex flex-wrap gap-2 px-1">
                            {allMembers.map((m) => (
                                <div 
                                    key={m.email} 
                                    className={`
                                        flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all
                                        ${m.isOnline 
                                            ? 'bg-green-500/5 border-green-500/20 ring-1 ring-green-500/10' 
                                            : 'bg-[var(--surface-subtle)] border-[var(--border-soft)] opacity-60'}
                                    `}
                                    title={m.isOnline ? 'Online' : 'Offline'}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full ${m.isOnline ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]' : 'bg-gray-400'}`} />
                                    <span className={`text-[10px] font-medium ${m.isOnline ? 'text-green-700' : 'text-[var(--text-muted)]'}`}>
                                        {m.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="relative">
                        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder={(t as any).discussionDrawer?.searchPlaceholder || (language === 'ar' ? 'ابحث في الرسائل...' : 'Search messages...')}
                            className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] py-2 ps-9 pe-3 text-sm text-[var(--text-main)] outline-none transition focus:ring-2 focus:ring-[var(--color-primary-500)]/20"
                        />
                        {normalizedSearchQuery && (
                            <div className="mt-1 text-[10px] font-medium text-[var(--text-muted)]">
                                {language === 'ar'
                                    ? `${visibleMessages.length} نتيجة من ${messages.length} رسالة محملة`
                                    : `${visibleMessages.length} of ${messages.length} loaded messages`}
                            </div>
                        )}
                    </div>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scroll-smooth" ref={scrollRef}>
                    {loading && messages.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary-500)]" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="ds-empty-state flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                            <div className="p-4 bg-[var(--surface-subtle)] rounded-full mb-4">
                                <MessageCircle className="w-8 h-8 text-[var(--text-muted)]" />
                            </div>
                            <p className="text-[var(--text-secondary)] font-bold">
                                {(t as any).discussionDrawer?.emptyState || 'No messages yet'}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                {(t as any).discussionDrawer?.emptyStateDesc || 'Start a discussion to coordinate with other collaborators'}
                            </p>
                        </div>
                    ) : normalizedSearchQuery && visibleMessages.length === 0 ? (
                        <div className="ds-empty-state flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                            <div className="p-4 bg-[var(--surface-subtle)] rounded-full mb-4">
                                <Search className="w-8 h-8 text-[var(--text-muted)]" />
                            </div>
                            <p className="text-[var(--text-secondary)] font-bold">
                                {language === 'ar' ? 'لا توجد رسائل مطابقة' : 'No matching messages'}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                {language === 'ar' ? 'جرّب كلمة أخرى أو حمّل رسائل أقدم.' : 'Try another keyword or load older messages.'}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {hasMore && (
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    type="button"
                                    className="self-center px-4 py-2 text-xs font-bold text-[var(--color-primary-500)] hover:bg-[var(--color-primary-500)]/10 rounded-full transition-colors flex items-center gap-2 mb-2 disabled:opacity-50"
                                >
                                    {loadingMore ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <MessageCircle className="w-3 h-3" />
                                    )}
                                    <span>{(t as any).discussionDrawer?.loadMore || 'Load older messages'}</span>
                                </button>
                            )}

                            {visibleMessages.map((msg) => (
                                <TreeDiscussionItem 
                                    key={msg.id || msg.createdAt} 
                                    message={msg} 
                                    isOwn={msg.userId === user?.uid}
                                    onReply={setReplyingTo}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-[var(--surface-app)] border-t border-[var(--border-soft)]">
                    {replyingTo && (
                        <div className="mb-3 p-3 bg-[var(--surface-subtle)] border-l-[3px] border-[var(--color-primary-500)]/50 rounded-lg flex items-start justify-between animate-in slide-in-from-bottom-2 duration-200">
                            <div className="overflow-hidden">
                                <div className="flex items-center gap-1.5 text-[var(--color-primary-500)] font-bold text-[11px] mb-0.5">
                                    <ReplyIcon className="w-3 h-3" />
                                    <span>{replyToUserName(replyingTo)}</span>
                                </div>
                                <p className="text-[11px] text-[var(--text-muted)] truncate italic">
                                    {replyingTo.content}
                                </p>
                            </div>
                            <button 
                                onClick={() => setReplyingTo(null)}
                                className="p-1 hover:bg-[var(--surface-app)] rounded-full text-[var(--text-muted)] hover:text-red-500 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                    
                    <form onSubmit={handleSend} className="relative flex items-end gap-2">
                        <div className="flex-1 min-h-[44px] relative">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder={(t as any).discussionDrawer?.placeholder || 'Type a message...'}
                                maxLength={DISCUSSION_MESSAGE_MAX_LENGTH}
                                className="w-full bg-[var(--surface-subtle)] border border-[var(--border-soft)] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/20 transition-all resize-none custom-scrollbar max-h-32"
                                rows={1}
                                style={{ height: 'auto' }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!content.trim() || isSending}
                            className={`
                                p-3 rounded-2xl transition-all
                                ${content.trim() && !isSending 
                                    ? 'bg-[var(--color-primary-500)] text-white shadow-lg shadow-[var(--color-primary-500)]/20 scale-100 active:scale-95' 
                                    : 'bg-[var(--surface-subtle)] text-[var(--text-muted)] scale-95 opacity-50'}
                            `}
                        >
                            {isSending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
                            )}
                        </button>
                    </form>
                    {content.length > DISCUSSION_MESSAGE_MAX_LENGTH * 0.85 && (
                        <p className="mt-2 text-[10px] font-medium text-[var(--text-muted)]">
                            {content.length}/{DISCUSSION_MESSAGE_MAX_LENGTH}
                        </p>
                    )}
                    {sendError && (
                        <p className="mt-2 text-xs font-medium text-red-500">
                            {sendError}
                        </p>
                    )}
                </div>
            </div>
        </OverlayPrimitive>
    );
};

export default TreeDiscussionDrawer;
