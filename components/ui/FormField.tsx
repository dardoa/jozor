import React from 'react';
import { SmartInput, SmartTextarea } from './SmartInput';

interface FormFieldProps {
  label: string;
  value?: string | number; // Make value optional if children are used
  onCommit?: (value: any) => void; // Make onCommit optional if children are used
  disabled?: boolean;
  type?: 'text' | 'email' | 'url';
  placeholder?: string;
  isTextArea?: boolean;
  rows?: number;
  className?: string; // Allow overriding or extending default input class
  labelWidthClass?: string; // Allow custom width for label
  children?: React.ReactNode; // Add children prop
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
  children, // Destructure children
}) => {
  const baseInputClass = "w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] focus:border-blue-500 outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium dark:disabled:text-gray-200";
  const baseTextareaClass = "flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-[10px] focus:border-blue-500 outline-none resize-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium dark:disabled:text-gray-200";

  const inputClasses = `${baseInputClass} ${className}`;
  const textareaClasses = `${baseTextareaClass} ${className}`;

  return (
    <div className={`flex items-center gap-1.5 ${isTextArea || children ? 'items-start' : ''}`}> {/* Use items-start if children are present */}
      <label className={`${labelWidthClass} text-[10px] text-gray-600 dark:text-gray-400 font-medium ${isTextArea || children ? 'mt-1' : ''}`}>
        {label}
      </label>
      {children ? ( // Render children if provided
        <div className="flex-1">
          {children}
        </div>
      ) : isTextArea ? (
        <SmartTextarea
          disabled={disabled}
          rows={rows}
          value={value as string}
          onCommit={onCommit!} // onCommit is required for SmartTextarea
          className={textareaClasses}
          placeholder={placeholder}
        />
      ) : (
        <SmartInput
          disabled={disabled}
          type={type}
          value={value!} // value is required for SmartInput
          onCommit={onCommit!} // onCommit is required for SmartInput
          className={inputClasses}
          placeholder={placeholder}
        />
      )}
    </div>
  );
};