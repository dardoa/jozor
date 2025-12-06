import React, { useState, useEffect, useRef } from 'react';
import { Person, Message } from '../types';
import { startAncestorChat } from '../../services/geminiService'; // Corrected import path
import { X, Send, User, Bot, Loader2 } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';

interface AncestorChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  people: Record<string, Person>;
  // language: Language; // Removed unused prop
}

export const AncestorChatModal: React.FC<AncestorChatModalProps> = ({ isOpen, onClose, person, people }) => { // Removed language from destructuring
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
        setMessages([]); // Reset on open
    }
  }, [isOpen, person.id]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
      if (!input.trim() || loading) return;
      
      const userMsg: Message = { role: 'user', text: input };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setLoading(true);

      const responseText = await startAncestorChat(person, people, messages, userMsg.text);
      
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl max-w-lg w-full h-[600px] flex flex-col overflow-hidden border border-stone-200 dark:border-stone-800">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 backdrop-blur">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-purple-200 dark:border-purple-800">
                 {person.photoUrl ? (
                     <img src={person.photoUrl} className="w-full h-full object-cover grayscale" />
                 ) : (
                     <User className="w-full h-full p-2 bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300" />
                 )}
             </div>
             <div>
                 <h3 className="font-bold text-stone-900 dark:text-white">{person.firstName} {person.lastName}</h3>
                 <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">AI Ancestor Persona</span>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50 dark:bg-stone-950/50">
            {messages.length === 0 && (
                <div className="text-center py-10 opacity-50">
                    <Bot className="w-12 h-12 mx-auto mb-3 text-purple-400" />
                    <p className="text-sm text-stone-500">{t.chatPlaceholder}</p>
                </div>
            )}
            
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none shadow-md' 
                        : 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-bl-none shadow-sm border border-stone-100 dark:border-stone-700'
                    }`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            
            {loading && (
                <div className="flex justify-start">
                    <div className="bg-white dark:bg-stone-800 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm border border-stone-100 dark:border-stone-700">
                        <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                    </div>
                </div>
            )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 rounded-full px-4 py-2 focus-within:ring-2 ring-purple-500/20 transition-all">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent border-none outline-none text-sm text-stone-900 dark:text-white placeholder-stone-400"
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="p-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-stone-300 dark:disabled:bg-stone-700 text-white rounded-full transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};