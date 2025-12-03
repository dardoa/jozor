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
  labelWidthClass = 'w-16',
}) => {
  const baseInputClass = "w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] focus:border-blue-500 outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-gray-800 dark:disabled:text-gray-200";
  const baseTextareaClass = "flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-[10px] focus:border-blue-500 outline-none resize-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-gray-800 dark:disabled:text-gray-200";

  const inputClasses = `${baseInputClass} ${className}`;
  const textareaClasses = `${baseTextareaClass} ${className}`;

  return (
    <div className={`flex items-center gap-1.5 ${isTextArea ? 'items-start' : ''}`}>
      <label className={`${labelWidthClass} text-[10px] text-gray-600 dark:text-gray-400 font-medium ${isTextArea ? 'mt-1' : ''}`}>
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