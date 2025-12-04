import React, { useState, useRef, useEffect } from 'react';
import { Plus, UserPlus } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

interface QuickAddAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  colorClasses: string; // Tailwind classes for background/text color
}

interface QuickAddSpeedDialProps {
  actions: QuickAddAction[];
}

export const QuickAddSpeedDial: React.FC<QuickAddSpeedDialProps> = ({ actions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref]);

  return (
    <div className="relative flex justify-center" ref={ref}>
      {!isOpen ? (
        // Main Trigger Button (when closed)
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-7 h-7 rounded-full flex items-center justify-center bg-blue-600 text-white shadow-sm hover:shadow-md active:scale-95 transition-all"
          title={t.quickAdd || 'Quick Add'}
        >
          <UserPlus className="w-3 h-3" />
        </button>
      ) : (
        // Action Buttons (when open)
        <div className="flex gap-2 animate-in fade-in zoom-in-90 duration-200">
          {actions.map((action, index) => (
            <button
              key={index}
              type="button"
              onClick={(e) => { e.stopPropagation(); action.onClick(); setIsOpen(false); }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm border border-transparent hover:shadow-md active:scale-95 ${action.colorClasses}`}
              title={action.label}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};