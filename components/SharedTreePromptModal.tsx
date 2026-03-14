import React from 'react';
import { Users, ArrowRight, X } from 'lucide-react';
import { SharedTreeSummary } from '../services/supabaseTreeService';
import { OverlayPrimitive } from '../context/OverlayContext';
import { useTranslation } from '../context/TranslationContext';

interface SharedTreePromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    sharedTrees: SharedTreeSummary[];
    onSelect: (tree: SharedTreeSummary) => void;
}

export const SharedTreePromptModal: React.FC<SharedTreePromptModalProps> = ({
    isOpen,
    onClose,
    sharedTrees,
    onSelect,
}) => {
    const { t } = useTranslation();

    return (
        <OverlayPrimitive
            isOpen={isOpen}
            onClose={onClose}
            id='shared-tree-prompt-modal'
            backdropClassName="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        >
            <div 
                className="w-full max-w-md bg-stone-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                            <Users className="w-6 h-6 text-blue-400" />
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                            aria-label={t.common.close}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">{t.modals.sharedTreePrompt.title}</h3>
                    <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                        {sharedTrees.length > 1
                            ? t.modals.sharedTreePrompt.multiplePrompt
                            : t.modals.sharedTreePrompt.singlePrompt}
                    </p>

                    <div className="space-y-3">
                        {sharedTrees.map((tree) => (
                            <button
                                key={tree.id}
                                onClick={() => onSelect(tree)}
                                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all group"
                            >
                                <div className="text-start">
                                    <div className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                                        {tree.name}
                                    </div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                                        {t.modals.sharedTreePrompt.role}: {tree.role}
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-black/20 border-t border-white/5 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                    >
                        {t.modals.sharedTreePrompt.maybeLater}
                    </button>
                </div>
            </div>
        </OverlayPrimitive>
    );
};
