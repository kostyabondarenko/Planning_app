import Link from 'next/link';
import { Target, Calendar, CheckSquare } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ios-gray-50">
      {/* Навигация iOS стиль */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="font-black text-xl text-gray-900">
              Goal Navigator
            </Link>

            <div className="flex items-center gap-2">
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
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-all font-semibold text-sm"
    >
      <Icon size={18} strokeWidth={2.5} />
      <span className="hidden sm:inline">{children}</span>
    </Link>
  );
}
