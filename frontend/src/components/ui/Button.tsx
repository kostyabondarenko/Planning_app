import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-app-accent text-white shadow-ios hover:shadow-ios-lg hover:scale-[1.02] active:scale-[0.98]',
  secondary:
    'bg-app-surfaceMuted text-app-text border border-app-border hover:bg-white',
  ghost:
    'bg-transparent text-app-text hover:bg-app-surfaceMuted',
  danger:
    'bg-app-danger text-white shadow-ios hover:opacity-90',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-5 py-4 text-lg',
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
}
