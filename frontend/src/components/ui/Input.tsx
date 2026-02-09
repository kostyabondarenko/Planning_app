import React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export default function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`input-brandbook w-full rounded-2xl px-4 py-3 text-base font-medium text-app-text placeholder:text-app-textMuted outline-none transition-all ${className}`}
      {...props}
    />
  );
}
