import React from 'react';

interface LoginButtonProps {
  onLogin: () => void;
  label: string;
}

export const LoginButton: React.FC<LoginButtonProps> = ({ onLogin, label }) => {
  return (
    <button
      onClick={onLogin}
      className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
    >
      {label}
    </button>
  );
};