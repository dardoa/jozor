import React, { useState, useEffect } from 'react';

interface SmartInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
  onCommit: (value: any) => void;
}

export const SmartInput: React.FC<SmartInputProps> = ({ value, onCommit, ...props }) => {
  const [localValue, setLocalValue] = useState(value);
  
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    if (localValue !== value) {
        onCommit(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.currentTarget.blur();
    }
  };

  return (
    <input 
        {...props} 
        value={localValue || ''} 
        onChange={handleChange} 
        onBlur={handleBlur} 
        onKeyDown={handleKeyDown}
    />
  );
};

interface SmartTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
    value: string;
    onCommit: (value: string) => void;
}

export const SmartTextarea: React.FC<SmartTextareaProps> = ({ value, onCommit, ...props }) => {
    const [localValue, setLocalValue] = useState(value);
    
    useEffect(() => {
      setLocalValue(value);
    }, [value]);
  
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalValue(e.target.value);
    };
  
    const handleBlur = () => {
      if (localValue !== value) {
          onCommit(localValue);
      }
    };
  
    return (
      <textarea 
          {...props} 
          value={localValue || ''} 
          onChange={handleChange} 
          onBlur={handleBlur} 
      />
    );
};