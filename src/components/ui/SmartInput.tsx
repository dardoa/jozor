import React, { useState, useEffect, useRef } from 'react';
import { EMPTY_STRING } from '../../constants';

interface SmartInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
  onCommit: (value: string) => void;
}

export const SmartInput: React.FC<SmartInputProps> = ({ value, onCommit, ...props }) => {
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const latestValueRef = useRef(value);
  const latestPropValueRef = useRef(value);
  const latestCommitRef = useRef(onCommit);

  useEffect(() => {
    latestCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    latestValueRef.current = draftValue ?? value;
    latestPropValueRef.current = value;
  }, [draftValue, value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraftValue(e.target.value);
    latestValueRef.current = e.target.value;
  };

  const commitIfChanged = () => {
    if (latestValueRef.current !== latestPropValueRef.current) {
      latestCommitRef.current(String(latestValueRef.current));
      latestPropValueRef.current = latestValueRef.current;
    }
    setDraftValue(null);
  };

  const handleBlur = () => {
    commitIfChanged();
  };

  useEffect(() => {
    return () => {
      commitIfChanged();
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      {...props}
      value={draftValue ?? value ?? EMPTY_STRING}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`ds-input ${props.className ?? ''}`.trim()}
    />
  );
};

interface SmartTextareaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'onChange'
> {
  value: string;
  onCommit: (value: string) => void;
}

export const SmartTextarea: React.FC<SmartTextareaProps> = ({ value, onCommit, ...props }) => {
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const latestValueRef = useRef(value);
  const latestPropValueRef = useRef(value);
  const latestCommitRef = useRef(onCommit);

  useEffect(() => {
    latestCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    latestValueRef.current = draftValue ?? value;
    latestPropValueRef.current = value;
  }, [draftValue, value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftValue(e.target.value);
    latestValueRef.current = e.target.value;
  };

  const commitIfChanged = () => {
    if (latestValueRef.current !== latestPropValueRef.current) {
      latestCommitRef.current(latestValueRef.current);
      latestPropValueRef.current = latestValueRef.current;
    }
    setDraftValue(null);
  };

  const handleBlur = () => {
    commitIfChanged();
  };

  useEffect(() => {
    return () => {
      commitIfChanged();
    };
  }, []);

  return (
    <textarea
      {...props}
      value={draftValue ?? value ?? EMPTY_STRING}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`ds-input ${props.className ?? ''}`.trim()}
    />
  );
};
