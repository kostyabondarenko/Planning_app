import React from 'react';

type CardVariant = 'surface' | 'elevated' | 'soft';

const variantClasses: Record<CardVariant, string> = {
  surface: 'bg-app-surface border border-app-border',
  elevated: 'bg-app-surface shadow-ios-lg border border-app-border',
  soft: 'bg-app-surfaceMuted border border-app-border',
};

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

export default function Card({ variant = 'surface', className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-3xl ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
