'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Target, Calendar, CheckSquare, Sparkles } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-app-bg">
      {/* Навигация iOS стиль */}
      <nav className="bg-app-surface/90 backdrop-blur-xl border-b border-app-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-gradient-to-br from-app-accent to-ios-purple rounded-xl flex items-center justify-center shadow-ios group-hover:scale-105 transition-transform">
                <Sparkles size={18} className="text-white" />
              </div>
              <span className="font-black text-xl text-app-text hidden sm:block">
                Goal Navigator
              </span>
            </Link>

            {/* Navigation */}
            <div className="flex items-center gap-1 sm:gap-2 bg-app-surfaceMuted p-1 rounded-2xl">
              <NavLink href="/dashboard" icon={Target}>
                Цели
              </NavLink>
              <NavLink href="/dashboard/calendar" icon={Calendar}>
                Календарь
              </NavLink>
              <NavLink href="/dashboard/daily" icon={CheckSquare}>
                День
              </NavLink>
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}

function NavLink({ 
  href, 
  icon: Icon, 
  children 
}: { 
  href: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
        isActive 
          ? 'bg-app-surface text-app-accent shadow-ios' 
          : 'text-app-textMuted hover:text-app-text hover:bg-app-surface/50'
      }`}
    >
      <Icon size={18} strokeWidth={2.5} />
      <span className="hidden sm:inline">{children}</span>
    </Link>
  );
}
