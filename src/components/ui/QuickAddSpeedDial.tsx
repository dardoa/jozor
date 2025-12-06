import React, { useState, memo, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { QuickAddAction } from '../../types'; // Import QuickAddAction type
import { useTranslation } from '../../context/TranslationContext';

interface QuickAddSpeedDialProps {
  actions: QuickAddAction[];
  buttonClassName?: string;
}

export const QuickAddSpeedDial: React.FC<QuickAddSpeedDialProps> = memo(({ actions, buttonClassName }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleOpen = () => setIsOpen(!isOpen);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        className={`${buttonClassName} relative z-20`}
        title={t.quickAdd}
      >
        <Plus className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-45' : ''}`} />
        <span>{t.quickAdd}</span>
      </button>

      {isOpen && (
        <div 
          ref={menuRef}
          className="absolute bottom-full mb-2 start-1/2 -translate-x-1/2 z-10 flex flex-col-reverse items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-md transition-all active:scale-95 ${action.colorClasses}`}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});