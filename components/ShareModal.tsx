import React, { useState } from 'react';
import { Language, UserProfile } from '../types';
import { getTranslation } from '../utils/translations';
import { X, UserPlus, Mail, Shield, Check, Trash2, Share2, Copy, Globe } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  user: UserProfile | null;
}

interface Collaborator {
    email: string;
    role: 'owner' | 'editor' | 'viewer';
    status: 'active' | 'pending';
    avatar?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, language, user }) => {
  const t = getTranslation(language);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [isCopied, setIsCopied] = useState(false);
  
  // Mock initial state
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
      { email: user?.email || 'owner@example.com', role: 'owner', status: 'active', avatar: user?.photoURL }
  ]);

  if (!isOpen) return null;

  const handleInvite = (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) return;

      const newCollab: Collaborator = {
          email: email,
          role: role,
          status: 'pending'
      };

      setCollaborators([...collaborators, newCollab]);
      setEmail('');
      // In a real app, this would trigger an API call
      alert(t.inviteSent + " " + email);
  };

  const handleRemove = (emailToRemove: string) => {
      setCollaborators(collaborators.filter(c => c.email !== emailToRemove));
  };

  const copyLink = () => {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-gray-100 dark:border-gray-700">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
             <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                 <Share2 className="w-5 h-5" />
             </div>
             <h3 className="text-lg font-bold text-gray-800 dark:text-white">{t.shareTree}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
            
            {/* Invite Section */}
            <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">{t.inviteCollaborator}</label>
                <form onSubmit={handleInvite} className="flex gap-2">
                    <div className="flex-1 relative">
                        <Mail className="absolute start-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input 
                            type="email" 
                            required
                            placeholder={t.emailPlaceholder}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full ps-10 pe-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                        />
                    </div>
                    <select 
                        value={role}
                        onChange={(e) => setRole(e.target.value as any)}
                        className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm px-3 text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500"
                    >
                        <option value="editor">{t.editor}</option>
                        <option value="viewer">{t.viewer}</option>
                    </select>
                    <button 
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                    >
                        {language === 'ar' ? <UserPlus className="w-4 h-4 scale-x-[-1]" /> : <UserPlus className="w-4 h-4" />}
                        <span className="hidden sm:inline">{t.sendInvite}</span>
                    </button>
                </form>
            </div>

            {/* Link Sharing */}
            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 overflow-hidden">
                    <Globe className="w-4 h-4 shrink-0" />
                    <span className="truncate">https://jozor.app/tree/{user?.uid?.substring(0,8) || 'demo'}</span>
                </div>
                <button onClick={copyLink} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 flex items-center gap-1">
                    {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {isCopied ? "Copied" : "Copy Link"}
                </button>
            </div>

            {/* Collaborators List */}
            <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">{t.collaborators}</label>
                <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                    {collaborators.map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                    {c.avatar ? <img src={c.avatar} className="w-full h-full rounded-full" /> : c.email[0].toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.email} {c.email === user?.email && <span className="text-gray-400 text-xs">({t.you})</span>}</div>
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        {c.role === 'owner' ? <Shield className="w-3 h-3 text-amber-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>}
                                        {c.role === 'owner' ? t.owner : c.role === 'editor' ? t.editor : t.viewer}
                                        {c.status === 'pending' && <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 rounded text-[9px]">{t.pending}</span>}
                                    </div>
                                </div>
                            </div>
                            
                            {c.role !== 'owner' && (
                                <button onClick={() => handleRemove(c.email)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title={t.remove}>
                                    <Trash2 className="w-4 h-4" />
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