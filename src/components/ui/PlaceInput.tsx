import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2, Globe } from 'lucide-react';
import { usePlaceSuggestions } from '../../features/geography/hooks/usePlaceSuggestions';

interface PlaceInputProps {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  labelWidthClass?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A smart place input field with dual-layer autocomplete.
 * Tier 1: Instant suggestions from Zustand cache.
 * Tier 2: Debounced suggestions from Supabase global cache.
 */
export const PlaceInput: React.FC<PlaceInputProps> = ({
  label,
  value,
  onCommit,
  placeholder,
  labelWidthClass = 'w-24',
  disabled = false,
  className = '',
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync from prop (e.g. when person changes)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const { suggestions, isLoadingRemote } = usePlaceSuggestions(
    isOpen && inputValue.length >= 2 ? inputValue : ''
  );

  const handleSelect = useCallback((displayName: string) => {
    setInputValue(displayName);
    onCommit(displayName);
    setIsOpen(false);
  }, [onCommit]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Only close if focus moved outside the container (not to dropdown)
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsOpen(false);
      if (inputValue !== value) {
        onCommit(inputValue);
      }
    }
  }, [inputValue, value, onCommit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
    if (e.key === 'Enter') {
      setIsOpen(false);
      onCommit(inputValue);
      inputRef.current?.blur();
    }
  }, [inputValue, onCommit]);

  const showDropdown = isOpen && (suggestions.length > 0 || isLoadingRemote);

  return (
    <div className={`flex items-start gap-2 relative ${className}`} ref={containerRef}>
      {label && (
        <label className={`${labelWidthClass} shrink-0 text-xs text-[var(--text-muted)] font-medium pt-2`}>
          {label}
        </label>
      )}
      <div className="flex-1 relative">
        <div className="relative flex items-center">
          <MapPin className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-dim)] pointer-events-none z-10" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full h-8 ps-8 pe-3 text-xs border border-[var(--border-main)] rounded-lg bg-[var(--card-bg)] text-[var(--text-main)] outline-none focus:border-[var(--primary-500)] focus:ring-2 focus:ring-[var(--primary-500)]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            onChange={e => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
          {isLoadingRemote && (
            <Loader2 className="absolute end-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-dim)] animate-spin pointer-events-none" />
          )}
        </div>

        {showDropdown && (
          <div
            className="absolute top-full start-0 end-0 mt-1 bg-[var(--card-bg)] border border-[var(--border-main)] rounded-xl shadow-xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
          >
            {suggestions.length === 0 && isLoadingRemote ? (
              <div className="px-3 py-2.5 text-xs text-[var(--text-dim)] flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Searching...</span>
              </div>
            ) : (
              <ul role="listbox" className="py-1 max-h-48 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <li key={i} role="option">
                    <button
                      type="button"
                      tabIndex={0}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-start hover:bg-[var(--primary-500)]/10 hover:text-[var(--primary-600)] transition-colors"
                      onMouseDown={e => {
                        e.preventDefault(); // Prevent blur before click
                        handleSelect(s.displayName);
                      }}
                    >
                      {s.source === 'global' ? (
                        <Globe className="w-3 h-3 text-indigo-400 shrink-0" />
                      ) : (
                        <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                      )}
                      <span className="truncate">{s.displayName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
