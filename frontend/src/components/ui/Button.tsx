import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-[13px]',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  style,
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: 'btn-brandbook-primary',
    secondary: 'btn-brandbook-secondary',
    ghost: 'btn-brandbook-ghost',
    danger: 'btn-brandbook-danger',
  }[variant];

  return (
    <button
      className={`${base} ${variantClass} ${sizeClasses[size]} ${className}`}
      style={style}
      {...props}
    />
  );
}
