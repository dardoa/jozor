import React, { useId } from 'react';
import { SmartInput, SmartTextarea } from './SmartInput';

interface FormFieldProps {
  label: string;
  value: string | number;
  onCommit: (value: string | number) => void;
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
  focusTarget?: string;
  ariaLabel?: string;
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
  focusTarget,
  ariaLabel,
}) => {
  const inputId = useId();
  const baseInputClass =
    'ds-input w-full h-10 px-3 py-2 text-sm';
  const baseTextareaClass =
    'ds-input flex-1 px-3 py-2 text-sm resize-none min-h-[104px]';

  const disabledInputClass =
    'disabled:px-0 disabled:font-medium';
  const disabledTextareaClass =
    'disabled:px-0 disabled:font-medium';

  const inputClasses = `${baseInputClass} ${disabled ? disabledInputClass : ''} ${className}`;
  const textareaClasses = `${baseTextareaClass} ${disabled ? disabledTextareaClass : ''} ${className}`;

  return (
    <div
      data-smart-persona-field={focusTarget}
      tabIndex={focusTarget ? -1 : undefined}
      className='ds-panel-subtle scroll-mt-4 p-3.5 transition-colors shadow-[var(--shadow-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]/50'
    >
      <div className={`flex items-center gap-3 ${isTextArea ? 'items-start' : ''}`}>
        <label
          htmlFor={inputId}
          className={`${labelWidthClass} shrink-0 text-[11px] font-semibold text-[var(--text-dim)] ${isTextArea ? 'mt-2' : ''} flex items-center gap-1.5 leading-4`}
        >
          {icon && <span className="text-[var(--text-muted)]">{icon}</span>}
          {label}
        </label>
        <div className="flex-1">
          {isTextArea ? (
            <SmartTextarea
              id={inputId}
              aria-label={ariaLabel || label || undefined}
              disabled={disabled}
              rows={rows}
              value={value as string}
              onCommit={onCommit}
              className={textareaClasses}
              placeholder={placeholder}
            />
          ) : (
            <SmartInput
              id={inputId}
              aria-label={ariaLabel || label || undefined}
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
        <div className="mt-2 flex items-start gap-3">
          <div className={`${labelWidthClass} shrink-0`} aria-hidden="true" />
          <div className="text-[11px] leading-4 text-[var(--text-muted)]">
            {helperText}
          </div>
        </div>
      )}
    </div>
  );
};
