import React from 'react';
import { SmartInput, SmartTextarea } from './SmartInput';

interface FormFieldProps {
  label: string;
  value: string | number;
  onCommit: (value: any) => void;
  disabled?: boolean;
  type?: 'text' | 'email' | 'url' | 'number'; // Added 'number' type
  placeholder?: string;
  isTextArea?: boolean;
  rows?: number;
  className?: string; // Allow overriding or extending default input class
  labelWidthClass?: string; // Allow custom width for label
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
}) => {
  const baseInputClass = "w-full h-7 px-2.5 py-1 border border-stone-300 dark:border-stone-600 rounded-lg text-xs focus:border-teal-500 outline-none transition-colors bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100";
  const baseTextareaClass = "flex-1 px-2.5 py-1 border border-stone-300 dark:border-stone-600 rounded-lg text-xs focus:border-teal-500 outline-none resize-none transition-colors bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100";

  const disabledInputClass = "disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-stone-800 dark:disabled:text-stone-200";
  const disabledTextareaClass = "disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-stone-800 dark:disabled:text-stone-200";

  const inputClasses = `${baseInputClass} ${disabled ? disabledInputClass : ''} ${className}`;
  const textareaClasses = `${baseTextareaClass} ${disabled ? disabledTextareaClass : ''} ${className}`;

  return (
    <div className={`flex items-center gap-3 ${isTextArea ? 'items-start' : ''}`}>
      <label className={`${labelWidthClass} text-xs text-stone-600 dark:text-stone-400 font-medium ${isTextArea ? 'mt-2' : ''}`}>
        {label}
      </label>
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
        />
      )}
    </div>
  );
};