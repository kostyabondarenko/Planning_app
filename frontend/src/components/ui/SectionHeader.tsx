import React from 'react';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
};

export default function SectionHeader({ title, subtitle, icon }: SectionHeaderProps) {
  return (
    <div className="space-y-2">
      {icon ? <div className="text-app-accent">{icon}</div> : null}
      <h1 className="text-3xl sm:text-4xl font-black text-app-text">{title}</h1>
      {subtitle ? <p className="text-base sm:text-lg text-app-textMuted">{subtitle}</p> : null}
    </div>
  );
}
