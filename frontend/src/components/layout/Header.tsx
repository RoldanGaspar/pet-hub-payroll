import { Bell, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm font-medium text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-64 pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white hover:border-slate-400 transition-colors shadow-sm"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200 hover:shadow-sm">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          {/* User */}
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="text-xs font-medium text-slate-500">{user?.branch?.name || 'All Branches'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center shadow-sm">
              <span className="text-sm font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
