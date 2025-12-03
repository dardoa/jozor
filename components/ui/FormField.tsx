import React from 'react';
import { SmartInput, SmartTextarea } from './SmartInput';

interface FormFieldProps {
  label: string;
  value: string | number;
  onCommit: (value: any) => void;
  disabled?: boolean;
  type?: 'text' | 'email' | 'url';
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
  rows = 3,
  className = '',
  labelWidthClass = 'w-20', // Default to w-20 for better alignment in grids
}) => {
  const baseInputClass = "w-full h-8 px-3 py-1.5 border border-stone-300 dark:border-stone-600 rounded-lg text-sm focus:border-teal-500 outline-none transition-colors bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-stone-800 dark:disabled:text-stone-200";
  const baseTextareaClass = "flex-1 px-3 py-1.5 border border-stone-300 dark:border-stone-600 rounded-lg text-sm focus:border-teal-500 outline-none resize-none transition-colors bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-stone-800 dark:disabled:text-stone-200"; // Adjusted py-2 to py-1.5

  const inputClasses = `${baseInputClass} ${className}`;
  const textareaClasses = `${baseTextareaClass} ${className}`;

  return (
    <div className={`flex items-center gap-3 ${isTextArea ? 'items-start' : ''}`}>
      <label className={`${labelWidthClass} text-[10px] text-stone-600 dark:text-stone-400 font-medium ${isTextArea ? 'mt-2' : ''}`}>
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