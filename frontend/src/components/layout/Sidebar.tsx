import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { AddExpenseModal } from '../AddExpenseModal';

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

interface SidebarProps {
  items?: NavItem[];
}

const defaultNavItems: NavItem[] = [
  { label: 'Home', icon: 'home', path: '/dashboard' },
  { label: 'Expenses', icon: 'receipt_long', path: '/expenses' },
  { label: 'Claims', icon: 'assignment', path: '/claims' },
  { label: 'Categories', icon: 'category', path: '/categories' },
  { label: 'Approvals', icon: 'fact_check', path: '/approvals' },
  { label: 'Reports', icon: 'bar_chart', path: '/reports' },
];

const defaultAccountItems: NavItem[] = [
  { label: 'Settings', icon: 'settings', path: '/settings' },
  { label: 'Help Center', icon: 'help', path: '/help' },
];

export function Sidebar({ items }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const navItems = items ?? defaultNavItems;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="w-60 min-h-screen flex flex-col bg-white border-r border-primary/10 py-6 px-4">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 mb-8">
        <div className="size-10 bg-primary/20 rounded-full flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
        </div>
        <span className="text-slate-900 text-lg font-extrabold tracking-tight">Pay Me Back!</span>
      </div>

      {/* Menu */}
      <nav className="flex-1 flex flex-col gap-1">
        <button
          onClick={() => setIsAddExpenseModalOpen(true)}
          className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl text-sm font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-all cursor-pointer shadow-sm"
        >
          <span className="material-symbols-outlined text-xl">add_circle</span>
          New Expense
        </button>

        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Menu</p>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              {item.label}
            </button>
          );
        })}

        {/* Account section */}
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mt-6 mb-2">Account</p>
        {defaultAccountItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      {user && (
        <div className="flex items-center gap-3 px-3 py-3 border-t border-slate-100 mt-4">
          <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
            {(user.display_name || user.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{user.display_name || user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
            title="Logout"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
          </button>
        </div>
      )}

      {isAddExpenseModalOpen && (
        <AddExpenseModal
          onClose={() => setIsAddExpenseModalOpen(false)}
          onSuccess={() => setIsAddExpenseModalOpen(false)}
        />
      )}
    </aside>
  );
}
