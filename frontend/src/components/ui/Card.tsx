import React from 'react';

type CardVariant = 'surface' | 'elevated' | 'soft' | 'glass' | 'glass-static';

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  hoverable?: boolean;
};

export default function Card({
  variant = 'glass',
  hoverable = true,
  className = '',
  ...props
}: CardProps) {
  const variantClass = {
    surface: 'card-brandbook-surface',
    elevated: 'card-brandbook-elevated',
    soft: 'card-brandbook-soft',
    glass: 'card-brandbook-glass',
    'glass-static': 'card-brandbook-glass-static',
  }[variant];

  const hoverClass = hoverable && variant !== 'glass-static' ? 'card-brandbook-hoverable' : '';

  return (
    <div
      className={`${variantClass} ${hoverClass} ${className}`}
      {...props}
    />
  );
}
