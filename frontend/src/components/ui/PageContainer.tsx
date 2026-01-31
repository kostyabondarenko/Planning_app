import React from 'react';

export type PageContainerProps = React.HTMLAttributes<HTMLDivElement>;

export default function PageContainer({ className = '', ...props }: PageContainerProps) {
  return (
    <div className={`min-h-screen bg-app-bg ${className}`} {...props} />
  );
}
