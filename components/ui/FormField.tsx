import React from 'react';
import { SmartInput, SmartTextarea } from './SmartInput';

interface FormFieldProps {
  label: string;
  value: string | number;
  onCommit: (value: any) => void;
  disabled?: boolean;
  type?: 'text' | 'email' | 'url' | 'number';
  placeholder?: string;
  isTextArea?: boolean;
  rows?: number;
  className?: string; // Allow overriding or extending default input class
  labelWidthClass?: string; // Allow custom width for label
  min?: number;
  max?: number;
  step?: number;
  helperText?: string;
  icon?: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onCommit,
  disabled = false,
  type = 'text',
  placeholder,
  isTextArea = false,
  rows = 2,
  className = '',
  labelWidthClass = 'w-24',
  min,
  max,
  step,
  helperText,
  icon,
}) => {
  const baseInputClass =
    'w-full h-7 px-2.5 py-1 border border-stone-300 dark:border-stone-600 rounded-lg text-xs focus:border-teal-500 outline-none transition-colors bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100';
  const baseTextareaClass =
    'flex-1 px-2.5 py-1 border border-stone-300 dark:border-stone-600 rounded-lg text-xs focus:border-teal-500 outline-none resize-none transition-colors bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100';

  const disabledInputClass =
    'disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-stone-800 dark:disabled:text-stone-200';
  const disabledTextareaClass =
    'disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-stone-800 dark:disabled:text-stone-200';

  const inputClasses = `${baseInputClass} ${disabled ? disabledInputClass : ''} ${className}`;
  const textareaClasses = `${baseTextareaClass} ${disabled ? disabledTextareaClass : ''} ${className}`;

  return (
    <div className='bg-stone-50/50 dark:bg-stone-900/30 p-2 rounded-lg border border-transparent hover:border-stone-200 dark:hover:border-stone-800 transition-colors'>
      <div className={`flex items-center gap-3 ${isTextArea ? 'items-start' : ''}`}>
        <label
          className={`${labelWidthClass} text-xs text-stone-600 dark:text-stone-400 font-medium ${isTextArea ? 'mt-2' : ''} flex items-center gap-1.5`}
        >
          {icon && <span className="text-stone-400 dark:text-stone-500">{icon}</span>}
          {label}
        </label>
        <div className="flex-1">
          {isTextArea ? (
            <SmartTextarea
              disabled={disabled}
              rows={rows}
              value={value as string}
              onCommit={onCommit}
              className={textareaClasses}
              placeholder={placeholder}
            />
          ) : (
            <SmartInput
              disabled={disabled}
              type={type}
              value={value}
              onCommit={onCommit}
              className={inputClasses}
              placeholder={placeholder}
              min={min}
              max={max}
              step={step}
            />
          )}
        </div>
      </div>
      {helperText && (
        <div className="mt-1 ml-[calc(var(--label-width,6rem)+0.75rem)] text-[10px] text-stone-400 dark:text-stone-500">
          {helperText}
        </div>
      )}
    </div>
  );
};
