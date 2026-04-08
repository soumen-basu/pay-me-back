import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { AddExpenseModal } from '../AddExpenseModal';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAdminMode } from '../../contexts/AdminModeContext';
import { AddUserModal } from '../AddUserModal';

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

interface SidebarProps {
  items?: NavItem[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

const defaultNavItems: NavItem[] = [
  { label: 'Home', icon: 'home', path: '/dashboard' },
  { label: 'Expenses', icon: 'receipt_long', path: '/expenses' },
  { label: 'Claims', icon: 'assignment', path: '/claims' },
  { label: 'Categories', icon: 'category', path: '/categories' },
  { label: 'Approvals', icon: 'fact_check', path: '/approvals' },
  { label: 'Reports', icon: 'bar_chart', path: '/reports' },
];

const adminNavItems: NavItem[] = [
  { label: 'Analytics', icon: 'monitoring', path: '/admin/dashboard' },
  { label: 'User Management', icon: 'group', path: '/admin/users' },
  { label: 'Settings', icon: 'settings', path: '/settings' },
];

const defaultAccountItems: NavItem[] = [
  { label: 'Settings', icon: 'settings', path: '/settings' },
  { label: 'Help Center', icon: 'help', path: '/help' },
];

export function Sidebar({ items, isCollapsed, onToggleCollapse, isMobile, isOpen, onClose, className = '' }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isAdminMode, toggleAdminMode } = useAdminMode();
  const { unreadCount, notifications, markAsRead } = useNotifications();
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const navItems = items ?? (isAdminMode ? adminNavItems : defaultNavItems);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <aside
      className={`fixed lg:sticky top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out flex flex-col bg-white border-r border-primary/10 py-6 px-4 
        ${isCollapsed ? 'w-20' : 'w-64'} 
        ${isMobile ? (isOpen ? 'translate-x-0 overflow-y-auto' : '-translate-x-full') : 'translate-x-0'}
        ${className}`}
    >
      <div className={`flex items-center gap-3 px-3 mb-8 transition-all duration-300 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3">
          <div
            className="size-10 min-w-10 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform drop-shadow-sm"
            onClick={() => navigate(isAdminMode ? '/admin/dashboard' : '/dashboard')}
          >
            <img src="/LogoWithoutSymbols.svg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && <span className="text-slate-900 text-lg font-extrabold tracking-tight whitespace-nowrap cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(isAdminMode ? '/admin/dashboard' : '/dashboard')}>Pay Me Back!</span>}
        </div>

        {!isCollapsed && (
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 text-slate-400 hover:text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 size-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Notifications Dropdown (Simple implementation) */}
      {!isCollapsed && isNotificationsOpen && (
        <div className="absolute top-16 left-4 right-4 bg-white border border-slate-100 shadow-xl rounded-2xl z-50 max-h-[300px] overflow-y-auto custom-scrollbar p-2 mb-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center p-2 mb-2 border-b border-slate-50">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Notifications</p>
            <button onClick={() => setIsNotificationsOpen(false)} className="text-slate-300 hover:text-slate-600">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="text-center py-4 text-xs text-slate-400 italic">No notifications yet</p>
          ) : (
            <div className="space-y-1">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl transition-colors cursor-pointer ${n.is_read ? 'opacity-60 hover:bg-slate-50' : 'bg-primary/5 hover:bg-primary/10 border-l-4 border-primary'}`}
                  onClick={() => {
                    markAsRead(n.id);
                    // Navigate if it's a claim notification? For now just mark read
                  }}
                >
                  <p className="text-xs font-bold text-slate-900">{n.title}</p>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{n.content}</p>
                  <p className="text-[8px] text-slate-400 mt-1 uppercase font-bold">
                    {new Date(n.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className={`flex flex-col gap-2 mb-6 ${isCollapsed ? 'items-center' : ''}`}>
        {!isAdminMode ? (
          <>
            <button
              onClick={() => {
                setIsAddExpenseModalOpen(true);
                if (isMobile && onClose) onClose();
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-extrabold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-all cursor-pointer shadow-sm border border-emerald-200/50 ${isCollapsed ? 'size-12 justify-center p-0' : 'w-full'
                }`}
              title={isCollapsed ? 'New Expense' : undefined}
            >
              <span className="material-symbols-outlined text-xl">add_circle</span>
              {!isCollapsed && <span>New Expense</span>}
            </button>

            <button
              onClick={() => {
                if (isMobile && onClose) onClose();
                navigate('/claims/new');
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-extrabold bg-primary text-slate-900 border border-slate-900/5 hover:bg-primary/90 transition-all cursor-pointer shadow-sm ${isCollapsed ? 'size-12 justify-center p-0' : 'w-full'
                }`}
              title={isCollapsed ? 'New Claim' : undefined}
            >
              <span className="material-symbols-outlined text-xl">assignment_add</span>
              {!isCollapsed && <span>New Claim</span>}
            </button>
          </>
        ) : (
          <button
            onClick={() => {
              if (isMobile && onClose) onClose();
              setIsAddUserModalOpen(true);
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-extrabold bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer shadow-md ${isCollapsed ? 'size-12 justify-center p-0' : 'w-full'
              }`}
            title={isCollapsed ? 'Add New User' : undefined}
          >
            <span className="material-symbols-outlined text-xl">person_add</span>
            {!isCollapsed && <span>Add New User</span>}
          </button>
        )}
      </div>

      {/* Menu scroll area */}
      <nav className="flex-1 flex flex-col gap-1 overflow-x-hidden overflow-y-auto custom-scrollbar pr-1">
        {!isCollapsed && <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-3 mb-2">Navigation</p>}
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${isActive
                  ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}

        {/* Account section */}
        <div className="mt-6">
          {!isCollapsed && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Account</p>}
          {defaultAccountItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${isActive
                    ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      {user?.role === 'admin' && (
        <div className={`mt-auto py-3 border-t border-slate-100/50 ${isCollapsed ? 'flex justify-center px-4' : ''}`}>
          <button
            onClick={() => toggleAdminMode(navigate)}
            className={`flex items-center gap-3 pl-3 pr-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${isAdminMode
                ? 'bg-primary text-white shadow-md'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              } ${isCollapsed ? 'size-10 justify-center min-w-10' : 'w-full'}`}
            title={isAdminMode ? 'Switch to User Mode' : 'Switch to Admin Mode'}
          >
            <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
            {!isCollapsed && (
              <span className="flex-1 text-left uppercase tracking-wide whitespace-nowrap">
                {isAdminMode ? 'Admin Mode' : 'User Mode'}
              </span>
            )}
            {!isCollapsed && (
              <div className={`w-10 h-5 rounded-full relative transition-colors shrink-0 ${isAdminMode ? 'bg-white/30' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 size-3 rounded-full bg-white transition-all ${isAdminMode ? 'left-6' : 'left-1'}`} />
              </div>
            )}
          </button>
        </div>
      )}

      {/* User footer */}
      <div className="pt-4 border-t border-slate-100">
        {user && (
          <div className={`flex items-center gap-3 px-3 py-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="size-10 min-w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
              {(user.display_name || user.email || '?').charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{user.display_name || user.email}</p>
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                title="Logout"
              >
                <span className="material-symbols-outlined text-xl">logout</span>
              </button>
            )}
          </div>
        )}

        {/* Collapse toggle (Desktop only) */}
        {!isMobile && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center gap-3 px-3 py-3 mt-1 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
            title={isCollapsed ? 'Expand menu' : 'Collapse menu'}
          >
            <span className={`material-symbols-outlined text-xl transition-transform duration-300 ${isCollapsed ? 'rotate-180 mx-auto' : ''}`}>
              first_page
            </span>
            {!isCollapsed && <span className="text-sm font-bold">Collapse</span>}
          </button>
        )}
      </div>

      {isAddExpenseModalOpen && (
        <AddExpenseModal
          onClose={() => setIsAddExpenseModalOpen(false)}
          onSuccess={() => setIsAddExpenseModalOpen(false)}
        />
      )}
      {isAddUserModalOpen && (
        <AddUserModal
          onClose={() => setIsAddUserModalOpen(false)}
          onSuccess={() => setIsAddUserModalOpen(false)}
        />
      )}
    </aside>
  );
}
