'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Target, Calendar, Columns3, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/lib/ThemeProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Navbar — glass style */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--blur-md)',
          WebkitBackdropFilter: 'var(--blur-md)',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo — gradient text */}
            <Link href="/" className="flex items-center gap-2 group">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
                style={{
                  background: 'var(--gradient-warm)',
                  boxShadow: '0 0 20px rgba(232, 168, 124, 0.2)',
                }}
              >
                <Target size={18} className="text-white" />
              </div>
              <span
                className="font-black text-xl hidden sm:block"
                style={{
                  background: 'var(--gradient-warm)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Goal Navigator
              </span>
            </Link>

            {/* Navigation */}
            <div
              className="flex items-center gap-1 sm:gap-2 p-1 rounded-2xl"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <NavLink href="/dashboard" icon={Target}>
                Цели
              </NavLink>
              <NavLink href="/dashboard/calendar" icon={Calendar}>
                Календарь
              </NavLink>
              <NavLink href="/dashboard/upcoming" icon={Columns3}>
                Ближайшие
              </NavLink>
            </div>

            {/* Theme Toggle */}
            <div
              className="flex items-center gap-1 p-1 rounded-full"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <ThemeButton
                active={theme === 'light'}
                onClick={() => setTheme('light')}
                title="Светлая тема"
              >
                <Sun size={16} />
              </ThemeButton>
              <ThemeButton
                active={theme === 'auto'}
                onClick={() => setTheme('auto')}
                title="Авто"
              >
                <Monitor size={16} />
              </ThemeButton>
              <ThemeButton
                active={theme === 'dark'}
                onClick={() => setTheme('dark')}
                title="Тёмная тема"
              >
                <Moon size={16} />
              </ThemeButton>
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
  children,
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
      className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-semibold text-sm transition-all"
      style={
        isActive
          ? {
              background: 'var(--gradient-warm)',
              color: 'var(--text-inverse)',
              boxShadow: '0 2px 8px rgba(232, 168, 124, 0.3)',
            }
          : {
              color: 'var(--text-secondary)',
            }
      }
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.background = 'var(--glass-bg-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = 'var(--text-secondary)';
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <Icon size={18} strokeWidth={2.5} />
      <span className="hidden sm:inline">{children}</span>
    </Link>
  );
}

function ThemeButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer"
      style={
        active
          ? {
              background: 'var(--gradient-warm)',
              color: 'var(--text-inverse)',
            }
          : {
              color: 'var(--text-tertiary)',
              background: 'transparent',
            }
      }
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'var(--glass-border)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      {children}
    </button>
  );
}
