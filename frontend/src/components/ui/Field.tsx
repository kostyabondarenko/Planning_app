import React from 'react';

export type FieldProps = {
  label: string;
  children: React.ReactNode;
  hint?: string;
};

export default function Field({ label, children, hint }: FieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-app-text">{label}</span>
      {children}
      {hint ? <span className="text-xs text-app-textMuted">{hint}</span> : null}
    </label>
  );
}
