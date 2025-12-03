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
  rows = 2, // Reduced rows from 3 to 2
  className = '',
  labelWidthClass = 'w-16', // Reduced w-20 to w-16
}) => {
  const baseInputClass = "w-full h-7 px-2.5 py-1 border border-stone-300 dark:border-stone-600 rounded-lg text-xs focus:border-teal-500 outline-none transition-colors bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-stone-800 dark:disabled:text-stone-200"; // Reduced h-8 to h-7, px-3 py-1.5 to px-2.5 py-1, text-sm to text-xs
  const baseTextareaClass = "flex-1 px-2.5 py-1 border border-stone-300 dark:border-stone-600 rounded-lg text-xs focus:border-teal-500 outline-none resize-none transition-colors bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-stone-800 dark:disabled:text-stone-200"; // Adjusted py-1.5 to py-1, text-sm to text-xs

  const inputClasses = `${baseInputClass} ${className}`;
  const textareaClasses = `${baseTextareaClass} ${className}`;

  return (
    <div className={`flex items-center gap-3 ${isTextArea ? 'items-start' : ''}`}>
      <label className={`${labelWidthClass} text-[9px] text-stone-600 dark:text-stone-400 font-medium ${isTextArea ? 'mt-2' : ''}`}> {/* Reduced text-[10px] to text-[9px] */}
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