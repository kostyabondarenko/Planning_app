import React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export default function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-2xl bg-app-surfaceMuted px-4 py-3 text-base font-medium text-app-text placeholder:text-app-textMuted border border-transparent focus:border-app-accent focus:ring-2 focus:ring-app-accent/30 ${className}`}
      {...props}
    />
  );
}
